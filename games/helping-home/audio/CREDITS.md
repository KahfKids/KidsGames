# Audio credits: Helping Home

All clips are real human recordings (no TTS, no AI voices). Each one is a short excerpt of the source file named below, cut at a pause found from the signal's energy and checked with speech recognition (whisper.cpp, model ggml-medium, language Arabic, word timestamps). Processing: cut with about 80 ms of padding on each side, high-passed at 60 Hz, 10 ms to 20 ms fade-in, 80 ms to 150 ms fade-out, loudness-normalised to about -16 LUFS (two-pass ffmpeg loudnorm), encoded as mono AAC .m4a at 44 kbps, 44.1 kHz. No other change was made unless a row says so. All Arabic wording needs sign-off from a qualified teacher before release (see "Teacher review").

Licence summaries:
- CC0 1.0 (no conditions): https://creativecommons.org/publicdomain/zero/1.0/
- CC BY 4.0 (credit the author, link the licence, say what was changed): https://creativecommons.org/licenses/by/4.0/
- CC BY-SA 4.0 (credit the author, link the licence, say what was changed, and share any adapted audio under the same licence): https://creativecommons.org/licenses/by-sa/4.0/

The excerpts under CC BY-SA 4.0 are adaptations, so those clip files are themselves offered under CC BY-SA 4.0. The licence applies to the audio files, not to the game's code. No clip under a non-commercial or no-derivatives licence is used.

## A. Aaqib Azeez (adhan and Qur'an recitation)

