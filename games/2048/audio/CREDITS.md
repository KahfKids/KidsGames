# 2048 Garden: sound credits

Every sound is a real recording, cut, faded and levelled by `tools/sound-cut.py` from `audio/sfx/recipe.json`.
No music, no instruments, no synthesis. The old page's synthesized sounds (`js/sounds.js`, built on `Kit.sfx.lib`)
were removed on 2026-11-16.

Source of all originals: [BigSoundBank](https://bigsoundbank.com), recordings by Joseph Sardin, CC0 1.0 (each sound page
checked for CC0, 2026-11-16; commercial use allowed, no attribution required). "Additional sounds: Joseph SARDIN -
BigSoundBank.com". The originals are kept outside the repo in `../KidsGames-sounds/bigsoundbank/`.

| In the game | What it is for | Original (id, title) |
|-------------|----------------|----------------------|
| `slide` | tiles slide over the tray (quiet, six soft takes) | 0373 Feet slipper on floor, 1499 Wooden drawer opening |
| `merge` | two tiles join (small tiles) | 1190 Small plate set on table |
| `merge-big` | two big tiles join (32 and up) | 1189 Large plate set on table |
| `spawn` | a new tile is set down (very quiet) | 0627 Cup on a table |
| `bump` | a swipe that moves nothing: the tray knocks | 0374 Knock on a light door |
| `undo` | the tiles go back a step | 1798 Whoosh #10 |
| `stuck` | no moves left (a soft thud) | 0576 Canvas bag on floor |
| `shine` | a new biggest tile (a little water sparkle) | 1384 Drops of water #1 |
| `star` | a star of the goal sheet | 0582 Four dice on wooden table |
| `win` | goal reached (clapping) | 2363 Applause #1 |
| `whoosh` | a level begins; goal reached | 1795 Whoosh #3 |
| `tap` | buttons (the same cut as Spider IK) | 0036 Switch desk lamp |
| `page` | a pause screen, level map or sheet opens (the same cut as Spider IK) | 0164 Turned page |
| `amb-0` (loop) | Morning Garden: birds waking, very low | 0222 Awakening birds |
| `amb-1` (loop) | Fountain Court: the fountain, very low | 0913 Fountain of a Japanese temple |
| `amb-2` (loop) | Sunset Palace: evening wind in the grass, very low | 0908 Wind in tall grass |

Downloaded for this game on 2026-11-16 (CC0, into `../KidsGames-sounds/bigsoundbank/`):

| id | title | size | event |
|----|-------|------|-------|
| 0373 | feet-slipper-on-floor | 375 KB | tile slide |
| 0627 | cup-on-a-table | 81 KB | new tile set down |
| 1189 | large-plate-set-on-table | 1.4 MB | big merge |
| 1190 | small-plate-set-on-table | 979 KB | merge |
| 1499 | wooden-drawer-opening | 48 KB | tile slide |

## Voice (praise on a goal)

`audio/voice/{mashaallah,ahsant,barakallah,alhamdulillah}.mp3` are the four praise clips the old page already played
(Kit.say.praise), cut out of `js/kit/praise-clips.js` unchanged: recorded Arabic praise, voice ar-SA-HamedNeural
(edge-tts), as that file's header says. They play through `Kit.snd.voice` (effects duck under them).
