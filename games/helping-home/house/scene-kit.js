/* Helping Home: shared pieces for the small place scenes (house/scene-*.js): the shop, the park, the mosque, the
   neighbour and cooking with Ummi. Every scene draws on FAMILY.stage (house/family.js: a paper panel with its own
   camera, the hand-drawn filter, a close button, hearts and dots), with the house's drawing helpers (H3) and faceless
   family figures only. Nothing can fail: a wrong drop floats back, nothing is timed.
   window.HSK: open(el, o) · drag(st, cfg) · ring(st, p3, r) · rings(st) · list(st, items) · tick(st, i) · item(kind, p) ·
   icon(kind) · room(o) · person(...) · anim(ms, fn, done) · end(st, who, at, resolve, job) · person registry (neighbour) */
(function () {
  'use strict';
  const SK = window.HSK = window.HSK || {};
  const mo = matOf;

  SK.open = (el, o) => FAMILY.stage(el, o);
  SK.anim = (ms, fn, done) => { const t0 = performance.now(); (function step(){ const u = Math.min(1, (performance.now() - t0)/ms); fn(u < .5 ? 2*u*u : 1 - Math.pow(-2*u + 2, 2)/2, u); if (u < 1) requestAnimationFrame(step); else if (done) done(); })(); };
  // dragging things on a stage: picks the nearest item to the finger (big, forgiving targets), carries it a little above
  // the finger on a plane, and asks the scene whether the drop is good; a bad drop floats home
  SK.drag = function (st, cfg){
    let cur = null;
    const near = (e, p3, r) => { const b = st.svg.getBoundingClientRect(), [x, y] = st.toPx(p3); return Math.hypot(e.clientX - b.left - x, e.clientY - b.top - y) < (r || 70); };
    st.svg.addEventListener('pointerdown', e => {
      if (cfg.busy && cfg.busy()) return;
      const b = st.svg.getBoundingClientRect(); let best = null, bd = 1e9;
      for (const it of cfg.list()){ const [x, y] = st.toPx(it.p), d = Math.hypot(e.clientX - b.left - x, e.clientY - b.top - y); if (d < (it.hit || 36) && d < bd){ bd = d; best = it; } }
      if (!best){ cfg.onTap && cfg.onTap(e); return; }
      e.preventDefault(); cur = { it: best, id: e.pointerId, home: best.p.slice() }; try { st.svg.setPointerCapture(e.pointerId); } catch (er) {}
      st.sfx('h_lift'); cfg.onPick && cfg.onPick(best); move(e);
    });
    function move(e){ if (!cur || e.pointerId !== cur.id) return; const p = st.floor(e.clientX, e.clientY - 40, cfg.plane || 0);
      cur.it.p = [p[0], p[1], (cfg.plane || 0) + (cfg.lift == null ? 14 : cfg.lift)]; cfg.redraw(); cfg.onMove && cfg.onMove(cur.it, e, near); }
    st.svg.addEventListener('pointermove', move);
    const up = e => { if (!cur || e.pointerId !== cur.id) return; const c = cur; cur = null;
      if (!cfg.onDrop(c.it, e, near)){ const from = c.it.p.slice(); st.sfx('h_back'); SK.anim(320, k => { c.it.p = from.map((v, i) => v + (c.home[i] - v)*k); cfg.redraw(); }); } };
    st.svg.addEventListener('pointerup', up); st.svg.addEventListener('pointercancel', up);
    return { near, holding: () => !!cur };
  };
  SK.ring = (st, p3, r = 34) => { const [x, y] = st.toPx(p3), el = document.createElement('div'); el.className = 'fam-ring';
    Object.assign(el.style, { left: (x - r) + 'px', top: (y - r) + 'px', width: 2*r + 'px', height: 2*r + 'px' }); st.ov.appendChild(el); return el; };
  SK.rings = st => st.ov.querySelectorAll('.fam-ring').forEach(r => r.remove());
  // a picture list (top left, under the progress dots): no reading needed
  SK.list = (st, kinds) => { let el = st.el.querySelector('.hsk-list'); if (!el){ el = document.createElement('div'); el.className = 'hsk-list'; st.el.appendChild(el);
      const css = document.createElement('style'); css.textContent = '.hsk-list{position:absolute;left:14px;top:calc(env(safe-area-inset-top) + 76px);display:flex;flex-direction:column;gap:6px;padding:8px;background:#fffdf6;border:2.5px solid #231e16;border-radius:16px;box-shadow:0 3px 0 #231e16;transform:rotate(-2deg);pointer-events:none;z-index:2}' +
        '.hsk-list i{position:relative;display:block;width:40px;height:40px}.hsk-list i svg{width:100%;height:100%}.hsk-list i.ok::after{content:"";position:absolute;right:-6px;bottom:-4px;width:20px;height:20px;border-radius:50%;background:#5cae6a url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27M6 12.5l4 4L18 8%27 fill=%27none%27 stroke=%27white%27 stroke-width=%273.2%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E") center/80% no-repeat;border:2px solid #231e16}';
      st.el.appendChild(css); }
    el.innerHTML = kinds.map(k => `<i data-k="${k}">${SK.icon(k)}</i>`).join(''); return el; };
  SK.tick = (st, k) => { const i = st.el.querySelector(`.hsk-list i[data-k="${k}"]:not(.ok)`); if (i) i.classList.add('ok'); };

  /* ---------- the things: a picture for the list, and a 3D drawing for the scene ---------- */
  const SV = b => `<svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${b}</svg>`;
  const ICONS = {
    apple: SV('<path d="M12 7c-4-2-8 1-7 6s4 8 7 7c3 1 6-2 7-7s-3-8-7-6z" fill="#e8574a"/><path d="M12 7c0-2 1-3.5 3-4"/>'),
    bread: SV('<path d="M4 15c-1-5 3-8 8-8s9 3 8 8v3H4z" fill="#e2b14a"/><path d="M8 10l1 3M12 9.5v3M16 10l-1 3"/>'),
    milk: SV('<path d="M8 8l2-4h4l2 4v12H8z" fill="#fbf6ea"/><path d="M8 13h8v4H8z" fill="#5b8fd6"/>'),
    eggs: SV('<path d="M3 13h18l-2 6H5z" fill="#d9cdb6"/><ellipse cx="8" cy="11" rx="3" ry="3.6" fill="#fff6e0"/><ellipse cx="16" cy="11" rx="3" ry="3.6" fill="#fff6e0"/>'),
    carrot: SV('<path d="M5 19 16 8l2 2L7 21z" fill="#ef8a3c"/><path d="M16 8c0-2 1-4 3-5M17 9c2 0 4-1 5-3"/>'),
    rice: SV('<path d="M6 8c0-2 12-2 12 0l1 12H5z" fill="#efe6cf"/><path d="M6 8c2 1 10 1 12 0M9 13h6"/>'),
    dates: SV('<rect x="4" y="11" width="16" height="8" rx="2" fill="#c9894e"/><ellipse cx="8.5" cy="10" rx="2.6" ry="1.8" fill="#7a3f22"/><ellipse cx="14" cy="10" rx="2.6" ry="1.8" fill="#7a3f22"/>'),
    banana: SV('<path d="M5 8c2 8 9 11 15 8l-1-2c-5 2-9-1-11-7z" fill="#f2c230"/>'),
    plate: SV('<circle cx="12" cy="12" r="8" fill="#fbf6ea"/><circle cx="12" cy="12" r="4.5"/>'),
    bag: SV('<path d="M5 9h14l-1.2 11H6.2z" fill="#cfe8de"/><path d="M9 9V7.5a3 3 0 0 1 6 0V9"/>'),
  };
  SK.icon = k => ICONS[k] || ICONS.bag;
  const COLD = { milk: 1, eggs: 1, carrot: 1, apple: 1 };
  SK.cold = k => !!COLD[k];
  // things are drawn a little bigger than life (o.s) so a small hand can find them: a uniform scale about the anchor
  SK.item = function (kind, p, o){
    o = o || {};
    if (o.s && o.s !== 1){ const q = P(...p), k = o.s, inner = SK.item(kind, p, Object.assign({}, o, { s: 1 }));
      return `<g transform="matrix(${k} 0 0 ${k} ${(q[0]*(1 - k)).toFixed(2)} ${(q[1]*(1 - k)).toFixed(2)})">${inner}</g>`; }
    const [x, y, z] = p;
    switch (kind){
      case 'apple': return H3.ball([x, y, z + 5], 5, '#e8574a') + H3.line3([[x, y, z + 9.5], [x + 1, y, z + 12]], '#6b4a32', 1.2);
      case 'banana': return H3.rope([[x - 6, y - 2, z + 2], [x - 2, y + 1, z + 4], [x + 3, y + 1, z + 4], [x + 7, y - 2, z + 3]], '#f2c230', 3.4);
      case 'bread': return H3.bx(x - 9, y - 5, z, x + 9, y + 5, z + 6, mo('#e2b14a'), .9) + H3.lathe(x, y, [[z + 6, 5], [z + 9, 3]], mo('#d49c3a'), { top: true, n: 10 });
      case 'milk': return H3.bx(x - 4, y - 4, z, x + 4, y + 4, z + 14, mo('#fbf6ea'), .9) + (vis([1,0,0]) ? fill(pd(on(PX(x + 4.1), rectUV(y - 4, z + 4, y + 4, z + 9))), '#5b8fd6') : '') +
        quad3([[x - 4, y - 4, z + 14], [x + 4, y - 4, z + 14], [x, y - 4, z + 18]], '#fbf6ea') + quad3([[x - 4, y + 4, z + 14], [x + 4, y + 4, z + 14], [x, y + 4, z + 18]], '#e8e2d2') + H3.line3([[x, y - 4, z + 18], [x, y + 4, z + 18]], INK, 1);
      case 'eggs': return H3.bx(x - 8, y - 5, z, x + 8, y + 5, z + 4, mo('#d9cdb6'), .9) + H3.ball([x - 3.5, y - 1.5, z + 6], 2.6, '#fff6e0') + H3.ball([x + 3.5, y + 1.5, z + 6], 2.6, '#fff6e0') + H3.ball([x + 3.5, y - 1.5, z + 6], 2.6, '#fff1d6');
      case 'carrot': return rod([x - 7, y, z + 3], [x + 6, y, z + 3], 2.6, mo('#ef8a3c'), toneI, .8, .6) + H3.rope([[x - 7, y, z + 3], [x - 11, y - 2, z + 6]], '#5cae6a', 1.4) + H3.rope([[x - 7, y, z + 3], [x - 11, y + 2, z + 7]], '#5cae6a', 1.4);
      case 'rice': return H3.lathe(x, y, [[z, 6], [z + 12, 6.5], [z + 15, 4]], mo('#efe6cf'), { top: true, n: 12 }) + H3.line3([[x - 4, y, z + 14], [x + 4, y, z + 14]], '#c9894e', 1.6);
      case 'dates': return H3.bx(x - 8, y - 6, z, x + 8, y + 6, z + 5, mo('#c9894e'), .9) + H3.ball([x - 3, y, z + 6], 2.4, '#7a3f22') + H3.ball([x + 3, y - 1, z + 6], 2.4, '#7a3f22') + H3.ball([x, y + 3, z + 6], 2.4, '#6b3520');
      case 'plate': return H3.disc(z + .4, x, y, 9, CERAMIC.d, 0) + H3.disc(z + 1.6, x, y, 9, '#fbfaf3', .9) + ink(pd(on(PZ(z + 1.7), ellUV(x, y, 6, 6, 16))), .8).replace(INK, '#5b8fd6');
      case 'covered': return H3.disc(z + 1.2, x, y, 10, '#fbfaf3', .9) + H3.lathe(x, y, [[z + 1.5, 8.5], [z + 7, 6], [z + 9, 2]], mo('#c9d0d6'), { top: true, n: 14 }) + H3.ball([x, y, z + 10], 1.6, '#3d3935');
      case 'sbag': return H3.bx(x - 7, y - 5, z, x + 7, y + 5, z + 14, mo(o.col || '#cfe8de'), 1) + H3.rope([[x - 4, y, z + 14], [x, y, z + 19], [x + 4, y, z + 14]], '#3d3935', .9) +
        H3.ball([x - 2, y - 1, z + 15], 2.4, o.top || '#e8574a') + H3.ball([x + 3, y + 1, z + 14], 2, '#5cae6a');
    }
    return '';
  };
  const quad3 = (pts, c) => shape(pts, c, .8);
  // a simple room corner: floor, two walls (x = 0 back, y = 0 right), optional colours
  SK.room = function (o){
    const W = o.W || 160, Dp = o.D || 200, H = o.H || 110, wall = mo(o.wall || '#f3e6cf'), fl = mo(o.floor || '#d8a66c');
    let s = H3.bx(-6, -6, -8, W, Dp, 0, fl, .9) + fill(pd(on(PZ(.1), rectUV(0, 0, W, Dp))), fl.l);
    s += fill(pd([[0, 0, 0], [0, Dp, 0], [0, Dp, H], [0, 0, H]]), toneI([1, 0, 0], wall)) + fill(pd([[0, 0, 0], [W, 0, 0], [W, 0, H], [0, 0, H]]), toneI([0, 1, 0], wall));
    if (o.boards){ let b = ''; for (let y = 17; y < Dp; y += 17) b += pd([[0, y, .2], [W, y, .2]], false); s += `<path d="${b}" fill="none" stroke="${fl.d}" stroke-width=".7"/>`; }
    return s + ink(pd([[0, 0, 0], [0, 0, H]], false) + pd([[0, Dp, 0], [0, 0, 0], [W, 0, 0]], false) + pd([[0, Dp, H], [0, 0, H], [W, 0, H]], false), 1.3);
  };
  // faceless people: the family, plus a neighbour (an older man) added to the family's people for these scenes
  SK.person = (name, pose, at, facing, frame, opts) => { try { return FAMILY.svg(name, pose, at, facing, frame, opts); } catch (e) { return ''; } };
  if (window.FAMILY && FAMILY.PEOPLE && FAMILY.PEOPLE.abu && !FAMILY.PEOPLE.neighbour){
    try { const n = JSON.parse(JSON.stringify(FAMILY.PEOPLE.abu)); n.label = 'Neighbour'; n.col = { top: '#8a6bb0', legs: '#5a5560', shoe: '#3d3935', hair: '#e2ddd3', kufi: '#fbf6ea' }; n.skinK = .06;
      FAMILY.PEOPLE.neighbour = n; } catch (e) {}
  }
  // the end of a scene: the person waves, a heart, praise; then resolve
  SK.end = function (st, who, at, facing, draw, resolve, job){
    let t0 = performance.now(), fr = 0;
    const step = () => { const ms = performance.now() - t0; fr = Math.floor(ms/170) % 4; draw(who ? { name: who, pose: ms < 900 ? 'wave' : 'hug', frame: ms < 900 ? fr : Math.min(5, Math.floor((ms - 900)/150)) } : null);
      if (ms < 1900) requestAnimationFrame(step); };
    step(); setTimeout(() => { st.heart([at[0], at[1], at[2] + 70]); st.sfx('h_done'); st.praise(); }, 900);
    setTimeout(() => { st.destroy(); try { window.KahfBridge && KahfBridge.complete(); } catch (e) {} resolve({ done: true, job }); }, 2300);
  };
  SK.HHScene = window.HHScene = window.HHScene || {};
})();
