# Audio

**Status:** designed · **Updated:** 2026-11-17 · [GDD](../../GDD.md)

The reference has a beloved adaptive score: each area has its own music, and strings join when you fly. We keep the **idea** (each place sounds different, and flying feels like flying) with no music and no voices (rule 15, D-003). Nature recordings carry every place and the glide. Nobody speaks, as in the reference ([dialogue](../dialogue/design.md)). **The only human voice in the game is the Quran at the summit**, so it lands. All sounds are real recordings, played through `Kit.snd` (categories, ducking, variation; `docs/phaser-standard.md` §3a).

## Layers

| Layer | What | Category |
|---|---|---|
| Place bed | six shared ambience beds, each with a day and a night version (night: crickets, owls, soft sea), cross-faded by where the child is: waves and gulls (the beach and harbour), village life and hens (the village), wind in grass and sheep (the meadow and pond), the brook and waterfall (the gorge), wind in pines and birds (the forest and orchard), high wind (the cliffs, the snow, the summit) | `amb` |
| Glide | wind, louder with speed; the shawl's cloth flutter; the place bed fades down with height and returns on landing. No voice | `sfx`, `amb` |
| Steps | footsteps on sand, stone, grass, needles, snow, wood, fired on the walk animation's frames (as in Helping Home) | `sfx` |
| Actions | jump, land, flap (cloth snap), climb (hand on rock), splash, swim strokes, bucket, basket, the jar set down, the ribbon tying on (cloth), casting, the reel, a fish splash, oars, the tub on rapids, the tray on snow, the shovel, the ball | `sfx` |
| Talk | one soft cloth pat when a bubble opens, detuned per speaker ([dialogue](../dialogue/design.md)). No voice sounds | `ui` |
| Weather | rain, wind gusts, snow wind | `amb` |
| Animals | each animal's real call, quieter and panned with distance ([animals](../animals/design.md)) | `sfx` |
| Ramadan nights | after the ending: the village's evening sounds. No recorded adhan (D-020); maghrib is shown by the lanterns lighting and villagers walking to the masjid | `amb` |
| Recitation | once, in the finale, after the crescent, with the child seated on Grandpa's bench: Quran 88:17–20 by Shaykh Mahmoud Khalil Al-Husary (EveryAyah, teaching recitation), four clips, `audio/ayah/088017`–`088020`. They are **not yet in the library** (`../KidsGames-sounds/everyayah` holds other ayat), so they are listed for the owner before download with `tools/ayah-clips.sh`. Everything else fades to silence. Each ayah shows its Arabic text, its meaning in the game's language (the published translations the quizzes use, quoted, never re-translated) and a picture (camel, sky, mountain, land) while the camera turns to the view. Input is held: taps don't skip it; only Pause works. If paused or hidden, it stops and starts again from 88:17. With sound off, the ayat still show for their clips' lengths. It plays again in "watch the ending again". Never scored | `voice` (everything else silent) |
| The finale | silence while everyone watches the west; the wind; the recitation; lantern flames catching one by one; the village's evening sounds rising as the child glides down | `amb`, `voice` |

## Rules
0. **The only human voice is the summit recitation, by a human reciter** (owner: "voice must be authentic voice not machine generated"; "keep it like short hike"). No voice sounds, hums, nasheeds, text-to-speech or crowd-sourced clips.
1. No instruments, drums, bells, chimes or synthesised sound (rule 15). Farm recordings (sheep, goats, camels) are checked for animal bells, which are cut out.
2. Every recording is cut by `tools/sound-cut.py` from a recipe, and credited in the game's `audio/CREDITS.md`.
3. Ask the owner before downloading new recordings (memory: sound library). The exact files are listed first.
4. Sounds are calm; nothing is sudden or loud. One-shots are levelled to about -20 LUFS and beds to about -30 LUFS (§3a).

## From our library
- Already in `../KidsGames-sounds/bigsoundbank`: sea waves, countryside, awakening birds, wind in tall grass, brooklet, feet in leaves, a frog, ducks, goats, an annoyed hen, a cat, swirl in the water, watering, fill bathtub, a canvas bag (the talk pat), a fall of stone.
- `../KidsGames-sounds/commonvoice/ar-27.0` (Mozilla Common Voice Arabic, CC0) is **not used** in this game. It stays private on this Mac for future use and is never re-shared.
- **Still needed:** a waterfall, wind in pines, high mountain wind, bees, sheep, a donkey, gulls, hawks, swifts, storks, dolphins, crickets and cicadas, footsteps on sand, snow and stone, cloth flaps, a bucket and rope, fire catching, and the four ayah clips 88:17–20.

## Numbers

| Name | Value | Unit | What to watch in playtests |
|---|---|---|---|
| Bed cross-fade | 3 | s | — |
| Sounds at once | ≤ 12 | — | the §3a cap |
| Animal sound range | 30 | m | — |
| Ambience beds | 6, each day and night | — | the 20 MB download budget |
| Talk pat detune per speaker | within ±400 | cents | — |

## History
- 2026-11-17: designed.
- 2026-11-17: night beds, weather, fishing and activity sounds.
- 2026-11-17: design review: six shared day/night beds for the 20 MB budget; recordings checked for animal bells.
- 2026-11-17: settled "like Short Hike": nobody speaks; a cloth pat for talk; no hums or glide voice; the only voice is the summit recitation by a human reciter; Common Voice not used.
