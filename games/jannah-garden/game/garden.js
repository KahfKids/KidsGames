/* Jannah Garden: garden.js, the garden itself (scene 'Garden'): the ground, the plants, planting, moving, the goals,
   saving. The interface (tray, goals, pause, menus) is hud.js, on top of this scene.

   A calm garden-building game. Pick a picture in the tray, then tap the garden to plant it (or drag it up from the
   tray). Drag a planted thing to move it; drop it in the basket to take it away. 15 gentle goal levels in 3 garden areas,
   plus free play with 4 saved gardens. Saved progress keeps the old game's key and shape (below).

   What the engine does here, and what stays game code (docs/phaser-standard.md "if Phaser can do it, Phaser does it"):
   - the loop, drawing, depth order (setDepth: nearer things are drawn over farther ones), input and its drag, hit areas,
     timers (time.delayedCall), every movement and fade (tweens: a plant grows with a squash, wiggles when tapped, sways in
     the wind, clouds and birds cross the sky, butterflies fly between flowers, water glints, ripples), particles (soil, sparkles,
     splashes, fountain spray, drifting petals, confetti), animations (butterfly and bird wings), sound (Kit.snd on
     this.sound), cameras (Kit.play.fit: the 1920 x 1080 design space), scene pause (while a menu is open);
   - game code is only the rules: where a thing may stand (GARDEN areas: water and paths block, a spot is nudged to the
     nearest grass: a game rule, not collision), the goals and the stars, and the save.
   - the world is laid out in "css px" of the screen (A.view, as the old game was tuned) and mapped to design units by S.
   The garden is calm: Kit.play runs in rest mode (the loop sleeps while nothing moves and wakes on a touch). Its life (plants
   swaying, clouds, birds, butterflies, water, petals) is a short breeze every 22-34 s (breeze()), finite tweens only, so there
   is no endless animation. Nothing runs per frame except the engine, the keyboard cursor while a key is down and the tweens.

   Saved progress (unchanged), localStorage 'kahf-jannah-garden' (Kit.store): stars {level: 1..3}, current, lvs
   {level: { d: done, i: items }}, slots [4 x { a: area, i: items } | null], mode ('level' | 'free'), slot, hinted, moved.
   An item is [type, u * 1000, v * 1000, flip, scale * 100, hue]. */
