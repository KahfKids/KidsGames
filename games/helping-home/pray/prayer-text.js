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
  // The salawat is as-salat al-Ibrahimiyyah (the same words as in the tashahhud, Sahih al-Bukhari 3370, defined below).
  // TEACHER REVIEW: or the short form "Allahumma salli 'ala Muhammad"?
  // The du'a has no clip yet (resp/dua-adhan: the only free recording adds "sayyidana"), so it is paced by ms.
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
    // TEACHER REVIEW: "Rabbana laka-l-hamd" (Sahih al-Bukhari 789, Abu Hurayrah), the wording in the recorded clip.
    // "Rabbana wa laka-l-hamd" (with "wa") is also authentic (Sahih al-Bukhari, the hadith of Anas); the text follows
    // the clip. Teacher: please confirm the hadith numbers.
    rabbana: { ar: 'رَبَّنَا لَكَ الْحَمْدُ', tr: 'Rabbana laka-l-hamd', en: 'Our Lord, to You belongs all praise.', audio: 'salah/rabbana', ms: 2000 },
    sujud:   { ar: 'سُبْحَانَ رَبِّيَ الْأَعْلَىٰ', tr: "Subhana rabbiya-l-a'la", en: 'Glory be to my Lord, the Most High.', audio: 'salah/sujud', ms: 2200, repeat: 3 },
    // Abu Dawud 874: "rabbi-ghfir li, rabbi-ghfir li" (said twice). TEACHER REVIEW: once or twice?
    jalsa:   { ar: 'رَبِّ اغْفِرْ لِي', tr: 'Rabbi-ghfir li', en: 'My Lord, forgive me.', audio: 'salah/jalsa', ms: 1800, repeat: 2 },
    // The tashahhud of Ibn Mas'ud (Sahih al-Bukhari 831, Sahih Muslim 402)
    tashahhud: { ar: 'التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَىٰ عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',
                 tr: "At-tahiyyatu lillahi wa-s-salawatu wa-t-tayyibat. As-salamu 'alayka ayyuha-n-nabiyyu wa rahmatu-llahi wa barakatuh. As-salamu 'alayna wa 'ala 'ibadi-llahi-s-salihin. Ash-hadu an la ilaha illa-llah, wa ash-hadu anna Muhammadan 'abduhu wa rasuluh",
                 en: 'All greetings, prayers and good words are for Allah. Peace be on you, O Prophet, and the mercy of Allah and His blessings. Peace be on us and on the good servants of Allah. I bear witness that there is no god but Allah, and I bear witness that Muhammad is His servant and Messenger.',
                 audio: 'salah/tashahhud', ms: 9000 },
    // As-salat al-Ibrahimiyyah, the common wording children are taught (Sahih al-Bukhari 3370, also 6357, the hadith
    // of Ka'b ibn 'Ujrah). Used in the last sitting and after the adhan (resp/salawat).
    // TEACHER REVIEW: Bukhari 3370 wording. The audio clip must say exactly these words (no "fi-l-'alamin", no "sayyidina").
    ibrahimiyya: { ar: 'اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ. اللَّهُمَّ بَارِكْ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ',
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

  // The one line a child sees under the moving figure: very few, very plain words (TEACHER REVIEW).
  var SHORT = { takbir: 'Hands up to your ears.', stand: 'Stand still. Hands folded.', standUp: 'Stand up. Hands folded.',
    ruku: 'Bow down. Hands on knees.', rise: 'Stand up straight.', sujud: 'Go down. Forehead on the mat.',
    jalsa: 'Sit up. Hands on your legs.', tash: 'Sit. Point your finger.', salamR: 'Turn your head right.', salamL: 'Turn your head left.',
    qtakbir: 'Hands up to your ears again.', qunutH: 'Stand still. Say the du’a.', qunutS: 'Hands up for du’a.', newPart: 'Start again. Hands up to your ears.' };

  // The witr steps (TEACHER REVIEW)
  HOW.qtakbir = { title: 'Hands up again', hint: 'Before you bow, raise your hands to your ears and say Allahu akbar. Then fold them again.' };
  HOW.qunutH  = { title: 'Du’a al-qunut', hint: 'Stand still and say the du’a of witr.' };
  HOW.qunutS  = { title: 'Du’a al-qunut', hint: 'After standing up from the bow, raise your hands like when you make du’a.' };
  HOW.newPart = { title: 'Start again', hint: 'You said salam. Now pray {rest}: make the intention, raise your hands and say Allahu akbar.' };
  Object.keys(SHORT).forEach(function (k) { if (HOW[k]) HOW[k].short = SHORT[k]; });

  // The instruction under the moving figure, by madhab and for a boy or a girl where the position differs
  // (TEACHER REVIEW). Every line says RIGHT and LEFT where it matters. { say: the big line, more: the small line }.
  //   Qiyam: Hanafi boys below the navel, Hanafi girls on the chest; Shafi'i below the chest, above the navel.
  //   Takbir: Hanafi boys thumbs by the earlobes, Hanafi girls up to the shoulders; Shafi'i hands level with the
  //   shoulders, fingertips up to the tops of the ears. Sujood: Hanafi girls keep compact.
  function line(how, madhab, girl) {
    var hb = madhab === 'hanafi', where = hb ? (girl ? 'on your chest' : 'below your navel') : 'below your chest';
    var fold = 'Right hand over left hand, ' + where + '.', foldMore = 'Your right palm on the back of your left hand and wrist.';
    var up = hb ? (girl ? 'Hands up to your shoulders.' : 'Hands up, thumbs by your earlobes.') : 'Hands up to your shoulders, fingertips by your ears.';
    var upMore = 'Palms face the qibla. Fingers together, pointing up.';
    var L = {
      takbir: { say: up, more: upMore },
      qtakbir: { say: 'Again: ' + up.charAt(0).toLowerCase() + up.slice(1), more: upMore + ' Then fold them again.' },
      newPart: { say: 'Start again. ' + up, more: upMore },
      stand: { say: fold, more: foldMore + ' Look at your sujood spot.' },
      standUp: { say: 'Stand up. ' + fold, more: foldMore },
      qunutH: { say: fold, more: 'Stand still and say the du’a of witr.' },
      ruku: { say: 'Bow. Hands on your knees, fingers spread.', more: 'Back flat and level, head in line with it. Look at your sujood spot.' },
      rise: { say: 'Stand up straight, arms down.', more: '' },
      qunutS: { say: 'Hands up in front, palms up.', more: 'Like when you make du’a.' },
      sujud: { say: 'Knees down first, then hands, then forehead.', more: 'Forehead and nose on the mat. Hands by your ears, fingers to the qibla. Toes bent.' +
        (hb && girl ? ' Keep your arms close and your body small.' : ' Elbows up, off the mat.') },
      jalsa: { say: 'Sit on your left foot. Right foot up.', more: 'Right toes bent to the qibla. Hands on your thighs, near your knees.' },
      tash: { say: 'Sit. Raise your right finger at “ash-hadu”.', more: 'Left foot under you, right foot up. The other fingers loosely closed.' },
      salamR: { say: '1. Look over your right shoulder.', more: 'Say the salam.' },
      salamL: { say: '2. Now look over your left shoulder.', more: 'Say the salam again.' },
    };
    return L[how] || { say: (HOW[how] && (HOW[how].short || HOW[how].title)) || '', more: '' };
  }

  // ---------- 3. Du'a al-qunut in witr (TEACHER REVIEW) ----------
  // Hanafi: said standing in the 3rd rak'ah of witr, after the recitation, after a takbir with raised hands, before
  // ruku'. The common wording taught in Hanafi madrasahs (from 'Umar, in Ibn Abi Shaybah's Musannaf and al-Bayhaqi's
  // as-Sunan al-Kubra 2/210). TEACHER REVIEW: this qunut wording is reported from Companions (including 'Umar), not
  // a Prophetic hadith. The four lines follow the recorded clips (salah/qunut-hanafi-1..4), which say "al-khayra
  // kullah" in line 2, as in the Hanafi books. TEACHER REVIEW: some add "wa nakhsha 'adhabaka-l-jidd"; the shorter common form is used.
  // Shafi'i (and Hanbali): after rising from ruku' in the last rak'ah, hands raised. The du'a the Prophet ﷺ taught
  // al-Hasan ibn 'Ali (Abu Dawud 1425, at-Tirmidhi 464, an-Nasa'i 1745); "wa la ya'izzu man 'adayt" is in al-Bayhaqi.
  // TEACHER REVIEW: in the Shafi'i school the qunut of witr is in the second half of Ramadan; Hanbalis say it all
  // year; Malikis don't say it in witr. The child is shown it as "if your family says it".
  // Each du'a is split into short lines so a child can follow the lit line (one recorded clip per line).
  function Q(id, rows, ms) { return rows.map(function (r, i) { return { ar: r[0], tr: r[1], en: r[2], audio: 'salah/qunut-' + id + '-' + (i + 1), ms: ms }; }); }
  var QUNUT = {
    hanafi: Q('hanafi', [
      ['اللَّهُمَّ إِنَّا نَسْتَعِينُكَ وَنَسْتَغْفِرُكَ، وَنُؤْمِنُ بِكَ وَنَتَوَكَّلُ عَلَيْكَ',
       "Allahumma inna nasta'inuka wa nastaghfiruka, wa nu'minu bika wa natawakkalu 'alayk",
       'O Allah, we ask You for help and we ask You to forgive us. We believe in You and we trust in You.'],
      ['وَنُثْنِي عَلَيْكَ الْخَيْرَ كُلَّهُ، وَنَشْكُرُكَ وَلَا نَكْفُرُكَ، وَنَخْلَعُ وَنَتْرُكُ مَنْ يَفْجُرُكَ',
       "Wa nuthni 'alayka-l-khayra kullah, wa nashkuruka wa la nakfuruk, wa nakhla'u wa natruku man yafjuruk",
       'We praise You with every good. We thank You and are not ungrateful to You, and we turn away from anyone who disobeys You.'],
      ['اللَّهُمَّ إِيَّاكَ نَعْبُدُ، وَلَكَ نُصَلِّي وَنَسْجُدُ، وَإِلَيْكَ نَسْعَىٰ وَنَحْفِدُ',
       "Allahumma iyyaka na'budu, wa laka nusalli wa nasjudu, wa ilayka nas'a wa nahfid",
       'O Allah, You alone we worship. To You we pray and bow down, and to You we hurry to serve.'],
      ['وَنَرْجُو رَحْمَتَكَ وَنَخْشَىٰ عَذَابَكَ، إِنَّ عَذَابَكَ بِالْكُفَّارِ مُلْحِقٌ',
       "Wa narju rahmataka wa nakhsha 'adhabak, inna 'adhabaka bi-l-kuffari mulhiq",
       'We hope for Your mercy and we fear Your punishment. Your punishment will reach those who reject the truth.'],
    ], 5600),
    shafi: Q('shafi', [
      ['اللَّهُمَّ اهْدِنِي فِيمَنْ هَدَيْتَ، وَعَافِنِي فِيمَنْ عَافَيْتَ، وَتَوَلَّنِي فِيمَنْ تَوَلَّيْتَ',
       "Allahumma-hdini fiman hadayt, wa 'afini fiman 'afayt, wa tawallani fiman tawallayt",
       'O Allah, guide me among those You have guided, keep me safe and well among those You have kept well, and look after me among those You look after.'],
      ['وَبَارِكْ لِي فِيمَا أَعْطَيْتَ، وَقِنِي شَرَّ مَا قَضَيْتَ، فَإِنَّكَ تَقْضِي وَلَا يُقْضَىٰ عَلَيْكَ',
       "Wa barik li fima a'tayt, wa qini sharra ma qadayt, fa-innaka taqdi wa la yuqda 'alayk",
       'Bless what You have given me, and protect me from the harm of what You have decided. You decide, and no one decides over You.'],
      ['وَإِنَّهُ لَا يَذِلُّ مَنْ وَالَيْتَ، وَلَا يَعِزُّ مَنْ عَادَيْتَ، تَبَارَكْتَ رَبَّنَا وَتَعَالَيْتَ',
       "Wa innahu la yadhillu man walayt, wa la ya'izzu man 'adayt, tabarakta rabbana wa ta'alayt",
       'No one You take care of is ever brought low, and no one You oppose is ever raised up. Blessed are You, our Lord, and Most High.'],
    ], 5600),
  };

  // ---------- 4. What to pray at each time (TEACHER REVIEW) ----------
  // The words a child sees for each kind of prayer.
  var KINDS = {
    fard:   { name: 'Fard',   say: 'Allah asks this of us' },
    sunnah: { name: 'Sunnah', say: 'The Prophet ﷺ prayed it' },
    witr:   { name: 'Witr',   say: 'The odd prayer that closes the night' },
    nafl:   { name: 'Nafl',   say: 'An extra prayer, if you like' },
    wajib:  { name: 'Wajib',  say: 'Very important: we don’t leave it' },   // Hanafi witr only
  };
  // A unit: { kind, rakah, emphasised (sunnah mu'akkadah, prayed regularly by the Prophet ﷺ), optional (shown faded),
  //   parts (rak'ah between each salam, when not one block), qunut ('hanafi'|'shafi'), wajib, choose (rak'ah the child
  //   may pick), repeat (may be prayed again: tahajjud pairs), ifNoWitr (only if witr was not prayed after Isha) }.
  // "shafi" is used for Shafi'i, Maliki and Hanbali here (the settings store 'hanafi' or 'shafi').
  // Sources:
  //   12 rak'ah of sunnah (Umm Habibah, Sahih Muslim 728; at-Tirmidhi 415 lists them: 4 before Dhuhr, 2 after,
  //     2 after Maghrib, 2 after Isha, 2 before Fajr). Ibn 'Umar's 10 (Sahih al-Bukhari 1180: 2 before Dhuhr).
  //     Hanafis follow the 4 before Dhuhr (also 'A'ishah, Sahih al-Bukhari 1182); Shafi'is and Hanbalis count the
  //     emphasised ones as 2 before Dhuhr.
  //   The 2 before Fajr: "better than the world and all it holds" (Sahih Muslim 725).
  //   4 before Asr: "May Allah have mercy on one who prays four before Asr" (Abu Dawud 1271, at-Tirmidhi 430): not
  //     emphasised. 4 before Isha: Hanafi mustahabb, not emphasised (TEACHER REVIEW).
  //   Witr: wajib and 3 rak'ah with one salam and the qunut before ruku' (Hanafi); a sunnah mu'akkadah of 1, 3 or
  //     more (Shafi'i: as 3, commonly 2 then salam then 1; Sahih al-Bukhari 990 "the night prayer is in twos, and
  //     when you fear the dawn, pray one").
  //   Tahajjud: "the night prayer is in twos" (Sahih al-Bukhari 990); "make witr the last of your night prayer"
  //     (Sahih al-Bukhari 998).
  // TEACHER REVIEW: Shafi'is may pray the optional 4 before Asr as 2 + 2 (shown so here). Hanafi non-emphasised
  // 4 rak'ah: the salawat in the middle sitting and the opening du'a again in rak'ah 3 are not taught to the child.
  function u(kind, rakah, o) { return Object.assign({ kind: kind, rakah: rakah, emphasised: kind === 'fard' || kind === 'witr' }, o || {}); }
  var S2 = u('sunnah', 2, { emphasised: true }), F = function (n) { return u('fard', n); };
  var TAHAJJUD = [u('sunnah', 2, { emphasised: false, optional: true, repeat: true, night: true }),
                  u('witr', 3, { ifNoWitr: true })];
  var UNITS = {
    hanafi: {
      fajr:    [S2, F(2)],
      dhuhr:   [u('sunnah', 4, { emphasised: true }), F(4), S2],
      asr:     [u('nafl', 4, { optional: true }), F(4)],
      maghrib: [F(3), S2],
      isha:    [u('nafl', 4, { optional: true }), F(4), S2, u('witr', 3, { wajib: true, qunut: 'hanafi' })],
      tahajjud: TAHAJJUD,
    },
    shafi: {
      fajr:    [S2, F(2)],
      dhuhr:   [S2, F(4), S2],
      asr:     [u('nafl', 4, { optional: true, parts: [2, 2] }), F(4)],
      maghrib: [F(3), S2],
      isha:    [F(4), S2, u('witr', 3, { parts: [2, 1], choose: [1, 3], qunut: 'shafi' })],
      tahajjud: TAHAJJUD,
    },
  };
  // Jumu'ah (Friday): a card, not a guide. TEACHER REVIEW
  var JUMUAH = { title: 'Jumu’ah', text: 'At the mosque, it is 2 rak’ah fard after the khutbah. At home, we pray Dhuhr.' };
  function units(madhab, prayer) {
    var m = UNITS[madhab === 'hanafi' ? 'hanafi' : 'shafi'], list = m[prayer] || [];
    // the tahajjud witr follows the madhab's own witr
    return list.map(function (x) { return x.kind === 'witr' && x.ifNoWitr ? Object.assign({}, m.isha[m.isha.length - 1], { ifNoWitr: true }) : x; });
  }

  AFTER.salawat = Object.assign({}, S.ibrahimiyya, { audio: 'resp/salawat' });

  window.PRAYER_TEXT = {
    QUNUT: QUNUT, KINDS: KINDS, UNITS: UNITS, JUMUAH: JUMUAH, units: units, line: line,
    ADHAN: ADHAN, HAWQALA: HAWQALA, AFTER: AFTER, S: S, FATIHA: FATIHA, KAWTHAR: KAWTHAR, IKHLAS: IKHLAS, HOW: HOW,
    RAKAH: { fajr: 2, dhuhr: 4, asr: 4, maghrib: 3, isha: 4, tahajjud: 2 },   // tahajjud: prayed in twos; the guide shows one pair
    NAMES: { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha', tahajjud: 'Tahajjud' },
  };
})();
