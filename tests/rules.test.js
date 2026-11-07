// Run with: node --test
const test = require("node:test");
const assert = require("node:assert/strict");
const Rules = require("../js/rules.js");
const Store = require("../js/store.js");

test("streaks start, extend, freeze and reset", () => {
  const cases = [
    [0, null, 0, "2026-03-02", 1, 0, "started"],
    [3, "2026-03-01", 0, "2026-03-02", 4, 0, "extended"],
    [3, "2026-03-02", 0, "2026-03-02", 3, 0, "same_day"],
    [3, "2026-02-28", 1, "2026-03-02", 4, 0, "frozen"],
    [3, "2026-02-27", 1, "2026-03-02", 1, 1, "reset"],
    [6, "2026-03-01", 0, "2026-03-02", 7, 1, "extended"], // a week earns protection
    [13, "2026-03-01", 2, "2026-03-02", 14, 2, "extended"], // capped at 2
  ];
  for (const [streak, last, freezes, today, wantStreak, wantFreezes, wantOutcome] of cases) {
    const got = Rules.updateStreak(streak, last, freezes, today);
    assert.deepEqual(got, { streak: wantStreak, freezes: wantFreezes, outcome: wantOutcome }, `${streak} ${last} ${today}`);
  }
});

test("streak days cross month and year ends", () => {
  assert.equal(Rules.daysBetween("2026-12-31", "2027-01-01"), 1);
  assert.equal(Rules.addDays("2026-02-28", 1), "2026-03-01");
  assert.equal(Rules.updateStreak(5, "2026-12-31", 0, "2027-01-01").outcome, "extended");
});

test("the shown streak drops to zero once it can't be saved", () => {
  assert.equal(Rules.currentStreak(5, "2026-03-01", 0, "2026-03-02"), 5);
  assert.equal(Rules.currentStreak(5, "2026-03-01", 0, "2026-03-03"), 0);
  assert.equal(Rules.currentStreak(5, "2026-03-01", 1, "2026-03-03"), 5);
  assert.equal(Rules.currentStreak(0, null, 0, "2026-03-03"), 0);
});

test("XP stops after the daily limit", () => {
  assert.equal(Rules.xpFor(3, 0), 15);
  assert.equal(Rules.xpFor(1, Rules.DAILY_LESSON_LIMIT), 0);
});

test("lessons unlock in order, and the daily mix comes last", () => {
  const [first, second] = Rules.ORDER;
  assert.ok(Rules.isUnlocked(first, {}));
  assert.ok(!Rules.isUnlocked(second, {}));
  assert.ok(Rules.isUnlocked(second, { [first]: 1 }));
  assert.ok(!Rules.isUnlocked("mix", { [first]: 1 }));
  const all = Object.fromEntries(Rules.ORDER.map((id) => [id, 1]));
  assert.ok(Rules.isUnlocked("mix", all));
  assert.equal(Rules.nextLessonId(all), "mix");
  assert.ok(!Rules.isUnlocked("nope", all));
});

test("every lesson uses known games", () => {
  for (const lesson of [...Rules.LESSONS, Rules.DAILY_MIX]) {
    for (const step of lesson.steps) {
      assert.ok(step.game in Rules.GAMES, `${lesson.id} uses ${step.game}`);
      assert.ok(["both", "solo"].includes(step.eye));
    }
  }
});

test("each lesson is one game, and the daily mix can be any game", () => {
  for (const lesson of Rules.LESSONS) assert.equal(lesson.steps.length, 1, lesson.id);
  const picks = Rules.MIX_GAMES.map((_, i) => (i + 0.5) / Rules.MIX_GAMES.length);
  const games = new Set(picks.map((pick) => Rules.lessonSteps("mix", pick)[0].game));
  assert.equal(games.size, Object.keys(Rules.GAMES).length); // every game can turn up in the mix
  assert.equal(Rules.lessonSteps("mix").length, 1);
  assert.deepEqual(Rules.lessonSteps("u1l1"), Rules.BY_ID.u1l1.steps);
  const used = new Set(Rules.LESSONS.map((lesson) => lesson.steps[0].game));
  assert.deepEqual([...used].sort(), Object.keys(Rules.GAMES).sort()); // every game is on the path
});

