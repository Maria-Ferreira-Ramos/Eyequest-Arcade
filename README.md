# EyeQuest

Daily eye practice for a lazy eye, in two versions you pick from the main menu:

- **EyeQuest Arcade:** short games you play with your mouse and keyboard, on a lesson path with a story. No camera needed.
- **Eye Tracker:** games you play with your eyes. Your webcam follows whether you look left, right, up, down or at the middle. This is a web version of the team's Python [Eye Trainer](https://github.com/JohnFireHydrant/eyeTrainer).

Both versions share one player profile: streaks, XP, the daily goal and badges count games from either one. Nothing to install.

**EyeQuest isn't a medical device and can't diagnose or treat amblyopia.** Use it alongside an eye doctor's care, not in place of it. Stop if you get a headache, eye pain or double vision. If double vision or a change in your vision comes on suddenly, get medical care right away.

## Run it

Double-click `index.html`, or drag it into Brave, Chrome or Edge. That's it.

Progress is saved in that browser on that computer. Private windows may not save it, and the app warns you when that happens.

The Eye Tracker also needs a webcam, and an internet connection to load the face tracker ([MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker), about 4 MB of model plus its code). The browser asks for camera access the first time. The webcam picture stays on the computer and is never recorded or sent anywhere.

To put it online, upload the folder to any static host. With GitHub Pages: push the folder to a repository, then go to **Settings → Pages** and publish from the main branch.

## The story

One night a great fog put out every star over Lumen. Blink, the little lighthouse keeper, needs your sharp eyes to relight them.

- **Four lands, one per unit of the path:** Firefly Meadow (both eyes, learning the games), Crystal Caves (solo eye), Whispering Library (solo eye, finer detail) and Star Observatory (both eyes together).
- **One star per lesson.** Each lesson relights a named star, like Glimmer or Polaris, and each land's 8 stars form a constellation. More stars earned make a star shine brighter.
- **Short scenes with Blink** at the start, when you reach each new land, and when the whole sky is lit. Replay them from the **Sky** page.
- **The Sky page** shows the night sky filling in as you play.
- **Blink reacts** after every lesson, with different lines depending on how it went.

## The Eye Tracker

Pick a stage, a time limit (30 s, 1 min or 5 min; Tetris and Gameshow have none), then **Calibrate** or **Skip**. Skip works once you've calibrated since opening the page.

1. **Line up:** head straight, nose on the line in the webcam picture. When the message turns green, press any key or click.
2. **Look at each dot:** centre, far left, far right, top, bottom, centre again. Move only your eyes. A dot spoiled by a blink or a glance is repeated.

During a stage: **C** calibrates again, **Esc** (or the ✕) goes back to the stages. If your head moves too far, the game pauses and says how to move back. Timers pause while tracking is lost.

| # | Stage | How to play |
|---|------|-------------|
| 1 | Look and score | An arrow points left, right, up or down. Look that way within 3 seconds for a point. |
| 2 | Pop the balloon | The square has a red top, blue right, green bottom and yellow left. Look toward a balloon's colour to pop it. A balloon that floats away costs a point. |
| 3 | Tetris | Look left or right to turn the piece. **A / D** or the arrow keys move it, **W** stores it, **S** drops it. 1 point per line; no time limit. |
| 4 | Don't look at red | A zone turns dark red, then bright red for 1 second. Don't look at it while it's bright red. |
| 5 | Subway runner | Look left or right to change lane. Collect coins, dodge the blocks (a crash costs 3). |
| 6 | Gameshow | 10 questions. Look at your answer's colour, then click **Lock in answer** or press **Space**. 10 seconds each. |
| 7 | Look and score: hard | Only 1.5 seconds to look. **3x points.** |
| 8 | Pop the balloon: hard | Faster balloons, and about twice as many. **3x points.** |
| 9 | Don't look at red: hard | 2 or 3 zones turn red at once, and rounds are faster. **3x points.** |

Finishing a stage opens the next one and adds your score to your points (3x on hard stages). It also counts as a game for the day: 10 to 15 XP depending on the points earned, and it keeps your streak going. The Progress page lists each stage's best score.

Secret codes from the Python version: open **About the Eye Tracker** on the stage page, then press **R** to reset the Eye Tracker's stages and points, or **P** to open every stage.

To change the Gameshow questions, edit the text in `js/tracker-questions.js` (same format as the Python version's `questions.txt`).

Made by Kenny Arias, Bryan Ducas, Maria Ferreira Ramos and Sofia Marim.

The background music is original: each stage's loop is composed by `tools/make_music.py`, written for this project, so it's free to share and publish. To change a song, edit its settings at the top of that file (tempo, key, chords, sound) and run `python tools/make_music.py` (needs numpy and ffmpeg).

## What's inside the Arcade

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
| `js/app.js` | The screens: welcome, menu, setup, path, lessons, Eye Tracker stages, progress, settings |
| `js/charts.js` | Small line charts for the progress page |
| `js/story.js` | The story: lands, star names, constellations, scenes and Blink's lines |
| `js/gaze.js` | Eye Tracker: eye measurements, blinks, head position, calibration, and which way you're looking |
| `js/tracker-rules.js` | Eye Tracker: the stages, unlocking, best scores, points, and XP and streak credit |
| `js/tracker-games.js` | Eye Tracker: the six games (and the hard versions) |
| `js/tracker-play.js` | Eye Tracker: camera, face tracker, line-up, calibration dots and running a stage |
| `js/tracker-draw.js` | Eye Tracker: drawing helpers and sound effects |
| `js/tracker-questions.js` | Eye Tracker: the Gameshow questions |
| `music/` | Eye Tracker background music (MP3), made by `tools/make_music.py` |
| `tools/make_music.py` | Composes the background music |
| `css/style.css` | The look |
| `tests/` | Tests for the rules, saving, the eye report and the story |

## Tests

With [Node.js](https://nodejs.org) installed, run this from the project folder:

```
node --test
```
