/* Kahf KidsGames kit: play.js
   Starts Phaser the standard way. Every Phaser game goes through Kit.play.start and nothing else creates a
   Phaser.Game. Needs js/vendor/phaser-*.min.js and js/kit/core.js loaded first.

   What it decides for every game:
   - WebGL only, no Canvas fallback. A device without WebGL gets the sorry screen (Kit.play.sorry).
   - Sharpness: the canvas has screen pixels x Kit.play.dpr() (at most 2; 1.5 on phones with 2 GB or less).
     A game with a full picture to draw can ask for less: start({ pixels: 1.6e6 }) keeps the canvas under that many
     pixels (a tablet then draws softer, never under 1), start({ sharp: 1.5 }) or Kit.play.sharp(1.5) lowers the
     most it may be (the game does this when the frame rate is low), and start({ msaa: false }) turns off the
     multisampling of the canvas (pictures need none; drawn shapes do).
   - On a phone the engine draws one texture per batch, so every change of texture is a draw call. A game whose
     pictures come from many sheets asks for more: start({ textures: 4 }) lets a batch hold four (on every device,
     so a desktop test counts the same draw calls as a phone).
   - One design space: 1920 x 1080 units, always fully visible and centred. Wider or taller screens see more
     around it (scene.view says how much), so paint backgrounds past the design space: 300 units left and right,
     200 above and below cover every phone and tablet.
   - Art is painted in design units, one texture pixel per unit (Kit.play.tex), so nothing needs a scale factor.
   - Sound is the kit's (js/kit/audio.js, natural sounds only). Phaser's own sound system is off.
   - The game pauses while the page is hidden.

   Use:
     Kit.play.start({ scenes: [Boot, Home, ...], color: '#bfe6ff' })  -> the Phaser.Game
     In a scene's create():  Kit.play.fit(this, layout)   // sets the camera; layout(view) runs now and on resize
       view = { l, r, t, b, w, h, z }  visible edges in design units (l can be negative), and the zoom
              { sl, sr, st, sb }       the same edges inside the notch and home bar (put buttons against these)
     Kit.play.tex(scene, key, w, h, paint, pad)   a picture painted once with Canvas2D: paint(ctx, w, h)
     Kit.play.exit()   leave the game: tells the app, or goes back to the games hub in a browser */
