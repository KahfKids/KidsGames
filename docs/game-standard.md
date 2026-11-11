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
4. **After that, use PixiJS as PixiJS**, in one of two ways, both on `surface.stage`. **The pen** (`js/kit/pen.js`): `draw()` says what is on screen this frame, back to front, and the pen shows it with pooled sprites. Every game that decides its picture frame by frame uses it; it is the kit's one shared way, and its sprites, textures, pooling and tinting are PixiJS's own. **A scene you keep**: `Container`, `Sprite`, `Texture`, `BitmapText`, `ParticleContainer`, for things that stay (a rope, a mesh, a mask); `pen.add(obj)` puts one inside a pen frame. Follow the PixiJS guides and `docs/pixi-performance.md`. A game does not write its own drawing layer and does not re-invent what PixiJS or the kit has.
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
| Drawing | PixiJS: `Kit.gfx.stage` gives a full-screen game its surface and its pen (`js/kit/gfx.js`, `js/kit/pen.js`); `Kit.gfx.create` for a figure on a page | a 2D canvas context for the frame, your own `Application`, another library |
| Loop, pause when hidden | `Kit.loop` (`js/kit/core.js`) | `setInterval`, a bare `requestAnimationFrame` loop |
| Touch, mouse, keys | `Kit.pointer`, `Kit.keys` | raw listeners per game, on-screen arrow pads, swipe strips |
| Saved progress, stars | `Kit.store`, `Kit.progress` | loose `localStorage` keys |
| Sound | `Kit.sfx`, `Kit.say` (`js/kit/audio.js`) | Tone.js, `<audio>` tags, any CDN |
| Effects | `js/kit/fx.js` | per-game tween code |
| HUD, sheets | `js/kit/ui.js` | per-game menus |
| Talking to the app | `Kit.host`, `Kit.bridge`, `js/kahf-bridge.js` | `ReactNativeWebView.postMessage` by hand |

`Kit.stage` hands out a Canvas2D context and belongs to the games not ported yet; it is deleted with the last of them. New and ported games use `Kit.gfx.stage`.
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

`index.html` loads, in this order: `js/kit/kit.css`, `js/kahf-bridge.js` (defer), one `<canvas>`, then `js/kit/core.js`, `js/kit/gfx.js`, `js/kit/pen.js`, `js/kit/fx.js`, `js/kit/audio.js`, `js/kit/ui.js`, then the game's own files. Paths to shared files are absolute (`/KidsGames/js/...`). Copy the head of an existing kit game (`games/breakout-game/index.html`) for the meta tags and the service worker lines.

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
| `helping-home` stations: adhan, salah, wudu, washing machine | PixiJS | **done.** One stage for all four, `games/helping-home/iso/pix.js`: the Colorfigures code still describes each figure as markup, every picture is made once with the hand-drawn filter, and PixiJS shows and moves it. Salah: the child's move is a flipbook of pictures made ahead; the ghost, the drawn-on arrow, the numbers and the close-up bubble are sprites. Wudu: the stream, its streaks, the pool, the ripples, the close-up actors and the body map are sprites. Washing machine: three pictures (under, drum, over); the zoom moves the pictures at once and sharp ones follow. No station paints SVG in the page any more; each keeps one empty `<svg>` sheet that gives the frame and takes the finger. Words, buttons and counters are DOM. |
| `2048` | Canvas2D on the kit | to port |
| `30-seconds-challenge` | Canvas2D on the kit | to port |
| `animal-memory-match` | Canvas2D on the kit | to port |
| `balloon-pop-adventure` | Canvas2D on the kit | to port |
| `breakout-game` | PixiJS (the pen) | **done.** The worked example for section 12. |
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

## 12. Porting a kit game to PixiJS (the recipe)

Breakout is the worked example. Read the header of `js/kit/pen.js` (it is the whole API), then read `games/breakout-game/js/game.js` and `js/art.js` next to what they were before: `git show ea4f2aa:games/breakout-game/js/game.js`.

**What changes and what does not.** The rules of the game do not change: `step()`, input, levels, sounds, saves and the HUD stay as they are, line for line. Only how the frame gets on screen changes. Same picture, same sizes, same colours, same timing.

