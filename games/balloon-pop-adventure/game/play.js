/* Balloon Pop: play.js, scene 'Play': one level (Phaser 4 + Arcade physics, in the design space of Kit.play.fit).
   Tap to pop. Balloons rise with a gentle sway; quick pops build a combo (bigger cheers, never a higher pitch); good-deed
   balloons carry a picture card that is shown big for a moment (hud.js); grey storm clouds are to be left alone
   (tapping one costs a heart). 24 levels in 3 worlds with 1-3 stars (data.js). Every finger pops.

   What the engine does here (the old game hand-wrote all of it: a fixed-step loop, its own movement, hit tests,
   particles, tweens, timers, and per-frame drawing of the scenery):
   - Arcade physics: every balloon is a pooled Container with a dynamic body; it rises by velocity (variable step, so a
     slowed moment stays smooth), sways by a velocity that follows a sine path (a spring back to the path if something
     nudges it), and leaves through a ceiling zone (`physics.add.overlap`), with a lower one for the tall deed
     balloons. The star balloon finds its neighbours with `physics.overlapCirc`.
   - Input: each balloon is interactive with an ellipse-shaped hit test (at least a finger wide, 156 units); the nearest
     and topmost one takes the tap (input topOnly), a tap on empty sky puffs; three pointers at once.
   - Tweens for the squash of a pop, the breathing and swing of balloons, the cloud drift, the butterflies, gulls,
     sparkles and lanterns; `this.time` for the star chain and the win; particles for confetti, droplets and stars;
     animations for wings; a camera shake (small) for a storm.
   Game code is only the rules: spawning, goals, hearts, combo, stars, and the slow moment while a deed card is shown
   (the world slows to 30%: the balloons' own velocities are scaled, since the engine's world time scale steps in
   fixed jumps). All state is set in create(). */
