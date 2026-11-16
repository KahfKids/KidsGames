/* Spider IK: the interface (scene 'Hud', above the cave, in the 1920 x 1080 design space of Kit.play.fit).
   Laid out by the game-ui-ux skill. While playing, the screen is the cave: one pause button in the top-left corner and,
   on levels with orbs, the orbs still to find beside it (they are also shown in the world, circling the exit portal:
   cave.js). Everything else lives on a stack of screens over the paused game: the pause screen (resume, restart,
   level map, sound, the way out), the level map, the story cards. The stick appears under the thumb; the jump button is
   a faint ring. All Phaser: images painted once, Zones for the touch halves, tweens for every fade and pulse.
   Input is actions, not keys (input-systems): `in` = { ax, ay (move, radial deadzone, length <= 1), jump (a press),
   restart } in the registry, filled from the stick, the jump button and the keys, read by the Cave scene. */
(function () {
  'use strict';
  var LEVELS = 21, CHAPTERS = [[1, 5], [6, 10], [11, 15], [16, 20], [21, 21]], CHAP_CARD = { 1: 'c1', 6: 'c2', 11: 'c3', 16: 'c4', 21: 'c5' };
  var DEAD = 0.15, GAP = 36, REST = 0.5;                                          // REST: touch controls at rest (still 3:1 on their dark plates)                                                      // the space between buttons, in design units
  var seen = {};                                                                   // story cards seen this visit

  class Hud extends Phaser.Scene {
    constructor() { super({ key: 'Hud' }); }
    create() {
      var self = this, inp = this.inp = this.registry.get('in');
      this.touch = this.sys.game.device.input.touch;
      this.stick = { id: -1, x: 0, y: 0, ax: 0, ay: 0 };
      this.blocked = 0;                                                           // menu or story card open

      // touch halves: left drags the stick, right jumps (Zones, under the buttons: the engine gives the top one the touch)
      this.zl = this.add.zone(0, 0, 10, 10).setOrigin(0).setInteractive();
      this.zr = this.add.zone(0, 0, 10, 10).setOrigin(0).setInteractive();
      // on-screen controls for thumbs, always shown on a touch screen (input-systems: a virtual stick and buttons,
      // through the same actions). The stick rests at its home and floats to wherever the thumb lands; the jump
      // button sits bottom-right. Hidden while the player uses a keyboard, back at the first touch.
      this.joy = this.add.image(0, 0, 'ui-joy');
      this.knob = this.add.image(0, 0, 'ui-knob');
      this.jb = this.add.image(0, 0, 'ui-jump').setAlpha(REST);
      this.jbi = this.add.image(0, 0, 'ic-up').setScale(1.3).setAlpha(REST);
      this.device = this.touch ? 'touch' : 'keys';
      this.input.on('pointerdown', function (p) { if (p.wasTouch) self.setDevice('touch'); });
      this.input.keyboard.on('keydown', function () { self.setDevice('keys'); });
      this.zl.on('pointerdown', function (p) {
        if (self.stick.id >= 0 || self.blocked) return;
        self.stick.id = p.id; self.stick.x = p.worldX; self.stick.y = p.worldY; self.used('moved');
        self.joy.setPosition(p.worldX, p.worldY).setAlpha(1); self.knob.setPosition(p.worldX, p.worldY).setAlpha(1); self.move(p);
      });
      this.input.on('pointermove', function (p) { if (p.id === self.stick.id) self.move(p); });
      var up = function (p) { if (p.id === self.stick.id) self.rest(); };
      this.input.on('pointerup', up); this.input.on('pointerupoutside', up);
      this.zr.on('pointerdown', function () {
        if (self.blocked) return; inp.jump = 1; self.used('jumped');
        self.tweens.killTweensOf([self.jb, self.jbi]); self.jb.setScale(0.86).setAlpha(1); self.jbi.setScale(1.1).setAlpha(1); self.tweens.add({ targets: self.jb, scale: 1, alpha: REST, duration: 260 }); self.tweens.add({ targets: self.jbi, scale: 1.3, alpha: REST, duration: 260 });
      });

      // while playing: one pause button (full contrast: game-ui-ux asks 3:1 for key visuals, so it never fades)
      this.bPause = this.button('ic-pause', function () { self.openPause(); });
      this.orbs = [];

      // keys -> the same actions
      var K = this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,R,ESC,M');
      K.SPACE.on('down', function () { if (!self.blocked) { inp.jump = 1; self.used('jumped'); } });
      [K.W, K.A, K.S, K.D, K.UP, K.DOWN, K.LEFT, K.RIGHT].forEach(function (k) { k.on('down', function () { if (!self.blocked) self.used('moved'); }); });
      K.R.on('down', function () { if (!self.blocked) inp.restart = 1; });
      K.M.on('down', function () { Kit.snd.setMuted(!Kit.snd.muted); if (self.pause) self.pause.snd(); });
      K.ESC.on('down', function () { if (self.menu) { if (self.menu.canClose) self.backFromMenu(); } else if (self.pause) self.closePause(); else if (!self.blocked) self.openPause(); });

      // the game's events
      var ev = this.game.events, on = function (k, f) { ev.on(k, f, self); self.events.once('shutdown', function () { ev.off(k, f, self); }); };
      on('sp-start', this.levelStart);
      on('sp-col', this.orbsShow);
      on('sp-won', this.levelWon);

      Kit.play.fit(this, function (v) { self.layout(v); });
      this.loading = this.add.image(960, 500, 'ui-orb').setScale(1.4).setVisible(false);
      this.loadingT = this.add.text(960, 600, 'Loading…', { fontFamily: 'system-ui, sans-serif', fontSize: '44px', fontStyle: '600', color: '#f2f7f6' }).setOrigin(0.5).setVisible(false);
      this.tweens.add({ targets: this.loading, scale: 1.8, alpha: 0.5, duration: 600, yoyo: true, repeat: -1 });
      on('sp-loaderror', this.loadFailed);
      this.busyT = 0;
      var lv = this.registry.get('lv'); if (lv) this.levelStart(lv.n, lv.req);      // the cave may have started first
    }

    // a round button: a dark plate (readable on any cave) and its icon; it answers the touch at once
    button(icon, fn, plate) {
      var self = this, c = this.add.container(0, 0, [this.add.image(0, 0, plate || 'ui-plate'), this.add.image(0, 0, icon)]);
      c.icon = c.list[1]; c.setSize(150, 150).setInteractive();
      c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: 0.9, duration: 70, yoyo: true }); });
      c.on('pointerup', fn); return c;
    }
    layout(v) {
      this.v = v;
      // anchored to the safe area's top-left corner: the pause button, then the orbs still to find, one GAP apart
      this.bPause.setPosition(v.sl + 40 + 75, v.st + 40 + 75);
      this.zl.setPosition(v.l, v.t).setSize(v.w * 0.55, v.h); this.zl.input.hitArea.setSize(v.w * 0.55, v.h);
      this.zr.setPosition(v.l + v.w * 0.55, v.t).setSize(v.w * 0.45, v.h); this.zr.input.hitArea.setSize(v.w * 0.45, v.h);
      this.restAt = { x: v.sl + 230, y: v.sb - 230 };
      this.jb.setPosition(v.sr - 190, v.sb - 190); this.jbi.setPosition(v.sr - 190, v.sb - 190);
      if (this.stick.id < 0) { this.joy.setPosition(this.restAt.x, this.restAt.y); this.knob.setPosition(this.restAt.x, this.restAt.y); }
      this.showControls();
      this.orbsPlace();
      if (this.menu) this.menuLayout();
      if (this.pause) this.pauseLayout();
      if (this.card) this.cardLayout();
      if (this.hints) this.hintsPlace();
    }

    // the stick: a radial deadzone, then rescaled so it starts from zero at its edge (input-systems)
    move(p) {
      var s = this.stick, dx = p.worldX - s.x, dy = p.worldY - s.y, R = 146, l = Math.hypot(dx, dy);
      if (l > R) { dx *= R / l; dy *= R / l; l = R; }
      this.knob.setPosition(s.x + dx, s.y + dy);
      var m = l / R; if (m < DEAD) { s.ax = s.ay = 0; return; }
      var k = (m - DEAD) / (1 - DEAD) / m; s.ax = dx / R * k; s.ay = dy / R * k;
    }
    rest() {
      var s = this.stick; s.id = -1; s.ax = s.ay = 0;
      if (this.restAt) { this.joy.setPosition(this.restAt.x, this.restAt.y).setAlpha(REST); this.knob.setPosition(this.restAt.x, this.restAt.y).setAlpha(REST); }
    }
    // the last device used decides which controls and prompts show (input-systems: hot-swap, no restart)
    setDevice(d) { if (d === this.device) return; this.device = d; this.showControls(); if (this.hints) this.hintsMake(); if (this.pause) this.pauseLayout(); }
    showControls() { var t = this.device === 'touch'; [this.joy, this.knob, this.jb, this.jbi].forEach(function (o) { o.setVisible(t); }); if (t && this.stick.id < 0) { this.joy.setAlpha(REST); this.knob.setAlpha(REST); } }
    used(k) { this[k] = true; if (this.hints) this.hintsPlace(); }

    update(time, dms) {
      var K = this.keys, inp = this.inp;
      var kx = (K.D.isDown || K.RIGHT.isDown ? 1 : 0) - (K.A.isDown || K.LEFT.isDown ? 1 : 0), ky = (K.S.isDown || K.DOWN.isDown ? 1 : 0) - (K.W.isDown || K.UP.isDown ? 1 : 0);
      var ax = kx + this.stick.ax, ay = ky + this.stick.ay, l = Math.hypot(ax, ay); if (l > 1) { ax /= l; ay /= l; }
      inp.ax = this.blocked ? 0 : ax; inp.ay = this.blocked ? 0 : ay;
      // a level still loading: a soft pulse after 300 ms (never a frozen screen)
      var cv = this.scene.get('Cave'), busy = cv && cv.sys.isActive() === false && cv.load && cv.load.isLoading();
      this.busyT = busy ? this.busyT + dms : 0; this.loading.setVisible(this.busyT > 300 && !this.failed); this.loadingT.setVisible(this.busyT > 300 && !this.failed);
    }

    // a level that could not load (no connection on a first visit): say so, and offer to try again
    loadFailed(n) {
      if (this.failed) return;
      var self = this, f = this.failed = [];
      f.push(this.add.text(960, 470, 'Could not load this level. Check your connection.', { fontFamily: 'system-ui, sans-serif', fontSize: '44px', fontStyle: '600', color: '#f2f7f6', align: 'center', wordWrap: { width: 1200 } }).setOrigin(0.5));
      var b = this.add.container(960, 620, [this.add.image(0, 0, 'ui-pill').setTint(0x8fe0bd), this.add.text(0, 0, 'Try again', { fontFamily: 'system-ui, sans-serif', fontSize: '48px', fontStyle: '800', color: '#0c1b1e' }).setOrigin(0.5)]).setSize(340, 150).setInteractive();
      b.on('pointerup', function () { Kit.snd.play('tap'); f.forEach(function (o) { o.destroy(); }); self.failed = null; self.go(n, true); });
      f.push(b);
    }

    /* ---- level start: number, orbs, first-level hints, story cards ---- */
    levelStart(n, req) {
      this.n = n; this.orbsShow(0, req);
      this.blockedHints(n === 1);
      var self = this, cards = [];
      if (n === 1 && !seen.intro) { seen.intro = 1; cards.push({ k: 'intro', size: 66, zoom: true, hold: 1700 }); }
      if (CHAP_CARD[n] && !seen[n]) { seen[n] = 1; cards.push({ k: CHAP_CARD[n], size: 80, ring: true }); }
      if (cards.length) this.story(cards, function () { self.announceLevel(n); }); else this.announceLevel(n);
    }
    // the level, said once large in the middle as the cave fades in, then gone (the small label keeps it)
    announceLevel(n) {
      if (this.announce) this.announce.destroy();
      var an = this.announce = this.add.text(960, 470, 'Level ' + n, { fontFamily: 'system-ui, sans-serif', fontSize: '96px', fontStyle: '800', color: '#f2f7f6' }).setOrigin(0.5).setAlpha(0);
      an.setShadow(0, 4, 'rgba(0,0,0,.5)', 18);
      this.tweens.chain({ targets: an, tweens: [{ alpha: 0.9, y: 450, duration: 450, ease: 'Sine.easeOut', delay: 350 }, { alpha: 0, duration: 700, delay: 1100, onComplete: function () { an.destroy(); } }] });
    }
    orbsShow(c, req) {
      var self = this;
      if (req !== undefined && this.orbs.length !== req) {
        this.orbs.forEach(function (o) { o.destroy(); }); if (this.orbBack) this.orbBack.destroy();
        this.orbBack = req ? this.add.image(0, 0, 'ui-pill') : null;
        this.orbs = []; for (var i = 0; i < req; i++) this.orbs.push(this.add.image(0, 0, 'ui-orb0'));
        this.orbsPlace();
      }
      this.orbs.forEach(function (o, i) {
        var lit = i < c; if (o.texture.key === (lit ? 'ui-orb' : 'ui-orb0')) return;
        o.setTexture(lit ? 'ui-orb' : 'ui-orb0'); if (lit) { o.setScale(1.6); self.tweens.add({ targets: o, scale: 1, duration: 260, ease: 'Back.easeOut' }); }
      });
    }
    orbsPlace() {
      var v = this.v, n = this.orbs.length; if (!v || !n) return;
      var step = 84, w = (n - 1) * step + 64 + 2 * 46, y = this.bPause.y, cx = this.bPause.x + 75 + GAP + w / 2;
      this.orbBack.setPosition(cx, y).setScale(w / 340, 1);
      this.orbs.forEach(function (o, i) { o.setPosition(cx + (i - (n - 1) / 2) * step, y); });
    }

    // the first level teaches the controls (level-design: open with a teach beat), in the words and pictures of the
    // device in use, until each control has been used once
    blockedHints(on) { this.hintsOn = on; this.hintsMake(); }
    hintsMake() {
      if (this.hints) { this.hints.forEach(function (h) { h.destroy(); }); this.hints = null; }
      if (!this.hintsOn || (this.moved && this.jumped)) return;
      var tip = { fontFamily: 'system-ui, sans-serif', fontSize: '42px', fontStyle: '700', color: '#f2f7f6', backgroundColor: 'rgba(8,18,20,0.78)', padding: { x: 30, y: 16 } };
      if (this.device === 'touch') {
        var g = this.add.image(0, 0, 'ui-knob').setAlpha(0.9), r = this.add.image(0, 0, 'ui-ring');
        var tl = this.add.text(0, 0, 'Drag here to crawl', tip).setOrigin(0, 1), tr = this.add.text(0, 0, 'Tap here to jump', tip).setOrigin(1, 1);
        this.hints = [g, r, tl, tr];
        this.tweens.add({ targets: [tl, tr], y: '-=10', duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.tweens.add({ targets: r, scale: { from: 1.6, to: 2.2 }, alpha: { from: 0.9, to: 0 }, duration: 1100, repeat: -1 });
      } else {
        var k = this.add.text(0, 0, '', tip).setOrigin(0.5, 1);
        this.hints = [k];
      }
      this.hintsPlace();
    }
    hintsPlace() {
      if (!this.hints || !this.restAt || !this.v) return;
      if (this.moved && this.jumped) { this.hints.forEach(function (h) { h.destroy(); }); this.hints = null; return; }
      if (this.device !== 'touch') {
        var t = !this.moved && !this.jumped ? 'Arrow keys or WASD to crawl  ·  Space to jump' : !this.moved ? 'Arrow keys or WASD to crawl' : 'Space to jump';
        this.hints[0].setText(t).setPosition(960, this.v.sb - 60); return;
      }
      var g = this.hints[0], r = this.hints[1];
      this.tweens.killTweensOf(g); g.setPosition(this.restAt.x - 70, this.restAt.y);
      if (!this.moved) this.tweens.add({ targets: g, x: this.restAt.x + 70, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      g.setVisible(!this.moved); r.setPosition(this.jb.x, this.jb.y).setVisible(!this.jumped);
      this.hints[2].setPosition(this.restAt.x - 150, this.restAt.y - 180).setVisible(!this.moved);
      this.hints[3].setPosition(this.jb.x + 120, this.jb.y - 150).setVisible(!this.jumped);
    }

    /* ---- story cards: white silhouettes over the cave; the game waits under them ---- */
    story(list, after) {
      var self = this; this.block(1);
      Kit.snd.amb('amb-cave', { vol: 0.5 });
      var next = function () {
        var c = list.shift();
        if (!c) { self.block(-1); Kit.snd.amb('amb-cave', { vol: 0.9 }); if (after) after(); return; }
        self.showCard(c, next);
      };
      next();
    }
    showCard(c, done) {
      var self = this, k = 'card-' + c.k;
      var dim = this.add.image(960, 540, 'sp', 'px').setTint(0x000000).setAlpha(0).setInteractive();
      var img = this.add.image(0, 0, k).setTint(0xffffff).setTintMode(Phaser.TintModes.FILL).setAlpha(0);
      var ring = c.ring ? this.add.image(0, 0, 'card-ring').setTint(0xffffff).setTintMode(Phaser.TintModes.FILL).setAlpha(0) : null;
      this.card = { c: c, dim: dim, img: img, ring: ring, z: 1 }; this.cardLayout();
      Kit.snd.play('page');
      this.tweens.add({ targets: dim, alpha: 0.6, duration: 800 });
      this.tweens.add({ targets: img, alpha: 1, duration: 1600 });
      if (c.zoom) this.tweens.add({ targets: this.card, z: 1.2, duration: 5000, onUpdate: function () { self.cardLayout(); } });
      var close = function () {
        dim.disableInteractive();
        self.tweens.add({ targets: [img, ring, dim].filter(Boolean), alpha: 0, duration: c.ring ? 1600 : 1600, onComplete: function () { [img, ring, dim].forEach(function (o) { if (o) o.destroy(); }); self.card = null; self.time.delayedCall(c.ring ? 0 : 500, done); } });
      };
      if (ring) {
        this.tweens.add({ targets: ring, alpha: 1, duration: 1600, delay: 1000 });
        this.tweens.add({ targets: this.card, rs: { from: 0.92, to: 1.08 }, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', onUpdate: function () { self.cardLayout(); } });
        this.time.delayedCall(1600, function () { dim.once('pointerdown', function () { Kit.snd.play('tap'); self.tweens.killTweensOf(self.card); close(); }); });
      } else this.time.delayedCall(1600 + (c.hold || 0), close);
    }
    cardLayout() {
      var C = this.card, v = this.v; if (!C || !v) return;
      var u = Math.min(v.w / 480, v.h / 360), f = C.c.size / 100 * C.z, a = SpArt.D.CARDS[C.c.k], t = this.textures.get('card-' + C.c.k).getSourceImage();
      C.dim.setPosition(v.l + v.w / 2, v.t + v.h / 2).setDisplaySize(v.w + 4, v.h + 4);
      C.img.setOrigin(a.rx / a.w, a.ry / a.h).setPosition(960, 540 - (C.c.ring ? 20 : 0) * u).setScale(f * u * a.w / t.width);
      if (C.ring) { var r = SpArt.D.CARDS.ring, rt = this.textures.get('card-ring').getSourceImage(); C.ring.setPosition(960, 540 + 90 * u).setScale(r.w * 0.6 * u / rt.width * (C.rs || 1)); }
    }
    block(d) {
      this.blocked = Math.max(0, this.blocked + d);
      // (scene changes are queued to the next step, so ask for the state wanted rather than test the state now)
      if (this.blocked) { this.rest(); if (this.scene.get('Cave').sys.settings.status >= Phaser.Scenes.RUNNING) this.scene.pause('Cave'); }
      else this.scene.resume('Cave');
    }

    /* ---- level done: save, credit, fade, next (or the ending) ---- */
    levelWon(n) {
      SpSave.done(n);
      try { window.KahfBridge && window.KahfBridge.complete(); } catch (e) { /* not in the app */ }
      var self = this, cave = this.scene.get('Cave');
      if (n < LEVELS) { cave.cameras.main.fadeOut(450, 0, 0, 0); cave.cameras.main.once('camerafadeoutcomplete', function () { self.go(n + 1); }); return; }
      this.block(1);
      Kit.snd.amb('amb-cave', { vol: 0.5 });
      this.showCard({ k: 'c6', size: 80, ring: true }, function () {
        self.showCard({ k: 'end', size: 80, hold: 3500 }, function () {
          cave.cameras.main.fadeOut(2500, 0, 0, 0);
          Kit.snd.amb(null, { fade: 2.5 });
          self.time.delayedCall(2500, function () { self.block(-1); self.openMenu(true); });
        });
      });
    }
    go(n) {
      if (n > SpSave.prog.max) return;
      if (this.failed) { this.failed.forEach(function (o) { o.destroy(); }); this.failed = null; }
      SpSave.prog.cur = n; SpSave.persist();
      this.closeMenu(true);
      this.scene.stop('Cave'); this.scene.launch('Cave', { n: n }); this.scene.bringToTop();     // (launch: start would stop this scene)
    }

    /* ---- the level map: title, a play button, and every level by chapter ---- */
    openMenu(won, fromPause) {
      if (this.menu) return;
      var self = this, P = SpSave.prog, m = this.menu = { won: !!won, items: [], fromPause: !!fromPause };
      this.block(1);
      var put = function (o) { m.items.push(o); return o; };
      m.dim = put(this.add.image(0, 0, 'sp', 'px').setTint(0x040a0c).setAlpha(0.75).setInteractive());
      m.card = put(this.add.image(960, 540, 'ui-card'));
      var running = this.scene.get('Cave').sys.settings.status !== Phaser.Scenes.SHUTDOWN && !won;
      m.canClose = running;
      var plate = function (icon, x, y, fn) {
        var c = self.add.container(x, y, [self.add.image(0, 0, 'ui-plate'), self.add.image(0, 0, icon)]).setSize(150, 150).setInteractive();
        c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: 0.9, duration: 70, yoyo: true }); }); c.on('pointerup', fn); return put(c);
      };
      // the card's own layout (design units, card 210..1710 x 20..1060): header row, then play on the left, levels on the right
      plate('ic-exit', 315, 120, function () { Kit.play.exit(); });
      if (running) plate('ic-close', 1605, 120, function () { self.backFromMenu(); });
      var tx = function (s, x, y, size, w, o) { return put(self.add.text(x, y, s, Object.assign({ fontFamily: 'system-ui, sans-serif', fontSize: size + 'px', fontStyle: w, color: '#f2f7f6' }, o || {})).setOrigin(0.5)); };
      tx('Spider IK', 960, 110, 72, '800');
      tx(won ? 'You finished all 21 levels! Play any level again.' : 'Crawl through 21 caves. Collect the orbs and reach the portal.', 960, 190, 32, '500').setAlpha(0.8);
      var fresh = P.max === 1 && P.cur === 1 && !P.won;
      tx(running && this.n === P.cur ? 'Resume · Level ' + this.n : fresh ? 'Play' : (P.won && P.cur === 1) ? 'Play again' : 'Continue · Level ' + P.cur, 450, 800, 40, '800');
      var big = put(this.add.container(450, 610, [this.add.image(0, 0, 'ui-big'), this.add.image(16, 0, 'ic-play').setScale(1.9).setTint(0x0c1b1e)]).setSize(280, 280).setInteractive());
      this.tweens.add({ targets: big, scale: 1.05, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      big.on('pointerdown', function () { Kit.snd.play('tap'); });
      big.on('pointerup', function () { if (running && self.n === P.cur) self.closeMenu(); else self.go(P.won && P.cur === 1 && won ? 1 : P.cur); });
      CHAPTERS.forEach(function (ch, ci) {
        var th = SpArt.themes[ci], dark = Phaser.Display.Color.HexStringToColor(th[1]).color, light = Phaser.Display.Color.HexStringToColor(th[0]).color;
        put(self.add.text(805, 330 + ci * 150, ch[0] === LEVELS ? 'Finale' : 'Chapter ' + (ci + 1), { fontFamily: 'system-ui, sans-serif', fontSize: '30px', fontStyle: '700', color: th[0] }).setOrigin(1, 0.5));
        for (var n = ch[0]; n <= ch[1]; n++) {
          var x = 905 + (n - ch[0]) * 165, y = 330 + ci * 150, locked = n > P.max, done = n < P.max || (n === LEVELS && P.won);
          var kids = [self.add.image(0, 0, 'ui-lv').setTint(dark).setAlpha(locked ? 0.15 : 0.55), self.add.image(0, 0, 'ui-lvo').setTint(light).setAlpha(locked ? 0.38 : 1)];
          if (locked) kids.push(self.add.image(0, 0, 'ic-lock').setScale(0.8).setAlpha(0.6));
          else kids.push(self.add.text(0, 0, String(n), { fontFamily: 'system-ui, sans-serif', fontSize: '60px', fontStyle: '800', color: '#f2f7f6' }).setOrigin(0.5));
          if (done && !locked) kids.push(self.add.image(42, 42, 'ic-tick').setScale(0.42).setTint(light));
          var cell = put(self.add.container(x, y, kids).setSize(140, 140));
          if (n === P.cur && !locked) { var ring = self.add.image(0, 0, 'ui-lvo').setTint(light).setScale(1.14); cell.add(ring); self.tweens.add({ targets: ring, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 }); }
          if (!locked) (function (lv, c) { c.setInteractive(); c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: 0.92, duration: 70, yoyo: true }); }); c.on('pointerup', function () { self.go(lv); }); })(n, cell);
        }
      });
      this.menuLayout();
    }
    // closing the map: back to the pause screen it was opened from (the stack pops), or straight back to the game
    backFromMenu() { if (this.menu && this.menu.fromPause) { this.closeMenu(true); this.openPause(); } else this.closeMenu(); }
    menuLayout() { var v = this.v, m = this.menu; if (!m || !v) return; m.dim.setPosition(v.l + v.w / 2, v.t + v.h / 2).setDisplaySize(v.w + 4, v.h + 4); }
    closeMenu(quiet) {
      if (!this.menu) return;
      this.menu.items.forEach(function (o) { o.destroy(); }); this.menu = null;
      if (quiet) { this.blocked = Math.max(0, this.blocked - 1); return; }
      this.block(-1);
    }
  }

  /* ---- the pause screen: pushed over the paused game (game-ui-ux screen stack) ---- */
  Hud.prototype.openPause = function () {
    if (this.pause || this.menu) return;
    var self = this, p = this.pause = { items: [] }, put = function (o) { p.items.push(o); return o; };
    this.block(1);
    p.dim = put(this.add.image(0, 0, 'sp', 'px').setTint(0x040a0c).setAlpha(0.72).setInteractive());
    var th = SpArt.theme(this.n || 1), ch = SpArt.chap(this.n || 1);
    p.title = put(this.add.text(0, 0, 'Level ' + this.n + ' / ' + LEVELS, { fontFamily: 'system-ui, sans-serif', fontSize: '76px', fontStyle: '800', color: '#f2f7f6' }).setOrigin(0.5));
    p.sub = put(this.add.text(0, 0, ch === 4 ? 'Finale' : 'Chapter ' + (ch + 1), { fontFamily: 'system-ui, sans-serif', fontSize: '38px', fontStyle: '700', color: th[0] }).setOrigin(0.5));
    p.exit = put(this.button('ic-exit', function () { Kit.play.exit(); }));
    // four big choices with their words under them; the first (resume) is the one the eye lands on
    var big = function (icon, label, fn, main) {
      var c = put(self.add.container(0, 0, [self.add.image(0, 0, main ? 'ui-big' : 'ui-plate').setScale(main ? 0.82 : 1.53), self.add.image(main ? 10 : 0, 0, icon).setScale(1.4).setTint(main ? 0x0c1b1e : 0xffffff)]).setSize(230, 230).setInteractive());
      c.label = put(self.add.text(0, 0, label, { fontFamily: 'system-ui, sans-serif', fontSize: '40px', fontStyle: '700', color: '#f2f7f6' }).setOrigin(0.5, 0));
      c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: 0.92, duration: 70, yoyo: true }); }); c.on('pointerup', fn);
      return c;
    };
    p.row = [
      big('ic-play', 'Resume', function () { self.closePause(); }, true),
      big('ic-retry', 'Restart', function () { self.closePause(); self.inp.restart = 1; }),
      big('ic-grid', 'Levels', function () { self.openMenu(false, true); self.closePause(true); }),
      big(Kit.snd.muted ? 'ic-mute' : 'ic-snd', Kit.snd.muted ? 'Sound off' : 'Sound on', function () { Kit.snd.setMuted(!Kit.snd.muted); p.snd(); })
    ];
    p.how = put(this.add.text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: '34px', fontStyle: '600', color: '#f2f7f6', align: 'center' }).setOrigin(0.5).setAlpha(0.85));
    p.snd = function () { var m = Kit.snd.muted, b = p.row[3]; b.list[1].setTexture(m ? 'ic-mute' : 'ic-snd'); b.label.setText(m ? 'Sound off' : 'Sound on'); };
    p.items.forEach(function (o) { o.setAlpha(0); }); this.tweens.add({ targets: p.items, alpha: function (t) { return t === p.dim ? 0.72 : 1; }, duration: 160 });
    this.pauseLayout();
  };
  Hud.prototype.pauseLayout = function () {
    var p = this.pause, v = this.v; if (!p || !v) return;
    p.dim.setPosition(v.l + v.w / 2, v.t + v.h / 2).setDisplaySize(v.w + 4, v.h + 4);
    p.exit.setPosition(v.sl + 40 + 75, v.st + 40 + 75);                              // where the pause button was
    var cy = v.t + v.h / 2, gap = 90, w = 230, n = p.row.length, x0 = 960 - ((n - 1) * (w + gap)) / 2;
    p.title.setPosition(960, cy - 250); p.sub.setPosition(960, cy - 175);
    p.row.forEach(function (c, i) { c.setPosition(x0 + i * (w + gap), cy + 40); c.label.setPosition(c.x, cy + 40 + w / 2 + 24); });
    p.how.setText(this.device === 'touch' ? 'Drag on the left to crawl  ·  Tap on the right to jump' : 'Arrows or WASD crawl  ·  Space jumps  ·  R restarts  ·  Esc pauses  ·  M sound')
      .setPosition(960, Math.min(v.sb - 50, cy + 40 + w / 2 + 130));
  };
  Hud.prototype.closePause = function (quiet) {
    var p = this.pause; if (!p) return; this.pause = null;
    p.items.forEach(function (o) { o.destroy(); });
    if (quiet) this.blocked = Math.max(0, this.blocked - 1); else this.block(-1);
  };

  window.SpHud = Hud;
})();
