/* Words, Bangla and English: data.js — the question bank.
   Picture words in two languages, first letters, opposites, spelling, plurals, word kinds and meanings.
   Answers that are words of one language stay in that language whichever language the child plays in.
   band: 1 = ages 4-6 (pictures), 2 = ages 7-9, 3 = ages 10-12. */
(function () {
  'use strict';
  var KQ = window.KahfQuiz, B = KQ.bank('wd');
  function P(en, bn, p) { return [en, bn, p]; }
  function same(s) { return [s, s]; }
  // [picture, English, বাংলা]
  var W = [['apple', 'apple', 'আপেল'], ['ball', 'ball', 'বল'], ['book', 'book', 'বই'], ['cat', 'cat', 'বিড়াল'], ['cow', 'cow', 'গরু'], ['door', 'door', 'দরজা'], ['egg', 'egg', 'ডিম'], ['fish', 'fish', 'মাছ'],
    ['flower', 'flower', 'ফুল'], ['hand', 'hand', 'হাত'], ['house', 'house', 'বাড়ি'], ['key', 'key', 'চাবি'], ['leaf', 'leaf', 'পাতা'], ['moon', 'moon', 'চাঁদ'], ['sun', 'sun', 'সূর্য'], ['star', 'star', 'তারা'],
    ['tree', 'tree', 'গাছ'], ['bird', 'bird', 'পাখি'], ['milk', 'milk', 'দুধ'], ['water', 'water', 'পানি'], ['rice', 'rice', 'ভাত'], ['bread', 'bread', 'রুটি'], ['pen', 'pen', 'কলম'], ['table', 'table', 'টেবিল'],
    ['shoe', 'shoe', 'জুতা'], ['cup', 'cup', 'কাপ'], ['river', 'river', 'নদী'], ['mountain', 'mountain', 'পাহাড়'], ['rain', 'rain', 'বৃষ্টি'], ['fire', 'fire', 'আগুন'], ['boat', 'ship', 'জাহাজ'], ['clock', 'clock', 'ঘড়ি'],
    ['ear', 'ear', 'কান'], ['nose', 'nose', 'নাক'], ['foot', 'foot', 'পা'], ['bed', 'bed', 'বিছানা'], ['kite', 'kite', 'ঘুড়ি'], ['bee', 'bee', 'মৌমাছি'], ['frog', 'frog', 'ব্যাঙ'], ['elephant', 'elephant', 'হাতি']];
  W[30][0] = 'ship';

  // ---------- band 1: picture words ----------
  B.facts(1, W, { kind: 'pen', n: 2, q: function () { return ['What is this called in English?', 'ইংরেজিতে এর নাম কী?']; }, a: function (r) { return same(r[1]); },
    why: function (r) { return ['This is "' + r[1] + '". In Bangla: ' + r[2] + '.', 'এটি ' + r[2] + '। ইংরেজিতে "' + r[1] + '"।']; }, extra: function (r) { return { qp: r[0] }; } });
  B.facts(1, W, { kind: 'pbn', n: 2, q: function () { return ['What is this called in Bangla?', 'বাংলায় এর নাম কী?']; }, a: function (r) { return same(r[2]); },
    why: function (r) { return ['This is ' + r[2] + '. In English: "' + r[1] + '".', 'এটি ' + r[2] + '। ইংরেজিতে "' + r[1] + '"।']; }, extra: function (r) { return { qp: r[0] }; } });
  B.facts(1, W.slice(0, 20), { kind: 'wpic', n: 2, q: function (r) { return ['Find the picture for "' + r[1] + '".', '"' + r[1] + '" শব্দের ছবি কোনটি?']; }, a: function (r) { return { p: r[0] }; },
    why: function (r) { return ['"' + r[1] + '" means ' + r[2] + '.', '"' + r[1] + '" মানে ' + r[2] + '।']; } });
  // first letters
  [['apple', 'A', ['B', 'C']], ['ball', 'B', ['D', 'P']], ['cat', 'C', ['K', 'S']], ['door', 'D', ['B', 'T']], ['egg', 'E', ['A', 'I']], ['fish', 'F', ['V', 'P']], ['hand', 'H', ['N', 'A']], ['key', 'K', ['C', 'Q']],
    ['moon', 'M', ['N', 'W']], ['sun', 'S', ['C', 'Z']], ['tree', 'T', ['D', 'P']], ['rain', 'R', ['L', 'W']]].forEach(function (r) {
    B.c(1, ['Which letter does "' + r[0] + '" begin with?', '"' + r[0] + '" কোন অক্ষর দিয়ে শুরু?'], [r[1]].concat(r[2]), [r[1] + ' is for ' + r[0] + '.', r[0] + ' শব্দের প্রথম অক্ষর ' + r[1] + '।'], null, { qp: r[0] });
  });
  [['book', 'বই', 'ব', ['ক', 'ম']], ['fish', 'মাছ', 'ম', ['ন', 'স']], ['flower', 'ফুল', 'ফ', ['প', 'ল']], ['tree', 'গাছ', 'গ', ['ঘ', 'ক']], ['hand', 'হাত', 'হ', ['ত', 'দ']], ['key', 'চাবি', 'চ', ['ছ', 'জ']],
    ['leaf', 'পাতা', 'প', ['ফ', 'ব']], ['star', 'তারা', 'ত', ['থ', 'ট']], ['river', 'নদী', 'ন', ['ম', 'দ']], ['pen', 'কলম', 'ক', ['খ', 'গ']]].forEach(function (r) {
    B.c(1, ['Which letter does "' + r[1] + '" begin with?', '"' + r[1] + '" কোন বর্ণ দিয়ে শুরু?'], [r[2]].concat(r[3]), [r[1] + ' begins with ' + r[2] + '.', r[1] + ' শব্দের প্রথম বর্ণ ' + r[2] + '।'], null, { qp: r[0] });
  });
  B.pairs(1, W.slice(0, 24), { kind: 'm1', size: 3, shuffle: false, q: ['Match the picture to its English word.', 'ছবির সঙ্গে ইংরেজি শব্দ মেলাও।'], l: function (r) { return { p: r[0] }; }, r: function (r) { return same(r[1]); }, why: ['Say each word aloud as you match it.', 'মেলানোর সময় প্রতিটি শব্দ জোরে বলো।'] });
  B.sort(1, ['Big or small?', 'Big না small?'], [same('big'), same('small')], [['Elephant', 'হাতি', 0, 'elephant'], ['Mountain', 'পাহাড়', 0, 'mountain'], ['House', 'বাড়ি', 0, 'house'], ['Bee', 'মৌমাছি', 1, 'bee'], ['Key', 'চাবি', 1, 'key'], ['Egg', 'ডিম', 1, 'egg']], ['"Big" means বড়. "Small" means ছোট.', '"Big" মানে বড়। "Small" মানে ছোট।']);

  // ---------- band 2 ----------
  // English opposites
  var OP = [['big', 'small'], ['hot', 'cold'], ['up', 'down'], ['day', 'night'], ['open', 'shut'], ['happy', 'sad'], ['fast', 'slow'], ['old', 'new'], ['wet', 'dry'], ['full', 'empty'], ['long', 'short'], ['clean', 'dirty']];
  B.facts(2, OP, { kind: 'opp', q: function (r) { return ['What is the opposite of "' + r[0] + '"?', '"' + r[0] + '" শব্দের বিপরীত শব্দ কী?']; }, a: function (r) { return same(r[1]); },
    why: function (r) { return ['"' + r[0] + '" and "' + r[1] + '" are opposites.', '"' + r[0] + '" ও "' + r[1] + '" বিপরীত শব্দ।']; } });
  // বাংলা বিপরীত শব্দ
  var BOP = [['দিন', 'রাত'], ['বড়', 'ছোট'], ['সত্য', 'মিথ্যা'], ['আলো', 'অন্ধকার'], ['ভালো', 'মন্দ'], ['সুখ', 'দুঃখ'], ['গরম', 'ঠান্ডা'], ['নতুন', 'পুরাতন'], ['উপর', 'নিচ'], ['কাছে', 'দূরে'], ['শুরু', 'শেষ'], ['জয়', 'পরাজয়']];
  B.facts(2, BOP, { kind: 'bopp', q: function (r) { return ['What is the Bangla opposite of "' + r[0] + '"?', '"' + r[0] + '" শব্দের বিপরীত শব্দ কী?']; }, a: function (r) { return same(r[1]); },
    why: function (r) { return ['"' + r[0] + '" and "' + r[1] + '" are opposites.', '"' + r[0] + '" ও "' + r[1] + '" বিপরীত শব্দ।']; } });
  // spelling: [right, wrong, wrong, picture]
  [['friend', 'freind', 'frend'], ['school', 'scool', 'skool'], ['water', 'watar', 'wotter', 'water'], ['because', 'becuase', 'becos'], ['people', 'peple', 'poeple'], ['flower', 'flowar', 'flawer', 'flower'],
    ['mountain', 'mountin', 'mounten', 'mountain'], ['elephant', 'elefant', 'eliphant', 'elephant'], ['beautiful', 'beutiful', 'beautifull'], ['Friday', 'Fryday', 'Firday'], ['pencil', 'pensil', 'pencle', 'pencil'], ['bicycle', 'bycicle', 'bicicle', 'bicycle']].forEach(function (r) {
    B.c(2, ['Which spelling is correct?', 'কোন বানানটি সঠিক?'], [r[0], r[1], r[2]], ['The correct spelling is "' + r[0] + '".', 'সঠিক বানান "' + r[0] + '"।'], null, r[3] ? { qp: r[3], id: 'wd-sp-' + r[0] } : { id: 'wd-sp-' + r[0] });
  });
  [['বৃষ্টি', 'বৃস্টি', 'বৃষ্টী', 'rain'], ['সূর্য', 'সুর্য', 'সূর্জ', 'sun'], ['বিড়াল', 'বিরাল', 'বীড়াল', 'cat'], ['পাখি', 'পাখী', 'পাকি', 'bird'], ['শিক্ষক', 'শিক্ষোক', 'সিক্ষক'], ['স্কুল', 'ইসকুল', 'স্কূল'], ['মৌমাছি', 'মৌমাছী', 'মোমাছি', 'bee'], ['নদী', 'নদি', 'নোদী', 'river']].forEach(function (r) {
    B.c(2, ['Which Bangla spelling is correct?', 'কোন বানানটি শুদ্ধ?'], [r[0], r[1], r[2]], ['The correct spelling is ' + r[0] + '.', 'শুদ্ধ বানান ' + r[0] + '।'], null, r[3] ? { qp: r[3], id: 'wd-bs-' + r[3] } : { id: 'wd-bs-' + r[1] });
  });
  // plurals
  var PLU = [['book', 'books'], ['box', 'boxes'], ['baby', 'babies'], ['leaf', 'leaves'], ['child', 'children'], ['foot', 'feet'], ['tooth', 'teeth'], ['fish', 'fish'], ['man', 'men'], ['mouse', 'mice']];
  PLU.forEach(function (r) {
    var w = { book: ['bookes', 'book'], box: ['boxs', 'boxen'], baby: ['babys', 'babyes'], leaf: ['leafs', 'leafes'], child: ['childs', 'childrens'], foot: ['foots', 'feets'], tooth: ['tooths', 'teeths'], fish: ['fishs', 'fishies'], man: ['mans', 'mens'], mouse: ['mouses', 'mices'] }[r[0]];
    B.c(r[1].slice(-1) === 's' && r[0] !== 'leaf' && r[0] !== 'baby' ? 2 : [2, 3], ['One ' + r[0] + ', two...', 'একটি হলে ' + r[0] + ', অনেকগুলো হলে...'], [r[1]].concat(w), ['The plural of "' + r[0] + '" is "' + r[1] + '".', '"' + r[0] + '" শব্দের বহুবচন "' + r[1] + '"।']);
  });
  B.c(2, ['Which word rhymes with "cat"?', '"cat" শব্দের সঙ্গে কোনটির মিল আছে?'], ['hat', 'cup', 'dog', 'car'], ['Cat and hat end with the same sound.', 'cat ও hat একই ধ্বনিতে শেষ হয়।'], null, { qp: 'cat' });
  B.c(2, ['Which word rhymes with "moon"?', '"moon" শব্দের সঙ্গে কোনটির মিল আছে?'], ['spoon', 'sun', 'man', 'star'], ['Moon and spoon end with the same sound.', 'moon ও spoon একই ধ্বনিতে শেষ হয়।'], null, { qp: 'moon' });
  B.c(2, ['Which word rhymes with "tree"?', '"tree" শব্দের সঙ্গে কোনটির মিল আছে?'], ['bee', 'toy', 'tray', 'top'], ['Tree and bee end with the same sound.', 'tree ও bee একই ধ্বনিতে শেষ হয়।'], null, { qp: 'tree' });
  B.c(2, ['Which sentence is written correctly?', 'কোন বাক্যটি ঠিকভাবে লেখা?'], ['I have a red ball.', 'i have a red ball', 'I have a red ball', 'I Have A Red Ball.'], ['A sentence starts with a capital letter and ends with a full stop.', 'বাক্য বড় হাতের অক্ষরে শুরু হয় এবং শেষে দাঁড়ি (full stop) বসে।']);
  B.c(2, ['Choose the right word: "She ___ a book."', 'ঠিক শব্দটি বেছে নাও: "She ___ a book."'], ['has', 'have', 'having', 'haves'], ['With he, she and it we say "has".', 'he, she ও it-এর সঙ্গে "has" বসে।'], null, { qp: 'book' });
  B.c(2, ['Choose the right word: "There ___ three birds."', 'ঠিক শব্দটি বেছে নাও: "There ___ three birds."'], ['are', 'is', 'am', 'be'], ['For more than one we say "are".', 'একাধিক হলে "are" বসে।'], null, { qp: 'many-bird-3' });
  B.c(2, ['Which one is a vowel?', 'কোনটি vowel?'], ['E', 'B', 'T', 'M'], ['The vowels are A, E, I, O, U.', 'Vowel পাঁচটি: A, E, I, O, U।']);
  B.c(2, ['How many letters are in the English alphabet?', 'ইংরেজি বর্ণমালায় কয়টি অক্ষর?'], ['26', '24', '28', '30'], ['A to Z is 26 letters.', 'A থেকে Z পর্যন্ত ২৬টি অক্ষর।']);
  B.c(2, ['How many vowels (স্বরবর্ণ) are in the Bangla alphabet?', 'বাংলা বর্ণমালায় স্বরবর্ণ কয়টি?'], [['11', '১১'], ['5', '৫'], ['39', '৩৯'], ['50', '৫০']], ['Bangla has 11 vowels and 39 consonants.', 'বাংলায় ১১টি স্বরবর্ণ ও ৩৯টি ব্যঞ্জনবর্ণ।']);
  B.yn(2, ['Is "quickly" a word that tells how something is done?', '"quickly" কি এমন শব্দ, যা কাজটি কীভাবে হয় তা বলে?'], true, ['Yes. "He ran quickly."', 'হ্যাঁ। "He ran quickly."']);
  B.yn(2, ['Does "বই" mean "pen"?', '"বই" মানে কি "pen"?'], false, ['No. বই is "book". কলম is "pen".', 'না। বই মানে "book"। কলম মানে "pen"।'], null, { qp: 'book' });
  B.sort(2, ['Naming word or doing word?', 'নামের শব্দ না কাজের শব্দ?'], [['Naming word', 'নামের শব্দ'], ['Doing word', 'কাজের শব্দ']], [['tree', 'tree', 0], ['river', 'river', 0], ['teacher', 'teacher', 0], ['run', 'run', 1], ['eat', 'eat', 1], ['write', 'write', 1]], ['A noun names. A verb does.', 'Noun নাম বোঝায়। Verb কাজ বোঝায়।']);
  B.order(2, ['Put the words in ABC order.', 'শব্দগুলো ABC ক্রমে সাজাও।'], ['apple', 'ball', 'cat', 'door'], ['a, b, c, d.', 'a, b, c, d।']);
  B.order(2, ['Make a sentence.', 'শব্দ সাজিয়ে বাক্য বানাও।'], ['The', 'cat', 'drinks', 'milk.'], ['The cat drinks milk.', 'The cat drinks milk. (বিড়াল দুধ খায়।)']);
  B.order(2, ['Make a Bangla sentence.', 'শব্দ সাজিয়ে বাংলা বাক্য বানাও।'], [same('আমি'), same('প্রতিদিন'), same('স্কুলে'), same('যাই।')], ['"আমি প্রতিদিন স্কুলে যাই।" I go to school every day.', 'আমি প্রতিদিন স্কুলে যাই।']);
  B.pairs(2, W.slice(16, 40), { kind: 'm2', size: 4, shuffle: false, q: ['Match the English word to the Bangla word.', 'ইংরেজি শব্দের সঙ্গে বাংলা শব্দ মেলাও।'], l: function (r) { return same(r[1]); }, r: function (r) { return same(r[2]); }, why: ['Two languages, one meaning.', 'দুই ভাষা, এক অর্থ।'] });

  // ---------- band 3 ----------
  var SYN = [['happy', 'glad'], ['big', 'large'], ['begin', 'start'], ['quick', 'fast'], ['brave', 'courageous'], ['silent', 'quiet'], ['smart', 'clever'], ['tired', 'weary'], ['ancient', 'very old'], ['gift', 'present']];
  B.facts(3, SYN, { kind: 'syn', q: function (r) { return ['Which word means nearly the same as "' + r[0] + '"?', '"' + r[0] + '" শব্দের কাছাকাছি অর্থের শব্দ কোনটি?']; }, a: function (r) { return same(r[1]); },
    why: function (r) { return ['"' + r[0] + '" and "' + r[1] + '" are synonyms.', '"' + r[0] + '" ও "' + r[1] + '" সমার্থক শব্দ।']; } });
  var BSYN = [['সূর্য', 'রবি'], ['চাঁদ', 'শশী'], ['পানি', 'জল'], ['আকাশ', 'গগন'], ['পৃথিবী', 'ধরণি'], ['নদী', 'তটিনী'], ['ফুল', 'পুষ্প'], ['বাতাস', 'সমীরণ'], ['পাহাড়', 'পর্বত'], ['রাত', 'রজনী']];
  B.facts(3, BSYN, { kind: 'bsyn', q: function (r) { return ['Which Bangla word means the same as "' + r[0] + '"?', '"' + r[0] + '" শব্দের সমার্থক শব্দ কোনটি?']; }, a: function (r) { return same(r[1]); },
    why: function (r) { return ['"' + r[0] + '" and "' + r[1] + '" mean the same.', '"' + r[0] + '" ও "' + r[1] + '" সমার্থক শব্দ।']; } });
  var ANT = [['ancient', 'modern'], ['generous', 'selfish'], ['victory', 'defeat'], ['arrive', 'depart'], ['brave', 'cowardly'], ['expand', 'shrink'], ['rough', 'smooth'], ['increase', 'decrease']];
  B.facts(3, ANT, { kind: 'ant', q: function (r) { return ['What is the opposite of "' + r[0] + '"?', '"' + r[0] + '" শব্দের বিপরীত শব্দ কী?']; }, a: function (r) { return same(r[1]); },
    why: function (r) { return ['"' + r[0] + '" and "' + r[1] + '" are antonyms.', '"' + r[0] + '" ও "' + r[1] + '" বিপরীত শব্দ।']; } });
  // এক কথায় প্রকাশ
  var EK = [['যে বেশি কথা বলে', 'বাচাল'], ['যার তুলনা নেই', 'অতুলনীয়'], ['যা আগে কখনো হয়নি', 'অভূতপূর্ব'], ['যে উপকারীর উপকার স্বীকার করে', 'কৃতজ্ঞ'], ['যা সহজে পাওয়া যায়', 'সুলভ'], ['যিনি বক্তৃতা দেন', 'বক্তা'], ['যে সব কিছু জানে', 'সর্বজ্ঞ'], ['যা বলা হয়নি', 'অনুক্ত']];
  B.facts(3, EK, { kind: 'ek', q: function (r) { return ['Say it in one Bangla word: "' + r[0] + '"', 'এক কথায় প্রকাশ করো: "' + r[0] + '"']; }, a: function (r) { return same(r[1]); },
    why: function (r) { return [r[0] + ' = ' + r[1] + '.', r[0] + ' = ' + r[1] + '।']; } });
  B.c(3, ['Past tense: "Yesterday I ___ to school."', 'অতীত কাল: "Yesterday I ___ to school."'], ['went', 'go', 'goed', 'gone'], ['The past tense of "go" is "went".', '"go"-এর অতীত রূপ "went"।']);
  B.c(3, ['Past tense: "She ___ a letter last night."', 'অতীত কাল: "She ___ a letter last night."'], ['wrote', 'writed', 'written', 'writes'], ['The past tense of "write" is "wrote".', '"write"-এর অতীত রূপ "wrote"।'], null, { qp: 'pen' });
  B.c(3, ['Past tense: "We ___ rice for lunch."', 'অতীত কাল: "We ___ rice for lunch."'], ['ate', 'eated', 'eaten', 'eat'], ['The past tense of "eat" is "ate".', '"eat"-এর অতীত রূপ "ate"।'], null, { qp: 'rice' });
  B.c(3, ['Which word is an adjective in "The tall tree fell"?', '"The tall tree fell" বাক্যে adjective কোনটি?'], ['tall', 'tree', 'fell', 'The'], ['An adjective describes a noun. "Tall" describes the tree.', 'Adjective নামপদের গুণ বোঝায়। "tall" গাছের গুণ।'], null, { qp: 'tree' });
  B.c(3, ['Which word is a verb in "Birds fly south"?', '"Birds fly south" বাক্যে verb কোনটি?'], ['fly', 'Birds', 'south'], ['A verb is the action. The birds fly.', 'Verb কাজ বোঝায়। পাখিরা ওড়ে।'], null, { qp: 'bird' });
  B.c(3, ['Which word is a pronoun?', 'কোনটি pronoun (সর্বনাম)?'], ['they', 'river', 'jump', 'green'], ['A pronoun stands in for a noun: I, you, he, she, it, we, they.', 'Pronoun নামপদের বদলে বসে: I, you, he, she, it, we, they।']);
  B.c(3, ['Choose the right word: "The sun is ___ than the moon."', 'ঠিক শব্দটি বেছে নাও: "The sun is ___ than the moon."'], ['bigger', 'big', 'biggest', 'more big'], ['To compare two things we add -er.', 'দুটি জিনিস তুলনা করতে -er যোগ হয়।'], null, { qp: 'sun' });
  B.c(3, ['Choose the right word: "Their / There / They\'re": "___ going home."', 'ঠিক শব্দটি বেছে নাও: "___ going home."'], ['They\'re', 'Their', 'There'], ['"They\'re" is short for "they are".', '"They\'re" মানে "they are"।']);
  B.c(3, ['Choose the right word: "I can ___ the sea from here."', 'ঠিক শব্দটি বেছে নাও: "I can ___ the sea from here."'], ['see', 'sea', 'si'], ['"See" is with the eyes. "Sea" is salt water. They sound the same.', '"See" মানে দেখা। "Sea" মানে সাগর। উচ্চারণ একই।'], null, { qp: 'sea' });
  B.c(3, ['Which mark ends a question?', 'প্রশ্নবাক্যের শেষে কোন চিহ্ন বসে?'], ['?', '.', '!', ','], ['A question ends with a question mark.', 'প্রশ্নের শেষে প্রশ্নচিহ্ন বসে।']);
  B.c(3, ['Which word is a noun (বিশেষ্য)?', 'কোনটি বিশেষ্য পদ?'], [same('নদী'), same('সুন্দর'), same('দৌড়ায়'), same('কিন্তু')], ['বিশেষ্য names a person, place or thing.', 'বিশেষ্য কোনো ব্যক্তি, স্থান বা বস্তুর নাম।'], null, { qp: 'river' });
  B.c(3, ['Which word is an adjective (বিশেষণ)?', 'কোনটি বিশেষণ পদ?'], [same('লাল'), same('ফুল'), same('খায়'), same('এবং')], ['বিশেষণ tells the quality of a noun: লাল ফুল.', 'বিশেষণ বিশেষ্যের গুণ বোঝায়: লাল ফুল।'], null, { qp: 'flower' });
  B.c(3, ['Which word is a verb (ক্রিয়া)?', 'কোনটি ক্রিয়াপদ?'], [same('লিখছে'), same('কলম'), same('নীল'), same('সে')], ['ক্রিয়া tells what is being done.', 'ক্রিয়া কোনো কাজ করা বোঝায়।'], null, { qp: 'pen' });
  B.c(3, ['What is the plural (বহুবচন) of "বই"?', '"বই" শব্দের বহুবচন কোনটি?'], [same('বইগুলো'), same('বইটি'), same('বইখানা'), same('একটি বই')], ['-গুলো makes a plural. -টি and -খানা mean one.', '-গুলো যোগে বহুবচন হয়। -টি ও -খানা একবচন বোঝায়।'], null, { qp: 'book' });
  B.c(3, ['A word that sounds like another but differs in meaning is a...', 'যে শব্দের উচ্চারণ অন্য শব্দের মতো কিন্তু অর্থ আলাদা তাকে কী বলে?'], [['homophone', 'সমোচ্চারিত শব্দ'], ['synonym', 'সমার্থক শব্দ'], ['antonym', 'বিপরীত শব্দ'], ['proverb', 'প্রবাদ']], ['"Sun" and "son" are homophones.', '"Sun" ও "son" সমোচ্চারিত শব্দ।']);
  B.yn(3, ['Is "an" the right word before "apple"?', '"apple"-এর আগে কি "an" বসে?'], true, ['Yes. We use "an" before a vowel sound.', 'হ্যাঁ। vowel ধ্বনির আগে "an" বসে।'], null, { qp: 'apple' });
  B.yn(3, ['Is "childs" the plural of "child"?', '"child"-এর বহুবচন কি "childs"?'], false, ['No. It is "children".', 'না। বহুবচন "children"।']);
  B.sort(3, ['Noun or adjective?', 'Noun না adjective?'], [same('Noun'), same('Adjective')], [['honesty', 'honesty', 0], ['garden', 'garden', 0], ['kindness', 'kindness', 0], ['honest', 'honest', 1], ['green', 'green', 1], ['kind', 'kind', 1]], ['"Kindness" is a thing. "Kind" describes someone.', '"Kindness" একটি গুণের নাম। "Kind" কাউকে বর্ণনা করে।']);
  B.sort(3, ['Past or present?', 'অতীত না বর্তমান?'], [['Past', 'অতীত'], ['Present', 'বর্তমান']], [['went', 'went', 0], ['saw', 'saw', 0], ['ran', 'ran', 0], ['goes', 'goes', 1], ['sees', 'sees', 1], ['runs', 'runs', 1]], ['Many common verbs change their whole shape in the past.', 'অনেক পরিচিত verb অতীত কালে পুরো রূপ বদলে ফেলে।']);
  B.order(3, ['Make a sentence.', 'শব্দ সাজিয়ে বাক্য বানাও।'], ['My', 'brother', 'reads', 'every', 'night.'], ['My brother reads every night.', 'My brother reads every night. (আমার ভাই প্রতি রাতে পড়ে।)']);
  B.order(3, ['Put the words in dictionary order.', 'শব্দগুলো অভিধানের ক্রমে সাজাও।'], ['bread', 'bridge', 'broom', 'brush'], ['Look at the third letter: e, i, o, u.', 'তৃতীয় অক্ষর দেখো: e, i, o, u।']);
  B.match(3, ['Match each word to its kind.', 'প্রতিটি শব্দের সঙ্গে পদ মেলাও।'], [['mountain', same('Noun')], ['climb', same('Verb')], ['steep', same('Adjective')], ['slowly', same('Adverb')]], ['Noun, verb, adjective, adverb.', 'Noun, verb, adjective, adverb।']);
  B.match(3, ['Match the verb to its past tense.', 'Verb-এর সঙ্গে অতীত রূপ মেলাও।'], [['go', 'went'], ['see', 'saw'], ['take', 'took'], ['come', 'came']], ['These verbs do not take -ed.', 'এসব verb-এ -ed যোগ হয় না।']);
  B.match(3, ['Match the Bangla word to its English meaning.', 'বাংলা শব্দের সঙ্গে ইংরেজি অর্থ মেলাও।'], [[same('সততা'), same('honesty')], [same('ধৈর্য'), same('patience')], [same('সাহস'), same('courage')], [same('দয়া'), same('kindness')]], ['Four good qualities, in two languages.', 'চারটি ভালো গুণ, দুই ভাষায়।']);

  KQ.define('words-bangla-english', { bank: B.list });
})();
