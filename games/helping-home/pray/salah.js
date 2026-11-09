/* Helping Home: the salah station. "Do it with me": a guide the child follows with their real body.
   1 Roll out the mat (tap the roll or the big button).  2 Turn the qibla compass until it clicks (drag it round, or
   tap to turn it a step).  3 Make the intention, then pray: each position is shown three ways (glowing contact points
   on the mat, a faceless posture picture, and the words in Arabic, transliteration and meaning, with recorded audio).
   The audio paces each position; the child can pause at any time, and taps the big "I'm done" to move on. Nothing is
   scored or timed. A bead counter on the mat (and in the title) fills as each rak'ah is finished.

   Structure (the common Sunnah order shared by the four madhhabs):
     every rak'ah: [stand: Fatihah (+ a surah in rak'ah 1-2)] -> ruku' -> stand up -> sujood -> sit -> sujood
     rak'ah 1 opens with the takbir, the opening du'a and the ta'awwudh
     2 rak'ah: the tashahhud, salawat and salam after rak'ah 2
     3/4 rak'ah: the middle tashahhud after rak'ah 2, al-Fatihah only in rak'ah 3 and 4, then the final tashahhud,
     salawat (as-salat al-Ibrahimiyyah) and salam right, then left.
   ?p=fajr|dhuhr|asr|maghrib|isha (else the current prayer from HHPrayer, else Dhuhr). ?step=N opens a step for
   checking: 0 mat, 1 qibla, 2 ready, 3.. the positions (past the end = finished); add &auto=1 to let it play.
   Text: pray/prayer-text.js (TEACHER REVIEW). Figure: pray/salah-figure.js. Posture: pray/salah-pose.js. */
