// EyeQuest: the screens. Each screen is a function that returns HTML, and the
// address after # picks the screen (#/menu, #/learn, #/lesson/u1l1, #/tracker and so on).
// Two versions share one player profile: the Arcade (mouse and keyboard) and the
// Eye Tracker (played with your eyes through the webcam).
(function () {
  "use strict";

  const store = Store.makeStore(window.localStorage);
  const app = document.getElementById("app");
  const today = () => Rules.dayString(new Date());

  // ---------- small helpers ----------
  const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const go = (route) => { location.hash = `#/${route}`; };
  const $ = (selector) => app.querySelector(selector);
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  const icons = {
    mascot(size = 72, patch = false) {
      return `<svg class="blink-mascot" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="Blink, the EyeQuest mascot">
        <path d="M50 6c6 0 9 5 8 10-3-2-6-3-8-3s-5 1-8 3c-1-5 2-10 8-10z" fill="#ff6b5e"/>
        <circle cx="50" cy="54" r="40" fill="#5b4bdb"/><circle cx="50" cy="50" r="28" fill="#fff"/>
        <circle cx="50" cy="50" r="15" fill="#ffb627"/><circle cx="50" cy="50" r="8" fill="#2c2a4a"/><circle cx="54" cy="46" r="3" fill="#fff"/>
        ${patch ? '<path d="M14 30 86 72" stroke="#2c2a4a" stroke-width="4"/><circle cx="50" cy="50" r="29" fill="#2c2a4a"/>' : ""}
        <path d="M40 87q10 7 20 0" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>`;
    },
    flame: () => '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13 2c1 4-1 6-3 8-1-1-1-3-1-4-3 2-5 6-5 9a8 8 0 0 0 16 0c0-5-4-9-7-13z"/></svg>',
    star: (cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="m12 3 2.7 5.8 6.3.8-4.6 4.3 1.2 6.3-5.6-3.1-5.6 3.1 1.2-6.3L3 9.6l6.3-.8z"/></svg>`,
    lock: () => '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3z"/></svg>',
    play: () => '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>',
    check: () => '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" d="m5 13 4.5 4.5L19 7"/></svg>',
  };

  function streakNow(profile) {
    return Rules.currentStreak(profile.streak, profile.lastActive, profile.freezes, today());
  }

  function todayStats(profile) {
    const done = profile.sessions.filter((s) => s.day === today());
    return { lessons: done.length, xp: done.reduce((sum, s) => sum + s.xp, 0) };
  }

  function header(profile, on) {
    const streak = streakNow(profile);
    const link = (route, label) => `<a href="#/${route}" class="${on === route ? "on" : ""}">${label}</a>`;
    return `<header class="topbar">
      <a class="logo" href="#/menu">${icons.mascot(32)}<span>EyeQuest</span></a>
      <nav class="nav">${link("menu", "Menu")}${link("learn", "Learn")}${link("sky", "Sky")}${link("progress", "Progress")}${link("settings", "Settings")}</nav>
      <span class="chip ${streak ? "" : "zero"}" style="${streak ? "color: var(--coral)" : ""}" title="Day streak">${icons.flame()}${streak}</span>
      <span class="chip" title="Total XP">${profile.xp} XP</span>
      ${profile.guest
        ? `<a class="btn small" href="#/settings?keep">Keep progress</a>`
        : `<span class="who" title="Player">${escape(profile.name)}</span>`}
      <button class="btn link small" data-action="switch">${profile.guest ? "Leave" : "Switch player"}</button>
    </header>`;
  }

  function switchPlayer() {
    const profile = store.current();
    if (profile && profile.guest) {
      const ok = confirm("Leave guest mode? Your guest progress will be deleted. To keep it, choose Keep progress first.");
      if (!ok) return;
      store.remove(profile.id);
    } else {
      store.signOut();
    }
    go("");
  }

  const storageWarning = () => (store.isSaving() ? "" : `<div class="flash" role="alert">This browser isn't letting EyeQuest save, so progress will be lost when you close the page. Private windows often do this.</div>`);

  // ---------- welcome and players ----------
  function welcomeView() {
    const profiles = store.profiles().filter((p) => !p.guest);
    const players = profiles.length
      ? `<p class="or">Who's playing?</p><div class="players">${profiles.map((p) => `
          <button class="player" data-pick="${p.id}"><span class="avatar">${escape(p.name.slice(0, 1).toUpperCase())}</span>
          <span>${escape(p.name)}<small>${p.xp} XP · level ${Rules.levelFor(p.xp)}</small></span></button>`).join("")}</div>`
      : "";
    return `<main>
      <section class="hero">
        ${icons.mascot(130)}
        <h1>A few minutes a day for your lazy eye</h1>
        <p class="muted">Two ways to play: short games with your mouse and keyboard, or games you control with your eyes through your webcam. Keep your streak going and watch your progress build.</p>
        ${storageWarning()}
        ${players}
        <div class="actions">
          <a class="btn" href="#/new">${profiles.length ? "New player" : "Get started"}</a>
          <button class="btn link" data-action="guest">Play as a guest</button>
        </div>
      </section>
      <section class="pillars">
        <div class="card"><h2>Short daily lessons</h2><p>Two to four minutes on a path that gets harder as you go.</p></div>
        <div class="card"><h2>Two versions</h2><p>The Arcade needs just a mouse and keyboard. The Eye Tracker follows your eyes with your webcam.</p></div>
        <div class="card"><h2>Private by design</h2><p>Everything stays in this browser on this computer.</p></div>
      </section>
      <p class="notice"><strong>EyeQuest supports your eye care, but doesn't replace it.</strong> It isn't a medical device and can't diagnose or treat amblyopia. See an eye doctor, and keep following any patching or glasses plan you've been given. Stop if you get a headache, eye pain or double vision.</p>
    </main>`;
  }

  function welcomeAfter() {
    app.querySelectorAll("[data-pick]").forEach((button) => button.addEventListener("click", () => {
      store.select(button.dataset.pick);
      go(store.current().onboarded ? "menu" : "setup");
    }));
    const guest = app.querySelector('[data-action="guest"]');
    guest.addEventListener("click", () => {
      store.create("Guest", true);
      go("setup");
    });
  }

  function newView(problem = "", name = "") {
    return `<main class="narrow">
      <div style="display:grid;justify-items:center;margin-bottom:12px">${icons.mascot(84)}</div>
      <h1 style="text-align:center">What's your name?</h1>
      ${problem ? `<div class="flash" role="alert">${escape(problem)}</div>` : ""}
      <form class="card" id="new-form">
        <label class="field">Player name<input type="text" name="name" value="${escape(name)}" maxlength="24" autocomplete="off" required autofocus></label>
        <p class="muted small">This is just a name for your progress on this computer. There's no password.</p>
        <button class="btn wide">Continue</button>
      </form>
      <p style="text-align:center;margin-top:18px"><a href="#/">Back</a></p>
    </main>`;
  }

  function nameProblem(name, exceptId = null) {
    if (!name) return "Please type a name.";
    if (name.length > 24) return "Names can be up to 24 characters.";
    if (store.nameTaken(name, exceptId)) return "There's already a player with that name.";
    return "";
  }

  function newAfter() {
    $("#new-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const name = new FormData(event.target).get("name").trim();
      const problem = nameProblem(name);
      if (problem) {
        render(newView(problem, name), newAfter);
        return;
      }
      store.create(name);
      go("setup");
    });
  }

  // ---------- preferences (setup and settings share these) ----------
  function preferencesFields(profile) {
    const radio = (name, value, label, checked, extra = "") =>
      `<label class="choice"><input type="radio" name="${name}" value="${value}" ${checked ? "checked" : ""}><span>${label}${extra}</span></label>`;
    return `
      <fieldset>
        <legend>Which eye is your lazy eye?</legend>
        <div class="choices row">
          ${radio("weakEye", "left", "Left eye", profile.weakEye === "left")}
          ${radio("weakEye", "right", "Right eye", profile.weakEye === "right")}
          ${radio("weakEye", "unknown", "Not sure", profile.weakEye === "unknown")}
        </div>
        <p class="muted small" style="margin-top:8px">Go with your eye doctor's answer. If you're not sure, your eyes take turns by day until you find out.</p>
      </fieldset>
      <fieldset>
        <legend>Daily goal</legend>
        <div class="choices row">
          ${Object.entries(Rules.GOAL_OPTIONS).map(([xp, name]) => radio("goalXp", xp, name, profile.goalXp === Number(xp), `<small>${xp} XP a day</small>`)).join("")}
        </div>
      </fieldset>`;
  }

  function readPreferences(form, profile) {
    const values = new FormData(form);
    const weak = values.get("weakEye");
    profile.weakEye = ["left", "right"].includes(weak) ? weak : "unknown";
    const goal = Number(values.get("goalXp"));
    profile.goalXp = goal in Rules.GOAL_OPTIONS ? goal : 20;
  }

  function setupView(profile) {
    return `<main class="narrow">
      <div class="mascot-note" style="margin-bottom:20px">
        ${icons.mascot(72)}
        <div class="bubble">Hi${profile.guest ? "" : ` ${escape(profile.name)}`}, I'm Blink! Let's set up your daily practice.</div>
      </div>
      <form id="setup-form">
        ${preferencesFields(profile)}
        <div class="card small" style="margin-bottom:20px">
          <strong>Before you start.</strong> EyeQuest isn't a medical treatment. Please see an eye doctor if you haven't, and keep up any plan they gave you. Stop if you get a headache, eye pain or double vision. If double vision or a change in your vision comes on suddenly, get medical care right away.
        </div>
        <button class="btn wide">Continue</button>
      </form>
    </main>`;
  }

  function setupAfter(profile) {
    $("#setup-form").addEventListener("submit", (event) => {
      event.preventDefault();
      readPreferences(event.target, profile);
      profile.onboarded = true;
      store.save();
      go("menu");
    });
  }

  // ---------- the lesson path ----------
  function learnView(profile, flash = "") {
    const current = Rules.nextLessonId(profile.lessons);
    const stats = todayStats(profile);
    const rest = stats.lessons >= Rules.DAILY_LESSON_LIMIT;
    const streak = streakNow(profile);
    const units = Rules.UNITS.map((unit) => {
      const nodes = unit.lessons.map(([title], index) => {
        const id = `${unit.id}l${index + 1}`;
        const stars = profile.lessons[id] || 0;
        const state = id in profile.lessons ? "done" : id === current ? "current" : "locked";
        const shift = [0, 62, 0, -62][index % 4];
        const node = state === "locked"
          ? `<span class="node locked" aria-label="${escape(title)}, locked">${icons.lock()}</span>`
          : `<a class="node ${state}" href="#/lesson/${id}" aria-label="${escape(title)}${stars ? `, ${stars} stars` : ""}">${state === "done" ? icons.check() : icons.play()}</a>`;
        return `<div class="node-wrap" style="transform: translateX(${shift}px)">
          ${state === "current" ? '<span class="start-tag">START</span>' : ""}
          ${node}
          <div class="node-title">${escape(title)}</div>
          <div class="node-stars">${state === "done" ? [0, 1, 2].map((n) => icons.star(n < stars ? "" : "off")).join("") : ""}</div>
        </div>`;
      }).join("");
      const land = Story.LANDS.find((l) => l.unit === unit.id);
      const region = Story.sky(profile.lessons).find((r) => r.land === land);
      return `<section><div class="unit-banner" style="background:${land.color}">
        <span class="land-tag">Land ${Story.LANDS.indexOf(land) + 1} · ${region.lit} of ${region.stars.length} stars lit</span>
        <h2>${unit.title}</h2><p>${unit.blurb}</p></div><div class="path">${nodes}</div></section>`;
    }).join("");
    const pct = Math.min(1, stats.xp / profile.goalXp);
    const lit = Story.litCount(profile.lessons), total = Story.totalStars();
    const nextStar = Story.starFor(current);
    const bubble = rest ? "That's plenty for today. Rest your eyes, and the stars will be here tomorrow!"
      : lit === total ? "The whole sky is shining. Let's keep it bright with the daily mix!"
      : stats.lessons ? `${lit} stars are shining over Lumen now. ${nextStar ? `${nextStar.name} is next.` : ""} Remember to look at something far away for 20 seconds.`
      : streak ? `You're on a ${streak}-day streak, and the sky remembers. ${nextStar ? `Shall we relight ${nextStar.name}?` : ""}`
      : nextStar ? `${nextStar.name} is waiting in ${nextStar.land.name}. Ready to relight it?`
      : "Ready for today's lesson? Pick up where the path glows.";
    return `${header(profile, "learn")}
    <main class="page learn">
      <div>
        ${flash ? `<div class="flash" role="status">${escape(flash)}</div>` : ""}
        ${storageWarning()}
        ${units}
        ${current === "mix" ? `<section class="card" style="text-align:center">
          <h2>You finished the path</h2><p class="muted">Keep your streak going with the daily mix.</p>
          <a class="btn" href="#/lesson/mix">Start daily mix</a></section>` : ""}
      </div>
      <aside class="side">
        <div class="card goal">
          <div class="ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42"/>
            ${stats.xp ? `<circle class="fill" cx="50" cy="50" r="42" pathLength="100" stroke-dasharray="${pct * 100} 100"/>` : ""}</svg>
            <b>${stats.xp}/${profile.goalXp}</b></div>
          <div><h2 style="margin:0">Daily goal</h2><p class="muted small" style="margin:0">${stats.xp >= profile.goalXp ? "Goal met today. Nice work!" : "XP earned today"}</p></div>
        </div>
        <div class="card">
          <div class="mascot-note">${icons.mascot(60, rest)}<div class="bubble">${bubble}</div></div>
          ${rest ? "" : `<a class="btn wide" style="margin-top:14px" href="#/lesson/${current}">${stats.lessons ? "Keep going" : "Start today's lesson"}</a>`}
        </div>
        <a class="card sky-card" href="#/sky" aria-label="See the sky over Lumen">
          ${skyMap(profile.lessons)}
          <span><b>${lit} of ${total} stars relit</b><span class="muted small">See the sky →</span></span>
        </a>
        ${profile.guest ? `<div class="card small"><strong>You're playing as a guest.</strong><br><span class="muted">Your progress is kept in this browser while you stay in guest mode. Give yourself a name to keep it for good.</span>
          <a class="btn ghost wide" style="margin-top:12px" href="#/settings?keep">Keep my progress</a></div>` : ""}
        ${profile.freezes ? `<div class="card small"><strong>Streak protection: ${profile.freezes}</strong><br><span class="muted">Each one saves your streak if you miss a day. You earn one every 7 days, up to 2.</span></div>` : ""}
      </aside>
    </main>`;
  }

  // ---------- the story: scenes and the night sky ----------
  // The Crystal Caves: looking out of a cave mouth at the night, with glowing crystal
  // clusters on the floor and walls and their light pooling on the ground.
  function cavesArt() {
    // One crystal: a pointed prism with a lit face and a shaded face.
    const crystal = (x, y, h, w, tilt, light, dark) => `<g transform="translate(${x} ${y}) rotate(${tilt})">
      <path d="M${-w / 2} 0 V${-h * 0.72} L0 ${-h} V0Z" fill="${light}"/>
      <path d="M0 0 V${-h} L${w / 2} ${-h * 0.72} V0Z" fill="${dark}"/>
      <path d="M${-w / 2 + 2} ${-h * 0.7} L0 ${-h + 3}" stroke="#ffffff" stroke-opacity=".7" stroke-width="1.5" fill="none"/></g>`;
    const cluster = (x, y, size, light, dark, glow) => `
      <circle cx="${x}" cy="${y - 18 * size}" r="${58 * size}" fill="url(#cv-glow-${glow})"/>
      ${crystal(x - 22 * size, y, 46 * size, 15 * size, -24, light, dark)}
      ${crystal(x + 20 * size, y, 52 * size, 16 * size, 20, light, dark)}
      ${crystal(x - 8 * size, y + 2, 40 * size, 14 * size, -9, light, dark)}
      ${crystal(x + 2 * size, y + 2, 72 * size, 20 * size, 4, light, dark)}`;
    const sparkle = (x, y, r) => `<path d="M${x} ${y - r} L${x + r * 0.25} ${y - r * 0.25} L${x + r} ${y} L${x + r * 0.25} ${y + r * 0.25} L${x} ${y + r} L${x - r * 0.25} ${y + r * 0.25} L${x - r} ${y} L${x - r * 0.25} ${y - r * 0.25}Z" fill="#eaf4ff"/>`;
    const drip = (x, y, w, h) => `<path d="M${x - w} ${y} Q${x} ${y + h * 0.4} ${x} ${y + h} Q${x} ${y + h * 0.4} ${x + w} ${y}Z" fill="#26346e"/>
      <path d="M${x - w * 0.55} ${y + 2} Q${x - 1} ${y + h * 0.45} ${x} ${y + h - 3}" stroke="#4a5fa8" stroke-width="1.5" fill="none"/>`;
    return `
      <defs>
        <linearGradient id="cv-rock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1230"/><stop offset="1" stop-color="#18224a"/></linearGradient>
        <linearGradient id="cv-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2a5c"/><stop offset="1" stop-color="#101838"/></linearGradient>
        <radialGradient id="cv-glow-blue"><stop offset="0" stop-color="#7fc4ff" stop-opacity=".55"/><stop offset="1" stop-color="#7fc4ff" stop-opacity="0"/></radialGradient>
        <radialGradient id="cv-glow-violet"><stop offset="0" stop-color="#b892ff" stop-opacity=".55"/><stop offset="1" stop-color="#b892ff" stop-opacity="0"/></radialGradient>
        <radialGradient id="cv-glow-teal"><stop offset="0" stop-color="#6ff0d8" stop-opacity=".5"/><stop offset="1" stop-color="#6ff0d8" stop-opacity="0"/></radialGradient>
      </defs>
      <mask id="cv-moon"><rect width="640" height="240" fill="#fff"/><circle cx="380" cy="64" r="15" fill="#000"/></mask>
      <circle cx="372" cy="70" r="16" fill="#fff4cf" mask="url(#cv-moon)"/>
      <path d="M200 150 Q260 112 320 136 T440 126 V170 H200Z" fill="#162a5a"/>
      <path d="M200 160 Q280 138 350 154 T440 150 V170 H200Z" fill="#11214a"/>
      <path fill-rule="evenodd" fill="url(#cv-rock)" d="M0 0 H640 V240 H0Z M205 168 C200 92 250 30 320 28 C390 30 440 92 435 168Z"/>
      <path d="M205 168 C200 92 250 30 320 28 C390 30 440 92 435 168" fill="none" stroke="#2a3a78" stroke-width="3" opacity=".8"/>
      <path d="M0 58 Q90 44 170 70 M470 64 Q560 40 640 60 M0 128 Q70 116 150 134 M500 120 Q580 106 640 124" stroke="#24316a" stroke-width="2" fill="none" opacity=".7"/>
      ${drip(60, 0, 9, 38)}${drip(118, 0, 7, 26)}${drip(172, 0, 10, 46)}${drip(258, 30, 6, 22)}${drip(372, 30, 6, 20)}${drip(470, 0, 9, 40)}${drip(540, 0, 7, 28)}${drip(600, 0, 11, 50)}
      <path d="M0 240 V182 Q160 160 320 170 T640 180 V240Z" fill="url(#cv-floor)"/>
      <path d="M232 226 q14 -16 30 -4 q8 8 -2 10Z M410 232 q10 -12 24 -3 q6 6 -2 8Z M30 232 q12 -14 26 -2 q6 6 -2 6Z" fill="#26346e"/>
      <ellipse cx="140" cy="214" rx="120" ry="16" fill="#7fc4ff" opacity=".14"/>
      <ellipse cx="505" cy="218" rx="110" ry="14" fill="#b892ff" opacity=".14"/>
      ${cluster(140, 214, 1, "#bfe3ff", "#4f86d9", "blue")}
      ${cluster(505, 218, 0.95, "#e0cfff", "#7d58d6", "violet")}
      ${cluster(330, 190, 0.45, "#c6fff2", "#2fb59b", "teal")}
      <g transform="translate(40 108) rotate(70)">${cluster(0, 0, 0.42, "#c6fff2", "#2fb59b", "teal")}</g>
      <g transform="translate(606 96) rotate(-74)">${cluster(0, 0, 0.4, "#bfe3ff", "#4f86d9", "blue")}</g>
      ${sparkle(176, 148, 6)}${sparkle(98, 168, 4)}${sparkle(540, 152, 6)}${sparkle(470, 182, 4)}${sparkle(352, 160, 4)}${sparkle(62, 84, 4)}`;
  }

  // A small illustration for each place in the story.
  function sceneArt(place) {
    const land = Story.LANDS.find((l) => l.id === place);
    const [top, bottom] = land ? land.sky : ["#0d1530", "#1d2c5c"];
    const dim = Array.from({ length: 26 }, (_, i) => {
      const x = (i * 97) % 640, y = (i * 53) % 120 + 8;
      return `<circle cx="${x}" cy="${y}" r="${1 + (i % 3) * 0.6}" fill="#ffffff" opacity="${place === "finale" ? 0.9 : 0.18}"/>`;
    }).join("");
    const fog = place === "finale" || place === "caves" ? "" : '<rect x="0" y="70" width="640" height="46" fill="#c9c6dd" opacity=".12"/>';
    const scenery = {
      prologue: `<path d="M0 205 Q160 185 320 205 T640 205 V240 H0Z" fill="#1b3d6e"/><path d="M0 218 Q160 200 320 218 T640 218 V240 H0Z" fill="#14305a"/>
        <path d="M470 205 L490 95 H530 L550 205Z" fill="#e9e6f7"/><rect x="486" y="120" width="48" height="14" fill="#ff6b5e"/><rect x="489" y="160" width="42" height="14" fill="#ff6b5e"/>
        <rect x="482" y="72" width="56" height="24" rx="4" fill="#2c2a4a"/><circle cx="510" cy="84" r="9" fill="#ffd86b"/><path d="M482 66 L510 50 L538 66Z" fill="#ff6b5e"/>`,
      meadow: `<path d="M0 190 Q120 150 260 185 T640 170 V240 H0Z" fill="#1f5a3b"/><path d="M0 215 Q180 185 380 210 T640 205 V240 H0Z" fill="#2f7a4f"/>
        ${[[90, 150], [180, 120], [300, 160], [420, 130], [520, 165], [600, 140], [240, 175]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#ffd86b" opacity=".25"/><circle cx="${x}" cy="${y}" r="3.5" fill="#ffe9a3"/>`).join("")}`,
      caves: cavesArt(),
      library: `<rect x="30" y="60" width="580" height="180" fill="#3a2414"/>
        ${[0, 1, 2].map((row) => `<rect x="30" y="${108 + row * 46}" width="580" height="6" fill="#5a3a20"/>` + Array.from({ length: 22 }, (_, i) => `<rect x="${42 + i * 26}" y="${70 + row * 46 + (i % 3) * 4}" width="${14 + (i % 4) * 2}" height="${38 - (i % 3) * 4}" fill="${["#b0662a", "#7a4a8a", "#2f6f8f", "#a33b3b", "#c9a227"][(i + row) % 5]}" opacity=".9"/>`).join("")).join("")}`,
      observatory: `<path d="M0 215 Q320 175 640 215 V240 H0Z" fill="#1c1640"/><path d="M230 200 V150 A90 90 0 0 1 410 150 V200Z" fill="#d9d6f5"/>
        <rect x="300" y="72" width="40" height="80" fill="#2c2a4a"/><path d="M308 120 L380 70 L392 84 L320 134Z" fill="#8577ff"/><rect x="226" y="198" width="188" height="14" fill="#b7b4d6"/>`,
      finale: `<path d="M0 205 Q160 185 320 205 T640 205 V240 H0Z" fill="#1b3d6e"/>
        ${Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 71) % 640}" cy="${(i * 37) % 150 + 10}" r="${2 + (i % 3)}" fill="#ffd86b"/>`).join("")}
        <path d="M510 84 L640 40 L640 128Z" fill="#ffd86b" opacity=".22"/>
        <path d="M470 205 L490 95 H530 L550 205Z" fill="#e9e6f7"/><rect x="486" y="120" width="48" height="14" fill="#ff6b5e"/><rect x="489" y="160" width="42" height="14" fill="#ff6b5e"/>
        <rect x="482" y="72" width="56" height="24" rx="4" fill="#2c2a4a"/><circle cx="510" cy="84" r="10" fill="#ffd86b"/><path d="M482 66 L510 50 L538 66Z" fill="#ff6b5e"/>`,
    };
    const art = scenery[place] || scenery.prologue;
    return `<svg class="scene-art" viewBox="0 0 640 240" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="sky-${place}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>
      <rect width="640" height="240" fill="url(#sky-${place})"/>${dim}${fog}${art}</svg>`;
  }

  // Plays a scene one line at a time. Resolves when it's finished or skipped.
  function playScene(scene) {
    return new Promise((resolve) => {
      const holder = document.createElement("div");
      holder.className = "scene-overlay";
      holder.setAttribute("role", "dialog");
      holder.setAttribute("aria-label", scene.title);
      let line = 0;
      const draw = () => {
        const last = line === scene.lines.length - 1;
        holder.innerHTML = `<div class="scene-card">
          ${sceneArt(scene.id === "prologue" || scene.id === "finale" ? scene.id : scene.land)}
          <div class="scene-body">
            <p class="scene-kicker">${escape(scene.title)}</p>
            <div class="mascot-note">${icons.mascot(64)}<div class="bubble" aria-live="polite">${escape(scene.lines[line])}</div></div>
            <div class="scene-foot">
              <span class="scene-dots" aria-hidden="true">${scene.lines.map((_, i) => `<i class="${i === line ? "on" : ""}"></i>`).join("")}</span>
              <span>${last ? "" : '<button class="btn link small" data-scene="skip">Skip</button>'}
              <button class="btn" data-scene="next">${last ? (scene.id === "finale" ? "Thank you, Blink" : "Let's go!") : "Next"}</button></span>
            </div>
          </div></div>`;
        holder.querySelector('[data-scene="next"]').focus();
      };
      const finish = () => {
        removeEventListener("keydown", onKey);
        holder.remove();
        resolve();
      };
      const next = () => {
        if (line < scene.lines.length - 1) {
          line += 1;
          draw();
        } else finish();
      };
      const onKey = (event) => {
        if (event.key === "Escape") finish();
        else if (event.key === "ArrowRight") next();
      };
      holder.addEventListener("click", (event) => {
        const action = event.target.closest("[data-scene]");
        if (!action) return;
        if (action.dataset.scene === "skip") finish();
        else next();
      });
      addEventListener("keydown", onKey);
      draw();
      document.body.appendChild(holder);
      holder.querySelector('[data-scene="next"]').focus();
    });
  }

  // Plays any story scenes the player hasn't seen yet, in order, then remembers them.
  // Returns true if anything played.
  async function catchUpOnStory(profile) {
    profile.storySeen ||= {};
    let played = false;
    for (let guard = 0; guard < 8; guard += 1) {
      const scene = Story.nextScene(profile.storySeen, Rules.nextLessonId(profile.lessons));
      if (!scene) break;
      await playScene(scene);
      profile.storySeen[scene.id] = today();
      store.save();
      played = true;
    }
    return played;
  }

  // The night sky over Lumen: four constellations, one per land, lit lesson by lesson.
  function skyMap(completed, { big = false } = {}) {
    const regions = Story.sky(completed);
    const decor = Array.from({ length: 70 }, (_, i) => {
      const x = (i * 137.5) % 1000, y = (i * 61.7) % 380;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.6 + (i % 4) * 0.35).toFixed(2)}" fill="#fff" opacity="${0.12 + (i % 5) * 0.04}"/>`;
    }).join("");
    const groups = regions.map((region, r) => {
      const shape = Story.SHAPES[region.land.id];
      const at = (i) => [r * 250 + shape.points[i][0], 10 + shape.points[i][1]];
      const lines = shape.lines.map(([a, b]) => {
        const on = region.stars[a].glow && region.stars[b].glow;
        const [x1, y1] = at(a), [x2, y2] = at(b);
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${on ? "#ffd86b" : "#ffffff"}" stroke-opacity="${on ? 0.55 : 0.08}" stroke-width="${on ? 2 : 1.2}" ${on ? "" : 'stroke-dasharray="4 5"'}/>`;
      }).join("");
      const stars = region.stars.map((star, i) => {
        const [x, y] = at(i);
        const label = `${star.name}${star.glow ? `, ${"★".repeat(star.glow)}` : ", still dark"}`;
        return star.glow
          ? `<g><title>${label}</title><circle cx="${x}" cy="${y}" r="${8 + star.glow * 4}" fill="#ffd86b" opacity=".18"/><circle cx="${x}" cy="${y}" r="${3 + star.glow * 1.6}" fill="#ffe9a3"/></g>`
          : `<g><title>${label}</title><circle cx="${x}" cy="${y}" r="3.5" fill="#8a87a8" opacity=".55"/></g>`;
      }).join("");
      const caption = big
        ? `<text x="${r * 250 + 125}" y="372" text-anchor="middle" font-size="17" font-weight="800" fill="#f3f1ff">${region.land.name}</text>`
        : "";
      return lines + stars + caption;
    }).join("");
    return `<svg class="sky-map ${big ? "big" : ""}" viewBox="0 0 1000 ${big ? 390 : 350}" role="img" aria-label="${Story.litCount(completed)} of ${Story.totalStars()} stars relit">
      <rect width="1000" height="${big ? 390 : 350}" fill="#14132a"/>${decor}${groups}</svg>`;
  }

  function skyView(profile) {
    const regions = Story.sky(profile.lessons);
    const lit = Story.litCount(profile.lessons), total = Story.totalStars();
    const seen = profile.storySeen || {};
    const lands = regions.map((region) => `
      <div class="card land-card" style="--land:${region.land.color}">
        <h3>${region.land.name}</h3>
        <p class="muted small">Constellation: ${region.land.constellation} · ${region.lit} of ${region.stars.length} stars lit</p>
        <ul class="star-list">${region.stars.map((s) => `<li class="${s.glow ? "lit" : ""}">${s.glow ? "★" : "☆"} ${s.name}</li>`).join("")}</ul>
      </div>`).join("");
    const scenes = Story.allScenes().map((scene) => seen[scene.id]
      ? `<button class="btn ghost small" data-replay="${scene.id}">▶ ${escape(scene.title)}</button>`
      : `<span class="locked-scene">🔒 ${escape(scene.title)}</span>`).join("");
    return `${header(profile, "sky")}
    <main class="page">
      <h1>The sky over Lumen</h1>
      <p class="muted">${lit === total ? "Every star is shining again. You saved the sky!" : `${lit} of ${total} stars relit. Each lesson you finish relights one more, and playing well makes it shine brighter.`}</p>
      <div class="sky-frame">${skyMap(profile.lessons, { big: true })}</div>
      <section class="section"><h2>The lands</h2><div class="lands">${lands}</div></section>
      <section class="section"><h2>Story scenes</h2><div class="scene-list">${scenes}</div></section>
    </main>`;
  }

  function skyAfter() {
    app.querySelectorAll("[data-replay]").forEach((button) => button.addEventListener("click", () => {
      const scene = Story.allScenes().find((s) => s.id === button.dataset.replay);
      if (scene) playScene(scene);
    }));
  }

  // ---------- a lesson ----------
  let lessonRun = 0; // bumped when a lesson is left, so a running one stops quietly
  let activeStage = null;

  function lessonView() {
    return `<div class="stage-page">
      <canvas id="stage"></canvas>
      <div class="lesson-top">
        <button class="quit" data-action="quit" aria-label="Quit lesson">✕</button>
        <div class="bar" role="progressbar" aria-label="Lesson progress"><i id="bar"></i></div>
      </div>
      <div class="overlay" id="intro">
        <a class="back-link" href="#/learn" aria-label="Back to the lessons">← Back to lessons</a>
        <div class="panel">
          <span id="intro-mascot"></span>
          <h1 id="intro-title"></h1>
          <p id="intro-cover" style="font-weight:800;color:var(--sun)"></p>
          <p class="muted" id="intro-how"></p>
          <button class="btn" id="intro-go">Start</button>
        </div>
      </div>
      <div class="overlay" id="finish" hidden>
        <div class="panel">
          <div class="mascot-note finish-blink">${icons.mascot(72)}<div class="bubble" id="finish-blink"></div></div>
          <h1 id="finish-title">Lesson complete!</h1>
          <p class="muted" id="finish-star"></p>
          <div class="result-stars" id="finish-stars">${icons.star()}${icons.star()}${icons.star()}</div>
          <div class="tally">
            <div><b id="t-xp"></b><span>XP earned</span></div>
            <div><b id="t-streak"></b><span>Day streak</span></div>
            <div><b id="t-score"></b><span>Score</span></div>
          </div>
          <p id="finish-note"></p>
          <p class="muted small">Give your eyes a break: look at something far away for 20 seconds.</p>
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
            <a class="btn ghost" id="again" href="#/learn">Play again</a>
            <a class="btn" href="#/learn">Continue</a>
          </div>
        </div>
      </div>
    </div>`;
  }

  function stepIntro(step, index, profile) {
    $("#intro-title").textContent = step.name;
    $("#intro-how").textContent = step.how;
    $("#intro-mascot").innerHTML = icons.mascot(84, Boolean(step.cover));
    $("#intro-cover").textContent = step.cover
      ? `Cover your ${step.cover} eye with a patch or your hand, so your ${step.eye} eye does the work.`
      : "Keep both eyes open.";
    $("#intro-go").textContent = index === 0 ? "Start" : "Next game";
    $("#intro").hidden = false;
    return new Promise((resolve) => {
      $("#intro-go").onclick = () => {
        $("#intro").hidden = true;
        resolve();
      };
    });
  }

  function enterFullscreen() {
    const element = document.documentElement;
    if (!element.requestFullscreen || document.fullscreenElement) return Promise.resolve();
    // Full screen is nice to have, so a refusal (or no answer) never holds the lesson up.
    return Promise.race([element.requestFullscreen().catch(() => {}), new Promise((r) => setTimeout(r, 600))]);
  }

  function leaveFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

  async function runLesson(profile, lessonId) {
    const run = ++lessonRun;
    const day = Rules.dayNumber(today());
    const working = Rules.soloEye(profile.weakEye, day);
    const steps = Rules.lessonSteps(lessonId).map((raw) => {
      const solo = raw.eye === "solo";
      const variant = Rules.pickVariant(raw.game); // e.g. which Star Snap this time
      const { name, how } = Rules.gameInfo(raw.game, variant);
      return {
        ...raw, name, how, variant,
        params: { ...raw.params, variant },
        eye: solo ? working : "both",
        cover: solo ? Rules.otherEye(working) : null,
      };
    });
    const results = [];
    const setBar = (done) => { $("#bar").style.width = `${(100 * done) / steps.length}%`; };
    setBar(0);
    for (const [index, step] of steps.entries()) {
      await stepIntro(step, index, profile);
      if (run !== lessonRun) return;
      await enterFullscreen();
      activeStage = new Games.Stage($("#stage"), step);
      let outcome;
      try {
        outcome = await Games.play[step.game](activeStage);
      } finally {
        if (activeStage) activeStage.close();
        activeStage = null;
      }
      if (run !== lessonRun) return;
      results.push({ game: step.game, variant: step.variant, eye: step.eye, score: outcome.score, metrics: outcome.metrics });
      setBar(index + 1);
    }
    leaveFullscreen();
    const before = profile.lessons[lessonId] || 0; // stars this lesson had already
    const summary = Rules.completeLesson(profile, lessonId, results, today());
    store.save();
    celebrate(summary, lessonId, before, profile);
  }

  function celebrate(summary, lessonId, before, profile) {
    $("#again").setAttribute("href", `#/lesson/${lessonId}`);
    const star = Story.starFor(lessonId);
    if (star) {
      $("#finish-title").textContent = before === 0 ? `You relit ${star.name}!`
        : summary.stars > before ? `${star.name} shines brighter!` : `${star.name} is still shining`;
      $("#finish-star").textContent = `A star of ${star.land.constellation}, over ${star.land.name}.`;
    } else {
      $("#finish-title").textContent = "The sky shines brighter!";
      $("#finish-star").textContent = "Every daily mix keeps the stars over Lumen glowing.";
    }
    $("#finish-blink").textContent = Story.reaction(summary.stars);
    app.querySelectorAll("#finish-stars svg").forEach((star, i) => star.classList.toggle("on", i < summary.stars));
    $("#t-xp").textContent = `+${summary.xp}`;
    $("#t-streak").textContent = summary.streak;
    $("#t-score").textContent = `${summary.score}%`;
    const notes = {
      started: "Your streak has started. See you tomorrow!",
      extended: "Your streak grew by a day!",
      frozen: "Streak protection saved your streak.",
      reset: "A new streak starts today.",
      same_day: "",
    };
    const parts = [];
    // Finishing the last star of a land completes its constellation.
    if (star && before === 0) {
      const region = Story.sky(profile.lessons).find((r) => r.land === star.land);
      if (region.lit === region.stars.length) parts.push(star.land.done);
    }
    parts.push(notes[summary.streakOutcome]);
    if (summary.goalJustMet) parts.push("You hit your daily goal!");
    if (summary.newBadges.length) parts.push(`New badge: ${summary.newBadges.join(", ")}.`);
    if (summary.xp === 0) parts.push("You've reached today's limit, so that one earned no XP.");
    else if (summary.rest) parts.push("That's plenty for today. Rest your eyes.");
    $("#finish-note").textContent = parts.filter(Boolean).join(" ");
    $("#finish").hidden = false;
    Games.chime(880);
  }

  function stopLesson() {
    lessonRun += 1;
    if (activeStage) activeStage.abort();
    // Going straight into a game keeps full screen on; anywhere else leaves it.
    if (!/^#\/(lesson|tracker\/play)\//.test(location.hash)) leaveFullscreen();
  }

  // ---------- progress and the eye report ----------
  function sparkline(series) {
    if (series.length < 2) return "";
    const W = 120, H = 32;
    const x = (i) => (i / (series.length - 1)) * (W - 4) + 2;
    const y = (v) => H - 3 - (v / 100) * (H - 6);
    const path = series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${path}"/></svg>`;
  }

  function changeChip(skill) {
    if (skill.level === null) return `<span class="chip-change none">Not measured yet</span>`;
    if (skill.change === null) return `<span class="chip-change none">Trend coming soon</span>`;
    if (skill.change === 0) return `<span class="chip-change flat">No change yet</span>`;
    return skill.change > 0
      ? `<span class="chip-change up" title="Change since you started">▲ ${skill.change} since start</span>`
      : `<span class="chip-change down" title="Change since you started">▼ ${-skill.change} since start</span>`;
  }

  function eyeLine(skill) {
    const names = { lazy: "Lazy eye", both: "Both eyes", left: "Left eye", right: "Right eye" };
    const parts = ["lazy", "left", "right", "both"].filter((g) => g in skill.byEye).map((g) => `${names[g]} ${skill.byEye[g]}`);
    return parts.length > 1 ? `<p class="muted small eye-split">${parts.join(" · ")}</p>` : "";
  }

  function reportView(report, profile) {
    const lazyKnown = ["left", "right"].includes(profile.weakEye);
    const highlights = [];
    if (report.lazyGap) {
      const { start, now } = report.lazyGap;
      const better = start - now;
      highlights.push(`<div class="card highlight"><span class="label">Lazy eye vs both eyes</span>
        <b>${now <= 0 ? "Level!" : `${now} points behind`}</b>
        <p class="muted small">${better > 0 ? `It has caught up by ${better} points since your first days.` : better < 0 ? `The gap has grown by ${-better} points. Solo-eye lessons help close it.` : "The same gap as when you started."}</p></div>`);
    }
    if (report.mostImproved) {
      highlights.push(`<div class="card highlight"><span class="label">Most improved</span><b>${report.mostImproved.name}</b>
        <p class="muted small">Up ${report.mostImproved.change} points since you started.</p></div>`);
    }
    if (report.workOn) {
      highlights.push(`<div class="card highlight"><span class="label">Area to work on</span><b>${report.workOn.name}</b>
        <p class="muted small">${report.workOn.about}. Practice with ${report.workOn.from}.</p></div>`);
    }
    if (!highlights.length) {
      highlights.push(`<div class="card highlight"><span class="label">Getting started</span><b>Play a few lessons</b>
        <p class="muted small">Your report fills in as you play. Trends show up after a few days.</p></div>`);
    }

    const cards = report.skills.map((skill) => `
      <div class="card skill ${skill.level === null ? "empty" : ""}">
        <div class="skill-head"><h3>${skill.name}</h3><span class="skill-level">${skill.level === null ? "–" : skill.level}<small>/100</small></span></div>
        <div class="meter" aria-hidden="true"><i style="width:${skill.level || 0}%"></i></div>
        <p class="muted small">${skill.about}.</p>
        <div class="skill-foot">${changeChip(skill)}${sparkline(skill.series)}</div>
        ${eyeLine(skill)}
        <p class="from small">From: ${skill.from}</p>
      </div>`).join("");

    return `
      <section class="section">
        <h2>Your eye report</h2>
        <p class="muted small">Scores from 0 to 100, worked out from how you play. They show your own progress over time. They come from games, not an eye exam, so share real concerns with your eye doctor.</p>
        <div class="highlights">${highlights.join("")}</div>
      </section>
      <section class="card section">
        <h2>${lazyKnown ? "Lazy eye vs both eyes" : "Each eye over time"}</h2>
        <p class="muted small">${lazyKnown
          ? "Your average score each day, playing with your lazy eye alone and with both eyes. The closer the lines, the more your lazy eye is keeping up."
          : "Your average score each day for each eye. Set your lazy eye in Settings to compare it with both eyes."}</p>
        <div id="eyes-chart"></div>
      </section>
      <section class="section"><h2>Skills</h2><div class="skills">${cards}</div></section>`;
  }

  function progressView(profile) {
    const report = Rules.skillReport(profile);
    window.EYE_REPORT = report;
    const active = new Set(profile.sessions.map((s) => s.day));
    const now = new Date();
    const weekday = (now.getDay() + 6) % 7; // Monday = 0
    const start = Rules.addDays(today(), -(weekday + 7 * 11));
    const cells = Array.from({ length: 84 }, (_, i) => {
      const day = Rules.addDays(start, i);
      const future = Rules.daysBetween(today(), day) > 0;
      return `<i class="${active.has(day) ? "on" : ""} ${future ? "future" : ""}" title="${day}${active.has(day) ? ": practiced" : ""}"></i>`;
    }).join("");
    const badges = Object.entries(Rules.BADGES).map(([key, [name, how]]) => {
      const have = key in profile.badges;
      return `<div class="badge ${have ? "" : "off"}">${icons.star()}<b>${name}</b><span>${how}${have ? "" : " (not yet)"}</span></div>`;
    }).join("");
    return `${header(profile, "progress")}
    <main class="page">
      <h1>Your progress</h1>
      <div class="stats">
        <div class="card stat"><b>${streakNow(profile)}</b><span>Day streak</span></div>
        <div class="card stat"><b>${profile.bestStreak}</b><span>Best streak</span></div>
        <div class="card stat"><b>${profile.xp}</b><span>Total XP (level ${Rules.levelFor(profile.xp)})</span></div>
        <div class="card stat"><b>${profile.sessions.length}</b><span>Games played over ${plural(active.size, "day")}</span></div>
      </div>
      ${reportView(report, profile)}
      ${trackerSummary(profile)}
      <section class="card section"><h2>Last 12 weeks</h2><div class="calendar" aria-label="Calendar of days you practiced">${cells}</div></section>
      <section class="card section"><h2>Badges</h2><div class="badges">${badges}</div></section>
    </main>`;
  }

  // The Eye Tracker's stages and best scores. Its games measure where you look, not the
  // skills above, so they're listed on their own.
  function trackerSummary(profile) {
    const t = TrackerRules.progress(profile);
    const played = profile.sessions.filter((s) => s.tracker).length;
    if (!played && !Object.keys(t.best).length) return "";
    const rows = TrackerRules.STAGES.map((stage, i) => {
      const best = TrackerRules.bestScore(profile, i);
      return `<tr><td>${escape(stage.name)}</td><td>${best === undefined ? '<span class="muted">Not finished yet</span>' : best}</td></tr>`;
    }).join("");
    return `<section class="card section"><h2>Eye Tracker</h2>
      <p class="muted small">${plural(played, "stage")} played · ${t.points} points. Its scores count toward your XP and streak, not the skills above.</p>
      <table><thead><tr><th>Stage</th><th>Best score</th></tr></thead><tbody>${rows}</tbody></table></section>`;
  }

  function progressAfter() {
    const styles = getComputedStyle(document.documentElement);
    const colors = { lazy: styles.getPropertyValue("--series-2"), left: styles.getPropertyValue("--series-2"), right: styles.getPropertyValue("--series-3") || "#8a63d2", both: styles.getPropertyValue("--series-1") };
    const series = EYE_REPORT.overall.map((o) => ({ name: o.name, color: colors[o.group], points: o.points }));
    lineChart($("#eyes-chart"), series, {
      unit: "", yMax: 100, tags: false, label: "Average skill score by day for each eye",
      empty: "Play a few lessons to see this chart.",
    });
  }

  // ---------- settings ----------
  function settingsView(profile, flash = "", keep = false, ok = true) {
    return `${header(profile, "settings")}
    <main class="narrow">
      <h1>Settings</h1>
      ${flash ? `<div class="flash ${ok ? "ok" : ""}" role="status">${escape(flash)}</div>` : ""}
      ${profile.guest ? `<form class="card ${keep ? "warn" : ""}" id="keep-form" style="margin-bottom:24px">
        <h2>Keep your progress</h2>
        <p class="muted small">Give yourself a name, and your lessons, XP and streak stay saved under it.</p>
        <label class="field">Player name<input type="text" name="name" maxlength="24" autocomplete="off" required ${keep ? "autofocus" : ""}></label>
        <button class="btn wide">Save my progress</button>
      </form>` : ""}
      <form id="settings-form">
        ${preferencesFields(profile)}
        <button class="btn wide">Save</button>
      </form>
      ${profile.guest ? "" : `<h2 class="section-gap">Player</h2>
        <form class="card" id="rename-form" style="margin-bottom:16px">
          <label class="field">Name<input type="text" name="name" value="${escape(profile.name)}" maxlength="24" autocomplete="off" required></label>
          <button class="btn ghost">Rename</button>
        </form>`}
      <p><button class="btn link" data-action="export">Download my data</button></p>
      <p><button class="btn link danger" data-action="delete">${profile.guest ? "Delete guest progress" : "Delete this player"}</button></p>
    </main>`;
  }

  function settingsAfter(profile) {
    const form = $("#settings-form");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      readPreferences(form, profile);
      store.save();
      render(settingsView(profile, "Saved."), () => settingsAfter(profile));
    });
    const rename = (formId, makeReal) => {
      const named = $(formId);
      if (!named) return;
      named.addEventListener("submit", (event) => {
        event.preventDefault();
        const name = new FormData(named).get("name").trim();
        const problem = nameProblem(name, profile.id);
        if (problem) {
          render(settingsView(profile, problem, makeReal, false), () => settingsAfter(profile));
          return;
        }
        profile.name = name;
        if (makeReal) profile.guest = false;
        store.save();
        render(settingsView(profile, makeReal ? `Your progress is saved as ${name}.` : "Renamed."), () => settingsAfter(profile));
      });
    };
    rename("#keep-form", true);
    rename("#rename-form", false);
    $('[data-action="export"]').addEventListener("click", () => {
      const blob = new Blob([store.exportJson()], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `eyequest-${today()}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    });
    $('[data-action="delete"]').addEventListener("click", () => {
      if (!confirm(`Delete ${profile.guest ? "this guest's" : `${profile.name}'s`} progress? This can't be undone.`)) return;
      store.remove(profile.id);
      go("");
    });
  }

  // ---------- the main menu: pick a version ----------
  const trackerIcon = (size = 96) => `<svg class="tracker-icon" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="46" fill="#1e1e1e"/>
    <path d="M50 8 58 20H42zM50 92 42 80h16zM8 50 20 42v16zM92 50 80 58V42z" fill="#ffd400"/>
    <path d="M22 50q28-30 56 0-28 30-56 0z" fill="#fff"/>
    <circle cx="50" cy="50" r="13" fill="#2878eb"/><circle cx="50" cy="50" r="6" fill="#111"/><circle cx="54" cy="46" r="2.5" fill="#fff"/></svg>`;

  function menuView(profile) {
    const lit = Story.litCount(profile.lessons), total = Story.totalStars();
    const t = TrackerRules.progress(profile);
    const finished = TrackerRules.STAGES.filter((_, i) => TrackerRules.isCompleted(profile, i)).length;
    const stats = todayStats(profile);
    return `${header(profile, "menu")}
    <main class="page menu">
      <h1>What would you like to play?</h1>
      <p class="muted">Both versions earn XP and keep your streak going. Today: ${stats.xp} of ${profile.goalXp} XP.</p>
      ${storageWarning()}
      <div class="versions">
        <a class="card version" href="#/learn">
          <div class="version-art arcade-art">${icons.mascot(110)}<span class="neon-eye" aria-hidden="true"></span></div>
          <div>
            <h2>EyeQuest Arcade</h2>
            <p class="muted">Play with your mouse and keyboard. Short games on a lesson path, with Blink and a sky full of stars to relight. No camera needed.</p>
            <p class="version-stat">${lit} of ${total} stars relit</p>
          </div>
          <span class="btn wide">Play the Arcade</span>
        </a>
        <a class="card version" href="#/tracker">
          <div class="version-art tracker-art">${trackerIcon(110)}</div>
          <div>
            <h2>Eye Tracker</h2>
            <p class="muted">Play with your eyes. Your webcam follows where you look (left, right, up, down or the middle) to control the games.</p>
            <p class="version-stat">${finished} of ${TrackerRules.STAGES.length} stages finished · ${t.points} points</p>
          </div>
          <span class="btn wide">Play the Eye Tracker</span>
        </a>
      </div>
      <p class="muted small">The Eye Tracker needs a webcam and an internet connection, and works best in Chrome, Edge or Brave with a well-lit face.</p>
    </main>`;
  }

  // ---------- the Eye Tracker's stage path ----------
  let trackerStart = null; // { calibrateFirst, seconds } chosen in the stage window
  let trackerRun = null;   // the stage being played

  function trackerView(profile, flash = "") {
    const t = TrackerRules.progress(profile);
    const current = TrackerRules.STAGES.findIndex((_, i) => !TrackerRules.isCompleted(profile, i));
    const nodes = TrackerRules.STAGES.map((stage, i) => {
      const unlocked = TrackerRules.isUnlocked(profile, i);
      const done = TrackerRules.isCompleted(profile, i);
      const state = done ? "done" : unlocked ? "current" : "locked";
      const shift = [0, 62, 0, -62][i % 4];
      let status = !unlocked ? "Locked" : done ? `Best score: ${TrackerRules.bestScore(profile, i)}` : stage.about;
      if (stage.multiplier > 1 && unlocked) status += ` (${stage.multiplier}x points)`;
      const node = unlocked
        ? `<button class="node ${state}" data-stage="${i}" aria-label="${escape(stage.name)}, ${escape(status)}"><b>${i + 1}</b></button>`
        : `<span class="node locked" aria-label="${escape(stage.name)}, locked">${icons.lock()}</span>`;
      return `<div class="node-wrap" style="transform: translateX(${shift}px)">
        ${i === current ? '<span class="start-tag">START</span>' : ""}
        ${node}
        <div class="node-title">${escape(stage.name)}</div>
        <div class="node-status">${escape(status)}</div>
      </div>`;
    }).join("");
    return `${header(profile, "tracker")}
    <main class="page learn">
      <div>
        ${flash ? `<div class="flash" role="status">${escape(flash)}</div>` : ""}
        ${storageWarning()}
        <div class="unit-banner tracker-banner">
          <span class="land-tag">Eye Tracker · ${t.points} points</span>
          <h2>Choose a stage</h2><p>Look left, right, up and down to play. Finish a stage to open the next one.</p>
        </div>
        <div class="path">${nodes}</div>
      </div>
      <aside class="side">
        <div class="card">
          <h2>How it works</h2>
          <ol class="steps-list">
            <li>Pick a stage and a time limit.</li>
            <li>Line up your nose with the line in the webcam picture, then look at each dot. Move only your eyes.</li>
            <li>Play by looking toward the edges of the screen.</li>
          </ol>
          <p class="muted small">During a stage: <b>C</b> calibrates again, <b>Esc</b> goes back. If your head moves too far, the game pauses and tells you how to move back.</p>
        </div>
        <div class="card small">
          <strong>For the best tracking</strong>
          <p class="muted" style="margin:6px 0 0">Hold your head still and calibrate again often. Light your face well, with nothing covering it. Taking off glasses helps. A built-in webcam is not very precise, so expect a few misses.</p>
        </div>
        <details class="card small" id="tracker-about">
          <summary><strong>About the Eye Tracker</strong></summary>
          <p class="muted" style="margin:8px 0 0">Made to give people with lazy eye an engaging way to exercise their eye muscles. Created by Kenny Arias, Bryan Ducas, Maria Ferreira Ramos and Sofia Marim. The music is original, made for EyeQuest.</p>
          <p class="muted" style="margin:8px 0 0">Your webcam picture stays on this computer. It's never recorded or sent anywhere.</p>
        </details>
        <a class="btn ghost wide" href="#/menu">Back to the menu</a>
      </aside>
    </main>
    <div class="modal" id="stage-modal" hidden>
      <div class="card modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title"></h2>
        <div id="modal-time"></div>
        <p style="margin:18px 0 8px;font-weight:700">Calibrate before you play?</p>
        <div class="modal-actions">
          <button class="btn" data-go="calibrate">Calibrate</button>
          <button class="btn ghost" data-go="skip">Skip</button>
        </div>
        <p class="muted small" id="modal-note"></p>
        <button class="btn link small" data-go="cancel">Cancel</button>
      </div>
    </div>`;
  }

  function trackerAfter(profile) {
    const modal = $("#stage-modal");
    let chosen = null;
    const close = () => { modal.hidden = true; chosen = null; };
    const open = (index) => {
      chosen = index;
      const stage = TrackerRules.STAGES[index];
      const t = TrackerRules.progress(profile);
      $("#modal-title").textContent = stage.name;
      $("#modal-time").innerHTML = stage.timed
        ? `<p class="muted small" style="margin:4px 0 8px">Time limit</p><div class="choices row">${TrackerRules.TIME_CHOICES.map((s) => `<label class="choice"><input type="radio" name="seconds" value="${s}" ${s === t.seconds ? "checked" : ""}><span>${TrackerRules.timeLabel(s)}</span></label>`).join("")}</div>`
        : `<p class="muted">No time limit</p>`;
      const canSkip = TrackerPlay.isCalibrated();
      modal.querySelector('[data-go="skip"]').disabled = !canSkip;
      $("#modal-note").textContent = canSkip ? "" : "Calibrate once before you can skip.";
      modal.hidden = false;
      modal.querySelector('[data-go="calibrate"]').focus();
    };
    app.querySelectorAll("[data-stage]").forEach((button) => button.addEventListener("click", () => open(Number(button.dataset.stage))));
    modal.addEventListener("click", (event) => {
      if (event.target === modal) return close();
      const action = event.target.closest("[data-go]");
      if (!action) return;
      if (action.dataset.go === "cancel") return close();
      const picked = modal.querySelector('input[name="seconds"]:checked');
      const t = TrackerRules.progress(profile);
      if (picked) {
        t.seconds = Number(picked.value);
        store.save();
      }
      trackerStart = { calibrateFirst: action.dataset.go === "calibrate", seconds: t.seconds };
      enterFullscreen(); // the dots go at the screen's edges, so full screen helps
      go(`tracker/play/${chosen}`);
    });
    // Secret codes from the Python version, while "About the Eye Tracker" is open:
    // R resets the Eye Tracker's progress, P opens every stage.
    const onKey = (event) => {
      if (!location.hash.startsWith("#/tracker") || location.hash.includes("/play/")) return removeEventListener("keydown", onKey);
      if (event.key === "Escape" && !modal.hidden) return close();
      if (!$("#tracker-about") || !$("#tracker-about").open || event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "r" && confirm("Reset the Eye Tracker? Every stage locks again and its best scores and points are cleared. XP and your streak stay.")) {
        TrackerRules.resetProgress(profile);
        store.save();
        render(trackerView(profile, "Eye Tracker progress reset."), () => trackerAfter(profile));
      } else if (key === "p") {
        TrackerRules.unlockAll(profile);
        store.save();
        render(trackerView(profile, "Every stage is open."), () => trackerAfter(profile));
      }
    };
    addEventListener("keydown", onKey);
  }

  function trackerPlayView() {
    return `<div class="stage-page tracker-page">
      <canvas id="tstage"></canvas>
      <button class="quit tracker-quit" data-action="quit" aria-label="Back to the stages">✕</button>
      <div class="overlay" id="tproblem" hidden>
        <div class="panel">
          ${trackerIcon(84)}
          <h1>The Eye Tracker can't start</h1>
          <p class="muted" id="tproblem-text"></p>
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
            <a class="btn ghost" href="#/tracker">Back to the stages</a>
            <button class="btn" data-action="retry">Try again</button>
          </div>
          <p class="muted small">No webcam? The <a href="#/learn" style="color:var(--sun)">Arcade</a> plays with just a mouse and keyboard.</p>
        </div>
      </div>
      <div class="overlay" id="tfinish" hidden>
        <div class="panel">
          <h1 id="tf-title"></h1>
          <p class="muted" style="margin-top:6px">Your score</p>
          <p class="big-score" id="tf-score"></p>
          <p class="tf-best" id="tf-best" hidden>New best score!</p>
          <div id="tf-lines" class="muted"></div>
          <div class="tally">
            <div><b id="tf-points"></b><span id="tf-points-label">Points</span></div>
            <div><b id="tf-xp"></b><span>XP earned</span></div>
            <div><b id="tf-streak"></b><span>Day streak</span></div>
          </div>
          <p class="tf-unlock" id="tf-unlock" hidden></p>
          <p id="tf-note"></p>
          <p class="muted small">Give your eyes a break: look at something far away for 20 seconds.</p>
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
            <button class="btn ghost" data-action="again">Play again</button>
            <a class="btn" href="#/tracker">Stages</a>
          </div>
        </div>
      </div>
    </div>`;
  }

  function stopTracker() {
    if (trackerRun) trackerRun.stop();
    trackerRun = null;
  }

  function runTracker(profile, index, choice) {
    stopTracker();
    const stage = TrackerRules.STAGES[index];
    $("#tproblem").hidden = true;
    $("#tfinish").hidden = true;
    trackerRun = TrackerPlay.start({
      stage,
      seconds: choice.seconds,
      calibrateFirst: choice.calibrateFirst,
      canvas: $("#tstage"),
      onExit: () => go("tracker"),
      onError: (problem) => {
        trackerRun = null;
        leaveFullscreen();
        $("#tproblem-text").textContent = problem;
        $("#tproblem").hidden = false;
      },
      onFinish: (results) => {
        trackerRun = null;
        leaveFullscreen();
        const summary = TrackerRules.completeStage(profile, index, results.score, today());
        store.save();
        trackerResults(stage, results, summary);
      },
    });
    const retry = () => runTracker(profile, index, choice);
    app.querySelector('[data-action="retry"]').onclick = retry;
    app.querySelector('[data-action="again"]').onclick = () => {
      enterFullscreen();
      runTracker(profile, index, { ...choice, calibrateFirst: false });
    };
    window.TRACKER_RUN = trackerRun; // for automated tests
  }

  function trackerResults(stage, results, summary) {
    $("#tf-title").textContent = stage.name;
    $("#tf-score").textContent = summary.score;
    $("#tf-best").hidden = !summary.newBest;
    $("#tf-lines").innerHTML = results.lines.map((line) => `<p>${escape(line.replace(/\s{2,}/g, " · "))}</p>`).join("");
    $("#tf-points").textContent = `+${summary.earned}`;
    $("#tf-points-label").textContent = stage.multiplier > 1 ? `Points (${stage.multiplier}x) · ${summary.totalPoints} total` : `Points · ${summary.totalPoints} total`;
    $("#tf-xp").textContent = `+${summary.xp}`;
    $("#tf-streak").textContent = summary.streak;
    $("#tf-unlock").hidden = !summary.unlocked;
    $("#tf-unlock").textContent = summary.unlocked ? `New stage unlocked: ${summary.unlocked}` : "";
    const notes = {
      started: "Your streak has started. See you tomorrow!",
      extended: "Your streak grew by a day!",
      frozen: "Streak protection saved your streak.",
      reset: "A new streak starts today.",
      same_day: "",
    };
    const parts = [notes[summary.streakOutcome]];
    if (summary.goalJustMet) parts.push("You hit your daily goal!");
    if (summary.newBadges.length) parts.push(`New badge: ${summary.newBadges.join(", ")}.`);
    if (summary.xp === 0) parts.push("You've reached today's limit, so that one earned no XP.");
    else if (summary.rest) parts.push("That's plenty for today. Rest your eyes.");
    $("#tf-note").textContent = parts.filter(Boolean).join(" ");
    $("#tfinish").hidden = false;
  }

  // ---------- routing ----------
  function render(html, after) {
    app.innerHTML = html;
    const switcher = app.querySelector('[data-action="switch"]');
    if (switcher) switcher.addEventListener("click", switchPlayer);
    if (after) after();
    window.scrollTo(0, 0);
  }

  function route() {
    stopLesson();
    stopTracker();
    const [path, query = ""] = location.hash.replace(/^#\/?/, "").split("?");
    const [screen, arg] = path.split("/");
    const profile = store.current();

    if (screen === "new") return render(newView(), newAfter);
    if (!profile) return render(welcomeView(), welcomeAfter);
    if (!profile.onboarded && screen !== "setup") return go("setup");

    switch (screen) {
      case "menu":
        return render(menuView(profile));
      case "tracker": {
        if (arg !== "play") return render(trackerView(profile), () => trackerAfter(profile));
        const index = Number(path.split("/")[2]);
        const choice = trackerStart;
        trackerStart = null;
        // Reloading a stage page (or opening it directly) goes back to the path to choose again.
        if (!choice || !TrackerRules.STAGES[index]) return go("tracker");
        if (!TrackerRules.isUnlocked(profile, index)) return render(trackerView(profile, "Finish the stage before it first."), () => trackerAfter(profile));
        return render(trackerPlayView(), () => {
          $('[data-action="quit"]').addEventListener("click", () => go("tracker"));
          runTracker(profile, index, choice);
        });
      }
      case "setup":
        return render(setupView(profile), () => setupAfter(profile));
      case "learn":
        return render(learnView(profile), () => catchUpOnStory(profile).then((played) => {
          // Re-draw after a scene so the page reflects it (the finale changes Blink's words).
          if (played && location.hash.startsWith("#/learn")) render(learnView(profile));
        }));
      case "sky":
        return render(skyView(profile), skyAfter);
      case "progress":
        return render(progressView(profile), progressAfter);
      case "settings":
        return render(settingsView(profile, "", query === "keep"), () => settingsAfter(profile));
      case "lesson": {
        if (!Rules.BY_ID[arg]) return go("learn");
        if (!Rules.isUnlocked(arg, profile.lessons)) {
          return render(learnView(profile, "Finish the earlier lessons first."));
        }
        return render(lessonView(), () => {
          $('[data-action="quit"]').addEventListener("click", () => go("learn"));
          runLesson(profile, arg).catch((error) => {
            console.error(error);
            leaveFullscreen();
            $("#intro").hidden = false;
            $("#intro-title").textContent = "Something went wrong";
            $("#intro-cover").textContent = "";
            $("#intro-how").textContent = `${error.message || error}. Your earlier lessons are safe. Reload the page and try again.`;
            $("#intro-go").textContent = "Back to the path";
            $("#intro-go").onclick = () => go("learn");
          });
        });
      }
      default:
        return go("menu");
    }
  }

  addEventListener("hashchange", route);
  app.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#/lesson/"]');
    if (link && link.getAttribute("href") === location.hash) {
      event.preventDefault();
      route();
    }
  });
  route();
})();
