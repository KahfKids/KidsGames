/* Kahf KidsGames quiz engine: catalog.js
   Every quiz in the catalog: its name, shelf, map theme, number of stops and sticker cards. The catalog page
   (quizzes.html) draws its shelves from this list, and each quiz page takes its settings from its line here.
   A quiz's questions are in games/<id>/data.js. Pages are made from this list by tools/quiz-pages.js.
     shelf: 1 The Quran, 2 Living Islam, 3 The world.   bands: which age bands it has (default all three).
     cards: stickers won while playing; `p` is a picture key, `t` the name, `d` one true line about it. */
(function () {
  'use strict';
  var KQ = window.KahfQuiz = window.KahfQuiz || {};
  function t(en, bn) { return { en: en, bn: bn }; }
  function card(id, p, en, bn, den, dbn) { return { id: id, p: p, t: t(en, bn), d: t(den, dbn) }; }
  KQ.shelves = [t('The Quran', 'কুরআন'), t('Living Islam', 'ইসলামের পথে'), t('The world', 'আমাদের পৃথিবী')];
  KQ.catalog = [
    // ---------------- shelf 1: The Quran ----------------
    { id: 'quran-explorer', shelf: 1, title: t('Quran Explorer', 'কুরআন অভিযান'), theme: 'desert', stopName: t('Oasis', 'মরূদ্যান'), stops: 12, bossEvery: 6,
      desc: t('Surah names, numbers and facts about the Quran.', 'সূরার নাম, সংখ্যা আর কুরআনের নানা তথ্য।'), cards: [
        card('fatihah', 'quran', 'Al-Fatihah', 'আল-ফাতিহা', 'The first surah of the Quran. It has 7 ayat.', 'কুরআনের প্রথম সূরা। এতে ৭টি আয়াত আছে।'),
        card('baqarah', 'cow', 'Al-Baqarah', 'আল-বাকারা', 'The longest surah. It has 286 ayat.', 'সবচেয়ে বড় সূরা। এতে ২৮৬টি আয়াত আছে।'),
        card('kawthar', 'river', 'Al-Kawthar', 'আল-কাউসার', 'The shortest surah. It has 3 ayat.', 'সবচেয়ে ছোট সূরা। এতে ৩টি আয়াত আছে।'),
        card('juz', 'book', '114 surahs', '১১৪টি সূরা', 'The Quran has 114 surahs in 30 parts.', 'কুরআনে ১১৪টি সূরা আর ৩০টি পারা আছে।')] },
    { id: 'short-surahs', shelf: 1, title: t('Short Surahs', 'ছোট সূরা'), theme: 'masjid', stopName: t('Gate', 'দরজা'), stops: 12, bossEvery: 6,
      desc: t('Listen, learn and understand the short surahs of Juz Amma.', 'আমপারার ছোট সূরাগুলো শোনো, শেখো আর বোঝো।'), cards: [
        card('ikhlas', 'heart', 'Al-Ikhlas', 'আল-ইখলাস', 'Say: He is Allah, the One. (Quran 112:1)', 'বলো, তিনি আল্লাহ, এক ও অদ্বিতীয়। (কুরআন ১১২:১)'),
        card('falaq', 'dawn', 'Al-Falaq', 'আল-ফালাক', 'Al-Falaq means the daybreak. (Quran 113:1)', 'আল-ফালাক মানে ভোর। (কুরআন ১১৩:১)'),
        card('fil', 'elephant', 'Al-Fil', 'আল-ফীল', 'Al-Fil means the elephant. (Quran 105:1)', 'আল-ফীল মানে হাতি। (কুরআন ১০৫:১)'),
        card('nas', 'shield', 'An-Nas', 'আন-নাস', 'The last surah of the Quran. An-Nas means mankind.', 'কুরআনের শেষ সূরা। আন-নাস মানে মানুষ।')] },
    { id: 'stories-prophets', shelf: 1, title: t('Stories of the Prophets', 'নবীদের কাহিনি'), theme: 'stars', stopName: t('Star', 'তারা'), stops: 12, bossEvery: 6,
      desc: t('The prophets in the Quran, told through the ark, the whale, the staff and the well.', 'কুরআনের নবীদের কথা: নৌকা, মাছ, লাঠি আর কূপের গল্পে।'), cards: [
        card('ark', 'ark', 'The ark of Nuh', 'নূহ (আ.)-এর নৌকা', 'Nuh, peace be upon him, built the ark as Allah told him. (Quran 11:37)', 'আল্লাহর নির্দেশে নূহ (আ.) নৌকা বানিয়েছিলেন। (কুরআন ১১:৩৭)'),
        card('whale', 'whale', 'Yunus and the great fish', 'ইউনুস (আ.) ও বড় মাছ', 'Yunus called to Allah from the darkness, and Allah saved him. (Quran 21:87-88)', 'ইউনুস (আ.) অন্ধকারের ভেতর থেকে আল্লাহকে ডাকলেন, আর আল্লাহ তাঁকে রক্ষা করলেন। (কুরআন ২১:৮৭-৮৮)'),
        card('staff', 'staff', 'The staff of Musa', 'মূসা (আ.)-এর লাঠি', 'Musa struck the sea with his staff and it parted. (Quran 26:63)', 'মূসা (আ.) লাঠি দিয়ে সাগরে আঘাত করলেন, আর সাগর ভাগ হয়ে গেল। (কুরআন ২৬:৬৩)'),
        card('well', 'well', 'Yusuf and the well', 'ইউসুফ (আ.) ও কূপ', 'The brothers of Yusuf put him in a well. (Quran 12:15)', 'ইউসুফ (আ.)-এর ভাইয়েরা তাঁকে কূপে ফেলে দিয়েছিল। (কুরআন ১২:১৫)')] },
    { id: 'creation-quran', shelf: 1, title: t('Creation in the Quran', 'কুরআনে সৃষ্টিজগৎ'), theme: 'garden', stopName: t('Flower', 'ফুল'), stops: 12, bossEvery: 6,
      desc: t('Animals, plants, sky and water that the Quran speaks about.', 'কুরআনে বলা পশুপাখি, গাছপালা, আকাশ আর পানির কথা।'), cards: [
        card('bee', 'bee', 'The bee', 'মৌমাছি', 'Surah An-Nahl is named after the bee. Its honey has healing for people. (Quran 16:68-69)', 'সূরা আন-নাহলের নাম মৌমাছির নামে। মধুতে মানুষের জন্য আরোগ্য আছে। (কুরআন ১৬:৬৮-৬৯)'),
        card('ant', 'ant', 'The ant', 'পিঁপড়া', 'An ant warned the other ants when the army of Sulayman came. (Quran 27:18)', 'সুলাইমান (আ.)-এর বাহিনী এলে একটি পিঁপড়া অন্য পিঁপড়াদের সাবধান করেছিল। (কুরআন ২৭:১৮)'),
        card('mountain', 'mountain', 'Mountains', 'পাহাড়', 'Allah made the mountains like pegs. (Quran 78:7)', 'আল্লাহ পাহাড়কে পেরেকের মতো করেছেন। (কুরআন ৭৮:৭)'),
        card('rain', 'rain', 'Rain', 'বৃষ্টি', 'Allah sends down rain and gives life to the earth. (Quran 16:65)', 'আল্লাহ বৃষ্টি নামান আর মাটিকে জীবন দেন। (কুরআন ১৬:৬৫)')] },
    { id: 'quran-words', shelf: 1, title: t('Quran Words', 'কুরআনের শব্দ'), theme: 'library', stopName: t('Shelf', 'তাক'), stops: 12, bossEvery: 6,
      desc: t('Common words of the Quran and what they mean.', 'কুরআনের চেনা শব্দ আর তাদের অর্থ।'), cards: [
        card('rabb', 'quran', 'Rabb', 'রব', 'Rabb means Lord. "Rabbil-alamin" is "Lord of the worlds". (Quran 1:2)', 'রব মানে প্রতিপালক। "রাব্বিল আলামীন" মানে "জগৎসমূহের প্রতিপালক"। (কুরআন ১:২)'),
        card('shams', 'sun', 'Shams', 'শামস', 'Shams means sun. Surah 91 is Ash-Shams.', 'শামস মানে সূর্য। ৯১ নম্বর সূরা আশ-শামস।'),
        card('qamar', 'moon', 'Qamar', 'কামার', 'Qamar means moon. Surah 54 is Al-Qamar.', 'কামার মানে চাঁদ। ৫৪ নম্বর সূরা আল-কামার।'),
        card('qalam', 'pen', 'Qalam', 'কলম', 'Qalam means pen. Surah 68 is Al-Qalam.', 'কলম মানে কলম। ৬৮ নম্বর সূরা আল-কলম।')] },
    { id: 'arabic-letters', shelf: 1, title: t('Arabic Letters', 'আরবি হরফ'), theme: 'tree', stopName: t('Leaf', 'পাতা'), stops: 12, bossEvery: 6,
      desc: t('The 28 letters, their shapes and their marks.', '২৮টি হরফ, তাদের রূপ আর হরকত।'), cards: [
        card('letters', 'pen', '28 letters', '২৮টি হরফ', 'The Arabic alphabet has 28 letters.', 'আরবি বর্ণমালায় ২৮টি হরফ আছে।'),
        card('rtl', 'arrowl', 'Right to left', 'ডান থেকে বামে', 'Arabic is written from right to left.', 'আরবি লেখা হয় ডান দিক থেকে বাম দিকে।'),
        card('harakat', 'scroll', 'Harakat', 'হরকত', 'Fathah, kasrah and dammah are the short vowel marks.', 'ফাতহা (যবর), কাসরা (যের) আর দাম্মা (পেশ) হলো হরকত।'),
        card('alm', 'quran', 'Alif Lam Mim', 'আলিফ লাম মীম', 'Some surahs begin with letters, like Alif Lam Mim. (Quran 2:1)', 'কিছু সূরা হরফ দিয়ে শুরু হয়, যেমন আলিফ লাম মীম। (কুরআন ২:১)')] },
    { id: 'names-of-allah', shelf: 1, title: t('Names of Allah', 'আল্লাহর নাম'), theme: 'stars', stopName: t('Light', 'আলো'), stops: 12, bossEvery: 6,
      desc: t('The beautiful names of Allah and what they mean.', 'আল্লাহর সুন্দর নামগুলো আর তাদের অর্থ।'), cards: [
        card('rahman', 'heart', 'Ar-Rahman', 'আর-রহমান', 'The Most Merciful. (Quran 1:3)', 'পরম দয়াময়। (কুরআন ১:৩)'),
        card('khaliq', 'earth', 'Al-Khaliq', 'আল-খালিক', 'The Creator. (Quran 59:24)', 'সৃষ্টিকর্তা। (কুরআন ৫৯:২৪)'),
        card('razzaq', 'dates', 'Ar-Razzaq', 'আর-রাযযাক', 'The Provider. (Quran 51:58)', 'রিজিকদাতা। (কুরআন ৫১:৫৮)'),
        card('salam', 'dawn', 'As-Salam', 'আস-সালাম', 'The Source of Peace. (Quran 59:23)', 'শান্তিদাতা। (কুরআন ৫৯:২৩)')] },
    { id: 'tajweed-basics', shelf: 1, title: t('Tajweed Basics', 'তাজবিদের প্রথম পাঠ'), theme: 'library', stopName: t('Sign', 'চিহ্ন'), stops: 10, bossEvery: 5, bands: [2, 3],
      desc: t('The first rules of reciting the Quran beautifully.', 'সুন্দর করে কুরআন পড়ার প্রথম নিয়মগুলো।'), cards: [
        card('tartil', 'quran', 'Tartil', 'তারতীল', 'Recite the Quran slowly and clearly. (Quran 73:4)', 'কুরআন ধীরে ধীরে, স্পষ্ট করে পড়ো। (কুরআন ৭৩:৪)'),
        card('qalqalah', 'drop', 'Qalqalah', 'কলকলা', 'Five letters bounce when they have sukun: qaf, ta, ba, jim, dal.', 'পাঁচটি হরফে সাকিন হলে প্রতিধ্বনি হয়: ক্বাফ, ত্বা, বা, জীম, দাল।'),
        card('madd', 'arrowr', 'Madd', 'মাদ', 'Alif, waw and ya can stretch a sound.', 'আলিফ, ওয়াও আর ইয়া আওয়াজকে টেনে লম্বা করতে পারে।'),
        card('ghunnah', 'nose', 'Ghunnah', 'গুন্নাহ', 'Ghunnah is the sound that comes through the nose in nun and mim.', 'গুন্নাহ হলো নূন ও মীমের নাকের আওয়াজ।')] },

    // ---------------- shelf 2: Living Islam ----------------
    { id: 'ramadan-nights', shelf: 2, title: t('Ramadan Nights', 'রমজানের রাত'), theme: 'night', stopName: t('Night', 'রাত'), stops: 30, bossEvery: 10,
      desc: t('Light thirty lanterns, one for each night of Ramadan.', 'রমজানের প্রতি রাতে একটি করে, ত্রিশটি লণ্ঠন জ্বালাও।'), cards: [
        card('dates', 'dates', 'Dates', 'খেজুর', 'The Prophet ﷺ broke his fast with fresh dates. (Abu Dawud 2356)', 'নবী ﷺ তাজা খেজুর দিয়ে ইফতার করতেন। (আবু দাউদ ২৩৫৬)'),
        card('moon', 'crescent', 'The new moon', 'নতুন চাঁদ', 'Fasting starts when the new moon is seen. (Bukhari 1909)', 'নতুন চাঁদ দেখে রোজা শুরু হয়। (বুখারি ১৯০৯)'),
        card('quran', 'quran', 'The Quran', 'কুরআন', 'The Quran was sent down in the month of Ramadan. (Quran 2:185)', 'রমজান মাসে কুরআন নাজিল হয়েছে। (কুরআন ২:১৮৫)'),
        card('qadr', 'night', 'Laylat al-Qadr', 'লাইলাতুল কদর', 'The Night of Decree is better than a thousand months. (Quran 97:3)', 'কদরের রাত হাজার মাসের চেয়েও উত্তম। (কুরআন ৯৭:৩)'),
        card('rayyan', 'gate', 'Ar-Rayyan', 'আর-রাইয়ান', 'Those who fast will enter Paradise through a gate called Ar-Rayyan. (Bukhari 1896)', 'রোজাদাররা আর-রাইয়ান নামের দরজা দিয়ে জান্নাতে যাবে। (বুখারি ১৮৯৬)')] },
    { id: 'salah-wudu', shelf: 2, title: t('Salah and Wudu', 'নামাজ ও অজু'), theme: 'masjid', stopName: t('Step', 'ধাপ'), stops: 12, bossEvery: 6,
      desc: t('The five prayers, their times and how to get ready for them.', 'পাঁচ ওয়াক্ত নামাজ, তাদের সময় আর প্রস্তুতি।'), cards: [
        card('wudu', 'tap', 'Wudu', 'অজু', 'Before salah we wash the face, the arms, wipe the head and wash the feet. (Quran 5:6)', 'নামাজের আগে আমরা মুখ ও হাত ধুই, মাথা মাসেহ করি আর পা ধুই। (কুরআন ৫:৬)'),
        card('five', 'mat', 'Five prayers', 'পাঁচ ওয়াক্ত নামাজ', 'Muslims pray five times every day. (Bukhari 8)', 'মুসলিমরা প্রতিদিন পাঁচ ওয়াক্ত নামাজ পড়ে। (বুখারি ৮)'),
        card('adhan', 'minaret', 'The adhan', 'আজান', 'The adhan calls people to the prayer.', 'আজান মানুষকে নামাজের দিকে ডাকে।'),
        card('qiblah', 'kaaba', 'The qiblah', 'কিবলা', 'We face the Kabah when we pray. (Quran 2:144)', 'আমরা কাবার দিকে মুখ করে নামাজ পড়ি। (কুরআন ২:১৪৪)')] },
    { id: 'pillars-beliefs', shelf: 2, title: t('Pillars and Beliefs', 'ইসলামের স্তম্ভ ও ঈমান'), theme: 'masjid', stopName: t('Arch', 'খিলান'), stops: 12, bossEvery: 6,
      desc: t('The five pillars of Islam and the six pillars of iman.', 'ইসলামের পাঁচ স্তম্ভ আর ঈমানের ছয় বিষয়।'), cards: [
        card('shahadah', 'heart', 'Shahadah', 'শাহাদাহ', 'There is no god but Allah, and Muhammad ﷺ is the Messenger of Allah. (Bukhari 8)', 'আল্লাহ ছাড়া কোনো ইলাহ নেই, আর মুহাম্মদ ﷺ আল্লাহর রাসূল। (বুখারি ৮)'),
        card('zakah', 'coins', 'Zakah', 'যাকাত', 'Giving a share of wealth to those in need. (Bukhari 8)', 'সম্পদের একটি অংশ অভাবীদের দেওয়া। (বুখারি ৮)'),
        card('sawm', 'crescent', 'Sawm', 'রোজা', 'Fasting in the month of Ramadan. (Bukhari 8)', 'রমজান মাসে রোজা রাখা। (বুখারি ৮)'),
        card('hajj', 'kaaba', 'Hajj', 'হজ', 'The journey to the House of Allah in Makkah. (Bukhari 8)', 'মক্কায় আল্লাহর ঘরে হজের সফর। (বুখারি ৮)')] },
    { id: 'life-of-prophet', shelf: 2, title: t('Life of the Prophet ﷺ', 'নবীজির ﷺ জীবন'), theme: 'desert', stopName: t('Step', 'ধাপ'), stops: 12, bossEvery: 6,
      desc: t('From Makkah to Madinah: the life of the Prophet Muhammad ﷺ.', 'মক্কা থেকে মদিনা: নবী মুহাম্মদ ﷺ-এর জীবন।'), cards: [
        card('hira', 'cave', 'The cave of Hira', 'হেরা গুহা', 'The first revelation came to him in the cave of Hira. (Bukhari 3)', 'হেরা গুহায় তাঁর কাছে প্রথম ওহি এসেছিল। (বুখারি ৩)'),
        card('iqra', 'quran', 'Iqra', 'ইকরা', 'The first word revealed was "Read". (Quran 96:1)', 'প্রথম নাজিল হওয়া শব্দ ছিল "পড়ো"। (কুরআন ৯৬:১)'),
        card('makkah', 'kaaba', 'Makkah', 'মক্কা', 'The Prophet ﷺ was born in Makkah.', 'নবী ﷺ মক্কায় জন্মগ্রহণ করেন।'),
        card('madinah', 'mosque', 'Madinah', 'মদিনা', 'He migrated to Madinah and built his masjid there. (Bukhari 3906)', 'তিনি মদিনায় হিজরত করেন আর সেখানে মসজিদ বানান। (বুখারি ৩৯০৬)')] },
    { id: 'good-manners-duas', shelf: 2, title: t('Good Manners and Duas', 'সুন্দর আচরণ ও দোয়া'), theme: 'street', stopName: t('House', 'বাড়ি'), stops: 12, bossEvery: 6,
      desc: t('What would you do? Kind choices and the duas for every moment.', 'তুমি হলে কী করতে? ভালো কাজ আর প্রতিদিনের দোয়া।'), cards: [
        card('salam', 'heart', 'Salam', 'সালাম', 'Spread salam among yourselves. (Muslim 54)', 'নিজেদের মধ্যে সালামের প্রসার করো। (মুসলিম ৫৪)'),
        card('right', 'hand', 'The right hand', 'ডান হাত', 'Say the name of Allah and eat with your right hand. (Bukhari 5376)', 'আল্লাহর নাম নাও আর ডান হাতে খাও। (বুখারি ৫৩৭৬)'),
        card('truth', 'yes', 'Truth', 'সত্য', 'Truthfulness leads to goodness. (Bukhari 6094)', 'সত্য কথা ভালো কাজের দিকে নিয়ে যায়। (বুখারি ৬০৯৪)'),
        card('parents', 'gift', 'Parents', 'মা-বাবা', 'Be good to your parents. (Quran 17:23)', 'মা-বাবার সঙ্গে ভালো ব্যবহার করো। (কুরআন ১৭:২৩)')] },
    { id: 'hajj-journey', shelf: 2, title: t('Hajj Journey', 'হজের সফর'), theme: 'desert', stopName: t('Step', 'ধাপ'), stops: 10, bossEvery: 5,
      desc: t('Walk the steps of Hajj, place by place.', 'হজের ধাপগুলো একটি একটি করে পার হও।'), cards: [
        card('tawaf', 'kaaba', 'Tawaf', 'তাওয়াফ', 'Pilgrims go around the Kabah seven times. (Quran 22:29)', 'হাজিরা কাবার চারপাশে সাতবার ঘোরেন। (কুরআন ২২:২৯)'),
        card('arafah', 'mountain', 'Arafah', 'আরাফা', 'Hajj is Arafah. (Tirmidhi 889)', 'হজ হলো আরাফা। (তিরমিযি ৮৮৯)'),
        card('mina', 'tent', 'Mina', 'মিনা', 'Pilgrims stay in tents at Mina.', 'হাজিরা মিনায় তাঁবুতে থাকেন।'),
        card('zamzam', 'well', 'Zamzam', 'জমজম', 'The well of Zamzam is beside the Kabah. (Bukhari 3364)', 'জমজম কূপ কাবার পাশে। (বুখারি ৩৩৬৪)')] },
    { id: 'hadith-kids', shelf: 2, title: t('Hadith for Kids', 'ছোটদের হাদিস'), theme: 'tree', stopName: t('Leaf', 'পাতা'), stops: 12, bossEvery: 6,
      desc: t('Short sayings of the Prophet ﷺ to live by.', 'নবীজির ﷺ ছোট ছোট হাদিস, মেনে চলার জন্য।'), cards: [
        card('niyyah', 'heart', 'Intentions', 'নিয়ত', 'Actions are judged by intentions. (Bukhari 1)', 'সব কাজ নিয়তের ওপর নির্ভর করে। (বুখারি ১)'),
        card('word', 'yes', 'A good word', 'ভালো কথা', 'A good word is charity. (Bukhari 2989)', 'ভালো কথা বলাও সদকা। (বুখারি ২৯৮৯)'),
        card('purity', 'drop', 'Purity', 'পবিত্রতা', 'Purity is half of faith. (Muslim 223)', 'পবিত্রতা ঈমানের অর্ধেক। (মুসলিম ২২৩)'),
        card('tree', 'tree', 'Planting', 'গাছ লাগানো', 'When a Muslim plants a tree and a bird, a person or an animal eats from it, it is charity for him. (Bukhari 2320)', 'কোনো মুসলিম গাছ লাগালে, তা থেকে পাখি, মানুষ বা পশু খেলে তা তার জন্য সদকা। (বুখারি ২৩২০)')] },
    { id: 'sunnah-every-day', shelf: 2, title: t('Sunnah Every Day', 'প্রতিদিনের সুন্নাহ'), theme: 'street', stopName: t('House', 'বাড়ি'), stops: 12, bossEvery: 6,
      desc: t('A day lived the way the Prophet ﷺ taught, from waking to sleeping.', 'ঘুম থেকে ওঠা থেকে ঘুমানো পর্যন্ত, নবীজির ﷺ শেখানো পথে একটি দিন।'), cards: [
        card('siwak', 'miswak', 'Siwak', 'মিসওয়াক', 'The siwak cleans the mouth and pleases the Lord. (Nasai 5)', 'মিসওয়াক মুখ পরিষ্কার করে আর রবকে সন্তুষ্ট করে। (নাসাঈ ৫)'),
        card('shoes', 'shoe', 'Shoes', 'জুতা', 'Put on the right shoe first, and take off the left one first. (Bukhari 5855)', 'জুতা পরার সময় আগে ডান পা, খোলার সময় আগে বাম পা। (বুখারি ৫৮৫৫)'),
        card('sleep', 'bed', 'Sleeping', 'ঘুম', 'The Prophet ﷺ lay down on his right side to sleep. (Bukhari 6315)', 'নবী ﷺ ডান কাতে শুয়ে ঘুমাতেন। (বুখারি ৬৩১৫)'),
        card('water', 'water', 'Drinking', 'পানি পান', 'Do not drink in one gulp. Breathe outside the cup. (Bukhari 5631)', 'এক নিঃশ্বাসে পান কোরো না; পাত্রের বাইরে শ্বাস নাও। (বুখারি ৫৬৩১)')] },
    { id: 'companions', shelf: 2, title: t('Companions and Great Women of Islam', 'সাহাবি ও মহীয়সী নারী'), theme: 'desert', stopName: t('Step', 'ধাপ'), stops: 10, bossEvery: 5,
      desc: t('The people around the Prophet ﷺ and what they are known for.', 'নবীজির ﷺ সঙ্গীরা আর তাঁদের পরিচয়।'), cards: [
        card('abubakr', 'cave', 'Abu Bakr', 'আবু বকর (রা.)', 'He was with the Prophet ﷺ in the cave during the Hijrah. (Quran 9:40)', 'হিজরতের সময় তিনি গুহায় নবী ﷺ-এর সঙ্গে ছিলেন। (কুরআন ৯:৪০)'),
        card('bilal', 'minaret', 'Bilal', 'বিলাল (রা.)', 'Bilal was told to call the adhan. (Bukhari 603)', 'বিলাল (রা.)-কে আজান দিতে বলা হয়েছিল। (বুখারি ৬০৩)'),
        card('khadijah', 'heart', 'Khadijah', 'খাদিজা (রা.)', 'She comforted the Prophet ﷺ after the first revelation. (Bukhari 3)', 'প্রথম ওহির পর তিনি নবী ﷺ-কে সান্ত্বনা দিয়েছিলেন। (বুখারি ৩)'),
        card('aishah', 'scroll', 'Aishah', 'আয়েশা (রা.)', 'She passed on a great many hadith of the Prophet ﷺ.', 'তিনি নবী ﷺ-এর অনেক হাদিস বর্ণনা করেছেন।')] },
    { id: 'islamic-months-eid', shelf: 2, title: t('Islamic Months and Eid', 'হিজরি মাস ও ঈদ'), theme: 'night', stopName: t('Moon', 'চাঁদ'), stops: 12, bossEvery: 6,
      desc: t('The twelve months of the Islamic year, the moon and the two Eids.', 'হিজরি বছরের বারো মাস, চাঁদ আর দুই ঈদ।'), cards: [
        card('twelve', 'calendar', 'Twelve months', 'বারো মাস', 'The number of months with Allah is twelve. (Quran 9:36)', 'আল্লাহর কাছে মাসের সংখ্যা বারো। (কুরআন ৯:৩৬)'),
        card('fitr', 'gift', 'Eid al-Fitr', 'ঈদুল ফিতর', 'Eid al-Fitr is on the first day of Shawwal, after Ramadan.', 'রমজানের পর শাওয়ালের প্রথম দিনে ঈদুল ফিতর।'),
        card('adha', 'sheep', 'Eid al-Adha', 'ঈদুল আযহা', 'Eid al-Adha is on the tenth day of Dhul-Hijjah.', 'জিলহজের দশ তারিখে ঈদুল আযহা।'),
        card('moon', 'crescent', 'The new moon', 'নতুন চাঁদ', 'Each Islamic month begins with the new moon. (Quran 2:189)', 'প্রতিটি হিজরি মাস নতুন চাঁদ দিয়ে শুরু হয়। (কুরআন ২:১৮৯)')] },
    { id: 'masjids-world', shelf: 2, title: t('Masjids of the World', 'পৃথিবীর মসজিদ'), theme: 'masjid', stopName: t('Masjid', 'মসজিদ'), stops: 10, bossEvery: 5,
      desc: t('Famous masjids, where they are and the parts of a masjid.', 'বিখ্যাত মসজিদ, তাদের ঠিকানা আর মসজিদের নানা অংশ।'), cards: [
        card('haram', 'kaaba', 'Al-Masjid al-Haram', 'মসজিদুল হারাম', 'It is in Makkah, and the Kabah is inside it.', 'এটি মক্কায়; এর ভেতরে কাবা।'),
        card('nabawi', 'mosque', 'The Prophet’s Masjid', 'মসজিদে নববি', 'It is in Madinah.', 'এটি মদিনায়।'),
        card('aqsa', 'gate', 'Al-Masjid al-Aqsa', 'মসজিদুল আকসা', 'It is in Jerusalem. (Quran 17:1)', 'এটি জেরুজালেমে। (কুরআন ১৭:১)'),
        card('quba', 'palm', 'Masjid Quba', 'মসজিদে কুবা', 'The Prophet ﷺ used to visit Masjid Quba every Saturday. (Bukhari 1193)', 'নবী ﷺ প্রতি শনিবার মসজিদে কুবায় যেতেন। (বুখারি ১১৯৩)')] },

    // ---------------- shelf 3: The world ----------------
    { id: 'number-garden', shelf: 3, title: t('Number Garden', 'সংখ্যার বাগান'), theme: 'garden', stopName: t('Flower', 'ফুল'), stops: 15, bossEvery: 5,
      desc: t('Count, add, share and solve. New sums every time.', 'গোনো, যোগ করো, ভাগ করো। প্রতিবার নতুন অঙ্ক।'), cards: [
        card('ten', 'dots-10', 'Ten', 'দশ', 'Ten ones make one ten.', 'দশটি এক মিলে হয় এক দশ।'),
        card('even', 'many-apple-4', 'Even numbers', 'জোড় সংখ্যা', 'Even numbers can be shared equally between two.', 'জোড় সংখ্যাকে দুজনের মধ্যে সমান ভাগ করা যায়।'),
        card('hexagon', 'hexagon', 'Hexagon', 'ষড়ভুজ', 'A hexagon has six sides.', 'ষড়ভুজের ছয়টি বাহু।'),
        card('half', 'circle', 'Half', 'অর্ধেক', 'Half means one of two equal parts.', 'অর্ধেক মানে সমান দুই ভাগের এক ভাগ।'),
        card('zero', 'egg', 'Zero', 'শূন্য', 'Any number times zero is zero.', 'যেকোনো সংখ্যাকে শূন্য দিয়ে গুণ করলে শূন্য হয়।')] },
    { id: 'world-explorer', shelf: 3, title: t('World Explorer', 'বিশ্ব অভিযান'), theme: 'sea', stopName: t('Port', 'বন্দর'), stops: 12, bossEvery: 6,
      desc: t('Continents, oceans, countries and famous places.', 'মহাদেশ, মহাসাগর, দেশ আর বিখ্যাত জায়গা।'), cards: [
        card('continents', 'earth', 'Seven continents', 'সাত মহাদেশ', 'The Earth has seven continents and five oceans.', 'পৃথিবীতে সাতটি মহাদেশ আর পাঁচটি মহাসাগর আছে।'),
        card('everest', 'mountain', 'Mount Everest', 'মাউন্ট এভারেস্ট', 'The highest mountain on Earth, in the Himalayas.', 'পৃথিবীর সবচেয়ে উঁচু পাহাড়, হিমালয়ে।'),
        card('sahara', 'desert', 'The Sahara', 'সাহারা', 'The largest hot desert in the world, in Africa.', 'পৃথিবীর সবচেয়ে বড় উষ্ণ মরুভূমি, আফ্রিকায়।'),
        card('pacific', 'sea', 'The Pacific', 'প্রশান্ত মহাসাগর', 'The largest and deepest ocean.', 'সবচেয়ে বড় ও গভীর মহাসাগর।')] },
    { id: 'nature-science', shelf: 3, title: t('Nature and Science', 'প্রকৃতি ও বিজ্ঞান'), theme: 'space', stopName: t('Planet', 'গ্রহ'), stops: 12, bossEvery: 6,
      desc: t('The body, living things, the earth and weather, and space.', 'শরীর, জীবজগৎ, পৃথিবী ও আবহাওয়া, আর মহাকাশ।'), cards: [
        card('plants', 'sprout', 'Plants', 'গাছ', 'Plants make their food from sunlight, water and air.', 'গাছ সূর্যের আলো, পানি আর বাতাস দিয়ে নিজের খাবার বানায়।'),
        card('saturn', 'planet', 'Saturn', 'শনি', 'Saturn has bright rings made of ice and rock.', 'শনির উজ্জ্বল বলয় বরফ আর পাথরে তৈরি।'),
        card('butterfly', 'butterfly', 'A new shape', 'রূপ বদল', 'A caterpillar changes into a butterfly.', 'শুঁয়োপোকা বদলে প্রজাপতি হয়।'),
        card('magnet', 'magnet', 'Magnets', 'চুম্বক', 'A magnet pulls things made of iron.', 'চুম্বক লোহার জিনিস টানে।')] },
    { id: 'time-travellers', shelf: 3, title: t('Time Travellers', 'সময়ের যাত্রী'), theme: 'road', stopName: t('Milestone', 'মাইলফলক'), stops: 10, bossEvery: 5, bands: [2, 3],
      desc: t('A road through history, with Muslim scholars and great inventions.', 'ইতিহাসের পথে যাত্রা: মুসলিম বিজ্ঞানী আর বড় বড় আবিষ্কার।'), cards: [
        card('wheel', 'wheel', 'The wheel', 'চাকা', 'People began using wheels more than 5,000 years ago.', 'মানুষ পাঁচ হাজার বছরেরও আগে চাকা ব্যবহার শুরু করে।'),
        card('pyramid', 'pyramid', 'The pyramids', 'পিরামিড', 'The great pyramids of Egypt are about 4,500 years old.', 'মিসরের বড় পিরামিডগুলো প্রায় সাড়ে চার হাজার বছরের পুরোনো।'),
        card('wisdom', 'book', 'House of Wisdom', 'বাইতুল হিকমা', 'In Baghdad, scholars gathered, translated and wrote books of science.', 'বাগদাদে পণ্ডিতরা একত্র হয়ে বিজ্ঞানের বই অনুবাদ ও রচনা করতেন।'),
        card('moon', 'rocket', 'Moon landing', 'চাঁদে মানুষ', 'People first walked on the Moon in 1969.', 'মানুষ প্রথম চাঁদে হাঁটে ১৯৬৯ সালে।')] },
    { id: 'think-it-through', shelf: 3, title: t('Think It Through', 'ভেবে দেখো'), theme: 'workshop', stopName: t('Lock', 'তালা'), stops: 15, bossEvery: 5,
      desc: t('Patterns, odd one out and puzzles that open locks.', 'প্যাটার্ন, বেমানান খোঁজা আর ধাঁধা; তালা খোলো বুদ্ধি দিয়ে।'), cards: [
        card('key', 'key', 'The key', 'চাবি', 'Every pattern has a rule. Find the rule and you have the key.', 'প্রতিটি প্যাটার্নের একটি নিয়ম থাকে। নিয়মটি পেলে চাবি তোমার হাতে।'),
        card('gear', 'gear', 'Step by step', 'ধাপে ধাপে', 'Big puzzles are solved one small step at a time.', 'বড় ধাঁধা ছোট ছোট ধাপে মেলে।'),
        card('bulb', 'bulb', 'Check it', 'মিলিয়ে দেখো', 'A good thinker checks the answer again.', 'ভালো চিন্তাবিদ উত্তরটি আবার মিলিয়ে দেখে।'),
        card('lock', 'lock', 'Odd one out', 'বেমানান', 'To find the odd one, ask what the others share.', 'বেমানানটি খুঁজতে দেখো, বাকিদের মিল কোথায়।'),
        card('medal', 'medal', 'Puzzle master', 'ধাঁধার ওস্তাদ', 'You opened every lock!', 'তুমি সব তালা খুলে ফেলেছ!')] },
    { id: 'words-bangla-english', shelf: 3, title: t('Words: Bangla and English', 'শব্দের হাট: বাংলা ও ইংরেজি'), theme: 'street', stopName: t('Stall', 'দোকান'), stops: 12, bossEvery: 6,
      desc: t('Picture words, opposites and spelling in two languages.', 'ছবি দেখে শব্দ, বিপরীত শব্দ আর বানান, দুই ভাষায়।'), cards: [
        card('book', 'book', 'Book', 'বই', 'Book in Bangla is "boi".', 'বই ইংরেজিতে "book"।'),
        card('apple', 'apple', 'Apple', 'আপেল', 'Apple begins with the letter A.', 'আপেল শব্দের প্রথম অক্ষর আ।'),
        card('pencil', 'pencil', 'Opposites', 'বিপরীত শব্দ', 'Big and small are opposites.', 'বড় আর ছোট বিপরীত শব্দ।'),
        card('sun', 'sun', 'Sun', 'সূর্য', 'Sun in Bangla is "shurjo".', 'সূর্য ইংরেজিতে "sun"।')] },
    { id: 'animals-world', shelf: 3, title: t('Animals of the World', 'পৃথিবীর প্রাণী'), theme: 'tree', stopName: t('Trail', 'পথ'), stops: 12, bossEvery: 6,
      desc: t('Where animals live, what they eat and what makes them special.', 'প্রাণীরা কোথায় থাকে, কী খায় আর কেন তারা আলাদা।'), cards: [
        card('elephant', 'elephant', 'Elephant', 'হাতি', 'The elephant is the largest animal on land.', 'হাতি স্থলের সবচেয়ে বড় প্রাণী।'),
        card('whale', 'whale', 'Blue whale', 'নীল তিমি', 'The blue whale is the largest animal that has ever lived.', 'নীল তিমি এ পর্যন্ত বেঁচে থাকা সবচেয়ে বড় প্রাণী।'),
        card('camel', 'camel', 'Camel', 'উট', 'A camel can go many days without drinking water.', 'উট পানি না খেয়ে অনেক দিন থাকতে পারে।'),
        card('penguin', 'penguin', 'Penguin', 'পেঙ্গুইন', 'Penguins are birds that swim but cannot fly.', 'পেঙ্গুইন পাখি; এরা সাঁতার কাটে, কিন্তু উড়তে পারে না।')] },
    { id: 'healthy-me', shelf: 3, title: t('Healthy Me', 'সুস্থ আমি'), theme: 'street', stopName: t('Day', 'দিন'), stops: 12, bossEvery: 6,
      desc: t('Good habits for a clean, strong and rested body.', 'পরিষ্কার, সবল আর সতেজ শরীরের ভালো অভ্যাস।'), cards: [
        card('soap', 'soap', 'Clean hands', 'পরিষ্কার হাত', 'Wash your hands with soap for 20 seconds.', 'সাবান দিয়ে ২০ সেকেন্ড হাত ধোও।'),
        card('teeth', 'toothbrush', 'Teeth', 'দাঁত', 'Brush your teeth twice a day.', 'দিনে দুবার দাঁত মাজো।'),
        card('fruit', 'apple', 'Fruit', 'ফল', 'Fruit and vegetables help your body stay strong.', 'ফল আর সবজি শরীরকে সবল রাখে।'),
        card('sleep', 'bed', 'Sleep', 'ঘুম', 'Children need a long night of sleep to grow.', 'বেড়ে ওঠার জন্য শিশুদের রাতে লম্বা ঘুম দরকার।')] },
    { id: 'time-and-money', shelf: 3, title: t('Time and Money', 'সময় ও টাকা'), theme: 'road', stopName: t('Hour', 'ঘণ্টা'), stops: 15, bossEvery: 5,
      desc: t('Read the clock, know the days and months, count coins and give change.', 'ঘড়ি দেখো, দিন-মাস চেনো, টাকা গোনো আর ভাংতি দাও।'), cards: [
        card('hour', 'clock', 'One hour', 'এক ঘণ্টা', 'One hour has 60 minutes.', 'এক ঘণ্টায় ৬০ মিনিট।'),
        card('week', 'calendar', 'One week', 'এক সপ্তাহ', 'One week has 7 days.', 'এক সপ্তাহে ৭ দিন।'),
        card('coin', 'coin', 'Saving', 'সঞ্চয়', 'Small coins saved every day grow into a lot.', 'প্রতিদিন অল্প অল্প জমালে অনেক হয়।'),
        card('year', 'sun', 'One year', 'এক বছর', 'One year has 12 months.', 'এক বছরে ১২ মাস।'),
        card('change', 'note', 'Change', 'ভাংতি', 'Change is what you get back when you pay more than the price.', 'দামের চেয়ে বেশি দিলে যা ফেরত পাও, তা-ই ভাংতি।')] },

    // ---------------- every day ----------------
    { id: 'todays-five', shelf: 0, daily: true, title: t('Today’s Five', 'আজকের পাঁচ'), theme: 'garden', stopName: t('Day', 'দিন'), stops: 30,
      desc: t('Five mixed questions a day from the quizzes you have played.', 'তোমার খেলা কুইজগুলো থেকে প্রতিদিন পাঁচটি প্রশ্ন।') }
  ];
})();
