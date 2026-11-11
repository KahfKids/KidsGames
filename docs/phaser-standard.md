# Phaser standard

Set by the owner on 2026-11-11. **These are rules, not advice.** It replaces the PixiJS standard (`game-standard.md`) for everything new: the catalog is growing from small games into full games, and a full game needs an engine (scenes, multi-touch input, tweens, particles, physics, tile maps, cameras), not only a renderer. `AGENTS.md` has the short list; this is the full text.

Target, unchanged: **a steady 60 frames per second in the Kahf Kids app WebView on a budget Android phone.**

## 1. The engine

1. **Every game and every quiz is built on Phaser 4.** Pinned: `js/vendor/phaser-4.2.1.min.js` (MIT, 1.3 MB, 353 KB compressed). No CDN. An upgrade is the owner's decision, tested on a phone first.
2. **Phaser is started only by `Kit.play.start({ scenes, color })`** (`js/kit/play.js`). It decides, the same for every game:
   - WebGL only. No Canvas fallback. No WebGL: `Kit.play.sorry` (a picture and a way out).
   - Sharpness: canvas pixels = screen pixels x `Kit.play.dpr()` (at most 2; 1.5 on phones with 2 GB or less).
   - Phaser's sound system is off. Sound is the kit's (`js/kit/audio.js`): natural sounds only, one mute setting.
   - It tells the app the page has its own Exit (`Kit.host.ready`). `Kit.play.exit()` leaves.
3. **After that, use Phaser as Phaser**: scenes, game objects, its input and drag, tweens, particles, cameras, physics when a game needs it. Do not wrap it in a home-made layer.
   **Engine first (owner, 2026-11-11: "dont hand roll ... use the engine to its fullest").** Before writing drawing, lighting, effect, input or camera code, check what the pinned build has (names survive in the minified file: `grep -o 'addConeLight:function([^)]*)' js/vendor/phaser-4.2.1.min.js`) and use it. In 4.2.1 that includes: Lights (ambient colour, point and cone lights, normal maps through the loader's `normalMap`, self-shadow), PointLight objects, particles, camera and object filters (Vignette, ColorMatrix, Glow, Blur, Bokeh, Shadow, Displacement, and bloom through `Phaser.Actions.AddEffectBloom`), DynamicTexture, NineSlice, tweens, drag input, camera pan/zoom/fade. It has no day and night cycle, no volumetric light rays, no path finding and no life-sim logic: those are built from the parts above, or written by hand (and then kept free of the engine so they can be tested in Node).
   A painted overlay or a glow picture standing in for lighting counts as hand-rolled.
4. **Version 4 differs from version 3.** Before using an API from memory, check `skills/v3-to-v4-migration` in the Phaser package or the Phaser 4 docs. Known traps: `setTintFill` is gone (`setTintMode`), masks are filters, `RenderTexture` needs `render()`, `Math.TAU` is now 2π, `Geom.Point` is gone.

## 2. One design space

- **1920 x 1080 units, always fully visible and centred.** `Kit.play.fit(scene, layout)` sets the camera and gives `scene.view`: the visible edges in design units (`l, r, t, b`) and the same edges inside the notch (`sl, sr, st, sb`).
- Phones are wider and tablets are taller than 16:9, so they see more around the design space. **Backdrops reach x -500..2420 and y -400..1500.** Buttons sit against `view.sl / sr / st`.
- Everything a child must touch is inside the design space and at least 150 units across.
- Games are laid out for a phone on its side. A game in this folder list opens rotated in the app: `KahfKids/expo-app/features/games/shared/landscape-games.ts` (adding one needs an app release).

## 3. Art

- **Picture files are AVIF**, written by `enc.save` (Helping Home: `games/helping-home/tools/art/enc.py`), with a WebP copy beside each one. A game tests AVIF once before it loads anything and uses the WebP copies only in a WebView too old for it; the WebP copies are never in an offline list. Measured on Helping Home's sheets: about 45% smaller than WebP and closer to the render.
- **Full games may render their art from 3D models** scripted in Blender (Helping Home's `tools/art/`: one isometric camera, baked to trimmed atlases, with half-size normal maps for backgrounds and furniture so the engine's lights shade them). Nothing is retouched by hand.

- **A picture is made once.** Either an image file (an atlas when there are many), or painted once with Canvas2D into a texture: `Kit.play.tex(scene, key, w, h, paint, pad)`, one texture pixel per design unit. Nothing is painted, and no Graphics is rebuilt, per frame (one small Graphics for something fluid is fine).
- Content rules are in `AGENTS.md`: no faces, no people, no music, no rainbows, no words a child must read in a game.
- A game's look is written in the header of its `art.js`. Helping Home's look (soft toys: round, light top and deeper bottom, gloss, soft shadow, no black outlines) is the house style until the owner picks another.

## 4. Feel (what makes it a game)

Every touch answers at once with a sound, a squash and something flying. Things have weight (they arc, bounce and settle). The next thing to do glows, and a hint hand shows it after three idle seconds. Nothing can be failed; a wrong drop hops back. Each stage ends with a small "yes" moment and each job with a star.

## 5. A game's files

```
games/<id>/index.html        loads kahf-bridge.js, Phaser, kit/core.js, kit/audio.js, kit/play.js, then the game
games/<id>/<name>/art.js     the paint box and shared pictures
games/<id>/<name>/common.js  saves, sounds, helpers shared by the scenes
games/<id>/<name>/<scene>.js one Phaser scene per file; all state is set in create()
games/<id>/<name>/main.js    the Boot scene and Kit.play.start
```

A scene object is used again each time the scene starts: keep no state outside `create()`. `?debug` exposes a test hook (`window.HHT` in Helping Home) and each scene has `this.dbg` with jumps to every state.

## 6. Done means

1. Played through in a browser at a phone on its side (844 x 390), a tablet (1024 x 768) and upright; no console errors.
2. Every state photographed (the test hook reaches each one) and looked at.
3. Exit, the star or finish, and saving checked. `KahfBridge.complete()` is called when a round ends.
4. Run in the app on a budget Android phone before it is called finished: time to first picture, and frames per second.
5. Release steps as in `AGENTS.md` (version bump; Helping Home: `make-offline.py`).

## 7. Where each page stands

| Page | Built on | State |
|------|----------|-------|
| Helping Home: the life game (`games/helping-home/index.html`, `life/`; data in `tools/data/`, art tools in `tools/art/`) | **Phaser 4** | built 2026-11-11: 17 places, people, animals, coins, school, vehicles, wudu and salah guides, engine lighting; not committed, not measured on a phone |
| Helping Home: the old town, the four-job home, and the separate adhan, wudu, salah and washing machine pages | removed 2026-11-11 | replaced by the life game (in git history). `settings.html` (city and madhab) remains and is not yet linked from the game |
| Breakout, 2048, Follow the Light, Hextris, Tower Blocks, Spider IK, the drawing game and the other kit games | Canvas2D kit | to rebuild as full games, one at a time |
| Checkers, Tic Tac Toe (`js/board/`) | Canvas2D | to rebuild |
| Quizzes (`js/quiz/`) | DOM | to rebuild on Phaser |

## 8. Not decided yet (the owner's call)

- **A build step** (TypeScript, a bundler, automatic checks that every game starts). Today there is none, by rule.
- **A staging address.** Today a push to `main` is live.
- ~~Where art comes from for full games~~ decided 2026-11-11: rendered from Blender models (section 3).
