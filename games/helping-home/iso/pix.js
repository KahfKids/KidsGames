/* Helping Home stations on PixiJS (window.HHPix).
   A station's figure is still described by the Colorfigures code as SVG markup, in the figure's own units. Here that
   markup is turned into pictures ONCE per change, with the same hand-drawn filter, and PixiJS shows them: the same
   idea as the world (world/engine.js). Nothing of a figure is painted by the page: the page keeps an empty
   <svg> sheet that gives the frame (its viewBox) and takes the finger.

   HHPix.stage({ host, cover, before }) -> S     a canvas in `host`, drawn by PixiJS. cover: 'viewport' (the figure
                                                 may run past its box, the default) | 'host' (only the host's box)
     S.ready            Promise of S; rejects when PixiJS cannot start (show Kit.gfx.sorry)
     S.SF, S.P, S.root  the kit surface, the PIXI namespace, the root container (after ready)
     S.bake(markup, box, kx, ky, ink, done)   markup -> texture. box [x, y, w, h] in units, kx/ky pixels per unit,
                                              ink: the hand-drawn filter's scale (0 = no filter). done(t, at) | done(null)
     S.bakeSvg(src, pw, ph, done)             a whole <svg> string -> texture of pw x ph pixels
     S.tick(fn)         fn(now seconds) on every frame until it returns false; the loop stops when nothing moves
     S.tween(ms, fn, ease, done) -> { stop }  fn(0..1)
     S.ask()            draw once on the next frame        S.onLayout(fn)   the host was resized or moved

   HHPix.attach({ stack, svg, cover, ink }) -> px   a figure: `svg` is the sheet whose viewBox is the frame.
     Everything below can be called at once; drawing starts when PixiJS is up (px.ready).
     px.layer({ filter, cache, blend }) -> L     a picture layer
        L.set(markup)            show this markup (made once; the latest wins while it changes fast)
        L.alpha(a, ms)           fade to a           L.pulse(lo, hi, seconds)   breathe (0 seconds = stop)
        L.warm(list, q)          cache: true only. Make these pictures ahead (strings, or functions giving one),
                                 at q sharpness, so a move can be played back as a flipbook with no waiting
     px.fx() -> F               no filter. An element with an effect class (HHPix.effects) becomes its own sprite,
                                 moved by PixiJS; what is left is one still picture
        F.set(markup)   F.play(markup) (start the effects again)   F.dim(cls, seconds)   F.wake()
     px.sticker() -> K          a picture in screen pixels above the figure (a magnifier bubble)
        K.set(svgInner, w, h)    K.at(x, y) (viewport CSS pixels, its centre)    K.show(on, pop)
     px.measure(markups) -> { x0, y0, x1, y1 } | null     px.last() -> the markup now in every layer
     px.sync()                  the frame or the layout changed: place everything, make pictures again if needed
     px.shift(dx, dy)           nudge the whole figure (a shaking machine), in figure units
     px.actAt(clientX, clientY) -> the name of the data-act part under the finger, or null
     px.backdrop(color)         an opaque sheet under the figure (needed under a 'multiply' layer)

   While a picture changes on every frame it is made a little less sharp if the phone cannot keep up, and sharp
   again as soon as it rests.

   HHPix.effects[name] = { delay(el), frames(el), state(t, part, T), still (a state, or a function giving one), origin }
     state -> { alpha, scale, dx, dy, frame, done }   t: seconds since the effect began (after its delay)
     frames: several pictures of the element (a line being drawn); state.frame picks one
     origin: 'center' scales about the element's middle (else about the figure's 0, 0, as CSS does for SVG) */
