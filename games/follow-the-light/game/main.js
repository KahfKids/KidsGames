/* Follow the Light: the Boot scene, offline, and Kit.play.start. (Shared state is game/common.js.) */
(function () {
  'use strict';
  var F = Ftl, Q = F.q, progress = F.progress, COUNT = F.COUNT;

  class Boot extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() {
      Kit.play.offThread(this.game);                                  // pictures decoded off the main thread
      Kit.play.art(this, 'art/');                                     // the baked AVIF sheets (tools/bake-art.js)
      Kit.snd.load(this, 'audio/sfx/');
    }
    create() {
      LFArt.paint(this);
      this.scene.launch('Hud');
      this.scene.start('Play', { n: Q.has('level') ? Phaser.Math.Clamp(+Q.get('level') | 0, 1, COUNT) : progress.current() });
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
      var urls = [location.pathname, 'index.html', 'game/levels.js', 'game/common.js', 'game/art.js', 'game/play.js', 'game/hud.js', 'game/main.js', 'art/baked.json',
        'audio/sfx/sfx.json', 'audio/sfx/sfx.m4a', 'audio/sfx/amb-0.m4a', 'audio/sfx/amb-1.m4a', 'audio/sfx/amb-2.m4a',
        '/KidsGames/js/kahf-bridge.js', '/KidsGames/js/vendor/phaser-4.2.1.min.js', '/KidsGames/js/kit/core.js', '/KidsGames/js/kit/sound.js', '/KidsGames/js/kit/play.js', '/KidsGames/js/kit/load.js'];
      var sw = reg.active || navigator.serviceWorker.controller;
      if (sw) sw.postMessage({ type: 'CACHE_URLS', urls: urls.map(abs) });
    }).catch(function () {});
  }

  if (Q.has('debug')) Kit.play.debug = {};
  Kit.play.start({ scenes: [Boot, FtlPlay, FtlHud], color: '#0b0820', rest: true, msaa: false, textures: 8 });
  offline();
})();
