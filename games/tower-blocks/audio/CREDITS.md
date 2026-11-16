# Tower Blocks: sound credits

Every sound is a real recording, cut, faded and levelled by `tools/sound-cut.py` from `audio/sfx/recipe.json`.
No music, no synthesis. The old page's sounds (synthesised in `js/sounds.js`: stone, tile, slice, crumble, sparkle,
claps) were removed on 2026-11-16.

Source of all originals: [BigSoundBank](https://bigsoundbank.com), recordings by Joseph Sardin, CC0 1.0 (licence page
checked 2026-11-16; commercial use allowed, no attribution required). "Additional sounds: Joseph SARDIN - BigSoundBank.com".
The originals are kept outside the repo in `../KidsGames-sounds/bigsoundbank/`.

| In the game | What it is for | Original (id, title) |
|-------------|----------------|----------------------|
| `stone` | a carved stone layer is set down (five takes) | 1022 Fall of Stone (downloaded for this game, 1.1 MB, 30 s) |
| `crumble` | a cut-off piece reaches the courtyard far below (quieter the further away) | 1022 Fall of Stone |
| `tile` | a glazed tile slab is set down (four takes, a short ceramic knock, cut before it rings) | 1189 Large plate set on table |
| `star` | a star settles on the level-complete sheet (a glazed piece set in place, short) | 0627 Cup on a table |
| `perfect` | a flush drop (rises a little with the streak) | 1384 Drops of water #1 |
| `slice` | the overhang peels away | 1795 Whoosh #3 |
| `grow` | the block grows back a little | 1797 Whoosh #5 |
| `miss` | a block misses the tower | 0576 Canvas bag on floor |
| `over` | out of hearts / Free Build over | 1798 Whoosh #10 |
| `win`, `cheer` | the tower is done; a Free Build milestone or new best | 2363 Applause #1 |
| `tap` | buttons | 0036 Switch desk lamp (same cut as Spider IK) |
| `amb-wind` (loop) | the wind around the tower, a little louder as it climbs | 0908 Wind in tall grass |

Downloaded for this game on 2026-11-16 (only this one): `1022-fall-of-stone.mp3` (Fall of Stone, 1.1 MB, 29 s, CC0,
https://bigsoundbank.com/fall-of-stone-s1022.html). A cup-on-a-table and a coin-in-a-cup recording were tried and dropped
(too ringing); the cup file was deleted again. On 2026-11-16 (later) the tile and star took short cuts (0.2 s, faded) of
the library's plate and cup recordings instead of the dice: a glazed slab should sound like ceramic, not wood.

The praise voices after a tower or a streak ("MashaAllah", "Ahsant", ...) are the kit's recorded clips
(`js/kit/praise-clips.js`, an Arabic voice), as in the old game.

Levels 2026-11-17: the background beds were brought down to about -34 to -38 LUFS (they were -21 to -27, louder than every other game's and above the standard's -30).
