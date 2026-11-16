/* Tower Blocks: sky.js, scene 'Sky': the backdrop behind the tower (below the Tower scene, on its own camera in the
   1920 x 1080 design space of Kit.play.fit, so it is painted past the edges of any screen).
   A dusk-to-night sky with a setting sun, a rising moon, drifting clouds, stars and a city skyline on the horizon, and
   golden motes (fireflies at night). It follows the climb: the Tower scene's camera and its altitude decide everything
   (sky colour, how far the horizon, the clouds and the stars have slid), read here once a frame; nothing is repainted:
   - the sky is two vertical gradient quads whose four corner tints are the sky colours (the engine's own gradient tint),
     the ground likewise; clouds are white pictures tinted top and bottom; skyline masks are tinted; stars are a TileSprite;
   - clouds drift on tweens; the motes are a particle emitter; the stars twinkle on tweens. */
(function () {
  'use strict';
  var A = window.TBArt, K = window.Kit, BASE_Y = 60;
  var smooth = A.smooth, mix = A.mix, shade = A.shade, I = A.int;

  class Sky extends Phaser.Scene {
    constructor() { super('Sky'); }
    create() {
      var self = this, add = this.add, px = function (d) { return add.image(0, 0, 'fx', 'px').setOrigin(0, 0).setDepth(d); };
      this.T = null; this.key = -1; this.last = '';
      this.sk = [px(0), px(0)];
      this.stars = add.tileSprite(0, 0, 100, 100, 'stars').setOrigin(0, 0).setDepth(1);
      this.twk = [];
      for (var i = 0; i < 9; i++) {
        var t = add.image(0, 0, 'fx', 'star4').setDepth(2).setTint(0xfffbe8).setAlpha(0);
        t.fx = { x: Math.random(), y: Math.random() * 0.6 };
        this.tweens.add({ targets: t, scale: { from: 0.1, to: 0.3 }, duration: 1100 + Math.random() * 1200, yoyo: true, repeat: -1, delay: Math.random() * 2000, ease: 'Sine.easeInOut' });
        this.twk.push(t);
      }
      this.moonG = add.image(0, 0, 'sk', 'mglow').setDepth(3); this.moon = add.image(0, 0, 'sk', 'moon').setDepth(3);
      this.sunG = add.image(0, 0, 'sk', 'sglow').setDepth(4); this.sun = add.image(0, 0, 'sk', 'sun').setDepth(4);
      // twelve clouds from five pictures; each drifts across on its own tween (ph 0..1)
      this.clouds = [];
      var r = A.rng(7);
      for (i = 0; i < 12; i++) {
        var m = i % A.CLOUDS.length, c = { m: m, ca: 120 + i * 85 + r() * 50, x: r(), sp: 4 + r() * 9, s: 0.75 + r() * 0.5, ph: 0 };
        c.img = add.image(0, 0, 'sk', 'cloud' + m).setOrigin(0, 0).setDepth(5);
        this.tweens.add({ targets: c, ph: 1, duration: 1200 / c.sp * 1000, repeat: -1 });
        this.clouds.push(c);
      }
      this.far = add.tileSprite(0, 0, 100, 100, 'sky-far').setOrigin(0, 0).setDepth(6);
      this.haze = [px(7), px(7), px(7)];
      this.gr = [px(8), px(8)];
      this.near = add.tileSprite(0, 0, 100, 100, 'sky-near').setOrigin(0, 0).setDepth(9);
      this.lit = add.tileSprite(0, 0, 100, 100, 'sky-lit').setOrigin(0, 0).setDepth(10);
      this.motes = null;
      K.play.fit(this, function (v) { self.layout(v); });
    }

    layout(v) {
      var css = A.sCss(window.innerWidth, window.innerHeight), dpr = this.scale.width / window.innerWidth, z = v.z;
      var uD = this.uD = 0.85 * css * dpr / z;               // design units per sky unit
      this.c2d = dpr / z;                                    // design units per CSS pixel
      var sc = uD / A.RS, W = v.w + 600, x0 = v.l - 300;
      this.W = W; this.x0 = x0;
      this.stars.setPosition(x0, v.t - 300).setSize(W, v.h + 600).setTileScale(1 / z, 1 / z);
      [this.far, this.near, this.lit].forEach(function (s) { s.setSize(W, (A.SKY_H + A.SKY_G) * uD).setTileScale(sc, sc); });
      this.twk.forEach(function (t) { t.setPosition(v.l + t.fx.x * v.w, v.t + t.fx.y * v.h); });
      // the moon: a plain glowing disc up in the corner
      var mr = Math.max(16 * this.c2d, 20 * uD);
      this.moon.setScale(2 * mr / 64).setPosition(v.l + v.w * 0.8, v.t + Math.max(90 * this.c2d, v.h * 0.15) + 30 * this.c2d);
      this.moonG.setScale(9 * mr / 100).setPosition(this.moon.x, this.moon.y);
      this.sun.setScale(26 * uD / 39); this.sunG.setScale(170 * uD / 84);
      // golden motes drifting up from the courtyard (fireflies at night)
      if (this.motes) this.motes.destroy();
      this.motes = this.add.particles(0, 0, 'fx', { frame: 'dot', emitting: true, x: { min: v.l, max: v.r }, y: { min: v.t + v.h * 0.5, max: v.b }, lifespan: 7000,
        speedY: { min: -16, max: -5 }, speedX: { min: -5, max: 5 }, scale: { min: 4 * this.c2d / 64, max: 8 * this.c2d / 64 }, alpha: { start: 0.7, end: 0 }, frequency: 420, tint: 0xffeeb0 }).setDepth(11);
      this.key = -1; this.last = '';
      this.update();
    }

    update() {
      var T = this.T = this.scene.get('Tower'), v = this.view;   // (Kit.play.fit keeps the view on the scene)
      if (!v || !T || !T.al || !T.view || !T.cameras) return;
      var cam = T.cameras.main, p = T.p, uD = this.uD, z = v.z, k = cam.zoom / z, midY = cam.scrollY + cam.height / 2, camH = T.camH;
      var W = this.W, x0 = this.x0, i;

      // colours of the sky, the ground, the skyline and the clouds, only when the progress moved a little
      var key = Math.round(p * 60);
      if (key !== this.key) {
        this.key = key;
        var c = A.skyAt(key / 60), top = I(c.top), mid = I(c.mid), hor = I(c.hor);
        this.sk[0].setTint(top, top, mid, mid); this.sk[1].setTint(mid, mid, hor, hor);
        var g0 = I(shade(mix(c.hor, '#2a1630', 0.62), -0.1)), g1 = I(shade(mix(c.mid, '#1c0f26', 0.7), -0.2)), g2 = I(shade(mix(c.top, '#140a1c', 0.6), -0.3));
        this.gr[0].setTint(g0, g0, g1, g1); this.gr[1].setTint(g1, g1, g2, g2);
        this.haze.forEach(function (h) { h.setTint(hor).setAlpha(0.13); });
        this.far.setTint(I(shade(mix(mix(c.hor, c.top, 0.55), '#000000', 0.0), -0.22)));
        this.near.setTint(I(shade(mix('#24152f', c.top, 0.3), -0.25)));
        this.lit.setAlpha(0.3 + 0.7 * smooth(0.12, 0.6, p));
        var ct = I(mix(c.hor, '#ffffff', 0.4)), cb = I(mix(c.mid, c.top, 0.35)), ca = 0.2 + 0.7 * smooth(0.1, 0.3, p) * (1 - smooth(0.62, 0.9, p) * 0.7);
        this.clouds.forEach(function (cl) { cl.img.setTint(ct, ct, cb, cb).setAlpha(ca); });
        var sa = smooth(0.42, 0.8, p); this.stars.setAlpha(sa);
        this.twk.forEach(function (t) { t.setVisible(sa > 0.01); });
        var ma = smooth(0.38, 0.62, p); this.moon.setAlpha(ma).setVisible(ma > 0.01); this.moonG.setAlpha(ma).setVisible(ma > 0.01);
        var sua = 1 - smooth(0.05, 0.42, p); this.sun.setAlpha(sua).setVisible(sua > 0.01); this.sunG.setAlpha(sua).setVisible(sua > 0.01);
        if (this.motes) this.motes.setAlpha(0.5 + 0.5 * smooth(0.2, 0.7, p));
        this.twkA = sa;
      }

      // where things are: the horizon slides at 0.62 of the climb, clouds at 0.55, the stars barely. ay is where the camera's
      // height sits on the screen; the horizon is the old game's: ay + (BASE_Y + 0.62 of the climb - 150) x scale
      var ay = 540 + (-camH - midY) * k, hy = ay + (BASE_Y + (camH - BASE_Y) * 0.62 - 150) * k;
      var sig = hy.toFixed(1) + '|' + camH.toFixed(1) + '|' + k.toFixed(3);
      if (sig !== this.last) {
        this.last = sig;
        var yT = v.t - 40, hs = hy - yT, vis = hs > 4;
        this.sk[0].setVisible(vis); this.sk[1].setVisible(vis);
        if (vis) {
          this.sk[0].setPosition(x0, yT).setDisplaySize(W, hs * 0.6 * 1 + 1); this.sk[1].setPosition(x0, yT + hs * 0.6).setDisplaySize(W, hs * 0.4 + 1);
          var hu = uD * 60;
          this.haze.forEach(function (h, j) { h.setPosition(x0, hy - hu * (1 - j / 3)).setDisplaySize(W, hu * (1 - j / 3)); });
        } else this.haze.forEach(function (h) { h.setVisible(false); });
        this.haze.forEach(function (h) { h.setVisible(vis); });
        var gv = hy < v.b, gh = Math.max(v.b + 60 - hy, 10);
        this.gr[0].setVisible(gv).setPosition(x0, hy - 0.5).setDisplaySize(W, gh * 0.35 + 1); this.gr[1].setVisible(gv).setPosition(x0, hy - 0.5 + gh * 0.35).setDisplaySize(W, gh * 0.65 + 1);
        var sy = hy - A.SKY_H * uD, show = sy < v.b;
        [this.far, this.near, this.lit].forEach(function (s) { s.setVisible(show).setPosition(x0, sy); });
        this.sun.setPosition(v.l + v.w * 0.3, hy - 22 * uD); this.sunG.setPosition(this.sun.x, this.sun.y);
        this.stars.setTilePosition(0, -camH * 0.05 * cam.zoom);
        this.twk.forEach(function (t) { t.setAlpha(t.visible ? 0.9 : 0); });
        for (i = 0; i < this.clouds.length; i++) {
          var cl = this.clouds[i], sz = A.CLOUDS[cl.m], cw = sz[0] * cl.s * uD, ch = sz[1] * cl.s * uD;
          var rel = (((cl.ca - camH * 0.55) % 1100) + 1100) % 1100 - 180, yy = ay - rel * k - ch;
          cl.cw = cw; cl.y = yy; cl.img.setScale(cl.s * uD / A.RS); cl.img.setY(yy); cl.img.setVisible(yy < v.b && yy + ch > v.t);
        }
      }
      // clouds drift
      for (i = 0; i < this.clouds.length; i++) { var q = this.clouds[i]; if (q.img.visible) q.img.setX(v.l - q.cw + (((q.x + q.ph) % 1) * (v.w + q.cw))); }
    }
  }

  window.TBSky = Sky;
})();
