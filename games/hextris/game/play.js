/* Hextris (Kahf Kids edition): game/play.js, scene 'Play': the courtyard, the basin, the turning medallion and the tiles.
   Tiles drift in toward a turning medallion. Tap the left or right half of the screen (or use the arrow keys) to turn it,
   and stack three or more tiles of the same colour together to clear them. The rules are in rules.js (no Phaser).

   What the engine does (docs/phaser-standard.md section 1) and what stays game code:
   - Turning the medallion is a tween on a Container (the "wheel": its stacks, warning glows and the medallion), eased
     with Back.easeOut for the slight overshoot of a heavy wheel. Stacks are the wheel's children, so they turn with it.
   - Spawn gaps, the pauses between a drop's tiles, the fade-out and collapse of cleared tiles, the celebration sweep
     and every hold-then-do are Phaser timers (this.time.delayedCall). Landing squash, grow-in, the collapse after a clear,
     fades, flashes, the shake of the field and the floating words are tweens. The scenery is one still picture (the old
     game's sway of a few pixels over twenty seconds was dropped: three full-screen layers cost more than it showed).
   - Clearing bursts, landing dust, glitter and the drifting motes in the air are particle emitters.
   - The combo timer (a golden line round the limit that runs out) and the goal ring (a line that fills round the basin's
     rim) are two sets of six line images whose widths a tween (or the goal's value) sets: no Graphics is rebuilt.
   - The scene is paused (this.scene.pause) behind every screen the Hud pushes: timers and tweens stop with it.
   Game code, because the engine has no such feature: a tile falling straight down its lane at the level's speed (it
   lands on whatever the stack of the side now facing that lane is, which turning changes while it falls, so it cannot
   be one tween to a fixed place; Arcade bodies are boxes and would still need the lane-to-side rule), and the table of
   which cell touches which across a corner (rules.js). Settling after a collapse is a tween per tile; a group forms
   when the last tile of it has settled (rules.js group()).
   Tiles are pooled images (one sheet, one batch). Nothing is painted per frame; nothing runs per frame but the falling
   tiles' motion and the lane test. */
