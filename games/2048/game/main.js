/* 2048 Garden: the Boot scene, saved progress, offline, and Kit.play.start.
   Saved progress is unchanged (key 'kahf-2048', one entry made by Kit.store): { stars: { level: best stars },
   current: level to continue, board: { level, snap, moves, undos, used } (the level in progress, or null),
   swiped: true once the child has slid a tile }. Kit.progress unlocks level n + 1 when n has a star. */
(function () {
  'use strict';
  var Q = new URLSearchParams(location.search), BAKE = Q.has('bake'), LV = window.G48_LEVELS, COUNT = LV.list.length;
  var store = Kit.store('kahf-2048');
  window.G48Save = { store: store, progress: Kit.progress(store, COUNT), count: COUNT };

  class Boot extends Phaser.Scene {
    constructor() { super('Boot'); }
    // Art: the interface sheet is loaded here; each level loads the baked pictures of its own garden and board size
    // (Garden.preload), so the graphics chip never holds the other gardens (tools/bake-art.js writes art/baked.json).
    preload() {
      Kit.play.offThread(this.game);
      Kit.snd.load(this, 'audio/sfx/');
      if (BAKE) return;
      Kit.play.art(this, 'art/', { later: /^(?!g48ui$)/ });        // only UI now; each level loads its own pictures
    }
    create() {
      if (BAKE) window.G48Art.bakeAll(this); else window.G48Art.ui(this);
      this.scene.launch('Hud');
      this.scene.start('Garden', { n: Q.has('level') ? +Q.get('level') : window.G48Save.progress.current(), resume: !Q.has('level') });
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
      var urls = [location.pathname, 'index.html', 'game/rules.js', 'game/levels.js', 'game/art.js', 'game/board.js', 'game/hud.js', 'game/main.js', 'art/baked.json',
        'audio/sfx/sfx.json', 'audio/sfx/sfx.m4a', 'audio/sfx/amb-0.m4a', 'audio/sfx/amb-1.m4a', 'audio/sfx/amb-2.m4a',
        'audio/voice/mashaallah.mp3', 'audio/voice/ahsant.mp3', 'audio/voice/barakallah.mp3', 'audio/voice/alhamdulillah.mp3',
        '/KidsGames/js/kahf-bridge.js', '/KidsGames/js/vendor/phaser-4.2.1.min.js', '/KidsGames/js/kit/core.js', '/KidsGames/js/kit/sound.js', '/KidsGames/js/kit/play.js', '/KidsGames/js/kit/load.js'];
      var sw = reg.active || navigator.serviceWorker.controller;
      if (sw) sw.postMessage({ type: 'CACHE_URLS', urls: urls.map(abs) });     // Kit.play.art caches the selected image format.
    }).catch(function () {});
  }

  if (Q.has('debug')) {                                                          // a test hook: play by hand and inspect
    window.G48T = {
      S: function () { return window.G48S; },
      go: function (n) { window.G48Garden && game.scene.getScene('Hud').go(n); },
      move: function (d) { game.scene.getScene('Garden').request(d); },
      undo: function () { return game.scene.getScene('Garden').undo(); },
      hud: function () { return game.scene.getScene('Hud'); },
      garden: function () { return game.scene.getScene('Garden'); },
      board: function () { var g = window.G48S.gm.grid, b = []; for (var x = 0; x < g.size; x++) { b.push([]); for (var y = 0; y < g.size; y++) { var t = g.cells[x][y]; b[x].push(t ? (t.stone ? -1 : t.value) : 0); } } return b; },
      // place values by hand (for screenshots): b[x][y], -1 = stone
      setBoard: function (b) {
        var R = window.G48Rules, gm = window.G48S.gm; gm.grid = new R.Grid(b.length);
        for (var x = 0; x < b.length; x++) for (var y = 0; y < b.length; y++) if (b[x][y]) gm.grid.insertTile(new R.Tile({ x: x, y: y }, b[x][y] > 0 ? b[x][y] : 0, b[x][y] < 0));
        gm.over = !gm.movesAvailable(); game.scene.getScene('Garden').syncAll('undo'); game.scene.getScene('Hud').starsUpdate(true);
      }
    };
  }
  var game = Kit.play.start({ scenes: [Boot, window.G48Garden, window.G48Hud], color: '#7cc6ef', msaa: false, textures: 4, rest: true });
  offline();
})();