test("Star Snap comes in three versions, and the version played is saved", () => {
  assert.deepEqual(new Set([0, 0.4, 0.9].map((n) => Rules.pickVariant("stars", n))), new Set(["classic", "constellation", "shooting"]));
  assert.equal(Rules.pickVariant("odd"), null);
  assert.equal(Rules.gameInfo("stars", "shooting").name, "Star Snap: Shooting Stars");
  assert.equal(Rules.gameInfo("odd", null).name, "Odd One Out");
  const p = profile();
  Rules.completeLesson(p, "u1l1", [{ game: "stars", variant: "constellation", eye: "both", score: 80 }], "2026-03-02");
  Rules.completeLesson(p, "u1l1", [{ game: "stars", variant: "made-up", eye: "both", score: 80 }], "2026-03-02");
  assert.equal(p.sessions[0].steps[0].variant, "constellation");
  assert.ok(!("variant" in p.sessions[1].steps[0]));
});

test("no game runs longer than 30 seconds", () => {
  for (const lesson of [...Rules.LESSONS]) assert.equal(lesson.steps[0].params.seconds, 30, lesson.id);
  for (const game of Rules.MIX_GAMES) assert.equal(game.params.seconds, 30);
});

test("unsure users alternate eyes by day", () => {
  assert.equal(Rules.soloEye("left", 7), "left");
  assert.deepEqual(new Set([Rules.soloEye("unknown", 1), Rules.soloEye("unknown", 2)]), new Set(["left", "right"]));
});

function profile() {
  const p = Store.newProfile("Maria");
  p.onboarded = true;
  return p;
}

test("finishing a lesson awards XP, stars, streak and badges", () => {
  const p = profile();
  assert.throws(() => Rules.completeLesson(p, "u1l2", [{ game: "stars", eye: "both", score: 90 }], "2026-03-02"));
  const first = Rules.completeLesson(p, "u1l1", [{ game: "firefly", eye: "both", score: 90, metrics: { catches: 9 } }], "2026-03-02");
  assert.equal(first.stars, 3);
  assert.equal(first.xp, 15);
  assert.equal(first.streak, 1);
  assert.deepEqual(first.newBadges.sort(), ["Bullseye", "First look"]);
  assert.equal(p.lessons.u1l1, 3);
  const next = Rules.completeLesson(p, "u1l2", [{ game: "stars", eye: "both", score: 70 }], "2026-03-03");
  assert.equal(next.streakOutcome, "extended");
  assert.equal(next.streak, 2);
  assert.equal(p.xp, 27);
});

test("replays keep the best stars, and the rest limit stops XP", () => {
  const p = profile();
  const results = [];
  for (let i = 0; i <= Rules.DAILY_LESSON_LIMIT; i += 1) {
    results.push(Rules.completeLesson(p, "u1l1", [{ game: "firefly", eye: "both", score: 90 }], "2026-03-02"));
  }
  assert.equal(results.at(-1).xp, 0);
  assert.ok(results[Rules.DAILY_LESSON_LIMIT - 1].rest);
  Rules.completeLesson(p, "u1l1", [{ game: "firefly", eye: "both", score: 10 }], "2026-03-02");
  assert.equal(p.lessons.u1l1, 3);
});

test("bad scores can't earn a perfect lesson", () => {
  const p = profile();
  const result = Rules.completeLesson(p, "u1l1", [{ game: "firefly", eye: "both", score: NaN, metrics: { catches: Infinity, ok: 2 } }], "2026-03-02");
  assert.equal(result.score, 0);
  assert.deepEqual(p.sessions[0].steps[0].metrics, { ok: 2 });
  const big = Rules.completeLesson(p, "u1l1", [{ game: "firefly", eye: "both", score: 500 }], "2026-03-02");
  assert.equal(big.score, 100);
});

test("the daily goal is reported once, when it's crossed", () => {
  const p = profile();
  p.goalXp = 20;
  assert.equal(Rules.completeLesson(p, "u1l1", [{ game: "firefly", eye: "both", score: 90 }], "2026-03-02").goalJustMet, false);
  assert.equal(Rules.completeLesson(p, "u1l1", [{ game: "firefly", eye: "both", score: 90 }], "2026-03-02").goalJustMet, true);
  assert.equal(Rules.completeLesson(p, "u1l1", [{ game: "firefly", eye: "both", score: 90 }], "2026-03-02").goalJustMet, false);
});

function fakeStorage() {
  const items = {};
  return { getItem: (k) => (k in items ? items[k] : null), setItem: (k, v) => { items[k] = String(v); }, items };
}

