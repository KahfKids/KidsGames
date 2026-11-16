/* Sharp Eyes: the interface (scene 'Hud', above the board, in the 1920 x 1080 design space of Kit.play.fit).
   Laid out by the game-ui-ux skill, after Spider IK's hud.js. While playing, the screen is the game: one pause button in
   the top-left corner of the safe area, and beside it, one gap apart, the progress the player needs on one dark plate:
   the clock (a ring of beads, on the levels that have one), the stars still to find, the hearts left. Where it fits the
   fiction the star also travels from the tile you found to its slot.
   Everything else is a stack of screens pushed over the paused board (the pause screen, the level map, a won or lost
   sheet): each is built by a function, so closing the top one rebuilds the one under it. Only the top screen takes
   input, the Play scene is paused under them. The way out (the back arrow, Kit.play.exit) is where the pause button was.
   Controls are the world itself: tap (or click) a tile, or Arrow keys / WASD and Space; Esc pauses, R restarts, M sound.
   The first level says how, in the words of the device last used (touch, mouse or keys), until the first star is found.
   All Phaser: images from the 'ui' texture painted once (game/art.js), Text, tweens for every pulse and fade, one
   particle emitter. The scenes talk through the game's events (see game/play.js). */
(function () {
  'use strict';
  var A = window.SpotArt, Se = window.Se, LV = window.SPOT_LEVELS, clamp = Phaser.Math.Clamp;
  var BTN = 150, BEADS = 24, STEP = 72, LOW = 3.5, CREAM = '#fff6e0';
  var TIPS = { touch: 'Tap the one that is different!', mouse: 'Click the one that is different!', keys: 'Arrow keys to look  ·  Space to pick the different one' };

  class Hud extends Phaser.Scene {
    constructor() { super({ key: 'Hud' }); }

    create() {
      var self = this, ev = this.game.events, on = function (k, f) { ev.on(k, f, self); self.events.once('shutdown', function () { ev.off(k, f, self); }); };
      this.stack = []; this.cur = null; this.phase = 'idle'; this.info = null; this.row = null; this.flyers = []; this.banner = null; this.hint = null;
      this.device = this.sys.game.device.input.touch ? 'touch' : 'mouse';
      A.ui(this);
      this.sparks = this.add.particles(0, 0, 'ui', { frame: 'star-w', emitting: false, lifespan: { min: 400, max: 700 }, speed: { min: 80, max: 200 },
        gravityY: 160, scale: { start: 0.4, end: 0 }, rotate: { min: 0, max: 360 }, tint: 0xffe08a }).setDepth(30);

      this.bPause = this.button('ic-pause', function () { self.openPause(); });
      this.bPause.setDepth(20);

      // the device last used decides the words (input-systems: swap at once, no restart)
      this.input.on('pointerdown', function (p) { self.setDevice(p.wasTouch ? 'touch' : 'mouse'); });
      var K = this.keys = this.input.keyboard.addKeys('ESC,M,SPACE,ENTER');
      this.input.keyboard.on('keydown', function () { self.setDevice('keys'); });
      K.ESC.on('down', function () { if (self.cur) { if (self.stack.length > 1 || self.cur.kind === 'pause') self.pop(); } else self.openPause(); });
      K.M.on('down', function () { Kit.snd.setMuted(!Kit.snd.muted); if (self.cur && self.cur.refresh) self.cur.refresh(); });
      K.SPACE.on('down', function () { if (self.cur && self.cur.main) self.cur.main(); });
      K.ENTER.on('down', function () { if (self.cur && self.cur.main) self.cur.main(); });

      on('se-level', this.levelStart); on('se-phase', function (p) { this.phase = p; });
      on('se-time', this.setTime); on('se-hearts', this.setHearts); on('se-found', this.found);
      on('se-won', this.won); on('se-lost', this.lost); on('se-device', this.setDevice);
      on('hidden', function () { if (!this.cur) this.openPause(); });

      Kit.play.fit(this, function (v) { self.layout(v); }, { w: 1280 });
      var lv = this.registry.get('lv'), pl = this.scene.get('Play');
      if (lv) { this.phase = pl.phase; this.levelStart(lv); }                // the board may have started first
    }

    /* ---- buttons ---- */
    // a round button: a dark plate (readable on any background) and its icon; answers the touch at once
    button(icon, fn) {
      var self = this, c = this.add.container(0, 0, [this.add.image(0, 0, 'ui', 'plate'), this.add.image(0, 0, 'ui', icon)]);
      c.icon = c.list[1]; c.base = 1; c.setSize(BTN, BTN).setInteractive();
      c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: c.base * 0.9, duration: 70, yoyo: true }); });
      c.on('pointerup', fn); return c;
    }
    layout(v) {
      this.v = v; var hs = Se.hs(v);
      this.bPause.base = hs; this.bPause.setScale(hs).setPosition(v.sl + Se.EDGE + 75 * hs, v.st + Se.EDGE + 75 * hs);
      this.rowPlace(); this.hintPlace();
      if (this.banner) this.banner.setPosition(960, (v.t + v.b) / 2).setScale(hs);
      if (this.cur) this.cur.layout(v);
    }
    setDevice(d) {
      if (d === this.device) return; this.device = d;
      if (this.hint) this.hint.setText(TIPS[d]);
      if (this.cur && this.cur.refresh) this.cur.refresh();
    }

    /* ---- a level starts: the progress plate, the announcement, the first-level tip ---- */
    levelStart(info) {
      this.info = info; this.hearts = info.hearts;
      this.closeAll();
      this.flyers.forEach(function (f) { f.tw.stop(); f.o.forEach(function (o) { o.destroy(); }); }); this.flyers = [];
      this.rowMake(info); this.announce(info); this.hintMake(info.hint);
    }
    rowMake(info) {
      if (this.row) this.row.destroy();
      var timed = info.time > 0, ringW = timed ? 130 : 0, x0 = 30, w = x0 + ringW + info.rounds * STEP + 40 + Se.MAX_HEARTS * STEP + 18;
      var r = this.row = this.add.container(0, 0).setDepth(20); r.w = w; r.ringW = ringW; r.n = -1; r.s = -1; r.low = false;
      r.add(this.add.nineslice(0, 0, 'ui', 'pill', w, BTN, 75, 75, 0, 0).setOrigin(0, 0.5));        // round ends, any width
      if (timed) {
        r.ring = this.add.container(x0 + 55, 0); r.beads = [];
        for (var i = 0; i < BEADS; i++) { var a = -Math.PI / 2 + i * 2 * Math.PI / BEADS; r.beads.push(this.add.image(Math.cos(a) * 46, Math.sin(a) * 46, 'ui', 'bead').setScale(0.4).setTint(0x8fe0a0)); }
        r.num = Se.txt(this, 0, 2, String(info.time), 40, 800, '#e8fff0');
        r.ring.add(r.beads); r.ring.add(r.num); r.add(r.ring);
      }
      r.starX = x0 + ringW + 36; r.heartX = x0 + ringW + info.rounds * STEP + 40 + 36;
      r.starOn = []; for (i = 0; i < info.rounds; i++) {
        var so = this.add.image(r.starX + i * STEP, 0, 'ui', 'star-on').setScale(0.72).setAlpha(0);
        r.add([this.add.image(r.starX + i * STEP, 0, 'ui', 'star-off').setScale(0.72), so]); r.starOn.push(so);
      }
      r.heartOn = []; for (i = 0; i < Se.MAX_HEARTS; i++) {
        var ho = this.add.image(r.heartX + i * STEP, 0, 'ui', 'heart-on').setScale(0.72);
        r.add([this.add.image(r.heartX + i * STEP, 0, 'ui', 'heart-off').setScale(0.72), ho]); r.heartOn.push(ho);
      }
      this.rowPlace();
    }
    rowPlace() {
      var r = this.row, v = this.v; if (!r || !v) return;
      var hs = Se.hs(v), x = this.bPause.x + (75 + Se.GAP) * hs;
      r.setScale(Math.min(hs, (v.sr - Se.EDGE - x) / r.w)).setPosition(x, this.bPause.y);        // never wider than the screen upright
    }
    slotAt(i) { var r = this.row, hs = Se.hs(this.v); return { x: r.x + (r.starX + i * STEP) * hs, y: r.y }; }
    // the clock: a ring of beads that go out one after another; the last seconds turn warm and the ring beats
    setTime(left, total) {
      var r = this.row; if (!r || !r.beads) return;
      var n = clamp(Math.ceil(left / total * BEADS - 0.0001), 0, BEADS), s = Math.ceil(left - 0.001), low = left <= LOW && left > 0;
      if (n !== r.n) { r.n = n; for (var i = 0; i < BEADS; i++) r.beads[i].setAlpha(i >= BEADS - n ? 1 : 0.18); }
      if (s !== r.s) { r.s = s; r.num.setText(String(Math.max(0, s))); }
      if (low !== r.low) {
        r.low = low; this.tweens.killTweensOf(r.ring); r.ring.setScale(1);
        r.beads.forEach(function (b) { b.setTint(low ? 0xff9f6b : 0x8fe0a0); }); r.num.setColor(low ? '#ffcf9a' : '#e8fff0');
        if (low && !Kit.reducedMotion) this.tweens.add({ targets: r.ring, scale: 1.1, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
    setHearts(h) {
      var r = this.row; if (!r) return;
      for (var j = 0; j < Se.MAX_HEARTS; j++) {
        var o = r.heartOn[j];
        if (j >= h && o.alpha > 0 && !o.going) { o.going = true; this.tweens.add({ targets: o, scale: { value: 1.1, duration: 90 }, alpha: { value: 0, duration: 220, delay: 60 }, onComplete: function () { o.setScale(0.72); } }); }
      }
    }
    // the found tile's star flies, along an arc, to its slot (a quadratic curve, a tween on its parameter)
    found(e) {
      var self = this, hs = this.row.scaleX, r = this.row, to = this.slotAt(e.slot), info = this.info, R0 = clamp(e.pitch * 0.2, 36, 72), R1 = 36 * hs;
      var glow = this.add.image(e.x, e.y, 'ui', 'glow').setTint(0xffe9a0).setAlpha(0.7).setDepth(28), star = this.add.image(e.x, e.y, 'ui', 'star-on').setDepth(29);
      var cx = (e.x + to.x) / 2, cy = Math.min(e.y, to.y) - 120, st = { t: 0 }, Q = Phaser.Math.Interpolation.QuadraticBezier, f = { o: [glow, star] };
      f.tw = this.tweens.add({ targets: st, t: 1, duration: 750, ease: 'Sine.easeInOut',
        onUpdate: function () {
          var u = st.t, x = Q(u, e.x, cx, to.x), y = Q(u, e.y, cy, to.y), R = R0 + (R1 - R0) * u;
          star.setPosition(x, y).setScale(R / 44).setRotation(u * 6); glow.setPosition(x, y).setScale(R * 3.4 / 128);
        },
        onComplete: function () {
          glow.destroy(); star.destroy(); self.flyers.splice(self.flyers.indexOf(f), 1);
          if (self.info !== info || !self.row) return;
          var on = self.row.starOn[e.slot]; on.setAlpha(1).setScale(1.1); self.tweens.add({ targets: on, scale: 0.72, duration: 260, ease: 'Back.easeOut' });
          self.sparks.explode(9, to.x, to.y); Kit.snd.play('land');
        } });
      this.flyers.push(f);
      if (this.hint) { var h = this.hint; this.hint = null; this.tweens.add({ targets: h, alpha: 0, duration: 250, onComplete: function () { h.destroy(); } }); }
    }
    // the level, said once large in the middle, then gone (the plate keeps the progress; the pause screen names the level)
    announce(info) {
      if (this.banner) { this.tweens.killTweensOf(this.banner); this.banner.destroy(); }
      var v = this.v, W = A.WORLDS[info.world], hs = Se.hs(v);
      var st = function (w) { return { stroke: 'rgba(20,10,40,.7)', strokeThickness: w }; };
      var b = this.banner = this.add.container(960, (v.t + v.b) / 2, [
        Se.txt(this, 0, -110, W.name.toUpperCase(), 48, 800, W.color, st(7)),
        Se.txt(this, 0, 0, 'Level ' + info.level, 130, 900, '#fffaf0', st(12)),
        Se.txt(this, 0, 105, 'Find ' + info.rounds + ' odd ones' + (info.time ? '' : ', take your time'), 50, 800, 'rgba(255,250,240,.95)', st(6))
      ]).setDepth(15).setScale(hs).setAlpha(0);
      this.tweens.chain({ targets: b, tweens: [{ alpha: 1, duration: 280 }, { alpha: 1, duration: 600 }, { alpha: 0, duration: 400, onComplete: function () { b.destroy(); } }] });
    }
    // the first level says how to play, in the words of the device in use, until the first star is found
    hintMake(on) {
      if (this.hint) { this.hint.destroy(); this.hint = null; }
      if (!on) return;
      var h = this.hint = Se.txt(this, 960, 0, TIPS[this.device], 44, 700, CREAM, { backgroundColor: 'rgba(14,10,34,0.8)', padding: { x: 28, y: 14 }, align: 'center' }).setDepth(14).setAlpha(0);
      this.tweens.add({ targets: h, alpha: 1, duration: 300, delay: 1500 });
      this.hintPlace();
    }
    hintPlace() {
      var h = this.hint, v = this.v; if (!h || !v) return;
      var hs = Math.max(Se.hs(v), 18 * v.pt / 44); h.setScale(Math.min(hs, (v.sr - v.sl - 2 * Se.EDGE) / Math.max(1, h.width))).setPosition((v.sl + v.sr) / 2, v.sb - Se.EDGE - 65);
    }

    /* ---- the stack of screens ---- */
    canPause() { return this.phase === 'banner' || this.phase === 'in' || this.phase === 'play' || this.phase === 'reveal' || this.phase === 'out'; }
    push(build) {
      Kit.play.wake();
      var first = !this.stack.length; this.stack.push(build);
      if (first) { this.scene.pause('Play'); }
      this.show();
    }
    pop() {
      Kit.play.wake(); this.stack.pop();
      if (!this.stack.length) { this.drop(); this.scene.resume('Play'); } else this.show();
    }
    drop() { if (this.cur) { this.cur.items.forEach(function (o) { o.destroy(); }); this.cur = null; } }
    show() {
      this.drop();
      var s = this.cur = this.stack[this.stack.length - 1].call(this);
      if (this.v) s.layout(this.v);
      var fade = [s.root, s.exit, s.close].filter(Boolean);              // the content comes in over 160 ms
      fade.forEach(function (o) { o.setAlpha(0); });
      this.tweens.add({ targets: fade, alpha: 1, duration: 160 });
    }
    closeAll() { if (!this.stack.length) return; Kit.play.wake(); this.stack = []; this.drop(); this.scene.resume('Play'); }
    go(n) { this.closeAll(); this.game.events.emit('se-go', n); }
    // the common base of a screen: a dim over everything, the way out where the pause button was
    base(kind, dim) {
      var self = this, s = { kind: kind, items: [] };
      s.add = function (o) { s.items.push(o); return o; };
      s.dim = s.add(this.add.image(0, 0, 'ui', 'px').setTint(0x07051a).setAlpha(dim).setInteractive().setDepth(50));
      s.exit = s.add(this.button('ic-exit', function () { Kit.play.exit(); }).setDepth(53));
      s.place = function (v) {
        var hs = Se.hs(v);
        s.dim.setPosition(v.l + v.w / 2, v.t + v.h / 2).setDisplaySize(v.w + 4, v.h + 4);
        s.exit.base = hs; s.exit.setScale(hs).setPosition(v.sl + Se.EDGE + 75 * hs, v.st + Se.EDGE + 75 * hs);
        if (s.close) { s.close.base = hs; s.close.setScale(hs).setPosition(v.sr - Se.EDGE - 75 * hs, v.st + Se.EDGE + 75 * hs); }
      };
      s.withClose = function (fn) { s.close = s.add(self.button('ic-close', fn).setDepth(53)); };
      // the content: a container scaled to fit what is left of the screen below the way-out row
      s.fit = function (v, W, H, cap) {
        var hs = Se.hs(v), top = v.st + Se.EDGE + BTN * hs + 20, bottom = v.sb - Se.EDGE;
        var k = Math.min(cap, (v.sr - v.sl - 2 * Se.EDGE) / W, (bottom - top) / H);
        s.root.setScale(k).setPosition((v.sl + v.sr) / 2, top + ((bottom - top) - H * k) / 2);
      };
      return s;
    }
    // title, a line under it, stars (a won sheet), big labelled choices, a line of how to play
    panel(kind, o) {
      var self = this, s = this.base(kind, 0.78), n = o.choices.length;
      s.root = s.add(this.add.container(0, 0).setDepth(51));
      var port = Se.port(this.v), PW = Math.max((port ? 2 : n) * 230 + ((port ? 2 : n) - 1) * 90, port ? 700 : 1300);           // the text wraps at the content's width
      var title = Se.txt(this, 0, 0, o.title, 76, 800, CREAM), sub = o.sub && Se.txt(this, 0, 0, o.sub, 38, 700, o.subColor || '#ffd36b', { align: 'center', wordWrap: { width: PW - 40 } });
      var how = o.how && Se.txt(this, 0, 0, o.how(), 34, 600, CREAM, { align: 'center', wordWrap: { width: PW - 40 } }).setAlpha(0.85);
      s.root.add([title].concat(sub ? [sub] : [], how ? [how] : []));
      var stars = []; if (o.stars) for (var i = 0; i < 3; i++) {
        var off = this.add.image(0, 0, 'ui', 'star-off').setScale(1.3), on = this.add.image(0, 0, 'ui', 'star-on').setScale(1.3).setAlpha(0);
        s.root.add([off, on]); stars.push({ off: off, on: on });
      }
      var btns = o.choices.map(function (ch) {
        var c = self.add.container(0, 0, [self.add.image(0, 0, 'ui', ch.main ? 'big' : 'plate').setScale(ch.main ? 0.82 : 1.53), self.add.image(ch.main ? 10 : 0, 0, 'ui', ch.icon).setScale(1.4).setTint(ch.main ? 0x14102c : 0xffffff)]).setSize(230, 230).setInteractive();
        c.label = Se.txt(self, 0, 0, ch.label, 40, 700, CREAM); c.ch = ch;
        c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: 0.92, duration: 70, yoyo: true }); }); c.on('pointerup', function () { ch.fn(); });
        s.root.add([c, c.label]); return c;
      });
      s.pw = PW;
      var main = o.choices.filter(function (c) { return c.main; })[0]; if (main) s.main = main.fn;
      s.layout = function (v) {
        s.place(v);
        var port = Se.port(v), per = port ? 2 : n, rows = Math.ceil(n / per), W = Math.max(per * 230 + (per - 1) * 90, port ? 700 : 1300), y = 0;
        if (W !== s.pw) { s.pw = W; if (sub) sub.setWordWrapWidth(W - 40); if (how) how.setWordWrapWidth(W - 40); }      // (only when the screen turned)
        title.setPosition(0, y + 45); y += 100;
        if (sub) { sub.setPosition(0, y + sub.height / 2 - 8); y += sub.height + 24; }
        if (stars.length) { y += 40; stars.forEach(function (p, i) { p.on.setPosition((i - 1) * 150, y + 62); p.off.setPosition((i - 1) * 150, y + 62); }); y += 150; }
        y += 24;
        btns.forEach(function (c, i) {
          var r = (i / per) | 0, cnt = Math.min(per, n - r * per), yc = y + 115 + r * 360;
          c.setPosition(((i % per) - (cnt - 1) / 2) * 320, yc); c.label.setPosition(c.x, yc + 150);
        });
        y += rows * 360 - 40;
        if (how) { how.setPosition(0, y + how.height / 2 + 10); y += how.height + 20; }
        s.fit(v, W, y, port ? 2.4 : 1.2);
      };
      s.refresh = function () {
        if (how) how.setText(o.how());
        btns.forEach(function (c) { if (c.ch.refresh) c.ch.refresh(c); });
      };
      if (stars.length) {                                    // the earned stars arrive one after another
        for (i = 0; i < o.stars; i++) (function (on, k) {
          on.setScale(0);
          self.time.delayedCall(350 + k * 300, function () {
            if (self.cur !== s) return;
            on.setAlpha(1); self.tweens.add({ targets: on, scale: 1.3, duration: 320, ease: 'Back.easeOut' });
            self.sparks.explode(8, on.x * s.root.scaleX + s.root.x, on.y * s.root.scaleY + s.root.y); Kit.snd.play('star', { vol: 0.8 + k * 0.1 });
          });
        })(stars[i].on, i);
      }
      return s;
    }
    soundChoice() {
      var self = this, m = Kit.snd.muted;
      return { icon: m ? 'ic-mute' : 'ic-snd', label: m ? 'Sound: Off' : 'Sound: On', fn: function () { Kit.snd.setMuted(!Kit.snd.muted); self.cur.refresh(); },
        refresh: function (c) { var q = Kit.snd.muted; c.list[1].setFrame(q ? 'ic-mute' : 'ic-snd'); c.label.setText(q ? 'Sound: Off' : 'Sound: On'); } };
    }
    how() { return this.device === 'keys' ? 'Arrows or WASD look  ·  Space picks  ·  R restarts  ·  Esc pauses  ·  M sound' : this.device === 'mouse' ? 'Click the picture that is different' : 'Tap the picture that is different'; }

    openPause() {
      if (this.cur || !this.canPause()) return;
      var self = this;
      this.push(function () {
        var W = A.WORLDS[self.info.world];
        return self.panel('pause', { title: 'Paused', sub: W.name + ' · Level ' + self.info.level, subColor: W.color, how: function () { return self.how(); }, choices: [
          { icon: 'ic-play', label: 'Resume', main: true, fn: function () { self.pop(); } },
          { icon: 'ic-retry', label: 'Restart', fn: function () { self.go(self.info.level); } },
          { icon: 'ic-grid', label: 'Levels', fn: function () { self.openMap(); } },
          self.soundChoice()] });
      });
    }
    won(e) {
      var self = this, W = A.WORLDS[e.world];
      this.push(function () {
        var ch = [];
        if (!e.last) ch.push({ icon: 'ic-next', label: e.endOfWorld ? 'Next World' : 'Next Level', main: true, fn: function () { self.go(e.level + 1); } });
        ch.push({ icon: 'ic-retry', label: e.last ? 'Play Again' : 'Replay', main: e.last, fn: function () { self.go(e.last ? 1 : e.level); } });
        ch.push({ icon: 'ic-grid', label: 'Levels', fn: function () { self.openMap(); } });
        return self.panel('won', { title: e.last ? 'You did it!' : e.endOfWorld ? W.name + ' done!' : 'Well spotted!', stars: e.stars,
          sub: e.last ? 'All 30 levels. What sharp eyes, MashaAllah!' : 'You found all ' + e.rounds + '!', choices: ch });
      });
    }
    lost(e) {
      var self = this;
      this.push(function () {
        return self.panel('lost', { title: 'Out of hearts', sub: "Let's look again, slowly!", choices: [
          { icon: 'ic-retry', label: 'Try Again', main: true, fn: function () { self.go(e.level); } },
          { icon: 'ic-grid', label: 'Levels', fn: function () { self.openMap(); } }] });
      });
    }

    /* ---- the level map: three worlds of ten ---- */
    openMap() {
      var self = this;
      this.push(function () {
        var s = self.base('map', 0.9), P = Se.progress, CP = 150, root = s.root = s.add(self.add.container(0, 0).setDepth(51)), cells = [], heads = [];
        s.withClose(function () { self.pop(); });
        var title = Se.txt(self, 0, 0, 'Sharp Eyes', 72, 800, CREAM); root.add(title);
        A.WORLDS.forEach(function (W, wi) {
          var head = Se.txt(self, 0, 0, W.name, 44, 800, W.color).setOrigin(0, 0.5); root.add(head); heads.push(head);
          var dark = Se.hex(window.SpotItems.shade(W.color, -0.55)), light = Phaser.Display.Color.HexStringToColor(W.color).color;
          for (var k = 0; k < 10; k++) {
            var n = wi * 10 + k + 1, locked = !P.unlocked(n), got = P.stars(n);
            var kids = [self.add.image(0, 0, 'ui', 'lv').setTint(dark).setAlpha(locked ? 0.15 : 0.7), self.add.image(0, 0, 'ui', 'lvo').setTint(light).setAlpha(locked ? 0.4 : 1)];
            if (locked) kids.push(self.add.image(0, 0, 'ui', 'ic-lock').setScale(0.8).setAlpha(0.7));
            else {
              kids.push(Se.txt(self, 0, -14, String(n), 60, 800, CREAM));
              for (var q = 0; q < 3; q++) kids.push(self.add.image((q - 1) * 34, 42, 'ui', q < got ? 'star-on' : 'star-off').setScale(0.3));
            }
            if (n === self.info.level) kids.push(self.add.image(0, 0, 'ui', 'lvo').setScale(1.1).setTint(0xffffff));
            var c = self.add.container(0, 0, kids).setSize(140, 140); c.n = n; root.add(c); cells.push(c);
            if (!locked) {
              c.setInteractive();
              c.on('pointerdown', function () { Kit.snd.play('tap'); });
              c.on('pointerup', function () { self.go(this.n); }.bind(c));
            }
          }
        });
        s.layout = function (v) {
          s.place(v);
          var port = Se.port(v), cols = port ? 5 : 10, rows = 10 / cols, W = cols * CP, y = 70, bh = 56 + rows * CP + 24;
          title.setPosition(0, 40); y = 130;
          A.WORLDS.forEach(function (w, wi) {
            heads[wi].setPosition(-W / 2 + 6, y + 28);
            for (var k = 0; k < 10; k++) cells[wi * 10 + k].setPosition(-W / 2 + CP / 2 + (k % cols) * CP, y + 56 + CP / 2 + ((k / cols) | 0) * CP);
            y += bh;
          });
          s.fit(v, W, y, port ? 2.4 : 1.15);
        };
        return s;
      });
    }
  }

  window.SeHud = Hud;
})();
