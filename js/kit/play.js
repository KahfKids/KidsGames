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
   - Sound is Phaser's own (this.sound, its loader and cache), with js/kit/sound.js (Kit.snd) on top for what Phaser
     has no word for: categories, ducking under a voice, take variation, a cap on overlapping sounds. Natural sounds
     only, no music. (Phaser has no setting for screen sharpness, so the canvas size and zoom below are the kit's.)
   - The game pauses while the page is hidden.

   Use:
     Kit.play.start({ scenes: [Boot, Home, ...], color: '#bfe6ff' })  -> the Phaser.Game
     In a scene's create():  Kit.play.fit(this, layout)   // sets the camera; layout(view) runs now and on resize
       view = { l, r, t, b, w, h, z }  visible edges in design units (l can be negative), and the zoom
              { sl, sr, st, sb }       the same edges inside the notch and home bar (put buttons against these)
     Kit.play.tex(scene, key, w, h, paint, pad)   a picture painted once with Canvas2D: paint(ctx, w, h)
     Kit.play.exit()   leave the game: tells the app, or goes back to the games hub in a browser
     start({ rest: true })   board, puzzle and card games: the loop sleeps while nothing moves (see rest below)
     start({ rest: { ms: 90 } })   the same checks, with a shorter quiet delay (default 700 ms)
     start({ rest: { finger: false } })   a finger held still on the screen does not keep the loop awake (a game that
                                          times a held press must not use this) */
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
      '<button id="kit-sorry-exit" style="width:72px;height:72px;border-radius:50%;border:0;background:#ef8a3c;box-shadow:0 5px 0 #c96a22"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3.5H5v17h6M10 12h10.5M16.5 8l4 4-4 4"/></svg></button>';
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
      audio: { disableWebAudio: false },
      fps: { smoothStep: true },
      scene: o.scenes
    };
    if (o.textures) { cfg.render.autoMobileTextures = false; cfg.render.maxTextures = o.textures; }
    if (o.mipmap) cfg.render.mipmapFilter = o.mipmap === true ? 'LINEAR_MIPMAP_LINEAR' : o.mipmap;   // pictures shown much smaller than painted
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
    if (Kit.snd) Kit.snd.init(game);
    if (Kit.load) Kit.load.watch(game);                  // the page's loading screen follows the engine's loaders (js/kit/load.js)
    if (Kit.host) Kit.host.ready();
    if (o.rest) rest(game, o.rest);
    // No frame cap: the engine's own limiter (setFPSLimit) does not keep an even rhythm on a 120 Hz screen (measured
    // 2026-11-16 in Breakout at a limit of 64: frames 8, 16 and 19 ms apart), which shows as jitter in anything that moves.
    Kit.play.game = game;
    return game;
  }

  // Rest: start({ rest: true }) for a game where nothing moves between the child's moves (board, puzzle, cards,
  // drawing). When nothing has moved for a moment the engine's loop sleeps (game.loop.sleep, the engine's own), so a
  // phone does no work at all while the child thinks; the last frame stays on screen. Any touch, key, resize or
  // Kit.play.wake() wakes it at once, before the engine handles the touch. "Moving" is anything the engine is doing:
  // a playing tween, a pending timer, a playing animation, a live particle emitter, a camera effect or follow, running
  // physics, a loader, a spoken voice that has not ended (its end event needs the loop). A game that changes the screen from
  // somewhere else (a network reply, a DOM event) calls Kit.play.wake(). Kit.play.resting says whether it sleeps.
  function rest(g, o) {
    var REST_MS = o && typeof o.ms === 'number' && isFinite(o.ms) ? Math.max(0, o.ms) : 700;
    var calm = performance.now() + 1500, down = 0;   // never in the first moments after start
    function cam(c) {
      return c._follow || c.shakeEffect.isRunning || c.fadeEffect.isRunning || c.flashEffect.isRunning ||
        c.panEffect.isRunning || c.zoomEffect.isRunning || (c.rotateToEffect && c.rotateToEffect.isRunning);
    }
    function busy(s) {
      var sys = s.sys, i, a;
      if (!sys.isActive()) return false;
      if (s.load && s.load.isLoading()) return true;
      a = s.tweens && s.tweens.tweens;
      if (a) for (i = 0; i < a.length; i++) if (a[i].isPlaying()) return true;
      if (s.time && (s.time._pendingInsertion.length || s.time._active.some(function (e) { return !e.paused; }))) return true;
      if (s.physics && s.physics.world && !s.physics.world.isPaused) return true;
      if (s.matter && s.matter.world && s.matter.world.enabled) return true;
      a = s.cameras && s.cameras.cameras;
      if (a) for (i = 0; i < a.length; i++) if (cam(a[i])) return true;
      a = sys.updateList.getActive();
      for (i = 0; i < a.length; i++) {
        var o = a[i];
        if (o.anims && o.anims.isPlaying) return true;
        if (o.getAliveParticleCount && (o.emitting || o.getAliveParticleCount())) return true;
      }
      return false;
    }
    function still() {
      if (down && !(o && o.finger === false)) return false;
      // a spoken voice holds the loop (its end resolves a promise and lifts the ducking); a short effect does not: the
      // audio system plays it to the end on its own, and the engine tidies it up the next time the loop runs
      var a = g.sound && g.sound.sounds, i;
      if (a) for (i = 0; i < a.length; i++) if (a[i].isPlaying && !a[i].loop && (a[i].kitCat === 'voice' || !g.sound.context)) return false;   // (HTML5 audio stops clips from the loop)
      if (g.scene._queue && g.scene._queue.length) return false;      // scenes asked to start, stop, launch: not done yet
      a = g.scene.scenes;
      for (i = 0; i < a.length; i++) {
        var st = a[i].sys.settings.status;                              // a scene still starting (init, loading, creating)
        if (st > 0 && st < 5) return false;
        if (busy(a[i])) return false;
      }
      return true;
    }
    g.events.on('postrender', function () {
      var now = performance.now();
      if (!still()) { calm = now; return; }
      if (now - calm > REST_MS) { Kit.play.resting = true; g.loop.sleep(); }
    });
    function wake() {
      calm = performance.now();
      if (Kit.play.resting && g.loop && !g.loop.running && !document.hidden) { Kit.play.resting = false; g.loop.wake(true); }
    }
    Kit.play.wake = wake;
    ['pointerdown', 'pointermove', 'wheel', 'keydown', 'keyup', 'resize'].forEach(function (n) {
      window.addEventListener(n, function (e) { if (n === 'pointerdown') down++; wake(); }, { capture: true, passive: true });
    });
    ['pointerup', 'pointercancel'].forEach(function (n) {
      window.addEventListener(n, function () { down = Math.max(0, down - 1); wake(); }, { capture: true, passive: true });
    });
    document.addEventListener('visibilitychange', wake);
  }

  // Fit the scene's main camera so the 1920 x 1080 design space is centred and as large as the screen allows (as Spider IK and
  // Helping Home: the whole scene in view). Each game decides the rest for itself; the kit forces no interface size:
  //   o.w, o.h (optional, a game's own choice): only this middle part of the design space must stay in view, so a game whose
  //     play area is narrower than 1920 may ask, e.g. fit(this, layout, { w: 1280 }), to zoom in on an upright phone.
  //     (o may also be a function of nothing that returns { w, h }, read on every resize.)
  //   view.pt: design units per screen point at this zoom, a measurement for a game that sizes its buttons in points
  //     (e.g. a 48-point button is 48 * view.pt units wide). view.u is always 1 (left for games that still multiply by it).
  function fit(scene, layout, o) {
    function run() {
      var q = typeof o === 'function' ? o() : o, need = { w: (q && q.w) || W, h: (q && q.h) || H };
      var gw = scene.scale.width, gh = scene.scale.height, cam = scene.cameras.main;
      var z = Math.min(gw / need.w, gh / need.h);
      cam.setSize(gw, gh);
      cam.setZoom(z);
      cam.centerOn(W / 2, H / 2);
      var vw = gw / z, vh = gh / z;
      var v = scene.view = { l: W / 2 - vw / 2, r: W / 2 + vw / 2, t: H / 2 - vh / 2, b: H / 2 + vh / 2, w: vw, h: vh, z: z, u: 1, pt: 1 / ((scene.scale.zoom || 1) * z) };      // (scale.zoom: CSS px per canvas px)
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
    pad = pad || 0;
    if (tm.exists(key)) {
      var b = baked[key];                                           // a baked picture is used only if it is the same size
      if (!b || (b.w === Math.ceil(w + pad * 2) && b.h === Math.ceil(h + pad * 2))) return key;
      tm.remove(key);
    }
    // A plain image texture made from the canvas (addImage), not addCanvas: addCanvas builds the engine's CanvasTexture, which
    // keeps a second full copy of every pixel (getImageData, about 11 MB for a 2000 x 1300 sheet) for pixel reads no game
    // here does. refresh() still works: it uploads the canvas again after a game paints more on it (getSourceImage()).
    var cv = document.createElement('canvas');
    cv.width = Math.ceil(w + pad * 2); cv.height = Math.ceil(h + pad * 2);
    var c = cv.getContext('2d');
    c.translate(pad, pad);
    paint(c, w, h);
    var t = tm.addImage(key, cv);
    if (t) t.refresh = function () { this.source[0].update(); return this; };
    if (BAKE) Kit.play.bakeOut[key] = cv;                           // tools/bake-art.js reads these
    return key;
  }

  // ---------- art files ----------
  // Pictures that are the same on every screen are baked once by tools/bake-art.js from the game's own painters into
  // optimized AVIF files (WebP copies for old WebViews), listed in <base>baked.json. Kit.play.art(this, 'art/') in Boot's
  // preload queues them on the engine's loader (decoded off the main thread with Kit.play.offThread), so tex() finds
  // them ready and paints nothing; anything not baked, or baked at another size, is still painted at once. The AVIF test
  // runs once when this file loads (an engine loader only tests WebP).
  var EXT = '.webp', baked = {}, BAKE = /[?&]bake\b/.test(location.search);
  var formatReady = new Promise(function (resolve) {
    try { var im = new Image(); im.onload = function () { if (im.width > 0) EXT = '.avif'; resolve(); }; im.onerror = function () { resolve(); }; im.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUEAAAGGbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAACxpbG9jAAAAAEQAAAIAAQAAAAEAAAG/AAAAIgACAAAAAQAAAa4AAAARAAAAQmlpbmYAAAAAAAIAAAAaaW5mZQIAAAAAAQAAYXYwMUNvbG9yAAAAABppbmZlAgAAAAACAABhdjAxQWxwaGEAAAAAGmlyZWYAAAAAAAAADmF1eGwAAgABAAEAAADDaXBycAAAAJ1pcGNvAAAAFGlzcGUAAAAAAAAAAgAAAAIAAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBIAAAAAAAE2NvbHJuY2x4AAEAAgAGgAAAAA5waXhpAAAAAAEIAAAADGF2MUOBABwAAAAAOGF1eEMAAAAAdXJuOm1wZWc6bXBlZ0I6Y2ljcDpzeXN0ZW1zOmF1eGlsaWFyeTphbHBoYQAAAAAeaXBtYQAAAAAAAAACAAEEAQKDBAACBAEFhgcAAAA7bWRhdBIACgQYADYVMgcbAGmhABCgEgAKBzgANpAQIGkyFRxCYuTpppphYAAAkDWOMsJ4xHoy0A=='; } catch (e) { resolve(); }
  });
  // o.later (a RegExp, optional): pictures whose names match are not loaded at Boot (e.g. /^w[0-9]-/ for each world);
  // load them when needed with Kit.play.artNeed(scene, /^w2-/, done). The offline list still gets every picture in the supported format.
  var artBase = '';
  function art(scene, base, o) {
    if (BAKE) return;
    artBase = base;
    var L = scene.load, key = 'kit-baked-' + base, later = o && o.later;
    // Keep Boot pending until the local format probe settles. A cached manifest can otherwise beat the probe,
    // selecting WebP for Boot and AVIF for a later world, while offline storage holds only one of them.
    var gate = new Phaser.Loader.File(L, { type: 'kit-art-format', key: key + '-format' });
    gate.load = function () {
      var file = this;
      formatReady.then(function () { L.json(key, base + 'baked.json'); file.state = Phaser.Loader.FILE_LOADED; L.nextFile(file, true); });
    };
    L.addFile(gate);
    L.once('filecomplete-json-' + key, function (k, t, data) {
      var urls = [new URL(base + 'baked.json', location.href).href];
      Object.keys(data || {}).forEach(function (name) {
        var d = data[name]; baked[name] = d;
        if (!scene.textures.exists(name) && !(later && later.test(name))) L.image(name, base + d.f + EXT);
        urls.push(new URL(base + d.f + EXT, location.href).href);
      });
      // On the first visit Boot can finish before the new worker controls this page. Wait for its active
      // registration, otherwise even the starting world's pictures are missing when the child returns offline.
      try {
        if (!/[?&]nosw\b/.test(location.search) && navigator.serviceWorker &&
            !(navigator.connection && navigator.connection.saveData)) {
          navigator.serviceWorker.ready.then(function (reg) {
            var sw = reg.active || navigator.serviceWorker.controller;
            if (sw) sw.postMessage({ type: 'CACHE_URLS', urls: urls });
          }).catch(function () {});
        }
      } catch (e) { /* storage may be unavailable in an embedded page */ }
    });
  }

  // Pictures decoded off the main thread (the engine's loader decodes on it, which stalls a frame on a phone for each
  // big picture). The loader's image file also asks the browser for a decoded copy (createImageBitmap, on another
  // thread); the upload to the graphics chip then uses that copy. Lifted from Helping Home (game.js offThread), which
  // keeps its own copy until it is next released. Call once in Boot's preload: Kit.play.offThread(this.game).
  function offThread(g) {
    var gl = g.renderer && g.renderer.gl, IF = Phaser.Loader.FileTypes.ImageFile.prototype;
    if (!gl || !window.createImageBitmap || IF.kitDecode || IF.lifeDecode) return; IF.kitDecode = true;
    var texImage = gl.texImage2D, own = IF.onProcess, how = null;
    gl.texImage2D = function () {
      var a = arguments, im = a[a.length - 1], b = im && im._bmp;
      if (!b) { if (!how && im instanceof HTMLImageElement) how = { imageOrientation: gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL) ? 'flipY' : 'none', premultiplyAlpha: gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL) ? 'premultiply' : 'none' }; return texImage.apply(gl, a); }
      im._bmp = null; a[a.length - 1] = b;
      var flip = gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL); if (flip) gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);   // (the copy is already the right way up)
      try { texImage.apply(gl, a); } catch (e) { a[a.length - 1] = im; if (flip) gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); b.close(); return texImage.apply(gl, a); }
      if (flip) gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); b.close();
    };
    IF.onProcess = function () {
      var self = this, blob = this.xhrLoader && this.xhrLoader.response;
      if (how && blob instanceof Blob) {                                   // ready when both the <img> and the decoded copy are
        var done = this.onProcessComplete, n = 2, bmp = null;
        this.onProcessComplete = function () { if (--n) return; if (bmp) self.data._bmp = bmp; self.onProcessComplete = done; done.call(self); };
        createImageBitmap(blob, how).then(function (b) { bmp = b; self.onProcessComplete(); }, function () { self.onProcessComplete(); });
      }
      own.call(this);
    };
  }

  // The way out of a game, the same in every game (owner, 2026-11-16: "instead of back icon it should be exit as it
  // exits the game. all game"): a door frame with an arrow leaving it. Paints into a Canvas2D context, e.g. inside
  // Kit.play.tex: exitIcon(ctx, size, '#fff') draws it in a size x size box; lw is the line width in the 24-unit grid.
  function exitIcon(c, size, color, lw) {
    var k = size / 24;
    c.save(); c.scale(k, k);
    c.strokeStyle = color || '#ffffff'; c.lineWidth = lw || 2.6; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(11, 3.5); c.lineTo(5, 3.5); c.lineTo(5, 20.5); c.lineTo(11, 20.5); c.stroke();    // the door
    c.beginPath(); c.moveTo(10, 12); c.lineTo(20.5, 12); c.moveTo(16.5, 8); c.lineTo(20.5, 12); c.lineTo(16.5, 16); c.stroke();   // going out
    c.restore();
  }

  // now and then: ambient life (a breeze, a bird, a shooting star) every min..max ms, for any game. A browser timer, so
  // in rest mode it does not hold the loop awake in between (it wakes the loop when it fires); skipped while the page is
  // hidden or while `scene` (optional) is paused or asleep. Returns a stop function; it also stops on the scene's shutdown.
  function every(min, max, fn, scene) {
    var t = 0, on = true;
    function next() {
      if (!on) return;
      t = setTimeout(function () {
        if (on && !document.hidden && !(scene && !scene.sys.isActive())) { Kit.play.wake(); try { fn(); } catch (e) {} }
        next();
      }, min + Math.random() * (max - min));
    }
    function stop() { on = false; clearTimeout(t); }
    next();
    if (scene) scene.events.once('shutdown', stop);
    return stop;
  }

  // load the baked pictures matching re now (a world being entered); done() runs when they are ready (at once if they are)
  function artNeed(scene, re, done) {
    var L = scene.load, n = 0;
    Object.keys(baked).forEach(function (name) {
      if (re.test(name) && !scene.textures.exists(name)) { L.image(name, artBase + baked[name].f + EXT); n++; }
    });
    if (!n) { if (done) done(); return; }
    if (done) L.once('complete', function () { done(); });
    L.start();
  }

  Kit.play = { W: W, artNeed: artNeed, exitIcon: exitIcon, art: art, ext: function () { return EXT; }, bakeOut: {}, H: H, start: start, fit: fit, tex: tex, exit: exit, sorry: sorry, dpr: dpr, sharp: sharp, offThread: offThread, wake: function () {}, every: every, resting: false, game: null };
})();