(function () {
  'use strict';
  var H = window.HHPix = {};
  var NS = 'http://www.w3.org/2000/svg';

  // CSS cubic-bezier(x1, y1, x2, y2), so the motion is the one the stations had
  function bezier(x1, y1, x2, y2) {
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var t = x, i, d;
      for (i = 0; i < 8; i++) { d = ((ax * t + bx) * t + cx) * t - x; if (Math.abs(d) < 1e-5) break; var s = (3 * ax * t + 2 * bx) * t + cx; if (Math.abs(s) < 1e-6) break; t -= d / s; }
      return ((ay * t + by) * t + cy) * t;
    };
  }
  var easeOut = bezier(0, 0, .58, 1), easeInOut = bezier(.42, 0, .58, 1), easeIn = bezier(.42, 0, 1, 1), ease = bezier(.25, .1, .25, 1);
  var E = H.ease = { out: easeOut, inOut: easeInOut, 'in': easeIn, ease: ease, linear: function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; }, bezier: bezier };
  E.css = function (name) { return name === 'linear' ? E.linear : name === 'ease-in' ? easeIn : name === 'ease-out' ? easeOut : name === 'ease' ? ease : easeInOut; };
  // up and back over one loop (0 -> 1 -> 0), eased both ways, like a CSS "0%,100% / 50%" animation
  E.swing = function (u) { return u < .5 ? easeInOut(u * 2) : 1 - easeInOut(u * 2 - 1); };

  // CSS keyframes [[percent, a, b, c, …]] sampled at u (0..100): the easing runs inside each step, as in CSS
  H.keys = function (frames, easing) {
    var fn = typeof easing === 'function' ? easing : E.css(easing), n = frames.length;
    return function (u) {
      if (u <= frames[0][0]) return frames[0];
      for (var i = 0; i < n - 1; i++) {
        var a = frames[i], b = frames[i + 1];
        if (u <= b[0]) {
          if (b[0] <= a[0]) return b;
          var k = fn((u - a[0]) / (b[0] - a[0])), out = [u];
          for (var j = 1; j < Math.max(a.length, b.length); j++) { var x = a[j] == null ? (j === 4 ? 1 : 0) : a[j], y = b[j] == null ? (j === 4 ? 1 : 0) : b[j]; out.push(x + (y - x) * k); }
          return out;
        }
      }
      return frames[n - 1];
    };
  };

  H.effects = {
    // a soft glow breathing: opacity .35 -> .95 -> .35
    'ps-pulse': { state: function (t) { return { alpha: .35 + .6 * E.swing((Math.max(0, t) % 1.8) / 1.8) }; }, still: { alpha: 1 } },
    // a sound ring spreading from its centre and fading
    'ps-wave': { delay: function (el) { return el.classList.contains('w3') ? 1.4 : el.classList.contains('w2') ? .7 : 0; },
      state: function (t) { if (t < 0) return { alpha: 0, scale: .55 }; var u = (t % 2.1) / 2.1;
        return { alpha: u < .15 ? .95 * easeOut(u / .15) : .95 * (1 - easeOut((u - .15) / .85)), scale: .55 + .9 * easeOut(u) }; },
      still: { alpha: .6, scale: 1 } }
  };

  function loadSvg(src, ok, bad) {
    var im = new Image(), url = null, data = false;
    var asData = function () { data = true; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src); };
    im.onload = function () { if (url) { URL.revokeObjectURL(url); url = null; } ok(im); };
    im.onerror = function () { if (url) { URL.revokeObjectURL(url); url = null; } if (!data) asData(); else bad(); };
    try { url = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' })); im.src = url; } catch (e) { asData(); }
  }

  /* ================= the stage: a canvas, PixiJS, one loop ================= */
  H.stage = function (o) {
    var host = o.host, cover = o.cover || 'viewport';
    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;display:block';
    host.insertBefore(canvas, o.before || host.firstChild);
    var S = { host: host, canvas: canvas, SF: null, P: null, root: null, dpr: 1, ox: 0, oy: 0, cw: 1, ch: 1, RM: !!(window.Kit && Kit.reducedMotion) };
    var ticks = [], looping = false, dirty = false, lays = [];

    S.fit = function () {
      S.dpr = Kit.gfx.dpr();
      var r = host.getBoundingClientRect(), w, h;
      if (cover === 'viewport') {
        w = Math.max(1, window.innerWidth); h = Math.max(1, window.innerHeight);
        canvas.style.left = (-r.left - host.clientLeft) + 'px'; canvas.style.top = (-r.top - host.clientTop) + 'px'; S.ox = 0; S.oy = 0;
      } else { w = Math.max(1, host.clientWidth); h = Math.max(1, host.clientHeight); S.ox = r.left + host.clientLeft; S.oy = r.top + host.clientTop; }
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      S.cw = Math.round(w * S.dpr); S.ch = Math.round(h * S.dpr);
      if (S.SF && (canvas.width !== S.cw || canvas.height !== S.ch)) S.SF.resize(S.cw, S.ch);
    };
    S.ask = function () { if (dirty || !S.SF) return; dirty = true; requestAnimationFrame(function () { dirty = false; if (!looping) S.SF.render(); }); };
    function frame() {
      if (!document.hidden) {
        var now = performance.now() / 1000, cur = ticks; ticks = [];
        for (var i = 0; i < cur.length; i++) if (cur[i](now) !== false) ticks.push(cur[i]);
        S.SF.render();
      }
      if (ticks.length) requestAnimationFrame(frame); else looping = false;
    }
    S.tick = function (fn) { ticks.push(fn); if (looping || !S.SF) return; looping = true; requestAnimationFrame(frame); };
    S.tween = function (ms, fn, easing, done) {
      var t0 = 0, dead = false;
      if (!ms || S.RM) { fn(1); if (done) done(); S.ask(); return { stop: function () {} }; }
      S.tick(function (now) { if (dead) return false; if (!t0) t0 = now; var u = Math.min(1, (now - t0) * 1000 / ms); fn(easing ? easing(u) : u); if (u >= 1) { if (done) done(); return false; } });
      return { stop: function () { dead = true; } };
    };

    // box: [x, y, w, h] in units; kx, ky: pixels per unit; ink: scale of the hand-drawn filter (0: none)
    S.bake = function (markup, box, kx, ky, ink, done) {
      var maxT = S.SF.maxTex, pw = Math.ceil(box[2] * kx), ph = Math.ceil(box[3] * ky), s = 1;
      if (pw > maxT) s = Math.min(s, maxT / pw); if (ph > maxT) s = Math.min(s, maxT / ph);
      if (pw * ph * s * s > 8e6) s = Math.sqrt(8e6 / (pw * ph));
      kx *= s; ky *= s;
      pw = Math.max(1, Math.ceil(box[2] * kx)); ph = Math.max(1, Math.ceil(box[3] * ky));
      var w = pw / kx, h = ph / ky, body = markup;
      if (ink) {
        var fl = filterFor(ink).replace('x="-3%" y="-3%" width="106%" height="106%"', 'filterUnits="userSpaceOnUse" x="' + box[0] + '" y="' + box[1] + '" width="' + w + '" height="' + h + '"');
        body = '<defs>' + fl + '</defs><g filter="url(#hand)">' + markup + '</g>';
      }
      var src = '<svg xmlns="' + NS + '" width="' + pw + '" height="' + ph + '" viewBox="' + box[0] + ' ' + box[1] + ' ' + w + ' ' + h + '" preserveAspectRatio="none">' + body + '</svg>';
      S.bakeSvg(src, pw, ph, function (t) { if (t) done(t, { x: box[0], y: box[1], w: w, h: h }); else done(null); });
    };
    S.bakeSvg = function (src, pw, ph, done) {
      loadSvg(src, function (im) {
        var t = null;
        try { t = S.SF.paint(pw, ph, function (c) { c.drawImage(im, 0, 0, pw, ph); }); } catch (e) { t = null; }
        done(t);
      }, function () { done(null); });
    };

    var lt = 0, later = function () { clearTimeout(lt); lt = setTimeout(function () { S.fit(); lays.forEach(function (fn) { fn(); }); }, 60); };
    S.onLayout = function (fn) { lays.push(fn); };
    addEventListener('resize', later); addEventListener('scroll', later, true);
    if (window.ResizeObserver) new ResizeObserver(later).observe(host);

    S.ready = Kit.gfx.create(canvas, { transparent: true }).then(function (SF) {
      S.SF = SF; S.P = SF.PIXI; S.root = new S.P.Container(); SF.stage.addChild(S.root);
      S.fit();
      document.addEventListener('visibilitychange', function () { if (!document.hidden) S.ask(); });
      if (ticks.length) { looping = true; requestAnimationFrame(frame); }
      return S;
    });
    return S;
  };

  /* ================= a figure on a stage ================= */
  H.attach = function (o) {
    var stack = o.stack, svg = o.svg, S = H.stage({ host: stack, cover: o.cover, before: o.before });
    var inkK = function () { return o.ink || INK_K; };
    // a sheet nobody sees, used only to measure markup (what it covers, where an element sits)
    var meas = document.createElementNS(NS, 'svg');
    meas.setAttribute('aria-hidden', 'true');
    meas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;visibility:hidden;pointer-events:none;overflow:visible';
    var mg = document.createElementNS(NS, 'g'); meas.appendChild(mg); stack.appendChild(meas);

    var P = null, view = null, shift = [0, 0], top = null, bg = null, bgCol = null;
    var layers = [], fxs = [], stickers = [], caches = [], boots = [], MX = null;
    var px = { stage: S, ready: S.ready };

    // figure units -> canvas pixels: x' = a*x + e, y' = a*y + f
    function readView() {
      var m = svg.getScreenCTM(); if (!m || !m.a) return null;
      return { a: m.a * S.dpr, e: (m.e - S.ox) * S.dpr, f: (m.f - S.oy) * S.dpr };
    }
    function applyView() {
      if (!S.root || !view) return;
      S.root.scale.set(view.a); S.root.position.set(view.e + shift[0] * view.a, view.f + shift[1] * view.a);
      if (bg) { bg.width = S.cw; bg.height = S.ch; }
    }
    function boot(x) { if (S.SF) x.boot(); else boots.push(x); return x; }

    // what a piece of markup covers, and its parts that can be pressed
    function inspect(markup, withActs) {
      mg.innerHTML = markup;
      var b = null, acts = [];
      try { b = mg.getBBox(); } catch (e) {}
      if (withActs) [].forEach.call(mg.querySelectorAll('[data-act]'), function (el) {
        try { var q = el.getBBox(); if (q.width || q.height) acts.push({ name: el.getAttribute('data-act'), x0: q.x, y0: q.y, x1: q.x + q.width, y1: q.y + q.height }); } catch (e) {} });
      mg.innerHTML = '';
      return b && b.width && b.height ? { x: b.x, y: b.y, width: b.width, height: b.height, acts: acts } : null;
    }
    // the part of a box that is on screen (and a little past it, for a zoom that pulls back), padded for the wobble
    // and the line weight; its corner sits on a whole pixel so the picture stays sharp
    function onScreen(b, v) {
      var pad = 6 * inkK() + 3, x0 = b.x - pad, y0 = b.y - pad, x1 = b.x + b.width + pad, y1 = b.y + b.height + pad;
      var mx = S.cw * .1, my = S.ch * .1;
      x0 = Math.max(x0, (-mx - v.e) / v.a); y0 = Math.max(y0, (-my - v.f) / v.a); x1 = Math.min(x1, (S.cw + mx - v.e) / v.a); y1 = Math.min(y1, (S.ch + my - v.f) / v.a);
      if (x1 - x0 < 1 || y1 - y0 < 1) return null;
      x0 = (Math.floor(x0 * v.a + v.e) - v.e) / v.a; y0 = (Math.floor(y0 * v.a + v.f) - v.f) / v.a;
      return [x0, y0, x1 - x0, y1 - y0];
    }
    function bake(markup, box, k, filter, done) { S.bake(markup, box, k, k, filter ? inkK() : 0, done); }

    /* ----- pictures that are kept: a move played back as a flipbook ----- */
    function hold(e) { e.uses = (e.uses || 0) + 1; }
    function release(e) { if (!e) return; e.uses--; if (!e.uses && !e.cached && e.t.tex) S.SF.free(e.t); }
    function Cache(cap) {
      var C = { map: new Map(), bytes: 0, cap: cap || (navigator.deviceMemory && navigator.deviceMemory <= 2 ? 18e6 : 36e6) };
      function kill(e) { C.bytes -= e.t.w * e.t.h * 4; e.cached = false; if (!e.uses && e.t.tex) S.SF.free(e.t); }
      C.get = function (m) { var e = C.map.get(m); if (e) { C.map.delete(m); C.map.set(m, e); } return e; };
      C.put = function (m, e) {
        var old = C.map.get(m); if (old) { C.map.delete(m); kill(old); }
        e.cached = true; C.map.set(m, e); C.bytes += e.t.w * e.t.h * 4;
        if (C.bytes > C.cap) C.map.forEach(function (x, k) { if (C.bytes > C.cap && !x.uses && x !== e) { C.map.delete(k); kill(x); } });
      };
      C.clear = function (lost) { if (!lost) C.map.forEach(kill); C.map.clear(); C.bytes = 0; };
      caches.push(C);
      return C;
    }

    /* ----- a picture layer ----- */
    function Layer(opt) {
      opt = opt || {};
      var L = { markup: '', filter: opt.filter !== false, cache: opt.cache === true ? Cache() : opt.cache ? opt.cache.cache : null, sprite: null, cur: null,
        busy: false, warming: false, again: false, fast: false, rest: 0, shows: 0, acts: [], actsM: null, a: 1, q: 1, wq: [], wqQ: .6, blend: opt.blend, tw: null, pulseOn: 0 };
      L.boot = function () { L.sprite = new P.Sprite(P.Texture.EMPTY); L.sprite.visible = false; L.sprite.alpha = L.a; if (L.blend) L.sprite.blendMode = L.blend; S.root.addChild(L.sprite); };
      function show(e) {
        hold(e); var old = L.cur; L.cur = e; L.shows++;
        L.sprite.texture = e.t.tex; L.sprite.position.set(e.at.x, e.at.y); L.sprite.scale.set(e.at.w / e.t.w, e.at.h / e.t.h); L.sprite.visible = true;
        release(old); S.ask();
      }
      function hide() { if (L.sprite) { L.sprite.visible = false; L.sprite.texture = P.Texture.EMPTY; } release(L.cur); L.cur = null; L.shows++; S.ask(); }
      function sharp(e) { return e.k >= view.a * .98; }
      function restLater() { clearTimeout(L.rest); L.rest = setTimeout(function () { L.fast = false; if (L.cur && L.cur.m === L.markup && sharp(L.cur)) pump(); else if (L.markup) run(); }, 140); }
      L.go = function () {
        if (!S.SF || !view) return;
        var m = L.markup;
        if (!m) { hide(); return; }
        if (L.cache) { var e = L.cache.get(m); if (e && e.t.tex) { if (L.cur !== e) show(e); if (!sharp(e)) restLater(); return; } }
        run();
      };
      function run() {
        if (L.busy) { L.again = true; if (!L.warming) L.fast = true; return; }
        var m = L.markup, info = inspect(m, true), box = info && onScreen(info, view);
        L.actsM = m; L.acts = info ? info.acts : [];
        if (!box) { hide(); return; }
        var q = L.fast ? L.q : 1, k = view.a * q, s0 = L.shows, t0 = performance.now();
        L.busy = true; L.n = (L.n || 0) + 1;
        bake(m, box, k, L.filter, function (t, at) {
          L.busy = false;
          if (t) {
            // how sharp the next quick picture may be: what a full one costs on this phone
            var full = (performance.now() - t0) / (q * q); L.q = full <= 20 ? 1 : full <= 45 ? .75 : .5;
            var e = { t: t, at: at, k: k, m: m, uses: 0 };
            if (L.cache) L.cache.put(m, e);
            if (L.shows === s0 || L.markup === m) show(e); else if (!L.cache) S.SF.free(t);
          }
          if (L.again) { L.again = false; L.go(); return; }
          if (L.fast || (L.cur && !sharp(L.cur))) restLater(); else pump();
        });
      }
      // pictures made ahead, one at a time, whenever the layer is free
      function pump() {
        if (!S.SF || !view || L.busy || !L.cache || !L.wq.length) return;
        var it = L.wq.shift(), m = typeof it === 'function' ? it() : it;
        if (!m || L.cache.map.has(m)) { setTimeout(pump, 0); return; }
        var info = inspect(m), box = info && onScreen(info, view);
        if (!box) { setTimeout(pump, 0); return; }
        // the whole list must fit in what the layer may keep: on a big screen the flipbook is made a little softer
        var k = view.a * L.wqQ, est = box[2] * box[3] * k * k * 4 * L.wqN;
        if (est > L.cache.cap * .6) k *= Math.sqrt(L.cache.cap * .6 / est);
        L.busy = L.warming = true;
        bake(m, box, k, L.filter, function (t, at) {
          L.busy = L.warming = false;
          if (t) L.cache.put(m, { t: t, at: at, k: k, m: m, uses: 0 });
          if (L.again) { L.again = false; L.go(); } else setTimeout(pump, 0);
        });
      }
      L.set = function (markup) { if (markup === L.markup) return; L.markup = markup; L.go(); };
      L.warm = function (list, q) { L.wq = list.slice(); L.wqN = list.length; L.wqQ = q || .6; pump(); };
      L.alpha = function (a, ms) {
        if (L.tw) L.tw.stop(); L.pulseOn = 0;
        var a0 = L.a, put = function (u) { L.a = a0 + (a - a0) * u; if (L.sprite) L.sprite.alpha = L.a; };
        if (!ms || !S.SF) { put(1); S.ask(); return; }
        L.tw = S.tween(ms, put, easeOut);
      };
      L.pulse = function (lo, hi, sec) {
        if (L.tw) L.tw.stop();
        var id = ++L.pulseOn; if (!sec || S.RM) { L.a = sec ? .8 : hi; if (L.sprite) L.sprite.alpha = L.a; S.ask(); return; }
        S.tick(function (now) { if (id !== L.pulseOn) return false; L.a = lo + (hi - lo) * E.swing((now % sec) / sec); if (L.sprite) L.sprite.alpha = L.a; });
      };
      L.actsOf = function () { if (L.actsM !== L.markup) { var info = L.markup ? inspect(L.markup, true) : null; L.actsM = L.markup; L.acts = info ? info.acts : []; } return L.acts; };
      L.lost = function () { L.cur = null; L.busy = L.warming = L.again = false; if (L.sprite) { L.sprite.visible = false; L.sprite.texture = P.Texture.EMPTY; } };
      layers.push(L);
      return boot(L);
    }

    /* ----- the effects layer: no filter; elements with an effect class are moved by PixiJS ----- */
    function Fx() {
      var F = { markup: '', rest: Layer({ filter: false }), parts: [], seq: 0, t0: 0, box: null, live: false };
      F.boot = function () { F.box = new P.Container(); F.box.sortableChildren = true; S.root.addChild(F.box); };
      function kill(list) { list.forEach(function (p) { p.sprite.destroy(); p.texs.forEach(function (t) { if (t && t.tex) S.SF.free(t); }); }); }
      F.run = function (restart) {
        if (!S.SF || !view) return;
        var id = ++F.seq;
        if (!F.markup) { kill(F.parts); F.parts = []; F.rest.set(''); S.ask(); return; }
        mg.innerHTML = F.markup;
        var defs = [].map.call(mg.querySelectorAll('defs'), function (d) { return d.outerHTML; }).join('');
        var names = Object.keys(H.effects), sel = names.map(function (n) { return '.' + n; }).join(',');
        var depth = function (el) { var d = 0; while (el && el !== mg) { d++; el = el.parentNode; } return d; };
        // the deepest first: an effect inside an effect is its own sprite
        var els = [].slice.call(mg.querySelectorAll(sel)).map(function (el, i) { return { el: el, d: depth(el), i: i }; }).sort(function (a, b) { return b.d - a.d || a.i - b.i; });
        var inv = null; try { inv = meas.getScreenCTM().inverse(); } catch (e) {}
        var next = [], left = 0, swap = function () {
          if (id !== F.seq) { kill(next); return; }
          var old = F.parts; F.parts = next; next.forEach(function (p) { F.box.addChild(p.sprite); });
          kill(old);
          if (restart || !F.t0) F.t0 = performance.now() / 1000;
          wake();
        };
        els.forEach(function (x) {
          var el = x.el, name = names.filter(function (n) { return el.classList.contains(n); })[0], fx = H.effects[name], b = null, m = null;
          try { b = el.getBBox(); m = inv.multiply(el.getScreenCTM()); } catch (e) {}
          var tags = [], up = el; while (up && up !== mg) { [].forEach.call(up.classList || [], function (c) { tags.push(c); }); up = up.parentNode; }
          var delay = fx.delay ? fx.delay(el) : 0;
          if (!b || !m || !(b.width || b.height)) { el.parentNode.removeChild(el); return; }
          var c = el.cloneNode(true); c.removeAttribute('class'); c.removeAttribute('transform'); c.removeAttribute('style');
          var list = fx.frames ? fx.frames(c) : [c.outerHTML];
          var pad = 4 + (parseFloat(el.getAttribute('data-pad')) || 0), lb = [b.x - pad, b.y - pad, b.width + 2 * pad, b.height + 2 * pad];
          var part = { fx: fx, delay: delay, m: m, lb: lb, cx: b.x + b.width / 2, cy: b.y + b.height / 2, tags: tags, sprite: new P.Sprite(P.Texture.EMPTY), texs: [], at: null, frame: -1, dimAt: 0, dimS: 0 };
          part.sprite.visible = false; part.sprite.zIndex = x.i; next.push(part);
          var k = view.a * Math.hypot(m.a, m.b);
          list.forEach(function (html, fi) {
            if (!html) return;
            left++;
            S.bake(defs + html, lb, k, k, 0, function (t, at) {
              if (t) { part.texs[fi] = t; part.at = at; }
              if (!--left) swap();
            });
          });
          el.parentNode.removeChild(el);
        });
        // what is left (no effect class) is one still picture
        var rest = mg.innerHTML; mg.innerHTML = '';
        F.rest.set(/<(path|circle|rect|ellipse|polygon|polyline|line|text|image|use)\b/.test(rest) ? rest : '');
        if (!left) swap();
      };
      function wake() { if (F.live || !F.parts.length) { S.ask(); return; } F.live = true; S.tick(step); }
      function step(now) {
        var moving = false, T = now - F.t0;
        for (var i = 0; i < F.parts.length; i++) {
          var p = F.parts[i]; if (!p.at) continue;
          var s = S.RM ? (typeof p.fx.still === 'function' ? p.fx.still(p) : p.fx.still || { alpha: 1 }) : p.fx.state(T - p.delay, p, T);
          if (!s.done && !S.RM) moving = true;
          var fi = s.frame == null ? 0 : s.frame, t = p.texs[fi], alpha = s.alpha == null ? 1 : s.alpha;
          if (p.dimS) { var d = Math.min(1, (now - p.dimAt) / p.dimS); alpha *= 1 - ease(d); if (d < 1) moving = true; }
          if (!t || !t.tex || alpha <= 0) { p.sprite.visible = false; continue; }
          if (p.frame !== fi) { p.frame = fi; p.sprite.texture = t.tex; }
          // texture -> the element's own space (scaled, nudged) -> figure units
          var m = p.m, sx = s.sx == null ? (s.scale == null ? 1 : s.scale) : s.sx, sy = s.sy == null ? (s.scale == null ? 1 : s.scale) : s.sy, kx = p.at.w / t.w, ky = p.at.h / t.h;
          var ox = p.fx.origin === 'center' ? p.cx : 0, oy = p.fx.origin === 'center' ? p.cy : 0;
          var lx = ox + (p.at.x - ox) * sx + (s.dx || 0), ly = oy + (p.at.y - oy) * sy + (s.dy || 0);
          p.sprite.setFromMatrix(MX.set(m.a * sx * kx, m.b * sx * kx, m.c * sy * ky, m.d * sy * ky, m.a * lx + m.c * ly + m.e, m.b * lx + m.d * ly + m.f));
          p.sprite.alpha = alpha; p.sprite.visible = true;
        }
        if (!moving || !F.parts.length) { F.live = false; return false; }
      }
      F.set = function (markup) { if (markup === F.markup) return; F.markup = markup; F.run(false); };
      F.play = function (markup) {
        if (markup === F.markup && F.parts.length) { F.t0 = performance.now() / 1000; F.parts.forEach(function (p) { p.dimS = 0; }); wake(); return; }
        F.markup = markup; F.run(true);
      };
      F.dim = function (cls, sec) { var now = performance.now() / 1000; F.parts.forEach(function (p) { if (p.tags.indexOf(cls) >= 0 && !p.dimS) { p.dimAt = now; p.dimS = sec || .4; } }); wake(); };
      F.wake = wake;
      F.lost = function () { F.parts.forEach(function (p) { p.sprite.destroy(); }); F.parts = []; };
      fxs.push(F);
      return boot(F);
    }

    /* ----- a picture in screen pixels, above the figure ----- */
    function Sticker() {
      var K = { sprite: null, t: null, src: '', w: 0, h: 0, x: 0, y: 0, a: 0, s: .6, seq: 0, tw: null };
      K.boot = function () { K.sprite = new P.Sprite(P.Texture.EMPTY); K.sprite.anchor.set(.5); K.sprite.visible = false; top.addChild(K.sprite); if (K.src) make(); };
      function place() {
        if (!K.sprite) return;
        var d = S.dpr; K.sprite.position.set(Math.round((K.x - S.ox) * d), Math.round((K.y - S.oy) * d));
        if (K.t && K.t.tex) K.sprite.scale.set(K.w * d / K.t.w * K.s, K.h * d / K.t.h * K.s);
        K.sprite.alpha = K.a; K.sprite.visible = K.a > 0 && !!(K.t && K.t.tex);
        S.ask();
      }
      function make() {
        var id = ++K.seq, d = S.dpr, pw = Math.ceil(K.w * d), ph = Math.ceil(K.h * d);
        S.bakeSvg('<svg xmlns="' + NS + '" width="' + pw + '" height="' + ph + '" viewBox="0 0 ' + K.w + ' ' + K.h + '">' + K.src + '</svg>', pw, ph, function (t) {
          if (!t) return;
          if (id !== K.seq) { S.SF.free(t); return; }
          if (K.t) S.SF.free(K.t); K.t = t; K.sprite.texture = t.tex; place();
        });
      }
      K.set = function (src, w, h) { if (src === K.src && w === K.w && h === K.h) return; K.src = src; K.w = w; K.h = h; if (K.sprite) make(); };
      K.at = function (x, y) { K.x = x; K.y = y; place(); };
      K.show = function (on, pop) {
        if (K.tw) K.tw.stop();
        var a0 = K.a, s0 = pop ? K.s : 1, a1 = on ? 1 : 0, s1 = pop ? (on ? 1 : .6) : 1, bz = bezier(.3, 1.5, .6, 1);
        if (!S.SF) { K.a = a1; K.s = s1; return; }
        K.tw = S.tween(300, function (u) { K.a = a0 + (a1 - a0) * ease(Math.min(1, u * 1.2)); K.s = s0 + (s1 - s0) * bz(u); place(); });
      };
      K.remake = function () { if (K.sprite && K.src) make(); };
      K.lost = function () { K.t = null; if (K.sprite) { K.sprite.visible = false; K.sprite.texture = P.Texture.EMPTY; } if (K.src) make(); };
      stickers.push(K);
      return boot(K);
    }

    px.layer = function (opt) { return Layer(opt); };
    px.fx = function () { return Fx(); };
    px.sticker = function () { return Sticker(); };
    // the markup now in every picture and effects layer (for framing on what is drawn)
    px.last = function () { return layers.map(function (L) { return L.markup; }).concat(fxs.map(function (F) { return F.markup; })); };
    px.measure = function (markups) {
      var bb = null;
      markups.forEach(function (m) { if (!m) return; var b = inspect(m); if (!b) return;
        bb = bb ? { x0: Math.min(bb.x0, b.x), y0: Math.min(bb.y0, b.y), x1: Math.max(bb.x1, b.x + b.width), y1: Math.max(bb.y1, b.y + b.height) }
          : { x0: b.x, y0: b.y, x1: b.x + b.width, y1: b.y + b.height }; });
      return bb;
    };
    px.shift = function (dx, dy) { if (dx === shift[0] && dy === shift[1]) return; shift[0] = dx; shift[1] = dy; applyView(); S.ask(); };
    function mkBg() {
      if (bgCol == null || !S.SF) return;
      if (!bg) { bg = new P.Sprite(P.Texture.WHITE); S.SF.stage.addChildAt(bg, 0); }
      bg.tint = P.Color.shared.setValue(bgCol).toNumber(); bg.width = S.cw; bg.height = S.ch; S.ask();
    }
    px.backdrop = function (color) { bgCol = color; mkBg(); };
    px.view = function () { return view; };
    // for checks: what is held and how sharp the quick pictures are
    px.stats = function () { return { layers: layers.map(function (L) { return { q: L.q, kept: L.cache ? L.cache.map.size : 0, mb: L.cache ? +(L.cache.bytes / 1e6).toFixed(1) : (L.cur ? +(L.cur.t.w * L.cur.t.h * 4 / 1e6).toFixed(1) : 0), queue: L.wq.length, bakes: L.n || 0 }; }), fx: fxs.map(function (F) { return F.parts.length; }) }; };
    px.actAt = function (cx, cy) {
      var m = svg.getScreenCTM(); if (!m || !m.a) return null;
      var x = (cx - m.e) / m.a, y = (cy - m.f) / m.d, pad = 6 / m.a;
      for (var i = layers.length - 1; i >= 0; i--) {
        var acts = layers[i].actsOf();
        for (var j = acts.length - 1; j >= 0; j--) { var b = acts[j]; if (x >= b.x0 - pad && x <= b.x1 + pad && y >= b.y0 - pad && y <= b.y1 + pad) return b.name; }
      }
      return null;
    };
    // the frame or the layout changed: place again; pictures made for another size are made again
    px.sync = function () {
      S.fit();
      meas.setAttribute('viewBox', svg.getAttribute('viewBox') || '0 0 1 1');
      var v = readView(); if (!v) return;
      var scaled = !view || Math.abs(v.a - view.a) > view.a * .01, moved = !view || scaled || Math.abs(v.e - view.e) > .5 || Math.abs(v.f - view.f) > .5;
      view = v;
      if (!S.SF) return;
      applyView();
      if (scaled) caches.forEach(function (C) { C.clear(); });
      layers.forEach(function (L) { if (scaled || moved || !L.cur) L.go(); });
      if (scaled || moved) { fxs.forEach(function (F) { F.run(false); }); }
      stickers.forEach(function (K) { K.at(K.x, K.y); });
      S.ask();
    };
    S.onLayout(function () { px.sync(); });
    S.ready.then(function () {
      P = S.P; MX = new P.Matrix();
      mkBg();
      top = new P.Container(); S.SF.stage.addChild(top);
      boots.forEach(function (x) { x.boot(); }); boots = [];
      S.SF.onLost(function () {
        caches.forEach(function (C) { C.clear(true); });
        layers.forEach(function (L) { L.lost(); }); fxs.forEach(function (F) { F.lost(); });
        stickers.forEach(function (K) { K.lost(); });
        layers.forEach(function (L) { L.go(); }); fxs.forEach(function (F) { F.run(false); });
      });
      view = null; px.sync();
    }, function () {});
    px.sync();
    return px;
  };
})();
