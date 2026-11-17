# Phaser standard

Set by the owner on 2026-11-11. **These are rules, not advice.** It replaces the PixiJS standard (`game-standard.md`) for everything new: the catalog is growing from small games into full games, and a full game needs an engine (scenes, multi-touch input, tweens, particles, physics, tile maps, cameras), not only a renderer. `AGENTS.md` has the short list; this is the full text.

Target, unchanged: **a steady 60 frames per second in the Kahf Kids app WebView on a budget Android phone.**

## 1. The engine

1. **Every game and every quiz is built on Phaser 4.** Pinned: `js/vendor/phaser-4.2.1.min.js` (MIT, 1.3 MB, 353 KB compressed). No CDN. An upgrade is the owner's decision, tested on a phone first.
2. **Phaser is started only by `Kit.play.start({ scenes, color })`** (`js/kit/play.js`). It decides, the same for every game:
   - WebGL only. No Canvas fallback. No WebGL: `Kit.play.sorry` (a picture and a way out).
   - Sharpness: canvas pixels = screen pixels x `Kit.play.dpr()` (at most 2; 1.5 on phones with 2 GB or less).
   - Phaser's sound system is on (2026-11-16). `Kit.snd` (`js/kit/sound.js`) sits on top of it for what Phaser has no word for (section 3a). The old kit pages keep `js/kit/audio.js`.
   - It tells the app the page has its own Exit (`Kit.host.ready`). `Kit.play.exit()` leaves.
