// Eye Tracker: turning face points into "looking left / right / up / down / middle".
// A JavaScript copy of the Python Eye Trainer's gaze_estimator.py, head_guide.py,
// calibration.py and direction_detector.py, with the same numbers and rules.
// No screen code here, so the tests can run it in Node.
//
// Face points come from MediaPipe Face Landmarker: 478 points, each with x and y from
// 0 to 1, measured on the MIRRORED webcam picture (like looking in a mirror).
(function (exports) {
  "use strict";

  // ---------- small maths helpers ----------
  const median = (values) => {
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  // Median of each column of a list of equal-length arrays.
  const medianRows = (rows) => rows[0].map((_, i) => median(rows.map((row) => row[i])));
  const sub = (a, b) => a.map((v, i) => v - b[i]);

  // ---------- measuring the eyes (gaze_estimator.py) ----------
  // Landmark numbers for each eye, by its position on the mirrored screen.
  const SCREEN_LEFT_EYE = { a: 33, b: 133, iris: 468, top: 159, bottom: 145 };
  const SCREEN_RIGHT_EYE = { a: 362, b: 263, iris: 473, top: 386, bottom: 374 };
  const IRIS_H = 0, IRIS_V = 1, UPPER_LID = 2;

  // Returns [horizontal, vertical, upperLid, openness] for one eye, or null.
  // Everything is divided by the eye's width, so sitting closer or further away
  // doesn't change the numbers, and measured along the eye, so a tilted head doesn't either.
  function measureEye(points, eye, width, height) {
    const px = (i) => [points[i].x * width, points[i].y * height];
    const a = px(eye.a), b = px(eye.b);
    const eyeWidth = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (eyeWidth < 1) return null;
    const along = [(b[0] - a[0]) / eyeWidth, (b[1] - a[1]) / eyeWidth];
    const across = [-along[1], along[0]];
    const middle = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const dot = (v, w) => v[0] * w[0] + v[1] * w[1];
    const iris = sub(px(eye.iris), middle);
    const top = px(eye.top), bottom = px(eye.bottom);
    return [
      dot(iris, along) / eyeWidth,
      dot(iris, across) / eyeWidth,
      dot(sub(top, middle), across) / eyeWidth,
      Math.hypot(top[0] - bottom[0], top[1] - bottom[1]) / eyeWidth,
    ];
  }

  // Both eyes averaged: { features: [irisH, irisV, upperLid], openness }, or null.
  function eyeFeatures(points, width, height) {
    const left = measureEye(points, SCREEN_LEFT_EYE, width, height);
    const right = measureEye(points, SCREEN_RIGHT_EYE, width, height);
    if (!left || !right) return null;
    const avg = left.map((v, i) => (v + right[i]) / 2);
    return { features: avg.slice(0, 3), openness: avg[3] };
  }

  // A blink closes the eyes to under 40% of how open they normally are (over the last second).
  class BlinkDetector {
    constructor(historySize = 30, drop = 0.4) {
      this.historySize = historySize;
      this.drop = drop;
      this.history = [];
    }
    isBlink(openness) {
      let blink = false;
      if (this.history.length >= 5) blink = openness < this.drop * median(this.history);
      this.history.push(openness);
      if (this.history.length > this.historySize) this.history.shift();
      return blink;
    }
  }

  // The median of the last few measurements, so one bad frame can't cause a jump.
  class FeatureFilter {
    constructor(size = 3) {
      this.size = size;
      this.history = [];
    }
    update(features) {
      this.history.push(features);
      if (this.history.length > this.size) this.history.shift();
      return medianRows(this.history);
    }
    reset() { this.history = []; }
  }

  // ---------- keeping the head still (head_guide.py) ----------
  const NOSE_TIP = 1;
  const OUTER_EYE_CORNERS = [33, 263];
  const MAX_SHIFT = 0.35;
  const MAX_SIZE_CHANGE = 0.12;
  const MAX_TURN = 0.12;

  // MediaPipe gives the head pose as a 4x4 grid stored column by column.
  const matrixAt = (matrix, row, col) => matrix.data[col * 4 + row];

  // [noseX, noseY, eyeSpan, turnX, turnY], positions in pixels.
  function measureHeadPosition(points, matrix, width, height) {
    const nose = points[NOSE_TIP];
    const [a, b] = OUTER_EYE_CORNERS.map((i) => points[i]);
    const eyeSpan = Math.hypot((a.x - b.x) * width, (a.y - b.y) * height);
    const turn = matrix ? [matrixAt(matrix, 0, 2), matrixAt(matrix, 1, 2)] : [0, 0];
    return [nose.x * width, nose.y * height, eyeSpan, ...turn];
  }

  class HeadGuide {
    constructor(historySize = 15) {
      this.historySize = historySize;
      this.history = [];
      this.reference = null;
    }
    remember(measurement) {
      this.history.push(measurement);
      if (this.history.length > this.historySize) this.history.shift();
    }
    // Use the last half second as "where your head should be".
    setReference() {
      if (!this.history.length) return false;
      this.reference = medianRows(this.history);
      return true;
    }
    check(m) {
      if (!this.reference || !m) return { ok: true, message: "" };
      const ref = this.reference;
      const shiftX = (m[0] - ref[0]) / ref[2];
      const shiftY = (m[1] - ref[1]) / ref[2];
      const size = m[2] / ref[2];
      // The picture is mirrored, so "further right in the picture" means move LEFT.
      if (size < 1 - MAX_SIZE_CHANGE) return { ok: false, message: "Move a little closer" };
      if (size > 1 + MAX_SIZE_CHANGE) return { ok: false, message: "Move back a little" };
      if (shiftX > MAX_SHIFT) return { ok: false, message: "Move your head left" };
      if (shiftX < -MAX_SHIFT) return { ok: false, message: "Move your head right" };
      if (shiftY > MAX_SHIFT) return { ok: false, message: "Move your head up" };
      if (shiftY < -MAX_SHIFT) return { ok: false, message: "Move your head down" };
      if (Math.abs(m[3] - ref[3]) > MAX_TURN || Math.abs(m[4] - ref[4]) > MAX_TURN) {
        return { ok: false, message: "Face the screen like before" };
      }
      return { ok: true, message: "Head position OK" };
    }
  }

  // Getting into the starting position.
  const MAX_TILT_DEGREES = 6;
  const MAX_FACE_TURN = 0.10;
  const MAX_OFF_CENTRE = 0.12;
  const MIN_EYE_SPAN = 0.08;
  const MAX_EYE_SPAN = 0.35;

  function checkStraight(points, matrix, width, height) {
    if (!points) return { ok: false, message: "Look at the screen so the camera can see your face" };
    const [a, b] = OUTER_EYE_CORNERS.map((i) => points[i]);
    const dx = (b.x - a.x) * width, dy = (b.y - a.y) * height;
    const tilt = (Math.atan2(dy, dx) * 180) / Math.PI;
    const eyeSpan = Math.hypot(dx, dy) / width;
    const offCentre = points[NOSE_TIP].x - 0.5;
    if (eyeSpan < MIN_EYE_SPAN) return { ok: false, message: "Move a little closer to the screen" };
    if (eyeSpan > MAX_EYE_SPAN) return { ok: false, message: "Move back a little" };
    if (offCentre > MAX_OFF_CENTRE) return { ok: false, message: "Move your head left, to the middle of the picture" };
    if (offCentre < -MAX_OFF_CENTRE) return { ok: false, message: "Move your head right, to the middle of the picture" };
    if (Math.abs(tilt) > MAX_TILT_DEGREES) return { ok: false, message: "Straighten your head (keep your eyes level)" };
    if (matrix && Math.abs(matrixAt(matrix, 0, 2)) > MAX_FACE_TURN) return { ok: false, message: "Turn your face straight toward the screen" };
    return { ok: true, message: "Good - keep your head still" };
  }

  // ---------- calibration (calibration.py) ----------
  const SETTLE_SECONDS = 1.2;
  const COLLECT_SECONDS = 2.0;
  const MIN_SAMPLES_PER_DOT = 10;
  const BLINK_MARGIN_FRAMES = 3;
  const OPENNESS_KEEP = 0.8;
  const EDGE_MARGIN = 0.05;
  const STEPS = ["centre", "left", "right", "up", "down", "centre"];
  const INSTRUCTIONS = {
    centre: "Look at the dot in the centre.",
    left: "Look at the dot on the far LEFT. Move only your eyes.",
    right: "Look at the dot on the far RIGHT. Move only your eyes.",
    up: "Look at the dot at the TOP. Move only your eyes.",
    down: "Look at the dot at the BOTTOM. Move only your eyes.",
  };
  const RETRY_MESSAGE = "Let's do that dot again (a blink or a glance away spoiled it).";

  function dotPositions(width, height) {
    const mx = Math.round(EDGE_MARGIN * width), my = Math.round(EDGE_MARGIN * height);
    const cx = Math.round(width / 2), cy = Math.round(height / 2);
    return { centre: [cx, cy], left: [mx, cy], right: [width - mx, cy], up: [cx, my], down: [cx, height - my] };
  }

  // frames: [features, openness] per frame, or null when the eyes were closed or the face lost.
  // Keeps only good frames: no blinks, no half blinks, and nothing right next to one.
  function cleanRecording(frames) {
    const open = frames.filter(Boolean).map((f) => f[1]);
    if (!open.length) return [];
    const normal = median(open);
    const bad = frames.map((f) => !f || f[1] < OPENNESS_KEEP * normal);
    const good = [];
    frames.forEach((f, i) => {
      const near = bad.slice(Math.max(0, i - BLINK_MARGIN_FRAMES), i + BLINK_MARGIN_FRAMES + 1);
      if (!near.some(Boolean)) good.push(f[0]);
    });
    return good;
  }

  class Calibration {
    // now() gives the time in seconds (passed in so tests can control it).
    constructor(width, height, now) {
      this.now = now;
      this.resize(width, height);
      this.start();
    }
    resize(width, height) { this.positions = dotPositions(width, height); }
    start() {
      this.index = 0;
      this.samples = {};
      this.dotFrames = [];
      this.retryMessage = "";
      this.dotStart = this.now();
    }
    totalDots() { return STEPS.length; }
    isFinished() { return this.index >= STEPS.length; }
    currentName() { return STEPS[this.index]; }
    currentTarget() { return this.positions[this.currentName()]; }
    instruction() { return INSTRUCTIONS[this.currentName()]; }
    progress() { return Math.min((this.now() - this.dotStart) / (SETTLE_SECONDS + COLLECT_SECONDS), 1); }
    makesSense(name, good) {
      if (name === "centre" || !this.samples.centre) return true;
      const centre = medianRows(this.samples.centre), here = medianRows(good);
      return {
        left: here[IRIS_H] < centre[IRIS_H],
        right: here[IRIS_H] > centre[IRIS_H],
        up: here[IRIS_V] < centre[IRIS_V],
        down: here[IRIS_V] > centre[IRIS_V],
      }[name];
    }
    // Once per frame. features/openness are null when the eyes are closed or there's no face.
    add(features, openness, headOk = true) {
      if (!headOk) {
        this.dotStart = this.now();
        this.dotFrames = [];
        return;
      }
      const elapsed = this.now() - this.dotStart;
      if (elapsed >= SETTLE_SECONDS) this.dotFrames.push(features ? [features, openness] : null);
      if (elapsed >= SETTLE_SECONDS + COLLECT_SECONDS) {
        const name = this.currentName();
        const good = cleanRecording(this.dotFrames);
        if (good.length >= MIN_SAMPLES_PER_DOT && this.makesSense(name, good)) {
          (this.samples[name] ||= []).push(...good);
          this.index += 1;
          this.retryMessage = "";
        } else {
          this.retryMessage = RETRY_MESSAGE;
        }
        this.dotFrames = [];
        this.dotStart = this.now();
      }
    }
    results() {
      return Object.fromEntries(Object.entries(this.samples).map(([name, values]) => [name, medianRows(values)]));
    }
  }

  // ---------- which way you're looking (direction_detector.py) ----------
  const DIRECTIONS = ["left", "right", "up", "down"];
  const FAR_ENOUGH = { left: 0.6, right: 0.6, up: 0.5, down: 0.5 };
  const LET_GO_GAP = 0.15;
  const FRAMES_NEEDED = 3;
  const MIDDLE_ZONE = 0.3;
  const MIDDLE_FOLLOW = 0.02;

  const toward = (value, middle, reach) => Math.max((value - middle) / reach, 0);

  class DirectionDetector {
    constructor() {
      this.middle = null;
      this.reach = null;
      this.useLid = false;
      this.reset();
    }
    reset() {
      this.direction = null;
      this.candidate = null;
      this.candidateCount = 0;
    }
    // points: { centre, left, right, up, down }. Returns { ok, message }.
    fit(points) {
      const { centre, left, right, up, down } = points;
      if (!(left[IRIS_H] < centre[IRIS_H] && centre[IRIS_H] < right[IRIS_H])) {
        return { ok: false, message: "Left/right did not calibrate. Press C and try again." };
      }
      if (!(up[IRIS_V] < centre[IRIS_V] && centre[IRIS_V] < down[IRIS_V])) {
        return { ok: false, message: "Up/down did not calibrate. Press C and try again." };
      }
      this.useLid = up[UPPER_LID] < centre[UPPER_LID] && centre[UPPER_LID] < down[UPPER_LID];
      this.middle = centre.slice();
      this.reach = { left: sub(left, centre), right: sub(right, centre), up: sub(up, centre), down: sub(down, centre) };
      this.reset();
      return { ok: true, message: "Calibrated" };
    }
    rawAmounts(f) {
      const m = this.middle, r = this.reach;
      const out = {
        left: toward(f[IRIS_H], m[IRIS_H], r.left[IRIS_H]),
        right: toward(f[IRIS_H], m[IRIS_H], r.right[IRIS_H]),
      };
      for (const name of ["up", "down"]) {
        let amount = toward(f[IRIS_V], m[IRIS_V], r[name][IRIS_V]);
        if (this.useLid) amount = (amount + toward(f[UPPER_LID], m[UPPER_LID], r[name][UPPER_LID])) / 2;
        out[name] = amount;
      }
      return out;
    }
    // How far toward each direction (0 = middle, 1 = as far as the calibration dot),
    // with the side effects of looking one way on the other measurements removed.
    amounts(features) {
      const rough = this.rawAmounts(features);
      const correction = features.map(() => 0);
      for (const name of ["left", "right"]) {
        const side = this.reach[name].slice();
        side[IRIS_H] = 0;
        side.forEach((v, i) => { correction[i] += Math.min(rough[name], 1.5) * v; });
      }
      for (const name of ["up", "down"]) {
        correction[IRIS_H] += Math.min(rough[name], 1.5) * this.reach[name][IRIS_H];
      }
      return this.rawAmounts(sub(features, correction));
    }
    // One frame. Returns "left", "right", "up", "down", or null for the middle.
    update(features) {
      const amounts = this.amounts(features);
      const strength = (d) => amounts[d] / FAR_ENOUGH[d];
      const past = DIRECTIONS.filter((d) => amounts[d] >= FAR_ENOUGH[d]);
      const strongest = past.length ? past.reduce((best, d) => (strength(d) > strength(best) ? d : best)) : null;

      const current = this.direction;
      const keepCurrent = current !== null
        && amounts[current] >= FAR_ENOUGH[current] - LET_GO_GAP
        && (strongest === null || strength(strongest) <= strength(current));
      const seen = keepCurrent ? current : strongest;

      if (seen === this.direction) {
        this.candidateCount = 0;
      } else {
        if (this.candidateCount > 0 && seen === this.candidate) this.candidateCount += 1;
        else { this.candidate = seen; this.candidateCount = 1; }
        if (this.candidateCount >= FRAMES_NEEDED) {
          this.direction = seen;
          this.candidateCount = 0;
        }
      }

      // Drift correction: while you're clearly looking at the middle, the middle follows.
      if (this.direction === null && Math.max(...Object.values(amounts)) < MIDDLE_ZONE) {
        this.middle = this.middle.map((v, i) => v + MIDDLE_FOLLOW * (features[i] - v));
      }
      return this.direction;
    }
  }

  Object.assign(exports, {
    IRIS_H, IRIS_V, UPPER_LID, DIRECTIONS, FAR_ENOUGH, STEPS,
    SCREEN_LEFT_EYE, SCREEN_RIGHT_EYE, NOSE_TIP, OUTER_EYE_CORNERS,
    median, medianRows, measureEye, eyeFeatures, BlinkDetector, FeatureFilter,
    measureHeadPosition, HeadGuide, checkStraight,
    dotPositions, cleanRecording, Calibration, DirectionDetector,
  });
})(typeof module !== "undefined" ? module.exports : (window.Gaze = {}));
