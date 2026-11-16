/* Follow the Light: the world and the rules (scene 'Play', restarted for every level with { n, free }).
   Watch the lanterns light up, then tap them in the same order. Each round adds one light; reach the level's length to
   win. A wrong tap costs one of 3 hearts and the lights play again (never an instant game over). 30 levels, 3 worlds.
   Everything the engine can do, the engine does (docs/phaser-standard.md section 1):
   - A lantern is a Container hanging from its rope; it swings with a tween (Elastic ease: a damped pendulum), squashes
     with a tween, glows with tweens on its light level; the glow is one soft picture per lantern, tinted and added to
     the screen (ADD blend), shown only while the lantern is lit. (The engine's PointLight was tried: twelve of them cost
     the most of every frame while lights were on, and burned to white. The glow image looks the same for a fraction.)
   - The picture is batched: one atlas for the lanterns, one image for each chain, and every background piece an Image
     (no Shapes, no TileSprites but the stars), so a frame is a handful of draw calls.
   - The sequence plays as a chain of the scene clock's timers (this.time), the same timers that count as "busy" for
     Kit.play's rest mode, so the loop never sleeps in the middle of a playback; between the child's taps nothing moves
     and the loop sleeps (rest: true): no idle sway, no twinkling, no drifting motes.
   - Taps are Zones over each lantern's cell (the engine's input), keys are the engine's keyboard, sparkles, dust and
     confetti are particle emitters, the small shake on a wrong tap is the camera's.
   Kept as game code because the engine has none: the rule of the game (which light comes next, hearts, stars, what a
   round and a level are) and "nothing happened for 9 seconds, show the lights again" (a browser timer, on purpose:
   an engine timer pending all the time the child thinks would keep the loop awake for nothing; it wakes the loop
   itself, Kit.play.wake). The interface (hearts, progress stars, pause screen, level map, results) is hud.js. */
