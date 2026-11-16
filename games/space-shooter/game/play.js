/* Star Rangers: one wave (scene 'Play', Arcade physics). Fly the ranger ship through 24 waves in 4 space worlds. Drag
   anywhere to fly (the ship follows the finger, it never jumps under it); the ship fires by itself. Robots, drones,
   asteroids and space junk only; each world ends with a friendly boss machine that flies home when beaten. Hearts and
   shields instead of game over.

   Engine map (what the old hand-written loop became):
   - fixed-step loop, sort order, drawing ........ Phaser's loop and display list; sprites of one atlas ('sr')
   - ship, bolts, robots, rocks, sparks, stars ... Arcade bodies in pooled physics groups (maxSize, get / disableBody)
   - hit tests ................................... physics.add.overlap (circles for the small things, a rectangle and a
                                                   core circle for the boss machines); a few game rules in the callbacks
   - leaving the field ........................... world bounds + the 'worldbounds' event (bolts, sparks)
   - drifting rocks and junk, spin, star pull .... body velocity, angular velocity, physics.moveToObject
   - ship follows the finger ..................... a velocity toward the target (a spring), clamped
   - curved swoops, dives ........................ Phaser.Math.Interpolation.CubicBezier and Easing
   - flashes, squash, pops, banners, hand ........ tweens;  delays: this.time.delayedCall;  shake: cameras.main.shake
   - explosions and sparks ....................... particle emitters (explode), pooled per colour set
   - starfield, warp streaks ..................... star images scrolled (the warp streaks are a TileSprite, shown for a moment); the sky is one picture painted once per world
   Game code is only what the engine has no word for: the wave director (what comes next), the formation and boss moves
   (where each machine wants to be), the scoring and heart rules, and the children's-game tuning of all of them. */
