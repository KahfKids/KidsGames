# Island layout (level design)

**Status:** designed · **Updated:** 2026-11-17 · [GDD](../../GDD.md)

One island, open from the start, packed with places. The reference has a cabin and first beach, white-sand trails, a lake with a fishing dock, a ridge with a stone tower, a visitor centre, a ball court, a lighthouse, an outlook with a telescope, a cold peak with frozen lakes and hot springs, and small islands offshore; every few steps there is something to find. Ours has **18 areas** around a peak, all in the one release (D-023). The low ground is free to wander; height is gated softly by stamina ([ribbons](../ribbons/design.md)), never by locked doors. Landmarks you can always see pull the child upward (pillar 1), and every place a child gets stuck has a way home.

## Shape and scale

| Name | Value | Unit | Note |
|---|---|---|---|
| Island footprint | 480 × 400 | m | 12 × 10 chunks of 40 m; plus the islet, the reef and the far islet offshore |
| Summit height | 140 | m | |
| Detailed draw distance | 150 | m | fog softens the edge |
| Far mesh | the whole island, at most 3,000 triangles, one draw | — | always drawn, so the cedar, the minaret and the tower are seen from anywhere |
| Landmark sprites | the minaret, the cedar and hut, the tower, the lighthouse beam, the far islet's light | — | drawn on the far mesh at any distance |
| Sea edge | 60 m from the shore | — | the islet is 30 m out, inside it; the far islet is beyond it (rowboat) |
| Run across the island | about 80 | s | |

## Areas
South is the sea and the harbour; the peak is north of the centre.

| # | Area | Height | Ribbons to reach | What's there | Landmark |
|---|---|---|---|---|---|
| 1 | **Harbour** | 0–5 m | 0 | the ferry dock, the fisher, the village fish basket, the trader with a camel, the cobbler's leather, crabs, the harbour cat | the ferry's mast |
| 2 | **Sandy beach** | 0–5 m | 0 | the Keep-it-up court, the beach children's sandcastle, shells, the turtle nest, the tangled gull | the sandcastle growing |
| 3 | **Grandparents' village** | 5–30 m | 0 | Grandma and Grandpa's house, the masjid and minaret, the olive press, the bakery, the cobbler, the well's tap, the sabil, market stalls, the lantern string in the square, the old fig tree | the minaret |
| 4 | **Meadow and sheep fold** | 5–25 m (west) | 0 | sheep, the sheepdog, the shepherd girl, kite flying, grasshoppers, butterflies | a lone walnut tree |
| 5 | **Lily pond** | 5–15 m (west) | 0 | the shallow steps and the low diving rock, the shy boy, frogs, ducks, dragonflies, fishing | reeds and lily pads |
| 6 | **River gorge and waterfall** | 15–60 m (centre) | 1–2 | rope bridges, stepping stones, the trail keeper's fountain, the waterfall and its hidden cave, the cave back to the village, ferns, a kingfisher | the waterfall's mist |
| 7 | **Orchard terraces and hives** | 25–50 m (above the village) | 2 | apricot and olive terraces, the beekeeper, the gardener, climbing vines, a tortoise, the dog's path above the village | the blue beehives |
| 8 | **Pine forest and the ruined tower** | 50–90 m (north-west) | 3 | pines, the pine cone girl, squirrels, bouncy mushrooms, the tower with the storks' nest | the ruined tower |
| 9 | **The old road and cliffs** | 70–110 m (north-east) | 4–5 | the imam's switchbacks, three rockfalls with old iron rungs set for adult arms, goats and the goat race, hawks on updrafts, the trail shelter | circling hawks |
| 10 | **Snowy shoulder** | 110–130 m | 7 | snow, wind gusts, the hot spring | steam rising |
| 11 | **Summit** | 140 m | 7 (easy) / 4 (hard) | the stone watch hut, the old cedar, Grandpa's carved bench facing west, the lantern post, the start of the summit swift course | the cedar and hut on the skyline |
| 12 | **Lighthouse point** | 10–35 m (south-east) | 1 | the old lighthouse and its keeper, rock pools, a treasure map spot | the lighthouse beam at night |
| 13 | **Plateau lake and pasture** | 60–70 m (west) | 3 | a still lake with a small island, perch fishing, the camp shelter, the rowboat jetty, cows and the herders' horses, stargazing | the lake's mirror shine |
| 14 | **Outlook point** | 70–80 m (east) | 3 | the outlook keeper, binoculars and telescope, kite winds, dolphins far below | a viewing deck on the cliff edge |
| 15 | **Frozen tarn** | 115 m | 7 | ice sliding, curling with the herders' children, ice fishing | the white tarn |
| 16 | **Islet** | 0–25 m, 30 m offshore | 0 to swim to, 3 to climb | the rock arch, the sea cave, gulls | the leaning rock arch |
| 17 | **Reef** | under water, by the islet | the goggles | diving for shells, reef fish, sea turtles, an octopus | — |
| 18 | **The far islet** | 0–30 m, far south-east | the rowboat | an old stone shelter, flying fish, the moonfish at night, a hidden ribbon at the top, seals | a single light at night |

