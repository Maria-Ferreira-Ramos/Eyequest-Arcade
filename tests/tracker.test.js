// Tests for the Eye Tracker: the gaze maths, calibration, stages and shared progress.
const test = require("node:test");
const assert = require("node:assert/strict");
const Gaze = require("../js/gaze.js");
const Rules = require("../js/rules.js");
const Store = require("../js/store.js");
const TrackerRules = require("../js/tracker-rules.js");
const Questions = require("../js/tracker-questions.js");

// Calibration measurements like a real person's: [iris left/right, iris up/down, upper lid].
const C = [0, 0, -0.3];
const add = (a, b) => a.map((v, i) => v + b[i]);
const POINTS = {
  centre: C,
  left: add(C, [-0.12, 0.01, 0.005]),
  right: add(C, [0.11, 0.012, 0.004]),
  up: add(C, [0.006, -0.05, -0.04]),
  down: add(C, [0.004, 0.045, 0.05]),
};
const fitted = () => {
  const d = new Gaze.DirectionDetector();
  assert.equal(d.fit(POINTS).ok, true);
  return d;
};
// A point part of the way from the centre toward a calibration dot.
const toward = (name, amount) => C.map((v, i) => v + amount * (POINTS[name][i] - v));

test("a direction needs 3 frames in a row before it counts", () => {
  const d = fitted();
  assert.equal(d.update(POINTS.left), null);
  assert.equal(d.update(POINTS.left), null);
  assert.equal(d.update(POINTS.left), "left");
  for (const name of ["right", "up", "down"]) {
    const fresh = fitted();
    let got;
    for (let i = 0; i < 3; i++) got = fresh.update(POINTS[name]);
    assert.equal(got, name);
  }
});

test("looking sideways doesn't also count as up or down", () => {
  const d = fitted();
  const amounts = d.amounts(POINTS.left);
  assert.ok(amounts.left > 0.95 && amounts.left < 1.05, `left ${amounts.left}`);
  assert.ok(amounts.up < 0.05 && amounts.down < 0.05, JSON.stringify(amounts));
});

test("a direction is kept until the eyes clearly move back", () => {
  const d = fitted();
  for (let i = 0; i < 3; i++) d.update(POINTS.left);
  // 0.5 of the way is below the 0.6 needed to start, but above the 0.45 needed to keep it.
  for (let i = 0; i < 5; i++) assert.equal(d.update(toward("left", 0.5)), "left");
  const fresh = fitted();
  for (let i = 0; i < 5; i++) assert.equal(fresh.update(toward("left", 0.5)), null);
  // Back to the middle: after 3 frames it lets go.
  d.update(C);
  d.update(C);
  assert.equal(d.update(C), null);
});

test("calibration that goes the wrong way is refused", () => {
  const d = new Gaze.DirectionDetector();
  const swapped = { ...POINTS, left: POINTS.right, right: POINTS.left };
  assert.deepEqual(d.fit(swapped), { ok: false, message: "Left/right did not calibrate. Press C and try again." });
  const flipped = { ...POINTS, up: POINTS.down, down: POINTS.up };
  assert.equal(d.fit(flipped).message, "Up/down did not calibrate. Press C and try again.");
});

test("the middle slowly follows the eyes while they rest there", () => {
  const d = fitted();
  const resting = add(C, [0.01, 0, 0]);
  for (let i = 0; i < 200; i++) d.update(resting);
  assert.ok(Math.abs(d.middle[0] - 0.01) < 0.001, `middle ${d.middle[0]}`);
});

test("blinks and the frames next to them are left out of calibration", () => {
  const frames = Array.from({ length: 20 }, (_, i) => [[i, 0, 0], 0.3]);
  frames[10] = null; // a blink
  frames[15] = [[15, 0, 0], 0.1]; // a half blink
  const kept = Gaze.cleanRecording(frames).map((f) => f[0]);
  assert.deepEqual(kept, [0, 1, 2, 3, 4, 5, 6, 19]);
});

