/* Mosaic Breaker: game.js
   Fly the magic carpet, bounce the star and break the glazed tiles. 30 levels in 3 worlds.
   Built on the shared kit (js/kit): full-screen stage, fixed-step loop, pointer input, fx, sfx, ui, progress. */
(function () {
  'use strict';
  var A = window.MosaicArt, LV = window.MOSAIC_LEVELS, K = window.Kit;
  // The field is at least 1000 units wide and needs FH_MIN units of height (9 tile rows plus room to react).
  // Portrait screens show it full width; wider screens widen it (tiles stretch) up to FW_MAX, so landscape
  // tablets and desktops get a big play area instead of a narrow column.
  var COUNT = LV.list.length, FW_MIN = 1000, FW_MAX = 1500, FH_MIN = 1390, WALL = 36, BH = 52, ROW = 60, BALL_R = 30, CARPET_H = 38;
  var FW = FW_MIN, IN_L = WALL, IN_R, CELL, BW;
  function setFieldWidth(fw) { FW = fw; IN_R = FW - WALL; CELL = (IN_R - IN_L) / LV.cols; BW = CELL - 6; }
  setFieldWidth(FW_MIN);
  // A wider field gets a wider carpet (part of the extra width) so it plays about the same.
  function carpetWidth() { return tune ? tune.carpet * (1 + (FW / FW_MIN - 1) * 0.6) : 300; }

  var store = K.store('kahf-mosaic-breaker'), progress = K.progress(store, COUNT);
  var canvas = document.getElementById('stage');

  // ---------- state ----------
  var level = 1, world = 0, tune = null, bricks = [], balls = [], drops = [], ambient = [];
  var carpet = null, lives = 3, livesLost = 0, score = 0, combo = 0, speed = 500, slowT = 0;
  var state = 'idle', bannerT = 0, sinceHit = 0, time = 0, launchedOnce = !!store.get('launched', false), hint = null;
  var keyVel = 0;

  // ---------- layout (game units: the field is 1000-1500 wide, height follows the screen) ----------
  var G = { s: 1, ox: 0, FH: 1600, ceil: 120, top: 160, padY: 1400, dpr: 1, w: 0, h: 0 };
  var bg = null, bgWorld = -1, pillarImg = null, sprites = {};
  var stage = K.stage(canvas, function (st) {
    G.w = st.w; G.h = st.h; G.dpr = st.dpr;
    G.s = Math.min(st.w / FW_MIN, st.h / FH_MIN);
    setFieldWidth(Math.min(st.w / G.s, FW_MAX));
    G.ox = (st.w - FW * G.s) / 2; G.FH = st.h / G.s;
    G.ceil = (st.safe.top + 66) / G.s;
    G.top = G.ceil + 50 + Math.max(0, (G.FH - 1500) * 0.3);
    G.speedMul = K.clamp(G.FH / 1500, 1, 1.25);
    G.padY = G.FH - (st.safe.bottom + 64) / G.s - CARPET_H;
    sprites = {}; bg = null; pillarImg = null;
    layoutBricks();
    if (carpet) { carpet.y = G.padY; carpet.base = carpetWidth(); if (!(carpet.wideT > 0)) carpet.w = carpet.base; }
  });
  var ctx = stage.ctx;

  // ---------- HUD ----------
  var pLevel = K.ui.pill(''), pHearts = K.ui.hearts(3);
  K.ui.spacer();
  var pScore = K.ui.pill('');
  K.ui.iconButton('pause', 'Pause', function () { if (state === 'play') pause(); });
  function hud() {
    pLevel.set('<svg viewBox="-50 -50 100 100" style="width:18px;height:18px"><path d="M0-46 13-31 32-32 31-13 46 0 31 13 32 32 13 31 0 46-13 31-32 32-31 13-46 0-31-13-32-32-13-31Z" fill="' +
      A.WORLDS[world].color + '"/></svg>Level ' + level);
    pHearts.setMax(Math.max(3, lives)); pHearts.setLives(lives);
    pScore.set(score.toLocaleString());
  }

  // ---------- levels ----------
  function layoutBricks() {
    bricks.forEach(function (b) { b.w = BW; b.x = IN_L + b.c * CELL + 3; b.y = G.top + b.r * ROW; });
  }
  function startLevel(n) {
    level = K.clamp(n, 1, COUNT); world = LV.worldOf(level); tune = LV.tuning(level);
    progress.setCurrent(level);
    var def = LV.list[level - 1];
    bricks = [];
    def.rows.forEach(function (row, r) {
      for (var c = 0; c < row.length; c++) {
        var ch = row[c]; if (ch === '.') continue;
        var b = { r: r, c: c, x: 0, y: 0, w: BW, h: BH, wob: 0, flash: 0, enter: 0.05 + (r * 0.06 + Math.abs(c - 5) * 0.025) };
        if (ch === '#') { b.kind = 'stone'; b.hp = b.maxHp = Infinity; b.color = 0; }
        else if (ch === 'G') { b.kind = 'gold'; b.hp = b.maxHp = 3; b.color = 2; }
        else if (/[a-e]/.test(ch)) { b.kind = 'strong'; b.hp = b.maxHp = 2; b.color = 'abcde'.indexOf(ch); }
        else { b.kind = 'normal'; b.hp = b.maxHp = 1; b.color = (+ch - 1); }
        b.alive = true;
        bricks.push(b);
      }
    });
    layoutBricks();
    lives = 3; livesLost = 0; score = 0; combo = 0; slowT = 0; drops = []; speed = tune.speed * (G.speedMul || 1);
    carpet = { x: FW / 2, target: FW / 2, y: G.padY, base: carpetWidth(), w: carpetWidth(), wideT: 0, squash: 0 };
    balls = [newStuckBall()];
    makeAmbient();
    K.fx.clear();
    state = 'play'; bannerT = 1.8; sinceHit = 0;
    hud();
    if (!launchedOnce && !hint) hint = K.ui.hint('Drag to move · Let go to launch', 150, true);
  }
  function newStuckBall() { return { x: FW / 2, y: G.padY - BALL_R - 4, vx: 0, vy: 0, stuck: true, off: (Math.random() - 0.5) * 30, trail: [] }; }
  function breakableLeft() { for (var i = 0; i < bricks.length; i++) if (bricks[i].alive && bricks[i].kind !== 'stone') return true; return false; }

  // ---------- ambient life in the background (CSS px) ----------
  function makeAmbient() {
    ambient = [];
    for (var i = 0; i < 22; i++) ambient.push({ x: Math.random(), y: Math.random(), v: 0.4 + Math.random() * 0.6, ph: Math.random() * 6.28, s: 0.6 + Math.random() * 0.8 });
  }

  // ---------- input ----------
  function toGame(sx, sy) { return { x: (sx - G.ox) / G.s, y: sy / G.s }; }
  K.pointer(canvas, toGame, {
    down: function (p) { if (state === 'play') carpet.target = p.x; },
    move: function (p) { if (state === 'play') carpet.target = p.x; },
    hover: function (p) { if (state === 'play') carpet.target = p.x; },
    up: function () { if (state === 'play') launch(); }
  });
  addEventListener('keydown', function (e) {
    if (e.key === ' ' || e.key === 'ArrowUp') { if (state === 'play') launch(); }
    if (e.key === 'Escape' || e.key === 'p') { if (state === 'play') pause(); }
  });

  function launch() {
    var any = false;
    balls.forEach(function (b) {
      if (!b.stuck) return;
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
      b.stuck = false; b.vx = Math.cos(a) * speed; b.vy = Math.sin(a) * speed; any = true;
    });
    if (any) {
      K.sfx.play('whoosh'); bannerT = Math.min(bannerT, 0.3);
      if (!launchedOnce) { launchedOnce = true; store.set('launched', true); }
      if (hint) { hint.hide(); hint = null; }
    }
  }

  // ---------- simulation ----------
  function step(dt) {
    time += dt;
    K.fx.update(dt);
    ambient.forEach(function (a) { a.ph += dt; a.y -= dt * 0.012 * a.v * (world === 1 ? -1 : 1); if (a.y < -0.05) a.y = 1.05; if (a.y > 1.05) a.y = -0.05; a.x += Math.sin(a.ph) * dt * 0.006; });
    bricks.forEach(function (b) { b.wob = Math.max(0, b.wob - dt * 4); b.flash = Math.max(0, b.flash - dt * 6); if (b.enter > -1) b.enter -= dt; });
    if (bannerT > 0) bannerT -= dt;
    if (state !== 'play') return;

    // carpet
    if (K.keys.ArrowLeft) keyVel = Math.max(-1, keyVel - dt * 6); else if (K.keys.ArrowRight) keyVel = Math.min(1, keyVel + dt * 6); else keyVel = 0;
    if (keyVel) carpet.target += keyVel * 1100 * dt;
    if (carpet.wideT > 0) { carpet.wideT -= dt; if (carpet.wideT <= 0) K.tween(carpet, { w: carpet.base }, 0.4, K.ease.outBack); }
    carpet.target = K.clamp(carpet.target, IN_L + carpet.w / 2, IN_R - carpet.w / 2);
    carpet.x += (carpet.target - carpet.x) * (1 - Math.exp(-dt * 28));
    carpet.x = K.clamp(carpet.x, IN_L + carpet.w / 2, IN_R - carpet.w / 2);
    carpet.y = G.padY; carpet.squash = Math.max(0, carpet.squash - dt * 5);

    if (slowT > 0) slowT -= dt;
    sinceHit += dt;
    var want = speed * (slowT > 0 ? 0.68 : 1);

    for (var i = balls.length - 1; i >= 0; i--) {
      var b = balls[i];
      if (b.stuck) { b.x = carpet.x + b.off; b.y = carpet.y - BALL_R - 4; b.trail.length = 0; continue; }
      var sp = Math.hypot(b.vx, b.vy) || 1, ns = sp + (want - sp) * Math.min(1, dt * 3);
      b.vx *= ns / sp; b.vy *= ns / sp;
      var n = Math.max(1, Math.ceil(ns * dt / (BALL_R * 0.5))), sdt = dt / n;
      for (var k = 0; k < n; k++) {
        b.x += b.vx * sdt; b.y += b.vy * sdt;
        if (b.x - BALL_R < IN_L) { b.x = IN_L + BALL_R; b.vx = Math.abs(b.vx); K.sfx.play('tick'); }
        if (b.x + BALL_R > IN_R) { b.x = IN_R - BALL_R; b.vx = -Math.abs(b.vx); K.sfx.play('tick'); }
        if (b.y - BALL_R < G.ceil) { b.y = G.ceil + BALL_R; b.vy = Math.abs(b.vy); K.sfx.play('tick'); }
        // carpet
        var hw = carpet.w / 2;
        if (b.vy > 0 && b.y + BALL_R >= carpet.y && b.y - BALL_R <= carpet.y + CARPET_H && b.x >= carpet.x - hw - BALL_R && b.x <= carpet.x + hw + BALL_R) {
          var rel = K.clamp((b.x - carpet.x) / hw, -1, 1), ang = -Math.PI / 2 + rel * 1.05;
          if (sinceHit > 18) ang += (Math.random() - 0.5) * 0.4; // never stuck in a boring loop
          // Last few tiles: after a few quiet seconds, the carpet nudges the bounce toward one of them.
          if (sinceHit > 4) {
            var rem = bricks.filter(function (t) { return t.alive && t.kind !== 'stone'; });
            if (rem.length && rem.length <= 4) {
              var tg = rem[(Math.random() * rem.length) | 0];
              var want2 = Math.atan2(tg.y + tg.h / 2 - b.y, tg.x + tg.w / 2 - b.x);
              want2 = K.clamp(want2, -Math.PI + 0.45, -0.45);
              ang = ang * 0.35 + want2 * 0.65;
            }
          }
          var s2 = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(ang) * s2; b.vy = Math.sin(ang) * s2; b.y = carpet.y - BALL_R;
          combo = 0; carpet.squash = 1;
          speed = Math.min(tune.speed * (G.speedMul || 1) * 1.18, speed * 1.012);
          K.sfx.play('bounce', { pitch: rel }); K.buzz(6);
          K.fx.burst(b.x, carpet.y, { n: 6, colors: ['#ffd36b', '#ffffff'], speed: 160, size: 7, life: 0.4, gravity: 200, shape: 'dot', spread: 1.6, angle: -Math.PI / 2 });
        }
        // tiles
        for (var j = 0; j < bricks.length; j++) {
          var t = bricks[j]; if (!t.alive || t.enter > 0) continue;
          var cx = K.clamp(b.x, t.x, t.x + t.w), cy = K.clamp(b.y, t.y, t.y + t.h), dx = b.x - cx, dy = b.y - cy, d2 = dx * dx + dy * dy;
          if (d2 >= BALL_R * BALL_R) continue;
          var nx, ny;
          if (d2 > 0.0001) { var d = Math.sqrt(d2); nx = dx / d; ny = dy / d; b.x += nx * (BALL_R - d); b.y += ny * (BALL_R - d); }
          else { nx = 0; ny = b.vy > 0 ? -1 : 1; b.y = ny < 0 ? t.y - BALL_R : t.y + t.h + BALL_R; }
          var dot = b.vx * nx + b.vy * ny;
          if (dot < 0) { b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny; }
          hitTile(t, b);
          break;
        }
        // keep a playable angle (never almost horizontal)
        var s3 = Math.hypot(b.vx, b.vy);
        if (Math.abs(b.vy) < s3 * 0.3) { b.vy = (b.vy < 0 ? -1 : 1) * s3 * 0.3; var r2 = s3 / Math.hypot(b.vx, b.vy); b.vx *= r2; b.vy *= r2; }
        if (b.y - BALL_R > G.FH + 30) { balls.splice(i, 1); break; }
      }
      if (balls[i] === b) { b.tc = (b.tc || 0) + 1; if (b.tc % 2 === 0) { b.trail.push([b.x, b.y]); if (b.trail.length > 9) b.trail.shift(); } }
    }

    // falling lanterns
    for (var q = drops.length - 1; q >= 0; q--) {
      var dp = drops[q]; dp.y += 250 * dt; dp.t += dt;
      if (dp.y + 26 > carpet.y && dp.y - 30 < carpet.y + CARPET_H && Math.abs(dp.x - carpet.x) < carpet.w / 2 + 20) { catchDrop(dp); drops.splice(q, 1); continue; }
      if (dp.y > G.FH + 60) drops.splice(q, 1);
    }

    if (!balls.length) loseLife();
  }

  function hitTile(t, b) {
    sinceHit = 0;
    var cx = t.x + t.w / 2, cy = t.y + t.h / 2, pal = A.WORLDS[world].tiles, col = t.kind === 'gold' ? '#f6c453' : pal[t.color];
    t.wob = 1; t.flash = 1;
    if (t.kind === 'stone') { K.sfx.play('stone'); K.fx.burst(b.x, b.y, { n: 5, color: '#cdb89c', speed: 140, size: 6, life: 0.35, shape: 'dot' }); return; }
    t.hp--;
    if (t.hp > 0) {
      K.sfx.play('clink'); K.fx.burst(b.x, b.y, { n: 6, colors: ['#ffffff', col], speed: 220, size: 7, life: 0.35, shape: 'spark', gravity: 300 });
      score += 5; hud(); return;
    }
    t.alive = false; combo++;
    K.sfx.note(Math.min(combo - 1, 14));
    K.buzz(10);
    K.fx.burst(cx, cy, { n: 14, colors: [col, A.shade(col, 0.35), A.shade(col, -0.25), '#ffffff'], speed: 380, size: 15, life: 0.9, jitter: 30 });
    K.fx.burst(cx, cy, { n: 5, color: '#fff3c4', speed: 160, size: 16, life: 0.7, shape: 'star', gravity: -60 });
    if (t.kind === 'gold') { K.fx.shake(6, 0.2); K.fx.burst(cx, cy, { n: 18, color: '#ffd36b', speed: 420, size: 14, life: 1, shape: 'star', gravity: 400 }); }
    var pts = (t.kind === 'gold' ? 50 : t.kind === 'strong' ? 20 : 10) * Math.min(combo, 10);
    score += pts; hud(); pScore.bump();
    var cheer = { 4: 'Nice!', 7: 'Great!', 10: 'Amazing!', 14: 'Super Star!', 20: 'Unstoppable!' }[combo];
    if (cheer) { K.fx.text(cx, cy, cheer, { color: '#fff6c2', size: 54, stroke: 'rgba(60,20,80,.6)' }); K.fx.shake(4, 0.15); }
    else if (combo > 1) K.fx.text(cx, cy, '+' + pts, { size: 30, rise: 60, life: 0.7 });
    if (drops.length < 2 && Math.random() < tune.drop) {
      var types = ['wide', 'wide', 'multi', 'multi', 'slow'];
      if (lives < 5 && Math.random() < 0.35) types.push('life');
      drops.push({ x: cx, y: cy, type: types[(Math.random() * types.length) | 0], t: 0 });
    }
    if (!breakableLeft()) clearLevel();
  }

  function catchDrop(dp) {
    K.sfx.play('power'); K.buzz(15);
    var col = A.PU_COLORS[dp.type].c;
    K.fx.burst(dp.x, carpet.y, { n: 16, color: col, speed: 300, size: 12, life: 0.7, shape: 'star', gravity: 300, spread: 2.2, angle: -Math.PI / 2 });
    var label = { wide: 'Big Carpet!', multi: 'Triple Star!', slow: 'Slow Motion', life: '+1 Heart' }[dp.type];
    K.fx.text(carpet.x, carpet.y - 70, label, { color: col, size: 40, stroke: 'rgba(20,10,40,.7)' });
    if (dp.type === 'wide') { carpet.wideT = 14; K.tween(carpet, { w: carpet.base * 1.5 }, 0.45, K.ease.outBack); }
    else if (dp.type === 'slow') slowT = 9;
    else if (dp.type === 'life') { lives = Math.min(5, lives + 1); hud(); pHearts.bump(); }
    else if (dp.type === 'multi') {
      var src = balls.filter(function (b) { return !b.stuck; })[0] || balls[0];
      if (src && src.stuck) launch();
      if (src) [-0.45, 0.45].forEach(function (da) {
        var a = Math.atan2(src.vy || -1, src.vx) + da, sp = Math.hypot(src.vx, src.vy) || speed;
        balls.push({ x: src.x, y: src.y, vx: Math.cos(a) * sp, vy: -Math.abs(Math.sin(a) * sp), stuck: false, trail: [] });
      });
    }
  }

  function loseLife() {
    lives--; livesLost++; combo = 0; slowT = 0; drops = [];
    K.sfx.play('lose'); K.fx.shake(10, 0.35); K.buzz(40);
    hud(); pHearts.bump();
    if (lives <= 0) {
      state = 'fail';
      setTimeout(function () {
        K.ui.sheet({ title: 'Out of hearts', text: "Let's try that mosaic again!", buttons: [
          { label: 'Try Again', icon: 'restart', primary: true, onClick: function () { startLevel(level); } },
          { label: 'Levels', icon: 'levels', onClick: openLevels }] });
      }, 700);
      return;
    }
    carpet.wideT = 0; carpet.w = carpet.base;
    K.fx.text(FW / 2, G.padY - 200, 'Oops! ' + lives + (lives === 1 ? ' heart left' : ' hearts left'), { size: 44, color: '#ffd1dc', stroke: 'rgba(60,10,30,.6)', life: 1.3 });
    balls = [newStuckBall()];
  }

  function clearLevel() {
    state = 'clear';
    var stars = livesLost === 0 ? 3 : livesLost === 1 ? 2 : 1;
    progress.finish(level, stars);
    K.bridge.complete();
    K.sfx.play('win');
    for (var i = 0; i < 6; i++) setTimeout(function () {
      K.fx.burst(K.rand(IN_L + 80, IN_R - 80), K.rand(G.top, G.FH * 0.55), { n: 22, colors: ['#ffd36b', '#ff8fab', '#7ae7ff', '#ffffff'], speed: 460, size: 16, life: 1.2, shape: 'star', gravity: 500 });
    }, i * 160);
    balls.forEach(function (b) { b.vx *= 0.2; b.vy *= 0.2; });
    var last = level === COUNT, endOfWorld = level % 10 === 0;
    setTimeout(function () {
      var buttons = [];
      if (!last) buttons.push({ label: endOfWorld ? 'Next World' : 'Next Level', icon: 'next', primary: true, onClick: function () { startLevel(level + 1); } });
      buttons.push({ label: last ? 'Play Again' : 'Replay', icon: 'restart', row: true, primary: last, onClick: function () { startLevel(last ? 1 : level); } });
      buttons.push({ label: 'Levels', icon: 'levels', row: true, onClick: openLevels });
      K.ui.sheet({
        title: last ? 'You did it!' : endOfWorld ? A.WORLDS[world].name + ' complete!' : 'Mosaic complete!',
        text: last ? 'All 30 mosaics are shining. MashaAllah!' : 'Score ' + score.toLocaleString(),
        stars: stars, buttons: buttons });
    }, 1300);
  }

  function pause() {
    state = 'paused';
    var sh = K.ui.sheet({ title: 'Paused', text: A.WORLDS[world].name + ' · Level ' + level, buttons: [
      { label: 'Resume', icon: 'play', primary: true, onClick: resume },
      { label: 'Restart', icon: 'restart', row: true, onClick: function () { startLevel(level); } },
      { label: 'Levels', icon: 'levels', row: true, onClick: openLevels },
      { label: K.sfx.muted ? 'Sound: Off' : 'Sound: On', icon: K.sfx.muted ? 'soundOff' : 'sound', onClick: function () { K.sfx.toggle(); pause(); } }] });
    return sh;
  }
  function resume() { state = 'play'; }
  function openLevels() {
    state = 'paused';
    K.ui.levelSelect({
      title: 'Mosaic Breaker',
      worlds: A.WORLDS.map(function (w, i) { return { name: w.name, color: w.color, from: i * 10 + 1, to: i * 10 + 10 }; }),
      progress: progress, current: level,
      onPick: function (n) { startLevel(n); },
      onClose: function () { if (breakableLeft() && lives > 0) state = 'play'; else startLevel(level); }
    });
  }

  // ---------- drawing ----------
  function ensureArt() {
    if (!bg || bgWorld !== world) { bg = A.paintWorld(world, G.w, G.h, G.dpr); bgWorld = world; sprites = {}; pillarImg = null; }
    if (!pillarImg) pillarImg = A.pillar(WALL, Math.ceil(G.FH), G.s * G.dpr, A.WORLDS[world].stone);
  }
  function tileSprite(t) {
    var key = t.kind + '|' + t.color + '|' + t.hp + '|' + t.maxHp;
    if (!sprites[key]) sprites[key] = A.tile(BW, BH, G.s * G.dpr, A.WORLDS[world].tiles[t.color], t.kind, t.hp, t.maxHp);
    return sprites[key];
  }

  function draw(alpha, frameDt) {
    ensureArt();
    var d = G.dpr, W = A.WORLDS[world], px = carpet ? (carpet.x - FW / 2) / (FW / 2) : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // background layers with parallax depth
    var m = bg.margin;
    ctx.drawImage(bg.sky, -m - px * 4 * d, 0);
    ctx.drawImage(bg.far, -m - px * 9 * d, 0);
    ctx.drawImage(bg.mid, -m - px * 16 * d, 0);
    // ambient: gold motes at night, petals at dawn, rising lanterns at sea
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ambient.forEach(function (a, i) {
      var x = a.x * G.w, y = a.y * G.h;
      if (world === 0) { ctx.globalAlpha = 0.35 + 0.35 * Math.sin(a.ph * 2 + i); ctx.fillStyle = '#ffe2a0'; ctx.beginPath(); ctx.arc(x, y, 1.6 * a.s, 0, 6.283); ctx.fill(); }
      else if (world === 1) { ctx.globalAlpha = 0.7; ctx.fillStyle = i % 3 ? '#ffb3c6' : '#ffffff'; ctx.save(); ctx.translate(x, y); ctx.rotate(a.ph); ctx.beginPath(); ctx.ellipse(0, 0, 5 * a.s, 2.6 * a.s, 0, 0, 6.283); ctx.fill(); ctx.restore(); }
      else if (i < 12) { var gl = ctx.createRadialGradient(x, y, 0, x, y, 12 * a.s); gl.addColorStop(0, 'rgba(255,200,110,.9)'); gl.addColorStop(1, 'rgba(255,200,110,0)'); ctx.globalAlpha = 0.8; ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, 12 * a.s, 0, 6.283); ctx.fill(); ctx.fillStyle = '#ffcf7a'; ctx.fillRect(x - 2.5 * a.s, y - 3 * a.s, 5 * a.s, 6 * a.s); }
    });
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg.near, -m - px * 26 * d, 0);

    // field (game units)
    var sh = K.fx.offset(), s = G.s * d;
    ctx.setTransform(s, 0, 0, s, (G.ox + sh.x * G.s) * d, sh.y * G.s * d);
    // pillars frame the play area (scenery continues around them: no box)
    ctx.drawImage(pillarImg, -6, 0, WALL + 6, G.FH);
    ctx.drawImage(pillarImg, FW - WALL, 0, WALL + 6, G.FH);
    A.frieze(ctx, -6, FW + 6, G.ceil, W.stone, time);

    // tiles
    for (var i = 0; i < bricks.length; i++) {
      var t = bricks[i]; if (!t.alive) continue;
      var sp = tileSprite(t), pad = sp.pad, e = t.enter > 0 ? 0 : Math.min(1, -t.enter / 0.45);
      if (t.enter > 0) continue;
      var drop = (1 - K.ease.outBack(e)) * -70, sc = 1 + t.wob * 0.12 * Math.sin(t.wob * 12);
      ctx.save();
      ctx.globalAlpha = Math.min(1, e * 2);
      ctx.translate(t.x + t.w / 2, t.y + t.h / 2 + drop); ctx.scale(sc, sc);
      ctx.drawImage(sp, -t.w / 2 - pad, -t.h / 2 - pad, t.w + pad * 2, t.h + pad * 2);
      if (t.flash > 0) { ctx.globalAlpha = t.flash * 0.6; ctx.fillStyle = '#fff'; A.rr(ctx, -t.w / 2, -t.h / 2, t.w, t.h, 9); ctx.fill(); }
      ctx.restore();
    }
    // lanterns
    drops.forEach(function (dp) { A.lantern(ctx, dp.x, dp.y, dp.type, time + dp.x); });
    // carpet
    if (carpet) {
      var sq = carpet.squash;
      A.carpet(ctx, carpet.x, carpet.y + sq * 4, carpet.w * (1 + sq * 0.06), CARPET_H * (1 - sq * 0.2), time,
        carpet.wideT > 0 ? '#ffb347' : slowT > 0 ? '#b79cff' : null);
    }
    // stars (balls)
    balls.forEach(function (b) { A.ball(ctx, b.x, b.y, BALL_R, time, b.trail); });
    K.fx.draw(ctx);

    // level banner
    if (bannerT > 0) {
      var k = Math.min(1, bannerT / 0.4, (1.8 - bannerT) / 0.3), cy = G.top + 380;
      ctx.globalAlpha = Math.max(0, k);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.font = '800 34px Nunito, system-ui, sans-serif'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(10,6,30,.55)';
      ctx.strokeText(W.name.toUpperCase(), FW / 2, cy - 54); ctx.fillStyle = W.color; ctx.fillText(W.name.toUpperCase(), FW / 2, cy - 54);
      ctx.font = '900 92px Nunito, system-ui, sans-serif'; ctx.lineWidth = 14;
      ctx.strokeText('Level ' + level, FW / 2, cy + 14); ctx.fillStyle = '#fffaf0'; ctx.fillText('Level ' + level, FW / 2, cy + 14);
      ctx.font = '800 38px Nunito, system-ui, sans-serif'; ctx.lineWidth = 8;
      ctx.strokeText(LV.list[level - 1].name, FW / 2, cy + 84); ctx.fillStyle = 'rgba(255,250,240,.9)'; ctx.fillText(LV.list[level - 1].name, FW / 2, cy + 84);
      ctx.globalAlpha = 1;
    }
  }

  K.loop({ step: step, draw: draw, hz: 120, onHidden: function () { if (state === 'play' && !window.MB) pause(); } });

  // Test hook (only with ?debug in the URL): step the game by hand and inspect it.
  if (/[?&]debug\b/.test(location.search)) window.MB = {
    run: function (sec) { for (var i = 0; i < Math.round(sec * 120); i++) step(1 / 120); draw(0, 0); },
    draw: function () { draw(0, 0); }, start: startLevel, launch: launch,
    aim: function (x) { carpet.target = x; },
    get: function () { return { state: state, level: level, lives: lives, score: score, combo: combo,
      left: bricks.filter(function (b) { return b.alive && b.kind !== 'stone'; }).length,
      balls: balls.map(function (b) { return { x: Math.round(b.x), y: Math.round(b.y), stuck: b.stuck }; }),
      carpet: { x: Math.round(carpet.x), w: Math.round(carpet.w), y: Math.round(carpet.y) }, FH: Math.round(G.FH), s: G.s }; },
    tiles: function () { return bricks; }, drops: function () { return drops; }, G: G
  };

  // Fonts load quickly from the local cache; start once they are ready so the banner text is crisp.
  var fontsReady = document.fonts && document.fonts.load ? document.fonts.load('900 40px Nunito') : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 700); })]).catch(function () {}).then(function () {
    startLevel(progress.current());
  });
})();
