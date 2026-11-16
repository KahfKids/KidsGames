/* Ramadan Maze: one maze (scene 'Maze', started again for each level with { n }).
   Everything the engine can do, the engine does (docs/phaser-standard.md section 1):
   - Arcade physics: every wall run is a static body (a Zone with the footprint of the painted wall), the kid is a dynamic box
     body that collides with them, each date / cup / lantern is a static circle body and the way in to the house another, and
     picking one up is the engine's overlap. "Can I turn here?" is asked of the engine too (physics.overlapRect on the wall
     between two cells), the answer kept per cell. Leaning into a wall until the engine says touching is how a bump is found.
   - The camera is the engine's: zoom picked to fit the maze, startFollow with lerp and offset, bounds that pin an axis that fits.
   - Tweens: squash, bob of the items, the door, windows, bursts; timers: the walk-in to the house and the delays; the walk
     animation (frames painted once) plays at the kid's speed and its own frames make the footsteps; particles for the bursts.
   - Night (Lantern Night): the darkness with pools of light is drawn in the interface scene from `lights` (hud.js).
   Kept as game code, because the engine has no such feature: the maze and its seeded levels (levels.js), the rules of steering
   in a corridor (keep going while the finger is held, round a bend by itself, glide to the next junction after letting go, a
   turn asked for early waits for its opening, one asked for a moment late is still taken, tap a spot to walk there: a
   breadth-first route on the cell graph) and the stars. The old page's numbers: 4.4 cells a second, 22 / 30 cells a second^2. */
