/* Helping Home: the adhan station. Made with Colorfigures (MIT).
   A small model minaret on a wooden shelf "calls" the adhan phrase by phrase: its lantern windows light up and sound
   rings spread from the gallery. After each phrase the child taps one big button with the reply (a guided reply:
   there is no wrong answer). Then the salawat on the Prophet and the du'a after the adhan (Sahih al-Bukhari 614).
   Done -> HHFlow.done('adhan') (on to wudu), or the kit's finish sheet.

   The figure, in the Ottoman style common in many cities:
     SHELF   wooden board 70 x 70, 3 thick
     PLINTH  square stone base 22 x 22 with an arched door, a cornice on top
     SHAFT   octagonal stone shaft (r 9 -> 8.6) with small slit windows
     GALLERY corbel ring (r 8.6 -> 12.5) under the balcony floor, a pierced railing (r 12.2) all round
     LANTERN upper octagonal storey (r 7) with eight arched windows: they glow while the adhan is called
     ROOF    eave, a flared ring and a tall faceted cone in teal tiles; a gold rod, ball and crescent on top
   Coordinates: x = depth (front at x = 70), y = width, z = up; 1 unit ~ 1 cm of the model.
   Text: pray/prayer-text.js (TEACHER REVIEW). Audio ids: adhan/<phrase>, resp/hawqala, resp/salawat, resp/dua-adhan. */
