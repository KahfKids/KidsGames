/* Follow the Light: game.js
   Watch the lanterns light up, then tap them in the same order. Each round adds one light; reach the
   level's length to win. A wrong tap costs one of 3 hearts and the lights play again (never instant game
   over). 30 levels in 3 worlds. Built on the shared kit (js/kit). */
(function () {
  'use strict';
  var A = window.LightArt, LV = window.LIGHT_LEVELS, S = window.LightSound, K = window.Kit;
  var COUNT = LV.list.length, DEBUG = /[?&]debug\b/.test(location.search);
  var store = K.store('kahf-follow-the-light'), progress = K.progress(store, COUNT);
  var canvas = document.getElementById('stage');

  // ---------- state ----------
  var level = 1, lv = null, world = 0, state = 'boot', stateT = 0, time = 0;
  var lan = [], seq = [], pos = 0, hearts = 3, mistakes = 0, idle = 0, beads = [];
  var sched = null, watchT = 0, lastTap = { i: -1, t: -9 }, laterQ = [], motes = [], taught = !!store.get('taught', false), hint = null;
  var bannerT = 0, yourTurnShown = false, freeCount = 6;

  // ---------- layout (CSS px) ----------
  var G = { w: 0, h: 0, dpr: 1, safe: { top: 0, right: 0, bottom: 0, left: 0 }, u: 100, cols: 2, rows: 2, ropes: [], beadY: 0 };
  var bg = null, bgKey = '', sprites = {}, blooms = {}, backCv = null, backKey = '', sh = { x: 0, y: 0 };
  var stage = K.stage(canvas, function (st) {
    G.w = st.w; G.h = st.h; G.dpr = st.dpr; G.safe = st.safe;
    bg = null; sprites = {}; backKey = '';
    if (lan.length) layout(lan.length);
  });
  var ctx = stage.ctx;

  // Pick the grid (2x2, 4x1, 2x3, 3x2, 6x1...) that gives the biggest lanterns on this screen.
  function layout(n) {
    var sf = G.safe, top = sf.top + 62, bottom = G.h - sf.bottom - 52, left = sf.left + 10, right = G.w - sf.right - 10;
    var rw = right - left, rh = bottom - top, opts = n === 6 ? [[2, 3], [3, 2], [6, 1]] : [[2, 2], [4, 1], [1, 4]];
    var best = null;
    opts.forEach(function (o) {
      var cw = rw / o[0], ch = rh / o[1], u = Math.min(cw * 0.72, ch / (A.LANTERN_H + 0.34));
      if (!best || u > best.u) best = { cols: o[0], rows: o[1], u: u, cw: cw, ch: ch };
    });
    var u = K.clamp(best.u, 40, 230);
    G.u = u; G.cols = best.cols; G.rows = best.rows; G.ropes = [];
    for (var r = 0; r < best.rows; r++) {
      var cellTop = top + r * best.ch, ringTop = cellTop + (best.ch - A.LANTERN_H * u) * 0.62;
      var sag = Math.min(best.ch * 0.1, u * 0.35, 40), edgeY = Infinity, xs = [];
      for (var c = 0; c < best.cols; c++) {
        var x = left + best.cw * (c + 0.5); xs.push(x);
        var xn = (x - G.w / 2) / (G.w / 2);
        edgeY = Math.min(edgeY, ringTop - u * 0.2 - sag * (1 - xn * xn));
      }
      var rope = { edgeY: edgeY, sag: sag };
      G.ropes.push(rope);
      for (var c2 = 0; c2 < best.cols; c2++) {
        var i = r * best.cols + c2, L = lan[i];
        if (!L) continue;
        L.x = xs[c2]; L.py = ropeY(rope, L.x); L.chain = ringTop - L.py; L.row = r;
        L.cell = { x: left + best.cw * c2, y: cellTop, w: best.cw, h: best.ch };
      }
    }
    G.beadY = G.h - sf.bottom - 26;
  }
  function ropeY(rope, x) { var xn = (x - G.w / 2) / (G.w / 2); return rope.edgeY + rope.sag * (1 - xn * xn); }
  function bodyCenter(L) {
    var d = L.chain + A.BODY_Y * G.u, a = L.ang + L.idleA;
    return { x: L.x - Math.sin(a) * d, y: L.py + Math.cos(a) * d };
  }

  function makeLanterns(n) {
    lan = [];
    for (var i = 0; i < n; i++) lan.push({ k: i, ci: i, x: 0, py: 0, chain: 0, ang: 0, vel: 0, idleA: 0, ph: Math.random() * 6.28,
      light: 0, want: 0, flash: 0, squash: 0, dim: 0, row: 0, cell: null });
    layout(n);
  }

  // ---------- HUD ----------
  // A lantern icon for the Free Play button (added to the kit's icon set for this page only).
  K.icons.lantern = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M12 2v2.5M9 6.5h6l-1-2h-4z"/><path d="M8 6.5h8l1 3v7l-2 2.5H9L7 16.5v-7z"/><path d="M12 10l1.6 2.3L12 14.6l-1.6-2.3z"/><path d="M12 19v2.5"/></svg>';
  var pLevel = K.ui.pill(''), pHearts = K.ui.hearts(3);
  K.ui.spacer();
  var bPause = K.ui.iconButton('pause', 'Pause', function () { if (state !== 'clear' && state !== 'fail' && state !== 'paused') pause(); });
  var bClose = K.ui.iconButton('close', 'Back to the level', function () { startLevel(level); });
  bClose.hidden = true;
  function hud() {
    var free = state === 'free';
    pHearts.hidden = free; bPause.hidden = free; bClose.hidden = !free;
    pLevel.set('<svg viewBox="-50 -50 100 100" style="width:18px;height:18px"><path d="M0-46 13-31 32-32 31-13 46 0 31 13 32 32 13 31 0 46-13 31-32 32-31 13-46 0-31-13-32-32-13-31Z" fill="' +
      (free ? '#ffffff' : LV.worlds[world].color) + '"/></svg>' + (free ? 'Free Play' : 'Level ' + level));
    pHearts.setLives(hearts);
  }

  // ---------- levels and rounds ----------
  function startLevel(n) {
    level = K.clamp(n, 1, COUNT); lv = LV.list[level - 1]; world = lv.world;
    progress.setCurrent(level);
    K.fx.clear(); laterQ = [];
    makeLanterns(lv.lanterns);
    hearts = 3; mistakes = 0; pos = 0; idle = 0; seq = [];
    for (var k = 0; k < lv.start; k++) seq.push(nextLight());
    state = 'intro'; stateT = 1.5; bannerT = 1.9; yourTurnShown = false;
    makeBeads(); hud(); makeMotes();
    if (hint && (level !== 1 || taught)) { hint.hide(); hint = null; }
    if (level === 1 && !taught && !hint) hint = K.ui.hint('Watch, then copy them!', 70, true);
  }
  function nextLight() {
    var n = lv.lanterns, a = seq[seq.length - 1], b = seq[seq.length - 2], c, tries = 0;
    do { c = (Math.random() * n) | 0; tries++; }
    while (tries < 50 && ((!lv.repeats && c === a) || (c === a && c === b)));
    return c;
  }
  function makeBeads() {
    beads = [];
    for (var i = 0; i < lv.target; i++) beads.push({ on: 0, done: 0, ci: -1, pop: 0 });
  }

  // Play the current sequence. Lights stay on >= 0.42 s with a clear dark gap between them.
  function startWatch() {
    var tm = LV.timing(lv, seq.length), t = 0;
    sched = seq.map(function (ci) { var s = { ci: ci, on: t, off: t + tm.on, played: false }; t += tm.on + tm.gap; return s; });
    watchT = -0.6; pos = 0; idle = 0;
    beads.forEach(function (b) { b.done = 0; b.ci = -1; });
    state = 'watch';
  }
  function toInput() {
    state = 'input'; pos = 0; idle = 0; sched = null;
    if (!yourTurnShown && !hint) {
      yourTurnShown = true;
      K.fx.text(G.w / 2, G.beadY - 40, 'Your turn!', { size: 30, color: '#fff3c4', stroke: 'rgba(30,10,50,.65)', rise: 40, life: 1.3 });
    }
  }

  // ---------- input ----------
  function hitLantern(x, y) {
    for (var i = 0; i < lan.length; i++) {
      var c = lan[i].cell;
      if (x >= c.x && x < c.x + c.w && y >= c.y - 20 && y < c.y + c.h + 20) return i;
    }
    // outside every cell (edges): nearest lantern body if close enough
    var best = -1, bd = G.u * 1.2;
    lan.forEach(function (L, i) { var b = bodyCenter(L), d = Math.hypot(b.x - x, b.y - y); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  K.pointer(canvas, function (sx, sy) { return { x: sx, y: sy }; }, {
    down: function (p) { var i = hitLantern(p.x, p.y); if (i >= 0) tap(i, p.x); }
  });
  addEventListener('keydown', function (e) {
    var k = parseInt(e.key, 10);
    if (k >= 1 && k <= lan.length) tap(k - 1);
    if ((e.key === 'Escape' || e.key === 'p') && (state === 'input' || state === 'watch' || state === 'intro')) pause();
  });

  function swing(L, fromX, strength) {
    var dir = fromX == null ? (Math.random() < 0.5 ? -1 : 1) : (fromX < L.x ? 1 : -1);
    L.vel += dir * (strength || 1.6);
    L.squash = 1;
  }
  function lightUp(L, dur) { L.flash = Math.max(L.flash, dur || 0.34); }
  function sparkle(L, big) {
    var b = bodyCenter(L), col = A.LANTERNS[L.ci].c;
    K.fx.burst(b.x, b.y, { n: big ? 18 : 10, colors: [col, '#fff6d8', A.mix(col, '#ffffff', 0.5)], speed: big ? 320 : 220, size: big ? 13 : 10, life: 0.9, shape: 'star', gravity: -40, jitter: G.u * 0.3 });
    K.fx.burst(b.x, b.y + G.u * 0.6, { n: 6, colors: ['#ffe2a0', col], speed: 120, size: 6, life: 0.7, shape: 'spark', gravity: 120, spread: 1.2, angle: Math.PI / 2 });
  }

  function tap(i, fromX) {
    var L = lan[i]; if (!L) return;
    if (state === 'free') { lightUp(L, 0.4); swing(L, fromX, 1.4); S.lantern(L.ci); sparkle(L); return; }
    // Taps while the lights are playing (or between rounds) don't count: just a small nudge.
    if (state !== 'input') { swing(L, fromX, 0.5); S.play('nudge'); return; }
    idle = 0;
    var want = seq[pos];
    // Grace window: a quick second tap on the lantern just tapped (a bounce or double tap) is ignored.
    if (i !== want && lastTap.i === i && time - lastTap.t < 0.3) return;
    lastTap.i = i; lastTap.t = time;
    K.bridge.answer();
    lightUp(L); swing(L, fromX, 1.5); S.lantern(L.ci); K.buzz(8);
    if (i === want) {
      sparkle(L);
      var bd = beads[pos]; bd.done = 1; bd.ci = L.ci; bd.pop = 1;
      pos++;
      if (!taught) { taught = true; store.set('taught', true); }
      if (hint) { hint.hide(); hint = null; }
      if (pos >= seq.length) roundDone();
    } else wrong(L);
  }

  function wrong(L) {
    hearts--; mistakes++;
    L.dim = 1; L.flash = 0; L.vel += (L.vel >= 0 ? 1 : -1) * 1.2;
    S.play('oops'); K.fx.shake(5, 0.25); K.buzz(30);
    var b = bodyCenter(L);
    K.fx.burst(b.x, b.y, { n: 8, color: 'rgba(200,190,230,.8)', speed: 120, size: 8, life: 0.5, shape: 'dot', gravity: 60 });
    hud(); pHearts.bump();
    if (hearts <= 0) {
      state = 'fail';
      later(0.9, function () {
        S.play('lose');
        K.ui.sheet({ title: 'Out of hearts', text: "Let's watch the lights again!", buttons: [
          { label: 'Try Again', icon: 'restart', primary: true, onClick: function () { startLevel(level); } },
          { label: 'Levels', icon: 'levels', onClick: openLevels }] });
      });
      return;
    }
    K.fx.text(G.w / 2, G.h * 0.45, 'Watch again!', { size: 30, color: '#ffd1dc', stroke: 'rgba(60,10,30,.6)', rise: 30, life: 1.3 });
    state = 'oops'; stateT = 1.25;
  }

  var CHEERS = ['Great!', 'Super!', 'Well done!', 'MashaAllah!', 'Yes!', 'Bright!'];
  function roundDone() {
    if (seq.length >= lv.target) { clearLevel(); return; }
    state = 'cheer'; stateT = 1.25;
    lan.forEach(function (L, k) { later(0.12 + k * 0.07, function () { lightUp(L, 0.3); swing(L, null, 0.7); }); });
    S.play('cheer');
    beads.forEach(function (b, k) { if (k < seq.length) later(k * 0.04, function () { b.pop = 1; }); });
    K.fx.text(G.w / 2, G.h * 0.45, CHEERS[(Math.random() * CHEERS.length) | 0], { size: 46, color: '#fff6c2', stroke: 'rgba(40,15,70,.65)', life: 1.1 });
    seq.push(nextLight());
  }

  function clearLevel() {
    state = 'clear';
    var stars = mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;
    progress.finish(level, stars);
    K.bridge.complete();
    if (hint) { hint.hide(); hint = null; }
    S.play('win');
    lan.forEach(function (L, k) {
      later(k * 0.1, function () { lightUp(L, 1.6); swing(L, null, 1.2); sparkle(L, true); S.play('glint'); });
    });
    for (var i = 0; i < 5; i++) later(0.5 + i * 0.18, function () {
      K.fx.burst(K.rand(G.w * 0.15, G.w * 0.85), K.rand(G.h * 0.15, G.h * 0.6), { n: 22, colors: ['#ffd36b', '#ff8fab', '#7ae7ff', '#ffffff', '#b98cff'], speed: 420, size: 15, life: 1.2, shape: 'star', gravity: 380 });
    });
    beads.forEach(function (b, k) { later(k * 0.05, function () { b.pop = 1; }); });
    var last = level === COUNT, endOfWorld = level % 10 === 0;
    later(1.8, function () {
      var buttons = [];
      if (!last) buttons.push({ label: endOfWorld ? 'Next World' : 'Next Level', icon: 'next', primary: true, onClick: function () { startLevel(level + 1); } });
      buttons.push({ label: last ? 'Play Again' : 'Replay', icon: 'restart', row: true, primary: last, onClick: function () { startLevel(last ? 1 : level); } });
      buttons.push({ label: 'Levels', icon: 'levels', row: true, onClick: openLevels });
      K.ui.sheet({
        title: last ? 'You did it!' : endOfWorld ? LV.worlds[world].name + ' complete!' : 'Lights complete!',
        text: last ? 'Every lantern is shining. MashaAllah!' : 'You followed ' + seq.length + ' lights!',
        stars: stars, buttons: buttons });
    });
  }

  var resumeState = null;
  function pause() {
    if (state !== 'paused') { resumeState = state; state = 'paused'; }
    K.ui.sheet({ title: 'Paused', text: LV.worlds[world].name + ' · Level ' + level, buttons: [
      { label: 'Resume', icon: 'play', primary: true, onClick: resume },
      { label: 'Restart', icon: 'restart', row: true, onClick: function () { startLevel(level); } },
      { label: 'Levels', icon: 'levels', row: true, onClick: openLevels },
      { label: 'Free Play', icon: 'lantern', onClick: startFree },
      { label: K.sfx.muted ? 'Sound: Off' : 'Sound: On', icon: K.sfx.muted ? 'soundOff' : 'sound', onClick: function () { K.sfx.toggle(); pause(); } }] });
  }
  function resume() {
    state = resumeState || 'input';
    // If the lights were playing, start them again from the beginning so nothing is missed.
    if (state === 'watch' || state === 'oops' || state === 'cheer') startWatch();
  }
  function openLevels() {
    if (state !== 'paused') { resumeState = state === 'clear' || state === 'fail' ? null : state; state = 'paused'; }
    K.ui.levelSelect({
      title: 'Follow the Light',
      worlds: LV.worlds.map(function (w, i) { return { name: w.name, color: w.color, from: i * 10 + 1, to: i * 10 + 10 }; }),
      progress: progress, current: level,
      onPick: function (n) { startLevel(n); },
      onClose: function () { if (resumeState) resume(); else startLevel(level); }
    });
  }
  // Free play: tap any lantern to hear its sound. No hearts, no sequence.
  function startFree() {
    state = 'free'; laterQ = []; K.fx.clear();
    if (hint) { hint.hide(); hint = null; }
    makeLanterns(freeCount); beads = []; bannerT = 0; hud();
  }

  // ---------- game-time timers ----------
  function later(sec, fn) { laterQ.push({ t: sec, fn: fn }); }

  // ---------- ambient ----------
  function makeMotes() {
    motes = [];
    for (var i = 0; i < 26; i++) motes.push({ x: Math.random(), y: 0.3 + Math.random() * 0.7, v: 0.3 + Math.random() * 0.7, ph: Math.random() * 6.28, s: 0.6 + Math.random() * 0.9 });
  }

  // ---------- simulation ----------
  function step(dt) {
    time += dt;
    K.fx.update(dt);
    for (var q = laterQ.length - 1; q >= 0; q--) { var it = laterQ[q]; it.t -= dt; if (it.t <= 0) { laterQ.splice(q, 1); it.fn(); } }
    motes.forEach(function (m) { m.ph += dt; m.y -= dt * 0.01 * m.v; m.x += Math.sin(m.ph * 0.7) * dt * 0.004; if (m.y < 0.05) { m.y = 1.02; m.x = Math.random(); } });
    if (bannerT > 0) bannerT -= dt;

    // phase logic
    if (state === 'intro') { stateT -= dt; if (stateT <= 0) startWatch(); }
    else if (state === 'oops' || state === 'cheer') { stateT -= dt; if (stateT <= 0) startWatch(); }
    else if (state === 'watch') {
      watchT += dt;
      lan.forEach(function (L) { L.want = 0; });
      for (var s = 0; s < sched.length; s++) {
        var e = sched[s];
        if (watchT >= e.on && watchT < e.off) {
          lan[e.ci].want = 1;
          if (!e.played) { e.played = true; S.lantern(e.ci); swing(lan[e.ci], null, 0.6); beads[s].on = 1; beads[s].ci = e.ci; }
        }
      }
      // Hand over as soon as the last light starts to fade.
      if (watchT >= sched[sched.length - 1].off) { lan.forEach(function (L) { L.want = 0; }); toInput(); }
    } else if (state === 'input') {
      idle += dt;
      // No timer: if nothing happens for a while, show the lights again (free, no heart lost).
      if (idle > 9) { K.fx.text(G.w / 2, G.beadY - 50, 'Watch again', { size: 26, color: '#fff3c4', rise: 30, life: 1.2 }); startWatch(); }
    }

    // lanterns: pendulum swing, light envelope, squash
    var breathe = state === 'input' || state === 'free';
    lan.forEach(function (L, k) {
      L.vel += (-26 * L.ang - 2.4 * L.vel) * dt;
      L.ang += L.vel * dt;
      L.ang = K.clamp(L.ang, -0.32, 0.32);
      L.idleA = Math.sin(time * 1.1 + L.ph) * 0.018;
      if (L.flash > 0) L.flash -= dt;
      var target = Math.max(L.want, L.flash > 0 ? 1 : 0, breathe ? 0.1 + 0.07 * Math.sin(time * 2.4 + k * 0.9) : 0.03);
      var rate = target > L.light ? 24 : 11;
      L.light += (target - L.light) * (1 - Math.exp(-dt * rate));
      L.squash = Math.max(0, L.squash - dt * 3.2);
      L.dim = Math.max(0, L.dim - dt * 1.4);
    });
    beads.forEach(function (b) { b.pop = Math.max(0, b.pop - dt * 3); b.on = Math.max(0, b.on - dt * 1.6); });
  }

  // ---------- drawing ----------
  function ensureArt() {
    var key = world + '|' + G.w + 'x' + G.h + '@' + G.dpr;
    if (!bg || bgKey !== key) { bg = A.paintScene(world, G.w, G.h, G.dpr, G.safe); bgKey = key; }
  }
  function sprite(ci, lit) {
    var key = ci + (lit ? 'L' : 'D') + Math.round(G.u);
    if (!sprites[key]) sprites[key] = A.lanternSprite(ci, G.u, G.dpr, lit);
    return sprites[key];
  }
  // Crop box (sprite px) for the rotated lantern blit: the sprites' non-transparent area plus a clear
  // margin, with the same source-to-screen mapping, so the skipped pixels were transparent and drew
  // nothing. Measured once per sprite pair (from a copy, so the sprites themselves are never read back).
  function spriteBoxes(off, on) {
    if (on.box) return;
    var W = off.width, H = off.height, t = document.createElement('canvas'); t.width = W; t.height = H;
    var g = t.getContext('2d'); g.drawImage(off, 0, 0); g.drawImage(on, 0, 0);
    var a = g.getImageData(0, 0, W, H).data, x0 = W, x1 = -1, y0 = H, y1 = -1;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      if (a[(y * W + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    var M = 4, bx = { x: 0, y: 0, w: W, h: H };
    if (x1 >= 0) { bx.x = Math.max(0, x0 - M); bx.y = Math.max(0, y0 - M); bx.w = Math.min(W, x1 + M + 1) - bx.x; bx.h = Math.min(H, y1 + M + 1) - bx.y; }
    off.box = on.box = bx;
  }
  function bloomSprite(ci, half) {
    var key = ci + '|' + Math.round(G.u) + '|' + G.dpr + (half ? 'h' : '');
    if (!blooms[key]) blooms[key] = A.bloom(A.LANTERNS[ci].c, G.u * 2, half ? G.dpr / 2 : G.dpr);
    return blooms[key];
  }

  // Scene tint: the lit lanterns' radial colour ramps (added with 'lighter'). Their sum is worked out
  // once per 8x8 block of device px (each ramp changes by about 0.02 colour levels per px, so a block
  // is one value to well under a level) and added in one screen pass, however many lanterns are lit.
  var TQ = 8, tintCv = null, tintImg = null, tintRGB = [];
  function drawTint() {
    var d = G.dpr, R = Math.max(G.w, G.h) * 0.6 * d, W = Math.ceil(canvas.width / TQ), H = Math.ceil(canvas.height / TQ), lits = [];
    for (var k = 0; k < lan.length; k++) {
      var L = lan[k], lit = L.light * (1 - L.dim); if (lit < 0.3) continue;
      var b = bodyCenter(L), c = tintRGB[L.ci] || (tintRGB[L.ci] = [1, 3, 5].map(function (i) { return parseInt(A.LANTERNS[L.ci].c.substr(i, 2), 16); }));
      lits.push({ x: (b.x + sh.x) * d, y: (b.y + sh.y) * d, a: 0.12 * (lit - 0.3), c: c });
    }
    if (!lits.length) return;
    if (!tintCv) tintCv = document.createElement('canvas');
    if (tintCv.width !== W || tintCv.height !== H || !tintImg) { tintCv.width = W; tintCv.height = H; tintImg = tintCv.getContext('2d').createImageData(W, H); }
    var px = tintImg.data, n = lits.length, i = 0;
    for (var y = 0; y < H; y++) {
      var sy = (y + 0.5) * TQ;
      for (var x = 0; x < W; x++, i += 4) {
        var sx = (x + 0.5) * TQ, pr = 0, pg = 0, pb = 0, pa = 0;
        for (var q = 0; q < n; q++) {
          var t = lits[q], dx = sx - t.x, dy = sy - t.y, r2 = dx * dx + dy * dy;
          if (r2 >= R * R) continue;
          var f = t.a * (1 - Math.sqrt(r2) / R);
          pr += t.c[0] * f; pg += t.c[1] * f; pb += t.c[2] * f; pa += f;
        }
        // premultiplied sum -> ImageData's straight alpha (exact round trip for these values)
        var al = Math.min(255, Math.round(pa * 255));
        if (al === 0) { px[i] = px[i + 1] = px[i + 2] = px[i + 3] = 0; continue; }
        px[i] = Math.round(pr * 255 / al); px[i + 1] = Math.round(pg * 255 / al); px[i + 2] = Math.round(pb * 255 / al); px[i + 3] = al;
      }
    }
    tintCv.getContext('2d').putImageData(tintImg, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; ctx.globalCompositeOperation = 'lighter';
    // the fills covered the (shaken) screen rect only
    if (sh.x || sh.y) { ctx.beginPath(); ctx.rect(sh.x * d, sh.y * d, G.w * d, G.h * d); ctx.clip(); }
    ctx.drawImage(tintCv, 0, 0, W * TQ, H * TQ);
    ctx.restore();
  }
  // Sky, far and mid layers composited once into a screen-sized canvas; rebuilt only when one of their
  // whole-pixel parallax offsets changes. Same blits in the same order, so the pixels are the same.
  function drawBack(dr) {
    var d = G.dpr, m = bg.margin, W = canvas.width, H = canvas.height;
    var x0 = Math.round(-m + dr * 3 * d), x1 = Math.round(-m + dr * 7 * d), x2 = Math.round(-m + dr * 12 * d);
    var key = bgKey + '|' + W + 'x' + H + '|' + x0 + ',' + x1 + ',' + x2;
    if (!backCv) backCv = document.createElement('canvas');
    if (key !== backKey) {
      if (backCv.width !== W || backCv.height !== H) { backCv.width = W; backCv.height = H; }
      var g = backCv.getContext('2d');
      g.clearRect(0, 0, W, H);
      g.drawImage(bg.sky, x0, 0); g.drawImage(bg.far, x1, 0); g.drawImage(bg.mid, x2, 0);
      backKey = key;
    }
    ctx.drawImage(backCv, 0, 0);
  }

  function drawRope(rope, row) {
    var x0 = -10, x1 = G.w + 10, y0 = rope.edgeY, cx = G.w / 2, cy = rope.edgeY + rope.sag * 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(12,6,24,.85)'; ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y0); ctx.stroke();
    ctx.strokeStyle = 'rgba(233,184,102,.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y0 - 1); ctx.quadraticCurveTo(cx, cy - 1, x1, y0 - 1); ctx.stroke();
    // tiny warm bulbs along the rope
    var n = Math.max(6, Math.round(G.w / 46)), glowAll = state === 'cheer' || state === 'clear' ? 1 : 0;
    for (var i = 1; i < n; i++) {
      var t = i / n, x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1, y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y0;
      var tw = 0.45 + 0.35 * Math.sin(time * 2 + i * 1.7 + row) + glowAll * 0.4;
      ctx.strokeStyle = 'rgba(12,6,24,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 3); ctx.stroke();
      ctx.globalAlpha = Math.min(1, tw * 0.35); ctx.fillStyle = '#ffb85a';
      ctx.beginPath(); ctx.arc(x, y + 5.5, 6.5, 0, 6.283); ctx.fill();
      ctx.globalAlpha = Math.min(1, 0.55 + tw * 0.45); ctx.fillStyle = '#ffd98a';
      ctx.beginPath(); ctx.arc(x, y + 5.5, 2.6, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.arc(x - 0.6, y + 4.9, 1, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // The lit sprite blended over the unlit one at 'lit', done unrotated at 1:1 (cheap) into a canvas per
  // lantern, so the swinging lantern costs one rotated (resampled) blit instead of two. Same colours; the
  // only difference is the anti-aliased rim of a lit lantern: two stacked rotated draws covered those edge
  // pixels slightly more than one does (within one device pixel). Redone only when 'lit' changes.
  var mixes = [];
  function litSprite(L, off, on, lit) {
    var m = mixes[L.k] || (mixes[L.k] = { cv: document.createElement('canvas'), off: null, lit: -1 });
    if (m.off !== off || m.lit !== lit) {
      var c = m.cv, b = off.box;
      if (c.width !== off.width || c.height !== off.height) { c.width = off.width; c.height = off.height; }
      var g = c.getContext('2d');
      g.globalAlpha = 1; g.clearRect(b.x, b.y, b.w, b.h); g.drawImage(off, b.x, b.y, b.w, b.h, b.x, b.y, b.w, b.h);
      g.globalAlpha = lit; g.drawImage(on, b.x, b.y, b.w, b.h, b.x, b.y, b.w, b.h); g.globalAlpha = 1;
      m.off = off; m.lit = lit;
    }
    return m.cv;
  }
  function drawLantern(L) {
    var u = G.u, a = L.ang + L.idleA, sq = L.squash, e = Math.sin(sq * Math.PI) * 0.6 + sq * 0.4;
    var sx = 1 + 0.05 * e, sy = 1 - 0.06 * e, pop = 1 + 0.05 * L.light * (L.want || L.flash > 0 ? 1 : 0);
    ctx.save();
    ctx.translate(L.x, L.py); ctx.rotate(a);
    // chain
    var links = Math.max(2, Math.round(L.chain / 9));
    ctx.strokeStyle = '#c99a4a'; ctx.lineWidth = Math.max(1.5, u * 0.018);
    for (var k = 0; k < links; k++) {
      var y = (k + 0.5) * L.chain / links;
      ctx.beginPath();
      if (k % 2) ctx.ellipse(0, y, 1.2, L.chain / links * 0.55, 0, 0, 6.283);
      else ctx.ellipse(0, y, Math.max(2.2, u * 0.022), L.chain / links * 0.55, 0, 0, 6.283);
      ctx.stroke();
    }
    // lantern body, scaled about its glass centre so it never slides
    ctx.translate(0, L.chain + A.BODY_Y * u);
    ctx.scale(sx * pop, sy * pop);
    ctx.translate(0, -A.BODY_Y * u);
    var off = sprite(L.ci, false), on = sprite(L.ci, true); spriteBoxes(off, on);
    var pad = off.pad, w = u + pad * 2, h = A.LANTERN_H * u + pad * 2;
    var lit = Math.min(1, L.light * (1 - L.dim));
    // Drawn through the crop box (same source-to-screen mapping, see spriteBoxes()).
    var kx = w / off.width, ky = h / off.height, bx = off.box, img = lit > 0.01 ? litSprite(L, off, on, lit) : off;
    ctx.drawImage(img, bx.x, bx.y, bx.w, bx.h, -w / 2 + bx.x * kx, -pad + bx.y * ky, bx.w * kx, bx.h * ky);
    if (L.dim > 0) { // a quick grey "not this one" flash
      ctx.globalAlpha = L.dim * 0.45; ctx.fillStyle = '#1a1030';
      ctx.beginPath(); ctx.ellipse(0, A.BODY_Y * u, u * 0.45, u * 0.5, 0, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // Every lantern's glow goes into one half-resolution layer that is added to the screen ('lighter') in a
  // single pass, instead of one full-size pass per lantern. The wide halo is the bloom sprite at 2x, so in
  // the half-size layer it is that sprite 1:1; the close glow uses a half-size bloom. Both ramps are smooth
  // (under one colour level per device px at their brightest), so the 2x2 blocks match the full-size draws.
  var bloomCv = null;
  function drawBlooms() {
    if (!lan.some(function (L) { return L.light * (1 - L.dim) >= 0.02; })) return;
    var d = G.dpr, W = Math.ceil(canvas.width / 2), H = Math.ceil(canvas.height / 2);
    if (!bloomCv) bloomCv = document.createElement('canvas');
    if (bloomCv.width !== W || bloomCv.height !== H) { bloomCv.width = W; bloomCv.height = H; }
    var g = bloomCv.getContext('2d');
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
    lan.forEach(function (L) {
      var lit = L.light * (1 - L.dim); if (lit < 0.02) return;
      var b = bodyCenter(L), cx = (b.x + sh.x) * d / 2, cy = (b.y + sh.y) * d / 2, hs = bloomSprite(L.ci, true), img;
      g.globalAlpha = Math.min(1, lit); g.drawImage(hs, Math.round(cx - hs.width / 2), Math.round(cy - hs.height / 2));
      if (lit > 0.5) { img = bloomSprite(L.ci); g.globalAlpha = (lit - 0.5) * 0.5; g.drawImage(img, Math.round(cx - img.width / 2), Math.round(cy - img.height / 2)); }
    });
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(bloomCv, 0, 0, W * 2, H * 2);
    ctx.restore();
  }

  function drawBeads() {
    if (!beads.length) return;
    var n = beads.length, sz = Math.min(15, (G.w - 60) / n / 2.6), gap = sz * 2.6, x0 = G.w / 2 - (n - 1) * gap / 2, y = G.beadY;
    var active = state === 'clear' ? n : seq.length;
    for (var i = 0; i < n; i++) {
      var b = beads[i], x = x0 + i * gap, s = sz * (1 + b.pop * 0.35 + b.on * 0.2);
      var isOn = i < active;
      if (b.on > 0.02 && b.ci >= 0) { // lit while the lights play
        ctx.globalAlpha = b.on; ctx.fillStyle = A.LANTERNS[b.ci].c; A.star8(ctx, x, y, s * 1.5, 0.55); ctx.fill(); ctx.globalAlpha = 1;
      }
      A.star8(ctx, x, y, s, 0.6);
      if (b.done || state === 'clear') { ctx.fillStyle = '#ffd36b'; ctx.fill(); ctx.strokeStyle = '#7a4a12'; ctx.lineWidth = 1.5; ctx.stroke(); }
      else if (isOn) { ctx.fillStyle = 'rgba(255,240,200,.18)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,224,160,.9)'; ctx.lineWidth = 1.6; ctx.stroke(); }
      else { ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.2; ctx.stroke(); }
    }
  }

  function draw() {
    if (!lan.length) return;
    ensureArt();
    var d = G.dpr, m = bg.margin, dr = Math.sin(time * 0.13);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawBack(dr);
    var fo = K.fx.offset(); sh.x = fo.x; sh.y = fo.y;
    ctx.setTransform(d, 0, 0, d, sh.x * d, sh.y * d);
    // drifting golden motes
    motes.forEach(function (o, i) {
      var x = o.x * G.w, y = o.y * G.h;
      ctx.globalAlpha = 0.25 + 0.3 * Math.sin(o.ph * 1.8 + i);
      ctx.fillStyle = '#ffe2a0'; ctx.beginPath(); ctx.arc(x, y, 1.5 * o.s, 0, 6.283); ctx.fill();
    });
    ctx.globalAlpha = 1;
    // scene tint from the lit lanterns (the courtyard takes on their colour)
    drawTint();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg.near, Math.round(-m + dr * 18 * d), Math.round(0));
    ctx.setTransform(d, 0, 0, d, sh.x * d, sh.y * d);

    G.ropes.forEach(drawRope);
    lan.forEach(drawLantern);
    drawBlooms();
    K.fx.draw(ctx);
    drawBeads();

    if (bannerT > 0) {
      var k = Math.max(0, Math.min(1, bannerT / 0.4, (1.9 - bannerT) / 0.3)), cy = G.h * 0.47, big = Math.min(64, G.w * 0.14);
      ctx.globalAlpha = k; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.fillStyle = 'rgba(8,4,26,.45)'; ctx.beginPath(); ctx.ellipse(G.w / 2, cy, Math.min(G.w * 0.48, 260), big * 1.25, 0, 0, 6.283); ctx.fill();
      ctx.font = '800 ' + Math.round(big * 0.36) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(10,6,30,.6)';
      var wn = LV.worlds[world].name.toUpperCase();
      ctx.strokeText(wn, G.w / 2, cy - big * 0.62); ctx.fillStyle = LV.worlds[world].color; ctx.fillText(wn, G.w / 2, cy - big * 0.62);
      ctx.font = '900 ' + Math.round(big) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = 10;
      ctx.strokeText('Level ' + level, G.w / 2, cy + big * 0.18); ctx.fillStyle = '#fffaf0'; ctx.fillText('Level ' + level, G.w / 2, cy + big * 0.18);
      ctx.globalAlpha = 1;
    }
  }

  var frozen = false;
  K.loop({ step: function (dt) { if (!frozen) step(dt); }, draw: draw, hz: 120, onHidden: function () { if (!DEBUG && (state === 'input' || state === 'watch' || state === 'intro' || state === 'oops' || state === 'cheer')) pause(); } });

  // Test hook (only with ?debug): step the game by hand and inspect it.
  if (DEBUG) window.FL = {
    run: function (sec) { for (var i = 0; i < Math.round(sec * 120); i++) step(1 / 120); draw(); },
    draw: draw, freeze: function (b) { frozen = b !== false; }, start: startLevel, tap: tap, free: startFree, pause: pause,
    get: function () { return { state: state, level: level, world: world, seq: seq.slice(), pos: pos, hearts: hearts, mistakes: mistakes,
      target: lv.target, n: lan.length, grid: G.cols + 'x' + G.rows, u: Math.round(G.u), stars: progress.stars(level), total: progress.total() }; },
    // Where to tap each lantern (CSS px), for pointer-event tests.
    spots: function () { return lan.map(function (L) { var b = bodyCenter(L); return { x: Math.round(b.x), y: Math.round(b.y) }; }); },
    G: G
  };

  var fontsReady = document.fonts && document.fonts.load ? document.fonts.load('900 40px Nunito') : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 700); })]).catch(function () {}).then(function () {
    startLevel(progress.current());
  });
})();
