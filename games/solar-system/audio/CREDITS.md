# Solar System: sound credits

Every sound is a real recording, cut, faded and levelled by `tools/sound-cut.py` from `audio/sfx/recipe.json`.
No music, no synthesis. The old page's synthesised sounds (radar blips, noise swells, sparkle grains, claps and a
looping brown-noise rumble, all made with the Web Audio API in `js/sounds.js`) were removed on 2026-11-16.
The spoken questions and facts are still the device's own voice (`speechSynthesis`, as before; silent where the device has none)
and the "SubhanAllah" / "MashaAllah" after a level is the kit's recorded Arabic clip (`js/kit/praise-clips.js`).

Source of all originals: [BigSoundBank](https://bigsoundbank.com), recordings by Joseph Sardin, CC0 1.0 (licence page
checked 2026-11-16; commercial use allowed, no attribution required). "Additional sounds: Joseph SARDIN - BigSoundBank.com".
The originals are kept outside the repo in `../KidsGames-sounds/bigsoundbank/`. Nothing was downloaded for this game:
all of them were already in the library.

| In the game | What it is for | Original (id, title) |
|-------------|----------------|----------------------|
| `tap` | buttons (the same cut as Spider IK) | 0036 Switch desk lamp |
| `page` | the pause and level screens, a planet's card opening (the same cut as Spider IK) | 0164 Turned page |
| `blip` | tapping a planet (lower for a big one) | 0374 Knock on a light door |
| `tick` | tapping empty space or a planet that is not a choice (quiet) | 0582 Four dice on wooden table |
| `ask` | a new question appears | 1384 Drops of water #1 |
| `good` | a right answer | 1384 Drops of water #1 |
| `star` | each star on the level sheet | 1384 Drops of water #1 |
| `whoom` | flying in to a planet | 1795 Whoosh #3 |
| `whoosh` | a level begins, flying back out | 1798 Whoosh #10 |
| `bump` | a wrong answer (a soft thud) | 0576 Canvas bag on floor |
| `lose` | out of hearts | 0192 Swirl in the water |
| `shoot` | a shooting star (very quiet, to the left) | 1797 Whoosh #5 |
| `win` | a level won (applause) | 2363 Applause #1 |

## Pictures (not sounds)

The planets' surfaces, the sky and the asteroid belt are made by `tools/bake.js` from procedural code kept in
`tools/bake/` (nothing photographed, nothing copied from elsewhere); the planets are shaded in `game/planet.js`.

Removed 2026-11-17: the looped electric hum (2118 Neon or transformer) the owner found harsh ("gets headache"). Space has no background bed.
