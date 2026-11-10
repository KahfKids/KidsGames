/* Think It Through: data.js
   Patterns, odd one out, "this is to that" pairs and small logic puzzles. Number patterns and balance puzzles are
   made fresh each time; the picture and word puzzles come from the written bank.
   band: 1 = ages 4-6, 2 = ages 7-9, 3 = ages 10-12. */
(function () {
  'use strict';
  var KQ = window.KahfQuiz, pick = KQ.pick, shuffle = KQ.shuffle, B = KQ.bank('th');
  var BN = '০১২৩৪৫৬৭৮৯';
  function bn(x) { return String(x).replace(/\d/g, function (d) { return BN[d]; }); }
  function t(en, b) { return { en: en, bn: b }; }
  function N(x) { return { t: t(String(x), bn(x)) }; }
  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function P(en, b, p) { return [en, b, p]; }
  function choice(q, right, wrong, why, extra) {
    var o = { type: 'choice', q: q, a: [right].concat(wrong), correct: 0, why: why };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }
  function near(r, n, spread) {
    var out = [], tries = 0;
    while (out.length < n && tries++ < 200) { var v = r + ri(1, spread) * (Math.random() < 0.5 ? -1 : 1); if (v >= 0 && v !== r && out.indexOf(v) < 0) out.push(v); }
    return out;
  }
  function seqQ(list, right, whyEn, whyBn, spread) {
    var s = list.join(', '), b = list.map(bn).join(', ');
    return choice(t('What comes next?  ' + s + ', ?', 'এরপর কী আসবে?  ' + b + ', ?'), N(right), near(right, 3, spread || 3).map(N), t(whyEn, whyBn));
  }
  var PICS = [['Sun', 'সূর্য', 'sun'], ['Moon', 'চাঁদ', 'moon'], ['Star', 'তারা', 'star'], ['Apple', 'আপেল', 'apple'], ['Fish', 'মাছ', 'fish'], ['Leaf', 'পাতা', 'leaf'], ['Ball', 'বল', 'ball'], ['Bee', 'মৌমাছি', 'bee'], ['Book', 'বই', 'book'], ['Key', 'চাবি', 'key']];
  function po(x) { return { t: t(x[0], x[1]), p: x[2] }; }

  var G = { 1: {}, 2: {}, 3: {} };
  G[1].ab = function (lv) {
    var s = shuffle(PICS).slice(0, 3), a = s[0], b = s[1], c = s[2], kind = lv < 0.5 ? 0 : ri(0, 2);
    var row = kind === 0 ? [a, b, a, b, a] : kind === 1 ? [a, a, b, a, a] : [a, b, c, a, b], right = kind === 0 ? b : kind === 1 ? b : c, wrong = kind === 2 ? [a, b] : [a, c];
    return choice(t('What comes next?  ' + row.map(function (x) { return x[0]; }).join(', ') + ', ?', 'এরপর কী আসবে?  ' + row.map(function (x) { return x[1]; }).join(', ') + ', ?'), po(right), wrong.map(po),
      t('The pattern repeats. Say it aloud and you will hear it.', 'প্যাটার্নটি বারবার ফিরে আসে। জোরে পড়লে ধরা পড়বে।'));
  };
  G[1].count = function (lv) {
    var step = lv < 0.5 ? 1 : pick([1, 2, 2, 5, 10]), a = step === 1 ? ri(1, 12) : step === 2 ? ri(1, 4) * 2 : step, l = [a, a + step, a + 2 * step, a + 3 * step];
    return seqQ(l, a + 4 * step, 'Each number is ' + step + ' more than the one before.', 'প্রতিটি সংখ্যা আগেরটির চেয়ে ' + bn(step) + ' বেশি।', Math.max(2, step));
  };
  G[1].back = function () { var a = ri(6, 12), l = [a, a - 1, a - 2, a - 3]; return seqQ(l, a - 4, 'The numbers go down by 1 each time.', 'সংখ্যা প্রতিবার ১ করে কমছে।', 2); };
  G[1].big = function () {
    var s = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).slice(0, 3).sort(function (a, b) { return b - a; }), small = Math.random() < 0.5;
    return choice(small ? t('Which shows the fewest?', 'কোনটিতে সবচেয়ে কম?') : t('Which shows the most?', 'কোনটিতে সবচেয়ে বেশি?'), { p: 'dots-' + (small ? s[2] : s[0]) }, [{ p: 'dots-' + s[1] }, { p: 'dots-' + (small ? s[0] : s[2]) }],
      t('Count the dots in each one.', 'প্রতিটির ফোঁটা গুনে দেখো।'));
  };
  G[2].step = function (lv) {
    var step = ri(3, lv < 0.5 ? 6 : 12), down = Math.random() < 0.35, a = down ? step * 5 + ri(1, 9) : ri(1, 20), l = [0, 1, 2, 3].map(function (i) { return a + (down ? -1 : 1) * i * step; }), r = a + (down ? -4 : 4) * step;
    return seqQ(l, r, down ? 'Each number is ' + step + ' less than the one before.' : 'Each number is ' + step + ' more than the one before.', down ? 'প্রতিটি সংখ্যা আগেরটির চেয়ে ' + bn(step) + ' কম।' : 'প্রতিটি সংখ্যা আগেরটির চেয়ে ' + bn(step) + ' বেশি।', step);
  };
  G[2].dbl = function () { var a = ri(1, 5), l = [a, a * 2, a * 4, a * 8]; return seqQ(l, a * 16, 'Each number is double the one before.', 'প্রতিটি সংখ্যা আগেরটির দ্বিগুণ।', a * 4); };
  G[2].missing = function () {
    var step = ri(2, 9), a = ri(1, 15), l = [0, 1, 2, 3, 4].map(function (i) { return a + i * step; }), k = ri(1, 3), r = l[k], show = l.map(function (x, i) { return i === k ? '?' : x; });
    return choice(t('Which number is missing?  ' + show.join(', '), 'কোন সংখ্যাটি নেই?  ' + show.map(bn).join(', ')), N(r), near(r, 3, step).map(N), t('The numbers go up by ' + step + ' each time.', 'সংখ্যা প্রতিবার ' + bn(step) + ' করে বাড়ছে।'));
  };
  G[2].odd = function () {
    var k = pick([2, 5, 10, 3]), set = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3).map(function (x) { return x * k; }), r = pick(set) + (k === 2 ? 1 : pick([1, 2].filter(function (d) { return d % k; })));
    if (set.indexOf(r) >= 0 || r % k === 0) r = set[0] + 1;
    return choice(t('Which number does not belong with the others?', 'কোন সংখ্যাটি বাকিদের দলে পড়ে না?'), N(r), set.map(N), t('The others are all in the ' + k + ' times table.', 'বাকিগুলো সব ' + bn(k) + '-এর ঘরের নামতায় আছে।'));
  };
  G[2].box = function () {
    var a = ri(2, 15), b = ri(2, 15), r = b;
    return choice(t('What number is hiding?   ' + a + ' + ▢ = ' + (a + b), 'কোন সংখ্যা লুকিয়ে আছে?   ' + bn(a) + ' + ▢ = ' + bn(a + b)), N(r), near(r, 3, 3).map(N), t((a + b) + ' − ' + a + ' = ' + b + '.', bn(a + b) + ' − ' + bn(a) + ' = ' + bn(b) + '।'));
  };
  G[3].grow = function () { var a = ri(1, 9), d = ri(1, 3), l = [a], s = d; for (var i = 0; i < 4; i++) { l.push(l[i] + s); s += d; } var r = l.pop(); return seqQ(l, r, 'The jump grows each time: the gaps are ' + [d, 2 * d, 3 * d, 4 * d].join(', ') + '.', 'লাফ প্রতিবার বাড়ছে: ব্যবধান ' + [d, 2 * d, 3 * d, 4 * d].map(bn).join(', ') + '।', 4); };
  G[3].square = function () { var a = ri(1, 5), l = [a, a + 1, a + 2, a + 3].map(function (x) { return x * x; }), r = (a + 4) * (a + 4); return seqQ(l, r, 'These are square numbers: ' + (a + 4) + ' × ' + (a + 4) + ' = ' + r + '.', 'এগুলো বর্গসংখ্যা: ' + bn(a + 4) + ' × ' + bn(a + 4) + ' = ' + bn(r) + '।', 6); };
  G[3].fib = function () { var a = ri(1, 4), b = ri(1, 5), l = [a, b]; for (var i = 2; i < 6; i++) l.push(l[i - 1] + l[i - 2]); var r = l.pop(); return seqQ(l, r, 'Each number is the sum of the two before it.', 'প্রতিটি সংখ্যা আগের দুটির যোগফল।', 4); };
  G[3].times = function () { var k = pick([3, 4, 5]), a = ri(1, 3), l = [a, a * k, a * k * k, a * k * k * k], r = l[3] * k; return seqQ(l, r, 'Each number is ' + k + ' times the one before.', 'প্রতিটি সংখ্যা আগেরটির ' + bn(k) + ' গুণ।', r / 5 | 0); };
  G[3].two = function () { var a = ri(1, 9), b = ri(20, 40), p = ri(2, 4), m = ri(2, 5), l = [a, b, a + p, b - m, a + 2 * p, b - 2 * m], r = a + 3 * p; return seqQ(l, r, 'Two patterns take turns: one goes up by ' + p + ', the other goes down by ' + m + '.', 'দুটি প্যাটার্ন পালা করে চলছে: একটি ' + bn(p) + ' করে বাড়ে, অন্যটি ' + bn(m) + ' করে কমে।', 4); };
  G[3].balance = function () {
    var x = ri(2, 12), k = ri(2, 6), c = ri(1, 15), tot = k * x + c;
    return choice(t('Every ▢ is the same number.   ' + k + ' × ▢ + ' + c + ' = ' + tot + '.   What is ▢?', 'প্রতিটি ▢ একই সংখ্যা।   ' + bn(k) + ' × ▢ + ' + bn(c) + ' = ' + bn(tot) + '।   ▢ কত?'), N(x), near(x, 3, 3).map(N),
      t('Take away ' + c + ' to get ' + (tot - c) + ', then divide by ' + k + ': ' + x + '.', bn(c) + ' বাদ দিলে ' + bn(tot - c) + ', তারপর ' + bn(k) + ' দিয়ে ভাগ: ' + bn(x) + '।'));
  };
  G[3].ages = function () {
    var y = ri(5, 12), d = ri(2, 6), nm = pick([['Amina', 'আমিনা', 'Yusuf', 'ইউসুফ'], ['Bilal', 'বিলাল', 'Maryam', 'মারিয়াম'], ['Hamza', 'হামজা', 'Fatima', 'ফাতিমা']]), r = 2 * y + d;
    return choice(t(nm[0] + ' is ' + d + ' years older than ' + nm[2] + '. ' + nm[2] + ' is ' + y + '. What do their ages add up to?', nm[1] + ' ' + nm[3] + '-এর চেয়ে ' + bn(d) + ' বছরের বড়। ' + nm[3] + '-এর বয়স ' + bn(y) + '। দুজনের বয়সের যোগফল কত?'), N(r), near(r, 3, 4).map(N),
      t(nm[0] + ' is ' + (y + d) + '. ' + (y + d) + ' + ' + y + ' = ' + r + '.', nm[1] + '-এর বয়স ' + bn(y + d) + '। ' + bn(y + d) + ' + ' + bn(y) + ' = ' + bn(r) + '।'));
  };
  function gen(band, n, ctx) {
    var set = G[band], lv = Math.min(1, ((ctx && ctx.stop) || 8) / 15), out = [], bag = [], tries = 0;
    while (out.length < n && tries++ < 300) {
      if (!bag.length) bag = shuffle(Object.keys(set));
      var q = set[bag.pop()](lv), seen = {}, ok = q.a.length >= 3;
      q.a.forEach(function (a) { var k = a.t ? a.t.en : a.p; if (seen[k]) ok = false; seen[k] = 1; });
      if (ok) out.push(q);
    }
    return out;
  }

  // ---------- the written bank ----------
  // odd one out: [right (odd), others..., why, কেন]
  function odd(band, right, rest, why) { B.c(band, ['Which one does not belong?', 'কোনটি দলের বাইরে?'], [right].concat(rest), why); }
  odd(1, P('Fish', 'মাছ', 'fish'), [P('Apple', 'আপেল', 'apple'), P('Banana', 'কলা', 'banana'), P('Dates', 'খেজুর', 'dates')], ['The others are fruit.', 'বাকিগুলো ফল।']);
  odd(1, P('Ball', 'বল', 'ball'), [P('Cat', 'বিড়াল', 'cat'), P('Cow', 'গরু', 'cow'), P('Sheep', 'ভেড়া', 'sheep')], ['The others are animals.', 'বাকিগুলো প্রাণী।']);
  odd(1, P('Shoe', 'জুতা', 'shoe'), [P('Sun', 'সূর্য', 'sun'), P('Moon', 'চাঁদ', 'moon'), P('Star', 'তারা', 'star')], ['The others are in the sky.', 'বাকিগুলো আকাশে থাকে।']);
  odd(1, P('Triangle', 'ত্রিভুজ', 'triangle'), [P('Circle', 'বৃত্ত', 'circle'), P('Ball', 'বল', 'ball'), P('Wheel', 'চাকা', 'wheel')], ['The others are round.', 'বাকিগুলো গোল।']);
  odd(1, P('Bread', 'রুটি', 'bread'), [P('Pen', 'কলম', 'pen'), P('Pencil', 'পেনসিল', 'pencil'), P('Book', 'বই', 'book')], ['The others are for school work.', 'বাকিগুলো পড়ালেখার জিনিস।']);
  odd(1, P('Turtle', 'কচ্ছপ', 'turtle'), [P('Bird', 'পাখি', 'bird'), P('Bee', 'মৌমাছি', 'bee'), P('Plane', 'উড়োজাহাজ', 'plane')], ['The others fly.', 'বাকিগুলো ওড়ে।']);
  odd(1, P('Fire', 'আগুন', 'fire'), [P('Ice', 'বরফ', 'ice'), P('Snow', 'তুষার', 'snow'), P('Rain', 'বৃষ্টি', 'rain')], ['The others are water in some form. Fire is hot.', 'বাকিগুলো পানিরই রূপ। আগুন গরম।']);
  odd(1, P('Bed', 'বিছানা', 'bed'), [P('Car', 'গাড়ি', 'car'), P('Bicycle', 'সাইকেল', 'bicycle'), P('Ship', 'জাহাজ', 'ship')], ['The others take us places.', 'বাকিগুলোতে চড়ে যাওয়া যায়।']);
  B.c(1, ['A bird has wings. A fish has...', 'পাখির আছে ডানা। মাছের আছে...'], [['fins', 'পাখনা'], ['legs', 'পা'], ['hands', 'হাত']], ['Wings are for flying. Fins are for swimming.', 'ডানা ওড়ার জন্য। পাখনা সাঁতারের জন্য।'], null, { qp: 'fish' });
  B.c(1, ['Day goes with sun. Night goes with...', 'দিনের সঙ্গে সূর্য। রাতের সঙ্গে...'], [P('Moon', 'চাঁদ', 'moon'), P('Rainbow', 'রংধনু', 'rainbow'), P('Tree', 'গাছ', 'tree')], ['We see the moon at night.', 'রাতে চাঁদ দেখা যায়।']);
  B.c(1, ['A key opens a...', 'চাবি দিয়ে খোলে...'], [P('Lock', 'তালা', 'lock'), P('Cup', 'কাপ', 'cup'), P('Leaf', 'পাতা', 'leaf')], ['A key and a lock work together.', 'চাবি ও তালা একসঙ্গে কাজ করে।'], null, { qp: 'key' });
  B.c(1, ['Which one is the heaviest?', 'কোনটি সবচেয়ে ভারী?'], [P('Elephant', 'হাতি', 'elephant'), P('Cat', 'বিড়াল', 'cat'), P('Ant', 'পিঁপড়া', 'ant')], ['An elephant weighs more than thousands of cats.', 'একটি হাতির ওজন হাজার হাজার বিড়ালের চেয়ে বেশি।']);
  B.c(1, ['Which one is the lightest?', 'কোনটি সবচেয়ে হালকা?'], [P('Leaf', 'পাতা', 'leaf'), P('Rock', 'পাথর', 'rock'), P('Table', 'টেবিল', 'table')], ['A leaf is so light the wind can lift it.', 'পাতা এত হালকা যে বাতাসে উড়ে যায়।']);
  B.yn(1, ['Amina is taller than Bilal. Is Bilal shorter than Amina?', 'আমিনা বিলালের চেয়ে লম্বা। বিলাল কি আমিনার চেয়ে খাটো?'], true, ['Yes. If one is taller, the other is shorter.', 'হ্যাঁ। একজন লম্বা হলে অন্যজন খাটো।']);
  B.yn(1, ['A square has 4 sides. Does a triangle have 4 sides too?', 'বর্গের ৪টি বাহু। ত্রিভুজেরও কি ৪টি বাহু?'], false, ['No. A triangle has 3 sides.', 'না। ত্রিভুজের ৩টি বাহু।'], null, { qp: 'triangle' });
  B.sort(1, ['Round or not round?', 'গোল না গোল নয়?'], [['Round', 'গোল'], ['Not round', 'গোল নয়']], [['Ball', 'বল', 0, 'ball'], ['Wheel', 'চাকা', 0, 'wheel'], ['Coin', 'পয়সা', 0, 'coin'], ['Book', 'বই', 1, 'book'], ['Door', 'দরজা', 1, 'door'], ['Triangle', 'ত্রিভুজ', 1, 'triangle']], ['Look at the edge. Round things have no corners.', 'কিনারা দেখো। গোল জিনিসের কোণ নেই।']);
  B.order(1, ['Smallest to biggest.', 'ছোট থেকে বড় সাজাও।'], [P('Ant', 'পিঁপড়া', 'ant'), P('Cat', 'বিড়াল', 'cat'), P('Cow', 'গরু', 'cow'), P('Elephant', 'হাতি', 'elephant')], ['Ant, cat, cow, elephant.', 'পিঁপড়া, বিড়াল, গরু, হাতি।']);
  B.match(1, ['Match the things that go together.', 'যা একসঙ্গে চলে তা মেলাও।'], [[P('Key', 'চাবি', 'key'), P('Lock', 'তালা', 'lock')], [P('Pen', 'কলম', 'pen'), P('Paper', 'কাগজ', 'paper')], [P('Foot', 'পা', 'foot'), P('Shoe', 'জুতা', 'shoe')]], ['Each pair is used together.', 'প্রতিটি জোড়া একসঙ্গে কাজে লাগে।']);

  odd(2, ['Carrot', 'গাজর'], [['Mango', 'আম'], ['Banana', 'কলা'], ['Guava', 'পেয়ারা']], ['The others are fruit. A carrot is a vegetable.', 'বাকিগুলো ফল। গাজর সবজি।']);
  odd(2, ['Whale', 'তিমি'], [['Crow', 'কাক'], ['Duck', 'হাঁস'], ['Penguin', 'পেঙ্গুইন']], ['The others are birds.', 'বাকিগুলো পাখি।']);
  odd(2, ['River', 'নদী'], [['Monday', 'সোমবার'], ['Friday', 'শুক্রবার'], ['Sunday', 'রবিবার']], ['The others are days of the week.', 'বাকিগুলো সপ্তাহের দিন।']);
  odd(2, ['Circle', 'বৃত্ত'], [['Square', 'বর্গ'], ['Triangle', 'ত্রিভুজ'], ['Rectangle', 'আয়ত']], ['The others have straight sides and corners.', 'বাকিগুলোর সোজা বাহু ও কোণ আছে।']);
  odd(2, ['Spider', 'মাকড়সা'], [['Ant', 'পিঁপড়া'], ['Bee', 'মৌমাছি'], ['Butterfly', 'প্রজাপতি']], ['The others are insects with six legs.', 'বাকিগুলো ছয় পায়ের পতঙ্গ।']);
  odd(2, ['Moon', 'চাঁদ'], [['Earth', 'পৃথিবী'], ['Mars', 'মঙ্গল'], ['Saturn', 'শনি']], ['The others are planets.', 'বাকিগুলো গ্রহ।']);
  B.c(2, ['Hand is to glove as foot is to...', 'হাতের জন্য যেমন দস্তানা, পায়ের জন্য তেমন...'], [['sock', 'মোজা'], ['hat', 'টুপি'], ['belt', 'বেল্ট'], ['ring', 'আংটি']], ['A glove covers a hand. A sock covers a foot.', 'দস্তানা হাত ঢাকে। মোজা পা ঢাকে।']);
  B.c(2, ['Hot is to cold as day is to...', 'গরমের বিপরীত যেমন ঠান্ডা, দিনের বিপরীত তেমন...'], [['night', 'রাত'], ['sun', 'সূর্য'], ['noon', 'দুপুর'], ['light', 'আলো']], ['They are opposites.', 'এরা বিপরীত।']);
  B.c(2, ['Seed is to tree as egg is to...', 'বীজ থেকে যেমন গাছ, ডিম থেকে তেমন...'], [['bird', 'পাখি'], ['nest', 'বাসা'], ['leaf', 'পাতা'], ['milk', 'দুধ']], ['A seed grows into a tree. An egg hatches into a bird.', 'বীজ থেকে গাছ হয়। ডিম ফুটে পাখি হয়।']);
  B.c(2, ['Book is to read as pen is to...', 'বই যেমন পড়ার জন্য, কলম তেমন...'], [['write', 'লেখার জন্য'], ['eat', 'খাওয়ার জন্য'], ['run', 'দৌড়ানোর জন্য'], ['sleep', 'ঘুমানোর জন্য']], ['We read a book and write with a pen.', 'আমরা বই পড়ি, কলম দিয়ে লিখি।']);
  B.c(2, ['Yusuf is older than Maryam. Maryam is older than Hamza. Who is the youngest?', 'ইউসুফ মারিয়ামের বড়। মারিয়াম হামজার বড়। সবচেয়ে ছোট কে?'], [['Hamza', 'হামজা'], ['Maryam', 'মারিয়াম'], ['Yusuf', 'ইউসুফ']], ['Yusuf, then Maryam, then Hamza.', 'ইউসুফ, তারপর মারিয়াম, তারপর হামজা।']);
  B.c(2, ['I have hands but cannot clap. I have a face but no eyes. What am I?', 'আমার কাঁটা আছে, কিন্তু ফুটি না। সংখ্যা আছে, কিন্তু গুনি না। আমি কে?'], [P('A clock', 'ঘড়ি', 'clock'), P('A tree', 'গাছ', 'tree'), P('A book', 'বই', 'book'), P('A door', 'দরজা', 'door')], ['A clock has hands and a face.', 'ঘড়ির কাঁটা ও সংখ্যা আছে।']);
  B.c(2, ['The more you take from me, the bigger I get. What am I?', 'আমার থেকে যত নাও, আমি তত বড় হই। আমি কে?'], [['A hole', 'গর্ত'], ['A cake', 'কেক'], ['A river', 'নদী'], ['A candle', 'মোমবাতি']], ['Digging takes soil out and makes the hole bigger.', 'মাটি যত তোলা হয়, গর্ত তত বড় হয়।']);
  B.c(2, ['There are 5 apples. You take away 2. How many do YOU have?', '৫টি আপেল আছে। তুমি ২টি নিয়ে নিলে। তোমার কাছে কয়টি?'], [N(2), N(3), N(5), N(7)], ['You took 2, so you have 2. Read the question carefully.', 'তুমি ২টি নিয়েছ, তাই তোমার কাছে ২টি। প্রশ্নটি মন দিয়ে পড়ো।'], null, { qp: 'many-apple-5' });
  B.c(2, ['Which shape has the most sides?', 'কোন আকৃতির বাহু সবচেয়ে বেশি?'], [P('Hexagon', 'ষড়ভুজ', 'hexagon'), P('Square', 'বর্গ', 'square'), P('Triangle', 'ত্রিভুজ', 'triangle'), P('Rectangle', 'আয়ত', 'rectangle')], ['A hexagon has 6 sides.', 'ষড়ভুজের ৬টি বাহু।']);
  B.yn(2, ['All cats are animals. Tom is a cat. Is Tom an animal?', 'সব বিড়ালই প্রাণী। টম একটি বিড়াল। টম কি প্রাণী?'], true, ['Yes. What is true of all cats is true of Tom.', 'হ্যাঁ। সব বিড়ালের জন্য যা সত্য, টমের জন্যও তা সত্য।'], null, { qp: 'cat' });
  B.yn(2, ['All birds have feathers. A bat has no feathers. Is a bat a bird?', 'সব পাখির পালক আছে। বাদুড়ের পালক নেই। বাদুড় কি পাখি?'], false, ['No. If it has no feathers it cannot be a bird.', 'না। পালক না থাকলে সে পাখি হতে পারে না।']);
  B.sort(2, ['Odd or even?', 'বিজোড় না জোড়?'], [['Odd', 'বিজোড়'], ['Even', 'জোড়']], [['7', '৭', 0], ['13', '১৩', 0], ['21', '২১', 0], ['8', '৮', 1], ['16', '১৬', 1], ['30', '৩০', 1]], ['Even numbers end in 0, 2, 4, 6 or 8.', 'জোড় সংখ্যার শেষে ০, ২, ৪, ৬ বা ৮ থাকে।']);
  B.order(2, ['Put the story in order.', 'ঘটনাগুলো ক্রমে সাজাও।'], [['Plant the seed', 'বীজ বোনা'], ['Water it', 'পানি দেওয়া'], ['The plant grows', 'গাছ বড় হওয়া'], ['Pick the fruit', 'ফল তোলা']], ['Each step must happen before the next can.', 'প্রতিটি ধাপ আগেরটির পরে আসে।']);
  B.match(2, ['Match each word to its opposite.', 'প্রতিটি শব্দের সঙ্গে বিপরীত শব্দ মেলাও।'], [[['Full', 'ভরা'], ['Empty', 'খালি']], [['Early', 'আগে'], ['Late', 'দেরিতে']], [['Heavy', 'ভারী'], ['Light', 'হালকা']], [['Near', 'কাছে'], ['Far', 'দূরে']]], ['Opposites sit at two ends.', 'বিপরীত শব্দ দুই প্রান্তে থাকে।']);

  odd(3, ['9', '৯'], [['2', '২'], ['5', '৫'], ['11', '১১']], ['The others are prime numbers. 9 = 3 × 3.', 'বাকিগুলো মৌলিক সংখ্যা। ৯ = ৩ × ৩।']);
  odd(3, ['27', '২৭'], [['16', '১৬'], ['25', '২৫'], ['36', '৩৬']], ['The others are square numbers.', 'বাকিগুলো বর্গসংখ্যা।']);
  odd(3, ['Triangle', 'ত্রিভুজ'], [['Cube', 'ঘনক'], ['Sphere', 'গোলক'], ['Cone', 'শঙ্কু']], ['The others are solid shapes. A triangle is flat.', 'বাকিগুলো ঘনবস্তু। ত্রিভুজ সমতল।']);
  odd(3, ['Copper', 'তামা'], [['Oxygen', 'অক্সিজেন'], ['Nitrogen', 'নাইট্রোজেন'], ['Steam', 'বাষ্প']], ['The others are gases.', 'বাকিগুলো গ্যাস।']);
  odd(3, ['Thermometer', 'থার্মোমিটার'], [['Metre', 'মিটার'], ['Kilogram', 'কিলোগ্রাম'], ['Litre', 'লিটার']], ['The others are units. A thermometer is a tool.', 'বাকিগুলো একক। থার্মোমিটার একটি যন্ত্র।']);
  B.c(3, ['Finger is to hand as leaf is to...', 'আঙুল যেমন হাতের অংশ, পাতা তেমন কীসের অংশ?'], [['branch', 'ডাল'], ['root', 'শিকড়'], ['seed', 'বীজ'], ['soil', 'মাটি']], ['A finger grows from a hand. A leaf grows from a branch.', 'আঙুল হাত থেকে বের হয়। পাতা ডাল থেকে।']);
  B.c(3, ['Author is to book as architect is to...', 'লেখক যেমন বই রচনা করেন, স্থপতি তেমন নকশা করেন...'], [['building', 'ভবনের'], ['song', 'গানের'], ['meal', 'খাবারের'], ['road sign', 'পথনির্দেশকের']], ['An architect designs buildings.', 'স্থপতি ভবনের নকশা করেন।']);
  B.c(3, ['Minute is to hour as day is to...', 'মিনিট যেমন ঘণ্টার অংশ, দিন তেমন কীসের অংশ?'], [['week', 'সপ্তাহ'], ['second', 'সেকেন্ড'], ['noon', 'দুপুর'], ['clock', 'ঘড়ি']], ['Minutes make an hour. Days make a week.', 'মিনিট মিলে ঘণ্টা। দিন মিলে সপ্তাহ।']);
  B.c(3, ['Three friends finish a race. Amina is not last. Bilal is ahead of Amina. Who is last?', 'তিন বন্ধু দৌড় শেষ করল। আমিনা শেষ হয়নি। বিলাল আমিনার আগে। শেষ হয়েছে কে?'], [['Hamza', 'হামজা'], ['Amina', 'আমিনা'], ['Bilal', 'বিলাল']], ['Bilal first, Amina second, so Hamza is last.', 'বিলাল প্রথম, আমিনা দ্বিতীয়, তাই হামজা শেষ।']);
  B.c(3, ['A farmer has hens and cows: 5 heads and 14 legs. How many cows?', 'এক কৃষকের মুরগি ও গরু মিলে ৫টি মাথা ও ১৪টি পা। গরু কয়টি?'], [N(2), N(3), N(1), N(4)], ['2 cows (8 legs) and 3 hens (6 legs) make 14 legs.', '২টি গরু (৮ পা) ও ৩টি মুরগি (৬ পা) মিলে ১৪ পা।']);
  B.c(3, ['If the day after tomorrow is Friday, what day was yesterday?', 'পরশু যদি শুক্রবার হয়, গতকাল কী বার ছিল?'], [['Tuesday', 'মঙ্গলবার'], ['Wednesday', 'বুধবার'], ['Monday', 'সোমবার'], ['Thursday', 'বৃহস্পতিবার']], ['Today is Wednesday, so yesterday was Tuesday.', 'আজ বুধবার, তাই গতকাল মঙ্গলবার।']);
  B.c(3, ['A snail climbs 3 metres up a wall each day and slips 2 metres each night. The wall is 5 metres. On which day does it reach the top?', 'একটি শামুক দিনে ৩ মিটার ওঠে, রাতে ২ মিটার নেমে যায়। দেয়াল ৫ মিটার। কত নম্বর দিনে চূড়ায় পৌঁছাবে?'], [['Day 3', '৩য় দিন'], ['Day 5', '৫ম দিন'], ['Day 2', '২য় দিন'], ['Day 4', '৪র্থ দিন']], ['After two days it is at 2 metres. On day 3 it climbs to 5 and is out.', 'দুই দিন পর সে ২ মিটারে। ৩য় দিনে ৩ মিটার উঠে ৫ মিটারে পৌঁছায়।']);
  B.c(3, ['How many squares of any size are in a 2 by 2 grid?', '২ × ২ ছকে ছোট-বড় মিলিয়ে মোট কয়টি বর্গ?'], [N(5), N(4), N(6), N(8)], ['Four small squares and one big one.', 'চারটি ছোট বর্গ ও একটি বড় বর্গ।'], null, { qp: 'square' });
  B.c(3, ['Which number is both even and prime?', 'কোন সংখ্যা একই সঙ্গে জোড় ও মৌলিক?'], [N(2), N(4), N(1), N(9)], ['2 is the only even prime.', '২-ই একমাত্র জোড় মৌলিক সংখ্যা।']);
  B.c(3, ['A code swaps each letter for the next one: CAT becomes DBU. What does SUN become?', 'একটি সংকেতে প্রতিটি অক্ষরের বদলে পরের অক্ষর বসে: CAT হয় DBU। SUN কী হবে?'], ['TVO', 'RTM', 'TUN', 'SVO'], ['S to T, U to V, N to O.', 'S থেকে T, U থেকে V, N থেকে O।']);
  B.yn(3, ['All squares are rectangles. Is every rectangle a square?', 'সব বর্গই আয়ত। সব আয়তই কি বর্গ?'], false, ['No. A rectangle needs four right angles; a square also needs equal sides.', 'না। আয়তের চার কোণ সমকোণ হলেই হয়; বর্গের বাহুগুলোও সমান হতে হয়।'], null, { qp: 'rectangle' });
  B.yn(3, ['If it rains, the ground gets wet. The ground is wet. Must it have rained?', 'বৃষ্টি হলে মাটি ভেজে। মাটি ভেজা। তাহলে কি বৃষ্টি হয়েছেই?'], false, ['No. Someone may have watered the garden. One cause does not rule out others.', 'না। কেউ হয়তো বাগানে পানি দিয়েছে। একটি কারণ থাকলেই অন্য কারণ বাদ পড়ে না।'], null, { qp: 'rain' });
  B.yn(3, ['Some fruits are red. An apple is a fruit. Must an apple be red?', 'কিছু ফল লাল। আপেল একটি ফল। তাহলে কি আপেল লাল হতেই হবে?'], false, ['No. "Some" does not mean "all".', 'না। "কিছু" মানে "সব" নয়।'], null, { qp: 'apple' });
  B.sort(3, ['Prime or not prime?', 'মৌলিক না যৌগিক?'], [['Prime', 'মৌলিক'], ['Not prime', 'মৌলিক নয়']], [['7', '৭', 0], ['13', '১৩', 0], ['29', '২৯', 0], ['9', '৯', 1], ['21', '২১', 1], ['51', '৫১', 1]], ['A prime has exactly two factors: 1 and itself. 51 = 3 × 17.', 'মৌলিক সংখ্যার ঠিক দুটি গুণনীয়ক: ১ ও সংখ্যাটি নিজে। ৫১ = ৩ × ১৭।']);
  B.sort(3, ['Fact or opinion?', 'তথ্য না মতামত?'], [['Fact', 'তথ্য'], ['Opinion', 'মতামত']], [['Water boils at 100°C', 'পানি ১০০°সে-এ ফোটে', 0], ['A week has 7 days', 'সপ্তাহে ৭ দিন', 0], ['Dhaka is in Bangladesh', 'ঢাকা বাংলাদেশে', 0], ['Mango is the best fruit', 'আম সেরা ফল', 1], ['Maths is boring', 'গণিত একঘেয়ে', 1], ['Blue is the nicest colour', 'নীল সবচেয়ে সুন্দর রং', 1]], ['A fact can be checked. An opinion is what someone feels.', 'তথ্য যাচাই করা যায়। মতামত হলো কারও অনুভূতি।']);
  B.order(3, ['Put the steps of solving a problem in order.', 'সমস্যা সমাধানের ধাপ সাজাও।'], [['Understand the question', 'প্রশ্নটি বোঝা'], ['Make a plan', 'পরিকল্পনা করা'], ['Carry it out', 'কাজটি করা'], ['Check the answer', 'উত্তর মিলিয়ে দেখা']], ['Good thinkers always check at the end.', 'ভালো চিন্তাবিদ শেষে মিলিয়ে দেখে।']);
  B.match(3, ['Match each start to the rule it follows.', 'প্রতিটি ধারার সঙ্গে নিয়ম মেলাও।'], [[['2, 4, 8, 16', '২, ৪, ৮, ১৬'], ['Double', 'দ্বিগুণ']], [['1, 4, 9, 16', '১, ৪, ৯, ১৬'], ['Squares', 'বর্গ']], [['5, 10, 15, 20', '৫, ১০, ১৫, ২০'], ['Add 5', '৫ যোগ']], [['1, 1, 2, 3, 5', '১, ১, ২, ৩, ৫'], ['Add the last two', 'আগের দুটি যোগ']]], ['Find the rule and you can go on forever.', 'নিয়ম জানলে যত খুশি এগোনো যায়।']);

  KQ.define('think-it-through', { bank: B.list, gen: gen });
})();
