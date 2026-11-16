# AGENTS.md

Kahf KidsGames: the games and quizzes of the Kahf Kids app (an Islamic learning app for children). A static site with no build step. This is the rule book for anyone, person or AI, who changes this repo. `CLAUDE.md` loads it.

- **Where it runs:** inside the Kahf Kids app in a WebView (the main target), on the web, and as a PWA.
- **Deploy:** a push to `main` publishes to GitHub Pages. The live app has the change about a minute later. There is no staging.

## Order of authority

When two sources disagree, the higher one wins:

1. The owner's words in this session.
2. This file (`AGENTS.md`).
3. The standards in `docs/` (full text of the rules below).
4. The installed game-dev skills in `.claude/skills/` (generic advice, see "Skills").

A skill never overrides a hard rule. If a skill's advice would break one, drop that advice and say so.

## Hard rules

These are not advice. A change that breaks one is not finished, however well it works.

### Engine and rendering

Decided by the owner on 2026-11-11: **every game and every quiz is built on Phaser 4**, because the catalog is growing into full games. Full text: `docs/phaser-standard.md`.

1. **Phaser 4 is the engine of every game and quiz.** Pinned in `js/vendor/phaser-4.2.1.min.js`. No CDN. A Phaser upgrade is the owner's decision.
2. **Phaser is started only by `Kit.play.start`** (`js/kit/play.js`), so every game gets the same screen fitting, sharpness, Exit and error screen. After that, use Phaser as Phaser: scenes, its input, tweens, particles, cameras. Check what the pinned build already has before hand-writing drawing, lighting, effect, input or camera code.
3. **WebGL only. No fallback and no second drawing path.** A phone that cannot start it gets `Kit.play.sorry`.
4. **Art is a picture made once**: an image file, or painted once with Canvas2D into a texture (`Kit.play.tex`). Nothing is painted per frame.
5. **No other engine or drawing library.** The one exception is a 3D game, which uses three.js (`docs/game-standard.md` section 3). None exists yet, and adding three.js is an "ask first".
6. **Pages not rebuilt yet stay as they are**: the Canvas2D kit games, `js/board/` and the PixiJS pages. They get small fixes only and are never ported to PixiJS. A game that is reworked is rebuilt on Phaser. The table is in `docs/phaser-standard.md` section 7.
7. **Hub pages are DOM** (`index.html`, `quizzes.html`). Inside a game, what the child sees and touches is Phaser.

### The kit

8. **Shared things come from the kit** (`js/kit/`): drawing, loop, input, saves, sound, effects, HUD, talking to the app. A game does not go around it.
9. **A fix that helps more than one game goes into the kit**, not into one game.
10. **Every game page loads `/KidsGames/js/kahf-bridge.js`** (see "Kahf activity bridge").

### Performance

11. **Target: a steady 60 frames per second on a budget Android phone, inside the app.** Measure before and after; do not claim a speed-up without a number.
12. **Pixel density comes from the kit** (`Kit.play.dpr()`, at most 2). A game does not read `devicePixelRatio`.
13. **Plays offline after one visit. No request to any other site,** ever: no CDN, no fonts, no analytics, no beacons.

### Content (kids' app, Islamic)

14. **No faces in any art.** Spider IK is the one agreed exception and stays as it is.
15. **No music.** No notes, melodies, jingles or instrument sounds. Sound effects are natural sounds (`js/kit/audio.js`).
16. **No rainbows** or rainbow-coloured effects.
17. **Islamic content comes from the source**, looked up when it is written, never from memory (`docs/quiz-quality-plan.md`). Worship is never scored.
18. **A game plays without words a child must read** (quizzes are the reading pages). No `alert()`. Touch first.

### Releasing and safety

19. **Every release bumps the version**: the three cache names at the top of `sw.js` and `version` in `manifest.json`, to the same number. Files are served cache-first; without the bump, phones keep the old ones.
20. **Commit and push only when the owner asks.** A push is a production deploy. Work on `main`; no feature branches.
21. **Commit only your own changes.** This repo often holds the owner's uncommitted work; leave it out of your commit and leave it in place.
22. **Never print a secret** (keys, tokens, `.env` values) in chat, logs or new files.

## Skills

Game-dev skills from `gamedev-skills/awesome-gamedev-agent-skills` are installed in `.claude/skills/` (pinned in `skills-lock.json`). Use them for the *how*; this file decides the *what*.

**The engine is already decided, so skip the router's engine detection.** The router looks for `package.json`; this repo has none, and Phaser is a vendored script started by `Kit.play.start`. Treat the engine as "Phaser 4, vendored" and go straight to the task skill.

