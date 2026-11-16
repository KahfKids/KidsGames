# Free game asset sources

Last checked: 2026-11-16. These are starting points, not blanket licences. Check the exact asset page and the licence included with each download before use; terms can vary by item and change over time.

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
3. Check the art against the game's style and content rules: no faces or people in new Phaser art, no rainbow effects, and no words a child must read. Spider IK is the existing face-art exception.
4. Bundle files locally; do not add a CDN, remote font, or runtime request.
5. For audio, follow section 3a of `docs/phaser-standard.md`, even if a catalogue labels a pack “game-ready.”
