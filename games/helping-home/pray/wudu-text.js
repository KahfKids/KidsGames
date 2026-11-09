/* Helping Home: Wudu station, every religious string in one place.
   // TEACHER REVIEW: everything in this file needs a qualified teacher's sign-off before release:
   //   the order of the steps, the counts, the English instructions, the Arabic, the transliteration and the meanings.
   Notes for the reviewer:
   - Order: the common Sunnah order shared by the four madhhabs (intention, Bismillah, hands, mouth, nose, face,
     right arm then left arm to the elbows, wipe the head, ears, right foot then left foot to the ankles, du'a).
   - Counts: three times for each washed part; the head and the ears are wiped once (the Shafi'i school also
     teaches three wipes of the head as Sunnah; we show once).
   - The intention is in the heart and is not said aloud, so it has no Arabic. Only Bismillah and the du'a after
     wudu are spoken, so only they show Arabic, transliteration and meaning.
   - Du'a after wudu: the wording in Sahih Muslim 234. At-Tirmidhi 55 adds "Allahumma j'alni mina-t-tawwabin
     wa-j'alni mina-l-mutatahhirin"; it is in `shahadaExtra`, switched off (show: false) until you decide.
   - Water: the Prophet (peace be upon him) made wudu with about one mudd of water (Sahih al-Bukhari 201,
     Sahih Muslim 325). The well-known "even at a flowing river" narration (Ibn Majah 425) has a weak chain, so
     the game says it as gentle advice and does not quote it as a hadith.
   Voice ids (audio/index.json): `voice` is the spoken English instruction, `arabicVoice` the recited words.
   A missing clip is fine: the page shows the text, reads the English with the device voice if it has one, and waits.
   Arabic is never read by a device voice. */