(function () {
  'use strict';
  var D = window.BpData, A = window.BpArt, U = A.U, B = A.BALLOON, LV = D.list, COUNT = D.count;
  var MINR = 78;                                       // a tap counts within this many units of a balloon: a finger
  var MG = 100;                                        // parallax margin of the scenery layers, units
  var POOL = 20, RICH = 6;
  var STORM = { w: 150 * U, hitX: 66 * U, hitY: 42 * U };

  class Play extends Phaser.Scene {
    constructor() { super({ key: 'Play', physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, fixedStep: false, debug: /[?&]phys/.test(location.search) } } }); }

    create(data) {
      var self = this, n = Phaser.Math.Clamp((data && data.n) | 0 || 1, 1, COUNT), gen = this.gen = (this.gen || 0) + 1;
      this.n = n; this.def = LV[n - 1]; this.world = D.worldOf(n); this.built = false;
      // only this world's balloons and small things are kept as pictures: the other worlds' go, this one's is fetched if it is not
      // there (the first level's came with Boot; a world change is a short wait on a plain sky)
      var tm = this.textures, W = this.world;
      for (var w = 0; w < 3; w++) if (w !== W) ['bal-', 'wd-'].forEach(function (k) { if (tm.exists(k + w)) tm.remove(k + w); });
      Kit.play.artNeed(this, new RegExp('^(bal|wd)-' + W + '$'), function () { if (self.gen === gen && self.sys.settings.status < Phaser.Scenes.SHUTDOWN) self.build(n); });
    }
    build(n) {
      var self = this;
      // ---- the level's state (all of it here: a scene object is reused) ----
      this.state = 'play'; this.time0 = 0; this.spawnT = 0.4; this.recentX = []; this.lastDeedT = 0; this.clock = 0;
      this.heartsLost = 0; this.hearts = this.def.hearts; this.combo = 0; this.lastPopT = -9; this.stars = 0;
      this.ts = 1; this.slow = false; this.showPending = 0; this.parX = 0.5; this.parT = 0.5; this.par = 60;
      this.deedBag = []; this.fx = []; this.decorObjs = []; this.bg = {}; this.bgT = null; this.nid = 0;
      this.goals = this.def.goals.map(function (g) { return { t: g.t, c: g.c, n: g.n, got: 0 }; });
      this.popped = !!Bp.store.get('popped', false); this.hintStorm = !Bp.store.get('stormHint', false);     // (read once: a saved read every frame was a JSON parse)
      Bp.progress.setCurrent(n);

      A.ui(this); A.fonts(this);
      Bp.fit(this, function (v) { if (self.built) self.relayout(v); });
      var v = this.view;
      this.kb = A.KB;
      A.world(this, this.world); A.cards(this);
      this.bal = 'bal-' + this.world;
      this.wf = Phaser.Math.Clamp(v.w / 1150, 0.85, 1.9);
      this.par = D.par(this.def, this.wf);

      this.cameras.main.setBackgroundColor(D.WORLDS[this.world].bg);
      this.paintBack();
      this.decor();
      this.makePools();
      this.makeFx();

      // tap on empty sky: a soft puff and a few sparks (the balloons take their own taps)
      this.input.on('pointerdown', function (p, over) {
        self.parT = Phaser.Math.Clamp((p.worldX - self.view.l) / self.view.w, 0, 1);
        if (self.state !== 'play' || (over && over.length) || p.bpUi === p.downTime) return;
        Kit.snd.play('puff', { vol: 0.7 });
        Bp.fan(self.sparks, [0xffffff, 0xfff3b0], 5, p.worldX, p.worldY);
      });

      var ev = this.game.events, on = function (k, f) { ev.on(k, f, self); self.events.once('shutdown', function () { ev.off(k, f, self); }); };
      on('bp-show', function (b) { this.slow = !!b; Kit.snd.amb(D.WORLDS[this.world].bed, { vol: b ? 0.35 : 0.7 }); });
      on('bp-deed-done', function () { this.showPending = Math.max(0, this.showPending - 1); });

      this.events.once('shutdown', function () { self.bgGen++; });
      this.built = true;
      Kit.snd.amb(D.WORLDS[this.world].bed, { vol: 0.7 });
      ev.emit('bp-start', { n: n, def: this.def, world: this.world, goals: this.goals, hearts: this.hearts });
      if (Kit.load && !Kit.load.gone) this.time.delayedCall(0, function () { Kit.load.done(); });
      if (Kit.play.debug) this.hook();
    }

    // ---------- the scenery ----------
    // three layers standing on the bottom of the view, wider than any view; the baked or painted textures of the world and the
    // screen's shape (art.js). They drift a little with the finger (update). If the screen turns, the other shape is made.
    paintBack() {
      var self = this, v = this.view, shape = A.shapeOf(v), gen = this.bgGen = (this.bgGen || 0) + 1;
      A.scenery(this, this.world, shape, function () {
        if (gen !== self.bgGen) return;                 // the scene was left, or asked again, meanwhile
        var v2 = self.view, sz, bs = A.bgSize(shape, 'back'), f = Math.max(1, (v2.w + MG * 2) / bs.uw, v2.h / bs.uh);   // a view wider or taller than the sheet: a little larger
        [['back', 0], ['mid', 3], ['near', 20]].forEach(function (l) {
          var k = 'bg' + shape + self.world + '-' + l[0], im = self.bg[l[0]]; sz = A.bgSize(shape, l[0]);
          if (!im) im = self.bg[l[0]] = self.add.image(0, 0, k).setOrigin(0, 0).setDepth(l[1]);
          im.setTexture(k).setDisplaySize(sz.uw * f, sz.uh * f);
          im.bx = v2.l + v2.w / 2 - sz.uw * f / 2; im.y = v2.b - sz.uh * f; im.x = im.bx;
        });
      });
    }
    // small living things, all engine objects: drifting clouds, butterflies, gulls, sparkles on the sea, twinkling stars, rising
    // lanterns, fireflies. Only what always moves (clouds, butterflies) is a running tween; the rest are one-off tweens started
    // now and then by Kit.play.every from small pools, so most of the time they cost nothing (measured: permanent tweens and
    // emitters were most of this game's per-frame work).
    clearDecor() {
      var self = this;
      (this.decorStops || []).forEach(function (f) { f(); }); this.decorStops = [];
      this.decorObjs.forEach(function (o) { self.tweens.killTweensOf(o); o.destroy(); });
      this.decorObjs = [];
    }
    // (the animations are made anew each time: they hold the frames of the world's atlas)
    decor() {
      var self = this, v = this.view, W = this.world, kb = this.kb, R = Phaser.Math.FloatBetween, wd = 'wd-' + W;
      var put = function (o) { self.decorObjs.push(o); return o; };
      var X = function () { return R(v.l, v.r); }, Y = function (a, b) { return v.t + v.h * R(a, b); };
      var every = function (a, b, fn) { self.decorStops.push(Kit.play.every(a, b, function () { if (self.sys.isActive()) fn(); })); };
      var free = function (pool) { for (var k = 0; k < pool.length; k++) if (!pool[k].visible) return pool[k]; return null; };
      var pool = function (n, make) { var a = []; for (var k = 0; k < n; k++) a.push(put(make(k).setVisible(false))); return a; };
      this.decorStops = [];
      var drift = function (o, speed) {            // across the view, then round again
        var go = function (from) { var vv = self.view; o.x = from; self.tweens.add({ targets: o, x: vv.r + 450, duration: (vv.r + 450 - from) / speed * 1000, onComplete: function () { if (o.active) go(vv.l - 450); } }); };
        go(X());
      };
      if (W < 2) for (var i = 0; i < 3; i++) { var c = put(this.add.image(0, Y(0.06 + 0.1 * i, 0.12 + 0.1 * i), wd, 'cloud' + i).setScale((0.8 + 0.1 * (i % 2)) / kb).setAlpha(0.88).setDepth(1)); drift(c, R(9, 15)); }
      if (W === 0) {
        if (this.anims.exists('fly')) this.anims.remove('fly');
        this.anims.create({ key: 'fly', frames: [{ key: wd, frame: 'fly0' }, { key: wd, frame: 'fly1' }], frameRate: 6, repeat: -1 });
        var tints = [0xffb347, 0xff7eb9, 0x7ad3ff];
        for (i = 0; i < 3; i++) {
          var b = put(this.add.sprite(X(), Y(0.5, 0.82), wd, 'fly0').setScale(1.1 / kb).setTint(tints[i]).setDepth(4)); b.play({ key: 'fly', startFrame: i % 2 });
          this.tweens.add({ targets: b, x: b.x + R(120, 320) * (i % 2 ? 1 : -1), duration: R(9000, 15000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: R(0, 3000) });
        }
      } else if (W === 1) {
        if (this.anims.exists('gull')) this.anims.remove('gull');
        this.anims.create({ key: 'gull', frames: [{ key: wd, frame: 'gull0' }, { key: wd, frame: 'gull1' }], frameRate: 4, repeat: -1 });
        var gulls = pool(2, function () { return self.add.sprite(0, 0, wd, 'gull0').setScale(1.15 / kb).setDepth(2); });
        var fly = function () {                    // one gull crosses the view, then rests
          var g = free(gulls); if (!g) return; var vv = self.view, y = Y(0.12, 0.38), dir = Math.random() < 0.5 ? 1 : -1;
          g.setVisible(true).setPosition(dir > 0 ? vv.l - 200 : vv.r + 200, y).setFlipX(dir < 0); g.play({ key: 'gull', startFrame: 0 });
          self.tweens.add({ targets: g, x: dir > 0 ? vv.r + 200 : vv.l - 200, y: y + R(-60, 60), duration: R(18000, 28000), onComplete: function () { g.stop(); g.setVisible(false); } });
        };
        fly(); every(9000, 16000, fly);
        var sea = A.sea(A.shapeOf(v));
        var sparks = pool(6, function () { return self.add.image(0, 0, 'ui', 'spark').setDepth(2); });
        every(250, 700, function () {
          var s = free(sparks); if (!s) return; var sc = R(0.22, 0.4);
          s.setVisible(true).setPosition(X(), v.b - R(sea[0] + 30, sea[1] - 30)).setScale(sc).setAlpha(0);
          self.tweens.add({ targets: s, alpha: 0.95, scale: sc * 1.3, duration: R(600, 1000), yoyo: true, onComplete: function () { s.setVisible(false); } });
        });
      } else {
        var lc = ['lan0', 'lan1', 'lan2'];
        var lans = pool(4, function (k) { return self.add.image(0, 0, wd, lc[k % 3]).setScale(0.55 / kb).setAlpha(0.85).setDepth(2); });
        var launch = function (progress) {         // a lantern rises from the bottom to the top, slowly
          var L = free(lans); if (!L) return; var vv = self.view;
          L.setVisible(true).setPosition(R(vv.l, vv.r), vv.b + 100);
          var tw = self.tweens.add({ targets: L, y: vv.t - 140, duration: R(50000, 90000), onComplete: function () { L.setVisible(false); } });
          if (progress) tw.seek(progress);
        };
        launch(0.2); launch(0.5); launch(0.75); every(8000, 16000, function () { launch(0); });
        var stars = pool(5, function () { return self.add.image(0, 0, 'ui', 'spark').setTint(0xfff8e0).setDepth(2); });
        every(500, 1400, function () {
          var s = free(stars); if (!s) return; var sc = R(0.18, 0.3);
          s.setVisible(true).setPosition(X(), Y(0.02, 0.5)).setScale(sc).setAlpha(0.1);
          self.tweens.add({ targets: s, alpha: 1, duration: R(700, 1100), yoyo: true, ease: 'Sine.easeInOut', onComplete: function () { s.setVisible(false); } });
        });
        // fireflies: the engine's particles, drifting low over the terrace
        var ff = put(this.add.particles(0, 0, 'ui', { frame: 'glow', emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(v.l, v.t + v.h * 0.7, v.w, v.h * 0.24) },
          lifespan: 5000, speedX: { min: -16, max: 16 }, speedY: { min: -14, max: 10 }, scale: { min: 0.05, max: 0.1 }, tint: 0xfff29a, alpha: { start: 0, end: 0.85, ease: 'Sine.easeInOut', yoyo: true }, frequency: 900, blendMode: 'ADD' }).setDepth(4));
        if (ff.fastForward) ff.fastForward(3000);
      }
    }
    relayout(v) {
      var self = this;
      this.game.events.emit('bp-fit');                    // (the interface container maps this view: hud.js)
      this.wf = Phaser.Math.Clamp(v.w / 1150, 0.85, 1.9);
      this.ceilingFit();
      if (this.bgT) this.bgT.remove();
      this.bgT = this.time.delayedCall(250, function () { self.paintBack(); self.clearDecor(); self.decor(); });   // the view changed: scenery for the new shape
    }

    // ---------- the balloons: a pool of plain ones (one Image each: balloon and string in one picture, so one object to draw
    // and move) and a few Containers for the ones with something extra (deed balloon with its card, storm cloud with rain,
    // star balloon with its sparkles) ----------
    makePools() {
      var self = this;
      this.air = this.physics.add.group();
      this.cl = this.add.zone(0, 0, 10, 10); this.physics.add.existing(this.cl, true);
      this.ceilingFit();
      // each balloon's body is a small square at the END of its string (or card, or cloud): it reaches this strip above
      // the screen only when the whole balloon is off the top
      this.physics.add.overlap(this.air, this.cl, function (a, b) { self.left(a.bp ? a : b); });
      this.free = []; this.freeRich = []; this.live = [];
      for (var i = 0; i < POOL; i++) this.free.push(this.makePlain());
      for (i = 0; i < RICH; i++) this.freeRich.push(this.makeRich());
    }
    ceilingFit() {
      var v = this.view, h = 600;
      this.cl.setPosition(v.l + v.w / 2, v.t - 30 - h / 2).setSize(v.w + 400, h); this.cl.body.setSize(v.w + 400, h); this.cl.body.updateFromGameObject();
    }
    arm(c) {                                            // taps and the pop
      var self = this;
      c.bp = true; c.active = false;
      c.setInteractive({ hitArea: new Phaser.Geom.Rectangle(0, 0, B.w, B.h), hitAreaCallback: function (a, x, y) { return c.active && self.hit(c, x, y); }, useHandCursor: true });
      c.input.enabled = false;
      c.on('pointerdown', function (p) { if (c.active && self.state === 'play') self.pop(c, { pointer: p }); });
      return c;
    }
    makePlain() {
      var c = this.physics.add.image(-999, -999, this.bal, 'b0').setDepth(10); c.plain = true; c.img = c;
      this.air.add(c); c.setActive(false).setVisible(false); c.body.enable = false;
      return this.arm(c);
    }
    makeRich() {
      var c = this.add.container(-999, -999).setSize(B.w, B.h).setDepth(11);
      c.glow = this.add.image(0, 0, 'ui', 'glow').setTint(0xffdc78); c.card = this.add.image(0, 0, 'ui', 'px').setOrigin(0.5, 0);
      c.img = this.add.image(0, 0, this.bal, 'b0');
      c.rain = []; for (var i = 0; i < 4; i++) { var s = this.add.image(0, 0, 'ui', 'streak').setTint(0x9ad6ff); c.rain.push(s); }
      c.orbit = this.add.container(0, 0); for (i = 0; i < 3; i++) c.orbit.add(this.add.image(Math.cos(i * 2.09) * 135, Math.sin(i * 2.09) * 150, 'ui', 'spark').setScale(0.4 + 0.1 * i).setTint(0xfff6c8));
      c.add([c.glow, c.card, c.img].concat(c.rain, [c.orbit]));
      this.physics.add.existing(c); this.air.add(c);
      c.setActive(false).setVisible(false); c.body.enable = false;
      return this.arm(c);
    }
    // is a tap at (x, y) (from the picture's or the container's top left) on this balloon? the old rules, a finger wide at the least
    hit(c, x, y) {
      var z = c.z, dx, dy, d;
      if (c.popping) return false;
      if (c.plain) { dx = (x - c.fx) * c.sc; dy = (y - c.fy) * c.sc; } else { dx = x - B.w / 2; dy = y - B.h / 2; }
      if (c.kind === 'storm') return Math.hypot(dx / Math.max(STORM.hitX * z, MINR), dy / Math.max(STORM.hitY * z, MINR)) <= 1;
      d = Math.hypot(dx / Math.max(B.w * 0.47 * z, MINR), (dy + B.h * 0.04 * z) / Math.max(B.h * 0.52 * z, MINR)) / 1.15;
      if (c.kind === 'deed') { var cs = B.card * z * 0.62, cy = (B.h / 2 + B.knot + B.string + B.card / 2) * z; if (Math.abs(dx) < cs && Math.abs(dy - cy) < cs) d = Math.min(d, 0.7); }
      return d <= 1;
    }
    nextDeed() {
      if (!this.deedBag.length) { this.deedBag = D.DEEDS.map(function (_, i) { return i; }); Phaser.Utils.Array.Shuffle(this.deedBag); }
      return this.deedBag.pop();
    }
    goalLeft(t, c) { var left = 0; this.goals.forEach(function (g) { if (g.t === t && (c == null || g.c === c)) left += Math.max(0, g.n - g.got); }); return left; }
    needed(c) {                                         // would popping this balloon still move a goal?
      if (c.kind === 'storm') return false;
      for (var i = 0; i < this.goals.length; i++) {
        var g = this.goals[i]; if (g.got >= g.n) continue;
        if (g.t === 'any') return true;
        if (g.t === 'deed' && c.kind === 'deed') return true;
        if (g.t === 'color' && c.kind === 'b' && c.col === g.c) return true;
      }
      return false;
    }
    goalsDone() { for (var i = 0; i < this.goals.length; i++) if (this.goals[i].got < this.goals[i].n) return false; return true; }

    spawn() {
      var def = this.def, v = this.view, liveN = 0, storms = 0, deedOn = false, starOn = false, i;
      this.live.forEach(function (c) { if (c.popping || c.fading) return; if (c.kind === 'storm') storms++; else liveN++; if (c.kind === 'deed') deedOn = true; if (c.kind === 'star') starOn = true; });
      if (liveN >= Math.round(def.max * this.wf)) return false;
      var kind = 'b', dl = this.goalLeft('deed'), rnd = Math.random;
      if (!deedOn && dl > 0 && (this.time0 - this.lastDeedT > 5 || rnd() < def.deed)) kind = 'deed';
      else if (!deedOn && dl === 0 && rnd() < def.deed) kind = 'deed';
      else if (def.storm && storms < (def.stormMax || 2) && this.time0 > 2.5 && rnd() < def.storm) kind = 'storm';
      else if (def.star && !starOn && this.time0 > 3 && rnd() < def.star) kind = 'star';
      var c = kind === 'b' ? this.free.pop() : this.freeRich.pop();
      if (!c) return false;
      var need = []; this.goals.forEach(function (g) { if (g.t === 'color' && g.got < g.n) need.push(g.c); });
      var col = need.length && rnd() < 0.5 ? Phaser.Utils.Array.GetRandom(need) : Phaser.Utils.Array.GetRandom(def.colors);
      var z = kind === 'storm' || kind === 'deed' ? 1 : Phaser.Math.FloatBetween(0.84, 0.99), half = (kind === 'storm' ? 80 * U : B.w * 0.5) * z, x = 0;
      var xa = v.sl + half + 20, xb = v.sr - half - 20;
      for (var t = 0; t < 10; t++) {
        x = Phaser.Math.FloatBetween(xa, xb);
        var ok = true; for (var k = 0; k < this.recentX.length; k++) if (Math.abs(this.recentX[k] - x) < B.w * 1.1) ok = false;
        if (ok) break;
      }
      this.recentX.push(x); if (this.recentX.length > Math.max(2, Math.round(2 * this.wf))) this.recentX.shift();
      var amp = Math.max(0, Math.min(Phaser.Math.FloatBetween(10, 26) * U, x - xa, xb - x));
      var y = v.b + (B.h * 0.5 + 20 * U) * z;
      var vy = (v.h + 240 * U) / def.rise * Phaser.Math.FloatBetween(0.92, 1.08) * (0.86 + 0.14 * z) * (kind === 'storm' ? 0.85 : 1);
      this.setup(c, kind, col, z, x, y, amp, vy);
      if (kind === 'deed') this.lastDeedT = this.time0;
      return true;
    }
    // dress a pooled balloon for this spawn and set it going
    setup(c, kind, col, z, x, y, amp, vy) {
      var self = this, f = A.F[kind === 'storm' ? 'storm' : kind === 'b' ? 'b' + col : kind], key = kind === 'storm' ? 'storm' : kind === 'b' ? 'b' + col : kind, sc = z / this.kb;
      c.kind = kind; c.col = col; c.z = z; c.x0 = x; c.amp = amp; c.vyT = -vy; c.w = Phaser.Math.FloatBetween(0.7, 1.15); c.ph = Math.random() * 6.28; c.cs = 0;
      c.popping = false; c.fading = false; c.deedIdx = -1; c.id = (this.nid = (this.nid || 0) + 1);
      c.img.setFrame(key).setOrigin(f.ox, f.oy).setScale(sc).setAlpha(1).setRotation(0);
      var kn = (B.h / 2 + B.knot) * z, end = 0;
      if (c.plain) {
        c.sc = sc; c.fx = f.ox * f.fw; c.fy = f.oy * f.fh;
        c.body.enable = true; c.body.setSize(8, 8, false); c.body.setOffset(f.fw / 2 - 4, f.end - 4);
      } else {
        c.setScale(1).setAlpha(1).setRotation(0);
        c.glow.setVisible(kind === 'deed'); c.card.setVisible(kind === 'deed'); c.orbit.setVisible(kind === 'star');
        c.rain.forEach(function (r) { r.setVisible(kind === 'storm'); });
        end = kind === 'deed' ? (B.h / 2 + B.knot + B.string + B.card) * z : kind === 'storm' ? 70 * U * z : (B.h / 2 + B.knot + B.string) * z;
        if (kind === 'deed') {
          c.deedIdx = this.nextDeed();
          c.card.setTexture('cards', 'c' + c.deedIdx).setDisplaySize(B.card * z, B.card * z).setPosition(0, kn + B.string * z).setRotation(0);
          c.glow.setPosition(0, kn + B.string * z + B.card * z * 0.5).setScale(B.card * z * 2.1 / 256).setAlpha(0.45);
          this.tweens.add({ targets: c.glow, alpha: 0.7, duration: 700, yoyo: true, repeat: -1 });
          this.tweens.add({ targets: c, cs: { from: -8, to: 8 }, duration: 1300 + Math.random() * 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        } else if (kind === 'star') this.tweens.add({ targets: c.orbit, angle: 360, duration: 3600, repeat: -1 });
        else c.rain.forEach(function (r, i) {
          r.setPosition((i - 1.5) * 18 * U, 40 * U * z).setScale(z * 0.9).setAlpha(0);
          self.tweens.add({ targets: r, y: { from: 40 * U * z, to: 92 * U * z }, alpha: { from: 0.85, to: 0 }, duration: 900, repeat: -1, delay: i * 210 });
        });
        c.body.enable = true; c.body.setSize(8, 8, false); c.body.setOffset(B.w / 2 - 4, B.h / 2 + end - 4);
      }
      c.setPosition(x + Math.sin(c.ph) * amp, y).setDepth(kind === 'b' ? 10 + z : 11);
      c.setActive(true).setVisible(true);
      c.body.reset(c.x, y);
      c.body.setVelocity(Math.cos(c.ph) * amp * c.w, c.vyT);
      c.input.enabled = true;
      this.live.push(c);
    }
    bigSize() { var v = this.view; return Math.min(v.w * 0.6, v.h * 0.5, 820); }
    // back to the pool
    release(c) {
      var i = this.live.indexOf(c); if (i >= 0) this.live.splice(i, 1);
      this.tweens.killTweensOf([c, c.glow, c.orbit].concat(c.rain || []).filter(Boolean));
      c.setActive(false).setVisible(false); c.body.enable = false; c.input.enabled = false; c.popping = false;
      (c.plain ? this.free : this.freeRich).push(c);
    }
    // gone off the top
    left(c) {
      if (!c.active || c.popping || c.fading) return;
      var was = this.state === 'play' && this.def.escape && this.needed(c), x = Phaser.Math.Clamp(c.x, 200, this.view.r - 200);
      this.release(c);
      if (!was) return;
      Kit.snd.play('bye', { vol: 0.7 });
      Bp.fan(this.dots, [0xff8fab, 0xffd1dc], 8, c.x, this.view.t + 60);
      this.floatText(x, this.view.st + 330, 'Bye!', 'bpf-bye');
      this.loseHeart();
    }

    // ---------- popping ----------
    colorOf(c) { return c.kind === 'deed' ? '#f2b33d' : c.kind === 'star' ? '#8fa6ff' : c.kind === 'storm' ? '#8c8fb3' : D.COLORS[c.col].c; }
    pop(c, o) {
      if (!c.active || c.popping) return false;     // a double tap never counts a balloon twice
      o = o || {};
      c.popping = true; c.body.enable = false; c.input.enabled = false; c.body.setVelocity(0, 0);
      if (c.kind === 'storm') { this.stormTapped(c); return true; }
      var self = this, big = c.kind === 'star' || c.kind === 'deed';
      if (!o.quiet) { this.combo = this.time0 - this.lastPopT < 1.4 ? this.combo + 1 : 1; this.lastPopT = this.time0; }
      var step = o.quiet ? o.step || 0 : this.combo - 1, pan = Phaser.Math.Clamp((c.x - this.view.l) / this.view.w * 2 - 1, -1, 1) * 0.5;
      // combos make a pop a little fuller, never higher (no tunes); a pop is soft, and the engine's cap keeps a crowd of them calm
      Kit.snd.play('pop', { vol: (o.quiet ? 0.4 : 0.6 + 0.25 * Math.min(1, step / 12)) * (big ? 1.1 : 1), pan: pan, rate: big ? 0.93 : c.z < 0.9 ? 1.06 : 1 });
      Bp.buzz(8);
      this.tweens.add({ targets: c, scaleX: c.scaleX * 1.2, scaleY: c.scaleY * 0.83, duration: 75, onComplete: function () { self.burst(c); self.release(c); } });
      if (o.quiet) return true;
      if (!this.popped) { this.popped = true; Bp.store.set('popped', true); this.game.events.emit('bp-popped'); }
      var gi = -1;
      this.goals.forEach(function (g, i) {
        if (g.got >= g.n) return;
        if (g.t === 'any' || (g.t === 'deed' && c.kind === 'deed') || (g.t === 'color' && c.kind === 'b' && c.col === g.c)) { g.got++; if (g.t === 'deed' && gi < 0) gi = i; self.game.events.emit('bp-goal', i, g.got, g.t); }
      });
      var cheer = { 5: 'Great!', 8: 'Super!', 12: 'Amazing!', 16: 'MashaAllah!' }[this.combo];
      if (cheer) this.floatText(c.x, c.y - 90, cheer, 'bpf-cheer');
      else if (this.combo > 1) this.floatText(c.x, c.y - 70, 'x' + this.combo, 'bpf-combo');
      if (c.kind === 'deed') {
        var dg = -1; this.goals.forEach(function (g, i) { if (g.t === 'deed' && dg < 0) dg = i; });
        this.showPending++;
        this.game.events.emit('bp-deed', { d: c.deedIdx, x: c.x, y: c.y + (B.h / 2 + B.knot + B.string + B.card / 2) * c.z, s: B.card * c.z, goal: dg, counts: dg >= 0 && gi >= 0 });
      }
      if (c.kind === 'star') {
        Kit.snd.play('sparkle', { vol: 0.6 }); this.cameras.main.shake(180, 0.004);
        // the neighbours pop after it, nearest first (the engine finds them: overlapCirc over the whole view)
        var near = this.physics.overlapCirc(c.x, c.y, Math.hypot(this.view.w, this.view.h), true, false).map(function (b) { return b.gameObject; })
          .filter(function (q) { return q && q.bp && q.active && q !== c && !q.popping && !q.fading && q.kind !== 'storm' && q.y < self.view.b + 10; });
        near.sort(function (p, q) { return Math.hypot(p.x - c.x, p.y - c.y) - Math.hypot(q.x - c.x, q.y - c.y); });
        near.forEach(function (q, i) { self.time.delayedCall(120 + i * 80, function () { if (q.active && !q.popping) self.pop(q, { quiet: true, step: i }); }); });
      }
      return true;
    }
    burst(c) {
      var col = Bp.hex(this.colorOf(c)), x = c.x, y = c.y, z = c.z, W = 0xffffff, sh = function (k) { return Bp.hex(A.shade(c.kind === 'star' ? '#8fa6ff' : this.colorOf(c), k)); }.bind(this);
      if (c.kind === 'storm') {
        Bp.fan(this.puff, [0x8c8fb3, 0xb5b7d6, 0x6d6f96], 12, x, y);
        Bp.fan(this.dots, [0x8fd0ff], 8, x, y + 70);
        return;
      }
      var tints = c.kind === 'star' ? D.CONFETTI.map(Bp.hex) : [col, sh(0.45), sh(-0.2), W, Bp.hex(D.CONFETTI[(c.id * 3) % 7]), Bp.hex(D.CONFETTI[(c.id * 5 + 2) % 7])];
      Bp.fan(this.conf, tints, c.kind === 'star' ? 34 : 18, x, y);
      Bp.fan(this.dots, [col, sh(-0.15)], 6, x, y);
      Bp.fan(this.starE, [0xfff6c8], 3, x, y - 24);
      this.ringAt(x, y, 26 * U * z);
    }
    stormTapped(c) {
      var self = this;
      Kit.snd.play('storm', { vol: 0.8 }); Bp.buzz(30); this.cameras.main.shake(160, 0.004);
      this.combo = 0;
      this.floatText(c.x, c.y - 110, 'Oops!', 'bpf-oops');
      this.tweens.add({ targets: c, scaleX: c.scaleX * 1.2, scaleY: c.scaleY * 0.83, duration: 75, onComplete: function () { self.burst(c); self.release(c); } });
      this.loseHeart();
    }
    loseHeart() {
      if (this.state !== 'play') return;
      this.hearts--; this.heartsLost++;
      Kit.snd.play('heart', { vol: 0.8 });
      this.game.events.emit('bp-hearts', this.hearts, this.def.hearts, true);
      if (this.hearts <= 0) this.fail();
    }

    // ---------- the small effects: emitters made once, a pool of texts and rings ----------
    makeFx() {
      var self = this, v = this.view, mk = function (frame, cfg) { return Bp.sleepy(self.add.particles(0, 0, 'ui', Object.assign({ frame: frame, emitting: false }, cfg)).setDepth(30)); };
      this.conf = mk('shard', { lifespan: 1150, speed: { min: 300, max: 1050 }, gravityY: 900, scale: { start: 0.55, end: 0.25 }, rotate: { start: 0, end: 540 }, alpha: { start: 1, end: 0, ease: 'Quad.easeIn' } });
      this.dots = mk('dot', { lifespan: 480, speed: { min: 120, max: 520 }, gravityY: 1700, scale: { start: 0.42, end: 0 } });
      this.starE = mk('star5', { lifespan: 650, speed: { min: 120, max: 360 }, gravityY: -80, scale: { start: 0.5, end: 0 }, rotate: { start: 0, end: 200 } });
      this.puff = mk('dot', { lifespan: 800, speed: { min: 80, max: 480 }, gravityY: -90, scale: { start: 1.0, end: 1.5 }, alpha: { start: 0.7, end: 0 } });
      this.sparks = mk('spark', { lifespan: 360, speed: { min: 60, max: 330 }, scale: { start: 0.38, end: 0 } });
      this.texts = []; this.rings = [];
      for (var i = 0; i < 5; i++) this.texts.push(this.add.bitmapText(0, 0, 'bpf-cheer', '', 100).setOrigin(0.5).setDepth(40).setVisible(false));
      for (i = 0; i < 6; i++) this.rings.push(this.add.image(0, 0, 'ui', 'ring').setDepth(29).setVisible(false));
      this.ti = 0; this.ri = 0;
      this.hintRing = this.add.image(0, 0, 'ui', 'ring').setDepth(31).setVisible(false);
    }
    // a floating word: one of the bitmap fonts (art.js A.fonts): 'bpf-bye', 'bpf-cheer', 'bpf-combo', 'bpf-oops'
    floatText(x, y, s, font) {
      var t = this.texts[this.ti++ % this.texts.length], v = this.view;
      this.tweens.killTweensOf(t);
      t.setFont(font, A.FONTS[font].size).setText(s).setPosition(Phaser.Math.Clamp(x, v.sl + 200, v.sr - 200), y).setAlpha(1).setScale(0.6).setVisible(true);
      this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.easeOut' });
      this.tweens.add({ targets: t, y: y - 130, alpha: 0, duration: 900, delay: 120, onComplete: function () { t.setVisible(false); } });
    }
    ringAt(x, y, r) {
      var g = this.rings[this.ri++ % this.rings.length]; this.tweens.killTweensOf(g);
      g.setPosition(x, y).setVisible(true).setAlpha(1).setScale(r / 70).setTint(0xffffff);
      this.tweens.add({ targets: g, scale: (r + 50 * U) / 70, alpha: 0, duration: 350, onComplete: function () { g.setVisible(false); } });
    }

    // ---------- the level's end ----------
    clearLevel() {
      var self = this, def = this.def;
      this.state = 'clear';
      var stars = this.heartsLost === 0 ? 3 : this.heartsLost <= (def.hearts > 3 ? 2 : 1) ? 2 : 1;
      if (this.time0 > this.par && stars > 1) stars--;
      this.stars = stars;
      Bp.progress.finish(this.n, stars);
      try { window.KahfBridge && window.KahfBridge.complete(); } catch (e) { /* not in the app */ }
      // every balloon left on screen joins the celebration
      var left = this.live.filter(function (c) { return !c.popping && !c.fading; }).sort(function (a, b) { return a.y - b.y; }), i = 0, v = this.view;
      left.forEach(function (c) {
        if (c.kind === 'storm') { c.fading = true; c.body.enable = false; c.input.enabled = false; self.tweens.add({ targets: c, alpha: 0, y: c.y - 80, duration: 500, onComplete: function () { self.release(c); } }); }
        else if (c.y < v.b + 20) { var k = i++; c.input.enabled = false; self.time.delayedCall(200 + k * 90, function () { if (c.active && !c.popping) self.pop(c, { quiet: true, step: k }); }); }
      });
      this.time.delayedCall(350, function () { Kit.snd.play('win', { vol: 0.8 }); Bp.praise(); });
      for (var f = 0; f < 6; f++) this.time.delayedCall(300 + f * 170, function () {
        var vv = self.view; Bp.fan(self.conf, D.CONFETTI.map(Bp.hex), 22, Phaser.Math.FloatBetween(vv.l + vv.w * 0.15, vv.l + vv.w * 0.85), Phaser.Math.FloatBetween(vv.t + vv.h * 0.12, vv.t + vv.h * 0.55));
      });
      this.time.delayedCall(1700, function () { self.game.events.emit('bp-clear', { n: self.n, stars: stars, last: self.n === COUNT, endOfWorld: self.n % D.perWorld === 0 }); });
    }
    fail() {
      var self = this;
      this.state = 'fail'; this.combo = 0;
      Kit.snd.play('lose', { vol: 0.8 }); Bp.buzz(40);
      this.time.delayedCall(900, function () { self.game.events.emit('bp-fail', { n: self.n }); });
    }

    // ---------- every frame ----------
    update(time, dms) {
      if (!this.built) return;
      var dt = Math.min(dms, 50) / 1000, v = this.view, i, c;
      this.clock += dt;
      // the slow moment while a deed card is shown
      var want = this.slow ? 0.3 : 1; this.ts += (want - this.ts) * Math.min(1, dt * 6);
      // the scenery drifts a little with where the child touched last
      this.parX += (this.parT - this.parX) * Math.min(1, dt * 1.5);
      var par = (this.parX - 0.5) * 2 + Math.sin(this.clock * 0.15) * 0.25, b = this.bg;
      if (b.back) { b.back.x = b.back.bx - par * 12; b.mid.x = b.mid.bx - par * 42; b.near.x = b.near.bx - par * 67; }
      if (this.state === 'play') {
        this.time0 += dt;
        this.spawnT -= dt * this.ts;
        if (this.spawnT <= 0) this.spawnT = this.spawn() ? this.def.every / this.wf * Phaser.Math.FloatBetween(0.8, 1.2) : 0.3;
      }
      var ts = this.ts, lead = null;
      for (i = this.live.length - 1; i >= 0; i--) {
        c = this.live[i]; if (!c.active || c.popping || c.fading) continue;
        var body = c.body;
        // sway: the velocity follows a sine path around x0, and a spring back to it if something nudged the balloon
        c.ph += c.w * dt * ts;
        var tx = c.x0 + Math.sin(c.ph) * c.amp;
        body.velocity.x = Math.cos(c.ph) * c.amp * c.w * ts + (tx - c.x) * 4;
        body.velocity.y += (c.vyT * ts - body.velocity.y) * Math.min(1, dt * 6);
        var lean = Phaser.Math.Clamp(body.velocity.x * 0.004 / U, -0.2, 0.2);
        c.rotation = lean + (c.plain ? Math.sin(this.clock * 2 + c.ph) * 0.035 : 0);        // the balloon leans into its sway and wobbles a little
        if (c.card) c.card.rotation = -lean + c.cs * 0.01745;                                 // a card keeps hanging
        if (this.hintStorm && c.kind === 'storm' && this.state === 'play' && c.y < v.t + v.h * 0.75) { this.hintStorm = false; Bp.store.set('stormHint', true); this.game.events.emit('bp-stormhint'); }
        if (!lead && c.kind !== 'storm' && c.y < v.b - 260 && c.y > v.t + 340) lead = c;
      }
      // the first taps: a ring pulses on a balloon until the child has popped one
      var hr = this.hintRing;
      if (!this.popped && this.state === 'play' && lead) { if (!hr.visible) { hr.setVisible(true); this.tweens.add({ targets: hr, scale: { from: 1.3, to: 2.4 }, alpha: { from: 0.95, to: 0 }, duration: 1100, repeat: -1 }); } hr.setPosition(lead.x, lead.y); }
      else if (hr.visible) { this.tweens.killTweensOf(hr); hr.setVisible(false); }
      if (this.state === 'play' && this.goalsDone() && !this.showPending) this.clearLevel();
    }

    // ---------- a test hook: ?debug ----------
    hook() {
      var self = this;
      window.BPT = {
        scene: this,
        get: function () { return { state: self.state, level: self.n, hearts: self.hearts, heartsLost: self.heartsLost, time: +self.time0.toFixed(2), par: self.par, stars: self.stars, combo: self.combo, live: self.live.length, view: { w: Math.round(self.view.w), h: Math.round(self.view.h), z: +self.view.z.toFixed(3) }, goals: self.goals.map(function (g) { return { t: g.t, c: g.c, n: g.n, got: g.got }; }), showPending: self.showPending }; },
        balloons: function () { return self.live.filter(function (c) { return !c.popping; }).map(function (c) { return { kind: c.kind, col: c.col, x: Math.round(c.x), y: Math.round(c.y), needed: self.needed(c), deed: c.deedIdx, vy: Math.round(c.body.velocity.y) }; }); },
        toScreen: function (x, y) { var cam = self.cameras.main, r = self.game.canvas.getBoundingClientRect(), z = cam.zoom, s = self.game.scale.displayScale; return { x: r.left + (x - cam.worldView.x) * z / s.x, y: r.top + (y - cam.worldView.y) * z / s.y }; },
        popAll: function () { self.live.slice().forEach(function (c) { if (c.kind !== 'storm') self.pop(c); }); },
        popKind: function (k) { var c = self.live.filter(function (q) { return q.kind === k && !q.popping; })[0]; if (c) self.pop(c); return !!c; },
        spawn: function (kind) { var d = self.def, o = d.storm, s = d.star, dd = d.deed; if (kind === 'storm') { d.storm = 1; d.stormMax = 3; self.time0 = Math.max(self.time0, 3); } if (kind === 'star') { d.star = 1; self.time0 = Math.max(self.time0, 4); } if (kind === 'deed') { d.deed = 1; } self.spawnT = 0; var ok = self.spawn(); d.storm = o; d.star = s; d.deed = dd; return ok; },
        win: function () { self.goals.forEach(function (g) { g.got = g.n; }); self.showPending = 0; }
      };
    }
  }
  window.BpPlay = Play;
})();
