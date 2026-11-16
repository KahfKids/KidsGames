/* Balloon Pop: hud.js, scene 'Hud' (above the game, its own camera: Kit.play.fit, upright it shows 760 units across so
   the buttons and words stay big on a phone held upright).
   Laid out by the game-ui-ux skill. While playing, the screen is the sky: one pause button in the top-left corner, the
   goals still to reach beside it as pictures with a count (a green balloon 3/8, a good-deed card 1/3, any balloon 5/12),
   and the hearts in the top-right corner on levels where hearts can be lost. Nothing else. The balloons ARE the
   controls (tap them); there are no on-screen buttons to hide. Everything else lives on screens pushed over the paused
   game: the pause screen (resume, restart, levels, sound, the way out), the level map, the end of a level, the big
   good-deed card. A level announces itself in the middle for a moment, then leaves. The always-on parts (pause button, goals,
   hearts, tips, the announcement) are objects of the Play scene, in one container that maps this scene's view onto the game's
   (the engine draws one scene's list in one pass: a second scene full of things was a second pass, measurably the dearer
   half of this game's idle frame); this scene keeps the logic, the screens, and everything that shows only for a moment. The first level teaches the tap
   (a ring pulses on a balloon, play.js, and a line says so in the words of the device in use) until a balloon has
   been popped once. All Phaser: images from the 'ui' atlas, NineSlice plates, Text, tweens for every pulse, particles.
   Events from the game (game.events): bp-start, bp-goal, bp-hearts, bp-deed, bp-clear, bp-fail, bp-popped, bp-stormhint;
   to the game: bp-show (a deed card is up: the world slows), bp-deed-done. */
