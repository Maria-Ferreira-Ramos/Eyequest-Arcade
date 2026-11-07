// Eye Tracker: the stage list, unlocking, best scores and points (from the Python
// Eye Trainer's stages.py), kept on the same player profile as the arcade.
// A finished stage also counts as a lesson for the day: it earns XP and keeps the streak going.
(function (exports, Rules) {
  "use strict";

  const TIME_CHOICES = [30, 60, 300]; // seconds the player can pick for a timed game
  const DEFAULT_SECONDS = 60;

  const STAGES = [
    { id: "look", name: "Look and score", game: "direction", about: "Look where the arrow points", music: "look_and_score" },
    { id: "balloon", name: "Pop the balloon", game: "balloon", about: "Look at the balloon's colour", music: "pop_the_balloon" },
    { id: "tetris", name: "Tetris", game: "tetris", about: "Turn, store and drop with your eyes", timed: false, music: "tetris" },
    { id: "red", name: "Don't look at red", game: "red", about: "Keep your eyes off the red zone", music: "dont_look_at_red" },
    { id: "runner", name: "Subway runner", game: "runner", about: "Dodge the blocks, collect coins", music: "subway_runner" },
    { id: "gameshow", name: "Gameshow", game: "gameshow", about: "Look at your answer's colour", timed: false, music: "gameshow" },
    { id: "look_hard", name: "Look and score: hard", game: "direction", hard: true, about: "Only 1.5 seconds to look", music: "look_and_score_hard", multiplier: 3 },
    { id: "balloon_hard", name: "Pop the balloon: hard", game: "balloon", hard: true, about: "Faster balloons, and more of them", music: "pop_the_balloon_hard", multiplier: 3 },
    { id: "red_hard", name: "Don't look at red: hard", game: "red", hard: true, about: "More red zones, and faster", music: "dont_look_at_red_hard", multiplier: 3 },
  ].map((stage) => ({ timed: true, hard: false, multiplier: 1, ...stage }));

  // The tracker's part of a profile, added the first time it's needed.
  function progress(profile) {
    if (!profile.tracker) profile.tracker = { best: {}, points: 0, seconds: DEFAULT_SECONDS };
    const t = profile.tracker;
    t.best ||= {};
    t.points ||= 0;
    if (!TIME_CHOICES.includes(t.seconds)) t.seconds = DEFAULT_SECONDS;
    return t;
  }

  const isCompleted = (profile, index) => String(index) in progress(profile).best;
  const isUnlocked = (profile, index) => index === 0 || isCompleted(profile, index - 1);
  const bestScore = (profile, index) => progress(profile).best[String(index)];
  const totalPoints = (profile) => progress(profile).points;

  // Stars for a stage, from the points it earned (hard stages count 3 times).
  function starsForPoints(earned) {
    if (earned >= 25) return 3;
    if (earned >= 10) return 2;
    return 1;
  }

  // Records a finished stage (changing the profile) and returns what happened.
  // Like the Python version: the best score is kept, every point is added to the total,
  // and finishing a stage for the first time unlocks the next one.
  function completeStage(profile, index, score, today) {
    const stage = STAGES[index];
    if (!stage) throw new Error(`Unknown stage ${index}`);
    if (!isUnlocked(profile, index)) throw new Error("That stage is still locked.");
    const t = progress(profile);
    const clean = Number.isFinite(score) ? Math.max(0, Math.round(score)) : 0;
    const key = String(index);
    const old = t.best[key];
    const firstTime = old === undefined;
    const earned = clean * stage.multiplier;
    t.best[key] = firstTime ? clean : Math.max(old, clean);
    t.points += earned;

    // The shared part: XP, the daily goal, the streak and badges, like an arcade lesson.
    const stars = starsForPoints(earned);
    const doneToday = profile.sessions.filter((s) => s.day === today).length;
    const xp = Rules.xpFor(stars, doneToday);
    const xpTodayBefore = profile.sessions.filter((s) => s.day === today).reduce((sum, s) => sum + s.xp, 0);
    const { streak, freezes, outcome } = Rules.updateStreak(profile.streak, profile.lastActive, profile.freezes, today);
    profile.sessions.push({ day: today, lessonId: `tracker:${stage.id}`, tracker: true, score: clean, stars, xp, steps: [] });
    profile.xp += xp;
    profile.streak = streak;
    profile.freezes = freezes;
    profile.bestStreak = Math.max(profile.bestStreak, streak);
    profile.lastActive = today;
    const bestStars = Math.max(...Object.values(profile.lessons), 0);
    const newBadges = Rules.earnedBadges(profile.bestStreak, profile.xp, profile.sessions.length, bestStars)
      .filter((badge) => !(badge in profile.badges));
    newBadges.forEach((badge) => { profile.badges[badge] = today; });
    const xpToday = xpTodayBefore + xp;

    return {
      score: clean,
      earned,
      totalPoints: t.points,
      newBest: !firstTime && clean > old,
      unlocked: firstTime && index + 1 < STAGES.length ? STAGES[index + 1].name : null,
      xp,
      streak,
      streakOutcome: outcome,
      goalJustMet: xpTodayBefore < profile.goalXp && xpToday >= profile.goalXp,
      rest: doneToday + 1 >= Rules.DAILY_LESSON_LIMIT,
      newBadges: newBadges.map((badge) => Rules.BADGES[badge][0]),
    };
  }

  // Secret codes from the Python version's Info screen.
  function resetProgress(profile) {
    const t = progress(profile);
    t.best = {};
    t.points = 0;
  }
  function unlockAll(profile) {
    const t = progress(profile);
    STAGES.forEach((_, index) => { if (!(String(index) in t.best)) t.best[String(index)] = 0; });
  }

  const timeLabel = (seconds) => (seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds} s`);

  Object.assign(exports, {
    STAGES, TIME_CHOICES, DEFAULT_SECONDS,
    progress, isCompleted, isUnlocked, bestScore, totalPoints, starsForPoints, completeStage,
    resetProgress, unlockAll, timeLabel,
  });
})(
  typeof module !== "undefined" ? module.exports : (window.TrackerRules = {}),
  typeof module !== "undefined" ? require("./rules.js") : window.Rules,
);
