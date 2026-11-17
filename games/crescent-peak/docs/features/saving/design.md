# Saving

**Status:** designed · **Updated:** 2026-11-17 · [GDD](../../GDD.md)

Progress saves itself; the child never sees a save button. A new saved-progress shape is an ask-first in `AGENTS.md`; this one was approved on 2026-11-17 under the owner's delegation ("settle everything"). Stored through the kit's saves (`Kit.store`, `js/kit/core.js`), never on its own path. All ids are stable strings, and unknown ids are kept, so a later version never loses progress.

## Rules
1. **Autosave** after each ribbon, lantern, quest step, catch, notebook entry, tool and area entered, and when the page is hidden. Saving must happen while the page is hidden, when Phaser's clocks stop (a browser timer, as `docs/phaser-standard.md` notes).
2. **One slot per device:** `Kit.store('kahf-crescent-peak')`. Writes at most every 2 s, plus on `pagehide`. The previous good save is kept as a backup; an unreadable save falls back to it and is never reset silently.
3. **Loading** puts the child at the last bench or doorway they passed, at the same hour.
4. **Versioned:** the save carries a version number; a later release migrates older saves and never resets them (the save-systems skill).
5. The finale's state is saved, so quitting mid-finale resumes at the summit just before sunset.

## Offline
`offline.json` lists every file and is written by `tools/make-offline.py` (as in Helping Home). After the first area is playable, the rest is fetched one file at a time in order of distance, pausing when a frame runs long, and cached for the service worker's cache-first path. Pause shows a tick picture when everything is saved for offline play. A chunk not yet cached while offline shows the far mesh and a rope across the path with a cloud picture. With `saveData` on, files are fetched only on approach. The 20 MB counts bytes on the wire; M1 checks whether GitHub Pages compresses `.glb`.

## The shape (approved)

| Field | What |
|---|---|
| `v` | save version |
| `pos` | the last bench or doorway id |
| `clock` | the hour of the day, and the day count |
| `phase` | before the 29th, the 29th, or Ramadan night n |
| `ribbons` | ids of ribbons earned |
| `lanterns` | ids of lanterns earned |
| `quests` | each quest's `{step, n}`, so counts such as apricots 3/10 survive |
| `tools`, `wear` | ids |
| `fish` | each kind: caught, biggest size |
| `notebook` | ids of entries |
| `best` | best scores of the activities |
| `look` | the child's look choices |
| `seen` | ids of areas entered |
| `world` | ids of permanent changes: vines grown, the log bridge, animals now following, controls taught |
| `time` | seconds played |

## History
- 2026-11-17: designed (design review: the shape is an ask-first, so it is written down before M2).
- 2026-11-17: the shape approved, with `seen`, `world`, `time` and `{step, n}` quests.
- 2026-11-17: one slot per device through `Kit.store`, a backup save; the offline plan.
