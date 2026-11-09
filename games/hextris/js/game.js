/* Hextris (Kahf Kids edition): game.js
   Tiles drift in toward a turning medallion. Tap the left or right side of the screen to turn it, and stack
   three or more tiles of the same colour together to clear them. 15 levels in 3 worlds plus endless mode.

   Based on Hextris by Logan Engstrom and Garrett Finucane (https://github.com/Hextris/hextris), free software
   under the GNU General Public License v3 (see LICENSE.md in this folder). The core rules are theirs: six
   lanes, stacks that turn with the hexagon, flood-fill matching of 3+ touching same-colour tiles across
   neighbouring sides and rows, collapsing stacks and timed combos. This rewrite (delta-time loop, kid mode,
   levels, art and sound) is also released under the GNU GPL v3.

   Built on the shared kit (js/kit): full-screen stage, fixed-step loop, pointer input, fx, sfx, ui, progress. */
(function () {
  'use strict';
  var A = window.HexArt, LV = window.HEX_LEVELS, K = window.Kit;
  var DEBUG = /[?&]debug\b/.test(location.search);
  var COUNT = LV.list.length, PER = LV.perWorld;
  var SQ3 = Math.sqrt(3), DEG = Math.PI / 180;

  // ---------- geometry (game units; the medallion sits at 0,0) ----------
  var SIDE = 56, A0 = SIDE * SQ3 / 2, BH = 26, ROWS = 6;
  var LIMIT = A0 + ROWS * BH;          // tiles must stay inside this apothem
  var SPAWN = LIMIT + 7;               // where new tiles appear (on the basin's outer track)
  var RIM = SPAWN + BH + 10;           // apothem of the basin's outer rim
  var FIT = RIM * 2 / SQ3 + 6;         // radius that must fit on screen
  var GEO = { a0: A0, bh: BH, rows: ROWS, spawn: SPAWN, rim: RIM };
  var COLLAPSE = 320, GROW = 0.45, FADE = 0.32, COMBO_T = 3.2;

  var store = K.store('kahf-hextris'), progress = K.progress(store, COUNT);
  var canvas = document.getElementById('stage');

  // ---------- state ----------
  var level = 1, world = 0, cfg = null, endless = false;
  var stacks = [[], [], [], [], [], []], falling = [], queue = [];
  var rot = 0, ang = 0, angV = 0, lean = 0, pulse = 0;
  var lives = 3, livesLost = 0, score = 0, groups = 0, combo = 0, lastClear = -99, clock = 0, spawnT = 0, graceT = 0;
  var state = 'idle', bannerT = 0, time = 0, warnSides = [0, 0, 0, 0, 0, 0], warnT = 0, rush = 0;
  var hint = null, tapsL = 0, tapsR = 0, best = store.get('best', 0), endLevelT = 0, sweep = -1;
  var motes = [];

  // ---------- layout ----------
  var G = { s: 1, cx: 0, cy: 0, dpr: 1, w: 0, h: 0 };
  var bg = null, bgKey = '', plateImg = null, medImg = null, sprites = {};
  var stage = K.stage(canvas, function (st) {
    G.w = st.w; G.h = st.h; G.dpr = st.dpr;
    var top = st.safe.top + 8, bot = st.safe.bottom + 8, left = st.safe.left + 8, right = st.safe.right + 8;
    var portrait = st.h > st.w * 1.15;
    if (portrait) top += 58; // the HUD row sits above the field on tall screens
    var aw = st.w - left - right, ah = st.h - top - bot;
    G.s = Math.min(aw, ah) / (FIT * 2);
    G.s = Math.min(G.s, 2.1);
    G.cx = left + aw / 2; G.cy = top + ah / 2;
    if (portrait) G.cy = Math.min(G.cy, st.h * 0.53);
    bg = null; plateImg = null; medImg = null; sprites = {};
  });
  var ctx = stage.ctx;

  // ---------- HUD ----------
  var HEXI = '<svg viewBox="-12 -12 24 24" style="width:20px;height:20px"><path d="M10 0 5 8.7-5 8.7-10 0-5-8.7 5-8.7Z" fill="COL" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/></svg>';
  var GROUPI = '<svg viewBox="0 0 30 24" style="width:24px;height:20px"><path d="M8 3 13 3 15.5 7.5 13 12 8 12 5.5 7.5Z" fill="#2f7be6"/><path d="M17 3 22 3 24.5 7.5 22 12 17 12 14.5 7.5Z" fill="#2f7be6"/><path d="M12.5 12 17.5 12 20 16.5 17.5 21 12.5 21 10 16.5Z" fill="#2f7be6"/><g fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1"><path d="M8 4.5h5M17 4.5h5M12.5 13.5h5"/></g></svg>';
  var STARI = '<svg viewBox="-50 -50 100 100" style="width:20px;height:20px"><path d="M0-46 13-31 32-32 31-13 46 0 31 13 32 32 13 31 0 46-13 31-32 32-31 13-46 0-31-13-32-32-13-31Z" fill="#f6c453" stroke="#7a4a12" stroke-width="5"/></svg>';
  var pLevel = K.ui.pill(''), pHearts = K.ui.hearts(3);
  K.ui.spacer();
  var pGoal = K.ui.pill('');
  K.ui.iconButton('pause', 'Pause', function () { if (state === 'play') pause(); });
  function hud() {
    var W = A.WORLDS[world];
    pLevel.set(HEXI.replace('COL', W.color) + (endless ? '<span>&infin;</span>' : '<span>' + (G.w < 400 ? '' : 'Level ') + level + '</span>'));
    pHearts.setMax(3); pHearts.setLives(lives);
    if (endless) pGoal.set(STARI + '<span>' + score.toLocaleString() + '</span>');
    else {
      var g = cfg.goal, have = g.type === 'groups' ? groups : score, pct = Math.min(100, Math.round(have / g.n * 100));
      pGoal.set((g.type === 'groups' ? GROUPI : STARI) + '<span>' + Math.min(have, g.n).toLocaleString() + ' / ' + g.n.toLocaleString() +
        '</span><span class="hx-bar"><i style="width:' + pct + '%"></i></span>');
    }
  }

  // ---------- levels ----------
  function reset() {
    stacks = [[], [], [], [], [], []]; falling = []; queue = [];
    lives = 3; livesLost = 0; score = 0; groups = 0; combo = 0; lastClear = -99; clock = 0; spawnT = 1.1; graceT = 0;
    warnSides = [0, 0, 0, 0, 0, 0]; sweep = -1; rush = 0;
    K.fx.clear();
  }
  function startLevel(n) {
    endless = false;
    level = K.clamp(n, 1, COUNT); world = LV.worldOf(level); cfg = LV.list[level - 1];
    progress.setCurrent(level);
    reset();
    state = 'play'; bannerT = 2.0;
    K.sfx.play('start');
    hud();
    if (hint) { hint.hide(); hint = null; }
    tapsL = tapsR = 0;
    if (level === 1) hint = K.ui.hint(arrowSvg(-1) + ' Tap left &nbsp;·&nbsp; Tap right ' + arrowSvg(1), G.h > G.w ? 70 : 14, true);
  }
  function startEndless() {
    endless = true; level = 0; world = 1; cfg = LV.endless(0);
    reset();
    state = 'play'; bannerT = 2.0;
    K.sfx.play('start');
    if (hint) { hint.hide(); hint = null; }
    hud();
  }
  function arrowSvg(dir) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="#ffd36b" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px">' +
      (dir < 0 ? '<path d="M18 16a7 7 0 1 0-12-5"/><path d="M3 7l3 4 4-3"/>' : '<path d="M6 16a7 7 0 1 1 12-5"/><path d="M21 7l-3 4-4-3"/>') + '</svg>';
  }

  // ---------- helpers on stacks ----------
  function side(lane) { return ((lane - rot) % 6 + 6) % 6; }
  function liveCount(s) { var n = 0; for (var i = 0; i < stacks[s].length; i++) if (!stacks[s][i].del) n++; return n; }
  function settled(b, j) { return Math.abs(b.d - (A0 + j * BH)) < 0.01; }

  // ---------- spawning (patterns adapted from Hextris' wave generator) ----------
  // Size of the group a tile of colour c would make if it landed on side s now.
  function groupIf(s, c) {
    var j = stacks[s].length, seen = {}, list = [[s, j]], n = 0;
    seen[s + ',' + j] = 1;
    while (list.length) {
      var p = list.pop(); n++;
      var nb = [[(p[0] + 1) % 6, p[1]], [(p[0] + 5) % 6, p[1]], [p[0], p[1] + 1], [p[0], p[1] - 1]];
      for (var i = 0; i < 4; i++) {
        var a = nb[i], t = stacks[a[0]][a[1]], key = a[0] + ',' + a[1];
        if (!t || seen[key] || t.del || t.c !== c) continue;
        seen[key] = 1; list.push(a);
      }
    }
    return n;
  }
  // Colour for a new tile in this lane. With chance cfg.help it is a colour that clears somewhere else, so
  // turning the medallion to the right spot is rewarded. Otherwise it is random, but (chance cfg.avoid) not a
  // colour that would clear right where it falls: matches come from turning, not from waiting.
  function pickColor(lane) {
    var n = cfg.colors, s0 = side(lane), c, i;
    if (Math.random() < cfg.help) {
      var good = [];
      for (var s = 0; s < 6; s++) if (s !== s0) for (c = 0; c < n; c++) if (groupIf(s, c) >= 3 && groupIf(s0, c) < 3) good.push(c);
      if (good.length) return good[(Math.random() * good.length) | 0];
    }
    for (i = 0; i < 4; i++) { c = (Math.random() * n) | 0; if (Math.random() >= cfg.avoid || groupIf(s0, c) < 3) return c; }
    return c;
  }
  function pickPattern() {
    var tot = 0, p = cfg.patterns, k;
    for (k in p) tot += p[k];
    var r = Math.random() * tot;
    for (k in p) { r -= p[k]; if (r <= 0) return k; }
    return 'single';
  }
  function spawnPattern() {
    var name = pickPattern(), l = (Math.random() * 6) | 0, c = pickColor(l), cost = 1;
    if (name === 'single') queue.push({ t: 0, lane: l, c: c });
    else if (name === 'double') { queue.push({ t: 0, lane: l, c: c }, { t: 0, lane: (l + 1) % 6, c: Math.random() < 0.5 ? c : pickColor((l + 1) % 6) }); cost = 1.5; }
    else if (name === 'cross') { queue.push({ t: 0, lane: l, c: c }, { t: 0, lane: (l + 3) % 6, c: c }); cost = 1.5; }
    else if (name === 'half') { var c2 = Math.random() < 0.5 ? c : pickColor((l + 1) % 6); queue.push({ t: 0, lane: l, c: c }, { t: 0, lane: (l + 1) % 6, c: c2 }, { t: 0, lane: (l + 2) % 6, c: c }); cost = 2.1; }
    else if (name === 'spiral') { var dir = Math.random() < 0.5 ? 1 : -1; for (var i = 0; i < 4; i++) queue.push({ t: i * 0.5, lane: (l + dir * i + 12) % 6, c: i % 2 ? pickColor((l + dir * i + 12) % 6) : c }); cost = 2.6; }
    else if (name === 'ring') { var cc = [c, pickColor((l + 1) % 6)]; for (var j = 0; j < 6; j++) queue.push({ t: 0, lane: j, c: cc[j % 2] }); cost = 3.2; }
    return cost;
  }
  function goalFrac() {
    if (endless) return Math.min(1, groups / 60);
    var g = cfg.goal; return Math.min(1, (g.type === 'groups' ? groups : score) / g.n);
  }
  function fallSpeed() { return cfg.speed * (1 + 0.15 * goalFrac()); }

  // ---------- input: tap the left or right half of the screen ----------
  function toGame(sx, sy) { return { x: sx, y: sy }; }
  K.pointer(canvas, toGame, {
    down: function (p) { if (state === 'play') turn(p.sx < G.cx ? -1 : 1); }
  });
  addEventListener('keydown', function (e) {
    if (e.repeat && e.key !== 'ArrowDown') return;
    if (state === 'play') {
      if (e.key === 'ArrowLeft' || e.key === 'a') turn(-1);
      else if (e.key === 'ArrowRight' || e.key === 'd') turn(1);
    }
    if (e.key === 'Escape' || e.key === 'p') { if (state === 'play') pause(); }
  });

  function turn(dir) {
    rot += dir; angV += dir * 2.2; lean += dir;
    K.sfx.play('rotate', { dir: dir }); K.buzz(5);
    if (dir < 0) tapsL++; else tapsR++;
    if (hint && (tapsL > 0 && tapsR > 0 || tapsL + tapsR >= 4)) { hint.hide(); hint = null; }
    // any tile in its grow-in phase follows its lane, nothing else changes: landing uses the new rotation
  }

  // ---------- simulation ----------
  function step(dt) {
    time += dt;
    K.fx.update(dt);
    // medallion turn: a springy ease to the target angle (slight overshoot feels like a heavy wheel)
    var target = rot * 60 * DEG, k = 260, damp = 2 * Math.sqrt(k) * 0.72;
    angV += ((target - ang) * k - angV * damp) * dt; ang += angV * dt;
    lean *= Math.exp(-dt * 3); pulse = Math.max(0, pulse - dt * 4);
    if (bannerT > 0) bannerT -= dt;
    motes.forEach(function (m) { m.ph += dt; m.y -= dt * 0.01 * m.v; m.x += Math.sin(m.ph * 0.7) * dt * 0.004; if (m.y < -0.05) { m.y = 1.05; m.x = Math.random(); } });
    if (state === 'clear' || state === 'fail' || state === 'over') { stepClearAnim(dt); return; }
    if (state !== 'play') return;
    clock += dt;

    // spawn
    if (graceT > 0) graceT -= dt;
    else {
      spawnT -= dt;
      if (spawnT <= 0) {
        var gp = cfg.gap, f = goalFrac();
        spawnT = (gp[0] + (gp[1] - gp[0]) * f) * spawnPattern();
      }
    }
    for (var q = queue.length - 1; q >= 0; q--) {
      queue[q].t -= dt;
      if (queue[q].t <= 0) { var it = queue.splice(q, 1)[0]; falling.push({ lane: it.lane, c: it.c, d: SPAWN, grow: 0, flash: 0 }); }
    }

    // falling tiles
    var v = fallSpeed() * (rush ? 2.5 : 1) * (K.keys.ArrowDown ? 2.5 : 1);
    for (var i = falling.length - 1; i >= 0; i--) {
      var b = falling[i];
      if (b.grow < 1) { b.grow = Math.min(1, b.grow + dt / GROW); continue; }
      b.d -= v * dt;
      var s = side(b.lane), top = A0 + stacks[s].length * BH;
      if (b.d <= top) {
        falling.splice(i, 1);
        var nb = { c: b.c, d: top, del: 0, flash: 1, check: true, squash: 1 };
        stacks[s].push(nb);
        landFx(b.lane, top);
      }
    }

    // stacks: collapse after a clear, fade cleared tiles, flash and squash
    for (var s2 = 0; s2 < 6; s2++) {
      var st = stacks[s2];
      for (var j = 0; j < st.length; j++) {
        var t = st[j], rest = A0 + j * BH;
        t.flash = Math.max(0, t.flash - dt * 3); t.squash = Math.max(0, (t.squash || 0) - dt * 5);
        if (t.d > rest + 0.01) { t.d = Math.max(rest, t.d - COLLAPSE * dt); if (t.d === rest) { t.check = true; t.squash = 0.6; } }
        else t.d = rest;
        if (t.del) t.del += dt;
      }
      for (var r = st.length - 1; r >= 0; r--) if (st[r].del >= FADE) st.splice(r, 1);
    }

    // matching
    for (var s3 = 0; s3 < 6; s3++) for (var j2 = 0; j2 < stacks[s3].length; j2++) {
      var tb = stacks[s3][j2];
      if (tb.check && !tb.del && settled(tb, j2)) { tb.check = false; match(s3, j2); }
    }

    // near-full warning and overflow
    var anyNew = false;
    for (var s4 = 0; s4 < 6; s4++) {
      var n = liveCount(s4), w = n >= ROWS - 1 ? 1 : 0;
      if (w && !warnSides[s4]) anyNew = true;
      warnSides[s4] = w;
      if (n > ROWS) { overflow(); break; }
    }
    warnT -= dt;
    if (anyNew && warnT <= 0 && state === 'play') { K.sfx.play('warn'); warnT = 1.4; }
  }

  function match(s, j) {
    var col = stacks[s][j].c, seen = {}, list = [[s, j]], out = [];
    seen[s + ',' + j] = 1;
    while (list.length) {
      var p = list.pop(); out.push(p);
      var nb = [[(p[0] + 1) % 6, p[1]], [(p[0] + 5) % 6, p[1]], [p[0], p[1] + 1], [p[0], p[1] - 1]];
      for (var i = 0; i < 4; i++) {
        var a = nb[i], t = stacks[a[0]][a[1]], key = a[0] + ',' + a[1];
        if (!t || seen[key] || t.del || t.c !== col || !settled(t, a[1])) continue;
        seen[key] = 1; list.push(a);
      }
    }
    if (out.length < 3) return;
    out.forEach(function (p) { stacks[p[0]][p[1]].del = 0.0001; });
    // combo: groups cleared close together build up
    combo = clock - lastClear < COMBO_T ? combo + 1 : 1;
    lastClear = clock;
    groups++;
    var pts = 10 * out.length * combo;
    score += pts;
    if (endless) { cfg = LV.endless(groups); if (score > best) { best = score; store.set('best', best); } }
    clearFx(out, col, pts);
    hud(); pGoal.bump();
    if (!endless && goalFrac() >= 1) win();
  }

  function overflow() {
    lives--; livesLost++;
    hud(); pHearts.bump();
    K.buzz(40); K.fx.shake(10, 0.35);
    if (lives <= 0) { lose(); return; }
    // the save: a breeze sweeps every tile beyond the second row away, and falling tiles blow off
    K.sfx.play('save');
    for (var s = 0; s < 6; s++) stacks[s].forEach(function (t, j) { if (j >= 2 && !t.del) { t.del = 0.0001; var p = pos(s, j, true); K.fx.burst(p.x, p.y, { n: 3, colors: [A.GLAZES[t.c].c, '#ffffff'], speed: 260, size: 9, life: 0.6, gravity: 0 }); } });
    falling.forEach(function (b) { var p = lanePos(b.lane, b.d); K.fx.burst(p.x, p.y, { n: 4, color: A.GLAZES[b.c].c, speed: 200, size: 8, life: 0.5, gravity: 0 }); });
    falling = []; queue = []; graceT = 1.8; spawnT = 0.6; combo = 0;
    K.fx.text(0, -A0 - 40, lives === 1 ? 'Last heart!' : 'Saved!', { size: 40, color: '#ffe0e8', stroke: 'rgba(60,10,30,.6)', life: 1.4 });
  }

  // ---------- fx positions ----------
  function pos(s, j, rotated) { // centre of tile j on side s, in field units (screen orientation)
    var a = (-90 + s * 60) * DEG + (rotated ? ang : 0), r = A0 + j * BH + BH / 2;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  }
  function lanePos(l, d) { var a = (-90 + l * 60) * DEG, r = d + BH / 2; return { x: Math.cos(a) * r, y: Math.sin(a) * r }; }

  function landFx(lane, d) {
    var p = lanePos(lane, d), a = (-90 + lane * 60) * DEG;
    K.sfx.play('land', { pan: Math.cos(a) * 0.6 });
    pulse = Math.min(1, pulse + 0.5);
    K.fx.burst(p.x - Math.cos(a) * BH * 0.45, p.y - Math.sin(a) * BH * 0.45, { n: 5, colors: ['#ffffff', '#fff1c4'], speed: 110, size: 5, life: 0.35, gravity: 0, shape: 'dot', drag: 0.9 });
  }
  function clearFx(out, ci, pts) {
    var col = A.GLAZES[ci].c, cx = 0, cy = 0;
    K.sfx.play('combo', { step: combo, n: out.length });
    K.buzz(12);
    out.forEach(function (p) {
      var q = pos(p[0], p[1], true); cx += q.x; cy += q.y;
      K.fx.burst(q.x, q.y, { n: 7, colors: [col, A.shade(col, 0.4), A.shade(col, -0.25)], speed: 260, size: 10, life: 0.7, gravity: 0, drag: 0.95 });
      K.fx.burst(q.x, q.y, { n: 3, color: '#fff6cf', speed: 120, size: 12, life: 0.7, shape: 'star', gravity: -40 });
    });
    cx /= out.length; cy /= out.length;
    var cheer = combo >= 4 ? 'Amazing!' : combo === 3 ? 'Super!' : combo === 2 ? 'Great!' : out.length >= 5 ? 'Wow!' : null;
    K.fx.text(cx, cy, '+' + pts, { size: 30, rise: 60, life: 0.8 });
    if (cheer) { K.fx.text(0, -A0 - 20, cheer, { size: 46, color: '#fff3c2', stroke: 'rgba(40,20,60,.6)', life: 1.1 }); K.fx.shake(4, 0.15); }
  }

  // ---------- win / lose ----------
  var PRAISE = ['mashaallah', 'ahsant', 'barakallah', 'subhanallah', 'alhamdulillah', 'allahuakbar'];
  function win() {
    state = 'clear'; endLevelT = 0; sweep = 0;
    var stars = livesLost === 0 ? 3 : livesLost === 1 ? 2 : 1;
    progress.finish(level, stars);
    K.bridge.complete();
    K.sfx.play('win');
    setTimeout(function () { if (!DEBUG) K.say.praise(PRAISE[(level - 1) % PRAISE.length]); }, 650);
    falling.forEach(function (b) { var p = lanePos(b.lane, b.d); K.fx.burst(p.x, p.y, { n: 6, color: A.GLAZES[b.c].c, speed: 200, size: 8, life: 0.5, gravity: 0 }); });
    falling = []; queue = [];
    var last = level === COUNT, endOfWorld = level % PER === 0;
    setTimeout(function () {
      if (state !== 'clear') return;
      var buttons = [];
      if (!last) buttons.push({ label: endOfWorld ? 'Next World' : 'Next Level', icon: 'next', primary: true, onClick: function () { startLevel(level + 1); } });
      buttons.push({ label: last ? 'Play Again' : 'Replay', icon: 'restart', row: true, primary: last, onClick: function () { startLevel(last ? 1 : level); } });
      buttons.push({ label: 'Levels', icon: 'levels', row: true, onClick: openLevels });
      K.ui.sheet({
        title: last ? 'You did it!' : endOfWorld ? A.WORLDS[world].name + ' done!' : 'Level complete!',
        text: last ? 'All 15 courtyards are shining. MashaAllah!' : 'Score ' + score.toLocaleString(),
        stars: stars, buttons: buttons });
    }, 1500);
  }
  // celebration: every remaining tile pops in a sweep from the centre outward
  function stepClearAnim(dt) {
    if (sweep >= 0) sweep += dt * 9;
    for (var s = 0; s < 6; s++) {
      var st = stacks[s];
      for (var j = 0; j < st.length; j++) {
        var t = st[j];
        if (!t.del && sweep >= 0 && j + s * 0.35 < sweep) {
          t.del = 0.0001; var p = pos(s, j, true), col = A.GLAZES[t.c].c;
          K.fx.burst(p.x, p.y, { n: 6, colors: [col, '#ffffff', A.shade(col, 0.4)], speed: 300, size: 10, life: 0.8, gravity: 200 });
          K.fx.burst(p.x, p.y, { n: 2, color: '#ffe9a8', speed: 160, size: 13, life: 0.9, shape: 'star', gravity: -30 });
        }
        if (t.del) t.del += dt;
        t.flash = Math.max(0, t.flash - dt * 3);
      }
      for (var r = st.length - 1; r >= 0; r--) if (st[r].del >= FADE) st.splice(r, 1);
    }
  }
  function lose() {
    state = endless ? 'over' : 'fail';
    K.sfx.play('lose');
    falling = []; queue = [];
    for (var s = 0; s < 6; s++) stacks[s].forEach(function (t) { if (!t.del) t.del = 0.0001; });
    setTimeout(function () {
      if (endless) {
        if (groups >= 5) K.bridge.complete();
        var isBest = score > 0 && score >= best;
        K.ui.sheet({ title: isBest ? 'New best!' : 'Great game!', text: 'Score ' + score.toLocaleString() + ' · Best ' + best.toLocaleString(), buttons: [
          { label: 'Play Again', icon: 'restart', primary: true, onClick: startEndless },
          { label: 'Levels', icon: 'levels', onClick: openLevels }] });
        if (isBest) K.say.praise('mashaallah');
      } else {
        K.ui.sheet({ title: 'Out of hearts', text: "Let's turn the tiles again!", buttons: [
          { label: 'Try Again', icon: 'restart', primary: true, onClick: function () { startLevel(level); } },
          { label: 'Levels', icon: 'levels', onClick: openLevels }] });
      }
    }, 900);
  }

  function pause() {
    state = 'paused';
    K.ui.sheet({ title: 'Paused', text: endless ? 'Endless · Score ' + score.toLocaleString() : A.WORLDS[world].name + ' · Level ' + level, buttons: [
      { label: 'Resume', icon: 'play', primary: true, onClick: resume },
      { label: 'Restart', icon: 'restart', row: true, onClick: function () { endless ? startEndless() : startLevel(level); } },
      { label: 'Levels', icon: 'levels', row: true, onClick: openLevels },
      { label: K.sfx.muted ? 'Sound: Off' : 'Sound: On', icon: K.sfx.muted ? 'soundOff' : 'sound', onClick: function () { K.sfx.toggle(); pause(); } },
      { label: 'About', icon: INFO, onClick: about }] });
  }
  var INFO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>';
  function about() {
    var box = document.createElement('div');
    box.className = 'hx-about';
    box.innerHTML = '<div class="hx-how"><span>' + arrowSvg(-1) + 'Tap left</span><span>Tap right' + arrowSvg(1) + '</span></div>' +
      '<p>Turn the tiles so 3 of the same colour touch.</p>' +
      '<p class="hx-credit">Based on <b>Hextris</b> by Logan Engstrom and Garrett Finucane. Free software under the GNU GPL v3; this version is GPL v3 too (see LICENSE.md).</p>';
    K.ui.sheet({ title: 'How to play', content: box, buttons: [{ label: 'Back', icon: 'play', primary: true, onClick: pause }] });
  }
  function resume() { state = 'play'; }
  var INF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 12c-2-2.7-3.6-4-5.5-4a4 4 0 0 0 0 8c1.9 0 3.5-1.3 5.5-4zm0 0c2 2.7 3.6 4 5.5 4a4 4 0 0 0 0-8c-1.9 0-3.5 1.3-5.5 4z"/></svg>';
  function openLevels() {
    var prev = state;
    state = 'paused';
    var sh = K.ui.levelSelect({
      title: 'Hextris',
      worlds: A.WORLDS.map(function (w, i) { return { name: w.name, color: w.color, from: i * PER + 1, to: i * PER + PER }; }),
      progress: progress, current: endless ? 0 : level,
      onPick: function (n) { startLevel(n); },
      onClose: function () { if (prev === 'play' || prev === 'paused') state = 'play'; else if (endless) startEndless(); else startLevel(prev === 'clear' ? progress.current() : level); }
    });
    var inner = sh.el.querySelector('.kit-sheet-in'), b = document.createElement('button');
    b.className = 'kit-btn hx-endless';
    b.innerHTML = INF + '<span>Endless</span>' + (best ? '<small>Best ' + best.toLocaleString() + '</small>' : '');
    b.onclick = function () { K.sfx.play('tap'); sh.close(); startEndless(); };
    inner.appendChild(b);
  }

  // ---------- drawing ----------
  function ensureArt() {
    var key = world + '|' + G.w + 'x' + G.h + '|' + G.dpr;
    if (!bg || bgKey !== key) {
      bg = A.paintWorld(world, G.w, G.h, G.dpr); bgKey = key;
      plateImg = A.plate(world, GEO, G.s * G.dpr); medImg = A.medallion(world, SIDE, G.s * G.dpr); sprites = {};
      motes = []; for (var i = 0; i < 26; i++) motes.push({ x: Math.random(), y: Math.random(), v: 0.4 + Math.random() * 0.8, ph: Math.random() * 6, s: 0.6 + Math.random() * 0.9 });
    }
  }
  function tileSprite(ci, k) {
    var key = ci + '|' + k;
    if (!sprites[key]) sprites[key] = A.tile(ci, k, GEO, G.s * G.dpr);
    return sprites[key];
  }
  // draw one tile: ring position d (inner edge), at angle a (radians, outward direction)
  function drawTile(ci, d, a, o) {
    var k = K.clamp(Math.round((d - A0) / BH), 0, ROWS + 3), sp = tileSprite(ci, k);
    var kd = A0 + k * BH, sx = (d + BH / 2) / (kd + BH / 2), r = d + BH / 2;
    ctx.save();
    ctx.rotate(a + Math.PI / 2); ctx.translate(0, -r);
    var sc = o.scale == null ? 1 : o.scale, sq = o.squash || 0;
    ctx.scale(sx * sc * (1 + sq * 0.08), sc * (1 - sq * 0.18));
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.drawImage(sp, -sp.cw / 2, -sp.ch / 2, sp.cw, sp.ch);
    if (o.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, o.flash) * 0.7; ctx.drawImage(sp, -sp.cw / 2, -sp.ch / 2, sp.cw, sp.ch); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
  }

  function draw(alpha, frameDt) {
    if (!G.w) return;
    ensureArt();
    var d = G.dpr, W = A.WORLDS[world], m = bg.margin, drift = Math.sin(time * 0.15) * 0.4 + K.clamp(lean, -3, 3) * 0.25;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg.sky, -m - drift * 3 * d, 0);
    ctx.drawImage(bg.far, -m - drift * 9 * d, 0);
    // drifting light motes (glaze dust in the air)
    ctx.setTransform(d, 0, 0, d, 0, 0);
    for (var i = 0; i < motes.length; i++) {
      var mo = motes[i];
      ctx.globalAlpha = (0.25 + 0.35 * Math.sin(mo.ph * 1.7 + i)) * (world === 2 ? 0.8 : 1);
      ctx.fillStyle = world === 2 ? '#fff6e0' : W.glow;
      ctx.beginPath(); ctx.arc(mo.x * G.w, mo.y * G.h, 1.6 * mo.s, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (W.lanterns) {
      var ls = Math.max(9, Math.min(G.w, G.h) * 0.028);
      [[0.1, 0.32], [0.24, 0.18], [0.76, 0.2], [0.9, 0.3]].forEach(function (L, j) {
        A.lantern(ctx, L[0] * G.w - drift * 14, 0, L[1] * G.h * (G.h > G.w ? 0.55 : 0.8), ls, Math.sin(time * 1.1 + j * 1.7) * 0.06, time);
      });
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg.near, -m - drift * 18 * d, 0);

    // field (game units around the medallion)
    var sh = K.fx.offset(), s = G.s * d;
    ctx.setTransform(s, 0, 0, s, (G.cx + sh.x * G.s) * d, (G.cy + sh.y * G.s) * d);
    ctx.drawImage(plateImg, -plateImg.half, -plateImg.half, plateImg.half * 2, plateImg.half * 2);

    // warning glow on stacks that are nearly full (drawn in the turning frame so it follows the stack)
    for (var w = 0; w < 6; w++) {
      if (!warnSides[w] || state !== 'play') continue;
      var wa = (-90 + w * 60) * DEG + ang, pr = 0.5 + 0.5 * Math.sin(time * 7);
      ctx.save(); ctx.rotate(wa + Math.PI / 2);
      var r0 = LIMIT - BH * 1.6, r1 = LIMIT + 8, gw = ctx.createLinearGradient(0, -r0, 0, -r1);
      gw.addColorStop(0, 'rgba(255,90,90,0)'); gw.addColorStop(1, 'rgba(255,110,90,' + (0.25 + 0.35 * pr) + ')');
      ctx.fillStyle = gw; ctx.beginPath(); ctx.moveTo(-r0 / SQ3, -r0); ctx.lineTo(r0 / SQ3, -r0); ctx.lineTo(r1 / SQ3, -r1); ctx.lineTo(-r1 / SQ3, -r1); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // combo timer: a golden line runs around the limit while a combo can still grow
    var left = state === 'play' && combo > 0 ? 1 - (clock - lastClear) / COMBO_T : 0;
    if (left > 0) {
      var lr = LIMIT * 2 / SQ3 + 4;
      ctx.save(); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.strokeStyle = '#ffd36b'; ctx.shadowColor = '#ffd36b'; ctx.shadowBlur = 8 * s;
      ctx.beginPath();
      var segs = 6 * left;
      for (var e = 0; e <= Math.ceil(segs); e++) {
        var u = Math.min(e, segs), i0 = Math.floor(u), fr = u - i0, va = (-120 + i0 * 60) * DEG, vb = va + 60 * DEG;
        var x = Math.cos(va) * lr + (Math.cos(vb) - Math.cos(va)) * lr * fr, y = Math.sin(va) * lr + (Math.sin(vb) - Math.sin(va)) * lr * fr;
        if (e === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke(); ctx.restore();
    }

    // stacked tiles turn with the medallion
    for (var si = 0; si < 6; si++) {
      var st = stacks[si], a = (-90 + si * 60) * DEG + ang;
      for (var j = 0; j < st.length; j++) {
        var t = st[j], fade = t.del ? Math.min(1, t.del / FADE) : 0;
        drawTile(t.c, t.d, a, { flash: t.del ? 1 - fade * 0.5 : t.flash, alpha: 1 - fade, scale: 1 - fade * 0.45, squash: t.squash });
      }
    }
    // falling tiles grow in, then drift toward the centre
    for (var fi = 0; fi < falling.length; fi++) {
      var b = falling[fi], ga = K.ease.outBack(b.grow);
      drawTile(b.c, b.d, (-90 + b.lane * 60) * DEG, { scale: Math.max(0.05, ga), alpha: Math.min(1, b.grow * 2) });
    }
    // medallion
    ctx.save(); ctx.rotate(ang);
    var ms = 1 + pulse * 0.05;
    ctx.scale(ms, ms);
    ctx.drawImage(medImg, -medImg.half, -medImg.half, medImg.half * 2, medImg.half * 2);
    ctx.restore();

    // level 1 help: arrows over the field show which way each side turns it
    if (hint && state === 'play') {
      var hr = LIMIT * 2 / SQ3 + 18;
      if (!tapsL) A.turnArrow(ctx, hr, -1, time, '#ffd36b');
      if (!tapsR) A.turnArrow(ctx, hr, 1, time + 0.8, '#ffd36b');
      // tap ripples on each side of the screen
      [-1, 1].forEach(function (dir) {
        if ((dir < 0 ? tapsL : tapsR) > 0) return;
        var px = dir * Math.min(hr * 0.8, (G.w / 2 - 40) / G.s), py = hr * 0.25, ph = (time * 0.9 + (dir > 0 ? 0.5 : 0)) % 1;
        ctx.save(); ctx.globalAlpha = 0.8 * (1 - ph); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(px, py, 10 + ph * 40, 0, 6.283); ctx.stroke();
        ctx.globalAlpha = 0.85; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px, py, 9, 0, 6.283); ctx.fill();
        ctx.restore();
      });
    }

    K.fx.draw(ctx);

    // level banner
    if (bannerT > 0) {
      var kk = Math.min(1, bannerT / 0.4, (2.0 - bannerT) / 0.3), by = -LIMIT * 0.55;
      ctx.globalAlpha = Math.max(0, kk);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.font = '800 22px Nunito, system-ui, sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(10,6,30,.6)';
      var sub = endless ? 'Best ' + best.toLocaleString() : W.name.toUpperCase();
      ctx.strokeText(sub, 0, by - 40); ctx.fillStyle = W.color; ctx.fillText(sub, 0, by - 40);
      ctx.font = '900 54px Nunito, system-ui, sans-serif'; ctx.lineWidth = 10;
      var big = endless ? 'Endless' : 'Level ' + level;
      ctx.strokeText(big, 0, by); ctx.fillStyle = '#fffaf0'; ctx.fillText(big, 0, by);
      if (!endless) {
        ctx.font = '800 24px Nunito, system-ui, sans-serif'; ctx.lineWidth = 6;
        ctx.strokeText(cfg.name, 0, by + 40); ctx.fillStyle = 'rgba(255,250,240,.92)'; ctx.fillText(cfg.name, 0, by + 40);
      }
      ctx.globalAlpha = 1;
    }
  }

  K.loop({ step: step, draw: draw, hz: 120, onHidden: function () { if (state === 'play' && !DEBUG) pause(); } });

  // Test hook (only with ?debug in the URL): step the game by hand, turn it and inspect it.
  if (DEBUG) window.HX = {
    run: function (sec) { for (var i = 0; i < Math.round(sec * 120); i++) step(1 / 120); draw(0, 0); },
    draw: function () { draw(0, 0); },
    start: startLevel, endless: startEndless, turn: turn, pause: pause, levels: openLevels, about: about,
    rush: function (on) { rush = on ? 1 : 0; },
    get: function () {
      return { state: state, level: level, endless: endless, lives: lives, groups: groups, score: score, combo: combo, rot: rot, rows: ROWS,
        goal: cfg && cfg.goal, colors: cfg && cfg.colors, best: best,
        falling: falling.map(function (b) { return { lane: b.lane, c: b.c, d: Math.round(b.d * 10) / 10, grow: b.grow }; }),
        // stacks in medallion-local sides: side s faces lane (s + rot) mod 6
        stacks: stacks.map(function (st) { return st.filter(function (t) { return !t.del; }).map(function (t) { return t.c; }); }),
        A0: A0, BH: BH, speed: cfg ? fallSpeed() : 0, G: { s: G.s, cx: G.cx, cy: G.cy } };
    },
    win: function () { if (state === 'play') win(); }, progress: progress
  };

  // Start once the font is ready (max 700 ms) so the banner text is crisp; the loop only draws until then.
  var fontsReady = document.fonts && document.fonts.load ? document.fonts.load('900 40px Nunito') : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 700); })]).catch(function () {}).then(function () {
    startLevel(progress.current());
  });
})();
