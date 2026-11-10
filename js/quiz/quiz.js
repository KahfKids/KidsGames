/* Kahf KidsGames quiz engine: quiz.js
   One engine for every quiz in the catalog. A quiz page supplies its question bank, pictures, map art and
   sounds, then calls KahfQuiz.start(config). The engine runs the journey map, the stops, six question types,
   stars, mastery, the three age bands, two languages and the Kahf activity bridge calls.

   Needs kit/core.js, kit/fx.js, kit/audio.js, kit/ui.js and quiz.css. No network, no dependencies.

   Bridge rules (docs/quiz-quality-plan.md, section 8):
     answer()    once per question, when the child commits an answer. Never for hints, reveals or replays.
     complete()  once at the end of every stop.
   Nothing here plays through an <audio> element, so the bridge's media_done never fires for sounds.

   Question shapes (text fields are { en, bn }; `p` is a key into config.pics; `ref` is the checked source):
     { id, band, type: 'choice', q, a: [{ t, p }], correct: 0, why, ref }
     { id, band, type: 'yesno',  q, yes: true, why, ref }
     { id, band, type: 'sort',   q, bins: [{ t, p }, { t, p }], items: [{ t, p, bin: 0 }], why, ref }
     { id, band, type: 'order',  q, items: [{ t, p }] (in the right order), why, ref }
     { id, band, type: 'match',  q, pairs: [{ l: { t, p }, r: { t, p } }], why, ref }
   band is 1 (ages 4-6), 2 (7-9), 3 (10-12) or a list of them. `qp` is an optional picture beside the question. */
