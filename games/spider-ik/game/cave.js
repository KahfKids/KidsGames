/* Spider IK: one cave (scene 'Cave', restarted for each level with { n }).
   Everything that the engine can do, the engine does (docs/phaser-standard.md section 1):
   - Matter physics: the walls are static bodies traced from the art (levels/shapes.json, tools/trace.js); the spider
     is a circle body driven by the old game's forces, given to the engine each step (applyForce: the stick, a hover
     spring along each planted foot's normal, gravity eased as feet hold); the engine integrates and collides.
     (Spring constraints were tried: they held the body too stiffly and lost the old springy feel.)
     Spinners and sticky blobs are kinematic bodies (huge mass, moved by their tweens); chasing blobs are sensor
     bodies driven by velocity; orbs, traps, portals and bursts are sensors; touching is the engine's collision events.
     Where a foot can land is the engine's point query (intersectPoint) marched along the leg's rays.
   - Tweens move the spinners, portals, fades and bursts; timer events switch the electric traps; animations play
     the orbs' and traps' frames; the camera follows and fades; particles spark at a burst.
   Kept as game code, because the engine has no such feature: posing each leg (a two-bone IK solve; a chain of Matter
   bodies was tried and let the legs fall straight and bunch to one side), the walking gait (when a leg steps, where it
   prefers its foot), how blobs behave, and which orb or trap is live. The numbers are the old
   page's (Scratch ran at 30 ticks a second; per-tick values are x30 per second here). */
