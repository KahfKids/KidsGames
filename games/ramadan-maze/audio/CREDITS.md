# Ramadan Maze: sound credits

Every sound is a real recording, cut, faded and levelled by `tools/sound-cut.py` from `audio/sfx/recipe.json`.
No music, no synthesis. The old page's sounds (`js/sounds.js`: footsteps, thuds, a splash, a door creak, claps and
beds made from filtered noise and oscillators) were removed on 2026-11-16. Spoken "MashaAllah" is restored through
`Kit.snd.praise` using the existing shared `js/kit/praise-clips.js` clip. Its source is Microsoft ar-SA-HamedNeural
(edge-tts), as documented in that generated file; it is a speech clip, not a human field recording or music.

Source of all originals: [BigSoundBank](https://bigsoundbank.com), recordings by Joseph Sardin, CC0 1.0 (licence page
checked 2026-11-16; commercial use allowed, no attribution required). "Additional sounds: Joseph SARDIN - BigSoundBank.com".
The originals are kept outside the repo in `../KidsGames-sounds/bigsoundbank/`. Nothing was downloaded for this game:
all of them were already in the library.

| In the game | What it is for | Original (id, title) |
|-------------|----------------|----------------------|
| `step-grass` | footsteps in Palm Garden (quiet, only while walking, on the walk animation's own frames) | 1253 Steps in the grass slow |
| `step-stone` | footsteps in Old City Lanes | 1318 Fast steps on concrete |
| `step-tile` | footsteps in Lantern Night | 0376 Footsteps shoe on parquet |
| `bump-leaf` | leaning into a hedge until the wall stops her | 0137 Feet in leaves |
| `bump` | leaning into a brick or tiled wall; a tap that is too far away | 0576 Canvas bag on floor |
| `hop` | tapping the kid | 1797 Whoosh #5 |
| `date` | a date picked up; the stars on the iftar card | 1190 Small plate set on table |
| `cup` | a cup of water picked up | 1156 Cold water in mug |
| `lantern` | a lantern picked up (the flame catching) | 0030 Fireplace #1 |
| `allfound` | the last treat found (a few claps) | 2363 Applause #1 |
| `knock`, `door` | she reaches the house: two knocks, the door opens | 0374 Knock on a light door; 1702 Apartment door opening #1 |
| `home` | the windows light up (cheering) | 2363 Applause #1 |
| `dish` | the iftar table | 1192 Cutlery on table |
| `mark` | tap a spot to walk there | 0374 Knock on a light door |
| `tap`, `page` | buttons, screens opening (the same cuts as Spider IK and Helping Home) | 0036 Switch desk lamp; 0164 Turned page |
| `amb-garden` (loop) | the bed in Palm Garden | 0097 Countryside |
| `amb-lanes` (loop) | the bed in Old City Lanes: a breeze between the walls (a French village square before 2026-11-17: its traffic and bells did not fit) | 0908 Wind in tall grass |
| `amb-night` (loop) | the calm night bed in Lantern Night | 1020 Field cricket |
| `amb-house` (loop) | the room on the iftar screen | 2458 Sound atmosphere in a house |

Levels 2026-11-17: the background beds were brought down to about -34 to -38 LUFS (they were -21 to -27, louder than every other game's and above the standard's -30).
