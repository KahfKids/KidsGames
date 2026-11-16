/* Star Rangers: the Boot scene, offline, and Kit.play.start.
   Saved progress is unchanged (key 'kahf-star-rangers', see game/common.js). The pictures are painted once here (atlases
   'sr' and 'ui'); a wave's own pictures (sky, rocks, boss) are painted when it starts. */
(function () {
  'use strict';
  var Q = SR.Q, LV = window.STAR_WAVES;

  class Boot extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() {
      Kit.play.offThread(this.game);                                  // pictures decoded off the main thread
      // the baked AVIF pictures (tools/bake-art.js; not in ?bake mode): the two sheets and the first wave's world now, every other
      // world's pictures only when a wave needs them (Play.create)
      var n = SR.startLevel(); Kit.play.art(this, 'art/', { later: SrArt.artLater(SrArt.artFor(SR.stage(n).world, LV.list[n - 1].boss != null)) });
      Kit.snd.load(this, 'audio/sfx/');
    }
    create() {
      SrArt.paintSprites(this); SrArt.paintUi(this); SrArt.paintStars(this); SrArt.paintFont(this);
      if (/[?&]bake\b/.test(location.search)) SrArt.bakeAll(this);                  // tools/bake-art.js: paint everything that can be baked
      var n = SR.startLevel();
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
      var urls = [location.pathname, 'index.html', 'game/common.js', 'game/waves.js', 'game/art.js', 'game/play.js', 'game/hud.js', 'game/main.js',
        'art/baked.json', 'audio/sfx/sfx.json', 'audio/sfx/sfx.m4a',
        '/KidsGames/js/kahf-bridge.js', '/KidsGames/js/vendor/phaser-4.2.1.min.js', '/KidsGames/js/kit/core.js', '/KidsGames/js/kit/sound.js', '/KidsGames/js/kit/play.js', '/KidsGames/js/kit/load.js'];
      var sw = reg.active || navigator.serviceWorker.controller;
      if (sw) sw.postMessage({ type: 'CACHE_URLS', urls: urls.map(abs) });
    }).catch(function () {});
  }

  if (Q.has('debug')) Kit.play.debug = {};
  Kit.play.start({ scenes: [Boot, SrPlay, SrHud], color: '#02040f', msaa: false, textures: 8 });
  offline();
})();