(function () {
  'use strict';
  var TXT = window.PRAYER_TEXT, T = TXT.S, H = TXT.HOW, q = new URLSearchParams(location.search), FIG = window.SALAHFIG;
  var PRAYER = PS.prayer(), PNAME = TXT.NAMES[PRAYER];
  var N = TXT.RAKAH[PRAYER] || (window.HHPrayer && HHPrayer.RAKAH && HHPrayer.RAKAH[PRAYER]) || 2;

  /* ---------- the positions ---------- */
  function build(n) {
    var S = [];
    function add(how, pose, contacts, lines, rak, o) { S.push(Object.assign({ how: how, pose: pose, contacts: contacts, lines: lines, rak: rak }, o || {})); }
    var mov = function (t) { return Object.assign({ moving: true }, t); };   // said while moving to the next position
    for (var r = 1; r <= n; r++) {
      if (r === 1) {
        add('takbir', 'takbir', 'stand', [T.takbir], 1);
        add('stand', 'stand', 'stand', [T.thana, T.taawwudh], 1, { sub: 'Opening du’a' });
        add('stand', 'stand', 'stand', TXT.FATIHA.concat([T.amin]), 1, { sub: 'Al-Fatihah' });
      } else add('standUp', 'stand', 'stand', [mov(T.takbir)].concat(TXT.FATIHA, [T.amin]), r, { sub: 'Al-Fatihah' });
      if (r <= 2) add('stand', 'stand', 'stand', r === 1 ? TXT.KAWTHAR : TXT.IKHLAS, r, { sub: r === 1 ? 'Surat al-Kawthar' : 'Surat al-Ikhlas' });
      add('ruku', 'ruku', 'stand', [mov(T.takbir), T.ruku], r);
      add('rise', 'rise', 'stand', [T.sami, T.rabbana], r);
      add('sujud', 'sujud', 'sujud', [mov(T.takbir), T.sujud], r, { sub: 'First sujood' });
      add('jalsa', 'sit', 'sit', [mov(T.takbir), T.jalsa], r);
      add('sujud', 'sujud', 'sujud', [mov(T.takbir), T.sujud], r, { sub: 'Second sujood' });
      if (r === 2 && n > 2) add('tash', 'tash', 'sit', [mov(T.takbir), T.tashahhud], r, { done: r, sub: 'The middle sitting. Then stand up for rak’ah 3.' });
      if (r === n) {
        add('tash', 'tash', 'sit', [mov(T.takbir), T.tashahhud, T.ibrahimiyya], r, { done: r, sub: 'The last sitting: the tashahhud, then the salawat.' });
        add('salamR', 'salamR', 'sit', [T.salam], r, { done: r });
        add('salamL', 'salamL', 'sit', [T.salam], r, { done: r });
      }
    }
    return S;
  }
  var STEPS = build(N);

  /* ---------- figure + page ---------- */
  var bearing = null;
  try { if (window.HHPrayer && HHPrayer.settings && HHPrayer.settings()) { var b = HHPrayer.qibla(); if (isFinite(b)) bearing = b; } } catch (e) {}
  var st0 = { roll: 0, rollE: 0, qa: Math.PI / 4, qibla: false, bearing: bearing, phase: 'mat', contacts: 'stand', rakN: N, rakDone: 0 };
  // the camera: higher and turned toward the foot of the mat on a phone, so the mat stands tall and its glowing points read
  var ui = mountFigure({ fig: 'S', title: 'Salah', palette: 'mint', credit: false, size: FIG.size, center: FIG.center, state: st0, scene: FIG.scene });
  var st = ui.st;
  if (!q.has('yaw') && !q.has('pitch')) { if (innerHeight > innerWidth) setCam(20, 50); else setCam(32, 46); }
  var style = PS.el('style'); style.textContent = '' +
    '.ps-card.sp{display:flex;flex-direction:column;overflow:hidden;padding:10px 10px 8px}' +
    '.sp-head{display:flex;align-items:center;gap:10px;flex:none;padding:0 2px 4px}' +
    '.sp-ht{flex:1;min-width:0}.sp-ht .ps-h{margin:0 0 2px;font-size:18px;flex-wrap:wrap;row-gap:4px}.sp-ht .ps-hint{margin:0;font-size:14px}' +
    '.sp-medal{flex:none;width:clamp(92px,25vw,118px);aspect-ratio:1;border-radius:50%;background:#fbf3df;border:2.5px solid var(--ink);box-shadow:0 3px 0 var(--ink);overflow:hidden}' +
    '.sp-medal svg{display:block;width:100%;height:100%}' +
    '.sp-medal.sp-fade svg{animation:spFade .45s ease-out}@keyframes spFade{from{opacity:0}to{opacity:1}}' +
    '.sp-lines{flex:1 1 auto;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:0 2px 2px}' +
    '.ps-h .ps-tag{margin:0 0 0 auto;flex:none}' +
    '@media (min-width:760px) and (min-aspect-ratio:1/1){.sp-medal{width:150px}.sp-ht .ps-h{font-size:21px}.sp-ht .ps-hint{font-size:15px}}';
  document.head.appendChild(style);
  PS.mount({ ui: ui, scene: FIG.scene, acts: { mat: function () { if (st.phase === 'mat') rollOut(); }, compass: function () { if (st.phase === 'qibla') turnStep(); } } });
  var medal = PS.el('div', 'sp-medal');
  PS.card.classList.add('sp');
  // the card: [posture picture | title, rak'ah tag, what to do] above a scrolling list of the words
  function card(icon, title, tag, hint, lines, withPose) {
    PS.card.innerHTML = '<div class="sp-head"><div class="sp-ht">' + head(icon, title, tag) + '<div class="ps-hint">' + hint + '</div></div></div><div class="sp-lines">' + (lines || '') + '</div>';
    if (withPose) PS.card.firstChild.insertBefore(medal, PS.card.firstChild.firstChild);
    PS.scroller = PS.card.querySelector('.sp-lines');
  }
  var pose = SALAHPOSE.mount(medal); pose.set('stand', true);
  PS.title(PS.icon(PS.prayerIcon[PRAYER]) + '<span>' + PNAME + ' · ' + N + ' rak’ah</span>');

  var pauseB = PS.el('button', 'ps-round', PS.icon('pause')), big = PS.el('button', 'ps-big');
  pauseB.setAttribute('aria-label', 'Pause');
  PS.ctl.appendChild(pauseB); PS.ctl.appendChild(big);
  var auto = !q.has('step') || q.get('auto') === '1';

  function setBig(icon, label, cls) { big.innerHTML = PS.icon(icon) + '<span>' + label + '</span>'; big.className = 'ps-big' + (cls ? ' ' + cls : ''); big.setAttribute('aria-label', label); }
  function dots() { PS.dots(N, st.phase === 'pray' || st.phase === 'done' ? st.rakDone : -1); }
  function head(icon, title, tag) { return '<div class="ps-h">' + PS.icon(icon) + '<span>' + PS.esc(title) + '</span>' + (tag ? '<span class="ps-tag">' + PS.esc(tag) + '</span>' : '') + '</div>'; }

  /* ---------- 1. roll out the mat ---------- */
  function showMat() {
    st.phase = 'mat'; pauseB.style.visibility = 'hidden'; dots();
    card('mat', 'Roll out your prayer mat', '', 'Find a clean place. The top of the mat, with the arch, goes toward the qibla.');
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
    st.phase = 'qibla'; st.roll = st.rollE = 1; pauseB.style.visibility = 'hidden'; dots();
    card('compass', 'Find the qibla', '', 'Turn the compass until the black Kaaba mark points to the top of your mat. Drag it round, or tap it.' +
      (bearing != null ? ' From your home, the qibla is ' + Math.round(bearing) + '\u00b0 from north.' : ''));
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
    card('compass', 'That is the qibla', '', 'Your mat faces the Kaaba in Makkah. Now stand at the bottom of the mat.');
    setBig('check', 'Ready', 'ready'); big.onclick = showReady;
    setTimeout(function () { if (st.phase === 'qibla') showReady(); }, 1400);
  }
  // drag the compass round: the finger's angle on the floor turns the dial; it clicks into place near the qibla
  var drag = null, raf = 0;
  PS.stack.addEventListener('pointerdown', function (e) {
    var c = e.target.closest && e.target.closest('[data-act="compass"]'); if (!c || st.phase !== 'qibla' || st.qibla) return;
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

  /* ---------- 3. ready: the intention ---------- */
  function showReady() {
    st.phase = 'ready'; st.qibla = true; st.qa = FIG.TARGET; st.contacts = 'stand'; st.rakDone = 0;
    pose.set('stand'); pauseB.style.visibility = 'hidden'; dots();
    card(PS.prayerIcon[PRAYER], PNAME + ': ' + N + ' rak\u2019ah', '', '<b>' + PS.esc(H.intention.title) + '.</b> ' + PS.esc(H.intention.hint.replace('{prayer}', PNAME)) +
      ' Stand at the bottom of your mat, facing the qibla, where your feet glow.', '', true);
    setBig('play', 'Start', 'ready'); big.onclick = function () { go(0, true); }; ui.render();
    PS.preload(STEPS[0].lines.concat(STEPS[1].lines).map(function (l) { return l.audio; }));
  }

  /* ---------- 4. the positions ---------- */
  var cur = -1, lineIdx = 0, paused = false;
  function go(i, play) {
    PS.hush(); if (i >= STEPS.length) return finish();
    cur = i; lineIdx = 0; paused = false;
    var S = STEPS[i], how = H[S.how];
    st.phase = 'pray'; st.contacts = S.contacts; st.rakDone = S.done || S.rak - 1;
    pose.set(S.pose); dots(); ui.render();
    var tag = 'Rak\u2019ah ' + S.rak + ' of ' + N, lines = '';
    S.lines.forEach(function (L) { lines += PS.lineHTML(L, { tag: L.moving ? 'Say it as you move' : L.surah && L.ayah === 1 ? L.surah : '' }); });
    card(S.how === 'salamR' || S.how === 'salamL' ? 'hands' : 'mat', how.title, tag,
      (S.sub && S.sub.length > 24 ? PS.esc(S.sub) + ' ' : S.sub ? '<b>' + PS.esc(S.sub) + '.</b> ' : '') + PS.esc(how.hint), lines, true);
    pauseB.style.visibility = 'visible'; pauseB.innerHTML = PS.icon('pause'); pauseB.setAttribute('aria-label', 'Pause');
    setBig('check', i === STEPS.length - 1 ? 'I’m done' : 'I’m done', ''); big.onclick = done;
    PS.light(0, -1);
    var nx = STEPS[i + 1]; if (nx) PS.preload(nx.lines.map(function (l) { return l.audio; }));
    if (play) speak(); else big.classList.add('ready');
  }
  function speak() {
    var S = STEPS[cur], from = lineIdx, me = cur;
    PS.say(S.lines.slice(from), { line: function (k, rep) { lineIdx = from + k; PS.light(lineIdx, rep); } }).then(function (ok) {
      if (!ok || me !== cur) return;
      PS.light(-1); big.classList.add('ready'); lineIdx = 0;
    });
  }
  function done() { PS.play('tap'); go(cur + 1, true); }
  pauseB.onclick = function () {
    if (st.phase !== 'pray') return;
    PS.play('tap'); paused = !paused;
    if (paused) { PS.hush(); pauseB.innerHTML = PS.icon('play'); pauseB.setAttribute('aria-label', 'Play'); }
    else { pauseB.innerHTML = PS.icon('pause'); pauseB.setAttribute('aria-label', 'Pause'); big.classList.remove('ready'); speak(); }
  };

  function finish() {
    st.phase = 'done'; st.rakDone = N; st.contacts = 'sit'; ui.render(); dots(); pose.set('sit');
    pauseB.style.visibility = 'hidden';
    card('check', 'You prayed ' + PNAME, '', N + ' rak\u2019ah, in the right order. Masha\u2019Allah!', '', true);
    setBig('again', 'Pray again', ''); big.onclick = function () { go(0, true); };
    PS.finish('salah', { p: PRAYER }, { title: 'You prayed ' + PNAME, text: N + ' rak’ah. Masha’Allah!', stars: null, closeable: true,
      buttons: [{ label: 'Pray again', primary: true, onClick: function () { go(0, true); } }] });
  }

  /* ---------- open at a step (checks and screenshots) ---------- */
  var k0 = +(q.get('step') || 0);
  if (q.has('qa')) st.qa = +q.get('qa') * Math.PI / 180;
  if (k0 >= 3 + STEPS.length) { st.roll = st.rollE = 1; st.qibla = true; st.qa = FIG.TARGET; finish(); }
  else if (k0 >= 3) { st.roll = st.rollE = 1; st.qibla = true; st.qa = FIG.TARGET; go(k0 - 3, auto); }
  else if (k0 === 2) { st.roll = st.rollE = 1; showReady(); }
  else if (k0 === 1) { st.roll = st.rollE = 1; showQibla(); }
  else { if (q.has('roll')) st.roll = +q.get('roll'), st.rollE = ease(st.roll); showMat(); }
  window.__salah = { st: st, STEPS: STEPS, go: go, ui: ui };
})();
