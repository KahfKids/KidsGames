# Game quality plan (live catalog)

Audit date: 2026-11-08. Scope: the 20 games linked (not commented out) in `index.html`.
Quality bar: **Spider IK**. Every reworked game should match or beat it in art, feel and structure.

Every game runs in three places: the Kahf Kids app WebView (main target), the web, and the PWA on phones and tablets.
So each game must have proper touch controls (drag, swipe or tap on the game itself), work offline, respect safe areas and fit phone, tablet and desktop screens.

---

## 1. What we found

| # | Game | Score | Verdict | Main problems |
|---|------|:----:|---------|---------------|
| 1 | Spider IK | 4 | Keep, polish | No sound; dying has no feedback; reading canvas pixels every frame is slow on cheap Android phones. *(First launch now goes straight into play.)* |
| 2 | 2048 | 4 | Keep, polish | Copy of the original 2048 (MIT licence). Fixed 500px board; instructions say "arrow keys"; 2048 is too far a goal for ages 4–10; no sound or celebration. |
| 3 | Hextris | 3 | **Urgent fix**, then polish | **Sends every score to `http://54.183.184.126/`** and **loads a script from `http://hextris.io/a.js`** (`js/main.js:340`, `:378`). App Store and social links left in. Google Fonts over plain http. No pause when the app goes to the background. |
| 4 | Tower Blocks | 3 | Rework | CodePen copy. three.js and GSAP `latest` come from a CDN, so the **screen is blank offline**. Speed depends on frame rate (2× fast on 120Hz iPads). Blurry on high-DPI screens. "Perfect" placements give no feedback. |
| 5 | Ramadan Maze | 3 | Keep, polish → **becomes the shared maze engine** | Its maze generator is solid. But the player jumps one cell per move, the art is emoji (🌾 used for dates), there's no sound, nothing is saved, and on iPad the arrow pad disappears. |
| 6 | Animal Memory Match | 2.5 | Rework | **Layout broken on phone and tablet** (cards pushed off to the right). Tailwind loads from a CDN, so it's unstyled offline. "110 levels" is padding. Nothing saved. All art is emoji. |
| 7 | Follow the Light | 2 | Rework | Tone.js from a CDN, so **Start does nothing offline**. Lit pads slide off-centre. Lights flash for 100ms (too fast for young kids). Impossible timer later on. An extra tap ends the game. |
| 8 | Jannah Garden | 2 | Rework | Font Awesome, Tone.js and Google Fonts from CDNs, so it's blank until they load. **Clear button recurses until it crashes.** Gardens are never saved. Scrolling over the canvas plants flowers. |
| 9 | Solar System | 2 | Rework | three.js and Tailwind from CDNs, so it's **a black screen offline**. Not a game (no goal). Planets strobe instead of orbiting. Lit from the wrong side. Saturn has no rings. |
| 10 | Islamic Shapes Drawing | 2 | Rework → colouring book | Saved-page leftovers. Fill doesn't work on blank areas and leaks through lines. Rotating the device erases the drawing. "Save" does nothing. Includes sword and shield templates. |
| 11 | Shape Pattern Game 2 | 2 | Rework | Saved-page leftovers. **The dragged shape doesn't follow the finger.** Stars can be farmed. It's copying, not pattern-finding. Drag only, no tap. |
| 12 | Space Bluster | 2 | Rebuild (merge with 13) | Tone.js from a CDN, so it's **dead offline**. Speed depends on frame rate. Flat triangle and circles. No explosions. Separate "swipe here" strip. |
| 13 | Space Shooter | 1 | Rebuild (merge with 12) | `setInterval` game loop. One wave, enemies never shoot back, no feedback. Separate swipe strip covers the play area on landscape phones. |
| 14 | Breakout | 2 | Rebuild | Levels never advance. One miss ends the game. Ball is slower on phones (frame-rate dependent). Paddle snaps back to the centre after dragging. Likely silent on iOS. Separate swipe strip. |
| 15 | Balloon Pop | 1.5 | Rebuild (absorbs 18) | Saved-page leftovers. Each balloon runs its own 10ms timer. Rapid taps score the same balloon twice. No levels, sound or ramp. |
| 16 | Checkers | 1 | Rebuild | **Kings move straight, not diagonally.** Fixed 400px board overflows phones. Game hangs if the player has no moves. No restart. |
| 17 | Tic Tac Toe | 1 | Rebuild | Pure-CSS CodePen demo (9,000 lines of selectors). **The AI is perfect, so a child can never win.** Hover-only preview. End card is clipped on phones. |
| 18 | 30 Seconds Challenge | 1 | Rebuild | Some rounds can't be solved (the "different" icon looks identical). Symbols of other religions in an Islamic kids' app. Tapping everything wins. |
| 19 | Islamic Good Deeds | 1 | Remove (content moves into 15) | A static star appears and disappears. Ten text facts that pre-readers can't read. |
| 20 | Islamic Maze Adventure 4 | 1 | Remove (replaced by 5) | ~85% saved-page leftovers, including a **hidden `allow="microphone"` iframe**. Levels can be unwinnable. "100 levels" are one repeated staircase. |

