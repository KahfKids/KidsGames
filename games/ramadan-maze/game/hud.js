/* Ramadan Maze: the interface (scene 'Hud', above the maze, in the 1920 x 1080 design space of Kit.play.fit, interface scaled by view.u, set to 48 screen points per 150-unit button).
   Laid out by the game-ui-ux skill. While playing the screen is the maze: one pause button in the top-left corner and, beside
   it, the dates still to find (they are also shown in the world, as a ring of dots round the house: maze.js). Everything else
   lives on a stack of screens over the paused maze: the pause screen (resume, restart, levels, sound, the way out), the level
   map, the iftar screen (iftar.js). The stick floats under the thumb (home: bottom-left), always drawn but quiet at rest.
   Input is actions, not keys (input-systems): `in` = { dir (N E S W or 0), held (a finger or key is down), tap } in the
   registry, filled from the stick, the keys and taps, read by the Maze scene. Screens are built from containers and built
   again when the view changes (they are rare); the maze scene is paused under them (scene.pause, asked for, not tested,
   because scene changes are queued to the next step).
   At night (Lantern Night) the darkness is a small engine texture (DynamicTexture) here: the dark fill, the lights of the
   maze scene erased out of it, shown stretched over the world. */
(function () {
  'use strict';
  var LV = MAZE_LEVELS, N = LV.N, E = LV.E, S = LV.S, W = LV.W;
  var GAP = 30, REST = 0.5, STICK_R = 130, THR = 46, FOG = 8;
  var FONT = 'system-ui, sans-serif', INK = '#fff7e6', GOLD = '#f6c453';
  function T(scene, x, y, s, size, w, color, extra) { return scene.add.text(x, y, s, Object.assign({ fontFamily: FONT, fontSize: size + 'px', fontStyle: w, color: color || INK }, extra || {})).setOrigin(0.5); }

  class Hud extends Phaser.Scene {
    constructor() { super({ key: 'Hud' }); }
    create() {
      var self = this, SV = MzSave, ev = this.game.events;
      this.inp = this.registry.get('in'); this.blocked = 0; this.n = 0; this.world = 0; this.fog = null; this.lit = [];
      this.touch = this.sys.game.device.input.touch; this.device = this.touch ? 'touch' : 'keys';
      this.moved = !!SV.store.get('moved', false);
      this.stick = { id: -1, x: 0, y: 0, ax: 0, ay: 0, dir: 0, t0: 0, sx: 0, sy: 0, far: false };
      this.kstack = [];

      // the whole screen takes the stick (under the buttons: the engine gives the top one the touch)
      this.zone = this.add.zone(0, 0, 10, 10).setOrigin(0).setInteractive().setDepth(1);
      this.joy = this.add.image(0, 0, 'ui', 'joy').setDepth(10).setAlpha(REST);
      this.knob = this.add.image(0, 0, 'ui', 'knob').setDepth(10).setAlpha(REST);
      this.zone.on('pointerdown', function (p) {
        if (self.stick.id >= 0 || self.blocked) return;
        var s = self.stick; s.id = p.id; s.x = s.ax = p.worldX; s.y = s.ay = p.worldY; s.dir = 0; s.t0 = self.time.now; s.sx = p.x; s.sy = p.y; s.far = false;
        if (p.wasTouch) self.setDevice('touch');
        self.joy.setPosition(s.x, s.y).setAlpha(1).setVisible(true); self.knob.setPosition(s.x, s.y).setAlpha(1).setVisible(true);
      });
      this.input.on('pointermove', function (p) { if (p.id === self.stick.id) self.drag(p); });
      var up = function (p) { if (p.id === self.stick.id) self.lift(p); };
      this.input.on('pointerup', up); this.input.on('pointerupoutside', up);
      this.input.keyboard.on('keydown', function () { self.setDevice('keys'); });

      // while playing: one pause button (full contrast: game-ui-ux asks 3:1 for key visuals, so it never fades) and the dates
      this.bPause = this.button('ic-pause', function () { self.openPause(); });
      this.pill = this.add.image(0, 0, 'ui', 'pill').setDepth(10);
      this.pIcon = this.add.image(0, 0, 'mzs', 'date').setDepth(11);
      this.pText = T(this, 0, 0, '0 / 0', 64, '800').setDepth(11);

      // keys -> the same actions
      var KB = this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,R,ESC,M,P,ENTER');
      var KD = [['W', N, 'UP'], ['UP', N, 'W'], ['A', W, 'LEFT'], ['LEFT', W, 'A'], ['S', S, 'DOWN'], ['DOWN', S, 'S'], ['D', E, 'RIGHT'], ['RIGHT', E, 'D']];
      KD.forEach(function (q) {
        KB[q[0]].on('down', function () { var i = self.kstack.indexOf(q[1]); if (i >= 0) self.kstack.splice(i, 1); self.kstack.push(q[1]); });
        KB[q[0]].on('up', function () { if (!KB[q[2]].isDown) { var i = self.kstack.indexOf(q[1]); if (i >= 0) self.kstack.splice(i, 1); } });
      });
      KB.R.on('down', function () { if (!self.blocked && self.n) self.go(self.n); });
      KB.M.on('down', function () { Kit.snd.setMuted(!Kit.snd.muted); if (self.pause) self.buildPause(); });
      var esc = function () { if (self.menu) self.backFromMenu(); else if (self.pause) self.closePause(); else if (!self.blocked) self.openPause(); };
      KB.ESC.on('down', esc); KB.P.on('down', esc);
      KB.ENTER.on('down', function () { if (self.pause) self.closePause(); else if (self.sheet && self.sheet.primary) self.sheet.primary(); });

      // the game's events
      var on = function (k, f) { ev.on(k, f, self); self.events.once('shutdown', function () { ev.off(k, f, self); }); };
      on('mz-start', this.levelStart); on('mz-col', this.found); on('mz-won', this.won); on('mz-used', this.used);
      on('hidden', function () { if (!self.blocked && self.n && !(Kit.play.debug)) self.openPause(); });

      // the house badge at the screen's edge (when the real house is off screen)
      this.pin = this.add.container(0, 0, [this.add.image(0, 0, 'ui', 'plate').setScale(0.4), this.add.image(0, 0, 'ui', 'house-pin').setScale(0.9), this.add.image(0, 0, 'ui', 'arrow')]).setDepth(10).setVisible(false);
      this.scratch = {}; this.lamps = [];
      Kit.play.fit(this, function (v) { self.layout(v); }, { w: 1000 });
      if (Kit.play.debug) Kit.play.debug.hud = this;
      var d0 = this.registry.get('mzstart'); if (d0 && d0.n) this.levelStart(d0);          // the maze may have started first
    }

    // a round button: a dark plate (readable on any world) and its icon; it answers the touch at once
    button(icon, fn, scale) {
      var self = this, c = this.add.container(0, 0, [this.add.image(0, 0, 'ui', 'plate'), this.add.image(0, 0, 'ui', icon)]).setDepth(10);
      c.base = scale || 1; c.setSize(150, 150).setInteractive();
      c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: c.base * 0.9, duration: 70, yoyo: true }); });
      c.on('pointerup', fn); return c;
    }
    layout(v) {
      v.u = 48 * v.pt / 150;                                     // Ramadan Maze's own size: a 150-unit button is 48 screen points on every screen
      this.v = v; var u = v.u, m = 36 * u;
      this.bPause.base = u; this.bPause.setScale(u).setPosition(v.sl + m + 75 * u, v.st + m + 75 * u);
      var pw = 300 * u, px = this.bPause.x + 75 * u + GAP * u + pw / 2, py = this.bPause.y;
      this.pill.setScale(pw / 340, u).setPosition(px, py); this.pIcon.setDisplaySize(86 * u, 86 * u).setPosition(px - 95 * u, py); this.pText.setScale(u).setPosition(px + 45 * u, py + 2 * u);
      this.zone.setPosition(v.l, v.t).setSize(v.w + 4, v.h + 4); this.zone.input.hitArea.setSize(v.w + 4, v.h + 4);
      this.restAt = { x: v.sl + 40 + 150 * u, y: v.sb - 40 - 150 * u };
      this.joy.setScale(u); this.knob.setScale(u);
      if (this.stick.id < 0) { this.joy.setPosition(this.restAt.x, this.restAt.y); this.knob.setPosition(this.restAt.x, this.restAt.y); }
      this.showControls();
      if (this.fogOn) this.fogMake();
      if (this.hints) this.hintsMake();
      if (this.pause) this.buildPause();
      if (this.menu) this.buildMenu();
      if (this.sheet) this.buildSheet();
    }

    // the stick: a direction is chosen from where the finger has moved since the last choice (each ~THR design units),
    // like the old page, so turning round needs only a short move; the ring stays where the thumb landed
    drag(p) {
      var s = this.stick, R = STICK_R * this.v.u, dx = p.worldX - s.x, dy = p.worldY - s.y, l = Math.hypot(dx, dy);
      if (l > R) { dx *= R / l; dy *= R / l; }
      this.knob.setPosition(s.x + dx, s.y + dy);
      var ex = p.worldX - s.ax, ey = p.worldY - s.ay, thr = THR * this.v.u * 0.8;
      if (ex * ex + ey * ey < thr * thr) return;
      s.dir = Math.abs(ex) > Math.abs(ey) ? (ex > 0 ? E : W) : (ey > 0 ? S : N);
      s.ax = p.worldX; s.ay = p.worldY; s.far = true;
    }
    lift(p) {
      var s = this.stick, quick = this.time.now - s.t0 < 450 && Math.hypot(p.x - s.sx, p.y - s.sy) < 14;
      s.id = -1; s.dir = 0;
      if (quick && !s.far && !this.blocked) this.inp.tap = { x: p.x, y: p.y };
      this.restStick();
    }
    restStick() { var r = this.restAt; if (r) { this.joy.setPosition(r.x, r.y).setAlpha(REST); this.knob.setPosition(r.x, r.y).setAlpha(REST); } this.showControls(); }
    // the last device used decides which controls and prompts show (input-systems: hot-swap, no restart)
    setDevice(d) { if (d === this.device) return; this.device = d; this.showControls(); if (this.hints) this.hintsMake(); if (this.pause) this.buildPause(); }
    showControls() { var t = this.device === 'touch' || this.stick.id >= 0; this.joy.setVisible(t); this.knob.setVisible(t); }
    used() { if (this.moved) return; this.moved = true; MzSave.store.set('moved', true); if (this.hints) { this.hints.forEach(function (h) { h.destroy(); }); this.hints = null; } }

    update(time, dms) {
      var inp = this.inp, s = this.stick, dir = 0, held = false, dbg = Kit.play.debug;
      if (this.blocked) { s.dir = 0; }
      else if (s.id >= 0) { dir = s.dir; held = true; }
      else if (this.kstack.length) { dir = this.kstack[this.kstack.length - 1]; held = true; }
      if (dbg && dbg.dir !== undefined) { dir = dbg.dir; held = !!dbg.held; }
      inp.dir = dir; inp.held = held && !this.blocked;
      if (dir && !this.moved) this.used();
      var mz = this.mz || (this.mz = this.scene.get('Maze'));
      if (this.fogOn && this.fog && mz && mz.built) this.fogDraw(mz);
      this.pinUpdate(mz);
    }

    /* ---- level start: the dates, the first-level teach, the banner ---- */
    levelStart(d) {
      this.n = d.n; this.world = d.world; this.total = d.total; this.got = d.got; this.wd = MzArt.WORLDS[d.world];
      this.pText.setText(d.got + ' / ' + d.total); this.pill.setAlpha(1);
      this.blocked = 0; this.hintsOn = !this.moved; this.hintsMake();
      var night = d.world === 2; if (night !== !!this.fogOn) { this.fogOn = night; if (night) this.fogMake(); else this.fogDrop(); }
      if (night) this.fogK = (d.n - 1) % 10;
      if (!d.keep) this.banner(d); this.restStick();
    }
    // the level, said once large in the middle as the maze fades in, then gone
    banner(d) {
      if (this.ann) this.ann.forEach(function (o) { o.destroy(); }); var v = this.v, u = Math.min(v.u, 1.5), cx = (v.l + v.r) / 2, cy = v.t + v.h * 0.42, wd = this.wd;
      var a = T(this, cx, cy - 78 * u, wd.name.toUpperCase(), 34 * u, '800', wd.color, { stroke: '#140a1e', strokeThickness: 7 * u }).setShadow(0, 4, 'rgba(0,0,0,.5)', 14);
      var b = T(this, cx, cy, 'Level ' + d.n, 100 * u, '900', '#fffaf0', { stroke: '#140a1e', strokeThickness: 12 * u }).setShadow(0, 6, 'rgba(0,0,0,.5)', 18);
      var c = T(this, cx, cy + 86 * u, d.name, 50 * u, '800', 'rgba(255,250,240,.95)', { stroke: '#140a1e', strokeThickness: 9 * u });
      var all = this.ann = [a, b, c]; all.forEach(function (o) { o.setDepth(30).setAlpha(0); });
      this.tweens.add({ targets: all, alpha: { from: 0, to: 1 }, y: '-=14', duration: 400, ease: 'Sine.easeOut', delay: 300, hold: 1000, yoyo: true, completeDelay: 0,
        onComplete: function () { all.forEach(function (o) { o.destroy(); }); } });
    }
    found(d) {
      var self = this, v = this.v; this.got = d.got; this.pText.setText(d.got + ' / ' + d.total);
      var f = this.add.image(v.l + d.sx / v.z, v.t + d.sy / v.z, 'mzs', d.type).setDepth(20).setDisplaySize(86, 86), sx = f.x, sy = f.y, tx = this.pIcon.x, ty = this.pIcon.y, q = { t: 0 };
      this.tweens.add({ targets: q, t: 1, duration: 650, ease: 'Sine.easeInOut', onUpdate: function () {
        f.x = sx + (tx - sx) * q.t; f.y = sy + (ty - sy) * q.t - Math.sin(q.t * Math.PI) * 80; f.setScale(f.scale * 1); f.alpha = 1 - q.t * 0.2; },
        onComplete: function () { f.destroy(); self.tweens.add({ targets: self.pill, scaleY: self.pill.scaleY * 1.15, duration: 110, yoyo: true }); } });
    }

    /* ---- the first level teaches the controls, in the words and pictures of the device in use, until the child has walked ---- */
    hintsMake() {
      if (this.hints) { this.hints.forEach(function (h) { h.destroy(); }); this.hints = null; }
      if (!this.hintsOn || this.moved || !this.v) return;
      var v = this.v, u = v.u, tip = { fontFamily: FONT, fontSize: Math.round(Math.max(44 * u, 17 * v.pt)) + 'px', fontStyle: '700', color: INK, backgroundColor: 'rgba(13,11,36,0.8)', padding: { x: 30, y: 16 } };
      if (this.device === 'touch') {
        var g = this.add.image(this.restAt.x - 70 * u, this.restAt.y, 'ui', 'knob').setAlpha(0.9).setDepth(12).setScale(u);
        var t = this.add.text(this.restAt.x + 180 * u, this.restAt.y - 40 * u, 'Drag to walk home', tip).setOrigin(0, 1).setDepth(12);
        this.hints = [g, t];
        this.tweens.add({ targets: g, x: this.restAt.x + 70 * u, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      } else {
        this.hints = [this.add.text((v.l + v.r) / 2, v.sb - 60 * u, 'Arrow keys or WASD to walk home', tip).setOrigin(0.5, 1).setDepth(12)];
      }
    }

    /* ---- the edge badge: where the house is, when it is off screen ---- */
    pinUpdate(mz) {
      var pin = this.pin, v = this.v;
      if (!mz || !mz.built || !mz.scrolls || mz.state !== 'play' || this.blocked) { if (pin.visible) pin.setVisible(false); return; }
      var s = mz.toScreen(mz.house.x, mz.house.y - mz.H * 0.5 - 40, this.scratch), hx = v.l + s.x / v.z, hy = v.t + s.y / v.z, u = v.u, ins = 70 * u;
      var x0 = v.sl + ins, x1 = v.sr - ins, y0 = v.st + 36 * u + 150 * u + ins, y1 = v.sb - ins;
      if (hx > x0 - ins && hx < x1 + ins && hy > y0 - ins && hy < y1 + ins) { if (pin.visible) pin.setVisible(false); return; }
      var px = Phaser.Math.Clamp(hx, x0, x1), py = Phaser.Math.Clamp(hy, y0, y1), ang = Math.atan2(hy - py, hx - px);
      pin.setVisible(true).setPosition(px, py).setScale(u); pin.list[2].setPosition(Math.cos(ang) * 62, Math.sin(ang) * 62).setRotation(ang);
    }

    /* ---- night: the darkness, a DynamicTexture at 1/8 size drawn up, with the maze's lights erased out of it ---- */
    fogMake() {
      this.fogDrop(); var v = this.v, w = Math.ceil((v.w + 8) / FOG), h = Math.ceil((v.h + 8) / FOG);
      this.fog = this.textures.addDynamicTexture('mz-fog', w, h);
      this.fogImg = this.add.image(v.l - 4, v.t - 4, 'mz-fog').setOrigin(0).setDisplaySize(w * FOG, h * FOG).setDepth(5);
      this.fogW = w; this.fogH = h; this.fogPool = [];
    }
    fogDrop() { if (this.fogImg) { this.fogImg.destroy(); this.fogImg = null; } if (this.fog) { this.textures.remove('mz-fog'); this.fog = null; } }
    fogDraw(mz) {
      var v = this.v, n = mz.lampList(this.lamps), cam = mz.cameras.main, z = cam.zoom, pool = this.fogPool, rt = this.fog, k = 0;
      var vx = cam.scrollX + cam.width / 2 - cam.width / (2 * z), vy = cam.scrollY + cam.height / 2 - cam.height / (2 * z);
      rt.clear(); rt.fill(0x04061a, 0.72 + (this.fogK || 0) * 0.015);
      for (var i = 0; i < n; i += 3) {
        var im = pool[k]; if (!im) im = pool[k] = this.make.image({ key: 'ui', frame: 'hole', add: false }); k++;
        var r = this.lamps[i + 2] * z / v.z / FOG;                               // radius in the small texture's pixels
        im.setPosition(((this.lamps[i] - vx) * z / v.z + 4) / FOG, ((this.lamps[i + 1] - vy) * z / v.z + 4) / FOG).setScale(2 * r / 256);
        rt.erase(im);
      }
      rt.render();
    }

    /* ---- screens: a stack over the paused maze ---- */
    block(d) {
      this.blocked = Math.max(0, this.blocked + d);
      if (this.blocked) { this.stick.id = -1; this.stick.dir = 0; this.restStick(); if (this.scene.get('Maze').sys.settings.status >= Phaser.Scenes.RUNNING) this.scene.pause('Maze'); }
      else this.scene.resume('Maze');
    }
    // start (or restart) a level
    go(n, keepBlocked) {
      var SV = MzSave; n = Phaser.Math.Clamp(n, 1, SV.COUNT);
      SV.progress.setCurrent(n);
      this.closeAll();
      this.scene.stop('Maze'); this.scene.launch('Maze', { n: n }); this.scene.bringToTop();
    }
    closeAll() {
      if (this.pause) this.closePause(true); if (this.menu) this.closeMenu(true); if (this.sheet) this.closeSheet(true);
      this.blocked = 0; this.inp.tap = null;
    }
    // a screen's backdrop: dim (also catches the touch), and the way a screen is built again on resize
    dimmer(c, a) { var v = this.v; return this.add.image((v.l + v.r) / 2, (v.t + v.b) / 2, 'ui', 'px').setTint(0x070516).setAlpha(a).setDisplaySize(v.w + 700, v.h + 700).setInteractive(); }   // (bigger than the screen: a stretched picture fades at its edge)
    big(c, x, y, icon, label, fn, main, size) {
      var self = this, sc = size / 230, b = this.add.container(x, y, [this.add.image(0, 0, 'ui', main ? 'big' : 'plate').setScale(main ? sc * 0.82 : sc * 1.53), this.add.image(main ? 10 * sc : 0, 0, 'ui', icon).setScale(1.4 * sc).setTint(main ? 0x0d0b24 : 0xffffff)]).setSize(size, size).setInteractive();
      var l = T(this, x, y + size / 2 + 26 * sc, label, 40 * sc, '700');
      b.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: b, scale: 0.92, duration: 70, yoyo: true }); }); b.on('pointerup', fn);
      c.add([b, l]); b.label = l; return b;
    }

    /* ---- the pause screen: pushed over the paused maze ---- */
    openPause() { if (this.pause || this.menu || this.sheet || !this.n) return; this.pause = { c: null }; this.block(1); Kit.snd.play('page'); this.buildPause(); }
    buildPause() {
      var self = this, p = this.pause, v = this.v, u = v.u; if (!p) return;
      if (p.c) p.c.destroy(true);
      var c = p.c = this.add.container(0, 0).setDepth(50), cx = (v.l + v.r) / 2, cy = v.t + v.h / 2, wide = v.w >= 1300, wd = MzArt.WORLDS[this.world];
      c.add(this.dimmer(c, 0.76));
      c.add(T(this, cx, cy - (wide ? 290 : 470), 'Paused', 90, '800'));
      c.add(T(this, cx, cy - (wide ? 205 : 385), wd.name + ' · Level ' + this.n, 40, '700', wd.color));
      var ex = this.button('ic-exit', function () { Kit.play.exit(); }, u); ex.setScale(u).setPosition(v.sl + 36 * u + 75 * u, v.st + 36 * u + 75 * u); c.add(ex);
      var size = 230, gap = 90, cols = wide ? 4 : 2, y0 = wide ? cy + 20 : cy - 190, muted = Kit.snd.muted;
      var defs = [
        ['ic-play', 'Resume', function () { self.closePause(); }, true],
        ['ic-retry', 'Restart', function () { self.go(self.n); }],
        ['ic-grid', 'Levels', function () { self.closePause(true); self.openMenu(true); }],
        [muted ? 'ic-mute' : 'ic-snd', muted ? 'Sound: Off' : 'Sound: On', function () { Kit.snd.setMuted(!Kit.snd.muted); self.buildPause(); }]];
      defs.forEach(function (d, i) {
        var col = i % cols, row = (i / cols) | 0, x = cx + (col - (cols - 1) / 2) * (size + gap), y = y0 + row * (size + gap + 70);
        self.big(c, x, y, d[0], d[1], d[2], d[3], size);
      });
      var yy = wide ? cy + 20 + size / 2 + 150 : y0 + (size + gap + 70) + size / 2 + 150;
      c.add(T(this, cx, Math.min(v.sb - 40, yy), this.device === 'touch' ? 'Drag anywhere to walk  ·  Tap a spot to walk there' : 'Arrows or WASD walk  ·  R restart  ·  Esc pause  ·  M sound', wide ? 34 : 38, '600', INK, { align: 'center', wordWrap: { width: Math.min(v.w - 80, 1500) } }).setAlpha(0.88));
    }
    closePause(quiet) {
      var p = this.pause; if (!p) return; this.pause = null; if (p.c) p.c.destroy(true);
      if (quiet) this.blocked = Math.max(0, this.blocked - 1); else this.block(-1);
    }

    /* ---- the level map: worlds, levels, stars; opened from the pause screen or the iftar screen ---- */
    openMenu(fromPause) {
      if (this.menu) return; this.menu = { fromPause: !!fromPause, c: null }; this.block(1); Kit.snd.play('page'); this.buildMenu();
    }
    buildMenu() {
      var self = this, m = this.menu, v = this.v, SV = MzSave, P = SV.progress; if (!m) return;
      if (m.c) m.c.destroy(true);
      var c = m.c = this.add.container(0, 0).setDepth(50), cx = (v.l + v.r) / 2, cy = v.t + v.h / 2, wide = v.w >= 1700;
      c.add(this.dimmer(c, 0.8));
      var cardW = wide ? Math.min(v.w - 60, 2200) : Math.min(v.w - 30, 960), step = wide ? Math.min(168, (cardW - 560) / 10) : (cardW - 70) / 5, per = wide ? 10 : 5;
      var blockH = wide ? 200 : 110 + 2 * step, cardH = 200 + 3 * blockH + 40, k = Math.min(1, (v.h - 24) / cardH, (v.w - 12) / cardW);
      var g = this.add.container(cx, cy).setScale(k); c.add(g);
      g.add(this.add.nineslice(0, 0, 'ui', 'card', cardW, cardH, 70, 70, 70, 70));
      var top = -cardH / 2, left = -cardW / 2, tsz = 100;
      // header: back (to the screen it came from) · title · the way out of the game
      var plate = function (icon, x, y, fn) {
        var b = self.add.container(x, y, [self.add.image(0, 0, 'ui', 'plate'), self.add.image(0, 0, 'ui', icon)]).setSize(150, 150).setInteractive();
        b.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: b, scale: 0.9, duration: 70, yoyo: true }); }); b.on('pointerup', fn); g.add(b); return b;
      };
      plate('ic-back', left + 40 + 75, top + 40 + 75, function () { self.backFromMenu(); });
      plate('ic-exit', -left - 40 - 75, top + 40 + 75, function () { Kit.play.exit(); });
      g.add(T(this, 0, top + 40 + 75, 'Ramadan Maze', wide ? 76 : 64, '800'));
      var stars = 0; for (var q = 1; q <= SV.COUNT; q++) stars += P.stars(q);
      g.add(T(this, 0, top + 40 + 75 + (wide ? 62 : 54), stars + ' / ' + SV.COUNT * 3, 34, '700', GOLD).setAlpha(0.95));
      MzArt.WORLDS.forEach(function (wd, wi) {
        var by = top + 215 + wi * blockH, dark = Phaser.Display.Color.HexStringToColor(wd.color).color;
        var lx = wide ? left + 70 : left + 50, ly = wide ? by + blockH / 2 : by + 18;
        var lab = T(self, lx, ly - (wide ? 18 : 0), wd.name, wide ? 40 : 38, '800', wd.color).setOrigin(0, 0.5); g.add(lab);
        var gs = 0; for (var s = wi * 10 + 1; s <= wi * 10 + 10; s++) gs += P.stars(s);
        if (wide) g.add(T(self, lx, ly + 34, gs + ' / 30', 30, '700', INK).setOrigin(0, 0.5).setAlpha(0.7));
        for (var j = 0; j < 10; j++) {
          var lv = wi * 10 + j + 1, col = j % per, row = (j / per) | 0;
          var x = wide ? left + 520 + col * step + (step - 20) / 2 : left + 35 + step / 2 + col * step, y = wide ? by + blockH / 2 : by + 108 + row * step;
          var locked = !P.unlocked(lv), done = P.stars(lv) > 0, size = Math.min(130, step - 14);
          var kids = [self.add.image(0, 0, 'ui', 'lv').setTint(0x1d1a52).setAlpha(locked ? 0.4 : 0.9).setDisplaySize(size, size), self.add.image(0, 0, 'ui', 'lvo').setTint(dark).setAlpha(locked ? 0.35 : 1).setDisplaySize(size, size)];
          if (locked) kids.push(self.add.image(0, 0, 'ui', 'ic-lock').setScale(0.7).setAlpha(0.6));
          else {
            kids.push(T(self, 0, done ? -12 : 0, String(lv), 56, '800'));
            if (done) for (var st = 0; st < 3; st++) kids.push(self.add.image((st - 1) * 30, 30, 'ui', st < P.stars(lv) ? 'ic-star' : 'ic-star0').setDisplaySize(26, 26));
          }
          var cell = self.add.container(x, y, kids).setSize(size, size); g.add(cell);
          if (lv === self.n && !locked) { var ring = self.add.image(0, 0, 'ui', 'lvo').setTint(0xffffff).setDisplaySize(size + 14, size + 14); cell.add(ring); self.tweens.add({ targets: ring, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 }); }
          if (!locked) (function (lv, cell) { cell.setInteractive(); cell.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: cell, scale: 0.92, duration: 70, yoyo: true }); }); cell.on('pointerup', function () { self.go(lv); }); })(lv, cell);
        }
      });
    }
    // closing the map: back to the pause screen it was opened from (the stack pops), or straight back to the game
    backFromMenu() {
      var m = this.menu; if (!m) return; var fp = m.fromPause; this.closeMenu(true);
      if (fp) this.openPause(); else if (this.n) this.go(MzSave.progress.current());
    }
    closeMenu(quiet) {
      var m = this.menu; if (!m) return; this.menu = null; if (m.c) m.c.destroy(true);
      if (quiet) this.blocked = Math.max(0, this.blocked - 1); else this.block(-1);
    }
  }
  window.MzHud = Hud;
})();
