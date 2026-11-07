// The rules of EyeQuest Arcade: the lesson path, streaks, XP, stars, levels and badges.
// No screen code lives here, so the rules can be tested with Node (see tests/).
(function (exports) {
  "use strict";

  const MAX_FREEZES = 2;
  const FREEZE_EVERY = 7;
  const DAILY_LESSON_LIMIT = 6; // past this we suggest resting, and lessons stop earning XP
  const GOAL_OPTIONS = { 10: "Light", 20: "Regular", 30: "Focused" };
  const XP_PER_LEVEL = 100;

  const GAMES = {
    firefly: {
      name: "Firefly Catch",
      how: "Click the glowing firefly as it drifts around. Leave the grey moths alone.",
    },
    stars: {
      name: "Star Snap",
      how: "Stars pop up anywhere on the screen and fade away. Click each one before it's gone.",
      // One version is picked each time you play.
      variants: {
        classic: { name: "Star Snap", how: "Stars pop up anywhere on the screen and fade away. Click each one before it's gone." },
        constellation: { name: "Star Snap: Constellations", how: "Click the stars in number order, 1, 2, 3 and so on, to join them into a constellation. Each new one has an extra star." },
        shooting: { name: "Star Snap: Shooting Stars", how: "Stars streak across the sky. Click them before they fly off the screen." },
      },
    },
    odd: {
      name: "Odd One Out",
      how: "Every letter in the crowd is the same except one look-alike, like a b among d's or a Q among O's. Click the odd one out. They get smaller and closer together as you improve.",
    },
    hunt: {
      name: "Shape Hunt",
      how: "The box at the top shows a shape. Click every matching shape in the crowd. Watch out for look-alikes later on.",
    },
    diff: {
      name: "Spot the Difference",
      how: "The two pictures are almost the same. Click each thing that's different: a missing shape, a swapped shape, or one that's bigger or smaller.",
    },
    count: {
      name: "Dot Count",
      how: "A group of dots flashes in the middle for a moment. Type how many there were, or click the number at the bottom.",
    },
    trace: {
      name: "Line Tracer",
      how: "Put the mouse on the start circle, then follow the path to the end without slipping off. Each path is thinner than the last.",
    },
    glance: {
      name: "Side Glance",
      how: "Keep your eyes on the dot in the middle. A letter flashes off to the side. Type that letter, or click it at the bottom. Don't look away from the dot!",
    },
  };

  // The name and instructions for a game, or for one version of it.
  function gameInfo(game, variant) {
    const info = GAMES[game];
    return (variant && info.variants && info.variants[variant]) || info;
  }

  // Picks the version of a game for one play. `pick` is a number from 0 up to 1.
  function pickVariant(game, pick = Math.random()) {
    const variants = GAMES[game].variants;
    if (!variants) return null;
    const names = Object.keys(variants);
    return names[Math.min(names.length - 1, Math.floor(pick * names.length))];
  }

  // No game runs longer than this.
  const MAX_GAME_SECONDS = 30;
  const step = (game, eye, params) => ({ game, eye, params: { ...params, seconds: MAX_GAME_SECONDS } });
  const firefly = (eye, speed = 0.2, moths = 3) => step("firefly", eye, { speed, moths });
  const stars = (eye, life = 1.8) => step("stars", eye, { life });
  // start is the letter size in pixels to begin with.
  const odd = (eye, start = 34, contrast = 1) => step("odd", eye, { start, contrast });
  const hunt = (eye, crowd = 14, size = 46, contrast = 1) => step("hunt", eye, { crowd, size, contrast });
  // distance is how far out the letter starts, as a share of the screen; flash is in milliseconds.
  const glance = (eye, size = 44, distance = 0.18, flash = 350, contrast = 1) => step("glance", eye, { size, distance, flash, contrast });
  const diff = (eye, items = 10, diffs = 3, contrast = 1) => step("diff", eye, { items, diffs, contrast });
  // flash is in milliseconds; dots is roughly how many dots to start with.
  const count = (eye, flash = 700, dots = 3, contrast = 1) => step("count", eye, { flash, dots, contrast });
  const trace = (eye, width = 46, contrast = 1) => step("trace", eye, { width, contrast });

  // Each lesson is a single game. eye "both" keeps both eyes open. eye "solo" means
  // the stronger eye is covered, so the lazy eye does the work.
  const UNITS = [
    {
      id: "u1", title: "Warm up", blurb: "Learn the games with both eyes open.",
      lessons: [
        ["Meet the firefly", firefly("both", 0.16, 2)],
        ["Star snapping", stars("both", 2.0)],
        ["Shape hunt", hunt("both", 12, 50)],
        ["Spot the difference", diff("both", 9, 3)],
        ["Dot count", count("both", 800, 3)],
        ["Side glance", glance("both", 48, 0.16, 400)],
        ["Line tracer", trace("both", 50)],
        ["Odd one out", odd("both", 36)],
      ],
    },
    {
      id: "u2", title: "Solo eye", blurb: "Cover your stronger eye and let the lazy eye lead.",
      lessons: [
        ["Solo firefly", firefly("solo", 0.18, 3)],
        ["Solo stars", stars("solo", 1.8)],
        ["Solo shapes", hunt("solo", 14, 46)],
        ["Solo differences", diff("solo", 10, 3)],
        ["Solo dot count", count("solo", 700, 3)],
        ["Solo glance", glance("solo", 44, 0.18, 350)],
        ["Solo tracer", trace("solo", 46)],
        ["Solo odd one out", odd("solo", 32)],
      ],
    },
    {
      id: "u3", title: "Sharpen up", blurb: "Smaller detail, busier crowds and quicker flashes.",
      lessons: [
        ["Crowded letters", odd("solo", 26)],
        ["Look-alikes", hunt("solo", 20, 38)],
        ["Tiny differences", diff("solo", 13, 4)],
        ["Quick glance", glance("solo", 36, 0.22, 280)],
        ["Quick count", count("solo", 500, 4)],
        ["Narrow path", trace("solo", 34)],
        ["Quick stars", stars("solo", 1.3)],
        ["Fast firefly", firefly("solo", 0.24, 4)],
      ],
    },
    {
      id: "u4", title: "Team up", blurb: "Bring both eyes back together, with fainter detail.",
      lessons: [
        ["Busy sky", stars("both", 1.2)],
        ["Back together", firefly("both", 0.28, 5)],
        ["Faint shapes", hunt("both", 22, 36, 0.6)],
        ["Faint differences", diff("both", 14, 4, 0.6)],
        ["Wide glance", glance("both", 34, 0.28, 260, 0.7)],
        ["Faint dots", count("both", 450, 5, 0.6)],
        ["Faint path", trace("both", 32, 0.6)],
        ["Faint crowd", odd("both", 24, 0.6)],
      ],
    },
  ];

  // The daily mix is one solo-eye game, picked at random each time.
  const MIX_GAMES = [
    firefly("solo", 0.28, 4),
    hunt("solo", 22, 36, 0.7),
    diff("solo", 14, 4, 0.7),
    stars("solo", 1.2),
    count("solo", 450, 5, 0.8),
    glance("solo", 34, 0.26, 260, 0.8),
    trace("solo", 30, 0.8),
    odd("solo", 24, 0.6),
  ];
  const DAILY_MIX = { id: "mix", title: "Daily mix", unit: "Daily mix", steps: [MIX_GAMES[0]] };

  const LESSONS = [];
  for (const unit of UNITS) {
    unit.lessons.forEach(([title, game], index) => {
      LESSONS.push({ id: `${unit.id}l${index + 1}`, title, unit: unit.title, steps: [game] });
    });
  }
  const ORDER = LESSONS.map((lesson) => lesson.id);
  const BY_ID = Object.fromEntries(LESSONS.map((lesson) => [lesson.id, lesson]));
  BY_ID.mix = DAILY_MIX;

  // The game a lesson plays.
  // The daily mix picks a game at random each time. `pick` is a number from 0 up to 1.
  function lessonSteps(lessonId, pick = Math.random()) {
    if (lessonId === "mix") return [MIX_GAMES[Math.min(MIX_GAMES.length - 1, Math.floor(pick * MIX_GAMES.length))]];
    return BY_ID[lessonId].steps;
  }

  // The first unfinished lesson, or the daily mix once the path is done.
  function nextLessonId(completed) {
    return ORDER.find((id) => !(id in completed)) || "mix";
  }

  function isUnlocked(lessonId, completed) {
    if (lessonId === "mix") return ORDER.every((id) => id in completed);
    const position = ORDER.indexOf(lessonId);
    if (position < 0) return false;
    return position === 0 || ORDER[position - 1] in completed;
  }

  // Which eye does the work. If unsure, the eyes take turns day by day.
  function soloEye(weakEye, dayNumber) {
    if (weakEye === "left" || weakEye === "right") return weakEye;
    return dayNumber % 2 === 0 ? "left" : "right";
  }

  const otherEye = (eye) => (eye === "left" ? "right" : "left");

  // ---------- days ----------
  // Days are the person's own calendar days, not UTC ones.

  function dayString(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function dayNumber(day) {
    const [y, m, d] = day.split("-").map(Number);
    return Math.round(Date.UTC(y, m - 1, d) / 86400000);
  }

  const daysBetween = (from, to) => dayNumber(to) - dayNumber(from);

  function addDays(day, count) {
    const [y, m, d] = day.split("-").map(Number);
    return dayString(new Date(y, m - 1, d + count));
  }

  // ---------- streaks, XP and stars ----------

  // Apply one day's activity. Returns { streak, freezes, outcome }, where outcome is
  // "same_day", "started", "extended", "frozen" or "reset".
  function updateStreak(streak, lastActive, freezes, today) {
    let outcome;
    if (!lastActive) {
      streak = 1;
      outcome = "started";
    } else {
      const gap = daysBetween(lastActive, today);
      const missed = gap - 1;
      if (gap <= 0) return { streak, freezes, outcome: "same_day" };
      if (missed === 0) {
        streak += 1;
        outcome = "extended";
      } else if (missed <= freezes) {
        freezes -= missed;
        streak += 1;
        outcome = "frozen";
      } else {
        streak = 1;
        outcome = "reset";
      }
    }
    if (streak % FREEZE_EVERY === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
    return { streak, freezes, outcome };
  }

  // The streak to show, which is 0 once it can no longer be saved.
  function currentStreak(streak, lastActive, freezes, today) {
    if (!lastActive) return 0;
    const missed = daysBetween(lastActive, today) - 1;
    return missed <= freezes ? streak : 0;
  }

  function starsFor(score) {
    if (score >= 85) return 3;
    if (score >= 60) return 2;
    return 1;
  }

  function xpFor(stars, lessonsDoneToday) {
    if (lessonsDoneToday >= DAILY_LESSON_LIMIT) return 0;
    return { 1: 10, 2: 12, 3: 15 }[stars];
  }

  const levelFor = (xp) => Math.floor(xp / XP_PER_LEVEL) + 1;

  const BADGES = {
    first_lesson: ["First look", "Finish your first lesson"],
    streak_3: ["Three in a row", "Reach a 3-day streak"],
    streak_7: ["Full week", "Reach a 7-day streak"],
    streak_30: ["Month of focus", "Reach a 30-day streak"],
    xp_100: ["Warmed up", "Earn 100 XP"],
    xp_500: ["Going strong", "Earn 500 XP"],
    three_stars: ["Bullseye", "Get 3 stars on a lesson"],
    ten_lessons: ["Regular", "Finish 10 lessons"],
  };

  function earnedBadges(bestStreak, xp, lessons, bestStars) {
    const checks = {
      first_lesson: lessons >= 1,
      streak_3: bestStreak >= 3,
      streak_7: bestStreak >= 7,
      streak_30: bestStreak >= 30,
      xp_100: xp >= 100,
      xp_500: xp >= 500,
      three_stars: bestStars >= 3,
      ten_lessons: lessons >= 10,
    };
    return Object.keys(checks).filter((badge) => checks[badge]);
  }

  // ---------- finishing a lesson ----------

  // Scores must be real numbers from 0 to 100, whatever a game reports.
  const clampScore = (value) => (Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0);

  // Records a finished lesson on a profile (changing it) and returns what happened.
  function completeLesson(profile, lessonId, steps, today) {
    if (!BY_ID[lessonId]) throw new Error(`Unknown lesson ${lessonId}`);
    if (!isUnlocked(lessonId, profile.lessons)) throw new Error("That lesson is still locked.");
    const cleanSteps = steps.map((s) => ({
      game: s.game,
      ...(typeof s.variant === "string" && GAMES[s.game] && GAMES[s.game].variants && s.variant in GAMES[s.game].variants ? { variant: s.variant } : {}),
      eye: s.eye,
      score: clampScore(s.score),
      metrics: Object.fromEntries(
        Object.entries(s.metrics || {}).filter(([, v]) => Number.isFinite(v)),
      ),
    }));
    const score = cleanSteps.reduce((sum, s) => sum + s.score, 0) / Math.max(1, cleanSteps.length);
    const stars = starsFor(score);
    const doneToday = profile.sessions.filter((s) => s.day === today).length;
    const xp = xpFor(stars, doneToday);
    const { streak, freezes, outcome } = updateStreak(profile.streak, profile.lastActive, profile.freezes, today);
    const xpTodayBefore = profile.sessions.filter((s) => s.day === today).reduce((sum, s) => sum + s.xp, 0);

    profile.sessions.push({ day: today, lessonId, score, stars, xp, steps: cleanSteps });
    profile.lessons[lessonId] = Math.max(profile.lessons[lessonId] || 0, stars);
    profile.xp += xp;
    profile.streak = streak;
    profile.freezes = freezes;
    profile.bestStreak = Math.max(profile.bestStreak, streak);
    profile.lastActive = today;

    const bestStars = Math.max(...Object.values(profile.lessons), 0);
    const newBadges = earnedBadges(profile.bestStreak, profile.xp, profile.sessions.length, bestStars)
      .filter((badge) => !(badge in profile.badges));
    newBadges.forEach((badge) => { profile.badges[badge] = today; });

    const xpToday = xpTodayBefore + xp;
    return {
      score: Math.round(score),
      stars,
      xp,
      streak,
      streakOutcome: outcome,
      freezes,
      xpToday,
      goal: profile.goalXp,
      goalJustMet: xpTodayBefore < profile.goalXp && xpToday >= profile.goalXp,
      rest: doneToday + 1 >= DAILY_LESSON_LIMIT,
      newBadges: newBadges.map((badge) => BADGES[badge][0]),
    };
  }

  // ---------- the eye report ----------
  // Every game feeds one or more skills, scored 0 to 100 from what the game measured.
  // These come from the games, not an eye exam: they show your own trend, not a diagnosis.
  const SKILLS = {
    sharpness: { name: "Sharpness", about: "Seeing small detail", from: "Odd One Out" },
    side: { name: "Side vision", about: "Noticing things out of the corner of your eye", from: "Side Glance" },
    speed: { name: "Visual speed", about: "Taking in what you see in a quick glance", from: "Dot Count, Side Glance, Star Snap" },
    tracking: { name: "Tracking", about: "Following things that move", from: "Firefly Catch, Shooting Stars" },
    search: { name: "Searching", about: "Finding things in a busy scene", from: "Shape Hunt, Spot the Difference, Constellations" },
    control: { name: "Hand-eye control", about: "Guiding your hand with your eyes", from: "Line Tracer" },
  };

  const clamp100 = (v) => Math.max(0, Math.min(100, v));
  // Maps a measurement onto 0-100, where `worst` scores 0 and `best` scores 100.
  const scale = (value, worst, best) => clamp100((100 * (value - worst)) / (best - worst));

  function skillPoints(step) {
    const m = step.metrics || {};
    const out = {};
    switch (step.game) {
      case "odd":
        if ("smallest_letter" in m) out.sharpness = scale(m.smallest_letter, 40, 11);
        break;
      case "glance":
        if ("reach" in m) out.side = scale(m.reach, 0.05, 0.4);
        if ("quickest_ms" in m) out.speed = scale(m.quickest_ms, 600, 120);
        break;
      case "count":
        if ("quickest_ms" in m) out.speed = scale(m.quickest_ms, 1000, 150);
        break;
      case "stars":
        if (step.variant === "shooting") {
          if (m.caught + m.missed > 0) out.tracking = clamp100((100 * m.caught) / (m.caught + m.missed));
        }
        else if (step.variant === "constellation" && "joined" in m) out.search = clamp100(5 * m.joined - 4 * (m.mistakes || 0));
        else if ("reaction_ms" in m && m.reaction_ms > 0) out.speed = scale(m.reaction_ms, 1600, 400);
        break;
      case "firefly":
        if ("per_minute" in m) out.tracking = clamp100(scale(m.per_minute, 0, 24) - 5 * (m.moth_hits || 0));
        break;
      case "hunt":
      case "diff":
        if (Number.isFinite(step.score)) out.search = clamp100(step.score);
        break;
      case "trace":
        if (Number.isFinite(step.score)) out.control = clamp100(step.score);
        break;
      default:
        break;
    }
    return out;
  }

  const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;

  // Which eye a game was played with: "both", "lazy", or "left"/"right" if the lazy eye
  // isn't known.
  function eyeGroup(eye, weakEye) {
    if (eye === "both") return "both";
    if (eye === weakEye) return "lazy";
    return eye === "left" || eye === "right" ? eye : "both";
  }

  const GROUP_NAMES = { lazy: "Lazy eye alone", both: "Both eyes", left: "Left eye alone", right: "Right eye alone" };

  function skillReport(profile) {
    const points = [];
    profile.sessions.forEach((session, order) => {
      for (const step of session.steps) {
        const group = eyeGroup(step.eye, profile.weakEye);
        for (const [skill, value] of Object.entries(skillPoints(step))) points.push({ day: session.day, order, group, skill, value });
      }
    });
    const RECENT = 3; // games averaged for "now" and for "when you started"
    const byDay = (list) => {
      const days = {};
      for (const pt of list) (days[pt.day] ||= []).push(pt.value);
      return Object.keys(days).sort().map((day) => ({ day, value: Math.round(mean(days[day])) }));
    };

    const skills = Object.entries(SKILLS).map(([id, info]) => {
      const mine = points.filter((pt) => pt.skill === id);
      const values = mine.map((pt) => pt.value);
      const series = byDay(mine);
      const level = values.length ? Math.round(mean(values.slice(-RECENT))) : null;
      // Change only means something once there's a start and a now, on different days.
      const change = values.length >= RECENT + 1 && series.length >= 2
        ? level - Math.round(mean(values.slice(0, RECENT))) : null;
      const byEye = {};
      for (const group of new Set(mine.map((pt) => pt.group))) {
        byEye[group] = Math.round(mean(mine.filter((pt) => pt.group === group).map((pt) => pt.value).slice(-RECENT)));
      }
      return { id, ...info, level, change, series, byEye, games: values.length };
    });

    // The headline: one score per day for each eye group, averaging every skill played.
    const groups = [...new Set(points.map((pt) => pt.group))].sort((a, b) => (a === "both") - (b === "both"));
    const overall = groups.map((group) => ({ group, name: GROUP_NAMES[group], points: byDay(points.filter((pt) => pt.group === group)) }));

    // How far the lazy eye is behind both eyes, at the start and now.
    let lazyGap = null;
    const lazy = overall.find((o) => o.group === "lazy"), both = overall.find((o) => o.group === "both");
    if (lazy && both && lazy.points.length >= 2 && both.points.length >= 2) {
      const gapAt = (pick) => Math.round(mean(pick(both.points).map((p) => p.value)) - mean(pick(lazy.points).map((p) => p.value)));
      lazyGap = { start: gapAt((list) => list.slice(0, 2)), now: gapAt((list) => list.slice(-2)) };
    }

    const measured = skills.filter((s) => s.level !== null);
    const improving = skills.filter((s) => s.change !== null && s.change > 0).sort((a, b) => b.change - a.change);
    return {
      skills,
      overall,
      lazyGap,
      mostImproved: improving[0] || null,
      workOn: measured.length >= 2 ? measured.slice().sort((a, b) => a.level - b.level)[0] : null,
      untested: skills.filter((s) => s.level === null),
    };
  }

  Object.assign(exports, {
    MAX_GAME_SECONDS, MAX_FREEZES, FREEZE_EVERY, DAILY_LESSON_LIMIT, GOAL_OPTIONS, XP_PER_LEVEL,
    GAMES, UNITS, DAILY_MIX, MIX_GAMES, LESSONS, ORDER, BY_ID, BADGES,
    SKILLS, skillPoints, skillReport, eyeGroup,
    lessonSteps, gameInfo, pickVariant, nextLessonId, isUnlocked, soloEye, otherEye,
    dayString, dayNumber, daysBetween, addDays,
    updateStreak, currentStreak, starsFor, xpFor, levelFor, earnedBadges, completeLesson,
  });
})(typeof module !== "undefined" ? module.exports : (window.Rules = {}));
