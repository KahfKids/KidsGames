# Environment

**Status:** designed · **Updated:** 2026-11-17 · [GDD](../../GDD.md)

The island looks like a picture book made of simple blocks: low-poly shapes, flat colour bands, soft fog and chunky pixels from the low-resolution render. The reference proves that simple models plus a careful palette and a pixel render can look beautiful. We use the same idea because it is also the cheapest look a budget phone can draw (pillar 5). Each region is its own palette and its own small set of plants and props, so a child knows where they are at a glance ([island layout](../island-layout/design.md)).

## Look
1. **The render:** the world is drawn at about 288 px on the phone's short side, whatever the phone (D-022), and scaled up with no smoothing. The HUD is drawn sharp at full resolution.
2. **The models:** low-poly, flat shaded, with colour stored in the vertices (no textures, except one small shared texture where a pattern is needed: the masjid tiles, the carpets). Shade is baked into the colours in Blender with no direction (corners and under trees), so the moving sun never contradicts it ([day and night](../day-night/design.md)).
3. **The palette:** one 32-colour palette that every vertex colour snaps to, so models from different packs and authors become one family and no rainbow can appear. Sampled from our own reference photos of terraced Mediterranean-style hills in late afternoon. Limestone cream, terracotta, olive green, deep pine, sea teal, sunset apricot. No rainbows, even in the waterfall spray (rule 16).
4. **No outlines.** At 288 px they don't read, and they cost triangles. Silhouette and palette carry the shapes.
5. **Fog** in the colour of the hour softens the 150 m detailed distance; the far mesh and landmark sprites stay visible beyond it ([island layout](../island-layout/design.md)).
6. **Shadows:** one soft round blob under each character and animal. The terrain's shade is baked in.

## Regions: plants, rocks and props

| Region | Plants | Rocks and ground | Props |
|---|---|---|---|
| Dock and beach | sea grass, beach thistle, a few palms | pale sand, smooth boulders, tide pools | the dock, rope, crates, the ferry, a bench, a sign |
| Lighthouse point | sea pinks, saltbush | dark rocks, rock pools | the lighthouse, a keeper's bench, a treasure spot |
| Village | potted herbs, jasmine on walls, a big old fig tree | stone paving, terrace walls | houses with flat roofs, the masjid and minaret, the olive press, the well, the sabil fountain, laundry lines, prayer mats on a roof, the lantern string in the square, with lanterns of kindness added as they are earned, lit after the 29th |
| Meadow and pond | tall grass, poppies, daisies, reeds, a walnut tree | soft hills, the diving rock | a sheep fold, a wooden fence, a stone stile |
| Gorge and waterfall | ferns, moss, ivy, plane trees | wet dark rock, stepping stones | rope bridges, a stone bridge, the cave back to the village |
| Orchard and hives | apricot trees with fruit, olive trees, lavender, thyme | terrace walls (climbable) | beehives (painted blue), a water channel, ladders, baskets |
| Pine forest | tall pines, ferns, mushrooms (the bouncy ones are large), pine cones | needles on the ground, mossy logs | the ruined tower, a woodpile, a resting bench |
| Cliffs and road | wild thyme, junipers clinging on, wildflowers in cracks | pale cliffs, the three rockfalls, scree | the switchback road, stone markers, the donkey's water trough, the trail shelter |
| Plateau lake | reeds, water lilies, willows | a pebble shore | the camp shelter, a rowboat jetty, a campfire ring |
| Outlook point | wind-bent pines, heather | the cliff edge | the viewing deck, the binoculars, the telescope |
| Frozen tarn | — | ice, snowbanks | curling stones, the ice hole |
| Snowy shoulder | dwarf juniper, alpine flowers at the snow edge | snow patches, dark rock | the hot spring pool, cairns |
| Summit | the old cedar (the landmark) | bare rock | the stone watch hut, the lantern post, a bench facing west |
| Far islet | sea grass, a lone palm | white rock | the old stone shelter, a lamp |
| Islet and sea cave | sea grass, cliff flowers | the rock arch, the cave | an old mooring post |


## Weather and air
- **Wind:** the grass, the trees, the laundry and the shawl sway, moved in the vertex shader (no per-frame CPU work). It is stronger with height.
- **Clouds:** a few flat low-poly clouds drift slowly. At sunset the western sky is always clear (it must be, for the crescent).
- **Particles** (few, pooled): dust when landing, leaves blowing up the updrafts, waterfall mist, steam from the hot spring, snow blown off the shoulder, petals in the orchard, sparks from the lanterns at night. At most 200 on screen.

## Assets
Every model goes: source recorded in `CREDITS.md` → Blender (`tools/blender/prep.py`): faces removed, cut to budget, 1 unit = 1 m, colours snapped to `data/palette.json`, shade baked to `COLOR_0`, night glow to `COLOR_1`, one material, no textures → GLB with quantised attributes; no Draco or meshopt (no decoder to ship). `tools/budget-check.js` fails a model over its triangle or bone budget, with a texture, an off-palette colour or a missing `COLOR_1`. A contact sheet of every person and animal is looked at for faces before it ships (rule 14). Each area is one Blender scene, split by the script into 40 m chunks: one merged mesh plus a simple collision mesh whose material names give the surface (walk, climb, water, ice). People, animals, benches, signs and ribbons are placed as named empties (`type:id`) and read from the chunk; there is no other level editor.

Plants, rocks and props start from the CC0 packs in `docs/free-game-assets.md` (the Kenney Nature Kit, the KayKit Forest Nature Pack, or the Quaternius Stylized Nature MegaKit, whose textures are replaced by palette vertex colours), recoloured and cut down in Blender. The terrain, the village, the masjid, the watch hut and the cedar are our own, made in Blender, so the place is original.

## Numbers

| Name | Value | Unit | What to watch in playtests |
|---|---|---|---|
| Render height | 288 | px on the short side | too blurry on tablets? |
| Palette | 32 | colours | — |
| Draw calls on screen | ≤ 100 | — | the village seen from the cliffs |
| Triangles on screen | ≤ 100,000 | — | — |
| Particles on screen | ≤ 200 | — | — |
| Texture size | ≤ 1024 | px | — |

## Open questions
- The pixel low-poly look is final; the M1 screenshot only tunes 288 px against 360 px.

## History
- 2026-11-17: designed.
- 2026-11-17: design review: a fixed 288 px render; one 32-colour palette; shade baked with no direction; no outlines; the far mesh; the lantern string; the stale sky table removed.
- 2026-11-17: the look is final.
- 2026-11-17: the stale sky section removed; the asset pipeline (Blender → GLB, checks, chunks, named empties).
