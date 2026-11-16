/* Solar System: the interface (scene 'Hud', above the space scene, in the 1920 x 1080 design space of Kit.play.fit).
   Laid out by the game-ui-ux skill. While playing, the screen is space: one pause button in the top-left corner and the
   progress the player needs beside it (the level and the hearts left; while exploring, the word "Explore"). The question
   (the planets to find or choose, in words and pictures) rises from the bottom and leaves when answered; the fact card
   of an explored planet sits at the side (or the bottom on an upright phone). Everything else lives on a stack of
   screens: the pause screen (resume, restart, levels, explore or back to the game, sound, the way out), the level map and
   the sheets at the end of a level. No controls are needed beyond the world itself (drag to turn, pinch or wheel to zoom,
   tap a planet), so there is no stick or button; the first level says so in words for the device in use until each has
   been done once, and the pause screen repeats it.
   All Phaser: images painted once (art.js), Text objects, NineSlice plates that stretch to their words, tweens for every
   pop, fade and bounce, particles for the bursts, the engine's Shader for the little planets in the question and cards
   (planet.js), Kit.snd for sounds. The space scene is paused under the pause screen (scene.pause, asked for, not tested,
   because scene changes are queued to the next step); events from it drive everything here (see space.js header). */
(function () {
  'use strict';
  var SB = SolarBodies, BY = SB.byId, LV = SolarLevels, SV = SolarSave, progress = SV.progress, cap = SV.cap, TAU = Math.PI * 2;
  var GAP = 36, FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif', INK = '#fff6dc', GOLD = '#ffe39a', DIM = '#c9c3e6';
  var PIC_L = (function () { var v = [-0.62, -0.36, 0.7], l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; })();

  class Hud extends Phaser.Scene {
    constructor() { super({ key: 'Hud' }); }

    create() {
      var self = this;
      SolArt.paintUi(this);
      this.sp = this.scene.get('Space');
      this.touch = this.sys.game.device.input.touch; this.device = this.touch ? 'touch' : 'keys';
      this.stack = []; this.mode = 'level'; this.lvl = null; this.used = { turn: false, zoom: false }; this.paused = 0; this.askData = null;
      this.pad = { t: 230, b: 230 };

      // ---- always: the pause button and the progress ----
      this.bPause = this.button('ic-pause', function () { self.openPause(); });
      this.pill = { bg: this.add.nineslice(0, 0, 'ui-pill9', null, 300, 150, 70, 70, 70, 70), icon: this.add.image(0, 0, 'ic-star8'), txt: this.text('', 54, INK, '800'), hearts: [] };
      for (var i = 0; i < 5; i++) this.pill.hearts.push(this.add.image(0, 0, 'ic-heart'));
      this.pill.all = [this.pill.bg, this.pill.icon, this.pill.txt].concat(this.pill.hearts);

      // ---- the question, the planet card, the banner, the hints ----
      this.pr = { bg: this.add.nineslice(0, 0, 'ui-panel9', null, 600, 200, 80, 80, 80, 80).setVisible(false), orbs: [], ors: [], small: this.text('', 34, DIM, '800').setOrigin(0, 0.5), big: this.text('', 62, '#fff6dc', '900').setOrigin(0, 0.5), say: this.button('ic-snd', function () { self.sayAgain(); }, 0.7), shown: false, key: '' };
      this.pr.say.setVisible(false); this.pr.small.setVisible(false); this.pr.big.setVisible(false);
      this.cd = { bg: this.add.nineslice(0, 0, 'ui-panel9', null, 600, 400, 80, 80, 80, 80).setVisible(false), name: this.text('', 58, GOLD, '900').setOrigin(0, 0.5), fact: this.text('', 34, INK, '600').setOrigin(0, 0), strip: this.add.image(0, 0, 'px').setVisible(false),
        say: this.button('ic-snd', function () { self.sayAgain(); }, 0.7), close: this.button('ic-close', function () { self.sp.unselect(); }, 0.7), open: false, id: null, orb: null };
      this.cd.name.setVisible(false); this.cd.fact.setVisible(false); this.cd.say.setVisible(false); this.cd.close.setVisible(false);
      this.bn = [this.text('', 40, '#fff', '800').setAlpha(0), this.text('', 120, '#fffaf0', '900').setAlpha(0), this.text('', 40, '#ffe9b0', '800').setAlpha(0)];
      this.bn.forEach(function (t) { t.setStroke('rgba(5,5,20,.7)', 10).setDepth(300); });
      this.hints = {};
      this.fxStar = this.add.particles(0, 0, 'fx-star', { emitting: false, lifespan: { min: 700, max: 1100 }, speed: { min: 240, max: 800 }, scale: { start: 0.55, end: 0 }, alpha: { start: 1, end: 0 }, rotate: { min: 0, max: 360 }, tint: [0xffd36b, 0xffffff, 0x9fd8ff], blendMode: 'ADD' }).setDepth(400);
      this.fxSpark = this.add.particles(0, 0, 'fx-spark', { emitting: false, lifespan: 700, speed: { min: 160, max: 520 }, scale: { start: 1.1, end: 0 }, alpha: { start: 1, end: 0 }, tint: 0xfff3c4, blendMode: 'ADD' }).setDepth(400);
      this.fxWin = this.add.particles(0, 0, 'fx-star', { emitting: false, lifespan: { min: 900, max: 1500 }, speed: { min: 300, max: 1000 }, gravityY: 220, scale: { start: 0.7, end: 0 }, alpha: { start: 1, end: 0 }, rotate: { min: 0, max: 360 }, tint: [0xffd36b, 0xff9ec0, 0x9fe3ff, 0xffffff], blendMode: 'ADD' }).setDepth(400);
      this.streak = this.add.image(0, 0, 'streak').setOrigin(1, 0.5).setVisible(false).setDepth(5);

      // ---- input: the last device used decides the words; keys do what the buttons do ----
      this.input.on('pointerdown', function (p) { self.setDevice(p.wasTouch ? 'touch' : 'keys'); });
      this.input.on('pointerup', function () { self.sp.hudHit = false; });
      this.input.on('wheel', function () { self.setDevice('keys'); });
      var K = this.keys = this.input.keyboard.addKeys('R,ESC,M');
      this.input.keyboard.on('keydown', function (e) { if (!/^(Escape|m|M|r|R)$/.test(e.key)) self.setDevice('keys'); });
      K.M.on('down', function () { Kit.snd.setMuted(!Kit.snd.muted); if (Kit.snd.muted) SolarVoice.hush(); var s = self.top(); if (s && s.snd) s.snd(); });
      K.R.on('down', function () { if (!self.stack.length && self.sp.state !== 'clear' && self.sp.state !== 'fail') self.sp.startLevel(self.sp.level); });
      K.ESC.on('down', function () { var s = self.top(); if (s) { if (s.back) s.back(); } else self.openPause(); });

      var ev = this.game.events, on = function (k, f) { ev.on(k, f, self); self.events.once('shutdown', function () { ev.off(k, f, self); }); };
      on('ss-level', this.onLevel); on('ss-mode', this.onMode); on('ss-ask', this.onAsk); on('ss-good', this.onGood); on('ss-wrong', this.onWrong);
      on('ss-fail', this.onFail); on('ss-clear', this.onClear); on('ss-select', this.onSelect); on('ss-unselect', this.onUnselect);
      on('ss-burst', this.onBurst); on('ss-streak', this.onStreak); on('ss-used', this.onUsed); on('ss-explored', this.hideHint.bind(this, 'explore'));
      SolarVoice.onchange = function () { self.layout(self.v); };
      // leaving the page in the middle of a question pauses, as the old page did
      document.addEventListener('visibilitychange', function () { if (document.hidden && !SV.DEBUG && !self.stack.length && self.mode === 'level' && self.sp.state === 'ask') self.openPause(); });
      Kit.play.fit(this, function (v) { v.u = 1; self.layout(v); }, function () { return { w: window.innerWidth * 150 / 48, h: 1 }; });
      // (Solar System's own interface size: this scene's camera shows 150 units as 48 screen points on every screen, so the
      // interface keeps its design sizes, frames and all, and is the same size on a phone, a tablet and a computer)
      this.sp.hudReady && this.sp.hudReady();
      Kit.load && Kit.load.done();
    }

    /* ---------- small builders ---------- */
    text(s, size, color, weight, o) {
      var t = this.add.text(0, 0, s, Object.assign({ fontFamily: FONT, fontSize: size + 'px', fontStyle: weight || '700', color: color || INK, align: 'center' }, o || {})).setOrigin(0.5);
      t.setShadow(0, 3, 'rgba(0,0,0,.55)', 8); return t;
    }
    // a round button: a dark plate and its icon; it answers the touch at once
    button(icon, fn, k, plate) {
      var self = this, c = this.add.container(0, 0, [this.add.image(0, 0, plate || 'ui-plate'), this.add.image(0, 0, icon)]);
      c.icon = c.list[1]; c.k = k || 1; c.setSize(150, 150).setInteractive({ useHandCursor: true });
      c.on('pointerdown', function () { self.sp.hudHit = true; Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: c.k * 0.9, duration: 70, yoyo: true }); });
      c.on('pointerup', fn);
      return c;
    }
    // a wide button (a sheet's choices): label and icon on a glass or gold plate
    wide(label, icon, fn, primary, w, h) {
      var self = this, bg = this.add.nineslice(0, 0, primary ? 'ui-btn9p' : 'ui-btn9', null, w, h, 70, 70, 70, 70);
      var ic = icon ? this.add.image(0, 0, icon === 'ic-play' && primary ? 'ic-play-d' : icon).setScale(h / 150 * 0.8) : null;
      if (ic && primary && icon !== 'ic-play') ic.setTint(0x2a1606);
      var t = this.text(label, Math.round(h * 0.34), primary ? '#2a1606' : INK, '800'); t.setShadow(0, 0, 'rgba(0,0,0,0)', 0);
      var c = this.add.container(0, 0, ic ? [bg, ic, t] : [bg, t]); c.setSize(w, h).setInteractive({ useHandCursor: true });
      var gw = (ic ? h * 0.55 : 0) + t.width, x0 = -gw / 2;
      if (ic) { ic.x = x0 + h * 0.27; t.x = x0 + h * 0.55 + t.width / 2; }
      c.on('pointerdown', function () { self.sp.hudHit = true; Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: 0.95, duration: 70, yoyo: true }); });
      c.on('pointerup', fn);
      return c;
    }
    setDevice(d) { if (d === this.device) return; this.device = d; this.hintsPlace(); var s = this.top(); if (s && s.how) s.how(); }
    sayAgain() { SolarVoice.say(this.lastSaid || ''); }
    top() { return this.stack[this.stack.length - 1]; }

    /* ---------- layout ---------- */
    layout(v) {
      if (!v) return;
      this.v = v; var U = v.u; this.cu = v.z / Kit.play.dpr();
      this.F = function (size) { return Math.max(size * U, 15 / this.cu); };     // a size in design units, never under 15 screen points
      // the pause button, the progress beside it, one GAP apart, in the safe area's top-left corner
      this.bPause.setPosition(v.sl + GAP + 75 * U, v.st + GAP + 75 * U).setScale(U); this.bPause.k = U;
      this.pill.cy = this.bPause.y;
      this.padT = GAP * 2 + 150 * U; this.promptH = 200 * U;
      // (the room the interface takes, in screen pixels: the space scene has a zoom of its own)
      this.padB = this.promptH + GAP * 2 * U;
      this.pad.t = this.padT * this.cu; this.pad.b = this.padB * this.cu; this.pad.css = true;
      this.registry.set('pad', this.pad); this.game.events.emit('ss-pad');
      this.pillLayout(); this.promptLayout(); this.cardLayout(); this.hintsPlace(); this.bannerPlace();
      this.stack.forEach(function (s) { if (s.layout) s.layout(v); });
    }

    /* ---------- the progress pill ---------- */
    pillSet(mode) {
      var p = this.pill, lv = this.lvl;
      if (mode === 'explore') { p.icon.setTexture('ic-orbit').clearTint(); p.txt.setText('Explore'); }
      else if (lv) { p.icon.setTexture('ic-star8').setTint(Phaser.Display.Color.HexStringToColor(lv.world.color).color); p.txt.setText('Level ' + lv.level); }
      this.pillLayout();
    }
    pillLayout() {
      var v = this.v, p = this.pill, U = v && v.u; if (!v) return;
      var lvl = this.mode === 'level' && this.lvl, n = lvl ? this.lvl.def.hearts : 0, left = this.bPause.x + 75 * U + GAP, avail = v.sr - GAP - left;
      var iconW = 66 * U, txtW = p.txt.width, hw = 74 * U, pad = 38 * U, g = 22 * U;
      var need = pad + iconW + g + txtW + (n ? g + n * hw : 0) + pad, f = Math.min(1, avail / need), h = 150 * U;
      var w = need * f, cy = p.cy, x = left;
      p.bg.setPosition(left + w / 2, cy).setSize(w, h * Math.max(0.78, f)); p.bg.setScale(1);
      x += pad * f; p.icon.setPosition(x + iconW * f / 2, cy).setScale(0.66 * U * f); x += (iconW + g) * f;
      p.txt.setPosition(x + txtW * f / 2, cy).setScale(f); x += (txtW + g) * f;
      var self = this;
      p.hearts.forEach(function (hrt, i) { hrt.setVisible(i < n && self.chromeOn !== false).setPosition(x + hw * f * (i + 0.5), cy); hrt.setScale(0.66 * U * f); });
      this.pillHearts();
    }
    pillHearts() {
      var left = this.lvl ? this.lvl.hearts : 0;
      this.pill.hearts.forEach(function (h, i) { if (i < left) h.clearTint().setAlpha(1); else h.setTint(0x6b5a7a).setAlpha(0.45); });
    }

    /* ---------- events from the space scene ---------- */
    onLevel(d) {
      var self = this;
      this.lvl = { level: d.level, def: d.def, world: d.world, hearts: d.hearts };
      this.mode = 'level'; this.pillSet('level'); this.closeCard(true); this.promptHide();
      this.hideHint('tap'); this.hideHint('explore');
      this.bannerShow(d);
      this.askHintDone = false;
      // the first level teaches the controls in words, until each has been used
      this.hideHint('ctl');
      var run = this.ctlRun = (this.ctlRun || 0) + 1;
      if (d.level === 1 && !(this.used.turn && this.used.zoom)) this.time.delayedCall(d.banner * 1000 + 300, function () { if (run === self.ctlRun && self.mode === 'level' && !(self.used.turn && self.used.zoom)) self.showHint('ctl', self.ctlText()); });
    }
    onMode(m, first) {
      this.mode = m; this.pillSet(m); this.pillLayout();
      if (m === 'explore') {
        this.promptHide();
        if (first) this.showHint('explore', this.touch || this.device === 'touch' ? 'Tap a planet to visit it' : 'Click a planet to visit it'); else this.hideHint('explore');
        if (!(this.used.turn && this.used.zoom)) this.showHint('ctl', this.ctlText()); else this.hideHint('ctl');
      } else { this.closeCard(true); this.hideHint('explore'); }
    }
    ctlText() { return this.device === 'touch' ? 'Drag to turn  ·  Pinch to zoom' : 'Drag or arrow keys to turn  ·  Wheel or + / − to zoom'; }
    onUsed(k) { this.used[k] = true; if (this.used.turn && this.used.zoom) this.hideHint('ctl'); }
    onAsk(d) {
      if (!d) { this.promptHide(); return; }
      this.askData = d; var b = BY[d.id], small, big;
      if (d.t === 'find') { small = 'Find'; big = cap(b.short) + '!'; }
      else if (d.t === 'big') { small = 'Which is'; big = 'bigger?'; }
      else { small = 'Which is closest'; big = 'to the Sun?'; }
      this.lastSaid = d.t === 'find' ? 'Find ' + b.name + '!' : (d.t === 'big' ? 'Which is bigger? ' : 'Which is closest to the Sun? ') + d.ids.map(function (i) { return BY[i].name; }).join(', or ') + '?';
      this.promptShow(d.t === 'find' ? [d.id] : d.ids, small, big, false);
      if (d.first && !this.hints.tap) this.showHint('tap', this.device === 'touch' ? 'Tap the planet!' : 'Click the planet!');
    }
    onGood(d) {
      var b = BY[d.id]; this.hideHint('tap');
      this.promptShow([d.id], cap(b.short), d.line, true);
    }
    onWrong(d) {
      this.lvl.hearts = d.hearts; this.pillHearts();
      var h = this.pill.hearts[d.hearts]; if (h) this.tweens.add({ targets: h, scale: { from: h.scale * 1.6, to: h.scale }, duration: 350, ease: 'Back.easeOut' });
      this.tweens.add({ targets: this.pill.bg, angle: { from: -2, to: 0 }, duration: 300, ease: 'Elastic.easeOut' });
      if (this.pr.shown) { var P = this.pr.bg, x0 = this.pr.x0 || 0; this.tweens.add({ targets: this.pr.all(), x: '+=14', duration: 70, yoyo: true, repeat: 2 }); }
      this.floatText(d.text, d.x, d.y);
    }
    floatText(s, x, y) {
      var t = this.text(s, 52, '#ffe1ea', '800').setDepth(350).setPosition(x, y); t.setStroke('rgba(40,10,40,.7)', 8);
      this.tweens.add({ targets: t, y: y - 120, alpha: { from: 1, to: 0 }, duration: 1400, ease: 'Sine.easeOut', onComplete: function () { t.destroy(); } });
    }
    onBurst(x, y, kind) {
      var v = this.v;
      if (kind === 'star') { this.fxStar.explode(22, x, y); this.fxSpark.explode(14, x, y); }
      else if (kind === 'win') this.fxWin.explode(20, v.l + x * v.w, v.t + y * v.h);
    }
    onStreak(x, y, a) {
      var s = this.streak, v = this.v; if (!v) return;
      s.setPosition(x, y).setRotation(a).setScale(2.2, 1).setAlpha(0.85).setVisible(true);
      this.tweens.add({ targets: s, x: x + Math.cos(a) * 760, y: y + Math.sin(a) * 760, alpha: 0, duration: 900, ease: 'Sine.easeIn', onComplete: function () { s.setVisible(false); } });
    }

    /* ---------- the banner: world and level, large in the middle for a moment, then leaves ---------- */
    bannerShow(d) {
      var b = this.bn, self = this; this.tweens.killTweensOf(b);
      b[0].setText(d.world.name.toUpperCase()).setColor(d.world.color); b[1].setText('Level ' + d.level); b[2].setText(d.level === 1 ? 'Allah made the Sun, the Moon and the planets' : '');
      this.bannerPlace();
      var tot = d.banner * 1000;
      b.forEach(function (t) { t.setAlpha(0); });
      this.tweens.add({ targets: b, alpha: 1, duration: 400, onComplete: function () { self.tweens.add({ targets: b, alpha: 0, duration: 350, delay: tot - 750 }); } });
    }
    bannerPlace() {
      var v = this.v; if (!v) return; var U = v.u, top = v.st + this.padT, bot = v.sb - this.padB, cy = top + (bot - top) * 0.28, b = this.bn;
      var f = Math.min(1, (v.sr - v.sl - 2 * GAP) / Math.max(b[1].width, b[2].width + 40));
      b[0].setPosition(960, cy - 110 * U).setScale(U * f); b[1].setPosition(960, cy).setScale(U * f); b[2].setPosition(960, cy + 100 * U).setScale(f * U * 0.9);
      b[2].setScale(Math.min(U * 0.9, (v.sr - v.sl - 2 * GAP) / Math.max(1, b[2].width)));
    }

    /* ---------- the question ---------- */
    promptShow(ids, small, big, good) {
      var P = this.pr, self = this, key = ids.join(',');
      if (P.key !== key) { this.promptOrbs(ids); P.key = key; }
      P.small.setText(small); P.big.setText(big); P.good = good;
      P.bg.setTint(good ? 0x9ff0b8 : 0xffffff);
      P.shown = true; this.promptLayout();
      var all = P.all(); this.tweens.killTweensOf(all);
      all.forEach(function (o) { o.setVisible(true); });
      P.say.setVisible(!good && SolarVoice.has());
      this.tweens.add({ targets: all, alpha: { from: 0, to: 1 }, duration: 250 });
      this.tweens.add({ targets: all, y: '-=0', duration: 1 });
      var by = P.bg.y; P.bg.y = by + 40; this.tweens.add({ targets: P.bg, y: by, duration: 380, ease: 'Back.easeOut' });
      this.promptLayout(true);
    }
    promptHide() {
      this.hideHint('tap');
      var P = this.pr; if (!P.shown) return; P.shown = false; P.key = '';
      var all = P.all(); this.tweens.killTweensOf(all);
      this.tweens.add({ targets: all, alpha: 0, duration: 180, onComplete: function () { if (!P.shown) all.forEach(function (o) { o.setVisible(false); }); } });
    }
    promptOrbs(ids) {
      var P = this.pr, self = this;
      P.orbs.forEach(function (o) { SolarPlanet.destroy(o); }); P.ors.forEach(function (t) { t.destroy(); });
      P.orbs = ids.map(function (id) { return SolarPlanet.make(self, BY[id]); });
      P.ors = ids.slice(1).map(function () { return self.text('or', 36, DIM, '800'); });
      P.orbs.forEach(function (o) { o.parts.forEach(function (x) { x.setDepth(21); }); });
      P.all = function () { return [P.bg, P.small, P.big, P.say].concat(P.ors).concat(P.orbs.reduce(function (a, o) { return a.concat(o.parts); }, [])); };
    }
    promptLayout(again) {
      var v = this.v, P = this.pr; if (!v || !P.shown) return; var U = v.u, n = P.orbs.length, good = P.good, say = !good && SolarVoice.has();
      var d = (n > 2 ? 112 : 136) * U, H = this.promptH, availW = v.sr - v.sl - 2 * GAP;
      if (good) { P.big.setStyle({ fontSize: Math.round(this.F(36)) + 'px', fontStyle: '700', wordWrap: { width: Math.min(900 * U, availW - d - 160 * U) }, align: 'left' }); P.small.setFontSize(Math.round(this.F(40)) + 'px').setColor(GOLD); }
      else { P.big.setStyle({ fontSize: Math.round(62 * U) + 'px', fontStyle: '900', wordWrap: { width: null }, align: 'left' }); P.small.setFontSize(Math.round(this.F(34)) + 'px').setColor(DIM); }
      var tw = Math.max(P.small.width, P.big.width), orW = 60 * U;
      var need = 40 * U + n * d + (n - 1) * orW + 28 * U + tw + (say ? 28 * U + 112 * U : 0) + 40 * U, f = Math.min(1, availW / need);
      var cx = (v.sl + v.sr) / 2, cy = v.sb - GAP * U - H / 2, x = cx - need * f / 2, o = P.orbs, i, R = d / 2 * f, z = v.z;
      P.bg.setPosition(cx, cy).setSize(need * f, H * Math.max(0.8, Math.min(1, f + 0.15)));
      x += 40 * U * f;
      for (i = 0; i < n; i++) {
        var oy = cy; SolarPlanet.place(o[i], x + R, oy, R * (o[i].b.ring ? 0.42 : 1) * (o[i].b.kind === 'sun' ? 0.8 : 1), PIC_L, 0.55, 0.3, R * z, 0, 21);
        x += d * f; if (i < n - 1) { P.ors[i].setPosition(x + orW * f / 2, cy).setScale(f * U); x += orW * f; }
      }
      x += 28 * U * f;
      P.small.setPosition(x, cy - (good ? 34 : 38) * U * f).setScale(f); P.big.setPosition(x, cy + (good ? 12 : 22) * U * f).setScale(f);
      if (good) { P.big.setOrigin(0, 0.12).setPosition(x, cy - 6 * U * f); P.small.setPosition(x, cy - 52 * U * f); } else P.big.setOrigin(0, 0.5);
      if (say) P.say.setPosition(x + tw * f + 28 * U * f + 56 * U * f, cy).setScale(0.74 * U * f).k = 0.74 * U * f;
      this.promptTop = cy - H / 2;
      this.hintsPlace();
    }

    /* ---------- the planet card (exploring) ---------- */
    onSelect(id) {
      var C = this.cd, b = BY[id], self = this, v = this.v; if (!v) return;
      this.hideHint('explore');
      if (C.orb) SolarPlanet.destroy(C.orb);
      C.orb = SolarPlanet.make(this, b); C.orb.parts.forEach(function (x) { x.setDepth(21); });
      C.id = id; C.open = true;
      C.name.setText(cap(b.short)); C.fact.setText(b.fact); this.lastSaid = cap(b.name) + '. ' + b.fact;
      var key = 'strip-' + id;
      Kit.play.tex(this, key, 472, 68, function (c) { self.paintStrip(c, b); });
      C.strip.setTexture(key);
      C.all = function () { return [C.bg, C.name, C.fact, C.strip, C.close, C.say].concat(C.orb.parts); };
      var all = C.all(); this.tweens.killTweensOf(all); all.forEach(function (o) { o.setVisible(true); });
      C.say.setVisible(SolarVoice.has());
      this.cardLayout();
      this.tweens.add({ targets: all, alpha: { from: 0, to: 1 }, duration: 260 });
    }
    onUnselect() { this.closeCard(); }
    closeCard(quiet) {
      var C = this.cd; if (!C.open) return; C.open = false;
      var all = C.all ? C.all() : []; this.tweens.killTweensOf(all);
      if (quiet) { all.forEach(function (o) { o.setVisible(false); }); return; }
      this.tweens.add({ targets: all, alpha: 0, duration: 180, onComplete: function () { if (!C.open) all.forEach(function (o) { o.setVisible(false); }); } });
    }
    // the planet's place among the planets: the Sun, then the eight in order, this one ringed (painted once for each)
    paintStrip(c, b) {
      c.scale(2, 2); var hh = 34, target = b.parent ? BY[b.parent] : b;
      var gl = c.createRadialGradient(13, hh / 2, 0, 13, hh / 2, 16);
      gl.addColorStop(0, '#fff6d0'); gl.addColorStop(0.55, '#ffbe4d'); gl.addColorStop(0.75, 'rgba(255,150,50,.45)'); gl.addColorStop(1, 'rgba(255,140,40,0)');
      c.fillStyle = gl; c.beginPath(); c.arc(13, hh / 2, 16, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(31, hh / 2); c.lineTo(230, hh / 2); c.stroke();
      SB.planets.forEach(function (id, i) {
        var p = BY[id], x = 46 + i * 24.5, r = 2.6 + Math.sqrt(p.r) * 6;
        if (p === target) { c.strokeStyle = '#f6c453'; c.lineWidth = 2.5; c.beginPath(); c.arc(x, hh / 2, r + 4.5, 0, TAU); c.stroke(); }
        c.fillStyle = 'rgb(' + p.base.join(',') + ')'; c.globalAlpha = p === target ? 1 : 0.55; c.beginPath(); c.arc(x, hh / 2, r, 0, TAU); c.fill(); c.globalAlpha = 1;
        if (p === target && b.parent) { c.fillStyle = '#ddd'; c.beginPath(); c.arc(x + r + 5, hh / 2 - r - 2, 2.4, 0, TAU); c.fill(); }
      });
      if (b === BY.sun) { c.strokeStyle = '#f6c453'; c.lineWidth = 2.5; c.beginPath(); c.arc(13, hh / 2, 15, 0, TAU); c.stroke(); }
    }
    cardLayout() {
      var v = this.v, C = this.cd; if (!v) return; var U = v.u;
      if (!C.open || !C.orb) return;
      var side = (v.sr - v.sl) / (v.sb - v.st) > 1.25, cw = side ? 780 * U : Math.min(v.sr - v.sl - 2 * GAP, 1060), d = 160 * U, pad = 36 * U;
      var tx = d + pad * 2, wrapW = cw - tx - pad - 100 * U;
      C.fact.setStyle({ fontSize: Math.round(this.F(34)) + 'px', wordWrap: { width: wrapW }, align: 'left' }); C.name.setFontSize(Math.round(58 * U) + 'px');
      var nh = C.name.height, fh = C.fact.height, stripH = 68 * U, ch = Math.max(d, nh + fh + 8 * U) + stripH + pad * 3;
      var cx = side ? v.sr - GAP - cw / 2 : (v.sl + v.sr) / 2, cy = side ? (v.st + this.padT + v.sb - GAP) / 2 + 20 * U : v.sb - GAP - ch / 2;
      if (side) { var maxH = v.sb - GAP - (v.st + this.padT) + 10; if (ch > maxH) ch = maxH; cy = v.sb - GAP - ch / 2; }
      var left = cx - cw / 2, top = cy - ch / 2, R = d / 2;
      C.bg.setPosition(cx, cy).setSize(cw, ch);
      SolarPlanet.place(C.orb, left + pad + R, top + pad + R, R * (C.orb.b.ring ? 0.42 : 1) * (C.orb.b.kind === 'sun' ? 0.8 : 1), PIC_L, 0.55, 0.3, R * v.z, 0, 21);
      C.name.setPosition(left + tx, top + pad + nh / 2); C.fact.setPosition(left + tx, top + pad + nh + 8 * U);
      C.strip.setPosition(left + cw / 2 - 20 * U, top + ch - pad - stripH / 2 + 0).setScale(U * Math.min(1, (cw - 3 * pad - 130 * U) / 472));
      C.close.setPosition(left + cw - 70 * U, top + 70 * U).setScale(0.8 * U).k = 0.8 * U;
      C.say.setPosition(left + cw - 70 * U, top + ch - 100 * U).setScale(0.8 * U).k = 0.8 * U;
      this.registry.set('card', { x: left, w: cw });
      // where the planet should sit while the card is up: the middle of what the card leaves free
      if (side) this.game.events.emit('ss-focus', (v.sl + left - GAP) / 2, (v.st + this.padT + v.sb - GAP) / 2 + 30);
      else this.game.events.emit('ss-focus', (v.sl + v.sr) / 2, (v.st + this.padT + top - GAP) / 2);
    }

    /* ---------- hints: a pill of words that stays until what it teaches is done ---------- */
    showHint(k, text) {
      var h = this.hints[k], self = this;
      if (!h) {
        h = this.hints[k] = { bg: this.add.nineslice(0, 0, 'ui-pill9', null, 300, 110, 70, 70, 70, 70).setDepth(30), txt: this.text(text, 40, INK, '800').setDepth(31) };
        h.tw = this.tweens.add({ targets: [h.bg, h.txt], alpha: { from: 0, to: 1 }, duration: 300 });
      }
      h.txt.setText(text); h.gone = false; h.bg.setVisible(!this.stack.length); h.txt.setVisible(!this.stack.length); this.hintsPlace();
    }
    hideHint(k) {
      var h = this.hints[k]; if (!h || h.gone) return; h.gone = true; var self = this;
      this.tweens.add({ targets: [h.bg, h.txt], alpha: 0, duration: 500, onComplete: function () { h.bg.destroy(); h.txt.destroy(); if (self.hints[k] === h) delete self.hints[k]; } });
    }
    hintsPlace() {
      var v = this.v; if (!v) return; var U = v.u, self = this;
      var tap = this.hints.tap, ctl = this.hints.ctl, ex = this.hints.explore;
      if (ctl && this.device !== this.ctlDev) { this.ctlDev = this.device; ctl.txt.setText(this.ctlText()); }
      if (tap && this.device !== this.tapDev) { this.tapDev = this.device; tap.txt.setText(this.device === 'touch' ? 'Tap the planet!' : 'Click the planet!'); }
      var availW = v.sr - v.sl - 2 * GAP, base = this.pr.shown && this.promptTop ? this.promptTop : v.sb - this.padB + GAP * U;
      var y = base - GAP * U - 55 * U;
      var q = this.F(40) / 40, q2 = this.F(36) / 40;
      [tap, ex].forEach(function (h) { if (!h) return; var f = Math.min(1, availW / (h.txt.width * q + 80 * q)); h.txt.setPosition(960, y).setScale(q * f); h.bg.setPosition(960, y).setSize(h.txt.width * q * f + 80 * q * f, 100 * q * f); });
      if (ctl) { var f = Math.min(1, availW / (ctl.txt.width * q2 + 80 * q2)), yy = v.st + this.padT + 40 * q2; ctl.txt.setPosition(960, yy).setScale(q2 * f); ctl.bg.setPosition(960, yy).setSize(ctl.txt.width * q2 * f + 80 * q2 * f, 90 * q2 * f); }
    }

    /* ---------- frame: the little planets turn ---------- */
    update(time) {
      var P = this.pr, C = this.cd, spin = (time / 1000 / 14) % 1;
      if (P.shown) P.orbs.forEach(function (o) { o.sh.u.sp = [(0.55 + spin * (o.b.spin < 0 ? -1 : 1)) % 1, 0.3 + spin]; });
      if (C.open && C.orb) C.orb.sh.u.sp = [(0.55 + spin * (C.orb.b.spin < 0 ? -1 : 1)) % 1, 0.3 + spin];
    }

    /* ---------- screens: a stack over the game (game-ui-ux section 4) ---------- */
    block(d) {
      this.paused = Math.max(0, this.paused + d);
      if (d > 0 && this.paused === 1) { SolarVoice.hush(); if (this.sp.sys.settings.status >= Phaser.Scenes.RUNNING) this.scene.pause('Space'); }
      else if (!this.paused) this.scene.resume('Space');
    }
    // the corner chrome gives way to a screen (the screen has its own way out where the pause button was)
    chrome(on) {
      this.chromeOn = on;
      this.bPause.setVisible(on); this.pill.all.forEach(function (o) { o.setVisible(on); }); if (on) this.pillLayout();
      for (var k in this.hints) { this.hints[k].bg.setVisible(on); this.hints[k].txt.setVisible(on); }
      this.pr.all && this.pr.shown && this.pr.all().forEach(function (o) { o.setVisible(on); }); if (on && this.pr.shown) this.pr.say.setVisible(!this.pr.good && SolarVoice.has());
    }
    push(s, pauses) {
      var self = this, v = this.v; this.chrome(false); s.items = s.items || []; s.pauses = pauses;
      s.add = function (o) { s.items.push(o); o.setDepth(100 + self.stack.length * 10 + (o.depth || 0)); return o; };
      Kit.snd.play('page');
      var below = this.top(); if (below) below.items.forEach(function (o) { o.setVisible(false); });
      this.stack.push(s); if (pauses) this.block(1);
      s.dim = s.add(this.add.image(0, 0, 'px').setTint(0x04041a).setAlpha(0).setInteractive());
      s.dim.on('pointerdown', function () { self.sp.hudHit = true; });
      this.tweens.add({ targets: s.dim, alpha: s.dimA || 0.78, duration: 180 });
      return s;
    }
    pop(s, quiet) {
      var i = this.stack.indexOf(s); if (i < 0) return;
      this.stack.splice(i, 1); s.items.forEach(function (o) { o.destroy(); }); if (!this.stack.length) this.chrome(true);
      var now = this.top(); if (now) now.items.forEach(function (o) { o.setVisible(true); });
      if (s.pauses && !quiet) this.block(-1); else if (s.pauses) this.paused = Math.max(0, this.paused - 1);
    }
    popAll() { while (this.stack.length) { var s = this.stack[this.stack.length - 1]; this.pop(s, true); } this.paused = 0; this.scene.resume('Space'); }
    dimLayout(s, v) { s.dim.setPosition((v.l + v.r) / 2, (v.t + v.b) / 2).setDisplaySize(v.w + 4, v.h + 4); }
    // the way out of the game, in the corner where the pause button was
    exitButton(s, left) {
      var self = this, b = s.add(this.button('ic-exit', function () { Kit.play.exit(); }));
      s.exit = b; b.left = left !== false; return b;
    }
    exitPlace(s, v) { var U = v.u; s.exit.setScale(U).setPosition(s.exit.left ? v.sl + GAP + 75 * U : v.sr - GAP - 75 * U, v.st + GAP + 75 * U); s.exit.k = U; }

    /* ---- the pause screen ---- */
    openPause() {
      if (this.stack.length) return;
      var self = this, sp = this.sp, inEx = this.mode === 'explore', s = this.push({}, true), lv = this.lvl;
      s.title = s.add(this.text('Paused', 84, INK, '900'));
      s.sub = s.add(this.text(inEx ? 'Exploring the Solar System' : lv.world.name + ' · Level ' + lv.level, 42, inEx ? GOLD : lv.world.color, '800'));
      this.exitButton(s);
      var ch = [
        { icon: 'ic-play', label: inEx ? 'Keep Exploring' : 'Resume', fn: function () { self.pop(s); }, main: true },
        { icon: 'ic-retry', label: 'Restart', fn: function () { self.pop(s); sp.startLevel(sp.level); } },
        { icon: 'ic-grid', label: 'Levels', fn: function () { self.openLevels(s); } },
        { icon: inEx ? 'ic-next' : 'ic-orbit', label: inEx ? 'Back to the Game' : 'Explore', fn: function () { self.pop(s); if (inEx) sp.exitExplore(); else sp.enterExplore(); } },
        { icon: Kit.snd.muted ? 'ic-mute' : 'ic-snd', label: Kit.snd.muted ? 'Sound: Off' : 'Sound: On', fn: function () { Kit.snd.setMuted(!Kit.snd.muted); if (Kit.snd.muted) SolarVoice.hush(); s.snd(); }, snd: true }
      ];
      s.choices = ch.map(function (c) {
        var main = c.main, k = s.add(self.add.container(0, 0, [self.add.image(0, 0, main ? 'ui-big' : 'ui-plate').setScale(main ? 0.87 : 1.33), self.add.image(main ? 8 : 0, 0, main ? 'ic-play-d' : c.icon).setScale(1.25)]).setSize(200, 200).setInteractive({ useHandCursor: true }));
        k.icon = k.list[1]; k.lab = s.add(self.text(c.label, 38, INK, '800')); k.lab.setOrigin(0.5, 0);
        k.on('pointerdown', function () { self.sp.hudHit = true; Kit.snd.play('tap'); self.tweens.add({ targets: k, scale: k.sc * 0.92, duration: 70, yoyo: true }); }); k.on('pointerup', c.fn);
        k.c = c; return k;
      });
      s.how = function () { s.how_.setText(self.device === 'touch' ? 'Drag to turn  ·  Pinch to zoom  ·  Tap a planet' : 'Drag or arrow keys to turn  ·  Wheel or + / − to zoom  ·  Click a planet  ·  Esc pauses  ·  M sound  ·  R restart'); s.layout(self.v); };
      s.how_ = s.add(this.text('', 34, INK, '600')); s.how_.setAlpha(0.85);
      s.snd = function () { var m = Kit.snd.muted, k = s.choices[4]; k.icon.setTexture(m ? 'ic-mute' : 'ic-snd'); k.lab.setText(m ? 'Sound: Off' : 'Sound: On'); };
      s.back = function () { self.pop(s); };
      s.layout = function (v) {
        self.dimLayout(s, v); self.exitPlace(s, v);
        var U = v.u, n = s.choices.length, avail = v.sr - v.sl - 2 * GAP, w = 200 * Math.min(U, 1.15), gap = 56 * Math.min(U, 1.15);
        var cols = Math.min(n, Math.max(1, Math.floor((avail + gap) / (w + gap)))), rows = Math.ceil(n / cols), cy = (v.t + v.b) / 2;
        s.title.setScale(Math.min(U, (avail / s.title.width))).setPosition(960, cy - (rows === 1 ? 250 : 300 + (rows - 1) * 140) * Math.min(U, 1.2) * 0.9);
        s.sub.setScale(Math.min(self.F(42) / 42, avail / s.sub.width)).setPosition(960, s.title.y + 100 * Math.min(U, 1.2));
        var top = s.sub.y + 150 * Math.min(U, 1.2), rowH = w + 130 * Math.min(U, 1.2);
        s.choices.forEach(function (k, i) {
          var r = Math.floor(i / cols), inRow = r < rows - 1 ? cols : n - cols * (rows - 1), idx = i - r * cols, x0 = 960 - (inRow - 1) * (w + gap) / 2;
          k.sc = w / 200; k.setScale(k.sc).setPosition(x0 + idx * (w + gap), top + r * rowH + w / 2);
          k.lab.setWordWrapWidth((w + gap - 8) / (self.F(38) / 38)).setScale(self.F(38) / 38).setPosition(k.x, k.y + w / 2 + 14);
        });
        var hq = self.F(34) / 34; s.how_.setWordWrapWidth(avail / hq).setScale(hq).setPosition(960, Math.min(v.sb - 40 * hq - s.how_.height * hq / 2, top + rows * rowH + 20 + s.how_.height * hq / 2));
      };
      s.items.forEach(function (o) { if (o !== s.dim) { o.setAlpha(0); } }); this.tweens.add({ targets: s.items.filter(function (o) { return o !== s.dim; }), alpha: function (t) { return t === s.how_ ? 0.85 : 1; }, duration: 180 });
      s.how(); s.layout(this.v);
    }

    /* ---- the level map ---- */
    openLevels(under) {
      var self = this, sp = this.sp, s = this.push({ dimA: 0.97 }, false);
      var fromSheet = under && under.sheet;
      s.title = s.add(this.text('Solar System', 76, INK, '900'));
      s.backB = s.add(this.button('ic-back', function () { s.back(); }));
      this.exitButton(s, false);
      s.worlds = LV.worlds.map(function (w, wi) {
        var from = wi * 5 + 1, got = 0, o = { w: w, from: from, tiles: [] };
        for (var n = from; n < from + 5; n++) got += progress.stars(n);
        o.name = s.add(self.text(w.name, 52, w.color, '900')); o.name.setOrigin(0, 0.5);
        o.score = s.add(self.text(got + ' / 15', 36, DIM, '800')); o.score.setOrigin(1, 0.5);
        o.star = s.add(self.add.image(0, 0, 'ic-star').setScale(0.4));
        var col = Phaser.Display.Color.HexStringToColor(w.color).color;
        for (n = from; n < from + 5; n++) (function (n) {
          var open = progress.unlocked(n), st = progress.stars(n), kids = [self.add.image(0, 0, 'ui-tile').setTint(col).setAlpha(open ? 0.28 : 0.1), self.add.image(0, 0, 'ui-tile-o').setTint(col).setAlpha(open ? 1 : 0.35)];
          if (!open) kids.push(self.add.image(0, 0, 'ic-lock').setScale(0.9).setAlpha(0.6));
          else {
            kids.push(self.add.text(0, -14, String(n - from + 1), { fontFamily: FONT, fontSize: '62px', fontStyle: '900', color: INK }).setOrigin(0.5));
            for (var i = 0; i < 3; i++) kids.push(self.add.image((i - 1) * 36, 42, i < st ? 'ic-star' : 'ic-star0').setScale(0.3));
          }
          var cell = s.add(self.add.container(0, 0, kids).setSize(150, 150));
          if (n === sp.level && open) { var ring = self.add.image(0, 0, 'ui-tile-o').setTint(0xffffff).setScale(1.14); cell.add(ring); self.tweens.add({ targets: ring, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 }); }
          if (open) { cell.setInteractive({ useHandCursor: true }); cell.on('pointerdown', function () { self.sp.hudHit = true; Kit.snd.play('tap'); self.tweens.add({ targets: cell, scale: 0.92, duration: 70, yoyo: true }); }); cell.on('pointerup', function () { self.popAll(); sp.startLevel(n); }); }
          cell.n = n; o.tiles.push(cell);
        })(n);
        return o;
      });
      // closing the map over a finished level's sheet carries on to the next level, as the old page did
      s.back = function () { self.pop(s); if (fromSheet && (sp.state === 'clear' || sp.state === 'fail')) { self.pop(under, true); sp.startLevel(progress.current()); } };
      s.layout = function (v) {
        self.dimLayout(s, v); var U = v.u, avail = v.sr - v.sl - 2 * GAP;
        s.backB.setScale(U).setPosition(v.sl + GAP + 75 * U, v.st + GAP + 75 * U); s.backB.k = U; self.exitPlace(s, v);
        s.title.setScale(Math.min(U, (avail - 400 * U) / s.title.width)).setPosition(960, v.st + GAP + 75 * U);
        var tile = Math.min(230, Math.max(150 * U, (avail - 4 * 24) / 5)), g = 28 * Math.min(U, 1), rowW = 5 * tile + 4 * g, top = v.st + GAP * 2 + 150 * U + 30, free = v.sb - GAP - top, blockH = 3 * (tile + 80 * Math.min(U, 1.2)), gapY = Math.max(10, (free - blockH) / 3);
        s.worlds.forEach(function (o, wi) {
          var y0 = top + wi * (tile + 80 * Math.min(U, 1.2) + gapY * 0.9), x0 = 960 - rowW / 2, fs = Math.min(U, 1.15);
          o.name.setScale(fs).setPosition(x0, y0 + 30 * fs); o.score.setScale(fs).setPosition(x0 + rowW - 50 * fs, y0 + 30 * fs); o.star.setScale(0.4 * fs).setPosition(x0 + rowW - 20 * fs, y0 + 30 * fs);
          o.tiles.forEach(function (c, i) { c.setScale(tile / 150).setPosition(x0 + tile / 2 + i * (tile + g), y0 + 70 * fs + tile / 2); });
        });
      };
      s.layout(this.v);
      s.items.forEach(function (o) { if (o !== s.dim) o.setAlpha(0); }); this.tweens.add({ targets: s.items.filter(function (o) { return o !== s.dim; }), alpha: 1, duration: 180 });
      return s;
    }

    /* ---- the sheets at the end of a level ---- */
    onFail() {
      var self = this, sp = this.sp, s = this.sheet({ title: 'Out of hearts', text: "Let's look at the planets again!", buttons: [
        { label: 'Try Again', icon: 'ic-retry', primary: true, fn: function () { self.pop(s); sp.startLevel(sp.level); } },
        { label: 'Levels', icon: 'ic-grid', fn: function () { self.openLevels(s); } }] });
    }
    onClear(d) {
      var self = this, sp = this.sp, s, btns = [];
      if (!d.last) btns.push({ label: d.endOfWorld ? 'Next World' : 'Next Level', icon: 'ic-next', primary: true, fn: function () { self.pop(s); sp.startLevel(d.level + 1); } });
      btns.push({ label: d.last ? 'Play Again' : 'Replay', icon: 'ic-retry', primary: d.last, row: true, fn: function () { self.pop(s); sp.startLevel(d.last ? 1 : d.level); } });
      btns.push({ label: 'Levels', icon: 'ic-grid', row: true, fn: function () { self.openLevels(s); } });
      btns.push({ label: 'Explore the Planets', icon: 'ic-orbit', fn: function () { self.pop(s); sp.enterExplore(); } });
      s = this.sheet({ title: d.last ? 'You found them all!' : d.endOfWorld ? d.world + ' done!' : 'Well done!', text: d.last ? 'SubhanAllah! Allah made the Sun, the Moon and all the planets.' : 'You know your planets!', stars: d.stars, buttons: btns });
    }
    // a title, words, stars and a list of buttons; two columns on a wide screen, one on a tall one
    sheet(o) {
      var self = this, s = this.push({ sheet: true }, false);
      s.title = s.add(this.text(o.title, 78, INK, '900'));
      s.text = s.add(this.text(o.text, 40, INK, '600')); s.text.setAlpha(0.9);
      this.exitButton(s);
      if (o.stars != null) {
        s.stars = [0, 1, 2].map(function (i) {
          var st = s.add(self.add.image(0, 0, i < o.stars ? 'ic-star' : 'ic-star0').setScale(0).setAlpha(i < o.stars ? 1 : 0.8)); st.on_ = i < o.stars;
          self.time.delayedCall(350 + i * 330, function () { if (!st.scene) return; self.tweens.add({ targets: st, sc: 1, duration: 360, ease: 'Back.easeOut', onUpdate: function () { st.setScale(st.sc * (s.starK || 1)); } }); if (st.on_) Kit.snd.play('star'); });
          st.sc = 0; return st;
        });
      }
      s.btns = []; var row = null;
      o.buttons.forEach(function (b) {
        var c = s.add(self.wide(b.label, b.icon, function () { b.fn(); }, b.primary, 640, 150)); c.row = !!b.row; s.btns.push(c);
      });
      s.back = null;
      s.layout = function (v) {
        self.dimLayout(s, v); self.exitPlace(s, v);
        var U = v.u, avail = v.sr - v.sl - 2 * GAP, wide = avail / (v.sb - v.st) > 1.45, H = 150 * Math.min(U, 1.1), cx = 960, W = Math.min(640 * U, avail);
        var tw = Math.min(avail * (wide ? 0.52 : 1), 1000);
        s.title.setScale(Math.min(U, tw / s.title.width)); s.text.setStyle({ wordWrap: { width: tw / Math.min(U, 1.1) }, fontSize: '40px' }).setScale(Math.min(U, 1.1));
        // buttons: rows of one or two
        var bh = H, bw = Math.min(wide ? 640 : 760, (wide ? avail * 0.42 : avail)) * Math.min(U, 1.1), gapB = 22 * Math.min(U, 1.1), ys = 0, rows = [];
        s.btns.forEach(function (c, i) { if (c.row && rows.length && rows[rows.length - 1].row && rows[rows.length - 1].list.length < 2) rows[rows.length - 1].list.push(c); else rows.push({ row: c.row, list: [c] }); });
        var colH = rows.length * bh + (rows.length - 1) * gapB;
        var leftH = s.title.displayHeight + 24 + s.text.displayHeight + (s.stars ? 40 + 130 * Math.min(U, 1) : 0);
        var topY, lx, bx, by0;
        if (wide) { lx = cx - avail * 0.2; bx = cx + avail * 0.26; topY = (v.t + v.b) / 2 - leftH / 2; by0 = (v.t + v.b) / 2 - colH / 2; }
        else { lx = cx; bx = cx; var tot = leftH + 60 + colH; topY = (v.t + v.b) / 2 - tot / 2; by0 = topY + leftH + 60; }
        s.title.setPosition(lx, topY + s.title.displayHeight / 2);
        s.text.setPosition(lx, topY + s.title.displayHeight + 24 + s.text.displayHeight / 2);
        if (s.stars) { s.starK = 1.1 * Math.min(U, 1); var sy = topY + s.title.displayHeight + 24 + s.text.displayHeight + 40 + 65 * Math.min(U, 1); s.stars.forEach(function (st, i) { st.setPosition(lx + (i - 1) * 150 * Math.min(U, 1), sy).setScale(st.sc * s.starK); }); }
        rows.forEach(function (r, ri) {
          var y = by0 + ri * (bh + gapB) + bh / 2, n = r.list.length, w1 = n === 1 ? bw : (bw - gapB) / 2;
          r.list.forEach(function (c, i) { c.setPosition(bx + (i - (n - 1) / 2) * (w1 + gapB), y); c.setSize(w1, bh); c.list[0].setSize(w1, bh); if (c.input) c.input.hitArea.setSize(w1, bh); });
        });
      };
      s.layout(this.v);
      var vis = s.items.filter(function (x) { return x !== s.dim && !(s.stars && s.stars.indexOf(x) >= 0); }); vis.forEach(function (x) { x.setAlpha(0); });
      this.tweens.add({ targets: vis, alpha: function (t) { return t === s.text ? 0.9 : 1; }, duration: 220 });
      return s;
    }
  }

  window.SolarHud = Hud;
})();