test("calibration visits every dot, repeats a spoiled one, and pauses when the head moves", () => {
  let clock = 0;
  const cal = new Gaze.Calibration(1000, 600, () => clock);
  assert.deepEqual(cal.currentTarget(), [500, 300]);
  let spoiled = false, paused = false;
  for (let frame = 0; frame < 2000 && !cal.isFinished(); frame++) {
    clock += 1 / 30;
    const name = cal.currentName();
    // The first time at "left", look at the middle instead: that dot must be repeated.
    if (name === "left" && !spoiled) {
      const before = cal.index;
      cal.add(C, 0.3, true);
      if (cal.retryMessage) {
        spoiled = true;
        assert.equal(cal.index, before);
      }
      continue;
    }
    // At "up", move the head once: the dot starts over.
    if (name === "up" && !paused && cal.progress() > 0.5) {
      cal.add(null, null, false);
      paused = true;
      assert.equal(cal.progress(), 0);
      continue;
    }
    const jitter = (Math.sin(frame) * 0.002);
    cal.add(add(POINTS[name], [jitter, jitter, 0]), 0.3, true);
  }
  assert.ok(cal.isFinished() && spoiled && paused);
  const results = cal.results();
  assert.deepEqual(Object.keys(results).sort(), ["centre", "down", "left", "right", "up"]);
  assert.equal(new Gaze.DirectionDetector().fit(results).ok, true);
});

// A face made of points: eyes level, nose in the middle, and the irises where we say.
function face({ irisShift = 0, noseX = 0.5, tilt = 0, span = 0.2 } = {}) {
  const points = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  const set = (i, x, y) => { points[i] = { x, y: y + tilt * (x - 0.5) }; };
  const half = span / 2;
  // Outer eye corners (33, 263) are `span` apart; each eye is a third of that wide.
  const eye = (a, b, iris, top, bottom, cx) => {
    set(a, cx - span / 6, 0.45);
    set(b, cx + span / 6, 0.45);
    set(iris, cx + irisShift * (span / 3), 0.45);
    set(top, cx, 0.43);
    set(bottom, cx, 0.47);
  };
  eye(33, 133, 468, 159, 145, noseX - half + span / 6);
  eye(362, 263, 473, 386, 374, noseX + half - span / 6);
  set(1, noseX, 0.55);
  return points;
}

test("eye measurements follow the iris and ignore how close you sit", () => {
  const still = Gaze.eyeFeatures(face(), 640, 480);
  assert.ok(Math.abs(still.features[0]) < 1e-9);
  const right = Gaze.eyeFeatures(face({ irisShift: 0.2 }), 640, 480);
  assert.ok(Math.abs(right.features[0] - 0.2) < 1e-9, right.features[0]);
  const closer = Gaze.eyeFeatures(face({ irisShift: 0.2, span: 0.3 }), 640, 480);
  assert.ok(Math.abs(closer.features[0] - 0.2) < 1e-9);
  assert.ok(still.openness > 0);
});

test("the line-up check says what to fix", () => {
  const straight = (options) => Gaze.checkStraight(face(options), null, 640, 480);
  assert.equal(straight().ok, true);
  assert.equal(straight({ noseX: 0.7 }).message, "Move your head left, to the middle of the picture");
  assert.equal(straight({ noseX: 0.3 }).message, "Move your head right, to the middle of the picture");
  assert.equal(straight({ span: 0.04 }).message, "Move a little closer to the screen");
  assert.equal(straight({ tilt: 0.4 }).message, "Straighten your head (keep your eyes level)");
  assert.equal(Gaze.checkStraight(null, null, 640, 480).ok, false);
  const turned = { data: Array(16).fill(0) };
  turned.data[8] = 0.3; // row 0, column 2 of the head pose, stored column by column
  assert.equal(Gaze.checkStraight(face(), turned, 640, 480).message, "Turn your face straight toward the screen");
});

test("the head guide notices when you move away from where you calibrated", () => {
  const guide = new Gaze.HeadGuide();
  const at = (points) => Gaze.measureHeadPosition(points, null, 640, 480);
  for (let i = 0; i < 10; i++) guide.remember(at(face()));
  assert.equal(guide.setReference(), true);
  assert.equal(guide.check(at(face())).ok, true);
  assert.equal(guide.check(at(face({ noseX: 0.6 }))).message, "Move your head left");
  assert.equal(guide.check(at(face({ span: 0.25 }))).message, "Move back a little");
  assert.equal(guide.check(null).ok, true);
});

// ---------- stages and the shared profile ----------
const DAY = "2026-11-07";

