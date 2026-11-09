# Audio credits: Helping Home

All clips are real human recordings (no TTS, no AI voices), cut per phrase, high-passed at 60 Hz, 10 ms to 20 ms fade-in and 120 ms fade-out, loudness-normalised to about -16 LUFS (two-pass ffmpeg loudnorm), and encoded as mono AAC .m4a at 44 kbps. No other change was made. Every clip is a short excerpt of the source file named below. All Arabic wording needs sign-off from a qualified teacher before release (see "Teacher review").

Sources are all on Wikimedia Commons. Licence summaries:
- CC0 1.0 (no conditions): https://creativecommons.org/publicdomain/zero/1.0/
- CC BY-SA 4.0 (credit the author, link the licence, say what was changed, and share any adapted audio under the same licence): https://creativecommons.org/licenses/by-sa/4.0/

The excerpts under CC BY-SA 4.0 are adaptations, so those clip files are themselves offered under CC BY-SA 4.0. The licence applies to the audio files, not to the game's code. The owner should confirm that is acceptable (see the report).

## A. Aaqib Azeez (adhan and Qur'an recitation)

Reciter and muezzin: Aaqib Azeez, uploaded to Wikimedia Commons by the user Atcovi (Commons categorises the Qur'an files under "Recitations of the Qur'an by Aaqib Azeez").

| ids | files | source file | licence |
|---|---|---|---|
| adhan/takbir1, takbir2, shahada1, shahada2, risala1, risala2, salah1, salah2, falah1, falah2, takbir3, tahlil | adhan-*.m4a (12 files) | https://commons.wikimedia.org/wiki/File:The_Adhan_-_Muslim_Call_to_Prayer_-_Aaqib_Azeez.mp3 | CC BY-SA 4.0 |
| salah/takbir | salah-takbir.m4a | same adhan file: the first "Allahu akbar" (0.62 s to 3.85 s) | CC BY-SA 4.0 |
| salah/taawwudh, salah/fatiha-1 to 7, wudu/bismillah | salah-taawwudh.m4a, salah-fatiha-1..7.m4a | https://commons.wikimedia.org/wiki/File:Chapter_1,_Al-Fatiha_(Murattal)_-_Recitation_of_the_Holy_Qur%27an.mp3 (Al-Fatiha, murattal, Hafs 'an 'Asim) | CC0 1.0 |
| salah/ikhlas-1 to 4 | salah-ikhlas-1..4.m4a | https://commons.wikimedia.org/wiki/File:Chapter_112,_Al-Ikhlas_(Murattal)_-_Recitation_of_the_Holy_Qur%27an.mp3 | CC BY-SA 4.0 |
| salah/kawthar-1 to 3 | salah-kawthar-1..3.m4a | https://commons.wikimedia.org/wiki/File:Chapter_108,_Al-Kawthar_(Murattal)_-_Recitation_of_the_Holy_Qur%27an.mp3 | CC0 1.0 |

Attribution line for the adhan, al-Ikhlas and the credits screen: "Adhan and recitation by Aaqib Azeez (Wikimedia Commons, user Atcovi), CC BY-SA 4.0 / CC0".

Cut notes:
- Adhan: 12 phrase groups found with ffmpeg silencedetect, in the standard order (takbir x2 pairs, shahada x2, risala x2, hayya 'ala-s-salah x2, hayya 'ala-l-falah x2, takbir, la ilaha illa-llah). The mapping is by count and order, as the brief asked; a teacher or listener should confirm each clip says the expected phrase. The clip salah/takbir is the first "Allahu akbar" of takbir1; its cut point is at a 0.16 s dip in the signal and should be listened to.
- Al-Fatihah: the source file begins with ta'awwudh, then Bismillah, then ayahs 2 to 7 (8 segments). Bismillah (ayah 1) was identified by acoustic comparison against the Bismillah that opens the Ikhlas and Kawthar recordings (closest match was segment 2, not segment 1). wudu/bismillah reuses the clip salah-fatiha-1.m4a ("Bismillahi r-rahmani r-rahim"); no separate file.
- Al-Ikhlas and al-Kawthar: the sources open with Bismillah; that part was dropped (the clips are the ayahs only).
- No "amin" is present in the recitation file.

## B. Other voices

| id | file | reciter | source | licence |
|---|---|---|---|---|
| salah/salawat-ibrahimiyya, resp/salawat | salah-salawat-ibrahimiyya.m4a (one file, used for both ids; whole 16 s recording, trimmed) | Ahmad Naji (أحمد ناجي), text as in Sunan at-Tirmidhi | https://commons.wikimedia.org/wiki/File:%D8%A7%D9%84%D8%B5%D9%84%D8%A7%D8%A9_%D8%A7%D9%84%D8%A5%D8%A8%D8%B1%D8%A7%D9%87%D9%8A%D9%85%D9%8A%D8%A9.mp3 | CC BY-SA 4.0 |
| salah/amin | salah-amin.m4a | Fenakhay (Lingua Libre pronunciation of "amin", single spoken word, not a recitation) | https://commons.wikimedia.org/wiki/File:LL-Q13955_(ara)-Fenakhay-%D8%A2%D9%85%D9%8A%D9%86.wav | CC BY-SA 4.0 |

## C. Not filled (no source whose terms allow reuse was found)

- adhan/fajr1, adhan/fajr2 ("as-salatu khayrun min an-nawm")
- resp/hawqala, resp/dua-adhan
- wudu/shahada-after
- salah/thana, salah/ruku, salah/sami, salah/rabbana, salah/sujud, salah/jalsa, salah/tashahhud, salah/salam

Sources looked at and skipped (listed so the owner can ask for permission if wanted):
- EveryAyah.com (Mishary Alafasy, Al-Husary and others): the site states no terms of use at all, so reuse is unclear. Needs permission (contact via https://quran.zendesk.com/hc/en-us). Not used.
- Quran.com / quranicaudio.com CDN: Quran.com's terms (https://quran.com/terms-and-conditions) allow personal, non-commercial use only and forbid derivative works without written consent. Not used.
- Internet Archive "MakkahAzan-ramadan" (labelled CC0), "athan_dzd", "athan_202604": the uploader's licence label does not show that the uploader owns the recording (a broadcast or someone else's recording). Not used.
- Internet Archive "Dua-istiftaah-AJ" (labelled public domain; Shaykh Muhammad Adly teaching how to pronounce the opening du'a, 7 minutes with commentary) and "durood-ibrahim" (no licence): candidate sources for thana and salawat, but rights are unclear. Need permission from the speaker or uploader.
- Wikimedia Commons "Eid al-Fitr Fajr azan at Malmo Mosque - 19 August 2012" (CC BY 3.0, taken from YouTube): a live mosque recording whose phrases could not be matched without listening, with a different muezzin. Not used. It could supply the Fajr phrase if someone listens and marks the cut points.
- Commons "Adhan.ogg" (CC0, 42 s), "Beautiful adhan.ogg" (CC0), "Azan.ogg" and "Call to prayer by Sabah Fakhry.mp3": other adhan recordings with weaker provenance; not needed.

## Teacher review

Every clip (Arabic wording, phrase boundaries, recitation style) needs a qualified teacher to listen and sign off. In particular: the adhan cut order, salah/takbir (a prolonged first takbir), resp/salawat sharing the full Ibrahimiyya clip, wudu/bismillah being the full Bismillah, and salah/amin being a spoken word rather than a prayer "amin".
