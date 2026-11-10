/* Number Garden: data.js
   No written bank: every question is made fresh when a stop starts, so a child never runs out and never
   memorises answers. Three bands: counting and small sums (4-6), sums to 100 and first tables (7-9),
   tables, fractions, percent and two-step problems (10-12). Questions get a little harder along the path. */
(function () {
  'use strict';
  var KQ = window.KahfQuiz, pick = KQ.pick, shuffle = KQ.shuffle;
  var BN = '০১২৩৪৫৬৭৮৯';
  function bn(x) { return String(x).replace(/\d/g, function (d) { return BN[d]; }); }
  function N(x) { return { en: String(x), bn: bn(x) }; }                   // a number as text in both languages
  function t(en, bn_) { return { en: en, bn: bn_ }; }
  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function opt(x) { return typeof x === 'object' ? x : { t: N(x) }; }
  // wrong answers near the right one, all different and not negative
  function near(right, n, spread) {
    var out = [], tries = 0;
    while (out.length < n && tries++ < 200) {
      var d = ri(1, spread || 3) * (Math.random() < 0.5 ? -1 : 1), v = right + d;
      if (v >= 0 && v !== right && out.indexOf(v) < 0) out.push(v);
    }
    return out;
  }
  function choice(q, right, wrong, why, extra) {
    var o = { type: 'choice', q: q, a: [opt(right)].concat(wrong.map(opt)), correct: 0, why: why };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }
  var THINGS = [['apple', 'apples', 'আপেল'], ['star', 'stars', 'তারা'], ['fish', 'fish', 'মাছ'], ['flower', 'flowers', 'ফুল'], ['ball', 'balls', 'বল'], ['bee', 'bees', 'মৌমাছি'], ['leaf', 'leaves', 'পাতা'], ['egg', 'eggs', 'ডিম'], ['bird', 'birds', 'পাখি'], ['book', 'books', 'বই']];
  var SHAPES = [['circle', 'circle', 'বৃত্ত'], ['square', 'square', 'বর্গ'], ['triangle', 'triangle', 'ত্রিভুজ'], ['rectangle', 'rectangle', 'আয়ত'], ['hexagon', 'hexagon', 'ষড়ভুজ'], ['oval', 'oval', 'ডিম্বাকার']];
  var NAMES = [['Amina', 'আমিনা'], ['Yusuf', 'ইউসুফ'], ['Maryam', 'মারিয়াম'], ['Bilal', 'বিলাল'], ['Fatima', 'ফাতিমা'], ['Hamza', 'হামজা']];

  // ---------- band 1: ages 4-6 ----------
  var B1 = {
    count: function (lv) {
      var th = pick(THINGS), n = ri(1, lv < 0.4 ? 5 : 10);
      return choice(t('How many ' + th[1] + '?', 'কয়টি ' + th[2] + '?'), n, near(n, 2, 2), t('Count them one by one: ' + n + '.', 'একটি একটি করে গোনো: ' + bn(n) + 'টি।'), { qp: 'many-' + th[0] + '-' + n });
    },
    more: function () {
      var a = ri(1, 9), b = ri(1, 9); while (b === a) b = ri(1, 9);
      var more = Math.random() < 0.5, hi = Math.max(a, b), lo = Math.min(a, b);
      return choice(more ? t('Which has more?', 'কোনটিতে বেশি?') : t('Which has fewer?', 'কোনটিতে কম?'), { p: 'dots-' + (more ? hi : lo) }, [{ p: 'dots-' + (more ? lo : hi) }],
        t(hi + ' is more than ' + lo + '.', bn(hi) + ', ' + bn(lo) + '-এর চেয়ে বেশি।'));
    },
    after: function (lv) {
      var n = ri(1, lv < 0.5 ? 8 : 18), before = Math.random() < 0.35 && n > 1;
      var r = before ? n - 1 : n + 1;
      return choice(before ? t('What comes just before ' + n + '?', bn(n) + '-এর ঠিক আগে কোন সংখ্যা?') : t('What comes just after ' + n + '?', bn(n) + '-এর ঠিক পরে কোন সংখ্যা?'), r, near(r, 2, 2).filter(function (v) { return v !== n; }).concat(n).slice(0, 2),
        before ? t((n - 1) + ', then ' + n + '.', bn(n - 1) + ', তারপর ' + bn(n) + '।') : t(n + ', then ' + (n + 1) + '.', bn(n) + ', তারপর ' + bn(n + 1) + '।'));
    },
    add: function (lv) {
      var a = ri(1, lv < 0.5 ? 4 : 6), b = ri(1, lv < 0.5 ? 3 : 4);
      return choice(t(a + ' + ' + b + ' = ?', bn(a) + ' + ' + bn(b) + ' = ?'), a + b, near(a + b, 2, 2), t(a + ' and ' + b + ' more make ' + (a + b) + '.', bn(a) + ' আর ' + bn(b) + ' মিলে ' + bn(a + b) + '।'));
    },
    take: function () {
      var a = ri(3, 9), b = ri(1, a - 1), th = pick(THINGS);
      return choice(t(a + ' ' + th[1] + '. ' + b + ' go away. How many are left?', bn(a) + 'টি ' + th[2] + '। ' + bn(b) + 'টি চলে গেল। কয়টি রইল?'), a - b, near(a - b, 2, 2),
        t(a + ' take away ' + b + ' is ' + (a - b) + '.', bn(a) + ' থেকে ' + bn(b) + ' বাদ দিলে ' + bn(a - b) + '।'), { qp: 'many-' + th[0] + '-' + a });
    },
    shape: function () {
      var s = shuffle(SHAPES).slice(0, 3);
      return choice(t('Which one is a ' + s[0][1] + '?', 'কোনটি ' + s[0][2] + '?'), { p: s[0][0] }, [{ p: s[1][0] }, { p: s[2][0] }], t('This shape is a ' + s[0][1] + '.', 'এই আকারটি ' + s[0][2] + '।'));
    },
    order: function (lv) {
      var set = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].slice(0, lv < 0.5 ? 6 : 10)).slice(0, 3).sort(function (a, b) { return a - b; });
      return { type: 'order', q: t('Smallest first!', 'ছোট থেকে বড় সাজাও!'), items: set.map(function (n) { return { t: N(n), p: 'dots-' + n }; }), why: t(set.join(', ') + '.', set.map(bn).join(', ') + '।') };
    },
    match: function () {
      var set = shuffle([1, 2, 3, 4, 5, 6]).slice(0, 3);
      return { type: 'match', q: t('Match the number to the dots.', 'সংখ্যার সঙ্গে ফোঁটা মেলাও।'), pairs: set.map(function (n) { return { l: { t: N(n) }, r: { p: 'dots-' + n } }; }), why: t('Each number matches that many dots.', 'প্রতিটি সংখ্যার সঙ্গে ততগুলো ফোঁটা মেলে।') };
    }
  };

  // ---------- band 2: ages 7-9 ----------
  var B2 = {
    add: function (lv) {
      var a = ri(6, lv < 0.4 ? 20 : 60), b = ri(4, lv < 0.4 ? 15 : 39);
      return choice(t(a + ' + ' + b + ' = ?', bn(a) + ' + ' + bn(b) + ' = ?'), a + b, near(a + b, 3, 4).concat(a + b + 10).slice(0, 3), t(a + ' + ' + b + ' = ' + (a + b) + '.', bn(a) + ' + ' + bn(b) + ' = ' + bn(a + b) + '।'));
    },
    sub: function (lv) {
      var a = ri(12, lv < 0.4 ? 30 : 90), b = ri(3, Math.min(a - 2, lv < 0.4 ? 12 : 45));
      return choice(t(a + ' − ' + b + ' = ?', bn(a) + ' − ' + bn(b) + ' = ?'), a - b, near(a - b, 3, 4), t(a + ' − ' + b + ' = ' + (a - b) + '.', bn(a) + ' − ' + bn(b) + ' = ' + bn(a - b) + '।'));
    },
    missing: function () {
      var b = ri(3, 12), r = ri(b + 2, b + 15), a = r - b;
      return choice(t('? + ' + b + ' = ' + r, '? + ' + bn(b) + ' = ' + bn(r)), a, near(a, 3, 3), t(a + ' + ' + b + ' = ' + r + ', because ' + r + ' − ' + b + ' = ' + a + '.', bn(a) + ' + ' + bn(b) + ' = ' + bn(r) + ', কারণ ' + bn(r) + ' − ' + bn(b) + ' = ' + bn(a) + '।'));
    },
    times: function (lv) {
      var a = pick(lv < 0.5 ? [2, 5, 10] : [2, 3, 4, 5, 10]), b = ri(2, 10);
      return choice(t(a + ' × ' + b + ' = ?', bn(a) + ' × ' + bn(b) + ' = ?'), a * b, [a * b + a, a * b - a, a * b + 1].filter(function (v, i, s) { return v > 0 && s.indexOf(v) === i; }), t(b + ' groups of ' + a + ' make ' + (a * b) + '.', bn(a) + ' করে ' + bn(b) + ' দল মিলে ' + bn(a * b) + '।'));
    },
    compare: function () {
      var a = ri(11, 99), b = ri(11, 99); while (a === b) b = ri(11, 99);
      return { type: 'yesno', q: t('Is ' + a + ' bigger than ' + b + '?', bn(a) + ' কি ' + bn(b) + '-এর চেয়ে বড়?'), yes: a > b, why: a > b ? t(a + ' is bigger than ' + b + '.', bn(a) + ', ' + bn(b) + '-এর চেয়ে বড়।') : t(b + ' is bigger than ' + a + '.', bn(b) + ', ' + bn(a) + '-এর চেয়ে বড়।') };
    },
    order: function () {
      var set = []; while (set.length < 4) { var v = ri(10, 99); if (set.indexOf(v) < 0) set.push(v); }
      set.sort(function (a, b) { return a - b; });
      return { type: 'order', q: t('Smallest first!', 'ছোট থেকে বড় সাজাও!'), items: set.map(function (n) { return { t: N(n) }; }), why: t(set.join(', ') + '.', set.map(bn).join(', ') + '।') };
    },
    skip: function () {
      var step = pick([2, 3, 5, 10]), s = ri(1, 6) * step, seq = [s, s + step, s + 2 * step], r = s + 3 * step;
      return choice(t(seq.join(', ') + ', ?', seq.map(bn).join(', ') + ', ?'), r, [r + step, r - 1, r + 1], t('Each number is ' + step + ' more: ' + r + '.', 'প্রতিবার ' + bn(step) + ' করে বাড়ছে: ' + bn(r) + '।'));
    },
    half: function () {
      var a = ri(2, 30) * 2, dbl = Math.random() < 0.5;
      return dbl ? choice(t('Double ' + (a / 2) + ' is…', bn(a / 2) + '-এর দ্বিগুণ কত?'), a, near(a, 3, 3), t((a / 2) + ' + ' + (a / 2) + ' = ' + a + '.', bn(a / 2) + ' + ' + bn(a / 2) + ' = ' + bn(a) + '।'))
        : choice(t('Half of ' + a + ' is…', bn(a) + '-এর অর্ধেক কত?'), a / 2, near(a / 2, 3, 3), t(a + ' shared between two is ' + (a / 2) + ' each.', bn(a) + '-কে দুই ভাগ করলে প্রতি ভাগে ' + bn(a / 2) + '।'));
    },
    story: function () {
      var who = pick(NAMES), th = pick(THINGS), a = ri(8, 30), b = ri(3, 15), plus = Math.random() < 0.5;
      if (!plus && b >= a) b = a - ri(1, 5);
      var r = plus ? a + b : a - b;
      return choice(plus ? t(who[0] + ' has ' + a + ' ' + th[1] + ' and gets ' + b + ' more. How many now?', who[1] + '-র ' + bn(a) + 'টি ' + th[2] + ' আছে। সে আরও ' + bn(b) + 'টি পেল। এখন মোট কয়টি?')
        : t(who[0] + ' has ' + a + ' ' + th[1] + ' and gives away ' + b + '. How many are left?', who[1] + '-র ' + bn(a) + 'টি ' + th[2] + ' ছিল। সে ' + bn(b) + 'টি দিয়ে দিল। কয়টি রইল?'),
        r, near(r, 3, 4), plus ? t(a + ' + ' + b + ' = ' + r + '.', bn(a) + ' + ' + bn(b) + ' = ' + bn(r) + '।') : t(a + ' − ' + b + ' = ' + r + '.', bn(a) + ' − ' + bn(b) + ' = ' + bn(r) + '।'));
    },
    evenodd: function () {
      var set = []; while (set.length < 5) { var v = ri(1, 40); if (set.indexOf(v) < 0) set.push(v); }
      return { type: 'sort', q: t('Even or odd?', 'জোড় না বিজোড়?'), bins: [{ t: t('Even', 'জোড়') }, { t: t('Odd', 'বিজোড়') }], items: set.map(function (n) { return { t: N(n), bin: n % 2 }; }),
        why: t('Even numbers end in 0, 2, 4, 6 or 8.', 'জোড় সংখ্যার শেষে ০, ২, ৪, ৬ বা ৮ থাকে।') };
    },
    match: function () {
      var sums = [], used = {};
      while (sums.length < 4) { var a = ri(2, 9), b = ri(2, 9); if (!used[a + b]) { used[a + b] = 1; sums.push([a, b]); } }
      return { type: 'match', q: t('Match each sum to its answer.', 'প্রতিটি যোগের সঙ্গে উত্তর মেলাও।'), pairs: sums.map(function (s) { return { l: { t: t(s[0] + ' + ' + s[1], bn(s[0]) + ' + ' + bn(s[1])) }, r: { t: N(s[0] + s[1]) } }; }),
        why: t('Add the two numbers to find the match.', 'দুটি সংখ্যা যোগ করলেই মিল পাওয়া যায়।') };
    },
    sides: function () {
      var S = [['triangle', 3, 'triangle', 'ত্রিভুজ'], ['square', 4, 'square', 'বর্গ'], ['hexagon', 6, 'hexagon', 'ষড়ভুজ'], ['rectangle', 4, 'rectangle', 'আয়ত']], s = pick(S);
      return choice(t('How many sides does a ' + s[2] + ' have?', s[3] + '-এর কয়টি বাহু?'), s[1], [3, 4, 5, 6, 8].filter(function (v) { return v !== s[1]; }).slice(0, 3), t('A ' + s[2] + ' has ' + s[1] + ' sides.', s[3] + '-এর ' + bn(s[1]) + 'টি বাহু।'), { qp: s[0] });
    }
  };

  // ---------- band 3: ages 10-12 ----------
  var B3 = {
    times: function () {
      var a = ri(6, 12), b = ri(6, 12);
      return choice(t(a + ' × ' + b + ' = ?', bn(a) + ' × ' + bn(b) + ' = ?'), a * b, [a * b + a, a * b - b, a * b + 10].filter(function (v, i, s) { return s.indexOf(v) === i; }), t(a + ' × ' + b + ' = ' + (a * b) + '.', bn(a) + ' × ' + bn(b) + ' = ' + bn(a * b) + '।'));
    },
    divide: function () {
      var b = ri(3, 12), r = ri(3, 12), a = b * r;
      return choice(t(a + ' ÷ ' + b + ' = ?', bn(a) + ' ÷ ' + bn(b) + ' = ?'), r, near(r, 3, 3), t(b + ' × ' + r + ' = ' + a + ', so ' + a + ' ÷ ' + b + ' = ' + r + '.', bn(b) + ' × ' + bn(r) + ' = ' + bn(a) + ', তাই ' + bn(a) + ' ÷ ' + bn(b) + ' = ' + bn(r) + '।'));
    },
    fraction: function () {
      var d = pick([2, 3, 4, 5, 10]), n = d > 2 && Math.random() < 0.4 ? ri(2, d - 1) : 1, whole = d * ri(2, 9), r = whole / d * n;
      return choice(t(n + '/' + d + ' of ' + whole + ' is…', bn(whole) + '-এর ' + bn(n) + '/' + bn(d) + ' অংশ কত?'), r, near(r, 3, 4), t(whole + ' ÷ ' + d + ' = ' + (whole / d) + (n > 1 ? ', and ' + (whole / d) + ' × ' + n + ' = ' + r : '') + '.', bn(whole) + ' ÷ ' + bn(d) + ' = ' + bn(whole / d) + (n > 1 ? ', আর ' + bn(whole / d) + ' × ' + bn(n) + ' = ' + bn(r) : '') + '।'));
    },
    bigger: function () {
      var a = ri(2, 9), b = ri(2, 9); while (a === b) b = ri(2, 9);
      return { type: 'yesno', q: t('Is 1/' + a + ' bigger than 1/' + b + '?', '১/' + bn(a) + ' কি ১/' + bn(b) + '-এর চেয়ে বড়?'), yes: a < b,
        why: t('The more parts you cut, the smaller each part: 1/' + Math.min(a, b) + ' is bigger.', 'যত বেশি ভাগ, প্রতিটি ভাগ তত ছোট: ১/' + bn(Math.min(a, b)) + ' বড়।') };
    },
    percent: function () {
      var p = pick([10, 20, 25, 50, 75]), base = (p === 25 || p === 75 ? 4 : p === 20 ? 5 : 10) * ri(2, 12), r = base * p / 100;
      return choice(t(p + '% of ' + base + ' is…', bn(base) + '-এর ' + bn(p) + '% কত?'), r, near(r, 3, 4), t(p + '% means ' + p + ' out of every 100: ' + r + '.', bn(p) + '% মানে প্রতি ১০০-তে ' + bn(p) + ': উত্তর ' + bn(r) + '।'));
    },
    order: function () {
      var a = ri(2, 9), b = ri(2, 9), c = ri(2, 9), r = a + b * c;
      return choice(t(a + ' + ' + b + ' × ' + c + ' = ?', bn(a) + ' + ' + bn(b) + ' × ' + bn(c) + ' = ?'), r, [(a + b) * c, r + 1, r - 2].filter(function (v, i, s) { return v !== r && v > 0 && s.indexOf(v) === i; }),
        t('Multiply first: ' + b + ' × ' + c + ' = ' + (b * c) + ', then add ' + a + '.', 'আগে গুণ: ' + bn(b) + ' × ' + bn(c) + ' = ' + bn(b * c) + ', তারপর ' + bn(a) + ' যোগ।'));
    },
    area: function () {
      var w = ri(3, 12), h = ri(2, 9), per = Math.random() < 0.5, r = per ? 2 * (w + h) : w * h;
      return choice(per ? t('A rectangle is ' + w + ' cm long and ' + h + ' cm wide. What is its perimeter?', 'একটি আয়তের দৈর্ঘ্য ' + bn(w) + ' সেমি, প্রস্থ ' + bn(h) + ' সেমি। পরিসীমা কত?')
        : t('A rectangle is ' + w + ' cm long and ' + h + ' cm wide. What is its area?', 'একটি আয়তের দৈর্ঘ্য ' + bn(w) + ' সেমি, প্রস্থ ' + bn(h) + ' সেমি। ক্ষেত্রফল কত?'),
        { t: t(r + (per ? ' cm' : ' cm²'), bn(r) + (per ? ' সেমি' : ' বর্গসেমি')) }, [per ? w * h : 2 * (w + h), r + w, r - h].filter(function (v, i, s) { return v !== r && v > 0 && s.indexOf(v) === i; }).map(function (v) { return { t: t(v + (per ? ' cm' : ' cm²'), bn(v) + (per ? ' সেমি' : ' বর্গসেমি')) }; }),
        per ? t('Add all four sides: 2 × (' + w + ' + ' + h + ') = ' + r + '.', 'চার বাহু যোগ করো: ২ × (' + bn(w) + ' + ' + bn(h) + ') = ' + bn(r) + '।') : t('Length × width: ' + w + ' × ' + h + ' = ' + r + '.', 'দৈর্ঘ্য × প্রস্থ: ' + bn(w) + ' × ' + bn(h) + ' = ' + bn(r) + '।'), { qp: 'rectangle' });
    },
    round: function () {
      var n = ri(101, 989); if (n % 10 === 5) n++;
      var to = Math.random() < 0.5 ? 10 : 100, r = Math.round(n / to) * to;
      return choice(t('Round ' + n + ' to the nearest ' + to + '.', bn(n) + '-কে নিকটতম ' + bn(to) + '-এ আনো।'), r, [r + to, r - to, to === 10 ? Math.round(n / 100) * 100 : Math.floor(n / 10) * 10].filter(function (v, i, s) { return v !== r && s.indexOf(v) === i; }),
        t(n + ' is closest to ' + r + '.', bn(n) + '-এর সবচেয়ে কাছে ' + bn(r) + '।'));
    },
    story: function () {
      var who = pick(NAMES), price = ri(3, 9) * 5, n = ri(3, 8), paid = Math.ceil(price * n / 100) * 100 + (Math.random() < 0.5 ? 0 : 100), r = paid - price * n;
      if (r === 0) { paid += 100; r = 100; }
      return choice(t(who[0] + ' buys ' + n + ' notebooks at ' + price + ' taka each and pays ' + paid + ' taka. How much change?', who[1] + ' ' + bn(price) + ' টাকা দরে ' + bn(n) + 'টি খাতা কিনে ' + bn(paid) + ' টাকা দিল। কত টাকা ফেরত পাবে?'),
        { t: t(r + ' taka', bn(r) + ' টাকা') }, [r + 10, r > 10 ? r - 5 : r + 20, r + price].filter(function (v, i, x) { return v !== r && x.indexOf(v) === i; }).map(function (v) { return { t: t(v + ' taka', bn(v) + ' টাকা') }; }),
        t(n + ' × ' + price + ' = ' + (n * price) + ', and ' + paid + ' − ' + (n * price) + ' = ' + r + '.', bn(n) + ' × ' + bn(price) + ' = ' + bn(n * price) + ', আর ' + bn(paid) + ' − ' + bn(n * price) + ' = ' + bn(r) + '।'));
    },
    prime: function () {
      var P = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31], C = [4, 6, 8, 9, 10, 12, 14, 15, 21, 25, 27, 33];
      var set = shuffle(shuffle(P).slice(0, 3).concat(shuffle(C).slice(0, 3)));
      return { type: 'sort', q: t('Prime or not prime?', 'মৌলিক না যৌগিক?'), bins: [{ t: t('Prime', 'মৌলিক') }, { t: t('Not prime', 'যৌগিক') }], items: set.map(function (n) { return { t: N(n), bin: P.indexOf(n) >= 0 ? 0 : 1 }; }),
        why: t('A prime number can be divided only by 1 and itself.', 'মৌলিক সংখ্যাকে শুধু ১ আর সেই সংখ্যা দিয়েই ভাগ করা যায়।') };
    },
    match: function () {
      var F = shuffle([['1/2', '0.5'], ['1/4', '0.25'], ['3/4', '0.75'], ['1/10', '0.1'], ['1/5', '0.2'], ['2/5', '0.4']]).slice(0, 4);
      return { type: 'match', q: t('Match each fraction to its decimal.', 'প্রতিটি ভগ্নাংশের সঙ্গে দশমিক মেলাও।'), pairs: F.map(function (f) { return { l: { t: N(f[0]) }, r: { t: N(f[1]) } }; }),
        why: t('Divide the top number by the bottom number.', 'ওপরের সংখ্যাকে নিচের সংখ্যা দিয়ে ভাগ করো।') };
    },
    orderFr: function () {
      var set = shuffle([[1, 10], [1, 5], [1, 4], [1, 3], [1, 2], [3, 4]]).slice(0, 4).sort(function (a, b) { return a[0] / a[1] - b[0] / b[1]; });
      return { type: 'order', q: t('Smallest first!', 'ছোট থেকে বড় সাজাও!'), items: set.map(function (f) { return { t: N(f[0] + '/' + f[1]) }; }), why: t(set.map(function (f) { return f[0] + '/' + f[1]; }).join(', ') + '.', set.map(function (f) { return bn(f[0] + '/' + f[1]); }).join(', ') + '।') };
    }
  };

  var SETS = { 1: B1, 2: B2, 3: B3 };
  // the first stops use the gentler kinds; later stops open up every kind
  var EARLY = { 1: ['count', 'more', 'shape', 'after', 'match'], 2: ['add', 'sub', 'compare', 'skip', 'times', 'evenodd'], 3: ['times', 'divide', 'fraction', 'round', 'bigger', 'match'] };
  function gen(band, n, ctx) {
    var set = SETS[band], lv = Math.min(1, ((ctx && ctx.stop) || 8) / 12), kinds = lv < 0.3 ? EARLY[band] : Object.keys(set), out = [], bag = [];
    if (ctx && ctx.quick) kinds = kinds.filter(function (k) { var q = set[k](lv); return q.type === 'choice' || q.type === 'yesno'; });
    while (out.length < n) {
      if (!bag.length) bag = shuffle(kinds);
      var q = set[bag.pop()](lv);
      // no two answers may read the same
      if (q.type === 'choice') { var seen = {}, ok = true; q.a.forEach(function (a) { var k = a.t ? a.t.en : a.p; if (seen[k]) ok = false; seen[k] = 1; }); if (!ok || q.a.length < 2) continue; }
      out.push(q);
    }
    return out;
  }
  KQ.define('number-garden', { gen: gen });
})();
