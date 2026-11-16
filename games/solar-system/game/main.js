/* Solar System: the Boot scene, offline, and Kit.play.start.
   Saved progress is the old game's (common.js: key 'kahf-solar-system', shape unchanged). Boot loads the pictures
   (art/, made by tools/bake.js) and the sounds (audio/sfx), then starts the sky, the space scene and the interface. */
(function () {
  'use strict';
  var Q = new URLSearchParams(location.search), IDS = SolarBodies.list.map(function (b) { return b.id; });

  class Boot extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() {
      var gl = this.game.renderer.gl;
      // the engine mipmaps every power-of-two picture once it is told how: this is what keeps tiny spinning planets
      // from shimmering (the surfaces and the sky are powers of two on purpose)
      this.game.renderer.mipmapFilter = gl.LINEAR_MIPMAP_LINEAR;
      Kit.play.offThread(this.game);
      Kit.play.art(this, 'art/');                          // the painted shapes, baked (tools/bake-art.js); tex() then paints nothing
      Kit.snd.load(this, 'audio/sfx/');
      SolArt.queue(this, IDS);
    }
    create() {
      // the sky's tile sprites wrap their picture in the shader, which leaves a thin line at the wrap when the picture is
      // mipmapped (the planets' pictures are, on purpose); the sky is never shrunk, so it keeps the plain filter
      var gl = this.game.renderer.gl;
      ['sky', 'sky-faint', 'sky-bright'].forEach(function (k, i, a, me) {
        var src = this.textures.get(k).source[0], g = src.glTexture;
        g.update(src.image, src.width, src.height, g.flipY, g.wrapS, g.wrapT, gl.LINEAR, gl.LINEAR, g.format);
      }, this);
      SolArt.paint(this);
      this.scene.launch('Sky'); this.scene.launch('Space'); this.scene.launch('Hud');
      this.scene.stop('Boot');
    }
  }

  // offline: the shared service worker keeps every file of the game after one visit
  function offline() {
    if (!('serviceWorker' in navigator) || !location.pathname.startsWith('/KidsGames/') || Q.has('nosw')) return;
    if (navigator.connection && navigator.connection.saveData) return;
    navigator.serviceWorker.register('/KidsGames/sw.js').catch(function () {});
    navigator.serviceWorker.ready.then(function (reg) { return new Promise(function (r) { setTimeout(function () { r(reg); }, 4000); }); }).then(function (reg) {
      var abs = function (p) { return new URL(p, location.href).pathname; };
      var ext = SolArt.ext(), urls = [location.pathname, 'index.html', 'game/bodies.js', 'game/levels.js', 'game/common.js', 'game/art.js', 'game/planet.js', 'game/sky.js', 'game/space.js', 'game/hud.js', 'game/main.js',
        'audio/sfx/sfx.json', 'audio/sfx/sfx.m4a', 'art/mask-earth.webp', 'art/sky' + ext, 'art/sky-faint' + ext, 'art/sky-bright' + ext, 'art/belt' + ext,
        '/KidsGames/js/kahf-bridge.js', '/KidsGames/js/vendor/phaser-4.2.1.min.js', '/KidsGames/js/kit/core.js', '/KidsGames/js/kit/sound.js', '/KidsGames/js/kit/play.js', '/KidsGames/js/kit/load.js', '/KidsGames/js/kit/praise-clips.js'];
      IDS.forEach(function (id) { urls.push('art/tex-' + id + ext); });
      var sw = reg.active || navigator.serviceWorker.controller;
      if (sw) sw.postMessage({ type: 'CACHE_URLS', urls: urls.map(abs) });
    }).catch(function () {});
  }

  if (Q.has('debug')) Kit.play.debug = {};
  Kit.play.start({ scenes: [Boot, SolarSky, SolarSpace, SolarHud], color: '#060718', msaa: false, textures: 8 });
  offline();
})();
