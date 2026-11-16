/* Jannah Garden: the Boot scene (paints every picture once, makes the animations, loads the sounds), the device in use,
   offline, and Kit.play.start. Saved progress is garden.js (key 'kahf-jannah-garden', shape unchanged).
   Not turn-based: the garden is alive (swaying plants, drifting clouds, butterflies, water), so the loop does not rest. */
(function () {
  'use strict';
  var Q = new URLSearchParams(location.search), JG = window.JG, A = window.GardenArt;

  class Boot extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() {
      Kit.play.offThread(this.game);                                                         // pictures decoded off the main thread
      Kit.play.art(this, 'art/');                                                            // the baked AVIF pictures (tools/bake-art.js), once they exist
      Kit.snd.load(this, 'audio/sfx/');
    }
    create() {
      A.atlas(this); A.butterflies(this); A.ui(this);
      this.anims.create({ key: 'jg-bird', frames: [0, 1, 2, 3].map(function (i) { return { key: 'plants', frame: 'bird' + i }; }), frameRate: 9, repeat: -1 });
      for (var h = 0; h < 5; h++) this.anims.create({ key: 'jg-bf' + h, frames: [0, 1, 2, 3].map(function (i) { return { key: 'bfly', frame: 'bf' + h + '-' + i }; }), frameRate: 14, repeat: -1 });
      this.scene.launch('Garden'); this.scene.launch('Hud');
      this.scene.stop('Boot');
      this.events.once('shutdown', function () { if (Kit.load) setTimeout(Kit.load.done, 120); });
    }
  }

  // which device the child is using last (touch, mouse or keys): the words and the cursor follow it at once
  function device() {
    var set = function (d) { if (JG.device === d) return; JG.device = d; try { Kit.play.game.events.emit('jg-device', d); } catch (e) { /* not started */ } };
    window.addEventListener('pointerdown', function (e) { set(e.pointerType === 'mouse' ? 'mouse' : 'touch'); }, { capture: true, passive: true });
    window.addEventListener('keydown', function (e) { if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length <= 6) set('keys'); }, { capture: true, passive: true });
  }

  // offline: the shared service worker keeps every file of the game after one visit
  function offline() {
    if (!('serviceWorker' in navigator) || !location.pathname.startsWith('/KidsGames/') || Q.has('nosw')) return;
    if (navigator.connection && navigator.connection.saveData) return;
    navigator.serviceWorker.register('/KidsGames/sw.js').catch(function () {});
    navigator.serviceWorker.ready.then(function (reg) { return new Promise(function (r) { setTimeout(function () { r(reg); }, 4000); }); }).then(function (reg) {
      var abs = function (p) { return new URL(p, location.href).pathname; };
      var urls = [location.pathname, 'index.html', 'game/data.js', 'game/art.js', 'game/garden.js', 'game/hud.js', 'game/main.js',
        'audio/sfx/sfx.json', 'audio/sfx/sfx.m4a', 'audio/sfx/amb-wind.m4a', 'audio/sfx/amb-river.m4a', 'audio/sfx/amb-court.m4a',
        '/KidsGames/js/kahf-bridge.js', '/KidsGames/js/vendor/phaser-4.2.1.min.js', '/KidsGames/js/kit/core.js', '/KidsGames/js/kit/sound.js', '/KidsGames/js/kit/play.js', '/KidsGames/js/kit/load.js', '/KidsGames/js/kit/praise-clips.js', 'art/baked.json'];
      var sw = reg.active || navigator.serviceWorker.controller;
      if (sw) sw.postMessage({ type: 'CACHE_URLS', urls: urls.map(abs) });
    }).catch(function () {});
  }

  if (Q.has('debug')) Kit.play.debug = {};
  Kit.play.start({ scenes: [Boot, window.JGGarden, window.JGHud], color: '#8fcf6e', msaa: false, textures: 4, rest: true });
  device();
  offline();
})();
