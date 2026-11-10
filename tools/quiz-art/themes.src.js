/* Kahf KidsGames quiz art source: themes.src.js (drawn to WebP by tools/quiz-art/build.js; not loaded by pages)
   The look of a quiz's journey map: colours, the backdrop, the picture at the foot of the path and the shape of
   each stop. A quiz names its theme in catalog.js; KahfQuiz.theme(name) hands the engine what it needs.
   Everything is SVG text drawn once per map build. No faces anywhere. */
(function () {
  'use strict';
  var KQ = window.KahfQuiz = window.KahfQuiz || {};

  function rnd(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
  function wrap(body, extra) { return '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' + (extra || '') + body + '</svg>'; }
  // colours for a stop in each state: finished (lit), ready (open) or locked
  function tone(state, c) {
    return state === 'lit' ? { f: c[0], e: c[1], in: '#fff6d8', glow: true }
      : state === 'open' ? { f: c[2] || '#e9dcc0', e: c[1], in: '#fffaf0' }
      : { f: '#77739c', e: '#44406a', in: '#9d99bd' };
  }
  function glow(t, c) { return t.glow ? '<circle cx="32" cy="40" r="31" fill="' + (c || '#ffd978') + '" opacity=".26"/>' : ''; }
  function crown(state, boss, e) {
    return boss ? '<path d="M32 0l2.6 5.200 5.800.600-4.300 3.900 1.300 5.700L32 12.600l-5.400 2.800 1.300-5.700-4.300-3.900 5.800-.600z" fill="' + (state === 'locked' ? '#9d99bd' : '#f6c453') + '" stroke="' + e + '" stroke-width="1.2"/>' : '';
  }

  // ---------- stop shapes: fn(state, boss, colours) ----------
  var STOP = {
    lantern: function (s, boss) {
      var lit = s === 'lit', open = s === 'open';
      var metal = lit ? '#c98a2b' : open ? '#b9853c' : '#5a557e', edge = lit ? '#7a4a12' : open ? '#6a4a1c' : '#39355c';
      var glass = lit ? 'url(#lg)' : open ? '#fff3d6' : '#8f8ab0';
      return wrap((lit ? '<circle cx="32" cy="42" r="30" fill="#ffd978" opacity=".28"/>' : '') +
        (boss ? crown(s, true, edge) : '<circle cx="32" cy="7" r="4" fill="none" stroke="' + edge + '" stroke-width="2.4"/>') +
        '<path d="M19 22q13-14 26 0z" fill="' + metal + '" stroke="' + edge + '" stroke-width="2" stroke-linejoin="round"/><path d="M32 11v3" stroke="' + edge + '" stroke-width="2.4"/>' +
        '<path d="M17 22h30l5 38H12z" fill="' + glass + '" stroke="' + edge + '" stroke-width="2" stroke-linejoin="round"/>' +
        '<path d="M24 22l-4 38M40 22l4 38" stroke="' + metal + '" stroke-width="1.6" opacity=".7"/>' +
        '<path d="M10 60h44l-3 10H13z" fill="' + metal + '" stroke="' + edge + '" stroke-width="2" stroke-linejoin="round"/>',
        '<defs><radialGradient id="lg" cx="50%" cy="55%" r="60%"><stop offset="0" stop-color="#fffbe0"/><stop offset=".6" stop-color="#ffd978"/><stop offset="1" stop-color="#f6a93a"/></radialGradient></defs>');
    },
    star: function (s, boss, c) {
      var t = tone(s, c);
      return wrap(glow(t) + '<path d="M32 8l8.600 19.400 21 2.200-15.700 14.200 4.500 20.700L32 53.800 13.600 64.500l4.500-20.700L2.400 29.600l21-2.200z" fill="' + (t.glow ? t.f : t.in) + '" stroke="' + t.e + '" stroke-width="2.4" stroke-linejoin="round"/>' +
        (boss ? '<circle cx="32" cy="40" r="17" fill="none" stroke="' + t.e + '" stroke-width="1.6" stroke-dasharray="3 4"/>' : ''));
    },
    flower: function (s, boss, c) {
      var t = tone(s, c), p = '';
      for (var i = 0; i < (boss ? 8 : 6); i++) { var a = i * Math.PI * 2 / (boss ? 8 : 6); p += '<circle cx="' + (32 + Math.cos(a) * 17).toFixed(1) + '" cy="' + (36 + Math.sin(a) * 17).toFixed(1) + '" r="' + (boss ? 10.5 : 12) + '" fill="' + t.f + '" stroke="' + t.e + '" stroke-width="1.8"/>'; }
      return wrap(glow(t, c[0]) + '<path d="M32 50v24" stroke="' + (s === 'locked' ? '#55517a' : '#2f8f4e') + '" stroke-width="5" stroke-linecap="round"/><path d="M32 66c8 0 12-4 13-10-8 0-12 4-13 10z" fill="' + (s === 'locked' ? '#55517a' : '#4fbf6b') + '"/>' + p +
        '<circle cx="32" cy="36" r="13" fill="' + t.in + '" stroke="' + t.e + '" stroke-width="1.8"/>');
    },
    tent: function (s, boss, c) {
      var t = tone(s, c);
      return wrap(glow(t) + crown(s, boss, t.e) + '<path d="M32 14v-6" stroke="' + t.e + '" stroke-width="2.4" stroke-linecap="round"/>' + (boss ? '' : '<path d="M32 8l9 3-9 3z" fill="' + t.f + '" stroke="' + t.e + '" stroke-width="1.4" stroke-linejoin="round"/>') +
        '<path d="M4 66Q8 20 32 14 56 20 60 66z" fill="' + t.in + '" stroke="' + t.e + '" stroke-width="2.4" stroke-linejoin="round"/>' +
        '<path d="M4 66Q8 20 32 14 20 30 16 66zM60 66Q56 20 32 14 44 30 48 66z" fill="' + t.f + '" stroke="' + t.e + '" stroke-width="2" stroke-linejoin="round"/>' +
        '<path d="M2 68h60" stroke="' + t.e + '" stroke-width="3" stroke-linecap="round"/>');
    },
    arch: function (s, boss, c) {
      var t = tone(s, c);
      return wrap(glow(t) + crown(s, boss, t.e) + '<path d="M6 72V38C6 20 20 14 32 14s26 6 26 24v34z" fill="' + t.f + '" stroke="' + t.e + '" stroke-width="2.4" stroke-linejoin="round"/>' +
        '<path d="M14 72V40c0-13 9-18 18-18s18 5 18 18v32z" fill="' + t.in + '" stroke="' + t.e + '" stroke-width="2"/>' +
        '<path d="M2 72h60" stroke="' + t.e + '" stroke-width="3.4" stroke-linecap="round"/>');
    },
    house: function (s, boss, c) {
      var t = tone(s, c);
      return wrap(glow(t) + crown(s, boss, t.e) + '<path d="M10 34h44v38H10z" fill="' + t.in + '" stroke="' + t.e + '" stroke-width="2.4" stroke-linejoin="round"/>' +
        '<path d="M4 36L32 14l28 22z" fill="' + t.f + '" stroke="' + t.e + '" stroke-width="2.4" stroke-linejoin="round"/>' +
        '<path d="M26 72V58a6 6 0 0 1 12 0v14z" fill="' + t.f + '" stroke="' + t.e + '" stroke-width="2"/>');
    },
    boat: function (s, boss, c) {
      var t = tone(s, c);
      return wrap(glow(t) + crown(s, boss, t.e) + '<path d="M30 16v44" stroke="' + t.e + '" stroke-width="3" stroke-linecap="round"/>' +
        '<path d="M34 16c14 8 22 22 22 38H34z" fill="' + t.in + '" stroke="' + t.e + '" stroke-width="2.2" stroke-linejoin="round"/><path d="M26 22C16 30 10 42 9 54h17z" fill="' + t.in + '" stroke="' + t.e + '" stroke-width="2.2" stroke-linejoin="round"/>' +
        '<path d="M4 58h56l-7 14H12z" fill="' + t.f + '" stroke="' + t.e + '" stroke-width="2.4" stroke-linejoin="round"/>');
    },
    planet: function (s, boss, c) {
      var t = tone(s, c);
      return wrap(glow(t, c[0]) + crown(s, boss, t.e) + '<ellipse cx="32" cy="42" rx="31" ry="9" fill="none" stroke="' + t.f + '" stroke-width="4" transform="rotate(-16 32 42)"/>' +
        '<circle cx="32" cy="42" r="21" fill="' + t.in + '" stroke="' + t.e + '" stroke-width="2.4"/><path d="M13 36q19 8 38-2M14 50q18 6 35-3" stroke="' + t.f + '" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>' +
        '<path d="M2.500 50.500Q32 62 61.500 33.500" fill="none" stroke="' + t.f + '" stroke-width="4" stroke-linecap="round"/>');
    },
    book: function (s, boss, c) {
      var t = tone(s, c);
      return wrap(glow(t) + crown(s, boss, t.e) + '<path d="M10 18h40a6 6 0 0 1 6 6v46H16a6 6 0 0 1-6-6z" fill="' + t.f + '" stroke="' + t.e + '" stroke-width="2.4" stroke-linejoin="round"/>' +
        '<path d="M18 24h32v34H18z" fill="' + t.in + '" stroke="' + t.e + '" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 62h46" stroke="' + t.e + '" stroke-width="2"/><path d="M14 66h40" stroke="' + t.in + '" stroke-width="2.4" stroke-linecap="round"/>');
    },
    lock: function (s, boss, c) {
      var t = tone(s, c), lit = s === 'lit';
      return wrap(glow(t) + crown(s, boss, t.e) + '<path d="M' + (lit ? '20 30V20a12 12 0 0 1 24-3' : '20 30V24a12 12 0 0 1 24 0v6') + '" fill="none" stroke="' + t.e + '" stroke-width="6" stroke-linecap="round"/>' +
        '<rect x="8" y="28" width="48" height="42" rx="10" fill="' + t.f + '" stroke="' + t.e + '" stroke-width="2.4"/><rect x="15" y="34" width="34" height="24" rx="8" fill="' + t.in + '" stroke="' + t.e + '" stroke-width="1.6"/>');
    },
    leaf: function (s, boss, c) {
      var t = tone(s, c);
      return wrap(glow(t, c[0]) + crown(s, boss, t.e) + '<path d="M32 74V56" stroke="' + t.e + '" stroke-width="3.4" stroke-linecap="round"/>' +
        '<path d="M32 12C52 22 60 38 54 52 48 64 38 66 32 62 26 66 16 64 10 52 4 38 12 22 32 12z" fill="' + t.f + '" stroke="' + t.e + '" stroke-width="2.4" stroke-linejoin="round"/>' +
        '<ellipse cx="32" cy="40" rx="15" ry="14" fill="' + t.in + '" opacity=".92"/>');
    },
    stone: function (s, boss, c) {
      var t = tone(s, c);
      return wrap(glow(t) + crown(s, boss, t.e) + '<path d="M12 70V36a20 20 0 0 1 40 0v34z" fill="' + t.in + '" stroke="' + t.e + '" stroke-width="2.4" stroke-linejoin="round"/>' +
        '<path d="M12 36a20 20 0 0 1 40 0v4H12z" fill="' + t.f + '" stroke="' + t.e + '" stroke-width="2"/><path d="M4 71h56" stroke="' + t.e + '" stroke-width="4" stroke-linecap="round"/>' +
        '<path d="M6 70q4-8 8 0M50 70q4-8 8 0" fill="none" stroke="' + (s === 'locked' ? '#55517a' : '#4fbf6b') + '" stroke-width="2.4" stroke-linecap="round"/>');
    }
  };

  // ---------- backdrops (fixed behind the map) ----------
  function moon(cx, cy, r, done) {
    var day = Math.min(29, done + 1), phase = day / 29.5;            // 0 new .. 0.5 full .. 1 new
    var f = (1 - Math.cos(2 * Math.PI * phase)) / 2, waxing = phase <= 0.5;
    var rx = (r * Math.abs(1 - 2 * f)).toFixed(2), sweep = f < 0.5 ? 0 : 1;
    var d = 'M0 ' + (-r) + 'A' + r + ' ' + r + ' 0 0 1 0 ' + r + 'A' + rx + ' ' + r + ' 0 0 ' + sweep + ' 0 ' + (-r) + 'Z';
    return '<g class="qz-hide-play" transform="translate(' + cx + ' ' + cy + ')"><circle r="' + (r * 1.9) + '" fill="#ffe9a8" opacity=".07"/><circle r="' + (r * 1.4) + '" fill="#ffe9a8" opacity=".08"/>' +
      '<circle r="' + r + '" fill="#2c2766"/><path d="' + d + '" fill="#ffe9a8"' + (waxing ? '' : ' transform="scale(-1 1)"') + '/></g>';
  }
  var SKY = {
    stars: function (o) {
      return function (w, h, done) {
        var r = rnd(7), s = '';
        for (var i = 0; i < (o.n || 70); i++) {
          var x = (r() * w).toFixed(1), y = (r() * h).toFixed(1), k = r();
          s += '<circle cx="' + x + '" cy="' + y + '" r="' + (0.6 + k * 1.3).toFixed(1) + '" fill="#fff" opacity="' + (0.25 + k * 0.6).toFixed(2) + '"/>';
        }
        var mr = Math.max(22, Math.min(40, Math.min(w, h) * 0.07));
        return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' + s + (o.moon ? moon(w - mr * 2.1, 84 + mr, mr, done) : '') + '</svg>';
      };
    },
    clouds: function (o) {
      return function (w, h) {
        var r = rnd(11), s = '';
        for (var i = 0; i < 7; i++) {
          var x = r() * w, y = 60 + r() * h * 0.8, k = 0.6 + r() * 0.9;
          s += '<g transform="translate(' + x.toFixed(0) + ' ' + y.toFixed(0) + ') scale(' + k.toFixed(2) + ')" fill="#fff" opacity="' + (o.fade || 0.13) + '"><ellipse rx="46" ry="16"/><ellipse cx="-18" cy="-12" rx="22" ry="16"/><ellipse cx="12" cy="-16" rx="26" ry="20"/></g>';
        }
        var sr = Math.max(24, Math.min(42, Math.min(w, h) * 0.075));
        return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' + s +
          (o.sun ? '<g class="qz-hide-play" transform="translate(' + (w - sr * 2.1) + ' ' + (84 + sr) + ')"><circle r="' + sr * 1.7 + '" fill="#ffe08a" opacity=".16"/><circle r="' + sr + '" fill="#ffd95a"/></g>' : '') + '</svg>';
      };
    },
    plain: function () { return function () { return ''; }; }
  };

  // ---------- the picture at the foot of the path, where the journey starts ----------
  function land(w, b, y1, y2, fill) {
    return '<path d="M0 ' + (b - y1) + 'q' + (w * 0.25) + '-' + y2 + ' ' + (w * 0.5) + '-' + (y2 * 0.35).toFixed(0) + 't' + (w * 0.5) + '-' + (y2 * 0.25).toFixed(0) + 'V' + b + 'H0z" fill="' + fill + '"/>';
  }
  var DECOR = {
    skyline: function (c) {
      return function (w, h) {
        var b = h, x = w / 2, d = c[1], m = c[0];
        function dome(cx, base, rw) { return 'M' + (cx - rw) + ' ' + base + 'a' + rw + ' ' + rw + ' 0 0 1 ' + (rw * 2) + ' 0z'; }
        function minaret(cx, base, hh) { return 'M' + (cx - 7) + ' ' + base + 'v' + (-hh) + 'l7-16 7 16v' + hh + 'z'; }
        return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' + land(w, b, 86, 40, m) +
          '<g fill="' + d + '"><path d="' + dome(x, b - 78, 46) + '"/><path d="M' + (x - 70) + ' ' + (b - 78) + 'h140v60h-140z"/>' +
          '<path d="' + dome(x - 96, b - 56, 22) + '"/><path d="' + dome(x + 96, b - 56, 22) + '"/><path d="M' + (x - 124) + ' ' + (b - 56) + 'h248v40h-248z"/>' +
          '<path d="' + minaret(x - 150, b - 20, 110) + '"/><path d="' + minaret(x + 150, b - 20, 110) + '"/>' + land(w, b, 30, 26, d).replace(' fill="' + d + '"', '') + '</g>' +
          '<path d="M' + (x - 2) + ' ' + (b - 124) + 'v-14" stroke="' + c[2] + '" stroke-width="2.500"/><path d="M' + (x + 3) + ' ' + (b - 152) + 'a7 7 0 1 0 5 11 6 6 0 0 1-5-11z" fill="' + c[2] + '"/>' +
          '<g fill="' + c[2] + '" opacity=".85"><rect x="' + (x - 44) + '" y="' + (b - 62) + '" width="10" height="16" rx="5"/><rect x="' + (x - 5) + '" y="' + (b - 62) + '" width="10" height="16" rx="5"/><rect x="' + (x + 34) + '" y="' + (b - 62) + '" width="10" height="16" rx="5"/></g></svg>';
      };
    },
    dunes: function (c) {
      return function (w, h) {
        var b = h;
        function palm(x, y, k) {
          return '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')" fill="' + c[2] + '"><path d="M-3 0c0-22 2-36 5-46l5 1c-3 12-4 26-3 45z"/>' +
            '<path d="M5-46C-6-60-22-58-30-48c12-3 24-2 35 2zM5-46C16-62 32-60 38-48c-11-5-22-4-33 2zM5-46C-2-64 4-74 16-78c-5 10-7 20-11 32zM5-46C-10-50-22-42-26-30c9-9 19-13 31-16zM5-46c15-2 25 6 27 18-7-10-15-15-27-18z"/></g>';
        }
        return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' + land(w, b, 96, 46, c[0]) + palm(w * 0.2, b - 74, 1.1) + palm(w * 0.82, b - 66, 0.9) + palm(w * 0.74, b - 60, 0.7) +
          land(w, b, 52, 34, c[1]) + '<path d="M0 ' + (b - 18) + 'q' + (w * 0.5) + '-30 ' + w + ' 0V' + b + 'H0z" fill="' + c[2] + '" opacity=".5"/></svg>';
      };
    },
    hills: function (c) {
      return function (w, h) {
        var b = h;
        function tree(x, y, k) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')"><path d="M-3 0v-26h6v26z" fill="' + c[2] + '"/><circle cy="-36" r="18" fill="' + c[2] + '"/><circle cx="-13" cy="-26" r="12" fill="' + c[2] + '"/><circle cx="13" cy="-26" r="12" fill="' + c[2] + '"/></g>'; }
        return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' + land(w, b, 100, 50, c[0]) + tree(w * 0.16, b - 78, 1.1) + tree(w * 0.86, b - 70, 0.9) + tree(w * 0.7, b - 64, 0.7) + tree(w * 0.3, b - 66, 0.6) +
          land(w, b, 50, 36, c[1]) + '</svg>';
      };
    },
    waves: function (c) {
      return function (w, h) {
        var b = h;
        function wave(y, a, fill, sh) { var d = 'M0 ' + (b - y), n = 8, sw = w / n; for (var i = 0; i < n; i++) d += 'q' + (sw / 2) + ' ' + (i % 2 ? a : -a) + ' ' + sw + ' 0'; return '<path d="' + d + 'V' + b + 'H0z" fill="' + fill + '" transform="translate(' + (sh || 0) + ' 0)"/>'; }
        return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' + wave(92, 18, c[0]) + wave(62, 16, c[1], -20) + wave(30, 14, c[2], -8) + '</svg>';
      };
    },
    town: function (c) {
      return function (w, h) {
        var b = h, r = rnd(5), s = '', x = -10;
        while (x < w) {
          var bw = 54 + r() * 40, bh = 46 + r() * 50, roof = r() > 0.5;
          s += '<path d="M' + x.toFixed(0) + ' ' + b + 'v' + (-bh).toFixed(0) + (roof ? 'l' + (bw / 2).toFixed(0) + '-22 ' + (bw / 2).toFixed(0) + ' 22' : 'h' + bw.toFixed(0)) + 'v' + bh.toFixed(0) + 'z" fill="' + c[1] + '"/>' +
            '<rect x="' + (x + bw * 0.22).toFixed(0) + '" y="' + (b - bh + 14).toFixed(0) + '" width="12" height="14" rx="2" fill="' + c[2] + '" opacity=".85"/><rect x="' + (x + bw * 0.6).toFixed(0) + '" y="' + (b - bh + 14).toFixed(0) + '" width="12" height="14" rx="2" fill="' + c[2] + '" opacity=".6"/>';
          x += bw + 6;
        }
        return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' + land(w, b, 96, 36, c[0]) + s + '<path d="M0 ' + (b - 10) + 'h' + w + 'v10H0z" fill="' + c[1] + '"/></svg>';
      };
    },
    shelves: function (c) {
      return function (w, h) {
        var b = h, r = rnd(9), s = '', cols = ['#c0563f', '#3f7fae', '#4f9f6a', '#c99a3a', '#7d5fb0', '#b9853c'];
        for (var row = 0; row < 2; row++) {
          var y = b - 14 - row * 74, x = 14;
          s += '<rect x="0" y="' + y + '" width="' + w + '" height="10" fill="' + c[1] + '"/>';
          while (x < w - 20) { var bw = 12 + r() * 12, bh = 38 + r() * 22; s += '<rect x="' + x.toFixed(0) + '" y="' + (y - bh).toFixed(0) + '" width="' + bw.toFixed(0) + '" height="' + bh.toFixed(0) + '" rx="2" fill="' + cols[(r() * cols.length) | 0] + '" opacity=".8"/>'; x += bw + 3 + (r() > 0.8 ? 16 : 0); }
        }
        return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none"><rect x="0" y="' + (b - 170) + '" width="' + w + '" height="170" fill="' + c[0] + '"/>' + s + '</svg>';
      };
    }
  };

  // ---------- the themes ----------
  // bg: top and bottom of the backdrop. stop: shape + [bright, edge, pale]. decor: kind + [far, near, detail].
  var THEMES = {
    night:    { bg: ['#14103a', '#33206a'], sky: SKY.stars({ moon: true }), decor: DECOR.skyline(['#1c1650', '#120d36', '#f6c453']), stop: 'lantern', c: ['#ffd978', '#7a4a12'], accent: ['#f6c453', '#e9973a'] },
    desert:   { bg: ['#3d2152', '#b4603a'], sky: SKY.stars({ n: 34 }), decor: DECOR.dunes(['#8a4526', '#6e3520', '#4a2216']), stop: 'tent', c: ['#f2b25c', '#6a3a14', '#f0d9b0'], accent: ['#ffcf6b', '#e9973a'], path: 'rgba(255,225,170,.5)' },
    stars:    { bg: ['#081238', '#1f3f86'], sky: SKY.stars({ n: 90 }), decor: DECOR.hills(['#122b63', '#0b1c47', '#0b1c47']), stop: 'star', c: ['#ffd978', '#9a6a12'], accent: ['#ffd978', '#f0a93a'] },
    garden:   { bg: ['#12492c', '#2f8a4c'], sky: SKY.clouds({ sun: true }), decor: DECOR.hills(['#1f6a3a', '#175330', '#0f3f24']), stop: 'flower', c: ['#ff8fa3', '#8a2f45', '#ffd3db'], accent: ['#ffd95a', '#f08a3a'], path: 'rgba(255,255,255,.4)' },
    masjid:   { bg: ['#0c3f4f', '#1c7a6c'], sky: SKY.stars({ n: 40 }), decor: DECOR.skyline(['#125a55', '#0a3a3c', '#ffe08a']), stop: 'arch', c: ['#5fd0b4', '#0f5a4e', '#bfe9df'], accent: ['#ffe08a', '#e9a53a'], path: 'rgba(255,255,255,.4)' },
    street:   { bg: ['#243f7c', '#4f79c9'], sky: SKY.clouds({ sun: true }), decor: DECOR.town(['#3560a8', '#1c3364', '#ffe08a']), stop: 'house', c: ['#ff9d6b', '#7a3418', '#ffd9c2'], accent: ['#ffd95a', '#f08a3a'], path: 'rgba(255,255,255,.45)' },
    sea:      { bg: ['#0a4470', '#1489b8'], sky: SKY.clouds({ sun: true }), decor: DECOR.waves(['#0f6f9c', '#0b5a84', '#08476b']), stop: 'boat', c: ['#ff8a5c', '#7a3418', '#ffd9c2'], accent: ['#ffe08a', '#f08a3a'], path: 'rgba(255,255,255,.45)' },
    space:    { bg: ['#0c0a2c', '#2c1660'], sky: SKY.stars({ n: 110 }), decor: DECOR.hills(['#24164f', '#170e38', '#170e38']), stop: 'planet', c: ['#8fd0ff', '#2c4f8a', '#cfe6ff'], accent: ['#8fd0ff', '#5f9fe0'], path: 'rgba(190,220,255,.4)' },
    road:     { bg: ['#3a2416', '#94592c'], sky: SKY.clouds({ fade: 0.08 }), decor: DECOR.dunes(['#7a4a26', '#5e3618', '#3f230f']), stop: 'stone', c: ['#e9b872', '#5e3618', '#efe0c6'], accent: ['#ffd27a', '#e9973a'], path: 'rgba(255,230,180,.45)' },
    library:  { bg: ['#2c1a10', '#6a3c22'], sky: SKY.stars({ n: 24 }), decor: DECOR.shelves(['#4a2a18', '#2c1a10']), stop: 'book', c: ['#e0605a', '#6a1f1c', '#f3d2c8'], accent: ['#ffd27a', '#e9973a'], path: 'rgba(255,230,180,.45)' },
    workshop: { bg: ['#1c2836', '#3f5a70'], sky: SKY.plain(), decor: DECOR.town(['#2f4658', '#16212d', '#ffd27a']), stop: 'lock', c: ['#ffc24a', '#7a5210', '#f3e3bd'], accent: ['#ffc24a', '#f08a3a'], path: 'rgba(255,255,255,.4)' },
    tree:     { bg: ['#173f30', '#3b8a5c'], sky: SKY.clouds({ sun: true }), decor: DECOR.hills(['#2a6c48', '#1d5236', '#123a26']), stop: 'leaf', c: ['#8fe08a', '#1f6a3a', '#d6f3cf'], accent: ['#ffe08a', '#f0a93a'], path: 'rgba(255,255,255,.4)' }
  };

  KQ.srcThemes = THEMES; KQ.srcStop = STOP; KQ.srcMoon = moon;
  KQ.theme = function (name) {
    var t = THEMES[name] || THEMES.night, c = t.c;
    return {
      sky: t.sky, decor: t.decor, pathColor: t.path,
      stopPic: function (state, boss) { return STOP[t.stop](state, boss, c); },
      palette: { '--qz-bg-top': t.bg[0], '--qz-bg-bot': t.bg[1], '--qz-accent': t.accent[0], '--qz-accent-2': t.accent[1] },
      bg: t.bg
    };
  };
  KQ.themeNames = Object.keys(THEMES);
})();
