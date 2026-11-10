/* Quran Explorer: data.js — the question bank.
   Surah numbers, names, ayat counts and places of revelation come from the shared surah table
   (js/quiz/surahs.js, taken from the quran.com chapter list). Verses are cited by surah:ayah and were read in
   Saheeh International; hadith are cited by collection and number and were read before use.
   band: 1 = ages 4-6 (pictures), 2 = ages 7-9, 3 = ages 10-12. */
(function () {
  'use strict';
  var KQ = window.KahfQuiz, B = KQ.bank('qe'), S = KQ.surahs;
  var BN = '০১২৩৪৫৬৭৮৯';
  function bn(x) { return String(x).replace(/\d/g, function (d) { return BN[d]; }); }
  function N(x) { return [String(x), bn(x)]; }
  function su(n) { return S[n - 1]; }
  function nm(n) { var s = su(n); return [s[1], s[2]]; }
  function ref(n) { return 'Quran, surah ' + n; }
  var LIST = 'Surah list (quran.com)';

  // ---------- surahs named after something we can picture ----------
  // [surah, picture, English meaning, Bengali meaning]
  var NAMED = [[2, 'cow', 'The Cow', 'গাভী'], [16, 'bee', 'The Bee', 'মৌমাছি'], [18, 'cave', 'The Cave', 'গুহা'], [27, 'ant', 'The Ant', 'পিঁপড়া'],
    [29, 'spider', 'The Spider', 'মাকড়সা'], [53, 'star', 'The Star', 'তারা'], [54, 'moon', 'The Moon', 'চাঁদ'], [68, 'pen', 'The Pen', 'কলম'],
    [91, 'sun', 'The Sun', 'সূর্য'], [92, 'night', 'The Night', 'রাত'], [105, 'elephant', 'The Elephant', 'হাতি'], [89, 'dawn', 'The Dawn', 'ভোর']];
  // more meanings, without a picture
  var MEAN = NAMED.concat([[1, '', 'The Opening', 'সূচনা'], [13, '', 'The Thunder', 'বজ্র'], [17, '', 'The Night Journey', 'রাতের সফর'], [21, '', 'The Prophets', 'নবীগণ'],
    [22, '', 'The Pilgrimage', 'হজ'], [24, '', 'The Light', 'আলো'], [55, '', 'The Most Merciful', 'পরম দয়াময়'], [57, '', 'Iron', 'লোহা'], [62, '', 'Friday', 'জুমা'],
    [67, '', 'The Kingdom', 'রাজত্ব'], [95, '', 'The Fig', 'ডুমুর'], [99, '', 'The Earthquake', 'ভূমিকম্প'], [103, '', 'Time', 'সময়'], [110, '', 'The Help', 'সাহায্য'],
    [112, '', 'Sincerity', 'একনিষ্ঠতা'], [114, '', 'Mankind', 'মানুষ']]);

  // ================= band 1: ages 4-6 =================
  B.facts(1, NAMED, { kind: 'pic', n: 2, q: function (r) { return [su(r[0])[1] + ' is named after…', su(r[0])[2] + ' সূরার নাম কিসের নামে?']; }, a: function (r) { return [r[2], r[3], r[1]]; },
    why: function (r) { return [su(r[0])[1] + ' means ' + r[2] + '.', su(r[0])[2] + ' মানে ' + r[3] + '।']; }, ref: function (r) { return ref(r[0]); } });
  B.c(1, ['Which is the book of Allah?', 'আল্লাহর কিতাব কোনটি?'], [['The Quran', 'কুরআন', 'quran'], ['A ball', 'বল', 'ball'], ['A kite', 'ঘুড়ি', 'kite']], ['The Quran is the Book of Allah. There is no doubt in it.', 'কুরআন আল্লাহর কিতাব। এতে কোনো সন্দেহ নেই।'], 'Quran 2:2');
  B.c(1, ['Which surah is the first in the Quran?', 'কুরআনের প্রথম সূরা কোনটি?'], [nm(1), nm(114), nm(112)], ['Al-Fatihah is the first surah. Its name means the Opening.', 'আল-ফাতিহা প্রথম সূরা। এর নামের অর্থ সূচনা।'], ref(1));
  B.c(1, ['Which surah is the last in the Quran?', 'কুরআনের শেষ সূরা কোনটি?'], [nm(114), nm(1), nm(2)], ['An-Nas is surah 114, the last one.', 'আন-নাস ১১৪ নম্বর সূরা, সবার শেষে।'], ref(114));
  B.c(1, ['How many ayat are in Al-Fatihah?', 'আল-ফাতিহায় কয়টি আয়াত?'], [['7', '৭', 'dots-7'], ['5', '৫', 'dots-5'], ['9', '৯', 'dots-9']], ['Al-Fatihah has seven ayat.', 'আল-ফাতিহায় সাতটি আয়াত।'], 'Quran 15:87');
  B.c(1, ['The Quran is in which language?', 'কুরআন কোন ভাষায়?'], [['Arabic', 'আরবি'], ['English', 'ইংরেজি'], ['Bangla', 'বাংলা']], ['Allah sent it down as an Arabic Quran.', 'আল্লাহ একে আরবি কুরআন হিসেবে নাজিল করেছেন।'], 'Quran 12:2');
  B.c(1, ['In which month did the Quran come down?', 'কোন মাসে কুরআন নাজিল হয়েছে?'], [['Ramadan', 'রমজান', 'crescent'], ['Shawwal', 'শাওয়াল'], ['Muharram', 'মুহাররম']], ['The Quran was sent down in the month of Ramadan.', 'রমজান মাসে কুরআন নাজিল হয়েছে।'], 'Quran 2:185');
  B.yn(1, ['Is the Quran the word of Allah?', 'কুরআন কি আল্লাহর কথা?'], true, ['Yes. It was sent down by the Lord of the worlds.', 'হ্যাঁ। এটি জগৎসমূহের রবের পক্ষ থেকে নাজিল হয়েছে।'], 'Quran 26:192');
  B.yn(1, ['Is An-Nas the first surah of the Quran?', 'আন-নাস কি কুরআনের প্রথম সূরা?'], false, ['An-Nas is the last surah. Al-Fatihah is the first.', 'আন-নাস শেষ সূরা। প্রথম সূরা আল-ফাতিহা।'], ref(114));
  B.yn(1, ['Do we begin reading with Bismillah?', 'আমরা কি বিসমিল্লাহ বলে পড়া শুরু করি?'], true, ['Al-Fatihah opens with: In the name of Allah, the Most Merciful.', 'আল-ফাতিহা শুরু হয়: পরম দয়াময় আল্লাহর নামে।'], 'Quran 1:1');
  B.order(1, ['Put the last three surahs in order.', 'শেষ তিনটি সূরা পরপর সাজাও।'], [nm(112), nm(113), nm(114)], ['Al-Ikhlas (112), Al-Falaq (113), An-Nas (114).', 'আল-ইখলাস (১১২), আল-ফালাক (১১৩), আন-নাস (১১৪)।'], LIST);
  B.match(1, ['Match the surah to its picture.', 'সূরার সঙ্গে ছবি মেলাও।'], [[nm(105), { p: 'elephant' }], [nm(16), { p: 'bee' }], [nm(91), { p: 'sun' }]], ['Al-Fil is the Elephant, An-Nahl the Bee, Ash-Shams the Sun.', 'আল-ফীল মানে হাতি, আন-নাহল মৌমাছি, আশ-শামস সূর্য।'], LIST);
  B.match(1, ['Match the surah to its picture.', 'সূরার সঙ্গে ছবি মেলাও।'], [[nm(27), { p: 'ant' }], [nm(54), { p: 'moon' }], [nm(18), { p: 'cave' }]], ['An-Naml is the Ant, Al-Qamar the Moon, Al-Kahf the Cave.', 'আন-নামল মানে পিঁপড়া, আল-কামার চাঁদ, আল-কাহফ গুহা।'], LIST);
  B.sort(1, ['Is it a surah of the Quran?', 'এটি কি কুরআনের সূরা?'], [['A surah', 'সূরা', 'quran'], ['Not a surah', 'সূরা নয়', 'no']],
    [['Al-Fatihah', 'আল-ফাতিহা', 0], ['Al-Ikhlas', 'আল-ইখলাস', 0], ['Ball', 'বল', 1, 'ball'], ['An-Nas', 'আন-নাস', 0], ['Kite', 'ঘুড়ি', 1, 'kite']], ['Al-Fatihah, Al-Ikhlas and An-Nas are surahs of the Quran.', 'আল-ফাতিহা, আল-ইখলাস আর আন-নাস কুরআনের সূরা।'], LIST);

  // ================= band 2: ages 7-9 =================
  var KNOWN = [1, 2, 3, 18, 19, 36, 55, 67, 78, 93, 94, 95, 96, 97, 99, 103, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114];
  B.facts(2, KNOWN.map(su), { kind: 'num', q: function (s) { return ['Which surah is number ' + s[0] + '?', bn(s[0]) + ' নম্বর সূরা কোনটি?']; }, a: function (s) { return [s[1], s[2]]; },
    why: function (s) { return [s[1] + ' is surah ' + s[0] + '.', s[2] + ' হলো ' + bn(s[0]) + ' নম্বর সূরা।']; }, ref: function (s) { return ref(s[0]); } });
  B.facts(2, MEAN, { kind: 'mean', q: function (r) { return ['What does “' + su(r[0])[1] + '” mean?', '“' + su(r[0])[2] + '” নামের অর্থ কী?']; }, a: function (r) { return [r[2], r[3]]; },
    why: function (r) { return [su(r[0])[1] + ' means ' + r[2] + '.', su(r[0])[2] + ' মানে ' + r[3] + '।']; }, ref: function (r) { return ref(r[0]); } });
  B.pairs(2, MEAN.slice(0, 24), { kind: 'mm', q: ['Match each surah to the meaning of its name.', 'প্রতিটি সূরার সঙ্গে নামের অর্থ মেলাও।'], l: function (r) { return nm(r[0]); }, r: function (r) { return [r[2], r[3]]; },
    why: ['Many surahs are named after something mentioned in them.', 'অনেক সূরার নাম তার ভেতরে বলা কোনো বিষয় থেকে এসেছে।'], ref: LIST });
  [[109, 110, 111, 112], [111, 112, 113, 114], [103, 104, 105, 106], [1, 2, 3, 4], [93, 94, 95, 96]].forEach(function (g) {
    B.order(2, ['Put these surahs in the order of the Quran.', 'সূরাগুলো কুরআনের ক্রমে সাজাও।'], g.map(nm), [g.map(function (n) { return su(n)[1] + ' (' + n + ')'; }).join(', ') + '.', g.map(function (n) { return su(n)[2] + ' (' + bn(n) + ')'; }).join(', ') + '।'], LIST);
  });
  B.c(2, ['How many surahs are in the Quran?', 'কুরআনে মোট কয়টি সূরা?'], [N(114), N(30), N(99), N(124)], ['The Quran has 114 surahs.', 'কুরআনে ১১৪টি সূরা আছে।'], LIST);
  B.c(2, ['Which is the longest surah?', 'সবচেয়ে বড় সূরা কোনটি?'], [nm(2), nm(1), nm(36), nm(18)], ['Al-Baqarah has 286 ayat, more than any other surah.', 'আল-বাকারায় ২৮৬টি আয়াত, যা সব সূরার চেয়ে বেশি।'], ref(2));
  B.c(2, ['Which of these surahs has only three ayat?', 'এদের মধ্যে কোন সূরায় মাত্র তিনটি আয়াত?'], [nm(108), nm(112), nm(113), nm(1)], ['Al-Kawthar has three ayat. So do Al-Asr and An-Nasr.', 'আল-কাউসারে তিনটি আয়াত। আল-আসর ও আন-নাসরেও তিনটি।'], ref(108));
  B.facts(2, [112, 113, 114, 105, 106, 109, 97, 1].map(su), { kind: 'ayat', q: function (s) { return ['How many ayat are in ' + s[1] + '?', s[2] + ' সূরায় কয়টি আয়াত?']; }, a: function (s) { return N(s[3]); },
    why: function (s) { return [s[1] + ' has ' + s[3] + ' ayat.', s[2] + ' সূরায় ' + bn(s[3]) + 'টি আয়াত।']; }, ref: function (s) { return ref(s[0]); } });
  B.c(2, ['Which angel brought the Quran down?', 'কোন ফেরেশতা কুরআন নিয়ে এসেছেন?'], [['Jibril', 'জিবরীল'], ['Mikail', 'মিকাঈল'], ['Israfil', 'ইসরাফীল']], ['Jibril brought it down upon the heart of the Prophet ﷺ, by permission of Allah.', 'আল্লাহর অনুমতিতে জিবরীল (আ.) এটি নবী ﷺ-এর অন্তরে নাজিল করেছেন।'], 'Quran 2:97');
  B.c(2, ['On which night did the Quran come down?', 'কোন রাতে কুরআন নাজিল হয়েছে?'], [['The Night of Decree', 'কদরের রাত'], ['The night of Eid', 'ঈদের রাত'], ['A Friday night', 'জুমার রাত']], ['“Indeed, We sent it down during the Night of Decree.”', '“নিশ্চয়ই আমি একে কদরের রাতে নাজিল করেছি।”'], 'Quran 97:1');
  B.c(2, ['What was the first word revealed to the Prophet ﷺ?', 'নবী ﷺ-এর কাছে নাজিল হওয়া প্রথম শব্দ কী?'], [['Read', 'পড়ো'], ['Pray', 'নামাজ পড়ো'], ['Fast', 'রোজা রাখো']], ['“Read in the name of your Lord who created.”', '“পড়ো তোমার রবের নামে, যিনি সৃষ্টি করেছেন।”'], 'Quran 96:1');
  B.c(2, ['“The best among you are those who learn the Quran and…”', '“তোমাদের মধ্যে সে-ই সেরা, যে কুরআন শেখে এবং…”'], [['teach it', 'তা শেখায়'], ['sell it', 'তা বিক্রি করে'], ['hide it', 'তা লুকিয়ে রাখে']], ['The best are those who learn the Quran and teach it.', 'সেরা তারা, যারা কুরআন শেখে ও শেখায়।'], 'Sahih al-Bukhari 5027');
  B.yn(2, ['Does every letter of the Quran you recite earn a reward?', 'কুরআনের প্রতিটি হরফ পড়লে কি সওয়াব হয়?'], true, ['Each letter earns a good deed, and each good deed is multiplied by ten.', 'প্রতিটি হরফে একটি নেকি, আর প্রতিটি নেকি দশ গুণ।'], 'Jami` at-Tirmidhi 2910');
  B.yn(2, ['Is Al-Fatihah the longest surah?', 'আল-ফাতিহা কি সবচেয়ে বড় সূরা?'], false, ['Al-Fatihah has 7 ayat. The longest is Al-Baqarah with 286.', 'আল-ফাতিহায় ৭টি আয়াত। সবচেয়ে বড় আল-বাকারা, ২৮৬টি আয়াত।'], ref(2));
  B.sort(2, ['Is the surah named after an animal?', 'সূরাটির নাম কি কোনো প্রাণীর নামে?'], [['An animal', 'প্রাণী', 'bee'], ['Not an animal', 'প্রাণী নয়', 'star']],
    [[su(2)[1], su(2)[2], 0], [su(16)[1], su(16)[2], 0], [su(27)[1], su(27)[2], 0], [su(53)[1], su(53)[2], 1], [su(68)[1], su(68)[2], 1], [su(105)[1], su(105)[2], 0], [su(91)[1], su(91)[2], 1]],
    ['The Cow, the Bee, the Ant and the Elephant are animals. The Star, the Pen and the Sun are not.', 'গাভী, মৌমাছি, পিঁপড়া আর হাতি প্রাণী। তারা, কলম আর সূর্য প্রাণী নয়।'], LIST);

  // ================= band 3: ages 10-12 =================
  B.facts(3, [2, 3, 12, 18, 19, 36, 55, 67, 78, 99].map(su), { kind: 'ayat3', q: function (s) { return ['How many ayat are in ' + s[1] + '?', s[2] + ' সূরায় কয়টি আয়াত?']; }, a: function (s) { return N(s[3]); },
    why: function (s) { return [s[1] + ' has ' + s[3] + ' ayat.', s[2] + ' সূরায় ' + bn(s[3]) + 'টি আয়াত।']; }, ref: function (s) { return ref(s[0]); } });
  B.facts(3, [10, 12, 14, 15, 17, 20, 24, 31, 47, 49, 56, 71, 73, 76, 87, 89].map(su), { kind: 'num3', q: function (s) { return ['Which surah is number ' + s[0] + '?', bn(s[0]) + ' নম্বর সূরা কোনটি?']; }, a: function (s) { return [s[1], s[2]]; },
    why: function (s) { return [s[1] + ' is surah ' + s[0] + '.', s[2] + ' হলো ' + bn(s[0]) + ' নম্বর সূরা।']; }, ref: function (s) { return ref(s[0]); } });
  function place(list, q) {
    B.sort(3, ['Where was the surah revealed?', 'সূরাটি কোথায় নাজিল হয়েছে?'], [['Makkah', 'মক্কা', 'kaaba'], ['Madinah', 'মদিনা', 'mosque']], list.map(function (n) { var s = su(n); return [s[1], s[2], s[4] === 'K' ? 0 : 1]; }),
      ['Makkan surahs came before the Hijrah, Madinan surahs after it.', 'মক্কি সূরা হিজরতের আগে, মাদানি সূরা হিজরতের পরে নাজিল হয়েছে।'], LIST, { id: 'qe-place-' + q });
  }
  place([1, 2, 12, 3, 18, 4], 1); place([19, 5, 36, 24, 67, 49], 2); place([112, 110, 109, 8, 96, 9], 3);
  B.sort(3, ['Is the surah named after a prophet?', 'সূরাটির নাম কি কোনো নবীর নামে?'], [['A prophet', 'নবীর নাম'], ['Something else', 'অন্য কিছু']],
    [[su(10)[1], su(10)[2], 0], [su(11)[1], su(11)[2], 0], [su(12)[1], su(12)[2], 0], [su(14)[1], su(14)[2], 0], [su(71)[1], su(71)[2], 0], [su(18)[1], su(18)[2], 1], [su(67)[1], su(67)[2], 1], [su(55)[1], su(55)[2], 1]],
    ['Yunus, Hud, Yusuf, Ibrahim and Nuh, peace be upon them, each have a surah named after them.', 'ইউনুস, হূদ, ইউসুফ, ইবরাহীম ও নূহ (আ.): প্রত্যেকের নামে একটি করে সূরা আছে।'], LIST);
  B.c(3, ['Which surah does not begin with Bismillah?', 'কোন সূরার শুরুতে বিসমিল্লাহ নেই?'], [nm(9), nm(8), nm(27), nm(1)], ['At-Tawbah, surah 9, is the only surah without Bismillah at its start.', 'আত-তাওবা (৯ নম্বর) একমাত্র সূরা, যার শুরুতে বিসমিল্লাহ নেই।'], LIST);
  B.c(3, ['In which surah does Bismillah appear inside an ayah, in a letter from Sulayman?', 'কোন সূরার একটি আয়াতের ভেতরে, সুলাইমান (আ.)-এর চিঠিতে, বিসমিল্লাহ আছে?'], [nm(27), nm(9), nm(36), nm(12)], ['“Indeed, it is from Solomon, and indeed, it is: In the name of Allah, the Most Merciful…”', '“এটি সুলাইমানের পক্ষ থেকে, আর তা হলো: পরম দয়াময় আল্লাহর নামে…”'], 'Quran 27:30');
  B.c(3, ['Which ayah did the Prophet ﷺ call the greatest in the Book of Allah?', 'নবী ﷺ আল্লাহর কিতাবের কোন আয়াতকে সবচেয়ে মহান বলেছেন?'], [['Ayat al-Kursi (2:255)', 'আয়াতুল কুরসি (২:২৫৫)'], ['The first ayah of Al-Fatihah', 'আল-ফাতিহার প্রথম আয়াত'], ['The last ayah of An-Nas', 'আন-নাসের শেষ আয়াত']], ['Ubayy ibn Kab answered “Allah, there is no god but He, the Ever-Living…”, and the Prophet ﷺ praised his knowledge.', 'উবাই ইবনে কাব (রা.) আয়াতুল কুরসির কথা বললেন, আর নবী ﷺ তাঁর জ্ঞানের প্রশংসা করলেন।'], 'Sahih Muslim 810');
  B.c(3, ['Which surah is equal to a third of the Quran?', 'কোন সূরা কুরআনের এক-তৃতীয়াংশের সমান?'], [nm(112), nm(1), nm(36), nm(114)], ['The Prophet ﷺ said Al-Ikhlas is equal to one third of the Quran.', 'নবী ﷺ বলেছেন, আল-ইখলাস কুরআনের এক-তৃতীয়াংশের সমান।'], 'Sahih al-Bukhari 5013');
  B.c(3, ['Which surah is called “the seven oft-repeated verses”?', 'কোন সূরাকে “বারবার পঠিত সাত আয়াত” বলা হয়?'], [nm(1), nm(112), nm(103), nm(108)], ['The Prophet ﷺ said that Al-Fatihah is the seven oft-repeated verses and the great Quran.', 'নবী ﷺ বলেছেন, আল-ফাতিহাই বারবার পঠিত সাত আয়াত ও মহান কুরআন।'], 'Sahih al-Bukhari 4474');
  B.c(3, ['Which surah of thirty ayat intercedes for the one who recites it?', 'ত্রিশ আয়াতের কোন সূরা তার পাঠকের জন্য সুপারিশ করে?'], [nm(67), nm(36), nm(55), nm(78)], ['It is Tabarak, Surah Al-Mulk.', 'সেটি তাবারাক, অর্থাৎ সূরা আল-মুলক।'], 'Jami` at-Tirmidhi 2891');
  B.c(3, ['From which house does Shaytan run away?', 'শয়তান কোন ঘর থেকে পালিয়ে যায়?'], [['A house where Al-Baqarah is recited', 'যে ঘরে আল-বাকারা পড়া হয়'], ['A house with a big door', 'যে ঘরের দরজা বড়'], ['A house on a hill', 'পাহাড়ের ওপরের ঘর']], ['“Satan runs away from the house in which Surah Al-Baqarah is recited.”', '“যে ঘরে সূরা আল-বাকারা পড়া হয়, শয়তান সেখান থেকে পালিয়ে যায়।”'], 'Sahih Muslim 780');
  B.c(3, ['Reciting the last two ayat of Al-Baqarah at night is…', 'রাতে আল-বাকারার শেষ দুই আয়াত পড়লে তা…'], [['sufficient for you', 'তোমার জন্য যথেষ্ট'], ['equal to Hajj', 'হজের সমান'], ['only for travellers', 'শুধু মুসাফিরের জন্য']], ['Whoever recites them at night, they will be sufficient for him.', 'যে রাতে এ দুই আয়াত পড়ে, তার জন্য তা যথেষ্ট।'], 'Sahih al-Bukhari 5009');
  B.c(3, ['The Quran calls itself guidance for whom?', 'কুরআন নিজেকে কাদের জন্য পথনির্দেশ বলেছে?'], [['Those conscious of Allah', 'মুত্তাকিদের জন্য'], ['Only for kings', 'শুধু রাজাদের জন্য'], ['Only for one city', 'শুধু একটি শহরের জন্য']], ['“This is the Book about which there is no doubt, a guidance for those conscious of Allah.”', '“এ সেই কিতাব, যাতে কোনো সন্দেহ নেই; মুত্তাকিদের জন্য পথনির্দেশ।”'], 'Quran 2:2');
  B.c(3, ['Who protects the Quran from being changed?', 'কুরআনকে পরিবর্তন থেকে কে রক্ষা করেন?'], [['Allah Himself', 'আল্লাহ নিজেই'], ['The kings', 'রাজারা'], ['The poets', 'কবিরা']], ['“Indeed, it is We who sent down the Quran and indeed, We will be its guardian.”', '“নিশ্চয়ই আমিই কুরআন নাজিল করেছি, আর আমিই এর সংরক্ষক।”'], 'Quran 15:9');
  B.c(3, ['How should the Quran be recited?', 'কুরআন কীভাবে পড়তে হবে?'], [['With measured recitation', 'ধীরে ধীরে, স্পষ্ট করে'], ['As fast as possible', 'যত দ্রুত সম্ভব'], ['Without stopping', 'একটুও না থেমে']], ['“…and recite the Quran with measured recitation.”', '“…আর কুরআন তিলাওয়াত করো ধীরে ধীরে, স্পষ্টভাবে।”'], 'Quran 73:4');
  B.c(3, ['The Prophet ﷺ received revelation in Makkah for thirteen years. How many years in Madinah?', 'নবী ﷺ মক্কায় তেরো বছর ওহি পেয়েছেন। মদিনায় কত বছর?'], [['Ten', 'দশ'], ['Three', 'তিন'], ['Twenty', 'বিশ']], ['Revelation began at forty: thirteen years in Makkah, then ten in Madinah.', 'চল্লিশ বছর বয়সে ওহি শুরু হয়: মক্কায় তেরো বছর, তারপর মদিনায় দশ বছর।'], 'Sahih al-Bukhari 3902');
  B.yn(3, ['Can people and jinn together produce something like the Quran?', 'মানুষ ও জিন একত্র হয়ে কি কুরআনের মতো কিছু আনতে পারবে?'], false, ['“…they could not produce the like of it, even if they were to each other assistants.”', '“…তারা এর মতো কিছু আনতে পারবে না, একে অন্যের সাহায্যকারী হলেও।”'], 'Quran 17:88');
  B.yn(3, ['Was the Quran sent down all at once to the Prophet ﷺ?', 'কুরআন কি নবী ﷺ-এর ওপর একবারে নাজিল হয়েছে?'], false, ['It was sent down in parts, so that he might recite it to the people over time.', 'এটি ভাগে ভাগে নাজিল হয়েছে, যেন তিনি মানুষকে ধীরে ধীরে পড়ে শোনান।'], 'Quran 17:106');
  B.match(3, ['Match each surah to what the Prophet ﷺ said about it.', 'প্রতিটি সূরার সঙ্গে নবী ﷺ-এর কথা মেলাও।'], [[nm(112), ['A third of the Quran', 'কুরআনের এক-তৃতীয়াংশ']], [nm(1), ['The seven oft-repeated', 'বারবার পঠিত সাত আয়াত']], [nm(67), ['Intercedes for its reciter', 'পাঠকের জন্য সুপারিশ করে']], [nm(2), ['Shaytan flees its house', 'এর ঘর থেকে শয়তান পালায়']]],
    ['Each of these is in a sahih or hasan hadith.', 'এর প্রতিটি সহিহ বা হাসান হাদিসে আছে।'], 'Sahih al-Bukhari 5013, 4474; Jami` at-Tirmidhi 2891; Sahih Muslim 780');
  B.order(3, ['Put these surahs in the order of the Quran.', 'সূরাগুলো কুরআনের ক্রমে সাজাও।'], [nm(2), nm(18), nm(36), nm(67), nm(112)], ['Al-Baqarah (2), Al-Kahf (18), Ya-Sin (36), Al-Mulk (67), Al-Ikhlas (112).', 'আল-বাকারা (২), আল-কাহফ (১৮), ইয়াসীন (৩৬), আল-মুলক (৬৭), আল-ইখলাস (১১২)।'], LIST);
  B.order(3, ['Fewest ayat first!', 'কম আয়াত থেকে বেশি আয়াত সাজাও!'], [nm(108), nm(112), nm(1), nm(67), nm(2)], ['Al-Kawthar 3, Al-Ikhlas 4, Al-Fatihah 7, Al-Mulk 30, Al-Baqarah 286.', 'আল-কাউসার ৩, আল-ইখলাস ৪, আল-ফাতিহা ৭, আল-মুলক ৩০, আল-বাকারা ২৮৬।'], LIST);

  KQ.define('quran-explorer', { bank: B.list });
})();
