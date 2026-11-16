/* Mosaic Breaker: the interface, in two parts (laid out by the game-ui-ux skill and docs/phaser-standard.md section 4a), both in the
   1920 x 1080 design space of Kit.play.fit.
   1. Live (BrLive): what the child sees and touches WHILE PLAYING, drawn by the field's own scene (play.js makes one per level).
      Being in the same scene it is part of the same batch: one scene, one draw call, no second scene to step and render every frame
      (a separate interface scene measured a fifth of the whole frame). While playing, the screen is the game:
      - one pause button, top-left in the safe area, on a dark plate (it never fades);
      - only the progress the player needs, in the side margins beside the field, never over it: the hearts in a row beside
        the pause button and, top-right, the score and the level;
      - the controls are the world itself: drag anywhere and the carpet follows (a mouse just moves), let go to launch the
        star; arrows or A / D move, Space launches. So there are no on-screen buttons to hide. The first level teaches them in
        the words of the device last used (touch, or mouse and keys) until each has been done once, and the pause screen
        repeats them.
   2. Hud (scene 'Hud'): everything else is a stack of screens pushed over the paused game (game-ui-ux section 4): the pause
      screen (resume, restart, levels, sound, the way out), the level map (30 levels in three worlds, with stars), the
      level-complete and out-of-hearts sheets. Only the top screen takes input; the Play scene is paused while any screen is
      up. The Hud scene sleeps while there is no screen (nothing to draw, nothing to step) and wakes when one is pushed.
   Input is actions, not keys (input-systems): `in` = { aim: x to move the carpet to (or null), kx: -1..1 held keys, launch:
   a press, device: 'touch' or 'desk', moved: the player has dragged once } in the registry, written by Live and read by the
   Play scene. All Phaser: images painted once, Zones, tweens. */
