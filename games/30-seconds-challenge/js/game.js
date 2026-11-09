/* Sharp Eyes: game.js
   A grid of the same picture with exactly one that is different: tap it! Short rounds, 30 levels in 3 worlds.
   Built on the shared kit (js/kit): full-screen stage, fixed-step loop, pointer input, fx, sfx, ui, progress.
   Game units are CSS pixels. */
(function () {
  'use strict';
  var K = window.Kit, I = window.SpotItems, A = window.SpotArt, LV = window.SPOT_LEVELS;
  var COUNT = LV.list.length, MAX_HEARTS = 3, MIN_PITCH = 52, MAX_PITCH = 168;
  var DEBUG = /[?&]debug\b/.test(location.search);
  var store = K.store('kahf-sharp-eyes'), progress = K.progress(store, COUNT);
  var canvas = document.getElementById('stage');

  // ---------- state ----------
  var level = 1, world = 0, def = null, phase = 'idle', paused = false, time = 0;
  var round = 0, found = 0, hearts = MAX_HEARTS, cells = [], odd = -1, pick = null, lastItem = '', lastKind = '';
  var timeLeft = 0, tickAt = 0, phaseT = 0, bannerT = 0, flyers = [], slotPop = [], ambient = [];
  var epoch = 0, hint = null, hinted = !!store.get('hinted', false), down = null;
  var G = { w: 0, h: 0, dpr: 1, safe: { top: 0, right: 0, bottom: 0, left: 0 }, pitch: 80, cols: 2, rows: 2, n: 4, gx: 0, gy: 0, slotsY: 40, slotsInHud: false };
  var bg = null, bgKey = '', spr = { base: null, odd: null, key: '' }, plates = {};

  var stage = K.stage(canvas, function (st) {
    G.w = st.w; G.h = st.h; G.dpr = st.dpr; G.safe = st.safe;
    bg = null; plates = {}; spr.key = '';
    if (def) layout();
  });
  var ctx = stage.ctx;

  // ---------- HUD ----------
  var pLevel = K.ui.pill(''), pHearts = K.ui.hearts(MAX_HEARTS);
  K.ui.spacer();
  var bPause = K.ui.iconButton('pause', 'Pause', function () { if (!paused && (phase === 'play' || phase === 'reveal' || phase === 'in' || phase === 'banner')) pause(); });
  function hud() {
    pLevel.set('<svg viewBox="-50 -50 100 100" style="width:18px;height:18px"><path d="M0-46 13-31 32-32 31-13 46 0 31 13 32 32 13 31 0 46-13 31-32 32-31 13-46 0-31-13-32-32-13-31Z" fill="' +
      A.WORLDS[world].color + '"/></svg>Level ' + level);
    pHearts.setLives(hearts);
  }

  // ---------- layout ----------
  // The grid fills the space below the HUD; columns x rows are chosen to give the biggest cells for this
  // screen shape (e.g. 36 = 6x6 on a phone, 9x4 on a landscape phone). Cells never go below MIN_PITCH:
  // on a very small screen the grid uses fewer pictures instead.
  var SIZES = [4, 6, 9, 12, 16, 20, 25, 30, 36];
  function pairs(n) { var out = []; for (var c = 1; c <= n; c++) if (n % c === 0) { var r = n / c; if (Math.max(c, r) / Math.min(c, r) <= 3.2) out.push([c, r]); } return out; }
  function fit(n, aw, ah) {
    var best = null;
    pairs(n).forEach(function (p) { var pitch = Math.min(aw / p[0], ah / p[1]); if (!best || pitch > best.pitch) best = { cols: p[0], rows: p[1], pitch: pitch }; });
    return best;
  }
  function measureHud() {
    var right = 0, left = G.w;
    try { right = pHearts.getBoundingClientRect().right; left = bPause.getBoundingClientRect().left; } catch (e) {}
    return { free: left - right - 16, cx: (right + left) / 2, bottom: (bPause.getBoundingClientRect().bottom || (G.safe.top + 56)) };
  }
  function slotsWidth() { return (def ? def.rounds : 5) * 30 + (def && def.time ? 46 : 0); }
  function layout() {
    var hb = measureHud();
    G.slotsInHud = hb.free >= slotsWidth();
    G.slotsX = G.slotsInHud ? hb.cx : G.w / 2;
    G.slotsY = G.slotsInHud ? G.safe.top + 10 + 23 : hb.bottom + 22;
    var top = (G.slotsInHud ? hb.bottom : G.slotsY + 20) + 8, bottom = G.h - G.safe.bottom - 10;
    var left = G.safe.left + 10, right = G.w - G.safe.right - 10;
    var aw = right - left, ah = bottom - top, want = def.cells, n = want, f = null;
    for (var k = SIZES.length - 1; k >= 0; k--) {
      if (SIZES[k] > want) continue;
      f = fit(SIZES[k], aw, ah); n = SIZES[k];
      if (f.pitch >= MIN_PITCH) break;
    }
    G.n = n; G.cols = f.cols; G.rows = f.rows;
    G.pitch = Math.min(MAX_PITCH, f.pitch, Math.min(aw, ah) * (n <= 4 ? 0.42 : 0.5));
    G.pitch = Math.max(G.pitch, Math.min(f.pitch, MIN_PITCH));
    G.gx = left + (aw - G.pitch * G.cols) / 2; G.gy = top + (ah - G.pitch * G.rows) / 2;
    if (cells.length && cells.length !== G.n) { // the screen turned and fewer/more pictures fit: same picture, fresh grid
      var keepOdd = odd; newCells(); odd = Math.min(keepOdd, G.n - 1); cells.forEach(function (c) { c.enter = 1; });
    }
    cells.forEach(function (c) { c.col = c.i % G.cols; c.row = Math.floor(c.i / G.cols); placeCell(c); });
  }
  function placeCell(c) { c.x = G.gx + (c.col + 0.5) * G.pitch; c.y = G.gy + (c.row + 0.5) * G.pitch; }

  // ---------- rounds ----------
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  // Pick a picture and a measured difference whose difficulty fits the level (never below SpotItems.MIN_SCORE).
  function choose() {
    var d0 = def.d[0], d1 = def.d[1], best = null, bestGap = Infinity;
    var ids = shuffle(def.pool.filter(function (id) { return id !== lastItem; }));
    for (var k = 0; k < ids.length; k++) {
      var item = I.byId[ids[k]], color = item.colors[(Math.random() * item.colors.length) | 0];
      var opts = I.usable(item, color).filter(function (o) { return o.ok; });
      var fitting = opts.filter(function (o) { return o.d >= d0 && o.d <= d1; });
      var fresh = fitting.filter(function (o) { return o.kind !== lastKind; });
      if (fresh.length) fitting = fresh;
      if (fitting.length) { var o = fitting[(Math.random() * fitting.length) | 0]; return { item: item, base: o.base, odd: o.v, kind: o.kind, score: o.score, d: o.d, label: o.label }; }
      opts.forEach(function (o2) { var gap = o2.d < d0 ? d0 - o2.d : o2.d - d1; if (gap < bestGap) { bestGap = gap; best = { item: item, base: o2.base, odd: o2.v, kind: o2.kind, score: o2.score, d: o2.d, label: o2.label }; } });
    }
    return best;
  }
  function newCells() {
    cells = [];
    for (var i = 0; i < G.n; i++) {
      var c = { i: i, col: i % G.cols, row: Math.floor(i / G.cols), x: 0, y: 0, enter: 0, out: -1, pop: -1, wob: 0, press: 0, flash: 0, gone: false };
      placeCell(c); cells.push(c);
    }
  }
  function newRound() {
    pick = choose(); lastItem = pick.item.id; lastKind = pick.kind;
    newCells();
    odd = (Math.random() * G.n) | 0;
    var cx = (G.cols - 1) / 2, cy = (G.rows - 1) / 2;
    cells.forEach(function (c) { c.enter = -(Math.hypot(c.col - cx, c.row - cy) * 0.06 + Math.random() * 0.03); });
    spr.key = '';
    timeLeft = def.time; tickAt = 3;
    phase = 'in'; phaseT = 0;
    K.sfx.play('shuffle');
  }
  function startLevel(n) {
    level = K.clamp(n, 1, COUNT); world = LV.worldOf(level); def = LV.list[level - 1];
    progress.setCurrent(level); epoch++;
    round = 0; found = 0; hearts = MAX_HEARTS; flyers = []; slotPop = []; lastKind = ''; paused = false; down = null;
    K.fx.clear();
    cells = []; layout();
    makeAmbient();
    hud();
    phase = 'banner'; bannerT = 1.5; phaseT = 0;
    if (hint && level !== 1) { hint.hide(); hint = null; }
    if (!hinted && level === 1 && !hint) hint = K.ui.hint('Tap the one that is different!', Math.max(14, (G.h - G.gy - G.rows * G.pitch) / 2 - 24), true);
  }

  // ---------- input ----------
  function cellAt(x, y) {
    var col = Math.floor((x - G.gx) / G.pitch), row = Math.floor((y - G.gy) / G.pitch);
    if (col < 0 || row < 0 || col >= G.cols || row >= G.rows) return null;
    return cells[row * G.cols + col] || null;
  }
  K.pointer(canvas, function (x, y) { return { x: x, y: y }; }, {
    down: function (p) {
      if (paused || (phase !== 'play' && phase !== 'reveal')) return;
      var c = cellAt(p.x, p.y); if (!c || c.gone) return;
      down = { c: c, x: p.x, y: p.y }; c.press = 1; K.sfx.play('press');
    },
    up: function (p) {
      var d = down; down = null; if (!d) return;
      d.c.press = 0;
      if (paused || (phase !== 'play' && phase !== 'reveal')) return;
      if (Math.hypot(p.x - d.x, p.y - d.y) > G.pitch * 0.75) return; // a drag away cancels the tap
      choosePic(d.c);
    }
  });
  addEventListener('keydown', function (e) { if ((e.key === 'Escape' || e.key === 'p') && !paused && phase !== 'clear' && phase !== 'fail') pause(); });

  var CHEERS = ['Found it!', 'Great!', 'Sharp eyes!', 'Super!', 'Yes!', 'MashaAllah!'];
  function choosePic(c) {
    K.bridge.answer();
    if (c.i === odd) {
      phase = 'out'; phaseT = 0; found++; round++;
      c.pop = 0; c.flash = 1;
      K.sfx.play('found', { n: found }); K.buzz(12);
      K.fx.burst(c.x, c.y, { n: 18, colors: ['#ffd36b', '#ffffff', '#ff9fb4', '#8fe0ff'], speed: 340, size: 12, life: 0.8, shape: 'star', gravity: 260 });
      K.fx.text(c.x, c.y - G.pitch * 0.45, CHEERS[(Math.random() * CHEERS.length) | 0], { size: Math.max(26, Math.min(44, G.pitch * 0.38)), color: '#fff6c2', stroke: 'rgba(60,20,80,.65)' });
      var sp = slotPos(found - 1);
      K.sfx.play('fly');
      flyers.push({ x0: c.x, y0: c.y, x1: sp.x, y1: sp.y, t: 0, dur: 0.75, slot: found - 1 });
      cells.forEach(function (o) { if (o !== c) o.out = -(0.25 + Math.hypot(o.col - c.col, o.row - c.row) * 0.05); });
      if (hint) { hint.hide(); hint = null; hinted = true; store.set('hinted', true); }
    } else {
      if (c.wob > 0.5) return; // still wobbling from the last tap: no double cost
      c.wob = 1; c.flash = 1;
      K.sfx.play('bonk'); K.buzz(30);
      if (phase === 'reveal') return; // the answer is already shown: no more cost
      hearts--; hud(); pHearts.bump();
      if (def.time) timeLeft = Math.max(0, timeLeft - 1);
      K.fx.text(c.x, c.y - G.pitch * 0.3, hearts > 0 ? 'Look again!' : 'Oh no!', { size: Math.max(22, Math.min(36, G.pitch * 0.3)), color: '#ffd1dc', stroke: 'rgba(60,10,30,.6)', rise: 50 });
      if (hearts <= 0) fail();
    }
  }
  function timeUp() {
    hearts--; hud(); pHearts.bump();
    K.sfx.play('reveal'); K.buzz(30);
    if (hearts <= 0) { fail(); return; }
    phase = 'reveal'; phaseT = 0;
    var c = cells[odd];
    K.fx.text(c.x, c.y - G.pitch * 0.55, 'Here it is!', { size: Math.max(24, Math.min(40, G.pitch * 0.34)), color: '#fff6c2', stroke: 'rgba(60,20,80,.65)', life: 1.6 });
  }
  function fail() {
    phase = 'fail';
    setTimeout(function () { K.sfx.play('fail'); }, 350);
    var c = cells[odd]; if (c) c.flash = 1;
    var ep = epoch;
    setTimeout(function () {
      if (ep !== epoch) return; // a new level started meanwhile
      K.ui.sheet({ title: 'Out of hearts', text: "Let's look again, slowly!", buttons: [
        { label: 'Try Again', icon: 'restart', primary: true, onClick: function () { startLevel(level); } },
        { label: 'Levels', icon: 'levels', onClick: openLevels }] });
    }, 1100);
  }
  function clearLevel() {
    phase = 'clear';
    var stars = Math.max(1, hearts);
    progress.finish(level, stars);
    K.bridge.complete();
    K.sfx.play('win');
    for (var i = 0; i < 5; i++) setTimeout(function () {
      if (phase !== 'clear') return;
      K.fx.burst(K.rand(G.w * 0.2, G.w * 0.8), K.rand(G.h * 0.25, G.h * 0.6), { n: 22, colors: ['#ffd36b', '#ff8fab', '#7ae7ff', '#ffffff'], speed: 440, size: 15, life: 1.2, shape: 'star', gravity: 480 });
    }, i * 150);
    var last = level === COUNT, endOfWorld = level % 10 === 0, ep = epoch;
    setTimeout(function () {
      if (ep !== epoch) return;
      var buttons = [];
      if (!last) buttons.push({ label: endOfWorld ? 'Next World' : 'Next Level', icon: 'next', primary: true, onClick: function () { startLevel(level + 1); } });
      buttons.push({ label: last ? 'Play Again' : 'Replay', icon: 'restart', row: true, primary: last, onClick: function () { startLevel(last ? 1 : level); } });
      buttons.push({ label: 'Levels', icon: 'levels', row: true, onClick: openLevels });
      K.ui.sheet({ title: last ? 'You did it!' : endOfWorld ? A.WORLDS[world].name + ' done!' : 'Well spotted!',
        text: last ? 'All 30 levels. What sharp eyes, MashaAllah!' : 'You found all ' + def.rounds + '!', stars: stars, buttons: buttons });
    }, 1200);
  }
  function pause() {
    paused = true;
    K.ui.sheet({ title: 'Paused', text: A.WORLDS[world].name + ' · Level ' + level, buttons: [
      { label: 'Resume', icon: 'play', primary: true, onClick: resume },
      { label: 'Restart', icon: 'restart', row: true, onClick: function () { startLevel(level); } },
      { label: 'Levels', icon: 'levels', row: true, onClick: openLevels },
      { label: K.sfx.muted ? 'Sound: Off' : 'Sound: On', icon: K.sfx.muted ? 'soundOff' : 'sound', onClick: function () { K.sfx.toggle(); pause(); } }] });
  }
  function resume() { paused = false; }
  function openLevels() {
    paused = true;
    K.ui.levelSelect({
      title: 'Sharp Eyes',
      worlds: A.WORLDS.map(function (w, i) { return { name: w.name, color: w.color, from: i * 10 + 1, to: i * 10 + 10 }; }),
      progress: progress, current: level,
      onPick: function (n) { startLevel(n); },
      onClose: function () { if (phase === 'clear' || phase === 'fail') startLevel(level); else paused = false; }
    });
  }

  // ---------- simulation ----------
  function slotPos(i) {
    var n = def.rounds, w = n * 30, x0 = G.slotsX - w / 2 + (def.time ? 23 : 0);
    return { x: x0 + 15 + i * 30, y: G.slotsY };
  }
  function makeAmbient() {
    ambient = [];
    for (var i = 0; i < 18; i++) ambient.push({ x: Math.random(), y: Math.random(), v: 0.4 + Math.random() * 0.6, ph: Math.random() * 6.28, s: 0.6 + Math.random() * 0.8 });
  }
  function step(dt) {
    time += dt;
    K.fx.update(dt);
    ambient.forEach(function (a) { a.ph += dt; a.y -= dt * 0.01 * a.v; if (a.y < -0.05) a.y = 1.05; a.x += Math.sin(a.ph * 0.7) * dt * 0.008; });
    for (var f = flyers.length - 1; f >= 0; f--) {
      var fl = flyers[f]; fl.t += dt;
      if (fl.t >= fl.dur) { flyers.splice(f, 1); slotPop[fl.slot] = 1; K.sfx.play('land');
        K.fx.burst(fl.x1, fl.y1, { n: 10, color: '#ffe08a', speed: 160, size: 8, life: 0.5, shape: 'star', gravity: 120 }); }
    }
    for (var s = 0; s < slotPop.length; s++) if (slotPop[s] > 0) slotPop[s] = Math.max(0, slotPop[s] - dt * 2.5);
    cells.forEach(function (c) {
      c.wob = Math.max(0, c.wob - dt * 1.8); c.flash = Math.max(0, c.flash - dt * 1.6);
      if (c.enter < 1) c.enter += dt;
      if (c.out > -1 && c.out < 1) c.out += dt;
      if (c.pop >= 0) c.pop += dt;
    });
    if (bannerT > 0) bannerT -= dt;
    if (paused) return;
    phaseT += dt;
    if (phase === 'banner' && bannerT < 0.6) newRound();
    else if (phase === 'in' && phaseT > 0.45) phase = 'play';
    else if (phase === 'play' && def.time) {
      timeLeft -= dt;
      if (timeLeft <= tickAt && tickAt > 0) { K.sfx.play('tick'); tickAt -= 1; }
      if (timeLeft <= 0) { timeLeft = 0; timeUp(); }
    } else if (phase === 'out' && phaseT > 1.0 && !flyers.length) {
      if (found >= def.rounds) clearLevel(); else newRound();
    }
  }

  // ---------- drawing ----------
  function ensureArt() {
    var key = world + '|' + G.w + 'x' + G.h + '@' + G.dpr;
    if (!bg || bgKey !== key) { bg = A.paintWorld(world, G.w, G.h, G.dpr); bgKey = key; plates = {}; }
    var skey = pick ? pick.item.id + '|' + pick.label + '|' + pick.base.c + '|' + Math.round(G.pitch) : '';
    if (pick && spr.key !== skey) {
      var px = G.pitch * 0.74 * 1.2 * G.dpr;
      spr.base = I.sprite(pick.item, pick.base, px); spr.odd = I.sprite(pick.item, pick.odd, px); spr.key = skey;
    }
  }
  function plate(state) {
    var px = Math.round(G.pitch * 0.9 * G.dpr), k = (state || 'n') + px;
    return plates[k] || (plates[k] = A.plate(world, px, state));
  }
  var E = K.ease;
  function draw() {
    if (!def) return;
    ensureArt();
    var d = G.dpr, W = A.WORLDS[world], m = bg.margin, drift = K.reducedMotion ? 0 : Math.sin(time * 0.12);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg.sky, -m, 0);
    ctx.drawImage(bg.far, -m + drift * m * 0.3, 0);
    ctx.drawImage(bg.mid, -m + drift * m * 0.6, 0);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    // ambient life: pollen by day, fireflies in the garden, sparkles over the sea
    ambient.forEach(function (a, i) {
      var x = a.x * G.w, y = a.y * G.h, tw = 0.5 + 0.5 * Math.sin(a.ph * 2.2 + i);
      if (world === 1) { var gl = ctx.createRadialGradient(x, y, 0, x, y, 9 * a.s); gl.addColorStop(0, 'rgba(220,255,150,' + 0.85 * tw + ')'); gl.addColorStop(1, 'rgba(220,255,150,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, 9 * a.s, 0, 6.283); ctx.fill(); }
      else { ctx.globalAlpha = 0.3 + 0.5 * tw; ctx.fillStyle = world === 0 ? '#fffbe6' : '#ffe2b0'; ctx.beginPath(); ctx.arc(x, y, 1.8 * a.s, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; }
    });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg.near, -m + drift * m, 0);
    ctx.setTransform(d, 0, 0, d, 0, 0);

    var sh = K.fx.offset();
    ctx.translate(sh.x, sh.y);
    // soft focus glow behind the grid (no box: it fades into the scene)
    var gcx = G.gx + G.cols * G.pitch / 2, gcy = G.gy + G.rows * G.pitch / 2, gr = Math.hypot(G.cols, G.rows) * G.pitch * 0.62;
    var fg = ctx.createRadialGradient(gcx, gcy, gr * 0.2, gcx, gcy, gr); fg.addColorStop(0, W.focus); fg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fg; ctx.fillRect(gcx - gr, gcy - gr, gr * 2, gr * 2);

    drawSlots();
    drawCells();
    flyers.forEach(function (fl) {
      var u = E.inOutSine(Math.min(1, fl.t / fl.dur)), cx = (fl.x0 + fl.x1) / 2, cy = Math.min(fl.y0, fl.y1) - 80;
      var x = (1 - u) * (1 - u) * fl.x0 + 2 * (1 - u) * u * cx + u * u * fl.x1, y = (1 - u) * (1 - u) * fl.y0 + 2 * (1 - u) * u * cy + u * u * fl.y1;
      var r = K.lerp(Math.min(30, G.pitch * 0.3), 12, u);
      ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, 6.283); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(x, y); ctx.rotate(u * 6); A.goldStar(ctx, 0, 0, r, true); ctx.restore();
    });
    K.fx.draw(ctx);
    ctx.setTransform(d, 0, 0, d, 0, 0);

    if (bannerT > 0) {
      var k = Math.max(0, Math.min(1, bannerT / 0.4, (1.5 - bannerT) / 0.3)), by = G.gy + G.rows * G.pitch / 2;
      var big = Math.min(76, G.w * 0.16);
      ctx.globalAlpha = k; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.font = '800 ' + Math.round(big * 0.38) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(20,10,40,.55)';
      ctx.strokeText(W.name.toUpperCase(), G.w / 2, by - big * 0.75); ctx.fillStyle = W.color; ctx.fillText(W.name.toUpperCase(), G.w / 2, by - big * 0.75);
      ctx.font = '900 ' + Math.round(big) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = 12;
      ctx.strokeText('Level ' + level, G.w / 2, by); ctx.fillStyle = '#fffaf0'; ctx.fillText('Level ' + level, G.w / 2, by);
      ctx.font = '800 ' + Math.round(big * 0.36) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = 6;
      var sub = 'Find ' + def.rounds + ' odd ones' + (def.time ? '' : ', take your time');
      ctx.strokeText(sub, G.w / 2, by + big * 0.72); ctx.fillStyle = 'rgba(255,250,240,.92)'; ctx.fillText(sub, G.w / 2, by + big * 0.72);
      ctx.globalAlpha = 1;
    }
  }
  function drawSlots() {
    for (var i = 0; i < def.rounds; i++) {
      var p = slotPos(i), pop = slotPop[i] || 0, r = 11 * (1 + pop * 0.5);
      if (i === 0) { // a soft pill behind the row so it reads on any sky
        var w = def.rounds * 30 + (def.time ? 46 : 0) + 14; ctx.fillStyle = 'rgba(14,10,34,.4)'; A.rr(ctx, G.slotsX - w / 2, G.slotsY - 19, w, 38, 19); ctx.fill();
      }
      A.goldStar(ctx, p.x, p.y, r, i < found && !flyers.some(function (f) { return f.slot === i; }));
    }
    if (def.time) {
      var rx = slotPos(0).x - 34, ry = G.slotsY, frac = Math.max(0, timeLeft / def.time), low = timeLeft < 3.5 && phase === 'play';
      var pr = 15 * (low ? 1 + 0.08 * Math.sin(time * 12) : 1);
      ctx.beginPath(); ctx.arc(rx, ry, pr, 0, 6.283); ctx.fillStyle = 'rgba(14,10,34,.55)'; ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(rx, ry, pr, -Math.PI / 2, -Math.PI / 2 + frac * 6.283);
      ctx.strokeStyle = low ? '#ff9f6b' : '#8fe0a0'; ctx.lineCap = 'round'; ctx.stroke();
      ctx.fillStyle = low ? '#ffcf9a' : '#e8fff0'; ctx.beginPath(); ctx.arc(rx, ry, 4, 0, 6.283); ctx.fill(); // a sun-dot in the middle
    }
  }
  function drawCells() {
    if (!spr.base || phase === 'banner') return;
    var P = G.pitch, ip = P * 0.74 * 1.2, cols = G.cols;
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      var e = c.enter <= 0 ? 0 : E.outBack(Math.min(1, c.enter / 0.42)), sc = e, a = Math.min(1, Math.max(0, c.enter / 0.2));
      if (c.out > 0) { var o = Math.min(1, c.out / 0.35); sc *= 1 - E.inQuad(o); a *= 1 - o; }
      if (c.pop >= 0) { var u = Math.min(1, c.pop / 0.55); sc *= u < 0.3 ? 1 + 0.3 * E.outQuad(u / 0.3) : (1.3 - 1.3 * E.inQuad((u - 0.3) / 0.7)); a *= u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4; }
      if (sc <= 0.01 || a <= 0.01) continue;
      // idle breathing: the same for every picture (a slow wave across the grid), so motion never gives the answer away
      var br = K.reducedMotion ? 0 : Math.sin(time * 2.4 - (c.col + c.row * 0.7) * 0.6) * 0.025;
      var press = c.press ? 0.9 : 1, rot = Math.sin(c.wob * 22) * 0.22 * c.wob;
      var isOdd = c.i === odd, reveal = phase === 'reveal' && isOdd;
      var pstate = (c.flash > 0 && c.pop >= 0) || (phase === 'fail' && isOdd) ? 'right' : (c.flash > 0 && c.wob > 0 ? 'wrong' : null);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(c.x, c.y); ctx.rotate(rot);
      ctx.scale(sc * press, sc * (press === 1 ? 1 : 0.94));
      var pl = plate(null), ps = P * 0.9, pad = ps * pl.pad / (pl.width - pl.pad * 2);
      ctx.drawImage(pl, -ps / 2 - pad, -ps / 2 - pad, ps + pad * 2, ps + pad * 2);
      if (pstate) { var pl2 = plate(pstate); ctx.globalAlpha = a * Math.min(1, c.flash * 1.5 + (phase === 'fail' ? 1 : 0)); ctx.drawImage(pl2, -ps / 2 - pad, -ps / 2 - pad, ps + pad * 2, ps + pad * 2); ctx.globalAlpha = a; }
      if (reveal) {
        var pulse = 0.5 + 0.5 * Math.sin(time * 6);
        ctx.lineWidth = 4 + pulse * 3; ctx.strokeStyle = 'rgba(255,214,107,' + (0.6 + pulse * 0.4) + ')';
        A.rr(ctx, -ps / 2 - 3, -ps / 2 - 3, ps + 6, ps + 6, ps * 0.26); ctx.stroke();
      }
      ctx.scale(1 + br, 1 - br * 0.6);
      ctx.translate(0, -br * P * 0.4);
      ctx.drawImage(isOdd ? spr.odd : spr.base, -ip / 2, -ip / 2, ip, ip);
      ctx.restore();
    }
  }

  K.loop({ step: step, draw: draw, hz: 120, onHidden: function () { if (!DEBUG && !paused && phase !== 'clear' && phase !== 'fail' && def) pause(); } });

  // Test hook (only with ?debug in the URL): step the game by hand and inspect it.
  if (DEBUG) window.SE = {
    run: function (sec) { for (var i = 0; i < Math.round(sec * 120); i++) step(1 / 120); draw(); },
    start: startLevel, pause: pause,
    get: function () { return { phase: phase, paused: paused, level: level, world: world, found: found, rounds: def.rounds, hearts: hearts, odd: odd,
      n: G.n, cols: G.cols, rows: G.rows, pitch: Math.round(G.pitch), timeLeft: timeLeft, slotsInHud: G.slotsInHud,
      pick: pick && { item: pick.item.id, kind: pick.kind, label: pick.label, score: +pick.score.toFixed(3), d: +pick.d.toFixed(2) },
      cells: cells.map(function (c) { return [Math.round(c.x), Math.round(c.y)]; }), stars: progress.stars(level) }; },
    tap: function (i) { choosePic(cells[i]); },
    // Every item x colour x difference: measured scores, so the visibility rule can be checked in one call.
    validate: function () {
      var rep = { total: 0, usable: 0, rejected: 0, byKind: {}, minUsed: 1, items: {} };
      I.LIST.forEach(function (it) {
        var u = 0;
        it.colors.forEach(function (col) { I.usable(it, col).forEach(function (o) {
          rep.total++; var k = rep.byKind[o.kind] || (rep.byKind[o.kind] = { ok: 0, no: 0 });
          if (o.ok) { rep.usable++; u++; k.ok++; rep.minUsed = Math.min(rep.minUsed, o.score); } else { rep.rejected++; k.no++; }
        }); });
        rep.items[it.id] = u;
      });
      return rep;
    },
    G: G
  };

  var fontsReady = document.fonts && document.fonts.load ? document.fonts.load('900 40px Nunito') : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 700); })]).catch(function () {}).then(function () {
    startLevel(progress.current());
  });
})();
