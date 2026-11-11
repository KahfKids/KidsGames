/* Helping Home: the page shell shared by the adhan and salah stations (window.PS).
   Loaded after iso/core.js, the kit, iso/voice.js and iso/flow.js; the station calls mountFigure first, then PS.mount.

   - Layout for a child: a top bar (home, a title pill with progress dots, sound), the figure, a words card and
     big controls at the bottom (side by side on a wide screen). Touch only, safe areas, targets of 48px or more.
   - Fast frames with no quality loss (same idea as iso/kidpass.js, copied here): the scene string is split by
     <!--DYN-->..<!--/DYN--> into three stacked SVG layers that keep the hand-drawn filter, and only a layer whose
     markup changed is rewritten. A fourth layer, <!--FX-->..<!--/FX-->, has no filter: glows and sound rings
     there are animated by CSS (opacity/transform only), so nothing is redrawn while they pulse.
   - PS.say(lines): plays recorded clips one after another through HHVoice (a missing clip becomes a pause), and
     lights the line being said. Every line is always shown as text too.
   - PS.finish(): KahfBridge.complete(), then HHFlow.done(station) or the kit's finish sheet. */
(function () {
  'use strict';
  var PS = window.PS = {};
  var NS = 'http://www.w3.org/2000/svg';

  // HHVoice reads Kit.sfx.ctx / Kit.sfx.out, but the kit exposes them on Kit.sfx.lib; bridge them so recorded
  // clips play instead of always falling back to a pause. (Reported to the voice.js owner.)
  try {
    if (window.Kit && Kit.sfx && Kit.sfx.lib && !('ctx' in Kit.sfx)) {
      Object.defineProperty(Kit.sfx, 'ctx', { get: function () { return Kit.sfx.lib.ctx; } });
      Object.defineProperty(Kit.sfx, 'out', { get: function () { return Kit.sfx.lib.out; } });
    }
  } catch (e) {}

  var AR = '"Noto Naskh Arabic","Geeza Pro","Amiri Quran","Amiri","Traditional Arabic","Times New Roman",serif';
  var UI = 'ui-rounded,"SF Pro Rounded","Nunito",system-ui,sans-serif';
  var CSS = '' +
    ':root{--accent:#f4b829;--soft:#fbe6a6;--card:#fffaf0;--ink2:#5d5446}' +
    'html,body{height:100%}' +
    'body{padding:0!important;display:block!important;overflow:hidden!important;overscroll-behavior:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;font-family:' + UI + '}' +
    'body>header,#readout,.controls,.made-with,.actions,.toast{display:none!important}' +
    '.ps-app{position:fixed;inset:0;display:grid;grid-template-rows:auto minmax(0,1fr) auto;grid-template-columns:minmax(0,1fr);grid-template-areas:"top" "fig" "side";' +
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) 0 env(safe-area-inset-left)}' +
    '.ps-top{grid-area:top;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px 4px}' +
    '.ps-fig{grid-area:fig;position:relative;min-height:0;display:flex;align-items:center;justify-content:center;padding:0 8px}' +
    '.ps-fig .stage{max-width:none!important;width:100%;height:100%;padding:0!important;display:flex;align-items:center;justify-content:center}' +
    '.figstack{position:relative;width:100%;height:100%;contain:layout}' +
    '.figstack svg{position:absolute;left:0;top:0;display:block;width:100%!important;height:100%!important;max-width:none!important;margin:0!important;overflow:visible;touch-action:none}' +
    '.figstack .lay{pointer-events:none}.figstack .lay [data-act]{pointer-events:visiblePainted;cursor:pointer}' +
    '.ps-side{grid-area:side;display:flex;flex-direction:column;gap:10px;min-height:0;padding:4px 14px calc(env(safe-area-inset-bottom) + 14px)}' +
    /* top bar */
    '.ps-round{all:unset;box-sizing:border-box;width:48px;height:48px;flex:none;border-radius:50%;border:2.5px solid var(--ink);background:var(--paper);box-shadow:0 3px 0 var(--ink);display:grid;place-items:center;cursor:pointer}' +
    '.ps-round svg{width:26px;height:26px}.ps-round:active{transform:translateY(2px);box-shadow:0 1px 0 var(--ink)}.ps-round[hidden]{visibility:hidden;display:grid}' +
    '.ps-pill{flex:1;min-width:0;max-width:440px;display:flex;flex-direction:column;align-items:center;gap:5px;padding:6px 14px 7px;border-radius:999px;border:2.5px solid var(--ink);background:var(--card);box-shadow:0 3px 0 var(--ink)}' +
    '.ps-pill b{display:flex;align-items:center;gap:7px;font:800 15px/1.1 ' + UI + ';white-space:nowrap}.ps-pill b svg{width:20px;height:20px;flex:none}' +
    '.ps-dots{display:flex;gap:4px;flex-wrap:wrap;justify-content:center}.ps-dots i{width:8px;height:8px;border-radius:50%;border:1.5px solid var(--ink);box-sizing:border-box}' +
    '.ps-dots i.on{background:var(--ink)}.ps-dots i.cur{background:var(--accent);transform:scale(1.35)}.ps-dots i.gap{margin-left:5px}' +
    /* words card */
    '.ps-card{position:relative;overflow:auto;-webkit-overflow-scrolling:touch;max-height:var(--cardmax,42dvh);min-height:0;background:var(--card);border:2.5px solid var(--ink);border-radius:22px;box-shadow:0 4px 0 var(--ink);padding:10px 12px 12px;overscroll-behavior:contain}' +
    '.ps-h{display:flex;align-items:center;gap:8px;font:800 19px/1.2 ' + UI + ';margin:2px 4px 2px}.ps-h svg{width:24px;height:24px;flex:none}' +
    '.ps-hint{font:600 14.5px/1.35 ' + UI + ';color:var(--ink2);margin:2px 4px 6px}' +
    '.ps-line{padding:8px 10px 9px;border-radius:16px;border:2px solid transparent;transition:background .25s,border-color .25s,opacity .25s;margin-top:4px}' +
    '.ps-line.dim{opacity:.55}.ps-line.on{background:var(--soft);border-color:var(--ink)}' +
    '.ps-ar{direction:rtl;text-align:center;font:500 clamp(25px,6.6vw,34px)/1.85 ' + AR + ';color:var(--ink)}' +
    '.ps-tr{text-align:center;font:italic 700 15.5px/1.35 ' + UI + ';margin-top:2px}' +
    '.ps-en{text-align:center;font:500 13.5px/1.35 ' + UI + ';color:var(--ink2);margin-top:3px}' +
    '.ps-tag{display:inline-block;font:800 11.5px/1 ' + UI + ';letter-spacing:.04em;padding:4px 8px;border-radius:999px;border:1.5px solid var(--ink);background:var(--paper);margin:0 auto 4px}' +
    '.ps-rep{display:flex;justify-content:center;gap:6px;margin-top:5px}.ps-rep i{width:11px;height:11px;border-radius:50%;border:2px solid var(--ink);box-sizing:border-box}.ps-rep i.on{background:var(--accent)}' +
    '.ps-mid{display:flex;justify-content:center}' +
    /* controls */
    '.ps-ctl{display:flex;align-items:center;justify-content:center;gap:12px}' +
    '.ps-big{all:unset;box-sizing:border-box;position:relative;min-height:66px;min-width:0;flex:1;max-width:520px;padding:8px 22px;border-radius:999px;border:2.5px solid var(--ink);background:var(--accent);' +
      'box-shadow:0 5px 0 var(--ink);display:flex;align-items:center;justify-content:center;gap:12px;font:800 20px/1.15 ' + UI + ';color:var(--ink);cursor:pointer;text-align:center;transition:background .2s,opacity .2s}' +
    '.ps-big svg{width:30px;height:30px;flex:none}.ps-big:active{transform:translateY(3px);box-shadow:0 2px 0 var(--ink)}' +
    '.ps-big.wait{background:var(--paper);opacity:.75}' +
    // the engine's page CSS greys any hovered button, and touch screens keep :hover after a tap
    '.ps-app .ps-big:hover{background:var(--accent)}.ps-app .ps-big.wait:hover{background:var(--paper)}.ps-app .ps-round:hover{background:var(--paper)}' +
    '.ps-big.ready::after{content:"";position:absolute;inset:-3px;border-radius:999px;border:3px solid var(--accent);animation:psRing 1.5s ease-out infinite;pointer-events:none}' +
    '@keyframes psRing{0%{transform:scale(1);opacity:.95}100%{transform:scale(1.12,1.35);opacity:0}}' +
    '.ps-big .ps-two{display:flex;flex-direction:column;align-items:center;gap:1px;min-width:0}' +
    '.ps-big .ps-two .a{direction:rtl;font:500 clamp(22px,5.8vw,28px)/1.6 ' + AR + '}.ps-big .ps-two .t{font:italic 700 14px/1.2 ' + UI + '}' +
    /* figure overlays: CSS-only motion in the FX layer */
    '.ps-fx{pointer-events:none}' +
    '.ps-pulse{animation:psPulse 1.8s ease-in-out infinite}@keyframes psPulse{0%,100%{opacity:.35}50%{opacity:.95}}' +
    '.ps-wave{animation:psWave 2.1s ease-out infinite;opacity:0}@keyframes psWave{0%{transform:scale(.55);opacity:0}15%{opacity:.95}100%{transform:scale(1.45);opacity:0}}' +
    '.ps-wave.w2{animation-delay:.7s}.ps-wave.w3{animation-delay:1.4s}' +
    '@media (prefers-reduced-motion:reduce){.ps-wave,.ps-pulse,.ps-big.ready::after{animation:none}.ps-wave{opacity:.6}}' +
    /* the kit sheet in paper and ink */
    '.kit-veil{background:rgba(35,30,22,.35)!important}' +
    '.kit-sheet{background:var(--paper)!important;color:var(--ink)!important;border:2.5px solid var(--ink)!important;box-shadow:0 6px 0 var(--ink)!important}' +
    '.kit-sheet h2{font-family:' + UI + '!important;color:var(--ink)}.kit-sheet p{color:var(--ink2)!important;font-family:' + UI + '}' +
    '.kit-sheet .kit-btn{border:2.5px solid var(--ink)!important;box-shadow:0 4px 0 var(--ink)!important;font-family:' + UI + '!important;color:var(--ink)!important;background:var(--paper)!important}' +
    '.kit-sheet .kit-btn.primary{background:var(--accent)!important}' +
    /* wide screens: figure left, words right */
    '@media (min-width:760px) and (min-aspect-ratio:1/1){.ps-app{grid-template-columns:minmax(0,1.15fr) minmax(340px,1fr);grid-template-rows:auto minmax(0,1fr);grid-template-areas:"top top" "fig side"}' +
      '.ps-side{justify-content:center;padding:6px 22px calc(env(safe-area-inset-bottom) + 22px) 6px;--cardmax:none}.ps-card{flex:0 1 auto}.ps-top{padding:14px 22px 6px}}' +
    '@media (min-width:600px){.ps-ar{font-size:34px}}';

  var I = {
    home: '<path d="M3.5 11.5 12 4l8.5 7.5"/><path d="M6 10v9.5h4.5V15h3v4.5H18V10"/>',
    sound: '<path d="M4 9.5h4l5-4v13l-5-4H4z"/><path d="M16.5 9a4 4 0 0 1 0 6"/><path d="M19 6.5a7.5 7.5 0 0 1 0 11"/>',
    mute: '<path d="M4 9.5h4l5-4v13l-5-4H4z"/><path d="M17 9.5l4 5M21 9.5l-4 5"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
    pause: '<path d="M8 5.5v13M16 5.5v13"/>',
    again: '<path d="M5 12a7 7 0 1 0 2.2-5.1"/><path d="M5 4.5v4h4"/>',
    check: '<path d="M4.5 12.5 10 18 19.5 6.5"/>',
    back: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    reply: '<path d="M4 9.5h4l5-4v13l-5-4H4z"/><path d="M16.5 9a4 4 0 0 1 0 6"/>',
    hands: '<path d="M8.5 20v-6.5L6 8.5a1.3 1.3 0 0 1 2.3-1.2l2.2 4V4.8a1.3 1.3 0 0 1 2.6 0V11"/><path d="M13.1 11V6.2a1.3 1.3 0 0 1 2.6 0V12l1-2a1.3 1.3 0 0 1 2.3 1.2l-2.5 5V20"/>',
    minaret: '<path d="M12 2.5v2"/><path d="M9.5 9 12 4.5 14.5 9z"/><path d="M9.5 9h5v5h-5z"/><path d="M8 14h8"/><path d="M10 14v7.5h4V14"/><path d="M7 21.5h10"/>',
    mat: '<path d="M5 4h14v16H5z"/><path d="M8 20V10a4 4 0 0 1 8 0v10"/>',
    compass: '<circle cx="12" cy="12" r="8.5"/><path d="M12 6.5 14.5 12 12 17.5 9.5 12z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6"/>',
    moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
    dawn: '<path d="M3 17h18"/><path d="M7 17a5 5 0 0 1 10 0"/><path d="M12 7v2.2M5.5 10.5l1.5 1.5M18.5 10.5 17 12"/><path d="M6 20.5h12"/>',
    dusk: '<path d="M3 17h18"/><path d="M7 17a5 5 0 0 1 10 0"/><path d="M6 20.5h12"/><path d="M12 6.5v3M10.5 8 12 9.5 13.5 8"/>',
    next: '<path d="M4.5 12h14"/><path d="M13 6l6 6-6 6"/>',
  };
  PS.icons = I;
  PS.icon = function (n, col) { return '<svg viewBox="0 0 24 24" fill="none" stroke="' + (col || '#231e16') + '" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' + (I[n] || '') + '</svg>'; };
  PS.prayerIcon = { fajr: 'dawn', dhuhr: 'sun', asr: 'sun', maghrib: 'dusk', isha: 'moon', tahajjud: 'moon' };
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  PS.el = el;
  PS.esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  /* ---------- which prayer: ?p=…, else the current one from HHPrayer, else Dhuhr ---------- */
  PS.prayer = function () {
    var q = new URLSearchParams(location.search), p = (q.get('p') || '').toLowerCase(), ok = { fajr: 1, dhuhr: 1, asr: 1, maghrib: 1, isha: 1, tahajjud: 1 };
    if (ok[p]) return p;
    try {
      var H = window.HHPrayer;
      if (H) {
        var c = typeof H.current === 'function' ? H.current() : typeof H.now === 'function' ? H.now() : null;
        if (c && typeof c === 'object') c = c.name || c.prayer || c.id;
        c = String(c || '').toLowerCase();
        if (ok[c]) return c;
        var n = typeof H.next === 'function' ? H.next() : null;   // between prayers: the one coming up
        n = String(n && (n.name || n) || '').toLowerCase();
        if (ok[n]) return n;
      }
    } catch (e) {}
    return 'dhuhr';
  };

  /* ---------- the same four layers, drawn by PixiJS (iso/pix.js): the pictures are made once per change and shown
     as sprites; the glows and sound rings of the fx layer are moved by PixiJS. The page's <svg id="fig"> stays as
     an empty sheet that takes the finger and gives the frame. ---------- */
  function layersPixi(ui, sceneFn) {
    var fig = document.getElementById('fig'), art = document.getElementById('art');
    var stack = el('div', 'figstack'); fig.parentNode.insertBefore(stack, fig); stack.appendChild(fig);
    art.innerHTML = '';
    var last = ['', '', '', ''], st = ui.st, L = null;
    function push() { if (!L) return; L[0].set(last[0]); L[1].set(last[1]); L[2].set(last[2]); L[3].set(last[3]); }
    ui.render = function () {
      _clipN = 0;
      var full = inkScale(sceneFn(st)), a = full.indexOf('<!--FX-->'), fx = '';
      if (a >= 0) { var b = full.indexOf('<!--/FX-->'); fx = full.slice(a + 9, b); full = full.slice(0, a) + full.slice(b + 10); }
      var i = full.indexOf('<!--DYN-->'), j = full.indexOf('<!--/DYN-->');
      last[0] = i < 0 ? full : full.slice(0, i); last[1] = i < 0 ? '' : full.slice(i + 10, j); last[2] = i < 0 ? '' : full.slice(j + 11); last[3] = fx;
      push();
      if (PS.after) PS.after(st);
    };
    PS.redraw = function () { ui.render(); if (PS.px) PS.px.sync(); if (PS.onRefit) PS.onRefit(); };
    PS.stack = stack;
    PS.ready = HHPix.attach({ stack: stack, svg: fig }).then(function (px) {
      PS.px = px; L = [px.layer(), px.layer(), px.layer(), px.fx()];
      push(); PS.fit(PS.pad);
    }, function (e) { Kit.gfx.sorry(e); });
    return stack;
  }

  /* ---------- layers: under / moving / over (filtered) + fx (no filter, CSS motion) ---------- */
  function layers(ui, sceneFn) {
    var fig = document.getElementById('fig'), art = document.getElementById('art');
    var stack = el('div', 'figstack'); fig.parentNode.insertBefore(stack, fig); stack.appendChild(fig);
    function lay(filtered) {
      var s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'lay' + (filtered ? '' : ' ps-fx')); s.setAttribute('viewBox', fig.getAttribute('viewBox'));
      s.setAttribute('aria-hidden', 'true'); var g = document.createElementNS(NS, 'g'); if (filtered) g.setAttribute('filter', 'url(#hand)'); s.appendChild(g); stack.appendChild(s); return g;
    }
    var gD = lay(true), gO = lay(true), gF = lay(false), last = ['', '', '', ''], st = ui.st;
    ui.render = function () {
      _clipN = 0;
      var full = inkScale(sceneFn(st)), a = full.indexOf('<!--FX-->'), fx = '';
      if (a >= 0) { var b = full.indexOf('<!--/FX-->'); fx = full.slice(a + 9, b); full = full.slice(0, a) + full.slice(b + 10); }
      var i = full.indexOf('<!--DYN-->'), j = full.indexOf('<!--/DYN-->');
      var u = i < 0 ? full : full.slice(0, i), d = i < 0 ? '' : full.slice(i + 10, j), o = i < 0 ? '' : full.slice(j + 11);
      if (u !== last[0]) { art.innerHTML = u; last[0] = u; }
      if (d !== last[1]) { gD.innerHTML = d; last[1] = d; }
      if (o !== last[2]) { gO.innerHTML = o; last[2] = o; }
      if (fx !== last[3]) { gF.innerHTML = fx; last[3] = fx; }
      if (PS.after) PS.after(st);
    };
    PS.redraw = function () { last = ['', '', '', '']; ui.render(); if (PS.onRefit) PS.onRefit(); };
    // an extra layer above the others (a station's own moving part): the returned <g> is written by the station
    PS.layer = function (filtered, cls) { var g = lay(filtered); if (cls) g.parentNode.setAttribute('class', g.parentNode.getAttribute('class') + ' ' + cls); return g; };
    // presses on parts drawn in the upper layers (the engine only listens on the bottom one)
    stack.addEventListener('pointerdown', function (e) {
      if (e.button || fig.contains(e.target)) return;
      var t = e.target.closest && e.target.closest('[data-act]'); if (!t || !PS.acts || !PS.acts[t.dataset.act]) return;
      e.preventDefault(); e.stopPropagation(); PS.acts[t.dataset.act](st, t, ui); ui.render();
    });
    PS.stack = stack;
    return stack;
  }

  /* ---------- sounds: natural only, no music ---------- */
  function sounds() {
    if (!window.Kit || !Kit.sfx) return;
    Kit.sfx.define({
      tap: function (L, t) { L.click(t, { freq: 2600, vol: .16 }); },
      detent: function (L, t) { L.click(t, { freq: 3400, vol: .14 }); },
      click: function (L, t) { L.click(t, { freq: 1900, vol: .26 }); L.knock(t + .04, { size: 1.1, vol: .5 }); },
      cloth: function (L, t, o) { L.whoosh(t, { dur: o.dur || .5, from: 260, to: 900, vol: .1 }); L.thump(t + (o.dur || .5), { from: 150, to: 80, vol: .12 }); },
      soft: function (L, t) { L.thump(t, { from: 140, to: 70, vol: .14 }); },
      done: function (L, t) { L.grains(t, { n: 12, spread: .5, freq: 6200, vol: .08 }); },
    });
  }
  PS.play = function (n, o) { try { Kit.sfx && Kit.sfx.play(n, o); } catch (e) {} };

  /* ---------- the page ---------- */
  PS.mount = function (o) {
    var ui = o.ui;
    var style = el('style'); style.textContent = CSS; document.head.appendChild(style);
    PS.acts = o.acts || {};
    var app = el('div', 'ps-app'), top = el('div', 'ps-top'), figBox = el('div', 'ps-fig'), side = el('div', 'ps-side');
    app.appendChild(top); app.appendChild(figBox); app.appendChild(side);
    document.body.appendChild(app);
    figBox.appendChild(document.querySelector('.stage'));
    PS.pad = o.pad;
    if (o.pixi) layersPixi(ui, o.scene); else layers(ui, o.scene);
    sounds();

    var home = el('button', 'ps-round', PS.icon('home')); home.setAttribute('aria-label', 'Home');
    home.hidden = !(window.HHFlow && HHFlow.fromHouse);
    home.onclick = function () { PS.play('tap'); try { HHVoice.stop(); } catch (e) {} HHFlow.home(); };
    var pill = el('div', 'ps-pill', '<b></b><div class="ps-dots"></div>');
    var snd = el('button', 'ps-round'); snd.setAttribute('aria-label', 'Sound');
    function sndIcon() { snd.innerHTML = PS.icon(window.Kit && Kit.sfx && Kit.sfx.muted ? 'mute' : 'sound'); }
    snd.onclick = function () { if (window.Kit && Kit.sfx) { Kit.sfx.toggle(); if (Kit.sfx.muted) try { HHVoice.stop(); } catch (e) {} } sndIcon(); };
    sndIcon();
    top.appendChild(home); top.appendChild(pill); top.appendChild(snd);

    var card = el('div', 'ps-card'), ctl = el('div', 'ps-ctl');
    side.appendChild(card); side.appendChild(ctl);
    PS.ui = ui; PS.card = card; PS.ctl = ctl; PS.fig = figBox; PS.top = top;
    PS.title = function (html) { pill.querySelector('b').innerHTML = html; };
    PS.dots = function (n, cur, gaps) {
      var h = ''; for (var i = 0; i < n; i++) h += '<i class="' + (i < cur ? 'on' : i === cur ? 'cur' : '') + (gaps && gaps.indexOf(i) >= 0 ? ' gap' : '') + '"></i>';
      var d = pill.querySelector('.ps-dots'); if (d._h !== h) { d._h = h; d.innerHTML = h; }
    };
    ui.render();
    PS.fit(o.pad);
    precache(o.extra || []);
  };

  /* ---------- frame the drawing on what is really drawn (the engine frames a 4:3 box around the model's size),
     so the figure fills its area on a phone and on a tablet. Line weight and the hand-drawn filter are re-scaled
     for the new frame, exactly as the engine does at mount, so the look stays the same. ---------- */
  PS.fit = function (pad) {
    if (PS.px) return fitTo(PS.px.measure(PS.px.last()), pad);
    if (PS.ready) return;      // PixiJS is still starting: it frames the figure when it is up
    var svgs = [].slice.call(PS.stack.querySelectorAll('svg')), bb = null;
    svgs.forEach(function (s) { var g = s.firstElementChild === s.querySelector('defs') ? document.getElementById('art') : s.querySelector('g');
      try { var b = g.getBBox(); if (b.width && b.height) bb = bb ? { x0: Math.min(bb.x0, b.x), y0: Math.min(bb.y0, b.y), x1: Math.max(bb.x1, b.x + b.width), y1: Math.max(bb.y1, b.y + b.height) }
        : { x0: b.x, y0: b.y, x1: b.x + b.width, y1: b.y + b.height }; } catch (e) {} });
    fitTo(bb, pad);
  };
  // frame on a set of 3D points for the current camera (a station that wants a steady frame while things move in it)
  PS.fitBox = function (pts3, pad) {
    var q = pts3.map(function (p) { return P(p[0], p[1], p[2]); }), xs = q.map(function (v) { return v[0]; }), ys = q.map(function (v) { return v[1]; });
    fitTo({ x0: Math.min.apply(null, xs), y0: Math.min.apply(null, ys), x1: Math.max.apply(null, xs), y1: Math.max.apply(null, ys) }, pad);
  };
  function fitTo(bb, pad) {
    var svgs = PS.px ? [document.getElementById('fig')] : [].slice.call(PS.stack.querySelectorAll('svg')), fig = document.getElementById('fig');
    if (!bb) return;
    var p = (pad == null ? .05 : pad) * Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0), w = bb.x1 - bb.x0 + 2 * p, h = bb.y1 - bb.y0 + 2 * p;
    var vb = [bb.x0 - p, bb.y0 - p, w, h].map(function (v) { return v.toFixed(2); }).join(' ');
    svgs.forEach(function (s) { s.setAttribute('viewBox', vb); });
    var old = INK_K; INK_K = Math.max(w, h * .75) / INK_REF_VB;
    if (Math.abs(old - INK_K) > 1e-3) {
      document.getElementById('fdefs').innerHTML = filterFor(INK_K); bakeNoise(fig);
    }
    PS.redraw();
  }

  /* ---------- words ---------- */
  // one line of religious text: Arabic, transliteration, meaning (+ a tag such as "Al-Fatihah 1", + repeat dots)
  PS.lineHTML = function (t, opt) {
    opt = opt || {};
    var rep = '';
    if (t.repeat > 1) { rep = '<div class="ps-rep">'; for (var i = 0; i < t.repeat; i++) rep += '<i></i>'; rep += '</div>'; }
    return '<div class="ps-line' + (opt.cls ? ' ' + opt.cls : '') + '">' +
      (opt.tag ? '<div class="ps-mid"><span class="ps-tag">' + PS.esc(opt.tag) + '</span></div>' : '') +
      '<div class="ps-ar" lang="ar">' + t.ar + '</div><div class="ps-tr">' + PS.esc(t.tr) + (t.repeat > 1 ? ' <span style="font-style:normal">×' + t.repeat + '</span>' : '') + '</div>' +
      (opt.noMeaning ? '' : '<div class="ps-en">' + PS.esc(t.en) + '</div>') + rep + '</div>';
  };
  PS.lineEls = function () { return [].slice.call(PS.card.querySelectorAll('.ps-line')); };
  PS.light = function (idx, rep) {
    PS.lineEls().forEach(function (e, i) { e.classList.toggle('on', i === idx); });
    var cur = PS.lineEls()[idx];
    if (cur) {
      if (rep != null) [].forEach.call(cur.querySelectorAll('.ps-rep i'), function (d, k) { d.classList.toggle('on', k <= rep); });
      var c = PS.scroller || PS.card, top = cur.offsetTop - c.offsetTop - 8, bot = top + cur.offsetHeight + 16;
      if (top < c.scrollTop || bot > c.scrollTop + c.clientHeight) c.scrollTo({ top: Math.max(0, top - (c.clientHeight - cur.offsetHeight) * .25), behavior: Kit.reducedMotion ? 'auto' : 'smooth' });
    }
  };

  /* ---------- voice: say a list of lines in order (each may repeat); cancel with PS.hush() ---------- */
  var sayId = 0;
  PS.hush = function () { sayId++; PS.clip = null; try { HHVoice.stop(); } catch (e) {} };
  // the clip being said, for a word-by-word highlight: { seq, at (performance.now() when it started), dur (ms) }.
  // HHVoice doesn't report a clip's length, so the first buffer that starts after PS.say asks for a clip is noted
  // (recorded clips are far longer than the kit's short noise bursts, which are ignored).
  var clipSeq = 0, want = 0;
  PS.clip = null;
  try {
    var ABS = window.AudioBufferSourceNode && AudioBufferSourceNode.prototype, start0 = ABS && ABS.start;
    if (start0 && !ABS.__psClip) {
      ABS.__psClip = true;
      ABS.start = function () { try { if (want && this.buffer && this.buffer.duration > .3) { PS.clip = { seq: want, at: performance.now(), dur: this.buffer.duration * 1000 }; want = 0; } } catch (e) {} return start0.apply(this, arguments); };
    }
  } catch (e) {}
  // lines: [{ audio, ms, repeat }], cb.line(i, rep) before each clip; resolves true when all were said, false if cancelled
  PS.say = function (lines, cb) {
    var id = ++sayId; cb = cb || {};
    try { HHVoice.stop(); } catch (e) {}
    var i = 0, rep = 0;
    return new Promise(function (done) {
      (function next() {
        if (id !== sayId) return done(false);
        if (i >= lines.length) return done(true);
        var L = lines[i], n = L.repeat > 1 ? L.repeat : 1;
        PS.clipSeq = want = ++clipSeq; PS.clipStart = performance.now(); PS.clip = null;
        if (cb.line) cb.line(i, rep);
        var p = L.audio && window.HHVoice ? HHVoice.play(L.audio, { fallbackMs: L.ms || 2000 }) : new Promise(function (ok) { setTimeout(ok, L.ms || 2000); });
        // a watchdog: if the audio never ends (a context the system suspended), move on instead of waiting forever
        var dog = setTimeout(function () { if (id === sayId) try { HHVoice.stop(); } catch (e) {} }, Math.max(20000, (L.ms || 2000) * 4));
        p.then(function () { clearTimeout(dog); });
        p.then(function () {
          if (id !== sayId) return done(false);
          rep++; if (rep >= n) { rep = 0; i++; }
          setTimeout(next, rep ? 350 : 550);   // a short breath between repeats and lines
        });
      })();
    });
  };
  PS.preload = function (ids) { try { HHVoice.preload(ids.filter(Boolean)); } catch (e) {} };

  /* ---------- the end of a station ---------- */
  PS.finish = function (station, data, sheet) {
    try { window.KahfBridge && KahfBridge.complete(); } catch (e) {}
    PS.play('done');
    setTimeout(function () {
      if (window.HHFlow && HHFlow.done(station, data)) return;   // went on to the next station or the house
      try { Kit.say && Kit.say.praise && Kit.say.praise('mashaallah'); } catch (e) {}
      if (window.Kit && Kit.ui && Kit.ui.sheet) Kit.ui.sheet(sheet);
    }, 700);
  };

  /* ---------- a press-and-drag helper: maps the finger onto the floor plane z = z0 around a 3D centre ---------- */
  PS.floorAngle = function (e, c3) {
    var fig = document.getElementById('fig'), r = fig.getBoundingClientRect(), vb = fig.viewBox.baseVal;
    var k = Math.min(r.width / vb.width, r.height / vb.height), ox = r.left + (r.width - vb.width * k) / 2, oy = r.top + (r.height - vb.height * k) / 2;
    var sx = vb.x + (e.clientX - ox) / k, sy = vb.y + (e.clientY - oy) / k;
    var o = P(c3[0], c3[1], c3[2]), ax = P(c3[0] + 1, c3[1], c3[2]), ay = P(c3[0], c3[1] + 1, c3[2]);
    var a = ax[0] - o[0], b = ay[0] - o[0], c = ax[1] - o[1], d = ay[1] - o[1], det = a * d - b * c, X = sx - o[0], Y = sy - o[1];
    var u = (d * X - b * Y) / det, v = (-c * X + a * Y) / det;     // floor offsets (dx, dy) under the finger
    return Math.atan2(v, u);
  };

  /* ---------- offline: hand the service worker every file this page used, plus its clips ---------- */
  function precache(extra) {
    if (!('serviceWorker' in navigator)) return;
    var send = function () {
      var c = navigator.serviceWorker.controller; if (!c) return;
      var add = function (list) {
        var urls = [location.pathname].concat(performance.getEntriesByType('resource').map(function (e) { return e.name; }), extra, list || [])
          .map(function (u) { try { var x = new URL(u, location.href); return x.origin === location.origin && x.pathname.indexOf('/KidsGames/') === 0 ? x.pathname : null; } catch (e) { return null; } })
          .filter(function (u, i, a) { return u && a.indexOf(u) === i; });
        c.postMessage({ type: 'CACHE_URLS', urls: urls });
      };
      // every recorded clip (the game precaches all of its audio), so each phrase works offline after one visit
      if (window.HHVoice) HHVoice.files().then(add, function () { add(); }); else add();
    };
    if (document.readyState === 'complete') setTimeout(send, 400); else addEventListener('load', function () { setTimeout(send, 400); });
    navigator.serviceWorker.addEventListener('controllerchange', send);
  }
})();
