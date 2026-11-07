// Eye Tracker: drawing helpers and sounds for the eye-controlled games.
// These match the Python Eye Trainer's screen_display.py, ui.py and sound_effects.py.
// Colours are written the Python way, as [Blue, Green, Red], so the numbers can be
// copied straight from the Python files.
(function (exports) {
  "use strict";

  const css = (c, alpha = 1) => (alpha >= 1 ? `rgb(${c[2]},${c[1]},${c[0]})` : `rgba(${c[2]},${c[1]},${c[0]},${alpha})`);
  const mix = (color, other, amount) => color.map((c, i) => Math.round(c * (1 - amount) + other[i] * amount));
  const lighter = (c) => c.map((v) => Math.min(255, Math.round(v * 1.15) + 25));
  const darker = (c) => c.map((v) => Math.round(v * 0.6));

  const BACKGROUND = [30, 30, 30];
  const TEXT_COLOR = [230, 230, 230];
  const WHITE = [255, 255, 255];
  const FONT = '"Segoe UI", ui-rounded, system-ui, -apple-system, sans-serif';

  // OpenCV's font at scale 1 is about as tall as a 30px web font.
  const fontFor = (scale, thickness) => `${thickness >= 4 ? 800 : thickness >= 3 ? 700 : thickness >= 2 ? 600 : 500} ${Math.round(30 * scale)}px ${FONT}`;

  // Text with its middle (top to bottom) at y. align: "left", "center" or "right".
  // outline: a dark band of that many pixels behind the letters, so they stay readable.
  function text(ctx, value, x, y, { scale = 1, color = WHITE, thickness = 2, align = "left", outline = 0, outlineColor = [20, 20, 20] } = {}) {
    ctx.font = fontFor(scale, thickness);
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    if (outline) {
      ctx.lineJoin = "round";
      ctx.lineWidth = outline;
      ctx.strokeStyle = css(outlineColor);
      ctx.strokeText(value, x, y);
    }
    ctx.fillStyle = css(color);
    ctx.fillText(value, x, y);
  }

  function textWidth(ctx, value, scale = 1, thickness = 2) {
    ctx.font = fontFor(scale, thickness);
    return ctx.measureText(value).width;
  }

  // Splits text into lines that fit a width.
  function wrap(ctx, value, width, scale = 1, thickness = 2) {
    const lines = [];
    for (const paragraph of String(value).split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word;
        if (line && textWidth(ctx, next, scale, thickness) > width) {
          lines.push(line);
          line = word;
        } else line = next;
      }
      lines.push(line);
    }
    return lines;
  }

  function roundedBox(ctx, x0, y0, x1, y1, radius, color, alpha = 1) {
    ctx.beginPath();
    ctx.roundRect(x0, y0, x1 - x0, y1 - y0, Math.max(0, Math.min(radius, (x1 - x0) / 2, (y1 - y0) / 2)));
    ctx.fillStyle = css(color, alpha);
    ctx.fill();
  }

  function circle(ctx, x, y, r, color, { fill = true, width = 2, alpha = 1 } = {}) {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    if (fill) {
      ctx.fillStyle = css(color, alpha);
      ctx.fill();
    } else {
      ctx.lineWidth = width;
      ctx.strokeStyle = css(color, alpha);
      ctx.stroke();
    }
  }

  function line(ctx, x0, y0, x1, y1, color, width = 2, cap = "round") {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineWidth = width;
    ctx.lineCap = cap;
    ctx.strokeStyle = css(color);
    ctx.stroke();
  }

  // A line with an arrow head; tip is the head's size as a share of the line's length.
  function arrow(ctx, x0, y0, x1, y1, color, width, tip = 0.35) {
    const length = Math.hypot(x1 - x0, y1 - y0);
    const angle = Math.atan2(y1 - y0, x1 - x0);
    const head = length * tip;
    line(ctx, x0, y0, x1, y1, color, width);
    for (const side of [-1, 1]) {
      const a = angle + Math.PI + side * (Math.PI / 4);
      line(ctx, x1, y1, x1 + head * Math.cos(a), y1 + head * Math.sin(a), color, width);
    }
  }

  // Fades from 1 at the edge to 0 further in, squared (bright at the edge, soft inside).
  function fadeStops(gradient, color, strength) {
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      gradient.addColorStop(t, css(color, 0.85 * strength * (1 - t) ** 2));
    }
    return gradient;
  }

  const EDGE_GLOW_SIZE = 0.12;
  // Makes one edge of the screen glow: "left", "right", "up" or "down".
  function edgeGlow(ctx, w, h, edge, color, strength = 1) {
    const depth = Math.min(w, h) * EDGE_GLOW_SIZE;
    const spec = {
      left: [0, 0, depth, 0, [0, 0, depth, h]],
      right: [w, 0, w - depth, 0, [w - depth, 0, depth, h]],
      up: [0, 0, 0, depth, [0, 0, w, depth]],
      down: [0, h, 0, h - depth, [0, h - depth, w, depth]],
    }[edge];
    const g = fadeStops(ctx.createLinearGradient(spec[0], spec[1], spec[2], spec[3]), color, strength);
    ctx.fillStyle = g;
    ctx.fillRect(...spec[4]);
  }

  // A soft round glow, strongest in the middle and gone at `radius`.
  function roundGlow(ctx, x, y, radius, color, strength = 1) {
    ctx.fillStyle = fadeStops(ctx.createRadialGradient(x, y, 0, x, y, radius), color, strength);
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  // Tints the whole screen with a colour (used for the red "caught" and "crash" flashes).
  function tint(ctx, w, h, color, strength) {
    ctx.fillStyle = css(color, strength);
    ctx.fillRect(0, 0, w, h);
  }

  // A rounded button with a white outline that lifts when the mouse is over it (ui.py).
  class Button {
    constructor(label, cx, cy, width, height, color, textScale = 1.3) {
      Object.assign(this, { label, cx, cy, halfW: width / 2, halfH: height / 2, color, textScale, enabled: true });
      this.radius = height * 0.42;
    }
    contains(x, y) {
      const dx = Math.abs(x - this.cx), dy = Math.abs(y - this.cy);
      if (dx > this.halfW || dy > this.halfH) return false;
      const cx = dx - (this.halfW - this.radius), cy = dy - (this.halfH - this.radius);
      return cx > 0 && cy > 0 ? cx * cx + cy * cy <= this.radius * this.radius : true;
    }
    isClicked(click) { return this.enabled && click !== null && this.contains(click[0], click[1]); }
    draw(ctx, mouse) {
      const base = this.enabled ? this.color : [100, 100, 100];
      const hovered = this.enabled && mouse && this.contains(mouse.x, mouse.y);
      const lift = hovered ? -3 : 0;
      const box = (offset, grow, color) => roundedBox(ctx, this.cx - this.halfW - grow, this.cy - this.halfH - grow + offset,
        this.cx + this.halfW + grow, this.cy + this.halfH + grow + offset, this.radius + grow, color);
      box(8, 3, darker(base));
      box(lift, 3, WHITE);
      box(lift, 0, hovered ? lighter(base) : base);
      text(ctx, this.label, this.cx, this.cy + lift, { scale: this.textScale, thickness: 3, align: "center" });
    }
  }

  // ---------- sounds (sound_effects.py) ----------
  // Each effect: notes in Hz played one after the other, overtones as [multiple, loudness],
  // seconds per note, seconds between notes, and how fast each note dies away.
  const EFFECTS = {
    correct: [[783.99, 1046.50, 1318.51], [[1, 1.0], [2, 0.3]], 0.35, 0.07, 9],
    wrong: [[233.08, 174.61], [[1, 1.0], [3, 0.4], [5, 0.2]], 0.30, 0.16, 6],
    coin: [[987.77, 1318.51], [[1, 1.0], [2, 0.25]], 0.18, 0.07, 14],
    warning: [[1318.51, 1318.51], [[1, 1.0], [2, 0.2]], 0.09, 0.13, 25],
    victory: [[523.25, 659.25, 783.99, 1046.50], [[1, 1.0], [2, 0.35], [3, 0.1]], 0.8, 0.13, 3.5],
  };
  const EFFECT_VOLUME = 0.45;
  const POP_LOUDNESS = 1.6;
  const MUSIC_VOLUME = 0.55;

  function makeEffect(rate, notes, overtones, noteSeconds, gapSeconds, decay) {
    const noteSamples = Math.round(rate * noteSeconds), gapSamples = Math.round(rate * gapSeconds);
    const out = new Float32Array(gapSamples * (notes.length - 1) + noteSamples);
    notes.forEach((pitch, n) => {
      for (let i = 0; i < noteSamples; i++) {
        const t = i / rate;
        const envelope = Math.min(t / 0.004, 1) * Math.exp(-t * decay);
        let tone = 0;
        for (const [multiple, loudness] of overtones) tone += loudness * Math.sin(2 * Math.PI * pitch * multiple * t);
        out[gapSamples * n + i] += tone * envelope;
      }
    });
    return normalise(out);
  }

  function makePop(rate) {
    const count = Math.round(rate * 0.15);
    let seed = 7;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647) * 2 - 1; };
    const noise = Array.from({ length: count }, random);
    const out = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const t = i / rate;
      let soft = 0;
      for (let k = -3; k < 3; k++) soft += noise[Math.min(count - 1, Math.max(0, i + k))] / 6;
      const thump = Math.sin(2 * Math.PI * (220 * t - 400 * t * t));
      out[i] = (0.8 * soft * Math.exp(-t * 60) + 0.6 * thump * Math.exp(-t * 30)) * Math.min(t / 0.001, 1);
    }
    return normalise(out);
  }

  function normalise(samples) {
    let peak = 0;
    for (const v of samples) peak = Math.max(peak, Math.abs(v));
    if (peak) for (let i = 0; i < samples.length; i++) samples[i] /= peak;
    return samples;
  }

  class Sounds {
    constructor(musicFolder = "music") {
      this.musicFolder = musicFolder;
      this.context = null;
      this.buffers = {};
      this.playing = new Set();
      this.music = null;
    }
    // Browsers only allow sound after a click or key press, so this is called then.
    unlock() {
      if (this.context) {
        if (this.context.state === "suspended") this.context.resume().catch(() => {});
        return;
      }
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      try {
        this.context = new Context();
        const rate = this.context.sampleRate;
        const toBuffer = (samples, loudness) => {
          const buffer = this.context.createBuffer(1, samples.length, rate);
          buffer.getChannelData(0).set(samples.map((v) => v * loudness));
          return buffer;
        };
        for (const [name, settings] of Object.entries(EFFECTS)) this.buffers[name] = toBuffer(makeEffect(rate, ...settings), EFFECT_VOLUME);
        this.buffers.pop = toBuffer(makePop(rate), Math.min(1, EFFECT_VOLUME * POP_LOUDNESS));
      } catch {
        this.context = null; // no sound on this computer: play silently
      }
    }
    // A one-off effect, optionally higher (pitch > 1) or lower.
    play(name, pitch = 1) {
      if (!this.context || !this.buffers[name]) return;
      const source = this.context.createBufferSource();
      source.buffer = this.buffers[name];
      source.playbackRate.value = pitch;
      source.connect(this.context.destination);
      source.onended = () => this.playing.delete(source);
      this.playing.add(source);
      source.start();
    }
    stop() {
      for (const source of this.playing) { try { source.stop(); } catch { /* already stopped */ } }
      this.playing.clear();
    }
    playMusic(name) {
      this.stopMusic();
      if (!name) return;
      const audio = new Audio(`${this.musicFolder}/${name}.mp3`);
      audio.loop = true;
      audio.volume = MUSIC_VOLUME;
      audio.play().catch(() => {}); // a missing file or a blocked autoplay just means no music
      this.music = audio;
    }
    stopMusic() {
      if (this.music) {
        this.music.pause();
        this.music.removeAttribute("src");
        this.music.load();
        this.music = null;
      }
    }
    close() {
      this.stop();
      this.stopMusic();
    }
  }

  Object.assign(exports, {
    css, mix, lighter, darker, BACKGROUND, TEXT_COLOR, WHITE,
    text, textWidth, wrap, roundedBox, circle, line, arrow, edgeGlow, roundGlow, tint, Button, Sounds,
  });
})(window.TrackerDraw = {});
