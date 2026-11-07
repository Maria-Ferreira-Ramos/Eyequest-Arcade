// Eye Tracker: the eye-controlled games, copied from the Python Eye Trainer's
// activities folder with the same rules, timings and colours.
//
// Every frame, a game gets a "gaze": { direction, amounts, tracking, problem, time }
//   direction  "left", "right", "up", "down", or null when looking at the middle
//   tracking   false while there's no face, the eyes are closed or the head moved
//   time       seconds, for timers
(function (exports) {
  "use strict";

  const D = window.TrackerDraw;
  const DIRECTIONS = ["left", "right", "up", "down"];
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const choice = (list) => list[Math.floor(Math.random() * list.length)];
  const shuffle = (list) => {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  // ---------- shared rules for every game (timed_game.py) ----------
  const GAME_SECONDS = 60;
  const READY_SECONDS = 3;
  const COUNTDOWN_COLOR = [0, 220, 255];
  const PAUSED_COLOR = [70, 70, 235];

  class TimedGame {
    constructor(sounds) {
      this.sounds = sounds;
      this.gameSeconds = this.constructor.untimed ? null : GAME_SECONDS;
      this.extraSeconds = 0;
      this.showScore = true;
      this.helpText = "";
      this.width = 1366;
      this.height = 768;
      this.setup();
      this.start(0);
    }
    setup() {}
    resetGame() {}
    play() {}
    drawGame() {}
    resultLines() { return []; }
    canFinish() { return true; }
    handleKey() {}
    handleMouse() {}

    start(now) {
      this.score = 0;
      this.timeLeft = this.gameSeconds ? this.gameSeconds + this.extraSeconds : 0;
      this.readyLeft = READY_SECONDS;
      this.lastTime = this.now = now;
      this.paused = false;
      this.finished = false;
      this.resetGame();
    }
    update(gaze) {
      const dt = Math.max(0, gaze.time - this.lastTime);
      this.lastTime = this.now = gaze.time;
      this.paused = !gaze.tracking;
      if (this.finished || this.paused) return; // every timer stays frozen
      if (this.readyLeft > 0) {
        this.readyLeft -= dt;
        return;
      }
      if (this.gameSeconds !== null) this.timeLeft = Math.max(0, this.timeLeft - dt);
      this.play(gaze, dt);
      if (this.gameSeconds !== null && this.timeLeft <= 0 && this.canFinish()) this.finished = true;
    }
    sound(name, pitch = 1) { if (this.sounds) this.sounds.play(name, pitch); }
    stop() { if (this.sounds) this.sounds.stop(); }
    isFinished() { return this.finished; }
    results() {
      let lines = this.resultLines();
      if (this.gameSeconds !== null) lines = lines.concat(`Time limit: ${window.TrackerRules.timeLabel(this.gameSeconds)}`);
      return { score: this.score, lines };
    }
    draw(ctx, w, h) {
      this.width = w;
      this.height = h;
      const cx = w / 2, cy = h / 2;
      this.drawGame(ctx, w, h);
      if (this.showScore) D.text(ctx, `Score: ${this.score}`, cx, 100, { scale: 1.6, thickness: 4, align: "center", outline: 8 });
      if (this.gameSeconds !== null) {
        const shown = Math.max(0, Math.ceil(this.timeLeft - this.extraSeconds));
        D.text(ctx, `Time: ${shown}`, w - 40, 40, { scale: 1, thickness: 2, align: "right", outline: 7, color: D.TEXT_COLOR });
      }
      if (this.readyLeft > 0) {
        D.text(ctx, "Get ready!", cx, cy - 200, { scale: 1.5, thickness: 3, align: "center", outline: 8 });
        D.text(ctx, String(Math.ceil(this.readyLeft)), cx, cy, { scale: 4, thickness: 8, align: "center", outline: 12, color: COUNTDOWN_COLOR });
      }
      if (this.paused) D.text(ctx, "Paused", cx, h - 110, { scale: 1.2, thickness: 3, align: "center", color: PAUSED_COLOR, outline: 6 });
    }
  }

  // ---------- Look and score (direction_game.py) ----------
  const STEPS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  const TARGET_COLOR = [0, 220, 255];
  const GOOD_COLOR = [80, 220, 80];
  const BAD_COLOR = [70, 70, 235];

  class DirectionGame extends TimedGame {
    setup() { this.roundSeconds = this.constructor.hard ? 1.5 : 3.0; }
    resetGame() {
      this.missed = 0;
      this.target = null;
      this.nextTarget();
    }
    nextTarget() {
      this.target = choice(DIRECTIONS.filter((d) => d !== this.target));
      this.roundLeft = this.roundSeconds;
      this.feedback = null;
      this.feedbackLeft = 0;
    }
    endRound(correct) {
      if (correct) this.score += 1;
      else this.missed += 1;
      this.feedback = correct ? "correct" : "wrong";
      this.feedbackLeft = 0.7;
      this.sound(this.feedback);
    }
    play(gaze, dt) {
      if (this.feedback === null) {
        if (gaze.direction === this.target) this.endRound(true);
        else {
          this.roundLeft -= dt;
          if (this.roundLeft <= 0) this.endRound(false);
        }
      } else {
        this.feedbackLeft -= dt;
        if (this.feedbackLeft <= 0 && this.timeLeft > 0) this.nextTarget();
      }
    }
    canFinish() { return this.feedback === null || this.feedbackLeft <= 0; }
    resultLines() { return [`Correct: ${this.score}     Too slow: ${this.missed}`]; }
    drawGame(ctx, w, h) {
      if (this.readyLeft > 0) return;
      const cx = w / 2, cy = h / 2;
      const color = this.feedback === "correct" ? GOOD_COLOR : this.feedback === "wrong" ? BAD_COLOR : TARGET_COLOR;
      const pulse = this.feedback ? 1 : 0.8 + 0.2 * Math.sin(2 * Math.PI * 2 * this.now);
      D.edgeGlow(ctx, w, h, this.target, color, pulse);
      const [sx, sy] = STEPS[this.target];
      D.arrow(ctx, cx - sx * 90, cy - sy * 90, cx + sx * 150, cy + sy * 150, color, 24);
      const wx = cx - sx * 260, wy = cy - sy * 190;
      if (this.feedback === "correct") D.text(ctx, "+1", wx, wy, { scale: 2, thickness: 5, color: GOOD_COLOR, align: "center" });
      else if (this.feedback === "wrong") D.text(ctx, "Too slow", wx, wy, { scale: 1.6, thickness: 4, color: BAD_COLOR, align: "center" });
      else D.text(ctx, this.target.toUpperCase(), wx, wy, { scale: 1.6, thickness: 4, color: TARGET_COLOR, align: "center" });
      // Timer bar under the score: shrinks over the round, green to red.
      const fraction = this.feedback === null ? Math.max(this.roundLeft, 0) / this.roundSeconds : 0;
      const barW = 420, barY = 145, x0 = cx - barW / 2;
      ctx.fillStyle = D.css([80, 80, 80]);
      ctx.fillRect(x0, barY, barW, 16);
      if (fraction > 0) {
        ctx.fillStyle = D.css(D.mix(BAD_COLOR, GOOD_COLOR, fraction));
        ctx.fillRect(x0, barY, barW * fraction, 16);
      }
    }
  }
  class DirectionGameHard extends DirectionGame {}
  DirectionGameHard.hard = true;

  // ---------- Pop the balloon (balloon_game.py) ----------
  const BALLOON_COLORS = { up: [60, 60, 235], right: [235, 140, 40], down: [70, 200, 60], left: [0, 215, 255] };
  const SQUARE_HALF = 130;
  const BALLOON_W = 34, BALLOON_H = 44;
  const POP_SECONDS = 0.5;
  const SIDE_FLASH_SECONDS = 0.4;
  const STRING_LENGTH = 55;

  class BalloonGame extends TimedGame {
    setup() {
      const hard = this.constructor.hard;
      this.riseSeconds = hard ? 3.8 : 6.5;
      this.spawnEvery = hard ? [0.55, 0.95] : [1.2, 2.0];
      this.maxBalloons = hard ? 9 : 5;
    }
    resetGame() {
      this.balloons = [];
      this.pops = [];
      this.spawnIn = 0;
      this.popped = 0;
      this.escaped = 0;
      this.looking = null;
      this.lookUsed = false;
      this.flash = { left: 0, right: 0, up: 0, down: 0 };
    }
    play(gaze, dt) {
      // A new look in a direction pops the highest balloon of that colour.
      if (gaze.direction !== this.looking) { this.looking = gaze.direction; this.lookUsed = false; }
      if (this.looking !== null && !this.lookUsed) {
        const matching = this.balloons.filter((b) => b.direction === this.looking);
        if (matching.length) {
          const balloon = matching.reduce((top, b) => (b.y < top.y ? b : top));
          this.balloons.splice(this.balloons.indexOf(balloon), 1);
          this.pops.push({ x: this.swayX(balloon), y: balloon.y, age: 0 });
          this.score += 1;
          this.popped += 1;
          this.lookUsed = true;
          this.flash[this.looking] = SIDE_FLASH_SECONDS;
          this.sound("pop", rand(0.8, 1.3));
        }
      }
      // Balloons float up. One that floats off the top costs a point.
      const speed = (this.height + 2 * BALLOON_H + STRING_LENGTH) / this.riseSeconds;
      for (const balloon of this.balloons.slice()) {
        balloon.y -= speed * dt;
        balloon.age += dt;
        if (balloon.y < -BALLOON_H) {
          this.balloons.splice(this.balloons.indexOf(balloon), 1);
          this.score = Math.max(0, this.score - 1);
          this.escaped += 1;
          this.sound("wrong");
        }
      }
      this.pops.forEach((p) => { p.age += dt; });
      this.pops = this.pops.filter((p) => p.age < POP_SECONDS);
      for (const d in this.flash) this.flash[d] = Math.max(0, this.flash[d] - dt);
      this.spawnIn -= dt;
      if (this.spawnIn <= 0) {
        if (this.balloons.length < this.maxBalloons) this.balloons.push(this.newBalloon());
        this.spawnIn = rand(...this.spawnEvery);
      }
    }
    newBalloon() {
      const cx = this.width / 2, gap = SQUARE_HALF + BALLOON_W + 40;
      const x = Math.random() < 0.5 ? rand(this.width * 0.07, cx - gap) : rand(cx + gap, this.width * 0.93);
      return { direction: choice(DIRECTIONS), x, y: this.height + BALLOON_H, phase: rand(0, 2 * Math.PI), age: 0 };
    }
    swayX(b) { return b.x + 12 * Math.sin(2 * Math.PI * 0.5 * b.age + b.phase); }
    resultLines() { return [`Popped: ${this.popped}     Floated away: ${this.escaped}`]; }
    drawGame(ctx, w, h) {
      for (const b of this.balloons) this.drawBalloon(ctx, b);
      for (const p of this.pops) this.drawPop(ctx, p);
      drawSquare(ctx, w / 2, h / 2, SQUARE_HALF, 14, (side) => this.flash[side] > 0);
    }
    drawBalloon(ctx, b) {
      const x = this.swayX(b), y = b.y, color = BALLOON_COLORS[b.direction], bottom = y + BALLOON_H;
      ctx.beginPath();
      for (let i = 0; i < Math.floor(STRING_LENGTH / 5); i++) {
        const px = x + 5 * Math.sin(i / 2.5 + b.age * 4), py = bottom + 6 + i * 5;
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = D.css([200, 200, 200]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 7, bottom + 8); ctx.lineTo(x + 7, bottom + 8); ctx.lineTo(x, bottom - 2); ctx.closePath();
      ctx.fillStyle = D.css(D.mix(color, [0, 0, 0], 0.3));
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x, y, BALLOON_W, BALLOON_H, 0, 0, Math.PI * 2);
      ctx.fillStyle = D.css(color);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = D.css(D.mix(color, [0, 0, 0], 0.35));
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x - 12, y - 16, 7, 12, Math.PI / 6, 0, Math.PI * 2);
      ctx.fillStyle = D.css(D.mix(color, [255, 255, 255], 0.6));
      ctx.fill();
    }
    drawPop(ctx, p) {
      const progress = p.age / POP_SECONDS, burst = 1 - (1 - progress) ** 2;
      const radius = BALLOON_H * (0.8 + 0.7 * burst);
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      D.circle(ctx, p.x, p.y, radius, D.WHITE);
      for (let ray = 0; ray < 8; ray++) {
        const a = (ray * Math.PI) / 4, inner = radius + 6, outer = radius + 6 + 30 * burst;
        D.line(ctx, p.x + inner * Math.cos(a), p.y + inner * Math.sin(a), p.x + outer * Math.cos(a), p.y + outer * Math.sin(a), D.WHITE, 4);
      }
      ctx.restore();
    }
  }
  class BalloonGameHard extends BalloonGame {}
  BalloonGameHard.hard = true;

  // The colour square shared by the balloon game and the gameshow:
  // red top, blue right, green bottom, yellow left. lit(side) makes a side glow.
  function drawSquare(ctx, cx, cy, half, thickness, lit) {
    const sides = {
      up: [cx - half, cy - half, cx + half, cy - half],
      right: [cx + half, cy - half, cx + half, cy + half],
      down: [cx + half, cy + half, cx - half, cy + half],
      left: [cx - half, cy + half, cx - half, cy - half],
    };
    for (const [side, [x0, y0, x1, y1]] of Object.entries(sides)) {
      const color = BALLOON_COLORS[side];
      if (lit(side)) {
        D.line(ctx, x0, y0, x1, y1, D.mix(color, [30, 30, 30], 0.45), thickness + 28);
        D.line(ctx, x0, y0, x1, y1, D.mix(color, [255, 255, 255], 0.35), thickness + 10);
      } else {
        D.line(ctx, x0, y0, x1, y1, color, thickness);
      }
    }
  }

  // ---------- Don't look at red (red_game.py) ----------
  const ZONES = ["middle", "left", "right", "up", "down"];
  const DARK_RED = [25, 25, 150];
  const BRIGHT_RED = [40, 40, 255];
  const SAFE_COLOR = [80, 220, 80];
  const MIDDLE_RADIUS = 110;

  class RedGame extends TimedGame {
    setup() {
      const hard = this.constructor.hard;
      // A hidden extra 0.3 s lets the last round's point count (rounds divide the time exactly).
      this.extraSeconds = 0.3;
      this.warningSeconds = hard ? 1.5 : 2.0;
      this.dangerSeconds = 1.0;
      this.redCounts = hard ? [2, 3] : [1];
    }
    resetGame() {
      this.dodged = 0;
      this.caught = 0;
      this.reds = new Set();
      this.looking = null;
      this.feedback = null;
      this.feedbackLeft = 0;
      this.nextRound();
    }
    nextRound() {
      const count = choice(this.redCounts);
      const key = (set) => [...set].sort().join();
      let reds;
      do reds = new Set(shuffle(ZONES).slice(0, count)); while (key(reds) === key(this.reds));
      this.reds = reds;
      this.roundTime = 0;
      this.wasCaught = false;
      this.beeped = false;
    }
    inDanger() { return this.roundTime >= this.warningSeconds; }
    play(gaze, dt) {
      this.looking = gaze.direction || "middle";
      this.roundTime += dt;
      this.feedbackLeft = Math.max(0, this.feedbackLeft - dt);
      if (this.inDanger()) {
        if (!this.beeped) { this.beeped = true; this.sound("warning"); }
        if (!this.wasCaught && this.reds.has(this.looking)) {
          this.wasCaught = true;
          this.caught += 1;
          this.score = Math.max(0, this.score - 1);
          this.show("caught", "wrong");
        }
      }
      const roundLength = this.warningSeconds + this.dangerSeconds;
      if (this.roundTime >= roundLength) {
        if (!this.wasCaught) {
          this.dodged += 1;
          this.score += 1;
          this.show("safe", "correct");
        }
        const leftover = this.roundTime - roundLength;
        this.nextRound();
        this.roundTime = leftover;
      }
    }
    show(feedback, sound) {
      this.feedback = feedback;
      this.feedbackLeft = 0.7;
      this.sound(sound);
    }
    resultLines() { return [`Dodged: ${this.dodged}     Caught: ${this.caught}`]; }
    drawGame(ctx, w, h) {
      const cx = w / 2, cy = h / 2;
      const running = this.readyLeft <= 0 && !this.finished;
      if (running) {
        const danger = this.inDanger();
        const color = danger ? BRIGHT_RED : DARK_RED;
        const strength = danger ? 0.85 + 0.15 * Math.sin(2 * Math.PI * 6 * this.now) : 0.75 + (0.25 * this.roundTime) / this.warningSeconds;
        for (const zone of this.reds) {
          if (zone === "middle") {
            D.roundGlow(ctx, cx, cy, MIDDLE_RADIUS + 60, color, strength);
            D.circle(ctx, cx, cy, MIDDLE_RADIUS, color);
          } else D.edgeGlow(ctx, w, h, zone, color, strength);
        }
      }
      D.circle(ctx, cx, cy, MIDDLE_RADIUS, [80, 80, 80], { fill: false, width: 3 });
      if (running && !this.paused && this.looking) {
        if (this.looking === "middle") D.circle(ctx, cx, cy, MIDDLE_RADIUS + 12, D.WHITE, { fill: false, width: 3 });
        else {
          const bars = { left: [8, cy - 60, 8, cy + 60], right: [w - 9, cy - 60, w - 9, cy + 60], up: [cx - 60, 8, cx + 60, 8], down: [cx - 60, h - 9, cx + 60, h - 9] };
          D.line(ctx, ...bars[this.looking], D.WHITE, 8);
        }
      }
      if (this.feedback === "caught" && this.feedbackLeft > 0) D.tint(ctx, w, h, BRIGHT_RED, (0.35 * this.feedbackLeft) / 0.7);
      if (this.feedbackLeft > 0) {
        const safe = this.feedback === "safe";
        D.text(ctx, safe ? "+1" : "Caught!  -1", cx, 170, { scale: 1.4, thickness: 4, color: safe ? SAFE_COLOR : BRIGHT_RED, align: "center", outline: 8, outlineColor: [15, 15, 15] });
      }
      if (running && this.inDanger()) {
        D.text(ctx, "Don't look!", cx, cy + MIDDLE_RADIUS + 60, { scale: 1, thickness: 3, color: BRIGHT_RED, align: "center", outline: 7, outlineColor: [15, 15, 15] });
      }
    }
  }
  class RedGameHard extends RedGame {}
  RedGameHard.hard = true;

  // ---------- Subway runner (runner_game.py) ----------
  const LANES = 3, LANE_WIDTH = 170, PLAYER_Y = 0.78, PLAYER_RADIUS = 26;
  const START_SPEED = 320, SPEED_GAIN = 3, MAX_SPEED = 540, ROW_SECONDS = 1.5, SAFE_SECONDS = 1.5;
  const CRASH_PENALTY = 3, COIN_RADIUS = 14, COIN_GAP = 60, COINS_PER_TRAIL = 3, BLOCK_HEIGHT = 120;
  const HINT = [200, 200, 200], FLASH = [0, 220, 255], COIN_GOLD = [0, 200, 255];

  class RunnerGame extends TimedGame {
    setup() { this.showScore = false; }
    resetGame() {
      this.things = [];
      this.lane = 1;
      this.drawX = null;
      this.safeLeft = 0;
      this.crashFlash = 0;
      this.speed = START_SPEED;
      this.played = 0;
      this.nextRowIn = 0;
      this.scroll = 0;
      this.crashes = 0;
      this.looking = null;
      this.lookUsed = false;
      this.flash = { left: 0, right: 0 };
    }
    laneX(lane) { return this.width / 2 + (lane - 1) * LANE_WIDTH; }
    playerY() { return Math.round(this.height * PLAYER_Y); }
    bottom(t) { return t.top + (t.kind === "block" ? BLOCK_HEIGHT : 2 * COIN_RADIUS); }
    play(gaze, dt) {
      this.played += dt;
      this.speed = Math.min(MAX_SPEED, START_SPEED + SPEED_GAIN * this.played);
      if (gaze.direction !== this.looking) { this.looking = gaze.direction; this.lookUsed = false; }
      if ((this.looking === "left" || this.looking === "right") && !this.lookUsed) {
        this.lookUsed = true;
        this.flash[this.looking] = 0.35;
        this.lane = Math.min(LANES - 1, Math.max(0, this.lane + (this.looking === "left" ? -1 : 1)));
      }
      const move = this.speed * dt;
      this.scroll += move;
      this.things.forEach((t) => { t.top += move; });
      this.things = this.things.filter((t) => t.top < this.height + 20);
      this.nextRowIn -= move;
      if (this.nextRowIn <= 0) {
        this.spawnRow();
        this.nextRowIn = this.speed * ROW_SECONDS;
      }
      this.safeLeft = Math.max(0, this.safeLeft - dt);
      this.crashFlash = Math.max(0, this.crashFlash - dt);
      for (const d in this.flash) this.flash[d] = Math.max(0, this.flash[d] - dt);
      const py = this.playerY();
      for (const t of this.things.slice()) {
        if (t.lane !== this.lane || this.bottom(t) < py - PLAYER_RADIUS || t.top > py + PLAYER_RADIUS) continue;
        if (t.kind === "coin") {
          this.things.splice(this.things.indexOf(t), 1);
          this.score += 1;
          this.sound("coin");
        } else if (this.safeLeft <= 0) {
          this.crashes += 1;
          this.score = Math.max(0, this.score - CRASH_PENALTY);
          this.safeLeft = SAFE_SECONDS;
          this.crashFlash = 0.4;
          this.sound("wrong");
        }
      }
    }
    // 1 or 2 blocks (never all 3 lanes), and usually a short trail of coins in a free lane.
    spawnRow() {
      const lanes = shuffle([0, 1, 2]);
      const blocks = choice([1, 1, 2]);
      lanes.slice(0, blocks).forEach((lane) => this.things.push({ kind: "block", lane, top: -BLOCK_HEIGHT }));
      if (Math.random() < 0.85) {
        const lane = choice(lanes.slice(blocks));
        for (let k = 0; k < COINS_PER_TRAIL; k++) this.things.push({ kind: "coin", lane, top: -2 * COIN_RADIUS - k * COIN_GAP });
      }
    }
    resultLines() { return [`Coins: ${this.score}     Crashes: ${this.crashes}`]; }
    drawGame(ctx, w, h) {
      const left = this.laneX(0) - LANE_WIDTH / 2, right = this.laneX(LANES - 1) + LANE_WIDTH / 2;
      ctx.fillStyle = D.css([45, 45, 45]);
      ctx.fillRect(left, 0, right - left, h);
      const offset = Math.floor(this.scroll) % 80;
      for (let lane = 1; lane < LANES; lane++) {
        const x = left + lane * LANE_WIDTH;
        for (let y = offset - 80; y < h; y += 80) D.line(ctx, x, y, x, y + 40, [90, 90, 90], 3, "butt");
      }
      for (const t of this.things) {
        const x = this.laneX(t.lane);
        if (t.kind === "coin") D.circle(ctx, x, t.top + COIN_RADIUS, COIN_RADIUS, COIN_GOLD);
        else {
          const half = LANE_WIDTH / 2 - 14;
          D.roundedBox(ctx, x - half, t.top, x + half, this.bottom(t), 14, [70, 70, 220]);
        }
      }
      const target = this.laneX(this.lane);
      this.drawX = this.drawX === null ? target : this.drawX + (target - this.drawX) * 0.35;
      if (!(this.safeLeft > 0 && Math.floor(this.safeLeft * 10) % 2 === 0)) D.circle(ctx, this.drawX, this.playerY(), PLAYER_RADIUS, [255, 210, 90]);
      const color = (d) => (this.flash[d] > 0 ? FLASH : HINT);
      const lx = left / 2, rx = right + (w - right) / 2;
      D.text(ctx, "< Move left", lx, h / 2, { scale: 0.9, color: color("left"), align: "center" });
      D.text(ctx, "look left", lx, h / 2 + 30, { scale: 0.6, color: [150, 150, 150], align: "center" });
      D.text(ctx, "Move right >", rx, h / 2, { scale: 0.9, color: color("right"), align: "center" });
      D.text(ctx, "look right", rx, h / 2 + 30, { scale: 0.6, color: [150, 150, 150], align: "center" });
      D.text(ctx, "Coins", lx, 150, { scale: 0.9, color: [220, 220, 220], align: "center" });
      D.text(ctx, String(this.score), lx, 210, { scale: 2.2, thickness: 5, color: COIN_GOLD, align: "center" });
      if (this.crashFlash > 0) {
        D.tint(ctx, w, h, BAD_COLOR, (0.35 * this.crashFlash) / 0.4);
        D.text(ctx, `Crash!  -${CRASH_PENALTY}`, w / 2, h / 2, { scale: 1.6, thickness: 4, color: BAD_COLOR, align: "center", outline: 10, outlineColor: [15, 15, 15] });
      }
    }
  }

  // ---------- Gameshow (gameshow_game.py) ----------
  const QUESTIONS_PER_GAME = 10, QUESTION_SECONDS = 10, REVEAL_SECONDS = 2.5;
  const SIDES = ["up", "right", "down", "left"];
  const SHOW_HALF = 150;

  class GameshowGame extends TimedGame {
    setup() {
      this.showScore = false;
      this.helpText = "Click the button or press Space to lock in";
    }
    resetGame() {
      const all = window.TrackerQuestions.parse();
      this.questions = shuffle(all).slice(0, Math.min(QUESTIONS_PER_GAME, all.length));
      this.number = -1;
      this.correct = 0;
      this.mouse = null;
      this.button = new D.Button("Lock in answer", 0, 0, 250, 74, [246, 176, 28], 0.85);
      this.nextQuestion();
    }
    nextQuestion() {
      this.number += 1;
      if (this.number >= this.questions.length) {
        this.finished = true;
        return;
      }
      const q = this.questions[this.number];
      this.question = q.question;
      this.right = q.right;
      const shuffled = shuffle(q.answers);
      this.answers = Object.fromEntries(SIDES.map((side, i) => [side, shuffled[i]]));
      this.chosen = null;
      this.questionLeft = QUESTION_SECONDS;
      this.locked = null;
      this.revealLeft = 0;
    }
    canLock() { return this.locked === null && this.chosen !== null && !this.paused && this.readyLeft <= 0 && !this.finished; }
    lockIn() {
      if (!this.canLock()) return;
      if (this.answers[this.chosen] === this.right) {
        this.locked = "correct";
        this.score += 1;
        this.correct += 1;
        this.sound("correct");
      } else {
        this.locked = "wrong";
        this.sound("wrong");
      }
      this.revealLeft = REVEAL_SECONDS;
    }
    handleMouse(mouse) {
      this.mouse = mouse;
      const click = mouse.takeClick();
      if (click && this.canLock() && this.button.isClicked(click)) this.lockIn();
    }
    handleKey(key) { if (key === " " || key === "Enter") this.lockIn(); }
    play(gaze, dt) {
      if (this.locked === null) {
        if (SIDES.includes(gaze.direction)) this.chosen = gaze.direction;
        this.questionLeft -= dt;
        if (this.questionLeft <= 0) {
          this.questionLeft = 0;
          this.locked = "timeout";
          this.revealLeft = REVEAL_SECONDS;
          this.sound("wrong");
        }
      } else {
        this.revealLeft -= dt;
        if (this.revealLeft <= 0) this.nextQuestion();
      }
    }
    resultLines() { return [`Correct answers: ${this.correct} of ${this.questions.length}`]; }
    drawGame(ctx, w, h) {
      if (this.finished || this.number >= this.questions.length) return;
      const cx = w / 2, cy = h / 2 + 60;
      D.text(ctx, `Question ${this.number + 1} of ${this.questions.length}`, w / 2, 40, { scale: 0.7, color: [170, 170, 170], align: "center" });
      D.wrap(ctx, this.question, w - 240, 1.1, 3).slice(0, 2).forEach((line, i) => D.text(ctx, line, w / 2, 95 + i * 48, { scale: 1.1, thickness: 3, align: "center" }));
      SIDES.forEach((side, i) => this.drawAnswerRow(ctx, side, 60, cy - 150 + i * 92, cx - SHOW_HALF - 60));
      drawSquare(ctx, cx, cy, SHOW_HALF, 14, (side) => side === this.chosen && this.locked === null);
      this.button.cx = cx;
      this.button.cy = cy;
      this.button.enabled = this.canLock();
      this.button.draw(ctx, this.mouse);
      const rx = cx + SHOW_HALF + (w - (cx + SHOW_HALF)) / 2;
      this.drawTimer(ctx, rx, cy - 40);
      D.text(ctx, `Score: ${this.score}`, rx, cy + 90, { scale: 1, thickness: 2, align: "center" });
      const y = cy + SHOW_HALF + 45;
      if (this.locked === "correct") D.text(ctx, "Correct!", cx, y, { scale: 1.3, thickness: 4, color: GOOD_COLOR, align: "center" });
      else if (this.locked === "wrong" || this.locked === "timeout") {
        const lead = this.locked === "timeout" ? "Time's up!" : "Not quite!";
        D.text(ctx, `${lead}  The answer was: ${this.right}`, cx, y, { scale: 0.9, thickness: 2, color: BAD_COLOR, align: "center" });
      } else if (this.chosen === null) {
        D.text(ctx, "Look at the colour of your answer", cx, y, { scale: 0.8, color: [190, 190, 190], align: "center" });
      }
    }
    drawAnswerRow(ctx, side, x0, y, x1) {
      const answer = this.answers[side];
      let background = [55, 55, 55];
      if (this.locked !== null && answer === this.right) background = [40, 110, 40];
      else if (this.locked === "wrong" && side === this.chosen) background = [40, 40, 140];
      else if (this.locked === null && side === this.chosen) background = [95, 95, 95];
      D.roundedBox(ctx, x0, y - 34, x1, y + 34, 18, background);
      if (this.locked === null && side === this.chosen) D.roundedBox(ctx, x0 - 4, y - 38, x0 + 8, y + 38, 6, BALLOON_COLORS[side]);
      D.roundedBox(ctx, x0 + 20, y - 22, x0 + 64, y + 22, 10, BALLOON_COLORS[side]);
      let label = answer;
      const maxWidth = x1 - x0 - 110;
      while (D.textWidth(ctx, label, 0.9, 2) > maxWidth && label.length > 3) label = `${label.slice(0, -4)}...`;
      D.text(ctx, label, x0 + 84, y, { scale: 0.9, thickness: 2 });
    }
    drawTimer(ctx, x, y) {
      const fraction = Math.max(this.questionLeft, 0) / QUESTION_SECONDS;
      D.circle(ctx, x, y, 70, [70, 70, 70], { fill: false, width: 10 });
      if (fraction > 0) {
        ctx.beginPath();
        ctx.arc(x, y, 70, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * fraction);
        ctx.lineWidth = 10;
        ctx.lineCap = "butt";
        ctx.strokeStyle = D.css(D.mix(BAD_COLOR, GOOD_COLOR, fraction));
        ctx.stroke();
      }
      D.text(ctx, String(Math.ceil(this.questionLeft)), x, y, { scale: 1.8, thickness: 4, align: "center" });
    }
  }
  GameshowGame.untimed = true;

  // ---------- Tetris (tetris_game.py) ----------
  const COLUMNS = 10, ROWS = 20;
  const FALL_SECONDS = 0.9, FASTER_PER_LINE = 0.03, FASTEST_FALL = 0.3, TETRIS_FLASH = 0.35;
  const SHAPES = {
    I: [[[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], [230, 210, 0]],
    O: [[[1, 1], [1, 1]], [0, 215, 255]],
    T: [[[0, 1, 0], [1, 1, 1], [0, 0, 0]], [200, 70, 160]],
    S: [[[0, 1, 1], [1, 1, 0], [0, 0, 0]], [70, 200, 60]],
    Z: [[[1, 1, 0], [0, 1, 1], [0, 0, 0]], [60, 60, 230]],
    J: [[[1, 0, 0], [1, 1, 1], [0, 0, 0]], [220, 110, 30]],
    L: [[[0, 0, 1], [1, 1, 1], [0, 0, 0]], [0, 140, 255]],
  };
  const NAMES = Object.keys(SHAPES);
  const SYMBOL_COLOR = [200, 200, 200], DIM_COLOR = [90, 90, 90];

  // Every shape is a square grid, so turning it a quarter is simple.
  const turnCells = (cells, clockwise) => {
    const k = cells.length;
    return cells.map((row, r) => row.map((_, c) => (clockwise ? cells[k - 1 - c][r] : cells[c][k - 1 - r])));
  };

  class Piece {
    constructor(name) {
      this.name = name;
      this.cells = SHAPES[name][0].map((row) => row.slice());
      this.color = SHAPES[name][1];
      this.x = 0;
      this.y = 0;
    }
    filled(cells = this.cells, x = this.x, y = this.y) {
      const out = [];
      cells.forEach((row, r) => row.forEach((v, c) => { if (v) out.push([y + r, x + c]); }));
      return out;
    }
  }

  class TetrisGame extends TimedGame {
    setup() {
      this.showScore = false;
      this.helpText = "A / D = move   W = store   S = drop";
    }
    resetGame() {
      this.board = Array.from({ length: ROWS }, () => Array(COLUMNS).fill(0));
      this.bag = [];
      this.stored = null;
      this.storeUsed = false;
      this.fallTimer = 0;
      this.looking = null;
      this.lookUsed = false;
      this.flash = { left: 0, right: 0, up: 0, down: 0 };
      this.clearedRows = [];
      this.clearFlash = 0;
      this.piece = this.takeFromBag();
      this.placeAtTop(this.piece);
    }
    handleKey(key) {
      if (this.finished || this.paused || this.readyLeft > 0) return;
      const k = key.length === 1 ? key.toLowerCase() : key;
      if (k === "w" || k === "ArrowUp") {
        this.flash.up = TETRIS_FLASH;
        this.store();
      } else if (k === "s" || k === "ArrowDown") {
        this.flash.down = TETRIS_FLASH;
        while (this.dropRow()) { /* fall to the bottom */ }
        this.lock();
      } else if (k === "a" || k === "ArrowLeft" || k === "d" || k === "ArrowRight") {
        const step = k === "a" || k === "ArrowLeft" ? -1 : 1;
        if (this.fits(this.piece.filled(undefined, this.piece.x + step))) this.piece.x += step;
      }
    }
    takeFromBag() {
      if (!this.bag.length) this.bag = shuffle(NAMES);
      return new Piece(this.bag.pop());
    }
    placeAtTop(piece) {
      const cols = [], rows = [];
      piece.cells.forEach((row, r) => row.forEach((v, c) => { if (v) { cols.push(c); rows.push(r); } }));
      const lowest = -Math.min(...cols), highest = COLUMNS - 1 - Math.max(...cols);
      piece.x = Math.floor((lowest + highest) / 2);
      piece.y = -Math.min(...rows);
      this.fallTimer = 0;
      if (!this.fits(piece.filled())) this.finished = true;
    }
    fits(squares) {
      return squares.every(([row, col]) => col >= 0 && col < COLUMNS && row < ROWS && !(row >= 0 && this.board[row][col]));
    }
    rotate(clockwise) {
      const turned = turnCells(this.piece.cells, clockwise);
      for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]]) {
        if (this.fits(this.piece.filled(turned, this.piece.x + dx, this.piece.y + dy))) {
          this.piece.cells = turned;
          this.piece.x += dx;
          this.piece.y += dy;
          return true;
        }
      }
      return false;
    }
    dropRow() {
      if (this.fits(this.piece.filled(undefined, undefined, this.piece.y + 1))) {
        this.piece.y += 1;
        return true;
      }
      return false;
    }
    landingY() {
      let y = this.piece.y;
      while (this.fits(this.piece.filled(undefined, undefined, y + 1))) y += 1;
      return y;
    }
    lock() {
      const number = NAMES.indexOf(this.piece.name) + 1;
      for (const [row, col] of this.piece.filled()) {
        if (row < 0) {
          this.finished = true;
          return;
        }
        this.board[row][col] = number;
      }
      const full = [];
      this.board.forEach((row, r) => { if (row.every(Boolean)) full.push(r); });
      if (full.length) {
        this.board = [...full.map(() => Array(COLUMNS).fill(0)), ...this.board.filter((_, r) => !full.includes(r))];
        this.score += full.length;
        this.clearedRows = full;
        this.clearFlash = 0.3;
        this.sound("correct");
      } else this.sound("pop", 0.6);
      this.piece = this.takeFromBag();
      this.storeUsed = false;
      this.placeAtTop(this.piece);
    }
    store() {
      if (this.storeUsed) {
        this.sound("wrong", 1.4);
        return;
      }
      const current = new Piece(this.piece.name);
      if (this.stored === null) {
        this.stored = current;
        this.piece = this.takeFromBag();
      } else {
        this.piece = new Piece(this.stored.name);
        this.stored = current;
      }
      this.storeUsed = true;
      this.placeAtTop(this.piece);
      this.sound("pop", 1.3);
    }
    play(gaze, dt) {
      if (gaze.direction !== this.looking) { this.looking = gaze.direction; this.lookUsed = false; }
      if ((this.looking === "left" || this.looking === "right") && !this.lookUsed) {
        this.lookUsed = true;
        this.flash[this.looking] = TETRIS_FLASH;
        if (this.rotate(this.looking === "right")) this.sound("pop", 1.6);
      }
      if (this.finished) return;
      this.fallTimer += dt;
      const fallSeconds = Math.max(FASTEST_FALL, FALL_SECONDS - FASTER_PER_LINE * this.score);
      if (this.fallTimer >= fallSeconds) {
        this.fallTimer = 0;
        if (!this.dropRow()) this.lock();
      }
      for (const d in this.flash) this.flash[d] = Math.max(0, this.flash[d] - dt);
      this.clearFlash = Math.max(0, this.clearFlash - dt);
    }
    resultLines() { return [`Lines cleared: ${this.score}`]; }
    drawGame(ctx, w, h) {
      const cell = Math.floor((h - 215) / ROWS);
      const boardW = cell * COLUMNS, boardH = cell * ROWS;
      const bx = Math.floor((w - boardW) / 2), by = 115 + Math.floor((h - 215 - boardH) / 2);
      ctx.fillStyle = D.css([25, 25, 25]);
      ctx.fillRect(bx, by, boardW, boardH);
      for (let c = 1; c < COLUMNS; c++) D.line(ctx, bx + c * cell, by, bx + c * cell, by + boardH, [45, 45, 45], 1, "butt");
      for (let r = 1; r < ROWS; r++) D.line(ctx, bx, by + r * cell, bx + boardW, by + r * cell, [45, 45, 45], 1, "butt");
      const playing = this.readyLeft <= 0 && !this.finished;
      if (playing) {
        // A huge, faint copy of the piece behind everything, to see its shape from the edges.
        ctx.save();
        ctx.globalAlpha = 0.18;
        drawMiniPiece(ctx, this.piece, w / 2, h / 2, Math.round(h * 0.2));
        ctx.restore();
      }
      this.board.forEach((row, r) => row.forEach((v, c) => { if (v) drawCell(ctx, bx + c * cell, by + r * cell, cell, SHAPES[NAMES[v - 1]][1]); }));
      if (this.clearFlash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${this.clearFlash / 0.3})`;
        for (const row of this.clearedRows) ctx.fillRect(bx, by + row * cell, boardW, cell);
      }
      if (playing) {
        const ghost = this.landingY();
        for (const [row, col] of this.piece.filled(undefined, undefined, ghost)) {
          if (row >= 0) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = D.css(this.piece.color);
            ctx.strokeRect(bx + col * cell + 2, by + row * cell + 2, cell - 5, cell - 5);
          }
        }
        for (const [row, col] of this.piece.filled()) if (row >= 0) drawCell(ctx, bx + col * cell, by + row * cell, cell, this.piece.color);
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = D.css([150, 150, 150]);
      ctx.strokeRect(bx - 2, by - 2, boardW + 4, boardH + 4);
      const right = bx + boardW + 50;
      D.text(ctx, "Lines", right, by + 30, { scale: 0.9, color: [170, 170, 170] });
      D.text(ctx, String(this.score), right, by + 90, { scale: 2.2, thickness: 5 });
      this.drawControls(ctx, w, h);
    }
    drawControls(ctx, w, h) {
      const color = (d) => (this.flash[d] > 0 ? FLASH : SYMBOL_COLOR);
      const hint = [150, 150, 150], cy = h / 2, cx = w / 2;
      drawTurnArrow(ctx, 95, cy - 25, false, color("left"));
      D.text(ctx, "Turn left", 95, cy + 45, { scale: 0.8, color: color("left"), align: "center" });
      D.text(ctx, "look left", 95, cy + 75, { scale: 0.6, color: hint, align: "center" });
      drawTurnArrow(ctx, w - 95, cy - 25, true, color("right"));
      D.text(ctx, "Turn right", w - 95, cy + 45, { scale: 0.8, color: color("right"), align: "center" });
      D.text(ctx, "look right", w - 95, cy + 75, { scale: 0.6, color: hint, align: "center" });
      const top = !this.storeUsed || this.flash.up > 0 ? color("up") : DIM_COLOR;
      D.text(ctx, "Stored", cx - 20, 48, { scale: 0.9, color: top, align: "right" });
      D.text(ctx, "W / Up key", cx - 20, 80, { scale: 0.6, color: hint, align: "right" });
      ctx.lineWidth = 2;
      ctx.strokeStyle = D.css(top);
      ctx.strokeRect(cx, 25, 100, 70);
      if (this.stored) drawMiniPiece(ctx, this.stored, cx + 50, 60, 15);
      const down = color("down");
      D.arrow(ctx, cx - 70, h - 80, cx - 70, h - 20, down, 6, 0.4);
      D.text(ctx, "Hard drop", cx - 40, h - 62, { scale: 0.9, color: down });
      D.text(ctx, "S / Down key", cx - 40, h - 30, { scale: 0.6, color: hint });
    }
  }
  TetrisGame.untimed = true;

  function drawCell(ctx, x, y, size, color) {
    ctx.fillStyle = D.css(color);
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    D.line(ctx, x + 2, y + 2, x + size - 3, y + 2, color.map((c) => Math.min(255, Math.round(c * 1.3) + 30)), 2, "butt");
    D.line(ctx, x + 2, y + size - 3, x + size - 3, y + size - 3, color.map((c) => Math.round(c * 0.55)), 2, "butt");
  }

  function drawMiniPiece(ctx, piece, cx, cy, cell) {
    const rows = piece.cells.map((row, r) => r).filter((r) => piece.cells[r].some(Boolean));
    const cols = piece.cells[0].map((_, c) => c).filter((c) => piece.cells.some((row) => row[c]));
    const x0 = cx - (cols.length * cell) / 2, y0 = cy - (rows.length * cell) / 2;
    rows.forEach((r, i) => cols.forEach((c, j) => { if (piece.cells[r][c]) drawCell(ctx, x0 + j * cell, y0 + i * cell, cell, piece.color); }));
  }

  function drawTurnArrow(ctx, cx, cy, clockwise, color, radius = 32) {
    const [start, end] = clockwise ? [-60, 210] : [-30, 240];
    const rad = (d) => (d * Math.PI) / 180;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, rad(start), rad(end));
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.strokeStyle = D.css(color);
    ctx.stroke();
    const tipAngle = rad(clockwise ? end : start);
    const tip = [cx + radius * Math.cos(tipAngle), cy + radius * Math.sin(tipAngle)];
    const heading = tipAngle + (clockwise ? Math.PI / 2 : -Math.PI / 2);
    const corner = (side) => {
      const back = heading + Math.PI + side * 0.5;
      return [tip[0] + 14 * Math.cos(back), tip[1] + 14 * Math.sin(back)];
    };
    ctx.beginPath();
    ctx.moveTo(tip[0] + 6 * Math.cos(heading), tip[1] + 6 * Math.sin(heading));
    ctx.lineTo(...corner(-1));
    ctx.lineTo(...corner(1));
    ctx.closePath();
    ctx.fillStyle = D.css(color);
    ctx.fill();
  }

  const GAMES = {
    direction: [DirectionGame, DirectionGameHard],
    balloon: [BalloonGame, BalloonGameHard],
    red: [RedGame, RedGameHard],
    runner: [RunnerGame],
    gameshow: [GameshowGame],
    tetris: [TetrisGame],
  };

  // Makes the game for a stage from TrackerRules.STAGES.
  function make(stage, sounds, seconds) {
    const Game = GAMES[stage.game][stage.hard ? 1 : 0];
    const game = new Game(sounds);
    if (stage.timed && seconds) game.gameSeconds = seconds;
    return game;
  }

  Object.assign(exports, { make, TimedGame, GAMES, turnCells, Piece });
})(window.TrackerGames = {});
