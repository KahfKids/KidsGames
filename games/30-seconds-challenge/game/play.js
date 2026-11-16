/* Sharp Eyes: the board (scene 'Play', under the interface scene 'Hud').
   A grid of the same picture with exactly one that is different: tap it! Short rounds, 30 levels in 3 worlds
   (game/levels.js), pictures and measured differences from game/items.js.
   Engine map (the old game had its own loop, tweens, timers, input and particles):
   - every motion is a Phaser tween: tiles ripple in from the middle (Back.easeOut), squash when pressed, shake when wrong,
     pop and leave when right, the rest shrink away; the odd one's ring pulses when it is shown;
   - the round's clock is one Phaser TimerEvent (a wrong tap takes a second off its `elapsed`) and a 100 ms loop that tells
     the interface how much is left; the pauses between steps are `time.delayedCall`; scene.pause stops them all;
   - taps are the engine's own input on each tile (a Container with a hit area); the keyboard cursor and Space/Enter are
     the engine's keyboard keys; a particle emitter makes the sparks; a camera shake answers a wrong tap, very small;
   - nothing is drawn per frame and there is no update(): the whole round's pictures (tiles, the two things, a ring) are one
     canvas texture painted once, so a grid is one draw batch, and with start({ rest: true }) the loop sleeps between taps
     on the levels without a clock.
   What stays game code is the game: which picture and difference fit a level (choose), the grid that fits the screen, and
   the rules (hearts, a second lost per wrong tap, stars = hearts left).
   Saved progress is in game/common.js; the interface (HUD, pause, sheets, level map) is game/hud.js and listens to the
   events this scene sends on the game's emitter: se-level, se-phase, se-time, se-hearts, se-found, se-won, se-lost. */
