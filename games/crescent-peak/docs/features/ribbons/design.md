# Ribbons and lanterns of kindness

**Status:** designed · **Updated:** 2026-11-17 · [GDD](../../GDD.md)

Grandma ties the first ribbon to the child's shawl: "the wind likes ribbons." Each ribbon is one stamina segment for climbing and flapping ([movement](../movement/design.md)). There are **24 ribbons** in all, and 7 are enough to reach the top. Every other kindness or win lights a **lantern of kindness** on the village's lantern string instead. On the 29th the lanterns the child earned are the ones that light up as they glide home ([story](../story/design.md)). Unlit ones hang in the village as goals that can still be reached (pillar 3, D-017).

## Rules
1. The child starts with 1 ribbon (Grandma's). Each ribbon adds 1 segment.
2. Ribbons come from the helps, hidden spots, activities and fishing marked "ribbon" in [quests](../quests/design.md), [side activities](../side-activities/design.md) and [fishing](../fishing/design.md). Nothing sells them, and none can be lost.
3. On the shawl, a ready ribbon flies bright and a spent one hangs limp and darker (at least 3:1 contrast). They refill from tip to root.
4. **The HUD row** shows one small ribbon shape for each segment, ready or spent, always on screen in the top-left corner (rule 18a). They are shapes, not only colours.
5. Earning one plays a short moment (2 s): the ribbon is given by a person, or found tied, and the wind lifts the shawl once. Then play resumes.
6. **Lanterns of kindness:** every help, hidden find or activity win marked "lantern" hangs one more unlit lantern on the string across the village square, with a small picture of what it was for. They are sprites, lit at dusk after the 29th.
7. **The finale day is offered** when the child has 7 ribbons, or has once stood on the summit ([story](../story/design.md)).
8. Ribbon colours are three related earthy hues (saffron, madder red, clay), in patterns, never a spread of colours (rule 16).

## Numbers

| Name | Value | Unit | What to watch in playtests |
|---|---|---|---|
| Ribbons in all | 24 | — | — |
| Starting ribbons | 1 | — | — |
| Needed by the easy route | 7 | — | see [island layout](../island-layout/design.md) |
| Needed by the hard route | 4 | — | skilled kids skip ahead |
| Finale offered at | 7 ribbons or a summit visit | — | — |
| Lanterns of kindness | about 30 | — | the string must fit the square |
| Ribbon moment | 2 | s | — |

## Where the 24 come from

| Source | Ribbons |
|---|---|
| Grandma | 1 |
| Helping people | 5 |
| Helping animals | 5 |
| Hidden spots | 8 |
| Activities | 4 |
| Fishing | 1 |
| **Total** | **24** |

## Edge cases
- Earning one mid-air: the moment waits until the child lands.

## History
- 2026-11-17: designed.
- 2026-11-17: cut to 24 ribbons; lanterns of kindness for every other kindness; a permanent HUD row; the finale offered at 7 or after a summit visit (design review).
