# Crescent Peak — Game Design Document

**Version:** 0.6 · **Updated:** 2026-11-17 · [Features](#feature-index) · [Decisions](#decisions) · [Change log](#change-log)

*Crescent Peak (Bangla: চাঁদের চূড়া) is the title.*

## Summary
In the last days of Sha'ban the child arrives by ferry on a mountain island to start Ramadan with their grandparents. Every year Grandpa climbs Crescent Peak with the imam on the 29th to look for the new moon, but this year his knee hurts, so the child will go in his place. Across days and nights the child helps people and animals, fishes, races, explores and earns ribbons that let them climb and glide further, and lanterns of kindness that light up the village. When they are ready, they choose the 29th, race the setting sun to the summit, see the thin crescent with the imam, and glide home over the lanterns they earned. The island stays open through the Ramadan nights that follow, as the moon grows night by night.

| | |
|---|---|
| Genre and camera | 3D exploration platformer in the style of *A Short Hike*: an auto-following third-person camera, a low-poly world, a pixel render |
| Audience | children 5–11 and their families; no reading needed to play |
| Platforms and input | Kahf Kids app WebView (Android and iOS) first, then web and PWA. Touch first (floating stick, two buttons; dragging to look is optional), keys too |
| Session | 10–30 min sittings. The summit in 1.5–2 h; a typical child plays 4–5 h; everything in 7–9 h |
| Engine | **three.js** draws the world (D-008). The HUD and sound are Phaser 4 through `Kit.play`, in one of two builds measured in M1 (D-016). Phaser's loop is the only loop: `Kit.gfx3d.render()` is called from it each frame (no second `requestAnimationFrame`). All input comes through Phaser; in build B the three.js canvas has `pointer-events: none`. The 288 px applies to the world only; the HUD uses `Kit.play.dpr()`. `js/kit/gfx3d.js` is the one ES module (it imports three.js, its GLTF loader and three-mesh-bvh, each pinned with a licence) and exposes `Kit.gfx3d`; game scripts stay plain `defer` scripts. M1 also rewrites `docs/game-standard.md` §3 (`Kit.play.dpr()`, the measured budget, the build-B exception if it wins) |
| Scope | one release, when everything is done and production grade (D-023): 18 areas, 7–9 h |
| References | *A Short Hike*: a tiny open world full of places, a summit goal, stamina that grows by collecting, helping quests, fishing with a journal, a ball game, races, a boat, treasure maps, tools that open new play, signs instead of markers, the low-res pixel look. *Journey*: the wordless glide home. Their story, characters, art and names are not used |

## Pillars
1. **The island is the teacher.** Landmarks, paths, signs and curiosity guide the child. There are no quest markers, no minimap and no waypoint line; Grandpa's hand-drawn map on the pause screen shows landmarks and "you are here", nothing more.
2. **Thrills, never failure.** Races, wind gusts, high glides, a big fish and the setting sun give real excitement, but there is no health, no fail state and no fall damage, and nothing collected is ever lost. A missed try costs seconds. Nothing rewards a risky act a child could copy (high jumps, climbing into wells or onto roofs).
3. **Kindness opens the mountain.** Kindness to people and to every living thing is the heart of the story. Ribbons come from helping and discovering, and every kindness lights a lantern in the village. Helped animals stay near the child afterward, so kindness shows in the world. Nothing is bought; there is no money.
4. **Creation is the wonder.** Water, bees, mountains, sky, day turning to night and the moon's month are shown with awe and kept accurate. The child watches the old moon thin before dawn and the new crescent grow after the 29th. An ayah, looked up from the source, sits where the moment earns it. Worship is never scored.
5. **Runs on a budget phone.** A steady 60 fps on a budget Android WebView decides every art and tech choice: a fixed low-res world render, light and shade baked into the meshes, merged scenery, a far mesh for distant landmarks, and no shadow maps. The one real-time light is the child's hand lantern.

## Core loop
```
explore → notice (someone needs help / a fish / a race / a hidden ledge) → do it → ribbon, lantern or tool → climb, glide or go further → new area or new hour → explore
```
- **Seconds:** run, jump, climb, glide, swim, row ([movement](features/movement/design.md)), with the camera ([camera](features/camera/design.md)); talk ([dialogue](features/dialogue/design.md)); cast and reel ([fishing](features/fishing/design.md)).
- **Minutes:** helps and hidden spots ([quests](features/quests/design.md)), races, games and collections ([side activities](features/side-activities/design.md)). They give ribbons and lanterns ([ribbons](features/ribbons/design.md)) and tools ([tools](features/tools/design.md)), which open more of the island ([island layout](features/island-layout/design.md)).
- **Hours:** day turns to night ([day and night](features/day-night/design.md)), with different fish, creatures and activities at each hour; any bench skips to the next dawn, day, dusk or night. The child chooses the 29th ([story](features/story/design.md)).
- **Between sessions:** autosave ([saving](features/saving/design.md)).

## Feature index

| Feature | Status | Built in | Summary | Docs |
|---|---|---|---|---|
| Movement | designed | M1 | Run, jump, climb, flap, glide, swim; touch stick plus two buttons | [design](features/movement/design.md) |
| Camera | designed | M1 | Auto-follow; optional drag; pulls back while gliding | [design](features/camera/design.md) |
| Pause and HUD | designed | M1 | One pause button; a permanent ribbon row; controls always at home; map, journal and notebook on the pause screen | [design](features/pause-hud/design.md) |
| Saving | designed | M2 | Autosave on each ribbon, lantern, catch and area; the shape needs the owner's OK | [design](features/saving/design.md) |
| Ribbons | designed | M1 | 24 stamina ribbons (7 reach the top), plus lanterns of kindness for every other help | [design](features/ribbons/design.md) |
| Island layout | designed | M1 | Level design: 18 areas; two routes up; a far mesh for landmarks | [design](features/island-layout/design.md) |
| Environment | designed | M2 | The look: fixed 288 px render, one 32-colour palette, plants, rocks and props for each area | [design](features/environment/design.md) |
| Day and night | designed | M1 | A 24-minute day, benches skip ahead, baked light, an accurate moon, weather | [design](features/day-night/design.md) |
| Water | designed | M2 | Sea, harbour, pond, rapids, waterfall, reef, lake, tarn, hot spring | [design](features/water/design.md) |
| Fishing | designed | M2 | Cast, bite, reel; 16 kinds plus 4 rare; the catch feeds the village | [design](features/fishing/design.md) |
| Side activities | designed | M2–M5 | 17 activities: Keep it up, flag runs, swift glides, shells, notebook, lanterns, iftar plates, rowboat, diving, sledding, rapids, treasure maps… | [design](features/side-activities/design.md) |
| Tools | designed | M4 | Tools that open new play, plus things to wear | [design](features/tools/design.md) |
| Characters | designed | M2 | The child, family, imam and villagers: faceless, modest, readable | [design](features/characters/design.md) |
| Animals | designed | M2–M5 | About 50 kinds; faceless; some need help | [design](features/animals/design.md) |
| Story | designed | M3 | The last days of Sha'ban → the 29th → the crescent → Ramadan nights | [design](features/story/design.md) |
| Dialogue | designed | M2 | Short bubbles with pictures, at most 2 choices, a JSON graph, English and Bangla | [design](features/dialogue/design.md) |
| Quests | designed | M2–M5 | Helps for people and animals, and hidden spots | [design](features/quests/design.md) |
| Audio | designed | M2 | Nature recordings by place and hour; no music, no voices; the summit recitation | [design](features/audio/design.md) |

## Build steps
One release, when everything is done and production grade (D-023). With no early release, the risks are proven first, and the payoff is built before the breadth.
1. **M1, speed and memory:** a blockout of all 18 areas at final triangle density; movement, camera, ribbons, the HUD, the day and night light, the far mesh, chunk loading, three-mesh-bvh, and both renderer builds (D-016), following `docs/game-standard.md` §3 (three.js pinned with its licence, `js/kit/gfx3d.js`, the real-WebGL check and the kind message) · done when: 60 fps at the 6x CPU check and on a budget Android phone in the app, memory measured, a projected download under 20 MB, the renderer build chosen, and the climb and glide feel right in a side-by-side session.
2. **M2, one finished slice:** the harbour and village at production grade with one of every system: a help for a person, a help for an animal, fishing, Keep it up, dialogue in both languages, day and night, saving and sound. Grey-box prototypes of the risky mechanics: rowing, diving, sledding, the rapids · done when: a child plays 30 min unaided; hours and bytes per area are measured.
3. **M3, the spine:** the easy route to the summit and the whole finale (the 29th, the crescent, the lanterns, the glide home, Ramadan nights). It is the payoff and the heaviest view, so it isn't left to the end · done when: the finale plays at 60 fps on the budget phone.
4. **M4, breadth:** the low island, then the middle, then the high areas, then offshore (rowboat, reef, far islet last) · done when: all 18 areas are at production grade.
5. **M5, content complete:** every ribbon, lantern, fish, tool and notebook entry; playtests with children · done when: a typical child plays 4–5 h and everything can be found in 7–9 h.
6. **M6, production pass:** every area checked on the budget phone in the app; the offline size; the three screen sizes; a faceless hub tile in `index.html` and `sw.js`; the game added to `landscape-games.ts` (an app release); the version bump · done when: the release checklist in `AGENTS.md` passes.

**Every step is tested the same way:** `node --check`; `tools/check-data.js` (24 ribbons, unique ids, and a walk of the ribbon graph proving every needed ribbon is reachable with those already reachable); `?debug` (warp to an area, set the hour, give ribbons); `?perf=1` (frame time p95, draw calls, triangles, memory, chunk loads); `tools/perf-check.js` at 6x CPU, three runs; a 30-minute lap of the island with memory steady within 10%; background the app and return (a lost WebGL context); the three screen sizes; no console errors. The reference phone's model, memory and graphics chip are written into M1's results; until one is named, 6x CPU is the stand-in, and the report says so.

## Files
`games/crescent-peak/`: `index.html` · `offline.json` · `CREDITS.md` · `game/` (main, world, player, camera, light, water, people, creatures, talk, quests, fishing, activities/, hud, pause, save) · `data/` (talk, strings, quests, fish, creatures, areas, palette, credits; all JSON) · `models/` (chunks/`cX_Y.glb` and `cX_Y.col.glb`, `far.glb`, people, animals, props) · `art/` (HUD pictures through `Kit.play.tex`) · `audio/` (sfx with its recipe, beds, ayah, `CREDITS.md`) · `tools/` (blender/, `make-offline.py`, `check-data.js`, `budget-check.js`). The asset pipeline is in [environment](features/environment/design.md).

## Direction
- **Tone:** warm, curious and funny, with small worries that can be solved (a lost lamb, a shy child). Nothing frightening.
- **Tension and excitement:** flag runs against a rival who gets faster; wind gusts on high glides; narrow ridges and swaying rope bridges; a big fish pulling; leading turtle hatchlings at night; the forest at night with only the lantern; a rain shower moving in; and the sunset race on the 29th, where the sun slows near the horizon but never waits frozen, and the crescent stays up until the child arrives (pillar 2).
- **Art:** low-poly models with flat shading and colours from one 32-colour palette, stored in the vertices. The world is rendered at about 288 px on the phone's short side and scaled up without smoothing. The palette comes from our own reference photos of a terraced Mediterranean-style mountain coast. No faces (rule 14). No rainbows, even after rain (rule 16). It is final for this game; the M1 screenshot only tunes 288 px against 360 px.
- **Light:** sky, ground and sun light computed per vertex; shade baked in Blender with no direction (so a moving sun never contradicts it); night glow baked as a second colour set; glowing sprites for lanterns and fireflies; blob shadows; one real-time light, the hand lantern ([day and night](features/day-night/design.md)).
- **Audio:** real nature recordings only; no music and no voices. Nobody speaks, as in the reference. The only human voice is the Quran recited at the summit (rule 15, D-003).
- **Game feel:** landing puffs dust, the shawl snaps open, a ribbon flutters on, the rod shakes and creaks; the camera pulls back while gliding. No screen shake.
- **Accessibility:** every line has a picture; hints and maps are pictures (a place silhouette and a time icon); text is sized by this game's own layout, checked at the three sizes; no colour-only cues; nights stay readable.
- **Performance budget:** at most 100 draw calls and 100,000 triangles on screen, no texture over 1024 px, no shadow maps, a 150 m detailed draw distance plus an always-drawn far mesh of the whole island (at most 3,000 triangles, one draw). Characters at most 1,200 triangles and animals 600; at most 6 skinned people and 6 skinned animals at once; everything else moves in the vertex shader. Chunks are loaded by distance, with one texture or mesh upload a frame. Measured each milestone at 6x CPU and on the budget phone.
- **Download budget:** at most 20 MB for the whole game, cached for offline play. Six shared ambience beds, each with a day and a night version, instead of one per area.

## Game-level acceptance
- A first-time child of 6 earns the first ribbon in under 5 minutes without reading.
- 60 fps on the budget Android phone in the app, in the busiest view (the village from the cliffs at dusk, lanterns lit).
- The game plays offline after one visit, with no outside requests, in at most 20 MB.
- Layout passes at 375 x 812, 844 x 390 and 1024 x 768.

## Decisions

| ID | Date | Decision | Alternatives considered | Why | Affects |
|---|---|---|---|---|---|
| D-001 | 2026-11-17 | An original game inspired by *A Short Hike* | Journey, Hoa, Gibbon; a straight copy | Owner's choice. A calm exploration game is missing from the hub. We borrow the kind of play only | all |
| D-002 | 2026-11-17 | 3D | 2D Phaser side view | Owner: "if its 3d we will do 3d" | all |
| D-003 | 2026-11-17 | No music and no voices: nature recordings carry every place and the glide. The only human voice is the recitation of 88:17–20 at the summit (EveryAyah, human reciter), never machine-generated | hums, a glide voice, voiced phrases, Common Voice clips, text-to-speech | Owner: "like Short Hike" and "voice must be authentic voice not machine generated" | [audio](features/audio/design.md) |
| D-004 | 2026-11-17 | The story is the hilal sighting on 29 Sha'ban | a phone call at the summit (the reference); a picnic | A real reason to reach the top at sunset, and a sunnah taught gently | [story](features/story/design.md) |
| D-005 | 2026-11-17 | Stamina is ribbons on the shawl, shown in the world | feathers (too close to the reference); a HUD bar | Rule 18a wants progress shown in the world; ribbons are our own | [ribbons](features/ribbons/design.md) |
| D-006 | 2026-11-17 | Time of day moves with progress, not a clock → superseded by D-009 | a real clock; fixed light | No timer pressure | [environment](features/environment/design.md) |
| D-007 | 2026-11-17 | The child does not decide Ramadan; the imam and adult sighters do | the child's sighting counts | Accurate to how sighting is decided; the child shares the moment | [story](features/story/design.md) |
| D-008 | 2026-11-17 | three.js draws the world | Phaser alone; three.js alone with its own HUD | The reference's style is free-camera 3D, which Phaser can't draw; the owner left the choice to me | all |
| D-009 | 2026-11-17 | A full day and night cycle (24 min a day); benches skip ahead; the child picks the 29th | progress-driven sky (D-006) | Owner asked for day and night; each hour adds fish, creatures and activities | [day and night](features/day-night/design.md), [story](features/story/design.md) |
| D-010 | 2026-11-17 | Fishing is in, with a journal → changed by D-015 | no fishing | Owner asked for it; it is the reference's biggest side activity | [fishing](features/fishing/design.md) |
| D-011 | 2026-11-17 | 18 areas and many activities; long play time | 10 areas, 1–2 h | Owner: "like the hike, 5–10 hours" | [island layout](features/island-layout/design.md) |
| D-012 | 2026-11-17 | No money; rewards are ribbons, lanterns, tools and things to wear | coins and a shop, as in the reference | Pillar 3; simpler for young children | [tools](features/tools/design.md) |
| D-013 | 2026-11-17 | The child helps animals as well as people; animals don't talk | only helping people; talking animals | Owner asked; kindness to animals is an Islamic value with a known source | [quests](features/quests/design.md), [animals](features/animals/design.md) |
| D-014 | 2026-11-17 | Two releases → superseded by D-023 | everything in one release | Design review: the full plan is about twice the reference's content on a new engine stack; R2 still meets the owner's 5–10 h and "many areas" (owner to confirm) | all |
| D-015 | 2026-11-17 | The catch goes to the fisher's village basket (shared food, the cats fed); small fish are released | catch and release for sport | Fishing for food fits the faith and "no animal is hurt" better than catching for fun; it keeps the reference's "bring your fish to the fisher" without money. Settled under the owner's delegation | [fishing](features/fishing/design.md) |
| D-016 | 2026-11-17 | M1 measures two renderer builds and keeps the one with the lower p95 frame time on the budget phone in the app; within 0.5 ms, A wins. (A) three.js inside Phaser's canvas through `Extern`; (B) a low-res three.js canvas under a transparent Phaser HUD canvas. If B wins, its exception is written into `docs/game-standard.md` §3 | three.js alone with its own HUD (a last resort if both miss 60 fps, with sound still through `Kit.snd`) | Keeps the HUD and sound in Phaser (rule 7). B allowed under the owner's delegation ("settle everything") | engine |
| D-017 | 2026-11-17 | 24 ribbons in all, and lanterns of kindness for every other help and win | 41 ribbons | Design review: beyond 7, extra stamina changed nothing; lanterns show kindness in the world and light the finale | [ribbons](features/ribbons/design.md) |
| D-018 | 2026-11-17 | three-mesh-bvh (MIT) approved for collision and ground queries: pinned in `js/vendor/` with its licence, used only through `js/kit/gfx3d.js`, static collision meshes only, no physics engine. Approved under the owner's delegation ("settle everything") | height lookups only | Height lookups can't handle caves, the arch, the tower or bridges; a new library is an ask-first | [movement](features/movement/design.md) |
| D-019 | 2026-11-17 | The moon follows the real month: no moon in the evenings before the 29th, a thin old crescent before dawn, the new crescent on the 29th, growing after | a decorative moon | The game teaches the lunar month; it must be right (pillar 4) | [day and night](features/day-night/design.md) |
| D-020 | 2026-11-17 | No recorded adhan in the game; maghrib is shown by the lanterns lighting and villagers walking to the masjid | the adhan as ambience | A game can't make sure it is heard whole and undisturbed | [audio](features/audio/design.md) |
| D-021 | 2026-11-17 | Flag runs on terrace walls and paths, not rooftops; no reward for high jumps; the thirsty dog's water comes from the sabil, not down a well | rooftop runs; cliff-jump stars; climbing into a well | Children copy what they see in games | [side activities](features/side-activities/design.md), [quests](features/quests/design.md) |
| D-022 | 2026-11-17 | The world renders at about 288 px on the short side, whatever the phone | a third of the screen size | Every phone looks the same, and the cost is fixed | [environment](features/environment/design.md) |
| D-023 | 2026-11-17 | One release with all 18 areas, when everything is done and production grade; supersedes D-014 | two releases | Owner: "it should be one release. we will release once everything is done and production grade" | all |
| D-024 | 2026-11-17 | The owner delegated the remaining decisions: "answer all your question take inspiration from the hike game and settle everything. i dont have the resource". Settled: the title, the look, D-015, D-016, D-018, D-020, the look choices, voices without family recordings, both orientations, the save shape | the owner deciding each | The owner's words | all |

## Open questions
- **Settled on 2026-11-17** under the owner's delegation (D-024): the title, the look, D-015, D-016, D-018, D-020, D-023, the look choices, the voices, the orientation, the save shape.
- **Risks:**
  - *Renderer.* Build A or B is chosen in M1 by measurement (D-016).
  - *Build time.* If M2's numbers make the plan too long, the owner is shown a cut list; nothing is dropped quietly.
  - *Islamic text.* Every ayah and hadith line is quoted from Saheeh International (Tanzil) and checked when written. Fallbacks if a check fails: the new-moon dua (Tirmidhi 3451) → the imam says "Alhamdulillah"; the thirsty-dog hadith → Grandpa praises the kindness without quoting; "Tonight is the first night of Ramadan. We fast tomorrow" → "Ramadan is here!".

## Change log
**0.1 (2026-11-17):** first draft: 11 feature notes designed; D-001 to D-007 logged.
**0.2 (2026-11-17):** after research on the reference's areas and activities: 18 areas, fishing, 17 side activities, tools, day and night with weather and light; D-008 to D-012 logged; D-006 superseded.
**0.3 (2026-11-17):** about 60 kinds of creature; helps for animals; kindness to every living thing as the story's heart; D-013 logged.
**0.6 (2026-11-17):** final design pass: nobody speaks (a cloth pat per bubble), the only voice is the summit recitation; controls, the frame loop, first run, loading, offline, files, the asset pipeline, settings, languages, testing, credits and the app bridge written down; stale text removed.
**0.5 (2026-11-17):** one release (D-023); build steps instead of releases; the remaining decisions settled under the owner's delegation (D-024): the title, the look, fishing, renderer builds, three-mesh-bvh, no adhan, look choices, voices, orientation, the save shape.
**0.4 (2026-11-17):** design review (Fable 5.2) applied: two releases; 24 ribbons and lanterns of kindness; fishing feeds the village; an accurate moon; safer activities; a fixed render size, palette and far mesh; triangle and download budgets; camera, HUD and saving notes; D-014 to D-022 logged.
- 2026-11-17: voices must be authentic human recordings, never machine-generated (owner).
