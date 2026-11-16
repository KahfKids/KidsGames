# Jannah Garden: sound credits

Every sound is a real recording, cut, faded and levelled by `tools/sound-cut.py` from `audio/sfx/recipe.json`
(one-shots as one audio sprite `sfx.m4a` + `sfx.json`, the three garden beds as loops of their own). No music, no
synthesis. The old page's synthesized sounds (`js/sound.js`, made with the kit's Web Audio generators) were removed on
2026-11-16. The spoken "MashaAllah" at the end of a level is the kit's recorded clip (`js/kit/praise-clips.js`), played
through `Kit.snd.voice`; goals are read out by the device's own voice, as before.

Source of all originals: [BigSoundBank](https://bigsoundbank.com), recordings by Joseph Sardin, CC0 1.0 (licence page
checked 2026-11-16; commercial use allowed, no attribution required). "Additional sounds: Joseph SARDIN - BigSoundBank.com".
The originals are kept outside the repo in `../KidsGames-sounds/bigsoundbank/`.

| In the game | What it is for | Original (id, title) |
|-------------|----------------|----------------------|
| `tap` | every button (same cut as Spider IK) | 0036 Switch desk lamp |
| `page` | saved to My Gardens (same cut as Spider IK) | 0164 Turned page |
| `soil` | a plant goes into the ground, a thing is put down | 0576 Canvas bag on floor |
| `leaf` | leaves of a flower, a thing lifted out of the grass | 0137 Feet in leaves |
| `foliage` | a bush or a tree grows | 0137 Feet in leaves |
| `splash`, `ripple` | a pond or fountain is placed, the river is tapped | 0192 Swirl in the water |
| `pour` | a fountain is placed | 0818 Watering tomatoes |
| `knock` | a bench or birdhouse is set down | 0374 Knock on a light door |
| `chirp`, `birdfar` | a birdhouse, the sky tapped, far birds now and then (very quiet) | 0222 Awakening birds |
| `glow` | a lantern is placed | 0030 Fireplace #1 |
| `flutter` | a butterfly | 0785 Paper |
| `basket` | something goes into the basket | 0785 Paper |
| `soft` | a thing let go of nowhere | 1798 Whoosh #10 |
| `goal` | a goal is met (rises a little with each) | 1384 Drops of water #1 |
| `star` | each star on the level-done screen (rises) | 1384 Drops of water #1 |
| `win` | a level is done | 2363 Applause #1 |
| `amb-river` (loop) | River Garden bed | 0864 Brooklet |
| `amb-wind` (loop) | Fruit Orchard bed | 0908 Wind in tall grass |
| `amb-court` (loop) | Fountain Courtyard bed | 0913 Fountain of a Japanese temple |

Downloaded for this game on 2026-11-16 (all CC0, from https://bigsoundbank.com/UPLOAD/mp3/<id>.mp3), added to
`../KidsGames-sounds/bigsoundbank/`:

| id | title | size | used for |
|----|-------|------|----------|
| 1305 | Dig with a shovel | 2.8 MB | not used in the end (its scrapes are too bright) |
| 0137 | Feet in leaves | 1.3 MB | leaf, foliage |
| 0818 | Watering tomatoes | 0.9 MB | pour |
| 0864 | Brooklet | 3.3 MB | amb-river |
| 0030 | Fireplace #1 | 1.4 MB | glow |
| 0222 | Awakening birds | 6.7 MB | chirp, birdfar (it was in the folder's first listing, then missing: downloaded again) |

Levels 2026-11-17: the background beds were brought down to about -34 to -38 LUFS (they were -21 to -27, louder than every other game's and above the standard's -30).
