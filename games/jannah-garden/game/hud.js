/* Jannah Garden: hud.js, the interface (scene 'Hud', above the garden). Laid out by the game-ui-ux skill and Spider IK's
   hud.js, in "interface units": the 1920 x 1080 design space of Kit.play.fit, scaled by JG.ui so that a 150-unit button is
   about a thumb on any screen (a landscape phone is 1, an upright phone about 2: this scene sets its own camera zoom).

   While playing, the screen is the garden: ONE pause button in the top-left corner and, beside it, only the progress the
   player needs (the goal chips: a picture, dots that light, where, and a star; a tick button once a goal is met), and the
   tray of pictures along the bottom with the basket, which is the way to pick, plant and take away. Everything else is a
   stack of screens over the paused garden (game-ui-ux section 4): the pause screen (Resume, Levels, My Gardens, Clear Garden,
   Sound, and the way out: a back arrow where the pause button was), the level map, My Gardens, the level-done screen, and
   the questions (clear, empty). One screen at a time shows (the one below is rebuilt when it comes back).
   Controls are never hidden: on a touch screen the tray is always there; a first-time hint says what to do for the device
   last used (touch, mouse or keys); the pause screen repeats the controls for it.
   Input: tap a picture (it is chosen), tap the garden (it is planted); drag a picture up from the tray, or drag a planted
   thing; drop it in the basket to take it away. Keys: Esc pause, M sound, R clear the garden (asks first), and in the garden
   arrows or WASD move a cursor, Space or Enter plants, Q and E choose the picture, X takes away (garden.js).
   Everything here is Phaser: images painted once (art.js), Text objects, Zones, tweens for every fade and bounce. */
