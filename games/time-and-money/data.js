/* Time and Money: data.js
   Half the questions are made fresh each time (clocks, days, months, taka sums, change), so they never run out;
   the other half come from a short written bank of facts and habits.
   band: 1 = ages 4-6, 2 = ages 7-9, 3 = ages 10-12. */
(function () {
  'use strict';
  var KQ = window.KahfQuiz, pick = KQ.pick, shuffle = KQ.shuffle, B = KQ.bank('tm');
  var BN = '০১২৩৪৫৬৭৮৯';
  function bn(x) { return String(x).replace(/\d/g, function (d) { return BN[d]; }); }
  function t(en, b) { return { en: en, bn: b }; }
  function N(x) { return t(String(x), bn(x)); }
  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function P(en, b, p) { return [en, b, p]; }
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function clk(h, m) { return t(h + ':' + two(m), bn(h) + ':' + bn(two(m))); }
  function tk(n) { return t(n + ' taka', bn(n) + ' টাকা'); }
  function choice(q, right, wrong, why, extra) {
    var o = { type: 'choice', q: q, a: [right].concat(wrong).map(function (x) { return x.t || x.p ? x : { t: x }; }), correct: 0, why: why };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }
  function others(right, make, n) {   // n different wrong values
    var out = [], seen = {}; seen[right] = 1; var tries = 0;
    while (out.length < n && tries++ < 200) { var v = make(); if (v >= 0 && !seen[v]) { seen[v] = 1; out.push(v); } }
    return out;
  }
  var DAYS = [['Saturday', 'শনিবার'], ['Sunday', 'রবিবার'], ['Monday', 'সোমবার'], ['Tuesday', 'মঙ্গলবার'], ['Wednesday', 'বুধবার'], ['Thursday', 'বৃহস্পতিবার'], ['Friday', 'শুক্রবার']];
  var MON = [['January', 'জানুয়ারি', 31], ['February', 'ফেব্রুয়ারি', 28], ['March', 'মার্চ', 31], ['April', 'এপ্রিল', 30], ['May', 'মে', 31], ['June', 'জুন', 30], ['July', 'জুলাই', 31], ['August', 'আগস্ট', 31], ['September', 'সেপ্টেম্বর', 30], ['October', 'অক্টোবর', 31], ['November', 'নভেম্বর', 30], ['December', 'ডিসেম্বর', 31]];
  var THINGS = [['a pencil', 'একটি পেনসিল', 'pencil'], ['a ball', 'একটি বল', 'ball'], ['a banana', 'একটি কলা', 'banana'], ['a book', 'একটি বই', 'book'], ['a kite', 'একটি ঘুড়ি', 'kite'], ['a cup', 'একটি কাপ', 'cup'], ['an egg', 'একটি ডিম', 'egg'], ['an apple', 'একটি আপেল', 'apple']];
  function d(i) { var x = DAYS[(i + 7) % 7]; return t(x[0], x[1]); }
  function mo(i) { var x = MON[(i + 12) % 12]; return t(x[0], x[1]); }

  var G = { 1: {}, 2: {}, 3: {} };
  // ---------- band 1 ----------
  G[1].oclock = function () {
    var h = ri(1, 12), w = others(h, function () { return ri(1, 12); }, 2);
    return choice(t('What time is it?', 'কয়টা বাজে?'), { t: t(h + ' o\'clock', bn(h) + 'টা') }, w.map(function (x) { return { t: t(x + ' o\'clock', bn(x) + 'টা') }; }),
      t('The short hand points to ' + h + ' and the long hand to 12.', 'ছোট কাঁটা ' + bn(h) + '-এ, বড় কাঁটা ১২-তে।'), { qp: 'clock-' + h + '-0' });
  };
  G[1].pickclock = function () {
    var h = ri(1, 12), w = others(h, function () { return ri(1, 12); }, 2);
    return choice(t('Which clock shows ' + h + ' o\'clock?', 'কোন ঘড়িতে ' + bn(h) + 'টা বাজে?'), { p: 'clock-' + h + '-0' }, w.map(function (x) { return { p: 'clock-' + x + '-0' }; }),
      t('At ' + h + ' o\'clock the short hand is on ' + h + '.', bn(h) + 'টায় ছোট কাঁটা ' + bn(h) + '-এ থাকে।'));
  };
  G[1].coins = function () {
    var n = ri(1, 9), w = others(n, function () { return n + ri(-2, 2); }, 2).filter(function (x) { return x > 0; });
    return choice(t('Each coin is 1 taka. How many taka?', 'প্রতিটি পয়সা ১ টাকা। মোট কত টাকা?'), { t: tk(n) }, w.map(function (x) { return { t: tk(x) }; }),
      t('Count the coins: ' + n + '.', 'পয়সা গোনো: ' + bn(n) + 'টি।'), { qp: 'many-coin-' + n });
  };
  G[1].nextday = function () {
    var i = ri(0, 6);
    return choice(t('Which day comes after ' + DAYS[i][0] + '?', DAYS[i][1] + '-এর পরে কোন দিন?'), { t: d(i + 1) }, [{ t: d(i + 3) }, { t: d(i - 1) }],
      t(DAYS[i][0] + ', then ' + d(i + 1).en + '.', DAYS[i][1] + ', তারপর ' + d(i + 1).bn + '।'), { qp: 'calendar' });
  };
  G[1].more = function () {
    var a = ri(1, 9), b = ri(1, 9); while (b === a) b = ri(1, 9);
    var hi = Math.max(a, b), lo = Math.min(a, b);
    return choice(t('Which is more money?', 'কোনটিতে বেশি টাকা?'), { p: 'many-coin-' + hi }, [{ p: 'many-coin-' + lo }], t(hi + ' coins are more than ' + lo + '.', bn(hi) + 'টি পয়সা ' + bn(lo) + 'টির চেয়ে বেশি।'));
  };
  // ---------- band 2 ----------
  G[2].read = function (lv) {
    var h = ri(1, 12), m = lv < 0.4 ? pick([0, 15, 30, 45]) : ri(0, 11) * 5;
    var w = [clk(m / 5 || 12, (h % 12) * 5), clk(h % 12 + 1, m), clk(h, (m + 30) % 60)], seen = {}, right = clk(h, m); seen[right.en] = 1;
    w = w.filter(function (x) { if (seen[x.en]) return false; seen[x.en] = 1; return true; });
    return choice(t('What time does the clock show?', 'ঘড়িতে কয়টা বাজে?'), { t: right }, w.map(function (x) { return { t: x }; }),
      t('The short hand shows the hour, the long hand the minutes: ' + right.en + '.', 'ছোট কাঁটা ঘণ্টা, বড় কাঁটা মিনিট দেখায়: ' + right.bn + '।'), { qp: 'clock-' + h + '-' + m });
  };
  G[2].pick = function () {
    var h = ri(1, 12), m = pick([0, 15, 30, 45]), a = [{ p: 'clock-' + h + '-' + m }, { p: 'clock-' + (h % 12 + 1) + '-' + m }, { p: 'clock-' + h + '-' + (m + 15) % 60 }];
    return choice(t('Which clock shows ' + clk(h, m).en + '?', 'কোন ঘড়িতে ' + clk(h, m).bn + ' বাজে?'), a[0], a.slice(1), t('Look at the short hand first, then the long hand.', 'আগে ছোট কাঁটা দেখো, তারপর বড় কাঁটা।'));
  };
  G[2].later = function () {
    var h = ri(1, 10), add = ri(1, 2), r = h + add;
    return choice(t('It is ' + h + ':00. What time will it be in ' + add + (add > 1 ? ' hours?' : ' hour?'), 'এখন ' + bn(h) + ':০০। ' + bn(add) + ' ঘণ্টা পরে কয়টা বাজবে?'), { t: clk(r, 0) }, [{ t: clk(r + 1, 0) }, { t: clk(h, 30) }, { t: clk(Math.max(1, h - add), 0) }].filter(function (x, i, arr) { return x.t.en !== clk(r, 0).en && arr.findIndex(function (y) { return y.t.en === x.t.en; }) === i; }),
      t(h + ' and ' + add + ' more is ' + r + '.', bn(h) + '-এর সঙ্গে ' + bn(add) + ' যোগ করলে ' + bn(r) + '।'), { qp: 'clock-' + h + '-0' });
  };
  G[2].sum = function () {
    var a = ri(2, 9) * 5, b = ri(1, 6) * 5, x = pick(THINGS), y = pick(THINGS); while (y === x) y = pick(THINGS);
    var r = a + b;
    return choice(t(cap(x[0]) + ' costs ' + a + ' taka and ' + y[0] + ' costs ' + b + ' taka. How much for both?', x[1] + 'র দাম ' + bn(a) + ' টাকা, ' + y[1] + 'র দাম ' + bn(b) + ' টাকা। দুটো মিলে কত?'), { t: tk(r) },
      others(r, function () { return r + pick([-10, -5, 5, 10]); }, 3).map(function (v) { return { t: tk(v) }; }), t(a + ' + ' + b + ' = ' + r + ' taka.', bn(a) + ' + ' + bn(b) + ' = ' + bn(r) + ' টাকা।'), { qp: x[2] });
  };
  G[2].change = function () {
    var pay = pick([10, 20, 50]), cost = ri(1, pay / 5 - 1) * 5 - pick([0, 0, 1, 2]), x = pick(THINGS), r = pay - cost;
    return choice(t(cap(x[0]) + ' costs ' + cost + ' taka. You pay ' + pay + ' taka. What is your change?', x[1] + 'র দাম ' + bn(cost) + ' টাকা। তুমি দিলে ' + bn(pay) + ' টাকা। কত ফেরত পাবে?'), { t: tk(r) },
      others(r, function () { return r + pick([-5, -2, -1, 1, 2, 5]); }, 3).map(function (v) { return { t: tk(v) }; }), t(pay + ' − ' + cost + ' = ' + r + ' taka.', bn(pay) + ' − ' + bn(cost) + ' = ' + bn(r) + ' টাকা।'), { qp: x[2] });
  };
  G[2].month = function () {
    var i = ri(0, 11), after = Math.random() < 0.6;
    return choice(after ? t('Which month comes after ' + MON[i][0] + '?', MON[i][1] + '-এর পরে কোন মাস?') : t('Which month comes before ' + MON[i][0] + '?', MON[i][1] + '-এর আগে কোন মাস?'),
      { t: mo(i + (after ? 1 : -1)) }, [{ t: mo(i + (after ? 2 : -2)) }, { t: mo(i + (after ? -1 : 1)) }, { t: mo(i + 5) }], t('The months go in order, twelve in a year.', 'মাসগুলো ক্রমে আসে, বছরে বারোটি।'), { qp: 'calendar' });
  };
  G[2].dayafter = function () {
    var i = ri(0, 6), k = ri(2, 3);
    return choice(t('Today is ' + DAYS[i][0] + '. What day will it be in ' + k + ' days?', 'আজ ' + DAYS[i][1] + '। ' + bn(k) + ' দিন পরে কী বার?'), { t: d(i + k) }, [{ t: d(i + k + 1) }, { t: d(i + k - 1) }, { t: d(i - k) }].filter(function (x) { return x.t.en !== d(i + k).en; }),
      t('Count forward ' + k + ' days from ' + DAYS[i][0] + '.', DAYS[i][1] + ' থেকে ' + bn(k) + ' দিন সামনে গোনো।'), { qp: 'calendar' });
  };
  // ---------- band 3 ----------
  G[3].elapsed = function () {
    var h = ri(1, 9), m = ri(0, 8) * 5, add = pick([20, 25, 35, 40, 45, 50, 75, 90]), tot = h * 60 + m + add, rh = Math.floor(tot / 60), rm = tot % 60, right = clk(rh, rm);
    var w = [clk(rh, (rm + 10) % 60), clk(rh + 1, rm), clk(rh, (rm + 55) % 60)].filter(function (x) { return x.en !== right.en; });
    return choice(t('A class starts at ' + clk(h, m).en + ' and lasts ' + add + ' minutes. When does it end?', 'ক্লাস শুরু ' + clk(h, m).bn + '-এ, চলে ' + bn(add) + ' মিনিট। কখন শেষ হয়?'), { t: right }, w.map(function (x) { return { t: x }; }),
      t('Add ' + add + ' minutes to ' + clk(h, m).en + ': ' + right.en + '.', clk(h, m).bn + '-এর সঙ্গে ' + bn(add) + ' মিনিট যোগ করো: ' + right.bn + '।'), { qp: 'clock-' + h + '-' + m });
  };
  G[3].between = function () {
    var h = ri(1, 8), m = ri(0, 11) * 5, gap = pick([25, 35, 45, 50, 65, 80, 95, 110]), tot = h * 60 + m + gap, e = clk(Math.floor(tot / 60), tot % 60);
    return choice(t('How many minutes are there from ' + clk(h, m).en + ' to ' + e.en + '?', clk(h, m).bn + ' থেকে ' + e.bn + ' পর্যন্ত কত মিনিট?'), { t: t(gap + ' minutes', bn(gap) + ' মিনিট') },
      others(gap, function () { return gap + pick([-20, -10, -5, 5, 10, 20]); }, 3).map(function (v) { return { t: t(v + ' minutes', bn(v) + ' মিনিট') }; }), t('Count up to the next hour, then add the rest: ' + gap + ' minutes.', 'পরের ঘণ্টা পর্যন্ত গোনো, তারপর বাকিটা যোগ করো: ' + bn(gap) + ' মিনিট।'), { qp: 'hourglass' });
  };
  G[3].h24 = function () {
    var h = ri(13, 23), m = pick([0, 15, 30, 45]), r = h - 12;
    return choice(t('What is ' + h + ':' + two(m) + ' on a 12-hour clock?', '২৪ ঘণ্টার ঘড়ির ' + bn(h) + ':' + bn(two(m)) + ' মানে ১২ ঘণ্টার ঘড়িতে কয়টা?'), { t: t(r + ':' + two(m) + ' pm', 'বিকেল/রাত ' + bn(r) + ':' + bn(two(m))) },
      [{ t: t(r + ':' + two(m) + ' am', 'সকাল ' + bn(r) + ':' + bn(two(m))) }, { t: t((r % 12 + 1) + ':' + two(m) + ' pm', 'বিকেল/রাত ' + bn(r % 12 + 1) + ':' + bn(two(m))) }, { t: t((r + 1 > 11 ? r - 1 : r + 2) + ':' + two(m) + ' pm', 'বিকেল/রাত ' + bn(r + 1 > 11 ? r - 1 : r + 2) + ':' + bn(two(m))) }],
      t('After 12 noon, take away 12: ' + h + ' − 12 = ' + r + '.', 'দুপুর ১২টার পর ১২ বাদ দাও: ' + bn(h) + ' − ১২ = ' + bn(r) + '।'), { qp: 'clock-' + r + '-' + m });
  };
  G[3].mins = function () {
    var h = ri(1, 4), m = pick([0, 15, 20, 30, 45]), r = h * 60 + m;
    return choice(t('How many minutes are in ' + h + (h > 1 ? ' hours' : ' hour') + (m ? ' ' + m + ' minutes' : '') + '?', bn(h) + ' ঘণ্টা' + (m ? ' ' + bn(m) + ' মিনিটে' : 'য়') + ' মোট কত মিনিট?'), { t: N(r) },
      others(r, function () { return r + pick([-60, -30, -10, 10, 30, 60]); }, 3).map(function (v) { return { t: N(v) }; }), t(h + ' × 60' + (m ? ' + ' + m : '') + ' = ' + r + '.', bn(h) + ' × ৬০' + (m ? ' + ' + bn(m) : '') + ' = ' + bn(r) + '।'), { qp: 'hourglass' });
  };
  G[3].change = function () {
    var pay = pick([100, 200, 500]), a = ri(2, 9) * 5, n = ri(2, 4), x = pick(THINGS), cost = a * n, r = pay - cost;
    return choice(t('You buy ' + n + ' things at ' + a + ' taka each and pay ' + pay + ' taka. What is your change?', 'তুমি ' + bn(a) + ' টাকা দরের ' + bn(n) + 'টি জিনিস কিনে ' + bn(pay) + ' টাকা দিলে। কত ফেরত পাবে?'), { t: tk(r) },
      others(r, function () { return r + pick([-20, -10, -5, 5, 10, 20]); }, 3).map(function (v) { return { t: tk(v) }; }), t(n + ' × ' + a + ' = ' + cost + ', and ' + pay + ' − ' + cost + ' = ' + r + ' taka.', bn(n) + ' × ' + bn(a) + ' = ' + bn(cost) + ', আর ' + bn(pay) + ' − ' + bn(cost) + ' = ' + bn(r) + ' টাকা।'), { qp: x[2] });
  };
  G[3].save = function () {
    var per = ri(2, 10) * 5, goal = per * ri(4, 12), r = goal / per;
    return choice(t('You save ' + per + ' taka every week. How many weeks to save ' + goal + ' taka?', 'তুমি প্রতি সপ্তাহে ' + bn(per) + ' টাকা জমাও। ' + bn(goal) + ' টাকা জমাতে কত সপ্তাহ লাগবে?'), { t: t(r + ' weeks', bn(r) + ' সপ্তাহ') },
      others(r, function () { return r + ri(-3, 3); }, 3).filter(function (v) { return v > 0; }).map(function (v) { return { t: t(v + ' weeks', bn(v) + ' সপ্তাহ') }; }), t(goal + ' ÷ ' + per + ' = ' + r + '.', bn(goal) + ' ÷ ' + bn(per) + ' = ' + bn(r) + '।'), { qp: 'coins' });
  };
  G[3].unit = function () {
    var n = pick([2, 4, 5, 10]), each = ri(3, 12), tot = n * each;
    return choice(t(n + ' pencils cost ' + tot + ' taka. How much is one pencil?', bn(n) + 'টি পেনসিলের দাম ' + bn(tot) + ' টাকা। একটির দাম কত?'), { t: tk(each) },
      others(each, function () { return each + ri(-3, 3); }, 3).filter(function (v) { return v > 0; }).map(function (v) { return { t: tk(v) }; }), t(tot + ' ÷ ' + n + ' = ' + each + ' taka.', bn(tot) + ' ÷ ' + bn(n) + ' = ' + bn(each) + ' টাকা।'), { qp: 'pencil' });
  };
  G[3].days = function () {
    var i = ri(0, 11); if (i === 1) i = 2;
    return choice(t('How many days are in ' + MON[i][0] + '?', MON[i][1] + ' মাসে কত দিন?'), { t: N(MON[i][2]) }, [{ t: N(MON[i][2] === 31 ? 30 : 31) }, { t: N(28) }, { t: N(29) }],
      t('April, June, September and November have 30. February has 28 or 29. The rest have 31.', 'এপ্রিল, জুন, সেপ্টেম্বর ও নভেম্বরে ৩০ দিন। ফেব্রুয়ারিতে ২৮ বা ২৯। বাকিগুলোতে ৩১।'), { qp: 'calendar' });
  };
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function gen(band, n, ctx) {
    var set = G[band], lv = Math.min(1, ((ctx && ctx.stop) || 8) / 15), out = [], bag = [], tries = 0;
    while (out.length < n && tries++ < 300) {
      if (!bag.length) bag = shuffle(Object.keys(set));
      var q = set[bag.pop()](lv), seen = {}, ok = q.a.length >= 2;
      q.a.forEach(function (a) { var k = a.t ? a.t.en : a.p; if (seen[k]) ok = false; seen[k] = 1; });
      if (ok) out.push(q);
    }
    return out;
  }

  // ---------- the written bank ----------
  B.c(1, ['When do we eat breakfast?', 'আমরা কখন নাশতা খাই?'], [P('Morning', 'সকাল', 'dawn'), P('Night', 'রাত', 'night')], ['Breakfast is the first meal, in the morning.', 'নাশতা দিনের প্রথম খাবার, সকালে।']);
  B.c(1, ['When do we see the stars?', 'আমরা কখন তারা দেখি?'], [P('Night', 'রাত', 'night'), P('Morning', 'সকাল', 'dawn')], ['Stars shine at night.', 'রাতে তারা জ্বলে।']);
  B.c(1, ['What do we use to tell the time?', 'সময় দেখি কী দিয়ে?'], [P('Clock', 'ঘড়ি', 'clock'), P('Ruler', 'স্কেল', 'ruler'), P('Cup', 'কাপ', 'cup')], ['A clock shows hours and minutes.', 'ঘড়ি ঘণ্টা ও মিনিট দেখায়।']);
  B.c(1, ['What do we use to buy things?', 'জিনিস কিনি কী দিয়ে?'], [P('Money', 'টাকা', 'coins'), P('Leaves', 'পাতা', 'leaf'), P('Pebbles', 'নুড়ি', 'pebbles')], ['We pay money to the shopkeeper.', 'আমরা দোকানিকে টাকা দিই।']);
  B.c(1, ['How many days are in a week?', 'এক সপ্তাহে কয় দিন?'], ['7', '5', '10'], ['Seven days make one week.', 'সাত দিনে এক সপ্তাহ।'], null, { qp: 'calendar' });
  B.c(1, ['On which day do Muslims pray Jumuah?', 'মুসলিমরা কোন দিন জুমার নামাজ পড়ে?'], [['Friday', 'শুক্রবার'], ['Monday', 'সোমবার'], ['Sunday', 'রবিবার']], ['Friday is the day of Jumuah.', 'শুক্রবার জুমার দিন।'], null, { qp: 'mosque' });
  B.yn(1, ['Is the sun up at night?', 'রাতে কি সূর্য থাকে?'], false, ['No. The sun is up in the day.', 'না। সূর্য দিনে থাকে।'], null, { qp: 'night' });
  B.yn(1, ['Should we pay for what we take from a shop?', 'দোকান থেকে কিছু নিলে কি দাম দিতে হয়?'], true, ['Yes. Taking without paying is not honest.', 'হ্যাঁ। দাম না দিয়ে নেওয়া অসততা।'], null, { qp: 'basket' });
  B.sort(1, ['Day or night?', 'দিন না রাত?'], [['Day', 'দিন'], ['Night', 'রাত']], [['Going to school', 'স্কুলে যাওয়া', 0, 'bag'], ['Playing outside', 'বাইরে খেলা', 0, 'ball'], ['Sleeping', 'ঘুমানো', 1, 'bed'], ['Seeing the moon', 'চাঁদ দেখা', 1, 'moon']], ['We work and play by day and rest at night.', 'দিনে কাজ ও খেলা, রাতে বিশ্রাম।']);
  B.order(1, ['Put the day in order.', 'দিনের সময়গুলো সাজাও।'], [P('Morning', 'সকাল', 'dawn'), P('Noon', 'দুপুর', 'sun'), P('Evening', 'সন্ধ্যা', 'sunset'), P('Night', 'রাত', 'night')], ['Morning, noon, evening, night.', 'সকাল, দুপুর, সন্ধ্যা, রাত।']);
  B.c(2, ['How many minutes are in one hour?', 'এক ঘণ্টায় কত মিনিট?'], ['60', '100', '30', '24'], ['60 minutes make an hour.', '৬০ মিনিটে এক ঘণ্টা।'], null, { qp: 'clock-12-0' });
  B.c(2, ['How many hours are in one day?', 'এক দিনে কত ঘণ্টা?'], ['24', '12', '60', '7'], ['A day and its night together are 24 hours.', 'দিন ও রাত মিলে ২৪ ঘণ্টা।']);
  B.c(2, ['How many months are in a year?', 'এক বছরে কত মাস?'], ['12', '10', '7', '30'], ['Twelve months make a year.', 'বারো মাসে এক বছর।'], null, { qp: 'calendar' });
  B.c(2, ['How many seconds are in one minute?', 'এক মিনিটে কত সেকেন্ড?'], ['60', '100', '10', '30'], ['60 seconds make a minute.', '৬০ সেকেন্ডে এক মিনিট।']);
  B.c(2, ['"Half past 4" means...', '"সাড়ে চারটা" মানে কী?'], [clk(4, 30), clk(4, 15), clk(5, 30), clk(4, 0)].map(function (x) { return { t: x }; }), ['Half an hour is 30 minutes.', 'আধা ঘণ্টা মানে ৩০ মিনিট।'], null, { qp: 'clock-4-30' });
  B.c(2, ['"Quarter past 7" means...', '"সোয়া সাতটা" মানে কী?'], [clk(7, 15), clk(7, 45), clk(7, 30), clk(8, 15)].map(function (x) { return { t: x }; }), ['A quarter of an hour is 15 minutes.', 'সোয়া মানে ১৫ মিনিট বেশি।'], null, { qp: 'clock-7-15' });
  B.c(2, ['What is the money of Bangladesh called?', 'বাংলাদেশের মুদ্রার নাম কী?'], [['Taka', 'টাকা'], ['Rupee', 'রুপি'], ['Dollar', 'ডলার'], ['Riyal', 'রিয়াল']], ['One taka is 100 poisha.', 'এক টাকায় ১০০ পয়সা।'], null, { qp: 'coins' });
  B.c(2, ['You want a toy but do not have enough money. What is a good plan?', 'একটি খেলনা চাও, কিন্তু টাকা কম। ভালো উপায় কোনটি?'], [['Save a little each week', 'প্রতি সপ্তাহে একটু করে জমানো'], ['Take it without paying', 'দাম না দিয়ে নেওয়া'], ['Cry until someone buys it', 'কেউ কিনে না দেওয়া পর্যন্ত কাঁদা'], ['Borrow and never give back', 'ধার নিয়ে ফেরত না দেওয়া']], ['Saving is patient and honest.', 'সঞ্চয় ধৈর্য ও সততার কাজ।'], null, { qp: 'coin' });
  B.yn(2, ['Is a need the same as a want?', 'প্রয়োজন আর শখ কি একই?'], false, ['No. Food and water are needs. A new toy is a want.', 'না। খাবার ও পানি প্রয়োজন। নতুন খেলনা শখ।']);
  B.yn(2, ['Does every month have 30 days?', 'সব মাসেই কি ৩০ দিন?'], false, ['No. Some have 31, and February has 28 or 29.', 'না। কিছু মাসে ৩১, আর ফেব্রুয়ারিতে ২৮ বা ২৯।'], null, { qp: 'calendar' });
  B.sort(2, ['Need or want?', 'প্রয়োজন না শখ?'], [['Need', 'প্রয়োজন'], ['Want', 'শখ']], [['Water', 'পানি', 0, 'water'], ['Rice', 'ভাত', 0, 'rice'], ['Shoes', 'জুতা', 0, 'shoe'], ['Candy', 'মিঠাই', 1, 'candy'], ['A kite', 'ঘুড়ি', 1, 'kite'], ['A fizzy drink', 'কোমল পানীয়', 1, 'soda']], ['Spend on needs first. Wants can wait.', 'আগে প্রয়োজনে খরচ। শখ পরে।']);
  B.order(2, ['Shortest to longest.', 'কম থেকে বেশি সময় সাজাও।'], [['Second', 'সেকেন্ড'], ['Minute', 'মিনিট'], ['Hour', 'ঘণ্টা'], ['Day', 'দিন']], ['60 seconds, 60 minutes, 24 hours.', '৬০ সেকেন্ড, ৬০ মিনিট, ২৪ ঘণ্টা।']);
  B.order(2, ['Put these months in order.', 'মাসগুলো ক্রমে সাজাও।'], [['January', 'জানুয়ারি'], ['April', 'এপ্রিল'], ['August', 'আগস্ট'], ['December', 'ডিসেম্বর']], ['January is the first month, December the last.', 'জানুয়ারি প্রথম মাস, ডিসেম্বর শেষ।']);
  B.match(2, ['Match the amounts that are equal.', 'সমান পরিমাণ মেলাও।'], [[['1 hour', '১ ঘণ্টা'], ['60 minutes', '৬০ মিনিট']], [['1 day', '১ দিন'], ['24 hours', '২৪ ঘণ্টা']], [['1 week', '১ সপ্তাহ'], ['7 days', '৭ দিন']], [['1 year', '১ বছর'], ['12 months', '১২ মাস']]], ['Small units of time add up to bigger ones.', 'সময়ের ছোট একক মিলে বড় একক হয়।']);
  B.c(3, ['How many days are in a leap year?', 'অধিবর্ষে কত দিন?'], ['366', '365', '364', '360'], ['A leap year comes every four years and adds 29 February.', 'প্রতি চার বছরে অধিবর্ষ আসে; তখন ফেব্রুয়ারি ২৯ দিনের হয়।'], null, { qp: 'calendar' });
  B.c(3, ['How many weeks are in a year?', 'এক বছরে কত সপ্তাহ?'], ['52', '48', '12', '60'], ['52 weeks and one day make 365 days.', '৫২ সপ্তাহ ও এক দিন মিলে ৩৬৫ দিন।']);
  B.c(3, ['What does "am" tell you about a time?', 'সময়ের পাশে "am" থাকলে কী বোঝায়?'], [['It is before noon', 'দুপুর ১২টার আগে'], ['It is after noon', 'দুপুর ১২টার পরে'], ['It is exactly noon', 'ঠিক দুপুর ১২টা'], ['It is a Friday', 'শুক্রবার']], ['am is from midnight to noon. pm is from noon to midnight.', 'am মধ্যরাত থেকে দুপুর। pm দুপুর থেকে মধ্যরাত।']);
  B.c(3, ['A plan for how you will spend and save your money is called a...', 'টাকা কীভাবে খরচ ও সঞ্চয় করবে তার পরিকল্পনাকে কী বলে?'], [['budget', 'বাজেট'], ['receipt', 'রসিদ'], ['discount', 'ছাড়'], ['loan', 'ঋণ']], ['A budget helps money last.', 'বাজেট টাকাকে টেকসই করে।'], null, { qp: 'coins' });
  B.c(3, ['A shirt costs 400 taka. It is 25% off. What do you pay?', 'একটি জামার দাম ৪০০ টাকা। ২৫% ছাড়। কত দিতে হবে?'], [tk(300), tk(375), tk(100), tk(325)].map(function (x) { return { t: x }; }), ['25% of 400 is 100. 400 − 100 = 300.', '৪০০-এর ২৫% হলো ১০০। ৪০০ − ১০০ = ৩০০।'], null, { qp: 'shirt' });
  B.c(3, ['What does Islam teach about paying back money you borrowed?', 'ধার নেওয়া টাকা ফেরত দেওয়া নিয়ে ইসলাম কী শেখায়?'], [['Pay it back fully and on time', 'পুরোটা সময়মতো ফেরত দাও'], ['Keep it if no one asks', 'কেউ না চাইলে রেখে দাও'], ['Pay back only half', 'অর্ধেক ফেরত দাও'], ['Forget about it', 'ভুলে যাও']], ['Returning a trust is a duty. Allah commands us to return trusts to their owners (Quran 4:58).', 'আমানত ফেরত দেওয়া কর্তব্য। আল্লাহ আমানত তার মালিককে ফেরত দিতে আদেশ করেছেন (কুরআন ৪:৫৮)।'], 'Quran 4:58');
  B.yn(3, ['Is 12:00 at night written as 00:00 on a 24-hour clock?', 'রাত ১২টাকে কি ২৪ ঘণ্টার ঘড়িতে ০০:০০ লেখা হয়?'], true, ['Yes. The day starts at 00:00.', 'হ্যাঁ। দিন শুরু হয় ০০:০০ থেকে।']);
  B.yn(3, ['Is the year 2100 a leap year?', '২১০০ সাল কি অধিবর্ষ?'], false, ['No. Century years are leap years only if they divide by 400.', 'না। শতাব্দীর বছর ৪০০ দিয়ে ভাগ গেলে তবেই অধিবর্ষ।']);
  B.sort(3, ['30 days or 31 days?', '৩০ দিন না ৩১ দিন?'], [['30 days', '৩০ দিন'], ['31 days', '৩১ দিন']], [['April', 'এপ্রিল', 0], ['June', 'জুন', 0], ['November', 'নভেম্বর', 0], ['January', 'জানুয়ারি', 1], ['July', 'জুলাই', 1], ['December', 'ডিসেম্বর', 1]], ['Four months have 30 days: April, June, September, November.', 'চার মাসে ৩০ দিন: এপ্রিল, জুন, সেপ্টেম্বর, নভেম্বর।']);
  B.order(3, ['Smallest to largest amount.', 'কম থেকে বেশি সাজাও।'], [['90 poisha', '৯০ পয়সা'], ['5 taka', '৫ টাকা'], ['1,200 poisha', '১,২০০ পয়সা'], ['50 taka', '৫০ টাকা']], ['100 poisha make 1 taka, so 1,200 poisha is 12 taka.', '১০০ পয়সায় ১ টাকা, তাই ১,২০০ পয়সা মানে ১২ টাকা।']);
  B.match(3, ['Match the 24-hour time to the 12-hour time.', '২৪ ঘণ্টার সময়ের সঙ্গে ১২ ঘণ্টার সময় মেলাও।'], [['13:00', ['1:00 pm', 'দুপুর ১:০০']], ['17:30', ['5:30 pm', 'বিকেল ৫:৩০']], ['21:15', ['9:15 pm', 'রাত ৯:১৫']], ['06:45', ['6:45 am', 'সকাল ৬:৪৫']]], ['After noon, take away 12.', 'দুপুরের পর ১২ বাদ দাও।']);

  KQ.define('time-and-money', { bank: B.list, gen: gen });
})();
