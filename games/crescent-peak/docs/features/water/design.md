# Water

**Status:** designed · **Updated:** 2026-11-17 · [GDD](../../GDD.md)

Water is everywhere on the island and always safe: the sea around it, the bay by the dock, the pond in the meadow, the river through the gorge, the waterfall, the well and the sabil fountain in the village, and the warm spring near the top. The child swims, splashes, jumps in from rocks and carries water to help. Water is also part of the wonder: "every living thing made from water" (Quran 21:30, see [story](../story/design.md)).

## Bodies of water

| Water | Where | Play | Look |
|---|---|---|---|
| Open sea | around the island | swim to the islet; the rowboat; a gentle current turns a swimmer back past the sea edge, 60 m out (the rowboat may go further, to the far islet) | a teal plane with slow waves moved in the vertex shader; lighter where shallow |
| The harbour | by the dock | learn to swim; the net floats quest ([quests](../quests/design.md)); [fishing](../fishing/design.md) | clear shallows over sand, foam along the shore |
| Rock pools | the beach | crabs, small fish, sea stars | still, mirror-like |
| The pond | the meadow | the diving rock, ducks, reeds, dragonflies | still green-blue, lily pads |
| The river and rapids | the gorge | wading, stepping stones, the rapids ride ([side activities](../side-activities/design.md)); the current pushes a swimmer slowly downstream to the pond | a strip whose texture scrolls, white water at the rocks |
| The waterfall | the head of the gorge | a hidden ribbon behind it; the mist is a soft landing | a scrolling strip, a mist sprite, splash particles; no rainbow (rule 16) |
| The well and the sabil | the village | fill the bucket; the bees quest and the trail fountain quest | small and still |
| The reef | off the islet | diving with goggles for shells and fish | clear turquoise over pale sand, coral shapes |
| The plateau lake | the plateau | the best fishing, the rowboat, a small island | still and mirror-like at dawn |
| The frozen tarn | by the snowy shoulder | ice sliding, curling, ice fishing | white ice with blue cracks |
| The hot spring | the snowy shoulder | sitting in it refills stamina instantly and warms the child (the reference uses hot springs this way in the snow) | steam particles, a pale blue pool |

## Rules
1. Swimming is free and safe; there is no drowning and no stamina in water ([movement](../movement/design.md)). Everyone swims in modest clothes.
6. There are no tides.
2. Past the sea edge (60 m beyond the shore; the islet, 30 m out, is inside it), a current pushes the child gently back. A gull circles overhead to show the edge.
3. Landing in water from any height: a big splash and no harm.
4. The bucket holds one fill. Walking spills nothing (no frustration). It empties onto what it is used on.
5. Water reflects nothing (too costly). The colour gets lighter in the shallows, baked into the shore's vertex colours.

## Numbers

| Name | Value | Unit | What to watch in playtests |
|---|---|---|---|
| Sea edge from the shore | 60 | m | kids swimming too far |
| Edge current | 1.5 | m/s | it turns the child around; it never traps them |
| River current | 0.8 | m/s | — |
| Sea wave height | 0.2 | m | — |
| Hot spring refill | instant | — | — |
| Splash particles | ≤ 30 | each | — |

## Sound
Waves, a brook, the waterfall roar, splashes, the bucket and the well's rope ([audio](../audio/design.md)). Most are already in `../KidsGames-sounds/bigsoundbank`: sea waves, brooklet, swirl in the water, fill bathtub, watering tomatoes.

## Edge cases
- Swimming under the waterfall: the child is pushed out gently and can climb behind it to the hidden ribbon.
- Gliding over the sea: the shawl closes before the edge current, so a glide never strands the child far out.

## History
- 2026-11-17: designed.
- 2026-11-17: the reef, the plateau lake, the frozen tarn, the rowboat and fishing added.
- 2026-11-17: design review: the sea edge at 60 m so the islet is inside it; no tides; modest swimming; release tags in the layout.
