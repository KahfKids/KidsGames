/* Hextris (Kahf Kids edition): game/main.js, the Boot scene, offline, and Kit.play.start.
   Saved progress, unchanged from the old game (key 'kahf-hextris', in play.js through Kit.store and Kit.progress):
   { best: best Endless score, stars: { level: 1..3 }, current: the level to continue }.
   Hextris on Phaser 4 (MIT, pinned in js/vendor), started only by Kit.play (js/kit/play.js). Recorded CC0 sounds through
   Kit.snd (audio/sfx, cut by tools/sound-cut.py).
   game/rules.js the rules (no Phaser) · levels.js 15 levels and Endless · art.js the paint box · play.js the courtyard
   and the tiles · ingame.js the interface while playing · hud.js the screens · main.js Boot and start. ?level=N starts level N, ?endless starts Endless,
   ?debug exposes window.HXT = { play, hud } to tests. */
(function () {
  'use strict';
  var Q = new URLSearchParams(location.search);
  if (Q.has('debug')) window.HXT = {};

  class Boot extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() {
      Kit.play.offThread(this.game);                                              // pictures decoded off the main thread
      Kit.play.art(this, 'art/');                                                  // the baked AVIF sheets (tools/bake-art.js); anything not baked is painted
      Kit.snd.load(this, 'audio/sfx/');
    }
    create() {
      HexArt.ui(this);
      this.scene.launch('Hud');
      this.scene.start('Play', { n: Q.has('endless') ? 0 : Q.has('level') ? Math.max(1, Math.min(15, +Q.get('level') | 0 || 1)) : undefined });
      this.scene.bringToTop('Hud');
    }
  }

  // offline: the shared service worker keeps every file of the game after one visit
  function offline() {
    if (!('serviceWorker' in navigator) || !location.pathname.startsWith('/KidsGames/') || Q.has('nosw') || Q.has('debug')) return;
    if (navigator.connection && navigator.connection.saveData) return;
    navigator.serviceWorker.register('/KidsGames/sw.js').catch(function () {});
    navigator.serviceWorker.ready.then(function (reg) { return new Promise(function (r) { setTimeout(function () { r(reg); }, 4000); }); }).then(function (reg) {
      var abs = function (p) { return new URL(p, location.href).pathname; };
      var urls = [location.pathname, 'index.html', 'LICENSE.md', 'game/rules.js', 'game/levels.js', 'game/art.js', 'game/play.js', 'game/ingame.js', 'game/hud.js', 'game/main.js',
        'audio/sfx/sfx.json', 'audio/sfx/sfx.m4a', 'audio/sfx/amb-0.m4a', 'audio/sfx/amb-1.m4a', 'audio/sfx/amb-2.m4a',
        '/KidsGames/js/kahf-bridge.js', '/KidsGames/js/vendor/phaser-4.2.1.min.js', '/KidsGames/js/kit/core.js', '/KidsGames/js/kit/sound.js', '/KidsGames/js/kit/play.js', '/KidsGames/js/kit/load.js'];
      var sw = reg.active || navigator.serviceWorker.controller;
      if (sw) sw.postMessage({ type: 'CACHE_URLS', urls: urls.map(abs) });
    }).catch(function () {});
  }

  var game = Kit.play.start({ scenes: [Boot, HexPlay, HexHud], color: '#04161f', msaa: false, textures: 10 });
  if (!game) return;                                                   // (the 120 Hz frame limit is now the kit's, js/kit/play.js)
  offline();
})();
