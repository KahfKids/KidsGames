/* Star & Flower Tic Tac Toe: the Boot scene, offline, and Kit.play.start.
   Saved progress is unchanged from the old page (Kit.store('kahf-tic-tac-toe') with Kit.progress: { stars: { n: 1..3 },
   current: opponent to continue, hinted: the first-match hint was shown }), read and written by Board.
   Everything the game draws is painted here once (BkArt.init), so there is nothing to download but the sounds. */
(function () {
  'use strict';
  var C = window.BkCfg, Q = new URLSearchParams(location.search);

  class Boot extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() {
      Kit.play.offThread(this.game);                                        // pictures decoded off the main thread
      Kit.play.art(this, 'art/');                                           // the baked pictures (tools/bake-art.js), when they exist
      Kit.snd.load(this, 'audio/sfx/');
    }
    create() {
      var kinds = []; C.opponents.forEach(function (o) { if (kinds.indexOf(o.robot) < 0) kinds.push(o.robot); });
      BkArt.init(this, kinds);
      if (/[?&]bake\b/.test(location.search)) BkArt.paintAll(this, C);      // tools/bake-art.js: paint every picture so all are baked
      this.registry.set('device', Kit.isTouch ? 'touch' : 'keys');
      this.scene.start('Hud');                                              // (the Hud launches the Board)
    }
  }

  // offline: the shared service worker keeps every file of the game after one visit
  function offline() {
    if (!('serviceWorker' in navigator) || !location.pathname.startsWith('/KidsGames/') || Q.has('nosw')) return;
    if (navigator.connection && navigator.connection.saveData) return;
    navigator.serviceWorker.register('/KidsGames/sw.js').catch(function () {});
    navigator.serviceWorker.ready.then(function (reg) { return new Promise(function (r) { setTimeout(function () { r(reg); }, 4000); }); }).then(function (reg) {
      var abs = function (p) { return new URL(p, location.href).pathname; };
      var urls = [location.pathname, 'index.html', 'game/art.js', 'game/rules.js', 'game/config.js', 'game/board.js', 'game/hud.js', 'game/main.js',
        'art/baked.json', 'audio/sfx/sfx.json', 'audio/sfx/sfx.m4a', 'audio/sfx/amb-court.m4a',
        '/KidsGames/js/kahf-bridge.js', '/KidsGames/js/vendor/phaser-4.2.1.min.js', '/KidsGames/js/kit/core.js', '/KidsGames/js/kit/sound.js', '/KidsGames/js/kit/play.js', '/KidsGames/js/kit/load.js'];
      var sw = reg.active || navigator.serviceWorker.controller;
      if (sw) sw.postMessage({ type: 'CACHE_URLS', urls: urls.map(abs) });
    }).catch(function () {});
  }

  Kit.play.start({ scenes: [Boot, BkBoard, BkHud], color: '#2f2466', rest: true, msaa: false, textures: 6 });
  offline();
})();
