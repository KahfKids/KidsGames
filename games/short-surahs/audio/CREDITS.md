# Short Surahs: recitation

`ayah/<surah><ayah>.m4a` (three digits each, e.g. `112001.m4a` is Al-Ikhlas 112:1) are the recited ayat the quiz plays.

- **Reciter:** Shaykh Mahmoud Khalil Al-Husary, teaching recitation (*al-muallim*).
- **Source:** everyayah.com, folder `Husary_Muallim_128kbps`
  (https://everyayah.com/data/Husary_Muallim_128kbps/), one MP3 per ayah. Downloaded 2026-11-17 at the owner's request,
  so the quiz plays offline and the page makes no request to another site (AGENTS.md rule 13). Before this they were
  streamed from that address.
- **Edits:** none to the recitation. Re-encoded to mono AAC 64 kbit/s and metadata removed (`tools/ayah-clips.sh`).
  The originals are kept outside the repo in `../KidsGames-sounds/everyayah/Husary_Muallim_128kbps/`.
- **Terms:** everyayah.com publishes no licence, terms of use or attribution requirement for these files (checked
  2026-11-17: the home page, the reciter list and the folder listing; the site links only a contact page). Nothing found
  grants or forbids re-hosting. This credit is kept so the source and reciter are always named. If the owner obtains
  written terms, record them here.
- Only the 94 ayat the bank uses are kept (Al-Fatihah and Ad-Duhaa to An-Nas, as `games/short-surahs/data.js` asks);
  `sh tools/ayah-clips.sh` adds any new ones the bank starts using.
