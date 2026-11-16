/* Sharp Eyes: what the scenes share. Saved progress (kept exactly as the old game had it), the interface's sizes,
   and one text helper.
   Saved progress: key 'kahf-sharp-eyes', through Kit.store and Kit.progress (js/kit/core.js), unchanged:
     { stars: { <level>: best stars 1..3 }, current: the level to continue, hinted: true once the first tip was followed }
   A level unlocks when the one before it has a star. */
(function () {
  'use strict';
  var LV = window.SPOT_LEVELS, COUNT = LV.list.length;
  var store = Kit.store('kahf-sharp-eyes'), progress = Kit.progress(store, COUNT);
  var clamp = Phaser.Math.Clamp;
  var Se = window.Se = {
    COUNT: COUNT, MAX_HEARTS: 3, GAP: 36, EDGE: 40,                       // GAP: the space between things; EDGE: from the safe area's edge
    store: store, progress: progress,
    FONT: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    // Sharp Eyes' own interface size, in screen points like the old game: a 150-unit button is 48 points on every screen
    // (view.pt: design units per point), so it is easy to touch on a phone and never huge on a tablet or a computer.
    hs: function (v) { return 48 * v.pt / 150; },
    port: function (v) { return v.h / v.w > 1.6; },                         // a tall, narrow screen: menus use fewer columns and grow
    hudBottom: function (v) { return v.st + Se.EDGE + 150 * Se.hs(v); },
    // text on the engine's own Text object, sharp at this zoom
    txt: function (scene, x, y, s, size, weight, color, o) {
      var z = scene.view ? scene.view.z : 1;
      var t = scene.add.text(x, y, s, Object.assign({ fontFamily: Se.FONT, fontSize: size + 'px', fontStyle: String(weight || 700), color: color || '#fff6e0', resolution: clamp(Math.ceil(z), 1, 2) }, o || {}));
      return t.setOrigin(0.5);          // (the resolution goes in the style: setting it later draws the text a second time)
    },
    hex: function (s) { return Phaser.Display.Color.HexStringToColor(s).color; }
  };
})();
