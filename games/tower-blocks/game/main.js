/* Tower Blocks: the Boot scene, saved progress, offline, and Kit.play.start.
   Saved progress (unchanged shape and key from the Canvas2D version): localStorage 'kahf-tower-blocks' =
   { stars: { level: best stars }, current: level to continue, dropped: true once a block was dropped, best: Free Build's best }.
   (Kit.store and Kit.progress from js/kit/core.js, exactly as the old game used them.)
   Scenes, bottom to top: Sky (the backdrop), Tower (the world and the rules), Hud (the interface). */
(function () {
  'use strict';
  var Q = new URLSearchParams(location.search), A = window.TBArt, LV = window.TOWER_LEVELS;
  var store = Kit.store('kahf-tower-blocks'), progress = Kit.progress(store, LV.count);
  window.TBSave = { store: store, progress: progress };

  class Boot extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() { Kit.play.offThread(this.game); Kit.play.art(this, 'art/'); Kit.snd.load(this, 'audio/sfx/'); }
    create() {
      A.paint(this);                                     // (pictures baked to art/baked/*.avif are loaded by Boot's preload and not painted)
      this.scene.launch('Sky');
      this.scene.launch('Hud');
      var free = Q.has('free'), lv = Q.has('level') ? Math.max(1, Math.min(LV.count, +Q.get('level') | 0 || 1)) : progress.current();
      this.scene.start('Tower', { mode: free ? 'free' : 'level', level: lv });
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
      var urls = [location.pathname, 'index.html', 'game/levels.js', 'game/art.js', 'game/sky.js', 'game/tower.js', 'game/hud.js', 'game/main.js',
        'art/baked.json', 'audio/sfx/sfx.json', 'audio/sfx/sfx.m4a', 'audio/sfx/amb-wind.m4a',
        '/KidsGames/js/kahf-bridge.js', '/KidsGames/js/vendor/phaser-4.2.1.min.js', '/KidsGames/js/kit/core.js', '/KidsGames/js/kit/sound.js',
        '/KidsGames/js/kit/play.js', '/KidsGames/js/kit/load.js', '/KidsGames/js/kit/praise-clips.js'];
      var sw = reg.active || navigator.serviceWorker.controller;
      if (sw) sw.postMessage({ type: 'CACHE_URLS', urls: urls.map(abs) });
    }).catch(function () {});
  }

  Kit.play.start({ scenes: [Boot, window.TBSky, window.TBTower, window.TBHud], color: '#2f2a72', msaa: false, textures: 8 });
  offline();
})();
