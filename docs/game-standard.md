# Game standard

Set by the owner on 2026-11-11. **These are rules, not advice.** Every new game, every rebuilt game and every change to an existing game follows them. `AGENTS.md` has the short list; this file is the full text.

Why one standard: every game used to be built its own way, so a fix in one helped no other and each was slow in its own way. With one renderer and one kit, a fix or a speed-up reaches the whole catalog.

Target: **a steady 60 frames per second in the Kahf Kids app WebView on a budget Android phone.** Casual kids' games, not a hardcore gaming app.

---

## 1. Three kinds of page, nothing else

| Kind | Play area is drawn by | Used for |
|------|-----------------------|----------|
| **2D game** | **PixiJS** (started by `Kit.gfx`, `js/kit/gfx.js`) | every game that is not 3D |
| **3D game** | **three.js**, through the kit (see section 3) | games with real 3D |
| **Quiz** | DOM for the words and buttons, through the quiz engine (`js/quiz/`); PixiJS for its drawn effects | every quiz; a quiz is only a data file |

A page is one kind. A game never mixes two renderers on one page.

## 2. 2D games: PixiJS, always

1. **PixiJS is the renderer of every 2D game.** We use its WebGL renderer (`PIXI.WebGLRenderer`), the one PixiJS recommends for production. Not its WebGPU renderer (PixiJS calls it experimental) and not its canvas renderer (not released).
2. **No fallback and no second drawing path.** A game is never also written for Canvas2D. A phone that cannot start WebGL gets the kit's try-again screen (`Kit.gfx.sorry`), nothing else.
3. **PixiJS is started only by `Kit.gfx.create(canvas)`**, so every game gets the same settings: antialias off, an opaque canvas, the pixel density from `Kit.gfx.dpr()`, a lost context handled, the pinned PixiJS file. A game does not create its own `Application` or renderer.
4. **After that, use PixiJS as PixiJS.** Build the scene on `surface.stage` with `Container`, `Sprite`, `Texture`, `Graphics`, `BitmapText`, `ParticleContainer`. Follow the PixiJS guides and `docs/pixi-performance.md`. Do not wrap PixiJS in a home-made layer and do not re-invent what it has.
5. **Nothing else draws the play area.** Not `canvas.getContext('2d')` for the frame, not moving DOM or SVG elements, not CSS animation as the game, not another engine or library (Phaser, Kaboom, Konva, p5, GSAP and the like).
6. **Canvas2D only makes pictures**: art drawn in code, an SVG turned into pixels. The result becomes a texture (`surface.paint`, `surface.texture`, `surface.image`). It is never what the child watches frame by frame. A picture that changes (a page being coloured in) is still a texture shown by a PixiJS sprite.
7. **Pixel density comes from `Kit.gfx.dpr()`** (at most 2, and 1.5 on phones with 2 GB of memory or less). A game does not read `devicePixelRatio` for its canvas.
8. **Textures can be lost** (the app went to the background, memory ran short). A game registers `surface.onLost` and makes its pictures again.
9. **Draw only when something changed.** A still screen costs nothing: call `surface.render()` when the scene changed, or run `Kit.loop` when the game always moves.
10. **Something missing?** Add it to `js/kit/gfx.js` so every game gets it. Do not work around the kit inside one game.

## 3. 3D games: three.js, always

three.js is **not in the repo yet**. The first 3D game adds it, in this order, in one change:

1. Pin one version locally: `js/vendor/three-<version>.module.min.js` with its licence file. No CDN.
2. Add the kit module `js/kit/gfx3d.js`: it owns the renderer, the pixel density (`Kit.gfx.dpr()`), resizing, pausing when hidden, a lost context, and the check that WebGL is real (not software). Games talk to it, not to a raw `WebGLRenderer`.
3. Write the 3D budget into this section after measuring on the budget phone. Starting point until then: at most about 100 draw calls and 100 000 triangles on screen, textures at most 1024 px, simple or baked light, no post-processing, at most one small shadow.
4. A 3D game shows a kind message and leaves when the phone has no real WebGL. It does not ship a blank screen.

No other 3D engine (Babylon, PlayCanvas, Unity, Godot or other web exports).

## 4. What is DOM and what is PixiJS

One line decides it: **anything drawn on a canvas goes through PixiJS; text and buttons are DOM.**

