// Eye Tracker: playing one stage. Starts the webcam and the face tracker, then runs the
// same steps as the Python Eye Trainer's main.py:
//   positioning   line up your head, then press any key or click to start
//   calibrating   dots at the centre and at each far edge of the screen
//   activity      the game itself
// Calibration is remembered until the page is closed, so later stages can skip it.
(function (exports) {
  "use strict";

  const G = window.Gaze;
  const D = window.TrackerDraw;

  // The face tracker (MediaPipe Face Landmarker) loads from the internet the first time.
  const MEDIAPIPE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
  const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
  const FRAME_W = 640, FRAME_H = 480;

  const GOOD = [0, 255, 0], WARN = [0, 165, 255], BAD = [0, 0, 255];

  // Kept between stages for as long as the page is open.
  const session = {
    landmarker: null,
    loading: null,
    detector: new G.DirectionDetector(),
    headGuide: new G.HeadGuide(),
    calibrated: false,
    sounds: null,
    testSource: null, // for automated tests: a function giving fake face points
  };

  async function loadLandmarker() {
    if (session.landmarker) return session.landmarker;
    if (!session.loading) {
      session.loading = (async () => {
        const vision = await import(`${MEDIAPIPE}/vision_bundle.mjs`);
        const files = await vision.FilesetResolver.forVisionTasks(`${MEDIAPIPE}/wasm`);
        const options = (delegate) => ({
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFacialTransformationMatrixes: true,
        });
        try {
          session.landmarker = await vision.FaceLandmarker.createFromOptions(files, options("GPU"));
        } catch {
          session.landmarker = await vision.FaceLandmarker.createFromOptions(files, options("CPU"));
        }
        return session.landmarker;
      })().catch((error) => {
        session.loading = null; // let the next try start over
        const wrapped = new Error("Couldn't load the face tracker. It needs an internet connection.");
        wrapped.kind = "model";
        wrapped.cause = error;
        throw wrapped;
      });
    }
    return session.loading;
  }

  // A message the player can act on, from a camera error.
  function cameraProblem(error) {
    const name = error && error.name;
    if (name === "NotAllowedError" || name === "SecurityError") {
      return "Camera access is blocked. Allow the camera for this page (look for the camera icon in the address bar), then try again.";
    }
    if (name === "NotFoundError" || name === "OverconstrainedError") return "No camera was found. Plug one in or turn it on, then try again.";
    if (name === "NotReadableError" || name === "AbortError") {
      return "The camera is busy. Close other apps that might be using it (Zoom, Teams, the Camera app), then try again.";
    }
    return `The camera didn't start (${(error && error.message) || error}).`;
  }

  // Draws the mirrored webcam picture with the eye points, like eye_detector.py.
  function drawFrameOverlay(fctx, points) {
    if (!points) return;
    const dot = (i, color) => D.circle(fctx, points[i].x * FRAME_W, points[i].y * FRAME_H, 2, color);
    const EYES = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
      263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466];
    EYES.forEach((i) => dot(i, [0, 255, 0]));
    for (let i = 468; i < 478; i++) dot(i, [0, 0, 255]);
  }

  // Starts a stage. options: { stage, seconds, calibrateFirst, canvas, onFinish(results), onError(message), onExit() }
  function start(options) {
    const { stage, canvas } = options;
    const ctx = canvas.getContext("2d");
    const frame = document.createElement("canvas");
    frame.width = FRAME_W;
    frame.height = FRAME_H;
    const fctx = frame.getContext("2d", { willReadFrequently: false });
    const sounds = session.sounds || (session.sounds = new D.Sounds("music"));
    sounds.unlock();

    const now = () => performance.now() / 1000;
    const calibration = new G.Calibration(innerWidth, innerHeight, now);
    const featureFilter = new G.FeatureFilter(3);
    const blink = new G.BlinkDetector();
    const mouse = { x: -1, y: -1, click: null, takeClick() { const c = this.click; this.click = null; return c; } };

    let mode = "loading";
    let loadingText = "Starting the camera...";
    let message = "";
    let stream = null, video = null;
    let game = null;
    let running = true;
    let frameId = 0;
    let lastTimestamp = -1;
    let previousTime = now();
    let lastFace = null; // this frame's face, for key presses and clicks
    let straight = { ok: false, message: "" };
    const W = () => canvas.clientWidth, H = () => canvas.clientHeight;

    function resize() {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(W() * ratio);
      canvas.height = Math.round(H() * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      calibration.resize(W(), H());
    }

    function startActivity() {
      game = window.TrackerGames.make(stage, sounds, options.seconds);
      game.start(now());
      sounds.playMusic(stage.music);
      mode = "activity";
    }

    function leaveActivity() {
      if (game) game.stop();
      sounds.stopMusic();
    }

    function startPositioning() {
      if (mode === "activity") leaveActivity();
      mode = "positioning";
      message = "";
    }

    // From the line-up screen: remember where the head is, then start the dots.
    function beginCalibration() {
      if (mode !== "positioning" || !straight.ok || !lastFace) return;
      session.headGuide.setReference();
      calibration.start();
      mode = "calibrating";
    }

    function onKey(event) {
      if (!running) return;
      const key = event.key;
      if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) event.preventDefault();
      sounds.unlock();
      if (key === "Escape") return exit();
      if (key === "c" || key === "C") {
        if (mode === "activity" || mode === "calibrating" || mode === "positioning") startPositioning();
        return;
      }
      if (mode === "positioning") return beginCalibration();
      if (mode === "activity" && game) game.handleKey(key);
    }
    function point(event) {
      const box = canvas.getBoundingClientRect();
      return [event.clientX - box.left, event.clientY - box.top];
    }
    function onMove(event) { [mouse.x, mouse.y] = point(event); }
    function onUp(event) {
      [mouse.x, mouse.y] = point(event);
      sounds.unlock();
      if (mode === "positioning") beginCalibration();
      else if (mode === "activity") mouse.click = point(event);
    }

    addEventListener("keydown", onKey);
    addEventListener("resize", resize);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onUp);
    resize();

    async function boot() {
      if (session.testSource) {
        afterBoot();
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: FRAME_W, height: FRAME_H, facingMode: "user" }, audio: false });
      } catch (error) {
        if (running) fail(cameraProblem(error));
        return;
      }
      if (!running) return stopStream();
      video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play().catch(() => {});
      loadingText = "Loading the face tracker (the first time takes a few seconds)...";
      try {
        await loadLandmarker();
      } catch (error) {
        console.error(error.cause || error);
        if (running) fail(error.message);
        return;
      }
      if (running) afterBoot();
    }

    function afterBoot() {
      if (options.calibrateFirst || !session.calibrated) startPositioning();
      else startActivity();
    }

    function stopStream() {
      if (stream) stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }

    // One face measurement: { points, matrix } or null.
    function detect() {
      if (session.testSource) return session.testSource(now());
      if (!video || video.readyState < 2 || !session.landmarker) return null;
      fctx.save();
      fctx.translate(FRAME_W, 0);
      fctx.scale(-1, 1); // mirror, like looking in a mirror (webcam.py flips the picture too)
      fctx.drawImage(video, 0, 0, FRAME_W, FRAME_H);
      fctx.restore();
      let timestamp = Math.round(performance.now());
      if (timestamp <= lastTimestamp) timestamp = lastTimestamp + 1;
      lastTimestamp = timestamp;
      const result = session.landmarker.detectForVideo(frame, timestamp);
      if (!result.faceLandmarks || !result.faceLandmarks.length) return null;
      return { points: result.faceLandmarks[0], matrix: (result.facialTransformationMatrixes || [])[0] || null };
    }

    // The webcam picture: centred and big while lining up, small in the corner during a game.
    function drawPreview(size, centred, decorate) {
      let pw = W() / size;
      // Centred, it fits between the instructions at the top and the prompt at the bottom.
      if (centred) pw = Math.max(160, Math.min(pw, ((H() - 350) * FRAME_W) / FRAME_H));
      const ph = (FRAME_H * pw) / FRAME_W;
      const x = centred ? (W() - pw) / 2 : W() - pw - 20;
      const y = centred ? 200 + (H() - 350 - ph) / 2 : H() - ph - 20;
      if (session.testSource) {
        fctx.fillStyle = "#3a3a3a";
        fctx.fillRect(0, 0, FRAME_W, FRAME_H);
      }
      if (decorate) decorate(fctx);
      ctx.drawImage(frame, x, y, pw, ph);
      ctx.lineWidth = 1;
      ctx.strokeStyle = D.css(D.TEXT_COLOR);
      ctx.strokeRect(x, y, pw, ph);
    }

    const drawLines = (lines, startY, color = D.TEXT_COLOR) => lines.forEach((line, i) => D.text(ctx, line, 40, startY + i * 40 - 10, { scale: 0.9, thickness: 2, color }));

    function drawHeadGuide(f, head, ok) {
      const ref = session.headGuide.reference;
      if (!ref) return;
      const color = ok ? GOOD : BAD;
      D.circle(f, ref[0], ref[1], 0.35 * ref[2], color, { fill: false, width: 2 });
      if (head) D.circle(f, head[0], head[1], 5, color);
    }

    function tick() {
      if (!running) return;
      frameId = requestAnimationFrame(tick);
      const w = W(), h = H();
      ctx.fillStyle = D.css(D.BACKGROUND);
      ctx.fillRect(0, 0, w, h);

      if (mode === "loading") {
        D.text(ctx, loadingText, w / 2, h / 2, { scale: 1, align: "center", color: D.TEXT_COLOR });
        return;
      }

      const t = now();
      // 1. Find the face, measure the eyes and the head position.
      const face = detect();
      lastFace = face;
      let features = null, openness = null, head = null, status, statusColor;
      if (!face) {
        status = "No face detected";
        statusColor = BAD;
      } else {
        head = G.measureHeadPosition(face.points, face.matrix, FRAME_W, FRAME_H);
        session.headGuide.remember(head);
        const eyes = G.eyeFeatures(face.points, FRAME_W, FRAME_H);
        if (eyes && !blink.isBlink(eyes.openness)) ({ features, openness } = eyes);
        if (!features) { status = "Eyes closed"; statusColor = WARN; }
        else { status = "Face detected"; statusColor = GOOD; }
      }
      const points = face ? face.points : null;

      if (mode === "positioning") {
        straight = G.checkStraight(points, face && face.matrix, FRAME_W, FRAME_H);
        drawPreview(2, true, (f) => {
          drawFrameOverlay(f, points);
          D.line(f, FRAME_W / 2, 0, FRAME_W / 2, FRAME_H, straight.ok ? GOOD : BAD, 1, "butt");
        });
        drawLines(["Line up your nose with the line, head straight, facing the screen.", straight.message], 50, straight.ok ? GOOD : BAD);
        drawLines(["Then look at each dot that appears. Move only your eyes."], 130);
        if (message) drawLines([message], 180, BAD);
        D.text(ctx, straight.ok ? "Press any key or click to start" : "Line up your head first", w / 2, h - 60,
          { scale: 1.1, thickness: 2, align: "center", color: straight.ok ? GOOD : WARN });
      } else if (mode === "calibrating") {
        const check = session.headGuide.check(head);
        calibration.add(features, openness, check.ok);
        if (calibration.isFinished()) {
          const fit = session.detector.fit(calibration.results());
          if (fit.ok) {
            session.calibrated = true;
            featureFilter.reset();
            startActivity();
          } else {
            message = fit.message;
            mode = "positioning";
          }
        } else {
          const [x, y] = calibration.currentTarget();
          D.circle(ctx, x, y, 35 - 25 * calibration.progress(), D.WHITE, { fill: false, width: 3 });
          D.circle(ctx, x, y, 6, [0, 0, 255]);
          let lines, color = D.TEXT_COLOR;
          if (check.ok) {
            lines = [calibration.instruction(), calibration.retryMessage || `(dot ${calibration.index + 1} of ${calibration.totalDots()})`];
            if (calibration.retryMessage) color = WARN;
          } else {
            lines = [`Paused: ${check.message}`];
            color = BAD;
          }
          drawLines(lines, Math.round(h * 0.25), color);
        }
      }

      if (mode === "activity") {
        const check = session.headGuide.check(head);
        const gaze = { direction: null, amounts: {}, tracking: false, problem: "", time: t };
        if (!check.ok) {
          session.detector.reset();
          gaze.problem = `Head moved: ${check.message}`;
        } else if (!features) {
          gaze.problem = status;
        } else {
          const steady = featureFilter.update(features);
          gaze.direction = session.detector.update(steady);
          gaze.amounts = session.detector.amounts(steady);
          gaze.tracking = true;
        }
        game.handleMouse(mouse);
        game.update(gaze);
        game.draw(ctx, w, h);
        drawPreview(8, false, (f) => {
          drawFrameOverlay(f, points);
          drawHeadGuide(f, head, check.ok);
        });
        // Kept low on the left, where no game draws anything important.
        if (gaze.problem && gaze.problem !== status) drawLines([gaze.problem], h - 75, BAD);
        else D.text(ctx, `${game.helpText ? `${game.helpText}   ` : ""}C = calibrate again   Esc = stages`, 40, h - 85, { scale: 0.65, thickness: 2, color: [170, 170, 170] });
        if (game.isFinished()) {
          leaveActivity();
          sounds.play("victory");
          finish(game.results());
          return;
        }
      }

      // 4. Status and frames per second.
      const elapsed = t - previousTime;
      previousTime = t;
      const fps = elapsed > 0 ? Math.round(1 / elapsed) : 0;
      const statusY = mode === "calibrating" ? Math.round(h * 0.25) + 80 : mode === "positioning" ? h - 110 : h - 40;
      if (mode !== "finished") drawLines([`${status}   FPS: ${fps}`], statusY, statusColor);
    }

    function finish(results) {
      mode = "finished";
      stop({ keepSound: true });
      options.onFinish(results);
    }

    function fail(problem) {
      stop();
      options.onError(problem);
    }

    function exit() {
      stop();
      options.onExit();
    }

    // Stops the camera, the loop and the music. Safe to call more than once.
    function stop({ keepSound = false } = {}) {
      if (!running) return;
      running = false;
      cancelAnimationFrame(frameId);
      removeEventListener("keydown", onKey);
      removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", onUp);
      if (!keepSound) sounds.stop();
      sounds.stopMusic();
      stopStream();
      if (video) video.srcObject = null;
    }

    boot();
    frameId = requestAnimationFrame(tick);
    return {
      stop,
      // For automated tests: what's on screen right now.
      debug: { get mode() { return mode; }, get game() { return game; }, get dot() { return mode === "calibrating" ? calibration.currentName() : null; } },
    };
  }

  Object.assign(exports, {
    start,
    isCalibrated: () => session.calibrated,
    // For automated tests only: play with made-up face points instead of a camera.
    useTestSource(fn) { session.testSource = fn; },
  });
})(window.TrackerPlay = {});
