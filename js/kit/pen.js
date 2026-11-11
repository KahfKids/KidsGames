/* Kahf KidsGames kit: pen.js
   The frame of a 2D game, drawn by PixiJS in the order the game asks for it (window.Kit.pen).

   A game's draw() says what is on screen this frame, back to front: pictures, simple shapes, words. The pen
   shows each one with a PixiJS sprite from a pool, so nothing is created or destroyed while the game runs.
   Every picture is made once (Canvas2D paints it, the graphics chip keeps it); a frame only places, turns,
   scales, fades and tints pictures. Rules: docs/game-standard.md. Speed: docs/pixi-performance.md.

   var p = Kit.pen(surface)        (Kit.gfx.stage makes one for you: st.pen)

   A frame
     p.begin(color)                start; color (optional) is what shows where nothing is drawn
     p.end()                       hide what was not drawn this frame and show the frame

   Where things go: the same calls as Canvas2D, in game units
     p.save() p.restore() p.translate(x, y) p.rotate(r) p.scale(sx, sy)
     p.setTransform(a, b, c, d, e, f) p.transform(a, b, c, d, e, f)
     p.alpha = 0.5                 like globalAlpha            p.blend = 'add' | 'multiply' | 'screen' | 'normal'

   Pictures
     p.unit(k)                     device pixels per game unit. Pictures are made this sharp. Call it when the
                                   layout changes: a new value throws every picture away so they are made again.
     p.pic(key, w, h, paint, pad)  -> t  a picture w by h units, painted once by paint(ctx, w, h) with Canvas2D
                                   and kept under key. pad: room around it for glows and shadows.
     p.wrap(key, make, pad)        -> t  the same for art code that returns a canvas: make(k) -> canvas at k pixels
                                   per unit. pad: how many units of the canvas are margin (default canvas.pad or 0).
     p.part(t, x, y, w, h)         -> t  a piece of a picture (units, from the picture's own corner)
     p.img(t, x, y, w, h, tint)    show a picture with its corner at x, y. w, h default to its own size.
     p.add(obj)                    put a PixiJS object of your own (a rope, a mesh, a mask) at this place in the order

   Shapes: shared white pictures, tinted. Colour is a CSS colour or 0xRRGGBB.
     p.rect(x, y, w, h, color)
     p.circle(x, y, r, color)      p.ellipse(x, y, rx, ry, color, rot)
     p.ring(x, y, r, lw, color)    a stroked circle
     p.glow(x, y, r, color, r0)    colour in the middle fading to nothing at r (r0: where the fade starts, 0..r)
     p.line(x1, y1, x2, y2, lw, color, round)
     p.path([x0, y0, x1, y1, ...], lw, color, round)        a line through many points
     p.arc(x, y, r, a0, a1, lw, color, round)               part of a stroked circle (a timer ring)
     p.curve(x1, y1, cx, cy, x2, y2, lw, color, round)      a stroked quadratic curve
     p.dash(x1, y1, x2, y2, lw, color, on, off, shift)      a dashed line
     p.star(x, y, r, color, rot)   the eight-point star
     p.rr(x, y, w, h, r, fill, stroke, lw)   a rounded rectangle (a picture kept per size and colour)

   Words inside the play area (HUD words are DOM, js/kit/ui.js)
     p.text(str, x, y, { font, fill, stroke, lw, align, baseline })   a picture kept per string and style.
                                   font: '800 34px Nunito, system-ui, sans-serif' (px = game units).
                                   To grow or shrink words, scale the pen; do not change the font size every frame.
     p.measure(str, font)          -> width in units

   p.flush()                       throw every kept picture away
   p.stats()                       { sprites, pics, mb }

   A rotated p.rect has rough edges (the renderer has antialias off): paint it into a picture instead. */
