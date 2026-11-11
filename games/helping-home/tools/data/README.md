# Helping Home data

Everything the life game knows about its places, furniture and people is here, as plain JSON. The art tools
(`tools/art/bake.py`, `build.py`) and the game read the same files, so a room is described once.
`python3 tools/art/build.py <bake_dir>` merges every `*.json` in this folder into `life/data.json` (generated, never
edited by hand). A file may hold any of: `kinds`, `places`, `people`, `animals`, `items`, `you`, `decor`, `packs`.

## Space

- 1 unit = 1 metre = 1 floor tile. A place is `size: [W, D]`: W along X, D along Y. `(0, 0)` is the far corner.
- On screen +X runs down-left and +Y down-right. The two back walls are `L` (back-left, the Y = 0 plane, positions
  along X) and `R` (back-right, the X = 0 plane, positions along Y). The two near sides are open (no wall is drawn):
  `FL` (front-left, X = W, positions along Y) and `FR` (front-right, Y = D, positions along X).
- A direction is one of `+x -x +y -y`. The camera never turns.

## kinds: a sort of thing (a sofa, a tap, a swing)

Written for "rot 0", with the origin at the middle of its footprint.

| Field | Meaning |
|---|---|
| `size: [w, d]` | footprint along X and Y |
| `solid` | `rect`, `circle` (radius = w / 2) or `none` (can be walked over) |
| `pad` | extra room kept clear round a solid thing (default 0.1) |
| `fixed: true` | part of the background picture: never moves, cannot be tapped (rugs, mats, wall-side decoration) |
| `layer: "floor"` | a sprite drawn under everyone (a rug that can be moved) |
| `slots` | where a person is while using it: `at` (may be inside the footprint, e.g. a seat), `from` (the free floor spot they walk to first; default `at`), `face`, `over: true` (draw the person in front of the thing), `pose` (overrides the kind's), `staff: true` (only the person who works at this thing stands here) |
| `gives` | needs it fills over one full use: `food`, `rest`, `fun`, `clean` (0..1) |
| `time: [min, max]` | seconds one use takes |
| `pose` | the picture of the person using it: `sit`, `sitlow`, `reach`, `carry`, `idle` |
| `icon` | the icon shown in thought bubbles (an icon name without `i-`) |
| `who` | `kids` or `adults` (default everyone) |
| `states` | list of state names; each is its own sprite (`lamp@0#on`) |
| `act` | something special on use: `toggle`, `kick`, `pickup`, `bed`, `wardrobe`, `guide:wudu`, `guide:salah`, `grow` |
| `source` | using it leaves the child holding this item |
| `takes` | items that can be put into it (a toy box takes `toy`) |
| `item` | with `act: "pickup"`: what the child holds after picking it up |
| `meal: true` | the family eats here together at meal times |
| `price` | coins the child pays for what `source` gives (the shop must have its keeper at the `staff` slot) |
| `skill` | the skill a use of it trains: `read write count build garden cook sport` |
| `lesson: true` | a school desk: with the teacher at her desk, sitting here is a lesson |
| `glow: [height, reach]` | a lamp: a light at that height (m) reaching that far (m), lit from dusk to dawn |
| `act: "feed"` + `states: [empty, full]` | an animal's bowl, feeder or trough. The child fills it (with `takes`: only while carrying that item, e.g. `feed`); the animals whose `food` it is come to eat. `eat: [dx, dy]`: where an animal stands to eat |
| `act: "collect"` + `states: [empty, full]` | a nest box or milk can: full the morning after the animal named in `from` (an animal kind, e.g. `hen`) was fed; the child takes `item` from it |
| `act: "shop"` | the till: opens the shop's book of things for the child's room (`decor`) |
| `act: "bus"`, `"ride"` | a bus stop; a bicycle |

A slot may also have `staff: true` (only the person whose `work:` block names this thing may stand there).
Wall features of a room (`shell.L` / `shell.R`) include `window` (`style: "arch"`), `door` (`style: "stairs"`), `frame`,
`shelf`, `hooks`, `towel`, `kshelf`, `board`, `mihrab` and others: see `FEATURES` in `tools/art/models.py` and the `m_*.py` files.

## places

| Field | Meaning |
|---|---|
| `size: [W, D]` | floor size, at most 10 x 10 |
| `shell` | for a room: `floor` (a name in `FLOORS`), `wall`, `band` (colours), and `L` / `R`: things on each back wall (`window`, `frame`, `shelf`, ... see `FEATURES` in `tools/art/models.py`), each with `at` (start along the wall) |
| `builder` | for a place that is not a plain room: the name of a function in `PLACES` that builds its background; `top` = its highest point in metres |
| `doors` | `id`, `wall` (`L R FL FR`), `pos` (start along that wall), `w`, `to` (place), `door` (the id of the door on the other side), `icon` |
| `things` | `id`, `kind`, `at: [x, y]` (middle of the footprint), `rot` (0, 90, 180, 270, counter-clockwise from above), `state` |
| `pray` | spots where people stand to pray (the first is the imam's); everyone faces `-y` |
| `prayW` | the women's rows, where a place has them |
| `blocks` | extra floor nobody can walk on: `[[x0, y0, x1, y1], ...]` (a pond, a flower bed drawn in the background) |
| `outdoor: true` | an outdoor place (day and night light apply; no walls) |
| `at: [X, Y]` | the place's spot on the world map: the world position of its local (0, 0) |
| `lot` | for a room: the building it is in (`home`, `masjid`, `grandhouse`, `shop`, `school`) |
| `floor: 1` | an upstairs room (default 0, the ground floor) |
| `walls` | for a room: which back walls it has, `["L", "R"]` by default (`["R"]`, or `[]`). A room without a back wall draws none, and its floor reaches the edge there |
| `flush: ["FR"]` | an edge (`FL`, `FR`) where the floor goes on into the next place (a bedroom's open front on the gallery): no slab side is drawn under it |

### What a room's pictures are

A room is three pictures, so that the game can cut a wall away when the child is in the room behind it:
`bg-<id>` is the floor only (with everything marked `fixed` that lies on it: rugs, mats, a gallery's rail), `wall-<id>-L` and
`wall-<id>-R` are the two back walls, each with everything fixed to it (windows, frames, shelves, the frieze, the mihrab,
sconces, door openings and their frames, a stairs door's stairs) and transparent elsewhere. The corner post belongs to wall L; wall
R starts at the corner. `build.py` packs the two walls as the frames `wall-L` and `wall-R` of the room's own atlas `t-<id>` (made
even when the room has no other sprites) and writes `art.walls[<id>] = {"L": {w, h, ax, ay}, "R": {...}}`: the frame's size and
the pixel (ax, ay) in the frame of the room's local ground point (0, 0, 0), the far corner where the walls meet. The game puts
(ax, ay) at iso(0, 0) of the room. `art.places[<id>]` (w, h, ox, oy) is the floor picture as it was baked. Neither is shipped whole (see "the one map" below).

A door in a back wall pairs with a door on the open side of the next place: `L` with `FR`, `R` with `FL`.

## the one map (`world.json`)

Every place has a spot on one map (`at`), the camera moves over all of it, and the game loads only what is in view.

| Field of `world` | Meaning |
|---|---|
| `size: [W, D]` | the town's ground, in tiles (outdoor places tile it; rooms and the yard lie behind its back edges) |
| `roads` | `half` (half the road's width), `lane` (a lane's distance from the centre line), `segs` (`main side front avenue`: `axis`, the centre line `c`, `from`, `to`), `ring` (the four corners of the loop), `ends` (where vehicles come and go on the main road), `cross` (zebra crossings: `road`, `at: [from, to]`), `stops` (bus stops: `zone`, `at`, where to `wait`), `bay` (the family car) |
| `roads.out` | the main road beyond the town's edge: `id`, `at`, `size` (a strip of ground, baked as `bg-<id>`), `fade: [whole at this x, gone at this x]` |
| `gates` | open ground between two outdoor places: `[zoneA, wallA, posA, width, zoneB, wallB, posB]`; `data.py` turns each into a pair of doors with `open: true` |
| `fireflies` | the outdoor places that have fireflies after dark |

What the build writes for it (`tools/art/build.py`, which calls `tools/art/town.py` and `tools/art/overview.py`):

| In `life/art/` | In `data.json` `art` | What it is |
|---|---|---|
| `w/<col>_<row>` | `ground: {tile, tiles}` | the town's ground (all outdoor backgrounds and the road ends on one canvas) cut into 512 px tiles; a tile's picture is 2 px bigger so tiles overlap; empty tiles are not written |
| `t-out` | `sheets` | sprites that two or more outdoor places use (big trees, lamps, benches), packed once; `sheets` lists every sheet that exists |
| `t-<room>` frames `floor-<i>` | `floors[<room>]` | a room's floor, in pieces, inside the room's own sheet (anchored like the walls) |
| `b-<lot>-<i>`, `b-<lot>.s` | `buildings[<lot>]: {w, h, ax, ay, far, parts}` | a building's outside in 512 px pieces (loaded while in view and near) and a third-size copy that is always there |
| `overview`, `overview.s` | `overview: {scale, w, h, ox, oy, small}` | the whole town at a third of its size (shown when the camera is far out; fetched on the way out) and a tiny copy (always there; shows where a tile has not arrived yet) |
| `field` | `field: {w, h}` | one repeat of the open grass round the town (baked as `bg-field`, target `field`) |

Bake targets that are not places: `field`, `roadw`, `roade` (`blender -b -P tools/art/bake.py -- <bake_dir> field roadw roade`).

## animals

`"animals": {"cat": {"kind": "cat", "place": "living", "at": [x, y], ...}}`. An animal is drawn and moved like a person
(its pictures are `life/art/a/<kind>`), but it only wanders, rests, eats and sleeps.

| Field | Meaning |
|---|---|
| `kind` | which pictures: `cat hen dog cow goat rabbit tortoise camel elephant giraffe` |
| `place`, `at` | where it lives and starts |
| `zone: [x0, y0, x1, y1]` | the floor it may wander on (a pen); without it, anywhere near where it is |
| `roam: [places]` | places it visits through the doors (the house cat) |
| `food` | the id of the `act: "feed"` thing in its place that it eats from |
| `bed` | the id of a thing in its place it sleeps on |

The child strokes an animal it can walk up to, and feeds any animal by tapping it or its bowl. Every kind met goes
into the album's animals page once.

## packs

`"packs": {"road": ["car@0#a", "car@180#a", "bus@0", ...]}`: sprites that are not furniture of one place (vehicles).
Each list is baked and packed into its own sheet `life/art/t-<name>.avif`; the list called `ui` goes onto the icon sheet.

## light

The game does not use the engine's lights: night is each picture's tint (see `light` in `life/game.js`), so no normal maps are built or shipped.
`bake.py --normals` can still render them into the bake folder; `build.py` ignores them and removes any `.n.avif` / `.n.webp` left in `life/art/`.

## TEACHER REVIEW

- **The masjid has no divider.** The wooden screen (thing `screen`) that stood in front of the women's rows has been taken away: the
  owner asked why there was a divider, and there is none to show. The women's rows (`prayW`) stay behind the men's rows, as in the
  Prophet's masjid ﷺ: the men's rows in front, the women's behind, no barrier between them. Please confirm this reading.
- **The prayer frames.** Each person has three more prayer pictures for the full congregational prayer: `ptakbir` (standing, hands
  raised for the opening takbir), `psalamR` and `psalamL` (sitting, the head turned to the right and then to the left). They use the
  guide positions `takbir`, `salamR`, `salamL` of `pray/salah-kid.js` unchanged (the Shafi'i raised hands, for everyone, as `pstand`
  is the Shafi'i folded hands for everyone; the Hanafi `takbirH` is not baked).
- **The wudu tap** now stands on a small tiled area (the kind `wudutiles`, flat, in the floor picture) by the door instead of on the
  prayer carpet.