(function () {
  'use strict';
  var A = LFArt, LV = LIGHT_LEVELS, F = Ftl;
  var CHEERS = ['Great!', 'Super!', 'Well done!', 'MashaAllah!', 'Yes!', 'Bright!'];
  var GOLD = 0xffd36b, IDLE_MS = 9000;
  var hexOf = function (c) { return parseInt(c.slice(1), 16); };

  class Play extends Phaser.Scene {
    constructor() { super({ key: 'Play' }); }
    init(d) { this.n = d.n || 1; this.free = !!d.free; }

    create() {
      var self = this, n = this.n, lv = this.lv = LV.list[n - 1], wi = this.wi = lv.world, W = A.WORLDS[wi];
      this.seq = []; this.pos = 0; this.hearts = 3; this.mistakes = 0; this.lastTap = { i: -1, t: -9 }; this.lan = [];
      this.focus = 0; this.state = 'boot'; this.taught = F.store.get('taught', false); this.said = false; this.idleT = 0;
      F.progress.setCurrent(n);
      var wk = this.wk = A.world(this, wi);                     // this world's sheet: frames 'sky', 'land', 'pillar', 'plant'
      this.cameras.main.setBackgroundColor(W.sky[0]);

      // ---- the courtyard: sky, stars, moon, the far land, the floor below it, pillars, plants, a vignette ----
      var add = this.add;
      this.sky = add.image(0, 0, wk, 'sky').setOrigin(0).setDepth(0);
      this.stars = add.tileSprite(0, 0, 10, 10, 'stars').setOrigin(0).setDepth(1).setAlpha(0.85);
      this.moon = add.image(0, 0, 'moon').setScale(2).setDepth(2);
      this.floor = add.image(0, 0, 'px').setOrigin(0).setDepth(2).setTint(hexOf(W.floor[1]));
      this.land = add.image(0, 0, wk, 'land').setOrigin(0).setScale(1 / A.LS).setDepth(3);
      this.pil = [];                                              // the pillars: images stacked to the height of the screen (made by layout)
      this.fillL = add.image(0, 0, 'px').setOrigin(0).setDepth(40).setTint(hexOf(W.near));
      this.fillR = add.image(0, 0, 'px').setOrigin(0).setDepth(40).setTint(hexOf(W.near));
      this.plantL = add.image(0, 0, wk, 'plant').setOrigin(0.5, 0.98).setDepth(12);
      this.plantR = add.image(0, 0, wk, 'plant').setOrigin(0.5, 0.98).setDepth(12).setFlipX(true).setScale(0.85);
      this.vig = add.image(0, 0, 'vig').setOrigin(0).setDepth(60);
      this.ropes = [];                                            // made by layout, one per row of lanterns

      this.makeLanterns(this.free ? 6 : lv.lanterns);
      this.makeFx();

      // ---- keys: the numbers pick a light; the arrows move a ring over the lights and Space or Enter taps it ----
      var K = this.keys = this.input.keyboard.addKeys('ONE,TWO,THREE,FOUR,FIVE,SIX,LEFT,RIGHT,UP,DOWN,SPACE,ENTER');
      ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'].forEach(function (k, i) { K[k].on('down', function () { if (i < self.lan.length) { self.focus = i; self.tap(i); self.showFocus(); } }); });
      K.LEFT.on('down', function () { self.moveFocus(-1, 0); }); K.RIGHT.on('down', function () { self.moveFocus(1, 0); });
      K.UP.on('down', function () { self.moveFocus(0, -1); }); K.DOWN.on('down', function () { self.moveFocus(0, 1); });
      K.SPACE.on('down', function () { self.tap(self.focus); }); K.ENTER.on('down', function () { self.tap(self.focus); });
      this.focusRing = add.image(0, 0, 'focus').setDepth(35).setVisible(false);
      var ev = this.game.events, on = function (k, f) { ev.on(k, f, self); self.events.once('shutdown', function () { ev.off(k, f, self); }); };
      on('ftl-device', this.showFocus);
      this.events.once('shutdown', function () { clearTimeout(self.idleT); });

      Kit.play.fit(this, function (v) { self.layout(v); }, { w: 1280 });          // the core area is 1280 wide: an upright phone zooms in

      this.registry.set('lv', { n: n, free: this.free, target: lv.target, world: wi });
      Kit.snd.amb('amb-' + wi, { fade: 2 });                        // the place's own air, barely there (the lights' own sounds are what the child follows)
      ev.emit('ftl-level', { n: n, free: this.free, target: lv.target, world: wi, hearts: 3 });
      if (this.free) { this.state = 'free'; }
      else {
        for (var k = 0; k < lv.start; k++) this.seq.push(this.nextLight());
        this.state = 'intro'; this.later(1500, this.startWatch);
        this.sound_('whoosh');
      }
      this.later(250, function () { [this.spark, this.dots, this.puff, this.confetti].forEach(function (e) { e.explode(1, -9000, -9000); }); });   // (the first burst compiles and uploads: do it unseen)
      this.showFocus();
      if (Kit.load) Kit.load.done();                              // the first view is ready: take the loading picture away
      if (Kit.play.debug) this.debugHook();
    }

    sound_(name, o) { Kit.snd.play(name, o); }
    later(ms, fn) { return this.time.delayedCall(ms, fn, [], this); }

    // ---------- lanterns ----------
    makeLanterns(count) {
      var self = this;
      for (var i = 0; i < count; i++) (function (i) {
        var def = A.LANTERNS[i], col = hexOf(def.c), cell = A.cell;
        var L = { i: i, ci: i, s: { light: 0 }, dm: { dim: 0 }, base: 0.04, x: 0, py: 0, chain: 0, u: 200, col: col };
        L.root = self.add.container(0, 0).setDepth(20);
        L.link = self.add.image(0, 0, 'chain').setOrigin(0.5, 0);
        L.core = self.add.container(0, 0);
        L.d = self.add.image(0, 0, 'ftl-lan', 'd' + i).setOrigin(cell.ox, cell.oy);
        L.l = self.add.image(0, 0, 'ftl-lan', 'l' + i).setOrigin(A.litCell.ox, A.litCell.oy).setAlpha(0);
        L.dim = self.add.image(0, 0, 'dot').setTint(0x1a1030).setVisible(false);
        L.core.add([L.d, L.l, L.dim]); L.root.add([L.link, L.core]);
        L.glow = self.add.image(0, 0, 'glow').setTint(col).setBlendMode(Phaser.BlendModes.ADD).setDepth(21).setVisible(false);
        L.zone = self.add.zone(0, 0, 100, 100).setInteractive().setDepth(25);
        L.zone.on('pointerdown', function (p) { F.setMode('pointer'); self.focus = i; self.tap(i, p.worldX); });
        L.badge = null;                                          // the key's number under the lantern: made the first time keys are used
        self.lan.push(L);
      })(i);
    }
    // where the glass is, for glows and sparks (the swing moves it a little)
    centre(L) { var d = L.chain + A.BODY_Y * L.u, a = L.root.rotation; return { x: L.x - Math.sin(a) * d, y: L.py + Math.cos(a) * d }; }
    apply(L) {
      var v = Math.min(1, L.s.light * (1 - L.dm.dim)), on = v > 0.02;
      L.l.setVisible(on).setAlpha(v); L.dim.setVisible(L.dm.dim > 0.02).setAlpha(L.dm.dim * 0.5);
      L.glow.setVisible(on);
      if (on) { var c = this.centre(L); L.glow.setPosition(c.x, c.y).setAlpha(v); }
    }
    glow(L, to, ms, hold) {
      var self = this; this.tweens.killTweensOf(L.s);
      var up = { targets: L.s, light: to, duration: ms, ease: 'Sine.easeOut', onUpdate: function () { self.apply(L); } };
      if (hold == null) { this.tweens.add(up); return; }
      this.tweens.chain({ targets: L.s, tweens: [up, { light: L.base, delay: hold, duration: 340, ease: 'Sine.easeIn', onUpdate: function () { self.apply(L); } }] });
    }
    swing(L, fromX, strength) {
      var dir = fromX == null ? (Math.random() < 0.5 ? -1 : 1) : (fromX < L.x ? 1 : -1), self = this;
      var amp = Math.min(0.3, 0.17 * (strength || 1.5));
      this.tweens.killTweensOf(L.root);
      L.root.rotation = Phaser.Math.Clamp(L.root.rotation + dir * amp, -0.34, 0.34);
      this.tweens.add({ targets: L.root, rotation: 0, duration: 2000, ease: 'Elastic.easeOut', easeParams: [1, 0.55], onUpdate: function () { if (L.s.light > 0.02) self.apply(L); } });
      this.tweens.killTweensOf(L.core);
      L.core.setScale(1.07, 0.92); this.tweens.add({ targets: L.core, scaleX: 1, scaleY: 1, duration: 320, ease: 'Back.easeOut' });
    }
    sparkle(L, big) {
      var c = this.centre(L), em = this.spark;
      em.setParticleTint(L.col); em.explode(big ? 16 : 9, c.x, c.y); this.dots.explode(big ? 6 : 3, c.x, c.y + L.u * 0.5);
    }

    // ---------- particles ----------
    makeFx() {
      var add = this.add;
      this.spark = add.particles(0, 0, 'star8', { lifespan: { min: 600, max: 1000 }, speed: { min: 120, max: 340 }, scale: { start: 0.5, end: 0 }, alpha: { start: 1, end: 0 },
        rotate: { min: 0, max: 360 }, gravityY: -40, tint: 0xffffff, blendMode: 'ADD', emitting: false }).setDepth(30);   // one emitter for every colour: tinted at each burst
      this.dots = add.particles(0, 0, 'dot', { lifespan: { min: 500, max: 800 }, speed: { min: 60, max: 150 }, scale: { start: 0.5, end: 0 }, alpha: { start: 0.8, end: 0 }, gravityY: 160,
        tint: 0xffe2a0, blendMode: 'ADD', emitting: false }).setDepth(30);
      this.puff = add.particles(0, 0, 'dot', { lifespan: { min: 400, max: 650 }, speed: { min: 40, max: 120 }, scale: { start: 0.6, end: 0.1 }, alpha: { start: 0.7, end: 0 }, gravityY: 120,
        tint: 0xc8bee6, emitting: false }).setDepth(30);
      this.confetti = add.particles(0, 0, 'star8', { lifespan: { min: 1100, max: 1800 }, speed: { min: 220, max: 640 }, angle: { min: 200, max: 340 }, scale: { start: 0.55, end: 0.1 }, alpha: { start: 1, end: 0 },
        rotate: { min: 0, max: 360 }, gravityY: 700, tint: [0xffd36b, 0xffb85a, 0xfff3c4, 0xffffff, 0xff9fb0], emitting: false }).setDepth(31);
    }

    // ---------- layout: the courtyard fills the screen, the lanterns take the biggest grid that fits ----------
    layout(v) {
      v.u = 48 * v.pt / 150;                                             // the interface's size in this scene too (48-point buttons: hud.js)
      this.v = v;
      var hy = v.t + v.h * 0.648, dy = hy - A.HOR, W = A.WORLDS[this.wi], bot = A.LY + dy + A.LHH;
      this.sky.setPosition(v.l - 8, v.t - 8).setDisplaySize(v.w + 16, hy - v.t + 10);
      this.stars.setPosition(v.l - 8, v.t - 8).setSize(v.w + 16, hy - v.t).setTileScale(512 / 192, 512 / 192);
      this.moon.setPosition(v.sr - 210, v.st + 215 * v.u);
      this.land.setPosition(A.LX, A.LY + dy);
      this.floor.setPosition(A.LX - 400, bot - 3).setDisplaySize(A.LW + 800, Math.max(10, v.b - bot + 40));
      // pillars at the sides of the safe area (and dark to the screen's edge), plants at their feet
      this.pil.forEach(function (o) { o.destroy(); }); this.pil = [];
      for (var y = v.t - 6, k = 0; y < v.b + 6; y += 238, k++) {
        this.pil.push(this.add.image(v.sl - 36, y, this.wk, 'pillar').setOrigin(0).setDepth(40));
        this.pil.push(this.add.image(v.sr - 84, y, this.wk, 'pillar').setOrigin(0).setDepth(40).setFlipX(true));
      }
      this.fillL.setPosition(v.l - 600, v.t - 6).setDisplaySize(600 + v.sl - 36 - v.l + 0.5, v.h + 12);
      this.fillR.setPosition(v.sr + 36, v.t - 6).setDisplaySize(600 + v.r - v.sr, v.h + 12);
      this.plantL.setPosition(v.sl + 190, v.sb - 30); this.plantR.setPosition(v.sr - 160, v.sb - 30);
      this.vig.setPosition(v.l - 6, v.t - 6).setDisplaySize(v.w + 12, v.h + 12);
      this.layoutLanterns(v);
    }
    layoutLanterns(v) {
      var lan = this.lan, n = lan.length, self = this;
      var u0 = v.u, port = v.h > v.w, side = port ? 50 : 140, left = v.sl + side, right = v.sr - side, top = v.st + 170 * u0 + 30, bottom = v.sb - 120 * u0 - 20, rw = right - left, rh = bottom - top;
      var opts = n === 6 ? [[2, 3], [3, 2], [6, 1]] : [[2, 2], [4, 1], [1, 4]], best = null;
      opts.forEach(function (o) {
        var cw = rw / o[0], ch = rh / o[1], u = Math.min(cw * 0.78, ch / (A.LH + 0.2));   // (as big as the old game's lanterns)
        var score = u * (!port && o[0] > o[1] ? 1.3 : 1);                    // (a screen on its side keeps them in a row, as the old game)
        if (!best || score > best.score) best = { cols: o[0], rows: o[1], u: u, cw: cw, ch: ch, score: score };
      });
      // (a lantern unit is 230 points at most: the old game's limit)
      var u = Phaser.Math.Clamp(Math.min(best.u, 230 * v.pt), 60, port ? 420 : 340), rowH = Math.min(best.ch, u * (A.LH + 0.5));
      var blockTop = top + (rh - rowH * best.rows) * 0.35;
      this.ropes.forEach(function (r) { r.a.destroy(); r.b.destroy(); }); this.ropes = [];
      for (var r = 0; r < best.rows; r++) {
        var cellTop = blockTop + r * rowH, ringTop = cellTop + (rowH - A.LH * u) * 0.62, edgeY = Infinity, xs = [];
        for (var c = 0; c < best.cols; c++) { var x = left + best.cw * (c + 0.5); xs.push(x); edgeY = Math.min(edgeY, ringTop - u * 0.2 - A.ropeY(x)); }
        this.ropes.push({ a: this.add.image(A.LX, edgeY - 20, 'rope').setOrigin(0).setScale(1 / A.LS).setDepth(10),
          b: this.add.image(A.LX, edgeY - 20, 'ropeg').setOrigin(0).setScale(2 / A.LS).setDepth(11).setBlendMode(Phaser.BlendModes.ADD).setAlpha(this.ropeGlow || 0) });
        for (var c2 = 0; c2 < best.cols; c2++) {
          var L = lan[r * best.cols + c2]; if (!L) continue;
          L.x = xs[c2]; L.py = edgeY + A.ropeY(L.x); L.u = u; L.chain = ringTop - L.py;
          L.root.setPosition(L.x, L.py);
          var sc = Math.max(20, u * 0.11) / 32;
          L.link.setScale(sc).setCrop(0, 0, 32, Math.min(320, L.chain / sc));
          L.core.setPosition(0, L.chain + A.BODY_Y * u);
          var s = u / A.LU;
          L.d.setPosition(0, -A.BODY_Y * u).setScale(s); L.l.setPosition(0, -A.BODY_Y * u).setScale(s);
          L.dim.setPosition(0, 0).setDisplaySize(u * 1.0, u * 1.1);
          L.glow.setDisplaySize(u * 5.2, u * 5.2);
          L.zone.setPosition(left + best.cw * (c2 + 0.5), cellTop + rowH / 2).setSize(best.cw, rowH + 40);
          if (L.zone.input) L.zone.input.hitArea.setSize(best.cw, rowH + 40);
          L.by = ringTop + A.LH * u * 0.8; if (L.badge) L.badge.setPosition(L.x, L.by);
          L.cell = { r: r, c: c2 };
          this.apply(L);
        }
      }
      this.grid = { cols: best.cols, rows: best.rows };
      this.showFocus();
    }

    // ---------- the keys' ring (shown while keys are the device in use) ----------
    moveFocus(dx, dy) {
      F.setMode('keys');
      var g = this.grid, L = this.lan[this.focus], c = L.cell.c + dx, r = L.cell.r + dy, i;
      if (c < 0) c = g.cols - 1; if (c >= g.cols) c = 0; if (r < 0) r = g.rows - 1; if (r >= g.rows) r = 0;
      i = r * g.cols + c; if (i < this.lan.length) this.focus = i;
      this.showFocus();
    }
    showFocus() {
      var keys = F.dev.mode === 'keys', L = this.lan[this.focus], self = this;
      this.lan.forEach(function (l, i) {
        if (keys && !l.badge) { l.badge = self.add.container(0, 0, [self.add.image(0, 0, 'badge'), F.text(self, 0, 1, String(i + 1), 48, '#ffffff')]).setDepth(30).setPosition(l.x, l.by); }
        if (l.badge) l.badge.setVisible(keys);
      });
      if (!this.focusRing) return;
      this.focusRing.setVisible(keys && !!L);
      if (keys && L) this.focusRing.setPosition(L.x, L.py + L.chain + A.BODY_Y * L.u).setDisplaySize(L.u * 1.35, L.u * 1.35);
    }

    // ---------- rounds ----------
    nextLight() {
      var lv = this.lv, seq = this.seq, a = seq[seq.length - 1], b = seq[seq.length - 2], c, tries = 0;
      do { c = Phaser.Math.Between(0, lv.lanterns - 1); tries++; }
      while (tries < 50 && ((!lv.repeats && c === a) || (c === a && c === b)));
      return c;
    }
    // play the sequence: a chain of timers, each light on for at least 0.42 s with a clear dark gap between them
    startWatch() {
      var self = this, tm = LV.timing(this.lv, this.seq.length), t = 600;
      clearTimeout(this.idleT); this.state = 'watch'; this.pos = 0; this.game.events.emit('ftl-watch');
      this.game.events.emit('ftl-beads', { seq: this.seq.length, done: 0, lit: -1 });
      this.seq.forEach(function (ci, i) {
        self.later(t, function () { var L = self.lan[ci]; self.sound_('l' + ci); self.glow(L, 1, 60); self.swing(L, null, 0.6); self.game.events.emit('ftl-beads', { seq: self.seq.length, done: 0, lit: i, ci: ci }); });
        self.later(t + tm.on * 1000, function () { self.glow(self.lan[ci], self.lan[ci].base, 260); });
        t += (tm.on + tm.gap) * 1000;
      });
      // hand over as soon as the last light starts to fade
      this.later(t - tm.gap * 1000, this.toInput);
    }
    toInput() {
      this.state = 'input'; this.pos = 0;
      this.lan.forEach(function (L) { L.base = 0.1; });
      this.lan.forEach(function (L) { this.glow(L, 0.1, 300); }, this);
      this.game.events.emit('ftl-turn', { first: !this.said });
      if (!this.said && !(this.n === 1 && !this.taught)) { this.said = true; this.say('Your turn!', '#fff3c4'); }
      this.arm();
    }
    // nothing for a while: show the lights again, free (no heart lost). A browser timer that wakes the loop itself.
    arm() {
      var self = this; clearTimeout(this.idleT);
      this.idleT = setTimeout(function () {
        if (self.state !== 'input' || !self.sys.isActive()) { if (self.sys.isPaused()) self.arm(); return; }
        Kit.play.wake(); self.say('Watch again', '#fff3c4'); self.startWatch();
      }, IDLE_MS);
    }
    say(text, color) { this.game.events.emit('ftl-say', { text: text, color: color }); }

    tap(i, fromX) {
      var L = this.lan[i]; if (!L) return;
      var st = this.state;
      if (st === 'free') { this.glow(L, 1, 50, 360); this.swing(L, fromX, 1.4); this.sound_('l' + L.ci); this.sparkle(L); return; }
      // taps while the lights play (or between rounds) don't count: only a small nudge
      if (st !== 'input') { if (st !== 'clear' && st !== 'fail') { this.swing(L, fromX, 0.5); this.sound_('nudge'); } return; }
      var want = this.seq[this.pos], now = this.time.now;
      // a quick second tap on the lantern just tapped (a bounce or a double tap) is ignored
      if (i !== want && this.lastTap.i === i && now - this.lastTap.t < 300) return;
      this.lastTap.i = i; this.lastTap.t = now;
      Kit.bridge.answer();
      this.glow(L, 1, 50, 340); this.swing(L, fromX, 1.5); this.sound_('l' + L.ci); Kit.buzz(8);
      if (i === want) {
        this.sparkle(L);
        this.game.events.emit('ftl-beads', { seq: this.seq.length, done: this.pos + 1, lit: this.pos, ci: L.ci, pop: true });
        this.pos++; this.arm();
        if (!this.taught) { this.taught = true; F.store.set('taught', true); this.game.events.emit('ftl-turn', { first: false }); }
        if (this.pos >= this.seq.length) this.roundDone();
      } else this.wrong(L);
    }

    wrong(L) {
      var self = this; this.hearts--; this.mistakes++; clearTimeout(this.idleT);
      this.tweens.killTweensOf(L.dm); L.dm.dim = 1; this.glow(L, L.base, 10);
      this.tweens.add({ targets: L.dm, dim: 0, duration: 700, onUpdate: function () { self.apply(L); } });
      this.sound_('oops'); this.cameras.main.shake(180, 0.004); Kit.buzz(30);
      var c = this.centre(L); this.puff.explode(8, c.x, c.y);
      this.game.events.emit('ftl-hearts', this.hearts);
      if (this.hearts <= 0) {
        this.state = 'fail';
        this.later(900, function () { self.sound_('lose'); self.game.events.emit('ftl-end', { win: false }); });
        return;
      }
      this.say('Watch again!', '#ffd1dc');
      this.state = 'oops'; this.later(1250, this.startWatch);
    }

    roundDone() {
      var self = this, lv = this.lv;
      if (this.seq.length >= lv.target) { this.clearLevel(); return; }
      this.state = 'cheer'; clearTimeout(this.idleT);
      this.lan.forEach(function (L, k) { self.later(120 + k * 160, function () { self.glow(L, 1, 60, 60); self.swing(L, null, 0.7); }); });
      this.sound_('cheer'); this.ropeShine(1, 700);
      this.game.events.emit('ftl-beads', { seq: this.seq.length, done: this.seq.length, lit: -1, all: true });
      this.say(CHEERS[Phaser.Math.Between(0, CHEERS.length - 1)], '#fff6c2');
      this.seq.push(this.nextLight());
      this.later(1250, this.startWatch);
    }

    clearLevel() {
      var self = this, mistakes = this.mistakes, stars = mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1, lv = this.n;
      this.state = 'clear'; clearTimeout(this.idleT);
      F.progress.finish(lv, stars); Kit.bridge.complete();
      this.sound_('win'); this.ropeShine(1, 900);
      this.lan.forEach(function (L, k) {
        self.later(k * 170, function () { self.glow(L, 1, 60, 80); self.swing(L, null, 1.2); self.sparkle(L, true); self.sound_('l' + L.ci, { vol: 0.5 }); });
      });
      for (var i = 0; i < 5; i++) this.later(500 + i * 180, function () {
        var v = self.v; self.confetti.explode(22, Phaser.Math.Between(v.sl + 300, v.sr - 300), Phaser.Math.Between(v.st + 500, v.sb - 300));
      });
      this.game.events.emit('ftl-beads', { seq: this.seq.length, done: this.seq.length, lit: -1, all: true, win: true });
      this.later(1800, function () {
        self.game.events.emit('ftl-end', { win: true, stars: stars, len: self.seq.length, last: lv === F.COUNT, endOfWorld: lv % 10 === 0, world: self.wi });
      });
    }
    // the string lamps glow brighter for a moment (a round done, the level won)
    ropeShine(to, ms) {
      var self = this; this.ropeGlow = 0;
      this.tweens.addCounter({ from: 0, to: 1, duration: ms, yoyo: true, hold: 300, onUpdate: function (t) { var a = t.getValue(); self.ropeGlow = a; self.ropes.forEach(function (r) { r.b.setAlpha(a); }); } });
    }

    // test hook (?debug): jump to states, read the state
    debugHook() {
      var self = this;
      window.FTL = {
        mem: function () { var t = 0, o = {}; self.textures.list && Object.keys(self.textures.list).forEach(function (k) { var im = self.textures.get(k).getSourceImage(); if (im && im.width && k.indexOf('__') !== 0) { var b = im.width * im.height * 4; t += b; if (b > 200000) o[k] = Math.round(b / 1e5) / 10; } }); return { totalMB: Math.round(t / 1e5) / 10, big: o }; },
        scene: this, get: function () { return { state: self.state, n: self.n, free: self.free, seq: self.seq.slice(), pos: self.pos, hearts: self.hearts, mistakes: self.mistakes, grid: self.grid, u: Math.round(self.lan[0].u), lanterns: self.lan.length, mode: F.dev.mode }; },
        spots: function () { return self.lan.map(function (L) { var c = self.centre(L), cam = self.cameras.main; return { x: (c.x - cam.worldView.x) * cam.zoom / (self.scale.width / innerWidth), y: (c.y - cam.worldView.y) * cam.zoom / (self.scale.width / innerWidth) }; }); },
        tap: function (i) { self.tap(i); },
        answer: function () { return self.seq.slice(); },
        win: function () { self.hearts = 3; self.seq = []; while (self.seq.length < self.lv.target) self.seq.push(0); self.state = 'input'; self.pos = self.seq.length - 1; self.tap(0); },
        lose: function () { self.state = 'input'; self.hearts = 1; self.seq = [0]; self.pos = 0; self.tap(1); }
      };
    }
  }
  window.FtlPlay = Play;
})();