(function () {
  'use strict';
  var Kit = window.Kit = window.Kit || {};

  Kit.pen = function (S) {
    var P = S.PIXI, layer = new P.Container(), pool = layer.children, n = 0, frame = 0;
    S.stage.addChild(layer);
    var WHITE = P.Texture.WHITE, EMPTY = P.Texture.EMPTY, M = new P.Matrix();
    var a = 1, b = 0, c = 0, d = 1, e = 0, f = 0, stack = [];
    var p = { layer: layer, alpha: 1, blend: 'normal', k: 1 };
    var lowMem = navigator.deviceMemory && navigator.deviceMemory <= 2;
    var CAP = (lowMem ? 20 : 40) * 1048576;

    // ---------- colours ----------
    var cols = {};
    function col(v) {
      if (typeof v === 'number') return v;
      var o = cols[v];
      if (!o) { var C = P.Color.shared.setValue(v == null ? '#fff' : v); o = cols[v] = { n: C.toNumber(), a: C.alpha }; }
      CA = o.a; return o.n;
    }
    var CA = 1;                     // the alpha of the colour last looked up

    // ---------- the pool ----------
    function slot(tex) {
      var sp = pool[n];
      if (!sp || !sp._pen) {
        sp = null;
        for (var i = n + 1; i < pool.length; i++) if (pool[i]._pen) { sp = pool[i]; break; }
        if (!sp) { sp = new P.Sprite(tex); sp._pen = 1; sp._b = 'normal'; }
        layer.addChildAt(sp, n);
      }
      if (sp.texture !== tex) sp.texture = tex;
      sp.visible = true; n++;
      return sp;
    }
    // place a sprite: (la 0 0 ld le lf) is its own matrix, inside the pen's
    function put(sp, la, ld, le, lf, tint, alpha) {
      var x = a * le + c * lf + e, y = b * le + d * lf + f;
      if (b === 0 && c === 0) {
        if (sp._m) { sp.skew.set(0, 0); sp.rotation = 0; sp._m = 0; }
        sp.position.set(x, y); sp.scale.set(a * la, d * ld);
      } else { sp.setFromMatrix(M.set(a * la, b * la, c * ld, d * ld, x, y)); sp._m = 1; }
      sp.tint = tint == null ? 0xffffff : tint;
      sp.alpha = alpha == null ? p.alpha : alpha;
      if (sp._b !== p.blend) { sp._b = p.blend; sp.blendMode = BLEND[p.blend] || 'normal'; }
    }
    // the same with a turn (cos, sin) in the sprite's own matrix
    function putR(sp, la, lb, lc, ld, le, lf, tint, alpha) {
      sp.setFromMatrix(M.set(a * la + c * lb, b * la + d * lb, a * lc + c * ld, b * lc + d * ld, a * le + c * lf + e, b * le + d * lf + f));
      sp._m = 1;
      sp.tint = tint == null ? 0xffffff : tint;
      sp.alpha = alpha == null ? p.alpha : alpha;
      if (sp._b !== p.blend) { sp._b = p.blend; sp.blendMode = BLEND[p.blend] || 'normal'; }
    }
    var BLEND = { normal: 'normal', 'source-over': 'normal', add: 'add', lighter: 'add', multiply: 'multiply', screen: 'screen' };

    // ---------- a frame ----------
    p.begin = function (color) {
      n = 0; frame++; a = d = 1; b = c = e = f = 0; stack.length = 0; p.alpha = 1; p.blend = 'normal';
      if (color != null) S.renderer.background.color = col(color);
    };
    p.end = function (show) {
      for (var i = n; i < pool.length; i++) { var o = pool[i]; if (o.visible) { o.visible = false; if (o._pen) o.texture = EMPTY; } }
      if (show !== false) S.render();
    };

    // ---------- where things go ----------
    p.save = function () { stack.push(a, b, c, d, e, f, p.alpha, p.blend); };
    p.restore = function () {
      if (!stack.length) return;
      p.blend = stack.pop(); p.alpha = stack.pop(); f = stack.pop(); e = stack.pop(); d = stack.pop(); c = stack.pop(); b = stack.pop(); a = stack.pop();
    };
    p.translate = function (x, y) { e += a * x + c * y; f += b * x + d * y; };
    p.scale = function (sx, sy) { if (sy == null) sy = sx; a *= sx; b *= sx; c *= sy; d *= sy; };
    p.rotate = function (r) {
      var co = Math.cos(r), si = Math.sin(r), na = a * co + c * si, nb = b * co + d * si;
      c = c * co - a * si; d = d * co - b * si; a = na; b = nb;
    };
    p.setTransform = function (a2, b2, c2, d2, e2, f2) { a = a2; b = b2; c = c2; d = d2; e = e2; f = f2; };
    p.transform = function (a2, b2, c2, d2, e2, f2) {
      var na = a * a2 + c * b2, nb = b * a2 + d * b2, nc = a * c2 + c * d2, nd = b * c2 + d * d2;
      e = a * e2 + c * f2 + e; f = b * e2 + d * f2 + f; a = na; b = nb; c = nc; d = nd;
    };
    function zoom() { return Math.sqrt(a * a + b * b); }       // device pixels per unit right now

    // ---------- kept pictures ----------
    var kept = new Map(), bytes = 0;
    function drop(t) {
      if (t._parts) { t._parts.forEach(function (q) { try { q.tex.destroy(false); } catch (err) {} q.tex = null; }); t._parts = null; }
      S.free(t);
    }
    function keep(key, t) {
      t.key = key; t.use = frame; t.bytes = t.w * t.h * 4;
      kept.set(key, t); bytes += t.bytes;
      if (bytes > CAP) kept.forEach(function (o, k2) {          // oldest first; never one used this frame or the last
        if (bytes > CAP * 0.8 && o.use < frame - 1) { kept.delete(k2); bytes -= o.bytes; drop(o); }
      });
      return t;
    }
    function got(key) { var t = kept.get(key); if (t) { if (t.tex) { t.use = frame; return t; } kept.delete(key); bytes -= t.bytes; } return null; }
    p.flush = function () { kept.forEach(drop); kept.clear(); bytes = 0; };
    p.unit = function (k) { if (!(k > 0)) return; if (Math.abs(k - p.k) / p.k > 0.02) { p.k = k; p.flush(); } };

    p.pic = function (key, w, h, paint, pad) {
      var t = got(key); if (t) return t;
      pad = pad || 0;
      var k = p.k, big = Math.max(w + pad * 2, h + pad * 2) * k;
      if (big > S.maxTex) k *= S.maxTex / big;
      t = S.paint((w + pad * 2) * k, (h + pad * 2) * k, function (ctx) { ctx.scale(k, k); ctx.translate(pad, pad); paint(ctx, w, h); });
      t.k = k; t.pad = pad; t.uw = w; t.uh = h;
      return keep(key, t);
    };
    p.wrap = function (key, make, pad) {
      var t = got(key); if (t) return t;
      var cv = make(p.k);
      if (pad == null) pad = cv.pad || 0;
      t = S.texture(cv);
      t.k = p.k; t.pad = pad; t.uw = t.w / p.k - pad * 2; t.uh = t.h / p.k - pad * 2;
      return keep(key, t);
    };
    p.part = function (t, x, y, w, h) {
      if (!t || !t.tex) return null;
      var key = x + ',' + y + ',' + w + ',' + h, parts = t._parts || (t._parts = new Map()), q = parts.get(key);
      if (!q) {
        // not rounded to whole pixels: pieces cut side by side must meet exactly when they are shown side by side
        var k = t.k || 1, pad = t.pad || 0, fx = (x + pad) * k, fy = (y + pad) * k;
        var fw = Math.max(0.01, Math.min(t.w - fx, w * k)), fh = Math.max(0.01, Math.min(t.h - fy, h * k));
        q = { tex: new P.Texture({ source: t.tex.source, frame: new P.Rectangle(fx, fy, fw, fh) }), w: fw, h: fh, k: k, pad: 0, uw: w, uh: h };
        parts.set(key, q);
      }
      return q;
    };
    p.img = function (t, x, y, w, h, tint) {
      if (!t || !t.tex) return;
      var uw = t.uw != null ? t.uw : t.w, uh = t.uh != null ? t.uh : t.h, k = t.k || 1, pad = t.pad || 0;
      if (w == null) { w = uw; h = uh; }
      var sx = w / uw, sy = h / uh, tn = null, al = null;
      if (tint != null) { tn = col(tint); if (typeof tint !== 'number') al = p.alpha * CA; }
      put(slot(t.tex), sx / k, sy / k, x - pad * sx, y - pad * sy, tn, al);
    };
    p.add = function (obj) {
      if (pool[n] !== obj) layer.addChildAt(obj, Math.min(n, pool.length));
      n++;
      obj.visible = true; obj.alpha = p.alpha;
      obj.setFromMatrix(M.set(a, b, c, d, e, f));
    };

    // ---------- shared white shapes ----------
    // Painted white at a few sizes and tinted. The size nearest above what is on screen is used, so edges stay
    // smooth without a picture per size. They do not depend on p.unit.
    var shapes = {}, SIZES = [8, 16, 32, 64, 128, 256, 512];
    function bucket(px) { for (var i = 0; i < SIZES.length; i++) if (SIZES[i] >= px) return SIZES[i]; return 512; }
    function shape(name, px, paint) {
      var s = bucket(px), key = name + '|' + s, t = shapes[key];
      if (!t || !t.tex) {
        t = shapes[key] = S.paint(s + 2, s + 2, function (ctx) { ctx.translate(1, 1); ctx.fillStyle = ctx.strokeStyle = '#fff'; paint(ctx, s); });
        t.s = s;
      }
      return t;
    }
    // show a shape whose core (s by s pixels, with a 1 pixel margin) covers x..x+w, y..y+h
    function stamp(t, x, y, w, h, color) {
      var tn = col(color), al = typeof color === 'number' ? p.alpha : p.alpha * CA, sx = w / t.s, sy = h / t.s;
      put(slot(t.tex), sx, sy, x - sx, y - sy, tn, al);
    }
    function disc(ctx, s) { ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2, 0, 6.2832); ctx.fill(); }
    function star8(ctx, s) {
      ctx.beginPath();
      for (var i = 0; i < 16; i++) { var an = i * Math.PI / 8, q = (i % 2 ? 0.62 : 1) * s / 2; ctx.lineTo(s / 2 + Math.cos(an) * q, s / 2 + Math.sin(an) * q); }
      ctx.closePath(); ctx.fill();
    }

    p.rect = function (x, y, w, h, color) {
      var tn = col(color), al = typeof color === 'number' ? p.alpha : p.alpha * CA;
      put(slot(WHITE), w / WHITE.width, h / WHITE.height, x, y, tn, al);
    };
    p.circle = function (x, y, r, color) {
      if (!(r > 0)) return;
      stamp(shape('disc', r * 2 * zoom(), disc), x - r, y - r, r * 2, r * 2, color);
    };
    p.ellipse = function (x, y, rx, ry, color, rot) {
      if (!(rx > 0 && ry > 0)) return;
      var t = shape('disc', Math.max(rx, ry) * 2 * zoom(), disc);
      if (!rot) { stamp(t, x - rx, y - ry, rx * 2, ry * 2, color); return; }
      var tn = col(color), al = typeof color === 'number' ? p.alpha : p.alpha * CA;
      var co = Math.cos(rot), si = Math.sin(rot), sx = rx * 2 / t.s, sy = ry * 2 / t.s, ox = -rx - sx, oy = -ry - sy;
      putR(slot(t.tex), co * sx, si * sx, -si * sy, co * sy, x + co * ox - si * oy, y + si * ox + co * oy, tn, al);
    };
    p.ring = function (x, y, r, lw, color) {
      if (!(r > 0 && lw > 0)) return;
      var R = r + lw / 2, q = Math.max(1, Math.min(20, Math.round(lw / R * 20)));
      var t = shape('ring' + q, R * 2 * zoom(), function (ctx, s) {
        var w2 = s / 2 * q / 20; ctx.lineWidth = w2; ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - w2 / 2, 0, 6.2832); ctx.stroke();
      });
      stamp(t, x - R, y - R, R * 2, R * 2, color);
    };
    p.glow = function (x, y, r, color, r0) {
      if (!(r > 0)) return;
      var q = Math.max(0, Math.min(7, Math.round((r0 || 0) / r * 8))), key = 'glow' + q, t = shapes[key];
      if (!t || !t.tex) {
        t = shapes[key] = S.paint(130, 130, function (ctx) {
          var g = ctx.createRadialGradient(65, 65, 64 * q / 8, 65, 65, 64);
          g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g; ctx.fillRect(0, 0, 130, 130);
        });
        t.s = 128;
      }
      stamp(t, x - r, y - r, r * 2, r * 2, color);
    };
    p.star = function (x, y, r, color, rot) {
      if (!(r > 0)) return;
      var t = shape('star', r * 2 * zoom(), star8);
      if (!rot) { stamp(t, x - r, y - r, r * 2, r * 2, color); return; }
      var tn = col(color), al = typeof color === 'number' ? p.alpha : p.alpha * CA;
      var co = Math.cos(rot), si = Math.sin(rot), sc = r * 2 / t.s, o = -r - sc;
      putR(slot(t.tex), co * sc, si * sc, -si * sc, co * sc, x + co * o - si * o, y + si * o + co * o, tn, al);
    };
    // a line: a white strip with soft long edges, turned to lie from one point to the other
    p.line = function (x1, y1, x2, y2, lw, color, round) {
      var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy);
      if (round) { p.circle(x1, y1, lw / 2, color); if (L > 0) p.circle(x2, y2, lw / 2, color); }
      if (!(L > 0 && lw > 0)) return;
      var s = bucket(lw * zoom()), key = 'line|' + s, t = shapes[key];
      if (!t || !t.tex) { t = shapes[key] = S.paint(2, s + 2, function (ctx) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 1, 2, s); }); t.s = s; }
      var tn = col(color), al = typeof color === 'number' ? p.alpha : p.alpha * CA;
      var co = dx / L, si = dy / L, sx = L / 2, sy = lw / s, oy = -lw / 2 - sy;
      putR(slot(t.tex), co * sx, si * sx, -si * sy, co * sy, x1 - si * oy, y1 + co * oy, tn, al);
    };
    // a line through many points: pts is [x0, y0, x1, y1, ...]
    p.path = function (pts, lw, color, round) {
      var joint = lw * zoom() > 2.5;
      for (var i = 0; i + 3 < pts.length; i += 2) {
        p.line(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], lw, color, false);
        if (joint && (round || i > 0)) p.circle(pts[i], pts[i + 1], lw / 2, color);
      }
      if (round && joint && pts.length >= 4) p.circle(pts[pts.length - 2], pts[pts.length - 1], lw / 2, color);
    };
    var PTS = [];
    p.arc = function (x, y, r, a0, a1, lw, color, round) {
      var n = Math.max(2, Math.ceil(Math.abs(a1 - a0) * Math.max(4, Math.sqrt(r * zoom())) / 2));
      PTS.length = 0;
      for (var i = 0; i <= n; i++) { var an = a0 + (a1 - a0) * i / n; PTS.push(x + Math.cos(an) * r, y + Math.sin(an) * r); }
      p.path(PTS, lw, color, round);
    };
    p.curve = function (x1, y1, cx, cy, x2, y2, lw, color, round) {
      var n = 12; PTS.length = 0;
      for (var i = 0; i <= n; i++) { var u = i / n, v = 1 - u; PTS.push(v * v * x1 + 2 * v * u * cx + u * u * x2, v * v * y1 + 2 * v * u * cy + u * u * y2); }
      p.path(PTS, lw, color, round);
    };
    p.dash = function (x1, y1, x2, y2, lw, color, on, off, shift) {
      var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy), per = on + off;
      if (!(L > 0 && per > 0)) return;
      var ux = dx / L, uy = dy / L, s = -(((shift || 0) % per) + per) % per;
      for (; s < L; s += per) {
        var q0 = Math.max(0, s), q1 = Math.min(L, s + on);
        if (q1 > q0) p.line(x1 + ux * q0, y1 + uy * q0, x1 + ux * q1, y1 + uy * q1, lw, color, false);
      }
    };
    p.rr = function (x, y, w, h, r, fill, stroke, lw) {
      if (!(w > 0 && h > 0)) return;
      var k = p.k, qw = Math.round(w * k) / k, qh = Math.round(h * k) / k, pad = stroke ? (lw || 1) / 2 + 1 : 1;
      var t = p.pic('rr|' + qw + '|' + qh + '|' + r + '|' + fill + '|' + (stroke || '') + '|' + (lw || 0), qw, qh, function (ctx) {
        var q = Math.max(0, Math.min(r, qw / 2, qh / 2));
        ctx.beginPath(); ctx.moveTo(q, 0); ctx.arcTo(qw, 0, qw, qh, q); ctx.arcTo(qw, qh, 0, qh, q); ctx.arcTo(0, qh, 0, 0, q); ctx.arcTo(0, 0, qw, 0, q); ctx.closePath();
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
      }, pad);
      p.img(t, x, y, w, h);
    };

    // ---------- words ----------
    var scratch = null;
    function sctx() { return scratch || (scratch = document.createElement('canvas').getContext('2d')); }
    p.measure = function (str, font) { var g = sctx(); g.font = font; return g.measureText('' + str).width; };
    p.text = function (str, x, y, o) {
      str = '' + str;
      var align = o.align || 'center', base = o.baseline || 'middle', lw = o.stroke ? (o.lw || 0) : 0;
      var key = 'T|' + str + '|' + o.font + '|' + o.fill + '|' + (o.stroke || '') + '|' + lw + '|' + align + '|' + base;
      var t = got(key);
      if (!t) {
        var m = /([\d.]+)px/.exec(o.font), size = m ? +m[1] : 16, g = sctx();
        g.font = o.font;
        var tw = g.measureText(str).width, pd = lw / 2 + size * 0.18 + 2, W = tw + pd * 2, asc = size * 1.05, H = asc + size * 0.42 + pd * 2;
        var ox = align === 'left' || align === 'start' ? pd : align === 'right' || align === 'end' ? W - pd : W / 2;
        var oy = base === 'middle' ? H / 2 : base === 'top' || base === 'hanging' ? pd : base === 'bottom' ? H - pd : pd + asc;
        var k = p.k, big = Math.max(W, H) * k;
        if (big > S.maxTex) k *= S.maxTex / big;
        t = S.paint(W * k, H * k, function (ctx) {
          ctx.scale(k, k); ctx.font = o.font; ctx.textAlign = align; ctx.textBaseline = base; ctx.lineJoin = 'round';
          if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = o.stroke; ctx.strokeText(str, ox, oy); }
          ctx.fillStyle = o.fill || '#fff'; ctx.fillText(str, ox, oy);
        });
        t.k = k; t.pad = 0; t.uw = W; t.uh = H; t.ox = ox; t.oy = oy;
        keep(key, t);
      }
      var lx = x - t.ox, ly = y - t.oy;
      if (b === 0 && c === 0 && a > 0 && d > 0) {              // words that stand still sit on whole pixels: sharp
        lx = (Math.round(a * lx + e) - e) / a; ly = (Math.round(d * ly + f) - f) / d;
      }
      put(slot(t.tex), 1 / t.k, 1 / t.k, lx, ly, null, null);
    };

    p.stats = function () { return { sprites: pool.length, pics: kept.size, mb: Math.round(bytes / 104857.6) / 10 }; };

    // the chip dropped every texture: the surface has freed them, forget them here so they are made again
    S.onLost(function () { kept.clear(); bytes = 0; shapes = {}; });
    return p;
  };
})();
