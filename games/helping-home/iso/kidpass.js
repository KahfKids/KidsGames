/* Helping Home: kid layer for a Colorfigures job page.
   Loaded after iso/core.js and the kit, before the figure. The figure calls HH.mount({...}) after mountFigure.

   What it adds:
   - A layout for a child on a phone or tablet: no header, no zoom, no wobble slider. A big icon step bar at the
     bottom (thumb reach) whose next step glows, plus colour swatches and a See-inside switch at the top.
   - Fast frames with no quality loss: the drawing is split into three stacked SVG layers (under, moving, over),
     each with the same hand-drawn filter. While the machine runs, only the small moving layer is redrawn; the
     other two keep their painted pixels (each is its own GPU layer). The spin shake is a CSS transform.
   - Sounds (natural, no music), Arabic praise, a finish sheet with stars, and the Kahf activity bridge.
   - Pauses its sounds when the app is hidden (the kit does this). */
(function () {
  'use strict';
  var HH = window.HH = window.HH || {};
  // a taller frame on phones (the engine reads this when it mounts)
  window.FIG_A = function () { return innerWidth <= 560 ? 1.05 : .75; };
  window.HH_CSS_SHAKE = true;

  // Kit sheets always wear the game's paper and ink (the kit's own sheet is dark purple, which made ink text unreadable
  // on pages that never call HH.mount, e.g. the house's prayer-times sheet).
  (function () {
    var st = document.createElement('style');
    st.textContent = '.kit-sheet{background:var(--paper,#fbf6ea)!important;color:var(--ink,#231e16)!important;border:2.5px solid var(--ink,#231e16)!important;box-shadow:0 6px 0 var(--ink,#231e16)!important}' +
      '.kit-sheet h2{color:var(--ink,#231e16)}.kit-veil{background:rgba(35,30,22,.35)!important}';
    (document.head || document.documentElement).appendChild(st);
  })();
  var CSS = '' +
    'body{padding:0!important;min-height:100dvh;justify-content:flex-start;overscroll-behavior:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}' +
    'body>header,#readout,.controls,.made-with,.actions,.vset,.mcap,.idea{display:none!important}' +
    '.stage{max-width:820px!important;width:100%;min-height:100dvh;display:flex;flex-direction:column;justify-content:center;padding:calc(env(safe-area-inset-top) + 64px) 12px calc(env(safe-area-inset-bottom) + 118px)}' +
    '.figstack{position:relative;width:100%;contain:layout}' +
    '.figstack svg{display:block;width:100%;height:auto;max-height:calc(100dvh - 200px - env(safe-area-inset-top) - env(safe-area-inset-bottom));margin:0!important;overflow:visible;touch-action:pan-y}' +
    '.figstack .lay{position:absolute;left:0;top:0;height:100%;pointer-events:none}' +
    '.figstack .lay [data-act]{pointer-events:visiblePainted;cursor:pointer}' +
    '.figstack svg{will-change:transform}' +
    '.toast{top:calc(env(safe-area-inset-top) + 70px)!important;left:50%!important;transform:translateX(-50%)!important;font:700 15px/1.3 ui-rounded,"SF Pro Rounded",system-ui,sans-serif!important;' +
      'letter-spacing:0!important;text-transform:none!important;padding:8px 16px!important;border-radius:999px!important;white-space:nowrap}' +
    /* top bar */
    '.hh-top{position:fixed;left:0;right:0;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:8px;' +
      'padding:calc(env(safe-area-inset-top) + 10px) 14px 8px;pointer-events:none}' +
    '.hh-top>*,.hh-top>.hh-round{pointer-events:auto}' +
    '.hh-sw{display:flex;gap:clamp(5px,1.6vw,8px)}' +
    '.hh-sw button{all:unset;width:clamp(24px,7vw,30px);height:clamp(24px,7vw,30px);border-radius:50%;border:2px solid var(--ink);box-shadow:0 2px 0 var(--ink);cursor:pointer}' +
    '.hh-sw button[aria-pressed=true]{outline:3px solid var(--ink);outline-offset:2px}' +
    '.hh-tb{display:flex;gap:8px}' +
    '.hh-round{all:unset;box-sizing:border-box;height:44px;min-width:44px;padding:0 14px;border-radius:999px;border:2px solid var(--ink);background:var(--paper);' +
      'box-shadow:0 3px 0 var(--ink);display:flex;align-items:center;gap:6px;font:800 14px ui-rounded,"SF Pro Rounded",system-ui,sans-serif;cursor:pointer}' +
    '.hh-round svg{width:24px;height:24px}.hh-round[aria-pressed=true]{background:var(--ink);color:var(--paper)}.hh-round[aria-pressed=true] svg *{stroke:var(--paper)}' +
    '@media (max-width:420px){.hh-round span{display:none}.hh-round{padding:0;width:44px;justify-content:center}}' +
    '.hh-round:active{transform:translateY(2px);box-shadow:0 1px 0 var(--ink)}' +
    /* step bar */
    '.hh-bar{position:fixed;left:0;right:0;bottom:0;z-index:5;display:flex;justify-content:center;gap:clamp(4px,2.4vw,16px);' +
      'padding:10px 8px calc(env(safe-area-inset-bottom) + 12px);background:linear-gradient(transparent,var(--paper) 22%)}' +
    '.hh-step{all:unset;position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;width:clamp(56px,15vw,84px);cursor:pointer;' +
      'font:800 11.5px/1.1 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;color:var(--ink);text-align:center}' +
    '.hh-step i{box-sizing:border-box;width:clamp(52px,14vw,66px);height:clamp(52px,14vw,66px);border-radius:50%;border:2.5px solid var(--ink);background:#fff9e8;' +
      'box-shadow:0 4px 0 var(--ink);display:grid;place-items:center;transition:transform .12s,box-shadow .12s,background .2s}' +
    '.hh-step i svg{width:62%;height:62%;overflow:visible}' +
    '.hh-step:active i{transform:translateY(3px);box-shadow:0 1px 0 var(--ink)}' +
    '.hh-step.done i{background:#e7f3dc}' +
    '.hh-step.off{opacity:.38}' +
    '.hh-step.next i{background:var(--accent,#f4b829)}' +
    '.hh-step.next::before{content:"";position:absolute;top:0;left:50%;width:clamp(52px,14vw,66px);height:clamp(52px,14vw,66px);margin-left:calc(clamp(52px,14vw,66px)/-2);' +
      'border-radius:50%;border:3px solid var(--accent,#f4b829);animation:hhRing 1.4s ease-out infinite;pointer-events:none}' +
    '@keyframes hhRing{0%{transform:scale(1);opacity:.9}100%{transform:scale(1.55);opacity:0}}' +
    '.hh-step.nudge i{animation:hhNudge .45s}' +
    '@keyframes hhNudge{0%,100%{transform:none}20%{transform:translateX(-6px) rotate(-6deg)}40%{transform:translateX(6px) rotate(6deg)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}' +
    '.hh-dot{position:absolute;top:-2px;right:calc(50% - clamp(52px,14vw,66px)/2 - 2px);width:16px;height:16px;border-radius:50%;border:2px solid var(--ink)}' +
    /* the kit's finish sheet, in paper and ink to match the drawings */
    '.kit-veil{background:rgba(35,30,22,.35)!important}' +
    '.kit-sheet{background:var(--paper)!important;color:var(--ink)!important;border:2.5px solid var(--ink)!important;box-shadow:0 6px 0 var(--ink)!important}' +
    '.kit-sheet h2{font-family:ui-rounded,"SF Pro Rounded",system-ui,sans-serif!important;color:var(--ink)}' +
    '.kit-sheet .kit-btn.primary{background:var(--accent,#f4b829)!important;color:var(--ink)!important;border:2.5px solid var(--ink)!important;box-shadow:0 4px 0 var(--ink)!important;' +
      'font-family:ui-rounded,"SF Pro Rounded",system-ui,sans-serif!important}' +
    '.kit-sheet .kit-btn:not(.primary){background:var(--paper)!important;color:var(--ink)!important;border:2.5px solid var(--ink)!important;box-shadow:0 3px 0 var(--ink)!important;' +
      'font-family:ui-rounded,"SF Pro Rounded",system-ui,sans-serif!important}' +
    /* a picker that pops up above its step: big picture choices */
    '.hh-pick{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 112px);z-index:6;display:flex;gap:12px;padding:12px 14px;border-radius:24px;' +
      'background:var(--paper);border:2.5px solid var(--ink);box-shadow:0 5px 0 var(--ink);transform:translateX(-50%) translateY(10px) scale(.92);opacity:0;' +
      'transition:transform .22s cubic-bezier(.2,1.4,.4,1),opacity .15s;pointer-events:none}' +
    '.hh-pick.in{transform:translateX(-50%);opacity:1;pointer-events:auto}' +
    '.hh-pick button{all:unset;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;font:800 13px ui-rounded,"SF Pro Rounded",system-ui,sans-serif}' +
    '.hh-pick i{box-sizing:border-box;width:68px;height:68px;border-radius:50%;border:2.5px solid var(--ink);box-shadow:0 4px 0 var(--ink);display:grid;place-items:center}' +
    '.hh-pick i svg{width:58%;height:58%}' +
    '.hh-pick button:active i{transform:translateY(3px);box-shadow:0 1px 0 var(--ink)}' +
    '.hh-pick button[aria-pressed=true] i{outline:3px solid var(--ink);outline-offset:3px}' +
    '@media (prefers-reduced-motion:reduce){.hh-step.next::before{animation:none}.hh-step.nudge i{animation:none}}' +
    '@media (min-width:900px){.stage{padding-top:72px}}';

  // ink-style icons, drawn on a 24-unit grid
  var I = {
    door: '<circle cx="12" cy="12.5" r="8.5"/><circle cx="12" cy="12.5" r="5.2"/><path d="M19.5 10v5"/>',
    load: '<path d="M7 5h10l3 4-3 2v8H7v-8L4 9z"/><path d="M10 5c0 1.6 4 1.6 4 0"/>',
    soap: '<path d="M9 8h6v12a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 20z"/><path d="M10.5 8V5h3v3"/><path d="M13.5 5h3l1 2"/><path d="M9 13h6"/>',
    prog: '<circle cx="12" cy="13" r="7"/><path d="M12 13V8.5"/><circle cx="5.5" cy="5" r="1.2"/><circle cx="12" cy="3.2" r="1.2"/><circle cx="18.5" cy="5" r="1.2"/>',
    start: '<circle cx="12" cy="12" r="9"/><path d="M10 8.2v7.6l6-3.8z"/>',
    unload: '<path d="M4 13h16l-1.6 7.5H5.6z"/><path d="M12 3v7"/><path d="M8.5 7 12 10.5 15.5 7"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3.2"/>',
    sound: '<path d="M4 9.5h4l5-4v13l-5-4H4z"/><path d="M16.5 9a4 4 0 0 1 0 6"/><path d="M19 6.5a7.5 7.5 0 0 1 0 11"/>',
    mute: '<path d="M4 9.5h4l5-4v13l-5-4H4z"/><path d="M17 9.5l4 5M21 9.5l-4 5"/>',
    quick: '<path d="M13.5 2.5 5.5 13.5h6l-1.5 8 8.5-11.5h-6z"/>',
    warm: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
    gentle: '<path d="M19.5 4.5C12 4.5 6.5 9.5 6 17.5l-1.5 2"/><path d="M19.5 4.5c0 7.5-5 12.5-13 13"/><path d="M9.5 14.5l4-4"/>',
  };
  HH.HOME_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/></svg>';
  function icon(name){ return '<svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + I[name] + '</svg>'; }
  HH.icon = icon; HH.icons = I;

  function el(tag, cls, html){ var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  /* ---------- three stacked layers: under / moving / over ---------- */
  function layers(ui, sceneFn, acts){
    var fig = document.getElementById('fig'), art = document.getElementById('art'), NS = 'http://www.w3.org/2000/svg';
    var stack = el('div', 'figstack'); fig.parentNode.insertBefore(stack, fig); stack.appendChild(fig);
    function lay(){ var s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'lay'); s.setAttribute('viewBox', fig.getAttribute('viewBox'));
      s.setAttribute('aria-hidden', 'true'); var g = document.createElementNS(NS, 'g'); g.setAttribute('filter', 'url(#hand)'); s.appendChild(g); stack.appendChild(s); return g; }
    var gD = lay(), gO = lay(), last = ['', '', ''];
    // zoom by viewBox, not CSS scale: the drawing is re-painted sharp at the new size (a scaled layer would blur).
    // Only the short zoom animation repaints all layers; once it settles, frames are cheap again.
    var svgs = [fig].concat([].slice.call(stack.querySelectorAll('.lay'))), vb0 = fig.getAttribute('viewBox').split(' ').map(Number), vb = vb0.slice(), zid = 0;
    function setVB(b){ var s = b.map(function (v) { return v.toFixed(2); }).join(' '); svgs.forEach(function (x) { x.setAttribute('viewBox', s); }); vb = b; }
    HH.zoom = function (p3, k, ms){
      var to = vb0;
      if (p3 && k > 1){ var q = P(p3[0], p3[1], p3[2]), w = vb0[2]/k, h = vb0[3]/k;
        to = [Math.max(vb0[0], Math.min(vb0[0] + vb0[2] - w, q[0] - w/2)), Math.max(vb0[1], Math.min(vb0[1] + vb0[3] - h, q[1] - h*.48)), w, h]; }
      if (Kit && Kit.reducedMotion) ms = 0;
      var from = vb.slice(), t0 = performance.now(), id = ++zid;
      (function step(){ if (id !== zid) return; var u = ms ? Math.min(1, (performance.now() - t0)/ms) : 1, e = u < .5 ? 2*u*u : 1 - Math.pow(-2*u + 2, 2)/2;
        setVB(from.map(function (v, i) { return v + (to[i] - v)*e; })); if (u < 1) requestAnimationFrame(step); })();
    };
    var st = ui.st;
    ui.render = function(){
      _clipN = 0;
      document.documentElement.style.setProperty('--accent', PALS[st.pal].l);
      var full = inkScale(sceneFn(st, PALS[st.pal])), i = full.indexOf('<!--DYN-->'), j = full.indexOf('<!--/DYN-->');
      var u = i < 0 ? full : full.slice(0, i), d = i < 0 ? '' : full.slice(i + 10, j), o = i < 0 ? '' : full.slice(j + 11);
      if (u !== last[0]){ art.innerHTML = u; last[0] = u; }
      if (d !== last[1]){ gD.innerHTML = d; last[1] = d; }
      if (o !== last[2]){ gO.innerHTML = o; last[2] = o; }
      var sh = window.SHAKE || [0, 0];
      var k = fig.clientWidth / fig.viewBox.baseVal.width;
      stack.style.transform = sh[0] || sh[1] ? 'translate(' + (sh[0]*k).toFixed(2) + 'px,' + (sh[1]*k).toFixed(2) + 'px)' : '';
      if (HH.after) HH.after(st);
    };
    // presses on parts drawn in the upper layers (the engine only listens on the bottom one)
    stack.addEventListener('pointerdown', function(e){
      if (e.button || fig.contains(e.target)) return;
      var a = e.target.closest && e.target.closest('[data-act]'); if (!a || !acts[a.dataset.act]) return;
      e.preventDefault(); e.stopPropagation(); acts[a.dataset.act](st, a, ui); ui.render();
    });
    return stack;
  }

  /* ---------- sounds: natural only (clicks, knocks, water, whooshes), no music ---------- */
  function sounds(){
    if (!window.Kit || !Kit.sfx) return;
    Kit.sfx.define({
      tap:   function (L, t) { L.click(t, { freq: 2600, vol: .16 }); },
      star:  function (L, t) { L.grains(t, { n: 8, spread: .2, freq: 7000, vol: .1 }); },
      latch: function (L, t) { L.click(t, { freq: 1800, vol: .22 }); L.knock(t + .05, { size: 1.3, vol: .6 }); },
      shut:  function (L, t) { L.thump(t, { from: 120, to: 55, vol: .35 }); L.click(t + .02, { freq: 2200, vol: .2 }); },
      cloth: function (L, t) { L.whoosh(t, { dur: .22, from: 300, to: 1100, vol: .1 }); L.thump(t + .2, { from: 170, to: 90, vol: .12 }); },
      pour:  function (L, t) { L.burst(t, { dur: 1.2, freq: 900, q: .7, vol: .08, brown: true, attack: .2 });
                               for (var i = 0; i < 5; i++) L.glide(t + .15 + i*.2, { from: 320 + i*40, to: 900, dur: .07, vol: .06 }); },
      detent:function (L, t) { L.click(t, { freq: 3400, vol: .2 }); L.click(t + .04, { freq: 2600, vol: .12 }); },
      press: function (L, t) { L.click(t, { freq: 2100, vol: .25 }); },
      fill:  function (L, t, o) { L.burst(t, { dur: o.dur, freq: 700, q: .6, vol: .13, brown: true, attack: .25 }); },
      slosh: function (L, t, o) { for (var x = 0; x < o.dur - .5; x += 1.3) L.burst(t + x, { dur: .8, freq: 420, sweepTo: 260, q: .9, vol: .12, brown: true, attack: .25 }); },
      drain: function (L, t, o) { L.burst(t, { dur: o.dur, freq: 380, q: 1.2, vol: .1, brown: true });
                                  for (var x = .1; x < o.dur; x += .23) L.glide(t + x, { from: 200 + Math.random()*120, to: 520, dur: .06, vol: .05 }); },
      spin:  function (L, t, o) { L.burst(t, { dur: o.dur, freq: 300, sweepTo: 1500, q: .8, vol: .1, brown: true, attack: o.dur*.5 }); },
      wind:  function (L, t, o) { L.burst(t, { dur: o.dur, freq: 1100, sweepTo: 250, q: .8, vol: .08, brown: true }); },
      done:  function (L, t) { L.grains(t, { n: 14, spread: .5, freq: 6500, vol: .1 }); },
      nope:  function (L, t) { L.thump(t, { from: 150, to: 80, vol: .3 }); L.thump(t + .12, { from: 120, to: 60, vol: .25 }); },
    });
  }
  HH.play = function (n, o) { try { Kit.sfx && Kit.sfx.play(n, o); } catch (e) {} };

  /* ---------- the page: top bar, step bar, finish sheet ---------- */
  HH.mount = function (o) {
    var ui = o.ui, st = ui.st;
    var style = el('style'); style.textContent = CSS; document.head.appendChild(style);
    layers(ui, o.scene, o.acts);
    sounds();

    // top: colour swatches (make it yours) and See inside / sound
    var top = el('div', 'hh-top'), sw = el('div', 'hh-sw'), tb = el('div', 'hh-tb');
    Object.keys(PALS).forEach(function (k) { var b = el('button'); b.style.background = PALS[k].l; b.setAttribute('aria-label', 'Colour ' + k);
      b.setAttribute('aria-pressed', st.pal === k); b.onclick = function () { st.pal = k; [].forEach.call(sw.children, function (c) { c.setAttribute('aria-pressed', c === b); }); HH.play('tap'); ui.render(); };
      sw.appendChild(b); });
    var inside = el('button', 'hh-round', icon('eye') + '<span>Inside</span>'); inside.setAttribute('aria-pressed', 'false');
    inside.onclick = function () { if (HH.zoom) HH.zoom(null, 1, 500); var x = document.getElementById('xrb'); if (x) x.click(); var on = !!st.xrT; inside.setAttribute('aria-pressed', on);
      document.documentElement.classList.toggle('nolabels', !on); HH.play('tap'); };
    var snd = el('button', 'hh-round', ''); snd.setAttribute('aria-label', 'Sound');
    function sndIcon(){ var m = !!(window.Kit && Kit.sfx && Kit.sfx.muted); snd.innerHTML = icon(m ? 'mute' : 'sound'); }
    snd.onclick = function () { if (window.Kit && Kit.sfx) Kit.sfx.toggle(); sndIcon(); };
    sndIcon();
    tb.appendChild(inside); tb.appendChild(snd); top.appendChild(sw); top.appendChild(tb); document.body.appendChild(top);
    // opened from the house (?from=house): a Home button goes back to it
    if (window.HHFlow && HHFlow.fromHouse){ var home = el('button', 'hh-round', HH.HOME_ICON); home.setAttribute('aria-label', 'Home');
      home.onclick = function () { HH.play('tap'); HHFlow.home(); }; top.insertBefore(home, sw); }

    // bottom: the steps, in order; the one to do next glows
    var bar = el('div', 'hh-bar'), btn = {};
    o.steps.forEach(function (s) {
      var b = el('button', 'hh-step', '<i>' + icon(s.icon) + '</i><span>' + s.label + '</span>');
      b.setAttribute('aria-label', s.label);
      b.onclick = function (e) {
        HH.play('tap');
        if (s.choices){ e.stopPropagation(); if (s.off && s.off(st)){ s.run && s.run(st); ui.render(); return; } openPick(s, b); return; }
        s.run(st); ui.render(); refresh(); };
      bar.appendChild(b); btn[s.id] = b; });
    document.body.appendChild(bar);

    // a step with choices opens a row of big picture buttons above the bar
    var pick = el('div', 'hh-pick'); pick.setAttribute('role', 'dialog'); document.body.appendChild(pick);
    function closePick(){ pick.classList.remove('in'); }
    function openPick(s){
      if (pick.classList.contains('in') && pick._for === s.id) return closePick();
      pick._for = s.id; pick.innerHTML = '';
      s.choices(st).forEach(function (c) {
        var cb = el('button', '', '<i style="background:' + c.color + '">' + icon(c.icon) + '</i><span>' + c.label + '</span>');
        cb.setAttribute('aria-pressed', !!c.current);
        cb.onclick = function (e) { e.stopPropagation(); HH.play('tap'); c.run(st); ui.render(); refresh(); setTimeout(closePick, 180);
          [].forEach.call(pick.children, function (x) { x.setAttribute('aria-pressed', x === cb); }); };
        pick.appendChild(cb); });
      requestAnimationFrame(function () { pick.classList.add('in'); });
    }
    document.addEventListener('pointerdown', function (e) { if (!pick.contains(e.target)) closePick(); });
    function refresh(){
      var nx = o.next(st);
      o.steps.forEach(function (s) { var b = btn[s.id];
        b.classList.toggle('next', s.id === nx);
        b.classList.toggle('done', !!(s.done && s.done(st)) && s.id !== nx);
        b.classList.toggle('off', !!(s.off && s.off(st)));
        if (s.dot){ var d = b.querySelector('.hh-dot'); if (!d){ d = el('span', 'hh-dot'); b.appendChild(d); } d.style.background = s.dot(st); }
        if (s.face){ var f = s.face(st), ic = b.querySelector('i'); if (ic._k !== f.icon + f.color){ ic._k = f.icon + f.color; ic.innerHTML = icon(f.icon); ic.style.background = f.color; } } });
    }
    HH.nudge = function () { var nx = o.next(st), b = nx && btn[nx]; if (!b) return; b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge'); };
    var lastKey = '';
    HH.after = function () { var k = o.key(st); if (k !== lastKey){ lastKey = k; refresh(); } };
    refresh();

    // events from the figure
    HH.on = function (ev, a) {
      if (o.sound) o.sound(ev, a, st);
      if (ev === 'nope'){ HH.play('nope'); HH.nudge(); }
      if (o.finished && o.finished(st) && !HH._sheet){ HH._sheet = true; HH.play('done'); setTimeout(finish, 1600); }
      refresh();
    };
    function finish(){
      try { Kit.say && Kit.say.praise && Kit.say.praise(o.praise || 'mashaallah'); } catch (e) {}
      try { window.KahfBridge && KahfBridge.complete(); } catch (e) {}
      // a station (o.station) records today's work in the day log; from the house, the sheet's Home goes back to it
      var flow = window.HHFlow && o.station, fromHouse = flow && HHFlow.fromHouse;
      if (flow && !fromHouse) HHFlow.mark(o.station);
      var again = { label: o.againLabel || 'Again', primary: !fromHouse, onClick: function () { if (fromHouse) HHFlow.mark(o.station); HH._sheet = false; o.reset(st); refresh(); } };
      if (Kit.ui && Kit.ui.sheet) Kit.ui.sheet({ title: o.doneTitle || 'All done!', stars: 3,
        buttons: fromHouse ? [{ label: o.homeLabel || 'Home', icon: HH.HOME_ICON, primary: true, onClick: function () { HHFlow.done(o.station); } }, again] : [again] });
    }
    ui.render();
    precache(o.extra || []);
    return { refresh: refresh };
  };

  /* ---------- offline: hand the service worker every file this page used (plus any extras, e.g. audio not yet
     played), so the whole job works with no network after the first visit, even if the worker took control late ---------- */
  HH.precache = precache;
  function precache(extra){
    if (!('serviceWorker' in navigator)) return;
    var send = function () {
      var c = navigator.serviceWorker.controller; if (!c) return;
      var urls = [location.pathname].concat(performance.getEntriesByType('resource').map(function (e) { return e.name; }), extra)
        .map(function (u) { try { var x = new URL(u, location.href); return x.origin === location.origin && x.pathname.indexOf('/KidsGames/') === 0 ? x.pathname : null; } catch (e) { return null; } })
        .filter(function (u, i, a) { return u && a.indexOf(u) === i; });
      c.postMessage({ type: 'CACHE_URLS', urls: urls });
    };
    if (document.readyState === 'complete') setTimeout(send, 400); else addEventListener('load', function () { setTimeout(send, 400); });
    navigator.serviceWorker.addEventListener('controllerchange', send);
  }
})();


/* ---------- the child's hand (added for the house; any page may use it) ----------
   The child picks a skin tone and a sleeve colour once. Saved as plain hex strings:
   localStorage 'hh.hand' (skin, default #c98e62) and 'hh.sleeve' (sleeve).
   HH.hand() -> {skin, sleeve}   HH.hasHand()   HH.setHand(skin, sleeve)
   HH.handSvg(skin, sleeve, pose)  pose: 'open' | 'point' | 'grab'  (a flat inked hand reaching up from its sleeve)
   HH.pickHand(onDone)  a picture-only chooser: big swatches, a preview, a check button; no reading needed */
(function () {
  'use strict';
  var HH = window.HH = window.HH || {};
  var SKINS = ['#f3d4bc', '#e2b08a', '#c98e62', '#9a6440', '#62402a'];
  var SLEEVES = ['#e8574a', '#4f7fd0', '#5cb87a', '#f2c230', '#9b7fd1'];
  var INKC = '#231e16';
  function get(k){ try { return localStorage.getItem(k); } catch (e) { return null; } }
  function clean(v, def){ if (!v) return def; v = String(v).replace(/^"|"$/g, ''); return /^#[0-9a-f]{6}$/i.test(v) ? v : def; }
  function shade(hex, k){ var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return '#' + [r, g, b].map(function (c) { return Math.round(c*(1 - k)).toString(16).padStart(2, '0'); }).join(''); }
  HH.SKINS = SKINS; HH.SLEEVES = SLEEVES;
  HH.hasHand = function () { return !!get('hh.hand'); };
  HH.hand = function () { return { skin: clean(get('hh.hand'), '#c98e62'), sleeve: clean(get('hh.sleeve'), '#4f7fd0') }; };
  HH.setHand = function (skin, sleeve) { try { localStorage.setItem('hh.hand', skin); localStorage.setItem('hh.sleeve', sleeve); } catch (e) {} };
  HH.handSvg = function (skin, sleeve, pose) {
    var sk = skin || '#c98e62', sd = shade(sk, .16), sl = sleeve || '#4f7fd0', st = 'stroke="' + INKC + '" stroke-width="2.2" stroke-linejoin="round"';
    var F = pose === 'grab' ? [[15, 22, 7], [22.5, 19, 7.5], [30.5, 20, 7.5], [38.5, 24, 6.5]]
          : pose === 'point' ? [[15, 4, 7.5], [22.5, 24, 7.5], [30.5, 25, 7.5], [38.5, 28, 6.5]]
          : [[15, 8, 7.5], [22.5, 4, 7.5], [30.5, 7, 7.5], [38.5, 14, 6.5]];
    var s = '<svg viewBox="0 0 60 72" xmlns="http://www.w3.org/2000/svg">';
    F.forEach(function (q) { s += '<rect x="' + q[0] + '" y="' + q[1] + '" width="' + q[2] + '" height="' + (40 - q[1]) + '" rx="' + (q[2]/2) + '" fill="' + sk + '" ' + st + '/>'; });
    if (pose === 'grab' || pose === 'point') F.slice(pose === 'point' ? 1 : 0).forEach(function (q) { s += '<path d="M' + (q[0] + 1.5) + ' ' + (q[1] + 6) + 'h' + (q[2] - 3) + '" stroke="' + sd + '" stroke-width="1.6" stroke-linecap="round"/>'; });
    s += '<path d="M15.6 29h28.8v21q0 7.4-7.4 7.4H23q-7.4 0-7.4-7.4z" fill="' + sk + '"/>';
    s += '<path d="M39.5 32v18q0 6-5 7.5" fill="none" stroke="' + sd + '" stroke-width="3" stroke-linecap="round" opacity=".7"/>';
    s += '<path d="M15 31v19q0 8 8 8h14q8 0 8-8V31" fill="none" ' + st + '/>';
    s += pose === 'grab' ? '<path d="M16 47c-6-1-9-6-8-11 1-3 4-3 6-1l5 6z" fill="' + sk + '" ' + st + '/>'
                         : '<path d="M16 48c-6-2-10-8-10-13 0-3 4-4 6-1l6 7z" fill="' + sk + '" ' + st + '/>';
    s += '<rect x="12" y="56" width="36" height="17" rx="3" fill="' + sl + '" ' + st + '/><path d="M13 61.5h34" stroke="' + shade(sl, .25) + '" stroke-width="3"/>';
    return s + '</svg>';
  };
  var css = null;
  HH.pickHand = function (done) {
    if (!css){ css = document.createElement('style'); css.textContent =
      '.hh-hp{position:fixed;inset:0;z-index:20;display:grid;place-items:center;background:rgba(35,30,22,.35);opacity:0;transition:opacity .2s;-webkit-tap-highlight-color:transparent}' +
      '.hh-hp.in{opacity:1}' +
      '.hh-hp>div{background:#f2efe7;border:2.5px solid #231e16;border-radius:28px;box-shadow:0 6px 0 #231e16;padding:18px 16px 16px;display:flex;flex-direction:column;align-items:center;gap:14px;width:min(380px,calc(100vw - 24px));box-sizing:border-box}' +
      '.hh-hp .pv{width:120px;height:144px}.hh-hp .pv svg{width:100%;height:100%}' +
      '.hh-hp .rw{display:flex;gap:10px;justify-content:center;flex-wrap:nowrap}' +
      '.hh-hp .rw button{all:unset;box-sizing:border-box;width:clamp(44px,12vw,54px);height:clamp(44px,12vw,54px);border-radius:50%;border:2.5px solid #231e16;box-shadow:0 3px 0 #231e16;cursor:pointer}' +
      '.hh-hp .rw.sl button{border-radius:14px}' +
      '.hh-hp .rw button[aria-pressed=true]{outline:3.5px solid #231e16;outline-offset:3px}' +
      '.hh-hp .ok{all:unset;box-sizing:border-box;width:72px;height:72px;border-radius:50%;border:2.5px solid #231e16;background:#f4b829;box-shadow:0 4px 0 #231e16;display:grid;place-items:center;cursor:pointer}' +
      '.hh-hp .ok svg{width:38px;height:38px}.hh-hp .ok:active,.hh-hp .rw button:active{transform:translateY(2px)}';
      document.head.appendChild(css); }
    var cur = HH.hand(), veil = document.createElement('div'); veil.className = 'hh-hp';
    veil.innerHTML = '<div role="dialog" aria-label="My hand"><div class="pv"></div><div class="rw sk"></div><div class="rw sl"></div>' +
      '<button class="ok" aria-label="Done"><svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button></div>';
    var pv = veil.querySelector('.pv'), rs = veil.querySelector('.sk'), rl = veil.querySelector('.sl');
    function paint(){ pv.innerHTML = HH.handSvg(cur.skin, cur.sleeve, 'open');
      [].forEach.call(rs.children, function (b) { b.setAttribute('aria-pressed', b.dataset.c === cur.skin); });
      [].forEach.call(rl.children, function (b) { b.setAttribute('aria-pressed', b.dataset.c === cur.sleeve); }); }
    function row(box, list, key){ list.forEach(function (c) { var b = document.createElement('button'); b.style.background = c; b.dataset.c = c; b.setAttribute('aria-label', key);
      b.onclick = function () { cur[key] = c; HH.play && HH.play('tap'); paint(); }; box.appendChild(b); }); }
    row(rs, SKINS, 'skin'); row(rl, SLEEVES, 'sleeve'); paint();
    veil.querySelector('.ok').onclick = function () { HH.setHand(cur.skin, cur.sleeve); HH.play && HH.play('tap'); veil.classList.remove('in'); setTimeout(function () { veil.remove(); }, 220); if (done) done(cur); };
    document.body.appendChild(veil); requestAnimationFrame(function () { veil.classList.add('in'); });
  };
})();
