/* Kahf KidsGames quiz engine: quiz.js
   One engine for every quiz in the catalog. A quiz is a line in catalog.js (name, theme, stops, stickers) plus a
   data.js that hands over its question bank with KahfQuiz.define(id, { bank }). The page then calls KahfQuiz.run().
   The engine runs the journey map, the stops, seven question types, stars, mastery, three age bands, two
   languages, stickers, the lightning round, Today's five and the Kahf activity bridge calls.

   This file is the data and the rules only (no drawing, no page): the bank builder, the bank check, the strings and
   KahfQuiz.model (saves, bands, stars, mastery, which questions a stop gets). tools/quiz-check.js runs it in Node.
   js/quiz/game.js draws and plays it on Phaser 4 (KahfQuiz.play), started by Kit.play.start like every game.

   Bridge rules (docs/quiz-quality-plan.md, section 8):
     answer()    once per question, when the child commits an answer. Never for hints, reveals or replays.
     complete()  once at the end of every stop, lightning round and Today's five.
     item(id)    when a sticker card is opened.
   Sounds and praise play through Phaser's Web Audio, so the bridge's media_done fires only for real listening (an
   ayah played through an <audio> element to its end; game.js keeps that one element for this reason).

   Question shapes (text fields are { en, bn }; `p` is a picture key; `ref` is the checked source):
     { id, band, type: 'choice', q, a: [{ t, p }], correct: 0, why, ref }
     { id, band, type: 'yesno',  q, yes: true, why, ref }
     { id, band, type: 'sort',   q, bins: [{ t, p }, { t, p }], items: [{ t, p, bin: 0 }], why, ref }
     { id, band, type: 'order',  q, items: [{ t, p }] (in the right order), why, ref }
     { id, band, type: 'match',  q, pairs: [{ l: { t, p }, r: { t, p } }], why, ref }
     { id, band, type: 'place',  q, scene, correct: spotId, spots: [spotId...] (optional), why, ref }
   band is 1 (ages 4-6), 2 (7-9), 3 (10-12) or a list of them. Optional: `qp` picture beside the question,
   `ar` an Arabic line under it, `audio` a clip (or list of clips) to listen to, `fixed` keeps answer order.
   Banks are normally written with the short builder, KahfQuiz.bank() (see below). */