| Task | Skill |
|------|-------|
| Scenes, loader, game config, Phaser 3 to 4 questions | `phaser-core` |
| Bodies, colliders, groups, bullet pools | `phaser-arcade-physics` (first check the pinned build includes Arcade) |
| Art style, sprites, icons, textures, licences | `create-game-assets` |
| Juice: tweens, squash, particles, hit feedback | `game-feel` |
| HUD, menus, scaling, safe areas, accessibility | `game-ui-ux` |
| Touch and pointer input, buffering | `input-systems` |
| Slow frames, draw calls, memory, GC | `performance-optimization` |
| Pacing, difficulty curve, progression | `level-design` |
| Matching, grids, sorting, undo, solvable levels | `puzzle` |
| What is saved, slots, migration | `save-systems` (a saved-progress shape change is still an "ask first") |
| A game's design doc | `game-docs` |
| Sound layout and variation (effects only) | `audio-design` (no music, rule 15) |
| Enemy and NPC behaviour, pathfinding | `game-ai`, `ai-behavior-trees-utility-ai` |
| Seeded levels, loot, random generation | `procedural-gen` |
| Branching talk and stories | `dialogue-systems`, `visual-novel` |
| Physics feel and tunnelling | `physics-tuning` |
| Camera follow, zoom, shake | `camera-systems` |
| Visual effects in GLSL | `shader-programming` (phones: no full-screen filters, see `docs/helping-home-v2-plan.md`) |
| Genres: jumping, runs, stats, defence, cards, survival | `platformer`, `roguelike`, `rpg`, `tower-defense`, `card-game`, `survival-crafting`, `fps-shooter` |
| One-question prototype, timed jam | `prototype-fast`, `game-jam` |
| Old PixiJS pages (small fixes only) | `pixijs-rendering` |
| A 3D game (none yet; adding three.js is ask first) | `threejs-scene-setup`, `threejs-gltf-loading`, `threejs-materials-lighting` |

**Where a skill's advice does not apply here:**

| A skill says | Here |
|--------------|------|
| `import Phaser from 'phaser'`, npm, Vite, `package.json` | Vendored script, no build step, no `package.json` |
| `type: Phaser.AUTO`, Canvas as a fallback | WebGL only (rule 3) |
| `this.sound`, Web Audio, adaptive music | Phaser sound is off; `js/kit/audio.js`, natural sounds only (rule 15) |
| HTML or DOM overlays for menus and HUD | Phaser inside a game (rule 7) |
| `devicePixelRatio`, own resize code | `Kit.play.dpr()` and `Kit.play.fit` (1920 x 1080 design space) |
| `npm run build`, `npm i playwright` | None. Serve the folder, test in a browser (see "Verify") |
| Outside fonts, CDNs, analytics | Never (rule 13) |
| Art with faces, rainbow effects | Never (rules 14, 16) |

**Not for this repo even though installed:** `steam-publish` and `itch-publish` (we deploy by pushing to GitHub Pages, rule 20), the Godot, Unity, Unreal and Roblox advice inside shared skills, and any skill step that adds music, a build step or an outside request. The skill list is long, so when two skills seem to fit, pick the one in the table above.

## How to work

1. **Read first.** The file you change, its header comment, and the standard for your task (table below).
2. **Keep the diff small.** One change, one purpose. No drive-by refactors, no new files that are not needed.
3. **Fix it in the right place.** More than one game benefits: kit. One game: that game.
4. **Verify in a real browser**, not by reading code (next section).
5. **Say plainly what was not tested** (for example: not run on a phone).

### Verify

- `node --check <file.js>` after editing any JS. `node tools/quiz-check.js` after any quiz change.
- Serve the **parent** folder (commands below) and open the page at **375 x 812**, **844 x 390** (a phone on its side) and **1024 x 768**. No console errors.
- Touch each control; it must visibly do something at once. Check Exit, saving and finishing.
- Performance work: read `?perf=1` (Helping Home) before and after. Numbers from a desktop Mac do not stand in for a budget Android phone: say which one you measured.

### Definition of done

A change is done when: it follows the hard rules, it was verified as above, the version is bumped if it is a release, only your own files are staged, and the report says what was and was not tested.

## Always, ask first, never

**Always:** the steps in "How to work".
**Ask first:** a new library or a Phaser upgrade; a build step, bundler or `package.json`; removing a game or a folder; changing a saved-progress shape; anything in `js/kahf-bridge.js`.
**Never:** a CDN or other outside request; a second renderer; hand-editing a generated file (quiz pages, `js/kit/praise-clips.js`, `games/helping-home/offline.json`); pushing unasked.

