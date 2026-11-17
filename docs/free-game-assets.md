# Free game asset sources

Last checked: 2026-11-17. These are starting points, not blanket licences. Check the exact asset page and the licence included with each download before use; terms can vary by item and change over time.

## First stop

When a game needs new art, icons, or sound, check the project's existing assets and style, then check these free sources before looking for paid packs or commissioning work.

Every shipped asset needs a recorded source URL, creator, exact licence/version, acquisition date, required attribution, and any edits. Record this in the game's `CREDITS.md` (audio uses `audio/CREDITS.md`). Keep licence files with the asset where practical. Preserve attribution when assets are renamed, cut, packed into atlases, or converted. Put required credits where players can find them.

All game files must be hosted locally. Never load an asset from a provider URL at runtime; the game must continue to work offline. These sources do not relax the rules in `AGENTS.md` or `docs/phaser-standard.md`.

## Art, sprites, tiles, and icons

- **[Kenney assets](https://kenney.nl/assets)** — broad 2D, UI, pixel-art, and texture packs. Kenney says assets on its asset pages are CC0, with commercial use allowed and attribution optional. Check the specific page and bundled licence anyway. Choose art that fits the game's style and content rules. [Licence FAQ](https://kenney.nl/support)
- **[itch.io free game assets](https://itch.io/game-assets/free)** — useful for style-specific sprites, tilesets, backgrounds, and animation packs. itch.io is a marketplace, not one shared asset licence. Use only packs with explicit terms in the listing or download; save the included licence. [Example licensing guidance](https://itch.io/c/6403322/game-assets-2d)
- **[OpenGameArt](https://opengameart.org/)** — large community archive for 2D art, tiles, and audio. Licence is set per submission. Prefer CC0 or CC-BY when terms fit; review attribution, share-alike, GPL, and platform restrictions before using other licences. Do not use preview media as the asset unless its own licence says it is covered. [FAQ](https://opengameart.org/content/faq)
- **[Game-icons.net](https://game-icons.net/)** — editable SVG game and UI icons. Icons use CC BY 3.0; credit each icon's author. [Licence and attribution](https://game-icons.net/about.html)
- **[Pixabay](https://pixabay.com/)** — backup source for illustrations and sound effects. Its licence allows free use and modification without required attribution, but prohibits distributing the content on a standalone basis. Check third-party rights on each item; avoid imagery with people or faces and any logos or brands. [Licence summary](https://pixabay.com/service/license-summary/)

## 3D models and animations (added 2026-11-17)

For a three.js game (`docs/game-standard.md` section 3). Ship glTF (`.glb`). Every model passes through Blender before it ships: it is restyled to the game's look, its triangle count is reduced to the game's budget, its textures are packed and shrunk, and its eyes or faces are removed (`AGENTS.md` rule 14). Animals from these packs usually have eyes, so check every animal. From each source, keep to one style family so the game stays consistent.

- **[Kenney 3D packs](https://kenney.nl/assets/category:3D)**: for example the [Nature Kit](https://kenney.nl/assets/nature-kit), 330 low-poly trees, rocks, cliffs, plants, water pieces and camping items. CC0. Check each pack's download for its formats; some list OBJ and FBX only. Blender converts those to glTF.
- **[Quaternius](https://quaternius.com/)**: low-poly packs in glTF, FBX and OBJ, CC0 on the pack pages. For example the [Stylized Nature MegaKit](https://quaternius.com/packs/stylizednaturemegakit.html), and the [Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html), which has walk, jog, sprint, jump and climbing on a shared rig that can be applied to our own characters. Some older bundles state their own terms, so read the pack page. Animal packs: the [Ultimate Animated Animal Pack](https://quaternius.com/packs/ultimateanimatedanimals.html) (12 animals, 12+ animations each, glTF), the [Farm Animal Pack](https://quaternius.com/packs/farmanimal.html) (7 animated), and the [Animated Fish Pack](https://quaternius.itch.io/lowpoly-animated-fish) (fish, a dolphin, a manta ray, a shark and a whale, each with a swim animation). The MegaKit uses textures: replace them with palette vertex colours if a game uses none.
- **[KayKit](https://kaylousberg.itch.io/)**: low-poly packs, many CC0, including a [character animations](https://opengameart.org/content/kaykit-character-animations) pack with idle, walk, run, jump and climbing. Check each pack.
- **[Poly Pizza](https://poly.pizza/)**: over 7,000 low-poly models from many authors, each CC0 or CC-BY. The licence is shown on each model's own page, not in search results, so open the model page and record it. "Poly by Google" models are CC-BY 3.0 and need credit. Downloads are glTF plus FBX or OBJ. Most are not animated. Styles vary by author, so recolour and restyle in Blender to match the game. Good for animals, birds and sea life the packs lack (dolphin, turtle, bee, stork, gull, crab, octopus, hedgehog, camel, goat were all found on 2026-11-17).
- **[KayKit Forest Nature Pack](https://kaylousberg.itch.io/kaykit-forest)**: CC0, free tier of 100+ trees, bushes, rocks, grass and terrain pieces in glTF (the paid tier is not needed).
- **Our own models** are made in Blender (`/opt/homebrew/bin/blender`, scripted like Helping Home's `tools/art/`) when nothing free fits: the player character, faceless animals, and terrain. Terrain is always our own, so the world is original.

## Voices: speech, phrases, hums and recitation (updated 2026-11-17)

**Every voice is an authentic human recording, never machine-generated** (owner, 2026-11-17): no text-to-speech, no AI voices. `js/kit/praise-clips.js` is text-to-speech (Microsoft edge-tts) despite its header, so don't use it in new work. The owner also allows voice-only melody in place of music (`AGENTS.md` rule 15): humming, voice-only nasheeds and choirs, with no instrument, drum or synthesiser behind them. Listen to every take in full before use: no hidden backing track, and no reverb that sounds like a synth pad. NonCommercial (NC) licences are never used.

- **[Mozilla Common Voice](https://datacollective.mozillafoundation.org/datasets/cmflnuzw47jng4x81tavetpul)**: **CC0**. Real volunteers reading sentences aloud; the Arabic set (version 23.0) has 135,805 clips from 1,654 speakers. Search its transcripts for the phrase you need (for example الحمد لله, ما شاء الله, بسم الله) and cut it from a clean clip. Downloading means agreeing not to identify the speakers. It is a large download, so ask the owner first. Bengali is collected too; check for a current download.
- **[Wikimedia Commons, Arabic pronunciation](https://commons.wikimedia.org/wiki/Category:Arabic_pronunciation)** and **[Lingua Libre](https://lingualibre.org/)**: real speakers saying single words and phrases, mostly **CC BY-SA** (3.0 or 4.0): credit is needed, and share-alike applies to the clip itself. Found on 2026-11-17: "Ar-الحمد لله.ogg" (CC BY-SA 3.0) and "Ar-eg-الله أكبر.oga" (licence to check). Check each file's own page.
- **[EveryAyah](https://everyayah.com/)**: human Quran reciters, already in `../KidsGames-sounds/everyayah` and used by the quizzes. For recitation only. Never cut ayat into game phrases.
- **[Freesound](https://freesound.org/)**: CC0 or CC-BY only; check the licence on each sound's page. Arabic phrases there are few. On 2026-11-17, "Alhamdulillah" by Ojala.Arabe turned out to be **NC** (not usable); "Bismillah-ir-rahman-ir-rahim" (abdallah_makkah) and "Allahu Akbar" (florianreichelt) still need their licence checked. For hums, the CC0 filter finds real humming, for example by MayaTakeda, Pennywind and drotzruhn. Prefer men's or children's voices for hums.
- **Published nasheeds** are copyrighted unless the page says otherwise. Use one only with a written licence for the app, and only if it is voice-only (many "no music" nasheeds use synthesised vocal pads; listen first).

## Sound effects

`docs/phaser-standard.md` section 3a is stricter than these catalogues: effects and ambience must be real recordings of natural sounds; no music, instruments, chimes, or synthesis. Ask the owner before downloading additional source recordings. Process approved recordings through `tools/sound-cut.py` and credit each source in `audio/CREDITS.md`.

- **[Freesound](https://freesound.org/)** — best fit for finding individual natural recordings. Download requires a logged-in account. Check each sound's licence; use CC0 or CC-BY, and avoid CC-BY-NC. CC-BY needs attribution. [Download and licence FAQ](https://freesound.org/help/faq/)
- **[Kenney audio packs](https://kenney.nl/assets/category:Audio)** — CC0 audio packs are available, but use a clip only if it meets the natural-recording rule above. [Example: Interface Sounds](https://kenney.nl/assets/interface-sounds)
- **[Sonniss GDC bundles](https://gdc.sonniss.com/)** — large free sound-effects collections; current bundle is several gigabytes. Its licence allows synchronized use in games but prohibits supplying the sound files themselves as a sound-effects library. Because this site serves static files, do not use these without owner review of the exact licence and delivery. Content must also pass the natural-recording rule. [Bundle licence](https://sonniss.com/gdc-bundle-license/)
- **[Pixabay sound effects](https://pixabay.com/sound-effects/)** — free secondary source; apply the natural-recording rule and the standalone-distribution restriction above to each item.

## Free sprite tools

These are authoring tools, not libraries to load in a game. Their software licences do not determine the licence of third-party art you import.

- **[Pixelorama](https://pixelorama.org/)** — open-source pixel-art editor with frame-by-frame animation, onion skinning, and spritesheet export. Available through the official site, itch.io, and GitHub releases.
- **[Piskel](https://www.piskelapp.com/)** — simple animated-sprite editor with PNG spritesheet export. Offline desktop builds are available, but the project describes desktop updates and QA as best-effort. [Downloads](https://www.piskelapp.com/download/)

## Before adding an asset

1. Confirm exact licence on the asset's original page and in its downloaded files. “Free” or “royalty-free” alone is not a licence.
2. Confirm licence allows the intended app distribution and edits. Do not use non-commercial-only assets; ask the owner to review unclear share-alike, GPL, or custom terms.
3. Check the art against the game's style and content rules: no faces in any art (faceless people are fine, `AGENTS.md` rule 14), no rainbow effects, and no words a child must read. Spider IK is the existing face-art exception.
4. Bundle files locally; do not add a CDN, remote font, or runtime request.
5. For audio, follow section 3a of `docs/phaser-standard.md`, even if a catalogue labels a pack “game-ready.”
