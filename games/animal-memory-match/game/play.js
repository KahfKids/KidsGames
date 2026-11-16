/* Memory Match: the Play scene (the table and the cards, in the 1920 x 1080 design space of Kit.play.fit).
   Turn two cards, find the same animal. 24 levels in 4 worlds, no timer. A pair found lifts and glows, the animal
   comes alive for a moment, its name is shown (and spoken) with the surah it is linked to.

   What the engine does (nothing is hand-written that Phaser has):
   - every movement is a tween (the card turn is a scaleX tween on its flipper container, the deal is a Back-eased
     tween per card, the animal coming alive and the win hop are tweens), every wait is `time.delayedCall`;
   - taps are the engine's input on each card container (pointerdown squashes it, pointerup turns it), keys are its
     keyboard keys; the sparks and the confetti are one particle emitter; the caption plate is a NineSlice;
   - the game loop sleeps while nothing moves (Kit.play.start({ rest: true })): there is no idle animation here.
   What stays game code, because the engine has no word for it: the rules (which animals a level deals, what counts as
   a pair, the stars by misses) and the grid fit (the biggest cards the screen's shape allows).
   Interface (pause, level map, album, win sheet) is the Hud scene (hud.js), above this one; it pauses this scene
   under its screens. Saved progress is MMSave (main.js): key 'kahf-memory-match', shape unchanged.
   All state is set in create()/startLevel(): a scene object is used again each time it starts. */
