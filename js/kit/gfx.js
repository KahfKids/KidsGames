/* Kahf KidsGames kit: gfx.js
   The drawing surface for 2D games (window.Kit.gfx). The standard way a game puts pictures on the screen:

   1. Make each picture once (Canvas2D, an <img>, or surface.paint) and hand it to the surface as a texture.
   2. Every frame, list what to draw: begin(), draw() ..., end().

   The surface draws that list with PixiJS on the graphics chip (WebGL): a whole frame goes out in a few calls,
   whatever the phone does with Canvas2D. Where WebGL is missing, software-only, or PixiJS did not arrive, the very
   same list is drawn with Canvas2D, so a game has one code path and still runs everywhere.

   Kit.gfx.dpr()                       pixel density to draw at: at most 2, and 1.5 on low-memory phones
   Kit.gfx.create(canvas, opts)        -> Promise of a surface. opts.force: '2d' | 'gl'. The page can add ?gfx=2d or ?gfx=gl
   Kit.gfx.canvas2d(canvas)            -> a Canvas2D surface, at once (no PixiJS)

   surface.kind                        'gl' | '2d'            surface.note   why ('gl', '2d:no-webgl', ...)
   surface.canvas                      the canvas on the page (use this one: a failed WebGL start swaps the element)
   surface.maxTex                      the longest side a texture may have, in pixels
   surface.resize(pxW, pxH)            size of the drawing buffer in device pixels (CSS size is the page's business)
   surface.texture(canvas)             -> t { w, h }. On WebGL the picture is sent to the chip NOW and the canvas memory
                                          is handed back (its width and height become 0): do not draw from it again
   surface.image(img, pxW)             -> t for a loaded <img>, made once per image (pxW: how wide it will be shown)
   surface.paint(pxW, pxH, draw)       -> t painted with Canvas2D: draw(ctx)
   surface.free(t)
   surface.begin(color)                start a frame on a background colour
   surface.draw(t, x, y, w, h, alpha)  a picture; device pixels, whole numbers keep it sharp
   surface.drawM(t, a, b, c, d, e, f, alpha)   a picture at its own pixel size through a matrix (skewed, turned)
   surface.rect(x, y, w, h, color, alpha)
   surface.multiply(color)             tint everything drawn so far in this frame (night, dusk)
   surface.end()                       show the frame
   surface.onLost(fn)                  WebGL only: the chip dropped every texture (app was in the background, memory was
                                          short). fn() must make the pictures again; old textures are already freed.

   PixiJS is pinned (js/vendor/pixi-8.22.0.min.js, MIT) and loaded from our own site only. */
