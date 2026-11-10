/* Hadith for Kids: data.js — the question bank.
   Short sayings of the Prophet ﷺ from Sahih al-Bukhari, Sahih Muslim, and sahih/hasan narrations
   of at-Tirmidhi and Abu Dawud. Every hadith was read in the source before its question was written.
   band: 1 = ages 4-6 (pictures), 2 = ages 7-9, 3 = ages 10-12. */
(function () {
  'use strict';
  var KQ = window.KahfQuiz, B = KQ.bank('hk');
  function P(en, bn, p) { return [en, bn, p]; }
  var BK = 'Sahih al-Bukhari ', MS = 'Sahih Muslim ', TI = 'Jami` at-Tirmidhi ', AD = 'Sunan Abi Dawud ';

  // ---------- band 1 ----------
  B.c(1, ['Which hand do we eat with?', 'আমরা কোন হাতে খাই?'], [['The right hand', 'ডান হাতে'], ['The left hand', 'বাম হাতে']],
    ['"Mention the Name of Allah and eat with your right hand."', '"আল্লাহর নাম নাও এবং ডান হাতে খাও।"'], BK + '5376');
  B.c(1, ['What do we say before we eat?', 'খাওয়ার আগে আমরা কী বলি?'], [['Bismillah', 'বিসমিল্লাহ'], ['Goodbye', 'বিদায়'], ['Nothing', 'কিছুই না']],
    ['The Prophet ﷺ told a boy: "Mention the Name of Allah."', 'নবী ﷺ একটি ছেলেকে বলেছিলেন: "আল্লাহর নাম নাও।"'], BK + '5376');
  B.yn(1, ['Is a smile for your brother a charity?', 'ভাইয়ের দিকে তাকিয়ে হাসা কি সদকা?'], true,
    ['"Your smiling in the face of your brother is charity."', '"তোমার ভাইয়ের সামনে তোমার হাসিমুখ সদকা।"'], TI + '1956');
  B.yn(1, ['Is a good word a charity?', 'ভালো কথা বলা কি সদকা?'], true,
    ['"A good word is also charity."', '"ভালো কথাও সদকা।"'], BK + '2989');
  B.c(1, ['A thorn lies on the path. What is the good deed?', 'পথে একটি কাঁটা পড়ে আছে। ভালো কাজ কোনটি?'], [['Move it away', 'সরিয়ে দেওয়া'], ['Leave it there', 'ফেলে রাখা'], ['Add more thorns', 'আরও কাঁটা ফেলা']],
    ['"To remove a harmful thing from the way is also charity."', '"পথ থেকে কষ্টদায়ক জিনিস সরানোও সদকা।"'], BK + '2989');
  B.c(1, ['A Muslim plants this, and birds eat from it. It is charity for him. What is it?', 'একজন মুসলিম এটি লাগায়, পাখিরা তা থেকে খায়। এটি তার জন্য সদকা। এটি কী?'], [P('A tree', 'গাছ', 'tree'), P('A rock', 'পাথর', 'rock'), P('A lock', 'তালা', 'lock')],
    ['Whoever plants a tree, and a bird, a person or an animal eats from it, it is charity for him.', 'কেউ গাছ লাগালে, তা থেকে পাখি, মানুষ বা পশু খেলে তা তার জন্য সদকা।'], BK + '2320');
  B.c(1, ['A man gave water to a thirsty animal, and Allah forgave him. Which animal?', 'এক লোক এক পিপাসার্ত প্রাণীকে পানি দিল, আর আল্লাহ তাকে ক্ষমা করলেন। প্রাণীটি কী?'], [['A dog', 'কুকুর'], ['A camel', 'উট'], ['A fish', 'মাছ']],
    ['He filled his shoe with water from a well for a thirsty dog.', 'তিনি কূপ থেকে জুতায় পানি ভরে পিপাসার্ত কুকুরকে পান করালেন।'], BK + '2363');
  B.c(1, ['What did the man carry the water in?', 'লোকটি কিসে করে পানি এনেছিল?'], [P('His shoe', 'তার জুতা', 'shoe'), P('A jug', 'জগ', 'jug'), P('A bucket', 'বালতি', 'bucket')],
    ['"He filled his shoe with water... and watered the dog."', '"সে তার জুতায় পানি ভরল... এবং কুকুরটিকে পান করাল।"'], BK + '2363');
  B.c(1, ['Who comes first for our kindness?', 'আমাদের ভালো ব্যবহার সবার আগে কে পাবেন?'], [['Our mother', 'মা'], ['Our friend', 'বন্ধু'], ['Our neighbour', 'প্রতিবেশী']],
    ['A man asked who deserved his best company. The Prophet ﷺ said: "Your mother."', 'এক লোক জিজ্ঞেস করল, কে তার সদ্ব্যবহারের সবচেয়ে বেশি হকদার। নবী ﷺ বললেন: "তোমার মা।"'], BK + '5971');
  B.c(1, ['Which book are the best people learning and teaching?', 'সেরা মানুষেরা কোন কিতাব শেখে ও শেখায়?'], [P('The Quran', 'কুরআন', 'quran'), P('A story book', 'গল্পের বই', 'book'), P('A scroll', 'পুঁথি', 'scroll')],
    ['"The best among you are those who learn the Quran and teach it."', '"তোমাদের মধ্যে সেরা সে, যে কুরআন শেখে এবং শেখায়।"'], BK + '5027');
  B.yn(1, ['Should we tell the truth?', 'আমাদের কি সত্য কথা বলা উচিত?'], true,
    ['"Truthfulness leads to righteousness, and righteousness leads to Paradise."', '"সত্য নেকির পথ দেখায়, আর নেকি জান্নাতের পথ দেখায়।"'], BK + '6094');
  B.yn(1, ['Is it good to get angry quickly?', 'তাড়াতাড়ি রেগে যাওয়া কি ভালো?'], false,
    ['A man asked for advice. The Prophet ﷺ said: "Do not become angry."', 'এক লোক উপদেশ চাইল। নবী ﷺ বললেন: "রাগ কোরো না।"'], BK + '6116');
  B.c(1, ['What do we say to spread love when we meet?', 'দেখা হলে ভালোবাসা বাড়াতে আমরা কী বলি?'], [['As-salamu alaykum', 'আসসালামু আলাইকুম'], ['Go away', 'চলে যাও'], ['Nothing at all', 'কিছুই না']],
    ['Spread the salam among yourselves and you will love one another.', 'নিজেদের মধ্যে সালামের প্রসার ঘটাও, তোমরা একে অপরকে ভালোবাসবে।'], MS + '54');
  B.yn(1, ['Should we thank people who help us?', 'যারা আমাদের সাহায্য করে, তাদের কি ধন্যবাদ দেওয়া উচিত?'], true,
    ['"He who does not thank the people is not thankful to Allah."', '"যে মানুষের শুকরিয়া আদায় করে না, সে আল্লাহর শুকরিয়াও আদায় করে না।"'], AD + '4811');
  B.c(1, ['Cleanliness is how much of faith?', 'পবিত্রতা ঈমানের কতটুকু?'], [['Half', 'অর্ধেক'], ['None', 'কিছুই না']],
    ['"Cleanliness is half of faith."', '"পবিত্রতা ঈমানের অর্ধেক।"'], MS + '223');
  B.sort(1, ['A charity, or not?', 'সদকা, নাকি নয়?'], [['Charity', 'সদকা'], ['Not charity', 'সদকা নয়']],
    [['A smile', 'হাসিমুখ', 0], ['A good word', 'ভালো কথা', 0], ['Moving a thorn off the road', 'পথ থেকে কাঁটা সরানো', 0], ['A rude word', 'খারাপ কথা', 1], ['Pushing someone', 'কাউকে ধাক্কা দেওয়া', 1]],
    ['A smile, a good word and clearing the road are all charity.', 'হাসিমুখ, ভালো কথা ও পথ পরিষ্কার করা: সবই সদকা।'], TI + '1956; ' + BK + '2989');
  B.yn(1, ['Was a woman punished for locking up a cat without food?', 'একটি বিড়ালকে খাবার না দিয়ে বেঁধে রাখায় কি এক নারী শাস্তি পেয়েছিল?'], true,
    ['She tied the cat, gave it no food, and did not let it go free to eat.', 'সে বিড়ালটিকে বেঁধে রেখেছিল, খাবার দেয়নি, ছেড়েও দেয়নি।'], BK + '3318');
  B.c(1, ['Who should we be kind to?', 'আমাদের কার প্রতি দয়ালু হওয়া উচিত?'], [['Everyone on the earth', 'পৃথিবীর সবার প্রতি'], ['Only our friends', 'শুধু বন্ধুদের প্রতি'], ['Nobody', 'কারও প্রতি নয়']],
    ['"Be merciful on the earth, and you will be shown mercy from the One above the heavens."', '"জমিনবাসীর প্রতি দয়া করো, আসমানে যিনি আছেন তিনি তোমাদের প্রতি দয়া করবেন।"'], TI + '1924');

  // ---------- band 2 ----------
  B.c(2, ['Finish the hadith: "The reward of deeds depends upon the ..."', 'হাদিসটি শেষ করো: "সব কাজের ফল নির্ভর করে ... এর ওপর"'], [['intentions', 'নিয়ত'], ['weather', 'আবহাওয়া'], ['clothes', 'পোশাক'], ['money', 'টাকা']],
    ['"Every person will get the reward according to what he has intended."', '"প্রত্যেকে তা-ই পাবে, যা সে নিয়ত করেছে।"'], BK + '1');
  B.c(2, ['Finish the hadith: "None of you will have faith till he wishes for his brother ..."', 'হাদিসটি শেষ করো: "তোমাদের কেউ মুমিন হবে না, যতক্ষণ না সে তার ভাইয়ের জন্য তা-ই পছন্দ করে ..."'], [['what he likes for himself', 'যা সে নিজের জন্য পছন্দ করে'], ['what he does not want', 'যা সে নিজে চায় না'], ['nothing at all', 'কিছুই না']],
    ['We want for others the good we want for ourselves.', 'নিজের জন্য যে ভালো চাই, অন্যের জন্যও তা চাই।'], BK + '13');
  B.c(2, ['Who is truly strong?', 'প্রকৃত শক্তিশালী কে?'], [['The one who controls himself when angry', 'যে রাগের সময় নিজেকে সামলায়'], ['The one who wins every fight', 'যে সব লড়াইয়ে জেতে'], ['The one who shouts the loudest', 'যে সবচেয়ে জোরে চিৎকার করে'], ['The tallest one', 'যে সবচেয়ে লম্বা']],
    ['"The strong is the one who controls himself while in anger."', '"শক্তিশালী সে, যে রাগের সময় নিজেকে নিয়ন্ত্রণে রাখে।"'], BK + '6114');
  B.c(2, ['Whoever believes in Allah and the Last Day should say what is good, or ...', 'যে আল্লাহ ও শেষ দিনে ঈমান রাখে, সে যেন ভালো কথা বলে, অথবা ...'], [['keep quiet', 'চুপ থাকে'], ['speak louder', 'আরও জোরে বলে'], ['walk away angry', 'রেগে চলে যায়']],
    ['"...should talk what is good or keep quiet."', '"...সে যেন ভালো কথা বলে অথবা চুপ থাকে।"'], BK + '6018');
  B.c(2, ['How should a believer treat a guest?', 'মুমিন তার মেহমানের সঙ্গে কেমন আচরণ করবে?'], [['Generously', 'সম্মান ও আপ্যায়নের সঙ্গে'], ['Coldly', 'অবহেলার সঙ্গে'], ['By sending him away', 'তাড়িয়ে দিয়ে']],
    ['Whoever believes in Allah and the Last Day should entertain his guest generously.', 'যে আল্লাহ ও শেষ দিনে ঈমান রাখে, সে যেন তার মেহমানকে সম্মান করে।'], BK + '6018');
  B.c(2, ['A believer must not harm his ...', 'মুমিন যাকে কষ্ট দেবে না, সে হলো তার ...'], [['neighbour', 'প্রতিবেশী'], ['shadow', 'ছায়া'], ['pillow', 'বালিশ']],
    ['"Anybody who believes in Allah and the Last Day should not harm his neighbor."', '"যে আল্লাহ ও শেষ দিনে ঈমান রাখে, সে যেন তার প্রতিবেশীকে কষ্ট না দেয়।"'], BK + '6018');
  B.c(2, ['A man asked, "Who deserves my best company?" How many times did the Prophet ﷺ say "Your mother" before "Your father"?', 'এক লোক জিজ্ঞেস করল, "আমার সদ্ব্যবহারের সবচেয়ে হকদার কে?" নবী ﷺ "তোমার বাবা" বলার আগে কয়বার "তোমার মা" বলেছিলেন?'], [['Three times', 'তিনবার'], ['Once', 'একবার'], ['Twice', 'দুইবার'], ['Five times', 'পাঁচবার']],
    ['"Your mother... your mother... your mother," then "your father."', '"তোমার মা... তোমার মা... তোমার মা," তারপর "তোমার বাবা।"'], BK + '5971');
  B.c(2, ['A Muslim is the one who does not harm others with his ...', 'মুসলিম সে, যে অন্যকে কষ্ট দেয় না তার ... দিয়ে'], [['tongue and hands', 'জিহ্বা ও হাত'], ['shoes and bag', 'জুতা ও ব্যাগ'], ['eyes and ears', 'চোখ ও কান']],
    ['"A Muslim is the one who avoids harming Muslims with his tongue and hands."', '"মুসলিম সে, যার জিহ্বা ও হাত থেকে অন্য মুসলিমরা নিরাপদ থাকে।"'], BK + '10');
  B.c(2, ['The believers are like one ...', 'মুমিনরা যেন একটি ...'], [['body', 'দেহ'], ['river', 'নদী'], ['mountain', 'পাহাড়'], ['cloud', 'মেঘ']],
    ['When one part is unwell, the whole body shares the sleeplessness and fever.', 'এক অঙ্গ অসুস্থ হলে পুরো দেহ জ্বর ও অনিদ্রায় তার শরিক হয়।'], BK + '6011');
  B.c(2, ['Which deeds does Allah love most?', 'আল্লাহর কাছে কোন আমল সবচেয়ে প্রিয়?'], [['Regular ones, even if small', 'নিয়মিত আমল, অল্প হলেও'], ['Big ones done only once', 'একবার করা বড় আমল'], ['Ones that others see', 'লোক দেখানো আমল']],
    ['"The most beloved deed to Allah is the most regular and constant even if it were little."', '"আল্লাহর কাছে সবচেয়ে প্রিয় আমল তা-ই, যা নিয়মিত করা হয়, অল্প হলেও।"'], BK + '6464');
  B.c(2, ['Which two blessings do many people lose?', 'কোন দুটি নিয়ামত অনেক মানুষ হারিয়ে ফেলে?'], [['Health and free time', 'সুস্থতা ও অবসর'], ['Toys and sweets', 'খেলনা ও মিষ্টি'], ['Shoes and hats', 'জুতা ও টুপি']],
    ['"There are two blessings that many people are deceived into losing: health and free time."', '"দুটি নিয়ামতের ব্যাপারে অনেক মানুষ ধোঁকায় পড়ে: সুস্থতা ও অবসর।"'], BK + '6412');
  B.c(2, ['What does charity do to wealth?', 'সদকা করলে সম্পদের কী হয়?'], [['It does not decrease it', 'তা কমে না'], ['It finishes it', 'তা শেষ হয়ে যায়'], ['It cuts it in half', 'তা অর্ধেক হয়ে যায়']],
    ['"Charity does not decrease wealth."', '"সদকা সম্পদ কমায় না।"'], MS + '2588');
  B.c(2, ['Who are "the best among you"?', '"তোমাদের মধ্যে সেরা" কারা?'], [['Those best in character', 'যাদের চরিত্র সবচেয়ে সুন্দর'], ['Those with the most toys', 'যাদের খেলনা সবচেয়ে বেশি'], ['Those who run fastest', 'যারা সবচেয়ে জোরে দৌড়ায়']],
    ['"The best among you are the best in character."', '"তোমাদের মধ্যে সেরা তারা, যাদের চরিত্র সবচেয়ে সুন্দর।"'], BK + '6035');
  B.c(2, ['"Whoever is not merciful to others ..."', '"যে অন্যের প্রতি দয়া করে না ..."'], [['will not be treated mercifully', 'তার প্রতিও দয়া করা হবে না'], ['will be the strongest', 'সে সবচেয়ে শক্তিশালী হবে'], ['will have many friends', 'তার অনেক বন্ধু হবে']],
    ['The Prophet ﷺ said this after kissing his grandson al-Hasan.', 'নবী ﷺ তাঁর নাতি হাসানকে চুমু দেওয়ার পর এ কথা বলেছিলেন।'], BK + '5997');
  B.c(2, ['Whom did the Prophet ﷺ kiss when a man said he had never kissed his ten children?', 'এক লোক যখন বলল সে তার দশ সন্তানের কাউকে কখনো চুমু দেয়নি, তখন নবী ﷺ কাকে চুমু দিয়েছিলেন?'], [['Al-Hasan, his grandson', 'তাঁর নাতি হাসান (রা.)'], ['A traveller', 'একজন মুসাফির'], ['A merchant', 'একজন ব্যবসায়ী']],
    ['Allah\'s Messenger ﷺ kissed al-Hasan bin Ali.', 'রাসুলুল্লাহ ﷺ হাসান ইবনে আলিকে চুমু দিয়েছিলেন।'], BK + '5997');
  B.c(2, ['"Whoever takes a path to seek knowledge, Allah makes easy for him the path to ..."', '"যে জ্ঞান অর্জনের পথে চলে, আল্লাহ তার জন্য সহজ করে দেন ... এর পথ"'], [['Paradise', 'জান্নাত'], ['the market', 'বাজার'], ['the sea', 'সমুদ্র']],
    ['Learning is a road to Paradise.', 'জ্ঞান অর্জন জান্নাতের পথ।'], TI + '2646');
  B.c(2, ['Allah does not look at your bodies or faces. What does He look at?', 'আল্লাহ তোমাদের দেহ বা চেহারা দেখেন না। তিনি কী দেখেন?'], [['Your hearts', 'তোমাদের অন্তর'], ['Your shoes', 'তোমাদের জুতা'], ['Your houses', 'তোমাদের বাড়ি']],
    ['"He looks to your hearts."', '"তিনি তোমাদের অন্তর দেখেন।"'], MS + '2564');
  B.c(2, ['"Do not consider any good deed small, even meeting your brother with ..."', '"কোনো ভালো কাজকে ছোট মনে কোরো না, এমনকি তোমার ভাইয়ের সঙ্গে দেখা করা ... নিয়ে"'], [['a cheerful face', 'হাসিমুখ'], ['a big gift', 'বড় উপহার'], ['a long speech', 'লম্বা বক্তৃতা']],
    ['Even a cheerful face is a good deed.', 'হাসিমুখও একটি নেক আমল।'], MS + '2626');
  B.c(2, ['"Follow a bad deed with ..."', '"মন্দ কাজের পরে করো ..."'], [['a good deed, to wipe it out', 'একটি ভালো কাজ, যা তাকে মুছে দেবে'], ['another bad deed', 'আরেকটি মন্দ কাজ'], ['a long sleep', 'লম্বা ঘুম']],
    ['"Follow an evil deed with a good one to wipe it out."', '"মন্দ কাজের পরে ভালো কাজ করো, তা মন্দকে মুছে দেবে।"'], TI + '1987');
  B.c(2, ['A boy\'s hand went all around the dish. Where did the Prophet ﷺ tell him to eat from?', 'একটি ছেলের হাত পুরো থালায় ঘুরছিল। নবী ﷺ তাকে কোথা থেকে খেতে বললেন?'], [['What is nearer to him', 'তার কাছের দিক থেকে'], ['The middle of the dish', 'থালার মাঝখান থেকে'], ['The far side', 'দূরের দিক থেকে']],
    ['"Eat of the dish what is nearer to you."', '"তোমার কাছের দিক থেকে খাও।"'], BK + '5376');
  B.yn(2, ['Is giving directions to someone who is lost a charity?', 'পথ হারানো কাউকে পথ দেখিয়ে দেওয়া কি সদকা?'], true,
    ['"Your giving directions to a man lost in the land is charity for you."', '"পথহারা লোককে পথ দেখানো তোমার জন্য সদকা।"'], TI + '1956');
  B.yn(2, ['Is every step you take to the prayer a charity?', 'নামাজের দিকে নেওয়া প্রতিটি কদম কি সদকা?'], true,
    ['"Every step taken on one\'s way to offer the prayer is also charity."', '"নামাজের জন্য নেওয়া প্রতিটি কদমও সদকা।"'], BK + '2989');
  B.sort(2, ['A sign of a hypocrite, or a good habit?', 'মুনাফিকের আলামত, নাকি ভালো অভ্যাস?'], [['Sign of a hypocrite', 'মুনাফিকের আলামত'], ['Good habit', 'ভালো অভ্যাস']],
    [['Telling lies', 'মিথ্যা বলা', 0], ['Breaking promises', 'ওয়াদা ভাঙা', 0], ['Betraying a trust', 'আমানতের খেয়ানত করা', 0], ['Telling the truth', 'সত্য বলা', 1], ['Keeping promises', 'ওয়াদা রাখা', 1]],
    ['"The signs of a hypocrite are three": lying, breaking promises and betraying trust.', '"মুনাফিকের আলামত তিনটি": মিথ্যা বলা, ওয়াদা ভাঙা ও আমানতের খেয়ানত করা।'], BK + '33');
  B.sort(2, ['Does the hadith teach us to do it, or to avoid it?', 'হাদিস এটি করতে শেখায়, নাকি এড়িয়ে চলতে?'], [['Do it', 'করো'], ['Avoid it', 'এড়িয়ে চলো']],
    [['Honour your guest', 'মেহমানকে সম্মান করা', 0], ['Speak good words', 'ভালো কথা বলা', 0], ['Spread salam', 'সালামের প্রসার', 0], ['Harm your neighbour', 'প্রতিবেশীকে কষ্ট দেওয়া', 1], ['Get angry', 'রেগে যাওয়া', 1]],
    ['Good words, honoured guests and salam; no harm and no anger.', 'ভালো কথা, মেহমানের সম্মান ও সালাম; কষ্ট দেওয়া ও রাগ নয়।'], BK + '6018; ' + MS + '54; ' + BK + '6116');
  B.match(2, ['Match the start of the hadith to its end.', 'হাদিসের শুরুর সঙ্গে শেষ মেলাও।'],
    [[['A good word', 'ভালো কথা'], ['is charity', 'সদকা']], [['Cleanliness', 'পবিত্রতা'], ['is half of faith', 'ঈমানের অর্ধেক']], [['Deeds', 'সব কাজ'], ['depend on intentions', 'নিয়তের ওপর নির্ভর করে']], [['Truthfulness', 'সত্যবাদিতা'], ['leads to righteousness', 'নেকির পথ দেখায়']]],
    ['Four short sayings to remember.', 'মনে রাখার মতো চারটি ছোট হাদিস।'], BK + '2989; ' + MS + '223; ' + BK + '1; ' + BK + '6094');
  B.match(2, ['Match the story to its lesson.', 'ঘটনার সঙ্গে শিক্ষা মেলাও।'],
    [[['A man gave water to a thirsty dog', 'এক লোক পিপাসার্ত কুকুরকে পানি দিল'], ['Allah forgave him', 'আল্লাহ তাকে ক্ষমা করলেন']], [['A woman tied up a cat with no food', 'এক নারী বিড়ালকে না খাইয়ে বেঁধে রাখল'], ['She was punished', 'সে শাস্তি পেল']], [['A Muslim plants a tree', 'একজন মুসলিম গাছ লাগাল'], ['It is charity for him', 'তা তার জন্য সদকা']]],
    ['Kindness to animals and plants matters to Allah.', 'প্রাণী ও গাছের প্রতি দয়া আল্লাহর কাছে গুরুত্বপূর্ণ।'], BK + '2363; ' + BK + '3318; ' + BK + '2320');
  B.order(2, ['A man asked who deserved his best company. Put the answers in order.', 'এক লোক জিজ্ঞেস করল কে তার সদ্ব্যবহারের সবচেয়ে হকদার। উত্তরগুলো ক্রমে সাজাও।'],
    [['Your mother (first)', 'তোমার মা (প্রথমবার)'], ['Your mother (second)', 'তোমার মা (দ্বিতীয়বার)'], ['Your mother (third)', 'তোমার মা (তৃতীয়বার)'], ['Your father', 'তোমার বাবা']],
    ['The mother was named three times, then the father.', 'মায়ের কথা তিনবার, তারপর বাবার কথা বলা হয়েছে।'], BK + '5971');

  // ---------- band 3 ----------
  B.c(3, ['"Be mindful of Allah and ..."', '"আল্লাহকে স্মরণে রাখো, তাহলে ..."'], [['He will protect you', 'তিনি তোমাকে হেফাজত করবেন'], ['people will praise you', 'লোকে তোমার প্রশংসা করবে'], ['you will become rich', 'তুমি ধনী হবে'], ['you will never be tired', 'তুমি কখনো ক্লান্ত হবে না']],
    ['The Prophet ﷺ taught this to the young Ibn Abbas.', 'নবী ﷺ কিশোর ইবনে আব্বাসকে এটি শিখিয়েছিলেন।'], TI + '2516');
  B.c(3, ['"When you ask, ask ..."', '"যখন চাইবে, তখন চাও ... এর কাছে"'], [['Allah', 'আল্লাহ'], ['the richest person', 'সবচেয়ে ধনী লোক'], ['your friends', 'তোমার বন্ধুরা'], ['the king', 'রাজা']],
    ['"When you ask, ask Allah, and when you seek aid, seek Allah\'s aid."', '"যখন চাইবে আল্লাহর কাছে চাও, যখন সাহায্য চাইবে আল্লাহর কাছেই সাহায্য চাও।"'], TI + '2516');
  B.c(3, ['Which young companion was riding behind the Prophet ﷺ when he was taught "Be mindful of Allah"?', '"আল্লাহকে স্মরণে রাখো" শেখানোর সময় কোন কিশোর সাহাবি নবী ﷺ-এর পেছনে ছিলেন?'], [['Ibn Abbas', 'ইবনে আব্বাস (রা.)'], ['Bilal', 'বিলাল (রা.)'], ['Abu Hurairah', 'আবু হুরাইরা (রা.)'], ['Uthman', 'উসমান (রা.)']],
    ['Ibn Abbas said: "I was behind the Prophet ﷺ one day."', 'ইবনে আব্বাস (রা.) বলেন: "একদিন আমি নবী ﷺ-এর পেছনে ছিলাম।"'], TI + '2516');
  B.c(3, ['Part of the excellence of a person\'s Islam is that he leaves ...', 'একজন মানুষের ইসলামের সৌন্দর্য হলো সে ছেড়ে দেয় ...'], [['what does not concern him', 'যা তার জন্য অনর্থক'], ['his homework', 'তার বাড়ির কাজ'], ['his family', 'তার পরিবার'], ['all his friends', 'তার সব বন্ধু']],
    ['"He leaves what does not concern him."', '"সে অনর্থক বিষয় ছেড়ে দেয়।"'], TI + '2317');
  B.c(3, ['"The religion is ..."', '"দ্বীন হলো ..."'], [['sincerity', 'আন্তরিক কল্যাণকামিতা (নসিহত)'], ['difficulty', 'কঠিনতা'], ['wealth', 'সম্পদ'], ['rest', 'বিশ্রাম']],
    ['Sincerity to Allah, His Book, His Messenger, and to the leaders and all the Muslims.', 'আল্লাহ, তাঁর কিতাব, তাঁর রাসুল, মুসলিম নেতা ও সাধারণ মুসলিমদের প্রতি আন্তরিকতা।'], MS + '55');
  B.c(3, ['Who is better and more beloved to Allah?', 'আল্লাহর কাছে কে উত্তম ও বেশি প্রিয়?'], [['The strong believer', 'শক্তিশালী মুমিন'], ['The weak believer', 'দুর্বল মুমিন'], ['The rich man', 'ধনী লোক'], ['The famous man', 'বিখ্যাত লোক']],
    ['"A strong believer is better and more lovable to Allah than a weak believer, and there is good in everyone."', '"শক্তিশালী মুমিন দুর্বল মুমিনের চেয়ে উত্তম ও আল্লাহর কাছে বেশি প্রিয়; তবে প্রত্যেকের মধ্যেই কল্যাণ আছে।"'], MS + '2664');
  B.c(3, ['When trouble comes, what should a believer not say?', 'বিপদ এলে মুমিনের কী বলা উচিত নয়?'], [['"If only I had done that..."', '"যদি আমি এমন করতাম..."'], ['"Allah decreed it"', '"আল্লাহ তা নির্ধারণ করেছেন"'], ['"Alhamdulillah"', '"আলহামদুলিল্লাহ"']],
    ['Say instead: "Allah did what He had ordained." The word "if" opens the gate for Satan.', 'বরং বলো: "আল্লাহ যা নির্ধারণ করেছেন তা-ই করেছেন।" "যদি" শব্দটি শয়তানের দরজা খুলে দেয়।'], MS + '2664');
  B.c(3, ['Iman has more than seventy branches. Which of these is named as a branch of iman?', 'ঈমানের সত্তরটিরও বেশি শাখা আছে। এর মধ্যে কোনটিকে ঈমানের শাখা বলা হয়েছে?'], [['Modesty (haya)', 'লজ্জাশীলতা (হায়া)'], ['Pride', 'অহংকার'], ['Laziness', 'অলসতা'], ['Anger', 'রাগ']],
    ['"Iman has over seventy branches, and modesty is a branch of iman."', '"ঈমানের সত্তরটিরও বেশি শাখা আছে, আর লজ্জাশীলতা ঈমানের একটি শাখা।"'], MS + '35');
  B.c(3, ['Whoever wants more provision and a longer life should ...', 'যে রিজিকে প্রশস্ততা ও দীর্ঘ জীবন চায়, সে যেন ...'], [['keep good ties with his relatives', 'আত্মীয়তার সম্পর্ক বজায় রাখে'], ['sleep all day', 'সারা দিন ঘুমায়'], ['travel far away', 'অনেক দূরে চলে যায়'], ['save every coin', 'প্রতিটি পয়সা জমায়']],
    ['He "should keep good relations with his kith and kin."', 'সে "যেন আত্মীয়তার সম্পর্ক বজায় রাখে।"'], BK + '2067');
  B.c(3, ['"Convey from me, even if it is ..."', '"আমার পক্ষ থেকে পৌঁছে দাও, যদি তা হয় ..."'], [['a single verse', 'একটি মাত্র আয়াত'], ['a whole book', 'একটি পুরো বই'], ['a long speech', 'একটি লম্বা বক্তৃতা']],
    ['Share what you learn, even one sentence, and never lie about the Prophet ﷺ.', 'যা শিখেছ তা অন্যকে জানাও, একটি বাক্য হলেও; আর নবী ﷺ-এর নামে কখনো মিথ্যা বোলো না।'], BK + '3461');
  B.c(3, ['Truthfulness leads to righteousness. Where does righteousness lead?', 'সত্য নেকির পথ দেখায়। নেকি কোথায় নিয়ে যায়?'], [['To Paradise', 'জান্নাতে'], ['To fame', 'খ্যাতিতে'], ['To wealth', 'সম্পদে']],
    ['"Truthfulness leads to righteousness, and righteousness leads to Paradise."', '"সত্য নেকির পথ দেখায়, আর নেকি জান্নাতের পথ দেখায়।"'], BK + '6094');
  B.c(3, ['A man keeps telling lies until he is written before Allah as ...', 'মানুষ মিথ্যা বলতে থাকে, শেষে আল্লাহর কাছে তার নাম লেখা হয় ...'], [['a liar', 'মিথ্যাবাদী হিসেবে'], ['a traveller', 'মুসাফির হিসেবে'], ['a poet', 'কবি হিসেবে']],
    ['And a man keeps telling the truth until he becomes a truthful person.', 'আর মানুষ সত্য বলতে থাকে, শেষে সে সত্যবাদী হয়ে যায়।'], BK + '6094');
  B.c(3, ['A Muslim is the brother of a Muslim. Which of these does he never do to him?', 'মুসলিম মুসলিমের ভাই। সে তার সঙ্গে কোনটি কখনো করে না?'], [['Oppress him', 'তার ওপর জুলুম করা'], ['Help him', 'তাকে সাহায্য করা'], ['Greet him', 'তাকে সালাম দেওয়া'], ['Visit him', 'তাকে দেখতে যাওয়া']],
    ['"He should not oppress him, nor should he hand him over to an oppressor."', '"সে তার ওপর জুলুম করে না, তাকে জালিমের হাতে তুলেও দেয় না।"'], BK + '2442');
  B.c(3, ['Whoever fulfils the needs of his brother ...', 'যে তার ভাইয়ের প্রয়োজন পূরণ করে ...'], [['Allah will fulfil his needs', 'আল্লাহ তার প্রয়োজন পূরণ করবেন'], ['will lose his time', 'সে তার সময় হারাবে'], ['will be forgotten', 'তাকে ভুলে যাওয়া হবে']],
    ['Help your brother and Allah helps you.', 'ভাইকে সাহায্য করো, আল্লাহ তোমাকে সাহায্য করবেন।'], BK + '2442');
  B.c(3, ['"Allah is kind and He loves ..."', '"আল্লাহ কোমল, তিনি ভালোবাসেন ..."'], [['kindness', 'কোমলতা'], ['harshness', 'কঠোরতা'], ['arguing', 'ঝগড়া']],
    ['He gives for kindness what He does not give for severity.', 'কোমলতার জন্য তিনি যা দেন, কঠোরতার জন্য তা দেন না।'], MS + '2593');
  B.c(3, ['What does kindness do to anything it is found in?', 'কোমলতা যে জিনিসে থাকে, তার কী করে?'], [['It adds to its beauty', 'তাকে সুন্দর করে'], ['It makes it weak', 'তাকে দুর্বল করে'], ['It hides it', 'তাকে লুকিয়ে ফেলে']],
    ['"Kindness is not found in anything but that it adds to its beauty."', '"কোমলতা যে জিনিসেই থাকে, তাকে সুন্দর করে তোলে।"'], MS + '2594');
  B.c(3, ['Besides charity not decreasing wealth, what happens to one who humbles himself for Allah?', 'যে আল্লাহর জন্য বিনয়ী হয়, তার কী হয়?'], [['Allah raises his status', 'আল্লাহ তার মর্যাদা বাড়িয়ে দেন'], ['People forget him', 'মানুষ তাকে ভুলে যায়'], ['He loses his friends', 'সে বন্ধু হারায়']],
    ['"No one humbles himself for the sake of Allah except that Allah raises his status."', '"যে আল্লাহর জন্য বিনয়ী হয়, আল্লাহ তার মর্যাদা বাড়িয়ে দেন।"'], MS + '2588');
  B.c(3, ['"Those who do not show mercy to our young ones and do not honour our elders ..."', '"যারা আমাদের ছোটদের প্রতি দয়া করে না এবং বড়দের হক বোঝে না ..."'], [['are not from us', 'তারা আমাদের দলভুক্ত নয়'], ['are the wisest', 'তারা সবচেয়ে জ্ঞানী'], ['are the strongest', 'তারা সবচেয়ে শক্তিশালী']],
    ['Mercy for the young and respect for the old go together.', 'ছোটদের প্রতি স্নেহ আর বড়দের প্রতি সম্মান একসঙ্গে চলে।'], AD + '4943');
  B.c(3, ['A man asked which Islam is good. One answer was to feed others. What was the other?', 'এক লোক জিজ্ঞেস করল ইসলামের কোন কাজ উত্তম। একটি উত্তর ছিল খাবার খাওয়ানো। অন্যটি কী?'], [['Greet those you know and those you do not', 'চেনা-অচেনা সবাইকে সালাম দেওয়া'], ['Speak only to friends', 'শুধু বন্ধুদের সঙ্গে কথা বলা'], ['Stay at home', 'ঘরে বসে থাকা']],
    ['"To feed, and greet those whom you know and those whom you do not know."', '"খাবার খাওয়ানো এবং চেনা-অচেনা সবাইকে সালাম দেওয়া।"'], BK + '12');
  B.c(3, ['Who will sit nearest to the Prophet ﷺ on the Day of Judgment?', 'কিয়ামতের দিন নবী ﷺ-এর সবচেয়ে কাছে কে বসবে?'], [['The best in character', 'যার চরিত্র সবচেয়ে সুন্দর'], ['The richest', 'সবচেয়ে ধনী'], ['The best speaker', 'সবচেয়ে ভালো বক্তা']],
    ['"The most beloved among you to me, and the nearest to sit with me... is the best of you in character."', '"তোমাদের মধ্যে আমার সবচেয়ে প্রিয় ও সবচেয়ে কাছে বসবে সে, যার চরিত্র সবচেয়ে সুন্দর।"'], TI + '2018');
  B.c(3, ['"Have taqwa of Allah ..."', '"আল্লাহকে ভয় করো ..."'], [['wherever you are', 'যেখানেই থাকো'], ['only in the masjid', 'শুধু মসজিদে'], ['only in Ramadan', 'শুধু রমজানে'], ['only when people watch', 'শুধু যখন লোকে দেখে']],
    ['And "treat the people with good behaviour."', 'আর "মানুষের সঙ্গে সুন্দর আচরণ করো।"'], TI + '1987');
  B.c(3, ['A man emigrated only to gain something of this world. What does he get?', 'এক লোক শুধু দুনিয়ার লাভের জন্য হিজরত করল। সে কী পাবে?'], [['Only what he emigrated for', 'শুধু তা-ই, যার জন্য সে হিজরত করেছে'], ['The full reward of Hijrah', 'হিজরতের পুরো সওয়াব'], ['Double reward', 'দ্বিগুণ সওয়াব']],
    ['"His emigration was for what he emigrated for."', '"তার হিজরত সেই জিনিসের জন্যই গণ্য হবে, যার জন্য সে হিজরত করেছে।"'], BK + '1');
  B.yn(3, ['Did the Prophet ﷺ ever use bad language?', 'নবী ﷺ কি কখনো অশ্লীল কথা বলতেন?'], false,
    ['He "never used bad language," and said the best are those with the best character.', 'তিনি "কখনো অশ্লীল কথা বলতেন না," আর বলতেন সেরা তারা যাদের চরিত্র সুন্দর।'], BK + '3559');
  B.yn(3, ['"All enjoining of good is charity." True?', '"প্রতিটি ভালো কাজই সদকা।" ঠিক?'], true,
    ['"Enjoining all that is good is charity."', '"প্রতিটি ভালো কাজই সদকা।"'], BK + '6021');
  B.sort(3, ['Named as charity in the hadith, or not?', 'হাদিসে সদকা বলা হয়েছে, নাকি নয়?'], [['Charity', 'সদকা'], ['Not named', 'বলা হয়নি']],
    [['Judging justly between two people', 'দুজনের মধ্যে ন্যায়বিচার করা', 0], ['Helping a man onto his riding animal', 'কাউকে বাহনে উঠতে সাহায্য করা', 0], ['Pouring water into your brother\'s bucket', 'ভাইয়ের বালতিতে পানি ঢেলে দেওয়া', 0], ['Guiding someone with weak sight', 'দুর্বল দৃষ্টির মানুষকে পথ দেখানো', 0], ['Winning an argument', 'তর্কে জেতা', 1], ['Showing off', 'লোক দেখানো', 1]],
    ['Small acts of help are all counted as charity.', 'সাহায্যের ছোট ছোট কাজও সদকা হিসেবে গণ্য।'], BK + '2989; ' + TI + '1956');
  B.match(3, ['Match the hadith to who narrated it.', 'হাদিসের সঙ্গে বর্ণনাকারী মেলাও।'],
    [[['Deeds depend on intentions', 'কাজ নিয়তের ওপর নির্ভর করে'], ['Umar ibn al-Khattab', 'উমর ইবনুল খাত্তাব (রা.)']], [['The best of you learn and teach the Quran', 'সেরা সে, যে কুরআন শেখে ও শেখায়'], ['Uthman', 'উসমান (রা.)']], [['Be mindful of Allah', 'আল্লাহকে স্মরণে রাখো'], ['Ibn Abbas', 'ইবনে আব্বাস (রা.)']], [['Eat with your right hand', 'ডান হাতে খাও'], ['Umar ibn Abi Salamah', 'উমর ইবনে আবি সালামা (রা.)']]],
    ['Companions carried these words to us.', 'সাহাবিরা এই কথাগুলো আমাদের কাছে পৌঁছে দিয়েছেন।'], BK + '1; ' + BK + '5027; ' + TI + '2516; ' + BK + '5376');
  B.match(3, ['Match the start of the hadith to its end.', 'হাদিসের শুরুর সঙ্গে শেষ মেলাও।'],
    [[['Charity', 'সদকা'], ['does not decrease wealth', 'সম্পদ কমায় না']], [['The religion', 'দ্বীন'], ['is sincerity', 'আন্তরিক কল্যাণকামিতা']], [['Modesty', 'লজ্জাশীলতা'], ['is a branch of iman', 'ঈমানের একটি শাখা']], [['The believers', 'মুমিনরা'], ['are like one body', 'একটি দেহের মতো']]],
    ['Four sayings from Sahih Muslim and Sahih al-Bukhari.', 'সহিহ মুসলিম ও সহিহ বুখারির চারটি হাদিস।'], MS + '2588; ' + MS + '55; ' + MS + '35; ' + BK + '6011');
  B.order(3, ['Put the chain in order, from the hadith on truthfulness.', 'সত্যবাদিতার হাদিস অনুযায়ী ধাপগুলো ক্রমে সাজাও।'],
    [['Truthfulness', 'সত্যবাদিতা'], ['Righteousness', 'নেকি'], ['Paradise', 'জান্নাত']],
    ['"Truthfulness leads to righteousness, and righteousness leads to Paradise."', '"সত্য নেকির পথ দেখায়, আর নেকি জান্নাতের পথ দেখায়।"'], BK + '6094');

  KQ.define('hadith-kids', { bank: B.list });
})();