(function () {
  'use strict';
  var R = window.HexRules, A = window.HexArt, LV = window.HEX_LEVELS, G = R.GEO, SQ3 = R.SQ3, DEG = Math.PI / 180;
  var A0 = G.a0, BH = G.bh, ROWS = G.rows, SPAWN = G.spawn, RIM = G.rim, RINGS = A.RINGS;
  var COLLAPSE = 320, GROW = 450, FADE = 320, COMBO_MS = 3200, MU = 60;           // units/s of a collapse, ms of grow-in, of a fade, of a combo; spare scenery at each side
  var COS = [], SIN = [];
  for (var li = 0; li < 6; li++) { COS.push(Math.cos((-90 + li * 60) * DEG)); SIN.push(Math.sin((-90 + li * 60) * DEG)); }
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var store = Kit.store('kahf-hextris'), progress = Kit.progress(store, LV.list.length);   // saved: { best, stars: {level: n}, current }

  // shared by the scenes: the gap between things, and how much bigger the interface is on a tall screen (a phone upright
  // sees 1920 units across 375 css px, so buttons are made larger there: Kit.play.fit's view.u)
  window.HexUI = {
    GAP: 36, k: function (v) { return 48 * v.pt / 150; },   // Hextris' own interface size: a 150-unit button is 48 screen points on every screen store: store, progress: progress, COMBO_MS: COMBO_MS,
    open: false, device: 'keys',                                                 // a screen is open; the device last used ('touch' | 'keys')
    text: function (sc, s, x, y, size, weight, color, parent) {
      var t = sc.add.text(x, y, s, { fontFamily: 'system-ui, sans-serif', fontSize: size + 'px', fontStyle: String(weight), color: color || '#f2f7f6', align: 'center' }).setOrigin(0.5);
      if (parent) parent.add(t); return t;
    },
    // a round button: a dark plate (readable on any background) and its icon; it answers the touch at once
    button: function (sc, icon, fn, inert) {
      var c = sc.add.container(0, 0, [sc.add.image(0, 0, 'hx-ui', 'plate'), sc.add.image(0, 0, 'hx-ui', icon)]);
      if (inert) return c;                                                       // (the interface of play answers touches itself: ingame.js)
      c.setSize(150, 150).setInteractive();
      c.on('pointerdown', function () { Kit.snd.play('tap'); sc.tweens.add({ targets: c, scale: 0.9 * (c.base || 1), duration: 70, yoyo: true }); });
      c.on('pointerup', fn); return c;
    }
  };

  // six edge images that draw a hexagon's outline from a vertex round the shape, a fraction of it at a time
  function Edges(scene, parent, circumR, thick, tint) {
    this.im = []; this.R = circumR;
    for (var i = 0; i < 6; i++) {
      var a = (-120 + i * 60) * DEG, im = scene.add.image(Math.cos(a) * circumR, Math.sin(a) * circumR, 'hx-ui', 'line').setOrigin(0, 0.5).setRotation(i * 60 * DEG).setTint(tint).setVisible(false);
      im.setScale(circumR / 64, thick / 24); parent.add(im); this.im.push(im);
    }
  }
  Edges.prototype.set = function (f) {
    for (var i = 0; i < 6; i++) { var p = clamp(f * 6 - i, 0, 1), im = this.im[i]; im.setVisible(p > 0); if (p > 0) im.scaleX = p * this.R / 64; }
  };

  class Play extends Phaser.Scene {
    constructor() { super({ key: 'Play' }); }
    init(d) { this.startN = d && d.n; }

    create() {
      var self = this;
      this.S = A.S; this.u = 1 / this.S;
      A.ui(this); A.tiles(this);
      if (/[?&]bake\b/.test(location.search)) { for (var bw = 0; bw < 3; bw++) { A.plate(this, bw); A.medallion(this, bw); } A.lantern(this); }   // (tools/bake-art.js: paint every world's pictures to bake them)
      this.world = -1; this.stacks = [[], [], [], [], [], []]; this.falling = []; this.pool = []; this.pending = []; this.texts = []; this.lan = [];
      this.rot = 0; this.state = 'idle'; this.rush = false; this.fast = false; this.warn = [0, 0, 0, 0, 0, 0]; this.warnTw = [];
      this.tints = A.GLAZES.map(function (g) { var C = Phaser.Display.Color.HexStringToColor; return [C(g.c).color, C(A.shade(g.c, 0.4)).color, C(A.shade(g.c, -0.25)).color]; });

      // ---- the basin: plate, goal ring, combo line, the turning wheel, the falling tiles, the particles (list order = drawing order) ----
      this.field = this.add.container(0, 0).setDepth(10);
      this.plate = this.add.image(0, 0, 'hx-ui', 'px').setScale(this.u);   // (the world's basin is painted by setWorld)
      this.field.add(this.plate);
      this.ring = new Edges(this, this.field, A.ringR(G), 9, 0xffffff);
      this.comboLine = new Edges(this, this.field, A.limitR(G), 12, 0xffd36b);
      this.wheel = this.add.container(0, 0);
      this.field.add(this.wheel);
      for (var s = 0; s < 6; s++) {                                              // a warning glow at the end of each lane, turning with its stack
        var a = (-90 + s * 60) * DEG, r0 = G.limit - BH * 1.6;
        this.warnTw.push(null);
        this.wheel.add(this.add.image(Math.cos(a) * r0, Math.sin(a) * r0, 'hx-ui', 'warn').setOrigin(0.5, 1).setRotation(s * 60 * DEG).setAlpha(0).setVisible(false));
      }
      this.med = this.add.image(0, 0, 'hx-ui', 'px').setScale(this.u);
      this.wheel.add(this.med);
      this.fall = this.add.container(0, 0); this.field.add(this.fall);
      this.spare = this.add.container(0, 0).setVisible(false);                   // pooled tiles wait here
      var dot = function (o) { return Object.assign({ frame: 'dot', emitting: false }, o); };
      this.chips = this.add.particles(0, 0, 'hx-ui', dot({ speed: { min: 90, max: 270 }, angle: { min: 0, max: 360 }, lifespan: { min: 380, max: 720 }, scale: { start: 0.3, end: 0.05 }, alpha: { start: 1, end: 0 } }));
      this.sparks = this.add.particles(0, 0, 'hx-ui', { frame: 'spark', emitting: false, speed: { min: 40, max: 150 }, angle: { min: 0, max: 360 }, lifespan: { min: 600, max: 950 }, scale: { start: 0.5, end: 0 }, alpha: { start: 1, end: 0 }, gravityY: -45, rotate: { min: 0, max: 90 }, tint: 0xfff0b8 });
      this.dust = this.add.particles(0, 0, 'hx-ui', dot({ speed: { min: 30, max: 100 }, angle: { min: 0, max: 360 }, lifespan: { min: 260, max: 420 }, scale: { start: 0.16, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: 0xfff1c4 }));
      this.fxs = [this.chips, this.sparks, this.dust];
      this.fxs.forEach(function (e) { self.field.add(e); e.setActive(false).setVisible(false); });   // (asleep until a burst: an emitter with nothing alive still costs a little every frame)

      this.ig = new HexInGame(this);                                              // the interface while playing (ingame.js)
      Kit.play.fit(this, function (v) { self.layout(v); });
      if (window.HXT) window.HXT.play = this;
      var n = this.startN;
      if (n === 0) this.startEndless(); else this.startLevel(n || progress.current());
      if (Kit.load) Kit.load.done();                                             // the first view is ready: the page's loading picture leaves
    }

    // ---------- layout: the field fills what the screen leaves free; the scenery fills the whole visible area ----------
    layout(v) {
      this.v = v;
      var k = HexUI.k(v), gap = 40, portrait = v.w < v.h, wide = v.w / v.h >= 1.9, outR = RIM * 2 / SQ3;
      var top = v.st + gap, bot = v.sb - gap, left = v.sl + gap, right = v.sr - gap;
      if (!wide) top += 150 * k + HexUI.GAP;                                     // room for the pause button and the goal
      if (portrait) bot -= 260 * k + HexUI.GAP;                                  // and for the two turn hints below the field
      var fs = Math.min(2.8, (right - left) / (2 * outR + 8), (bot - top) / (2 * RIM + 8));
      var cx = (left + right) / 2, cy = (top + bot) / 2, half = RIM * fs;
      if (portrait) cy = clamp(v.t + v.h * 0.44, top + half, bot - half);
      this.fs = fs; this.cx = cx; this.cy = cy; this.ku = fs / 1.9;
      this.field.setPosition(cx, cy).setScale(fs);
      if (this.shakeT) { this.shakeT.stop(); this.shakeT = null; }
      this.paintBack();
      this.ig.layout(v);
    }

    // ---------- the scenery ----------
    paintBack() {
      if (this.backT) this.backT.remove(false);
      var self = this, v = this.v;
      var run = function () { self.backT = null; self.scenery(); };
      if (!this.bd) run(); else this.backT = this.time.delayedCall(200, run);    // (a window being dragged larger repaints once, at the end)
    }
    scenery() {
      var v = this.v, w = this.world; if (w < 0 || !v) return;
      var z = v.z, tp = Math.min(z * 0.75, Math.sqrt(1.0e6 / (v.w * v.h))), key = w + '|' + Math.round(v.w) + 'x' + Math.round(v.h);
      if (this.bdKey === key) return; this.bdKey = key;
      var self = this, old = this.bdOld || [], mu = MU;
      if (this.bd) this.bd.destroy();
      var ks = A.backdrop(this, w, v.w, v.h, tp, mu, old); this.bdOld = ks;
      this.bd = this.add.image(v.l - mu, v.t, ks[0]).setOrigin(0, 0).setScale(1 / tp).setDepth(0);
      this.lanterns(v, tp); this.motes(v);
    }
    // Lantern Court: four brass lanterns hang from the top, sway and flicker
    lanterns(v) {
      var self = this, W = A.WORLDS[this.world];
      this.lan.forEach(function (c) { self.tweens.killTweensOf(c); self.tweens.killTweensOf(c.glow); c.destroy(); }); this.lan = [];
      if (!W.lanterns) return;
      var su = Math.min(v.w, v.h) * 0.028, key = A.lantern(this), portrait = v.h > v.w;
      [[0.1, 0.32], [0.24, 0.18], [0.76, 0.2], [0.9, 0.3]].forEach(function (L, j) {
        var len = L[1] * v.h * (portrait ? 0.55 : 0.8), c = self.add.container(v.l + L[0] * v.w, v.t).setDepth(2);
        var str = self.add.image(0, 0, 'hx-ui', 'px').setOrigin(0.5, 0).setDisplaySize(3, len).setTint(0x1e140a).setAlpha(0.85);
        c.glow = self.add.image(0, len + su * 1.2, 'hx-ui', 'glow').setDisplaySize(su * 8, su * 8);
        var body = self.add.image(0, len, key).setOrigin(0.5, 0).setScale(su / 90);
        c.add([str, c.glow, body]); c.rotation = -0.06;
        self.tweens.add({ targets: c, rotation: 0.06, duration: 2850, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: j * 450 });
        self.tweens.add({ targets: c.glow, alpha: { from: 0.55, to: 1 }, duration: 260 + j * 70, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        self.lan.push(c);
      });
    }
    // drifting glaze dust in the air (an engine particle emitter: about 26 alive at once)
    motes(v) {
      if (this.moteE) this.moteE.destroy();
      var W = A.WORLDS[this.world];
      this.moteE = this.add.particles(0, 0, 'hx-ui', {
        frame: 'dot', emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(v.l, v.t, v.w, v.h) }, frequency: 1400, quantity: 1, advance: 9000,
        lifespan: { min: 6000, max: 12000 }, speedY: { min: -14, max: -5 }, speedX: { min: -4, max: 4 }, scale: { min: 0.1, max: 0.24 }, alpha: { start: 0.55, end: 0 },
        tint: Phaser.Display.Color.HexStringToColor(this.world === 2 ? '#fff6e0' : W.glow).color
      }).setDepth(3);
    }
    // the world changes: its basin, medallion, ring colour and scenery
    setWorld(w) {
      if (w === this.world) return;
      this.world = w; this.bdKey = '';
      if (w >= 0 && w < 3) Kit.snd.amb('amb-' + w, { fade: 2 });    // the place's own air, very low (fountain, crickets, birds)
      this.plate.setTexture(A.plate(this, w)); this.med.setTexture(A.medallion(this, w));
      var col = Phaser.Display.Color.HexStringToColor(A.WORLDS[w].color).color;
      this.ring.im.forEach(function (i) { i.setTint(col); });
      if (this.v) this.scenery();
    }

    // ---------- starting ----------
    startLevel(n) {
      this.endless = false; this.level = clamp(n, 1, LV.list.length); this.cfg = LV.list[this.level - 1];
      progress.setCurrent(this.level); this.begin(LV.worldOf(this.level));
    }
    startEndless() { this.endless = true; this.level = 0; this.cfg = LV.endless(0); this.begin(1); }
    begin(w) {
      this.cancel(); this.setWorld(w);
      this.rot = 0; this.ang = 0; this.angV = 0; this.wheel.rotation = 0;
      this.lives = 3; this.livesLost = 0; this.score = 0; this.groups = 0; this.combo = 0; this.comboOn = false; this.best = store.get('best', 0);
      this.state = 'play';
      this.ring.set(0); this.comboLine.set(0);
      this.startInfo = { level: this.level, endless: this.endless, world: w, name: this.endless ? 'Endless' : this.cfg.name, best: this.best };
      this.ig.levelStart(this.startInfo);
      this.emitHud();
      Kit.snd.play('page');
      this.scheduleSpawn(1100);
    }
    // forget everything in flight: timers, tweens, tiles
    cancel() {
      var self = this;
      this.pending.forEach(function (e) { e.remove(false); }); this.pending = []; this.warnCool = false;
      if (this.comboTw) { this.comboTw.stop(); this.comboTw = null; }
      this.falling.forEach(function (b) { self.free(b.spr, b); }); this.falling = [];
      this.stacks.forEach(function (st, s) { st.forEach(function (c) { if (c.spr) self.free(c.spr); }); self.stacks[s] = []; });
      for (var s = 0; s < 6; s++) this.setWarn(s, 0);
    }
    later(ms, fn) {
      var self = this, e = this.time.delayedCall(ms, function () { var i = self.pending.indexOf(e); if (i >= 0) self.pending.splice(i, 1); fn.call(self); });
      this.pending.push(e); return e;
    }

    // ---------- pooled tile images ----------
    tile(ci, k) {
      var im = this.pool.pop() || this.make.image({ key: 'hx-tiles', add: false });
      return im.setFrame('c' + ci + 'k' + k).setScale(this.u).setAlpha(1).setVisible(true).setTintMode(Phaser.TintModes.MULTIPLY).clearTint();
    }
    free(im, b) {
      this.tweens.killTweensOf(im); if (b) this.tweens.killTweensOf(b);
      im.setVisible(false); this.spare.add(im); this.pool.push(im);
    }

    // ---------- the turn ----------
    // The medallion turns on a damped spring toward rot x 60 degrees, as the old game's did (stiffness 260, a little under
    // critical damping: it overshoots slightly, like a heavy wheel). A tween cannot do this: a second tap must keep the
    // wheel's speed, and a restarted tween stops it dead for a frame. Steps every drawn frame, so it is smooth at 120 Hz.
    spin(dt) {
      var w = this.wheel; if (!w) return;
      var target = this.rot * Math.PI / 3, a = this.ang || 0, v = this.angV || 0;     // (its own angle: the engine wraps rotation to -pi..pi)
      if (Math.abs(target - a) < 1e-4 && Math.abs(v) < 1e-4) { if (a !== target) { this.ang = target; w.rotation = target; } return; }
      var k = 260, damp = 2 * Math.sqrt(k) * 0.72;
      v += ((target - a) * k - v * damp) * dt; this.angV = v; this.ang = a + v * dt; w.rotation = this.ang;
    }
    turn(dir) {
      if (this.state !== 'play') return false;
      this.rot += dir; this.angV = (this.angV || 0) + dir * 2.2;     // a kick: quick taps add up into one smooth turn (the old game's feel)
      Kit.snd.play('rotate', { pan: dir * 0.35 }); Kit.buzz(5);
      return true;
    }

    // ---------- drops ----------
    scheduleSpawn(ms) {
      this.later(ms, function () {
        if (this.state !== 'play') return;
        var sp = R.spawn(this.stacks, this.cfg, this.rot), gp = this.cfg.gap, f = this.goalFrac(), self = this;
        sp.items.forEach(function (it) { if (it.t <= 0) self.spawnTile(it); else self.later(it.t * 1000, function () { if (this.state === 'play') this.spawnTile(it); }); });
        this.scheduleSpawn((gp[0] + (gp[1] - gp[0]) * f) * sp.cost * 1000);
      });
    }
    spawnTile(it) {
      var im = this.tile(it.c, RINGS - 1).setRotation(it.lane * 60 * DEG);
      this.fall.add(im);
      var b = { lane: it.lane, c: it.c, d: SPAWN, g: 0.05, ready: false, spr: im, k: -1 };
      this.falling.push(b); this.place(b);
      this.tweens.add({ targets: b, g: 1, duration: GROW, ease: 'Back.easeOut', onComplete: function () { b.ready = true; } });
    }
    goalFrac() {
      if (this.endless) return Math.min(1, this.groups / 60);
      var g = this.cfg.goal; return Math.min(1, (g.type === 'groups' ? this.groups : this.score) / g.n);
    }
    // a falling tile drawn at its place in its lane: the ring picture nearest to its distance, stretched to fit
    place(b) {
      var r = b.d + BH / 2, kk = clamp(Math.round((b.d - A0) / BH), 0, RINGS - 1), sx = r / (A0 + kk * BH + BH / 2), g = Math.max(0.05, b.g), u = this.u;
      if (kk !== b.k) { b.k = kk; b.spr.setFrame('c' + b.c + 'k' + kk); }
      b.spr.setPosition(COS[b.lane] * r, SIN[b.lane] * r).setScale(u * sx * g, u * g).setAlpha(Math.min(1, g * 2));
    }
    update(time, delta) {
      this.spin(Math.min(delta, 50) / 1000);
      if (this.state !== 'play' || !this.falling.length) return;
      var dt = Math.min(delta, 50) / 1000, v = this.cfg.speed * (1 + 0.15 * this.goalFrac()) * (this.rush ? 2.5 : 1) * (this.fast ? 2.5 : 1);
      var arr = this.falling;
      for (var i = arr.length - 1; i >= 0; i--) {
        var b = arr[i];
        if (!b.ready) { this.place(b); continue; }
        b.d -= v * dt;
        var s = R.side(b.lane, this.rot), top = A0 + this.stacks[s].length * BH;
        if (b.d <= top) { arr.splice(i, 1); this.land(b, s); if (this.state !== 'play' || this.falling !== arr) return; }   // (a heart saved or a level won empties the lane)
        else this.place(b);
      }
    }

    // ---------- landing, settling, matching ----------
    // the picture of a cell in its slot (j = how many tiles are below it), in the wheel's own turning frame
    slot(im, c, s, j) {
      var a = (-90 + s * 60) * DEG, r = A0 + j * BH + BH / 2, kk = Math.min(j, RINGS - 1);
      im.setFrame('c' + c + 'k' + kk).setPosition(Math.cos(a) * r, Math.sin(a) * r).setRotation(s * 60 * DEG).setScale(this.u * r / (A0 + kk * BH + BH / 2), this.u);
    }
    land(b, s) {
      var st = this.stacks[s], j = st.length, im = b.spr, u = this.u, self = this;
      this.tweens.killTweensOf(b);
      var cell = { c: b.c, s: s, j: j, del: false, settled: true, spr: im };
      st.push(cell);
      this.wheel.addAt(im, this.wheel.length - 1);                               // under the medallion
      this.slot(im, b.c, s, j);
      this.tweens.add({ targets: im, scaleX: { from: u * 1.08, to: u }, scaleY: { from: u * 0.82, to: u }, duration: 220, ease: 'Sine.easeOut' });
      this.flash(im, 0x6a6a6a, 300);
      Kit.snd.play('land', { pan: COS[b.lane] * 0.5 });
      this.pulse();
      var p = this.cellPos(im, 0.45 * BH, s); this.burst(this.dust, 5, p.x, p.y);
      this.settle(cell); this.watch();
    }
    // a bright flash that fades: the engine's ADD tint mode, stepped by a counter tween
    flash(im, tint, ms) {
      var g = tint & 255;
      im.setTintMode(Phaser.TintModes.ADD).setTint(tint);
      this.tweens.addCounter({ from: g, to: 0, duration: ms, onUpdate: function (tw) { var v = Math.round(tw.getValue()); im.setTint((v << 16) | (v << 8) | v); }, onComplete: function () { im.setTintMode(Phaser.TintModes.MULTIPLY).clearTint(); } });
    }
    pulse() { this.tweens.killTweensOf(this.med); this.med.setScale(this.u * 1.05); this.tweens.add({ targets: this.med, scale: this.u, duration: 250, ease: 'Sine.easeOut' }); }
    // a tile's place in the field's frame (the wheel turns, the field does not), nudged out toward the lane by `out` units
    cellPos(im, out, s) {
      var a = this.wheel.rotation, c = Math.cos(a), sn = Math.sin(a), x = im.x, y = im.y;
      if (out) { var q = Math.hypot(x, y), f = (q - out) / q; x *= f; y *= f; }
      return { x: x * c - y * sn, y: x * sn + y * c };
    }
    settle(cell) {
      cell.settled = true;
      var st = this.stacks[cell.s], j = st.indexOf(cell); if (j < 0 || cell.del) return;
      var g = R.group(this.stacks, cell.s, j);
      if (g.length) this.clear(g);
    }
    clear(g) {
      var self = this, first = this.stacks[g[0][0]][g[0][1]], ci = first.c, n = g.length, tn = this.tints[ci], cx = 0, cy = 0;
      this.combo = this.comboOn ? this.combo + 1 : 1; this.comboOn = true;
      if (this.comboTw) this.comboTw.stop();
      this.comboTw = this.tweens.addCounter({ from: 1, to: 0, duration: COMBO_MS, onUpdate: function (tw) { self.comboLine.set(tw.getValue()); },
        onComplete: function () { self.combo = 0; self.comboOn = false; self.comboLine.set(0); self.comboTw = null; } });
      this.groups++;
      var pts = 10 * n * this.combo; this.score += pts;
      if (this.endless) { this.cfg = LV.endless(this.groups); if (this.score > this.best) { this.best = this.score; store.set('best', this.best); } }
      Kit.snd.play('clear', { vol: Math.min(1, 0.7 + 0.08 * (n - 3) + 0.08 * (this.combo - 1)) });
      if (n >= 5 || this.combo >= 2) Kit.snd.play('glaze', { delay: 0.05 });
      Kit.buzz(12);
      g.forEach(function (p) {
        var cell = self.stacks[p[0]][p[1]], q = self.cellPos(cell.spr, 0); cx += q.x; cy += q.y;
        cell.del = true; self.vanish(cell, q, tn);
      });
      cx /= n; cy /= n;
      this.floater(cx, cy, '+' + pts, 30, '#ffffff', 60);
      var cheer = this.combo >= 4 ? 'Amazing!' : this.combo === 3 ? 'Super!' : this.combo === 2 ? 'Great!' : n >= 5 ? 'Wow!' : null;
      if (cheer) { this.floater(0, -A0 - 20, cheer, 46, '#fff3c2', 70); this.shake(2.5); }
      this.later(FADE, this.collapse);
      this.emitHud();
      if (!this.endless && this.goalFrac() >= 1) this.win();
    }
    // a cleared tile: a flash, a fade and shrink, a burst of its own colours
    vanish(cell, q, tn) {
      var im = cell.spr, u = this.u, self = this;
      this.tweens.killTweensOf(im);
      im.setTintMode(Phaser.TintModes.ADD).setTint(0x909090);
      this.tweens.add({ targets: im, alpha: 0, scaleX: u * 0.55, scaleY: u * 0.55, duration: FADE, ease: 'Quad.easeIn', onComplete: function () { cell.spr = null; self.free(im); } });
      if (tn) {
        this.burst(this.chips, 3, q.x, q.y, tn[0]); this.burst(this.chips, 2, q.x, q.y, tn[1]); this.burst(this.chips, 2, q.x, q.y, tn[2]);
        this.burst(this.sparks, 1, q.x, q.y);
      }
    }
    // a burst: wake the emitter, explode, and put the three emitters back to sleep a moment after the last one
    burst(e, n, x, y, tint) {
      var self = this;
      if (!e.active) e.setActive(true).setVisible(true);
      if (tint != null && e.setParticleTint) e.setParticleTint(tint);
      e.explode(n, x, y);
      if (this.fxT) this.fxT.remove(false);
      this.fxT = this.time.delayedCall(1100, function () { self.fxT = null; self.fxs.forEach(function (o) { o.setActive(false).setVisible(false); }); });
    }
    // after the cleared tiles are gone, the tiles above drop into their places
    collapse() {
      if (this.state !== 'play') return;
      for (var s = 0; s < 6; s++) {
        var st = this.stacks[s], keep = st.filter(function (c) { return !c.del; });
        if (keep.length === st.length) continue;
        this.stacks[s] = keep;
        for (var j = 0; j < keep.length; j++) if (keep[j].j !== j) { keep[j].j = j; this.slideTo(keep[j], s, j); }
      }
      this.watch();
    }
    slideTo(cell, s, j) {
      var im = cell.spr, self = this, u = this.u, a = (-90 + s * 60) * DEG, r1 = A0 + j * BH + BH / 2, cur = Math.hypot(im.x, im.y), kk = Math.min(j, RINGS - 1), rf = A0 + kk * BH + BH / 2;
      cell.settled = false; this.tweens.killTweensOf(im);
      im.setFrame('c' + cell.c + 'k' + kk).setScale(u * cur / rf, u);
      this.tweens.add({ targets: im, x: Math.cos(a) * r1, y: Math.sin(a) * r1, scaleX: u * r1 / rf, duration: Math.max(30, (cur - r1) / COLLAPSE * 1000), ease: 'Linear',
        onComplete: function () {
          self.tweens.add({ targets: im, scaleX: { from: u * r1 / rf * 1.08, to: u * r1 / rf }, scaleY: { from: u * 0.88, to: u }, duration: 180, ease: 'Sine.easeOut' });
          self.settle(cell); self.watch();
        } });
    }

    // ---------- nearly full and overflowing ----------
    setWarn(s, on) {
      if (this.warn[s] === on) return; this.warn[s] = on;
      var im = this.wheel.list[s]; if (this.warnTw[s]) { this.warnTw[s].stop(); this.warnTw[s] = null; }
      if (on) { im.setVisible(true).setAlpha(0.5); this.warnTw[s] = this.tweens.add({ targets: im, alpha: 1, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
      else im.setVisible(false).setAlpha(0);
    }
    watch() {
      if (this.state !== 'play') return;
      var anyNew = false, over = false;
      for (var s = 0; s < 6; s++) {
        var n = R.liveCount(this.stacks[s]), w = n >= ROWS - 1 ? 1 : 0;
        if (w && !this.warn[s]) anyNew = true;
        this.setWarn(s, w);
        if (n > ROWS) over = true;
      }
      if (anyNew && !this.warnCool) { Kit.snd.play('warn'); this.warnCool = true; this.later(1400, function () { this.warnCool = false; }); }
      if (over) this.overflow();
    }
    overflow() {
      var self = this;
      this.lives--; this.livesLost++;
      this.shake(8); Kit.buzz(40);
      this.emitHud(true);
      if (this.lives <= 0) { this.lose(); return; }
      // the save: a breeze sweeps every tile beyond the second row away, and falling tiles blow off
      Kit.snd.play('save');
      this.stacks.forEach(function (st) { st.forEach(function (c, j) { if (j >= 2 && !c.del) { var q = self.cellPos(c.spr, 0); c.del = true; self.vanish(c, q, null); self.burst(self.chips, 2, q.x, q.y, 0xffffff); } }); });
      this.falling.forEach(function (b) { var q = { x: COS[b.lane] * (b.d + BH / 2), y: SIN[b.lane] * (b.d + BH / 2) }; self.burst(self.chips, 4, q.x, q.y, self.tints[b.c][0]); self.free(b.spr, b); });
      this.falling = [];
      this.pending.forEach(function (e) { e.remove(false); }); this.pending = []; this.warnCool = false;  // (the drops queued, and the collapse: asked again below)
      if (this.comboTw) { this.comboTw.stop(); this.comboTw = null; } this.combo = 0; this.comboOn = false; this.comboLine.set(0);
      this.later(FADE, this.collapse);
      this.scheduleSpawn(2400);
      this.floater(0, -A0 - 40, this.lives === 1 ? 'Last heart!' : 'Saved!', 40, '#ffe0e8', 90);
    }

    // ---------- the end of a level ----------
    win() {
      var self = this, stars = this.livesLost === 0 ? 3 : this.livesLost === 1 ? 2 : 1, last = this.level === LV.list.length, perWorld = LV.perWorld;
      this.state = 'clear';
      progress.finish(this.level, stars); Kit.bridge.complete();
      Kit.snd.play('win');
      this.falling.forEach(function (b) { self.burst(self.chips, 5, COS[b.lane] * (b.d + BH / 2), SIN[b.lane] * (b.d + BH / 2), self.tints[b.c][0]); self.free(b.spr, b); });
      this.falling = [];
      this.pending.forEach(function (e) { e.remove(false); }); this.pending = [];
      // the celebration: every remaining tile pops in a sweep from the centre outward
      this.stacks.forEach(function (st, s) { st.forEach(function (c, j) {
        if (c.del) return;
        self.later((j + s * 0.35) / 9 * 1000, function () {
          if (!c.spr) return; c.del = true; var q = this.cellPos(c.spr, 0), tn = this.tints[c.c];
          this.vanish(c, q, tn); this.burst(this.sparks, 1, q.x, q.y);
        });
      }); });
      this.later(1500, function () {
        this.game.events.emit('hx-won', { level: this.level, stars: stars, score: this.score, last: last, endOfWorld: this.level % perWorld === 0, world: this.world });
      });
    }
    lose() {
      var self = this;
      this.state = this.endless ? 'over' : 'fail';
      Kit.snd.play('lose');
      this.falling.forEach(function (b) { self.free(b.spr, b); }); this.falling = [];
      this.pending.forEach(function (e) { e.remove(false); }); this.pending = [];
      this.stacks.forEach(function (st) { st.forEach(function (c) { if (!c.del && c.spr) { c.del = true; self.vanish(c, null, null); } }); });
      this.later(900, function () {
        var isBest = this.endless && this.score > 0 && this.score >= this.best;
        if (this.endless && this.groups >= 5) Kit.bridge.complete();
        this.game.events.emit('hx-lost', { endless: this.endless, level: this.level, score: this.score, best: this.best, isBest: isBest });
      });
    }

    // ---------- feel ----------
    // a short shake of the field (not the scenery), mag in field units
    shake(mag) {
      if (this.shakeT) this.shakeT.stop();
      var f = this.field, cx = this.cx, cy = this.cy, self = this, m = mag * this.fs * 0.5;
      this.shakeT = this.tweens.add({ targets: f, x: cx + m, y: cy - m * 0.6, duration: 38, yoyo: true, repeat: 3, ease: 'Sine.easeInOut', onComplete: function () { f.setPosition(cx, cy); self.shakeT = null; } });
    }
    // words that rise and fade over the field (x, y in field units), pooled
    floater(x, y, str, size, color, rise) {
      var t = this.texts.find(function (o) { return !o.visible; }), ku = this.ku;
      if (!t) {
        t = this.add.text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontStyle: '900', color: '#fff', stroke: 'rgba(20,10,40,0.7)', strokeThickness: 8 }).setOrigin(0.5).setDepth(30);
        this.texts.push(t);
      }
      this.tweens.killTweensOf(t);
      var X = this.cx + x * this.fs, Y = this.cy + y * this.fs;
      t.setText(str).setFontSize(size * 1.6 * ku).setColor(color).setPosition(X, Y).setAlpha(1).setVisible(true).setScale(0.7);
      this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.easeOut' });
      this.tweens.add({ targets: t, y: Y - rise * 1.4 * ku, alpha: 0, duration: 900, delay: 150, ease: 'Sine.easeIn', onComplete: function () { t.setVisible(false); } });
    }

    // ---------- what the interface shows ----------
    emitHud(bump) {
      var g = this.cfg && this.cfg.goal, have = g ? (g.type === 'groups' ? this.groups : this.score) : this.score;
      this.ring.set(this.endless ? 0 : this.goalFrac());
      this.hudInfo = { endless: this.endless, lives: this.lives, bump: !!bump, score: this.score, groups: this.groups, have: have, need: g ? g.n : 0, type: g ? g.type : 'score', world: this.world };
      this.ig.hudSet(this.hudInfo);
    }
  }
  window.HexPlay = Play;
})();
