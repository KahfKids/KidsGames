/* Kahf KidsGames kit: ui.js
   Floating HUD pills and buttons, first-level hints, and sheets (pause, level complete with stars,
   try again, level select). DOM overlays above the full-screen canvas; styles in kit.css. */
(function () {
  'use strict';
  var Kit = window.Kit = window.Kit || {};

  var P = 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
  var ICON = {
    pause: '<svg viewBox="0 0 24 24" ' + P + '><path d="M9 5v14M15 5v14"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
    restart: '<svg viewBox="0 0 24 24" ' + P + '><path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v5h5"/></svg>',
    levels: '<svg viewBox="0 0 24 24" ' + P + '><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></svg>',
    next: '<svg viewBox="0 0 24 24" ' + P + '><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" ' + P + '><path d="M6 6l12 12M18 6L6 18"/></svg>',
    sound: '<svg viewBox="0 0 24 24" ' + P + '><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
    soundOff: '<svg viewBox="0 0 24 24" ' + P + '><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
    lock: '<svg class="lock" viewBox="0 0 24 24" ' + P + '><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.2 0 3.6 1.2 5.2 3 1.6-1.8 3-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z" fill="#ff5d73" stroke="#7a1030" stroke-width="1.2"/></svg>',
    hand: '<svg viewBox="0 0 24 24" fill="#fff" stroke="#2a1a4a" stroke-width="1.2" stroke-linejoin="round"><path d="M9 11V4.5a1.5 1.5 0 0 1 3 0V10l.1-1.6a1.5 1.5 0 0 1 3 .2V11l.2-.9a1.4 1.4 0 0 1 2.8.5V15c0 3.3-2.4 6-5.6 6h-1a5.6 5.6 0 0 1-4.6-2.5l-2.6-4a1.5 1.5 0 0 1 2.4-1.8L9 15z"/></svg>'
  };
  function starSvg(fill) {
    return '<svg viewBox="-50 -50 100 100"><path d="M0-46 13-31 32-32 31-13 46 0 31 13 32 32 13 31 0 46-13 31-32 32-31 13-46 0-31-13-32-32-13-31Z" fill="' +
      (fill || '#f6c453') + '" stroke="#7a4a12" stroke-width="4" stroke-linejoin="round"/><path d="M0-30 9-20 21-21 20-9 30 0" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="5" stroke-linecap="round"/></svg>';
  }
  Kit.icons = ICON;
  Kit.starSvg = starSvg;

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  // ---------- HUD ----------
  var hud = null;
  function ensureHud() {
    if (!hud) { hud = el('div', 'kit-hud'); document.body.appendChild(hud); }
    return hud;
  }
  var ui = Kit.ui = {
    icon: ICON,
    // Kit.ui.pill(html) -> element (updatable via .set(html), .bump())
    pill: function (html) {
      var p = el('div', 'kit-pill', html); ensureHud().appendChild(p);
      p.set = function (h) { if (p._h !== h) { p._h = h; p.innerHTML = h; } };
      p.bump = function () { p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); };
      return p;
    },
    spacer: function () { ensureHud().appendChild(el('div', 'kit-spacer')); },
    iconButton: function (icon, label, onClick) {
      var b = el('button', 'kit-btn-icon', ICON[icon] || icon);
      b.setAttribute('aria-label', label);
      b.addEventListener('click', function (e) { e.stopPropagation(); Kit.sfx && Kit.sfx.play('tap'); onClick(); });
      ensureHud().appendChild(b);
      b.setIcon = function (i) { b.innerHTML = ICON[i] || i; };
      return b;
    },
    hearts: function (max) {
      var p = ui.pill('');
      var box = el('span', 'kit-hearts'); p.innerHTML = ''; p.appendChild(box);
      for (var i = 0; i < max; i++) box.insertAdjacentHTML('beforeend', ICON.heart);
      p.setLives = function (n) { [].forEach.call(box.children, function (s, i) { s.classList.toggle('lost', i >= n); }); };
      p.setMax = function (m) { while (box.children.length < m) box.insertAdjacentHTML('beforeend', ICON.heart); while (box.children.length > m) box.lastChild.remove(); };
      return p;
    },

    // ---------- hints ----------
    hint: function (text, bottomPx, withHand) {
      var h = el('div', 'kit-hint', (withHand ? ICON.hand : '') + '<span>' + text + '</span>');
      h.style.bottom = 'calc(' + (bottomPx || 120) + 'px + var(--kit-sb))';
      document.body.appendChild(h);
      h.hide = function () { if (h._gone) return; h._gone = 1; h.classList.add('out'); setTimeout(function () { h.remove(); }, 600); };
      return h;
    },

    // ---------- sheets ----------
    // Kit.ui.sheet({ title, text, stars (0-3 or null), buttons: [{ label, icon, primary, row, onClick }], onClose, closeable })
    sheet: function (o) {
      var veil = el('div', 'kit-veil'), frame = el('div', 'kit-sheet'), box = el('div', 'kit-sheet-in');
      veil.appendChild(frame); frame.appendChild(box);
      if (o.closeable) {
        var x = el('button', 'kit-btn-icon kit-close', ICON.close);
        x.setAttribute('aria-label', 'Close');
        x.onclick = function () { Kit.sfx && Kit.sfx.play('tap'); close(); if (o.onClose) o.onClose(); };
        frame.appendChild(x);
      }
      if (o.title) box.appendChild(el('h2', '', o.title));
      if (o.text) box.appendChild(el('p', '', o.text));
      if (o.stars != null) {
        var s = el('div', 'kit-stars');
        for (var i = 0; i < 3; i++) s.insertAdjacentHTML('beforeend', starSvg());
        box.appendChild(s);
        [].forEach.call(s.children, function (svg, i) {
          setTimeout(function () {
            svg.classList.add(i < o.stars ? 'on' : 'off');
            if (i < o.stars && Kit.sfx) Kit.sfx.play('star', { n: i });
          }, 350 + i * 330);
        });
      }
      if (o.content) box.appendChild(o.content);
      if (o.buttons && o.buttons.length) {
        var acts = el('div', 'kit-actions'), row = null;
        o.buttons.forEach(function (b) {
          var btn = el('button', 'kit-btn' + (b.primary ? ' primary' : ''), (b.icon ? ICON[b.icon] : '') + '<span>' + b.label + '</span>');
          btn.onclick = function () { Kit.sfx && Kit.sfx.play('tap'); close(); b.onClick && b.onClick(); };
          if (b.row) { if (!row) { row = el('div', 'row'); acts.appendChild(row); } row.appendChild(btn); }
          else { row = null; acts.appendChild(btn); }
        });
        box.appendChild(acts);
      }
      document.body.appendChild(veil);
      setTimeout(function () { veil.classList.add('in'); }, 30);
      var closed = false;
      function close() {
        if (closed) return; closed = true;
        veil.classList.remove('in');
        setTimeout(function () { veil.remove(); }, 260);
      }
      return { close: close, el: frame };
    },

    // Kit.ui.levelSelect({ worlds: [{ name, color, from, to }], progress, current, onPick(n), onClose })
    levelSelect: function (o) {
      var wrap = el('div', 'kit-worlds');
      o.worlds.forEach(function (w) {
        var sec = el('div', 'kit-world'); sec.style.setProperty('--c', w.color);
        var got = 0, max = (w.to - w.from + 1) * 3;
        for (var n = w.from; n <= w.to; n++) got += o.progress.stars(n);
        sec.appendChild(el('h3', '', w.name + '<span>' + got + ' / ' + max + ' ★</span>'));
        var grid = el('div', 'kit-levels');
        for (var k = w.from; k <= w.to; k++) (function (n) {
          var open = o.progress.unlocked(n), st = o.progress.stars(n);
          var b = el('button', 'kit-lv' + (n === o.current ? ' cur' : ''));
          b.setAttribute('aria-label', 'Level ' + n + (open ? '' : ' (locked)'));
          if (!open) { b.disabled = true; b.innerHTML = ICON.lock; }
          else {
            var stars = '';
            for (var i = 0; i < 3; i++) stars += starSvg(i < st ? '#f6c453' : 'rgba(255,255,255,.18)');
            b.innerHTML = '<span>' + (n - w.from + 1) + '</span><span class="st">' + stars + '</span>';
            b.onclick = function () { sh.close(); o.onPick(n); };
          }
          grid.appendChild(b);
        })(k);
        sec.appendChild(grid);
        wrap.appendChild(sec);
      });
      var sh = ui.sheet({ title: o.title || 'Levels', content: wrap, closeable: true, onClose: o.onClose });
      return sh;
    }
  };
})();
