/* Shape Patterns: the Play scene (a little steam train brings a pattern; the child finishes it).
   One train (a round) at a time rolls in from the left with one or two empty wagons. Drag the piece that comes next
   from the tray into the empty wagon, or tap it (it flies there); arrows move a focus ring over the tray and Space or
   Enter puts the piece in. A wrong piece wiggles and hops back; after two misses the right one glows. A finished
   train lights up wagon by wagon and rolls out; stars come from first-try answers. 30 levels in 3 worlds
   (game/levels.js has the rules and the content, unchanged from the old page).
   Engine map (nothing is hand-rolled that Phaser has):
   - game loop, timing: Phaser's; the game sleeps between moves (Kit.play.start rest: true). Nothing runs per frame:
     the train, its wheels, the scenery's parallax and the steam are ONE tween counter (a motion) while the train moves.
   - dragging: setDraggable on each tray piece, drop zones (setCircleDropZone) on the empty wagons, dragenter,
     dragleave, drop and dragend events; the snap, hop, squash, wiggle and fly are tweens (the tap's arc is
     Phaser.Math.Interpolation.QuadraticBezier on a tween counter); timers are this.time.delayedCall.
   - the scenery: TileSprites (tilePositionX) of seamless tiles painted once (art.js); steam and stars: particle emitters.
   - keys: input.keyboard keys. Sounds: Kit.snd (Phaser's sound system underneath).
   What stays game code: the rules of a pattern round and the stars (plain, in levels.js and judge()). The HUD, the
   pause screen, the level map and the end-of-level sheet are in hud.js (scene 'Hud', above this one). */
