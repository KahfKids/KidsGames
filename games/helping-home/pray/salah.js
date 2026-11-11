/* Helping Home: the salah station. "Do it with me": a guide the child follows with their real body.
   1 Roll out the mat (tap the roll or the big button).  2 Turn the qibla compass until it clicks (drag it round, or
   tap to turn it a step).  3 Choose what to pray (the prayer's units: sunnah, fard, sunnah, witr…), who is praying
   (a cap or a headscarf) and make the intention, then pray. Each position is clear with the sound off and no reading:
     - the hero: a big faceless child on the mat (pray/salah-kid.js), seen from the front right, MOVES from the last
       position into this one (0.85 s, staged like a real body: knees down first, head up first), with a ghost of the
       last position and an arrow along the real path of the head (or hands, or the turn of the head); tap to replay.
       The parts that touch the mat glow under the body.
     - one instruction line in very simple words with a sign of the position ("Bow down. Hands on knees.")
     - a "Say" card: the line being said in Arabic, transliteration and meaning, lit word by word with the recorded
       audio, with its own play/pause button
     - the rak'ah beads in the title pill, in the unit's colour, and a big "Next".
   Nothing is scored or timed. The child moves on with "Next" whenever they are ready.
   4 After a unit: it is logged (HHFlow.mark('salah', {p, kind, rakah, u})), and the next unit of the same prayer is
   offered ("Now 2 Sunnah") beside "Done for now". Never forced.

   Structure (the common Sunnah order shared by the four madhhabs):
     every rak'ah: [stand: Fatihah (+ a surah)] -> ruku' -> stand up -> sujood -> sit -> sujood
     the first rak'ah of each part opens with the takbir, the opening du'a and the ta'awwudh
     a surah after al-Fatihah: in rak'ah 1-2 of a fard, in every rak'ah of a sunnah, nafl or witr
     2 rak'ah: the tashahhud, salawat and salam after rak'ah 2
     3/4 rak'ah: the middle tashahhud after rak'ah 2, then the final tashahhud, salawat and salam right, then left
     a unit in parts (Shafi'i witr 2 + 1, the optional 4 before Asr as 2 + 2): each part ends with its own salam
     witr, Hanafi: in rak'ah 3, after the surah, a takbir with raised hands, then du'a al-qunut, then ruku'
     witr, Shafi'i: in the last rak'ah, du'a al-qunut after standing up from ruku', hands raised
   ?p=fajr|dhuhr|asr|maghrib|isha|tahajjud (else the current prayer from HHPrayer, else Dhuhr)
   ?u=<index> the unit in PRAYER_TEXT.units(madhab, p) (else the first unit not prayed yet today, skipping optional
   ones). ?w=1|3 the witr length where the madhab gives a choice. ?madhab=hanafi|shafi overrides the setting (checks).
   ?from=today: the home button and "Done for now" go back to pray/today.html.
   ?step=N opens a step for checking: 0 mat, 1 qibla, 2 ready, 3.. the positions (past the end = finished, not
   logged); add &auto=1 to let it play. ?kid=cap|scarf picks the look (else the saved 'hh.kid').
   Text and units: pray/prayer-text.js (TEACHER REVIEW). Mat and compass: pray/salah-figure.js. The child:
   pray/salah-kid.js. The small signs: pray/salah-pose.js. Unit picker: pray/chart.js. */