## Read before you work

| When | Read |
|------|------|
| Any game work | `docs/phaser-standard.md` |
| An old page still on the Canvas2D kit or PixiJS | `docs/game-standard.md`, `docs/pixi-performance.md` |
| Art, feel, level design of games | `docs/game-quality-plan.md` |
| Quizzes | `docs/quiz-quality-plan.md` |
| Helping Home | the header of each file in `games/helping-home/life/`, `games/helping-home/tools/data/README.md` (the data format) and the status section at the top of `docs/helping-home-v2-plan.md` |

## Map

| Path | What it is |
|------|------------|
| `index.html` | the games hub |
| `quizzes.html` | the quiz catalog |
| `games/<id>/` | one game or one quiz per folder |
| `js/kit/` | the shared kit: `play.js` (starts Phaser), `core.js` (saves, app, and the loop and input of the old kit games), `audio.js` (sound), and for pages not rebuilt yet `gfx.js` (PixiJS), `fx.js`, `ui.js`, `kit.css` |
| `js/vendor/` | pinned libraries: `phaser-4.2.1.min.js` (MIT), `pixi-8.22.0.min.js` (MIT, old pages only) |
| `js/quiz/` | the quiz engine and `catalog.js` |
| `js/board/` | the board-game kit (Checkers, Tic Tac Toe) |
| `js/kahf-bridge.js` | reports a child's activity to the app |
| `tools/` | `quiz-pages.js`, `quiz-check.js`, `quiz-refs.py`, `quiz-art/build.js` |
| `sw.js`, `manifest.json` | service worker (offline, versions) and PWA manifest (see `PWA-README.md`) |
| `read/` | the book reader (see `BOOK_UPDATE_README.md`, `ENVIRONMENT_SETUP.md`) |
| `docs/` | the standards and the plans |
| `.claude/skills/`, `skills-lock.json` | the installed game-dev skills |

Folders under `games/` that no page links to are leftovers, not part of the catalog. Do not link them again or build on them.

## Commands

There is no build and no install. Pages use absolute paths (`/KidsGames/...`), so serve the **parent** folder:

```bash
cd .. && python3 -m http.server 8765 --bind 127.0.0.1
```

Then open `http://localhost:8765/KidsGames/`.

```bash
node --check <file.js>                                  # after editing any JS
node tools/quiz-check.js                                # must pass after any quiz change
node tools/quiz-pages.js                                # rewrites quiz pages from js/quiz/catalog.js
python3 games/helping-home/tools/make-offline.py        # after any Helping Home change, before a release
python3 games/helping-home/tools/check-data.py          # Helping Home data
node games/helping-home/tools/life-test.js 3 20         # Helping Home: three simulated days
```

Useful page switches: `?perf=1` (Helping Home: frame rate, memory, renderer), `?nosw` (kit games: no service worker), `?debug` (Phaser games: test hook).

## Release checklist

1. The change follows the hard rules.
2. Walked through in a browser at 375 x 812, 844 x 390 and 1024 x 768. No console errors.
3. Version bumped in `sw.js` (three names) and `manifest.json`, to the same number.
4. Helping Home changed: `make-offline.py` run. Quizzes changed: `quiz-check.js` passes.
5. Only your own files staged.
6. The owner asked for the push.
7. After the push, `https://kahfkids.github.io/KidsGames/sw.js` shows the new version.

## Kahf activity bridge (every game page)

Every game page includes the shared bridge so the Kahf Kids app can count real learning:

```html
<script src="/KidsGames/js/kahf-bridge.js" defer></script>
```

- It reports audio played to the end and active time on its own, and does nothing in a normal browser tab.
- Quizzes call `window.KahfBridge && window.KahfBridge.answer();` on every answer the child taps (not on timeouts). Optional extras: `KahfBridge.complete()` when a round or level ends, and `KahfBridge.item(id)` when an item is opened.
- **New game:** add the script tag. The app decides what earns credit, per screen.
- **Changing `js/kahf-bridge.js`:** bump the version (it is served cache-first). Keep the app's copy (`KahfKids/expo-app/constants/kahf-bridge-script.ts`) identical. A protocol change bumps `v` on both sides.

## The app side

- The app's WebView code: `KahfKids/expo-app/components/pwa-webview/`. Production always loads `https://kahfkids.github.io/KidsGames`.
- A game with its own Exit button tells the app through `Kit.host` (`js/kit/core.js`). `Kit.play` does this for Phaser games (`Kit.play.exit()`).
- Games that must open on their side are listed in the app: `KahfKids/expo-app/features/games/shared/landscape-games.ts`. Adding one needs an app release.
