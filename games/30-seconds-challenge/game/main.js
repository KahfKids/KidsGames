/* Sharp Eyes: the Boot scene, offline, and Kit.play.start.
   Saved progress is in game/common.js (key 'kahf-sharp-eyes', unchanged). Sounds: audio/sfx (cut by tools/sound-cut.py).
   start({ rest: true }): a game of taps, so the loop sleeps while nothing moves (on the levels without a clock, between taps)
   and wakes on any touch or key (js/kit/play.js). ?debug adds window.SE (state and taps, for tests); ?level=n opens level n. */
(function () {
  'use strict';
  var Q = new URLSearchParams(location.search);

  class Boot extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() {
      Kit.play.offThread(this.game);                    // the baked pictures are decoded off the main thread
      Kit.play.art(this, 'art/');                       // art/baked.json: the ui sheet and the three worlds (tools/bake-art.js)
      Kit.snd.load(this, 'audio/sfx/');
    }
    create() {
      window.SpotArt.ui(this);
      [0, 1, 2].forEach(function (w) { window.SpotArt.worldTex(this, w); }, this);       // (painted here only when not baked)
      if (Q.has('level')) window.Se.progress.setCurrent(Phaser.Math.Clamp(+Q.get('level') | 0 || 1, 1, window.Se.COUNT));
      this.scene.launch('Hud');
      this.scene.start('Play');
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
      var urls = [location.pathname, 'index.html', 'game/items.js', 'game/levels.js', 'game/art.js', 'game/common.js', 'game/play.js', 'game/hud.js', 'game/main.js',
        'art/baked.json', 'audio/sfx/sfx.json', 'audio/sfx/sfx.m4a', 'audio/sfx/bed-0.m4a', 'audio/sfx/bed-1.m4a', 'audio/sfx/bed-2.m4a',
        '/KidsGames/js/kahf-bridge.js', '/KidsGames/js/vendor/phaser-4.2.1.min.js', '/KidsGames/js/kit/core.js', '/KidsGames/js/kit/sound.js', '/KidsGames/js/kit/play.js', '/KidsGames/js/kit/load.js'];
      var sw = reg.active || navigator.serviceWorker.controller;
      if (sw) sw.postMessage({ type: 'CACHE_URLS', urls: urls.map(abs) });
    }).catch(function () {});
  }

  var game = Kit.play.start({ scenes: [Boot, window.SePlay, window.SeHud], color: '#0d0b24', msaa: false, textures: 6, rest: true });
  if (Q.has('debug') && game) {
    window.SE = {
      play: function () { return game.scene.getScene('Play'); }, hud: function () { return game.scene.getScene('Hud'); },
      get: function () { var p = game.scene.getScene('Play'); return { phase: p.phase, level: p.level, world: p.world, found: p.found, hearts: p.hearts, odd: p.odd, n: p.G && p.G.n, cols: p.G && p.G.cols, rows: p.G && p.G.rows, pitch: p.G && Math.round(p.G.pitch),
        left: p.timer ? p.timer.getRemaining() / 1000 : null, cells: p.cells.map(function (c) { return [Math.round(c.x), Math.round(c.y)]; }), pick: p.pick && { item: p.pick.item.id, kind: p.pick.kind }, resting: Kit.play.resting, stars: window.Se.progress.stars(p.level) }; },
      tap: function (i) { game.scene.getScene('Play').choosePic(game.scene.getScene('Play').cells[i]); },
      right: function () { var p = game.scene.getScene('Play'); p.choosePic(p.cells[p.odd]); },
      wrong: function () { var p = game.scene.getScene('Play'); p.choosePic(p.cells[(p.odd + 1) % p.cells.length]); },
      start: function (n) { game.events.emit('se-go', n); }
    };
  }
  offline();
})();
