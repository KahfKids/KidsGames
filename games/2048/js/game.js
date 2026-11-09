/* 2048 Garden: game.js
   Swipe the glazed tiles; two the same merge into one bigger tile. Each level has a kid-sized goal tile
   (8 on a small 3x3 tray up to 256 on a 4x4 tray), 1-3 stars, a few Undos and no dead ends.
   The merge rules are the original 2048 engine (game_manager.js, grid.js, tile.js; MIT licence).
   Built on the shared kit (js/kit): full-screen stage, fixed-step loop, pointer input, fx, sfx, ui, progress. */
(function () {
  'use strict';
  var A = window.G48Art, LV = window.G48_LEVELS, K = window.Kit;
  var COUNT = LV.list.length, DEBUG = /[?&]debug\b/.test(location.search);
  var store = K.store('kahf-2048'), progress = K.progress(store, COUNT);
  var canvas = document.getElementById('stage');
  var SLIDE = 0.12, POP = 0.24, SPAWN = 0.2;
  var PRAISE = ['mashaallah', 'ahsant', 'barakallah', 'alhamdulillah'];
  var UNDO_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>';
  var INFO_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>';

  // ---------- state ----------
  var level = 1, world = 0, def = null, gm = null, state = 'idle';
  var moves = 0, undosLeft = 0, usedUndo = false, hist = [], pending = null, queued = -1;
  var vis = {}, ghosts = [], slideT = 1, time = 0, bannerT = 0, bestTier = 0, goalPulse = 0, winVis = null, winT = 0;
  var tilt = { x: 0, y: 0 }, nudge = { x: 0, y: 0, v: 0 }, petals = [], flies = [], hint = null;
  var swiped = !!store.get('swiped', false), sheet = null;

  // ---------- layout (CSS px) ----------
  var G = { w: 0, h: 0, dpr: 1, B: 300, bx: 0, by: 0, side: false, card: null, safe: null };
  var scene = null, sceneKey = '', boardSpr = null, boardKey = '', tileSpr = {}, tileKey = '', goalSpr = null, goalKey = '';
  var stage = K.stage(canvas, function (st) { G.w = st.w; G.h = st.h; G.dpr = st.dpr; G.safe = st.safe; layout(); });
  var ctx = stage.ctx;

  function layout() {
    var w = G.w, h = G.h, sf = G.safe || { top: 0, right: 0, bottom: 0, left: 0 };
    var landscape = w > h * 1.15;
    if (landscape) {
      // The tray is as tall as the screen allows; the HUD and the goal sit in the side gutters.
      G.B = Math.floor(Math.max(160, Math.min(h - sf.top - sf.bottom - 28, w - 340, maxB())));
      G.bx = Math.round((w - G.B) / 2);
      G.by = Math.round(sf.top + (h - sf.top - sf.bottom - G.B) / 2 + 2);
      var gw = G.bx - sf.left - 16;
      G.side = true;
      G.card = { x: sf.left + 8 + gw / 2, y: G.by + G.B * 0.52, w: gw, ts: Math.min(gw * 0.52, 108, G.B * 0.3) };
    } else {
      var top = sf.top + 64, bottom = sf.bottom + 16, cardH = Math.max(70, Math.min(118, h * 0.11));
      G.B = Math.floor(Math.max(160, Math.min(w - sf.left - sf.right - 24, h - top - bottom - cardH - 14, maxB())));
      var avail = h - top - bottom, used = cardH + 14 + G.B, y0 = top + Math.max(0, (avail - used) * 0.42);
      G.bx = Math.round((w - G.B) / 2);
      G.by = Math.round(y0 + cardH + 14);
      G.side = false;
      G.card = { x: w / 2, y: y0 + cardH / 2, w: Math.min(w - 32, 420), ts: cardH * 0.8 };
    }
    scene = null; boardSpr = null; tileSpr = {}; goalSpr = null;
    placeHint();
  }
  function maxB() { return def && def.size === 3 ? 600 : 720; }
  function cells() { return A.cells(def ? def.size : 4, G.B); }
  function cellXY(x, y) { var L = cells(); return { x: G.bx + L.at(x), y: G.by + L.at(y) - (boardSpr ? boardSpr.lip * 0.5 : G.B * 0.009), s: L.cs }; }

  // ---------- HUD ----------
  var pLevel = K.ui.pill('');
  K.ui.spacer();
  var bUndo = K.ui.iconButton(UNDO_SVG, 'Undo', function () { undo(); });
  bUndo.id = 'g48-undo';
  var badge = document.createElement('span'); badge.className = 'g48-badge'; bUndo.appendChild(badge);
  K.ui.iconButton('pause', 'Pause', function () { if (state === 'play') pause(); });
  function hud() {
    var col = LV.WORLDS[world].color;
    pLevel.set('<svg viewBox="-50 -50 100 100" style="width:18px;height:18px"><path d="M0-46 13-31 32-32 31-13 46 0 31 13 32 32 13 31 0 46-13 31-32 32-31 13-46 0-31-13-32-32-13-31Z" fill="' + col + '"/></svg>Level ' + level);
    badge.textContent = undosLeft;
    bUndo.classList.toggle('g48-off', undosLeft <= 0 || !hist.length);
  }

  // ---------- levels ----------
  function closeSheet() { if (sheet) { sheet.close(); sheet = null; } }
  function startLevel(n, resume) {
    closeSheet();
    level = K.clamp(n, 1, COUNT); def = LV.list[level - 1]; world = LV.worldOf(level);
    progress.setCurrent(level);
    gm = new GameManager(def.size, { stones: def.stones, start: def.start });
    moves = 0; undosLeft = def.undos; usedUndo = false; hist = []; pending = null; queued = -1; winVis = null;
    var saved = resume ? store.get('board', null) : null;
    if (saved && saved.level === level && saved.snap && saved.snap.grid && saved.snap.grid.size === def.size) {
      try { gm.restore(saved.snap); moves = saved.moves || 0; undosLeft = saved.undos == null ? def.undos : saved.undos; usedUndo = !!saved.used; }
      catch (e) { gm = new GameManager(def.size, { stones: def.stones, start: def.start }); }
    }
    boardSpr = null; tileSpr = {}; goalSpr = null; scene = null;
    layout();
    if (hint && level !== 1) { hint.hide(); hint = null; }
    rebuildVis('enter');
    slideT = 1; bestTier = A.tierOf(Math.max(2, gm.maxValue()));
    K.fx.clear(); makeAmbient();
    state = 'play'; bannerT = 2.0; goalPulse = 0;
    saveBoard(); hud(); placeHint();
    K.sfx.play('whoosh');
    if (gm.over) stuck();
  }
  function saveBoard() { if (gm) store.set('board', { level: level, snap: gm.snapshot(), moves: moves, undos: undosLeft, used: usedUndo }); }

  // Visual state per tile id: where it slides from/to and how old it is (for spawn and merge pops).
  function rebuildVis(mode) {
    vis = {}; ghosts = [];
    var i = 0;
    gm.grid.eachCell(function (x, y, t) {
      if (!t) return;
      var delay = mode === 'enter' ? 0.25 + (x + y) * 0.06 : 0;
      vis[t.id] = { t: t, fx: x, fy: y, x: x, y: y, born: mode === 'enter' ? 'spawn' : mode, age: -delay, k: i++ };
    });
  }
  function afterMoveVis() {
    var nv = {};
    ghosts = [];
    gm.grid.eachCell(function (x, y, t) {
      if (!t) return;
      if (t.stone) { nv[t.id] = { t: t, fx: x, fy: y, x: x, y: y, age: 9 }; return; }
      if (t.mergedFrom) {
        t.mergedFrom.forEach(function (src) {
          var p = src.previousPosition || { x: x, y: y };
          ghosts.push({ value: src.value, fx: p.x, fy: p.y, x: x, y: y });
        });
        nv[t.id] = { t: t, fx: x, fy: y, x: x, y: y, born: 'merge', age: -SLIDE };
      } else if (t.previousPosition) {
        var old = vis[t.id];
        nv[t.id] = { t: t, fx: t.previousPosition.x, fy: t.previousPosition.y, x: x, y: y, born: old ? old.born : null, age: old ? Math.max(old.age, 1) : 9 };
      } else nv[t.id] = { t: t, fx: x, fy: y, x: x, y: y, born: 'spawn', age: -SLIDE };
    });
    vis = nv;
  }

  // ---------- input: swipe anywhere ----------
  var sw = null;
  function thresh() { return Math.max(18, Math.min(42, G.B * 0.06)); }
  K.pointer(canvas, function (x, y) { return { x: x, y: y }; }, {
    down: function (p) { sw = { x: p.sx, y: p.sy, done: false }; },
    move: function (p) {
      if (!sw || sw.done) return;
      var dx = p.sx - sw.x, dy = p.sy - sw.y;
      if (Math.hypot(dx, dy) > thresh()) { sw.done = true; swipe(dx, dy); }
    },
    up: function (p) {
      if (sw && !sw.done) { var dx = p.sx - sw.x, dy = p.sy - sw.y; if (Math.hypot(dx, dy) > 12) swipe(dx, dy); }
      sw = null;
    }
  });
  function swipe(dx, dy) { request(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0)); }
  var KEYDIR = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3, W: 0, D: 1, S: 2, A: 3 };
  addEventListener('keydown', function (e) {
    if (document.querySelector('.kit-veil')) return;
    if (e.key in KEYDIR) { e.preventDefault(); if (!e.repeat) request(KEYDIR[e.key]); }
    else if (e.key === 'u' || e.key === 'U' || ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z'))) { e.preventDefault(); undo(); }
    else if (e.key === 'Escape' || e.key === 'p') { if (state === 'play') pause(); }
  });

  function request(dir) {
    if (state !== 'play' || !gm) return;
    if (slideT < 1) { queued = dir; return; }
    doMove(dir);
  }
  var DV = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  function doMove(dir) {
    var before = gm.snapshot(), res = gm.move(dir);
    if (!res.moved) { // nothing can slide that way: the tray gives a little knock
      nudge.x = DV[dir][0] * 7; nudge.y = DV[dir][1] * 7; K.sfx.play('bump'); K.buzz(6);
      return;
    }
    hist.push(before); if (hist.length > 40) hist.shift();
    moves++;
    var n = 0; gm.grid.eachCell(function (x, y, t) { if (t && !t.stone && t.previousPosition && (t.previousPosition.x !== x || t.previousPosition.y !== y)) n++; });
    afterMoveVis();
    slideT = 0; pending = res;
    tilt.x = DV[dir][0]; tilt.y = DV[dir][1];
    K.sfx.play('slide', { n: n + res.merges.length });
    bannerT = Math.min(bannerT, 0.3);
    if (!swiped) { swiped = true; store.set('swiped', true); }
    if (hint) { hint.hide(); hint = null; }
    saveBoard(); hud();
  }

  // Runs when the tiles land: merge pops, the new tile, and the goal or no-moves checks.
  function landed() {
    var res = pending; pending = null; ghosts = [];
    if (!res) return;
    if (res.merges.length) {
      var big = 0;
      res.merges.forEach(function (m) {
        big = Math.max(big, m.value);
        var c = cellXY(m.x, m.y), col = A.tileColor(m.value), k = A.tierOf(m.value);
        K.fx.burst(c.x + c.s / 2, c.y + c.s / 2, { n: 6 + k * 2, colors: [col, A.shade(col, 0.4), '#ffffff'], speed: 120 + c.s * 2.2, size: Math.max(5, c.s * 0.1), life: 0.55, gravity: 500, shape: k >= 5 ? 'star' : 'shard', jitter: c.s * 0.4 });
      });
      var bk = A.tierOf(big);
      K.sfx.play('merge', { k: bk, n: res.merges.length }); K.buzz(8 + bk);
      if (bk > bestTier && big < def.goal) {
        bestTier = bk;
        if (bk >= 3) {
          var top = res.merges.filter(function (m) { return m.value === big; })[0], c2 = cellXY(top.x, top.y);
          K.sfx.play('shine', { k: bk });
          K.fx.burst(c2.x + c2.s / 2, c2.y + c2.s / 2, { n: 10, color: '#fff3c4', speed: 220, size: Math.max(8, c2.s * 0.16), life: 0.8, shape: 'star', gravity: -40 });
          if (big * 2 === def.goal) goalPulse = 1.6; // almost there: the goal tile waves
        }
      }
    }
    if (res.spawned) K.sfx.play('spawn');
    if (gm.maxValue() >= def.goal) { win(); return; }
    if (gm.over) { stuck(); return; }
    if (queued >= 0) { var q = queued; queued = -1; doMove(q); }
  }
  function finishSlide() {
    if (slideT >= 1) return;
    var rest = (1 - slideT) * SLIDE;
    for (var id in vis) vis[id].age += rest;
    slideT = 1; landed();
  }

  // ---------- undo ----------
  function undo() {
    if (!gm || !(state === 'play' || state === 'stuck')) return;
    if (undosLeft <= 0 || !hist.length) { K.sfx.play('bump'); bUndo.classList.remove('g48-shake'); void bUndo.offsetWidth; bUndo.classList.add('g48-shake'); return; }
    finishSlide();
    queued = -1;
    gm.restore(hist.pop());
    undosLeft--; usedUndo = true; moves = Math.max(0, moves - 1);
    rebuildVis('undo');
    bestTier = A.tierOf(Math.max(2, gm.maxValue()));
    K.sfx.play('undo');
    closeSheet();
    state = 'play';
    saveBoard(); hud();
  }

  // ---------- goal reached ----------
  function win() {
    state = 'clear';
    var stars = LV.stars(level, moves, usedUndo);
    progress.finish(level, stars);
    store.set('board', null);
    K.bridge.complete();
    K.sfx.play('win'); K.buzz(30);
    K.say.praise(level === COUNT ? 'mashaallah' : PRAISE[(level - 1) % PRAISE.length]);
    winVis = null; winT = 0;
    for (var id in vis) if (vis[id].t.value >= def.goal) winVis = vis[id];
    var c = winVis ? cellXY(winVis.x, winVis.y) : { x: G.bx + G.B / 2, y: G.by + G.B / 2, s: 0 }, cx = c.x + c.s / 2, cy = c.y + c.s / 2;
    var col = A.tileColor(def.goal);
    K.fx.burst(cx, cy, { n: 30, colors: [col, '#ffd36b', '#ffffff', A.shade(col, 0.4)], speed: 520, size: 14, life: 1.1, shape: 'star', gravity: 500 });
    K.fx.text(G.bx + G.B / 2, G.by + G.B * 0.5, 'You made ' + def.goal + '!', { size: Math.min(56, G.B * 0.11), color: '#fff6c2', stroke: 'rgba(60,20,80,.6)', life: 1.5, rise: 70 });
    K.fx.shake(6, 0.25);
    var lv = level;
    for (var i = 1; i < 6; i++) setTimeout(function () {
      if (state !== 'clear' || level !== lv) return;
      K.fx.burst(K.rand(G.bx, G.bx + G.B), K.rand(G.by, G.by + G.B * 0.7), { n: 18, colors: ['#ffd36b', '#ff8fab', '#7ae7ff', '#ffffff', col], speed: 420, size: 13, life: 1.1, shape: 'star', gravity: 500 });
    }, i * 170);
    var last = level === COUNT, endOfWorld = level === LV.WORLDS[world].to;
    setTimeout(function () {
      if (state !== 'clear' || level !== lv) return;
      var buttons = [];
      if (!last) buttons.push({ label: endOfWorld ? 'Next Garden' : 'Next Level', icon: 'next', primary: true, onClick: function () { sheet = null; startLevel(level + 1); } });
      buttons.push({ label: last ? 'Play Again' : 'Replay', icon: 'restart', row: true, primary: last, onClick: function () { sheet = null; startLevel(last ? 1 : level); } });
      buttons.push({ label: 'Levels', icon: 'levels', row: true, onClick: function () { sheet = null; openLevels(); } });
      sheet = K.ui.sheet({
        title: last ? 'All gardens done!' : endOfWorld ? LV.WORLDS[world].name + ' done!' : 'Goal reached!',
        text: last ? 'You made 256 on the big tray. MashaAllah!' : 'You made ' + def.goal + ' in ' + moves + ' moves.',
        stars: stars, buttons: buttons });
    }, 1500);
  }

  // ---------- no moves left: gentle, never a dead end ----------
  function stuck() {
    state = 'stuck';
    K.sfx.play('stuck');
    var lv = level;
    setTimeout(function () {
      if (state !== 'stuck' || level !== lv) return;
      var canUndo = undosLeft > 0 && hist.length > 0, buttons = [];
      if (canUndo) buttons.push({ label: 'Undo (' + undosLeft + ' left)', icon: UNDO_SVG, primary: true, onClick: function () { sheet = null; undo(); } });
      buttons.push({ label: canUndo ? 'Retry' : 'Try Again', icon: 'restart', primary: !canUndo, row: canUndo, onClick: function () { sheet = null; startLevel(level); } });
      buttons.push({ label: 'Levels', icon: 'levels', row: canUndo, onClick: function () { sheet = null; openLevels(); } });
      sheet = K.ui.sheet({ title: 'No moves left', text: canUndo ? 'The tray is full. Go back a step and try another way!' : 'The tray is full. Let\'s start this garden again!', buttons: buttons });
    }, 800);
  }

  // ---------- sheets ----------
  function pause() {
    state = 'paused';
    sheet = K.ui.sheet({ title: 'Paused', text: LV.WORLDS[world].name + ' · Level ' + level, buttons: [
      { label: 'Resume', icon: 'play', primary: true, onClick: function () { sheet = null; resume(); } },
      { label: 'Restart', icon: 'restart', row: true, onClick: function () { sheet = null; startLevel(level); } },
      { label: 'Levels', icon: 'levels', row: true, onClick: function () { sheet = null; openLevels(); } },
      { label: K.sfx.muted ? 'Sound: Off' : 'Sound: On', icon: K.sfx.muted ? 'soundOff' : 'sound', onClick: function () { sheet = null; K.sfx.toggle(); pause(); } },
      { label: 'About', icon: INFO_SVG, onClick: function () { sheet = null; about(); } }] });
  }
  function resume() { state = gm && gm.over ? 'stuck' : 'play'; if (state === 'stuck') stuck(); }
  function about() {
    state = 'paused';
    sheet = K.ui.sheet({ title: '2048 Garden',
      text: 'Swipe to slide the tiles. Two the same join into one! Based on the game 2048 by Gabriele Cirulli, shared under the MIT licence. Garden art, levels and sounds: Kahf Kids.',
      buttons: [{ label: 'Back', icon: 'play', primary: true, onClick: function () { sheet = null; pause(); } }] });
  }
  function openLevels() {
    state = 'paused';
    sheet = K.ui.levelSelect({
      title: '2048 Garden',
      worlds: LV.WORLDS.map(function (w) { return { name: w.name, color: w.color, from: w.from, to: w.to }; }),
      progress: progress, current: level,
      onPick: function (n) { sheet = null; startLevel(n); },
      onClose: function () {
        sheet = null;
        if (gm && !gm.over && gm.maxValue() < def.goal) state = 'play';
        else startLevel(gm && gm.maxValue() >= def.goal ? Math.min(COUNT, level + 1) : level);
      }
    });
  }

  // ---------- first-level coaching ----------
  function placeHint() {
    if (!hint) return;
    if (G.side) { hint.style.left = Math.round(G.bx + G.B + (G.w - G.bx - G.B) / 2) + 'px'; hint.style.bottom = Math.round(G.h * 0.3) + 'px'; }
    else { hint.style.left = '50%'; hint.style.bottom = 'calc(' + Math.max(8, Math.round((G.h - G.by - G.B) / 2 - 22)) + 'px + 0px)'; }
  }
  function maybeHint() {
    if (swiped || hint || level !== 1 || state !== 'play') return;
    hint = K.ui.hint('Swipe to slide!', 40, true);
    placeHint();
  }

  // ---------- ambient life ----------
  function makeAmbient() {
    petals = [];
    for (var i = 0; i < 16; i++) petals.push({ x: Math.random(), y: Math.random(), v: 0.5 + Math.random() * 0.6, ph: Math.random() * 6.28, s: 0.6 + Math.random() * 0.8 });
    flies = [];
    var cols = [['#ffd36b', '#ff9fb8'], ['#7ae7ff', '#ffffff'], ['#ffb27a', '#ffd36b']][world];
    for (var f = 0; f < 2; f++) flies.push({ x: Math.random(), y: 0.2 + Math.random() * 0.5, ph: Math.random() * 10, sp: 0.5 + Math.random() * 0.4, col: cols[f] });
  }

  // ---------- simulation ----------
  function step(dt) {
    time += dt;
    K.fx.update(dt);
    if (!gm) return;
    for (var id in vis) vis[id].age += dt;
    if (slideT < 1) { slideT = Math.min(1, slideT + dt / SLIDE); if (slideT >= 1) landed(); }
    if (bannerT > 0) bannerT -= dt;
    if (goalPulse > 0) goalPulse -= dt;
    if (state === 'clear') winT += dt;
    var k = 1 - Math.exp(-dt * 4);
    tilt.x -= tilt.x * k; tilt.y -= tilt.y * k;
    var kn = 1 - Math.exp(-dt * 14);
    nudge.x -= nudge.x * kn; nudge.y -= nudge.y * kn;
    petals.forEach(function (p) { p.ph += dt; p.y += dt * 0.025 * p.v; p.x += Math.sin(p.ph * 0.9) * dt * 0.01 + dt * 0.006; if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); } if (p.x > 1.05) p.x = -0.05; });
    flies.forEach(function (f) { f.ph += dt * f.sp; f.x += Math.cos(f.ph * 0.7) * dt * 0.03; f.y += Math.sin(f.ph * 1.3) * dt * 0.02; if (f.x < 0.02 || f.x > 0.98) f.x = K.clamp(f.x, 0.02, 0.98); f.y = K.clamp(f.y, 0.1, 0.9); });
    if (state === 'play' && !swiped && level === 1 && !hint && time > 0.5) maybeHint();
  }

  // ---------- drawing ----------
  function ensureArt() {
    var sk = world + '|' + G.w + 'x' + G.h + '|' + G.dpr + '|' + G.B + '|' + G.by;
    if (!scene || sceneKey !== sk) { scene = A.paintScene(world, G.w, G.h, G.dpr, { bx: G.bx, by: G.by, B: G.B }); sceneKey = sk; }
    var bk = world + '|' + def.size + '|' + G.B + '|' + G.dpr;
    if (!boardSpr || boardKey !== bk) { boardSpr = A.board(def.size, G.B, G.dpr, world); boardKey = bk; }
    var tk = def.size + '|' + G.B + '|' + G.dpr;
    if (tileKey !== tk) { tileSpr = {}; tileKey = tk; }
    var gk = def.goal + '|' + G.card.ts + '|' + G.dpr;
    if (!goalSpr || goalKey !== gk) { goalSpr = A.tile(def.goal, G.card.ts, G.dpr); goalKey = gk; }
  }
  function spriteFor(t) {
    var key = t.stone ? 'stone' + world : t.value;
    if (!tileSpr[key]) { var cs = cells().cs; tileSpr[key] = t.stone ? A.stone(cs, G.dpr, world) : A.tile(t.value, cs, G.dpr); }
    return tileSpr[key];
  }
  function drawSprite(sp, x, y, s, scale, alpha) {
    var pad = sp.pad;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.translate(x + s / 2, y + s / 2); ctx.scale(scale, scale);
    ctx.drawImage(sp.c, -s / 2 - pad, -s / 2 - pad, s + pad * 2, s + pad * 2);
    ctx.restore();
  }

  function drawStar(x, y, r, on) {
    ctx.save(); ctx.translate(x, y);
    A.star8(ctx, 0, 0, r, 0.66);
    ctx.fillStyle = on ? '#f6c453' : 'rgba(255,255,255,.22)'; ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.14); ctx.strokeStyle = on ? '#7a4a12' : 'rgba(20,10,40,.35)'; ctx.stroke();
    ctx.restore();
  }

  // The goal: "Make" + the goal tile, the stars still in reach, and the move count
  function drawGoal() {
    var C = G.card, ts = C.ts, sNow = LV.stars(level, moves, usedUndo), wave = goalPulse > 0 ? Math.sin(goalPulse * 14) * 0.08 * Math.min(1, goalPulse) : 0;
    var breathe = 1 + Math.sin(time * 2.4) * 0.025 + wave;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    var fs = Math.max(16, Math.min(26, ts * 0.32));
    function label(t, x, y, size, col) {
      ctx.font = '800 ' + Math.round(size) + 'px Nunito, system-ui, sans-serif';
      ctx.lineWidth = size * 0.28; ctx.strokeStyle = 'rgba(20,12,40,.55)'; ctx.strokeText(t, x, y);
      ctx.fillStyle = col || '#fffaf0'; ctx.fillText(t, x, y);
    }
    // soft glow behind the goal tile
    function glow(x, y) {
      var gr = ctx.createRadialGradient(x, y, 0, x, y, ts * 0.95);
      gr.addColorStop(0, 'rgba(255,240,190,.55)'); gr.addColorStop(1, 'rgba(255,240,190,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, ts * 0.95, 0, 6.283); ctx.fill();
    }
    var sr = Math.max(9, Math.min(16, ts * 0.17));
    // a soft frosted ribbon behind the goal so it reads over any scenery
    ctx.save(); ctx.fillStyle = 'rgba(16,10,36,.32)'; ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1;
    ctx.font = '800 ' + Math.round(fs) + 'px Nunito, system-ui, sans-serif';
    var mkw = ctx.measureText('Make').width;
    if (G.side) { var top = C.y - ts * 1.1 - fs * 0.85, bot = C.y + ts * 0.49 + sr * 2.3 + fs * 0.7, cw = Math.min(C.w, ts * 1.6); A.rr(ctx, C.x - cw / 2, top, cw, bot - top, 22); }
    else { var x0 = C.x - ts * 0.15 - ts / 2 - 12 - mkw - 18, x1 = C.x - ts * 0.15 + ts / 2 + 14 + sr * 4.8 + Math.max(sr * 1.3, fs * 0.9) + 14; A.rr(ctx, x0, C.y - ts * 0.6, x1 - x0, ts * 1.2, ts * 0.6); }
    ctx.fill(); ctx.stroke(); ctx.restore();
    if (G.side) {
      var y = C.y - ts * 0.95;
      label('Make', C.x, y - ts * 0.15, fs);
      var ty = y + ts * 0.62;
      glow(C.x, ty);
      ctx.save(); ctx.translate(C.x, ty); ctx.rotate(wave); ctx.translate(-C.x, -ty);
      drawSprite(goalSpr, C.x - ts / 2, ty - ts / 2, ts, breathe); ctx.restore();
      var sy = ty + ts * 0.82;
      for (var i = 0; i < 3; i++) drawStar(C.x + (i - 1) * sr * 2.4, sy - (i === 1 ? sr * 0.3 : 0), sr * (i === 1 ? 1.15 : 1), i < sNow);
      label(moves + (moves === 1 ? ' move' : ' moves'), C.x, sy + sr * 2.3, fs * 0.72, 'rgba(255,250,240,.92)');
    } else {
      var cx = C.x, cy = C.y, tx = cx - ts * 0.15;
      ctx.font = '800 ' + Math.round(fs) + 'px Nunito, system-ui, sans-serif';
      var mw = ctx.measureText('Make').width;
      label('Make', tx - ts / 2 - 12 - mw / 2, cy, fs);
      glow(tx, cy);
      ctx.save(); ctx.translate(tx, cy); ctx.rotate(wave); ctx.translate(-tx, -cy);
      drawSprite(goalSpr, tx - ts / 2, cy - ts / 2, ts, breathe); ctx.restore();
      var sx = tx + ts / 2 + 14 + sr * 2.4;
      for (var j = 0; j < 3; j++) drawStar(sx + (j - 1) * sr * 2.4, cy - sr * 0.7 - (j === 1 ? sr * 0.3 : 0), sr * (j === 1 ? 1.15 : 1), j < sNow);
      label(moves + (moves === 1 ? ' move' : ' moves'), sx, cy + sr * 1.3, fs * 0.72, 'rgba(255,250,240,.92)');
    }
  }

  function draw(alpha, frameDt) {
    if (!def) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0d0b24'; ctx.fillRect(0, 0, canvas.width, canvas.height); return; }
    ensureArt();
    var d = G.dpr, m = scene.margin;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(scene.sky, Math.round(-m - tilt.x * 3 * d), Math.round(-tilt.y * 2 * d));
    ctx.drawImage(scene.far, Math.round(-m - tilt.x * 7 * d), Math.round(-tilt.y * 3 * d));
    ctx.drawImage(scene.mid, Math.round(-m - tilt.x * 12 * d), Math.round(-tilt.y * 4 * d));
    ctx.setTransform(d, 0, 0, d, 0, 0);
    // petals drifting through the garden, and two butterflies
    var pc = A.WORLDS[world].flowers;
    petals.forEach(function (p, i) {
      ctx.save(); ctx.globalAlpha = 0.8; ctx.fillStyle = pc[i % pc.length];
      ctx.translate(p.x * G.w, p.y * G.h); ctx.rotate(p.ph);
      ctx.beginPath(); ctx.ellipse(0, 0, 5 * p.s, 2.6 * p.s, 0, 0, 6.283); ctx.fill(); ctx.restore();
    });
    flies.forEach(function (f) { A.butterfly(ctx, f.x * G.w, f.y * G.h, 9, f.ph * 6, f.col[0], Math.cos(f.ph * 0.7) * 0.5); });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(scene.near, Math.round(-m - tilt.x * 18 * d), Math.round(-tilt.y * 6 * d));
    ctx.setTransform(d, 0, 0, d, 0, 0);

    drawGoal();

    // the tray and its tiles
    var sh = K.fx.offset(), ox = nudge.x + sh.x, oy = nudge.y + sh.y;
    ctx.save(); ctx.translate(ox, oy);
    var bp = boardSpr.pad;
    ctx.drawImage(boardSpr.c, G.bx - bp, G.by - bp, G.B + bp * 2, G.B + bp * 2);
    var e = K.ease.outQuad(slideT), list = [];
    for (var id in vis) list.push(vis[id]);
    list.sort(function (a, b) { return (a.born === 'merge') - (b.born === 'merge') || a.y - b.y; });
    // merging tiles slide into each other first
    if (slideT < 1) ghosts.forEach(function (gh) {
      var a = cellXY(gh.fx, gh.fy), b = cellXY(gh.x, gh.y);
      drawSprite(spriteFor({ value: gh.value }), a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e, a.s, 1);
    });
    list.forEach(function (v) {
      if (v.age < 0) return;
      var a = cellXY(v.fx, v.fy), b = cellXY(v.x, v.y), x = a.x + (b.x - a.x) * e, y = a.y + (b.y - a.y) * e, sc = 1, al = 1;
      if (v.born === 'spawn' && v.age < SPAWN) { sc = K.ease.outBack(v.age / SPAWN); al = Math.min(1, v.age / SPAWN * 2); }
      else if (v.born === 'merge' && v.age < POP) sc = 1 + 0.24 * Math.sin(Math.PI * v.age / POP);
      else if (v.born === 'undo' && v.age < 0.25) { sc = 0.86 + 0.14 * K.ease.outBack(v.age / 0.25); al = Math.min(1, 0.3 + v.age * 4); }
      if (v === winVis) sc *= 1 + 0.08 * Math.sin(winT * 6) * Math.min(1, winT * 2);
      // the biggest tile breathes softly
      drawSprite(spriteFor(v.t), x, y, a.s, sc, al);
    });
    if (winVis) { // a ring of light grows around the goal tile
      var c = cellXY(winVis.x, winVis.y), cx = c.x + c.s / 2, cy = c.y + c.s / 2, rk = (winT % 1.2) / 1.2;
      ctx.save(); ctx.globalAlpha = (1 - rk) * 0.8; ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 6 * (1 - rk) + 1;
      A.rr(ctx, cx - c.s * (0.5 + rk * 0.4), cy - c.s * (0.5 + rk * 0.4), c.s * (1 + rk * 0.8), c.s * (1 + rk * 0.8), c.s * 0.2); ctx.stroke(); ctx.restore();
    }
    // first level: a ghost finger shows the swipe
    if (!swiped && level === 1 && state === 'play' && slideT >= 1) {
      var u = (time % 1.8) / 1.8, k2 = K.ease.inOutSine(Math.min(1, u / 0.7)), fx = G.bx + G.B * (0.3 + 0.4 * k2), fy = G.by + G.B * 0.5;
      ctx.save(); ctx.globalAlpha = u < 0.85 ? Math.min(1, u * 5) * 0.75 : (1 - u) / 0.15 * 0.75;
      var tr = ctx.createLinearGradient(G.bx + G.B * 0.3, 0, fx, 0); tr.addColorStop(0, 'rgba(255,255,255,0)'); tr.addColorStop(1, 'rgba(255,255,255,.7)');
      ctx.fillStyle = tr; A.rr(ctx, G.bx + G.B * 0.3, fy - 7, Math.max(1, fx - G.bx - G.B * 0.3), 14, 7); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(fx, fy, Math.max(14, G.B * 0.045), 0, 6.283); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(40,25,70,.45)'; ctx.stroke();
      ctx.restore();
    }
    K.fx.draw(ctx);
    ctx.restore();

    // level banner
    if (bannerT > 0) {
      var k = Math.max(0, Math.min(1, bannerT / 0.4, (2.0 - bannerT) / 0.3)), by = G.by + G.B * 0.5, fsz = Math.min(84, G.B * 0.17);
      ctx.globalAlpha = k;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.font = '800 ' + Math.round(fsz * 0.4) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = fsz * 0.1; ctx.strokeStyle = 'rgba(20,10,40,.6)';
      var wn = LV.WORLDS[world].name.toUpperCase();
      ctx.strokeText(wn, G.bx + G.B / 2, by - fsz * 0.75); ctx.fillStyle = LV.WORLDS[world].color; ctx.fillText(wn, G.bx + G.B / 2, by - fsz * 0.75);
      ctx.font = '800 ' + Math.round(fsz) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = fsz * 0.16;
      ctx.strokeText('Level ' + level, G.bx + G.B / 2, by); ctx.fillStyle = '#fffaf0'; ctx.fillText('Level ' + level, G.bx + G.B / 2, by);
      ctx.font = '800 ' + Math.round(fsz * 0.46) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = fsz * 0.1;
      ctx.strokeText('Make ' + def.goal + '!', G.bx + G.B / 2, by + fsz * 0.8); ctx.fillStyle = '#ffe9a8'; ctx.fillText('Make ' + def.goal + '!', G.bx + G.B / 2, by + fsz * 0.8);
      ctx.globalAlpha = 1;
    }
  }

  K.loop({ step: step, draw: draw, hz: 120, onHidden: function () { if (state === 'play' && !DEBUG) pause(); } });
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', function () { tileSpr = {}; goalSpr = null; });

  // Test hook (only with ?debug in the URL): play by hand and inspect.
  if (DEBUG) window.G48 = {
    count: COUNT, levels: LV.list,
    start: function (n, resume) { startLevel(n, resume); return this.get(); },
    move: function (dir) { finishSlide(); request(dir); finishSlide(); return this.get(); },
    undo: function () { undo(); return this.get(); },
    run: function (sec) { for (var i = 0; i < Math.round(sec * 120); i++) step(1 / 120); draw(0, 0); },
    draw: function () { draw(0, 0); },
    finish: finishSlide,
    board: function () { var b = []; for (var x = 0; x < gm.size; x++) { b.push([]); for (var y = 0; y < gm.size; y++) { var t = gm.grid.cells[x][y]; b[x].push(t ? (t.stone ? -1 : t.value) : 0); } } return b; },
    get: function () { return { state: state, level: level, size: def.size, goal: def.goal, par: def.par, moves: moves, undos: undosLeft, usedUndo: usedUndo,
      max: gm.maxValue(), over: gm.over, stars: progress.stars(level), total: progress.total(), board: this.board(), G: { B: G.B, bx: G.bx, by: G.by, side: G.side } }; },
    setBoard: function (b) { // place values by hand (for screenshots)
      gm.grid = new Grid(b.length); for (var x = 0; x < b.length; x++) for (var y = 0; y < b.length; y++) if (b[x][y]) gm.grid.insertTile(new Tile({ x: x, y: y }, b[x][y] > 0 ? b[x][y] : 0, b[x][y] < 0));
      gm.over = !gm.movesAvailable(); rebuildVis('undo'); for (var id in vis) vis[id].age = 9; if (gm.over && state === 'play') stuck(); return this.get();
    }
  };

  // Fonts load quickly from the local cache; start once they are ready so the numbers are crisp.
  var fontsReady = document.fonts && document.fonts.load ? document.fonts.load('800 40px Nunito') : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 700); })]).catch(function () {}).then(function () {
    startLevel(progress.current(), true);
  });
})();