PixiJS, everywhere, quizzes included: sparkles, confetti, particles, and anything else drawn and animated. The kit's particle module (`js/kit/fx.js`) is shared by the games and the quizzes, so it is ported once and covers both.

DOM:

- **A quiz's words and buttons.** Text in three languages is laid out best by the browser. A quiz is a line in `js/quiz/catalog.js` plus `games/<id>/data.js`; its page is written by `node tools/quiz-pages.js`. Never hand-write or hand-edit a quiz page.
- **Everything over the play area**: HUD pills, buttons, pause, level complete, level select, settings. Use `js/kit/ui.js` and `js/kit/kit.css`. Not drawn into the game canvas.
- **The hub pages** (`index.html`, `quizzes.html`): lists of links.
- **Small animations of DOM things** (a button that pops, a card that shakes, a glow) stay CSS. They belong to the element they move.

Why text is DOM: the browser shapes and wraps Arabic, Bangla and English correctly, and PixiJS draws text as pictures that are costly to change.

## 5. No exceptions

Every game follows sections 1 to 4. There is no list of games that may do it another way.
**An exception needs the owner's yes and is written here first.** "It was quicker" is not a reason.

## 6. The kit is the engine

Games use the kit for everything shared and never go around it:

| Need | Use | Not |
|------|-----|-----|
| Drawing | PixiJS, started by `Kit.gfx.create` (`js/kit/gfx.js`) | a 2D canvas context for the frame, your own `Application`, another library |
| Loop, pause when hidden | `Kit.loop` (`js/kit/core.js`) | `setInterval`, a bare `requestAnimationFrame` loop |
| Touch, mouse, keys | `Kit.pointer`, `Kit.keys` | raw listeners per game, on-screen arrow pads, swipe strips |
| Saved progress, stars | `Kit.store`, `Kit.progress` | loose `localStorage` keys |
| Sound | `Kit.sfx`, `Kit.say` (`js/kit/audio.js`) | Tone.js, `<audio>` tags, any CDN |
| Effects | `js/kit/fx.js` | per-game tween code |
| HUD, sheets | `js/kit/ui.js` | per-game menus |
| Talking to the app | `Kit.host`, `Kit.bridge`, `js/kahf-bridge.js` | `ReactNativeWebView.postMessage` by hand |

`Kit.stage` hands out a Canvas2D context and belongs to the games not ported yet. New and ported games use `Kit.gfx.create` instead.
The loop is `Kit.loop`, not `PIXI.Ticker`, so pausing and game speed are the same in every game.

A fix that would help more than one game goes into the kit, not into the game.

## 7. Folder and page

```
games/<id>/
  index.html      the page (shape below)
  js/game.js      rules, loop, input
  js/levels.js    level data
  js/art.js       makes the pictures (Canvas2D) and turns them into PixiJS textures
  js/sounds.js    this game's own sound effects
```

`index.html` loads, in this order: `js/kit/kit.css`, `js/kahf-bridge.js` (defer), one `<canvas>`, then `js/kit/core.js`, `js/kit/gfx.js`, `js/kit/fx.js`, `js/kit/audio.js`, `js/kit/ui.js`, then the game's own files. Paths to shared files are absolute (`/KidsGames/js/...`). Copy the head of an existing kit game (`games/breakout-game/index.html`) for the meta tags and the service worker lines.

No inline game code in the page. No script, style, font or image from another site.

## 8. Definition of done

A game is done when all of this is true, checked at 360×640, 375×812, a phone on its side, 768×1024, 1024×768 and desktop:

- Holds 60 frames per second on the budget phone; the same speed on a 60 Hz and a 120 Hz screen.
- Plays fully offline after one visit; makes no request to any other site.
- Fills the whole screen inside the safe areas; no boxed play area.
- Plays with one thumb, with no words to read; touch first, keys and mouse second.
- Pauses when the app goes to the background.
- Saves levels or stars and brings them back; calls `KahfBridge.complete()` on level complete.
- Has sound with a mute that is remembered, and feedback on every tap, hit, win and loss.
- Has its own Exit button inside the app (`Kit.host`).
- First load under about 250 KB, not counting the shared kit and PixiJS.
- Follows the art and content rules in `AGENTS.md`.

## 9. Release

