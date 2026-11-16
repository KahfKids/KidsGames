/* Hextris (Kahf Kids edition): game/ingame.js, the interface while playing: it lives IN the Play scene.
   (docs/phaser-standard.md section 4a; the game-ui-ux and input-systems skills.) While playing, the screen is the game: one
   pause button in the top-left corner and, beside it, only what the player needs: the hearts left and how far the goal is
   (the goal is also drawn in the world, as a ring that fills round the basin's rim, and the combo as a golden line round the
   limit: play.js). The game's own screens (pause, level map, results) are the 'Hud' scene (hud.js), which sleeps until one is
   open: a scene of its own costs a camera pass every frame, measured, so nothing is kept awake for the screens.
   Controls: tap the left or right half of the screen to turn the medallion (one scene handler, no interactive objects), or the arrow keys /
   A D; Down speeds the fall up, Space or Esc pauses, R restarts, M switches sound. On a touch screen two quiet, see-through
   rings with a turn arrow stay at the bottom corners (never hidden), bright while pressed; prompts follow the device last
   used. The first level teaches the controls until each side has been used. All Phaser: pictures from the 'hx-ui' sheet, tweens for every fade and pulse; nothing runs per frame. */
(function () {
  'use strict';
  var A = window.HexArt, UI = window.HexUI, GAP = UI.GAP, REST = 0.6, FONT = 'system-ui, sans-serif', DEPTH = 40;
  var num = function (n) { return n.toLocaleString(); };

  function InGame(sc) {
    var self = this; this.sc = sc;
    this.touch = sc.sys.game.device.input.touch; UI.device = this.touch ? 'touch' : 'keys';
    this.hd = []; this.hints = null; this.hintsOn = false; this.tL = 0; this.tR = 0; this.info = null; this.lastHud = ''; this.hearts = null; this.gBar = null; this.an = null;

    // The touch halves and the pause button are NOT interactive objects: the engine hit-tests every interactive object on every
    // finger move (measured: a drag cost more than all the rest of play), and play needs none: one handler on the scene's
    // pointerdown says which half was touched, or whether the pause button's disc was.
    // two quiet rings with the turn arrows: always at their home on a touch screen, bright while used
    var ring = function (arrow) { return sc.add.container(0, 0, [sc.add.image(0, 0, 'hx-ui', 'rot'), sc.add.image(0, 0, 'hx-ui', arrow).setScale(1.5)]).setAlpha(REST).setDepth(DEPTH); };
    this.rotL = ring('ic-rotl'); this.rotR = ring('ic-rotr');
    this.bP = UI.button(sc, 'ic-pause', null, true).setDepth(DEPTH);
    sc.input.on('pointerdown', function (p) {
      if (UI.open || !self.v) return;
      self.setDevice(p.wasTouch ? 'touch' : 'keys');
      var w = sc.cameras.main.getWorldPoint(p.x, p.y), k = self.k;
      if (Math.hypot(w.x - self.bP.x, w.y - self.bP.y) < 75 * k * 1.15) {                  // the pause button (a little generous for a finger)
        Kit.snd.play('tap'); sc.tweens.add({ targets: self.bP, scale: 0.9 * k, duration: 70, yoyo: true }); self.pause();
      } else self.turn(w.x < self.v.l + self.v.w / 2 ? -1 : 1, p);
    });

    var K = this.keys = sc.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,R,ESC,M');
    sc.input.keyboard.on('keydown', function () { if (!UI.open) self.setDevice('keys'); });
    var key = function (f) { return function (k, e) { if (!UI.open && !(e && e.repeat)) f.call(self); }; };
    K.LEFT.on('down', key(function () { this.turn(-1); })); K.A.on('down', key(function () { this.turn(-1); }));
    K.RIGHT.on('down', key(function () { this.turn(1); })); K.D.on('down', key(function () { this.turn(1); }));
    K.ESC.on('down', key(this.pause)); K.SPACE.on('down', key(this.pause));
    K.R.on('down', key(function () { if (sc.state !== 'idle') this.hud().restart(); }));
    K.M.on('down', key(function () { Kit.snd.setMuted(!Kit.snd.muted); }));
    var fast = function () { sc.fast = !!(K.DOWN.isDown || K.S.isDown); };
    [K.DOWN, K.S].forEach(function (k) { k.on('down', fast); k.on('up', fast); });
    sc.game.events.on('hidden', function () { if (!UI.open && sc.state === 'play') self.pause(); });
  }
  var P = InGame.prototype;
  P.hud = function () { return this.sc.scene.get('Hud'); };
  P.pause = function () { if (!UI.open) this.hud().show('pause'); };

  P.layout = function (v) {
    var k = this.k = UI.k(v);
    this.bP.base = k; this.bP.setScale(k).setPosition(v.sl + 40 + 75 * k, v.st + 40 + 75 * k);
    this.rotL.base = this.rotR.base = k * 0.85;
    this.rotL.setScale(k * 0.85).setPosition(v.sl + 40 + 110 * k, v.sb - 40 - 110 * k); this.rotR.setScale(k * 0.85).setPosition(v.sr - 40 - 110 * k, v.sb - 40 - 110 * k);
    this.v = v; this.build();
    if (this.hints) this.hintsMake();
  };
  // shown while playing; hidden (and not touchable) while a screen is open
  P.show = function (on) {
    var t = UI.device === 'touch' && on;
    this.rotL.setVisible(t); this.rotR.setVisible(t); this.bP.setVisible(on);
    this.hd.forEach(function (o) { o.setVisible(on); });
    if (this.gBar && on && this.info) this.gBar.setVisible(this.info.have > 0);
    if (this.an) this.an.setVisible(on);
    this.hintsMake();
  };
  P.setDevice = function (d) {
    if (d === UI.device) return; UI.device = d; this.show(!UI.open);
    var h = this.hud(); if (UI.open && h.top() && h.top().name === 'pause') h.render();
  };

  // ---------- hearts and goal, in one quiet pill beside the pause button ----------
  P.build = function () {
    var sc = this.sc, self = this, v = this.v, k = this.k, i, info = this.info;
    this.hd.forEach(function (o) { o.destroy(); }); this.hd = []; this.lastHud = '';
    var endless = !!(info && info.endless), x0 = this.bP.x + 75 * k + GAP, y = this.bP.y;
    var put = function (o) { o.setDepth(DEPTH); self.hd.push(o); return o; };
    put(sc.add.image(x0, y, 'hx-ui', endless ? 'pillE' : 'pillG').setOrigin(0, 0.5).setScale(k));
    this.hearts = []; for (i = 0; i < 3; i++) this.hearts.push(put(sc.add.image(x0 + (36 + 32 + i * 64) * k, y, 'hx-ui', 'heart').setScale(0.58 * k)));
    var gx = x0 + (36 + 192 + 28) * k;
    this.gIcon = put(sc.add.image(gx + 26 * k, y, 'hx-ui', 'star').setScale(0.52 * k));
    this.gText = put(sc.add.text(gx + 64 * k, endless ? y : y - 14 * k, '', { fontFamily: FONT, fontSize: Math.round(42 * k) + 'px', fontStyle: '800', color: '#f2f7f6' }).setOrigin(0, 0.5));
    this.gBar = null;
    if (!endless) {
      put(sc.add.image(gx + 64 * k, y + 34 * k, 'hx-ui', 'barT').setOrigin(0, 0.5).setScale(k));
      this.gBar = put(sc.add.image(gx + 64 * k, y + 34 * k, 'hx-ui', 'barF').setOrigin(0, 0.5).setScale(k));        // (cropped to how far the goal is)
    }
    if (info) this.hudSet(info);
    this.show(!UI.open);
  };
  P.hudSet = function (info) {
    var self = this;
    this.info = info;
    if (!this.hearts || (!!this.gBar === !!info.endless)) { if (this.v) this.build(); return; }   // (the pill is made for endless or goal levels)
    var key = [info.lives, info.have, info.need, info.type].join('|');
    if (key === this.lastHud) return; this.lastHud = key;
    this.hearts.forEach(function (h, i) {
      var on = i < info.lives, was = h.frame.name === 'heart';
      h.setFrame(on ? 'heart' : 'heart0'); if (was && !on) self.sc.tweens.add({ targets: h, scale: { from: 0.58 * self.k * 1.5, to: 0.58 * self.k }, duration: 350, ease: 'Back.easeOut' });
    });
    this.gIcon.setFrame(info.type === 'groups' ? 'group' : 'star');
    if (info.endless) this.gText.setText(num(info.score));
    else {
      this.gText.setText(num(Math.min(info.have, info.need)) + ' / ' + num(info.need));
      this.gBar.setCrop(0, 0, Math.max(14, 230 * Math.min(1, info.have / info.need)), 14).setVisible(info.have > 0 && !UI.open);
    }
  };

  // ---------- a level starts: its name, once, large and gone; the first level teaches the controls ----------
  P.levelStart = function (info) {
    var sc = this.sc, self = this; this.lastHud = '';
    if (this.an) { sc.tweens.killTweensOf(this.an); this.an.destroy(); this.an = null; }
    var W = A.WORLDS[info.world], ku = Phaser.Math.Clamp(sc.fs / 1.9, 0.8, 2), x = sc.cx, y = sc.cy - 0.55 * 204 * sc.fs;
    var sub = info.endless ? 'Best ' + num(info.best || 0) : W.name.toUpperCase();
    var c = this.an = sc.add.container(x, y, [
      UI.text(sc, sub, 0, -78 * ku, 38 * ku, 800, W.color),
      UI.text(sc, info.endless ? 'Endless' : 'Level ' + info.level, 0, 0, 96 * ku, 900, '#fffaf0'),
      UI.text(sc, info.endless ? '' : info.name, 0, 76 * ku, 44 * ku, 800, '#fffaf0')]).setAlpha(0).setDepth(DEPTH + 1);
    c.list.forEach(function (t) { t.setStroke('rgba(10,6,30,.6)', 10 * ku).setShadow(0, 4, 'rgba(0,0,0,.4)', 14); });
    sc.tweens.chain({ targets: c, tweens: [{ alpha: 1, duration: 350 }, { alpha: 1, duration: 1000 }, { alpha: 0, duration: 650, onComplete: function () { c.destroy(); if (self.an === c) self.an = null; } }] });
    this.tL = this.tR = 0; this.hintsOn = !info.endless && info.level === 1; this.hintsMake();
  };
  P.hintsMake = function () {
    var sc = this.sc, self = this, v = this.v, k = this.k;
    if (this.hints) { this.hints.forEach(function (h) { sc.tweens.killTweensOf(h); h.destroy(); }); this.hints = null; }
    if (!v || !this.hintsOn || UI.open) return;
    if ((this.tL && this.tR) || this.tL + this.tR >= 4) { this.hintsOn = false; return; }
    var tip = { fontFamily: FONT, fontSize: Math.round(42 * k) + 'px', fontStyle: '700', color: '#f2f7f6', backgroundColor: 'rgba(8,18,20,0.78)', padding: { x: 28 * k, y: 14 * k }, align: 'center' };
    if (UI.device === 'touch') {
      var r1 = sc.add.image(this.rotL.x, this.rotL.y, 'hx-ui', 'ring').setScale(k), r2 = sc.add.image(this.rotR.x, this.rotR.y, 'hx-ui', 'ring').setScale(k);
      var t1 = sc.add.text(this.rotL.x - 130 * k, this.rotL.y - 190 * k, 'Tap left', tip).setOrigin(0, 1), t2 = sc.add.text(this.rotR.x + 130 * k, this.rotR.y - 190 * k, 'Tap right', tip).setOrigin(1, 1);
      this.hints = [r1, r2, t1, t2];
      [r1, r2].forEach(function (r) { sc.tweens.add({ targets: r, scale: { from: 1.1 * k, to: 1.55 * k }, alpha: { from: 0.9, to: 0 }, duration: 1100, repeat: -1 }); });
      [t1, t2].forEach(function (t) { sc.tweens.add({ targets: t, y: '-=10', duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); });
      r1.setVisible(!this.tL); t1.setVisible(!this.tL); r2.setVisible(!this.tR); t2.setVisible(!this.tR);
    } else {
      this.hints = [sc.add.text(v.sl + 40, v.sb - 40, 'Arrow keys or A D\nturn the medallion', Object.assign({}, tip, { fontSize: Math.round(38 * k) + 'px', align: 'left' })).setOrigin(0, 1)];
    }
    this.hints.forEach(function (h) { h.setDepth(DEPTH); });
  };
  // a side was used: its prompt goes; when both have been used the lesson is over
  P.turn = function (dir, p) {
    if (UI.open) return;
    if (p && p.wasTouch) this.setDevice('touch');
    if (!this.sc.turn(dir)) return;
    if (dir < 0) this.tL++; else this.tR++;
    var c = dir < 0 ? this.rotL : this.rotR;
    this.sc.tweens.killTweensOf(c); c.setScale(0.86 * c.base).setAlpha(1);
    this.sc.tweens.add({ targets: c, scale: c.base, alpha: REST, duration: 260 });
    if (this.hints) this.hintsMake();
  };

  window.HexInGame = InGame;
})();
