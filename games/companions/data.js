/* Companions and Great Women of Islam: data.js — the question bank.
   The people around the Prophet ﷺ and what the Quran and the sahih narrations say about them.
   Every source was read before its question was written.
   band: 1 = ages 4-6 (pictures), 2 = ages 7-9, 3 = ages 10-12. */
(function () {
  'use strict';
  var KQ = window.KahfQuiz, B = KQ.bank('co');
  function P(en, bn, p) { return [en, bn, p]; }
  var BK = 'Sahih al-Bukhari ', MS = 'Sahih Muslim ', TI = 'Jami` at-Tirmidhi ', IM = 'Sunan Ibn Majah ';
  var ABU = ['Abu Bakr', 'আবু বকর (রা.)'], UMAR = ['Umar', 'উমর (রা.)'], UTH = ['Uthman', 'উসমান (রা.)'], ALI = ['Ali', 'আলি (রা.)'],
    BIL = ['Bilal', 'বিলাল (রা.)'], KHA = ['Khadijah', 'খাদিজা (রা.)'], AIS = ['Aishah', 'আয়েশা (রা.)'], FAT = ['Fatimah', 'ফাতিমা (রা.)'],
    HUR = ['Abu Hurairah', 'আবু হুরাইরা (রা.)'], ANAS = ['Anas', 'আনাস (রা.)'], KHAL = ['Khalid ibn al-Walid', 'খালিদ ইবনুল ওয়ালিদ (রা.)'],
    UBA = ['Abu Ubaydah', 'আবু উবাইদা (রা.)'], MUADH = ['Muadh ibn Jabal', 'মুআয ইবনে জাবাল (রা.)'], ZAYD = ['Zayd ibn Thabit', 'যায়দ ইবনে সাবিত (রা.)'],
    UBAY = ['Ubayy ibn Kab', 'উবাই ইবনে কাব (রা.)'], ASMA = ['Asma bint Abi Bakr', 'আসমা বিনতে আবু বকর (রা.)'], MUS = ['Musab ibn Umayr', 'মুসআব ইবনে উমাইর (রা.)'],
    ZUB = ['Az-Zubayr', 'যুবাইর (রা.)'], TAL = ['Talhah', 'তালহা (রা.)'], SAD = ['Sad ibn Muadh', 'সাদ ইবনে মুআয (রা.)'], HAF = ['Hafsah', 'হাফসা (রা.)'],
    IBA = ['Ibn Abbas', 'ইবনে আব্বাস (রা.)'], MAR = ['Maryam', 'মারইয়াম (আ.)'], ASI = ['Asiyah', 'আসিয়া (আ.)'];

  // ---------- band 1 ----------
  B.c(1, ['Who was with the Prophet ﷺ in the cave?', 'গুহায় নবী ﷺ-এর সঙ্গে কে ছিলেন?'], [ABU, BIL, ANAS],
    ['"Do not grieve; indeed Allah is with us," he said to his companion in the cave.', 'গুহায় তিনি তাঁর সঙ্গীকে বললেন, "চিন্তা কোরো না, আল্লাহ আমাদের সঙ্গে আছেন।"'], 'Quran 9:40; ' + BK + '3653');
  B.c(1, ['Where did Abu Bakr and the Prophet ﷺ hide on the Hijrah?', 'হিজরতের সময় আবু বকর (রা.) ও নবী ﷺ কোথায় আশ্রয় নিয়েছিলেন?'], [P('A cave', 'গুহা', 'cave'), P('A ship', 'জাহাজ', 'ship'), P('A tent', 'তাঁবু', 'tent')],
    ['"...when they were in the cave."', '"...যখন তাঁরা দুজন গুহায় ছিলেন।"'], 'Quran 9:40');
  B.c(1, ['Who was told to call the adhan?', 'কাকে আজান দিতে বলা হয়েছিল?'], [BIL, UTH, HUR],
    ['Allah\'s Messenger ﷺ ordered Bilal to get up and pronounce the adhan.', 'রাসুলুল্লাহ ﷺ বিলাল (রা.)-কে উঠে আজান দিতে আদেশ করেছিলেন।'], BK + '604');
  B.c(1, ['What did Bilal call the people to?', 'বিলাল (রা.) মানুষকে কিসের জন্য ডাকতেন?'], [P('The prayer', 'নামাজ', 'mat'), P('A game', 'খেলা', 'ball'), P('The market', 'বাজার', 'basket')],
    ['The adhan is the call to prayer.', 'আজান হলো নামাজের ডাক।'], BK + '603');
  B.c(1, ['Who comforted the Prophet ﷺ after the first revelation?', 'প্রথম ওহির পর নবী ﷺ-কে কে সান্ত্বনা দিয়েছিলেন?'], [KHA, ASMA, HAF],
    ['Khadijah said: "Never! By Allah, Allah will never disgrace you."', 'খাদিজা (রা.) বললেন: "কখনো না! আল্লাহর কসম, আল্লাহ আপনাকে কখনো অপমানিত করবেন না।"'], BK + '3');
  B.c(1, ['Who was the daughter of the Prophet ﷺ, of whom he said "a part of me"?', 'নবী ﷺ তাঁর কোন মেয়ের সম্পর্কে বলেছেন "আমার অংশ"?'], [FAT, AIS, ASMA],
    ['"Fatimah is a part of me."', '"ফাতিমা আমার অংশ।"'], BK + '3714');
  B.c(1, ['Abu Hurairah got his name from a small animal he played with. Which one?', 'আবু হুরাইরা (রা.) একটি ছোট প্রাণীর সঙ্গে খেলতেন বলে এই নাম পেয়েছিলেন। প্রাণীটি কী?'], [P('A kitten', 'বিড়ালছানা', 'cat'), P('A camel', 'উট', 'camel'), P('A bird', 'পাখি', 'bird')],
    ['"I had a small kitten... so they named me Abu Hurairah."', '"আমার একটি ছোট বিড়ালছানা ছিল... তাই তারা আমার নাম দিল আবু হুরাইরা।"'], TI + '3840');
  B.c(1, ['Who served the Prophet ﷺ for ten years?', 'কে দশ বছর নবী ﷺ-এর খেদমত করেছিলেন?'], [ANAS, KHAL, ZAYD],
    ['"I served the Prophet ﷺ for ten years, and he never said to me, Uff."', '"আমি দশ বছর নবী ﷺ-এর খেদমত করেছি; তিনি কখনো আমাকে উফ্ বলেননি।"'], BK + '6038');
  B.yn(1, ['Did the Prophet ﷺ ever scold Anas with a harsh word in ten years?', 'দশ বছরে নবী ﷺ কি কখনো আনাস (রা.)-কে কড়া কথা বলেছিলেন?'], false,
    ['He never said "Uff" to him, and never blamed him.', 'তিনি কখনো তাঁকে "উফ্" বলেননি, দোষও দেননি।'], BK + '6038');
  B.c(1, ['The Prophet ﷺ carried his grandson on his shoulder and said, "O Allah, I love him." Who was he?', 'নবী ﷺ তাঁর নাতিকে কাঁধে নিয়ে বললেন, "হে আল্লাহ, আমি একে ভালোবাসি।" তিনি কে?'], [['Al-Hasan', 'হাসান (রা.)'], BIL, ANAS],
    ['"O Allah! I love him, so please love him."', '"হে আল্লাহ! আমি একে ভালোবাসি, তুমিও একে ভালোবাসো।"'], BK + '3749');
  B.c(1, ['Who is the mother of Prophet Isa, chosen above the women of the worlds?', 'নবী ঈসা (আ.)-এর মা কে, যাঁকে বিশ্বের নারীদের ওপর মনোনীত করা হয়েছে?'], [MAR, ASI, KHA],
    ['"O Mary, indeed Allah has chosen you and purified you."', '"হে মারইয়াম, আল্লাহ তোমাকে মনোনীত করেছেন ও পবিত্র করেছেন।"'], 'Quran 3:42');
  B.c(1, ['Who is called one of the Swords of Allah?', 'কাকে আল্লাহর তরবারি বলা হয়েছে?'], [KHAL, HUR, ANAS],
    ['"The flag was taken by one of Allah\'s Swords, and Allah gave them victory."', '"পতাকা নিলেন আল্লাহর এক তরবারি, আর আল্লাহ তাঁদের বিজয় দিলেন।"'], BK + '3757');
  B.yn(1, ['Did Abu Bakr give everything he had in charity one day?', 'আবু বকর (রা.) কি একদিন তাঁর সবকিছু সদকা করে দিয়েছিলেন?'], true,
    ['Abu Bakr came with everything he had and said: "I left Allah and His Messenger for them."', 'আবু বকর (রা.) তাঁর সব সম্পদ নিয়ে এলেন এবং বললেন: "তাদের জন্য আল্লাহ ও তাঁর রাসুলকে রেখে এসেছি।"'], TI + '3675');
  B.match(1, ['Match the companion to the picture.', 'সাহাবির সঙ্গে ছবি মেলাও।'],
    [[ABU, { p: 'cave' }], [BIL, { p: 'minaret' }], [HUR, { p: 'cat' }]],
    ['The cave, the adhan and the kitten.', 'গুহা, আজান আর বিড়ালছানা।'], 'Quran 9:40; ' + BK + '604; ' + TI + '3840');

  // ---------- band 2 ----------
  B.c(2, ['What did the Prophet ﷺ say to Abu Bakr in the cave?', 'গুহায় নবী ﷺ আবু বকর (রা.)-কে কী বলেছিলেন?'], [['What do you think of two, the third of whom is Allah?', 'সেই দুজন সম্পর্কে তোমার কী ধারণা, যাদের তৃতীয়জন আল্লাহ?'], ['Run as fast as you can', 'যত জোরে পারো দৌড়াও'], ['Go back to Makkah', 'মক্কায় ফিরে যাও']],
    ['Abu Bakr feared they would be seen. The Prophet ﷺ calmed him.', 'আবু বকর (রা.) ভয় পাচ্ছিলেন তাঁদের দেখে ফেলবে। নবী ﷺ তাঁকে শান্ত করলেন।'], BK + '3653');
  B.c(2, ['Who did the Prophet ﷺ say was the most beloved person to him?', 'নবী ﷺ-এর কাছে সবচেয়ে প্রিয় মানুষ কে ছিলেন?'], [AIS, ASMA, HAF, ['Umm Salamah', 'উম্মে সালামা (রা.)']],
    ['Amr ibn al-As asked, and he said: "Aishah."', 'আমর ইবনুল আস (রা.) জিজ্ঞেস করলে তিনি বললেন: "আয়েশা।"'], BK + '3662');
  B.c(2, ['"And among the men?" The Prophet ﷺ said: "Her father." Who is that?', '"আর পুরুষদের মধ্যে?" নবী ﷺ বললেন: "তার বাবা।" তিনি কে?'], [ABU, UMAR, ALI, UTH],
    ['Aishah is the daughter of Abu Bakr. Then he named Umar.', 'আয়েশা (রা.) আবু বকর (রা.)-এর মেয়ে। এরপর তিনি উমর (রা.)-এর নাম বললেন।'], BK + '3662');
  B.c(2, ['When Satan sees this companion on a path, he takes another path. Who?', 'শয়তান এই সাহাবিকে কোনো পথে দেখলে অন্য পথ ধরে। তিনি কে?'], [UMAR, BIL, ANAS, HUR],
    ['"Never does Satan find you going on a way, but he takes another way."', '"শয়তান তোমাকে কোনো পথে চলতে দেখলে সে অন্য পথ ধরে।"'], BK + '3683');
  B.c(2, ['Who bought the well of Rumah for the Muslims?', 'কে মুসলিমদের জন্য রুমা কূপ কিনেছিলেন?'], [UTH, ABU, ALI, KHAL],
    ['"Whoever digs the well of Rumah will be granted Paradise," and Uthman did it.', '"যে রুমা কূপ খনন করবে তার জন্য জান্নাত," আর উসমান (রা.) তা করেছিলেন।'], BK + '2778');
  B.c(2, ['What did Uthman give to the Muslims of Madinah?', 'উসমান (রা.) মদিনার মুসলিমদের কী দিয়েছিলেন?'], [P('A well', 'একটি কূপ', 'well'), P('A ship', 'একটি জাহাজ', 'ship'), P('A kite', 'একটি ঘুড়ি', 'kite')],
    ['He bought the well of Rumah.', 'তিনি রুমা কূপ কিনে দিয়েছিলেন।'], BK + '2778');
  B.c(2, ['On the day of Khaybar, who was given the flag?', 'খাইবারের দিন কাকে পতাকা দেওয়া হয়েছিল?'], [ALI, UMAR, KHAL, ZUB],
    ['"He loves Allah and His Messenger, and he is loved by Allah and His Messenger."', '"সে আল্লাহ ও তাঁর রাসুলকে ভালোবাসে, আর আল্লাহ ও তাঁর রাসুলও তাকে ভালোবাসেন।"'], BK + '4210');
  B.c(2, ['What trouble did Ali have before he was given the flag?', 'পতাকা পাওয়ার আগে আলি (রা.)-এর কী সমস্যা ছিল?'], [['Eye trouble', 'চোখের অসুখ'], ['A broken leg', 'পা ভাঙা'], ['A toothache', 'দাঁতে ব্যথা']],
    ['The Prophet ﷺ made dua for him and he became well, as if he had no ailment.', 'নবী ﷺ তাঁর জন্য দোয়া করলেন এবং তিনি এমন সুস্থ হলেন যেন কোনো অসুখই ছিল না।'], BK + '3701');
  B.c(2, ['The Prophet ﷺ heard whose footsteps ahead of him in Paradise?', 'নবী ﷺ জান্নাতে তাঁর সামনে কার পায়ের শব্দ শুনেছিলেন?'], [BIL, ANAS, MUADH, HUR],
    ['"I heard your footsteps in front of me in Paradise."', '"আমি জান্নাতে আমার সামনে তোমার পায়ের শব্দ শুনেছি।"'], BK + '1149');
  B.c(2, ['What was Bilal\'s deed that he hoped in most?', 'বিলাল (রা.) তাঁর কোন আমলের ওপর সবচেয়ে বেশি আশা রাখতেন?'], [['He prayed after every wudu', 'প্রতিবার অজুর পর নামাজ পড়তেন'], ['He travelled a lot', 'অনেক সফর করতেন'], ['He built houses', 'ঘর বানাতেন']],
    ['"Whenever I performed ablution during the day or night, I prayed after that ablution."', '"দিনে বা রাতে যখনই অজু করেছি, তারপর নামাজ পড়েছি।"'], BK + '1149');
  B.c(2, ['What did Bilal keep saying when he was tortured for his faith?', 'ঈমানের কারণে নির্যাতনের সময় বিলাল (রা.) বারবার কী বলতেন?'], [['Ahad, Ahad (One, One)', 'আহাদ, আহাদ (এক, এক)'], ['Let me go', 'আমাকে ছেড়ে দাও'], ['Nothing at all', 'কিছুই না']],
    ['He was dragged through the streets of Makkah while saying, "Ahad, Ahad."', 'তাঁকে মক্কার রাস্তায় টেনে নেওয়া হচ্ছিল, আর তিনি বলছিলেন, "আহাদ, আহাদ।"'], IM + '150');
  B.c(2, ['Jibril brought Khadijah greetings from her Lord and good news of what?', 'জিবরাইল (আ.) খাদিজা (রা.)-এর জন্য তাঁর রবের সালাম ও কিসের সুসংবাদ এনেছিলেন?'], [['A palace in Paradise', 'জান্নাতে একটি প্রাসাদ'], ['A garden in Makkah', 'মক্কায় একটি বাগান'], ['A herd of camels', 'এক পাল উট']],
    ['A palace in Paradise "wherein there will be neither any noise nor any fatigue."', 'জান্নাতে এমন প্রাসাদ, "যেখানে কোনো শোরগোল নেই, কোনো ক্লান্তি নেই।"'], BK + '3820');
  B.c(2, ['Who did Khadijah take the Prophet ﷺ to after the first revelation?', 'প্রথম ওহির পর খাদিজা (রা.) নবী ﷺ-কে কার কাছে নিয়ে গিয়েছিলেন?'], [['Her cousin Waraqah ibn Nawfal', 'তাঁর চাচাতো ভাই ওয়ারাকা ইবনে নাওফাল'], ['The king of Yemen', 'ইয়েমেনের রাজা'], ['A merchant from Sham', 'শামের এক ব্যবসায়ী']],
    ['"Khadijah then accompanied him to her cousin Waraqah bin Nawfal."', '"এরপর খাদিজা (রা.) তাঁকে নিয়ে তাঁর চাচাতো ভাই ওয়ারাকা ইবনে নাওফালের কাছে গেলেন।"'], BK + '3');
  B.c(2, ['Who will be the leader of the women of Paradise?', 'জান্নাতের নারীদের নেত্রী কে হবেন?'], [FAT, ASMA, HAF],
    ['"Don\'t you like to be the chief of all the ladies of Paradise?" the Prophet ﷺ told Fatimah.', 'নবী ﷺ ফাতিমা (রা.)-কে বললেন, "তুমি কি জান্নাতের নারীদের নেত্রী হতে পছন্দ করো না?"'], BK + '3623');
  B.c(2, ['Who is the trustworthy one of this ummah?', 'এই উম্মতের আমিন (বিশ্বস্ত ব্যক্তি) কে?'], [UBA, KHAL, MUS, TAL],
    ['"The trustworthy man of this nation is Abu Ubaydah ibn al-Jarrah."', '"এই উম্মতের আমিন হলেন আবু উবাইদা ইবনুল জাররাহ।"'], BK + '3744');
  B.c(2, ['The Prophet ﷺ hugged this boy and said, "O Allah, teach him the Book." Who?', 'নবী ﷺ এই বালককে জড়িয়ে ধরে বললেন, "হে আল্লাহ, একে কিতাবের জ্ঞান দাও।" তিনি কে?'], [IBA, ANAS, ['Usamah ibn Zayd', 'উসামা ইবনে যায়দ (রা.)'], ['Al-Husayn', 'হুসাইন (রা.)']],
    ['"O Allah! Bestow on him the knowledge of the Book."', '"হে আল্লাহ! একে কিতাবের জ্ঞান দান করো।"'], BK + '75');
  B.c(2, ['Who were the first to come to Madinah and teach the Quran there?', 'কারা সবার আগে মদিনায় এসে কুরআন শিখিয়েছিলেন?'], [['Musab ibn Umayr and Ibn Umm Maktum', 'মুসআব ইবনে উমাইর ও ইবনে উম্মে মাকতুম (রা.)'], ['Khalid and Amr', 'খালিদ ও আমর (রা.)'], ['Abu Hurairah and Anas', 'আবু হুরাইরা ও আনাস (রা.)']],
    ['"The first people who came to us were Musab bin Umayr and Ibn Umm Maktum, teaching Quran to the people."', '"আমাদের কাছে সবার আগে এসেছিলেন মুসআব ইবনে উমাইর ও ইবনে উম্মে মাকতুম; তাঁরা মানুষকে কুরআন শেখাতেন।"'], BK + '3925');
  B.c(2, ['Why was Asma called "the one with two belts"?', 'আসমা (রা.)-কে কেন "দুই কোমরবন্ধের অধিকারিণী" বলা হয়?'], [['She cut her belt in two to tie the food and water for the Hijrah', 'হিজরতের খাবার ও পানি বাঁধতে তিনি কোমরবন্ধ দুই ভাগ করেছিলেন'], ['She owned two shops', 'তাঁর দুটি দোকান ছিল'], ['She wore two rings', 'তিনি দুটি আংটি পরতেন']],
    ['She tied the water-skin with one piece and the food-container with the other.', 'এক টুকরো দিয়ে পানির মশক আর অন্য টুকরো দিয়ে খাবারের পাত্র বেঁধেছিলেন।'], BK + '2979');
  B.c(2, ['The Prophet ﷺ called his grandsons al-Hasan and al-Husayn his two ...', 'নবী ﷺ তাঁর নাতি হাসান ও হুসাইন (রা.)-কে বলেছেন তাঁর দুটি ...'], [['sweet basils in this world', 'দুনিয়ার সুগন্ধি ফুল'], ['swords', 'তরবারি'], ['mountains', 'পাহাড়']],
    ['"They are my two sweet basils in this world."', '"এরা দুজন দুনিয়ায় আমার দুটি সুগন্ধি ফুল।"'], BK + '3753');
  B.c(2, ['Who was the wife of Pharaoh who asked Allah for a house in Paradise?', 'ফেরাউনের কোন স্ত্রী আল্লাহর কাছে জান্নাতে একটি ঘর চেয়েছিলেন?'], [ASI, MAR, ['Hajar', 'হাজেরা (আ.)']],
    ['"My Lord, build for me near You a house in Paradise."', '"হে আমার রব, তোমার কাছে জান্নাতে আমার জন্য একটি ঘর বানিয়ে দাও।"'], 'Quran 66:11; ' + BK + '3411');
  B.yn(2, ['Did Abu Hurairah stay close to the Prophet ﷺ and memorize what others did not?', 'আবু হুরাইরা (রা.) কি নবী ﷺ-এর কাছে লেগে থাকতেন এবং অন্যরা যা মুখস্থ করেননি তা মুখস্থ করতেন?'], true,
    ['"I used to stick to Allah\'s Messenger ﷺ... and memorize that which they used not to memorize."', '"আমি রাসুলুল্লাহ ﷺ-এর সঙ্গে লেগে থাকতাম... এবং তাঁরা যা মুখস্থ করতেন না তা মুখস্থ করতাম।"'], BK + '118');
  B.match(2, ['Match the companion to what he is known for.', 'সাহাবির সঙ্গে তাঁর পরিচয় মেলাও।'],
    [[BIL, ['Called the adhan', 'আজান দিতেন']], [KHAL, ['A Sword of Allah', 'আল্লাহর তরবারি']], [UBA, ['Trustworthy one of the ummah', 'উম্মতের আমিন']], [ANAS, ['Served the Prophet ﷺ ten years', 'দশ বছর নবী ﷺ-এর খেদমত করেছেন']]],
    ['Each companion had a special gift.', 'প্রত্যেক সাহাবির একটি বিশেষ গুণ ছিল।'], BK + '604; ' + BK + '3757; ' + BK + '3744; ' + BK + '6038');
  B.match(2, ['Match the great woman to what is said of her.', 'মহীয়সী নারীর সঙ্গে তাঁর পরিচয় মেলাও।'],
    [[KHA, ['Comforted the Prophet ﷺ after the first revelation', 'প্রথম ওহির পর নবী ﷺ-কে সান্ত্বনা দিয়েছিলেন']], [FAT, ['"A part of me"', '"আমার অংশ"']], [ASMA, ['The one with two belts', 'দুই কোমরবন্ধের অধিকারিণী']], [MAR, ['Mother of Isa', 'ঈসা (আ.)-এর মা']]],
    ['Women of faith, courage and service.', 'ঈমান, সাহস ও সেবার নারীরা।'], BK + '3; ' + BK + '3714; ' + BK + '2979; Quran 3:42');
  B.sort(2, ['Did this person live in the time of the Prophet ﷺ, or long before?', 'এই মানুষটি কি নবী ﷺ-এর যুগে ছিলেন, নাকি অনেক আগে?'], [['In his time', 'তাঁর যুগে'], ['Long before', 'অনেক আগে']],
    [['Khadijah', 'খাদিজা (রা.)', 0], ['Fatimah', 'ফাতিমা (রা.)', 0], ['Bilal', 'বিলাল (রা.)', 0], ['Maryam', 'মারইয়াম (আ.)', 1], ['Asiyah, wife of Pharaoh', 'ফেরাউনের স্ত্রী আসিয়া (আ.)', 1]],
    ['Maryam was the mother of Isa, and Asiyah lived in the time of Musa.', 'মারইয়াম (আ.) ঈসা (আ.)-এর মা, আর আসিয়া (আ.) ছিলেন মুসা (আ.)-এর যুগে।'], BK + '3; ' + BK + '3714; ' + BK + '604; Quran 3:42; Quran 66:11');

  // ---------- band 3 ----------
  B.c(3, ['On Mount Uhud the Prophet ﷺ said, "On you are a Prophet, a Siddiq and two martyrs." Who is the Siddiq?', 'উহুদ পাহাড়ে নবী ﷺ বললেন, "তোমার ওপর আছেন একজন নবী, একজন সিদ্দিক ও দুজন শহিদ।" সিদ্দিক কে?'], [ABU, UMAR, UTH, ALI],
    ['He was on Uhud with Abu Bakr, Umar and Uthman when the mountain shook.', 'তিনি আবু বকর, উমর ও উসমান (রা.)-কে নিয়ে উহুদে ছিলেন, তখন পাহাড় কেঁপে উঠেছিল।'], BK + '3675');
  B.c(3, ['Umar brought half of his wealth in charity. What did Abu Bakr bring?', 'উমর (রা.) সদকার জন্য তাঁর অর্ধেক সম্পদ আনলেন। আবু বকর (রা.) কী আনলেন?'], [['Everything he had', 'তাঁর সবকিছু'], ['A quarter of his wealth', 'তাঁর সম্পদের এক-চতুর্থাংশ'], ['Half, like Umar', 'উমরের মতো অর্ধেক'], ['One camel', 'একটি উট']],
    ['Umar said: "I will never be able to beat him to something."', 'উমর (রা.) বললেন: "আমি কখনো কোনো কাজে তাঁকে ছাড়িয়ে যেতে পারব না।"'], TI + '3675');
  B.c(3, ['"What did you leave for your family?" What did Abu Bakr answer?', '"তোমার পরিবারের জন্য কী রেখে এসেছ?" আবু বকর (রা.) কী উত্তর দিলেন?'], [['Allah and His Messenger', 'আল্লাহ ও তাঁর রাসুলকে'], ['Half of my wealth', 'আমার অর্ধেক সম্পদ'], ['My garden', 'আমার বাগান'], ['Nothing at all', 'কিছুই না']],
    ['"I left Allah and His Messenger for them."', '"তাদের জন্য আল্লাহ ও তাঁর রাসুলকে রেখে এসেছি।"'], TI + '3675');
  B.c(3, ['Of whom did the Prophet ﷺ say, "Should I not show modesty to one whom even the angels show modesty"?', 'কার সম্পর্কে নবী ﷺ বলেছেন, "আমি কি তাকে লজ্জা করব না, যাকে ফেরেশতারাও লজ্জা করে?"'], [UTH, ABU, UMAR, ALI],
    ['Uthman was known for his modesty.', 'উসমান (রা.) তাঁর লজ্জাশীলতার জন্য পরিচিত ছিলেন।'], MS + '2401');
  B.c(3, ['Besides the well of Rumah, what else did Uthman do that was promised Paradise?', 'রুমা কূপ ছাড়া উসমান (রা.) আর কোন কাজ করেছিলেন, যার জন্য জান্নাতের ওয়াদা ছিল?'], [['He equipped the army of hardship (Tabuk)', 'তিনি কষ্টের বাহিনীকে (তাবুক) সজ্জিত করেছিলেন'], ['He built the Kabah', 'তিনি কাবা নির্মাণ করেছিলেন'], ['He dug the trench', 'তিনি পরিখা খনন করেছিলেন']],
    ['"Whoever equips the army of Usrah will be granted Paradise," and he equipped it.', '"যে উসরার বাহিনীকে সজ্জিত করবে তার জন্য জান্নাত," আর তিনি তা করেছিলেন।'], BK + '2778');
  B.c(3, ['The Prophet ﷺ told Ali, "You are to me as ... was to Musa."', 'নবী ﷺ আলি (রা.)-কে বললেন, "তুমি আমার কাছে তেমন, যেমন মুসার কাছে ছিলেন ..."'], [['Harun', 'হারুন (আ.)'], ['Yusha', 'ইউশা (আ.)'], ['Khidr', 'খিজির (আ.)'], ['Shuayb', 'শুআইব (আ.)']],
    ['"Will you not be pleased that you are to me like Harun was to Musa?"', '"তুমি কি এতে খুশি নও যে তুমি আমার কাছে তেমন, যেমন মুসার কাছে ছিলেন হারুন?"'], BK + '3706');
  B.c(3, ['Who suggested to Abu Bakr that the Quran be collected into one book?', 'কে আবু বকর (রা.)-কে কুরআন এক জায়গায় সংকলনের পরামর্শ দিয়েছিলেন?'], [UMAR, UTH, ALI, UBAY],
    ['After many reciters were killed at Yamamah, Umar feared part of the Quran would be lost.', 'ইয়ামামায় অনেক হাফেজ শহিদ হওয়ার পর উমর (রা.) কুরআনের কিছু অংশ হারিয়ে যাওয়ার আশঙ্কা করেছিলেন।'], BK + '4986');
  B.c(3, ['Whom did Abu Bakr ask to collect the Quran?', 'আবু বকর (রা.) কাকে কুরআন সংকলন করতে বলেছিলেন?'], [ZAYD, MUADH, KHAL, HUR],
    ['"You are a wise young man and we do not have any suspicion about you."', '"তুমি একজন বুদ্ধিমান যুবক, তোমার ব্যাপারে আমাদের কোনো সন্দেহ নেই।"'], BK + '4986');
  B.c(3, ['After Abu Bakr and Umar, with whom were the collected pages of the Quran kept?', 'আবু বকর ও উমর (রা.)-এর পর কুরআনের সংকলিত পাতাগুলো কার কাছে রাখা ছিল?'], [HAF, AIS, FAT, ASMA],
    ['They remained with Abu Bakr, then Umar, then with Hafsah, the daughter of Umar.', 'সেগুলো ছিল আবু বকর (রা.)-এর কাছে, তারপর উমর (রা.)-এর কাছে, তারপর উমর-কন্যা হাফসা (রা.)-এর কাছে।'], BK + '4986');
  B.c(3, ['Which caliph had copies of the Quran written and sent out?', 'কোন খলিফা কুরআনের অনুলিপি তৈরি করিয়ে বিভিন্ন জায়গায় পাঠিয়েছিলেন?'], [UTH, ABU, UMAR, ALI],
    ['Uthman ordered Zayd ibn Thabit and three others to write the manuscripts in perfect copies.', 'উসমান (রা.) যায়দ ইবনে সাবিত ও আরও তিনজনকে নিখুঁত অনুলিপি লিখতে আদেশ করেছিলেন।'], BK + '4987');
  B.c(3, ['Who warned Uthman that people were differing in their recitation of the Quran?', 'মানুষ কুরআন তিলাওয়াতে মতভেদ করছে, এ কথা কে উসমান (রা.)-কে জানিয়েছিলেন?'], [['Hudhayfah ibn al-Yaman', 'হুযাইফা ইবনুল ইয়ামান (রা.)'], KHAL, BIL, ANAS],
    ['Hudhayfah said: "O chief of the Believers! Save this nation."', 'হুযাইফা (রা.) বললেন: "হে আমিরুল মুমিনিন! এই উম্মতকে রক্ষা করুন।"'], BK + '4987');
  B.c(3, ['Who is the best reciter of the Quran among the companions?', 'সাহাবিদের মধ্যে কুরআনের সেরা কারি কে?'], [UBAY, KHAL, UBA, TAL],
    ['"The best reciter among them is Ubayy bin Kab."', '"তাদের মধ্যে সেরা কারি উবাই ইবনে কাব।"'], TI + '3790');
  B.c(3, ['Who knows most about the lawful and the unlawful?', 'হালাল-হারাম সম্পর্কে সবচেয়ে বেশি জ্ঞানী কে?'], [MUADH, BIL, KHAL, ZUB],
    ['"The most knowledgeable of them concerning the lawful and unlawful is Muadh bin Jabal."', '"হালাল-হারাম সম্পর্কে তাদের মধ্যে সবচেয়ে জ্ঞানী মুআয ইবনে জাবাল।"'], TI + '3790');
  B.c(3, ['Who is "the most merciful of my nation to my nation"?', '"আমার উম্মতের প্রতি আমার উম্মতের সবচেয়ে দয়ালু" কে?'], [ABU, UMAR, UTH, MUADH],
    ['"The most merciful of my nation to my nation is Abu Bakr."', '"আমার উম্মতের প্রতি সবচেয়ে দয়ালু আবু বকর।"'], TI + '3790');
  B.c(3, ['At whose death did the Throne of the Most Merciful shake?', 'কার মৃত্যুতে রহমানের আরশ কেঁপে উঠেছিল?'], [SAD, MUS, TAL, ZUB],
    ['"The Throne of the Beneficent shook because of the death of Sad bin Muadh."', '"সাদ ইবনে মুআযের মৃত্যুতে রহমানের আরশ কেঁপে উঠেছিল।"'], BK + '3803');
  B.c(3, ['"Every prophet had a disciple (hawari), and my disciple is ..."', '"প্রত্যেক নবীর একজন হাওয়ারি ছিল, আর আমার হাওয়ারি হলো ..."'], [ZUB, TAL, UBA, SAD],
    ['"...my Hawari is Az-Zubayr bin al-Awwam."', '"...আমার হাওয়ারি যুবাইর ইবনুল আওয়াম।"'], BK + '3719');
  B.c(3, ['Whose hand was paralysed from shielding the Prophet ﷺ?', 'নবী ﷺ-কে রক্ষা করতে গিয়ে কার হাত অবশ হয়ে গিয়েছিল?'], [TAL, ZUB, KHAL, BIL],
    ['"I saw Talhah\'s paralyzed hand with which he had protected the Prophet ﷺ."', '"আমি তালহার অবশ হাত দেখেছি, যা দিয়ে তিনি নবী ﷺ-কে রক্ষা করেছিলেন।"'], BK + '3724');
  B.c(3, ['Which mother and son were among the first seven to show their Islam openly?', 'প্রথম যে সাতজন প্রকাশ্যে ইসলাম ঘোষণা করেন, তাঁদের মধ্যে কোন মা ও ছেলে ছিলেন?'], [['Sumayyah and Ammar', 'সুমাইয়া ও আম্মার (রা.)'], ['Asma and Abdullah', 'আসমা ও আবদুল্লাহ (রা.)'], ['Fatimah and al-Hasan', 'ফাতিমা ও হাসান (রা.)']],
    ['The seven: the Messenger of Allah ﷺ, Abu Bakr, Ammar and his mother Sumayyah, Suhayb, Bilal and Miqdad.', 'সাতজন: রাসুলুল্লাহ ﷺ, আবু বকর, আম্মার ও তাঁর মা সুমাইয়া, সুহাইব, বিলাল ও মিকদাদ (রা.)।'], IM + '150');
  B.c(3, ['From which four did the Prophet ﷺ say to learn the Quran? Three were Ibn Masud, Salim and Muadh. Who was the fourth?', 'নবী ﷺ চারজনের কাছ থেকে কুরআন শিখতে বলেছেন। তিনজন: ইবনে মাসউদ, সালিম ও মুআয (রা.)। চতুর্থজন কে?'], [UBAY, KHAL, UBA, BIL],
    ['"Abdullah bin Masud, Salim, Muadh bin Jabal and Ubayy bin Kab."', '"আবদুল্লাহ ইবনে মাসউদ, সালিম, মুআয ইবনে জাবাল ও উবাই ইবনে কাব।"'], BK + '3808');
  B.c(3, ['Who are the two women the Prophet ﷺ named as having reached perfection?', 'নবী ﷺ কোন দুই নারীকে পূর্ণতায় পৌঁছানো বলে উল্লেখ করেছেন?'], [['Maryam and Asiyah', 'মারইয়াম ও আসিয়া (আ.)'], ['Hajar and Sarah', 'হাজেরা ও সারা (আ.)'], ['Asma and Hafsah', 'আসমা ও হাফসা (রা.)']],
    ['"...except Mary, the daughter of Imran, and Asiyah, the wife of Pharaoh."', '"...ইমরানের কন্যা মারইয়াম ও ফেরাউনের স্ত্রী আসিয়া ছাড়া।"'], BK + '3769');
  B.c(3, ['"The best of the world\'s women is Maryam, and the best of the world\'s women is ..."', '"দুনিয়ার শ্রেষ্ঠ নারী মারইয়াম, আর দুনিয়ার শ্রেষ্ঠ নারী ..."'], [KHA, ASMA, HAF, ['Umm Salamah', 'উম্মে সালামা (রা.)']],
    ['Ali narrated it from the Prophet ﷺ.', 'আলি (রা.) নবী ﷺ থেকে এটি বর্ণনা করেছেন।'], BK + '3815');
  B.c(3, ['Khadijah told the Prophet ﷺ that Allah would never disgrace him. Which reason did she give?', 'খাদিজা (রা.) নবী ﷺ-কে বলেছিলেন আল্লাহ তাঁকে কখনো অপমানিত করবেন না। তিনি কোন কারণ বলেছিলেন?'], [['He keeps family ties, helps the poor and honours guests', 'তিনি আত্মীয়তা রক্ষা করেন, গরিবকে সাহায্য করেন ও মেহমানকে সম্মান করেন'], ['He is very rich', 'তিনি খুব ধনী'], ['He has a strong army', 'তাঁর শক্তিশালী সেনাবাহিনী আছে']],
    ['"You keep good relations with your kith and kin, help the poor and the destitute, serve your guests generously."', '"আপনি আত্মীয়তার সম্পর্ক রক্ষা করেন, অসহায়ের বোঝা বহন করেন, মেহমানের সমাদর করেন।"'], BK + '3');
  B.c(3, ['Which companion is named in the Quran?', 'কোন সাহাবির নাম কুরআনে এসেছে?'], [['Zayd', 'যায়দ (রা.)'], BIL, KHAL, ANAS],
    ['"So when Zayd had no longer any need for her..."', '"অতঃপর যায়দ যখন তার প্রয়োজন শেষ করল..."'], 'Quran 33:37');
  B.yn(3, ['Are all ten of these named for Paradise in one hadith: Abu Bakr, Umar, Uthman, Ali, Talhah, az-Zubayr, Abdur-Rahman ibn Awf, Sad, Said and Abu Ubaydah?', 'একটি হাদিসে কি এই দশজনকেই জান্নাতের সুসংবাদ দেওয়া হয়েছে: আবু বকর, উমর, উসমান, আলি, তালহা, যুবাইর, আবদুর রহমান ইবনে আওফ, সাদ, সাঈদ ও আবু উবাইদা (রা.)?'], true,
    ['They are known as the ten given the good news of Paradise.', 'তাঁরা আশারায়ে মুবাশশারা, জান্নাতের সুসংবাদপ্রাপ্ত দশজন।'], TI + '3747');
  B.sort(3, ['One of the ten promised Paradise in the hadith, or not named there?', 'হাদিসে জান্নাতের সুসংবাদপ্রাপ্ত দশজনের একজন, নাকি সেখানে নাম নেই?'], [['One of the ten', 'দশজনের একজন'], ['Not in that list', 'সেই তালিকায় নেই']],
    [['Talhah', 'তালহা (রা.)', 0], ['Az-Zubayr', 'যুবাইর (রা.)', 0], ['Abdur-Rahman ibn Awf', 'আবদুর রহমান ইবনে আওফ (রা.)', 0], ['Sad ibn Abi Waqqas', 'সাদ ইবনে আবি ওয়াক্কাস (রা.)', 0], ['Anas', 'আনাস (রা.)', 1], ['Abu Hurairah', 'আবু হুরাইরা (রা.)', 1]],
    ['The ten are named one by one in the hadith.', 'হাদিসে দশজনের নাম একে একে এসেছে।'], TI + '3747');
  B.match(3, ['Match the companion to the Prophet\'s ﷺ words about him.', 'সাহাবির সঙ্গে তাঁর সম্পর্কে নবী ﷺ-এর কথা মেলাও।'],
    [[ALI, ['Like Harun was to Musa', 'মুসার কাছে হারুনের মতো']], [ZUB, ['My disciple', 'আমার হাওয়ারি']], [UBA, ['Trustworthy one of this nation', 'এই উম্মতের আমিন']], [UMAR, ['Satan takes another path', 'শয়তান অন্য পথ ধরে']]],
    ['Words of honour from the Messenger of Allah ﷺ.', 'রাসুলুল্লাহ ﷺ-এর মুখে সম্মানের কথা।'], BK + '3706; ' + BK + '3719; ' + BK + '3744; ' + BK + '3683');
  B.match(3, ['Match the companion to his special knowledge.', 'সাহাবির সঙ্গে তাঁর বিশেষ জ্ঞান মেলাও।'],
    [[UBAY, ['Best reciter', 'সেরা কারি']], [MUADH, ['The lawful and unlawful', 'হালাল ও হারাম']], [ZAYD, ['Inheritance', 'ফারায়েজ (উত্তরাধিকার)']], [UTH, ['Most truly modest', 'সবচেয়ে লজ্জাশীল']]],
    ['One hadith names the gift of each.', 'একটি হাদিসেই প্রত্যেকের গুণ বলা হয়েছে।'], TI + '3790');
  B.order(3, ['At Mutah the flag passed from hand to hand. Put the four in order.', 'মুতার যুদ্ধে পতাকা এক হাত থেকে আরেক হাতে গিয়েছিল। চারজনকে ক্রমে সাজাও।'],
    [['Zayd ibn Harithah', 'যায়দ ইবনে হারিসা (রা.)'], ['Jafar ibn Abi Talib', 'জাফর ইবনে আবি তালিব (রা.)'], ['Abdullah ibn Rawahah', 'আবদুল্লাহ ইবনে রাওয়াহা (রা.)'], KHAL],
    ['Zayd, then Jafar, then Ibn Rawahah were martyred; then one of Allah\'s Swords took the flag.', 'যায়দ, তারপর জাফর, তারপর ইবনে রাওয়াহা (রা.) শহিদ হলেন; এরপর আল্লাহর এক তরবারি পতাকা নিলেন।'], BK + '3757; ' + BK + '4261');
  B.order(3, ['Who kept the collected pages of the Quran? Put them in order.', 'কুরআনের সংকলিত পাতাগুলো কার কাছে ছিল? ক্রমে সাজাও।'],
    [ABU, UMAR, HAF],
    ['With Abu Bakr till he died, then Umar, then Hafsah.', 'আবু বকর (রা.)-এর মৃত্যু পর্যন্ত তাঁর কাছে, তারপর উমর (রা.), তারপর হাফসা (রা.)-এর কাছে।'], BK + '4986');
  B.order(3, ['Who came to Madinah first? Put them in the order al-Bara described.', 'মদিনায় কে আগে এসেছিলেন? বারা (রা.)-এর বর্ণনা অনুযায়ী সাজাও।'],
    [['Musab ibn Umayr and Ibn Umm Maktum', 'মুসআব ইবনে উমাইর ও ইবনে উম্মে মাকতুম (রা.)'], ['Bilal, Sad and Ammar', 'বিলাল, সাদ ও আম্মার (রা.)'], ['Umar with twenty companions', 'বিশজন সাহাবিসহ উমর (রা.)'], ['The Prophet ﷺ', 'নবী ﷺ']],
    ['The people of Madinah were never so joyful as on the day he arrived.', 'তাঁর আগমনের দিনের মতো আনন্দিত মদিনাবাসীকে আর কখনো দেখা যায়নি।'], BK + '3925');

  KQ.define('companions', { bank: B.list });
})();
