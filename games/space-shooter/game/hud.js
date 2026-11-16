/* Star Rangers: the interface (scene 'Hud', above the field). Laid out by the game-ui-ux skill, after Spider IK.
   While playing, the screen is the game: one pause button in the top-left corner, the hearts beside it (what the player
   needs), the score small in the top-right, and the boss machine's health bar while one is there. The controls are the
   whole screen: drag anywhere to fly (direct touch, so there is no on-screen stick or button to hide), shown to a child
   who has not flown yet by a hand that slides and a line of words, in the words of the device last used (a touch or a
   key switches them at once); a quiet ring follows the finger while it drags.
   Everything else is a stack of screens over the game: the pause screen (resume, restart, levels, sound, the way out),
   the levels screen (24 waves by world), and the end of a wave (stars, next, replay) or of a try (try again). Only the
   top screen takes input; Play is paused under the pause and levels screens (scene.pause).
   All Phaser: images from the 'ui' atlas, NineSlice cards and pills, Text, tweens for every fade and pop.
   The interface is laid out in a space whose SHORT side is 1000 units (SR.fit 'hud'), anchored to the safe area
   (view.sl / sr / st / sb), one GAP between buttons, every button at least 150 units, text at least 34 units (about
   12 CSS px on a phone upright, more on any other screen). Input arrives as game state: Play reads S.tx / S.ty set by
   its own drag handler; the screens set Play.blocked so a tap on a screen never steers the ship. */
