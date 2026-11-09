/* Tower Blocks: game.js
   A block slides back and forth above the tower; tap anywhere to drop it. The part that hangs over the edge is
   sliced off and falls; the rest becomes the new top. Land it flush for a "Perfect!" and the tower grows back.
   20 levels in 4 worlds (stack N blocks) plus an endless Free Build with a saved best.
   Pseudo-3D isometric view drawn with Canvas2D on the shared kit (js/kit). World units: a block starts 100 wide
   and 100 deep, a layer is 26 tall; y points up. */
(function () {
  'use strict';
  var K = window.Kit, A = window.TowerArt, LV = window.TOWER_LEVELS;
  var DEBUG = /[?&]debug\b/.test(location.search);
  var W0 = 100, LH = 26, BASE_Y = 60, HOVER = 34, FALL_T = 0.11, PLAZA_R = 190, SKY_SPAN = 900, FREE_SPAN = 800;
  var PRAISES = ['mashaallah', 'ahsant', 'barakallah', 'alhamdulillah', 'subhanallah'];
  var store = K.store('kahf-tower-blocks'), progress = K.progress(store, LV.count);
  var canvas = document.getElementById('stage');

  // ---------- state ----------
  var mode = 'level', level = 1, world = 0, cfg = null, state = 'idle', run = 0;
  var layers = [], pieces = [], ripples = [], timers = [], motes = [], mover = null, spawnT = -1, spawnCount = 0;
  var hearts = 3, streak = 0, perfects = 0, drops = 0, time = 0, bannerT = 0, palOfs = 0, alt = 0, nextMile = 0, lastStars = 0;
  var hint = null, dropped = !!store.get('dropped', false), best = store.get('best', 0), bestAtStart = 0;
  var V = { S: 1, Z: 1, cx: 0, ay: 0, ayBase: 0, camH: BASE_Y, follow: true };
  var G = { w: 0, h: 0, D: 1 };
  var scene = null, plaza = null, pats = {};
  // Speed (same pixels): the courtyard and the tower's contact shadow are pre-rendered at their on-screen size
  // and copied at whole device pixels, instead of resampled / gradient-filled every frame. They are rebuilt
  // when the zoom settles; while it is still changing (level-end zoom out) they are drawn the old way.
  var plazaFit = null, shadowSpr = null, lastZ = -1;
  // The same goes for the block faces: a pattern fill under the isometric skew is the most expensive thing on
  // screen, so each face's unchanging layers (pattern, shading, contact shadow) are kept as a sprite drawn by
  // the very same calls, and copied; night tint, flash and rim lines are still drawn live on top, in order.
  // Each box is drawn at a whole-device-pixel anchor so its sprites stay valid while the camera moves. A face
  // that changes every frame (squash, zoom) is filled live; one that holds still for two frames gets a sprite.
  var faceSpr = new Map(), facePend = new Map(), frameNo = 0, builds = 0, AO = null;
  var PLINTHS = [
    { x0: -72, x1: 72, z0: -72, z1: 72, y0: 0, h: 14, tx: 0, tz: 0, pal: A.PLINTH },
    { x0: -61, x1: 61, z0: -61, z1: 61, y0: 14, h: 12, tx: 0, tz: 0, pal: A.PLINTH }
  ];

  // ---------- layout ----------
  var stage = K.stage(canvas, function (st) {
    G.w = st.w; G.h = st.h; G.D = st.dpr;
    // The tower is as big as fits: wide enough that the sliding block stays (mostly) on screen, short enough to
    // leave room above for the block and the climb.
    V.S = Math.min(1.15 * (st.w / 2 - 6) / 235, st.h * 0.4 / 200);
    V.cx = st.w / 2;
    V.ayBase = st.h * (st.w > st.h ? 0.6 : 0.56);
    pats = {}; scene = null; plaza = null; plazaFit = null; shadowSpr = null; faceSpr.clear(); facePend.clear();
    if (V.follow) V.ay = V.ayBase; else { V.ay = V.ayBase; fitView(true); }
  });
  var ctx = stage.ctx;
  for (var mi = 0; mi < 18; mi++) motes.push({ x: Math.random(), y: Math.random(), v: 0.3 + Math.random() * 0.7, ph: Math.random() * 6.28, s: 0.6 + Math.random() * 0.9 });

  // ---------- HUD ----------
  function starIcon(c, px) { return '<svg viewBox="-50 -50 100 100" style="width:' + px + 'px;height:' + px + 'px"><path d="M0-46 13-31 32-32 31-13 46 0 31 13 32 32 13 31 0 46-13 31-32 32-31 13-46 0-31-13-32-32-13-31Z" fill="' + c + '"/></svg>'; }
  var BLOCK = '<svg viewBox="0 0 24 24" style="width:20px;height:20px"><path d="M12 3.5l8.5 4.2-8.5 4.2-8.5-4.2z" fill="#86e6d9"/><path d="M3.5 7.7v8.4l8.5 4.3v-8.5z" fill="#1ba39c"/><path d="M20.5 7.7v8.4L12 20.4v-8.5z" fill="#0b565b"/></svg>';
  var TOWER = '<svg viewBox="0 0 24 24"><path d="M12 2.5l6 3-6 3-6-3z" fill="#ffe7a6"/><path d="M6 5.5v4l6 3v-4z" fill="#1ba39c"/><path d="M18 5.5v4l-6 3v-4z" fill="#0b565b"/><path d="M6 9.5v4.5l6 3v-4.5z" fill="#d7a565"/><path d="M18 9.5V14l-6 3v-4.5z" fill="#8f5f2c"/><path d="M6 14v4.5l6 3V17z" fill="#2b5fc4"/><path d="M18 14v4.5l-6 3V17z" fill="#142c6a"/></svg>';
  var pLevel = K.ui.pill(''), pHearts = K.ui.hearts(3);
  K.ui.spacer();
  var pHeight = K.ui.pill('');
  K.ui.iconButton('pause', 'Pause', function () { if (state === 'play') pause(); });
  function hud() {
    if (mode === 'free') pLevel.set(starIcon('#f6c453', 18) + 'Best ' + Math.max(best, height()));
    else pLevel.set(starIcon(LV.worlds[world].color, 18) + 'Level ' + level);
    pHearts.setLives(hearts);
    pHeight.set(BLOCK + (mode === 'free' ? '' + height() : height() + '/' + cfg.goal));
  }

  // ---------- helpers ----------
  function top() { return layers[layers.length - 1]; }
  function height() { return Math.max(0, layers.length - 1); }
  function topY() { var t = top(); return t.y0 + t.h; }
  function later(sec, fn) { timers.push({ t: sec, fn: fn, run: run }); }
  function vs() { return V.S * V.Z; }
  function sxy(x, y, z) { var s = vs(); return { x: V.cx + (x - z) * s, y: V.ay + ((x + z) / 2 - y + V.camH) * s }; }
  function fxOff() { return V.camH * V.S; }
  function fxAt(x, y, z) { var p = sxy(x, y, z); p.y -= fxOff(); return p; }
  function skyP() { return K.clamp(mode === 'free' ? alt / FREE_SPAN : (alt + cfg.sky) / SKY_SPAN, 0, 1); }

  // ---------- levels ----------
  function reset() {
    run++; timers = []; pieces = []; ripples = []; mover = null; K.fx.clear();
    document.querySelectorAll('.kit-veil').forEach(function (v) { v.remove(); });
    layers = [{ x0: -W0 / 2, x1: W0 / 2, z0: -W0 / 2, z1: W0 / 2, y0: 26, h: 34, pal: A.FOUND, tx: 0, tz: 0, sq: 0, flash: 0, off: 0, offAx: 'x' }];
    hearts = 3; streak = 0; perfects = 0; drops = 0; spawnCount = 0;
    V.Z = 1; V.follow = true; V.ay = V.ayBase; V.camH = topY(); alt = 0;
    spawnT = 0.6; bannerT = 2.4; state = 'play';
    pHearts.setMax(3);
  }
  function startLevel(n) {
    mode = 'level'; level = K.clamp(n, 1, LV.count); cfg = LV.list[level - 1]; world = cfg.world;
    progress.setCurrent(level); palOfs = (level * 3) % A.PALS.length;
    reset(); hud();
    if (!dropped && !hint) hint = K.ui.hint('Tap to drop the block', 110, true);
  }
  function startFree() {
    mode = 'free'; cfg = LV.free(0); world = 0; palOfs = 0; nextMile = 0; bestAtStart = best;
    reset(); hud();
  }

  // ---------- the sliding block ----------
  function spawn() {
    if (mode === 'free') cfg = LV.free(height());
    var t = top(), xz = cfg.axes === 'xz';
    var axis = xz && spawnCount % 2 ? 'z' : 'x';
    var w = axis === 'x' ? t.x1 - t.x0 : t.z1 - t.z0;
    var side = Math.floor(spawnCount / (xz ? 2 : 1)) % 2 ? 1 : -1;
    // Below 1 the block always overlaps the tower (no misses). Otherwise it sweeps a fixed minimum range so a
    // narrow tower is harder to hit, not just faster.
    var amp = cfg.amp < 1 ? cfg.amp * w : cfg.amp * Math.max(w, 60);
    mover = { axis: axis, A: amp, p: side * amp, dir: -side, phase: 'slide', fade: 0, ft: 0, spd: cfg.speed,
              pal: A.PALS[(height() + palOfs) % A.PALS.length] };
    spawnCount++;
    K.sfx.play('spawn');
  }
  function moverBox() {
    var t = top(), m = mover, b = { x0: t.x0, x1: t.x1, z0: t.z0, z1: t.z1, tx: t.tx, tz: t.tz, h: LH, pal: m.pal, sq: 0 };
    if (m.axis === 'x') { b.x0 += m.p; b.x1 += m.p; b.tx += m.p; } else { b.z0 += m.p; b.z1 += m.p; b.tz += m.p; }
    var d = m.phase === 'fall' ? K.ease.inQuad(Math.min(1, m.ft / FALL_T)) : 0;
    b.y0 = topY() + HOVER * (1 - d) + (m.phase === 'slide' ? Math.sin(time * 3.2) * 1.5 : 0);
    return b;
  }

  function tap() {
    if (state !== 'play' || !mover || mover.phase !== 'slide') return false;
    mover.phase = 'fall'; mover.ft = 0;
    if (!dropped) { dropped = true; store.set('dropped', true); }
    if (hint) { hint.hide(); hint = null; }
    return true;
  }

  function land() {
    var t = top(), m = mover, ax = m.axis, p = m.p, k0 = ax + '0', k1 = ax + '1', kt = 't' + ax;
    var lo = t[k0], hi = t[k1], w = hi - lo, y0 = topY();
    var perfect = Math.abs(p) <= cfg.tol, overlap = w - Math.abs(p);
    drops++;
    if (!perfect && overlap < 1.5) { miss(); return; }
    // Safety ledge: the tower never gets narrower than minW. The block slides back onto the ledge instead.
    var floor = Math.min(w, cfg.minW * W0), pOrig = p;
    if (perfect) p = 0;
    else if (overlap < floor) p = (p > 0 ? 1 : -1) * (w - floor);
    var nb = { x0: t.x0, x1: t.x1, z0: t.z0, z1: t.z1, tx: t.tx, tz: t.tz, y0: y0, h: LH, pal: m.pal, sq: 1, flash: perfect ? 0.9 : 0, off: pOrig - p, offAx: ax };
    nb[kt] += p;
    var cut = null;
    if (p !== 0) {
      cut = { x0: nb.x0, x1: nb.x1, z0: nb.z0, z1: nb.z1, tx: nb.tx, tz: nb.tz, y0: y0, h: LH, pal: m.pal };
      if (p > 0) { nb[k0] = lo + p; nb[k1] = hi; cut[k0] = hi; cut[k1] = hi + p; }
      else { nb[k0] = lo; nb[k1] = hi + p; cut[k0] = lo + p; cut[k1] = lo; }
      cut[k0] += pOrig - p; cut[k1] += pOrig - p; cut[kt] += pOrig - p; // starts where the sliding block was
    }
    layers.push(nb);
    mover = null;
    var kind = m.pal.kind === 'stone' ? 'stone' : 'tile';
    K.sfx.play(kind); K.buzz(8);
    // dust puffs at the two front corners
    var c1 = fxAt(nb.x0, y0, nb.z1), c2 = fxAt(nb.x1, y0, nb.z1), c3 = fxAt(nb.x1, y0, nb.z0);
    [c1, c2, c3].forEach(function (c, i) {
      K.fx.burst(c.x, c.y, { n: 4, colors: ['rgba(255,240,215,.8)', m.pal.light], speed: 90, size: 7, life: 0.45, gravity: -30, shape: 'dot', spread: 1.4, angle: i === 0 ? Math.PI * 0.85 : i === 2 ? -0.2 : Math.PI / 2 });
    });
    if (cut) {
      var sgn = p > 0 ? 1 : -1, scr = (ax === 'x' ? 1 : -1) * sgn;
      pieces.push({ b: cut, ax: ax, vy: 40, vh: sgn * 45, rot: 0, vr: scr * K.rand(1.3, 2.3), front: p > 0 });
      K.sfx.play('slice');
      var seam = ax === 'x' ? fxAt(p > 0 ? nb.x1 : nb.x0, y0 + LH / 2, nb.z1) : fxAt(nb.x1, y0 + LH / 2, p > 0 ? nb.z1 : nb.z0);
      K.fx.burst(seam.x, seam.y, { n: 8, colors: [m.pal.light, m.pal.base, '#fff4d6'], speed: 200, size: 8, life: 0.55, gravity: 600, angle: scr > 0 ? -0.3 : Math.PI + 0.3, spread: 1.6 });
    }
    var grew = false, mid = fxAt((nb.x0 + nb.x1) / 2, y0 + LH, (nb.z0 + nb.z1) / 2);
    if (perfect) {
      perfects++; streak++;
      K.sfx.play('perfect', { step: streak });
      ripples.push({ x0: nb.x0, x1: nb.x1, z0: nb.z0, z1: nb.z1, y: y0 + LH, t: 0 }, { x0: nb.x0, x1: nb.x1, z0: nb.z0, z1: nb.z1, y: y0 + LH, t: -0.12 });
      K.fx.burst(mid.x, mid.y, { n: 12 + Math.min(streak, 8) * 2, colors: ['#fff6c2', '#ffd36b', '#ffffff'], speed: 260, size: 11, life: 0.8, shape: 'star', gravity: 240 });
      K.fx.text(mid.x, mid.y - 30, streak > 1 ? 'Perfect ×' + streak : 'Perfect!', { color: '#fff6c2', size: Math.min(46, 34 + streak * 2), stroke: 'rgba(60,20,80,.65)' });
      if (streak >= cfg.grow) grew = grow(nb, ax);
      if (streak % 3 === 0 && hearts < 3) {
        hearts++; pHearts.bump();
        K.fx.text(mid.x, mid.y - 80, '+1 \u2665', { color: '#ff8fa3', size: 38, stroke: 'rgba(60,10,30,.6)', life: 1 });
      }
      if (streak === 5 && !DEBUG) K.say.praise('ahsant');
    } else {
      streak = 0;
      if (overlap / w > 0.84) K.fx.text(mid.x, mid.y - 30, 'Good!', { color: '#e8fff4', size: 32, stroke: 'rgba(20,40,60,.55)', life: 0.7 });
    }
    hud(); pHeight.bump();
    if (mode === 'level' && height() >= cfg.goal) { win(); return; }
    if (mode === 'free') freeProgress();
    spawnT = grew ? 0.45 : 0.24;
  }

  // A perfect streak grows the new block back toward full size (8 units at a time).
  function grow(b, ax) {
    var k0 = ax + '0', k1 = ax + '1', w = b[k1] - b[k0];
    if (w >= W0 - 0.5) return false;
    var add = Math.min(8, W0 - w), n0 = b[k0] - add / 2, n1 = b[k1] + add / 2;
    if (n0 < -W0 / 2) { n1 += -W0 / 2 - n0; n0 = -W0 / 2; }
    if (n1 > W0 / 2) { n0 -= n1 - W0 / 2; n1 = W0 / 2; }
    var to = {}; to[k0] = n0; to[k1] = n1;
    K.tween(b, to, 0.35, K.ease.outBack);
    later(0.12, function () { K.sfx.play('grow'); });
    var c = fxAt(ax === 'x' ? n1 : (b.x0 + b.x1) / 2, b.y0 + LH, ax === 'x' ? (b.z0 + b.z1) / 2 : n1);
    K.fx.burst(c.x, c.y, { n: 10, colors: ['#b8ffd9', '#ffffff', '#ffd36b'], speed: 160, size: 9, life: 0.7, shape: 'spark', gravity: -80 });
    K.fx.text(c.x, c.y + 10, 'Bigger!', { color: '#c9ffe0', size: 30, stroke: 'rgba(10,50,40,.6)', rise: 60, life: 0.8 });
    return true;
  }

  function miss() {
    var m = mover, b = moverBox(), sgn = m.p > 0 ? 1 : -1;
    mover = null; streak = 0;
    pieces.push({ b: b, ax: m.axis, vy: 0, vh: sgn * 55, rot: 0, vr: (m.axis === 'x' ? 1 : -1) * sgn * K.rand(1, 1.8), front: m.p > 0 });
    hearts--;
    K.sfx.play('miss'); K.buzz(30); K.fx.shake(6, 0.3);
    hud(); pHearts.bump();
    var c = fxAt(0, topY() + LH * 2, 0);
    K.fx.text(c.x, c.y, hearts > 0 ? 'Oops!' : 'Oh no!', { color: '#ffd1dc', size: 42, stroke: 'rgba(60,10,30,.6)', life: 1.1 });
    if (hearts <= 0) {
      state = mode === 'free' ? 'over' : 'fail';
      later(0.9, mode === 'free' ? freeOver : failLevel);
    } else spawnT = 0.75;
  }

  function stars() {
    var t = top(), area = ((t.x1 - t.x0) * (t.z1 - t.z0)) / (W0 * W0), pr = perfects / Math.max(1, drops);
    if (area >= 0.6 || pr >= 0.5) return 3;
    if (area >= 0.3 || pr >= 0.25) return 2;
    return 1;
  }

  function celebrate(big) {
    layers.forEach(function (L, i) { L.fd = 0.2 + i * 0.05; });
    var n = big ? 6 : 3;
    for (var i = 0; i < n; i++) later(i * 0.16, function () {
      var c = fxAt(0, topY(), 0);
      K.fx.burst(c.x + K.rand(-G.w * 0.35, G.w * 0.35), c.y + K.rand(-60, 40), { n: 20, colors: ['#ffd36b', '#ff8fab', '#7ae7ff', '#ffffff', '#86e6d9'], speed: 420, size: 15, life: 1.2, shape: 'star', gravity: 500 });
    });
  }

  function win() {
    state = 'won';
    var st = lastStars = stars();
    progress.finish(level, st);
    K.bridge.complete();
    K.sfx.play('win'); K.buzz(20);
    if (!DEBUG) later(0.45, function () { K.say.praise(PRAISES[(level - 1) % PRAISES.length]); });
    var c = fxAt(0, topY(), 0);
    K.fx.burst(c.x, c.y, { n: 30, colors: ['#ffd36b', '#fff6c2'], speed: 380, size: 13, life: 1, shape: 'star', gravity: 120 });
    celebrate(true);
    later(0.7, function () { fitView(false); });
    later(2.1, winSheet);
  }
  function winSheet() {
    var last = level === LV.count, endOfWorld = level % LV.perWorld === 0, buttons = [];
    if (last) buttons.push({ label: 'Free Build', icon: TOWER, primary: true, onClick: startFree });
    else buttons.push({ label: endOfWorld ? 'Next World' : 'Next Level', icon: 'next', primary: true, onClick: function () { startLevel(level + 1); } });
    buttons.push({ label: 'Replay', icon: 'restart', row: true, onClick: function () { startLevel(level); } });
    buttons.push({ label: 'Levels', icon: 'levels', row: true, onClick: function () { openLevels(false); } });
    K.ui.sheet({
      title: last ? 'You did it!' : endOfWorld ? LV.worlds[world].name + ' done!' : 'Tower complete!',
      text: last ? 'All 20 towers built. MashaAllah!' : cfg.goal + ' blocks · ' + perfects + ' perfect',
      stars: lastStars, buttons: buttons });
  }
  function failLevel() {
    fitView(false);
    later(1.1, function () {
      K.ui.sheet({ title: 'Out of hearts', text: "Let's build it again!", buttons: [
        { label: 'Try Again', icon: 'restart', primary: true, onClick: function () { startLevel(level); } },
        { label: 'Levels', icon: 'levels', onClick: function () { openLevels(false); } }] });
    });
  }

  // ---------- Free Build ----------
  function freeProgress() {
    var h = height();
    if (h > best) { best = h; store.set('best', best); }
    if (bestAtStart > 0 && h === bestAtStart + 1) {
      K.sfx.play('cheer');
      var c = fxAt(0, topY() + LH * 2, 0);
      K.fx.text(c.x, c.y, 'New best!', { color: '#ffe7a6', size: 46, stroke: 'rgba(60,30,10,.6)', life: 1.3 });
    }
    if (h === LV.milestones[nextMile]) {
      nextMile++;
      K.bridge.complete();
      K.sfx.play('cheer');
      if (!DEBUG) K.say.praise('mashaallah');
      var m = fxAt(0, topY() + LH * 3, 0);
      K.fx.text(m.x, m.y, h + ' blocks!', { color: '#fff6c2', size: 54, stroke: 'rgba(60,20,80,.6)', life: 1.5 });
      celebrate(false);
    }
    hud();
  }
  function freeOver() {
    var h = height(), isBest = h > bestAtStart && h > 0;
    fitView(false);
    if (isBest) { K.sfx.play('cheer'); if (!DEBUG) later(0.4, function () { K.say.praise('barakallah'); }); celebrate(false); }
    later(1.4, function () {
      K.ui.sheet({ title: isBest ? 'New best tower!' : 'What a tower!',
        text: h + (h === 1 ? ' block' : ' blocks') + (isBest ? '' : ' · Best ' + best), buttons: [
          { label: 'Build Again', icon: 'restart', primary: true, onClick: startFree },
          { label: 'Levels', icon: 'levels', onClick: function () { openLevels(false); } }] });
    });
  }

  // Zoom out to show the whole tower (level end, game over).
  function fitView(instant) {
    if (!layers.length) return;
    V.follow = false;
    var yT = topY() + 30, Z = Math.min(1, (G.h * 0.74) / ((yT + 110) * V.S));
    // centre the span from the tower top down to the front of the courtyard (110 units below the origin)
    var camH = (G.h * 0.47 - V.ay) / (V.S * Z) - (110 - yT) / 2;
    if (instant) { V.Z = Z; V.camH = camH; }
    else K.tween(V, { Z: Z, camH: camH }, 1.0, K.ease.inOutSine);
  }

  // ---------- menus ----------
  function pause() {
    state = 'paused';
    K.ui.sheet({ title: 'Paused', text: mode === 'free' ? 'Free Build' : LV.worlds[world].name + ' · Level ' + level, buttons: [
      { label: 'Resume', icon: 'play', primary: true, onClick: resume },
      { label: 'Restart', icon: 'restart', row: true, onClick: restart },
      { label: 'Levels', icon: 'levels', row: true, onClick: function () { openLevels(true); } },
      { label: K.sfx.muted ? 'Sound: Off' : 'Sound: On', icon: K.sfx.muted ? 'soundOff' : 'sound', onClick: function () { K.sfx.toggle(); pause(); } }] });
  }
  function resume() { state = 'play'; }
  function restart() { if (mode === 'free') startFree(); else startLevel(level); }
  function openLevels(resumable) {
    var prev = state;
    state = 'paused';
    var sh = K.ui.levelSelect({
      title: 'Tower Blocks',
      worlds: LV.worlds.map(function (w, i) { return { name: w.name, color: w.color, from: i * LV.perWorld + 1, to: (i + 1) * LV.perWorld }; }),
      progress: progress, current: mode === 'level' ? level : 0,
      onPick: function (n) { startLevel(n); },
      onClose: function () {
        if (resumable) resume();
        else if (mode === 'free') startFree();
        else startLevel(prev === 'won' ? progress.current() : level);
      }
    });
    var b = document.createElement('button');
    b.className = 'kit-btn primary tb-free';
    b.innerHTML = TOWER + '<span>Free Build' + (best ? ' <small>Best ' + best + '</small>' : '') + '</span>';
    b.onclick = function () { K.sfx.play('tap'); sh.close(); startFree(); };
    sh.el.querySelector('.kit-sheet-in').appendChild(b);
  }

  // ---------- input: tap anywhere ----------
  K.pointer(canvas, function (x, y) { return { x: x, y: y }; }, { down: function () { tap(); } });
  addEventListener('keydown', function (e) {
    if (e.repeat) return;
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') { if (!document.querySelector('.kit-veil')) tap(); }
    if (e.key === 'Escape' || e.key === 'p') { if (state === 'play') pause(); }
  });

  // ---------- simulation ----------
  function step(dt) {
    time += dt;
    K.fx.update(dt);
    for (var i = timers.length - 1; i >= 0; i--) {
      var tm = timers[i];
      if (tm.run !== run) { timers.splice(i, 1); continue; }
      tm.t -= dt;
      if (tm.t <= 0) { timers.splice(i, 1); tm.fn(); }
    }
    if (!layers.length) return;
    if (V.follow) V.camH += (topY() - V.camH) * (1 - Math.exp(-dt * 4));
    alt += (topY() - BASE_Y - alt) * (1 - Math.exp(-dt * 1.5));
    for (var j = 0; j < layers.length; j++) {
      var L = layers[j];
      if (L.sq) L.sq = Math.max(0, L.sq - dt * 7);
      if (L.flash) L.flash = Math.max(0, L.flash - dt * 2.5);
      if (L.fd > 0) { L.fd -= dt; if (L.fd <= 0) L.flash = 0.85; }
      if (L.off) { L.off *= Math.exp(-dt * 16); if (Math.abs(L.off) < 0.05) L.off = 0; }
    }
    for (var q = pieces.length - 1; q >= 0; q--) {
      var pc = pieces[q], b = pc.b;
      pc.vy -= 1100 * dt; b.y0 += pc.vy * dt; pc.rot += pc.vr * dt;
      var dx = pc.vh * dt;
      if (pc.ax === 'x') { b.x0 += dx; b.x1 += dx; b.tx += dx; } else { b.z0 += dx; b.z1 += dx; b.tz += dx; }
      if (b.y0 + b.h < 0) {
        // it reaches the courtyard: a crumble, quieter and duller the further below the camera it is
        var dist = K.clamp((V.camH - 120) / 520, 0, 1), c = sxy((b.x0 + b.x1) / 2, 0, (b.z0 + b.z1) / 2);
        K.sfx.play('crumble', { dist: dist });
        if (c.y < G.h + 20) {
          K.fx.burst(c.x, c.y - fxOff(), { n: 14, colors: [b.pal.base, b.pal.dark, b.pal.light], speed: 260, size: 10, life: 0.8, gravity: 700, angle: -Math.PI / 2, spread: 2.4 });
          K.fx.burst(c.x, c.y - fxOff(), { n: 8, colors: ['rgba(230,210,180,.6)'], speed: 100, size: 16, life: 0.9, gravity: -20, shape: 'dot' });
          K.fx.shake(3, 0.15);
        }
        pieces.splice(q, 1);
      }
    }
    if (pieces.length > 30) pieces.shift();
    for (var r = ripples.length - 1; r >= 0; r--) { ripples[r].t += dt; if (ripples[r].t > 0.7) ripples.splice(r, 1); }
    motes.forEach(function (m) { m.ph += dt; m.y -= dt * 0.02 * m.v; if (m.y < -0.05) { m.y = 1.05; m.x = Math.random(); } m.x += Math.sin(m.ph * 0.8) * dt * 0.006; });
    if (bannerT > 0) bannerT -= dt;
    if (state !== 'play') return;
    if (!mover) {
      if (spawnT > 0) { spawnT -= dt; if (spawnT <= 0) spawn(); }
      return;
    }
    if (mover.phase === 'slide') {
      mover.fade = Math.min(1, mover.fade + dt * 5);
      mover.p += mover.dir * mover.spd * dt;
      if (mover.p > mover.A) { mover.p = 2 * mover.A - mover.p; mover.dir = -1; }
      else if (mover.p < -mover.A) { mover.p = -2 * mover.A - mover.p; mover.dir = 1; }
    } else {
      mover.ft += dt;
      if (mover.ft >= FALL_T) land();
    }
  }

  // ---------- drawing ----------
  // Sets the canvas transform so (u, v) on one face of a box maps to the screen. m = optional pre-transform
  // (device px), used to tumble falling pieces.
  function plane(m, ux, uy, vx, vy, ox, oy) {
    var s = vs(), D = G.D;
    if (m) ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]); else ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.transform(ux * s * D, uy * s * D, vx * s * D, vy * s * D, (V.cx + ox * s) * D, (V.ay + (oy + V.camH) * s) * D);
  }
  function getPat(pal, kind, H) {
    var key = pal.id + kind + (H || 0), p = pats[key];
    if (!p) {
      var t = kind === 'top' ? A.topTile(pal, V.S * G.D) : A.sideTile(pal, H, V.S * G.D);
      p = pats[key] = { p: ctx.createPattern(t.img, 'repeat'), kx: t.kx, ky: t.ky, key: key };
    }
    return p;
  }
  // Fill a face rectangle with a pattern whose origin is (tu, tv), so patterns stay glued to their block.
  function fillPat(g, pt, u0, v0, u1, v1, tu, tv) {
    g.save(); g.translate(tu, tv); g.scale(1 / pt.kx, 1 / pt.ky);
    g.fillStyle = pt.p; g.fillRect((u0 - tu) * pt.kx, (v0 - tv) * pt.ky, (u1 - u0) * pt.kx, (v1 - v0) * pt.ky);
    g.restore();
  }
  function q6(v) { return Math.round(v * 1e5); }
  // Draw the unchanging part of one face: paint(g) draws it in face coordinates relative to (u0, v0), over a
  // w x h rectangle, onto g. With useSpr it is copied from a sprite drawn by exactly the same calls (same
  // transform up to a whole-pixel shift), else drawn live (the face is changing this frame).
  function face(useSpr, id, u0, v0, w, h, paint) {
    var P = ctx.getTransform(), ex0 = P.e + P.a * u0 + P.c * v0, ey0 = P.f + P.b * u0 + P.d * v0, key = null;
    if (useSpr) {
      var ie = Math.floor(ex0), jf = Math.floor(ey0), fe = Math.round((ex0 - ie) * 256), ff = Math.round((ey0 - jf) * 256);
      if (fe === 256) { fe = 0; ie++; }
      if (ff === 256) { ff = 0; jf++; }
      key = id + '|' + q6(P.a) + ',' + q6(P.b) + ',' + q6(P.c) + ',' + q6(P.d) + ',' + fe + ',' + ff + '|' + q6(w) + ',' + q6(h);
      var sp = faceSpr.get(key);
      if (!sp && facePend.get(key) === frameNo - 1 && builds < 8) {   // held still since last frame; a few per frame
        facePend.delete(key); builds++;
        var ex = fe / 256, ey = ff / 256, xs = [], ys = [];
        [[0, 0], [w, 0], [0, h], [w, h]].forEach(function (p) { xs.push(P.a * p[0] + P.c * p[1] + ex); ys.push(P.b * p[0] + P.d * p[1] + ey); });
        var bx = Math.floor(Math.min.apply(null, xs)) - 1, by = Math.floor(Math.min.apply(null, ys)) - 1;
        var c = document.createElement('canvas');
        c.width = Math.ceil(Math.max.apply(null, xs)) - bx + 1; c.height = Math.ceil(Math.max.apply(null, ys)) - by + 1;
        var g = c.getContext('2d');
        g.setTransform(P.a, P.b, P.c, P.d, ex - bx, ey - by);
        paint(g);
        sp = { c: c, bx: bx, by: by, f: 0 };
        faceSpr.set(key, sp);
      }
      if (sp) {
        sp.f = frameNo;
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(sp.c, ie + sp.bx, jf + sp.by); ctx.setTransform(P);
        return;
      }
      facePend.set(key, frameNo);
    }
    ctx.save(); ctx.translate(u0, v0); paint(ctx); ctx.restore();
  }
  function sweepSprites() {
    if (frameNo % 60) return;
    faceSpr.forEach(function (sp, k) { if (sp.f < frameNo - 30) faceSpr.delete(k); });
    facePend.forEach(function (f, k) { if (f < frameNo - 2) facePend.delete(k); });
  }
  var NO = {};
  function drawBox(b, o) {
    o = o || NO;
    var pal = b.pal, H = b.h, vsq = 1 - (b.sq || 0) * 0.18, yT = b.y0 + H * vsq, m = o.m || null;
    var x0 = b.x0, x1 = b.x1, z0 = b.z0, z1 = b.z1, tx = b.tx, tz = b.tz;
    if (b.off) { if (b.offAx === 'x') { x0 += b.off; x1 += b.off; tx += b.off; } else { z0 += b.off; z1 += b.off; tz += b.off; } }
    if (x1 - x0 < 0.2 || z1 - z0 < 0.2) return;
    var alpha = o.alpha == null ? 1 : o.alpha, useSpr = !m && alpha >= 1;
    if (!m) {
      // anchor the box on a whole device pixel (moves it by under half a pixel) so its face sprites line up
      var s0 = vs(), D0 = G.D, QX = (V.cx + (x0 - z0) * s0) * D0, QY = (V.ay + ((x0 + z0) / 2 - yT + V.camH) * s0) * D0;
      m = [1, 0, 0, 1, Math.round(QX) - QX, Math.round(QY) - QY];
    }
    var side = getPat(pal, 'side', H), topP = getPat(pal, 'top'), lw = 1.25 / vs(), night = o.night || 0, fl = b.flash || 0;
    var Hv = H + 0.5, cov = !!o.covered, wx = x1 - x0, wz = z1 - z0;
    var shadeA = Math.round((0.3 + 0.1 * night) * 255) / 255;   // in 1/255 steps: the right face's sprite changes only with it
    if (cov && !AO) { AO = ctx.createLinearGradient(0, 0, 0, 9); AO.addColorStop(0, 'rgba(20,8,30,.42)'); AO.addColorStop(1, 'rgba(20,8,30,0)'); }
    ctx.globalAlpha = alpha;
    // left face (z = z1): warm, lit by the low sun
    plane(m, 1, 0.5, 0, vsq, -z1, z1 / 2 - yT);
    face(useSpr, 'L' + side.key + cov + '|' + q6(tx - x0), x0, 0, wx, Hv, function (g) {
      fillPat(g, side, 0, 0, wx, Hv, tx - x0, 0);
      if (cov) { g.fillStyle = AO; g.fillRect(0, 0, wx, 9); }
    });
    if (night) { ctx.fillStyle = 'rgba(14,20,66,' + (0.3 * night) + ')'; ctx.fillRect(x0, 0, wx, Hv); }
    if (fl) { ctx.fillStyle = 'rgba(255,250,225,' + fl * 0.55 + ')'; ctx.fillRect(x0, 0, wx, Hv); }
    ctx.lineWidth = lw; ctx.strokeStyle = A.rgba(pal.light, 0.75);
    ctx.beginPath(); ctx.moveTo(x1, 0.5); ctx.lineTo(x1, H); ctx.stroke();
    // right face (x = x1): in shade
    plane(m, -1, 0.5, 0, vsq, x1, x1 / 2 - yT);
    face(useSpr, 'R' + side.key + cov + shadeA + '|' + q6(tz - z0), z0, 0, wz, Hv, function (g) {
      fillPat(g, side, 0, 0, wz, Hv, tz - z0, 0);
      g.fillStyle = 'rgba(32,12,52,' + shadeA + ')'; g.fillRect(0, 0, wz, Hv);
      if (cov) { g.fillStyle = AO; g.fillRect(0, 0, wz, 9); }
    });
    if (night) { ctx.fillStyle = 'rgba(14,20,66,' + (0.25 * night) + ')'; ctx.fillRect(z0, 0, wz, Hv); }
    if (fl) { ctx.fillStyle = 'rgba(255,250,225,' + fl * 0.45 + ')'; ctx.fillRect(z0, 0, wz, Hv); }
    // top face
    plane(m, 1, 0.5, -1, 0.5, 0, -yT);
    face(useSpr, 'T' + topP.key + '|' + q6(tx - x0) + ',' + q6(tz - z0), x0, z0, wx, wz, function (g) {
      fillPat(g, topP, 0, 0, wx, wz, tx - x0, tz - z0);
      g.fillStyle = 'rgba(255,246,228,.1)'; g.fillRect(0, 0, wx, wz);
    });
    if (night) { ctx.fillStyle = 'rgba(14,20,66,' + (0.22 * night) + ')'; ctx.fillRect(x0, z0, wx, wz); }
    if (fl) { ctx.fillStyle = 'rgba(255,250,225,' + fl * 0.6 + ')'; ctx.fillRect(x0, z0, wx, wz); }
    // rim light on the near edges, a softer line on the far ones
    ctx.lineJoin = 'round';
    ctx.lineWidth = lw * 1.3; ctx.strokeStyle = A.rgba(A.shade(pal.light, 0.35), 0.95);
    ctx.beginPath(); ctx.moveTo(x0, z1); ctx.lineTo(x1, z1); ctx.lineTo(x1, z0); ctx.stroke();
    ctx.lineWidth = lw * 0.8; ctx.strokeStyle = 'rgba(255,255,255,.3)';
    ctx.beginPath(); ctx.moveTo(x0, z1); ctx.lineTo(x0, z0); ctx.lineTo(x1, z0); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  function drawPiece(pc, night) {
    var b = pc.b, c = sxy((b.x0 + b.x1) / 2, b.y0 + b.h / 2, (b.z0 + b.z1) / 2), D = G.D;
    if (c.y > G.h + 200 * vs()) return;
    var cs = Math.cos(pc.rot), sn = Math.sin(pc.rot), X = c.x * D, Y = c.y * D;
    drawBox(b, { m: [cs, sn, -sn, cs, X - cs * X + sn * Y, Y - sn * X - cs * Y], night: night });
  }
  function drawRing(y, color, label, glow) {
    var pt = sxy(0, y, 0), s = vs();
    if (pt.y < -90 || pt.y > G.h + 90) return;
    var r = 68, pulse = 0.75 + 0.25 * Math.sin(time * 3);
    plane(null, 1, 0.5, -1, 0.5, 0, -y);
    ctx.lineWidth = 9 / s; ctx.strokeStyle = A.rgba(color, 0.16 * pulse * glow); ctx.strokeRect(-r, -r, 2 * r, 2 * r);
    ctx.setLineDash([12, 8]); ctx.lineDashOffset = -time * 16;
    ctx.lineWidth = 2.4 / s; ctx.strokeStyle = A.rgba(color, 0.9 * glow); ctx.strokeRect(-r, -r, 2 * r, 2 * r);
    ctx.setLineDash([]);
    // a star badge with the number at the right corner
    var bp = sxy(r, y, -r), D = G.D, br = Math.max(15, 16 * s);
    ctx.setTransform(D, 0, 0, D, 0, 0);
    ctx.save(); ctx.translate(bp.x, bp.y + Math.sin(time * 2.4) * 3); ctx.rotate(Math.sin(time * 1.3) * 0.12);
    ctx.globalAlpha = glow;
    A.star8(ctx, 0, 0, br, 0.74); ctx.fillStyle = color; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(70,40,10,.8)'; ctx.stroke();
    ctx.rotate(-Math.sin(time * 1.3) * 0.12);
    ctx.font = '900 ' + Math.round(br * 0.95) + 'px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#3b2208'; ctx.fillText(label, 0, 1);
    ctx.restore(); ctx.globalAlpha = 1;
  }

  function fitCopy(img, pw, ph) {
    var c = document.createElement('canvas'); c.width = Math.ceil(pw); c.height = Math.ceil(ph);
    c.getContext('2d').drawImage(img, 0, 0, pw, ph);
    return c;
  }
  function contactShadowPath(g, x, y, s) {
    g.save(); g.translate(x, y); g.scale(1, 0.5);
    var cg = g.createRadialGradient(0, 0, 40 * s, 0, 0, 185 * s);
    cg.addColorStop(0, 'rgba(25,10,30,.5)'); cg.addColorStop(1, 'rgba(25,10,30,0)');
    g.fillStyle = cg; g.beginPath(); g.arc(0, 0, 185 * s, 0, 6.283); g.fill(); g.restore();
  }
  function contactShadow(s, D) {
    var cx = Math.ceil(185 * s * D) + 2, cy = Math.ceil(92.5 * s * D) + 2, c = document.createElement('canvas');
    c.width = cx * 2; c.height = cy * 2;
    var g = c.getContext('2d'); g.setTransform(D, 0, 0, D, 0, 0);
    contactShadowPath(g, cx / D, cy / D, s);
    return { s: s, c: c, cx: cx, cy: cy };
  }

  function draw() {
    var D = G.D, zStill = V.Z === lastZ;
    lastZ = V.Z; frameNo++; builds = 0; sweepSprites();
    if (!layers.length) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#2f2a72'; ctx.fillRect(0, 0, canvas.width, canvas.height); return; }
    var s = vs(), p = skyP(), night = A.smooth(0.45, 0.95, p);
    if (!scene) scene = A.scene(G.w, G.h, D, V.S);
    if (!plaza) plaza = A.plaza(V.S, D, PLAZA_R);
    var horizonY = V.ay + (BASE_Y + (V.camH - BASE_Y) * 0.62 - 150) * s;
    scene.draw(ctx, { p: p, camH: V.camH, S: V.S, ay: V.ay, horizonY: horizonY, t: time });
    var sh = K.fx.offset(), ay0 = V.ay, cx0 = V.cx;
    V.ay += sh.y; V.cx += sh.x;

    // golden motes drifting up from the courtyard (fireflies at night)
    ctx.setTransform(D, 0, 0, D, 0, 0);
    motes.forEach(function (m, i) {
      var a = (0.25 + 0.35 * Math.sin(m.ph * 2 + i)) * (0.5 + 0.5 * night + 0.4 * (1 - p));
      if (a <= 0.02) return;
      ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = night > 0.5 ? '#e9ff9e' : '#ffe2a0';
      ctx.beginPath(); ctx.arc(m.x * G.w, (0.35 + m.y * 0.65) * G.h, 1.7 * m.s, 0, 6.283); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // courtyard and the tower's contact shadow
    var o = sxy(0, 0, 0);
    if (o.y - plaza.oy * V.Z < G.h) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      var pw = plaza.w * V.Z * D, ph = plaza.h * V.Z * D, px = (o.x - plaza.ox * V.Z) * D, py = (o.y - plaza.oy * V.Z) * D;
      if (zStill && (!plazaFit || plazaFit.Z !== V.Z)) plazaFit = { Z: V.Z, day: fitCopy(plaza.day, pw, ph), night: fitCopy(plaza.night, pw, ph) };
      var fit = plazaFit && plazaFit.Z === V.Z;
      if (fit) ctx.drawImage(plazaFit.day, Math.round(px), Math.round(py)); else ctx.drawImage(plaza.day, px, py, pw, ph);
      if (night > 0.01) {
        ctx.globalAlpha = night;
        if (fit) ctx.drawImage(plazaFit.night, Math.round(px), Math.round(py)); else ctx.drawImage(plaza.night, px, py, pw, ph);
        ctx.globalAlpha = 1;
      }
      if (zStill && (!shadowSpr || shadowSpr.s !== s)) shadowSpr = contactShadow(s, D);
      if (shadowSpr && shadowSpr.s === s) ctx.drawImage(shadowSpr.c, Math.round(o.x * D - shadowSpr.cx), Math.round((o.y + 6 * s) * D - shadowSpr.cy));
      else { ctx.setTransform(D, 0, 0, D, 0, 0); contactShadowPath(ctx, o.x, o.y + 6 * s, s); }
      ctx.setTransform(D, 0, 0, D, 0, 0);
    }

    pieces.forEach(function (pc) { if (!pc.front) drawPiece(pc, night); });
    var bottomY = sxy(0, 0, 0).y;
    if (bottomY - 120 * s < G.h) PLINTHS.forEach(function (b) { drawBox(b, { night: night, covered: true }); });
    var n = layers.length;
    for (var i = 0; i < n; i++) {
      var L = layers[i], ly = V.ay + (V.camH - L.y0 - L.h) * s;
      if (ly - 70 * s > G.h) continue;
      drawBox(L, { night: night, covered: i < n - 1 });
    }
    // standing lanterns on the courtyard
    var lgl = 0.2 + 0.8 * A.smooth(0.15, 0.7, p);
    [[-40, 150], [150, -40]].forEach(function (q, k) {
      var lp = sxy(q[0], 0, q[1]);
      if (lp.y - 60 * s > G.h) return;
      ctx.setTransform(D, 0, 0, D, 0, 0);
      A.lantern(ctx, lp.x, lp.y, s, lgl, time, k * 2.3);
    });

    // goal ring (levels) or best-height ring (Free Build)
    if (state === 'play' || state === 'paused') {
      if (mode === 'level') drawRing(BASE_Y + cfg.goal * LH, '#ffd36b', '' + cfg.goal, 1);
      else if (bestAtStart > height()) drawRing(BASE_Y + bestAtStart * LH, '#c9e8ff', '' + bestAtStart, 0.8);
    }

    // the sliding block, its shadow on the tower, and a glow when a drop now would be perfect
    if (mover) {
      var mb = moverBox(), t = top(), yT = topY();
      var ix0 = Math.max(mb.x0, t.x0), ix1 = Math.min(mb.x1, t.x1), iz0 = Math.max(mb.z0, t.z0), iz1 = Math.min(mb.z1, t.z1);
      plane(null, 1, 0.5, -1, 0.5, 0, -yT);
      if (ix1 > ix0 && iz1 > iz0) { ctx.fillStyle = 'rgba(24,8,40,' + 0.38 * mover.fade + ')'; ctx.fillRect(ix0, iz0, ix1 - ix0, iz1 - iz0); }
      if (mover.phase === 'slide' && Math.abs(mover.p) <= cfg.tol) {
        ctx.lineWidth = 3.2 / s; ctx.strokeStyle = 'rgba(255,226,140,' + (world === 0 && mode === 'level' ? 0.95 : 0.55) + ')';
        ctx.strokeRect(t.x0, t.z0, t.x1 - t.x0, t.z1 - t.z0);
      }
      drawBox(mb, { night: night, alpha: mover.fade });
    }
    pieces.forEach(function (pc) { if (pc.front) drawPiece(pc, night); });

    // perfect ripples
    ripples.forEach(function (r) {
      if (r.t < 0) return;
      var k = r.t / 0.7, e = 4 + K.ease.outCubic(k) * 30;
      plane(null, 1, 0.5, -1, 0.5, 0, -r.y);
      ctx.lineWidth = (3 - 2 * k) / s; ctx.strokeStyle = 'rgba(255,240,190,' + (1 - k) + ')';
      ctx.strokeRect(r.x0 - e, r.z0 - e, r.x1 - r.x0 + 2 * e, r.z1 - r.z0 + 2 * e);
    });

    V.ay = ay0; V.cx = cx0;
    ctx.setTransform(D, 0, 0, D, 0, fxOff() * D);
    K.fx.draw(ctx);

    // level banner
    if (bannerT > 0) {
      var k2 = Math.min(1, bannerT / 0.4, (2.4 - bannerT) / 0.3), cy = Math.max(118, G.h * 0.21), cx = G.w / 2, big = Math.min(70, G.w * 0.14);
      ctx.setTransform(D, 0, 0, D, 0, 0);
      ctx.globalAlpha = Math.max(0, k2);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(10,6,30,.55)';
      var top1 = mode === 'free' ? 'BUILD AS HIGH AS YOU CAN' : LV.worlds[world].name.toUpperCase();
      var mid1 = mode === 'free' ? 'Free Build' : 'Level ' + level;
      var bot1 = mode === 'free' ? (best ? 'Best: ' + best + ' blocks' : 'Stack the tallest tower!') : 'Stack ' + cfg.goal + ' blocks';
      ctx.font = '800 ' + Math.round(big * 0.34) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = big * 0.1;
      ctx.strokeText(top1, cx, cy - big * 0.78); ctx.fillStyle = mode === 'free' ? '#ffd36b' : LV.worlds[world].color; ctx.fillText(top1, cx, cy - big * 0.78);
      ctx.font = '900 ' + Math.round(big) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = big * 0.16;
      ctx.strokeText(mid1, cx, cy); ctx.fillStyle = '#fffaf0'; ctx.fillText(mid1, cx, cy);
      ctx.font = '800 ' + Math.round(big * 0.4) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = big * 0.1;
      ctx.strokeText(bot1, cx, cy + big * 0.8); ctx.fillStyle = 'rgba(255,250,240,.92)'; ctx.fillText(bot1, cx, cy + big * 0.8);
      ctx.globalAlpha = 1;
    }
  }

  K.loop({
    step: function (dt) { if (state !== 'idle') step(dt); },
    draw: function () { draw(); },
    hz: 120,
    onHidden: function () { if (state === 'play' && !DEBUG) pause(); }
  });

  // Test hook (only with ?debug in the URL): step the game by hand and inspect it.
  if (DEBUG) window.TB = {
    run: function (sec) { for (var i = 0; i < Math.round(sec * 120); i++) step(1 / 120); draw(); return window.TB.get(); },
    draw: function () { draw(); },
    start: function (n) { startLevel(n); }, free: function () { startFree(); }, tap: tap, pause: pause, levels: function () { openLevels(true); },
    // Step until the sliding block is within 1.6 units of `off` (0 = perfect), drop it and let it land.
    dropAt: function (off, maxSec) {
      var n = Math.round((maxSec || 10) * 120);
      for (var i = 0; i < n; i++) {
        if (state !== 'play') return false;
        if (mover && mover.phase === 'slide' && mover.fade >= 1 && Math.abs(mover.p - off) <= 1.6) {
          tap(); for (var j = 0; j < 40; j++) step(1 / 120);
          return true;
        }
        step(1 / 120);
      }
      return false;
    },
    get: function () {
      var t = layers.length ? top() : null;
      return { state: state, mode: mode, level: level, height: height(), goal: cfg ? cfg.goal : 0, hearts: hearts, streak: streak,
        perfects: perfects, drops: drops, best: best, stars: lastStars, tol: cfg ? cfg.tol : 0,
        width: t ? Math.round((t.x1 - t.x0) * 10) / 10 : 0, depth: t ? Math.round((t.z1 - t.z0) * 10) / 10 : 0,
        mover: mover ? { p: Math.round(mover.p * 10) / 10, A: Math.round(mover.A), axis: mover.axis, phase: mover.phase } : null,
        pieces: pieces.length, sky: Math.round(skyP() * 100) / 100, S: V.S, Z: V.Z, progress: progress.total() };
    },
    setAlt: function (a) { alt = a; },
    V: V
  };

  // Fonts load quickly from the local cache; start once they are ready so the banner text is crisp.
  var fontsReady = document.fonts && document.fonts.load ? document.fonts.load('900 40px Nunito') : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 700); })]).catch(function () {}).then(function () {
    startLevel(progress.current());
  });
})();
