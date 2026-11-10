/* Ramadan Nights: data.js — the question bank.
   Every question is written from a source that was opened and read (quran.com with Saheeh International,
   and sunnah.com) on 2026-11-10, and carries that reference in `ref`. Questions stay with what the cited
   text plainly says. To remove a question, delete its entry; nothing else depends on it.
   band: 1 = ages 4-6 (pictures), 2 = ages 7-9, 3 = ages 10-12. */
(function () {
  'use strict';
  function t(en, bn) { return { en: en, bn: bn }; }
  function a(en, bn, p) { var o = { t: t(en, bn) }; if (p) o.p = p; return o; }

  var Q185 = 'Quran 2:185', Q187 = 'Quran 2:187';
  var B = 'Sahih al-Bukhari ';

  window.RamadanBank = [
    // ================= band 1: ages 4-6 =================
    { id: 's-dates', band: 1, type: 'choice', q: t('The Prophet ﷺ broke his fast with…', 'নবী ﷺ কী দিয়ে ইফতার করতেন?'),
      a: [a('Dates', 'খেজুর', 'dates'), a('A ball', 'বল', 'ball'), a('A lantern', 'লণ্ঠন', 'lantern')], correct: 0,
      why: t('He broke his fast with fresh dates.', 'তিনি তাজা খেজুর দিয়ে ইফতার করতেন।'), ref: 'Sunan Abi Dawud 2356' },
    { id: 's-water', band: 1, type: 'choice', q: t('If there were no dates, he broke his fast with…', 'খেজুর না থাকলে তিনি কী দিয়ে ইফতার করতেন?'),
      a: [a('Water', 'পানি', 'water'), a('A gift', 'উপহার', 'gift'), a('A mat', 'জায়নামাজ', 'mat')], correct: 0,
      why: t('With no dates, he took some water.', 'খেজুর না থাকলে তিনি কয়েক ঢোক পানি পান করতেন।'), ref: 'Sunan Abi Dawud 2356' },
    { id: 's-book', band: 1, type: 'choice', q: t('Which book came down in Ramadan?', 'রমজান মাসে কোন কিতাব নাজিল হয়েছে?'),
      a: [a('The Quran', 'কুরআন', 'quran'), a('A ball', 'বল', 'ball'), a('A bed', 'বিছানা', 'bed')], correct: 0,
      why: t('The Quran was sent down in the month of Ramadan.', 'রমজান মাসে কুরআন নাজিল হয়েছে।'), ref: Q185 },
    { id: 's-moon', band: 1, type: 'choice', q: t('We start fasting when we see the…', 'কী দেখে আমরা রোজা শুরু করি?'),
      a: [a('New moon', 'নতুন চাঁদ', 'crescent'), a('Sun', 'সূর্য', 'sun'), a('Palm tree', 'খেজুর গাছ', 'palm')], correct: 0,
      why: t('We start fasting when the new moon is seen.', 'নতুন চাঁদ দেখে রোজা শুরু হয়।'), ref: B + '1909' },
    { id: 's-until', band: 1, type: 'choice', q: t('We fast all day until…', 'আমরা সারা দিন রোজা রাখি কখন পর্যন্ত?'),
      a: [a('Sunset', 'সূর্য ডোবা', 'sunset'), a('Midday', 'দুপুর', 'sun')], correct: 0,
      why: t('The fast is kept until the night comes.', 'রাত আসা পর্যন্ত রোজা পূর্ণ করতে হয়।'), ref: Q187 },
    { id: 's-eid-dates', band: 1, type: 'choice', q: t('On Eid morning the Prophet ﷺ ate some … before the prayer.', 'ঈদের সকালে নামাজের আগে নবী ﷺ কী খেতেন?'),
      a: [a('Dates', 'খেজুর', 'dates'), a('Water', 'পানি', 'water')], correct: 0,
      why: t('He did not go out on Eid al-Fitr until he had eaten some dates.', 'ঈদুল ফিতরের দিন তিনি কয়েকটি খেজুর না খেয়ে বের হতেন না।'), ref: B + '953' },
    { id: 's-mosque', band: 1, type: 'choice', q: t('In Ramadan the Prophet ﷺ prayed at night in the…', 'রমজানে নবী ﷺ রাতে কোথায় নামাজ পড়েছিলেন?'),
      a: [a('Mosque', 'মসজিদ', 'mosque'), a('Palm tree', 'খেজুর গাছ', 'palm'), a('Bed', 'বিছানা', 'bed')], correct: 0,
      why: t('He prayed at night in the mosque and the people prayed with him.', 'তিনি রাতে মসজিদে নামাজ পড়লেন, লোকেরাও তাঁর সঙ্গে পড়ল।'), ref: B + '1129' },
    { id: 's-rude', band: 1, type: 'choice', q: t('Someone is rude to you while you fast. What do you do?', 'রোজা রেখেছ, কেউ খারাপ কথা বলল। তুমি কী করবে?'),
      a: [a('Say “I am fasting”', 'বলব “আমি রোজাদার”', 'heart'), a('Shout back', 'চিৎকার করব', 'shout')], correct: 0,
      why: t('A fasting person says, “I am fasting.”', 'রোজাদার বলবে, “আমি রোজাদার।”'), ref: B + '1894' },
    { id: 's-suhur', band: 1, type: 'yesno', qp: 'plate', q: t('Suhur is the meal before dawn. Is there blessing in it?', 'সাহরি হলো ভোরের আগের খাবার। এতে কি বরকত আছে?'), yes: true,
      why: t('Eat suhur, for there is blessing in it.', 'সাহরি খাও, কারণ সাহরিতে বরকত আছে।'), ref: B + '1923' },
    { id: 's-forgot', band: 1, type: 'yesno', qp: 'dates', q: t('You forgot and ate while fasting. Can you carry on with your fast?', 'রোজা রেখে ভুলে খেয়ে ফেলেছ। রোজা কি চালিয়ে যাবে?'), yes: true,
      why: t('Yes. Finish your fast. Allah gave you that food.', 'হ্যাঁ, রোজা পূর্ণ করো। আল্লাহই তোমাকে খাইয়েছেন।'), ref: B + '1933' },
    { id: 's-pillar', band: 1, type: 'yesno', qp: 'crescent', q: t('Is fasting in Ramadan one of the five pillars of Islam?', 'রমজানের রোজা কি ইসলামের পাঁচটি স্তম্ভের একটি?'), yes: true,
      why: t('Islam is built on five, and fasting Ramadan is one of them.', 'ইসলাম পাঁচটি ভিত্তির ওপর, রমজানের রোজা তার একটি।'), ref: B + '8' },
    { id: 's-feed', band: 1, type: 'yesno', qp: 'gift', q: t('You give food to a fasting person for iftar. Do you get a reward too?', 'রোজাদারকে ইফতার করালে তুমিও কি সওয়াব পাবে?'), yes: true,
      why: t('Yes, the same reward as the fasting person.', 'হ্যাঁ, রোজাদারের সমান সওয়াব।'), ref: "Jami' at-Tirmidhi 807" },
    { id: 's-dayeat', band: 1, type: 'yesno', qp: 'sun', q: t('When we fast, do we eat and drink in the daytime?', 'রোজা রাখলে আমরা কি দিনের বেলায় খাই বা পান করি?'), yes: false,
      why: t('We eat and drink until dawn, then fast until night.', 'ভোর পর্যন্ত খাওয়া যায়, তারপর রাত পর্যন্ত রোজা।'), ref: Q187 },
    { id: 's-fight', band: 1, type: 'yesno', qp: 'shield', q: t('Fasting is a shield. Should a fasting person fight?', 'রোজা একটি ঢাল। রোজাদার কি ঝগড়া করবে?'), yes: false,
      why: t('Fasting is a shield, so we do not fight or say bad words.', 'রোজা ঢাল, তাই ঝগড়া বা খারাপ কথা নয়।'), ref: B + '1894' },
    { id: 's-day', band: 1, type: 'order', q: t('Put the fasting day in order.', 'রোজার দিনটি পরপর সাজাও।'),
      items: [a('Eat suhur', 'সাহরি খাই', 'plate'), a('Fast all day', 'সারা দিন রোজা', 'sun'), a('Break the fast', 'ইফতার করি', 'dates')],
      why: t('Eat before dawn, fast in the day, break the fast at night.', 'ভোরের আগে খাওয়া, দিনে রোজা, রাতে ইফতার।'), ref: Q187 },
    { id: 's-first', band: 1, type: 'order', q: t('What did the Prophet ﷺ reach for first at iftar?', 'ইফতারে নবী ﷺ প্রথমে কোনটি নিতেন? পরপর সাজাও।'),
      items: [a('Fresh dates', 'তাজা খেজুর', 'palm'), a('Dry dates', 'শুকনো খেজুর', 'dates'), a('Water', 'পানি', 'water')],
      why: t('Fresh dates first. If none, dry dates. If none, water.', 'প্রথমে তাজা খেজুর, না থাকলে শুকনো খেজুর, তাও না থাকলে পানি।'), ref: 'Sunan Abi Dawud 2356' },
    { id: 's-times', band: 1, type: 'sort', q: t('Time to fast, or time to eat?', 'রোজার সময়, নাকি খাওয়ার সময়?'),
      bins: [a('Time to fast', 'রোজার সময়', 'sun'), a('Time to eat', 'খাওয়ার সময়', 'plate')],
      items: [{ t: t('Midday', 'দুপুর'), p: 'sun', bin: 0 }, { t: t('Night', 'রাত'), p: 'night', bin: 1 }, { t: t('After sunset', 'সূর্য ডোবার পর'), p: 'sunset', bin: 1 }, { t: t('Before dawn', 'ভোরের আগে'), p: 'dawn', bin: 1 }],
      why: t('We eat at night until dawn, and fast in the day.', 'রাতে ভোর পর্যন্ত খাই, দিনে রোজা রাখি।'), ref: Q187 },
    { id: 's-deeds', band: 1, type: 'sort', q: t('Good for a fasting person, or not?', 'রোজাদারের জন্য ভালো, নাকি ভালো নয়?'),
      bins: [a('Good', 'ভালো', 'yes'), a('Not good', 'ভালো নয়', 'no')],
      items: [{ t: t('Giving food for iftar', 'ইফতার করানো'), p: 'gift', bin: 0 }, { t: t('Shouting bad words', 'চিৎকার করে খারাপ কথা'), p: 'shout', bin: 1 }, { t: t('Praying at night', 'রাতে নামাজ'), p: 'mat', bin: 0 }, { t: t('Telling lies', 'মিথ্যা বলা'), bin: 1 }],
      why: t('Give and pray. No bad words and no lies.', 'দান করো, নামাজ পড়ো। খারাপ কথা ও মিথ্যা নয়।'), ref: B + "37, 1894, 1903; Jami' at-Tirmidhi 807" },
    { id: 's-match', band: 1, type: 'match', q: t('Match the meal to its time.', 'কোন খাবার কখন? মিলিয়ে দাও।'),
      pairs: [{ l: a('Suhur', 'সাহরি', 'plate'), r: a('Before dawn', 'ভোরের আগে', 'dawn') }, { l: a('Iftar', 'ইফতার', 'dates'), r: a('After sunset', 'সূর্য ডোবার পর', 'sunset') }],
      why: t('Suhur is before dawn. Iftar is when the night comes.', 'সাহরি ভোরের আগে, ইফতার রাত এলে।'), ref: Q187 },
    { id: 's-gate', band: 1, type: 'yesno', qp: 'gate', q: t('Is there a special gate in Paradise for people who fast?', 'রোজাদারদের জন্য কি জান্নাতে একটি বিশেষ দরজা আছে?'), yes: true,
      why: t('Yes. It is called Ar-Rayyan.', 'হ্যাঁ, তার নাম আর-রাইয়ান।'), ref: B + '1896' },

    // ================= band 2: ages 7-9 =================
    { id: 'e-month', band: 2, type: 'choice', q: t('In which month was the Quran sent down?', 'কোন মাসে কুরআন নাজিল হয়েছে?'),
      a: [a('Ramadan', 'রমজান'), a('Shawwal', 'শাওয়াল'), a('Rajab', 'রজব'), a('Muharram', 'মুহাররম')], correct: 0,
      why: t('“The month of Ramadan in which was revealed the Quran.”', '“রমজান মাস, যাতে কুরআন নাজিল করা হয়েছে।”'), ref: Q185 },
    { id: 'e-why', band: 2, type: 'choice', q: t('Why was fasting decreed for the believers?', 'মুমিনদের ওপর রোজা কেন ফরজ করা হয়েছে?'),
      a: [a('So that you may become righteous', 'যাতে তোমরা মুত্তাকি হও'), a('So that food is saved', 'যাতে খাবার বাঁচে'), a('So that you sleep more', 'যাতে বেশি ঘুমানো যায়'), a('So that the day feels long', 'যাতে দিন লম্বা লাগে')], correct: 0,
      why: t('Fasting was decreed “that you may become righteous.”', 'রোজা ফরজ করা হয়েছে “যাতে তোমরা তাকওয়া অর্জন করো।”'), ref: 'Quran 2:183' },
    { id: 'e-hell', band: 2, type: 'choice', q: t('When Ramadan starts, the gates of Hell are…', 'রমজান শুরু হলে জাহান্নামের দরজাগুলো…'),
      a: [a('Closed', 'বন্ধ করা হয়'), a('Opened', 'খুলে দেওয়া হয়'), a('Left as they are', 'যেমন ছিল তেমন থাকে')], correct: 0,
      why: t('The gates of heaven are opened and the gates of Hell are closed.', 'আসমানের দরজা খোলা হয়, জাহান্নামের দরজা বন্ধ করা হয়।'), ref: B + '1899' },
    { id: 'e-devils', band: 2, type: 'choice', q: t('When Ramadan starts, the devils are…', 'রমজান শুরু হলে শয়তানদের…'),
      a: [a('Chained', 'শিকলে বাঁধা হয়'), a('Set free', 'ছেড়ে দেওয়া হয়'), a('Made stronger', 'শক্তিশালী করা হয়')], correct: 0,
      why: t('When Ramadan starts, the devils are chained.', 'রমজান শুরু হলে শয়তানদের শিকলে বাঁধা হয়।'), ref: B + '1899' },
    { id: 'e-rayyan', band: 2, type: 'choice', q: t('What is the gate of Paradise for those who fast called?', 'রোজাদারদের জন্য জান্নাতের দরজাটির নাম কী?'),
      a: [a('Ar-Rayyan', 'আর-রাইয়ান'), a('Zamzam', 'জমজম'), a('Safa', 'সাফা'), a('Al-Fatihah', 'আল-ফাতিহা')], correct: 0,
      why: t('Those who fast enter through Ar-Rayyan, and no one else.', 'রোজাদাররা আর-রাইয়ান দিয়ে প্রবেশ করবে, আর কেউ নয়।'), ref: B + '1896' },
    { id: 'e-say', band: 2, type: 'choice', q: t('Someone insults a fasting person. What should he say?', 'কেউ রোজাদারকে গালি দিলে সে কী বলবে?'),
      a: [a('“I am fasting.”', '“আমি রোজাদার।”'), a('The same insult back', 'একই গালি ফিরিয়ে দেবে'), a('“I will tell everyone.”', '“সবাইকে বলে দেব।”')], correct: 0,
      why: t('He should say, “I am fasting.”', 'সে বলবে, “আমি রোজাদার।”'), ref: B + '1894' },
    { id: 'e-joys', band: 2, type: 'choice', q: t('A fasting person has two joys. One is when he breaks his fast. The other is when he…', 'রোজাদারের দুটি আনন্দ। একটি ইফতারের সময়। অন্যটি কখন?'),
      a: [a('Meets his Lord', 'তার রবের সঙ্গে সাক্ষাতের সময়'), a('Goes to sleep', 'ঘুমাতে যাওয়ার সময়'), a('Wakes for suhur', 'সাহরিতে ওঠার সময়'), a('Buys new clothes', 'নতুন জামা কেনার সময়')], correct: 0,
      why: t('One joy at breaking the fast, the other on meeting his Lord.', 'একটি আনন্দ ইফতারের সময়, অন্যটি রবের সঙ্গে সাক্ষাতের সময়।'), ref: B + '1904' },
    { id: 'e-forgot', band: 2, type: 'yesno', q: t('A girl forgets she is fasting and drinks water. Is her fast broken?', 'একটি মেয়ে রোজার কথা ভুলে পানি পান করল। তার রোজা কি ভেঙে গেছে?'), yes: false,
      why: t('Whoever eats or drinks forgetfully should complete the fast.', 'যে ভুলে খায় বা পান করে, সে যেন রোজা পূর্ণ করে।'), ref: B + '1933' },
    { id: 'e-thousand', band: 2, type: 'choice', q: t('The Night of Decree is better than…', 'লাইলাতুল কদর কিসের চেয়ে উত্তম?'),
      a: [a('A thousand months', 'হাজার মাস'), a('A thousand days', 'হাজার দিন'), a('A hundred months', 'একশ মাস'), a('Ten years', 'দশ বছর')], correct: 0,
      why: t('“The Night of Decree is better than a thousand months.”', '“লাইলাতুল কদর হাজার মাসের চেয়ে উত্তম।”'), ref: 'Quran 97:3' },
    { id: 'e-odd', band: 2, type: 'choice', q: t('In which nights of the last ten should we look for the Night of Decree?', 'শেষ দশকের কোন রাতগুলোতে লাইলাতুল কদর খুঁজতে হবে?'),
      a: [a('The odd nights', 'বিজোড় রাত'), a('The even nights', 'জোড় রাত'), a('Only the first night', 'শুধু প্রথম রাত')], correct: 0,
      why: t('Search for it in the odd nights of the last ten.', 'শেষ দশকের বিজোড় রাতগুলোতে তা খোঁজো।'), ref: B + '2017' },
    { id: 'e-itikaf', band: 2, type: 'choice', q: t('What did the Prophet ﷺ do in the last ten days of Ramadan?', 'রমজানের শেষ দশ দিনে নবী ﷺ কী করতেন?'),
      a: [a("I'tikaf", 'ইতিকাফ'), a('Hajj', 'হজ'), a('A long journey', 'দূরের সফর'), a('Trade', 'ব্যবসা')], correct: 0,
      why: t("He did i'tikaf in the last ten days of Ramadan until he died.", 'তিনি ইন্তেকাল পর্যন্ত রমজানের শেষ দশ দিনে ইতিকাফ করতেন।'), ref: B + '2026' },
    { id: 'e-jibril', band: 2, type: 'choice', q: t('Who met the Prophet ﷺ every night of Ramadan for the Quran?', 'রমজানের প্রতি রাতে কুরআন নিয়ে কে নবী ﷺ-এর সঙ্গে দেখা করতেন?'),
      a: [a('Jibril (Gabriel)', 'জিবরাইল (আ.)'), a('A traveller', 'একজন মুসাফির'), a('A trader', 'একজন ব্যবসায়ী')], correct: 0,
      why: t('Jibril met him every night of Ramadan for the Quran.', 'জিবরাইল (আ.) রমজানের প্রতি রাতে কুরআন নিয়ে তাঁর সঙ্গে দেখা করতেন।'), ref: B + '6' },
    { id: 'e-generous', band: 2, type: 'choice', q: t('In which month was the Prophet ﷺ most generous of all?', 'কোন মাসে নবী ﷺ সবচেয়ে বেশি দান করতেন?'),
      a: [a('Ramadan', 'রমজান'), a('Shawwal', 'শাওয়াল'), a('Rajab', 'রজব'), a('Safar', 'সফর')], correct: 0,
      why: t('He was the most generous of people, most of all in Ramadan.', 'তিনি সবচেয়ে দানশীল ছিলেন, রমজানে আরও বেশি।'), ref: B + '6' },
    { id: 'e-fitr', band: 2, type: 'choice', q: t('Zakat al-Fitr is paid before people go out to…', 'যাকাতুল ফিতর কিসের আগে দিতে হয়?'),
      a: [a('The Eid prayer', 'ঈদের নামাজ'), a('Suhur', 'সাহরি'), a('The market', 'বাজার'), a('A journey', 'সফর')], correct: 0,
      why: t('He ordered it paid before people went out to the Eid prayer.', 'লোকেরা ঈদের নামাজে বের হওয়ার আগে তা দিতে আদেশ করা হয়েছে।'), ref: B + '1503' },
    { id: 'e-shawwal', band: 2, type: 'choice', q: t('After Ramadan, six more fasts are kept in which month?', 'রমজানের পর কোন মাসে আরও ছয়টি রোজা রাখা হয়?'),
      a: [a('Shawwal', 'শাওয়াল'), a("Sha'ban", 'শাবান'), a('Rajab', 'রজব'), a('Muharram', 'মুহাররম')], correct: 0,
      why: t('Ramadan followed by six of Shawwal.', 'রমজানের পর শাওয়ালের ছয়টি রোজা।'), ref: 'Sahih Muslim 1164a' },
    { id: 'e-cloudy', band: 2, type: 'choice', q: t('The sky is cloudy and the new moon cannot be seen. What do we do?', 'আকাশ মেঘলা, নতুন চাঁদ দেখা যায়নি। কী করতে হবে?'),
      a: [a('Complete thirty days', 'ত্রিশ দিন পূর্ণ করব'), a('Stop counting', 'গোনা বন্ধ করব'), a('Count twenty days', 'বিশ দিন গুনব')], correct: 0,
      why: t('If the sky is overcast, complete thirty days.', 'আকাশ মেঘলা হলে ত্রিশ দিন পূর্ণ করো।'), ref: B + '1909' },
    { id: 'e-ninth', band: 2, type: 'choice', q: t('Which month of the Islamic calendar is Ramadan?', 'ইসলামি বর্ষপঞ্জির কততম মাস রমজান?'),
      a: [a('The ninth', 'নবম'), a('The first', 'প্রথম'), a('The seventh', 'সপ্তম'), a('The twelfth', 'দ্বাদশ')], correct: 0,
      why: t("Sha'ban is the eighth month, Ramadan the ninth, Shawwal the tenth.", 'শাবান অষ্টম, রমজান নবম, শাওয়াল দশম মাস।'), ref: 'Islamic calendar (Encyclopaedia Britannica)' },
    { id: 'e-musk', band: 2, type: 'yesno', q: t('Is the smell of a fasting person’s mouth better to Allah than musk?', 'রোজাদারের মুখের গন্ধ কি আল্লাহর কাছে মিশকের চেয়েও উত্তম?'), yes: true,
      why: t('It is better in the sight of Allah than the smell of musk.', 'তা আল্লাহর কাছে মিশকের সুগন্ধের চেয়েও উত্তম।'), ref: B + '1904' },
    { id: 'e-umrah', band: 2, type: 'choice', q: t('Umrah in Ramadan is equal in reward to…', 'রমজানে উমরাহ সওয়াবে কিসের সমান?'),
      a: [a('Hajj', 'হজ'), a('One fast', 'একটি রোজা'), a('One prayer', 'এক ওয়াক্ত নামাজ')], correct: 0,
      why: t('Umrah in Ramadan is equal to Hajj in reward.', 'রমজানে উমরাহ সওয়াবে হজের সমান।'), ref: B + '1782' },
    { id: 'e-ill', band: 2, type: 'choice', q: t('Someone is ill or on a journey in Ramadan and does not fast. What then?', 'কেউ রমজানে অসুস্থ বা সফরে থাকায় রোজা রাখেনি। তারপর কী করবে?'),
      a: [a('Fast the same number of days later', 'পরে সমান সংখ্যক দিন রোজা রাখবে'), a('Nothing at all', 'কিছুই করতে হবে না'), a('Fast twice as many days', 'দ্বিগুণ দিন রোজা রাখবে')], correct: 0,
      why: t('An equal number of other days are to be made up.', 'অন্য দিনগুলোতে সমান সংখ্যা পূরণ করতে হবে।'), ref: 'Quran 2:184' },
    { id: 'e-ease', band: 2, type: 'yesno', q: t('Does Allah want hardship for us?', 'আল্লাহ কি আমাদের জন্য কষ্ট চান?'), yes: false,
      why: t('“Allah intends for you ease and does not intend for you hardship.”', '“আল্লাহ তোমাদের জন্য সহজ চান, কঠিন চান না।”'), ref: Q185 },
    { id: 'e-route', band: 2, type: 'choice', q: t('After the Eid prayer, how did the Prophet ﷺ go home?', 'ঈদের নামাজের পর নবী ﷺ কোন পথে ফিরতেন?'),
      a: [a('By a different way', 'অন্য পথে'), a('By the same way', 'একই পথে'), a('He stayed until night', 'রাত পর্যন্ত থেকে যেতেন')], correct: 0,
      why: t('He returned by a way different from the one he went by.', 'তিনি যে পথে যেতেন, তার ভিন্ন পথে ফিরতেন।'), ref: B + '986' },
    { id: 'e-29', band: 2, type: 'choice', q: t('An Islamic month is 29 nights or…', 'ইসলামি মাস ২৯ রাত অথবা…'),
      a: [a('30', '৩০'), a('31', '৩১'), a('28', '২৮'), a('27', '২৭')], correct: 0,
      why: t('The month can be 29 nights. If the moon is hidden, complete thirty.', 'মাস ২৯ রাতের হতে পারে। চাঁদ দেখা না গেলে ত্রিশ পূর্ণ করো।'), ref: B + '1907' },
    { id: 'e-iftar-order', band: 2, type: 'order', q: t('What did the Prophet ﷺ break his fast with? First choice first.', 'নবী ﷺ কী দিয়ে ইফতার করতেন? প্রথম পছন্দ আগে।'),
      items: [a('Fresh dates', 'তাজা খেজুর'), a('Dry dates', 'শুকনো খেজুর'), a('Water', 'পানি')],
      why: t('Fresh dates. If none, dry dates. If none, some water.', 'তাজা খেজুর, না থাকলে শুকনো খেজুর, তাও না থাকলে পানি।'), ref: 'Sunan Abi Dawud 2356' },
    { id: 'e-sort', band: 2, type: 'sort', q: t('While fasting: do it, or leave it?', 'রোজা রেখে: করব, নাকি ছাড়ব?'),
      bins: [a('Do it', 'করব', 'yes'), a('Leave it', 'ছাড়ব', 'no')],
      items: [{ t: t('Telling lies', 'মিথ্যা বলা'), bin: 1 }, { t: t('Praying at night', 'রাতে নামাজ পড়া'), bin: 0 }, { t: t('Fighting', 'ঝগড়া করা'), bin: 1 },
        { t: t('Being generous', 'দান করা'), bin: 0 }, { t: t('Insulting people', 'গালি দেওয়া'), bin: 1 }, { t: t('Giving food for iftar', 'ইফতার করানো'), bin: 0 }],
      why: t('A fasting person gives up false speech and fighting, and does more good.', 'রোজাদার মিথ্যা ও ঝগড়া ছাড়ে, আর বেশি ভালো কাজ করে।'), ref: B + "6, 37, 1894, 1903; Jami' at-Tirmidhi 807" },
    { id: 'e-match', band: 2, type: 'match', q: t('Match each one to what we are told about it.', 'প্রতিটির সঙ্গে তার কথা মিলিয়ে দাও।'),
      pairs: [{ l: a('Suhur', 'সাহরি'), r: a('There is blessing in it', 'এতে বরকত আছে') }, { l: a('Breaking the fast', 'ইফতার'), r: a('Do it without delay', 'দেরি না করে করা') },
        { l: a("I'tikaf", 'ইতিকাফ'), r: a('In the last ten days', 'শেষ দশ দিনে') }, { l: a('Night of Decree', 'লাইলাতুল কদর'), r: a('Better than a thousand months', 'হাজার মাসের চেয়ে উত্তম') }],
      why: t('Each of these comes from the Quran or a sahih hadith.', 'এর প্রতিটি কুরআন বা সহিহ হাদিস থেকে নেওয়া।'), ref: B + '1923, 1957, 2026; Quran 97:3' },

    // ================= band 3: ages 10-12 =================
    { id: 'c-before', band: 3, type: 'choice', q: t('The Quran says fasting was decreed for you “as it was decreed upon…”', 'কুরআনে বলা হয়েছে, তোমাদের ওপর রোজা ফরজ করা হয়েছে “যেমন ফরজ করা হয়েছিল…”'),
      a: [a('Those before you', 'তোমাদের পূর্ববর্তীদের ওপর'), a('The angels', 'ফেরেশতাদের ওপর'), a('Only the prophets', 'শুধু নবীদের ওপর'), a('No one before', 'আগে কারও ওপর নয়')], correct: 0,
      why: t('“…as it was decreed upon those before you that you may become righteous.”', '“…যেমন ফরজ করা হয়েছিল তোমাদের পূর্ববর্তীদের ওপর, যাতে তোমরা তাকওয়া অর্জন করো।”'), ref: 'Quran 2:183' },
    { id: 'c-thread', band: 3, type: 'choice', q: t('Until when does the Quran allow eating and drinking on the night of a fast?', 'রোজার রাতে কখন পর্যন্ত খাওয়া-পান করার অনুমতি কুরআনে আছে?'),
      a: [a('Until the white thread of dawn is clear from the black thread', 'ভোরের সাদা রেখা কালো রেখা থেকে স্পষ্ট হওয়া পর্যন্ত'), a('Until the sun is high', 'সূর্য উপরে ওঠা পর্যন্ত'), a('Until midnight only', 'শুধু মধ্যরাত পর্যন্ত'), a('Until midday', 'দুপুর পর্যন্ত')], correct: 0,
      why: t('“…until the white thread of dawn becomes distinct to you from the black thread. Then complete the fast until the night.”', '“…যতক্ষণ না ভোরের সাদা রেখা কালো রেখা থেকে স্পষ্ট হয়। তারপর রাত পর্যন্ত রোজা পূর্ণ করো।”'), ref: Q187 },
    { id: 'c-sa', band: 3, type: 'choice', q: t('How much is Zakat al-Fitr?', 'যাকাতুল ফিতরের পরিমাণ কত?'),
      a: [a("One sa' of dates or barley", 'এক সা খেজুর বা যব'), a('One gold coin', 'একটি স্বর্ণমুদ্রা'), a('Half of one’s food', 'নিজের খাবারের অর্ধেক'), a('One camel', 'একটি উট')], correct: 0,
      why: t("One sa' of dates or one sa' of barley.", 'এক সা খেজুর অথবা এক সা যব।'), ref: B + '1503' },
    { id: 'c-who', band: 3, type: 'choice', q: t('On whom is Zakat al-Fitr due?', 'যাকাতুল ফিতর কার ওপর?'),
      a: [a('Every Muslim, young or old', 'ছোট-বড় প্রত্যেক মুসলিম'), a('Only grown men', 'শুধু প্রাপ্তবয়স্ক পুরুষ'), a('Only those who fasted all thirty days', 'শুধু যারা ত্রিশ দিনই রোজা রেখেছে'), a('Only travellers', 'শুধু মুসাফির')], correct: 0,
      why: t('On every Muslim, slave or free, male or female, young or old.', 'দাস বা স্বাধীন, পুরুষ বা নারী, ছোট বা বড়, প্রত্যেক মুসলিমের ওপর।'), ref: B + '1503' },
    { id: 'c-fifty', band: 3, type: 'choice', q: t('How long was the gap between the Prophet’s ﷺ suhur and the adhan?', 'নবী ﷺ-এর সাহরি ও আজানের মাঝে কতটুকু সময় থাকত?'),
      a: [a('Enough to recite fifty verses', 'পঞ্চাশ আয়াত তিলাওয়াতের সমান'), a('Enough to recite five verses', 'পাঁচ আয়াত তিলাওয়াতের সমান'), a('Half the night', 'অর্ধেক রাত'), a('No gap at all', 'কোনো সময়ই থাকত না')], correct: 0,
      why: t('The interval was enough to recite fifty verses of the Quran.', 'ব্যবধান ছিল পঞ্চাশ আয়াত তিলাওয়াত করার মতো।'), ref: B + '1921' },
    { id: 'c-lies', band: 3, type: 'choice', q: t('A boy fasts all day but keeps telling lies. What does the hadith say?', 'একটি ছেলে সারা দিন রোজা রাখে কিন্তু মিথ্যা বলে চলে। হাদিসে কী বলা হয়েছে?'),
      a: [a('Allah has no need of his leaving food and drink', 'তার খাদ্য-পানীয় ত্যাগে আল্লাহর কোনো প্রয়োজন নেই'), a('Lies do not matter while fasting', 'রোজায় মিথ্যা বললে কিছু হয় না'), a('He gets a double reward', 'সে দ্বিগুণ সওয়াব পায়'), a('He should fast at night too', 'তাকে রাতেও রোজা রাখতে হবে')], correct: 0,
      why: t('Whoever does not give up false speech and evil actions, Allah is not in need of his leaving his food and drink.', 'যে মিথ্যা কথা ও মন্দ কাজ ছাড়ে না, তার খাদ্য-পানীয় ত্যাগে আল্লাহর প্রয়োজন নেই।'), ref: B + '1903' },
    { id: 'c-letters', band: 3, type: 'choice', q: t('Each letter of the Quran recited earns a reward, and ten like it. Alif, Lam, Mim are counted as how many letters?', 'কুরআনের প্রতিটি হরফে একটি নেকি, আর তা দশ গুণ। “আলিফ লাম মিম” কয়টি হরফ ধরা হয়?'),
      a: [a('Three', 'তিনটি'), a('One', 'একটি'), a('Ten', 'দশটি'), a('Thirty', 'ত্রিশটি')], correct: 0,
      why: t('“Alif is a letter, Lam is a letter and Mim is a letter.”', '“আলিফ একটি হরফ, লাম একটি হরফ, মিম একটি হরফ।”'), ref: "Jami' at-Tirmidhi 2910" },
    { id: 'c-perpetual', band: 3, type: 'choice', q: t('Whoever fasts Ramadan and then six days of Shawwal, it is as if he…', 'যে রমজানের রোজা রেখে শাওয়ালের ছয়টি রোজা রাখে, সে যেন…'),
      a: [a('Fasted all the time', 'সবসময়ই রোজা রাখল'), a('Fasted two months', 'দুই মাস রোজা রাখল'), a('Did Hajj', 'হজ করল'), a('Fasted one extra week', 'এক সপ্তাহ বেশি রোজা রাখল')], correct: 0,
      why: t('It would be as if he fasted perpetually.', 'সে যেন সবসময়ই রোজা রাখল।'), ref: 'Sahih Muslim 1164a' },
    { id: 'c-dua-until', band: 3, type: 'choice', q: t('The fasting person’s dua is not turned back until…', 'রোজাদারের দোয়া ফিরিয়ে দেওয়া হয় না, যতক্ষণ না…'),
      a: [a('He breaks his fast', 'সে ইফতার করে'), a('He falls asleep', 'সে ঘুমিয়ে পড়ে'), a('The month ends', 'মাস শেষ হয়'), a('He eats suhur', 'সে সাহরি খায়')], correct: 0,
      why: t('Three duas are not turned back: a just ruler, a fasting person until he breaks his fast, and one who has been wronged.', 'তিনজনের দোয়া ফেরানো হয় না: ন্যায়পরায়ণ শাসক, ইফতার পর্যন্ত রোজাদার, এবং মজলুম।'), ref: 'Sunan Ibn Majah 1752' },
    { id: 'c-laylat-dua', band: 3, type: 'choice', q: t('What does this dua for the Night of Decree mean?', 'লাইলাতুল কদরের এই দোয়াটির অর্থ কী?'), ar: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي',
      a: [a('O Allah, You are Forgiving and love forgiveness, so forgive me', 'হে আল্লাহ, আপনি ক্ষমাশীল, ক্ষমা ভালোবাসেন, আমাকে ক্ষমা করুন'), a('O Allah, send us rain', 'হে আল্লাহ, আমাদের বৃষ্টি দিন'), a('O Allah, make my journey easy', 'হে আল্লাহ, আমার সফর সহজ করুন'), a('O Allah, bless this food', 'হে আল্লাহ, এই খাবারে বরকত দিন')], correct: 0,
      why: t('The Prophet ﷺ taught this dua to Aishah for the Night of Decree.', 'নবী ﷺ আয়েশা (রা.)-কে লাইলাতুল কদরের জন্য এই দোয়া শিখিয়েছেন।'), ref: 'Sunan Ibn Majah 3850' },
    { id: 'c-iftar-dua', band: 3, type: 'choice', q: t('When did the Prophet ﷺ say these words?', 'নবী ﷺ এই কথাগুলো কখন বলতেন?'), ar: 'ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ',
      a: [a('When he broke his fast', 'ইফতার করার সময়'), a('When he ate suhur', 'সাহরি খাওয়ার সময়'), a('When he saw the new moon', 'নতুন চাঁদ দেখার সময়'), a('When he set out on a journey', 'সফরে বের হওয়ার সময়')], correct: 0,
      why: t('“Thirst has gone, the arteries are moist, and the reward is sure, if Allah wills.”', '“পিপাসা মিটেছে, শিরাগুলো সিক্ত হয়েছে, আর সওয়াব নিশ্চিত হয়েছে, ইনশাআল্লাহ।”'), ref: 'Sunan Abi Dawud 2357' },
    { id: 'c-stopped', band: 3, type: 'choice', q: t('People joined the Prophet’s ﷺ night prayer in the mosque. Why did he then stop coming out?', 'লোকেরা মসজিদে নবী ﷺ-এর রাতের নামাজে যোগ দিল। এরপর তিনি কেন বের হলেন না?'),
      a: [a('He feared it would be made obligatory', 'তিনি আশঙ্কা করলেন তা ফরজ হয়ে যাবে'), a('The mosque was closed', 'মসজিদ বন্ধ ছিল'), a('Ramadan had ended', 'রমজান শেষ হয়ে গিয়েছিল'), a('He was travelling', 'তিনি সফরে ছিলেন')], correct: 0,
      why: t('He feared the night prayer would become obligatory on the people.', 'তিনি আশঙ্কা করেছিলেন, রাতের নামাজ লোকদের ওপর ফরজ হয়ে যাবে।'), ref: B + '1129, 2012' },
    { id: 'c-descend', band: 3, type: 'choice', q: t('Who descends in the Night of Decree, by their Lord’s permission?', 'লাইলাতুল কদরে রবের অনুমতিতে কারা নেমে আসেন?'),
      a: [a('The angels and the Spirit', 'ফেরেশতারা ও রূহ'), a('The stars', 'তারাগুলো'), a('The clouds', 'মেঘমালা'), a('The winds', 'বাতাস')], correct: 0,
      why: t('“The angels and the Spirit descend therein by permission of their Lord.”', '“সে রাতে ফেরেশতারা ও রূহ তাদের রবের অনুমতিতে অবতীর্ণ হন।”'), ref: 'Quran 97:4' },
    { id: 'c-peace', band: 3, type: 'choice', q: t('The Night of Decree is peace until…', 'লাইলাতুল কদর শান্তিময়, কখন পর্যন্ত?'),
      a: [a('The emergence of dawn', 'ফজরের উদয় পর্যন্ত'), a('Midnight', 'মধ্যরাত পর্যন্ত'), a('Sunset', 'সূর্যাস্ত পর্যন্ত'), a('Midday', 'দুপুর পর্যন্ত')], correct: 0,
      why: t('“Peace it is until the emergence of dawn.”', '“শান্তিই শান্তি, ফজরের উদয় পর্যন্ত।”'), ref: 'Quran 97:5' },
    { id: 'c-forme', band: 3, type: 'choice', q: t('In the hadith, what does Allah say about fasting?', 'হাদিসে রোজা সম্পর্কে আল্লাহ কী বলেছেন?'),
      a: [a('It is for Me, and I will give the reward for it', 'তা আমার জন্য, আর আমিই তার প্রতিদান দেব'), a('It is only for the strong', 'তা শুধু শক্তিশালীদের জন্য'), a('It has no reward', 'তার কোনো প্রতিদান নেই'), a('It is the same as any other deed', 'তা অন্য যেকোনো আমলের মতোই')], correct: 0,
      why: t('“…except fasting, which is for Me, and I will give the reward for it.”', '“…রোজা ছাড়া; তা আমার জন্য, আর আমিই তার প্রতিদান দেব।”'), ref: B + '1904' },
    { id: 'c-hasten', band: 3, type: 'choice', q: t('People stay on the right path as long as they…', 'মানুষ ততদিন কল্যাণের ওপর থাকবে, যতদিন তারা…'),
      a: [a('Hasten to break the fast', 'তাড়াতাড়ি ইফতার করবে'), a('Delay breaking the fast', 'দেরিতে ইফতার করবে'), a('Skip suhur', 'সাহরি বাদ দেবে'), a('Fast through the night', 'রাতেও রোজা রাখবে')], correct: 0,
      why: t('…as long as they hasten the breaking of the fast.', '…যতদিন তারা তাড়াতাড়ি ইফতার করবে।'), ref: B + '1957' },
    { id: 'c-29', band: 3, type: 'choice', q: t('What is the fewest nights an Islamic month can have?', 'ইসলামি মাস সবচেয়ে কম কত রাতের হতে পারে?'),
      a: [a('29', '২৯'), a('28', '২৮'), a('30', '৩০'), a('27', '২৭')], correct: 0,
      why: t('The month can be 29 nights. If the moon is hidden, complete thirty.', 'মাস ২৯ রাতের হতে পারে। চাঁদ দেখা না গেলে ত্রিশ পূর্ণ করো।'), ref: B + '1907' },
    { id: 'c-makeup', band: 3, type: 'yesno', q: t('A traveller who does not fast in Ramadan never has to make those days up.', 'রমজানে রোজা না রাখা মুসাফিরকে পরে আর সেই দিনগুলো পূরণ করতে হয় না।'), yes: false,
      why: t('Whoever is ill or on a journey makes up an equal number of other days.', 'অসুস্থ বা মুসাফির অন্য দিনে সমান সংখ্যা পূরণ করবে।'), ref: 'Quran 2:184' },
    { id: 'c-forgiven', band: 3, type: 'yesno', q: t('Fasting Ramadan with faith, hoping for Allah’s reward, brings forgiveness of past sins.', 'ঈমানের সঙ্গে সওয়াবের আশায় রমজানের রোজা রাখলে আগের গুনাহ মাফ হয়।'), yes: true,
      why: t('Whoever fasts Ramadan out of faith, hoping for reward, his past sins are forgiven.', 'যে ঈমান ও সওয়াবের আশায় রমজানের রোজা রাখে, তার আগের গুনাহ মাফ করা হয়।'), ref: B + '38' },
    { id: 'c-crescents', band: 3, type: 'order', q: t('Put the month in order.', 'মাসটি পরপর সাজাও।'),
      items: [a('The crescent of Ramadan is seen', 'রমজানের চাঁদ দেখা গেল'), a('Fasting begins', 'রোজা শুরু হলো'), a('The crescent of Shawwal is seen', 'শাওয়ালের চাঁদ দেখা গেল'), a('Fasting ends', 'রোজা শেষ হলো')],
      why: t('Start fasting on seeing the crescent, and stop on seeing the next one.', 'চাঁদ দেখে রোজা শুরু করো, পরের চাঁদ দেখে রোজা ছাড়ো।'), ref: B + '1909' },
    { id: 'c-source', band: 3, type: 'sort', q: t('Is it from the Quran or from a hadith?', 'এটি কুরআন থেকে, নাকি হাদিস থেকে?'),
      bins: [a('Quran', 'কুরআন', 'quran'), a('Hadith', 'হাদিস')],
      items: [{ t: t('The Night of Decree is better than a thousand months', 'লাইলাতুল কদর হাজার মাসের চেয়ে উত্তম'), bin: 0 }, { t: t('Fasting is a shield', 'রোজা একটি ঢাল'), bin: 1 },
        { t: t('Allah intends for you ease', 'আল্লাহ তোমাদের জন্য সহজ চান'), bin: 0 }, { t: t('Take suhur, for there is blessing in it', 'সাহরি খাও, এতে বরকত আছে'), bin: 1 },
        { t: t('A gate in Paradise called Ar-Rayyan', 'জান্নাতের একটি দরজার নাম আর-রাইয়ান'), bin: 1 }, { t: t('Eat and drink until the white thread of dawn', 'ভোরের সাদা রেখা পর্যন্ত খাও ও পান করো'), bin: 0 }],
      why: t('The verses are in Surah al-Baqarah and Surah al-Qadr. The others are sayings of the Prophet ﷺ.', 'আয়াতগুলো সূরা বাকারা ও সূরা কদরে আছে। বাকিগুলো নবী ﷺ-এর বাণী।'), ref: 'Quran 2:185, 2:187, 97:3; ' + B + '1894, 1896, 1923' },
    { id: 'c-rewards', band: 3, type: 'match', q: t('Match each deed to its reward.', 'প্রতিটি আমলের সঙ্গে তার প্রতিদান মিলিয়ে দাও।'),
      pairs: [{ l: a('Giving a fasting person iftar', 'রোজাদারকে ইফতার করানো'), r: a('The same reward as his', 'তার সমান সওয়াব') }, { l: a('Umrah in Ramadan', 'রমজানে উমরাহ'), r: a('Equal to Hajj in reward', 'সওয়াবে হজের সমান') },
        { l: a('Ramadan, then six of Shawwal', 'রমজান, তারপর শাওয়ালের ছয়'), r: a('As if fasting all the time', 'যেন সবসময় রোজা') }, { l: a('Fasting Ramadan with faith', 'ঈমানের সঙ্গে রমজানের রোজা'), r: a('Past sins forgiven', 'আগের গুনাহ মাফ') }],
      why: t('Each reward is stated in a sahih hadith.', 'প্রতিটি প্রতিদান সহিহ হাদিসে বর্ণিত।'), ref: "Jami' at-Tirmidhi 807; " + B + '1782, 38; Sahih Muslim 1164a' }
  ];

  // ---------- more questions, written with the short builder ----------
  var X = KahfQuiz.bank('rx'), TI = "Jami' at-Tirmidhi ";
  function P(en, bn, p) { return [en, bn, p]; }

  // band 1
  X.c(1, ['When Ramadan begins, which gates are opened?', 'রমজান শুরু হলে কোন দরজাগুলো খুলে দেওয়া হয়?'], [['The gates of Paradise', 'জান্নাতের দরজা'], ['The gates of the market', 'বাজারের দরজা']],
    ['"When Ramadan begins, the gates of Paradise are opened."', '"রমজান শুরু হলে জান্নাতের দরজাগুলো খুলে দেওয়া হয়।"'], B + '1898');
  X.c(1, ['Who came to the Prophet ﷺ every night of Ramadan?', 'রমজানের প্রতি রাতে নবী ﷺ-এর কাছে কে আসতেন?'], [['The angel Jibril', 'ফেরেশতা জিবরাইল (আ.)'], ['A merchant', 'একজন ব্যবসায়ী'], ['A king', 'একজন রাজা']],
    ['Jibril used to meet him on every night of Ramadan.', 'জিবরাইল (আ.) রমজানের প্রতি রাতে তাঁর সঙ্গে দেখা করতেন।'], B + '1902');
  X.c(1, ['What did the Prophet ﷺ recite to Jibril in Ramadan?', 'রমজানে নবী ﷺ জিবরাইল (আ.)-কে কী পড়ে শোনাতেন?'], [P('The Quran', 'কুরআন', 'quran'), P('A letter', 'চিঠি', 'paper'), P('A story book', 'গল্পের বই', 'book')],
    ['The Prophet ﷺ used to recite the Quran to Jibril.', 'নবী ﷺ জিবরাইল (আ.)-কে কুরআন পড়ে শোনাতেন।'], B + '1902');
  X.c(1, ['When does the fasting person break the fast?', 'রোজাদার কখন রোজা ভাঙে?'], [P('When the sun sets', 'সূর্য ডুবলে', 'sunset'), P('At midday', 'দুপুরে', 'sun'), P('At dawn', 'ভোরে', 'dawn')],
    ['"When the sun sets, then the fasting person should break his fast."', '"সূর্য ডুবে গেলে রোজাদার ইফতার করবে।"'], B + '1954');
  X.c(1, ['The companions gave their fasting children something to play with. What was it made of?', 'সাহাবিরা রোজাদার শিশুদের খেলার জন্য একটি জিনিস দিতেন। তা কী দিয়ে তৈরি?'], [['Wool', 'পশম'], ['Gold', 'সোনা'], ['Ice', 'বরফ']],
    ['"We used to make toys of wool for the boys."', '"আমরা ছেলেদের জন্য পশমের খেলনা বানাতাম।"'], B + '1960');
  X.yn(1, ['Is Allah near when we make dua?', 'আমরা দোয়া করলে আল্লাহ কি কাছে থাকেন?'], true,
    ['"Indeed I am near. I respond to the invocation of the supplicant when he calls upon Me."', '"আমি তো কাছেই। কেউ আমাকে ডাকলে আমি তার ডাকে সাড়া দিই।"'], 'Quran 2:186');
  X.yn(1, ['Was the Prophet ﷺ extra generous in Ramadan?', 'নবী ﷺ কি রমজানে আরও বেশি দানশীল হতেন?'], true,
    ['He was the most generous of people, and even more so in Ramadan.', 'তিনি ছিলেন সবচেয়ে দানশীল, আর রমজানে আরও বেশি।'], B + '1902');
  X.yn(1, ['Did the Prophet ﷺ wake his family to pray in the last ten nights?', 'শেষ দশ রাতে নবী ﷺ কি তাঁর পরিবারকে নামাজের জন্য জাগাতেন?'], true,
    ['He used to pray all the night and keep his family awake for the prayers.', 'তিনি সারা রাত নামাজ পড়তেন এবং পরিবারকেও জাগিয়ে রাখতেন।'], B + '2024');
  X.c(1, ['In Ramadan a caller calls, "O seeker of good, ..."', 'রমজানে একজন আহ্বানকারী ডাকেন, "হে কল্যাণের সন্ধানী, ..."'], [['come near!', 'এগিয়ে এসো!'], ['go to sleep!', 'ঘুমিয়ে পড়ো!']],
    ['"O seeker of the good, come near! O seeker of evil, stop!"', '"হে কল্যাণের সন্ধানী, এগিয়ে এসো! হে অকল্যাণের সন্ধানী, থেমে যাও!"'], TI + '682');
  X.match(1, ['Match the picture to the Ramadan word.', 'ছবির সঙ্গে রমজানের শব্দ মেলাও।'],
    [[{ p: 'dates' }, ['Iftar', 'ইফতার']], [{ p: 'crescent' }, ['A new month', 'নতুন মাস']], [{ p: 'quran' }, ['Revealed in Ramadan', 'রমজানে নাজিল']]],
    ['Dates at iftar, the new moon, and the Quran.', 'ইফতারে খেজুর, নতুন চাঁদ আর কুরআন।'], 'Sunan Abi Dawud 2356; ' + B + '1909; ' + Q185);

  // band 2
  X.c(2, ['Whoever prays in the nights of Ramadan with faith, hoping for reward, what does he get?', 'যে ঈমান ও সওয়াবের আশায় রমজানের রাতে নামাজ পড়ে, সে কী পায়?'], [['His past sins are forgiven', 'তার আগের গুনাহ মাফ হয়'], ['A larger house', 'একটি বড় বাড়ি'], ['A longer holiday', 'লম্বা ছুটি']],
    ['"...all his past sins will be forgiven."', '"...তার আগের সব গুনাহ মাফ করে দেওয়া হবে।"'], B + '37');
  X.c(2, ['Whoever stands in prayer on the Night of Decree with faith and hope, what happens?', 'যে ঈমান ও সওয়াবের আশায় কদরের রাতে নামাজে দাঁড়ায়, তার কী হয়?'], [['His previous sins are forgiven', 'তার আগের গুনাহ মাফ হয়'], ['He never gets tired', 'সে কখনো ক্লান্ত হয় না'], ['He becomes rich', 'সে ধনী হয়']],
    ['"Whoever established prayers on the night of Qadr out of sincere faith... all his previous sins will be forgiven."', '"যে ঈমানের সঙ্গে কদরের রাতে নামাজ পড়ে... তার আগের সব গুনাহ মাফ করা হবে।"'], B + '1901');
  X.c(2, ['The Prophet ﷺ in Ramadan was more generous than ...', 'রমজানে নবী ﷺ ছিলেন যার চেয়েও বেশি দানশীল ...'], [['a fast wind that brings rain', 'বৃষ্টি বয়ে আনা প্রবাহিত বাতাস'], ['a river in summer', 'গ্রীষ্মের নদী'], ['a full market', 'ভরা বাজার']],
    ['"He used to be more generous than a fast wind."', '"তিনি প্রবাহিত বাতাসের চেয়েও বেশি দানশীল হতেন।"'], B + '1902');
  X.c(2, ['In the last ten days of Ramadan, the Prophet ﷺ used to ...', 'রমজানের শেষ দশ দিনে নবী ﷺ ...'], [['pray all night and wake his family', 'সারা রাত নামাজ পড়তেন ও পরিবারকে জাগাতেন'], ['travel to another city', 'অন্য শহরে সফর করতেন'], ['sleep earlier', 'আগে আগে ঘুমাতেন']],
    ['He tightened his waist belt, prayed all the night, and kept his family awake for the prayers.', 'তিনি কোমর বেঁধে নামতেন, সারা রাত নামাজ পড়তেন এবং পরিবারকে জাগিয়ে রাখতেন।'], B + '2024');
  X.c(2, ['Who gathered the people to pray the Ramadan night prayer behind one reciter?', 'কে মানুষকে একজন কারির পেছনে রমজানের রাতের নামাজে একত্র করেছিলেন?'], [['Umar ibn al-Khattab', 'উমর ইবনুল খাত্তাব (রা.)'], ['Bilal', 'বিলাল (রা.)'], ['Anas', 'আনাস (রা.)']],
    ['He found people praying in separate groups and gathered them behind one reciter.', 'তিনি মানুষকে আলাদা আলাদা দলে নামাজ পড়তে দেখে একজন কারির পেছনে একত্র করেন।'], B + '2010');
  X.c(2, ['Behind which reciter did Umar gather the people?', 'উমর (রা.) মানুষকে কোন কারির পেছনে একত্র করেছিলেন?'], [['Ubayy ibn Kab', 'উবাই ইবনে কাব (রা.)'], ['Khalid ibn al-Walid', 'খালিদ ইবনুল ওয়ালিদ (রা.)'], ['Abu Hurairah', 'আবু হুরাইরা (রা.)']],
    ['"He made up his mind to congregate them behind Ubayy bin Kab."', '"তিনি তাদের উবাই ইবনে কাবের পেছনে একত্র করার সিদ্ধান্ত নিলেন।"'], B + '2010');
  X.c(2, ['On which night of Ramadan are the devils shackled and the caller begins to call?', 'রমজানের কোন রাতে শয়তানদের শিকলে বাঁধা হয় এবং আহ্বানকারী ডাকতে শুরু করেন?'], [['The first night', 'প্রথম রাত'], ['The last night', 'শেষ রাত'], ['The tenth night', 'দশম রাত']],
    ['"On the first night of the month of Ramadan, the devils are shackled."', '"রমজান মাসের প্রথম রাতে শয়তানদের শিকলে বাঁধা হয়।"'], TI + '682');
  X.c(2, ['How often in Ramadan does Allah free people from the Fire?', 'রমজানে আল্লাহ কত ঘন ঘন মানুষকে জাহান্নাম থেকে মুক্তি দেন?'], [['Every night', 'প্রতি রাতে'], ['Once in the month', 'মাসে একবার'], ['Only on Eid', 'শুধু ঈদে']],
    ['"There are those whom Allah frees from the Fire. And that is every night."', '"আল্লাহ কিছু মানুষকে জাহান্নাম থেকে মুক্তি দেন, আর তা প্রতি রাতেই।"'], TI + '682');
  X.c(2, ['What did the companions do when a fasting child cried for food?', 'রোজাদার শিশু খাবারের জন্য কাঁদলে সাহাবিরা কী করতেন?'], [['Gave him a toy of wool', 'তাকে পশমের খেলনা দিতেন'], ['Scolded him', 'তাকে বকা দিতেন'], ['Sent him away', 'তাকে দূরে পাঠিয়ে দিতেন']],
    ['"If anyone of them cried for food, he was given those toys."', '"তাদের কেউ খাবারের জন্য কাঁদলে তাকে সেই খেলনা দেওয়া হতো।"'], B + '1960');
  X.c(2, ['What did Sahl do right after his suhur meal?', 'সাহল (রা.) সাহরি খাওয়ার পরপরই কী করতেন?'], [['Hurried to the Fajr prayer with the Prophet ﷺ', 'নবী ﷺ-এর সঙ্গে ফজরের নামাজে ছুটে যেতেন'], ['Went back to bed', 'আবার ঘুমাতে যেতেন'], ['Went to the market', 'বাজারে যেতেন']],
    ['"I used to take my suhur with my family and then hurry for the prayer with Allah\'s Messenger ﷺ."', '"আমি পরিবারের সঙ্গে সাহরি খেতাম, তারপর রাসুলুল্লাহ ﷺ-এর সঙ্গে নামাজ পড়তে তাড়াতাড়ি যেতাম।"'], B + '1920');
  X.c(2, ['In what kind of night was the Quran sent down?', 'কুরআন কেমন রাতে নাজিল হয়েছে?'], [['A blessed night', 'এক বরকতময় রাতে'], ['A stormy night', 'এক ঝড়ের রাতে'], ['A night with no moon', 'চাঁদহীন এক রাতে']],
    ['"Indeed, We sent it down during a blessed night."', '"নিশ্চয়ই আমি একে এক বরকতময় রাতে নাজিল করেছি।"'], 'Quran 44:3');
  X.yn(2, ['After the fast is complete, are we told to glorify Allah and be grateful?', 'রোজা পূর্ণ হলে আমাদের কি আল্লাহর বড়ত্ব ঘোষণা ও শোকর করতে বলা হয়েছে?'], true,
    ['"...to complete the period and to glorify Allah for that which He has guided you; and perhaps you will be grateful."', '"...যাতে তোমরা সংখ্যা পূর্ণ করো, আল্লাহর বড়ত্ব ঘোষণা করো এবং শোকর করো।"'], Q185);
  X.sort(2, ['From the first night of Ramadan: opened, or shut?', 'রমজানের প্রথম রাত থেকে: খোলা, নাকি বন্ধ?'], [['Opened', 'খোলা'], ['Shut or chained', 'বন্ধ বা শিকলবদ্ধ']],
    [['The gates of Paradise', 'জান্নাতের দরজা', 0], ['The gates of the Fire', 'জাহান্নামের দরজা', 1], ['The devils', 'শয়তানরা', 1]],
    ['Paradise is opened, the Fire is shut, and the devils are shackled.', 'জান্নাত খুলে দেওয়া হয়, জাহান্নাম বন্ধ করা হয়, শয়তানদের বাঁধা হয়।'], TI + '682');
  X.match(2, ['Match the person to what he did in Ramadan.', 'ব্যক্তির সঙ্গে রমজানে তাঁর কাজ মেলাও।'],
    [[['Jibril', 'জিবরাইল (আ.)'], ['Met the Prophet ﷺ every night', 'প্রতি রাতে নবী ﷺ-এর সঙ্গে দেখা করতেন']], [['Umar', 'উমর (রা.)'], ['Gathered people behind one reciter', 'মানুষকে এক কারির পেছনে একত্র করেন']], [['Ubayy ibn Kab', 'উবাই ইবনে কাব (রা.)'], ['Led the night prayer', 'রাতের নামাজ পড়ান']]],
    ['Ramadan nights were full of Quran and prayer.', 'রমজানের রাতগুলো কুরআন ও নামাজে ভরা ছিল।'], B + '1902; ' + B + '2010');

  // band 3
  X.c(3, ['With what two things must one fast or pray in Ramadan to be forgiven?', 'মাফ পেতে হলে রমজানের রোজা বা নামাজ কোন দুটি বিষয়ের সঙ্গে হতে হবে?'], [['Sincere faith and hope for Allah\'s reward', 'খাঁটি ঈমান ও আল্লাহর সওয়াবের আশা'], ['Strength and speed', 'শক্তি ও গতি'], ['Wealth and fame', 'সম্পদ ও খ্যাতি']],
    ['"...out of sincere faith and hoping for a reward from Allah."', '"...ঈমানের সঙ্গে এবং আল্লাহর কাছে সওয়াবের আশায়।"'], B + '1901');
  X.c(3, ['"He used to tighten his waist belt" in the last ten days. What does that mean?', 'শেষ দশ দিনে "তিনি কোমর বেঁধে নিতেন" এর অর্থ কী?'], [['He worked harder in worship', 'তিনি ইবাদতে আরও পরিশ্রম করতেন'], ['He ate less food', 'তিনি কম খেতেন'], ['He prepared to travel', 'তিনি সফরের প্রস্তুতি নিতেন']],
    ['He prayed all the night and kept his family awake for the prayers.', 'তিনি সারা রাত নামাজ পড়তেন এবং পরিবারকে জাগিয়ে রাখতেন।'], B + '2024');
  X.c(3, ['What had Umar seen in the mosque before he gathered the people behind one reciter?', 'মানুষকে একজন কারির পেছনে একত্র করার আগে উমর (রা.) মসজিদে কী দেখেছিলেন?'], [['People praying in separate groups', 'মানুষ আলাদা আলাদা দলে নামাজ পড়ছে'], ['Nobody praying at all', 'কেউই নামাজ পড়ছে না'], ['People sleeping', 'মানুষ ঘুমাচ্ছে']],
    ['"A man praying alone, or a man praying with a little group behind him."', '"কেউ একা নামাজ পড়ছে, কারও পেছনে ছোট একটি দল।"'], B + '2010');
  X.c(3, ['Which three signs tell the fasting person to break the fast?', 'কোন তিনটি চিহ্ন রোজাদারকে ইফতারের সময় জানায়?'], [['Night comes, day goes, and the sun sets', 'রাত আসে, দিন চলে যায় ও সূর্য ডোবে'], ['The stars, the moon and the wind', 'তারা, চাঁদ ও বাতাস'], ['Rain, cloud and thunder', 'বৃষ্টি, মেঘ ও বজ্র']],
    ['"When night falls from this side and the day vanishes from this side and the sun sets."', '"যখন এদিক থেকে রাত আসে, ওদিক থেকে দিন চলে যায় এবং সূর্য ডুবে যায়।"'], B + '1954');
  X.c(3, ['What do the two calls say on every night of Ramadan?', 'রমজানের প্রতি রাতে দুটি আহ্বানে কী বলা হয়?'], [['Seeker of good, come near; seeker of evil, stop', 'কল্যাণের সন্ধানী, এগিয়ে এসো; অকল্যাণের সন্ধানী, থামো'], ['Wake up; go to sleep', 'জেগে ওঠো; ঘুমিয়ে পড়ো'], ['Eat now; drink now', 'এখন খাও; এখন পান করো']],
    ['"O seeker of the good, come near! O seeker of evil, stop!"', '"হে কল্যাণের সন্ধানী, এগিয়ে এসো! হে অকল্যাণের সন্ধানী, থেমে যাও!"'], TI + '682');
  X.c(3, ['Right in the middle of the verses on fasting, what does Allah say about Himself?', 'রোজার আয়াতগুলোর মাঝখানে আল্লাহ নিজের সম্পর্কে কী বলেছেন?'], [['"Indeed I am near"', '"আমি তো কাছেই"'], ['"I am far above"', '"আমি অনেক দূরে"'], ['"Ask the angels"', '"ফেরেশতাদের জিজ্ঞেস করো"']],
    ['"I respond to the invocation of the supplicant when he calls upon Me."', '"কেউ আমাকে ডাকলে আমি তার ডাকে সাড়া দিই।"'], 'Quran 2:186');
  X.c(3, ['What is the ransom for one who can fast only with great hardship?', 'যে অত্যন্ত কষ্ট ছাড়া রোজা রাখতে পারে না, তার ফিদইয়া কী?'], [['Feeding a poor person', 'একজন মিসকিনকে খাওয়ানো'], ['Giving a camel', 'একটি উট দেওয়া'], ['Fasting twice as long', 'দ্বিগুণ সময় রোজা রাখা']],
    ['"...a ransom of feeding a poor person."', '"...ফিদইয়া হলো একজন মিসকিনকে খাওয়ানো।"'], 'Quran 2:184');
  X.c(3, ['What should people do in return, since Allah answers the one who calls on Him?', 'আল্লাহ তো ডাকে সাড়া দেন; বিনিময়ে মানুষের কী করা উচিত?'], [['Respond to Him and believe in Him', 'তাঁর ডাকে সাড়া দেওয়া ও তাঁর ওপর ঈমান আনা'], ['Ask someone else', 'অন্য কারও কাছে চাওয়া'], ['Stop asking', 'চাওয়া বন্ধ করা']],
    ['"So let them respond to Me and believe in Me that they may be guided."', '"অতএব তারা যেন আমার ডাকে সাড়া দেয় ও আমার ওপর ঈমান আনে, যাতে তারা সঠিক পথ পায়।"'], 'Quran 2:186');
  X.c(3, ['On the day of Ashura, what were those who had already eaten told to do?', 'আশুরার দিন যারা আগেই খেয়ে ফেলেছিল, তাদের কী করতে বলা হয়েছিল?'], [['Not to eat more, and complete the fast', 'আর না খেয়ে রোজা পূর্ণ করা'], ['To eat again', 'আবার খাওয়া'], ['To leave the village', 'গ্রাম ছেড়ে যাওয়া']],
    ['"Whoever has eaten something should not eat but complete the fast."', '"যে কিছু খেয়েছে, সে যেন আর না খায় এবং রোজা পূর্ণ করে।"'], B + '1960');
  X.yn(3, ['Did the Prophet\'s ﷺ generosity grow when Jibril met him?', 'জিবরাইল (আ.)-এর সঙ্গে দেখা হলে নবী ﷺ-এর দানশীলতা কি বেড়ে যেত?'], true,
    ['"When Jibril met him, he used to be more generous than a fast wind."', '"জিবরাইল (আ.) দেখা করলে তিনি প্রবাহিত বাতাসের চেয়েও বেশি দানশীল হতেন।"'], B + '1902');
  X.order(3, ['Put the hadith of the first night of Ramadan in order.', 'রমজানের প্রথম রাতের হাদিসটি ক্রমে সাজাও।'],
    [['The devils are shackled', 'শয়তানদের শিকলে বাঁধা হয়'], ['The gates of the Fire are shut', 'জাহান্নামের দরজা বন্ধ করা হয়'], ['The gates of Paradise are opened', 'জান্নাতের দরজা খোলা হয়'], ['A caller calls', 'একজন আহ্বানকারী ডাকেন']],
    ['The devils, the Fire, Paradise, and then the caller.', 'শয়তান, জাহান্নাম, জান্নাত, তারপর আহ্বানকারী।'], TI + '682');
  X.match(3, ['Match the deed to the hadith\'s promise.', 'আমলের সঙ্গে হাদিসের ওয়াদা মেলাও।'],
    [[['Praying the nights of Ramadan with faith', 'ঈমানের সঙ্গে রমজানের রাতে নামাজ'], ['Past sins forgiven', 'আগের গুনাহ মাফ']], [['Seeking good in Ramadan', 'রমজানে কল্যাণ খোঁজা'], ['"Come near!"', '"এগিয়ে এসো!"']], [['Calling upon Allah', 'আল্লাহকে ডাকা'], ['"I respond"', '"আমি সাড়া দিই"']]],
    ['Ramadan is the month of forgiveness, goodness and dua.', 'রমজান ক্ষমা, কল্যাণ ও দোয়ার মাস।'], B + '37; ' + TI + '682; Quran 2:186');

  KahfQuiz.define('ramadan-nights', { bank: window.RamadanBank.concat(X.list) });
})();