1. Bump the three cache names at the top of `sw.js` and `version` in `manifest.json` to the same new number. Games are served cache-first: without the bump, phones keep the old files.
2. Changed Helping Home? `python3 games/helping-home/tools/make-offline.py`.
3. Changed the quiz catalog? `node tools/quiz-pages.js`. Changed any quiz? `node tools/quiz-check.js` must pass.
4. Walk through the change in a browser at phone and tablet size before committing.
5. Pushing to `main` is the deploy: the live app has it about a minute later. Push only when the owner asks.

## 10. The app side

- The app loads `https://kahfkids.github.io/KidsGames/...` in a WebView (`KahfKids/expo-app/components/pwa-webview/`). Production always uses that address.
- A game with a wide play area that must open on its side is listed in the app (`KahfKids/expo-app/features/games/shared/landscape-games.ts`). Adding one is an app change and an app release.
- `js/kahf-bridge.js` has a twin in the app (`KahfKids/expo-app/constants/kahf-bridge-script.ts`). Change both together.

## 11. Where each live game stands

Rule for this table: **it only moves forward.** A game marked "PixiJS" never goes back. A game marked "to port" is ported when it is next reworked; until then, fixes to it are small and do not add more Canvas2D frame code. New games start on the standard.

| Game (folder) | Frame drawn by | Status |
|---------------|----------------|--------|
| `helping-home` (the world) | PixiJS | **done** (1.7.0). Its loop, input and saves are its own code: to move to the kit. |
| `helping-home` stations (wudu, salah, adhan, washing machine) | live SVG in the page (Colorfigures `mountFigure`, `iso/core.js`) | to port. They are figures the child turns by dragging, redrawn as SVG on every change, so this is a rebuild of how they are drawn, not a swap. The owner chooses the look first (pictures made once like the world, or shapes drawn by PixiJS). |
| `2048` | Canvas2D on the kit | to port |
| `30-seconds-challenge` | Canvas2D on the kit | to port |
| `animal-memory-match` | Canvas2D on the kit | to port |
| `balloon-pop-adventure` | Canvas2D on the kit | to port |
| `breakout-game` | Canvas2D on the kit | to port |
| `follow-the-light` | Canvas2D on the kit | to port |
| `hextris` | Canvas2D on the kit | to port |
| `jannah-garden` | Canvas2D on the kit | to port |
| `ramadan-maze` | Canvas2D on the kit | to port |
| `shape-pattern-game-2` | Canvas2D on the kit | to port |
| `solar-system` | Canvas2D on the kit | to port |
| `space-shooter` | Canvas2D on the kit | to port |
| `tower-blocks` | Canvas2D on the kit | to port |
| `islamic-checkers`, `tic-tac-toe` | Canvas2D on the board kit (`js/board/`) | to port (port the board kit once) |
| `spider-ik` | its own Canvas2D code, no kit | to port (needs a collision mask instead of reading pixels) |
| `islamic-shapes-drawing-game` | Canvas2D | to port (the page being coloured stays a Canvas2D picture, shown by a PixiJS sprite) |
| the 29 quizzes | words and buttons: DOM, quiz engine. Sparkles and confetti: a Canvas2D layer using `js/kit/fx.js` | words and buttons on the standard; effects to port (comes with the port of `js/kit/fx.js`) |
| `js/kit/fx.js` (particles, shared) | Canvas2D | to port once to PixiJS: pooled sprites sharing one texture |

The other folders under `games/` that no page links to are leftovers. They are not part of the catalog, are not linked again as they are, and get no new work: a game that comes back is rebuilt on the standard.

## 12. Porting a game (what Helping Home did)

1. Keep the code that makes the art. Point it at small canvases instead of the screen.
2. Turn each finished canvas into a texture: `t = surface.texture(canvas)`. The canvas memory is handed back at once, so never draw from that canvas again.
3. Show the textures with PixiJS sprites on `surface.stage`. A game that works out its drawing order every frame can use the kit's frame list (`surface.begin`, `draw`, `end`), which is a pool of sprites reused in order.
4. Small shapes that were drawn by hand every frame (bubbles, hearts, arrows) become textures made once.
5. Register `surface.onLost` and make the pictures again there.
6. Compare screenshots with the live version at phone, sideways phone and tablet size before the old drawing code is deleted. Then delete it: no second path stays behind.
7. Read `docs/pixi-performance.md` and check the game against its list.
