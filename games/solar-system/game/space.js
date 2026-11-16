/* Solar System: the space scene ('Space').
   A living model of the Solar System to explore (drag to turn it, pinch or wheel to zoom, tap a planet to fly to it) and
   the "Find the planet!" game: 15 levels in 3 worlds of "find it", "which is bigger?" and "which is closest to the Sun?".
   Where the engine does the work:
   - the camera is Phaser's own: zoom, centre and (on an upright phone) rotation. Zoom, pan and the flight to a planet are
     tweens on a few numbers; each frame those numbers are put on the camera;
   - every ball is the engine's Shader (planet.js, on the graphics chip), the orbits are one static Graphics and the
     asteroid belt one picture turned by a single rotation, both inside one container squashed by the view's elevation
     (the engine's transform does the tilt); the sky is its own scene (sky.js);
   - timers are the scene's clock (banner, the pause before a new question, shooting stars, the idle drift back), colour
     flashes and bursts are the interface scene's particles, and sounds go through Kit.snd.
   What stays game code, and why: a real 3D view of the planets (turning round the Sun, tipping up and down) needs each
   planet's place projected every frame (16 points; there is no 3D camera in the engine), the nearest-planet-to-a-finger
   rule for a child's tap (game design, not a hit test) and the rules of the rounds.
   The interface (prompt, cards, pause, level map, sheets) is scene 'Hud' (hud.js); it and this scene talk through
   game events: ss-level, ss-ask, ss-good, ss-wrong, ss-clear, ss-fail, ss-select, ss-unselect, ss-mode, ss-burst,
   ss-text, ss-pad and ss-focus. Space units: 1 model unit = K (100) scene units; the camera zoom is the model's
   scale; every "screen" position here is in the 1920 x 1080 design space of Kit.play.fit ("S space"). */