(function () {
  'use strict';
  var A = window.PatArt, LV = window.PATTERN_LEVELS, COUNT = LV.list.length, key = LV.key;
  var RAIL = A.RAIL, P0 = A.P0, S0 = A.S0, QB = Phaser.Math.Interpolation.QuadraticBezier;
  var FONT = 'ui-rounded, "SF Pro Rounded", Nunito, system-ui, sans-serif';
  var store = Kit.store('kahf-shape-patterns'), progress = Kit.progress(store, COUNT);   // the old page's save: { hinted, stars, current }
  var Q = new URLSearchParams(location.search), DEBUG = Q.has('debug');
  var TRAY_TOP = RAIL + 92, TRAY_K = 0.7;
  window.PatSave = { store: store, progress: progress, COUNT: COUNT };
  var hexn = function (s) { return parseInt(s.slice(1), 16); };

  class Play extends Phaser.Scene {
    constructor() { super('Play'); }
    init(d) { this.startAt = d && d.n; }

    create() {
      var self = this;
      this.phase = 'idle'; this.level = 1; this.world = -1; this.scroll = 0; this.dx = 0;
      this.cells = []; this.choices = []; this.zones = []; this.wheels = []; this.flying = null; this.focus = 0; this.device = 'pointer';
      this.hinted = !!store.get('hinted', false); this.tutorial = false;
      this.input.dragDistanceThreshold = 14;
      A.ui(this);

      // engine emitters, made once and used for every level: steam from the chimney, stars for a right answer
      this.puff = this.add.particles(0, 0, 'ui', { frame: 'ui-puff', emitting: false, frequency: 75, lifespan: 900, speedX: { min: -120, max: -40 }, speedY: { min: -150, max: -90 },
        scale: { start: 0.65, end: 1.2 }, alpha: { start: 0.7, end: 0 } }).setDepth(2);
      this.burst = this.add.particles(0, 0, 'ui', { frame: 'ui-star', emitting: false, lifespan: { min: 500, max: 900 }, speed: { min: 140, max: 320 }, gravityY: 420,
        scale: { start: 0.55, end: 0 }, rotate: { min: 0, max: 360 }, tint: [0xffe9a0, 0xffffff, 0xffd36b, 0xffb45a] }).setDepth(7);
      this.prompt = this.add.text(960, 250, '', { fontFamily: FONT, fontSize: '66px', fontStyle: '800', color: '#fffaf0' }).setOrigin(0.5).setDepth(6).setAlpha(0).setResolution(1.5);
      this.prompt.setShadow(0, 4, 'rgba(20,8,40,.7)', 12);
      this.words = [0, 1, 2].map(function () { return self.add.image(0, 0, 'ui', 'ui-dot').setDepth(8).setVisible(false); });
      this.ring = this.add.image(0, 0, 'ui', 'ui-ring').setTint(0xffe27a).setDepth(6).setVisible(false);

      // input
      var inp = this.input;
      inp.on('drag', function (p, o, x, y) { if (o.ch && o.ch.state === 'drag') { o.x = x; o.y = y; } });
      inp.on('dragstart', function (p, o) { if (o.ch && o.ch.state === 'idle') self.lift(o.ch); });
      inp.on('dragenter', function (p, o, z) { if (o.ch && o.ch.state === 'drag' && !self.cells[z.slot].filled) self.over(o.ch, true); });
      inp.on('dragleave', function (p, o) { if (o.ch && o.ch.state === 'drag') self.over(o.ch, false); });
      // a piece dropped on the other empty wagon is judged there, a miss if wrong, as on the old page
      inp.on('drop', function (p, o, z) { if (o.ch && o.ch.state === 'drag') { if (!self.cells[z.slot].filled) self.send(o.ch, z.slot, 'snap'); else self.home(o.ch, true); } });
      inp.on('dragend', function (p, o, dropped) { if (o.ch && o.ch.state === 'drag' && !dropped) self.home(o.ch, true); });
      var K = this.keys = inp.keyboard.addKeys('LEFT,RIGHT,A,D,SPACE,ENTER,ONE,TWO,THREE,FOUR');
      var mv = function (d) { return function () { if (self.phase === 'pick' && !self.blocked()) self.moveFocus(d); }; };
      K.LEFT.on('down', mv(-1)); K.A.on('down', mv(-1)); K.RIGHT.on('down', mv(1)); K.D.on('down', mv(1));
      var go = function () { if (self.phase === 'pick' && !self.blocked()) self.goFocus(self.focus); };
      K.SPACE.on('down', go); K.ENTER.on('down', go);
      [K.ONE, K.TWO, K.THREE, K.FOUR].forEach(function (k, i) { k.on('down', function () { if (self.phase === 'pick' && !self.blocked()) self.goFocus(i); }); });
      var ev = this.game.events, on = function (n, f) { ev.on(n, f, self); self.events.once('shutdown', function () { ev.off(n, f, self); }); };
      on('sp-device', function (d) { self.device = d; self.showFocus(); self.hintMake(); });

      document.addEventListener('visibilitychange', function () { try { if (document.hidden && window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* none */ } });
      if (!DEBUG && !Kit.praiseClips) setTimeout(function () { var s = document.createElement('script'); s.src = '/KidsGames/js/kit/praise-clips.js'; document.head.appendChild(s); }, 4000);   // (a browser timer: the engine's clock would keep the game awake)
      Kit.play.fit(this, function (v) { self.layout(v); });
      if (A.BAKE) [0, 1, 2].forEach(function (w) { A.world(self, w); A.train(self, w); A.pad(self, w); });   // the bake tool reads every world's pictures
      this.startLevel(this.startAt || (Q.has('level') ? +Q.get('level') : progress.current()));
      if (DEBUG) this.debug();
      if (Kit.load) Kit.load.done();
    }

    blocked() { return this.registry.get('blocked') > 0; }

    // ---------- layout ----------
    layout(v) {
      this.v = v = this.fitTrain(v);
      var ps = Math.max(1, 20 * v.pt / 66);                     // the question is never under 20 points (upright phones)
      this.prompt.setScale(ps).setY(Math.max(250, v.st + 30 + 40 * ps));   // and clear of the top edge on a short screen
      if (this.nearTile) this.nearTile.setPosition(-600, v.b - A.LAY.near.h);
      this.placeBack();
      if (this.cells.length && (this.phase === 'pick')) this.refit();
    }
    // Shape Patterns' own camera: zoom in on the prompt, the train and the tray below it (about 1640 x 900 units round x 960, y 620), so
    // they fill the screen as the old game's did; the view's edges are worked out again for that zoom (the HUD is its own scene)
    fitTrain(v) {
      var gw = this.scale.width, gh = this.scale.height, cam = this.cameras.main, z = Math.min(gw / 1640, gh / 780, (150 / 224) / (this.scale.zoom || 1)), cy = gh > gw ? RAIL - 0.12 * gh / z : 660;   // upright the rail sits about 62% down, as in the old game (on its side y 270..1050: the train and the tray fill a phone, as the old game's did)
      // (never bigger than the old game: a wagon step at most 150 points, so a big screen shows more of the world round it)
      var r = v.z / z, il = (v.sl - v.l) * r, ir = (v.r - v.sr) * r, it = (v.st - v.t) * r, ib = (v.b - v.sb) * r;
      cam.setZoom(z); cam.centerOn(960, cy);
      v.z = z; v.w = gw / z; v.h = gh / z; v.l = 960 - v.w / 2; v.r = 960 + v.w / 2; v.t = cy - v.h / 2; v.b = cy + v.h / 2;
      v.sl = v.l + il; v.sr = v.r - ir; v.st = v.t + it; v.sb = v.b - ib; v.pt = 1 / ((this.scale.zoom || 1) * z);
      return v;
    }
    // pitch of one wagon: as big as the screen allows for this many wagons
    pitchFor(n) { var v = this.v, avail = Math.min(v.sr - v.sl, 2300) - 110; return Math.max(100, Math.min(224, avail / (n + 1.4))); }
    chGeom(k) {
      var v = this.v, wide = (Math.min(v.sr - v.sl, 1900) - 80) / k / 1.22, C = Math.max(150, Math.min(220, v.sb - 24 - TRAY_TOP, wide));
      // upright the old game's answers were big (about 110 points, the room under the train is free): at least 64 points, up to 110
      C = Math.min(Math.max(C, v.h > v.w ? Math.min(110 * v.pt, v.sb - 24 - TRAY_TOP) : 64 * v.pt), wide);
      C = Math.min(C, Math.max(112 * v.pt, 64 * v.pt));     // (an answer is at most 112 points, as in the old game)
      var gap = Math.max(36, C * 0.22);
      return { C: C, gap: gap, y: TRAY_TOP + C / 2, x: function (i) { return 960 + (i - (k - 1) / 2) * (C + gap); } };
    }
    cellX(i) { return this.x0 + i * this.P + this.P / 2; }
    pieceY() { return RAIL + this.G.pieceY; }
    engineX() { return this.x0 + this.n * this.P + this.P * 0.05; }

    // ---------- the world behind (one at a time) ----------
    setWorld(wi) {
      if (this.world === wi) return;
      var old = this.world, W = A.WORLDS[wi], k;
      if (this.bg) this.bg.forEach(function (o) { o.destroy(); });
      if (old >= 0) A.dropWorld(this, old);
      this.world = wi; k = A.world(this, wi); this.TX = A.train(this, wi); A.pad(this, wi);
      Kit.snd.amb('amb-' + wi, { fade: 2 });                   // the world's own air, very low: desert wind, night crickets, the sea
      var c = function (s) { return hexn(s); };
      var top = this.add.rectangle(960, -2000, 7000, 3160, c(W.sky[0])).setDepth(-10), bot = this.add.rectangle(960, 3040, 7000, 3770, c(W.ground[2])).setDepth(-10);
      var sky = this.add.image(A.SKY.x0, A.SKY.y0, k + 'sky').setOrigin(0).setScale(2).setDepth(-9);
      var L = A.LAY, tile = function (n, d) { return this.add.tileSprite(-600, L[n].y0, 3120, L[n].h, k + n).setOrigin(0).setDepth(d); }.bind(this);
      this.far = tile('far', -8); this.mid = tile('mid', -7); this.ground = tile('ground', -6);
      this.nearTile = this.add.tileSprite(-600, (this.v ? this.v.b : 1080) - L.near.h, 3120, L.near.h, k + 'near').setOrigin(0).setDepth(2);
      this.bg = [top, bot, sky, this.far, this.mid, this.ground, this.nearTile];
      this.back = [top, sky, this.far, this.mid].map(function (o) { return { o: o, x: o.x, y: o.y, s: o.scaleX }; });
      this.placeBack();
      this.cameras.main.setBackgroundColor(W.sky[0]);
      this.setScroll(0);
    }
    // upright the old game's scenery filled the sky over the train: what stands above the rail (sky, far hills, the town and
    // palms) is drawn larger about the rail line, up to 1.4 times (more pushes the sun off a phone); the ground, the track and the train keep their size
    placeBack() {
      var v = this.v; if (!this.back || !v) return;
      var bf = v.h > v.w ? Phaser.Math.Clamp((0.37 * v.h) / (RAIL - A.LAY.mid.y0), 1, 1.4) : 1;
      this.back.forEach(function (b) { b.o.setScale(b.s * bf).setPosition(960 + (b.x - 960) * bf, RAIL + (b.y - RAIL) * bf); });
    }
    setScroll(sc) {
      this.scroll = sc;
      this.far.tilePositionX = sc * 0.12; this.mid.tilePositionX = sc * 0.4; this.ground.tilePositionX = sc; this.nearTile.tilePositionX = sc * 1.25;
    }

    // ---------- levels and rounds ----------
    startLevel(n) {
      this.clearAll();
      this.level = Phaser.Math.Clamp(n | 0 || 1, 1, COUNT); this.progress = progress;
      progress.setCurrent(this.level);
      this.rounds = LV.makeLevel(this.level);
      this.ri = 0; this.slotsTotal = 0; this.slotsMissed = 0; this.lastPrompt = '';
      var self = this, w = LV.worldOf(this.level), tok = this.tok = (this.tok || 0) + 1; this.rounds.forEach(function (r) { self.slotsTotal += r.blanks.length; });
      this.tutorial = this.level === 1 && !this.hinted;
      this.phase = 'idle';
      // the world's baked pictures are fetched when it starts (a moment on the first level of a world), then the level begins
      Kit.play.artNeed(this, new RegExp('^w' + w + '-'), function () {
        if (tok !== self.tok) return;
        self.setWorld(w); self.banner();
        self.game.events.emit('sp-level', { level: self.level, world: self.world, rounds: self.rounds.length });
        self.startRound();
      });
    }
    clearAll() {
      this.tweens.killAll(); this.time.removeAllEvents();
      if (this.puff) this.puff.stop();
      if (this.trainC) { this.trainC.destroy(true); this.trainC = null; }
      this.clearChoices(true); this.hintClear(); this.flying = null; this.cells = [];
      if (this.words) this.words.forEach(function (w) { w.setVisible(false); });
      this.prompt.setAlpha(0);
      var self = this; this.textures.getTextureKeys().forEach(function (k) { if (k.indexOf('p|') === 0) self.textures.remove(k); });
    }
    banner() {
      var W = A.WORLDS[this.world], self = this, s = { fontFamily: FONT, fontStyle: '900', color: '#fffaf0' };
      var t1 = this.add.text(0, -92, W.name.toUpperCase(), { fontFamily: FONT, fontStyle: '800', fontSize: '40px', color: W.color }).setOrigin(0.5);
      var t2 = this.add.text(0, 0, 'Level ' + this.level, Object.assign({ fontSize: '116px' }, s)).setOrigin(0.5);
      var t3 = this.add.text(0, 92, LV.list[this.level - 1].name, { fontFamily: FONT, fontStyle: '800', fontSize: '52px', color: '#fffaf0' }).setOrigin(0.5);
      [t1, t2, t3].forEach(function (t) { t.setResolution(1.5).setShadow(0, 4, 'rgba(10,6,30,.75)', 14); });
      var b = this.bannerObj = this.add.container(960, 245, [t1, t2, t3]).setDepth(7).setAlpha(0);
      this.tweens.chain({ targets: b, tweens: [{ alpha: 1, duration: 300 }, { alpha: 1, duration: 1000 }, { alpha: 0, duration: 450, onComplete: function () { b.destroy(true); if (self.bannerObj === b) self.bannerObj = null; } }] });
    }

    startRound() {
      var round = this.round = this.rounds[this.ri], self = this;
      this.n = round.cells.length;
      this.cells = round.cells.map(function (p, i) { return { p: p, blank: p === null, filled: false, missed: false, alt: i % 2 }; });
      this.blankMisses = 0; this.phase = 'arrive';
      this.buildTrain();
      // paint the tray's pictures one by one while the train rolls in, not all in the frame it stops
      var todo = [], seen = {};
      round.blanks.forEach(function (b) { round.choices[b].forEach(function (p) { var k = A.pieceKey(p); if (!seen[k] && !self.textures.exists(k)) { seen[k] = 1; todo.push(p); } }); });
      todo.forEach(function (p, i) { self.time.delayedCall(180 + i * 140, function () { A.piece(self, p); }); });
      var from = this.v.l - (this.x0 + this.width) - 80;
      this.game.events.emit('sp-round', { ri: this.ri, done: false });
      Kit.snd.play('arrive');
      this.motion(from, 0, 1250, 'Cubic.easeOut', 650, function () { self.phase = 'pick'; self.arrived(); });
    }
    arrived() {
      this.puff.explode(3, this.dx + this.chimX(), RAIL + this.G.bodyBottom - this.P * 0.84);
      this.setChoices(this.currentBlank());
      var t = this.promptText(); this.prompt.setText(t);
      this.tweens.add({ targets: this.prompt, alpha: 1, duration: 350, delay: this.bannerObj ? 500 : 0 });
      if (t !== this.lastPrompt || this.ri === 0) this.say(t);
      this.lastPrompt = t; this.hintMake();
    }
    promptText() { var r = this.round; return r.prompt === 'missing' ? "What's missing?" : r.blanks.length > 1 ? 'What comes next? And next?' : 'What comes next?'; }
    currentBlank() { var r = this.round; if (!r) return -1; for (var i = 0; i < r.blanks.length; i++) if (!this.cells[r.blanks[i]].filled) return r.blanks[i]; return -1; }
    chimX() { return this.engineX() + this.G.engineW - this.P * 0.3; }

    // ---------- the train ----------
    buildTrain() {
      if (this.trainC) this.trainC.destroy(true);
      var n = this.n, P = this.P = this.pitchFor(n), G = this.G = A.trainGeom(P), k = P / P0, TX = this.TX, self = this;
      this.width = n * P + P * 0.05 + G.engineW; this.x0 = 960 - this.width / 2;
      var kids = [], add = function (o) { kids.push(o); return o; };
      var wag = this.textures.get(TX.wag0).getSourceImage(), pw = TX.wagPad;
      this.wheels = [];
      add(this.add.rectangle(this.x0 + (n * P) / 2, RAIL + G.bodyBottom - P * 0.015, n * P, P * 0.04, 0x2a1d2a));
      var wheel = function (x, r) { var w = add(self.add.image(x, RAIL - r, TX.wheel).setScale(r / 60)); self.wheels.push({ img: w, r: r }); return w; };
      for (var i = 0; i < n; i++) { wheel(this.cellX(i) - P * 0.24, G.wr); wheel(this.cellX(i) + P * 0.24, G.wr); }
      var py = this.pieceY(), ps = G.ps;
      this.cellObjs = [];
      this.cells.forEach(function (c, i) {
        var x = self.cellX(i), o = {};
        o.wagon = add(self.add.image(x, RAIL, i % 2 ? TX.wag1 : TX.wag0).setOrigin((pw + P0 / 2) / (P0 + 2 * pw), (pw + P0 * 0.6) / (P0 * 0.6 + 2 * pw)).setScale(k));
        o.flash = add(self.add.image(x, RAIL + (G.bodyTop + G.bodyBottom) / 2, 'ui', 'ui-lv').setTint(0xfff6c8).setAlpha(0).setScale(G.bodyW / 140, (G.bodyBottom - G.bodyTop) / 140));
        o.shadow = add(self.add.image(x, RAIL + G.bodyTop + 1, 'ui', 'ui-shadow').setScale(ps * 0.7 / 160).setVisible(!c.blank));
        if (c.p && (!c.blank || c.filled)) o.img = add(self.add.image(x, py, A.piece(self, c.p)).setScale(ps / S0).setAngle((c.p.r || 0) * 90));
        else { o.dash = add(self.add.image(x, py, 'ui', 'ui-dash').setScale(ps * 0.9 / 200)); o.q = add(self.add.image(x, py + ps * 0.02, 'ui', 'ui-q').setScale(ps * 0.6 / 100).setTint(0xfff6d8)); }
        self.cellObjs.push(o);
      });
      var ex = this.engineX(), ew = A.engineWheels(P), ep = TX.engPad;
      this.engWheels = ew.map(function (w) { return wheel(ex + w[0], w[1]); });
      add(this.add.image(ex, RAIL, TX.eng).setOrigin(ep / (G.engineW / P * P0 + 2 * ep), (ep + P0 * 1.25) / (P0 * 1.25 + 2 * ep)).setScale(k));
      this.rod = add(this.add.rectangle(ex + ew[1][0], RAIL - ew[1][1], ew[2][0] - ew[1][0], Math.max(4, P * 0.03), 0xd9d2c8));
      this.rodBase = { x: ex + (ew[1][0] + ew[2][0]) / 2, y: RAIL - ew[1][1], r: ew[1][1] };
      this.trainC = this.add.container(this.dx, 0, kids).setDepth(0);
      // empty wagons take drops: a circle zone on each
      this.zones.forEach(function (z) { z.destroy(); }); this.zones = [];
      this.round.blanks.forEach(function (b) {
        var r = Math.max(P * 0.75, 100), z = self.add.zone(self.cellX(b), py, 2, 2).setOrigin(0).setCircleDropZone(r);   // (the engine centres the circle on the zone's own corner)
         z.slot = b; z.on('pointerdown', function () { if (self.phase === 'pick' && !self.blocked() && !self.flying) { Kit.snd.play('tap', { vol: 0.7 }); self.say(self.promptText()); } }); self.zones.push(z);
      });
    }
    // after a turn of the phone: lay the same round out again for the new size
    refit() {
      var ch = this.choices.map(function (c) { return c.state; });
      var dx = this.dx; this.buildTrain(); this.dx = dx; this.trainC.x = dx;
      var b = this.currentBlank(); this.clearChoices(true);
      if (b >= 0) { this.setChoices(b, ch); }
      this.markBlank();
    }
    markBlank() {
      var b = this.phase === 'pick' ? this.currentBlank() : -1, self = this;
      this.cellObjs.forEach(function (o, i) {
        if (!o.dash) return;
        var cur = i === b; o.dash.setAlpha(cur ? 1 : 0.55); o.q.setAlpha(cur ? 1 : 0.6);
        if (cur) self.tweens.add({ targets: [o.dash, o.q], scale: '*=1.07', duration: 420, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
      });
    }

    // One motion of the train: dx from -> to, the scenery slides and the wheels turn by the same eased progress.
    motion(from, to, ms, ease, span, done) {
      var self = this, sc0 = this.scroll, st = this.mot = { p: 0 }, G = this.G;
      this.puff.start();
      this.tweens.addCounter({ from: 0, to: 1, duration: ms, ease: ease, onUpdate: function (tw) {
        var p = tw.getValue(), dx = from + (to - from) * p, sc = sc0 + span * p;
        self.dx = dx; self.trainC.x = dx; self.setScroll(sc);
        var d = dx + sc;
        self.wheels.forEach(function (w) { w.img.rotation = d / w.r; });
        var a = d / self.rodBase.r, r = self.rodBase.r * 0.5;
        self.rod.setPosition(self.rodBase.x + Math.cos(a) * r, self.rodBase.y + Math.sin(a) * r);
        self.puff.setPosition(dx + self.chimX(), RAIL + G.bodyBottom - self.P * 0.84);
      }, onComplete: function () { self.puff.stop(); done(); } });
    }

    // ---------- the tray ----------
    clearChoices(now) {
      var list = this.choices; this.choices = []; this.ring.setVisible(false);
      list.forEach(function (c) {
        if (now) { c.pad.destroy(); c.pc.destroy(); c.glow.destroy(); return; }
        c.pc.disableInteractive();
        this.tweens.add({ targets: [c.pad, c.pc, c.glow], scale: 0, alpha: 0, duration: 200, ease: 'Back.easeIn', onComplete: function () { c.pad.destroy(); c.pc.destroy(); c.glow.destroy(); } });
      }, this);
    }
    setChoices(b, states) {
      var list = this.round.choices[b], k = list.length, g = this.chGeom(k), self = this, ans = key(this.round.answers[b]);
      this.G2 = g; this.blankMisses = states ? this.blankMisses : 0; this.focus = 0;
      this.choices = list.map(function (p, i) {
        var x = g.x(i), y = g.y, ps = g.C * TRAY_K, st = states && states[i] === 'used' ? 'used' : 'idle';
        var pad = self.add.image(x, y, A.pad(self, self.world)).setScale(g.C / 300).setDepth(3), glow = self.add.image(x, y, 'ui', 'ui-glow').setScale(g.C / 300 * 1.5).setDepth(3).setAlpha(0);
        var pc = self.add.image(x, y - g.C * 0.02, A.piece(self, p)).setScale(ps / S0).setAngle((p.r || 0) * 90).setDepth(4);
        var rad = (g.C / 2 + 14) / (ps / S0), f = pc.frame;
        pc.setInteractive(new Phaser.Geom.Circle(f.width / 2, f.height / 2, rad), Phaser.Geom.Circle.Contains);
        self.input.setDraggable(pc);
        var ch = { i: i, p: p, k: key(p), pad: pad, pc: pc, glow: glow, state: st, x: x, y: y - g.C * 0.02, s: ps / S0, ans: key(p) === ans };
        pc.ch = ch;
        pc.on('pointerdown', function () { ch.dragged = false; self.press(ch); });
        pc.on('dragstart', function () { ch.dragged = true; });
        pc.on('pointerup', function () { if (ch.state === 'idle') { self.tweens.add({ targets: pc, scale: ch.s, duration: 90 }); if (!ch.dragged) self.tapGo(ch); } });
        if (st === 'used') { pad.setAlpha(0.45); pc.setAlpha(0.32); }
        else if (!states) { pad.setScale(0); pc.setScale(0); self.tweens.add({ targets: pad, scale: g.C / 300, duration: 380, delay: i * 90, ease: 'Back.easeOut' }); self.tweens.add({ targets: pc, scale: ch.s, duration: 380, delay: i * 90, ease: 'Back.easeOut' }); }
        return ch;
      });
      this.markBlank(); this.showFocus();
    }
    press(ch) {
      if (this.phase !== 'pick' || this.flying || this.blocked()) return;
      if (ch.state === 'used') { Kit.snd.play('tap', { vol: 0.8 }); this.shake(ch); return; }
      if (ch.state !== 'idle') return;
      Kit.snd.play('pick'); this.tweens.add({ targets: ch.pc, scale: ch.s * 0.92, duration: 80 });
    }
    shake(ch) { this.tweens.add({ targets: [ch.pad, ch.pc], angle: { from: -7, to: 7 }, duration: 55, yoyo: true, repeat: 2, onComplete: function () { ch.pad.angle = 0; ch.pc.angle = (ch.p.r || 0) * 90; } }); }
    lift(ch) {
      ch.state = 'drag'; ch.pc.setDepth(9); this.tweens.killTweensOf(ch.pc);
      this.tweens.add({ targets: ch.pc, scale: ch.s * 1.12, duration: 110, ease: 'Back.easeOut' });
      this.hintClear(); this.tutorialQuiet = true;
    }
    over(ch, on) {
      var s = on ? this.G.ps / S0 * 1.1 : ch.s * 1.12;
      this.tweens.killTweensOf(ch.pc); this.tweens.add({ targets: ch.pc, scale: s, duration: 120, ease: 'Sine.easeOut' });
    }
    home(ch, miss) {
      if (miss) Kit.snd.play('tap', { vol: 0.8 });
      ch.state = 'idle'; ch.pc.setDepth(4); this.tweens.killTweensOf(ch.pc);
      this.tweens.add({ targets: ch.pc, x: ch.x, y: ch.y, scale: ch.s, angle: (ch.p.r || 0) * 90, duration: 280, ease: 'Sine.easeInOut' });
    }
    tapGo(ch) { if (ch.state === 'idle' && this.phase === 'pick' && !this.flying && !this.blocked()) { var b = this.currentBlank(); if (b >= 0) this.send(ch, b, 'go'); } }

    // keyboard: a ring on the tray; Space or Enter puts the focused piece into the empty wagon
    moveFocus(d) { var n = this.choices.length; if (!n) return; this.focus = (this.focus + d + n) % n; Kit.snd.play('tap', { vol: 0.7 }); this.showFocus(); }
    goFocus(i) { var ch = this.choices[i]; if (!ch) return; this.focus = i; this.showFocus(); if (ch.state === 'used') { Kit.snd.play('tap', { vol: 0.8 }); this.shake(ch); return; } this.press(ch); this.tapGo(ch); }
    showFocus() {
      var ch = this.choices[this.focus], on = ch && this.device === 'keys' && this.phase === 'pick';
      this.ring.setVisible(!!on); if (on) this.ring.setPosition(ch.x, ch.pad.y).setScale(this.G2.C / 190);
    }

    // A piece leaves the tray for slot s (snap: dropped on it; go: tapped). It is judged when it lands.
    send(ch, s, how) {
      if (this.flying) return;
      this.flying = ch; ch.state = 'out'; ch.slot = s; Kit.bridge.answer();
      if (this.tutorial) { this.tutorial = false; this.hintClear(); }
      var self = this, pc = ch.pc, sx = pc.x, sy = pc.y, tx = this.cellX(s), ty = this.pieceY(), s0 = pc.scale, s1 = this.G.ps / S0, r0 = (ch.p.r || 0) * Math.PI / 2;
      pc.setDepth(9); this.tweens.killTweensOf(pc); this.ring.setVisible(false);
      if (how === 'snap') {
        this.tweens.add({ targets: pc, x: tx, y: ty, scale: s1, duration: 130, ease: 'Cubic.easeOut', onComplete: function () { self.judge(ch); } });
      } else {
        Kit.snd.play('swoosh');
        var cx = (sx + tx) / 2, cy = Math.min(sy, ty) - Math.max(70, Math.abs(sx - tx) * 0.25);
        this.tweens.addCounter({ from: 0, to: 1, duration: 420, ease: 'Sine.easeInOut', onUpdate: function (tw) {
          var u = tw.getValue();
          pc.setPosition(QB(u, sx, cx, tx), QB(u, sy, cy, ty)); pc.setScale(s0 + (s1 - s0) * u); pc.rotation = r0 + Math.sin(u * Math.PI) * 0.25;
        }, onComplete: function () { pc.rotation = r0; self.judge(ch); } });
      }
    }
    judge(ch) {
      var s = ch.slot, cell = this.cells[s], o = this.cellObjs[s], ok = ch.k === key(this.round.answers[s]), self = this, P = this.P;
      if (ok) {
        cell.p = ch.p; cell.filled = true;
        if (cell.missed) this.slotsMissed++;
        var x = this.cellX(s), y = this.pieceY();
        o.dash.destroy(); o.q.destroy(); o.dash = o.q = null; o.shadow.setVisible(true);
        ch.pc.destroy(); ch.pad.destroy(); ch.glow.destroy();
        o.img = this.add.image(x, y, A.piece(this, ch.p)).setScale(this.G.ps / S0 * 1.22, this.G.ps / S0 * 0.78).setAngle((ch.p.r || 0) * 90);
        this.trainC.add(o.img);
        this.tweens.add({ targets: o.img, scaleX: this.G.ps / S0, scaleY: this.G.ps / S0, duration: 300, ease: 'Back.easeOut' });
        Kit.snd.play('snap'); Kit.buzz(12);
        this.burst.explode(14, x + this.dx, y);
        var words = cell.missed ? ['Yes!', 'Got it!'] : ['Yes!', 'Great!', 'Super!', 'Well done!', 'Nice!'];
        this.fxText(x + this.dx, y - P * 0.7, words[(Math.random() * words.length) | 0], Math.max(46, Math.min(72, P * 0.34)), 900);
        this.flying = null; ch.state = 'gone';
        if (!this.hinted) { this.hinted = true; store.set('hinted', true); }
        this.choices.splice(this.choices.indexOf(ch), 1);
        var next = this.currentBlank();
        if (next >= 0) {
          this.clearChoices(); this.markBlank();
          this.time.delayedCall(300, function () { self.setChoices(next); });
        } else { this.clearChoices(); this.time.delayedCall(400, function () { self.lightUp(); }); }
      } else {
        cell.missed = true; this.blankMisses++;
        Kit.snd.play('wobble'); Kit.buzz(25);
        var pc = ch.pc, bx = pc.x;
        this.tweens.add({ targets: pc, x: bx + 14, duration: 55, yoyo: true, repeat: 3, ease: 'Sine.easeInOut', onComplete: function () {
          pc.x = bx; ch.state = 'used';
          self.tweens.add({ targets: pc, x: ch.x, y: ch.y, scale: ch.s, alpha: 0.32, duration: 340, ease: 'Sine.easeInOut', onComplete: function () { pc.setDepth(4); self.flying = null; } });
          self.tweens.add({ targets: ch.pad, alpha: 0.45, duration: 340 });
          if (self.blankMisses >= 2) self.choices.forEach(function (c) { if (c.ans && c.state === 'idle') { self.tweens.add({ targets: c.glow, alpha: 0.9, duration: 350, yoyo: true, repeat: 5 }); } });
        } });
      }
    }
    // praise words: pictures painted once (art.js), three images used again
    fxText(x, y, str, size, ms) {
      var t = this.words.filter(function (w) { return !w.visible; })[0]; if (!t) return;
      t.setTexture('ui', A.word(this, str)).setScale(size / A.WORD_PX * 0.4).setPosition(x, y).setAlpha(1).setVisible(true);
      this.tweens.add({ targets: t, scale: size / A.WORD_PX, duration: 220, ease: 'Back.easeOut' });
      this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: ms, delay: 200, onComplete: function () { t.setVisible(false); } });
    }

    // ---------- round end, level end ----------
    lightUp() {
      var self = this, n = this.n;
      this.phase = 'lightup'; this.game.events.emit('sp-round', { ri: this.ri, done: true });
      this.tweens.add({ targets: this.prompt, alpha: 0, duration: 250 });
      this.cellObjs.forEach(function (o, i) {
        self.time.delayedCall(i * 120, function () {
          Kit.snd.play('wagon');
          self.tweens.add({ targets: o.flash, alpha: { from: 0.55, to: 0 }, duration: 450 });
          self.tweens.add({ targets: o.img, y: o.img.y - self.P * 0.28, duration: 190, yoyo: true, ease: 'Sine.easeOut' });
          self.burst.explode(5, self.cellX(i) + self.dx, self.pieceY());
        });
      });
      this.time.delayedCall(n * 120 + 450, function () {
        if (self.ri + 1 < self.rounds.length) self.depart(function () { self.ri++; self.startRound(); });
        else self.levelComplete();
      });
    }
    depart(after) {
      this.phase = 'depart'; Kit.snd.play('depart');
      var to = this.v.r - this.x0 + 80;
      this.motion(this.dx, to, 1150, 'Cubic.easeIn', 800, after);
    }
    levelComplete() {
      var self = this, tol = Math.max(1, Math.floor(this.slotsTotal * 0.25));
      var stars = this.slotsMissed === 0 ? 3 : this.slotsMissed <= tol ? 2 : 1, level = this.level;
      progress.finish(level, stars); Kit.bridge.complete();
      this.phase = 'done'; Kit.snd.play('win'); Kit.buzz(30);
      this.time.delayedCall(450, function () { self.praise(stars === 3 ? 'mashaallah' : 'ahsant'); });
      for (var i = 0; i < 6; i++) this.time.delayedCall(i * 150, function () { self.burst.explode(22, Phaser.Math.Between(300, 1620), Phaser.Math.Between(150, 520)); });
      this.fxText(960, 330, stars === 3 ? 'Perfect!' : 'Well done!', 120, 1500);
      this.depart(function () {});
      this.time.delayedCall(1500, function () {
        self.game.events.emit('sp-won', { level: level, stars: stars, right: self.slotsTotal - self.slotsMissed, total: self.slotsTotal, last: level === COUNT, endOfWorld: level % 10 === 0, world: self.world });
      });
    }

    // ---------- voice (as the old page: the device's own voice for the prompt, recorded Arabic praise) ----------
    // The engine has no text to speech, so the prompt is a few lines of the browser's own; silent when muted, hidden or in ?debug.
    say(text) {
      try {
        var s = window.speechSynthesis;
        if (!s || Kit.snd.muted || document.hidden || DEBUG) return;
        s.cancel();
        var u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.95; s.speak(u);
      } catch (e) { /* no voice: the prompt is on screen in words */ }
    }
    // an Arabic praise: a recorded voice (js/kit/praise-clips.js, fetched a few seconds after the page starts), through the
    // engine's voice so the effects dip under it; silent when muted
    praise(key) {
      if (DEBUG) return;
      var d = Kit.praiseClips && Kit.praiseClips[key];
      if (d) Kit.snd.voice('data:audio/mpeg;base64,' + d, { vol: 0.9 });
    }

    // ---------- the hint: level 1 teaches the move until the child has made one ----------
    hintClear() { if (this.hintObjs) { this.hintObjs.forEach(function (o) { o.destroy(); }); this.hintObjs = null; } }
    hintMake() {
      this.hintClear();
      if (!this.tutorial || this.phase !== 'pick' || !this.choices.length) return;
      var self = this, b = this.currentBlank(), ch = null;
      this.choices.forEach(function (c) { if (c.ans) ch = c; });
      if (!ch) return;
      if (this.device === 'keys') {
        var t = this.add.text(960, this.G2.y - this.G2.C / 2 - 40, 'Arrow keys choose  ·  Space puts it in', { fontFamily: FONT, fontSize: '46px', fontStyle: '800', color: '#fffaf0', backgroundColor: 'rgba(22,16,44,.8)', padding: { x: 26, y: 12 } }).setOrigin(0.5, 1).setDepth(8).setResolution(1.5);
        this.hintObjs = [t]; return;
      }
      var hand = this.add.image(ch.x + 40, ch.y + 60, 'ui', 'ic-hand').setScale(2.1).setDepth(10).setAlpha(0), tx = this.cellX(b), ty = this.pieceY();
      this.hintObjs = [hand];
      this.tweens.chain({ targets: hand, loop: 1, tweens: [
        { x: ch.x + 30, y: ch.y + 40, alpha: 1, duration: 300, delay: 600 },
        { scale: 1.8, duration: 140, yoyo: true },
        { x: tx + 30, y: ty + 40, duration: 950, ease: 'Sine.easeInOut' },
        { alpha: 0, duration: 260, delay: 250 },
        { x: ch.x + 70, y: ch.y + 90, duration: 1 }] });
    }

    // ---------- test hook (?debug) ----------
    debug() {
      var self = this;
      window.SPT = { scene: this,
        get: function () { var b = self.currentBlank(); return { phase: self.phase, level: self.level, ri: self.ri, rounds: self.rounds.length, blank: b, missed: self.slotsMissed, total: self.slotsTotal, choices: self.choices.map(function (c) { return c.k + ':' + c.state; }), answer: b >= 0 ? key(self.round.answers[b]) : null, stars: progress.stars(self.level), dx: self.dx }; },
        correct: function () { var r = -1; self.choices.forEach(function (c, i) { if (c.ans) r = i; }); return r; },
        wrong: function () { var r = -1; self.choices.forEach(function (c, i) { if (!c.ans && c.state === 'idle') r = i; }); return r; },
        tap: function (i) { self.goFocus(i); },
        pos: function (i) { var c = self.choices[i]; var cam = self.cameras.main; return { x: (c.pc.x - cam.worldView.x) * cam.zoom / Kit.play.dpr(), y: (c.pc.y - cam.worldView.y) * cam.zoom / Kit.play.dpr() }; },
        slot: function () { var b = self.currentBlank(), cam = self.cameras.main; return { x: (self.cellX(b) + self.dx - cam.worldView.x) * cam.zoom / Kit.play.dpr(), y: (self.pieceY() - cam.worldView.y) * cam.zoom / Kit.play.dpr() }; }
      };
    }
  }
  window.PatPlay = Play;
})();