(function () {
  'use strict';
  var TXT = window.PRAYER_TEXT, T = TXT.S, H = TXT.HOW, q = new URLSearchParams(location.search), FIG = window.SALAHFIG;
  var PRAYER = PS.prayer(), PNAME = TXT.NAMES[PRAYER];
  var M = (q.get('madhab') === 'hanafi' || q.get('madhab') === 'shafi') ? q.get('madhab') : HHChart.madhab();
  var UNITS = TXT.units(M, PRAYER);
  var logs = !q.has('step');   // a ?step= check never writes the day log

  /* ---------- the unit: which one, how many rak'ah, in which parts ---------- */
  function todayLog() { try { return HHFlow.log(); } catch (e) { return {}; } }
  function prayedU(i) { var x = UNITS[i]; return x && !x.repeat ? HHChart.prayed(todayLog(), PRAYER, i, x) : 0; }
  function defaultU() {
    for (var i = 0; i < UNITS.length; i++) if (!UNITS[i].optional && !UNITS[i].ifNoWitr && !prayedU(i)) return i;
    for (i = 0; i < UNITS.length; i++) if (UNITS[i].kind === 'fard') return i;
    return 0;
  }
  var U, UNIT, W, PARTS, N, STEPS;
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  function K(unit) { return TXT.KINDS[(unit || UNIT).kind]; }
  // "2 Sunnah", "4 Fard", "Witr"; for the intention: "2 rak'ah sunnah of Fajr"
  function short(unit, n) { unit = unit || UNIT; n = n || unit.rakah; return unit.kind === 'witr' ? 'Witr' : PRAYER === 'tahajjud' ? n + ' rak’ah' : n + ' ' + K(unit).name; }
  function intent() {
    if (UNIT.kind === 'witr') return N + ' rak’ah of witr';
    if (PRAYER === 'tahajjud') return N + ' rak’ah of tahajjud';
    return N + ' rak’ah ' + K().name.toLowerCase() + ' of ' + PNAME;
  }
  function setUnitVars(u, w) {
    U = UNITS[u] ? u : defaultU(); UNIT = UNITS[U] || { kind: 'fard', rakah: TXT.RAKAH[PRAYER] || 2 };
    W = UNIT.choose && UNIT.choose.indexOf(w) >= 0 ? w : UNIT.rakah;
    PARTS = UNIT.choose && W !== UNIT.rakah ? [W] : (UNIT.parts || [UNIT.rakah]).slice();
    N = sum(PARTS); STEPS = build(PARTS, UNIT);
  }

  /* ---------- the positions ---------- */
  function surahFor(r, len, fard) {
    if (len === 1) return { lines: TXT.IKHLAS, sub: 'Surat al-Ikhlas' };
    if (r === 1) return { lines: TXT.KAWTHAR, sub: 'Surat al-Kawthar' };
    if (r === 2 || !fard) return { lines: TXT.IKHLAS, sub: 'Surat al-Ikhlas' };
    return null;
  }
  function build(parts, unit) {
    var S = [], n = sum(parts), g = 0, fard = unit.kind === 'fard';
    function add(how, pose, contacts, lines, rak, o) { S.push(Object.assign({ how: how, pose: pose, contacts: contacts, lines: lines, rak: rak }, o || {})); }
    var mov = function (t) { return Object.assign({ moving: true }, t); };   // said while moving to the next position
    parts.forEach(function (len, pi) {
      for (var r = 1; r <= len; r++) {
        g++;
        var last = r === len, lastOfAll = last && pi === parts.length - 1, sur = surahFor(r, len, fard);
        if (r === 1) {
          add(pi ? 'newPart' : 'takbir', 'takbir', 'stand', [T.takbir], g, pi ? { rest: unit.kind === 'witr' ? len + ' rak\u2019ah of witr' : len + ' more rak\u2019ah' } : null);
          add('stand', 'stand', 'stand', [T.thana, T.taawwudh], g, { sub: 'Opening du’a' });
          add('stand', 'stand', 'stand', TXT.FATIHA.concat([T.amin]), g, { sub: 'Al-Fatihah' });
        } else add('standUp', 'stand', 'stand', [mov(T.takbir)].concat(TXT.FATIHA, [T.amin]), g, { sub: 'Al-Fatihah' });
        if (sur) add('stand', 'stand', 'stand', sur.lines, g, { sub: sur.sub });
        if (lastOfAll && unit.qunut === 'hanafi') {
          add('qtakbir', 'takbir', 'stand', [T.takbir], g, { sub: 'Witr' });
          add('qunutH', 'stand', 'stand', TXT.QUNUT.hanafi, g, { sub: 'Witr' });
        }
        add('ruku', 'ruku', 'stand', [mov(T.takbir), T.ruku], g);
        add('rise', 'rise', 'stand', [T.sami, T.rabbana], g);
        if (lastOfAll && unit.qunut === 'shafi') add('qunutS', 'qunut', 'stand', TXT.QUNUT.shafi, g, { sub: 'If your family says it' });
        add('sujud', 'sujud', 'sujud', [mov(T.takbir), T.sujud], g, { sub: 'First sujood' });
        add('jalsa', 'sit', 'sit', [mov(T.takbir), T.jalsa], g);
        add('sujud', 'sujud', 'sujud', [mov(T.takbir), T.sujud], g, { sub: 'Second sujood' });
        if (r === 2 && len > 2) add('tash', 'tash', 'sit', [mov(T.takbir), T.tashahhud], g, { done: g, sub: 'The middle sitting. Then stand up for rak’ah ' + (g + 1) + '.' });
        if (last) {
          add('tash', 'tash', 'sit', [mov(T.takbir), T.tashahhud, T.ibrahimiyya], g, { done: g, sub: 'The last sitting: the tashahhud, then the salawat.' });
          add('salamR', 'salamR', 'sit', [T.salam], g, { done: g });
          add('salamL', 'salamL', 'sit', [T.salam], g, { done: g });
        }
      }
    });
    return S;
  }
  setUnitVars(q.has('u') ? +q.get('u') : -1, +q.get('w'));


  /* ---------- figure + page ---------- */
  var bearing = null;
  try { if (window.HHPrayer && HHPrayer.settings && HHPrayer.settings()) { var b = HHPrayer.qibla(); if (isFinite(b)) bearing = b; } } catch (e) {}
  // the child's look: a kufi or a headscarf (?kid=cap|scarf, else the saved choice)
  var KID = window.SALAHKID;
  KID.look = (function () { var k = q.get('kid'); if (k !== 'cap' && k !== 'scarf') try { k = localStorage.getItem('hh.kid'); } catch (e) {} return k === 'scarf' ? 'scarf' : 'cap'; })();
  // the positions that differ by madhab, and for a girl (the headscarf look) under the Hanafi school (TEACHER REVIEW)
  KID.setStyle({ madhab: M, girl: KID.look === 'scarf' });
  var st0 = { roll: 0, rollE: 0, qa: Math.PI / 4, qibla: false, bearing: bearing, phase: 'mat', contacts: null };
  var ui = mountFigure({ fig: 'S', title: 'Salah', palette: 'mint', credit: false, size: FIG.size, center: FIG.center, state: st0, scene: FIG.scene });
  var st = ui.st;
  CAM_LIM = null;   // the praying view looks from the child's front right, outside the engine's default turn
  // the mat and qibla steps: higher and turned toward the foot of the mat on a phone, so the mat stands tall
  function matCam() { if (q.has('yaw') || q.has('pitch')) setCam(+(q.get('yaw') || 20), +(q.get('pitch') || 50)); else if (innerHeight > innerWidth) setCam(20, 50); else setCam(32, 46); }
  matCam();
  var UIF = 'ui-rounded,"SF Pro Rounded","Nunito",system-ui,sans-serif';
  var style = PS.el('style'); style.textContent = '' +
    // a phone: the figure gets at least 44% of the height; the words card gives way (it scrolls) before it does
    '@media (max-width:759px),(max-aspect-ratio:1/1){body .ps-app{grid-template-rows:auto minmax(44dvh,1fr) minmax(0,auto)}}' +
    'body .ps-fig{overflow:hidden}body .ps-side{min-height:0;overflow:hidden;gap:9px}' +
    'body .ps-card{flex:0 1 auto;min-height:0;max-height:none}' +
    // the title pill: one bead per rak'ah, in the unit's colour
    '.ps-pill .ps-dots{gap:6px}.ps-pill .ps-dots i{width:15px;height:15px;border-width:2px}.ps-pill .ps-dots i.on{background:var(--bead,#231e16)}' +
    '.ps-pill .ps-dots i.cur{background:#fff1b8;transform:none;box-shadow:0 0 0 3px var(--accent)}.ps-pill .ps-dots i.gap{margin-left:10px}' +
    // the instruction: a big sign and very few words
    '.sp-do{flex:none;display:flex;align-items:center;gap:12px;padding:0 2px;min-height:62px}' +
    '.sp-ic{flex:none;width:62px;height:62px;border-radius:50%;background:#fbe6a6;border:2.5px solid var(--ink);box-shadow:0 3px 0 var(--ink);display:grid;place-items:center;overflow:hidden}' +
    '.sp-ic svg{width:50px;height:50px}.sp-ic.small svg{width:32px;height:32px}' +
    '.sp-dt{min-width:0}.sp-dt b{display:block;font:800 clamp(20px,5.6vw,24px)/1.15 ' + UIF + '}.sp-dt small{display:block;font:600 14px/1.3 ' + UIF + ';color:var(--ink2);margin-top:3px}' +
    // the words card: "Say", play, the line being said, word by word
    '.ps-card.sp-say{padding:8px 12px 10px}' +
    '.sp-sh{display:flex;align-items:center;gap:10px;position:sticky;top:-8px;background:var(--card);z-index:1;padding:2px 0 4px}' +
    '.sp-play{all:unset;box-sizing:border-box;width:48px;height:48px;border-radius:50%;border:2.5px solid var(--ink);background:var(--accent);box-shadow:0 3px 0 var(--ink);display:grid;place-items:center;flex:none;cursor:pointer}' +
    '.sp-play svg{width:24px;height:24px}.sp-play:active{transform:translateY(2px);box-shadow:0 1px 0 var(--ink)}' +
    '.sp-sl{font:800 19px/1 ' + UIF + '}.sp-sh .ps-tag{margin:0}' +
    '.sp-ld{margin-left:auto;display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;max-width:45%}.sp-ld i{width:9px;height:9px;border-radius:50%;border:1.5px solid var(--ink);box-sizing:border-box}' +
    '.sp-ld i.on{background:var(--ink)}.sp-ld i.cur{background:var(--accent)}' +
    '.sp-say .ps-line{margin-top:2px;padding:4px 4px 6px;border:0}.sp-say .ps-ar{font-size:clamp(26px,7.2vw,34px);line-height:1.75}' +
    '.kw{border-radius:7px;transition:background .15s,opacity .15s,box-shadow .15s}' +
    '.sp-k .kw{opacity:.42}.sp-k .kw.said{opacity:1}.sp-k .kw.now{opacity:1;background:#fbe6a6;box-shadow:0 0 0 3px #fbe6a6}' +
    // the other steps (mat, qibla, ready, finished)
    '.sp-kind{display:flex;align-items:center;gap:8px;margin:4px 4px 8px;font:700 14px/1.3 ' + UIF + '}.sp-kind i{width:14px;height:14px;flex:none;border-radius:50%;border:1.6px solid var(--ink)}' +
    '.sp-kind .saw{font-size:1.35em;line-height:0;vertical-align:-.1em}' +
    '.sp-q{margin:6px 4px 6px;font:800 12px/1 ' + UIF + ';letter-spacing:.06em;text-transform:uppercase;color:var(--ink2);text-align:center}' +
    '.sp-pick{padding:5px 6px 8px}.sp-chs{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:2px 0 0;padding:5px 6px 8px}' +
    '.sp-ch{all:unset;box-sizing:border-box;min-height:48px;padding:6px 14px;border-radius:14px;border:2px solid var(--ink);background:#fff;box-shadow:0 2.5px 0 var(--ink);font:800 14px/1.2 ' + UIF + ';text-align:center;cursor:pointer;display:inline-flex;align-items:center;gap:6px}' +
    '.sp-ch svg{width:30px;height:30px}.sp-ch.on{outline:3.5px solid #f4b829;outline-offset:2px}' +
    '.ps-ctl .ps-big.sp-alt{flex:0 1 auto;background:var(--paper);font-size:16px;padding:8px 16px;min-width:0}.ps-app .ps-big.sp-alt:hover{background:var(--paper)}' +
    // RIGHT and LEFT always in the same colours, in the words and on the picture
    '.rl{font-weight:900;white-space:nowrap}.rl.r{color:#c4502b}.rl.l{color:#5b48a0}.rl::before{content:"";display:inline-block;width:.62em;height:.62em;border-radius:50%;margin:0 .2em .05em .05em;border:2px solid var(--ink);vertical-align:middle}' +
    '.rl.r::before{background:#ef7a4f}.rl.l::before{background:#8b78cf}' +
    '.sp-dt b .rl::before{width:.5em;height:.5em}' +
    '@media (min-width:760px) and (min-aspect-ratio:1/1){.sp-dt b{font-size:24px}}';
  document.head.appendChild(style);
  PS.mount({ ui: ui, scene: FIG.scene, acts: { mat: function () { if (st.phase === 'mat') rollOut(); } } });   // the compass has its own press-and-drag below
  var side = PS.card.parentNode, doRow = PS.el('div', 'sp-do');
  side.insertBefore(doRow, PS.card);
  // the child, above the mat (iso/pix.js): the last position (a ghost while moving), the child, the motion arrow,
  // the marks, then the close-up bubble and its line. The child's pictures are kept, so a move plays as a flipbook.
  var PX = PS.px, ghostL = PX.layer({ cache: true }), kidL = PX.layer({ cache: ghostL }), arrL = PX.fx(), markL = PX.fx();
  var magLine = PX.sticker(), magS = PX.sticker();
  ghostL.alpha(0);
  // the arrow is drawn on, then breathes; numbers and marks fade in (these were CSS animations)
  (function () {
    var Ez = HHPix.ease, breathe = function (T) { return T < 1.2 ? 1 : 1 - .45 * Ez.swing(((T - 1.2) % 1.8) / 1.8); };
    var fade = function (sec) { return { delay: function (el) { return +el.getAttribute('data-delay') || 0; },
      state: function (t) { return t < 0 ? { alpha: 0 } : { alpha: Ez.out(Math.min(1, t / sec)), done: t >= sec }; }, still: { alpha: 1 } }; };
    HHPix.effects['sp-num'] = fade(.2); HHPix.effects['sp-mk'] = fade(.3);
    var N = 14;
    HHPix.effects['sp-go'] = {
      frames: function (g) { var out = [null], ps = g.querySelectorAll('path');
        for (var i = 1; i < N; i++) { [].forEach.call(ps, function (p) { p.setAttribute('stroke-dasharray', '1'); p.setAttribute('stroke-dashoffset', (1 - i / (N - 1)).toFixed(3)); }); out.push(g.outerHTML); }
        return out; },
      state: function (t, p, T) { var fr = Math.round(Ez.out(Math.min(1, Math.max(0, t) / .75)) * (N - 1)); return { frame: fr, alpha: fr ? breathe(T) : 0 }; },
      still: { frame: N - 1, alpha: 1 } };
    HHPix.effects['sp-hd'] = { delay: function () { return .6; }, state: function (t, p, T) { return t < 0 ? { alpha: 0 } : { alpha: Ez.out(Math.min(1, t / .2)) * breathe(T) }; }, still: { alpha: 1 } };
  })();
  function pill() {
    PS.title(PS.icon(PS.prayerIcon[PRAYER]) + '<span>' + PNAME + ' · ' + (UNIT.kind === 'witr' ? 'Witr · ' + N + ' rak’ah' : short(UNIT, N)) + '</span>');
    PS.top.querySelector('.ps-pill').style.setProperty('--bead', HHChart.COL[UNIT.kind]);
  }
  pill();
  // the home button: the house (from the house), or today's chart (from it)
  var fromToday = q.get('from') === 'today', homeB = PS.top.querySelector('.ps-round');
  if (fromToday && homeB && !(window.HHFlow && HHFlow.fromHouse)) { homeB.hidden = false; homeB.onclick = function () { PS.play('tap'); PS.hush(); leave(); }; }

  var pauseB = PS.el('button', 'ps-round', PS.icon('home')), big = PS.el('button', 'ps-big'), alt = PS.el('button', 'ps-big sp-alt');
  PS.ctl.appendChild(pauseB); PS.ctl.appendChild(alt); PS.ctl.appendChild(big);
  alt.style.display = 'none'; pauseB.style.display = 'none';
  var auto = !q.has('step') || q.get('auto') === '1';

  function setBig(icon, label, cls) { big.innerHTML = PS.icon(icon) + '<span>' + label + '</span>'; big.className = 'ps-big' + (cls ? ' ' + cls : ''); big.setAttribute('aria-label', label); }
  function dots() {
    var gaps = [], a = 0; PARTS.slice(0, -1).forEach(function (k) { a += k; gaps.push(a); });
    PS.dots(N, st.phase === 'pray' || st.phase === 'done' ? st.rakDone : -1, gaps);
  }
  // the instruction row: a big sign, a few words, and a small line under them
  function instr(iconSvg, text, sub, small) {
    doRow.innerHTML = '<span class="sp-ic' + (small ? ' small' : '') + '">' + iconSvg + '</span><span class="sp-dt"><b>' + rl(PS.esc(text)) + '</b>' + (sub ? '<small>' + rl(sub) + '</small>' : '') + '</span>';
  }
  // "right" and "left" in the words get the colour of the R and L tags on the picture
  function rl(html) { return html.replace(/\b(right|left)\b/gi, function (w) { return '<span class="rl ' + (w[0].toLowerCase() === 'r' ? 'r' : 'l') + '">' + w + '</span>'; }); }
  // the card on the steps that are not positions: the instruction, then a short hint and any choices
  function card(icon, title, hint, extra) {
    instr(PS.icon(icon), title, '', true);
    PS.card.classList.remove('sp-say');
    PS.card.innerHTML = '<div class="ps-hint">' + hint + '</div>' + (extra || '');
    PS.scroller = PS.card;
  }

  /* ---------- the child on the mat: moves from the last position into this one, then holds ---------- */
  var MOVE_MS = 850, STEPS_N = 30, kidCache = {}, kidN = 0, kidRaf = 0, ghostT = 0;
  var prayView = false;
  function kidSVG(a, b, t) {
    var k = KID.look + (t >= 1 || !a || a === b ? '|' + b : '|' + a + '>' + b + '>' + t);
    if (!kidCache[k]) { if (++kidN > 400) { kidCache = {}; kidN = 0; } kidCache[k] = inkScale(t >= 1 || !a || a === b ? KID.svg(b) : KID.frame(a, b, t)); }
    return kidCache[k];
  }
  function setKid(h) { kidL.set(h); }
  // the pictures of the next move, made ahead while the child listens, so the move itself only shows them
  function warmMove(a, b) {
    if (!prayView || !a || !b || a === b || (window.Kit && Kit.reducedMotion)) return;
    var list = [];
    for (var i = 0; i <= STEPS_N; i++) (function (t) { list.push(function () { return kidSVG(a, b, t); }); })(i / STEPS_N);
    kidL.warm(list, .6);
  }
  var kidNow = { from: null, to: null };
  function showKid(name, from, animate, onEnd) {
    cancelAnimationFrame(kidRaf); clearTimeout(ghostT);
    var end = function () { if (onEnd) { var f = onEnd; onEnd = null; f(); } };
    kidNow = { from: from, to: name };
    arrL.set(''); markL.set(''); hideMag();
    if (!prayView || !name) { setKid(''); ghostL.set(''); return end(); }
    var reduce = window.Kit && Kit.reducedMotion;
    if (!animate || !from || from === name || reduce) { ghostL.alpha(0, 600); setKid(kidSVG(null, name, 1)); if (from && from !== name) arrows(from, name, !reduce); return end(); }
    ghostL.set(kidSVG(null, from, 1)); ghostL.alpha(.26);
    // into and out of sujood the move has three beats (knees, hands, forehead): a little longer
    var ms = KID.via(from, name) ? 1200 : MOVE_MS;
    arrows(from, name, true, ms);
    var t0 = performance.now();
    (function step(now) {
      var u = Math.min(1, Math.max(0, (now - t0) / ms)), tq = Math.round(u * STEPS_N) / STEPS_N;
      setKid(kidSVG(from, name, tq));
      if (u < 1) kidRaf = requestAnimationFrame(step);
      else { ghostT = setTimeout(function () { ghostL.alpha(0, 600); }, 350); end(); }
    })(t0);
  }
  // the motion arrow: the real path of the head (or of the hands, or the turn of the head), beside the body
  // a round numbered (or lettered) badge on the picture, in svg units of the main view
  function badge(x, y, text, col, cls, delay) {
    var k = INK_K / .36, r = 6.2 * k;
    return '<g class="sp-' + (cls || 'mk') + '" data-delay="' + (delay || 0) + '"><circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(2) + '" fill="' + col + '" stroke="#231e16" stroke-width="' + (1.4 * k).toFixed(2) + '"/>' +
      '<text x="' + x.toFixed(1) + '" y="' + (y + 3.1 * k).toFixed(1) + '" text-anchor="middle" font-family="ui-rounded,system-ui,sans-serif" font-weight="900" font-size="' + (8.6 * k).toFixed(2) + '" fill="#231e16">' + text + '</text></g>';
  }
  function arrows(a, b, draw, ms) {
    var tr = KID.track(a, b), k = INK_K, h = '';
    // going down into sujood: 1 the knees, 2 the hands, 3 the forehead, lit as each one touches the mat
    if (b === 'sujud' && a !== 'sujud') {
      var c = FIG.contacts('sujud'), get = function (kind) { return c.filter(function (x) { return x.kind === kind; }); };
      var kn = get('knee'), hn = get('hand').filter(function (x) { return x.side < 0; })[0], hd0 = get('head')[0], T = (ms || 1200) / 1000;
      var at = function (x, y, dz) { return P(x, y, 3.9 + (dz || 0)); };
      if (kn.length) { var p1 = at((kn[0].x + kn[1].x) / 2, Math.min(kn[0].y, kn[1].y) - 9); h += badge(p1[0], p1[1], '1', '#fff1b8', 'num', T * .38); }
      var kk = INK_K / .36;
      if (hn) { var p2 = at(hn.x + 4, hn.y - 6); h += badge(p2[0] - 9 * kk, p2[1] + 7 * kk, '2', '#fff1b8', 'num', T * .62); }
      if (hd0) { var p3 = at(hd0.x, hd0.y); h += badge(p3[0] + 16 * kk, p3[1] - 14 * kk, '3', '#fff1b8', 'num', T * .97); }
    }
    if (!tr.paths.length) { arrL.play(h); return; }
    tr.paths.forEach(function (pts) {
      var Q = pts.map(function (p) { return P(p[0], p[1], p[2]); });
      var n = Q.length, i0 = tr.kind === 'turn' ? 1 : tr.kind === 'head' ? Math.round(n * .3) : Math.round(n * .12), i1 = n - (tr.kind === 'turn' ? 1 : Math.max(2, Math.round(n * .1)));
      Q = Q.slice(i0, i1); if (Q.length < 2) return;
      // one smooth curve through the start, the middle and the end of the path (a body's path wobbles a little)
      var a0 = Q[0], m = Q[Q.length >> 1], e = Q[Q.length - 1], c = [2 * m[0] - (a0[0] + e[0]) / 2, 2 * m[1] - (a0[1] + e[1]) / 2];
      var d = 'M' + a0[0].toFixed(1) + ' ' + a0[1].toFixed(1) + 'Q' + c[0].toFixed(1) + ' ' + c[1].toFixed(1) + ' ' + e[0].toFixed(1) + ' ' + e[1].toFixed(1);
      var ang = Math.atan2(e[1] - c[1], e[0] - c[0]), L = 7.5 * k / .36, W = 5 * k / .36;
      var tip = [e[0] + Math.cos(ang) * L * .55, e[1] + Math.sin(ang) * L * .55];
      var hd = 'M' + (tip[0] - Math.cos(ang) * L - Math.sin(ang) * W).toFixed(1) + ' ' + (tip[1] - Math.sin(ang) * L + Math.cos(ang) * W).toFixed(1) + 'L' + tip[0].toFixed(1) + ' ' + tip[1].toFixed(1) +
        'L' + (tip[0] - Math.cos(ang) * L + Math.sin(ang) * W).toFixed(1) + ' ' + (tip[1] - Math.sin(ang) * L - Math.cos(ang) * W).toFixed(1) + 'Z';
      var bw = 3.2 * k / .36;
      var LN = ' fill="none" stroke-linecap="round" stroke-linejoin="round"';
      h += '<g class="' + (draw ? 'sp-go' : '') + (tr.kind === 'hands' ? ' hands' : '') + '"><path pathLength="1" d="' + d + '" stroke="#231e16" stroke-width="' + (bw + 2.4 * k / .36).toFixed(2) + '"' + LN + '/>' +
        '<path pathLength="1" d="' + d + '" stroke="#e8774f" stroke-width="' + bw.toFixed(2) + '"' + LN + '/>' +
        '<path' + (draw ? ' class="sp-hd"' : '') + ' d="' + hd + '" fill="#e8774f" stroke="#231e16" stroke-width="' + (1.2 * k / .36).toFixed(2) + '" stroke-linejoin="round"/></g>';
      // the salam: 1 to the right first, then 2 to the left
      if (tr.kind === 'turn') h += badge(tip[0] + Math.cos(ang) * 9 * k / .36, tip[1] + Math.sin(ang) * 9 * k / .36 - 4 * k / .36, b === 'salamR' ? '1' : '2', b === 'salamR' ? '#ef7a4f' : '#8b78cf', 'mk', .5);
    });
    arrL.play(h);
  }
  function replay() { if (st.phase === 'pray' && kidNow.from && kidNow.from !== kidNow.to) { var S = STEPS[cur]; PS.play('tap'); showKid(kidNow.to, kidNow.from, true, function () { marks(S.pose); showMag(S.pose, S.how); }); } }

  /* ---------- the marks on the picture after a move: R on the right hand, the level of the back in ruku' ---------- */
  function marks(name) {
    var k = INK_K / .36, h = '', LN = ' fill="none" stroke-linecap="round" stroke-linejoin="round"', pt = function (part) { var w = KID.at(name, part); return w ? P(w[0], w[1], w[2]) : null; };
    if (name === 'takbir' || name === 'stand' || name === 'tash' || name === 'ruku' || name === 'qunut') {
      var r = pt('handR'); if (r) h += badge(r[0] + 9 * k, r[1] + 6 * k, 'R', '#ef7a4f', 'mk', 0);
    }
    if (name === 'ruku') {
      // the back is level: a dashed level line along it, and a dotted line from the head to the sujood spot
      var hip = KID.at('ruku', 'hip'), hd = KID.at('ruku', 'head'), A = P(hip[0] + 6, hip[1], hip[2] + 11), B2 = P(hd[0] + 2, hd[1], hip[2] + 11);
      h += '<g class="sp-mk"' + LN + '><path d="M' + A[0].toFixed(1) + ' ' + A[1].toFixed(1) + 'L' + B2[0].toFixed(1) + ' ' + B2[1].toFixed(1) + '" stroke="#231e16" stroke-width="' + (1.6 * k).toFixed(2) + '" stroke-dasharray="' + (4 * k).toFixed(1) + ' ' + (3 * k).toFixed(1) + '"/>' +
        '<path d="M' + A[0].toFixed(1) + ' ' + (A[1] - 4 * k).toFixed(1) + 'v' + (8 * k).toFixed(1) + 'M' + B2[0].toFixed(1) + ' ' + (B2[1] - 4 * k).toFixed(1) + 'v' + (8 * k).toFixed(1) + '" stroke="#231e16" stroke-width="' + (1.6 * k).toFixed(2) + '"/></g>';
      var c = FIG.contacts('sujud').filter(function (x) { return x.kind === 'head'; })[0];
      if (c) { var E = P(hd[0], hd[1], hd[2]), F = P(c.x, c.y, 3.9);
        h += '<g class="sp-mk"' + LN + '><path d="M' + E[0].toFixed(1) + ' ' + E[1].toFixed(1) + 'L' + F[0].toFixed(1) + ' ' + F[1].toFixed(1) + '" stroke="#e8774f" stroke-width="' + (1.8 * k).toFixed(2) + '" stroke-dasharray="' + (.5 * k).toFixed(2) + ' ' + (4 * k).toFixed(1) + '"/>' +
          '<circle cx="' + F[0].toFixed(1) + '" cy="' + F[1].toFixed(1) + '" r="' + (3.4 * k).toFixed(2) + '" fill="none" stroke="#e8774f" stroke-width="' + (1.6 * k).toFixed(2) + '"/></g>'; }
    }
    markL.play(h);
    // the hands' arrow has done its job once the close-up shows the hands
    if (MAG[name]) arrL.dim('hands', .4);
  }

  /* ---------- the close-up bubble: the detail that matters, drawn large, seen from where it is clearest ---------- */
  // part: where on the body; cam: [yaw, pitch] of the close-up; zoom: half its width (cm); tags: R and L labels
  var MAG = {
    takbir: { part: 'hands', cam: [-174, 8], zoom: 21, dz: 3, tags: [['tagR', 'R'], ['tagL', 'L']] },
    stand: { part: 'hands', cam: [-168, 14], zoom: 12.5, tags: [['tagR', 'R'], ['lowL', 'L']] },
    ruku: { part: 'handR', cam: [-150, 16], zoom: 12, tags: [['tagR', 'R']] },
    // the feet close-ups leave out the body above the legs, and look from behind, where the toes show
    sujud: { part: 'feet', cam: [-28, 22], zoom: 15, dz: 2, legs: true, tags: [['footR', 'R'], ['footL', 'L']] },
    sit: { part: 'feet', cam: [0, 45], zoom: 18, dz: 2, legs: true, tags: [['footR', 'R'], ['footL', 'L']] },
    tash: { part: 'handR', cam: [-140, 32], zoom: 10, dz: 2.5, tags: [['tagR', 'R']] },
    // the salam close-up is seen from behind the child, so the right shoulder is on the right
    salamR: { part: 'neck', cam: [6, 24], zoom: 26, dz: 13, turn: 'tash', num: '1', tags: [['shR', 'R'], ['shL', 'L']] },
    salamL: { part: 'neck', cam: [6, 24], zoom: 26, dz: 13, turn: 'salamR', num: '2', tags: [['shR', 'R'], ['shL', 'L']] },
    qunut: { part: 'hands', cam: [-150, 30], zoom: 13, tags: [['tagR', 'R'], ['tagL', 'L']] },
  };
  var magCache = {};
  var magNow = null;
  function hideMag() { magNow = null; magS.show(false, true); magLine.show(false); }
  function insetSVG(name, spec) {
    var key = name + KID.styleKey + KID.look; if (magCache[key]) return magCache[key];
    var y0 = YAW, p0 = PITCH, k0 = INK_K, out = null;
    try {
      setCam(spec.cam[0], spec.cam[1]);
      var f = KID.at(name, spec.part), c = P(f[0], f[1], f[2] + (spec.dz || 0)), hw = spec.zoom * CAM_K;
      INK_K = 2 * hw / INK_REF_VB * 2.3;
      var body = inkScale(FIG.patch() + KID.svg(name, spec.legs ? { only: 'legs' } : { detail: true })), tags = '';
      // the salam close-up: the turn of the head as an arrow over it, with its number
      if (spec.turn) { var tr = KID.track(spec.turn, name).paths[0];
        if (tr) { var Q = tr.map(function (w) { return P(w[0], w[1], w[2]); }), e = Q[Q.length - 1], s0 = Q[Q.length - 3], ang = Math.atan2(e[1] - s0[1], e[0] - s0[0]), L = hw * .14, W = hw * .1;
          var d = 'M' + Q.map(function (v) { return v[0].toFixed(2) + ' ' + v[1].toFixed(2); }).join('L'), tip = [e[0] + Math.cos(ang) * L * .5, e[1] + Math.sin(ang) * L * .5];
          var hd = 'M' + (tip[0] - Math.cos(ang) * L - Math.sin(ang) * W).toFixed(2) + ' ' + (tip[1] - Math.sin(ang) * L + Math.cos(ang) * W).toFixed(2) + 'L' + tip[0].toFixed(2) + ' ' + tip[1].toFixed(2) + 'L' + (tip[0] - Math.cos(ang) * L + Math.sin(ang) * W).toFixed(2) + ' ' + (tip[1] - Math.sin(ang) * L - Math.cos(ang) * W).toFixed(2) + 'Z';
          tags += '<path d="' + d + '" fill="none" stroke="#231e16" stroke-width="' + (hw * .085).toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round"/><path d="' + d + '" fill="none" stroke="#e8774f" stroke-width="' + (hw * .05).toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<path d="' + hd + '" fill="#e8774f" stroke="#231e16" stroke-width="' + (hw * .02).toFixed(2) + '"/>';
          var bx = tip[0] - Math.cos(ang) * hw * .05, by = tip[1] + hw * .2, br = hw * .12;
          tags += '<circle cx="' + bx.toFixed(2) + '" cy="' + by.toFixed(2) + '" r="' + br.toFixed(2) + '" fill="' + (spec.num === '1' ? '#ef7a4f' : '#8b78cf') + '" stroke="#231e16" stroke-width="' + (hw * .022).toFixed(3) + '"/><text x="' + bx.toFixed(2) + '" y="' + (by + br * .42).toFixed(2) + '" text-anchor="middle" font-family="ui-rounded,system-ui,sans-serif" font-weight="900" font-size="' + (br * 1.25).toFixed(2) + '" fill="#231e16">' + spec.num + '</text>'; } }
      spec.tags.forEach(function (t) {
        var w = KID.at(name, t[0]), q = P(w[0], w[1], w[2]), dx = q[0] - c[0], dy = q[1] - c[1], d = Math.hypot(dx, dy) || 1;
        // the tag sits just outside the part, away from the middle of the bubble, and inside the circle
        // a hand's tag sits on the hand itself; a foot's or a shoulder's just outside it
        var onIt = /^(hand|tag|low)/.test(t[0]), rr = onIt ? d : Math.min(hw * .78, d + hw * .2), x = c[0] + dx / d * rr, y = c[1] + dy / d * rr, r = hw * (onIt ? .085 : .12), col = t[1] === 'R' ? '#ef7a4f' : '#8b78cf';
        tags += '<path d="M' + q[0].toFixed(2) + ' ' + q[1].toFixed(2) + 'L' + x.toFixed(2) + ' ' + y.toFixed(2) + '" stroke="#231e16" stroke-width="' + (hw * .018).toFixed(3) + '"/>' +
          '<circle cx="' + x.toFixed(2) + '" cy="' + y.toFixed(2) + '" r="' + r.toFixed(2) + '" fill="' + col + '" stroke="#231e16" stroke-width="' + (hw * .022).toFixed(3) + '"/>' +
          '<text x="' + x.toFixed(2) + '" y="' + (y + r * .42).toFixed(2) + '" text-anchor="middle" font-family="ui-rounded,system-ui,sans-serif" font-weight="900" font-size="' + (r * 1.25).toFixed(2) + '" fill="#231e16">' + t[1] + '</text>';
      });
      var flt = filterFor(INK_K).replace('id="hand"', 'id="handMag"').replace('id="wob"', 'id="wobMag"');
      out = { vb: [c[0] - hw, c[1] - hw, 2 * hw, 2 * hw].map(function (v) { return v.toFixed(2); }).join(' '), inner: '<defs>' + flt + '</defs><g filter="url(#handMag)">' + body + '</g>' + tags };
    } catch (e) { out = null; }
    INK_K = k0; setCam(y0, p0);
    return (magCache[key] = out);
  }
  function showMag(name, how) {
    var spec = MAG[name]; if (!spec || !prayView) return hideMag();
    var ins = insetSVG(name, spec); if (!ins) return hideMag();
    // where the part is on the screen (main camera)
    var ctm = document.getElementById('fig').getScreenCTM(), w = KID.at(name, spec.part), p = P(w[0], w[1], w[2] + (spec.dz || 0));
    if (!ctm) return hideMag();
    var box = PS.fig.getBoundingClientRect(), tx = ctm.a * p[0] + ctm.c * p[1] + ctm.e - box.left, ty = ctm.b * p[0] + ctm.d * p[1] + ctm.f - box.top;
    var size = Math.round(Math.max(130, Math.min(box.width * .5, box.height * .5, 230))), R = size / 2;
    var right = tx < box.width * .55;
    // the bubble: paper, the close-up inside a round window, a cream ring, an ink edge and its hard shadow
    magS.set('<defs><clipPath id="mc"><circle cx="' + R + '" cy="' + R + '" r="' + (R - 3) + '"/></clipPath></defs>' +
      '<circle cx="' + R + '" cy="' + (R + 4) + '" r="' + R + '" fill="#231e16"/><circle cx="' + R + '" cy="' + R + '" r="' + R + '" fill="#231e16"/><circle cx="' + R + '" cy="' + R + '" r="' + (R - 3) + '" fill="#fbf6ea"/>' +
      '<g clip-path="url(#mc)"><svg x="3" y="3" width="' + (size - 6) + '" height="' + (size - 6) + '" viewBox="' + ins.vb + '">' + ins.inner + '</svg></g>' +
      '<circle cx="' + R + '" cy="' + R + '" r="' + (R - 5.5) + '" fill="none" stroke="#fff6dc" stroke-width="5"/>', size, size + 4);
    var cx = right ? box.width - 10 - R : 10 + R, cy = 8 + R, dx = tx - cx, dy = ty - cy, d = Math.hypot(dx, dy) || 1;
    var ex = cx + dx / d * (R + 1), ey = cy + dy / d * (R + 1), bw = Math.round(box.width), bh = Math.round(box.height);
    magLine.set('<path d="M' + ex.toFixed(1) + ' ' + ey.toFixed(1) + 'L' + tx.toFixed(1) + ' ' + ty.toFixed(1) + '" stroke="#231e16" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1 5" fill="none"/>' +
      '<circle cx="' + tx.toFixed(1) + '" cy="' + ty.toFixed(1) + '" r="' + Math.max(12, size * .1).toFixed(1) + '" fill="none" stroke="#231e16" stroke-width="2.5"/>', bw, bh);
    magLine.at(box.left + bw / 2, box.top + bh / 2); magS.at(box.left + cx, box.top + cy + 2);
    magLine.show(true); magS.show(true, true); magNow = [name, how];
  }
  // the screen was turned or resized: the bubble goes back beside the part it shows
  PX.stage.onLayout(function () { if (magNow) showMag(magNow[0], magNow[1]); });
  // the camera: the mat steps look from high at the foot of the mat; the praying view from the child's front right
  function viewPray(on) {
    if (on === prayView) return;
    prayView = on; kidCache = {}; kidN = 0;
    hideMag();
    kidL.set(''); ghostL.set(''); arrL.set(''); markL.set('');
    if (on) { setCam(FIG.CAM[0], FIG.CAM[1]); PS.fitBox(FIG.frame(), .02); }
    else { matCam(); PS.fit(); }
  }
  // after a re-frame (the ink weight changes with the frame): draw the child again
  PS.onRefit = function () { kidCache = {}; kidN = 0; hideMag(); if (prayView && kidNow.to) setKid(kidSVG(null, kidNow.to, 1)); };
  // in the praying view a tap on the picture plays the move again (and the picture doesn't turn under the finger)
  var tap = null;
  PS.stack.addEventListener('pointerdown', function (e) {
    if (!prayView) return;
    e.stopPropagation(); tap = { x: e.clientX, y: e.clientY, id: e.pointerId };
  }, true);
  PS.stack.addEventListener('pointerup', function (e) { if (tap && e.pointerId === tap.id && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 12) replay(); tap = null; });

  /* ---------- 1. roll out the mat ---------- */
  function showMat() {
    viewPray(false);
    st.phase = 'mat'; dots();
    card('mat', 'Roll out your mat', 'Find a clean place. The top of the mat, with the arch, goes toward the qibla.');
    setBig('mat', 'Roll out the mat', 'ready'); big.onclick = rollOut; ui.render();
  }
  function rollOut() {
    if (st.phase !== 'mat' || st.roll > 0) return;
    PS.play('cloth', { dur: 1.5 }); setBig('mat', 'Rolling out…', 'wait'); big.onclick = null;
    ui.animate(function (dt) { st.roll = Math.min(1, st.roll + dt / 1.8); st.rollE = ease(st.roll); if (st.roll >= 1) { PS.play('soft'); setTimeout(showQibla, 250); return false; } return true; });
  }

  /* ---------- 2. turn the compass to the qibla ---------- */
  var wrap = function (a) { return Math.atan2(Math.sin(a), Math.cos(a)); };
  function showQibla() {
    viewPray(false);
    st.phase = 'qibla'; st.roll = st.rollE = 1; dots();
    card('compass', 'Find the qibla', 'Turn the compass until the black Kaaba mark points to the top of your mat. Drag it round, or tap it.' +
      (bearing != null ? ' From your home, the qibla is ' + Math.round(bearing) + '° from north.' : ''));
    setBig('compass', 'Turn the compass', 'ready'); big.onclick = turnStep; ui.render();
  }
  var turning = 0;
  function turnTo(a, ms, then) {
    var a0 = st.qa, d = a - a0, t = 0, id = ++turning;
    ui.animate(function (dt) { if (id !== turning) return false; t += dt * 1000; var u = Math.min(1, t / ms); st.qa = a0 + d * ease(u); if (u >= 1) { then && then(); return false; } return true; });
  }
  function turnStep() {
    if (st.phase !== 'qibla' || st.qibla) return;
    PS.play('detent'); var next = st.qa + Math.PI / 4;
    turnTo(next, 280, function () { st.qa = wrap(next); if (Math.abs(wrap(st.qa - FIG.TARGET)) < .06) found(); });
  }
  function found() {
    st.qibla = true; st.qa = FIG.TARGET; PS.play('click'); ui.render();
    card('compass', 'That is the qibla', 'Your mat faces the Kaaba in Makkah. Now stand at the bottom of the mat.');
    setBig('check', 'Ready', 'ready'); big.onclick = showReady;
    setTimeout(function () { if (st.phase === 'qibla') showReady(); }, 1400);
  }
  // drag the compass round: the finger's angle on the floor turns the dial; it clicks into place near the qibla
  var drag = null, raf = 0;
  PS.stack.addEventListener('pointerdown', function (e) {
    if (st.phase !== 'qibla' || st.qibla || PX.actAt(e.clientX, e.clientY) !== 'compass') return;
    e.preventDefault(); e.stopPropagation(); turning++;
    drag = { id: e.pointerId, a0: PS.floorAngle(e, FIG.Q), q0: st.qa, x: e.clientX, y: e.clientY, moved: false, tick: Math.round(st.qa / (Math.PI / 8)) };
    try { PS.stack.setPointerCapture(e.pointerId); } catch (er) {}
  }, true);
  PS.stack.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) drag.moved = true;
    if (!drag.moved) return;
    st.qa = drag.q0 + wrap(PS.floorAngle(e, FIG.Q) - drag.a0);
    var tk = Math.round(st.qa / (Math.PI / 8)); if (tk !== drag.tick) { drag.tick = tk; PS.play('detent'); }
    if (!raf) raf = requestAnimationFrame(function () { raf = 0; ui.render(); });
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var moved = drag.moved; drag = null;
    if (!moved) return turnStep();
    if (Math.abs(wrap(st.qa - FIG.TARGET)) < .4) turnTo(st.qa + wrap(FIG.TARGET - st.qa), 220, found);
  }
  PS.stack.addEventListener('pointerup', endDrag); PS.stack.addEventListener('pointercancel', endDrag);

  /* ---------- 3. ready: which unit, and the intention ---------- */
  function kindLine(unit) {
    var k = K(unit), c = HHChart.COL[unit.kind], say = PS.esc(k.say).replace('ﷺ', '<span class="saw">ﷺ</span>');
    var h = '<div class="sp-kind"><i style="background:' + c + '"></i><span><b>' + k.name + ':</b> ' + say + '.</span></div>';
    if (unit.wajib && TXT.KINDS.wajib) h += '<div class="sp-kind"><i style="background:' + c + '"></i><span><b>' + TXT.KINDS.wajib.name + ':</b> ' + PS.esc(TXT.KINDS.wajib.say) + '.</span></div>';
    return h;
  }
  // the two looks of the child, as small faceless heads
  var LOOKICON = {
    cap: '<svg viewBox="0 0 32 32"><circle cx="16" cy="18" r="9.5" fill="#c98e62" stroke="#231e16" stroke-width="1.6"/><path d="M6.6 16.5a9.5 9.5 0 0 1 18.8 0z" fill="#fbf6ea" stroke="#231e16" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    scarf: '<svg viewBox="0 0 32 32"><path d="M4.5 29c.5-6 2-9 3.5-11a8 8 0 1 1 16 0c1.5 2 3 5 3.5 11z" fill="#7d61ad" stroke="#231e16" stroke-width="1.6" stroke-linejoin="round"/><ellipse cx="16" cy="17.5" rx="5.6" ry="6.6" fill="#c98e62" stroke="#231e16" stroke-width="1.3"/></svg>',
  };
  function showReady() {
    viewPray(true);
    st.phase = 'ready'; st.qibla = true; st.qa = FIG.TARGET; st.contacts = 'rise'; st.rakDone = 0;
    PS.hush(); stopWords();
    pauseB.style.display = 'none'; alt.style.display = 'none'; dots(); pill();
    var lines = kindLine(UNIT) + (UNITS.length > 1 ? '<div class="sp-q">' + PS.esc(PNAME) + ': tap one to pray it</div><div class="sp-pick"></div>' : '');
    if (UNIT.choose) lines += '<div class="sp-chs">' + UNIT.choose.slice().reverse().map(function (w) {
      return '<button class="sp-ch' + (w === W ? ' on' : '') + '" data-w="' + w + '">' + (w === 1 ? '1 rak’ah' : w + ' rak’ah' + (UNIT.parts ? ' (' + UNIT.parts.join(', then ') + ')' : '')) + '</button>';
    }).join('') + '</div>';
    lines += '<div class="sp-q">Who is praying?</div><div class="sp-chs">' + ['cap', 'scarf'].map(function (k) {
      return '<button class="sp-ch' + (KID.look === k ? ' on' : '') + '" data-look="' + k + '" aria-label="' + (k === 'cap' ? 'With a cap' : 'With a headscarf') + '">' + LOOKICON[k] + '</button>'; }).join('') + '</div>';
    card(PS.prayerIcon[PRAYER], PNAME + ': ' + short(), '<b>' + PS.esc(H.intention.title) + '.</b> ' + PS.esc(H.intention.hint.replace('{prayer}', intent())) +
      ' Stand at the bottom of your mat, facing the qibla, where your feet glow.', lines);
    var pick = PS.card.querySelector('.sp-pick');
    if (pick) HHChart.render(pick, { only: PRAYER, madhab: M, selected: { p: PRAYER, u: U }, onTap: function (p, u) { PS.play('tap'); setUnit(u, W); } });
    [].forEach.call(PS.card.querySelectorAll('.sp-ch[data-w]'), function (b) { b.onclick = function () { PS.play('tap'); setUnit(U, +b.dataset.w); }; });
    [].forEach.call(PS.card.querySelectorAll('.sp-ch[data-look]'), function (b) { b.onclick = function () {
      PS.play('tap'); KID.look = b.dataset.look; try { localStorage.setItem('hh.kid', KID.look); } catch (e) {}
      KID.setStyle({ madhab: M, girl: KID.look === 'scarf' }); kidCache = {}; kidN = 0; ui.render();
      [].forEach.call(PS.card.querySelectorAll('.sp-ch[data-look]'), function (x) { x.classList.toggle('on', x === b); });
      showKid('rise', null, false); }; });
    setBig('play', 'Start', 'ready'); big.onclick = function () { go(0, true); }; ui.render();
    showKid('rise', null, false); warmMove('rise', STEPS[0].pose);
    PS.preload(STEPS[0].lines.concat(STEPS[1].lines).map(function (l) { return l.audio; }));
  }
  // change the unit in place (the mat and the qibla stay), and keep the address in step for a reload
  function setUnit(u, w) {
    PS.hush(); setUnitVars(u, w);
    try { var p = new URLSearchParams(location.search); p.set('p', PRAYER); p.set('u', U); if (UNIT.choose) p.set('w', W); else p.delete('w'); p.delete('step'); history.replaceState(null, '', '?' + p); } catch (e) {}
    showReady();
  }

  /* ---------- 4. the positions ---------- */
  var cur = -1, lineIdx = 0, playing = false, wordsT = 0, has = {};
  function hasClip(id) { if (!id) return false; if (!(id in has)) { has[id] = null; try { HHVoice.has(id).then(function (v) { has[id] = v; }); } catch (e) { has[id] = false; } } return has[id]; }
  // one line of the words, split into words so they light up as they are said
  function wordsHTML(s, cls) { return s.split(/\s+/).filter(Boolean).map(function (w) { return '<span class="kw">' + PS.esc(w) + '</span>'; }).join(' '); }
  function showLine(k, rep) {
    var S = STEPS[cur], L = S.lines[k]; if (!L) return;
    var tag = L.moving ? 'Say it as you move' : L.surah ? L.surah + ' ' + L.ayah : '';
    var reps = ''; if (L.repeat > 1) { reps = '<div class="ps-rep">'; for (var i = 0; i < L.repeat; i++) reps += '<i class="' + (rep != null && i <= rep ? 'on' : '') + '"></i>'; reps += '</div>'; }
    var body = PS.card.querySelector('.sp-body');
    body.innerHTML = '<div class="ps-line">' + (tag ? '<div class="ps-mid"><span class="ps-tag">' + PS.esc(tag) + '</span></div>' : '') +
      '<div class="ps-ar" lang="ar">' + wordsHTML(L.ar) + '</div><div class="ps-tr">' + wordsHTML(L.tr) + (L.repeat > 1 ? ' <span style="font-style:normal">×' + L.repeat + '</span>' : '') + '</div>' +
      '<div class="ps-en">' + PS.esc(L.en) + '</div>' + reps + '</div>';
    [].forEach.call(PS.card.querySelectorAll('.sp-ld i'), function (d, i) { d.className = i < k ? 'on' : i === k ? 'cur' : ''; });
    body.classList.toggle('sp-k', playing);
    if (playing) PS.card.scrollTo({ top: 0 });
  }
  // light the words of the line being said, by how far into the clip we are (a missing clip: by its pause)
  function stopWords() { clearInterval(wordsT); wordsT = 0; var b = PS.card.querySelector('.sp-body'); if (b) b.classList.remove('sp-k'); }
  function wordsTick() {
    var S = STEPS[cur]; if (!S) return;
    var L = S.lines[lineIdx], c = PS.clip, p = 0, now = performance.now();
    if (c && c.seq === PS.clipSeq) p = (now - c.at) / c.dur;
    // no recorded clip (missing, muted, or no sound yet): HHVoice waits the line's pause instead, so pace by that
    else if (hasClip(L.audio) === false || (window.Kit && Kit.sfx && Kit.sfx.muted) || now - (PS.clipStart || now) > 450) p = (now - (PS.clipStart || now)) / (L.ms || 2000);
    [].forEach.call(PS.card.querySelectorAll('.sp-body .ps-ar, .sp-body .ps-tr'), function (row) {
      var ws = row.querySelectorAll('.kw'), tot = 0, acc = 0; [].forEach.call(ws, function (w) { tot += w.textContent.length + 1; });
      var at = p * tot, nowEl = null;
      [].forEach.call(ws, function (w) { var a0 = acc; acc += w.textContent.length + 1; var said = a0 < at, isNow = said && acc >= at && p < 1;
        if (w._s !== said) { w._s = said; w.classList.toggle('said', said); } if (w._n !== isNow) { w._n = isNow; w.classList.toggle('now', isNow); } if (isNow) nowEl = w; });
      // keep the word being said in view in a long line
      if (nowEl && row.classList.contains('ps-ar') && nowEl !== row._last) { row._last = nowEl; var c2 = PS.card, r = nowEl.getBoundingClientRect(), cr = c2.getBoundingClientRect();
        if (r.bottom > cr.bottom - 8 || r.top < cr.top + 56) c2.scrollBy({ top: r.top - cr.top - 70, behavior: 'smooth' }); }
    });
  }
  function setPlayIcon() { var b = PS.card.querySelector('.sp-play'); if (b) { b.innerHTML = PS.icon(playing ? 'pause' : 'play'); b.setAttribute('aria-label', playing ? 'Pause' : 'Play the words'); } }
  function go(i, play) {
    PS.hush(); stopWords(); if (i >= STEPS.length) return finish();
    cur = i; lineIdx = 0; playing = false;
    var S = STEPS[i], how = H[S.how], prev = i > 0 ? STEPS[i - 1].pose : 'rise';
    viewPray(true);
    st.phase = 'pray'; st.contacts = S.pose; st.rakDone = S.done || S.rak - 1;
    dots();
    // the glow on the mat moves to the new contact points as the body arrives (and the mat redraws in a frame of its own)
    showKid(S.pose, prev, true, function () { if (cur !== i || st.phase !== 'pray') return; ui.render(); warmMove(S.pose, STEPS[i + 1] ? STEPS[i + 1].pose : 'sit');
      setTimeout(function () { if (cur === i && st.phase === 'pray') { marks(S.pose); showMag(S.pose, S.how); } }, 60); });
    // the instruction: a sign of the position, one plain line that says right and left, and a small line of detail
    // (by madhab, and for a girl where it differs; the longer hint stays in prayer-text.js for grown-ups)
    var Ln = TXT.line(S.how, M, KID.look === 'scarf'), tag = S.sub && S.sub.length <= 24 ? S.sub : '';
    var more = (S.rest ? 'Now pray ' + PS.esc(S.rest) + '. ' : S.sub && !tag ? PS.esc(S.sub) + ' ' : '') + PS.esc(Ln.more || '');
    instr(SALAHPOSE.icon(S.pose), Ln.say || how.short || how.title, more);
    var ld = S.lines.length > 1 ? S.lines.map(function () { return '<i></i>'; }).join('') : '';
    PS.card.classList.add('sp-say');
    PS.card.innerHTML = '<div class="sp-sh"><button class="sp-play"></button><span class="sp-sl">Say</span>' + (tag ? '<span class="ps-tag">' + PS.esc(tag) + '</span>' : '') + '<span class="sp-ld">' + ld + '</span></div><div class="sp-body"></div>';
    PS.card.scrollTop = 0;
    PS.card.querySelector('.sp-play').onclick = togglePlay;
    setPlayIcon(); showLine(0);
    setBig('next', 'Next', ''); big.onclick = done;
    S.lines.forEach(function (l) { hasClip(l.audio); });
    var nx = STEPS[i + 1]; if (nx) PS.preload(nx.lines.map(function (l) { return l.audio; }));
    if (play) speak(); else big.classList.add('ready');
  }
  function speak() {
    var S = STEPS[cur], from = lineIdx, me = cur;
    playing = true; setPlayIcon(); big.classList.remove('ready');
    clearInterval(wordsT); wordsT = setInterval(wordsTick, 80);
    PS.say(S.lines.slice(from), { line: function (k, rep) { lineIdx = from + k; showLine(lineIdx, rep); } }).then(function (ok) {
      if (!ok || me !== cur) return;
      playing = false; stopWords(); setPlayIcon(); lineIdx = 0;
      [].forEach.call(PS.card.querySelectorAll('.sp-ld i'), function (d) { d.className = 'on'; });
      big.classList.add('ready');
    });
  }
  function togglePlay() {
    if (st.phase !== 'pray') return;
    PS.play('tap');
    if (playing) { playing = false; PS.hush(); stopWords(); setPlayIcon(); big.classList.add('ready'); }
    else speak();
  }
  function done() { PS.play('tap'); go(cur + 1, true); }
  pauseB.onclick = function () { if (st.phase === 'done') { PS.play('tap'); leave(); } };   // after tahajjud it is "Done for now"

  /* ---------- 5. finished: log it, then offer the next unit of this prayer, or "Done for now" ---------- */
  function nextUnits() {
    var L = todayLog(), out = [];
    if (UNIT.repeat) {   // tahajjud: another pair, and the witr if it wasn't prayed after Isha
      out.push({ u: U, label: '2 more' });
      UNITS.forEach(function (x, i) { if (x.kind === 'witr' && !HHChart.prayed(L, PRAYER, i, x)) out.push({ u: i, label: 'Now Witr' }); });
      return out;
    }
    for (var i = U + 1; i < UNITS.length; i++) if (!HHChart.prayed(L, PRAYER, i, UNITS[i])) return [{ u: i, label: 'Now ' + short(UNITS[i]) }];
    return out;
  }
  // leave the station: on to the next station or back to the house (as HHFlow.done does, without logging twice),
  // else to today's chart
  function leave() {
    PS.hush();
    if (window.HHFlow && HHFlow.fromHouse) {
      var nx = (q.get('next') || '').split(',').filter(Boolean);
      location.href = nx.length ? HHFlow.url(nx[0], { from: 'house', p: HHFlow.prayer, next: nx.slice(1).join(',') }) : HHFlow.url('house', { back: 'salah' });
    } else location.href = HHFlow.url('pray/today.html');
  }
  function finish() {
    var prev = cur >= 0 && STEPS[cur] ? STEPS[cur].pose : 'salamL';
    viewPray(true); stopWords();
    st.phase = 'done'; st.rakDone = N; st.contacts = 'sit'; ui.render(); dots();
    showKid('sit', prev, true);
    pauseB.style.display = 'none';
    var data = { p: PRAYER, kind: UNIT.kind, rakah: N, u: U };
    if (logs) { try { HHFlow.mark('salah', data); } catch (e) {} try { window.KahfBridge && KahfBridge.complete(); } catch (e) {} }
    PS.play('done');
    setTimeout(function () { try { Kit.say && Kit.say.praise && Kit.say.praise('mashaallah'); } catch (e) {} }, 500);
    var what = UNIT.kind === 'witr' ? 'Witr, ' + N + ' rak’ah' : PRAYER === 'tahajjud' ? 'Tahajjud, ' + N + ' rak’ah' : PNAME + ', ' + short();
    var nx = nextUnits();
    card('check', 'You prayed it', '<b>' + PS.esc(what) + '</b>, in the right order. Masha’Allah!' + (nx.length ? ' Pray the next one now, or later.' : ''), kindLine(UNIT));
    if (nx.length) {
      setBig('play', nx[0].label, 'ready'); big.onclick = function () { PS.play('tap'); setUnit(nx[0].u, W); };
      alt.style.display = ''; alt.innerHTML = '<span>' + (nx[1] ? nx[1].label : 'Done for now') + '</span>';
      alt.onclick = nx[1] ? function () { PS.play('tap'); setUnit(nx[1].u, W); } : function () { PS.play('tap'); leave(); };
      if (nx[1]) { pauseB.style.display = ''; pauseB.innerHTML = PS.icon('home'); pauseB.setAttribute('aria-label', 'Done for now'); }
    } else {
      alt.style.display = 'none';
      setBig('check', 'Done', 'ready'); big.onclick = function () { PS.play('tap'); leave(); };
    }
  }

  /* ---------- open at a step (checks and screenshots) ---------- */
  var k0 = +(q.get('step') || 0);
  if (q.has('qa')) st.qa = +q.get('qa') * Math.PI / 180;
  if (k0 >= 3 + STEPS.length) { st.roll = st.rollE = 1; st.qibla = true; st.qa = FIG.TARGET; cur = STEPS.length - 1; finish(); }
  else if (k0 >= 3) { st.roll = st.rollE = 1; st.qibla = true; st.qa = FIG.TARGET; go(k0 - 3, auto); }
  else if (k0 === 2) { st.roll = st.rollE = 1; showReady(); }
  else if (k0 === 1) { st.roll = st.rollE = 1; showQibla(); }
  else { if (q.has('roll')) st.roll = +q.get('roll'), st.rollE = ease(st.roll); showMat(); }
  window.__salah = { st: st, go: go, ui: ui, setUnit: setUnit, replay: replay, get STEPS() { return STEPS; }, get unit() { return { u: U, unit: UNIT, n: N, parts: PARTS, madhab: M }; } };
})();