## Routes to the summit
- **Easy route (7 ribbons):** village → orchard → gorge → the old road. Three rockfalls of about 5 m, 8 m and 16 m (2, 3 and 6 segments at the [movement](../movement/design.md) climb of 2.8 m a segment, so 7 ribbons leave 1 to spare). Then the snowy shoulder (the hot spring refills stamina), then the summit.
- **Hard route (4 ribbons):** pine forest → glide from the ruined tower onto the hawks' updraft → short pitches of about 8 m (3 segments) between ledges → summit. It rewards skill and is never needed.
- **The adults' way:** the rockfalls have old iron rungs spaced for grown-up arms, too far apart for a child. The imam, the sighters and the herders climb them; the imam's donkey waits below the first rockfall, and the herders keep their horses on the plateau.
- **On the 29th** the imam leaves a lit lamp on top of each rockfall as he climbs, which guides the child without markers (pillar 1).
- **Shortcuts open as you go:** climbing vines in the orchard grow when watered ([tools](../tools/design.md)); a fallen log bridges the gorge after the trail fountain help; the cave links the waterfall to the village.

## Pacing (target play time)

| Stretch | Time | What happens |
|---|---|---|
| Arrival | 0–10 min | the harbour and village; walk, jump, talk, climb a low wall, the first ribbon |
| The low island | 10–50 min | the beach, meadow, pond, harbour helps; swimming, the rod, the first sunset and night with the lantern |
| The middle | 50 min–1.5 h | the gorge, waterfall, orchard, forest; gliding, the stork chick, the swifts at dusk |
| The climb | 1.5–2 h | the old road, the snowy shoulder; the 29th and the finale ([story](../story/design.md)) |
| Ramadan nights and the wider island | 2–5 h | lanterns, iftar plates, the growing moon; the lighthouse, plateau lake and outlook; fish, notebook, races |
| Offshore and everything | to 7–9 h | the rowboat, the islet, reef, tarn and far islet, every ribbon, fish and notebook entry |

The reference takes about 1.5 h to its summit. Our extra time comes from the nights, the days after the ending and the wider island.

## Guidance
- **Signs** at every fork, with pictures (a house, a peak, water, a fish) as well as words.
- **Paths** are worn lighter where feet go. Little flowers and pebbles line paths that lead somewhere.
- **Grandpa's map** on the pause screen shows landmarks and "you are here", but no markers ([tools](../tools/design.md)).
- **Sound** guides too: the waterfall, the sheep, the hive's hum, the sea.
- **Ask anyone:** every villager points toward the nearest unfinished help.
- **Lost:** the sea current brings a swimmer back to a beach; the cave links the gorge to the village.
- **An early summit counts:** standing on the summit before the 29th gives the view, Grandpa's carved bench (a quiet moment) and opens the offer of the 29th.

## Rules
1. No soft-lock: the child can always walk or swim back to the village, without stamina.
2. Every climb a route needs is at most the route's ribbon count, at the climb drain in [movement](../movement/design.md), with 1 segment to spare.
3. The masjid, houses, roofs and people's property are not climbable; terraces, rock and trees are.
4. At least one landmark is on screen from every walkable spot (the far mesh makes this true).
5. Every area has at least: one helper or activity, one hidden find, one creature for the notebook, and one fish if it has water.

## History
- 2026-11-17: designed.
- 2026-11-17: grown from 10 to 18 areas after research on the reference.
- 2026-11-17: design review: Release 1 (11 areas) and Release 2 (7); 480 × 400 m to match the chunks; a far mesh and landmark sprites; a 60 m sea edge with the islet inside it; the adults' iron rungs; the imam's lamps on the 29th; an early summit opens the 29th; no climbable roofs; pacing for 4 h in R1.