// TEACHER REVIEW
window.WUDU_TEXT = {
  // one entry per screen; `line` is the one instruction line shown under the demo (with the step's icon);
  // `once`: wiped once (one tap to count); {R:RIGHT} and {L:LEFT} are shown in the colours of the R and L badges
  // in the pictures. TEACHER REVIEW: the right-before-left order, the ankles and elbows included, the left little
  // finger between the toes (from the little toe of the right foot), the ears wiped with the head's water; `n` is the step number the child sees (the arms and the feet have a right then a left screen)
  // area: the parts of the body map that glow; count: how many times (0 = no counting); water: the tap is used
  steps: [
    { id: 'intention', line: 'Make the intention in your heart, then say:',
      n: 1, icon: 'heart', short: 'Intention',
      title: 'Intention, then Bismillah',
      detail: 'In your heart: “I am making wudu for Allah.” Then say Bismillah.',
      speak: 'Make the intention in your heart. Then say Bismillah.',
      count: 0, area: ['heart'], water: false, arabic: 'bismillah', voice: 'wudu/intention', arabicVoice: 'wudu/bismillah' },
    { id: 'hands', line: 'Wash your hands to the wrists, fingers in between. 3 times.',
      n: 2, icon: 'hands', short: 'Hands',
      title: 'Wash your hands',
      detail: 'Up to the wrists, three times. Rub between your fingers.',
      speak: 'Wash your hands up to the wrists, three times. Rub between your fingers.',
      count: 3, area: ['handR', 'handL'], water: true, voice: 'wudu/hands' },
    { id: 'mouth', line: 'Water in your {R:RIGHT} hand. Rinse your mouth. 3 times.',
      n: 3, icon: 'mouth', short: 'Mouth',
      title: 'Rinse your mouth',
      detail: 'Water in your right hand. Swish it round, then spit it out. Three times.',
      speak: 'Take water in your right hand. Rinse your mouth three times. Swish it round, then spit it out.',
      count: 3, area: ['mouth'], water: true, voice: 'wudu/mouth' },
    { id: 'nose', line: 'Sniff water from your {R:RIGHT} hand. Blow out with your {L:LEFT}. 3 times.',
      n: 4, icon: 'nose', short: 'Nose',
      title: 'Clean your nose',
      detail: 'Sniff a little water in with your right hand, blow it out with your left. Three times.',
      speak: 'Sniff a little water into your nose from your right hand, then blow it out with your left hand. Three times.',
      count: 3, area: ['nose'], water: true, voice: 'wudu/nose' },
    { id: 'face', line: 'Wash your face, hairline to chin, ear to ear. 3 times.',
      n: 5, icon: 'face', short: 'Face',
      title: 'Wash your face',
      detail: 'From your forehead to your chin, and from ear to ear. Three times.',
      speak: 'Wash your face, from your forehead to your chin, and from ear to ear. Three times.',
      count: 3, area: ['face'], water: true, voice: 'wudu/face' },
    { id: 'armR', line: '{R:RIGHT} arm first, up to and over the elbow. 3 times.',
      n: 6, icon: 'armR', short: 'Right arm',
      title: 'Wash your right arm',
      detail: 'From your fingers up to the elbow, and the elbow too. Three times.',
      speak: 'Right arm first. Wash it from the fingertips up to the elbow, and the elbow too. Three times.',
      count: 3, area: ['armR'], water: true, voice: 'wudu/arm-right' },
    { id: 'armL', line: 'Then the {L:LEFT} arm, up to and over the elbow. 3 times.',
      n: 6, icon: 'armL', short: 'Left arm',
      title: 'Now your left arm',
      detail: 'From your fingers up to the elbow, and the elbow too. Three times.',
      speak: 'Then the left arm, from the fingertips up to the elbow. Three times.',
      count: 3, area: ['armL'], water: true, voice: 'wudu/arm-left' },
    { id: 'head', line: 'Wet hands: front of the head to the neck, and back. Once.',
      n: 7, icon: 'head', short: 'Head',
      title: 'Wipe your head',
      detail: 'With wet hands, from the front to the back, and back to the front. Once.',
      speak: 'With wet hands, wipe your head from the front to the back of your neck, and back again. Once.',
      count: 0, once: true, area: ['head'], water: false, voice: 'wudu/head' },
    { id: 'ears', line: 'Same wet hands: fingers in the ears, thumbs behind. Once.',
      n: 8, icon: 'ears', short: 'Ears',
      title: 'Wipe your ears',
      detail: 'Pointing fingers inside your ears, thumbs behind them. Once.',
      speak: 'With the same wet hands, wipe your ears. Pointing fingers inside, thumbs behind. Once.',
      count: 0, once: true, area: ['ears'], water: false, voice: 'wudu/ears' },
    { id: 'footR', line: '{R:RIGHT} foot first, over the ankles. {L:LEFT} little finger between toes. 3 times.',
      n: 9, icon: 'footR', short: 'Right foot',
      title: 'Wash your right foot',
      detail: 'Up to the ankle, and the ankle too. Three times. Clean between your toes with your little finger.',
      speak: 'Right foot first. Wash it up to the ankles, three times. Clean between your toes with your left little finger.',
      count: 3, area: ['footR'], water: true, voice: 'wudu/foot-right' },
    { id: 'footL', line: 'Then the {L:LEFT} foot, over the ankles. 3 times.',
      n: 9, icon: 'footL', short: 'Left foot',
      title: 'Now your left foot',
      detail: 'Up to the ankle, and the ankle too. Three times. Clean between your toes.',
      speak: 'Then the left foot, up to the ankles, three times.',
      count: 3, area: ['footL'], water: true, voice: 'wudu/foot-left' },
    { id: 'dua', line: 'Your wudu is done. Now say:',
      n: 10, icon: 'dua', short: "Du'a",
      title: "The du'a after wudu",
      detail: 'Say the shahadah.',
      speak: 'Your wudu is done. Now say the shahadah.',
      count: 0, area: ['all'], water: false, arabic: 'shahada', voice: 'wudu/dua', arabicVoice: 'wudu/shahada-after' },
  ],

  // the "Say:" card: shown only on the steps where something is said aloud
  say: 'Say',

  // the spoken parts: Arabic, transliteration, meaning
  bismillah: {
    ar: 'بِسْمِ اللَّهِ',
    tr: 'Bismillāh',
    en: 'In the name of Allah',
  },
  shahada: {
    ar: 'أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',
    tr: 'Ash-hadu an lā ilāha illallāhu waḥdahu lā sharīka lah, wa ash-hadu anna Muḥammadan ʿabduhu wa rasūluh.',
    en: 'I bear witness that there is no god but Allah alone, with no partner, and I bear witness that Muhammad is His servant and His Messenger.',
    src: 'Sahih Muslim 234',
  },
  shahadaExtra: {
    show: false,
    ar: 'اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ، وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ',
    tr: 'Allāhumma-jʿalnī mina-t-tawwābīn, wa-jʿalnī mina-l-mutaṭahhirīn.',
    en: 'O Allah, make me one of those who turn back to You often, and make me one of those who keep themselves pure.',
    src: 'At-Tirmidhi 55',
  },

  // practice mode prompts and gentle hints (never "wrong", never a fail)
  practice: {
    ask: 'What comes next? Tap it.',
    first: 'Wudu starts in the heart. Tap the heart.',
    notYet: 'Not yet. First, {next}.',
    again: 'Already washed. What comes after it?',
    show: 'Look, it glows: {next}.',
  },

  // water: turning the tap off between steps
  water: {
    turnOn: 'Turn the tap on',
    turnOff: 'Turn the tap off to save water',
    leaf: 'You saved water! A new leaf.',
    lesson: 'Use only a little water, even at a river.',
    sunnah: 'The Prophet ﷺ used only a little water for wudu.',
  },

  finish: {
    title: 'Your wudu is done',
    calm: 'You are clean and ready to pray.',
    purity: 'Purity is half of faith.',   // Sahih Muslim 223
    again: 'Again',
    pray: 'Go and pray',
  },
};