1. **Page.** Load `/KidsGames/js/kit/gfx.js` and `/KidsGames/js/kit/pen.js` right after `core.js`.
2. **Stage.** `K.stage(canvas, fit)` becomes `K.gfx.stage(canvas, fit).then(...)`. It is no longer ready at once:
   - keep `var pen = null` and set it when the promise resolves; `draw()` starts with `if (!pen) return;`
   - whatever starts the game (the first `startLevel`) waits for that promise; a failure goes to `K.gfx.sorry`
   - inside `fit`, tell the pen how sharp to make pictures: `st.pen.unit(<device pixels per game unit>)`, the same scale `draw()` uses for the play field. A new value throws the kept pictures away, so code that emptied its own sprite lists on resize goes.
3. **The frame.** `draw()` starts with `p.begin()` and ends with `p.end()`. In between, translate line by line:

   | Canvas2D | Pen |
   |----------|-----|
   | `setTransform` `save` `restore` `translate` `rotate` `scale` | the same calls on the pen |
   | `ctx.globalAlpha = v` | `p.alpha = v` |
   | `globalCompositeOperation = 'lighter'` | `p.blend = 'add'`, and back to `'normal'` after |
   | `drawImage(canvas, x, y, w, h)` | `p.img(t, x, y, w, h)`; a picture's padding is taken off for you |
   | `fillRect` | `p.rect` |
   | `arc` + `fill` | `p.circle` |
   | `arc` + `stroke` | `p.ring` (whole circle), `p.arc` (part of one) |
   | `ellipse` + `fill` | `p.ellipse` |
   | a radial gradient fading to nothing | `p.glow` |
   | `moveTo` `lineTo` + `stroke` | `p.line`, `p.path`, `p.dash`, `p.curve` |
   | a rounded rectangle | `p.rr` |
   | `fillText` `strokeText` | `p.text` (one call does both) |
   | `measureText` | `p.measure` |
   | anything else: gradients, clips, shadows, filled polygons, bezier shapes | paint it once in a `p.pic` |

4. **Pictures.** Art comes in three kinds:
   - **It returned a canvas** (tiles, sprites, pillars): `p.wrap(key, function (k) { return A.tile(..., k); })`. The pen keeps it and makes it again after a resize. A background as large as the screen is the exception: `S.texture(canvas)`, freed by you on resize (`S.free`) and forgotten in `S.onLost` (Breakout's `dropBg`).
   - **It was drawn into the frame every time but never changes shape** (a lantern, a ball, a frieze): one `p.pic(key, w, h, paint, pad)`. The frame only moves, turns, scales and fades it.
   - **It changes shape over time** (a rippling carpet, a trail, a swaying tassel): take it apart. The parts that keep their shape are pictures that move (Breakout's carpet is one flat picture cut into strips that tilt along the wave); the rest are shared shapes (`p.circle`, `p.line`, `p.glow`). A motion that repeats can be a few pictures, `p.pic(key + '|' + i, ...)` with `i` the step of the cycle.
   - A key holds everything the picture depends on: kind, colour, size, state, world. Two different pictures under one key is the usual bug.
   - **Never paint a new picture every frame.** If a key changes every frame (a size that eases, a colour that fades), the picture is being remade every frame: scale, fade or tint one picture instead.
5. **Effects.** `K.fx.draw(ctx)` becomes `K.fx.draw(p)`.
6. **Lost pictures.** The pen makes its own again. For textures you made with `S.texture`, set them to null in `S.onLost`.
7. **Delete the old path.** No `getContext('2d')` for the frame, no `ctx` in `draw()`. Canvas2D stays only inside functions that paint a picture.
8. **Check** at phone, sideways phone and tablet size, in every state the game has (start, play, effects, power-ups, each world, win, lose): the picture next to the old one, no errors in the console. Then read `docs/pixi-performance.md` section 15 and check the game against it.

Something the pen cannot do goes into the pen (`js/kit/pen.js`), for every game. It is not worked around inside one game.
