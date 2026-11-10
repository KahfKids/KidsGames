/* Arabic Letters: data.js — the question bank.
   The 28 letters in their usual order, their dots, their joined shapes, the short vowel marks and first reading.
   Text only: the letters are shown large on the question card. Surah openings cite their verse.
   band: 1 = ages 4-6, 2 = ages 7-9, 3 = ages 10-12. */
(function () {
  'use strict';
  var KQ = window.KahfQuiz, B = KQ.bank('al');
  var BN = '০১২৩৪৫৬৭৮৯';
  function bn(x) { return String(x).replace(/\d/g, function (d) { return BN[d]; }); }
  function N(x) { return [String(x), bn(x)]; }
  function A(s) { return [s, s]; }
  var ALPHA = 'Arabic alphabet (standard order)', MARKS = 'Arabic script (harakat)';
  // [letter, name, নাম, dots, where the dots are (0 none, 1 above, 2 below), joins to the next letter]
  var L = [['ا', 'Alif', 'আলিফ', 0, 0, 0], ['ب', 'Ba', 'বা', 1, 2, 1], ['ت', 'Ta', 'তা', 2, 1, 1], ['ث', 'Tha', 'সা', 3, 1, 1], ['ج', 'Jim', 'জীম', 1, 2, 1], ['ح', 'Ḥa', 'হা (বড়)', 0, 0, 1], ['خ', 'Kha', 'খা', 1, 1, 1],
    ['د', 'Dal', 'দাল', 0, 0, 0], ['ذ', 'Dhal', 'যাল', 1, 1, 0], ['ر', 'Ra', 'রা', 0, 0, 0], ['ز', 'Zay', 'যা', 1, 1, 0], ['س', 'Sin', 'সীন', 0, 0, 1], ['ش', 'Shin', 'শীন', 3, 1, 1], ['ص', 'Sad', 'সোয়াদ', 0, 0, 1],
    ['ض', 'Dad', 'দোয়াদ', 1, 1, 1], ['ط', 'Ṭa', 'তোয়া', 0, 0, 1], ['ظ', 'Ẓa', 'যোয়া', 1, 1, 1], ['ع', 'Ayn', 'আইন', 0, 0, 1], ['غ', 'Ghayn', 'গাইন', 1, 1, 1], ['ف', 'Fa', 'ফা', 1, 1, 1], ['ق', 'Qaf', 'ক্বাফ', 2, 1, 1],
    ['ك', 'Kaf', 'কাফ', 0, 0, 1], ['ل', 'Lam', 'লাম', 0, 0, 1], ['م', 'Mim', 'মীম', 0, 0, 1], ['ن', 'Nun', 'নূন', 1, 1, 1], ['ه', 'Ha', 'হা (ছোট)', 0, 0, 1], ['و', 'Waw', 'ওয়াও', 0, 0, 0], ['ي', 'Ya', 'ইয়া', 2, 2, 1]];
  function nm(r) { return [r[1], r[2]]; }
  function by(ch) { for (var i = 0; i < L.length; i++) if (L[i][0] === ch) return L[i]; }

  // ---------- band 1: know the letters ----------
  B.facts(1, L, { kind: 'name', n: 2, q: function () { return ['Which letter is this?', 'এটি কোন হরফ?']; }, a: nm, why: function (r) { return ['This is ' + r[1] + '.', 'এটি ' + r[2] + '।']; }, ref: ALPHA, extra: function (r) { return { ar: r[0] }; } });
  B.facts(1, L, { kind: 'find', n: 2, q: function (r) { return ['Find the letter ' + r[1] + '.', r[2] + ' হরফটি খুঁজে বের করো।']; }, a: function (r) { return A(r[0]); }, why: function (r) { return [r[1] + ' looks like this: ' + r[0], r[2] + ' দেখতে এমন: ' + r[0]]; }, ref: ALPHA });
  B.c(1, ['Which is the first letter of the Arabic alphabet?', 'আরবি বর্ণমালার প্রথম হরফ কোনটি?'], [A('ا'), A('ب'), A('ي')], ['Alif comes first.', 'আলিফ সবার আগে।'], ALPHA);
  B.c(1, ['Which is the last letter of the Arabic alphabet?', 'আরবি বর্ণমালার শেষ হরফ কোনটি?'], [A('ي'), A('ا'), A('و')], ['Ya comes last.', 'ইয়া সবার শেষে।'], ALPHA);
  B.c(1, ['Which letter has one dot below?', 'কোন হরফের নিচে একটি নুকতা?'], [A('ب'), A('ت'), A('ث')], ['Ba has one dot below. Ta has two above. Tha has three above.', 'বা-এর নিচে একটি নুকতা। তা-এর ওপরে দুটি। সা-এর ওপরে তিনটি।'], ALPHA);
  B.c(1, ['Which letter has three dots above?', 'কোন হরফের ওপরে তিনটি নুকতা?'], [A('ث'), A('ب'), A('ن')], ['Tha has three dots above.', 'সা-এর ওপরে তিনটি নুকতা।'], ALPHA);
  B.c(1, ['Which letter has no dots?', 'কোন হরফে কোনো নুকতা নেই?'], [A('ح'), A('ج'), A('خ')], ['Ḥa has no dot. Jim has one below. Kha has one above.', 'বড় হা-তে নুকতা নেই। জীমের নিচে একটি। খা-এর ওপরে একটি।'], ALPHA);
  B.c(1, ['Which way is Arabic written?', 'আরবি কোন দিক থেকে লেখা হয়?'], [['Right to left', 'ডান থেকে বামে', 'arrowl'], ['Left to right', 'বাম থেকে ডানে', 'arrowr']], ['Arabic starts on the right and goes to the left.', 'আরবি ডান দিক থেকে শুরু হয়ে বাম দিকে যায়।'], ALPHA);
  B.yn(1, ['Does the letter Alif look like a straight line?', 'আলিফ হরফটি কি সোজা দাগের মতো?'], true, ['Alif is a straight line, standing tall.', 'আলিফ একটি সোজা খাড়া দাগ।'], ALPHA, { ar: 'ا' });
  B.yn(1, ['Is this the letter Mim?', 'এটি কি মীম?'], false, ['This is Nun. It has one dot above.', 'এটি নূন। এর ওপরে একটি নুকতা।'], ALPHA, { ar: 'ن' });
  B.yn(1, ['Is this the letter Lam?', 'এটি কি লাম?'], true, ['Yes, this is Lam.', 'হ্যাঁ, এটি লাম।'], ALPHA, { ar: 'ل' });
  B.order(1, ['Put the first letters in order.', 'প্রথম হরফগুলো ক্রমে সাজাও।'], [A('ا'), A('ب'), A('ت'), A('ث')], ['Alif, Ba, Ta, Tha.', 'আলিফ, বা, তা, সা।'], ALPHA);
  B.order(1, ['Put these letters in order.', 'এই হরফগুলো ক্রমে সাজাও।'], [A('ج'), A('ح'), A('خ')], ['Jim, Ḥa, Kha.', 'জীম, বড় হা, খা।'], ALPHA);
  B.pairs(1, L.slice(0, 27), { kind: 'm1', size: 3, shuffle: false, q: ['Match the letter to its name.', 'হরফের সঙ্গে নাম মেলাও।'], l: function (r) { return A(r[0]); }, r: nm, why: ['Say the name of each letter as you match it.', 'মেলানোর সময় প্রতিটি হরফের নাম বলো।'], ref: ALPHA });

  // ---------- band 2: order, dots, marks, joined shapes ----------
  B.facts(2, L.slice(0, 27), { kind: 'after', q: function (r) { return ['Which letter comes after ' + r[1] + '?', r[2] + '-এর পরে কোন হরফ?']; }, a: function (r) { return A(L[L.indexOf(r) + 1][0]); },
    why: function (r) { var n = L[L.indexOf(r) + 1]; return [r[1] + ', then ' + n[1] + '.', r[2] + ', তারপর ' + n[2] + '।']; }, ref: ALPHA, extra: function (r) { return { ar: r[0] }; } });
  L.filter(function (r) { return r[3] > 0; }).forEach(function (r) {
    B.c(2, ['How many dots does this letter have?', 'এই হরফে কয়টি নুকতা?'], [N(r[3])].concat([1, 2, 3, 0].filter(function (x) { return x !== r[3]; }).slice(0, 2).map(N)), [r[1] + ' has ' + r[3] + (r[3] > 1 ? ' dots ' : ' dot ') + (r[4] === 1 ? 'above.' : 'below.'), r[2] + '-এর ' + (r[4] === 1 ? 'ওপরে ' : 'নিচে ') + bn(r[3]) + 'টি নুকতা।'], ALPHA, { ar: r[0], id: 'al-dots-' + r[1] });
  });
  B.c(2, ['How many letters are in the Arabic alphabet?', 'আরবি বর্ণমালায় কয়টি হরফ?'], [N(28), N(26), N(30), N(50)], ['There are 28 letters.', 'হরফ ২৮টি।'], ALPHA);
  // the short vowel marks
  B.c(2, ['What is the small line above a letter called?', 'হরফের ওপরের ছোট দাগটির নাম কী?'], [['Fathah', 'ফাতহা (যবর)'], ['Kasrah', 'কাসরা (যের)'], ['Dammah', 'দাম্মা (পেশ)'], ['Sukun', 'সুকুন (জযম)']], ['Fathah gives the sound "a".', 'ফাতহা বা যবরে "আ"-এর মতো আওয়াজ হয়।'], MARKS, { ar: 'بَ' });
  B.c(2, ['What is the small line below a letter called?', 'হরফের নিচের ছোট দাগটির নাম কী?'], [['Kasrah', 'কাসরা (যের)'], ['Fathah', 'ফাতহা (যবর)'], ['Dammah', 'দাম্মা (পেশ)'], ['Shaddah', 'শাদ্দা (তাশদীদ)']], ['Kasrah gives the sound "i".', 'কাসরা বা যেরে "ই"-এর মতো আওয়াজ হয়।'], MARKS, { ar: 'بِ' });
  B.c(2, ['What is the small curl above a letter called?', 'হরফের ওপরের ছোট পেঁচানো চিহ্নটির নাম কী?'], [['Dammah', 'দাম্মা (পেশ)'], ['Fathah', 'ফাতহা (যবর)'], ['Kasrah', 'কাসরা (যের)'], ['Sukun', 'সুকুন (জযম)']], ['Dammah gives the sound "u".', 'দাম্মা বা পেশে "উ"-এর মতো আওয়াজ হয়।'], MARKS, { ar: 'بُ' });
  B.c(2, ['What is the small circle above a letter called?', 'হরফের ওপরের ছোট গোল চিহ্নটির নাম কী?'], [['Sukun', 'সুকুন (জযম)'], ['Shaddah', 'শাদ্দা (তাশদীদ)'], ['Dammah', 'দাম্মা (পেশ)'], ['Fathah', 'ফাতহা (যবর)']], ['Sukun means the letter has no vowel after it.', 'সুকুন মানে হরফের পরে কোনো স্বর নেই।'], MARKS, { ar: 'بْ' });
  B.c(2, ['What does the shaddah mark tell you?', 'শাদ্দা (তাশদীদ) চিহ্ন কী বোঝায়?'], [['Say the letter twice', 'হরফটি দুবার উচ্চারণ করো'], ['Stop reading', 'পড়া থামাও'], ['Skip the letter', 'হরফটি বাদ দাও'], ['Read it quietly', 'আস্তে পড়ো']], ['A letter with shaddah is doubled, as in "Rabb".', 'শাদ্দাওয়ালা হরফ দুবার পড়া হয়, যেমন "রব্ব"।'], MARKS, { ar: 'رَبّ' });
  [['بَ', 'ba', 'বা'], ['بِ', 'bi', 'বি'], ['بُ', 'bu', 'বু'], ['تَ', 'ta', 'তা'], ['سِ', 'si', 'সি'], ['مُ', 'mu', 'মু'], ['نَ', 'na', 'না'], ['كِ', 'ki', 'কি'], ['لُ', 'lu', 'লু'], ['دَ', 'da', 'দা'], ['رِ', 'ri', 'রি'], ['قُ', 'qu', 'কু']].forEach(function (r, i, all) {
    var c = r[1].charAt(0), cb = r[2].charAt(0), opts = [['a', 'া'], ['i', 'ি'], ['u', 'ু']].map(function (v) { return [c + v[0], cb + v[1]]; });
    opts.sort(function (x) { return x[0] === r[1] ? -1 : 1; });
    B.c(2, ['How do you read this?', 'এটি কীভাবে পড়বে?'], opts, ['Fathah says "a", kasrah says "i", dammah says "u".', 'যবরে "আ", যেরে "ই", পেশে "উ"।'], MARKS, { ar: r[0], id: 'al-read-' + r[1] });
  });
  // joined shapes
  [['بـ', 'ب'], ['ـبـ', 'ب'], ['جـ', 'ج'], ['ـعـ', 'ع'], ['ـهـ', 'ه'], ['كـ', 'ك'], ['ـمـ', 'م'], ['يـ', 'ي'], ['نـ', 'ن'], ['ـفـ', 'ف'], ['ـقـ', 'ق'], ['سـ', 'س'], ['ـصـ', 'ص'], ['هـ', 'ه'], ['عـ', 'ع'], ['ـلـ', 'ل']].forEach(function (r, i) {
    var right = by(r[1]), wrong = L.filter(function (x) { return x !== right; }).sort(function (a, b) { return Math.abs(L.indexOf(a) - L.indexOf(right)) - Math.abs(L.indexOf(b) - L.indexOf(right)); }).slice(0, 3);
    B.c(i < 8 ? 2 : 3, ['This is a joined shape. Which letter is it?', 'এটি একটি যুক্ত রূপ। এটি কোন হরফ?'], [nm(right)].concat(wrong.map(nm)), ['This is ' + right[1] + ' (' + right[0] + ') when it joins other letters.', 'অন্য হরফের সঙ্গে যুক্ত হলে ' + right[2] + ' (' + right[0] + ') এমন দেখায়।'], ALPHA, { ar: r[0], id: 'al-form-' + i });
  });
  B.yn(2, ['Do Arabic letters change shape when they join in a word?', 'শব্দে যুক্ত হলে কি আরবি হরফের রূপ বদলায়?'], true, ['Most letters have a shape for the start, middle and end of a word.', 'বেশির ভাগ হরফের শব্দের শুরু, মাঝ ও শেষের জন্য আলাদা রূপ আছে।'], ALPHA, { ar: 'بـ ـبـ ـب' });
  B.sort(2, ['Dots above or dots below?', 'নুকতা ওপরে না নিচে?'], [['Above', 'ওপরে'], ['Below', 'নিচে']], [['ت', 'ت', 0], ['ن', 'ن', 0], ['ق', 'ق', 0], ['ب', 'ب', 1], ['ي', 'ي', 1], ['ج', 'ج', 1]], ['Ta, Nun and Qaf have dots above. Ba, Ya and Jim have dots below.', 'তা, নূন ও ক্বাফের নুকতা ওপরে। বা, ইয়া ও জীমের নুকতা নিচে।'], ALPHA);
  B.sort(2, ['Dots or no dots?', 'নুকতা আছে না নেই?'], [['Has dots', 'নুকতা আছে'], ['No dots', 'নুকতা নেই']], [['ش', 'ش', 0], ['ض', 'ض', 0], ['غ', 'غ', 0], ['س', 'س', 1], ['ص', 'ص', 1], ['ع', 'ع', 1]], ['Each dotted letter has a twin without dots.', 'নুকতাওয়ালা প্রতিটি হরফের একটি নুকতাহীন জোড়া আছে।'], ALPHA);
  B.match(2, ['Match each letter to its twin with a dot.', 'প্রতিটি হরফের সঙ্গে তার নুকতাওয়ালা জোড়া মেলাও।'], [[A('د'), A('ذ')], [A('ر'), A('ز')], [A('ص'), A('ض')], [A('ع'), A('غ')]], ['One dot makes a new letter.', 'একটি নুকতা যোগ হলেই নতুন হরফ হয়।'], ALPHA);
  B.match(2, ['Match the mark to its sound.', 'হরকতের সঙ্গে আওয়াজ মেলাও।'], [[A('بَ'), ['a', 'আ']], [A('بِ'), ['i', 'ই']], [A('بُ'), ['u', 'উ']]], ['Fathah, kasrah, dammah.', 'যবর, যের, পেশ।'], MARKS);

  // ---------- band 3: reading words ----------
  [['كِتَاب', 'kitab', 'কিতাব', ['katab', 'কাতাব'], ['kutub', 'কুতুব']], ['قَلَم', 'qalam', 'কলম', ['qalim', 'কলিম'], ['qulum', 'কুলুম']], ['بَيْت', 'bayt', 'বাইত', ['bit', 'বিত'], ['but', 'বুত']],
    ['نُور', 'nur', 'নূর', ['nar', 'নার'], ['nir', 'নীর']], ['نَار', 'nar', 'নার', ['nur', 'নূর'], ['nir', 'নীর']], ['رَبّ', 'rabb', 'রব্ব', ['rub', 'রুব'], ['rib', 'রিব']],
    ['عِلْم', 'ilm', 'ইলম', ['alam', 'আলাম'], ['ulum', 'উলুম']], ['يَوْم', 'yawm', 'ইয়াওম', ['yam', 'ইয়াম'], ['yum', 'ইয়ুম']], ['صَبْر', 'sabr', 'সবর', ['sibr', 'সিবর'], ['subur', 'সুবুর']], ['شَمْس', 'shams', 'শামস', ['shims', 'শিমস'], ['shumus', 'শুমুস']]].forEach(function (r) {
    B.c(3, ['How do you read this word?', 'শব্দটি কীভাবে পড়বে?'], [[r[1], r[2]], r[3], r[4]], ['Read each letter with its mark: ' + r[1] + '.', 'প্রতিটি হরফ তার হরকতসহ পড়ো: ' + r[2] + '।'], MARKS, { ar: r[0], id: 'al-word-' + r[1] });
  });
  [['كِتَاب', 'ك'], ['قَلَم', 'ق'], ['مَسْجِد', 'م'], ['صَلَاة', 'ص'], ['رَسُول', 'ر'], ['جَنَّة', 'ج'], ['شَمْس', 'ش'], ['نُور', 'ن']].forEach(function (r) {
    var right = by(r[1]), others = L.filter(function (x) { return x !== right && r[0].indexOf(x[0]) < 0; }).slice(L.indexOf(right) % 5, L.indexOf(right) % 5 + 3);
    B.c(3, ['Which letter does this word begin with?', 'শব্দটি কোন হরফ দিয়ে শুরু?'], [nm(right)].concat(others.map(nm)), ['The first letter is on the right: ' + right[1] + '.', 'প্রথম হরফটি ডান দিকে: ' + right[2] + '।'], ALPHA, { ar: r[0], id: 'al-first-' + r[1] });
  });
  [['كِتَاب', 4], ['قَلَم', 3], ['مَسْجِد', 4], ['رَسُول', 4], ['بَيْت', 3]].forEach(function (r) {
    B.c(3, ['How many letters are in this word?', 'এই শব্দে কয়টি হরফ?'], [N(r[1]), N(r[1] + 1), N(r[1] - 1), N(r[1] + 2)], ['Count from the right: ' + r[1] + ' letters.', 'ডান দিক থেকে গোনো: ' + bn(r[1]) + 'টি হরফ।'], ALPHA, { ar: r[0], id: 'al-count-' + r[0] });
  });
  B.c(3, ['Six letters never join to the letter after them. Which group is it?', 'ছয়টি হরফ পরের হরফের সঙ্গে যুক্ত হয় না। সেগুলো কোনগুলো?'], [A('ا د ذ ر ز و'), A('ب ت ث ن ي ف'), A('ج ح خ ع غ ه'), A('س ش ص ض ط ظ')], ['Alif, Dal, Dhal, Ra, Zay and Waw join only to the letter before.', 'আলিফ, দাল, যাল, রা, যা ও ওয়াও শুধু আগের হরফের সঙ্গে যুক্ত হয়।'], ALPHA);
  B.c(3, ['Which three letters can stretch a vowel sound (the long vowels)?', 'কোন তিনটি হরফ স্বরকে টেনে লম্বা করে (মাদ্দের হরফ)?'], [A('ا و ي'), A('ب ت ث'), A('ق ك ل'), A('د ذ ر')], ['Alif, Waw and Ya make long a, long u and long i.', 'আলিফ, ওয়াও ও ইয়া দিয়ে দীর্ঘ আ, দীর্ঘ উ ও দীর্ঘ ই হয়।'], MARKS);
  B.c(3, ['What does tanwin (two marks together) add to the end of a word?', 'তানবীন (দুটি হরকত একসঙ্গে) শব্দের শেষে কী যোগ করে?'], [['An "n" sound', '"ন"-এর আওয়াজ'], ['A long "a"', 'দীর্ঘ "আ"'], ['A stop', 'বিরতি'], ['Nothing', 'কিছুই না']], ['"Kitabun", "kitabin", "kitaban": each ends with an n sound.', '"কিতাবুন", "কিতাবিন", "কিতাবান": প্রতিটির শেষে ন-এর আওয়াজ।'], MARKS, { ar: 'كِتَابٌ' });
  B.c(3, ['How is this read?', 'এটি কীভাবে পড়বে?'], [['ban', 'বান'], ['ba', 'বা'], ['bin', 'বিন'], ['bun', 'বুন']], ['Two fathahs make "an".', 'দুই যবরে "আন"।'], MARKS, { ar: 'بًا', id: 'al-tan-a' });
  B.c(3, ['How is this read?', 'এটি কীভাবে পড়বে?'], [['bun', 'বুন'], ['bu', 'বু'], ['bin', 'বিন'], ['ban', 'বান']], ['Two dammahs make "un".', 'দুই পেশে "উন"।'], MARKS, { ar: 'بٌ', id: 'al-tan-u' });
  B.c(3, ['Surah Al-Baqarah begins with three letters. Which ones?', 'সূরা আল-বাকারা তিনটি হরফ দিয়ে শুরু। সেগুলো কী?'], [['Alif, Lam, Mim', 'আলিফ, লাম, মীম'], ['Ya, Sin', 'ইয়া, সীন'], ['Ta, Ha', 'তোয়া, হা'], ['Kaf, Ha, Ya', 'কাফ, হা, ইয়া']], ['"Alif, Lam, Mim."', '"আলিফ লাম মীম।"'], 'Quran 2:1', { ar: 'الٓمٓ' });
  B.c(3, ['Which surah begins with the single letter Qaf?', 'কোন সূরা শুধু ক্বাফ হরফ দিয়ে শুরু?'], [['Surah Qaf (50)', 'সূরা ক্বাফ (৫০)'], ['Surah Ya-Sin (36)', 'সূরা ইয়াসিন (৩৬)'], ['Surah Al-Qalam (68)', 'সূরা আল-কলম (৬৮)'], ['Surah Sad (38)', 'সূরা সোয়াদ (৩৮)']], ['"Qaf. By the honoured Quran."', '"ক্বাফ। শপথ সম্মানিত কুরআনের।"'], 'Quran 50:1', { ar: 'قٓ' });
  B.c(3, ['Which letter begins Surah Al-Qalam?', 'সূরা আল-কলম কোন হরফ দিয়ে শুরু?'], [nm(by('ن')), nm(by('ق')), nm(by('ص')), nm(by('ي'))], ['"Nun. By the pen and what they inscribe."', '"নূন। শপথ কলমের এবং তারা যা লেখে তার।"'], 'Quran 68:1', { ar: 'نٓ' });
  B.yn(3, ['Does Arabic have capital letters?', 'আরবিতে কি বড় হাতের অক্ষর আছে?'], false, ['No. A letter changes shape by its place in the word, not by size.', 'না। হরফের রূপ বদলায় শব্দে তার অবস্থান অনুযায়ী, ছোট-বড় হিসেবে নয়।'], ALPHA);
  B.yn(3, ['Is the Quran in the Arabic language?', 'কুরআন কি আরবি ভাষায়?'], true, ['"Indeed, We have sent it down as an Arabic Quran that you might understand."', '"নিশ্চয়ই আমি একে আরবি কুরআন হিসেবে নাজিল করেছি, যাতে তোমরা বোঝো।"'], 'Quran 12:2');
  B.sort(3, ['Does it join to the next letter?', 'এটি কি পরের হরফের সঙ্গে যুক্ত হয়?'], [['Joins', 'যুক্ত হয়'], ['Does not join', 'যুক্ত হয় না']], [['ب', 'ب', 0], ['س', 'س', 0], ['م', 'م', 0], ['ا', 'ا', 1], ['د', 'د', 1], ['و', 'و', 1]], ['Alif, Dal and Waw never reach forward to the next letter.', 'আলিফ, দাল ও ওয়াও কখনো পরের হরফের সঙ্গে যুক্ত হয় না।'], ALPHA);
  B.order(3, ['Put the letters in order to spell "kitab" (book), starting from the right.', '"কিতাব" বানানের হরফগুলো ডান দিক থেকে ক্রমে সাজাও।'], [A('ك'), A('ت'), A('ا'), A('ب')], ['Kaf, Ta, Alif, Ba.', 'কাফ, তা, আলিফ, বা।'], ALPHA, { ar: 'كِتَاب' });
  B.order(3, ['Put the letters in order to spell "qalam" (pen), starting from the right.', '"কলম" বানানের হরফগুলো ডান দিক থেকে ক্রমে সাজাও।'], [A('ق'), A('ل'), A('م')], ['Qaf, Lam, Mim.', 'ক্বাফ, লাম, মীম।'], ALPHA, { ar: 'قَلَم' });
  B.order(3, ['Put these letters in alphabet order.', 'হরফগুলো বর্ণমালার ক্রমে সাজাও।'], [A('ك'), A('ل'), A('م'), A('ن')], ['Kaf, Lam, Mim, Nun.', 'কাফ, লাম, মীম, নূন।'], ALPHA);
  B.match(3, ['Match the mark to its name.', 'চিহ্নের সঙ্গে নাম মেলাও।'], [[A('بَ'), ['Fathah', 'ফাতহা (যবর)']], [A('بِ'), ['Kasrah', 'কাসরা (যের)']], [A('بْ'), ['Sukun', 'সুকুন (জযম)']], [A('بّ'), ['Shaddah', 'শাদ্দা (তাশদীদ)']]], ['Four marks every reader of the Quran knows.', 'কুরআনের প্রত্যেক পাঠক এই চার চিহ্ন চেনে।'], MARKS);

  KQ.define('arabic-letters', { bank: B.list });
})();
