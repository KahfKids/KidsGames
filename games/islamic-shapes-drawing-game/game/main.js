/* Colouring Book: the Boot scene, offline, and Kit.play.start.
   Boot loads the sounds (Kit.snd.load: one audio sprite), paints the interface pictures once (game/art.js) and starts the
   Book scene. Saved progress and its shape are in game/save.js (unchanged since the first version).
   rest: true (js/kit/play.js): a colouring page changes only when the child touches it, so the loop sleeps in between
   and wakes on any touch, key or resize. Nothing on screen keeps running by itself. */
(function () {
  'use strict';
  var Q = new URLSearchParams(location.search);

  class Boot extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() {
      Kit.play.offThread(this.game);
      Kit.play.art(this, 'art/');
      Kit.snd.load(this, 'audio/sfx/');
    }
    create() {
      CBArt.paint(this);
      this.scene.start('Book');
      Kit.snd.wait(1500).then(function () { Kit.snd.praise.preload(); });
    }
  }

  // offline: the shared service worker keeps every file of the game after one visit
  function offline() {
    if (!('serviceWorker' in navigator) || !location.pathname.startsWith('/KidsGames/') || Q.has('nosw')) return;
    if (navigator.connection && navigator.connection.saveData) return;
    navigator.serviceWorker.register('/KidsGames/sw.js').catch(function () {});
    navigator.serviceWorker.ready.then(function (reg) { return new Promise(function (r) { setTimeout(function () { r(reg); }, 4000); }); }).then(function (reg) {
      var abs = function (p) { return new URL(p, location.href).pathname; };
      var urls = [location.pathname, 'index.html', 'game/geo.js', 'game/books.js', 'game/pages-ramadan.js', 'game/pages-nature.js', 'game/pages-things.js', 'game/pages-patterns.js',
        'game/art.js', 'game/model.js', 'game/save.js', 'game/paint.js', 'game/thumb.js', 'game/book.js', 'game/menu.js', 'game/main.js', 'art/baked.json',
        'audio/sfx/sfx.json', 'audio/sfx/sfx.m4a', 'audio/sfx/amb-room.m4a', 'audio/sfx/brush.m4a', 'audio/sfx/rub.m4a',
        '/KidsGames/js/kahf-bridge.js', '/KidsGames/js/vendor/phaser-4.2.1.min.js', '/KidsGames/js/kit/core.js', '/KidsGames/js/kit/sound.js', '/KidsGames/js/kit/praise-clips.js', '/KidsGames/js/kit/play.js', '/KidsGames/js/kit/load.js'];
      var sw = reg.active || navigator.serviceWorker.controller;
      if (sw) sw.postMessage({ type: 'CACHE_URLS', urls: urls.map(abs) });
    }).catch(function () {});
  }

  if (Q.has('debug')) Kit.play.debug = {};
  // rest.ms 0: the loop sleeps in the first calm frame after a touch (nothing here moves by itself); a longer wait only
  // draws the same picture again, and each frame costs the page's own lifecycle on top of the engine's
  var game = Kit.play.start({ scenes: [Boot, CBBook], color: '#171246', msaa: false, textures: 8, rest: { ms: 0, finger: false } });

  offline();
})();
