/* Mosaic Breaker: the field (scene 'Play', started again for every level with { n }).
   Everything the engine can do, the engine does (docs/phaser-standard.md section 1):
   - Arcade physics: the star is a circle body (setCircle) that bounces (setBounce 1) off the walls (the world bounds,
     open at the bottom) and the tiles (a static group, one collider); the carpet is an immovable body that the engine moves
     by velocity; falling lanterns are bodies in a group and are caught by an overlap with the carpet. No hand-written
     collision maths: the callbacks only say what a hit MEANS.
   - Tweens: the tiles drop in, wobble and flash when hit, the carpet widens and squashes, the texts rise.
     Timers (time.delayedCall) fire the confetti. Particle emitters: tile shards, sparks, stars, the star's trail, the
     backdrop's drifting motes, petals and lanterns. A Rope ripples the carpet. images stack the pillars and the frieze
     (no TileSprite: each is a draw call of its own). The camera shakes (a little) and the interface scene (hud.js) reads game events.
   Kept as game code, because the engine has no such rule (the old game's rules, numbers scaled to this field):
   - where the star hits the carpet steers it (a hit at the edge goes out at up to 60 degrees), with a nudge towards the last
     few tiles after a few quiet seconds and a little noise after a long rally;
   - the star never goes nearly flat (a minimum vertical share of its speed), eases back to the level's speed, and gets
     1.2% faster at each carpet bounce (to 118%);
   - hearts, score, combo, stars for the level (3 hearts kept: 3 stars, one lost: 2, else 1), the lantern power-ups.
   Field in design units (see BrArt.L and BrArt.fitView): 1000 wide between pillars at x 424 and 1460, centred; on a phone on
   its side the ceiling is y 116, the carpet y 940 and the speeds x 0.8; upright the field takes the whole tall screen (below
   the interface rows, above the thumb) and the speeds are the old game's (up to x 1.25). Built for the orientation it starts
   in; turning the screen starts the level again. */