(function () {
  'use strict';
  var L = BrArt.L, WORLDS = BrArt.WORLDS, COUNT = 30, GAP = 36, FONT = 'system-ui, sans-serif';
  var sfx = function (n, o) { Kit.snd.play(n, o); };
  var fmt = function (n) { return n.toLocaleString('en-US'); };
  function tint(col, k) { var m = BrArt.shade(col, k).match(/\d+/g); return (+m[0] << 16) | (+m[1] << 8) | +m[2]; }
  function tx(scene, x, y, s, size, weight, color, o) {
    return scene.add.text(x, y, s, Object.assign({ fontFamily: FONT, fontSize: size + 'px', fontStyle: weight || '700', color: color || '#f6f1ff' }, o || {})).setOrigin(0.5);
  }

  // ---------------------------------------------------------------- Live: the interface while playing (a part of the Play scene)
  var DEPTH = 100;
  class Live {
    constructor(sc, info) {
      var self = this, inp = this.inp = sc.registry.get('in');
      this.sc = sc; this.v = sc.view; this.info = info; this.drag = -1; this.lastAim = null; this.kx = 0; this.hint = null; this.hintFresh = true; this.lives = info.lives;
      if (!inp.device) inp.device = sc.sys.game.device.input.touch ? 'touch' : 'desk';
      this.launched = !info.teach;
      // everything drawn here sits in one container, moved against the camera's shake each frame, so only the field shakes
      this.root = sc.add.container(0, 0).setDepth(DEPTH);
      sc.events.on('prerender', this.unshake, this); sc.events.once('shutdown', function () { sc.events.off('prerender', self.unshake, self); });

      // the whole screen is the pad: drag anywhere to move the carpet (a Zone behind the pause button, which gets its own touches)
      this.zone = sc.add.zone(0, 0, 10, 10).setOrigin(0).setInteractive();
      this.zone.on('pointerdown', function (p) { self.drag = p.id; self.setDevice(p.wasTouch ? 'touch' : 'desk'); self.aim(p); });
      sc.input.on('pointermove', function (p) {
        if (p.id === self.drag) self.aim(p);
        else if (!p.wasTouch && !p.isDown) { self.setDevice('desk'); self.aim(p); }          // a mouse just moves the carpet
      });
      var up = function (p) { if (p.id === self.drag) { self.drag = -1; inp.launch = 1; } };
      sc.input.on('pointerup', up); sc.input.on('pointerupoutside', up);

      // while playing: one pause button, the hearts, the score and level
      this.bPause = sc.add.image(0, 0, 'sprites', 'btn-pause').setInteractive(); this.root.add(this.bPause);       // (one picture: plate and bars)
      this.bPause.on('pointerdown', function () { sfx('tap'); sc.tweens.add({ targets: self.bPause, scale: self.bPause.scale * 0.9, duration: 70, yoyo: true }); });
      this.bPause.on('pointerup', function () { sc.scene.get('Hud').openPause(); });
      this.hearts = []; for (var i = 0; i < 5; i++) this.hearts.push(sc.add.image(0, 0, 'sprites', 'heart0').setVisible(false));
      this.root.add(this.hearts);
      this.pill = sc.add.image(0, 0, 'sprites', 'pill'); this.root.add(this.pill);
      this.score = BrArt.Num(sc, 'n', 9).set(fmt(info.score)); this.lvl = tx(sc, 0, 0, 'Level ' + info.n, 32, '700'); this.root.add([this.score, this.lvl]);

      // keys -> the same actions
      var K = this.keys = sc.input.keyboard.addKeys('A,D,LEFT,RIGHT,UP,SPACE,R,ESC,P,M');
      var launch = function () { self.setDevice('desk'); inp.launch = 1; };
      K.SPACE.on('down', launch); K.UP.on('down', launch);
      [K.A, K.D, K.LEFT, K.RIGHT].forEach(function (k) { k.on('down', function () { self.setDevice('desk'); self.used(); }); });
      K.R.on('down', function () { sc.scene.get('Hud').go(info.n); });
      K.M.on('down', function () { Kit.snd.setMuted(!Kit.snd.muted); });
      var esc = function () { sc.scene.get('Hud').openPause(); };
      K.ESC.on('down', esc); K.P.on('down', esc);

      this.setLives(info.lives, 0);
      this.hintMake();
      this.banner(info);
    }
    // just before the camera draws (its shake for this frame is known): move the interface against it, so only the field shakes
    unshake() {
      var e = this.sc.cameras.main.shakeEffect;                  // (its offset is in world units: the camera matrix applies it after the zoom)
      if (e.isRunning) { this.root.setPosition(-e._offsetX, -e._offsetY); this.shook = true; }
      else if (this.shook) { this.root.setPosition(0, 0); this.shook = false; }
    }
    layout(v) {
      this.v = v;
      var u = v.u, m = 40 * u, gap = GAP * u, port = v.port, self = this;
      this.zone.setPosition(v.l, v.t).setSize(v.w, v.h); this.zone.input.hitArea.setSize(v.w, v.h);
      // anchored to the safe area, everything scaled by v.u (so a button is at least about 56 screen points upright):
      // the pause button top-left with the hearts in a row beside it, the score and level top-right (as the old game)
      var px = v.sl + m + 75 * u, py = v.st + m + 75 * u;
      this.bPause.setPosition(px, py).setScale(u);
      this.hearts.forEach(function (h, i) {
        h.setPosition(px + 75 * u + gap + 40 * u + i * 90 * u, py);                                // one row beside the pause button, as the old game's
        h.setScale(u);
      });
      var rx = v.sr - m - 130 * u;
      this.pill.setPosition(rx, py).setDisplaySize(260 * u, 150 * u);
      this.score.base = 0.54 * u; this.score.setScale(this.score.base).setPosition(rx, py - 20 * u);
      this.lvl.setFontSize(Math.round(32 * u)).setPosition(rx, py + 36 * u);
    }
    // (a screen was opened or closed: the touch in progress is let go, the pause button is hidden while a screen has its own exit)
    rest(on) {
      this.drag = -1; this.inp.aim = null; this.inp.launch = 0; this.kx = 0; this.inp.kx = 0;
      for (var k in this.keys) this.keys[k].reset();                                  // (a key let go while the field was paused is not still held)
      if (on !== undefined) this.bPause.setVisible(on);
    }

    aim(p) {
      var x = p.worldX; this.inp.aim = x;
      if (this.lastAim === null) this.lastAim = x; else if (Math.abs(x - this.lastAim) > 60) this.used();
    }
    setDevice(d) { var inp = this.inp; if (d === inp.device) return; inp.device = d; if (this.hint) this.hintMake(); }
    used() { if (this.inp.moved) return; this.inp.moved = true; if (this.hint) this.hintMake(); }
    onLaunched() { this.launched = true; this.hintMake(); }
    update(dt) {
      var K = this.keys;
      if (K.LEFT.isDown || K.A.isDown) this.kx = Math.max(-1, this.kx - dt * 6); else if (K.RIGHT.isDown || K.D.isDown) this.kx = Math.min(1, this.kx + dt * 6); else this.kx = 0;
      this.inp.kx = this.kx;
    }

    // the level's name: three lines that rise in and fade
    banner(info) {
      var sc = this.sc, W_ = WORLDS[info.world], u = this.v.u, st = { stroke: 'rgba(10,6,30,.55)', strokeThickness: 12 }, y0 = L.CARPET_Y - 258;
      var a = tx(sc, 960, y0 - 76, W_.name.toUpperCase(), 40, '800', W_.color, { stroke: 'rgba(10,6,30,.55)', strokeThickness: 8 });
      var b = tx(sc, 960, y0, 'Level ' + info.n, 100, '900', '#fffaf0', st);
      var c = tx(sc, 960, y0 + 78, info.name, 44, '800', '#fffaf0', { stroke: 'rgba(10,6,30,.55)', strokeThickness: 8 });
      this.root.add([a, b, c]);
      [a, b, c].forEach(function (o, i) { o.setScale(u).setAlpha(0).setY(o.y + 24); sc.tweens.chain({ targets: o, tweens: [{ alpha: 1, y: o.y - 24, duration: 380, delay: 150 + i * 70, ease: 'Back.easeOut' }, { alpha: 0, duration: 450, delay: 1100 }], onComplete: function () { o.destroy(); } }); });
    }
    // the first level teaches the controls (level-design: a teach beat) in the words of the device in use, until each is done
    hintMake() {
      var sc = this.sc, inp = this.inp;
      if (this.hint) { this.hint.forEach(function (h) { sc.tweens.killTweensOf(h); h.destroy(); }); this.hint = null; }
      if (this.launched || !this.v) return;
      var u = this.v.u, tip = { fontFamily: FONT, fontSize: '42px', fontStyle: '700', color: '#fff', backgroundColor: 'rgba(13,11,36,0.8)', padding: { x: 30, y: 16 }, align: 'center', wordWrap: { width: 900 } };
      var s = inp.device === 'touch' ? (inp.moved ? 'Let go to launch' : 'Drag to move  \u00b7  Let go to launch') : (inp.moved ? 'Click or press Space to launch' : 'Mouse or arrow keys to move  \u00b7  Click or Space to launch');
      var t = sc.add.text(960, L.CARPET_Y - 90, s, tip).setOrigin(0.5, 1).setScale(u).setAlpha(0);
      this.root.add(t); this.hint = [t];
      var wait = this.hintFresh ? 2000 : 0; this.hintFresh = false;                                // (the first time: after the level's banner has gone)
      sc.tweens.add({ targets: t, alpha: 1, delay: wait, duration: 400 });
      if (inp.device === 'touch' && !inp.moved) {
        var h = sc.add.image(0, L.CARPET_Y + 60 * u, 'sprites', 'touch').setScale(u).setAlpha(0); this.root.add(h); this.hint.push(h);
        sc.tweens.add({ targets: h, alpha: 1, delay: wait, duration: 400 });
        sc.tweens.add({ targets: h, x: { from: 960 - 190, to: 960 + 190 }, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: wait });
      }
    }

    // hearts and score (driven by the field's rules)
    setLives(n, d) {
      this.lives = n; var sc = this.sc, u = this.v ? this.v.u : 1, shown = Math.max(3, n);
      this.hearts.forEach(function (h, i) {
        h.setVisible(i < shown); var was = h.frame.name, now = i < n ? 'heart' : 'heart0';
        if (was !== now) { h.setFrame(now); if (d) sc.tweens.add({ targets: h, scale: { from: (d > 0 ? 1.5 : 0.6) * u, to: u }, duration: 320, ease: 'Back.easeOut' }); }
        else if (!d) h.setFrame(now);
      });
    }
    setScore(s, bump) {
      this.score.set(fmt(s));
      if (bump) { var b0 = this.score.base || 1, sc = this.sc; sc.tweens.killTweensOf(this.score); this.score.setScale(b0 * 1.18); sc.tweens.add({ targets: this.score, scale: b0, duration: 200, ease: 'Sine.easeOut' }); }
    }
  }

  // ---------------------------------------------------------------- Hud: the screens
  class Hud extends Phaser.Scene {
    constructor() { super({ key: 'Hud' }); }
    create() {
      var self = this, inp = this.inp = this.registry.get('in');
      this.stack = []; this.info = null;

      // the game's events
      var ev = this.game.events, on = function (k, f) { ev.on(k, f, self); self.events.once('shutdown', function () { ev.off(k, f, self); }); };
      on('mb-start', this.levelStart);
      on('mb-won', this.levelWon); on('mb-fail', this.levelFail);
      on('mb-reorient', function () { if (self.info) self.go(self.info.n); });          // the screen turned: the field is laid out again
      on('hidden', function () { if (!self.stack.length && self.info) self.openPause(); });          // the page was hidden: wait on the pause screen

      // keys while a screen is up (while playing, the Play scene's Live reads them)
      var K = this.keys = this.input.keyboard.addKeys('ESC,P,M');
      K.M.on('down', function () { if (self.stack.length) { Kit.snd.setMuted(!Kit.snd.muted); self.soundRefresh(); } });
      var esc = function () { var t = self.top(); if (t && t.kind === 'pause') self.pop(); else if (t && t.kind === 'map' && t.canClose) self.pop(); };
      K.ESC.on('down', esc); K.P.on('down', esc);

      Kit.play.fit(this, function (v) { self.layout(v); });
      var lv = this.registry.get('lv'); if (lv) this.info = lv;                                      // (the field may have started first)
      if (Kit.play.debug) Kit.play.debug.hud = this;
      this.scene.sleep();                                                                              // nothing to show until a screen is pushed
    }

    // a round button: a dark plate (readable on any backdrop) and its icon; it answers the touch at once
    button(icon, fn, plate) {
      var self = this, c = this.add.container(0, 0, [this.add.image(0, 0, 'sprites', plate || 'plate'), this.add.image(0, 0, 'sprites', icon)]);
      c.icon = c.list[1]; c.setSize(150, 150).setInteractive();
      c.on('pointerdown', function () { sfx('tap'); self.tweens.add({ targets: c, scale: c.scale * 0.9, duration: 70, yoyo: true }); });
      c.on('pointerup', fn); return c;
    }
    layout(v) {
      v.port = this.scale.height > this.scale.width;                // the kit's plain fit: screens are never zoomed in
      v.u = 48 * Kit.play.dpr() / (150 * v.z);                     // the exit button as big as the pause button it replaces (48 points)
      this.v = v;
      this.stack.forEach(function (s) { s.layout(); });
    }
    levelStart(info) { this.info = info; }
    live() { var p = this.scene.get('Play'); return p && p.live; }

    // ---------------------------------------------------------------- the screen stack
    top() { return this.stack[this.stack.length - 1]; }
    // push a screen: the field is paused under any screen; the screen below is hidden (the top one takes the input)
    push(s) {
      var below = this.top(); if (below) below.show(false); else { this.pauseGame(true); this.scene.wake(); this.scene.bringToTop(); }
      this.rest(false); this.stack.push(s); s.layout();
      return s;
    }
    pop() {
      var s = this.stack.pop(); if (!s) return; s.destroy();
      var t = this.top(); if (t) t.show(true); else { this.pauseGame(false); this.scene.sleep(); }
      this.rest(!t);
    }
    rest(on) { var l = this.live(); if (l) l.rest(on); else { this.inp.aim = null; this.inp.launch = 0; } }
    pauseGame(on) { if (on) this.scene.pause('Play'); else this.scene.resume('Play'); }
    // a screen: its content is a Container (positions are in content units around the view's middle, 960 x 540) that
    // layout() scales to fit the view (upright phones: up to 2.2x, so every button is thumb-sized); the dimmed backdrop
    // (takes every touch) and the exit button are outside it. Built for the orientation it was opened in.
    screen(kind, cw, ch, o) {
      var self = this, s = Object.assign({ kind: kind, items: [], canClose: true, cw: cw, ch: ch }, o || {});
      s.dim = this.add.image(0, 0, 'sprites', 'px').setTint(0x080614).setAlpha(0.82).setInteractive();
      s.root = this.add.container(0, 0);
      s.items.push(s.dim, s.root);
      s.put = function (x) { s.root.add(x); return x; };
      s.free = function (x) { s.items.push(x); return x; };
      s.show = function (v) { s.items.forEach(function (x) { x.setVisible(v); }); };
      s.destroy = function () {
        s.root.list.forEach(function (c) { self.tweens.killTweensOf(c); if (c.list) c.list.forEach(function (g) { self.tweens.killTweensOf(g); }); });
        s.items.forEach(function (x) { self.tweens.killTweensOf(x); x.destroy(); }); s.items = [];
      };
      s.layout = function () {
        var v = self.v; if (!v || !s.items.length) return;
        s.dim.setPosition(v.l + v.w / 2, v.t + v.h / 2).setDisplaySize(v.w + 4, v.h + 4);
        // as big as the screen allows, but a card no wider than 440 points upright or 640 on its side (a phone is filled, a
        // tablet or a computer gets a comfortable card, never a huge one)
        var k = Math.min(v.w * 0.94 / s.cw, v.h * 0.94 / s.ch, (v.port ? 440 : 640) * Kit.play.dpr() / (s.cw * v.z));
        s.root.setScale(k).setPosition(960 - 960 * k, v.t + v.h / 2 - 540 * k);
        if (s.exit) s.exit.setPosition(v.sl + 40 + 75 * v.u, v.st + 40 + 75 * v.u).setScale(v.u);
      };
      return s;
    }
    // a big labelled choice: a plate or the gold disc, an icon, a word under it
    choice(s, icon, label, fn, main) {
      var self = this, c = s.put(this.add.container(0, 0, [this.add.image(0, 0, 'sprites', main ? 'big' : 'plate').setScale(main ? 1.64 : 1.53), this.add.image(main ? 10 : 0, 0, 'sprites', icon).setScale(1.4).setTint(main ? 0x0d0b24 : 0xffffff)]).setSize(230, 230).setInteractive());
      c.label = s.put(tx(this, 0, 0, label, 40, '700'));
      c.on('pointerdown', function () { sfx('tap'); self.tweens.add({ targets: c, scale: 0.92, duration: 70, yoyo: true }); }); c.on('pointerup', fn);
      return c;
    }
    // a labelled pill button for the sheets (primary: gold with dark words)
    pillBtn(s, icon, label, fn, primary) {
      var self = this, bg = this.add.image(0, 0, 'sprites', primary ? 'pillw' : 'pill'); if (primary) bg.setTint(0xf6c453);
      var ic = this.add.image(-118, 0, 'sprites', icon).setScale(0.6).setTint(primary ? 0x0d0b24 : 0xffffff), t = tx(this, 28, 0, label, 40, '800', primary ? '#0d0b24' : '#f6f1ff');
      var c = s.put(this.add.container(0, 0, [bg, ic, t]).setSize(340, 150).setInteractive());
      c.on('pointerdown', function () { sfx('tap'); self.tweens.add({ targets: c, scale: 0.94, duration: 70, yoyo: true }); }); c.on('pointerup', fn);
      return c;
    }
    fadeIn(s) { s.items.forEach(function (o) { o._a = o === s.dim ? 0.82 : 1; o.setAlpha(0); }); this.tweens.add({ targets: s.items, alpha: function (t) { return t._a; }, duration: 160 }); }
    // the way out of the game: the kit's exit icon (a door with an arrow), outside the scaled content, top-left where the pause button was
    exitBtn(s) { return (s.exit = s.free(this.button('ic-exit', function () { Kit.play.exit(); }))); }

    /* ---- the pause screen: pushed over the paused game ---- */
    openPause() {
      if (this.stack.length || !this.info) return;
      var self = this, info = this.info, W_ = WORLDS[info.world], port = this.v.port;
      var s = this.screen('pause', port ? 760 : 1300, port ? 1080 : 700), c0 = 540;
      this.exitBtn(s);
      s.title = s.put(tx(this, 960, c0 + (port ? -470 : -250), 'Paused', 76, '800'));
      s.sub = s.put(tx(this, 960, c0 + (port ? -395 : -175), W_.name + ' · Level ' + info.n, 38, '700', W_.color));
      s.row = [
        this.choice(s, 'ic-play', 'Resume', function () { self.pop(); }, true),
        this.choice(s, 'ic-retry', 'Restart', function () { self.go(info.n); }),
        this.choice(s, 'ic-grid', 'Levels', function () { self.openMap(); }),
        this.choice(s, Kit.snd.muted ? 'ic-mute' : 'ic-snd', Kit.snd.muted ? 'Sound: Off' : 'Sound: On', function () { Kit.snd.setMuted(!Kit.snd.muted); self.soundRefresh(); })
      ];
      s.row.forEach(function (c, i) {                                // four across on its side, two by two upright
        var x = port ? 960 + (i % 2 ? 190 : -190) : 960 + (i - 1.5) * 320, y = c0 + (port ? (i < 2 ? -210 : 130) : 40);
        c.setPosition(x, y); c.label.setPosition(x, y + 155);
      });
      var how = s.put(tx(this, 960, c0 + (port ? 420 : 305), '', 34, '600', '#f6f1ff', { align: 'center', wordWrap: { width: port ? 700 : 1190 } }).setAlpha(0.88));
      s.how = function () {
        how.setText(self.inp.device === 'touch' ? 'Drag anywhere to move the carpet  ·  Let go to launch the star' : 'Move the mouse or use the arrows or A / D  ·  Click or Space launches  ·  R restarts  ·  Esc pauses  ·  M sound');
        return how;
      };
      s.how();
      s.snd = function () { var m = Kit.snd.muted, b = s.row[3]; b.list[1].setFrame(m ? 'ic-mute' : 'ic-snd'); b.label.setText(m ? 'Sound: Off' : 'Sound: On'); };
      this.push(s); this.fadeIn(s);
    }
    soundRefresh() { var t = this.stack.filter(function (s) { return s.kind === 'pause'; })[0]; if (t) t.snd(); }

    /* ---- the level map: 30 levels in three worlds, each with its stars ---- */
    openMap() {
      var self = this, P = BrSave.progress, port = this.v.port, cs = port ? 190 : 150, gap = port ? 14 : 16, per = port ? 5 : 10;
      var s = this.screen('map', port ? 1160 : 1800, port ? 1720 : 1040), c0 = 540, top = port ? c0 - 860 : c0 - 520;
      s.card = s.put(this.add.nineslice(960, c0, 'sprites', 'card9', port ? 1160 : 1800, port ? 1720 : 1040, 70, 70, 70, 70).setInteractive());
      var hx = port ? 485 : 165, cx = port ? 1435 : 1755, hy = top + (port ? 130 : 105);
      s.back = s.put(this.button('ic-exit', function () { Kit.play.exit(); }).setPosition(hx, hy)); s.close = s.put(this.button('ic-close', function () { self.pop(); }).setPosition(cx, hy));
      s.title = s.put(tx(this, 960, hy, 'Mosaic Breaker', port ? 60 : 72, '800'));
      var cur = this.info ? this.info.n : P.current(), x0 = 960 - (per * cs + (per - 1) * gap) / 2 + cs / 2, rowW = per * cs + (per - 1) * gap, nrows = 10 / per;
      WORLDS.forEach(function (W_, wi) {
        var from = wi * 10 + 1, got = 0, light = tint(W_.color, 0), dark = tint(W_.color, -0.55), ly = port ? top + 300 + wi * 485 : top + 250 + wi * 260;
        for (var k = from; k < from + 10; k++) got += P.stars(k);
        s.put(self.add.text(x0 - cs / 2, ly, W_.name, { fontFamily: FONT, fontSize: '40px', fontStyle: '800', color: W_.color }).setOrigin(0, 0.5));
        s.put(self.add.text(x0 - cs / 2 + rowW - 60, ly, got + ' / 30', { fontFamily: FONT, fontSize: '36px', fontStyle: '700', color: '#f6f1ff' }).setOrigin(1, 0.5));
        s.put(self.add.image(x0 - cs / 2 + rowW - 28, ly, 'sprites', 'star').setScale(0.6));
        for (var n = from; n < from + 10; n++) (function (n) {
          var i0 = n - from, col = i0 % per, row = Math.floor(i0 / per), x = x0 + col * (cs + gap), y = ly + 40 + cs / 2 + row * (cs + gap), open = P.unlocked(n), st = P.stars(n), kids = [], f = cs / 150;
          kids.push(self.add.image(0, 0, 'sprites', 'cell').setScale(f).setTint(dark).setAlpha(open ? 0.7 : 0.25), self.add.image(0, 0, 'sprites', 'cello').setScale(f).setTint(light).setAlpha(open ? 1 : 0.4));
          if (!open) kids.push(self.add.image(0, 0, 'sprites', 'ic-lock').setScale(0.8 * f).setAlpha(0.7));
          else {
            kids.push(tx(self, 0, -26 * f, String(i0 + 1), Math.round(58 * f), '800'));
            for (var i = 0; i < 3; i++) kids.push(self.add.image((i - 1) * 44 * f, 36 * f, 'sprites', i < st ? 'star' : 'star0').setScale(0.58 * f));
          }
          var cell = s.put(self.add.container(x, y, kids).setSize(cs, cs));
          if (n === cur) { var ring = self.add.image(0, 0, 'sprites', 'cello').setTint(0xffffff).setScale(1.1 * f); cell.add(ring); self.tweens.add({ targets: ring, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 }); }
          if (open) { cell.setInteractive(); cell.on('pointerdown', function () { sfx('tap'); self.tweens.add({ targets: cell, scale: 0.92, duration: 70, yoyo: true }); }); cell.on('pointerup', function () { self.go(n); }); }
        })(n);
      });
      this.push(s); this.fadeIn(s);
    }

    /* ---- a level done: stars, score, what next ---- */
    sheet(kind, title, text, stars, buttons) {
      var self = this, port = this.v.port, c0 = 540, s = this.screen(kind, port ? 760 : 1300, port ? 1100 : 760), n = buttons.length;
      s.card = s.put(this.add.nineslice(960, c0, 'sprites', 'card9', port ? 760 : 1300, port ? 1100 : 760, 70, 70, 70, 70).setInteractive());
      this.exitBtn(s);
      s.title = s.put(tx(this, 960, c0 + (port ? -400 : -250), title, port ? 64 : 70, '800', undefined, { align: 'center', wordWrap: { width: port ? 680 : 1200 } }));
      s.text = s.put(tx(this, 960, c0 + (port ? -300 : -170), text, 40, '600', '#f6f1ff', { align: 'center', wordWrap: { width: port ? 660 : 1100 } }).setAlpha(0.9));
      s.stars = [];
      if (stars != null) for (var i = 0; i < 3; i++) s.stars.push(s.put(this.add.image(960 + (i - 1) * (port ? 140 : 150), c0 + (port ? -130 : -40), 'sprites', 'star0').setScale(port ? 1.7 : 1.9)));
      s.btns = buttons.map(function (b, i) {
        var c = self.pillBtn(s, b[0], b[1], b[2], b[3]);
        if (port) c.setPosition(960, c0 + 120 + (i - (n - 1) / 2) * 170 + (n < 3 ? 80 : 100)); else c.setPosition(960 + (i - (n - 1) / 2) * 370, c0 + 210);
        return c;
      });
      this.push(s); this.fadeIn(s);
      var big = port ? 1.7 : 1.9;
      if (stars != null) for (i = 0; i < stars; i++) (function (i) {
        self.time.delayedCall(450 + i * 330, function () {
          var st = s.stars[i]; if (!st || !st.active) return;
          st.setFrame('star').setScale(big * 1.5); self.tweens.add({ targets: st, scale: big, duration: 300, ease: 'Back.easeOut' }); sfx('star');
        });
      })(i);
      return s;
    }
    levelWon(r) {
      var self = this, W_ = r.worldName, again = function () { self.go(r.n); };
      var b = [];
      if (!r.last) b.push(['ic-next', r.endOfWorld ? 'Next World' : 'Next Level', function () { self.go(r.n + 1); }, true]);
      b.push(['ic-retry', r.last ? 'Play Again' : 'Replay', r.last ? function () { self.go(1); } : again, r.last]);
      b.push(['ic-grid', 'Levels', function () { self.openMap(); }]);
      this.sheet('win', r.last ? 'You did it!' : r.endOfWorld ? W_ + ' complete!' : 'Mosaic complete!', r.last ? 'All 30 mosaics are shining. MashaAllah!' : 'Score ' + fmt(r.score), r.stars, b);
    }
    levelFail(r) {
      var self = this;
      this.sheet('fail', 'Out of hearts', "Let's try that mosaic again!", null, [['ic-retry', 'Try Again', function () { self.go(r.n); }, true], ['ic-grid', 'Levels', function () { self.openMap(); }]]);
    }

    // start a level (any screen closes; Play is started again, then the interface goes back on top)
    go(n) {
      if (n < 1 || n > COUNT || (!BrSave.progress.unlocked(n) && !(this.info && this.info.n === n))) return;
      this.stack.forEach(function (s) { s.destroy(); }); this.stack = [];
      this.scene.stop('Play'); this.scene.launch('Play', { n: n }); this.scene.sleep();
    }
  }

  window.BrHud = Hud; window.BrLive = Live;
})();