### Problems shared by almost every game
- **Dated or broken touch controls:** separate "swipe here" strips (Space ×2, Breakout), arrow pads (mazes), drag that doesn't follow the finger (Shape Pattern), hover-only effects, and "arrow keys / spacebar" text.
- **CDN dependencies** break offline (`sw.js` skips cross-origin requests): Tone.js, three.js, GSAP, Tailwind, Font Awesome, Google Fonts. **5 games are blank, unstyled or dead offline** (Tower Blocks, Follow the Light, Solar System, Space Bluster, Animal Memory Match), and Jannah Garden, Breakout, Space Shooter and Hextris lose their icons or fonts.
- **Game loops** are `setInterval` or fixed steps per frame, so speed depends on frame rate. No game except Spider IK pauses when the app is backgrounded, so a child returns to "Time's up".
- **Art** is emoji, CSS boxes or bare primitives, with no consistent style and no depth.
- **No sound** in 14 of 20 games, and the rest rely on a CDN Tone.js.
- **No real progression:** fake "100 levels", nothing saved, harsh instant game-over and fixed timers for 4-year-olds.
- **Saved-page leftovers:** 5 live games (29 folders in total) contain a Canva "Save Page As" copy with a screen-recorder extension's code, a Cloudflare challenge script, 404 scripts and a hidden microphone iframe.
- Only Spider IK calls `KahfBridge.complete()`.

---

## 2. Phase 0 — urgent fixes (safety and offline), no redesign — **done 2026-11-08, awaiting review**