(function () {
  'use strict';
  var SB = SolarBodies, BODIES = SB.list, BY = SB.byId, LV = SolarLevels, SV = SolarSave, TAU = Math.PI * 2;
  var K = 100, FULL_R = 10.9, COUNT = LV.list.length, SUN = BY.sun, DEBUG = SV.DEBUG, cap = SV.cap, store = SV.store, progress = SV.progress;
  var BELT_W = TAU / (40 * Math.pow(4.63 / 3.15, 1.5));                // the belt turns like a planet at its mean radius

  class Space extends Phaser.Scene {
    constructor() { super({ key: 'Space' }); }

    create() {
      var self = this;
      this.G = { roll: 0, eDef: 0.52, Smin: 40, aw: 1, ah: 1, cx0: 960, cy0: 540, ax: 0, ay: 0, cz: 1, minD: 1, maxD: 1, css: 1 };
      this.C = { yaw: 0.35, elev: 0.52, vyaw: 0, velev: 0, zm: 1, panX: 0, panY: 0, frameR: 4.5, frameRT: 4.5, follow: null, fk: 0, fkT: 0, followPx: 0, fcx: 960, fcy: 540, touching: false };
      this.V = { s: 1, b: 1, g: 0.01, cyw: 1, syw: 0, ce: 1, se: 0, cr: 1, sr: 0, fx: 0, fy: 0, fz: 0, wcx: 0, wcy: 0, cx: 960, cy: 540 };
      this.mode = 'level'; this.state = 'init'; this.level = 1; this.world = 0; this.def = null; this.ri = -1; this.round = null;
      this.hearts = 3; this.mistakes = 0; this.wrongInRound = 0; this.runId = 0; this.simT = 0; this.ts = 0.3; this.tsT = 0.3; this.settleT = 0;
      this.selected = null; this.foundOnce = !!store.get('found', false); this.goodT = 0; this.lineW = 0; this.hiId = '';
      this.drag = null; this.touches = {}; this.pinch = null; this.hadPinch = false; this.frameCount = 0;
      this.tmp3 = [0, 0, 0]; this.tmpP = [0, 0, 0];

      // ---- the world: orbits and belt in one container squashed by the elevation, then the balls ----
      this.plane = this.add.container(0, 0).setDepth(-100);
      this.orbitG = this.add.graphics(); this.hiG = this.add.graphics();
      this.belt = this.add.image(0, 0, 'belt').setAlpha(0.95);
      this.plane.add([this.belt, this.orbitG, this.hiG]);
      this.it = {}; this.items = BODIES.map(function (b) {
        var o = SolarPlanet.make(self, b), it = { b: b, o: o, wp: [0, 0, 0], sp: [0, 0, 0], L: [0, 0, 1], Sx: 0, Sy: 0, d: 0, rS: 0, vis: false, bounce: 1.2, wob: 0.8, lift: 1, wx: 0, wy: 0 };
        self.it[b.id] = it; return it;
      });
      var sunIt = this.it.sun;
      sunIt.glow = this.add.image(0, 0, 'sun-glow').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.9);
      sunIt.ray1 = this.add.image(0, 0, 'sun-rays').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5);
      sunIt.ray2 = this.add.image(0, 0, 'sun-rays').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3);
      sunIt.bloom = this.add.image(0, 0, 'sun-glow').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.45);
      this.tweens.add({ targets: sunIt.ray1, rotation: TAU, duration: TAU / 0.04 * 1000, repeat: -1 });
      this.tweens.add({ targets: sunIt.ray2, rotation: -TAU, duration: TAU / 0.05 * 1000, repeat: -1 });
      this.tweens.add({ targets: sunIt.ray1, alpha: { from: 0.42, to: 0.58 }, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      // the choice rings and the hint glow
      this.rings = [0, 1, 2].map(function (i) {
        var im = self.add.image(0, 0, 'choice-ring').setTint(0xf6c453).setDepth(900).setVisible(false); im.pul = 1;
        self.tweens.add({ targets: im, rotation: TAU, duration: 10500, repeat: -1 });
        self.tweens.add({ targets: im, pul: { from: 0.94, to: 1.06 }, duration: 785, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 250 });
        return im;
      });
      this.glow = this.add.image(0, 0, 'hint-glow').setDepth(899).setVisible(false); this.glow.pul = 1;
      this.tweens.add({ targets: this.glow, pul: { from: 0.9, to: 1.18 }, duration: 620, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      // a shooting star now and then

      // ---- the camera and the layout ----
      Kit.play.fit(this, function (v) { self.layout(v); }, { w: 1280 });

      // ---- input: drag to turn, pinch or wheel to zoom, tap a planet ----
      this.input.addPointer(1);
      this.input.on('pointerdown', this.onDown, this);
      this.input.on('pointermove', this.onMove, this);
      this.input.on('pointerup', this.onUp, this);
      this.input.on('pointerupoutside', this.onUp, this);
      this.input.on('wheel', function (p, o, dx, dy) { self.zoomBy(Math.exp(-dy * 0.0015), p.x, p.y); });
      var kb = this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S');
      this.input.keyboard.on('keydown', function (e) {
        if (e.key === '+' || e.key === '=') self.zoomBy(1.2); if (e.key === '-') self.zoomBy(1 / 1.2);
        if (/^(Arrow|[adws]$)/i.test(e.key)) { self.noteUsed('turn'); self.C.idle = 0; }
      });
      var ev = this.game.events, on = function (k, f) { ev.on(k, f, self); self.events.once('shutdown', function () { ev.off(k, f, self); }); };
      on('ss-pad', function () { if (self.view) self.layout(self.view); });
      on('ss-focus', function (x, y) { self.C.fcx = x; self.C.fcy = y; });
      this.events.on('resume', function () { if (self.mode === 'level' && self.state === 'ask') self.sayRound(); });
      var stopShoot = Kit.play.every(7000, 16000, function () { self.shoot(); });     // a shooting star now and then (does not hold the loop awake)
      this.events.once('shutdown', stopShoot);
      // no background bed: space is silent (an electric hum here gave the owner a headache, 2026-11-17)

      this.startLevel(progress.current());
      if (DEBUG) this.hook();
    }

    /* ---------- layout ---------- */
    layout(v) {
      var G = this.G, pad = this.registry.get('pad') || { t: 230, b: 200 };
      this.view = v;
      G.minD = Math.min(v.w, v.h); G.maxD = Math.max(v.w, v.h);
      G.css = v.z / Kit.play.dpr();                                       // screen (css) pixels per design unit
      G.cz = 1 / G.css;                                                   // design units per css pixel
      var W = window.innerWidth, H = window.innerHeight;
      G.phoneLand = H < 520 && W > H * 1.3;
      G.eDef = G.phoneLand ? 0.44 : 0.52;
      var pt = pad.css ? pad.t * G.cz : pad.t, pb = pad.css ? pad.b * G.cz : pad.b;   // (the interface's room, from screen pixels)
      G.ax = v.sl + 20; G.aw = v.sr - v.sl - 40; G.ay = v.st + pt; G.ah = Math.max(120, v.sb - pb - G.ay);
      G.cx0 = G.ax + G.aw / 2; G.cy0 = G.ay + G.ah / 2;
      var s0 = this.fitFor(FULL_R, false), s1 = this.fitFor(FULL_R, true);
      G.roll = s1 > s0 * 1.12 ? -Math.PI / 2 : 0;
      G.Smin = 1.3 * this.fit(FULL_R);
      this.C.elev = Kit.clamp(this.C.elev || G.eDef, 0.17, 1.3);
      this.cameras.main.setRotation(G.roll);
    }
    fitFor(R, rolled) {
      var G = this.G, e = G.eDef, hw = R + 0.25, hh = R * Math.sin(e) + 0.85 * Math.cos(e);
      if (rolled) { var t = hw; hw = hh; hh = t; }
      return Math.min(G.aw / (2 * hw), G.ah / (2 * hh));
    }
    fit(R) { return this.fitFor(R, this.G.roll !== 0); }

    /* ---------- the view: where every planet is and where the camera looks ---------- */
    bodyWorld(b, s, out) {
      var bb = Math.max(1, this.G.Smin / s);
      if (b === SUN) { out[0] = out[1] = out[2] = 0; return out; }
      var a = (b.a0 || 0) + this.simT * TAU / b.period;
      if (b.parent) {
        var p = this.bodyWorld(BY[b.parent], s, [0, 0, 0]), rr = b.orbit * BY[b.parent].r * bb;
        out[0] = p[0] + Math.cos(a) * rr; out[1] = p[1]; out[2] = p[2] - Math.sin(a) * rr;
      } else { out[0] = Math.cos(a) * b.orbit; out[1] = 0; out[2] = -Math.sin(a) * b.orbit; }
      return out;
    }
    computeView() {
      var G = this.G, C = this.C, V = this.V, base = this.fit(C.frameR), k = C.fk, s = base;
      if (C.follow && k > 0) { var sF = C.followPx / C.follow.r; s = Math.exp(Math.log(base) + (Math.log(sF) - Math.log(base)) * k); }
      s *= C.zm;
      V.s = s; V.b = Math.max(1, G.Smin / s); V.g = s / K;
      V.cyw = Math.cos(C.yaw); V.syw = Math.sin(C.yaw); V.ce = Math.cos(C.elev); V.se = Math.sin(C.elev);
      if (C.follow && k > 0) { this.bodyWorld(C.follow, s, this.tmp3); V.fx = this.tmp3[0] * k; V.fy = this.tmp3[1] * k; V.fz = this.tmp3[2] * k; }
      else V.fx = V.fy = V.fz = 0;
      V.cx = G.cx0 + C.panX + (C.fcx - G.cx0) * k; V.cy = G.cy0 + C.panY + (C.fcy - G.cy0) * k;
      // the model's origin lands at (cx, cy): put the camera's centre where that is true, then zoom and roll it
      var dx = (V.cx - 960) / V.g, dy = (V.cy - 540) / V.g, c = Math.cos(G.roll), sn = Math.sin(G.roll);
      V.wcx = -(c * dx + sn * dy); V.wcy = -(-sn * dx + c * dy);          // Rot(-roll) . (dx, dy), negated
      var cam = this.cameras.main;
      cam.setZoom(this.view.z * V.g); cam.centerOn(V.wcx, V.wcy);
    }
    // model point -> scene point (unrolled, before the camera) and depth (bigger = nearer the viewer)
    project(x, y, z, out) {
      var V = this.V, dx = x - V.fx, dy = y - V.fy, dz = z - V.fz;
      var x1 = dx * V.cyw + dz * V.syw, z1 = -dx * V.syw + dz * V.cyw;
      out[0] = x1 * K; out[1] = (z1 * V.se - dy * V.ce) * K; out[2] = dy * V.se + z1 * V.ce;
      return out;
    }
    // scene point -> design-space screen point
    toS(wx, wy, out) {
      var V = this.V, G = this.G, c = Math.cos(G.roll), s = Math.sin(G.roll), dx = (wx - V.wcx) * V.g, dy = (wy - V.wcy) * V.g;
      out[0] = 960 + c * dx - s * dy; out[1] = 540 + s * dx + c * dy; return out;
    }
    rotDir(x, y, z) {
      var V = this.V, x1 = x * V.cyw + z * V.syw, z1 = -x * V.syw + z * V.cyw, sy = z1 * V.se - y * V.ce, d = y * V.se + z1 * V.ce;
      return [x1 * V.cr - sy * V.sr, x1 * V.sr + sy * V.cr, d];
    }

    /* ---------- one frame ---------- */
    update(time, dms) {
      var dt = Math.min(0.1, dms / 1000), C = this.C, G = this.G, V = this.V;
      if (!this.view) return;
      this.simT += dt * this.ts;
      // keys turn the view
      var K_ = this.keys, kx = (K_.RIGHT.isDown || K_.D.isDown ? 1 : 0) - (K_.LEFT.isDown || K_.A.isDown ? 1 : 0), ky = (K_.DOWN.isDown || K_.S.isDown ? 1 : 0) - (K_.UP.isDown || K_.W.isDown ? 1 : 0);
      if (kx || ky) { C.yaw += kx * 1.6 * dt; C.elev = Kit.clamp(C.elev + ky * 0.9 * dt, 0.17, 1.3); C.vyaw = C.velev = 0; }
      if (!C.touching && !kx && !ky) {
        C.yaw += C.vyaw * dt; C.elev = Kit.clamp(C.elev + C.velev * dt, 0.17, 1.3);
        var dmp = Math.exp(-dt * 3.2); C.vyaw *= dmp; C.velev *= dmp;
        if (!C.follow || C.fk < 0.01) C.yaw += 0.018 * dt;
      }
      if (C.follow && C.fkT === 0 && C.fk === 0) C.follow = null;
      if (this.mode === 'level' && this.state === 'settle') this.settleStep(dt);
      this.computeView();
      this.frameCount++;
      this.place();
      if (this.state === 'good') { this.goodT += dt; }
    }

    // put every body, the sun's light, the orbits and the belt where they belong this frame
    place() {
      var V = this.V, G = this.G, C = this.C, self = this, P = this.tmpP, S2 = [0, 0], cz = G.css, z = this.view.z * V.g;
      var sun = this.it.sun;
      // the plane: orbits and belt, squashed by the elevation (the engine's container transform does the tilt)
      this.project(0, 0, 0, P); var px0 = P[0], py0 = P[1], sunD = P[2];
      this.plane.setPosition(px0, py0).setScale(1, V.se);
      this.belt.setRotation(-C.yaw - BELT_W * this.simT);
      var cssPerWorld = z / Kit.play.dpr();
      if (!this.lineW || Math.abs(cssPerWorld / this.lineW - 1) > 0.06) this.orbits(cssPerWorld);
      var hid = this.hiFor();
      if (hid !== this.hiId) { this.hiId = hid; this.orbits(cssPerWorld, true); }
      var ext0 = 60 * G.cz;
      for (var i = 0; i < this.items.length; i++) {
        var it = this.items[i], b = it.b;
        var wp = this.bodyWorld(b, V.s, it.wp), p = this.project(wp[0], wp[1], wp[2], it.sp);
        it.wx = p[0]; it.wy = p[1]; it.d = p[2];
        this.toS(p[0], p[1], S2); it.Sx = S2[0]; it.Sy = S2[1];
        it.rS = b.r * V.s * V.b;
        var ext = it.rS * (b === SUN ? 4 : b.ring ? 2.4 : 1.3) + ext0, vv = this.view;
        it.vis = it.Sx > vv.l - ext && it.Sx < vv.r + ext && it.Sy > vv.t - ext && it.Sy < vv.b + ext && it.rS > 0.6 * G.cz;
        if (!it.vis) { SolarPlanet.show(it.o, false); if (b === SUN) this.sunShow(false); continue; }
        if (b !== SUN) {                                                  // light from the Sun, nudged toward the viewer so near sides read as lit
          var ln = Math.hypot(wp[0], wp[1], wp[2]) || 1, Lr = this.rotDir(-wp[0] / ln, -wp[1] / ln, -wp[2] / ln);
          Lr[2] += 0.85; var ll = Math.hypot(Lr[0], Lr[1], Lr[2]) || 1; it.L[0] = Lr[0] / ll; it.L[1] = Lr[1] / ll; it.L[2] = Lr[2] / ll;
        }
        var sq = 1, wob = 0;
        if (it.bounce < 1.2) sq = 1 + 0.2 * Math.exp(-it.bounce * 4) * Math.sin(it.bounce * 16);
        if (it.wob < 0.8) wob = Math.max(4 * G.cz, it.rS * 0.25) * Math.exp(-it.wob * 5) * Math.sin(it.wob * 34);
        var R = it.rS / V.g;                                                // radius in scene units
        var rot = -G.roll;
        var spin = (this.simTime() / b.spin) % 1, cloud = (spin * 0.8 + 0.1) % 1;
        // wob is a sideways shake in screen space: undo the roll to add it in scene space
        var wxs = it.wx + wob / V.g * Math.cos(-G.roll), wys = it.wy + wob / V.g * Math.sin(-G.roll);
        SolarPlanet.place(it.o, wxs, wys, R, it.L, spin, cloud, it.rS * G.css * Kit.play.dpr(), rot, 10 + it.d, sq);
        SolarPlanet.show(it.o, true);
        if (b === SUN) this.sunPlace(it, wxs, wys, R, 10 + it.d);
      }
      // the choice rings follow their planets
      this.placeRings();
      // the sky follows the view
      var sk = this.scene.get('Sky');
      if (sk && sk.set) {
        var qx = (sun.Sx - G.cx0) * 0.035, qy = (sun.Sy - G.cy0) * 0.035, c = Math.cos(-G.roll), s = Math.sin(-G.roll);
        sk.set({ yaw: C.yaw, elev: C.elev, eDef: G.eDef, qx: qx * c - qy * s, qy: qx * s + qy * c, roll: G.roll });
      }
    }
    simTime() { return this.time.now / 1000; }
    sunShow(on) { var s = this.it.sun; [s.glow, s.ray1, s.ray2, s.bloom].forEach(function (o) { o.setVisible(on); }); }
    sunPlace(it, x, y, R, depth) {
      this.sunShow(true);
      it.glow.setPosition(x, y).setScale(R * 7.5 / 256).setDepth(depth - 0.03);
      it.ray1.setPosition(x, y).setScale(R * 5.2 / 512).setDepth(depth - 0.02);
      it.ray2.setPosition(x, y).setScale(R * 4.2 / 512).setDepth(depth - 0.01);
      it.bloom.setPosition(x, y).setScale(R * 2.9 / 256).setDepth(depth + 0.05);
    }
    // the orbits: one static Graphics, redrawn only when the zoom has moved the line width by a few percent
    orbits(cssPerWorld, onlyHi) {
      var w = 1.3 / cssPerWorld, hiId = this.hiId;
      if (!onlyHi) {
        this.lineW = cssPerWorld;
        this.orbitG.clear().lineStyle(w, 0x96b4ff, 0.16);
        SB.planets.forEach(function (id) { this.orbitG.strokeCircle(0, 0, BY[id].orbit * K); }, this);
      }
      this.hiG.clear();
      if (hiId) this.hiG.lineStyle(w * 1.3, 0xf6c453, 0.45).strokeCircle(0, 0, BY[hiId].orbit * K);
    }
    hiFor() {
      if (this.selected && !this.selected.parent) return this.selected.id;
      if (this.round && this.state === 'ask' && this.round.hint) { var a = answerOf(this.round); return BY[a].parent ? '' : a; }
      return '';
    }
    placeRings() {
      var V = this.V, G = this.G, ch = this.state === 'ask' && this.mode === 'level' && this.round, ids = ch ? (this.round.t === 'find' ? [] : this.round.ids) : [], i, self = this;
      for (i = 0; i < 3; i++) {
        var im = this.rings[i], id = ids[i], it = id && this.it[id];
        if (!it || !it.vis || this.round.out[id]) { im.setVisible(false); continue; }
        var r = Math.max(it.rS * (it.b.ring ? 2.35 : 1) + 9 * G.cz, 22 * G.cz) / V.g;     // scene units
        im.setPosition(it.wx, it.wy).setScale(r / 120 * im.pul).setVisible(true);
      }
      var hint = ch && this.round.hint ? this.it[answerOf(this.round)] : null;
      if (hint && hint.vis) {
        var rr = Math.max(hint.rS * (hint.b.ring ? 2.35 : 1) + 9 * G.cz, 22 * G.cz) / V.g;
        this.glow.setPosition(hint.wx, hint.wy).setScale(rr * 1.5 * this.glow.pul / 128).setVisible(true);
      } else this.glow.setVisible(false);
    }

    /* ---------- the level and its rounds ---------- */
    emit() { this.game.events.emit.apply(this.game.events, arguments); }
    startLevel(n) {
      var self = this, C = this.C, runId = ++this.runId;
      this.level = Kit.clamp(n, 1, COUNT); this.def = LV.list[this.level - 1]; this.world = this.def.w;
      progress.setCurrent(this.level);
      this.hearts = this.def.hearts; this.mistakes = 0; this.ri = -1; this.round = null;
      this.mode = 'level'; this.selected = null; this.hushAll();
      if (this.state === 'init') { C.frameR = LV.worlds[this.world].frame; C.elev = this.G.eDef; }
      this.camTo(LV.worlds[this.world].frame, 1100); C.follow = null; this.fadeFollow(0); this.tweenCam({ zm: 1, panX: 0, panY: 0 }, 700);
      this.speedTo(LV.speed(this.level));
      this.state = 'banner';
      var banner = this.level === 1 ? 3.2 : 2.2;
      this.lvEvt = { level: this.level, def: this.def, world: LV.worlds[this.world], hearts: this.hearts, banner: banner, count: COUNT };
      this.emit('ss-level', this.lvEvt);
      this.emit('ss-mode', 'level');
      Kit.snd.play('whoosh');
      this.time.delayedCall(banner * 1000, function () { if (runId === self.runId) self.nextRound(); });
    }
    // the interface scene starts after this one: tell it where we are
    hudReady() { if (this.lvEvt) { this.emit('ss-level', this.lvEvt); this.emit('ss-mode', this.mode); } }
    nextRound() {
      this.ri++;
      if (this.ri >= this.def.rounds.length) { this.clearLevel(); return; }
      this.round = this.def.rounds[this.ri]; this.wrongInRound = 0; this.round.hint = false; this.round.out = {};
      this.state = 'settle'; this.settleT = 0; this.emit('ss-ask', null);
    }
    // before asking, wait until the camera has stopped flying and every choice is fully on screen; taps never count meanwhile
    camMoving() { var C = this.C; return C.fk > 0 || C.fkT > 0 || Math.abs(C.frameR - C.frameRT) > 0.015 * C.frameRT; }
    fullyOnScreen(id) {
      var it = this.it[id], G = this.G, r = it.rS * (it.b.ring ? 2.4 : 1) + 14 * G.cz;
      return it.Sx - r >= G.ax && it.Sx + r <= G.ax + G.aw && it.Sy - r >= G.ay && it.Sy + r <= G.ay + G.ah;
    }
    settleStep(dt) {
      var C = this.C, G = this.G;
      this.settleT += dt;
      if (this.camMoving() || this.settleT < 0.15) return;
      var ids = this.round.t === 'find' ? [this.round.id] : this.round.ids;
      if (ids.every(this.fullyOnScreen, this)) { this.ask(); return; }
      // something would be off screen: first undo the child's own zoom, pan and tilt, then widen the view
      var k = 1 - Math.exp(-dt * 6);
      if (Math.abs(C.zm - 1) > 0.02 || Math.abs(C.panX) + Math.abs(C.panY) > 2 * G.cz || Math.abs(C.elev - G.eDef) > 0.02) {
        C.zm += (1 - C.zm) * k; C.panX -= C.panX * k; C.panY -= C.panY * k; C.elev += (G.eDef - C.elev) * k; C.vyaw = C.velev = 0;
      } else { C.frameRT = Math.min(C.frameRT * 1.06, 18); this.killCam(); C.frameR = C.frameRT; }
    }
    ask() {
      this.state = 'ask';
      var r = this.round, b = BY[r.id];
      this.emit('ss-ask', { t: r.t, id: r.id, ids: r.ids, first: !this.foundOnce && this.level === 1 });
      this.sayRound();
      Kit.snd.play('ask');
    }
    sayRound() {
      var r = this.round; if (!r) return;
      if (r.t === 'find') SolarVoice.say('Find ' + BY[r.id].name + '!');
      else { var names = r.ids.map(function (id) { return BY[id].name; }); SolarVoice.say((r.t === 'big' ? 'Which is bigger? ' : 'Which is closest to the Sun? ') + names.join(', or ') + '?'); }
    }
    choices() { return this.round && this.round.t !== 'find' ? this.round.ids : null; }

    tapBody(b) {
      if (this.mode === 'explore') { this.select(b); return; }
      if (this.state === 'good') { if (this.goodT > 0.7) this.endGood(); return; }
      if (this.state !== 'ask') return;
      var ch = this.choices();
      if (ch && ch.indexOf(b.id) < 0) { Kit.snd.play('tick'); return; }   // not one of the glowing choices: no penalty
      if (ch && this.round.out[b.id]) { Kit.snd.play('tick'); return; }
      Kit.bridge.answer();
      if (b.id === answerOf(this.round)) this.correct(b); else this.wrong(b);
    }
    correct(b) {
      var it = this.it[b.id], C = this.C;
      this.state = 'good'; this.goodT = 0;
      if (!this.foundOnce) { this.foundOnce = true; store.set('found', true); }
      this.bounce(it);
      Kit.snd.play('good'); Kit.snd.play('whoom', { vol: 0.6 }); Kit.buzz(12);
      this.emit('ss-burst', it.Sx, it.Sy, 'star');
      var r = this.round, line;
      if (r.t === 'find') { line = b.fact; SolarVoice.say('Yes! ' + b.fact); }
      else if (r.t === 'big') { line = cap(b.short) + ' is bigger!'; SolarVoice.say('Yes! ' + cap(b.name) + ' is bigger.'); }
      else { line = cap(b.short) + ' is closest to the Sun!'; SolarVoice.say('Yes! ' + cap(b.name) + ' is closest to the Sun.'); }
      this.emit('ss-good', { id: b.id, line: line });
      // fly in a little toward it
      C.follow = b; C.followPx = (b === SUN ? 0.16 : 0.11) * this.G.minD; C.fcx = this.G.cx0; C.fcy = this.G.cy0; this.fadeFollow(1);
      var self = this, run = this.runId;
      this.time.delayedCall(3400, function () { if (run === self.runId && self.state === 'good') self.endGood(); });
    }
    endGood() { if (this.state !== 'good') return; this.fadeFollow(0); this.nextRound(); }
    wrong(b) {
      var it = this.it[b.id], self = this, G = this.G;
      this.mistakes++; this.wrongInRound++; this.hearts--;
      this.wobble(it);
      Kit.snd.play('bump'); Kit.buzz(30);
      var t;
      if (this.round.t === 'find') { t = "That's " + b.short; SolarVoice.say("That's " + b.name + '.'); }
      else { this.round.out[b.id] = true; t = 'Not this one'; SolarVoice.say('Not quite. Try again!'); }
      this.emit('ss-wrong', { id: b.id, hearts: this.hearts, text: t, x: it.Sx, y: it.Sy - Math.max(18 * G.cz, it.rS + 14 * G.cz) });
      if (this.wrongInRound >= (this.world === 0 ? 1 : 2)) this.round.hint = true;
      if (this.hearts <= 0) {
        this.state = 'fail'; Kit.snd.play('lose'); this.emit('ss-ask', null);
        var run = this.runId;
        this.time.delayedCall(900, function () { if (run === self.runId) self.emit('ss-fail', { level: self.level }); });
      }
    }
    clearLevel() {
      var self = this, run = this.runId;
      this.state = 'clear'; this.fadeFollow(0); this.emit('ss-ask', null);
      var stars = this.mistakes === 0 ? 3 : this.mistakes <= 2 ? 2 : 1;
      progress.finish(this.level, stars);
      Kit.bridge.complete();
      Kit.snd.play('win');
      this.time.delayedCall(250, function () { SolarVoice.praise(Math.random() < 0.5 ? 'subhanallah' : 'mashaallah'); });
      for (var i = 0; i < 5; i++) this.time.delayedCall(i * 170, function () { if (self.state === 'clear') self.emit('ss-burst', Kit.rand(0.2, 0.8), Kit.rand(0.2, 0.55), 'win'); });
      var last = this.level === COUNT, endOfWorld = this.level % 5 === 0;
      this.time.delayedCall(1300, function () {
        if (run !== self.runId) return;
        self.emit('ss-clear', { level: self.level, stars: stars, last: last, endOfWorld: endOfWorld, world: LV.worlds[self.world].name });
      });
    }

    /* ---------- explore ---------- */
    enterExplore() {
      if (this.mode === 'explore') return;
      var C = this.C;
      this.mode = 'explore'; this.hushAll(); this.camTo(FULL_R, 1200); this.fadeFollow(0); C.follow = null;
      this.tweenCam({ zm: 1, panX: 0, panY: 0 }, 700); this.speedTo(1);
      this.emit('ss-ask', null); this.emit('ss-mode', 'explore', !store.get('explored', false));
    }
    exitExplore() {
      if (this.mode !== 'explore') return;
      this.unselect(true);
      this.mode = 'level'; this.camTo(LV.worlds[this.world].frame, 1100); this.tweenCam({ zm: 1, panX: 0, panY: 0 }, 700); this.speedTo(LV.speed(this.level));
      this.emit('ss-mode', 'level');
      var s = this.state;
      if (s === 'clear') this.startLevel(progress.current());
      else if (s === 'fail') this.startLevel(this.level);
      else if (s === 'good') this.nextRound();               // that round was already answered
      else if (s === 'ask') { this.state = 'settle'; this.settleT = 0; this.emit('ss-ask', null); }   // fly back, then ask the same question again
    }
    select(b) {
      var C = this.C, it = this.it[b.id];
      if (!store.get('explored', false)) { store.set('explored', true); this.emit('ss-explored'); }
      this.selected = b; this.bounce(it);
      Kit.snd.play('whoom'); Kit.snd.play('page');
      this.tweenCam({ zm: 1, panX: 0, panY: 0 }, 400);
      C.follow = b; C.followPx = (b === SUN ? 0.17 : b.ring ? 0.12 : 0.2) * this.G.minD * (b.parent ? 0.7 : 1);
      this.fadeFollow(1);
      this.emit('ss-select', b.id);
      SolarVoice.say(cap(b.name) + '. ' + b.fact);
      try { window.KahfBridge && window.KahfBridge.item && window.KahfBridge.item('solar-' + b.id); } catch (e) { /* not in the app */ }
    }
    unselect(quiet) {
      if (!this.selected) return;
      this.selected = null; this.fadeFollow(0); this.emit('ss-unselect');
      if (!quiet) Kit.snd.play('whoosh');
      SolarVoice.hush();
    }
    hushAll() { SolarVoice.hush(); }

    /* ---------- camera tweens: one at a time for each kind ---------- */
    camTo(frameR, ms) {
      var C = this.C; C.frameRT = frameR;
      if (this.frameTw) this.frameTw.stop();
      this.frameTw = this.tweens.add({ targets: C, frameR: frameR, duration: ms, ease: 'Sine.easeInOut' });
    }
    killCam() { if (this.frameTw) { this.frameTw.stop(); this.frameTw = null; } }
    fadeFollow(to) {
      var C = this.C; C.fkT = to;
      if (this.fkTw) this.fkTw.stop();
      this.fkTw = this.tweens.add({ targets: C, fk: to, duration: to ? 1000 : 900, ease: 'Sine.easeInOut', onComplete: function () { if (!to) C.follow = null; } });
    }
    tweenCam(o, ms) {
      if (this.zTw) this.zTw.stop();
      var props = { duration: ms, ease: 'Sine.easeInOut', targets: this.C }; for (var k in o) props[k] = o[k];
      this.zTw = this.tweens.add(props);
    }
    speedTo(v) { this.tsT = v; if (this.spTw) this.spTw.stop(); this.spTw = this.tweens.add({ targets: this, ts: v, duration: 1500, ease: 'Sine.easeInOut' }); }
    bounce(it) { it.bounce = 0; this.tweens.add({ targets: it, bounce: 1.2, duration: 1200 }); }
    wobble(it) { it.wob = 0; this.tweens.add({ targets: it, wob: 0.8, duration: 800 }); }
    shoot() {
      var v = this.view;
      if (!v || this.sys.isPaused()) return;
      var a = 2.4 + Math.random() * 0.5, x = v.l + Math.random() * v.w, y = v.t + Math.random() * v.h * 0.5;
      this.emit('ss-streak', x, y, a); Kit.snd.play('shoot', { pan: -0.4 });
    }

    /* ---------- input ---------- */
    toSP(p) { var z = this.view.z, cam = this.cameras.main; return [960 + (p.x - cam.width / 2) / z, 540 + (p.y - cam.height / 2) / z]; }
    onDown(p) {
      if (this.hudHit) return;
      var C = this.C, t = this.touches, ids;
      t[p.id] = { x: p.x, y: p.y };
      ids = Object.keys(t);
      if (ids.length >= 2) {
        var a = t[ids[0]], b = t[ids[1]];
        this.pinch = { d0: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), zm0: C.zm, c0: this.toSP({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }), px0: C.panX, py0: C.panY };
        this.hadPinch = true; this.drag = null; this.idleReset(); return;
      }
      if (this.pinch) return;
      this.drag = { x0: p.x, y0: p.y, lx: p.x, ly: p.y, moved: false, vx: 0, vy: 0, lt: performance.now() };
      C.vyaw = C.velev = 0; C.touching = true; this.idleReset();
    }
    onMove(p) {
      var C = this.C, t = this.touches;
      if (!t[p.id]) return;
      t[p.id] = { x: p.x, y: p.y };
      if (this.pinch) {
        var ids = Object.keys(t); if (ids.length < 2) return;
        var a = t[ids[0]], b = t[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y);
        var zm = Kit.clamp(this.pinch.zm0 * d / this.pinch.d0, 0.55, 7), ratio = zm / this.pinch.zm0, c = this.toSP({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }), pc = this.pinch.c0;
        // keep the point under the fingers where it was (pan follows the middle of the two fingers)
        var cx = this.G.cx0, cy = this.G.cy0, lim = this.G.maxD * 2;
        C.zm = zm;
        C.panX = Kit.clamp(c[0] - cx - (pc[0] - cx - this.pinch.px0) * ratio, -lim, lim);
        C.panY = Kit.clamp(c[1] - cy - (pc[1] - cy - this.pinch.py0) * ratio, -lim, lim);
        this.noteUsed('zoom'); this.idleReset(); return;
      }
      var d = this.drag; if (!d || this.hadPinch) return;
      var dpr = Kit.play.dpr(), dx = (p.x - d.lx) / dpr, dy = (p.y - d.ly) / dpr, now = performance.now();
      d.lx = p.x; d.ly = p.y;
      if (!d.moved && Math.hypot(p.x - d.x0, p.y - d.y0) / dpr > 12) d.moved = true;
      if (!d.moved) return;
      var r = this.turn(dx, dy), dt = Math.max(0.008, (now - d.lt) / 1000);
      d.lt = now; d.vx = d.vx * 0.6 + r[0] / dt * 0.4; d.vy = d.vy * 0.6 + r[1] / dt * 0.4;
      this.noteUsed('turn');
    }
    onUp(p) {
      var C = this.C, t = this.touches;
      if (!t[p.id]) return;
      delete t[p.id];
      if (Object.keys(t).length < 2) this.pinch = null;
      C.touching = false;
      var d = this.drag; this.drag = null;
      if (this.hadPinch) { if (!Object.keys(t).length) this.hadPinch = false; this.idleReset(); return; }
      if (!d) return;
      this.idleReset();
      if (!d.moved) { var s = this.toSP(p); this.tap(s[0], s[1]); }     // slow presses count too: small hands press slowly
      else { C.vyaw = Kit.clamp(d.vx, -4, 4); C.velev = Kit.clamp(d.vy, -2, 2); }
    }
    // drag in css px -> yaw/elevation change (undoing the portrait roll so it always feels like turning a disc)
    turn(dx, dy) {
      var C = this.C, G = this.G, c = Math.cos(-G.roll), s = Math.sin(-G.roll), ux = dx * c - dy * s, uy = dx * s + dy * c, k = 2.4 / Math.min(window.innerWidth, window.innerHeight);
      var dyaw = ux * k, del = uy * k * 0.8;
      C.yaw += dyaw; C.elev = Kit.clamp(C.elev + del, 0.17, 1.3);
      return [dyaw, del];
    }
    zoomBy(f, px, py) {
      var C = this.C, G = this.G, old = C.zm, zm = Kit.clamp(old * f, 0.55, 7), ratio = zm / old;
      if (px !== undefined) {
        var c = this.toSP({ x: px, y: py }), cx = G.cx0, cy = G.cy0, lim = G.maxD * 2;
        C.panX = Kit.clamp(c[0] - cx - (c[0] - cx - C.panX) * ratio, -lim, lim); C.panY = Kit.clamp(c[1] - cy - (c[1] - cy - C.panY) * ratio, -lim, lim);
      }
      C.zm = zm; this.noteUsed('zoom'); this.idleReset();
    }
    // in the game the view drifts back to the level's after a few quiet seconds
    idleReset() {
      var self = this, C = this.C, G = this.G;
      if (this.idleT) this.idleT.remove(false);
      if (this.mode !== 'level') return;
      this.idleT = this.time.delayedCall(5000, function () {
        if (self.mode !== 'level' || self.pinch || C.touching) return;
        self.tweenCam({ zm: 1, panX: 0, panY: 0, elev: G.eDef }, 1800);
      });
    }
    noteUsed(k) { if (!this.used) this.used = {}; if (!this.used[k]) { this.used[k] = true; this.emit('ss-used', k); } }

    tappable(b) { return this.mode === 'explore' || !b.parent || b.id === 'moon'; }
    tap(x, y) {
      var G = this.G, best = null, bs = 1, tight = null, tsc = 1, cz = G.cz, self = this;
      this.items.forEach(function (it) {
        var b = it.b; if (!it.vis || !self.tappable(b)) return;
        var core = it.rS * (b.ring ? 1.7 : 1), dist = Math.hypot(x - it.Sx, y - it.Sy);
        var hr = Math.max(core + 6 * cz, (b.parent ? 24 : 26) * cz), d = dist / hr;
        if (d < bs) { bs = d; best = it; }
        var tr = Math.max(core + 4 * cz, 16 * cz), dt2 = dist / tr;      // "really on it"
        if (dt2 < tsc) { tsc = dt2; tight = it; }
      });
      this.lastTap = [Math.round(x), Math.round(y)];
      if (best && this.mode === 'level' && this.state === 'ask') {
        // a heart is only lost for a tap that is really on a wrong planet; a near miss can still find the right answer
        var ans = this.it[answerOf(this.round)], pick = tight;
        if (!pick && ans.vis && Math.hypot(x - ans.Sx, y - ans.Sy) < Math.max(ans.rS * (ans.b.ring ? 1.7 : 1) + 6 * cz, 26 * cz)) pick = ans;
        if (!pick) { Kit.snd.play('tick'); return; }
        best = pick;
      }
      if (best) { Kit.snd.play('blip', { rate: 1.12 - Math.min(1, best.b.r / 0.75) * 0.3 }); this.tapBody(best.b); return; }
      if (this.mode === 'explore' && this.selected) { this.unselect(); return; }
      if (this.state === 'good' && this.goodT > 0.7) { this.endGood(); return; }
      Kit.snd.play('tick');
    }

    // ?debug: a hook for the tests
    hook() {
      var self = this;
      window.SS = {
        scene: this, tap: function (x, y) { self.tap(x, y); },
        tapBody: function (id) { var it = self.it[id]; self.tap(it.Sx, it.Sy); },
        get: function () { return { mode: self.mode, state: self.state, level: self.level, ri: self.ri, hearts: self.hearts, mistakes: self.mistakes, round: self.round && { t: self.round.t, id: self.round.id, ids: self.round.ids, answer: answerOf(self.round) }, roll: self.G.roll, zm: self.C.zm, yaw: self.C.yaw, selected: self.selected && self.selected.id }; },
        screen: function (id) { var it = self.it[id]; return { x: it.Sx, y: it.Sy, r: it.rS, vis: it.vis }; },
        start: function (n) { self.startLevel(n); }, explore: function (on) { if (on) self.enterExplore(); else self.exitExplore(); }, select: function (id) { self.select(BY[id]); }
      };
    }
  }

  function answerOf(r) {
    if (r.t === 'find') return r.id;
    var best = null;
    r.ids.forEach(function (id) { var b = BY[id]; if (!best || (r.t === 'big' ? b.r > best.r : b.orbit < best.orbit)) best = b; });
    return best.id;
  }
  window.SolarSpace = Space;
})();
