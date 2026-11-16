/* Colouring Book: thumb.js
   The small pictures of the page picker and the saved pictures: each page as the child left it. They are painted once
   (game/model.js thumb(): the page's saved actions on a small canvas), a few per frame within a time budget so the
   screen never stalls, and given to the engine as a texture (textures.addCanvas). A picture shows its blank paper
   until its turn. Freed when the screen closes. Nothing is painted per frame. */
(function () {
  'use strict';
  var MD = window.CBModel, n = 0;
  window.CBThumb = {
    // a job: { img (Phaser Image shown now), def, ops, px }. Returns { stop(), free() }.
    run: function (scene, jobs) {
      var keys = [], queue = jobs.slice(), live = true;
      function step() {
        if (!live) return;
        var t0 = performance.now();
        while (queue.length && performance.now() - t0 < 8) {
          var j = queue.shift();
          if (!j.img.active) continue;
          var key = 'th' + (n++);
          scene.textures.addCanvas(key, MD.thumb(j.def, j.ops, j.px)); keys.push(key);
          j.img.setTexture(key).setDisplaySize(j.size, j.size);
        }
        if (!queue.length) scene.events.off('update', step);
      }
      scene.events.on('update', step);
      return {
        free: function () {
          live = false; scene.events.off('update', step);
          keys.forEach(function (k) { if (scene.textures.exists(k)) scene.textures.remove(k); });
          keys = [];
        }
      };
    }
  };
})();
