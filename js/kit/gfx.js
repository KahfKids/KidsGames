/* Kahf KidsGames kit: gfx.js
   PixiJS for every 2D game (window.Kit.gfx). PixiJS is the renderer: there is no second drawing path and no
   Canvas2D fallback. This file starts PixiJS the same way for every game (WebGL renderer, pixel density, lost
   context, loading) and adds a few helpers. A game then uses PixiJS itself: Container, Sprite, Texture, Graphics.
   Rules and the performance guide: docs/game-standard.md, docs/pixi-performance.md.

   Kit.gfx.dpr()                 pixel density to draw at: at most 2, and 1.5 on low-memory phones
   Kit.gfx.create(canvas, opts)  -> Promise of a surface. Rejects with an Error whose .code is 'no-pixi' (PixiJS did not
                                    arrive), 'no-webgl' (this phone has no WebGL) or 'gl-failed' (WebGL did not start).
                                    opts.transparent: the page shows through where nothing is drawn (a figure on a
                                    page of words and buttons). A full-screen game leaves it off: opaque is faster.
   Kit.gfx.sorry(error)          a plain "could not start" screen with a try-again button, for that rejection
   Kit.gfx.stage(canvas, onResize) -> Promise of st { surface, pen, canvas, w, h, dpr, safe, fit }: a full-screen
                                    game. The canvas follows the screen; st.pen draws the frame (js/kit/pen.js).

   surface.PIXI                  the PixiJS namespace          surface.renderer   the PIXI.WebGLRenderer
   surface.stage                 the root PIXI.Container: add your scene here
   surface.canvas                the canvas on the page        surface.note       'webgl2' | 'webgl1'
   surface.maxTex                the longest side a texture may have, in pixels
   surface.resize(pxW, pxH)      size of the drawing buffer in device pixels (the stage is in device pixels;
                                    CSS size is the page's business)
   surface.render()              draw the stage now. Call it only when something changed.
   surface.texture(canvas)       -> t { w, h, tex }: a PIXI.Texture made from a canvas, sent to the graphics chip NOW;
                                    the canvas memory is handed back (its width and height become 0), so never draw
                                    from that canvas again
   surface.image(img, pxW)       -> t for a loaded <img>, made once per image (pxW: how wide it will be shown)
   surface.paint(pxW, pxH, draw) -> t painted once with Canvas2D: draw(ctx). Canvas2D only ever makes pictures.
   surface.free(t)               destroy a texture made here
   surface.onLost(fn)            the graphics chip dropped every texture (the app was in the background, memory was
                                    short). Textures made here are already freed: fn() makes the pictures again.

   The frame list, for a game that decides its drawing order every frame (Helping Home): a pool of PIXI.Sprite on
   the stage, reused in order, so the order of the calls is the order on screen.
   surface.begin(color)                         start a frame on a background colour
   surface.draw(t, x, y, w, h, alpha)           a picture; device pixels, whole numbers keep it sharp
   surface.drawM(t, a, b, c, d, e, f, alpha)    a picture at its own pixel size through a matrix (skewed, turned)
   surface.rect(x, y, w, h, color, alpha)
   surface.multiply(color)                      tint everything drawn so far in this frame (night, dusk)
   surface.end()                                hide what is left of the pool and render

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
  // Asked for as soon as this file runs, so it comes down while the page reads the rest of its scripts.
  var WAIT = 20000, pixiP = null;
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
  loadPixi();

  function fail(code, cause) { var e = new Error('gfx: ' + code); e.code = code; e.cause = cause; return e; }

  function make(canvas, P, opts) {
    var r = new P.WebGLRenderer();
    // antialias off and an opaque canvas: PixiJS's own advice for phones (sprites do not need it)
    return r.init({
      canvas: canvas, width: canvas.width || 1, height: canvas.height || 1, resolution: 1, autoDensity: false,
      // a see-through canvas is cleared to black at alpha 0: any colour there would be added to the page behind
      antialias: false, backgroundAlpha: opts.transparent ? 0 : 1, backgroundColor: opts.transparent ? 0x000000 : 0xf2efe7, clearBeforeRender: true, hello: false
    }).then(function () {
      var stage = new P.Container(), pool = [], n = 0, shown = 0, live = new Set(), lostFns = [], lost = false;
      var bg = null, colors = {}, imgs = new WeakMap(), M = new P.Matrix(), WHITE = P.Texture.WHITE, EMPTY = P.Texture.EMPTY;
      var s = { PIXI: P, renderer: r, stage: stage, canvas: canvas, maxTex: 4096, note: 'webgl' + ((r.context && r.context.webGLVersion) || '') };
      try { s.maxTex = Math.min(4096, r.gl.getParameter(r.gl.MAX_TEXTURE_SIZE) || 4096); } catch (e) {}
      var num = function (c) { var v = colors[c]; if (v == null) v = colors[c] = P.Color.shared.setValue(c).toNumber(); return v; };

      s.resize = function (w, h) { r.resize(w, h, 1); };
      s.render = function () { if (!lost) r.render(stage); };

      // ----- textures -----
      s.texture = function (c) {
        // never collected behind our back: the canvas is handed back below, so PixiJS could not upload it again
        var source = new P.CanvasSource({ resource: c, width: c.width, height: c.height, resolution: 1, autoGarbageCollect: false });
        var t = { w: c.width, h: c.height, tex: new P.Texture({ source: source }) };
        try { r.texture.initSource(source); } catch (e) { console.warn('gfx: upload', e); }
        live.add(t);
        try { c.width = c.height = 0; } catch (e) {}      // the chip has the picture: hand the canvas memory back
        return t;
      };
      s.paint = function (pxW, pxH, draw) {
        var c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(pxW)); c.height = Math.max(1, Math.ceil(pxH));
        draw(c.getContext('2d'));
        return s.texture(c);
      };
      // an <img> (often an SVG) is turned into pixels once, at the size it is shown, instead of on every frame
      s.image = function (img, pxW) {
        var t = imgs.get(img), iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
        if (!iw || !ih) return null;
        var w = Math.max(1, Math.ceil(pxW || iw)), h = Math.max(1, Math.round(w * ih / iw));
        if (t && t.tex && t.w >= w / 1.15) return t;
        if (t) s.free(t);
        t = s.paint(w, h, function (ctx) { ctx.drawImage(img, 0, 0, w, h); });
        imgs.set(img, t);
        return t;
      };
      s.free = function (t) { if (t && t.tex) { live.delete(t); try { t.tex.destroy(true); } catch (e) {} t.tex = null; } };

      // ----- the frame list -----
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
        s.render();
      };

      // ----- a lost context -----
      // The chip can drop everything (app sent to the background, memory short). PixiJS brings the context back;
      // the pictures were handed over and are gone, so the game makes them again.
      s.onLost = function (fn) { lostFns.push(fn); };
      canvas.addEventListener('webglcontextlost', function () { lost = true; });
      canvas.addEventListener('webglcontextrestored', function () {
        lost = false;
        live.forEach(function (t) { try { t.tex.destroy(true); } catch (e) {} t.tex = null; });
        live.clear(); imgs = new WeakMap();
        for (var i = 0; i < pool.length; i++) { pool[i].visible = false; pool[i].texture = EMPTY; }
        shown = 0;
        lostFns.forEach(function (fn) { try { fn(); } catch (e) { console.warn('gfx: onLost', e); } });
      });
      return s;
    });
  }

  G.create = function (canvas, opts) {
    opts = opts || {};
    return loadPixi().then(function (P) {
      if (!P) throw fail('no-pixi');
      var ok = false;
      try { ok = P.isWebGLSupported(false); } catch (e) {}
      if (!ok) throw fail('no-webgl');
      return make(canvas, P, opts).catch(function (e) { throw fail('gl-failed', e); });
    });
  };

  // ---------- a full-screen game ----------
  // Keeps the canvas the size of the screen and gives the game its pen. onResize(st) runs once at the start and
  // again on every size change; st.w and st.h are CSS pixels, st.dpr is the pixel density the game draws at.
  G.stage = function (canvas, onResize) {
    return G.create(canvas).then(function (S) {
      var st = { canvas: canvas, surface: S, pen: Kit.pen ? Kit.pen(S) : null, w: 0, h: 0, dpr: 1, safe: Kit.safe() };
      function fit() {
        var w = Math.max(1, Math.round(window.innerWidth)), h = Math.max(1, Math.round(window.innerHeight));
        // a picture as large as the screen (a background) must fit in one texture
        var dpr = Math.min(G.dpr(), (S.maxTex - 128) / Math.max(w, h));
        if (w === st.w && h === st.h && dpr === st.dpr) return;
        st.w = w; st.h = h; st.dpr = dpr; st.safe = Kit.safe();
        S.resize(Math.round(w * dpr), Math.round(h * dpr));
        canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        if (onResize) onResize(st);
      }
      var t = null;
      addEventListener('resize', function () { clearTimeout(t); t = setTimeout(fit, 60); fit(); });
      if (window.visualViewport) visualViewport.addEventListener('resize', fit);
      fit();
      st.fit = fit;
      return st;
    });
  };

  // The game could not start. No words to read: a picture and one big button that tries again.
  // Inside the Kahf Kids app the app's own back button stays on screen, so there is always a way out.
  G.sorry = function (error) {
    var code = (error && error.code) || 'gl-failed';
    console.warn('gfx: could not start (' + code + ')', error && error.cause);
    if (document.getElementById('kit-gfx-sorry')) return;
    var d = document.createElement('div'); d.id = 'kit-gfx-sorry'; d.setAttribute('data-code', code);
    d.style.cssText = 'position:fixed;inset:0;z-index:999;display:flex;align-items:center;justify-content:center;background:#f2efe7';
    var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Try again');
    b.style.cssText = 'width:112px;height:112px;border-radius:56px;border:3px solid #231e16;background:#fffdf6;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 5px 0 #231e16';
    b.innerHTML = '<svg viewBox="0 0 24 24" width="60" height="60" fill="none" stroke="#231e16" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/></svg>';
    b.onclick = function () { location.reload(); };
    d.appendChild(b); document.body.appendChild(d);
  };
})();