(function () {
  'use strict';
  var GD = window.GARDEN, A = window.GardenArt, COUNT = GD.LEVELS.length, MAX_ITEMS = 60, SLOTS = 4, TAP_MOVE = 10;
  var store = Kit.store('kahf-jannah-garden'), progress = Kit.progress(store, COUNT);
  var clamp = Kit.clamp, rand = Kit.rand;
  var FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  // shared with the interface
  var JG = window.JG = {
    store: store, progress: progress, COUNT: COUNT, SLOTS: SLOTS, TRAY: 190, TRAYGAP: 28, FONT: FONT,
    device: Kit.isTouch ? 'touch' : 'mouse',
    // the interface's scale: its unit is 0.38 css px on a phone (a 150-unit button is a thumb, 57 px), growing to 1.25 times
    // that on a tablet or computer, as the old game's tray did (it never fills a big screen)
    ui: function (v) { var d = Kit.play.dpr(), cpu = v.z / d, g = clamp(Math.min(innerWidth, innerHeight) / 390, 1, 1.25), U = clamp(0.38 * g / cpu, 0.3, 2.2); return { U: U, k: U * cpu }; },
    // the space the tray takes at the bottom, in css px (the garden lays its ground out above it)
    trayCss: function (v) { var d = Kit.play.dpr(), S = d / v.z; return (JG.TRAY + JG.TRAYGAP) * JG.ui(v).k + (v.b - v.sb) / S; }
  };

  class Garden extends Phaser.Scene {
    constructor() { super('Garden'); }

    create() {
      var self = this;
      this.items = []; this.nextId = 1; this.mode = 'level'; this.level = 1; this.slot = 0; this.area = -1;
      this.goals = []; this.goalCount = []; this.goalDone = []; this.levelDone = false; this.selected = 'rose';
      this.ambient = []; this.gen = 0; this.zoneKey = null; this.zoneStrong = 0; this.zoneTex = {}; this.zonePts = [];
      this.drag = null; this.dragMoved = false; this.planted = 0; this.ghost = null; this.S = 1; this.V = null; this.paintKey = '';
      this.slots = store.get('slots', []); for (var s0 = 0; s0 < SLOTS; s0++) if (this.slots[s0] === undefined) this.slots[s0] = null;
      this.lvs = store.get('lvs', {});
      this.cur = { u: 0.5, v: 0.6 };
      var ev = this.game.events, on = function (k, f) { ev.on(k, f, self); self.events.once('shutdown', function () { ev.off(k, f, self); }); };

      this.bgSky = this.add.image(0, 0, 'plants', 'px').setOrigin(0).setDepth(-1000);
      this.bgLand = this.add.image(0, 0, 'plants', 'px').setOrigin(0).setDepth(-800).setVisible(false);
      this.zoneImg = this.add.image(0, 0, 'plants', 'px').setOrigin(0).setDepth(-600).setAlpha(0).setVisible(false);
      this.hintRing = this.add.image(0, 0, 'plants', 'ring').setDepth(-500).setVisible(false);
      this.cursor = this.add.image(0, 0, 'plants', 'ring').setDepth(800).setVisible(false).setTint(0xfff8d2);
      // the garden itself takes a tap that nothing planted took (the lowest thing in the display list)
      this.bgZone = this.add.zone(0, 0, 10, 10).setOrigin(0).setDepth(-2000).setInteractive();
      this.bgZone.on('pointerup', function (p) {
        if (self.held || !self.V || p.getDistance() > TAP_MOVE * self.d || p.getDuration() > 900) return;
        var w = self.toCss(p); self.tapAt(w.x, w.y, null);
      });
      this.input.on('dragstart', function (p, o) { if (o.jgItem) self.beginItemDrag(o.jgItem, p); });
      this.input.on('pointerdown', function () { self.dragMoved = false; });

      // keys: a cursor on the ground (arrows or WASD), Space or Enter plants, Q and E choose the picture, X takes away
      var K = this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,ENTER,Q,E,X,DELETE,BACKSPACE');
      K.SPACE.on('down', function () { self.keyPlant(); }); K.ENTER.on('down', function () { self.keyPlant(); });
      K.Q.on('down', function () { self.cycle(-1); }); K.E.on('down', function () { self.cycle(1); });
      [K.X, K.DELETE, K.BACKSPACE].forEach(function (k) { k.on('down', function () { self.keyRemove(); }); });
      on('jg-device', function () { self.cursor.setVisible(JG.device === 'keys' && self.area >= 0 && !self.held); });

      Kit.play.fit(this, function (v) { self.layout(v); });
      document.addEventListener('visibilitychange', this.vis = function () { if (document.hidden) self.saveNow(); });
      addEventListener('pagehide', this.hide = function () { self.saveNow(); });
      this.events.once('shutdown', function () { document.removeEventListener('visibilitychange', self.vis); removeEventListener('pagehide', self.hide); });
      this.scheduleLife();
      this.events.once('shutdown', function () { clearTimeout(self.firstT); self.stopLife(); });
      var dbg = Kit.play.debug; if (dbg) this.debugHook(dbg);
      // straight into the garden the child was last in
      var m = store.get('mode', 'level'), sl = store.get('slot', 0);
      if (m === 'free' && this.slots[sl]) this.openFree(sl); else this.startLevel(progress.current(), false);
    }

    /* ---------------- layout ---------------- */
    layout(v) {
      var d = Kit.play.dpr(), S = this.S = d / v.z, sa = { top: (v.st - v.t) / S, bottom: (v.b - v.sb) / S, left: (v.sl - v.l) / S, right: (v.r - v.sr) / S };
      this.v = v; this.d = d; this.W = v.w / S; this.H = v.h / S; this.sa = sa;
      this.V = A.view(this.W, this.H, sa, JG.trayCss(v));
      this.input.dragDistanceThreshold = TAP_MOVE * d;
      this.bgZone.setPosition(v.l, v.t).setSize(v.w, v.h); if (this.bgZone.input) this.bgZone.input.hitArea.setSize(v.w, v.h);
      this.bgSky.setPosition(v.l, v.t).setDisplaySize(v.w, v.h); this.bgLand.setPosition(v.l, v.t).setDisplaySize(v.w, v.h);
      if (this.area < 0) return;
      this.layoutWorld();
      var key = Math.round(this.W) + 'x' + Math.round(this.H) + '@' + d;
      if (key !== this.paintKey) { if (this.repaintT) this.repaintT.remove(); this.repaintT = this.time.delayedCall(220, this.repaint, [], this); }
    }
    X(x) { return this.v.l + x * this.S; }
    Y(y) { return this.v.t + y * this.S; }
    // a pointer's place in css px of the ground (what A.view maps)
    toCss(p) { var w = this.cameras.main.getWorldPoint(p.x, p.y); return { x: (w.x - this.v.l) / this.S, y: (w.y - this.v.t) / this.S, wx: w.x, wy: w.y }; }
    kscale() { return Math.max(0.7, this.V.K); }

    // the sky, the land, the water glints, the clouds, the birds, the butterflies, the petals, the fixed scenery: painted
    // or made once per screen size and per garden area
    repaint() {
      var self = this, V = this.V, v = this.v, S = this.S, d = this.d, AR = GD.AREAS[this.area];
      this.paintKey = Math.round(this.W) + 'x' + Math.round(this.H) + '@' + d;
      this.ambient.forEach(function (o) { self.tweens.killTweensOf(o); o.destroy(); }); this.ambient = [];
      (this.genKeys || []).forEach(function (k) { if (self.textures.exists(k)) self.textures.remove(k); }); this.genKeys = [];
      var gen = ++this.gen, keep = function (o) { self.ambient.push(o); return o; };
      var pd = Math.max(0.75, Math.min(d, 1.5, 2400 / this.W));
      var lay = A.paintArea(this.area, V, pd);
      var old = [this.skyKey, this.landKey]; this.skyKey = 'sky' + gen; this.landKey = 'land' + gen;
      this.textures.addCanvas(this.skyKey, lay.sky); this.textures.addCanvas(this.landKey, lay.land);
      this.bgSky.setTexture(this.skyKey).setPosition(v.l, v.t).setDisplaySize(v.w, v.h);
      this.bgLand.setTexture(this.landKey).setVisible(true).setPosition(v.l, v.t).setDisplaySize(v.w, v.h);
      this.tweens.killTweensOf(this.zoneImg); this.zoneImg.setTexture('plants', 'px').setVisible(false).setAlpha(0);          // (it shows one of the zone textures about to go)
      Object.keys(this.zoneTex).forEach(function (z) { self.textures.remove(self.zoneTex[z].key); }); this.zoneTex = {};
      old.forEach(function (k) { if (k && self.textures.exists(k)) self.textures.remove(k); });
      this.refreshZone(true);
      // The garden's gentle life is made once here and then moves only now and then (breeze(): about a quarter of the time),
      // so that between breezes nothing is playing and the engine's loop can sleep (Kit.play rest): no endless tweens.
      // glints on the water: a few white dashes that shimmer when the breeze blows
      this.glints = [];
      if (lay.water) {
        var tc = document.createElement('canvas').getContext('2d'), n = 0;
        for (var i = 0; i < 300 && n < 14; i++) {
          var x = Math.random() * V.w, y = V.hz + Math.random() * (V.h - V.hz);
          if (!tc.isPointInPath(lay.water, x, y)) continue; n++;
          var kk = Math.max(0.6, (y - V.hz) / (V.h - V.hz) * 1.6), gl = keep(this.add.image(this.X(x), this.Y(y), 'plants', 'glint').setDepth(-700).setAlpha(0));
          gl.setScale(12 * kk * S / (16 * A.KT())); this.glints.push(gl);
        }
      }
      // clouds
      this.clouds = [];
      for (var c = 0; c < 4; c++) {
        var size = (50 + Math.random() * 50) * this.kscale(), cw = size * 2.4 * S;
        var im = keep(this.add.image(this.v.l + Math.random() * this.v.w, this.Y(V.hz * (0.12 + Math.random() * 0.45)), A.cloudTex(this, c)).setOrigin(0).setDepth(-900).setDisplaySize(cw, cw / 2));
        im.cw = cw; this.clouds.push(im);
      }
      // three far birds wait out of sight, a butterfly or two rest among the flowers
      this.birds = [];
      for (var b = 0; b < 3; b++) this.birds.push(keep(this.add.sprite(0, 0, 'plants', 'bird0').setDepth(-650).setAlpha(0.6).setVisible(false).setScale(0.55 * this.kscale() * (0.55 + Math.random() * 0.45) * S / (A.KT() / 2))));
      this.flies = [];
      for (var f = 0; f < 3; f++) this.flies.push(keep(this.add.sprite(this.X(Math.random() * V.w), this.Y(V.y(0.2 + Math.random() * 0.8)) - 40 * S, 'bfly', 'bf' + (f + 1) + '-0').setDepth(600).setScale(0.62 * this.kscale() * S / 2)));
      // petals: one emitter that lets a few fall now and then
      this.petals = keep(this.add.particles(0, 0, 'plants', { frame: 'petal', emitting: false, lifespan: 5200, speedX: { min: 20 * S, max: 48 * S }, speedY: { min: 40 * S, max: 70 * S },
        rotate: { start: 0, end: 360 }, scale: { min: 0.5 * S / (A.KT() / 2) * 1.6, max: 0.9 * S / (A.KT() / 2) * 1.6 }, alpha: { start: 0.85, end: 0.85 } }).setDepth(650));
      // fixed scenery
      this.fixed = []; this.bigLife = null;
      AR.fixed.forEach(function (f) {
        var x = self.X(V.x(f.u)), y = self.Y(V.y(f.v)), s = V.pf(f.v);
        if (f.t === 'bigfountain') {
          var F0 = AR.fount, rx = F0.ru * (V.w - 2 * V.padX), ry = Math.min(F0.rv * (V.gBot - V.gTop), rx * 0.42), key = 'bigf' + gen;
          var bt = A.bigTex(self, key, rx, ry, V.K, pd), g = bt.geom; self.genKeys.push(key);
          var im = keep(self.add.image(x, y, key).setDepth(f.v).setDisplaySize(bt.w * S, bt.h * S));
          im.setOrigin(bt.ox / im.width, bt.oy / im.height);
          self.bigLife = { spray: self.sprayAt(keep, x, y + g.top * S, S * 1.0, 1.6, f.v), rip: [0, 1, 2].map(function () { return self.ripple(keep, x, y, rx * 0.92 * S, ry * 0.86 * S, f.v + 0.001); }) };
        } else {
          var F = A.F[f.t], sh = keep(self.add.image(x, y + S, 'plants', 'shadow').setDepth(f.v - 0.01)), im2 = keep(self.add.image(x, y, 'plants', f.t).setDepth(f.v));
          im2.setOrigin(F.ax / im2.width, F.ay / im2.height).setScale(s * S / A.KT());
          sh.setDisplaySize(96 * (F.w * 0.4 * s * S / 46), 40 * (F.w * 0.4 * s * S / 46) * 0.78);
        }
      });
      this.fx();
      if (this.hintOn) this.showHintRing();
    }
    // ---- the breeze: now and then a little life moves for a few seconds, then everything is still and the loop sleeps ----
    scheduleLife() {
      var self = this;
      this.firstT = setTimeout(function () { self.breeze(); }, 2200);                       // one at the start, then every 22-34 s (the kit's ambient timer: it does not hold the loop awake)
      this.stopLife = Kit.play.every(22000, 34000, function () { self.breeze(); }, this);
    }
    breeze() {
      if (this.area < 0 || this.held || document.hidden || !this.V) return;
      if (Kit.play.wake) Kit.play.wake();                                                   // (the first breeze comes from our own timer)
      var self = this, S = this.S, v = this.v, V = this.V;
      this.items.forEach(function (it) { self.itemLife(it); });
      this.glints.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 6).forEach(function (gl) {
        self.tweens.add({ targets: gl, alpha: { from: 0, to: 0.7 }, duration: rand(600, 1100), yoyo: true, delay: rand(0, 1800), ease: 'Sine.easeInOut' });
      });
      this.clouds.forEach(function (c) {                                                   // clouds drift a little
        var dist = (25 + Math.random() * 45) * S; if (c.x + dist > v.r + 20) c.x = v.l - c.cw - 10;
        self.tweens.add({ targets: c, x: c.x + dist, duration: 5200, ease: 'Sine.easeInOut' });
      });
      if (Math.random() < 0.45) this.fly(this.birds[(Math.random() * 3) | 0]);
      this.flies.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 1 + (Math.random() < 0.5 ? 1 : 0)).forEach(function (f) { self.wander(f); });
      if (this.petals && Math.random() < 0.4) for (var i = 0, n = 1 + (Math.random() * 3 | 0); i < n; i++) this.petals.explode(1, rand(v.l, v.r), v.t - 20);
      if (this.bigLife) { this.bigLife.spray.start(0, 3500); this.bigLife.rip.forEach(function (r, i) { self.ripFire(r, i * 650); }); }
      if (this.zoneKey) this.zoneLife();
      if (this.hintOn) this.showHintRing();
      if (Math.random() < 0.7) Kit.snd.play('birdfar', { pan: rand(-0.8, 0.8), delay: rand(0.2, 3) });
    }
    // what a plant, a lantern, a pond, a fountain and a butterfly do in a breeze
    itemLife(it) {
      var self = this, info = GD.BY_ID[it.t], im = it.img; if (!im || !it.grown || (this.drag && this.drag.it === it)) return;
      var amp = (it.t === 'palm' ? 2 : info.kind === 'tree' ? 1.1 : info.kind === 'flower' ? 2.6 : 0) * (Kit.reducedMotion ? 0.3 : 1);
      if (amp && !it.wg) this.tweens.add({ targets: im, angle: amp * (0.5 + Math.random() * 0.5) * (Math.random() < 0.5 ? -1 : 1), duration: rand(1100, 1700), yoyo: true, delay: rand(0, 900), ease: 'Sine.easeInOut' });
      if (it.glow) this.tweens.add({ targets: it.glow, alpha: { from: 0.7, to: 1 }, duration: 600, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
      if (it.rip) it.rip.forEach(function (r, i) { self.ripFire(r, i * 700); });
      if (it.spray) it.spray.start(0, 3200);
      if (it.t === 'butterfly') {
        var bx = rand(-20, 20); if (im.flipX !== (bx < it.bx)) im.setFlipX(bx < it.bx);
        im.play('jg-bf' + (it.hue % 5));
        this.tweens.add({ targets: it, bx: bx, by: rand(-9, 9), duration: 2800, ease: 'Sine.easeInOut', onUpdate: function () { self.placeItem(it); }, onComplete: function () { if (it.img) { it.img.anims.stop(); it.img.setFrame('bf' + (it.hue % 5) + '-0'); } } });
      }
    }
    fly(bd) {
      var self = this, V = this.V, dir = Math.random() < 0.5 ? -1 : 1, spd = (110 + Math.random() * 40) * this.kscale() * this.S;
      if (bd.visible) return;
      var from = dir > 0 ? this.v.l - 40 : this.v.r + 40, to = dir > 0 ? this.v.r + 60 : this.v.l - 60;
      bd.setFlipX(dir < 0).setPosition(from, this.Y(V.hz * (0.15 + Math.random() * 0.55))).setVisible(true).play('jg-bird');
      this.tweens.add({ targets: bd, x: to, y: bd.y + 14 * this.S, duration: Math.abs(to - from) / spd * 1000, onComplete: function () { bd.setVisible(false); bd.anims.stop(); } });
    }
    // a butterfly goes to a flower (one hop, then it rests)
    wander(f) {
      var self = this, V = this.V, S = this.S, tx, ty;
      var cands = this.items.filter(function (it) { var k = GD.BY_ID[it.t].kind; return (k === 'flower' || k === 'tree') && it.grown; });
      if (cands.length && Math.random() < 0.8) {
        var it = cands[(Math.random() * cands.length) | 0], s = V.pf(it.v) * it.sc, F = A.F[it.t];
        tx = this.X(V.x(it.u) + (Math.random() - 0.5) * F.w * s * 0.5); ty = this.Y(V.y(it.v) - F.h * s * (0.75 + Math.random() * 0.2));
      } else { tx = this.X(V.x(Math.random())); ty = this.Y(V.y(0.2 + Math.random() * 0.8) - 30 - Math.random() * 60); }
      var dist = Math.hypot(tx - f.x, ty - f.y), dur = Math.max(600, Math.min(3500, dist / (60 * this.kscale() * S) * 1000)), hue = f.frame.name.charAt(2);
      this.tweens.killTweensOf(f); f.setFlipX(tx < f.x); f.play('jg-bf' + hue);
      this.tweens.add({ targets: f, x: tx, duration: dur, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: f, y: ty, duration: dur, ease: 'Quad.easeOut', onComplete: function () { if (f.active) { f.anims.stop(); f.setFrame('bf' + hue + '-0'); } } });
    }
    // the interface of a fountain's spray: dots thrown up that fall back (engine particles); start(0, ms) lets it spray for a while
    sprayAt(keep, x, y, k, power, depth) {
      var S = this.S;
      return keep(this.add.particles(x, y, 'plants', { frame: 'dot', emitting: false, angle: { min: -112, max: -68 }, speed: { min: 70 * S * power, max: 120 * S * power }, gravityY: 330 * S * power,
        lifespan: { min: 700, max: 1000 }, frequency: 110, quantity: 1, scale: { start: 0.16 * k * S / (A.KT() / 2) * 1.6, end: 0.04 }, alpha: { start: 0.9, end: 0 }, tint: 0xeafcff }).setDepth(depth + 0.002));
    }
    ripple(keep, x, y, w, h, depth) {
      var im = keep(this.add.image(x, y, 'plants', 'ring').setDepth(depth).setAlpha(0));
      im.rsx = w / im.frame.width; im.rsy = h / im.frame.height; im.setScale(im.rsx * 0.2, im.rsy * 0.2);
      return im;
    }
    ripFire(r, delay) {
      this.tweens.killTweensOf(r); r.setScale(r.rsx * 0.2, r.rsy * 0.2).setAlpha(0);
      this.tweens.add({ targets: r, scaleX: r.rsx, scaleY: r.rsy, alpha: { from: 0.6, to: 0 }, duration: 2000, delay: delay, ease: 'Sine.easeOut' });
    }
    // the particle emitters of the garden (rebuilt with the screen size so their sizes follow it)
    fx() {
      var self = this, S = this.S, f = function (px) { return px * S / (A.KT() / 2); };
      if (this.fxs) this.fxs.forEach(function (e) { e.destroy(); });
      var mk = function (cfg, depth) { return self.add.particles(0, 0, 'plants', Object.assign({ emitting: false }, cfg)).setDepth(depth); };
      this.soil = mk({ frame: 'dot', speed: { min: 60 * S, max: 150 * S }, angle: { min: -150, max: -30 }, gravityY: 900 * S, lifespan: 520, scale: { start: f(0.3), end: 0 }, tint: [0x8a5a36, 0xa87444, 0x6b4426] }, 700);
      this.spark = mk({ frame: 'star', speed: { min: 60 * S, max: 170 * S }, gravityY: -40 * S, lifespan: 950, scale: { start: f(0.62), end: 0 }, alpha: { start: 1, end: 0 }, rotate: { start: 0, end: 90 }, tint: [0xfff6c2, 0xffd36b, 0xffffff, 0xffc1d6] }, 701);
      this.splash = mk({ frame: 'dot', speed: { min: 80 * S, max: 190 * S }, angle: { min: -150, max: -30 }, gravityY: 1000 * S, lifespan: 560, scale: { start: f(0.3), end: 0 }, tint: [0xe6fbff, 0xb8ecf7] }, 702);
      this.confetti = mk({ frame: 'star', speed: { min: 200 * S, max: 480 * S }, angle: { min: -140, max: -40 }, gravityY: 520 * S, lifespan: 1500, scale: { start: f(0.6), end: 0.05 }, alpha: { start: 1, end: 0 }, rotate: { start: 0, end: 300 }, tint: [0xffd36b, 0xfff6c2, 0xffc1d6, 0xffffff, 0xf6c453] }, 703);
      this.zoneSpark = mk({ frame: 'star', lifespan: 1500, scale: { start: f(0.5), end: 0 }, alpha: { start: 1, end: 0 }, tint: 0xfffbe0 }, -590);
      this.fxs = [this.soil, this.spark, this.splash, this.confetti, this.zoneSpark];
      this.zoneKey = null; this.refreshZone(true);
    }

    /* ---------------- the things in the garden ---------------- */
    itemScale(it) { return this.V.pf(it.v) * it.sc; }                          // css px per sprite unit
    mk(t, u, v, o) {
      o = o || {};
      return { id: this.nextId++, t: t, u: u, v: v, flip: o.flip || (Math.random() < 0.5 ? -1 : 1), sc: o.sc || (0.92 + Math.random() * 0.16),
        hue: o.hue != null ? o.hue : (Math.random() * 5) | 0, grown: !!o.grown, lift: 0, ex: [], bx: 0, by: 0 };
    }
    encode(list) { return list.map(function (it) { return [it.t, Math.round(it.u * 1000), Math.round(it.v * 1000), it.flip, Math.round(it.sc * 100), it.hue | 0]; }); }
    decode(arr) {
      var self = this;
      return (arr || []).filter(function (a) { return a && GD.BY_ID[a[0]] && isFinite(a[1]) && isFinite(a[2]); })
        .slice(0, MAX_ITEMS).map(function (a) { return self.mk(a[0], clamp(a[1] / 1000, 0, 1), clamp(a[2] / 1000, 0, 1), { flip: a[3] === -1 ? -1 : 1, sc: clamp((a[4] || 100) / 100, 0.8, 1.2), hue: a[5] | 0, grown: true }); });
    }
    // make the pictures of a thing (shadow, sprite, extras) and put it in its place
    spawn(it, animate) {
      var self = this, F = A.F[it.t], info = GD.BY_ID[it.t];
      if (it.t === 'butterfly') {
        it.img = this.add.sprite(0, 0, 'bfly', 'bf' + (it.hue % 5) + '-0');
        // it rests until a breeze (itemLife) lets it flutter round the spot
      } else {
        if (!F.flat) it.sh = this.add.image(0, 0, 'plants', 'shadow');
        it.img = this.add.image(0, 0, 'plants', it.t);
        it.img.setOrigin(F.ax / it.img.width, F.ay / it.img.height).setFlipX(it.flip < 0);
      }
      it.img.jgItem = it;
      it.img.setInteractive({ hitArea: new Phaser.Geom.Rectangle(0, 0, 10, 10), hitAreaCallback: Phaser.Geom.Rectangle.Contains, draggable: true });
      this.restyle(it);
      this.placeItem(it);
      var base = it.base, kind = info.kind;
      if (animate) {
        it.img.setScale(0);
        if (it.sh) it.sh.setAlpha(0);
        it.ex.forEach(function (o) { o.setVisible(false); });
        this.tweens.add({ targets: it.img, scaleX: { from: 0, to: base }, duration: 760, ease: 'Back.easeOut' });
        this.tweens.add({ targets: it.img, scaleY: { from: 0, to: base }, duration: kind === 'tree' ? 860 : 900, ease: kind === 'tree' ? 'Back.easeOut' : 'Elastic.easeOut',
          onUpdate: function () { if (it.sh) { it.sh.setAlpha(Math.min(1, it.img.scaleY / (it.base || 1))); self.placeItem(it); } },
          onComplete: function () { self.grew(it, false); } });
      } else this.grew(it, true);
    }
    // a thing has grown: it starts to sway, its water and glow come on
    grew(it, quiet) {
      if (!it.img || !it.img.active) return;
      it.grown = true; it.img.setScale(it.base);
      if (it.sh) it.sh.setAlpha(1);
      it.ex.forEach(function (o) { o.setVisible(true); });
      this.placeItem(it);
    }
    // sizes that follow the screen: scale, the hit rectangle, shadow, and the things that glow, spray or ripple
    restyle(it) {
      var S = this.S, k = A.KT(), s = this.itemScale(it), F = A.F[it.t], im = it.img, self = this;
      if (it.t === 'butterfly') {
        it.base = s * 0.85 * S / 2; im.setScale(it.base);
        var r = Math.max(30, 26 * s) / (s * 0.85 / 2);                           // the hit square, in texture px
        im.input.hitArea.setTo(60 - r / 2, 60 - r / 2, r, r);
        return;
      }
      it.base = s * S / k;
      if (it.grown) im.setScale(it.base);
      var pxCss = k / s, hw, hh;                                                  // texture px per css px
      if (F.flat) { hw = Math.max(26, F.w * 0.42 * s) * 2; hh = Math.max(24, 30 * s) * 2; im.input.hitArea.setTo(F.ax - hw / 2 * pxCss, F.ay - hh / 2 * pxCss, hw * pxCss, hh * pxCss); }
      else { hw = Math.max(48, F.w * F.hitW * s); hh = Math.max(48, F.h * s); im.input.hitArea.setTo(F.ax - hw / 2 * pxCss, F.ay - hh * pxCss, hw * pxCss, (hh + 10) * pxCss); }
      if (it.sh) { var rx = F.w * 0.36 * (GD.BY_ID[it.t].kind === 'tree' ? 0.75 : 1) * s * S, f = rx / 46; it.sh.setDisplaySize(96 * f, 40 * f * 0.78); it.sh.baseW = it.sh.displayWidth; it.sh.baseH = it.sh.displayHeight; }
      // extras are made again for the new size
      it.ex.forEach(function (o) { self.tweens.killTweensOf(o); o.destroy(); }); it.ex = []; it.glow = it.spray = it.rip = null;
      var keep = function (o) { it.ex.push(o); o.setVisible(it.grown); return o; };
      if (it.t === 'lantern') {
        var gl = 110 * s * S;
        it.glow = keep(this.add.image(0, 0, 'plants', 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(500).setDisplaySize(gl * 2.2, gl * 2.2));
      }
      if (it.t === 'fountain') it.spray = this.sprayAt(keep, 0, 0, s, 1, it.v);
      if (it.t === 'pond' || it.t === 'fountain') {
        var w = (it.t === 'pond' ? 130 : 92) * s * S, h = w * (it.t === 'pond' ? 0.34 : 0.26);
        it.rip = [0, 1].map(function () { return self.ripple(keep, 0, 0, w, h, 0); });
      }
    }
    placeItem(it) {
      if (!it.img || !it.img.active) return;
      var V = this.V, S = this.S, x = this.X(V.x(it.u)), y = this.Y(V.y(it.v)), s = this.itemScale(it), L = it.lift || 0, key = (A.F[it.t].flat ? -10 : 0) + it.v + it.id * 1e-6;
      if (it.t === 'butterfly') it.img.setPosition(x + it.bx * s * S, y - 52 * s * S + it.by * s * S - 12 * S * L).setDepth(key + 0.5);
      else it.img.setPosition(x, y - 12 * S * L).setDepth(key);
      if (it.sh) {
        var q = 1 + L * 0.3; it.sh.setPosition(x, y + S).setDepth(key - 0.5);
        if (it.sh.baseW) it.sh.setDisplaySize(it.sh.baseW * q, it.sh.baseH * q);
      }
      if (it.glow) it.glow.setPosition(x, y - 104 * s * S - 12 * S * L - 12 * S);
      if (it.spray) it.spray.setPosition(x, y - 88 * s * S).setDepth(key + 0.01);
      if (it.rip) it.rip.forEach(function (r) { r.setPosition(x, y - (it.t === 'pond' ? 0 : 26 * s * S)).setDepth(key + 0.01); });
    }
    layoutWorld() {
      var self = this;
      this.items.forEach(function (it) { self.restyle(it); self.placeItem(it); });
      this.hintPlace();
      if (this.ghost) this.ghost.setScale(this.ghostScale());
    }
    killItem(it) {
      var self = this;
      [it.img, it.sh].concat(it.ex).forEach(function (o) { if (o) { self.tweens.killTweensOf(o); o.destroy(); } });
      this.tweens.killTweensOf(it); it.img = it.sh = null; it.ex = [];
    }
    loadItems(arr) {
      var self = this;
      this.items.forEach(function (it) { self.killItem(it); }); this.items = [];
      this.decode(arr).forEach(function (it) { self.items.push(it); self.spawn(it, false); });
    }
    wig(it, amp) {
      if (!it.img || !it.grown) return;
      if (it.wg) it.wg.stop();
      var b = it.base, im = it.img, seq = [[1 + 0.12 * amp, 1 - 0.1 * amp], [1 - 0.07 * amp, 1 + 0.06 * amp], [1 + 0.03 * amp, 1 - 0.03 * amp], [1, 1]];
      it.wg = this.tweens.chain({ targets: im, tweens: seq.map(function (q) { return { scaleX: b * q[0], scaleY: b * q[1], duration: 85, ease: 'Sine.easeInOut' }; }) });
    }
    // the front-most thing a keyboard cursor stands on or near
    nearest(u, v, r) {
      var best = null, bd = r;
      this.items.forEach(function (it) { var d = Math.hypot((it.u - u) * 1.6, it.v - v); if (d < bd) { bd = d; best = it; } });
      return best;
    }
    plantable(u, v) { return u >= 0 && u <= 1 && v >= 0 && v <= 1 && !GD.AREAS[this.area].blocked(u, v); }
    // move a spot off water and paths onto the nearest grass
    settle(u, v) {
      u = clamp(u, 0, 1); v = clamp(v, 0, 1);
      var AR = GD.AREAS[this.area];
      for (var i = 0; i < 4 && AR.blocked(u, v); i++) { var n = AR.nudge(u, v); u = clamp(n.u, 0, 1); v = clamp(n.v, 0, 1); }
      if (AR.blocked(u, v)) for (var r = 0.02; r < 0.4; r += 0.02) for (var a = 0; a < 6.28; a += 0.5) { var uu = u + Math.cos(a) * r, vv = v + Math.sin(a) * r; if (this.plantable(uu, vv)) return { u: uu, v: vv }; }
      return { u: u, v: v };
    }
    // the sound a thing makes when it is planted or tapped
    sfx(it, tapped) {
      var q = tapped ? 0.7 : 1, snd = GD.BY_ID[it.t].snd;
      if (snd === 'plant') { Kit.snd.play('soil', { vol: q }); Kit.snd.play('leaf', { delay: 0.07, vol: q }); }
      else if (snd === 'bush') { Kit.snd.play('soil', { vol: q * 0.8 }); Kit.snd.play('foliage', { delay: 0.06, vol: q * 0.7 }); }
      else if (snd === 'tree') { Kit.snd.play('soil', { vol: q, rate: 0.82 }); Kit.snd.play('foliage', { delay: 0.12, vol: q }); }
      else if (snd === 'water') { Kit.snd.play(it.t === 'fountain' ? 'pour' : 'splash', { vol: q }); if (!tapped) Kit.snd.play('ripple', { delay: 0.18, vol: 0.8 }); }
      else if (snd === 'wood') { Kit.snd.play('knock', { vol: q }); if (!tapped) Kit.snd.play('soil', { vol: 0.5, delay: 0.05 }); }
      else if (snd === 'chirp') { Kit.snd.play('chirp', { vol: q, pan: rand(-0.3, 0.3) }); if (!tapped) Kit.snd.play('knock', { vol: 0.5 }); }
      else if (snd === 'glow') Kit.snd.play('glow', { vol: q });
      else if (snd === 'flutter') Kit.snd.play('flutter', { vol: q });
    }
    plant(type, u, v, quiet) {
      var S = this.S, V = this.V;
      if (this.items.length >= MAX_ITEMS) {
        this.game.events.emit('jg-basket', 'bump'); Kit.snd.play('soil', { vol: 0.5, rate: 0.7 });
        this.floatText(this.X(V.x(u)), this.Y(V.y(v)) - 20 * S, 'Garden full!', 26); return null;
      }
      var p = this.settle(u, v), it = this.mk(type, p.u, p.v);
      this.items.push(it); this.spawn(it, true);
      var x = this.X(V.x(it.u)), y = this.Y(V.y(it.v)), s = this.itemScale(it), F = A.F[type];
      if (!quiet) {
        this.sfx(it, false); Kit.buzz(8);
        this.soil.explode(8, x, y);
        this.spark.explode(10, x, y - F.h * s * S * 0.5);
        this.scatter(x, y);
      }
      this.planted++;
      if (this.hintOn) { this.hintOn = false; this.hideHintRing(); store.set('hinted', true); this.game.events.emit('jg-hint', 'planted'); }
      if (this.planted === 4 && !store.get('moved')) this.game.events.emit('jg-hint', 'move');
      this.lastPlanted = it;
      this.evalGoals(true); this.save();
      return it;
    }
    removeItem(it, fromX, fromY) {
      var i = this.items.indexOf(it); if (i < 0) return;
      this.items.splice(i, 1);
      var self = this, hud = this.scene.get('Hud'), bp = hud.basketPx ? hud.basketPx() : null, to = bp ? this.cameras.main.getWorldPoint(bp.x, bp.y) : { x: fromX, y: fromY };
      // a copy flies to the basket and shrinks away
      var F = A.F[it.t], ghost = it.t === 'butterfly' ? this.add.sprite(fromX, fromY, 'bfly', 'bf' + (it.hue % 5) + '-0') : this.add.image(fromX, fromY, 'plants', it.t);
      if (it.t !== 'butterfly') ghost.setOrigin(F.ax / ghost.width, F.ay / ghost.height);
      ghost.setScale(it.base * 0.7).setAlpha(0.8).setDepth(900);
      this.killItem(it);
      this.tweens.add({ targets: ghost, x: to.x, scale: ghost.scale * 0.2, alpha: 0.3, duration: 340, ease: 'Quad.easeIn', onComplete: function () { ghost.destroy(); } });
      this.tweens.add({ targets: ghost, y: { from: fromY, to: to.y - 40 * this.S }, duration: 340, ease: 'Back.easeIn', easeParams: [2] });
      Kit.snd.play('basket'); this.game.events.emit('jg-basket', 'bump');
      this.evalGoals(true); this.save();
    }
    // butterflies fly off from a tap
    scatter(x, y) {
      var self = this, S = this.S;
      (this.flies || []).forEach(function (f) { if (f.active && Math.hypot(f.x - x, f.y - y) < 110 * S) { self.tweens.killTweensOf(f); f.setFlipX(f.x < x); self.tweens.add({ targets: f, x: f.x + (f.x - x) * 2, y: f.y - 90 * S, duration: 900, ease: 'Sine.easeOut', onComplete: function () { if (f.active) self.wander(f); } }); } });
    }
    floatText(x, y, str, css) {
      var t = this.add.text(x, y, str, { fontFamily: FONT, fontSize: Math.round(css * this.S) + 'px', fontStyle: '800', color: '#fff6c2', stroke: 'rgba(40,60,20,.6)', strokeThickness: Math.round(5 * this.S) }).setOrigin(0.5).setDepth(950).setResolution(2);
      this.tweens.add({ targets: t, y: y - 50 * this.S, duration: 1200, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: t, alpha: 0, duration: 500, delay: 800, onComplete: function () { t.destroy(); } });
    }

    /* ---------------- input ---------------- */
    tapAt(x, y, it) {
      var V = this.V, S = this.S, u = V.u(x), v = V.v(y), AR = GD.AREAS[this.area], wx = this.X(x), wy = this.Y(y);
      if (y < V.hz) { this.newBird(wx, wy); Kit.snd.play('chirp'); return; }                      // the sky: a bird flies by
      if (y > this.H - JG.trayCss(this.v) + 8 || v > 1.06) return;
      if (AR.inWater(u, clamp(v, 0, 1)) && v >= 0) {
        this.splash.explode(8, wx, wy); Kit.snd.play('ripple'); Kit.snd.play('splash', { delay: 0.05, vol: 0.5 });
        var r = this.add.image(wx, wy, 'plants', 'ring').setDepth(-550).setAlpha(0.9), pf = V.pf(v), w = 60 * pf * S;
        r.setDisplaySize(w * 0.3, w * 0.1);
        this.tweens.add({ targets: r, displayWidth: w * 2.2, displayHeight: w * 0.7, alpha: 0, duration: 1100, ease: 'Sine.easeOut', onComplete: function () { r.destroy(); } });
        return;
      }
      this.plant(this.selected, u, Math.max(0, v));
    }
    tapItem(it) {
      this.wig(it, 1); this.sfx(it, true);
      var s = this.itemScale(it), S = this.S, F = A.F[it.t], x = this.X(this.V.x(it.u)), y = this.Y(this.V.y(it.v)) - (it.t === 'butterfly' ? 52 * s * S : F.h * s * S * 0.6);
      this.spark.explode(5, x, y); this.scatter(x, y);
    }
    newBird(x, y) {
      var self = this, S = this.S, dir = Math.random() < 0.5 ? -1 : 1, bd = this.add.sprite(x, y, 'plants', 'bird0').setDepth(-640).setScale(0.8 * this.kscale() * S / (A.KT() / 2)).setFlipX(dir < 0).setAlpha(0.7);
      bd.play('jg-bird');
      this.tweens.add({ targets: bd, x: x + dir * 600 * S, y: y - 140 * S, duration: 3600, ease: 'Sine.easeIn', onComplete: function () { bd.destroy(); } });
    }
    keyPlant() {
      if (this.held || this.area < 0 || JG.device !== 'keys') return;
      var p = this.settle(this.cur.u, this.cur.v);
      if (GD.AREAS[this.area].inWater(this.cur.u, this.cur.v)) { var V = this.V; this.tapAt(V.x(this.cur.u), V.y(this.cur.v), null); return; }
      this.plant(this.selected, p.u, p.v);
    }
    keyRemove() {
      if (this.held || JG.device !== 'keys') return;
      var it = this.nearest(this.cur.u, this.cur.v, 0.12); if (!it) return;
      this.removeItem(it, this.X(this.V.x(it.u)), this.Y(this.V.y(it.v)));
    }
    cycle(d) {
      if (this.held) return;
      var ids = GD.ITEMS.map(function (i) { return i.id; }), i = ids.indexOf(this.selected);
      this.select(ids[(i + d + ids.length) % ids.length], true);
    }
    update(time, dms) {
      // the keyboard cursor, only while an arrow key is down
      var K = this.keys; if (!K || JG.device !== 'keys' || this.held || this.area < 0) return;
      var kx = (K.D.isDown || K.RIGHT.isDown ? 1 : 0) - (K.A.isDown || K.LEFT.isDown ? 1 : 0), ky = (K.S.isDown || K.DOWN.isDown ? 1 : 0) - (K.W.isDown || K.UP.isDown ? 1 : 0);
      if (kx || ky) { var dt = dms / 1000; this.cur.u = clamp(this.cur.u + kx * dt * 0.45, 0, 1); this.cur.v = clamp(this.cur.v + ky * dt * 0.45, 0, 1); this.placeCursor(); }
    }
    placeCursor() {
      if (!this.V) return;
      var V = this.V, S = this.S, w = 60 * V.pf(this.cur.v) * S;
      this.cursor.setPosition(this.X(V.x(this.cur.u)), this.Y(V.y(this.cur.v))).setDisplaySize(w * 1.4, w * 0.5).setVisible(JG.device === 'keys' && !this.held);
    }

    /* dragging a thing in the garden (the engine's drag: threshold, capture, release) */
    beginItemDrag(it, p) {
      var w = this.toCss(p), S = this.S;
      this.dragMoved = true;
      this.drag = { kind: 'item', it: it, offX: this.X(this.V.x(it.u)) - w.wx, offY: this.Y(this.V.y(it.v)) - w.wy, over: 0 };
      if (it.wg) it.wg.stop(); this.tweens.killTweensOf(it.img);
      it.img.setAngle(0); it.img.setScale(it.base);
      this.tweens.add({ targets: it, lift: 1, duration: 120, onUpdate: function () {} });
      Kit.snd.play('leaf', { vol: 0.6, rate: 1.25 }); Kit.buzz(6);
      this.game.events.emit('jg-drag', 'start');
      // The engine starts the drag (threshold, which thing); the finger is then followed on the page itself: while it is over
      // the tray the engine's input belongs to the interface scene above and would stop telling us where it is.
      var self = this, d = this.d, pid = p.event && p.event.pointerId;
      var fake = function (e) { return { x: e.clientX * d, y: e.clientY * d }; };
      var mv = function (e) { if (pid != null && e.pointerId !== pid) return; if (self.drag && self.drag.it === it) self.moveDrag(fake(e)); };
      var up = function (e) { if (pid != null && e.pointerId !== pid) return; off(); if (self.drag && self.drag.it === it) self.endDrag(fake(e), e.type === 'pointercancel'); };
      var off = function () { removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', up, true); };
      addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
      this.dragOff = off;
      if (!store.get('moved')) { store.set('moved', true); this.game.events.emit('jg-hint', 'moved'); }
    }
    moveDrag(p) {
      var d = this.drag, it = d.it, w = this.toCss(p), hud = this.scene.get('Hud'), over = hud.over ? hud.over(p.x, p.y) : 0, V = this.V;
      if (over !== d.over) {
        d.over = over;
        this.tweens.killTweensOf(it.img);
        this.tweens.add({ targets: it.img, scaleX: it.base * (over ? 0.7 : 1), scaleY: it.base * (over ? 0.7 : 1), alpha: over ? 0.7 : 1, duration: 120 });
        if (it.sh) it.sh.setVisible(!over);
        this.game.events.emit('jg-basket', over === 2 ? 'hot' : 'cold');
      }
      if (over) { it.img.setPosition(w.wx, w.wy); return; }
      var cx = (w.wx + d.offX - this.v.l) / this.S, cy = (w.wy + d.offY - this.v.t) / this.S;
      it.u = clamp(V.u(cx), 0, 1); it.v = clamp(V.v(cy), 0, 1);
      this.placeItem(it);
      this.refreshZone();
    }
    endDrag(p, cancelled) {
      var d = this.drag; if (!d) return; this.drag = null; if (this.dragOff) { this.dragOff(); this.dragOff = null; }
      var it = d.it, w = this.toCss(p);
      this.game.events.emit('jg-drag', 'end'); this.game.events.emit('jg-basket', 'cold');
      if (!it.img) return;
      if (it.sh) it.sh.setVisible(true);
      if (d.over && !cancelled) { this.removeItem(it, w.wx, w.wy); return; }
      this.tweens.killTweensOf(it.img); it.img.setAlpha(1);
      var q = this.settle(it.u, it.v); it.u = q.u; it.v = q.v;
      this.tweens.add({ targets: it, lift: 0, duration: 160, onUpdate: function () {} });
      it.img.setScale(it.base);
      this.placeItem(it);
      // keep it placing while it settles
      this.tweens.add({ targets: it, lift: 0, duration: 170, onUpdate: this.placeItem.bind(this, it) });
      if (cancelled) { this.save(); this.refreshZone(); return; }
      this.wig(it, 0.8); Kit.snd.play('soil', { vol: 0.6 });
      this.soil.explode(6, this.X(this.V.x(q.u)), this.Y(this.V.y(q.v)));
      this.evalGoals(true); this.save(); this.refreshZone();
    }

    /* dragging a new thing up from the tray (the interface starts it and tells us where the finger is) */
    beginNewDrag(t, p) {
      this.drag = { kind: 'new', t: t, over: 1 };
      var F = A.F[t];
      this.ghost = t === 'butterfly' ? this.add.sprite(0, 0, 'bfly', 'bf0-0') : this.add.image(0, 0, 'plants', t);
      if (t !== 'butterfly') this.ghost.setOrigin(F.ax / this.ghost.width, F.ay / this.ghost.height);
      this.ghost.setDepth(900).setAlpha(0.85); this.ghost.jgT = t;
      this.landing = this.add.image(0, 0, 'plants', 'ring').setDepth(-450).setTint(0xfff8d2).setAlpha(0.9).setVisible(false);
      Kit.snd.play('leaf', { vol: 0.6, rate: 1.25 }); Kit.buzz(6);
      this.moveNewDrag(p);
    }
    ghostScale() { return this.ghost ? this.ghostS || 1 : 1; }
    newSpot(p) { var w = this.toCss(p), gy = w.y - 34; return { u: this.V.u(w.x), v: this.V.v(gy), gy: gy, x: w.x, wx: w.wx, wy: w.wy }; }
    moveNewDrag(p) {
      var d = this.drag; if (!d || d.kind !== 'new') return;
      var hud = this.scene.get('Hud'), over = hud.over ? hud.over(p.x, p.y) : 0, sp = this.newSpot(p), V = this.V, S = this.S;
      d.over = over; this.game.events.emit('jg-basket', 'open');
      var ok = !over && sp.v > -0.08 && sp.v < 1.1, pf = ok ? V.pf(clamp(sp.v, 0, 1)) : 0.6, s = pf * 1, k = A.KT();
      this.ghostS = this.ghost.jgT === 'butterfly' ? s * 0.85 * S / 2 : s * S / k;
      this.ghost.setScale(this.ghostS).setPosition(this.X(sp.x), this.Y(sp.gy)).setAlpha(ok ? 0.88 : 0.5);
      if (this.ghost.jgT === 'butterfly') this.ghost.y -= 30 * s * S;
      if (ok) { var q = this.settle(sp.u, clamp(sp.v, 0, 1)), rs = 34 * V.pf(q.v) * S; this.landing.setVisible(true).setPosition(this.X(V.x(q.u)), this.Y(V.y(q.v))).setDisplaySize(rs * 2, rs * 0.72); }
      else this.landing.setVisible(false);
      this.refreshZone();
    }
    endNewDrag(p, cancelled) {
      var d = this.drag; if (!d || d.kind !== 'new') return; this.drag = null;
      var sp = this.newSpot(p), hud = this.scene.get('Hud'), over = hud.over ? hud.over(p.x, p.y) : 0;
      this.ghost.destroy(); this.ghost = null; this.landing.destroy(); this.landing = null;
      this.game.events.emit('jg-basket', 'cold'); this.refreshZone();
      if (cancelled) return;
      if (over || sp.v < -0.08 || sp.v > 1.1) { Kit.snd.play('soft'); return; }
      this.plant(d.t, sp.u, Math.max(0, sp.v));
    }

    /* ---------------- goals ---------------- */
    evalGoals(announce) {
      var self = this;
      if (this.mode !== 'level') { this.game.events.emit('jg-goals', { goals: [], count: [], done: [], n: 0, levelDone: false, newly: false }); this.refreshZone(); return; }
      var newly = false;
      this.goals.forEach(function (gl, i) {
        var c = GD.count(gl, self.area, self.items), was = self.goalDone[i];
        self.goalCount[i] = c; self.goalDone[i] = c >= gl.n;
        if (self.goalDone[i] && !was && announce) newly = true;
      });
      var n = this.goalDone.filter(Boolean).length;
      this.game.events.emit('jg-goals', { goals: this.goals, count: this.goalCount.slice(), done: this.goalDone.slice(), n: n, levelDone: this.levelDone, newly: newly });
      if (newly) {
        Kit.snd.play('goal', { rate: 1 + 0.06 * (n - 1) });
        var it = this.lastPlanted; if (it && it.img) this.spark.explode(12, it.img.x, it.img.y - 40 * this.S);
      }
      if (n === this.goals.length && !this.levelDone && announce) { this.levelDone = true; this.time.delayedCall(1100, function () { self.finishLevel(n); }); }
      this.refreshZone();
    }
    finishLevel(stars) {
      var self = this, V = this.V, v = this.v;
      this.levelDone = true; this.lastStars = stars;
      progress.finish(this.level, stars);
      Kit.bridge.complete();
      this.saveNow();
      this.game.events.emit('jg-goals', { goals: this.goals, count: this.goalCount.slice(), done: this.goalDone.slice(), n: stars, levelDone: true, newly: false });
      Kit.snd.play('win');
      this.items.forEach(function (it, k) { self.time.delayedCall(k * 30, function () { self.wig(it, 1.2); }); });
      for (var i = 0; i < 6; i++) this.time.delayedCall(i * 160, function () {
        self.confetti.explode(14, self.X(rand(V.w * 0.15, V.w * 0.85)), self.Y(rand(V.hz * 0.6, V.gBot * 0.8)));
      });
      this.time.delayedCall(1400, function () {
        self.game.events.emit('jg-won', { stars: stars, level: self.level, area: self.area, last: self.level === COUNT, endOfArea: self.level % 5 === 0, canSave: self.freeSlot() >= 0 && self.items.length > 0 });
      });
    }
    freeSlot() { for (var i = 0; i < SLOTS; i++) if (!this.slots[i] || !this.slots[i].i || !this.slots[i].i.length) return i; return -1; }
    saveToGardens() {
      var free = this.freeSlot(); if (free < 0 || !this.items.length) return;
      this.slots[free] = { a: this.area, i: this.encode(this.items) }; store.set('slots', this.slots);
      Kit.snd.play('page'); this.floatText(this.X(this.V.w / 2), this.Y(this.V.hz), 'Saved!', 44);
    }

    // the goal's zone, glowing on the ground where the picture in hand is wanted
    activeZone() {
      if (this.mode !== 'level') return null;
      var want = this.drag ? (this.drag.kind === 'new' ? this.drag.t : this.drag.it.t) : this.selected, i, gl;
      for (i = 0; i < this.goals.length; i++) { gl = this.goals[i]; if (gl.z && gl.t === want && (!this.goalDone[i] || this.zoneStrong)) return gl.z; }
      if (this.zoneStrong) for (i = 0; i < this.goals.length; i++) if (this.goals[i].z && this.goals[i].t === this.selected) return this.goals[i].z;
      return null;
    }
    zoneMask(z) {
      if (this.zoneTex[z]) return this.zoneTex[z];
      var V = this.V, AR = GD.AREAS[this.area], test = AR.zones[z], sc = 5, cw = Math.ceil(V.w / sc), ch = Math.ceil(V.h / sc);
      var c = document.createElement('canvas'); c.width = cw; c.height = ch;
      var g = c.getContext('2d'), img = g.createImageData(cw, ch), dd = img.data, pts = [], al = new Float32Array(cw * ch), px, py;
      for (py = 0; py < ch; py++) for (px = 0; px < cw; px++) {
        var n = 0;
        for (var sy = 0; sy < 2; sy++) for (var sx = 0; sx < 2; sx++) {
          var x = (px + 0.25 + sx * 0.5) * sc, y = (py + 0.25 + sy * 0.5) * sc, u = V.u(x), v = V.v(y);
          if (v >= 0 && v <= 1 && u >= 0 && u <= 1 && test(u, v) && !AR.blocked(u, v)) n++;
        }
        al[py * cw + px] = n / 4;
        if (n === 4 && Math.random() < 0.03) pts.push({ x: this.X((px + 0.5) * sc), y: this.Y((py + 0.5) * sc) });
      }
      for (py = 0; py < ch; py++) for (px = 0; px < cw; px++) {
        var sum = 0, cnt = 0;
        for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) { var qx = px + ox, qy = py + oy; if (qx >= 0 && qy >= 0 && qx < cw && qy < ch) { sum += al[qy * cw + qx]; cnt++; } }
        var i = (py * cw + px) * 4; dd[i] = 255; dd[i + 1] = 228; dd[i + 2] = 130; dd[i + 3] = Math.round(255 * sum / cnt);
      }
      g.putImageData(img, 0, 0);
      var key = 'zone' + this.gen + z; this.textures.addCanvas(key, c);
      return (this.zoneTex[z] = { key: key, pts: pts.sort(function () { return Math.random() - 0.5; }).slice(0, 26) });
    }
    refreshZone(force) {
      if (!this.zoneImg || !this.zoneSpark || !this.V || this.area < 0) return;
      var z = this.activeZone(), k = z ? z + ':' + (this.zoneStrong ? 1 : 0) : '';
      if (!force && k === this.zoneKey) return;
      this.zoneKey = k;
      this.tweens.killTweensOf(this.zoneImg);
      if (!z) { this.tweens.add({ targets: this.zoneImg, alpha: 0, duration: 200, onComplete: function (tw, t) { if (t[0] && !t[0].alpha) t[0].setVisible(false); } }); return; }
      var m = this.zoneMask(z), v = this.v, hi = this.zoneStrong ? 0.5 : 0.28;
      this.zonePts = m.pts;
      this.zoneImg.setTexture(m.key).setPosition(v.l, v.t).setDisplaySize(v.w, v.h).setVisible(true);
      this.zoneImg.alpha = hi; this.zoneHi = hi;
      this.zoneLife();
    }
    // the zone glows: one soft pulse and a few sparkles (again at each breeze), then it rests
    zoneLife() {
      if (!this.zoneKey || !this.zoneImg.visible) return;
      var self = this, hi = this.zoneHi || 0.28;
      this.tweens.killTweensOf(this.zoneImg);
      this.tweens.add({ targets: this.zoneImg, alpha: { from: hi, to: hi + 0.16 }, duration: 900, yoyo: true, ease: 'Sine.easeInOut' });
      for (var i = 0; i < 7 && this.zonePts.length; i++) { var q = this.zonePts[(Math.random() * this.zonePts.length) | 0]; this.time.delayedCall(rand(0, 1400), function (q) { self.zoneSpark.explode(1, q.x, q.y); }, [q]); }
    }
    showZoneStrong() {
      var self = this; this.zoneStrong = 1; this.refreshZone();
      if (this.zoneT) this.zoneT.remove();
      this.zoneT = this.time.delayedCall(3500, function () { self.zoneStrong = 0; self.refreshZone(); });
    }

    /* ---------------- choosing, modes, saving ---------------- */
    select(id, loud) {
      this.selected = id; this.game.events.emit('jg-selected', id, !!loud);
      this.refreshZone();
    }
    setArea(a) { if (a !== this.area) { this.area = a; this.paintKey = ''; this.repaint(); this.layoutWorld(); } }
    clearTransient() {
      if (this.drag) { if (this.drag.kind === 'new') { this.ghost && this.ghost.destroy(); this.landing && this.landing.destroy(); this.ghost = this.landing = null; } this.drag = null; }
      this.hideHintRing(); this.hintOn = false; this.zoneStrong = 0;
      this.game.events.emit('jg-basket', 'cold'); this.game.events.emit('jg-hint', 'clear');
    }
    startLevel(n, fresh) {
      if (this.area >= 0) this.saveNow();
      this.clearTransient();
      this.mode = 'level'; this.level = clamp(n, 1, COUNT); progress.setCurrent(this.level);
      this.setArea(GD.areaOf(this.level));
      var sv = this.lvs[this.level];
      this.loadItems(!fresh && sv && !sv.d ? sv.i : []);
      this.levelDone = false; this.goals = GD.LEVELS[this.level - 1].goals;
      this.goalCount = this.goals.map(function () { return 0; }); this.goalDone = this.goals.map(function () { return false; });
      this.evalGoals(false);
      var first = 0; for (var i = 0; i < this.goals.length; i++) if (!this.goalDone[i]) { first = i; break; }
      this.select(this.goals[first].t, false);
      this.saveNow();
      if (this.level === 1 && !store.get('hinted') && !this.items.length) { this.hintOn = true; this.showHintRing(); }
      this.begun();
    }
    openFree(i, a) {
      if (this.area >= 0) this.saveNow();
      this.clearTransient();
      this.mode = 'free'; this.slot = i;
      if (!this.slots[i]) this.slots[i] = { a: a || 0, i: [] };
      this.setArea(this.slots[i].a); this.loadItems(this.slots[i].i);
      this.goals = []; this.goalDone = []; this.goalCount = []; this.levelDone = false;
      this.evalGoals(false); this.saveNow(); this.begun();
    }
    // a garden is open: the interface shows its name, the bed of sound for its place plays
    begun() {
      var AR = GD.AREAS[this.area];
      JG.bed = this.area === 0 ? 'amb-river' : this.area === 2 ? 'amb-court' : 'amb-wind';
      Kit.snd.amb(JG.bed);
      this.game.events.emit('jg-start', this.startInfo());
      this.refreshZone(true); this.placeCursor();
    }
    startInfo() { return { mode: this.mode, level: this.level, slot: this.slot, area: this.area, areaName: GD.AREAS[this.area].name, title: this.mode === 'level' ? 'Level ' + this.level : 'My Garden ' + (this.slot + 1) }; }
    goalInfo() { return { goals: this.goals, count: this.goalCount.slice(), done: this.goalDone.slice(), n: this.goalDone.filter(Boolean).length, levelDone: this.levelDone, newly: false }; }
    clearGarden() {
      var self = this;
      this.items.slice().forEach(function (it, k) {
        self.time.delayedCall(k * 25, function () { if (it.img) self.spark.explode(5, it.img.x, it.img.y - 40 * self.S); });
      });
      this.items.forEach(function (it) { self.killItem(it); }); this.items = [];
      Kit.snd.play('basket'); this.game.events.emit('jg-basket', 'bump');
      if (this.mode === 'level') { this.levelDone = false; this.evalGoals(false); } else this.evalGoals(false);
      this.saveNow();
    }
    deleteSlot(i) {
      var sv = this.slots[i]; this.slots[i] = null; store.set('slots', this.slots); Kit.snd.play('basket');
      if (this.mode === 'free' && this.slot === i) this.openFree(i, sv ? sv.a : 0);
    }
    save() { if (this.saveT) this.saveT.remove(); this.saveT = this.time.delayedCall(250, this.saveNow, [], this); }
    saveNow() {
      if (this.saveT) { this.saveT.remove(); this.saveT = null; }
      if (this.area < 0) return;
      if (this.mode === 'level') { this.lvs[this.level] = { d: this.levelDone ? 1 : 0, i: this.encode(this.items) }; store.set('lvs', this.lvs); }
      else { this.slots[this.slot] = { a: this.area, i: this.encode(this.items) }; store.set('slots', this.slots); }
      store.set('mode', this.mode); store.set('slot', this.slot);
    }
    // a small picture of a garden (My Gardens, the clear and empty questions)
    thumb(a, list, w, h) { return A.thumb(a, list, w, h, Math.min(2, this.d)); }
    thumbOf(sv) { return this.decode(sv.i); }

    /* ---------------- the first-time hints, in the world ---------------- */
    showHintRing() {
      if (!this.V) return;
      this.hintPlace(); this.hintRing.setVisible(true);
      this.tweens.killTweensOf(this.hintRing);
      this.tweens.add({ targets: this.hintRing, alpha: { from: 0.9, to: 0 }, displayWidth: { from: 20 * this.S, to: 150 * this.S }, displayHeight: { from: 8 * this.S, to: 56 * this.S }, duration: 1400, repeat: 3 });
    }
    hideHintRing() { if (this.hintRing) { this.tweens.killTweensOf(this.hintRing); this.hintRing.setVisible(false); } }
    hintPlace() { if (this.V && this.hintRing) this.hintRing.setPosition(this.X(this.V.x(0.32)), this.Y(this.V.y(0.62))); }

    // the interface opened or closed a menu over the garden
    hold(on) {
      this.held = !!on;
      if (on) { this.cursor.setVisible(false); if (this.drag) { if (this.drag.kind === 'item') this.endDrag({ x: 0, y: 0 }, true); else this.endNewDrag({ x: 0, y: 0 }, true); } this.saveNow(); }
      else this.placeCursor();
    }

    /* ---------------- test hook (only with ?debug) ---------------- */
    debugHook(dbg) {
      var self = this;
      dbg.garden = this;
      dbg.plant = function (t, u, v) { var it = self.plant(t, u, v); return it && it.id; };
      dbg.state = function () { return { mode: self.mode, level: self.level, slot: self.slot, area: self.area, done: self.levelDone, selected: self.selected, held: self.held, n: self.items.length,
        goals: self.goals.map(function (gl, i) { return { t: gl.t, n: gl.n, z: gl.z, count: self.goalCount[i], done: self.goalDone[i] }; }), items: self.items.map(function (it) { return { id: it.id, t: it.t, u: it.u, v: it.v, x: it.img && it.img.x, y: it.img && it.img.y }; }),
        stars: progress.stars(self.level) }; };
      dbg.spot = function (z, k) {
        var AR = GD.AREAS[self.area], test = z ? AR.zones[z] : null, out = [];
        for (var v = 0.04; v <= 0.98; v += 0.06) for (var u = 0.05; u <= 0.95; u += 0.07) if (self.plantable(u, v) && (!test || test(u, v))) out.push({ u: u, v: v });
        var pick = []; for (var i = 0; i < out.length; i++) pick.push(out[(i * 7) % out.length]);
        return pick[k % pick.length];
      };
      dbg.screen = function (u, v) { var w = { x: self.X(self.V.x(u)), y: self.Y(self.V.y(v)) }, c = self.cameras.main; return { x: (w.x - c.worldView.x) * c.zoom / self.d, y: (w.y - c.worldView.y) * c.zoom / self.d }; };
      dbg.finish = function (n) { self.finishLevel(n || self.goals.length); };
    }
  }

  window.JGGarden = Garden;
})();
