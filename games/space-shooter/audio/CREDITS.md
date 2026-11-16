# Star Rangers: sound credits

Every sound is a real recording, cut, faded and levelled by `tools/sound-cut.py` from `audio/sfx/recipe.json`
(cuts at each recording's own event boundaries, high-passed, short fades, 1 to 3 takes per sound, loudness like Spider IK).
No music, no instruments, no synthesis. The old page's synthesised sounds (`js/sounds.js`) were removed on 2026-11-16.

Source of all originals: [BigSoundBank](https://bigsoundbank.com), recordings by Joseph Sardin, CC0 1.0 (licence page
checked 2026-11-16; commercial use allowed, no attribution required). "Additional sounds: Joseph SARDIN - BigSoundBank.com".
The originals are kept outside the repo in `../KidsGames-sounds/bigsoundbank/`.

| In the game | What it is for | Original (id, title) |
|-------------|----------------|----------------------|
| `tap` | buttons (same cut as Spider IK) | 0036 Switch desk lamp |
| `page` | the wave banner (same cut as Spider IK's story card) | 0164 Turned page |
| `shot` | the ranger's shots: a soft airy puff, every second shot, never a zap | 1797 Whoosh #5, 1798 Whoosh #10 |
| `hit` | a bolt bonks a robot, junk or the boss | 0582 Four dice on wooden table |
| `chip` | a bolt chips an asteroid | 1022 Fall of stone |
| `crack` | an asteroid crumbles; a boss machine powers down | 1022 Fall of stone |
| `pop` | a robot or tank pops apart; the shield blocks (pitched up) | 1074 Bubbles burst |
| `spark` | a robot sends a spark (very quiet) | 1384 Drops of water #1 |
| `zap` | a drone fizzles out | 2143 Flashing light bulb #1 |
| `thud` | a big robot lands its last pop; the boss machine arrives and breaks | 0576 Canvas bag on floor |
| `hurt` | the ranger is bumped | 0576 Canvas bag on floor |
| `down` | out of hearts | 0576 Canvas bag on floor |
| `collect` | a star is caught; a star lands on the result screen | 1384 Drops of water #1 |
| `power` | a power-up is caught | 0192 Swirl in the water |
| `shield` | the bubble shield switches on | 0192 Swirl in the water |
| `win` | the wave is clear | 0192 Swirl in the water |
| `warp` | a wave begins; the boss machine arrives; a boss dash (lower) | 1795 Whoosh #3 |
| `whirr` | a robot dives toward the ranger | 1798 Whoosh #10 |

Downloaded for this game (2026-11-16, owner-approved, CC0): **1022 Fall of stone** (`1022-fall-of-stone.mp3`, 1.1 MB,
for the asteroids). Everything else was already in the library. The library README was not edited.

Removed 2026-11-17: the looped electric hum (2118 Neon or transformer) the owner found harsh ("gets headache"). Space has no background bed.
