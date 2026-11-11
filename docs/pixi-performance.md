# PixiJS performance guide

How to keep a game at 60 frames per second on a budget Android phone. Part of the game standard (`docs/game-standard.md`).

Sources: the PixiJS 8 guides, read on 2026-11-11 for the pinned version 8.22.0, and what porting Helping Home taught us. Lines marked *(PixiJS)* are PixiJS's own advice; the rest is ours.

- https://pixijs.com/8.x/guides/concepts/performance-tips
- https://pixijs.com/8.x/guides/concepts/garbage-collection
- https://pixijs.com/8.x/guides/concepts/render-groups
- https://pixijs.com/8.x/guides/components/scene-objects/container/cache-as-texture
- https://pixijs.com/8.x/guides/components/scene-objects/particle-container
- https://pixijs.com/8.x/guides/components/renderers

When PixiJS is upgraded, read these pages again and update this file in the same change.

---

## 1. Measure first

- Only optimise what you measured *(PixiJS: "Only optimize when you need to")*.
- Measure on the budget phone, inside the Kahf Kids app, not on a laptop. A laptop hides every problem.
- Find out which kind of slow it is before changing anything:
  - **Making pictures** (drawing art, turning SVG into pixels, uploading textures) is processor work. It shows as a long load or a hitch when something new appears. PixiJS does not make it faster.
  - **Drawing the frame** is graphics-chip work. It shows as a low, steady frame rate. This is what PixiJS makes fast.
- Helping Home has a readout: add `?perf=1` (frames per second, the worst frame of the last second, pictures still being made, texture memory, pixel density, renderer). Give every game on the standard the same readout.

## 2. Renderer settings (the kit sets these; do not override)

- WebGL renderer. PixiJS recommends it for production; its WebGPU renderer is experimental and its canvas renderer is not released *(PixiJS)*.
- `antialias: false` and an opaque canvas: PixiJS's advice for slower phones *(PixiJS)*. Sprites do not need antialiasing.
- Pixel density from `Kit.gfx.dpr()`: at most 2, and 1.5 on phones with 2 GB of memory or less. Density is the biggest single cost: 3x is 2.25 times the pixels of 2x, for the frame and for every texture.

## 3. Sprites and textures: the fast path

- Sprites are the fastest thing PixiJS draws *(PixiJS)*. Build games out of sprites.
- Sprites are sent to the chip in batches, and one batch holds up to 16 different textures, fewer on weak hardware *(PixiJS)*. So:
  - Put small pictures that appear together on one spritesheet (texture atlas) *(PixiJS: "Use Spritesheets where possible to minimize total textures")*.
  - Do not create one texture per object when objects share a picture. One texture, many sprites.
- Use smaller textures on weak phones *(PixiJS)*. Size every texture for the density from `Kit.gfx.dpr()`, never larger than it is shown.
- No texture longer than `surface.maxTex` on a side (4096 at most). Cut big pictures into tiles.
- Whole-pixel positions and sizes keep hand-drawn art sharp.

## 4. Draw order and batches

- Order matters: sprite, graphic, sprite, graphic is slower than sprite, sprite, graphic, graphic *(PixiJS)*. Keep the same kind of thing together in the scene.
- **A different blend mode breaks the batch** *(PixiJS)*. Screen, normal, screen, normal is four draw calls; screen, screen, normal, normal is two. Put everything that glows (additive) in one run, and tints (multiply) in one run at the end.
- Fewer, larger batches is the goal. If the draw-call count climbs with the number of objects, something is breaking batches.

## 5. Graphics (shapes drawn by PixiJS)

- Fast when they are **not rebuilt** *(PixiJS)*. Moving, fading or tinting a Graphics is free; clearing and redrawing it every frame is not.
- Small ones (100 points or fewer) are batched like sprites *(PixiJS)*.
- Hundreds of complex Graphics are slow: turn them into textures and use sprites *(PixiJS)*. For a shape that never changes, paint it once (`surface.paint`) or use `renderer.generateTexture`.
- Our renderer has antialias off, so Graphics edges are jagged. Anything with a visible outline (bubbles, arrows, hearts) is painted once as a texture instead. Helping Home does this for every overlay.

## 6. Text

