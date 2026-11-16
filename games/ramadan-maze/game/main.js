/* Ramadan Maze: the Boot scene, saved progress, offline, and Kit.play.start.
   Saved progress (unchanged from the old page: Kit.store('kahf-ramadan-maze') and Kit.progress, js/kit/core.js):
     { stars: { <level>: best stars 1..3 }, current: level to continue, moved: true once the child has walked }
   A level n+1 is open when level n has a star. */
(function () {
  'use strict';
  var COUNT = MAZE_LEVELS.count, Q = new URLSearchParams(location.search);
  var store = Kit.store('kahf-ramadan-maze'), progress = Kit.progress(store, COUNT);
  window.MzSave = { store: store, progress: progress, COUNT: COUNT };

  class Boot extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() {
      Kit.play.offThread(this.game);                                      // pictures decoded off the main thread
      Kit.snd.load(this, 'audio/sfx/');
      Kit.play.art(this, 'art/');                                          // the baked AVIF pictures (tools/bake-art.js), when they exist
    }
    create() {
      MzArt.ui(this); MzArt.sprites(this);
      if (Q.has('bake')) { for (var w = 0; w < 3; w++) { MzArt.paintTile(this, w); MzArt.house(this, w); } MzArt.iftarRoom(this); }   // tools/bake-art.js reads every fixed picture
      this.anims.create({ key: 'walk', frames: [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) { return { key: 'mzs', frame: 'kid' + i }; }), frameRate: 14.8, repeat: -1 });
      this.registry.set('in', { dir: 0, held: false, tap: null });         // what the child asks for: a direction (N E S W, 0 none), whether a finger/key is down, a tap
      var n = Q.has('level') ? Math.max(1, Math.min(COUNT, +Q.get('level') | 0)) : progress.current();
      this.scene.launch('Hud');
      this.scene.start('Maze', { n: n });
      this.scene.bringToTop('Hud');
      Kit.snd.wait(1500).then(function () { Kit.snd.praise.preload(); });   // Boot stops here; use the kit's active sound scene.
    }
  }

  // offline: the shared service worker keeps every file of the game after one visit
  function offline() {
    if (!('serviceWorker' in navigator) || !location.pathname.startsWith('/KidsGames/') || Q.has('nosw')) return;
    if (navigator.connection && navigator.connection.saveData) return;
    navigator.serviceWorker.register('/KidsGames/sw.js').catch(function () {});
    navigator.serviceWorker.ready.then(function (reg) { return new Promise(function (r) { setTimeout(function () { r(reg); }, 4000); }); }).then(function (reg) {
      var abs = function (p) { return new URL(p, location.href).pathname; };
      var urls = [location.pathname, 'index.html', 'game/levels.js', 'game/art.js', 'game/maze.js', 'game/hud.js', 'game/iftar.js', 'game/main.js', 'art/baked.json',
        'audio/sfx/sfx.json', 'audio/sfx/sfx.m4a', 'audio/sfx/amb-garden.m4a', 'audio/sfx/amb-lanes.m4a', 'audio/sfx/amb-night.m4a', 'audio/sfx/amb-house.m4a',
        '/KidsGames/js/kahf-bridge.js', '/KidsGames/js/vendor/phaser-4.2.1.min.js', '/KidsGames/js/kit/core.js', '/KidsGames/js/kit/sound.js', '/KidsGames/js/kit/praise-clips.js', '/KidsGames/js/kit/play.js', '/KidsGames/js/kit/load.js'];
      var sw = reg.active || navigator.serviceWorker.controller;
      if (sw) sw.postMessage({ type: 'CACHE_URLS', urls: urls.map(abs) });
    }).catch(function () {});
  }

  if (Q.has('debug')) Kit.play.debug = {};
  Kit.play.start({ scenes: [Boot, MzMaze, MzHud], color: '#0d0b24', msaa: false, textures: 4 });
  offline();
})();
