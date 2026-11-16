/* Spider IK: the Boot scene, saved progress, offline, and Kit.play.start.
   Saved progress (unchanged shape, key 'kahf-spider-ik'): { cur: level to continue, max: highest unlocked, won }. */
(function () {
  'use strict';
  var LEVELS = 21, KEY = 'kahf-spider-ik', Q = new URLSearchParams(location.search);
  var lv = function (n) { return Math.max(1, Math.min(LEVELS, n | 0 || 1)); };
  var prog = (function () { try { var o = JSON.parse(localStorage.getItem(KEY)) || {}, max = lv(o.max); return { cur: Math.min(lv(o.cur), max), max: max, won: !!o.won }; } catch (e) { return { cur: 1, max: 1, won: false }; } })();
  var persist = function () { try { localStorage.setItem(KEY, JSON.stringify(prog)); } catch (e) { /* private mode */ } };
  window.SpSave = { prog: prog, persist: persist, done: function (n) { if (n < LEVELS) { prog.max = Math.max(prog.max, n + 1); prog.cur = n + 1; } else { prog.won = true; prog.cur = 1; } persist(); } };

  class Boot extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() {
      if (!Q.has('img')) Kit.play.offThread(this.game);                          // big pictures decoded off the main thread
      Kit.snd.load(this, 'audio/sfx/');
      this.load.json('shapes', 'levels/shapes.json');
      // the pictures every level uses, rasterised once for this screen (SpArt.queue); spinners load per level
      var q = function (k, size) { SpArt.queue(this, k, size); }.bind(this);
      for (var i = 0; i < 14; i++) q('orb' + i, 75);
      for (i = 0; i < 5; i++) q('elec' + i, 60);
      q('portal0', 60); q('portal1', 60); q('tele0', 66); q('costume3', 120); q('costume4', 50); q('costume5', 50);
      // story cards, sized for this screen's design space (Kit.play.fit: design units per card pixel x canvas pixels)
      var gw = this.scale.width, gh = this.scale.height, z = Math.min(gw / 1920, gh / 1080), u = Math.min(gw / z / 480, gh / z / 360);
      var C = SpArt.D.CARDS;
      Object.keys(C).forEach(function (k) { this.load.svg('card-' + k, SpArt.url(C[k].s), { scale: Math.max(0.5, (k === 'ring' ? 0.6 : 0.96) * u * z) }); }, this);
    }
    create() {
      var A = SpArt.A, self = this;
      // each picture turns round its own Scratch centre: a pivot on its frame, which animations keep frame by frame
      Object.keys(A).forEach(function (k) { if (!self.textures.exists(k)) return; var f = self.textures.get(k).get(); f.customPivot = true; f.pivotX = A[k].x / A[k].w; f.pivotY = A[k].y / A[k].h; });
      var orb = [0, 1, 0, 1, 4, 5, 4, 5, 8, 9, 8, 9, 12, 13].map(function (i) { return { key: 'orb' + i }; });     // the old frame order (frame & 13)
      this.anims.create({ key: 'orb', frames: orb, frameRate: 15, repeat: -1 });
      this.anims.create({ key: 'elec', frames: [0, 1, 2, 3, 4].map(function (i) { return { key: 'elec' + i }; }), frameRate: 15, repeat: -1 });
      SpArt.paint(this);
      this.registry.set('in', { ax: 0, ay: 0, jump: 0, restart: 0 });
      this.scene.launch('Hud');
      this.scene.start('Cave', { n: Q.has('level') ? lv(+Q.get('level')) : prog.cur });
      this.scene.bringToTop('Hud');
    }
  }

  // offline: the shared service worker keeps every file of the game after one visit (all 21 levels, not only those played)
  function offline() {
    if (!('serviceWorker' in navigator) || !location.pathname.startsWith('/KidsGames/') || Q.has('nosw')) return;
    if (navigator.connection && navigator.connection.saveData) return;
    navigator.serviceWorker.register('/KidsGames/sw.js').catch(function () {});
    navigator.serviceWorker.ready.then(function (reg) { return new Promise(function (r) { setTimeout(function () { r(reg); }, 4000); }); }).then(function (reg) {
      var abs = function (p) { return new URL(p, location.href).pathname; };
      var urls = [location.pathname, 'index.html', 'js/assets.js', 'game/art.js', 'game/cave.js', 'game/hud.js', 'game/main.js', 'levels/shapes.json',
        'audio/sfx/sfx.json', 'audio/sfx/sfx.m4a', 'audio/sfx/amb-cave.m4a', 'audio/sfx/hum.m4a',
        '/KidsGames/js/kahf-bridge.js', '/KidsGames/js/vendor/phaser-4.2.1.min.js', '/KidsGames/js/kit/core.js', '/KidsGames/js/kit/sound.js', '/KidsGames/js/kit/play.js', '/KidsGames/js/kit/load.js'];
      for (var n = 1; n <= LEVELS; n++) ['under', 'main', 'fore'].forEach(function (k) { urls.push('levels/' + k + '-' + n + '.webp'); });
      var sw = reg.active || navigator.serviceWorker.controller;
      if (sw) sw.postMessage({ type: 'CACHE_URLS', urls: urls.map(abs) });
    }).catch(function () {});
  }

  if (Q.has('debug')) Kit.play.debug = {};
  Kit.play.start({
    scenes: [Boot, SpCave, SpHud], color: '#0c1b1e', msaa: false, textures: 8
  });
  offline();
})();
