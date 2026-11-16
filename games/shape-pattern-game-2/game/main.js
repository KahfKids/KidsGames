/* Shape Patterns: the Boot scene, offline, and Kit.play.start.
   Saved progress is the old page's, unchanged (key 'kahf-shape-patterns': { hinted, stars: { level: 1..3 }, current }), in play.js.
   Turn-based, so the engine's loop sleeps while nothing moves (rest: true). */
(function () {
  'use strict';
  var Q = new URLSearchParams(location.search);
  class Boot extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() {
      Kit.snd.load(this, 'audio/sfx/');
      if (PatArt.BAKE) return;
      Kit.play.offThread(this.game);                                              // baked pictures decode off the main thread
      Kit.play.art(this, 'art/', { later: /^w[0-9]-/ });                          // the common sheet now; each world's pictures when it starts
    }
    create() {
      PatArt.ui(this);
      this.registry.set('blocked', 0);
      this.scene.launch('Hud');
      this.scene.start('Play');
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
      urls.push('art/baked.json', '/KidsGames/js/kit/praise-clips.js');                       // (the kit adds every baked AVIF itself)
      var sw = reg.active || navigator.serviceWorker.controller;
      if (sw) sw.postMessage({ type: 'CACHE_URLS', urls: urls.map(abs) });
    }).catch(function () {});
  }

  Kit.play.start({ scenes: [Boot, PatPlay, PatHud], color: '#24195a', msaa: false, textures: 8, rest: true });
  offline();
})();
