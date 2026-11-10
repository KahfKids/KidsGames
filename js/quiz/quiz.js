/* Kahf KidsGames quiz engine: quiz.js
   One engine for every quiz in the catalog. A quiz is a line in catalog.js (name, theme, stops, stickers) plus a
   data.js that hands over its question bank with KahfQuiz.define(id, { bank }). The page then calls KahfQuiz.run().
   The engine runs the journey map, the stops, seven question types, stars, mastery, three age bands, two
   languages, stickers, the lightning round, Today's five and the Kahf activity bridge calls.

   Needs kit/core.js, kit/fx.js, kit/audio.js, kit/ui.js, quiz.css, themes.js and catalog.js.
   Every picture is a WebP image in js/quiz/img/ (made by tools/quiz-art/build.js), so the WebView only decodes
   small bitmaps and never draws vector art. No network beyond this folder, no dependencies.

   Bridge rules (docs/quiz-quality-plan.md, section 8):
     answer()    once per question, when the child commits an answer. Never for hints, reveals or replays.
     complete()  once at the end of every stop, lightning round and Today's five.
     item(id)    when a sticker card is opened.
   Sounds and praise use WebAudio, so the bridge's media_done fires only for real listening (an ayah played
   through an <audio> element to its end).

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
  var Kit = window.Kit;
  var IMG = ((document.currentScript && document.currentScript.src) || '/KidsGames/js/quiz/quiz.js').replace(/[^\/]*$/, '') + 'img/';

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
      todayDone: 'Today is done. Five new questions tomorrow!', tryBand: 'Try'
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
      todayDone: 'আজকের পাঁচ শেষ। কাল নতুন পাঁচটি প্রশ্ন!', tryBand: 'চেষ্টা করো'
    }
  };
  var BN_DIGITS = '০১২৩৪৫৬৭৮৯';
  var PER_STOP = { 1: 4, 2: 6, 3: 8 };

  var S = 'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
  var S2 = S.replace('"3"', '"2.2"');
  var ICON = {
    check: '<svg viewBox="0 0 24 24" ' + S + '><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    cross: '<svg viewBox="0 0 24 24" ' + S + '><path d="M6 6l12 12M18 6L6 18"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" ' + S2 + '><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.3 1 2.2h5.2c0-.9.4-1.7 1-2.2A6 6 0 0 0 12 3z"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 2L5 13.5h5.5L9.5 22 19 10h-5.8z"/></svg>',
    book: '<svg viewBox="0 0 24 24" ' + S2 + '><path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5v13"/></svg>',
    // age bands: a sprout, a compass, a mountain flag (no faces)
    band1: '<svg viewBox="0 0 60 60"><path d="M30 54V30" stroke="#3c8f52" stroke-width="5" stroke-linecap="round"/><path d="M30 34C18 34 12 26 12 16c12 0 18 8 18 18z" fill="#6fcf7f"/><path d="M30 28c0-11 6-18 18-18 0 11-6 18-18 18z" fill="#9be08f"/><ellipse cx="30" cy="54" rx="16" ry="4" fill="#8a5a2b"/></svg>',
    band2: '<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="24" fill="#fff3d6" stroke="#c98a2b" stroke-width="5"/><path d="M38 22l-5 11-11 5 5-11z" fill="#e0566b"/><path d="M38 22l-11 5 6 6z" fill="#3b6fd1"/><circle cx="30" cy="30" r="2.6" fill="#2a1c4a"/></svg>',
    band3: '<svg viewBox="0 0 60 60"><path d="M4 52L24 20l10 14 6-8 16 26z" fill="#7d6bd6"/><path d="M24 20l6 8.5-5 3-4-3-3.5 2z" fill="#fff"/><path d="M40 26V8" stroke="#fff3d6" stroke-width="3" stroke-linecap="round"/><path d="M40 8l13 4.5L40 17z" fill="#f6c453"/></svg>'
  };

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pickOne(a) { return a[(Math.random() * a.length) | 0]; }
  function inBand(q, b) { return q.band === b || (q.band && q.band.indexOf && q.band.indexOf(b) >= 0); }
  function isArabic(s) { return /[؀-ۿ]/.test(s) && !/[A-Za-zঀ-৿]/.test(s); }
  function today() { var d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }

  var KahfQuiz = window.KahfQuiz = window.KahfQuiz || {};
  KahfQuiz.defs = KahfQuiz.defs || {};
  KahfQuiz.shuffle = shuffle; KahfQuiz.pick = pickOne;

  // A quiz's data.js calls define(id, { bank, gen, scenes }); the rest of its settings come from catalog.js.
  KahfQuiz.define = function (id, parts) {
    var meta = (KahfQuiz.catalog || []).filter(function (c) { return c.id === id; })[0] || { id: id };
    var cfg = {}; for (var k in meta) cfg[k] = meta[k]; for (var j in parts) cfg[j] = parts[j];
    KahfQuiz.defs[id] = cfg; KahfQuiz.last = cfg; return cfg;
  };
  KahfQuiz.run = function (id) { return KahfQuiz.start(id ? KahfQuiz.defs[id] : KahfQuiz.last); };

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

  KahfQuiz.start = function (cfg) {
    var global = Kit.store('kahf-quiz');               // shared by every quiz and the catalog page
    var store = Kit.store('kahf-quiz-' + cfg.id);
    var theme = KahfQuiz.theme(cfg.theme);
    var SCENES = cfg.scenes || KahfQuiz.scenes || {};
    var BANDS = cfg.bands || [1, 2, 3];
    var urlLang = (/[?&]lang=(en|bn)\b/.exec(location.search) || [])[1];
    var lang = urlLang || global.get('lang', /^bn/i.test(navigator.language || '') ? 'bn' : 'en');
    var band = global.get('band', 0);
    if (band && BANDS.indexOf(band) < 0) band = BANDS.reduce(function (a, b) { return Math.abs(b - band) < Math.abs(a - band) ? b : a; });
    var mastery = store.get('m', {});                  // id -> [first-try streak 0..2, times seen]
    var starsAll = store.get('stars', {});             // band -> { stop: stars }
    var lastIds = [], genN = 0;
    var bank = cfg.bank || [];
    var root = el('div', 'qz-root'); document.body.appendChild(root);
    if (theme.palette) for (var pv in theme.palette) document.documentElement.style.setProperty(pv, theme.palette[pv]);
    var opened = global.get('opened', {}); opened[cfg.id] = today(); global.set('opened', opened);

    function L() { return STR[lang] || STR.en; }
    function T(o) { return o == null ? '' : typeof o === 'string' ? o : (o[lang] != null ? o[lang] : o.en); }
    function num(n) { n = String(n); return lang === 'bn' ? n.replace(/\d/g, function (d) { return BN_DIGITS[d]; }) : n; }
    function img(file) { return '<img src="' + IMG + file + '.webp" alt="" draggable="false" decoding="async">'; }
    function pic(key, cls) { return key ? '<span class="' + (cls || 'pic') + '">' + img('p/' + key) + '</span>' : ''; }
    function preload(q) {                                 // fetch a question's pictures before it is shown
      if (!q) return;
      var keys = [q.qp];
      (q.a || []).concat(q.items || [], q.bins || []).forEach(function (o) { keys.push(o.p); });
      (q.pairs || []).forEach(function (p) { keys.push(p.l.p, p.r.p); });
      if (q.scene && SCENES[q.scene]) (new Image()).src = IMG + 'scene/' + q.scene + '.webp';
      keys.forEach(function (k) { if (k) (new Image()).src = IMG + 'p/' + k + '.webp'; });
    }
    function txt(o) { var s = T(o); return s ? '<span' + (isArabic(s) ? ' class="ar" lang="ar"' : '') + '>' + esc(s) + '</span>' : ''; }
    function stars() { return starsAll[band] || (band ? (starsAll[band] = {}) : {}); }
    function isBoss(n) { return !cfg.daily && cfg.bossEvery && n % cfg.bossEvery === 0; }
    function dayDone() { return cfg.daily && store.get('day', 0) === today(); }
    function unlocked(n) { return (n === 1 || (stars()[n - 1] || 0) > 0) && !(dayDone() && !stars()[n]); }
    function nextStop() { for (var n = 1; n <= cfg.stops; n++) if (!stars()[n]) return n; return cfg.stops; }
    function doneCount(b) { var c = 0, s = b ? (starsAll[b] || {}) : stars(); for (var n = 1; n <= cfg.stops; n++) if (s[n]) c++; return c; }
    function totalStars() { var t = 0, s = stars(); for (var k in s) t += s[k]; return t; }
    function item(id) { try { window.KahfBridge && window.KahfBridge.item && window.KahfBridge.item(id); } catch (e) {} }

    // ---------- effects canvas: runs only while particles are alive ----------
    var fxCanvas = el('canvas', 'qz-fx'); document.body.appendChild(fxCanvas);
    var stage = Kit.stage(fxCanvas), fxOn = false, fxLast = 0;
    function fxFrame(now) {
      var dt = Math.min(0.05, fxLast ? (now - fxLast) / 1000 : 0.016); fxLast = now;
      Kit.fx.update(dt);
      var c = stage.ctx; c.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0); c.clearRect(0, 0, stage.w, stage.h);
      Kit.fx.draw(c);
      if (Kit.fx.count() > 0 && !document.hidden) requestAnimationFrame(fxFrame);
      else { fxOn = false; fxLast = 0; Kit.fx.clear(); c.clearRect(0, 0, stage.w, stage.h); }
    }
    function fxKick() { if (!fxOn) { fxOn = true; requestAnimationFrame(fxFrame); } }
    var CONFETTI = theme.confetti || ['#f6c453', '#ffe9a8', '#7fd6c2', '#ff9d7a', '#ffffff'];
    function sparkleAt(node, n) {
      if (!node) return;
      var r = node.getBoundingClientRect();
      Kit.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: n || 14, colors: CONFETTI, shape: 'star', speed: 260, size: 12, life: 0.7, gravity: 500 });
      fxKick();
    }
    function confetti() {
      for (var i = 0; i < 5; i++) Kit.fx.burst(stage.w * (0.15 + 0.175 * i), stage.h * 0.3, { n: 16, colors: CONFETTI, shape: i % 2 ? 'star' : 'shard', speed: 420, size: 12, life: 1.3, gravity: 620, spread: 2.4, angle: -1.57 });
      fxKick();
    }

    // ---------- voice (only if the device has one for this language) ----------
    function canSpeak() { return !!(Kit.say && Kit.say.has(lang)) && !Kit.sfx.muted; }
    function speak(text) { if (canSpeak()) Kit.say.text(text, lang, { rate: 0.9 }); }

    // ---------- HUD on the map ----------
    if (Kit.host && Kit.host.isNative()) {
      var exitBtn = Kit.ui.iconButton('back', L().exit, Kit.host.exit);
      exitBtn.classList.add('qz-exit');
      exitBtn.insertAdjacentHTML('beforeend', '<span>' + L().exit + '</span>');
    }
    var hudTitle = Kit.ui.pill('');
    hudTitle.classList.add('qz-title');
    Kit.ui.spacer();
    var hudStars = Kit.ui.pill('');
    var hud = hudTitle.parentNode;
    var cardBtn = null, boltBtn = null;
    if (cfg.cards && cfg.cards.length) { cardBtn = Kit.ui.iconButton(ICON.book, 'Stickers', stickerSheet); cardBtn.classList.add('qz-hud-btn'); }
    if (!cfg.daily) { boltBtn = Kit.ui.iconButton(ICON.bolt, 'Lightning round', lightningSheet); boltBtn.classList.add('qz-hud-btn', 'qz-bolt'); }
    var bandChip = el('button', 'qz-chip'); hud.appendChild(bandChip);
    bandChip.onclick = function () { Kit.sfx.play('tap'); bandSheet(true); };
    var soundBtn = Kit.ui.iconButton(Kit.sfx.muted ? 'soundOff' : 'sound', 'Sound', function () {
      var m = Kit.sfx.toggle(); soundBtn.setIcon(m ? 'soundOff' : 'sound');
    });
    function refreshHud() {
      hudTitle.set(esc(T(cfg.title)));
      hudStars.set(Kit.starSvg() + '<span>' + num(totalStars()) + '</span>');
      bandChip.hidden = !band;
      bandChip.innerHTML = (ICON['band' + band] || '') + '<span>' + esc(L().bands[band - 1] || '') + '</span>';
      root.className = 'qz-root qz-b' + band;
      bandChip.setAttribute('aria-label', L().bandTitle);
      if (boltBtn) boltBtn.hidden = !(band >= 2 && doneCount() >= 1);
      if (cardBtn) { cardBtn.setAttribute('aria-label', L().stickers); cardBtn.classList.toggle('has', Object.keys(store.get('cards', {})).length > 0); }
      document.documentElement.lang = lang;
    }

    // ---------- the map ----------
    var sky = el('div', 'qz-sky'); root.appendChild(sky);   // fixed backdrop behind the scrolling map
    var map = el('div', 'qz-map'), mapIn = el('div', 'qz-map-in'), mapBg = el('div', 'qz-map-bg');
    map.appendChild(mapIn); mapIn.appendChild(mapBg); root.appendChild(map);
    var playBtn = el('button', 'kit-btn primary qz-play'); root.appendChild(playBtn);
    playBtn.onclick = function () { if (dayDone()) { Kit.sfx.play('locked'); return; } Kit.sfx.play('tap'); startStop(nextStop()); };
    var GAP = 118, PAD_TOP = 150, PAD_BOT = 190, stopEls = [];
    function stopPos(n, w) {
      var amp = Math.min(w * 0.3, 190);
      return { x: w / 2 + Math.sin((n - 1) * 0.95) * amp, y: PAD_TOP + (cfg.stops - n) * GAP + 54 };
    }
    function buildMap() {
      var w = Math.min(map.clientWidth || innerWidth, 760), h = PAD_TOP + cfg.stops * GAP + PAD_BOT;
      mapIn.style.width = w + 'px'; mapIn.style.height = h + 'px';
      var nx = nextStop(), pts = [];
      for (var i = 1; i <= cfg.stops; i++) pts.push(stopPos(i, w));
      // the path between stops is a row of small dots (plain elements, no vector drawing)
      var dots = '';
      for (var k = 1; k < pts.length; k++) {
        var a = pts[k - 1], b = pts[k], my = (a.y + b.y) / 2;
        for (var j = 1; j < 9; j++) {
          var t = j / 9, u = 1 - t;
          var x = u * u * u * a.x + 3 * u * u * t * a.x + 3 * u * t * t * b.x + t * t * t * b.x;
          var y = u * u * u * a.y + 3 * u * u * t * my + 3 * u * t * t * my + t * t * t * b.y;
          if (Math.abs(y - a.y) < 46 || Math.abs(y - b.y) < 50) continue;   // keep clear of the stops
          dots += '<i style="left:' + x.toFixed(0) + 'px;top:' + y.toFixed(0) + 'px"></i>';
        }
      }
      var orb = theme.orb === 'moon' ? 'sky/moon-' + Math.min(29, doneCount() + 1) : theme.orb ? 'sky/' + theme.orb : '';
      sky.innerHTML = (theme.sky ? '<div class="qz-sky-tile" style="background-image:url(' + IMG + 'sky/' + theme.sky + '.webp)"></div>' : '') +
        (orb ? '<span class="qz-orb qz-hide-play">' + img(orb) + '</span>' : '');
      mapBg.innerHTML = '<span class="qz-decor">' + img('decor/' + theme.name) + '</span><div class="qz-dots" style="color:' + (theme.path || 'rgba(255,233,168,.55)') + '">' + dots + '</div>';
      stopEls.forEach(function (b) { b.remove(); }); stopEls = [];
      for (var n = 1; n <= cfg.stops; n++) (function (n) {
        var st = stars()[n] || 0, open = unlocked(n), boss = isBoss(n), p = pts[n - 1];
        var b = el('button', 'qz-stop' + (open ? '' : ' locked') + (boss ? ' boss' : '') + (n === nx && !st && open ? ' next' : ''));
        b.style.left = p.x + 'px'; b.style.top = p.y + 'px';
        var s = '';
        if (st) for (var i = 0; i < 3; i++) s += Kit.starSvg(i < st ? '#f6c453' : 'rgba(255,255,255,.2)');
        b.innerHTML = '<span class="pic">' + img('stop/' + theme.name + '-' + (st ? 'lit' : open ? 'open' : 'locked') + (boss ? '-b' : '')) + '</span><span class="n">' + num(n) + '</span><span class="st">' + s + '</span>';
        b.setAttribute('aria-label', T(cfg.stopName) + ' ' + n + (open ? '' : ' (locked)'));
        b.onclick = function () {
          if (!open) { b.querySelector('.pic').animate([{ transform: 'rotate(-8deg)' }, { transform: 'rotate(8deg)' }, { transform: 'none' }], { duration: 260 }); Kit.sfx.play('locked'); return; }
          Kit.sfx.play('tap'); startStop(n);
        };
        mapIn.appendChild(b); stopEls.push(b);
      })(n);
      playBtn.innerHTML = dayDone() ? '<span>' + esc(L().tomorrow) + '</span>' : Kit.icons.play + '<span>' + esc(T(cfg.stopName)) + ' ' + num(nx) + '</span>';
      playBtn.classList.toggle('off', !!dayDone());
      refreshHud();
    }
    function showMap(scrollTo) {
      stopClock(); stopAudio();
      screen && screen.remove(); screen = null; hideFb();
      map.hidden = false; playBtn.hidden = false; hud.hidden = false; sky.classList.remove('playing');
      buildMap();
      var n = scrollTo || nextStop(), p = stopPos(n, mapIn.clientWidth);
      map.scrollTop = Math.max(0, p.y - map.clientHeight * 0.55);
    }
    var rz = null;
    addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (!map.hidden) buildMap(); }, 120); });

    // ---------- band and language sheet ----------
    function bandSheet(closeable) {
      var box = el('div'), bands = el('div', 'qz-bands'), langs = el('div', 'qz-langs');
      function fill() {
        bands.innerHTML = ''; langs.innerHTML = '';
        BANDS.forEach(function (b) {
          var btn = el('button', 'qz-band' + (b === band ? ' on' : ''), ICON['band' + b] + '<span>' + esc(L().bands[b - 1]) + '<small>' + esc(L().ages[b - 1]) + '</small></span>');
          btn.onclick = function () {
            Kit.sfx.play('tap'); band = b; global.set('band', b); sh.close(); showMap();
          };
          bands.appendChild(btn);
        });
        [['en', 'English'], ['bn', 'বাংলা']].forEach(function (l) {
          var btn = el('button', l[0] === lang ? 'on' : '', l[1]);
          btn.onclick = function () { Kit.sfx.play('tap'); lang = l[0]; global.set('lang', lang); title.textContent = L().bandTitle; fill(); if (band) buildMap(); };
          langs.appendChild(btn);
        });
      }
      box.appendChild(langs); box.appendChild(bands);
      var sh = Kit.ui.sheet({ title: L().bandTitle, content: box, closeable: closeable, exit: !closeable });
      var title = sh.el.querySelector('h2');
      fill();
    }

    // ---------- stickers: one card for every few stops finished (in any band) ----------
    function cardEvery() { return Math.max(1, Math.floor(cfg.stops / cfg.cards.length)); }
    function earnCards() {
      if (!cfg.cards || !cfg.cards.length) return [];
      var best = Math.max(doneCount(1), doneCount(2), doneCount(3)), have = store.get('cards', {}), fresh = [];
      cfg.cards.forEach(function (c, i) { if (best >= (i + 1) * cardEvery() && !have[c.id]) { have[c.id] = 1; fresh.push(c); } });
      if (fresh.length) store.set('cards', have);
      return fresh;
    }
    function cardFace(c) { return pic(c.p) + '<b>' + esc(T(c.t)) + '</b>'; }
    function openCard(c) {
      item(cfg.id + ':' + c.id);
      var box = el('div', 'qz-card-big', pic(c.p) + (c.d ? '<p>' + esc(T(c.d)) + '</p>' : ''));
      Kit.ui.sheet({ title: esc(T(c.t)), content: box, closeable: true, buttons: [{ label: L().stickers, icon: 'levels', onClick: stickerSheet }] });
      if (c.d) speak(T(c.d));
    }
    function stickerSheet() {
      var have = store.get('cards', {}), grid = el('div', 'qz-stickers');
      var sh = Kit.ui.sheet({ title: L().stickers, content: grid, closeable: true });
      cfg.cards.forEach(function (c) {
        var b = el('button', 'qz-sticker' + (have[c.id] ? '' : ' off'), have[c.id] ? cardFace(c) : pic(c.p) + '<b>?</b>');
        b.onclick = function () {
          if (!have[c.id]) { Kit.sfx.play('locked'); b.animate([{ transform: 'rotate(-5deg)' }, { transform: 'rotate(5deg)' }, { transform: 'none' }], { duration: 260 }); return; }
          Kit.sfx.play('tap'); sh.close(); openCard(c);
        };
        grid.appendChild(b);
      });
      grid.appendChild(el('p', 'qz-note', esc(L().stickerLocked)));
    }

    // ---------- lightning round: ten quick questions against your own best time ----------
    function fmtTime(ms) { var s = Math.floor(ms / 1000), m = Math.floor(s / 60); return num(m) + ':' + num(('0' + (s % 60)).slice(-2)); }
    function lightningSheet() {
      var best = (store.get('best', {}))[band];
      Kit.ui.sheet({ title: L().lightning, text: L().lightningText + (best ? ' ' + L().best + ': ' + fmtTime(best) : ''), closeable: true,
        buttons: [{ label: L().go, icon: 'play', primary: true, onClick: function () { startStop(0, true); } }] });
    }
    var clock = null;
    function stopClock() { if (clock) { clearInterval(clock); clock = null; } }

    // ---------- choosing the questions for a stop ----------
    function seen(q) { return (mastery[q.id] || [0, 0])[1]; }
    function streak(q) { return (mastery[q.id] || [0, 0])[0]; }
    function fromGen(n, o) {
      var out = n > 0 && cfg.gen ? cfg.gen(band, n, o) || [] : [];
      out.forEach(function (q) { if (!q.id) q.id = 'g:' + (++genN); q.gen = true; });
      return out;
    }
    function choose(n, quick) {
      var boss = isBoss(n), want = quick ? 10 : cfg.daily ? 5 : boss ? 10 : PER_STOP[band];
      var pool = bank.filter(function (q) { return inBand(q, band) && (!quick || q.type === 'choice' || q.type === 'yesno'); });
      var nGen = cfg.gen ? (pool.length ? Math.round(want * (cfg.genShare == null ? 0.5 : cfg.genShare)) : want) : 0;
      var take = want - nGen;
      // unseen first, then the ones still being learned, then mastered ones; never last stop's questions if avoidable
      var scored = shuffle(pool).map(function (q) {
        var s = streak(q) >= 2 ? 100 + seen(q) : seen(q) === 0 ? 0 : 10 + seen(q) - (streak(q) === 0 ? 5 : 0);
        if (quick) s = seen(q) ? 0 : 50;                // the quick round prefers questions already met
        if (lastIds.indexOf(q.id) >= 0) s += 50;
        return { q: q, s: s };
      }).sort(function (a, b) { return a.s - b.s; });
      var out = [], types = {};
      var cap = Math.ceil(take / 2);
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
    }

    // ---------- playing a stop ----------
    var screen = null, fb = null, audio = null;
    function hideFb() { if (screen) screen.style.paddingBottom = ''; if (fb) { var f = fb; fb = null; f.classList.remove('in'); setTimeout(function () { f.remove(); }, 320); } }
    function stopAudio() { if (audio) { try { audio.pause(); } catch (e) {} audio = null; } }

    function startStop(n, quick) {
      if (Kit.say) Kit.say.stop();
      var queue = choose(n, quick), total = queue.length, firstTry = {}, pos = 0, retried = {}, slotOf = {}, t0 = 0;
      if (!total) return;
      queue.forEach(function (q, i) { slotOf[q.id] = i; });
      map.hidden = true; playBtn.hidden = true; hud.hidden = true; sky.classList.add('playing');
      screen = el('div', 'qz-play-screen');
      var top = el('div', 'qz-top'), bar = el('div', 'qz-bar'), body = el('div', 'qz-body');
      var x = el('button', 'kit-btn-icon', Kit.icons.close); x.setAttribute('aria-label', L().quit);
      x.onclick = function () {
        Kit.sfx.play('tap');
        if (quick || (pos === 0 && !Object.keys(firstTry).length)) return showMap(n || undefined);
        Kit.ui.sheet({ title: L().leave, text: L().leaveText, buttons: [
          { label: L().stay, primary: true }, { label: L().quit, onClick: function () { showMap(n); } }] });
      };
      for (var i = 0; i < total; i++) bar.appendChild(el('i'));
      var snd = el('button', 'kit-btn-icon', Kit.icons[Kit.sfx.muted ? 'soundOff' : 'sound']); snd.setAttribute('aria-label', 'Sound');
      snd.onclick = function () { var m = Kit.sfx.toggle(); snd.innerHTML = Kit.icons[m ? 'soundOff' : 'sound']; soundBtn.setIcon(m ? 'soundOff' : 'sound'); };
      top.appendChild(x); top.appendChild(bar);
      if (quick) {
        var tm = el('div', 'qz-time', fmtTime(0)); top.appendChild(tm);
        t0 = Date.now(); stopClock(); clock = setInterval(function () { tm.textContent = fmtTime(Date.now() - t0); }, 250);
      }
      top.appendChild(snd);
      screen.appendChild(top); screen.appendChild(body); root.appendChild(screen);

      function mark() {
        [].forEach.call(bar.children, function (s, i) {
          var id = queue.filter(function (q) { return slotOf[q.id] === i; })[0].id;
          s.className = firstTry[id] === true || retried[id] === true ? 'done' : firstTry[id] === false ? 'miss' : '';
        });
        var cur = queue[pos]; if (cur) bar.children[slotOf[cur.id]].classList.add('cur');
      }

      function ask() {
        var q = queue[pos];
        stopAudio();
        if (!q) return finish();
        mark(); preload(queue[pos + 1]);
        body.innerHTML = '';
        var qbox = el('div', 'qz-q', (q.qp ? pic(q.qp, 'qpic') : '') + '<div class="qt">' + esc(T(q.q)) + (q.ar ? '<span class="ar" lang="ar">' + esc(q.ar) + '</span>' : '') +
          (L()[q.type] ? '<small>' + esc(L()[q.type]) + '</small>' : '') + '</div>');
        if (q.audio) {
          var clips = [].concat(q.audio), ci = 0, au = el('audio'); au.preload = 'auto'; au.src = clips[0];
          au.addEventListener('ended', function () { ci++; if (ci < clips.length) { au.src = clips[ci]; au.play().catch(function () {}); } else { ci = 0; lb.classList.remove('on'); } });
          var lb = el('button', 'kit-btn qz-listen', Kit.icons.sound + '<span>' + esc(L().listen) + '</span>');
          var playIt = function () { ci = 0; au.src = clips[0]; lb.classList.add('on'); au.play().catch(function () { lb.classList.remove('on'); }); };
          lb.onclick = playIt;
          qbox.querySelector('.qt').appendChild(lb); qbox.appendChild(au); audio = au;
          setTimeout(function () { if (queue[pos] === q && audio === au) playIt(); }, 300);
          var nq = queue[pos + 1]; if (nq && nq.audio) { var pre = new Audio(); pre.preload = 'auto'; pre.src = [].concat(nq.audio)[0]; }
        } else if (canSpeak()) {
          var sp = el('button', 'kit-btn-icon qz-speak', Kit.icons.sound); sp.setAttribute('aria-label', L().listen);
          sp.onclick = function () { speak(T(q.q)); };
          qbox.appendChild(sp);
          if (band === 1 && !quick) setTimeout(function () { if (queue[pos] === q && !fb) speak(T(q.q)); }, 350);
        }
        var area = el('div', 'qz-area');
        body.appendChild(qbox); body.appendChild(area);
        TYPES[q.type](q, area, function (ok, node) { commit(q, ok, node); });
      }

      function commit(q, ok, node) {
        Kit.bridge.answer();
        var again = q.id in firstTry;
        if (again) retried[q.id] = ok; else firstTry[q.id] = ok;
        if (ok) {
          Kit.sfx.play('correct'); Kit.buzz(8); sparkleAt(node);
          if (!again && !quick && Kit.say) Kit.say.praise(pickOne(cfg.praise || ['mashaallah', 'ahsant', 'barakallah']));
        } else { Kit.sfx.play('wrong'); Kit.buzz(20); }
        // a missed question comes back once at the end of the stop (in the quick round, until it is right)
        if (!ok && (!again || quick)) queue.push(q);
        mark();
        if (quick && ok) return setTimeout(function () { if (screen) { pos++; ask(); } }, 420);
        showFb(q, ok, function () { pos++; ask(); });
      }

      function showFb(q, ok, next) {
        hideFb();
        var f = fb = el('div', 'qz-fb ' + (ok ? 'good' : 'bad'));
        var multi = q.type === 'sort' || q.type === 'order' || q.type === 'match';
        f.innerHTML = '<div class="qz-fb-in"><div class="mark">' + (ok ? ICON.check : multi ? ICON.bulb : ICON.cross) + '</div><div class="txt"><div class="head">' +
          esc(ok ? pickOne(L().good) : multi ? L().learned : L().bad) + '</div>' + (q.why ? '<div class="why">' + esc(T(q.why)) + '</div>' : '') +
          (q.ref ? '<div class="ref">' + esc(L().source) + ': ' + esc(q.ref) + '</div>' : '') + '</div></div>';
        var btn = el('button', 'kit-btn primary', Kit.icons.next); btn.setAttribute('aria-label', L().next);
        btn.onclick = function () { if (fb !== f) return; Kit.sfx.play('tap'); if (Kit.say) Kit.say.stop(); hideFb(); next(); };
        f.firstChild.appendChild(btn);
        root.appendChild(f);
        requestAnimationFrame(function () { requestAnimationFrame(function () {
          f.classList.add('in');
          if (screen && fb === f) screen.style.paddingBottom = (f.offsetHeight + 8) + 'px';   // keep the answers clear of the bar
        }); });
        if (!ok && q.why && band === 1) setTimeout(function () { if (fb === f) speak(T(q.why)); }, 500);
      }

      function leavePlay() {
        stopClock(); stopAudio();
        screen.remove(); screen = null; map.hidden = false; sky.classList.remove('playing'); buildMap();
        playBtn.hidden = true;
      }

      function finishQuick() {
        var ms = Date.now() - t0, bests = store.get('best', {}), old = bests[band], isBest = !old || ms < old;
        if (isBest) { bests[band] = ms; store.set('best', bests); }
        Kit.bridge.complete(); Kit.sfx.play('win'); if (isBest) confetti();
        leavePlay();
        Kit.ui.sheet({ title: isBest && old ? L().newBest : L().done, text: L().time + ': ' + fmtTime(ms) + (old ? ' · ' + L().best + ': ' + fmtTime(Math.min(old, ms)) : ''), buttons: [
          { label: L().again, icon: 'restart', primary: true, onClick: function () { startStop(0, true); } },
          { label: L().map, icon: 'levels', onClick: function () { showMap(); } }] });
      }

      function finish() {
        if (quick) return finishQuick();
        var right = 0;
        for (var id in firstTry) {
          if (firstTry[id]) right++;
          if (id.indexOf('g:') === 0) continue;            // made-up questions are new every time
          var m = mastery[id] || [0, 0];
          mastery[id] = [firstTry[id] ? Math.min(2, m[0] + 1) : 0, m[1] + 1];
        }
        var st = right === total ? 3 : right >= total * 0.6 ? 2 : 1;
        if (st > (stars()[n] || 0)) stars()[n] = st;
        store.set('m', mastery); store.set('stars', starsAll);
        if (cfg.daily) store.set('day', today());
        lastIds = Object.keys(firstTry);
        var fresh = earnCards();
        Kit.bridge.complete();
        Kit.sfx.play('win'); confetti();
        var last = n >= cfg.stops || cfg.daily, buttons = [], content = null;
        if (!last) buttons.push({ label: T(cfg.stopName) + ' ' + num(n + 1), icon: 'next', primary: true, onClick: function () { startStop(n + 1); } });
        if (st < 3 && !cfg.daily) buttons.push({ label: L().again, icon: 'restart', primary: last, row: !last, onClick: function () { startStop(n); } });
        var allThree = doneCount() === cfg.stops && totalStars() === cfg.stops * 3, up = BANDS[BANDS.indexOf(band) + 1];
        if (allThree && up) buttons.unshift({ label: L().tryBand + ' ' + L().bands[up - 1], icon: 'next', primary: true, onClick: function () { band = up; global.set('band', up); showMap(); } });
        buttons.push({ label: L().map, icon: 'levels', row: !last && st < 3, primary: last && (st === 3 || cfg.daily) && !(allThree && up), onClick: function () { showMap(Math.min(cfg.stops, n + 1)); } });
        if (fresh.length) {
          content = el('div', 'qz-won', '<div class="h">' + esc(L().newSticker) + '</div>');
          fresh.forEach(function (c) { var b = el('button', 'qz-sticker', cardFace(c)); b.onclick = function () { Kit.sfx.play('tap'); item(cfg.id + ':' + c.id); }; content.appendChild(b); });
        }
        leavePlay();
        var p = stopPos(n, mapIn.clientWidth); map.scrollTop = Math.max(0, p.y - map.clientHeight * 0.55);
        var line = cfg.daily ? L().todayDone : T(cfg.stopName) + ' ' + num(n) + (cfg.doneText ? ' · ' + T(cfg.doneText(doneCount(), cfg.stops)) : '');
        Kit.ui.sheet({ title: st === 3 ? L().perfect : L().done, text: line, stars: st, content: content, buttons: buttons });
      }

      preload(queue[0]); ask();
    }

    // ---------- question types ----------
    function card(o, extra) {
      return el('button', 'qz-card' + (extra ? ' ' + extra : '') + (o.p && !o.t ? ' pic-only' : ''), pic(o.p) + txt(o.t));
    }
    var TYPES = {
      choice: function (q, area, done) {
        var opts = q.a.map(function (o, i) { return { o: o, i: i }; });
        if (!q.fixed) opts = shuffle(opts);
        var long = opts.some(function (x) { return !x.o.p && T(x.o.t).length > 18; });
        var grid = el('div', 'qz-grid' + (long ? ' one' : '')), locked = false, cards = [];
        if (opts.length === 3 && !long) grid.style.gridTemplateColumns = '1fr 1fr 1fr';
        opts.forEach(function (x) {
          var c = card(x.o);
          c.onclick = function () {
            if (locked) return; locked = true;
            var ok = x.i === q.correct;
            cards.forEach(function (k) { k.el.disabled = true; if (k.i === q.correct) k.el.classList.add('good'); else if (k.el !== c) k.el.classList.add('dim'); });
            if (!ok) c.classList.add('bad');
            done(ok, cards.filter(function (k) { return k.i === q.correct; })[0].el);
          };
          cards.push({ el: c, i: x.i }); grid.appendChild(c);
        });
        area.appendChild(grid);
      },

      yesno: function (q, area, done) {
        var row = el('div', 'qz-yn'), locked = false;
        var y = el('button', 'qz-card', '<span style="color:#2fa56a">' + ICON.check + '</span><span>' + esc(L().yes) + '</span>');
        var n = el('button', 'qz-card', '<span style="color:#e0566b">' + ICON.cross + '</span><span>' + esc(L().no) + '</span>');
        function tap(btn, val) {
          btn.onclick = function () {
            if (locked) return; locked = true;
            var ok = val === !!q.yes, right = q.yes ? y : n;
            y.disabled = n.disabled = true;
            right.classList.add('good'); if (!ok) btn.classList.add('bad');
            done(ok, right);
          };
        }
        tap(y, true); tap(n, false);
        row.appendChild(y); row.appendChild(n); area.appendChild(row);
      },

      sort: function (q, area, done) {
        var items = shuffle(q.items), i = 0, miss = false, busy = false, counts = [0, 0];
        var wrap = el('div', 'qz-sort'), slot = el('div', 'qz-sort-item'), bins = el('div', 'qz-bins');
        var binEls = q.bins.map(function (b, k) {
          var e = el('button', 'qz-bin', pic(b.p) + '<span>' + esc(T(b.t)) + '</span><span class="count"></span>');
          e.onclick = function () { drop(k, e); };
          bins.appendChild(e); return e;
        });
        wrap.appendChild(slot); wrap.appendChild(bins); area.appendChild(wrap);
        function show() { slot.innerHTML = ''; slot.appendChild(card(items[i])); }
        function drop(k, e) {
          if (busy || i >= items.length) return;
          var it = items[i], c = slot.firstChild;
          if (k !== it.bin) {
            miss = true; Kit.sfx.play('wrong'); Kit.buzz(20);
            e.classList.remove('bad'); void e.offsetWidth; e.classList.add('bad');
            return;
          }
          busy = true; Kit.sfx.play('place');
          c.classList.add(k === 0 ? 'left' : 'right');
          e.classList.remove('good', 'bad'); void e.offsetWidth; e.classList.add('good');
          counts[k]++; e.querySelector('.count').textContent = num(counts[k]);
          setTimeout(function () {
            busy = false; i++;
            if (i < items.length) show(); else { slot.innerHTML = ''; done(!miss, e); }
          }, 330);
        }
        show();
      },

      order: function (q, area, done) {
        var slots = el('div', 'qz-slots'), pool = el('div', 'qz-pool'), at = 0, miss = false;
        var slotEls = q.items.map(function (it, k) { var s = el('div', 'qz-slot', '<b>' + num(k + 1) + '</b><span></span>'); slots.appendChild(s); return s; });
        shuffle(q.items.map(function (it, k) { return { it: it, k: k }; })).forEach(function (x) {
          var c = card(x.it);
          c.onclick = function () {
            if (x.k !== at) {
              miss = true; Kit.sfx.play('wrong'); Kit.buzz(20);
              c.classList.remove('bad'); void c.offsetWidth; c.classList.add('bad');
              setTimeout(function () { c.classList.remove('bad'); }, 500);
              return;
            }
            Kit.sfx.play('place'); c.classList.add('used'); c.disabled = true;
            var s = slotEls[at]; s.classList.add('full'); s.lastChild.innerHTML = pic(x.it.p) + txt(x.it.t);
            s.lastChild.style.cssText = 'display:flex;align-items:center;gap:8px';
            at++;
            if (at === q.items.length) done(!miss, s);
          };
          pool.appendChild(c);
        });
        area.appendChild(slots); area.appendChild(pool);
      },

      match: function (q, area, done) {
        var grid = el('div', 'qz-match'), sel = null, left = 0, miss = false, last = null;
        var ls = q.pairs.map(function (p, k) { return { o: p.l, k: k, side: 0 }; });
        var rs = shuffle(q.pairs.map(function (p, k) { return { o: p.r, k: k, side: 1 }; }));
        function make(x) {
          var c = card(x.o);
          c.onclick = function () {
            if (c.classList.contains('locked')) return;
            if (!sel || sel.x.side === x.side) {
              if (sel) sel.c.classList.remove('sel');
              sel = { x: x, c: c }; c.classList.add('sel'); Kit.sfx.play('tap'); return;
            }
            var a = sel; sel = null; a.c.classList.remove('sel');
            if (a.x.k === x.k) {
              Kit.sfx.play('place');
              [a.c, c].forEach(function (n) { n.classList.add('locked'); n.disabled = true; });
              left++; last = c;
              if (left === q.pairs.length) done(!miss, last);
            } else {
              miss = true; Kit.sfx.play('wrong'); Kit.buzz(20);
              [a.c, c].forEach(function (n) { n.classList.remove('bad'); void n.offsetWidth; n.classList.add('bad'); setTimeout(function () { n.classList.remove('bad'); }, 500); });
            }
          };
          return c;
        }
        for (var i = 0; i < ls.length; i++) { grid.appendChild(make(ls[i])); grid.appendChild(make(rs[i])); }
        area.appendChild(grid);
      },

      // tap the right place on a picture (a map, a body, a building)
      place: function (q, area, done) {
        var sc = SCENES[q.scene], wrap = el('div', 'qz-scene', img('scene/' + q.scene)), locked = false, spots = [];
        wrap.style.setProperty('--r', sc.w / sc.h); wrap.style.aspectRatio = sc.w + ' / ' + sc.h;
        (q.spots || Object.keys(sc.spots)).forEach(function (id) {
          var s = sc.spots[id], b = el('button', 'qz-spot', '<i></i>');
          b.style.left = (s.x / sc.w * 100) + '%'; b.style.top = (s.y / sc.h * 100) + '%';
          b.setAttribute('aria-label', T(s.t));
          b.onclick = function () {
            if (locked) return; locked = true;
            var ok = id === q.correct, right = spots.filter(function (k) { return k.id === q.correct; })[0].el;
            spots.forEach(function (k) { k.el.disabled = true; if (k.el !== right && k.el !== b) k.el.classList.add('dim'); });
            right.classList.add('good'); right.insertAdjacentHTML('beforeend', '<span>' + esc(T(sc.spots[q.correct].t)) + '</span>');
            if (!ok) { b.classList.add('bad'); b.insertAdjacentHTML('beforeend', '<span>' + esc(T(s.t)) + '</span>'); }
            done(ok, right);
          };
          spots.push({ id: id, el: b }); wrap.appendChild(b);
        });
        area.appendChild(wrap);
      }
    };

    // ---------- go ----------
    document.addEventListener('visibilitychange', function () { if (document.hidden) { if (Kit.say) Kit.say.stop(); if (audio) { try { audio.pause(); } catch (e) {} } } });
    if (!band) { band = BANDS[0]; showMap(); band = 0; bandSheet(false); refreshHud(); }
    else showMap();

    return { showMap: showMap, startStop: startStop, state: function () { return { band: band, lang: lang, stars: starsAll, mastery: mastery, cards: store.get('cards', {}) }; } };
  };

  // Checks a bank while developing: every question needs an id, band, type, both languages, pictures that exist
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