- Do not change text every frame: each change draws to a canvas and uploads it *(PixiJS)*.
- For numbers that change (score, timer) inside the play area use `BitmapText` *(PixiJS)*.
- By our standard, HUD text is DOM (`js/kit/ui.js`), so most games need no PixiJS text at all.

## 7. Masks and filters: avoid

- Masks cost, in this order: a rectangle mask is cheapest, a Graphics mask next, a sprite mask is very expensive *(PixiJS)*. Hundreds of masks will slow a game badly *(PixiJS)*.
- Filters are expensive *(PixiJS)*. If one is truly needed: set `filterArea` so PixiJS does not measure the object, and set `filters = null` when done to release memory *(PixiJS)*.
- On a budget phone, the answer is almost always to bake the effect into the texture when the picture is made.

## 8. Scene structure

- Keep the scene graph stable. PixiJS reuses its drawing instructions while the structure stays the same; moving, scaling, fading and tinting are cheap. Adding, removing and re-ordering objects every frame is not.
- **Pool** objects instead of creating and destroying them *(PixiJS: "Use Pooling")*: bullets, particles, pops.
- A container full of things that never change can be drawn once with `container.cacheAsTexture()`; call `updateCacheTexture()` after changing it *(PixiJS)*. Good for a static background built from many pieces.
- Render groups (`isRenderGroup: true`) split the scene into parts PixiJS manages separately, for example the world and an overlay. Use them only when profiling shows a gain; too many make things slower, and most games need none *(PixiJS)*.

## 9. Do not draw what is not there

- Do not render when nothing changed. A board game waiting for a tap should draw zero frames. Call `surface.render()` on change.
- Leave things that are off screen out of the scene (or hide them). PixiJS's own culling (`cullable = true`) helps a game limited by the graphics chip and hurts one limited by the processor, so PixiJS suggests doing it in the game *(PixiJS)*.
- Pause when the app is in the background (`Kit.loop` does).

## 10. Many small things

- Up to a few hundred (sparks, rain, confetti): pooled sprites sharing one texture.
- Thousands: `ParticleContainer` with `Particle`, and mark only the properties that really change as dynamic *(PixiJS)*. PixiJS calls this API "stable but experimental", so check it again on every PixiJS upgrade.

## 11. Memory

- Destroy what you made: `sprite.destroy()`, and `surface.free(t)` for kit textures *(PixiJS: "Explicitly Destroy Objects")*.
- PixiJS collects textures by itself after 3600 frames unused, checking every 600 *(PixiJS)*. Textures made with `surface.texture` are **not** collected, because their canvas was handed back and could not be uploaded again: free them yourself.
- Destroying many textures at once freezes the game: spread it out *(PixiJS)*.
- Keep a budget. Helping Home caps its pictures (from about 52 MB, more on big sharp screens) and drops the ones not used lately. Phones kill a WebView that takes too much.
- A canvas keeps its memory until its size is set to 0. `surface.texture` does that for you.

## 12. Loading

- Make pictures before play, behind the loading veil, not during it.
- Pictures that must be made during play are made in small pieces, one per frame, so no frame waits long (Helping Home: pieces of at most 400 pixels).
- Uploading a big texture hitches. Upload at load time; upload tiles, not one giant picture.
- First load under about 250 KB of the game's own files. PixiJS itself is shared and saved after the first game.

## 13. Input

- If a game uses PixiJS events: set `interactiveChildren = false` on containers with nothing to tap, and give tappable things a `hitArea`, so PixiJS does not search the whole scene *(PixiJS)*.
- Our games take touches on the canvas through `Kit.pointer` and find the target themselves.

## 14. Before a game ships

- [ ] 60 frames per second on the budget phone, in the app, in the busiest scene.
- [ ] No frame rebuilds Graphics or text.
- [ ] No masks or filters in play (or one, measured).
- [ ] Glows together, tints together; draw calls do not grow with the number of objects.
- [ ] Nothing is drawn while the screen is still.
- [ ] Textures sized for `Kit.gfx.dpr()`, none longer than `surface.maxTex`.
- [ ] Memory stays flat over ten minutes of play.
- [ ] Sending the app to the background and back brings the pictures back (`surface.onLost`).
