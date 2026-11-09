/* Balloon Pop: game.js
   Tap to pop. Balloons drift up with a gentle sway; quick pops build a combo that makes each pop bigger and
   crackle more (no music: sounds are in js/sounds.js). Good-deed balloons carry a picture card that is shown big for a moment. Grey storm clouds are
   to be left alone (tapping one costs a heart). 24 levels in 3 worlds with 1-3 stars.
   Built on the shared kit (js/kit): full-screen stage, fixed-step loop, fx, sfx, ui, progress.
   Multi-touch: every finger pops (pointerdown is handled on the canvas directly). */
(function () {
  'use strict';
  var K = window.Kit, A = window.BalloonArt, D = window.BalloonDeeds, LV = window.BALLOON_LEVELS;
  var COUNT = LV.list.length, PER = LV.perWorld, DEBUG = /[?&]debug\b/.test(location.search);
  var BW = A.BALLOON.w, BH = A.BALLOON.h, KNOT = A.BALLOON.knot, STRING = 60, CARD = 84;
  var HOLD_END = 2.2, FLY = 0.45, BANNER = 2.6;

  var store = K.store('kahf-balloon-pop'), progress = K.progress(store, COUNT);
  var canvas = document.getElementById('stage');

  // ---------- state ----------
  var level = 1, world = 0, def = null, goals = [], balloons = [], rings = [], ambient = [];
  var hearts = 3, heartsLost = 0, state = 'play', time = 0, clock = 0, spawnT = 0, recentX = [], lastDeedT = 0;
  var deedBag = [], show = null, showQ = [], ts = 1, combo = 0, lastPopT = -9, bannerT = 0, par = 60, lastStars = 0;
  var ambT = 3, hint = null, stormHint = null, popped = !!store.get('popped', false), nextId = 1, parX = 0.5, parT = 0.5, run = 0;

  // ---------- layout (game units: the shorter screen side is about 430 units) ----------
  var G = { s: 1, w: 0, h: 0, dpr: 1, FW: 430, FH: 760, top: 110, wf: 1 };
  var bg = null, bgWorld = -1, spr = {}, clouds = null;
  var stage = K.stage(canvas, function (st) {
    G.w = st.w; G.h = st.h; G.dpr = st.dpr;
    G.s = K.clamp(Math.min(st.w, st.h) / 430, 0.8, 1.6);
    G.FW = st.w / G.s; G.FH = st.h / G.s;
    G.top = (st.safe.top + 112) / G.s;
    G.wf = K.clamp(G.FW / 470, 0.85, 1.9);
    bg = null; spr = {}; clouds = null; D.clearCache();
    balloons.forEach(function (b) { b.x0 = K.clamp(b.x0, BW * 0.5, G.FW - BW * 0.5); });
  });
  var ctx = stage.ctx;

  // ---------- HUD ----------
  var pLevel = K.ui.pill(''), pHearts = K.ui.hearts(3);
  K.ui.spacer();
  K.ui.iconButton('pause', 'Pause', function () { if (state === 'play') pause(); });
  var goalBar = document.createElement('div'); goalBar.className = 'bp-goals'; document.body.appendChild(goalBar);
  var chips = [], deedIcon = D.iconURL(72);
  var CHECK = '<svg class="bp-check" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  function hud() {
    pLevel.set('<svg viewBox="-50 -50 100 100" style="width:18px;height:18px"><path d="M0-46 13-31 32-32 31-13 46 0 31 13 32 32 13 31 0 46-13 31-32 32-31 13-46 0-31-13-32-32-13-31Z" fill="' +
      A.WORLDS[world].color + '"/></svg>Level ' + level);
    pHearts.setMax(def.hearts); pHearts.setLives(hearts);
    pHearts.style.display = (def.storm || def.escape) ? '' : 'none';
  }
  function buildGoals() {
    goalBar.innerHTML = '';
    chips = goals.map(function (g) {
      var el = document.createElement('div'); el.className = 'kit-pill bp-goal';
      var icon = g.t === 'color' ? A.balloonSVG(g.c) : g.t === 'any' ? A.anySVG() : '<img class="bp-ico card" src="' + deedIcon + '" alt="">';
      el.innerHTML = '<span class="bp-fill"></span>' + icon + '<span class="bp-n"></span>';
      el.setAttribute('aria-label', g.t === 'color' ? 'Pop ' + g.n + ' ' + A.COLORS[g.c].name + ' balloons' : g.t === 'any' ? 'Pop ' + g.n + ' balloons' : 'Collect ' + g.n + ' good deeds');
      goalBar.appendChild(el); g.el = el; return el;
    });
    goalHud();
  }
  function goalHud() {
    goals.forEach(function (g) {
      var shown = g.t === 'deed' ? g.shown : g.got, done = shown >= g.n, n = g.el.querySelector('.bp-n');
      if (done) { if (!g.el.classList.contains('done')) { g.el.classList.add('done'); n.innerHTML = CHECK; } }
      else n.textContent = shown + '/' + g.n;
      g.el.querySelector('.bp-fill').style.width = Math.round(Math.min(1, shown / g.n) * 100) + '%';
    });
  }
  function chipPos(g) { // centre of a goal chip, in game units
    if (!g || !g.el) return { x: G.FW / 2, y: 40 };
    var r = g.el.getBoundingClientRect(), c = canvas.getBoundingClientRect();
    return { x: (r.left + r.width / 2 - c.left) / G.s, y: (r.top + r.height / 2 - c.top) / G.s };
  }

  // ---------- voice: the kit's on-device voices (silent in ?debug so tests stay quiet) ----------
  function say(text) { if (!DEBUG) K.say.text(text, 'en'); }                       // English deed captions
  function praise() { if (!DEBUG) K.say.praise(Math.random() < 0.25 ? 'barakallah' : 'mashaallah'); } // Arabic praise

  // ---------- levels ----------
  function startLevel(n) {
    run++;
    level = K.clamp(n, 1, COUNT); world = LV.worldOf(level); def = LV.list[level - 1];
    progress.setCurrent(level);
    goals = def.goals.map(function (g) { return { t: g.t, c: g.c, n: g.n, got: 0, shown: 0 }; });
    balloons = []; rings = []; recentX = []; showQ = []; show = null;
    hearts = def.hearts; heartsLost = 0; time = 0; spawnT = 0.4; lastDeedT = 0; ts = 1; combo = 0; lastPopT = -9; lastStars = 0;
    par = LV.par(def, G.wf);
    K.fx.clear(); makeAmbient();
    state = 'play'; bannerT = BANNER;
    buildGoals(); hud();
    if (stormHint) { stormHint.hide(); stormHint = null; }
    if (!popped && !hint) hint = K.ui.hint('Tap the balloons!', hintY(), true);
  }
  function hintY() { return Math.round(Math.min(150, G.h * 0.16)); }
  function goalLeft(t, c) {
    var left = 0;
    goals.forEach(function (g) { if (g.t === t && (c == null || g.c === c)) left += Math.max(0, g.n - g.got); });
    return left;
  }
  function needed(b) { // would popping this balloon still move a goal?
    if (b.kind === 'storm') return false;
    for (var i = 0; i < goals.length; i++) {
      var g = goals[i]; if (g.got >= g.n) continue;
      if (g.t === 'any') return true;
      if (g.t === 'deed' && b.kind === 'deed') return true;
      if (g.t === 'color' && b.kind === 'b' && b.c === g.c) return true;
    }
    return false;
  }
  function goalsDone() { for (var i = 0; i < goals.length; i++) if (goals[i].got < goals[i].n) return false; return true; }
  function nextDeed() {
    if (!deedBag.length) { deedBag = D.list.map(function (_, i) { return i; }); for (var i = deedBag.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, t = deedBag[i]; deedBag[i] = deedBag[j]; deedBag[j] = t; } }
    return deedBag.pop();
  }

  // ---------- spawning ----------
  function spawn() {
    var live = 0, storms = 0, deedOn = false, rainbowOn = false;
    balloons.forEach(function (b) { if (b.popped || b.fade) return; if (b.kind === 'storm') storms++; else live++; if (b.kind === 'deed') deedOn = true; if (b.kind === 'rainbow') rainbowOn = true; });
    if (live >= Math.round(def.max * G.wf)) return false;
    var kind = 'b', dl = goalLeft('deed');
    if (!deedOn && dl > 0 && (time - lastDeedT > 5 || Math.random() < def.deed)) kind = 'deed';
    else if (!deedOn && dl === 0 && Math.random() < def.deed) kind = 'deed';
    else if (def.storm && storms < (def.stormMax || 2) && time > 2.5 && Math.random() < def.storm) kind = 'storm';
    else if (def.rainbow && !rainbowOn && time > 3 && Math.random() < def.rainbow) kind = 'rainbow';
    var need = [];
    goals.forEach(function (g) { if (g.t === 'color' && g.got < g.n) need.push(g.c); });
    var c = need.length && Math.random() < 0.5 ? need[(Math.random() * need.length) | 0] : def.colors[(Math.random() * def.colors.length) | 0];
    var z = kind === 'storm' || kind === 'deed' ? 1 : K.rand(0.84, 0.99), half = (kind === 'storm' ? 80 : BW * 0.5) * z, x = 0;
    for (var t = 0; t < 10; t++) {
      x = K.rand(half + 6, G.FW - half - 6);
      var ok = true; for (var k = 0; k < recentX.length; k++) if (Math.abs(recentX[k] - x) < BW * 1.1) ok = false;
      if (ok) break;
    }
    recentX.push(x); if (recentX.length > Math.max(2, Math.round(2 * G.wf))) recentX.shift();
    var amp = Math.min(K.rand(10, 26), x - half, G.FW - half - x);
    var b = { id: nextId++, kind: kind, c: c, x0: x, x: x, y: G.FH + (BH * 0.5 + 20) * z, z: z, t: 0, ph: Math.random() * 6.28,
      amp: Math.max(0, amp), freq: K.rand(0.7, 1.15), vy: (G.FH + 240) / def.rise * K.rand(0.92, 1.08) * (0.86 + 0.14 * z),
      vx: 0, popped: false, pop: 0, deed: kind === 'deed' ? nextDeed() : -1, cardX: 0, cardY: 0 };
    if (kind === 'storm') b.vy *= 0.85;
    if (kind === 'deed') lastDeedT = time;
    balloons.push(b);
    return true;
  }

  // ---------- input (every finger pops) ----------
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    var r = canvas.getBoundingClientRect();
    tap((e.clientX - r.left) / G.s, (e.clientY - r.top) / G.s);
  }, { passive: false });
  addEventListener('keydown', function (e) { if ((e.key === 'Escape' || e.key === 'p') && state === 'play') pause(); });

  function tap(x, y) {
    parT = K.clamp(x / G.FW, 0, 1);
    if (state !== 'play') return;
    if (show && show.t < HOLD_END) {
      var cs = showGeom(show);
      if (Math.abs(x - cs.x) < cs.s * 0.55 && Math.abs(y - cs.y) < cs.s * 0.55) { show.t = HOLD_END; K.sfx.play('tap'); return; }
    }
    var b = hitTest(x, y);
    if (b) popBalloon(b);
    else { K.sfx.play('puff'); K.fx.burst(x, y, { n: 5, colors: ['#ffffff', '#fff3b0'], shape: 'spark', speed: 140, size: 9, life: 0.35, gravity: 0 }); }
  }
  function hitTest(x, y) {
    var best = null, bd = 1e9, minR = 30 / G.s;
    for (var i = 0; i < balloons.length; i++) {
      var b = balloons[i]; if (b.popped || b.fade) continue;
      var d;
      if (b.kind === 'storm') d = Math.hypot((x - b.x) / Math.max(66 * b.z, minR), (y - b.y) / Math.max(42 * b.z, minR));
      else {
        d = Math.hypot((x - b.x) / Math.max(BW * 0.47 * b.z, minR), (y - (b.y - BH * 0.04 * b.z)) / Math.max(BH * 0.52 * b.z, minR)) / 1.15;
        if (b.kind === 'deed') { var cs = CARD * b.z * 0.62; if (Math.abs(x - b.cardX) < cs && Math.abs(y - b.cardY) < cs) d = Math.min(d, 0.7); }
      }
      if (d <= 1 && d < bd) { bd = d; best = b; }
    }
    return best;
  }

  // ---------- popping ----------
  function colorOf(b) { return b.kind === 'deed' ? '#f2b33d' : b.kind === 'rainbow' ? '#ff9a3c' : b.kind === 'storm' ? '#8c8fb3' : A.COLORS[b.c].c; }
  function popBalloon(b, o) {
    if (b.popped) return false;   // a double tap never counts a balloon twice
    o = o || {};
    b.popped = true; b.pop = 0.0001;
    if (b.kind === 'storm') { stormTapped(b); return true; }
    if (!o.quiet) { combo = time - lastPopT < 1.4 ? combo + 1 : 1; lastPopT = time; }
    var step = o.quiet ? o.step : combo - 1;
    K.sfx.play('pop', { size: b.kind === 'rainbow' || b.kind === 'deed' ? 2 : b.z < 0.9 ? 0 : 1, level: Math.min(1, step / 12) }); K.buzz(8); // combos: bigger, not higher
    if (o.quiet) return true;
    if (!popped) { popped = true; store.set('popped', true); if (hint) { hint.hide(); hint = null; } }
    goals.forEach(function (g) {
      if (g.got >= g.n) return;
      if (g.t === 'any' || (g.t === 'deed' && b.kind === 'deed') || (g.t === 'color' && b.kind === 'b' && b.c === g.c)) {
        g.got++; if (g.t !== 'deed') { g.shown = g.got; g.el.classList.remove('bump'); void g.el.offsetWidth; g.el.classList.add('bump'); }
      }
    });
    goalHud();
    var cheer = { 5: 'Great!', 8: 'Super!', 12: 'Amazing!', 16: 'MashaAllah!' }[combo];
    if (cheer) K.fx.text(b.x, b.y - 40, cheer, { color: '#fff6c2', size: 46, stroke: 'rgba(60,20,80,.55)' });
    else if (combo > 1) K.fx.text(b.x, b.y - 30, 'x' + combo, { size: 26, rise: 50, life: 0.6 });
    if (b.kind === 'deed') {
      showQ.push({ d: b.deed, x0: b.cardX, y0: b.cardY, s0: CARD * b.z, t: 0, g: goals.filter(function (g) { return g.t === 'deed'; })[0] || null });
      if (!show) nextShow();
    }
    if (b.kind === 'rainbow') {
      K.sfx.play('rainbow'); K.fx.shake(5, 0.25);
      var others = balloons.filter(function (q) { return !q.popped && !q.fade && q.kind !== 'storm' && q.y < G.FH + 10; });
      others.sort(function (p, q) { return Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y); });
      others.forEach(function (q, i) { q.chainT = 0.12 + i * 0.08; });
    }
    return true;
  }
  function burst(b) {
    var col = colorOf(b), x = b.x, y = b.y, z = b.z;
    if (b.kind === 'storm') {
      K.fx.burst(x, y, { n: 14, colors: ['#8c8fb3', '#b5b7d6', '#6d6f96'], speed: 200, size: 26, life: 0.8, shape: 'dot', gravity: -40, drag: 0.93, jitter: 40 });
      K.fx.burst(x, y + 30, { n: 8, color: '#8fd0ff', shape: 'dot', speed: 90, size: 7, gravity: 800, angle: Math.PI / 2, spread: 1.2, life: 0.7 });
      return;
    }
    var cols = b.kind === 'rainbow' ? A.CONFETTI : [col, A.shade(col, 0.45), A.shade(col, -0.2), '#ffffff', A.CONFETTI[(b.id * 3) % 7], A.CONFETTI[(b.id * 5 + 2) % 7]];
    K.fx.burst(x, y, { n: b.kind === 'rainbow' ? 34 : 18, colors: cols, speed: 430, size: 14, life: 1.15, gravity: 380, shape: 'shard', jitter: 30 * z, drag: 0.965 });
    K.fx.burst(x, y, { n: 6, colors: [col, A.shade(col, -0.15)], speed: 220, size: 10, life: 0.45, shape: 'dot', gravity: 700 });
    K.fx.burst(x, y - 10, { n: 3, color: '#fff6c8', shape: 'star', speed: 150, size: 18, life: 0.6, gravity: -30 });
    rings.push({ x: x, y: y, r: 26 * z, t: 0, col: col });
  }
  function stormTapped(b) {
    K.sfx.play('storm'); K.buzz(30); K.fx.shake(4, 0.2);
    combo = 0;
    K.fx.text(b.x, b.y - 50, 'Oops!', { size: 36, color: '#dfe6ff', stroke: 'rgba(30,30,70,.6)', life: 1 });
    loseHeart();
  }
  function loseHeart() {
    if (state !== 'play') return;
    hearts--; heartsLost++;
    K.sfx.play('heart');
    hud(); pHearts.bump();
    if (hearts <= 0) fail();
  }
  function escaped(b) {
    if (!def.escape || !needed(b)) return;
    K.sfx.play('bye');
    K.fx.burst(b.x, G.top - 20, { n: 8, colors: ['#ff8fab', '#ffd1dc'], shape: 'dot', speed: 120, size: 9, life: 0.6, gravity: 0 });
    K.fx.text(K.clamp(b.x, 80, G.FW - 80), G.top + 20, 'Bye!', { size: 30, color: '#ffd1dc', stroke: 'rgba(60,10,30,.5)', rise: 40 });
    loseHeart();
  }

  // ---------- the big good-deed picture ----------
  function nextShow() {
    show = showQ.shift() || null;
    if (show) { show.t = 0; show.big = false; K.sfx.play('cardFlip'); }
  }
  function showMax() { return Math.min(G.FW * 0.66, (G.FH - G.top) * 0.44, 340); }
  function showGeom(sh) {
    var S = showMax(), cx = G.FW / 2, cy = G.top + (G.FH - G.top) * 0.4, t = sh.t;
    if (t < 0.4) { var k = K.ease.outBack(t / 0.4); return { x: K.lerp(sh.x0, cx, k), y: K.lerp(sh.y0, cy, k), s: K.lerp(sh.s0, S, k), a: 1, cap: 0 }; }
    if (t < HOLD_END) return { x: cx, y: cy + Math.sin(t * 3) * 4, s: S * (1 + Math.sin(t * 5) * 0.012), a: 1, cap: Math.min(1, (t - 0.4) / 0.25), S: S };
    var tgt = chipPos(sh.g), u = K.ease.inQuad(Math.min(1, (t - HOLD_END) / FLY));
    return { x: K.lerp(cx, tgt.x, u), y: K.lerp(cy, tgt.y, u), s: K.lerp(S, 30 / G.s, u), a: 1 - u * 0.3, cap: Math.max(0, 1 - u * 4) };
  }
  function updateShow(dt) {
    show.t += dt;
    if (!show.big && show.t >= 0.4) {
      show.big = true;
      var gm = showGeom(show);
      K.fx.burst(gm.x, gm.y, { n: 22, colors: ['#ffd36b', '#fff3c4', '#ff8fab', '#7ae7ff'], shape: 'star', speed: 420, size: 16, life: 1, gravity: 300 });
      K.sfx.play('sparkle');
      say(D.list[show.d].caption);
      try { window.KahfBridge && window.KahfBridge.item && window.KahfBridge.item('good-deed-' + D.list[show.d].id); } catch (e) {}
    }
    if (show.t >= HOLD_END + FLY) {
      if (show.g) { show.g.shown = Math.min(show.g.n, show.g.shown + 1); goalHud(); show.g.el.classList.remove('bump'); void show.g.el.offsetWidth; show.g.el.classList.add('bump'); }
      var p = chipPos(show.g);
      K.fx.burst(p.x, p.y, { n: 10, color: '#ffd36b', shape: 'star', speed: 200, size: 12, life: 0.6, gravity: 200 });
      K.sfx.play('cardIn');
      nextShow();
    }
  }

  // ---------- level end ----------
  function clearLevel() {
    state = 'clear';
    var stars = heartsLost === 0 ? 3 : heartsLost <= (def.hearts > 3 ? 2 : 1) ? 2 : 1;
    if (time > par && stars > 1) stars--;
    lastStars = stars;
    progress.finish(level, stars);
    K.bridge.complete();
    // every balloon left on screen joins the celebration
    var left = balloons.filter(function (b) { return !b.popped && !b.fade; });
    left.sort(function (a, b) { return a.y - b.y; });
    var i = 0;
    left.forEach(function (b) { if (b.kind === 'storm') b.fade = 1; else if (b.y < G.FH + 20) { b.chainT = 0.2 + i * 0.09; b.quiet = i++; } });
    var my = run;
    setTimeout(function () { if (my === run) { K.sfx.play('win'); praise(); } }, 350);
    for (var f = 0; f < 6; f++) setTimeout(function () {
      if (my !== run) return;
      K.fx.burst(K.rand(G.FW * 0.15, G.FW * 0.85), K.rand(G.top + 40, G.FH * 0.55), { n: 22, colors: A.CONFETTI, speed: 460, size: 15, life: 1.3, shape: 'shard', gravity: 420 });
    }, 300 + f * 170);
    var last = level === COUNT, endOfWorld = level % PER === 0;
    setTimeout(function () {
      if (my !== run) return;
      var buttons = [];
      if (!last) buttons.push({ label: endOfWorld ? 'Next World' : 'Next Level', icon: 'next', primary: true, onClick: function () { startLevel(level + 1); } });
      buttons.push({ label: last ? 'Play Again' : 'Replay', icon: 'restart', row: true, primary: last, onClick: function () { startLevel(last ? 1 : level); } });
      buttons.push({ label: 'Levels', icon: 'levels', row: true, onClick: openLevels });
      K.ui.sheet({
        title: last ? 'You did it!' : endOfWorld ? A.WORLDS[world].name + ' done!' : 'Well done!',
        text: last ? 'Every balloon popped. MashaAllah!' : def.name,
        stars: stars, buttons: buttons });
    }, 1700);
  }
  function fail() {
    state = 'fail'; combo = 0;
    K.sfx.play('lose'); K.buzz(40);
    var my = run;
    setTimeout(function () {
      if (my !== run) return;
      K.ui.sheet({ title: 'Out of hearts', text: "Let's try again!", buttons: [
        { label: 'Try Again', icon: 'restart', primary: true, onClick: function () { startLevel(level); } },
        { label: 'Levels', icon: 'levels', onClick: openLevels }] });
    }, 900);
  }
  function pause() {
    state = 'paused';
    K.ui.sheet({ title: 'Paused', text: A.WORLDS[world].name + ' · Level ' + level, buttons: [
      { label: 'Resume', icon: 'play', primary: true, onClick: resume },
      { label: 'Restart', icon: 'restart', row: true, onClick: function () { startLevel(level); } },
      { label: 'Levels', icon: 'levels', row: true, onClick: openLevels },
      { label: K.sfx.muted ? 'Sound: Off' : 'Sound: On', icon: K.sfx.muted ? 'soundOff' : 'sound', onClick: function () { K.sfx.toggle(); pause(); } }] });
  }
  function resume() { state = 'play'; }
  function openLevels() {
    var was = state; state = 'paused';
    K.ui.levelSelect({
      title: 'Balloon Pop',
      worlds: A.WORLDS.map(function (w, i) { return { name: w.name, color: w.color, from: i * PER + 1, to: i * PER + PER }; }),
      progress: progress, current: level,
      onPick: function (n) { startLevel(n); },
      onClose: function () { if (was === 'paused' && hearts > 0 && !goalsDone()) state = 'play'; else startLevel(was === 'clear' ? progress.current() : level); }
    });
  }

  // ---------- simulation ----------
  function step(dt) {
    if (!def) return; // the first level starts once fonts are ready
    clock += dt;
    K.fx.update(dt);
    stepAmbient(dt);
    if (bannerT > 0) bannerT -= dt;
    parX += (parT - parX) * Math.min(1, dt * 1.5);
    for (var r = rings.length - 1; r >= 0; r--) { rings[r].t += dt; if (rings[r].t > 0.35) rings.splice(r, 1); }
    if (state === 'paused') return;
    ambT -= dt;
    if (ambT <= 0) { ambT = K.rand(5, 10); if (state === 'play') K.sfx.play(world === 0 ? 'bird' : world === 1 ? (Math.random() < 0.5 ? 'gull' : 'wave') : 'cricket'); }
    var want = show && show.t < HOLD_END ? 0.3 : 1;
    ts += (want - ts) * Math.min(1, dt * 6);
    var gdt = dt * ts;
    if (state === 'play') {
      time += dt;
      spawnT -= gdt;
      if (spawnT <= 0) spawnT = spawn() ? def.every / G.wf * K.rand(0.8, 1.2) : 0.3;
    }
    for (var i = balloons.length - 1; i >= 0; i--) {
      var b = balloons[i];
      if (b.chainT > 0 && !b.popped) { b.chainT -= dt; if (b.chainT <= 0) popBalloon(b, b.quiet != null ? { quiet: true, step: b.quiet } : {}); }
      if (b.popped) { b.pop += dt; if (b.pop >= 0.075) { burst(b); balloons.splice(i, 1); } continue; }
      if (b.fade) { b.fade -= dt * 2; b.y -= 40 * dt; if (b.fade <= 0) balloons.splice(i, 1); continue; }
      b.t += gdt;
      var ph = b.t * b.freq + b.ph;
      b.y -= b.vy * gdt;
      b.x = b.x0 + Math.sin(ph) * b.amp;
      b.vx = Math.cos(ph) * b.amp * b.freq;
      var lean = K.clamp(b.vx * 0.004, -0.2, 0.2), ky = b.y + (BH * 0.5 + KNOT) * b.z;
      b.cardX = b.x - Math.sin(lean) * BH * 0.5 * b.z - b.vx * 0.3 * b.z; b.cardY = ky + (STRING + CARD * 0.5) * b.z;
      if (b.kind === 'storm' && !stormHint && state === 'play' && b.y < G.FH * 0.75 && !store.get('stormHint', false)) {
        store.set('stormHint', true);
        stormHint = K.ui.hint('Leave the grey clouds!', hint ? hintY() + 64 : hintY(), false);
        var hh = stormHint; setTimeout(function () { hh.hide(); }, 4500);
      }
      var gone = b.kind === 'deed' ? b.cardY + CARD * b.z : b.y + (BH * 0.5 + KNOT + STRING) * b.z;
      if (gone < -20) { balloons.splice(i, 1); if (state === 'play') escaped(b); }
    }
    if (show) updateShow(dt);
    if (state === 'play' && goalsDone() && !show && !showQ.length) clearLevel();
  }

  // ---------- ambient life ----------
  function makeAmbient() {
    ambient = [];
    var n = world === 2 ? 46 : 12;
    for (var i = 0; i < n; i++) ambient.push({ x: Math.random(), y: Math.random(), ph: Math.random() * 6.28, v: 0.5 + Math.random() * 0.8, s: 0.7 + Math.random() * 0.6, k: i });
  }
  function stepAmbient(dt) {
    ambient.forEach(function (a) {
      a.ph += dt;
      if (world === 0) { a.x += dt * 0.025 * a.v * (a.k % 2 ? 1 : -1); a.y += Math.sin(a.ph * 1.3) * dt * 0.02; }
      else if (world === 1) { a.x += dt * 0.02 * a.v; }
      else if (a.k < 8) { a.y -= dt * 0.012 * a.v; a.x += Math.sin(a.ph * 0.6) * dt * 0.004; if (a.y < -0.05) { a.y = 1.05; a.x = Math.random(); } }
      if (a.x > 1.1) a.x = -0.1; if (a.x < -0.1) a.x = 1.1;
    });
  }
  function drawAmbient(layer) {
    var W = G.w, H = G.h, s = Math.max(0.8, G.s);
    ambient.forEach(function (a, i) {
      var x = a.x * W, y;
      if (world === 0) {
        if (layer === 'sky' && i < 4) { y = (0.08 + 0.1 * i) * H; var cl = cloudSprite(i); ctx.globalAlpha = 0.85; ctx.drawImage(cl, ((a.x + clock * 0.004 * a.v) % 1.3 - 0.15) * W, y, 220 * s * 0.8, 100 * s * 0.8); ctx.globalAlpha = 1; }
        if (layer === 'front' && i >= 4 && i < 9) { // butterflies
          y = (0.55 + 0.3 * a.y) * H; var flap = Math.abs(Math.sin(a.ph * 11)), col = ['#ffb347', '#ff7eb9', '#7ad3ff', '#ffe066', '#c3a6ff'][i % 5];
          ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(Math.sin(a.ph) * 0.3);
          ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(-5 * flap, -3, 6 * flap + 1, 8, -0.4, 0, 6.283); ctx.fill();
          ctx.beginPath(); ctx.ellipse(5 * flap, -3, 6 * flap + 1, 8, 0.4, 0, 6.283); ctx.fill();
          ctx.fillStyle = '#3a2a2a'; ctx.fillRect(-1, -7, 2, 12); ctx.restore();
        }
      } else if (world === 1) {
        if (layer === 'sky' && i < 3) { y = (0.06 + 0.11 * i) * H; ctx.globalAlpha = 0.9; ctx.drawImage(cloudSprite(i + 4), ((a.x + clock * 0.004 * a.v) % 1.3 - 0.15) * W, y, 220 * s * 0.75, 100 * s * 0.75); ctx.globalAlpha = 1; }
        if (layer === 'mid' && i >= 3 && i < 7) { // gulls
          y = (0.12 + 0.25 * a.y) * H; var fl = Math.sin(a.ph * 7) * 5;
          ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2.4 * s; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x - 12 * s, y - fl * s); ctx.quadraticCurveTo(x - 6 * s, y - 6 * s, x, y); ctx.quadraticCurveTo(x + 6 * s, y - 6 * s, x + 12 * s, y - fl * s); ctx.stroke();
        }
        if (layer === 'mid' && i >= 7 && bg && bg.sea) { // sparkles on the sea
          var sy = (bg.sea[0] + (bg.sea[1] - bg.sea[0]) * a.y) / G.dpr, tw = Math.max(0, Math.sin(a.ph * 2.2 + i));
          ctx.globalAlpha = tw; ctx.fillStyle = '#ffffff'; var r2 = 4 * s * tw;
          ctx.beginPath(); ctx.moveTo(x, sy - r2); ctx.lineTo(x + r2 * 0.25, sy); ctx.lineTo(x, sy + r2); ctx.lineTo(x - r2 * 0.25, sy); ctx.fill();
          ctx.beginPath(); ctx.moveTo(x - r2, sy); ctx.lineTo(x, sy - r2 * 0.25); ctx.lineTo(x + r2, sy); ctx.lineTo(x, sy + r2 * 0.25); ctx.fill();
          ctx.globalAlpha = 1;
        }
      } else {
        if (layer === 'sky' && i >= 20) { // twinkling stars
          y = a.y * H * 0.55; ctx.globalAlpha = 0.3 + 0.7 * Math.max(0, Math.sin(a.ph * 1.7 + i)); ctx.fillStyle = '#fff8e0';
          var r3 = 1.6 * s; ctx.beginPath(); ctx.moveTo(x, y - r3 * 2); ctx.lineTo(x + r3 * 0.5, y); ctx.lineTo(x, y + r3 * 2); ctx.lineTo(x - r3 * 0.5, y); ctx.fill();
          ctx.beginPath(); ctx.moveTo(x - r3 * 2, y); ctx.lineTo(x, y - r3 * 0.5); ctx.lineTo(x + r3 * 2, y); ctx.lineTo(x, y + r3 * 0.5); ctx.fill(); ctx.globalAlpha = 1;
        }
        if (layer === 'mid' && i < 8) { // sky lanterns rising far away
          y = a.y * H * 0.75; ctx.globalAlpha = 0.85;
          A.lantern(ctx, x, y, 10 * s * a.s, ['#ffb347', '#ffd166', '#ff8a5c'][i % 3], a.ph * 3); ctx.globalAlpha = 1;
        }
        if (layer === 'front' && i >= 8 && i < 20) { // fireflies
          y = (0.72 + 0.22 * ((a.y + Math.sin(a.ph * 0.7) * 0.05) % 1)) * H; var gx = x + Math.sin(a.ph * 0.9 + i) * 20 * s;
          var al = 0.4 + 0.6 * Math.max(0, Math.sin(a.ph * 2 + i)), gr = ctx.createRadialGradient(gx, y, 0, gx, y, 9 * s);
          gr.addColorStop(0, 'rgba(255,240,150,' + al + ')'); gr.addColorStop(1, 'rgba(255,240,150,0)');
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(gx, y, 9 * s, 0, 6.283); ctx.fill();
        }
      }
    });
  }
  function cloudSprite(i) {
    if (!clouds) clouds = [];
    if (!clouds[i]) clouds[i] = A.softCloud(Math.max(0.8, G.s) * 0.8 * G.dpr, 900 + i * 13);
    return clouds[i];
  }

  // ---------- drawing ----------
  function ensureArt() { if (!bg || bgWorld !== world) { bg = A.paintWorld(world, G.w, G.h, G.dpr, G.s); bgWorld = world; spr = {}; } }
  function sprite(b) {
    var night = A.WORLDS[world].night, key = b.kind === 'storm' ? 'storm' : b.kind + '|' + (b.kind === 'b' ? b.c : 0);
    if (!spr[key]) spr[key] = b.kind === 'storm' ? A.storm(G.s * G.dpr, night) : A.balloon(b.c, b.kind, G.s * G.dpr, night);
    return spr[key];
  }
  function drawBalloon(b) {
    var z = b.z, sp = sprite(b), br = Math.sin(clock * 2.6 + b.ph) * 0.022, sx = 1 + br, sy = 1 - br * 0.8;
    if (b.popped) { var k = Math.min(1, b.pop / 0.075); sx = 1 + 0.2 * k; sy = 1 - 0.17 * k; }
    var lean = K.clamp(b.vx * 0.004, -0.2, 0.2);
    if (b.kind === 'storm' && !b.popped) { var wb = Math.sin(clock * 5 + b.ph) * 0.04; sx = 1 + wb; sy = 1 - wb; lean = Math.sin(clock * 2.3 + b.ph) * 0.05; }
    ctx.globalAlpha = b.fade ? Math.max(0, b.fade) : 1;
    if (b.kind !== 'storm' && !b.popped) {
      var kx = b.x - Math.sin(lean) * (BH * 0.5 + KNOT) * z, ky = b.y + Math.cos(lean) * (BH * 0.5 + KNOT) * z;
      var ex = b.kind === 'deed' ? b.cardX : kx - b.vx * 0.3 * z, ey = ky + STRING * z;
      ctx.strokeStyle = A.WORLDS[world].string; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(kx, ky);
      ctx.bezierCurveTo(kx + Math.sin(clock * 3 + b.ph) * 7 * z, ky + STRING * z * 0.35, ex - Math.sin(clock * 3 + b.ph + 1) * 7 * z, ky + STRING * z * 0.7, ex, ey);
      ctx.stroke();
      if (b.kind === 'deed') {
        var cs = CARD * z, sw = K.clamp(-b.vx * 0.006, -0.25, 0.25) + Math.sin(clock * 2.2 + b.ph) * 0.06;
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(sw);
        var gl = ctx.createRadialGradient(0, cs * 0.5, cs * 0.2, 0, cs * 0.5, cs * 0.95);
        gl.addColorStop(0, 'rgba(255,220,120,' + (0.45 + 0.2 * Math.sin(clock * 4)) + ')'); gl.addColorStop(1, 'rgba(255,220,120,0)');
        ctx.fillStyle = gl; ctx.fillRect(-cs, -cs * 0.45, cs * 2, cs * 1.9);
        ctx.drawImage(D.card(b.deed, cs * G.s * G.dpr), -cs / 2, 0, cs, cs);
        ctx.restore();
      }
    }
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(lean); ctx.scale(z * sx, z * sy);
    ctx.drawImage(sp.c, -sp.ox, -sp.oy, sp.w, sp.h);
    ctx.restore();
    if (b.kind === 'storm' && !b.popped) { // slanted rain streaks and a brighter flash now and then
      ctx.strokeStyle = '#9ad6ff'; ctx.lineWidth = 2.6 * z; ctx.lineCap = 'round';
      for (var i = 0; i < 6; i++) {
        var p = (clock * 1.6 + i / 6 + b.ph) % 1, dx = (i - 2.5) * 18 * z - p * 8 * z, dy = (40 + p * 50) * z;
        ctx.globalAlpha = (1 - p) * 0.8 * (b.fade ? Math.max(0, b.fade) : 1);
        ctx.beginPath(); ctx.moveTo(b.x + dx, b.y + dy); ctx.lineTo(b.x + dx - 4 * z, b.y + dy + 12 * z); ctx.stroke();
      }
      var fl = Math.sin(clock * 1.7 + b.ph * 3);
      if (fl > 0.96) { ctx.globalAlpha = (fl - 0.96) * 20; var gl = ctx.createRadialGradient(b.x, b.y + 50 * z, 0, b.x, b.y + 50 * z, 60 * z);
        gl.addColorStop(0, 'rgba(255,240,160,.7)'); gl.addColorStop(1, 'rgba(255,240,160,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(b.x, b.y + 50 * z, 60 * z, 0, 6.283); ctx.fill(); }
    }
    if (b.kind === 'rainbow' && !b.popped) {
      for (var j = 0; j < 3; j++) {
        var a = clock * 1.8 + j * 2.09, rx = b.x + Math.cos(a) * 54 * z, ry = b.y + Math.sin(a) * 60 * z, rs = (5 + 3 * Math.sin(clock * 6 + j)) * z;
        ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.moveTo(rx, ry - rs * 2); ctx.quadraticCurveTo(rx, ry, rx + rs * 2, ry); ctx.quadraticCurveTo(rx, ry, rx, ry + rs * 2);
        ctx.quadraticCurveTo(rx, ry, rx - rs * 2, ry); ctx.quadraticCurveTo(rx, ry, rx, ry - rs * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  function drawShow() {
    if (!show) return;
    var gm = showGeom(show), s = gm.s;
    if (gm.cap > 0 || show.t < HOLD_END) { // soft light rays behind the card
      var big = gm.S || s, k = show.t < 0.4 ? show.t / 0.4 : show.t < HOLD_END ? 1 : gm.cap;
      ctx.save(); ctx.translate(gm.x, gm.y); ctx.rotate(clock * 0.3); ctx.globalAlpha = 0.35 * k;
      ctx.fillStyle = '#fff3c4';
      for (var i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(-big * 0.08, 0); ctx.lineTo(big * 0.08, 0); ctx.lineTo(0, -big * 0.95); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      var hl = ctx.createRadialGradient(gm.x, gm.y, s * 0.3, gm.x, gm.y, s * 0.9); hl.addColorStop(0, 'rgba(255,240,190,' + 0.5 * k + ')'); hl.addColorStop(1, 'rgba(255,240,190,0)');
      ctx.fillStyle = hl; ctx.beginPath(); ctx.arc(gm.x, gm.y, s * 0.9, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = gm.a;
    ctx.fillStyle = 'rgba(20,10,40,.28)'; A.rr(ctx, gm.x - s / 2 + 4, gm.y - s / 2 + 10, s, s, s * 0.15); ctx.fill();
    ctx.drawImage(D.card(show.d, showMax() * G.s * G.dpr), gm.x - s / 2, gm.y - s / 2, s, s); // one sprite, scaled
    if (gm.cap > 0) {
      var cap = D.list[show.d].caption, fs = Math.min(46, G.FW * 0.085);
      ctx.font = '900 ' + Math.round(fs) + 'px Nunito, system-ui, sans-serif';
      var tw = ctx.measureText(cap).width; if (tw > G.FW - 28) fs *= (G.FW - 28) / tw; // long captions shrink to fit
      var cy = gm.y + s / 2 + fs * 0.95;
      ctx.globalAlpha = gm.cap; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.font = '900 ' + Math.round(fs * (0.8 + 0.2 * K.ease.outBack(Math.min(1, gm.cap)))) + 'px Nunito, system-ui, sans-serif';
      ctx.lineWidth = fs * 0.24; ctx.strokeStyle = 'rgba(60,25,90,.7)'; ctx.strokeText(cap, gm.x, cy);
      ctx.fillStyle = '#fffaf0'; ctx.fillText(cap, gm.x, cy);
    }
    ctx.globalAlpha = 1;
  }
  function drawBanner() {
    if (bannerT <= 0 || !def) return;
    var k = Math.max(0, Math.min(1, bannerT / 0.4, (BANNER - bannerT) / 0.3)), cx = G.FW / 2, room = G.FH - G.top;
    var W = A.WORLDS[world], fsz = Math.min(76, G.FW * 0.15, room * 0.17), cy = G.top + fsz * 0.9 + room * 0.08;
    ctx.globalAlpha = k; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.font = '800 ' + Math.round(fsz * 0.38) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(20,10,50,.5)';
    ctx.strokeText(W.name.toUpperCase(), cx, cy - fsz * 0.85); ctx.fillStyle = W.color; ctx.fillText(W.name.toUpperCase(), cx, cy - fsz * 0.85);
    ctx.font = '900 ' + Math.round(fsz) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = 12;
    ctx.strokeText('Level ' + level, cx, cy); ctx.fillStyle = '#fffaf0'; ctx.fillText('Level ' + level, cx, cy);
    // the goals, as pictures: a tile per goal (icon then "x n"), plus a crossed-out storm cloud when clouds come
    var items = goals.slice(), iw = 128, ih = 84, gap = 14;
    if (def.storm) items.push({ t: 'storm' });
    var total = items.length * iw + (items.length - 1) * gap, sc = Math.min(1, (G.FW - 24) / total, fsz / 70);
    var x0 = cx - total * sc / 2 + iw * sc / 2, gy = cy + fsz * 0.62 + ih * sc * 0.5 + 8;
    items.forEach(function (g, i) {
      var x = x0 + i * (iw + gap) * sc, ix = g.n ? -26 : 0;
      ctx.save(); ctx.translate(x, gy); ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(15,8,40,.45)'; A.rr(ctx, -iw / 2, -ih / 2, iw, ih, 24); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.stroke();
      if (g.t === 'color' || g.t === 'any') {
        var cols = g.t === 'color' ? [g.c] : [4, 2, 0];
        cols.forEach(function (c, j) {
          var sp = spr['b|' + c] || (spr['b|' + c] = A.balloon(c, 'b', G.s * G.dpr, W.night));
          var multi = cols.length > 1, zz = multi ? (j === 2 ? 0.44 : 0.38) : 0.5, dx = multi ? (j === 2 ? 0 : (j - 0.5) * 26) : 0;
          ctx.save(); ctx.translate(ix + dx, -6 + (multi && j !== 2 ? -2 : 0)); ctx.scale(zz, zz); ctx.drawImage(sp.c, -sp.ox, -sp.oy, sp.w, sp.h); ctx.restore();
        });
      } else if (g.t === 'deed') {
        ctx.drawImage(D.card(2, 56 * G.s * G.dpr), ix - 28, -28, 56, 56);
      } else {
        var ss = sprite({ kind: 'storm' });
        ctx.save(); ctx.scale(0.42, 0.42); ctx.drawImage(ss.c, -ss.ox, -ss.oy, ss.w, ss.h); ctx.restore();
        ctx.strokeStyle = '#ff5d73'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 34, 0, 6.283); ctx.moveTo(-24, -24); ctx.lineTo(24, 24); ctx.stroke();
      }
      if (g.n) {
        ctx.font = '900 34px Nunito, system-ui, sans-serif'; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(20,10,50,.6)'; ctx.textAlign = 'left';
        ctx.strokeText('×' + g.n, 8, 2); ctx.fillStyle = '#fffaf0'; ctx.fillText('×' + g.n, 8, 2);
      }
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  function draw() {
    if (!def) return;
    ensureArt();
    var d = G.dpr, m = bg.margin, par = (parX - 0.5) * 2 + Math.sin(clock * 0.15) * 0.25;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg.sky, Math.round(-m - par * 5 * d), Math.round(0));
    ctx.setTransform(d, 0, 0, d, 0, 0); drawAmbient('sky');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bg.far, Math.round(-m - par * 11 * d), Math.round(0));
    ctx.setTransform(d, 0, 0, d, 0, 0); drawAmbient('mid');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bg.mid, Math.round(-m - par * 18 * d), Math.round(0));
    ctx.setTransform(d, 0, 0, d, 0, 0); drawAmbient('front');
    var sh = K.fx.offset(), s = G.s * d;
    ctx.setTransform(s, 0, 0, s, sh.x * s, sh.y * s);
    var order = balloons.slice().sort(function (a, b) { return a.z - b.z || a.id - b.id; });
    for (var i = 0; i < order.length; i++) drawBalloon(order[i]);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bg.near, Math.round(-m - par * 28 * d), Math.round(0));
    ctx.setTransform(s, 0, 0, s, sh.x * s, sh.y * s);
    rings.forEach(function (r) {
      var u = r.t / 0.35; ctx.globalAlpha = 1 - u; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5 * (1 - u) + 1;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r + u * 50, 0, 6.283); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    K.fx.draw(ctx);
    drawShow();
    drawBanner();
  }

  K.loop({ step: step, draw: draw, hz: 120, onHidden: function () { if (state === 'play' && !DEBUG) pause(); } });

  // Test hook (only with ?debug in the URL): step the game by hand and inspect it.
  if (DEBUG) window.BP = {
    run: function (sec) { for (var i = 0; i < Math.round(sec * 120); i++) step(1 / 120); draw(); },
    draw: draw, start: startLevel, tap: tap,
    showDeed: function (i) { showQ.push({ d: i, x0: G.FW / 2, y0: G.FH * 0.6, s0: CARD, t: 0, g: null }); if (!show) nextShow(); },
    get: function () { return { state: state, level: level, hearts: hearts, heartsLost: heartsLost, time: +time.toFixed(2), par: par, stars: lastStars,
      show: !!show, queued: showQ.length, combo: combo, FW: Math.round(G.FW), FH: Math.round(G.FH), top: Math.round(G.top), s: G.s,
      goals: goals.map(function (g) { return { t: g.t, c: g.c, n: g.n, got: g.got, shown: g.shown }; }) }; },
    balloons: function () { return balloons.filter(function (b) { return !b.popped && !b.fade; }).map(function (b) {
      return { id: b.id, kind: b.kind, c: b.c, x: Math.round(b.x), y: Math.round(b.y), z: b.z, cardX: Math.round(b.cardX), cardY: Math.round(b.cardY), needed: needed(b) }; }); },
    toScreen: function (x, y) { return { x: x * G.s, y: y * G.s }; },
    G: G
  };

  var fontsReady = document.fonts && document.fonts.load ? document.fonts.load('900 40px Nunito') : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 700); })]).catch(function () {}).then(function () {
    startLevel(progress.current());
  });
})();
