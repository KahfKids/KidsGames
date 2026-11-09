/* Ramadan Maze: game.js
   Walk the kid home for iftar. Drag to steer: the kid glides along the corridor in the drag direction and keeps
   going while the finger is held; a turn asked for early waits for the next opening. Swipe and let go to glide to
   the next junction; tap a nearby spot to walk there. Gather dates (and water cups and lanterns) for stars.
   Built on the shared kit (js/kit): full-screen stage, fixed-step loop, pointer input, fx, sfx, ui, progress. */
(function () {
  'use strict';
  var A = window.MazeArt, LV = window.MAZE_LEVELS, K = window.Kit;
  var COUNT = LV.count, DEBUG = /[?&]debug\b/.test(location.search);
  var N = LV.N, E = LV.E, S = LV.S, W = LV.W, DX = LV.DX, DY = LV.DY, OPP = LV.OPP, DIRS = LV.DIRS;
  var ANG = {}; ANG[E] = 0; ANG[S] = Math.PI / 2; ANG[W] = Math.PI; ANG[N] = -Math.PI / 2;
  var TR = {}; TR[N] = W; TR[W] = N; TR[E] = S; TR[S] = E; TR[0] = 0; // swap of axes (maze turned for the screen)
  var SPEED = 4.4, ACCEL = 30, TAP_STEPS = 14;

  var store = K.store('kahf-ramadan-maze'), progress = K.progress(store, COUNT);
  var canvas = document.getElementById('stage');

  // ---------- state ----------
  var level = 1, world = 0, maze = null, items = [], kid = null, state = 'play', time = 0, bannerT = 0;
  var got = 0, gotLanterns = 0, total = 0, noteStep = 0;
  var input = { ptr: false, key: 0, want: 0, ax: 0, ay: 0, sx: 0, sy: 0, downT: 0, dragged: false, route: null };
  var movedOnce = !!store.get('moved', false), hint = null;
  var flyers = [], marker = null, ambient = [];
  var home = { open: 0, lit: 0 }, celeb = { k: 0, on: false, t: 0 };
  var ambT = 2, lightGrow = 0; // lightGrow eases toward the number of lanterns found

  // ---------- layout ----------
  var G = { w: 0, h: 0, dpr: 1, safe: null, C: 60, ox: 0, oy: 0, cx: 0, cy: 0, scrollX: false, scrollY: false, area: null };
  var art = { bg: null, fg: null, mz: null, bgKey: '', mzKey: '', dark: null };
  var stage = K.stage(canvas, function (st) {
    G.w = st.w; G.h = st.h; G.dpr = st.dpr; G.safe = st.safe;
    art.bg = null; art.dark = null;
    if (maze) { layout(true); if (hint) hint.style.bottom = 'calc(' + hintBottom() + 'px + var(--kit-sb))'; }
  });
  var ctx = stage.ctx;

  function layout(snap) {
    var s = G.safe, l = s.left + 8, r = G.w - s.right - 8, t = s.top + 64, b = G.h - s.bottom - 8;
    G.area = { l: l, t: t, r: r, b: b };
    var aw = r - l, ah = b - t;
    // stand the maze the same way as the screen (tall maze on a portrait phone)
    if (maze.cols !== maze.rows && (ah > aw) !== (maze.rows > maze.cols)) turnMaze();
    var fit = Math.min(aw / (maze.cols + 0.4), ah / (maze.rows + 0.4));
    // big screens: cells grow and the maze fills the screen; phones: if it can't fit at 40 px a cell, the camera scrolls
    G.C = Math.floor(fit >= 40 ? Math.min(fit, 150) : 46);
    G.scrollX = maze.cols * G.C + G.C * 0.4 > aw + 1;
    G.scrollY = maze.rows * G.C + G.C * 0.4 > ah + 1;
    camera(1, snap);
  }
  // Camera: centred when the maze fits; otherwise it follows the kid with a smooth glide.
  function camera(dt, snap) {
    var C = G.C, a = G.area, mw = maze.cols * C, mh = maze.rows * C, m = C * 0.3;
    var kp = kidPos(), tx, ty;
    if (!G.scrollX) tx = (a.l + a.r - mw) / 2;
    else tx = K.clamp((G.w / 2) - (kp.rx + 0.5) * C, a.r - m - mw, a.l + m);
    if (!G.scrollY) ty = (a.t + a.b - mh) / 2;
    else ty = K.clamp((a.t + a.b) / 2 - (kp.ry + 0.5) * C, a.b - m - mh, a.t + m);
    if (snap) { G.ox = tx; G.oy = ty; }
    else { var k = 1 - Math.exp(-dt * 5); G.ox += (tx - G.ox) * k; G.oy += (ty - G.oy) * k; }
    G.cx = (a.l + a.r - mw) / 2; G.cy = (a.t + a.b - mh) / 2;
  }
  function turnMaze() {
    maze = LV.transpose(maze);
    items.forEach(function (it) { var t = it.x; it.x = it.y; it.y = t; });
    if (kid) {
      var t = kid.x; kid.x = kid.y; kid.y = t; t = kid.rx; kid.rx = kid.ry; kid.ry = t;
      kid.dir = TR[kid.dir]; kid.ang = Math.PI / 2 - kid.ang;
    }
    input.want = TR[input.want];
    if (input.route) input.route = input.route.map(function (d) { return TR[d]; });
    marker = null; art.mz = null;
  }

  // ---------- HUD ----------
  var pLevel = K.ui.pill(''), pItems = K.ui.pill('');
  K.ui.spacer();
  K.ui.iconButton('pause', 'Pause', function () { if (state === 'play') pause(); });
  function hud() {
    pLevel.set('<svg viewBox="-50 -50 100 100" style="width:18px;height:18px"><path d="M0-46 13-31 32-32 31-13 46 0 31 13 32 32 13 31 0 46-13 31-32 32-31 13-46 0-31-13-32-32-13-31Z" fill="' +
      A.WORLDS[world].color + '"/></svg>Level ' + level);
    pItems.set(A.dateIcon + got + ' / ' + total);
  }

  // ---------- levels ----------
  function startLevel(n) {
    level = K.clamp(n, 1, COUNT); world = LV.worldOf(level);
    progress.setCurrent(level);
    maze = LV.generate(level);
    items = maze.items.map(function (it) { return { x: it.x, y: it.y, type: it.type, taken: false, ph: Math.random() * 6 }; });
    total = items.length; got = 0; gotLanterns = 0; noteStep = 0; ambT = 1.5; lightGrow = 0;
    kid = { x: maze.start[0], y: maze.start[1], dir: 0, p: 0, v: 0, rx: maze.start[0], ry: maze.start[1], ang: -Math.PI / 2,
            walk: 0, foot: 0, sq: 0, jump: 0, bump: 0, bumpDir: 0, bumped: 0, glide: 0, hide: 0 };
    input.want = 0; input.route = null; input.ptr = false; input.key = 0;
    flyers = []; marker = null; home = { open: 0, lit: 0 }; celeb = { k: 0, on: false, t: 0 };
    makeAmbient();
    K.fx.clear();
    art.mz = null;
    layout(true);
    // face the way out of the start cell
    var o = cellAt(kid.x, kid.y);
    for (var i = 0; i < 4; i++) if (o & DIRS[i]) { kid.ang = ANG[DIRS[i]]; break; }
    state = 'play'; bannerT = 1.9;
    hud();
    showHint();
  }
  // At most one hint pill ever exists: it is created once (until the first move) and only moved after that.
  function hintBottom() { return G.h < 520 ? 10 : Math.min(120, Math.max(16, (G.h - G.safe.bottom - (G.oy + maze.rows * G.C)) / 2 - 24)); }
  function showHint() {
    if (movedOnce) { if (hint) { hint.hide(); hint = null; } return; }
    [].forEach.call(document.querySelectorAll('.kit-hint'), function (el) { if (el !== hint) el.remove(); });
    if (!hint) hint = K.ui.hint('Drag to walk home', hintBottom(), true);
    else hint.style.bottom = 'calc(' + hintBottom() + 'px + var(--kit-sb))';
  }
  function cellAt(x, y) { return x < 0 || y < 0 || x >= maze.cols || y >= maze.rows ? 0 : maze.cells[y * maze.cols + x]; }
  function kidPos() { return { x: kid.x + DX[kid.dir || N] * (kid.dir ? kid.p : 0), y: kid.y + DY[kid.dir || N] * (kid.dir ? kid.p : 0), rx: kid.rx, ry: kid.ry }; }

  function makeAmbient() {
    ambient = [];
    for (var i = 0; i < 18; i++) ambient.push({ x: Math.random(), y: Math.random(), v: 0.3 + Math.random() * 0.7, ph: Math.random() * 6.28, s: 0.6 + Math.random() * 0.8 });
  }

  // ---------- input ----------
  // Drag: every ~14 px of finger travel picks the main direction. The kid keeps going while the finger is down.
  function setWant(d, fromUser) {
    if (state !== 'play' || !d || !kid) return;
    if (input.want !== d) kid.bumped = 0;
    input.want = d; input.route = null; marker = null;
    if (kid.dir && d === OPP[kid.dir]) { // turn right round straight away
      kid.x += DX[kid.dir]; kid.y += DY[kid.dir]; kid.dir = d; kid.p = 1 - kid.p;
    } else if (kid.dir && d !== kid.dir && kid.p < 0.22 && (cellAt(kid.x, kid.y) & d)) {
      // asked a moment too late: take the turn we just passed (the drawn kid eases over, no jump)
      kid.dir = d; kid.p = 0.0001;
    }
    if (fromUser && !movedOnce) { movedOnce = true; store.set('moved', true); }
    if (fromUser && hint) { hint.hide(); hint = null; }
  }
  function toGame(sx, sy) { return { x: sx, y: sy }; }
  K.pointer(canvas, toGame, {
    down: function (p) {
      if (state !== 'play') return;
      input.ptr = true; input.ax = input.sx = p.sx; input.ay = input.sy = p.sy; input.downT = time; input.dragged = false;
    },
    move: function (p) {
      if (!input.ptr || state !== 'play') return;
      var dx = p.sx - input.ax, dy = p.sy - input.ay, thr = K.clamp(G.C * 0.22, 12, 22);
      if (dx * dx + dy * dy < thr * thr) return;
      var d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? E : W) : (dy > 0 ? S : N);
      if (d !== input.want || !kid.dir) K.sfx.play('turn');
      setWant(d, true);
      input.ax = p.sx; input.ay = p.sy; input.dragged = true;
    },
    up: function (p) {
      if (!input.ptr) return;
      input.ptr = false;
      if (state !== 'play' || !kid) return;
      var moved = Math.hypot(p.sx - input.sx, p.sy - input.sy);
      if (!input.dragged && moved < 16 && time - input.downT < 0.45) tapAt(p.sx, p.sy);
      else release();
    }
  });
  // Letting go: keep gliding to the next junction (a turn asked for earlier still waits for its opening).
  function release() { if (!kid) return; if (!input.ptr && !input.key && (input.want === kid.dir || !kid.dir)) input.want = 0; kid.glide = 0; }

  var KEYDIR = { ArrowUp: N, ArrowDown: S, ArrowLeft: W, ArrowRight: E, w: N, s: S, a: W, d: E };
  addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'p') { if (state === 'play') pause(); return; }
    var d = KEYDIR[e.key]; if (!d || state !== 'play') return;
    input.key = d; setWant(d, true);
  });
  addEventListener('keyup', function (e) { if (KEYDIR[e.key] && KEYDIR[e.key] === input.key) { input.key = 0; release(); } });

  // Tap a spot close by and the kid walks there.
  function tapAt(sx, sy) {
    var C = G.C, H = art.mz ? art.mz.H : C * 0.2;
    var cx = Math.floor((sx - G.ox) / C), cy = Math.floor((sy - G.oy + H / 2) / C);
    if (cx < 0 || cy < 0 || cx >= maze.cols || cy >= maze.rows) return;
    var from = kid.dir ? [kid.x + DX[kid.dir], kid.y + DY[kid.dir]] : [kid.x, kid.y];
    if (cx === Math.round(kid.rx) && cy === Math.round(kid.ry)) { kid.jump = 1; K.sfx.play('hop'); return; }
    var path = route(from[0], from[1], cx, cy);
    if (!path || path.length > TAP_STEPS) { marker = { x: cx, y: cy, t: 0, ok: false }; K.sfx.play('nope'); return; }
    input.want = 0; input.route = path; marker = { x: cx, y: cy, t: 0, ok: true };
    K.sfx.play('mark');
    if (!movedOnce) { movedOnce = true; store.set('moved', true); }
    if (hint) { hint.hide(); hint = null; }
  }
  function route(x0, y0, x1, y1) {
    var cols = maze.cols, prev = new Int32Array(cols * maze.rows).fill(-1), pd = new Int8Array(cols * maze.rows), q = [y0 * cols + x0], h = 0;
    prev[q[0]] = q[0];
    while (h < q.length) {
      var i = q[h++]; if (i === y1 * cols + x1) break;
      var x = i % cols, y = (i / cols) | 0, v = maze.cells[i];
      for (var d = 0; d < 4; d++) { var dir = DIRS[d]; if (!(v & dir)) continue; var j = (y + DY[dir]) * cols + x + DX[dir]; if (prev[j] < 0) { prev[j] = i; pd[j] = dir; q.push(j); } }
    }
    var end = y1 * cols + x1; if (prev[end] < 0) return null;
    var out = []; for (var k = end; k !== q[0]; k = prev[k]) out.unshift(pd[k]);
    return out;
  }

  // ---------- simulation ----------
  // Which way at a cell centre? (cur = direction we arrived in)
  function decide(cur) {
    var o = cellAt(kid.x, kid.y), back = OPP[cur], w = input.want, held = input.ptr || !!input.key;
    if (input.route) {
      if (input.route.length && (o & input.route[0])) return input.route.shift();
      input.route = null; marker = null; return 0;
    }
    if (w && w !== back && (o & w)) { if (!held && w !== cur) input.want = 0; return w; }
    var fw = []; for (var i = 0; i < 4; i++) if (DIRS[i] !== back && (o & DIRS[i])) fw.push(DIRS[i]);
    if (held) {
      if (o & cur) return cur;
      if (fw.length === 1 && fw[0] !== OPP[w]) return fw[0]; // round a bend, but never back against the finger
      return 0;
    }
    if (++kid.glide > 40) return 0;
    if (fw.length === 1 && (!w || fw[0] !== OPP[w])) return fw[0];
    return 0;
  }
  function fromRest() {
    var o = cellAt(kid.x, kid.y);
    if (input.route) {
      if (input.route.length && (o & input.route[0])) return input.route.shift();
      input.route = null; marker = null; return 0;
    }
    var w = input.want; if (!w) return 0;
    if (o & w) { if (!input.ptr && !input.key) input.want = 0; kid.glide = 0; return w; }
    if (kid.bumped !== w) { kid.bumped = w; kid.bump = 1; kid.bumpDir = w; K.sfx.play('bump', { world: world }); K.buzz(8); }
    if (!input.ptr && !input.key) input.want = 0;
    return 0;
  }

  function step(dt) {
    time += dt;
    K.fx.update(dt);
    if (!kid) return; // fonts still loading: the first level hasn't started yet
    if (bannerT > 0) bannerT -= dt;
    ambient.forEach(function (a) { a.ph += dt; a.y -= dt * 0.01 * a.v; if (a.y < -0.05) a.y = 1.05; a.x += Math.sin(a.ph * 0.7) * dt * 0.004; });
    items.forEach(function (it) { it.ph += dt; });
    for (var f = flyers.length - 1; f >= 0; f--) { flyers[f].t += dt / 0.65; if (flyers[f].t >= 1) { flyers.splice(f, 1); pItems.bump(); } }
    if (marker) { marker.t += dt; if (marker.t > (marker.ok ? 6 : 0.6)) marker = null; }
    kid.sq = Math.max(0, kid.sq - dt * 4); kid.jump = Math.max(0, kid.jump - dt * 2.4); kid.bump = Math.max(0, kid.bump - dt * 3.5);
    lightGrow += (gotLanterns - lightGrow) * (1 - Math.exp(-dt * 2.5));
    if (celeb.on) { celeb.t += dt; celeb.k = Math.min(1, celeb.k + dt / 0.6); }
    if (state === 'play') {
      stepKid(dt);
      if ((ambT -= dt) <= 0) { ambT = K.rand(4, 8); K.sfx.play('ambience', { world: world }); }
    }
    // the drawn kid eases toward the true spot: rounded corners, no jumps
    var kp = kidPos(), e = 1 - Math.exp(-dt * 22);
    if (state !== 'home') { kid.rx += (kp.x - kid.rx) * e; kid.ry += (kp.y - kid.ry) * e; }
    var ta = kid.dir ? ANG[kid.dir] : kid.ang, da = Math.atan2(Math.sin(ta - kid.ang), Math.cos(ta - kid.ang));
    kid.ang += da * Math.min(1, dt * 16);
    if (maze) camera(dt, false);
  }

  function stepKid(dt) {
    if (!kid.dir) {
      var d0 = fromRest();
      if (!d0) { kid.v = 0; return; }
      kid.dir = d0; kid.p = 0; kid.v = Math.max(kid.v, 1.2);
    }
    kid.v = Math.min(SPEED, kid.v + ACCEL * dt);
    kid.p += kid.v * dt;
    kid.walk += kid.v * dt * Math.PI * 1.7;
    var foot = Math.floor(kid.walk / Math.PI);
    if (foot !== kid.foot) { kid.foot = foot; K.sfx.play('step', { world: world, alt: foot & 1 }); }
    collect();
    var guard = 0;
    while (kid.p >= 1 && guard++ < 3) {
      kid.x += DX[kid.dir]; kid.y += DY[kid.dir]; kid.p -= 1;
      if (kid.x === maze.goal[0] && kid.y === maze.goal[1]) { kid.p = 0; arriveHome(); return; }
      var nd = decide(kid.dir);
      if (!nd) { kid.dir = 0; kid.p = 0; kid.v = 0; kid.sq = 1; return; }
      if (nd !== kid.dir) K.sfx.play('turn');
      kid.dir = nd;
    }
  }

  function collect() {
    var kp = kidPos();
    for (var i = 0; i < items.length; i++) {
      var it = items[i]; if (it.taken) continue;
      if (Math.abs(kp.x - it.x) + Math.abs(kp.y - it.y) > 0.42) continue;
      it.taken = true; got++; if (it.type === 'lantern') gotLanterns++;
      var C = G.C, H = art.mz ? art.mz.H : C * 0.2, px = (it.x + 0.5) * C, py = (it.y + 0.5) * C - H / 2;
      K.sfx.play(it.type, { n: ++noteStep, world: world }); K.buzz(10);
      var col = it.type === 'cup' ? ['#8fe0ff', '#ffffff'] : it.type === 'lantern' ? ['#ffd36b', '#ff9e45', '#ffffff'] : ['#ffd36b', '#ffb36b', '#ffffff'];
      K.fx.burst(px, py, { n: 14, colors: col, speed: C * 4, size: C * 0.14, life: 0.7, shape: 'star', gravity: C * 4 });
      K.fx.text(px, py - C * 0.3, got === total ? 'All found!' : '+1', { size: got === total ? Math.max(26, C * 0.45) : Math.max(22, C * 0.38), rise: C * 0.8, color: '#fff6c2', stroke: 'rgba(60,30,10,.6)' });
      if (got === total) setTimeout(function () { if (state === 'play' || state === 'home') K.sfx.play('allfound'); }, 220);
      var pr = pItems.getBoundingClientRect();
      flyers.push({ type: it.type, sx: px + G.ox, sy: py + G.oy, tx: pr.left + 20, ty: pr.top + pr.height / 2, t: 0 });
      hud();
    }
  }

  // ---------- home: door opens, windows light up, then the iftar table ----------
  function arriveHome() {
    state = 'home';
    var stars = got >= total ? 3 : got >= Math.ceil(total / 2) ? 2 : 1;
    progress.finish(level, stars);
    K.bridge.complete();
    kid.dir = 0;
    var C = G.C, gx = maze.goal[0], gy = maze.goal[1];
    K.sfx.play('door');
    K.tween(home, { open: 1 }, 0.6, K.ease.outCubic);
    K.tween(kid, { rx: gx, ry: gy + 0.2 }, 0.3, K.ease.inOutSine, function () {
      K.tween(kid, { hide: 1 }, 0.35, K.ease.inQuad);
      setTimeout(function () { if (state === 'home' || state === 'iftar') K.sfx.play('home'); }, 380); K.buzz(30);
      K.tween(home, { lit: 1 }, 0.5, K.ease.outCubic);
      var hx = (gx + 0.5) * C, hy = (gy + 0.2) * C;
      for (var i = 0; i < 5; i++) setTimeout(function () {
        if (state !== 'home') return;
        K.fx.burst(hx + K.rand(-C, C), hy - K.rand(0, C), { n: 18, colors: ['#ffd36b', '#ff8fab', '#7ae7ff', '#9fdc6a', '#ffffff'], speed: C * 6, size: C * 0.16, life: 1.1, gravity: C * 7 });
      }, i * 150);
    });
    setTimeout(function () { if (state === 'home') startCelebration(stars); }, 1500);
  }
  function startCelebration(stars) {
    state = 'iftar'; celeb.on = true; celeb.t = 0; celeb.k = 0;
    K.sfx.play('iftar');
    setTimeout(function () { if (state === 'iftar') window.MazeVoice && MazeVoice.praise('mashaallah'); }, 500);
    K.fx.clear();
    if (hint) { hint.hide(); hint = null; }
    var confetti = function () {
      if (state !== 'iftar') return;
      for (var i = 0; i < 3; i++) K.fx.burst(K.rand(G.w * 0.1, G.w * 0.9), -10, { n: 16, colors: ['#ffd36b', '#ff8fab', '#7ae7ff', '#9fdc6a', '#ffffff', '#c08cff'], speed: 260, size: 12, life: 2.4, gravity: 260, spread: 1.4, angle: Math.PI / 2, drag: 0.97 });
    };
    confetti(); setTimeout(confetti, 450); setTimeout(confetti, 900);
    setTimeout(function () {
      if (state !== 'iftar') return;
      var last = level === COUNT, endOfWorld = level % 10 === 0, buttons = [];
      if (!last) buttons.push({ label: endOfWorld ? 'Next World' : 'Next Level', icon: 'next', primary: true, onClick: function () { startLevel(level + 1); } });
      buttons.push({ label: last ? 'Play Again' : 'Replay', icon: 'restart', row: true, primary: last, onClick: function () { startLevel(last ? 1 : level); } });
      buttons.push({ label: 'Levels', icon: 'levels', row: true, onClick: openLevels });
      var thing = world === 0 ? 'dates' : 'treats';
      K.ui.sheet({
        title: last ? 'MashaAllah!' : 'Iftar time!',
        text: last ? 'You found the way home in all 30 mazes!' : got >= total ? 'You found all the ' + thing + '!' : 'You found ' + got + ' of ' + total + ' ' + thing,
        stars: stars, buttons: buttons });
    }, 1700);
  }

  function pause() {
    state = 'paused';
    input.ptr = false; input.key = 0; release();
    K.ui.sheet({ title: 'Paused', text: A.WORLDS[world].name + ' · Level ' + level, buttons: [
      { label: 'Resume', icon: 'play', primary: true, onClick: resume },
      { label: 'Restart', icon: 'restart', row: true, onClick: function () { startLevel(level); } },
      { label: 'Levels', icon: 'levels', row: true, onClick: openLevels },
      { label: K.sfx.muted ? 'Sound: Off' : 'Sound: On', icon: K.sfx.muted ? 'soundOff' : 'sound', onClick: function () { K.sfx.toggle(); pause(); } }] });
  }
  function resume() { state = 'play'; }
  function openLevels() {
    var wasPlaying = state === 'paused' || state === 'play';
    state = 'paused';
    K.ui.levelSelect({
      title: 'Ramadan Maze',
      worlds: A.WORLDS.map(function (w, i) { return { name: w.name, color: w.color, from: i * 10 + 1, to: i * 10 + 10 }; }),
      progress: progress, current: level,
      onPick: function (n) { startLevel(n); },
      onClose: function () { if (wasPlaying) state = 'play'; else startLevel(progress.current()); }
    });
  }

  // ---------- drawing ----------
  function ensureArt() {
    var key = world + '|' + G.w + '|' + G.h + '|' + G.dpr;
    if (!art.bg || art.bgKey !== key) {
      art.bg = A.paintBackdrop(world, G.w, G.h, G.dpr); art.fg = A.paintForeground(world, G.w, G.h, G.dpr); art.bgKey = key;
      art.dark = null;
    }
    if (!art.mz) {
      // keep the cached maze under 4096 device px a side
      var big = Math.max(maze.cols, maze.rows) * G.C + G.C, md = Math.min(G.dpr, 4096 / big);
      art.mz = A.paintMaze(maze, G.C, md);
    }
  }

  function draw() {
    if (!maze) return;
    ensureArt();
    var d = G.dpr, C = G.C, mz = art.mz, H = mz.H, wd = A.WORLDS[world];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (celeb.k >= 1) { drawIftar(); return; }

    // backdrop (moves a little with the camera for depth)
    var parX = K.clamp((G.ox - G.cx) * 0.3, -art.bg.m, art.bg.m), parY = K.clamp((G.oy - G.cy) * 0.3, -art.bg.m, art.bg.m);
    ctx.drawImage(art.bg.c, Math.round((-art.bg.m + parX) * d), Math.round((-art.bg.m + parY) * d));

    ctx.setTransform(d, 0, 0, d, 0, 0);
    var ox = Math.round(G.ox * d) / d, oy = Math.round(G.oy * d) / d;
    // maze floor, shadows and wall fronts
    ctx.drawImage(mz.floor, ox - mz.pad, oy - mz.pad, mz.w, mz.h);
    ctx.save(); ctx.translate(ox, oy);
    var yo = -H / 2;
    // tap target ring
    if (marker) {
      var mk = marker, mx = (mk.x + 0.5) * C, my = (mk.y + 0.5) * C + yo, pulse = 1 + 0.12 * Math.sin(mk.t * 8);
      ctx.globalAlpha = mk.ok ? 0.85 : Math.max(0, 1 - mk.t / 0.6);
      ctx.strokeStyle = mk.ok ? '#fff6c2' : '#ff8a8a'; ctx.lineWidth = Math.max(2, C * 0.05);
      ctx.beginPath(); ctx.ellipse(mx, my + C * 0.12, C * 0.3 * pulse, C * 0.17 * pulse, 0, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // collectibles (bob and glint)
    items.forEach(function (it) {
      if (it.taken) return;
      var sp = A.item(it.type, C * (it.type === 'date' ? 0.7 : 0.56), d), x = (it.x + 0.5) * C, y = (it.y + 0.5) * C + yo, bob = Math.sin(it.ph * 2.6) * C * 0.04;
      ctx.fillStyle = 'rgba(40,20,5,.22)'; ctx.beginPath(); ctx.ellipse(x + C * 0.04, y + C * 0.2, C * 0.18 * (1 - bob / C * 2), C * 0.06, 0, 0, 6.283); ctx.fill();
      if (wd.dark || it.type === 'lantern') A.glow(ctx, x, y + bob, C * 0.55, '#ffcf6b', wd.dark ? 0.45 : 0.25);
      var sz = sp.size + sp.pad * 2;
      ctx.drawImage(sp, x - sz / 2, y - sz / 2 + bob - C * 0.04, sz, sz);
      var gl = (Math.sin(it.ph * 1.7) + 1) / 2;
      if (gl > 0.8) { ctx.globalAlpha = (gl - 0.8) * 5; ctx.fillStyle = '#fff'; A.star8(ctx, x + C * 0.13, y - C * 0.14 + bob, C * 0.06 * (gl - 0.6) * 2.5, 0.3); ctx.fill(); ctx.globalAlpha = 1; }
    });
    // kid
    if (kid.hide < 1) {
      var walking = state === 'play' && kid.dir !== 0, breathe = walking ? 0 : Math.sin(time * 3) * 0.03;
      var sq = kid.sq, jmp = Math.sin(kid.jump * Math.PI), bx = 0, by = 0;
      if (kid.bump > 0) { var bk = Math.sin(kid.bump * Math.PI) * C * 0.08; bx = DX[kid.bumpDir] * bk; by = DY[kid.bumpDir] * bk; }
      var shrink = 1 - kid.hide * 0.6;
      ctx.globalAlpha = 1 - kid.hide;
      A.kid(ctx, (kid.rx + 0.5) * C + bx, (kid.ry + 0.5) * C + yo + by - jmp * C * 0.22, C, kid.ang, kid.walk, walking,
        (1 + sq * 0.12 + breathe + jmp * 0.12) * shrink, (1 - sq * 0.1 + breathe + jmp * 0.12) * shrink);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // wall tops (walls in front hide the kid's feet)
    ctx.drawImage(mz.tops, ox - mz.pad, oy - mz.pad, mz.w, mz.h);
    ctx.save(); ctx.translate(ox, oy);
    A.house(ctx, (maze.goal[0] + 0.5) * C, (maze.goal[1] + 0.5) * C, C, world, time, home.lit, home.open);
    var sh = K.fx.offset(); ctx.translate(sh.x, sh.y);
    K.fx.draw(ctx);
    ctx.restore();

    // night: darkness with pools of light (the kid's lantern grows with each lantern found)
    if (wd.dark) drawNight(ox, oy, C, yo);

    // ambient motes, foreground silhouettes
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ambient.forEach(function (a, i) {
      var x = a.x * G.w, y = a.y * G.h;
      if (world === 2) { A.glow(ctx, x, y, 7 * a.s, '#ffe08a', 0.4 + 0.4 * Math.sin(a.ph * 2 + i)); }
      else { ctx.globalAlpha = 0.25 + 0.25 * Math.sin(a.ph * 2 + i); ctx.fillStyle = world === 0 ? '#fff3c8' : '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 1.6 * a.s, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; }
    });
    // foreground leaves / bunting / garlands frame the scene but never cover the maze
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, G.w, G.h);
    ctx.rect(ox - mz.t / 2 - 4, oy - mz.t / 2 - H - 4, maze.cols * C + mz.t + 8, maze.rows * C + mz.t + H + 8);
    ctx.clip('evenodd');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 0.92;
    ctx.drawImage(art.fg, Math.round(parX * 1.4 * d), Math.round(parY * 1.4 * d));
    ctx.restore();
    ctx.setTransform(d, 0, 0, d, 0, 0);
    // when the house is off screen, a little house badge at the edge points the way
    if (state === 'play') {
      var hx = ox + (maze.goal[0] + 0.5) * C, hy = oy + (maze.goal[1] + 0.5) * C - H, a = G.area, inset = 30;
      var bx0 = a.l + inset, bx1 = a.r - inset, by0 = a.t + inset, by1 = a.b - inset;
      if (hx < bx0 - inset || hx > bx1 + inset || hy < by0 - inset || hy > by1 + inset) {
        var px = K.clamp(hx, bx0, bx1), py = K.clamp(hy, by0, by1), ang = Math.atan2(hy - py, hx - px), pul = 1 + Math.sin(time * 4) * 0.06;
        ctx.save(); ctx.translate(px, py); ctx.scale(pul, pul);
        ctx.fillStyle = 'rgba(20,12,40,.62)'; ctx.strokeStyle = '#f6c453'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 22, 0, 6.283); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.rotate(ang); ctx.fillStyle = '#f6c453'; ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(21, -7); ctx.lineTo(21, 7); ctx.closePath(); ctx.fill(); ctx.restore();
        ctx.fillStyle = '#fff1d6'; ctx.fillRect(-10, -4, 20, 13);
        ctx.beginPath(); ctx.moveTo(-13, -3); ctx.lineTo(0, -13); ctx.lineTo(13, -3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffcf6b'; ctx.beginPath(); ctx.moveTo(-3.5, 9); ctx.lineTo(-3.5, 2); ctx.arc(0, 2, 3.5, Math.PI, 0); ctx.lineTo(3.5, 9); ctx.fill();
        ctx.restore();
      }
    }
    // collected treats fly up to the counter
    flyers.forEach(function (f) {
      var e = K.ease.inOutSine(f.t), x = K.lerp(f.sx, f.tx, e), y = K.lerp(f.sy, f.ty, e) - Math.sin(f.t * Math.PI) * 80;
      var sp = A.item(f.type, C * (f.type === 'date' ? 0.7 : 0.56), d), sz = (sp.size + sp.pad * 2) * (1 - f.t * 0.55);
      ctx.drawImage(sp, x - sz / 2, y - sz / 2, sz, sz);
    });
    // level banner
    if (bannerT > 0) drawBanner(wd);
    // fade into the iftar scene
    if (celeb.on && celeb.k > 0) drawIftar();
  }

  function drawNight(ox, oy, C, yo) {
    var d = G.dpr;
    if (!art.dark) art.dark = document.createElement('canvas');
    var dk = art.dark;
    if (dk.width !== Math.round(G.w * d) || dk.height !== Math.round(G.h * d)) { dk.width = Math.round(G.w * d); dk.height = Math.round(G.h * d); }
    var g = dk.getContext('2d'), k = (level - 1) % 10;
    g.setTransform(d, 0, 0, d, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, G.w, G.h);
    g.fillStyle = 'rgba(4,6,26,' + (0.72 + k * 0.015) + ')'; g.fillRect(0, 0, G.w, G.h);
    g.globalCompositeOperation = 'destination-out';
    function hole(x, y, r) { var gr = g.createRadialGradient(x, y, r * 0.25, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); }
    var flick = 1 + Math.sin(time * 9) * 0.015 + Math.sin(time * 13.7) * 0.01;
    hole(ox + (kid.rx + 0.5) * C, oy + (kid.ry + 0.5) * C + yo, C * (2.2 + lightGrow * 0.4) * flick);
    hole(ox + (maze.goal[0] + 0.5) * C, oy + (maze.goal[1] + 0.3) * C, C * (1.5 + home.lit * 3));
    items.forEach(function (it) { if (!it.taken) hole(ox + (it.x + 0.5) * C, oy + (it.y + 0.5) * C + yo, C * (it.type === 'lantern' ? 1.1 : 0.7)); });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(dk, 0, 0);
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }

  function drawBanner(wd) {
    var k = Math.min(1, bannerT / 0.4, (1.9 - bannerT) / 0.3), cx = G.w / 2, cy = G.h * 0.42, s = K.clamp(Math.min(G.w, G.h) / 420, 0.75, 1.4);
    ctx.globalAlpha = Math.max(0, k);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(20,10,30,.6)';
    ctx.font = '800 ' + Math.round(18 * s) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = 5 * s;
    ctx.strokeText(wd.name.toUpperCase(), cx, cy - 40 * s); ctx.fillStyle = wd.color; ctx.fillText(wd.name.toUpperCase(), cx, cy - 40 * s);
    ctx.font = '900 ' + Math.round(48 * s) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = 9 * s;
    ctx.strokeText('Level ' + level, cx, cy); ctx.fillStyle = '#fffaf0'; ctx.fillText('Level ' + level, cx, cy);
    ctx.font = '800 ' + Math.round(22 * s) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = 6 * s;
    ctx.strokeText(maze.name, cx, cy + 40 * s); ctx.fillStyle = 'rgba(255,250,240,.92)'; ctx.fillText(maze.name, cx, cy + 40 * s);
    ctx.globalAlpha = 1;
  }

  function drawIftar() {
    var d = G.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    A.iftar(ctx, G.w, G.h, celeb.t, K.ease.outCubic(celeb.k));
    K.fx.draw(ctx);
  }

  K.loop({ step: step, draw: draw, hz: 120, onHidden: function () { if (state === 'play' && !DEBUG) pause(); } });

  // Test hook (only with ?debug in the URL): step the game by hand, steer, and run a bot through a level.
  if (DEBUG) {
    var bot = null;
    var origStep = step;
    step = function (dt) {
      if (bot && state === 'play') {
        // steer like a held finger: ask for the way to the next cell on the plan, a little ahead of time
        var moving = !!kid.dir, at = moving ? [kid.x + DX[kid.dir], kid.y + DY[kid.dir]] : [kid.x, kid.y], idx = -1;
        for (var j = bot.i; j < bot.cells.length; j++) if (bot.cells[j][0] === at[0] && bot.cells[j][1] === at[1]) { idx = j; break; }
        if (idx < 0) { bot.cells = window.RM.plan(at); bot.replans++; idx = 0; }
        bot.i = idx;
        var nx = bot.cells[idx + 1];
        if (nx) {
          var dd = nx[0] > at[0] ? E : nx[0] < at[0] ? W : nx[1] > at[1] ? S : N;
          input.ptr = true;
          if (input.want !== dd) {
            if (!moving) setWant(dd, false);
            else if (dd === OPP[kid.dir]) { if (kid.p >= 0.7) setWant(dd, false); }
            else if (kid.p >= 0.3) setWant(dd, false);
          }
        }
      }
      origStep(dt);
    };
    window.RM = {
      run: function (sec) { for (var i = 0; i < Math.round(sec * 120); i++) step(1 / 120); draw(); },
      draw: function () { draw(); }, start: startLevel,
      want: function (d, held) { input.ptr = !!held; setWant({ N: N, E: E, S: S, W: W }[d], true); },
      release: function () { input.ptr = false; release(); },
      tap: tapAt,
      // plan: visit every collectible (nearest first), then go home
      plan: function (from) {
        from = from || [kid.x, kid.y];
        var cells = [from], cur = from, left = items.filter(function (it) { return !it.taken; }).map(function (it) { return [it.x, it.y]; });
        function walk(to) { var p = route(cur[0], cur[1], to[0], to[1]); p.forEach(function (dd) { cur = [cur[0] + DX[dd], cur[1] + DY[dd]]; cells.push(cur); }); }
        while (left.length) {
          left.sort(function (a, b) { return route(cur[0], cur[1], a[0], a[1]).length - route(cur[0], cur[1], b[0], b[1]).length; });
          walk(left.shift());
        }
        walk(maze.goal);
        return cells;
      },
      bot: function (on) { bot = on === false ? null : { cells: window.RM.plan(), i: 0, replans: 0 }; if (!bot) input.ptr = false; },
      get: function () {
        return { state: state, level: level, world: world, cols: maze.cols, rows: maze.rows, flipped: !!maze.flipped,
          kid: { x: kid.x, y: kid.y, dir: kid.dir, p: +kid.p.toFixed(2), rx: +kid.rx.toFixed(2), ry: +kid.ry.toFixed(2) },
          want: input.want, got: got, total: total, goal: maze.goal, start: maze.start, C: G.C, ox: Math.round(G.ox), oy: Math.round(G.oy),
          scroll: [G.scrollX, G.scrollY], stars: progress.stars(level), celeb: celeb.k, replans: bot ? bot.replans : 0, H: art.mz ? art.mz.H : 0 };
      },
      perf: function (n) { var t0 = performance.now(); for (var i = 0; i < (n || 20); i++) draw(); return (performance.now() - t0) / (n || 20); },
      cellToScreen: function (x, y) { var H = art.mz ? art.mz.H : G.C * 0.2; return { x: G.ox + (x + 0.5) * G.C, y: G.oy + (y + 0.5) * G.C - H / 2 }; },
      maze: function () { return maze; }, items: function () { return items; }, G: G
    };
  }

  var fontsReady = document.fonts && document.fonts.load ? document.fonts.load('900 40px Nunito') : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 700); })]).catch(function () {}).then(function () {
    startLevel(progress.current());
  });
})();
