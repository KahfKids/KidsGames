/* Tower Blocks: tower.js, scene 'Tower': the world and the rules.
   A block slides back and forth above the tower; tap anywhere to drop it. The part that hangs over the edge is sliced
   off and falls; the rest becomes the new top. Land it flush for a "Perfect!" and the tower grows back. 20 levels in 4
   worlds (stack N blocks) plus an endless Free Build with a saved best. Rules, numbers and words are the old game's.

   Engine map (Phaser 4.2.1) - what the old Canvas2D page wrote by hand, and what does it now:
   - loop, timers, delays            -> the scene's update, this.time.delayedCall
   - the sliding block               -> one tween on its offset (linear, yoyo, forever); the hover bob and the fall are tweens
   - the cut-off piece falling       -> Arcade physics: a body with gravity and an angular velocity, an overlap with the
                                        courtyard floor (a static zone) where it crumbles
   - camera rise, level-end zoom out -> the camera: startFollow with a lerp on the top of the tower, then pan + zoomTo
   - squash, grow, ring, fades       -> tweens (Back / Expo / Sine eases)
   - dust, sparks, crumble           -> particle emitters
   - block faces with a tile pattern -> TileSprite (the engine repeats the tile; tilePosition keeps a sliced block's pattern
                                        where it was); the isometric view is a Container whose rotation and scale, with the
                                        TileSprite's own rotation, make the exact 2:1 skew (a singular-value split of the
                                        matrix, svd() below), because the engine has no skew on game objects
   - night on the blocks             -> tint on each face (multiply)
   - sky, clouds, stars, skyline     -> scene 'Sky' (sky.js); the interface -> scene 'Hud' (hud.js)
   Kept as game code because the engine has no such feature: the stacking rule (overlap, the safety ledge, perfect snap,
   grow, hearts, stars) and the level and Free Build rules. World units: a block starts 100 wide and 100 deep, a layer is
   26 tall; y points up. Screen: X = x - z, Y = (x + z) / 2 - y (so one world unit is one unit in this scene). */
