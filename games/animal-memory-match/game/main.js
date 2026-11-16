/* Memory Match: the Boot scene, saved progress, offline, and Kit.play.start.
   Saved progress (unchanged from the old page, key 'kahf-memory-match', via Kit.store / Kit.progress):
   { stars: { <level>: best stars }, current: level to continue, found: [animal ids in the album], hinted: bool }. */
(function () {
  'use strict';
  var K = window.Kit, A = window.MMArt, LV = window.MM_LEVELS, Q = new URLSearchParams(location.search);
  var store = K.store('kahf-memory-match');
  window.MMSave = { store: store, progress: K.progress(store, LV.list.length), album: store.get('found', []), hinted: !!store.get('hinted', false) };

  class Boot extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() {
      Kit.play.offThread(this.game);                                           // big pictures decoded off the main thread
      Kit.snd.load(this, 'audio/sfx/');
      Kit.play.art(this, 'art/', { later: /^bg/ });                            // the baked AVIF sheets; the world scenes load when a world starts (artNeed)
    }
    create() {
      // the sheets: loaded from art/baked when baked, else painted once (art.js); never painted on a phone once baked
      A.cardsSheet(this); A.animalsSheet(this); A.uiSheet(this);
      if (/[?&]bake\b/.test(location.search)) for (var w = 0; w < 4; w++) A.worldTex(this, w);   // (tools/bake-art.js reads all four scenes)
      this.registry.set('blocked', 0);
      var self = this, n = Q.has('level') ? Math.max(1, Math.min(LV.list.length, +Q.get('level') | 0)) : MMSave.progress.current();
      Kit.play.artNeed(this, new RegExp('^' + A.worldKey(LV.worldOf(n)) + '$'), function () {       // the first world's scene, then play
        self.scene.launch('Hud');
        self.scene.start('Play', { n: n });
        self.scene.bringToTop('Hud');
      });
    }
  }

  // offline: the shared service worker keeps every file of the game after one visit
  function offline() {
    if (!('serviceWorker' in navigator) || !location.pathname.startsWith('/KidsGames/') || Q.has('nosw')) return;
    if (navigator.connection && navigator.connection.saveData) return;
    navigator.serviceWorker.register('/KidsGames/sw.js').catch(function () {});
    navigator.serviceWorker.ready.then(function (reg) { return new Promise(function (r) { setTimeout(function () { r(reg); }, 4000); }); }).then(function (reg) {
      var abs = function (p) { return new URL(p, location.href).pathname; };
      var urls = [location.pathname, 'index.html', 'game/animals.js', 'game/art.js', 'game/levels.js', 'game/play.js', 'game/hud.js', 'game/main.js',
        'audio/sfx/sfx.json', 'audio/sfx/sfx.m4a', 'audio/sfx/amb-0.m4a', 'audio/sfx/amb-1.m4a', 'audio/sfx/amb-2.m4a', 'audio/sfx/amb-3.m4a', 'art/baked.json',
        '/KidsGames/js/kahf-bridge.js', '/KidsGames/js/vendor/phaser-4.2.1.min.js', '/KidsGames/js/kit/core.js', '/KidsGames/js/kit/sound.js', '/KidsGames/js/kit/play.js', '/KidsGames/js/kit/load.js',
        '/KidsGames/js/kit/praise-clips.js'];
      var sw = reg.active || navigator.serviceWorker.controller;
      if (sw) sw.postMessage({ type: 'CACHE_URLS', urls: urls.map(abs) });
    }).catch(function () {});
  }

  Kit.play.start({ scenes: [Boot, MMPlay, MMHud], color: '#0d0b24', msaa: false, textures: 6, rest: true });
  offline();
})();