test("stages open one after another, like the Python version", () => {
  const p = Store.newProfile("Ana");
  assert.equal(TrackerRules.STAGES.length, 9);
  assert.equal(TrackerRules.isUnlocked(p, 0), true);
  assert.equal(TrackerRules.isUnlocked(p, 1), false);
  assert.throws(() => TrackerRules.completeStage(p, 1, 5, DAY), /locked/);
  const first = TrackerRules.completeStage(p, 0, 12, DAY);
  assert.equal(first.unlocked, "Pop the balloon");
  assert.equal(TrackerRules.isUnlocked(p, 1), true);
  const again = TrackerRules.completeStage(p, 0, 8, DAY);
  assert.equal(again.unlocked, null);
  assert.equal(again.newBest, false);
  assert.equal(TrackerRules.bestScore(p, 0), 12);
  assert.equal(TrackerRules.totalPoints(p), 20);
});

test("hard stages give 3 times the points", () => {
  const p = Store.newProfile("Ana");
  TrackerRules.unlockAll(p);
  const hard = TrackerRules.STAGES.findIndex((s) => s.id === "look_hard");
  const summary = TrackerRules.completeStage(p, hard, 7, DAY);
  assert.equal(summary.earned, 21);
  assert.equal(TrackerRules.bestScore(p, hard), 7);
  TrackerRules.resetProgress(p);
  assert.equal(TrackerRules.totalPoints(p), 0);
  assert.equal(TrackerRules.isUnlocked(p, 1), false);
});

test("a finished stage earns XP and keeps the streak going, with the arcade's daily limit", () => {
  const p = Store.newProfile("Ana");
  p.lastActive = "2026-11-06";
  p.streak = 4;
  const summary = TrackerRules.completeStage(p, 0, 30, DAY);
  assert.equal(summary.xp, 15); // 30 points: 3 stars
  assert.equal(summary.streak, 5);
  assert.equal(summary.streakOutcome, "extended");
  assert.equal(p.xp, 15);
  assert.deepEqual(summary.newBadges, ["First look", "Three in a row"]);
  assert.equal(TrackerRules.completeStage(p, 0, 3, DAY).xp, 10); // 1 star
  for (let i = 0; i < 4; i++) TrackerRules.completeStage(p, 0, 12, DAY);
  assert.equal(TrackerRules.completeStage(p, 0, 12, DAY).xp, 0); // the 7th today
  assert.equal(p.sessions.length, 7);
  assert.ok(p.sessions.every((s) => s.tracker && s.lessonId === "tracker:look"));
  // The arcade's eye report and lesson path ignore tracker stages.
  const report = Rules.skillReport(p);
  assert.ok(report.skills.every((s) => s.level === null));
  assert.equal(Rules.nextLessonId(p.lessons), "u1l1");
});

test("odd scores are cleaned up and the time choice is remembered", () => {
  const p = Store.newProfile("Ana");
  assert.equal(TrackerRules.completeStage(p, 0, -4, DAY).score, 0);
  assert.equal(TrackerRules.completeStage(p, 0, NaN, DAY).score, 0);
  assert.equal(TrackerRules.progress(p).seconds, 60);
  p.tracker.seconds = 999;
  assert.equal(TrackerRules.progress(p).seconds, 60);
  assert.equal(TrackerRules.timeLabel(30), "30 s");
  assert.equal(TrackerRules.timeLabel(300), "5 min");
});

test("tracker progress is saved with the player", () => {
  const memory = {};
  const storage = { getItem: (k) => memory[k] ?? null, setItem: (k, v) => { memory[k] = v; } };
  const store = Store.makeStore(storage);
  const p = store.create("Ana");
  TrackerRules.completeStage(p, 0, 9, DAY);
  store.save();
  const again = Store.makeStore(storage).current();
  assert.equal(TrackerRules.bestScore(again, 0), 9);
  assert.equal(TrackerRules.totalPoints(again), 9);
});

test("gameshow questions are read like questions.txt", () => {
  const all = Questions.parse();
  assert.equal(all.length, 18);
  assert.ok(all.every((q) => q.answers.length === 4 && q.answers.includes(q.right)));
  const warnings = [];
  const some = Questions.parse("Q: Fine?\n* yes\n- no\n- maybe\n- never\nq: Broken\n* a\n- b\n", (m) => warnings.push(m));
  assert.equal(some.length, 1);
  assert.match(warnings[0], /skipped "Broken" because it has 2 answers instead of 4/);
});
