// The games. Each takes a Stage and returns a promise for { score, metrics },
// where score runs from 0 to 100 and metrics are numbers kept for the progress page.
(function () {
  "use strict";

  // ---------- colors ----------
  const PALETTE = {
    background: "#14132a", target: [255, 182, 39], decoy: [138, 135, 168], frame: [74, 71, 110],
    hud: [243, 241, 255], good: [76, 207, 156], bad: [255, 107, 94], soft: [133, 119, 255],
  };

  const css = (rgb, alpha = 1) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
  const shade = (rgb, share) => rgb.map((v) => Math.round(v * share));
  const random = (low, high) => low + Math.random() * (high - low);
  const shuffle = (list) => {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };
  const median = (values) => {
    if (!values.length) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };

  // ---------- sound ----------
  let audio = null;
  function chime(frequency = 660) {
    try {
      audio = audio || new AudioContext();
      const oscillator = audio.createOscillator();
      const volume = audio.createGain();
      oscillator.frequency.value = frequency;
      volume.gain.setValueAtTime(0.06, audio.currentTime);
      volume.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.2);
      oscillator.connect(volume).connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.2);
    } catch {
      // Sound is only a bonus.
    }
  }

  // ---------- the stage ----------
  class Stage {
    constructor(canvas, step) {
      this.canvas = canvas;
      this.context = canvas.getContext("2d");
      this.params = step.params;
      this.palette = PALETTE;
      this.sparks = [];
      this.clickHandlers = [];
      this.moveHandlers = [];
      this.keyHandlers = [];
      this.top = 76; // room for the lesson's top bar
      this.resize = this.resize.bind(this);
      this.onPointer = this.onPointer.bind(this);
      this.onKey = this.onKey.bind(this);
      addEventListener("resize", this.resize);
      canvas.addEventListener("pointerdown", this.onPointer);
      this.onMove = this.onMove.bind(this);
      canvas.addEventListener("pointermove", this.onMove);
      addEventListener("keydown", this.onKey);
      this.resize();
    }

    get width() { return innerWidth; }
    get height() { return innerHeight; }

    resize() {
      const ratio = devicePixelRatio || 1;
      this.canvas.width = Math.round(innerWidth * ratio);
      this.canvas.height = Math.round(innerHeight * ratio);
      this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    close() {
      removeEventListener("resize", this.resize);
      this.canvas.removeEventListener("pointerdown", this.onPointer);
      this.canvas.removeEventListener("pointermove", this.onMove);
      removeEventListener("keydown", this.onKey);
      this.clear();
    }

    // Stops the game at the next frame, when the player quits mid-lesson.
    abort() {
      this.aborted = true;
    }

    onPointer(event) {
      const box = this.canvas.getBoundingClientRect();
      const x = event.clientX - box.left, y = event.clientY - box.top;
      this.clickHandlers.forEach((handler) => handler(x, y));
    }

    onKey(event) {
      this.keyHandlers.forEach((handler) => handler(event));
    }

    onClick(handler) { this.clickHandlers.push(handler); }
    onMouseMove(handler) { this.moveHandlers.push(handler); }

    onMove(event) {
      const box = this.canvas.getBoundingClientRect();
      this.moveHandlers.forEach((handler) => handler(event.clientX - box.left, event.clientY - box.top));
    }
    onKeyDown(handler) { this.keyHandlers.push(handler); }

    clear() {
      this.context.fillStyle = this.palette.background;
      this.context.fillRect(0, 0, innerWidth, innerHeight);
    }

    // Calls frame(dt) until it returns false. The clock pauses while the page is hidden,
    // and a mistake inside a frame rejects the promise instead of freezing the game.
    run(frame) {
      return new Promise((resolve, reject) => {
        let previous = performance.now();
        const tick = (now) => {
          if (this.aborted) {
            resolve();
            return;
          }
          let going;
          try {
            const dt = document.hidden ? 0 : Math.min(0.1, (now - previous) / 1000);
            previous = now;
            this.clear();
            going = frame(dt, now);
            this.drawSparks(dt);
          } catch (error) {
            reject(error);
            return;
          }
          if (going) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
    }

    circle(x, y, radius, rgb, alpha = 1) {
      const c = this.context;
      c.beginPath();
      c.arc(x, y, radius, 0, Math.PI * 2);
      c.fillStyle = css(rgb, alpha);
      c.fill();
    }

    ring(x, y, radius, rgb, width, alpha = 1, from = 0, to = Math.PI * 2) {
      const c = this.context;
      c.beginPath();
      c.arc(x, y, radius, from, to);
      c.strokeStyle = css(rgb, alpha);
      c.lineWidth = width;
      c.lineCap = "butt";
      c.stroke();
    }

    star(x, y, radius, rgb, alpha = 1) {
      const c = this.context;
      c.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const r = i % 2 ? radius * 0.46 : radius;
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        c[i ? "lineTo" : "moveTo"](x + Math.cos(angle) * r, y + Math.sin(angle) * r);
      }
      c.closePath();
      c.fillStyle = css(rgb, alpha);
      c.fill();
    }

    text(words, x, y, { size = 18, rgb = this.palette.hud, align = "left", weight = 700, alpha = 1 } = {}) {
      const c = this.context;
      c.font = `${weight} ${size}px ui-rounded, "Segoe UI", system-ui, sans-serif`;
      c.textAlign = align;
      c.fillStyle = css(rgb, alpha);
      c.fillText(words, x, y);
    }

    hud(lines) {
      lines.forEach((line, i) => this.text(line, 28, this.top + 26 + i * 28, { size: 20, alpha: 0.85 }));
    }

    burst(x, y, rgb = this.palette.target) {
      for (let i = 0; i < 12; i += 1) {
        const angle = (i / 12) * Math.PI * 2;
        this.sparks.push({ x, y, vx: Math.cos(angle) * 180, vy: Math.sin(angle) * 180, life: 0.45, rgb });
      }
    }

    drawSparks(dt) {
      this.sparks = this.sparks.filter((spark) => spark.life > 0);
      this.sparks.forEach((spark) => {
        spark.life -= dt;
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        this.circle(spark.x, spark.y, 4, spark.rgb, Math.max(0, spark.life * 2));
      });
    }

    // A random spot inside the play area, at least `away` pixels from `from` if given.
    spot(margin, from = null, away = 0) {
      let best = null;
      for (let i = 0; i < 20; i += 1) {
        const p = [random(margin, innerWidth - margin), random(this.top + margin, innerHeight - margin)];
        if (!from || Math.hypot(p[0] - from[0], p[1] - from[1]) >= away) return p;
        best = p;
      }
      return best;
    }
  }

  // ---------- Firefly Catch ----------
  // A drifting firefly and a few moths. Clicking the firefly catches it; clicking a moth
  // counts against you. The firefly speeds up a little with every catch.
  function wanderer(stage, speed) {
    const [x, y] = stage.spot(60);
    const angle = random(0, Math.PI * 2);
    return { x, y, angle, speed, turn: random(-1, 1) };
  }

  function wander(stage, thing, dt) {
    thing.turn += random(-2.5, 2.5) * dt;
    thing.turn = Math.max(-1.6, Math.min(1.6, thing.turn));
    thing.angle += thing.turn * dt;
    const pixels = thing.speed * innerHeight * dt;
    thing.x += Math.cos(thing.angle) * pixels;
    thing.y += Math.sin(thing.angle) * pixels;
    const margin = 50;
    if (thing.x < margin || thing.x > innerWidth - margin) {
      thing.angle = Math.PI - thing.angle;
      thing.x = Math.max(margin, Math.min(innerWidth - margin, thing.x));
    }
    if (thing.y < stage.top + margin || thing.y > innerHeight - margin) {
      thing.angle = -thing.angle;
      thing.y = Math.max(stage.top + margin, Math.min(innerHeight - margin, thing.y));
    }
  }

  function drawMoth(stage, moth, now, rgb) {
    const c = stage.context;
    const flap = 0.55 + 0.45 * Math.abs(Math.sin(now / 110 + moth.angle * 3));
    c.save();
    c.translate(moth.x, moth.y);
    c.fillStyle = css(rgb, 0.85);
    for (const side of [-1, 1]) {
      c.beginPath(); // upper and lower wing on each side
      c.ellipse(side * 11 * flap, -4, 12 * flap, 8, side * 0.5, 0, Math.PI * 2);
      c.ellipse(side * 8 * flap, 7, 8 * flap, 6, side * -0.4, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = css(shade(rgb, 0.7));
    c.beginPath();
    c.ellipse(0, 1, 3.5, 11, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  async function firefly(stage) {
    const { seconds, speed, moths: mothCount } = stage.params;
    const p = stage.palette;
    const HIT = 44, MOTH_HIT = 30;
    let elapsed = 0, catches = 0, mothHits = 0, misses = 0, sinceCatch = 0;
    const times = [];
    const fly = wanderer(stage, speed);
    const moths = Array.from({ length: mothCount }, () => wanderer(stage, speed * 0.7));
    let flash = 0;

    stage.onClick((x, y) => {
      if (Math.hypot(x - fly.x, y - fly.y) <= HIT) {
        catches += 1;
        times.push(sinceCatch);
        sinceCatch = 0;
        stage.burst(fly.x, fly.y);
        chime(620 + (catches % 5) * 80);
        const [nx, ny] = stage.spot(60, [fly.x, fly.y], Math.min(innerWidth, innerHeight) * 0.35);
        Object.assign(fly, { x: nx, y: ny, angle: random(0, Math.PI * 2), speed: fly.speed * 1.04 });
      } else if (moths.some((m) => Math.hypot(x - m.x, y - m.y) <= MOTH_HIT)) {
        mothHits += 1;
        flash = 0.25;
        chime(260);
      } else {
        misses += 1;
      }
    });

    stage.debug = { fly, moths }; // lets automated tests aim
    await stage.run((dt, now) => {
      elapsed += dt;
      sinceCatch += dt;
      flash = Math.max(0, flash - dt);
      wander(stage, fly, dt);
      moths.forEach((m) => wander(stage, m, dt));
      moths.forEach((m) => drawMoth(stage, m, now, p.decoy));
      const glow = 0.25 + 0.15 * Math.sin(now / 160);
      stage.circle(fly.x, fly.y, 26, p.target, glow);
      stage.circle(fly.x, fly.y, 11, p.target);
      if (flash > 0) stage.text("That's a moth!", innerWidth / 2, stage.top + 40, { size: 24, align: "center", rgb: p.bad });
      stage.hud([`Fireflies: ${catches}`, `Time: ${Math.max(0, Math.ceil(seconds - elapsed))}s`]);
      return elapsed < seconds;
    });

    const par = seconds / 2.5; // about one catch every 2.5 seconds earns full marks
    const score = Math.max(0, Math.min(100, (100 * (catches - 0.5 * mothHits)) / par));
    return {
      score,
      metrics: { catches, moth_hits: mothHits, misses, per_minute: (catches * 60) / seconds, seconds_per_catch: median(times) },
    };
  }

  // ---------- Star Snap ----------
  // Stars appear all over the screen and fade. Click each one before it's gone.
  async function stars(stage) {
    const { seconds, life } = stage.params;
    const p = stage.palette;
    const RADIUS = 26, HIT = 46;
    let elapsed = 0, nextAt = 0.6, caught = 0, missed = 0;
    const live = [];
    const reactions = [];
    const twinkles = Array.from({ length: 40 }, () => [Math.random(), Math.random(), random(1, 2.5)]);

    stage.onClick((x, y) => {
      const hit = live
        .map((s) => ({ s, d: Math.hypot(x - s.x, y - s.y) }))
        .filter(({ d }) => d <= HIT)
        .sort((a, b) => a.d - b.d)[0];
      if (!hit) return;
      live.splice(live.indexOf(hit.s), 1);
      caught += 1;
      reactions.push(hit.s.age);
      stage.burst(hit.s.x, hit.s.y);
      chime(620 + (caught % 5) * 80);
    });

    stage.debug = { live };
    await stage.run((dt) => {
      elapsed += dt;
      // Background twinkles.
      twinkles.forEach(([tx, ty, r]) => stage.circle(tx * innerWidth, stage.top + ty * (innerHeight - stage.top), r, p.soft, 0.5));
      if (elapsed >= nextAt && elapsed < seconds - life) {
        const [x, y] = stage.spot(70, live.length ? [live.at(-1).x, live.at(-1).y] : null, 200);
        live.push({ x, y, age: 0 });
        nextAt = elapsed + life * random(0.45, 0.75);
      }
      for (const s of live.slice()) {
        s.age += dt;
        if (s.age >= life || elapsed >= seconds) {
          live.splice(live.indexOf(s), 1);
          missed += 1;
          continue;
        }
        const left = 1 - s.age / life;
        stage.ring(s.x, s.y, RADIUS + 12, p.frame, 3, 0.9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left);
        stage.star(s.x, s.y, RADIUS * (0.6 + 0.4 * left), p.target, 0.35 + 0.65 * left);
      }
      stage.hud([`Stars: ${caught}`, `Time: ${Math.max(0, Math.ceil(seconds - elapsed))}s`]);
      return elapsed < seconds;
    });

    const shown = caught + missed;
    return {
      score: shown ? (100 * caught) / shown : 0,
      metrics: { caught, missed, reaction_ms: median(reactions) * 1000 },
    };
  }

  // ---------- Odd One Out ----------
  // A crowd of look-alike letters, all the same except one, which you click. Each right
  // answer makes them smaller and packs them closer; a wrong one eases off.
  const TWINS = [
    { crowd: "d", odd: "b" }, { crowd: "b", odd: "d" }, { crowd: "q", odd: "p" }, { crowd: "p", odd: "q" },
    { crowd: "O", odd: "Q" }, { crowd: "C", odd: "G" }, { crowd: "E", odd: "F" }, { crowd: "M", odd: "N" },
    { crowd: "n", odd: "h" }, { crowd: "E", odd: "E", turn: Math.PI }, { crowd: "E", odd: "E", turn: Math.PI / 2 },
  ];

  function layout(stage, size, spacing) {
    const pitch = size * (1 + spacing);
    const areaW = innerWidth - 80, areaH = innerHeight - stage.top - 60;
    const cols = Math.max(4, Math.min(12, Math.floor((areaW * 0.75) / pitch)));
    const rows = Math.max(3, Math.min(8, Math.floor((areaH * 0.75) / pitch)));
    const x0 = innerWidth / 2 - ((cols - 1) * pitch) / 2;
    const y0 = stage.top + 20 + areaH / 2 - ((rows - 1) * pitch) / 2;
    const spots = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) spots.push([x0 + c * pitch, y0 + r * pitch]);
    }
    return spots;
  }

  function drawLetter(stage, letter, x, y, size, rgb, turn = 0) {
    const c = stage.context;
    c.save();
    c.translate(x, y);
    c.rotate(turn);
    c.font = `700 ${size}px Arial, "Helvetica Neue", sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = css(rgb);
    c.fillText(letter, 0, 0);
    c.restore();
  }

  async function odd(stage) {
    const { start, contrast, seconds } = stage.params;
    const p = stage.palette;
    let size = start, spacing = 0.8, round = 0, correct = 0, smallest = Infinity, roundTime = 0, elapsed = 0;
    let flash = 0, flashRight = true, lastTwin = null;
    const times = [];
    let board = null;
    const newBoard = () => {
      const choices = TWINS.filter((t) => t !== lastTwin);
      const twin = choices[Math.floor(Math.random() * choices.length)];
      lastTwin = twin;
      const spots = layout(stage, size, spacing);
      board = { spots, twin, odd: Math.floor(Math.random() * spots.length), size };
      roundTime = 0;
    };
    newBoard();

    stage.onClick((x, y) => {
      if (flash > 0 || elapsed >= seconds) return;
      const nearest = board.spots
        .map((s, i) => ({ i, d: Math.hypot(x - s[0], y - s[1]) }))
        .sort((a, b) => a.d - b.d)[0];
      if (!nearest || nearest.d > board.size * 0.8) return; // a click between letters
      const right = nearest.i === board.odd;
      round += 1;
      flash = 0.45;
      flashRight = right;
      if (right) {
        correct += 1;
        times.push(roundTime);
        smallest = Math.min(smallest, board.size);
        size = Math.max(11, size * 0.87);
        spacing = Math.max(0.15, spacing * 0.85);
        chime(740);
      } else {
        size = Math.min(70, size * 1.15);
        spacing = Math.min(1.1, spacing * 1.15);
        chime(300);
      }
    });

    stage.debug = { board: () => board };
    await stage.run((dt) => {
      roundTime += dt;
      elapsed += dt;
      if (flash > 0) {
        flash = Math.max(0, flash - dt);
        if (flash === 0 && elapsed < seconds) newBoard();
      }
      const ink = shade(p.target, 0.15 + 0.85 * contrast);
      const { twin } = board;
      board.spots.forEach(([x, y], i) => {
        if (i === board.odd) drawLetter(stage, twin.odd, x, y, board.size, ink, twin.turn || 0);
        else drawLetter(stage, twin.crowd, x, y, board.size, ink);
      });
      if (flash > 0) {
        const [x, y] = board.spots[board.odd];
        stage.ring(x, y, board.size * 0.85, flashRight ? p.good : p.bad, 3);
      }
      stage.hud([`Found: ${correct}`, `Time: ${Math.max(0, Math.ceil(seconds - elapsed))}s`]);
      return elapsed < seconds || flash > 0;
    });

    const metrics = { correct, rounds: round, contrast, seconds_per_find: median(times) };
    if (correct > 0) metrics.smallest_letter = smallest;
    // About 10 finds in 30 seconds earns full marks; wrong clicks count against you.
    return { score: Math.max(0, Math.min(100, 10 * correct - 5 * (round - correct))), metrics };
  }

  // ---------- Star Snap: Constellations ----------
  // Numbered stars; click them in order and a line joins them. Each finished constellation
  // brings a new one with one more star.
  async function constellation(stage) {
    const { seconds } = stage.params;
    const p = stage.palette;
    const HIT = 40;
    let elapsed = 0, correct = 0, mistakes = 0, finished = 0, count = 4, next = 0, flash = 0, flashAt = null;
    let sky = [];
    const newSky = () => {
      sky = [];
      for (let i = 0; i < count; i += 1) {
        let spot = null;
        for (let tries = 0; tries < 40 && !spot; tries += 1) {
          const candidate = stage.spot(80);
          if (sky.every((s) => Math.hypot(s.x - candidate[0], s.y - candidate[1]) > 150)) spot = candidate;
        }
        spot = spot || stage.spot(80);
        sky.push({ x: spot[0], y: spot[1] });
      }
      next = 0;
    };
    newSky();
    stage.onClick((x, y) => {
      const hit = sky.findIndex((s) => Math.hypot(x - s.x, y - s.y) <= HIT);
      if (hit < 0 || hit < next) return; // empty sky, or a star already lit
      if (hit === next) {
        correct += 1;
        next += 1;
        chime(560 + next * 60);
        if (next === sky.length) {
          finished += 1;
          sky.forEach((s) => stage.burst(s.x, s.y));
          count = Math.min(8, count + 1);
          setTimeout(newSky, 450);
          next = Infinity; // nothing to click until the new sky appears
        }
      } else {
        mistakes += 1;
        flash = 0.3;
        flashAt = sky[hit];
        chime(260);
      }
    });
    stage.debug = { target: () => (Number.isFinite(next) && next < sky.length ? sky[next] : null) };
    await stage.run((dt) => {
      elapsed += dt;
      flash = Math.max(0, flash - dt);
      for (let i = 1; i < Math.min(next, sky.length); i += 1) {
        const c = stage.context;
        c.beginPath();
        c.moveTo(sky[i - 1].x, sky[i - 1].y);
        c.lineTo(sky[i].x, sky[i].y);
        c.strokeStyle = css(p.frame, 0.9);
        c.lineWidth = 3;
        c.stroke();
      }
      sky.forEach((s, i) => {
        const lit = i < next;
        stage.star(s.x, s.y, lit ? 22 : 18, p.target, lit ? 1 : 0.55);
        stage.text(String(i + 1), s.x, s.y + 40, { size: 17, align: "center", rgb: p.target, alpha: lit ? 0.5 : 1 });
      });
      if (flash > 0 && flashAt) stage.ring(flashAt.x, flashAt.y, 30, p.bad, 3);
      stage.hud([`Stars joined: ${correct}`, `Time: ${Math.max(0, Math.ceil(seconds - elapsed))}s`]);
      return elapsed < seconds;
    });
    const par = 20; // about 20 stars joined in 30 seconds earns full marks
    return {
      score: Math.max(0, Math.min(100, (100 * correct) / par - 4 * mistakes)),
      metrics: { joined: correct, mistakes, constellations: finished },
    };
  }

  // ---------- Star Snap: Shooting Stars ----------
  // Stars streak across the sky from the edges. Click them before they leave.
  async function shooting(stage) {
    const { seconds, life } = stage.params;
    const p = stage.palette;
    const HIT = 44;
    let elapsed = 0, nextAt = 0.5, caught = 0, missed = 0;
    const live = [];
    const twinkles = Array.from({ length: 40 }, () => [Math.random(), Math.random(), random(1, 2.5)]);
    const launch = () => {
      // Enter from one side, heading across the screen at a slight angle.
      const fromLeft = Math.random() < 0.5;
      const y = random(stage.top + 60, innerHeight - 60);
      const speed = (innerWidth / (life * 2.2)) * random(0.85, 1.15);
      const angle = random(-0.35, 0.35);
      live.push({
        x: fromLeft ? -20 : innerWidth + 20, y,
        vx: (fromLeft ? 1 : -1) * Math.cos(angle) * speed, vy: Math.sin(angle) * speed, trail: [],
      });
    };
    stage.onClick((x, y) => {
      const hit = live.find((s) => Math.hypot(x - s.x, y - s.y) <= HIT);
      if (!hit) return;
      live.splice(live.indexOf(hit), 1);
      caught += 1;
      stage.burst(hit.x, hit.y);
      chime(620 + (caught % 5) * 80);
    });
    stage.debug = { live };
    await stage.run((dt) => {
      elapsed += dt;
      twinkles.forEach(([tx, ty, r]) => stage.circle(tx * innerWidth, stage.top + ty * (innerHeight - stage.top), r, p.soft, 0.5));
      if (elapsed >= nextAt && elapsed < seconds - life) {
        launch();
        nextAt = elapsed + life * random(0.5, 0.8);
      }
      for (const s of live.slice()) {
        s.trail.unshift([s.x, s.y]);
        s.trail.length = Math.min(s.trail.length, 12);
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        const gone = s.x < -40 || s.x > innerWidth + 40 || s.y < stage.top - 40 || s.y > innerHeight + 40;
        if (gone || elapsed >= seconds) {
          live.splice(live.indexOf(s), 1);
          if (gone) missed += 1;
          continue;
        }
        s.trail.forEach(([tx, ty], i) => stage.circle(tx, ty, 7 * (1 - i / 12), p.target, 0.35 * (1 - i / 12)));
        stage.star(s.x, s.y, 20, p.target);
      }
      stage.hud([`Shooting stars: ${caught}`, `Time: ${Math.max(0, Math.ceil(seconds - elapsed))}s`]);
      return elapsed < seconds;
    });
    const shown = caught + missed;
    return { score: shown ? (100 * caught) / shown : 0, metrics: { caught, missed } };
  }

  // Star Snap comes in three versions; the lesson picks one each time.
  function starsAnyVersion(stage) {
    const version = { constellation, shooting }[stage.params.variant] || stars;
    return version(stage);
  }

  // ---------- Shape Hunt ----------
  // A target shape at the top. Click every matching shape in the crowd below. Each round
  // adds more shapes, makes them smaller, and later mixes in look-alikes.
  const SHAPES = ["circle", "square", "triangle", "diamond", "star", "cross", "hexagon", "ring"];
  const LOOKALIKES = {
    circle: ["hexagon", "ring"], hexagon: ["circle", "ring"], ring: ["circle", "hexagon"],
    square: ["diamond", "hexagon"], diamond: ["square", "triangle"], triangle: ["diamond", "star"],
    star: ["cross", "triangle"], cross: ["star", "square"],
  };

  function drawShape(stage, kind, x, y, size, rgb, alpha = 1, tilt = 0) {
    const c = stage.context;
    const r = size / 2;
    c.save();
    c.translate(x, y);
    c.rotate(tilt);
    c.fillStyle = css(rgb, alpha);
    c.strokeStyle = css(rgb, alpha);
    c.beginPath();
    const polygon = (sides, start) => {
      for (let i = 0; i < sides; i += 1) {
        const a = start + (i * Math.PI * 2) / sides;
        c[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath();
    };
    switch (kind) {
      case "circle": c.arc(0, 0, r, 0, Math.PI * 2); c.fill(); break;
      case "ring": c.lineWidth = size / 6; c.arc(0, 0, r - size / 12, 0, Math.PI * 2); c.stroke(); break;
      case "square": c.rect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7); c.fill(); break;
      case "diamond": polygon(4, -Math.PI / 2); c.fill(); break;
      case "triangle": polygon(3, -Math.PI / 2); c.fill(); break;
      case "hexagon": polygon(6, 0); c.fill(); break;
      case "cross": {
        const w = size / 3.2;
        c.rect(-w / 2, -r, w, size);
        c.rect(-r, -w / 2, size, w);
        c.fill();
        break;
      }
      default: { // star
        for (let i = 0; i < 10; i += 1) {
          const rr = i % 2 ? r * 0.45 : r;
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          c[i ? "lineTo" : "moveTo"](Math.cos(a) * rr, Math.sin(a) * rr);
        }
        c.closePath();
        c.fill();
      }
    }
    c.restore();
  }

  async function hunt(stage) {
    const { seconds, crowd, size: startSize, contrast } = stage.params;
    const p = stage.palette;
    let elapsed = 0, found = 0, mistakes = 0, round = 0, roundTime = 0, flash = 0, flashAt = null;
    const times = [];
    let board = null;
    const newRound = () => {
      const size = Math.max(18, startSize * 0.92 ** round);
      const target = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const matches = 2 + Math.floor(Math.random() * (3 + Math.min(2, round))); // 2 to 4 at first, up to 6 later
      const others = crowd + round * 4;
      // From the third round, most of the crowd are shapes that look like the target.
      const pool = round >= 2 ? LOOKALIKES[target].concat(SHAPES.filter((s) => s !== target)) : SHAPES.filter((s) => s !== target);
      const kinds = [...Array(matches).fill(target), ...Array.from({ length: others }, (_, i) =>
        round >= 2 && i % 3 !== 2 ? LOOKALIKES[target][i % 2] : pool[Math.floor(Math.random() * pool.length)])];
      const top = stage.top + 110; // leave room for the target box
      const placed = [];
      for (const kind of kinds) {
        for (let tries = 0; tries < 60; tries += 1) {
          const x = random(50, innerWidth - 50), y = random(top + size, innerHeight - 40);
          if (placed.every((s) => Math.hypot(s.x - x, s.y - y) > size * 1.35)) {
            placed.push({ kind, x, y, tilt: random(-0.15, 0.15), found: false });
            break;
          }
        }
      }
      board = { target, size, shapes: placed, left: placed.filter((s) => s.kind === target).length };
      roundTime = 0;
    };
    newRound();
    stage.onClick((x, y) => {
      if (!board) return;
      const hit = board.shapes
        .map((s) => ({ s, d: Math.hypot(x - s.x, y - s.y) }))
        .filter(({ d }) => d <= board.size * 0.75)
        .sort((a, b) => a.d - b.d)[0];
      if (!hit || hit.s.found) return;
      if (hit.s.kind === board.target) {
        hit.s.found = true;
        found += 1;
        board.left -= 1;
        times.push(roundTime);
        stage.burst(hit.s.x, hit.s.y);
        chime(700);
        if (board.left === 0) {
          round += 1;
          chime(880);
          board = null;
          setTimeout(newRound, 400);
        }
      } else {
        mistakes += 1;
        flash = 0.3;
        flashAt = hit.s;
        chime(260);
      }
    });
    stage.debug = { board: () => board };
    await stage.run((dt) => {
      elapsed += dt;
      roundTime += dt;
      flash = Math.max(0, flash - dt);
      if (board) {
        const ink = shade(p.target, 0.15 + 0.85 * contrast);
        // The box showing which shape to find.
        const bx = innerWidth / 2;
        stage.context.strokeStyle = css(p.hud, 0.6);
        stage.context.lineWidth = 2;
        stage.context.strokeRect(bx - 170, stage.top + 8, 340, 84);
        stage.text("Find all of these:", bx + 20, stage.top + 56, { size: 18, align: "right" });
        drawShape(stage, board.target, bx + 90, stage.top + 50, 46, ink);
        board.shapes.forEach((s) => {
          drawShape(stage, s.kind, s.x, s.y, board.size, ink, s.found ? 0.25 : 1, s.tilt);
          if (s.found) stage.ring(s.x, s.y, board.size * 0.7, p.good, 3);
        });
        if (flash > 0 && flashAt) stage.ring(flashAt.x, flashAt.y, board.size * 0.75, p.bad, 3);
        stage.hud([`Found: ${found}`, `Time: ${Math.max(0, Math.ceil(seconds - elapsed))}s`]);
      }
      return elapsed < seconds;
    });
    const par = 14; // about 14 finds in 30 seconds earns full marks
    return {
      score: Math.max(0, Math.min(100, (100 * found) / par - 4 * mistakes)),
      metrics: { found, mistakes, rounds: round, seconds_per_find: median(times) },
    };
  }

  // ---------- Side Glance ----------
  // Keep your eyes on the dot in the middle. A letter flashes off to the side; type it.
  // Each right answer makes the letter smaller, farther out and quicker; a wrong one eases off.
  const LETTERS = "CDHKNORSVZ"; // the letters eye charts use, chosen to be equally hard to read

  async function glance(stage) {
    const { seconds, size: startSize, distance: startDistance, flash: startFlash, contrast } = stage.params;
    const p = stage.palette;
    const reach = () => Math.min(innerWidth / 2 - 60, (innerHeight - stage.top) / 2 - 40);
    let elapsed = 0, correct = 0, answered = 0;
    let size = startSize, distance = startDistance, flashMs = startFlash;
    let farthest = 0, smallest = Infinity, quickest = Infinity;
    let phase = "wait", timer = random(0.8, 1.3), letter = "", at = [0, 0], feedback = null;
    const centre = () => [innerWidth / 2, (innerHeight + stage.top) / 2 - 30];

    const show = () => {
      letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
      const angle = random(0, Math.PI * 2);
      const r = Math.min(reach(), distance * Math.min(innerWidth, innerHeight));
      const [cx, cy] = centre();
      at = [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r * 0.8];
      phase = "flash";
      timer = flashMs / 1000;
    };

    const answer = (choice) => {
      if (phase !== "answer" && phase !== "flash") return;
      if (elapsed >= seconds) return;
      const right = choice === letter;
      answered += 1;
      if (right) {
        correct += 1;
        const [cx, cy] = centre();
        farthest = Math.max(farthest, Math.hypot(at[0] - cx, at[1] - cy));
        smallest = Math.min(smallest, size);
        quickest = Math.min(quickest, flashMs);
        size = Math.max(14, size * 0.9);
        distance = Math.min(0.45, distance * 1.1);
        flashMs = Math.max(120, flashMs * 0.9);
        chime(740);
      } else {
        size = Math.min(90, size * 1.15);
        distance = Math.max(0.12, distance * 0.9);
        flashMs = Math.min(600, flashMs * 1.15);
        chime(300);
      }
      feedback = { right, letter, at };
      phase = "feedback";
      timer = 0.7;
    };

    const buttons = () => {
      const w = 44, gap = 8, total = LETTERS.length * (w + gap) - gap;
      const x0 = innerWidth / 2 - total / 2, y = innerHeight - 72;
      return [...LETTERS].map((l, i) => ({ l, x: x0 + i * (w + gap), y, w }));
    };
    stage.onKeyDown((event) => {
      const key = event.key.toUpperCase();
      if (key.length === 1 && LETTERS.includes(key)) {
        event.preventDefault();
        answer(key);
      }
    });
    stage.onClick((x, y) => {
      const b = buttons().find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.w);
      if (b) answer(b.l);
    });

    stage.debug = { letter: () => (phase === "flash" || phase === "answer" ? letter : null), at: () => at };
    await stage.run((dt) => {
      elapsed += dt;
      const [cx, cy] = centre();
      // The dot to keep your eyes on.
      stage.ring(cx, cy, 14, p.hud, 3, 0.8);
      stage.circle(cx, cy, 4, p.hud);
      timer -= dt;
      if (phase === "wait" && timer <= 0) show();
      else if (phase === "flash") {
        if (timer > 0) {
          stage.text(letter, at[0], at[1] + size * 0.36, {
            size, align: "center", weight: 800, rgb: shade(p.target, 0.15 + 0.85 * contrast),
          });
        } else {
          phase = "answer";
        }
      } else if (phase === "answer") {
        stage.text("Which letter was it?", cx, cy + 60, { size: 20, align: "center", alpha: 0.85 });
      } else if (phase === "feedback") {
        stage.text(feedback.right ? "Yes!" : `It was ${feedback.letter}`, cx, cy + 60, {
          size: 22, align: "center", rgb: feedback.right ? p.good : p.bad,
        });
        if (timer <= 0) {
          phase = "wait";
          timer = random(0.7, 1.3);
        }
      }
      buttons().forEach((b) => {
        stage.context.strokeStyle = css(p.hud, 0.45);
        stage.context.lineWidth = 2;
        stage.context.strokeRect(b.x, b.y, b.w, b.w);
        stage.text(b.l, b.x + b.w / 2, b.y + b.w / 2 + 8, { size: 22, align: "center", alpha: 0.85 });
      });
      stage.hud([`Letters: ${correct}`, `Time: ${Math.max(0, Math.ceil(seconds - elapsed))}s`]);
      return elapsed < seconds || phase === "feedback";
    });

    const metrics = { correct, answered, contrast };
    // reach is the farthest distance as a share of the screen, so it compares across screens.
    if (correct > 0) Object.assign(metrics, { farthest, reach: farthest / Math.min(innerWidth, innerHeight), smallest, quickest_ms: quickest });
    // The steps settle near 70-80% right by design, so 80% earns full marks.
    return { score: Math.min(100, ((100 * correct) / Math.max(6, answered)) / 0.8), metrics };
  }

  // ---------- Spot the Difference ----------
  // Two pictures made of shapes, side by side. A few things differ on the right: a shape
  // is missing, swapped for another, or a different size. Click each difference.
  async function diff(stage) {
    const { seconds, items: startItems, diffs: startDiffs, contrast } = stage.params;
    const p = stage.palette;
    let elapsed = 0, found = 0, mistakes = 0, pictures = 0, flash = 0, flashAt = null;
    let picture = null;
    const panels = () => {
      const gap = 30, top = stage.top + 74, height = innerHeight - top - 26; // below the score text
      const width = (innerWidth - 3 * gap) / 2;
      return [{ x: gap, y: top, w: width, h: height }, { x: 2 * gap + width, y: top, w: width, h: height }];
    };
    const newPicture = () => {
      const count = startItems + pictures * 2;
      const changes = Math.min(5, startDiffs + Math.floor(pictures / 2));
      const size = Math.max(22, 50 - pictures * 4);
      const items = [];
      for (let i = 0; i < count; i += 1) {
        for (let tries = 0; tries < 60; tries += 1) {
          // Positions are fractions of a panel, so both pictures match exactly.
          const u = random(0.08, 0.92), v = random(0.1, 0.9);
          if (items.every((it) => Math.hypot((it.u - u) * 500, (it.v - v) * 400) > size * 1.5)) {
            items.push({ u, v, kind: SHAPES[Math.floor(Math.random() * SHAPES.length)], scale: 1, tilt: random(-0.2, 0.2) });
            break;
          }
        }
      }
      const picks = shuffle(items.map((_, i) => i)).slice(0, changes);
      const right = items.map((it) => ({ ...it }));
      picks.forEach((i, n) => {
        const kind = ["missing", "swapped", "size"][Math.floor(Math.random() * 3)];
        if (kind === "missing") right[i].hidden = true;
        if (kind === "swapped") right[i].kind = LOOKALIKES[items[i].kind][Math.floor(Math.random() * 2)];
        if (kind === "size") right[i].scale = Math.random() < 0.5 ? 0.6 : 1.45;
      });
      picture = { items, right, size, differences: new Set(picks), found: new Set() };
    };
    newPicture();

    stage.onClick((x, y) => {
      if (!picture) return;
      const panel = panels().find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
      if (!panel) return;
      const hit = picture.items
        .map((it, i) => ({ i, d: Math.hypot(x - (panel.x + it.u * panel.w), y - (panel.y + it.v * panel.h)) }))
        .filter(({ d }) => d <= picture.size * 0.9)
        .sort((a, b) => a.d - b.d)[0];
      if (!hit) return; // empty space is fine to click
      if (picture.differences.has(hit.i) && !picture.found.has(hit.i)) {
        picture.found.add(hit.i);
        found += 1;
        chime(720);
        if (picture.found.size === picture.differences.size) {
          pictures += 1;
          chime(880);
          picture = null;
          setTimeout(newPicture, 500);
        }
      } else if (!picture.differences.has(hit.i)) {
        mistakes += 1;
        flash = 0.35;
        flashAt = { panel, it: picture.items[hit.i] };
        chime(260);
      }
    });

    stage.debug = { next: () => {
      if (!picture) return null;
      const i = [...picture.differences].find((d) => !picture.found.has(d));
      if (i === undefined) return null;
      const b = panels()[0];
      return [b.x + picture.items[i].u * b.w, b.y + picture.items[i].v * b.h];
    } };
    await stage.run((dt) => {
      elapsed += dt;
      flash = Math.max(0, flash - dt);
      const ink = shade(p.target, 0.15 + 0.85 * contrast);
      panels().forEach((b, side) => {
        stage.context.strokeStyle = css(p.frame, 0.9);
        stage.context.lineWidth = 2;
        stage.context.strokeRect(b.x, b.y, b.w, b.h);
        if (!picture) return;
        (side === 0 ? picture.items : picture.right).forEach((it, i) => {
          const x = b.x + it.u * b.w, y = b.y + it.v * b.h;
          if (!it.hidden) drawShape(stage, it.kind, x, y, picture.size * it.scale, ink, 1, it.tilt);
          if (picture.found.has(i)) stage.ring(x, y, picture.size * 0.85, p.good, 3);
        });
      });
      if (flash > 0 && flashAt) {
        const { panel, it } = flashAt;
        stage.ring(panel.x + it.u * panel.w, panel.y + it.v * panel.h, (picture ? picture.size : 30) * 0.85, p.bad, 3);
      }
      const left = picture ? picture.differences.size - picture.found.size : 0;
      stage.hud([`Differences left: ${left}`, `Time: ${Math.max(0, Math.ceil(seconds - elapsed))}s`]);
      return elapsed < seconds;
    });
    const par = 10; // about 10 differences in 30 seconds earns full marks
    return {
      score: Math.max(0, Math.min(100, (100 * found) / par - 4 * mistakes)),
      metrics: { found, mistakes, pictures },
    };
  }

  // ---------- Dot Count ----------
  // A cluster of dots flashes in the middle. Type how many there were (1 to 9).
  // Right answers bring more dots and shorter flashes; a wrong one eases off.
  async function count(stage) {
    const { seconds, flash: startFlash, dots: startDots, contrast } = stage.params;
    const p = stage.palette;
    let elapsed = 0, correct = 0, answered = 0, most = 0, quickest = Infinity;
    let level = startDots, flashMs = startFlash;
    let phase = "wait", timer = 0.8, dots = [], feedback = null;
    const centre = () => [innerWidth / 2, (innerHeight + stage.top) / 2 - 30];

    const show = () => {
      // The number shown varies around the current level, so you can't just guess it.
      const n = Math.max(1, Math.min(9, level + Math.floor(random(-2, 2.99))));
      const area = Math.min(innerWidth, innerHeight) * 0.22;
      const radius = 9;
      dots = [];
      while (dots.length < n) {
        const a = random(0, Math.PI * 2), r = Math.sqrt(Math.random()) * area;
        const d = [Math.cos(a) * r, Math.sin(a) * r];
        if (dots.every((o) => Math.hypot(o[0] - d[0], o[1] - d[1]) > radius * 3.2)) dots.push(d);
      }
      phase = "flash";
      timer = flashMs / 1000;
    };
    const answer = (n) => {
      if ((phase !== "answer" && phase !== "flash") || elapsed >= seconds) return;
      const right = n === dots.length;
      answered += 1;
      if (right) {
        correct += 1;
        most = Math.max(most, dots.length);
        quickest = Math.min(quickest, flashMs);
        level = Math.min(8, level + 1);
        flashMs = Math.max(150, flashMs * 0.88);
        chime(740);
      } else {
        level = Math.max(2, level - 1);
        flashMs = Math.min(1000, flashMs * 1.15);
        chime(300);
      }
      feedback = { right, real: dots.length };
      phase = "feedback";
      timer = 0.8;
    };
    const buttons = () => {
      const w = 48, gap = 8, total = 9 * (w + gap) - gap, x0 = innerWidth / 2 - total / 2, y = innerHeight - 76;
      return Array.from({ length: 9 }, (_, i) => ({ n: i + 1, x: x0 + i * (w + gap), y, w }));
    };
    stage.onKeyDown((event) => {
      const n = Number(event.key);
      if (Number.isInteger(n) && n >= 1 && n <= 9) {
        event.preventDefault();
        answer(n);
      }
    });
    stage.onClick((x, y) => {
      const b = buttons().find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.w);
      if (b) answer(b.n);
    });

    stage.debug = { count: () => (phase === "flash" || phase === "answer" ? dots.length : null), dots: () => dots };
    await stage.run((dt) => {
      elapsed += dt;
      timer -= dt;
      const [cx, cy] = centre();
      stage.ring(cx, cy, Math.min(innerWidth, innerHeight) * 0.22 + 26, p.frame, 2, 0.9);
      if (phase === "wait") {
        stage.circle(cx, cy, 4, p.hud);
        if (timer <= 0) show();
      } else if (phase === "flash") {
        if (timer > 0) dots.forEach(([dx, dy]) => stage.circle(cx + dx, cy + dy, 9, shade(p.target, 0.15 + 0.85 * contrast)));
        else phase = "answer";
      } else if (phase === "answer") {
        stage.text("How many dots?", cx, cy + 8, { size: 22, align: "center", alpha: 0.85 });
      } else if (phase === "feedback") {
        stage.text(feedback.right ? "Yes!" : `It was ${feedback.real}`, cx, cy + 8, {
          size: 24, align: "center", rgb: feedback.right ? p.good : p.bad,
        });
        if (timer <= 0) {
          phase = "wait";
          timer = random(0.5, 0.9);
        }
      }
      buttons().forEach((b) => {
        stage.context.strokeStyle = css(p.hud, 0.45);
        stage.context.lineWidth = 2;
        stage.context.strokeRect(b.x, b.y, b.w, b.w);
        stage.text(String(b.n), b.x + b.w / 2, b.y + b.w / 2 + 8, { size: 22, align: "center", alpha: 0.85 });
      });
      stage.hud([`Right: ${correct}`, `Time: ${Math.max(0, Math.ceil(seconds - elapsed))}s`]);
      return elapsed < seconds || phase === "feedback";
    });
    const metrics = { correct, answered, contrast };
    if (correct > 0) Object.assign(metrics, { most_dots: most, quickest_ms: quickest });
    return { score: Math.min(100, ((100 * correct) / Math.max(6, answered)) / 0.8), metrics };
  }

  // ---------- Line Tracer ----------
  // Follow a winding path with the mouse from the start circle to the finish without
  // slipping off. Each finished path is thinner and twistier.
  function makePath(stage, bends) {
    const left = 90, right = innerWidth - 90, top = stage.top + 70, bottom = innerHeight - 60;
    const anchors = [];
    for (let i = 0; i <= bends; i += 1) {
      anchors.push([left + ((right - left) * i) / bends, i === 0 || i === bends ? (top + bottom) / 2 : random(top, bottom)]);
    }
    // A smooth curve through the anchors (Catmull-Rom), sampled into many small steps.
    const points = [];
    for (let i = 0; i < anchors.length - 1; i += 1) {
      const p0 = anchors[Math.max(0, i - 1)], p1 = anchors[i], p2 = anchors[i + 1], p3 = anchors[Math.min(anchors.length - 1, i + 2)];
      for (let t = 0; t < 1; t += 1 / 40) {
        const t2 = t * t, t3 = t2 * t;
        const at = (k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
        points.push([at(0), at(1)]);
      }
    }
    points.push(anchors[anchors.length - 1]);
    return Math.random() < 0.5 ? points : points.reverse(); // start from the left or the right
  }

  async function trace(stage) {
    const { seconds, width: startWidth, contrast } = stage.params;
    const p = stage.palette;
    let elapsed = 0, done = 0, slips = 0, narrowest = Infinity;
    let width = startWidth, bends = 4;
    let path = makePath(stage, bends), progress = 0, tracing = false, onPath = true, pointer = null, slipFlash = 0;

    stage.onMouseMove((x, y) => {
      pointer = [x, y];
      const start = path[0];
      if (!tracing) {
        if (Math.hypot(x - start[0], y - start[1]) <= Math.max(26, width)) {
          tracing = true;
          onPath = true;
        }
        return;
      }
      // Look for the path near where you got to, so cutting across a bend doesn't count.
      let best = null;
      for (let i = Math.max(0, progress - 8); i < Math.min(path.length, progress + 30); i += 1) {
        const d = Math.hypot(x - path[i][0], y - path[i][1]);
        if (!best || d < best.d) best = { i, d };
      }
      const inside = best && best.d <= width / 2 + 4;
      if (inside) {
        if (!onPath && best.i >= progress - 8) onPath = true; // back on, near where you slipped
        if (onPath) progress = Math.max(progress, best.i);
      } else if (onPath) {
        onPath = false;
        slips += 1;
        slipFlash = 0.5;
        chime(260);
      }
      if (onPath && progress >= path.length - 2) {
        done += 1;
        narrowest = Math.min(narrowest, width);
        const end = path[path.length - 1];
        stage.burst(end[0], end[1]);
        chime(880);
        width = Math.max(14, width * 0.82);
        bends = Math.min(9, bends + 1);
        path = makePath(stage, bends);
        progress = 0;
        tracing = false;
      }
    });

    stage.debug = { path: () => path, progress: () => progress, tracing: () => tracing };
    await stage.run((dt) => {
      elapsed += dt;
      slipFlash = Math.max(0, slipFlash - dt);
      const c = stage.context;
      const ink = shade(p.target, 0.15 + 0.85 * contrast);
      const stroke = (from, to, rgb, w, alpha) => {
        c.beginPath();
        for (let i = from; i <= to; i += 1) c[i === from ? "moveTo" : "lineTo"](path[i][0], path[i][1]);
        c.strokeStyle = css(rgb, alpha);
        c.lineWidth = w;
        c.lineCap = "round";
        c.lineJoin = "round";
        c.stroke();
      };
      stroke(0, path.length - 1, ink, width, 0.35);
      stroke(0, path.length - 1, ink, 3, 0.9); // the centre line to follow
      if (progress > 0) stroke(0, progress, p.good, width * 0.6, 0.9);
      const start = path[0], end = path[path.length - 1];
      stage.circle(start[0], start[1], Math.max(18, width * 0.6), tracing ? p.good : p.target);
      stage.ring(end[0], end[1], Math.max(18, width * 0.6), p.target, 4);
      if (!tracing) {
        const fromLeft = start[0] < innerWidth / 2;
        stage.text("Put the mouse on the start circle", start[0] + (fromLeft ? 34 : -34), start[1] - 34, { size: 18, alpha: 0.9, align: fromLeft ? "left" : "right" });
      }
      else if (!onPath) {
        const back = path[progress];
        stage.ring(back[0], back[1], width * 0.7, p.bad, 3);
        stage.text("Slipped off! Go back to the red circle", innerWidth / 2, stage.top + 30, { size: 20, align: "center", rgb: p.bad });
      }
      if (pointer && tracing) stage.circle(pointer[0], pointer[1], 5, p.hud);
      stage.hud([`Paths: ${done}`, `Time: ${Math.max(0, Math.ceil(seconds - elapsed))}s`]);
      return elapsed < seconds;
    });

    const partial = path.length > 1 ? progress / (path.length - 1) : 0;
    const par = 3; // three paths in 30 seconds earns full marks
    const metrics = { paths: done, slips, contrast };
    if (done > 0) metrics.narrowest = narrowest;
    return { score: Math.max(0, Math.min(100, (100 * (done + partial)) / par - 3 * slips)), metrics };
  }

  window.Games = { Stage, chime, play: { firefly, stars: starsAnyVersion, odd, hunt, glance, diff, count, trace } };
})();