(function () {
  'use strict';
  var GD = window.GARDEN, A = window.GardenArt, JG = window.JG, UQ = A.UQ;
  var GAP = 36, INK = '#fffdf2', GOLD = '#ffd978', DARK = '#2a1606', clamp = Kit.clamp;
  var AREA_TINT = [0x9fe8f4, 0xffd78a, 0xffc2d8], AREA_CSS = ['#9fe8f4', '#ffd78a', '#ffc2d8'];

  // what the device voice says for a goal (old behaviour: tapping a goal reads it out; on-device voices only)
  var voice = null;
  function say(text) {
    try {
      var s = window.speechSynthesis; if (!s || !window.SpeechSynthesisUtterance || Kit.snd.muted || document.hidden) return;
      if (!voice) { var vs = s.getVoices() || []; voice = vs.filter(function (v) { return /^en/i.test(v.lang) && v.localService && !/albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox/i.test(v.name); })[0] || false; }
      s.cancel(); var u = new SpeechSynthesisUtterance(text); if (voice) u.voice = voice; u.lang = voice ? voice.lang : 'en-US'; u.rate = 0.95; s.speak(u);
    } catch (e) { /* no voice */ }
  }
  var praiseUrl = null;                                                          // the recorded "MashaAllah" (js/kit/praise-clips.js), as a file Phaser can play
  function praise() {
    var c = Kit.praiseClips; if (!c || !c.mashaallah) return;
    if (!praiseUrl) { var bin = atob(c.mashaallah), b = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); praiseUrl = URL.createObjectURL(new Blob([b], { type: 'audio/mpeg' })); }
    Kit.snd.voice(praiseUrl, { vol: 0.9 });
  }

  class Hud extends Phaser.Scene {
    constructor() { super('Hud'); }

    create() {
      var self = this, g = this.garden = this.scene.get('Garden');
      this.blocked = 0; this.hist = []; this.cur = null; this.chips = []; this.finish = null; this.items = {}; this.tp = null;
      this.scrollX = 0; this.minScroll = 0; this.hv = null; this.wasBlocked = false; this.hintOn = ''; this.moveShown = false; this.bAlpha = 1;
      var store = JG.store;
      this.state = { mode: 'level', level: 1, slot: 0, area: 0, areaName: '', title: '' };
      this.goalSt = null;

      // top-left: the one pause button
      this.bPause = this.button('ic-pause', function () { self.show(self.buildPause); });
      this.label = this.add.container(0, 0).setVisible(false);                                         // free play: the garden's name beside the pause button
      this.chipBox = this.add.container(0, 0);
      this.banner = this.add.container(0, 0).setAlpha(0);
      this.bannerA = this.txt(0, 0, '', 70, '800', INK); this.bannerB = this.txt(0, 0, '', 150, '900', '#ffffff');
      [this.bannerA, this.bannerB].forEach(function (t) { t.setShadow(0, 6, 'rgba(10,40,20,.55)', 18); self.banner.add(t); });

      // bottom: the tray of pictures and the basket
      this.bar = this.nine('ui-bar9', 400, JG.TRAY, 80);
      this.trayZone = this.add.zone(0, 0, 10, 10).setInteractive();
      this.trayBox = this.add.container(0, 0);
      GD.ITEMS.forEach(function (it, i) {
        var c = self.pic('ti-' + it.id); c.id = it.id;                                  // one picture per thing: its tile and the thing together
        self.trayBox.add(c); self.items[it.id] = c;
      });
      this.basket = this.add.container(0, 0, [this.pic('ui-plate'), this.pic('ui-basket0').setScale(0.82 / UQ), this.pic('ui-basket1').setScale(0.82 / UQ).setVisible(false)]);
      this.basket.setSize(150, 150).setInteractive();
      this.basket.on('pointerdown', function () { Kit.snd.play('tap'); self.bump(self.basket); });
      this.basket.on('pointerup', function () { if (!store.get('moved') && self.hintOn === '') self.hint('move'); });
      this.hintBox = this.add.container(0, 0).setAlpha(0).setVisible(false);
      this.hintPlate = this.nine('ui-chip9', 300, 120, 60); this.hintText = this.txt(0, 0, '', 44, '700', INK);
      this.hintBox.add([this.hintPlate, this.hintText]);

      // the tray: tap a picture to choose it, drag it up to plant it, drag sideways to scroll
      this.trayZone.on('pointerdown', function (p) {
        if (self.blocked || self.tp) return;
        var w = self.wp(p); self.tp = { id: p.id, x: w.x, y: w.y, sx: self.scrollX, mode: null, item: self.itemAt(w.x, w.y) };
      });
      var move = function (p) {
        var t = self.tp; if (!t || t.id !== p.id) return;
        var w = self.wp(p), dx = w.x - t.x, dy = w.y - t.y;
        if (!t.mode) {
          if (dy < -14 && Math.abs(dy) > Math.abs(dx) * 1.1 && t.item) { t.mode = 'new'; self.pick(t.item, false); g.beginNewDrag(t.item, p); self.trayBox.setAlpha(0.55); }
          else if (Math.abs(dx) > 14) t.mode = 'scroll';
        }
        if (t.mode === 'scroll') self.scrollTo(t.sx + dx);
        else if (t.mode === 'new') g.moveNewDrag(p);
      };
      var up = function (p) {
        var t = self.tp; if (!t || t.id !== p.id) return; self.tp = null;
        if (t.mode === 'new') { self.trayBox.setAlpha(1); g.endNewDrag(p, false); }
        else if (!t.mode && t.item) { Kit.snd.play('tap', { vol: 0.7 }); self.pick(t.item, true); }
      };
      this.input.on('pointermove', move); this.input.on('pointerup', up); this.input.on('pointerupoutside', up);
      this.input.on('wheel', function (p, over, dx, dy) { if (!self.blocked) self.scrollTo(self.scrollX - (Math.abs(dx) > Math.abs(dy) ? dx : dy)); });

      // keys
      var K = this.k = this.input.keyboard.addKeys('ESC,R,M');
      K.ESC.on('down', function () { if (self.cur) self.back(); else self.show(self.buildPause); });
      K.M.on('down', function () { Kit.snd.setMuted(!Kit.snd.muted); if (self.cur && self.cur.snd) self.cur.snd(); });
      K.R.on('down', function () { if (!self.cur && g.items.length) self.show(self.buildConfirm('clear')); });

      // what the garden tells us
      var ev = this.game.events, on = function (k, f) { ev.on(k, f, self); self.events.once('shutdown', function () { ev.off(k, f, self); }); };
      on('jg-start', this.onStart); on('jg-goals', this.onGoals); on('jg-won', this.onWon); on('jg-selected', this.onSelected);
      on('jg-basket', this.onBasket); on('jg-hint', this.onHint); on('jg-device', this.onDevice); on('jg-drag', function (s) { self.onBasket(s === 'start' ? 'open' : 'cold'); });

      Kit.play.fit(this, function (v) { self.layout(v); });
      if (g.area >= 0) { this.onStart(g.startInfo()); this.onGoals(g.goalInfo()); this.onSelected(g.selected, false); }
    }

    /* ---------- little builders ---------- */
    // a picture painted at UQ pixels per unit, shown in units
    pic(key) { return this.add.image(0, 0, 'ui', key).setScale(1 / UQ); }
    nine(key, w, h, inset) { var n = this.add.nineslice(0, 0, 'ui', key, w * UQ, h * UQ, inset * UQ, inset * UQ, inset * UQ, inset * UQ).setScale(1 / UQ); n.uw = w; n.uh = h; return n; }
    resizeNine(n, w, h) { n.setSize(w * UQ, h * UQ); n.uw = w; n.uh = h; }
    txt(x, y, s, size, weight, color, extra) {
      return this.add.text(x, y, s, Object.assign({ fontFamily: JG.FONT, fontSize: size + 'px', fontStyle: weight, color: color || INK }, extra || {})).setOrigin(0.5).setResolution(2);
    }
    // a round button: a dark plate and its icon; it answers the touch at once (a sound and a squash)
    button(icon, fn, plate, size) {
      var self = this, c = this.add.container(0, 0, [this.pic(plate || 'ui-plate'), this.pic(icon)]);
      c.icon = c.list[1]; c.setSize(size || 150, size || 150).setInteractive();
      if (size) { c.list[0].setDisplaySize(size, size); }
      c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: 0.9, duration: 70, yoyo: true }); });
      c.on('pointerup', fn);
      return c;
    }
    // a pill with a picture and a word (the screens' choices); primary = the golden one
    pill(label, icon, fn, primary, minW) {
      var self = this, t = this.txt(0, 0, label, 46, '800', primary ? DARK : INK), ic = icon ? this.pic(icon).setDisplaySize(80, 80) : null;
      if (ic && primary) ic.setTint(0x2a1606);
      var w = Math.max(minW || 0, 70 + (ic ? 90 : 0) + t.width), bg = this.nine(primary ? 'ui-chipdone9' : 'ui-chip9', w, 130, 60);
      t.setX(ic ? 45 : 0); if (ic) ic.setX(-w / 2 + 35 + 40);
      var c = this.add.container(0, 0, [bg, ic, t].filter(Boolean)).setSize(w, 130).setInteractive();
      c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: 0.93, duration: 70, yoyo: true }); });
      c.on('pointerup', fn); c.pw = w;
      return c;
    }
    bump(o) { this.tweens.killTweensOf(o); o.setScale(1); this.tweens.add({ targets: o, scale: 1.18, duration: 120, yoyo: true, ease: 'Back.easeOut' }); }
    wp(p) { return this.cameras.main.getWorldPoint(p.x, p.y); }

    /* ---------- layout ---------- */
    layout(v) {
      var m = JG.ui(v), U = this.U = m.U, cam = this.cameras.main;
      cam.setZoom(v.z * U).centerOn(960, 540);
      var f = function (a) { return 960 + (a - 960) / U; }, g = function (a) { return 540 + (a - 540) / U; };
      var hv = this.hv = { l: f(v.l), r: f(v.r), t: g(v.t), b: g(v.b), sl: f(v.sl), sr: f(v.sr), st: g(v.st), sb: g(v.sb) };
      hv.w = hv.r - hv.l; hv.h = hv.b - hv.t;
      this.bPause.setPosition(hv.sl + GAP + 75, hv.st + GAP + 75);
      // the tray, at the bottom, across the safe width
      var bl = hv.sl + GAP, br = hv.sr - GAP, bw = br - bl, by = hv.sb - JG.TRAYGAP - JG.TRAY / 2;
      this.resizeNine(this.bar, bw, JG.TRAY); this.bar.setPosition((bl + br) / 2, by);
      this.trayTop = by - JG.TRAY / 2;
      this.basket.setPosition(br - 16 - 75, by);
      this.itemsL = bl + 16; this.itemsR = br - 16 - 150 - 16;
      this.trayZone.setPosition((this.itemsL + this.itemsR) / 2, by).setSize(this.itemsR - this.itemsL, JG.TRAY); if (this.trayZone.input) this.trayZone.input.hitArea.setSize(this.itemsR - this.itemsL, JG.TRAY);
      this.trayY = by;
      var n = GD.ITEMS.length, total = n * 150 + (n - 1) * 16, room = this.itemsR - this.itemsL;
      this.minScroll = Math.min(0, room - total - 20);
      this.scrollX = clamp(this.scrollX, this.minScroll, 0);
      this.scrollTo(this.scrollX);
      this.hintBox.setPosition(960, this.trayTop - 90);
      this.topLayout();
      this.banner.setPosition(960, hv.t + hv.h * 0.3);
      this.bannerA.setPosition(0, -110); this.bannerB.setPosition(0, 20);
      if (this.cur) this.cur.layout();
    }
    scrollTo(x) {
      var self = this; this.scrollX = clamp(x, this.minScroll, 0);
      GD.ITEMS.forEach(function (it, i) {
        var c = self.items[it.id], px = self.itemsL + 75 + i * 166 + self.scrollX;
        // the pictures near either end shrink and fade (instead of being cut off)
        var ov = Math.max(self.itemsL - (px - 75), (px + 75) - self.itemsR, 0), k = clamp(1 - ov / 80, 0, 1);
        c.setPosition(px, self.trayY - (c.sel ? 12 : 0)).setScale((0.6 + 0.4 * k) / UQ).setAlpha(k).setVisible(k > 0.02);
        if (c.badge) c.badge.setPosition(px + 52 * (0.6 + 0.4 * k), c.y - 52 * (0.6 + 0.4 * k)).setScale((0.6 + 0.4 * k) * 52 / 96 / UQ * 0.96).setAlpha(k).setVisible(k > 0.02);
      });
    }
    itemAt(x, y) {
      if (Math.abs(y - this.trayY) > 95) return null;
      for (var i = 0; i < GD.ITEMS.length; i++) { var c = this.items[GD.ITEMS[i].id]; if (c.visible && Math.abs(x - c.x) < 78 * c.scaleX * UQ + 6) return GD.ITEMS[i].id; }
      return null;
    }
    // the pause button, then what shows beside it: the goal chips (levels) or the garden's name (free play)
    topLayout() {
      var hv = this.hv; if (!hv) return;
      var x0 = this.bPause.x + 75 + GAP, y = this.bPause.y;
      this.label.setPosition(x0, y); this.chipBox.setPosition(x0, y);
      var avail = hv.sr - GAP - x0, w = this.chipsW || 0, f = w > avail ? Math.max(0.55, avail / w) : 1;
      this.chipBox.setScale(f);
      if (this.label.w) { var lf = this.label.w > avail ? avail / this.label.w : 1; this.label.setScale(lf); }
    }

    /* ---------- the garden's news ---------- */
    onStart(s) {
      var self = this; this.state = s;
      // free play: just the garden's name (the area picture and the words)
      this.label.removeAll(true); this.label.w = 0;
      if (s.mode !== 'level') {
        var t = this.txt(0, 0, s.title, 52, '800', INK), ic = this.pic('zn-' + ['river', 'path', 'fountain'][s.area]).setDisplaySize(72, 72), w = 36 + 72 + 14 + t.width + 36;
        var bg = this.nine('ui-chip9', w, 120, 60); bg.setOrigin(0, 0.5); ic.setPosition(36 + 36, 0); t.setOrigin(0, 0.5).setPosition(36 + 72 + 14, 0);
        this.label.add([bg, ic, t]); this.label.w = w; this.label.setVisible(true);
      } else this.label.setVisible(false);
      this.chipBox.setVisible(s.mode === 'level');
      // the garden's name, large in the middle for a moment
      this.bannerA.setText(s.areaName.toUpperCase()); this.bannerB.setText(s.title);
      this.tweens.killTweensOf(this.banner);
      this.banner.setAlpha(0);
      this.tweens.chain({ targets: this.banner, tweens: [{ alpha: 1, duration: 400, ease: 'Sine.easeOut' }, { alpha: 0, duration: 700, delay: 1700 }] });
      this.hint(this.garden.hintOn ? 'first' : '', true);
      this.topLayout();
    }
    onGoals(st) {
      var self = this; this.goalSt = st;
      if (!st || !st.goals) return;
      if (this.chips.length !== st.goals.length || this.chipGoals !== st.goals) this.buildChips(st.goals);
      st.goals.forEach(function (gl, i) {
        var c = self.chips[i], cnt = st.count[i] | 0, done = !!st.done[i], was = c.done;
        c.pips.forEach(function (p, k) { p.setFrame(k < cnt ? 'ui-pipon' : 'ui-pip'); });
        c.bg.setFrame(done ? 'ui-chipdone9' : 'ui-chip9'); c.star.setFrame(done ? 'ic-star' : 'ic-star0');
        c.done = done;
        if (done && !was && !c.fresh) { self.tweens.add({ targets: c, scale: 1.18, duration: 160, yoyo: true, ease: 'Back.easeOut' }); var b = c.star.scaleX; self.tweens.add({ targets: c.star, scale: { from: b * 1.7, to: b }, duration: 380, ease: 'Back.easeOut' }); }
        c.fresh = false;
      });
      var showFin = st.n > 0 && st.n < st.goals.length && !st.levelDone;
      if (this.finish) { this.finish.setVisible(showFin); if (showFin && !this.finish.pulse) this.finish.pulse = this.tweens.add({ targets: this.finish, scale: 1.1, duration: 800, yoyo: true, repeat: 2, ease: 'Sine.easeInOut', onComplete: function () { self.finish.pulse = null; } }); if (!showFin && this.finish.pulse) { this.finish.pulse.stop(); this.finish.pulse = null; this.finish.setScale(1); } }
      // the tray marks the pictures a goal still needs with a small star
      GD.ITEMS.forEach(function (it) {
        var need = false; st.goals.forEach(function (gl, i) { if (gl.t === it.id && !st.done[i]) need = true; });
        var c = self.items[it.id];
        if (need && !c.badge) { c.badge = self.pic('ic-star'); self.trayBox.add(c.badge); }
        if (c.badge) c.badge.setVisible(need);
      });
      this.topLayout();
    }
    buildChips(goals) {
      var self = this, x = 0, H = 120;
      this.chips.forEach(function (c) { self.tweens.killTweensOf(c); }); this.chipBox.removeAll(true); this.chips = []; this.finish = null; this.chipGoals = goals;
      goals.forEach(function (gl, i) {
        var cols = Math.ceil(gl.n / 2), pipsW = cols * 30 - 6, w = 14 + 96 + 12 + pipsW + (gl.z ? 14 + 64 : 0) + 22;
        var bg = self.nine('ui-chip9', w, H, 60).setOrigin(0, 0.5), icon = self.pic('it-' + gl.t).setDisplaySize(100, 100).setPosition(14 + 50, 0);
        var pips = [];
        for (var k = 0; k < gl.n; k++) { var p = self.pic('ui-pip').setPosition(14 + 96 + 12 + Math.floor(k / 2) * 30 + 12, gl.n > 1 ? (k % 2 ? 16 : -16) : 0); pips.push(p); }
        var kids = [bg, icon].concat(pips);
        if (gl.z) kids.push(self.pic('zn-' + gl.z).setDisplaySize(64, 64).setPosition(14 + 96 + 12 + pipsW + 14 + 32, 0));
        var star = self.pic('ic-star0').setDisplaySize(50, 50).setPosition(w - 8, -46); kids.push(star);
        var c = self.add.container(x, 0, kids).setSize(w, H); c.setInteractive(new Phaser.Geom.Rectangle(0, -H / 2, w, H), Phaser.Geom.Rectangle.Contains);
        c.bg = bg; c.pips = pips; c.star = star; c.pw = w; c.fresh = true; c.done = false;
        // (a container's origin is its left edge here: its children are laid out from x = 0)
        c.on('pointerdown', function () { Kit.snd.play('tap'); });
        c.on('pointerup', function () { self.garden.select(gl.t, true); self.garden.showZoneStrong(); say(GD.sayGoal(gl)); self.bump(c); });
        self.chipBox.add(c); self.chips.push(c); x += w + 18;
      });
      var fin = this.button('ic-tick', function () { var st = self.goalSt; if (st && st.n && !st.levelDone) self.garden.finishLevel(st.n); }, 'ui-finish', 112);
      fin.icon.setVisible(false); fin.setPosition(x + 56 - 18 + 18, 0).setVisible(false);
      this.chipBox.add(fin); this.finish = fin; this.chipsW = x + 112 + 4;
      this.topLayout();
    }
    onSelected(id, loud) {
      var self = this;
      GD.ITEMS.forEach(function (it) {
        var c = self.items[it.id], sel = it.id === id;
        if (c.sel !== sel) { c.sel = sel; c.setFrame((sel ? 'tis-' : 'ti-') + it.id); c.y = self.trayY - (sel ? 12 : 0); }
      });
      var c = this.items[id];
      if (c) {
        var i = GD.ITEMS.map(function (q) { return q.id; }).indexOf(id), px = this.itemsL + 75 + i * 166 + this.scrollX;
        if (px - 75 < this.itemsL || px + 75 > this.itemsR) this.scrollTo(this.scrollX - (px - (this.itemsL + this.itemsR) / 2));
        else this.scrollTo(this.scrollX);
        if (loud) this.bump(c);
      }
    }
    onBasket(s) {
      var b = this.basket, open = s === 'open' || s === 'hot';
      b.list[1].setVisible(!open); b.list[2].setVisible(open);
      this.tweens.killTweensOf(b);
      if (s === 'hot') this.tweens.add({ targets: b, scale: 1.25, duration: 100 });
      else if (s === 'open') this.tweens.add({ targets: b, scale: 1.1, duration: 100 });
      else if (s === 'cold') { b.setScale(1); this.trayBox.setAlpha(1); }
      else if (s === 'bump') this.bump(b);
    }
    onDevice() { if (this.cur && this.cur.layout) this.cur.layout(); if (this.hintOn) this.hint(this.hintOn, true); }
    // first-time words, for the device in use
    hint(kind, quiet) {
      var self = this, d = JG.device, s = '';
      if (kind === 'first') s = d === 'keys' ? 'Q and E choose a picture  ·  arrows move  ·  Space plants' : d === 'mouse' ? 'Click a picture, then the garden' : 'Tap a picture, then the garden';
      else if (kind === 'move') { if (JG.store.get('moved')) return; s = d === 'keys' ? 'X takes away the thing next to you' : 'Drag to move  ·  Basket to remove'; }
      this.tweens.killTweensOf(this.hintBox);
      if (!s) { this.hintOn = ''; if (this.hintBox.visible) this.tweens.add({ targets: this.hintBox, alpha: 0, duration: 200, onComplete: function () { self.hintBox.setVisible(false); } }); return; }
      this.hintOn = kind; this.hintText.setText(s);
      this.resizeNine(this.hintPlate, this.hintText.width + 90, 120);
      this.hintBox.setVisible(true).setAlpha(0); this.tweens.add({ targets: this.hintBox, alpha: 1, duration: 300 });
      if (kind === 'move') { if (this.moveT) this.moveT.remove(); this.moveT = this.time.delayedCall(6000, function () { if (self.hintOn === 'move') self.hint(''); }); }
    }
    onHint(w) {
      if (w === 'planted') { if (this.hintOn === 'first') this.hint(''); }
      else if (w === 'move') { if (!this.hintOn) this.hint('move'); }
      else if (w === 'moved') { if (this.hintOn === 'move') this.hint(''); }
      else if (w === 'clear') this.hint('');
    }
    onWon(w) { this.winInfo = w; this.show(this.buildWin); }

    // pick a picture: choose it (and say so)
    pick(id, loud) { this.garden.select(id, loud); }

    // where is a finger: 2 = on the basket, 1 = on the tray, 0 = on the garden (game pixels in, as the garden gets them)
    over(px, py) {
      var w = this.wp({ x: px, y: py }), b = this.basket;
      if (w.x > b.x - 75 - 18 && w.x < b.x + 75 + 18 && w.y > b.y - 75 - 24 && w.y < b.y + 75 + 18) return 2;
      return w.y > this.trayTop + 6 ? 1 : 0;
    }
    basketPx() { var c = this.cameras.main, b = this.basket; return { x: (b.x - c.worldView.x) * c.zoom, y: (b.y - c.worldView.y) * c.zoom }; }

    /* ---------- the stack of screens ---------- */
    // soft: the garden keeps swaying under the screen (the level-done screen), otherwise it is paused
    block(d, soft) {
      this.blocked = Math.max(0, this.blocked + d);
      var g = this.garden, show = !this.blocked;
      // the playing interface steps aside while a screen is open (the screen is the only thing to touch)
      [this.bar, this.trayBox, this.basket, this.chipBox, this.hintBox, this.banner, this.bPause].forEach(function (o) { o.setVisible(show && (o !== this.hintBox || !!this.hintOn)); }, this);
      this.chipBox.setVisible(show && this.state.mode === 'level'); this.label.setVisible(show && this.state.mode !== 'level');
      if (this.blocked) { if (this.tp) { this.tp = null; this.trayBox.setAlpha(1); } g.hold(true); if (!soft) this.scene.pause('Garden'); if (JG.bed) Kit.snd.amb(JG.bed, { vol: 0.45 }); }
      else { g.hold(false); this.scene.resume('Garden'); if (JG.bed) Kit.snd.amb(JG.bed, { vol: 1 }); }
    }
    // open a screen (the one showing, if any, goes under it and is built again when this one is left)
    show(open, push) {
      if (this.cur) { var prev = this.cur.open; this.destroyScreen(); if (push) this.hist.push(prev); } else { this.block(1, open.soft); this.hist = []; }
      this.cur = open.call(this); this.cur.open = open; this.cur.layout();
      this.cur.root.setAlpha(0); this.tweens.add({ targets: this.cur.root, alpha: 1, duration: 160 });
    }
    back() {
      this.destroyScreen();
      var o = this.hist.pop();
      if (o) { this.cur = o.call(this); this.cur.open = o; this.cur.layout(); }
      else { this.cur = null; this.block(-1); }
    }
    closeAll() { if (!this.cur) return; this.destroyScreen(); this.hist = []; this.cur = null; this.block(-1); }
    destroyScreen() {
      var c = this.cur; if (!c) return;
      this.tweens.killTweensOf(c.root); c.root.destroy(true);
      if (c.free) c.free();
      this.cur = null;
    }
    // a screen: a dim that takes every touch, a card, a header row (back or exit, title, close)
    screen(o) {
      var self = this, s = { root: this.add.container(0, 0) }, put = function (x) { s.root.add(x); return x; };
      s.dim = put(this.add.image(0, 0, 'plants', 'px').setTint(0x04120d).setAlpha(0.84)); s.dim.setInteractive();
      s.card = put(this.nine('ui-card9', 800, 600, 64));
      s.title = put(this.txt(0, 0, o.title || '', 72, '800', INK));
      if (o.sub) s.sub = put(this.txt(0, 0, o.sub, 38, '700', o.subColor || GOLD));
      if (o.back) s.back = put(this.button('ic-back', o.back));
      if (o.exit) s.back = put(this.button('ic-exit', o.exit));
      if (o.close) s.closeB = put(this.button('ic-close', o.close));
      s.put = put; s.want = o.want || { w: 1500, h: 1000 };
      s.frame = function () {
        var hv = self.hv, w = Math.min(s.want.w, hv.w - 2 * (GAP + 10)), h = Math.min(s.want.h, hv.h - 2 * (GAP + 10));
        var cx = (hv.sl + hv.sr) / 2, cy = (hv.st + hv.sb) / 2, f = { w: w, h: h, cx: cx, cy: cy, l: cx - w / 2, r: cx + w / 2, t: cy - h / 2, b: cy + h / 2 };
        s.dim.setPosition((hv.l + hv.r) / 2, (hv.t + hv.b) / 2).setDisplaySize(hv.w + 8, hv.h + 8);
        self.resizeNine(s.card, w, h); s.card.setPosition(cx, cy);
        if (o.exitAtPause) { s.back && s.back.setPosition(hv.sl + GAP + 75, hv.st + GAP + 75); s.closeB && s.closeB.setPosition(hv.sr - GAP - 75, hv.st + GAP + 75); s.title.setPosition(cx, hv.st + GAP + 75); }
        else { s.back && s.back.setPosition(f.l + GAP + 75, f.t + GAP + 75); s.closeB && s.closeB.setPosition(f.r - GAP - 75, f.t + GAP + 75); s.title.setPosition(cx, f.t + GAP + 75); }
        var tw = f.w - 2 * (GAP + 150 + GAP); s.title.setScale(s.title.width > tw ? tw / s.title.width : 1);
        return f;
      };
      return s;
    }

    /* ---------- the pause screen ---------- */
    buildPause() {
      var self = this, g = this.garden, st = this.state, s = this.screen({ title: st.title, sub: st.areaName, subColor: AREA_CSS[st.area] || GOLD, exit: function () { Kit.play.exit(); }, exitAtPause: true });
      var choices = [], big = function (icon, label, fn, main, raw) {
        var plate = self.pic(main ? 'ui-big' : 'ui-big0'), ic = raw ? self.pic(icon).setScale(0.8 / UQ * 1.0) : self.pic(icon).setScale(1.3 / UQ * 1).setTint(main ? 0x2a1606 : 0xffffff);
        if (main) ic.setX(8);
        var c = s.put(self.add.container(0, 0, [plate, ic]).setSize(230, 230).setInteractive());
        c.label = s.put(self.txt(0, 0, label, 40, '700', INK)); c.icon = ic;
        c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: 0.92, duration: 70, yoyo: true }); }); c.on('pointerup', fn);
        choices.push(c); return c;
      };
      big('ic-play', 'Resume', function () { self.closeAll(); }, true);
      big('ic-grid', 'Levels', function () { self.show(self.buildLevels, true); });
      big('it-rose', 'My Gardens', function () { self.show(self.buildGardens, true); }, false, true);
      if (g.items.length) big('ui-basket0', 'Clear Garden', function () { self.show(self.buildConfirm('clear'), true); }, false, true);
      var snd = big(Kit.snd.muted ? 'ic-mute' : 'ic-snd', Kit.snd.muted ? 'Sound off' : 'Sound on', function () { Kit.snd.setMuted(!Kit.snd.muted); s.snd(); });
      s.snd = function () { var m = Kit.snd.muted; snd.icon.setFrame(m ? 'ic-mute' : 'ic-snd'); snd.label.setText(m ? 'Sound off' : 'Sound on'); };
      s.how = s.put(this.txt(0, 0, '', 34, '600', INK, { align: 'center' }).setAlpha(0.88));
      s.layout = function () {
        var f = s.frame(), hv = self.hv, n = choices.length, w = 230, gp = 60, availW = hv.w - 2 * (GAP + 60), cols = Math.max(1, Math.min(n, Math.floor((availW + gp) / (w + gp)))), rows = Math.ceil(n / cols);
        var rowH = 230 + 100, blockH = 150 + 50 + (rows - 1) * rowH + 230 + 60 + 70 + 90, y0 = Math.max(hv.st + GAP + 75 + 20, f.cy - blockH / 2);
        s.card.setVisible(false); s.title.setText(self.state.title); s.sub.setText(self.state.areaName);
        s.title.setPosition(f.cx, y0 + 40); s.sub.setPosition(f.cx, y0 + 120);
        var top = y0 + 150 + 50 + 115;
        choices.forEach(function (c, i) {
          var r = Math.floor(i / cols), cc = i % cols, inRow = Math.min(cols, n - r * cols), x = f.cx - ((inRow - 1) * (w + gp)) / 2 + cc * (w + gp), y = top + r * rowH;
          c.setPosition(x, y); c.label.setPosition(x, y + 115 + 36);
        });
        var how = JG.device === 'touch' ? 'Tap a picture, then tap the garden  ·  Drag a plant to move it  ·  Drop it in the basket to take it away'
          : JG.device === 'mouse' ? 'Click a picture, then click the garden  ·  Drag a plant to move it  ·  Drop it in the basket to take it away'
          : 'Arrows move  ·  Space plants  ·  Q and E choose  ·  X takes away  ·  Esc pause  ·  M sound  ·  R clear';
        s.how.setText(how).setWordWrapWidth(Math.min(hv.w - 2 * (GAP + 40), 1700)); s.how.setPosition(f.cx, Math.min(hv.sb - 60, top + (rows - 1) * rowH + 115 + 36 + 100));
      };
      return s;
    }

    /* ---------- the level map ---------- */
    buildLevels() {
      var self = this, g = this.garden, P = JG.progress, running = true;
      var s = this.screen({ title: 'Jannah Garden', back: function () { self.back(); }, close: function () { self.closeAll(); }, want: { w: 1560, h: 1000 } });
      var rows = [];
      GD.WORLDS.forEach(function (wd, wi) {
        var row = { label: s.put(self.txt(0, 0, wd.name, 40, '800', AREA_CSS[wi]).setOrigin(0, 0.5)), cells: [] };
        for (var n = wd.from; n <= wd.to; n++) (function (n) {
          var locked = !P.unlocked(n), stars = P.stars(n), cur = g.mode === 'level' && g.level === n;
          var bg = self.pic('ui-tile').setTint(locked ? 0x70807a : AREA_TINT[wi]).setAlpha(locked ? 0.55 : 1), kids = [bg];
          if (locked) kids.push(self.pic('ic-lock').setDisplaySize(64, 64).setPosition(0, 0));
          else {
            kids.push(self.txt(0, -18, String(n), 60, '900', DARK));
            for (var k = 0; k < 3; k++) kids.push(self.pic(k < stars ? 'ic-star' : 'ic-star0').setDisplaySize(34, 34).setPosition((k - 1) * 36, 40));
          }
          if (cur) { var ring = self.pic('ui-tilesel').setScale(1.12 / UQ); ring.setAlpha(0.9); kids.unshift(ring); self.tweens.add({ targets: ring, alpha: 0.35, duration: 700, yoyo: true, repeat: 2 }); }
          var cell = s.put(self.add.container(0, 0, kids).setSize(150, 150));
          if (!locked) {
            cell.setInteractive();
            cell.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: cell, scale: 0.92, duration: 70, yoyo: true }); });
            cell.on('pointerup', function () { self.closeAll(); g.startLevel(n, false); });
          }
          row.cells.push(cell);
        })(n);
        rows.push(row);
      });
      s.layout = function () {
        var f = s.frame(), wide = f.w >= 1300, cell = Math.min(150, (f.w - 2 * GAP - (wide ? 360 : 0) - 4 * 20) / 5), gp = 20;
        var y0 = f.t + GAP + 150 + 70, rowH = (f.b - GAP - y0) / 3;
        rows.forEach(function (r, i) {
          var cy = y0 + rowH * i + rowH / 2, sc = cell / 150;
          if (wide) { r.label.setPosition(f.l + GAP + 10, cy); var x0 = f.r - GAP - 5 * cell - 4 * gp + cell / 2; r.cells.forEach(function (c, k) { c.setScale(sc).setPosition(x0 + k * (cell + gp), cy); }); }
          else { r.label.setPosition(f.l + GAP + 10, cy - cell / 2 - 28); var x1 = f.cx - (5 * cell + 4 * gp) / 2 + cell / 2; r.cells.forEach(function (c, k) { c.setScale(sc).setPosition(x1 + k * (cell + gp), cy + 24); }); }
          r.label.setScale(Math.min(1, (f.w - 2 * GAP - (wide ? 4 * cell + 4 * gp + 20 : 0)) / Math.max(1, r.label.width)));
        });
      };
      return s;
    }

    /* ---------- My Gardens: four places to keep a garden ---------- */
    buildGardens() {
      var self = this, g = this.garden, keys = [];
      var s = this.screen({ title: 'My Gardens', back: function () { self.back(); }, close: function () { self.closeAll(); }, want: { w: 1700, h: 1000 } });
      var cards = [], zones = ['river', 'path', 'fountain'];
      for (var i = 0; i < JG.SLOTS; i++) (function (i) {
        var sv = g.slots[i], filled = (sv && sv.i && sv.i.length) || (g.mode === 'free' && g.slot === i), o = { i: i, kids: [] };
        o.bg = s.put(self.nine('ui-chip9', 400, 260, 60)); o.bg.setAlpha(0.85);
        if (filled) {
          var list = (g.mode === 'free' && g.slot === i) ? g.items : g.thumbOf(sv), a = sv ? sv.a : g.area;
          var key = 'thumb' + i + '-' + Date.now(); self.textures.addCanvas(key, g.thumb(a, list, 200, 120)); keys.push(key);
          o.thumb = s.put(self.add.image(0, 0, key).setInteractive());
          o.thumb.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: o.thumb, scale: o.thumb.scale * 0.96, duration: 70, yoyo: true }); });
          o.thumb.on('pointerup', function () { self.closeAll(); g.openFree(i); });
          o.del = s.put(self.button('ui-basket0', function () { self.show(self.buildConfirm('empty', i), true); }, 'ui-plate', 110)); o.del.icon.setScale(0.55 / UQ);
        } else {
          o.news = zones.map(function (z, k) {
            var b = s.put(self.add.container(0, 0, [self.pic('ui-tile'), self.pic('zn-' + z).setDisplaySize(100, 100)]).setSize(130, 130).setInteractive());
            b.list[0].setDisplaySize(130, 130);
            b.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: b, scale: 0.92, duration: 70, yoyo: true }); });
            b.on('pointerup', function () { self.closeAll(); g.slots[i] = { a: k, i: [] }; g.openFree(i, k); });
            return b;
          });
        }
        cards.push(o);
      })(i);
      s.foot = s.put(this.pill('Garden Levels', 'ic-grid', function () { self.closeAll(); if (g.mode !== 'level') g.startLevel(JG.progress.current(), false); }, true));
      s.free = function () { keys.forEach(function (k) { if (self.textures.exists(k)) self.textures.remove(k); }); };
      s.layout = function () {
        var f = s.frame(), cols = f.w >= 1500 ? 4 : 2, rows = 4 / cols, gp = 28;
        var areaT = f.t + GAP + 150 + 30, areaB = f.b - GAP - 130 - 30, cw = (f.w - 2 * GAP - (cols - 1) * gp) / cols, ch = (areaB - areaT - (rows - 1) * gp) / rows;
        var tw = Math.min(cw - 48, (ch - 48) * 5 / 3), th = tw * 3 / 5; ch = Math.min(ch, th + 48); cw = Math.min(cw, tw + 48);
        cards.forEach(function (o, i) {
          var r = Math.floor(i / cols), c = i % cols, x = f.cx - ((cols - 1) * (cw + gp)) / 2 + c * (cw + gp), y = (areaT + areaB) / 2 - ((rows - 1) * (ch + gp)) / 2 + r * (ch + gp);
          self.resizeNine(o.bg, cw, ch); o.bg.setPosition(x, y);
          if (o.thumb) { o.thumb.setPosition(x, y).setDisplaySize(cw - 48, (cw - 48) * 0.6); o.del.setPosition(x + cw / 2 - 50, y + ch / 2 - 50); o.del.setScale(Math.min(1, cw / 420)); }
          if (o.news) o.news.forEach(function (b, k) { var bs = Math.min(1, (cw - 30) / 460); b.setScale(bs).setPosition(x + (k - 1) * 150 * bs, y); });
        });
        s.foot.setPosition(f.cx, f.b - GAP - 65);
      };
      return s;
    }

    /* ---------- a garden finished: stars, and what next ---------- */
    buildWin() {
      var self = this, g = this.garden, w = this.winInfo, st = [];
      var s = this.screen({ title: w.stars === 3 ? 'Beautiful garden!' : 'Lovely garden!', sub: w.last ? 'Every garden is blooming. MashaAllah!' : GD.AREAS[w.area].name + ' · Level ' + w.level, subColor: GOLD, want: { w: 1400, h: 1010 } });
      for (var i = 0; i < 3; i++) { var im = s.put(this.pic(i < w.stars ? 'ic-star' : 'ic-star0').setDisplaySize(190, 190)); im.setAlpha(0); im.sc = im.scaleX; st.push(im); }
      var btns = [];
      if (!w.last) btns.push(s.put(this.pill(w.endOfArea ? 'Next Garden' : 'Next Level', 'ic-next', function () { self.closeAll(); g.startLevel(w.level + 1, true); }, true)));
      else btns.push(s.put(this.pill('My Gardens', 'it-rose', function () { self.show(self.buildGardens, true); }, true)));
      var plantMore = s.put(this.pill('Plant More', null, function () { self.closeAll(); })), lv = s.put(this.pill('Levels', 'ic-grid', function () { self.show(self.buildLevels, true); }));
      var save = w.canSave ? s.put(this.pill('Save to My Gardens', 'ic-save', function () { g.saveToGardens(); save.destroy(); save = null; s.layout(); })) : null;
      // the stars pop in one by one
      st.forEach(function (im, i) {
        if (i >= w.stars) { self.tweens.add({ targets: im, alpha: 1, duration: 300, delay: 500 + w.stars * 300 }); return; }
        self.time.delayedCall(450 + i * 350, function () { if (!im.active) return; im.setAlpha(1); Kit.snd.play('star', { rate: 1 + i * 0.16 }); self.tweens.add({ targets: im, scale: { from: im.sc * 0.2, to: im.sc }, duration: 420, ease: 'Back.easeOut' }); });
      });
      this.time.delayedCall(250, function () { praise(); });
      s.layout = function () {
        var f = s.frame(), hv = self.hv;
        s.title.setPosition(f.cx, f.t + GAP + 90); s.sub.setPosition(f.cx, s.title.y + 82); s.sub.setScale(Math.min(1, (f.w - 2 * GAP) / Math.max(1, s.sub.width)));
        var sy = f.t + GAP + 90 + 82 + 40 + 100;
        st.forEach(function (im, i) { im.setPosition(f.cx + (i - 1) * 230, sy); });
        var y = sy + 100 + 40 + 65, big = btns[0];
        big.setPosition(f.cx, y); y += 130 + 24;
        var rowW = plantMore.pw + 24 + lv.pw; plantMore.setPosition(f.cx - rowW / 2 + plantMore.pw / 2, y); lv.setPosition(f.cx + rowW / 2 - lv.pw / 2, y);
        if (save) save.setPosition(f.cx, y + 130 + 24);
        s.card.setPosition(f.cx, f.cy);
      };
      return s;
    }

    /* ---------- "Clear the garden?" and "Empty this garden?" ---------- */
    buildConfirm(kind, slot) {
      var hud = this;
      return function () {
        var self = hud, g = this.garden, key = 'confirm' + Date.now(), clear = kind === 'clear', sv = clear ? null : g.slots[slot];
        var s = this.screen({ title: clear ? 'Clear the garden?' : 'Empty this garden?', want: { w: 1200, h: 840 } });
        var a = clear ? g.area : (sv ? sv.a : 0), list = clear ? g.items : (sv ? g.thumbOf(sv) : []);
        this.textures.addCanvas(key, g.thumb(a, list, 220, 130));
        var th = s.put(this.add.image(0, 0, key));
        var yes = s.put(this.pill(clear ? 'Clear' : 'Empty', 'ui-basket0', function () {
          if (clear) { self.closeAll(); g.clearGarden(); } else { g.deleteSlot(slot); self.back(); }
        }, true)), no = s.put(this.pill('Keep', 'ic-close', function () { self.back(); }));
        s.free = function () { if (self.textures.exists(key)) self.textures.remove(key); };
        s.layout = function () {
          var f = s.frame(); s.title.setPosition(f.cx, f.t + GAP + 75);
          var tw = Math.min(520, f.w - 2 * GAP, (f.h - 2 * GAP - 150 - 130 - 80) * 220 / 130); th.setPosition(f.cx, f.t + GAP + 150 + 30 + tw * 130 / 220 / 2).setDisplaySize(tw, tw * 130 / 220);
          var y = th.y + tw * 130 / 220 / 2 + 30 + 65, rowW = yes.pw + 30 + no.pw; yes.setPosition(f.cx - rowW / 2 + yes.pw / 2, y); no.setPosition(f.cx + rowW / 2 - no.pw / 2, y);
        };
        return s;
      };
    }
  }
  Hud.prototype.buildWin.soft = true;

  window.JGHud = Hud;
})();
