/* Balloon Pop: main.js, the Boot scene, offline, and Kit.play.start.
   Saved progress is unchanged from the old game (common.js): key 'kahf-balloon-pop'. */
(function () {
  'use strict';
  var Q = new URLSearchParams(location.search), D = window.BpData;

  class Boot extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() {
      Kit.play.offThread(this.game);                         // big pictures decoded off the main thread
      // the baked pictures (tools/bake-art.js), if any. The scenery of the other worlds and screen shapes is kept out of this
      // (art.js takeBaked) and fetched when a level needs it; the first level's is fetched now.
      var n0 = Q.has('level') ? Phaser.Math.Clamp(+Q.get('level') | 0 || 1, 1, D.count) : Bp.progress.current();
      this.load.once('filecomplete-json-kit-baked-art/', function (k, t, data) { BpArt.takeBaked(this.load, data, D.worldOf(n0), BpArt.shapeOf({ w: innerWidth, h: innerHeight })); }, this);
      // the balloons and small things of the other two worlds stay on disk until a level of that world starts (play.js loads
      // them with Kit.play.artNeed and lets the old world's go): a third of the picture memory
      Kit.play.art(this, 'art/', { later: new RegExp('^(bal|wd)-(?!' + D.worldOf(n0) + '$)') });
      Kit.snd.load(this, 'audio/sfx/');                      // the one-shot sounds (one audio sprite)
    }
    create() {
      BpArt.ui(this); BpArt.cards(this); BpArt.fonts(this);                     // the interface and the deed cards (baked, or painted once)
      if (/[?&]bake\b/.test(location.search)) { for (var w = 0; w < 3; w++) BpArt.world(this, w); BpArt.sceneryAll(this); }   // tools/bake-art.js: every world's sheets and scenery
      this.scene.launch('Hud');
      var n = Q.has('level') ? Phaser.Math.Clamp(+Q.get('level') | 0 || 1, 1, D.count) : Bp.progress.current();
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
      var urls = [location.pathname, 'index.html', 'game/data.js', 'game/deeds.js', 'game/art.js', 'game/common.js', 'game/play.js', 'game/hud.js', 'game/main.js',
        'audio/sfx/sfx.json', 'audio/sfx/sfx.m4a', 'audio/sfx/amb-garden.m4a', 'audio/sfx/amb-sea.m4a', 'audio/sfx/amb-night.m4a',
        'audio/praise-mashaallah.mp3', 'audio/praise-barakallah.mp3', 'art/baked.json'].concat(BpArt.bakedUrls(), [
        '/KidsGames/js/kahf-bridge.js', '/KidsGames/js/vendor/phaser-4.2.1.min.js', '/KidsGames/js/kit/core.js', '/KidsGames/js/kit/sound.js', '/KidsGames/js/kit/play.js', '/KidsGames/js/kit/load.js']);
      var sw = reg.active || navigator.serviceWorker.controller;
      if (sw) sw.postMessage({ type: 'CACHE_URLS', urls: urls.map(abs) });
    }).catch(function () {});
  }

  if (Q.has('debug')) Kit.play.debug = {};
  Kit.play.start({ scenes: [Boot, window.BpPlay, window.BpHud], color: '#8ccbf6', msaa: false, textures: 8 });
  offline();
})();
