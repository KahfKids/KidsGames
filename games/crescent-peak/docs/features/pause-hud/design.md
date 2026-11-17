# Pause and HUD

**Status:** designed · **Updated:** 2026-11-17 · [GDD](../../GDD.md)

While playing, the screen is the island (rule 18a). The HUD has one pause button in a corner, the ribbon row, and the controls at their homes. Everything else is on a pause screen pushed over the paused game. The HUD and menus are Phaser, drawn sharp at full resolution over the pixel world (D-016). Laid out against the safe area with one gap constant, nothing touching, checked at 375 x 812, 844 x 390 and 1024 x 768.

## First run and loading
- **No title menu,** as in the reference. The page shows the kit's loading picture (an inline SVG: a crescent over a peak, a ring filling; no words).
- **First load** is at most 4 MB: the engines, the HUD, the harbour and village chunks, the far mesh, the child, one bed. Nothing else blocks play.
- **First run:** the child stands on the ferry deck; two heads and four shawls show as pictures, one preselected, with a tick to go. The ferry docks and play starts. The gangway teaches the stick, Grandma's steps teach Jump, the garden wall teaches climbing, and the drop beyond it teaches the glide. A hand hint appears after 3 idle seconds.
- **Returning:** the game opens at the last bench; the title fades over the world for 2 s.

## During play
1. **Pause button:** top-right corner.
2. **Ribbon row:** top-left; one small ribbon shape per segment, ready or spent, always shown ([ribbons](../ribbons/design.md)).
3. **Stick:** rests at its home bottom-left, quiet at rest, bright in use, floating to the thumb ([movement](../movement/design.md)).
4. **Jump/Glide:** bottom-right, always shown.
5. **Action:** above Jump, always at its home; dim at rest, bright with the picture of the action when something usable is near.
6. **Task pictures:** while a task is active, a small picture count (apricots 3/10) under the ribbon row.
7. Nothing fades below 3:1 contrast. Prompts follow the device last used (touch or keys). The first area teaches each control until it is used.

## Settings (on the pause screen)
Sound; language (English or Bangla, starting from the quizzes' shared choice, then `?lang=`, then the device); swap sides (stick on the right); start again (a two-step picture confirm, never `alert()`). No graphics settings.

## Credits and the app
- The credits page is drawn from `data/credits.json`: Phaser, three.js, three-mesh-bvh, every model's author and licence, every recording, the reciter and EveryAyah, and the translations.
- `KahfBridge.complete()` on each finished help and on the finale; `KahfBridge.item(id)` on each new fish and notebook entry.

## The pause screen (a stack of screens)
- **Resume**, **Grandpa's map** (landmarks and "you are here"), **the fishing journal**, **the nature notebook**, **things to wear**, **the lantern string** (each lantern's picture), **sound on/off**, **watch the ending again** (after it), **the controls** (shown again), **credits** (including every CC-BY model's author), and **the way out** (`Kit.play.exit()`).
- Each page is pictures first; words are short labels.

## Numbers

| Name | Value | Unit | What to watch in playtests |
|---|---|---|---|
| Button size | at least 150 | design units | small thumbs |
| Gap constant | one value for all spacing | — | — |
| Lowest contrast | 3:1 | — | — |

## History
- 2026-11-17: designed (design review: rule 18a made explicit; the credits page for CC-BY models).
- 2026-11-17: first run and loading, settings, credits and the app bridge.
