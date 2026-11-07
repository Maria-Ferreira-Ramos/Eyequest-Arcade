// EyeQuest Arcade: the screens. Each screen is a function that returns HTML, and the
// address after # picks the screen (#/learn, #/lesson/u1l1 and so on).
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
      <a class="logo" href="#/learn">${icons.mascot(32)}<span>EyeQuest</span></a>
      <nav class="nav">${link("learn", "Learn")}${link("progress", "Progress")}${link("settings", "Settings")}</nav>
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
        <p class="muted">Short games you play with your mouse and keyboard. No camera, no setup. Keep your streak going and watch your progress build.</p>
        ${storageWarning()}
        ${players}
        <div class="actions">
          <a class="btn" href="#/new">${profiles.length ? "New player" : "Get started"}</a>
          <button class="btn link" data-action="guest">Play as a guest</button>
        </div>
      </section>
      <section class="pillars">
        <div class="card"><h2>Short daily lessons</h2><p>Two to four minutes on a path that gets harder as you go.</p></div>
        <div class="card"><h2>Nothing to set up</h2><p>Just your mouse and keyboard. No camera, no calibration.</p></div>
        <div class="card"><h2>Private by design</h2><p>Everything stays in this browser on this computer.</p></div>
      </section>
      <p class="notice"><strong>EyeQuest supports your eye care, but doesn't replace it.</strong> It isn't a medical device and can't diagnose or treat amblyopia. See an eye doctor, and keep following any patching or glasses plan you've been given. Stop if you get a headache, eye pain or double vision.</p>
    </main>`;
  }

  function welcomeAfter() {
    app.querySelectorAll("[data-pick]").forEach((button) => button.addEventListener("click", () => {
      store.select(button.dataset.pick);
      go(store.current().onboarded ? "learn" : "setup");
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
        <button class="btn wide">Start my path</button>
      </form>
    </main>`;
  }

  function setupAfter(profile) {
    $("#setup-form").addEventListener("submit", (event) => {
      event.preventDefault();
      readPreferences(event.target, profile);
      profile.onboarded = true;
      store.save();
      go("learn");
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
      return `<section><div class="unit-banner"><h2>${unit.title}</h2><p>${unit.blurb}</p></div><div class="path">${nodes}</div></section>`;
    }).join("");
    const pct = Math.min(1, stats.xp / profile.goalXp);
    const bubble = rest ? "That's plenty for today. Rest your eyes, and I'll see you tomorrow!"
      : stats.lessons ? "Good work today. Remember to look at something far away for 20 seconds."
      : streak ? `You're on a ${streak}-day streak. Let's keep it going!`
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
        ${profile.guest ? `<div class="card small"><strong>You're playing as a guest.</strong><br><span class="muted">Your progress is kept in this browser while you stay in guest mode. Give yourself a name to keep it for good.</span>
          <a class="btn ghost wide" style="margin-top:12px" href="#/settings?keep">Keep my progress</a></div>` : ""}
        ${profile.freezes ? `<div class="card small"><strong>Streak protection: ${profile.freezes}</strong><br><span class="muted">Each one saves your streak if you miss a day. You earn one every 7 days, up to 2.</span></div>` : ""}
      </aside>
    </main>`;
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
          ${icons.mascot(84)}
          <h1 id="finish-title">Lesson complete!</h1>
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
    const summary = Rules.completeLesson(profile, lessonId, results, today());
    store.save();
    celebrate(summary, lessonId);
  }

  function celebrate(summary, lessonId) {
    $("#again").setAttribute("href", `#/lesson/${lessonId}`);
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
    const parts = [notes[summary.streakOutcome]];
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
    leaveFullscreen();
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
        <div class="card stat"><b>${profile.sessions.length}</b><span>Lessons over ${plural(active.size, "day")}</span></div>
      </div>
      ${reportView(report, profile)}
      <section class="card section"><h2>Last 12 weeks</h2><div class="calendar" aria-label="Calendar of days you practiced">${cells}</div></section>
      <section class="card section"><h2>Badges</h2><div class="badges">${badges}</div></section>
    </main>`;
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
    const [path, query = ""] = location.hash.replace(/^#\/?/, "").split("?");
    const [screen, arg] = path.split("/");
    const profile = store.current();

    if (screen === "new") return render(newView(), newAfter);
    if (!profile) return render(welcomeView(), welcomeAfter);
    if (!profile.onboarded && screen !== "setup") return go("setup");

    switch (screen) {
      case "setup":
        return render(setupView(profile), () => setupAfter(profile));
      case "learn":
        return render(learnView(profile));
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
        return go("learn");
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
