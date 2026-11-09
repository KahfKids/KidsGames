/* Memory Match: game.js
   Turn two cards, find the same animal! 24 levels in 4 worlds, no timer. Each pair found lifts and glows, the
   animal comes alive for a moment and its name is shown (and spoken) with the surah it is linked to.
   Built on the shared kit (js/kit): full-screen stage, fixed-step loop, pointer input, fx, sfx, ui, progress.
   Game units are CSS pixels. */
(function () {
  'use strict';
  var K = window.Kit, M = window.MMAnimals, A = window.MMArt, LV = window.MM_LEVELS, E = K.ease;
  var COUNT = LV.list.length, PER = LV.PER;
  var DEBUG = /[?&]debug\b/.test(location.search);
  var store = K.store('kahf-memory-match'), progress = K.progress(store, COUNT);
  var canvas = document.getElementById('stage');
  var FLIP = 0.3; // seconds for a card to turn over

  // ---------- state ----------
  var level = 1, world = 0, def = null, phase = 'idle', paused = false, time = 0, phaseT = 0, bannerT = 0;
  var cards = [], open = [], pending = null, backTimer = null, timers = [], found = 0, misses = 0, epoch = 0;
  var caption = null, ambient = [], hint = null, hinted = !!store.get('hinted', false), down = null;
  var album = store.get('found', []);
  var G = { w: 0, h: 0, dpr: 1, safe: { top: 0, right: 0, bottom: 0, left: 0 }, cols: 2, rows: 2, cw: 100, ch: 130, px: 110, py: 140, gx: 0, gy: 0, capY: 0, capH: 44, deckX: 0, deckY: 0 };
  var bg = null, bgKey = '', art = { key: '', back: null, faces: {}, spr: {}, shadow: null, glow: null }, live = {};

  var stage = K.stage(canvas, function (st) {
    G.w = st.w; G.h = st.h; G.dpr = st.dpr; G.safe = st.safe;
    bg = null;
    if (def) layout();
  });
  var ctx = stage.ctx;

  // ---------- HUD ----------
  var PAW = '<svg viewBox="0 0 24 24" fill="currentColor"><ellipse cx="6" cy="10" rx="2.1" ry="2.7" transform="rotate(-18 6 10)"/><ellipse cx="10" cy="6.2" rx="2.2" ry="2.8" transform="rotate(-6 10 6.2)"/><ellipse cx="14.4" cy="6.2" rx="2.2" ry="2.8" transform="rotate(6 14.4 6.2)"/><ellipse cx="18.4" cy="10" rx="2.1" ry="2.7" transform="rotate(18 18.4 10)"/><path d="M12.2 11.2c-2.6 0-5.6 3.4-5.6 6 0 1.8 1.4 2.6 2.9 2.6 1.1 0 1.8-.5 2.7-.5s1.6.5 2.7.5c1.5 0 2.9-.8 2.9-2.6 0-2.6-3-6-5.6-6z"/></svg>';
  var CARD = '<svg viewBox="0 0 24 24" style="width:20px;height:20px"><rect x="3" y="5" width="11" height="15" rx="2.5" fill="#f2d39a" stroke="#7a4a12" stroke-width="1.4" transform="rotate(-10 8.5 12.5)"/><rect x="10" y="4" width="11" height="15" rx="2.5" fill="#fffaf0" stroke="#7a4a12" stroke-width="1.4" transform="rotate(8 15.5 11.5)"/><path d="M15.6 8.6l1 2 2.2.3-1.6 1.5.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.5 2.2-.3z" fill="#f6c453" transform="rotate(8 15.5 11.5)"/></svg>';
  var pLevel = K.ui.pill(''), pPairs = K.ui.pill('');
  K.ui.spacer();
  var bAlbum = K.ui.iconButton(PAW, 'My animals', function () { if (!paused && phase !== 'clear') openAlbum(true); });
  var bPause = K.ui.iconButton('pause', 'Pause', function () { if (!paused && phase !== 'clear') pause(); });
  function hud() {
    pLevel.set('<svg viewBox="-50 -50 100 100" style="width:18px;height:18px"><path d="M0-46 13-31 32-32 31-13 46 0 31 13 32 32 13 31 0 46-13 31-32 32-31 13-46 0-31-13-32-32-13-31Z" fill="' +
      A.WORLDS[world].color + '"/></svg>Level ' + level);
    pPairs.set(CARD + found + ' / ' + (def ? def.pairs : 0));
  }

  // ---------- layout: the biggest cards this screen shape allows ----------
  // Every grid shape that holds n cards (the last row may be part-filled; it is centred).
  function shapes(n) { var o = []; for (var c = 1; c <= n; c++) { var r = Math.ceil(n / c); if (c * (r - 1) >= n) continue; if (Math.max(c, r) / Math.min(c, r) <= 5) o.push([c, r]); } return o; }
  function fitGrid(n, aw, ah) {
    var best = null, MAXH = Math.min(320, Math.max(G.w, G.h) * 0.36);
    shapes(n).forEach(function (p) {
      var cellW = aw / p[0], cellH = ah / p[1], w = cellW * 0.9, h = cellH * 0.9;
      if (w / h > 0.92) w = h * 0.92;
      if (w / h < 0.66) h = w / 0.66;
      if (h > MAXH) { w *= MAXH / h; h = MAXH; }
      var score = w * h * (h > cellH ? 0.01 : 1) * Math.pow(0.96, p[0] * p[1] - n) * (Math.max(p[0], p[1]) / Math.min(p[0], p[1]) > 3 ? 0.85 : 1);
      if (!best || score > best.score) best = { c: p[0], r: p[1], w: w, h: h, cellW: cellW, cellH: cellH, score: score };
    });
    return best;
  }
  function layout() {
    var hb = 56 + G.safe.top;
    try { var rb = bPause.getBoundingClientRect(); if (rb.bottom > 0) hb = rb.bottom; } catch (e) {}
    G.capH = Math.round(K.clamp(G.h * 0.07, 38, 54));
    var top = hb + 8, bottom = G.h - G.safe.bottom - G.capH - 8;
    var left = G.safe.left + 10, right = G.w - G.safe.right - 10, aw = right - left, ah = bottom - top, n = def.pairs * 2;
    var best = fitGrid(n, aw, ah);
    // a matched card lifts and grows: keep room for that under the HUD
    var room = ah - best.r * Math.min(best.cellH, best.h * 1.1 + 6), need = best.h * 0.14;
    if (room < need * 2) { top += need - room / 2; ah -= need - room / 2; best = fitGrid(n, aw, ah); }
    G.cols = best.c; G.rows = best.r; G.n = n; G.cw = Math.floor(best.w); G.ch = Math.floor(best.h);
    G.px = Math.min(best.cellW, G.cw * 1.14 + 6); G.py = Math.min(best.cellH, G.ch * 1.1 + 6);
    G.gx = left + (aw - G.px * G.cols) / 2; G.gy = top + (ah - G.py * G.rows) / 2;
    G.capY = Math.min(G.h - G.safe.bottom - G.capH / 2 - 6, G.gy + G.py * G.rows + G.capH / 2 + 4);
    G.deckX = G.w / 2; G.deckY = G.h + G.ch;
    cards.forEach(place);
  }
  function place(c) {
    var col = c.slot % G.cols, row = Math.floor(c.slot / G.cols), inRow = Math.min(G.cols, G.n - row * G.cols);
    c.tx = G.gx + (col + 0.5 + (G.cols - inRow) / 2) * G.px; c.ty = G.gy + (row + 0.5) * G.py;
  }

  // ---------- art caches ----------
  function ensureArt() {
    var bk = world + '|' + G.w + 'x' + G.h + '@' + G.dpr;
    if (!bg || bgKey !== bk) { bg = A.paintWorld(world, G.w, G.h, G.dpr); bgKey = bk; }
    var key = world + '|' + G.cw + 'x' + G.ch + '@' + G.dpr;
    if (art.key !== key) {
      var w = Math.round(G.cw * G.dpr), h = Math.round(G.ch * G.dpr);
      art = { key: key, back: A.cardBack(world, w, h), faces: {}, spr: {}, rest: {}, shadow: A.shadow(w, h), glow: A.glow(Math.round(Math.max(w, h) * 1.9)) };
      live = {};
    }
  }
  function face(c) { var k = c.id + (c.matched ? '*' : ''); return art.faces[k] || (art.faces[k] = A.cardFace(c.a, Math.round(G.cw * G.dpr), Math.round(G.ch * G.dpr), c.matched)); }
  function sprite(c) {
    if (art.spr[c.id]) return art.spr[c.id];
    var b = A.animalBox(G.cw, G.ch), cv = document.createElement('canvas'); cv.width = cv.height = Math.round(b.s * G.dpr);
    return (art.spr[c.id] = M.render(cv, c.a, null));
  }
  function liveSprite(c, m) { // a canvas re-drawn every frame while the animal is moving
    // Both cards of a matched pair animate in lockstep (same animal, same clock), so they share one canvas per animal and
    // the second card reuses the frame the first one just drew instead of painting the same paper animal again.
    var b = A.animalBox(G.cw, G.ch), s = Math.round(b.s * G.dpr), cv = live[c.id];
    if (!cv || cv.width !== s) { cv = live[c.id] = document.createElement('canvas'); cv.width = cv.height = s; cv.t = null; }
    if (cv.t === m.t && cv.k === m.k) return cv;
    cv.t = m.t; cv.k = m.k; return M.render(cv, c.a, m);
  }

  // ---------- levels ----------
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pickAnimals() {
    var pool = (def.pool || M.LIST.map(function (a) { return a.id; })).slice(), out = [];
    // look-alike twins first (fair, but they make you look closely)
    shuffle(M.TWINS.slice()).forEach(function (tw) {
      if (out.length / 2 >= def.twins) return;
      if (pool.indexOf(tw[0]) >= 0 && pool.indexOf(tw[1]) >= 0 && out.length + 2 <= def.pairs) out.push(tw[0], tw[1]);
    });
    var fresh = shuffle(pool.filter(function (id) { return album.indexOf(id) < 0 && out.indexOf(id) < 0; }));
    var seen = shuffle(pool.filter(function (id) { return album.indexOf(id) >= 0 && out.indexOf(id) < 0; }));
    var take = fresh.slice(0, Math.max(1, Math.ceil(def.pairs * 0.5))).concat(seen, fresh.slice(Math.ceil(def.pairs * 0.5)));
    for (var i = 0; out.length < def.pairs && i < take.length; i++) if (out.indexOf(take[i]) < 0) out.push(take[i]);
    return out;
  }
  function startLevel(n) {
    level = K.clamp(n, 1, COUNT); world = LV.worldOf(level); def = LV.list[level - 1];
    progress.setCurrent(level); epoch++;
    timers = []; open = []; pending = null; backTimer = null; found = 0; misses = 0; caption = null; paused = false; down = null;
    K.fx.clear();
    var ids = pickAnimals(), deck = [];
    ids.forEach(function (id) { deck.push(id, id); });
    shuffle(deck);
    cards = deck.map(function (id, i) {
      return { i: i, slot: i, id: id, a: M.byId[id], x: 0, y: 0, tx: 0, ty: 0, f: 0, dir: 0, matched: false, lift: 0, press: 0, wob: 0, land: 0,
               enter: -1, anim: -1, hop: -1, rot: 0, tilt: (Math.random() - 0.5) * 0.5 };
    });
    layout();
    makeAmbient();
    hud();
    phase = 'banner'; bannerT = 1.4; phaseT = 0;
    if (hint && level !== 1) { hint.hide(); hint = null; }
  }
  function after(sec, fn) { var t = { t: sec, fn: fn, ep: epoch }; timers.push(t); return t; }
  function cancel(t) { if (t) t.fn = null; }

  function deal() {
    phase = 'deal'; phaseT = 0;
    var cx = (G.cols - 1) / 2, cy = (G.rows - 1) / 2;
    cards.forEach(function (c, k) { c.enter = -(k * 0.045 + Math.hypot((c.slot % G.cols) - cx, Math.floor(c.slot / G.cols) - cy) * 0.02); c.x = G.deckX; c.y = G.deckY; });
    K.sfx.play('deal');
    if (!hinted && level === 1 && !hint) hint = K.ui.hint('Find two the same!', Math.max(6, G.capH / 2 - 20), true);
  }
  function startPeek() {
    phase = 'peek'; phaseT = 0;
    var cx = (G.cols - 1) / 2;
    cards.forEach(function (c) { after(Math.abs((c.slot % G.cols) - cx) * 0.05, function () { c.dir = 1; }); });
    K.sfx.play('peek');
    after(FLIP + 0.15 + def.peek, function () {
      cards.forEach(function (c) { after(Math.abs((c.slot % G.cols) - cx) * 0.05, function () { c.dir = 0; }); });
      K.sfx.play('flipback');
      after(FLIP + 0.2, function () { phase = 'play'; phaseT = 0; });
    });
  }

  // ---------- play ----------
  function cardAt(x, y) {
    for (var i = cards.length - 1; i >= 0; i--) {
      var c = cards[i];
      if (Math.abs(x - c.tx) <= Math.max(G.cw / 2 + 3, 26) && Math.abs(y - c.ty) <= Math.max(G.ch / 2 + 3, 26)) return c;
    }
    return null;
  }
  function tapCard(c) {
    if (!c || paused || phase !== 'play') return false;
    if (c.matched) { c.wob = 0.35; return false; }
    if (c.dir === 1) { if (open.length < 2) c.wob = 0.4; return false; }
    if (pending) resolveNow();
    if (open.length >= 2) closeOpen();
    c.dir = 1; open.push(c);
    K.sfx.play('flip'); K.buzz(6);
    if (open.length === 2) { var a = open[0], b = open[1]; pending = after(FLIP + 0.04, function () { pending = null; resolve(a, b); }); pending.a = a; pending.b = b; }
    return true;
  }
  function resolveNow() { var p = pending; pending = null; cancel(p); resolve(p.a, p.b); }
  function resolve(a, b) {
    K.bridge.answer();
    if (a.id === b.id) {
      open = []; found++;
      [a, b].forEach(function (c) { c.matched = true; c.anim = 0; c.f = 1; });
      K.sfx.play('match', { n: found }); K.buzz(14);
      after(0.12, function () { K.sfx.play('cue_' + a.a.cue); });
      if (!DEBUG) after(0.45, function () { K.say.text(a.a.name, 'en'); });
      var colors = ['#ffd36b', '#ffffff', '#ffb38a', '#9fe6ff', '#b6f0a0'];
      [a, b].forEach(function (c) { K.fx.burst(c.tx, c.ty - G.ch * 0.1, { n: 16, colors: colors, speed: 300, size: Math.max(8, G.cw * 0.09), life: 0.9, shape: 'star', gravity: 300 }); });
      caption = { a: a.a, t: 0, life: 3.2 };
      if (album.indexOf(a.id) < 0) {
        album.push(a.id); store.set('found', album);
        caption.isNew = true;
        bAlbum.classList.remove('mm-new'); void bAlbum.offsetWidth; bAlbum.classList.add('mm-new');
      }
      pPairs.bump(); hud();
      if (hint) { hint.hide(); hint = null; hinted = true; store.set('hinted', true); }
      if (found >= def.pairs) after(1.6, clearLevel);
    } else {
      misses++;
      a.wob = b.wob = 1;
      K.sfx.play('puff'); K.buzz(20);
      backTimer = after(1.15, closeOpen);
    }
  }
  function closeOpen() {
    cancel(backTimer); backTimer = null;
    if (!open.length) return;
    open.forEach(function (c) { c.dir = 0; });
    open = [];
    K.sfx.play('flipback');
  }
  var PRAISE = ['mashaallah', 'mashaallah', 'mashaallah', 'barakallah', 'subhanallah'];
  function clearLevel() {
    phase = 'clear'; phaseT = 0;
    var stars = LV.stars(def.pairs, misses);
    progress.finish(level, stars);
    K.bridge.complete();
    K.sfx.play('win');
    if (!DEBUG) K.say.praise(PRAISE[(Math.random() * PRAISE.length) | 0]);
    var cx = (G.cols - 1) / 2;
    cards.forEach(function (c) { c.hop = -Math.abs((c.slot % G.cols) - cx) * 0.08 - Math.floor(c.slot / G.cols) * 0.05; });
    for (var i = 0; i < 6; i++) after(i * 0.14, function () {
      K.fx.burst(K.rand(G.w * 0.15, G.w * 0.85), K.rand(G.h * 0.2, G.h * 0.55), { n: 22, colors: ['#ffd36b', '#ff8fab', '#7ae7ff', '#ffffff', '#b6f0a0'], speed: 460, size: 13, life: 1.3, shape: i % 2 ? 'star' : 'shard', gravity: 520 });
    });
    var last = level === COUNT, endOfWorld = level % PER === 0, ep = epoch;
    setTimeout(function () {
      if (ep !== epoch) return;
      var buttons = [];
      if (!last) buttons.push({ label: endOfWorld ? 'Next World' : 'Next Level', icon: 'next', primary: true, onClick: function () { startLevel(level + 1); } });
      buttons.push({ label: last ? 'Play Again' : 'Replay', icon: 'restart', row: true, primary: last, onClick: function () { startLevel(last ? 1 : level); } });
      buttons.push({ label: 'Levels', icon: 'levels', row: true, onClick: openLevels });
      K.ui.sheet({ title: last ? 'You did it!' : endOfWorld ? A.WORLDS[world].name + ' done!' : 'MashaAllah!',
        text: last ? 'Every level! What a memory!' : 'You found all ' + def.pairs + ' pairs!', stars: stars, buttons: buttons });
    }, DEBUG ? 300 : 1900);
  }
  function pause() {
    paused = true;
    K.ui.sheet({ title: 'Paused', text: A.WORLDS[world].name + ' · Level ' + level, buttons: [
      { label: 'Resume', icon: 'play', primary: true, onClick: resume },
      { label: 'Restart', icon: 'restart', row: true, onClick: function () { startLevel(level); } },
      { label: 'Levels', icon: 'levels', row: true, onClick: openLevels },
      { label: 'My Animals', icon: PAW, onClick: function () { openAlbum(true); } },
      { label: K.sfx.muted ? 'Sound: Off' : 'Sound: On', icon: K.sfx.muted ? 'soundOff' : 'sound', onClick: function () { K.sfx.toggle(); pause(); } }] });
  }
  function resume() { paused = false; }
  function openLevels() {
    paused = true;
    var sh = K.ui.levelSelect({
      title: 'Memory Match',
      worlds: A.WORLDS.map(function (w, i) { return { name: w.name, color: w.color, from: i * PER + 1, to: i * PER + PER }; }),
      progress: progress, current: level,
      onPick: function (n) { startLevel(n); },
      onClose: function () { if (phase === 'clear') startLevel(level); else paused = false; }
    });
    sh.el.classList.add('mm-levels');
  }

  // ---------- "My Animals" album ----------
  function openAlbum(fromPlay) {
    paused = true;
    K.sfx.play('page');
    var wrap = document.createElement('div'); wrap.className = 'mm-album';
    var px = Math.round(84 * Math.min(2, G.dpr));
    M.LIST.forEach(function (a) {
      var got = album.indexOf(a.id) >= 0, tile = document.createElement(got ? 'button' : 'div');
      tile.className = 'mm-tile' + (got ? '' : ' locked');
      var cv = document.createElement('canvas'); cv.width = cv.height = px;
      var g = cv.getContext('2d');
      g.fillStyle = got ? a.bg : 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(px / 2, px / 2, px * 0.47, 0, 6.283); g.fill();
      var sp = document.createElement('canvas'); sp.width = sp.height = px;
      M.render(sp, a, null, got ? { pad: 0.08 } : { pad: 0.08, silhouette: '#efe2c8' });
      g.globalAlpha = got ? 1 : 0.2; g.drawImage(sp, 0, 0); g.globalAlpha = 1;
      tile.appendChild(cv);
      var nm = document.createElement('b'); nm.textContent = got ? a.name : '?'; tile.appendChild(nm);
      if (got && a.cap) { var cp = document.createElement('small'); cp.textContent = a.cap.replace(/-/g, '\u2011'); tile.appendChild(cp); }
      if (got) tile.addEventListener('click', function () { K.sfx.play('cue_' + a.cue); K.say.text(a.name, 'en'); tile.classList.remove('hop'); void tile.offsetWidth; tile.classList.add('hop'); });
      wrap.appendChild(tile);
    });
    var sh = K.ui.sheet({ title: 'My Animals', text: album.length + ' of ' + M.LIST.length + ' animals found', content: wrap, closeable: true,
      onClose: function () { if (fromPlay) paused = false; },
      buttons: [{ label: 'Play', icon: 'play', primary: true, onClick: function () { paused = false; } }] });
    sh.el.classList.add('mm-album-sheet');
  }

  // ---------- simulation ----------
  function makeAmbient() {
    ambient = [];
    var n = world === 2 ? 22 : world === 3 ? 26 : 20;
    for (var i = 0; i < n; i++) ambient.push({ x: Math.random(), y: Math.random(), v: 0.4 + Math.random() * 0.6, ph: Math.random() * 6.28, s: 0.6 + Math.random() * 0.8 });
  }
  function step(dt) {
    time += dt;
    K.fx.update(dt);
    ambient.forEach(function (a) {
      a.ph += dt;
      if (world === 2) { a.y -= dt * 0.03 * a.v; a.x += Math.sin(a.ph * 1.3) * dt * 0.006; }
      else if (world === 1) { a.y += dt * 0.022 * a.v; a.x += Math.sin(a.ph * 0.9) * dt * 0.02; }
      else if (world === 3) { a.x += Math.cos(a.ph * 0.5 + a.s * 4) * dt * 0.012; a.y += Math.sin(a.ph * 0.7 + a.v * 3) * dt * 0.01; }
      else { a.x += dt * 0.008 * a.v; a.y -= dt * 0.003; }
      if (a.y < -0.05) a.y = 1.05; if (a.y > 1.05) a.y = -0.05; if (a.x > 1.05) a.x = -0.05; if (a.x < -0.05) a.x = 1.05;
    });
    cards.forEach(function (c) {
      if (c.enter < 1) c.enter += dt / 0.55;
      var prev = c.f;
      if (c.dir === 1 && c.f < 1) { c.f = Math.min(1, c.f + dt / FLIP); if (c.f === 1) { c.land = 1; K.sfx.play('slap'); } }
      else if (c.dir === 0 && c.f > 0) { c.f = Math.max(0, c.f - dt / FLIP); if (c.f === 0 && prev > 0) c.land = 0.6; }
      c.land = Math.max(0, c.land - dt * 5);
      c.wob = Math.max(0, c.wob - dt * 1.6);
      if (!c.press) c.pressV = Math.max(0, (c.pressV || 0) - dt * 8); else c.pressV = Math.min(1, (c.pressV || 0) + dt * 14);
      if (c.anim >= 0) { c.anim += dt; if (c.anim > 2.6) c.anim = -1; }
      var target = c.anim >= 0 ? (c.anim < 2.0 ? 1 : 0.15) : 0;
      c.lift += (target - c.lift) * Math.min(1, dt * (target > c.lift ? 9 : 4));
      if (c.hop > -5 && phase === 'clear') c.hop += dt;
      if (c.enter >= 1) { c.x += (c.tx - c.x) * Math.min(1, dt * 12); c.y += (c.ty - c.y) * Math.min(1, dt * 12); }
    });
    if (caption) { caption.t += dt; if (caption.t > caption.life) caption = null; }
    if (bannerT > 0) bannerT -= dt;
    if (paused) return;
    for (var i = 0; i < timers.length; i++) { var t = timers[i]; t.t -= dt; }
    var due = timers.filter(function (t) { return t.t <= 0; });
    timers = timers.filter(function (t) { return t.t > 0 && t.fn; });
    due.forEach(function (t) { if (t.fn && t.ep === epoch) t.fn(); });
    phaseT += dt;
    if (phase === 'banner' && bannerT < 0.45) deal();
    else if (phase === 'deal' && cards.every(function (c) { return c.enter >= 1; }) && phaseT > 0.2) { if (def.peek > 0) startPeek(); else { phase = 'play'; phaseT = 0; } }
  }

  // ---------- drawing ----------
  // A firefly's glow (radius r, CSS px), rendered once at device resolution with the full-strength gradient; its twinkle
  // is applied as globalAlpha, which gives the same pixels as building the gradient with the twinkle baked in each frame.
  function fireflyGlow(r) {
    var k = 'ff' + r; if (art[k]) return art[k];
    var d = G.dpr, S = Math.ceil(r * 2 * d) + 2, c = document.createElement('canvas'); c.width = c.height = S;
    var g = c.getContext('2d'), q = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, r * d);
    q.addColorStop(0, 'rgba(255,236,150,0.9)'); q.addColorStop(1, 'rgba(255,236,150,0)');
    g.fillStyle = q; g.beginPath(); g.arc(S / 2, S / 2, r * d, 0, 6.283); g.fill();
    c.r = S / d / 2; return (art[k] = c);
  }
  // The soft spotlight behind the grid, rendered once per layout at device resolution (it was a big radial-gradient fill
  // every frame). Covers the screen plus a margin for screen shake; drawn 1:1 at whole device pixels.
  function focusGlow() {
    var key = world + '|' + G.w + 'x' + G.h + '@' + G.dpr + '|' + G.gx + ',' + G.gy + ',' + G.cols + 'x' + G.rows;
    if (art.focus && art.focus.key === key) return art.focus;
    var d = G.dpr, M = 24, c = document.createElement('canvas'); c.width = Math.ceil((G.w + M * 2) * d); c.height = Math.ceil((G.h + M * 2) * d);
    var g = c.getContext('2d'); g.setTransform(d, 0, 0, d, M * d, M * d);
    var gcx = G.gx + G.cols * G.px / 2, gcy = G.gy + G.rows * G.py / 2, gr = Math.hypot(G.cols * G.px, G.rows * G.py) * 0.62;
    var fg = g.createRadialGradient(gcx, gcy, gr * 0.2, gcx, gcy, gr); fg.addColorStop(0, A.WORLDS[world].focus); fg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = fg; g.fillRect(gcx - gr, gcy - gr, gr * 2, gr * 2);
    c.key = key; c.m = M * d; return (art.focus = c);
  }
  // A card at rest (fully dealt, not lifted, turning, pressed, landing, wobbling or animating) is drawn from one bitmap
  // composed once: its shadow, then its face and animal (or its back), painted exactly as drawCard paints them at rest.
  // Only the gentle "breathe" scale is applied live, so a resting card costs one blit instead of three plus a clip.
  function restArt(c, showFace) {
    var k = showFace ? 'f' + c.id + (c.matched ? '*' : '') : 'b', r = art.rest[k];
    if (r) return r;
    var d = G.dpr, w = G.cw, h = G.ch, sp = art.shadow, pad = sp.pad / d, cx = pad + w / 2, cy = pad + h / 2;
    var cv = document.createElement('canvas'); cv.width = Math.ceil((w + pad * 2) * d); cv.height = Math.ceil((h + pad * 2 + 4) * d);
    var g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, cx * d, cy * d);
    g.globalAlpha = 0.5; g.drawImage(sp, -w / 2 - pad, 4 - h / 2 - pad, w + pad * 2, h + pad * 2); g.globalAlpha = 1;
    if (showFace) {
      g.drawImage(face(c), -w / 2, -h / 2, w, h);
      var b = A.animalBox(w, h);
      g.save(); A.rr(g, -w / 2, -h / 2, w, h, Math.min(w, h) * 0.12); g.clip();
      g.translate(0, b.y + b.s / 2 - h / 2); g.drawImage(sprite(c), -b.s / 2, -b.s / 2, b.s, b.s);
      g.restore();
    } else g.drawImage(art.back, -w / 2, -h / 2, w, h);
    r = { c: cv, x: cx, y: cy, w: cv.width / d, h: cv.height / d }; art.rest[k] = r; return r;
  }
  function drawBackground() {
    var d = G.dpr, m = bg.margin, drift = K.reducedMotion ? 0 : Math.sin(time * 0.1);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // sky + far + mid, composed at their whole-pixel drift offsets; rebuilt only when one of those offsets changes
    var o1 = Math.round(-m), o2 = Math.round(-m + drift * m * 0.25), o3 = Math.round(-m + drift * m * 0.55);
    ctx.drawImage(layerCache('bgBack', o1 + ',' + o2 + ',' + o3, function (g) { g.drawImage(bg.sky, o1, 0); g.drawImage(bg.far, o2, 0); g.drawImage(bg.mid, o3, 0); }), 0, 0);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ambient.forEach(function (a, i) {
      var x = a.x * G.w, y = a.y * G.h, tw = 0.5 + 0.5 * Math.sin(a.ph * 2.2 + i);
      if (world === 3) { var gs = fireflyGlow(10 * a.s); ctx.globalAlpha = tw; ctx.drawImage(gs, x - gs.r, y - gs.r, gs.r * 2, gs.r * 2); ctx.globalAlpha = 1; }
      else if (world === 2) { ctx.strokeStyle = 'rgba(230,255,255,' + (0.35 + 0.3 * tw) + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 3 + 4 * a.s, 0, 6.283); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(x - 1.2 * a.s, y - 1.4 * a.s, 1.1 * a.s, 0, 6.283); ctx.fill(); }
      else if (world === 1) { ctx.save(); ctx.translate(x, y); ctx.rotate(a.ph * 1.5); ctx.globalAlpha = 0.75; ctx.fillStyle = i % 3 ? '#ffd0dc' : '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, 4.2 * a.s, 2.2 * a.s, 0, 0, 6.283); ctx.fill(); ctx.restore(); }
      else { ctx.globalAlpha = 0.25 + 0.45 * tw; ctx.fillStyle = '#ffe3b8'; ctx.beginPath(); ctx.arc(x, y, 1.6 * a.s, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; }
    });
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // near layer + the spotlight behind the grid, in one cached bitmap while the screen isn't shaking
    var o4 = Math.round(-m + drift * m), sh = K.fx.offset(), fgc = focusGlow();
    if (sh.x === 0 && sh.y === 0) ctx.drawImage(layerCache('bgFront', o4 + '|' + fgc.key, function (g) { g.drawImage(bg.near, o4, 0); g.drawImage(fgc, -fgc.m, -fgc.m); }), 0, 0);
    else { ctx.drawImage(bg.near, o4, 0); ctx.drawImage(fgc, Math.round(sh.x * d) - fgc.m, Math.round(sh.y * d) - fgc.m); }
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  // A screen-sized cache of background layers, repainted only when its key (the layers' whole-pixel offsets) changes.
  function layerCache(name, key, paint) {
    var c = art[name], W = canvas.width, H = canvas.height;
    if (!c || c.width !== W || c.height !== H) { c = art[name] = document.createElement('canvas'); c.width = W; c.height = H; c.key = null; c.g = c.getContext('2d'); }
    if (c.key !== key + '|' + bgKey) { var g = c.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); paint(g); c.key = key + '|' + bgKey; }
    return c;
  }
  function cardPos(c) {
    if (c.enter >= 1) return { x: c.x, y: c.y, r: 0 };
    var u = Math.max(0, c.enter), e = E.outBack(Math.min(1, u)), ee = E.outCubic(Math.min(1, u));
    return { x: K.lerp(G.deckX, c.tx, ee), y: K.lerp(G.deckY, c.ty, e), r: c.tilt * (1 - ee) * 2 };
  }
  function drawCard(c) {
    if (c.enter <= 0 && phase !== 'clear') return;
    var p = cardPos(c), w = G.cw, h = G.ch;
    var e = E.inOutSine(c.f), sx = Math.abs(Math.cos(Math.PI * e)), showFace = e > 0.5, mid = Math.sin(Math.PI * e);
    var lift = Math.max(c.lift, mid * 0.6);
    var hop = 0;
    if (phase === 'clear' && c.hop > 0 && c.hop < 0.6) hop = Math.sin(c.hop / 0.6 * Math.PI) * h * 0.16;
    var breathe = K.reducedMotion ? 0 : Math.sin(time * 2.2 + c.i * 0.7) * (c.matched ? 0.012 : 0.006);
    var S = 1 + lift * 0.08 - (c.pressV || 0) * 0.06 + breathe;
    var sqx = 1 + c.land * 0.05, sqy = 1 - c.land * 0.07;
    var rot = p.r + Math.sin(c.wob * 20) * 0.12 * c.wob;
    var y = p.y - lift * h * 0.09 - hop;
    if (c.enter >= 1 && mid < 1e-6 && !(lift > 1e-3) && hop === 0 && !(c.pressV > 1e-3) && !(c.land > 1e-3) && !(c.wob > 1e-3) &&
        !(showFace && c.anim >= 0 && c.anim < 2.5 && !K.reducedMotion)) {
      var ra = restArt(c, showFace);
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(S, S); ctx.drawImage(ra.c, -ra.x, -ra.y, ra.w, ra.h); ctx.restore();
      return;
    }
    // shadow on the table: further and softer as the card lifts
    var sp = art.shadow, sw = w * S * Math.max(0.08, sx) * sqx, shh = h * S, pad = sp.pad / G.dpr * (sw / w);
    ctx.globalAlpha = 0.5 - lift * 0.18;
    ctx.drawImage(sp, p.x - sw / 2 - pad + lift * 4, p.y + 4 + lift * h * 0.07 - shh / 2 - sp.pad / G.dpr, sw + pad * 2, shh + sp.pad / G.dpr * 2);
    ctx.globalAlpha = 1;
    if (c.matched && c.lift > 0.05) {
      var gs = Math.max(w, h) * 1.9 * (0.85 + c.lift * 0.25 + Math.sin(time * 4) * 0.03);
      ctx.globalAlpha = Math.min(1, c.lift * 1.2) * 0.9; ctx.drawImage(art.glow, p.x - gs / 2, y - gs / 2, gs, gs); ctx.globalAlpha = 1;
    }
    ctx.save();
    ctx.translate(p.x, y); ctx.rotate(rot);
    // the paper edge seen while the card is side-on
    if (mid > 0.05) { ctx.fillStyle = showFace ? '#d8c19a' : '#5a2a1a'; A.rr(ctx, -w * S * sx / 2 - 2.5 * mid, -h * S / 2 + 1, w * S * sx + 5 * mid, h * S, Math.min(w, h) * 0.1 * Math.max(0.2, sx)); ctx.fill(); }
    ctx.scale(Math.max(0.015, sx) * S * sqx, S * sqy);
    if (showFace) {
      ctx.drawImage(face(c), -w / 2, -h / 2, w, h);
      var b = A.animalBox(w, h), img, ax = 0, ay = 0, ar = 0, as = 1;
      if (c.anim >= 0 && c.anim < 2.5 && !K.reducedMotion) {
        var k = Math.min(1, c.anim / 0.2) * Math.min(1, (2.5 - c.anim) / 0.5), t = c.anim, mo = c.a.motion;
        img = liveSprite(c, { t: t, k: k });
        as = 1 + 0.14 * k * E.outElastic(Math.min(1, t / 0.7)) - 0.14 * k + 0.06 * k;
        if (mo === 'walk') ay = -Math.abs(Math.sin(t * 7)) * b.s * 0.02 * k;
        else if (mo === 'fly') { ay = Math.sin(t * 4) * b.s * 0.04 * k; ar = Math.sin(t * 3) * 0.06 * k; }
        else if (mo === 'swim') { ax = Math.sin(t * 2.5) * b.s * 0.04 * k; ar = Math.sin(t * 2.5 + 1) * 0.05 * k; }
        else if (mo === 'bob') ay = -Math.abs(Math.sin(t * 5)) * b.s * 0.025 * k;
      } else img = sprite(c);
      ctx.save(); A.rr(ctx, -w / 2, -h / 2, w, h, Math.min(w, h) * 0.12); ctx.clip();
      ctx.translate(ax, ay + b.y + b.s / 2 - h / 2); ctx.rotate(ar); ctx.scale(as, as);
      ctx.drawImage(img, -b.s / 2, -b.s / 2, b.s, b.s);
      ctx.restore();
    } else ctx.drawImage(art.back, -w / 2, -h / 2, w, h);
    if (sx < 0.98) { ctx.fillStyle = 'rgba(20,8,30,' + (1 - sx) * 0.45 + ')'; A.rr(ctx, -w / 2, -h / 2, w, h, Math.min(w, h) * 0.12); ctx.fill(); }
    if (c.wob > 0.2 && !c.matched && open.indexOf(c) >= 0) { ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,170,190,' + (c.wob * 0.9) + ')'; A.rr(ctx, -w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3, Math.min(w, h) * 0.12); ctx.stroke(); }
    ctx.restore();
  }
  function drawCaption() {
    if (!caption) return;
    var u = caption.t, a = Math.min(1, u / 0.25) * Math.min(1, (caption.life - u) / 0.4), rise = (1 - E.outBack(Math.min(1, u / 0.35))) * 16;
    var name = caption.a.name, cap = caption.a.cap ? '  ·  ' + caption.a.cap : '';
    var fs = Math.round(K.clamp(G.capH * 0.46, 16, 24)), maxW = G.w - G.safe.left - G.safe.right - 24;
    ctx.font = '900 ' + fs + 'px Nunito, system-ui, sans-serif';
    var wn = ctx.measureText(name).width; ctx.font = '700 ' + Math.round(fs * 0.82) + 'px Nunito, system-ui, sans-serif';
    var wc = ctx.measureText(cap).width, tw = wn + wc + G.capH * 0.9 + 20, sc = Math.min(1, maxW / tw);
    ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.translate(G.w / 2, G.capY + rise); ctx.scale(sc, sc);
    var ph = G.capH * 0.92, pw = tw;
    ctx.fillStyle = 'rgba(16,10,36,.66)'; A.rr(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,225,160,.45)'; ctx.stroke();
    var ix = -pw / 2 + ph * 0.55 + 4, isz = ph * 0.86;
    ctx.fillStyle = caption.a.bg; ctx.beginPath(); ctx.arc(ix, 0, isz / 2, 0, 6.283); ctx.fill();
    var sp = sprite({ id: caption.a.id, a: caption.a }); ctx.drawImage(sp, ix - isz / 2, -isz / 2, isz, isz);
    if (caption.isNew) { // a gold "NEW" tag on the picture: a new animal for the album
      var pop = E.outBack(Math.min(1, Math.max(0, u - 0.3) / 0.4)), tgx = ix + isz * 0.3, tgy = -ph / 2 - 2;
      ctx.save(); ctx.translate(tgx, tgy); ctx.scale(pop, pop); ctx.rotate(-0.12);
      ctx.font = '900 ' + Math.round(fs * 0.62) + 'px Nunito, system-ui, sans-serif'; var nw = ctx.measureText('NEW').width + 12, nh = fs * 0.9;
      ctx.fillStyle = '#f6c453'; A.rr(ctx, -nw / 2, -nh / 2, nw, nh, nh / 2); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#7a4a12'; ctx.stroke();
      ctx.fillStyle = '#4a2a06'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('NEW', 0, 1); ctx.restore();
    }
    var x0 = ix + isz / 2 + 10;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '900 ' + fs + 'px Nunito, system-ui, sans-serif'; ctx.fillStyle = '#fffaf0'; ctx.fillText(name, x0, 1);
    ctx.font = '700 ' + Math.round(fs * 0.82) + 'px Nunito, system-ui, sans-serif'; ctx.fillStyle = '#ffd98a'; ctx.fillText(cap, x0 + wn, 1);
    ctx.restore();
  }
  function drawBanner() {
    if (bannerT <= 0) return;
    var W = A.WORLDS[world], k = Math.max(0, Math.min(1, bannerT / 0.4, (1.4 - bannerT) / 0.3)), by = G.gy + G.rows * G.py / 2;
    var big = Math.min(76, G.w * 0.16);
    ctx.globalAlpha = k; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.font = '800 ' + Math.round(big * 0.38) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(20,10,40,.55)';
    ctx.strokeText(W.name.toUpperCase(), G.w / 2, by - big * 0.78); ctx.fillStyle = W.color; ctx.fillText(W.name.toUpperCase(), G.w / 2, by - big * 0.78);
    ctx.font = '900 ' + Math.round(big) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = 12;
    ctx.strokeText('Level ' + level, G.w / 2, by); ctx.fillStyle = '#fffaf0'; ctx.fillText('Level ' + level, G.w / 2, by);
    ctx.font = '800 ' + Math.round(big * 0.36) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = 6;
    var sub = 'Find ' + def.pairs + ' pairs';
    ctx.strokeText(sub, G.w / 2, by + big * 0.74); ctx.fillStyle = 'rgba(255,250,240,.92)'; ctx.fillText(sub, G.w / 2, by + big * 0.74);
    ctx.globalAlpha = 1;
  }
  function draw() {
    if (!def) return;
    ensureArt();
    drawBackground();
    var sh = K.fx.offset();
    ctx.translate(sh.x, sh.y);
    if (phase !== 'banner') {
      var later = [];
      cards.forEach(function (c) { if (c.lift > 0.03 || (c.f > 0 && c.f < 1) || c.enter < 1) later.push(c); else drawCard(c); });
      later.sort(function (a, b) { return a.lift - b.lift; }).forEach(drawCard);
    }
    K.fx.draw(ctx);
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    drawCaption();
    drawBanner();
  }

  // ---------- input: tap a card (press squashes it, release turns it) ----------
  K.pointer(canvas, function (x, y) { return { x: x, y: y }; }, {
    down: function (p) {
      if (paused || phase !== 'play') return;
      var c = cardAt(p.x, p.y); if (!c) return;
      down = { c: c, x: p.x, y: p.y };
      if (!c.matched && c.dir === 0) { c.press = 1; K.sfx.play('press'); }
    },
    up: function (p) {
      var d = down; down = null; if (!d) return;
      d.c.press = 0;
      if (Math.hypot(p.x - d.x, p.y - d.y) > Math.max(G.cw, 40) * 0.8) return; // dragged away: no flip
      tapCard(d.c);
    }
  });
  addEventListener('keydown', function (e) { if ((e.key === 'Escape' || e.key === 'p') && !paused && phase !== 'clear') pause(); });

  K.loop({ step: function (dt) { if (!(DEBUG && window.MM && window.MM.frozen)) step(dt); }, draw: draw, hz: 120, onHidden: function () { if (!DEBUG && !paused && phase !== 'clear' && def) pause(); } });

  // Test hook (only with ?debug in the URL): step the game by hand, inspect it and play it.
  if (DEBUG) window.MM = {
    run: function (sec) { for (var i = 0; i < Math.round(sec * 120); i++) step(1 / 120); draw(); },
    level: function (n) { startLevel(n); },
    start: function (n) { startLevel(n); this.run(1.4); this.run(0.6 + 0.05 * cards.length + 0.6); if (def.peek) this.run(def.peek + 1.4); return phase; },
    state: function () {
      return { phase: phase, paused: paused, level: level, world: world, pairs: def.pairs, found: found, misses: misses, peek: def.peek,
        cols: G.cols, rows: G.rows, cw: G.cw, ch: G.ch, open: open.map(function (c) { return c.i; }), stars: progress.stars(level),
        cards: cards.map(function (c) { return { i: c.i, id: c.id, x: Math.round(c.tx), y: Math.round(c.ty), up: c.dir === 1, matched: c.matched }; }) };
    },
    flip: function (i) { return tapCard(cards[i]); },
    // Plays the whole level perfectly (or sloppily with forget = 0..1), stepping game time by hand.
    solve: function (forget) {
      var mem = {}, guard = 0, self = this;
      while (phase === 'play' && guard++ < 400) {
        var left = cards.filter(function (c) { return !c.matched; });
        if (!left.length) { self.run(0.5); continue; }
        var a = null, b = null;
        if (!forget) { a = left[0]; b = left.filter(function (c) { return c !== a && c.id === a.id; })[0]; }
        else {
          a = left[(Math.random() * left.length) | 0];
          var known = left.filter(function (c) { return c !== a && c.id === a.id && mem[c.i] && Math.random() > forget; })[0];
          b = known || left.filter(function (c) { return c !== a; })[(Math.random() * (left.length - 1)) | 0];
          mem[a.i] = mem[b.i] = 1;
        }
        tapCard(a); self.run(0.4); tapCard(b); self.run(forget ? 0.5 : 0.45);
      }
      self.run(2.0);
      return { phase: phase, misses: misses, stars: progress.stars(level) };
    },
    album: function () { openAlbum(false); },
    give: function (ids) { album = ids || M.LIST.map(function (a) { return a.id; }); store.set('found', album); },
    pause: pause, G: G
  };

  var fontsReady = document.fonts && document.fonts.load ? document.fonts.load('900 40px Nunito') : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 700); })]).catch(function () {}).then(function () {
    startLevel(progress.current());
  });
})();
