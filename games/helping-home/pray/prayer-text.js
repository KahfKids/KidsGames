/* Helping Home: every religious string used by the adhan and salah stations, in one place.
   // TEACHER REVIEW: all Arabic, transliteration, meanings and the English position hints in this file must be
   // checked and signed off by a qualified teacher before release. Nothing here ships on the builder's word alone.

   Each text: { ar: Arabic with full vowels, tr: transliteration, en: meaning in plain English for children,
                audio: id in audio/index.json (played with HHVoice), ms: pause used when the clip is missing,
                repeat: how many times it is said (the clip is played that many times) }
   Wording follows the common, well-known forms shared by the four madhhabs. Sources noted per item. */
(function () {
  'use strict';

  // ---------- 1. The adhan (TEACHER REVIEW) ----------
  // The same for all five prayers. Fajr adds "as-salatu khayrun min an-nawm" twice after the second
  // "hayya 'ala-l-falah". Each recorded phrase is one clip. takbir1, takbir2 and takbir3 are each the pair
  // "Allahu akbar, Allahu akbar".
  var T = {
    takbir:  { ar: 'اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ', tr: 'Allahu akbar, Allahu akbar', en: 'Allah is the Greatest, Allah is the Greatest.' },
    shahada: { ar: 'أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ', tr: 'Ash-hadu an la ilaha illa-llah', en: 'I bear witness that there is no god but Allah.' },
    risala:  { ar: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللَّهِ', tr: 'Ash-hadu anna Muhammadan rasulu-llah', en: 'I bear witness that Muhammad is the Messenger of Allah.' },
    salah:   { ar: 'حَيَّ عَلَى الصَّلَاةِ', tr: "Hayya 'ala-s-salah", en: 'Come to the prayer.' },
    falah:   { ar: 'حَيَّ عَلَى الْفَلَاحِ', tr: "Hayya 'ala-l-falah", en: 'Come to success.' },
    fajr:    { ar: 'الصَّلَاةُ خَيْرٌ مِنَ النَّوْمِ', tr: 'As-salatu khayrun mina-n-nawm', en: 'Prayer is better than sleep.' },
    tahlil:  { ar: 'لَا إِلَٰهَ إِلَّا اللَّهُ', tr: 'La ilaha illa-llah', en: 'There is no god but Allah.' },
  };
  // The reply to each phrase (Sahih Muslim 385): say what the caller says, except at the two "hayya 'ala"
  // phrases, where the reply is "la hawla wa la quwwata illa billah". For the Fajr phrase the common reply is to
  // repeat it (TEACHER REVIEW: some teach "sadaqta wa bararta"; that report is weak, so it is not used).
  var HAWQALA = { ar: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', tr: 'La hawla wa la quwwata illa billah',
                  en: 'There is no power and no strength except with Allah.', audio: 'resp/hawqala', ms: 3200 };
  function ph(id, key, fajrOnly, reply) {
    return { id: id, key: key, fajrOnly: !!fajrOnly, text: Object.assign({ audio: 'adhan/' + id, ms: 3600 }, T[key]),
             reply: reply === 'hawqala' ? HAWQALA : Object.assign({ audio: null, ms: 2600, repeat: true }, T[key]) };
  }
  var ADHAN = [
    ph('takbir1', 'takbir'), ph('takbir2', 'takbir'),
    ph('shahada1', 'shahada'), ph('shahada2', 'shahada'),
    ph('risala1', 'risala'), ph('risala2', 'risala'),
    ph('salah1', 'salah', false, 'hawqala'), ph('salah2', 'salah', false, 'hawqala'),
    ph('falah1', 'falah', false, 'hawqala'), ph('falah2', 'falah', false, 'hawqala'),
    ph('fajr1', 'fajr', true), ph('fajr2', 'fajr', true),
    ph('takbir3', 'takbir'), ph('tahlil', 'tahlil'),
  ];
  // After the adhan (Sahih Muslim 384: send salawat on the Prophet; Sahih al-Bukhari 614: the du'a).
  // The salawat is as-salat al-Ibrahimiyyah (the same words as in the tashahhud, defined below), matching the
  // recorded clip resp/salawat. TEACHER REVIEW: or the short form "Allahumma salli 'ala Muhammad"?
  var AFTER = {
    salawat: null,
    dua: { ar: 'اللَّهُمَّ رَبَّ هَٰذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ',
           tr: "Allahumma rabba hadhihi-d-da'wati-t-tammah, wa-s-salati-l-qa'imah, ati Muhammadan al-wasilata wa-l-fadilah, wab'ath-hu maqaman mahmudan alladhi wa'adtah",
           en: 'O Allah, Lord of this perfect call and of the prayer about to begin, give Muhammad al-Wasilah and the highest honour, and raise him to the praised place You promised him.',
           audio: 'resp/dua-adhan', ms: 7000 },
  };

  // ---------- 2. Salah (TEACHER REVIEW) ----------
  var S = {
    takbir:  { ar: 'اللَّهُ أَكْبَرُ', tr: 'Allahu akbar', en: 'Allah is the Greatest.', audio: 'salah/takbir', ms: 1400 },
    thana:   { ar: 'سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، وَتَبَارَكَ اسْمُكَ، وَتَعَالَىٰ جَدُّكَ، وَلَا إِلَٰهَ غَيْرُكَ',
               tr: "Subhanaka-llahumma wa bihamdika, wa tabaraka-smuka, wa ta'ala jadduka, wa la ilaha ghayruk",
               en: 'Glory be to You, O Allah, and all praise is Yours. Blessed is Your name, high is Your majesty, and there is no god but You.',
               audio: 'salah/thana', ms: 5200 },
    taawwudh:{ ar: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ', tr: "A'udhu billahi mina-sh-shaytani-r-rajim",
               en: 'I seek safety with Allah from Shaytan, the rejected one.', audio: 'salah/taawwudh', ms: 3000 },
    amin:    { ar: 'آمِين', tr: 'Amin', en: 'O Allah, answer our prayer.', audio: 'salah/amin', ms: 1400 },
    ruku:    { ar: 'سُبْحَانَ رَبِّيَ الْعَظِيمِ', tr: "Subhana rabbiya-l-'adhim", en: 'Glory be to my Lord, the Most Great.', audio: 'salah/ruku', ms: 2200, repeat: 3 },
    sami:    { ar: 'سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ', tr: "Sami'a-llahu liman hamidah", en: 'Allah hears the one who praises Him.', audio: 'salah/sami', ms: 2200 },
    rabbana: { ar: 'رَبَّنَا وَلَكَ الْحَمْدُ', tr: 'Rabbana wa laka-l-hamd', en: 'Our Lord, all praise is Yours.', audio: 'salah/rabbana', ms: 2000 },
    sujud:   { ar: 'سُبْحَانَ رَبِّيَ الْأَعْلَىٰ', tr: "Subhana rabbiya-l-a'la", en: 'Glory be to my Lord, the Most High.', audio: 'salah/sujud', ms: 2200, repeat: 3 },
    // Abu Dawud 874: "rabbi-ghfir li, rabbi-ghfir li" (said twice). TEACHER REVIEW: once or twice?
    jalsa:   { ar: 'رَبِّ اغْفِرْ لِي', tr: 'Rabbi-ghfir li', en: 'My Lord, forgive me.', audio: 'salah/jalsa', ms: 1800, repeat: 2 },
    // The tashahhud of Ibn Mas'ud (Sahih al-Bukhari 831, Sahih Muslim 402)
    tashahhud: { ar: 'التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَىٰ عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',
                 tr: "At-tahiyyatu lillahi wa-s-salawatu wa-t-tayyibat. As-salamu 'alayka ayyuha-n-nabiyyu wa rahmatu-llahi wa barakatuh. As-salamu 'alayna wa 'ala 'ibadi-llahi-s-salihin. Ash-hadu an la ilaha illa-llah, wa ash-hadu anna Muhammadan 'abduhu wa rasuluh",
                 en: 'All greetings, prayers and good words are for Allah. Peace be on you, O Prophet, and the mercy of Allah and His blessings. Peace be on us and on the good servants of Allah. I bear witness that there is no god but Allah, and I bear witness that Muhammad is His servant and Messenger.',
                 audio: 'salah/tashahhud', ms: 9000 },
    // As-salat al-Ibrahimiyyah (Sahih al-Bukhari 3370)
    ibrahimiyya: { ar: 'اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ',
                   tr: "Allahumma salli 'ala Muhammadin wa 'ala ali Muhammad, kama sallayta 'ala Ibrahima wa 'ala ali Ibrahim, innaka Hamidun Majid. Allahumma barik 'ala Muhammadin wa 'ala ali Muhammad, kama barakta 'ala Ibrahima wa 'ala ali Ibrahim, innaka Hamidun Majid",
                   en: 'O Allah, send Your blessings on Muhammad and the family of Muhammad, as You sent blessings on Ibrahim and the family of Ibrahim. You are the Praised, the Glorious. O Allah, bless Muhammad and the family of Muhammad, as You blessed Ibrahim and the family of Ibrahim. You are the Praised, the Glorious.',
                   audio: 'salah/salawat-ibrahimiyya', ms: 10000 },
    salam:   { ar: 'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ', tr: "As-salamu 'alaykum wa rahmatu-llah", en: 'Peace be on you, and the mercy of Allah.', audio: 'salah/salam', ms: 2600 },
  };
  // Surat al-Fatihah (1:1-7, Hafs numbering: the basmalah is ayah 1)
  var FATIHA = [
    ['بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', 'Bismi-llahi-r-rahmani-r-rahim', 'In the name of Allah, the Most Merciful, the Most Kind.'],
    ['الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', "Al-hamdu lillahi rabbi-l-'alamin", 'All praise is for Allah, Lord of all the worlds,'],
    ['الرَّحْمَٰنِ الرَّحِيمِ', 'Ar-rahmani-r-rahim', 'the Most Merciful, the Most Kind,'],
    ['مَالِكِ يَوْمِ الدِّينِ', 'Maliki yawmi-d-din', 'Master of the Day of Judgement.'],
    ['إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', "Iyyaka na'budu wa iyyaka nasta'in", 'You alone we worship, and You alone we ask for help.'],
    ['اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ', 'Ihdina-s-sirata-l-mustaqim', 'Guide us on the straight path,'],
    ['صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ', "Sirata-lladhina an'amta 'alayhim, ghayri-l-maghdubi 'alayhim wa la-d-dallin",
     'the path of those You have blessed, not of those who earned Your anger, nor of those who went astray.'],
  ].map(function (a, i) { return { ar: a[0], tr: a[1], en: a[2], audio: 'salah/fatiha-' + (i + 1), ms: 2600, ayah: i + 1, surah: 'Al-Fatihah' }; });
  // Surat al-Kawthar (108) in the first rak'ah and Surat al-Ikhlas (112) in the second: in the Qur'an's order.
  var KAWTHAR = [
    ['إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ', "Inna a'taynaka-l-kawthar", 'We have given you al-Kawthar, so much good.'],
    ['فَصَلِّ لِرَبِّكَ وَانْحَرْ', 'Fa-salli li-rabbika wa-nhar', 'So pray to your Lord and sacrifice for Him.'],
    ['إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ', "Inna shani'aka huwa-l-abtar", 'Truly, the one who hates you is the one cut off.'],
  ].map(function (a, i) { return { ar: a[0], tr: a[1], en: a[2], audio: 'salah/kawthar-' + (i + 1), ms: 2400, ayah: i + 1, surah: 'Al-Kawthar' }; });
  var IKHLAS = [
    ['قُلْ هُوَ اللَّهُ أَحَدٌ', 'Qul huwa-llahu ahad', 'Say: He is Allah, the One.'],
    ['اللَّهُ الصَّمَدُ', 'Allahu-s-samad', 'Allah, whom everyone needs, and who needs no one.'],
    ['لَمْ يَلِدْ وَلَمْ يُولَدْ', 'Lam yalid wa lam yulad', 'He has no child, and He was not born.'],
    ['وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ', 'Wa lam yakun lahu kufuwan ahad', 'And there is no one like Him.'],
  ].map(function (a, i) { return { ar: a[0], tr: a[1], en: a[2], audio: 'salah/ikhlas-' + (i + 1), ms: 2200, ayah: i + 1, surah: 'Al-Ikhlas' }; });

  // What the child does in each position (English, read by a grown-up or shown under the picture).
  // TEACHER REVIEW: kept to what all four madhhabs share; hand placement while standing is not taught as a rule.
  var HOW = {
    intention: { title: 'Make your intention', hint: 'In your heart, not out loud: I am praying {prayer} for Allah.' },
    takbir:  { title: 'Allahu akbar', hint: 'Stand facing the qibla. Raise your hands up to your ears.' },
    stand:   { title: 'Stand', hint: 'Stand still and look at the place where your head will go down.' },
    standUp: { title: 'Stand up', hint: 'Stand up for the next rak’ah.' },
    ruku:    { title: 'Bow (ruku’)', hint: 'Bend forward with your back flat and your hands on your knees.' },
    rise:    { title: 'Stand up straight', hint: 'Come back up from the bow and stand still.' },
    sujud:   { title: 'Go down (sujood)', hint: 'Seven parts touch the ground: forehead with nose, two hands, two knees and the toes of both feet.' },
    jalsa:   { title: 'Sit up', hint: 'Sit up between the two sujood, hands resting on your thighs.' },
    tash:    { title: 'Sit for the tashahhud', hint: 'Sit and point your right finger when you say the shahadah.' },
    salamR:  { title: 'Salam to the right', hint: 'Turn your head to the right.' },
    salamL:  { title: 'Salam to the left', hint: 'Turn your head to the left.' },
  };

  AFTER.salawat = Object.assign({}, S.ibrahimiyya, { audio: 'resp/salawat' });

  window.PRAYER_TEXT = {
    ADHAN: ADHAN, HAWQALA: HAWQALA, AFTER: AFTER, S: S, FATIHA: FATIHA, KAWTHAR: KAWTHAR, IKHLAS: IKHLAS, HOW: HOW,
    RAKAH: { fajr: 2, dhuhr: 4, asr: 4, maghrib: 3, isha: 4, tahajjud: 2 },   // tahajjud: prayed in twos; the guide shows one pair
    NAMES: { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha', tahajjud: 'Tahajjud' },
  };
})();
