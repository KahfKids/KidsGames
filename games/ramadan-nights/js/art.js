/* Ramadan Nights: art.js
   All pictures for this quiz as small SVGs (no faces, no emoji): answer pictures, the lantern stops, the
   night sky with a moon that grows and wanes with progress, and the skyline at the start of the path. */
(function () {
  'use strict';
  var A = window.RamadanArt = {};
  function svg(body) { return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' + body + '</svg>'; }
  var INK = '#3a2a5c';

  // ---------- answer pictures ----------
  A.pics = {
    dates: svg('<ellipse cx="50" cy="78" rx="40" ry="10" fill="#e9d3a4"/><ellipse cx="50" cy="74" rx="40" ry="10" fill="#fff3d6" stroke="#c9a769" stroke-width="2"/>' +
      '<g stroke="#4a2410" stroke-width="2"><ellipse cx="36" cy="62" rx="13" ry="8" fill="#8a4b20" transform="rotate(-18 36 62)"/><ellipse cx="62" cy="62" rx="13" ry="8" fill="#7a3f18" transform="rotate(14 62 62)"/><ellipse cx="50" cy="50" rx="13" ry="8" fill="#9c5a28" transform="rotate(-4 50 50)"/></g>' +
      '<path d="M42 47q8-4 15 0" stroke="#d59a5c" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M28 60q6-4 12-2M56 60q7-3 12 1" stroke="#c0824a" stroke-width="2" fill="none" stroke-linecap="round"/>'),
    water: svg('<path d="M28 18h44l-6 68a6 6 0 0 1-6 5H40a6 6 0 0 1-6-5z" fill="#eaf7ff" stroke="#7fb4d6" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M31 42h38l-4 44a5 5 0 0 1-5 4H40a5 5 0 0 1-5-4z" fill="#6cc3ee"/><path d="M31 42q9 6 19 0t19 0" fill="none" stroke="#b9e6fb" stroke-width="3"/><path d="M38 26l3 40" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/>'),
    crescent: svg('<rect width="100" height="100" rx="18" fill="#1f1b52"/><path d="M62 18a34 34 0 1 0 22 50A28 28 0 0 1 62 18z" fill="#ffe08a" stroke="#d9a53c" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<g fill="#fff6cf"><circle cx="24" cy="24" r="2.5"/><circle cx="80" cy="30" r="2"/><circle cx="20" cy="70" r="2"/></g>'),
    sun: svg('<rect width="100" height="100" rx="18" fill="#8fd3ff"/><g stroke="#f5a623" stroke-width="6" stroke-linecap="round"><path d="M50 10v12M50 78v12M10 50h12M78 50h12M22 22l8 8M70 70l8 8M22 78l8-8M70 30l8-8"/></g><circle cx="50" cy="50" r="20" fill="#ffd54a" stroke="#f5a623" stroke-width="3"/>'),
    dawn: svg('<rect width="100" height="100" rx="18" fill="#2a2a6e"/><rect y="52" width="100" height="48" fill="#f7b267"/><rect y="52" width="100" height="14" fill="#ffd9a0"/>' +
      '<path d="M0 72q25-16 50-4t50-6v38H0z" fill="#3b2f5e"/><g fill="#fff" opacity=".9"><circle cx="22" cy="20" r="2"/><circle cx="70" cy="14" r="2.2"/><circle cx="84" cy="36" r="1.6"/><circle cx="44" cy="32" r="1.6"/></g>' +
      '<path d="M6 52h88" stroke="#fff6dc" stroke-width="2.5"/>'),
    sunset: svg('<rect width="100" height="100" rx="18" fill="#ff9e6b"/><rect width="100" height="40" rx="18" fill="#7b4ea3"/><rect y="24" width="100" height="26" fill="#d86a86"/>' +
      '<circle cx="50" cy="66" r="20" fill="#ffd54a"/><path d="M0 66h100v34H0z" fill="#3b2f5e"/><path d="M0 66q25-8 50 0t50 0" fill="none" stroke="#5a4a80" stroke-width="3"/>'),
    night: svg('<rect width="100" height="100" rx="18" fill="#1b174a"/><g fill="#fff6cf"><path d="M30 26l2.6 6.4 6.9.5-5.3 4.5 1.7 6.7-5.9-3.7-5.9 3.7 1.7-6.7-5.3-4.5 6.9-.5z"/><path d="M70 52l2 5 5.4.4-4.1 3.5 1.3 5.2-4.6-2.9-4.6 2.9 1.3-5.2-4.1-3.5 5.4-.4z"/><circle cx="62" cy="22" r="2.4"/><circle cx="20" cy="66" r="2"/><circle cx="84" cy="80" r="2"/><circle cx="44" cy="78" r="1.8"/></g>'),
    mosque: svg('<rect width="100" height="100" rx="18" fill="#bfe6ff"/><path d="M14 86V56h72v30z" fill="#fff3d6" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M30 56a20 20 0 0 1 40 0z" fill="#3fae9a" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/><path d="M50 36V26" stroke="' + INK + '" stroke-width="2.5"/><path d="M52 18a6 6 0 1 0 4 9 5 5 0 0 1-4-9z" fill="#f6c453"/>' +
      '<rect x="76" y="28" width="9" height="58" fill="#fff3d6" stroke="' + INK + '" stroke-width="2.5"/><path d="M74 28l6.5-10 6.5 10z" fill="#3fae9a" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M43 86V72a7 7 0 0 1 14 0v14z" fill="#7a4a2a" stroke="' + INK + '" stroke-width="2.5"/><path d="M22 66h8v10h-8zM66 66h6v10h-6z" fill="#9ad0f0" stroke="' + INK + '" stroke-width="2"/>'),
    quran: svg('<path d="M12 84l14-22h48l14 22z" fill="#9a6a3c" stroke="#5a3a1c" stroke-width="2.5" stroke-linejoin="round"/><path d="M26 62l8 22M74 62l-8 22" stroke="#5a3a1c" stroke-width="2.5"/>' +
      '<path d="M50 30C40 22 26 22 16 26v38c10-4 24-4 34 4z" fill="#fffaf0" stroke="#1f7a5c" stroke-width="3" stroke-linejoin="round"/><path d="M50 30c10-8 24-8 34-4v38c-10-4-24-4-34 4z" fill="#fffaf0" stroke="#1f7a5c" stroke-width="3" stroke-linejoin="round"/>' +
      '<g stroke="#c9b48a" stroke-width="2" stroke-linecap="round"><path d="M24 36q9-3 18 1M24 44q9-3 18 1M24 52q9-3 18 1M58 37q9-4 18-1M58 45q9-4 18-1M58 53q9-4 18-1"/></g>'),
    lantern: svg('<path d="M50 6v10" stroke="#8a5a1c" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="10" r="5" fill="none" stroke="#8a5a1c" stroke-width="3"/>' +
      '<path d="M34 30q16-18 32 0z" fill="#d9912b" stroke="#8a5a1c" stroke-width="2.5" stroke-linejoin="round"/><path d="M32 30h36l6 44H26z" fill="#ffe08a" stroke="#8a5a1c" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M44 30l-4 44M56 30l4 44" stroke="#d9912b" stroke-width="2.5"/><path d="M50 44c6 6 7 12 0 18-7-6-6-12 0-18z" fill="#ff8a3d"/><path d="M24 74h52l-4 12H28z" fill="#d9912b" stroke="#8a5a1c" stroke-width="2.5" stroke-linejoin="round"/>'),
    plate: svg('<rect width="100" height="100" rx="18" fill="#2a2a6e"/><path d="M70 14a12 12 0 1 0 8 18 10 10 0 0 1-8-18z" fill="#ffe08a"/>' +
      '<ellipse cx="46" cy="72" rx="36" ry="12" fill="#fff3d6" stroke="#c9a769" stroke-width="2.5"/><path d="M22 66a24 18 0 0 1 48 0z" fill="#f2c27a" stroke="#b9853c" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M32 58q4-6 8 0M46 54q4-6 8 0" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M38 40q-4-6 0-12M52 38q-4-6 0-12" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".7"/>'),
    gift: svg('<rect x="16" y="42" width="68" height="44" rx="6" fill="#7fd6c2" stroke="#2f8f7c" stroke-width="2.5"/><rect x="12" y="30" width="76" height="16" rx="5" fill="#9be3d2" stroke="#2f8f7c" stroke-width="2.5"/>' +
      '<rect x="44" y="30" width="12" height="56" fill="#f6c453" stroke="#c98a2b" stroke-width="2"/><path d="M50 30c-6-16-24-14-20-4 2 5 12 5 20 4zM50 30c6-16 24-14 20-4-2 5-12 5-20 4z" fill="#f6c453" stroke="#c98a2b" stroke-width="2.5" stroke-linejoin="round"/>'),
    heart: svg('<path d="M50 86S14 64 14 38c0-13 10-22 21-22 7 0 12 4 15 9 3-5 8-9 15-9 11 0 21 9 21 22 0 26-36 48-36 48z" fill="#ff7a8a" stroke="#c23b55" stroke-width="3" stroke-linejoin="round"/><path d="M28 34q3-8 11-8" stroke="#ffd0d6" stroke-width="5" fill="none" stroke-linecap="round"/>'),
    shout: svg('<path d="M14 20h72a8 8 0 0 1 8 8v36a8 8 0 0 1-8 8H50L32 90V72H14a8 8 0 0 1-8-8V28a8 8 0 0 1 8-8z" fill="#ffe1e1" stroke="#c23b55" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M20 52l10-14 9 14 9-14 9 14 9-14 10 14" fill="none" stroke="#c23b55" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'),
    ball: svg('<circle cx="50" cy="52" r="34" fill="#ff9d4a" stroke="#b9601c" stroke-width="3"/><path d="M16 52h68M50 18v68M26 28q24 24 0 48M74 28q-24 24 0 48" fill="none" stroke="#b9601c" stroke-width="3"/>'),
    bed: svg('<path d="M10 78V34" stroke="#7a4a2a" stroke-width="7" stroke-linecap="round"/><path d="M90 78V52" stroke="#7a4a2a" stroke-width="7" stroke-linecap="round"/><rect x="10" y="54" width="80" height="16" rx="4" fill="#9a6a3c"/>' +
      '<rect x="14" y="40" width="26" height="16" rx="7" fill="#fff" stroke="#c9c2d6" stroke-width="2.5"/><path d="M42 54V46a6 6 0 0 1 6-6h36a6 6 0 0 1 6 6v8z" fill="#7d6bd6" stroke="#4d3ea6" stroke-width="2.5"/>'),
    mat: svg('<path d="M24 12h52v76H24z" fill="#2f8f7c" stroke="#1c5c50" stroke-width="3" stroke-linejoin="round"/><path d="M32 82V40a18 18 0 0 1 36 0v42z" fill="#f6e2b0" stroke="#c9a769" stroke-width="2.5"/>' +
      '<path d="M50 30v10M44 48h12" stroke="#2f8f7c" stroke-width="3" stroke-linecap="round"/><path d="M24 12v-6M34 12v-6M44 12v-6M54 12v-6M64 12v-6M76 12v-6M24 88v6M34 88v6M44 88v6M54 88v6M64 88v6M76 88v6" stroke="#1c5c50" stroke-width="2.5" stroke-linecap="round"/>'),
    palm: svg('<path d="M48 90c0-22 2-36 6-48" stroke="#8a5a2b" stroke-width="8" fill="none" stroke-linecap="round"/><g fill="#3fae6a" stroke="#1f7a44" stroke-width="2.5" stroke-linejoin="round"><path d="M54 42C40 26 22 28 12 40c14-4 28-2 42 2z"/><path d="M54 42C68 24 86 26 94 40c-14-6-28-4-40 2z"/><path d="M54 42C46 22 52 10 66 6c-6 12-8 24-12 36z"/><path d="M54 42C36 38 22 46 18 60c10-10 22-14 36-18z"/><path d="M54 42c18-2 30 8 32 22-8-12-18-18-32-22z"/></g><g fill="#8a4b20"><circle cx="50" cy="48" r="4"/><circle cx="58" cy="50" r="4"/><circle cx="54" cy="55" r="4"/></g>'),
    coins: svg('<path d="M30 40h40l8 44a6 6 0 0 1-6 6H28a6 6 0 0 1-6-6z" fill="#c98a5a" stroke="#7a4a2a" stroke-width="3" stroke-linejoin="round"/><path d="M34 40q16-12 32 0" fill="none" stroke="#7a4a2a" stroke-width="3"/>' +
      '<g fill="#f6c453" stroke="#b9801c" stroke-width="2.5"><circle cx="40" cy="24" r="9"/><circle cx="60" cy="20" r="9"/><circle cx="50" cy="64" r="11"/></g><path d="M50 58v12M45 64h10" stroke="#b9801c" stroke-width="2.5" stroke-linecap="round"/>'),
    shield: svg('<path d="M50 8l34 10v28c0 22-14 36-34 46-20-10-34-24-34-46V18z" fill="#7d9df0" stroke="#34509c" stroke-width="3" stroke-linejoin="round"/><path d="M50 18l24 7v21c0 16-9 27-24 35z" fill="#a9c0ff"/>' +
      '<path d="M50 34l5 10 11 1.2-8.3 7.4 2.5 10.8L50 58l-10.2 5.4 2.5-10.8L34 45.2 45 44z" fill="#f6c453" stroke="#b9801c" stroke-width="2"/>'),
    gate: svg('<rect width="100" height="100" rx="18" fill="#dff6e8"/><path d="M22 90V44a28 28 0 0 1 56 0v46z" fill="#3fae6a" stroke="#1f7a44" stroke-width="3" stroke-linejoin="round"/><path d="M32 90V46a18 18 0 0 1 36 0v44z" fill="#fff8dc" stroke="#c9a769" stroke-width="2.5"/>' +
      '<path d="M50 28v62" stroke="#c9a769" stroke-width="2.5"/><circle cx="45" cy="62" r="2.6" fill="#c98a2b"/><circle cx="55" cy="62" r="2.6" fill="#c98a2b"/><g fill="#f6c453"><circle cx="20" cy="22" r="3"/><circle cx="80" cy="22" r="3"/><circle cx="50" cy="8" r="3"/></g>'),
    no: svg('<circle cx="50" cy="50" r="36" fill="#fde3e6" stroke="#e0566b" stroke-width="8"/><path d="M25 25l50 50" stroke="#e0566b" stroke-width="8" stroke-linecap="round"/>'),
    yes: svg('<circle cx="50" cy="50" r="38" fill="#dff6e8" stroke="#2fa56a" stroke-width="7"/><path d="M30 52l14 14 28-30" fill="none" stroke="#2fa56a" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>')
  };

  // ---------- a lantern for each stop ----------
  // state: 'lit' (finished), 'open' (can be played), 'locked'. boss stops get a star on top.
  A.stopPic = function (state, boss) {
    var lit = state === 'lit', open = state === 'open';
    var metal = lit ? '#c98a2b' : open ? '#b9853c' : '#5a557e', edge = lit ? '#7a4a12' : open ? '#6a4a1c' : '#39355c';
    var glass = lit ? 'url(#lg)' : open ? '#fff3d6' : '#8f8ab0';
    return '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="lg" cx="50%" cy="55%" r="60%"><stop offset="0" stop-color="#fffbe0"/><stop offset=".6" stop-color="#ffd978"/><stop offset="1" stop-color="#f6a93a"/></radialGradient></defs>' +
      (lit ? '<circle cx="32" cy="42" r="30" fill="#ffd978" opacity=".28"/>' : '') +
      (boss ? '<path d="M32 0l2.6 5.2 5.8.6-4.3 3.9 1.3 5.7L32 12.6l-5.4 2.8 1.3-5.7-4.3-3.9 5.8-.6z" fill="' + (state === 'locked' ? '#8f8ab0' : '#f6c453') + '" stroke="' + edge + '" stroke-width="1.2"/>'
            : '<circle cx="32" cy="7" r="4" fill="none" stroke="' + edge + '" stroke-width="2.4"/>') +
      '<path d="M19 22q13-14 26 0z" fill="' + metal + '" stroke="' + edge + '" stroke-width="2" stroke-linejoin="round"/><path d="M32 11v3" stroke="' + edge + '" stroke-width="2.4"/>' +
      '<path d="M17 22h30l5 38H12z" fill="' + glass + '" stroke="' + edge + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M24 22l-4 38M40 22l4 38" stroke="' + metal + '" stroke-width="1.6" opacity=".7"/>' +
      '<path d="M10 60h44l-3 10H13z" fill="' + metal + '" stroke="' + edge + '" stroke-width="2" stroke-linejoin="round"/></svg>';
  };

  // ---------- the sky (fixed behind the map): stars and a moon that follows the month ----------
  function rnd(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
  function moon(cx, cy, r, done, total) {
    var day = Math.min(29, done + 1), phase = day / 29.5;            // 0 new .. 0.5 full .. 1 new
    var f = (1 - Math.cos(2 * Math.PI * phase)) / 2, waxing = phase <= 0.5;
    var rx = (r * Math.abs(1 - 2 * f)).toFixed(2), sweep = f < 0.5 ? 0 : 1;
    var d = 'M0 ' + (-r) + 'A' + r + ' ' + r + ' 0 0 1 0 ' + r + 'A' + rx + ' ' + r + ' 0 0 ' + sweep + ' 0 ' + (-r) + 'Z';
    return '<g class="qz-hide-play" transform="translate(' + cx + ' ' + cy + ')"><circle r="' + (r * 1.9) + '" fill="#ffe9a8" opacity=".07"/><circle r="' + (r * 1.4) + '" fill="#ffe9a8" opacity=".08"/>' +
      '<circle r="' + r + '" fill="#2c2766"/><path d="' + d + '" fill="#ffe9a8"' + (waxing ? '' : ' transform="scale(-1 1)"') + '/></g>';
  }
  A.sky = function (w, h, done, total) {
    var r = rnd(7), s = '';
    for (var i = 0; i < 70; i++) {
      var x = (r() * w).toFixed(1), y = (r() * h).toFixed(1), k = r();
      s += '<circle cx="' + x + '" cy="' + y + '" r="' + (0.6 + k * 1.3).toFixed(1) + '" fill="#fff" opacity="' + (0.25 + k * 0.6).toFixed(2) + '"/>';
    }
    var mr = Math.max(22, Math.min(40, Math.min(w, h) * 0.07));
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' + s + moon(w - mr * 2.1, 84 + mr, mr, done, total) + '</svg>';
  };

  // ---------- the skyline at the foot of the path, where the journey starts ----------
  A.decor = function (w, h) {
    var b = h, x = w / 2, d = '#120d36', m = '#1c1650';
    function dome(cx, base, rw) { return 'M' + (cx - rw) + ' ' + base + 'a' + rw + ' ' + rw + ' 0 0 1 ' + (rw * 2) + ' 0z'; }
    function minaret(cx, base, hh) { return 'M' + (cx - 7) + ' ' + base + 'v' + (-hh) + 'l7-16 7 16v' + hh + 'z'; }
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      '<path d="M0 ' + (b - 86) + 'q' + (w * 0.25) + '-40 ' + (w * 0.5) + '-14t' + (w * 0.5) + '-10V' + b + 'H0z" fill="' + m + '"/>' +
      '<g fill="' + d + '">' +
      '<path d="' + dome(x, b - 78, 46) + '"/><path d="M' + (x - 70) + ' ' + (b - 78) + 'h140v60h-140z"/>' +
      '<path d="' + dome(x - 96, b - 56, 22) + '"/><path d="' + dome(x + 96, b - 56, 22) + '"/><path d="M' + (x - 124) + ' ' + (b - 56) + 'h248v40h-248z"/>' +
      '<path d="' + minaret(x - 150, b - 20, 110) + '"/><path d="' + minaret(x + 150, b - 20, 110) + '"/>' +
      '<path d="M0 ' + (b - 30) + 'q' + (w * 0.3) + '-26 ' + (w * 0.55) + '-8t' + (w * 0.45) + '-12V' + b + 'H0z"/></g>' +
      '<path d="M' + (x - 2) + ' ' + (b - 124) + 'v-14" stroke="#f6c453" stroke-width="2.5"/><path d="M' + (x + 3) + ' ' + (b - 152) + 'a7 7 0 1 0 5 11 6 6 0 0 1-5-11z" fill="#f6c453"/>' +
      '<g fill="#ffd978" opacity=".85"><rect x="' + (x - 44) + '" y="' + (b - 62) + '" width="10" height="16" rx="5"/><rect x="' + (x - 5) + '" y="' + (b - 62) + '" width="10" height="16" rx="5"/><rect x="' + (x + 34) + '" y="' + (b - 62) + '" width="10" height="16" rx="5"/></g></svg>';
  };
})();