Reciter and muezzin: Aaqib Azeez, uploaded to Wikimedia Commons by the user Atcovi (Commons categorises the Qur'an files under "Recitations of the Qur'an by Aaqib Azeez").

| ids | files | source file | licence |
|---|---|---|---|
| adhan/takbir1, takbir2, shahada1, shahada2, risala1, risala2, salah1, salah2, falah1, falah2, takbir3, tahlil | adhan-*.m4a (12 files) | https://commons.wikimedia.org/wiki/File:The_Adhan_-_Muslim_Call_to_Prayer_-_Aaqib_Azeez.mp3 | CC BY-SA 4.0 |
| salah/taawwudh, salah/fatiha-1 to 7 | salah-taawwudh.m4a, salah-fatiha-1..7.m4a | https://commons.wikimedia.org/wiki/File:Chapter_1,_Al-Fatiha_(Murattal)_-_Recitation_of_the_Holy_Qur%27an.mp3 (Al-Fatiha, murattal, Hafs 'an 'Asim) | CC0 1.0 |
| salah/ikhlas-1 to 4 | salah-ikhlas-1..4.m4a | https://commons.wikimedia.org/wiki/File:Chapter_112,_Al-Ikhlas_(Murattal)_-_Recitation_of_the_Holy_Qur%27an.mp3 | CC BY-SA 4.0 |
| salah/kawthar-1 to 3 | salah-kawthar-1..3.m4a | https://commons.wikimedia.org/wiki/File:Chapter_108,_Al-Kawthar_(Murattal)_-_Recitation_of_the_Holy_Qur%27an.mp3 | CC0 1.0 |
| salah/jalsa | salah-jalsa.m4a | https://commons.wikimedia.org/wiki/File:Chapter_71,_Nuh_(Murattal)_-_Recitation_of_the_Holy_Qur%27an.wav : the opening words of ayah 71:28, "Rabbi-ghfir li" (355.40 s to 357.30 s); the clip stops before "wa li-walidayya" with a 100 ms fade | CC0 1.0 |

Cut notes:
- Adhan: 12 phrase groups in the standard order. Whisper confirms each clip says its phrase (see "Verification").
- The old salah/takbir clip (the first "Allahu akbar" of the sung adhan, cut at a 0.16 s dip) ran into the next "Allah…". It has been replaced by a spoken takbir (section B).
- Al-Fatihah: the source begins with ta'awwudh, then Bismillah, then ayahs 2 to 7.
- Al-Ikhlas and al-Kawthar: the sources open with Bismillah; that part was dropped.

## B. Salah words: Joseph Lloyd Zacker

Source: "Islamic Prayer Procedure Audio for New Muslims", Internet Archive item https://archive.org/details/salah-islamic-prayer-translation-with-audio (file Islamic-Salat-Procedure.mp3, 18 min 44 s, uploaded 27 July 2025). Creator: Joseph Lloyd Zacker. Licence: CC BY 4.0. One adult male voice speaking the words of a whole salah at a calm pace.

| id | file | excerpt (seconds in the source) |
|---|---|---|
| salah/takbir | salah-takbir.m4a | 453.36 to 455.02 (one "Allahu akbar") |
| salah/thana | salah-thana.m4a | 334.94 to 345.10 (the spoken thana; an earlier sung version at 305 s was not used) |
| salah/ruku | salah-ruku.m4a | 607.50 to 610.70 (said once; the page repeats it) |
| salah/sami | salah-sami.m4a | 619.18 to 621.84 |
| salah/rabbana | salah-rabbana.m4a | 622.20 to 623.96 ("Rabbana laka-l-hamd"; the screen text now uses the same wording) |
| salah/sujud | salah-sujud.m4a | 626.90 to 629.50 (said once) |
| salah/tashahhud | salah-tashahhud.m4a | 659.34 to 679.50 (the tashahhud of Ibn Mas'ud, up to "'abduhu wa rasuluh") |

Attribution line: "Salah words spoken by Joseph Lloyd Zacker (Internet Archive), CC BY 4.0, excerpted and loudness-normalised."

Provenance note for the owner: the item is self-published by the creator under CC BY 4.0, and its description calls it "a recording". It is an edited production (some phrases are pasted more than once). The voice could not be independently confirmed as the uploader's own. Its salam was not used, because it sounds cut short at the start (about 1 s long).

## C. Other voices

| id | file | voice | source | licence |
|---|---|---|---|---|
| wudu/bismillah | wudu-bismillah.m4a | Rashed Aljahdali (Lingua Libre, spoken "بسم الله"); 0.16 s to 1.02 s, the whole word | https://commons.wikimedia.org/wiki/File:LL-Q13955_(ara)-Rashed_Aljahdali-%D8%A8%D8%B3%D9%85_%D8%A7%D9%84%D9%84%D9%87.wav | CC BY 4.0 |
| salah/amin | salah-amin.m4a | Fenakhay (Lingua Libre, spoken word) | https://commons.wikimedia.org/wiki/File:LL-Q13955_(ara)-Fenakhay-%D8%A2%D9%85%D9%8A%D9%86.wav | CC BY-SA 4.0 |
| salah/salam | salah-salam.m4a | The imam, live, at the end of a Ramadan night prayer in Accra (recorded by daSupremo) | https://commons.wikimedia.org/wiki/File:Witr_1.wav : the first salam, 450.42 s to 453.52 s | CC BY-SA 4.0 |
| adhan/fajr1, adhan/fajr2 | adhan-fajr1.m4a, adhan-fajr2.m4a | Muezzin of a Fajr adhan in Ramadan, recorded outdoors by daSupremo (a different voice from Aaqib Azeez) | https://commons.wikimedia.org/wiki/File:Athan_during_Ramadan_2.wav : 56.82 s to 63.70 s and 64.16 s to 70.94 s | CC BY-SA 4.0 |
| salah/qunut-shafi-1, 2, 3 | salah-qunut-shafi-1..3.m4a | Reciter uploaded by PeaceSeekers ("Recitation of Qunut") | https://commons.wikimedia.org/wiki/File:Doa_Qunut.ogg : 0.30 to 6.18, 6.48 to 12.32 and 12.70 to 18.34 s (up to "tabarakta rabbana wa ta'alayt"; the rest of the recording, "fa-laka-l-hamdu…" and the salawat, was not used) | CC0 1.0 |

Attribution lines: "Salam and Fajr phrase recorded by daSupremo (Wikimedia Commons), CC BY-SA 4.0"; "Bismillah spoken by Rashed Aljahdali (Lingua Libre), CC BY 4.0"; "Qunut uploaded by PeaceSeekers (Wikimedia Commons), CC0".

## C2. Supplied by the owner (licence not stated: NEEDS OWNER OK)

These sources were supplied by the owner. The sites do not state a licence, so the owner must confirm reuse permission before release.

| id | file | source | excerpt and changes |
|---|---|---|---|
| resp/hawqala | resp-hawqala.m4a | https://islamfatwa.net/images/dua/Hisnul-Muslim-015_02-Adhan.mp3 (text page https://islamfatwa.net/gottesdienste-ibadah/108-gedenken-dhikr-bittgebet-dua/183-hisnul-muslim/1197-15-a-kar-zum-adhan) | The 4.9 s track holds only the Arabic hawqala; kept 0.10 s to 4.12 s. The du'a after the adhan is a separate track of the same series (see resp/dua-adhan). |
| wudu/shahada-after | wudu-shahada-after.m4a | https://islamtics.com/api/duas/n13.mp3 (text https://islamtics.com/dua-after-wudu/; the file's tag names Kalamullah.Com) | The whole recitation, 0.12 s to 8.30 s (the end keeps the natural room tail). It is the Sahih Muslim 234 wording with "wahdahu la sharika lah" and has no Tirmidhi addition, so it already matches pray/wudu-text.js. |
| salah/salawat-ibrahimiyya, resp/salawat | salah-salawat-ibrahimiyya.m4a (one file, both ids) | https://islamfatwa.net/images/Hisnul-Muslim-023_01-Nach_Taschahud.mp3 (text page https://islamfatwa.net/gottesdienste-ibadah/108-gedenken-dhikr-bittgebet-dua/183-hisnul-muslim/2617-023-das-lob-auf-den-gesandten-sly-allh-lyh-wslm-nach-dem-taschahud) | The whole recitation, 0.16 s to 26.0 s: exactly the Sahih al-Bukhari 3370 wording, with "innaka Hamidun Majid" twice, no "fi-l-'alamin" and no "sayyidina". It replaces the earlier Ahmad Naji clip (Muslim 405 wording), which was removed. |
| resp/dua-adhan | resp-dua-adhan.m4a | https://islamfatwa.net/images/dua/Hisnul-Muslim-015_04-Adhan.mp3 (same text page as the hawqala) | 0.40 s to 13.15 s: the Sahih al-Bukhari 614 wording up to "alladhi wa'adtah". The track then adds "innaka la tukhlifu-l-mi'ad" after a clear 0.6 s pause (12.80 s to 13.43 s); the clip stops in that pause, with a 200 ms fade. No "sayyidana", no "wa-d-darajata-r-rafi'ah". |
| salah/qunut-hanafi-1, 2, 3, 4 | salah-qunut-hanafi-1..4.m4a | https://www.nooresunnat.com/Audio/Zikr/Dua%20e%20Qunoot%20-%20Allahumma%20Inna%20Nastaeenuka%20-%20Urdu%20&%20English%20Translation.mp3 (player page https://www.nooresunnat.com/Audios/dua-e-qunoot-audio-allahumma-inna-nastaeenuka-urdu-english-translation) | Only the Arabic recitation (0 s to 29.6 s of the 1 min 52 s track) was used; the Urdu (30 s to 68 s) and English (69 s to 112 s) translations were left out. Split at the reciter's pauses: 0.26 to 6.50, 6.84 to 15.22, 15.54 to 22.56 and 22.82 to 29.55 s (each end keeps the released final consonant). Line 2 says "al-khayra kullah"; the screen text was updated to match. |
| (not used) | | https://theblessednights.com/wp-content/uploads/2023/08/dua-e-qunoot-full-audio-mp3.mp3 | The first source the owner supplied: the file the site serves (93 s) is digital silence throughout (peak -91 dB). |

Processing is the same as for the other clips (whisper check, -16 LUFS, mono AAC 44 kbps).

## D. Not filled

Every id the pages request now has a clip. RECORD-ME.md lists optional re-records (one voice, clear licences).

## E. Sources looked at and not used

- EveryAyah.com, Quran.com and quranicaudio.com: no reuse terms, or personal non-commercial use only. Need permission.
- Internet Archive items whose licence label does not show that the uploader owns the recording: "MakkahAzan-ramadan", the HaramainRecordings Fajr adhans and Eid takbirs (broadcasts), "Dua-istiftaah-AJ", "HowToPray-aj", "MyPrayer" and "PrayAsYouHaveSeenMePray_868" (a commercial DVD), the "What to say upon completing ablution" / "upon hearing the Athan" series by ahmadanter86 (re-uploads labelled Public Domain Mark), and the "Dhikr Al-Huda" items (famous reciters relabelled CC BY by an app).
- "Islamic Prayer Walkthrough for Reverts" (same creator as section B): CC BY-NC-ND 4.0, so cutting is not allowed.
- Wikimedia Commons "الصلاة الإبراهيمية.mp3" (Ahmad Naji, CC BY-SA 4.0): Sahih Muslim 405 wording ("fi-l-'alamin", one "innaka hamidun majid"), not the Bukhari 3370 wording on screen. Used earlier, now removed.
- Wikimedia Commons "Azan.ogg" (Andrewler, CC BY-SA 4.0): its du'a after the adhan says "sayyidana" in one breath with "Muhammadan". Not used.
- Wikimedia Commons "Asr prayer.wav" (daSupremo, CC BY-SA 4.0): the imam's voice is muffled (little above 1.2 kHz); used only as a fallback, not shipped.
- Wikimedia Commons "Al Qunut 2.wav" (daSupremo): has only the second half of the Hanafi qunut, sung, with "'adhabaka-l-jidd". Not used.
- Wikimedia Commons "Eid al-Fitr Fajr azan at Malmö Mosque" (CC BY 3.0): its Fajr phrase is about 12 s long in a very different style. Not used.
- Wikimedia Commons "Adhan.ogg", "Beautiful adhan.ogg", "Adhan wiki.oga", "Allahuakbar.opus", "Ar-eg-الله أكبر.oga": no Fajr phrase, or a single spoken word, not needed.
- Lingua Libre (13,807 Arabic recordings listed) has no prayer phrases except "آمين", "بسم الله الرحمن الرحيم" and "بسم الله". Wiktionary audio adds nothing further.

## Verification

Every clip in index.json was transcribed with whisper.cpp (ggml-medium, language ar) and compared with the expected Arabic, with diacritics and letter forms normalised. All clips say the expected words. Whisper's small misspellings come from recitation style or a distant microphone. Points to listen for:
- adhan/fajr1, fajr2: outdoor loudspeaker sound; whisper hears "as-salatu khayr… an-nawm" but blurs "min".
- resp/salawat and salah/salawat-ibrahimiyya: Bukhari 3370 wording, both "innaka Hamidun Majid" heard, similarity 1.00.

## Teacher review

Every clip (Arabic wording, phrase boundaries, recitation style) needs a qualified teacher to listen and sign off. In particular:
- salah/rabbana and its screen text are "Rabbana laka-l-hamd" (Sahih al-Bukhari 789); "wa laka" is also authentic.
- The salawat (screen and clip) is the Sahih al-Bukhari 3370 wording that children are taught.
- salah/jalsa is cut from Qur'an 71:28 (a recitation, not a spoken du'a).
- The salah words come from three voices: Zacker (most words), the Accra imam (salam) and Aaqib Azeez (jalsa, Qur'an).
- salah/amin is a spoken word, not a prayer "amin".
