// The story of EyeQuest Arcade: Blink, the lighthouse keeper of Lumen, needs your help to
// relight the stars after a fog put them out. Each lesson relights one star, and each unit
// of the path is a land with its own constellation. No screen code lives here.
(function (exports) {
  "use strict";

  const PROLOGUE = {
    id: "prologue",
    land: "lighthouse",
    title: "The night the stars went out",
    lines: [
      "Hi, I'm Blink, the lighthouse keeper of Lumen.",
      "Every night my lighthouse sends its light up to the stars, and they shine it back down over the land.",
      "But last night a great grey fog rolled in, and one by one, every star went dark.",
      "I can't relight them on my own. Stars only answer to sharp, patient eyes. That's where you come in.",
      "Each lesson you finish relights one star. Let's start in Firefly Meadow, where the fireflies still remember the light.",
    ],
  };

  // One land per unit of the lesson path, in the same order.
  const LANDS = [
    {
      unit: "u1", id: "meadow", name: "Firefly Meadow", constellation: "the Firefly",
      color: "#2f8f5b", sky: ["#0f2b2a", "#1d4a37"],
      stars: ["Glimmer", "Dewdrop", "Clover", "Ember", "Thistle", "Wisp", "Hearth", "Bramble"],
      intro: [
        "Welcome to Firefly Meadow. When the fog came, the fireflies here hid a little starlight in their glow.",
        "Catch them, follow them, find what they hid, and their light will float back up to the sky.",
        "Keep both eyes open here. We're just warming up.",
      ],
      done: "Firefly Meadow is glowing again, and the Firefly constellation is back in the sky!",
    },
    {
      unit: "u2", id: "caves", name: "Crystal Caves", constellation: "the Crystal",
      color: "#3b6fd6", sky: ["#101b3d", "#1f3270"],
      stars: ["Quartz", "Prism", "Opal", "Facet", "Geode", "Shard", "Beryl", "Gleam"],
      intro: [
        "These are the Crystal Caves. The fog couldn't get in here, so the crystals still hold starlight.",
        "But it's dim inside, and the crystals only show their true shapes to one eye at a time.",
        "Cover your stronger eye and let your other eye lead the way. It's braver than you think.",
      ],
      done: "The Crystal constellation sparkles over the caves again!",
    },
    {
      unit: "u3", id: "library", name: "Whispering Library", constellation: "the Open Book",
      color: "#b0662a", sky: ["#2a1a12", "#4a2c18"],
      stars: ["Quill", "Inkwell", "Margin", "Folio", "Verse", "Index", "Lantern", "Riddle"],
      intro: [
        "Shh. This is the Whispering Library. Every star's name is written somewhere in these books.",
        "The letters are tiny, they hide among look-alikes, and some only flicker at the edge of your eye.",
        "Read them true, and the stars will remember who they are.",
      ],
      done: "The Open Book is written across the sky again. Every name remembered!",
    },
    {
      unit: "u4", id: "observatory", name: "Star Observatory", constellation: "the Lighthouse",
      color: "#6a4fd8", sky: ["#14112e", "#2b2160"],
      stars: ["Zenith", "Orbit", "Comet", "Nova", "Halo", "Meridian", "Aurora", "Polaris"],
      intro: [
        "We made it to the Star Observatory, at the very top of the world.",
        "From here, both your eyes can work together to pull the last stars back into place.",
        "Light these, and the whole sky over Lumen shines again.",
      ],
      done: "The Lighthouse constellation is shining. That was the last one!",
    },
  ];

  const FINALE = {
    id: "finale",
    land: "lighthouse",
    title: "A sky full of stars",
    lines: [
      "Look up. Every star over Lumen is shining again.",
      "The fog is gone, and the fireflies are dancing under a full sky.",
      "You did this, one patient look at a time.",
      "I'll keep the lighthouse burning. Come back for the daily mix, and we'll keep the sky bright together.",
    ],
  };

  // Constellation shapes, as points inside a 250 x 340 box, and the lines joining them.
  // Star n of a land is relit by lesson n of its unit.
  const SHAPES = {
    meadow: {
      points: [[50, 200], [95, 170], [140, 160], [185, 175], [110, 105], [72, 75], [165, 92], [210, 230]],
      lines: [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [2, 6], [3, 7]],
    },
    caves: {
      points: [[125, 50], [78, 125], [172, 125], [52, 210], [198, 210], [125, 300], [105, 175], [145, 175]],
      lines: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5], [1, 6], [2, 7], [6, 7]],
    },
    library: {
      points: [[35, 110], [125, 140], [215, 110], [35, 260], [125, 290], [215, 260], [80, 190], [170, 190]],
      lines: [[0, 1], [1, 2], [0, 3], [3, 4], [4, 5], [2, 5], [1, 4], [6, 7]],
    },
    observatory: {
      points: [[125, 40], [100, 95], [150, 95], [92, 180], [158, 180], [82, 285], [168, 285], [125, 135]],
      lines: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 6]],
    },
  };

  // What Blink says after a lesson. Several lines for each result, so it doesn't repeat.
  const REACTIONS = {
    3: [
      "That star is blazing! I can see it from the lighthouse.",
      "Wow, the brightest one yet. The fog doesn't stand a chance.",
      "Perfect. Even the fireflies stopped to look.",
      "Now that's how you relight a star!",
    ],
    2: [
      "It's shining nicely. Lumen is getting brighter.",
      "Good work. I can see it twinkling from here.",
      "That star's glowing warm and steady.",
      "Nice! Play it again sometime and it'll shine even brighter.",
    ],
    1: [
      "It's glowing faintly, but it's lit. Every bit of light counts.",
      "A small light is still a light. Try again tomorrow and it'll grow.",
      "That one was tricky, but you didn't give up. The star noticed.",
      "Lit! Come back later and we'll make it shine brighter.",
    ],
  };

  const landForLesson = (lessonId) => LANDS.find((land) => lessonId.startsWith(`${land.unit}l`)) || null;

  // The star a lesson relights, or null for the daily mix.
  function starFor(lessonId) {
    const land = landForLesson(lessonId);
    if (!land) return null;
    const index = Number(lessonId.slice(land.unit.length + 1)) - 1;
    if (!(index >= 0 && index < land.stars.length)) return null;
    return { land, index, name: land.stars[index] };
  }

  // Every star in the sky, with how brightly it shines (0 = still dark, 1 to 3 = stars earned).
  function sky(completed) {
    return LANDS.map((land) => {
      const stars = land.stars.map((name, index) => ({ name, index, glow: completed[`${land.unit}l${index + 1}`] || 0 }));
      return { land, stars, lit: stars.filter((s) => s.glow > 0).length };
    });
  }

  function litCount(completed) {
    return sky(completed).reduce((sum, region) => sum + region.lit, 0);
  }

  const totalStars = () => LANDS.reduce((sum, land) => sum + land.stars.length, 0);

  // `pick` is a number from 0 up to 1 so tests can choose a line.
  function reaction(stars, pick = Math.random()) {
    const lines = REACTIONS[stars] || REACTIONS[1];
    return lines[Math.min(lines.length - 1, Math.floor(pick * lines.length))];
  }

  // The scene that should play next, given the scenes already seen and the lesson the
  // player is up to, or null if there's nothing new.
  function nextScene(seen, nextLessonId) {
    if (!seen.prologue) return PROLOGUE;
    if (nextLessonId === "mix") return seen.finale ? null : FINALE;
    const land = landForLesson(nextLessonId);
    if (land && !seen[land.id]) return { id: land.id, land: land.id, title: land.name, lines: land.intro };
    return null;
  }

  // Every scene in story order, for replaying.
  function allScenes() {
    return [
      PROLOGUE,
      ...LANDS.map((land) => ({ id: land.id, land: land.id, title: land.name, lines: land.intro })),
      FINALE,
    ];
  }

  Object.assign(exports, { PROLOGUE, FINALE, LANDS, SHAPES, REACTIONS, landForLesson, starFor, sky, litCount, totalStars, reaction, nextScene, allScenes });
})(typeof module !== "undefined" ? module.exports : (window.Story = {}));