(function () {
  'use strict';
  var K = window.Kit, M = window.MMAnimals, A = window.MMArt, LV = window.MM_LEVELS;
  var COUNT = LV.list.length, PER = LV.PER, DEBUG = /[?&]debug\b/.test(location.search);
  var CW = A.CW, CH = A.CH, ASPECT = CW / CH, HALF = 150;            // HALF: ms for half a turn of a card
  var TOP = 210, BOTTOM = 150, FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  var FOCUS = ['rgba(40,14,40,.28)', 'rgba(255,250,225,.34)', 'rgba(6,30,60,.3)', 'rgba(8,8,34,.32)'];
  var FOCUS_TINT = [[0x28102a, 0.5], [0xfffae1, 0.45], [0x061e3c, 0.5], [0x080822, 0.55]];
  var BG = ['#251f52', '#5cb9e4', '#0a3462', '#070b2e'];
  var PRAISE = ['mashaallah', 'mashaallah', 'mashaallah', 'barakallah', 'subhanallah'];
  var T = function (scene, x, y, s, size, style) { return scene.add.text(x, y, s, Object.assign({ fontFamily: FONT, fontSize: size + 'px', fontStyle: '800', color: '#fffaf0' }, style || {})).setOrigin(0.5); };

  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  // Every grid shape that holds n cards (the last row may be part-filled; it is centred).
  function shapes(n) { var o = []; for (var c = 1; c <= n; c++) { var r = Math.ceil(n / c); if (c * (r - 1) >= n) continue; if (Math.max(c, r) / Math.min(c, r) <= 5) o.push([c, r]); } return o; }
  function fitGrid(n, aw, ah, maxH) {
    var best = null;
    shapes(n).forEach(function (p) {
      var cellW = aw / p[0], cellH = ah / p[1], h = Math.min(cellH * 0.92, cellW * 0.92 / ASPECT, CH * 2, maxH || 1e9), w = h * ASPECT;
      var score = w * h * Math.pow(0.96, p[0] * p[1] - n) * (Math.max(p[0], p[1]) / Math.min(p[0], p[1]) > 3 ? 0.85 : 1);
      if (!best || score > best.score) best = { c: p[0], r: p[1], w: w, h: h, cellW: cellW, cellH: cellH, score: score };
    });
    return best;
  }
  // the animals a level deals: look-alike twins first (fair, but you look closely), then ones not yet in the album
  function pickAnimals(def, album) {
    var pool = (def.pool || M.LIST.map(function (a) { return a.id; })).slice(), out = [];
    shuffle(M.TWINS.slice()).forEach(function (tw) {
      if (out.length / 2 >= def.twins) return;
      if (pool.indexOf(tw[0]) >= 0 && pool.indexOf(tw[1]) >= 0 && out.length + 2 <= def.pairs) out.push(tw[0], tw[1]);
    });
    var fresh = shuffle(pool.filter(function (id) { return album.indexOf(id) < 0 && out.indexOf(id) < 0; }));
    var seen = shuffle(pool.filter(function (id) { return album.indexOf(id) >= 0 && out.indexOf(id) < 0; }));
    var take = fresh.slice(0, Math.max(1, Math.ceil(def.pairs * 0.5))).concat(seen, fresh.slice(Math.ceil(def.pairs * 0.5)));
    for (var i = 0; i < take.length && out.length < def.pairs; i++) if (out.indexOf(take[i]) < 0) out.push(take[i]);
    return out;
  }
  // a recorded name is not available for animals: the device's own voice says it, as the old page did
  function speak(name) {
    try {
      if (DEBUG || K.snd.muted || !window.speechSynthesis) return;
      speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(name); u.lang = 'en-US'; u.rate = 0.95; u.volume = 0.9; speechSynthesis.speak(u);
    } catch (e) { /* no voice: silent */ }
  }

  class Play extends Phaser.Scene {
    constructor() { super({ key: 'Play' }); }

    create(data) {
      var self = this;
      this.cards = []; this.open = []; this.pending = null; this.phase = 'idle'; this.epoch = 0; this.focus = -1; this.device = 'point';
      this.level = 1; this.world = -1; this.def = null; this.found = 0; this.misses = 0; this.bgImgs = [];
      this.hint = this.caption = this.banner = null; this.used = false;
      // the focus behind the grid (a soft spot of light or shade), the keyboard focus ring, sparks and confetti
      this.spot = this.add.image(960, 540, 'mm-cards', 'dot').setDepth(-5);
      this.makeCaption();
      this.ring = this.add.image(0, 0, 'mm-cards', 'focus').setDepth(30).setVisible(false);
      this.sparks = this.add.particles(0, 0, 'mm-cards', {
        frame: 'spark', emitting: false, lifespan: { min: 600, max: 1100 }, speed: { min: 140, max: 420 }, angle: { min: 0, max: 360 },
        gravityY: 520, scale: { start: 0.8, end: 0 }, rotate: { min: 0, max: 360 }, tint: [0xffd36b, 0xffffff, 0xffb38a, 0xfff1a8]
      }).setDepth(50);

      // keys: arrows (or WASD) move the focus ring, Space or Enter turns the focused card
      var kb = this.input.keyboard, key = function (k, f) { kb.addKey(k).on('down', f); };
      [['LEFT', -1, 0], ['A', -1, 0], ['RIGHT', 1, 0], ['D', 1, 0], ['UP', 0, -1], ['W', 0, -1], ['DOWN', 0, 1], ['S', 0, 1]].forEach(function (k) { key(k[0], function () { self.moveFocus(k[1], k[2]); }); });
      key('SPACE', function () { self.pressFocus(); }); key('ENTER', function () { self.pressFocus(); });
      this.input.on('pointerdown', function (p) { if (self.device !== 'point') self.setDevice('point'); });
      this.events.on('shutdown', function () { try { speechSynthesis.cancel(); } catch (e) { /* no voice */ } });

      // Memory Match's own fit: upright, zoom in on a field 1000 units across so the cards fill the width (as the old game's did)
      Kit.play.fit(this, function (v) { self.layout(v); }, function () { return self.scale.height > self.scale.width * 1.2 ? { w: 1000 } : null; });
      if (DEBUG) window.MMT = this.debugHook();
      this.startLevel(data && data.n ? data.n : MMSave.progress.current());
    }

    blocked() { return this.registry.get('blocked') > 0; }
    canTap() { return this.phase === 'play' && !this.blocked(); }

    /* ---------- the picture behind: a lit scene per world, painted once, kept while its world is played ---------- */
    setWorld(w) {
      if (this.world === w) return;
      this.world = w;
      Kit.snd.amb('amb-' + w, { fade: 2 });                         // the world's own air, very low (desert wind, garden birds, the sea, the countryside)
      this.cameras.main.setBackgroundColor(BG[w]);
      this.spot.setTint(FOCUS_TINT[w][0]).setAlpha(FOCUS_TINT[w][1]);
      var self = this, key = A.worldKey(w), cw = Math.round(2920 * A.WORLD_K);
      this.bgImgs.forEach(function (o) { o.destroy(); }); this.bgImgs = [];
      Kit.play.artNeed(this, new RegExp('^' + key + '$'), function () {         // a world's baked scene loads when it is first entered
        if (self.world !== w) return;
        A.worldTex(self, w);                                                   // (the baked picture, or painted once)
        self.bgImgs.forEach(function (o) { o.destroy(); }); self.bgImgs = [];
        // the scene covers x -500..2420, y -400..1480; its top and bottom rows are stretched past that (tall screens)
        self.bgImgs.push(self.add.image(-500, -400, key, '__BASE').setOrigin(0).setScale(2920 / cw).setDepth(-20));
        self.bgImgs.push(self.add.image(-500, -400, key, 'top').setOrigin(0, 1).setDisplaySize(2920, 3200).setDepth(-20));
        self.bgImgs.push(self.add.image(-500, 1480, key, 'bot').setOrigin(0, 0).setDisplaySize(2920, 3200).setDepth(-20));
        Kit.play.wake();
      });
    }

    /* ---------- layout: the biggest cards this screen's shape allows ---------- */
    layout(v) {
      this.v = v; var u = 48 * v.pt / 150;                                   // the interface in screen points: a 150-unit button is 48 points
      if (this.caption && !this.caption.visible) this.caption.setPosition(960, v.sb - 85 * u);
      if (this.hint) this.hint.setPosition(960, v.sb - 85 * u);
      if (!this.def) return;
      var n = this.cards.length, left = v.sl + 40, right = v.sr - 40;           // the whole safe width (a wide phone on its side has more than 1920)
      var top = v.st + TOP * u, bottom = v.sb - BOTTOM * u, aw = right - left, ah = bottom - top,
        maxH = Math.min(320, Math.max(innerWidth, innerHeight) * 0.36) * Kit.play.dpr() / v.z,   // the old game's limit in screen points
        b = fitGrid(n, aw, ah, maxH);
      var g = this.grid = { c: b.c, r: b.r, w: b.w, h: b.h, bs: b.w / CW, px: Math.min(b.cellW, b.w * 1.14 + 14), py: Math.min(b.cellH, b.h * 1.1 + 14) };
      g.x = left + (aw - g.px * g.c) / 2; g.y = top + (ah - g.py * g.r) / 2;
      var cx = g.x + g.c * g.px / 2, cy = g.y + g.r * g.py / 2;
      this.spot.setPosition(cx, cy).setDisplaySize(Math.hypot(g.c * g.px, g.r * g.py) * 1.5, Math.hypot(g.c * g.px, g.r * g.py) * 1.3);
      this.cards.forEach(function (c) { this.place(c); }, this);
      this.focusAt();
    }
    place(c) {
      var g = this.grid, col = c.slot % g.c, row = Math.floor(c.slot / g.c), inRow = Math.min(g.c, this.cards.length - row * g.c);
      c.tx = g.x + (col + 0.5 + (g.c - inRow) / 2) * g.px; c.ty = g.y + (row + 0.5) * g.py; c.bs = g.bs;
      if (c.placed) this.settle(c, 0);
    }
    // a card at rest: on its spot, a little lifted and larger when matched
    settle(c, ms, ease) {
      var s = c.bs * (1 + c.lift * 0.08), y = c.ty - c.lift * CH * c.bs * 0.09;
      this.tweens.killTweensOf(c.root);
      if (!ms) { c.root.setPosition(c.tx, y).setScale(s).setAngle(0); return; }
      this.tweens.add({ targets: c.root, x: c.tx, y: y, scale: s, angle: 0, duration: ms, ease: ease || 'Sine.easeOut' });
    }

    /* ---------- a level ---------- */
    startLevel(n) {
      var self = this, P = MMSave.progress;
      this.epoch++; this.tweens.killAll(); this.time.removeAllEvents(); this.sparks.killAll();
      try { speechSynthesis.cancel(); } catch (e) { /* no voice */ }
      Kit.snd.stopVoice();
      this.cards.forEach(function (c) { c.root.destroy(); }); this.cards = []; this.open = []; this.pending = null;
      [this.banner, this.hint].forEach(function (o) { if (o) o.destroy(); }); this.banner = this.hint = null; this.caption.setVisible(false);
      this.level = K.clamp(n, 1, COUNT); this.def = LV.list[this.level - 1]; P.setCurrent(this.level);
      this.found = 0; this.misses = 0; this.focus = -1; this.ring.setVisible(false); this.backTimer = null;
      this.setWorld(LV.worldOf(this.level));
      var ids = pickAnimals(this.def, MMSave.album), deck = [];
      ids.forEach(function (id) { deck.push(id, id); }); shuffle(deck);
      deck.forEach(function (id, i) { self.cards.push(self.makeCard(id, i)); });
      this.layout(this.v);
      this.registry.set('lv', { level: this.level, world: this.world, pairs: this.def.pairs, found: 0 });
      this.game.events.emit('mm-level', this.registry.get('lv'));
      this.phase = 'banner'; this.showBanner();
      var ep = this.epoch;
      this.time.delayedCall(1000, function () { if (ep === self.epoch) self.deal(); });
    }
    makeCard(id, i) {
      var self = this, a = M.byId[id], c = { i: i, slot: i, id: id, a: a, up: false, shown: false, matched: false, lift: 0, placed: false, tx: 0, ty: 0, bs: 1 };
      var shadow = this.add.image(0, 8, 'mm-cards', 'shadow'), glow = this.add.image(0, 0, 'mm-cards', 'glow').setAlpha(0).setScale(1.6);
      var back = this.add.image(0, 0, 'mm-cards', 'back' + this.world);
      var paper = this.add.image(0, 0, 'mm-cards', 'paper'), disc = this.add.image(0, 8, 'mm-cards', 'disc').setTint(Phaser.Display.Color.HexStringToColor(a.bg).color);
      var animal = this.add.image(0, 8, 'mm-animals', id).setScale(297 / A.AN), gold = this.add.image(0, 0, 'mm-cards', 'gold').setAlpha(0);
      var face = this.add.container(0, 0, [paper, disc, animal, gold]).setVisible(false);
      var flipper = this.add.container(0, 0, [back, face]);
      var root = this.add.container(0, 0, [glow, shadow, flipper]).setSize(CW, CH).setInteractive().setVisible(false);
      Object.assign(c, { root: root, flipper: flipper, back: back, face: face, animal: animal, gold: gold, glow: glow });
      root.on('pointerdown', function () {
        if (!self.canTap()) return; c.downed = true; self.tweens.killTweensOf(root); self.tweens.add({ targets: root, scale: c.bs * 0.93 * (1 + c.lift * 0.08), duration: 70, ease: 'Sine.easeOut' });
      });
      root.on('pointerup', function (p) {
        if (!c.downed) return; c.downed = false; self.settle(c, 90);
        if (p.getDistance() > 70) return;                                    // dragged away: no turn
        self.tapCard(c);
      });
      root.on('pointerout', function () { if (c.downed) { c.downed = false; self.settle(c, 90); } });
      return c;
    }

    showBanner() {
      if (Kit.load) Kit.load.done();                                       // the first view is ready: the page's loading picture leaves
      var self = this, W = A.WORLDS[this.world], g = this.grid, cy = g.y + g.r * g.py / 2;
      var b = this.banner = this.add.container(960, cy, [
        T(this, 0, -150, W.name.toUpperCase(), 52, { color: W.color, stroke: '#140a28', strokeThickness: 10 }),
        T(this, 0, 0, 'Level ' + this.level, 170, { stroke: '#140a28', strokeThickness: 18 }),
        T(this, 0, 140, 'Find ' + this.def.pairs + ' pairs', 66, { fontStyle: '700', stroke: '#140a28', strokeThickness: 12 })
      ]).setDepth(70).setAlpha(0);
      this.tweens.chain({ targets: b, tweens: [{ alpha: 1, y: cy - 10, duration: 320, ease: 'Sine.easeOut' }, { alpha: 1, duration: 600 }, { alpha: 0, duration: 300, onComplete: function () { b.destroy(); if (self.banner === b) self.banner = null; } }] });
    }
    deal() {
      var self = this, g = this.grid, v = this.v, ep = this.epoch, cx = (g.c - 1) / 2, cy = (g.r - 1) / 2, left = this.cards.length, last = 0;
      this.phase = 'deal'; Kit.snd.play('deal');
      this.cards.forEach(function (c, k) {
        var d = k * 45 + Math.hypot((c.slot % g.c) - cx, Math.floor(c.slot / g.c) - cy) * 25;
        c.root.setPosition(960, v.b + CH * c.bs).setScale(c.bs * 0.7).setAngle((Math.random() - 0.5) * 24).setVisible(true).setDepth(1);
        self.tweens.add({ targets: c.root, x: c.tx, y: c.ty, scale: c.bs, angle: 0, duration: 560, delay: d, ease: 'Back.easeOut', onComplete: function () { c.placed = true; if (--left === 0) self.time.delayedCall(220, function () { if (ep === self.epoch) self.afterDeal(); }); } });
      });
      this.layout(this.v);
    }
    afterDeal() {
      var self = this, g = this.grid, ep = this.epoch, cx = (g.c - 1) / 2, peek = this.def.peek * 1000;
      if (peek <= 0) { this.startPlay(); return; }
      this.phase = 'peek'; Kit.snd.play('flip', { vol: 0.8 });
      this.cards.forEach(function (c) { self.turn(c, true, Math.abs((c.slot % g.c) - cx) * 50); });
      this.time.delayedCall(HALF * 2 + 150 + peek, function () {
        if (ep !== self.epoch) return;
        Kit.snd.play('flipback');
        self.cards.forEach(function (c) { self.turn(c, false, Math.abs((c.slot % g.c) - cx) * 50); });
        self.time.delayedCall(HALF * 2 + 250, function () { if (ep === self.epoch) self.startPlay(); });
      });
    }
    startPlay() {
      this.phase = 'play';
      if (this.level === 1) this.showHint();
      if (this.device === 'keys' && this.focus < 0) this.focus = 0;
      this.focusAt();
    }

    /* ---------- a card turns over: scaleX to nothing, swap the picture, scaleX back, with a little lift ---------- */
    turn(c, up, delay) {
      var self = this, f = c.flipper;
      c.up = up; this.tweens.killTweensOf(f);
      var land = function () { self.tweens.add({ targets: f, scaleX: 1, scaleY: { from: 0.95, to: 1 }, y: 0, duration: HALF, ease: 'Back.easeOut' }); };
      if (c.shown === up) { this.tweens.add({ targets: f, scaleX: 1, y: 0, duration: 90, delay: delay || 0 }); return; }
      this.tweens.add({
        targets: f, scaleX: 0.02, y: -CH * 0.05, duration: Math.max(40, HALF * f.scaleX), delay: delay || 0, ease: 'Sine.easeIn',
        onComplete: function () { c.shown = up; c.back.setVisible(!up); c.face.setVisible(up); land(); }
      });
    }
    wobble(c, amt) {
      var r = c.root; this.tweens.add({ targets: r, angle: { from: -amt, to: amt }, duration: 70, yoyo: true, repeat: 2, onComplete: function () { r.setAngle(0); } });
    }

    /* ---------- play ---------- */
    tapCard(c) {
      if (!c || !this.canTap()) return false;
      this.used = true;
      if (c.matched) { this.wobble(c, 4); return false; }
      if (c.up) { if (this.open.length < 2) this.wobble(c, 5); return false; }
      if (this.pending) this.resolveNow();
      if (this.open.length >= 2) this.closeOpen();
      this.fadeCaption();
      c.up = true; this.open.push(c); c.root.setDepth(5);
      Kit.snd.play('flip'); K.buzz(6);
      this.turn(c, true);
      if (this.hint && this.hintMode === 'controls') this.showHint('goal');
      if (this.open.length === 2) {
        var self = this, a = this.open[0], b = this.open[1], ep = this.epoch;
        this.pending = this.time.delayedCall(HALF * 2 + 60, function () { if (ep !== self.epoch) return; self.pending = null; self.resolve(a, b); });
        this.pending.a = a; this.pending.b = b;
      }
      return true;
    }
    resolveNow() { var p = this.pending; this.pending = null; p.remove(false); this.resolve(p.a, p.b); }
    resolve(a, b) {
      var self = this, ep = this.epoch;
      K.bridge.answer();
      if (a.id === b.id) {
        this.open = []; this.found++;
        [a, b].forEach(function (c) { self.celebrate(c); });
        Kit.snd.play('match'); K.buzz(14);
        this.time.delayedCall(120, function () { Kit.snd.play(a.id); });
        this.time.delayedCall(450, function () { speak(a.a.name); });
        var isNew = MMSave.album.indexOf(a.id) < 0;
        if (isNew) { MMSave.album.push(a.id); MMSave.store.set('found', MMSave.album); }
        this.showCaption(a.a, isNew);
        if (this.hint) { this.hint.destroy(); this.hint = null; MMSave.hinted = true; MMSave.store.set('hinted', true); }
        this.registry.set('lv', Object.assign(this.registry.get('lv'), { found: this.found }));
        this.game.events.emit('mm-found', this.found, this.def.pairs, isNew);
        if (this.found >= this.def.pairs) this.time.delayedCall(1600, function () { if (ep === self.epoch) self.clear(); });
      } else {
        this.misses++;
        this.wobble(a, 6); this.wobble(b, 6);
        Kit.snd.play('miss'); K.buzz(20);
        this.backTimer = this.time.delayedCall(1150, function () { if (ep === self.epoch) self.closeOpen(); });
      }
    }
    closeOpen() {
      if (this.backTimer) { this.backTimer.remove(false); this.backTimer = null; }
      if (!this.open.length) return;
      var self = this; this.open.forEach(function (c) { self.turn(c, false); c.root.setDepth(1); }); this.open = [];
      Kit.snd.play('flipback');
    }
    // a pair found: lifts, glows, the gold frame, the animal comes alive, sparks
    celebrate(c) {
      var self = this, mo = c.a.motion, im = c.animal, y0 = im.y, s0 = im.scale, ep = this.epoch;
      c.matched = true; c.lift = 1; c.root.setDepth(10); c.gold.setAlpha(1);
      var bs = c.bs, rest = function (l) { return { x: c.tx, y: c.ty - l * CH * bs * 0.09, scale: bs * (1 + l * 0.08), angle: 0 }; };
      this.tweens.killTweensOf(c.root);
      // lifts with a bounce, holds while the animal moves, settles a little lower (one chain: no timer to keep the loop awake)
      this.tweens.chain({ targets: c.root, tweens: [Object.assign({ duration: 260, ease: 'Back.easeOut' }, rest(1)), Object.assign({ duration: 500, delay: 900, onStart: function () { c.lift = 0.15; } }, rest(0.15))] });
      this.tweens.chain({ targets: c.glow, tweens: [{ alpha: 0.9, duration: 320 }, { alpha: 0.35, duration: 500, delay: 900 }] });
      this.tweens.add({ targets: im, scale: { from: s0 * 0.88, to: s0 }, duration: 750, ease: 'Elastic.easeOut' });
      if (!K.reducedMotion) {
        if (mo === 'walk' || mo === 'bob') this.tweens.add({ targets: im, y: y0 - 16, duration: 150, yoyo: true, repeat: 3, ease: 'Sine.easeOut' });
        else if (mo === 'fly') this.tweens.add({ targets: im, y: y0 - 20, angle: { from: -4, to: 4 }, duration: 480, yoyo: true, repeat: 1, ease: 'Sine.easeInOut', onComplete: function () { im.setAngle(0).setY(y0); } });
        else if (mo === 'swim') this.tweens.add({ targets: im, x: 16, angle: { from: -3, to: 3 }, duration: 560, yoyo: true, repeat: 1, ease: 'Sine.easeInOut', onComplete: function () { im.setAngle(0).setX(0); } });
        else this.tweens.add({ targets: im, angle: { from: -3, to: 3 }, duration: 220, yoyo: true, repeat: 2, onComplete: function () { im.setAngle(0); } });
      }
      this.sparks.explode(14, c.tx, c.ty - c.bs * CH * 0.1);
    }
    clear() {
      var self = this, g = this.grid, v = this.v, ep = this.epoch, stars = LV.stars(this.def.pairs, this.misses), last = this.level === COUNT;
      this.phase = 'clear'; this.ring.setVisible(false);
      this.tweens.killTweensOf(this.caption); this.caption.setVisible(false);
      MMSave.progress.finish(this.level, stars);
      K.bridge.complete();
      Kit.snd.play('win');
      this.praise(PRAISE[(Math.random() * PRAISE.length) | 0]);
      var cx = (g.c - 1) / 2;
      this.cards.forEach(function (c) {
        self.tweens.add({ targets: c.root, y: c.ty - c.lift * CH * c.bs * 0.09 - CH * c.bs * 0.16, duration: 260, yoyo: true, delay: Math.abs((c.slot % g.c) - cx) * 80 + Math.floor(c.slot / g.c) * 50, ease: 'Sine.easeOut' });
      });
      for (var i = 0; i < 6; i++) this.time.delayedCall(i * 140, function () { self.sparks.explode(26, K.rand(v.l + v.w * 0.15, v.l + v.w * 0.85), K.rand(v.t + v.h * 0.2, v.t + v.h * 0.55)); });
      this.time.delayedCall(DEBUG ? 300 : 1900, function () {
        if (ep === self.epoch) self.game.events.emit('mm-won', { level: self.level, stars: stars, pairs: self.def.pairs, last: last });
      });
    }
    // a recorded Arabic praise (the kit's praise clips, played as a voice so the effects duck under it)
    praise(key) {
      if (DEBUG) return;
      var go = function () { var d = K.praiseClips && K.praiseClips[key]; if (d) Kit.snd.voice('data:audio/mpeg;base64,' + d, { vol: 0.9 }); };
      if (K.praiseClips) { go(); return; }
      var s = document.createElement('script'); s.src = '/KidsGames/js/kit/praise-clips.js'; s.onload = go; document.head.appendChild(s);
    }

    /* ---------- the name of the animal found (and a NEW tag), and the first-level hint ---------- */
    plate(w, h) { return this.add.nineslice(0, 0, 'mm-ui', 'panel', w, h, 56, 56, 56, 56); }
    // the caption plate is built once and reused (no text or canvas made while the child plays)
    makeCaption() {
      var name = T(this, 0, 0, ' ', 46).setOrigin(0, 0.5), cap = T(this, 0, 0, ' ', 34, { fontStyle: '700', color: '#ffd98a' }).setOrigin(0, 0.5);
      var c = this.caption = this.add.container(960, 0, [this.plate(300, 112), this.add.image(0, 0, 'mm-cards', 'disc').setScale(96 / 280), this.add.image(0, 2, 'mm-animals', M.LIST[0].id).setScale(92 / A.AN), name, cap,
        this.add.container(0, 0, [this.add.image(0, 0, 'mm-ui', 'tag').setTint(0xf6c453), T(this, 0, 1, 'NEW', 30, { color: '#4a2a06' })]).setAngle(-7)]).setDepth(60).setAlpha(0).setVisible(false);
      c.parts = { plate: c.list[0], disc: c.list[1], pic: c.list[2], name: name, cap: cap, tag: c.list[5] };
    }
    fadeCaption() {
      var c = this.caption; if (!c.visible || c.fading) return; c.fading = true;
      this.tweens.killTweensOf(c); this.tweens.add({ targets: c, alpha: 0, duration: 250, onComplete: function () { c.setVisible(false); c.fading = false; } });
    }
    showCaption(a, isNew) {
      var self = this, v = this.v, c = this.caption, P = c.parts;
      this.tweens.killTweensOf(c); this.tweens.killTweensOf(P.tag);
      P.name.setText(a.name); P.cap.setText(a.cap ? '  ·  ' + a.cap : '');
      var w = 40 + 96 + 16 + P.name.width + P.cap.width + 40, h = 112, x0 = -w / 2 + 40 + 48;
      P.plate.setSize(w, h);
      P.disc.setPosition(x0, 0).setTint(Phaser.Display.Color.HexStringToColor(a.bg).color);
      P.pic.setFrame(a.id).setPosition(x0, 2);
      P.name.setPosition(x0 + 48 + 16, 1); P.cap.setPosition(P.name.x + P.name.width, 3);
      P.tag.setPosition(x0 + 34, -h / 2 - 2).setVisible(!!isNew).setScale(0);
      var u = 48 * v.pt / 150;
      c.fading = false; c.setScale(Math.min(u, (v.sr - v.sl - 60) / w)).setPosition(960, v.sb - 85 * u + 24).setAlpha(0).setVisible(true);
      this.tweens.add({ targets: c, alpha: 1, y: v.sb - 85 * u, duration: 300, ease: 'Back.easeOut' });
      if (isNew) this.tweens.add({ targets: P.tag, scale: 1, duration: 400, delay: 300, ease: 'Back.easeOut' });
    }
    hintText(mode) {
      if (mode === 'goal') return 'Find two the same!';
      return this.device === 'keys' ? 'Arrow keys to choose  ·  Space to turn a card' : 'Tap a card to turn it over';
    }
    showHint(mode) {
      if (this.hint) { this.hint.destroy(); this.hint = null; }
      mode = mode || (this.used ? 'goal' : 'controls');
      if (mode === 'goal' && MMSave.hinted) { this.hintMode = null; return; }
      this.hintMode = mode;
      var t = T(this, 0, 0, this.hintText(mode), 46), w = t.width + 100;
      var u = Math.max(48 * this.v.pt / 150, 17 * this.v.pt / 46);          // (the hint's words never under 17 points)
      this.hint = this.add.container(960, this.v.sb - 85 * u, [this.plate(w, 112), t]).setDepth(40).setScale(Math.min(u, (this.v.sr - this.v.sl - 60) / w));
    }
    setDevice(d) {
      this.device = d; this.game.events.emit('mm-device', d);
      if (d === 'keys' && this.focus < 0 && this.cards.length) this.focus = 0;
      if (this.hint && this.hintMode === 'controls') this.showHint('controls');
      this.focusAt();
    }

    /* ---------- the keyboard focus ring ---------- */
    focusAt() {
      var c = this.cards[this.focus];
      if (!c || this.device !== 'keys' || this.phase === 'clear') { this.ring.setVisible(false); return; }
      this.ring.setPosition(c.tx, c.ty).setScale(c.bs).setVisible(true);
    }
    moveFocus(dx, dy) {
      if (this.blocked() || !this.cards.length) return;
      this.setDevice('keys');
      var g = this.grid, n = this.cards.length, i = this.focus < 0 ? 0 : this.focus, col = i % g.c, row = Math.floor(i / g.c);
      if (this.focus >= 0) {
        col = K.clamp(col + dx, 0, g.c - 1); row = K.clamp(row + dy, 0, g.r - 1);
        i = Math.min(n - 1, row * g.c + col);
      }
      this.focus = i; this.focusAt(); Kit.snd.play('tap', { vol: 0.5 });
    }
    pressFocus() {
      if (this.blocked()) return; this.setDevice('keys');
      if (this.focus >= 0) this.tapCard(this.cards[this.focus]);
    }

    // test hook (only with ?debug): inspect the game and play it
    debugHook() {
      var self = this;
      return {
        scene: this,
        state: function () { return { phase: self.phase, level: self.level, world: self.world, pairs: self.def.pairs, found: self.found, misses: self.misses, open: self.open.map(function (c) { return c.i; }), grid: self.grid,
          cards: self.cards.map(function (c) { return { i: c.i, id: c.id, x: Math.round(c.tx), y: Math.round(c.ty), up: c.up, matched: c.matched }; }) }; },
        level: function (n) { self.startLevel(n); },
        css: function (x, y) { var cam = self.cameras.main, d = Kit.play.dpr(); return [(x - cam.worldView.x) * cam.zoom / d, (y - cam.worldView.y) * cam.zoom / d]; },
        flip: function (i) { return self.tapCard(self.cards[i]); },
        pair: function (id) { return self.cards.filter(function (c) { return c.id === id && !c.matched; }); }
      };
    }
  }
  window.MMPlay = Play;
})();
