/* Tower Blocks: hud.js, scene 'Hud': the interface, above the tower, in the 1920 x 1080 design space of Kit.play.fit
   (game-ui-ux skill; Spider IK's hud.js is the model).
   While playing, the screen is the tower: one pause button in the top-left corner and only the progress the player needs
   beside it (blocks stacked / the goal, the hearts left, in Free Build the best); the goal also stands in the world as a
   ring on the tower's way up (tower.js). The only control is "tap anywhere (or Space) to drop": a full-screen Zone under
   the buttons, so there is no on-screen button to hide; the first round says so, in the words of the device last used,
   until a block has been dropped. Everything else is a stack of screens over the paused game: the pause screen (resume,
   restart, levels, sound, the way out), the level map, and the end-of-round sheets (next, replay, levels). Floating words
   ("Perfect!") are placed here from the tower's world points.
   Sizes: everything is laid out in design units and scaled by `u` so a button is at least about 52 CSS pixels (a phone
   held upright shows the design space small). All Phaser: images from the 'ui' atlas, Zones, Containers, tweens. Nothing
   runs per frame. */
(function () {
  'use strict';
  var A = window.TBArt, LV = window.TOWER_LEVELS, K = window.Kit;
  var FONT = 'system-ui, sans-serif', GAP = 36, INK = '#f6f2ff', GOLD = 0xffd36b, DIM = 0x0b0830;
  var PERWORLD = LV.perWorld;

  class Hud extends Phaser.Scene {
    constructor() { super({ key: 'Hud' }); }

    create() {
      var self = this, ev = this.game.events;
      this.touch = this.sys.game.device.input.touch; this.device = this.touch ? 'touch' : 'keys';
      this.blocked = 0; this.screens = []; this.tw = null; this.u = 1; this.hints = null;
      var on = function (k, f) { ev.on(k, f, self); self.events.once('shutdown', function () { ev.off(k, f, self); }); };

      // the whole screen drops the block (under every button: the engine gives the top one the touch)
      this.zone = this.add.zone(0, 0, 10, 10).setOrigin(0).setInteractive().setDepth(-1);
      this.zone.on('pointerdown', function (p) { if (p.wasTouch) self.setDevice('touch'); else self.setDevice('keys'); if (!self.blocked && self.tw) self.tw.drop(); });
      this.input.keyboard.on('keydown', function () { self.setDevice('keys'); });

      // while playing: one pause button, then the progress (blocks, best, hearts), one gap apart
      this.tl = this.add.container(0, 0).setDepth(10);
      this.bPause = this.button('ic-pause', function () { self.openPause(); });
      this.pB = this.pill('cube'); this.pBest = this.pill('star', GOLD); this.pH = this.add.container(0, 0);
      this.pHbg = this.add.image(0, 0, 'ui', 'pill').setScale(0.82, 1);
      this.hearts = [0, 1, 2].map(function (i) { return self.add.image((i - 1) * 76, 0, 'ui', 'heart').setScale(0.8).setTint(0xff7d95); });
      this.pH.add([this.pHbg].concat(this.hearts));
      this.tl.add([this.bPause, this.pB, this.pBest, this.pH]);

      // keys
      var KK = this.keys = this.input.keyboard.addKeys('SPACE,ENTER,DOWN,ESC,P,R,M');
      var drop = function () { if (!self.blocked && self.tw) self.tw.drop(); };
      KK.SPACE.on('down', drop); KK.ENTER.on('down', drop); KK.DOWN.on('down', drop);
      KK.ESC.on('down', function () { self.esc(); }); KK.P.on('down', function () { self.esc(); });
      KK.R.on('down', function () { if (!self.blocked && self.tw && (self.tw.state === 'play')) self.restart(); });
      KK.M.on('down', function () { K.snd.setMuted(!K.snd.muted); if (self.snd) self.snd(); });

      on('tb-start', this.onStart); on('tb-hud', this.refresh); on('tb-heart', this.refreshHearts); on('tb-drop', this.dropped);
      on('tb-text', this.floatText); on('tb-end', this.onEnd); on('tb-gone', function () { self.tw = null; });
      // the page hides: pause (a screen over the game), the way the old page did
      document.addEventListener('visibilitychange', this.vis = function () { if (document.hidden && self.tw && self.tw.state === 'play' && !self.blocked && !self.tw.dbg) self.openPause(); });
      this.events.once('shutdown', function () { document.removeEventListener('visibilitychange', self.vis); });

      K.play.fit(this, function (v) { self.layout(v); });
      // the floating words: one Text per look (colour, size, outline), made ahead and kept, so saying a word is at most one redraw
      this.words = {};
      [['#fff6c2', 42, 'rgba(60,20,80,.65)', 'Perfect \u00d7 9'], ['#fff6c2', 36, 'rgba(60,20,80,.65)', 'Perfect!'], ['#ff8fa3', 38, 'rgba(60,10,30,.6)', '+1 \u2665'],
        ['#e8fff4', 32, 'rgba(20,40,60,.55)', 'Good!'], ['#c9ffe0', 30, 'rgba(10,50,40,.6)', 'Bigger!'], ['#ffd1dc', 42, 'rgba(60,10,30,.6)', 'Oops!'],
        ['#ffe7a6', 46, 'rgba(60,30,10,.6)', 'New best!'], ['#fff6c2', 54, 'rgba(60,20,80,.6)', '100 blocks!']].forEach(function (k) { self.wordFor({ color: k[0], size: k[1], stroke: k[2] }, k[3]).setAlpha(0.01).setVisible(true); self.time.delayedCall(400, function () { self.wordBack(self.wordFor({ color: k[0], size: k[1], stroke: k[2] }, k[3], true)); }); });
      // an end-of-round sheet is built once, unseen, while the loading picture is up, so the first real one costs no more than the rest
      this.time.delayedCall(300, function () {
        var s = self.sheet({ warm: true, title: 'Tower complete!', text: '12 blocks \u00b7 12 perfect', buttons: [1, 2, 3].map(function (i) { return { label: 'Next Level', icon: 'ic-next', primary: i === 1, fn: function () {} }; }), how: function () { return 'Tap anywhere to drop the block'; } });
        self.screens.pop(); self.tweens.killTweensOf(s.root); s.root.list.forEach(function (c) { self.tweens.killTweensOf(c); }); s.root.destroy(); s.dim.destroy(); s.extra.forEach(function (o) { o.destroy(); });
      });
      var t = this.scene.get('Tower'); if (t && t.al && t.layers) this.onStart(t);
    }

    // a round button: a dark plate (readable on any sky) and its icon; it answers the touch at once
    button(icon, fn, plate) {
      var self = this, c = this.add.container(0, 0, [this.add.image(0, 0, 'ui', plate || 'plate'), this.add.image(0, 0, 'ui', icon)]);
      c.icon = c.list[1]; c.setSize(150, 150).setInteractive();
      c.on('pointerdown', function () { K.snd.play('tap'); self.tweens.add({ targets: c, scale: c.base * 0.9, duration: 70, yoyo: true }); });
      c.on('pointerup', fn); c.base = 1; return c;
    }
    // a progress pill: a small picture and a number
    pill(icon, tint) {
      var bg = this.add.image(0, 0, 'ui', 'pill'), ic = this.add.image(-70, 0, 'ui', icon).setScale(0.78), t = this.add.text(18, 0, '', { fontFamily: FONT, fontSize: '64px', fontStyle: '800', color: INK }).setOrigin(0.5);
      if (tint) ic.setTint(tint);
      var c = this.add.container(0, 0, [bg, ic, t]); c.bg = bg; c.ic = ic; c.t = t; c.pw = 340; return c;
    }
    pillSet(p, s) { p.t.setText(s); var w = Math.max(250, p.t.width + 190); p.bg.setScale(w / 340, 1); p.ic.x = -w / 2 + 70; p.t.x = -w / 2 + 70 + 40 + (w - 70 - 40 - 40) / 2; p.pw = w; this.tlPlace(); }

    layout(v) {
      this.v = v;
      var dpr = this.scale.width / window.innerWidth, cssPerUnit = v.z / dpr;
      this.cssPerUnit = cssPerUnit; this.c2d = 1 / cssPerUnit;
      this.u = 48 * v.pt / 150;                                              // Tower Blocks' own size: a 150-unit button is 48 screen points on every screen
      this.zone.setPosition(v.l, v.t).setSize(v.w, v.h); this.zone.input.hitArea.setSize(v.w, v.h);
      this.tlPlace();
      this.screens.forEach(function (s) { s.layout(); });
      if (this.hints) this.hintsPlace();
      if (this.banner) this.bannerPlace();
    }
    // the corner group: the pause button, the progress pills, anchored to the safe area
    tlPlace() {
      var v = this.v; if (!v) return;
      var items = [this.bPause, this.pB, this.pBest, this.pH], w = [150, this.pB.pw, this.pBest.pw, 290], x = 0, i, vis = items.map(function (o) { return o.visible; });
      var total = 0; for (i = 0; i < 4; i++) if (vis[i]) total += w[i] + GAP; total -= GAP;
      var u = Math.min(this.u, (v.sr - v.sl - 60) / Math.max(1, total));
      this.tl.setScale(u).setPosition(v.sl + 34 * u, v.st + 34 * u);
      for (i = 0; i < 4; i++) if (vis[i]) { items[i].setPosition(x + w[i] / 2, 75); x += w[i] + GAP; }
      this.pHbg.setScale(290 / 340, 1);
      this.tlU = u;
    }
    refreshHearts() { var t = this.tw; if (!t) return; var self = this; this.hearts.forEach(function (h, i) { var on = i < t.hearts; h.setTint(on ? 0xff7d95 : 0x6a6290).setAlpha(on ? 1 : 0.7); }); }
    refresh() {
      var t = this.tw; if (!t) return;
      var h = t.height(), free = t.mode === 'free';
      this.pillSet(this.pB, free ? '' + h : h + '/' + t.cfg.goal);
      this.pBest.setVisible(free); if (free) this.pillSet(this.pBest, '' + Math.max(t.best, h));
      this.refreshHearts();
      var bump = this.pB; this.tweens.killTweensOf(bump); bump.setScale(1.0); this.tweens.add({ targets: bump, scale: 1.12, duration: 90, yoyo: true });
    }

    setDevice(d) { if (d === this.device) return; this.device = d; if (this.hints) this.hintsMake(); this.screens.forEach(function (s) { if (s.how) s.how(); }); }
    esc() {
      var top = this.screens[this.screens.length - 1];
      if (top) { if (top.back) top.back(); }
      else if (this.tw && this.tw.state === 'play') this.openPause();
    }

    // ---------- a round starts: the banner, the first-round hint ----------
    onStart(t) {
      this.tw = t; this.closeAll(true);
      this.refresh(); this.refreshHearts();
      this.bannerMake();
      this.hintsOn = !t.dropped; this.hintsMake();
    }
    dropped() { if (this.hints) { this.hintsOn = false; this.hintsMake(); } }

    bannerMake() {
      if (this.banner) this.banner.forEach(function (o) { o.destroy(); });
      var t = this.tw, free = t.mode === 'free', self = this;
      var top1 = free ? 'BUILD AS HIGH AS YOU CAN' : LV.worlds[t.world].name.toUpperCase(), mid1 = free ? 'Free Build' : 'Level ' + t.level;
      var bot1 = free ? (t.best ? 'Best: ' + t.best + ' blocks' : 'Stack the tallest tower!') : 'Stack ' + t.cfg.goal + ' blocks';
      var st = function (size, weight, color) { return { fontFamily: FONT, fontSize: size + 'px', fontStyle: weight, color: color, stroke: 'rgba(10,6,30,.6)', strokeThickness: Math.round(size * 0.12) }; };
      var a = this.add.text(0, 0, top1, st(46, '800', free ? '#ffd36b' : LV.worlds[t.world].color)).setOrigin(0.5);
      var b = this.add.text(0, 0, mid1, st(130, '900', '#fffaf0')).setOrigin(0.5);
      var c = this.add.text(0, 0, bot1, st(58, '800', 'rgba(255,250,240,.95)')).setOrigin(0.5);
      this.banner = [a, b, c]; this.banner.forEach(function (o) { o.setAlpha(0).setDepth(12); });
      this.bannerPlace();
      this.tweens.chain({ targets: this.banner, tweens: [{ alpha: 1, duration: 350, delay: 300 }, { alpha: 0, duration: 450, delay: 1700, onComplete: function () { self.banner.forEach(function (o) { o.destroy(); }); self.banner = null; } }] });
    }
    bannerPlace() {
      var v = this.v, u = Math.min(this.u, (v.w - 100) / 1100); if (!v) return;
      var cy = v.t + Math.max(v.h * 0.21, 300 * u * 0.6) , y = [-92, 0, 96];
      this.banner.forEach(function (o, i) { o.setScale(u).setPosition(960, cy + y[i] * u); });
    }

    // the first round teaches the one control, in the words of the device in use, until a block has been dropped
    hintsMake() {
      if (this.hints) { this.hints.forEach(function (h) { h.destroy(); }); this.hints = null; }
      if (!this.hintsOn) return;
      var tip = { fontFamily: FONT, fontSize: '56px', fontStyle: '800', color: INK, backgroundColor: 'rgba(22,16,56,0.82)', padding: { x: 34, y: 18 } };
      var touch = this.device === 'touch';
      var txt = this.add.text(0, 0, touch ? 'Tap anywhere to drop the block' : 'Press Space (or click) to drop the block', tip).setOrigin(0.5, 1).setDepth(11);
      var ring = this.add.image(0, 0, 'ui', 'ring').setDepth(11).setTint(0xffffff);
      this.hints = [txt, ring];
      this.tweens.add({ targets: ring, scale: { from: 0.5, to: 1.3 }, alpha: { from: 0.95, to: 0 }, duration: 1100, repeat: -1 });
      this.tweens.add({ targets: txt, y: '-=10', duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.hintsPlace();
    }
    hintsPlace() {
      var v = this.v; if (!this.hints || !v) return;
      var u = Math.min(this.u, (v.w - 80) / 1250);
      this.tweens.killTweensOf(this.hints[0]);
      this.hints[0].setScale(u).setPosition(960, v.sb - 120 * u);
      this.hints[1].setScale(u).setPosition(960, v.sb - 120 * u - 190 * u);
      this.tweens.add({ targets: this.hints[0], y: '-=10', duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // ---------- floating words ("Perfect!"): sized in CSS pixels, placed from the tower's world ----------
    wordKey(o) { return (o.color || '#fff') + '|' + (o.size || 36) + '|' + (o.stroke || ''); }
    // a word's Text: one per look, made once; `peek` returns the one made for the look without taking it
    wordFor(o, s, peek) {
      var key = this.wordKey(o), t = this.words[key];
      if (!t) {
        var size = (o.size || 36) * this.c2d * 0.9;
        t = this.words[key] = this.add.text(0, 0, s, { fontFamily: FONT, fontSize: Math.round(size) + 'px', fontStyle: '900', color: o.color || '#fff', stroke: o.stroke || 'rgba(0,0,0,.5)', strokeThickness: Math.round(size * 0.14) }).setOrigin(0.5).setDepth(13);
        t.inUse = false; t.look = o;
      }
      return t;
    }
    wordBack(t) { if (t) { t.setVisible(false).setAlpha(1); t.inUse = false; } }
    floatText(x, y, s, o) {
      o = o || {};
      var t = this.wordFor(o, s);
      if (t.inUse) { t = this.add.text(0, 0, s, { fontFamily: FONT, fontSize: t.style.fontSize, fontStyle: '900', color: t.style.color, stroke: t.style.stroke, strokeThickness: t.style.strokeThickness }).setOrigin(0.5).setDepth(13); t.temp = true; }   // (a second one of the same look at once: rare)
      t.inUse = true;
      if (t.text !== s) t.setText(s);
      t.setPosition(x, y).setVisible(true).setScale(0.6).setAlpha(0);
      var rise = (o.rise || 70) * this.c2d * 0.9, life = (o.life || 0.9) * 1000, self = this;
      this.tweens.killTweensOf(t);
      this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 140, ease: 'Back.easeOut' });
      this.tweens.add({ targets: t, y: y - rise, duration: life, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: t, alpha: 0, duration: 260, delay: life - 260, onComplete: function () { if (t.temp) t.destroy(); else self.wordBack(t); } });
    }

    // ---------- the stack of screens over the paused game ----------
    block(d) {
      this.blocked = Math.max(0, this.blocked + d);
      var s = this.scene, on = !this.blocked;
      this.tl.setVisible(on);                                                           // (a screen has its own way out where the pause button was)
      if (this.hints) this.hints.forEach(function (h) { h.setVisible(on); });
      if (this.banner) this.banner.forEach(function (h) { h.setVisible(on); });
      if (this.blocked) { if (s.isActive('Tower')) s.pause('Tower'); } else s.resume('Tower');
    }
    closeAll(quiet) {
      var list = this.screens.slice(); this.screens = [];
      list.forEach(function (s) { s.root.destroy(); s.dim.destroy(); if (s.extra) s.extra.forEach(function (o) { o.destroy(); }); });
      this.blocked = 0; this.snd = null; this.tl.setVisible(true);
      if (!quiet) this.scene.resume('Tower');
    }
    pop(quiet) {
      var s = this.screens.pop(); if (!s) return;
      s.root.destroy(); s.dim.destroy(); if (s.extra) s.extra.forEach(function (o) { o.destroy(); });
      this.snd = null;
      if (quiet) this.blocked = Math.max(0, this.blocked - 1); else this.block(-1);
      if (!this.screens.length && quiet) this.tl.setVisible(true);
    }
    // a screen: a dim over everything, a root container scaled to fit, the way out (back arrow) where the pause button was
    screen(o) {
      var self = this, sc = { extra: [], back: o.back };
      if (!o.warm) this.block(1);
      sc.dim = this.add.image(0, 0, 'fx', 'px').setOrigin(0, 0).setTint(DIM).setAlpha(0.8).setDepth(20).setInteractive();
      sc.root = this.add.container(960, 540).setDepth(21);
      sc.exit = this.button('ic-exit', function () { K.play.exit(); }).setDepth(22); sc.extra.push(sc.exit);
      if (o.showBack) { sc.bk = this.button('ic-back', function () { if (sc.back) sc.back(); }).setDepth(22); sc.extra.push(sc.bk); }
      sc.layout = function () {
        var v = self.v; sc.dim.setPosition(v.l - 4, v.t - 4).setDisplaySize(v.w + 8, v.h + 8);
        var s = Math.min(self.u, (v.sr - v.sl - 60) / o.w, (v.sb - v.st - 40) / o.h);
        sc.root.setScale(s).setPosition(960, v.t + v.h / 2);
        var us = Math.min(self.u, 2); sc.exit.base = us; sc.exit.setScale(us).setPosition(v.sl + 34 * us + 75 * us, v.st + 34 * us + 75 * us);
        if (sc.bk) { sc.bk.base = us; sc.bk.setScale(us).setPosition(sc.exit.x + (150 + GAP) * us, sc.exit.y); }
        if (sc.how) sc.how();
      };
      this.screens.push(sc);
      return sc;
    }

    // buttons under a title: big labelled choices, the first (the one the eye lands on) bigger and filled
    // Titles, stars, texts and buttons: ten Text objects at once cost a long frame on a budget phone, so an end-of-round sheet is
    // built a piece a frame or two (title, stars, text, one button each, the line about the controls), hidden, then faded in.
    // The pause screen (o.sync) is built at once: it answers a tap.
    sheet(o) {
      var self = this, by = o.stars ? 150 : 90, sc = this.screen({ w: Math.max(1190, o.buttons.length * 320), h: o.stars ? 880 : 760, back: o.back, warm: o.warm });
      var add = function (obj) { sc.root.add(obj); return obj; }, steps = [];
      var n = o.buttons.length, w = 230, gap = 90, y0 = by, x0 = -((n - 1) * (w + gap)) / 2;
      sc.stars = null;
      steps.push(function () { sc.title = add(self.add.text(0, o.stars ? -310 : -250, o.title, { fontFamily: FONT, fontSize: '84px', fontStyle: '800', color: INK }).setOrigin(0.5)); });
      if (o.stars) steps.push(function () {
        sc.stars = [-1, 0, 1].map(function (i, k) {
          var on = k < o.stars, s = add(self.add.image(i * 150, -190, 'ui', 'star').setScale(1.3).setTint(on ? GOLD : 0x5d5690).setAlpha(on ? 0 : 0.8));
          if (on) s.setScale(2.4);
          return s;
        });
      });
      if (o.text) steps.push(function () { add(self.add.text(0, o.stars ? -70 : -165, o.text, { fontFamily: FONT, fontSize: '42px', fontStyle: '700', color: o.color || INK, align: 'center' }).setOrigin(0.5).setAlpha(0.92)); });
      o.buttons.forEach(function (b, i) {
        steps.push(function () {
          var main = !!b.primary;
          var c = add(self.add.container(x0 + i * (w + gap), y0, [self.add.image(0, 0, 'ui', main ? 'big' : 'plate').setScale(main ? 0.82 : 1.53).setTint(main ? GOLD : 0xffffff), self.add.image(main ? 6 : 0, 0, 'ui', b.icon).setScale(1.4).setTint(main ? 0x241a52 : 0xffffff)]).setSize(230, 230).setInteractive());
          c.icon = c.list[1];
          var lab = add(self.add.text(c.x, y0 + w / 2 + 24, b.label, { fontFamily: FONT, fontSize: '42px', fontStyle: '700', color: INK }).setOrigin(0.5, 0));
          c.lab = lab; b.obj = c;
          c.on('pointerdown', function () { K.snd.play('tap'); self.tweens.add({ targets: c, scale: 0.92, duration: 70, yoyo: true }); });
          c.on('pointerup', function () { b.fn(c, lab); });
          if (main) self.tweens.add({ targets: c, scale: 1.05, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        });
      });
      if (o.how) steps.push(function () { sc.howT = add(self.add.text(0, y0 + w / 2 + 150, '', { fontFamily: FONT, fontSize: '34px', fontStyle: '600', color: INK, align: 'center' }).setOrigin(0.5).setAlpha(0.85)); sc.how = function () { if (sc.howT) sc.howT.setText(o.how(self.device)); }; sc.how(); });
      var finish = function () {
        sc.layout();
        if (sc.stars) sc.stars.forEach(function (s, k) { if (k < o.stars) self.tweens.add({ targets: s, scale: 1.3, alpha: 1, duration: 320, delay: 350 + k * 320, ease: 'Back.easeOut', onStart: function () { K.snd.play('star'); } }); });
        if (!o.warm) self.tweens.add({ targets: sc.root, alpha: 1, duration: 160 });
      };
      sc.root.setAlpha(0);
      var run = function (i) {
        if (!sc.root.active) return;                                        // (closed while still being built)
        steps[i](); i++;
        if (i < steps.length) { if (o.sync || o.warm) run(i); else self.time.delayedCall(34, function () { run(i); }); } else finish();
      };
      sc.layout(); run(0);
      return sc;
    }

    // ---------- pause, restart ----------
    openPause() {
      var t = this.tw; if (!t || t.state !== 'play' || this.screens.length) return;
      var self = this, free = t.mode === 'free', muted = K.snd.muted;
      var sc = this.sheet({
        sync: true, title: 'Paused', text: free ? 'Free Build' : LV.worlds[t.world].name + ' · Level ' + t.level, color: free ? '#ffd36b' : LV.worlds[t.world].color,
        back: function () { self.pop(); },
        buttons: [
          { label: 'Resume', icon: 'ic-play', primary: true, fn: function () { self.pop(); } },
          { label: 'Restart', icon: 'ic-retry', fn: function () { self.restart(); } },
          { label: 'Levels', icon: 'ic-grid', fn: function () { self.pop(true); self.openLevels(true); } },
          { label: muted ? 'Sound off' : 'Sound on', icon: muted ? 'ic-mute' : 'ic-snd', fn: function () { K.snd.setMuted(!K.snd.muted); sc.snd(); } }
        ],
        how: function (d) { return d === 'touch' ? 'Tap anywhere to drop the block' : 'Space drops the block · R restarts · Esc pauses · M sound'; }
      });
      sc.snd = this.snd = function () { var m = K.snd.muted, b = sc.root.list.filter(function (o) { return o.lab; })[3]; if (!b) return; b.icon.setTexture('ui', m ? 'ic-mute' : 'ic-snd'); b.lab.setText(m ? 'Sound off' : 'Sound on'); };
    }
    restart() { var t = this.tw; if (!t) return; this.startRound(t.mode, t.level); }
    startRound(mode, level) {
      this.closeAll(true);
      var t = this.scene.get('Tower'); this.scene.resume('Tower');
      t.scene.restart({ mode: mode, level: level });
    }

    // ---------- the level map: every level by world, and Free Build ----------
    openLevels(fromPause) {
      var self = this, t = this.tw, P = window.TBSave.progress, best = window.TBSave.store.get('best', 0);
      var sc = this.screen({ w: 1180, h: 880, showBack: true, back: function () { self.pop(true); if (fromPause) self.openPause(); else self.startRound('level', P.current()); } });
      var add = function (o) { sc.root.add(o); return o; };
      add(this.add.text(0, -400, 'Tower Blocks', { fontFamily: FONT, fontSize: '80px', fontStyle: '800', color: INK }).setOrigin(0.5));
      LV.worlds.forEach(function (w, wi) {
        var y = -250 + wi * 140, col = Phaser.Display.Color.HexStringToColor(w.color).color, dark = Phaser.Display.Color.HexStringToColor(A.shade(w.color, -0.55)).color;
        add(self.add.text(-340, y, w.name, { fontFamily: FONT, fontSize: '32px', fontStyle: '800', color: w.color }).setOrigin(1, 0.5));
        for (var j = 0; j < PERWORLD; j++) {
          var n = wi * PERWORLD + j + 1, x = -250 + j * 160, locked = !P.unlocked(n), st = P.stars(n), kids = [];
          kids.push(self.add.image(0, 0, 'ui', 'lv').setScale(0.92).setTint(dark).setAlpha(locked ? 0.2 : 0.7), self.add.image(0, 0, 'ui', 'lvo').setScale(0.92).setTint(col).setAlpha(locked ? 0.35 : 1));
          if (locked) kids.push(self.add.image(0, 0, 'ui', 'ic-lock').setScale(0.8).setAlpha(0.7));
          else {
            kids.push(self.add.text(0, -10, String(n), { fontFamily: FONT, fontSize: '56px', fontStyle: '800', color: INK }).setOrigin(0.5));
            for (var s = 0; s < 3; s++) kids.push(self.add.image((s - 1) * 30, 42, 'ui', 'star').setScale(0.28).setTint(s < st ? GOLD : 0x6a6290).setAlpha(s < st ? 1 : 0.8));
          }
          var cell = add(self.add.container(x, y, kids).setSize(140, 140));
          if (t && t.mode === 'level' && n === t.level) { var ring = self.add.image(0, 0, 'ui', 'lvo').setTint(0xffffff).setScale(1.04); cell.add(ring); self.tweens.add({ targets: ring, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 }); }
          if (!locked) (function (lv, c) { c.setInteractive(); c.on('pointerdown', function () { K.snd.play('tap'); self.tweens.add({ targets: c, scale: 0.92, duration: 70, yoyo: true }); }); c.on('pointerup', function () { self.startRound('level', lv); }); })(n, cell);
        }
      });
      var fb = add(this.add.container(0, 340, [this.add.image(0, 0, 'ui', 'pillw').setScale(1.45, 1).setTint(GOLD), this.add.image(-200, 0, 'ui', 'tower').setScale(1.1),
        this.add.text(40, best ? -12 : 0, 'Free Build', { fontFamily: FONT, fontSize: '50px', fontStyle: '800', color: '#241a52' }).setOrigin(0.5)]).setSize(490, 150).setInteractive());
      if (best) fb.add(this.add.text(40, 34, 'Best ' + best, { fontFamily: FONT, fontSize: '30px', fontStyle: '800', color: '#241a52' }).setOrigin(0.5));
      fb.on('pointerdown', function () { K.snd.play('tap'); self.tweens.add({ targets: fb, scale: 0.95, duration: 70, yoyo: true }); });
      fb.on('pointerup', function () { self.startRound('free', 1); });
      sc.layout();
    }

    // ---------- a round ends ----------
    onEnd(kind, isBest) {
      var self = this, t = this.tw; if (!t) return;
      var P = window.TBSave.progress, LVL = LV;
      if (kind === 'won') {
        var last = t.level === LVL.count, endOfWorld = t.level % PERWORLD === 0, b = [];
        if (last) b.push({ label: 'Free Build', icon: 'tower', primary: true, fn: function () { self.startRound('free', 1); } });
        else b.push({ label: endOfWorld ? 'Next World' : 'Next Level', icon: 'ic-next', primary: true, fn: function () { self.startRound('level', t.level + 1); } });
        b.push({ label: 'Replay', icon: 'ic-retry', fn: function () { self.startRound('level', t.level); } });
        b.push({ label: 'Levels', icon: 'ic-grid', fn: function () { self.pop(true); self.openLevels(false); } });
        this.sheet({ title: last ? 'You did it!' : endOfWorld ? LVL.worlds[t.world].name + ' done!' : 'Tower complete!',
          text: last ? 'All 20 towers built. MashaAllah!' : t.cfg.goal + ' blocks · ' + t.perfects + ' perfect', stars: t.lastStars, buttons: b });
      } else if (kind === 'fail') {
        this.sheet({ title: 'Out of hearts', text: "Let's build it again!", buttons: [
          { label: 'Try Again', icon: 'ic-retry', primary: true, fn: function () { self.startRound('level', t.level); } },
          { label: 'Levels', icon: 'ic-grid', fn: function () { self.pop(true); self.openLevels(false); } }] });
      } else {
        var h = t.height();
        this.sheet({ title: isBest ? 'New best tower!' : 'What a tower!', text: h + (h === 1 ? ' block' : ' blocks') + (isBest ? '' : ' · Best ' + t.best), buttons: [
          { label: 'Build Again', icon: 'ic-retry', primary: true, fn: function () { self.startRound('free', 1); } },
          { label: 'Levels', icon: 'ic-grid', fn: function () { self.pop(true); self.openLevels(false); } }] });
      }
    }
  }

  window.TBHud = Hud;
})();