(function () {
  'use strict';
  var K = SpArt.K, W = SpArt.W, H = SpArt.H, A = SpArt.A;
  var ROCK = 1, SOLID = 2, SPIDER = 4, LEG = 8, HAZ = 16, PICK = 32, BLOB = 64;
  var L1 = 26, L2 = 35, MAXR = L1 + L2, RB = 16, JUMP_BUFFER = 150, HOVER = 34;
  var MAXV = 28;        // Matter's 60 Hz-normalized velocity: limit extreme spinner flings. The 120 Hz solver advances half this distance per step.
  var SPIN_SIZE = 100;
  // spinner motions: [costume, kind, ...] (r: turns in place, y / x: swings, o: circles the middle and faces the spider)
  var SP = { 1: [1, 'r', 235, 175, -1], 2: [2, 'r', -22, -4, -1.5], 3: [3, 'y', 150, 38, 0, 0], 4: [4, 'y', 150, 38, 180, 0], 5: [5, 'y', 300, 38, 0, 0], 6: [6, 'y', 100, 105, 0, 20], 7: [7, 'r', 20, 0, -1.5], 8: [8, 'x', 150, 40, 0, 0], 9: [6, 'y', 70, 100, 0, -60], 10: [9, 'x', 150, 40, 0, 0], 11: [10, 'y', 150, 43, 0, 0], 12: [11, 'r', 185, 15, -2], 13: [12, 'x', 90, 145, 0, 0, 1], 14: [13, 'x', 130, 40, 0, 0, 1], 15: [14, 'o', 70], 16: [14, 'o', -70], 17: [15, 'r', 180, 0, -1.2], 18: [16, 'y', 150, 38, 0, 0], 19: [17, 'y', 200, 52, 0, 0], 20: [18, 'y', 200, 52, 180, 0], 21: [19, 'r', 30, 50, 1], 22: [20, 'y', 225, 52, 180, 0], 23: [21, 'y', 225, 52, 0, 0], 24: [22, 'r', 0, 0, 1.8], 25: [23, 'r', 15, -10, 2.5] };
  var wx = function (x) { return (x + 240) * K; }, wy = function (y) { return (180 - y) * K; };
  var sx2 = function (px) { return px / K - 240; }, sy2 = function (py) { return 180 - py / K; };
  var sfx = function (name, o) { Kit.snd.play(name, o); };

  class Cave extends Phaser.Scene {
    // Matter owns the fixed-step accumulator. At 60 Hz a capped fling still crossed a 7 px wall in the pinned engine;
    // 120 Hz physics passes that test while rendering stays at the screen's rate. Forces and jump impulse stay unchanged.
    constructor() { super({ key: 'Cave', physics: { default: 'matter', matter: { runner: { delta: 1000 / 120 }, gravity: { x: 0, y: 1.5 }, positionIterations: 6, velocityIterations: 4, constraintIterations: 4, debug: /[?&]phys/.test(location.search) } } }); }
    init(d) { this.n = d.n; }
    preload() {
      var n = this.n, L = SpArt.D.L[n - 1];
      ['under', 'main', 'fore'].forEach(function (k) { this.load.image(k + '-' + n, 'levels/' + k + '-' + n + '.webp'); }, this);
      // this level's spinners (other pictures were loaded once by Boot)
      L.spin.forEach(function (q) { var s = SP[q[2]]; if (s) SpArt.queue(this, 'spin' + (s[0] - 1), SPIN_SIZE); }, this);
      this.load.once('loaderror', function () { this.game.events.emit('sp-loaderror', n); }, this);
    }

    create() {
      var n = this.n, L = this.L = SpArt.D.L[n - 1], shapes = this.cache.json.get('shapes'), M = Phaser.Physics.Matter.Matter;
      this.Body = M.Body; this.Qp = M.Query.point; this.pt = { x: 0, y: 0 };
      SpArt.paint(this);
      // drop the last level's pictures (each level is about 3 MB decoded)
      this.textures.getTextureKeys().forEach(function (k) { var m = /^(under|main|fore|edge)-(\d+)$/.exec(k); if (m && +m[2] !== n) this.textures.remove(k); }, this);

      // ---- the cave: pictures, walls ----
      var cam = this.cameras.main, bg = SpArt.bg(n);
      cam.setBackgroundColor(bg).setBounds(0, 0, W, H);
      this.add.image(0, 0, 'under-' + n).setOrigin(0).setDisplaySize(W, H).setDepth(0);
      this.add.image(0, 0, SpArt.edge(this, n, shapes.levels[n - 1].edge)).setOrigin(0).setDepth(1);
      this.add.image(0, 0, 'main-' + n).setOrigin(0).setDisplaySize(W, H).setDepth(3);
      this.add.image(0, 0, 'fore-' + n).setOrigin(0).setDisplaySize(W, H).setDepth(11);
      var world = this.matter.world;
      this.solids = [];
      shapes.levels[n - 1].rock.forEach(function (p) { this.solids.push(this.body(p, null, 1, { isStatic: true, label: 'rock', friction: 0, frictionStatic: 0, collisionFilter: { category: ROCK, mask: SPIDER } })); }, this);
      this.rockN = this.solids.length;

      // ---- the spider ----
      this.spawn = this.spawnPoint();
      this.makeSpider();

      // ---- what touches the spider: the engine's collision events ----
      var self = this;
      var touch = function (ev) { ev.pairs.forEach(function (p) { var a = p.bodyA.parent, b = p.bodyB.parent; if (a === self.sb) self.touch(b); else if (b === self.sb) self.touch(a); }); };
      world.on('collisionstart', touch); world.on('collisionactive', touch); world.on('beforeupdate', this.drive, this);
      this.events.once('shutdown', function () { world.off('collisionstart', touch); world.off('collisionactive', touch); world.off('beforeupdate', self.drive, self); if (self.hum) self.hum.stop(0.3); });

      this.won = false; this.inp = this.registry.get('in');
      this.makeThings();
      this.settle();

      // ---- camera: the old zoom (phones see a wider slice), following the spider ----
      var fit = function () { var z = SpArt.zoomFor(window.innerWidth, window.innerHeight) * self.scale.width / window.innerWidth; cam.setZoom(z); };
      fit(); this.scale.on('resize', fit); this.events.once('shutdown', function () { self.scale.off('resize', fit); });
      cam.startFollow(this.bodyImg, false, 0.1, 0.1); cam.centerOn(this.sb.position.x, this.sb.position.y);
      cam.fadeIn(450, 0, 0, 0);

      Kit.snd.amb('amb-cave', { vol: 0.9 });
      this.hum = null; this.humV = -1;
      if (window.Kit.load) Kit.load.done();
      this.registry.set('lv', { n: n, req: L.req });
      this.game.events.emit('sp-start', n, L.req);
      if (Kit.play.debug) Kit.play.debug.cave = this;
    }

    /* ---- bodies from traced outlines ----
       p: one outline [x,y,...] (or a picture name with its outlines), in that picture's pixels; s: level px per picture
       px. The engine splits concave outlines into convex parts and centres the body on its centre of mass; _c keeps
       where that centre sits from the picture's own pivot, so the body can be turned round the pivot (put).
       Where the engine puts the body is not always the same: a body of several parts, or a convex outline, is centred on
       the (0, 0) asked for, but a concave outline that came out as ONE part is returned where its points are (Matter
       0.20 Bodies.fromVertices). Both are the outline moved by one shift, which the bounds tell, so _c is the centre
       of mass plus that shift (before, the second kind was sent to (0, 0): the rock was gone from the level). */
    body(p, name, s, opt) {
      var sets, m = name ? A[name] : { x: 0, y: 0 };
      var outl = name ? this.cache.json.get('shapes').sprites[name].polys : [p];
      sets = outl.map(function (q) { var v = []; for (var i = 0; i < q.length; i += 2) v.push({ x: (q[i] - m.x) * s, y: (q[i + 1] - m.y) * s }); return v; });
      var b = this.matter.add.fromVertices(0, 0, sets, opt, false, 0.01, 1), mnx = 1e9, mny = 1e9;   // (parts under 1 px2 dropped, not the engine's 10: a small piece of rock is still rock)
      sets.forEach(function (v) { v.forEach(function (q) { mnx = Math.min(mnx, q.x); mny = Math.min(mny, q.y); }); });
      b._c = { x: b.position.x + mnx - b.bounds.min.x, y: b.position.y + mny - b.bounds.min.y }; b._s = s;
      if (!name) this.Body.setPosition(b, { x: b._c.x, y: b._c.y });
      return b;
    }
    put(b, X, Y, ang) {
      var c = b._c, cs = Math.cos(ang), sn = Math.sin(ang), x = X + c.x * cs - c.y * sn, y = Y + c.x * sn + c.y * cs;
      if (b.isStatic) { this.Body.setAngle(b, ang); this.Body.setPosition(b, { x: x, y: y }); return; }
      // a kinematic body: given the velocity that takes it from where it was put last time, so what it pushes is pushed
      // smoothly. (It was the distance from where the ENGINE left it, which is the target plus last step's velocity: the
      // first call, from (0, 0), gave a velocity of hundreds of px, and since every step then threw the body that far
      // past its target and every call turned it round, the error never died: the spinner was solid hundreds or
      // thousands of px from its picture, for as long as every frame ran exactly one step: a steady 60 Hz phone.)
      var l = b._last, da = 0, dx = 0, dy = 0;
      if (l) { dx = x - l.x; dy = y - l.y; da = ang - l.a; da -= Math.round(da / (2 * Math.PI)) * 2 * Math.PI; }
      b._last = { x: x, y: y, a: ang };
      this.Body.setAngle(b, ang); this.Body.setPosition(b, { x: x, y: y });
      this.Body.setAngularVelocity(b, da); this.Body.setVelocity(b, { x: dx, y: dy });
    }
    resize(b, s) { if (Math.abs(s / b._s - 1) < 0.004) return; var k = s / b._s; this.Body.scale(b, k, k); b._c.x *= k; b._c.y *= k; b._s = s; }
    kin(name, s, cat, mask, label) {
      var b = this.body(null, name, s, { label: label, frictionAir: 0, friction: 0, frictionStatic: 0, ignoreGravity: true, collisionFilter: { category: cat, mask: mask } });
      this.Body.setMass(b, 1e6); this.Body.setInertia(b, Infinity); return b;
    }

    spawnPoint() {
      var L = this.L, sx = wx(L.sp[0]), sy = wy(L.sp[1]), dd = Math.hypot(W / 2 - sx, H / 2 - sy) || 1, rock = this.solids;
      for (var t = 75; t > 0; t -= 5) {
        var x = sx + (W / 2 - sx) / dd * t, y = sy + (H / 2 - sy) / dd * t, ok = true;
        for (var i = 0; i < 12 && ok; i++) if (this.matter.intersectPoint(x + Math.cos(i * 0.5236) * 26, y + Math.sin(i * 0.5236) * 26, rock).length) ok = false;
        if (ok) return { x: x, y: y };
      }
      return { x: sx, y: sy };
    }

    makeSpider() {
      var p = this.spawn, self = this;
      this.sb = this.matter.add.circle(p.x, p.y, RB, { label: 'spider', ignoreGravity: true, frictionAir: 0.057, friction: 0, frictionStatic: 0, restitution: 0, collisionFilter: { category: SPIDER, mask: ROCK | SOLID | HAZ | PICK | BLOB } });
      this.Body.setInertia(this.sb, Infinity);
      this.bodyImg = this.add.image(p.x, p.y, 'sp', 'body').setScale(0.92 / 4).setDepth(7);
      this.up = { x: 0, y: -1, a: 0 }; this.air = 0; this.jumpCool = 0; this.jumpAt = -1e9; this.footT = 0; this.evalI = 0;
      // eight legs, four a side, fanned from front to back like a real spider's
      this.legs = [-20, 10, 40, 70, 110, 140, 170, 200].map(function (deg, i) {
        var th = deg * Math.PI / 180;
        return { th: th, hx: Math.cos(th) * 11, hy: Math.sin(th) * 8, foot: null, step: null, cool: 0, nx: 0, ny: -1,
          fx: p.x, fy: p.y + 30, sg: 1,
          ti: self.add.image(0, 0, 'sp', 'thigh').setOrigin(3 / 38, 0.5).setScale(0.25).setDepth(6),
          si: self.add.image(0, 0, 'sp', 'shin').setOrigin(2.5 / 42, 0.5).setScale(0.25).setDepth(6),
          kn: self.add.image(0, 0, 'sp', 'dot').setScale(0.25 * 5 / 30).setTint(0x000000).setDepth(6) };
      });
    }
    // where a planted foot is now: its point on the rock or spinner, carried as that body moves and turns
    tip(l) {
      if (l.step) return { x: l.fx, y: l.fy };
      if (!l.foot) return { x: l.fx, y: l.fy };
      var b = l.foot.b, c = Math.cos(b.angle - l.foot.a0), s = Math.sin(b.angle - l.foot.a0);
      l.fx = b.position.x + l.foot.lx * c - l.foot.ly * s; l.fy = b.position.y + l.foot.lx * s + l.foot.ly * c;
      return { x: l.fx, y: l.fy };
    }
    hip(l) { var c = Math.cos(this.up.a), s = Math.sin(this.up.a), b = this.sb.position; return { x: b.x + c * l.hx - s * l.hy, y: b.y + s * l.hx + c * l.hy }; }
    lift(l) {
      l.foot = null;
      if (l.step) { l.step.remove(); l.step = null; }
    }
    // the nearest rock along a ray from (x, y): Matter's point query (Query.point, called directly: Phaser's wrapper
    // re-maps the list on every call), 6 px at a time against the rock near the leg (the tracer removed rock thinner
    // than that), then halved five times to the edge. Its ray query builds a new body per ray: 15% of a frame, measured.
    cast(x, y, a, near) {
      var dx = Math.cos(a), dy = Math.sin(a), Qp = this.Qp, pt = this.pt;
      for (var d = 6; d <= MAXR + 5; d += 6) {
        pt.x = x + dx * d; pt.y = y + dy * d;
        var inb = Qp(near, pt);
        if (inb.length) {
          var lo = d - 6, hi = d, one = [inb[0]];
          for (var k = 0; k < 5; k++) { var mid = (lo + hi) / 2; pt.x = x + dx * mid; pt.y = y + dy * mid; if (Qp(one, pt).length) hi = mid; else lo = mid; }
          return hi > MAXR ? null : { d: hi, x: x + dx * hi, y: y + dy * hi, b: inb[0] };
        }
      }
      return null;
    }
    normal(x, y, near) {
      var nx = 0, ny = 0;
      for (var i = 0; i < 16; i++) { var a = i / 16 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); this.pt.x = x + c * 7; this.pt.y = y + s * 7; if (!this.Qp(near, this.pt).length) { nx += c; ny += s; } }
      var l = Math.hypot(nx, ny); return l < 0.01 ? [0, -1] : [nx / l, ny / l];
    }
    nearSolids(x, y) {
      var r = MAXR + 4; return this.solids.filter(function (b) { var B = b.bounds; return B.max.x > x - r && B.min.x < x + r && B.max.y > y - r && B.min.y < y + r; });
    }
    target(l, ox, oy, near) {
      var best = null, legs = this.legs, ba = this.up.a;
      for (var k = 0; k < 28; k++) {
        var a = k / 28 * Math.PI * 2, h = this.cast(ox, oy, a, near); if (!h) continue;
        var diff = Math.abs(((a - (ba + l.th)) % (Math.PI * 2) + 3 * Math.PI) % (Math.PI * 2) - Math.PI), sc = h.d + diff * 14;
        for (var j = 0; j < legs.length; j++) { var q = legs[j]; if (q !== l && q.foot) { var f = this.tip(q); if (Math.hypot(f.x - h.x, f.y - h.y) < 11) sc += 45; } }
        if (!best || sc < best.sc) { h.sc = sc; best = h; }
      }
      return best;
    }

    stepTo(l, h) {
      var from = this.tip(l); this.lift(l);
      var nn = this.normal(h.x, h.y, this.nearSolids(h.x, h.y)), self = this, st = { t: 0 };   // (all rock near it: the walls are cut into cells)
      l.cool = 0.3; l.fx = from.x; l.fy = from.y;
      // the foot lifts in an arc and comes down on the new hold (a tween), then holds there
      l.step = this.tweens.add({ targets: st, t: 1, duration: 120, ease: 'Quad.easeOut',
        onUpdate: function () { var lift = Math.sin(Math.PI * st.t) * 9; l.fx = from.x + (h.x - from.x) * st.t + nn[0] * lift; l.fy = from.y + (h.y - from.y) * st.t + nn[1] * lift; },
        onComplete: function () {
          l.step = null;
          var b = h.b; l.foot = { b: b, lx: h.x - b.position.x, ly: h.y - b.position.y, a0: b.angle }; l.fx = h.x; l.fy = h.y;
          l.nx = nn[0]; l.ny = nn[1]; l.on = b; l.a0 = b.angle;
          var v = self.sb.velocity;
          if (self.live && Math.hypot(v.x, v.y) * 60 > 60 && self.footT <= 0) { self.footT = 0.16 + Math.random() * 0.08; sfx('foot', { vol: 0.5 + Math.random() * 0.3, pan: self.pan(h.x) }); }
        } });
    }

    legsStep(dt) {
      var legs = this.legs, b = this.sb, up = this.up, att = 0, tx = 0, ty = 0, self = this;
      legs.forEach(function (l) {
        if (!l.foot) return; att++;
        var r = l.on.angle - l.a0, c = Math.cos(r), s = Math.sin(r);                // a foot on a turning spinner turns with it
        tx += l.nx * c - l.ny * s; ty += l.nx * s + l.ny * c;
      });
      var tl = Math.hypot(tx, ty); if (tl > 0.2) { tx /= tl; ty /= tl; } else { tx = 0; ty = -1; }
      var k = Math.min(1, dt * (att ? 9 : 2)); up.x += (tx - up.x) * k; up.y += (ty - up.y) * k;
      var ul = Math.hypot(up.x, up.y) || 1; up.x /= ul; up.y /= ul; up.a = Math.atan2(up.x, -up.y);
      this.Body.setAngle(b, up.a);
      this.att = att;
      // which legs look for a better hold this frame: the old rule, which walks like a real spider: two neighbouring
      // legs never step together and at most three step at once (so feet alternate side to side), while a loose or
      // overstretched leg steps at once. A leg only looks when it may step (urgent, or rested 0.3 s since its last).
      var stepping = legs.filter(function (l) { return l.step; }).length;
      // a spider at rest keeps its feet where they are (no looking for better holds: most of the idle cost, measured)
      var still = Math.hypot(b.velocity.x, b.velocity.y) * 60 < 15 && !this.inp.ax && !this.inp.ay;
      for (var i = 0; i < legs.length; i++) {
        var l = legs[i]; l.cool -= dt; if (l.step) continue;
        var hp = this.hip(l), ft = this.tip(l), d = Math.hypot(ft.x - hp.x, ft.y - hp.y);
        if (l.foot && d > MAXR * 1.08) this.lift(l);
        var urgent = !l.foot || d > MAXR * 0.93 || d < 11;
        if (!urgent && (l.cool > 0 || still)) continue;
        if (this.jumpCool > 0.15) continue;
        var nb = legs[(i + 1) % 8].step || legs[(i + 7) % 8].step;
        if (!(urgent ? stepping < 5 : (stepping < 3 && !nb))) continue;
        var v = b.velocity, ox = hp.x + v.x * 9, oy = hp.y + v.y * 9, near = this.nearSolids(hp.x, hp.y);  // (9 steps = the old 0.15 s look-ahead)
        if (!near.length) continue;
        if (this.matter.intersectPoint(ox, oy, near).length) { ox = hp.x; oy = hp.y; }
        var h = this.target(l, ox, oy, near);
        if (h && (urgent || h.d + 22 < d)) { this.stepTo(l, h); stepping++; }
      }
      // a loose leg that found no hold hangs towards its resting place
      legs.forEach(function (l) {
        if (l.foot || l.step) return;
        var hp = self.hip(l), rx = hp.x + Math.cos(up.a + l.th) * MAXR * 0.6, ry = hp.y + Math.sin(up.a + l.th) * MAXR * 0.6, q = Math.min(1, dt * 10);
        l.fx += (rx - l.fx) * q; l.fy += (ry - l.fy) * q;
      });
    }

    // once per engine step (Matter's beforeupdate), however often the screen draws
    drive() {
      if (this.won) return;
      var b = this.sb, self = this, go = this.live ? 1 : 0;           // (while settling at the start: no stick)
      // the old spider's forces, given to the engine (it integrates them and resolves every contact): the stick
      // (1400 px/s^2); while feet hold, a spring keeping the body HOVER from the rock along each foot's normal (70 per
      // px, shared by the feet) and damping of motion off the rock (12); gravity is the engine's, eased by the feet
      var fx = this.inp.ax * 1400 * go, fy = this.inp.ay * 1400 * go, up = this.up, held = this.legs.filter(function (l) { return l.foot; });
      if (held.length && this.jumpCool <= 0) {
        var sx = 0, sy = 0, v60x = b.velocity.x * 60, v60y = b.velocity.y * 60;
        held.forEach(function (l) {
          var r = l.on.angle - l.a0, c = Math.cos(r), s = Math.sin(r), nx = l.nx * c - l.ny * s, ny = l.nx * s + l.ny * c, f = self.tip(l);
          var e = HOVER - ((b.position.x - f.x) * nx + (b.position.y - f.y) * ny); sx += e * nx; sy += e * ny;
        });
        fx += 70 * sx / held.length; fy += 70 * sy / held.length;
        var vn = v60x * up.x + v60y * up.y; fx -= 12 * vn * up.x; fy -= 12 * vn * up.y;
      }
      var sp = Math.hypot(b.velocity.x, b.velocity.y); if (sp > MAXV) this.Body.setVelocity(b, { x: b.velocity.x * MAXV / sp, y: b.velocity.y * MAXV / sp });
      // gravity, lighter as more feet hold (the old 1500 x (1 - feet / 4)); the build's Matter ignores a body's gravityScale
      fy += 1500 * (1 - Math.min(1, held.length / 4));
      this.Body.applyForce(b, b.position, { x: fx * b.mass * 1e-6, y: fy * b.mass * 1e-6 });
    }

    // 40 steps with no stick, so the spider is hanging by its feet when play starts. The feet plant by tweens (the tween
    // manager runs on the wall clock, which does not move inside this loop), so each step is completed here: before, no foot
    // ever landed in settle, the spider fell the whole 40 steps (about 130 px) and play began wherever that left it
    // (L10: in the electric trap under the start, again and again).
    settle() {
      this.live = false;
      for (var i = 0; i < 40; i++) { this.legsStep(1 / 60); this.legs.forEach(function (l) { if (l.step) l.step.complete(); }); this.matter.world.step(16.666); }
      this.live = true;
    }

    /* ---- the level's things ---- */
    makeThings() {
      var L = this.L, n = this.n, self = this, th = SpArt.theme(n);
      if (this.things) this.things.forEach(function (t) { t.kill(); });
      this.things = []; this.col = 0; this.T0 = this.time.now;
      this.solids.length = this.rockN;
      var add = function (t) { self.things.push(t); return t; };
      var killer = function (img, body, tws) { return function () { (tws || []).forEach(function (w) { w.remove(); }); if (img) img.destroy(); if (body) self.matter.world.remove(body); }; };
      var spd = n === 21 ? 0.9 : n === 18 ? 0.65 : n === 14 ? 0.55 : 1;

      // spinners: kinematic bodies driven by a tween of their phase
      L.spin.forEach(function (q) {
        var s = SP[q[2]]; if (!s) return;
        var k = 'spin' + (s[0] - 1), img = self.add.image(0, 0, k).setDepth(8), b = self.kin(k, K * SPIN_SIZE / 100 / A[k].r, SOLID, SPIDER, 'spin');
        self.solids.push(b);
        var o = { x: q[0], y: q[1], dir: 90, br: 0, p: 0 }, t = { kind: 'spin', o: o, b: b, img: img, s: s };
        var rate = (s[1] === 'r' ? 30 * Math.abs(s[4]) : s[1] === 'o' ? Math.abs(s[2]) : s[2]) * spd;     // degrees a second
        t.tw = self.tweens.add({ targets: o, p: 360, duration: 360 / rate * 1000, repeat: -1 });
        var apply = function () {
          if (s[1] === 'r') { o.x = s[2]; o.y = s[3]; o.dir = 90 + Math.sign(s[4]) * o.p; }
          else if (s[1] === 'y') { o.y = Math.sin((o.p + s[4]) * Math.PI / 180) * s[3] + s[5]; }
          else if (s[1] === 'x') { o.x = Math.sin(o.p * Math.PI / 180) * s[3]; if (s[6]) o.y = 0; }
          else { var a = o.p * Math.sign(s[2]) * Math.PI / 180; o.y = Math.cos(a) * 137; o.x = Math.sin(a) * 185; var p = self.sb.position; o.dir = 90 - Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(o.x, o.y, sx2(p.x), sy2(p.y))); }
          SpArt.place(img, k, o.x, o.y, o.dir, SPIN_SIZE); self.put(b, wx(o.x), wy(o.y), Phaser.Math.DegToRad(o.dir - 90));
        };
        t.apply = apply; apply();
        // spinner 21 turns faster while the spider is near the middle
        if (q[2] === 21) t.tick = function () { var p = self.sb.position; o.br += ((Math.hypot(sx2(p.x) - 30, sy2(p.y) - 50) < 100) ? (100 - o.br) / 4 : -o.br / 8); t.tw.timeScale = 1 + 2 * o.br / 100; };
        t.kill = killer(img, b, [t.tw]);
        add(t);
      });

      // orbs: sensors that light up in order; the engine's animation plays their glow
      L.orbs.forEach(function (q) {
        var img = self.add.sprite(wx(q[0]), wy(q[1]), 'orb0').setDepth(2).play({ key: 'orb', startFrame: ((Math.floor(q[0]) % 14) + 14) % 14 }).setAlpha(0);
        SpArt.place(img, 'orb0', q[0], q[1], 90, 60);
        var b = self.matter.add.circle(wx(q[0]), wy(q[1]), 14, { isStatic: true, isSensor: true, label: 'orb', collisionFilter: { category: PICK, mask: SPIDER } });
        var t = { kind: 'orb', s: q[2], img: img, b: b, x: q[0], y: q[1], lit: false, got: false };
        b.thing = t; t.kill = killer(img, b);
        add(t);
      });

      // electric traps: sensors switched by timer events, faded by tweens
      L.elec.forEach(function (q) {
        var e = { x: q[0], y: q[1], r: q[2], sz: q[3], sec: q[5], st: q[6], sa: q[7] };
        var img = self.add.sprite(0, 0, 'elec0').setDepth(9).play('elec').setAlpha(0);
        SpArt.place(img, 'elec0', e.x, e.y, e.r - 90, e.sz);
        var b = self.body(null, 'elec0', K * e.sz / 100 / A.elec0.r, { isStatic: true, isSensor: true, label: 'elec', collisionFilter: { category: HAZ, mask: SPIDER } });
        self.put(b, wx(e.x), wy(e.y), Phaser.Math.DegToRad(e.r - 90 - 90));
        var t = { kind: 'elec', e: e, img: img, b: b, blink: true, on: false, tws: [] };
        b.thing = t;
        if (e.st > 0) {                                                                // blinking: on for st ticks, off for st ticks
          var ph = e.sa % (2 * e.st); t.blink = ph < e.st;
          t.timer = self.time.addEvent({ delay: e.st / 30 * 1000, startAt: (ph % e.st) / 30 * 1000, loop: true, callback: function () { t.blink = !t.blink; self.elecSet(t); } });
        }
        t.kill = function () { if (t.timer) t.timer.remove(); self.tweens.killTweensOf(img); img.destroy(); self.matter.world.remove(b); };
        add(t); self.elecSet(t, true);
      });

      // blobs: sticky ones are kinematic solids that grow; the others chase as sensor bodies under velocity
      L.blobs.forEach(function (q) {
        var t = { kind: 'blob', t: q[2], x: q[0], y: q[1], ox: q[0], oy: q[1], sz: q[2] === 1 ? 10 : 40, rot: Math.random() * 360, w: 0, state: 'wait' };
        var k = q[2] === 1 ? 'costume3' : (q[2] === 2 || q[2] === 4) ? 'costume4' : 'costume5';
        t.k = k; t.img = self.add.image(0, 0, k).setDepth(q[2] === 1 ? 8 : 9);
        if (q[2] === 1) { t.b = self.kin(k, K * t.sz / 100 / A[k].r, SOLID, SPIDER, 'sticky'); self.solids.push(t.b); }
        else {
          t.b = self.body(null, k, K * 40 / 100 / A[k].r, { label: 'blob', isSensor: true, frictionAir: 0, ignoreGravity: true, collisionFilter: { category: BLOB, mask: SPIDER | BLOB } });
          self.Body.setAngularVelocity(t.b, 4 * Math.PI / 180 * 30 / 60);           // 120 degrees a second
          self.put(t.b, wx(t.x), wy(t.y), Phaser.Math.DegToRad(t.rot));
        }
        t.b.thing = t;
        t.kill = function () { self.tweens.killTweensOf(t.img); if (t.fuse) t.fuse.remove(); t.img.destroy(); if (!t.gone) self.matter.world.remove(t.b); };
        add(t);
      });

      // the way out and the teleportals: sensors that turn (tweens) and breathe (a yoyo tween on their size)
      var pulse = { k: 1 }; this.pulse = pulse;
      var ptw = this.tweens.add({ targets: pulse, k: { from: 0.9, to: 1.1 }, duration: 1963, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      var spinT = { a: 0 }, stw = this.tweens.add({ targets: spinT, a: 360, duration: 4000, repeat: -1 });
      add({ kind: 'clock', kill: function () { ptw.remove(); stw.remove(); } });
      var en = L.en;
      [['portal0', 1], ['portal1', -130 / 90]].forEach(function (pp) {
        var img = self.add.image(0, 0, pp[0]).setDepth(4), b = self.body(null, pp[0], K * 55 / 100 / A[pp[0]].r, { isStatic: true, isSensor: true, label: 'portal', collisionFilter: { category: PICK, mask: SPIDER } });
        var t = { kind: 'portal', img: img, b: b, sp: pp[1] }; b.thing = t;
        t.apply = function () { var d = 90 + spinT.a * pp[1], sz = 55 * pulse.k; SpArt.place(img, pp[0], en[0], en[1], d, sz); self.resize(b, K * sz / 100 / A[pp[0]].r); self.put(b, wx(en[0]), wy(en[1]), Phaser.Math.DegToRad(d - 90)); img.setAlpha(self.col >= L.req ? 1 : 0.3); };
        t.kill = killer(img, b); add(t);
      });
      L.port.forEach(function (q) {
        var img = self.add.image(0, 0, 'tele0').setDepth(5), b = self.body(null, 'tele0', K * 60 / 100 / A.tele0.r, { isStatic: true, isSensor: true, label: 'tele', collisionFilter: { category: PICK, mask: SPIDER } });
        var t = { kind: 'tele', img: img, b: b, q: q }; b.thing = t;
        t.apply = function () { var d = 90 + spinT.a * 60 / 90, sz = 60 * pulse.k; SpArt.place(img, 'tele0', q[0], q[1], d, sz); self.resize(b, K * sz / 100 / A.tele0.r); self.put(b, wx(q[0]), wy(q[1]), Phaser.Math.DegToRad(d - 90)); };
        t.kill = killer(img, b); add(t);
      });
      // the orbs still to find, in the world (game-ui-ux: diegetic, with the HUD's row as the fallback): small orbs
      // circling the way out, dim until each is taken
      this.ring = [];
      if (L.req) {
        var orbit = { a: 0 }, rw = this.tweens.add({ targets: orbit, a: Math.PI * 2, duration: 9000, repeat: -1 });
        for (var i = 0; i < L.req; i++) this.ring.push(this.add.image(0, 0, 'ui-orb').setDepth(4.5).setScale(0.3).setTint(0x7f8a8c).setAlpha(0.55));
        var R = 150;
        add({ kind: 'ring', apply: function () { var n2 = self.ring.length; self.ring.forEach(function (o, i) { var a = orbit.a + i / n2 * Math.PI * 2; o.setPosition(wx(en[0]) + Math.cos(a) * R, wy(en[1]) + Math.sin(a) * R * 0.85); }); },
          kill: function () { rw.remove(); self.ring.forEach(function (o) { o.destroy(); }); self.ring = []; } });
      }
      this.tpc = 0;
      this.collect(0, true);
    }

    // an electric trap is live while its rule says so (always, until n orbs, at orb n, blinking); 0.33 s to fade
    elecSet(t, now) {
      var e = t.e, c = this.col, on = e.sec === -1 || (e.sec === -2 && c <= 1) || (e.sec === -3 && c <= 2) || (e.sec >= 0 && e.sec === c);
      on = on && t.blink;
      if (on === t.on && !now) return;
      var was = t.on; t.on = on;
      this.tweens.killTweensOf(t.img);
      this.tweens.add({ targets: t.img, alpha: on ? 1 : 0, duration: now ? 0 : 333 });
      if (on && !was && !now) { var p = this.sb.position, d = Math.hypot(sx2(p.x) - e.x, sy2(p.y) - e.y); if (d < 150) sfx('zap', { vol: 1 - d / 150, pan: this.pan(wx(e.x)) }); }
    }
    // orbs light up in order; the count reaches the HUD
    collect(c, first) {
      this.col = c; var self = this;
      this.things.forEach(function (t) {
        if (t.kind === 'orb' && !t.got && !t.lit && t.s <= c) { t.lit = true; self.tweens.add({ targets: t.img, alpha: 1, duration: 333 }); }
        if (t.kind === 'elec') self.elecSet(t, first);
      });
      (this.ring || []).forEach(function (o, i) {
        if (i < c && o.alpha < 1) { o.clearTint().setAlpha(1).setScale(0.6); self.tweens.add({ targets: o, scale: 0.36, duration: 300, ease: 'Back.easeOut' }); }
      });
      this.game.events.emit('sp-col', c, this.L.req);
    }

    touch(o) {
      if (!o || !this.live || this.won) return;
      var t = o.thing, self = this;
      if (o.label === 'orb' && t.lit && !t.got && t.img.alpha > 0.5) {
        t.got = true; this.matter.world.remove(t.b);
        this.tweens.add({ targets: t.img, alpha: 0, scaleX: t.img.scaleX * 1.5, scaleY: t.img.scaleY * 1.5, duration: 333, onComplete: function () { t.img.setVisible(false); } });
        sfx('orb', { rate: 1 + 0.06 * Math.min(this.col, 5), pan: this.pan(t.b.position.x) });
        this.collect(this.col + 1);
        if (this.L.req && this.col === this.L.req) sfx('open', { delay: 0.25 });
      } else if (o.label === 'elec' && t.img.alpha * 255 > 110) this.dead = true;
      else if (o.label === 'blob' && t.img.visible && t.img.alpha * 255 > 110) this.dead = true;
      else if (o.label === 'burst') this.dead = true;
      else if (o.label === 'tele' && !this.tpc) {
        var twin = this.things.filter(function (q) { return q.kind === 'tele' && q !== t && q.q[2] === t.q[2]; })[0];
        if (!twin) return;
        this.tpc = 1; sfx('tele');
        this.legs.forEach(function (l) { self.lift(l); });
        var to = { x: wx(twin.q[0]), y: wy(twin.q[1]) };
        this.Body.setPosition(this.sb, to); this.Body.setVelocity(this.sb, { x: 0, y: 0 });
        this.legs.forEach(function (l) { l.fx = to.x; l.fy = to.y; });
        this.tpOut = twin;
      } else if (o.label === 'portal' && this.col >= this.L.req) this.win();
    }

    win() {
      this.won = true; sfx('portal');
      this.game.events.emit('sp-won', this.n);
    }
    die() {
      if (!this.live) return;
      sfx('back');
      var p = this.spawn, self = this;
      this.legs.forEach(function (l) { self.lift(l); });
      this.Body.setPosition(this.sb, p); this.Body.setVelocity(this.sb, { x: 0, y: 0 });
      this.legs.forEach(function (l) { l.fx = p.x; l.fy = p.y + 20; });
      this.up.x = 0; this.up.y = -1; this.jumpAt = -1e9;
      this.makeThings(); this.settle();
      this.cameras.main.centerOn(p.x, p.y);
    }
    burst(x, y, s) {
      var self = this, col = Phaser.Display.Color.HexStringToColor(SpArt.theme(this.n)[0]).color;
      var img = this.add.image(wx(x), wy(y), 'fx-burst').setDepth(10).setTint(col).setTintMode(Phaser.TintModes.FILL);
      var r0 = 10 * K, r1 = (10 + s * 0.8) * K;
      var b = this.matter.add.circle(wx(x), wy(y), r0 * 0.95 - RB, { isStatic: true, isSensor: true, label: 'burst', collisionFilter: { category: HAZ, mask: SPIDER } });
      var st = { r: r0 }; b._s = 1;
      this.tweens.add({ targets: st, r: r1, duration: 233, onUpdate: function (tw) { var k = tw.progress; img.setScale(st.r / 133).setAlpha(Math.pow(1 - k, 2)).setAngle(k * 57); var want = Math.max(1, st.r * 0.95 - RB) / Math.max(1, r0 * 0.95 - RB); self.Body.scale(b, want / b._s, want / b._s); b._s = want; },
        onComplete: function () { img.destroy(); self.matter.world.remove(b); } });
      this.add.particles(wx(x), wy(y), 'sp', { frame: 'dot', speed: { min: 120, max: 320 }, lifespan: 380, scale: { start: 0.08, end: 0 }, tint: col, quantity: 14, emitting: false }).setDepth(10).explode(14);
      sfx('pop', { pan: this.pan(wx(x)) });
    }
    pan(x) { var c = this.cameras.main; return Phaser.Math.Clamp((x - c.midPoint.x) / (c.worldView.width / 2), -1, 1) * 0.6; }

    // blobs: the old rules, per second
    blobs(dt) {
      var p = this.sb.position, px = sx2(p.x), py = sy2(p.y), n = this.n, self = this, B = this.Body;
      var list = this.things.filter(function (t) { return t.kind === 'blob' && !t.gone; });
      list.forEach(function (o) {
        var dx = px - o.x, dy = py - o.y, d = Math.hypot(dx, dy) || 1, big = o.t === 2 || o.t === 4;
        if (o.t === 1) {
          var gf = (n >= 16 && n <= 20) ? 0.45 : 1, g = dt * 30;
          if (d < 50) { o.w += g; if (o.w > 10) o.sz += 1.5 * gf * g; } else { o.w = 0; o.sz += (1 - d / 50) * gf * g; if (o.sz < 10) o.sz = 10; }
          o.sz = Math.min(o.sz, 220);
          SpArt.place(o.img, o.k, o.x, o.y, 90 + o.rot, o.sz); self.resize(o.b, K * o.sz / 100 / A[o.k].r); self.put(o.b, wx(o.x), wy(o.y), Phaser.Math.DegToRad(o.rot));
          return;
        }
        var f = (n === 21 && !big) ? 0.55 : big ? 0.6 : 1, sp = 0;
        if (big) {
          if (o.state === 'wait' && d < 45) {                                         // a fuse: it flickers, then bursts
            o.state = 'fuse';
            self.tweens.add({ targets: o, sz: 47, duration: 66, yoyo: true, repeat: 2 });
            o.fuse = self.time.delayedCall(400, function () { self.pop(o); self.burst(o.x, o.y, 150); });
          }
        } else if (o.state === 'wait' && d < 140) {                                     // a chaser: wakes, chases, fades, comes back
          o.state = 'chase'; o.img.setVisible(true).setAlpha(1);
          self.tweens.add({ targets: o.img, alpha: 0, duration: 3333, onComplete: function () { o.img.setVisible(false); } });
          o.fuse = self.time.delayedCall(4000, function () { o.x = o.ox; o.y = o.oy; o.sz = 35; o.state = 'wait'; o.img.setVisible(true).setAlpha(1); B.setPosition(o.b, { x: wx(o.x), y: wy(o.y) }); });
        }
        if (o.state === 'chase') sp = 2;
        // velocity towards the spider, in level px per engine step; the engine moves the body
        var v = sp * f * K * 30 / 60;
        B.setVelocity(o.b, { x: dx / d * v, y: -dy / d * v });
        var c = o.b.position; o.x = sx2(c.x - (o.b._c.x * Math.cos(o.b.angle) - o.b._c.y * Math.sin(o.b.angle))); o.y = sy2(c.y - (o.b._c.x * Math.sin(o.b.angle) + o.b._c.y * Math.cos(o.b.angle)));
        o.rot = Phaser.Math.RadToDeg(o.b.angle);
        self.resize(o.b, K * o.sz / 100 / A[o.k].r);
        SpArt.place(o.img, o.k, o.x, o.y, 90 + o.rot, o.sz);
      });
      // two big blobs that meet both burst
      for (var i = 0; i < list.length; i++) for (var j = i + 1; j < list.length; j++) {
        var a = list[i], c2 = list[j];
        if (a.gone || c2.gone || !(a.t === 2 || a.t === 4) || !(c2.t === 2 || c2.t === 4)) continue;
        if (this.matter.overlap(a.b, [c2.b])) { this.pop(a); this.pop(c2); this.burst((a.x + c2.x) / 2, (a.y + c2.y) / 2, a.sz + c2.sz); }
      }
    }
    pop(o) { if (o.gone) return; o.gone = true; if (o.fuse) o.fuse.remove(); this.matter.world.remove(o.b); o.img.setVisible(false); }

    update(time, dms) {
      var dt = Math.min(dms, 50) / 1000, b = this.sb, inp = this.inp, self = this;
      if (inp.restart || this.dead) { inp.restart = 0; this.dead = false; this.die(); }   // (a touch only says so: die() rebuilds the level and steps the engine, which cannot happen inside one of its own steps)
      if (this.won) { this.sync(); return; }
      this.jumpCool = Math.max(0, this.jumpCool - dt); this.footT -= dt;
      if (inp.jump) { inp.jump = 0; this.jumpAt = time; }
      this.legsStep(dt);
      // jump: a press up to 150 ms before the feet touch still counts (input-systems buffer)
      if (time - this.jumpAt <= JUMP_BUFFER && this.att && this.jumpCool <= 0) {
        this.jumpAt = -1e9; this.jumpCool = 0.3; this.legs.forEach(function (l) { self.lift(l); });
        this.Body.setVelocity(b, { x: b.velocity.x + this.up.x * 520 / 60, y: b.velocity.y + this.up.y * 520 / 60 }); sfx('jump');
      }
      if (!this.att) this.air += dt; else { if (this.air > 0.3) sfx('land', { pan: 0 }); this.air = 0; }
      // squeezed into rock by a spinner: back to the start
      var x = b.position.x, y = b.position.y, sol = this.nearSolids(x, y), n12 = 0, pt = this.pt;
      pt.x = x; pt.y = y; if (sol.length && this.Qp(sol, pt).length) { this.die(); return; }
      if (sol.length) for (var i = 0; i < 12; i++) { pt.x = x + Math.cos(i * 0.5236) * 12; pt.y = y + Math.sin(i * 0.5236) * 12; if (this.Qp(sol, pt).length) n12++; }
      if (n12 >= 5) { this.die(); return; }
      // things
      this.things.forEach(function (t) { if (t.tick) t.tick(); if (t.apply) t.apply(); });
      this.blobs(dt);
      if (this.tpOut && !this.matter.overlap(this.sb, [this.tpOut.b])) { this.tpOut = null; this.tpc = 0; }
      this.near();
      this.sync();
    }
    // the electric hum: only when the spider is near something live, louder the nearer (audio-design: no constant drone)
    near() {
      var p = this.sb.position, px = sx2(p.x), py = sy2(p.y), dm = 1e9;
      this.things.forEach(function (t) {
        if (t.kind === 'orb' && t.lit && !t.got) dm = Math.min(dm, Math.hypot(px - t.x, py - t.y));
        if (t.kind === 'elec' && t.on) dm = Math.min(dm, Math.hypot(px - t.e.x, py - t.e.y));
      });
      var v = Math.pow(Phaser.Math.Clamp(1 - dm / 160, 0, 1), 2) * 0.7;
      if (v > 0.01 && !this.hum) { this.hum = Kit.snd.loop('hum', { vol: 0, fade: 0.5 }); this.humV = 0; }
      if (this.hum && Math.abs(v - this.humV) > 0.02) { this.humV = v; this.hum.vol(v, 0.25); }
    }
    // pictures follow their bodies
    sync() {
      var b = this.sb.position, up = this.up, self = this;
      this.bodyImg.setPosition(b.x, b.y).setRotation(up.a);
      // each leg: hip on the body, foot where it holds; the knee is where two bones of the leg's lengths meet, on the
      // side away from the rock (a real spider's knees stand high), kept on that side unless the other is much better
      this.legs.forEach(function (l) {
        var h = self.hip(l), f = self.tip(l), dx = f.x - h.x, dy = f.y - h.y, D = Math.hypot(dx, dy) || 1;
        var Dc = Math.max(Math.abs(L1 - L2) + 1, Math.min(L1 + L2 - 0.5, D)); dx /= D; dy /= D;
        var ang = Math.acos(Phaser.Math.Clamp((L1 * L1 + Dc * Dc - L2 * L2) / (2 * L1 * Dc), -1, 1)), best = null;
        [1, -1].forEach(function (sg) {
          var c = Math.cos(ang * sg), s = Math.sin(ang * sg), kx = h.x + (dx * c - dy * s) * L1, ky = h.y + (dx * s + dy * c) * L1;
          var sc = (kx - h.x) * up.x + (ky - h.y) * up.y + (sg === l.sg ? 8 : 0);
          if (!best || sc > best.sc) best = { kx: kx, ky: ky, sc: sc, sg: sg };
        });
        l.sg = best.sg;
        var ex = h.x + dx * Dc, ey = h.y + dy * Dc;
        l.ti.setPosition(h.x, h.y).setRotation(Math.atan2(best.ky - h.y, best.kx - h.x));
        l.si.setPosition(best.kx, best.ky).setRotation(Math.atan2(ey - best.ky, ex - best.kx));
        l.kn.setPosition(best.kx, best.ky);
      });
    }
  }

  window.SpCave = Cave;
})();
