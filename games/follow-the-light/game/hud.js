/* Follow the Light: the interface (scene 'Hud', above the courtyard, in the 1920 x 1080 design space of Kit.play.fit).
   Laid out by the game-ui-ux skill. While playing, the screen is the courtyard: one pause button in the top-left corner,
   the hearts beside it (the tries left), and the progress the child needs at the bottom: one star for each light of the
   level's goal, filling as the round grows (they also glow in the colour of each light while it plays). The game
   itself shows its progress in the world too: the string of lamps along the ropes shines when a round is done. Nothing
   else sits over the play area; there are no on-screen controls to find: the child taps the lanterns themselves.
   Everything else lives on a stack of screens over the paused game: the pause screen (resume, restart, levels, free
   play, sound, the way out), the level map and the results. All Phaser: images painted once (art.js), Zones and
   Containers for the touch targets, tweens for every fade and pop.
   Prompts follow the device last used (a touch or a key switches them at once). The first level teaches until the
   child has tapped a right light once (saved: 'taught'). Keys: 1-6 or the arrows and Space choose a light (play.js),
   Esc / P pause, R restart, M sound. */
(function () {
  'use strict';
  var A = LFArt, LV = LIGHT_LEVELS, F = Ftl, COUNT = F.COUNT, GAP = 36, INK = '#f6efe0', GOLD = 0xffd36b;
  var hexOf = function (c) { return parseInt(c.slice(1), 16); };

  class Hud extends Phaser.Scene {
    constructor() { super({ key: 'Hud' }); }
    create() {
      var self = this, ev = this.game.events, on = function (k, f) { ev.on(k, f, self); self.events.once('shutdown', function () { ev.off(k, f, self); }); };
      this.blocked = 0; this.n = 1; this.free = false; this.target = 0; this.hintOn = ''; this.beads = []; this.hearts = []; this.pause = this.menu = this.sheet = null;

      this.bPause = this.button('ic-pause', function () { if (self.free) self.go(self.n); else self.openPause(); });
      this.heartBox = this.add.nineslice(0, 0, 'ui-pill', null, 340, 150, 70, 70, 70, 70); this.heartIm = [-96, 0, 96].map(function () { return self.add.image(0, 0, 'heart').setScale(0.85); });
      this.beadBox = this.add.nineslice(0, 0, 'ui-pill', null, 340, 150, 70, 70, 70, 70);
      this.hint = this.add.text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: '44px', fontStyle: '800', color: INK, backgroundColor: 'rgba(14,8,34,0.8)', padding: { x: 34, y: 16 }, align: 'center', resolution: 1 }).setOrigin(0.5).setVisible(false);

      var K = this.keys = this.input.keyboard.addKeys('P,R,ESC,M');
      this.input.keyboard.on('keydown', function () { F.setMode('keys'); });
      this.input.on('pointerdown', function () { F.setMode('pointer'); });
      K.ESC.on('down', function () { self.esc(); }); K.P.on('down', function () { self.esc(true); });
      K.R.on('down', function () { if (!self.blocked && !self.free) self.go(self.n); });
      K.M.on('down', function () { Kit.snd.setMuted(!Kit.snd.muted); if (self.pause) self.pause.snd(); });

      on('ftl-level', this.levelStart); on('ftl-beads', this.beadsSet); on('ftl-hearts', this.heartsSet); on('ftl-say', this.say);
      on('ftl-turn', this.turn); on('ftl-watch', function () { if (this.hintOn) { this.hintOn = 'watch'; this.hintMake(); } }); on('ftl-end', this.levelEnd); on('ftl-device', this.deviceChanged);

      Kit.play.fit(this, function (v) { self.layout(v); }, { w: 1280 });
      var lv = this.registry.get('lv'); if (lv) this.levelStart(lv);
      this.warm();
    }

    // a round button: a dark plate (readable on any background) and its icon; it answers the touch at once
    button(icon, fn) {
      var self = this, c = this.add.container(0, 0, [this.add.image(0, 0, 'ui-plate'), this.add.image(0, 0, icon)]);
      c.icon = c.list[1]; c.setSize(150, 150).setInteractive();
      c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: c.scale * 0.9, duration: 70, yoyo: true }); });
      c.on('pointerup', fn); return c;
    }
    layout(v) {
      v.u = 48 * v.pt / 150;                                             // Follow the Light's own size: a 150-unit button is 48 screen points
      this.v = v; var u = v.u;
      var px = v.sl + (40 + 75) * u, py = v.st + (40 + 75) * u;        // the safe area's top-left corner: pause, then the hearts, one GAP apart
      this.bPause.setPosition(px, py).setScale(u);
      var hx = px + (75 + GAP + 170) * u;
      this.heartBox.setPosition(hx, py).setScale(u); this.heartIm.forEach(function (h, i) { h.setPosition(hx + (i - 1) * 96 * u, py).setScale(0.85 * u); });
      this.beadsPlace();
      this.hintPlace();
      if (this.pause) this.pauseLayout(); if (this.menu) this.screenFit(this.menu, 1800, 1000); if (this.sheet) this.screenFit(this.sheet, this.sheet.w, this.sheet.h);
    }
    // a screen's root: centred, scaled down if the view is smaller than it
    screenFit(s, w, h) {
      var v = this.v; if (!v) return;
      s.dim.setPosition(960, 540).setDisplaySize(v.w + 8, v.h + 8);
      s.root.setPosition(960, 540).setScale(Math.min(v.u, v.w * 0.97 / w, v.h * 0.97 / h));
    }

    /* ---- a level starts: hearts, stars, the first-level lesson, the banner ---- */
    levelStart(d) {
      var self = this; this.n = d.n; this.free = d.free; this.target = d.target; this.world = d.world;
      this.closeAll(true);
      this.bPause.icon.setTexture(d.free ? 'ic-close' : 'ic-pause');
      this.heartIm.forEach(function (h) { h.setVisible(!d.free).setTexture('heart'); }); this.heartBox.setVisible(!d.free);
      this.beadsBuild(d.free ? 0 : d.target);
      this.hintOn = (!d.free && d.n === 1 && !F.store.get('taught', false)) ? 'watch' : ''; this.hintMake();
      if (!d.free) this.banner(d.n, d.world);
    }
    // the level and its world, said once large in the middle: two Texts kept for the whole game (see say)
    banner(n, wi) {
      var W = LV.worlds[wi];
      if (!this.banA) {
        this.banA = F.text(this, 960, 420, '', 40, '#ffffff', '800').setShadow(0, 4, 'rgba(0,0,0,.6)', 0, false, true);
        this.banB = F.text(this, 960, 530, '', 120, '#fffaf0', '900').setShadow(0, 4, 'rgba(0,0,0,.6)', 0, false, true);
      }
      var a = this.banA, b = this.banB;
      this.tweens.killTweensOf([a, b]);
      a.setText(W.name.toUpperCase()).setTint(hexOf(W.color)); b.setText('Level ' + n);
      [a, b].forEach(function (t) { t.setVisible(true).setAlpha(0); });
      this.tweens.add({ targets: [a, b], alpha: 1, duration: 350, hold: 800, yoyo: true, delay: 150, onComplete: function () { a.setVisible(false); b.setVisible(false); } });
    }
    // the little word that rises over the game ("Great!", "Watch again!"): one Text kept for the whole game (making a Text
    // makes a canvas and a texture; changing its words only repaints it), white and tinted to the colour wanted
    say(e) {
      var v = this.v; if (!v) return;
      var u = v.u, t = this.toast || (this.toast = F.text(this, 960, 0, '', 62, '#ffffff', '900').setShadow(0, 3, 'rgba(20,6,40,.85)', 0, false, true).setVisible(false));
      this.tweens.killTweensOf(t);
      var y = v.sb - 220 * u;
      t.setText(e.text).setTint(hexOf(e.color || '#fff6c2')).setScale(u).setPosition(960, y).setAlpha(0).setVisible(true);
      this.tweens.add({ targets: t, alpha: 1, y: y - 30, duration: 300, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: t, alpha: 0, y: y - 60, delay: 1000, duration: 500, onComplete: function () { t.setVisible(false); } });
    }
    killToast() { if (this.toast) { this.tweens.killTweensOf(this.toast); this.toast.setVisible(false); } }
    heartsSet(h) {
      this.heartIm.forEach(function (im, i) { var full = i < h; if (!full && im.texture.key === 'heart') { im.setTexture('heart0'); this.tweens.add({ targets: im, scale: { from: 1.3 * this.v.u, to: 0.85 * this.v.u }, duration: 350, ease: 'Back.easeOut' }); } }, this);
    }

    /* ---- progress: one star for each light of the goal ---- */
    beadsBuild(n) {
      this.beads.forEach(function (b) { b.destroy(); }); this.beads = [];
      for (var i = 0; i < n; i++) this.beads.push(this.add.image(0, 0, 'bead0').setAlpha(0.45));
      this.beadBox.setVisible(n > 0); this.beadsPlace();
    }
    beadsPlace() {
      var v = this.v, n = this.beads.length; if (!v || !n) return;
      var u = v.u, step = n > 1 ? Math.min(86, (v.w * 0.9 / u - 150) / (n - 1)) : 86, w = ((n - 1) * step + 150) * u, y = v.sb - 90 * u;
      this.bs = 0.58 * u;
      this.beadBox.setPosition(960, y).setScale(u, 0.62 * u).setSize(w / u, 150);
      this.beads.forEach(function (b, i) { b.setPosition(960 + (i - (n - 1) / 2) * step * u, y).setScale(this.bs); }, this);
    }
    beadsSet(e) {
      var self = this;
      this.beads.forEach(function (b, i) {
        if (e.all || i < e.done) { b.setTexture('bead1').setTint(GOLD).setAlpha(1); }
        else if (i < e.seq) b.setTexture('bead0').setTint(0xfff3c4).setAlpha(1);
        else b.setTexture('bead0').setTint(0xffffff).setAlpha(0.45);
        if (e.lit === i && e.ci != null && !e.pop && !e.all) b.setTexture('bead1').setTint(hexOf(A.LANTERNS[e.ci].c)).setAlpha(1);
        if ((e.pop && i === e.lit) || (e.lit === i && !e.all)) { self.tweens.killTweensOf(b); b.setScale(self.bs * 1.55); self.tweens.add({ targets: b, scale: self.bs, duration: 320, ease: 'Back.easeOut' }); }
        if (e.all) { self.tweens.killTweensOf(b); self.tweens.add({ targets: b, scale: { from: self.bs * 1.4, to: self.bs }, duration: 380, delay: i * 40, ease: 'Back.easeOut' }); }
      });
    }

    /* ---- the first level teaches (level-design: a teach beat) in the words of the device in use ---- */
    keysText(count) { return count > 4 ? 'Press 1 to 6' : 'Press 1 to 4'; }
    hintMake() {
      var h = this.hint; if (!this.hintOn) { h.setVisible(false); return; }
      var cnt = LV.list[Math.max(0, this.n - 1)].lanterns, keys = F.dev.mode === 'keys';
      h.setText(this.hintOn === 'watch' ? 'Watch, then copy them!' : (keys ? 'Your turn!  ' + this.keysText(cnt) + ', or the arrows and Space' : 'Your turn!  Tap the lanterns in the same order'));
      h.setVisible(!this.blocked); this.hintPlace();
    }
    // beside the hearts when there is room (a screen on its side), under them when not (held upright)
    hintPlace() {
      var v = this.v; if (!v) return; var u = Math.max(v.u, 18 * v.pt / 44);   // (the hint's words never under 18 points)
      var x0 = this.bPause.x + (75 + GAP + 340 + GAP) * u, x1 = v.sr - 150;
      this.hint.setScale(u);
      if (x1 - x0 >= 1100 * u) this.hint.setWordWrapWidth(1100).setPosition((x0 + x1) / 2, v.st + 115 * u);
      else this.hint.setWordWrapWidth(Math.min(1000, v.w / u - 120)).setPosition(960, v.st + 290 * u);
    }
    turn(e) {
      if (e && e.first === false && this.hintOn) { this.hintOn = ''; this.hintMake(); return; }
      if (this.hintOn) { this.hintOn = 'turn'; this.hintMake(); }
    }
    deviceChanged() { this.hintMake(); if (this.pause) this.pauseLayout(); }

    /* ---- the stack of screens: only the top one takes input; the game is paused under the pause screen and map ----
       Every screen is built ONCE, a moment after the level starts (a few frames apart, so no frame carries them all), and
       then only shown and hidden: building one on the touch put 5 to 40 Text objects (a canvas each) into a single frame,
       a 50 ms stall on a budget phone. */
    block(d) {
      this.blocked = Math.max(0, this.blocked + d);
      if (this.blocked) { this.killToast(); this.hint.setVisible(false); if (this.scene.isActive('Play')) this.scene.pause('Play'); } else { this.scene.resume('Play'); this.hintMake(); }
      this.bPause.setVisible(!this.blocked && !this.sheet);
    }
    esc(pOnly) {
      if (this.menu) { this.backFromMenu(); return; }
      if (this.pause) { this.closePause(); return; }
      if (this.sheet) return;
      if (this.free) { if (!pOnly) this.go(this.n); return; }
      this.openPause();
    }
    closeAll(quiet) {
      if (this.pause) { this.hide(this.pause); this.pause = null; this.blocked = Math.max(0, this.blocked - 1); }
      if (this.menu) { this.hide(this.menu); this.menu = null; this.blocked = Math.max(0, this.blocked - 1); }
      if (this.sheet) { this.hide(this.sheet); this.sheet = null; }
      if (quiet) this.blocked = 0;
      this.bPause.setVisible(!this.blocked);
    }
    // restart the world at a level (or in free play)
    go(n, free) {
      this.closeAll(true); this.blocked = 0;
      var play = this.scene.get('Play'); this.scene.resume('Play');
      play.scene.restart({ n: n, free: !!free });
    }

    // a screen: a dimmer over the game and a root container in the middle, both hidden until shown
    screen(w, h, dim) {
      var s = { w: w, h: h, dimA: dim, items: [] };
      s.dim = this.add.image(0, 0, 'px').setTint(0x04020e).setAlpha(dim).setInteractive();
      s.root = this.add.container(960, 540);
      s.items.push(s.dim, s.root); this.hide(s); return s;
    }
    show(s) {
      this.screenFit(s, s.w, s.h);
      s.items.forEach(function (o) { o.setVisible(true).setAlpha(0); });
      this.tweens.add({ targets: s.items, alpha: function (t) { return t === s.dim ? s.dimA : 1; }, duration: 180 });
    }
    hide(s) { if (!s) return; this.tweens.killTweensOf(s.items); s.items.forEach(function (o) { o.setVisible(false); }); }
    warm() {
      var self = this, step = [function () { self.buildPause(); }, function () { self.buildSheets(); }, function () { self.mapBuild(0); }, function () { self.mapBuild(1); }, function () { self.mapBuild(2); }, function () { self.mapBuild(3); }];
      step.forEach(function (f, i) { self.time.delayedCall(1100 + i * 140, f); });
    }

    // a big round choice with its label under it
    choice(items, icon, label, fn, main) {
      var self = this, c = this.add.container(0, 0, [this.add.image(0, 0, main ? 'ui-big' : 'ui-plate').setScale(main ? 1.15 : 1.53), this.add.image(main ? 10 : 0, 0, icon).setScale(1.4).setTint(main ? 0x1a1030 : 0xffffff)]).setSize(230, 230).setInteractive();
      c.label = F.text(this, 0, 0, label, 40, INK, '700').setOrigin(0.5, 0);
      c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: 0.92, duration: 70, yoyo: true }); }); c.on('pointerup', fn);
      items.push(c.label); return c;
    }
    // a pill button with an icon and a word; main = the golden one
    pill(parent, x, y, label, icon, fn, main, w) {
      var self = this, c = this.add.container(x, y, [this.add.nineslice(0, 0, main ? 'ui-btn' : 'ui-btn2', null, w || 400, 150, 74, 74, 74, 74)]);
      c.bg = c.list[0]; c.label = F.text(this, 0, 0, '', 46, INK, '800'); c.add(c.label);
      c.icon = icon ? this.add.image(0, 0, icon).setScale(0.9) : null; if (c.icon) c.add(c.icon);
      this.pillSet(c, label, main);
      c.setSize(w || 400, 150).setInteractive();
      c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: 0.94, duration: 70, yoyo: true }); }); c.on('pointerup', fn);
      parent.add(c); return c;
    }
    pillSet(c, label, main) {
      c.label.setText(label).setColor(main ? '#1a1030' : INK); c.bg.setTexture(main ? 'ui-btn' : 'ui-btn2');
      var off = c.icon ? 36 : 0; c.label.setX(off);
      if (c.icon) c.icon.setPosition(off - c.label.width / 2 - 48, 0).setTint(main ? 0x1a1030 : 0xffffff);
    }

    /* ---- the pause screen ---- */
    buildPause() {
      if (this.sp) return;
      var self = this, p = this.sp = this.screen(1500, 760, 0.74);
      p.title = F.text(this, 0, -290, 'Paused', 80, INK, '800'); p.sub = F.text(this, 0, -205, '', 40, '#ffffff', '700');
      p.exit = this.button('ic-exit', function () { Kit.play.exit(); }); p.items.push(p.exit); p.exit.setVisible(false);
      p.row = [
        this.choice(p.items, 'ic-play', 'Resume', function () { self.closePause(); }, true),
        this.choice(p.items, 'ic-retry', 'Restart', function () { self.go(self.n); }),
        this.choice(p.items, 'ic-grid', 'Levels', function () { self.openMenu(true); }),
        this.choice(p.items, 'ic-lantern', 'Free Play', function () { self.go(self.n, true); }),
        this.choice(p.items, 'ic-snd', 'Sound: On', function () { Kit.snd.setMuted(!Kit.snd.muted); p.snd(); })
      ];
      p.how = F.text(this, 0, 330, '', 34, INK, '600', { align: 'center', wordWrap: { width: 1500 } }).setAlpha(0.88);
      p.root.add([p.title, p.sub].concat(p.row, p.row.map(function (c) { return c.label; }), [p.how]));
      p.items.splice(p.items.indexOf(p.row[0].label), 5);            // (the labels live in the root, which is already an item)
      p.snd = function () { var m = Kit.snd.muted, b = p.row[4]; b.list[1].setTexture(m ? 'ic-mute' : 'ic-snd'); b.label.setText(m ? 'Sound: Off' : 'Sound: On'); };
      p.layout = function () {
        var v = self.v; if (!v) return;
        p.exit.setPosition(v.sl + (40 + 75) * v.u, v.st + (40 + 75) * v.u).setScale(v.u);            // where the pause button was
        var w = 230, gap = 64, n = p.row.length, x0 = -((n - 1) * (w + gap)) / 2;
        p.row.forEach(function (c, i) { c.setPosition(x0 + i * (w + gap), 0); c.label.setPosition(c.x, w / 2 + 24); });
        self.screenFit(p, 1500, 760);
      };
      p.layout();
    }
    pauseText() {
      var p = this.pause; if (!p) return;
      var W = LV.worlds[this.world || 0], cnt = LV.list[this.n - 1].lanterns;
      p.sub.setText(W.name + '  ·  Level ' + this.n).setColor(W.color);
      p.how.setText(F.dev.mode === 'keys' ? this.keysText(cnt) + ' to pick a light  ·  Arrows move, Space taps  ·  R restart  ·  Esc pause  ·  M sound' : 'Watch the lights, then tap the lanterns in the same order');
      p.snd();
    }
    pauseLayout() { if (this.pause) { this.pause.layout(); this.pauseText(); } }
    openPause() {
      if (this.pause || this.menu || this.sheet) return;
      this.buildPause(); var p = this.pause = this.sp;
      this.block(1); this.pauseText(); p.layout(); this.show(p);
    }
    closePause() { var p = this.pause; if (!p) return; this.pause = null; this.hide(p); this.block(-1); }

    /* ---- the level map: every level of each world; a star for each earned ---- */
    // built in four steps (the frame and header, then a world each); rebuilt after a level is won (the stars changed)
    mapBuild(step) {
      var self = this, P = F.progress;
      if (step === 0) {
        if (this.sm) { this.sm.items.forEach(function (o) { o.destroy(); }); this.sm = null; }
        var m = this.sm = this.screen(1800, 1000, 0.76); m.step = 0; m.cells = {}; this.mapDirty = false;
        m.root.add(this.add.nineslice(0, 0, 'ui-card', null, 1800, 1000, 70, 70, 70, 70));
        var plate = function (icon, x, y, fn) {
          var c = self.add.container(x, y, [self.add.image(0, 0, 'ui-plate'), self.add.image(0, 0, icon)]).setSize(150, 150).setInteractive();
          c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: 0.9, duration: 70, yoyo: true }); }); c.on('pointerup', fn); m.root.add(c); return c;
        };
        plate('ic-exit', -770, -380, function () { Kit.play.exit(); });
        plate('ic-close', 770, -380, function () { self.backFromMenu(); });
        m.root.add(F.text(this, 0, -385, 'Follow the Light', 76, INK, '800'));
        m.ring = this.add.image(0, 0, 'ui-lvo').setScale(1.12).setVisible(false); m.root.add(m.ring);
        m.step = 1; return;
      }
      var m2 = this.sm; if (!m2 || m2.step !== step) return;
      var wi = step - 1, w = LV.worlds[wi], y0 = -255 + wi * 270, col = hexOf(w.color);
      m2.root.add(F.text(this, -820, y0, w.name, 36, w.color, '800').setOrigin(0, 0.5));
      for (var k = 0; k < 10; k++) {
        var n = wi * 10 + k + 1, open = P.unlocked(n), st = P.stars(n), x = -756 + k * 168, y = y0 + 110;
        var kids = [this.add.image(0, 0, 'ui-lv').setTint(col).setAlpha(open ? 0.3 : 0.1), this.add.image(0, 0, 'ui-lvo').setTint(col).setAlpha(open ? 1 : 0.38)];
        if (!open) kids.push(this.add.image(0, 0, 'ic-lock').setScale(0.8).setAlpha(0.6));
        else {
          kids.push(F.text(this, 0, -20, String(n), 58, INK, '800'));
          for (var q = 0; q < 3; q++) kids.push(this.add.image((q - 1) * 38, 42, 'star8').setScale(0.3).setTint(q < st ? GOLD : 0xffffff).setAlpha(q < st ? 1 : 0.28));
        }
        var cell = this.add.container(x, y, kids).setSize(150, 150); m2.root.add(cell); m2.cells[n] = { x: x, y: y, open: open };
        if (open) (function (lv, c) { c.setInteractive(); c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: 0.92, duration: 70, yoyo: true }); }); c.on('pointerup', function () { self.go(lv); }); })(n, cell);
      }
      m2.step = step + 1;
    }
    mapReady() {
      if (!this.sm || this.mapDirty) this.mapBuild(0);
      while (this.sm.step <= 3) this.mapBuild(this.sm.step);                    // (opened before the steps ran: finish them now)
    }
    // after a level is won the map's stars and locks are out of date: rebuild it, a step at a time, while the child watches the sparkles
    mapStale() { var self = this; this.mapDirty = true; [0, 1, 2, 3].forEach(function (i) { self.time.delayedCall(400 + i * 140, function () { if (i === 0 || (self.sm && self.sm.step === i && !self.mapDirty)) self.mapBuild(i); }); }); }
    openMenu(fromPause) {
      if (this.menu) return;
      if (this.pause) { this.hide(this.pause); this.pause = null; } else this.block(1);   // (the stack: the map replaces the pause screen and pops back to it)
      this.mapReady(); var m = this.menu = this.sm; m.fromPause = !!fromPause;
      var c = m.cells[F.progress.current()];                                       // the ring marks the level to continue
      if (c && c.open) m.ring.setPosition(c.x, c.y).setVisible(true); else m.ring.setVisible(false);
      this.show(m); m.ring.setAlpha(1);
    }
    // closing the map: back to the pause screen it was opened from (the stack pops), or straight on with the level
    backFromMenu() {
      var m = this.menu; if (!m) return;
      this.hide(m); this.menu = null;
      if (m.fromPause) { this.blocked = Math.max(0, this.blocked - 1); this.openPause(); } else this.go(this.n);
    }

    /* ---- the result of a level: a sheet with stars and the next step ---- */
    buildSheets() {
      if (this.sw) return;
      var self = this, W = this.sw = this.screen(1200, 820, 0.6), root = W.root;
      root.add(this.add.nineslice(0, 0, 'ui-card', null, 1200, 820, 70, 70, 70, 70));
      W.title = F.text(this, 0, -295, '', 80, INK, '900', { wordWrap: { width: 1100 }, align: 'center' }); W.sub = F.text(this, 0, -205, '', 42, INK, '600');
      W.stars = [0, 1, 2].map(function (i) { return self.add.image((i - 1) * 190, -70, 'star8'); });
      W.next = this.pill(root, 0, 110, 'Next Level', 'ic-next', function () { self.go(self.n + 1); }, true, 520);
      W.again = this.pill(root, -230, 280, 'Replay', 'ic-retry', function () { self.go(W.last ? 1 : self.n); }, false, 420);
      W.lv = this.pill(root, 230, 280, 'Levels', 'ic-grid', function () { self.openFromSheet(); }, false, 420);
      root.add([W.title, W.sub].concat(W.stars));
      var F2 = this.sf = this.screen(1200, 640, 0.6), r2 = F2.root;
      r2.add(this.add.nineslice(0, 0, 'ui-card', null, 1200, 640, 70, 70, 70, 70));
      r2.add(F.text(this, 0, -195, 'Out of hearts', 80, INK, '900')); r2.add(F.text(this, 0, -95, "Let's watch the lights again!", 44, INK, '600'));
      this.pill(r2, 0, 55, 'Try Again', 'ic-retry', function () { self.go(self.n); }, true, 520);
      this.pill(r2, 0, 225, 'Levels', 'ic-grid', function () { self.openFromSheet(); }, false, 520);
    }
    levelEnd(e) {
      if (this.sheet || this.pause || this.menu) return;
      this.buildSheets();
      this.bPause.setVisible(false); this.killToast(); this.hint.setVisible(false);
      var self = this, s = this.sheet = e.win ? this.sw : this.sf, W = LV.worlds[this.world || 0];
      if (e.win) {
        s.last = e.last;
        s.title.setText(e.last ? 'You did it!' : e.endOfWorld ? W.name + ' complete!' : 'Lights complete!').setFontSize(e.last || e.endOfWorld ? 66 : 80);
        s.sub.setText(e.last ? 'Every lantern is shining. MashaAllah!' : 'You followed ' + e.len + ' lights!');
        this.pillSet(s.next, e.endOfWorld ? 'Next World' : 'Next Level', true); s.next.setVisible(!e.last);
        this.pillSet(s.again, e.last ? 'Play Again' : 'Replay', !!e.last); var y = e.last ? 110 : 280; s.again.y = y; s.lv.y = y;
        this.mapStale();                                                      // (the stars and the next level changed)
      }
      this.show(s);
      if (e.win) s.stars.forEach(function (st, i) {
        st.setScale(0).setTint(i < e.stars ? GOLD : 0xffffff).setAlpha(i < e.stars ? 1 : 0.28);
        self.tweens.add({ targets: st, scale: 1.55, duration: 380, delay: 250 + i * 260, ease: 'Back.easeOut', onStart: function () { if (i < e.stars) Kit.snd.play('star'); } });
      });
    }
    openFromSheet() {
      var s = this.sheet; if (!s) return; this.hide(s); this.sheet = null;
      this.openMenu(false);
    }
  }
  window.FtlHud = Hud;
})();
