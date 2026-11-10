/* Sunnah Every Day: data.js — the question bank.
   A day lived the way the Prophet ﷺ taught: waking, washing, dressing, eating, drinking, greeting,
   going out and sleeping. Every hadith was read in the source before its question was written.
   band: 1 = ages 4-6 (pictures), 2 = ages 7-9, 3 = ages 10-12. */
(function () {
  'use strict';
  var KQ = window.KahfQuiz, B = KQ.bank('se');
  function P(en, bn, p) { return [en, bn, p]; }
  var BK = 'Sahih al-Bukhari ', MS = 'Sahih Muslim ', TI = 'Jami` at-Tirmidhi ', AD = 'Sunan Abi Dawud ', NS = "Sunan an-Nasa'i ";

  // ---------- band 1 ----------
  B.c(1, ['Which shoe do we put on first?', 'আমরা আগে কোন পায়ের জুতা পরি?'], [['The right shoe', 'ডান পায়ের'], ['The left shoe', 'বাম পায়ের']],
    ['"Put on the right shoe first."', '"আগে ডান পায়ের জুতা পরো।"'], BK + '5855');
  B.c(1, ['Which shoe do we take off first?', 'আমরা আগে কোন পায়ের জুতা খুলি?'], [['The left shoe', 'বাম পায়ের'], ['The right shoe', 'ডান পায়ের']],
    ['"If you want to take them off, take the left one first."', '"খোলার সময় আগে বাম পায়েরটি খোলো।"'], BK + '5855');
  B.c(1, ['Which hand do we eat and drink with?', 'আমরা কোন হাতে খাই ও পান করি?'], [['The right hand', 'ডান হাতে'], ['The left hand', 'বাম হাতে']],
    ['"He should eat with his right hand, and drink with his right hand."', '"সে যেন ডান হাতে খায় এবং ডান হাতে পান করে।"'], MS + '2020');
  B.c(1, ['What do we say when we sneeze?', 'হাঁচি দিলে আমরা কী বলি?'], [['Alhamdulillah', 'আলহামদুলিল্লাহ'], ['Bismillah', 'বিসমিল্লাহ'], ['Nothing', 'কিছুই না']],
    ['"If anyone of you sneezes, he should say Alhamdulillah."', '"তোমাদের কেউ হাঁচি দিলে সে যেন আলহামদুলিল্লাহ বলে।"'], BK + '6224');
  B.c(1, ['What cleans the mouth and pleases our Lord?', 'কোনটি মুখ পরিষ্কার করে আর আমাদের রবকে সন্তুষ্ট করে?'], [P('The siwak', 'মিসওয়াক', 'miswak'), P('Candy', 'ক্যান্ডি', 'candy'), P('Soda', 'সোডা', 'soda')],
    ['"Siwak is a means of purification for the mouth and is pleasing to the Lord."', '"মিসওয়াক মুখ পবিত্র করে এবং রবকে সন্তুষ্ট করে।"'], NS + '5');
  B.c(1, ['Which side did the Prophet ﷺ sleep on?', 'নবী ﷺ কোন কাতে ঘুমাতেন?'], [['His right side', 'ডান কাতে'], ['His left side', 'বাম কাতে'], ['On his tummy', 'উপুড় হয়ে']],
    ['"He used to sleep on his right side."', '"তিনি ডান কাতে ঘুমাতেন।"'], BK + '6315');
  B.c(1, ['What do we say when we go into our home?', 'ঘরে ঢোকার সময় আমরা কী বলি?'], [['The name of Allah', 'আল্লাহর নাম'], ['A loud shout', 'জোরে চিৎকার'], ['Nothing', 'কিছুই না']],
    ['When a person mentions the name of Allah on entering his house, Satan finds no place to stay.', 'ঘরে ঢোকার সময় আল্লাহর নাম নিলে শয়তান সেখানে থাকার জায়গা পায় না।'], MS + '2018');
  B.yn(1, ['Should we wash our hands when we wake up?', 'ঘুম থেকে উঠে কি আমাদের হাত ধোয়া উচিত?'], true,
    ['"Whoever wakes up from his sleep should wash his hands."', '"যে ঘুম থেকে ওঠে, সে যেন হাত ধুয়ে নেয়।"'], BK + '162');
  B.yn(1, ['Should we blow into our cup?', 'আমাদের কি গ্লাসে ফুঁ দেওয়া উচিত?'], false,
    ['The Messenger of Allah ﷺ forbade blowing or breathing into a vessel.', 'রাসুলুল্লাহ ﷺ পাত্রে ফুঁ দিতে বা শ্বাস ফেলতে নিষেধ করেছেন।'], AD + '3728');
  B.yn(1, ['Did the Prophet ﷺ ever say bad things about food?', 'নবী ﷺ কি কখনো খাবারের দোষ ধরতেন?'], false,
    ['He never criticized any food. He ate it if he liked it, and left it if he did not.', 'তিনি কখনো খাবারের দোষ ধরতেন না। পছন্দ হলে খেতেন, না হলে রেখে দিতেন।'], BK + '5409');
  B.yn(1, ['Should we walk with only one shoe on?', 'আমাদের কি এক পায়ে জুতা পরে হাঁটা উচিত?'], false,
    ['"None of you should walk wearing one shoe only."', '"তোমাদের কেউ যেন এক পায়ে জুতা পরে না হাঁটে।"'], BK + '5856');
  B.c(1, ['What do we say after we eat?', 'খাওয়ার পরে আমরা কী বলি?'], [['Alhamdulillah', 'আলহামদুলিল্লাহ'], ['Goodbye', 'বিদায়'], ['Nothing', 'কিছুই না']],
    ['Allah is pleased with His servant who says Alhamdulillah for his food and drink.', 'যে বান্দা খাবার ও পানীয়ের জন্য আলহামদুলিল্লাহ বলে, আল্লাহ তার ওপর সন্তুষ্ট হন।'], MS + '2734');
  B.c(1, ['Who says salam first?', 'কে আগে সালাম দেবে?'], [['The young one, to the older one', 'ছোটজন, বড়জনকে'], ['Nobody', 'কেউ না']],
    ['"The young should greet the old."', '"ছোটরা বড়দের সালাম দেবে।"'], BK + '6231');
  B.c(1, ['When we yawn, what should we try to do?', 'হাই উঠলে আমাদের কী করার চেষ্টা করা উচিত?'], [['Stop it as best we can', 'যতটা পারি তা আটকানো'], ['Yawn very loudly', 'খুব জোরে হাই তোলা'], ['Laugh', 'হাসা']],
    ['"If one of you yawns, he should try his best to stop it."', '"তোমাদের কেউ হাই তুললে সে যেন যথাসাধ্য তা আটকায়।"'], BK + '6226');
  B.c(1, ['On which day should we take a bath before going to the prayer?', 'কোন দিন নামাজে যাওয়ার আগে গোসল করা উচিত?'], [['Friday', 'শুক্রবার'], ['Never', 'কখনো না']],
    ['"Anyone of you attending the Friday prayer should take a bath."', '"তোমাদের কেউ জুমায় এলে সে যেন গোসল করে।"'], BK + '877');
  B.sort(1, ['Do we use the right hand or the left hand?', 'ডান হাত, নাকি বাম হাত?'], [['Right hand', 'ডান হাত'], ['Not the right hand', 'ডান হাত নয়']],
    [['Eating', 'খাওয়া', 0], ['Drinking', 'পান করা', 0], ['Cleaning ourselves in the toilet', 'টয়লেটে পরিষ্কার হওয়া', 1]],
    ['We eat and drink with the right hand, and do not use it to clean ourselves in the toilet.', 'আমরা ডান হাতে খাই ও পান করি; টয়লেটে পরিষ্কার হতে ডান হাত ব্যবহার করি না।'], MS + '2020; ' + BK + '5630');
  B.match(1, ['Match the time to what we say.', 'সময়ের সঙ্গে কী বলি তা মেলাও।'],
    [[['Before eating', 'খাওয়ার আগে'], ['Bismillah', 'বিসমিল্লাহ']], [['After eating', 'খাওয়ার পরে'], ['Alhamdulillah', 'আলহামদুলিল্লাহ']], [['Meeting someone', 'কারও সঙ্গে দেখা হলে'], ['As-salamu alaykum', 'আসসালামু আলাইকুম']]],
    ['Small words that bring big rewards.', 'ছোট কথা, বড় সওয়াব।'], BK + '5376; ' + MS + '2734; ' + MS + '54');

  // ---------- band 2 ----------
  B.c(2, ['What did the Prophet ﷺ say when he woke up?', 'নবী ﷺ ঘুম থেকে উঠে কী বলতেন?'], [['All praise is for Allah, who gave us life after He made us die', 'সব প্রশংসা আল্লাহর, যিনি মৃত্যুর পর আমাদের জীবন দিলেন'], ['With Your name I die and I live', 'তোমার নামে আমি মরি ও বাঁচি'], ['O Allah, open the doors of Your mercy', 'হে আল্লাহ, তোমার রহমতের দরজা খুলে দাও']],
    ['"Alhamdu lillahil-ladhi ahyana ba\'da ma amatana wa ilaihin-nushur."', '"আলহামদু লিল্লাহিল্লাযি আহইয়ানা বা\'দা মা আমাতানা ওয়া ইলাইহিন নুশুর।"'], BK + '6312');
  B.c(2, ['What did the Prophet ﷺ say when he went to bed?', 'নবী ﷺ ঘুমাতে যাওয়ার সময় কী বলতেন?'], [['Bismika Allahumma amutu wa ahya', 'বিসমিকা আল্লাহুম্মা আমুতু ওয়া আহইয়া'], ['Alhamdulillah', 'আলহামদুলিল্লাহ'], ['Yarhamukallah', 'ইয়ারহামুকাল্লাহ']],
    ['"With Your name, O Allah, I die and I live."', '"হে আল্লাহ, তোমার নামেই আমি মরি ও বাঁচি।"'], BK + '6324');
  B.c(2, ['Someone sneezes and says Alhamdulillah. What do we say to him?', 'কেউ হাঁচি দিয়ে আলহামদুলিল্লাহ বলল। আমরা তাকে কী বলব?'], [['Yarhamukallah', 'ইয়ারহামুকাল্লাহ'], ['Bismillah', 'বিসমিল্লাহ'], ['Astaghfirullah', 'আসতাগফিরুল্লাহ']],
    ['It means "May Allah have mercy on you."', 'এর অর্থ "আল্লাহ তোমার ওপর রহম করুন।"'], BK + '6224');
  B.c(2, ['How many breaths did the Prophet ﷺ take while drinking?', 'নবী ﷺ পান করার সময় কয়বার শ্বাস নিতেন?'], [['Three', 'তিনবার'], ['One', 'একবার'], ['Ten', 'দশবার']],
    ['Anas said the Prophet ﷺ used to take three breaths while drinking.', 'আনাস (রা.) বলেন, নবী ﷺ পান করার সময় তিনবার শ্বাস নিতেন।'], BK + '5631');
  B.c(2, ['Where do we breathe when we drink?', 'পান করার সময় আমরা কোথায় শ্বাস ফেলি?'], [['Outside the cup', 'পাত্রের বাইরে'], ['Into the cup', 'পাত্রের ভেতরে']],
    ['"When you drink, do not breathe in the vessel."', '"যখন পান করবে, পাত্রের ভেতরে শ্বাস ফেলো না।"'], BK + '5630');
  B.c(2, ['How did the Prophet ﷺ dislike water to be drunk?', 'নবী ﷺ কীভাবে পানি পান করা অপছন্দ করতেন?'], [['Standing', 'দাঁড়িয়ে'], ['Sitting', 'বসে'], ['With the right hand', 'ডান হাতে']],
    ['He disapproved the drinking of water while standing.', 'তিনি দাঁড়িয়ে পানি পান করা অপছন্দ করতেন।'], MS + '2024');
  B.c(2, ['What did the Prophet ﷺ do whenever he got up at night?', 'নবী ﷺ রাতে উঠলেই কী করতেন?'], [['Cleaned his mouth with the siwak', 'মিসওয়াক দিয়ে মুখ পরিষ্কার করতেন'], ['Ate a meal', 'খাবার খেতেন'], ['Went for a walk', 'হাঁটতে যেতেন']],
    ['"Whenever the Prophet ﷺ got up at night, he used to clean his mouth with siwak."', '"নবী ﷺ রাতে উঠলে মিসওয়াক দিয়ে মুখ পরিষ্কার করতেন।"'], BK + '245');
  B.c(2, ['The Prophet ﷺ liked to begin from which side when putting on shoes and combing his hair?', 'জুতা পরা ও চুল আঁচড়ানোর সময় নবী ﷺ কোন দিক থেকে শুরু করতে পছন্দ করতেন?'], [['The right side', 'ডান দিক'], ['The left side', 'বাম দিক']],
    ['He liked to start from the right in wearing shoes, combing his hair, washing, and in everything else.', 'জুতা পরা, চুল আঁচড়ানো, পবিত্রতা অর্জনসহ সব কাজে তিনি ডান দিক থেকে শুরু করতে পছন্দ করতেন।'], BK + '168');
  B.c(2, ['When we put on a shirt, which side do we begin with?', 'জামা পরার সময় আমরা কোন দিক থেকে শুরু করি?'], [P('The right side', 'ডান দিক', 'arrowr'), P('The left side', 'বাম দিক', 'arrowl')],
    ['"When you put on a garment and when you perform ablution, begin with your right side."', '"যখন পোশাক পরবে এবং যখন অজু করবে, ডান দিক থেকে শুরু করবে।"'], AD + '4141');
  B.c(2, ['What should we do before going to bed, as the Prophet ﷺ told al-Bara?', 'নবী ﷺ বারা (রা.)-কে ঘুমানোর আগে কী করতে বলেছিলেন?'], [['Make wudu as for the prayer', 'নামাজের মতো অজু করা'], ['Eat a big meal', 'পেট ভরে খাওয়া'], ['Run around the house', 'ঘরের চারপাশে দৌড়ানো']],
    ['"Whenever you go to bed, perform ablution like that for the prayer, and lie on your right side."', '"যখন বিছানায় যাবে, নামাজের মতো অজু করবে এবং ডান কাতে শোবে।"'], BK + '247');
  B.c(2, ['What should we do to our bed before lying down?', 'শোয়ার আগে বিছানার কী করা উচিত?'], [['Shake it out', 'ঝেড়ে নেওয়া'], ['Jump on it', 'তার ওপর লাফানো'], ['Leave it as it is', 'যেমন আছে তেমন রাখা']],
    ['"He should shake out his bed, for he does not know what has come onto it after him."', '"সে যেন বিছানা ঝেড়ে নেয়, কারণ সে জানে না তার অনুপস্থিতিতে সেখানে কী এসেছে।"'], BK + '6320');
  B.c(2, ['Which surahs did the Prophet ﷺ recite into his hands before sleeping?', 'ঘুমানোর আগে নবী ﷺ কোন সুরাগুলো পড়ে হাতে ফুঁ দিতেন?'], [['Al-Ikhlas, al-Falaq and an-Nas', 'ইখলাস, ফালাক ও নাস'], ['Al-Baqarah and Ya-Sin', 'বাকারা ও ইয়াসিন'], ['Al-Fil and Quraysh', 'ফিল ও কুরাইশ']],
    ['He cupped his hands, recited the three surahs, blew, and wiped over his body, three times.', 'তিনি দুই হাত একত্র করে তিনটি সুরা পড়ে ফুঁ দিতেন এবং শরীরে হাত বুলাতেন, তিনবার।'], BK + '5017');
  B.c(2, ['How many times did he recite them and wipe over his body?', 'তিনি কয়বার সুরাগুলো পড়ে শরীরে হাত বুলাতেন?'], [['Three times', 'তিনবার'], ['Once', 'একবার'], ['Seven times', 'সাতবার']],
    ['"He used to do that three times."', '"তিনি এমন তিনবার করতেন।"'], BK + '5017');
  B.c(2, ['How many fingers did the Prophet ﷺ eat with and lick after eating?', 'নবী ﷺ কয় আঙুলে খেতেন ও খাওয়ার পর চেটে নিতেন?'], [['Three', 'তিন'], ['One', 'এক'], ['Five', 'পাঁচ']],
    ['Ka\'b ibn Malik saw Allah\'s Messenger ﷺ licking his three fingers after the food.', 'কাব ইবনে মালিক (রা.) রাসুলুল্লাহ ﷺ-কে খাওয়ার পর তিন আঙুল চেটে নিতে দেখেছেন।'], MS + '2032');
  B.c(2, ['Why do we clean our fingers and the dish after eating?', 'খাওয়ার পর আমরা কেন আঙুল ও থালা পরিষ্কার করে খাই?'], [['We do not know which part has the blessing', 'আমরা জানি না কোন অংশে বরকত আছে'], ['To finish faster', 'তাড়াতাড়ি শেষ করতে'], ['To make a noise', 'শব্দ করতে']],
    ['"You do not know in what portion the blessing lies."', '"তোমরা জানো না খাবারের কোন অংশে বরকত আছে।"'], MS + '2033');
  B.c(2, ['What do we say when we enter the masjid?', 'মসজিদে ঢোকার সময় আমরা কী বলি?'], [['O Allah, open for me the doors of Your mercy', 'হে আল্লাহ, আমার জন্য তোমার রহমতের দরজা খুলে দাও'], ['O Allah, I ask You for Your grace', 'হে আল্লাহ, আমি তোমার অনুগ্রহ চাই'], ['With Your name I die and I live', 'তোমার নামে আমি মরি ও বাঁচি']],
    ['"When any one of you enters the mosque, he should say: O Allah, open for me the doors of Your mercy."', '"তোমাদের কেউ মসজিদে ঢুকলে সে যেন বলে: হে আল্লাহ, আমার জন্য তোমার রহমতের দরজা খুলে দাও।"'], MS + '713');
  B.c(2, ['What do we say when we leave the masjid?', 'মসজিদ থেকে বের হওয়ার সময় আমরা কী বলি?'], [['O Allah, I ask You for Your grace', 'হে আল্লাহ, আমি তোমার অনুগ্রহ চাই'], ['O Allah, open for me the doors of Your mercy', 'হে আল্লাহ, আমার জন্য তোমার রহমতের দরজা খুলে দাও'], ['Alhamdulillah', 'আলহামদুলিল্লাহ']],
    ['"When he steps out he should say: O Allah, I beg of You Your grace."', '"বের হওয়ার সময় সে যেন বলে: হে আল্লাহ, আমি তোমার অনুগ্রহ চাই।"'], MS + '713');
  B.c(2, ['What do we say when we leave the house?', 'ঘর থেকে বের হওয়ার সময় আমরা কী বলি?'], [['Bismillah, tawakkaltu alallah', 'বিসমিল্লাহ, তাওয়াক্কালতু আলাল্লাহ'], ['Yarhamukallah', 'ইয়ারহামুকাল্লাহ'], ['Bismika amutu wa ahya', 'বিসমিকা আমুতু ওয়া আহইয়া']],
    ['"In the name of Allah, I trust in Allah; there is no might and no power but in Allah."', '"আল্লাহর নামে, আল্লাহর ওপর ভরসা করলাম; আল্লাহ ছাড়া কোনো শক্তি ও সামর্থ্য নেই।"'], AD + '5095');
  B.c(2, ['Who greets whom?', 'কে কাকে সালাম দেবে?'], [['The one passing by greets the one sitting', 'পথচারী বসে থাকা লোককে'], ['The one sitting greets the one passing by', 'বসে থাকা লোক পথচারীকে'], ['Nobody greets', 'কেউ সালাম দেবে না']],
    ['"The passer-by should greet the sitting one, and the small group should greet the large group."', '"পথচারী বসে থাকা লোককে এবং ছোট দল বড় দলকে সালাম দেবে।"'], BK + '6231');
  B.c(2, ['What happens when two Muslims meet and shake hands?', 'দুই মুসলিম দেখা হলে হাত মেলালে কী হয়?'], [['Their sins are forgiven before they part', 'আলাদা হওয়ার আগেই তাদের গুনাহ মাফ হয়'], ['Nothing happens', 'কিছুই হয় না'], ['They become tired', 'তারা ক্লান্ত হয়ে যায়']],
    ['Two Muslims do not meet and shake hands without being forgiven before they separate.', 'দুই মুসলিম দেখা করে হাত মেলালে আলাদা হওয়ার আগেই তাদের মাফ করে দেওয়া হয়।'], AD + '5212');
  B.c(2, ['The companions ate but were not satisfied. What did the Prophet ﷺ tell them to do?', 'সাহাবিরা খেতেন কিন্তু তৃপ্ত হতেন না। নবী ﷺ তাঁদের কী করতে বললেন?'], [['Eat together and mention Allah\'s name', 'একসঙ্গে খাও এবং আল্লাহর নাম নাও'], ['Eat more food', 'আরও বেশি খাও'], ['Eat faster', 'আরও তাড়াতাড়ি খাও']],
    ['"If you gather together at your food and mention Allah\'s name, you will be blessed in it."', '"তোমরা একসঙ্গে খাও এবং আল্লাহর নাম নাও, তাতে বরকত দেওয়া হবে।"'], AD + '3764');
  B.yn(2, ['Is clipping the nails one of the practices of the fitrah?', 'নখ কাটা কি ফিতরাতের কাজগুলোর একটি?'], true,
    ['Clipping the nails is named among the five practices of the fitrah.', 'ফিতরাতের পাঁচটি কাজের মধ্যে নখ কাটার কথা বলা হয়েছে।'], BK + '5889');
  B.sort(2, ['Start with the right, or with the left?', 'ডান দিয়ে শুরু, নাকি বাম দিয়ে?'], [['Right first', 'আগে ডান'], ['Left first', 'আগে বাম']],
    [['Putting on shoes', 'জুতা পরা', 0], ['Putting on a shirt', 'জামা পরা', 0], ['Washing in wudu', 'অজুতে ধোয়া', 0], ['Combing the hair', 'চুল আঁচড়ানো', 0], ['Taking off shoes', 'জুতা খোলা', 1]],
    ['The right begins everything good; only the shoe comes off left first.', 'সব ভালো কাজ ডান দিয়ে শুরু; শুধু জুতা খোলার সময় আগে বাম।'], BK + '168; ' + BK + '5855; ' + AD + '4141');
  B.sort(2, ['A sunnah of eating and drinking, or not?', 'খাওয়া-পানের সুন্নাহ, নাকি নয়?'], [['Sunnah', 'সুন্নাহ'], ['Not the sunnah', 'সুন্নাহ নয়']],
    [['Saying Bismillah', 'বিসমিল্লাহ বলা', 0], ['Eating what is nearest', 'কাছের দিক থেকে খাওয়া', 0], ['Drinking in three breaths', 'তিন শ্বাসে পান করা', 0], ['Blowing on the drink', 'পানীয়তে ফুঁ দেওয়া', 1], ['Finding fault with the food', 'খাবারের দোষ ধরা', 1]],
    ['Begin with Allah\'s name, eat from your side, and drink calmly.', 'আল্লাহর নামে শুরু করো, নিজের দিক থেকে খাও, ধীরে পান করো।'], BK + '5376; ' + BK + '5631; ' + AD + '3728; ' + BK + '5409');
  B.order(2, ['Someone sneezes. Put the three sayings in order.', 'কেউ হাঁচি দিল। তিনটি কথা ক্রমে সাজাও।'],
    [['Alhamdulillah (the one who sneezed)', 'আলহামদুলিল্লাহ (যে হাঁচি দিল)'], ['Yarhamukallah (his brother)', 'ইয়ারহামুকাল্লাহ (তার ভাই)'], ['Yahdikumullah wa yuslihu balakum (the one who sneezed)', 'ইয়াহদিকুমুল্লাহু ওয়া ইউসলিহু বালাকুম (যে হাঁচি দিল)']],
    ['Praise, then a prayer for mercy, then a prayer for guidance.', 'প্রশংসা, তারপর রহমতের দোয়া, তারপর হেদায়াতের দোয়া।'], BK + '6224');
  B.order(2, ['Put the shoes on and take them off the sunnah way.', 'সুন্নাহ অনুযায়ী জুতা পরা ও খোলার ক্রম সাজাও।'],
    [['Put on the right shoe', 'ডান জুতা পরো'], ['Put on the left shoe', 'বাম জুতা পরো'], ['Take off the left shoe', 'বাম জুতা খোলো'], ['Take off the right shoe', 'ডান জুতা খোলো']],
    ['"Let the right shoe be the first to be put on and the last to be taken off."', '"ডান জুতা যেন সবার আগে পরা হয় এবং সবার শেষে খোলা হয়।"'], BK + '5855');
  B.match(2, ['Match the dua to its time.', 'দোয়ার সঙ্গে সময় মেলাও।'],
    [[['Bismika Allahumma amutu wa ahya', 'বিসমিকা আল্লাহুম্মা আমুতু ওয়া আহইয়া'], ['Going to sleep', 'ঘুমাতে যাওয়ার সময়']], [['Alhamdu lillahil-ladhi ahyana', 'আলহামদু লিল্লাহিল্লাযি আহইয়ানা'], ['Waking up', 'ঘুম থেকে ওঠার সময়']], [['Bismillah, tawakkaltu alallah', 'বিসমিল্লাহ, তাওয়াক্কালতু আলাল্লাহ'], ['Leaving the house', 'ঘর থেকে বের হওয়ার সময়']], [['Yarhamukallah', 'ইয়ারহামুকাল্লাহ'], ['Answering a sneeze', 'হাঁচির জবাবে']]],
    ['A dua for each part of the day.', 'দিনের প্রতিটি সময়ের জন্য একটি দোয়া।'], BK + '6324; ' + AD + '5095; ' + BK + '6224');

  // ---------- band 3 ----------
  B.c(3, ['"If I had not found it hard for my followers, I would have ordered them to use the siwak ..."', '"আমার উম্মতের জন্য কষ্টকর না হলে আমি তাদের মিসওয়াক করার আদেশ দিতাম ..."'], [['for every prayer', 'প্রত্যেক নামাজের সময়'], ['once a year', 'বছরে একবার'], ['only on Friday', 'শুধু শুক্রবারে'], ['only in Ramadan', 'শুধু রমজানে']],
    ['The siwak is that beloved, yet the Prophet ﷺ did not want to make it hard for us.', 'মিসওয়াক এতই প্রিয়, তবু নবী ﷺ আমাদের জন্য কঠিন করতে চাননি।'], BK + '887');
  B.c(3, ['What does the waking dua end with: "wa ilaihin-nushur"?', 'ঘুম থেকে ওঠার দোয়ার শেষ অংশ "ওয়া ইলাইহিন নুশুর" এর অর্থ কী?'], [['And to Him is the resurrection', 'আর তাঁর কাছেই পুনরুত্থান'], ['And He gives us food', 'আর তিনি আমাদের খাবার দেন'], ['And He sends the rain', 'আর তিনি বৃষ্টি পাঠান']],
    ['"All praise is for Allah who gave us life after He made us die, and to Him is the resurrection."', '"সব প্রশংসা আল্লাহর, যিনি মৃত্যুর পর আমাদের জীবন দিলেন, আর তাঁর কাছেই পুনরুত্থান।"'], BK + '6324');
  B.c(3, ['After "Yarhamukallah", what does the one who sneezed reply?', '"ইয়ারহামুকাল্লাহ" শোনার পর হাঁচিদাতা কী বলবে?'], [['Yahdikumullah wa yuslihu balakum', 'ইয়াহদিকুমুল্লাহু ওয়া ইউসলিহু বালাকুম'], ['Alhamdulillah again', 'আবার আলহামদুলিল্লাহ'], ['Bismillah', 'বিসমিল্লাহ'], ['Nothing', 'কিছুই না']],
    ['It means "May Allah guide you and set your affairs right."', 'এর অর্থ "আল্লাহ তোমাদের হেদায়াত দিন এবং তোমাদের অবস্থা ঠিক করে দিন।"'], BK + '6224');
  B.c(3, ['"Allah loves sneezing but dislikes ..."', '"আল্লাহ হাঁচি পছন্দ করেন, কিন্তু অপছন্দ করেন ..."'], [['yawning', 'হাই তোলা'], ['smiling', 'হাসিমুখ'], ['walking', 'হাঁটা'], ['sleeping', 'ঘুম']],
    ['Yawning is from Satan, so we try our best to hold it back.', 'হাই শয়তানের পক্ষ থেকে, তাই আমরা যথাসাধ্য তা আটকাই।'], BK + '6226');
  B.c(3, ['How many times do we ask permission to enter before turning back?', 'ঢোকার অনুমতি কয়বার চেয়ে না পেলে ফিরে যেতে হয়?'], [['Three times', 'তিনবার'], ['Once', 'একবার'], ['Ten times', 'দশবার']],
    ['Abu Musa asked permission to enter upon Umar three times, was not answered, and went back.', 'আবু মুসা (রা.) উমর (রা.)-এর কাছে তিনবার অনুমতি চেয়ে না পেয়ে ফিরে গিয়েছিলেন।'], BK + '6245');
  B.c(3, ['When a person enters his house and eats without mentioning Allah\'s name, what does Satan say?', 'কেউ আল্লাহর নাম না নিয়ে ঘরে ঢুকলে ও খেলে শয়তান কী বলে?'], [['You have found a place to stay and a meal', 'তোমরা রাত কাটানোর জায়গা ও খাবার পেয়ে গেছ'], ['There is no place for you here', 'এখানে তোমাদের জায়গা নেই'], ['Run away', 'পালিয়ে যাও']],
    ['When he does mention Allah, Satan says: "You have no place to spend the night and no evening meal."', 'আর আল্লাহর নাম নিলে শয়তান বলে: "তোমাদের রাত কাটানোর জায়গাও নেই, রাতের খাবারও নেই।"'], MS + '2018');
  B.c(3, ['What is said to the one who leaves home saying "Bismillah, tawakkaltu alallah"?', 'যে "বিসমিল্লাহ, তাওয়াক্কালতু আলাল্লাহ" বলে ঘর থেকে বের হয়, তাকে কী বলা হয়?'], [['You are guided, defended and protected', 'তোমাকে পথ দেখানো হলো, তোমার জন্য যথেষ্ট হলো ও তোমাকে রক্ষা করা হলো'], ['You will be rich today', 'আজ তুমি ধনী হবে'], ['You may go back to sleep', 'তুমি আবার ঘুমাতে পারো']],
    ['And the devils go far from him.', 'আর শয়তানরা তার থেকে দূরে সরে যায়।'], AD + '5095');
  B.c(3, ['Which verse did Abu Hurairah learn protects a person through the night when recited at bedtime?', 'আবু হুরাইরা (রা.) জেনেছিলেন, ঘুমানোর সময় কোন আয়াত পড়লে সারা রাত হেফাজতে থাকা যায়?'], [['Ayat al-Kursi', 'আয়াতুল কুরসি'], ['The verse of fasting', 'রোজার আয়াত'], ['The verse of Hajj', 'হজের আয়াত']],
    ['The Prophet ﷺ confirmed it: a guard from Allah stays with you until morning.', 'নবী ﷺ তা সত্য বলেছেন: আল্লাহর পক্ষ থেকে একজন রক্ষক সকাল পর্যন্ত সঙ্গে থাকেন।'], BK + '2311; Quran 2:255');
  B.c(3, ['When night falls, what are we told to do with the doors?', 'রাত হলে দরজার ব্যাপারে আমাদের কী করতে বলা হয়েছে?'], [['Close them and mention Allah\'s name', 'বন্ধ করা ও আল্লাহর নাম নেওয়া'], ['Leave them wide open', 'পুরো খোলা রাখা'], ['Paint them', 'রং করা']],
    ['"Close the doors and mention Allah\'s name, for Satan does not open a closed door."', '"দরজা বন্ধ করো এবং আল্লাহর নাম নাও, কারণ শয়তান বন্ধ দরজা খোলে না।"'], BK + '5623');
  B.c(3, ['Why should we wash our hands on waking before dipping them in water?', 'ঘুম থেকে উঠে পানিতে হাত ডোবানোর আগে কেন হাত ধুতে হবে?'], [['We do not know where our hands were during sleep', 'ঘুমের মধ্যে হাত কোথায় ছিল আমরা জানি না'], ['To wake up faster', 'তাড়াতাড়ি জেগে উঠতে'], ['Because the water is cold', 'কারণ পানি ঠান্ডা']],
    ['"Nobody knows where his hands were during sleep."', '"কেউ জানে না ঘুমের মধ্যে তার হাত কোথায় ছিল।"'], BK + '162');
  B.c(3, ['Who told us that the Prophet ﷺ liked to begin with the right in all his affairs?', 'নবী ﷺ সব কাজে ডান দিক থেকে শুরু করতে পছন্দ করতেন, এ কথা কে বর্ণনা করেছেন?'], [['Aishah', 'আয়েশা (রা.)'], ['Bilal', 'বিলাল (রা.)'], ['Khalid ibn al-Walid', 'খালিদ ইবনুল ওয়ালিদ (রা.)']],
    ['Aishah, the Mother of the Believers, narrated it.', 'উম্মুল মুমিনিন আয়েশা (রা.) এটি বর্ণনা করেছেন।'], BK + '168');
  B.c(3, ['The right shoe should be ...', 'ডান জুতা হওয়া উচিত ...'], [['the first put on and the last taken off', 'সবার আগে পরা ও সবার শেষে খোলা'], ['the last put on and the first taken off', 'সবার শেষে পরা ও সবার আগে খোলা'], ['never taken off', 'কখনো না খোলা']],
    ['"Let the right shoe be the first to be put on and the last to be taken off."', '"ডান জুতা যেন সবার আগে পরা হয় এবং সবার শেষে খোলা হয়।"'], BK + '5855');
  B.c(3, ['Why should we not eat or drink with the left hand?', 'কেন আমরা বাম হাতে খাব না বা পান করব না?'], [['Satan eats and drinks with his left hand', 'শয়তান বাম হাতে খায় ও পান করে'], ['The left hand is weaker', 'বাম হাত দুর্বল'], ['It is slower', 'এতে দেরি হয়']],
    ['"For the Satan eats with his left hand and drinks with his left hand."', '"কারণ শয়তান বাম হাতে খায় এবং বাম হাতে পান করে।"'], MS + '2020');
  B.c(3, ['Which dua did the Prophet ﷺ say before going to the toilet?', 'টয়লেটে যাওয়ার আগে নবী ﷺ কোন দোয়া পড়তেন?'], [['Allahumma inni a\'udhu bika minal khubuthi wal khaba\'ith', 'আল্লাহুম্মা ইন্নি আউযু বিকা মিনাল খুবুসি ওয়াল খাবাইস'], ['Bismika Allahumma amutu wa ahya', 'বিসমিকা আল্লাহুম্মা আমুতু ওয়া আহইয়া'], ['Allahumma-ftah li abwaba rahmatik', 'আল্লাহুম্মাফতাহ লি আবওয়াবা রাহমাতিক']],
    ['"O Allah, I seek refuge with You from all offensive and wicked things."', '"হে আল্লাহ, আমি তোমার কাছে সব অপবিত্র ও দুষ্ট জিনিস থেকে আশ্রয় চাই।"'], BK + '142');
  B.c(3, ['What did the Prophet ﷺ do if he did not like a food?', 'কোনো খাবার পছন্দ না হলে নবী ﷺ কী করতেন?'], [['He left it without criticizing it', 'দোষ না ধরে তা রেখে দিতেন'], ['He complained about it', 'তার নিন্দা করতেন'], ['He threw it away', 'তা ফেলে দিতেন']],
    ['"He used to eat if he liked the food, and leave it if he disliked it."', '"পছন্দ হলে খেতেন, অপছন্দ হলে রেখে দিতেন।"'], BK + '5409');
  B.yn(3, ['Did the Prophet ﷺ teach us to gather and eat together rather than each alone?', 'নবী ﷺ কি আমাদের আলাদা না খেয়ে একসঙ্গে খেতে শিখিয়েছেন?'], true,
    ['"Perhaps you eat separately... gather together at your food."', '"সম্ভবত তোমরা আলাদা আলাদা খাও... একসঙ্গে খাও।"'], AD + '3764');
  B.sort(3, ['When is this dua said?', 'এই দোয়া কখন পড়া হয়?'], [['At bedtime', 'ঘুমানোর সময়'], ['At another time', 'অন্য সময়ে']],
    [['Bismika Allahumma amutu wa ahya', 'বিসমিকা আল্লাহুম্মা আমুতু ওয়া আহইয়া', 0], ['Ayat al-Kursi for protection till morning', 'সকাল পর্যন্ত হেফাজতের জন্য আয়াতুল কুরসি', 0], ['Al-Ikhlas, al-Falaq, an-Nas into the hands', 'হাতে ফুঁ দিয়ে ইখলাস, ফালাক, নাস', 0], ['Allahumma-ftah li abwaba rahmatik', 'আল্লাহুম্মাফতাহ লি আবওয়াবা রাহমাতিক', 1], ['Yarhamukallah', 'ইয়ারহামুকাল্লাহ', 1]],
    ['The night has its own words of remembrance.', 'রাতের নিজস্ব জিকির আছে।'], BK + '6324; ' + BK + '2311; ' + BK + '5017; ' + MS + '713');
  B.match(3, ['Match the sunnah to its reason.', 'সুন্নাহর সঙ্গে তার কারণ মেলাও।'],
    [[['Shake out the bed', 'বিছানা ঝাড়া'], ['You do not know what came onto it', 'তুমি জানো না সেখানে কী এসেছে']], [['Clean the dish and fingers', 'থালা ও আঙুল পরিষ্কার করে খাওয়া'], ['You do not know where the blessing is', 'তুমি জানো না বরকত কোথায়']], [['Close the doors at night', 'রাতে দরজা বন্ধ করা'], ['Satan does not open a closed door', 'শয়তান বন্ধ দরজা খোলে না']], [['Eat with the right hand', 'ডান হাতে খাওয়া'], ['Satan eats with his left', 'শয়তান বাম হাতে খায়']]],
    ['Each sunnah has wisdom behind it.', 'প্রতিটি সুন্নাহর পেছনে হিকমত আছে।'], BK + '6320; ' + MS + '2033; ' + BK + '5623; ' + MS + '2020');
  B.match(3, ['Match the place to its dua.', 'স্থানের সঙ্গে দোয়া মেলাও।'],
    [[['Entering the masjid', 'মসজিদে ঢোকা'], ['Open for me the doors of Your mercy', 'আমার জন্য তোমার রহমতের দরজা খুলে দাও']], [['Leaving the masjid', 'মসজিদ থেকে বের হওয়া'], ['I ask You for Your grace', 'আমি তোমার অনুগ্রহ চাই']], [['Leaving the house', 'ঘর থেকে বের হওয়া'], ['I trust in Allah', 'আল্লাহর ওপর ভরসা করলাম']], [['Before the toilet', 'টয়লেটের আগে'], ['I seek refuge with You from wicked things', 'দুষ্ট জিনিস থেকে তোমার আশ্রয় চাই']]],
    ['A Muslim remembers Allah at every door.', 'মুসলিম প্রতিটি দরজায় আল্লাহকে স্মরণ করে।'], MS + '713; ' + AD + '5095; ' + BK + '142');
  B.order(3, ['Put the bedtime sunnahs in the order al-Bara was taught.', 'বারা (রা.)-কে শেখানো ক্রমে ঘুমানোর সুন্নাহগুলো সাজাও।'],
    [['Make wudu as for the prayer', 'নামাজের মতো অজু করা'], ['Lie on your right side', 'ডান কাতে শোয়া'], ['Say the dua', 'দোয়া পড়া']],
    ['"Perform ablution like that for the prayer, lie on your right side and say..."', '"নামাজের মতো অজু করো, ডান কাতে শোও এবং বলো..."'], BK + '247');

  KQ.define('sunnah-every-day', { bank: B.list });
})();