(function () {
  'use strict';
  var K = MzArt.K, C = K.C, LV = MAZE_LEVELS, N = LV.N, E = LV.E, S = LV.S, W = LV.W, DX = LV.DX, DY = LV.DY, OPP = LV.OPP, DIRS = LV.DIRS;
  var ANG = {}; ANG[E] = 0; ANG[S] = Math.PI / 2; ANG[W] = Math.PI; ANG[N] = -Math.PI / 2;
  var TR = {}; TR[N] = W; TR[W] = N; TR[E] = S; TR[S] = E; TR[0] = 0;       // a maze turned on its diagonal (swap x and y)
  var SIDE = {}; SIDE[N] = 'up'; SIDE[E] = 'right'; SIDE[S] = 'down'; SIDE[W] = 'left';
  var SPEED = 4.4 * C, ACC = 30 * C, LANE = 14, BOX = 0.4 * C, TAP_STEPS = 14, LEAN = 0.9 * C;
  var Z = { bg: 0, floor: 1, glow: 2, item: 3, kid: 5, tops: 6, house: 7, fx: 8, pin: 9 };
  var STEP_SND = ['step-grass', 'step-stone', 'step-tile'], BED = ['amb-garden', 'amb-lanes', 'amb-night'];

  class Maze extends Phaser.Scene {
    constructor() { super({ key: 'Maze', physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, fixedStep: false, debug: /[?&]phys/.test(location.search) } } }); }   // fixedStep false: bodies move every drawn frame (a fixed 60 step moves them every other frame on a 120 Hz screen: jitter)
    init(d) { this.n = d.n; this.keep = d.keep || null; }

    create() {
      var self = this, n = this.n, world = this.world = MAZE_LEVELS.worldOf(n), wd = MzArt.WORLDS[world];
      this.inp = this.registry.get('in');
      ['mz-floor', 'mz-tops'].forEach(function (k) { if (self.textures.exists(k)) self.textures.remove(k); });
      MzArt.paintTile(this, world); MzArt.house(this, world);
      this.built = false; this.state = 'play'; this.t = 0;
      this.dir = 0; this.v = 0; this.want = 0; this.idir = 0; this.held = false; this.glide = 0; this.route = null; this.bumped = 0; this.lean = 0;
      this.tx = 0; this.ty = 0; this.sq = { x: 1, y: 1 }; this.ang = -Math.PI / 2; this.fl = null; this.free = false; this.hopping = false; this.hopY = 0; this.nudge = null; this.homeLit = 0; this.lightGrow = 0; this.gotLanterns = 0;
      this.cameras.main.setBackgroundColor(wd.bg);
      Kit.play.fit(this, function (v) { self.onFit(v); }, { w: 1000 });

      var m = LV.generate(n);
      if (m.cols !== m.rows && (this.vw.h > this.vw.w) !== (m.rows > m.cols)) m = LV.transpose(m);   // stand the maze the way the screen stands
      this.maze = m; this.portrait = this.vw.h > this.vw.w;
      this.build();
      this.fitWorld();
      this.built = true;
      Kit.snd.amb(BED[world], { vol: 0.6 });
      this.cameras.main.fadeIn(this.keep ? 150 : 450, 13, 11, 36);
      if (window.Kit && Kit.load) Kit.load.done();
      if (Kit.play.debug) Kit.play.debug.maze = this;
      var st = { n: n, world: world, name: m.name, total: this.items.length, got: this.got, keep: !!this.keep };
      this.registry.set('mzstart', st); this.game.events.emit('mz-start', st);
    }

    onFit(v) {
      this.vw = v;
      if (!this.built) return;
      var m = this.maze;
      if (m.cols !== m.rows && (v.h > v.w) !== (m.rows > m.cols)) { this.turn(); return; }
      this.fitWorld();
    }
    // the screen turned on its side: build the maze again, turned, with the kid where she was and what she took already gone
    turn() {
      if (this.state !== 'play') return;
      var kz = this.kz, taken = this.items.map(function (it) { return it.taken; });
      this.scene.restart({ n: this.n, keep: { taken: taken, ci: Math.floor(kz.x / C), cj: Math.floor(kz.y / C), cols: this.maze.cols } });
    }

    /* ---- the world: pictures, walls, items, house, kid ---- */
    build() {
      var self = this, m = this.maze, world = this.world, wd = MzArt.WORLDS[world], keep = this.keep;
      var pt = this.pt = MzArt.paintMaze(m, C, 1), H = this.H = pt.H, yo = this.yo = -H / 2;
      this.textures.addCanvas('mz-floor', pt.floor); this.textures.addCanvas('mz-tops', pt.tops);
      pt.floor = pt.tops = null;                                       // the textures hold the canvases; no second copy is kept
      var mw = m.cols * C, mh = m.rows * C;
      this.add.tileSprite(mw / 2, mh / 2, mw + 6000, mh + 6000, 'bg' + world).setDepth(Z.bg);
      this.add.image(-pt.pad, -pt.pad, 'mz-floor').setOrigin(0).setDisplaySize(pt.w, pt.h).setDepth(Z.floor);
      this.add.image(-pt.pad, -pt.pad, 'mz-tops').setOrigin(0).setDisplaySize(pt.w, pt.h).setDepth(Z.tops);

      // walls: one static body per painted wall run
      this.walls = this.physics.add.staticGroup();
      pt.runs.forEach(function (r) { self.walls.add(self.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h)); });
      this.oc = new Int8Array(m.cols * m.rows).fill(-1);            // what the engine said about each cell's four sides

      // items: static circle bodies; the picture bobs, a glint comes and goes, lanterns (and everything at night) glow
      this.itemsG = this.physics.add.staticGroup();
      this.items = []; this.got = 0;
      var ts = keep && keep.cols !== m.cols;                          // the kept state came from the other way up
      m.items.forEach(function (it, i) {
        var px = (it.x + 0.5) * C, py = (it.y + 0.5) * C, r = it.type === 'date' ? 0.28 * C : 0.26 * C;
        var o = { x: it.x, y: it.y, type: it.type, taken: !!(keep && keep.taken[i]), i: i };
        o.pin = self.add.image(0, 0, 'ui', 'spark').setDepth(Z.pin).setScale(0.5).setTint(0xb6b2e0).setAlpha(0.8);   // a dot in the ring round the house
        if (o.taken) { self.got++; if (it.type === 'lantern') self.gotLanterns++; o.pin.setTint(0xffd36b).setAlpha(1).setScale(0.62); self.items.push(o); return; }
        var z = self.add.zone(px, py, 2 * r, 2 * r); self.itemsG.add(z); z.body.setCircle(r); z.it = o; o.zone = z;
        o.sh = self.add.image(px + C * 0.04, py + C * 0.2 + yo, 'mzs', 'item-sh').setDepth(Z.item);
        o.sp = self.add.image(px, py + yo - C * 0.04, 'mzs', it.type).setDepth(Z.item + 0.1);
        if (wd.dark || it.type === 'lantern') o.gl = self.add.image(px, py + yo, 'ui', 'glow').setTint(0xffcf6b).setAlpha(wd.dark ? 0.55 : 0.28).setDisplaySize(C * 1.1, C * 1.1).setDepth(Z.glow).setBlendMode(Phaser.BlendModes.ADD);
        o.gt = self.add.image(px + C * 0.13, py + yo - C * 0.14, 'mzs', 'glint').setDepth(Z.item + 0.2).setAlpha(0).setScale(0.5);
        o.by = o.sp.y;
        self.items.push(o);
      });
      // the items bob on ONE tween (a phase the update of every item reads), and now and then one of them glints (Kit.play.every: a finite tween, nothing endless per item)
      this.bob = { t: 0 };
      this.tweens.add({ targets: this.bob, t: Math.PI * 2, duration: 1300, repeat: -1, onUpdate: function () { var b = self.bob.t; for (var i = 0; i < self.items.length; i++) { var o = self.items[i]; if (o.sp && !o.taken) o.sp.y = o.by - C * 0.025 * (1 + Math.sin(b + o.i * 0.9)); } } });
      this.stopGlint = Kit.play.every(900, 2200, function () {
        var live = self.items.filter(function (o) { return !o.taken && o.gt; }); if (!live.length || self.state !== 'play') return;
        var o = live[Math.floor(Math.random() * live.length)];
        self.tweens.add({ targets: o.gt, alpha: 1, scale: 0.9, angle: 40, duration: 260, yoyo: true, onComplete: function () { if (o.gt) o.gt.setAngle(0); } });
      });
      this.events.once('shutdown', function () { if (self.stopGlint) self.stopGlint(); });
      // the ring of dots round the house: the progress, shown in the world (a copy is in the interface)
      var gx = m.goal[0], gy = m.goal[1], hx = (gx + 0.5) * C, hy = (gy + 0.5) * C + 0.36 * C, n = this.items.length;
      this.items.forEach(function (o, i) {
        var a = -Math.PI * (0.12 + 0.76 * (n > 1 ? i / (n - 1) : 0.5)); o.pin.setPosition(hx + Math.cos(a) * C * 0.82, hy - C * 0.5 + Math.sin(a) * C * 0.7);
      });

      // the house: base, door slab (swings open), lit windows (come on when she is home), hanging lantern; a beckoning glow
      var hk = 'mzh' + world, HO = MzArt.HOUSE;
      this.house = { x: hx, y: hy };
      this.hGlow = this.add.image(hx, hy - C * 0.25, 'ui', 'glow').setTint(0xffcf6b).setAlpha(0.4).setDisplaySize(C * 2.2, C * 2.2).setDepth(Z.glow).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: this.hGlow, scale: this.hGlow.scale * 1.1, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.add.image(hx - HO.x, hy - HO.base, hk, 'base').setOrigin(0).setDepth(Z.house);
      this.door = this.add.image(hx - C * 0.13, hy, hk, 'door').setOrigin(0, 1).setDepth(Z.house + 0.1);
      this.hLit = this.add.image(hx - HO.x, hy - HO.base, hk, 'lit').setOrigin(0).setDepth(Z.house + 0.2).setAlpha(0);
      this.lamp = this.add.image(hx + C * 0.98 * 0.3, hy - 0.274 * C - 0.08 * C, hk, 'lamp').setOrigin(0.5, 0).setDepth(Z.house + 0.3);   // hung where the old page hung it
      this.tweens.add({ targets: this.lamp, angle: { from: -7, to: 7 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      // the way in: one more static circle body
      var gz = this.goalZ = this.add.zone((gx + 0.5) * C, (gy + 0.5) * C, 0.5 * C, 0.5 * C); this.physics.add.existing(gz, true); gz.body.setCircle(0.25 * C);

      // the kid: a box body (the engine's walls stop it), a sprite that follows it
      var st = m.start, sx = (st[0] + 0.5) * C, sy = (st[1] + 0.5) * C;
      if (keep) { sx = (keep.ci + 0.5) * C; sy = (keep.cj + 0.5) * C; if (ts) { var t = sx; sx = sy; sy = t; } }
      var kz = this.kz = this.add.zone(sx, sy, BOX, BOX); this.physics.add.existing(kz); this.body = kz.body;
      this.physics.add.collider(kz, this.walls);
      this.physics.add.overlap(kz, this.itemsG, function (k, z) { self.collect(z.it); });
      this.physics.add.overlap(kz, gz, function () { if (self.state === 'play') self.home(); });
      this.kidSh = this.add.image(sx, sy + yo, 'mzs', 'kid-sh').setDepth(Z.kid - 0.1);
      this.kid = this.add.sprite(sx, sy + yo, 'mzs', 'kid-idle').setDepth(Z.kid);
      // face the way out of the start cell
      var o0 = this.mask(Math.floor(sx / C), Math.floor(sy / C));
      for (var i = 0; i < 4; i++) if (o0 & DIRS[i]) { this.ang = ANG[DIRS[i]]; break; }
      this.kid.setRotation(this.ang + Math.PI / 2);
      this.kid.on(Phaser.Animations.Events.ANIMATION_UPDATE, function (a, f) { if (f.index === 3 || f.index === 7) self.step(); });
      // a tap target: one picture reused
      this.marker = this.add.image(0, 0, 'mzs', 'ring-ok').setDepth(Z.fx - 0.5).setVisible(false);
      this.markT = null;
      // bursts: one emitter per kind (pooled by the engine)
      var burst = function (tints) { return self.add.particles(0, 0, 'ui', { frame: 'spark', emitting: false, lifespan: { min: 450, max: 800 }, speed: { min: 130, max: 520 }, angle: { min: 0, max: 360 }, gravityY: 560, scale: { start: 0.5, end: 0 }, tint: tints, alpha: { start: 1, end: 0.2 }, rotate: { min: 0, max: 360 } }).setDepth(Z.fx); };
      this.fxDate = burst([0xffd36b, 0xffb36b, 0xffffff]); this.fxCup = burst([0x8fe0ff, 0xffffff, 0xb8ecff]); this.fxLantern = burst([0xffd36b, 0xff9e45, 0xffffff]);
      this.fxHome = burst([0xffd36b, 0xff8fab, 0x7ae7ff, 0xffffff]);
      this.floaty(false).setVisible(false); this.floaty(false).setVisible(false); this.floaty(true).setVisible(false);       // made now, not at the first pick-up (a hitch)
      [this.fxDate, this.fxCup, this.fxLantern, this.fxHome].forEach(function (e) { e.explode(1, -9999, -9999); });
      this.cameras.main.startFollow(this.kid, false, 0.1, 0.1);
      var world = this.physics.world, stepFn = function (dt) { self.onStep(dt || 1 / 60); };
      world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, stepFn);
      this.events.once('shutdown', function () { world.off(Phaser.Physics.Arcade.Events.WORLD_STEP, stepFn); });
    }

    /* ---- the camera: zoom to fit the maze below the interface strip; scroll (following the kid) only the axis that does not fit ---- */
    fitWorld() {
      var v = this.vw, cam = this.cameras.main, m = this.maze, H = this.H, d = Kit.play.dpr(), gw = this.scale.width, gh = this.scale.height, z = v.z;
      // (the top leaves room for the interface row, whose buttons are 48 points: hud.js)
      var left = (v.sl - v.l + 24) * z, right = (v.r - v.sr + 24) * z, top = (v.st - v.t + (36 + 150 + 16) * 48 * v.pt / 150) * z, bottom = (v.b - v.sb + 24) * z;
      var aw = gw - left - right, ah = gh - top - bottom, air = C * 0.25, mw = m.cols * C + 2 * air, mh = m.rows * C + 2 * air + H;
      // a cell is never smaller than 46 screen points nor bigger than 150 (the old game's limit: on a big screen the maze stops
      // growing), nor 1.25 canvas pixels a unit (a picture is never shown bigger than painted)
      var zoom = Phaser.Math.Clamp(Math.min(aw / mw, ah / mh), 46 * d / C, Math.min(1.25, 150 * d / C));
      cam.setZoom(zoom);
      var vwu = gw / zoom, vhu = gh / zoom, sx = mw * zoom > aw + 1, sy = mh * zoom > ah + 1;
      var offx = ((left + aw / 2) - gw / 2) / zoom, offy = ((top + ah / 2) - gh / 2) / zoom;     // the area's middle, from the screen's, in world units
      var cx = m.cols * C / 2 - offx, cy = m.rows * C / 2 - H / 2 - offy;                        // camera middle that puts the maze in the area's middle
      var bx = sx ? -air - left / zoom : cx - vwu / 2, bw = sx ? m.cols * C + 2 * air + (left + right) / zoom : vwu;
      var by = sy ? -H - air - top / zoom : cy - vhu / 2, bh = sy ? m.rows * C + H + 2 * air + (top + bottom) / zoom : vhu;
      cam.setBounds(bx, by, bw, bh);
      cam.startFollow(this.kid, false, 0.1, 0.1, offx, offy);
      if (!sx && !sy) { cam.stopFollow(); cam.centerOn(cx, cy); }
      else if (this.state === 'play' || this.state === 'home') cam.centerOn(this.kid.x - offx, this.kid.y - offy);
      this.scrolls = sx || sy;
    }
    // where a world point is on the canvas (px), for the interface's flying treats and the house badge
    toScreen(wx, wy, out) {
      var cam = this.cameras.main, z = cam.zoom;
      out.x = (wx - (cam.scrollX + cam.width / 2 - cam.width / (2 * z))) * z; out.y = (wy - (cam.scrollY + cam.height / 2 - cam.height / (2 * z))) * z; return out;
    }

    /* ---- asking the engine about the walls ---- */
    // which of the four sides of cell (ci, cj) are open: a wall body where the sides meet means closed. Asked once per cell.
    mask(ci, cj) {
      var m = this.maze; if (ci < 0 || cj < 0 || ci >= m.cols || cj >= m.rows) return 0;
      var i = cj * m.cols + ci, c = this.oc[i];
      if (c < 0) {
        c = 0; var cx = (ci + 0.5) * C, cy = (cj + 0.5) * C, w = this.physics.world;
        for (var k = 0; k < 4; k++) {
          var d = DIRS[k], mx = cx + DX[d] * C / 2, my = cy + DY[d] * C / 2;
          if (!this.physics.overlapRect(mx - 4, my - 4, 8, 8, false, true).length) c |= d;
        }
        this.oc[i] = c;
      }
      return c;
    }
    open(ci, cj, d) { return !!(this.mask(ci, cj) & d); }

    /* ---- the child's ask: a direction held (stick or keys), a release, a tap ---- */
    newWant(d) {
      this.route = null; this.clearMarker();
      if (this.want !== d) this.bumped = 0;
      this.want = d;
      if (!this.dir) return;
      var kz = this.kz;
      if (d === OPP[this.dir]) { this.dir = d; this.tx += DX[d]; this.ty += DY[d]; this.glide = 0; return; }     // right round at once
      if (d !== this.dir) {                                                                                      // asked a moment too late: take the turn just passed
        var lx = this.tx - DX[this.dir], ly = this.ty - DY[this.dir];
        var p = (kz.x - (lx + 0.5) * C) * DX[this.dir] + (kz.y - (ly + 0.5) * C) * DY[this.dir];
        if (p >= 0 && p < 0.22 * C && this.open(lx, ly, d)) { this.dir = d; this.tx = lx + DX[d]; this.ty = ly + DY[d]; }
      }
    }
    release() { if (this.want === this.dir || !this.dir) this.want = 0; this.glide = 0; }

    // tap a spot close by and the kid walks there (tap on the kid: a hop)
    tapAt(px, py) {
      var m = this.maze, wp = this.cameras.main.getWorldPoint(px, py), cx = Math.floor(wp.x / C), cy = Math.floor((wp.y - this.yo) / C), kz = this.kz;
      if (cx < 0 || cy < 0 || cx >= m.cols || cy >= m.rows) return;
      this.game.events.emit('mz-used');
      var ci = Math.floor(kz.x / C), cj = Math.floor(kz.y / C);
      if (cx === ci && cy === cj) { this.hop(); return; }
      var from = this.dir ? [this.tx, this.ty] : [ci, cj], path = LV.route(m, from[0], from[1], cx, cy);
      if (!path || path.length > TAP_STEPS) { this.showMarker(cx, cy, false); Kit.snd.play('bump', { vol: 0.5 }); return; }
      this.want = 0; this.route = path; this.showMarker(cx, cy, true); Kit.snd.play('mark');
    }
    showMarker(cx, cy, ok) {
      var mk = this.marker; this.tweens.killTweensOf(mk);
      mk.setFrame(ok ? 'ring-ok' : 'ring-no').setPosition((cx + 0.5) * C, (cy + 0.5) * C + this.yo + C * 0.12).setVisible(true).setAlpha(ok ? 0.85 : 1).setScale(1);
      if (ok) this.tweens.add({ targets: mk, scale: 1.12, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      else this.tweens.add({ targets: mk, alpha: 0, duration: 600, onComplete: function () { mk.setVisible(false); } });
      if (ok && this.markT) this.markT.remove();
      this.markT = ok ? this.time.delayedCall(6000, this.clearMarker, [], this) : null;
    }
    clearMarker() { if (this.marker) { this.tweens.killTweensOf(this.marker); this.marker.setVisible(false); } if (this.markT) { this.markT.remove(); this.markT = null; } }
    hop() {
      var kid = this.kid; this.hopping = true; Kit.snd.play('hop');
      this.tweens.add({ targets: this, hopY: { from: 0, to: 1 }, duration: 420, ease: 'Sine.easeOut', yoyo: true, onUpdate: function () {}, onComplete: function () { kid.scene.hopping = false; } });
      this.squash(1.12, 0.88, 300);
    }

    /* ---- steering ---- */
    // Which way at a cell's middle? (cur = the way we arrived) The old page's rules, with the engine's answer about the walls.
    decide(ci, cj, cur) {
      var o = this.mask(ci, cj), back = OPP[cur], w = this.want, held = this.held;
      if (this.route) {
        if (this.route.length && (o & this.route[0])) return this.route.shift();
        this.route = null; this.clearMarker(); return 0;
      }
      if (w && w !== back && (o & w)) { if (!held && w !== cur) this.want = 0; return w; }
      var fw = []; for (var i = 0; i < 4; i++) if (DIRS[i] !== back && (o & DIRS[i])) fw.push(DIRS[i]);
      if (held) {
        if (o & cur) return cur;
        if (fw.length === 1 && fw[0] !== OPP[w]) return fw[0];                      // round a bend, but never back against the finger
        return 0;
      }
      if (++this.glide > 40) return 0;
      if (fw.length === 1 && (!w || fw[0] !== OPP[w])) return fw[0];                 // glide on to the next junction
      return 0;
    }
    stepKid(dt) {
      var kz = this.kz, body = this.body, d = this.dir, dx = DX[d], dy = DY[d];
      this.v = Math.min(SPEED, this.v + ACC * dt);
      var nx = (this.tx + 0.5) * C, ny = (this.ty + 0.5) * C;
      if ((nx - kz.x) * dx + (ny - kz.y) * dy <= 0) {                                // reached the next cell's middle
        var nd = this.decide(this.tx, this.ty, d);
        if (this.state !== 'play') return;
        if (!nd) { body.reset(nx, ny); this.dir = 0; this.v = 0; this.glide = 0; this.squash(1.12, 0.9, 260); return; }
        this.dir = d = nd; dx = DX[d]; dy = DY[d]; this.tx += dx; this.ty += dy; nx = (this.tx + 0.5) * C; ny = (this.ty + 0.5) * C;
      }
      // along the corridor at speed; across it, drawn gently to the lane's middle (the corner rounds itself, the engine stops her at a wall)
      var cross = dx ? (ny - kz.y) : (nx - kz.x), cv = Phaser.Math.Clamp(cross * LANE, -0.8 * SPEED, 0.8 * SPEED);
      body.setVelocity(dx ? dx * this.v : cv, dy ? dy * this.v : cv);
    }
    restKid(dt) {
      var kz = this.kz, body = this.body, ci = Math.floor(kz.x / C), cj = Math.floor(kz.y / C), cx = (ci + 0.5) * C, cy = (cj + 0.5) * C, w = this.want;
      if (this.route) {
        var r = this.route[0];
        if (r && this.open(ci, cj, r)) { this.route.shift(); this.setOff(r, ci, cj); return; }
        this.route = null; this.clearMarker();
      }
      if (w) {
        if (this.open(ci, cj, w)) { if (!this.held) this.want = 0; this.glide = 0; this.setOff(w, ci, cj); return; }
        if (this.bumped !== w) {                                                       // a wall: lean into it until the engine says touching, then bump once
          body.setVelocity(DX[w] * LEAN, DY[w] * LEAN); this.lean += dt;
          if (body.touching[SIDE[w]] || body.blocked[SIDE[w]] || this.lean > 0.3) this.bump(w);
          return;
        }
      }
      var ex = cx - kz.x, ey = cy - kz.y;
      if (Math.abs(ex) < 0.6 && Math.abs(ey) < 0.6) { if (ex || ey) body.reset(cx, cy); else body.setVelocity(0, 0); }
      else body.setVelocity(ex * 10, ey * 10);
    }
    setOff(d, ci, cj) { this.dir = d; this.tx = ci + DX[d]; this.ty = cj + DY[d]; this.v = Math.max(this.v, 1.2 * C); this.lean = 0; }
    bump(w) {
      this.bumped = w; this.lean = 0; if (!this.held) this.want = 0;
      Kit.snd.play(this.world === 0 ? 'bump-leaf' : 'bump'); Kit.buzz(8);
      var kid = this.kid, k = C * 0.08, nx = DX[w] * k, ny = DY[w] * k, self = this;
      this.nudge = { x: 0, y: 0 };
      this.tweens.add({ targets: this.nudge, x: nx, y: ny, duration: 90, yoyo: true, ease: 'Sine.easeOut', onComplete: function () { self.nudge.x = self.nudge.y = 0; } });
      this.squash(1.08, 0.94, 220);
    }
    squash(sx, sy, dur) { this.tweens.killTweensOf(this.sq); this.sq.x = sx; this.sq.y = sy; this.tweens.add({ targets: this.sq, x: 1, y: 1, duration: dur, ease: 'Back.easeOut' }); }
    step() { Kit.snd.play(STEP_SND[this.world]); }

    /* ---- things found ---- */
    collect(it) {
      if (it.taken || this.state !== 'play') return;
      it.taken = true; this.got++; if (it.type === 'lantern') this.gotLanterns++;
      var self = this, C2 = C, total = this.items.length, px = (it.x + 0.5) * C2, py = (it.y + 0.5) * C2 + this.yo;
      it.zone.destroy();
      this.tweens.killTweensOf([it.gt]);
      var fx = it.type === 'cup' ? this.fxCup : it.type === 'lantern' ? this.fxLantern : this.fxDate;
      fx.explode(14, px, py);
      this.tweens.add({ targets: [it.sp, it.sh, it.gt], alpha: 0, scale: '*=1.5', duration: 200, onComplete: function () { it.sp.destroy(); it.sh.destroy(); it.gt.destroy(); } });
      if (it.gl) this.tweens.add({ targets: it.gl, alpha: 0, duration: 300, onComplete: function () { it.gl.destroy(); } });
      it.pin.setTint(0xffd36b).setAlpha(1); this.tweens.add({ targets: it.pin, scale: { from: 1.3, to: 0.62 }, duration: 320, ease: 'Back.easeOut' });
      var all = this.got === total, tx = this.floaty(all);
      tx.setPosition(px, py - C2 * 0.3).setAlpha(1).setVisible(true);
      this.tweens.add({ targets: tx, y: tx.y - C2 * 0.8, alpha: 0, duration: 800, ease: 'Sine.easeOut', onComplete: function () { tx.setVisible(false); } });
      Kit.snd.play(it.type, { rate: 1 + Math.min(this.got, 8) * 0.012 }); Kit.buzz(10);
      if (all) this.time.delayedCall(220, function () { if (self.state === 'play' || self.state === 'home') Kit.snd.play('allfound'); });
      var s = this.toScreen(px, py, {});
      this.game.events.emit('mz-col', { got: this.got, total: total, type: it.type, sx: s.x, sy: s.y });
    }

    // the "+1" / "All found!" words rise from a pick-up: two "+1" texts and one "All found!", made once and used again
    floaty(all) {
      var f = this.fl || (this.fl = { n: 0, a: [], all: null }), st = { fontFamily: 'system-ui, sans-serif', fontStyle: '800', color: '#fff6c2', stroke: '#3c1e0a', strokeThickness: 8 };
      if (all) return f.all || (f.all = this.add.text(0, 0, 'All found!', Object.assign({ fontSize: '54px' }, st)).setOrigin(0.5).setDepth(Z.fx + 1));
      var i = f.n++ % 2; this.tweens.killTweensOf(f.a[i]);
      return f.a[i] || (f.a[i] = this.add.text(0, 0, '+1', Object.assign({ fontSize: '46px' }, st)).setOrigin(0.5).setDepth(Z.fx + 1));
    }

    /* ---- home: the door opens, the windows light up, then the iftar table ---- */
    home() {
      var self = this, m = this.maze, got = this.got, total = this.items.length, stars = got >= total ? 3 : got >= Math.ceil(total / 2) ? 2 : 1;
      this.state = 'home'; this.dir = 0; this.want = 0; this.route = null; this.clearMarker(); this.body.setVelocity(0, 0); this.body.enable = false; this.free = true;
      MzSave.progress.finish(this.n, stars); Kit.bridge.complete();
      var px = (m.goal[0] + 0.5) * C, py = (m.goal[1] + 0.5) * C, kid = this.kid;
      Kit.snd.play('knock'); Kit.snd.play('knock', { delay: 0.17 }); Kit.snd.play('door', { delay: 0.35 }); Kit.buzz(30);
      this.tweens.add({ targets: this.door, scaleX: 0.2, duration: 600, ease: 'Cubic.easeOut' });
      this.tweens.add({ targets: kid, x: px, y: py + C * 0.2 + this.yo, duration: 300, ease: 'Sine.easeInOut', onComplete: function () {
        self.tweens.add({ targets: [kid, self.kidSh], alpha: 0, scale: 0.4, duration: 350, ease: 'Quad.easeIn' });
        self.time.delayedCall(380, function () { Kit.snd.play('home'); });
        self.tweens.add({ targets: self.hLit, alpha: 1, duration: 500, ease: 'Cubic.easeOut' });
        self.tweens.add({ targets: self, homeLit: 1, duration: 500, ease: 'Cubic.easeOut' });
        for (var i = 0; i < 5; i++) self.time.delayedCall(i * 150, function () { self.fxHome.explode(18, px + Phaser.Math.Between(-C, C), py - C * 0.2 - Phaser.Math.Between(0, C)); });
      } });
      this.time.delayedCall(1500, function () { self.state = 'done'; self.game.events.emit('mz-won', { n: self.n, stars: stars, got: got, total: total, world: self.world }); });
    }

    /* ---- every frame: the child's ask -> steering; the pictures follow the body ---- */
    update(time, delta) {
      var dt = Math.min(delta, 40) / 1000, inp = this.inp;
      this.t += dt;
      if (this.state === 'play') {
        if (inp.tap) { var tp = inp.tap; inp.tap = null; this.tapAt(tp.x, tp.y); }
        if (inp.dir !== this.idir) { if (inp.dir) this.newWant(inp.dir); this.idir = inp.dir; }
        if (this.held && !inp.held) this.release();
        this.held = inp.held;
      }
      this.visual(dt);
    }
    // steering runs once per physics step (the engine's fixed 60 a second, however slow the screen), so a slow frame cannot overshoot a corner
    onStep(dt) {
      if (this.state !== 'play') return;
      if (this.dir) this.stepKid(dt); else this.restKid(dt);
    }
    visual(dt) {
      var kid = this.kid, kz = this.kz, sq = this.sq, nu = this.nudge, e = 1 - Math.exp(-dt * 22), moving = this.dir !== 0 && this.state === 'play';
      if (!this.free) {                                                           // the drawn kid eases toward the body: rounded corners, no jumps
        var hy = this.hopping ? Math.sin(this.hopY * Math.PI) * C * 0.22 : 0;
        kid.x += (kz.x + (nu ? nu.x : 0) - kid.x) * e; kid.y += (kz.y + this.yo + (nu ? nu.y : 0) - hy - kid.y) * e;
        this.kidSh.setPosition(kid.x, kz.y + this.yo + (nu ? nu.y : 0));
        var ta = this.dir ? ANG[this.dir] : this.ang, da = Math.atan2(Math.sin(ta - this.ang), Math.cos(ta - this.ang));
        this.ang += da * Math.min(1, dt * 16); kid.setRotation(this.ang + Math.PI / 2);
        var j = this.hopping ? Math.sin(this.hopY * Math.PI) * 0.12 : 0;
        kid.setScale(sq.x + j, sq.y + j);
        if (moving) { if (!kid.anims.isPlaying) kid.play('walk'); kid.anims.timeScale = Math.max(0.5, this.v / SPEED); }
        else if (kid.anims.isPlaying) { kid.anims.stop(); kid.setFrame('kid-idle'); }
      }
      // night: the pools of light the interface scene cuts out of the dark (kid's lantern grows with each lantern found)
      if (this.world === 2) this.lightGrow += (this.gotLanterns - this.lightGrow) * (1 - Math.exp(-dt * 2.5));
    }
    // light sources for the night, in world units: [x, y, radius] reused every frame, no allocation
    lampList(out) {
      var n = 0, t = this.t, C2 = C, flick = 1 + Math.sin(t * 9) * 0.015 + Math.sin(t * 13.7) * 0.01;
      out[n++] = this.kid.x; out[n++] = this.kid.y; out[n++] = C2 * (2.2 + this.lightGrow * 0.4) * flick;
      out[n++] = this.house.x; out[n++] = this.house.y - C2 * 0.06; out[n++] = C2 * (1.5 + this.homeLit * 3);
      for (var i = 0; i < this.items.length; i++) { var it = this.items[i]; if (it.taken) continue; out[n++] = it.sp.x; out[n++] = it.sp.y; out[n++] = C2 * (it.type === 'lantern' ? 1.1 : 0.7); }
      return n;
    }
  }
  window.MzMaze = Maze;
})();
