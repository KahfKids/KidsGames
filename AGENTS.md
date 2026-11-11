# AGENTS.md

Kahf KidsGames: the games and quizzes of the Kahf Kids app (an Islamic learning app for children). A static site with no build step. This file is the rule book for anyone, person or AI, who changes this repo. `CLAUDE.md` loads it.

**Where it runs:** inside the Kahf Kids app in a WebView (the main target), on the web, and as a PWA.
**Deploy:** pushing to `main` publishes to GitHub Pages. The live app has the change about a minute later. There is no staging.

## Hard rules

These are not advice. A change that breaks one is not finished, however well it works.

### Rendering

1. **Every 2D game is drawn by PixiJS.** No exceptions. Full text: `docs/game-standard.md`.
2. **Every 3D game is drawn by three.js.** It is not in the repo yet; the first 3D game adds it the way `docs/game-standard.md` section 3 says.
3. **No fallback and no second drawing path.** Never write a Canvas2D, DOM or SVG version of a game's play area "just in case".
4. **Canvas2D only makes pictures** that become PixiJS textures. It is never the frame.
5. **PixiJS is started only by `Kit.gfx.create`** (`js/kit/gfx.js`). After that, use PixiJS as PixiJS and follow `docs/pixi-performance.md`.
6. **No other engine or drawing library.** No CDN. PixiJS is pinned in `js/vendor/`.
7. **One line decides what goes where: anything drawn on a canvas goes through PixiJS; text and buttons are DOM.** So sparkles, confetti and every other drawn effect are PixiJS, in quizzes too. Quiz questions and answers, HUD, buttons, sheets and the hub pages are DOM (`js/quiz/`, `js/kit/ui.js`), and their small CSS animations (pop, shake, glow) stay CSS.
8. **Games not ported yet** (the table in `docs/game-standard.md` section 11) get small fixes only, and no new Canvas2D frame code. A reworked game is ported. A new game starts on PixiJS.

### The kit

9. **Shared things come from the kit** (`js/kit/`): drawing, loop, input, saves, sound, effects, HUD, talking to the app. A game does not go around it.
10. **A fix that helps more than one game goes into the kit**, not into one game.
11. **Every game page loads `/KidsGames/js/kahf-bridge.js`** (see "Kahf activity bridge").

### Performance

12. **Target: a steady 60 frames per second on a budget Android phone, inside the app.**
13. **Pixel density comes from `Kit.gfx.dpr()`** (at most 2).
14. **Plays offline after one visit. No request to any other site,** ever: no CDN, no fonts, no analytics, no beacons.

### Content (kids' app, Islamic)

15. **No faces in any art.** Spider IK is the one agreed exception and stays as it is.
16. **No music.** No notes, melodies, jingles or instrument sounds. Sound effects are natural sounds (`js/kit/audio.js`).
17. **No rainbows** or rainbow-coloured effects.
18. **Islamic content comes from the source**, looked up when it is written, never from memory (`docs/quiz-quality-plan.md`). Worship is never scored.
19. **A game plays without words a child must read** (quizzes are the reading pages). No `alert()`. Touch first.

### Releasing

20. **Every release bumps the version**: the three cache names at the top of `sw.js` and `version` in `manifest.json`, to the same number. Files are served cache-first; without the bump, phones keep the old ones.
21. **Commit and push only when the owner asks.** A push is a production deploy.
22. **Commit only your own changes.** This repo often holds the owner's uncommitted work; leave it out of your commit and leave it in place.
23. **Never print a secret** (keys, tokens, `.env` values) in chat, logs or new files.

## Always, ask first, never

**Always:** read the file you change and its header comment; keep the diff small; test in a browser at phone, sideways phone and tablet size before committing; say plainly what was not tested.
**Ask first:** a new library or a PixiJS upgrade; a build step, bundler or `package.json`; removing a game or a folder; changing a saved-progress shape; anything in `js/kahf-bridge.js`.
**Never:** a CDN or other outside request; a second renderer; hand-editing a generated file (quiz pages, `js/kit/praise-clips.js`, `games/helping-home/offline.json`); pushing unasked.

## Map

| Path | What it is |
|------|------------|
| `index.html` | the games hub |
| `quizzes.html` | the quiz catalog |
| `games/<id>/` | one game or one quiz per folder |
| `js/kit/` | the shared kit: `core.js` (loop, input, saves, app), `gfx.js` (PixiJS), `fx.js`, `audio.js`, `ui.js`, `kit.css` |
| `js/vendor/` | pinned libraries: `pixi-8.22.0.min.js` (MIT) |
| `js/quiz/` | the quiz engine and `catalog.js` |
| `js/board/` | the board-game kit (Checkers, Tic Tac Toe) |
| `js/kahf-bridge.js` | reports a child's activity to the app |
| `tools/` | `quiz-pages.js`, `quiz-check.js`, `quiz-refs.py`, `quiz-art/build.js` |
| `sw.js`, `manifest.json` | service worker (offline, versions) and PWA manifest (see `PWA-README.md`) |
| `read/` | the book reader (see `BOOK_UPDATE_README.md`, `ENVIRONMENT_SETUP.md`) |
| `docs/` | the standard and the plans (below) |

Folders under `games/` that no page links to are leftovers, not part of the catalog. Do not link them again or build on them.

## Read before you work

| When | Read |
|------|------|
| Any game work | `docs/game-standard.md` |
| Anything drawn with PixiJS | `docs/pixi-performance.md`, and the header of `js/kit/gfx.js` |
| Art, feel, level design of games | `docs/game-quality-plan.md` |
| Quizzes | `docs/quiz-quality-plan.md` |
| Helping Home | `docs/helping-home-v2-plan.md` |

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
```

Useful page switches: `?perf=1` (Helping Home: frame rate, memory, renderer), `?nosw` (kit games: no service worker).

## Release checklist

1. The change follows the hard rules.
2. Walked through in a browser at 375×812, a phone on its side, and 1024×768. No console errors.
3. Version bumped in `sw.js` (three names) and `manifest.json`.
4. Helping Home changed: `make-offline.py` run. Quizzes changed: `quiz-check.js` passes.
5. Only your own files staged.
6. The owner asked for the push.
7. After the push, check `https://kahfkids.github.io/KidsGames/sw.js` shows the new version.

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
- A game with its own Exit button tells the app through `Kit.host` (`js/kit/core.js`).
- Games that must open on their side are listed in the app: `KahfKids/expo-app/features/games/shared/landscape-games.ts`. Adding one needs an app release.
