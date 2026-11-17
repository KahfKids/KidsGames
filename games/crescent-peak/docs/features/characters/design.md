# Characters

**Status:** designed · **Updated:** 2026-11-17 · [GDD](../../GDD.md)

The reference fills its island with chatty animal characters. Ours are the people of a small village getting ready for Ramadan: family, neighbours, children and the imam. **No one has a face** (rule 14). Personality comes from silhouette, clothes, colour, posture, how they move, and their one recorded voice sound ([dialogue](../dialogue/design.md)). Everyone is modestly dressed. Animals are in [animals](../animals/design.md).

## How a faceless character reads
- **Silhouette first:** each character has one shape you know from 30 m away (Grandpa's walking stick and cushion, the imam's white kufi and long coat, the beekeeper's wide hat).
- **Head and body language:** heads turn toward the child; shoulders bounce when happy, droop when worried; hands wave, point and clap. Idle animations show who they are (the shepherd girl counting on her fingers).
- **Colour:** each character owns one strong colour that no one near them shares.
- **Proportions:** soft and rounded, like toys; heads about 1/4 of body height for the children and 1/5 for adults.

## The child (the player)
- About 1.1 m tall. A round head with no face.
- **Look choices at the start** (one tap each, no reading): a headscarf or hair with a kufi, and one of four shawl colours. The shawl carries the [ribbons](../ribbons/design.md).
- **The shawl** is the key prop: it flutters in the wind and opens wide to glide. It is a cloth "wing" held by both hands, never a costume of wings.
- **Animations:** idle, walk, run, jump, flap, glide, land, climb, mantle, swim, wade, carry, pick up, give, talk, wave, sit, look up. They start from the CC0 Quaternius or KayKit libraries, retargeted onto our model in Blender (`docs/free-game-assets.md`). Glide and flap are our own.

## The cast

| Character | Where | Silhouette and colour | Role |
|---|---|---|---|
| Grandma | her house, then the dock at the end | headscarf, apron, a basket; plum | gives the shawl and the first ribbon; the apricots quest |
| Grandpa | the porch, leg up | walking stick, cushion, a big beard shape with no face; wheat | sends the child up; hears the story at the end |
| The imam | the summit | white kufi, long dark coat, a stick for the road; deep green | leads the sighting and lights the lantern |
| Two sighters | the summit | one with a walking stick, one with a notebook; blue and brown; they look with their own eyes | see the crescent with the imam |
| The ferry worker | the dock | cap, rope over the shoulder; teal | the first hello; the kite quest's parent |
| The ferry child | the dock | a kite tangled up high; saffron | the kite quest |
| The shepherd girl | the meadow | a crook, a wide straw hat; red | the lost lamb quest |
| The shy boy | the pond rock | sitting with knees up, wet hair; sky blue | the jump quest |
| The beekeeper | the orchard | wide hat with a veil, a smoker; yellow | the bees quest |
| The press worker | the olive press | sleeves rolled, an oil jar; olive | the lantern oil quest |
| The fisher | the dock end | waterproof coat, a net; navy | the net floats quest |
| The goatherd | the cliffs | a tall stick, a long cloak; rust | the goat race |
| The pine cone girl | the pine forest | a sack, a woolly hat; forest green | the pine cones quest |
| The trail keeper | the gorge fountain | a broom, a water jug; clay | the trail fountain help |
| Yusra | the beach, the race starts | a headband, running shoes; coral | the flag runs |
| The fisher's son | the harbour | rolled trousers, an oar; navy | the rowboat race |
| The beach children (3) | the beach | sun hats, a bucket and spade | Keep it up, the sandcastle |
| The gardener | the orchard | a hoe, a wide hat; moss green | gives the shovel |
| The cobbler | the village | a leather apron; brown | the leather help, the sandals |
| The baker | the village bakery | a flour apron; cream | the kitten on the awning |
| The trader | the harbour, with the camel | a long coat, bundles; indigo | the leather |
| The lighthouse keeper | lighthouse point | a cap, a lamp; grey |
| The outlook keeper | outlook point | binoculars on a strap; heather |
| The herders and their children | the plateau, the snowy shoulder | woolly hats, crooks | the tray and curling |
| Villagers (6–8) | the village | everyday modest clothes | small talk and hints |

## Rules
1. No eyes, mouths, noses or eyebrows on anyone, ever, including in pictures inside bubbles.
2. People are about 1.0–1.8 m tall; the child is smaller than every adult.
3. Every character has at most 1,200 triangles and one material (colours stored in the vertices). No outlines (a child is about 40 px tall in the 288 px render, where outlines don't read and cost triangles).
5. Everyone wears modest clothes, including when swimming.
4. Characters never run at the child or block the path.

## Numbers

| Name | Value | Unit | What to watch in playtests |
|---|---|---|---|
| Triangles a character | ≤ 1,200 | — | the village with 10 in view |
| Bones a character | ≤ 24 | — | animation cost on a phone |
| Skinned characters at once | ≤ 6 | — | others are posed or moved in the vertex shader |
| Animation update range | 30 | m | — |

## Open questions
- Look choices (settled): two head options (a headscarf, or short hair with a kufi) and four shawl colours from the palette. One is preselected, so one tap starts the game; they can be changed later under "things to wear".

## History
- 2026-11-17: designed.
- 2026-11-17: design review: the full cast (Yusra, the fisher's son, beach children, gardener, cobbler, baker, trader, keepers, herders); naked-eye sighters; 1,200 triangles and no outlines; 6 skinned at once; modest swimming.
- 2026-11-17: look choices settled.