(function () {
  'use strict';
  var A = window.TBArt, LV = window.TOWER_LEVELS, K = window.Kit;
  var W0 = 100, LH = 26, BASE_Y = 60, HOVER = 34, FALL_MS = 110, SKY_SPAN = 900, FREE_SPAN = 800, GRAV = 1100, GROUND_Y = 40;
  var PRAISES = ['mashaallah', 'ahsant', 'barakallah', 'alhamdulillah', 'subhanallah'];
  var SHADE_R = [0.75, 0.69, 0.84];                    // the right face is in shade (the old purple overlay, as a multiply)

  // matrix [[a, b], [c, d]] as R(r1) * diag(sx, sy) * R(r2): a Container (r1, sx, sy) holding a child turned by r2
  function svd(a, b, c, d) {
    var E = (a + d) / 2, F = (a - d) / 2, G = (c + b) / 2, H = (c - b) / 2, Q = Math.hypot(E, H), R = Math.hypot(F, G), a1 = Math.atan2(G, F), a2 = Math.atan2(H, E);
    return { r1: (a2 + a1) / 2, sx: Q + R, sy: Q - R, r2: (a2 - a1) / 2 };
  }
  var M_L = svd(1, 0, 0.5, 1), M_R = svd(-1, 0, 0.5, 1), M_T = svd(1, -1, 0.5, 0.5);   // left face, right face, top face: (u, v) -> screen
  function night3(n, k, base) {                       // a multiply tint for night (the old overlay of dark blue at alpha k * n)
    var a = k * n, b = base || [1, 1, 1];
    return ((b[0] * (1 - a * 0.92) * 255) << 16) | ((b[1] * (1 - a * 0.9) * 255) << 8) | (b[2] * (1 - a * 0.72) * 255);
  }
  var dimsCache = {};
  function dims(scene, key) { return dimsCache[key] || (dimsCache[key] = scene.textures.get(key).getSourceImage()); }

  // a face: a TileSprite in a Container, set up so the tile's (u, v) lands on the screen through matrix M
  function face(scene, M, key) {
    var t = scene.add.tileSprite(0, 0, 16, 16, key).setOrigin(0, 0).setRotation(M.r2);
    var c = scene.add.container(0, 0, [t]).setRotation(M.r1).setScale(M.sx, M.sy);
    return { c: c, t: t };
  }
  // a flat coloured rectangle lying on a top face (shadows, the perfect glow, ripples)
  function flat(scene, depth, color) {
    var i = scene.add.image(0, 0, 'fx', 'px').setOrigin(0, 0).setRotation(M_T.r2).setTint(color);
    var c = scene.add.container(0, 0, [i]).setRotation(M_T.r1).setScale(M_T.sx, M_T.sy).setDepth(depth).setVisible(false);
    c.at = function (x0, z0, w, d, y) { c.setPosition(x0 - z0, (x0 + z0) / 2 - y); i.setDisplaySize(w, d); return c; };
    return c;
  }

  // ---------- a block: three faces and the numbers they come from ----------
  class Block {
    constructor(scene) {
      this.s = scene;
      this.L = face(scene, M_L, 'sd-tq-26'); this.R = face(scene, M_R, 'sd-tq-26'); this.T = face(scene, M_T, 'tp-tq');
      this.c = scene.add.container(0, 0, [this.L.c, this.R.c, this.T.c]);
      this.dx = 0; this.dy = 0; this.ox = 0; this.oy = 0; this.night = -1; this.phys = false;
    }
    // e: x0, x1, z0, z1 (extents), tx, tz (where its pattern starts), y0, h, pal.  ah: height of the point it turns about
    set(e, ah) {
      var s = this.s, P = A.P, pal = e.pal, H = e.h, x0 = e.x0, x1 = e.x1, z0 = e.z0, z1 = e.z1, y0 = e.y0;
      this.x0 = x0; this.x1 = x1; this.z0 = z0; this.z1 = z1; this.tx = e.tx; this.tz = e.tz; this.y0 = y0; this.h = H; this.pal = pal;
      if (ah !== undefined) this.ah = ah;
      var wx = x1 - x0, wz = z1 - z0, hh = H + 0.5, sk = A.sideKey(pal, H), tk = A.topKey(pal), ds = dims(s, sk), dt = dims(s, tk);
      this.ox = (x0 + x1) / 2 - (z0 + z1) / 2; this.oy = ((x0 + x1) / 2 + (z0 + z1) / 2) / 2 - (y0 + this.ah);
      this.place();
      var sx = P / ds.width, sy = hh / ds.height;
      // left face (the plane z = z1), u along x
      this.L.c.setPosition(x0 - z1 - this.ox, (x0 + z1) / 2 - (y0 + H) - this.oy);
      this.L.t.setTexture(sk).setSize(Math.max(0.1, wx), hh).setTileScale(sx, sy).setTilePosition(-(this.tx - x0) / sx, 0);
      // right face (the plane x = x1), u along z, starting at the back
      this.R.c.setPosition(x1 - z0 - this.ox, (x1 + z0) / 2 - (y0 + H) - this.oy);
      this.R.t.setTexture(sk).setSize(Math.max(0.1, wz), hh).setTileScale(sx, sy).setTilePosition(-(this.tz - z0) / sx, 0);
      // top face
      var tx2 = P / dt.width, ty2 = P / dt.height;
      this.T.c.setPosition(x0 - z0 - this.ox, (x0 + z0) / 2 - (y0 + H) - this.oy);
      this.T.t.setTexture(tk).setSize(Math.max(0.1, wx), Math.max(0.1, wz)).setTileScale(tx2, ty2).setTilePosition(-(this.tx - x0) / tx2, -(this.tz - z0) / ty2);
      this.tint(this.s.night);
      return this;
    }
    place() { this.c.setPosition(this.ox + this.dx, this.oy + this.dy); }
    tint(n) {
      if (n === this.night) return; this.night = n;
      this.L.t.setTint(night3(n, 0.3)); this.R.t.setTint(night3(n, 0.25, SHADE_R)); this.T.t.setTint(night3(n, 0.22));
    }
  }

  class Tower extends Phaser.Scene {
    constructor() { super({ key: 'Tower', physics: { default: 'arcade', arcade: { gravity: { y: GRAV }, fixedStep: false } } }); }   // bodies move every drawn frame (no 60 Hz step: jitter on 120 Hz)
    init(d) { this.mode = d.mode || 'level'; this.level = d.level || 1; }

    create() {
      var self = this, SV = window.TBSave;
      this.store = SV.store; this.progress = SV.progress;
      this.cfg = this.mode === 'free' ? LV.free(0) : LV.list[this.level - 1];
      this.world = this.cfg.world;
      this.state = 'play'; this.layers = []; this.pieces = []; this.pool = []; this.m = null; this.slide = null; this.bobT = null;
      this.hearts = 3; this.streak = 0; this.perfects = 0; this.drops = 0; this.spawnCount = 0; this.lastStars = 0; this.nextMile = 0;
      this.best = this.store.get('best', 0); this.bestAtStart = this.mode === 'free' ? this.best : 0;
      this.dropped = !!this.store.get('dropped', false);
      this.palOfs = this.mode === 'free' ? 0 : (this.level * 3) % A.PALS.length;
      this.al = { v: 0 }; this.zx = 1; this.fitted = false; this.night = -1; this.nightK = -1; this.lastMidY = 1e9;
      this.dbg = /[?&]debug\b/.test(location.search); this.auto = null; this._p = { x: 0, y: 0 };

      // the courtyard: a picture painted once, a soft shadow under the tower, two lanterns
      this.plaza = this.add.image(0, 0, 'plaza').setScale(1 / A.plazaRes).setDepth(-10);
      this.add.image(0, 3, 'fx', 'shadow').setDepth(-9);
      this.lamps = [[-40, 150], [150, -40]].map(function (q, k) {
        var X = q[0] - q[1], Y = (q[0] + q[1]) / 2;
        var pool = self.add.image(X, Y, 'fx', 'pool').setScale(0.55).setTint(0xffbe64).setAlpha(0.35).setDepth(7);
        var body = self.add.image(X, Y, 'lantern').setOrigin(14 / 28, 66 / 72).setScale(1 / Math.min(A.R, 2.5)).setDepth(8);
        var glow = self.add.image(X, Y - 40, 'fx', 'glow').setScale(0.5).setTint(0xffc86e).setBlendMode(Phaser.BlendModes.ADD).setDepth(8);
        self.tweens.add({ targets: glow, alpha: { from: 0.45, to: 0.8 }, duration: 600 + k * 170, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        return { pool: pool, glow: glow, body: body };
      });
      // the plinth: two layers of rough stone under the foundation
      this.plinths = [
        new Block(this).set({ x0: -72, x1: 72, z0: -72, z1: 72, tx: 0, tz: 0, y0: 0, h: 14, pal: A.PLINTH }, 0),
        new Block(this).set({ x0: -61, x1: 61, z0: -61, z1: 61, tx: 0, tz: 0, y0: 14, h: 12, pal: A.PLINTH }, 0)
      ];
      this.plinths[0].c.setDepth(1); this.plinths[1].c.setDepth(2);
      this.push(this.newBlock({ x0: -W0 / 2, x1: W0 / 2, z0: -W0 / 2, z1: W0 / 2, tx: 0, tz: 0, y0: 26, h: 34, pal: A.FOUND }, 0));

      // flat things that lie on the tower top
      this.shadow = flat(this, 499, 0x180828);
      this.glow = flat(this, 498, 0xffe28c);
      this.glowT = this.tweens.add({ targets: this.glow, alpha: { from: 0.2, to: 0.42 }, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.ripples = [flat(this, 497, 0xfff0be), flat(this, 497, 0xfff0be)];

      // the goal ring (levels) or the best-height ring (Free Build)
      this.ring = null;
      var ringH = this.mode === 'level' ? this.cfg.goal : this.bestAtStart > 0 ? this.bestAtStart : 0;
      if (ringH) this.makeRing(ringH, this.mode === 'level' ? 0xffd36b : 0xc9e8ff, this.mode === 'level' ? 1 : 0.8);

      // effects: emitters made once; the debris emitter is made per cut (its colour is the block's)
      var E = function (frame, cfg) { cfg.emitting = false; return self.add.particles(0, 0, 'fx', Object.assign({ frame: frame }, cfg)).setDepth(520); };
      this.fxDust = E('dot', { lifespan: 450, speed: { min: 25, max: 90 }, scale: { start: 0.14, end: 0.3 }, alpha: { start: 0.6, end: 0 }, tint: 0xfff0d7, gravityY: -30 });
      this.fxStars = E('star4', { lifespan: 800, speed: { min: 60, max: 170 }, scale: { start: 0.22, end: 0 }, gravityY: 140, rotate: { min: 0, max: 360 }, tint: 0xfff1a8 });
      this.fxGlint = E('star4', { lifespan: 700, speed: { min: 20, max: 80 }, scale: { start: 0.16, end: 0 }, gravityY: -60, tint: 0xb8ffd9 });
      this.fxSeam = E('chip', { lifespan: 550, speed: { min: 80, max: 190 }, scale: { start: 0.45, end: 0.1 }, gravityY: 600, rotate: { min: 0, max: 360 }, tint: 0xfff4d6 });
      this.fxDebris = E('chip', { lifespan: 800, speed: { min: 80, max: 260 }, angle: { min: 200, max: 340 }, scale: { start: 0.5, end: 0.1 }, gravityY: 700, rotate: { min: 0, max: 360 } });
      this.fxParty = ['0xffd36b', '0xff8fab', '0x7ae7ff', '0xffffff'].map(function (c) { return E('star4', { lifespan: 1200, speed: { min: 120, max: 380 }, scale: { start: 0.34, end: 0 }, gravityY: 420, rotate: { min: 0, max: 360 }, tint: +c }); });

      // physics: the courtyard floor a falling piece reaches
      this.ground = this.add.zone(0, GROUND_Y, 8000, 20); this.physics.add.existing(this.ground, true);
      this.pg = this.physics.add.group();
      this.physics.add.overlap(this.pg, this.ground, function (c) { self.crumble(c.piece); });

      // the camera follows the top of the tower (a lerp: the engine's own follow)
      this.focus = this.add.zone(0, -this.topY(), 2, 2);
      var cam = this.cameras.main;
      K.play.fit(this, function (v) { self.layout(v); });
      cam.centerOn(0, this.focus.y - this.offY);
      cam.startFollow(this.focus, false, 0.06, 0.06, 0, this.offY);
      this.followOn = true;

      // events from the interface
      this.events.once('shutdown', function () { self.game.events.emit('tb-gone'); });

      this.warm();
      this.tintAll(); this.shapeSky();
      this.spawnT = this.time.delayedCall(600, function () { self.spawn(); });
      this.game.events.emit('tb-start', this);
      this.hudNow();
      this.time.delayedCall(700, function () { if (K.load) K.load.done(); });      // (after the warm-up frames, which compile the shaders under the loading picture)
      K.snd.amb('amb-wind', { vol: 0.5 });
      if (this.dbg) window.TBT = this.hook();
    }

    // Warm-up, while the loading picture is still up: every block texture is drawn once (so none is uploaded to the graphics
    // chip in the middle of a drop), a few blocks are made ahead with their physics bodies (a piece is then not built when
    // it is cut), and each emitter emits one particle (so its first real burst compiles nothing). All at 1% alpha for
    // about a second, then the blocks go to the pool and the emitters come back to full.
    warm() {
      var self = this, pals = A.PALS.concat([A.FOUND, A.PLINTH]), warmed = [];
      pals.forEach(function (pal, i) {
        var H = pal === A.FOUND ? 34 : pal === A.PLINTH ? 14 : LH;
        var b = new Block(self).set({ x0: -20, x1: 20, z0: -20, z1: 20, tx: 0, tz: 0, y0: 60, h: H, pal: pal }, H / 2);
        b.c.setAlpha(0.01).setDepth(900);
        if (i < 4) { b.c.setSize(70, 40); self.physics.add.existing(b.c); b.phys = true; b.c.body.enable = false; }
        warmed.push(b);
      });
      var em = [this.fxDust, this.fxStars, this.fxGlint, this.fxSeam, this.fxDebris].concat(this.fxParty);
      em.forEach(function (e) { e.setAlpha(0.01).explode(1, 0, -60); });
      // The engine compiles one shader program for each number of textures a batch holds (1 to 8), separately for tiles and for
      // plain pictures, the first time a batch of that size is drawn: 100 ms or more on a phone, in the middle of a drop.
      // So draw each size once now: runs of 1 to 8 different textures, as tiles and as pictures, one after the other.
      if (!Tower.shaders) {
        Tower.shaders = true;
        var keys = [], ks = A.PALS.concat([A.FOUND]);
        ks.forEach(function (p) { keys.push(A.sideKey(p, p === A.FOUND ? 34 : LH), A.topKey(p)); });
        var d = 1000, junk = [], tile = function (key) { junk.push(self.add.tileSprite(0, -90, 3, 3, key).setAlpha(0.01).setDepth(d++)); },
          pic = function (key) { junk.push(self.add.image(0, -90, key).setScale(0.03).setAlpha(0.01).setDepth(d++)); },
          flushT = function () { junk.push(self.add.tileSprite(0, -90, 3, 3, keys[0]).setAlpha(0.01).setDepth(d++)); },
          flushP = function () { junk.push(self.add.image(0, -90, 'fx', 'px').setScale(0.5).setAlpha(0.01).setDepth(d++)); };
        for (var n = 1; n <= 8; n++) {
          for (var q = 0; q < n; q++) tile(keys[q]);
          flushP();
          for (q = 0; q < n; q++) pic(keys[q + 1]);
          flushT();
        }
        this.time.delayedCall(1200, function () { junk.forEach(function (o) { o.destroy(); }); });
      }
      this.time.delayedCall(1000, function () {
        warmed.forEach(function (b) { b.dx = 0; b.dy = 0; b.c.setAlpha(1).setVisible(false); b.c.setScale(1); self.pool.push(b); });
        em.forEach(function (e) { e.setAlpha(1); });
      });
    }

    // ---------- layout: the tower is as big as fits ----------
    layout(v) {
      var gw = this.scale.width, gh = this.scale.height, cam = this.cameras.main;
      var css = A.sCss(window.innerWidth, window.innerHeight), dpr = gw / window.innerWidth;
      this.zb = css * dpr; this.css = css; this.ayF = gw > gh ? 0.6 : 0.56;
      this.offY = (this.ayF - 0.5) * gh / this.zb;
      this.view = v;
      if (this.fitted) { this.fit(true); return; }
      cam.setZoom(this.zb * this.zx);
      if (this.followOn && this.focus) { cam.setFollowOffset(0, this.offY); cam.centerOn(0, this.focus.y - this.offY); }
    }
    get camH() { var c = this.cameras.main; return -(c.scrollY + c.height / 2 + this.offY); }     // the height the camera is on
    get p() { return K.clamp(this.mode === 'free' ? this.al.v / FREE_SPAN : (this.al.v + this.cfg.sky) / SKY_SPAN, 0, 1); }
    // a point of the world as a point in the interface's design space (for floating words)
    design(wx, wy) {
      var c = this.cameras.main, k = c.zoom / this.view.z, q = this._p;
      q.x = 960 + (wx - (c.scrollX + c.width / 2)) * k; q.y = 540 + (wy - (c.scrollY + c.height / 2)) * k;
      return q;
    }
    say(wx, wy, text, o) { var q = this.design(wx, wy); this.game.events.emit('tb-text', q.x, q.y, text, o); }

    // ---------- blocks and layers ----------
    newBlock(e, ah) { var b = this.pool.pop(); if (b) { b.c.setVisible(true).setScale(1).setAlpha(1).setAngle(0); b.dx = 0; b.dy = 0; } else b = new Block(this); return b.set(e, ah); }
    recycle(b) {
      if (b.phys) { b.c.body.enable = false; this.pg.remove(b.c); }
      b.piece = null; b.c.setVisible(false); this.tweens.killTweensOf(b.c); this.pool.push(b);
    }
    push(b) { b.c.setDepth(10 + this.layers.length); this.layers.push(b); }
    top() { return this.layers[this.layers.length - 1]; }
    height() { return Math.max(0, this.layers.length - 1); }
    topY() { var t = this.top(); return t.y0 + t.h; }
    ext(b) { return { x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z1, tx: b.tx, tz: b.tz, y0: b.y0, h: b.h, pal: b.pal }; }
    tintAll() {
      var n = this.night, i;
      for (i = 0; i < this.layers.length; i++) this.layers[i].tint(n);
      this.plinths[0].tint(n); this.plinths[1].tint(n);
      if (this.m) this.m.b.tint(n);
      for (i = 0; i < this.pieces.length; i++) this.pieces[i].tint(n);
    }
    // the sky's progress decides the night: the blocks, the courtyard, the lanterns follow it
    shapeSky() {
      var p = this.p, n = A.smooth(0.45, 0.95, p), k = Math.round(n * 40) / 40;
      if (k === this.nightK) return; this.nightK = k; this.night = k;
      this.tintAll();
      this.plaza.setTint(night3(k, 0.62, [1, 1, 1]));
      var gl = 0.2 + 0.8 * A.smooth(0.15, 0.7, p);
      this.lamps.forEach(function (l) { l.pool.setAlpha(0.35 * gl); l.glow.setVisible(gl > 0.25); });
    }

    // ---------- the goal ring ----------
    makeRing(h, color, glow) {
      var y = BASE_Y + h * LH, r = 68;
      var ring = this.add.image(0, -y, 'fx', 'ring').setScale(1 / 2).setTint(color).setAlpha(glow);
      var badge = this.add.image(r * 2, -y, 'fx', 'badge').setScale(0.55).setTint(color).setAlpha(glow);
      var num = this.add.text(r * 2, -y + 1, String(h), { fontFamily: 'system-ui, sans-serif', fontSize: '24px', fontStyle: '900', color: '#3b2208' }).setOrigin(0.5).setResolution(Math.min(4, Math.ceil(this.zb || 2)));
      this.ring = this.add.container(0, 0, [ring, badge, num]).setDepth(450);
      this.tweens.add({ targets: [ring, badge], alpha: { from: glow * 0.55, to: glow }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // ---------- the sliding block ----------
    spawn() {
      if (this.state !== 'play') return;
      var self = this, cfg = this.cfg;
      if (this.mode === 'free') cfg = this.cfg = LV.free(this.height());
      var t = this.top(), xz = cfg.axes === 'xz', axis = xz && this.spawnCount % 2 ? 'z' : 'x';
      var w = axis === 'x' ? t.x1 - t.x0 : t.z1 - t.z0;
      var side = Math.floor(this.spawnCount / (xz ? 2 : 1)) % 2 ? 1 : -1;
      // Below 1 the block always overlaps the tower (no misses). Otherwise it sweeps a fixed minimum range so a
      // narrow tower is harder to hit, not just faster.
      var amp = cfg.amp < 1 ? cfg.amp * w : cfg.amp * Math.max(w, 60);
      var pal = A.PALS[(this.height() + this.palOfs) % A.PALS.length];
      var b = this.newBlock({ x0: t.x0, x1: t.x1, z0: t.z0, z1: t.z1, tx: t.tx, tz: t.tz, y0: this.topY(), h: LH, pal: pal }, 0);
      b.c.setDepth(500).setAlpha(0);
      var m = this.m = { axis: axis, A: amp, p: side * amp, b: b, phase: 'slide', hov: HOVER, bob: 0, fade: 0, pal: pal };
      this.spawnCount++;
      this.moverUpdate();
      this.tweens.add({ targets: m, fade: 1, duration: 200, onUpdate: function () { if (self.m === m) self.moverUpdate(); } });
      // slides at a steady speed from side to side (a linear tween that goes back and forth)
      this.slide = this.tweens.add({ targets: m, p: -side * amp, duration: 2 * amp / cfg.speed * 1000, ease: 'Linear', yoyo: true, repeat: -1, onUpdate: function () { self.moverUpdate(); } });
      this.bobT = this.tweens.add({ targets: m, bob: { from: -1.5, to: 1.5 }, duration: 980, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.glow.at(t.x0, t.z0, t.x1 - t.x0, t.z1 - t.z0, this.topY());
    }
    moverUpdate() {
      var m = this.m; if (!m) return;
      var b = m.b, p = m.p, t = this.top(), yT = this.topY(), x0 = t.x0, x1 = t.x1, z0 = t.z0, z1 = t.z1;
      b.c.setAlpha(m.fade);
      b.dx = m.axis === 'x' ? p : -p; b.dy = p / 2 - m.hov - m.bob; b.place();
      if (m.axis === 'x') { x0 += p; x1 += p; } else { z0 += p; z1 += p; }
      var ix0 = Math.max(x0, t.x0), ix1 = Math.min(x1, t.x1), iz0 = Math.max(z0, t.z0), iz1 = Math.min(z1, t.z1);
      if (ix1 > ix0 && iz1 > iz0) this.shadow.at(ix0, iz0, ix1 - ix0, iz1 - iz0, yT).setAlpha(0.38 * m.fade).setVisible(true); else this.shadow.setVisible(false);
      this.glow.setVisible(m.phase === 'slide' && Math.abs(p) <= this.cfg.tol);
    }

    // tap anywhere (or a key): drop the block
    drop() {
      var self = this, m = this.m;
      if (this.state !== 'play' || !m || m.phase !== 'slide') return false;
      m.phase = 'fall'; this.slide.stop(); this.bobT.stop(); m.bob = 0; m.fade = 1;
      if (!this.dropped) { this.dropped = true; this.store.set('dropped', true); }
      this.game.events.emit('tb-drop');
      this.tweens.add({ targets: m, hov: 0, duration: FALL_MS, ease: 'Quad.easeIn', onUpdate: function () { self.moverUpdate(); }, onComplete: function () { self.land(); } });
      return true;
    }

    // ---------- landing: cut, snap, score ----------
    land() {
      var self = this, cfg = this.cfg, t = this.top(), m = this.m, ax = m.axis, p = m.p, k0 = ax + '0', k1 = ax + '1', kt = 't' + ax;
      var lo = t[k0], hi = t[k1], w = hi - lo, y0 = this.topY();
      var perfect = Math.abs(p) <= cfg.tol, overlap = w - Math.abs(p);
      this.drops++;
      if (!perfect && overlap < 1.5) { this.miss(); return; }
      // Safety ledge: the tower never gets narrower than minW. The block slides back onto the ledge instead.
      var floor = Math.min(w, cfg.minW * W0), pOrig = p;
      if (perfect) p = 0; else if (overlap < floor) p = (p > 0 ? 1 : -1) * (w - floor);
      var nb = { x0: t.x0, x1: t.x1, z0: t.z0, z1: t.z1, tx: t.tx, tz: t.tz, y0: y0, h: LH, pal: m.pal };
      nb[kt] += p;
      var cut = null;
      if (p !== 0) {
        cut = { x0: nb.x0, x1: nb.x1, z0: nb.z0, z1: nb.z1, tx: nb.tx, tz: nb.tz, y0: y0, h: LH, pal: m.pal };
        if (p > 0) { nb[k0] = lo + p; nb[k1] = hi; cut[k0] = hi; cut[k1] = hi + p; }
        else { nb[k0] = lo; nb[k1] = hi + p; cut[k0] = lo + p; cut[k1] = lo; }
        cut[k0] += pOrig - p; cut[k1] += pOrig - p; cut[kt] += pOrig - p;           // starts where the sliding block was
      }
      // the sliding block becomes the new layer: it lands where it was dropped and slides to its place
      var b = m.b, off = pOrig - p;
      this.shadow.setVisible(false); this.glow.setVisible(false);
      b.set(nb, 0); b.c.setAlpha(1);
      b.dx = ax === 'x' ? off : -off; b.dy = off / 2; b.place();
      this.push(b); this.m = null;
      var o = { v: 1 };
      this.tweens.add({ targets: o, v: 0, duration: 230, ease: 'Expo.easeOut', onUpdate: function () { b.dx = (ax === 'x' ? off : -off) * o.v; b.dy = off / 2 * o.v; b.place(); } });
      b.c.setScale(1, 0.82); this.tweens.add({ targets: b.c, scaleY: 1, duration: 150, ease: 'Back.easeOut' });
      K.snd.play(m.pal.kind === 'stone' ? 'stone' : 'tile'); K.buzz(8);
      // dust puffs at the front corners
      var dust = this.fxDust, c1x = nb.x0 - nb.z1, c1y = (nb.x0 + nb.z1) / 2 - y0, c2x = nb.x1 - nb.z1, c2y = (nb.x1 + nb.z1) / 2 - y0, c3x = nb.x1 - nb.z0, c3y = (nb.x1 + nb.z0) / 2 - y0;
      dust.explode(4, c1x, c1y); dust.explode(4, c2x, c2y); dust.explode(4, c3x, c3y);
      if (cut) {
        var sgn = p > 0 ? 1 : -1, scr = (ax === 'x' ? 1 : -1) * sgn;
        this.piece(cut, ax, 40, sgn * 45, scr * Phaser.Math.FloatBetween(1.3, 2.3), p > 0);
        K.snd.play('slice');
        var sx = ax === 'x' ? (p > 0 ? nb.x1 : nb.x0) - nb.z1 : nb.x1 - (p > 0 ? nb.z1 : nb.z0), sy = ax === 'x' ? ((p > 0 ? nb.x1 : nb.x0) + nb.z1) / 2 : (nb.x1 + (p > 0 ? nb.z1 : nb.z0)) / 2;
        this.fxSeam.explode(8, sx, sy - y0 - LH / 2);
      }
      var grew = false, mx = ((nb.x0 + nb.x1) - (nb.z0 + nb.z1)) / 2, my = ((nb.x0 + nb.x1) / 2 + (nb.z0 + nb.z1) / 2) / 2 - (y0 + LH);
      if (perfect) {
        this.perfects++; this.streak++;
        K.snd.play('perfect', { rate: 1 + 0.04 * Math.min(this.streak, 6) });
        this.ripples.forEach(function (r, i) {                       // a ring of light runs out from the block's edge
          var o = { v: 0 }, x0 = nb.x0, z0 = nb.z0, w = nb.x1 - nb.x0, d = nb.z1 - nb.z0, yy = y0 + LH;
          self.tweens.addCounter({ from: 0, to: 1, duration: 650, delay: i * 120, ease: 'Cubic.easeOut',
            onStart: function () { r.setVisible(true); },
            onUpdate: function (tw) { var k = tw.getValue(), e = 4 + k * 30; r.at(x0 - e, z0 - e, w + 2 * e, d + 2 * e, yy).setAlpha(0.5 * (1 - k)); },
            onComplete: function () { r.setVisible(false); } });
        });
        this.fxStars.explode(10 + Math.min(this.streak, 8) * 2, mx, my);
        this.say(mx, my - 30, this.streak > 1 ? 'Perfect ×' + this.streak : 'Perfect!', { color: '#fff6c2', size: this.streak > 1 ? 42 : 36, stroke: 'rgba(60,20,80,.65)' });
        if (this.streak >= cfg.grow) grew = this.grow(b, ax);
        if (this.streak % 3 === 0 && this.hearts < 3) {
          this.hearts++; this.game.events.emit('tb-heart');
          this.say(mx, my - 80, '+1 ♥', { color: '#ff8fa3', size: 38, stroke: 'rgba(60,10,30,.6)', life: 1 });
        }
        if (this.streak === 5) this.praise('ahsant');
      } else {
        this.streak = 0;
        if (overlap / w > 0.84) this.say(mx, my - 30, 'Good!', { color: '#e8fff4', size: 32, stroke: 'rgba(20,40,60,.55)', life: 0.7 });
      }
      this.after(b);
      this.hudNow();
      if (this.mode === 'level' && this.height() >= cfg.goal) { this.win(); return; }
      if (this.mode === 'free') this.freeProgress();
      this.spawnT = this.time.delayedCall(grew ? 450 : 240, function () { self.spawn(); });
    }
    // the camera climbs, the sky follows, the sound of the wind rises
    after(b) {
      this.focus.y = -this.topY();
      this.tweens.killTweensOf(this.al);
      this.tweens.add({ targets: this.al, v: this.topY() - BASE_Y, duration: 1700, ease: 'Sine.easeOut' });
      K.snd.amb('amb-wind', { vol: 0.5 + 0.45 * Math.min(1, (this.topY() - BASE_Y) / 700) });
    }

    // A perfect streak grows the new block back toward full size (8 units at a time).
    grow(b, ax) {
      var self = this, k0 = ax + '0', k1 = ax + '1', w = b[k1] - b[k0];
      if (w >= W0 - 0.5) return false;
      var add = Math.min(8, W0 - w), n0 = b[k0] - add / 2, n1 = b[k1] + add / 2;
      if (n0 < -W0 / 2) { n1 += -W0 / 2 - n0; n0 = -W0 / 2; }
      if (n1 > W0 / 2) { n0 -= n1 - W0 / 2; n1 = W0 / 2; }
      var f0 = b[k0], f1 = b[k1], e = this.ext(b);
      this.tweens.addCounter({ from: 0, to: 1, duration: 350, ease: 'Back.easeOut', onUpdate: function (tw) {
        var v = tw.getValue(); e[k0] = f0 + (n0 - f0) * v; e[k1] = f1 + (n1 - f1) * v; b.set(e);
      }, onComplete: function () { e[k0] = n0; e[k1] = n1; b.set(e); } });
      b[k0] = n0; b[k1] = n1;                                                      // (the numbers the next block reads)
      this.time.delayedCall(120, function () { K.snd.play('grow'); });
      var cx = ax === 'x' ? n1 - (b.z0 + b.z1) / 2 : (b.x0 + b.x1) / 2 - n1, cy = ax === 'x' ? (n1 + (b.z0 + b.z1) / 2) / 2 : ((b.x0 + b.x1) / 2 + n1) / 2;
      this.fxGlint.explode(10, cx, cy - b.y0 - LH);
      this.say(cx, cy - b.y0 - LH + 10, 'Bigger!', { color: '#c9ffe0', size: 30, stroke: 'rgba(10,50,40,.6)', life: 0.8, rise: 60 });
      return true;
    }

    // ---------- a piece that falls: an Arcade body with gravity and spin ----------
    piece(ext, ax, vy, vh, vr, front) {
      var b = this.newBlock(ext, LH / 2);
      b.c.setDepth(front ? 600 : 5);
      if (!b.phys) { b.c.setSize(70, 40); this.physics.add.existing(b.c); b.phys = true; }
      this.pg.add(b.c);
      var body = b.c.body; body.enable = true; body.setAllowGravity(true);
      body.reset(b.c.x, b.c.y);
      body.setVelocity(vh * (ax === 'x' ? 1 : -1), vh * 0.5 - vy);
      body.setAngularVelocity(vr * 57.2958);
      b.c.piece = b; b.piece = true; b.born = this.time.now; b.axis = ax;
      this.pieces.push(b);
      if (this.pieces.length > 12) this.recycle(this.pieces.shift());
      return b;
    }
    // a piece reaches the courtyard: crumbles, quieter and duller the further below the camera it is
    crumble(b) {
      var i = this.pieces.indexOf(b); if (i < 0) return; this.pieces.splice(i, 1);
      var c = this.cameras.main, dist = K.clamp((this.camH - 120) / 520, 0, 1), x = b.c.x, y = b.c.y;
      K.snd.play('crumble', { vol: 1 - dist * 0.75 });
      if (y < c.scrollY + c.height / 2 + (c.height / 2) / c.zoom + 20) {
        var d = this.fxDebris, pl = b.pal;
        [pl.base, pl.dark, pl.light].forEach(function (col) { d.setParticleTint(A.int(col)); d.explode(4, x, GROUND_Y); });
        this.fxDust.explode(6, x, GROUND_Y);
        c.shake(120, 0.0025);
      }
      this.recycle(b);
    }

    miss() {
      var self = this, m = this.m, sgn = m.p > 0 ? 1 : -1, ax = m.axis, b = m.b, t = this.top();
      this.m = null; this.streak = 0;
      this.shadow.setVisible(false); this.glow.setVisible(false);
      // the block falls on as a piece, from where it was dropped
      var e = this.ext(t); e.y0 = this.topY(); e.h = LH; e.pal = m.pal; var k0 = ax + '0', k1 = ax + '1', kt = 't' + ax;
      e[k0] += m.p; e[k1] += m.p; e[kt] += m.p;
      this.recycle(b);
      this.piece(e, ax, 0, sgn * 55, (ax === 'x' ? 1 : -1) * sgn * Phaser.Math.FloatBetween(1, 1.8), m.p > 0);
      this.hearts--;
      K.snd.play('miss'); K.buzz(30); this.cameras.main.shake(250, 0.004);
      this.hudNow(); this.game.events.emit('tb-heart');
      this.say(0, -(this.topY() + LH * 2), this.hearts > 0 ? 'Oops!' : 'Oh no!', { color: '#ffd1dc', size: 42, stroke: 'rgba(60,10,30,.6)', life: 1.1 });
      if (this.hearts <= 0) {
        this.state = this.mode === 'free' ? 'over' : 'fail';
        this.time.delayedCall(900, function () { if (self.mode === 'free') self.freeOver(); else self.failLevel(); });
      } else this.spawnT = this.time.delayedCall(750, function () { self.spawn(); });
    }

    stars() {
      var t = this.top(), area = ((t.x1 - t.x0) * (t.z1 - t.z0)) / (W0 * W0), pr = this.perfects / Math.max(1, this.drops);
      if (area >= 0.6 || pr >= 0.5) return 3;
      if (area >= 0.3 || pr >= 0.25) return 2;
      return 1;
    }
    celebrate(big) {
      var self = this, n = big ? 6 : 3, top = this.topY();
      this.layers.forEach(function (L, i) {                       // a wave of light runs up the tower
        self.time.delayedCall(200 + i * 50, function () { self.flash(L); });
      });
      for (var i = 0; i < n; i++) this.time.delayedCall(i * 160, function () {
        var cam = self.cameras.main, w = cam.width / cam.zoom;
        self.fxParty[Phaser.Math.Between(0, 3)].explode(18, Phaser.Math.FloatBetween(-w * 0.3, w * 0.3), -top + Phaser.Math.FloatBetween(-40, 30));
      });
    }
    flash(L) {                                                      // a block catches the light and settles (tint ADD, then back)
      var o = { v: 0.5 }, f = [L.L.t, L.R.t, L.T.t];
      f.forEach(function (t) { t.setTintMode(Phaser.TintModes.ADD); });
      this.tweens.add({ targets: o, v: 0, duration: 450, onUpdate: function () { var g = Math.round(o.v * 0x60), c = (g << 16) | (g << 8) | g; f.forEach(function (t) { t.setTint(c); }); },
        onComplete: function () { f.forEach(function (t) { t.setTintMode(Phaser.TintModes.MULTIPLY); }); L.night = -1; L.tint(L.s.night); } });
    }

    win() {
      var self = this;
      this.state = 'won';
      var st = this.lastStars = this.stars();
      this.progress.finish(this.level, st);
      K.bridge.complete();
      K.snd.play('win'); K.buzz(20);
      this.time.delayedCall(450, function () { self.praise(PRAISES[(self.level - 1) % PRAISES.length]); });
      this.fxStars.explode(30, 0, -this.topY());
      this.celebrate(true);
      this.time.delayedCall(700, function () { self.fit(false); });
      this.time.delayedCall(2100, function () { self.game.events.emit('tb-end', 'won'); });
    }
    failLevel() {
      var self = this;
      this.fit(false);
      this.time.delayedCall(1100, function () { K.snd.play('over'); self.game.events.emit('tb-end', 'fail'); });
    }

    // ---------- Free Build ----------
    freeProgress() {
      var h = this.height(), top = this.topY();
      if (h > this.best) { this.best = h; this.store.set('best', h); }
      if (this.bestAtStart > 0 && h === this.bestAtStart + 1) {
        K.snd.play('cheer');
        this.say(0, -(top + LH * 2), 'New best!', { color: '#ffe7a6', size: 46, stroke: 'rgba(60,30,10,.6)', life: 1.3 });
      }
      if (h === LV.milestones[this.nextMile]) {
        this.nextMile++;
        K.bridge.complete();
        K.snd.play('cheer');
        this.praise('mashaallah');
        this.say(0, -(top + LH * 3), h + ' blocks!', { color: '#fff6c2', size: 54, stroke: 'rgba(60,20,80,.6)', life: 1.5 });
        this.celebrate(false);
      }
      this.hudNow();
    }
    freeOver() {
      var self = this, h = this.height(), isBest = h > this.bestAtStart && h > 0;
      this.fit(false);
      if (isBest) { K.snd.play('cheer'); this.time.delayedCall(400, function () { self.praise('barakallah'); }); this.celebrate(false); }
      this.time.delayedCall(1400, function () { K.snd.play('over'); self.game.events.emit('tb-end', 'over', isBest); });
    }

    // Zoom out to show the whole tower (level end, game over): the camera's own pan and zoom.
    fit(instant) {
      if (!this.layers.length) return;
      var cam = this.cameras.main, gh = this.scale.height;
      if (!this.fitted) { this.fitted = true; cam.stopFollow(); this.followOn = false; }
      var yT = this.topY() + 30, zx = Math.min(1, (gh * 0.74) / ((yT + 110) * this.zb)), z = this.zb * zx;
      var cy = (-yT + 110) / 2 + 0.03 * gh / z;
      this.zx = zx;
      if (instant) { cam.setZoom(z); cam.centerOn(0, cy); return; }
      cam.zoomTo(z, 1000, 'Sine.easeInOut'); cam.pan(0, cy, 1000, 'Sine.easeInOut');
    }

    // an Arabic praise, a recorded voice (js/kit/praise-clips.js, loaded the first time one is wanted)
    praise(key) {
      if (this.dbg) return;
      var go = function () { var d = Kit.praiseClips && Kit.praiseClips[key]; if (d) Kit.snd.voice('data:audio/mpeg;base64,' + d, { vol: 0.9 }); };
      if (Kit.praiseClips) { go(); return; }
      if (Tower.asked) return; Tower.asked = true;
      var s = document.createElement('script'); s.src = '/KidsGames/js/kit/praise-clips.js'; s.onload = go; document.head.appendChild(s);
    }

    // ---------- to the interface ----------
    hudNow() { this.game.events.emit('tb-hud', this); }
    update(time, dms) {
      var c = this.cameras.main;
      this.shapeSky();
      // blocks far below the camera are not drawn
      var my = c.scrollY;
      if (my !== this.lastMidY) {
        this.lastMidY = my;
        var bottom = c.scrollY + c.height / 2 + (c.height / 2) / c.zoom + 70, L = this.layers;
        for (var i = 0; i < L.length; i++) L[i].c.visible = L[i].oy - 40 < bottom;
      }
      if (this.auto !== null && this.m && this.m.phase === 'slide' && this.m.fade >= 1 && Math.abs(this.m.p - this.auto) <= 1.6) this.drop();
    }

    // test hook (?debug): inspect and drive the game by hand
    hook() {
      var T = this;
      return {
        tower: T, drop: function () { return T.drop(); }, auto: function (off) { T.auto = off; },
        get: function () {
          var t = T.layers.length ? T.top() : null;
          return { state: T.state, mode: T.mode, level: T.level, height: T.height(), goal: T.cfg.goal, hearts: T.hearts, streak: T.streak, perfects: T.perfects, drops: T.drops,
            best: T.best, stars: T.lastStars, tol: T.cfg.tol, width: t ? Math.round((t.x1 - t.x0) * 10) / 10 : 0, depth: t ? Math.round((t.z1 - t.z0) * 10) / 10 : 0,
            mover: T.m ? { p: Math.round(T.m.p * 10) / 10, axis: T.m.axis, phase: T.m.phase } : null, pieces: T.pieces.length, p: Math.round(T.p * 100) / 100, zoom: T.cameras.main.zoom };
        },
        setAlt: function (a) { T.al.v = a; },
        fast: function (k) { T.tweens.timeScale = k; T.time.timeScale = k; T.physics.world.timeScale = 1 / k; }
      };
    }
  }

  window.TBTower = Tower;
})();
