# EyeQuest Arcade

Daily eye practice for a lazy eye: short games you play with your mouse and keyboard, a lesson path, streaks, XP and badges. No camera, no eye tracker, nothing to install.

**EyeQuest isn't a medical device and can't diagnose or treat amblyopia.** Use it alongside an eye doctor's care, not in place of it. Stop if you get a headache, eye pain or double vision. If double vision or a change in your vision comes on suddenly, get medical care right away.

## Run it

Double-click `index.html`, or drag it into Brave, Chrome or Edge. That's it.

Progress is saved in that browser on that computer. Private windows may not save it, and the app warns you when that happens.

To put it online, upload the folder to any static host. With GitHub Pages: push the folder to a repository, then go to **Settings → Pages** and publish from the main branch.

## What's inside

- **Players:** each person gets a named profile with no password. You can also play as a guest, and keep your guest progress later by giving yourself a name.
- **Daily habit:** a lesson path, XP, a daily goal, stars, badges and a streak. Each lesson is one game of 30 seconds at most. You earn streak protection every 7 days, up to 2. After 6 lessons in a day, lessons stop earning XP and you're told to rest.
- **Nothing to memorize:** every game is laid out at random each time you play: positions, letters, shapes, paths, timing and how many things there are to find. The daily mix at the end of the path picks a random game each time.
- **Solo-eye lessons:** ask you to cover your stronger eye with a patch or your hand, so the lazy eye does the work. If you're not sure which eye is lazy, the eyes take turns by day.
- **Games:**
  - **Firefly Catch:** click a drifting firefly and avoid the moths. The firefly speeds up with every catch.
  - **Star Snap:** comes in three versions, and one is picked each time you play. In **Classic**, stars pop up anywhere and fade, so click each one before it's gone. In **Constellations**, you click numbered stars in order to join them. In **Shooting Stars**, you click stars as they streak across the sky.
  - **Shape Hunt:** click every shape that matches the one in the box at the top. Later rounds are more crowded and mix in look-alike shapes.
  - **Spot the Difference:** two pictures made of shapes, side by side. Click each difference: a missing shape, a swapped shape, or one that's bigger or smaller.
  - **Dot Count:** a group of dots flashes in the middle for a moment. Type how many there were. Right answers bring more dots and shorter flashes.
  - **Line Tracer:** follow a winding path with the mouse from start to finish without slipping off. Paths start from either side, and each one is thinner and twistier.
  - **Side Glance:** keep your eyes on the dot in the middle while a letter flashes off to the side, then type it or click it. Each right answer makes the letter smaller, farther out and quicker.
  - **Odd One Out:** a crowd of look-alike letters, all the same except one: a b among d's, a Q among O's, an N among M's, or one E turned a different way. Click the odd one. Each right answer makes the letters smaller and packs them closer together.
- **Eye report (on the Progress page):** every game feeds one of six skills: sharpness, side vision, visual speed, tracking, searching, and hand-eye control. Each skill gets a level from 0 to 100, how much it has changed since you started, and a small trend line. A chart compares your lazy eye alone with both eyes over time, since the gap between them shrinking is the clearest sign of progress. The report also names your most improved skill and the one to work on. The scores come from the games, not an eye exam.
- **Progress page:** the eye report, a practice calendar and badges.
- **Back to lessons:** every game's start screen has a link back to the path, in case you opened the wrong one.
- **Download my data** in Settings saves everything as a JSON file.

## Project layout

| Path | What it does |
|---|---|
| `index.html` | The page that loads everything |
| `js/rules.js` | Lesson path, streaks, XP, stars, badges and the eye report's scoring (no screen code) |
| `js/store.js` | Player profiles saved in the browser |
| `js/games.js` | The eight games and the shared drawing stage |
| `js/app.js` | The screens: welcome, setup, path, lessons, progress, settings |
| `js/charts.js` | Small line charts for the progress page |
| `css/style.css` | The look |
| `tests/` | Tests for the rules and saving |

## Tests

With [Node.js](https://nodejs.org) installed, run this from the project folder:

```
node --test
```
