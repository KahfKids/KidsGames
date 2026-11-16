/* 2048 Garden: the interface (scene 'Hud', above the garden, in the 1920 x 1080 design space of Kit.play.fit).
   Laid out by the game-ui-ux skill. While playing, the screen is the garden: one pause button in the top-left corner,
   the goal ("Make" + the goal tile + the stars still in reach + the moves) beside it when upright or in the left
   gutter on its side, and the undo button in the bottom-right corner, always at its home. The first level teaches the
   swipe (a ghost finger on a touch screen, a line of keys otherwise) until the child has slid once.
   Everything else is a stack of screens over the game (game-ui-ux section 4): the pause screen (resume, restart,
   levels, sound, the way out, the controls of the device in use), the level map, the goal-reached sheet and the
   no-moves sheet. Only the top screen takes input.
   Input is actions, not devices (input-systems): a swipe anywhere on the board (touch or mouse), arrows or WASD,
   U for undo, R restart, Esc pause, M sound, all calling the Garden scene's request() and undo().
   Small phones and upright screens see the design space squeezed, so everything here is drawn in "logical" units and
   scaled by G48UiScale(view) (>= 1): buttons stay thumb-sized and words readable. One GAP, nothing touching.
   Nothing runs per frame: no update(), no endless tweens (the game sleeps while nothing moves). */