test("profiles are saved and come back", () => {
  const storage = fakeStorage();
  const store = Store.makeStore(storage);
  const p = store.create("Maria");
  p.xp = 42;
  store.save();
  const again = Store.makeStore(storage);
  assert.equal(again.current().name, "Maria");
  assert.equal(again.current().xp, 42);
  assert.ok(again.nameTaken("maria"));
  assert.ok(!again.nameTaken("maria", p.id));
  again.remove(p.id);
  assert.equal(again.current(), null);
});

test("blocked or broken storage doesn't break the app", () => {
  const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  const store = Store.makeStore(broken);
  const p = store.create("Guest", true);
  assert.equal(store.current().id, p.id);
  const garbage = { getItem: () => "{not json", setItem: () => {} };
  assert.deepEqual(Store.makeStore(garbage).profiles(), []);
});

// ---------- the eye report ----------

test("each game's measurements become skill points from 0 to 100", () => {
  assert.equal(Rules.skillPoints({ game: "odd", metrics: { smallest_letter: 11 } }).sharpness, 100);
  assert.equal(Rules.skillPoints({ game: "odd", metrics: { smallest_letter: 40 } }).sharpness, 0);
  assert.equal(Rules.skillPoints({ game: "odd", metrics: { smallest_letter: 5 } }).sharpness, 100); // never above 100
  assert.ok(Rules.skillPoints({ game: "glance", metrics: { reach: 0.3, quickest_ms: 200 } }).side > 60);
  assert.equal(Rules.skillPoints({ game: "stars", variant: "shooting", metrics: { caught: 3, missed: 1 } }).tracking, 75);
  assert.ok("search" in Rules.skillPoints({ game: "stars", variant: "constellation", metrics: { joined: 10 } }));
  assert.ok("speed" in Rules.skillPoints({ game: "stars", variant: "classic", metrics: { reaction_ms: 600 } }));
  assert.equal(Rules.skillPoints({ game: "trace", score: 70, metrics: {} }).control, 70);
  assert.deepEqual(Rules.skillPoints({ game: "odd", metrics: { correct: 0 } }), {}); // nothing measured, nothing scored
  assert.deepEqual(Rules.skillPoints({ game: "stars", variant: "shooting", metrics: { caught: 0, missed: 0 } }), {});
  assert.deepEqual(Rules.skillPoints({ game: "gap", metrics: { smallest: 20 } }), {}); // a game that was removed
});

function session(day, game, eye, extra) {
  return { day, lessonId: "u1l1", score: 50, stars: 1, xp: 10, steps: [{ game, eye, score: 50, metrics: {}, ...extra }] };
}

test("the report shows each skill's level, its change since the start, and lazy eye vs both eyes", () => {
  const p = profile();
  p.weakEye = "left";
  // Sharpness improves over four days; the lazy eye starts far behind both eyes and catches up.
  const days = ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04"];
  days.forEach((day, i) => {
    p.sessions.push(session(day, "odd", "left", { metrics: { smallest_letter: 36 - i * 6 } }));
    p.sessions.push(session(day, "odd", "both", { metrics: { smallest_letter: 20 - i } }));
  });
  const report = Rules.skillReport(p);
  const sharp = report.skills.find((s) => s.id === "sharpness");
  assert.equal(sharp.games, 8);
  assert.ok(sharp.change > 0, "sharpness improved");
  assert.deepEqual(Object.keys(sharp.byEye).sort(), ["both", "lazy"]);
  assert.ok(sharp.byEye.both > sharp.byEye.lazy);
  assert.equal(report.mostImproved.id, "sharpness");
  assert.deepEqual(report.overall.map((o) => o.name), ["Lazy eye alone", "Both eyes"]);
  assert.ok(report.lazyGap.now < report.lazyGap.start, "the gap between the eyes shrank");
  assert.ok(report.untested.some((s) => s.id === "control"));
});

test("with the lazy eye unknown, the report compares left and right", () => {
  const p = profile();
  p.weakEye = "unknown";
  p.sessions.push(session("2026-03-01", "trace", "left", { score: 40 }));
  p.sessions.push(session("2026-03-02", "trace", "right", { score: 80 }));
  const report = Rules.skillReport(p);
  assert.deepEqual(report.overall.map((o) => o.group).sort(), ["left", "right"]);
  assert.equal(report.lazyGap, null);
  assert.equal(report.skills.find((s) => s.id === "control").change, null); // too few games to call a trend
});

test("an empty history gives an empty report, not an error", () => {
  const report = Rules.skillReport(profile());
  assert.ok(report.skills.every((s) => s.level === null));
  assert.equal(report.mostImproved, null);
  assert.equal(report.workOn, null);
});
