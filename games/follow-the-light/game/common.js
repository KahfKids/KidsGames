/* Follow the Light: what the scenes share: saved progress, the device last used, one text style.
   Saved progress (the old page's, unchanged): localStorage 'kahf-follow-the-light' = JSON { stars: { <level>: 1..3 },
   current: <level to continue>, taught: <true once the child has tapped a right light> }, written by Kit.store and
   Kit.progress (js/kit/core.js): level n+1 opens when level n has a star. */
(function () {
  'use strict';
  var Q = new URLSearchParams(location.search);
  var COUNT = window.LIGHT_LEVELS.list.length;
  var store = Kit.store('kahf-follow-the-light'), progress = Kit.progress(store, COUNT);

  // The device last used decides the prompts: 'pointer' (a finger or a mouse) or 'keys'. Changes at once, no restart.
  var dev = { mode: 'pointer' };
  function setMode(m) { if (dev.mode === m) return; dev.mode = m; if (Kit.play.game) Kit.play.game.events.emit('ftl-device', m); }

  // a text in the game's one style (system font, rounded and heavy)
  function text(scene, x, y, s, size, color, weight, extra) {
    var st = { fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', fontSize: size + 'px', fontStyle: weight || '800', color: color || '#f6efe0', resolution: 1 };
    return scene.add.text(x, y, s, extra ? Object.assign(st, extra) : st).setOrigin(0.5);
  }

  window.Ftl = { COUNT: COUNT, store: store, progress: progress, dev: dev, setMode: setMode, text: text, q: Q };
})();
