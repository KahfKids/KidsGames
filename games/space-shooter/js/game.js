/* Star Rangers: game.js
   Fly the ranger ship through 24 waves in 4 space worlds. Drag anywhere to fly (the ship moves with your finger,
   it never jumps under it); the ship fires by itself. Robots, drones, asteroids and space junk only; each world
   ends with a friendly boss who flies home happy when beaten. Hearts and shields instead of instant game over.
   Built on the shared kit (js/kit): full-screen stage, fixed-step loop, pointer input, fx, sfx, ui, progress. */
(function () {
  'use strict';
  var A = window.StarArt, LV = window.STAR_WAVES, K = window.Kit, SX = window.StarSfx;
  var COUNT = LV.list.length, PER = LV.perWorld;
  // The field is at least FW_MIN units wide and FH_MIN units tall. Portrait phones show it full width; wider
  // screens widen it up to FW_MAX, and anything beyond that is open space scenery (no box around the field).
  var FW_MIN = 900, FW_MAX = 1700, FH_MIN = 1300, SHIP_R = 32, FIRE = 0.2, ROWH = 128, MAX_HEARTS = 5;
  var DEBUG = /[?&]debug\b/.test(location.search);

  var KINDS = {
    bot: { r: 44, hp: 1, pts: 100, stars: 1, cols: ['#3cc8b4', '#bff7ee', '#1d6f7a', '#8ffcff'] },
    tank: { r: 50, hp: 3, pts: 250, stars: 2, cols: ['#ff9f43', '#ffe0b0', '#8a4a12', '#fff07a'] },
    zapper: { r: 44, hp: 2, pts: 200, stars: 1, cols: ['#a986ff', '#efe2ff', '#4a2a8a', '#ffa6ef'] },
    drone: { r: 42, hp: 1, pts: 150, stars: 1, cols: ['#c9d3ea', '#7dfcff', '#4b5580', '#ffe27a'] },
    rock: { r: 66, hp: 3, pts: 150, stars: 1, rock: true },
    pebble: { r: 34, hp: 1, pts: 50, stars: 1, rock: true },
    can: { r: 32, hp: 1, pts: 75, stars: 1, cols: ['#ffffff', '#ff7a45', '#9aa4bf', '#ffd36b'] },
    gear: { r: 34, hp: 1, pts: 75, stars: 1, cols: ['#e8ecf6', '#a5aec8', '#5f6788', '#ffffff'] },
    sat: { r: 52, hp: 2, pts: 150, stars: 2, cols: ['#e7a83c', '#5aa2ff', '#ffe7a0', '#ffffff'] }
  };
  var STREAM = { p: 'pebble', R: 'rock', c: 'can', g: 'gear', s: 'sat' };
  var FORM = { b: 'bot', t: 'tank', z: 'zapper' };

  var store = K.store('kahf-star-rangers'), progress = K.progress(store, COUNT);
  var canvas = document.getElementById('stage');

  // ---------- state ----------
  var level = 1, world = 0, def = null, tune = null;
  var ship = null, enemies = [], bullets = [], shots = [], pickups = [], flashes = [], boss = null;
  var hearts = 3, score = 0, combo = 0, lastKill = -9, time = 0, state = 'play';
  var bannerT = 0, bossBannerT = 0, warpT = 0, clearT = 0, diveT = 0, starsGot = 0;
  var hitLog = [], later = [], dir = null, hint = null, flown = !!store.get('flown', false), drag = null, autopilot = false, dodge = true, godMode = false;

  // ---------- layout ----------
  var G = { s: 1, ox: 0, FW: FW_MIN, FH: 1600, top: 150, bottom: 1500, formTop: 260, minY: 800, maxY: 1400, w: 0, h: 0, dpr: 1, safe: null };
  var bg = null, bgKey = '', scen = [], fore = [], dots = [];
  var stage = K.stage(canvas, function (st) {
    G.w = st.w; G.h = st.h; G.dpr = st.dpr; G.safe = st.safe;
    G.s = Math.min(st.w / FW_MIN, st.h / FH_MIN);
    G.FW = Math.min(st.w / G.s, FW_MAX); G.ox = (st.w - G.FW * G.s) / 2; G.FH = st.h / G.s;
    G.top = (st.safe.top + 60) / G.s;
    G.bottom = G.FH - (st.safe.bottom + 8) / G.s;
    G.formTop = G.top + 100 + Math.max(0, (G.FH - 1500) * 0.2);
    G.maxY = G.bottom - 92;
    G.minY = Math.min(G.maxY - 140, Math.max(G.FH * 0.46, G.formTop + 2 * ROWH + 230));
    A.setScale(G.s * G.dpr);
    bg = null; hudBottomPx = 0;
    makeDots();
    if (ship) { ship.tx = K.clamp(ship.tx, 70, G.FW - 70); ship.ty = K.clamp(ship.ty, G.minY, G.maxY); ship.x = K.clamp(ship.x, 70, G.FW - 70); ship.y = K.clamp(ship.y, G.minY - 400, G.FH + 200); }
  });
  var ctx = stage.ctx;

  // ---------- HUD ----------
  var STAR_ICON = '<svg viewBox="-50 -50 100 100" style="width:20px;height:20px"><path d="M0-46 13-31 32-32 31-13 46 0 31 13 32 32 13 31 0 46-13 31-32 32-31 13-46 0-31-13-32-32-13-31Z" fill="#f6c453" stroke="#7a4a12" stroke-width="6"/></svg>';
  var pWave = K.ui.pill(''), pHearts = K.ui.hearts(3);
  K.ui.spacer();
  var pScore = K.ui.pill('');
  K.ui.iconButton('pause', 'Pause', function () { if (state === 'play') pause(); });
  function planetIcon(c) {
    return '<svg viewBox="-12 -12 24 24" style="width:20px;height:20px"><ellipse rx="11" ry="3.6" fill="none" stroke="' + c + '" stroke-width="2" transform="rotate(-20)"/><circle r="6.5" fill="' + c + '"/></svg>';
  }
  function hud() {
    pWave.set(planetIcon(A.WORLDS[world].color) + (def && def.boss != null ? 'Boss' : 'Wave ' + (((level - 1) % PER) + 1)));
    pHearts.setMax(Math.max(3, hearts)); pHearts.setLives(hearts);
    pScore.set(STAR_ICON + score.toLocaleString());
  }

  // ---------- waves ----------
  function startLevel(n) {
    level = K.clamp(n, 1, COUNT); world = LV.worldOf(level); def = LV.list[level - 1]; tune = def.tune;
    progress.setCurrent(level);
    enemies = []; bullets = []; shots = []; pickups = []; flashes = []; boss = null; later = [];
    hearts = 3; score = 0; combo = 0; lastKill = -9; starsGot = 0;
    ship = { x: G.FW / 2, y: G.FH + 160, tx: G.FW / 2, ty: G.maxY - 40, bank: 0, vx: 0, inv: 0, flash: 0, squash: 0, muzzle: 0,
             fireT: 0.6, shieldT: 0, spreadT: 0, magnetT: 0, thrust: 0, dead: false, px: G.FW / 2, py: G.FH };
    dir = { gi: -1, gt: 0, spawned: 0, spawnT: 0, lastAt: 0, done: false, wait: 1.6 };
    diveT = tune.dive ? tune.dive : 0;
    K.fx.clear();
    state = 'play'; bannerT = 2.2; bossBannerT = 0; warpT = 1.3; clearT = 0; drag = null;
    makeScenery();
    SX.play('warp');
    hud();
    if (!flown && !hint) hint = K.ui.hint('Drag anywhere to fly', 130, true);
  }

  function aliveIn(gi) { for (var i = 0; i < enemies.length; i++) if (enemies[i].group === gi) return true; return false; }
  function nextGroup() {
    dir.gi++; dir.gt = 0; dir.spawned = 0; dir.spawnT = 0; dir.lastAt = 0;
    var g = def.g[dir.gi];
    if (!g) { dir.done = true; return; }
    if (g.f) spawnFormation(g);
    if (g.boss != null) spawnBoss(g.boss);
  }
  function director(dt) {
    if (dir.done) return;
    if (dir.wait > 0) { dir.wait -= dt; if (dir.wait <= 0) nextGroup(); return; }
    var g = def.g[dir.gi]; dir.gt += dt;
    if (g.f) { if (!aliveIn(dir.gi)) { dir.wait = 0.6; } return; }
    if (g.boss != null) { if (!boss) dir.wait = 0.4; return; }
    var n = g.s ? g.s.length : (g.w || g.d);
    if (dir.spawned < n) {
      dir.spawnT -= dt;
      if (dir.spawnT <= 0) { spawnStream(g, dir.spawned); dir.spawned++; dir.spawnT = g.every || 1; dir.lastAt = dir.gt; }
    } else if (dir.gt - dir.lastAt >= (g.gap || 1.4)) dir.wait = 0.01;
  }

  function makeEnemy(kind, x, y) {
    var k = KINDS[kind], hp = k.hp + (k.rock || kind === 'drone' || kind === 'can' || kind === 'gear' ? 0 : world >= 3 ? 2 : world >= 1 ? 1 : 0);
    return { kind: kind, x: x, y: y, r: k.r, hp: hp, maxHp: hp, pts: k.pts, mode: 'pass', t: 0, ph: Math.random() * 6.28, flash: 0, rot: 0, vr: 0,
             vx: 0, vy: 0, squash: 0, charge: 0, group: dir ? dir.gi : -1, carrier: null, v: (Math.random() * 3) | 0, delay: 0, mx: x, my: y, mvx: 0, mvy: 0 };
  }
  // Formations never sit still: the row strafes side to side, ripples up and down and (later) breathes wider.
  function spacing(cols) { var base = cols > 1 ? Math.min(150, (G.FW - 210) / (cols - 1)) : 0; return base * (world > 0 ? 1 + 0.07 * Math.sin(time * 0.9) : 1); }
  function swayAmp(cols) { return K.clamp((G.FW - (cols - 1) * spacing(cols)) / 2 - 75, 45, 260); }
  function slotX(e) {
    return G.FW / 2 + (e.col - (e.cols - 1) / 2) * spacing(e.cols) + Math.sin(time * tune.sway + e.fph) * swayAmp(e.cols) * (world >= 2 ? 0.8 : 1) +
      (world >= 2 ? Math.sin(time * tune.sway * 2.3 + e.fph) * 36 : 0);
  }
  function slotY(e) { return G.formTop + e.row * ROWH + Math.sin(time * tune.sway * 1.6 + e.col * 0.7) * (10 + world * 5); }
  function entryPath(e, side, fromX, fromY) { // a curved swoop that dips down, loops back and settles into the slot
    var dip = Math.min(G.minY - 160, G.formTop + 380 + world * 60);
    e.mode = 'enter';
    e.path = { p0: [fromX, fromY], p1: [G.FW / 2 - side * G.FW * 0.2, dip], p2: [G.FW / 2 + (e.col - (e.cols - 1) / 2) * spacing(e.cols) + side * 240, G.formTop + e.row * ROWH + 230], t: 0, dur: 2.3 };
  }
  function spawnFormation(g) {
    var made = [], idx = 0, gside = Math.random() < 0.5 ? -1 : 1, fph = Math.random() * 6.28;
    g.f.forEach(function (row, r) {
      for (var c = 0; c < row.length; c++) {
        var kind = FORM[row[c]]; if (!kind) continue;
        var e = makeEnemy(kind, 0, -200), side = gside * (r % 2 ? -1 : 1);
        e.col = c; e.cols = row.length; e.row = r; e.fph = fph;
        entryPath(e, side, G.FW / 2 + side * G.FW * 0.62, -130);
        e.delay = 0.15 + idx * 0.17 + r * 0.3; e.y = -400;
        e.shootT = tune.shoot ? K.rand(2, tune.shoot + 2) : 0;
        made.push(e); idx++;
      }
    });
    if (g.pu && made.length) made[(made.length / 2) | 0].carrier = g.pu;
    SX.play('servo');
    enemies.push.apply(enemies, made);
  }
  function spawnStream(g, i) {
    var sp = tune.speed, e;
    if (g.s) {
      var kind = STREAM[g.s[i]] || 'pebble';
      if (g.from === 'alt') { // junk tumbles across from the sides
        var side = i % 2 ? 1 : -1;
        e = makeEnemy(kind, side < 0 ? -70 : G.FW + 70, G.top + K.rand(0, 300));
        e.vx = -side * K.rand(110, 190) * sp; e.vy = K.rand(60, 130) * sp; e.vr = K.rand(1.2, 3) * (Math.random() < 0.5 ? -1 : 1);
      } else { // asteroids drift diagonally at different speeds and spin
        e = makeEnemy(kind, K.rand(90, G.FW - 90), -90);
        var dx = (Math.random() < 0.5 ? -1 : 1) * K.rand(20, 130);
        if ((e.x < G.FW * 0.3 && dx < 0) || (e.x > G.FW * 0.7 && dx > 0)) dx = -dx;
        e.vx = dx * sp; e.vy = (kind === 'rock' ? K.rand(90, 160) : K.rand(120, 230)) * sp; e.vr = K.rand(-2.2, 2.2);
      }
    } else if (g.w) { // swoop: a U whose low point leans toward the ranger
      e = makeEnemy('drone', 0, 0);
      var s = g.side === 'alt' ? (i % 2 ? 1 : -1) : g.side === 'R' ? 1 : -1;
      var a = G.top + 30, depthY = G.formTop + (g.depth || 0.4) * (ship.y - G.formTop), c = (depthY - 0.25 * a) / 0.75;
      var xa = s < 0 ? -90 : G.FW + 90, lean = (ship.x - G.FW / 2) * tune.home;
      SX.play('buzz'); e.mode = 'swoop'; e.path = { p: [[xa, a], [G.FW / 2 + s * G.FW * 0.3 + lean, c], [G.FW / 2 - s * G.FW * 0.3 + lean, c], [G.FW - xa, a]], t: 0, dur: 4.6 / sp };
      e.x = xa; e.y = a;
    } else { // zig-zag down, drifting toward the ranger
      e = makeEnemy('drone', K.rand(0.18, 0.82) * G.FW, -70);
      SX.play('buzz'); e.mode = 'weave'; e.x0 = e.x; e.vy = 170 * sp; e.amp = K.rand(90, 140); e.y = -70;
    }
    e.group = dir.gi;
    enemies.push(e);
  }

  // ---------- boss machines ----------
  var BOSS_ATTACKS = [['gears', 'swoop', 'fan'], ['dash', 'burst', 'pebbles'], ['ring', 'spiral', 'weave'], ['wands', 'swoop', 'ring']];
  function spawnBoss(id) {
    var hp = LV.bossHp[id];
    boss = { id: id, x: G.FW / 2, y: -300, hp: hp, maxHp: hp, shown: hp, t: 0, enterT: 0, flash: 0, m: 0, atkT: 2.2, atkI: 0, dead: false, deadT: 0,
             vy: 0, tilt: 0, charge: 0, chargeT: 0, chargeFn: null, thrust: 0, sparkT: 0, damage: 0, coreC: '#7dfcff', phase: 1, split: 0, dash: null, offX: 0, offY: 0, aim: Math.PI / 2 };
    bossBannerT = 2.4; bannerT = 0;
    SX.play('bossIn');
  }
  var hudBottomPx = 0;
  function hudBottom() {
    if (!hudBottomPx) { var h = document.querySelector('.kit-hud'); hudBottomPx = h ? h.getBoundingClientRect().bottom : G.safe.top + 56; }
    return hudBottomPx;
  }
  function barY() { return hudBottom() + 26; } // top of the HP bar in CSS px (name label sits above it)
  function bossHome() { return Math.max(G.formTop + 80, (barY() + 30) / G.s + A.BOSSES[boss.id].h * 0.4); }
  function bossAttack(b, fn, chargeTime) { b.chargeFn = fn; b.chargeT = chargeTime; b.chargeMax = chargeTime; SX.play('charge'); }
  function fireOrb(x, y, ang, speed, home) {
    speed *= K.clamp(G.FH / 1450, 1, 1.35); // tall portrait fields: same travel time as landscape
    shots.push({ x: x, y: y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r: 17, ph: Math.random() * 6, home: home || 0 });
  }
  function aimAt(x, y, lim) { return K.clamp(Math.atan2(ship.y - y, ship.x - x), Math.PI / 2 - lim, Math.PI / 2 + lim); }
  function bossPattern(b) { // where the machine flies when it isn't dashing
    var mid = G.FW / 2, B = A.BOSSES[b.id], range = Math.max(0, G.FW / 2 - B.rx - 50), home = bossHome(), m = b.m;
    if (b.id === 0) return [mid + Math.sin(m * 0.6) * range, home + Math.sin(m * 1.2) * 45];
    if (b.id === 1) return [mid + Math.sin(m * 0.7) * range, home + Math.sin(m * 1.4) * 55];
    if (b.id === 2) return [mid + Math.cos(m * 0.75) * range, home + 30 + Math.sin(m * 0.75) * 70];
    return [mid + Math.sin(m * 0.55) * range * 0.85 + Math.sin(m * 1.9) * Math.min(80, range * 0.15), home + Math.sin(m * 0.9) * 60];
  }
  function bossDoAttack(b, name) {
    var sp = tune.speed, shot = tune.shot, B = A.BOSSES[b.id];
    if (name === 'gears') { [-1, 1].forEach(function (s) { var e = makeEnemy('gear', b.x + s * 196, b.y + 110); e.vx = s * 50; e.vy = 130 * sp; e.vr = s * 2.5; e.group = -1; enemies.push(e); }); SX.play('spark'); }
    else if (name === 'swoop') summonSwoop(b.id === 0 ? 4 : 5, b.id === 0 ? 0.3 : 0.75);
    else if (name === 'weave') summonWeave(3);
    else if (name === 'fan') bossAttack(b, function () { [-0.42, 0, 0.42].forEach(function (a) { fireOrb(b.x, b.y + 110, Math.PI / 2 + a, 160); }); SX.play('spark'); }, 1.1);
    else if (name === 'pebbles') { var lean = K.clamp((ship.x - b.x) / 4, -120, 120); [-2, -1, 0, 1, 2].forEach(function (s) { var e = makeEnemy('pebble', b.x + s * 30, b.y + 170); e.vx = s * 70 + lean; e.vy = 170 * sp; e.vr = K.rand(-2, 2); e.group = -1; enemies.push(e); }); SX.play('spark'); }
    else if (name === 'burst') bossAttack(b, function () { for (var k = 0; k < 4; k++) spawnLater(k * 0.22, function () { if (boss && !boss.dead) { fireOrb(boss.x, boss.y + 110, aimAt(boss.x, boss.y + 110, 0.6), shot, tune.homing); SX.play('spark'); } }); }, 0.9);
    else if (name === 'dash') bossAttack(b, function () { var p = bossPattern(b); b.dash = { t: 0, dur: 1.9, dx: K.clamp(ship.x, B.rx, G.FW - B.rx) - p[0], depth: Math.max(120, ship.y - 20 - bossHome() - B.ry * 0.45) }; SX.play('dig'); }, 1.1);
    else if (name === 'ring') bossAttack(b, function () { var off = Math.random() * 6.28, n = b.phase > 1 ? 12 : 10;
      for (var i = 0; i < n; i++) { var a = off + i / n * 6.283; if (Math.sin(a) > -0.3) fireOrb(b.x + Math.cos(a) * 120, b.y + B.core[1] + Math.sin(a) * 110, a, 170); }
      if (b.id === 3) fireOrb(b.x, b.y + 80, aimAt(b.x, b.y + 80, 0.6), shot);
      SX.play('spark'); }, 1);
    else if (name === 'spiral') bossAttack(b, function () { var a0 = Math.random() * 6.28; for (var k = 0; k < 14; k++) (function (k) { spawnLater(k * 0.12, function () { if (boss && !boss.dead) { var a = a0 + k * 0.5; if (Math.sin(a) > -0.2) fireOrb(boss.x + Math.cos(a) * 60, boss.y + Math.sin(a) * 60, a, 180); } }); })(k); SX.play('spark'); }, 0.9);
    else if (name === 'wands') bossAttack(b, function () { [-120, 120].forEach(function (x, j) { for (var k = 0; k < 3; k++) spawnLater(j * 0.11 + k * 0.24, function () { if (boss && !boss.dead) { var ox = boss.x + x, oy = boss.y + 100; fireOrb(ox, oy, aimAt(ox, oy, 0.7), shot, tune.homing); SX.play('spark'); } }); }); }, 0.9);
  }
  function updateBoss(dt) {
    var b = boss, B = A.BOSSES[b.id];
    b.t += dt; b.flash = Math.max(0, b.flash - dt * 7);
    b.shown += (b.hp - b.shown) * Math.min(1, dt * 3);
    if (b.dead) { // sparks, breaks in two, the halves fly off
      b.deadT += dt; b.charge = 0;
      if (b.deadT < 1.4) {
        b.tilt = Math.sin(b.deadT * 22) * 0.06;
        if (Math.random() < dt * 10) { var px = b.x + K.rand(-B.rx, B.rx), py = b.y + K.rand(-B.ry, B.ry); boom(px, py, 70, ['#ffffff', '#ffd36b', B.color]); SX.play('boom', { size: 0.6 }); }
      } else {
        if (b.split === 0) { boom(b.x, b.y, 240, ['#ffffff', '#ffd36b', B.color, A.shade(B.color, -0.3)]); SX.play('big'); K.fx.shake(14, 0.5);
          K.fx.burst(b.x, b.y, { n: 26, colors: [B.color, A.shade(B.color, -0.3), '#8b93b0'], speed: 520, size: 34, life: 1.4, gravity: 0, drag: 0.97, jitter: 120 }); }
        b.split += dt * 0.9; b.vy -= 700 * dt; b.y += b.vy * dt; b.tilt *= 0.9;
        if (Math.random() < dt * 24) K.fx.burst(b.x + K.rand(-B.rx, B.rx), b.y + K.rand(-40, 60), { n: 2, colors: ['#ffd36b', '#ffffff', '#ff9f43'], speed: 140, size: 10, life: 0.6, shape: 'spark', gravity: 0 });
        if (b.y < -B.h || b.deadT > 4.5) boss = null;
      }
      return;
    }
    if (b.enterT < 2.2) {
      b.enterT += dt; var k = Math.min(1, b.enterT / 2.2);
      b.y = K.lerp(-B.h * 0.7, bossHome(), K.ease.outBack(k)); b.x = G.FW / 2; b.thrust = 1 - k; b.m = 0;
      return;
    }
    // phase change at half health: the core turns hot orange, sparks and smoke; red near the end
    var frac = b.hp / b.maxHp;
    b.damage = frac < 0.34 ? 2 : frac < 0.67 ? 1 : 0;
    if (b.phase === 1 && frac < 0.5) { b.phase = 2; K.fx.shake(9, 0.35); SX.play('boom', { size: 1.2 }); K.fx.burst(b.x, b.y, { n: 24, colors: ['#ffb347', '#ffffff', '#ffd36b'], speed: 420, size: 10, life: 0.7, shape: 'spark', gravity: 0 }); }
    b.coreC = frac < 0.25 ? '#ff6b6b' : b.phase > 1 ? '#ffb347' : '#7dfcff';
    var speed = (b.phase > 1 ? 1.35 : 1) * (b.id === 0 ? 0.8 : 1) * tune.speed;
    if (!b.dash) b.m += dt * speed;
    var p = bossPattern(b), ox = 0, oy = 0;
    if (b.dash) { var D = b.dash; D.t += dt; var u = Math.min(1, D.t / D.dur), w = Math.sin(u * Math.PI); ox = D.dx * w; oy = D.depth * w; b.thrust = 1; if (u >= 1) b.dash = null; }
    else b.thrust = 0.3 + 0.2 * Math.sin(b.t * 3);
    var nx = p[0] + ox, ny = p[1] + oy;
    b.tilt = K.clamp((nx - b.x) / Math.max(dt, 1e-3) / 2400, -0.12, 0.12);
    b.vx = (nx - b.x) / Math.max(dt, 1e-3); b.vy = (ny - b.y) / Math.max(dt, 1e-3); b.x = nx; b.y = ny;
    b.aim += (Math.atan2(ship.y - b.y, ship.x - b.x) - b.aim) * Math.min(1, dt * 4);
    b.sparkT -= dt;
    if (b.damage && b.sparkT <= 0) { b.sparkT = b.damage > 1 ? 0.18 : 0.4;
      var sx = b.x + K.rand(-B.rx * 0.8, B.rx * 0.8), sy = b.y + K.rand(-B.ry * 0.6, B.ry * 0.6);
      K.fx.burst(sx, sy, { n: 3, colors: ['#ffd36b', '#ffffff'], speed: 200, size: 8, life: 0.35, shape: 'spark', gravity: 300 });
      if (b.phase > 1) K.fx.burst(sx, sy, { n: 1, color: 'rgba(190,190,210,.5)', speed: 40, size: 26, life: 1.1, shape: 'dot', gravity: -60, drag: 0.97 }); }
    if (b.chargeFn) { b.chargeT -= dt; b.charge = 1 - b.chargeT / b.chargeMax; if (b.chargeT <= 0) { var f = b.chargeFn; b.chargeFn = null; b.charge = 0; f(); } return; }
    if (state !== 'play' || b.dash) return;
    b.atkT -= dt;
    if (b.atkT <= 0) {
      var list = BOSS_ATTACKS[b.id];
      bossDoAttack(b, list[b.atkI % list.length]); b.atkI++;
      b.atkT = [3.1, 2.1, 2.2, 1.9][b.id] * (b.phase > 1 ? 0.75 : 1);
    }
  }
  function summonSwoop(n, depth) { var g = { w: n, side: Math.random() < 0.5 ? 'L' : 'R', depth: depth }; for (var i = 0; i < n; i++) (function (i) { spawnLater(i * 0.45, function () { spawnStream(g, i); enemies[enemies.length - 1].group = -1; }); })(i); }
  function summonWeave(n) { var g = { d: n }; for (var i = 0; i < n; i++) spawnLater(i * 0.6, function () { spawnStream(g, 0); enemies[enemies.length - 1].group = -1; }); }
  function spawnLater(t, fn) { later.push({ t: t, fn: fn }); }
  function hitBoss(b, x, y) {
    var B = A.BOSSES[b.id], cx = b.x + B.core[0], cy = b.y + B.core[1], core = (x - cx) * (x - cx) + (y - cy) * (y - cy) < (B.core[2] + 14) * (B.core[2] + 14);
    b.hp = Math.max(0, b.hp - (core ? 2 : 1)); b.flash = 1; score += core ? 25 : 10;
    K.fx.burst(x, y, { n: core ? 8 : 4, colors: core ? ['#ffffff', b.coreC] : ['#ffffff', '#ffe27a'], speed: core ? 340 : 260, size: core ? 11 : 9, life: 0.3, shape: 'spark', gravity: 0 });
    if (core) { SX.play('clank'); flashes.push({ x: cx, y: cy, r: B.core[2] * 1.6, t: 0, life: 0.2, c: b.coreC }); } else SX.play('clunk');
    if (b.hp <= 0) bossDefeated(b);
    hud();
  }
  function bossDefeated(b) {
    b.dead = true; b.deadT = 0; later = []; b.vy = 0; b.chargeFn = null; b.dash = null;
    var B = A.BOSSES[b.id];
    score += 2000; hud(); pScore.bump();
    SX.play('big'); K.fx.shake(16, 0.6); K.buzz(60);
    boom(b.x + B.core[0], b.y + B.core[1], 160, ['#ffffff', '#ffd36b', b.coreC]);
    K.fx.text(G.FW / 2, b.y + 220, 'Boss cleared! +2000', { size: 54, color: '#fff6c2', stroke: 'rgba(40,10,60,.7)', life: 2.2, rise: 120 });
    for (var i = 0; i < 14; i++) dropStar(b.x + K.rand(-B.rx, B.rx), b.y + K.rand(-B.ry, B.ry));
    // everything the machine sent out powers down into stars
    enemies.forEach(function (e) { if (e.delay <= 0 && e.y > 0) { boom(e.x, e.y, e.r, ['#ffffff', '#ffd36b']); dropStar(e.x, e.y); } });
    enemies = []; shots.forEach(function (s) { K.fx.burst(s.x, s.y, { n: 4, color: '#ffb3e6', speed: 120, size: 8, life: 0.4, shape: 'dot', gravity: 0 }); }); shots = [];
  }

  // ---------- input: relative drag (the ship moves with the finger and never jumps under it) ----------
  function toGame(sx, sy) { return { x: (sx - G.ox) / G.s, y: sy / G.s }; }
  function clampShip() {
    var cx = K.clamp(ship.tx, 70, G.FW - 70), cy = K.clamp(ship.ty, G.minY, G.maxY);
    if (drag) { drag.sx += cx - ship.tx; drag.sy += cy - ship.ty; } // re-anchor at the edges so reversing responds at once
    ship.tx = cx; ship.ty = cy;
  }
  function markFlown() { if (!flown) { flown = true; store.set('flown', true); } if (hint) { hint.hide(); hint = null; } }
  K.pointer(canvas, toGame, {
    down: function (p) { if (state !== 'play' || ship.dead) return; drag = { px: p.x, py: p.y, sx: ship.tx, sy: ship.ty, moved: 0 }; },
    move: function (p) {
      if (!drag || state !== 'play') return;
      ship.tx = drag.sx + (p.x - drag.px); ship.ty = drag.sy + (p.y - drag.py);
      clampShip();
      drag.moved += Math.abs(p.dx) + Math.abs(p.dy);
      if (drag.moved > 90) markFlown();
    },
    hover: function (p) { if (state !== 'play' || !ship || ship.dead) return; if (Math.abs(p.x - ship.tx) + Math.abs(p.y - ship.ty) > 120) markFlown(); ship.tx = p.x; ship.ty = p.y; clampShip(); },
    up: function () { drag = null; }
  });
  addEventListener('keydown', function (e) { if ((e.key === 'Escape' || e.key === 'p') && state === 'play') pause(); });

  // ---------- simulation ----------
  function step(dt) {
    time += dt;
    K.fx.update(dt);
    if (bannerT > 0) bannerT -= dt;
    if (bossBannerT > 0) bossBannerT -= dt;
    if (warpT > 0) warpT -= dt;
    updateBackdrop(dt);
    for (var f = flashes.length - 1; f >= 0; f--) { flashes[f].t += dt; if (flashes[f].t >= flashes[f].life) flashes.splice(f, 1); }
    if (state === 'paused' || !ship) return;
    for (var l = later.length - 1; l >= 0; l--) { later[l].t -= dt; if (later[l].t <= 0) { var fn = later[l].fn; later.splice(l, 1); if (state === 'play') fn(); } }

    updateShip(dt);
    if (state === 'play' && bannerT < 1.2) director(dt);
    updateEnemies(dt);
    if (boss) updateBoss(dt);
    updateShots(dt);
    updatePickups(dt);
    if (state === 'play') collide();

    if (state === 'play' && dir.done && !enemies.length && !boss) clearWave();
    if (state === 'clear') { clearT += dt; }
  }

  function updateShip(dt) {
    var s = ship;
    if (state === 'play' && !s.dead) {
      if (autopilot) autoPilot();
      var kx = (K.keys.ArrowRight ? 1 : 0) - (K.keys.ArrowLeft ? 1 : 0), ky = (K.keys.ArrowDown ? 1 : 0) - (K.keys.ArrowUp ? 1 : 0);
      if (kx || ky) { s.tx += kx * 1100 * dt; s.ty += ky * 900 * dt; clampShip(); markFlown(); }
    }
    var px = s.x, py = s.y, k = 1 - Math.exp(-dt * (warpT > 0 ? 6 : 20));
    s.x += (s.tx - s.x) * k; s.y += (s.ty - s.y) * k;
    s.vx = (s.x - px) / dt;
    s.bank += (K.clamp(s.vx / 1100, -1, 1) - s.bank) * Math.min(1, dt * 10);
    s.thrust += (K.clamp(-(s.y - py) / dt / 700, 0, 1) + (warpT > 0 ? 1 : 0) - s.thrust) * Math.min(1, dt * 8);
    s.inv = Math.max(0, s.inv - dt); s.flash = Math.max(0, s.flash - dt * 5); s.squash = Math.max(0, s.squash - dt * 4); s.muzzle = Math.max(0, s.muzzle - dt * 14);
    if (s.shieldT > 0) s.shieldT = Math.max(0, s.shieldT - dt);
    if (s.spreadT > 0) s.spreadT = Math.max(0, s.spreadT - dt);
    if (s.magnetT > 0) s.magnetT = Math.max(0, s.magnetT - dt);
    if (state === 'play' && !s.dead && warpT <= 0.3) {
      s.fireT -= dt;
      if (s.fireT <= 0) { s.fireT = FIRE; fire(); }
    }
    for (var i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y < -80 || b.x < -60 || b.x > G.FW + 60) bullets.splice(i, 1);
    }
  }
  function fire() {
    var s = ship;
    bullets.push({ x: s.x, y: s.y - 74, vx: 0, vy: -1500 });
    if (s.spreadT > 0) [-1, 1].forEach(function (d) { var a = d * 0.2; bullets.push({ x: s.x + d * 58, y: s.y - 6, vx: Math.sin(a) * 1500, vy: -Math.cos(a) * 1500, gold: true }); });
    s.muzzle = 1; SX.play('laser');
  }

  function bez3(p, u) { var v = 1 - u; return [v * v * v * p[0][0] + 3 * v * v * u * p[1][0] + 3 * v * u * u * p[2][0] + u * u * u * p[3][0],
                                               v * v * v * p[0][1] + 3 * v * v * u * p[1][1] + 3 * v * u * u * p[2][1] + u * u * u * p[3][1]]; }
  function fireBurst(e) { // zappers: a short burst of slow, bright sparks (aimed in later worlds)
    var n = tune.burst || 1;
    for (var k = 0; k < n; k++) (function (k) { spawnLater(k * 0.2, function () {
      if (enemies.indexOf(e) < 0 || state !== 'play') return;
      var a = (tune.aim ? aimAt(e.x, e.y + 44, 0.55) : Math.PI / 2) + (n > 1 ? (k / (n - 1) - 0.5) * 0.16 : 0);
      fireOrb(e.x, e.y + 44, a, tune.shot, tune.homing); SX.play('spark'); e.squash = 1;
    }); })(k);
  }
  function updateEnemies(dt) {
    var sp = tune.speed;
    // dives: robots leave the formation one or more at a time, wiggling first so kids see them coming
    if (state === 'play' && tune.dive) {
      diveT -= dt;
      if (diveT <= 0) {
        diveT = tune.dive * K.rand(0.75, 1.25);
        var diving = enemies.filter(function (e) { return e.mode === 'prep' || e.mode === 'dive'; }).length;
        var cands = enemies.filter(function (e) { return e.mode === 'hold' && (e.kind === 'bot' || e.kind === 'tank'); });
        if (cands.length && diving < tune.divers) { var e0 = cands[(Math.random() * cands.length) | 0]; e0.mode = 'prep'; e0.t = 0; }
      }
    }
    var tracking = 0;
    enemies.forEach(function (e) { if (e.mode === 'track') tracking++; });
    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i], ox = e.x, oy = e.y;
      e.flash = Math.max(0, e.flash - dt * 7); e.squash = Math.max(0, e.squash - dt * 5); e.boost = Math.max(0, (e.boost || 0) - dt * 2);
      if (e.delay > 0) { e.delay -= dt; continue; }
      e.t += dt; e.warn = 0;
      if (e.mode === 'enter') {
        var P = e.path; P.t += dt / (P.dur / sp);
        var q0 = bez3([P.p0, P.p1, P.p2, [slotX(e), slotY(e)]], K.ease.inOutSine(Math.min(1, P.t)));
        e.x = q0[0]; e.y = q0[1];
        if (P.t >= 1) { e.mode = 'hold'; e.squash = 1; if (e.kind === 'zapper' && tune.shoot) e.shootT = Math.min(e.shootT, K.rand(0.9, 1.6)); }
      } else if (e.mode === 'hold' || e.mode === 'prep') {
        e.x = slotX(e); e.y = slotY(e);
        if (e.mode === 'prep') { // anticipation: wiggle and glow, longer in world 1
          var warnT = world === 0 ? 1.1 : 0.65;
          e.warn = 1; e.x += Math.sin(e.t * 40) * 8; e.squash = 0.5;
          if (e.t > warnT) {
            var s = e.x < ship.x ? 1 : -1;
            e.mode = 'dive'; e.t = 0; e.boost = 1; SX.play('whirr');
            e.path = { p: [[e.x, e.y], [e.x - s * 200, e.y + 230], [ship.x + ship.vx * 0.25, ship.y - 40], [ship.x + s * 160, G.FH + 150]], t: 0, dur: 2.9 / tune.diveSpeed };
          }
        }
        if (e.kind === 'zapper' && tune.shoot && state === 'play') {
          if (e.mode === 'hold' && tune.track && tracking < Math.max(1, world) && Math.random() < dt * 0.2) { e.mode = 'track'; e.trackT = K.rand(3.5, 5.5); tracking++; }
          zap(e, dt);
        }
      } else if (e.mode === 'track') { // follow the ranger along a lower lane, still sparking, then fly back up
        var v = 160 * sp, lane = Math.max(slotY(e) + 110, G.minY - 340);
        e.x += K.clamp(ship.x - e.x, -v * dt, v * dt); e.y += (lane - e.y) * Math.min(1, dt * 3);
        e.trackT -= dt; zap(e, dt);
        if (e.trackT <= 0) { e.mode = 'enter'; e.path = { p0: [e.x, e.y], p1: [e.x, e.y - 60], p2: [slotX(e), slotY(e) + 60], t: 0, dur: 1.2 }; }
      } else if (e.mode === 'dive') {
        var D = e.path; D.t += dt / D.dur; e.boost = 1;
        var q = bez3(D.p, Math.min(1, D.t)); e.x = q[0]; e.y = q[1];
        if (D.t >= 1) { var sd = Math.random() < 0.5 ? -1 : 1; entryPath(e, sd, slotX(e) + sd * 360, -130); }
      } else if (e.mode === 'swoop') {
        var W2 = e.path; W2.t += dt / W2.dur;
        var q2 = bez3(W2.p, Math.min(1, W2.t)); e.x = q2[0]; e.y = q2[1];
        if (W2.t >= 1) { enemies.splice(i, 1); continue; }
      } else if (e.mode === 'weave') {
        e.y += e.vy * dt; e.x0 += (ship.x - e.x0) * tune.home * dt * 1.5;
        var ph = e.t * 1.9 + e.ph; e.x = e.x0 + e.amp * (2 / Math.PI) * Math.asin(Math.sin(ph)); // zig-zag
        if (e.y > G.FH + 90) { enemies.splice(i, 1); continue; }
      } else { // pass: drifting rocks and tumbling junk
        e.x += e.vx * dt; e.y += e.vy * dt; e.rot += e.vr * dt;
        if (e.y > G.FH + 140 || (e.x < -160 && e.vx < 0) || (e.x > G.FW + 160 && e.vx > 0)) { enemies.splice(i, 1); continue; }
      }
      e.mvx = (e.x - ox) / dt; e.mvy = (e.y - oy) / dt;
      if (e.kind === 'drone') e.rot = K.clamp(e.mvx / 1600, -0.35, 0.35);
      else if (!KINDS[e.kind].rock && e.mode !== 'pass') e.rot = K.clamp(e.mvx / 2400, -0.25, 0.25);
    }
  }
  function zap(e, dt) {
    e.shootT -= dt;
    if (e.shootT < 0.8 && e.charge === 0) SX.play('charge');
    e.charge = e.shootT < 0.8 ? K.clamp(1 - e.shootT / 0.8, 0.01, 1) : 0;
    if (e.shootT <= 0) {
      if (shots.length < 4 + Math.min(world, 2) * 2 && e.y < ship.y - 280) { fireBurst(e); e.shootT = tune.shoot * K.rand(0.9, 1.5); }
      else e.shootT = 0.9;
      e.charge = 0;
    }
  }

  function updateShots(dt) {
    for (var i = shots.length - 1; i >= 0; i--) {
      var s = shots[i];
      if (s.home && s.y >= ship.y - 300) s.home = 0; // once close, a spark flies straight for good (fair last-moment dodge)
      if (s.home && !ship.dead) { // gentle homing bubbles: they curve a little toward the ranger, then fly straight
        var cur = Math.atan2(s.vy, s.vx), want = Math.atan2(ship.y - s.y, ship.x - s.x), d = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
        var na = cur + K.clamp(d, -s.home * dt, s.home * dt), spd = Math.hypot(s.vx, s.vy); s.vx = Math.cos(na) * spd; s.vy = Math.sin(na) * spd;
      }
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.y > G.FH + 60 || s.y < -80 || s.x < -80 || s.x > G.FW + 80) shots.splice(i, 1);
    }
  }

  function dropStar(x, y) { pickups.push({ type: 'star', x: x, y: y, vx: K.rand(-160, 160), vy: K.rand(-200, 40), ph: Math.random() * 6 }); }
  function updatePickups(dt) {
    var pull = ship.magnetT > 0 || state === 'clear';
    for (var i = pickups.length - 1; i >= 0; i--) {
      var p = pickups[i];
      p.ph += dt;
      if (pull && !ship.dead && (p.type === 'star' || state === 'clear')) {
        var dx = ship.x - p.x, dy = ship.y - p.y, d = Math.hypot(dx, dy) || 1, f = state === 'clear' ? 3200 : 2400;
        p.vx += dx / d * f * dt; p.vy += dy / d * f * dt; p.vx *= 0.94; p.vy *= 0.94;
      } else {
        p.vx *= Math.pow(0.08, dt);
        var target = p.type === 'star' ? 230 : 130; p.vy += (target - p.vy) * Math.min(1, dt * 2.5);
      }
      if (!pull && p.type === 'star' && !ship.dead) { var ddx = ship.x - p.x, ddy = ship.y - p.y, dd = Math.hypot(ddx, ddy); if (dd < 190) { p.x += ddx / dd * 520 * dt; p.y += ddy / dd * 520 * dt; } }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.y > G.FH + 80) { pickups.splice(i, 1); continue; }
      if (!ship.dead && state !== 'fail') {
        var rr = p.type === 'star' ? 82 : 96;
        if (Math.abs(p.x - ship.x) < rr && Math.abs(p.y - ship.y) < rr && Math.hypot(p.x - ship.x, p.y - ship.y) < rr) { collect(p); pickups.splice(i, 1); }
      }
    }
  }
  function collect(p) {
    if (p.type === 'star') {
      starsGot++; score += 10; hud();
      SX.play('collect', { n: starsGot }); K.buzz(4);
      K.fx.burst(p.x, p.y, { n: 5, color: '#ffe27a', speed: 160, size: 9, life: 0.4, shape: 'star', gravity: 0 });
      return;
    }
    var P = A.PU[p.type];
    SX.play('powerup'); K.buzz(15);
    K.fx.burst(ship.x, ship.y, { n: 18, color: P.c, speed: 340, size: 12, life: 0.7, shape: 'star', gravity: 0, drag: 0.94 });
    K.fx.text(tx(ship.x), ship.y - 130, P.label, { color: P.c, size: 46, stroke: 'rgba(20,10,40,.75)' });
    ship.squash = 1;
    if (p.type === 'spread') ship.spreadT = 12;
    else if (p.type === 'shield') { ship.shieldT = 15; SX.play('shieldUp'); }
    else if (p.type === 'magnet') { ship.magnetT = 12; SX.play('magnet'); }
    else if (p.type === 'heart') { hearts = Math.min(MAX_HEARTS, hearts + 1); hud(); pHearts.bump(); }
  }

  // ---------- collisions ----------
  function collide() {
    // bullets vs enemies and boss
    for (var i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i], hit = false;
      for (var j = enemies.length - 1; j >= 0; j--) {
        var e = enemies[j];
        if (e.delay > 0 || e.y < 30) continue;
        var dx = b.x - e.x, dy = b.y - e.y, rr = e.r + 12;
        if (dx * dx + dy * dy < rr * rr) { hit = true; hitEnemy(e, j, b); break; }
      }
      if (!hit && boss && !boss.dead && boss.enterT > 1) {
        var B = A.BOSSES[boss.id], ex = (b.x - boss.x) / B.rx, ey = (b.y - boss.y) / B.ry;
        if (ex * ex + ey * ey < 1) { hit = true; hitBoss(boss, b.x, b.y); }
      }
      if (hit) bullets.splice(i, 1);
    }
    if (ship.dead || godMode) return;
    // ship vs enemies and sparks
    for (var k = enemies.length - 1; k >= 0; k--) {
      var en = enemies[k]; if (en.delay > 0) continue;
      var r2 = en.r * 0.72 + SHIP_R, ddx = en.x - ship.x, ddy = en.y - ship.y;
      if (ddx * ddx + ddy * ddy < r2 * r2) {
        if (ship.inv > 0) continue;
        hitLog.push(en.kind + ':' + en.mode); hurt(en.x, en.y);
        en.hp = Math.min(en.hp, 1); hitEnemy(en, enemies.indexOf(en), null);
        if (ship.dead) return;
      }
    }
    if (boss && !boss.dead && boss.enterT > 2 && ship.inv <= 0) { // the boss body bumps too (its dash comes close)
      var BB = A.BOSSES[boss.id], bx = (ship.x - boss.x) / (BB.rx + SHIP_R), by = (ship.y - boss.y) / (BB.ry + SHIP_R);
      if (bx * bx + by * by < 1) { hitLog.push('boss'); hurt(ship.x, ship.y); if (ship.dead) return; }
    }
    for (var m = shots.length - 1; m >= 0; m--) {
      var s = shots[m], sr = s.r * 0.8 + SHIP_R;
      if ((s.x - ship.x) * (s.x - ship.x) + (s.y - ship.y) * (s.y - ship.y) < sr * sr) {
        if (ship.inv > 0) continue;
        shots.splice(m, 1);
        K.fx.burst(s.x, s.y, { n: 8, colors: ['#ff8fd8', '#ffffff'], speed: 220, size: 9, life: 0.4, shape: 'spark', gravity: 0 });
        hitLog.push('shot' + (s.home ? ':home' : '')); hurt(s.x, s.y);
        if (ship.dead) return;
      }
    }
  }

  function tx(x) { return K.clamp(x, 140, G.FW - 140); }
  function hitEnemy(e, idx, b) {
    if (idx < 0) return;
    e.hp--; e.flash = 1; e.squash = 0.8;
    if (b) { e.y -= 4; K.fx.burst(b.x, b.y + 10, { n: 3, colors: ['#ffffff', '#bdfaff'], speed: 200, size: 8, life: 0.25, shape: 'spark', gravity: 0 }); }
    if (e.hp > 0) { SX.play(KINDS[e.kind].rock ? 'chip' : 'clunk'); return; }
    enemies.splice(idx, 1);
    var k = KINDS[e.kind], cols = k.rock ? [A.WORLDS[world].rock, A.shade(A.WORLDS[world].rock, -0.4), A.shade(A.WORLDS[world].rock, 0.4), '#ffffff'] : k.cols;
    var big = e.kind === 'rock' || e.kind === 'tank' || e.kind === 'sat';
    boom(e.x, e.y, e.r, cols);
    K.fx.shake(big ? 7 : 3.5, big ? 0.25 : 0.15);
    SX.play(k.rock ? 'crack' : e.kind === 'drone' ? 'zap' : (e.kind === 'can' || e.kind === 'gear' || e.kind === 'sat') ? 'junk' : 'boom', { size: big ? 1.3 : 0.8 });
    combo = time - lastKill < 1.4 ? combo + 1 : 1; lastKill = time;
    if (combo > 1) SX.play('combo', { step: Math.min(combo, 12) });
    var mult = Math.min(combo, 5), pts = e.pts * mult;
    score += pts; hud(); pScore.bump();
    var cheer = { 3: 'Nice!', 5: 'Great!', 8: 'Super!', 12: 'Amazing!', 16: 'Star Ranger!' }[combo];
    if (cheer) { K.fx.text(tx(e.x), e.y - 30, cheer, { color: '#fff6c2', size: 56, stroke: 'rgba(40,10,60,.7)' }); }
    else K.fx.text(tx(e.x), e.y, '+' + pts + (mult > 1 ? ' x' + mult : ''), { size: 34, rise: 70, life: 0.75, color: mult > 1 ? '#ffe27a' : '#ffffff' });
    for (var s = 0; s < k.stars; s++) dropStar(e.x, e.y);
    if (e.kind === 'rock') [-1, 1].forEach(function (d) { var p = makeEnemy('pebble', e.x + d * 20, e.y); p.vx = d * K.rand(70, 110); p.vy = Math.max(110, e.vy * 0.9); p.vr = d * 2; p.group = e.group; enemies.push(p); });
    if (e.carrier) pickups.push({ type: e.carrier, x: e.x, y: e.y, vx: 0, vy: -60, ph: 0 });
    else if (hearts < 3 && Math.random() < 0.05 && !pickups.some(function (p) { return p.type !== 'star'; })) pickups.push({ type: 'heart', x: e.x, y: e.y, vx: 0, vy: -60, ph: 0 });
  }
  function boom(x, y, r, cols) {
    flashes.push({ x: x, y: y, r: r * 1.6, t: 0, life: 0.35, c: cols[1] || '#ffffff' });
    K.fx.burst(x, y, { n: Math.round(8 + r / 6), colors: cols, speed: 260 + r * 3, size: 10 + r * 0.16, life: 0.75, gravity: 0, drag: 0.95, jitter: r * 0.6 });
    K.fx.burst(x, y, { n: 6, colors: ['#ffffff', '#fff3c4'], speed: 380, size: 12, life: 0.4, shape: 'spark', gravity: 0, drag: 0.93 });
  }

  function hurt(x, y) {
    var s = ship;
    if (s.shieldT > 0) {
      s.shieldT = 0; s.inv = 1; SX.play('shieldBlock');
      K.fx.burst(s.x, s.y, { n: 22, colors: ['#bff8ff', '#5ee7ff', '#ffffff'], speed: 420, size: 10, life: 0.6, shape: 'spark', gravity: 0 });
      K.fx.text(tx(s.x), s.y - 120, 'Blocked!', { color: '#bff8ff', size: 44, stroke: 'rgba(10,30,60,.7)' });
      K.fx.shake(5, 0.2);
      return;
    }
    hearts--; combo = 0;
    s.inv = world ? 1.6 : 2; s.flash = 1; s.squash = 1;
    SX.play('hurt'); K.fx.shake(13, 0.4); K.buzz(45);
    K.fx.burst(s.x, s.y, { n: 16, colors: ['#ff8070', '#ffffff', '#ffd36b'], speed: 360, size: 11, life: 0.6, gravity: 0, drag: 0.94 });
    hud(); pHearts.bump();
    if (hearts <= 0) { shipDown(); return; }
    K.fx.text(tx(s.x), s.y - 130, hearts === 1 ? 'Last heart!' : '-1 heart', { size: 44, color: '#ffd1dc', stroke: 'rgba(60,10,30,.7)', life: 1.1 });
  }
  function shipDown() {
    var s = ship;
    s.dead = true; state = 'fail'; drag = null;
    boom(s.x, s.y, 120, ['#ff8070', '#ffffff', '#ffd36b', '#7ff6ff']);
    SX.play('shipDown'); SX.play('lose'); K.fx.shake(16, 0.5);
    setTimeout(function () {
      if (state !== 'fail') return;
      K.ui.sheet({ title: 'Out of hearts', text: "Let's fly that wave again!", buttons: [
        { label: 'Try Again', icon: 'restart', primary: true, onClick: function () { startLevel(level); } },
        { label: 'Levels', icon: 'levels', onClick: openLevels }] });
    }, 1400);
  }

  function clearWave() {
    state = 'clear'; clearT = 0; drag = null;
    var stars = Math.min(3, hearts);
    progress.finish(level, stars);
    K.bridge.complete();
    SX.play('win');
    shots = [];
    ship.inv = 0; ship.tx = G.FW / 2; ship.ty = Math.max(G.minY, G.maxY - 140);
    for (var i = 0; i < 6; i++) setTimeout(function () {
      var x = K.rand(G.FW * 0.15, G.FW * 0.85), y = K.rand(G.formTop, G.formTop + 400);
      flashes.push({ x: x, y: y, r: 150, t: 0, life: 0.5, c: '#fff3c4' });
      K.fx.burst(x, y, { n: 24, colors: ['#ffd36b', '#ff8fab', '#7ae7ff', '#ffffff'], speed: 460, size: 15, life: 1.2, shape: 'star', gravity: 120, drag: 0.97 });
    }, 200 + i * 170);
    var last = level === COUNT, endOfWorld = level % PER === 0;
    setTimeout(function () {
      var buttons = [];
      if (!last) buttons.push({ label: endOfWorld ? 'Next World' : 'Next Wave', icon: 'next', primary: true, onClick: function () { startLevel(level + 1); } });
      buttons.push({ label: last ? 'Play Again' : 'Replay', icon: 'restart', row: true, primary: last, onClick: function () { startLevel(last ? 1 : level); } });
      buttons.push({ label: 'Levels', icon: 'levels', row: true, onClick: openLevels });
      K.ui.sheet({
        title: last ? 'You saved the stars!' : endOfWorld ? A.WORLDS[world].name + ' done!' : 'Wave clear!',
        text: last ? 'All 24 waves flown. MashaAllah, Star Ranger!' : 'Score ' + score.toLocaleString() + ' · ' + starsGot + ' stars caught',
        stars: stars, buttons: buttons });
    }, 1500);
  }

  function pause() {
    if (state !== 'play') return;
    state = 'paused'; drag = null;
    K.ui.sheet({ title: 'Paused', text: A.WORLDS[world].name + ' · ' + (def.boss != null ? 'Boss' : 'Wave ' + (((level - 1) % PER) + 1)), buttons: [
      { label: 'Resume', icon: 'play', primary: true, onClick: function () { state = 'play'; } },
      { label: 'Restart', icon: 'restart', row: true, onClick: function () { startLevel(level); } },
      { label: 'Levels', icon: 'levels', row: true, onClick: openLevels },
      { label: K.sfx.muted ? 'Sound: Off' : 'Sound: On', icon: K.sfx.muted ? 'soundOff' : 'sound', onClick: function () { K.sfx.toggle(); state = 'play'; pause(); } }] });
  }
  function openLevels() {
    var was = state; state = 'paused';
    K.ui.levelSelect({
      title: 'Star Rangers',
      worlds: A.WORLDS.map(function (w, i) { return { name: w.name, color: w.color, from: i * PER + 1, to: i * PER + PER }; }),
      progress: progress, current: level,
      onPick: function (n) { startLevel(n); },
      onClose: function () { if (was === 'paused' || was === 'play') state = 'play'; else if (was === 'clear') startLevel(Math.min(COUNT, level + 1)); else startLevel(level); }
    });
  }

  // ---------- backdrop: painted sky, drifting scenery, three star layers ----------
  function makeDots() {
    dots = [];
    var n = K.clamp(Math.round(G.w * G.h / 4200), 70, 240);
    for (var i = 0; i < n; i++) dots.push({ x: Math.random(), y: Math.random(), z: i % 3, tw: Math.random() * 6.28 });
  }
  var SCEN = [['moonlet', 'station', 'moonlet'], ['rock', 'rock', 'rock', 'rock', 'rock'], ['icemoon', 'rock', 'rock', 'rock'], ['gasball', 'gasball', 'rock']];
  function makeScenery() {
    scen = []; fore = [];
    var u = Math.min(G.w, G.h) / 400;
    SCEN[world].forEach(function (kind, i) {
      scen.push({ kind: kind, size: Math.round((kind === 'station' ? 44 : kind === 'rock' ? 22 + i * 9 : 34 + i * 14) * u), x: Math.random(), y: Math.random() * G.h, v: 6 + i * 4 + (kind === 'rock' ? 6 : 0) });
    });
    if (world === 1 || world === 2) for (var f = 0; f < 2; f++) fore.push({ size: Math.round((110 + f * 50) * u), side: f % 2 ? 1 : -1, y: Math.random() * G.h, v: 120 + f * 40 });
  }
  function updateBackdrop(dt) {
    var warp = warpT > 0 ? Math.min(1, warpT / 0.6) : 0, sp = 1 + warp * 14;
    var speeds = [9, 24, 60];
    dots.forEach(function (d) { d.y += speeds[d.z] * sp * dt / Math.max(1, G.h); if (d.y > 1) { d.y -= 1; d.x = Math.random(); } d.tw += dt * 2; });
    scen.forEach(function (o) { o.y += o.v * (1 + warp * 4) * dt; if (o.y - o.size > G.h) { o.y = -o.size * 1.2; o.x = Math.random(); } });
    fore.forEach(function (o) { o.y += o.v * (1 + warp * 3) * dt; if (o.y - o.size > G.h) { o.y = -o.size * 1.5 - Math.random() * G.h; } });
  }
  function drawBackdrop() {
    var d = G.dpr, key = world + '|' + G.w + 'x' + G.h + '@' + d;
    if (!bg || bgKey !== key) { bg = A.paintBg(world, G.w, G.h, d); bgKey = key; A.clearScenery(); }
    var nx = ship ? (ship.x / G.FW - 0.5) * 2 : 0, ny = ship ? K.clamp((ship.y - G.minY) / Math.max(1, G.maxY - G.minY) - 0.5, -1, 1) : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg.c, -bg.m - nx * 10 * d, -bg.m - ny * 8 * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    // mid scenery drifts slowly (farther = slower and hazier)
    scen.forEach(function (o, i) {
      var c = A.scenery(o.kind, o.size, d, world), x = o.x * G.w - nx * (6 + i * 3);
      ctx.globalAlpha = o.kind === 'rock' ? 0.85 : 0.95;
      ctx.drawImage(c, x - c.size / 2, o.y - c.size / 2, c.size, c.size);
    });
    ctx.globalAlpha = 1;
    // star layers
    var warp = warpT > 0 ? Math.min(1, warpT / 0.6) : 0, sizes = [0.8, 1.3, 2], alphas = [0.45, 0.7, 0.95], shifts = [3, 8, 16];
    ctx.fillStyle = '#ffffff';
    for (var i = 0; i < dots.length; i++) {
      var p = dots[i], x = p.x * G.w - nx * shifts[p.z], y = p.y * G.h, sz = sizes[p.z];
      ctx.globalAlpha = alphas[p.z] * (p.z === 0 ? 0.6 + 0.4 * Math.sin(p.tw) : 1);
      if (warp > 0.05) { var L = sz * (2 + warp * 30 * (p.z + 1)); ctx.fillRect(x - sz * 0.4, y - L, sz * 0.8, L); }
      else if (p.z === 2) { ctx.beginPath(); ctx.arc(x, y, sz * 0.75, 0, 6.283); ctx.fill(); }
      else ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
    // soft haze outside the field on wide screens (scenery continues; no frame)
    if (G.ox > 24) {
      var fx = G.ox, gl = ctx.createLinearGradient(0, 0, fx, 0);
      gl.addColorStop(0, 'rgba(2,2,14,.32)'); gl.addColorStop(1, 'rgba(2,2,14,0)');
      ctx.fillStyle = gl; ctx.fillRect(0, 0, fx, G.h);
      var gr = ctx.createLinearGradient(G.w - fx, 0, G.w, 0);
      gr.addColorStop(0, 'rgba(2,2,14,0)'); gr.addColorStop(1, 'rgba(2,2,14,.32)');
      ctx.fillStyle = gr; ctx.fillRect(G.w - fx, 0, fx, G.h);
    }
  }
  function drawForeground() {
    if (!fore.length) return;
    var d = G.dpr, nx = ship ? (ship.x / G.FW - 0.5) * 2 : 0;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    fore.forEach(function (o) {
      var c = A.scenery('darkrock', o.size, d, world), x = (o.side < 0 ? -o.size * 0.18 : G.w + o.size * 0.18) - nx * 30;
      ctx.drawImage(c, x - c.size / 2, o.y - c.size / 2, c.size, c.size);
    });
  }

  // ---------- drawing ----------
  function draw() {
    drawBackdrop();
    if (!ship) return;
    var d = G.dpr, sh = K.fx.offset(), s = G.s * d;
    ctx.setTransform(s, 0, 0, s, (G.ox + sh.x * G.s) * d, sh.y * G.s * d);

    // pickups (stars first, power-ups on top)
    for (var i = 0; i < pickups.length; i++) if (pickups[i].type === 'star') A.pickup(ctx, pickups[i], time);
    for (var i2 = 0; i2 < pickups.length; i2++) if (pickups[i2].type !== 'star') A.pickup(ctx, pickups[i2], time);
    // enemies
    for (var j = 0; j < enemies.length; j++) {
      var e = enemies[j]; if (e.delay > 0) continue;
      if (e.carrier) { var P = A.PU[e.carrier]; ctx.save(); ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 6); ctx.strokeStyle = P.c; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 22 + Math.sin(time * 6) * 4, 0, 6.283); ctx.stroke(); ctx.restore(); }
      if (e.kind === 'bot' || e.kind === 'tank' || e.kind === 'zapper') A.bot(ctx, e, time);
      else if (e.kind === 'drone') A.drone(ctx, e, time);
      else if (e.kind === 'rock' || e.kind === 'pebble') A.rock(ctx, e, world);
      else A.junk(ctx, e);
    }
    if (boss) A.boss(ctx, boss);
    // player bolts and enemy sparks
    for (var b = 0; b < bullets.length; b++) A.bullet(ctx, bullets[b]);
    for (var k = 0; k < shots.length; k++) A.orb(ctx, shots[k], time);
    // ranger ship (blinks while it can't be hit)
    if (!ship.dead) {
      var blink = ship.inv > 0 && state === 'play' ? (Math.sin(time * 34) > 0 ? 0.3 : 1) : 1;
      A.ship(ctx, ship.x, ship.y, { bank: ship.bank, t: time, flash: ship.flash, alpha: blink, muzzle: ship.muzzle, spread: ship.spreadT > 0,
        shield: ship.shieldT, magnet: ship.magnetT, thrust: ship.thrust, squash: ship.squash });
    }
    K.fx.draw(ctx);
    // explosion flashes (additive)
    if (flashes.length) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      flashes.forEach(function (f) {
        var u = f.t / f.life, r = f.r * (0.4 + K.ease.outCubic(u) * 0.9);
        var g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
        g.addColorStop(0, 'rgba(255,255,255,' + (1 - u) * 0.9 + ')'); g.addColorStop(0.4, A.rgba(f.c.charAt(0) === '#' ? f.c : '#ffffff', (1 - u) * 0.5)); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, 6.283); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,' + (1 - u) * 0.6 + ')'; ctx.lineWidth = 6 * (1 - u); ctx.beginPath(); ctx.arc(f.x, f.y, r * 1.1, 0, 6.283); ctx.stroke();
      });
      ctx.restore();
    }
    drawForeground();
    drawOverlay();
  }

  function drawOverlay() {
    var d = G.dpr;
    // boss health bar under the HUD
    if (boss && !boss.dead && boss.enterT > 0.6) {
      ctx.setTransform(d, 0, 0, d, 0, 0);
      var B = A.BOSSES[boss.id], bw = Math.min(G.w - 120, 440), bh = 16, x = (G.w - bw) / 2, y = barY();
      var a = Math.min(1, (boss.enterT - 0.6) / 0.6);
      ctx.globalAlpha = a;
      ctx.font = '800 15px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,6,30,.7)'; ctx.lineJoin = 'round';
      ctx.strokeText(B.name, G.w / 2, y - 2); ctx.fillStyle = '#fff6df'; ctx.fillText(B.name, G.w / 2, y - 2);
      ctx.fillStyle = 'rgba(14,10,34,.7)'; A.rr(ctx, x - 3, y - 3 + 2, bw + 6, bh + 6, (bh + 6) / 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.75)'; A.rr(ctx, x, y + 2, bw * K.clamp(boss.shown / boss.maxHp, 0, 1), bh, bh / 2); ctx.fill();
      var fw = bw * K.clamp(boss.hp / boss.maxHp, 0, 1);
      if (fw > 2) {
        var gr = ctx.createLinearGradient(0, y, 0, y + bh); gr.addColorStop(0, A.shade(B.color, 0.4)); gr.addColorStop(1, A.shade(B.color, -0.2));
        ctx.fillStyle = boss.flash > 0.5 ? '#ffffff' : gr; A.rr(ctx, x, y + 2, fw, bh, bh / 2); ctx.fill();
      }
      ctx.fillStyle = '#f6c453'; ctx.strokeStyle = '#7a4a12'; ctx.lineWidth = 1.5;
      [x - 4, x + bw + 4].forEach(function (sx) { A.star8(ctx, sx, y + 2 + bh / 2, 13, 0.55, time); ctx.fill(); ctx.stroke(); });
      ctx.globalAlpha = 1;
    }
    // wave banner
    var cx = G.w / 2, cy = G.h * 0.4;
    function banner(top, big, sub, k, col) {
      ctx.setTransform(d, 0, 0, d, 0, 0);
      var sc = Math.min(1, G.w / 420);
      ctx.globalAlpha = Math.max(0, k);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.font = '800 ' + Math.round(17 * sc + 3) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(8,4,26,.6)';
      ctx.strokeText(top, cx, cy - 46 * sc); ctx.fillStyle = col; ctx.fillText(top, cx, cy - 46 * sc);
      ctx.font = '800 ' + Math.round(48 * sc + 6) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = 9;
      ctx.strokeText(big, cx, cy); ctx.fillStyle = '#fffaf0'; ctx.fillText(big, cx, cy);
      if (sub) { ctx.font = '800 ' + Math.round(20 * sc + 4) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = 6;
        ctx.strokeText(sub, cx, cy + 46 * sc); ctx.fillStyle = 'rgba(255,250,240,.92)'; ctx.fillText(sub, cx, cy + 46 * sc); }
      ctx.globalAlpha = 1;
    }
    if (bannerT > 0) {
      var k = Math.min(1, bannerT / 0.4, (2.2 - bannerT) / 0.3);
      banner(A.WORLDS[world].name.toUpperCase(), def.boss != null ? 'Boss Wave' : 'Wave ' + (((level - 1) % PER) + 1), def.name, k, A.WORLDS[world].color);
    }
    if (bossBannerT > 0 && boss) {
      var k2 = Math.min(1, bossBannerT / 0.4, (2.4 - bossBannerT) / 0.3);
      banner('BOSS MACHINE AHEAD', A.BOSSES[boss.id].name, 'Hit the glowing core!', k2, '#ffd36b');
    }
  }

  K.loop({ step: step, draw: draw, hz: 120, onHidden: function () { if (state === 'play' && !DEBUG) pause(); } });

  // ---------- autopilot (debug only): steer under targets, dodge sparks and rocks ----------
  var apPlan = null;
  function autoPilot() {
    var tgt = null, td = 1e9;
    if (boss && !boss.dead && boss.enterT > 1) tgt = boss;
    else enemies.forEach(function (e) {
      if (e.delay > 0 || e.y < 30 || e.y > ship.y - 160) return;
      var dd = Math.abs(e.x - ship.x) + (e.mode === 'hold' ? 0 : 250);
      if (dd < td) { td = dd; tgt = e; }
    });
    var want = tgt ? tgt.x : G.FW / 2;
    pickups.forEach(function (p) { if (p.type !== 'star' && p.y > ship.y - 600 && p.y < ship.y) want = p.x; });
    var ys = dodge ? [G.maxY - 30, G.maxY - 200, Math.max(G.minY, G.maxY - 380)] : [G.maxY - 30];
    function score(x, Y) {
      var cost = Math.abs(x - want) * 0.002 + Math.abs(x - ship.x) * 0.001 + Math.abs(Y - ship.y) * 0.001 + (G.maxY - 30 - Y) * 0.0015;
      for (var t = 0; dodge && t <= 2; t += 0.1) {
        // where the ranger would be at time t on its way to (x, Y)
        var k = Math.min(1, t * 6), sx = ship.x + (x - ship.x) * k, sy = ship.y + (Y - ship.y) * k;
        shots.forEach(function (s) { var px = s.x + s.vx * t, py = s.y + s.vy * t;
          if (s.home && s.y < sy - 280) px += (sx - px) * Math.min(1, s.home * t * 0.8);
          if (Math.abs(py - sy) < 95 && Math.abs(px - sx) < s.r + 85) cost += 30 * (2.2 - t); });
        enemies.forEach(function (e) { if (e.mode === 'hold' || e.delay > 0) return; var px = e.x + e.mvx * t, py = e.y + e.mvy * t;
          if (Math.abs(py - sy) < e.r + 75 && Math.abs(px - sx) < e.r + 85) cost += 30 * (2.2 - t); });
        if (boss && !boss.dead && (boss.dash || boss.chargeFn)) { var BB = A.BOSSES[boss.id], bdx = boss.x + (boss.vx || 0) * t, bdy = boss.y + (boss.vy || 0) * t;
          if (boss.chargeFn || boss.dash) { if (Math.abs(bdx - sx) < BB.rx + 90 && sy - bdy < BB.ry + 260) cost += 20; } }
      }
      // the dash itself: sample the path finely so it never cuts through sparks on the way
      for (var f = 0.1; dodge && f < 1; f += 0.1) {
        var ft = f * 0.2, fx = ship.x + (x - ship.x) * f, fy = ship.y + (Y - ship.y) * f;
        shots.forEach(function (s) { if (Math.abs(s.y + s.vy * ft - fy) < s.r + 50 && Math.abs(s.x + s.vx * ft - fx) < s.r + 50) cost += 60; });
        enemies.forEach(function (e) { if (e.delay > 0) return; if (Math.abs(e.y + e.mvy * ft - fy) < e.r + 45 && Math.abs(e.x + e.mvx * ft - fx) < e.r + 45) cost += 60; });
      }
      return cost;
    }
    var best = null, bc = 1e9;
    ys.forEach(function (Y) { for (var i = 0; i <= 40; i++) { var x = 70 + (G.FW - 140) * i / 40, c = score(x, Y); if (c < bc) { bc = c; best = [x, Y]; } } });
    // stick with the current plan unless the new one is clearly better (no flip-flopping through danger)
    if (apPlan && bc > 2) { var pc = score(apPlan[0], apPlan[1]); if (pc <= bc + 1.5) best = apPlan; }
    apPlan = best;
    ship.tx = best[0]; ship.ty = best[1]; clampShip();
  }

  // Test hook (only with ?debug in the URL): step the game by hand and inspect it.
  if (DEBUG) window.SR = {
    run: function (sec) { for (var i = 0; i < Math.round(sec * 120); i++) step(1 / 120); draw(); },
    draw: draw, start: startLevel,
    auto: function (on, noDodge) { autopilot = on !== false; dodge = !noDodge; }, god: function (on) { godMode = on !== false; },
    aim: function (x, y) { ship.tx = x; if (y != null) ship.ty = y; clampShip(); },
    get: function () { return { state: state, level: level, world: world, hearts: hearts, score: score, combo: combo, stars: starsGot,
      enemies: enemies.length, shots: shots.length, group: dir.gi, groups: def.g.length, done: dir.done,
      boss: boss ? { hp: boss.hp, x: Math.round(boss.x), y: Math.round(boss.y), dead: boss.dead } : null,
      ship: { x: Math.round(ship.x), y: Math.round(ship.y), tx: Math.round(ship.tx), ty: Math.round(ship.ty), shield: ship.shieldT > 0, spread: ship.spreadT > 0 },
      G: { s: G.s, FW: Math.round(G.FW), FH: Math.round(G.FH), ox: Math.round(G.ox), minY: Math.round(G.minY), maxY: Math.round(G.maxY), formTop: Math.round(G.formTop) } }; },
    hits: function () { return hitLog; }, shotsArr: function () { return shots; }, enemies: function () { return enemies; }, boss: function () { return boss; }, pickups: function () { return pickups; }, G: G,
    give: function (type) { collect({ type: type, x: ship.x, y: ship.y }); }
  };

  // Fonts come from the local cache; start once ready so the banner text is crisp.
  var fontsReady = document.fonts && document.fonts.load ? document.fonts.load('800 40px Nunito') : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 700); })]).catch(function () {}).then(function () {
    startLevel(progress.current());
  });
})();
