# Quizzes: sound credits

Every quiz shares these sounds. Each is a real recording, cut, faded and levelled by `tools/sound-cut.py` from
`recipe.json` beside this file. No music, no instruments, no synthesis. They replace the synthesized sounds of the DOM
quiz engine (`js/quiz/sounds.js`, built on `Kit.sfx.lib`), removed on 2026-11-17.

Source of all originals: [BigSoundBank](https://bigsoundbank.com), recordings by Joseph Sardin, CC0 1.0 (the same
files the other games use, checked for CC0 on 2026-11-16; commercial use allowed, no attribution required).
"Additional sounds: Joseph SARDIN - BigSoundBank.com". The originals are kept outside the repo in
`../KidsGames-sounds/bigsoundbank/`.

| In the quiz | What it is for | Original (id, title) |
|-------------|----------------|----------------------|
| `tap` | any button | 0036 Switch desk lamp |
| `page` | a sheet opens (band, stickers, lightning round) | 0164 Turned page |
| `correct` | a right answer (a bright drop of water) | 1384 Drops of water #1 |
| `wrong` | a wrong answer (a soft cloth thud, nothing harsh) | 0576 Canvas bag on floor |
| `place` | a card set in a basket, a slot or a pair | 0087 Key placed on wooden table |
| `locked` | a stop or sticker not open yet | 0627 Cup on a table |
| `star` | each star on the finished sheet | 0582 Four dice on wooden table |
| `slide` | the answer bar slides up | 1797 Whoosh #5 |
| `win` | a stop finished: people clapping | 2363 Applause #1 |

Praise after a right answer is the kit's recorded Arabic clips (`js/kit/praise-clips.js`, `Kit.snd.praise`).
