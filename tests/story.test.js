// Run with: node --test
const test = require("node:test");
const assert = require("node:assert/strict");
const Rules = require("../js/rules.js");
const Story = require("../js/story.js");

test("every lesson on the path relights its own star, and the mix relights none", () => {
  const names = new Set();
  for (const id of Rules.ORDER) {
    const star = Story.starFor(id);
    assert.ok(star, `${id} has a star`);
    names.add(star.name);
  }
  assert.equal(names.size, Rules.ORDER.length, "no two lessons share a star");
  assert.equal(Story.totalStars(), Rules.ORDER.length);
  assert.equal(Story.starFor("mix"), null);
  assert.equal(Story.starFor("u9l1"), null);
});

test("each land matches a unit of the path, with a constellation for every star", () => {
  assert.deepEqual(Story.LANDS.map((l) => l.unit), Rules.UNITS.map((u) => u.id));
  Story.LANDS.forEach((land, i) => {
    assert.equal(land.name, Rules.UNITS[i].title);
    const shape = Story.SHAPES[land.id];
    assert.equal(shape.points.length, land.stars.length);
    for (const [a, b] of shape.lines) assert.ok(a < land.stars.length && b < land.stars.length);
    assert.ok(land.intro.length >= 2 && land.done);
  });
});

test("the sky lights up as lessons are finished, as brightly as they were played", () => {
  assert.equal(Story.litCount({}), 0);
  const sky = Story.sky({ u1l1: 3, u1l2: 1, u2l1: 2 });
  assert.equal(sky[0].lit, 2);
  assert.equal(sky[0].stars[0].glow, 3);
  assert.equal(sky[0].stars[2].glow, 0);
  assert.equal(Story.litCount({ u1l1: 3, u1l2: 1, u2l1: 2, mix: 3 }), 3);
});

test("scenes play in story order, each once", () => {
  assert.equal(Story.nextScene({}, "u1l1").id, "prologue");
  assert.equal(Story.nextScene({ prologue: true }, "u1l1").id, "meadow");
  assert.equal(Story.nextScene({ prologue: true, meadow: true }, "u1l3"), null);
  assert.equal(Story.nextScene({ prologue: true, meadow: true }, "u2l1").id, "caves");
  assert.equal(Story.nextScene({ prologue: true, meadow: true, caves: true, library: true, observatory: true }, "mix").id, "finale");
  assert.equal(Story.nextScene({ prologue: true, finale: true }, "mix"), null);
  assert.deepEqual(Story.allScenes().map((s) => s.id), ["prologue", "meadow", "caves", "library", "observatory", "finale"]);
});

test("Blink has something to say for every result", () => {
  for (const stars of [1, 2, 3]) {
    const lines = new Set([0, 0.3, 0.6, 0.99].map((pick) => Story.reaction(stars, pick)));
    assert.ok(lines.size >= 3, "several different lines");
  }
  assert.ok(Story.reaction(7)); // anything unexpected still gets a line
});
