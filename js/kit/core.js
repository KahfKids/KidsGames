/* Kahf KidsGames kit: core.js
   Shared basics for every game: full-screen high-DPI canvas, a fixed-step game loop that pauses when the
   app is hidden, pointer input in game units, saved progress, and the Kahf activity bridge.
   No dependencies, no network. Exposes window.Kit. */
(function () {
  'use strict';
  var Kit = window.Kit = window.Kit || {};

  // ---------- environment ----------
  var inApp = !!window.ReactNativeWebView;
  try { inApp = inApp || window.self !== window.top; } catch (e) { inApp = true; }
  Kit.inApp = inApp;
  Kit.isTouch = (navigator.maxTouchPoints > 0) || matchMedia('(pointer: coarse)').matches;
  Kit.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.toggle('kit-touch', Kit.isTouch);

  // Block zoom gestures, long-press menus and double-tap zoom: the whole screen is the game.
  ['gesturestart', 'gesturechange', 'contextmenu', 'dblclick'].forEach(function (t) {
    document.addEventListener(t, function (e) { e.preventDefault(); }, { passive: false });
  });

  Kit.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  Kit.lerp = function (a, b, t) { return a + (b - a) * t; };
  Kit.rand = function (a, b) { return a + Math.random() * (b - a); };

  // Safe-area insets in CSS px (read from a probe element styled by kit.css).
  var probe = null;
  Kit.safe = function () {
    if (!probe) {
      probe = document.createElement('div');
      probe.className = 'kit-safe-probe';
      document.body.appendChild(probe);
    }
    var cs = getComputedStyle(probe);
    return { top: parseFloat(cs.paddingTop) || 0, right: parseFloat(cs.paddingRight) || 0,
             bottom: parseFloat(cs.paddingBottom) || 0, left: parseFloat(cs.paddingLeft) || 0 };
  };

  // ---------- full-screen canvas ----------
  // Kit.stage(canvas, onResize): keeps the canvas the size of the screen at up to 2x pixel density.
  // onResize({w, h, dpr, safe}) runs on start and on every size change; w/h are CSS px.
  Kit.stage = function (canvas, onResize) {
    var ctx = canvas.getContext('2d');
    var st = { canvas: canvas, ctx: ctx, w: 0, h: 0, dpr: 1, safe: Kit.safe() };
    function fit() {
      var w = Math.max(1, Math.round(window.innerWidth));
      var h = Math.max(1, Math.round(window.innerHeight));
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      if (w === st.w && h === st.h && dpr === st.dpr) return;
      st.w = w; st.h = h; st.dpr = dpr; st.safe = Kit.safe();
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      if (onResize) onResize(st);
    }
    var t = null;
    addEventListener('resize', function () { clearTimeout(t); t = setTimeout(fit, 60); fit(); });
    if (window.visualViewport) visualViewport.addEventListener('resize', fit);
    fit();
    st.fit = fit;
    return st;
  };

  // ---------- game loop ----------
  // Kit.loop({ step(dt), draw(alpha, frameDt), hz }) — fixed-step simulation (default 120 Hz) so speed is
  // the same on 60 Hz phones and 120 Hz iPads. Pauses while the page is hidden or Kit.loop.paused is set.
  Kit.loop = function (o) {
    var STEP = 1 / (o.hz || 120), acc = 0, last = 0, running = true;
    var api = { paused: false, time: 0 };
    function frame(now) {
      if (!running) return;
      requestAnimationFrame(frame);
      var dt = last ? (now - last) / 1000 : 0;
      last = now;
      if (dt > 0.1) dt = 0.1; // after a hitch, don't fast-forward the game
      if (!api.paused && !document.hidden) {
        acc += dt;
        var n = 0;
        while (acc >= STEP && n < 24) { o.step(STEP); api.time += STEP; acc -= STEP; n++; }
        if (n === 24) acc = 0;
      }
      o.draw(acc / STEP, api.paused ? 0 : dt);
    }
    document.addEventListener('visibilitychange', function () { last = 0; if (o.onHidden && document.hidden) o.onHidden(); });
    requestAnimationFrame(frame);
    api.stop = function () { running = false; };
    return api;
  };

  // ---------- pointer input ----------
  // Kit.pointer(el, toGame, handlers) — pointer events with capture; toGame(x, y) maps CSS px to game units.
  // handlers: down(p), move(p), up(p), where p = { x, y, sx, sy, id, dx, dy, startX, startY }.
  Kit.pointer = function (el, toGame, h) {
    var active = null;
    function pt(e) {
      var r = el.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top, g = toGame(sx, sy);
      return { x: g.x, y: g.y, sx: sx, sy: sy, id: e.pointerId };
    }
    el.addEventListener('pointerdown', function (e) {
      if (active !== null && active.id !== e.pointerId) return; // one finger drives the game
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      var p = pt(e); p.startX = p.x; p.startY = p.y; p.dx = 0; p.dy = 0;
      active = p;
      if (h.down) h.down(p, e);
    }, { passive: false });
    el.addEventListener('pointermove', function (e) {
      var p = pt(e);
      if (active && active.id === e.pointerId) {
        p.startX = active.startX; p.startY = active.startY; p.dx = p.x - active.x; p.dy = p.y - active.y;
        active.x = p.x; active.y = p.y;
        if (h.move) h.move(p, e);
      } else if (e.pointerType === 'mouse' && h.hover) h.hover(p, e);
    });
    function end(e) {
      if (!active || active.id !== e.pointerId) return;
      var p = pt(e); p.startX = active.startX; p.startY = active.startY;
      active = null;
      if (h.up) h.up(p, e);
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
    el.style.touchAction = 'none';
  };

  // Keyboard state (arrows/space) for desktop play.
  Kit.keys = {};
  addEventListener('keydown', function (e) {
    Kit.keys[e.key] = true;
    if (e.key === ' ' || e.key.indexOf('Arrow') === 0) e.preventDefault();
  });
  addEventListener('keyup', function (e) { Kit.keys[e.key] = false; });
  addEventListener('blur', function () { Kit.keys = {}; });

  // ---------- saved data ----------
  // Kit.store('kahf-mosaic') -> { get(key, fallback), set(key, value) } in one namespaced localStorage entry.
  Kit.store = function (ns) {
    var data = {};
    try { data = JSON.parse(localStorage.getItem(ns)) || {}; } catch (e) { data = {}; }
    return {
      get: function (k, d) { return k in data ? data[k] : d; },
      set: function (k, v) { data[k] = v; try { localStorage.setItem(ns, JSON.stringify(data)); } catch (e) {} },
      all: function () { return data; }
    };
  };

  // Kit.progress(store, count): levels 1..count with best stars; level n+1 unlocks when n is finished.
  Kit.progress = function (store, count) {
    var stars = store.get('stars', {});
    var p = {
      count: count,
      stars: function (n) { return stars[n] || 0; },
      unlocked: function (n) { return n === 1 || (stars[n - 1] || 0) > 0; },
      current: function () { return Kit.clamp(store.get('current', 1), 1, count); },
      setCurrent: function (n) { store.set('current', Kit.clamp(n, 1, count)); },
      finish: function (n, s) {
        if (s > (stars[n] || 0)) { stars[n] = s; store.set('stars', stars); }
        p.setCurrent(n < count ? n + 1 : n);
      },
      total: function () { var t = 0; for (var k in stars) t += stars[k]; return t; }
    };
    return p;
  };

  // ---------- Kahf activity bridge ----------
  Kit.bridge = {
    complete: function () { try { window.KahfBridge && window.KahfBridge.complete(); } catch (e) {} },
    answer: function () { try { window.KahfBridge && window.KahfBridge.answer(); } catch (e) {} }
  };

  // Light haptic tick where supported (Android WebView); iOS ignores it.
  Kit.buzz = function (ms) {
    try {
      var ua = navigator.userActivation;
      if (navigator.vibrate && (!ua || ua.hasBeenActive)) navigator.vibrate(ms || 8);
    } catch (e) {}
  };
})();