(function () {
  'use strict';
  var I = window.SpotItems, A = window.SpotArt, LV = window.SPOT_LEVELS, Se = window.Se;
  var clamp = Phaser.Math.Clamp, MIN_PX = 52, MAX_PITCH = 460, GOLD = 0xffd36b;
  var SIZES = [4, 6, 9, 12, 16, 20, 25, 30, 36];
  var CHEERS = ['Found it!', 'Great!', 'Sharp eyes!', 'Super!', 'Yes!', 'MashaAllah!'];
  var BEDS = ['bed-0', 'bed-1', 'bed-2'];

  // ---------- which picture and which difference (game rules) ----------
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  // A picture and a measured difference whose difficulty fits the level (never below SpotItems.MIN_SCORE). The options of
  // an item are tried in random order and each is measured only when it is tried (the Lab-colour comparison is the costly
  // part, cached per picture): the first that fits wins, preferring a kind other than the last. Same pick as scoring all of
  // them first and choosing at random among the fitting, for a fifth of the work.
  function choose(def, lastItem, lastKind) {
    var d0 = def.d[0], d1 = def.d[1], best = null, bestGap = Infinity;
    var ids = shuffle(def.pool.filter(function (id) { return id !== lastItem; }));
    function made(item, base, o, s) { return { item: item, base: base, odd: o.v, kind: o.kind, score: s.score, d: I.difficulty(o, s.score), label: o.label }; }
    for (var k = 0; k < ids.length; k++) {
      var item = I.byId[ids[k]], base = I.base(item, item.colors[(Math.random() * item.colors.length) | 0]), stale = null;
      var opts = shuffle(I.oddOptions(item, base));
      for (var n = 0; n < opts.length; n++) {
        var o = opts[n], s = I.score(item, base, o.v);
        if (s.clipped || s.score < I.MIN_SCORE) continue;
        var m = made(item, base, o, s);
        if (m.d >= d0 && m.d <= d1) { if (m.kind !== lastKind) return m; if (!stale) stale = m; }
        else { var gap = m.d < d0 ? d0 - m.d : m.d - d1; if (gap < bestGap) { bestGap = gap; best = m; } }
      }
      if (stale) return stale;
    }
    return best;
  }
  // columns x rows with the biggest tiles for this area (the same shape rule as before)
  function pairs(n) { var out = []; for (var c = 1; c <= n; c++) if (n % c === 0) { var r = n / c; if (Math.max(c, r) / Math.min(c, r) <= 3.2) out.push([c, r]); } return out; }
  function fit(n, aw, ah) {
    var best = null;
    pairs(n).forEach(function (p) { var pitch = Math.min(aw / p[0], ah / p[1]); if (!best || pitch > best.pitch) best = { cols: p[0], rows: p[1], pitch: pitch }; });
    return best;
  }

  class Play extends Phaser.Scene {
    constructor() { super({ key: 'Play' }); }

    create() {
      var self = this;
      this.cells = []; this.atlas = null; this.atlasN = 0; this.worldKey = ''; this.phase = 'idle'; this.def = null; this.G = null;
      this.down = null; this.kbd = false; this.cur = 0; this.timer = null; this.tickEv = null; this.lastSec = 99; this.hintOn = false;
      this.view = null; this.world = 0; this.level = 1;
      A.ui(this);
      this.sparks = this.add.particles(0, 0, 'ui', { frame: 'star-w', emitting: false, lifespan: { min: 500, max: 900 }, speed: { min: 140, max: 360 },
        gravityY: 320, scale: { start: 0.55, end: 0 }, rotate: { min: 0, max: 360 }, tint: [0xffd36b, 0xffffff, 0xff9fb4, 0x8fe0ff] }).setDepth(30);
      this.words = {}; this.word = null;
      this.cursor = null;

      // keyboard: arrows or WASD move a ring over the tiles, Space or Enter picks, R starts the level again
      var K = this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,ENTER,R');
      [['LEFT', -1, 0], ['A', -1, 0], ['RIGHT', 1, 0], ['D', 1, 0], ['UP', 0, -1], ['W', 0, -1], ['DOWN', 0, 1], ['S', 0, 1]].forEach(function (k) { K[k[0]].on('down', function () { self.moveCursor(k[1], k[2]); }); });
      K.SPACE.on('down', function () { self.keyPick(); }); K.ENTER.on('down', function () { self.keyPick(); });
      K.R.on('down', function () { self.startLevel(self.level); });
      this.input.on('pointerdown', function () { if (self.kbd) { self.kbd = false; self.showCursor(); } });

      this.game.events.on('se-go', this.startLevel, this);
      this.events.once('shutdown', function () { self.game.events.off('se-go', self.startLevel, self); });
      Kit.play.fit(this, function (v) { self.layout(v); }, { w: 1280 });
      this.startLevel(Se.progress.current());
      if (Kit.load) Kit.load.done();
    }

    /* ---- the screen: backdrop and grid ---- */
    layout(v) {
      this.v = v;
      if (!this.def) return;
      this.placeBg();
      this.grid();
      if (this.next && this.next.atlas) { this.textures.remove(this.next.atlas); this.next.atlas = null; }
      if (this.phase === 'in' || this.phase === 'play' || this.phase === 'reveal' || this.phase === 'fail') { this.buildCells(false); if (this.phase === 'reveal' || this.phase === 'fail') this.showOdd(); }
    }
    // the world's baked picture, the sky gradient under it and the soft glow behind the grid (frames of the ui sheet)
    setWorld() {
      var e = A.worldTex(this, this.world);
      this.worldKey = this.world;
      if (this.bg) { this.bg.destroy(); this.bgTop.destroy(); this.focus.destroy(); }
      this.bgTop = this.add.image(0, 0, 'ui', 'sky-' + this.world).setOrigin(0.5, 0).setDepth(-11);
      this.bg = this.add.image(0, 0, e.key).setOrigin(0.5, 1).setDepth(-10);
      this.focus = this.add.image(0, 0, 'ui', 'focus-' + this.world).setDepth(-5);
    }
    placeBg() {
      var v = this.v; if (!this.bg) return;
      // a tall screen enlarges the world's picture so it reaches well up the screen (as the old game's did), not a strip at the bottom
      var bs = Math.max(1, v.h * 0.62 / 1080);
      this.bg.setPosition(960, v.b).setDisplaySize(Math.max(2920 * bs, v.w + 8), 1080 * bs);
      var hy = v.b - 1080 * bs + A.edges['world-' + this.world].horizon * bs;
      this.bgTop.setPosition(960, v.t - 6).setDisplaySize(v.w + 8, hy - v.t + 8);
    }
    // the biggest grid that fits below the interface, never with tiles under about 52 px on the screen
    grid() {
      var v = this.v, def = this.def, top = Se.hudBottom(v) + Se.GAP, bottom = v.sb - Se.EDGE - (this.hintOn ? 130 : 0);
      var left = v.sl + Se.EDGE, right = v.sr - Se.EDGE, aw = right - left, ah = bottom - top, n = def.cells, f = null;
      var minP = MIN_PX / (v.z / Kit.play.dpr());
      for (var k = SIZES.length - 1; k >= 0; k--) {
        if (SIZES[k] > def.cells) continue;
        f = fit(SIZES[k], aw, ah); n = SIZES[k];
        if (f.pitch >= minP) break;
      }
      var pitch = Math.min(MAX_PITCH, 168 * Kit.play.dpr() / v.z, f.pitch, Math.min(aw, ah) * (n <= 4 ? 0.42 : 0.5));   // (168 points: the old game's limit on a big screen)
      pitch = Math.max(pitch, Math.min(f.pitch, minP));
      var G = this.G = { n: n, cols: f.cols, rows: f.rows, pitch: pitch };
      G.gx = left + (aw - pitch * f.cols) / 2; G.gy = top + (ah - pitch * f.rows) / 2;
      if (this.focus) { var d = Math.hypot(f.cols, f.rows) * pitch * 1.24; this.focus.setPosition(G.gx + f.cols * pitch / 2, G.gy + f.rows * pitch / 2).setDisplaySize(d, d); }
      if (this.cells.length && this.cells.length !== n && this.odd >= n) this.odd = this.odd % n;
    }

    /* ---- a level ---- */
    startLevel(n) {
      n = clamp(n | 0 || 1, 1, Se.COUNT);
      this.tweens.killAll(); this.time.removeAllEvents(); this.timer = this.tickEv = null; this.down = null; this.dropNext();
      if (this.word) this.word.setVisible(false);
      this.destroyCells();
      this.level = n; this.world = LV.worldOf(n); this.def = LV.list[n - 1];
      Se.progress.setCurrent(n);
      this.found = 0; this.hearts = Se.MAX_HEARTS; this.lastItem = ''; this.lastKind = ''; this.odd = 0; this.pick = null;
      this.hintOn = n === 1 && !Se.store.get('hinted', false);
      this.setPhase('banner');
      if (this.v) { this.setWorld(); this.placeBg(); this.grid(); }
      Kit.snd.amb(BEDS[this.world], { vol: 1 });
      var info = { level: n, world: this.world, rounds: this.def.rounds, time: this.def.time, hearts: this.hearts, hint: this.hintOn };
      this.registry.set('lv', info); this.game.events.emit('se-level', info);
      this.prepare();
      this.time.delayedCall(900, this.newRound, [], this);
    }
    setPhase(p) { this.phase = p; this.game.events.emit('se-phase', p); }
    newRound() {
      var nx = this.next; this.next = null;
      this.pick = nx ? nx.pick : choose(this.def, this.lastItem, this.lastKind);
      this.lastItem = this.pick.item.id; this.lastKind = this.pick.kind;
      this.odd = (Math.random() * this.G.n) | 0;
      this.buildCells(true, nx);
      this.setPhase('in');
      Kit.snd.play('shuffle');
      this.prepare();
      this.time.delayedCall(450, this.beginPlay, [], this);
    }
    // The next round's picture and its atlas are made ahead, in the quiet part of the round, one step per frame-gap: the
    // difference scoring (Lab colour of every variant) and the canvas painting cost 50 to 100 ms on a slow phone, which is
    // a stutter if done on the tap that starts the next round (measured at 6x CPU). If the tap comes first, newRound does it then.
    prepare() {
      this.dropNext();
      var self = this;
      this.time.delayedCall(350, function () { self.next = { pick: choose(self.def, self.lastItem, self.lastKind) }; });
      this.time.delayedCall(700, function () {
        var nx = self.next; if (!nx || nx.atlas) return;
        nx.sig = self.sig(); nx.atlas = self.paintAtlas(nx.pick);
      });
    }
    dropNext() { if (this.next && this.next.atlas) this.textures.remove(this.next.atlas); this.next = null; }
    sig() { return this.world + '|' + Math.round(this.G.pitch) + '|' + this.v.z.toFixed(3); }
    paintAtlas(pick) {
      var G = this.G, kz = Math.min(1.25, this.v.z), px = Math.max(8, Math.round(G.pitch * 0.9 * kz)), art = G.pitch * 0.74 * kz, I_ = I;
      var key = 'cells-' + (++this.atlasN);
      A.cellAtlas(this, key, this.world, px, function (g, cx, cy, which) { I_.draw(g, pick.item, which === 'odd' ? pick.odd : pick.base, cx, cy, art); });
      return key;
    }
    beginPlay() {
      this.setPhase('play');
      this.showCursor();
      if (!this.def.time) return;
      this.timer = this.time.addEvent({ delay: this.def.time * 1000, callback: this.timeUp, callbackScope: this });
      this.tickEv = this.time.addEvent({ delay: 100, loop: true, callback: this.tick, callbackScope: this });
      this.lastSec = 99; this.game.events.emit('se-time', this.def.time, this.def.time);
    }
    // 10 times a second while a clock runs: tell the interface, and tick softly in the last three seconds only
    tick() {
      if (!this.timer) return;
      var left = Math.max(0, this.timer.getRemaining() / 1000), sec = Math.ceil(left - 0.001);
      this.game.events.emit('se-time', left, this.def.time);
      if (this.phase === 'play' && sec !== this.lastSec) { this.lastSec = sec; if (sec >= 1 && sec <= 3) Kit.snd.play('tick'); }
    }
    stopClock() {
      if (this.timer) { this.timer.remove(false); this.timer = null; }
      if (this.tickEv) { this.tickEv.remove(false); this.tickEv = null; }
    }

    /* ---- the tiles ---- */
    destroyCells() {
      var tw = this.tweens;
      this.cells.forEach(function (c) { tw.killTweensOf([c, c.st, c.ring]); c.destroy(); }); this.cells = [];
      if (this.cursor) { this.cursor.destroy(); this.cursor = null; }
      if (this.atlas) { this.textures.remove(this.atlas); this.atlas = null; }
    }
    // the round's pictures painted once into one texture (3 x 2 frames), at the sharpness of this screen; then the tiles
    buildCells(animate, pre) {
      this.down = null;
      this.destroyCells();
      var G = this.G, kz = Math.min(1.25, this.v.z), pick = this.pick;
      if (pre && pre.atlas && pre.sig === this.sig()) this.atlas = pre.atlas;
      else { if (pre && pre.atlas) this.textures.remove(pre.atlas); this.atlas = this.paintAtlas(pick); }
      var sc = 1 / kz, mx = (G.cols - 1) / 2, my = (G.rows - 1) / 2, key = this.atlas;
      for (var i = 0; i < G.n; i++) {
        var col = i % G.cols, row = (i / G.cols) | 0;
        var plate = this.add.image(0, 0, key, 'plate').setScale(sc), st = this.add.image(0, 0, key, 'right').setScale(sc).setAlpha(0);
        var ring = this.add.image(0, 0, key, 'ring').setScale(sc).setAlpha(0).setTint(GOLD);
        var pic = this.add.image(0, 0, key, i === this.odd ? 'odd' : 'base').setScale(sc);
        var c = this.add.container(G.gx + (col + 0.5) * G.pitch, G.gy + (row + 0.5) * G.pitch, [plate, st, ring, pic]).setSize(G.pitch, G.pitch);
        c.i = i; c.col = col; c.row = row; c.st = st; c.ring = ring; c.ready = !animate; c.shaking = false;
        c.setInteractive();
        c.on('pointerdown', this.press.bind(this, c)); c.on('pointerup', this.release.bind(this, c)); c.on('pointerupoutside', this.cancel.bind(this, c));
        this.cells.push(c);
        if (animate) {   // a ripple from the middle
          c.setScale(0).setAlpha(0);
          var delay = (Math.hypot(col - mx, row - my) * 60 + Math.random() * 30);
          this.tweens.add({ targets: c, scale: { value: 1, duration: 420, ease: 'Back.easeOut' }, alpha: { value: 1, duration: 200 }, delay: delay, onComplete: function (tw, t) { t[0].ready = true; } });
        }
      }
      this.cursor = this.add.image(0, 0, key, 'ring').setScale(sc).setDepth(10).setVisible(false);
    }
    live() { return this.phase === 'play' || this.phase === 'reveal'; }
    press(c) {
      if (!this.live()) return;
      this.down = c; this.kbd = false; this.showCursor(); Kit.snd.play('press');
      if (c.ready && !c.shaking) this.tweens.add({ targets: c, scale: 0.92, duration: 60 });
    }
    release(c) {
      if (this.down !== c) return;
      this.down = null;
      if (c.ready && !c.shaking) this.tweens.add({ targets: c, scale: 1, duration: 140, ease: 'Back.easeOut' });
      if (this.live()) this.choosePic(c);
    }
    cancel(c) { if (this.down === c) { this.down = null; if (c.ready && !c.shaking) this.tweens.add({ targets: c, scale: 1, duration: 140, ease: 'Back.easeOut' }); } }

    /* ---- the keyboard: a ring over the tiles ---- */
    moveCursor(dx, dy) {
      if (!this.live() || !this.cells.length) return;
      var G = this.G;
      if (!this.kbd) { this.kbd = true; this.game.events.emit('se-device', 'keys'); } else {
        var col = clamp(this.cur % G.cols + dx, 0, G.cols - 1), row = clamp(((this.cur / G.cols) | 0) + dy, 0, G.rows - 1);
        this.cur = Math.min(G.n - 1, row * G.cols + col);
      }
      this.showCursor();
    }
    showCursor() {
      if (!this.cursor) return;
      var on = this.kbd && this.live(), c = this.cells[this.cur];
      this.cursor.setVisible(on && !!c);
      if (on && c) this.cursor.setPosition(c.x, c.y);
    }
    keyPick() {
      if (!this.live() || !this.cells.length) return;
      if (!this.kbd) { this.kbd = true; this.game.events.emit('se-device', 'keys'); this.showCursor(); return; }
      var c = this.cells[this.cur]; if (!c) return;
      Kit.snd.play('press'); this.choosePic(c);
    }

    /* ---- a pick ---- */
    choosePic(c) {
      if (!c) return;
      Kit.bridge.answer();
      if (c.i === this.odd) this.right(c); else this.wrong(c);
    }
    right(c) {
      var G = this.G, self = this;
      this.setPhase('out'); this.found++; this.stopClock();
      this.tweens.killTweensOf(c); c.ready = false; c.setDepth(5);
      c.st.setFrame('right').setAlpha(1);
      this.tweens.chain({ targets: c, tweens: [
        { scale: 1.3, duration: 165, ease: 'Sine.easeOut' },
        { scale: 0, alpha: 0, duration: 385, ease: 'Quad.easeIn' }] });
      this.sparks.explode(18, c.x, c.y);
      Kit.snd.play('found'); Kit.buzz(12); Kit.snd.play('fly', { delay: 0.05 });
      this.say(CHEERS[(Math.random() * CHEERS.length) | 0], c.x, c.y - G.pitch * 0.45, 1.6);
      this.cells.forEach(function (o) {
        if (o === c) return;
        self.tweens.killTweensOf(o); o.ready = false;
        self.tweens.add({ targets: o, scale: { value: 0, duration: 350, ease: 'Quad.easeIn' }, alpha: { value: 0, duration: 350 }, delay: 250 + Math.hypot(o.col - c.col, o.row - c.row) * 50 });
      });
      this.game.events.emit('se-found', { x: c.x, y: c.y, slot: this.found - 1, found: this.found, pitch: G.pitch });
      if (this.hintOn) { this.hintOn = false; Se.store.set('hinted', true); }
      this.cursor.setVisible(false);
      this.time.delayedCall(1000, function () { if (self.found >= self.def.rounds) self.clearLevel(); else self.newRound(); });
    }
    wrong(c) {
      if (c.shaking) return;                                     // still wobbling from the last tap: no double cost
      var self = this, G = this.G;
      c.shaking = true; this.tweens.killTweensOf(c); c.setScale(1);
      this.tweens.add({ targets: c, rotation: { from: -0.22, to: 0.22 }, duration: 70, yoyo: true, repeat: 3, ease: 'Sine.easeInOut', onComplete: function () { c.rotation = 0; c.shaking = false; } });
      c.st.setFrame('wrong').setAlpha(1); this.tweens.add({ targets: c.st, alpha: 0, duration: 600, ease: 'Quad.easeIn' });
      Kit.snd.play('bonk'); Kit.buzz(30);
      if (!Kit.reducedMotion) this.cameras.main.shake(130, 0.003);
      if (this.phase === 'reveal') return;                        // the answer is already shown: no more cost
      this.hearts--; this.game.events.emit('se-hearts', this.hearts);
      if (this.def.time && this.timer) this.timer.elapsed = Math.min(this.timer.delay, this.timer.elapsed + 1000);
      this.say(this.hearts > 0 ? 'Look again!' : 'Oh no!', c.x, c.y - G.pitch * 0.3, 1.2);
      if (this.hearts <= 0) this.fail();
    }
    timeUp() {
      if (this.phase !== 'play') return;
      this.stopClock();
      this.hearts--; this.game.events.emit('se-hearts', this.hearts);
      this.game.events.emit('se-time', 0, this.def.time);
      Kit.snd.play('reveal'); Kit.buzz(30);
      if (this.hearts <= 0) { this.fail(); return; }
      this.setPhase('reveal');
      this.showOdd();
      var c = this.cells[this.odd];
      this.say('Here it is!', c.x, c.y - this.G.pitch * 0.55, 2.2);
    }
    // the odd one lit with a pulsing ring
    showOdd() {
      var c = this.cells[this.odd]; if (!c) return;
      c.st.setFrame('right').setAlpha(this.phase === 'fail' ? 1 : 0);
      c.ring.setAlpha(1);
      if (!Kit.reducedMotion) this.tweens.add({ targets: c.ring, alpha: 0.35, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    fail() {
      var self = this;
      this.setPhase('fail'); this.stopClock();
      this.showOdd(); this.cursor.setVisible(false);
      this.time.delayedCall(350, function () { Kit.snd.play('fail'); });
      this.time.delayedCall(1100, function () { self.game.events.emit('se-lost', { level: self.level }); });
    }
    clearLevel() {
      var self = this, stars = Math.max(1, this.hearts), v = this.v;
      this.setPhase('clear');
      Se.progress.finish(this.level, stars);
      Kit.bridge.complete();
      Kit.snd.play('win');
      this.time.addEvent({ delay: 150, repeat: 4, callback: function () {
        self.sparks.explode(22, Phaser.Math.Between(v.l + v.w * 0.2, v.l + v.w * 0.8), Phaser.Math.Between(v.t + v.h * 0.25, v.t + v.h * 0.6));
      } });
      var last = this.level === Se.COUNT, endOfWorld = this.level % 10 === 0;
      this.time.delayedCall(1200, function () { self.game.events.emit('se-won', { level: self.level, stars: stars, last: last, endOfWorld: endOfWorld, rounds: self.def.rounds, world: self.world }); });
    }
    // a word that rises from a tile and goes. One Text object per word, made the first time and kept (re-drawing a Text's
    // canvas on every tap cost about 6 ms of a 9 ms tap on a slow phone)
    say(s, x, y, secs) {
      var k = clamp(this.G.pitch / 260, 0.55, 1.1), t = this.words[s];
      if (!t) t = this.words[s] = Se.txt(this, 0, 0, s, 56, 800, (s === 'Look again!' || s === 'Oh no!') ? '#ffd1dc' : '#fff6c2', { stroke: 'rgba(60,20,80,.7)', strokeThickness: 7 }).setDepth(25);
      if (this.word && this.word !== t) { this.tweens.killTweensOf(this.word); this.word.setVisible(false); }
      this.word = t; this.tweens.killTweensOf(t);
      t.setScale(k).setPosition(x, y).setAlpha(1).setVisible(true);
      this.tweens.add({ targets: t, y: y - 70, duration: secs * 1000, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: t, alpha: 0, duration: 350, delay: secs * 1000 - 350, onComplete: function () { t.setVisible(false); } });
    }
  }

  window.SePlay = Play;
  window.SePick = choose;
})();
