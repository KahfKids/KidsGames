# Day and night, light and weather

**Status:** designed · **Updated:** 2026-11-17 · [GDD](../../GDD.md)

The island has a full day and night cycle: dawn mist in the gorge, bright noon on the beach, golden light on the cliffs, sunset over the sea, then a night of stars, fireflies and lanterns. Time changes what's there: night fish, dusk swifts, dawn deer ([fishing](../fishing/design.md), [animals](../animals/design.md), [side activities](../side-activities/design.md)). The sky also teaches the lunar month accurately (D-019). The light is the game's beauty, so it's done carefully, in ways a budget phone can afford (pillar 5). This replaces the first draft's "sky moves with progress" (D-006 → D-009).

## The clock
1. One island day is **24 minutes** of play: dawn 3, day 12, dusk 3, night 6.
2. The clock runs while playing and stops when paused, in talk and in the menus.
3. **Any bench** (and Grandma's guest bed) offers to skip ahead to the next dawn, day, dusk or night, shown as four pictures. There is no tiredness and no need to sleep.
4. **The calendar:** before the finale, the days are "the last days of Sha'ban", with no number shown. The 29th is the day the child chooses ([story](../story/design.md)). After the ending, each day is a day of Ramadan.

## The moon (D-019)
In a real lunar month, the old moon is a thin crescent that rises just before dawn in the last days, there is no moon in the evening sky, and the new crescent appears low in the west just after sunset.
- **Before the 29th:** no moon in the evening or night sky. The nights are lit by stars, the village's windows and the child's lantern. A thin old crescent rises in the east shortly before dawn and thins each day.
- **The 29th:** the new crescent appears low in the west just after sunset, above where the sun went down, and sets soon after.
- **After the ending:** the crescent is a little higher and fuller each evening, through the month, and can be watched through the telescope or from the summit bench.

## Light (how it's drawn)

| Part | How | Cost |
|---|---|---|
| Sun and moon | one directional light moving across the sky; its colour and strength follow the clock | per vertex, not per pixel |
| Sky light | soft light from above in the sky's colour, and a bounce light from the ground | in the same small shader |
| Shade | baked into the models in Blender as ambient shade with no direction (corners, under trees), so a moving sun never contradicts it | nothing at run time |
| Night lights | each model carries a second set of baked colours: the glow of the lanterns, windows and fires near it, faded in at dusk | one blend in the shader; no point lights |
| Lanterns, windows, fires, fireflies | glowing sprites with a soft halo | a few batched draws |
| Shadows | a soft blob under each moving thing | no shadow maps |
| The hand lantern | a warm pool of light around the child: **the one real-time light** in the game | computed in the shader for nearby vertices |
| Sky | a dome with colours by time of day, the sun disc, the moon by its phase, stars that fade in | two draws |
| Fog | the horizon's colour at that hour; thicker at dawn in the gorge | free in the shader |
| Water | its colour follows the sky; a sun or moon path on the sea is a sprite | cheap |

Each hour has a look from a table of 8 key times (dawn, morning, noon, afternoon, golden, sunset, dusk, night), blended between the two nearest. Colours are tuned on a budget phone screen, not on a Mac.

## Weather
- **Clear** most of the time.
- **Light rain** about 1 day in 4, for 3–5 minutes: a darker sky, rain particles near the camera, darker wet ground, frogs singing, the rain recording. Nothing in the game needs rain. **No rainbow afterwards** (rule 16).
- **Morning mist** in the gorge and over the pond at dawn.
- **Wind gusts** on the cliffs and the snowy shoulder push a gliding child sideways (tension), shown by blowing snow, grass and the shawl.
- **Snow flurries** on the shoulder and the summit.
- **On the 29th the sky is always clear in the west**, and the sun slows (but never stops) as it nears the horizon while the child is still climbing.

## Numbers

| Name | Value | Unit | What to watch in playtests |
|---|---|---|---|
| A day | 24 | min | — |
| Dawn / day / dusk / night | 3 / 12 / 3 / 6 | min | night too dark on a phone? |
| Rain chance a day | 25 | % | — |
| A shower | 3–5 | min | — |
| Gust push | 2 | m/s | gliding kids crashing |
| Sunset slow-down on the 29th | to half speed in the last 3 min of day | — | does it still feel like a race? |
| Night brightness | the path stays readable | — | tested on the phone in a dark room |

## Edge cases
- Night with no hand lantern yet: Grandma gives it at the first sunset; until then the village lights and stars keep paths readable.
- Rain on the 29th: never.

## History
- 2026-11-17: designed (replaces the progress-driven sky in [environment](../environment/design.md)).
- 2026-11-17: design review: dawn and dusk 3 min each; benches skip to any of four times; an accurate lunar month; shade baked with no direction; the hand lantern as the one real-time light; nothing needs rain; the sun slows on the 29th.