(function () {
  'use strict';
  var Kit = window.Kit;

  var STR = {
    en: {
      play: 'Play', next: 'Next', map: 'Map', again: 'Again', yes: 'Yes', no: 'No',
      good: ['Well done!', 'That is right!', 'Excellent!', 'You got it!'], bad: 'Not quite', learned: 'Now you know',
      done: 'Finished!', perfect: 'Perfect!', bandTitle: 'Who is playing?', lang: 'Language',
      bands: ['Seedling', 'Explorer', 'Champion'], ages: ['Ages 4 to 6', 'Ages 7 to 9', 'Ages 10 to 12'],
      leave: 'Leave this stop?', leaveText: 'Your answers so far will not be saved.', stay: 'Keep playing', quit: 'Leave',
      orderHint: 'Tap them in order', matchHint: 'Tap two that go together', sortHint: 'Tap the right basket',
      source: 'Source', loading: 'Loading…', retry: 'Try again', loadFail: 'Could not load. Check the internet.',
      boss: 'Big challenge', stars: 'stars'
    },
    bn: {
      play: 'খেলো', next: 'পরের', map: 'মানচিত্র', again: 'আবার', yes: 'হ্যাঁ', no: 'না',
      good: ['সাবাশ!', 'একদম ঠিক!', 'দারুণ!', 'ঠিক বলেছ!'], bad: 'ঠিক হয়নি', learned: 'এবার জেনে নিলে',
      done: 'শেষ হলো!', perfect: 'সব ঠিক!', bandTitle: 'কে খেলছে?', lang: 'ভাষা',
      bands: ['চারাগাছ', 'অভিযাত্রী', 'চ্যাম্পিয়ন'], ages: ['বয়স ৪ থেকে ৬', 'বয়স ৭ থেকে ৯', 'বয়স ১০ থেকে ১২'],
      leave: 'এই ধাপ ছেড়ে যাবে?', leaveText: 'এ পর্যন্ত দেওয়া উত্তর জমা থাকবে না।', stay: 'খেলতে থাকো', quit: 'ছেড়ে যাও',
      orderHint: 'পরপর সাজিয়ে চাপো', matchHint: 'যে দুটি মেলে, সে দুটি চাপো', sortHint: 'ঠিক ঝুড়িতে চাপো',
      source: 'সূত্র', loading: 'লোড হচ্ছে…', retry: 'আবার চেষ্টা করো', loadFail: 'লোড হয়নি। ইন্টারনেট দেখো।',
      boss: 'বড় চ্যালেঞ্জ', stars: 'তারা'
    }
  };
  var BN_DIGITS = '০১২৩৪৫৬৭৮৯';
  var PER_STOP = { 1: 4, 2: 6, 3: 8 };

  var S = 'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
  var ICON = {
    check: '<svg viewBox="0 0 24 24" ' + S + '><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    cross: '<svg viewBox="0 0 24 24" ' + S + '><path d="M6 6l12 12M18 6L6 18"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" ' + S.replace('3', '2.4') + '><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.3 1 2.2h5.2c0-.9.4-1.7 1-2.2A6 6 0 0 0 12 3z"/></svg>',
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

  var KahfQuiz = window.KahfQuiz = {};

  KahfQuiz.start = function (cfg) {
    var global = Kit.store('kahf-quiz');               // shared by every quiz and the catalog page
    var store = Kit.store('kahf-quiz-' + cfg.id);
    var urlLang = (/[?&]lang=(en|bn)\b/.exec(location.search) || [])[1];
    var lang = urlLang || global.get('lang', /^bn/i.test(navigator.language || '') ? 'bn' : 'en');
    var band = global.get('band', 0);
    var mastery = store.get('m', {});                  // id -> [first-try streak 0..2, times seen]
    var starsAll = store.get('stars', {});             // band -> { stop: stars }
    var lastIds = [];
    var root = el('div', 'qz-root'); document.body.appendChild(root);

    function L() { return STR[lang] || STR.en; }
    function T(o) { return o == null ? '' : typeof o === 'string' ? o : (o[lang] != null ? o[lang] : o.en); }
    function num(n) { n = String(n); return lang === 'bn' ? n.replace(/\d/g, function (d) { return BN_DIGITS[d]; }) : n; }
    function pic(key, cls) { var s = key && cfg.pics[key]; return s ? '<span class="' + (cls || 'pic') + '">' + s + '</span>' : ''; }
    function stars() { return starsAll[band] || (band ? (starsAll[band] = {}) : {}); }
    function isBoss(n) { return cfg.bossEvery && n % cfg.bossEvery === 0; }
    function unlocked(n) { return n === 1 || (stars()[n - 1] || 0) > 0; }
    function nextStop() { for (var n = 1; n <= cfg.stops; n++) if (!stars()[n]) return n; return cfg.stops; }
    function doneCount() { var c = 0; for (var n = 1; n <= cfg.stops; n++) if (stars()[n]) c++; return c; }
    function totalStars() { var t = 0, s = stars(); for (var k in s) t += s[k]; return t; }

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
    var CONFETTI = cfg.confetti || ['#f6c453', '#ffe9a8', '#7fd6c2', '#ff9d7a', '#ffffff'];
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
    var hudTitle = Kit.ui.pill('');
    hudTitle.classList.add('qz-title');
    Kit.ui.spacer();
    var hudStars = Kit.ui.pill('');
    var hud = hudTitle.parentNode;
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
      document.documentElement.lang = lang;
    }

    // ---------- the map ----------
    var sky = el('div', 'qz-sky'); root.appendChild(sky);   // fixed backdrop behind the scrolling map
    var map = el('div', 'qz-map'), mapIn = el('div', 'qz-map-in'), mapBg = el('div', 'qz-map-bg');
    map.appendChild(mapIn); mapIn.appendChild(mapBg); root.appendChild(map);
    var playBtn = el('button', 'kit-btn primary qz-play'); root.appendChild(playBtn);
    playBtn.onclick = function () { Kit.sfx.play('tap'); startStop(nextStop()); };
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
      var d = 'M' + pts[0].x + ' ' + pts[0].y;
      for (var k = 1; k < pts.length; k++) { var a = pts[k - 1], b = pts[k], my = (a.y + b.y) / 2; d += ' C' + a.x + ' ' + my + ' ' + b.x + ' ' + my + ' ' + b.x + ' ' + b.y; }
      if (cfg.map.sky) sky.innerHTML = cfg.map.sky(innerWidth, innerHeight, doneCount(), cfg.stops);
      mapBg.innerHTML = (cfg.map.decor ? cfg.map.decor(w, h, doneCount(), cfg.stops) : '') +
        '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none"><path d="' + d + '" fill="none" stroke="' + (cfg.map.pathColor || 'rgba(255,233,168,.4)') +
        '" stroke-width="7" stroke-linecap="round" stroke-dasharray="2 16"/></svg>';
      stopEls.forEach(function (b) { b.remove(); }); stopEls = [];
      for (var n = 1; n <= cfg.stops; n++) (function (n) {
        var st = stars()[n] || 0, open = unlocked(n), boss = isBoss(n), p = pts[n - 1];
        var b = el('button', 'qz-stop' + (open ? '' : ' locked') + (boss ? ' boss' : '') + (n === nx && !st ? ' next' : ''));
        b.style.left = p.x + 'px'; b.style.top = p.y + 'px';
        var s = '';
        if (st) for (var i = 0; i < 3; i++) s += Kit.starSvg(i < st ? '#f6c453' : 'rgba(255,255,255,.2)');
        b.innerHTML = '<span class="pic">' + cfg.map.stopPic(st ? 'lit' : open ? 'open' : 'locked', boss) + '</span><span class="n">' + num(n) + '</span><span class="st">' + s + '</span>';
        b.setAttribute('aria-label', T(cfg.stopName) + ' ' + n + (open ? '' : ' (locked)'));
        b.onclick = function () {
          if (!open) { b.querySelector('.pic').animate([{ transform: 'rotate(-8deg)' }, { transform: 'rotate(8deg)' }, { transform: 'none' }], { duration: 260 }); Kit.sfx.play('locked'); return; }
          Kit.sfx.play('tap'); startStop(n);
        };
        mapIn.appendChild(b); stopEls.push(b);
      })(n);
      playBtn.innerHTML = Kit.icons.play + '<span>' + esc(T(cfg.stopName)) + ' ' + num(nx) + '</span>';
      refreshHud();
    }
    function showMap(scrollTo) {
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
        [1, 2, 3].forEach(function (b) {
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
      var sh = Kit.ui.sheet({ title: L().bandTitle, content: box, closeable: closeable });
      var title = sh.el.querySelector('h2');
      fill();
    }

    // ---------- choosing the questions for a stop ----------
    function seen(q) { return (mastery[q.id] || [0, 0])[1]; }
    function streak(q) { return (mastery[q.id] || [0, 0])[0]; }
    function choose(n) {
      var boss = isBoss(n), want = boss ? 10 : PER_STOP[band];
      var pool = cfg.bank.filter(function (q) { return inBand(q, band); });
      // easiest unseen first, then the ones still being learned, then mastered ones; never last stop's questions if avoidable
      var scored = shuffle(pool).map(function (q) {
        var s = streak(q) >= 2 ? 100 + seen(q) : seen(q) === 0 ? 0 : 10 + seen(q) - (streak(q) === 0 ? 5 : 0);
        if (lastIds.indexOf(q.id) >= 0) s += 50;
        return { q: q, s: s };
      }).sort(function (a, b) { return a.s - b.s; });
      var out = [], types = {};
      var cap = Math.ceil(want / 2);
      scored.forEach(function (o) {
        if (out.length >= want) return;
        var t = o.q.type;
        if ((types[t] || 0) >= cap) return;
        types[t] = (types[t] || 0) + 1; out.push(o.q);
      });
      scored.forEach(function (o) { if (out.length < want && out.indexOf(o.q) < 0) out.push(o.q); });
      if (boss && band < 3) {                           // a boss stop mixes in a few from the next band up
        var harder = shuffle(cfg.bank.filter(function (q) { return inBand(q, band + 1) && !inBand(q, band); })).slice(0, 2);
        out = out.slice(0, Math.max(0, want - harder.length)).concat(harder);
      }
      out = shuffle(out);
      var force = (/[?&]q=([\w-]+)/.exec(location.search) || [])[1];      // ?q=<id> puts one question first (for checking)
      if (force) cfg.bank.forEach(function (q) { if (q.id === force) { out = out.filter(function (o) { return o !== q; }); out.unshift(q); } });
      return out;
    }

    // ---------- playing a stop ----------
    var screen = null, fb = null;
    function hideFb() { if (screen) screen.style.paddingBottom = ''; if (fb) { var f = fb; fb = null; f.classList.remove('in'); setTimeout(function () { f.remove(); }, 320); } }

    function startStop(n) {
      if (Kit.say) Kit.say.stop();
      var queue = choose(n), total = queue.length, firstTry = {}, pos = 0, retried = {}, slotOf = {};
      queue.forEach(function (q, i) { slotOf[q.id] = i; });
      map.hidden = true; playBtn.hidden = true; hud.hidden = true; sky.classList.add('playing');
      screen = el('div', 'qz-play-screen');
      var top = el('div', 'qz-top'), bar = el('div', 'qz-bar'), body = el('div', 'qz-body');
      var x = el('button', 'kit-btn-icon', Kit.icons.close); x.setAttribute('aria-label', L().quit);
      x.onclick = function () {
        Kit.sfx.play('tap');
        if (pos === 0 && !Object.keys(firstTry).length) return showMap(n);
        Kit.ui.sheet({ title: L().leave, text: L().leaveText, buttons: [
          { label: L().stay, primary: true }, { label: L().quit, onClick: function () { showMap(n); } }] });
      };
      for (var i = 0; i < total; i++) bar.appendChild(el('i'));
      var snd = el('button', 'kit-btn-icon', Kit.icons[Kit.sfx.muted ? 'soundOff' : 'sound']); snd.setAttribute('aria-label', 'Sound');
      snd.onclick = function () { var m = Kit.sfx.toggle(); snd.innerHTML = Kit.icons[m ? 'soundOff' : 'sound']; soundBtn.setIcon(m ? 'soundOff' : 'sound'); };
      top.appendChild(x); top.appendChild(bar); top.appendChild(snd);
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
        if (!q) return finish();
        mark();
        body.innerHTML = '';
        var qbox = el('div', 'qz-q', (q.qp ? pic(q.qp, 'qpic') : '') + '<div class="qt">' + esc(T(q.q)) + (q.ar ? '<span class="ar" lang="ar">' + esc(q.ar) + '</span>' : '') + '</div>');
        if (canSpeak()) {
          var sp = el('button', 'kit-btn-icon qz-speak', Kit.icons.sound); sp.setAttribute('aria-label', 'Listen');
          sp.onclick = function () { speak(T(q.q)); };
          qbox.appendChild(sp);
          if (band === 1) setTimeout(function () { if (queue[pos] === q && !fb) speak(T(q.q)); }, 350);
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
          if (!again && Kit.say) Kit.say.praise(pickOne(cfg.praise || ['mashaallah', 'ahsant', 'barakallah']));
        } else { Kit.sfx.play('wrong'); Kit.buzz(20); }
        // a missed question comes back once, at the end of the stop
        if (!ok && !again) queue.push(q);
        mark();
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

      function finish() {
        var right = 0;
        for (var id in firstTry) {
          var m = mastery[id] || [0, 0];
          mastery[id] = [firstTry[id] ? Math.min(2, m[0] + 1) : 0, m[1] + 1];
          if (firstTry[id]) right++;
        }
        var st = right === total ? 3 : right >= total * 0.6 ? 2 : 1;
        if (st > (stars()[n] || 0)) stars()[n] = st;
        store.set('m', mastery); store.set('stars', starsAll);
        lastIds = Object.keys(firstTry);
        Kit.bridge.complete();
        Kit.sfx.play('win'); confetti();
        var last = n >= cfg.stops, buttons = [];
        if (!last) buttons.push({ label: T(cfg.stopName) + ' ' + num(n + 1), icon: 'next', primary: true, onClick: function () { startStop(n + 1); } });
        if (st < 3) buttons.push({ label: L().again, icon: 'restart', primary: last, row: !last, onClick: function () { startStop(n); } });
        buttons.push({ label: L().map, icon: 'levels', row: !last && st < 3, primary: last && st === 3, onClick: function () { showMap(Math.min(cfg.stops, n + 1)); } });
        screen.remove(); screen = null; map.hidden = false; sky.classList.remove('playing'); buildMap();
        var p = stopPos(n, mapIn.clientWidth); map.scrollTop = Math.max(0, p.y - map.clientHeight * 0.55);
        playBtn.hidden = true;
        Kit.ui.sheet({ title: st === 3 ? L().perfect : L().done, text: T(cfg.stopName) + ' ' + num(n) + (cfg.doneText ? ' · ' + T(cfg.doneText(doneCount(), cfg.stops)) : ''), stars: st, buttons: buttons });
      }

      ask();
    }

    // ---------- question types ----------
    function card(o, extra) {
      var b = el('button', 'qz-card' + (extra ? ' ' + extra : ''), pic(o.p) + (o.t ? '<span>' + esc(T(o.t)) + '</span>' : ''));
      return b;
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
            var s = slotEls[at]; s.classList.add('full'); s.lastChild.innerHTML = pic(x.it.p) + esc(T(x.it.t));
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
      }
    };

    // ---------- go ----------
    document.addEventListener('visibilitychange', function () { if (document.hidden && Kit.say) Kit.say.stop(); });
    if (!band) { band = 1; showMap(); band = 0; bandSheet(false); refreshHud(); }
    else showMap();

    return { showMap: showMap, state: function () { return { band: band, lang: lang, stars: starsAll, mastery: mastery }; } };
  };

  // Checks a bank while developing: every question needs an id, band, type, both languages and (if the quiz
  // asks for it) a source reference. Returns a list of problems; empty means clean.
  KahfQuiz.check = function (bank, needRef) {
    var bad = [], ids = {};
    function both(o, where) { if (!o || !o.en || !o.bn) bad.push(where + ': needs en and bn'); }
    bank.forEach(function (q, i) {
      var w = q.id || ('#' + i);
      if (!q.id) bad.push(w + ': no id'); else if (ids[q.id]) bad.push(w + ': duplicate id'); ids[q.id] = 1;
      if (!q.band) bad.push(w + ': no band');
      if (needRef && !q.ref) bad.push(w + ': no ref');
      both(q.q, w + ' q'); both(q.why, w + ' why');
      if (q.type === 'choice') { if (!(q.correct >= 0 && q.correct < q.a.length)) bad.push(w + ': bad correct'); q.a.forEach(function (a) { if (!a.p) both(a.t, w + ' a'); }); }
      else if (q.type === 'yesno') { if (typeof q.yes !== 'boolean') bad.push(w + ': yes must be true/false'); }
      else if (q.type === 'sort') { q.bins.forEach(function (b) { both(b.t, w + ' bin'); }); q.items.forEach(function (it) { if (it.bin !== 0 && it.bin !== 1) bad.push(w + ': bad bin'); }); }
      else if (q.type === 'order') { if (q.items.length < 3) bad.push(w + ': order needs 3+'); }
      else if (q.type === 'match') { if (q.pairs.length < 2) bad.push(w + ': match needs 2+'); }
      else bad.push(w + ': unknown type ' + q.type);
    });
    return bad;
  };
})();
