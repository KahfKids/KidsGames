/* Helping Home stations on PixiJS (window.HHPix).
   A station's figure is still described by the Colorfigures code as SVG markup, in the figure's own units (the
   frame is the viewBox of the page's <svg id="fig">). Here that markup is turned into pictures ONCE per change, with
   the same hand-drawn filter, and PixiJS shows them: the same idea as the world (world/engine.js).
   Nothing of the figure is painted by the page any more; the <svg id="fig"> stays as an empty, see-through sheet
   that takes the finger (turning the figure) and gives the frame.

   HHPix.attach({ stack, svg })  -> Promise of px (rejects when PixiJS cannot start; show Kit.gfx.sorry)
   px.layer({ filter })          -> { set(markup) }   a picture; filter: the hand-drawn look (default true)
   px.fx()                       -> { set(markup) }   no filter. An element with an effect class (HHPix.effects) becomes
                                                      its own sprite and is moved by PixiJS; the rest is one picture
   px.measure(markups)           -> { x0, y0, x1, y1 } | null   what the markup covers, in figure units
   px.last()                     -> the markup now in every layer
   px.sync()                     the frame (viewBox) or the layout changed: place everything again, re-bake if needed

   While a picture changes on every frame (the child is turning the figure) it is made at half sharpness, and at
   full sharpness as soon as it rests, so turning stays light on a slow phone.

   Effects are the CSS animations the stations had, now run by PixiJS:
   HHPix.effects[name] = { dur, delay(el), at(u) -> { alpha, scale } }   u: 0..1 through one loop */
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
  var easeOut = bezier(0, 0, .58, 1), easeInOut = bezier(.42, 0, .58, 1);
  H.ease = { out: easeOut, inOut: easeInOut, bezier: bezier };

  H.effects = {
    // a soft glow breathing: opacity .35 -> .95 -> .35
    'ps-pulse': { dur: 1.8, at: function (u) { return { alpha: u < .5 ? .35 + .6 * easeInOut(u * 2) : .95 - .6 * easeInOut(u * 2 - 1), scale: 1 }; }, still: { alpha: 1, scale: 1 } },
    // a sound ring spreading from its centre and fading
    'ps-wave': { dur: 2.1, delay: function (el) { return el.classList.contains('w3') ? 1.4 : el.classList.contains('w2') ? .7 : 0; },
      at: function (u) { return { alpha: u < .15 ? .95 * easeOut(u / .15) : .95 * (1 - easeOut((u - .15) / .85)), scale: .55 + .9 * easeOut(u) }; },
      before: { alpha: 0, scale: .55 }, still: { alpha: .6, scale: 1 } }
  };

  function loadSvg(src, ok, bad) {
    var im = new Image(), url = null, data = false;
    var asData = function () { data = true; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src); };
    im.onload = function () { if (url) { URL.revokeObjectURL(url); url = null; } ok(im); };
    im.onerror = function () { if (url) { URL.revokeObjectURL(url); url = null; } if (!data) asData(); else bad(); };
    try { url = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' })); im.src = url; } catch (e) { asData(); }
  }

  H.attach = function (o) {
    var stack = o.stack, svg = o.svg;
    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;display:block';
    stack.insertBefore(canvas, stack.firstChild);
    // a sheet nobody sees, used only to measure markup (what it covers, where an element sits)
    var meas = document.createElementNS(NS, 'svg');
    meas.setAttribute('aria-hidden', 'true');
    meas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;visibility:hidden;pointer-events:none;overflow:visible';
    var mg = document.createElementNS(NS, 'g'); meas.appendChild(mg); stack.appendChild(meas);

    return Kit.gfx.create(canvas, { transparent: true }).then(function (SF) {
      var P = SF.PIXI, root = new P.Container(), layers = [], RM = !!(window.Kit && Kit.reducedMotion);
      SF.stage.addChild(root);
      var dpr = 1, view = null, ticking = false, t0 = performance.now() / 1000, dirty = false;

      // figure units -> canvas pixels: x' = a*x + e, y' = a*y + f
      function readView() {
        var m = svg.getScreenCTM(); if (!m || !m.a) return null;
        return { a: m.a * dpr, e: m.e * dpr, f: m.f * dpr };
      }
      function fitCanvas() {
        dpr = Kit.gfx.dpr();
        var r = stack.getBoundingClientRect(), w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
        canvas.style.left = (-r.left) + 'px'; canvas.style.top = (-r.top) + 'px'; canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        var pw = Math.round(w * dpr), ph = Math.round(h * dpr);
        if (canvas.width !== pw || canvas.height !== ph) SF.resize(pw, ph);
        meas.setAttribute('viewBox', svg.getAttribute('viewBox') || '0 0 1 1');
      }
      function ask() { if (dirty) return; dirty = true; requestAnimationFrame(function () { dirty = false; if (!ticking) SF.render(); }); }

      /* ----- making a picture ----- */
      // box: [x, y, w, h] in units; k: pixels per unit. -> texture + where it sits
      function bake(markup, box, k, filter, done) {
        var maxT = SF.maxTex, pw = Math.ceil(box[2] * k), ph = Math.ceil(box[3] * k);
        if (pw > maxT) { k *= maxT / pw; } if (ph > maxT) { k *= maxT / ph; }
        if (box[2] * k * box[3] * k > 8e6) k = Math.sqrt(8e6 / (box[2] * box[3]));
        pw = Math.max(1, Math.ceil(box[2] * k)); ph = Math.max(1, Math.ceil(box[3] * k));
        var w = pw / k, h = ph / k, vb = box[0] + ' ' + box[1] + ' ' + w + ' ' + h, body = markup;
        if (filter) {
          var fl = filterFor(INK_K).replace('x="-3%" y="-3%" width="106%" height="106%"', 'filterUnits="userSpaceOnUse" x="' + box[0] + '" y="' + box[1] + '" width="' + w + '" height="' + h + '"');
          body = '<defs>' + fl + '</defs><g filter="url(#hand)">' + markup + '</g>';
        }
        var src = '<svg xmlns="' + NS + '" width="' + pw + '" height="' + ph + '" viewBox="' + vb + '">' + body + '</svg>';
        loadSvg(src, function (im) {
          var t = null;
          try { t = SF.paint(pw, ph, function (c) { c.drawImage(im, 0, 0, pw, ph); }); } catch (e) { t = null; }
          done(t, { x: box[0], y: box[1], w: w, h: h });
        }, function () { done(null); });
      }
      function bboxOf(markup) {
        mg.innerHTML = markup;
        var b = null; try { b = mg.getBBox(); } catch (e) {}
        mg.innerHTML = '';
        return b && b.width && b.height ? b : null;
      }
      // the part of a box that is on screen, padded for the wobble and the line weight
      function onScreen(b, v) {
        var pad = 6 * INK_K + 3, x0 = b.x - pad, y0 = b.y - pad, x1 = b.x + b.width + pad, y1 = b.y + b.height + pad;
        var vx0 = (0 - v.e) / v.a, vy0 = (0 - v.f) / v.a, vx1 = (canvas.width - v.e) / v.a, vy1 = (canvas.height - v.f) / v.a;
        x0 = Math.max(x0, vx0); y0 = Math.max(y0, vy0); x1 = Math.min(x1, vx1); y1 = Math.min(y1, vy1);
        if (x1 - x0 < 1 || y1 - y0 < 1) return null;
        return [Math.floor(x0), Math.floor(y0), Math.ceil(x1) - Math.floor(x0), Math.ceil(y1) - Math.floor(y0)];
      }

      /* ----- a picture layer ----- */
      function Layer(filter) {
        var L = { markup: '', sprite: new P.Sprite(P.Texture.EMPTY), tex: null, at: null, k: 0, busy: false, again: false, fast: false, rest: 0, seq: 0, filter: filter };
        L.sprite.visible = false; root.addChild(L.sprite);
        L.place = function () {
          if (!L.at || !view) return;
          L.sprite.position.set(Math.round(L.at.x * view.a + view.e), Math.round(L.at.y * view.a + view.f));
          L.sprite.scale.set(L.at.w * view.a / L.tex.w, L.at.h * view.a / L.tex.h);
        };
        L.run = function () {
          if (!view) return;
          if (L.busy) { L.again = true; L.fast = true; return; }
          var m = L.markup, id = ++L.seq;
          if (!m) { L.sprite.visible = false; if (L.tex) { SF.free(L.tex); L.tex = null; L.at = null; } ask(); return; }
          var b = bboxOf(m), box = b && onScreen(b, view);
          if (!box) { L.sprite.visible = false; ask(); return; }
          var k = view.a * (L.fast ? .5 : 1);
          L.busy = true;
          bake(m, box, k, L.filter, function (t, at) {
            L.busy = false;
            if (t && id === L.seq) {
              var old = L.tex; L.tex = t; L.at = at; L.k = k; L.sprite.texture = t.tex; L.sprite.visible = true; L.place();
              if (old) SF.free(old);
              ask();
            } else if (t) SF.free(t);
            if (L.again) { L.again = false; L.run(); return; }
            // it has come to rest: make it sharp
            if (L.fast) { clearTimeout(L.rest); L.rest = setTimeout(function () { L.fast = false; L.run(); }, 140); }
          });
        };
        L.set = function (markup) { if (markup === L.markup) return; L.markup = markup; L.run(); };
        L.drop = function () { if (L.tex) { L.tex = null; L.at = null; } L.sprite.visible = false; L.sprite.texture = P.Texture.EMPTY; };
        layers.push(L);
        return L;
      }

      /* ----- the effects layer: no filter; elements with an effect class are moved by PixiJS ----- */
      function Fx() {
        var F = { markup: '', rest: Layer(false), parts: [], seq: 0 };
        var box = new P.Container(); root.addChild(box);
        function clear() { F.parts.forEach(function (p) { p.sprite.destroy(); if (p.tex) SF.free(p.tex); }); F.parts = []; }
        F.run = function () {
          var id = ++F.seq; clear();
          if (!F.markup || !view) { F.rest.set(''); return; }
          mg.innerHTML = F.markup;
          var defs = [].map.call(mg.querySelectorAll('defs'), function (d) { return d.outerHTML; }).join('');
          var sel = Object.keys(H.effects).map(function (n) { return '.' + n; }).join(','), els = [].slice.call(mg.querySelectorAll(sel));
          var inv = null; try { inv = meas.getScreenCTM().inverse(); } catch (e) {}
          els.forEach(function (el) {
            var name = Object.keys(H.effects).filter(function (n) { return el.classList.contains(n); })[0], fx = H.effects[name], b = null, m = null;
            try { b = el.getBBox(); m = inv.multiply(el.getScreenCTM()); } catch (e) {}
            if (!b || !m || !(b.width || b.height)) return;
            var c = el.cloneNode(true); c.removeAttribute('class'); c.removeAttribute('transform');
            var pad = 4, lb = [b.x - pad, b.y - pad, b.width + 2 * pad, b.height + 2 * pad];
            var part = { fx: fx, delay: fx.delay ? fx.delay(el) : 0, m: m, lb: lb, sprite: new P.Sprite(P.Texture.EMPTY), tex: null, t0: performance.now() / 1000 };
            part.sprite.visible = false; box.addChild(part.sprite); F.parts.push(part);
            var k = view.a * Math.hypot(m.a, m.b);
            bake(defs + c.outerHTML, lb, k, false, function (t, at) {
              if (!t || id !== F.seq) { if (t) SF.free(t); return; }
              part.tex = t; part.at = at; part.sprite.texture = t.tex; part.sprite.visible = true; tick();
            });
            el.parentNode.removeChild(el);
          });
          // what is left (no effect class) is one still picture
          var left = mg.innerHTML; mg.innerHTML = '';
          F.rest.set(/<(path|circle|rect|ellipse|polygon|polyline|line|text|image|use)\b/.test(left) ? left : '');
          tick();
        };
        F.set = function (markup) { if (markup === F.markup) return; F.markup = markup; F.run(); };
        F.step = function (now) {
          for (var i = 0; i < F.parts.length; i++) {
            var p = F.parts[i]; if (!p.tex) continue;
            var t = now - p.t0 - p.delay, s;
            if (RM) s = p.fx.still || { alpha: 1, scale: 1 };
            else if (t < 0) s = p.fx.before || p.fx.at(0);
            else s = p.fx.at((t % p.fx.dur) / p.fx.dur);
            // local (texture) -> element space (scaled about the element's own origin) -> figure units -> canvas
            var m = p.m, sc = s.scale, kx = p.at.w / p.tex.w, ky = p.at.h / p.tex.h, a = view.a;
            var A = m.a * sc, B = m.b * sc, C = m.c * sc, D = m.d * sc;
            p.sprite.setFromMatrix(MX.set(a * A * kx, a * B * kx, a * C * ky, a * D * ky,
              a * (A * p.at.x + C * p.at.y + m.e) + view.e, a * (B * p.at.x + D * p.at.y + m.f) + view.f));
            p.sprite.alpha = s.alpha;
          }
        };
        F.drop = function () { F.parts.forEach(function (p) { p.tex = null; p.sprite.visible = false; p.sprite.texture = P.Texture.EMPTY; }); };
        fxs.push(F);
        return F;
      }
      var fxs = [], MX = new P.Matrix();
      // one loop for every running effect; it stops by itself when nothing moves
      function tick() {
        if (ticking) return;
        var any = fxs.some(function (F) { return F.parts.length; });
        if (!any) { ask(); return; }
        ticking = true;
        requestAnimationFrame(function frame() {
          var live = fxs.some(function (F) { return F.parts.length; });
          if (!live || !view) { ticking = false; SF.render(); return; }
          if (!document.hidden) { var now = performance.now() / 1000; fxs.forEach(function (F) { F.step(now); }); SF.render(); }
          requestAnimationFrame(frame);
        });
      }

      var px = { surface: SF };
      px.layer = function (opt) { return Layer(!opt || opt.filter !== false); };
      // the markup now in every picture and effects layer (for framing on what is drawn)
      px.last = function () { return layers.map(function (L) { return L.markup; }).concat(fxs.map(function (F) { return F.markup; })); };
      px.fx = function () { return Fx(); };
      px.measure = function (markups) {
        var bb = null;
        markups.forEach(function (m) { if (!m) return; var b = bboxOf(m); if (!b) return;
          bb = bb ? { x0: Math.min(bb.x0, b.x), y0: Math.min(bb.y0, b.y), x1: Math.max(bb.x1, b.x + b.width), y1: Math.max(bb.y1, b.y + b.height) }
            : { x0: b.x, y0: b.y, x1: b.x + b.width, y1: b.y + b.height }; });
        return bb;
      };
      // the frame or the layout changed: place again; pictures made for another size are made again
      px.sync = function () {
        fitCanvas();
        var v = readView(); if (!v) return;
        var scaled = !view || Math.abs(v.a - view.a) > view.a * .01, moved = !view || scaled || Math.abs(v.e - view.e) > .5 || Math.abs(v.f - view.f) > .5;
        view = v;
        layers.forEach(function (L) { if (!L.tex || scaled || moved) L.run(); else L.place(); });
        if (scaled || moved) fxs.forEach(function (F) { F.run(); });
        ask();
      };
      var st = 0, later = function () { clearTimeout(st); st = setTimeout(px.sync, 60); };
      addEventListener('resize', later); addEventListener('scroll', later, true);
      if (window.ResizeObserver) new ResizeObserver(later).observe(stack);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) ask(); });
      SF.onLost(function () { layers.forEach(function (L) { L.drop(); }); fxs.forEach(function (F) { F.drop(); }); layers.forEach(function (L) { L.run(); }); fxs.forEach(function (F) { F.run(); }); });
      px.sync();
      return px;
    });
  };
})();
