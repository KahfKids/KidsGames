/* Helping Home: the living house. Mounts the house figure, keeps its layers, and handles the child's hand.
   Layers, bottom to top (each its own GPU layer, so a change repaints only what changed):
     #fig (static house, hand-drawn filter)   rebuilt only when the camera turns or the house changes
     DYN  (clock hands, pouring water)         small, hand-drawn filter
     FLT  (the thing in the child's hand)      drawn once when picked up, then only moved (CSS transform)
     MUL  (the day's light: multiply)          dawn pink, golden afternoon, dusk, night blue; dim messy rooms
     SCR  (lamps and tidy warmth: screen)      lamps glow at night, tidy rooms are warmer
     OV   (sparkles, prayer glow, the hand, snap ring)   HTML, animated by the compositor
   Nothing runs while nothing moves: no animation frame loop at rest, one light check every 20 s. */
(function () {
  'use strict';
  const q = new URLSearchParams(location.search);
  const A = HD.A, ROOMS = HD.ROOMS, PITCH_H = 27, YAW_H = 45, LIM = 26;
  const FL = window.HHFlow;
  let S = HL.load(), DAY = HL.dayItems(HL.now()), DEC = HL.room(), LIGHT = HL.light(HL.now());
  let held = null, canMode = false, pour = null, sweeping = false;

  /* ---------- sounds: natural only ---------- */
  const play = (n, o) => { try { window.Kit && Kit.sfx && Kit.sfx.play(n, o); } catch (e) {} };
  if (window.Kit && Kit.sfx) Kit.sfx.define({
    h_tap:   (L, t) => L.click(t, { freq: 2400, vol: .14 }),
    h_lift:  (L, t) => L.whoosh(t, { dur: .18, from: 420, to: 1400, vol: .07 }),
    h_back:  (L, t) => L.whoosh(t, { dur: .32, from: 1300, to: 380, vol: .06 }),
    h_cloth: (L, t) => { L.whoosh(t, { dur: .26, from: 300, to: 1100, vol: .1, brown: true }); L.thump(t + .2, { from: 170, to: 90, vol: .1 }); },
    h_wood:  (L, t) => L.knock(t, { size: 1.3, vol: .8 }),
    h_book:  (L, t) => { L.thump(t, { from: 180, to: 90, vol: .25 }); L.click(t + .01, { freq: 1500, vol: .12 }); },
    h_clink: (L, t) => { L.click(t, { freq: 4200, vol: .12 }); L.burst(t, { dur: .22, freq: 3900, q: 16, vol: .07 }); L.burst(t + .05, { dur: .16, freq: 5200, q: 18, vol: .05 }); },
    h_shoe:  (L, t) => { L.thump(t, { from: 140, to: 70, vol: .25 }); L.thump(t + .12, { from: 130, to: 65, vol: .22 }); },
    h_water: (L, t) => { L.burst(t, { dur: 1.3, freq: 1100, q: .7, vol: .08, attack: .15 }); for (let i = 0; i < 7; i++) L.drop(t + .15 + i*.15, { size: .8 + Math.random()*.5, vol: .1 }); },
    h_spark: (L, t) => L.grains(t, { n: 10, spread: .35, freq: 7000, vol: .09 }),
    h_done:  (L, t) => L.grains(t, { n: 18, spread: .6, freq: 6500, vol: .1 }),
    h_zoom:  (L, t) => L.whoosh(t, { dur: .35, from: 500, to: 1600, vol: .05 }),
    h_soft:  (L, t) => L.knock(t, { size: .8, vol: .35 }),
  });
  const SND = { basket: 'h_cloth', wardrobe: 'h_cloth', toybox: 'h_wood', shelfB: 'h_book', rack: 'h_clink', shoerack: 'h_shoe', peg: 'h_cloth' };

  /* ---------- mount the engine, then take its figure into our own full-screen stack ---------- */
  const ui = mountFigure({ fig: 'H', title: 'Helping Home', size: [HD.HW + HD.GW, HD.HDP, HD.ZTOP], palette: 'mint', credit: false, state: { pal: 'mint' }, scene: () => '' });
  CAM_LIM = LIM; setCam(YAW_H, PITCH_H);
  const fig = document.getElementById('fig'), art = document.getElementById('art'), NS = 'http://www.w3.org/2000/svg';
  const css = document.createElement('style');
  css.textContent = `
  html,body{height:100%;overflow:hidden}
  body{padding:0!important;display:block!important;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;overscroll-behavior:none}
  body>header,body>.stage,body>.controls,body>#readout,body>.made-with{display:none!important}
  .hh-stack{position:fixed;inset:0;touch-action:none;overflow:hidden;contain:strict}
  .hh-stack>svg{position:absolute;left:0;top:0;width:100%!important;height:100%!important;max-width:none!important;margin:0!important;display:block;overflow:visible}
  .hh-stack>svg.lay{pointer-events:none}
  .hh-stack>svg.mul{mix-blend-mode:multiply}.hh-stack>svg.scr{mix-blend-mode:screen}
  .hh-flt,.hh-ov{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}
  .hh-flt>div{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}
  .hh-flt>div svg{display:block;width:100%;height:100%;overflow:visible}
  .hh-flt>div.go{transition:transform .32s cubic-bezier(.3,.7,.4,1),opacity .32s}
  .hh-flt>div.back{transition:transform .5s cubic-bezier(.3,1.3,.5,1)}
  .hh-flt>div.hover{animation:hhBob 1.6s ease-in-out infinite alternate}
  @keyframes hhBob{to{margin-top:-6px}}
  .hh-ov>i{position:absolute;left:0;top:0;display:block;will-change:transform}
  .hh-ov .spk b{display:block;width:14px;height:14px;margin:-7px 0 0 -7px;background:radial-gradient(circle,#fff 0 18%,#fff6c8 28%,transparent 62%);
    clip-path:polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%);animation:hhTw 2.8s ease-in-out infinite;opacity:0}
  @keyframes hhTw{0%,100%{opacity:0;transform:scale(.4)}45%{opacity:.95;transform:scale(1)}60%{opacity:.8;transform:scale(.9) rotate(20deg)}}
  .hh-ov .burst b{display:block;width:18px;height:18px;margin:-9px 0 0 -9px;background:radial-gradient(circle,#fff 0 20%,#ffe27a 34%,transparent 64%);
    clip-path:polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%);animation:hhBurst .9s ease-out forwards}
  @keyframes hhBurst{0%{opacity:1;transform:translate(0,0) scale(.3)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1.2) rotate(90deg)}}
  .hh-ov .ring b{display:block;width:var(--r);height:var(--r);margin:calc(var(--r)/-2) 0 0 calc(var(--r)/-2);border-radius:50%;border:3px dashed rgba(255,255,255,.95);
    box-shadow:0 0 0 3px rgba(35,30,22,.55),0 0 18px 6px rgba(255,214,110,.55);animation:hhRing 1.2s ease-in-out infinite alternate}
  .hh-ov .ring.hot b{border-style:solid;border-color:#ffe27a;box-shadow:0 0 0 3px #231e16,0 0 26px 10px rgba(255,214,110,.85);animation:none;transform:scale(1.15)}
  @keyframes hhRing{from{transform:scale(.92)}to{transform:scale(1.08)}}
  .hh-ov .glow b{display:block;width:var(--r);height:var(--r);margin:calc(var(--r)/-2) 0 0 calc(var(--r)/-2);border-radius:50%;
    background:radial-gradient(circle,rgba(255,226,140,.75),rgba(255,206,100,.35) 45%,transparent 70%);animation:hhGlow 2.4s ease-in-out infinite alternate}
  @keyframes hhGlow{from{opacity:.55;transform:scale(.9)}to{opacity:1;transform:scale(1.08)}}
  .hh-ov .hand{transition:opacity .15s;opacity:0}
  .hh-ov .hand.on{opacity:1}
  .hh-ov .hand svg{display:block;width:74px;height:89px;margin:-10px 0 0 -30px}
  .hh-ov .hand.tap svg{animation:hhPress .35s ease-out}
  .hh-ov .hand.grab svg{margin-top:2px}
  @keyframes hhPress{40%{transform:scale(.88) translateY(4px)}}
  .hh-bub{all:unset;position:absolute;left:0;top:0;width:58px;height:58px;margin:-74px 0 0 -29px;border-radius:50%;background:#fff6dc;border:2.5px solid #231e16;
    box-shadow:0 4px 0 #231e16;display:grid;place-items:center;pointer-events:auto;cursor:pointer;animation:hhBub 1.4s ease-in-out infinite alternate}
  .hh-bub svg{width:32px;height:32px}
  .hh-bub::after{content:"";position:absolute;left:50%;bottom:-11px;width:12px;height:12px;margin-left:-6px;background:#fff6dc;border-right:2.5px solid #231e16;border-bottom:2.5px solid #231e16;transform:rotate(45deg)}
  .hh-bub.star{background:#2c3766;border-color:#fff3c4;box-shadow:0 0 18px 4px rgba(255,243,196,.6)}
  .hh-bub.star::after{display:none}
  @keyframes hhBub{to{transform:translateY(-6px)}}
  .hh-hud{position:fixed;left:0;right:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:8px;pointer-events:none;padding:0 12px}
  .hh-hud.top{top:0;padding-top:calc(env(safe-area-inset-top) + 10px)}
  .hh-hud.bot{bottom:0;padding-bottom:calc(env(safe-area-inset-bottom) + 14px);align-items:flex-end}
  .hh-hud>*{pointer-events:auto}
  .hh-hud .grp{display:flex;gap:8px;align-items:center;min-width:52px}
  .hh-leaf{width:22px;height:22px;align-self:flex-end;margin:0 auto 4px 4px;opacity:.85;pointer-events:none}.hh-leaf[hidden]{display:none}.hh-leaf svg{display:block;width:100%;height:100%}
  .hh-btn{all:unset;box-sizing:border-box;height:52px;min-width:52px;padding:0 12px;border-radius:999px;border:2.5px solid #231e16;background:#fbf6ea;
    box-shadow:0 3px 0 #231e16;display:flex;align-items:center;justify-content:center;gap:6px;font:800 18px ui-rounded,"SF Pro Rounded",system-ui,sans-serif;color:#231e16;cursor:pointer}
  .hh-btn svg{width:28px;height:28px}
  .hh-btn:active{transform:translateY(2px);box-shadow:0 1px 0 #231e16}
  .hh-btn[hidden]{display:none}
  .hh-btn.pulse{animation:hhStarB .7s ease-out}
  @keyframes hhStarB{40%{transform:scale(1.22)}}
  .hh-dial{width:150px;height:56px;border-radius:28px;border:2.5px solid #231e16;box-shadow:0 3px 0 #231e16;overflow:hidden;background:#bfe0f2}
  .hh-dial svg{display:block;width:100%;height:100%}
  .hh-tray{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 10px);z-index:6;transform:translate(-50%,calc(100% + 60px));visibility:hidden;transition:transform .28s cubic-bezier(.2,1.2,.4,1);
    background:#fbf6ea;border:2.5px solid #231e16;border-radius:26px;box-shadow:0 5px 0 #231e16;padding:12px 12px 12px;display:flex;flex-direction:column;gap:10px;width:min(560px,calc(100vw - 20px))}
  .hh-tray.in{transform:translate(-50%,0);visibility:visible}
  .hh-tray .x{all:unset;position:absolute;left:50%;margin-left:-22px;top:-26px;width:44px;height:44px;border-radius:50%;background:#fbf6ea;border:2.5px solid #231e16;box-shadow:0 3px 0 #231e16;display:grid;place-items:center;cursor:pointer}.hh-tray .x svg{width:22px;height:22px}
  .hh-tray .tiles{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}
  .hh-tile{all:unset;position:relative;aspect-ratio:1;border-radius:16px;border:2.5px solid #231e16;background:#fff;display:grid;place-items:center;cursor:pointer;touch-action:none;box-shadow:0 3px 0 #231e16}
  .hh-tile svg{width:68%;height:68%}
  .hh-tile.lock{background:#e9e3d6;box-shadow:none}.hh-tile.lock svg{opacity:.35}
  .hh-tile .c{position:absolute;right:-6px;top:-8px;min-width:22px;height:22px;padding:0 4px;box-sizing:border-box;border-radius:11px;background:#f4b829;border:2px solid #231e16;
    font:800 12px/18px ui-rounded,system-ui,sans-serif;text-align:center;color:#231e16}
  .hh-tile.placed{background:#e7f3dc}
  .hh-tile.placed .c{background:#5cae6a;color:#fff}
  .hh-starfly{position:fixed;z-index:9;width:40px;height:40px;margin:-20px 0 0 -20px;pointer-events:none;transition:transform .9s cubic-bezier(.5,-0.3,.6,1),opacity .9s}
  @media (min-width:700px){.hh-dial{width:190px;height:62px}}
  @media (prefers-reduced-motion:reduce){.hh-ov .spk b,.hh-bub,.hh-ov .ring b,.hh-ov .glow b,.hh-flt>div.hover{animation:none}.hh-ov .spk b{opacity:.7}}
  `;
  document.head.appendChild(css);
  const stack = document.createElement('div'); stack.className = 'hh-stack'; document.body.appendChild(stack); stack.appendChild(fig);
  fig.removeAttribute('style');
  function lay(cls, filt){ const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'lay ' + cls); s.setAttribute('aria-hidden', 'true');
    const g = document.createElementNS(NS, 'g'); if (filt) g.setAttribute('filter', 'url(#hand)'); s.appendChild(g); stack.appendChild(s); return { svg: s, g }; }
  const DYN = lay('dyn', true);
  const FLT = document.createElement('div'); FLT.className = 'hh-flt'; stack.appendChild(FLT);
  const MUL = lay('mul', false), SCR = lay('scr', false);
  const OV = document.createElement('div'); OV.className = 'hh-ov'; stack.appendChild(OV);
  const SVGS = [fig, DYN.svg, MUL.svg, SCR.svg];

  /* ---------- framing and zoom (by viewBox, so the drawing is re-painted sharp, never scaled) ---------- */
  let VB0 = [0, 0, 100, 100], VB = VB0, inkSet = false;
  const safe = () => (window.Kit && Kit.safe) ? Kit.safe() : { top: 0, bottom: 0 };
  function frame(){
    const y = YAW, p = PITCH; setCam(YAW_H, PITCH_H);
    OX = 0; OY = 0;
    const B = HD.BOUNDS, pts = [];
    for (const x of [B[0][0], B[1][0]]) for (const yy of [B[0][1], B[1][1]]) for (const z of [B[0][2], B[1][2]]) pts.push(P(x, yy, z));
    pts.push(P(-HD.T, HD.HDP + 52, 0));                                                     // the house's short shadow on the paper
    setCam(y, p);
    const xs = pts.map(t => t[0]), ys = pts.map(t => t[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), bw = Math.max(...xs) - x0, bh = Math.max(...ys) - y0;
    const cw = stack.clientWidth || innerWidth, ch = stack.clientHeight || innerHeight, sf = safe();
    const top = sf.top + (cw < 560 ? 72 : 76), bot = sf.bottom + (cw < 560 ? 30 : 16), side = 10;
    const s = Math.min((cw - 2*side)/bw, (ch - top - bot)/bh);
    VB0 = [x0 - (cw/s - bw)/2, y0 - top/s - ((ch - top - bot)/s - bh)/2, cw/s, ch/s];
    if (!inkSet){ inkSet = true; INK_K = bw/433; }
    document.getElementById('fdefs').innerHTML = filterFor(INK_K);
    setVB(VB0); bakeNoise(fig);
    lastS = '';
  }
  function setVB(b){ VB = b; const s = b.map(v => v.toFixed(2)).join(' '); SVGS.forEach(x => x.setAttribute('viewBox', s)); placeOverlays(); }
  const ppu = () => (stack.clientWidth || innerWidth)/VB[2];
  const toPx = p3 => { const t = P(...p3), k = ppu(); return [(t[0] - VB[0])*k, (t[1] - VB[1])*k]; };
  const toVB = (cx, cy) => { const k = ppu(); return [VB[0] + cx/k, VB[1] + cy/k]; };
  const zoomed = () => VB[2] < VB0[2]*.97;
  let zoomRoom = null, zid = 0, zoomBusy = false;
  function zoomTo(p3, k, ms, done){
    let to = VB0.slice();
    if (p3 && k > 1){ const t = p3.length === 2 ? p3 : P(...p3), w = VB0[2]/k, h = VB0[3]/k;
      to = [Math.max(VB0[0], Math.min(VB0[0] + VB0[2] - w, t[0] - w/2)), Math.max(VB0[1], Math.min(VB0[1] + VB0[3] - h, t[1] - h*.5)), w, h]; }
    if (window.Kit && Kit.reducedMotion) ms = 0;
    const from = VB.slice(), t0 = performance.now(), id = ++zid; zoomBusy = true;
    (function step(){ if (id !== zid) return; const u = ms ? Math.min(1, (performance.now() - t0)/ms) : 1, e = u < .5 ? 2*u*u : 1 - Math.pow(-2*u + 2, 2)/2;
      setVB(from.map((v, i) => v + (to[i] - v)*e)); if (u < 1) requestAnimationFrame(step); else { zoomBusy = false; hud(); if (done) done(); } })();
  }
  // zoom into a room: about 1.8x on a phone (a portrait phone already shows a floor's full width), more where the room
  // fits; centred on the spot the child tapped (or the room's focus), kept inside the room where possible
  const FOCUS = { bedroom: [60, 190, HD.ZF[2] + 40], kitchen: [90, 130, HD.ZF[0] + 40], laundry: [50, 70, HD.ZF[1] + 40], prayer: [60, 230, HD.ZF[1] + 45], garden: [HD.HW + 28, 170, 16] };
  function roomView(id, at){
    const r = ROOMS[id], pts = [];
    const B = r.fl < 0 ? [[HD.HW - 10, -HD.T, 0], [HD.HW + HD.GW, HD.HDP, 56]] : [[0, r.y0, HD.ZF[r.fl]], [HD.HW, r.y1, HD.ZF[r.fl] + HD.FH*.7]];
    for (const x of [B[0][0], B[1][0]]) for (const y of [B[0][1], B[1][1]]) for (const z of [B[0][2], B[1][2]]) pts.push(P(x, y, z));
    const xs = pts.map(t => t[0]), ys = pts.map(t => t[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const sf = safe(), padT = (sf.top + 70)/ppu0(), padB = (sf.bottom + 24)/ppu0();
    const k = Math.max(1.75, Math.min(2.6, VB0[2]/((x1 - x0)*1.06), (VB0[3] - padT - padB)/((y1 - y0)*1.08)));
    const w = VB0[2]/k, h = (VB0[3] - padT - padB)/k, c = at || P(...FOCUS[id]);
    const cl = (v, a, b2, span) => b2 - a <= span ? (a + b2)/2 : Math.max(a + span/2, Math.min(b2 - span/2, v));
    return { k, c: [cl(c[0], x0, x1, w), cl(c[1], y0, y1, h) - (padT - padB)/(2*k)] };   // centred in the space between the bars
  }
  const ppu0 = () => (stack.clientWidth || innerWidth)/VB0[2];
  function goRoom(id, ms = 650, at){ if (!ROOMS[id]) return; zoomRoom = id; const v = roomView(id, at); zoomTo(v.c, v.k, ms); play('h_zoom'); }
  function goOut(ms = 650){ zoomRoom = null; zoomTo(null, 1, ms); }

  /* ---------- what the house looks like right now ---------- */
  const washerDone = () => !!(HL.todayLog().washer || []).length;
  const appeared = it => it.at <= HL.now();
  const isDone = it => !!S.done[it.id];
  function prayerState(){
    const d = HL.now(), c = HL.current(d);
    return { cur: c, now: !!(c && !HL.prayed(c.name, c.day)), tahajjud: HL.tahajjudNow(d) };
  }
  let PS = prayerState();
  function view(){
    const d = HL.now(), ev = DAY.ev;
    const mess = DAY.items.filter(it => appeared(it) && !isDone(it) && it.id !== held);
    const doneOf = tg => DAY.items.filter(it => isDone(it) && it.target === tg).length;
    const v = {
      mess, bed: S.bed || !(ev.wake <= d), sky: LIGHT.sky, night: LIGHT.night, lamps: LIGHT.night,
      counts: { rack: doneOf('rack'), shelfB: doneOf('shelfB'), toybox: doneOf('toybox'), shoerack: doneOf('shoerack'), peg: doneOf('peg') },
      basket: { dirty: ev.laundry <= d && !washerDone(), clean: washerDone(), socks: doneOf('basket') },
      washer: { clean: washerDone() }, thirsty: {}, decor: DEC.placed || {}, prayNow: PS.now, canHeld: canMode || held === 'can',
    };
    if (ev.thirsty <= d) DAY.thirsty.forEach(id => { if (!S.watered[id]) v.thirsty[id] = 1; });
    v.sig = [mess.map(m => m.id).join(','), v.bed, v.sky, v.night, JSON.stringify(v.counts), JSON.stringify(v.basket), Object.keys(v.thirsty).join(','),
      Object.keys(v.decor).filter(k => v.decor[k]).join(','), v.prayNow, v.canHeld].join('|');
    return v;
  }
  function rooms(v){
    v = v || view();
    const d = HL.now(), all = DAY.items.filter(appeared), R = {};
    for (const id of ['bedroom', 'kitchen', 'laundry', 'prayer', 'garden']) R[id] = { total: 0, pending: 0 };
    for (const it of all){ R[it.room].total++; if (!isDone(it)) R[it.room].pending++; }
    if (DAY.ev.wake <= d){ R.bedroom.total++; if (!S.bed) R.bedroom.pending++; }
    if (DAY.ev.laundry <= d){ R.laundry.total++; if (!washerDone()) R.laundry.pending++; }
    if (DAY.ev.thirsty <= d) DAY.thirsty.forEach(id => { R.garden.total++; if (!S.watered[id]) R.garden.pending++; });
    for (const id in R){ const r = R[id]; r.tidy = r.pending ? Math.max(0, 1 - r.pending/Math.max(3, r.total)) : 1; }
    return R;
  }

  /* ---------- drawing ---------- */
  // Turning: the finger turns the house in whole degrees around its front, and each degree's static drawing is kept
  // parsed (a detached <g>), so turning only swaps a group in: no string building, no parsing. The cache is for the
  // house as it is now; once the house has been still for a moment, the missing degrees are built in idle time.
  const FRAG = new Map(); let fragSig = '';
  const camKey = () => YAW.toFixed(2) + '|' + PITCH.toFixed(2);
  function buildFrag(v){ _clipN = 0; const g = document.createElementNS(NS, 'g'); g.innerHTML = inkScale(HD.scene(v)); return g; }
  function staticFrag(v){
    if (v.sig !== fragSig){ FRAG.clear(); fragSig = v.sig; }
    const k = camKey(); let g = FRAG.get(k);
    if (g) FRAG.delete(k); else g = buildFrag(v);
    FRAG.set(k, g);
    while (FRAG.size > 64) FRAG.delete(FRAG.keys().next().value);
    return g;
  }
  let warmT = 0;
  const idle = window.requestIdleCallback || (fn => setTimeout(() => fn({ timeRemaining: () => 8 }), 50));
  function warmSoon(v){
    clearTimeout(warmT);
    warmT = setTimeout(function warm(){
      if (G || zoomBusy || Math.abs(PITCH - PITCH_H) > .01) return;
      const cur = view(); if (cur.sig !== fragSig) return;
      const y0 = YAW, need = [];
      for (let d = 0; d <= 2*LIM; d++) for (const sg of d ? [1, -1] : [1]){ const y = Math.round(y0) + sg*d; if (Math.abs(y - YAW_H) <= LIM && !FRAG.has(y.toFixed(2) + '|' + PITCH_H.toFixed(2))) need.push(y); }
      if (!need.length) return;
      idle(() => { if (G || cur.sig !== fragSig) return; const y = need[0], ky = YAW, kp = PITCH;
        setCam(y, PITCH_H); const k = camKey(); FRAG.set(k, buildFrag(cur)); setCam(ky, kp);
        while (FRAG.size > 64) FRAG.delete(FRAG.keys().next().value);
        warmT = setTimeout(warm, 0); });
    }, 1200);
  }
  function turnTo(y){ y = Math.max(YAW_H - LIM, Math.min(YAW_H + LIM, Math.round(y))); if (y !== YAW || PITCH !== PITCH_H){ setCam(y, PITCH_H); render(); } }
  let lastS = '', lastD = '', lastL = '', lastR = '', lightT = 0, lightTimer = 0;
  function render(){
    const v = view(), cam = YAW.toFixed(2) + '|' + PITCH.toFixed(2), sig = cam + '|' + v.sig;
    if (sig !== lastS){ lastS = sig; art.replaceChildren(staticFrag(v)); placeOverlays(); if (!G || G.mode !== 'orbit') hud(); warmSoon(v); }
    const dd = dynScene(); if (dd !== lastD){ lastD = dd; DYN.g.innerHTML = dd; }
    const R = rooms(v), rk = JSON.stringify(R), lk = LIGHT.key + LIGHT.a.toFixed(2) + rk + cam + (DEC.placed.lamp ? 'L' : '');
    if (rk !== lastR){ lastR = rk; sparkles(R); }
    // while the house is being turned, the light follows at most ~8 times a second (it is soft; the house stays sharp)
    if (lk !== lastL){ const now = performance.now(), turning = G && G.mode === 'orbit';
      if (!turning || now - lightT > 120){ lastL = lk; lightT = now; drawLight(R); }
      clearTimeout(lightTimer); if (turning) lightTimer = setTimeout(render, 140); }
  }
  ui.render = render;
  function dynScene(){
    _clipN = 9000;
    let s = HD.clockHands(HL.now());
    if (pour){ const p = pour, d = ''; let w = '';
      for (let i = 0; i < 8; i++){ const u = (p.t*1.8 + i/8) % 1, x = p.at[0] - 4 + (i % 3)*3, y = p.at[1] - 10 + (i % 4)*2.4, z = p.at[2] + 26 - u*28;
        w += `M${P(x, y, z).map(f).join(' ')}L${P(x, y, z - 4).map(f).join(' ')}`; }
      s += `<path d="${w}" fill="none" stroke="#5b9fe0" stroke-width="1.8" stroke-linecap="round"/>`; }
    return inkScale(s);
  }
  // the day's light: MUL is a light map (white = as drawn): outside takes the sky's tint, rooms a softer one, and a messy
  // room a little dimmer. SCR adds warmth: lamps at night, and more for a tidy room. Masks hide what upper floors cover.
  function drawLight(R){
    const L = LIGHT, big = `x="${f(VB0[0] - VB0[2])}" y="${f(VB0[1] - VB0[3])}" width="${f(VB0[2]*3)}" height="${f(VB0[3]*3)}"`, night = L.lamps > .5;
    let defs = '', mul = '', scr = '';
    for (const fl of [0, 1]){ const a = HD.abovePath(fl); defs += `<mask id="hm${fl}"><rect ${big} fill="#fff"/><path d="${a}" fill="#000"/></mask>`; }
    const out = mix('#ffffff', L.tint, L.a), inn = mix('#ffffff', L.tint, L.a*(night ? .3 : .55));
    mul += `<rect ${big} fill="${out}"/>`;
    const lampAt = { kitchen: [[96, 98, HD.ZF[1] - 60]], laundry: [[75, 75, HD.ZF[2] - 30]], prayer: [[80, 236, HD.ZF[2] - 70]], bedroom: [[120, 8, HD.ZF[2] + 100]].concat(DEC.placed && DEC.placed.lamp ? [A.lamp] : []) };
    let gi = 0;
    for (const id of ['kitchen', 'laundry', 'prayer', 'bedroom']){
      const r = ROOMS[id], t = R[id].tidy, mk = r.fl === 2 ? '' : ` mask="url(#hm${r.fl})"`, d = HD.roomPath(id);
      mul += `<path d="${d}" fill="${mix(inn, '#767b98', .24*(1 - t))}"${mk}/>`;
      let inner = `<path d="${d}" fill="${night ? '#ffae45' : '#ffd38a'}" opacity="${((night ? .12 : .025) + (night ? .1 : .06)*t).toFixed(3)}"/>`;
      if (L.lamps > .3) for (const p of lampAt[id]){ const c = P(...p), rr = 130; gi++;
        defs += `<radialGradient id="hg${gi}"><stop offset="0" stop-color="#ffcf7a" stop-opacity="${(.7*L.lamps*(.65 + .35*t)).toFixed(2)}"/><stop offset=".55" stop-color="#ffb84d" stop-opacity="${(.25*L.lamps).toFixed(2)}"/><stop offset="1" stop-color="#ffb84d" stop-opacity="0"/></radialGradient>`;
        inner += `<circle cx="${f(c[0])}" cy="${f(c[1])}" r="${rr}" fill="url(#hg${gi})"/>`; }
      scr += `<g${mk}><clipPath id="hc${id}"><path d="${d}"/></clipPath><g clip-path="url(#hc${id})">${inner}</g></g>`;
    }
    MUL.g.innerHTML = `<defs>${defs}</defs>` + mul; SCR.g.innerHTML = scr;
  }

  /* ---------- overlays: sparkles, glows, bubbles, the hand (HTML: the compositor animates them) ---------- */
  const OVL = [];         // [{el, p3}]
  function ovAdd(cls, p3, html, style){ const e = document.createElement('i'); e.className = cls; if (html) e.innerHTML = html; if (style) e.setAttribute('style', style); OV.appendChild(e); const o = { el: e, p3 }; OVL.push(o); posOv(o); return o; }
  function ovDel(o){ if (!o) return; o.el.remove(); const i = OVL.indexOf(o); if (i >= 0) OVL.splice(i, 1); }
  function posOv(o){ if (!o.p3) return; const [x, y] = toPx(o.p3); o.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; }
  function placeOverlays(){ OVL.forEach(posOv); }
  let SPK = [];
  function sparkles(R){
    SPK.forEach(ovDel); SPK = [];
    const pts = { bedroom: [[60, 90, 40], [110, 200, 70], [30, 140, 120], [130, 260, 30]], kitchen: [[30, 100, 100], [100, 180, 40], [120, 260, 60]], laundry: [[40, 110, 50], [110, 60, 100], [90, 120, 30]],
      prayer: [[40, 180, 110], [110, 270, 40], [60, 220, 70]], garden: [[HD.HW + 20, 90, 40], [HD.HW + 30, 170, 50], [HD.HW + 18, 245, 36]] };
    for (const id in pts){ if (R[id].tidy < 1) continue; const fl = ROOMS[id].fl, z0 = fl < 0 ? 0 : HD.ZF[fl];
      pts[id].forEach(([x, y, z], i) => SPK.push(ovAdd('spk', [x, y, z0 + z], `<b style="animation-delay:${(i*.9 + (x % 7)*.13).toFixed(2)}s"></b>`))); }
  }
  function burst(p3, n = 10){
    for (let i = 0; i < n; i++){ const a = i/n*2*Math.PI + Math.random()*.4, r = 34 + Math.random()*30;
      const o = ovAdd('burst', p3, `<b style="--dx:${(Math.cos(a)*r).toFixed(0)}px;--dy:${(Math.sin(a)*r - 10).toFixed(0)}px;animation-delay:${(Math.random()*.12).toFixed(2)}s"></b>`);
      setTimeout(() => ovDel(o), 1200); }
    play('h_spark');
  }
  // the prayer corner glows when it is time to pray; the bubble is the invitation (an adhan speaker)
  let PG = null, PB = null, TJ = null;
  const SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h4l5-4v13l-5-4H4z" fill="#f4b829"/><path d="M16.5 9a4 4 0 0 1 0 6"/><path d="M19 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
  const STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.6 6.3 6.8.5-5.2 4.4 1.7 6.6L12 16.7l-5.9 3.6 1.7-6.6-5.2-4.4 6.8-.5z" fill="#fff3c4" stroke="#fff3c4" stroke-width="1" stroke-linejoin="round"/></svg>';
  function prayerOverlays(){
    ovDel(PG); ovDel(PB); ovDel(TJ); PG = PB = TJ = null;
    if (PS.now){
      PG = ovAdd('glow', [70, 226, HD.ZF[1] + 20], '<b></b>', '--r:' + Math.round(Math.max(150, 150*ppu())) + 'px');
      PB = ovAdd('', A.clock, ''); const b = document.createElement('button'); b.className = 'hh-bub'; b.innerHTML = SPEAKER; b.setAttribute('aria-label', 'Adhan');
      b.addEventListener('click', () => go('adhan')); PB.el.appendChild(b);
    }
    if (PS.tahajjud && !HL.prayed('tahajjud')){
      TJ = ovAdd('', [0, 128, HD.ZF[2] + 130], ''); const b = document.createElement('button'); b.className = 'hh-bub star'; b.innerHTML = STAR; b.setAttribute('aria-label', 'Tahajjud');
      b.addEventListener('click', () => go('tahajjud')); TJ.el.appendChild(b);
    }
  }
  // the child's hand
  const hand = document.createElement('i'); hand.className = 'hand'; OV.appendChild(hand);
  let handPose = '';
  function handAt(x, y, pose){ const hc = HH.hand(); const k = pose + hc.skin + hc.sleeve; hand.classList.toggle('grab', pose === 'grab');
    if (handPose !== k){ handPose = k; hand.innerHTML = HH.handSvg(hc.skin, hc.sleeve, pose); }
    hand.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; hand.classList.add('on'); }
  const handOff = () => hand.classList.remove('on', 'tap');
  function tapHand(x, y){ handAt(x, y, 'point'); hand.classList.remove('tap'); void hand.offsetWidth; hand.classList.add('tap'); clearTimeout(tapHand.t); tapHand.t = setTimeout(handOff, 520); }

  /* ---------- the HUD: zoom out, sky dial, stars, sound, the hand colour, front view ---------- */
  const ICON = {
    house: '<svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.5V20h12V9.5" fill="#f4b829"/><path d="M10 20v-5h4v5" fill="#fbf6ea"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 2.8l2.7 5.9 6.4.7-4.8 4.4 1.3 6.4L12 17l-5.6 3.2 1.3-6.4L2.9 9.4l6.4-.7z" fill="#f4b829" stroke="#231e16" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    front: '<svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 7.5v9L12 21l8-4.5v-9z" fill="#fbf6ea"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/><path d="M2.5 14.5a10 10 0 0 0 4 4.5M21.5 14.5a10 10 0 0 1-4 4.5"/></svg>',
  };
  const btn = (html, label, fn) => { const b = document.createElement('button'); b.className = 'hh-btn'; b.innerHTML = html; b.setAttribute('aria-label', label);
    b.addEventListener('click', e => { e.stopPropagation(); play('h_tap'); fn(); }); return b; };
  const top = document.createElement('div'); top.className = 'hh-hud top';
  const gL = document.createElement('div'), gR = document.createElement('div'); gL.className = gR.className = 'grp';
  const bOut = btn(ICON.house, 'Whole house', () => goOut());
  const dial = document.createElement('div'); dial.className = 'hh-dial'; dial.setAttribute('role', 'img'); dial.setAttribute('aria-label', 'Prayer times today');
  const bStar = btn(ICON.star + '<span>0</span>', 'My room', () => tray(!trayOpen));
  const bSnd = btn('', 'Sound', () => { if (window.Kit && Kit.sfx) Kit.sfx.toggle(); sndIcon(); });
  function sndIcon(){ const m = !!(window.Kit && Kit.sfx && Kit.sfx.muted); bSnd.innerHTML = HH.icon(m ? 'mute' : 'sound'); }
  gL.appendChild(bOut); gR.appendChild(bStar); gR.appendChild(bSnd); top.appendChild(gL); top.appendChild(dial); top.appendChild(gR); document.body.appendChild(top);
  const bot = document.createElement('div'); bot.className = 'hh-hud bot';
  const bHand = btn('', 'My hand', () => HH.pickHand(() => { handPose = ''; handIcon(); }));
  function handIcon(){ const h = HH.hand(); bHand.innerHTML = `<span style="display:block;width:30px;height:36px">${HH.handSvg(h.skin, h.sleeve, 'open')}</span>`; }
  const bFront = btn(ICON.front, 'Front', () => { const y0 = YAW, t0 = performance.now();
    (function step(){ const u = Math.min(1, (performance.now() - t0)/500), e = u < .5 ? 2*u*u : 1 - Math.pow(-2*u + 2, 2)/2; turnTo(y0 + (YAW_H - y0)*e); if (u < 1) requestAnimationFrame(step); else hud(); })(); });
  bot.appendChild(bHand); bot.appendChild(bFront); document.body.appendChild(bot);
  sndIcon(); handIcon();
  function hud(){
    bOut.hidden = !zoomed();
    bFront.style.visibility = (Math.abs(YAW - YAW_H) > 2 || Math.abs(PITCH - PITCH_H) > 2) ? 'visible' : 'hidden';
    bStar.querySelector('span').textContent = HL.stars().n;
  }
  // sky dial: the sun (or moon) on its arc, the five prayers on it; done prayers are green, the current one is ringed
  function drawDial(){
    const d = HL.now(), t = HL.times(d), W = 150, H = 56, hz = 41, cx = 75, rx = 52, ry = 29;
    const sr = t.sunrise.getTime(), mg = t.maghrib.getTime(), ms = d.getTime();
    const arcAt = u => [cx - rx*Math.cos(u*Math.PI), hz - ry*Math.sin(u*Math.PI)];
    const dayU = tt => (tt - sr)/(mg - sr);
    const marks = [['fajr', [cx - rx - 4, hz + 8]], ['dhuhr', arcAt(dayU(t.dhuhr.getTime()))], ['asr', arcAt(dayU(t.asr.getTime()))], ['maghrib', [cx + rx, hz]], ['isha', [cx + rx + 4, hz + 8]]];
    const day = ms >= sr && ms < mg;
    let s = `<rect width="${W}" height="${H}" fill="${LIGHT.sky}"/>`;
    s += `<path d="M0 ${hz}H${W}V${H}H0Z" fill="${day ? '#a9d47b' : '#55705a'}"/><path d="M0 ${hz}H${W}" stroke="#231e16" stroke-width="1.6"/>`;
    s += `<path d="M${cx - rx} ${hz}A${rx} ${ry} 0 0 1 ${cx + rx} ${hz}" fill="none" stroke="#231e16" stroke-width="1.2" stroke-dasharray="2 4" opacity=".55"/>`;
    for (const [n, [x, y]] of marks){ const done = HL.prayed(n), cur = PS.cur && PS.cur.name === n;
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${cur ? 5.5 : 4.2}" fill="${done ? '#5cae6a' : '#fbf6ea'}" stroke="#231e16" stroke-width="1.6"/>`;
      if (cur && !done) s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8.5" fill="none" stroke="#f4b829" stroke-width="2.4"/>`; }
    if (day){ const [x, y] = arcAt(dayU(ms)); s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="#f4b829" stroke="#231e16" stroke-width="1.6"/>`; }
    else { const nf = ms < sr ? sr : t.nextFajr.getTime() + (sr - t.fajr.getTime()), st = ms < sr ? HL.times(new Date(d.getTime() - 864e5)).maghrib.getTime() : mg;
      const [x, y] = arcAt(1 - Math.max(0, Math.min(1, (ms - st)/(nf - st))));
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="#fff3c4" stroke="#231e16" stroke-width="1.6"/><circle cx="${(x + 3.4).toFixed(1)}" cy="${(y - 2.4).toFixed(1)}" r="5.6" fill="${LIGHT.sky}"/>`;
      if (PS.tahajjud) s += `<path d="M18 9l1.5 3.4 3.6.3-2.8 2.4.9 3.5-3.2-1.9-3.2 1.9.9-3.5-2.8-2.4 3.6-.3z" fill="#fff3c4"/>`; }
    dial.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${s}</svg>`;
  }

  /* ---------- picking what is under the finger ---------- */
  function pick(cx, cy){
    const k = ppu(), C = [];
    const add = (hit, p3, rU) => { const [x, y] = toPx(p3), d = Math.hypot(x - cx, y - cy), r = Math.max(26, rU*k); if (d <= r) C.push(Object.assign({ d: d/r }, hit)); };
    const v = view();
    if (canMode) for (const id in v.thirsty) add({ kind: 'plant', id }, A[id], 26);
    for (const it of v.mess){ const b = HD.messBox(it), c = [(b[0][0] + b[1][0])/2, (b[0][1] + b[1][1])/2, (b[0][2] + b[1][2])/2];
      add({ kind: 'mess', it }, c, Math.max(12, (b[1][0] - b[0][0])*.6, (b[1][1] - b[0][1])*.6)); }
    if (!v.bed) add({ kind: 'bed' }, A.bed, 46);
    if (!v.canHeld) add({ kind: 'can' }, A.can, 18);
    for (const p of HD.PLANTS) add({ kind: 'plant', id: p.id }, A[p.id], 18);
    add({ kind: 'station', id: 'washer' }, A.washer, 30);
    add({ kind: 'station', id: 'basin' }, A.basin, 24);
    add({ kind: 'station', id: 'mat' }, PS.now ? A.mat : [14, 194, HD.ZF[1] + 8], PS.now ? 40 : 26);
    add({ kind: 'station', id: 'clock' }, A.clock, 16);
    C.sort((a, b) => a.d - b.d);
    if (C.length) return C[0];
    const [X, Y] = toVB(cx, cy);
    for (const id of ['bedroom', 'laundry', 'prayer', 'kitchen', 'garden']) if (HD.inRoomPoly(id, X, Y)) return { kind: 'room', id };
    return { kind: 'none' };
  }

  /* ---------- the finger: tap, drag an item, pan (zoomed in) or turn (zoomed out) ---------- */
  let G = null, raf = 0;
  stack.addEventListener('pointerdown', e => {
    if (e.target.closest('.hh-bub')) return;
    e.preventDefault(); e.stopPropagation();
    if (G || e.button) return;
    const h = pick(e.clientX, e.clientY);
    G = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), hit: h, mode: 'press', yaw: YAW, pitch: PITCH };
    try { stack.setPointerCapture(e.pointerId); } catch (err) {}
    if (h.kind === 'mess' || h.kind === 'can') handAt(e.clientX, e.clientY, 'point');
  }, true);
  stack.addEventListener('dblclick', e => e.stopPropagation(), true);
  stack.addEventListener('pointermove', e => {
    if (!G || e.pointerId !== G.id) return;
    G.x = e.clientX; G.y = e.clientY;
    const dx = G.x - G.x0, dy = G.y - G.y0;
    if (G.mode === 'press' && Math.hypot(dx, dy) > 8){
      const h = G.hit;
      if (h.kind === 'mess') startDrag(h.it);
      else if (h.kind === 'can') startDrag(canItem());
      else if (zoomed()) G.mode = 'pan';
      else G.mode = 'orbit';
    }
    if (!raf) raf = requestAnimationFrame(moveFrame);
  });
  function moveFrame(){
    raf = 0; if (!G) return;
    const dx = G.x - G.x0, dy = G.y - G.y0;
    if (G.mode === 'drag') dragMove();
    else if (G.mode === 'pan'){ const k = ppu(), lim = clampPan(dx, dy); G.pdx = lim[0]; G.pdy = lim[1]; stack.style.transform = `translate(${lim[0]}px,${lim[1]}px)`; }
    else if (G.mode === 'orbit') turnTo(G.yaw - dx*.22);
  }
  function clampPan(dx, dy){ const k = ppu(); let nx = VB[0] - dx/k, ny = VB[1] - dy/k;
    nx = Math.max(VB0[0], Math.min(VB0[0] + VB0[2] - VB[2], nx)); ny = Math.max(VB0[1], Math.min(VB0[1] + VB0[3] - VB[3], ny));
    return [(VB[0] - nx)*k, (VB[1] - ny)*k]; }
  const endG = e => {
    if (!G || e.pointerId !== G.id) return;
    const g = G; G = null; cancelAnimationFrame(raf); raf = 0;
    if (g.mode === 'press'){ if (g.hit.kind !== 'mess' && g.hit.kind !== 'can') tapHand(g.x, g.y); else handOff(); if (e.type !== 'pointercancel') tap(g.hit, g.x, g.y); }
    else if (g.mode === 'drag') drop(g);
    else if (g.mode === 'pan'){ const k = ppu(); stack.style.transform = ''; setVB([VB[0] - (g.pdx || 0)/k, VB[1] - (g.pdy || 0)/k, VB[2], VB[3]]); }
    else if (g.mode === 'orbit'){ hud(); render(); }
  };
  stack.addEventListener('pointerup', endG); stack.addEventListener('pointercancel', endG);

  function tap(h, cx, cy){
    switch (h.kind){
      case 'mess': play('h_tap'); if (!zoomed()) goRoom(h.it.room, 650, toVB(cx, cy)); hint(h.it.target); break;
      case 'bed': makeBed(); break;
      case 'can': canMode = !canMode; play(canMode ? 'h_lift' : 'h_back'); canFloat(); render(); if (canMode) hintPlants(); break;
      case 'plant': if (canMode && view().thirsty[h.id]) water(h.id); else if (view().thirsty[h.id]){ play('h_tap'); hint('can'); } else { play('h_tap'); burst(A[h.id], 5); } break;
      case 'station': go(h.id); break;
      case 'room': play('h_tap'); if (zoomRoom !== h.id || !zoomed()) goRoom(h.id, 650, zoomed() ? null : toVB(cx, cy)); break;
      default: if (canMode){ canMode = false; canFloat(); render(); } else if (zoomed()){ play('h_tap'); goOut(); }
    }
  }
  // a tapped item says where it goes: the right container glows for a moment
  let hintO = null, hintT = 0;
  function hint(target){ const p = target === 'can' ? A.can : A[target]; if (!p) return; ovDel(hintO); clearTimeout(hintT);
    hintO = ovAdd('ring', p, '<b></b>', `--r:${Math.round(Math.max(56, 38*ppu()))}px`); hintT = setTimeout(() => { ovDel(hintO); hintO = null; }, 1500); }
  let plantRings = [];
  function hintPlants(){ plantRings.forEach(ovDel); plantRings = []; if (!canMode) return; for (const id in view().thirsty) plantRings.push(ovAdd('ring', A[id], '<b></b>', `--r:${Math.round(Math.max(52, 30*ppu()))}px`)); }

  /* ---------- drag and drop ---------- */
  function canItem(){ return { id: 'can', kind: 'can', pos: [HD.CAN[0], HD.CAN[1], 8] }; }
  function itemSvgBox(it){
    if (it.kind === 'can') return { svg: HD.wateringCan(it.pos[0], it.pos[1], it.pos[2]), box: [[it.pos[0] - 10, it.pos[1] - 12, it.pos[2]], [it.pos[0] + 20, it.pos[1] + 10, it.pos[2] + 27]] };
    if (it.kind === 'decor') return null;
    const p = HD.messPart(it); return { svg: p.svg, box: p.box };
  }
  // the item, drawn once into its own small SVG, which then only moves
  function makeFloat(it){
    const sb = itemSvgBox(it), b = sb.box, pts = [];
    for (const x of [b[0][0], b[1][0]]) for (const y of [b[0][1], b[1][1]]) for (const z of [b[0][2], b[1][2]]) pts.push(P(x, y, z));
    const pad = 6, x0 = Math.min(...pts.map(p => p[0])) - pad, y0 = Math.min(...pts.map(p => p[1])) - pad, x1 = Math.max(...pts.map(p => p[0])) + pad, y1 = Math.max(...pts.map(p => p[1])) + pad;
    const k = ppu(), el = document.createElement('div');
    _clipN = 8000;
    el.style.width = ((x1 - x0)*k).toFixed(1) + 'px'; el.style.height = ((y1 - y0)*k).toFixed(1) + 'px';
    el.innerHTML = `<svg viewBox="${f(x0)} ${f(y0)} ${f(x1 - x0)} ${f(y1 - y0)}"><g filter="url(#hand)">${inkScale(sb.svg)}</g></svg>`;
    FLT.appendChild(el);
    const L0 = (x0 - VB[0])*k, T0 = (y0 - VB[1])*k;
    el.style.transform = `translate(${L0}px,${T0}px)`;
    return { el, x0, y0, w: x1 - x0, h: y1 - y0, k0: k, it, home: [x0, y0] };
  }
  let F = null;
  function startDrag(it){
    G.mode = 'drag'; held = it.id;
    if (it.kind === 'can'){ if (canF){ canF.el.remove(); canF = null; } canMode = false; }
    render();
    F = makeFloat(it);
    const L0 = (F.x0 - VB[0])*F.k0, T0 = (F.y0 - VB[1])*F.k0;
    F.grab = [G.x0 - L0, G.y0 - T0];
    play('h_lift');
    const tgs = targetsOf(it);
    F.rings = tgs.map(t => ovAdd('ring', t.p3, '<b></b>', `--r:${Math.round(Math.max(56, 36*ppu()))}px`));
    F.tgs = tgs;
    // the place it belongs is off screen: step back to see the whole house
    if (zoomed() && tgs.length && tgs.every(t => { const [x, y] = toPx(t.p3); return x < 20 || y < 60 || x > stack.clientWidth - 20 || y > stack.clientHeight - 60; })) goOut(600);
    dragMove();
  }
  function targetsOf(it){
    if (it.kind === 'can') return Object.keys(view().thirsty).map(id => ({ id, p3: A[id] }));
    return [{ id: it.target, p3: A[it.target] }];
  }
  function floatAt(px, py){
    // held a little bigger, just above the fingers, so the finger never hides it
    const sc = ppu()/F.k0*1.3, cx = F.w*F.k0*sc/2, cy = F.h*F.k0*sc;
    const x = px - cx, y = py - cy - 4;
    F.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${sc.toFixed(3)})`;
    return [x + F.w*F.k0*sc/2, y + F.h*F.k0*sc/2];
  }
  function dragMove(){
    if (!F) return;
    const c = floatAt(G.x, G.y);
    handAt(G.x, G.y, 'grab');
    const R = Math.max(58, 30*ppu());
    F.hot = null;
    F.tgs.forEach((t, i) => { const [x, y] = toPx(t.p3), d = Math.min(Math.hypot(x - c[0], y - c[1]), Math.hypot(x - G.x, y - G.y)), hot = d < R;
      F.rings[i].el.classList.toggle('hot', hot); if (hot && (!F.hot || d < F.hot.d)) F.hot = { t, d }; });
  }
  function drop(g){
    const f2 = F; F = null; handOff();
    f2.rings.forEach(ovDel);
    if (f2.hot){
      const t = f2.hot.t, [x, y] = toPx(t.p3), sc = ppu()/f2.k0*.5;
      if (f2.it.kind === 'can'){ f2.el.remove(); held = null; render(); canMode = true; canFloat(); water(t.id); return; }
      f2.el.classList.add('go');
      f2.el.style.transform = `translate(${(x - f2.w*f2.k0*sc/2).toFixed(1)}px,${(y - f2.h*f2.k0*sc/2).toFixed(1)}px) scale(${sc.toFixed(3)})`; f2.el.style.opacity = '0';
      setTimeout(() => { f2.el.remove(); tidied(f2.it); }, 300);
    } else {
      // not there: it floats gently back to where it was
      const k = ppu(), sc = k/f2.k0;
      f2.el.classList.add('back');
      f2.el.style.transform = `translate(${((f2.x0 - VB[0])*k).toFixed(1)}px,${((f2.y0 - VB[1])*k).toFixed(1)}px) scale(${sc.toFixed(3)})`;
      play('h_back');
      setTimeout(() => { held = null; render(); f2.el.remove(); if (f2.it.kind !== 'can') hint(f2.it.target); }, 520);
    }
  }
  function tidied(it){
    held = null; S.done[it.id] = 1; HL.save(S);
    play(SND[it.target] || 'h_wood'); render(); burst(A[it.target], 8);
    try { window.KahfBridge && KahfBridge.item && KahfBridge.item(it.kind); } catch (e) {}
    afterTidy();
  }
  // a room that becomes tidy: warmer light, sparkles, a star
  let wasTidy = null;
  function afterTidy(){
    const R = rooms(), d = HL.dayKey(HL.now());
    for (const id of ['bedroom', 'kitchen', 'laundry', 'garden']){
      const r = R[id]; if (!r.total || r.pending) continue;
      if (HL.credit(d + '|tidy|' + id + '|' + r.total)){
        setTimeout(() => { play('h_done'); burst(ROOMS[id].c, 14); starFly(ROOMS[id].c); try { Kit.say && Kit.say.praise && Kit.say.praise('mashaallah'); } catch (e) {}
          try { window.KahfBridge && KahfBridge.complete(); } catch (e) {} }, 350);
      }
    }
  }
  function starFly(p3){
    const s = document.createElement('div'); s.className = 'hh-starfly'; s.innerHTML = ICON.star; document.body.appendChild(s);
    const [x, y] = toPx(p3), r = bStar.getBoundingClientRect();
    s.style.left = x + 'px'; s.style.top = y + 'px';
    requestAnimationFrame(() => requestAnimationFrame(() => { s.style.transform = `translate(${r.left + r.width/2 - x}px,${r.top + r.height/2 - y}px) scale(.7)`; s.style.opacity = '.4'; }));
    setTimeout(() => { s.remove(); hud(); bStar.classList.remove('pulse'); void bStar.offsetWidth; bStar.classList.add('pulse'); play('h_spark'); trayTiles(); }, 950);
  }

  /* ---------- tap actions: make the bed, the watering can ---------- */
  function makeBed(){
    if (sweeping) return; sweeping = true;
    const a = toPx([120, 214, HD.ZF[2] + 40]), b = toPx([20, 210, HD.ZF[2] + 40]), t0 = performance.now();
    play('h_cloth');
    (function step(){ const u = Math.min(1, (performance.now() - t0)/650), e = u < .5 ? 2*u*u : 1 - Math.pow(-2*u + 2, 2)/2;
      handAt(a[0] + (b[0] - a[0])*e, a[1] + (b[1] - a[1])*e + Math.sin(u*Math.PI)*-14, 'open');
      if (u < 1) return requestAnimationFrame(step);
      handOff(); sweeping = false; S.bed = true; HL.save(S); render(); burst(A.bed, 12); play('h_cloth'); afterTidy(); })();
  }
  let canF = null;
  function canFloat(){
    if (canF){ canF.el.remove(); canF = null; }
    plantRings.forEach(ovDel); plantRings = [];
    if (!canMode) return;
    canF = makeFloat(canItem());
    const k = ppu(); canF.el.style.transform = `translate(${((canF.x0 - VB[0])*k).toFixed(1)}px,${((canF.y0 - VB[1])*k - 14).toFixed(1)}px)`;
    canF.el.classList.add('hover');
    hintPlants();
  }
  function water(id){
    if (pour || !canF) return;
    const p = HD.PLANTS.find(x => x.id === id), k = ppu();
    canF.el.classList.remove('hover'); canF.el.classList.add('go');
    const [x, y] = toPx([p.x + 4, p.y + 16, 46]);
    canF.el.style.transform = `translate(${(x - canF.w*k*.5).toFixed(1)}px,${(y - canF.h*k*.8).toFixed(1)}px) rotate(-24deg)`;
    plantRings.forEach(ovDel); plantRings = [];
    setTimeout(() => {
      play('h_water'); pour = { t: 0, at: [p.x, p.y, 30] }; const t0 = performance.now();
      (function step(){ pour.t = (performance.now() - t0)/1000; render(); if (pour.t < 1.3) return requestAnimationFrame(step);
        pour = null; S.watered[id] = 1; HL.save(S); render(); burst(A[id], 8);
        const more = Object.keys(view().thirsty).length;
        canMode = more > 0; canFloat(); render(); afterTidy(); })();
    }, 380);
  }

  /* ---------- stations: zoom in, then open the station page ---------- */
  function go(id){
    const P3 = { washer: A.washer, basin: A.basin, mat: A.mat, clock: A.clock, adhan: A.clock, tahajjud: [0, 128, HD.ZF[2] + 110] }[id];
    let st, prm = { from: 'house' };
    if (id === 'washer') st = 'washer';
    else if (id === 'basin') st = 'wudu';
    else if (id === 'tahajjud'){ st = 'wudu'; prm.p = 'tahajjud'; prm.next = 'salah'; }
    else if ((id === 'mat' || id === 'clock' || id === 'adhan') && PS.now){ st = 'adhan'; prm.p = PS.cur.name; prm.next = 'wudu,salah'; }
    else if (id === 'mat') st = 'salah';
    else { play('h_tap'); hint('mat'); return; }
    const url = FL ? FL.url(st, prm) : '/KidsGames/games/helping-home/' + { washer: 'jobs/washing-machine.html', wudu: 'pray/wudu.html', salah: 'pray/salah.html', adhan: 'pray/adhan.html' }[st] + '?' + new URLSearchParams(prm);
    play('h_zoom'); zoomRoom = null;
    zoomTo(P3, 2.8, 700, () => { location.href = url; });
  }

  /* ---------- My Room: stars earn decorations, dragged into the bedroom ---------- */
  const DI = {
    rug: '<rect x="3" y="6" width="18" height="12" rx="2.5" fill="#e98f6b"/><path d="M12 8.5l3.5 3.5-3.5 3.5-3.5-3.5z" fill="#f2c230"/>',
    lamp: '<path d="M7 4h10l2.5 8h-15z" fill="#f3a6bb"/><path d="M12 12v7M8 20h8"/>',
    cushion: '<path d="M5 6c3 1 11 1 14 0 1 3 1 9 0 12-3-1-11-1-14 0-1-3-1-9 0-12z" fill="#f4b829"/><circle cx="12" cy="12" r="1.6" fill="#ef8a3c"/>',
    plant: '<path d="M7.5 14h9l-1.3 7h-6.4z" fill="#d9805a"/><path d="M12 14c0-4-1-7-4.5-9 0 4 2 7 4.5 9zM12 14c0-4 1-7 4.5-9 0 4-2 7-4.5 9z" fill="#5cae6a"/>',
    frame: '<rect x="4" y="4" width="16" height="16" rx="1.5" fill="#fbf4e4"/><path d="M12 6.5l1.6 3.9 3.9 1.6-3.9 1.6-1.6 3.9-1.6-3.9-3.9-1.6 3.9-1.6z" fill="#3f9c92"/>',
    garland: '<path d="M2.5 6c6 6 13 6 19 0"/><path d="M7 10.3l.9 2 2.1.2-1.6 1.4.5 2.1L7 14.9 5.1 16l.5-2.1L4 12.5l2.1-.2zM17 10.3l.9 2 2.1.2-1.6 1.4.5 2.1-1.9-1.1-1.9 1.1.5-2.1-1.6-1.4 2.1-.2z" fill="#f2c230"/><circle cx="12" cy="12.3" r="1.6" fill="#93d3b0"/>',
  };
  const decoIcon = id => `<svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${DI[id]}</svg>`;
  const trayEl = document.createElement('div'); trayEl.className = 'hh-tray'; trayEl.setAttribute('role', 'dialog');
  trayEl.innerHTML = '<div class="tiles"></div><button class="x" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="2.8" stroke-linecap="round"><path d="M7 7l10 10M17 7 7 17"/></svg></button>';
  trayEl.querySelector('.x').addEventListener('click', () => { play('h_tap'); tray(false); });
  document.body.appendChild(trayEl);
  let trayOpen = false;
  function tray(on){ trayOpen = on; trayEl.classList.toggle('in', on); bot.style.visibility = on ? 'hidden' : ''; if (on){ trayTiles(); goRoom('bedroom'); } }
  function trayTiles(){
    const n = HL.stars().n, box = trayEl.querySelector('.tiles'); box.innerHTML = '';
    for (const id of Object.keys(HD.DECOR)){
      const c = HD.DECOR[id].cost, lock = n < c, placed = !!DEC.placed[id];
      const t = document.createElement('button'); t.className = 'hh-tile' + (lock ? ' lock' : '') + (placed ? ' placed' : ''); t.dataset.id = id;
      t.innerHTML = decoIcon(id) + `<span class="c">${placed ? '&#10003;' : c}</span>`; t.setAttribute('aria-label', id);
      t.addEventListener('pointerdown', e => tileDown(e, id, lock, placed));
      box.appendChild(t);
    }
  }
  let TD = null;
  function tileDown(e, id, lock, placed){
    e.preventDefault();
    if (lock){ play('h_soft'); const t = e.currentTarget; t.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], 260); return; }
    if (placed){ DEC.placed[id] = 0; HL.saveRoom(DEC); play('h_back'); render(); trayTiles(); return; }
    const el = document.createElement('div'); el.style.width = '72px'; el.style.height = '72px'; el.innerHTML = decoIcon(id); FLT.appendChild(el);
    const r = e.currentTarget.getBoundingClientRect();
    TD = { id, el, x0: r.left + r.width/2, y0: r.top + r.height/2, pid: e.pointerId };
    TD.ring = ovAdd('ring', A[id], '<b></b>', `--r:${Math.round(Math.max(60, 44*ppu()))}px`);
    play('h_lift'); moveTD(e.clientX, e.clientY);
    addEventListener('pointermove', tdMove); addEventListener('pointerup', tdUp); addEventListener('pointercancel', tdUp);
  }
  function moveTD(x, y){ TD.x = x; TD.y = y; TD.el.style.transform = `translate(${x - 36}px,${y - 60}px)`; handAt(x, y, 'grab');
    const [X, Y] = toVB(x, y - 24); TD.ok = HD.inRoomPoly('bedroom', X, Y); TD.ring.el.classList.toggle('hot', TD.ok); }
  function tdMove(e){ if (TD && e.pointerId === TD.pid) moveTD(e.clientX, e.clientY); }
  function tdUp(e){
    if (!TD || e.pointerId !== TD.pid) return;
    removeEventListener('pointermove', tdMove); removeEventListener('pointerup', tdUp); removeEventListener('pointercancel', tdUp);
    const t = TD; TD = null; handOff(); ovDel(t.ring);
    if (t.ok){ t.el.remove(); DEC.placed[t.id] = 1; HL.saveRoom(DEC); play('h_wood'); render(); burst(A[t.id], 12); trayTiles(); }
    else { t.el.classList.add('back'); t.el.style.transform = `translate(${t.x0 - 36}px,${t.y0 - 36}px)`; play('h_back'); setTimeout(() => t.el.remove(), 500); }
  }

  /* ---------- time passes: the light, new mess, prayer windows (one check every 20 s, nothing in between) ---------- */
  function refresh(){
    const d = HL.now();
    if (HL.dayKey(d) !== S.day){ S = HL.load(); DAY = HL.dayItems(d); }
    LIGHT = HL.light(d);
    const ps = prayerState(), changed = JSON.stringify(ps) !== JSON.stringify(PS); PS = ps;
    render(); drawDial(); if (changed || !PG && PS.now) prayerOverlays();
  }
  setInterval(refresh, 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  addEventListener('pageshow', e => { if (e.persisted){ S = HL.load(); DEC = HL.room(); HL.creditLog(); refresh(); hud(); } });
  addEventListener('resize', () => { clearTimeout(frame.t); frame.t = setTimeout(() => { const r = zoomRoom; frame(); render(); if (r) goRoom(r, 0); placeOverlays(); prayerOverlays(); }, 120); });

  /* ---------- start ---------- */
  frame();
  render(); drawDial(); prayerOverlays(); hud();
  const got = HL.creditLog();
  // coming back from a station: start at its corner, then step back with a small celebration
  const back = q.get('back');
  if (back){
    const keep = new URLSearchParams(location.search); keep.delete('back');
    try { history.replaceState(null, '', location.pathname + (keep.toString() ? '?' + keep : '')); } catch (e) {}
    const p3 = { washer: A.washer, wudu: A.basin, salah: A.mat, adhan: A.clock }[back] || null;
    if (p3){ zoomTo(p3, 2.6, 0); setTimeout(() => { zoomTo(null, 1, 1100); burst(p3, 14); play('h_done'); if (got.length) setTimeout(() => starFly(p3), 500); }, 650); }
  } else if (got.length) setTimeout(() => starFly(ROOMS.prayer.c), 600);
  if (!HH.hasHand()) setTimeout(() => HH.pickHand(() => { handPose = ''; handIcon(); }), 500);
  HH.precache && HH.precache([]);
  // offline: hand the service worker the whole game's file list (offline.json) once per version, so stations never
  // opened still work with no network; a small leaf shows once that has been asked for
  const leaf = document.createElement('span'); leaf.className = 'hh-leaf'; leaf.setAttribute('role', 'img'); leaf.setAttribute('aria-label', 'Ready offline');
  leaf.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z" fill="#93c25c" stroke="#231e16" stroke-width="1.8" stroke-linejoin="round"/><path d="M5 19c3-5 7-8 11-11" fill="none" stroke="#231e16" stroke-width="1.5" stroke-linecap="round"/></svg>';
  leaf.hidden = true; bHand.after(leaf);
  (function offline(){
    if (!('serviceWorker' in navigator) || !window.fetch) return;
    let saved = null; try { saved = localStorage.getItem('hh.offline'); } catch (e) {}
    if (saved) leaf.hidden = false;
    fetch('/KidsGames/games/helping-home/offline.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(d => {
      if (!d || !Array.isArray(d.files)) return;
      const key = d.version + ':' + (d.bytes || 0);
      if (saved === key) return;
      const c = navigator.serviceWorker.controller;
      (c ? Promise.resolve(c) : navigator.serviceWorker.ready.then(r => r.active)).then(w => {
        if (!w) return;
        w.postMessage({ type: 'CACHE_URLS', urls: d.files });
        try { localStorage.setItem('hh.offline', key); } catch (e) {}
        leaf.hidden = false;
      });
    }).catch(() => {});
  })();
  // testing hooks
  window.__house = { ui, view, rooms, render, pick, goRoom, goOut, zoomTo, toPx, S: () => S, DAY: () => DAY, refresh };
  if (q.get('zoom') && ROOMS[q.get('zoom')]) goRoom(q.get('zoom'), 0);
})();