1. **Hextris:** remove the score beacon (`js/main.js:340`), the remote `hextris.io/a.js` loader (`:376-382`), the share widget and the App Store / Twitter / OpenGraph metadata. Load Exo locally.
2. **Saved-page leftovers in live games** (Islamic Maze 4, Balloon Pop, Good Deeds, Shapes Drawing, Shape Pattern 2): delete the microphone iframe, the Cloudflare injector, the screen-recorder shadow DOM and CSS, the 404 `saved_resource` script and the stray file input.
3. **Bundle every CDN dependency locally** or drop it: Tone.js (or replace it with the shared audio module, step 3), three.js (pin the version), GSAP (pin), Tailwind (compile only the classes used), Font Awesome (inline SVG icons instead), Google Fonts (local `woff2` or the system font).
4. Fix one-line game-breakers: the Jannah Garden Clear crash, Checkers king moves, the Animal Memory Match grid on phone and tablet, and Tic Tac Toe being unwinnable (temporary: hide it until it's rebuilt).
5. Bump `GAMES_CACHE` in `sw.js`.

---

## 3. Shared game kit (`/KidsGames/js/kit/`), built from Spider IK's patterns

One small set of plain-JS modules (no framework, no CDN) that every reworked game uses, so quality is consistent and each game stays small.

| Module | What it gives each game |
|--------|-------------------------|
| `loop.js` | `requestAnimationFrame` with a capped delta time and a fixed-step simulation (like Spider IK's 30Hz accumulator). Auto-pauses on `visibilitychange`, `blur` and when a menu opens. Timers count game time, not wall-clock time. |
| `input.js` | **Modern touch controls through pointer events with pointer capture**: tap, relative drag (the object moves with the finger, offset so the finger never hides it), swipe with hold-to-repeat, floating joystick, two-zone (left/right) control. Blocks pinch, double-tap zoom, long-press callouts and context menus. Keyboard and mouse are secondary. **No on-screen arrow pads, no separate swipe strips.** |
| `shell.css` / `shell.js` | Safe-area variables, `100dvh` full-bleed stage, letterboxed aspect, HUD pills, 48px+ icon buttons, pause sheet, loading and retry messages. Hides the fullscreen button inside the app WebView or an iframe. High-DPI canvas setup (pixel ratio capped at 2). |
| `progress.js` | Namespaced `localStorage` (`kahf-<game>`), levels and 1–3 stars, chapters/worlds, unlocks, and a level-select sheet (opened from a button; **launch goes straight into play**, like Spider IK now does). Calls `KahfBridge.complete()` per level and `KahfBridge.answer()` for quiz-type taps. |
| `audio.js` | WebAudio, unlocked on the first tap (fixes silence on iOS). Small local SFX sprite (pop, tap, correct, wrong, win, star), mute toggle that is remembered, and a hook for voice prompts so pre-readers get spoken instructions. |
| `fx.js` | Tweens and easing, squash-and-stretch, particles on canvas (not 100 DOM nodes), screen shake, hit flash, star-burst level-complete card. Respects `prefers-reduced-motion`. |
| `precache.js` | Spider IK's "cache every file this game needs" message to the service worker, so all levels work offline after one visit. |

**Full-screen stage (required, owner 2026-11-08):** every game fills the whole screen edge to edge (inside safe areas), like Spider IK.
No game sits in a card, box or framed panel with page background around it; HUD floats over the play area as small pills.

**Definition of done for every game** (checked in the browser at 360×640, 375×812, landscape phone, 768×1024, 1024×768 and desktop):
- Plays fully offline after one visit, with no requests to other sites.
- Plays with one thumb and no instructions, and the first-level hint fades after first use (Spider IK style).
- No frame-rate dependence (same speed at 60Hz and 120Hz); pauses when the app is backgrounded.
- Levels or stars saved and restored; level complete calls `KahfBridge.complete()`.
- Sound with mute; feedback on every tap, hit, win and loss.
- Full-screen stage, no card or boxed play area, on phone, tablet and desktop.
- New art in the Kahf world style (section 4): the old art is replaced, not patched.
- No emoji as primary art; no hover-only UI; no `alert()`; tap targets ≥ 48px.

---

## 4. Art direction (same or better than Spider IK)

Spider IK's look comes from **layered depth**: a painted back layer, a main layer and a dark foreground silhouette, a limited palette per chapter, vector sprites and soft light.
Its art belongs to its original author (credited "A game by WAFEE8"), so we **match the approach with our own art** and don't reuse its files.

- **One Kahf world style** across games: soft flat-vector shapes, 3 depth layers with haze, gentle gradients and rim light, and Islamic geometric patterns, lanterns, arches and crescents done with care (not emoji).
- **Palette per world:** desert dusk, night garden, ocean, space, Ramadan night. Each game picks one or two.
- **Sprites as SVG**, built once into a sprite bundle (like Spider IK's `assets.js`) and drawn to canvas, so they stay sharp on every screen.
- **Backgrounds** as layered SVG or WebP strips with parallax. Keep the first load under ~250 KB and load each level's art when it's needed.
- **A shared mascot** (a kid character) that appears in menus, hints and level-complete cards, to tie the catalog together.
- Animation principles on every interactive object: anticipation, squash and stretch, follow-through, eased (never linear) motion, idle breathing.

---

## 5. Per-game plan (touch controls in bold)

**Rebuilds** (new code on the kit, keeping only the idea):
- **Space game** (merges Space Bluster and Space Shooter): **drag anywhere to fly; the ship follows the finger with an offset**; auto-fire. Waves in 4 worlds with bosses, power-ups, shields instead of instant death, explosions with shake, parallax starfield, 1–3 stars per wave.
- **Breakout:** **drag anywhere to move the paddle; tap to launch.** 3 lives, 30 designed levels in 3 worlds (pattern-shaped brick layouts such as stars and arches), power-ups that do what they say, ball trail and brick shatter.
- **Balloon Pop** (absorbs Good Deeds): **tap to pop.** Balloons drift with sway; some carry a good-deed picture with voice-over ("Helping Mum!"). Levels by theme, with combos and goals ("pop 5 green"). The pop burst has confetti and a sound in a rising scale.
- **Board games** (Checkers and Tic Tac Toe on one board kit): **tap a piece, tap a highlighted target, or drag the piece.** Correct rules (diagonal kings, forced captures, multi-jumps, no-move detection). Easy, medium and hard AI where easy loses often. Pieces slide; captures pop. Best-of-3 with stars. Arabesque board art.
- **Spot the Difference** (replaces 30 Seconds Challenge): **tap.** Curated SVG icon sets, checked for look-alikes and theme. The grid grows from 2×2 to 6×6 as the child improves. Wrong taps cost a second. Timer optional below age 6.

**Reworks** (keep the engine or data, replace the presentation):
- **Maze engine** (Ramadan Maze, replaces Islamic Maze 4): **drag to steer; the character glides along corridors and keeps going while the finger is held.** Smooth tweened movement, character sprite, real dates, a house at the end with an iftar celebration. 30 levels across 3 worlds; saved stars; pauses when hidden.
- **Animal Memory Match:** **tap.** Fix the grid layout first. Illustrated SVG cards, flip sound and animal sounds on match, an honest curve of ~30 levels (2×2 to 6×5), no timer on the first world, saved stars.
- **Follow the Light:** **tap.** A distinct note per pad, lights ≥ 400ms with a gentle speed ramp, a per-tap grace window, ignore extra taps, 3 hearts, levels with stars, fixed pad layout, colour-blind-safe shapes.
- **Jannah Garden:** **tap to plant; drag to move a planted item.** Full-screen garden, picture buttons (not dots and icons), grow-in animation, butterflies and water ambience, depth sorting, saved gardens, gentle goals ("plant 3 roses by the river").
- **Colouring Book** (Shapes Drawing): **tap to fill (main mode), finger to draw (optional).** SVG line-art pages (mosque, lantern, camel, garden, patterns; no weapons), working fill, undo, brush sizes, high-DPI canvas, the drawing survives rotation, Save to a gallery in `localStorage`.
- **Shape Patterns:** **tap a shape and it flies into the next slot; drag also works.** Real "what comes next?" patterns (AB, AAB, ABC, growing), voice prompts, wrong-answer wiggle, no star farming, 30 levels.
- **Tower Blocks:** **tap anywhere.** Bundle the libraries locally or rewrite in Canvas2D, delta-time movement, high-DPI, "Perfect!" text plus a sound and a slight grow on perfect stacks, saved best score, milestones (10/25/50) with stars.
- **Solar System:** **drag to orbit, tap a planet, pinch to zoom on the canvas only.** Bundle three.js locally, light from the sun, textures and rings, labels, delta-time orbits. Add a "Find the planet!" game with voice and stars.

**Polish** (keep):
- **Spider IK:** sound (crawl, orb, portal, hazard), a death flash and a respawn swirl, optional stars per level, replace per-frame `getImageData` with a cheap collision mask.
- **2048:** fluid board on tablets, touch copy, kid-sized goals (reach 64, then 128, then 256) with a celebration at each, sound. Keep the MIT licence notice.
- **Hextris** (after the Phase 0 fix): a slower kid mode, sound, pause on `visibilitychange`, in-game help. Keep the GPL-3 licence notice.

---

## 6. Order of work

**Status (2026-11-09):** Phase 0 and Phase 1 committed (shared kit in `js/kit/`, Breakout rebuilt as **Mosaic Breaker**). Phase 2 and the rework wave built and awaiting review: **Star Rangers**, **Balloon Pop** (with good deeds), **Checkers** and **Tic Tac Toe** (board kit `js/board/`, toy-robot opponents), **Sharp Eyes**, **Ramadan Maze** (Kids Maze redirects there), **Follow the Light**, **Jannah Garden**, **Solar System**, **Colouring Book** and **Shape Patterns**. Owner rule: no faces in any art. Still to do: Memory Match, Tower Blocks, then the polish wave.

1. **Phase 0 urgent fixes** (section 2).
2. **Kit + one reference game:** build `js/kit/` and rebuild **Breakout** with it as the proof (it touches loop, input, levels, fx and audio). Review it against Spider IK before going wider.
3. **Rebuild wave:** Space game → Balloon Pop → Board games → Spot the Difference. Remove Islamic Maze 4 and Good Deeds from the catalog as their replacements ship.
4. **Rework wave:** Maze engine → Memory Match → Follow the Light → Shape Patterns → Colouring Book → Jannah Garden → Tower Blocks → Solar System.
5. **Polish wave:** Spider IK, 2048, Hextris.
6. For each game: new thumbnail in the same art style, bump `GAMES_CACHE`, test on an iPhone in the Kahf app, an Android in the Kahf app, an iPad and desktop Chrome.

## 7. Outside this plan
- The 32 game folders not linked from the catalog are still deployed and publicly reachable; 24 of them contain the same saved-page leftovers. Decide later: delete, or rework the best ones.
- Licences and credits to keep or confirm: 2048 (MIT), Hextris (GPL-3), the Tower Blocks and Tic Tac Toe CodePen authors, Spider IK (WAFEE8).