(function () {
  'use strict';
  var A = window.SrArt, GAP = SR.GAP, COUNT = SR.COUNT, PER = SR.PER, S = A.S;
  var DARK = 0x080a1c, TEXT = '#f6f3ff';

  class Hud extends Phaser.Scene {
    constructor() { super({ key: 'Hud' }); }
    create() {
      var self = this, ev = this.game.events, on = function (k, f) { ev.on(k, f, self); self.events.once('shutdown', function () { ev.off(k, f, self); }); };
      this.device = this.sys.game.device.input.touch ? 'touch' : 'keys';
      this.stack = []; this.maxH = 3; this.hearts = 3; this.score = 0; this.n = 1; this.world = 0; this.boss = false; this.hintOn = false;

      // the way in: one pause button, the hearts, the score
      // (drawn in three runs, one per kind of picture: the two pills, then the plate, icon, hearts and star, then the number;
      // every change of kind in the draw order is a draw call)
      this.hpill = SR.nine(this, 0, 0, 'pillp9', 280, 110, 48).setDepth(1);
      this.spill = SR.nine(this, 0, 0, 'pillp9', 300, 110, 48).setDepth(1);
      this.bPause = SR.ui(this, 0, 0, 'plate').setDepth(2).setInteractive();
      this.bPauseIcon = SR.ui(this, 0, 0, 'ic-pause').setDepth(2);
      this.bPause.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: [self.bPause, self.bPauseIcon], scale: 0.9 / S, duration: 70, yoyo: true }); });
      this.bPause.on('pointerup', function () { self.openPause(); });
      this.hh = []; for (var i = 0; i < 5; i++) this.hh.push(SR.ui(this, 0, 0, 'heart').setScale(0.9 / S).setDepth(2));
      this.sstar = SR.ui(this, 0, 0, 'gold').setScale(0.7 / S).setDepth(2);
      this.stext = this.add.bitmapText(0, 0, 'wfont', '0', 54).setOrigin(1, 0.5).setDepth(3);

      // the boss machine's bar
      this.bn = SR.txt(this, 0, 0, '', 44, { stroke: '#0a061e', thick: 7 }).setAlpha(0).setVisible(false);
      this.bbg = SR.nine(this, 0, 0, 'pill9', 400, 34, 17).setTint(0x0e0a22).setAlpha(0).setVisible(false);
      this.blag = SR.nine(this, 0, 0, 'pill9', 400, 26, 13).setAlpha(0).setVisible(false);
      this.bfill = SR.nine(this, 0, 0, 'pill9', 400, 26, 13).setAlpha(0).setVisible(false);
      this.bar = { shown: 1, frac: 1, w: 400 };
      [this.bbg, this.blag, this.bfill].forEach(function (o) { o.setScale(1 / 200); });

      // wave and boss banners
      this.b1 = SR.txt(this, 0, 0, '', 50, { stroke: '#08041a', thick: 9 }).setAlpha(0).setVisible(false);
      this.b2 = SR.txt(this, 0, 0, '', 150, { color: '#fffaf0', stroke: '#08041a', thick: 16 }).setAlpha(0).setVisible(false);
      this.b3 = SR.txt(this, 0, 0, '', 62, { color: '#fffaf0', stroke: '#08041a', thick: 11 }).setAlpha(0).setVisible(false);

      // teaching: a hand and words until the child has flown; a quiet ring under the finger
      this.hand = SR.ui(this, 0, 0, 'hand').setScale(1 / S).setAlpha(0).setVisible(false);
      this.hintT = SR.txt(this, 0, 0, '', 58, { stroke: '#08041a', thick: 10, wrap: 900 }).setAlpha(0).setVisible(false);
      this.ring = SR.ui(this, 0, 0, 'finger').setAlpha(0).setScale(1.1 / S).setVisible(false);
      this.input.on('pointerdown', function (p) {
        if (p.wasTouch) self.setDevice('touch'); else self.setDevice(self.device === 'touch' ? 'touch' : 'keys');
        if (p.wasTouch && !self.stack.length && !self.input.hitTestPointer(p).length) { self.tweens.killTweensOf(self.ring); self.ring.setPosition(p.worldX, p.worldY).setVisible(true).setAlpha(0.32).setScale(0.8 / S); self.tweens.add({ targets: self.ring, scale: 1.1 / S, duration: 180, ease: 'Back.easeOut' }); }
      });
      this.input.on('pointermove', function (p) { if (p.isDown && p.wasTouch && self.ring.alpha > 0) self.ring.setPosition(p.worldX, p.worldY); });
      var up = function (p) { if (p.wasTouch) { self.tweens.killTweensOf(self.ring); self.tweens.add({ targets: self.ring, alpha: 0, duration: 220, onComplete: function () { self.ring.setVisible(false); } }); } };
      this.input.on('pointerup', up); this.input.on('pointerupoutside', up);

      // keys (the same actions as the screens' buttons)
      var K = this.keys = this.input.keyboard.addKeys('ESC,P,R,M');
      this.input.keyboard.on('keydown', function () { self.setDevice('keys'); });
      K.ESC.on('down', function () { self.toggle(); }); K.P.on('down', function () { self.toggle(); });
      K.R.on('down', function () { var p = self.play(); if (p && !self.stack.length) self.go(p.level); });
      K.M.on('down', function () { Kit.snd.setMuted(!Kit.snd.muted); if (self.pauseUi) self.pauseUi.snd(); });

      on('sr-start', this.onStart); on('sr-stat', this.onStat); on('sr-boss', this.onBoss); on('sr-result', this.onResult); on('sr-flown', this.onFlown); on('sr-pause', this.openPause);
      SR.fit(this, 'hud', this.layout);
      var last = this.registry.get('sr'); if (last) this.onStart(last);
    }
    play() { var p = this.scene.get('Play'); return p && p.sys.settings.status >= Phaser.Scenes.RUNNING && p.G ? p : null; }
    toggle() {
      if (this.stack.length) { var top = this.stack[this.stack.length - 1]; if (top.canClose) top.back(); return; }
      this.openPause();
    }

    // a round button: a dark plate (readable on any sky) and its icon; it answers the touch at once
    button(icon, fn, parent) {
      var self = this, c = this.add.container(0, 0, [SR.ui(this, 0, 0, 'plate'), SR.ui(this, 0, 0, icon)]);
      c.setSize(150, 150).setInteractive();
      c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: 0.9, duration: 70, yoyo: true }); });
      c.on('pointerup', fn); return c;
    }

    layout(v) {
      this.v = v;
      var top = v.st + 40 + 75, left = v.sl + 40 + 75;
      this.bPause.setPosition(left, top); this.bPauseIcon.setPosition(left, top);
      this.hudPlace();
      this.bossPlace();
      this.hintPlace();
      var s = this.stack[this.stack.length - 1]; if (s) s.layout();
      // (a screen below the top one is placed again when it comes back)
    }
    hudPlace() {
      var v = this.v; if (!v) return;
      var y = this.bPause.y, n = this.maxH, w = n * 76 + 52, x = this.bPause.x + 75 + GAP + w / 2;
      this.hpill.setPosition(x, y); this.hpill.setSize(w * S, 110 * S);
      this.hh.forEach(function (h, i) { h.setPosition(x - w / 2 + 26 + 38 + i * 76, y).setVisible(i < n); });
      this.scorePlace(true);
      this.banPlace();
    }
    // the score pill grows with its number; resized only when its width really changes
    scorePlace(force) {
      var v = this.v; if (!v) return;
      var sw = Math.max(210, Math.ceil((this.stext.width + 140) / 20) * 20), y = this.bPause.y, sx = v.sr - 40 - sw / 2;
      if (force || sw !== this.sw) { this.sw = sw; this.spill.setPosition(sx, y); this.spill.setSize(sw * S, 110 * S); this.sstar.setPosition(sx - sw / 2 + 62, y); this.stext.setPosition(sx + sw / 2 - 34, y); }
    }
    onStat(d) {
      var lost = d.hearts < this.hearts, changed = d.hearts !== this.hearts; this.hearts = d.hearts;
      if (changed) {
        this.hh.forEach(function (h, i) { h.setTexture('ui', i < d.hearts ? 'heart' : 'heart0'); });
        if (d.hearts > this.maxH) { this.maxH = Math.min(5, d.hearts); this.hudPlace(); }
      }
      if (d.hurt) { this.tweens.add({ targets: [this.hpill].concat(this.hh), x: '+=10', duration: 50, yoyo: true, repeat: 3 }); if (lost) this.tweens.add({ targets: this.hh[Math.min(4, d.hearts)], scale: { from: 1.3 / S, to: 0.9 / S }, duration: 260 }); }
      else if (d.hearts > 0 && !d.bump) this.tweens.add({ targets: this.hh[d.hearts - 1], scale: { from: 1.4 / S, to: 0.9 / S }, duration: 300, ease: 'Back.easeOut' });
      if (d.score !== this.score) {
        this.score = d.score; this.stext.setText(SR.num(d.score)); this.scorePlace(false);
        if (d.bump) { this.tweens.killTweensOf(this.stext); this.stext.setScale(1.18); this.tweens.add({ targets: this.stext, scale: 1, duration: 200, ease: 'Back.easeOut' }); }
      }
    }

    /* ---- a wave starts: banner, hint ---- */
    onStart(d) {
      this.n = d.n; this.world = d.world; this.hearts = d.hearts; this.maxH = Math.max(3, d.hearts); this.score = 0; this.boss = false;
      this.hh.forEach(function (h, i) { h.setTexture('ui', i < d.hearts ? 'heart' : 'heart0'); });
      this.stext.setText('0'); this.hudPlace();
      this.bossHide();
      var w = A.WORLDS[d.world], idx = SR.stage(d.n).idx;
      this.banner(w.name.toUpperCase(), d.boss ? 'Boss Wave' : 'Wave ' + idx, d.name, w.color, 2200); Kit.snd.play('page', { vol: 0.5 });
      this.hintOn = !d.flown; this.hintMake();
    }
    banPlace() { var v = this.v; if (!v) return; var cy = v.h * 0.36; this.b1.setPosition(v.w / 2, cy - 110); this.b2.setPosition(v.w / 2, cy); this.b3.setPosition(v.w / 2, cy + 110); }
    banner(top, big, sub, color, ms) {
      var T = [this.b1, this.b2, this.b3], self = this;
      T.forEach(function (t) { self.tweens.killTweensOf(t); });
      this.b1.setText(top).setColor(color); this.b2.setText(big); this.b3.setText(sub || ''); this.banPlace();
      var fit = Math.min(1, (this.v.w - 120) / Math.max(this.b2.width, this.b1.width, this.b3.width)); T.forEach(function (t) { t.setVisible(true).setAlpha(0).setScale(fit * 0.85); });
      this.tweens.add({ targets: T, alpha: 1, scale: fit, duration: 320, ease: 'Back.easeOut' });
      this.tweens.add({ targets: T, alpha: 0, duration: 380, delay: ms - 380, onComplete: function () { T.forEach(function (t) { t.setVisible(false); }); } });
    }
    hintMake() {
      this.tweens.killTweensOf([this.hand, this.hintT]);
      if (!this.hintOn) { this.hand.setAlpha(0).setVisible(false); this.hintT.setAlpha(0).setVisible(false); return; }
      var touch = this.device === 'touch';
      this.hintT.setText(touch ? 'Drag anywhere to fly' : 'Arrow keys or WASD to fly\n(or move the mouse)').setAlpha(0).setVisible(true);
      this.hintPlace();
      this.tweens.add({ targets: this.hintT, alpha: 1, duration: 400, delay: 1500 });
      if (touch) {
        this.hand.setAlpha(0).setVisible(true); this.tweens.add({ targets: this.hand, alpha: 0.95, duration: 400, delay: 1500 });
        this.hand.x = this.hx - 140; this.tweens.add({ targets: this.hand, x: this.hx + 140, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 1500 });
      } else this.hand.setAlpha(0).setVisible(false);
    }
    hintPlace() { var v = this.v; if (!v) return; this.hx = v.w / 2; this.hintT.setPosition(v.w / 2, v.h * 0.55); this.hand.setPosition(this.hx, v.h * 0.55 + 190); }
    onFlown() { this.hintOn = false; this.tweens.killTweensOf([this.hand, this.hintT]); var self = this; this.tweens.add({ targets: [this.hand, this.hintT], alpha: 0, duration: 400, onComplete: function () { self.hand.setVisible(false); self.hintT.setVisible(false); } }); }
    setDevice(d) { if (d === this.device) return; this.device = d; if (this.hintOn) this.hintMake(); if (this.pauseUi) this.pauseUi.layout(); }

    /* ---- the boss machine's bar ---- */
    onBoss(d) {
      var b = this.bar, self = this;
      if (d.show) {
        this.boss = true; b.frac = 1; b.shown = 1; this.bn.setText(d.name).setColor(d.color); this.bfill.setTint(SR.hex(d.color)); this.blag.setTint(0xffffff);
        this.bossPlace(); [this.bn, this.bbg, this.blag, this.bfill].forEach(function (o) { o.setVisible(true); });
        this.tweens.add({ targets: [this.bn, this.bbg], alpha: 1, duration: 400, delay: 900 }); this.tweens.add({ targets: this.blag, alpha: 0.75, duration: 400, delay: 900 }); this.tweens.add({ targets: this.bfill, alpha: 1, duration: 400, delay: 900 });
        if (d.banner) this.banner('BOSS MACHINE AHEAD', d.name, 'Hit the glowing core!', '#ffd36b', 2400);
      }
      if (d.max) { b.frac = Phaser.Math.Clamp(d.hp / d.max, 0, 1); this.barSet(); this.tweens.killTweensOf(b); this.tweens.add({ targets: b, shown: b.frac, duration: 450, delay: 150, onUpdate: function () { self.barSet(); } }); }
      if (d.done) this.time.delayedCall(1200, this.bossHide, [], this);
    }
    pill(o, w, h) { o.setScale(h / (100 * S)); o.setSize(w / o.scaleX, h / o.scaleX); }
    barSet() { var b = this.bar; this.pill(this.bfill, Math.max(26, b.w * b.frac), 26); this.pill(this.blag, Math.max(26, b.w * Math.max(b.shown, b.frac)), 26); this.bfill.x = this.bx - b.w / 2 + Math.max(26, b.w * b.frac) / 2; this.blag.x = this.bx - b.w / 2 + Math.max(26, b.w * Math.max(b.shown, b.frac)) / 2; }
    bossPlace() {
      var v = this.v; if (!v) return; var b = this.bar; b.w = Math.min(v.w - 240, 820); var y = v.st + 40 + 150 + 56;
      this.bx = v.w / 2; this.bn.setPosition(v.w / 2, y); this.bbg.setPosition(v.w / 2, y + 52); this.pill(this.bbg, b.w + 12, 38);
      this.bfill.y = y + 52; this.blag.y = y + 52; this.barSet();
    }
    bossHide() { this.boss = false; this.tweens.killTweensOf([this.bn, this.bbg, this.blag, this.bfill]); [this.bn, this.bbg, this.blag, this.bfill].forEach(function (o) { o.setAlpha(0).setVisible(false); }); }

    /* ---- a stack of screens over the game ---- */
    push(sc, pausePlay) {
      var self = this, p = this.scene.get('Play');
      sc.pausePlay = pausePlay;
      this.stack.forEach(function (s) { s.items.forEach(function (o) { o.setVisible(false); }); });
      this.stack.push(sc);
      this.bPause.setVisible(false); this.bPauseIcon.setVisible(false); this.hudHide(true); this.hand.setVisible(false); this.hintT.setVisible(false);
      if (p) p.blocked = (p.blocked || 0) + 1;
      if (pausePlay && p && p.sys.settings.status === Phaser.Scenes.RUNNING) this.scene.pause('Play');
      sc.layout();
      sc.items.forEach(function (o) { o.setAlpha(0); });
      this.tweens.add({ targets: sc.items, alpha: function (t) { return t.fullAlpha != null ? t.fullAlpha : 1; }, duration: 160 });
    }
    // pop the top screen (quiet: no sound); what is below it comes back
    pop() {
      var sc = this.stack.pop(), p = this.scene.get('Play'); if (!sc) return;
      sc.items.forEach(function (o) { o.destroy(); }); if (sc === this.pauseUi) this.pauseUi = null;
      if (p) p.blocked = Math.max(0, (p.blocked || 0) - 1);
      var below = this.stack[this.stack.length - 1];
      if (below) { below.items.forEach(function (o) { o.setVisible(true); }); below.layout(); }
      else { this.bPause.setVisible(true); this.bPauseIcon.setVisible(true); this.hudHide(false); if (this.hintOn) { this.hand.setVisible(this.device === 'touch'); this.hintT.setVisible(true); } }
      if (sc.pausePlay && !this.stack.some(function (s) { return s.pausePlay; })) this.scene.resume('Play');
    }
    closeAll() { while (this.stack.length) this.pop(); }
    hudHide(h) { [this.hpill, this.spill, this.sstar, this.stext].concat(this.hh).forEach(function (o) { o.setVisible(!h); }); if (!h) this.hudPlace(); }

    // dim + the back arrow where the pause button was
    base(fullDim) {
      var self = this, items = [];
      var dim = this.add.image(0, 0, 'ui', 'px').setTint(0x040a18).setInteractive(); dim.fullAlpha = fullDim || 0.74; items.push(dim);
      return { items: items, dim: dim };
    }
    // big round choice with its word under it; the first one (the way on) is gold
    choice(sc, icon, label, fn, main, size) {
      var self = this, d = size || 200, c = this.add.container(0, 0, [main ? SR.ui(this, 0, 0, 'big').setScale(d / 268 / 1) .setScale(d / (268 * S)) : SR.ui(this, 0, 0, 'plate').setScale(d / (140 * S)), SR.ui(this, main ? 8 : 0, 0, icon).setScale(1.3 / S * 1).setTint(main ? 0x0c1030 : 0xffffff)]).setSize(d, d).setInteractive();
      c.d = d; c.icon = c.list[1];
      c.label = SR.txt(this, 0, 0, label, 42, { style: '700', stroke: '#08041a', thick: 7 });
      c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: 0.92, duration: 70, yoyo: true }); }); c.on('pointerup', fn);
      sc.items.push(c, c.label); return c;
    }
    backArrow(sc, fn, icon) {
      var b = this.button(icon || 'ic-back', fn); sc.items.push(b); sc.arrow = b; return b;
    }
    // choices in a row, centred, one GAP apart (wraps nothing: four 200-unit buttons fit 1000)
    row(list, cy, gap) {
      var v = this.v, w = list[0].d, n = list.length, x0 = v.w / 2 - ((n - 1) * (w + gap)) / 2;
      list.forEach(function (c, i) { c.setPosition(x0 + i * (w + gap), cy); c.label.setPosition(c.x, cy + w / 2 + 36); });
    }
    fullDim(sc) { var v = this.v; sc.dim.setPosition(v.w / 2, v.h / 2).setDisplaySize(v.w + 8, v.h + 8); }
    anchorBack(sc) { var v = this.v; sc.arrow.setPosition(v.sl + 40 + 75, v.st + 40 + 75); }
    controlsLine() { return this.device === 'touch' ? 'Drag anywhere to fly  ·  your ship shoots by itself' : 'Arrow keys or WASD fly  ·  Esc pauses  ·  R restarts  ·  M sound'; }

    /* ---- the pause screen ---- */
    openPause() {
      if (this.stack.length || !this.play() || this.play().state !== 'play') return;
      var self = this, p = this.play(), sc = this.base(0.74), w = A.WORLDS[p.world], idx = SR.stage(p.level).idx;
      this.pauseUi = sc; sc.canClose = true;
      var T = function (s, size, o) { var t = SR.txt(self, 0, 0, s, size, o); sc.items.push(t); return t; };
      sc.title = T('Paused', 100, { stroke: '#08041a', thick: 12 });
      sc.sub = T(w.name + '  ·  ' + (p.def.boss != null ? 'Boss' : 'Wave ' + idx), 50, { color: w.color, stroke: '#08041a', thick: 8 });
      this.backArrow(sc, function () { Kit.play.exit(); }, 'ic-exit');
      sc.row = [
        this.choice(sc, 'ic-play', 'Resume', function () { self.pop(); }, true),
        this.choice(sc, 'ic-retry', 'Restart', function () { self.go(p.level); }),
        this.choice(sc, 'ic-grid', 'Levels', function () { self.openLevels(true); }),
        this.choice(sc, Kit.snd.muted ? 'ic-mute' : 'ic-snd', Kit.snd.muted ? 'Sound: Off' : 'Sound: On', function () { Kit.snd.setMuted(!Kit.snd.muted); sc.snd(); })
      ];
      sc.how = T(this.controlsLine(), 40, { style: '600', wrap: 940 }); sc.how.setAlpha(0.9);
      sc.snd = function () { var m = Kit.snd.muted, b = sc.row[3]; b.icon.setTexture('ui', m ? 'ic-mute' : 'ic-snd'); b.label.setText(m ? 'Sound: Off' : 'Sound: On'); };
      sc.layout = function () {
        var v = self.v, cy = v.h / 2; self.fullDim(sc); self.anchorBack(sc);
        sc.title.setPosition(v.w / 2, cy - 330); sc.sub.setPosition(v.w / 2, cy - 230);
        self.row(sc.row, cy - 20, 30);
        sc.how.setText(self.controlsLine()).setPosition(v.w / 2, Math.min(v.sb - 70, cy + 250));
      };
      sc.back = function () { self.pop(); };
      this.push(sc, true);
    }

    /* ---- the levels screen: every wave by world ---- */
    openLevels(fromPause) {
      var self = this, sc = this.base(0.8), prog = SR.progress, cur = this.play() ? this.play().level : prog.current(), T = function (s, size, o) { var t = SR.txt(self, 0, 0, s, size, o); sc.items.push(t); return t; };
      sc.canClose = true; sc.blocks = [];
      this.backArrow(sc, function () { self.pop(); });
      sc.back = function () { self.pop(); };
      sc.title = T('Star Rangers', 80, { stroke: '#08041a', thick: 10 });
      A.WORLDS.forEach(function (w, wi) {
        var blk = { name: T(w.name, 50, { color: w.color, ox: 0 }), got: T('', 44, { ox: 1, style: '700' }), cells: [] }, got = 0;
        sc.blocks.push(blk);
        for (var i = 1; i <= PER; i++) (function (n) {
          var open = prog.unlocked(n), st = prog.stars(n), col = SR.hex(w.color), boss = i === PER, kids = [];
          kids.push(SR.ui(self, 0, 0, 'lv').setScale(140 / (140 * S)).setTint(col).setAlpha(open ? 0.32 : 0.1));
          kids.push(SR.ui(self, 0, 0, 'lvo').setScale(140 / (140 * S)).setTint(boss ? 0xf6c453 : col).setAlpha(open ? 1 : 0.4));
          if (!open) kids.push(SR.ui(self, 0, 0, 'ic-lock').setScale(0.9 / S * 1).setAlpha(0.7));
          else {
            kids.push(SR.txt(self, 0, -16, String(i), 62));
            for (var s = 0; s < 3; s++) kids.push(SR.ui(self, (s - 1) * 38, 42, s < st ? 'gold' : 'gold0').setScale(0.36 / S));
          }
          var cell = self.add.container(0, 0, kids).setSize(140, 140); cell.n = n;
          if (n === cur && open) { var rg = SR.ui(self, 0, 0, 'lvo').setScale(154 / (140 * S)).setTint(0xffffff); cell.add(rg); self.tweens.add({ targets: rg, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 }); }
          if (open) {
            cell.setInteractive();
            cell.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: cell, scale: 0.92, duration: 70, yoyo: true }); });
            cell.on('pointerup', function () { self.go(n); });
          }
          blk.cells.push(cell); sc.items.push(cell); got += st;
        })((wi * PER) + i);
        blk.got.setText(got + ' / ' + PER * 3 + ' ★');
      });
      sc.layout = function () {
        var v = self.v; self.fullDim(sc); self.anchorBack(sc);
        sc.title.setPosition(v.w / 2, v.st + 40 + 75);
        var wide = v.w > v.h * 1.4, cols = wide ? 2 : 1, bw = PER * 140 + (PER - 1) * 14, bh = 56 + 18 + 140, gx = 70, gy = 48, rows = Math.ceil(4 / cols);
        var totW = cols * bw + (cols - 1) * gx, totH = rows * bh + (rows - 1) * gy, x0 = v.w / 2 - totW / 2, y0 = Math.max(v.st + 40 + 150 + 50, v.h / 2 - totH / 2 + 50);
        sc.blocks.forEach(function (b, i) {
          var cx = x0 + (i % cols) * (bw + gx), cy = y0 + Math.floor(i / cols) * (bh + gy);
          b.name.setPosition(cx, cy + 22); b.got.setPosition(cx + bw, cy + 22);
          b.cells.forEach(function (c, k) { c.setPosition(cx + 70 + k * 154, cy + 56 + 18 + 70); });
        });
      };
      this.push(sc, !!fromPause || !!(this.play() && this.play().state === 'play'));
    }

    /* ---- the end of a wave (stars, next) or of a try ---- */
    onResult(d) {
      if (this.stack.length) return;
      var self = this, sc = this.base(0.7), w = A.WORLDS[d.world], T = function (s, size, o) { var t = SR.txt(self, 0, 0, s, size, o); sc.items.push(t); return t; };
      sc.canClose = false;
      this.backArrow(sc, function () { Kit.play.exit(); }, 'ic-exit');
      var fail = d.kind === 'fail', last = d.last;
      sc.title = T(fail ? 'Out of hearts' : last ? 'You saved the stars!' : d.endOfWorld ? w.name + ' done!' : 'Wave clear!', 92, { stroke: '#08041a', thick: 12, wrap: 980 });
      sc.text = T(fail ? "Let's fly that wave again!" : last ? 'All 24 waves flown. MashaAllah, Star Ranger!' : 'Score ' + SR.num(d.score) + '  ·  ' + d.starsGot + ' stars caught', 48, { style: '700', wrap: 960 });
      sc.stars = [];
      if (!fail) for (var i = 0; i < 3; i++) { var st = SR.ui(this, 0, 0, i < d.stars ? 'gold' : 'gold0').setScale(1.5 / S); st.fullAlpha = 1; sc.items.push(st); sc.stars.push(st); }
      var list = [];
      if (fail) { list.push(this.choice(sc, 'ic-retry', 'Try Again', function () { self.go(d.level); }, true, 220)); list.push(this.choice(sc, 'ic-grid', 'Levels', function () { self.openLevels(false); }, false, 220)); }
      else {
        if (!last) list.push(this.choice(sc, 'ic-next', d.endOfWorld ? 'Next World' : 'Next Wave', function () { self.go(d.level + 1); }, true, 220));
        list.push(this.choice(sc, 'ic-retry', last ? 'Play Again' : 'Replay', function () { self.go(last ? 1 : d.level); }, last, 220));
        list.push(this.choice(sc, 'ic-grid', 'Levels', function () { self.openLevels(false); }, false, 220));
      }
      sc.row = list;
      sc.layout = function () {
        var v = self.v, cy = v.h / 2; self.fullDim(sc); self.anchorBack(sc);
        sc.title.setPosition(v.w / 2, cy - 360); sc.text.setPosition(v.w / 2, cy - 250);
        sc.stars.forEach(function (s, k) { s.setPosition(v.w / 2 + (k - 1) * 190, cy - 105 + (k === 1 ? -18 : 0)); });
        self.row(list, cy + (fail ? -60 : 110), 50);
      };
      this.push(sc, false);
      // the stars land one by one
      sc.stars.forEach(function (s, k) { var to = s.scale; s.setScale(0.01); self.tweens.add({ targets: s, scale: to, duration: 380, delay: 350 + k * 330, ease: 'Back.easeOut', onStart: function () { if (k < d.stars) Kit.snd.play('collect', { vol: 0.8 }); } }); });
    }

    // start wave n: close every screen, and launch it fresh (launch, not start: start would stop this scene)
    go(n) {
      n = Phaser.Math.Clamp(n, 1, COUNT);
      this.closeAll(); this.bossHide();
      this.scene.stop('Play'); this.scene.launch('Play', { n: n }); this.scene.bringToTop();
    }
  }

  window.SrHud = Hud;
})();