(function () {
  'use strict';
  var STR = {
    en: {
      play: 'Play', next: 'Next', map: 'Map', again: 'Again', yes: 'Yes', no: 'No',
      good: ['Well done!', 'That is right!', 'Excellent!', 'You got it!'], bad: 'Not quite', learned: 'Now you know',
      done: 'Finished!', perfect: 'Perfect!', bandTitle: 'Who is playing?', lang: 'Language',
      bands: ['Seedling', 'Explorer', 'Champion'], ages: ['Ages 4 to 6', 'Ages 7 to 9', 'Ages 10 to 12'],
      leave: 'Leave this stop?', leaveText: 'Your answers so far will not be saved.', stay: 'Keep playing', quit: 'Leave', exit: 'Exit',
      order: 'Tap them in order', match: 'Tap two that go together', sort: 'Tap the right basket', place: 'Tap the right place',
      source: 'Source', listen: 'Listen', stickers: 'Stickers', newSticker: 'New sticker!', stickerLocked: 'Keep playing to win this one',
      lightning: 'Lightning round', lightningText: 'Ten quick questions. Can you beat your own best time?', go: 'Go',
      time: 'Time', best: 'Best', newBest: 'New best time!', tomorrow: 'Come back tomorrow',
      todayDone: 'Today is done. Five new questions tomorrow!', tryBand: 'Try', soundOn: 'Sound on', soundOff: 'Sound off'
    },
    bn: {
      play: 'খেলো', next: 'পরের', map: 'মানচিত্র', again: 'আবার', yes: 'হ্যাঁ', no: 'না',
      good: ['সাবাশ!', 'একদম ঠিক!', 'দারুণ!', 'ঠিক বলেছ!'], bad: 'ঠিক হয়নি', learned: 'এবার জেনে নিলে',
      done: 'শেষ হলো!', perfect: 'সব ঠিক!', bandTitle: 'কে খেলছে?', lang: 'ভাষা',
      bands: ['চারাগাছ', 'অভিযাত্রী', 'চ্যাম্পিয়ন'], ages: ['বয়স ৪ থেকে ৬', 'বয়স ৭ থেকে ৯', 'বয়স ১০ থেকে ১২'],
      leave: 'এই ধাপ ছেড়ে যাবে?', leaveText: 'এ পর্যন্ত দেওয়া উত্তর জমা থাকবে না।', stay: 'খেলতে থাকো', quit: 'ছেড়ে যাও', exit: 'বের হও',
      order: 'পরপর সাজিয়ে চাপো', match: 'যে দুটি মেলে, সে দুটি চাপো', sort: 'ঠিক ঝুড়িতে চাপো', place: 'ঠিক জায়গায় চাপো',
      source: 'সূত্র', listen: 'শোনো', stickers: 'স্টিকার', newSticker: 'নতুন স্টিকার!', stickerLocked: 'খেলতে থাকো, এটি পাবে',
      lightning: 'ঝটপট রাউন্ড', lightningText: 'দশটি ঝটপট প্রশ্ন। নিজের সেরা সময়কে হারাতে পারবে?', go: 'শুরু',
      time: 'সময়', best: 'সেরা', newBest: 'নতুন সেরা সময়!', tomorrow: 'কাল আবার এসো',
      todayDone: 'আজকের পাঁচ শেষ। কাল নতুন পাঁচটি প্রশ্ন!', tryBand: 'চেষ্টা করো', soundOn: 'শব্দ চালু', soundOff: 'শব্দ বন্ধ'
    }
  };
  var BN_DIGITS = '০১২৩৪৫৬৭৮৯';
  var PER_STOP = { 1: 4, 2: 6, 3: 8 };

  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pickOne(a) { return a[(Math.random() * a.length) | 0]; }
  function inBand(q, b) { return q.band === b || (q.band && q.band.indexOf && q.band.indexOf(b) >= 0); }
  function isArabic(s) { return /[؀-ۿ]/.test(s) && !/[A-Za-zঀ-৿]/.test(s); }
  function today() { var d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }

  var KahfQuiz = window.KahfQuiz = window.KahfQuiz || {};
  KahfQuiz.defs = KahfQuiz.defs || {};
  KahfQuiz.STR = STR;
  KahfQuiz.shuffle = shuffle; KahfQuiz.pick = pickOne;

  // A quiz's data.js calls define(id, { bank, gen, scenes }); the rest of its settings come from catalog.js.
  KahfQuiz.define = function (id, parts) {
    var meta = (KahfQuiz.catalog || []).filter(function (c) { return c.id === id; })[0] || { id: id };
    var cfg = {}; for (var k in meta) cfg[k] = meta[k]; for (var j in parts) cfg[j] = parts[j];
    KahfQuiz.defs[id] = cfg; KahfQuiz.last = cfg; return cfg;
  };
  KahfQuiz.run = function (id) { return KahfQuiz.play(id ? KahfQuiz.defs[id] : KahfQuiz.last); };

  // ---------- the short bank builder ----------
  // var B = KahfQuiz.bank('rn');  B.c(...); ...  then  KahfQuiz.define('id', { bank: B.list })
  //   text:    'same in both languages'  or  ['English', 'বাংলা']
  //   option:  text, or ['English', 'বাংলা', 'picKey'], or { p: 'picKey' } for a picture with no words
  //   B.c(band, q, [right, wrong, wrong...], why, ref, extra)      choice: the FIRST option is the right one
  //   B.yn(band, q, true|false, why, ref, extra)
  //   B.sort(band, q, [binA, binB], [[en, bn, 0|1, pic], ...], why, ref)
  //   B.order(band, q, [options in the right order], why, ref)
  //   B.match(band, q, [[left, right], ...], why, ref)
  //   B.place(band, q, scene, spotId, why, ref, extra)
  //   B.facts(band, rows, { kind, q(row), a(row), why(row), ref, n })   one choice question per row; wrong answers
  //                                                                     are other rows' answers
  // ids are made from the English question, so they stay the same when questions are added or moved.
  KahfQuiz.bank = function (prefix) {
    var list = [], seen = {};
    function tx(x) { return x == null ? null : typeof x === 'string' ? { en: x, bn: x } : x.length ? { en: x[0], bn: x[1] == null ? x[0] : x[1] } : x; }
    function op(x) {
      if (typeof x === 'string') return { t: tx(x) };
      if (x.length) { var o = { t: tx(x) }; if (x[2]) o.p = x[2]; return o; }
      var r = {}; if (x.t) r.t = tx(x.t); if (x.p) r.p = x.p; return r;
    }
    function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
    function add(type, band, q, why, ref, extra, body, key) {
      var o = { type: type, band: band, q: tx(q), why: tx(why), ref: ref };
      for (var k in body) o[k] = body[k];
      if (extra) for (var e in extra) o[e] = extra[e];
      if (!o.id) { var id = prefix + '-' + hash(type + '|' + o.q.en + '|' + (key || '')); while (seen[id]) id += 'x'; o.id = id; }
      seen[o.id] = 1; list.push(o); return o;
    }
    var B = {
      list: list, tx: tx, op: op,
      c: function (band, q, opts, why, ref, extra) { var a = opts.map(op); return add('choice', band, q, why, ref, extra, { a: a, correct: 0 }, a[0].t ? a[0].t.en : a[0].p); },
      yn: function (band, q, yes, why, ref, extra) { return add('yesno', band, q, why, ref, extra, { yes: !!yes }); },
      sort: function (band, q, bins, items, why, ref, extra) {
        return add('sort', band, q, why, ref, extra, { bins: bins.map(op), items: items.map(function (i) { var o = { t: tx([i[0], i[1]]), bin: i[2] }; if (i[3]) o.p = i[3]; return o; }) });
      },
      order: function (band, q, items, why, ref, extra) { return add('order', band, q, why, ref, extra, { items: items.map(op) }); },
      match: function (band, q, pairs, why, ref, extra) { return add('match', band, q, why, ref, extra, { pairs: pairs.map(function (p) { return { l: op(p[0]), r: op(p[1]) }; }) }, pairs[0][0] + ''); },
      place: function (band, q, scene, spot, why, ref, extra) { return add('place', band, q, why, ref, extra, { scene: scene, correct: spot }, spot); },
      facts: function (band, rows, o) {
        var answers = rows.map(function (r) { return op(o.a(r)); });
        function key(a) { return a.t ? a.t.en : a.p; }
        rows.forEach(function (r, i) {
          if (o.only && !o.only(r)) return;
          var right = answers[i], wrong = [], used = {}; used[key(right)] = 1;
          shuffle(answers).forEach(function (a) { if (wrong.length < (o.n || 3) && !used[key(a)]) { used[key(a)] = 1; wrong.push(a); } });
          var q = add('choice', o.band ? o.band(r) : band, o.q(r), o.why ? o.why(r) : null, typeof o.ref === 'function' ? o.ref(r) : o.ref, o.extra ? o.extra(r) : null,
            { a: [right].concat(wrong), correct: 0 }, o.kind + '|' + key(right));
          if (!q.why) q.why = right.t || q.q;
        });
      },
      // rows in groups of `size` become match questions
      pairs: function (band, rows, o) {
        var size = o.size || 4, rs = o.shuffle === false ? rows : shuffle(rows);
        for (var i = 0; i + size <= rs.length; i += size) {
          var g = rs.slice(i, i + size);
          add('match', band, o.q, o.why, typeof o.ref === 'function' ? o.ref(g) : o.ref, null,
            { pairs: g.map(function (r) { return { l: op(o.l(r)), r: op(o.r(r)) }; }) }, o.kind + '|' + g.map(function (r) { var x = op(o.l(r)); return x.t ? x.t.en : x.p; }).sort().join(','));
        }
      }
    };
    return B;
  };

  // ---------- the rules of a quiz, with no drawing (game.js draws them with Phaser) ----------
  // Saved progress, unchanged from the DOM engine: 'kahf-quiz' { lang, band, opened } is shared by every quiz and
  // the catalog page; 'kahf-quiz-<id>' { m: mastery, stars: { band: { stop: stars } }, cards, best, day } is the quiz's own.
  KahfQuiz.model = function (cfg, Kit) {
    var global = Kit.store('kahf-quiz'), store = Kit.store('kahf-quiz-' + cfg.id);
    var BANDS = cfg.bands || [1, 2, 3];
    var urlLang = (/[?&]lang=(en|bn)\b/.exec(location.search) || [])[1];
    var M = {
      cfg: cfg, BANDS: BANDS, theme: KahfQuiz.theme(cfg.theme), scenes: cfg.scenes || KahfQuiz.scenes || {},
      lang: urlLang || global.get('lang', /^bn/i.test(navigator.language || '') ? 'bn' : 'en'),
      band: global.get('band', 0),
      mastery: store.get('m', {}), starsAll: store.get('stars', {}), lastIds: [], genN: 0, bank: cfg.bank || []
    };
    if (M.band && BANDS.indexOf(M.band) < 0) M.band = BANDS.reduce(function (a, b) { return Math.abs(b - M.band) < Math.abs(a - M.band) ? b : a; });
    var opened = global.get('opened', {}); opened[cfg.id] = today(); global.set('opened', opened);

    M.L = function () { return STR[M.lang] || STR.en; };
    M.T = function (o) { return o == null ? '' : typeof o === 'string' ? o : (o[M.lang] != null ? o[M.lang] : o.en); };
    M.num = function (n) { n = String(n); return M.lang === 'bn' ? n.replace(/\d/g, function (d) { return BN_DIGITS[d]; }) : n; };
    M.setLang = function (l) { M.lang = l; global.set('lang', l); };
    M.setBand = function (b) { M.band = b; global.set('band', b); };
    M.stars = function () { return M.starsAll[M.band] || (M.band ? (M.starsAll[M.band] = {}) : {}); };
    M.isBoss = function (n) { return !cfg.daily && cfg.bossEvery && n % cfg.bossEvery === 0; };
    M.dayDone = function () { return cfg.daily && store.get('day', 0) === today(); };
    M.unlocked = function (n) { return (n === 1 || (M.stars()[n - 1] || 0) > 0) && !(M.dayDone() && !M.stars()[n]); };
    M.nextStop = function () { for (var n = 1; n <= cfg.stops; n++) if (!M.stars()[n]) return n; return cfg.stops; };
    M.doneCount = function (b) { var c = 0, s = b ? (M.starsAll[b] || {}) : M.stars(); for (var n = 1; n <= cfg.stops; n++) if (s[n]) c++; return c; };
    M.totalStars = function () { var t = 0, s = M.stars(); for (var k in s) t += s[k]; return t; };
    M.cards = function () { return store.get('cards', {}); };
    M.best = function () { return (store.get('best', {}))[M.band]; };
    M.item = function (id) { try { window.KahfBridge && window.KahfBridge.item && window.KahfBridge.item(id); } catch (e) {} };

    // stickers: one card for every few stops finished (in any band)
    function cardEvery() { return Math.max(1, Math.floor(cfg.stops / cfg.cards.length)); }
    M.earnCards = function () {
      if (!cfg.cards || !cfg.cards.length) return [];
      var best = Math.max(M.doneCount(1), M.doneCount(2), M.doneCount(3)), have = store.get('cards', {}), fresh = [];
      cfg.cards.forEach(function (c, i) { if (best >= (i + 1) * cardEvery() && !have[c.id]) { have[c.id] = 1; fresh.push(c); } });
      if (fresh.length) store.set('cards', have);
      return fresh;
    };

    // choosing the questions for a stop: unseen first, then the ones still being learned, then mastered ones
    function seen(q) { return (M.mastery[q.id] || [0, 0])[1]; }
    function streak(q) { return (M.mastery[q.id] || [0, 0])[0]; }
    function fromGen(n, o) {
      var out = n > 0 && cfg.gen ? cfg.gen(M.band, n, o) || [] : [];
      out.forEach(function (q) { if (!q.id) q.id = 'g:' + (++M.genN); q.gen = true; });
      return out;
    }
    M.choose = function (n, quick) {
      var band = M.band, bank = M.bank, boss = M.isBoss(n), want = quick ? 10 : cfg.daily ? 5 : boss ? 10 : PER_STOP[band];
      var pool = bank.filter(function (q) { return inBand(q, band) && (!quick || q.type === 'choice' || q.type === 'yesno'); });
      var nGen = cfg.gen ? (pool.length ? Math.round(want * (cfg.genShare == null ? 0.5 : cfg.genShare)) : want) : 0;
      var take = want - nGen;
      var scored = shuffle(pool).map(function (q) {
        var s = streak(q) >= 2 ? 100 + seen(q) : seen(q) === 0 ? 0 : 10 + seen(q) - (streak(q) === 0 ? 5 : 0);
        if (quick) s = seen(q) ? 0 : 50;                // the quick round prefers questions already met
        if (M.lastIds.indexOf(q.id) >= 0) s += 50;
        return { q: q, s: s };
      }).sort(function (a, b) { return a.s - b.s; });
      var out = [], types = {}, cap = Math.ceil(take / 2);
      scored.forEach(function (o) {
        if (out.length >= take) return;
        var t = o.q.type;
        if (!quick && (types[t] || 0) >= cap) return;
        types[t] = (types[t] || 0) + 1; out.push(o.q);
      });
      scored.forEach(function (o) { if (out.length < take && out.indexOf(o.q) < 0) out.push(o.q); });
      if (boss && band < 3 && BANDS.indexOf(band + 1) >= 0) {   // a boss stop mixes in a few from the next band up
        var harder = shuffle(bank.filter(function (q) { return inBand(q, band + 1) && !inBand(q, band); })).slice(0, 2);
        out = out.slice(0, Math.max(0, take - harder.length)).concat(harder);
      }
      out = shuffle(out.concat(fromGen(Math.max(0, want - out.length), { boss: boss, stop: n, quick: !!quick })));
      var force = (/[?&]q=([\w:-]+)/.exec(location.search) || [])[1];      // ?q=<id> puts one question first (for checking)
      if (force) bank.forEach(function (q) { if (q.id === force) { out = out.filter(function (o) { return o !== q; }); out.unshift(q); } });
      return out;
    };
    // a stop ended: firstTry is { id: right the first time }. Returns { stars, fresh: [new sticker cards] }
    M.finish = function (n, firstTry, total) {
      var right = 0;
      for (var id in firstTry) {
        if (firstTry[id]) right++;
        if (id.indexOf('g:') === 0) continue;            // made-up questions are new every time
        var m = M.mastery[id] || [0, 0];
        M.mastery[id] = [firstTry[id] ? Math.min(2, m[0] + 1) : 0, m[1] + 1];
      }
      var st = right === total ? 3 : right >= total * 0.6 ? 2 : 1;
      if (st > (M.stars()[n] || 0)) M.stars()[n] = st;
      store.set('m', M.mastery); store.set('stars', M.starsAll);
      if (cfg.daily) store.set('day', today());
      M.lastIds = Object.keys(firstTry);
      return { stars: st, fresh: M.earnCards() };
    };
    // the lightning round ended after ms: returns { best: new best?, old: the best before }
    M.finishQuick = function (ms) {
      var bests = store.get('best', {}), old = bests[M.band], isBest = !old || ms < old;
      if (isBest) { bests[M.band] = ms; store.set('best', bests); }
      return { best: isBest, old: old };
    };
    M.fmtTime = function (ms) { var s = Math.floor(ms / 1000), m = Math.floor(s / 60); return M.num(m) + ':' + M.num(('0' + (s % 60)).slice(-2)); };
    return M;
  };
  KahfQuiz.isArabic = isArabic;


  // and (if the quiz asks for it) a source reference. Returns a list of problems; empty means clean.
  KahfQuiz.check = function (bank, needRef, picKeys, scenes) {
    var bad = [], ids = {}, pics = {};
    (picKeys || []).forEach(function (k) { pics[k] = 1; }); scenes = scenes || KahfQuiz.scenes || {};
    function both(o, where) { if (!o || !o.en || !o.bn) bad.push(where + ': needs en and bn'); }
    function opt(o, where) { if (!o.p) both(o.t, where); else if (!pics[o.p]) bad.push(where + ': no picture "' + o.p + '"'); }
    bank.forEach(function (q, i) {
      var w = q.id || ('#' + i);
      if (!q.id) bad.push(w + ': no id'); else if (ids[q.id]) bad.push(w + ': duplicate id'); ids[q.id] = 1;
      if (!q.band) bad.push(w + ': no band');
      if (needRef && !q.ref) bad.push(w + ': no ref');
      both(q.q, w + ' q'); both(q.why, w + ' why');
      if (q.qp && !pics[q.qp]) bad.push(w + ': no picture "' + q.qp + '"');
      if (q.type === 'choice') {
        if (!(q.correct >= 0 && q.correct < q.a.length)) bad.push(w + ': bad correct');
        if (q.a.length < 2) bad.push(w + ': needs 2+ options');
        var seen = {}; q.a.forEach(function (a) { opt(a, w + ' a'); var k = a.t ? a.t.en : a.p; if (seen[k]) bad.push(w + ': repeated option ' + k); seen[k] = 1; });
      }
      else if (q.type === 'yesno') { if (typeof q.yes !== 'boolean') bad.push(w + ': yes must be true/false'); }
      else if (q.type === 'sort') { q.bins.forEach(function (b) { both(b.t, w + ' bin'); }); q.items.forEach(function (it) { opt(it, w + ' item'); if (it.bin !== 0 && it.bin !== 1) bad.push(w + ': bad bin'); }); }
      else if (q.type === 'order') { if (q.items.length < 3) bad.push(w + ': order needs 3+'); q.items.forEach(function (it) { opt(it, w + ' item'); }); }
      else if (q.type === 'match') { if (q.pairs.length < 2) bad.push(w + ': match needs 2+'); q.pairs.forEach(function (p) { opt(p.l, w + ' pair'); opt(p.r, w + ' pair'); }); }
      else if (q.type === 'place') { var sc = scenes[q.scene]; if (!sc) bad.push(w + ': no scene ' + q.scene); else if (!sc.spots[q.correct]) bad.push(w + ': no spot ' + q.correct); }
      else bad.push(w + ': unknown type ' + q.type);
    });
    return bad;
  };
})();
