# Balloon Pop: sound credits

Every sound is a real recording, cut, faded and levelled by `tools/sound-cut.py` from `audio/sfx/recipe.json` (the same
way as Spider IK and Helping Home: cuts at the recording's own event boundaries, high-passed, short fades, loudness in
the same range). No music, no synthesis. The old page's synthesised sounds (`js/sounds.js`: oscillator pops, squeaks, claps,
chirps) were removed on 2026-11-16.

Source of all originals: [BigSoundBank](https://bigsoundbank.com), recordings by Joseph Sardin, CC0 1.0 (licence page
checked 2026-11-16; commercial use allowed, no attribution required). "Additional sounds: Joseph SARDIN - BigSoundBank.com".
The originals are kept outside the repo in `../KidsGames-sounds/bigsoundbank/`.

| In the game | What it is for | Original (id, title) |
|-------------|----------------|----------------------|
| `pop` (6 takes) | a balloon popped (soft; the frequent sound, played at a low level, never twice within 90 ms) | 0551 Balloon: burst (3 takes), 1074 Bubbles burst (3 takes) |
| `puff` | a tap on empty sky | 1797 Whoosh #5 |
| `storm` | a grey storm cloud tapped | 0576 Canvas bag on floor |
| `heart` | a heart lost | 1045 Ball rebounds |
| `bye` | a balloon you needed floated away | 1795 Whoosh #3 |
| `lose` | out of hearts | 1798 Whoosh #10 |
| `flip` | a good-deed card turns up | 0164 Turned page (Spider IK's cut) |
| `sparkle` | the card is shown; each star on the end screen | 1384 Drops of water #1 |
| `cardin` | the card tucks into its goal | 1384 Drops of water #1 |
| `win` | a level is won | 2363 Applause #1 |
| `tap` | buttons | 0036 Switch desk lamp (Spider IK's cut) |
| `amb-garden` (loop) | Morning Garden | 0097 Countryside |
| `amb-sea` (loop) | Seaside | 0266 Sea: Waves (downloaded 2026-11-16) |
| `amb-night` (loop) | Lantern Night | 1020 Field cricket |

Downloaded for this game on 2026-11-16 (owner approved): `0551-balloon-burst.mp3` (80 KB, "Balloon: burst", 2 s) and
`0266-sea-waves.mp3` (2.3 MB, "Sea: Waves", 58 s), both CC0 on their sound pages.

Voices (not effects): `audio/praise-mashaallah.mp3` and `audio/praise-barakallah.mp3` are the two Arabic praise clips of the
kit (`js/kit/praise-clips.js`: ar-SA-HamedNeural, edge-tts, trimmed and levelled), unchanged, played after a level is won
through `Kit.snd.voice`. The caption of a good deed is spoken by the device's own English voice (`speechSynthesis`), as in
the old game, and is silent when sound is off.

Levels 2026-11-17: the background beds were brought down to about -34 to -38 LUFS (they were -21 to -27, louder than every other game's and above the standard's -30).