(function () {
  'use strict';
  var D = window.BpData, A = window.BpArt, B = A.BALLOON, GAP = Bp.GAP, FONT = Bp.FONT, COUNT = D.count, PER = D.perWorld;
  var M = 40, CHIP_H = 118, UPRIGHT_HUD = 760;
  var INK = '#ffffff', STROKE = '#3c1950';

  class Hud extends Phaser.Scene {
    constructor() { super({ key: 'Hud' }); }

    create() {
      var self = this;
      this.dev = this.sys.game.device.input.touch ? 'touch' : 'pc';
      this.chips = []; this.hearts = []; this.queue = []; this.showing = null; this.scr = null; this.gamePaused = false;
      this.n = 1; this.def = null; this.world = 0; this.banner = null; this.tip = null; this.popped = !!Bp.store.get('popped', false);
      this.bPause = null; this.root = null;                 // made with each level, inside the Play scene (levelStart)
      Bp.fit(this, function (v) { self.layout(v); }, 'hud');

      this.stars = Bp.sleepy(this.add.particles(0, 0, 'ui', { frame: 'star5', emitting: false, lifespan: 700, speed: { min: 200, max: 460 }, gravityY: 500, scale: { start: 0.5, end: 0 }, rotate: { start: 0, end: 240 } }).setDepth(60));

      // keys: Esc pause, R restart, M sound (Phaser's keyboard; nothing else touches the keys)
      var K = this.keys = this.input.keyboard.addKeys('R,ESC,M,P');
      K.M.on('down', function () { Kit.snd.setMuted(!Kit.snd.muted); if (self.scr && self.scr.snd) self.scr.snd(); });
      K.R.on('down', function () { if (!self.scr && self.def) self.go(self.n); });
      var esc = function () { if (self.scr) { if (self.scr.back) self.scr.back(); } else if (self.def) self.openPause(); };
      K.ESC.on('down', esc); K.P.on('down', esc);
      this.input.on('pointerdown', function (p) { self.setDevice(p.wasTouch ? 'touch' : 'pc'); });
      this.input.keyboard.on('keydown', function () { self.setDevice('pc'); });

      var ev = this.game.events, on = function (k, f) { ev.on(k, f, self); self.events.once('shutdown', function () { ev.off(k, f, self); }); };
      on('bp-start', this.levelStart); on('bp-fit', function () { if (this.v) this.layout(this.v); }); on('bp-goal', this.goalGot); on('bp-hearts', this.heartsSet); on('bp-deed', this.deedGot);
      on('bp-clear', this.cleared); on('bp-fail', this.failed); on('bp-popped', this.hideTip); on('bp-stormhint', function () { this.say('Leave the grey clouds!', 4500, true); });
      on('hidden', function () { if (this.def && !this.scr) this.openPause(); });
      if (this.registry.get('bp-first')) { var f = this.registry.get('bp-first'); this.registry.remove('bp-first'); this.levelStart(f); }
    }

    /* ---------- parts ---------- */
    button(icon, fn, plate, add) {
      var self = this, A = add || this.add, c = A.container(0, 0, [A.image(0, 0, 'ui', plate || 'plate'), A.image(0, 0, 'ui', icon)]);
      c.icon = c.list[1]; c.setSize(150, 150).setInteractive();
      c.on('pointerdown', function (p) { p.bpUi = p.downTime; Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: 0.9, duration: 70, yoyo: true }); });
      c.on('pointerup', fn); return c;
    }
    text(s, x, y, size, weight, color, o, add) {
      return (add || this.add).text(x, y, s, Object.assign({ fontFamily: FONT, fontSize: size + 'px', fontStyle: String(weight || 800), color: color || INK }, o || {})).setOrigin(0.5);
    }
    // a balloon picture (a frame of this world's atlas) with its body centred on (0, 0), body about h units tall
    balloonImg(frame, h) {
      var f = A.F[frame], kb = A.KB, im = this.P.add.image(0, 0, 'bal-' + this.world, frame).setOrigin(f.ox, f.oy);
      return im.setScale(h / (B.h * kb));
    }
    // the picture of a goal: a colour balloon, three balloons for "any", the good-deed card
    goalIcon(g, h) {
      var c = this.P.add.container(0, 0);
      if (g.t === 'color') c.add(this.balloonImg('b' + g.c, h));
      else if (g.t === 'any') { c.add([this.balloonImg('b4', h * 0.78).setPosition(-h * 0.5, 4), this.balloonImg('b2', h * 0.78).setPosition(h * 0.5, 4), this.balloonImg('b0', h * 0.9).setPosition(0, -2)]); }
      else c.add(this.P.add.image(0, 0, 'ui', 'ic-deed').setScale(h * 1.05 / 96));
      c.iw = g.t === 'any' ? h * 1.7 : g.t === 'color' ? h * 0.8 : h * 1.05;
      return c;
    }
    say(s, ms, second) {            // a short line on a dark plate near the bottom, then gone
      var self = this, key = second ? 'tip2' : 'tip';
      if (this[key]) { this.tweens.killTweensOf(this[key]); this[key].destroy(); }
      var P = this.P, t = this.text(s, 0, 0, 52, 800, INK, null, P.add), w = t.width + 90, p = P.add.nineslice(0, 0, 'ui', 'hint9', w, 112, 40, 40, 40, 40);
      var c = this[key] = P.add.container(0, 0, [p, t]).setAlpha(0); c.second = !!second; this.root.add(c);
      this.tweens.add({ targets: c, alpha: 1, duration: 250 });
      if (ms) this.time.delayedCall(ms, function () { if (self[key] === c) self.fadeOut(c, function () { if (self[key] === c) self[key] = null; }); });
      this.layout(this.view); return c;
    }
    fadeOut(o, done) { this.tweens.add({ targets: o, alpha: 0, duration: 300, onComplete: function () { o.destroy(); if (done) done(); } }); }
    hideTip() { var self = this; this.popped = true; if (this.tip) { var t = this.tip; this.tip = null; this.fadeOut(t); } }

    /* ---------- layout: everything against the safe area ---------- */
    layout(v) {
      this.v = v;
      this.rootFit();
      if (this.bPause) this.bPause.setPosition(v.sl + M + 75, v.st + M + 75);
      this.chipsPlace(); this.heartsPlace();
      var y = v.sb - M - 56;
      if (this.tip) this.tip.setPosition((v.l + v.r) / 2, y);
      if (this.tip2) this.tip2.setPosition((v.l + v.r) / 2, y - (this.tip ? 130 : 0));
      if (this.banner) this.bannerPlace();
      if (this.scr) this.scr.layout();
      if (this.showing) this.showPlace();
    }
    // the container of the always-on parts: this scene's design space drawn in the Play scene (both are centred on the middle
    // of the 1920 x 1080 space; upright they show different widths, so the container is scaled by the ratio of the two zooms)
    rootFit() {
      var r = this.root, pv = this.P && this.P.view, v = this.view; if (!r || !r.scene || !pv || !v) return;
      var k = v.z / pv.z; this.rx = 960 * (1 - k); this.ry = 540 * (1 - k); r.setScale(k).setPosition(this.rx, this.ry);
    }
    // the world shakes (a storm, the star balloon: the Play camera's shake), the interface does not: while the shake runs, the
    // container is moved back by the camera's own offset just before each draw (the engine's shake effect, no second camera)
    unshake() {
      var r = this.root, e = this.P.cameras.main.shakeEffect;
      if (r && r.scene) r.setPosition(this.rx - e._offsetX, this.ry - e._offsetY);
    }
    fromPlay(x, y) {                                   // a point of the game's design space on this scene's screen
      var pv = this.scene.get('Play').view, v = this.view; if (!pv) return { x: x, y: y };
      return { x: v.l + (x - pv.l) * pv.z / v.z, y: v.t + (y - pv.t) * pv.z / v.z };
    }

    /* ---------- the goals and the hearts ---------- */
    levelStart(o) {
      var self = this; this.clearLevelUi();
      var P = this.P = this.scene.get('Play');
      this.root = P.add.container(0, 0).setDepth(100);
      var cam = P.cameras.main, ev = P.events, begin = function () { ev.on('prerender', self.unshake, self); }, end = function () { ev.off('prerender', self.unshake, self); self.rootFit(); };
      cam.on('camerashakestart', begin); cam.on('camerashakecomplete', end);
      ev.once('shutdown', function () { ev.off('prerender', self.unshake, self); cam.off('camerashakestart', begin); cam.off('camerashakecomplete', end); });
      this.bPause = this.button('ic-pause', function () { self.openPause(); }, null, P.add); this.root.add(this.bPause);
      this.n = o.n; this.def = o.def; this.world = o.world; this.goalsDef = o.goals;
      this.chips = o.goals.map(function (g, i) {
        var icon = self.goalIcon(g, 86), txt = P.add.bitmapText(0, 2, 'bpf-chip', '', 64).setOrigin(0.5), max = g.n + '/' + g.n;
        txt.setText(max); var tw = txt.width; txt.setText(g.n === 0 ? '' : '0/' + g.n);
        var w = 36 + icon.iw + 22 + tw + 36, plate = P.add.nineslice(0, 0, 'ui', 'pill9', w, CHIP_H, 56, 56, 56, 56);
        var fill = P.add.nineslice(0, 0, 'ui', 'fill9', 120, CHIP_H, 56, 56, 56, 56).setVisible(false);
        var tick = P.add.image(0, 0, 'ui', 'ic-tick').setScale(0.82).setVisible(false);
        var c = P.add.container(0, 0, [plate, fill, icon, txt, tick]); self.root.add(c);
        icon.x = -w / 2 + 36 + icon.iw / 2; txt.x = icon.x + icon.iw / 2 + 22 + tw / 2; tick.x = txt.x - tw / 2 + 36;
        return { g: g, i: i, n: g.n, shown: 0, w: w, c: c, plate: plate, fill: fill, txt: txt, tick: tick, tw: tw };
      });
      this.chips.forEach(function (c) { self.chipSet(c); });
      var h = o.def.hearts; this.heartMax = (o.def.storm || o.def.escape) ? h : 0; this.heartN = h;
      this.hearts = []; for (var i = 0; i < this.heartMax; i++) { var hh = P.add.image(0, 0, 'ui', 'ic-heart').setScale(0.9); this.root.add(hh); this.hearts.push(hh); }
      this.layout(this.view);
      this.bannerShow(o);
      if (!this.popped) this.say(this.dev === 'touch' ? 'Tap the balloons!' : 'Click the balloons!', 0);
    }
    clearLevelUi() {
      var self = this;
      this.chips.forEach(function (c) { self.tweens.killTweensOf(c.c); c.c.destroy(); }); this.chips = [];
      this.hearts.forEach(function (h) { self.tweens.killTweensOf(h); h.destroy(); }); this.hearts = [];
      if (this.banner) { this.tweens.killTweensOf(this.banner); this.banner.destroy(); this.banner = null; }
      if (this.tip) { this.tweens.killTweensOf(this.tip); this.tip.destroy(); this.tip = null; } if (this.tip2) { this.tweens.killTweensOf(this.tip2); this.tip2.destroy(); this.tip2 = null; }
      if (this.bPause) { this.tweens.killTweensOf(this.bPause); this.bPause.destroy(); this.bPause = null; }
      if (this.root) { this.root.destroy(); this.root = null; }
      this.queue = []; if (this.showing) this.endShow(true);
      this.closeScr(true);
    }
    chipSet(c) {
      var done = c.shown >= c.n, p = Math.min(1, c.shown / c.n);
      c.txt.setText(done ? '' : c.shown + '/' + c.n).setVisible(!done); c.tick.setVisible(done);
      c.plate.setFrame(done ? 'done9' : 'pill9');
      var fw = Math.max(112, c.w * p); c.fill.setVisible(!done && p > 0).setSize(fw, CHIP_H).setPosition(-c.w / 2 + fw / 2, 0);
    }
    chipBump(c) { this.tweens.killTweensOf(c.c); c.c.setScale(1); this.tweens.add({ targets: c.c, scale: 1.14, duration: 110, yoyo: true, ease: 'Sine.easeOut' }); }
    goalGot(i, got, t) { var c = this.chips[i]; if (!c || t === 'deed') return; c.shown = got; this.chipSet(c); this.chipBump(c); }
    // the goals sit in a row beside the pause button; if they do not fit, in a column under it
    chipsPlace() {
      var v = this.v, n = this.chips.length; if (!v || !n) return;
      var x0 = v.sl + M + 150 + GAP, y0 = v.st + M + 75, right = v.sr - M - (this.heartMax ? this.heartMax * 100 + GAP : 0), tot = -GAP;
      this.chips.forEach(function (c) { tot += c.w + GAP; });
      if (tot <= right - x0) { var x = x0; this.chips.forEach(function (c) { c.c.setPosition(x + c.w / 2, y0); x += c.w + GAP; }); }
      else { var y = y0 + 75 + GAP + CHIP_H / 2; this.chips.forEach(function (c) { c.c.setPosition(v.sl + M + c.w / 2, y); y += CHIP_H + GAP * 0.6; }); }
    }
    heartsPlace() {
      var v = this.v, n = this.hearts.length; if (!v || !n) return;
      this.hearts.forEach(function (h, i) { h.setPosition(v.sr - M - 45 - (n - 1 - i) * 100, v.st + M + 75); });
    }
    heartsSet(left, max, bump) {
      var self = this; this.heartN = left;
      this.hearts.forEach(function (h, i) { var on = i < left; h.setFrame(on ? 'ic-heart' : 'ic-heart0'); if (bump && i === left) { self.tweens.killTweensOf(h); h.setScale(1.4); self.tweens.add({ targets: h, scale: 0.9, duration: 320, ease: 'Back.easeOut' }); } });
    }

    /* ---------- the level announces itself, then leaves ---------- */
    bannerShow(o) {
      var self = this, W = D.WORLDS[o.world], v = this.view;
      if (this.banner) this.banner.destroy();
      var P = this.P, b = this.banner = P.add.container(0, 0).setAlpha(0); this.root.add(b);
      var stroke = { stroke: STROKE, strokeThickness: 16 };
      b.add(this.text(W.name.toUpperCase(), 0, -150, 52, 800, W.color, { stroke: STROKE, strokeThickness: 10 }, P.add));
      b.add(this.text('Level ' + o.n, 0, -50, 140, 900, INK, stroke, P.add));
      var items = o.goals.map(function (g) { return g; }); if (o.def.storm) items.push({ t: 'storm' });
      var ih = 150, gap = 30, ws = items.map(function (g) { return g.t === 'any' ? 380 : 300; }), total = ws.reduce(function (a, w) { return a + w; }, 0) + (items.length - 1) * gap, xc = -total / 2;
      items.forEach(function (g, i) {
        var iw = ws[i], x = xc + iw / 2; xc += iw + gap;
        var t = P.add.container(x, 120);
        t.add(P.add.nineslice(0, 0, 'ui', 'pill9', iw, ih, 56, 56, 56, 56));
        var icon, tx = self.text(g.n ? '×' + g.n : '', 0, 4, 84, 900, INK, null, P.add), tw = tx.width;
        if (g.t === 'storm') icon = P.add.container(0, 0, [self.balloonImg('storm', 90), P.add.image(0, 0, 'ui', 'nostorm').setScale(1.1)]);
        else icon = self.goalIcon(g, 96);
        var iwid = g.t === 'storm' ? 120 : icon.iw;
        icon.x = g.n ? -iw / 2 + 36 + iwid / 2 : 0; tx.x = iw / 2 - 36 - tw / 2;
        t.add([icon, tx]); b.add(t);
      });
      b.tw = total; this.bannerPlace();
      this.tweens.chain({ targets: b, tweens: [{ alpha: 1, duration: 300 }, { alpha: 1, duration: 2000 }, { alpha: 0, duration: 400, onComplete: function () { if (self.banner === b) { b.destroy(); self.banner = null; } } }] });
    }
    bannerPlace() {
      var v = this.v, b = this.banner; if (!b) return;
      var k = Math.min(1, (v.w - 2 * M) / (b.tw + 40), (v.h - 2 * M) / 560);
      b.setScale(k).setPosition((v.l + v.r) / 2, v.t + v.h * 0.42);
    }
    setDevice(d) {
      if (d === this.dev) return; this.dev = d;
      if (this.tip && !this.popped) { var t = this.tip; this.tip = null; t.destroy(); this.say(d === 'touch' ? 'Tap the balloons!' : 'Click the balloons!', 0); }
      if (this.scr && this.scr.refresh) this.scr.refresh();
    }

    /* ---------- the stack of screens: pause, levels, end of a level; the game waits under them ---------- */
    pauseGame(on) {
      var p = this.scene.get('Play');
      if (on && !this.gamePaused) { if (p.sys.isActive()) { this.scene.pause('Play'); this.gamePaused = true; } }
      else if (!on && this.gamePaused) { this.scene.resume('Play'); this.gamePaused = false; }
    }
    // open a screen: its items are put into one container (anchored to the screen's middle), the game is paused under it
    openScr(kind, o) {
      this.closeScr(true);
      var self = this, s = this.scr = { kind: kind, items: [], tw: [], layout: function () {} };
      if (!o || o.pause !== false) this.pauseGame(true);
      s.dim = this.add.rectangle(0, 0, 100, 100, 0x120a2a, o && o.dim || 0.72).setInteractive().setDepth(70);
      if (this.bPause) this.bPause.setVisible(false);
      s.root = this.add.container(960, 540).setDepth(71);
      s.dim.on('pointerdown', function (p) { p.bpUi = p.downTime; });
      s.add = function (x) { s.root.add(x); return x; };
      return s;
    }
    closeScr(keep) {
      var s = this.scr; if (!s) return; this.scr = null;
      this.tweens.killTweensOf([s.root, s.dim]); s.tw.forEach(function (t) { t.remove(); });
      s.dim.destroy(); s.root.destroy(true);
      if (s.exit) s.exit.destroy();
      if (!keep) { this.pauseGame(false); if (this.bPause) this.bPause.setVisible(true); }
    }
    dimFit(s) { var v = this.v; s.dim.setPosition((v.l + v.r) / 2, (v.t + v.b) / 2).setSize(v.w + 4, v.h + 4); s.dim.input.hitArea.setSize(v.w + 4, v.h + 4); }
    // a labelled plate button for a screen
    plate(s, icon, label, fn, main) {
      var self = this, c = this.add.container(0, 0, [this.add.image(0, 0, 'ui', main ? 'big' : 'plate').setScale(main ? 0.82 : 1.53), this.add.image(main ? 10 : 0, 0, 'ui', icon).setScale(1.4).setTint(main ? 0x2a1450 : 0xffffff)]).setSize(230, 230).setInteractive();
      c.label = this.text(label, 0, 0, 44, 800, INK); c.icon = c.list[1];
      c.on('pointerdown', function (p) { p.bpUi = p.downTime; Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: 0.92, duration: 70, yoyo: true }); }); c.on('pointerup', fn);
      s.add(c); s.add(c.label); return c;
    }
    // a wide pill with words, for the end-of-level screens
    pill(s, label, icon, fn, main) {
      var self = this, w = 560, c = this.add.container(0, 0, [this.add.nineslice(0, 0, 'ui', main ? 'btn9y' : 'btn9', w, 140, 56, 56, 56, 56)]).setSize(w, 140).setInteractive();
      var t = this.text(label, 40, 3, 56, 900, main ? '#2a1450' : INK), ic = this.add.image(0, 0, 'ui', icon).setScale(0.9).setTint(main ? 0x2a1450 : 0xffffff);
      var tw = t.width, x0 = -(tw + 96 + 24) / 2; ic.x = x0 + 48; t.x = x0 + 96 + 24 + tw / 2; c.add([ic, t]);
      c.on('pointerdown', function (p) { p.bpUi = p.downTime; Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: 0.94, duration: 70, yoyo: true }); }); c.on('pointerup', fn);
      s.add(c); return c;
    }
    exitBtn(s) {
      var b = s.exit = this.button('ic-exit', function () { Kit.play.exit(); }); b.setDepth(72);
      var v = this.v; b.setPosition(v.sl + M + 75, v.st + M + 75); return b;
    }

    /* ---- the pause screen ---- */
    openPause() {
      if (this.scr || !this.def) return;
      var self = this, s = this.openScr('pause'), W = D.WORLDS[this.world];
      s.title = this.text('Paused', 0, 0, 96, 900, INK, { stroke: STROKE, strokeThickness: 12 }); s.add(s.title);
      s.sub = this.text(W.name + ' · Level ' + this.n, 0, 0, 50, 800, W.color, { stroke: STROKE, strokeThickness: 8 }); s.add(s.sub);
      s.row = [
        this.plate(s, 'ic-play', 'Resume', function () { self.closeScr(); }, true),
        this.plate(s, 'ic-retry', 'Restart', function () { self.go(self.n); }),
        this.plate(s, 'ic-grid', 'Levels', function () { self.openLevels(true); }),
        this.plate(s, Kit.snd.muted ? 'ic-mute' : 'ic-snd', Kit.snd.muted ? 'Sound: Off' : 'Sound: On', function () { Kit.snd.setMuted(!Kit.snd.muted); s.snd(); })
      ];
      s.how = this.text('', 0, 0, 40, 700, INK, { align: 'center', wordWrap: { width: 900 } }); s.add(s.how); s.how.setAlpha(0.9);
      s.snd = function () { var m = Kit.snd.muted, b = s.row[3]; b.icon.setTexture('ui', m ? 'ic-mute' : 'ic-snd'); b.label.setText(m ? 'Sound: Off' : 'Sound: On'); };
      s.back = function () { self.closeScr(); };
      s.refresh = function () { s.how.setText(self.dev === 'touch' ? 'Tap the balloons.  Leave the grey clouds.' : 'Click the balloons.  Leave the grey clouds.\nEsc pauses  ·  R restarts  ·  M sound'); };
      s.layout = function () {
        var v = self.v, cx = 0, up = v.w < 1000;
        self.dimFit(s); s.root.setPosition((v.l + v.r) / 2, (v.t + v.b) / 2);
        s.exit.setPosition(v.sl + M + 75, v.st + M + 75);
        s.title.setPosition(0, up ? -470 : -300); s.sub.setPosition(0, up ? -380 : -210);
        var gap = up ? 60 : 90, w = 230, n = 4;
        s.row.forEach(function (c, i) {
          var x, y;
          if (up) { x = (i % 2 - 0.5) * (w + gap); y = -170 + Math.floor(i / 2) * (w + 120); }
          else { x = (i - (n - 1) / 2) * (w + gap); y = 10; }
          c.setPosition(x, y); c.label.setPosition(x, y + w / 2 + 26);
        });
        s.how.setPosition(0, up ? 470 : Math.min((v.b - v.t) / 2 - 110, 350)); s.how.setWordWrapWidth(Math.min(900, v.w - 2 * M));
        s.refresh();
      };
      this.exitBtn(s);
      s.layout();
      s.root.setAlpha(0); this.tweens.add({ targets: s.root, alpha: 1, duration: 160 });
    }

    /* ---- the level map: every level by world, with its stars ---- */
    openLevels(fromPause) {
      var self = this, s = this.openScr('levels'), P = Bp.progress, up = false;
      s.card = this.add.nineslice(0, 0, 'ui', 'card9', 1500, 1040, 60, 60, 60, 60); s.add(s.card);
      s.title = this.text('Balloon Pop', 0, 0, 84, 900, INK); s.add(s.title);
      var running = !!this.def && this.scene.get('Play').sys.settings.status !== Phaser.Scenes.SHUTDOWN;
      s.close = this.plate(s, 'ic-close', '', function () { s.back(); }); s.close.label.setVisible(false); s.close.setScale(0.65);
      s.close.list[0].setScale(1.53); s.close.setSize(150, 150); s.close.input.hitArea.setSize(230, 230);
      s.cells = []; s.heads = [];
      D.WORLDS.forEach(function (W, wi) {
        s.heads.push(s.add(self.text(W.name, 0, 0, 44, 800, W.color)));
        for (var k = 0; k < PER; k++) {
          var n = wi * PER + k + 1, open = P.unlocked(n), st = P.stars(n), cur = n === P.current();
          var kids = [self.add.nineslice(0, 0, 'ui', 'cell9', 150, 156, 30, 30, 30, 30).setTint(open ? 0xffffff : 0x8a82a8)];
          if (open) { kids.push(self.text(String(n), 0, -22, 62, 900, INK)); for (var q = 0; q < 3; q++) kids.push(self.add.image((q - 1) * 38, 40, 'ui', q < st ? 'ic-star' : 'ic-star0').setScale(0.38)); }
          else kids.push(self.add.image(0, 0, 'ui', 'ic-lock').setScale(0.9));
          var cell = self.add.container(0, 0, kids).setSize(150, 156); cell.n = n; cell.open = open;
          if (cur) { var ring = self.add.nineslice(0, 0, 'ui', 'cell9', 170, 176, 30, 30, 30, 30).setTint(0xffd23f); cell.addAt(ring, 0); s.tw.push(self.tweens.add({ targets: ring, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 })); }
          if (open) { cell.setInteractive(); cell.on('pointerdown', function (p) { p.bpUi = p.downTime; Kit.snd.play('tap'); }); (function (nn) { cell.on('pointerup', function () { self.go(nn); }); })(n); }
          s.add(cell); s.cells.push(cell);
        }
      });
      s.back = function () { if (fromPause && running) { self.closeScr(true); self.openPause(); } else if (running && self.def && !self.sheetOpen) self.closeScr(); else if (self.lastSheet) { self.closeScr(); self.lastSheet(); } else self.closeScr(); };
      s.layout = function () {
        var v = self.v, upr = v.w < 1100, cols = upr ? 4 : 8, rows = PER / cols, cw = 150, gx = upr ? 20 : 26, ch = 156, gy = 22, headH = upr ? 190 : 200, rowBlock = 62 + rows * ch + (rows - 1) * gy + 40;
        var W = cols * cw + (cols - 1) * gx + 120, H = headH + 3 * rowBlock + 30;
        self.dimFit(s);
        // upright the card sits under the exit button; it shrinks to fit the width and the room left
        var top = upr ? v.st + M + 150 + GAP : v.t + 20, k = Math.min(1, (v.w - 2 * M) / W, (v.sb - M - top) / H);
        s.root.setScale(k).setPosition((v.l + v.r) / 2, upr ? top + H * k / 2 : (v.t + v.b) / 2);
        s.card.setSize(W, H); s.title.setPosition(0, -H / 2 + 100).setFontSize(upr ? 70 : 84);
        s.close.setPosition(W / 2 - (upr ? 78 : 100), -H / 2 + (upr ? 90 : 100));
        s.exit.setPosition(v.sl + M + 75, v.st + M + 75);
        D.WORLDS.forEach(function (_, wi) {
          var y0 = -H / 2 + headH + wi * rowBlock;
          s.heads[wi].setPosition(0, y0 + 20);
          for (var k = 0; k < PER; k++) { var c = s.cells[wi * PER + k], r = Math.floor(k / cols), cc = k % cols; c.setPosition((cc - (cols - 1) / 2) * (cw + gx), y0 + 62 + ch / 2 + r * (ch + gy)); }
        });
      };
      this.exitBtn(s);
      s.layout();
      s.root.setAlpha(0); this.tweens.add({ targets: s.root, alpha: 1, duration: 160 });
      this.sheetOpen = false;
    }

    /* ---- the end of a level ---- */
    cleared(o) {
      var self = this, s = this.openScr('win', { pause: false, dim: 0.5 }), W = D.WORLDS[D.worldOf(o.n)], def = D.list[o.n - 1];
      this.lastSheet = function () { self.cleared(o); };
      s.card = this.add.nineslice(0, 0, 'ui', 'card9', 1100, 960, 60, 60, 60, 60); s.add(s.card);
      s.title = this.text(o.last ? 'You did it!' : o.endOfWorld ? W.name + ' done!' : 'Well done!', 0, -385, 92, 900, INK); s.add(s.title);
      s.sub = this.text(o.last ? 'Every balloon popped. MashaAllah!' : def.name, 0, -290, 52, 800, W.color); s.add(s.sub);
      s.st = [];
      for (var i = 0; i < 3; i++) { var im = this.add.image((i - 1) * 190, -160, 'ui', 'ic-star0').setScale(1.55); s.add(im); s.st.push(im); }
      var go = function (n) { self.go(n); };
      var btns = [];
      if (!o.last) btns.push(this.pill(s, o.endOfWorld ? 'Next World' : 'Next Level', 'ic-next', function () { go(o.n + 1); }, true));
      btns.push(this.pill(s, o.last ? 'Play Again' : 'Replay', 'ic-retry', function () { go(o.last ? 1 : o.n); }, o.last));
      btns.push(this.pill(s, 'Levels', 'ic-grid', function () { self.openLevels(false); }));
      s.btns = btns;
      s.back = function () { Kit.play.exit(); };
      s.layout = function () {
        var v = self.v; self.dimFit(s); s.root.setPosition((v.l + v.r) / 2, (v.t + v.b) / 2);
        var k = Math.min(1, (v.w - 2 * M) / 1100, (v.h - 2 * M) / 960); s.root.setScale(k);
        btns.forEach(function (b, i) { b.setPosition(0, 10 + i * 155); });
        s.exit.setPosition(v.sl + M + 75, v.st + M + 75);
      };
      this.exitBtn(s);
      s.layout();
      s.root.setAlpha(0).setScale(s.root.scale * 0.92); this.tweens.add({ targets: s.root, alpha: 1, scale: s.root.scale / 0.92, duration: 260, ease: 'Back.easeOut' });
      // the stars light up one by one, a soft drop for each
      for (i = 0; i < o.stars; i++) (function (i) {
        self.time.delayedCall(450 + i * 340, function () {
          if (self.scr !== s) return;
          var im = s.st[i]; im.setFrame('ic-star').setScale(2.4); self.tweens.add({ targets: im, scale: 1.55, duration: 320, ease: 'Back.easeOut' });
          Kit.snd.play('sparkle', { vol: 0.9 }); var p = im.getWorldTransformMatrix(); Bp.fan(self.stars, [0xffd36b, 0xfff3c4], 6, p.tx, p.ty);
        });
      })(i);
    }
    failed(o) {
      var self = this, s = this.openScr('fail', { pause: false, dim: 0.55 });
      this.lastSheet = function () { self.failed(o); };
      s.card = this.add.nineslice(0, 0, 'ui', 'card9', 1100, 640, 60, 60, 60, 60); s.add(s.card);
      s.title = this.text('Out of hearts', 0, -200, 88, 900, INK); s.add(s.title);
      s.sub = this.text("Let's try again!", 0, -108, 56, 800, '#ffd1dc'); s.add(s.sub);
      var b1 = this.pill(s, 'Try Again', 'ic-retry', function () { self.go(o.n); }, true), b2 = this.pill(s, 'Levels', 'ic-grid', function () { self.openLevels(false); });
      s.back = function () { Kit.play.exit(); };
      s.layout = function () {
        var v = self.v; self.dimFit(s); s.root.setPosition((v.l + v.r) / 2, (v.t + v.b) / 2);
        s.root.setScale(Math.min(1, (v.w - 2 * M) / 1100, (v.h - 2 * M) / 640));
        b1.setPosition(0, 30); b2.setPosition(0, 195);
        s.exit.setPosition(v.sl + M + 75, v.st + M + 75);
      };
      this.exitBtn(s);
      s.layout();
      s.root.setAlpha(0); this.tweens.add({ targets: s.root, alpha: 1, duration: 260 });
    }
    // a level starts again, or another one: the screens go, the game scene starts anew
    go(n) {
      n = Phaser.Math.Clamp(n, 1, COUNT);
      if (n !== this.n && n > 1 && !Bp.progress.unlocked(n)) return;
      this.gamePaused = false;
      this.clearLevelUi();
      this.def = null;
      this.scene.stop('Play'); this.scene.launch('Play', { n: n }); this.scene.bringToTop();
    }

    /* ---------- a good deed: its card flies to the middle, is shown big for a moment, then goes to its goal ---------- */
    deedGot(o) { this.queue.push(o); if (!this.showing) this.nextShow(); }
    bigSize() { var v = this.v; return Math.min(v.w * 0.72, v.h * 0.46, 820); }
    nextShow() {
      var o = this.queue.shift(); if (!o) { this.game.events.emit('bp-show', false); return; }
      var self = this, v = this.v, S = this.bigSize();
      var p0 = this.fromPlay(o.x, o.y), s0 = o.s * this.scene.get('Play').view.z / v.z;
      var sh = { o: o, S: S, t: 0, big: false };
      sh.halo = this.add.image(0, 0, 'ui', 'glow').setTint(0xfff0be).setAlpha(0).setDepth(40);
      sh.rays = this.add.image(0, 0, 'ui', 'spark').setTint(0xfff3c4).setAlpha(0).setDepth(40);
      sh.shadow = this.add.image(0, 0, 'ui', 'glow').setTint(0x140a28).setAlpha(0).setDepth(41);
      sh.card = this.add.image(p0.x, p0.y, 'cards', 'c' + o.d).setDisplaySize(s0, s0).setDepth(42).setInteractive();
      sh.cap = this.text(D.DEEDS[o.d].caption, 0, 0, Math.round(Math.min(68, v.w * 0.075)), 900, INK, { stroke: STROKE, strokeThickness: 14, align: 'center', wordWrap: { width: v.w - 60 } }).setDepth(43).setAlpha(0);
      this.showing = sh; this.showPlace();
      this.game.events.emit('bp-show', true);
      Kit.snd.play('flip');
      var c = this.showC();
      this.tweens.add({ targets: sh.card, x: c.x, y: c.y, displayWidth: S, displayHeight: S, duration: 400, ease: 'Back.easeOut', onComplete: function () { self.showBig(sh); } });
      sh.card.on('pointerdown', function (p) { p.bpUi = p.downTime; if (sh.big && !sh.fly) { Kit.snd.play('tap'); self.flyShow(sh); } });
    }
    showC() { var v = this.v; return { x: (v.l + v.r) / 2, y: v.t + v.h * 0.42 }; }
    showPlace() {
      var sh = this.showing, c = this.showC(), S = sh.S; if (!sh) return;
      sh.S = S = this.bigSize();
      sh.halo.setPosition(c.x, c.y).setScale(S * 2.3 / 256); sh.rays.setPosition(c.x, c.y).setScale(S * 1.9 / 72);
      sh.shadow.setPosition(c.x + 4, c.y + 24).setScale(S * 1.28 / 256); sh.cap.setPosition(c.x, c.y + S / 2 + 80);
      if (sh.big && !sh.fly) sh.card.setPosition(c.x, c.y).setDisplaySize(S, S);
    }
    showBig(sh) {
      var self = this, o = sh.o, c = this.showC(); sh.big = true;
      this.tweens.add({ targets: sh.halo, alpha: 0.6, duration: 300 }); this.tweens.add({ targets: sh.rays, alpha: 0.4, angle: 360, duration: 9000, repeat: -1 });
      this.tweens.add({ targets: sh.shadow, alpha: 0.35, duration: 300 });
      this.tweens.add({ targets: sh.cap, alpha: 1, scale: { from: 0.8, to: 1 }, duration: 260, ease: 'Back.easeOut', delay: 250 });
      this.tweens.add({ targets: sh.card, y: c.y + 6, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      Bp.fan(this.stars, [0xffd36b, 0xfff3c4, 0xff8fab, 0x7ae7ff], 20, c.x, c.y);
      Kit.snd.play('sparkle', { vol: 0.8 });
      Bp.say(D.DEEDS[o.d].caption);
      try { window.KahfBridge && window.KahfBridge.item && window.KahfBridge.item('good-deed-' + D.DEEDS[o.d].id); } catch (e) { /* not in the app */ }
      sh.hold = this.time.delayedCall(2200, function () { self.flyShow(sh); });
    }
    flyShow(sh) {
      var self = this, ch = this.chips[sh.o.goal], v = this.v, tgt = ch ? { x: ch.c.x, y: ch.c.y } : { x: (v.l + v.r) / 2, y: v.st + 100 };
      if (sh.fly || this.showing !== sh) return; sh.fly = true; if (sh.hold) sh.hold.remove();
      this.tweens.killTweensOf(sh.card); sh.card.disableInteractive();
      this.tweens.add({ targets: [sh.halo, sh.rays, sh.shadow, sh.cap], alpha: 0, duration: 250 });
      this.tweens.add({ targets: sh.card, x: tgt.x, y: tgt.y, displayWidth: 70, displayHeight: 70, alpha: 0.75, duration: 450, ease: 'Quad.easeIn', onComplete: function () {
        if (self.showing !== sh) return;
        if (ch && sh.o.counts) { ch.shown = Math.min(ch.n, ch.shown + 1); self.chipSet(ch); self.chipBump(ch); }
        Bp.fan(self.stars, [0xffd36b], 10, tgt.x, tgt.y); Kit.snd.play('cardin', { vol: 0.8 });
        self.endShow(); self.game.events.emit('bp-deed-done'); self.nextShow();
      } });
    }
    endShow(quiet) {
      var sh = this.showing; if (!sh) return; this.showing = null;
      if (sh.hold) sh.hold.remove();
      this.tweens.killTweensOf([sh.card, sh.halo, sh.rays, sh.shadow, sh.cap]);
      [sh.card, sh.halo, sh.rays, sh.shadow, sh.cap].forEach(function (o) { o.destroy(); });
      if (quiet) this.game.events.emit('bp-show', false);
    }
  }
  window.BpHud = Hud;
})();
