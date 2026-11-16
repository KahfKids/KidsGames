/* Mosaic Breaker: the Boot scene, saved progress, offline, and Kit.play.start.
   Saved progress (unchanged from the old page: Kit.store / Kit.progress, js/kit/core.js), key 'kahf-mosaic-breaker':
   { launched: true once the first launch was done, stars: { <level>: best stars 1..3 }, current: level to continue }.
   Level n + 1 opens when level n has at least one star. */
(function () {
  'use strict';
  var Q = new URLSearchParams(location.search), COUNT = window.MOSAIC_LEVELS.list.length;
  var store = Kit.store('kahf-mosaic-breaker'), progress = Kit.progress(store, COUNT);
  window.BrSave = { store: store, progress: progress, COUNT: COUNT };

  class Boot extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() {
      Kit.play.offThread(this.game);                                   // pictures decoded off the main thread
      Kit.play.art(this, 'art/');                                      // the baked pictures (tools/bake-art.js): AVIF files, painted live only if missing
      Kit.snd.load(this, 'audio/sfx/');
    }
    create() {
      BrArt.keep = this.cache.json.exists('kit-baked-art/');            // baked pictures stay loaded when the world changes
      BrArt.paint(this);
      if (/[?&]bake\b/.test(location.search)) for (var w = 0; w < 3; w++) BrArt.world(this, w);       // (tools/bake-art.js: every world's pictures)
      var n = Q.has('level') ? Math.max(1, Math.min(COUNT, Q.get('level') | 0 || 1)) : progress.current();
      this.registry.set('in', { aim: null, launch: 0, kx: 0, restart: 0 });
      this.scene.launch('Hud');
      this.scene.start('Play', { n: n });
      this.scene.bringToTop('Hud');
    }
  }

  // offline: the shared service worker keeps every file of the game after one visit
  function offline() {
    if (!('serviceWorker' in navigator) || !location.pathname.startsWith('/KidsGames/') || Q.has('nosw')) return;
    if (navigator.connection && navigator.connection.saveData) return;
    navigator.serviceWorker.register('/KidsGames/sw.js').catch(function () {});
    navigator.serviceWorker.ready.then(function (reg) { return new Promise(function (r) { setTimeout(function () { r(reg); }, 4000); }); }).then(function (reg) {
      var abs = function (p) { return new URL(p, location.href).pathname; };
      var urls = [location.pathname, 'index.html', 'game/levels.js', 'game/art.js', 'game/play.js', 'game/hud.js', 'game/main.js',
        'audio/sfx/sfx.json', 'audio/sfx/sfx.m4a', 'audio/sfx/amb-0.m4a', 'audio/sfx/amb-1.m4a', 'audio/sfx/amb-2.m4a',
        '/KidsGames/js/kahf-bridge.js', '/KidsGames/js/vendor/phaser-4.2.1.min.js', '/KidsGames/js/kit/core.js', '/KidsGames/js/kit/sound.js', '/KidsGames/js/kit/play.js', '/KidsGames/js/kit/load.js'];
      var sw = reg.active || navigator.serviceWorker.controller;
      if (sw) sw.postMessage({ type: 'CACHE_URLS', urls: urls.map(abs) });
    }).catch(function () {});
  }

  if (Q.has('debug')) Kit.play.debug = {};
  Kit.play.start({ scenes: [Boot, BrPlay, BrHud], color: '#0d0b24', msaa: false, textures: 8 });
  offline();
})();
