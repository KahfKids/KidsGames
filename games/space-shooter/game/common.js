/* Star Rangers: shared bits (window.SR): saved progress, the two ways the scenes fit the screen, small helpers.
   Saved progress (unchanged from the old game, key 'kahf-star-rangers', Kit.store/Kit.progress of js/kit/core.js):
     { stars: { <wave>: best stars 1..3 }, current: wave to continue, flown: true once the child has flown the ship }.
   Why not Kit.play.fit alone: it fits a 1920 x 1080 design space centred, right for a game laid out on its side. Star
   Rangers is a tall field that also works upright (the app opens it upright, it is not in landscape-games.ts), so each
   scene sets its own camera inside Kit.play.fit's resize hook (that keeps the engine's resize wiring and the safe-area
   reading):
     'play' the field: at least FW_MIN x FH_MIN units, centred; a wider screen widens it up to FW_MAX, more is scenery
     'hud'  the interface: the SHORT side of the screen is 1000 units, so buttons are as large on a phone held upright as
            on its side (a 150-unit button is about 56 CSS px on a phone, 115 on a tablet)
   Both leave scene.view = { l, r, t, b, w, h, z, sl, sr, st, sb, k } (edges in scene units; s* inside the notch; k = units
   per CSS pixel). Kit wish: Kit.play.fit(scene, layout, { design: [w, h] | 'short:1080' }). */
(function () {
  'use strict';
  var SR = window.SR = {};
  var Q = new URLSearchParams(location.search);
  SR.Q = Q;
  SR.FW_MIN = 900; SR.FW_MAX = 1700; SR.FH_MIN = 1300;
  SR.COUNT = 24; SR.PER = 6;
  SR.store = Kit.store('kahf-star-rangers');
  SR.progress = Kit.progress(SR.store, SR.COUNT);
  SR.flown = function () { return !!SR.store.get('flown', false); };
  SR.setFlown = function () { SR.store.set('flown', true); };
  SR.num = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };       // (not toLocaleString: its first call took 30 ms at 6x CPU)
  SR.GAP = 36;                                                   // the space between buttons, in HUD units
  // the interface's own size: 150 units are 48 screen points on every screen (as the old game's 46-point buttons), so it is
  // easy to touch on a phone and never huge on a tablet or a computer
  SR.hudZoom = function (scene) { return 48 / (150 * (scene.scale.zoom || 1)); };

  SR.fit = function (scene, mode, layout) {
    return Kit.play.fit(scene, function (v0) {
      var gw = scene.scale.width, gh = scene.scale.height, cam = scene.cameras.main, d = Kit.play.dpr();
      var k0 = d / v0.z, sa = { l: (v0.sl - v0.l) / k0, r: (v0.r - v0.sr) / k0, t: (v0.st - v0.t) / k0, b: (v0.b - v0.sb) / k0 };   // safe insets, CSS px
      var z = mode === 'hud' ? SR.hudZoom(scene) : Math.min(gw / SR.FW_MIN, gh / SR.FH_MIN);
      var vw = gw / z, vh = gh / z, cx = mode === 'hud' ? vw / 2 : Math.min(vw, SR.FW_MAX) / 2;
      cam.setZoom(z); cam.centerOn(cx, vh / 2);
      var k = d / z, v = scene.view = { l: cx - vw / 2, r: cx + vw / 2, t: 0, b: vh, w: vw, h: vh, z: z, k: k };
      v.sl = v.l + sa.l * k; v.sr = v.r - sa.r * k; v.st = v.t + sa.t * k; v.sb = v.b - sa.b * k;
      if (layout) layout.call(scene, v);
    });
  };

  // a crisp text object (Phaser draws text at 1 pixel per unit; the interface is shown about 1:1 or smaller, but a tablet scales it up)
  SR.txt = function (scene, x, y, s, size, o) {
    o = o || {};
    var t = scene.add.text(x, y, s, { fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', fontSize: size + 'px', fontStyle: o.style || '800', color: o.color || '#f6f3ff',
      align: o.align || 'center', wordWrap: o.wrap ? { width: o.wrap } : undefined, resolution: 2, stroke: o.stroke, strokeThickness: o.stroke ? (o.thick || 8) : 0, padding: { x: 4, y: 4 } });
    t.setOrigin(o.ox == null ? 0.5 : o.ox, o.oy == null ? 0.5 : o.oy);
    if (o.stroke) t.setShadow(0, 3, 'rgba(0,0,0,.35)', 8);
    return t;
  };
  // an image of the interface atlas, shown at 1 unit per unit
  SR.ui = function (scene, x, y, frame) { return scene.add.image(x, y, 'ui', frame).setScale(1 / SrArt.S); };
  SR.nine = function (scene, x, y, frame, w, h, corner) { // a stretchy card or pill
    var S = SrArt.S; return scene.add.nineslice(x, y, 'ui', frame, w * S, h * S, corner * S, corner * S, corner * S, corner * S).setScale(1 / S);
  };
  SR.hex = function (c) { return Phaser.Display.Color.HexStringToColor(c).color; };
  SR.startLevel = function () { return Q.has('level') ? Phaser.Math.Clamp(+Q.get('level') | 0 || 1, 1, SR.COUNT) : SR.progress.current(); };
  SR.stage = function (n) { return { world: Math.floor((n - 1) / SR.PER), idx: ((n - 1) % SR.PER) + 1 }; };
})();
