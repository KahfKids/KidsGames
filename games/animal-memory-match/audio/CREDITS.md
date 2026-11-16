# Memory Match: sound credits

Every sound is a real recording, cut, faded and levelled by `tools/sound-cut.py` from `audio/sfx/recipe.json`.
No music, no synthesis. The old page's sounds (`js/sounds.js`: synthesised card, sparkle, clap and "animal" cues
built from oscillators and noise) were removed on 2026-11-16.

Source of all originals: [BigSoundBank](https://bigsoundbank.com), recordings by Joseph Sardin, CC0 1.0 (licence page
checked 2026-11-16; commercial use allowed, no attribution required). "Additional sounds: Joseph SARDIN - BigSoundBank.com".
The originals are kept outside the repo in `../KidsGames-sounds/bigsoundbank/`.

| In the game | What it is for | Original (id, title) |
|-------------|----------------|----------------------|
| `tap` | buttons, moving the keyboard ring | 0036 Switch desk lamp |
| `page` | the album opens | 0164 Turned page |
| `flip` | a card turns face up | 0785 Paper |
| `flipback` | cards turn face down | 0785 Paper |
| `miss` | not a pair (a soft cloth rustle, never harsh) | 1104 Synthetic coat rubbed |
| `match` | a pair found; each star on the win sheet | 1384 Drops of water #1 |
| `deal` | the cards are dealt | 2212 Pages that turn #5 |
| `win` | the level is done (a short, soft round of applause) | 2363 Applause #1 |
| `cow` | the cow found | 2382 Cow moos #2 |
| `goat` | the goat found | 0279 Bleating goat #1, 0880 Dwarf goat bleating |
| `sheep` | the sheep found | 2343 Sheep #1 (downloaded 2026-11-16) |
| `locust` | the locust found (a field cricket's rasp, the closest recording) | 1020 Field cricket |
| `quail` | the quail found (a hen's clucks stand in; the quail's own call is not in the library) | 0453 Annoyed hen |
| `fish` | the fish found (bubbles) | 1074 Bubbles burst |
| `whale` | the whale found (a swirl of water) | 0192 Swirl in the water |
| `frog` | the frog found | 0819 One frog (downloaded 2026-11-16) |
| `bee` | the bee found | 1000 Bumblebee #1 (downloaded 2026-11-16) |
| `crow` | the crow found | 2764 Crow #1 (downloaded 2026-11-16) |
| `horse` | the horse found (a little neigh) | 1212 Little neighing call #1 (downloaded 2026-11-16) |
| `amb-0` | the desert: wind in the grass, very low, looped | 0908 Wind in tall grass |
| `amb-1` | the garden: birds, very low, looped | 0222 Awakening birds |
| `amb-2` | the sea: waves, very low, looped | 0266 Sea waves |
| `amb-3` | Lantern Night: crickets, very low, looped (daytime countryside before 2026-11-17) | 1020 Field cricket |

Downloaded for this game on 2026-11-16 (CC0, from bigsoundbank.com into the library folder): 2343 Sheep #1 (29 KB),
1000 Bumblebee #1 (442 KB), 0819 One frog (587 KB), 2764 Crow #1 (9 KB), 1212 Little neighing call #1 (68 KB).
(1549 Donkey braying #1 was also fetched, judged too shrill for small children, not used, and deleted again.)

No fitting recording was found for: camel, elephant, ant, spider, wolf, hoopoe, butterfly, birds, donkey. Those animals show
their picture and name and stay silent. The whale uses a swirl of water, the quail a hen's clucks, the locust a field
cricket: the closest natural recordings, quiet.

Not a recording: the praise ("MashaAllah" and similar, spoken Arabic) after a level is the kit's own recorded voice
(`js/kit/praise-clips.js`, see its header); an animal's name is spoken by the device's voice, as on the old page.
