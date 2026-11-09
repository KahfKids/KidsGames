/* Solar System: render.js
   All art is drawn in code, offline: procedural planet textures, per-pixel lit spheres (sun-lit terminator,
   rim light, atmosphere, ocean glint, spinning surfaces), Saturn's vector rings with the planet's shadow,
   the glowing Sun, asteroid rocks, and a starfield with the Milky Way. Exposes window.SolarArt. */
(function () {
  'use strict';
  var A = window.SolarArt = {};
  var TAU = Math.PI * 2;

  // ---------- helpers ----------
  function rng(seed) { // mulberry32
    var a = seed >>> 0;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  A.rng = rng;
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; }
  A.canvas = canvas;
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function smooth(a, b, v) { var t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); }
  A.smooth = smooth;

  // ---------- 3D value noise (seamless on a sphere because we sample it in 3D) ----------
  var perm = new Uint8Array(512), val = new Float32Array(256);
  (function () {
    var r = rng(20261108), p = [], i;
    for (i = 0; i < 256; i++) { p[i] = i; val[i] = r(); }
    for (i = 255; i > 0; i--) { var j = (r() * (i + 1)) | 0, t = p[i]; p[i] = p[j]; p[j] = t; }
    for (i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();
  function noise(x, y, z) {
    var X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    var fx = x - X, fy = y - Y, fz = z - Z;
    X &= 255; Y &= 255; Z &= 255;
    var u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
    var a = perm[X] + Y, aa = perm[a] + Z, ab = perm[a + 1] + Z, b = perm[X + 1] + Y, ba = perm[b] + Z, bb = perm[b + 1] + Z;
    var x1 = val[perm[aa]] + (val[perm[ba]] - val[perm[aa]]) * u;
    var x2 = val[perm[ab]] + (val[perm[bb]] - val[perm[ab]]) * u;
    var x3 = val[perm[aa + 1]] + (val[perm[ba + 1]] - val[perm[aa + 1]]) * u;
    var x4 = val[perm[ab + 1]] + (val[perm[bb + 1]] - val[perm[ab + 1]]) * u;
    var y1 = x1 + (x2 - x1) * v, y2 = x3 + (x4 - x3) * v;
    return y1 + (y2 - y1) * w;
  }
  function fbm(x, y, z, oct) {
    var s = 0, amp = 0.5, tot = 0;
    for (var i = 0; i < oct; i++) { s += noise(x, y, z) * amp; tot += amp; x = x * 2.03 + 17.1; y = y * 2.03 + 3.7; z = z * 2.03 + 9.3; amp *= 0.5; }
    return s / tot;
  }
  A.noise = noise; A.fbm = fbm;

  // ---------- textures (equirectangular, made a few rows at a time so the first frame is instant) ----------
  // A body's tex(): { w, h, gen(T, i, x, y, z, lat, lon), extra: ['cloud', ...], base: [r,g,b] }
  A.makeTexture = function (spec) {
    var T = { w: spec.w, h: spec.h, rgb: new Uint8Array(spec.w * spec.h * 3), row: 0, ready: false, gen: spec.gen, base: spec.base };
    (spec.extra || []).forEach(function (k) { T[k] = new Uint8Array(spec.w * spec.h); });
    if (spec.init) spec.init(T);
    return T;
  };
  // Fill rows until the time budget (ms) is spent. Returns true when the texture is complete.
  A.pumpTexture = function (T, ms) {
    if (T.ready) return true;
    var t0 = performance.now(), w = T.w, h = T.h;
    while (T.row < h) {
      var row = T.row, lat = (0.5 - (row + 0.5) / h) * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat);
      for (var col = 0; col < w; col++) {
        var lon = (col + 0.5) / w * TAU;
        T.gen(T, row * w + col, cl * Math.sin(lon), sl, cl * Math.cos(lon), lat, lon);
      }
      T.row++;
      if (performance.now() - t0 > ms) break;
    }
    if (T.row >= h) T.ready = true;
    return T.ready;
  };

  // ---------- lit sphere sprites ----------
  // Each body has a fixed "picture frame" basis (its north pole tipped toward the viewer, rolled by its tilt), so
  // every pixel's texture coordinate can be precomputed once per sprite size. Rendering a frame is then just a
  // texture fetch plus lighting per pixel.
  A.bodyBasis = function (viewTilt, tilt) {
    var vt = viewTilt * Math.PI / 180, ta = tilt * Math.PI / 180, ct = Math.cos(ta), st = Math.sin(ta);
    function rot(v) { return [v[0] * ct - v[1] * st, v[0] * st + v[1] * ct, v[2]]; }
    return { X: rot([1, 0, 0]), Y: rot([0, -Math.cos(vt), Math.sin(vt)]), Z: rot([0, Math.sin(vt), Math.cos(vt)]) };
  };
  var SIZES = [6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 448, 512];
  A.spriteSize = function (need, cap) {
    for (var i = 0; i < SIZES.length; i++) if (SIZES[i] >= need || SIZES[i] >= cap) return Math.min(SIZES[i], cap);
    return cap;
  };
  function buildTable(basis, D, TW, TH) {
    var R = D / 2 - 1, c = D / 2, n = 0, cap = D * D;
    var pix = new Int32Array(cap), nx = new Float32Array(cap), ny = new Float32Array(cap), nz = new Float32Array(cap);
    var tu = new Float32Array(cap), tv = new Float32Array(cap), aa = new Float32Array(cap);
    var X = basis.X, Y = basis.Y, Z = basis.Z;
    for (var py = 0; py < D; py++) for (var px = 0; px < D; px++) {
      var a = (px + 0.5 - c) / R, b = (py + 0.5 - c) / R, rho = Math.sqrt(a * a + b * b);
      if (rho > 1 + 1 / R) continue;
      var al = clamp01((1 - rho) * R + 0.5);
      if (rho > 1) { a /= rho; b /= rho; }
      var z = Math.sqrt(Math.max(0, 1 - a * a - b * b));
      var bx = a * X[0] + b * X[1] + z * X[2], by = a * Y[0] + b * Y[1] + z * Y[2], bz = a * Z[0] + b * Z[1] + z * Z[2];
      var lat = Math.asin(Math.max(-1, Math.min(1, by))), lon = Math.atan2(bx, bz);
      var u = (lon / TAU + 1) % 1 * TW;
      pix[n] = py * D + px; nx[n] = a; ny[n] = b; nz[n] = z; aa[n] = al;
      tu[n] = u >= TW ? 0 : u; tv[n] = Math.max(0, Math.min(TH - 1.001, (0.5 - lat / Math.PI) * TH - 0.5));
      n++;
    }
    return { n: n, pix: pix, nx: nx, ny: ny, nz: nz, tu: tu, tv: tv, aa: aa };
  }

  // Per-pixel shading terms that depend only on where the pixel sits on the disc (not on the light or the spin):
  // the square roots, worked out once per sprite with exactly the same arithmetic the per-frame loop used to repeat.
  function shadeTable(tab, K) {
    var n = tab.n, NZ = tab.nz, k, z, a = new Float64Array(n);
    if (K.sun) { for (k = 0; k < n; k++) a[k] = 0.5 + 0.5 * Math.sqrt(NZ[k]); tab.sl = a; return; }
    var limb = K.limb;
    if (!limb) return;
    for (k = 0; k < n; k++) { z = NZ[k]; a[k] = 1 - limb + limb * Math.sqrt(z); }
    tab.ld = a;
  }

  // Shading styles per kind of world.
  var KIND = {
    rock:  { amb: 0.08, atm: null, limb: 0, rim: 0.5 },
    haze:  { amb: 0.07, atm: [255, 214, 150], atmK: 0.55, limb: 0.25, rim: 0.5 },
    earth: { amb: 0.06, atm: [110, 170, 255], atmK: 0.85, limb: 0, rim: 0.6, spec: 1 },
    gas:   { amb: 0.07, atm: [255, 236, 200], atmK: 0.35, limb: 0.3, rim: 0.55 },
    ice:   { amb: 0.07, atm: [170, 230, 255], atmK: 0.6, limb: 0.3, rim: 0.6 },
    sun:   { sun: 1 }
  };

  // body: { tex, basis, kind, spinT (texels offset), cloudT }. L: light direction in screen space [x right, y down, z to viewer].
  A.renderSphere = function (spr, body, L, spinOff, cloudOff, time) {
    var T = body.texture, D = spr.D;
    var K = KIND[body.kind] || KIND.rock, out = spr.u32;
    if (!spr.tab || spr.tabFor !== T.w + 'x' + T.h) {
      spr.tab = buildTable(body.basis, D, T.w, T.h); spr.tabFor = T.w + 'x' + T.h;
      shadeTable(spr.tab, K);
      out.fill(0); // only the disc's pixels are written below, and always the same ones, so the rest stays clear
    }
    var tab = spr.tab, n = tab.n, pix = tab.pix, NX = tab.nx, NY = tab.ny, NZ = tab.nz, TU = tab.tu, TV = tab.tv, AA = tab.aa;
    var TW = T.w, TH = T.h, rgb = T.rgb, ready = T.ready;
    var br = T.base[0], bg = T.base[1], bb = T.base[2];
    var bil = D > 100 && ready;
    var off = ((spinOff % TW) + TW) % TW, coff = ((cloudOff % TW) + TW) % TW;
    var cloud = ready ? T.cloud : null, ocean = ready ? T.ocean : null, lights = ready ? T.lights : null;
    var i, k, u, v, u0, u1, v0, v1, fu, fv, i00, i10, i01, i11, r, g, b;

    if (K.sun) {
      var SL = tab.sl;
      for (k = 0; k < n; k++) {
        u = TU[k] + off; if (u >= TW) u -= TW;
        if (ready) { i = ((TV[k] | 0) * TW + (u | 0)) * 3; r = rgb[i]; g = rgb[i + 1]; b = rgb[i + 2]; } else { r = br; g = bg; b = bb; }
        var zc = NZ[k], limbS = SL[k], hot = zc * zc * zc * 70;
        r = r * limbS + hot + 25 * (1 - zc); g = g * limbS * (0.85 + 0.15 * zc) + hot; b = b * limbS * (0.7 + 0.3 * zc) + hot * 0.6;
        var al = AA[k];
        out[pix[k]] = ((al * 255) << 24) | ((b > 255 ? 255 : b) << 16) | ((g > 255 ? 255 : g) << 8) | (r > 255 ? 255 : r);
      }
      spr.ctx.putImageData(spr.img, 0, 0);
      return;
    }

    var Lx = L[0], Ly = L[1], Lz = L[2];
    var hx = Lx, hy = Ly, hz = Lz + 1, hl = Math.sqrt(hx * hx + hy * hy + hz * hz) || 1; hx /= hl; hy /= hl; hz /= hl;
    var amb = K.amb, atm = K.atm, atmK = K.atmK || 0, limb = K.limb, rimK = K.rim, spec = K.spec;
    var LD = tab.ld;
    for (k = 0; k < n; k++) {
      u = TU[k] + off; if (u >= TW) u -= TW;
      v = TV[k];
      if (!ready) { r = br; g = bg; b = bb; }
      else if (bil) {
        u0 = u | 0; fu = u - u0; u1 = u0 + 1; if (u1 >= TW) u1 = 0;
        v0 = v | 0; fv = v - v0; v1 = v0 + 1; if (v1 >= TH) v1 = TH - 1;
        i00 = (v0 * TW + u0) * 3; i10 = (v0 * TW + u1) * 3; i01 = (v1 * TW + u0) * 3; i11 = (v1 * TW + u1) * 3;
        var w00 = (1 - fu) * (1 - fv), w10 = fu * (1 - fv), w01 = (1 - fu) * fv, w11 = fu * fv;
        r = rgb[i00] * w00 + rgb[i10] * w10 + rgb[i01] * w01 + rgb[i11] * w11;
        g = rgb[i00 + 1] * w00 + rgb[i10 + 1] * w10 + rgb[i01 + 1] * w01 + rgb[i11 + 1] * w11;
        b = rgb[i00 + 2] * w00 + rgb[i10 + 2] * w10 + rgb[i01 + 2] * w01 + rgb[i11 + 2] * w11;
      } else { i = ((v | 0) * TW + (u | 0)) * 3; r = rgb[i]; g = rgb[i + 1]; b = rgb[i + 2]; }

      var x = NX[k], y = NY[k], z = NZ[k];
      var d = x * Lx + y * Ly + z * Lz;
      // soft terminator (a band, not a line) times a gentle Lambert falloff
      var ts = (d + 0.14) / 0.42; ts = ts < 0 ? 0 : ts > 1 ? 1 : ts; ts = ts * ts * (3 - 2 * ts);
      var dl = d < 0 ? 0 : d;
      var lam = ts * (0.55 + 0.5 * Math.sqrt(dl));
      var ti = (v | 0) * TW + (u | 0), cA = 0, oce = 0;
      if (cloud) {
        var cu = TU[k] + coff; if (cu >= TW) cu -= TW;
        if (bil) {
          var c0 = cu | 0, cf = cu - c0, c1 = c0 + 1; if (c1 >= TW) c1 = 0;
          var r0 = (v | 0) * TW, r1 = v1 * TW;
          cA = ((cloud[r0 + c0] * (1 - cf) + cloud[r0 + c1] * cf) * (1 - fv) + (cloud[r1 + c0] * (1 - cf) + cloud[r1 + c1] * cf) * fv) / 255;
        } else cA = cloud[(v | 0) * TW + (cu | 0)] / 255;
        oce = ocean[ti] / 255;
      }
      if (limb) { var ld = LD[k]; r *= ld; g *= ld; b *= ld; }
      if (cA > 0) { r += (248 - r) * cA; g += (250 - g) * cA; b += (255 - b) * cA; }
      var sh = amb + lam;
      r = r * sh; g = g * sh; b = b * (sh + amb * 0.6);
      var e1 = 1 - z;
      if (atm) {
        var a2 = d + 0.35; a2 = a2 < 0 ? 0 : a2 > 1 ? 1 : a2;
        var f = e1 * e1 * a2 * atmK;
        r += atm[0] * f; g += atm[1] * f; b += atm[2] * f;
      }
      if (spec && oce > 0 && d > 0) {
        var sp = x * hx + y * hy + z * hz;
        if (sp > 0.9) { sp = Math.pow(sp, 50) * 130 * oce * (1 - cA); r += sp; g += sp; b += sp * 0.9; }
      }
      if (lights && d < 0.05) {
        var lt = lights[ti];
        if (lt) { var lk = (lt / 255) * (1 - cA) * Math.min(1, (0.05 - d) * 6); r += 255 * lk; g += 190 * lk; b += 90 * lk; }
      }
      // cool rim light on the shadowed edge so dark limbs separate from black space
      var rm = e1 * e1 * e1 * e1 * rimK * (1 - lam);
      r += 60 * rm; g += 90 * rm; b += 160 * rm;
      var al2 = AA[k];
      out[pix[k]] = ((al2 * 255) << 24) | ((b > 255 ? 255 : b) << 16) | ((g > 255 ? 255 : g) << 8) | (r > 255 ? 255 : r);
    }
    spr.ctx.putImageData(spr.img, 0, 0);
  };
  A.newSprite = function (D) {
    var c = canvas(D, D), ctx = c.getContext('2d'), img = ctx.createImageData(D, D);
    return { D: D, canvas: c, ctx: ctx, img: img, u32: new Uint32Array(img.data.buffer), tab: null, tabFor: '', t: -1, L: null };
  };

  // ---------- Saturn's rings (vector, crisp at any zoom) ----------
  // ring stops: [radius in planet radii, r, g, b, alpha]
  var RING = [[1.22, 120, 105, 90, 0], [1.26, 140, 125, 105, 0.18], [1.5, 160, 140, 115, 0.3], [1.53, 215, 195, 160, 0.8],
    [1.7, 232, 214, 178, 0.92], [1.86, 240, 222, 186, 0.95], [1.94, 220, 200, 165, 0.85], [1.955, 60, 50, 45, 0.08],
    [2.02, 60, 50, 45, 0.1], [2.035, 205, 188, 155, 0.7], [2.17, 215, 198, 165, 0.75], [2.18, 80, 70, 60, 0.15],
    [2.195, 200, 182, 150, 0.65], [2.26, 190, 172, 140, 0.55], [2.3, 170, 155, 130, 0]];
  A.RING_IN = 1.22; A.RING_OUT = 2.3;
  // half: 'back' (behind the planet) or 'front'. X/Y/Z: the body basis (screen space). L: light (screen space).
  A.drawRing = function (ctx, sx, sy, R, basis, L, half) {
    var X = basis.X, Z = basis.Z, Y = basis.Y;
    var nd0 = X[2], nd1 = Z[2], nl = Math.hypot(nd0, nd1);
    ctx.save();
    ctx.transform(X[0] * R, X[1] * R, Z[0] * R, Z[1] * R, sx, sy);
    if (nl > 1e-4) {
      var n0 = nd0 / nl, n1 = nd1 / nl, p0 = -n1, p1 = n0, B = 4, s = half === 'back' ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(p0 * B, p1 * B); ctx.lineTo(p0 * B + s * n0 * B, p1 * B + s * n1 * B);
      ctx.lineTo(-p0 * B + s * n0 * B, -p1 * B + s * n1 * B); ctx.lineTo(-p0 * B, -p1 * B); ctx.closePath();
      ctx.clip();
    } else if (half === 'back') { ctx.restore(); return; }
    // light in ring space: in-plane (lx, lz) and out-of-plane ly; the face we see may be the unlit one
    var lx = L[0] * X[0] + L[1] * X[1] + L[2] * X[2], lz = L[0] * Z[0] + L[1] * Z[1] + L[2] * Z[2], ly = L[0] * Y[0] + L[1] * Y[1] + L[2] * Y[2];
    var lit = ly * Y[2] >= 0 ? 1 : 0.5, bright = 0.55 + 0.45 * Math.min(1, Math.abs(ly) * 2.2);
    var g = ctx.createRadialGradient(0, 0, A.RING_IN, 0, 0, A.RING_OUT), span = A.RING_OUT - A.RING_IN;
    RING.forEach(function (s) {
      var k = bright * lit;
      g.addColorStop((s[0] - A.RING_IN) / span, 'rgba(' + Math.round(s[1] * k) + ',' + Math.round(s[2] * k) + ',' + Math.round(s[3] * k) + ',' + (s[4] * (lit < 1 ? 0.75 : 1)) + ')');
    });
    ctx.beginPath(); ctx.arc(0, 0, A.RING_OUT, 0, TAU); ctx.arc(0, 0, A.RING_IN, 0, TAU, true);
    ctx.fillStyle = g; ctx.fill();
    // the planet's shadow falls across the rings on the side away from the Sun
    var pl = Math.hypot(lx, lz);
    if (pl > 1e-3) {
      ctx.clip();
      var ang = Math.atan2(-lz, -lx), a = Math.min(12, 1 / Math.max(0.08, Math.abs(ly)));
      ctx.beginPath(); ctx.ellipse(0, 0, a, 1, ang, -Math.PI / 2, Math.PI / 2); ctx.closePath();
      ctx.fillStyle = 'rgba(4,4,12,.62)'; ctx.fill();
    }
    ctx.restore();
  };

  // ---------- the Sun's glow and rays ----------
  var glowImg = null, raysImg = null;
  A.sunGlow = function () {
    if (glowImg) return glowImg;
    var S = 256, c = canvas(S, S), g = c.getContext('2d'), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, 'rgba(255,246,220,1)'); gr.addColorStop(0.16, 'rgba(255,214,120,.75)'); gr.addColorStop(0.3, 'rgba(255,160,60,.32)');
    gr.addColorStop(0.55, 'rgba(255,110,40,.1)'); gr.addColorStop(1, 'rgba(255,90,30,0)');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    return (glowImg = c);
  };
  A.sunRays = function () {
    if (raysImg) return raysImg;
    var S = 512, c = canvas(S, S), g = c.getContext('2d'), r = rng(42);
    g.translate(S / 2, S / 2); g.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 22; i++) {
      var a = i / 22 * TAU + r() * 0.2, len = S * (0.3 + r() * 0.2), wdt = 0.03 + r() * 0.05;
      var gr = g.createRadialGradient(0, 0, S * 0.08, 0, 0, len);
      gr.addColorStop(0, 'rgba(255,220,150,.35)'); gr.addColorStop(1, 'rgba(255,170,80,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0);
      g.arc(0, 0, len, a - wdt, a + wdt); g.closePath(); g.fill();
    }
    return (raysImg = c);
  };

  // ---------- asteroid rocks (lit from +x; rotate toward the Sun when drawing) ----------
  var rocks = null;
  A.rocks = function () {
    if (rocks) return rocks;
    rocks = [];
    for (var v = 0; v < 6; v++) {
      var S = 40, c = canvas(S, S), g = c.getContext('2d'), r = rng(300 + v), pts = [];
      for (var i = 0; i < 9; i++) { var a = i / 9 * TAU, q = S * (0.3 + r() * 0.14); pts.push([S / 2 + Math.cos(a) * q, S / 2 + Math.sin(a) * q * (0.75 + r() * 0.25)]); }
      g.beginPath(); pts.forEach(function (p, i) { i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.closePath();
      var tone = [[150, 135, 120], [125, 115, 105], [160, 140, 110], [110, 100, 95], [140, 125, 115], [170, 150, 125]][v];
      var gr = g.createLinearGradient(S * 0.85, 0, S * 0.15, 0);
      gr.addColorStop(0, 'rgb(' + tone.map(function (t) { return Math.min(255, t + 70); }).join(',') + ')');
      gr.addColorStop(0.45, 'rgb(' + tone.join(',') + ')');
      gr.addColorStop(1, 'rgb(' + tone.map(function (t) { return Math.round(t * 0.22); }).join(',') + ')');
      g.fillStyle = gr; g.fill();
      g.save(); g.clip();
      for (var k = 0; k < 4; k++) { g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(S * (0.3 + r() * 0.4), S * (0.3 + r() * 0.4), S * (0.04 + r() * 0.06), 0, TAU); g.fill(); }
      g.restore();
      rocks.push(c);
    }
    return rocks;
  };

  // ---------- sky: Milky Way panorama + star lists in "sky space" (wraps horizontally) ----------
  // Built for a given screen; SW x SH sky-space px. Returns { pano, pw, ph, scale, stars, bright, SW, SH }.
  A.buildSky = function (minDim, maxDim) {
    var SW = Math.round(2.7 * maxDim), SH = Math.round(maxDim * 1.9), r = rng(7);
    var q = 3, pw = Math.ceil(SW / q), ph = Math.ceil(SH / q), pc = canvas(pw, ph), g = pc.getContext('2d');
    var amp = ph * 0.2, phase = 1.3;
    function bandY(x) { return ph * 0.5 + amp * Math.sin(x / pw * TAU + phase) + amp * 0.25 * Math.sin(x / pw * TAU * 2 + 0.4); }
    A._bandY = function (sx) { return bandY(sx / q) * q; };
    function blob(x, y, rad, col, a, mode) {
      for (var dx = -pw; dx <= pw; dx += pw) {
        if (x + dx < -rad || x + dx > pw + rad) continue;
        var gr = g.createRadialGradient(x + dx, y, 0, x + dx, y, rad);
        gr.addColorStop(0, 'rgba(' + col + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)');
        g.globalCompositeOperation = mode || 'lighter'; g.fillStyle = gr; g.fillRect(x + dx - rad, y - rad, rad * 2, rad * 2);
      }
    }
    // faint nebula clouds far from the band
    for (var i = 0; i < 9; i++) blob(r() * pw, r() * ph, ph * (0.12 + r() * 0.2), ['90,60,150', '40,90,140', '120,50,110', '30,70,120'][i % 4], 0.07 + r() * 0.05);
    // the Milky Way band: broad glow, bright knots, then a darker dust lane down the middle
    for (i = 0; i < 70; i++) { var x = r() * pw; blob(x, bandY(x) + (r() - 0.5) * amp * 0.5, ph * (0.07 + r() * 0.1), r() < 0.5 ? '120,130,200' : '160,130,190', 0.08 + r() * 0.06); }
    for (i = 0; i < 90; i++) { x = r() * pw; blob(x, bandY(x) + (r() - 0.5) * amp * 0.3, ph * (0.02 + r() * 0.045), r() < 0.6 ? '230,215,255' : '255,220,185', 0.08 + r() * 0.1); }
    for (i = 0; i < 60; i++) { x = r() * pw; blob(x, bandY(x) + (r() - 0.5) * amp * 0.12, ph * (0.012 + r() * 0.03), '6,6,20', 0.3 + r() * 0.25, 'source-over'); }
    g.globalCompositeOperation = 'source-over';
    // halve it: averaging removes the gradient dither that would show as a dot grid when scaled up
    var hc = canvas(Math.ceil(pw / 2), Math.ceil(ph / 2)), hg = hc.getContext('2d');
    hg.imageSmoothingQuality = 'high'; hg.drawImage(pc, 0, 0, hc.width, hc.height);
    // stars: denser near the band
    var stars = [], bright = [];
    var N = Math.round(SW * SH / 1700);
    for (i = 0; i < N; i++) {
      var sx = r() * SW, sy;
      if (r() < 0.45) sy = bandY(sx / q) * q + (r() + r() + r() - 1.5) * amp * q * 0.55; else sy = r() * SH;
      var m = r(), col = m < 0.15 ? '#ffd9b0' : m < 0.3 ? '#bcd2ff' : '#ffffff';
      var s = r() < 0.03 ? 2.2 + r() * 1.2 : 0.6 + r() * r() * 1.6;
      var st = { x: sx, y: sy, s: s, a: 0.35 + r() * 0.65, c: col, ph: r() * TAU, tw: 0.6 + r() * 2 };
      (s > 2 ? bright : stars).push(st);
    }
    return { pano: hc, pw: hc.width, ph: hc.height, q: q * 2, stars: stars, bright: bright, SW: SW, SH: SH };
  };
  var starGlow = {};
  A.starSprite = function (col) {
    if (starGlow[col]) return starGlow[col];
    var S = 32, c = canvas(S, S), g = c.getContext('2d'), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.12, col); gr.addColorStop(0.35, col.length === 7 ? col + '55' : col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(S / 2, 3); g.lineTo(S / 2, S - 3); g.moveTo(3, S / 2); g.lineTo(S - 3, S / 2); g.stroke();
    return (starGlow[col] = c);
  };

  // An 8-point star (Islamic geometric motif) path.
  A.star8 = function (ctx, x, y, r, inner) {
    ctx.beginPath();
    for (var i = 0; i < 16; i++) { var a = i * Math.PI / 8 - Math.PI / 2, q = i % 2 ? r * (inner || 0.62) : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath();
  };
})();