(function () {
  'use strict';
  var Kit = window.Kit = window.Kit || {};
  var G = Kit.gfx = {};
  var PIXI_FILE = 'pixi-8.22.0.min.js';
  var here = (document.currentScript && document.currentScript.src) || '';
  var VENDOR = /kit\/gfx\.js/.test(here) ? here.replace(/kit\/gfx\.js.*$/, 'vendor/') : '/KidsGames/js/vendor/';

  // ---------- device tier ----------
  // Sharper than 2x costs four to nine times the pixels for little that a child sees. Phones with 2 GB or less
  // (Android reports it; iPhones do not, and they are fine) draw at 1.5x.
  G.dpr = function () {
    var d = window.devicePixelRatio || 1, cap = 2, mem = navigator.deviceMemory;
    if (mem && mem <= 2) cap = 1.5;
    return Math.min(cap, d);
  };

  // ---------- PixiJS, loaded once ----------
  // Asked for as soon as this file runs, so it comes down while the page reads the rest of its scripts. A game that
  // waits longer than WAIT for it (a very slow first visit) starts on Canvas2D instead; later visits have it saved.
  var WAIT = 8000, pixiP = null;
  function loadPixi() {
    if (window.PIXI) return Promise.resolve(window.PIXI);
    if (!pixiP) pixiP = new Promise(function (done) {
      var s = document.createElement('script'), over = false;
      var end = function (ok) { if (over) return; over = true; done(ok && window.PIXI ? window.PIXI : null); };
      s.src = VENDOR + PIXI_FILE; s.async = true;
      s.onload = function () { end(true); }; s.onerror = function () { end(false); };
      document.head.appendChild(s);
      setTimeout(function () { end(false); }, WAIT);
    });
    return pixiP;
  }

  // ---------- shared by both surfaces ----------
  function paint(s, pxW, pxH, draw) {
    var c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(pxW)); c.height = Math.max(1, Math.ceil(pxH));
    draw(c.getContext('2d'));
    return s.texture(c);
  }
  // an <img> (often an SVG) is turned into pixels once, at the size it is shown, instead of on every frame
  function imageOf(s, cache, img, pxW) {
    var t = cache.get(img), iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw || !ih) return null;
    var w = Math.max(1, Math.ceil(pxW || iw));
    if (t && t.w >= w / 1.15) return t;
    if (t) s.free(t);
    t = paint(s, w, Math.max(1, Math.round(w * ih / iw)), function (ctx) { ctx.drawImage(img, 0, 0, w, Math.max(1, Math.round(w * ih / iw))); });
    cache.set(img, t);
    return t;
  }

  // ---------- Canvas2D ----------
  function make2d(canvas, note) {
    var ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('gfx: no 2d context');
    var s = { kind: '2d', note: note || '2d', canvas: canvas, maxTex: 4096 }, imgs = new WeakMap();
    s.resize = function (w, h) { canvas.width = w; canvas.height = h; };
    s.texture = function (c) { return { w: c.width, h: c.height, src: c }; };
    s.image = function (img, pxW) { return imageOf(s, imgs, img, pxW); };
    s.paint = function (w, h, draw) { return paint(s, w, h, draw); };
    s.free = function (t) { if (t) t.src = null; };
    s.begin = function (color) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = color; ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    s.draw = function (t, x, y, w, h, alpha) {
      if (!t || !t.src) return;
      if (alpha != null && alpha !== 1) { ctx.globalAlpha = alpha; ctx.drawImage(t.src, x, y, w, h); ctx.globalAlpha = 1; }
      else ctx.drawImage(t.src, x, y, w, h);
    };
    s.drawM = function (t, a, b, c, d, e, f, alpha) {
      if (!t || !t.src) return;
      ctx.setTransform(a, b, c, d, e, f); if (alpha != null) ctx.globalAlpha = alpha;
      ctx.drawImage(t.src, 0, 0);
      ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
    };
    s.rect = function (x, y, w, h, color, alpha) {
      ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.fillStyle = color; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1;
    };
    s.multiply = function (color) {
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = color; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
    };
    s.end = function () {};
    s.onLost = function () {};
    return s;
  }

  // ---------- WebGL through PixiJS ----------
  // One list of sprites, reused frame after frame in drawing order, so the order of draw() calls is the order on screen
  // and PixiJS can send neighbours to the chip together.
  function makeGl(canvas, P) {
    var r = new P.WebGLRenderer();
    return r.init({
      canvas: canvas, width: canvas.width || 1, height: canvas.height || 1, resolution: 1, autoDensity: false,
      antialias: false, backgroundAlpha: 1, backgroundColor: 0xf2efe7, clearBeforeRender: true, hello: false
    }).then(function () {
      var gl = r.gl, stage = new P.Container(), pool = [], n = 0, shown = 0, live = new Set(), lostFns = [], lost = false;
      var bg = null, colors = {}, imgs = new WeakMap(), M = new P.Matrix(), WHITE = P.Texture.WHITE, EMPTY = P.Texture.EMPTY;
      var s = { kind: 'gl', note: 'gl', canvas: canvas, maxTex: 4096 };
      try { s.maxTex = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096); } catch (e) {}
      var num = function (c) { var v = colors[c]; if (v == null) v = colors[c] = P.Color.shared.setValue(c).toNumber(); return v; };

      s.resize = function (w, h) { r.resize(w, h, 1); };
      s.texture = function (c) {
        var source = new P.CanvasSource({ resource: c, width: c.width, height: c.height, resolution: 1 });
        var t = { w: c.width, h: c.height, tex: new P.Texture({ source: source }) };
        try { r.texture.initSource(source); } catch (e) { console.warn('gfx: upload', e); }
        live.add(t);
        try { c.width = c.height = 0; } catch (e) {}      // the chip has the picture: hand the canvas memory back
        return t;
      };
      s.image = function (img, pxW) { return imageOf(s, imgs, img, pxW); };
      s.paint = function (w, h, draw) { return paint(s, w, h, draw); };
      s.free = function (t) { if (t && t.tex) { live.delete(t); try { t.tex.destroy(true); } catch (e) {} t.tex = null; } };

      function next(tex) {
        var sp = pool[n];
        if (!sp) { sp = new P.Sprite(tex); pool.push(sp); stage.addChild(sp); }
        else {
          if (sp.texture !== tex) sp.texture = tex;
          if (sp._fx) { sp.tint = 0xffffff; sp.blendMode = 'inherit'; sp._fx = 0; }
          if (sp._m) { sp.skew.set(0, 0); sp.rotation = 0; sp._m = 0; }
          sp.visible = true;
        }
        n++;
        return sp;
      }
      s.begin = function (color) { if (color !== bg) { bg = color; r.background.color = num(color); } n = 0; };
      s.draw = function (t, x, y, w, h, alpha) {
        if (!t || !t.tex) return;
        var sp = next(t.tex); sp.position.set(x, y); sp.scale.set(w / t.w, h / t.h); sp.alpha = alpha == null ? 1 : alpha;
      };
      s.drawM = function (t, a, b, c, d, e, f, alpha) {
        if (!t || !t.tex) return;
        var sp = next(t.tex); sp.setFromMatrix(M.set(a, b, c, d, e, f)); sp._m = 1; sp.alpha = alpha == null ? 1 : alpha;
      };
      s.rect = function (x, y, w, h, color, alpha) {
        var sp = next(WHITE); sp.position.set(x, y); sp.scale.set(w / WHITE.width, h / WHITE.height);
        sp.tint = num(color); sp.alpha = alpha == null ? 1 : alpha; sp._fx = 1;
      };
      s.multiply = function (color) {
        var sp = next(WHITE); sp.position.set(0, 0); sp.scale.set(canvas.width / WHITE.width, canvas.height / WHITE.height);
        sp.tint = num(color); sp.alpha = 1; sp.blendMode = 'multiply'; sp._fx = 1;
      };
      s.end = function () {
        for (var i = n; i < shown; i++) { var sp = pool[i]; sp.visible = false; sp.texture = EMPTY; }
        shown = n;
        if (!lost) r.render(stage);
      };
      s.onLost = function (fn) { lostFns.push(fn); };
      // The chip can drop everything (app sent to the background, memory short). PixiJS brings the context back;
      // the pictures were handed over and are gone, so the game makes them again.
      canvas.addEventListener('webglcontextlost', function () { lost = true; });
      canvas.addEventListener('webglcontextrestored', function () {
        lost = false;
        live.forEach(function (t) { try { t.tex.destroy(true); } catch (e) {} t.tex = null; });
        live.clear(); imgs = new WeakMap();
        for (var i = 0; i < pool.length; i++) { pool[i].visible = false; pool[i].texture = EMPTY; }
        shown = 0;
        lostFns.forEach(function (fn) { try { fn(); } catch (e) { console.warn('gfx: onLost', e); } });
      });
      s._pixi = { renderer: r, stage: stage };            // for debugging in the console
      return s;
    });
  }

  // a canvas that was asked for WebGL cannot give a 2D context any more: swap in a clean copy of the element
  function fresh(canvas) {
    var c = canvas.cloneNode(false);
    if (canvas.parentNode) canvas.parentNode.replaceChild(c, canvas);
    return c;
  }

  var asked2d = /[?&]gfx=2d\b/.test(location.search);
  if (!asked2d) loadPixi();
  G.canvas2d = function (canvas) { return make2d(canvas, '2d'); };
  G.create = function (canvas, opts) {
    opts = opts || {};
    var want = opts.force || (asked2d ? '2d' : (/[?&]gfx=gl\b/.test(location.search) ? 'gl' : ''));
    if (want === '2d') return Promise.resolve(make2d(canvas, '2d:asked'));
    return loadPixi().then(function (P) {
      if (!P) return make2d(canvas, '2d:no-pixi');
      var ok = false;
      // a software WebGL (no real graphics chip behind it) is slower than Canvas2D: only take it when asked to
      try { ok = P.isWebGLSupported(want !== 'gl'); } catch (e) {}
      if (!ok) return make2d(canvas, '2d:no-webgl');
      return makeGl(canvas, P).catch(function (e) {
        console.warn('gfx: WebGL did not start, drawing with Canvas2D', e);
        return make2d(fresh(canvas), '2d:gl-failed');
      });
    });
  };
})();
