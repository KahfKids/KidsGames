/* Colouring Book: art.js
   Picture buttons (paint pots, tool icons) as inline SVG, and the painted backdrop behind the page
   (night gradient, faint 8-point star lattice, soft glow), pre-rendered to an offscreen canvas. */
(function () {
  'use strict';
  var A = window.CBArt = {};

  A.COLOURS = ['#e8413c', '#ff7a3d', '#ffb53a', '#ffe14d', '#b7e35a', '#4cbb5e', '#1f8a5b',
    '#3cc8c0', '#5ec5f5', '#2f7de1', '#3b4cb8', '#8a54d6', '#d775e8', '#ff7eb6',
    '#ffc2d6', '#e0b884', '#a0643a', '#5b3a29', '#9aa3ad', '#2a2a3a', '#ffffff'];

  function shade(hex, k) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function f(c) { return Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k); }
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  }
  A.shade = shade;

  // Paint pot: a round tin seen from above with a glossy pool of paint.
  A.pot = function (hex) {
    return '<svg viewBox="0 0 48 48" aria-hidden="true">' +
      '<path d="M5 25v7c0 7 8.5 12.5 19 12.5S43 39 43 32v-7" fill="#8f88ab"/>' +
      '<path d="M5 25v7c0 7 8.5 12.5 19 12.5" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>' +
      '<ellipse cx="24" cy="25" rx="19" ry="13" fill="#e9e5f5"/>' +
      '<ellipse cx="24" cy="25.6" rx="15.6" ry="10.2" fill="' + shade(hex, -0.28) + '"/>' +
      '<ellipse cx="24" cy="24.6" rx="15.2" ry="9.6" fill="' + hex + '"/>' +
      '<path d="M13 21.5c3-3.2 8-4.4 12-4" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2.6" stroke-linecap="round"/>' +
      '<circle cx="31" cy="28.5" r="1.6" fill="rgba(255,255,255,.45)"/></svg>';
  };

  var P = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
  A.icon = {
    book: '<svg viewBox="0 0 24 24" ' + P + '><path d="M3 5.5c3-1.6 6-1.6 9 .6 3-2.2 6-2.2 9-.6v13c-3-1.5-6-1.5-9 .7-3-2.2-6-2.2-9-.7z"/><path d="M12 6.1v13.1"/></svg>',
    save: '<svg viewBox="0 0 24 24" ' + P + '><rect x="2.5" y="5.5" width="15" height="14" rx="2"/><path d="M2.5 17l4.5-4.5 3.5 3.5 2-2 5 5"/><circle cx="8" cy="10" r="1.4" fill="currentColor"/>' +
      '<circle cx="19" cy="6" r="4.4" fill="#f6c453" stroke="none"/><path d="M19 3.8v4.4M16.8 6h4.4" stroke="#2a1606" stroke-width="1.8"/></svg>',
    undo: '<svg viewBox="0 0 24 24" ' + P + '><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
    redo: '<svg viewBox="0 0 24 24" ' + P + '><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg>',
    clear: '<svg viewBox="0 0 24 24" ' + P + '><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    fill: function (c) {
      return '<svg viewBox="0 0 24 24" ' + P + '><path d="M3.5 11.5 10 5l7 7-6.5 6.5a1.5 1.5 0 0 1-2.1 0l-4.9-4.9a1.5 1.5 0 0 1 0-2.1z"/><path d="M7 8 4.6 3.4"/>' +
        '<path d="M4.3 12.2h11.3" /><path d="M19.6 13.5c1.3 1.8 2 3.1 2 4a2 2 0 0 1-4 0c0-.9.7-2.2 2-4z" fill="' + c + '" stroke-width="1.4"/></svg>';
    },
    brush: function (c) {
      return '<svg viewBox="0 0 24 24" ' + P + '><path d="M20.5 3.5 12 12"/><path d="m10.5 10.5 3 3" stroke-width="3"/>' +
        '<path d="M9.6 13.2c-2.2-.3-4 1.3-4.2 3.6-.1 1.2-.8 2.3-2.4 2.9 3.2 1.4 7.3.8 8.3-2.3.5-1.6-.2-3.6-1.7-4.2z" fill="' + c + '" stroke-width="1.5"/></svg>';
    },
    eraser: '<svg viewBox="0 0 24 24" ' + P + '><path d="M14.5 3.8 20.2 9.5a1.6 1.6 0 0 1 0 2.2L12 20H7.2l-3.4-3.4a1.6 1.6 0 0 1 0-2.2L12.3 3.8a1.6 1.6 0 0 1 2.2 0z" fill="rgba(255,140,180,.55)"/><path d="m8.5 9.5 6.5 6.5M12 20h8"/></svg>',
    size: function (n) { var r = [2.6, 4.8, 7.4][n]; return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="' + r + '" fill="currentColor"/><circle cx="12" cy="12" r="10.4" fill="none" stroke="currentColor" stroke-opacity=".3" stroke-width="1.4" stroke-dasharray="2 2.6"/></svg>'; }
  };

  // Progress ring with a star in the middle (0..1).
  A.ring = function (f, done) {
    var C = 2 * Math.PI * 19, d = (C * Math.max(0, Math.min(1, f))).toFixed(1);
    return '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="19" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="5"/>' +
      '<circle cx="24" cy="24" r="19" fill="none" stroke="' + (done ? '#f6c453' : '#8fe3a0') + '" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + d + ' 200" transform="rotate(-90 24 24)"/>' +
      '<g transform="translate(24 24) scale(' + (done ? 0.2 : 0.15) + ')"><path d="M0-46 13-31 32-32 31-13 46 0 31 13 32 32 13 31 0 46-13 31-32 32-31 13-46 0-31-13-32-32-13-31Z" fill="' + (done ? '#f6c453' : 'rgba(255,255,255,.35)') + '" stroke="' + (done ? '#7a4a12' : 'none') + '" stroke-width="5"/></g></svg>';
  };

  // ---------- backdrop ----------
  // A night gradient in the book's colours, a faint lattice of 8-point stars, and a glow where the page sits.
  A.backdrop = function (w, h, dpr, book, page) {
    var c = document.createElement('canvas');
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    var x = c.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    var g = x.createLinearGradient(0, 0, w * 0.3, h);
    g.addColorStop(0, book.sky[0]); g.addColorStop(1, book.sky[1]);
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    // far layer: big soft hills of haze
    x.globalAlpha = 0.18;
    x.fillStyle = book.glow;
    x.beginPath(); x.ellipse(w * 0.15, h * 1.05, w * 0.55, h * 0.22, 0, 0, 7); x.fill();
    x.beginPath(); x.ellipse(w * 0.9, h * 1.1, w * 0.6, h * 0.26, 0, 0, 7); x.fill();
    x.globalAlpha = 1;
    // star lattice
    var step = Math.max(70, Math.min(w, h) / 6);
    x.strokeStyle = 'rgba(255,240,210,.07)'; x.lineWidth = 1.2;
    for (var yy = -step; yy < h + step; yy += step) {
      for (var xx = -step + ((yy / step) % 2 ? step / 2 : 0); xx < w + step; xx += step) {
        x.save(); x.translate(xx, yy); window.Kit.starPath(x, step * 0.32); x.stroke();
        x.beginPath(); x.arc(0, 0, step * 0.12, 0, 7); x.stroke(); x.restore();
      }
    }
    // glow behind the page and a soft vignette
    if (page) {
      var cx = page.x + page.s / 2, cy = page.y + page.s / 2;
      var rg = x.createRadialGradient(cx, cy, page.s * 0.3, cx, cy, page.s * 0.95);
      rg.addColorStop(0, hexA(book.glow, 0.28)); rg.addColorStop(1, hexA(book.glow, 0));
      x.fillStyle = rg; x.fillRect(0, 0, w, h);
    }
    var vg = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.8);
    vg.addColorStop(0, 'rgba(5,3,20,0)'); vg.addColorStop(1, 'rgba(5,3,20,.5)');
    x.fillStyle = vg; x.fillRect(0, 0, w, h);
    return c;
  };
  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  A.hexA = hexA;

  // The paper the page is printed on: rounded, with a soft shadow and a thin gold edge.
  A.paper = function (s, dpr) {
    var pad = Math.round(s * 0.06) + 8, c = document.createElement('canvas');
    c.width = Math.round((s + pad * 2) * dpr); c.height = Math.round((s + pad * 2) * dpr);
    var x = c.getContext('2d'), r = Math.max(10, s * 0.025);
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = pad * 0.8; x.shadowOffsetY = pad * 0.25;
    x.fillStyle = '#fffdf7';
    rr(x, pad, pad, s, s, r); x.fill();
    x.shadowColor = 'transparent';
    x.lineWidth = 3; x.strokeStyle = 'rgba(246,196,83,.55)';
    rr(x, pad - 1.5, pad - 1.5, s + 3, s + 3, r + 1.5); x.stroke();
    return { canvas: c, pad: pad, r: r };
  };
  function rr(x, a, b, w, h, r) {
    x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r);
    x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath();
  }
  A.rr = rr;
})();