(function () {
  'use strict';
  var TXT = window.PRAYER_TEXT, q = new URLSearchParams(location.search);
  var PRAYER = PS.prayer(), PNAME = TXT.NAMES[PRAYER];

  /* ---------- the model ---------- */
  var CX = 35, CY = 35, N8 = 8, ROT = Math.PI / 8;
  var STONE = { l: '#f4ead3', m: '#dfd0ae', d: '#b39f7a' }, STONE2 = { l: '#eadcbc', m: '#d2bf98', d: '#a38e68' };
  var ROOF = { l: '#6cbcaa', m: '#4c9886', d: '#2c5f53' }, GOLD = { l: '#f6cd5e', m: '#d9a83a', d: '#8e6a1e' };
  var GLOW = '#ffd56a', DARKWIN = '#4a4037';

  function ring(r, z, n, rot) { n = n || N8; rot = rot == null ? ROT : rot; var o = [];
    for (var i = 0; i < n; i++) { var a = rot + i * 2 * Math.PI / n; o.push([CX + r * Math.cos(a), CY + r * Math.sin(a), z]); } return o; }
  function outN(a0, a1, b0) {                         // outward normal of the face a0-a1-b0 of a ring around the axis
    var nr = norm(cross(sub(a1, a0), sub(b0, a0))), m = avg([a0, a1, b0]);
    if (dot(nr, [m[0] - CX, m[1] - CY, 0]) < 0) nr = nr.map(function (v) { return -v; });
    return nr;
  }
  // an octagonal frustum: faces (each inked), a top cap, a heavier silhouette. deco(i, quad, n) adds detail per visible face
  function prism(r0, z0, r1, z1, m, o) {
    o = o || {}; var A = ring(r0, z0), B = ring(r1, z1), s = '';
    for (var i = 0; i < N8; i++) {
      var j = (i + 1) % N8, quad = [A[i], A[j], B[j], B[i]], n = outN(A[i], A[j], B[i]);
      if (!vis(n)) continue;
      s += shape(quad, tone(n, m), o.w || .8);
      if (o.deco) s += o.deco(i, quad, n);
    }
    if (r1 > .6 && vis([0, 0, 1])) s += shape(B, tone([0, 0, 1], m), o.w || .8);
    return s + hullInk(A.concat(B), o.sil || 2);
  }
  // a point on a face: u across (0..1), v up (0..1)
  function onQuad(q4, u, v) { var lo = [0, 1, 2].map(function (k) { return q4[0][k] + (q4[1][k] - q4[0][k]) * u; }),
    hi = [0, 1, 2].map(function (k) { return q4[3][k] + (q4[2][k] - q4[3][k]) * u; });
    return [0, 1, 2].map(function (k) { return lo[k] + (hi[k] - lo[k]) * v; }); }
  // an arched opening on a vertical face, centred, w wide, from z0 to z1 (arch included), pushed out a hair
  function archOn(q4, n, w, z0, z1, col, iw) {
    var a = q4[0], b = q4[1], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], t = norm([b[0] - a[0], b[1] - a[1], 0]), r = w / 2, pts = [];
    var at = function (u, z) { return [mid[0] + t[0] * u + n[0] * .15, mid[1] + t[1] * u + n[1] * .15, z]; };
    pts.push(at(-r, z0), at(r, z0));
    for (var k = 0; k <= 8; k++) { var ang = Math.PI * k / 8; pts.push(at(r * Math.cos(ang), z1 - r + r * Math.sin(ang))); }
    return shape(pts, col, iw || .9);
  }

  function minaret(st) {
    var s = '', lit = st.calling;
    // shelf + cast shadow
    s += board(0, 0, 70, 70, 3, 6, WOOD);
    // the shadow of each part (plinth, shaft, gallery, lantern, roof), so it tapers like the tower instead of a fan
    var clip = boardTop(0, 0, 70, 70, 3, 6), sh = '';
    [[[24, 24, 3], [46, 24, 3], [24, 46, 3], [46, 46, 3], [23, 23, 15.2], [47, 23, 15.2], [23, 47, 15.2], [47, 47, 15.2]],
     ring(9, 15).concat(ring(8.6, 58)), ring(12.5, 58).concat(ring(12.5, 70)), ring(7, 70).concat(ring(9.4, 89.5)),
     ring(8.8, 89.5).concat([[CX, CY, 117]])].forEach(function (pts) { sh += castShadow(pts, 3); });
    s += clipTo(clip, sh);
    // plinth: a square stone base with an arched door on the front, a cornice
    s += box(24, 24, 3, 46, 46, 13, STONE, tone, .9);
    if (vis([1, 0, 0])) {
      var dq = [[46, 41, 3], [46, 29, 3], [46, 29, 13], [46, 41, 13]];
      s += archOn(dq, [1, 0, 0], 5.6, 3, 11, '#6b4a33', 1) + archOn(dq, [1, 0, 0], 3.6, 3.6, 10, '#8a6244', .7);
    }
    if (vis([0, 1, 0])) { var sq = [[26, 46, 3], [44, 46, 3], [44, 46, 13], [26, 46, 13]]; s += archOn(sq, [0, 1, 0], 4.4, 6, 11, DARKWIN, .9); }
    s += box(23, 23, 13, 47, 47, 15.2, STONE2, tone, .9) + hullInk([[23, 23, 13], [47, 23, 13], [23, 47, 13], [47, 47, 13], [23, 23, 15.2], [47, 23, 15.2], [23, 47, 15.2], [47, 47, 15.2]], 1.6);
    // shaft with two rows of slit windows and a carved band
    s += prism(9, 15.2, 8.6, 58, STONE, { sil: 2.4, deco: function (i, q4, n) {
      var d = '';
      if (i % 2 === 0) d += archOn(q4, n, 1.7, 27, 32.5, DARKWIN, .8);
      if (i % 2 === 1) d += archOn(q4, n, 1.7, 41, 46.5, DARKWIN, .8);
      d += line([onQuad(q4, 0, .86), onQuad(q4, 1, .86)], .7) + line([onQuad(q4, 0, .9), onQuad(q4, 1, .9)], .7);
      return d; } });
    // corbels under the balcony: little scalloped arches (muqarnas, simplified)
    s += prism(8.6, 58, 12.5, 63, STONE2, { deco: function (i, q4) {
      var d = [];
      for (var k = 0; k < 3; k++) for (var e = 0; e <= 6; e++) { var u = (k + e / 6) / 3, v = .25 + .45 * Math.sin(Math.PI * e / 6); d.push(onQuad(q4, u, v)); }
      return line(d, .7); } });
    s += prism(12.5, 63, 12.5, 64.6, STONE, { sil: 1.6 });
    // railing: far panels (seen from inside), the lantern storey, then the near panels
    var RA = ring(12.1, 64.6), RB = ring(12.1, 70), far = '', near = '';
    for (var i = 0; i < N8; i++) {
      var j = (i + 1) % N8, q4 = [RA[i], RA[j], RB[j], RB[i]], n = outN(RA[i], RA[j], RB[i]);
      if (vis(n)) {
        var pat = '';
        for (var k = 0; k < 2; k++) { var u0 = .12 + k * .44, u1 = u0 + .32;
          pat += shape([onQuad(q4, u0, .22), onQuad(q4, u1, .22), onQuad(q4, u1, .62), onQuad(q4, (u0 + u1) / 2, .82), onQuad(q4, u0, .62)], '#8a6f52', .6); }
        near += shape(q4, tone(n, STONE), .8) + pat;
      } else far += shape(q4, toneI(n.map(function (v) { return -v; }), STONE2), .8);
    }
    s += far;
    var win = lit ? GLOW : DARKWIN;
    s += prism(7, 64.6, 7, 86, STONE, { sil: 2, deco: function (i, q4, n) {
      return archOn(q4, n, 2.9, 72, 81.5, win, .9) + (lit ? archOn(q4, n, 1.3, 74, 79.5, '#fff1c4', 0) : '') + line([onQuad(q4, 0, .97), onQuad(q4, 1, .97)], .6); } });
    s += near + hullInk(RA.concat(RB), 1.8);
    // eave, ring and the tiled cone roof
    s += prism(7, 86, 9.4, 88, STONE2, { sil: 1.4 });
    s += prism(9.4, 88, 9.4, 89.5, STONE, { sil: 1.4 });
    s += prism(8.8, 89.5, .5, 108, ROOF, { sil: 2.2, deco: function (i, q4) {
      return [.22, .45, .66].map(function (v) { return line([onQuad(q4, 0, v), onQuad(q4, 1, v)], .55); }).join(''); } });
    // finial: rod, ball, crescent (opening upward), always facing the viewer
    s += rod([CX, CY, 107.5], [CX, CY, 113.5], .55, GOLD, toneI, .8);
    var b = P(CX, CY, 110.6), k1 = Math.hypot.apply(null, sub(P(CX, CY, 1), P(CX, CY, 0)).slice(0, 2));
    s += '<circle cx="' + f(b[0]) + '" cy="' + f(b[1]) + '" r="' + f(1.5 * k1) + '" fill="' + GOLD.l + '" stroke="' + INK + '" stroke-width="1"/>';
    var c = P(CX, CY, 116.2), R = 2.6 * k1, r2 = .85 * R, lx = -.8495 * R, ly = -.5275 * R;
    s += '<path d="M' + f(c[0] + lx) + ' ' + f(c[1] + ly) + 'A' + f(R) + ' ' + f(R) + ' 0 1 0 ' + f(c[0] - lx) + ' ' + f(c[1] + ly) +
         'A' + f(r2) + ' ' + f(r2) + ' 0 1 1 ' + f(c[0] + lx) + ' ' + f(c[1] + ly) + 'Z" fill="' + GOLD.l + '" stroke="' + INK + '" stroke-width="1.1" stroke-linejoin="round"/>';
    return s;
  }

  // sound rings and the lantern glow: no filter, CSS motion only (nothing is redrawn while they pulse)
  function fx(st) {
    if (!st.calling) return '';
    var c = P(CX, CY, 77), k1 = Math.hypot.apply(null, sub(P(CX, CY, 1), P(CX, CY, 0)).slice(0, 2)), s = '';
    s += '<defs><radialGradient id="adGlow"><stop offset="0" stop-color="#ffd56a" stop-opacity=".75"/><stop offset="1" stop-color="#ffd56a" stop-opacity="0"/></radialGradient></defs>';
    s += '<circle class="ps-pulse" cx="' + f(c[0]) + '" cy="' + f(c[1]) + '" r="' + f(16 * k1) + '" fill="url(#adGlow)"/>';
    for (var w = 1; w <= 3; w++) {
      var R = 21 * k1, a = 38 * Math.PI / 180, arc = function (sx) { return 'M' + f(sx * R * Math.cos(a)) + ' ' + f(-R * Math.sin(a)) + 'A' + f(R) + ' ' + f(R) + ' 0 0 ' + (sx > 0 ? 1 : 0) + ' ' + f(sx * R * Math.cos(a)) + ' ' + f(R * Math.sin(a)); };
      s += '<g transform="translate(' + f(c[0]) + ' ' + f(c[1]) + ')"><g class="ps-wave w' + w + '"><path d="' + arc(1) + arc(-1) + '" fill="none" stroke="#e0a21c" stroke-width="' + f(2.2 * k1 * .5 + 1.2) + '" stroke-linecap="round"/></g></g>';
    }
    return s;
  }

  function scene(st) { return minaret(st) + '<!--FX-->' + fx(st) + '<!--/FX-->'; }

  /* ---------- the steps ---------- */
  var PH = TXT.ADHAN.filter(function (p) { return !p.fajrOnly || PRAYER === 'fajr'; });
  var STEPS = [{ kind: 'intro' }].concat(PH.map(function (p) { return { kind: 'phrase', p: p }; }), [{ kind: 'after', t: TXT.AFTER.salawat, key: 'salawat' }, { kind: 'after', t: TXT.AFTER.dua, key: 'dua' }]);

  var st0 = { k: 0, phase: 'intro', calling: false };
  var ui = mountFigure({ fig: 'P', turn: 'full', title: 'Adhan', palette: 'mustard', credit: false,
    size: [70, 70, 118], center: [35, 35], state: st0, scene: scene });
  PS.mount({ ui: ui, scene: scene, pixi: true });      // the minaret is drawn by PixiJS (iso/pix.js)
  var st = ui.st;
  PS.title(PS.icon(PS.prayerIcon[PRAYER]) + '<span>' + PNAME + ' adhan</span>');
  PS.preload(PH.map(function (p) { return p.text.audio; }).concat(['resp/hawqala']));

  /* ---------- whose turn it is, without reading: an ear while the minaret calls (listen), a speech bubble and a
     big bouncing reply button when it stops (your turn). The banner sits on the figure; the card repeats it. ---------- */
  PS.icons.ear = '<path d="M9 9.6C9 6 11.6 3.4 14.7 3.4S20.3 6 20.3 9.4c0 3-2 4.2-3 5.6-.8 1.2-.7 2.6-1.5 3.9-.8 1.3-2 2-3.4 2-1.8 0-3.2-1.3-3.4-3" fill="#fff4c9"/><path d="M12.4 10.1c0-1.6 1.1-2.9 2.5-2.9s2.6 1.2 2.6 2.7c0 1.3-1 1.9-1.9 2.5"/><path d="M14.4 13c.7.4.9 1.2.6 1.9"/><path d="M5.6 7.6c-1.2 1.6-1.2 4.4 0 6M3 5.6c-2 2.8-2 7.6 0 10.4" stroke-width="1.7"/>';
  PS.icons.speak = '<path d="M4.5 4.5h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 4v-4h-2a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z" fill="#fff4c9"/><path d="M8 10.5h.01M12 10.5h.01M16 10.5h.01" stroke-width="3.2"/>';
  PS.icons.arrowR = '<path d="M4.5 12h14M13 6.5l5.5 5.5-5.5 5.5"/>';
  var css = document.createElement('style');
  css.textContent =
    '.ad-turn{position:absolute;left:12px;top:10px;z-index:5;display:flex;align-items:center;gap:10px;padding:8px 18px 8px 10px;border-radius:999px;border:2.5px solid var(--ink);' +
      'background:var(--card,#fffaf0);box-shadow:0 4px 0 var(--ink);font:900 20px/1 ui-rounded,"SF Pro Rounded",Nunito,system-ui,sans-serif;transition:opacity .25s,background .25s;pointer-events:none}' +
    '.ad-turn[hidden]{display:none}.ad-turn svg{width:40px;height:40px;flex:none}' +
    '.ad-turn .ad-ic{position:relative;display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:#fff}' +
    '.ad-turn.listen .ad-ic::after{content:"";position:absolute;inset:-2px;border-radius:50%;border:3px solid #e0a21c;animation:adEar 1.4s ease-out infinite}' +
    '.ad-turn.turn{background:var(--accent);animation:adHop .9s ease-in-out infinite}' +
    '.ad-turn.say{background:var(--soft)}' +
    '@keyframes adEar{0%{transform:scale(.8);opacity:1}100%{transform:scale(1.5);opacity:0}}' +
    '@keyframes adHop{0%,100%{transform:none}50%{transform:translateY(-5px)}}' +
    // the two steps of every phrase, side by side in the card: 1 listen, 2 your turn
    '.ad-steps{display:flex;align-items:stretch;justify-content:center;gap:6px;margin:2px 0 8px}' +
    '.ad-step{flex:1;max-width:190px;display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:16px;border:2px solid rgba(35,30,22,.25);font:800 15px/1.15 ui-rounded,"SF Pro Rounded",Nunito,system-ui,sans-serif;color:var(--ink2);opacity:.6;transition:all .25s}' +
    '.ad-step svg{width:30px;height:30px;flex:none}.ad-step.on{opacity:1;color:var(--ink);border-color:var(--ink);background:var(--soft);box-shadow:0 3px 0 var(--ink)}' +
    '.ad-step.done{opacity:.8}.ad-arr{align-self:center;width:22px;height:22px;flex:none;opacity:.5}.ad-arr svg{width:22px;height:22px}' +
    '.ad-what{text-align:center;font:700 15px/1.35 ui-rounded,"SF Pro Rounded",Nunito,system-ui,sans-serif;color:var(--ink2);margin:6px 4px 0}' +
    '.ad-what b{color:var(--ink)}' +
    // the reply button: grey with an ear while the minaret calls, then yellow, bouncing, with a speech bubble
    '.ps-big.ad-listen{background:var(--paper);opacity:.8}.ps-app .ps-big.ad-listen:hover{background:var(--paper)}' +
    '.ps-big.ad-go{animation:adGo 1.1s ease-in-out infinite}' +
    '@keyframes adGo{0%,100%{transform:scale(1)}50%{transform:scale(1.045)}}' +
    '.ps-big .ad-bub{display:grid;place-items:center;width:46px;height:46px;flex:none;border-radius:50%;background:#fff;border:2px solid var(--ink)}.ps-big .ad-bub svg{width:32px;height:32px}' +
    '@media (prefers-reduced-motion:reduce){.ad-turn,.ps-big.ad-go,.ad-turn .ad-ic::after{animation:none!important}}';
  document.head.appendChild(css);
  var turn = PS.el('div', 'ad-turn', '<span class="ad-ic"></span><b></b>'); turn.hidden = true; PS.fig.appendChild(turn);
  function setTurn(kind) {
    if (!kind) { turn.hidden = true; return; }
    turn.hidden = false; turn.className = 'ad-turn ' + kind;
    turn.querySelector('.ad-ic').innerHTML = PS.icon(kind === 'listen' ? 'ear' : 'speak');
    turn.querySelector('b').textContent = kind === 'listen' ? 'Listen' : kind === 'turn' ? 'Your turn!' : 'Say it with me';
  }
  function stepsHTML(phase) {
    var l = phase === 'call', r = phase === 'reply' || phase === 'replying';
    return '<div class="ad-steps"><div class="ad-step' + (l ? ' on' : ' done') + '">' + PS.icon('ear') + '<span>1 · Listen</span></div>' +
      '<span class="ad-arr">' + PS.icon('arrowR') + '</span>' +
      '<div class="ad-step' + (r ? ' on' : '') + '">' + PS.icon('speak') + '<span>2 · Your turn</span></div></div>';
  }

  var big = PS.el('button', 'ps-big'), again = PS.el('button', 'ps-round', PS.icon('again'));
  again.setAttribute('aria-label', 'Hear it again');
  PS.ctl.appendChild(again); PS.ctl.appendChild(big);
  var auto = !q.has('step') || q.get('auto') === '1';

  function dots() { PS.dots(PH.length + 2, Math.max(0, st.k - 1), [PH.length]); }
  function setBig(html, cls, label) { big.innerHTML = html; big.className = 'ps-big' + (cls ? ' ' + cls : ''); big.setAttribute('aria-label', label || ''); }
  function replyHTML(r) { return '<span class="ps-two"><span class="a" lang="ar">' + r.ar + '</span><span class="t">' + PS.esc(r.tr) + '</span></span>'; }
  var bub = function () { return '<span class="ad-bub">' + PS.icon('speak') + '</span>'; };

  function show() {
    var S = STEPS[st.k]; dots(); again.style.visibility = S.kind === 'intro' ? 'hidden' : 'visible';
    if (S.kind === 'intro') {
      setTurn(null);
      PS.card.innerHTML = '<div class="ps-h">' + PS.icon(PS.prayerIcon[PRAYER]) + 'It is time for ' + PNAME + '</div>' +
        '<div class="ad-steps"><div class="ad-step on">' + PS.icon('ear') + '<span>1 · Listen</span></div><span class="ad-arr">' + PS.icon('arrowR') + '</span>' +
        '<div class="ad-step on">' + PS.icon('speak') + '<span>2 · Say it back</span></div></div>' +
        '<div class="ps-hint">The minaret calls, then it is your turn. Most parts: say the same words. At <i>hayya ’ala</i>, say <i>la hawla wa la quwwata illa billah</i>.</div>';
      setBig(PS.icon('play') + '<span>Start</span>', 'ready ad-go', 'Start');
      return;
    }
    if (S.kind === 'phrase') {
      var p = S.p, r = p.reply, same = r.repeat, ph = st.phase;
      setTurn(ph === 'call' ? 'listen' : ph === 'reply' ? 'turn' : 'say');
      PS.card.innerHTML = stepsHTML(ph) + PS.lineHTML(p.text, { tag: 'The adhan · ' + st.k + ' of ' + PH.length }) +
        '<div class="ad-what">' + (same ? 'You say the <b>same words</b>.' : 'You say: <b>' + PS.esc(r.tr) + '</b><br>' + PS.esc(r.en)) + '</div>';
      if (ph === 'call') setBig(PS.icon('ear') + '<span>Listen…</span>', 'ad-listen', 'Listen, then answer: ' + r.tr);
      else setBig(bub() + replyHTML(r), ph === 'reply' ? 'ready ad-go' : '', 'Answer: ' + r.tr);
      PS.light(ph === 'call' ? 0 : -1);
      return;
    }
    // after the adhan: salawat, then the du'a (the child's turn to say them)
    setTurn(st.phase === 'replying' ? 'say' : 'turn');
    PS.card.innerHTML = '<div class="ps-h">' + PS.icon('speak') + (S.key === 'salawat' ? 'Send salawat on the Prophet' : 'The du’a after the adhan') + '</div>' +
      '<div class="ps-hint">' + (S.key === 'salawat' ? 'When the adhan ends, ask Allah to bless the Prophet, peace be upon him.' : 'Then say this du’a (Sahih al-Bukhari).') + '</div>' + PS.lineHTML(S.t);
    setBig(bub() + '<span>Say it with me</span>', st.phase === 'replying' ? 'wait' : 'ready ad-go', 'Say it with me');
    if (st.phase === 'replying') PS.light(0);
  }

  function go(k) {
    PS.hush(); st.k = k;
    if (k >= STEPS.length) return finish();
    var S = STEPS[k];
    st.phase = S.kind === 'intro' ? 'intro' : S.kind === 'phrase' ? 'call' : 'reply';
    st.calling = st.phase === 'call'; ui.render(); show();
    if (st.phase === 'call') call();
  }
  function call() {
    var S = STEPS[st.k]; st.phase = 'call'; st.calling = true; ui.render(); show();
    PS.say([S.p.text], { line: function () { PS.light(0); } }).then(function (ok) {
      if (!ok) return;
      st.calling = false; st.phase = 'reply'; ui.render(); show();
    });
  }
  function reply() {
    var S = STEPS[st.k];
    if (S.kind === 'intro') return go(1);
    if (st.phase === 'replying') return;
    PS.play('tap');
    if (S.kind === 'phrase') {
      st.calling = false; st.phase = 'replying'; ui.render(); show();
      big.style.background = 'var(--soft)';
      PS.say([S.p.reply]).then(function (ok) { big.style.background = ''; if (ok) { try { window.KahfBridge && KahfBridge.answer(); } catch (e) {} go(st.k + 1); } });
      return;
    }
    st.phase = 'replying'; show();
    PS.say([S.t], { line: function () { PS.light(0); } }).then(function (ok) { if (ok) go(st.k + 1); });
  }
  big.onclick = reply;
  again.onclick = function () { PS.play('tap'); var S = STEPS[st.k]; if (S.kind === 'phrase') call(); else if (S.kind === 'after') { st.phase = 'reply'; reply(); } };

  function finish() {
    st.calling = false; st.phase = 'done'; ui.render(); setTurn(null);
    PS.card.innerHTML = '<div class="ps-h">' + PS.icon('check') + 'You answered the adhan</div><div class="ps-hint">Next: make wudu, then pray ' + PNAME + '.</div>';
    setBig(PS.icon('check') + '<span>Make wudu</span>', '', 'Make wudu'); big.onclick = function () { location.href = HHFlow.url('wudu', { p: PRAYER }); }; again.style.visibility = 'hidden'; PS.dots(PH.length + 2, PH.length + 2, [PH.length]);
    PS.finish('adhan', { p: PRAYER }, { title: 'You answered the adhan', text: 'Next: make wudu, then pray ' + PNAME + '.', stars: null,
      buttons: [{ label: 'Make wudu', primary: true, onClick: function () { location.href = HHFlow.url('wudu', { p: PRAYER }); } },
                { label: 'Hear it again', onClick: function () { big.onclick = reply; go(0); } }] });
  }

  // ?step=N opens step N (0 intro, 1..phrases, then salawat, du'a; past the end = finished); ?sub=call shows the call
  var k0 = Math.max(0, Math.min(STEPS.length, +(q.get('step') || 0)));
  if (k0 >= STEPS.length) finish();
  else if (k0 > 0 && !auto) { st.k = k0; var S0 = STEPS[k0]; st.phase = S0.kind === 'phrase' && q.get('sub') === 'call' ? 'call' : 'reply'; st.calling = st.phase === 'call'; ui.render(); show(); }
  else if (k0 > 0) go(k0);
  else { ui.render(); show(); }
  window.__adhan = { st: st, go: go, STEPS: STEPS };
})();