(function () {
  'use strict';
  var L = BrArt.L, LV = window.MOSAIC_LEVELS, WORLDS = BrArt.WORLDS, PU = BrArt.PU, COUNT = LV.list.length;
  var BALL_PAD = Math.round(L.BALL_R * 1.6), MAXBALLS = 12, KEYSPEED = 1000, GRAVITY = 700 * 0.8;
  var sfx = function (n, o) { Kit.snd.play(n, o); };
  var rand = Phaser.Math.FloatBetween, clamp = Phaser.Math.Clamp;
  var painted = -1;                                                  // the world whose backdrop textures are held now
  function rgbInt(s) { var m = s.match(/\d+/g); return (+m[0] << 16) | (+m[1] << 8) | +m[2]; }
  function swatch(col, k) { return rgbInt(BrArt.shade(col, k)); }
  var FONT = 'system-ui, sans-serif';
  function each(g, f) { var a = g.getChildren(); for (var i = 0; i < a.length; i++) f(a[i]); }

  class Play extends Phaser.Scene {
    constructor() { super({ key: 'Play', physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, fixedStep: false, debug: /[?&]phys/.test(location.search) } } }); }   // fixedStep false: bodies move every drawn frame (a fixed 60 step moves them every other frame on a 120 Hz screen: jitter)
    init(d) { this.n = Phaser.Math.Clamp((d && d.n) | 0 || 1, 1, COUNT); }

    create() {
      var self = this, n = this.n, world = this.world = LV.worldOf(n), tune = this.tune = LV.tuning(n);
      this.port = undefined; this.flipped = false; this.live = null;
      // the camera first: the field's height and the interface rows depend on the screen (BrArt.fitView)
      Kit.play.fit(this, function (v) {
        BrArt.fitView(this, v);
        if (self.pillarN) self.pillars(v);
        if (self.live) self.live.layout(v);
        if (self.port !== undefined && self.port !== L.port && !self.flipped) { self.flipped = true; self.game.events.emit('mb-reorient'); }
      });
      this.port = L.port; this.u = this.view.u; this.loseY = Math.max(this.view.b, L.CARPET_Y + 140) + 40;
      this.def = LV.list[n - 1]; this.inp = this.registry.get('in');
      this.lives = 3; this.livesLost = 0; this.score = 0; this.combo = 0; this.slowT = 0; this.wideT = 0; this.sinceHit = 0; this.clock = 0; this.squash = 0;
      this.base = tune.speed * L.SPD; this.speed = this.base; this.state = 'play'; this.fxE = {}; this.fxL = [];
      BrSave.progress.setCurrent(n);
      Kit.snd.amb('amb-' + world, { fade: 2 });                     // the world's own air, very low: crickets at night, birds at dawn, the sea

      // ---- backdrop: one picture, and what floats in the air ----
      if (painted !== world) { if (painted >= 0) BrArt.dropWorld(this, painted); painted = world; }
      var key = BrArt.world(this, world), B = BrArt.BG, tp = B.tops[world];
      this.deep = []; this.px = 0;                                       // the depth layers: they slide with the carpet (visuals)
      // the scenery at the old game's size: it was painted in screen points (one old unit = one point = 2.2 units here), with
      // its horizon at 66% of the screen's height (60% by the sea). It is drawn at that size, never narrower than the screen
      // (with room to slide), and placed so its horizon sits where the old one did.
      var v0 = this.view, zc = v0.z / Kit.play.dpr(), hz = 1080 * (world === 2 ? 0.6 : 0.66);
      var bf = this.bgF = Math.max(1 / (2.2 * zc), (v0.w + 300) / (BrArt.BG.x1 - B.x)), hy = v0.t + v0.h * (world === 2 ? 0.6 : 0.66);
      var Y = function (y) { return hy + (y - hz) * bf; };
      this.bgX = 960 + (B.x - 960) * bf; this.bgTop = Y(B.y); this.bgBot = Y(B.y1);
      for (var di = 0; di < 3; di++) this.deep.push(this.add.image(this.bgX, Y(tp[di]), key + 'abc'[di]).setOrigin(0).setScale(B.scale * bf).setDepth(0));
      // the sky as the old game drew it on the screen: its gradient from the top of the screen to just under the horizon (the
      // engine's gradient fill, one band per colour step), the glow 30% across and 160 points above the horizon (dawn: 62%
      // and 40), the crescent 60 points above the glow, or the dawn sun on it
      var sky = WORLDS[world].sky, sg = this.add.graphics().setDepth(-0.9), y0 = v0.t - 40, y1 = Y(hz + 88), ns = sky.length - 1;
      for (var si = 0; si < ns; si++) {
        var ca = swatch(sky[si], 0), cb = swatch(sky[si + 1], 0), ya = y0 + (y1 - y0) * si / ns, yb = y0 + (y1 - y0) * (si + 1) / ns;
        sg.fillGradientStyle(ca, ca, cb, cb, 1).fillRect(v0.l - 400, ya, v0.w + 800, yb - ya + 1);
      }
      sg.fillStyle(swatch(sky[ns], 0), 1).fillRect(v0.l - 400, y1, v0.w + 800, this.bgBot - y1);
      var gxs = v0.l + v0.w * (world === 1 ? 0.62 : 0.3), gys = Y(hz) - (world === 1 ? 40 : 160) * 2.2 * bf;
      this.add.image(gxs, gys, 'bg-glow').setScale(4.5 * bf).setDepth(-0.8);
      if (world === 1) this.add.image(gxs, gys, 'bg-sun').setScale(bf).setDepth(-0.7);
      else this.add.image(gxs, gys - 60 * 2.2 * bf, 'bg-moon').setScale(bf).setDepth(-0.7);
      this.ambient(world);

      // ---- palace pillars, frieze and ceiling frame the field (the scenery goes on round them) ----
      var W_ = WORLDS[world], pw = L.WALL;
      this.pillarN = 0; this.pillarY0 = undefined; this.pillars(this.view);                                      // (images stacked in whole 120 steps from above the screen to below it)
      this.add.image(L.FL, L.CEIL - 34 - 3000, 'sprites', 'px').setOrigin(0).setDisplaySize(L.FR - L.FL, 3001).setTint(swatch(W_.stone, -0.72)).setDepth(7);
      // (a screen taller than 16:9 sees past the backdrop: sky colour above it, ground colour below)
      this.add.image(-3000, this.bgTop - 3000, 'sprites', 'px').setOrigin(0).setDisplaySize(8000, 3001).setTint(swatch(W_.sky[0], 0)).setDepth(-1);
      this.add.image(-3000, this.bgBot - 1, 'sprites', 'px').setOrigin(0).setDisplaySize(8000, 3001).setTint(swatch(W_.near, 0)).setDepth(-1);
      var fw = L.FR - L.FL, nf = Math.ceil(fw / 184);
      for (var fi = 0; fi < nf; fi++) {
        var fr = this.add.image(L.FL + fi * 184, L.CEIL - 34, 'frieze' + world).setOrigin(0).setScale(0.5).setDepth(7);
        if (fi === nf - 1) fr.setCrop(0, 0, (fw - fi * 184) * 2, 116);                     // (the last strip is cut to the frame's width)
      }

      // ---- physics: walls are the world's bounds (left, right, top; the bottom is open) ----
      var pw_ = this.physics.world;
      pw_.setBounds(L.IN_L, L.CEIL, L.IN_R - L.IN_L, 6000);
      pw_.setBoundsCollision(true, true, true, false);
      pw_.on('worldbounds', this.onWall, this);
      this.events.once('shutdown', function () { pw_.off('worldbounds', self.onWall, self); });

      // ---- tiles: a static group; each drops in, and only counts once it has landed ----
      this.tiles = this.physics.add.staticGroup(); this.left = 0;
      this.def.rows.forEach(function (row, r) {
        for (var c = 0; c < row.length; c++) { var ch = row[c]; if (ch !== '.') self.makeTile(r, c, ch); }
      });

      // ---- the carpet: a body (a Zone) the engine moves, a Rope that ripples, a shadow and a glow ----
      this.cw = this.base0 = tune.carpet; this.target = 960;
      var cy = L.CARPET_Y + L.CARPET_H / 2;
      this.carpet = this.add.zone(960, cy, this.cw, L.CARPET_H);
      this.physics.add.existing(this.carpet);
      this.carpet.body.setImmovable(true).setAllowGravity(false);
      this.glow = this.add.image(960, cy, 'sprites', 'cglow').setDepth(8).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
      this.shadow = this.add.image(960, cy + L.CARPET_H / 2 + 18, 'sprites', 'shadow').setDepth(8);
      var C = BrArt.CARPET;
      this.strips = []; for (var si = 0; si < BrArt.CARPET.N; si++) this.strips.push(this.add.image(960, cy, 'sprites', 'cs' + si).setDepth(9));
      this.carpetLayout();

      // ---- the star(s) ----
      this.balls = this.physics.add.group({ maxSize: MAXBALLS });
      this.drops = this.physics.add.group({ allowGravity: false, maxSize: 4 });
      this.newStuckBall();
      ['shard', 'spark', 'star', 'dot'].forEach(this.fx, this);                                    // (made now, asleep: no hitch at the first break)

      this.physics.add.collider(this.balls, this.tiles, this.onTile, this.tileReady, this);
      this.physics.add.collider(this.carpet, this.balls, this.onCarpet, this.canBounce, this);      // (a sprite first: its callbacks get the carpet first)
      this.physics.add.overlap(this.carpet, this.drops, this.onCatch, null, this);

      // ---- floating words: a few Text objects used again ----
      this.words = []; this.wordI = 0;
      this.nums = []; this.numI = 0;                                   // (the +points are made of pictures: no canvas text to paint and upload at every break)
      for (var ni = 0; ni < 6; ni++) this.nums.push(BrArt.Num(this, 'p', 6).setDepth(20).setVisible(false));
      for (var i = 0; i < 6; i++) this.words.push(this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '40px', fontStyle: '800', color: '#fff' }).setOrigin(0.5).setDepth(20).setVisible(false));

      if (Kit.load) Kit.load.done();
      var info = { n: n, world: world, name: this.def.name, worldName: W_.name, lives: 3, score: 0, teach: !BrSave.store.get('launched', false) };
      this.registry.set('lv', info);
      this.live = new BrLive(this, info); this.live.layout(this.view);                // the interface while playing (hud.js): part of this scene
      this.game.events.emit('mb-start', info);
      sfx('page');
      if (Kit.play.debug) Kit.play.debug.play = this;
    }

    // ---------------------------------------------------------------- building
    makeTile(r, c, ch) {
      var kind, hp, color;
      if (ch === '#') { kind = 'stone'; hp = Infinity; color = 0; }
      else if (ch === 'G') { kind = 'gold'; hp = 3; color = 2; }
      else if (/[a-e]/.test(ch)) { kind = 'strong'; hp = 2; color = 'abcde'.indexOf(ch); }
      else { kind = 'normal'; hp = 1; color = (+ch - 1); }
      var x = L.IN_L + c * L.CELL + 3 + L.BW / 2, y = L.TOP + r * L.ROW + L.BH / 2;
      var t = this.add.image(x, y, 'tiles' + this.world, BrArt.tileFrame(this.world, kind, color, hp)).setScale(0.5).setDepth(10);
      this.tiles.add(t);
      t.body.setSize(L.BW, L.BH);                                       // the body is the tile, not its shadow
      t.kind = kind; t.hp = t.maxHp = hp; t.color = color; t.ready = false; t.fy = y;
      if (kind !== 'stone') this.left++;
      t.setAlpha(0).y = y - 70;
      this.tweens.add({ targets: t, y: y, alpha: 1, duration: 450, delay: 50 + (r * 60 + Math.abs(c - 5) * 25), ease: 'Back.easeOut', onComplete: function () { t.ready = true; } });
      return t;
    }
    // the two palace pillars: strips of images, as many as the screen is tall (more are added if the window grows)
    pillars(v) {
      if (this.pillarY0 === undefined) this.pillarY0 = Math.floor((v.t - 120) / 120) * 120;
      var y0 = this.pillarY0, n = Math.ceil((v.b + 120 - y0) / 720);
      for (; this.pillarN < n; this.pillarN++) for (var pi = 0; pi < 2; pi++)
        this.add.image(pi ? L.FR - L.WALL : L.FL, y0 + this.pillarN * 720, 'pillar' + this.world).setOrigin(0).setScale(0.5).setDepth(6);
    }
    ambient(world) {
      // gold motes at night, petals at dawn, lanterns rising at sea (the old page's ambience)
      var e, zone = { x: { min: -250, max: 2170 } };
      if (world === 0) e = this.add.particles(0, 0, 'sprites', { frame: 'mote', x: zone.x, y: { min: 20, max: 860 }, lifespan: { min: 4000, max: 7000 }, speedX: { min: -6, max: 6 }, speedY: { min: -10, max: -3 }, scale: { min: 0.5, max: 1.1 }, tint: 0xffe2a0, frequency: 800, maxAliveParticles: 7, alpha: { onUpdate: function (p, k, t) { return 0.8 * Math.sin(t * Math.PI); } } });
      else if (world === 1) e = this.add.particles(0, 0, 'sprites', { frame: 'petal', x: zone.x, y: { min: -40, max: 0 }, lifespan: { min: 11000, max: 15000 }, speedX: { min: -18, max: 22 }, speedY: { min: 36, max: 66 }, rotate: { min: 0, max: 360 }, scale: { min: 0.5, max: 1 }, tint: [0xffb3c6, 0xffffff, 0xffb3c6], frequency: 1400, maxAliveParticles: 7, alpha: 0.75 });
      else e = this.add.particles(0, 0, 'sprites', { frame: 'lamp', x: zone.x, y: { min: 900, max: 1100 }, lifespan: { min: 13000, max: 17000 }, speedX: { min: -8, max: 8 }, speedY: { min: -58, max: -34 }, scale: { min: 0.6, max: 1 }, frequency: 2000, maxAliveParticles: 6, alpha: { onUpdate: function (p, k, t) { return 0.85 * Math.min(1, t * 8, (1 - t) * 4); } } });
      e.setDepth(4);
      e.fastForward(6000);                                               // the air is not empty at the start
    }
    carpetLayout() {
      var C = BrArt.CARPET, k = this.cw / C.w;
      this.carpet.setSize(this.cw, L.CARPET_H); this.carpet.body.setSize(this.cw, L.CARPET_H);
      this.shadow.setDisplaySize(this.cw * 1.05, 28);
      this.glow.setDisplaySize(this.cw * 1.6, 100);
    }
    // a star on the carpet, waiting to be launched
    newStuckBall() { var b = this.spawnBall(this.carpet.x, L.CARPET_Y - L.BALL_R - 4); b.stuck = true; b.dx = rand(-15, 15); b.body.enable = false; b.tr.stop(); return b; }
    spawnBall(x, y) {
      var b = this.balls.get(x, y, 'sprites', 'ball');
      if (!b) return null;
      if (!b.star) {                                                      // a new one: shape, bounce, trail
        b.setCircle(L.BALL_R, BALL_PAD, BALL_PAD).setBounce(1, 1).setCollideWorldBounds(true, 1, 1, true).setDepth(12);
        b.star = this.add.image(x, y, 'sprites', 'ballstar').setDepth(13);
        b.tr = this.add.particles(0, 0, 'sprites', { frame: 'dot', follow: b, lifespan: 200, scale: { start: 0.7, end: 0.1 }, alpha: { start: 0.4, end: 0 }, tint: 0xffe6a3, frequency: 62, emitting: false }).setDepth(11);
      }
      b.enableBody(true, x, y, true, true); b.star.setVisible(true); b.stuck = false; b.tr.setActive(true).setVisible(true).start();
      return b;
    }
    killBall(b) { b.tr.stop(); b.star.setVisible(false); b.disableBody(true, true); }

    // ---------------------------------------------------------------- the game's rules
    launch() {
      var any = false, self = this;
      each(this.balls, function (b) {
        if (!b || !b.active || !b.stuck) return;
        var a = -Math.PI / 2 + rand(-0.25, 0.25);
        b.stuck = false; b.body.enable = true; b.body.reset(b.x, b.y); b.tr.setActive(true).setVisible(true).start();
        b.body.setVelocity(Math.cos(a) * self.speed, Math.sin(a) * self.speed); any = true;
      });
      if (any) {
        sfx('launch'); this.live.onLaunched();
        if (!BrSave.store.get('launched', false)) BrSave.store.set('launched', true);
      }
    }
    // the carpet only bounces a star that is coming down (the old rule)
    canBounce(car, ball) { return ball.body.velocity.y > 0; }
    tileReady(ball, tile) { return tile.ready; }

    onWall(body, up, down, left, right) { if (body.gameObject && body.gameObject.star) sfx('tick', { vol: 0.8 }); }

    // where the star hits the carpet steers it
    onCarpet(car, ball) {
      var hw = this.cw / 2, rel = clamp((ball.x - car.x) / hw, -1, 1), ang = -Math.PI / 2 + rel * 1.05, body = ball.body;
      if (this.sinceHit > 18) ang += rand(-0.2, 0.2);                       // never stuck in a boring rally
      if (this.sinceHit > 4 && this.left > 0 && this.left <= 4) {            // the last few tiles: nudge the bounce towards one
        var tg = this.lastTile(); if (tg) { var w2 = clamp(Math.atan2(tg.y - ball.y, tg.x - ball.x), -Math.PI + 0.45, -0.45); ang = ang * 0.35 + w2 * 0.65; }
      }
      var s2 = Math.hypot(body.velocity.x, body.velocity.y) || this.speed;
      body.setVelocity(Math.cos(ang) * s2, Math.sin(ang) * s2);
      this.combo = 0; this.squash = 1;
      this.speed = Math.min(this.base * 1.18, this.speed * 1.012);
      sfx('bounce', { pan: rel * 0.4 }); Kit.buzz(6);
      this.burst('dot', ball.x, L.CARPET_Y, 6, 0xffd36b, -Math.PI / 2);
    }
    lastTile() {
      var out = null, cs = this.tiles.getChildren();
      for (var i = 0; i < cs.length; i++) { var t = cs[i]; if (t.active && t.kind !== 'stone' && t.ready && (!out || Math.random() < 0.5)) out = t; }
      return out;
    }

    onTile(ball, t) {
      this.sinceHit = 0;
      var col = t.kind === 'gold' ? '#f6c453' : WORLDS[this.world].tiles[t.color], ci = BrArt.hex(col);
      this.wobble(t);
      if (t.kind === 'stone') { sfx('stone'); this.burst('dot', ball.x, ball.y, 5, 0xcdb89c); return; }
      t.hp--;
      if (t.hp > 0) {                                                       // cracked, not broken
        t.setFrame(BrArt.tileFrame(this.world, t.kind, t.color, t.hp));
        sfx('clink'); this.burst('spark', ball.x, ball.y, 6, 0xffffff); this.burst('spark', ball.x, ball.y, 3, ci);
        this.score += 5; this.live.setScore(this.score); return;
      }
      this.combo++; this.left--;
      var cx = t.x, cy = t.y, combo = this.combo;
      sfx('break', { vol: Math.min(1, 0.7 + combo * 0.04) });
      Kit.buzz(10);
      this.burst('shard', cx, cy, 5, ci); this.burst('shard', cx, cy, 4, BrArt.hex(BrArt.mix(col, '#ffffff', 0.35)));
      this.burst('shard', cx, cy, 3, BrArt.hex(BrArt.mix(col, '#000000', 0.25))); this.burst('shard', cx, cy, 2, 0xffffff);
      this.burst('star', cx, cy, 3, 0xfff3c4);
      if (t.kind === 'gold') { this.cameras.main.shake(180, 0.0035); this.burst('star', cx, cy, 9, 0xffd36b); }
      var pts = (t.kind === 'gold' ? 50 : t.kind === 'strong' ? 20 : 10) * Math.min(combo, 10);
      this.score += pts; this.live.setScore(this.score, true);
      var cheer = { 4: 'Nice!', 7: 'Great!', 10: 'Amazing!', 14: 'Super Star!', 20: 'Unstoppable!' }[combo];
      if (cheer) this.say(cx, cy - 30, cheer, '#fff6c2', 54);
      else if (combo > 1) this.say(cx, cy - 20, '+' + pts, '#ffffff', 30, 0.7);
      this.dropLater(t, cx, cy);
      t.destroy();                                                          // (a static body goes with its picture)
      if (this.left <= 0) this.clearLevel();
    }
    // the tile that was hit: a small wobble and a white flash (tweens, not redrawn pictures)
    wobble(t) {
      this.tweens.killTweensOf(t); t.ready = true; t.y = t.fy; t.setScale(0.5);
      this.tweens.add({ targets: t, scale: 0.56, duration: 70, yoyo: true, ease: 'Sine.easeOut' });
      t.setTintMode(Phaser.TintModes.FILL).setTint(0xffffff);
      this.time.delayedCall(60, function () { if (t.active) { t.clearTint(); t.setTintMode(Phaser.TintModes.MULTIPLY); } });
    }
    dropLater(t, cx, cy) {
      if (this.drops.countActive(true) >= 2 || Math.random() >= this.tune.drop) return;
      var types = ['wide', 'wide', 'multi', 'multi', 'slow'];
      if (this.lives < 5 && Math.random() < 0.35) types.push('life');
      var type = types[(Math.random() * types.length) | 0], d = this.drops.get(cx, cy, 'sprites', 'lantern-' + type);
      if (!d) return;
      d.setFrame('lantern-' + type).enableBody(true, cx, cy, true, true); d.setDepth(11); d.type = type; d.body.setSize(40, 60); d.setVelocity(0, 250 * L.SPD);
      this.tweens.killTweensOf(d); d.setAngle(-7);
      this.tweens.add({ targets: d, angle: 7, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    onCatch(car, d) {
      var type = d.type, col = PU[type].c, ci = BrArt.hex(col);
      this.tweens.killTweensOf(d); d.disableBody(true, true);
      sfx('power'); Kit.buzz(15);
      this.burst('star', d.x, L.CARPET_Y, 8, ci, -Math.PI / 2);
      this.say(this.carpet.x, L.CARPET_Y - 80, PU[type].t, col, 44);
      if (type === 'wide') { this.wideT = 14; this.widen(this.base0 * 1.5); this.glow.setTint(0xffb347).setAlpha(0.7); }
      else if (type === 'slow') { this.slowT = 9; this.glow.setTint(0xb79cff).setAlpha(0.7); }
      else if (type === 'life') { this.lives = Math.min(5, this.lives + 1); this.live.setLives(this.lives, 1); }
      else {                                                                // Triple Star: two more from the one in flight
        var src = null, self = this; each(this.balls, function (b) { if (b && b.active && !b.stuck && !src) src = b; });
        if (!src) { this.launch(); each(this.balls, function (b) { if (b && b.active && !src) src = b; }); }
        if (src) { var a0 = Math.atan2(src.body.velocity.y || -1, src.body.velocity.x), sp = Math.hypot(src.body.velocity.x, src.body.velocity.y) || this.speed;
          [-0.45, 0.45].forEach(function (da) {
            var b = self.spawnBall(src.x, src.y); if (!b) return;
            b.body.setVelocity(Math.cos(a0 + da) * sp, -Math.abs(Math.sin(a0 + da) * sp));
          }); }
      }
    }
    widen(w) { var self = this; this.tweens.killTweensOf(this); this.tweens.add({ targets: this, cw: w, duration: 450, ease: 'Back.easeOut', onUpdate: function () { self.carpetLayout(); } }); }

    loseLife() {
      this.lives--; this.livesLost++; this.combo = 0; this.slowT = 0; this.wideT = 0;
      each(this.drops, function (d) { if (d && d.active) d.disableBody(true, true); });
      sfx('lose'); this.cameras.main.shake(220, 0.004); Kit.buzz(40);
      this.glow.setAlpha(0); this.live.setLives(this.lives, -1);
      if (this.lives <= 0) {
        this.state = 'fail';
        var self = this; this.time.delayedCall(700, function () { self.game.events.emit('mb-fail', { n: self.n, score: self.score }); });
        return;
      }
      if (this.cw !== this.base0) this.widen(this.base0);
      this.say(960, L.CARPET_Y - 220, 'Oops! ' + this.lives + (this.lives === 1 ? ' heart left' : ' hearts left'), '#ffd1dc', 44, 1.3);
      this.newStuckBall();
    }

    clearLevel() {
      this.state = 'clear';
      var self = this, n = this.n, stars = this.livesLost === 0 ? 3 : this.livesLost === 1 ? 2 : 1;
      BrSave.progress.finish(n, stars);
      try { window.KahfBridge && window.KahfBridge.complete(); } catch (e) { /* not in the app */ }
      sfx('win');
      for (var i = 0; i < 4; i++) this.time.delayedCall(i * 200, function () {
        self.burst('star', rand(L.IN_L + 120, L.IN_R - 120), rand(L.TOP, 560), 10, [0xffd36b, 0xff8fab, 0x7ae7ff, 0xffffff][(Math.random() * 4) | 0]);
      });
      each(this.balls, function (b) { if (b && b.active && !b.stuck) b.body.setVelocity(b.body.velocity.x * 0.2, b.body.velocity.y * 0.2); });
      each(this.drops, function (d) { if (d && d.active) d.disableBody(true, true); });
      this.time.delayedCall(1300, function () {
        self.game.events.emit('mb-won', { n: n, stars: stars, score: self.score, last: n === COUNT, endOfWorld: n % 10 === 0, worldName: WORLDS[self.world].name });
      });
    }

    // ---------------------------------------------------------------- effects
    // one emitter per kind, made when first wanted; the tint is set per burst
    fx(kind) {
      var e = this.fxE[kind];
      if (!e) {
        var cfg = {
          shard: { frame: 'shard', speed: { min: 140, max: 380 }, lifespan: { min: 450, max: 850 }, gravityY: GRAVITY, scale: { start: 0.75, end: 0.25 }, rotate: { start: 0, end: 360 }, alpha: { start: 1, end: 0 } },
          spark: { frame: 'spark', speed: { min: 120, max: 260 }, lifespan: 330, gravityY: 300, scale: { start: 0.5, end: 0 } },
          star: { frame: 'star8', speed: { min: 110, max: 320 }, lifespan: { min: 700, max: 1100 }, gravityY: 320, scale: { start: 0.55, end: 0 }, rotate: { start: 0, end: 200 } },
          dot: { frame: 'dot', speed: { min: 70, max: 200 }, lifespan: 380, gravityY: 250, scale: { start: 0.5, end: 0 } }
        }[kind];
        cfg.emitting = false; e = this.fxE[kind] = this.add.particles(0, 0, 'sprites', cfg).setDepth(15).setActive(false).setVisible(false);
        this.fxL.push(e);
      }
      return e;
    }
    // an emitter with nothing alive and nothing to emit does not need updating or drawing: it sleeps until the next burst
    fxSleep() {
      var a = this.fxL, i, e, bl = this.balls.getChildren();
      for (i = 0; i < a.length; i++) { e = a[i]; if (e.active && !e.getAliveParticleCount()) e.setActive(false).setVisible(false); }
      for (i = 0; i < bl.length; i++) { e = bl[i].tr; if (e && e.active && !e.emitting && !e.getAliveParticleCount()) e.setActive(false).setVisible(false); }
    }
    // one emitter per kind; the tint is set per burst
    burst(kind, x, y, n, tint, angle) {
      var e = this.fx(kind);
      if (!e.active) e.setActive(true).setVisible(true);
      e.setParticleTint(tint);
      if (angle !== undefined) { e.ops.angle.loadConfig({ angle: { min: Phaser.Math.RadToDeg(angle) - 50, max: Phaser.Math.RadToDeg(angle) + 50 } }); }
      else { e.ops.angle.loadConfig({ angle: { min: 0, max: 360 } }); }
      e.explode(n, x, y);
    }
    // a word that rises and fades (a few Text objects, used again)
    say(x, y, text, color, size, life) {
      var self = this, num = /^\+\d+$/.test(text), t = num ? this.nums[this.numI++ % this.nums.length] : this.words[this.wordI++ % this.words.length];
      this.tweens.killTweensOf(t);
      if (num) {
        var k = size * this.u / BrArt.NUM.p.size; t.set(text).setPosition(clamp(x, L.IN_L + 120, L.IN_R - 120), y).setVisible(true).setAlpha(1).setScale(k * 0.6);
        this.tweens.add({ targets: t, scale: k, duration: 180, ease: 'Back.easeOut' });
        this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: (life || 0.9) * 1000, delay: 120, ease: 'Sine.easeIn', onComplete: function () { t.setVisible(false); } });
        return;
      }
      t.setText(text).setColor(color).setFontSize(Math.round(size * this.u)).setPosition(clamp(x, L.IN_L + 120, L.IN_R - 120), y).setVisible(true).setAlpha(1).setScale(0.6).setStroke('rgba(30,10,60,.7)', Math.round(size * this.u / 5));
      this.tweens.add({ targets: t, scale: 1, duration: 180, ease: 'Back.easeOut' });
      this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: (life || 0.9) * 1000, delay: 120, ease: 'Sine.easeIn', onComplete: function () { t.setVisible(false); } });
    }

    // ---------------------------------------------------------------- every frame
    update(time, dms) {
      var dt = Math.min(dms / 1000, 0.05), inp = this.inp, car = this.carpet, body = car.body;
      this.clock += dt; this.live.update(dt);
      if (this.state === 'play') {
        if (inp.aim !== null) { this.target = inp.aim; inp.aim = null; }
        if (inp.kx) this.target += inp.kx * KEYSPEED * dt;
        if (inp.launch) { inp.launch = 0; this.launch(); }
        var half = this.cw / 2;
        this.target = clamp(this.target, L.IN_L + half, L.IN_R - half);
        // the engine moves the carpet: a velocity towards the target (it eases in like the old 1 - exp(-28 dt))
        body.setVelocityX((this.target - car.x) * 28);
        if (this.wideT > 0) { this.wideT -= dt; if (this.wideT <= 0) { this.widen(this.base0); if (!(this.slowT > 0)) this.glow.setAlpha(0); } }
        if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0 && !(this.wideT > 0)) this.glow.setAlpha(0); }
        this.sinceHit += dt;
        var want = this.speed * (this.slowT > 0 ? 0.68 : 1), alive = 0, bl = this.balls.getChildren(), dr = this.drops.getChildren(), i, b, d;
        for (i = 0; i < bl.length; i++) {
          b = bl[i]; if (!b.active) continue;
          if (b.stuck) { b.x = car.x + b.dx; b.y = L.CARPET_Y - L.BALL_R - 4; alive++; continue; }
          var v = b.body.velocity, sp = Math.hypot(v.x, v.y) || 1, ns = sp + (want - sp) * Math.min(1, dt * 3), k = ns / sp, vx = v.x * k, vy = v.y * k;
          if (Math.abs(vy) < ns * 0.3) { vy = (vy < 0 ? -1 : 1) * ns * 0.3; var r2 = ns / Math.hypot(vx, vy); vx *= r2; vy *= r2; }   // never nearly flat
          b.body.setVelocity(vx, vy);
          if (b.y - L.BALL_R > this.loseY) { this.killBall(b); continue; }
          alive++;
        }
        for (i = 0; i < dr.length; i++) { d = dr[i]; if (d.active && d.y > this.loseY + 30) { this.tweens.killTweensOf(d); d.disableBody(true, true); } }
        if (!alive && this.state === 'play') this.loseLife();
      } else body.setVelocityX(0);
      this.visuals(dt); this.fxSleep();
    }
    visuals(dt) {
      this.vf = !this.vf;                                                // the ripple and the star's spin move at 30 Hz (half the frames)
      if (this.vf) { this.vdt = dt; return; }
      dt += this.vdt;
      var car = this.carpet, C = BrArt.CARPET, cy = car.y, t = this.clock, st = this.strips, n = st.length, i;
      // the carpet ripples: each strip sits on a travelling wave and tilts along it (the old page's wave, in strips)
      var total = (C.w + C.padX * 2) * this.cw / C.w, sw = total / n, sq = this.squash, kx = sw / ((C.w + C.padX * 2) * C.S / n), ky = (1 - sq * 0.2) / C.S;
      var y0 = this.wave(0, t), x0 = car.x - total / 2;
      for (i = 0; i < n; i++) {
        var y1 = this.wave(i + 1, t), o = st[i];
        o.setPosition(x0 + sw * (i + 0.5), cy + sq * 4 + (y0 + y1) / 2).setRotation(Math.atan2(y1 - y0, sw)).setScale(kx * 1.05, ky);
        y0 = y1;
      }
      this.squash = Math.max(0, sq - dt * 5);
      var px = Math.round((car.x - 960) / 536 * 100) / 100;           // depth: the nearer the layer, the further it slides against the carpet
      if (px !== this.px) { this.px = px; var sl = BrArt.BG.slide, d0 = this.deep; for (i = 0; i < 3; i++) d0[i].x = this.bgX - px * sl[i] * this.bgF; }
      this.glow.setPosition(car.x, cy); this.shadow.setPosition(car.x, cy + L.CARPET_H / 2 + 18);
      if (this.glow.alpha > 0) this.glow.setAlpha(0.55 + 0.15 * Math.sin(t * 5));
      var bl2 = this.balls.getChildren(); for (var q = 0; q < bl2.length; q++) { var bb = bl2[q]; if (bb.active) { bb.star.setPosition(bb.x, bb.y); bb.star.rotation = t * 2.2; } }
    }
    wave(i, t) { var u = i / this.strips.length; return Math.sin(t * 7 + u * 6) * 3.2 * (0.4 + Math.abs(u - 0.5)); }
  }

  window.BrPlay = Play;
})();