(function () {
  'use strict';
  var A = window.G48Art, LV = window.G48_LEVELS, S = window.G48S, GAP = 36;
  var INK = '#f6f2ff';

  class Hud extends Phaser.Scene {
    constructor() { super('Hud'); }
    create() {
      var self = this;
      this.blocked = 0; this.pause = null; this.menu = null; this.sheet = null; this.hint = null; this.banner = null;
      this.device = this.sys.game.device.input.touch ? 'touch' : 'keys';
      this.k = 1;

      // the swipe: a Zone under everything; the first touch on it starts a swipe, the moves and the lift finish it
      this.zone = this.add.zone(0, 0, 10, 10).setOrigin(0).setInteractive();
      this.sw = null;
      this.zone.on('pointerdown', function (p) { if (!self.blocked && !self.sw) self.sw = { id: p.id, x: p.x, y: p.y, done: false }; });
      this.input.on('pointermove', function (p) {
        var s = self.sw; if (!s || s.id !== p.id || s.done) return;
        if (Math.hypot(p.x - s.x, p.y - s.y) > 18 * Kit.play.dpr()) { s.done = true; self.swipe(p.x - s.x, p.y - s.y); }
      });
      var up = function (p) {
        var s = self.sw; if (!s || s.id !== p.id) return; self.sw = null;
        if (!s.done && Math.hypot(p.x - s.x, p.y - s.y) > 8 * Kit.play.dpr()) self.swipe(p.x - s.x, p.y - s.y);
      };
      this.input.on('pointerup', up); this.input.on('pointerupoutside', up);
      this.input.on('pointerdown', function (p) { if (p.wasTouch) self.setDevice('touch'); });

      // the two buttons that are always there
      this.bPause = this.button('ic-pause', function () { self.openPause(); });
      this.bUndo = this.button('ic-undo', function () { self.garden().undo(); });
      var badge = this.add.image(52, -52, 'g48ui', 'badge'), bt = this.text(null, 52, -51, '3', 38, '800', '#2a1606');
      this.bUndo.add([badge, bt]); this.badgeT = bt;

      // the goal
      this.makeGoal();

      // keys -> the same actions
      var K = this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,U,R,ESC,M,P,ENTER,SPACE');
      var dirs = [[K.UP, 0], [K.W, 0], [K.RIGHT, 1], [K.D, 1], [K.DOWN, 2], [K.S, 2], [K.LEFT, 3], [K.A, 3]];
      dirs.forEach(function (d) { d[0].on('down', function () { self.setDevice('keys'); if (!self.blocked) self.garden().request(d[1]); }); });
      K.U.on('down', function () { if (!self.blocked || self.sheet) self.garden().undo() && self.sheet && self.closeSheet(); });
      this.input.keyboard.on('keydown', function (e) {
        var ev = e.originalEvent || e; if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'z' || ev.key === 'Z')) { if (!self.blocked || self.sheet) { self.garden().undo() && self.sheet && self.closeSheet(); } }
      });
      K.R.on('down', function () { if (!self.menu) self.restart(); });
      K.M.on('down', function () { Kit.snd.setMuted(!Kit.snd.muted); if (self.pause) self.pause.snd(); });
      var esc = function () { if (self.menu) self.backFromMenu(); else if (self.pause) self.closePause(); else if (!self.blocked) self.openPause(); };
      K.ESC.on('down', esc); K.P.on('down', function () { if (!self.blocked) self.openPause(); });
      var go = function () { if (self.sheet) self.sheet.primary(); else if (self.pause) self.closePause(); };
      K.ENTER.on('down', go); K.SPACE.on('down', go);

      // the game's events
      var ev = this.game.events, on = function (k, f) { ev.on(k, f, self); self.events.once('shutdown', function () { ev.off(k, f, self); }); };
      on('g48-start', this.levelStart); on('g48-move', this.moved); on('g48-tiles', this.goalTile); on('g48-nope', this.nope);
      on('g48-end', this.onEnd); on('g48-won', this.won); on('g48-stuck', this.stuck); on('g48-near', this.near);
      var hide = function () { if (document.hidden && S.state === 'play' && !self.blocked) self.openPause(); };
      document.addEventListener('visibilitychange', hide);
      this.events.once('shutdown', function () { document.removeEventListener('visibilitychange', hide); });

      Kit.play.fit(this, function (v) { self.layout(v); });
      if (S.ready) this.levelStart();                                            // the garden may have started first
    }

    garden() { return this.scene.get('Garden'); }
    text(parent, x, y, str, size, weight, color, extra) {
      var t = this.add.text(x, y, str, Object.assign({ fontFamily: A.FONT, fontSize: size + 'px', fontStyle: weight || '700', color: color || INK, resolution: 1.5 }, extra || {})).setOrigin(0.5);
      if (parent) parent.add(t); return t;
    }
    // a round button: a dark plate (readable on any garden) and its icon; it answers the touch at once
    button(icon, fn, plate) {
      var self = this, c = this.add.container(0, 0, [this.add.image(0, 0, 'g48ui', plate || 'plate'), this.add.image(0, 0, 'g48ui', icon)]);
      c.icon = c.list[1]; c.setSize(150, 150).setInteractive();
      c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scaleX: c.scaleX * 0.9, scaleY: c.scaleY * 0.9, duration: 70, yoyo: true }); });
      c.on('pointerup', fn); return c;
    }
    // a wide button with its icon and words (the sheets); primary = the bright one
    pill(parent, x, y, w, h, label, icon, primary, fn, idle) {
      var self = this, c = this.add.container(x, y);
      var bg = this.add.nineslice(0, 0, 'g48ui', primary ? 'panelg' : 'panel', w, h, 70, 70, 70, 70);
      var ink = primary ? '#2a1606' : INK, ic = this.add.image(-w / 2 + h * 0.55, 0, 'g48ui', icon).setScale(0.8); if (primary) ic.setTint(0x2a1606);
      var tx = this.text(null, h * 0.3, 0, label, primary ? 44 : 40, '800', ink);
      c.add([bg, ic, tx]); c.setSize(w, h); if (!idle) c.setInteractive(); c.bg = bg; c.label = tx;
      c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scaleX: 0.94, scaleY: 0.94, duration: 70, yoyo: true }); });
      c.on('pointerup', fn); if (parent) parent.add(c); return c;
    }
    area(maxW, maxH) { var v = this.v, k = this.k; return { cx: (v.sl + v.sr) / 2, cy: (v.st + v.sb) / 2, W: Math.min((v.sr - v.sl) / k, maxW || 1700), H: Math.min((v.sb - v.st) / k, maxH || 1100) }; }
    dim(a) { return this.add.image(0, 0, 'g48ui', 'px').setTint(0x120a26).setAlpha(a).setInteractive(); }

    /* ---- layout ---- */
    layout(v) {
      this.v = v; var k = this.k = window.G48UiScale(v), m = 40 * k;
      this.zone.setPosition(v.l, v.t).setSize(v.w, v.h); this.zone.input.hitArea.setSize(v.w, v.h);
      this.bPause.setScale(k).setPosition(v.sl + m + 75 * k, v.st + m + 75 * k);
      this.bUndo.setScale(k).setPosition(v.sr - m - 75 * k, v.sb - m - 75 * k);
      if (S.ready) { this.goalLayout(); this.hintPlace(); this.bannerPlace(); }
      if (this.pz) this.pauseLayout();
      if (this.mz) this.menuLayout();
      if (this.sheet) this.sheetLayout();
    }

    /* ---- the goal: "Make" + the goal tile + stars still in reach + moves ---- */
    makeGoal() {
      var g = this.gc = this.add.container(0, 0);
      g.panel = this.add.nineslice(0, 0, 'g48ui', 'panel', 400, 200, 70, 70, 70, 70);
      g.make = this.text(null, 0, 0, 'Make', 48, '800', '#fffaf0');
      g.glow = this.add.image(0, 0, 'g48ui', 'glow');
      g.tile = this.add.image(0, 0, 'g48ui', 'px').setVisible(false);
      g.stars = [0, 1, 2].map(function () { return this.add.image(0, 0, 'g48ui', 'star'); }, this);
      g.moves = this.text(null, 0, 0, '0 moves', 34, '700', '#fffaf0');
      g.add([g.panel, g.make, g.glow, g.tile].concat(g.stars, [g.moves]));
    }
    goalTile() {
      var g = this.gc, tt = S.tt; if (!tt || !S.def) return;
      g.tile.setTexture(S.tk, 't' + A.tierOf(S.def.goal)).setVisible(true);
      this.goalLayout();
    }
    goalLayout() {
      var g = this.gc, L = window.G48Lay(this.v, S.def.size), v = this.v, k = L.k, tt = S.tt; this.lay = L;
      g.setScale(k);
      var fit = function (ts) { return tt ? ts * (tt.cs + 2 * tt.pad) / tt.cs / tt.fw : 1; };
      if (L.land) {
        var Wc = Math.max(250, Math.min(420, (L.bx - v.sl - 2 * L.m) / k)), ts = Math.min(Wc * 0.5, 190), ss = Math.min(Wc * 0.22, 84);
        var Hc = 30 + 50 + 16 + ts + 22 + ss + 12 + 38 + 30, y = -Hc / 2 + 30;
        // the goal fills the margin beside the board (as the old game's did on a tablet or a computer), up to 2.2 x the
        // button size, never taller than the board
        g.setScale(Math.max(k, Math.min(2.2 * k, (L.bx - v.sl - 2 * L.m) / Wc, L.B * 0.8 / Hc)));
        g.panel.setSize(Wc, Hc).setPosition(0, 0);
        g.make.setPosition(0, y + 25); y += 50 + 16;
        g.tile.setPosition(0, y + ts / 2).setScale(fit(ts)); g.glow.setPosition(0, y + ts / 2).setDisplaySize(ts * 2.1, ts * 2.1); y += ts + 22;
        g.stars.forEach(function (s, i) { s.setPosition((i - 1) * ss * 1.12, y + ss / 2 - (i === 1 ? ss * 0.1 : 0)).setDisplaySize(ss, ss); }); y += ss + 12;
        g.moves.setPosition(0, y + 19);
        g.setPosition((v.sl + L.bx) / 2, L.cy);
      } else {
        var W2 = 560, H2 = 150, ts2 = 104, lx = -W2 / 2 + 28;
        g.panel.setSize(W2, H2).setPosition(0, 0);
        g.make.setPosition(lx + 62, 0);
        g.tile.setPosition(lx + 124 + 16 + ts2 / 2, 0).setScale(fit(ts2)); g.glow.setPosition(g.tile.x, 0).setDisplaySize(ts2 * 2.1, ts2 * 2.1);
        var rc = W2 / 2 - 28 - 86;
        g.stars.forEach(function (s, i) { s.setPosition(rc + (i - 1) * 58, -28 - (i === 1 ? 5 : 0)).setDisplaySize(52, 52); });
        g.moves.setPosition(rc, 38);
        g.setPosition(v.sl + L.m + 150 * k + GAP * k + W2 * k / 2, v.st + L.m + 75 * k);
      }
      this.starsUpdate(true);
    }
    starsUpdate(quiet) {
      var g = this.gc, n = LV.stars(S.n, S.moves, S.used), self = this;
      g.stars.forEach(function (s, i) {
        var want = i < n ? 'star' : 'star0';
        if (s.frame.name !== want) { s.setFrame(want); if (!quiet) { var b = s.scaleX; self.tweens.add({ targets: s, scaleX: b * 1.3, scaleY: b * 1.3, duration: 110, yoyo: true }); } }
      });
      g.moves.setText(S.moves + (S.moves === 1 ? ' move' : ' moves'));
    }
    near() { var t = this.gc.tile, self = this; this.tweens.add({ targets: t, angle: { from: -6, to: 6 }, duration: 110, yoyo: true, repeat: 6, onComplete: function () { t.setAngle(0); } }); }
    undoUpdate() {
      var ok = S.undos > 0 && S.hist.length > 0 && (S.state === 'play' || S.state === 'stuck');
      this.badgeT.setText(String(S.undos)); this.bUndo.setAlpha(ok ? 1 : 0.7);
    }
    moved() {
      this.starsUpdate(); this.undoUpdate();
      if (this.sheet && !this.sheet.shown) this.discardSheet();
      if (this.hint && window.G48Save.store.get('swiped', false)) this.hintClear();
    }
    nope() { var b = this.bUndo, x = b.x, self = this; this.tweens.killTweensOf(b); this.tweens.add({ targets: b, x: x - 12, duration: 60, yoyo: true, repeat: 2, onComplete: function () { b.x = x; } }); }

    /* ---- input ---- */
    swipe(dx, dy) { if (!this.blocked) this.garden().request(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0)); }
    // the last device used decides which prompts show (input-systems: hot-swap, no restart)
    setDevice(d) { if (d === this.device) return; this.device = d; if (this.hint) this.hintMake(); if (this.pause) { this.pauseFill(); this.pauseLayout(); } }
    block(d) { this.blocked = Math.max(0, this.blocked + d); if (this.blocked) this.sw = null; }
    closeAll() {
      if (this.pause) this.hideZ(this.pause); if (this.menu) this.hideZ(this.menu);        // (kept, built ahead)
      if (this.sheet) this.sheet.items.forEach(function (o) { o.destroy(); });
      this.pause = this.menu = this.sheet = null; this.blocked = 0;
    }

    /* ---- a level starts: the goal, a banner, the first-level hint ---- */
    levelStart() {
      this.closeAll(); this.goalTile(); this.undoUpdate(); this.ahead();
      this.lay = window.G48Lay(this.v, S.def.size);
      this.hintMake();
      var self = this, W = A.WORLDS[S.world], L = this.lay, b = this.banner;
      if (b) b.forEach(function (o) { o.destroy(); });
      var name = LV.WORLDS[S.world].name.toUpperCase();
      b = this.banner = [
        this.text(null, 0, 0, name, 44, '800', LV.WORLDS[S.world].color, { stroke: '#22163a', strokeThickness: 8 }),
        this.text(null, 0, 0, 'Level ' + S.n, 110, '800', '#fffaf0', { stroke: '#22163a', strokeThickness: 14 }),
        this.text(null, 0, 0, 'Make ' + S.def.goal + '!', 56, '800', '#ffe9a8', { stroke: '#22163a', strokeThickness: 10 })
      ];
      b.forEach(function (o) { o.setAlpha(0); });
      this.bannerPlace();
      this.tweens.add({ targets: b, alpha: 1, duration: 300, delay: 350 });
      this.tweens.add({ targets: b, alpha: 0, duration: 400, delay: 1900, onComplete: function () { b.forEach(function (o) { o.destroy(); }); if (self.banner === b) self.banner = null; } });
    }
    bannerPlace() {
      var b = this.banner, L = this.lay; if (!b || !L) return;
      var k = L.k; b.forEach(function (o) { o.setScale(k); });
      b[0].setPosition(L.cx, L.cy - 110 * k); b[1].setPosition(L.cx, L.cy); b[2].setPosition(L.cx, L.cy + 100 * k);
    }

    /* ---- the first level teaches the swipe, in the words and pictures of the device in use ---- */
    hintMake() {
      this.hintClear();
      if (S.n !== 1 || window.G48Save.store.get('swiped', false) || !this.lay) return;
      var h = this.hint = { items: [], p: { v: 0 } }, self = this, tip = { backgroundColor: 'rgba(34,22,58,0.86)', padding: { x: 28, y: 14 } };
      if (this.device === 'touch') {
        h.dot = this.add.image(0, 0, 'g48ui', 'dot'); h.trail = this.add.image(0, 0, 'g48ui', 'trail').setOrigin(1, 0.5);
        h.tx = this.text(null, 0, 0, 'Swipe to slide!', 52, '800', '#fffaf0', tip);
        h.items.push(h.dot, h.trail, h.tx);
        this.tweens.add({ targets: h.p, v: 1, duration: 1800, repeat: -1, onUpdate: function () { self.hintStep(); } });
      } else {
        h.tx = this.text(null, 0, 0, 'Arrow keys or WASD to slide the tiles!', 44, '800', '#fffaf0', tip);
        h.items.push(h.tx);
      }
            this.hintPlace();
    }
    // the ghost finger crosses the tray (the same walk and fade as the old page's)
    hintStep() {
      var h = this.hint, L = this.lay; if (!h || !h.dot || !L) return;
      var u = h.p.v, e = Phaser.Math.Easing.Sine.InOut(Math.min(1, u / 0.7)), x0 = L.bx + L.B * 0.3, x1 = L.bx + L.B * 0.7, x = x0 + (x1 - x0) * e;
      var al = u < 0.85 ? Math.min(1, u * 5) * 0.85 : (1 - u) / 0.15 * 0.85;
      h.dot.setPosition(x, L.cy).setAlpha(al).setScale(L.k * 1.5); h.trail.setPosition(x, L.cy).setAlpha(al).setDisplaySize(Math.max(1, x - x0), 34 * L.k);
    }
    hintPlace() {
      var h = this.hint, L = this.lay, v = this.v; if (!h || !L) return;
      var k = L.k; h.tx.setScale(k);
      if (L.land) { var gx = (L.bx + L.B + v.sr) / 2; h.tx.setWordWrapWidth(Math.max(240, (v.sr - L.bx - L.B - 2 * L.m) / k - 70)); h.tx.setPosition(gx, L.cy); }
      else { h.tx.setWordWrapWidth(Math.max(400, (v.sr - v.sl - 2 * L.m) / k - 70)); h.tx.setPosition(L.cx, L.by + L.B + 110 * k); }
      if (h.dot) this.hintStep();
    }
    hintClear() { var h = this.hint; if (!h) return; this.hint = null; this.tweens.killTweensOf(h.p); h.items.forEach(function (o) { o.destroy(); }); }

    /* ---- restart ---- */
    restart() { var s = S.state; if (s === 'play' || s === 'stuck' || s === 'clear') { this.closeAll(); this.garden().scene.restart({ n: S.n }); } }
    go(n) {
      var sv = window.G48Save; if (!sv.progress.unlocked(n)) return;
      this.closeAll(); this.garden().scene.restart({ n: n });
    }

    /* ---- screens built ahead ----
       The pause screen and the level map are made in small steps while the game idles after a level starts (a text or two a
       step, hidden, and drawn once so the graphics chip holds them), because a frame that builds eight or sixteen Text objects
       is long on a budget phone. Opening one only shows what is there; closing hides it. The map is built once for all twelve
       levels and refreshed (stars, locks, the current level) when it opens. A tap that comes before a screen is ready builds
       the rest at once. */
    stepper(key, fns) {
      var self = this, st = this.stg[key] = { fns: fns, i: 0, run: function () { while (st.i < fns.length) fns[st.i++](); } };
      var next = function () { self.time.delayedCall(90, function () { if (st.i < fns.length) { fns[st.i++](); next(); } }); };
      next(); return st;
    }
    ahead() {
      var self = this;
      if (!this.stg) {
        this.stg = {};
        this.time.delayedCall(1600, function () {                       // after the banner and the tiles have settled
          if (!self.pz) { self.pz = { items: [], hit: [], ready: false }; self.stepper('pause', self.pauseSteps(self.pz)); }
          if (!self.mz) { self.mz = { items: [], hit: [], cells: [], labels: [], ready: false }; self.stepper('menu', self.menuSteps(self.mz)); }
        });
      } else this.time.delayedCall(700, function () { if (self.pz && self.pz.ready) self.pauseFill(); if (self.mz && self.mz.ready) self.menuRefresh(false); });
    }
    ensure(key, z) {
      if (z.ready) return;
      if (!this.stg) this.stg = {};
      if (!this.stg[key]) this.stepper(key, key === 'pause' ? this.pauseSteps(z) : this.menuSteps(z));
      this.stg[key].run();
    }
    // everything of a screen is hidden and out of reach of touches until it opens
    hideZ(z) { z.items.forEach(function (o) { o.setVisible(false); }); z.hit.forEach(function (o) { o.disableInteractive(); }); }
    // one frame of drawing at (nearly) no opacity: the engine makes the pictures of the texts now, not when they first show
    warmZ(z) { z.items.forEach(function (o) { o.setVisible(true).setAlpha(0.004); }); }
    showZ(z, dimA) {
      var self = this; z.items.forEach(function (o) { self.tweens.killTweensOf(o); o.setVisible(true).setAlpha(0); }); z.hit.forEach(function (o) { o.setInteractive(); });
      this.tweens.add({ targets: z.items, alpha: function (t) { return t === z.dim ? dimA : 1; }, duration: 160 });
    }
    wrap(t, w) { if (t.style.wordWrapWidth !== w) t.setWordWrapWidth(w); }     // (setting it draws the text again)

    /* ---- the pause screen: pushed over the game (game-ui-ux screen stack) ---- */
    howStr() {
      return this.device === 'touch' ? 'Swipe on the board to slide the tiles  ·  the arrow button goes back a step'
        : 'Arrows or WASD slide  ·  U undo  ·  R restart  ·  Esc pause  ·  M sound  ·  or drag the board with the mouse';
    }
    pauseSteps(p) {
      var self = this, W = this.area(1700, 1100).W, put = function (o) { p.items.push(o); return o; }, fns = [];
      var big = function (i, icon, label, fn, main) {
        return function () {
          var c = self.add.container(0, 0, [self.add.image(0, 0, 'g48ui', main ? 'big' : 'plate').setScale(main ? 0.82 : 1.53), self.add.image(main ? 10 : 0, 0, 'g48ui', icon).setScale(1.4).setTint(main ? 0x2a1606 : 0xffffff)]).setSize(230, 230).setInteractive();
          c.label = self.text(p.root, 0, 0, label, 42, '700');
          c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scaleX: 0.92, scaleY: 0.92, duration: 70, yoyo: true }); }); c.on('pointerup', fn);
          p.root.add(c); p.hit.push(c); p.row[i] = c;
        };
      };
      p.row = [];
      fns.push(function () { p.dim = put(self.dim(0.82)); p.hit.push(p.dim); p.root = put(self.add.container(0, 0)); p.title = self.text(p.root, 0, 0, 'Paused', 80, '800'); });
      fns.push(function () { p.sub = self.text(p.root, 0, 0, 'Level', 42, '700', INK); p.exit = put(self.button('ic-exit', function () { Kit.play.exit(); })); p.hit.push(p.exit); });
      fns.push(big(0, 'ic-play', 'Resume', function () { self.closePause(); }, true));
      fns.push(big(1, 'ic-retry', 'Restart', function () { self.restart(); }));
      fns.push(big(2, 'ic-grid', 'Levels', function () { self.closePause(true); self.openMenu('pause'); }));
      fns.push(big(3, Kit.snd.muted ? 'ic-mute' : 'ic-snd', Kit.snd.muted ? 'Sound off' : 'Sound on', function () { Kit.snd.setMuted(!Kit.snd.muted); p.snd(); }));
      fns.push(function () {
        p.how = self.text(p.root, 0, 0, self.howStr(), 36, '600', INK, { align: 'center', wordWrap: { width: W - 120 } }).setAlpha(0.9); p.howS = self.howStr();
        p.lic = self.text(p.root, 0, 0, 'Based on the game 2048 by Gabriele Cirulli, shared under the MIT licence. Garden art, levels and sounds: Kahf Kids.', 28, '600', INK, { align: 'center', wordWrap: { width: W - 160 } }).setAlpha(0.72);
        p.muted = Kit.snd.muted;
        p.snd = function () { var m = Kit.snd.muted, b = p.row[3]; p.muted = m; b.list[1].setFrame(m ? 'ic-mute' : 'ic-snd'); b.label.setText(m ? 'Sound off' : 'Sound on'); };
      });
      fns.push(function () { p.ready = true; self.pauseFill(); self.pauseLayout(); self.warmZ(p); });   // drawn once, then put away
      fns.push(function () { self.hideZ(p); });
      return fns;
    }
    // the words that follow the level, the sound and the device (text is drawn again only when it changes)
    pauseFill() {
      var p = this.pz, w = LV.WORLDS[S.world], sub = w.name + ' · Level ' + S.n; if (!p || !p.ready || !S.def) return;
      if (p.subS !== sub) { p.subS = sub; p.sub.setText(sub); }
      if (p.subC !== w.color) { p.subC = w.color; p.sub.setColor(w.color); }
      if (p.muted !== Kit.snd.muted) p.snd();
      if (p.howS !== this.howStr()) { p.howS = this.howStr(); p.how.setText(p.howS); }
    }
    openPause() {
      if (this.pause || this.menu || (this.sheet && this.sheet.shown) || !(S.state === 'play' || S.state === 'stuck')) return;
      this.discardSheet();
      var p = this.pz || (this.pz = { items: [], hit: [], ready: false });
      this.ensure('pause', p); this.pauseFill(); this.pauseLayout();
      this.block(1); Kit.snd.play('page');
      this.pause = p; this.showZ(p, 0.82);
    }
    pauseLayout() {
      var p = this.pz, v = this.v, k = this.k, a = this.area(1700, 1100); if (!p || !p.ready || !v) return;
      p.dim.setPosition((v.l + v.r) / 2, (v.t + v.b) / 2).setDisplaySize(v.w + 4, v.h + 4);
      p.exit.setScale(k).setPosition(v.sl + 40 * k + 75 * k, v.st + 40 * k + 75 * k);                    // where the pause button was
      p.root.setScale(k).setPosition(a.cx, a.cy);
      var wide = a.W >= 1450, n = p.row.length, W = a.W;
      this.wrap(p.how, W - 120); this.wrap(p.lic, W - 160);
      if (wide) {
        p.title.setPosition(0, -330); p.sub.setPosition(0, -245);
        p.row.forEach(function (c, i) { c.setPosition((i - (n - 1) / 2) * 320, -20); c.label.setPosition(c.x, 150); });
        p.how.setPosition(0, 270); p.lic.setPosition(0, Math.min(a.H / 2 - 50, 380));
      } else {
        p.title.setPosition(0, -520); p.sub.setPosition(0, -430);
        p.row.forEach(function (c, i) { c.setPosition((i % 2 ? 1 : -1) * 220, -200 + Math.floor(i / 2) * 400); c.label.setPosition(c.x, c.y + 150); });
        p.how.setPosition(0, 430); p.lic.setPosition(0, 600);
      }
    }
    closePause(quiet) {
      var p = this.pause; if (!p) return; this.pause = null;
      this.hideZ(p); this.block(-1);
      if (!quiet && S.state === 'stuck') this.stuck();
    }

    /* ---- the level map: every level of the three gardens, with its stars ---- */
    menuSteps(m) {
      var self = this, put = function (o) { m.items.push(o); return o; }, fns = [];
      fns.push(function () {
        m.dim = put(self.dim(0.78)); m.hit.push(m.dim); m.root = put(self.add.container(0, 0));
        m.card = self.add.nineslice(0, 0, 'g48ui', 'panel', 1500, 1000, 70, 70, 70, 70); m.root.add(m.card);
        m.exit = put(self.button('ic-exit', function () { Kit.play.exit(); })); m.hit.push(m.exit);
        m.close = self.button('ic-close', function () { self.backFromMenu(); }); m.root.add(m.close); m.hit.push(m.close);
        m.title = self.text(m.root, 0, 0, '2048 Garden', 70, '800');
      });
      LV.WORLDS.forEach(function (w, wi) {
        fns.push(function () { m.labels.push(self.text(m.root, 0, 0, w.name, 44, '800', w.color)); });
        for (var n = w.from; n <= w.to; n += 2) fns.push(function (a) {                  // two cells a step
          return function () { for (var q = a; q < a + 2 && q <= w.to; q++) self.menuCell(m, q, wi, w); };
        }(n));
      });
      fns.push(function () { m.ready = true; self.menuRefresh(false, true); self.menuLayout(); self.warmZ(m); });
      fns.push(function () { self.menuRefresh(false); self.hideZ(m); });
      return fns;
    }
    // a cell holds everything it can show (number, stars, lock, outline); menuRefresh picks what is on
    menuCell(m, n, wi, w) {
      var self = this, dark = A.int(A.shade(w.color, -0.55)), c;
      c = this.add.container(0, 0, [this.add.image(0, 0, 'g48ui', 'cell').setTint(dark), this.add.image(0, 0, 'g48ui', 'cello').setTint(A.int(w.color)), this.add.image(0, 0, 'g48ui', 'ic-lock').setScale(0.8)]).setSize(140, 140);
      c.bg = c.list[0]; c.ring = c.list[1]; c.lock = c.list[2];
      c.num = this.text(c, 0, -16, String(n), 62, '800');
      c.sts = [0, 1, 2].map(function (i) { var s = self.add.image((i - 1) * 40, 42, 'g48ui', 'star0').setDisplaySize(36, 36); c.add(s); return s; });
      c.cur = this.add.image(0, 0, 'g48ui', 'cello').setTint(0xffffff).setScale(1.16); c.add(c.cur);
      c.n = n; c.wi = wi; m.root.add(c); m.cells.push(c);
      c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scaleX: 0.92, scaleY: 0.92, duration: 70, yoyo: true }); });
      c.on('pointerup', function () { self.go(n); });
    }
    // stars, locks and the current level, from the saved progress; all = show every part (the one drawing of the pictures)
    menuRefresh(live, all) {
      var m = this.mz, sv = window.G48Save; if (!m || !m.ready) return;
      m.cells.forEach(function (c) {
        var locked = !sv.progress.unlocked(c.n), st = sv.progress.stars(c.n), cur = c.n === S.n;
        c.bg.setAlpha(locked ? 0.25 : 0.7); c.ring.setAlpha(locked ? 0.4 : 1);
        c.lock.setVisible(all || locked); c.num.setVisible(all || !locked); c.cur.setVisible(all || (cur && !locked));
        c.sts.forEach(function (s, i) { s.setFrame(i < st ? 'star' : 'star0').setVisible(all || !locked); });
        if (live) { if (locked) c.disableInteractive(); else c.setInteractive(); }
      });
    }
    openMenu(from) {
      if (this.menu) return;
      var m = this.mz || (this.mz = { items: [], hit: [], cells: [], labels: [], ready: false });
      this.ensure('menu', m); this.menuRefresh(false); this.menuLayout();
      m.from = from; this.block(1); Kit.snd.play('page');
      this.menu = m; this.showZ(m, 0.78); this.menuRefresh(true);
    }
    menuLayout() {
      var m = this.mz, v = this.v, k = this.k, a = this.area(1700, 1400); if (!m || !m.ready || !v) return;
      m.dim.setPosition((v.l + v.r) / 2, (v.t + v.b) / 2).setDisplaySize(v.w + 4, v.h + 4);
      m.root.setScale(k).setPosition(a.cx, a.cy);
      var wide = a.W >= 1450, CW = Math.min(a.W, wide ? 1560 : 1000), CH = Math.min(a.H, wide ? 960 : 1260), top = -CH / 2;
      m.card.setSize(CW, CH);
      m.exit.setScale(k).setPosition(this.v.sl + 40 * k + 75 * k, this.v.st + 40 * k + 75 * k);
      m.close.setPosition(CW / 2 - 105, top + 110); m.title.setPosition(0, top + 110);
      LV.WORLDS.forEach(function (w, wi) {
        var lab = m.labels[wi];
        if (wide) {
          var y = top + 330 + wi * ((CH - 420) / 3);
          lab.setOrigin(0, 0.5).setPosition(-CW / 2 + 90, y);
          m.cells.filter(function (c) { return c.wi === wi; }).forEach(function (c, i) { c.setPosition(170 + (i - 1.5) * 190, y); });
        } else {
          var y0 = top + 290 + wi * 330;
          lab.setOrigin(0.5).setPosition(0, y0);
          m.cells.filter(function (c) { return c.wi === wi; }).forEach(function (c, i) { c.setPosition((i - 1.5) * 200, y0 + 135); });
        }
      });
    }
    // closing the map: back to where it was opened from (the stack pops)
    backFromMenu() {
      var m = this.menu; if (!m) return; var from = m.from;
      this.hideZ(m); this.menu = null; this.block(-1);
      if (from === 'pause') this.openPause();
      else if (S.state === 'clear') this.go(Math.min(window.G48Save.count, S.n + 1));
      else if (S.state === 'stuck') this.stuck();
    }

    /* ---- sheets: goal reached, and no moves left ----
       A sheet is built in three small steps while the win or the stuck sound plays (a frame must stay short on a budget
       phone: ten Text objects at once cost over 100 ms), hidden and not touchable; showSheet() then only fades it in. */
    wonOpts(stars) {
      var self = this, sv = window.G48Save, last = S.n === sv.count, endW = S.n === LV.WORLDS[S.world].to, goal = S.def.goal, b = [];
      if (!last) b.push({ label: endW ? 'Next Garden' : 'Next Level', icon: 'ic-next', primary: true, fn: function () { self.go(S.n + 1); } });
      b.push({ label: last ? 'Play Again' : 'Replay', icon: 'ic-retry', primary: last, fn: function () { self.go(last ? 1 : S.n); } });
      b.push({ label: 'Levels', icon: 'ic-grid', fn: function () { self.closeSheet(); self.openMenu('sheet'); } });
      return { title: last ? 'All gardens done!' : endW ? LV.WORLDS[S.world].name + ' done!' : 'Goal reached!',
        text: last ? 'You made 256 on the big tray. MashaAllah!' : 'You made ' + goal + ' in ' + S.moves + (S.moves === 1 ? ' move.' : ' moves.'), stars: stars, buttons: b };
    }
    stuckOpts() {
      var self = this, can = S.undos > 0 && S.hist.length > 0, b = [];
      if (can) b.push({ label: 'Undo (' + S.undos + ' left)', icon: 'ic-undo', primary: true, fn: function () { if (self.garden().undo()) self.closeSheet(); } });
      b.push({ label: can ? 'Retry' : 'Try Again', icon: 'ic-retry', primary: !can, fn: function () { self.restart(); } });
      b.push({ label: 'Levels', icon: 'ic-grid', fn: function () { self.closeSheet(); self.openMenu('sheet'); } });
      return { title: 'No moves left', text: can ? 'The tray is full. Go back a step and try another way!' : 'The tray is full. Let\'s start this garden again!', buttons: b };
    }
    // the game says a level ended (state clear or stuck): get the sheet ready, a step at a time
    onEnd(d) {
      if (this.pause || this.menu) return;
      this.discardSheet();
      var s = this.sheet = { items: [], o: d.kind === 'won' ? this.wonOpts(d.stars) : this.stuckOpts(), btns: [], stage: 0, shown: false }, self = this;
      s.total = 4 + s.o.buttons.length;
      for (var n = 1; n <= s.total; n++) (function (n) { self.time.delayedCall(100 + (n - 1) * 90, function () { self.sheetStage(s, n); }); })(n);
    }
    sheetStage(s, n) {
      if (this.sheet !== s || s.stage >= n) return;
      var self = this, o = s.o, put = function (x) { s.items.push(x); return x; };
      if (n === 1) {
        s.dim = put(this.dim(0.6).setAlpha(0).disableInteractive()); s.root = put(this.add.container(0, 0).setAlpha(0));
        s.panel = this.add.nineslice(0, 0, 'g48ui', 'panel', 1000, 800, 70, 70, 70, 70); s.root.add(s.panel);
      } else if (n === 2) s.title = this.text(s.root, 0, 0, o.title, 72, '800', '#fffaf0');
      else if (n === 3) s.text = this.text(s.root, 0, 0, o.text, 42, '600', INK, { align: 'center' });
      else if (n === 4) {
        if (o.stars != null) s.stars = [0, 1, 2].map(function (i) {
          var im = self.add.image(0, 0, 'g48ui', i < o.stars ? 'star' : 'star0'); s.root.add(im);
          if (i < o.stars) im.setScale(0); else im.setScale(1.4).setAlpha(0.8);
          return im;
        });
      } else {
        var b = o.buttons[n - 5];                                                   // one button a stage
        s.btns.push(this.pill(s.root, 0, 0, 100, 140, b.label, b.icon, b.primary, b.fn, true)); if (b.primary) s.primary = b.fn;
        if (n === s.total && !s.primary) s.primary = function () { };
      }
      s.stage = n; this.sheetLayout();
    }
    showSheet() {
      var self = this, s = this.sheet; if (!s || s.shown) return;
      while (s.stage < s.total) this.sheetStage(s, s.stage + 1);
      s.shown = true; this.block(1); Kit.snd.play('page');
      s.dim.setInteractive(); s.btns.forEach(function (c) { c.setInteractive(); });
      this.tweens.add({ targets: s.dim, alpha: 0.6, duration: 220 }); this.tweens.add({ targets: s.root, alpha: 1, duration: 220 });
      if (s.stars) s.stars.forEach(function (im, i) {
        if (i < s.o.stars) self.tweens.add({ targets: im, scale: 1.4, duration: 300, delay: 350 + i * 260, ease: 'Back.easeOut', onStart: function () { Kit.snd.play('star'); } });
      });
    }
    // the sheet at once (coming back from the pause screen or the levels map)
    openSheet(o) {
      this.discardSheet();
      var s = this.sheet = { items: [], o: o, btns: [], stage: 0, shown: false, total: 4 + o.buttons.length };
      this.showSheet();
    }
    discardSheet() { var s = this.sheet; if (!s) return; this.sheet = null; s.items.forEach(function (o) { o.destroy(); }); if (s.shown) this.block(-1); }
    won(d) { if (!this.sheet && !this.pause && !this.menu) this.openSheet(this.wonOpts(d && d.stars)); else this.showSheet(); }
    stuck() {
      if (this.pause || this.menu || S.state !== 'stuck') return;
      if (this.sheet && !this.sheet.shown) { this.showSheet(); return; }
      if (!this.sheet) this.openSheet(this.stuckOpts());
    }
    sheetLayout() {
      var s = this.sheet, v = this.v, k = this.k, a = this.area(1700, 1100); if (!s || !v || !s.root) return;
      s.dim.setPosition((v.l + v.r) / 2, (v.t + v.b) / 2).setDisplaySize(v.w + 4, v.h + 4);
      s.root.setScale(k).setPosition(a.cx, a.cy);
      var o = s.o, SW = Math.min(a.W, 1100), hasS = o.stars != null, PH = hasS ? 820 : 650;
      var wrap = function (t, w) { if (t.style.wordWrapWidth !== w) t.setWordWrapWidth(w); };      // (setting it draws the text again)
      s.panel.setSize(SW, PH).setPosition(0, 0);
      if (s.title) { s.title.setPosition(0, -PH / 2 + 90); wrap(s.title, SW - 100); }
      if (s.text) { s.text.setPosition(0, -PH / 2 + 195); wrap(s.text, SW - 140); }
      if (s.stars) s.stars.forEach(function (st, i) { st.setPosition((i - 1) * 190, -PH / 2 + 345 - (i === 1 ? 20 : 0)); });
      if (!s.btns.length) return;
      var by = -PH / 2 + (hasS ? 520 : 360), pw = Math.min(SW - 120, 640), sec = s.btns.slice(1), pr = s.btns[0];
      var wide = function (c, w) { c.bg.setSize(w, 140); c.setSize(w, 140); c.getAt(1).setX(-w / 2 + 84); c.label.setX(46); };
      wide(pr, pw); pr.setPosition(0, by);
      var sw2 = Math.min((SW - 120 - 40) / Math.max(1, sec.length), 380);
      sec.forEach(function (c, i) { wide(c, sw2); c.setPosition((i - (sec.length - 1) / 2) * (sw2 + 40), by + 175); });
    }
    closeSheet() { this.discardSheet(); }
  }

  window.G48Hud = Hud;
})();