3. **After that, use Phaser as Phaser**: scenes, game objects, its input and drag, tweens, particles, cameras, physics when a game needs it. Do not wrap it in a home-made layer.
   **Engine first (owner, 2026-11-11: "dont hand roll ... use the engine to its fullest").** Before writing drawing, lighting, effect, input or camera code, check what the pinned build has (names survive in the minified file: `grep -o 'addConeLight:function([^)]*)' js/vendor/phaser-4.2.1.min.js`) and use it. In 4.2.1 that includes: Lights (ambient colour, point and cone lights, normal maps through the loader's `normalMap`, self-shadow), PointLight objects, particles, camera and object filters (Vignette, ColorMatrix, Glow, Blur, Bokeh, Shadow, Displacement, and bloom through `Phaser.Actions.AddEffectBloom`), DynamicTexture, NineSlice, tweens, drag input, camera pan/zoom/fade. It has no day and night cycle, no volumetric light rays, no path finding and no life-sim logic: those are built from the parts above, or written by hand (and then kept free of the engine so they can be tested in Node).
   A painted overlay or a glow picture standing in for lighting counts as hand-rolled. One measured exception (Helping Home,
   2026-11-16): a lamp's pool of light on the ground stays a gradient image with the engine's SCREEN blend. The engine's
   `PointLight` falls off in a circle on the screen and adds its light, so on the ground it burns to white discs at any
   strength tried; it is right for small glows (the lamp heads use it), and the per-pixel Lights stay out (six times the draw
   calls, the lag of 2026-11-11). Night is each picture's own tint.
   **If Phaser can do it, Phaser does it (owner, 2026-11-16).** "Other games do it this way" is no reason: Helping Home is
   the reference, and what it does the other games will do. Kit code is only for what the pinned build lacks. Checked in
   4.2.1 while finishing Helping Home, and so kept as kit code:
   - screen sharpness: the Scale Manager reads `devicePixelRatio` but never applies it, so `Kit.play` sizes the canvas;
   - AVIF: the engine only tests WebP, so a game tests AVIF once before it loads;
   - decoding pictures off the main thread: the loader decodes on it (no `createImageBitmap`); `Kit.play.offThread(game)` in Boot's preload (lifted from Helping Home's `offThread`, 2026-11-16);
   - pinch zoom: none (drag, wheel and camera zoom are the engine's);
   - sound categories, ducking, take variation, a cap on overlapping sounds (`Kit.snd`, section 3a);
   - "the nearest thing within a finger's width" for a child's tap: game design, not a hit test.
   And taken back from hand-written code to the engine: sound and voices (`this.sound`, its loader and cache), loading the
   portraits (the loader, not a `fetch`), pictures painted once (`Kit.play.tex`, an engine texture), hit tests on the shape of a
   picture (`setInteractive({ pixelPerfect })` and `input.hitTestPointer`), timers (`time.delayedCall`), the `?perf`
   readout (a Text object), distances (`Phaser.Math.Distance`). A browser timer stays only where the engine's clock is
   wrong for the job: saving progress must happen while the page is hidden, when Phaser's clocks stop.
   **Keys:** Phaser 4.2.1 ignores a key event that something else has already cancelled. `js/kit/core.js` used to
   cancel Space and the arrows on every page (for the old kit games' scrolling), so they were dead in every Phaser
   game; it now leaves them alone when a Phaser game runs (2026-11-16). Nothing else on a Phaser page may
   `preventDefault` keys.
   **Pixel-perfect hit areas cost on every finger move**: Phaser tests each interactive object for "over" and "out" on
   each move, and a pixel-perfect test reads a pixel back from the graphics chip. Many of them (things in a town) are
   kept switched off and switched on only for the one `hitTestPointer` a tap needs (Helping Home's `hitArea` / `hitTest`).
4. **Version 4 differs from version 3.** Before using an API from memory, check `skills/v3-to-v4-migration` in the Phaser package or the Phaser 4 docs. Known traps: `setTintFill` is gone (`setTintMode`), masks are filters, `RenderTexture` needs `render()`, `Math.TAU` is now 2π, `Geom.Point` is gone.

## 2. One design space

- **1920 x 1080 units, always fully visible and centred.** `Kit.play.fit(scene, layout)` sets the camera and gives `scene.view`: the visible edges in design units (`l, r, t, b`) and the same edges inside the notch (`sl, sr, st, sb`).
- Phones are wider and tablets are taller than 16:9, so they see more around the design space. **Backdrops reach x -500..2420 and y -400..1500.** Buttons sit against `view.sl / sr / st`.
- Everything a child must touch is inside the design space and at least 150 units across.
- Games are laid out for a phone on its side. A game in this folder list opens rotated in the app: `KahfKids/expo-app/features/games/shared/landscape-games.ts` (adding one needs an app release).

## 2a. What the kit does for every game (2026-11-16, the conversions)

Measured on all sixteen conversions; each is in `js/kit/play.js` or `js/kit/sound.js`, so a game does not write its own.

- **Rest** (`start({ rest: true })`, turn-based and touch-driven games): the engine's loop sleeps (`game.loop.sleep()`) once nothing moves, and any touch, key, wheel, resize or page change wakes it before the engine reads it. "Moving" is the engine's own state: a playing tween, a pending timer, an animation, a live emitter, a camera effect or follow, running physics, a loader, a scene still starting or queued, a finger down, a spoken voice not ended. Short sound effects do not hold it (Web Audio plays them out on its own; without Web Audio they do). `rest: { ms: 0 }` sleeps on the first calm frame (default 700 ms); `rest: { finger: false }` lets a finger held still sleep too (not for a game that times a held press). Something that changes the screen from outside the engine calls `Kit.play.wake()`. A sleeping board game costs nothing.
- **No frame cap.** The engine's limiter (`setFPSLimit`) does not keep an even rhythm on a 120 Hz screen (frames 8, 16 and 19 ms apart at a limit of 64), which shows as jitter; the owner saw it in Breakout. Games run at the screen's own rate, like the old pages. A game sets no frame limit of its own.
- **The kit's sound scene pauses itself** when it has nothing to load, fade or time, and the kit resumes it before giving it work. A running scene costs every frame even when it is empty (its systems step, and every touch is offered to its input): this one cost about 0.5 point of main-thread time idle and 2 while playing.
- **`fit(scene, layout, o)`**: `o` may be `{ w, h }` (the middle area that must stay visible; an upright phone zooms in to it) or a function returning that, read again on every resize. `view.u` (1 to 2.2) is the interface scale: buttons and words multiplied by it stay finger-sized on an upright phone.
- **Art baked once, shipped as AVIF**: a game's painters stay the source; `node tools/bake-art.js <id>` opens the game at three screen sizes, reads every `Kit.play.tex` picture back and bakes those that come out the same size on all three into `art/baked/*.avif` (WebP copies beside them) and `art/baked.json`. Boot's preload calls `Kit.play.offThread(this.game)` and `Kit.play.art(this, 'art/', { later: /^w[0-9]-/ })`; `Kit.play.tex` then finds a baked picture ready and paints nothing. Pictures for later worlds load when needed with `Kit.play.artNeed(scene, /^w2-/, done)`, and the textures of a world left behind are removed. The kit caches the manifest and every picture in the chosen format for offline play. Run it again after changing a painter.
- **`Kit.play.every(min, max, fn, scene)`**: something now and then (a bird, a sparkle) on a browser timer that skips while the page is hidden or the scene asleep, and wakes a resting loop before it calls `fn`.
- **`start({ mipmap: true })`** for pictures shown much smaller than they were painted.
- **`Kit.snd.praise(name)`**: the shared Arabic praise clips (`js/kit/praise-clips.js`: mashaallah, subhanallah, alhamdulillah, ahsant, barakallah, allahuakbar), loaded the first time or ahead with `Kit.snd.praise.preload()`, played as a voice (effects duck under it), cancelled by `Kit.snd.stopVoice()`. A game stops it when its card closes, the page changes or the game pauses.
- **The HUD and the camera**: a game that moves its interface into the play scene (one scene draws for less than two) must keep the interface still when the camera shakes (Breakout and Balloon Pop move the interface container back by the shake offset while a shake runs).

## 2b. Learned on the quizzes (2026-11-17)

- **Rest: a scene registered and never started** sits in status INIT, and the kit counted that as "still starting", so
  the loop of any game with such a scene never slept (the quiz's Play scene waits unstarted while the child is on the
  map: 20 ms of main thread a second at 6x CPU). Fixed in `rest()`: only START, LOADING and CREATING count.
- **An engine timer or `delayedCall` counts as moving**, so a plain wait (a pause before the next question, a clock
  that ticks once a second) keeps the loop drawing the same picture at the screen's rate. A wait with nothing moving
  is a browser timer that calls `Kit.play.wake()` when it fires (the quiz's `later()`); measured in the lightning round:
  262 frames an answer before, 113 after.
- **Text costs**: the engine measures a font for every new Text by drawing it and reading the pixels back unless the
  style carries `metrics`, and `add.text(...).setResolution(d)` draws the words twice. The quiz passes `resolution`
  and cached `metrics` in the style: 4.1 ms to 1.6 ms a label at 6x CPU.
- **NineSlice in 4.2.1**: a three-slice (top and bottom 0) throws when resized; use small top and bottom slices. A
  Container's own `w` is the engine's (the transform's w, reset by `setPosition`): keep sizes in other names.
- **Quiz layout**: a quiz is read on an upright phone as much as on its side, so it lays itself out in screen points
  (one root container per scene at `view.l, view.t`, scaled by `view.pt`; Text at `Kit.play.dpr()` is then one texture
  pixel per screen pixel), not in the fixed 1920 x 1080 frame. A game's own choice (memory: game-aware sizing).
- **Measured against the DOM quizzes** (Quran Explorer, 844 x 390 and 375 x 812, 6x CPU, this Mac): at rest on the map
  or a question the new engine is lower (0.03 to 0.05 ms of main thread a second, no frames drawn; the DOM page 0.1 to
  0.3). Tapping as fast as possible (the lightning round, an answer every 2 s) they are about level: 49 to 57 ms an
  answer against 47 to 50 at 120 Hz, 21 to 26 ms a second against 22 to 25 at 60 Hz. Words drawn into textures and the
  canvas being redrawn while things move are the cost the DOM page did not have (its CSS animations ran off the main
  thread). Ready to tap after about 1.0 s against 0.5 s from a local server at 6x CPU: the engine's parse, once a
  visit; the loading picture shows at once.

## 3. Art

- **Picture files are AVIF** (measure first: Spider IK's flat, already small lossy WebP caves saved only 13% as AVIF, a second lossy pass and a slower decode on phones, so they stay WebP, noted in its `art.js`), written by `enc.save` (Helping Home: `games/helping-home/tools/art/enc.py`), with a WebP copy beside each one. A game tests AVIF once before it loads anything and uses the WebP copies only in a WebView too old for it. Offline storage keeps only the selected format: AVIF on supporting WebViews, WebP on older ones, never both copies (AGENTS.md rule 13 requires those WebViews to work offline too). Measured on Helping Home's sheets: about 45% smaller than WebP and closer to the render.
- **Full games may render their art from 3D models** scripted in Blender (Helping Home's `tools/art/`: one isometric camera, baked to trimmed atlases, with half-size normal maps for backgrounds and furniture so the engine's lights shade them). Nothing is retouched by hand.

- **A picture is made once.** Either an image file (an atlas when there are many), or, for a plain interface shape only (a card, a ring, a glow, a tick), painted once into an engine texture: `Kit.play.tex(scene, key, w, h, paint, pad)`, one texture pixel per design unit. It is a plain image texture made from the canvas (`textures.addImage`), never `addCanvas` or `createCanvas`: those build the engine's CanvasTexture, which keeps a second copy of every pixel (about 11 MB for a 2000 x 1300 sheet) for pixel reads no game here does. A game that paints more on it later calls `textures.get(key).refresh()` to upload it again. A picture of a thing (a garment, a plant, a person) comes from the art pipeline, never from code: Helping Home's character maker shows the child's own rendered clothes, cropped from the layer sheets (`tools/art/you_boxes.py`). Nothing is painted, and no Graphics is rebuilt, per frame. A shape that changes now and then (a ring that fills) is such a texture repainted only when its value moves, shown as an image (as the engine's Text is): a Graphics is rebuilt and drawn on its own every frame. Measured in Helping Home, the four need rings as Graphics cost 8 draw calls, about 0.75 ms of the graphics chip and over 1 ms of the CPU (6x slower) a frame; as images, nothing measurable.
- Content rules are in `AGENTS.md`: no faces, no people, no music, no rainbows. Words are each game's own choice (`AGENTS.md` rule 18).
- A game's look is written in the header of its `art.js`. Helping Home's look (soft toys: round, light top and deeper bottom, gloss, soft shadow, no black outlines) is the house style until the owner picks another.

## 3a. Sound

- **Recordings, never synthesis.** Every effect and ambience is a real recording of a natural sound. No music, no instruments, no chimes.
- **The originals** live beside the repo, not in it: `../KidsGames-sounds/<source>/` (Helping Home's: 52 CC0 recordings from BigSoundBank.com, see its README). Ask the owner before downloading more; credit each in the game's `audio/CREDITS.md`.
- **Cut by a script, the same way every time:** a game lists its sounds in `audio/sfx/recipe.json` (which recording, which seconds, which category) and `python3 tools/sound-cut.py <recipe>` writes them. Cuts are taken at the recording's own event boundaries (`ffmpeg silencedetect`). Each take is high-passed, faded and levelled to one loudness (loudest 400 ms at about -20 LUFS, true peak under -1.5 dBTP; ambience beds about -30 LUFS integrated): audio-design's mobile mix of about -18 LUFS. Mono AAC, 48 kbit/s.
- **One audio sprite for the one-shots** (`sfx.m4a` + Phaser's `sfx.json`): one request and one decode at boot (Helping Home: 79 takes of 39 sounds, 64 s, 440 KB, about 12 MB decoded). **Loops are files of their own**, loaded when first wanted and dropped from the cache 20 s after they stop; each carries 0.1 s of its own sound before and after its loop marker, so the AAC encoder's lead-in silence never sits in the loop.
- **Play through `Kit.snd`** (`js/kit/sound.js`): `Kit.snd.load(this, dir)` in Boot's preload; `Kit.snd.play(name, { vol, pan })` picks a take (never the last one) with a little detune and level; `Kit.snd.loop`, `Kit.snd.amb` (one ambience bed, cross-faded), `Kit.snd.voice(url)` (a recorded voice: effects and ambience duck under it). Categories `ui`, `sfx`, `amb`, `voice`. At most 3 of one sound and 12 in all at once.
- **What makes a place sound alive** (Helping Home, `listen` and `ambience` in `life/game.js`): every action of the child has its sound and repeats it while it lasts; footsteps fire on the walk animation's own frames (`animationupdate`) with the ground of the place; things far from the middle of the view are quieter and panned; a bed of sound for where the child is (town, park, fields, night, indoors, wind on the map).
- **Make the audio context while the page loads, never on the first sound**: making it took about 130 ms, and the first door the child opened froze the game for that long (found with the CPU profiler). Phaser makes its own at boot.

## 4a. The HUD (owner, 2026-11-16, from Spider IK; the `game-ui-ux` skill)

Load the `game-ui-ux` skill for any HUD or menu. Spider IK's `game/hud.js` is the reference.

**While playing, the screen is the game.**
- One pause button, top-left in the safe area, on a dark plate (readable on any background; game-ui-ux asks 3:1
  contrast for key visuals, so it never fades). No row of buttons over the play area.
- Only the progress the player needs (Spider IK: the orbs still to find), beside the pause button, one gap apart.
  Where it fits the fiction it is also shown in the world (diegetic): Spider IK's orbs circle the exit portal, dim
  until taken. The HUD copy stays as the fallback the skill asks for.
- Controls are never hidden (owner, 2026-11-16: hidden controls are hard to learn; input-systems: on-screen stick
  and buttons sized for thumbs, through the same actions). On a touch screen the stick rests at its home bottom-left
  (with its four arrows) and floats to wherever the thumb lands, returning when released; the jump button sits
  bottom-right. Both are see-through rings (a whisper of dark fill, a white edge with a soft shadow, the stick's four
  arrows) at 50% at rest and full when pressed: solid dark discs covered the cave and distracted; at 32% they vanished
  on dark rock (owner, 2026-11-16).
- Prompts follow the device last used (a touch or a key switches them at once, no restart): touch shows the on-screen
  controls and "Drag here to crawl / Tap here to jump"; keys hide them and say "Arrow keys or WASD to crawl · Space to
  jump". The first level teaches them (level-design: a teach beat) until each control has been used once, and the
  pause screen repeats the controls for the device in use.
- A level announces itself large in the middle for a moment, then leaves.

**Everything else is a stack of screens over the paused game** (game-ui-ux section 4). The pause screen: the level as
its title, the way out (the exit icon) where the pause button was, and big labelled choices (Resume first and
highlighted, Restart, Levels, Sound). The level map opens from it and closing the map pops back to it. Only the top
screen takes input; the game scene is paused under them (`scene.pause`, asked for, not tested, because scene changes
are queued to the next step).

**Laid out properly:** groups anchored to the safe area (`view.s*`), one gap constant, every touch target at least
150 units, text at least 26 px at 1080, menus with a header row (back, title, close) and content columns that never
touch. Checked by screenshot at 375 x 812, 844 x 390 and 1024 x 768.

## 4. Feel (what makes it a game)

Every touch answers at once with a sound, a squash and something flying. Things have weight (they arc, bounce and settle). The next thing to do glows, and a hint hand shows it after three idle seconds. Nothing can be failed; a wrong drop hops back. Each stage ends with a small "yes" moment and each job with a star.

## 5. A game's files

```
games/<id>/index.html        loads kahf-bridge.js, Phaser, kit/core.js, kit/sound.js, kit/play.js, then the game
games/<id>/audio/sfx/        recipe.json (what tools/sound-cut.py cuts), sfx.m4a + sfx.json, the loops
games/<id>/<name>/art.js     the paint box and shared pictures
games/<id>/<name>/common.js  saves, sounds, helpers shared by the scenes
games/<id>/<name>/<scene>.js one Phaser scene per file; all state is set in create()
games/<id>/<name>/main.js    the Boot scene and Kit.play.start
```

### 5a. Loading and the way out (learned on Helping Home 1.8.6 and 1.8.7, 2026-11-16)

- **The page draws before anything downloads.** Every `<script src>` is `defer` (they still run in order), and a loading picture sits inline in `index.html` above them: drawn with inline SVG and CSS on the game's own background colour, with no image file and no words. With plain script tags the WebView drew nothing until the 1.3 MB engine and the game had arrived: a long white screen on a first visit, and children left. Measured with the engine held back 6 s: the old page showed nothing until the game drew; the new one showed its loader at 28 ms (0.3 s on the live site).
- **The loader never sits still and never lies.** It creeps a little while the engine downloads, then follows the engine's loader (`this.load.on('progress')` in Boot and in the first scene that loads the world), and only moves forward. The game removes it when the first view is ready, on **every** way in: the normal start, the first visit's dress-up screen, and a guide opened by link. Helping Home's is `HHLoad.to(v)` and `HHLoad.done()` in `games/helping-home/index.html`.
- **A page and its scripts can come from different releases.** For up to ten minutes after a push, GitHub Pages lets a browser keep an older script, so a new `index.html` can run an old `game.js` (seen on the live site right after 1.8.6: the old script never removed the loader, which then covered the running game). Anything a new page expects from a script needs a fallback that works with the older script: Helping Home's loader also leaves once any scene past Boot is running and nothing is loading. Check the live page after every release.
- **The way out of a game is the exit icon** (owner, 2026-11-16: it exits the game, so it is not a back arrow): a door bracket with an arrow leaving it, `Kit.play.exitIcon(ctx, size, colour, lineWidth)`, the same on the kit's sorry screen and in every game, on the pause screen where the pause button was. Never a house: in a game with homes in it, a house reads as "go home". A back arrow means one step back inside the game (a guide or panel opened from another screen), never leaving it.
- **The loader is in the kit (2026-11-16, Spider IK):** the page keeps its own inline picture (`<div id="kit-load">`, its CSS reading `--p`) and loads `js/kit/load.js` right after it, without `defer`; `Kit.play.start` makes it follow the engine's loaders, the game calls `Kit.load.done()` when its first view is ready, and it also leaves by itself once a scene past Boot runs with nothing loading. Helping Home still has its own copy until its next release.

A scene object is used again each time the scene starts: keep no state outside `create()`. `?debug` exposes a test hook (`window.HHT` in Helping Home) and each scene has `this.dbg` with jumps to every state.

## 6. Done means

1. Played through in a browser at a phone on its side (844 x 390), a tablet (1024 x 768) and upright; no console errors.
2. Every state photographed (the test hook reaches each one) and looked at.
3. Exit (the exit icon), the star or finish, and saving checked. The loader shows at once and leaves on every way in (section 5a). `KahfBridge.complete()` is called when a round ends.
4. Measured, never guessed (performance-optimization): `NODE_PATH=<a checkout with playwright> node tools/perf-check.js <url> 6` throttles the CPU six times and reports the game's own work per frame idle and while dragging, draw calls, and the graphics chip's own time (`gpu`, through the browser's GPU timer: this machine's chip, so compare builds, not phones; on a phone the chip is usually what lags). `--mute` starts with sound off. Run three times and compare averages: one run varies by about 0.4 ms. Budget: p95 under 8 ms, no frame over 30 ms, no long texture upload (Helping Home 1.8.5 at night: idle 2.6 ms average, p95 3.7 ms, 2.4 ms of GPU, 31 draw calls; the live 1.8.4 was 3.9 ms, 2.8 ms of GPU, 38 draw calls). A long frame is profiled (Chrome's CPU profiler through CDP) before anything is changed.
5. **A rebuilt game beats the page it replaces** (owner, 2026-11-16: "it must beat the old one net"): old and new measured back to back, one at a time, on a 120 Hz screen and as a 60 Hz phone (every page gets every second frame), at 6x CPU, idle and while playing, at least twice. The main-thread busy time, idle plus play, is lower at both rates; no row is worse by more than the noise (about 1 point); no more frames over 30 ms; and nothing is lost: look, words, levels, saves, sound.
6. Run in the app on a budget Android phone before it is called finished: time to first picture, and frames per second.
7. Release steps as in `AGENTS.md` (version bump; Helping Home: `make-offline.py`).

## 7. Where each page stands

| Page | Built on | State |
|------|----------|-------|
| Helping Home: the life game (`games/helping-home/index.html`, `life/`; data in `tools/data/`, art tools in `tools/art/`) | **Phaser 4** | built 2026-11-11, finished 2026-11-16 (1.8.5): engine-first pass, recorded sound on Phaser, maker from rendered clothes, measured at 6x CPU; not yet measured on a real phone |
| Helping Home: the old town, the four-job home, and the separate adhan, wudu, salah and washing machine pages | removed 2026-11-11 | replaced by the life game (in git history). `settings.html` (city and madhab) remains and is not yet linked from the game |
| Spider IK (`games/spider-ik/`: `game/`, shapes from `tools/trace.js`, sounds in `audio/sfx`) | **Phaser 4** + Matter | rebuilt 2026-11-16, not yet released: Matter physics, recorded CC0 sounds, Phaser interface; measured against the old page at 6x CPU; not yet on a real phone |
| 2048, Sharp Eyes, Memory Match, Balloon Pop, Breakout, Follow the Light, Hextris, Jannah Garden, Ramadan Maze, Shape Patterns, Solar System, Space Shooter, Tower Blocks and the drawing game | **Phaser 4** | conversions implemented locally 2026-11-16; browser and offline acceptance in progress; strict old/new performance gate not yet met for every game; not released |
| Checkers and Tic Tac Toe (`game/` in each game) | **Phaser 4** | conversions implemented locally 2026-11-16; board rules preserved; not released. `js/board/` remains for legacy pages |
| Quizzes (`js/quiz/`: `quiz.js` rules and saves, `game.js` the Phaser scenes; every `games/<id>/` with a `data.js`) | **Phaser 4** | rebuilt 2026-11-17 (1.9.0): all 29 quizzes on one engine; recorded sounds (`js/quiz/audio`); saves unchanged; measured against the DOM engine at 6x CPU (section 2b); not yet on a real phone |

## 8. Not decided yet (the owner's call)

- **A build step** (TypeScript, a bundler, automatic checks that every game starts). Today there is none, by rule.
- **A staging address.** Today a push to `main` is live.
- ~~Where art comes from for full games~~ decided 2026-11-11: rendered from Blender models (section 3).
