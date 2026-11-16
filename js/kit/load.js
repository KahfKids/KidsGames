/* Kahf KidsGames kit: load.js
   The loading screen every Phaser game shows from the first moment (docs/phaser-standard.md section 5a), lifted out of
   Helping Home so each game stops wiring it by hand.

   The page draws the picture itself, inline, before any script downloads: a <div id="kit-load"> with the game's own
   background colour and an inline SVG (no image file, no words). Its CSS reads the custom property --p (0..1) on that
   div to show how far loading is, for example  stroke-dashoffset: calc(100 * (1 - var(--p)))  on a path with
   pathLength="100". This file is loaded right after that div, WITHOUT defer (it is tiny), and moves --p:
   - it never sits still: it creeps towards 0.3 while the engine downloads;
   - Kit.play.start calls Kit.load.watch(game): from then on it follows the engine's own loaders (the Boot scene from
     0.3 to 0.6, any later scene's loading from 0.6 to 1), and only ever moves forward;
   - it leaves when a game calls Kit.load.done() (its first view is ready), or, as a safety net that also works with an
     older cached game script (GitHub Pages keeps scripts about ten minutes after a push), once a scene past Boot is
     running and no scene has loaded anything for 1.2 s.
   Use (page):  <div id="kit-load" ...>...</div><script src="/KidsGames/js/kit/load.js"></script>  */
(function () {
  'use strict';
  var Kit = window.Kit = window.Kit || {};
  var el = document.getElementById('kit-load'), shown = 0, want = 0, gone = !el, t0 = Date.now(), game = null, last = 0;
  function busy(s) { return s.load && s.load.isLoading(); }
  function draw() {
    if (gone) return;
    var v = Math.max(want, 0.3 * (1 - Math.exp(-(Date.now() - t0) / 4000)));
    if (game && game.isRunning) {
      var ss = game.scene.getScenes(true).filter(function (s) { return s.sys.settings.key !== 'KitSound'; });
      ss.forEach(function (s) {
        if (!busy(s)) return;
        last = Date.now();
        var boot = s.sys.settings.key === 'Boot';
        v = Math.max(v, (boot ? 0.3 : 0.6) + (boot ? 0.3 : 0.4) * s.load.progress);
      });
      var past = ss.some(function (s) { return s.sys.settings.key !== 'Boot'; });
      if (past && !ss.some(busy) && Date.now() - last > 1200) { done(); return; }
    }
    want = Math.max(want, v); shown += (want - shown) * 0.12;
    el.style.setProperty('--p', shown.toFixed(3));
    requestAnimationFrame(draw);
  }
  function done() {
    if (gone) return; gone = true;
    el.style.setProperty('--p', '1'); el.style.transition = 'opacity .35s'; el.style.opacity = '0'; el.style.pointerEvents = 'none';
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
  }
  if (el) requestAnimationFrame(draw);
  Kit.load = {
    watch: function (g) { game = g; last = Date.now(); },
    to: function (v) { last = Date.now(); want = Math.max(want, Math.min(1, v)); },
    done: done,
    get gone() { return gone; }
  };
})();
