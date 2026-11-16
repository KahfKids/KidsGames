/* Solar System: the sky (scene 'Sky', under the space scene).
   Three tile sprites, all pictures made once (tools/bake.js): the nebula panorama with the Milky Way, a layer of faint
   crisp stars (one picture texel to one screen pixel) and a layer of bright glowing stars that sits nearer and moves a
   touch more. The camera is rolled like the space camera on an upright phone. Each frame the space scene says where it is
   looking (set) and the tile positions move: three numbers a layer, no drawing. The stars twinkle with two tweens. */
(function () {
  'use strict';
  class Sky extends Phaser.Scene {
    constructor() { super({ key: 'Sky' }); }
    create() {
      var self = this;
      this.pano = this.add.tileSprite(960, 540, 64, 64, 'sky');
      this.faint = this.add.tileSprite(960, 540, 64, 64, 'sky-faint');
      this.bright = this.add.tileSprite(960, 540, 64, 64, 'sky-bright');
      this.tweens.add({ targets: this.faint, alpha: { from: 0.78, to: 1 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: this.bright, alpha: { from: 0.6, to: 1 }, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      Kit.play.fit(this, function (v) { self.layout(v); }, { w: 1280 });
    }
    layout(v) {
      this.v = v;
      var diag = Math.hypot(v.w, v.h) + 60, maxD = Math.max(v.w, v.h);
      this.size = diag;
      this.ts = 2.7 * maxD / 1024;                                           // design units per panorama texel
      this.pano.setSize(diag, diag).setTileScale(this.ts);
      this.faint.setSize(diag, diag).setTileScale(1 / v.z);                    // one texel to one canvas pixel
      this.bright.setSize(diag, diag).setTileScale(1 / v.z);
      this.K1 = 0.38 * maxD;
      this.set(this.last || { yaw: 0, elev: 0.5, eDef: 0.5, qx: 0, qy: 0, roll: 0 });
    }
    // where the space scene is looking: its yaw and elevation, how far the Sun is off the middle (unrolled), the roll
    set(o) {
      if (!this.v) return;
      this.last = o;
      this.cameras.main.setRotation(o.roll);
      var K1 = this.K1, ts = this.ts, z = this.v.z;
      var ox = -o.yaw * K1 - o.qx, panoH = 512 * ts;
      var oy = Phaser.Math.Clamp((panoH - this.size) / 2 - (o.elev - o.eDef) * K1 * 0.9 - o.qy, 0, Math.max(0, panoH - this.size));
      this.pano.setTilePosition(ox / ts, oy / ts);
      this.faint.setTilePosition(ox * z, oy * z);
      this.bright.setTilePosition((-o.yaw * K1 * 1.18 - o.qx * 2.2) * z, (oy - o.qy * 1.2) * z);
    }
  }
  window.SolarSky = Sky;
})();
