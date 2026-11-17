# Camera

**Status:** designed · **Updated:** 2026-11-17 · [GDD](../../GDD.md)

The camera follows the child on its own, so a 5-year-old only has to steer. It stays behind and a little above the child, eases around corners, and looks ahead in the direction of travel. Dragging on the right half of the screen turns it, but play never needs that. While gliding it pulls back to show the height and the land below, the feeling the reference does so well.

## Rules
1. **Auto-follow:** the camera swings slowly behind the child's direction of travel when the child has moved for 0.5 s; standing still, it stays put.
2. **Optional drag:** dragging on the right half turns it around the child; after 3 s without touching, auto-follow resumes.
3. **Glide:** it pulls back and looks a little down.
4. **Climb:** it moves out to the side, so the wall and the top are both visible.
5. **Talk:** it frames the speaker and the child ([dialogue](../dialogue/design.md)).
6. **Walls:** if rock or trees come between the camera and the child, the camera moves in toward the child; nothing is faded or see-through.
7. **Orientation:** the game plays on a phone held on its side (844 x 390) and still works upright (375 x 812), with a higher camera and the same controls. It is added to `landscape-games.ts` in the app release before launch, so it opens on its side in the app; on the web and PWA, where rotation can't be forced, it plays both ways.
8. No screen shake (game feel in the GDD).

## Numbers

| Name | Value | Unit | What to watch in playtests |
|---|---|---|---|
| Distance (walking) | 6 | m | — |
| Distance (gliding) | 10 | m | — |
| Height above the child | 2.5 | m | — |
| Auto-turn speed | 60 | °/s | motion sickness |
| Resume after drag | 3 | s | — |
| Field of view | 55 (landscape), 70 (upright) | ° | — |

## History
- 2026-11-17: designed (design review: auto-follow by default, dragging optional).
- 2026-11-17: orientation settled: both, landscape-first.
