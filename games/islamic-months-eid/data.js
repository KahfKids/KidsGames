/* Islamic Months and Eid: data.js — the question bank.
   The twelve months of the Hijri year, the new moon, the special days and the two Eids, from the Quran
   and the sahih narrations. Every source was read before its question was written.
   band: 1 = ages 4-6 (pictures), 2 = ages 7-9, 3 = ages 10-12. */
(function () {
  'use strict';
  var KQ = window.KahfQuiz, B = KQ.bank('im');
  function P(en, bn, p) { return [en, bn, p]; }
  var BN = '০১২৩৪৫৬৭৮৯';
  function bn(x) { return String(x).replace(/\d/g, function (d) { return BN[d]; }); }
  function N(x) { return [String(x), bn(x)]; }
  var BK = 'Sahih al-Bukhari ', MS = 'Sahih Muslim ', AD = 'Sunan Abi Dawud ', CAL = 'Hijri calendar (order of the months)';
  var M = [['Muharram', 'মুহাররম'], ['Safar', 'সফর'], ['Rabi al-Awwal', 'রবিউল আউয়াল'], ['Rabi ath-Thani', 'রবিউস সানি'],
    ['Jumada al-Ula', 'জুমাদাল উলা'], ['Jumada al-Akhirah', 'জুমাদাল আখিরা'], ['Rajab', 'রজব'], ['Shaban', 'শাবান'],
    ['Ramadan', 'রমজান'], ['Shawwal', 'শাওয়াল'], ['Dhul-Qadah', 'জিলকদ'], ['Dhul-Hijjah', 'জিলহজ']];
  var ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];
  var ORDB = ['প্রথম', 'দ্বিতীয়', 'তৃতীয়', 'চতুর্থ', 'পঞ্চম', 'ষষ্ঠ', 'সপ্তম', 'অষ্টম', 'নবম', 'দশম', 'একাদশ', 'দ্বাদশ'];
  function others(i, n) { var o = [], k = 0; while (o.length < n) { k++; var j = (i + k * 5) % 12; if (j !== i && o.indexOf(M[j]) < 0) o.push(M[j]); } return o; }

  // ---------- band 1 ----------
  B.c(1, ['How many months are in the Islamic year?', 'হিজরি বছরে কয়টি মাস?'], [N(12), N(7), N(10)],
    ['"The number of months with Allah is twelve."', '"আল্লাহর কাছে মাসের সংখ্যা বারো।"'], 'Quran 9:36');
  B.c(1, ['What do we look for in the sky to start a new month?', 'নতুন মাস শুরু করতে আমরা আকাশে কী খুঁজি?'], [P('The new moon', 'নতুন চাঁদ', 'crescent'), P('A rainbow', 'রংধনু', 'rainbow'), P('A cloud', 'মেঘ', 'cloud')],
    ['The new moons "are measurements of time for the people and for Hajj."', 'নতুন চাঁদ "মানুষের জন্য সময় নির্ধারণ ও হজের জন্য।"'], 'Quran 2:189');
  B.c(1, ['In which month do we fast?', 'আমরা কোন মাসে রোজা রাখি?'], [M[8], M[1], M[6]],
    ['"The month of Ramadan in which was revealed the Quran... whoever sights the month, let him fast it."', '"রমজান মাস, যাতে কুরআন নাজিল হয়েছে... যে এ মাস পাবে সে যেন রোজা রাখে।"'], 'Quran 2:185');
  B.c(1, ['Which book came down in Ramadan?', 'রমজান মাসে কোন কিতাব নাজিল হয়েছে?'], [P('The Quran', 'কুরআন', 'quran'), P('A story book', 'গল্পের বই', 'book'), P('A letter', 'চিঠি', 'paper')],
    ['"The month of Ramadan in which was revealed the Quran."', '"রমজান মাস, যাতে কুরআন নাজিল হয়েছে।"'], 'Quran 2:185');
  B.c(1, ['How many Eids did Allah give the Muslims?', 'আল্লাহ মুসলিমদের কয়টি ঈদ দিয়েছেন?'], [N(2), N(1), N(5)],
    ['"The day of sacrifice and the day of the breaking of the fast."', '"কুরবানির দিন ও রোজা ভাঙার দিন।"'], AD + '1134');
  B.c(1, ['Which Eid comes when Ramadan ends?', 'রমজান শেষ হলে কোন ঈদ আসে?'], [['Eid al-Fitr', 'ঈদুল ফিতর'], ['Eid al-Adha', 'ঈদুল আযহা']],
    ['Eid al-Fitr is the day of breaking the fast.', 'ঈদুল ফিতর রোজা ভাঙার দিন।'], AD + '1134; ' + BK + '1990');
  B.c(1, ['What did the Prophet ﷺ eat before going out on Eid al-Fitr?', 'ঈদুল ফিতরের দিন বের হওয়ার আগে নবী ﷺ কী খেতেন?'], [P('Dates', 'খেজুর', 'dates'), P('Bread', 'রুটি', 'bread'), P('Honey', 'মধু', 'honey')],
    ['He never went out on the day of Eid al-Fitr until he had eaten some dates.', 'ঈদুল ফিতরের দিন তিনি কিছু খেজুর না খেয়ে বের হতেন না।'], BK + '953');
  B.c(1, ['On Eid al-Adha, what do Muslims sacrifice?', 'ঈদুল আযহায় মুসলিমরা কী কুরবানি করে?'], [P('An animal such as a sheep', 'ভেড়ার মতো পশু', 'sheep'), P('A fish', 'মাছ', 'fish'), P('A bird', 'পাখি', 'bird')],
    ['The Prophet ﷺ sacrificed two horned rams.', 'নবী ﷺ দুটি শিংওয়ালা ভেড়া কুরবানি করেছিলেন।'], BK + '5565');
  B.yn(1, ['Do we fast on the day of Eid?', 'আমরা কি ঈদের দিন রোজা রাখি?'], false,
    ['The Messenger of Allah ﷺ forbade fasting on the two Eid days.', 'রাসুলুল্লাহ ﷺ দুই ঈদের দিন রোজা রাখতে নিষেধ করেছেন।'], BK + '1990');
  B.yn(1, ['Is Friday the best day of the week?', 'শুক্রবার কি সপ্তাহের সেরা দিন?'], true,
    ['"The best day on which the sun has risen is Friday."', '"সূর্য ওঠা দিনগুলোর মধ্যে সেরা দিন শুক্রবার।"'], MS + '854');
  B.c(1, ['What is the first month of the Islamic year?', 'হিজরি বছরের প্রথম মাস কোনটি?'], [M[0], M[8], M[9]],
    ['Muharram begins the year.', 'মুহাররম দিয়ে বছর শুরু হয়।'], CAL);
  B.c(1, ['What do we do first on Eid morning?', 'ঈদের সকালে আমরা সবার আগে কী করি?'], [['Pray the Eid prayer', 'ঈদের নামাজ পড়ি'], ['Go to sleep', 'ঘুমাতে যাই'], ['Go to school', 'স্কুলে যাই']],
    ['"The first thing to begin with was the prayer."', '"সবার আগে তিনি নামাজ শুরু করতেন।"'], BK + '956');
  B.yn(1, ['When Ramadan starts, are the gates of heaven opened?', 'রমজান শুরু হলে কি আসমানের দরজাগুলো খুলে দেওয়া হয়?'], true,
    ['"The gates of the heaven are opened and the gates of Hell are closed and the devils are chained."', '"আসমানের দরজা খুলে দেওয়া হয়, জাহান্নামের দরজা বন্ধ করা হয় এবং শয়তানদের শিকলে বাঁধা হয়।"'], BK + '1899');
  B.match(1, ['Match the day to its picture.', 'দিনের সঙ্গে ছবি মেলাও।'],
    [[['Eid al-Adha', 'ঈদুল আযহা'], { p: 'sheep' }], [['Eid al-Fitr', 'ঈদুল ফিতর'], { p: 'dates' }], [['A new month', 'নতুন মাস'], { p: 'crescent' }]],
    ['The sacrifice, the dates before the prayer, and the new moon.', 'কুরবানি, নামাজের আগে খেজুর, আর নতুন চাঁদ।'], BK + '5565; ' + BK + '953; Quran 2:189');

  // ---------- band 2 ----------
  M.forEach(function (m, i) {
    var nx = M[(i + 1) % 12];
    B.c(2, ['Which month comes after ' + m[0] + '?', m[1] + ' মাসের পরে কোন মাস আসে?'], [nx].concat(others((i + 1) % 12, 3).filter(function (x) { return x !== m; }).slice(0, 3)),
      [m[0] + ' is the ' + ORD[i] + ' month; ' + nx[0] + ' is the ' + ORD[(i + 1) % 12] + '.', m[1] + ' ' + ORDB[i] + ' মাস; ' + nx[1] + ' ' + ORDB[(i + 1) % 12] + ' মাস।'], CAL);
  });
  B.c(2, ['How many of the twelve months are sacred?', 'বারো মাসের মধ্যে কয়টি সম্মানিত (হারাম) মাস?'], [N(4), N(2), N(6), N(12)],
    ['"Of these, four are sacred."', '"এর মধ্যে চারটি সম্মানিত।"'], 'Quran 9:36');
  B.c(2, ['How many days can an Islamic month have?', 'একটি হিজরি মাসে কত দিন হতে পারে?'], [['29 or 30', '২৯ বা ৩০'], ['28 or 31', '২৮ বা ৩১'], ['Always 31', 'সব সময় ৩১'], ['Always 25', 'সব সময় ২৫']],
    ['"The month is sometimes of 29 days and sometimes of thirty days."', '"মাস কখনো ২৯ দিনের, কখনো ৩০ দিনের।"'], BK + '1913');
  B.c(2, ['When do we start fasting Ramadan?', 'আমরা কখন রমজানের রোজা শুরু করি?'], [['On seeing the crescent', 'নতুন চাঁদ দেখে'], ['When it rains', 'বৃষ্টি হলে'], ['On a Friday', 'শুক্রবারে']],
    ['"Start fasting on seeing the crescent, and give up fasting on seeing the crescent."', '"চাঁদ দেখে রোজা শুরু করো, চাঁদ দেখে রোজা ছাড়ো।"'], BK + '1909');
  B.c(2, ['The sky is cloudy and the crescent cannot be seen. What do we do?', 'আকাশ মেঘলা, চাঁদ দেখা যাচ্ছে না। আমরা কী করব?'], [['Complete thirty days', 'ত্রিশ দিন পূর্ণ করব'], ['Stop counting', 'গোনা বন্ধ করব'], ['Fast for forty days', 'চল্লিশ দিন রোজা রাখব']],
    ['"If the sky is overcast, complete thirty days of Shaban."', '"আকাশ মেঘলা থাকলে শাবানের ত্রিশ দিন পূর্ণ করো।"'], BK + '1909');
  B.c(2, ['Eid al-Fitr is on the first day of which month?', 'ঈদুল ফিতর কোন মাসের প্রথম দিনে?'], [M[9], M[8], M[11], M[0]],
    ['We stop fasting on seeing the crescent of Shawwal.', 'শাওয়ালের চাঁদ দেখে আমরা রোজা ছাড়ি।'], BK + '1909');
  B.c(2, ['In which month are Hajj and Eid al-Adha?', 'হজ ও ঈদুল আযহা কোন মাসে?'], [M[11], M[8], M[6], M[1]],
    ['The day of sacrifice is the tenth of Dhul-Hijjah, the month of Hajj.', 'কুরবানির দিন জিলহজের দশ তারিখ; জিলহজ হজের মাস।'], CAL + '; ' + AD + '1134');
  B.c(2, ['Which night is better than a thousand months?', 'কোন রাত হাজার মাসের চেয়ে উত্তম?'], [['Laylat al-Qadr', 'লাইলাতুল কদর'], ['The first night of the year', 'বছরের প্রথম রাত'], ['The night of Eid', 'ঈদের রাত']],
    ['"The Night of Decree is better than a thousand months."', '"কদরের রাত হাজার মাসের চেয়ে উত্তম।"'], 'Quran 97:3');
  B.c(2, ['When should we look for Laylat al-Qadr?', 'লাইলাতুল কদর কখন খুঁজতে হবে?'], [['The odd nights of the last ten of Ramadan', 'রমজানের শেষ দশকের বিজোড় রাতে'], ['The first night of Ramadan', 'রমজানের প্রথম রাতে'], ['The middle of Shaban', 'শাবানের মাঝামাঝি']],
    ['"Search for the Night of Qadr in the odd nights of the last ten days of Ramadan."', '"রমজানের শেষ দশকের বিজোড় রাতগুলোতে কদরের রাত খোঁজো।"'], BK + '2017');
  B.c(2, ['On which day of Muharram is Ashura?', 'আশুরা মুহাররমের কত তারিখে?'], [['The 10th', '১০ তারিখ'], ['The 1st', '১ তারিখ'], ['The 20th', '২০ তারিখ']],
    ['Ashura is the tenth of Muharram.', 'আশুরা মুহাররমের দশ তারিখ।'], MS + '1162');
  B.c(2, ['Which prophet did Allah save on the day of Ashura?', 'আশুরার দিনে আল্লাহ কোন নবীকে রক্ষা করেছিলেন?'], [['Musa', 'মুসা (আ.)'], ['Nuh', 'নূহ (আ.)'], ['Yunus', 'ইউনুস (আ.)'], ['Ibrahim', 'ইবরাহিম (আ.)']],
    ['It was the day Allah rescued Bani Israil from their enemy, so Musa fasted it.', 'এ দিনে আল্লাহ বনি ইসরাইলকে শত্রুর হাত থেকে রক্ষা করেন, তাই মুসা (আ.) এ দিন রোজা রাখেন।'], BK + '2004');
  B.c(2, ['How did the Prophet ﷺ go home after the Eid prayer?', 'ঈদের নামাজের পর নবী ﷺ কীভাবে ফিরতেন?'], [['By a different road', 'ভিন্ন পথ দিয়ে'], ['By the same road', 'একই পথ দিয়ে'], ['He stayed until night', 'রাত পর্যন্ত থেকে যেতেন']],
    ['He returned by a way different from the one by which he went.', 'তিনি যে পথে যেতেন, তার ভিন্ন পথে ফিরতেন।'], BK + '986');
  B.c(2, ['How many dates did the Prophet ﷺ eat before the Eid al-Fitr prayer?', 'ঈদুল ফিতরের নামাজের আগে নবী ﷺ কয়টি খেজুর খেতেন?'], [['An odd number', 'বিজোড় সংখ্যক'], ['An even number', 'জোড় সংখ্যক'], ['None', 'একটিও না']],
    ['"The Prophet ﷺ used to eat an odd number of dates."', '"নবী ﷺ বিজোড় সংখ্যক খেজুর খেতেন।"'], BK + '953');
  B.c(2, ['When must Zakat al-Fitr be given?', 'সদকাতুল ফিতর কখন দিতে হবে?'], [['Before people go out to the Eid prayer', 'মানুষ ঈদের নামাজে যাওয়ার আগে'], ['A month after Eid', 'ঈদের এক মাস পরে'], ['Any time in the year', 'বছরের যেকোনো সময়']],
    ['He ordered that it be paid before the people went out to offer the Eid prayer.', 'তিনি আদেশ করেছেন, মানুষ ঈদের নামাজে যাওয়ার আগেই যেন তা আদায় করা হয়।'], BK + '1503');
  B.c(2, ['On Eid al-Adha, what comes first?', 'ঈদুল আযহায় কোনটি আগে?'], [['The prayer, then the sacrifice', 'আগে নামাজ, পরে কুরবানি'], ['The sacrifice, then the prayer', 'আগে কুরবানি, পরে নামাজ']],
    ['"The first thing that we should do on this day of ours is to pray and then return to slaughter the sacrifice."', '"আমাদের এই দিনে প্রথম কাজ নামাজ পড়া, তারপর ফিরে গিয়ে কুরবানি করা।"'], BK + '965');
  B.c(2, ['From which event does the Islamic calendar count its years?', 'হিজরি সন কোন ঘটনা থেকে গণনা করা হয়?'], [['The Prophet\'s ﷺ arrival in Madinah', 'নবী ﷺ-এর মদিনায় আগমন'], ['His birth', 'তাঁর জন্ম'], ['The first revelation', 'প্রথম ওহি']],
    ['The companions counted from the day of his arrival at Madinah.', 'সাহাবিরা তাঁর মদিনায় আগমনের দিন থেকে গণনা শুরু করেছিলেন।'], BK + '3934');
  B.yn(2, ['Did Allah give the moon phases so that we may know the number of years?', 'আল্লাহ কি চাঁদের জন্য মনজিল ঠিক করেছেন, যাতে আমরা বছর গণনা জানতে পারি?'], true,
    ['He "determined for it phases, that you may know the number of years and account of time."', 'তিনি "এর জন্য মনজিল নির্ধারণ করেছেন, যাতে তোমরা বছরের গণনা ও হিসাব জানতে পারো।"'], 'Quran 10:5');
  B.sort(2, ['A sacred month, or not?', 'সম্মানিত মাস, নাকি নয়?'], [['Sacred', 'সম্মানিত'], ['Not one of the four', 'চারটির একটি নয়']],
    [['Muharram', 'মুহাররম', 0], ['Rajab', 'রজব', 0], ['Dhul-Qadah', 'জিলকদ', 0], ['Dhul-Hijjah', 'জিলহজ', 0], ['Safar', 'সফর', 1], ['Shawwal', 'শাওয়াল', 1]],
    ['Three in a row, Dhul-Qadah, Dhul-Hijjah and Muharram, and Rajab.', 'পরপর তিনটি: জিলকদ, জিলহজ ও মুহাররম; আর রজব।'], BK + '3197');
  B.sort(2, ['Eid al-Fitr or Eid al-Adha?', 'ঈদুল ফিতর, নাকি ঈদুল আযহা?'], [['Eid al-Fitr', 'ঈদুল ফিতর'], ['Eid al-Adha', 'ঈদুল আযহা']],
    [['Comes after Ramadan', 'রমজানের পরে আসে', 0], ['Dates before the prayer', 'নামাজের আগে খেজুর', 0], ['Zakat al-Fitr', 'সদকাতুল ফিতর', 0], ['The sacrifice', 'কুরবানি', 1], ['In the month of Hajj', 'হজের মাসে', 1]],
    ['One Eid ends the fast; the other is the day of sacrifice.', 'একটি ঈদ রোজার শেষে; অন্যটি কুরবানির দিন।'], BK + '953; ' + BK + '1503; ' + BK + '965');
  B.order(2, ['Put these months in order.', 'মাসগুলো ক্রমে সাজাও।'], [M[0], M[1], M[2], M[3]],
    ['The first four months of the year.', 'বছরের প্রথম চার মাস।'], CAL);
  B.order(2, ['Put these months in order.', 'মাসগুলো ক্রমে সাজাও।'], [M[6], M[7], M[8], M[9]],
    ['Rajab, Shaban, Ramadan, then Shawwal.', 'রজব, শাবান, রমজান, তারপর শাওয়াল।'], CAL);
  B.match(2, ['Match the day to its month.', 'দিনের সঙ্গে মাস মেলাও।'],
    [[['Ashura', 'আশুরা'], M[0]], [['Laylat al-Qadr', 'লাইলাতুল কদর'], M[8]], [['Eid al-Fitr', 'ঈদুল ফিতর'], M[9]], [['The day of Arafah', 'আরাফার দিন'], M[11]]],
    ['Each special day has its month.', 'প্রতিটি বিশেষ দিনের নিজস্ব মাস আছে।'], MS + '1162; ' + BK + '2017; ' + BK + '1909');

  // ---------- band 3 ----------
  [2, 4, 6, 7, 9, 10].forEach(function (i) {
    B.c(3, ['Which is the ' + ORD[i] + ' month of the Islamic year?', 'হিজরি বছরের ' + ORDB[i] + ' মাস কোনটি?'], [M[i]].concat(others(i, 3)),
      [M[i][0] + ' is month ' + (i + 1) + ' of 12.', M[i][1] + ' বারো মাসের মধ্যে ' + bn(i + 1) + ' নম্বর মাস।'], CAL);
  });
  [0, 3, 5, 8, 11].forEach(function (i) {
    var pv = M[(i + 11) % 12];
    B.c(3, ['Which month comes just before ' + M[i][0] + '?', M[i][1] + ' মাসের ঠিক আগে কোন মাস?'], [pv].concat(others((i + 11) % 12, 4).filter(function (x) { return x !== M[i]; }).slice(0, 3)),
      [pv[0] + ' comes before ' + M[i][0] + '.', pv[1] + ' মাসের পরে আসে ' + M[i][1] + '।'], CAL);
  });
  B.c(3, ['Three sacred months come in a row. Which is the fourth, standing alone?', 'তিনটি সম্মানিত মাস পরপর আসে। একা থাকা চতুর্থ মাসটি কোনটি?'], [M[6], M[7], M[1], M[9]],
    ['"Rajab of Mudar, which comes between Jumada ath-Thaniyah and Shaban."', '"মুদার গোত্রের রজব, যা জুমাদাস সানিয়া ও শাবানের মাঝখানে।"'], BK + '3197');
  B.c(3, ['Which three sacred months come one after another?', 'কোন তিনটি সম্মানিত মাস পরপর আসে?'], [['Dhul-Qadah, Dhul-Hijjah, Muharram', 'জিলকদ, জিলহজ, মুহাররম'], ['Rajab, Shaban, Ramadan', 'রজব, শাবান, রমজান'], ['Muharram, Safar, Rabi al-Awwal', 'মুহাররম, সফর, রবিউল আউয়াল']],
    ['"Three are in succession: Dhul-Qadah, Dhul-Hijjah and Muharram."', '"তিনটি পরপর: জিলকদ, জিলহজ ও মুহাররম।"'], BK + '3197');
  B.c(3, ['Which month is called "the month of Allah", with the best fasting after Ramadan?', 'কোন মাসকে "আল্লাহর মাস" বলা হয়েছে, রমজানের পর যার রোজা সর্বোত্তম?'], [M[0], M[6], M[7], M[9]],
    ['"The most excellent fast after Ramadan is Allah\'s month, al-Muharram."', '"রমজানের পর সর্বোত্তম রোজা আল্লাহর মাস মুহাররমের রোজা।"'], MS + '1163');
  B.c(3, ['In which month, other than Ramadan, did the Prophet ﷺ fast the most?', 'রমজান ছাড়া কোন মাসে নবী ﷺ সবচেয়ে বেশি রোজা রাখতেন?'], [M[7], M[6], M[9], M[0]],
    ['Aishah did not see him fasting in any month more than in Shaban.', 'আয়েশা (রা.) তাঁকে শাবানের চেয়ে বেশি রোজা অন্য কোনো মাসে রাখতে দেখেননি।'], BK + '1969');
  B.c(3, ['Whoever fasts Ramadan and follows it with six days of which month has fasted as if always?', 'যে রমজানের রোজা রেখে কোন মাসের ছয়টি রোজা রাখে, সে যেন সারা বছর রোজা রাখল?'], [M[9], M[7], M[0], M[11]],
    ['"He who observed the fast of Ramadan and then followed it with six of Shawwal..."', '"যে রমজানের রোজা রাখল, তারপর শাওয়ালের ছয়টি রোজা রাখল..."'], MS + '1164');
  B.c(3, ['Fasting the day of Arafah expiates the sins of how long?', 'আরাফার দিনের রোজা কত সময়ের গুনাহ মাফ করে?'], [['The year before and the year after', 'আগের এক বছর ও পরের এক বছর'], ['One week', 'এক সপ্তাহ'], ['One month', 'এক মাস'], ['Only that day', 'শুধু সেই দিন']],
    ['"It expiates the sins of the preceding year and the coming year."', '"তা আগের বছর ও পরের বছরের গুনাহ মাফ করে।"'], MS + '1162');
  B.c(3, ['Fasting the day of Ashura expiates the sins of how long?', 'আশুরার দিনের রোজা কত সময়ের গুনাহ মাফ করে?'], [['The year before', 'আগের এক বছর'], ['Two years', 'দুই বছর'], ['Ten years', 'দশ বছর']],
    ['"It expiates the sins of the preceding year."', '"তা আগের বছরের গুনাহ মাফ করে।"'], MS + '1162');
  B.c(3, ['Which day did the Prophet ﷺ intend to fast along with Ashura the next year?', 'পরের বছর আশুরার সঙ্গে নবী ﷺ আর কোন দিন রোজা রাখার ইচ্ছা করেছিলেন?'], [['The 9th of Muharram', 'মুহাররমের ৯ তারিখ'], ['The 1st of Muharram', 'মুহাররমের ১ তারিখ'], ['The 15th of Muharram', 'মুহাররমের ১৫ তারিখ']],
    ['"When the next year comes, God willing, we would observe fast on the 9th."', '"আগামী বছর এলে, ইনশাআল্লাহ, আমরা নবম তারিখেও রোজা রাখব।"'], MS + '1134');
  B.c(3, ['On which day of the month of Dhul-Hijjah is the day of Arafah?', 'আরাফার দিন জিলহজের কত তারিখে?'], [['The 9th', '৯ তারিখ'], ['The 1st', '১ তারিখ'], ['The 13th', '১৩ তারিখ'], ['The 29th', '২৯ তারিখ']],
    ['Arafah is the ninth, and the day of sacrifice is the tenth.', 'আরাফা নবম তারিখে, আর কুরবানির দিন দশম তারিখে।'], MS + '1162');
  B.c(3, ['"No good deeds done on other days are superior to those done on these days." Which days?', '"অন্য কোনো দিনের নেক আমল এই দিনগুলোর আমলের চেয়ে উত্তম নয়।" কোন দিনগুলো?'], [['The first ten days of Dhul-Hijjah', 'জিলহজের প্রথম দশ দিন'], ['The last ten days of Shawwal', 'শাওয়ালের শেষ দশ দিন'], ['The first ten days of Safar', 'সফরের প্রথম দশ দিন']],
    ['The first ten days of Dhul-Hijjah are the best days for good deeds.', 'জিলহজের প্রথম দশ দিন নেক আমলের সেরা দিন।'], BK + '969');
  B.c(3, ['The days of Tashriq, after Eid al-Adha, are days of ...', 'ঈদুল আযহার পরের তাশরিকের দিনগুলো হলো ...'], [['eating and drinking', 'খাওয়া ও পান করার দিন'], ['fasting', 'রোজার দিন'], ['travelling', 'সফরের দিন']],
    ['"The days of Tashriq are the days of eating and drinking."', '"তাশরিকের দিনগুলো খাওয়া ও পান করার দিন।"'], MS + '1141');
  B.c(3, ['The people of Madinah had two days of play. What did the Prophet ﷺ say Allah gave instead?', 'মদিনাবাসীর খেলাধুলার দুটি দিন ছিল। নবী ﷺ বললেন আল্লাহ এর বদলে কী দিয়েছেন?'], [['Two better days: Adha and Fitr', 'দুটি উত্তম দিন: আযহা ও ফিতর'], ['One better day: Friday', 'একটি উত্তম দিন: শুক্রবার'], ['Three days of rest', 'তিন দিন বিশ্রাম']],
    ['"Allah has substituted for them something better: the day of sacrifice and the day of the breaking of the fast."', '"আল্লাহ এর বদলে উত্তম দুটি দিন দিয়েছেন: কুরবানির দিন ও ফিতরের দিন।"'], AD + '1134');
  B.c(3, ['How much is Zakat al-Fitr for each person?', 'প্রত্যেকের জন্য সদকাতুল ফিতরের পরিমাণ কত?'], [['One sa of dates or barley', 'এক সা খেজুর বা যব'], ['One gold coin', 'একটি স্বর্ণমুদ্রা'], ['One camel', 'একটি উট']],
    ['One sa of dates or one sa of barley, on every Muslim, young or old.', 'প্রত্যেক মুসলিমের ওপর, ছোট হোক বা বড়, এক সা খেজুর বা এক সা যব।'], BK + '1503');
  B.c(3, ['What comes first on Eid: the prayer or the khutbah?', 'ঈদের দিন কোনটি আগে: নামাজ, নাকি খুতবা?'], [['The prayer', 'নামাজ'], ['The khutbah', 'খুতবা']],
    ['He began with the prayer, then stood in front of the people and preached to them.', 'তিনি নামাজ দিয়ে শুরু করতেন, তারপর মানুষের সামনে দাঁড়িয়ে খুতবা দিতেন।'], BK + '956');
  B.c(3, ['Someone slaughtered his sacrifice before the Eid prayer. What is it counted as?', 'কেউ ঈদের নামাজের আগে কুরবানি করল। তা কী হিসেবে গণ্য হবে?'], [['Just meat for his family', 'শুধু পরিবারের জন্য গোশত'], ['A double sacrifice', 'দ্বিগুণ কুরবানি'], ['The best sacrifice', 'সেরা কুরবানি']],
    ['"It was just meat which he presented to his family."', '"তা শুধু গোশত, যা সে তার পরিবারকে দিল।"'], BK + '965');
  B.c(3, ['On which day was the Prophet ﷺ born, as he said when asked about fasting it?', 'নবী ﷺ কোন বারে জন্মেছিলেন, যা তিনি সেদিনের রোজা সম্পর্কে জিজ্ঞাসিত হয়ে বলেছিলেন?'], [['Monday', 'সোমবার'], ['Friday', 'শুক্রবার'], ['Wednesday', 'বুধবার'], ['Saturday', 'শনিবার']],
    ['"It was the day on which I was born, and on which revelation was sent to me."', '"এ দিনেই আমার জন্ম, আর এ দিনেই আমার ওপর ওহি নাজিল হয়েছে।"'], MS + '1162');
  B.c(3, ['Which of these happened on a Friday?', 'এর মধ্যে কোনটি শুক্রবারে ঘটেছিল?'], [['Adam was created', 'আদম (আ.)-কে সৃষ্টি করা হয়'], ['The Hijrah began', 'হিজরত শুরু হয়'], ['The Quran was completed', 'কুরআন সম্পূর্ণ হয়']],
    ['"On it Adam was created, on it he was made to enter Paradise."', '"এ দিনে আদমকে সৃষ্টি করা হয়, এ দিনে তাঁকে জান্নাতে প্রবেশ করানো হয়।"'], MS + '854');
  B.c(3, ['When the adhan is called for the prayer on Friday, what are the believers told to leave?', 'শুক্রবার নামাজের আজান হলে মুমিনদের কী ছেড়ে দিতে বলা হয়েছে?'], [['Trade', 'বেচাকেনা'], ['Their homes', 'ঘরবাড়ি'], ['Their shoes', 'জুতা']],
    ['"Proceed to the remembrance of Allah and leave trade."', '"আল্লাহর স্মরণের দিকে ছুটে যাও এবং বেচাকেনা ছেড়ে দাও।"'], 'Quran 62:9');
  B.yn(3, ['Are the months of the Islamic year lunar, following the moon?', 'হিজরি বছরের মাসগুলো কি চাঁদের হিসাবে চলে?'], true,
    ['The new moons are "measurements of time for the people and for Hajj."', 'নতুন চাঁদ "মানুষের জন্য সময় নির্ধারণ ও হজের জন্য।"'], 'Quran 2:189; Quran 10:5');
  B.sort(3, ['A day to fast, or a day when fasting is not allowed?', 'রোজার দিন, নাকি রোজা নিষিদ্ধ দিন?'], [['A day to fast', 'রোজার দিন'], ['No fasting', 'রোজা নিষেধ']],
    [['Ashura', 'আশুরা', 0], ['The day of Arafah', 'আরাফার দিন', 0], ['Six days of Shawwal', 'শাওয়ালের ছয় দিন', 0], ['Eid al-Fitr', 'ঈদুল ফিতর', 1], ['Eid al-Adha', 'ঈদুল আযহা', 1], ['The days of Tashriq', 'তাশরিকের দিনগুলো', 1]],
    ['Eid and the days of Tashriq are for eating and drinking.', 'ঈদ ও তাশরিকের দিনগুলো খাওয়া ও পান করার জন্য।'], MS + '1162; ' + MS + '1164; ' + BK + '1990; ' + MS + '1141');
  B.match(3, ['Match the month to what it is known for.', 'মাসের সঙ্গে তার পরিচয় মেলাও।'],
    [[M[0], ['The month of Allah', 'আল্লাহর মাস']], [M[7], ['The Prophet ﷺ fasted most of it', 'নবী ﷺ এর অধিকাংশ দিন রোজা রাখতেন']], [M[8], ['The Quran was revealed', 'কুরআন নাজিল হয়েছে']], [M[9], ['Six fasts after Ramadan', 'রমজানের পর ছয় রোজা']]],
    ['Four months and their gifts.', 'চার মাস ও তাদের ফজিলত।'], MS + '1163; ' + BK + '1969; Quran 2:185; ' + MS + '1164');
  B.order(3, ['Put the whole second half of the year in order.', 'বছরের শেষ ছয় মাস ক্রমে সাজাও।'], [M[6], M[7], M[8], M[9], M[10], M[11]],
    ['Rajab, Shaban, Ramadan, Shawwal, Dhul-Qadah, Dhul-Hijjah.', 'রজব, শাবান, রমজান, শাওয়াল, জিলকদ, জিলহজ।'], CAL);
  B.order(3, ['Put the morning of Eid al-Fitr in order.', 'ঈদুল ফিতরের সকালের কাজগুলো ক্রমে সাজাও।'],
    [['Give Zakat al-Fitr', 'সদকাতুল ফিতর আদায় করা'], ['Go out and pray the Eid prayer', 'বের হয়ে ঈদের নামাজ পড়া'], ['Listen to the khutbah', 'খুতবা শোনা'], ['Return by a different road', 'ভিন্ন পথে ফিরে আসা']],
    ['Zakat al-Fitr before the prayer, the prayer before the khutbah, and a different road home.', 'নামাজের আগে ফিতরা, খুতবার আগে নামাজ, আর ফেরার সময় ভিন্ন পথ।'], BK + '1503; ' + BK + '956; ' + BK + '986');

  KQ.define('islamic-months-eid', { bank: B.list });
})();