(function () {
  'use strict';
  var A = window.SrArt, LV = window.STAR_WAVES, U = A.U, S = A.S, COUNT = SR.COUNT, PER = SR.PER;
  var SHIP_R = 30, FIRE = 0.2, ROWH = 128, MAX_HEARTS = 5, BEZ = Phaser.Math.Interpolation.CubicBezier, EASE = Phaser.Math.Easing;
  var ADD = Phaser.BlendModes.ADD, FILL = Phaser.TintModes.FILL, MULT = Phaser.TintModes.MULTIPLY;
  var clamp = Phaser.Math.Clamp, rand = Phaser.Math.FloatBetween, TAU = Math.PI * 2;

  var KINDS = {
    bot: { r: 44, hp: 1, pts: 100, stars: 1, cols: ['#3cc8b4', '#bff7ee', '#1d6f7a', '#8ffcff'], frame: 'bot-bot' },
    tank: { r: 50, hp: 3, pts: 250, stars: 2, cols: ['#ff9f43', '#ffe0b0', '#8a4a12', '#fff07a'], frame: 'bot-tank' },
    zapper: { r: 44, hp: 2, pts: 200, stars: 1, cols: ['#a986ff', '#efe2ff', '#4a2a8a', '#ffa6ef'], frame: 'bot-zapper' },
    drone: { r: 42, hp: 1, pts: 150, stars: 1, cols: ['#c9d3ea', '#7dfcff', '#4b5580', '#ffe27a'], frame: 'drone' },
    rock: { r: 66, hp: 3, pts: 150, stars: 1, rock: true },
    pebble: { r: 34, hp: 1, pts: 50, stars: 1, rock: true },
    can: { r: 32, hp: 1, pts: 75, stars: 1, cols: ['#ffffff', '#ff7a45', '#9aa4bf', '#ffd36b'], frame: 'junk-can' },
    gear: { r: 34, hp: 1, pts: 75, stars: 1, cols: ['#e8ecf6', '#a5aec8', '#5f6788', '#ffffff'], frame: 'junk-gear' },
    sat: { r: 52, hp: 2, pts: 150, stars: 2, cols: ['#e7a83c', '#5aa2ff', '#ffe7a0', '#ffffff'], frame: 'junk-sat' }
  };
  var STREAM = { p: 'pebble', R: 'rock', c: 'can', g: 'gear', s: 'sat' };
  var FORM = { b: 'bot', t: 'tank', z: 'zapper' };
  var BOSS_ATTACKS = [['gears', 'swoop', 'fan'], ['dash', 'burst', 'pebbles'], ['ring', 'spiral', 'weave'], ['wands', 'swoop', 'ring']];

  // a circular body of radius r (game units) centred on the picture; the body scales with the sprite
  function circ(o, r) { var f = o.frame, rp = r / o.scaleX; o.body.setCircle(rp, f.width / 2 - rp, f.height / 2 - rp); }
  function depth(o, d) { return o.setDepth(d); }
  // a rider placed relative to its machine (x, y in the machine's own turned frame)
  function put(o, e, x, y, cs, sn) { o.setPosition(e.x + x * cs - y * sn, e.y + x * sn + y * cs).setRotation(e.rotation); }

  class Play extends Phaser.Scene {
    constructor() { super({ key: 'Play', physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, fixedStep: false, useTree: false, debug: SR.Q.has('phys') } } }); }
    init(d) { this.n = clamp((d && d.n) | 0 || 1, 1, COUNT); }

    create() {
      var self = this;
      this.ready = false;
      this.level = this.n; this.world = LV.worldOf(this.level); this.def = LV.list[this.level - 1]; this.tune = this.def.tune;
      SR.progress.setCurrent(this.level);
      // the wave's own world pictures (and its boss machine) come from the baked files; those are loaded now, the rest stay on disk
      var need = A.artFor(this.world, this.def.boss != null);
      this.dropArt(need);
      Kit.play.artNeed(this, need, function () { self.build(); });
    }
    // what an earlier world left on the graphics chip goes (not when baking: tools/bake-art.js wants everything painted)
    dropArt(need) {
      if (SR.Q.has('bake')) return;
      var tm = this.textures; tm.getTextureKeys().forEach(function (k) { if (A.isOptionalArt(k) && !need.test(k)) tm.remove(k); });
    }
    build() {
      var self = this, dbg = Kit.play.debug;
      A.paintSprites(this); A.paintStars(this);
      if (this.def.boss != null) A.paintBoss(this, this.def.boss);
      this.G = { FW: 900, FH: 1300, top: 100, bottom: 1250, formTop: 260, minY: 800, maxY: 1150, k: 1 };
      this.t = 0; this.state = 'play'; this.hearts = 3; this.score = 0; this.combo = 0; this.lastKill = -9; this.starsGot = 0;
      this.bannerT = 2.2; this.warpT = 1.3; this.diveT = this.tune.dive || 0; this.clearT = 0; this.shotN = 0;
      this.en = []; this.boss = null; this.laters = []; this.drag = null; this.blocked = 0;
      this.dir = { gi: -1, gt: 0, spawned: 0, spawnT: 0, lastAt: 0, done: false, wait: 1.6 };
      this.S = { x: 0, tx: 0, ty: 0, bank: 0, inv: 0, flash: 0, squash: 0, muzzle: 0, fireT: 0.6, shieldT: 0, spreadT: 0, magnetT: 0, thrust: 0, dead: false, vx: 0 };
      this.pops = []; this.ems = {}; this.emList = [];

      this.makeBackdrop();
      this.makeGroups();
      this.makeShip();
      if (this.def.boss != null) this.makeBoss(this.def.boss);

      // overlaps (the engine tests; the callbacks hold the game's rules)
      var P = this.physics.add;
      P.overlap(this.bullets, this.enemies, this.bulletHitsEnemy, function (b, e) { return e.delay <= 0 && e.y > 30; }, this);
      if (this.core) P.overlap(this.bullets, this.core, this.bulletHitsCore, null, this);
      if (this.bossC) P.overlap(this.bullets, this.bossC, this.bulletHitsBoss, null, this);
      P.overlap(this.ship, this.enemies, this.shipHitsEnemy, function (s, e) { return e.delay <= 0; }, this);
      P.overlap(this.ship, this.shots, this.shipHitsShot, null, this);
      P.overlap(this.ship, this.pickups, this.shipGets, null, this);
      if (this.bossC) P.overlap(this.ship, this.bossC, this.shipHitsBoss, null, this);
      this.physics.world.on('worldbounds', function (body) { var o = body.gameObject; if (o && (o.isBolt || o.isShot)) o.disableBody(true, true); });

      // input: a relative drag (the ship moves with the finger and never jumps under it); a mouse follows without pressing
      this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
      this.input.on('pointerdown', function (p) {
        if (self.state !== 'play' || self.S.dead || self.blocked) return;
        self.drag = { id: p.id, px: p.worldX, py: p.worldY, sx: self.S.tx, sy: self.S.ty, moved: 0, lx: p.worldX, ly: p.worldY };
      });
      this.input.on('pointermove', function (p) {
        if (self.state !== 'play' || self.S.dead || self.blocked) return;
        var d = self.drag;
        if (d && p.id === d.id) {
          self.S.tx = d.sx + (p.worldX - d.px); self.S.ty = d.sy + (p.worldY - d.py); self.clampShip();
          d.moved += Math.abs(p.worldX - d.lx) + Math.abs(p.worldY - d.ly); d.lx = p.worldX; d.ly = p.worldY;
          if (d.moved > 90) self.flew();
        } else if (!p.wasTouch && !p.isDown && !SR.Q.has('nomouse')) {
          if (Math.abs(p.worldX - self.S.tx) + Math.abs(p.worldY - self.S.ty) > 120) self.flew();
          self.S.tx = p.worldX; self.S.ty = p.worldY; self.clampShip();
        }
      });
      var up = function (p) { if (self.drag && p.id === self.drag.id) self.drag = null; };
      this.input.on('pointerup', up); this.input.on('pointerupoutside', up);

      SR.fit(this, 'play', this.layout);
      this.ship.setPosition(this.G.FW / 2, this.G.FH + 160); this.S.tx = this.G.FW / 2; this.S.ty = this.G.maxY - 40;
      this.events.once('shutdown', function () { self.game.events.emit('sr-gone'); });
      this.hidden = function () { if (self.state === 'play') self.game.events.emit('sr-pause'); };
      this.game.events.on('hidden', this.hidden);
      this.events.once('shutdown', function () { self.game.events.off('hidden', self.hidden); });

      var start = { n: this.level, world: this.world, boss: this.def.boss != null, name: this.def.name, hearts: this.hearts, score: 0, flown: SR.flown() };
      this.registry.set('sr', start); this.game.events.emit('sr-start', start);
      Kit.snd.play('warp', { vol: 0.9 });
      if (dbg) { dbg.play = this; }
      this.ready = true;
      if (Kit.load) Kit.load.done();
      // the next wave is a new world or a boss: its pictures load while this one is played
      var nx = this.level + 1;
      if (nx <= COUNT && (LV.worldOf(nx) !== this.world || LV.list[nx - 1].boss != null)) this.time.delayedCall(4000, function () { Kit.play.artNeed(self, A.artFor(LV.worldOf(nx), LV.list[nx - 1].boss != null)); });
    }

    /* ---------------- layout (the field is at least FW_MIN x FH_MIN units; a wider screen widens it) ---------------- */
    layout(v) {
      var G = this.G, k = v.k;
      G.FW = Math.min(v.w, SR.FW_MAX); G.FH = v.h; G.k = k;
      G.top = Math.max(v.st + 60 * k, v.st + 200 * SR.hudZoom(this) / v.z); G.bottom = v.sb - 8 * k;     // clear of the interface's top row
      G.formTop = G.top + 100 + Math.max(0, (G.FH - 1500) * 0.2);
      G.maxY = G.bottom - 92;
      G.minY = Math.min(G.maxY - 140, Math.max(G.FH * 0.46, G.formTop + 2 * ROWH + 230));
      G.bossTop = v.st + 300 * SR.hudZoom(this) / v.z;                 // below the interface's boss bar
      this.physics.world.setBounds(-100, -160, G.FW + 200, G.FH + 320);
      var land = this.scale.width > this.scale.height;
      if (land !== this.landscape) { this.landscape = land; this.bgKey = A.sky(this, this.world, land); this.bg.setTexture(this.bgKey); }
      var tex = this.textures.get(this.bgKey).getSourceImage(), cover = Math.max(v.w / tex.width, v.h / tex.height) * 1.05;
      this.bg.setPosition(G.FW / 2, G.FH / 2).setScale(cover);
      this.starsFit(v);
      this.streaks.setPosition(G.FW / 2, G.FH / 2).setSize(v.w + 4, v.h + 4);
      this.fore.forEach(function (o) { o.x = o.side < 0 ? -o.displayWidth * 0.18 : G.FW + o.displayWidth * 0.18; });
      if (this.ship) { this.S.tx = clamp(this.S.tx, 70, G.FW - 70); this.S.ty = clamp(this.S.ty, G.minY, G.maxY); }
      this.view = v;
    }
    clampShip() {
      var s = this.S, G = this.G, cx = clamp(s.tx, 70, G.FW - 70), cy = clamp(s.ty, G.minY, G.maxY), d = this.drag;
      if (d) { d.sx += cx - s.tx; d.sy += cy - s.ty; }                    // re-anchor at the edges so reversing responds at once
      s.tx = cx; s.ty = cy;
    }
    flew() { if (!SR.flown()) { SR.setFlown(); this.game.events.emit('sr-flown'); } }

    /* ---------------- the sky: one painted picture, three star layers, drifting scenery ---------------- */
    makeBackdrop() {
      var self = this, w = this.world, W = A.worldScenery(w);
      this.landscape = this.scale.width > this.scale.height;
      this.bgKey = A.sky(this, w, this.landscape);
      this.bg = depth(this.add.image(0, 0, this.bgKey), 0);
      // one tile of stars (the near ones are just bigger dots), laid out as plain images (not a TileSprite): the engine draws every
      // image of the sky, the stars, the scenery and the ships in ONE batch, where a TileSprite is a draw call of its own
      this.stars = { imgs: [], cols: 0, rows: 0, x: 0, y: 0, tx: 0, ty: 0 };
      this.streaks = depth(this.add.tileSprite(0, 0, 10, 10, 'streaks').setTileScale(2, 2).setBlendMode(ADD).setAlpha(0).setVisible(false), 3.5);
      W.mid.forEach(function (o, i) {
        var img = depth(self.add.image(Math.random() * 900, Math.random() * 1300, A.scenery(self, o.kind, o.size, w)).setAlpha(o.kind === 'rock' ? 0.85 : 0.95), 4);
        img.vy = 14 + i * 10 + (o.kind === 'rock' ? 14 : 0); self.drift(img, true);
      });
      this.fore = [];
      W.fore.forEach(function (o, f) {
        var im = depth(self.add.image(0, 0, A.scenery(self, o.kind, o.size, w)), 50);
        im.side = f % 2 ? 1 : -1; im.vy = 120 + f * 40; im.y = Math.random() * 1300; self.fore.push(im); self.drift(im, true);
      });
    }
    // an endless slow fall: down the field, then back to the top somewhere else
    drift(o, first) {
      var self = this, H = this.G.FH, from = first ? o.y : -o.displayHeight, to = H + o.displayHeight * 0.7;
      if (!first) { o.y = from; if (!o.side) o.x = Math.random() * this.G.FW; else o.y = -o.displayHeight * 1.5 - Math.random() * H; from = o.y; }
      this.tweens.add({ targets: o, y: to, duration: Math.max(500, (to - from) / o.vy * 1000), onComplete: function () { self.drift(o, false); } });
    }
    // the star tile (512 x 1024 units) repeated over the field, shifted by tx / ty: the picture of a TileSprite, made of images
    starsFit(v) {
      var T = this.stars, w = v.w + 4, h = v.h + 4, cols = Math.ceil(w / 512) + 1, rows = Math.ceil(h / 1024) + 1, self = this;
      T.x = this.G.FW / 2 - w / 2; T.y = this.G.FH / 2 - h / 2;
      while (T.imgs.length < cols * rows) T.imgs.push(depth(this.add.image(0, 0, 'stars0').setOrigin(0, 0).setAlpha(0.85), 1));
      T.imgs.forEach(function (im, i) { im.setVisible(i < cols * rows); });
      T.cols = cols; T.rows = rows; this.starsPlace();
    }
    starsPlace() {
      var T = this.stars, ox = ((T.tx % 512) + 512) % 512, oy = ((T.ty % 1024) + 1024) % 1024, n = 0;
      for (var r = 0; r < T.rows; r++) for (var c = 0; c < T.cols; c++) T.imgs[n++].setPosition(T.x + c * 512 - ox, T.y + r * 1024 - oy);
    }
    backdrop(dt) {
      var s = this.S, G = this.G, nx = s.x ? (s.x / G.FW - 0.5) * 2 : 0, warp = this.warpT > 0 ? Math.min(1, this.warpT / 0.6) : 0, sp = 1 + warp * 14;
      var T = this.stars; T.ty -= 70 * sp * dt; T.tx = -nx * 24; this.starsPlace();
      if (warp > 0 || this.streaks.visible) { this.streaks.setVisible(warp > 0).setAlpha(warp * 0.7); this.streaks.tilePositionY -= 1200 * dt; }
      this.bg.x = G.FW / 2 - nx * 14;
    }

    /* ---------------- pools ---------------- */
    makeGroups() {
      var P = this.physics.add;
      this.pickups = P.group({ defaultKey: 'sr', maxSize: 48 });
      this.enemies = P.group({ defaultKey: 'sr', maxSize: 56 });
      this.shots = P.group({ defaultKey: 'sr', defaultFrame: 'orb', maxSize: 24 });
      this.bullets = P.group({ defaultKey: 'sr', defaultFrame: 'bullet', maxSize: 36 });
      this.flashes = this.add.group({ defaultKey: 'sr', defaultFrame: 'glow', maxSize: 14 });
      // the floating words and the emitters are made now, so the first hit of a wave costs no texture upload
      this.texts = []; var self = this;
      for (var i = 0; i < 8; i++) this.texts.push(depth(this.add.bitmapText(0, 0, 'wfont', '', 40).setOrigin(0.5).setVisible(false), 40));
      [[0xffffff], [0xffe27a], [0xffffff, 0xffe27a], [0xbff8ff], [0xff8fd8]].forEach(function (c) { self.burst('spark', -999, -999, 0, c.length > 1 ? c : c[0]); });
    }
    kill(o) { o.disableBody(true, true); if (o.kids) for (var k in o.kids) o.kids[k].setVisible(false); }

    /* ---------------- the ranger ---------------- */
    makeShip() {
      var self = this;
      this.fl = [-12, 12].map(function () { return depth(self.add.image(0, 0, 'sr', 'flame').setOrigin(0.5, 0).setBlendMode(ADD), 30); });
      this.ship = depth(this.physics.add.image(450, 1500, 'sr', 'ship').setScale(U), 19);
      circ(this.ship, SHIP_R);
      this.muz = depth(this.add.image(0, 0, 'sr', 'glow').setBlendMode(ADD).setTint(0x9ff4ff).setAlpha(0).setVisible(false), 30);
      this.muzS = depth(this.add.image(0, 0, 'sr', 'spark').setBlendMode(ADD).setAlpha(0).setVisible(false), 30);
      this.sideG = [0, 1].map(function () { return depth(self.add.image(0, 0, 'sr', 'glow').setBlendMode(ADD).setTint(0xffcf6b).setAlpha(0).setVisible(false), 30); });
      this.shield = depth(this.add.image(0, 0, 'sr', 'shield').setScale(U).setVisible(false), 21);
      this.mags = [0, 1, 2].map(function (i) {
        return depth(self.add.image(0, 0, 'sr', 'magarc').setScale(U).setVisible(false), 30);
      });
      this.magOn = false;
    }
    updateShip(dt) {
      var s = this.S, sp = this.ship, G = this.G, K = this.keys, t = this.t;
      if (this.state === 'play' && !s.dead) {
        var kx = (K.RIGHT.isDown || K.D.isDown ? 1 : 0) - (K.LEFT.isDown || K.A.isDown ? 1 : 0), ky = (K.DOWN.isDown || K.S.isDown ? 1 : 0) - (K.UP.isDown || K.W.isDown ? 1 : 0);
        if ((kx || ky) && !this.blocked) { s.tx += kx * 1100 * dt; s.ty += ky * 900 * dt; this.clampShip(); this.flew(); }
        var dbg = Kit.play.debug; if (dbg && dbg.auto) this.autopilot();
      }
      // a spring: velocity toward the target, so the ship eases to the finger like the old 1 - exp(-20 dt)
      var k = this.warpT > 0 ? 6 : 20;
      if (!s.dead) sp.body.setVelocity(clamp((s.tx - sp.x) * k, -6000, 6000), clamp((s.ty - sp.y) * k, -6000, 6000)); else sp.body.setVelocity(0, 0);
      var vx = sp.body.velocity.x;
      s.x = sp.x;
      s.bank += (clamp(vx / 1100, -1, 1) - s.bank) * Math.min(1, dt * 10);
      s.thrust += (clamp(-sp.body.velocity.y / 700, 0, 1) + (this.warpT > 0 ? 1 : 0) - s.thrust) * Math.min(1, dt * 8);
      s.inv = Math.max(0, s.inv - dt); s.flash = Math.max(0, s.flash - dt * 5); s.squash = Math.max(0, s.squash - dt * 4); s.muzzle = Math.max(0, s.muzzle - dt * 14);
      if (s.shieldT > 0) s.shieldT = Math.max(0, s.shieldT - dt);
      if (s.spreadT > 0) s.spreadT = Math.max(0, s.spreadT - dt);
      if (s.magnetT > 0) s.magnetT = Math.max(0, s.magnetT - dt);
      if (this.state === 'play' && !s.dead && this.warpT <= 0.3) { s.fireT -= dt; if (s.fireT <= 0) { s.fireT = FIRE; this.fire(); } }
      if (s.dead) return;
      // looks: bank, squash, blink while it cannot be hit, hit flash
      sp.rotation = s.bank * 0.16;
      var sq = s.squash, bk = Math.abs(s.bank);
      sp.setScale(U * (1 - bk * 0.12) * (1 + sq * 0.12), U * (1 - sq * 0.12));
      sp.alpha = s.inv > 0 && this.state === 'play' ? (Math.sin(t * 34) > 0 ? 0.3 : 1) : 1;
      if (s.flash > 0.5) { sp.setTint(0xffffff).setTintMode(FILL); sp.flashed = true; } else if (sp.flashed) { sp.clearTint().setTintMode(MULT); sp.flashed = false; }
      var th = 30 + s.thrust * 26, ca = Math.cos(sp.rotation), sa = Math.sin(sp.rotation), i;
      for (i = 0; i < 2; i++) {
        var ox = (i ? 12 : -12) + s.bank * 3, oy = 58, f = 1 + Math.sin(t * 47 + i) * 0.12 + Math.sin(t * 31 + 1) * 0.08;
        this.fl[i].setPosition(sp.x + ox * ca - oy * sa, sp.y + ox * sa + oy * ca).setRotation(sp.rotation).setAlpha(sp.alpha).setScale(7 * 2.4 / (24 * S), th * f * 64 / 62 / (64 * S));
      }
      // muzzle flash, spread lights
      var m = s.muzzle;
      if (m > 0.01) {
        this.muz.setVisible(true); this.muzS.setVisible(true); this.sideG[0].setVisible(true); this.sideG[1].setVisible(true);
        var mx = sp.x - Math.sin(sp.rotation) * 76, my = sp.y - Math.cos(sp.rotation) * 76;
        this.muz.setPosition(mx, my).setScale(34 * m / 64).setAlpha(0.9 * m);
        this.muzS.setPosition(mx, my).setScale(16 * m / 30).setAlpha(m).setRotation(t * 9);
        for (i = 0; i < 2; i++) this.sideG[i].setPosition(sp.x + (i ? 58 : -58), sp.y + 2).setScale(22 * m / 64).setAlpha(s.spreadT > 0 ? 0.8 * m : 0);
      } else { this.muz.setVisible(false); this.muzS.setVisible(false); this.sideG[0].setVisible(false); this.sideG[1].setVisible(false); }
      // bubble shield
      if (s.shieldT > 0) {
        var a = Math.min(1, s.shieldT * 2) * (s.shieldT < 2 ? 0.55 + 0.45 * Math.sin(t * 20) : 1), R = (96 + Math.sin(t * 5) * 3) / 98;
        this.shield.setVisible(true).setPosition(sp.x, sp.y).setAlpha(a).setScale(U * R);
      } else this.shield.setVisible(false);
      // magnet rings (their pulse is a tween); silent: the electric hum it had was harsh (owner, 2026-11-17)
      var on = s.magnetT > 0;
      if (on !== this.magOn) {
        this.magOn = on; var self = this;
        this.mags.forEach(function (g, i) {
          g.setVisible(on); self.tweens.killTweensOf(g);          // the rings pulse by tween, only while the magnet lasts
          if (on) self.tweens.add({ targets: g, scale: { from: U, to: U * 1.9 }, alpha: { from: 0.7, to: 0 }, duration: 1200, repeat: -1, delay: i * 400 });
        });
      }
      if (on) for (i = 0; i < 3; i++) this.mags[i].setPosition(sp.x, sp.y);
    }
    fire() {
      var s = this.S, sp = this.ship, self = this;
      var shoot = function (x, y, vx, vy, gold) {
        var b = self.bullets.get(x, y); if (!b) return null;
        b.enableBody(true, x, y, true, true); b.setFrame(gold ? 'bullet-g' : 'bullet').setScale(U).setBlendMode(ADD).setDepth(30).setRotation(Math.atan2(vx, -vy)).setAlpha(1);
        b.isBolt = true; circ(b, 13); b.body.setCollideWorldBounds(true); b.body.onWorldBounds = true; b.setVelocity(vx, vy);
        return b;
      };
      shoot(sp.x, sp.y - 74, 0, -1500);
      if (s.spreadT > 0) [-1, 1].forEach(function (d) { var a = d * 0.2; shoot(sp.x + d * 58, sp.y - 6, Math.sin(a) * 1500, -Math.cos(a) * 1500, true); });
      s.muzzle = 1;
      if ((this.shotN++ & 1) === 0) Kit.snd.play('shot', { vol: 0.5, pan: this.pan(sp.x) });
    }
    pan(x) { return clamp((x - this.G.FW / 2) / this.G.FW * 1.2, -0.6, 0.6); }

    /* ---------------- the wave director ---------------- */
    aliveIn(gi) { for (var i = 0; i < this.en.length; i++) if (this.en[i].group === gi) return true; return false; }
    nextGroup() {
      var D = this.dir; D.gi++; D.gt = 0; D.spawned = 0; D.spawnT = 0; D.lastAt = 0;
      var g = this.def.g[D.gi];
      if (!g) { D.done = true; return; }
      if (g.f) this.spawnFormation(g);
      if (g.boss != null) this.spawnBoss(g.boss);
    }
    director(dt) {
      var D = this.dir; if (D.done) return;
      if (D.wait > 0) { D.wait -= dt; if (D.wait <= 0) this.nextGroup(); return; }
      var g = this.def.g[D.gi]; D.gt += dt;
      if (g.f) { if (!this.aliveIn(D.gi)) D.wait = 0.6; return; }
      if (g.boss != null) { if (!this.boss) D.wait = 0.4; return; }
      var n = g.s ? g.s.length : (g.w || g.d);
      if (D.spawned < n) {
        D.spawnT -= dt;
        if (D.spawnT <= 0) { this.spawnStream(g, D.spawned); D.spawned++; D.spawnT = g.every || 1; D.lastAt = D.gt; }
      } else if (D.gt - D.lastAt >= (g.gap || 1.4)) D.wait = 0.01;
    }

    /* ---------------- robots, drones, rocks, junk ---------------- */
    makeEnemy(kind, x, y) {
      var k = KINDS[kind], w = this.world, hp = k.hp + (k.rock || kind === 'drone' || kind === 'can' || kind === 'gear' ? 0 : w >= 3 ? 2 : w >= 1 ? 1 : 0), e;
      e = this.enemies.get(x, y, 'sr', k.frame || 'dot'); if (!e) return null;
      e.enableBody(true, x, y, true, true);
      var v = (Math.random() * 3) | 0;
      if (k.rock) e.setTexture(A.rock(this, k.r, v, w)); else e.setTexture('sr', k.frame);
      e.setScale(U).setRotation(0).setAlpha(1).setDepth(12).clearTint().setTintMode(MULT).setActive(true).setVisible(true);
      e.body.setVelocity(0, 0); e.body.setAngularVelocity(0); e.body.setAcceleration(0, 0);
      circ(e, k.r * (k.rock ? 0.9 : 0.82));
      e.kind = kind; e.hp = hp; e.maxHp = hp; e.pts = k.pts; e.mode = 'pass'; e.tt = 0; e.ph = Math.random() * 6.28; e.flash = 0; e.rot = 0; e.vr = 0;
      e.squashT = 0; e.charge = 0; e.group = this.dir ? this.dir.gi : -1; e.carrier = null; e.delay = 0; e.boost = 0; e.warn = 0; e.mvx = 0; e.mvy = 0; e.path = null;
      e.shootT = 0; e.trackT = 0; e.baseScale = U; e.radius = k.r;
      this.kids(e);
      this.en.push(e);
      return e;
    }
    // the small pictures that ride on a machine (engine flame, scanning light, carrier ring, rotor, cracks): made once, reused
    kids(e) {
      var K = e.kids || (e.kids = {}), kind = e.kind, sc = this, k;
      var need = { bot: ['fl', 'la'], tank: ['fl', 'cr'], zapper: ['fl', 'la'], drone: ['ro', 'bm'] }[kind] || [];
      var DEF = { fl: ['flame', 30, true], la: ['glow', 30, true], ri: ['ring', 30, true], ro: ['rotor', 13, false], bm: ['beam', 30, true], cr: ['tank-crack', 13, false] };
      for (k in K) K[k].setVisible(false);
      need.forEach(function (n) {
        if (!K[n]) { var d = DEF[n]; K[n] = sc.add.image(0, 0, 'sr', d[0]).setScale(U).setDepth(d[1]); if (d[2]) K[n].setBlendMode(ADD); if (n === 'fl') K[n].setOrigin(0.5, 0); }
        K[n].setVisible(n !== 'cr');
      });
      e.hot = false; e.ric = null;
      if (kind === 'bot') K.la.setTint(0x8ffcff).setScale(16 / 64);
      if (kind === 'zapper') K.la.setTint(0xff6fc4);
      if (kind === 'drone' && !e.rt) e.rt = this.tweens.add({ targets: K.ro, scaleX: { from: U * 0.12, to: U }, duration: 60 + (Math.random() * 30 | 0), yoyo: true, repeat: -1 });
    }
    // keeps the riders on their machine; called each frame for the few machines that have them
    placeKids(e, dt, t) {
      var K = e.kids; if (!K) return;
      var cs = Math.cos(e.rotation), sn = Math.sin(e.rotation), kind = e.kind, a = e.alpha;
      if (kind === 'bot' || kind === 'tank' || kind === 'zapper') {
        var B = A.BOT[kind], len = 16 + Math.sin(t * 8 + e.ph) * 3 + e.boost * 22;
        put(K.fl, e, 0, B.H / 2 + 11, cs, sn); K.fl.setScale(6 * 2.4 / (24 * S), len * 64 / 62 / (64 * S)); K.fl.alpha = a;
        if (kind === 'bot') {
          var warm = e.warn > 0; if (warm !== e.hot) { e.hot = warm; K.la.setTint(warm ? 0xff8a5c : 0x8ffcff).setScale(16 / 64); }
          put(K.la, e, Math.sin(t * (3 + e.warn * 8) + e.ph) * (B.W / 2 - 18), -B.H / 2 + 18.5, cs, sn); K.la.alpha = 0.6 * a;
        } else if (kind === 'zapper') { var c = e.charge; put(K.la, e, 0, B.H / 2 - 6, cs, sn); K.la.setScale((16 + c * 32) / 64); K.la.alpha = (0.3 + c * 0.7) * a; }
      } else if (kind === 'drone') {
        put(K.ro, e, 0, -24, cs, sn); put(K.bm, e, 0, 42, cs, sn); K.ro.alpha = a; K.bm.alpha = 0.9 * a;
      }
      if (e.carrier && !K.ri) K.ri = this.add.image(0, 0, 'sr', 'ring').setScale(U).setDepth(30).setBlendMode(ADD);
      if (e.carrier) { if (!e.ric) { e.ric = e.carrier; K.ri.setTint(SR.hex(A.PU[e.carrier].c)); } K.ri.setVisible(true).setPosition(e.x, e.y).setScale((e.radius + 22 + Math.sin(t * 6) * 4) / (72 * S)); K.ri.alpha = (0.5 + 0.3 * Math.sin(t * 6)) * a; } else if (K.ri) { K.ri.setVisible(false); e.ric = null; }
      if (kind === 'tank') { K.cr.setVisible(e.hp < e.maxHp); if (e.hp < e.maxHp) put(K.cr, e, 0, 0, cs, sn); }
    }
    // Formations never sit still: the row strafes side to side, ripples up and down and (later) breathes wider.
    spacing(cols) { var G = this.G, base = cols > 1 ? Math.min(150, (G.FW - 210) / (cols - 1)) : 0; return base * (this.world > 0 ? 1 + 0.07 * Math.sin(this.t * 0.9) : 1); }
    swayAmp(cols) { return clamp((this.G.FW - (cols - 1) * this.spacing(cols)) / 2 - 75, 45, 260); }
    slotX(e) {
      var w = this.world, tn = this.tune;
      return this.G.FW / 2 + (e.col - (e.cols - 1) / 2) * this.spacing(e.cols) + Math.sin(this.t * tn.sway + e.fph) * this.swayAmp(e.cols) * (w >= 2 ? 0.8 : 1) +
        (w >= 2 ? Math.sin(this.t * tn.sway * 2.3 + e.fph) * 36 : 0);
    }
    slotY(e) { return this.G.formTop + e.row * ROWH + Math.sin(this.t * this.tune.sway * 1.6 + e.col * 0.7) * (10 + this.world * 5); }
    entryPath(e, side, fromX, fromY) { // a curved swoop that dips down, loops back and settles into the slot
      var G = this.G, dip = Math.min(G.minY - 160, G.formTop + 380 + this.world * 60);
      e.mode = 'enter';
      e.path = { p0: [fromX, fromY], p1: [G.FW / 2 - side * G.FW * 0.2, dip], p2: [G.FW / 2 + (e.col - (e.cols - 1) / 2) * this.spacing(e.cols) + side * 240, G.formTop + e.row * ROWH + 230], t: 0, dur: 2.3 };
    }
    // enemies wait out their delay hidden and without a body, then switch on
    hold(e, delay) { e.delay = delay; e.setVisible(false); e.body.enable = false; this.hideKids(e); }
    hideKids(e) { if (e.kids) for (var k in e.kids) e.kids[k].setVisible(false); }
    spawnFormation(g) {
      var made = [], idx = 0, gside = Math.random() < 0.5 ? -1 : 1, fph = Math.random() * 6.28, self = this, G = this.G;
      g.f.forEach(function (row, r) {
        for (var c = 0; c < row.length; c++) {
          var kind = FORM[row[c]]; if (!kind) continue;
          var e = self.makeEnemy(kind, 0, -400); if (!e) continue;
          var side = gside * (r % 2 ? -1 : 1);
          e.col = c; e.cols = row.length; e.row = r; e.fph = fph;
          self.entryPath(e, side, G.FW / 2 + side * G.FW * 0.62, -130);
          e.y = -400; self.hold(e, 0.15 + idx * 0.17 + r * 0.3);
          e.shootT = self.tune.shoot ? rand(2, self.tune.shoot + 2) : 0;
          made.push(e); idx++;
        }
      });
      if (g.pu && made.length) made[(made.length / 2) | 0].carrier = g.pu;
    }
    spawnStream(g, i) {
      var G = this.G, tn = this.tune, sp = tn.speed, e, sh = this.S;
      if (g.s) {
        var kind = STREAM[g.s[i]] || 'pebble';
        if (g.from === 'alt') { // junk tumbles across from the sides
          var side = i % 2 ? 1 : -1;
          e = this.makeEnemy(kind, side < 0 ? -70 : G.FW + 70, G.top + rand(0, 300)); if (!e) return;
          e.body.setVelocity(-side * rand(110, 190) * sp, rand(60, 130) * sp); e.body.setAngularVelocity(rand(1.2, 3) * (Math.random() < 0.5 ? -1 : 1) * 57.3);
        } else { // asteroids drift diagonally at different speeds and spin
          e = this.makeEnemy(kind, rand(90, G.FW - 90), -90); if (!e) return;
          var dx = (Math.random() < 0.5 ? -1 : 1) * rand(20, 130);
          if ((e.x < G.FW * 0.3 && dx < 0) || (e.x > G.FW * 0.7 && dx > 0)) dx = -dx;
          e.body.setVelocity(dx * sp, (kind === 'rock' ? rand(90, 160) : rand(120, 230)) * sp); e.body.setAngularVelocity(rand(-2.2, 2.2) * 57.3);
        }
        e.mode = 'pass';
      } else if (g.w) { // swoop: a U whose low point leans toward the ranger
        e = this.makeEnemy('drone', 0, 0); if (!e) return;
        var s = g.side === 'alt' ? (i % 2 ? 1 : -1) : g.side === 'R' ? 1 : -1;
        var a = G.top + 30, depthY = G.formTop + (g.depth || 0.4) * (this.ship.y - G.formTop), c = (depthY - 0.25 * a) / 0.75;
        var xa = s < 0 ? -90 : G.FW + 90, lean = (this.ship.x - G.FW / 2) * tn.home;
        e.mode = 'swoop'; e.path = { p: [[xa, a], [G.FW / 2 + s * G.FW * 0.3 + lean, c], [G.FW / 2 - s * G.FW * 0.3 + lean, c], [G.FW - xa, a]], t: 0, dur: 4.6 / sp };
        e.setPosition(xa, a);
      } else { // zig-zag down, drifting toward the ranger
        e = this.makeEnemy('drone', rand(0.18, 0.82) * G.FW, -70); if (!e) return;
        e.mode = 'weave'; e.x0 = e.x; e.vyw = 170 * sp; e.amp = rand(90, 140); e.y = -70;
      }
      e.group = this.dir.gi;
    }

    updateEnemies(dt) {
      var tn = this.tune, sp = tn.speed, G = this.G, ship = this.ship, SS = this.S, t = this.t, en = this.en, i, e;
      // dives: robots leave the formation one or more at a time, wiggling first so kids see them coming
      if (this.state === 'play' && tn.dive) {
        this.diveT -= dt;
        if (this.diveT <= 0) {
          this.diveT = tn.dive * rand(0.75, 1.25);
          var diving = 0, cands = [];
          for (i = 0; i < en.length; i++) { e = en[i]; if (e.mode === 'prep' || e.mode === 'dive') diving++; else if (e.mode === 'hold' && (e.kind === 'bot' || e.kind === 'tank')) cands.push(e); }
          if (cands.length && diving < tn.divers) { var e0 = cands[(Math.random() * cands.length) | 0]; e0.mode = 'prep'; e0.tt = 0; }
        }
      }
      var tracking = 0;
      for (i = 0; i < en.length; i++) if (en[i].mode === 'track') tracking++;
      for (i = en.length - 1; i >= 0; i--) {
        e = en[i]; var ox = e.x, oy = e.y;
        if (e.flash > 0) { e.flash = Math.max(0, e.flash - dt * 7); if (e.flash > 0.5) e.setTint(0xffffff).setTintMode(FILL); else e.clearTint().setTintMode(MULT); }
        if (e.squashT > 0) { e.squashT = Math.max(0, e.squashT - dt * 5); }
        e.boost = Math.max(0, e.boost - dt * 2);
        if (e.delay > 0) { e.delay -= dt; if (e.delay <= 0) { e.setVisible(true); e.body.enable = true; this.kids(e); Kit.snd.play(e.kind === 'drone' ? 'warp' : 'whirr', { vol: 0.15 }); } continue; }
        e.tt += dt; e.warn = 0;
        if (e.mode === 'enter') {
          var P = e.path; P.t += dt / (P.dur / sp);
          var u = EASE.Sine.InOut(Math.min(1, P.t)), tx = this.slotX(e), ty = this.slotY(e);
          e.x = BEZ(u, P.p0[0], P.p1[0], P.p2[0], tx); e.y = BEZ(u, P.p0[1], P.p1[1], P.p2[1], ty);
          if (P.t >= 1) { e.mode = 'hold'; e.squashT = 1; if (e.kind === 'zapper' && tn.shoot) e.shootT = Math.min(e.shootT, rand(0.9, 1.6)); }
        } else if (e.mode === 'hold' || e.mode === 'prep') {
          e.x = this.slotX(e); e.y = this.slotY(e);
          if (e.mode === 'prep') { // anticipation: wiggle and glow, longer in world 1
            var warnT = this.world === 0 ? 1.1 : 0.65;
            e.warn = 1; e.x += Math.sin(e.tt * 40) * 8; e.squashT = 0.5;
            if (e.tt > warnT) {
              var sd = e.x < ship.x ? 1 : -1;
              e.mode = 'dive'; e.tt = 0; e.boost = 1; Kit.snd.play('whirr', { vol: 0.6, pan: this.pan(e.x) });
              e.path = { p: [[e.x, e.y], [e.x - sd * 200, e.y + 230], [ship.x + SS.vx * 0.25, ship.y - 40], [ship.x + sd * 160, G.FH + 150]], t: 0, dur: 2.9 / tn.diveSpeed };
            }
          }
          if (e.kind === 'zapper' && tn.shoot && this.state === 'play') {
            if (e.mode === 'hold' && tn.track && tracking < Math.max(1, this.world) && Math.random() < dt * 0.2) { e.mode = 'track'; e.trackT = rand(3.5, 5.5); tracking++; }
            this.zap(e, dt);
          }
        } else if (e.mode === 'track') { // follow the ranger along a lower lane, still sparking, then fly back up
          var vv = 160 * sp, lane = Math.max(this.slotY(e) + 110, G.minY - 340);
          e.x += clamp(ship.x - e.x, -vv * dt, vv * dt); e.y += (lane - e.y) * Math.min(1, dt * 3);
          e.trackT -= dt; this.zap(e, dt);
          if (e.trackT <= 0) { e.mode = 'enter'; e.path = { p0: [e.x, e.y], p1: [e.x, e.y - 60], p2: [this.slotX(e), this.slotY(e) + 60], t: 0, dur: 1.2 }; }
        } else if (e.mode === 'dive') {
          var D = e.path; D.t += dt / D.dur; e.boost = 1;
          var q = Math.min(1, D.t); e.x = BEZ(q, D.p[0][0], D.p[1][0], D.p[2][0], D.p[3][0]); e.y = BEZ(q, D.p[0][1], D.p[1][1], D.p[2][1], D.p[3][1]);
          if (D.t >= 1) { var s2 = Math.random() < 0.5 ? -1 : 1; this.entryPath(e, s2, this.slotX(e) + s2 * 360, -130); }
        } else if (e.mode === 'swoop') {
          var W2 = e.path; W2.t += dt / W2.dur; var q2 = Math.min(1, W2.t);
          e.x = BEZ(q2, W2.p[0][0], W2.p[1][0], W2.p[2][0], W2.p[3][0]); e.y = BEZ(q2, W2.p[0][1], W2.p[1][1], W2.p[2][1], W2.p[3][1]);
          if (W2.t >= 1) { this.drop(e, i); continue; }
        } else if (e.mode === 'weave') {
          e.y += e.vyw * dt; e.x0 += (ship.x - e.x0) * tn.home * dt * 1.5;
          var ph = e.tt * 1.9 + e.ph; e.x = e.x0 + e.amp * (2 / Math.PI) * Math.asin(Math.sin(ph));       // zig-zag
          if (e.y > G.FH + 90) { this.drop(e, i); continue; }
        } else {                                                         // pass: the engine moves rocks and junk
          if (e.y > G.FH + 140 || (e.x < -160 && e.body.velocity.x < 0) || (e.x > G.FW + 160 && e.body.velocity.x > 0)) { this.drop(e, i); continue; }
        }
        if (e.mode !== 'pass') {
          e.mvx = (e.x - ox) / dt; e.mvy = (e.y - oy) / dt;
          e.rot = e.kind === 'drone' ? clamp(e.mvx / 1600, -0.35, 0.35) : clamp(e.mvx / 2400, -0.25, 0.25);
          e.setRotation(e.rot);
          var sq = e.squashT; e.setScale(U * (1 + sq * 0.14), U * (1 - sq * 0.14));
        } else if (e.squashT > 0) { var sq2 = e.squashT; e.setScale(U * (1 + sq2 * 0.14), U * (1 - sq2 * 0.14)); }
        if (e.kids) this.placeKids(e, dt, t);
      }
    }
    // a machine leaves the field without a blast
    drop(e, i) { this.kill(e); if (i == null) i = this.en.indexOf(e); if (i >= 0) { this.en[i] = this.en[this.en.length - 1]; this.en.pop(); } }
    zap(e, dt) { // zappers: a short burst of slow, bright sparks (aimed in later worlds)
      var tn = this.tune, ship = this.ship;
      e.shootT -= dt;
      e.charge = e.shootT < 0.8 ? clamp(1 - e.shootT / 0.8, 0.01, 1) : 0;
      if (e.shootT <= 0) {
        if (this.shots.countActive(true) < 4 + Math.min(this.world, 2) * 2 && e.y < ship.y - 280) { this.fireBurst(e); e.shootT = tn.shoot * rand(0.9, 1.5); }
        else e.shootT = 0.9;
        e.charge = 0;
      }
    }
    fireBurst(e) {
      var tn = this.tune, n = tn.burst || 1, self = this;
      for (var k = 0; k < n; k++) (function (k) { self.later(k * 0.2, function () {
        if (!e.active || self.en.indexOf(e) < 0 || self.state !== 'play') return;
        var a = (tn.aim ? self.aimAt(e.x, e.y + 44, 0.55) : Math.PI / 2) + (n > 1 ? (k / (n - 1) - 0.5) * 0.16 : 0);
        self.fireOrb(e.x, e.y + 44, a, tn.shot, tn.homing); Kit.snd.play('spark', { vol: 0.45, pan: self.pan(e.x) }); e.squashT = 1;
      }); })(k);
    }
    later(sec, fn) { var self = this, ev = this.time.delayedCall(sec * 1000, function () { var i = self.laters.indexOf(ev); if (i >= 0) self.laters.splice(i, 1); fn(); }); this.laters.push(ev); return ev; }
    clearLaters() { this.laters.forEach(function (ev) { ev.remove(false); }); this.laters = []; }

    /* ---------------- sparks (enemy shots) ---------------- */
    fireOrb(x, y, ang, speed, home) {
      speed *= clamp(this.G.FH / 1450, 1, 1.35);                // tall fields: same travel time as landscape
      var s = this.shots.get(x, y); if (!s) return;
      s.enableBody(true, x, y, true, true); s.setFrame('orb').setScale(U).setDepth(17).setAlpha(1).setActive(true).setVisible(true);
      s.isShot = true; s.home = home || 0; s.ph = Math.random() * 6; circ(s, 14);
      s.body.setCollideWorldBounds(true); s.body.onWorldBounds = true; s.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
    }
    aimAt(x, y, lim) { return clamp(Math.atan2(this.ship.y - y, this.ship.x - x), Math.PI / 2 - lim, Math.PI / 2 + lim); }
    updateShots(dt) {
      var ship = this.ship, t = this.t, list = this.shots.getChildren(), i, s;
      for (i = 0; i < list.length; i++) {
        s = list[i]; if (!s.active) continue;
        if (s.home && s.y >= ship.y - 300) s.home = 0;          // once close, a spark flies straight for good (fair last-moment dodge)
        if (s.home && !this.S.dead) {                           // gentle homing bubbles: they curve a little toward the ranger
          var b = s.body, cur = Math.atan2(b.velocity.y, b.velocity.x), want = Math.atan2(ship.y - s.y, ship.x - s.x), spd = b.velocity.length();
          var na = Phaser.Math.Angle.RotateTo(cur, want, s.home * dt); b.setVelocity(Math.cos(na) * spd, Math.sin(na) * spd);
        }
        s.setScale(U * (s.scale0 || 1) * (1 + Math.sin(t * 14 + s.ph) * 0.12));
      }
    }

    /* ---------------- stars and power-ups ---------------- */
    dropStar(x, y) {
      var p = this.pickups.get(x, y, 'sr', 'star'); if (!p) return;
      p.enableBody(true, x, y, true, true); p.setFrame('star').setScale(U).setDepth(10).setAlpha(1).setRotation(0).setActive(true).setVisible(true);
      p.type = 'star'; circ(p, 50); p.ph = Math.random() * 6; p.setVelocity(rand(-160, 160), rand(-200, 40));
      if (p.ring) p.ring.setVisible(false);
      this.tweens.killTweensOf(p);
      this.tweens.add({ targets: p, scaleX: { from: U, to: U * 0.18 }, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 500 });
    }
    dropPower(type, x, y) {
      var p = this.pickups.get(x, y, 'sr', 'pu-' + type); if (!p) return;
      p.enableBody(true, x, y, true, true); p.setFrame('pu-' + type).setScale(U).setDepth(10).setAlpha(1).setRotation(0).setActive(true).setVisible(true);
      p.type = type; circ(p, 64); p.ph = Math.random() * 6; p.setVelocity(0, -60);
      this.tweens.killTweensOf(p);
      this.tweens.add({ targets: p, scale: { from: U * 0.95, to: U * 1.05 }, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      if (!p.ring) { p.ring = this.add.image(0, 0, 'sr', 'dashring').setScale(U * 1.0).setBlendMode(ADD).setDepth(30); this.tweens.add({ targets: p.ring, angle: 360, duration: 9000, repeat: -1 }); }
      p.ring.setTint(SR.hex(A.PU[type].c)).setVisible(true);
    }
    updatePickups(dt) {
      var list = this.pickups.getChildren(), ship = this.ship, S_ = this.S, pull = S_.magnetT > 0 || this.state === 'clear', G = this.G, i, p;
      for (i = 0; i < list.length; i++) {
        p = list[i]; if (!p.active) continue;
        var star = p.type === 'star', b = p.body;
        if (p.ring) p.ring.setPosition(p.x, p.y);
        if (pull && !S_.dead && (star || this.state === 'clear')) this.physics.moveToObject(p, ship, this.state === 'clear' ? 1100 : 900);
        else {
          b.velocity.x *= Math.pow(0.08, dt);
          var target = star ? 230 : 130; b.velocity.y += (target - b.velocity.y) * Math.min(1, dt * 2.5);
          if (star && !S_.dead) { var dd = Phaser.Math.Distance.Between(p.x, p.y, ship.x, ship.y); if (dd < 190) this.physics.moveToObject(p, ship, 520); }
        }
        if (p.y > G.FH + 80) this.killPick(p);
      }
    }
    killPick(p) { p.disableBody(true, true); this.tweens.killTweensOf(p); if (p.ring) p.ring.setVisible(false); }
    shipGets(ship, p) {
      if (!p.active || this.S.dead || this.state === 'fail') return;
      var type = p.type, x = p.x, y = p.y; this.killPick(p);
      if (type === 'star') {
        this.starsGot++; this.score += 10; this.stat();
        Kit.snd.play('collect', { vol: 0.5, pan: this.pan(x) }); Kit.buzz(4);
        this.burst('spark', x, y, 4, 0xffe27a);
        return;
      }
      var P = A.PU[type], s = this.S;
      Kit.snd.play('power', { vol: 0.7 }); Kit.buzz(15);
      this.burst('starp', ship.x, ship.y, 14, SR.hex(P.c));
      this.popText(ship.x, ship.y - 130, P.label, { color: P.c, size: 56 });
      s.squash = 1;
      if (type === 'spread') s.spreadT = 12;
      else if (type === 'shield') { s.shieldT = 15; Kit.snd.play('shield', { vol: 0.7 }); }
      else if (type === 'magnet') { s.magnetT = 12; }
      else if (type === 'heart') { this.hearts = Math.min(MAX_HEARTS, this.hearts + 1); this.stat(true); }
    }

    /* ---------------- hits ---------------- */
    bulletHitsEnemy(b, e) {
      if (!b.isBolt) { var tmp = b; b = e; e = tmp; }                   // (the engine may hand the pair over in either order)
      if (!b.active || !e.active) return;
      this.kill(b);
      this.hitEnemy(e, b);
    }
    hitEnemy(e, b) {
      e.hp--; e.flash = 1; e.squashT = 0.8;
      var k = KINDS[e.kind];
      if (b) { e.y -= 4; this.burst('spark', b.x, b.y + 10, 3, 0xffffff); }
      if (e.hp > 0) { Kit.snd.play(k.rock ? 'chip' : 'hit', { vol: 0.7, pan: this.pan(e.x) }); return; }
      this.drop(e);
      var w = this.world, cols = k.rock ? [A.WORLDS[w].rock, A.shade(A.WORLDS[w].rock, -0.4), A.shade(A.WORLDS[w].rock, 0.4), '#ffffff'] : k.cols;
      var big = e.kind === 'rock' || e.kind === 'tank' || e.kind === 'sat';
      this.boom(e.x, e.y, k.r, cols);
      this.cameras.main.shake(big ? 130 : 90, big ? 0.0025 : 0.0012);
      var snd = k.rock ? 'crack' : e.kind === 'drone' ? 'zap' : (e.kind === 'can' || e.kind === 'gear' || e.kind === 'sat') ? 'hit' : 'pop';
      Kit.snd.play(snd, { vol: big ? 1 : 0.8, pan: this.pan(e.x) });
      if (big && snd === 'pop') Kit.snd.play('thud', { vol: 0.5, pan: this.pan(e.x) });
      this.combo = this.t - this.lastKill < 1.4 ? this.combo + 1 : 1; this.lastKill = this.t;
      var mult = Math.min(this.combo, 5), pts = e.pts * mult;
      this.score += pts; this.stat(false, true);
      var cheer = { 3: 'Nice!', 5: 'Great!', 8: 'Super!', 12: 'Amazing!', 16: 'Star Ranger!' }[this.combo];
      if (cheer) this.popText(this.tx(e.x), e.y - 30, cheer, { color: '#fff6c2', size: 64 });
      else this.popText(this.tx(e.x), e.y, '+' + pts + (mult > 1 ? ' x' + mult : ''), { size: 40, rise: 70, life: 750, color: mult > 1 ? '#ffe27a' : '#ffffff' });
      for (var s = 0; s < k.stars; s++) this.dropStar(e.x, e.y);
      if (e.kind === 'rock') { var self = this; [-1, 1].forEach(function (d) { var pb = self.makeEnemy('pebble', e.x + d * 20, e.y); if (!pb) return; pb.body.setVelocity(d * rand(70, 110), Math.max(110, e.body.velocity.y * 0.9)); pb.body.setAngularVelocity(d * 2 * 57.3); pb.group = e.group; }); }
      if (e.carrier) this.dropPower(e.carrier, e.x, e.y);
      else if (this.hearts < 3 && Math.random() < 0.05 && !this.pickups.getChildren().some(function (p) { return p.active && p.type !== 'star'; })) this.dropPower('heart', e.x, e.y);
    }
    shipHitsEnemy(ship, e) {
      var s = this.S; if (!e.active || s.dead || Kit.play.debug && Kit.play.debug.god || s.inv > 0) return;
      this.hurt(e.x, e.y);
      e.hp = Math.min(e.hp, 1); this.hitEnemy(e, null);
    }
    shipHitsShot(ship, sh) {
      var s = this.S; if (!sh.active || s.dead || Kit.play.debug && Kit.play.debug.god || s.inv > 0) return;
      this.kill(sh); this.burst('spark', sh.x, sh.y, 8, 0xff8fd8);
      this.hurt(sh.x, sh.y);
    }
    shipHitsBoss(ship, bc) {
      var b = this.boss, s = this.S; if (!b || b.dead || b.enterT <= 2 || s.inv > 0 || s.dead || Kit.play.debug && Kit.play.debug.god) return;
      this.hurt(ship.x, ship.y);
    }
    tx(x) { return clamp(x, 140, this.G.FW - 140); }
    hurt(x, y) {
      var s = this.S, sp = this.ship;
      if (s.shieldT > 0) {
        s.shieldT = 0; s.inv = 1; Kit.snd.play('pop', { vol: 0.8, rate: 1.5 });
        this.burst('spark', sp.x, sp.y, 22, 0xbff8ff);
        this.popText(this.tx(sp.x), sp.y - 120, 'Blocked!', { color: '#bff8ff', size: 52 });
        this.cameras.main.shake(100, 0.002);
        return;
      }
      this.hearts--; this.combo = 0;
      s.inv = this.world ? 1.6 : 2; s.flash = 1; s.squash = 1;
      Kit.snd.play('hurt', { vol: 1 }); this.cameras.main.shake(180, 0.005); Kit.buzz(45);
      this.burst('dot', sp.x, sp.y, 14, [0xff8070, 0xffffff, 0xffd36b]);
      this.stat(true);
      if (this.hearts <= 0) { this.shipDown(); return; }
      this.popText(this.tx(sp.x), sp.y - 130, this.hearts === 1 ? 'Last heart!' : '-1 heart', { size: 52, color: '#ffd1dc', life: 1100 });
    }
    shipDown() {
      var s = this.S, sp = this.ship, self = this;
      s.dead = true; this.state = 'fail'; this.drag = null; sp.setVisible(false); sp.body.enable = false;
      this.fl.forEach(function (f) { f.setVisible(false); }); 
      this.boom(sp.x, sp.y, 120, ['#ff8070', '#ffffff', '#ffd36b', '#7ff6ff']);
      Kit.snd.play('down', { vol: 1 }); this.cameras.main.shake(260, 0.006);
      this.time.delayedCall(1400, function () { if (self.state === 'fail') self.game.events.emit('sr-result', { kind: 'fail', level: self.level, world: self.world }); });
    }

    /* ---------------- effects ---------------- */
    stat(hurt, bump) { this.game.events.emit('sr-stat', { hearts: this.hearts, score: this.score, hurt: !!hurt, bump: !!bump }); }
    // a pooled emitter per picture and colour set; explode() fires its burst
    emitter(key, tint, o) {
      var id = key + '|' + (Array.isArray(tint) ? tint.join(',') : tint), em = this.ems[id];
      if (!em) {
        var FR = 32 * S, cfg = { frame: key, emitting: false, tint: tint, lifespan: o.life, speed: { min: o.v0, max: o.v1 }, scale: { start: o.size / FR, end: 0 },
          alpha: { start: 1, end: 0 }, rotate: o.spin ? { min: 0, max: 360 } : 0, blendMode: o.add ? 'ADD' : 'NORMAL', gravityY: 0 };
        em = this.ems[id] = depth(this.add.particles(0, 0, 'sr', cfg).setVisible(false), o.add ? 32 : 22); this.emList.push(em); em.life = o.life / 1000 + 0.15;
      }
      return em;
    }
    // an emitter is drawn only while its particles live (a hidden object costs the renderer nothing)
    pop(em, n, x, y) { em.setVisible(true); em.until = this.t + em.life; em.explode(n, x, y); }
    burst(key, x, y, n, tint) {
      var sp = key === 'dot';
      this.pop(this.emitter(key, tint, { life: sp ? 600 : 330, v0: sp ? 120 : 130, v1: sp ? 380 : 340, size: sp ? 34 : 30, add: !sp, spin: !sp }), n, x, y);
    }
    boom(x, y, r, cols) {
      var tints = cols.map(SR.hex);
      this.pop(this.emitter('dot', tints, { life: 750, v0: 120 + r * 1.5, v1: 260 + r * 3, size: 20 + r * 0.32, add: false }), Math.round(8 + r / 6), x, y);
      this.burst('spark', x, y, 6, [0xffffff, 0xfff3c4]);
      this.flash(x, y, r * 1.6, SR.hex(cols[1] || '#ffffff'), 350);
    }
    flash(x, y, r, tint, life) {
      var g = this.flashes.get(x, y); if (!g) return;
      g.setActive(true).setVisible(true).setPosition(x, y).setTint(tint).setBlendMode(ADD).setDepth(31).setAlpha(0.9).setScale(r * 0.4 / 64);
      this.tweens.add({ targets: g, scale: r * 1.3 / 64, alpha: 0, duration: life, ease: 'Cubic.easeOut', onComplete: function () { g.setActive(false).setVisible(false); } });
    }
    // floating words (+100, Nice!, Shield!): a few text objects used again
    popText(x, y, s, o) {
      var t = this.texts.find(function (q) { return !q.visible; });
      if (!t) return;
      t.setText(s).setTint(SR.hex(o.color || '#ffffff')).setFontSize(o.size || 40).setPosition(x, y).setAlpha(1).setVisible(true).setScale(0.6);
      var self = this; this.tweens.killTweensOf(t);
      this.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.easeOut' });
      this.tweens.add({ targets: t, y: y - (o.rise || 100), alpha: 0, duration: o.life || 900, delay: 150, ease: 'Sine.easeIn', onComplete: function () { t.setVisible(false); } });
    }

    /* ---------------- boss machines (no faces: each has one glowing core, its weak point) ---------------- */
    makeBoss(id) {
      var B = A.BOSSES[id], self = this, kids = [], add = function (o, d) { kids.push(o); return o; };
      var im = function (key, frame, x, y, addb) { var o = self.add.image(x, y, key, frame == null ? undefined : frame).setScale(U); if (addb) o.setBlendMode(ADD); return o; };
      var K = this.bk = {};
      if (id === 2) K.ringB = add(im('bring-back', null, 0, 0));
      if (id === 0) K.fl = [-90, 0, 90].map(function (x) { return add(im('sr', 'flame', x, 118, true).setOrigin(0.5, 0)); });
      if (id === 1) { K.fl = [-110, 110].map(function (x) { return add(im('sr', 'flame', x, 100, true).setOrigin(0.5, 0)); }); K.drill = add(im('bdrill', null, 0, 112)); this.tweens.add({ targets: K.drill, angle: 360, duration: 3900, repeat: -1 }); }
      if (id === 3) K.fl = [-120, 120].map(function (x) { return add(im('sr', 'flame', x, 70, true).setOrigin(0.5, 0)); });
      K.body = add(im('boss' + id, null, 0, 0));
      K.c1 = add(im('bcrack' + id + '-1', null, 0, 0).setVisible(false)); K.c2 = add(im('bcrack' + id + '-2', null, 0, 0).setVisible(false));
      var co = B.core;
      K.g1 = add(im('sr', 'glow', co[0], co[1], true)); K.g2 = add(im('sr', 'glow', co[0], co[1], true)); K.dot = add(im('sr', 'dot', co[0], co[1], true).setTint(0xffffff));
      if (id === 2) { K.iris = add(im('biris', null, co[0], co[1])); this.tweens.add({ targets: K.iris, angle: 360, duration: 5200, repeat: -1 }); K.ringF = add(im('bring-front', null, 0, 0)); K.lights = []; for (var i = 0; i < 12; i++) K.lights.push(add(im('sr', 'glow', 0, 0, true).setScale(13 / 64).setTint(i % 2 ? 0xff7ad9 : 0x7dfcff))); add(im('sr', 'glow', -38, -152, true).setTint(0xffe27a).setScale(14 / 64)); }
      if (id === 0) { K.dish = add(im('bdish', null, 112, -142)); this.tweens.add({ targets: K.dish, scaleX: { from: U, to: U * 0.12 }, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); add(im('sr', 'glow', 112, -132, true).setTint(0xff7a8a).setScale(12 / 64)); }
      if (id === 1) for (var j = 0; j < 4; j++) { var lg = add(im('sr', 'glow', -15 + j * 30, -116, true).setTint(0xffe27a).setScale(10 / 64).setAlpha(0.25)); this.tweens.add({ targets: lg, alpha: 0.95, duration: 120, yoyo: true, repeat: -1, repeatDelay: 600, delay: j * 250 }); }
      if (id === 3) { K.wands = [-120, 120].map(function (x) { return add(im('bwand', null, x, 64).setOrigin(0.5, 0.25)); }); K.lights = []; for (var q = 0; q < 9; q++) { var lq = add(im('sr', 'glow', -200 + q * 50, 22 + Math.abs(q - 4) * -3, true).setTint(q % 2 ? 0xff7ad9 : 0xffe27a).setScale(12 / 64).setAlpha(0.25)); K.lights.push(lq); this.tweens.add({ targets: lq, alpha: 0.9, duration: 130, yoyo: true, repeat: -1, repeatDelay: 250, delay: (q % 3) * 110 }); } }
      var c = this.bossC = this.add.container(450, -400, kids).setSize(B.rx * 2, B.ry * 2).setDepth(14).setVisible(false);
      this.physics.add.existing(c); c.body.setSize(B.rx * 1.8, B.ry * 1.8); c.body.setOffset(B.rx * 0.1, B.ry * 0.1); c.body.enable = false;
      this.core = this.add.zone(0, 0, (B.core[2] + 14) * 2, (B.core[2] + 14) * 2); this.physics.add.existing(this.core); this.core.body.setCircle(B.core[2] + 14); this.core.body.enable = false;
      // the machine's ring lights and the three states of the glow are driven in updateBoss
    }
    spawnBoss(id) {
      var B = A.BOSSES[id], hp = LV.bossHp[id], G = this.G;
      var b = this.boss = { id: id, x: G.FW / 2, y: -300, hp: hp, maxHp: hp, t: 0, enterT: 0, flash: 0, m: 0, atkT: 2.2, atkI: 0, dead: false, deadT: 0, tilt: 0, charge: 0, chargeT: 0, chargeFn: null,
        thrust: 0, sparkT: 0, damage: 0, coreC: 0x7dfcff, phase: 1, dash: null, aim: Math.PI / 2, vx: 0, vy: 0 };
      this.bossC.setVisible(true).setPosition(b.x, b.y); this.bossC.body.enable = true; this.core.body.enable = true;
      this.bannerT = 0;
      this.game.events.emit('sr-boss', { show: true, name: B.name, color: B.color, hp: hp, max: hp, banner: true });
      Kit.snd.play('warp', { vol: 1, rate: 0.7 }); this.later(1.3, function () { Kit.snd.play('thud', { vol: 0.9 }); });
    }
    bossHome() { var B = A.BOSSES[this.boss.id]; return Math.max(this.G.formTop + 80, this.G.bossTop + B.h * 0.4); }
    bossPattern(b) { // where the machine flies when it isn't dashing
      var mid = this.G.FW / 2, B = A.BOSSES[b.id], range = Math.max(0, mid - B.rx - 50), home = this.bossHome(), m = b.m;
      if (b.id === 0) return [mid + Math.sin(m * 0.6) * range, home + Math.sin(m * 1.2) * 45];
      if (b.id === 1) return [mid + Math.sin(m * 0.7) * range, home + Math.sin(m * 1.4) * 55];
      if (b.id === 2) return [mid + Math.cos(m * 0.75) * range, home + 30 + Math.sin(m * 0.75) * 70];
      return [mid + Math.sin(m * 0.55) * range * 0.85 + Math.sin(m * 1.9) * Math.min(80, range * 0.15), home + Math.sin(m * 0.9) * 60];
    }
    bossAttack(b, fn, chargeTime) { b.chargeFn = fn; b.chargeT = chargeTime; b.chargeMax = chargeTime; }
    bossDoAttack(b, name) {
      var self = this, tn = this.tune, sp = tn.speed, shot = tn.shot, B = A.BOSSES[b.id], ship = this.ship;
      var guard = function () { return self.boss && !self.boss.dead && self.state === 'play'; };
      if (name === 'gears') { [-1, 1].forEach(function (s) { var e = self.makeEnemy('gear', b.x + s * 196, b.y + 110); if (!e) return; e.group = -1; e.body.setVelocity(s * 50, 130 * sp); e.body.setAngularVelocity(s * 2.5 * 57.3); }); Kit.snd.play('spark', { vol: 0.5 }); }
      else if (name === 'swoop') this.summonSwoop(b.id === 0 ? 4 : 5, b.id === 0 ? 0.3 : 0.75);
      else if (name === 'weave') this.summonWeave(3);
      else if (name === 'fan') this.bossAttack(b, function () { [-0.42, 0, 0.42].forEach(function (a) { self.fireOrb(b.x, b.y + 110, Math.PI / 2 + a, 160); }); Kit.snd.play('spark', { vol: 0.5 }); }, 1.1);
      else if (name === 'pebbles') { var lean = clamp((ship.x - b.x) / 4, -120, 120); [-2, -1, 0, 1, 2].forEach(function (s) { var e = self.makeEnemy('pebble', b.x + s * 30, b.y + 170); if (!e) return; e.group = -1; e.body.setVelocity(s * 70 + lean, 170 * sp); e.body.setAngularVelocity(rand(-2, 2) * 57.3); }); Kit.snd.play('spark', { vol: 0.5 }); }
      else if (name === 'burst') this.bossAttack(b, function () { for (var k = 0; k < 4; k++) self.later(k * 0.22, function () { if (guard()) { self.fireOrb(b.x, b.y + 110, self.aimAt(b.x, b.y + 110, 0.6), shot, tn.homing); Kit.snd.play('spark', { vol: 0.4 }); } }); }, 0.9);
      else if (name === 'dash') this.bossAttack(b, function () { var p = self.bossPattern(b); b.dash = { t: 0, dur: 1.9, dx: clamp(ship.x, B.rx, self.G.FW - B.rx) - p[0], depth: Math.max(120, ship.y - 20 - self.bossHome() - B.ry * 0.45) }; Kit.snd.play('warp', { vol: 0.7, rate: 0.8 }); }, 1.1);
      else if (name === 'ring') this.bossAttack(b, function () { var off = Math.random() * 6.28, n = b.phase > 1 ? 12 : 10;
        for (var i = 0; i < n; i++) { var a = off + i / n * 6.283; if (Math.sin(a) > -0.3) self.fireOrb(b.x + Math.cos(a) * 120, b.y + B.core[1] + Math.sin(a) * 110, a, 170); }
        if (b.id === 3) self.fireOrb(b.x, b.y + 80, self.aimAt(b.x, b.y + 80, 0.6), shot);
        Kit.snd.play('spark', { vol: 0.5 }); }, 1);
      else if (name === 'spiral') this.bossAttack(b, function () { var a0 = Math.random() * 6.28; for (var k = 0; k < 14; k++) (function (k) { self.later(k * 0.12, function () { if (guard()) { var a = a0 + k * 0.5; if (Math.sin(a) > -0.2) self.fireOrb(b.x + Math.cos(a) * 60, b.y + Math.sin(a) * 60, a, 180); } }); })(k); Kit.snd.play('spark', { vol: 0.5 }); }, 0.9);
      else if (name === 'wands') this.bossAttack(b, function () { [-120, 120].forEach(function (x, j) { for (var k = 0; k < 3; k++) self.later(j * 0.11 + k * 0.24, function () { if (guard()) { var ox = b.x + x, oy = b.y + 100; self.fireOrb(ox, oy, self.aimAt(ox, oy, 0.7), shot, tn.homing); Kit.snd.play('spark', { vol: 0.4 }); } }); }); }, 0.9);
    }
    summonSwoop(n, depthV) { var self = this, g = { w: n, side: Math.random() < 0.5 ? 'L' : 'R', depth: depthV }; for (var i = 0; i < n; i++) (function (i) { self.later(i * 0.45, function () { self.spawnStream(g, i); var e = self.en[self.en.length - 1]; if (e) e.group = -1; }); })(i); }
    summonWeave(n) { var self = this, g = { d: n }; for (var i = 0; i < n; i++) this.later(i * 0.6, function () { self.spawnStream(g, 0); var e = self.en[self.en.length - 1]; if (e) e.group = -1; }); }
    updateBoss(dt) {
      var b = this.boss, B = A.BOSSES[b.id], K = this.bk, c = this.bossC, G = this.G, self = this, t = this.t, ship = this.ship;
      b.t += dt;
      if (b.dead) return;
      if (b.flash > 0) { b.flash = Math.max(0, b.flash - dt * 7); if (b.flash > 0.6) K.body.setTint(0xffffff).setTintMode(FILL); else K.body.clearTint().setTintMode(MULT); }
      if (b.enterT < 2.2) {
        b.enterT += dt; var k = Math.min(1, b.enterT / 2.2);
        b.y = Phaser.Math.Linear(-B.h * 0.7, this.bossHome(), EASE.Back.Out(k)); b.x = G.FW / 2; b.thrust = 1 - k; b.m = 0;
        c.setPosition(b.x, b.y); this.bossLooks(b, t); return;
      }
      // phase change at half health: the core turns hot orange, sparks; red near the end
      var frac = b.hp / b.maxHp;
      b.damage = frac < 0.34 ? 2 : frac < 0.67 ? 1 : 0;
      if (b.phase === 1 && frac < 0.5) { b.phase = 2; this.cameras.main.shake(250, 0.004); Kit.snd.play('crack', { vol: 0.8, rate: 0.8 }); this.burst('spark', b.x, b.y, 22, [0xffb347, 0xffffff, 0xffd36b]); }
      b.coreC = frac < 0.25 ? 0xff6b6b : b.phase > 1 ? 0xffb347 : 0x7dfcff;
      var speed = (b.phase > 1 ? 1.35 : 1) * (b.id === 0 ? 0.8 : 1) * this.tune.speed;
      if (!b.dash) b.m += dt * speed;
      var p = this.bossPattern(b), ox = 0, oy = 0;
      if (b.dash) { var D = b.dash; D.t += dt; var u = Math.min(1, D.t / D.dur), w = Math.sin(u * Math.PI); ox = D.dx * w; oy = D.depth * w; b.thrust = 1; if (u >= 1) b.dash = null; }
      else b.thrust = 0.3 + 0.2 * Math.sin(b.t * 3);
      var nx = p[0] + ox, ny = p[1] + oy;
      b.tilt = clamp((nx - b.x) / Math.max(dt, 1e-3) / 2400, -0.12, 0.12);
      b.x = nx; b.y = ny; c.setPosition(nx, ny); c.setRotation(b.tilt);
      b.aim += (Math.atan2(ship.y - b.y, ship.x - b.x) - b.aim) * Math.min(1, dt * 4);
      b.sparkT -= dt;
      if (b.damage && b.sparkT <= 0) { b.sparkT = b.damage > 1 ? 0.18 : 0.4; this.burst('spark', b.x + rand(-B.rx * 0.8, B.rx * 0.8), b.y + rand(-B.ry * 0.6, B.ry * 0.6), 3, [0xffd36b, 0xffffff]); }
      this.bossLooks(b, t);
      if (b.chargeFn) { b.chargeT -= dt; b.charge = 1 - b.chargeT / b.chargeMax; if (b.chargeT <= 0) { var f = b.chargeFn; b.chargeFn = null; b.charge = 0; f(); } return; }
      if (this.state !== 'play' || b.dash) return;
      b.atkT -= dt;
      if (b.atkT <= 0) {
        var list = BOSS_ATTACKS[b.id];
        this.bossDoAttack(b, list[b.atkI % list.length]); b.atkI++;
        b.atkT = [3.1, 2.1, 2.2, 1.9][b.id] * (b.phase > 1 ? 0.75 : 1);
      }
    }
    // flames, the glowing core, cracks, ring lights, wands: set from the machine's state
    bossLooks(b, t) {
      var K = this.bk, B = A.BOSSES[b.id], co = B.core, pulse = 0.65 + 0.35 * Math.sin(t * (b.damage > 1 ? 14 : 5)), ch = b.charge || 0, i;
      if (K.fl) for (i = 0; i < K.fl.length; i++) { var base = b.id === 0 ? 34 : b.id === 1 ? 26 : 24, w = b.id === 0 ? 13 : 10, len = (base + (b.thrust || 0) * (b.id === 0 ? 30 : 26)) * (1 + Math.sin(t * 47 + i) * 0.1); K.fl[i].setScale(w * 2.4 / (24 * S), len * 64 / 62 / (64 * S)); }
      var tint = b.coreC;
      K.g1.setTint(tint).setScale(co[2] * 1.9 / 64).setAlpha(Math.min(1, 0.45 * pulse + ch * 0.5));
      K.g2.setTint(tint).setScale(co[2] * 0.9 / 64).setAlpha(0.9);
      K.dot.setScale(co[2] * (0.28 + ch * 0.25) / 32).setAlpha(0.7 + 0.3 * pulse);
      K.c1.setVisible(b.damage === 1); K.c2.setVisible(b.damage >= 2);
      if (K.lights && b.id === 2) {
        var n = K.lights.length, R = 240, Ry = 58, rot = -0.18, cs = Math.cos(rot), sn = Math.sin(rot);
        for (i = 0; i < n; i++) { var a = (i / n) * TAU + t * 1.4, sa = ((a % TAU) + TAU) % TAU, ex = Math.cos(sa) * R, ey = Math.sin(sa) * Ry, back = sa < Math.PI;
          K.lights[i].setPosition(ex * cs - ey * sn, ex * sn + ey * cs).setAlpha(back ? (Math.abs(ex) > 125 ? 0.45 : 0) : 0.9); }
      }
      if (K.wands) for (i = 0; i < 2; i++) K.wands[i].setRotation(b.aim - Math.PI / 2 - this.bossC.rotation);
    }
    bulletHitsCore(b, core) {
      if (!b.isBolt) b = core;
      var bs = this.boss; if (!b.active || !bs || bs.dead || bs.enterT <= 1) return;
      this.kill(b); this.damageBoss(bs, b.x, b.y, true);
    }
    bulletHitsBoss(b, bc) {
      if (!b.isBolt) b = bc;
      var bs = this.boss; if (!b.active || !bs || bs.dead || bs.enterT <= 1) return;
      this.kill(b); this.damageBoss(bs, b.x, b.y, false);
    }
    damageBoss(b, x, y, core) {
      var B = A.BOSSES[b.id];
      b.hp = Math.max(0, b.hp - (core ? 2 : 1)); b.flash = 1; this.score += core ? 25 : 10;
      this.burst('spark', x, y, core ? 8 : 4, core ? [0xffffff, b.coreC] : [0xffffff, 0xffe27a]);
      if (core) { Kit.snd.play('hit', { vol: 0.9, rate: 1.25 }); this.flash(b.x + B.core[0], b.y + B.core[1], B.core[2] * 1.6, b.coreC, 200); } else Kit.snd.play('hit', { vol: 0.8 });
      this.stat(false, true);
      this.game.events.emit('sr-boss', { hp: b.hp, max: b.maxHp });
      if (b.hp <= 0) this.bossDefeated(b);
    }
    bossDefeated(b) {
      var B = A.BOSSES[b.id], self = this, G = this.G;
      b.dead = true; b.deadT = 0; this.clearLaters(); b.chargeFn = null; b.dash = null; b.charge = 0; this.core.body.enable = false; this.bossC.body.enable = false;
      this.score += 2000; this.stat(false, true);
      this.game.events.emit('sr-boss', { hp: 0, max: b.maxHp, done: true });
      Kit.snd.play('crack', { vol: 1, rate: 0.7 }); this.cameras.main.shake(300, 0.006); Kit.buzz(60);
      this.boom(b.x + B.core[0], b.y + B.core[1], 160, ['#ffffff', '#ffd36b', '#' + b.coreC.toString(16).padStart(6, '0')]);
      this.popText(G.FW / 2, b.y + 220, 'Boss cleared! +2000', { size: 64, color: '#fff6c2', life: 2200, rise: 120 });
      for (var i = 0; i < 14; i++) this.dropStar(b.x + rand(-B.rx, B.rx), b.y + rand(-B.ry, B.ry));
      // everything the machine sent out powers down into stars
      this.en.slice().forEach(function (e) { if (e.delay <= 0 && e.y > 0) { self.boom(e.x, e.y, e.radius, ['#ffffff', '#ffd36b']); self.dropStar(e.x, e.y); } self.drop(e); });
      this.shots.getChildren().forEach(function (s) { if (s.active) { self.burst('dot', s.x, s.y, 4, 0xffb3e6); self.kill(s); } });
      // it shakes, pops here and there, then breaks in two and the halves fly off
      this.time.addEvent({ delay: 100, repeat: 13, callback: function () { var px = b.x + rand(-B.rx, B.rx), py = b.y + rand(-B.ry, B.ry); self.boom(px, py, 70, ['#ffffff', '#ffd36b', B.color]); Kit.snd.play('crack', { vol: 0.45, rate: 1.3 }); } });
      this.tweens.add({ targets: this.bossC, angle: { from: -3, to: 3 }, duration: 45, yoyo: true, repeat: 30 });
      this.time.delayedCall(1400, function () {
        self.boom(b.x, b.y, 240, ['#ffffff', '#ffd36b', B.color, A.shade(B.color, -0.3)]); Kit.snd.play('thud', { vol: 1 }); self.cameras.main.shake(400, 0.008);
        self.bossC.setVisible(false); self.tweens.killTweensOf(self.bossC);
        var fw = B.w * S, fh = B.h * S, halves = [];
        [-1, 1].forEach(function (s) {
          var h1 = self.add.image(0, 0, 'boss' + b.id).setScale(U).setCrop(s < 0 ? 0 : fw / 2, 0, fw / 2, fh), h2 = self.add.image(0, 0, 'bcrack' + b.id + '-2').setScale(U).setCrop(s < 0 ? 0 : fw / 2, 0, fw / 2, fh);
          var h = self.add.container(b.x, b.y, [h1, h2]).setDepth(14); h.setRotation(0);
          self.tweens.add({ targets: h, x: b.x + s * 260, y: -B.h * 1.4, rotation: s * 0.5, duration: 2600, ease: 'Quad.easeIn', onComplete: function () { h.destroy(); } });
          halves.push(h);
        });
        self.time.delayedCall(2600, function () { self.boss = null; });
      });
    }

    /* ---------------- the wave ends ---------------- */
    clearWave() {
      var self = this, G = this.G, stars = Math.min(3, this.hearts), last = this.level === COUNT, endOfWorld = this.level % PER === 0;
      this.state = 'clear'; this.drag = null;
      SR.progress.finish(this.level, stars);
      Kit.bridge.complete();
      Kit.snd.play('win', { vol: 0.8 });
      this.shots.getChildren().forEach(function (s) { if (s.active) self.kill(s); });
      this.S.inv = 0; this.S.tx = G.FW / 2; this.S.ty = Math.max(G.minY, G.maxY - 140);
      for (var i = 0; i < 6; i++) this.time.delayedCall(200 + i * 170, function () {
        var x = rand(G.FW * 0.15, G.FW * 0.85), y = rand(G.formTop, G.formTop + 400);
        self.flash(x, y, 150, 0xfff3c4, 500);
        self.pop(self.emitter('starp', [0xffd36b, 0xff8fab, 0x7ae7ff, 0xffffff], { life: 1200, v0: 150, v1: 460, size: 34, add: true, spin: true }), 14, x, y);
      });
      this.time.delayedCall(1500, function () { self.game.events.emit('sr-result', { kind: 'clear', level: self.level, world: self.world, stars: stars, score: self.score, starsGot: self.starsGot, last: last, endOfWorld: endOfWorld }); });
    }

    /* ---------------- the frame ---------------- */
    update(time, delta) {
      if (!this.ready) return;
      var dt = Math.min(delta, 50) / 1000;
      this.t += dt;
      if (this.bannerT > 0) this.bannerT -= dt;
      if (this.warpT > 0) this.warpT -= dt;
      this.backdrop(dt);
      for (var q = 0; q < this.emList.length; q++) { var em = this.emList[q]; if (em.visible && this.t > em.until) em.setVisible(false); }
      this.updateShip(dt);
      if (this.state === 'play' && this.bannerT < 1.2 && !this.blocked) this.director(dt);
      this.updateEnemies(dt);
      if (this.boss) this.updateBoss(dt);
      this.updateShots(dt);
      this.updatePickups(dt);
      if (this.state === 'play' && this.dir.done && !this.en.length && !this.boss) this.clearWave();
    }

    // debug only (?debug): steer under the nearest machine so a test can fly a wave
    autopilot() {
      var s = this.S, tgt = null, td = 1e9, i, e, ship = this.ship, G = this.G;
      if (this.boss && !this.boss.dead && this.boss.enterT > 1) tgt = this.boss;
      else for (i = 0; i < this.en.length; i++) { e = this.en[i]; if (e.delay > 0 || e.y < 30 || e.y > ship.y - 160) continue; var dd = Math.abs(e.x - ship.x); if (dd < td) { td = dd; tgt = e; } }
      s.tx = tgt ? tgt.x : G.FW / 2; s.ty = G.maxY - 30; this.clampShip();
    }
  }

  window.SrPlay = Play;
})();
