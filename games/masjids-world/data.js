/* Masjids of the World: data.js — the question bank.
   The three great masjids and Masjid Quba (Quran and sahih narrations), the manners and parts of a masjid,
   and famous masjids around the world. Every religious source was read before its question was written;
   places and buildings are general knowledge.
   band: 1 = ages 4-6 (pictures), 2 = ages 7-9, 3 = ages 10-12. */
(function () {
  'use strict';
  var KQ = window.KahfQuiz, B = KQ.bank('mw');
  function P(en, bn, p) { return [en, bn, p]; }
  var BK = 'Sahih al-Bukhari ', MS = 'Sahih Muslim ', IM = 'Sunan Ibn Majah ';
  var GEO = 'Famous masjids (general knowledge)', PART = 'Parts of a masjid (general knowledge)';
  var HARAM = ['Al-Masjid al-Haram', 'মসজিদুল হারাম'], NABAWI = ['The Prophet\'s Masjid', 'মসজিদে নববি'], AQSA = ['Al-Masjid al-Aqsa', 'মসজিদুল আকসা'], QUBA = ['Masjid Quba', 'মসজিদে কুবা'];
  var MAKKAH = ['Makkah', 'মক্কা'], MADINAH = ['Madinah', 'মদিনা'], QUDS = ['Jerusalem', 'জেরুজালেম'];
  var PLACES = [
    [['The Blue Mosque (Sultan Ahmed)', 'ব্লু মস্ক (সুলতান আহমেদ মসজিদ)'], ['Istanbul, Türkiye', 'ইস্তাম্বুল, তুরস্ক'], ['Türkiye', 'তুরস্ক']],
    [['The Great Mosque of Djenne', 'জেন্নের বড় মসজিদ'], ['Djenne, Mali', 'জেন্নে, মালি'], ['Mali', 'মালি']],
    [['The Hassan II Mosque', 'দ্বিতীয় হাসান মসজিদ'], ['Casablanca, Morocco', 'কাসাব্লাঙ্কা, মরক্কো'], ['Morocco', 'মরক্কো']],
    [['The Sheikh Zayed Grand Mosque', 'শেখ জায়েদ গ্র্যান্ড মসজিদ'], ['Abu Dhabi, UAE', 'আবুধাবি, সংযুক্ত আরব আমিরাত'], ['The United Arab Emirates', 'সংযুক্ত আরব আমিরাত']],
    [['The Faisal Mosque', 'ফয়সাল মসজিদ'], ['Islamabad, Pakistan', 'ইসলামাবাদ, পাকিস্তান'], ['Pakistan', 'পাকিস্তান']],
    [['The Istiqlal Mosque', 'ইস্তিকলাল মসজিদ'], ['Jakarta, Indonesia', 'জাকার্তা, ইন্দোনেশিয়া'], ['Indonesia', 'ইন্দোনেশিয়া']],
    [['Baitul Mukarram', 'বায়তুল মোকাররম'], ['Dhaka, Bangladesh', 'ঢাকা, বাংলাদেশ'], ['Bangladesh', 'বাংলাদেশ']],
    [['The Umayyad Mosque', 'উমাইয়া মসজিদ'], ['Damascus, Syria', 'দামেস্ক, সিরিয়া'], ['Syria', 'সিরিয়া']],
    [['Al-Azhar Mosque', 'আল-আজহার মসজিদ'], ['Cairo, Egypt', 'কায়রো, মিসর'], ['Egypt', 'মিসর']],
    [['The Great Mosque of Kairouan', 'কায়রাওয়ানের বড় মসজিদ'], ['Kairouan, Tunisia', 'কায়রাওয়ান, তিউনিসিয়া'], ['Tunisia', 'তিউনিসিয়া']],
    [['The Badshahi Mosque', 'বাদশাহি মসজিদ'], ['Lahore, Pakistan', 'লাহোর, পাকিস্তান'], ['Pakistan', 'পাকিস্তান']],
    [['Shah Jahan\'s Jama Masjid', 'শাহজাহানের জামে মসজিদ'], ['Delhi, India', 'দিল্লি, ভারত'], ['India', 'ভারত']],
    [['The Great Mosque of Xian', 'শিয়ানের বড় মসজিদ'], ['Xian, China', 'শিয়ান, চীন'], ['China', 'চীন']]];

  // ---------- band 1 ----------
  B.c(1, ['What is inside al-Masjid al-Haram?', 'মসজিদুল হারামের ভেতরে কী আছে?'], [P('The Kabah', 'কাবা', 'kaaba'), P('A ship', 'জাহাজ', 'ship'), P('A pyramid', 'পিরামিড', 'pyramid')],
    ['"The first House established for mankind was that at Makkah."', '"মানুষের জন্য প্রতিষ্ঠিত প্রথম ঘর মক্কায় অবস্থিত।"'], 'Quran 3:96');
  B.c(1, ['In which city is the Kabah?', 'কাবা কোন শহরে?'], [MAKKAH, MADINAH, QUDS],
    ['The first House is at Makkah, blessed and a guidance for the worlds.', 'প্রথম ঘর মক্কায়; তা বরকতময় ও বিশ্ববাসীর জন্য হেদায়াত।'], 'Quran 3:96');
  B.c(1, ['Which way do we face when we pray?', 'নামাজে আমরা কোন দিকে মুখ করি?'], [P('Towards the Kabah', 'কাবার দিকে', 'kaaba'), P('Towards the sun', 'সূর্যের দিকে', 'sun'), P('Towards the sea', 'সমুদ্রের দিকে', 'sea')],
    ['"Wherever you are, turn your faces toward it."', '"তোমরা যেখানেই থাকো, তার দিকে মুখ ফেরাও।"'], 'Quran 2:144');
  B.c(1, ['In which city is the Prophet\'s ﷺ Masjid?', 'মসজিদে নববি কোন শহরে?'], [MADINAH, MAKKAH, QUDS],
    ['His she-camel knelt at the place of the Masjid of Allah\'s Messenger ﷺ at Madinah.', 'তাঁর উটনী মদিনায় রাসুলুল্লাহ ﷺ-এর মসজিদের জায়গায় বসে পড়েছিল।'], BK + '3906');
  B.c(1, ['Who are the masjids for?', 'মসজিদগুলো কার জন্য?'], [['Allah', 'আল্লাহ'], ['Kings', 'রাজারা'], ['Shopkeepers', 'দোকানদাররা']],
    ['"The masjids are for Allah."', '"মসজিদগুলো আল্লাহরই জন্য।"'], 'Quran 72:18');
  B.c(1, ['How many rakat do we pray when we enter a masjid, before sitting?', 'মসজিদে ঢুকে বসার আগে আমরা কয় রাকাত নামাজ পড়ি?'], [['Two', 'দুই'], ['Ten', 'দশ'], ['None', 'একটিও না']],
    ['"If anyone of you enters a mosque, he should pray two rakat before sitting."', '"তোমাদের কেউ মসজিদে ঢুকলে বসার আগে যেন দুই রাকাত নামাজ পড়ে।"'], BK + '444');
  B.yn(1, ['Are masjids the places Allah loves most?', 'মসজিদ কি আল্লাহর সবচেয়ে প্রিয় জায়গা?'], true,
    ['"The parts of land dearest to Allah are its mosques."', '"আল্লাহর কাছে সবচেয়ে প্রিয় জায়গা মসজিদ।"'], MS + '671');
  B.yn(1, ['Should we wear clean, nice clothes to the masjid?', 'মসজিদে কি পরিষ্কার, সুন্দর পোশাক পরে যাওয়া উচিত?'], true,
    ['"O children of Adam, take your adornment at every masjid."', '"হে আদম সন্তান, প্রত্যেক মসজিদে তোমাদের সাজসজ্জা গ্রহণ করো।"'], 'Quran 7:31');
  B.place(1, ['Tap the dome.', 'গম্বুজে টোকা দাও।'], 'masjid', 'dome', ['The dome is the round roof.', 'গম্বুজ হলো গোল ছাদ।'], PART);
  B.place(1, ['Tap the minaret.', 'মিনারে টোকা দাও।'], 'masjid', 'minaret', ['The minaret is the tall tower.', 'মিনার হলো উঁচু টাওয়ার।'], PART);
  B.place(1, ['Tap the door.', 'দরজায় টোকা দাও।'], 'masjid', 'door', ['We go in through the door.', 'আমরা দরজা দিয়ে ভেতরে ঢুকি।'], PART);
  B.place(1, ['Tap the place where we make wudu.', 'অজুর জায়গায় টোকা দাও।'], 'masjid', 'wudu', ['We wash for the prayer at the wudu place.', 'অজুখানায় আমরা নামাজের জন্য অজু করি।'], PART);
  B.c(1, ['Which is the tall tower of a masjid?', 'মসজিদের উঁচু টাওয়ারটি কোনটি?'], [P('The minaret', 'মিনার', 'minaret'), P('The door', 'দরজা', 'door'), P('The mat', 'জায়নামাজ', 'mat')],
    ['The call to prayer goes out from the minaret.', 'মিনার থেকে আজানের ডাক ছড়িয়ে পড়ে।'], PART);
  B.match(1, ['Match the masjid to its city.', 'মসজিদের সঙ্গে শহর মেলাও।'],
    [[HARAM, MAKKAH], [NABAWI, MADINAH], [AQSA, QUDS]],
    ['The three great masjids.', 'তিনটি মহান মসজিদ।'], BK + '1189; ' + BK + '3366');

  // ---------- band 2 ----------
  B.c(2, ['Which masjid was the first built on the earth?', 'পৃথিবীতে প্রথম কোন মসজিদ নির্মিত হয়েছিল?'], [HARAM, AQSA, NABAWI, QUBA],
    ['Abu Dharr asked, and the Prophet ﷺ said: "Al-Masjid al-Haram."', 'আবু যর (রা.) জিজ্ঞেস করলে নবী ﷺ বললেন: "মসজিদুল হারাম।"'], BK + '3366');
  B.c(2, ['Which masjid was built next after al-Masjid al-Haram?', 'মসজিদুল হারামের পরে কোন মসজিদ নির্মিত হয়েছিল?'], [AQSA, NABAWI, QUBA],
    ['"The mosque of al-Aqsa."', '"মসজিদুল আকসা।"'], BK + '3366');
  B.c(2, ['How many years were between the building of the two?', 'দুটির নির্মাণের মাঝে কত বছরের ব্যবধান ছিল?'], [['Forty', 'চল্লিশ'], ['Four', 'চার'], ['Four hundred', 'চারশ']],
    ['"Forty years."', '"চল্লিশ বছর।"'], BK + '3366');
  B.c(2, ['Who raised the foundations of the Kabah?', 'কাবার ভিত্তি কারা তুলেছিলেন?'], [['Ibrahim and Ismail', 'ইবরাহিম ও ইসমাইল (আ.)'], ['Musa and Harun', 'মুসা ও হারুন (আ.)'], ['Dawud and Sulayman', 'দাউদ ও সুলাইমান (আ.)']],
    ['"When Abraham was raising the foundations of the House, and Ishmael."', '"যখন ইবরাহিম ও ইসমাইল ঘরের ভিত্তি তুলছিলেন।"'], 'Quran 2:127');
  B.c(2, ['To which three masjids may we set out on a special journey?', 'কোন তিনটি মসজিদের উদ্দেশে বিশেষ সফর করা যায়?'], [['Al-Haram, the Prophet\'s Masjid and al-Aqsa', 'মসজিদুল হারাম, মসজিদে নববি ও মসজিদুল আকসা'], ['Any three we like', 'যেকোনো তিনটি'], ['Only masjids near our home', 'শুধু বাড়ির কাছের মসজিদ']],
    ['"Do not set out on a journey except for three mosques."', '"তিনটি মসজিদ ছাড়া অন্য কোথাও সফরের উদ্দেশ্যে বের হয়ো না।"'], BK + '1189');
  B.c(2, ['One prayer in the Prophet\'s ﷺ Masjid is better than how many elsewhere?', 'মসজিদে নববিতে এক নামাজ অন্য জায়গার কত নামাজের চেয়ে উত্তম?'], [['One thousand', 'এক হাজার'], ['Ten', 'দশ'], ['One hundred', 'একশ']],
    ['"...better than one thousand prayers in any other mosque excepting al-Masjid al-Haram."', '"...মসজিদুল হারাম ছাড়া অন্য যেকোনো মসজিদের এক হাজার নামাজের চেয়ে উত্তম।"'], BK + '1190');
  B.c(2, ['From which masjid to which masjid was the Prophet ﷺ taken by night?', 'রাতের বেলা নবী ﷺ-কে কোন মসজিদ থেকে কোন মসজিদে নেওয়া হয়েছিল?'], [['From al-Haram to al-Aqsa', 'মসজিদুল হারাম থেকে মসজিদুল আকসায়'], ['From al-Aqsa to Quba', 'মসজিদুল আকসা থেকে কুবায়'], ['From Quba to al-Haram', 'কুবা থেকে মসজিদুল হারামে']],
    ['"...who took His Servant by night from al-Masjid al-Haram to al-Masjid al-Aqsa."', '"...যিনি তাঁর বান্দাকে রাতে মসজিদুল হারাম থেকে মসজিদুল আকসায় নিয়ে গেছেন।"'], 'Quran 17:1');
  B.c(2, ['Which masjid did the Prophet ﷺ visit every Saturday?', 'নবী ﷺ প্রতি শনিবার কোন মসজিদে যেতেন?'], [QUBA, AQSA, HARAM],
    ['He used to go to the Mosque of Quba every Saturday, walking or riding.', 'তিনি প্রতি শনিবার হেঁটে বা সওয়ার হয়ে মসজিদে কুবায় যেতেন।'], BK + '1193');
  B.c(2, ['Which masjid did the Prophet ﷺ establish first, on his way into Madinah?', 'মদিনায় আসার পথে নবী ﷺ প্রথম কোন মসজিদ প্রতিষ্ঠা করেছিলেন?'], [QUBA, NABAWI, AQSA],
    ['He stayed with Banu Amr ibn Awf and established the masjid founded on piety.', 'তিনি বনু আমর ইবনে আওফের কাছে অবস্থান করে তাকওয়ার ওপর প্রতিষ্ঠিত মসজিদটি স্থাপন করেন।'], BK + '3906; Quran 9:108');
  B.c(2, ['What was the roof of the Prophet\'s ﷺ Masjid made of in his lifetime?', 'নবী ﷺ-এর জীবদ্দশায় মসজিদে নববির ছাদ কী দিয়ে তৈরি ছিল?'], [P('Date-palm leaves', 'খেজুর পাতা', 'palm'), P('Ice', 'বরফ', 'ice'), P('Paper', 'কাগজ', 'paper')],
    ['It was built of mud bricks, its roof of date-palm leaves and its pillars of palm trunks.', 'এটি কাঁচা ইটে তৈরি ছিল; ছাদ খেজুর পাতার, খুঁটি খেজুর গাছের কাণ্ডের।'], BK + '446');
  B.c(2, ['Whoever builds a masjid for Allah, what will Allah build for him?', 'যে আল্লাহর জন্য মসজিদ বানায়, আল্লাহ তার জন্য কী বানাবেন?'], [['A similar place in Paradise', 'জান্নাতে অনুরূপ একটি ঘর'], ['A bigger shop', 'একটি বড় দোকান'], ['A tall tower', 'একটি উঁচু টাওয়ার']],
    ['"Whoever built a mosque, Allah would build for him a similar place in Paradise."', '"যে মসজিদ নির্মাণ করে, আল্লাহ তার জন্য জান্নাতে অনুরূপ ঘর নির্মাণ করেন।"'], BK + '450');
  B.c(2, ['How much better is prayer in congregation than prayer alone?', 'একা নামাজের চেয়ে জামাতে নামাজ কত গুণ উত্তম?'], [['Twenty-seven times', 'সাতাশ গুণ'], ['Two times', 'দুই গুণ'], ['Five times', 'পাঁচ গুণ']],
    ['"The prayer in congregation is twenty-seven times superior."', '"জামাতের নামাজ সাতাশ গুণ বেশি মর্যাদার।"'], BK + '645');
  B.c(2, ['You walk to the masjid after washing at home. What do your two steps do?', 'ঘরে পবিত্র হয়ে তুমি মসজিদের দিকে হাঁটছ। তোমার দুই কদমে কী হয়?'], [['One wipes out a sin, the other raises your rank', 'এক কদমে গুনাহ মোছে, অন্য কদমে মর্যাদা বাড়ে'], ['Nothing', 'কিছুই হয় না'], ['They make you tired', 'তোমাকে ক্লান্ত করে']],
    ['"One of them would obliterate his sin and the second one would raise his status."', '"এক কদম তার গুনাহ মুছে দেয়, আরেক কদম তার মর্যাদা বাড়ায়।"'], MS + '666');
  B.c(2, ['After eating which food should we stay away from the masjid?', 'কোন খাবার খেয়ে মসজিদ থেকে দূরে থাকা উচিত?'], [['Raw garlic or onion', 'কাঁচা রসুন বা পেঁয়াজ'], ['Dates', 'খেজুর'], ['Honey', 'মধু']],
    ['"Whoever eats garlic or onion should keep away from our mosque."', '"যে রসুন বা পেঁয়াজ খায়, সে যেন আমাদের মসজিদ থেকে দূরে থাকে।"'], BK + '855');
  B.c(2, ['What do we call the steps where the imam stands to give the khutbah?', 'ইমাম যে সিঁড়িতে দাঁড়িয়ে খুতবা দেন, তাকে কী বলে?'], [['The minbar', 'মিম্বার'], ['The minaret', 'মিনার'], ['The dome', 'গম্বুজ']],
    ['The Prophet ﷺ had a pulpit of wood made to sit on when speaking to the people.', 'মানুষের সামনে কথা বলার সময় বসার জন্য নবী ﷺ কাঠের একটি মিম্বার বানিয়েছিলেন।'], BK + '917');
  B.c(2, ['What do we call the niche in the wall that shows the qiblah?', 'দেয়ালের যে খাঁজ কিবলার দিক দেখায়, তাকে কী বলে?'], [['The mihrab', 'মিহরাব'], ['The minbar', 'মিম্বার'], ['The courtyard', 'আঙিনা']],
    ['The imam stands at the mihrab to lead the prayer.', 'ইমাম মিহরাবে দাঁড়িয়ে নামাজ পড়ান।'], PART);
  B.place(2, ['Tap the part from which the adhan is called.', 'যেখান থেকে আজান দেওয়া হয়, সেখানে টোকা দাও।'], 'masjid', 'minaret', ['The adhan is called from the minaret.', 'মিনার থেকে আজান দেওয়া হয়।'], PART);
  B.place(2, ['Tap the sign on top of the dome.', 'গম্বুজের ওপরের চিহ্নে টোকা দাও।'], 'masjid', 'crescent', ['Many masjids have a crescent on top.', 'অনেক মসজিদের চূড়ায় চাঁদ থাকে।'], PART);
  PLACES.slice(0, 7).forEach(function (r, i) {
    var w = [PLACES[(i + 3) % 13][1], PLACES[(i + 6) % 13][1], PLACES[(i + 9) % 13][1]];
    B.c(2, ['Where is ' + r[0][0].replace(/^The /, 'the ') + '?', r[0][1] + ' কোথায়?'], [r[1]].concat(w),
      [r[0][0] + ' is in ' + r[1][0] + '.', r[0][1] + ' ' + r[1][1] + '-এ অবস্থিত।'], GEO);
  });
  B.yn(2, ['Can a Muslim pray anywhere clean on the earth when the prayer time comes?', 'নামাজের সময় হলে মুসলিম কি পৃথিবীর যেকোনো পবিত্র জায়গায় নামাজ পড়তে পারে?'], true,
    ['"The earth has been made for me a place for praying."', '"আমার জন্য জমিনকে নামাজের জায়গা বানানো হয়েছে।"'], BK + '335');
  B.sort(2, ['A good manner in the masjid, or not?', 'মসজিদের আদব, নাকি নয়?'], [['Good manner', 'আদব'], ['Not good', 'আদব নয়']],
    [['Praying two rakat on entering', 'ঢুকে দুই রাকাত নামাজ পড়া', 0], ['Wearing clean clothes', 'পরিষ্কার পোশাক পরা', 0], ['Coming with a clean mouth', 'পরিষ্কার মুখ নিয়ে আসা', 0], ['Coming with the smell of raw garlic', 'কাঁচা রসুনের গন্ধ নিয়ে আসা', 1], ['Calling on others besides Allah', 'আল্লাহ ছাড়া অন্যকে ডাকা', 1]],
    ['The masjids are for Allah, and we come to them clean.', 'মসজিদ আল্লাহর জন্য; আমরা সেখানে পরিচ্ছন্ন হয়ে আসি।'], BK + '444; Quran 7:31; ' + BK + '855; Quran 72:18');
  B.match(2, ['Match the part of the masjid to its use.', 'মসজিদের অংশের সঙ্গে তার কাজ মেলাও।'],
    [[['Minaret', 'মিনার'], ['The adhan is called', 'আজান দেওয়া হয়']], [['Minbar', 'মিম্বার'], ['The khutbah is given', 'খুতবা দেওয়া হয়']], [['Mihrab', 'মিহরাব'], ['Shows the qiblah', 'কিবলার দিক দেখায়']], [['Wudu place', 'অজুখানা'], ['We wash for prayer', 'নামাজের জন্য অজু করি']]],
    ['Every part of a masjid has a job.', 'মসজিদের প্রতিটি অংশের একটি কাজ আছে।'], PART);
  B.order(2, ['Which masjid was built first? Put them in order.', 'কোন মসজিদ আগে নির্মিত? ক্রমে সাজাও।'], [HARAM, AQSA, QUBA, NABAWI],
    ['Al-Haram, then al-Aqsa forty years later; Quba and then the Prophet\'s Masjid at the Hijrah.', 'মসজিদুল হারাম, চল্লিশ বছর পর মসজিদুল আকসা; হিজরতের সময় কুবা, তারপর মসজিদে নববি।'], BK + '3366; ' + BK + '3906');

  // ---------- band 3 ----------
  B.c(3, ['One prayer in al-Masjid al-Haram is better than how many prayers elsewhere?', 'মসজিদুল হারামে এক নামাজ অন্য জায়গার কত নামাজের চেয়ে উত্তম?'], [['One hundred thousand', 'এক লক্ষ'], ['One thousand', 'এক হাজার'], ['Five hundred', 'পাঁচশ'], ['Ten thousand', 'দশ হাজার']],
    ['"One prayer in the Sacred Mosque is better than one hundred thousand prayers elsewhere."', '"মসজিদুল হারামে এক নামাজ অন্য জায়গার এক লক্ষ নামাজের চেয়ে উত্তম।"'], IM + '1406');
  B.c(3, ['For how long did the Prophet ﷺ pray facing Bayt al-Maqdis before the qiblah changed?', 'কিবলা পরিবর্তনের আগে নবী ﷺ কতদিন বায়তুল মাকদিসের দিকে মুখ করে নামাজ পড়েছিলেন?'], [['Sixteen or seventeen months', 'ষোলো বা সতেরো মাস'], ['Sixteen days', 'ষোলো দিন'], ['Ten years', 'দশ বছর'], ['One week', 'এক সপ্তাহ']],
    ['He prayed facing Bayt al-Maqdis for sixteen or seventeen months, but loved to face the Kabah.', 'তিনি ষোলো বা সতেরো মাস বায়তুল মাকদিসের দিকে নামাজ পড়েন, তবে কাবার দিকে মুখ করতে ভালোবাসতেন।'], BK + '399');
  B.c(3, ['At which masjid did people turn towards the Kabah in the middle of the Fajr prayer?', 'কোন মসজিদে মানুষ ফজরের নামাজের মাঝখানেই কাবার দিকে ঘুরে গিয়েছিল?'], [QUBA, AQSA, HARAM],
    ['A man told them the Prophet ﷺ had been ordered to face the Kabah, so they turned.', 'একজন এসে জানাল নবী ﷺ-কে কাবার দিকে মুখ করতে আদেশ করা হয়েছে, তখন তারা ঘুরে গেল।'], BK + '403');
  B.c(3, ['Which verse told the Muslims to turn to al-Masjid al-Haram?', 'কোন আয়াতে মুসলিমদের মসজিদুল হারামের দিকে মুখ ফেরাতে বলা হয়েছে?'], [['"So turn your face toward al-Masjid al-Haram"', '"অতএব তুমি মসজিদুল হারামের দিকে মুখ ফেরাও"'], ['"Read in the name of your Lord"', '"পড়ো তোমার রবের নামে"'], ['"Say: He is Allah, the One"', '"বলো: তিনি আল্লাহ, এক"']],
    ['"We have certainly seen the turning of your face toward the heaven."', '"আমি তোমার আকাশের দিকে মুখ ফেরানো অবশ্যই দেখেছি।"'], 'Quran 2:144');
  B.c(3, ['Which masjid is described as "founded on righteousness from the first day"?', 'কোন মসজিদকে "প্রথম দিন থেকেই তাকওয়ার ওপর প্রতিষ্ঠিত" বলা হয়েছে?'], [QUBA, ['The Blue Mosque', 'ব্লু মস্ক'], ['The Umayyad Mosque', 'উমাইয়া মসজিদ']],
    ['"Within it are men who love to purify themselves."', '"সেখানে এমন লোক আছে যারা পবিত্র থাকতে ভালোবাসে।"'], 'Quran 9:108; ' + BK + '3906');
  B.c(3, ['What is between the Prophet\'s ﷺ house and his minbar?', 'নবী ﷺ-এর ঘর ও তাঁর মিম্বারের মাঝখানে কী আছে?'], [['A garden of the gardens of Paradise', 'জান্নাতের বাগানগুলোর একটি বাগান'], ['A well', 'একটি কূপ'], ['A market', 'একটি বাজার']],
    ['"Between my house and my pulpit there is a garden of the gardens of Paradise."', '"আমার ঘর ও আমার মিম্বারের মাঝখানে জান্নাতের বাগানগুলোর একটি বাগান।"'], BK + '1196');
  B.c(3, ['Before the minbar was made, what did the Prophet ﷺ stand beside to give the khutbah?', 'মিম্বার তৈরির আগে নবী ﷺ কিসের পাশে দাঁড়িয়ে খুতবা দিতেন?'], [['The trunk of a date-palm', 'খেজুর গাছের একটি কাণ্ড'], ['A stone wall', 'পাথরের দেয়াল'], ['A tent pole', 'তাঁবুর খুঁটি']],
    ['When he used the minbar instead, the trunk cried, and he went to it and rubbed his hand over it.', 'তিনি মিম্বার ব্যবহার শুরু করলে কাণ্ডটি কেঁদে উঠল; তিনি গিয়ে তার ওপর হাত বুলিয়ে দিলেন।'], BK + '3583');
  B.c(3, ['From whom did the Prophet ﷺ ask to buy the land for his masjid in Madinah?', 'মদিনায় মসজিদের জমি নবী ﷺ কাদের কাছ থেকে কিনতে চেয়েছিলেন?'], [['Banu an-Najjar', 'বনু নাজ্জার'], ['Quraysh', 'কুরাইশ'], ['Banu Israil', 'বনি ইসরাইল']],
    ['They said: "We do not demand its price except from Allah."', 'তারা বলল: "আমরা এর মূল্য আল্লাহ ছাড়া কারও কাছে চাই না।"'], BK + '3932');
  B.c(3, ['Who are the ones to maintain the masjids of Allah?', 'আল্লাহর মসজিদ কারা আবাদ করে?'], [['Those who believe, pray, give zakah and fear only Allah', 'যারা ঈমান আনে, নামাজ পড়ে, যাকাত দেয় ও শুধু আল্লাহকে ভয় করে'], ['Only the rich', 'শুধু ধনীরা'], ['Only builders', 'শুধু রাজমিস্ত্রিরা']],
    ['"The mosques of Allah are only to be maintained by those who believe in Allah and the Last Day."', '"আল্লাহর মসজিদ তারাই আবাদ করে, যারা আল্লাহ ও শেষ দিনে ঈমান রাখে।"'], 'Quran 9:18');
  B.c(3, ['Among the seven shaded by Allah on the Day of Judgment is a man whose heart is attached to ...', 'কিয়ামতের দিন আল্লাহর ছায়া পাওয়া সাতজনের একজন, যার অন্তর লেগে থাকে ...'], [['the masjids', 'মসজিদের সঙ্গে'], ['the markets', 'বাজারের সঙ্গে'], ['his wealth', 'তার সম্পদের সঙ্গে']],
    ['"A man whose heart is attached to the mosques."', '"এমন ব্যক্তি, যার অন্তর মসজিদের সঙ্গে লেগে থাকে।"'], BK + '660');
  B.c(3, ['Which places are most disliked by Allah, while masjids are the most beloved?', 'মসজিদ আল্লাহর সবচেয়ে প্রিয় জায়গা; কোন জায়গা সবচেয়ে অপছন্দের?'], [['The markets', 'বাজার'], ['The fields', 'মাঠ'], ['The roads', 'রাস্তা']],
    ['"The parts most hateful to Allah are markets."', '"আল্লাহর কাছে সবচেয়ে অপছন্দের জায়গা বাজার।"'], MS + '671');
  B.c(3, ['Which caliph rebuilt the Prophet\'s ﷺ Masjid and quoted, "Whoever builds a masjid..."?', 'কোন খলিফা মসজিদে নববি পুনর্নির্মাণ করেন এবং বলেন, "যে মসজিদ নির্মাণ করে..."?'], [['Uthman', 'উসমান (রা.)'], ['Abu Bakr', 'আবু বকর (রা.)'], ['Ali', 'আলি (রা.)']],
    ['Abu Bakr did not alter it; Umar expanded it in the same way; Uthman rebuilt it.', 'আবু বকর (রা.) তা পরিবর্তন করেননি; উমর (রা.) একইভাবে বাড়ান; উসমান (রা.) পুনর্নির্মাণ করেন।'], BK + '450; ' + BK + '446');
  PLACES.slice(7).forEach(function (r, i) {
    var k = i + 7, w = [PLACES[(k + 2) % 13][2], PLACES[(k + 5) % 13][2], PLACES[(k + 8) % 13][2]].filter(function (x) { return x[0] !== r[2][0]; });
    B.c(3, ['In which country is ' + r[0][0].replace(/^The /, 'the ') + '?', r[0][1] + ' কোন দেশে?'], [r[2]].concat(w),
      [r[0][0] + ' is in ' + r[1][0] + '.', r[0][1] + ' ' + r[1][1] + '-এ অবস্থিত।'], GEO);
  });
  B.c(3, ['Which famous masjid in Mali is built of mud brick?', 'মালির কোন বিখ্যাত মসজিদ মাটির ইটে তৈরি?'], [PLACES[1][0], PLACES[2][0], PLACES[7][0], PLACES[5][0]],
    ['The Great Mosque of Djenne is the largest mud-brick building in the world.', 'জেন্নের বড় মসজিদ পৃথিবীর সবচেয়ে বড় মাটির ইটের ভবন।'], GEO);
  B.c(3, ['How many minarets does the Blue Mosque in Istanbul have?', 'ইস্তাম্বুলের ব্লু মস্কের কয়টি মিনার?'], [['Six', 'ছয়'], ['Two', 'দুই'], ['Four', 'চার'], ['One', 'এক']],
    ['The Sultan Ahmed Mosque is famous for its six minarets and blue tiles.', 'সুলতান আহমেদ মসজিদ ছয়টি মিনার ও নীল টাইলসের জন্য বিখ্যাত।'], GEO);
  B.c(3, ['Which masjid in Islamabad is shaped like a desert tent and has no dome?', 'ইসলামাবাদের কোন মসজিদ মরুভূমির তাঁবুর আকৃতির, যার কোনো গম্বুজ নেই?'], [PLACES[4][0], PLACES[10][0], PLACES[3][0], PLACES[8][0]],
    ['The Faisal Mosque has four tall minarets around a tent-shaped hall.', 'ফয়সাল মসজিদের তাঁবু আকৃতির মূল ভবনের চারপাশে চারটি উঁচু মিনার।'], GEO);
  B.c(3, ['Which masjid stands on the shore of the Atlantic Ocean in Casablanca?', 'কাসাব্লাঙ্কায় আটলান্টিক মহাসাগরের তীরে কোন মসজিদ দাঁড়িয়ে আছে?'], [PLACES[2][0], PLACES[9][0], PLACES[0][0], PLACES[6][0]],
    ['The Hassan II Mosque has one of the tallest minarets in the world.', 'দ্বিতীয় হাসান মসজিদের মিনার পৃথিবীর সবচেয়ে উঁচু মিনারগুলোর একটি।'], GEO);
  B.c(3, ['Which is the national masjid of Bangladesh?', 'বাংলাদেশের জাতীয় মসজিদ কোনটি?'], [PLACES[6][0], ['The Sixty Dome Mosque', 'ষাট গম্বুজ মসজিদ'], ['The Star Mosque', 'তারা মসজিদ'], PLACES[11][0]],
    ['Baitul Mukarram is in Dhaka.', 'বায়তুল মোকাররম ঢাকায় অবস্থিত।'], GEO);
  B.c(3, ['In which district of Bangladesh is the Sixty Dome Mosque?', 'ষাট গম্বুজ মসজিদ বাংলাদেশের কোন জেলায়?'], [['Bagerhat', 'বাগেরহাট'], ['Sylhet', 'সিলেট'], ['Rajshahi', 'রাজশাহী'], ['Chattogram', 'চট্টগ্রাম']],
    ['It was built in the time of Khan Jahan Ali and is a World Heritage Site.', 'এটি খান জাহান আলির আমলে নির্মিত এবং একটি বিশ্ব ঐতিহ্য।'], GEO);
  B.yn(3, ['Is the Istiqlal Mosque in Jakarta the largest masjid in Southeast Asia?', 'জাকার্তার ইস্তিকলাল মসজিদ কি দক্ষিণ-পূর্ব এশিয়ার সবচেয়ে বড় মসজিদ?'], true,
    ['Its name means "independence".', 'এর নামের অর্থ "স্বাধীনতা"।'], GEO);
  B.sort(3, ['One of the three masjids we may travel to specially, or not?', 'বিশেষ সফরের তিন মসজিদের একটি, নাকি নয়?'], [['One of the three', 'তিনটির একটি'], ['Not one of the three', 'তিনটির একটি নয়']],
    [['Al-Masjid al-Haram', 'মসজিদুল হারাম', 0], ['The Prophet\'s Masjid', 'মসজিদে নববি', 0], ['Al-Masjid al-Aqsa', 'মসজিদুল আকসা', 0], ['The Blue Mosque', 'ব্লু মস্ক', 1], ['The Faisal Mosque', 'ফয়সাল মসজিদ', 1], ['Baitul Mukarram', 'বায়তুল মোকাররম', 1]],
    ['"Do not undertake a journey to visit any mosque but three."', '"তিনটি মসজিদ ছাড়া অন্য কোনো মসজিদের উদ্দেশে সফর কোরো না।"'], MS + '1397');
  B.match(3, ['Match the masjid to the reward of one prayer in it.', 'মসজিদের সঙ্গে সেখানে এক নামাজের সওয়াব মেলাও।'],
    [[HARAM, ['Better than 100,000 prayers', 'এক লক্ষ নামাজের চেয়ে উত্তম']], [NABAWI, ['Better than 1,000 prayers', 'এক হাজার নামাজের চেয়ে উত্তম']], [['Any masjid, in congregation', 'যেকোনো মসজিদে জামাতে'], ['27 times a prayer alone', 'একা নামাজের ২৭ গুণ']]],
    ['The reward grows with the place and the congregation.', 'স্থান ও জামাতের কারণে সওয়াব বাড়ে।'], IM + '1406; ' + BK + '645');
  B.match(3, ['Match the masjid to its city.', 'মসজিদের সঙ্গে শহর মেলাও।'],
    [[PLACES[0][0], ['Istanbul', 'ইস্তাম্বুল']], [PLACES[7][0], ['Damascus', 'দামেস্ক']], [PLACES[8][0], ['Cairo', 'কায়রো']], [PLACES[10][0], ['Lahore', 'লাহোর']]],
    ['Four old cities and their great masjids.', 'চারটি প্রাচীন শহর ও তাদের বড় মসজিদ।'], GEO);
  B.order(3, ['How was the Prophet\'s ﷺ Masjid cared for? Put the caliphs in order.', 'মসজিদে নববির দেখভাল কীভাবে হয়েছিল? খলিফাদের ক্রমে সাজাও।'],
    [['Abu Bakr left it as it was', 'আবু বকর (রা.) যেমন ছিল তেমন রাখেন'], ['Umar expanded it in the same style', 'উমর (রা.) একই ধরনে বাড়ান'], ['Uthman rebuilt it', 'উসমান (রা.) পুনর্নির্মাণ করেন']],
    ['Abu Bakr did not alter it; Umar expanded it on the same pattern; then Uthman changed it.', 'আবু বকর (রা.) পরিবর্তন করেননি; উমর (রা.) একই নকশায় বাড়ান; এরপর উসমান (রা.) তা বদলান।'], BK + '446');

  KQ.define('masjids-world', { bank: B.list });
})();