(function () {
  'use strict';
  var Kit = window.Kit = window.Kit || {};
  var W = 1920, H = 1080, game = null, most = 2, budget = 0, apply = null;

  function dpr() {
    var d = Math.min(window.devicePixelRatio || 1, most);
    if (navigator.deviceMemory && navigator.deviceMemory <= 2) d = Math.min(d, 1.5);
    if (budget) d = Math.min(d, Math.max(1, Math.sqrt(budget / Math.max(1, window.innerWidth * window.innerHeight))));
    return d;
  }
  // the most canvas pixels per screen pixel from now on (1 to 2); the canvas is resized at once. Returns what is used.
  function sharp(d) { most = Math.min(2, Math.max(1, +d || 2)); if (apply) apply(); return dpr(); }
  function size() {
    var d = dpr();
    return { w: Math.max(2, Math.round(window.innerWidth * d)), h: Math.max(2, Math.round(window.innerHeight * d)), d: d };
  }

  var probe = null;
  function safe() {
    if (!probe) {
      probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
      document.body.appendChild(probe);
    }
    var cs = getComputedStyle(probe);
    return { top: parseFloat(cs.paddingTop) || 0, right: parseFloat(cs.paddingRight) || 0, bottom: parseFloat(cs.paddingBottom) || 0, left: parseFloat(cs.paddingLeft) || 0 };
  }

  function sorry(err) {
    try { console.error('[play]', err); } catch (e) {}
    if (document.getElementById('kit-sorry')) return;
    var el = document.createElement('div');
    el.id = 'kit-sorry';
    el.style.cssText = 'position:fixed;inset:0;display:flex;flex-direction:column;gap:18px;align-items:center;justify-content:center;background:#fdf6e7;z-index:99';
    // a picture, not words: a sad cloud and a way out
    el.innerHTML = '<svg width="120" height="90" viewBox="0 0 120 90"><path d="M30 70a22 22 0 0 1 4-43 28 28 0 0 1 54 6 18 18 0 0 1 2 37z" fill="#c9d3dc"/><path d="M48 80l-4 8M62 80l-4 8M76 80l-4 8" stroke="#8fb4d8" stroke-width="5" stroke-linecap="round"/></svg>' +
      '<button id="kit-sorry-exit" style="width:72px;height:72px;border-radius:50%;border:0;background:#ef8a3c;box-shadow:0 5px 0 #c96a22"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6l-6 6 6 6"/></svg></button>';
    document.body.appendChild(el);
    document.getElementById('kit-sorry-exit').onclick = exit;
  }

  function exit() {
    if (Kit.host && Kit.host.isNative()) { Kit.host.exit(); return; }
    location.href = '/KidsGames/';
  }

  function start(o) {
    o = o || {};
    if (game) return game;
    if (!window.Phaser) { sorry('Phaser is not loaded'); return null; }
    var parent = document.getElementById('game');
    if (!parent) {
      parent = document.createElement('div'); parent.id = 'game';
      document.body.appendChild(parent);
    }
    parent.style.cssText = 'position:fixed;inset:0;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;background:' + (o.color || '#000');
    if (o.pixels) budget = o.pixels;
    if (o.sharp) most = Math.min(2, Math.max(1, +o.sharp));
    var s = size();
    var cfg = {
      type: Phaser.WEBGL,
      parent: parent,
      backgroundColor: o.color || '#000000',
      banner: false,
      disableContextMenu: true,
      scale: { mode: Phaser.Scale.NONE, width: s.w, height: s.h, zoom: 1 / s.d, autoRound: false },
      render: { antialias: true, antialiasGL: o.msaa !== false, powerPreference: 'default', failIfMajorPerformanceCaveat: false },
      input: { activePointers: 3, touch: { capture: true } },
      audio: { noAudio: true },
      fps: { smoothStep: true },
      scene: o.scenes
    };
    if (o.textures) { cfg.render.autoMobileTextures = false; cfg.render.maxTextures = o.textures; }
    if (o.physics) cfg.physics = o.physics;
    try { game = new Phaser.Game(cfg); } catch (e) { sorry(e); return null; }

    var last = s;
    function onResize() {
      var n = size();
      if (n.w === last.w && n.h === last.h) return;
      last = n;
      try {
        game.scale.resize(n.w, n.h); game.scale.setZoom(1 / n.d);
        // (at exactly one canvas pixel to a screen pixel the engine leaves the old size on the canvas's style)
        game.canvas.style.width = (n.w / n.d) + 'px'; game.canvas.style.height = (n.h / n.d) + 'px';
      } catch (e) { /* the next resize tries again */ }
    }
    apply = onResize;
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', function () { setTimeout(onResize, 250); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);

    // WebGL gone for good (not a context loss Phaser restores): say sorry instead of a black screen
    window.addEventListener('error', function (e) {
      if (e && e.message && /WebGL|context/i.test(e.message) && !(game && game.isRunning)) sorry(e.message);
    });
    if (Kit.host) Kit.host.ready();
    Kit.play.game = game;
    return game;
  }

  // Fit the scene's main camera so the 1920 x 1080 design space is centred and as large as the screen allows.
  function fit(scene, layout) {
    function run() {
      var gw = scene.scale.width, gh = scene.scale.height, cam = scene.cameras.main;
      var z = Math.min(gw / W, gh / H);
      cam.setSize(gw, gh);
      cam.setZoom(z);
      cam.centerOn(W / 2, H / 2);
      var vw = gw / z, vh = gh / z;
      var v = scene.view = { l: W / 2 - vw / 2, r: W / 2 + vw / 2, t: H / 2 - vh / 2, b: H / 2 + vh / 2, w: vw, h: vh, z: z };
      // the same edges moved in past the notch and the home bar: put buttons against these
      var sa = safe(), k = dpr() / z;
      v.sl = v.l + sa.left * k; v.sr = v.r - sa.right * k; v.st = v.t + sa.top * k; v.sb = v.b - sa.bottom * k;
      if (layout) layout.call(scene, v);
      return v;
    }
    scene.scale.on('resize', run);
    scene.events.once('shutdown', function () { scene.scale.off('resize', run); });
    return run();
  }

  // A picture painted once with Canvas2D and kept as a texture. pad adds room around it for shadows and glows;
  // the frame is the whole canvas, so place it with setOrigin and remember the pad when lining things up.
  function tex(scene, key, w, h, paint, pad) {
    var tm = scene.textures;
    if (tm.exists(key)) return key;
    pad = pad || 0;
    var c = document.createElement('canvas');
    c.width = Math.ceil(w + pad * 2); c.height = Math.ceil(h + pad * 2);
    var ctx = c.getContext('2d');
    ctx.translate(pad, pad);
    paint(ctx, w, h);
    tm.addCanvas(key, c);
    return key;
  }

  Kit.play = { W: W, H: H, start: start, fit: fit, tex: tex, exit: exit, sorry: sorry, dpr: dpr, sharp: sharp, game: null };
})();
