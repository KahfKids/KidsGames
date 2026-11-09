/* Helping Home: the living family house. Mounts the house, keeps its layers, and handles the child's hand.
   Layers, bottom to top (each its own GPU layer, so a change repaints only what changed):
     #fig (static house + yard + street, hand-drawn filter)   swapped from a small cache while turning
     DYN  (clock hands, water, the swing, the ball, dust and crumbs being scrubbed)   small, hand-drawn filter
     FLT  (the thing in the child's hand)       drawn once when picked up, then only moved (CSS transform)
     MUL  (the day's light: multiply)           SCR (lamps and tidy warmth: screen)
     OV   (sparkles, prayer glow, bubbles, the hand, snap rings)   HTML, animated by the compositor
   Nothing runs while nothing moves: no animation frame loop at rest, one light check every 20 s.
   Optional modules, all guarded: house/days.js (HHDays), house/family.js (FAMILY), house/street.js (HStreet),
   pray/chart.js (HHChart). */
(function () {
  'use strict';
  const q = new URLSearchParams(location.search);
  const A = HD.A, ROOMS = HD.ROOMS, RIDS = Object.keys(ROOMS), PITCH_H = 27, YAW_H = 45, LIM = 44, STEP = 8;      // the house turns ±44°: 8° steps while dragging (11 angles, all fit the cache), the exact degree on release
  const FL = window.HHFlow, DAYS = () => window.HHDays || null;
  const safe = (fn, def) => { try { const r = fn(); return r == null ? def : r; } catch (e) { return def; } };
  let S = HL.load(), DAY = HL.dayItems(HL.now()), DEC = HL.room(), LIGHT = HL.light(HL.now());
  let held = null, tool = null, scrub = null, pour = null, swingT = -1, ballAnim = null, bird = false;

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
    h_scrub: (L, t) => L.burst(t, { dur: .14, freq: 2600, q: 1.4, vol: .05 }),
    h_sweep: (L, t) => L.burst(t, { dur: .2, freq: 1800, sweepTo: 900, q: .8, vol: .06 }),
    h_bin:   (L, t) => { L.thump(t, { from: 110, to: 55, vol: .3 }); L.click(t + .03, { freq: 900, vol: .15 }); },
    h_roll:  (L, t) => L.burst(t, { dur: .7, freq: 240, q: .7, vol: .1, brown: true, attack: .1 }),
    h_bounce:(L, t) => { L.thump(t, { from: 200, to: 90, vol: .25 }); L.thump(t + .32, { from: 170, to: 80, vol: .14 }); },
    h_sand:  (L, t) => L.burst(t, { dur: .35, freq: 3000, q: .6, vol: .05, attack: .05 }),
    h_spark: (L, t) => L.grains(t, { n: 10, spread: .35, freq: 7000, vol: .09 }),
    h_done:  (L, t) => L.grains(t, { n: 18, spread: .6, freq: 6500, vol: .1 }),
    h_zoom:  (L, t) => L.whoosh(t, { dur: .35, from: 500, to: 1600, vol: .05 }),
    h_soft:  (L, t) => L.knock(t, { size: .8, vol: .35 }),
  });
  const SND = { basket: 'h_cloth', wardrobe: 'h_cloth', toychest: 'h_wood', shelfB: 'h_book', rack: 'h_clink', shoerack: 'h_shoe', peg: 'h_cloth', recycle: 'h_bin', general: 'h_bin',
    table: 'h_clink', bag: 'h_book', desk: 'h_book', line: 'h_cloth', cleanBasket: 'h_cloth' };
  // the sticker book's chore names (HHDays.award)
  const CHORE = it => it.target === 'table' ? (it.id.startsWith('dinner') ? 'set-dinner' : 'set-breakfast') : it.kind === 'crumb' ? 'wipe-table' : it.kind === 'dust' ? 'sweep-floor' :
    ({ pyj: 'pyjamas-away', sock: 'tidy-my-room', book: 'tidy-my-room', shoe: 'shoe-rack', bag: 'evening-tidy', hw: 'homework-desk', wet: 'hang-washing', dry: 'fold-washing',
       can: 'sort-recycling', paper: 'sort-recycling', bottle: 'sort-recycling', peel: 'sort-recycling', wrapper: 'sort-recycling', sbook: 'pack-schoolbag', lunchbox: 'pack-schoolbag', wbottle: 'pack-schoolbag' })[it.kind]
    || (it.target === 'rack' ? 'clear-table' : it.target === 'toychest' ? 'toddler-toys' : 'evening-tidy');
  const award = id => { try { DAYS() && DAYS().award && DAYS().award(id); } catch (e) {} };

  /* ---------- mount the engine, then take its figure into our own full-screen stack ---------- */
  const ui = mountFigure({ fig: 'H', title: 'Helping Home', size: [HD.LOT[1][0] - HD.LOT[0][0], HD.LOT[1][1] - HD.LOT[0][1], HD.ZTOP], center: [(HD.LOT[0][0] + HD.LOT[1][0])/2, (HD.LOT[0][1] + HD.LOT[1][1])/2],
    palette: 'mint', credit: false, state: { pal: 'mint' }, scene: () => '' });
  CAM_LIM = LIM; setCam(YAW_H, PITCH_H);
  const fig = document.getElementById('fig'), art = document.getElementById('art'), NS = 'http://www.w3.org/2000/svg';
  const SKY = document.createElement('div'); SKY.className = 'hh-sky'; SKY.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  const WX = document.createElement('div'); WX.className = 'hh-wx'; WX.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden';
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
    box-shadow:0 4px 0 #231e16;display:grid;place-items:center;pointer-events:none;animation:hhBub 1.4s ease-in-out infinite alternate}
  .hh-req .core,.hh-bub .core{all:unset;position:absolute;inset:9px;border-radius:50%;pointer-events:auto;cursor:pointer}
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
  
  .hh-teeth{position:fixed;inset:0;z-index:12;display:grid;place-items:center;background:rgba(35,30,22,.3);opacity:0;transition:opacity .2s;touch-action:none}
  .hh-teeth.in{opacity:1}
  .hh-teeth .card{position:relative;background:#f2efe7;border:2.5px solid #231e16;border-radius:28px;box-shadow:0 6px 0 #231e16;padding:14px;width:min(380px,calc(100vw - 24px));box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:10px}
  .hh-teeth .pick{display:flex;gap:12px}
  .hh-teeth .pick button{all:unset;width:64px;height:64px;border-radius:18px;border:2.5px solid #231e16;background:#fff;box-shadow:0 3px 0 #231e16;display:grid;place-items:center;cursor:pointer}
  .hh-teeth .pick button[aria-pressed=true]{background:#f4b829}
  .hh-teeth .pick svg{width:48px;height:48px}
  .hh-teeth .area{width:100%;aspect-ratio:1.6;touch-action:none}
  .hh-teeth .area svg{width:100%;height:100%;display:block}
  .hh-card{position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 76px);z-index:7;transform:translate(-50%,-14px);opacity:0;transition:transform .3s cubic-bezier(.2,1.3,.4,1),opacity .2s;
    display:flex;align-items:center;gap:10px;background:#fbf6ea;border:2.5px solid #231e16;border-radius:20px;box-shadow:0 4px 0 #231e16;padding:8px 14px 8px 8px;max-width:calc(100vw - 32px);
    font:700 14px/1.25 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;color:#231e16;pointer-events:auto}
  .hh-card.in{transform:translate(-50%,0);opacity:1}
  .hh-card i{flex:none;width:44px;height:44px;border-radius:14px;background:#f4b829;border:2px solid #231e16;display:grid;place-items:center}
  .hh-card i svg{width:30px;height:30px}
  .hh-card b{display:block;font-size:15px}
  .hh-req{all:unset;position:absolute;left:0;top:0;width:50px;height:50px;margin:-80px 0 0 -25px;border-radius:50%;background:#fff6dc;border:2.5px solid #231e16;box-shadow:0 4px 0 #231e16;display:grid;place-items:center;pointer-events:none;animation:hhBub 1.4s ease-in-out infinite alternate}
  .hh-req .core,.hh-bub .core{all:unset;position:absolute;inset:9px;border-radius:50%;pointer-events:auto;cursor:pointer}
  .hh-req svg{width:28px;height:28px}
  .hh-sheet-chart{max-height:60vh;overflow:auto;width:100%}`;
  document.head.appendChild(css);
  const stack = document.createElement('div'); stack.className = 'hh-stack'; document.body.appendChild(stack);
  fig.removeAttribute('style');
  function lay(cls, filt){ const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'lay ' + cls); s.setAttribute('aria-hidden', 'true');
    const g = document.createElementNS(NS, 'g'); if (filt) g.setAttribute('filter', 'url(#hand)'); s.appendChild(g); stack.appendChild(s); return { svg: s, g }; }
  const DYN = lay('dyn', true);
  const FLT = document.createElement('div'); FLT.className = 'hh-flt'; stack.appendChild(FLT);
  const MUL = lay('mul', false), SCR = lay('scr', false);
  const OV = document.createElement('div'); OV.className = 'hh-ov'; stack.appendChild(OV);
  // the street has its own two layers (behind the house, in front of it) and its own drawings per angle, so a turning
  // step swaps the house in one frame and the street in the next: half the work per frame
  const STB = lay('stb', true), STF = lay('stf', true), LIVE = lay('live', false);
  const FLOCK = document.createElement('div'); FLOCK.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden';
  stack.insertBefore(fig, DYN.svg); stack.insertBefore(STB.svg, fig); stack.insertBefore(LIVE.svg, DYN.svg); stack.insertBefore(STF.svg, DYN.svg); stack.insertBefore(SKY, STB.svg); stack.insertBefore(FLOCK, STB.svg); stack.insertBefore(WX, MUL.svg);
  const SVGS = [STB.svg, fig, LIVE.svg, STF.svg, DYN.svg, MUL.svg, SCR.svg];

  /* ---------- framing and zoom (by viewBox: the drawing is re-painted sharp, never scaled) ---------- */
  let VB0 = [0, 0, 100, 100], VB = VB0, inkSet = false;
  const sfa = () => (window.Kit && Kit.safe) ? Kit.safe() : { top: 0, bottom: 0 };
  function frame(){
    const y = YAW, p = PITCH; setCam(YAW_H, PITCH_H); OX = 0; OY = 0;
    const B = HD.BOUNDS, pts = [];
    for (const x of [B[0][0], B[1][0]]) for (const yy of [B[0][1], B[1][1]]) for (const z of [B[0][2], B[1][2]]) pts.push(P(x, yy, z));
    setCam(y, p);
    const xs = pts.map(t => t[0]), ys = pts.map(t => t[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), bw = Math.max(...xs) - x0, bh = Math.max(...ys) - y0;
    const cw = stack.clientWidth || innerWidth, ch = stack.clientHeight || innerHeight, sf = sfa();
    const top = sf.top + (cw < 560 ? 72 : 76), bot = sf.bottom + (cw < 560 ? 30 : 16), side = 6;
    const s = Math.min((cw - 2*side)/bw, (ch - top - bot)/bh);
    VB0 = [x0 - (cw/s - bw)/2, y0 - top/s - ((ch - top - bot)/s - bh)/2, cw/s, ch/s];
    if (!inkSet){ inkSet = true; INK_K = 1; }
    SFRAG.clear(); lastSt = '';
    document.getElementById('fdefs').innerHTML = filterFor(INK_K);
    setVB(VB0); bakeNoise(fig);
    lastS = ''; FRAG.clear();
  }
  function setVB(b){ VB = b; const s = b.map(v => v.toFixed(2)).join(' '); SVGS.forEach(x => x.setAttribute('viewBox', s)); placeOverlays(); if (typeof emit === 'function') emit('camera', { vb: b }); }
  const ppu = () => (stack.clientWidth || innerWidth)/VB[2];
  const ppu0 = () => (stack.clientWidth || innerWidth)/VB0[2];
  const toPx = p3 => { const t = P(...p3), k = ppu(); return [(t[0] - VB[0])*k, (t[1] - VB[1])*k]; };
  const toVB = (cx, cy) => { const k = ppu(); return [VB[0] + cx/k, VB[1] + cy/k]; };
  const zoomed = () => VB[2] < VB0[2]*.97;
  let zoomRoom = null, zid = 0, zoomBusy = false;
  function zoomTo(p3, k, ms, done){
    let to = VB0.slice();
    if (p3 && k > 1){ const t = p3.length === 2 ? p3 : P(...p3), w = VB0[2]/k, h = VB0[3]/k;
      const mx = VB0[2]*.18, my = VB0[3]*.12;      // the street goes on past the frame, so a zoom may look a little beyond it
      to = [Math.max(VB0[0] - mx, Math.min(VB0[0] + VB0[2] + mx - w, t[0] - w/2)), Math.max(VB0[1] - my, Math.min(VB0[1] + VB0[3] + my - h, t[1] - h*.5)), w, h]; }
    if (window.Kit && Kit.reducedMotion) ms = 0;
    const from = VB.slice(), t0 = performance.now(), id = ++zid; zoomBusy = true;
    (function step(){ if (id !== zid) return; const u = ms ? Math.min(1, (performance.now() - t0)/ms) : 1, e = u < .5 ? 2*u*u : 1 - Math.pow(-2*u + 2, 2)/2;
      setVB(from.map((v, i) => v + (to[i] - v)*e)); if (u < 1) requestAnimationFrame(step); else { zoomBusy = false; hud(); if (done) done(); } })();
  }
  // zoom into a room: about 2x on a phone (a portrait phone already shows the house's full width), centred on the tap
  function roomView(id, at){
    const B = HD.BOX(id), pts = [];
    for (const x of [B[0][0], B[1][0]]) for (const y of [B[0][1], B[1][1]]) for (const z of [B[0][2], B[1][2]]) pts.push(P(x, y, z));
    const xs = pts.map(t => t[0]), ys = pts.map(t => t[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const sf = sfa(), padT = (sf.top + 70)/ppu0(), padB = (sf.bottom + 24)/ppu0();
    const k = Math.max(1.9, Math.min(3.2, VB0[2]/((x1 - x0)*1.08), (VB0[3] - padT - padB)/((y1 - y0)*1.1)));
    const w = VB0[2]/k, h = (VB0[3] - padT - padB)/k, c = at || P(...HD.FOCUS[id]);
    const cl = (v, a, b2, span) => b2 - a <= span ? (a + b2)/2 : Math.max(a + span/2, Math.min(b2 - span/2, v));
    return { k, c: [cl(c[0], x0, x1, w), cl(c[1], y0, y1, h) - (padT - padB)/(2*k)] };
  }
  function goRoom(id, ms = 650, at){ if (!ROOMS[id]) return; zoomRoom = id; const v = roomView(id, at); zoomTo(v.c, v.k, ms, () => { render(); }); play('h_zoom'); streetFade(); setTimeout(render, 30); }
  function goOut(ms = 650){ zoomRoom = null; zoomTo(null, 1, ms, () => render()); if (typeof easeFront === 'function') easeFront(0); streetFade(); setTimeout(render, 30); }

  /* ---------- what the house looks like right now ---------- */
  const NOW = () => HL.now();
  const washerDone = () => !!(HL.todayLog().washer || []).length;
  const isDone = it => !!S.done[it.id];
  const live = (it, d) => it.at <= d && (!it.until || d < it.until);
  function dryItems(d){
    if (d < DAY.ev.dry) return [];
    return DAY.items.concat(CUR.fx || []).filter(it => it.kind === 'wet' && isDone(it)).map(it => ({ id: 'dry.' + it.slot, kind: 'dry', g: it.g, col: it.col, fl: -1, room: 'yard', slot: it.slot, hang: true,
      pos: [HD.LINE.x + 1, HD.LINE.slots[it.slot], HD.LINE.z - 14], at: DAY.ev.dry, target: 'cleanBasket' }));
  }
  function allItems(d){ if (!CUR.fx){ CUR.fxAll = HL.fxItems(d); CUR.fx = CUR.fxAll.filter(it => !it.marker); } return DAY.items.concat(CUR.fx, dryItems(d), surpriseItems()); }
  let SUR = null;
  function surpriseItems(){
    const e = SUR && SUR.effect; if (!e) return [];
    const out = [], z = HD.ZF;
    if (e.sock) out.push({ id: 'sur.sock', kind: 'sock', fl: 0, room: 'living', pos: [128, 300, z[0]], rot: .6, col: '#e98fb0', at: DAY.ev.wake, target: 'basket' });
    if (e.book) out.push({ id: 'sur.book', kind: 'book', fl: 0, room: 'hall', pos: [60, 60, z[0] + .6], rot: .3, col: '#3f9c92', at: DAY.ev.wake, target: 'shelfB' });
    return out;
  }
  function prayerState(){ const d = NOW(), c = HL.current(d); return { cur: c, now: !!(c && !HL.prayed(c.name, c.day)), tahajjud: HL.tahajjudNow(d) }; }
  let PS = prayerState();
  let CUR = {};          // things that only change between the 20 s checks (or after an action): family plan, garden, prayer garden
  function mealNow(d){ for (const M of HL.MEALS){ const e = DAY.ev[M.id]; if (d >= e.set && d < e.clear) return M; } return null; }
  function view(){
    const d = NOW(), ev = DAY.ev, items = allItems(d);
    const mess = items.filter(it => live(it, d) && !isDone(it) && it.id !== held && !(scrub && it.target === 'scrub:' + scrub.kind));
    const doneOf = tg => items.filter(it => isDone(it) && it.target === tg && it.at <= d).length;
    const v = { mess, bed: S.bed || !(ev.wake <= d), sky: LIGHT.sky, night: LIGHT.night, lamps: LIGHT.night, decor: DEC.placed || {}, prayNow: PS.now };
    v.counts = { rack: doneOf('rack'), shelfB: doneOf('shelfB'), toychest: doneOf('toychest'), shoerack: doneOf('shoerack'), recycle: doneOf('recycle'), general: doneOf('general'), desk: doneOf('desk') };
    // the table: settings put out, or the family eating
    const M = mealNow(d); v.table = [];
    if (M){ const e = ev[M.id], inMeal = d >= e.meal;
      for (let i = 0; i < 4; i++){ const it = DAY.items.find(x => x.id === M.id + '.set' + i); if (inMeal || (it && isDone(it))) v.table.push({ seat: i, kind: i < 2 ? 'plate' : 'cup', col: '#5b8fd6', dirty: inMeal && d > e.meal.getTime() + 15*60000 }); } }
    v.fruit = !M;
    const ART = [[222, 86, '#e98fb0'], [204, 50, '#5b8fd6'], [222, 50, '#f2c230']]; v.fridgeArt = ART.slice(0, Math.min(3, doneOf('fridge')));
    // the sister's bed, if the family module says she left it unmade
    v.bedS = S.bedS || !(CUR.fxAll || []).some(it => it.kind === 'bedS' && it.at <= d);
    // the school bag
    const k = DAY.kind; v.bag = 'peg'; v.packed = [];
    if (k.school && ev.pack){ const P2 = DAY.items.filter(it => it.target === 'bag'), packed = P2.filter(isDone).map(it => it.kind);
      if (d >= ev.pack.from && d < ev.pack.to) { v.bag = packed.length >= P2.length ? 'peg' : 'open'; v.packed = packed; }
      else if (d >= ev.pack.to && d < ev.home) v.bag = 'gone';
      else if (d >= ev.home){ const b = DAY.items.find(it => it.id === 'school.bag'); v.bag = b && isDone(b) ? 'peg' : 'gone'; } }
    // washing: the line, the folded basket
    v.line = [null, null, null];
    for (const it of DAY.items.concat(CUR.fx || [])) if (it.kind === 'wet' && isDone(it)){ const dry = d >= ev.dry, dI = items.find(x => x.id === 'dry.' + it.slot);
      if (!dry) v.line[it.slot] = { g: it.g, col: it.col, wet: true }; else if (dI && !isDone(dI) && dI.id !== held) v.line[it.slot] = { g: it.g, col: it.col, wet: false }; }
    v.folded = doneOf('cleanBasket');
    v.basket = { dirty: ev.laundry <= d && !washerDone(), clean: washerDone(), socks: doneOf('basket') };
    v.washer = { clean: washerDone() };
    v.tools = { can: tool !== 'can', cloth: tool !== 'cloth', broom: tool !== 'broom' };
    v.bins = [S.bins[0] || tool === 'bin0', S.bins[1] || tool === 'bin1'].map((b, i) => S.bins[i]);
    v.binsHidden = [tool === 'bin0', tool === 'bin1'];
    v.plots = CUR.plots || (CUR.plots = HL.garden(d));
    v.swing = swingT >= 0 ? 'dyn' : 0; v.ballAt = S.ballAt || A.ball; v.ballHeld = !!ballAnim; v.castle = !!S.castle; v.bird = bird || !!(SUR && SUR.effect && SUR.effect.bird);
    v.food = SUR && SUR.effect && SUR.effect.food; v.pgarden = CUR.pg || (CUR.pg = prayerGardenRows());
    // the street and the family are drawn only when a new static drawing is built (not on every frame)
    if (!CUR.fam) famRefresh(d); famKey = JSON.stringify(CUR.fam); v.fam = CUR.fam.length ? famFn(CUR.fam) : null;
    streetKey = (window.HStreet ? 'st' : '') + LIGHT.key + (DAY.kind.weather || '');
    v.ghostAbove = zoomRoom && ROOMS[zoomRoom] && (ROOMS[zoomRoom].fl === 0 || ROOMS[zoomRoom].fl === 1) && zoomed() ? ROOMS[zoomRoom].fl : null;
    v.sig = [v.ghostAbove,mess.map(m => m.id).join(','), v.bed, v.sky, v.night, JSON.stringify(v.counts), v.table.map(t => t.seat + (t.dirty ? 'd' : '')).join(''), v.bag, v.packed.join(','), JSON.stringify(v.line), v.folded,
      JSON.stringify(v.basket), JSON.stringify(v.tools), v.bins.join(), v.binsHidden.join(), v.bedS, v.fridgeArt.length, JSON.stringify(v.plots), v.swing, v.ballAt.join(), v.ballHeld, v.castle, v.bird, v.fruit,
      Object.keys(v.decor).filter(x => v.decor[x]).join(','), v.prayNow, famKey, streetKey].join('|');
    return v;
  }
  function rooms(v){
    v = v || view();
    const d = NOW(), R = {};
    for (const id of RIDS) R[id] = { total: 0, pending: 0 };
    for (const it of allItems(d)) if (it.at <= d && R[it.room] && (live(it, d) || isDone(it))){ R[it.room].total++; if (!isDone(it) && live(it, d)) R[it.room].pending++; }
    if (DAY.ev.wake <= d){ R.myroom.total++; if (!S.bed) R.myroom.pending++; }
    if (DAY.ev.laundry <= d){ R.laundry.total++; if (!washerDone()) R.laundry.pending++; }
    for (const id in v.plots){ const p = v.plots[id]; if (p.thirsty){ R.yard.total++; R.yard.pending++; } }
    const tw = teethDue(d); if (tw){ R.bath.total++; R.bath.pending++; }
    if (DAY.ev.bins && d >= DAY.ev.bins) for (let i = 0; i < 2; i++){ R.yard.total++; if (!S.bins[i]) R.yard.pending++; }
    for (const id in R){ const r = R[id]; r.tidy = r.pending ? Math.max(0, 1 - r.pending/Math.max(3, r.total)) : 1; }
    return R;
  }
  const teethDue = d => { const a = DAY.ev.teethAm, b = DAY.ev.teethPm; return d >= a.from && d < a.to && !S.teeth.am ? 'am' : d >= b.from && d < b.to && !S.teeth.pm ? 'pm' : ''; };
  function prayerGardenRows(){
    const H = DAYS(); const rows = H && H.prayerGarden ? safe(() => H.prayerGarden(7), null) : null;
    if (rows) return rows.map(r => HL.FIVE.map(p => r[p] ? (String(r[p]).indexOf('sunnah') >= 0 ? 2 : 1) : 0));
    const L = HL.read('hh.log', {}), out = [];
    for (let i = 6; i >= 0; i--){ const d = new Date(NOW().getTime() - i*864e5), day = (L[HL.dayKey(d)] || {}).salah || []; out.push(HL.FIVE.map(p => day.some(e => (e.p || e.prayer) === p) ? 1 : 0)); }
    return out;
  }

  /* ---------- the family (house/family.js) ----------
     The house tells the family module where things are (FAMILY.setObjects: beds, desk, cot, stove, stools) and how to
     walk (FAMILY.setNav: a lane along the open front of each floor, the stairs against the right wall, the back door).
     People standing or sitting still are part of the static drawing (they sort with the furniture); people walking are
     drawn on DYN about 11 times a second, masked under the floor above, and only while someone walks. */
  let famKey = '', walkT = 0, HIDE = null;
  function famSetup(){
    const F = window.FAMILY; if (!F || !F.setObjects) return;
    const Z = HD.ZF, tb = [87, 198], toT = (x, y) => Math.round(Math.atan2(tb[1] - y, tb[0] - x)*180/Math.PI);
    safe(() => F.setObjects({
      cook: { xy: [58, 150], face: 180 }, snack: { xy: [58, 214], face: 180 },
      'seat-abu': { xy: [72, 150], face: toT(72, 150) }, 'seat-ummi': { xy: [100, 150], face: toT(100, 150) }, 'seat-sister': { xy: [72, 246], face: toT(72, 246) }, 'seat-toddler': { xy: [100, 246], face: toT(100, 246) },
      cushions: { xy: [124, 322], face: 180 }, books: { xy: [84, 362], face: -90 }, blocks: { xy: [120, 350], face: 210 },
      toys: { xy: [90, 124], face: 20 }, window: { xy: [60, 120], face: 180 }, shoes: { xy: [70, 96], face: 180 }, draw: { xy: [50, 200], face: 180 },
      'bed-abu': { xy: [62, 206], z: 31 }, 'bed-ummi': { xy: [62, 244], z: 31 }, 'bed-sister': { xy: [54, 261], z: 31 }, cot: { xy: [28, 74], z: 27 },
      veg: { xy: [42, 494], face: 0 }, door: { xy: [16, 61], face: 180 }, wudu: { xy: [44, 68], face: 180 }, washer: { xy: [84, 403], face: 180 }, quran: { xy: [96, 330], face: 180 },
    }), null);
    // the walking graph: lanes at x = 112, the flights (bottom at the front x = 134, top at the back x = 26, against y = 0)
    const nodes = {}, edges = [], entry = {}, LX = 112;
    for (let fl = 0; fl < 3; fl++){
      const ids = RIDS.filter(id => ROOMS[id].fl === fl).sort((a2, b2) => ROOMS[a2].y0 - ROOMS[b2].y0), ys = new Set([48]);
      for (const id of ids){ const r = ROOMS[id]; ys.add(Math.max(48, (r.y0 + r.y1)/2)); if (r.y0 > 0) ys.add(Math.max(48, r.y0)); }
      const list = [...ys].sort((p2, q2) => p2 - q2);
      list.forEach((y, i) => { nodes['l' + fl + '_' + i] = [LX, y, Z[fl]]; if (i) edges.push(['l' + fl + '_' + (i - 1), 'l' + fl + '_' + i]); });
      for (const id of ids){ const r = ROOMS[id]; entry[id] = 'l' + fl + '_' + list.indexOf(Math.max(48, (r.y0 + r.y1)/2)); }
      if (fl < 2){ nodes['sa' + fl] = [128, 44, Z[fl]]; nodes['sb' + fl] = [134, 17, Z[fl]]; nodes['st' + fl] = [26, 17, Z[fl + 1]]; nodes['sx' + fl] = [24, 44, Z[fl + 1]];
        edges.push(['l' + fl + '_0', 'sa' + fl], ['sa' + fl, 'sb' + fl], ['sb' + fl, 'st' + fl, 'stairs'], ['st' + fl, 'sx' + fl], ['sx' + fl, 'l' + (fl + 1) + '_0']); }
    }
    const lastG = Object.keys(nodes).filter(n => n.startsWith('l0_')).sort((p2, q2) => nodes[p2][1] - nodes[q2][1]).pop();
    nodes.back = [116, 434, Z[0]]; nodes.yard = [118, 470, 6]; edges.push([lastG, 'back'], ['back', 'yard']); entry.yard = 'yard';
    safe(() => F.setNav({ nodes, edges, entry }), null);
    safe(() => F.setSkin && F.setSkin(HH.hand().skin), null);
  }
  function famPlan(d){
    const F = window.FAMILY; if (!F || !F.draw || !F.state) return [];
    const st = safe(() => F.state(d, famCtx()), null); if (!st || typeof st !== 'object') return [];
    const out = [];
    for (const name of F.NAMES || ['abu', 'ummi', 'sister', 'toddler']){ const p = st[name]; if (!p || !p.at || p.visible === false || p.away) continue;
      if (name === 'toddler' && HIDE) continue;
      if (LV && p.live !== false) continue;                         // awake: the live layer draws them
      out.push({ name, pose: p.pose || 'stand', at: p.at.map(v => Math.round(v*2)/2), facing: Math.round(p.facing || 0), frame: p.pose === 'walk' ? p.frame || 0 : 0, opts: p.opts || undefined, walk: p.pose === 'walk', room: p.room }); }
    if (HIDE && !HIDE.found) out.push({ name: 'toddler', pose: HIDE.hs.pose || 'play', at: HIDE.hs.at, facing: HIDE.hs.facing || 0, frame: 0, room: HIDE.hs.room });
    return out;
  }
  function famCtx(){ return { HD, now: NOW(), kind: DAY.kind, times: HL.times(NOW()), meal: mealNow(NOW()), house: S, done: S.req || {}, catFills: S.catFills || [], feederFills: S.feederFills || [] }; }
  // the family and the pets, alive (house/family.js FAMILY.live with house/pets.js): everyone breathes, looks about,
  // walks, plays, about 3.5-7 drawings a second from cached frames; frozen while the house turns
  let LV = null, lvFreezeT = 0, STATE = null, STATE_T = 0;
  function liveStart(){
    const F = window.FAMILY; if (!F || !F.live || LV) return;
    if (window.PETS && PETS.setSpots){ const Z = HD.ZF; safe(() => PETS.setSpots({ bowl: [58, 254, Z[0]], sillNursery: [7, 123, Z[2] + 70], sill: [7, 345, Z[0] + 58] }), null); }
    LV = safe(() => F.live({ g: LIVE.g, now: NOW, ctx: famCtx, mask: fl => `url(#hm${fl})`, view: () => VB,
      skip: id => (HIDE && id === 'toddler') || (FAM_ANIM && id === FAM_ANIM.name), sources: [F, window.PETS].filter(Boolean) }), null);
    if (LV) LV.start();
  }
  function liveTurn(){ if (!LV) return; LV.freeze(true); LV.sync(); clearTimeout(lvFreezeT); lvFreezeT = setTimeout(() => LV && LV.freeze(false), 260); }
  // who is where (for hearts, tasks and taps), refreshed at most every 2 s
  function famState(){ const t = performance.now(); if (!STATE || t - STATE_T > 2000){ STATE = safe(() => window.FAMILY.state(NOW(), famCtx()), null); STATE_T = t; } return STATE; }
  const flOf = at => at[2] < HD.ZF[0] - 1 ? -1 : at[2] >= HD.ZF[2] - 2 ? 2 : at[2] >= HD.ZF[1] - 2 ? 1 : 0;
  function famFn(plan){
    return fl => { const F = window.FAMILY, out = []; for (const p of plan){ const items = safe(() => F.draw(p.name, p.pose, p.at, p.facing, p.frame, p.opts), []);
      for (const it of items){ const f2 = it.fl == null ? flOf(p.at) : it.fl; if (f2 === fl) out.push({ box: it.box, svg: it.svg }); } }
      return out; };
  }
  function famRefresh(d){
    const pl = famPlan(d); CUR.fam = pl.filter(p => !p.walk); CUR.walk = pl.filter(p => p.walk);
    if (CUR.walk.length && !walkT) walkT = setTimeout(walkTick, 90);
  }
  function walkTick(){
    walkT = 0; if (document.hidden) return;
    const pl = famPlan(NOW()), still = pl.filter(p => !p.walk);
    CUR.walk = pl.filter(p => p.walk);
    if (JSON.stringify(still) !== famKey){ CUR.fam = still; render(); }     // someone arrived or set off: the house picture changes
    else { const dd = dynScene(); if (dd !== lastD){ lastD = dd; DYN.g.innerHTML = dd; } }
    if (CUR.walk.length) walkT = setTimeout(walkTick, 90);
  }
  function walkersSvg(){
    const F = window.FAMILY; if (!F || !CUR.walk || !CUR.walk.length) return '';
    const by = {}, all = [];
    for (const p of CUR.walk) for (const it of safe(() => F.draw(p.name, p.pose, p.at, p.facing, p.frame, p.opts), [])){ const fl = it.fl == null ? flOf(p.at) : it.fl; (by[fl] = by[fl] || []).push(it); all.push(it); }
    let s = F.pad ? F.pad(all) : '';
    for (const fl in by) s += `<g${+fl === 0 || +fl === 1 ? ` mask="url(#hm${fl})"` : ''}>${byDepth(by[fl])}</g>`;
    return s;
  }

  /* ---------- the street around the lot (house/street.js): ground first, then what is behind the lot, the house,
     then what is in front; its sky sits under the house, its lamps glow in the light layer, its rain falls on top ---------- */
  let streetKey = '';
  const LOTO = { x0: HD.LOT[0][0], y0: HD.LOT[0][1], x1: HD.LOT[1][0], y1: HD.LOT[1][1] };
  const streetOpts = () => ({ lot: LOTO, light: LIGHT, weather: DAY.kind.weather || 'sun', t: NOW(), times: HL.times(NOW()), season: season(NOW()) });
  function season(d){ const m = d.getMonth(), lat = safe(() => HHPrayer.settings().lat, 30), n = lat < 0 ? (m + 6) % 12 : m; return [11, 0, 1].indexOf(n) >= 0 ? 'winter' : [2, 3, 4].indexOf(n) >= 0 ? 'spring' : [5, 6, 7].indexOf(n) >= 0 ? 'summer' : 'autumn'; }
  function street(){
    const H = window.HStreet; if (!H || !H.items) return null;
    const items = safe(() => H.items(streetOpts()), []); if (!items || !items.length) return null;
    const ground = items.filter(i => i.ground), rest = items.filter(i => !i.ground);
    return { back: ground.map(i => i.svg).join('') + byDepth(rest.filter(i => i.side === 'back')), front: byDepth(rest.filter(i => i.side !== 'back')) };
  }
  const SFRAG = new Map(); let sfragSig = '';
  function streetFrag(){
    if (!window.HStreet) return null;
    if (streetKey !== sfragSig){ SFRAG.clear(); sfragSig = streetKey; }
    const k = camKey(); let r = SFRAG.get(k);
    if (r) SFRAG.delete(k);
    else { const st = street() || { back: '', front: '' }; _clipN = 7000; const b = document.createElementNS(NS, 'g'), fr = document.createElementNS(NS, 'g');
      b.innerHTML = inkScale(st.back); fr.innerHTML = inkScale(st.front); r = { b, f: fr }; }
    SFRAG.set(k, r); while (SFRAG.size > CAP) SFRAG.delete(SFRAG.keys().next().value);
    return r;
  }
  let lastSt = '', stRaf = 0;
  function renderStreet(now){
    const k = camKey() + '|' + streetKey; if (k === lastSt) return;
    const go2 = () => { stRaf = 0; const k2 = camKey() + '|' + streetKey; if (k2 === lastSt) return; lastSt = k2; const r = streetFrag(); if (!r) return; STB.g.replaceChildren(r.b); STF.g.replaceChildren(r.f); };
    if (now) go2(); else if (!stRaf) stRaf = requestAnimationFrame(go2);
  }
  let skyKey = '';
  function skyAndWeather(){
    const H = window.HStreet; if (!H) return;
    const w = stack.clientWidth || innerWidth, h = stack.clientHeight || innerHeight, k = [w, h, LIGHT.key, LIGHT.a.toFixed(2), DAY.kind.weather].join('|');
    if (k === skyKey) return; skyKey = k;
    const o = Object.assign(streetOpts(), { w, h });
    if (H.sky) SKY.innerHTML = safe(() => H.sky(o), '');
    if (H.weather) WX.innerHTML = safe(() => H.weather(o), '');
  }

  /* ---------- drawing: turning swaps cached static drawings; nothing else rebuilds per frame ---------- */
  const FRAG = new Map(), CAP = 12; let fragSig = '';   // at most 12 drawings (~2k nodes each), the nearest angles kept (LRU)
  const camKey = () => YAW.toFixed(2) + '|' + PITCH.toFixed(2);
  function buildFrag(v){ _clipN = 0; const g = document.createElementNS(NS, 'g'); g.innerHTML = inkScale(HD.scene(v)); return g; }
  function staticFrag(v){
    if (v.sig !== fragSig){ FRAG.clear(); fragSig = v.sig; }
    const k = camKey(); let g = FRAG.get(k);
    if (g) FRAG.delete(k); else g = buildFrag(v);
    FRAG.set(k, g);
    while (FRAG.size > CAP) FRAG.delete(FRAG.keys().next().value);      // old Android WebViews dislike many big detached SVGs
    return g;
  }
  let warmT = 0;
  const idle = window.requestIdleCallback || (fn => setTimeout(() => fn({ timeRemaining: () => 8 }), 50));
  function warmSoon(){
    clearTimeout(warmT);
    warmT = setTimeout(function warm(){
      if (G || zoomBusy || Math.abs(PITCH - PITCH_H) > .01) return;
      const cur = view(); if (cur.sig !== fragSig) return;
      const y0 = Math.round(YAW), need = [];
      // built lazily in idle time, nearest first; the cache (12) holds the whole 8° grid of 11 angles plus the settled one
      const g0 = YAW_H + Math.round((YAW - YAW_H)/STEP)*STEP;
      for (const dd of [0, STEP, -STEP, 2*STEP, -2*STEP, 3*STEP, -3*STEP, 4*STEP, -4*STEP, 5*STEP, -5*STEP, 6*STEP, -6*STEP]){ const y = g0 + dd; if (Math.abs(y - YAW_H) <= LIM && !FRAG.has(y.toFixed(2) + '|' + PITCH_H.toFixed(2))) need.push(y); }
      if (!need.length) return;
      idle(() => { if (G || cur.sig !== fragSig) return; const ky = YAW, kp = PITCH;
        setCam(need[0], PITCH_H); FRAG.set(camKey(), buildFrag(cur)); if (window.HStreet && !SFRAG.has(camKey())) streetFrag(); setCam(ky, kp);
        const k0 = camKey(), g0 = FRAG.get(k0); if (g0){ FRAG.delete(k0); FRAG.set(k0, g0); }      // keep the current one newest
        warmT = setTimeout(warm, 0); });
    }, 1400);
  }
  function turnTo(y, step = STEP){ y = YAW_H + Math.max(-LIM, Math.min(LIM, Math.round((y - YAW_H)/step)*step)); if (y !== YAW || PITCH !== PITCH_H){ setCam(y, PITCH_H); liveTurn(); render(); emit('camera', { yaw: YAW }); } }
  // street parts in front of the lot fade when the house is turned far, or while looking into a room
  function streetFade(){ const f = zoomRoom || Math.abs(YAW - YAW_H) > 28; STF.svg.style.opacity = f ? '.3' : ''; }
  let lastS = '', lastD = '', lastL = '', lastR = '';
  function render(){
    const v = view(), cam = camKey(), sig = cam + '|' + v.sig;
    if (sig !== lastS){ if (lastS.slice(lastS.indexOf('|', lastS.indexOf('|') + 1)) !== sig.slice(sig.indexOf('|', sig.indexOf('|') + 1))) setTimeout(() => emit('change', {}), 0); lastS = sig; art.replaceChildren(staticFrag(v)); placeOverlays(); if (!G || G.mode !== 'orbit') hud(); warmSoon(); }
    renderStreet(!(G && G.mode === 'orbit'));
    const dd = dynScene(); if (dd !== lastD){ lastD = dd; DYN.g.innerHTML = dd; }
    const R = rooms(v), rk = JSON.stringify(R), lk = LIGHT.key + LIGHT.a.toFixed(2) + rk + cam + (DEC.placed.lamp ? 'L' : '');
    if (rk !== lastR){ lastR = rk; sparkles(R); }
    // while the house is being turned the soft light waits for the finger to lift (the house itself stays sharp)
    if (lk !== lastL && !(G && G.mode === 'orbit')){ lastL = lk; drawLight(R); }
  }
  ui.render = render;
  function dynScene(){
    _clipN = 9000;
    let s = HD.clockHands(NOW());
    if (pour){ let w = ''; for (let i = 0; i < 8; i++){ const u = (pour.t*1.8 + i/8) % 1, x = pour.at[0] - 4 + (i % 3)*3, y = pour.at[1] - 10 + (i % 4)*2.4, z = pour.at[2] + 24 - u*24;
        w += `M${P(x, y, z).map(f).join(' ')}L${P(x, y, z - 4).map(f).join(' ')}`; } s += `<path d="${w}" fill="none" stroke="#5b9fe0" stroke-width="1.8" stroke-linecap="round"/>`; }
    if (swingT >= 0){ const sxm = 158, top = 102, sz = 32, a = Math.sin(swingT*4.2)*Math.exp(-swingT*.45)*24;
      s += H3.line3([[sxm, 560, top], [sxm + a, 560, sz]], INK, 1) + H3.line3([[sxm, 578, top], [sxm + a, 578, sz]], INK, 1) + H3.bx(sxm + a - 5, 558, sz - 2, sxm + a + 5, 580, sz, matOf('#e8574a'), .9); }
    if (ballAnim){ const u = Math.min(1, ballAnim.t/.9), p = ballAnim.from.map((v, i) => v + (ballAnim.to[i] - v)*u), h = Math.abs(Math.sin(u*Math.PI*2))*(1 - u)*26;
      s += H3.ball([p[0], p[1], 14 + h], 8, '#ef6a4c'); }
    s += walkersSvg() + famAnimSvg();
    if (scrub) for (const sp of scrub.spots) if (sp.p < 1) s += `<g opacity="${(1 - sp.p).toFixed(2)}">${HD.messPart(sp.it).svg}</g>`;
    return inkScale(s);
  }
  function drawLight(R){
    const L = LIGHT, big = `x="${f(VB0[0] - VB0[2])}" y="${f(VB0[1] - VB0[3])}" width="${f(VB0[2]*3)}" height="${f(VB0[3]*3)}"`, night = L.lamps > .5;
    let defs = '', mul = '', scr = '';
    for (const fl of [0, 1]) defs += `<mask id="hm${fl}"><rect ${big} fill="#fff"/><path d="${HD.abovePath(fl)}" fill="#000"/></mask>`;
    const out = mix('#ffffff', L.tint, L.a), inn = mix('#ffffff', L.tint, L.a*(night ? .3 : .55));
    mul += `<rect ${big} fill="${out}"/>`;
    const Z = HD.ZF, lampAt = { kitchen: [[88, 198, Z[1] - 52]], living: [[114, 360, Z[1] - 40]], laundry: [[60, 410, Z[0] + 110]], hall: [[80, 60, Z[0] + 120]], bath: [[30, 80, Z[1] + 120]],
      parents: [[12, 168, Z[1] + 50], [12, 284, Z[1] + 50]], prayer: [[80, 380, Z[2] - 70]], nursery: [[60, 100, Z[2] + 110]], sister: [[17, 187, Z[2] + 60]], myroom: [[60, 380, Z[2] + 120]].concat(DEC.placed && DEC.placed.lamp ? [A.lamp] : []) };
    let gi = 0;
    for (const id of RIDS){ const r = ROOMS[id]; if (r.fl < 0) continue;
      const t = R[id].tidy, mk = r.fl === 2 ? '' : ` mask="url(#hm${r.fl})"`, d = HD.roomPath(id);
      mul += `<path d="${d}" fill="${mix(inn, '#767b98', .24*(1 - t))}"${mk}/>`;
      let inner = `<path d="${d}" fill="${night ? '#ffae45' : '#ffd38a'}" opacity="${((night ? .12 : .025) + (night ? .1 : .06)*t).toFixed(3)}"/>`;
      if (L.lamps > .3) for (const p of lampAt[id] || []){ const c = P(...p); gi++;
        defs += `<radialGradient id="hg${gi}"><stop offset="0" stop-color="#ffcf7a" stop-opacity="${(.7*L.lamps*(.65 + .35*t)).toFixed(2)}"/><stop offset=".55" stop-color="#ffb84d" stop-opacity="${(.25*L.lamps).toFixed(2)}"/><stop offset="1" stop-color="#ffb84d" stop-opacity="0"/></radialGradient>`;
        inner += `<circle cx="${f(c[0])}" cy="${f(c[1])}" r="110" fill="url(#hg${gi})"/>`; }
      scr += `<g${mk}><clipPath id="hc${id}"><path d="${d}"/></clipPath><g clip-path="url(#hc${id})">${inner}</g></g>`;
    }
    const sg = window.HStreet && HStreet.glow ? safe(() => HStreet.glow(streetOpts()), '') : '';
    MUL.g.innerHTML = `<defs>${defs}</defs>` + mul; SCR.g.innerHTML = scr + sg;
  }

  /* ---------- overlays: sparkles, glows, bubbles, the hand (HTML: the compositor animates them) ---------- */
  const OVL = [];
  function ovAdd(cls, p3, html, style){ const e = document.createElement('i'); e.className = cls; if (html) e.innerHTML = html; if (style) e.setAttribute('style', style); OV.appendChild(e); const o = { el: e, p3 }; OVL.push(o); posOv(o); return o; }
  function ovDel(o){ if (!o) return; o.el.remove(); const i = OVL.indexOf(o); if (i >= 0) OVL.splice(i, 1); }
  function posOv(o){ if (!o.p3) return; const [x, y] = toPx(o.p3); o.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; }
  function placeOverlays(){ OVL.forEach(posOv); }
  let SPK = [];
  function sparkles(R){
    SPK.forEach(ovDel); SPK = [];
    for (const id of RIDS){ if (R[id].tidy < 1 || !R[id].total && id !== 'prayer') continue; const c = HD.FOCUS[id];
      [[-30, -40, 50], [20, 30, 20], [-10, 40, 80]].forEach(([dx, dy, dz], i) => SPK.push(ovAdd('spk', [c[0] + dx, c[1] + dy, c[2] + dz - 30], `<b style="animation-delay:${(i*.9 + (c[1] % 7)*.13).toFixed(2)}s"></b>`))); }
  }
  function heart(p3){ const o = ovAdd('burst', p3, '<b style="--dx:0px;--dy:-46px;width:30px;height:30px;margin:-15px 0 0 -15px;clip-path:none;background:none;animation-duration:1.4s"><svg viewBox="0 0 24 24" width="30" height="30"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.2 0 3.6 1.2 5.2 3 1.6-1.8 3-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z" fill="#ef6a8a" stroke="#231e16" stroke-width="1.6"/></svg></b>'); setTimeout(() => ovDel(o), 1500); }
  function burst(p3, n = 10){
    for (let i = 0; i < n; i++){ const a = i/n*2*Math.PI + Math.random()*.4, r = 34 + Math.random()*30;
      const o = ovAdd('burst', p3, `<b style="--dx:${(Math.cos(a)*r).toFixed(0)}px;--dy:${(Math.sin(a)*r - 10).toFixed(0)}px;animation-delay:${(Math.random()*.12).toFixed(2)}s"></b>`);
      setTimeout(() => ovDel(o), 1200); }
    play('h_spark');
  }
  let PG = null, PB = null, TJ = null, TB = null, REQ = [];
  const SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h4l5-4v13l-5-4H4z" fill="#f4b829"/><path d="M16.5 9a4 4 0 0 1 0 6"/><path d="M19 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
  const STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.6 6.3 6.8.5-5.2 4.4 1.7 6.6L12 16.7l-5.9 3.6 1.7-6.6-5.2-4.4 6.8-.5z" fill="#fff3c4" stroke="#fff3c4" stroke-width="1" stroke-linejoin="round"/></svg>';
  const BRUSH = '<svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20 15 9" stroke-width="3.2"/><path d="M4 20 15 9" stroke="#5b8fd6" stroke-width="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.5" transform="rotate(45 17.5 6.5)" fill="#fbf6ea"/></svg>';
  // a bubble takes taps only on its core: a tap near its rim (where an item may lie underneath) goes to the house
  function bubble(p3, cls, html, label, fn){ const o = ovAdd('', p3, ''); const b = document.createElement('div'); b.className = cls; b.innerHTML = html;
    const core = document.createElement('button'); core.className = 'core'; core.setAttribute('aria-label', label); b.appendChild(core);
    core.addEventListener('click', e => { e.stopPropagation(); fn(); }); o.el.appendChild(b); return o; }
  function overlays(){
    [PG, PB, TJ, TB].forEach(ovDel); PG = PB = TJ = TB = null; REQ.forEach(ovDel); REQ = [];
    if (PS.now){ PG = ovAdd('glow', [80, 370, HD.ZF[1] + 20], '<b></b>', '--r:' + Math.round(Math.max(150, 150*ppu())) + 'px');
      PB = bubble(A.clock, 'hh-bub', SPEAKER, 'Adhan', () => go('adhan')); }
    if (PS.tahajjud && !HL.prayed('tahajjud')) TJ = bubble([0, 383, HD.ZF[2] + 130], 'hh-bub star', STAR, 'Tahajjud', () => go('tahajjud'));
    if (teethDue(NOW())) TB = bubble(A.brushes, 'hh-bub', BRUSH, 'Brush teeth', () => teeth());
    // the family's requests (house/family.js)
    const F = window.FAMILY;
    if (window.PETS && PETS.requests) for (const r of safe(() => PETS.requests(NOW(), famCtx()), []) || []) if (r.bubbleAt)
      REQ.push(bubble(r.bubbleAt, 'hh-req', r.iconSvg || HH.HOME_ICON, r.job || 'help', () => petTap(r.id)));
    if (F && F.requests){ const st = F.state ? safe(() => F.state(NOW(), famCtx()), null) : null, rq = safe(() => F.requests(NOW(), famCtx(), st), []); CUR.req = rq || [];
      // tapping a request says "I'll help": a heart, a pointer to the job, and the bubble goes
      const JOBT = { 'set-table': 'table', 'pack-schoolbag': 'bag', 'find-shoe': 'shoerack', 'fold-washing': 'cleanBasket', 'water-plants': 'can', 'carry-shopping': 'kitchen' };
      (rq || []).slice(0, 2).forEach(r => { if (!r.bubbleAt) return; REQ.push(bubble(r.bubbleAt, 'hh-req', r.iconSvg || (r.icon && /^</.test(r.icon) ? r.icon : HH.HOME_ICON), r.job || 'help', () => {
        S.req = S.req || {};
        if (r.job === 'play-blocks' || r.job === 'play-catch'){ playScene(r.job === 'play-blocks' ? 'blocks' : 'catch', r.who, () => { S.req[r.id] = 1; HL.save(S); overlays(); }, 'req.' + r.id); return; }
        if (r.job === 'play-hide'){ S.req[r.id] = 1; HL.save(S); overlays(); startHide('req.' + r.id); return; }
        play('h_spark'); S.req[r.id] = 1; HL.save(S); heart(r.bubbleAt); award(r.job || r.id); emit('done', { id: 'req.' + r.id, kind: 'request', who: r.who, at: r.bubbleAt, stars: 0 });
        const room = r.room || (st && st[r.who] && st[r.who].room); if (room && ROOMS[room]) goRoom(room, 650, P(...r.bubbleAt));
        if (JOBT[r.job] && A[JOBT[r.job]]) setTimeout(() => hint(JOBT[r.job]), 700); overlays(); })); }); }
  }
  const hand = document.createElement('i'); hand.className = 'hand'; OV.appendChild(hand);
  let handPose = '';
  function handAt(x, y, pose){ const hc = HH.hand(); const k = pose + hc.skin + hc.sleeve; hand.classList.toggle('grab', pose === 'grab');
    if (handPose !== k){ handPose = k; hand.innerHTML = HH.handSvg(hc.skin, hc.sleeve, pose); }
    hand.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; hand.classList.add('on'); }
  const handOff = () => hand.classList.remove('on', 'tap');
  function tapHand(x, y){ handAt(x, y, 'point'); hand.classList.remove('tap'); void hand.offsetWidth; hand.classList.add('tap'); clearTimeout(tapHand.t); tapHand.t = setTimeout(handOff, 520); }

  /* ---------- the HUD ---------- */
  const ICON = {
    house: '<svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.5V20h12V9.5" fill="#f4b829"/><path d="M10 20v-5h4v5" fill="#fbf6ea"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 2.8l2.7 5.9 6.4.7-4.8 4.4 1.3 6.4L12 17l-5.6 3.2 1.3-6.4L2.9 9.4l6.4-.7z" fill="#f4b829" stroke="#231e16" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    front: '<svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 7.5v9L12 21l8-4.5v-9z" fill="#fbf6ea"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/><path d="M2.5 14.5a10 10 0 0 0 4 4.5M21.5 14.5a10 10 0 0 1-4 4.5"/></svg>',
    gift: '<svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="1.8" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="1.5" fill="#fbf6ea"/><rect x="3" y="7" width="18" height="4" rx="1" fill="#e98fb0"/><path d="M12 7v13"/><path d="M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0"/></svg>',
  };
  const btn = (html, label, fn) => { const b = document.createElement('button'); b.className = 'hh-btn'; b.innerHTML = html; b.setAttribute('aria-label', label);
    b.addEventListener('click', e => { e.stopPropagation(); play('h_tap'); fn(); }); return b; };
  const top = document.createElement('div'); top.className = 'hh-hud top';
  const gL = document.createElement('div'), gR = document.createElement('div'); gL.className = gR.className = 'grp';
  const bOut = btn(ICON.house, 'Whole house', () => goOut());
  const dial = document.createElement('button'); dial.className = 'hh-dial'; dial.setAttribute('aria-label', 'Prayer times today'); dial.style.cssText = 'padding:0;cursor:pointer';
  dial.addEventListener('click', e => { e.stopPropagation(); play('h_tap'); chart(); });
  if (!window.HHChart) dial.style.pointerEvents = 'none';          // no control that does nothing: without the chart it only shows the sky
  const bStar = btn(ICON.star + '<span>0</span>', 'My room', () => tray(!trayOpen));
  const bSnd = btn('', 'Sound', () => { if (window.Kit && Kit.sfx) Kit.sfx.toggle(); sndIcon(); });
  function sndIcon(){ const m = !!(window.Kit && Kit.sfx && Kit.sfx.muted); bSnd.innerHTML = HH.icon(m ? 'mute' : 'sound'); }
  gL.appendChild(bOut); gR.appendChild(bStar); gR.appendChild(bSnd); top.appendChild(gL); top.appendChild(dial); top.appendChild(gR); document.body.appendChild(top);
  const bot = document.createElement('div'); bot.className = 'hh-hud bot';
  const bHand = btn('', 'My hand', () => HH.pickHand(() => { handPose = ''; handIcon(); famSkin(); render(); }));
  function handIcon(){ const h = HH.hand(); bHand.innerHTML = `<span style="display:block;width:30px;height:36px">${HH.handSvg(h.skin, h.sleeve, 'open')}</span>`; }
  // no "front view" button (children did not understand it): the house eases back to the front by itself
  let frontT = 0;
  function easeFront(delay){ clearTimeout(frontT); frontT = setTimeout(() => { if (G || Math.abs(YAW - YAW_H) < .5) return; const y0 = YAW, t0 = performance.now();
    (function step(){ if (G) return; const u = Math.min(1, (performance.now() - t0)/700), e = u < .5 ? 2*u*u : 1 - Math.pow(-2*u + 2, 2)/2; turnTo(y0 + (YAW_H - y0)*e); if (u < 1) requestAnimationFrame(step); else { turnTo(YAW_H, 1); hud(); streetFade(); } })(); }, delay); }
  bot.appendChild(bHand); document.body.appendChild(bot);
  sndIcon(); handIcon();
  let starHold = null, holdT = 0;      // while the guide flies a star, the counter keeps the old number until it lands
  function hud(){ bOut.hidden = !zoomed(); bStar.querySelector('span').textContent = starHold != null ? starHold : HL.stars().n; }
  function drawDial(){
    const d = NOW(), t = HL.times(d), W = 150, H = 56, hz = 41, cx = 75, rx = 52, ry = 29, sr = t.sunrise.getTime(), mg = t.maghrib.getTime(), ms = d.getTime();
    const arcAt = u => [cx - rx*Math.cos(u*Math.PI), hz - ry*Math.sin(u*Math.PI)], dayU = tt => (tt - sr)/(mg - sr);
    const marks = [['fajr', [cx - rx - 4, hz + 8]], ['dhuhr', arcAt(dayU(t.dhuhr.getTime()))], ['asr', arcAt(dayU(t.asr.getTime()))], ['maghrib', [cx + rx, hz]], ['isha', [cx + rx + 4, hz + 8]]];
    const day = ms >= sr && ms < mg;
    let s = `<rect width="${W}" height="${H}" fill="${LIGHT.sky}"/><path d="M0 ${hz}H${W}V${H}H0Z" fill="${day ? '#a9d47b' : '#55705a'}"/><path d="M0 ${hz}H${W}" stroke="#231e16" stroke-width="1.6"/>`;
    s += `<path d="M${cx - rx} ${hz}A${rx} ${ry} 0 0 1 ${cx + rx} ${hz}" fill="none" stroke="#231e16" stroke-width="1.2" stroke-dasharray="2 4" opacity=".55"/>`;
    for (const [n, [x, y]] of marks){ const done = HL.prayed(n), cur = PS.cur && PS.cur.name === n;
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${cur ? 5.5 : 4.2}" fill="${done ? '#5cae6a' : '#fbf6ea'}" stroke="#231e16" stroke-width="1.6"/>`;
      if (cur && !done) s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8.5" fill="none" stroke="#f4b829" stroke-width="2.4"/>`; }
    if (day){ const [x, y] = arcAt(dayU(ms)); s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="#f4b829" stroke="#231e16" stroke-width="1.6"/>`; }
    else { const nf = ms < sr ? sr : t.nextFajr.getTime() + (sr - t.fajr.getTime()), st = ms < sr ? HL.times(new Date(ms - 864e5)).maghrib.getTime() : mg, [x, y] = arcAt(1 - Math.max(0, Math.min(1, (ms - st)/(nf - st))));
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="#fff3c4" stroke="#231e16" stroke-width="1.6"/><circle cx="${(x + 3.4).toFixed(1)}" cy="${(y - 2.4).toFixed(1)}" r="5.6" fill="${LIGHT.sky}"/>`;
      if (PS.tahajjud) s += `<path d="M18 9l1.5 3.4 3.6.3-2.8 2.4.9 3.5-3.2-1.9-3.2 1.9.9-3.5-2.8-2.4 3.6-.3z" fill="#fff3c4"/>`; }
    dial.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${s}</svg>`;
  }
  // tap the sky dial: today's prayer chart (pray/chart.js), if it is there
  function chart(){
    if (!window.HHChart || !Kit.ui || !Kit.ui.sheet){ play('h_soft'); return; }
    const el = document.createElement('div'); el.className = 'hh-sheet-chart';
    try { HHChart.render(el, { date: NOW(), from: 'house' }); } catch (e) { return; }
    Kit.ui.sheet({ content: el, closeable: true });
  }

  /* ---------- picking what is under the finger ---------- */
  function pick(cx, cy){
    const k = ppu(), C = [], v = view(), d = NOW();
    const add = (hit, p3, rU) => { const [x, y] = toPx(p3), dd = Math.hypot(x - cx, y - cy), r = Math.max(26, rU*k); if (dd <= r) C.push(Object.assign({ d: dd/r }, hit)); };
    for (const it of v.mess){ const b = it.hang ? [[it.pos[0], it.pos[1] - 10, it.pos[2] - 10], [it.pos[0] + 1, it.pos[1] + 10, it.pos[2] + 10]] : HD.messBox(it), c = [(b[0][0] + b[1][0])/2, (b[0][1] + b[1][1])/2, (b[0][2] + b[1][2])/2];
      add({ kind: it.target.startsWith('scrub') ? 'spot' : 'mess', it }, c, Math.max(10, (b[1][0] - b[0][0])*.6, (b[1][1] - b[0][1])*.6)); }
    if (!v.bed) add({ kind: 'bed' }, A.bed, 46);
    if (!v.bedS) add({ kind: 'bedS' }, A.bedS, 40);
    for (const p of CUR.fam || []) if (!(HIDE && p.name === 'toddler')) add({ kind: 'person', name: p.name }, [p.at[0], p.at[1], p.at[2] + (p.name === 'toddler' ? 26 : 44)], p.name === 'toddler' ? 14 : 18);
    if (window.PETS){ const ctx = famCtx(); if (safe(() => PETS.bowl(d, ctx).empty, false)) add({ kind: 'pet', id: 'catbowl' }, [58, 254, HD.ZF[0] + 4], 14); if (safe(() => !PETS.feeder(d, ctx).full, false)) add({ kind: 'pet', id: 'feeder' }, A.feeder, 14); }
    if (pendingMeal() && famAt('ummi')) add({ kind: 'cook' }, famAt('ummi'), 20);
    if (v.tools.can) add({ kind: 'tool', id: 'can' }, A.can, 18);
    if (v.tools.cloth) add({ kind: 'tool', id: 'cloth' }, A.cloth, 14);
    if (v.tools.broom) add({ kind: 'tool', id: 'broom' }, A.broom, 18);
    if (DAY.ev.bins && d >= DAY.ev.bins) for (let i = 0; i < 2; i++) if (!S.bins[i]) add({ kind: 'tool', id: 'bin' + i }, A['bin' + i], 16);
    for (const p of HD.PLOTS) add({ kind: 'plot', id: p.id }, A[p.id], 16);
    add({ kind: 'play', id: 'swing' }, A.swing, 22); add({ kind: 'play', id: 'ball' }, [v.ballAt[0], v.ballAt[1], 14], 12); add({ kind: 'play', id: 'sandpit' }, A.sandpit, 24); add({ kind: 'play', id: 'feeder' }, A.feeder, 14);
    add({ kind: 'station', id: 'washer' }, A.washer, 28); add({ kind: 'station', id: 'basin' }, A.basin, 20); add({ kind: 'station', id: 'brushes' }, A.brushes, 12);
    add({ kind: 'station', id: 'mat' }, PS.now ? A.mat : [14, 340, HD.ZF[1] + 8], PS.now ? 40 : 24); add({ kind: 'station', id: 'clock' }, A.clock, 14);
    if (window.HStreet) for (const pl of safe(() => HStreet.places, [])) add({ kind: 'place', pl }, pl.at, 40);
    C.sort((a, b) => a.d - b.d);
    if (C.length && C[0].d < .55) return C[0];
    // the family and the animals, as drawn by the live layer (a tap on someone)
    if (LV){ const [X2, Y2] = toVB(cx, cy), who = safe(() => LV.pick(X2, Y2), null);
      if (who){ if (['abu', 'ummi', 'sister', 'toddler'].includes(who)) return { kind: 'person', name: who }; return { kind: 'pet', id: who }; } }
    if (C.length) return C[0];
    const [X, Y] = toVB(cx, cy);
    for (const id of ['myroom', 'sister', 'nursery', 'prayer', 'parents', 'bath', 'laundry', 'living', 'kitchen', 'hall', 'yard']) if (HD.inRoomPoly(id, X, Y)) return { kind: 'room', id };
    return { kind: 'none' };
  }

  /* ---------- the finger: tap, drag an item or a tool, pan (zoomed in) or turn (zoomed out) ---------- */
  let G = null, raf = 0;
  stack.addEventListener('pointerdown', e => {
    if (e.target.closest('.hh-bub, .hh-req')) return;
    e.preventDefault(); e.stopPropagation();
    if (G || e.button) return;
    const h = pick(e.clientX, e.clientY);
    G = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, px: e.clientX, py: e.clientY, t0: performance.now(), hit: h, mode: 'press', yaw: YAW };
    try { stack.setPointerCapture(e.pointerId); } catch (err) {}
    if (h.kind === 'mess' || h.kind === 'tool') handAt(e.clientX, e.clientY, 'point');
  }, true);
  stack.addEventListener('dblclick', e => e.stopPropagation(), true);
  stack.addEventListener('pointermove', e => {
    if (!G || e.pointerId !== G.id) return;
    G.x = e.clientX; G.y = e.clientY;
    if (G.mode === 'press' && Math.hypot(G.x - G.x0, G.y - G.y0) > 8){
      const h = G.hit;
      if (h.kind === 'mess') startDrag(h.it);
      else if (h.kind === 'tool') startDrag(toolItem(h.id));
      else if (zoomed()) G.mode = 'pan'; else G.mode = 'orbit';
    }
    if (!raf) raf = requestAnimationFrame(moveFrame);
  });
  function moveFrame(){
    raf = 0; if (!G) return;
    const dx = G.x - G.x0, dy = G.y - G.y0;
    if (G.mode === 'drag') dragMove();
    else if (G.mode === 'pan'){ const lim = clampPan(dx, dy); G.pdx = lim[0]; G.pdy = lim[1]; stack.style.transform = `translate(${lim[0]}px,${lim[1]}px)`; }
    else if (G.mode === 'orbit'){ turnTo(G.yaw - dx*.2); streetFade(); }
  }
  function clampPan(dx, dy){ const k = ppu(); let nx = VB[0] - dx/k, ny = VB[1] - dy/k;
    const mx = VB0[2]*.18, my = VB0[3]*.12;
    nx = Math.max(VB0[0] - mx, Math.min(VB0[0] + VB0[2] + mx - VB[2], nx)); ny = Math.max(VB0[1] - my, Math.min(VB0[1] + VB0[3] + my - VB[3], ny)); return [(VB[0] - nx)*k, (VB[1] - ny)*k]; }
  const endG = e => {
    if (!G || e.pointerId !== G.id) return;
    const g = G; G = null; cancelAnimationFrame(raf); raf = 0;
    if (g.mode === 'press'){ if (g.hit.kind !== 'mess' && g.hit.kind !== 'tool') tapHand(g.x, g.y); else handOff(); if (e.type !== 'pointercancel') tap(g.hit, g.x, g.y); }
    else if (g.mode === 'drag') drop(g);
    else if (g.mode === 'pan'){ const k = ppu(); stack.style.transform = ''; setVB([VB[0] - (g.pdx || 0)/k, VB[1] - (g.pdy || 0)/k, VB[2], VB[3]]); }
    else if (g.mode === 'orbit'){ turnTo(g.yaw - (g.x - g.x0)*.2, 1); hud(); render(); streetFade(); if (!zoomed()) easeFront(5000); }   // settle on the exact degree
  };
  stack.addEventListener('pointerup', endG); stack.addEventListener('pointercancel', endG);

  function tap(h, cx, cy){
    const v = view();
    if (HIDE && (h.kind === 'room' || h.kind === 'none' || h.kind === 'person' || h.kind === 'station') && hideGuess(cx, cy)) return;
    switch (h.kind){
      case 'person': if (h.name === 'toddler') playScene('blocks', 'toddler'); else if (h.name === 'sister' && dayTime()) playScene('catch', 'sister');
        else { play('h_soft'); const p = famAt(h.name); if (p) heart(p); } break;
      case 'bedS': makeBed('sister'); break;
      case 'pet': petTap(h.id); break;
      case 'cook': cook(); break;
      case 'mess': play('h_tap'); if (!zoomed()) goRoom(h.it.room, 650, toVB(cx, cy)); hint(h.it.target); break;
      case 'spot': play('h_tap'); if (!zoomed()) goRoom(h.it.room, 650, toVB(cx, cy)); hint(h.it.kind === 'dust' ? 'broom' : 'cloth'); break;
      case 'bed': makeBed(); break;
      case 'tool': if (h.id === 'can'){ canMode = !canMode; play(canMode ? 'h_lift' : 'h_back'); canFloat(); render(); } else { play('h_tap'); if (h.id.startsWith('bin')) hint('curb' + h.id.slice(3)); else hintSpots(h.id); } break;
      case 'plot': plotTap(h.id, v); break;
      case 'play': playTap(h.id, v); break;
      case 'station': go(h.id); break;
      case 'place': { const sc = { shop: 'shop', park: 'park', pond: 'park', mosque: 'mosque' }[h.pl.id] || (/^neighbour/.test(h.pl.id) ? 'neighbour' : null);
        if (sc) placeScene(sc, { at: h.pl.at, place: h.pl.id, plate: S.share || null, after: sc === 'neighbour' ? () => { S.share = null; HL.save(S); } : null });
        else { play('h_tap'); card(h.pl.icon || ICON.house, h.pl.label || '', ''); burst(h.pl.at, 6); } break; }
      case 'room': play('h_tap'); if (zoomRoom !== h.id || !zoomed()) goRoom(h.id, 650, zoomed() ? null : toVB(cx, cy)); break;
      default: if (canMode){ canMode = false; canFloat(); render(); } else if (zoomed()){ play('h_tap'); goOut(); }
    }
  }
  let hintO = null, hintT = 0;
  function hint(target){ const p = A[target]; if (!p) return; ovDel(hintO); clearTimeout(hintT);
    hintO = ovAdd('ring', p, '<b></b>', `--r:${Math.round(Math.max(56, 34*ppu()))}px`); hintT = setTimeout(() => { ovDel(hintO); hintO = null; }, 1500); }
  function hintSpots(kind){ const sp = view().mess.filter(it => it.target === 'scrub:' + kind); if (!sp.length) return;
    const rs = sp.map(it => ovAdd('ring', it.pos, '<b></b>', `--r:${Math.round(Math.max(44, 22*ppu()))}px`)); setTimeout(() => rs.forEach(ovDel), 1500); }

  /* ---------- drag and drop: items, tools, the wheelie bins ---------- */
  const TOOLPOS = { can: [HD.CAN[0], HD.CAN[1], 6], cloth: [42, 124, HD.ZF[0] + 75], broom: [104, 44, HD.ZF[0]] };
  function toolItem(id){ if (id.startsWith('bin')){ const i = +id.slice(3); return { id, kind: 'bin', i, pos: [146, 6 + i*28, 4] }; } return { id, kind: 'tool', tool: id, pos: TOOLPOS[id] }; }
  function itemSvgBox(it){
    if (it.kind === 'tool') return HD.tool(it.tool, ...it.pos);
    if (it.kind === 'bin'){ const [x, y] = it.pos, col = it.i ? '#5f8f5a' : '#5b8fd6';
      return { box: [[x, y, 4], [x + 20, y + 24, 46]], svg: H3.bx(x, y, 4, x + 18, y + 22, 40, matOf(col), 1, 1.8) + H3.bx(x - 1, y - 1, 40, x + 20, y + 23, 44, matOf(mix(col, '#000000', .2)), .9) + H3.ball([x + 3, y + 3, 7], 3, '#3d3935') + H3.ball([x + 3, y + 19, 7], 3, '#3d3935') }; }
    if (it.hang) return { box: [[it.pos[0], it.pos[1] - 14, it.pos[2] - 26], [it.pos[0] + 2, it.pos[1] + 14, it.pos[2] + 14]], svg: H3.hanging(it.pos[0], it.pos[1], it.pos[2] + 12, it.g, it.col, false) };
    return HD.messPart(it);
  }
  function makeFloat(it){
    const sb = itemSvgBox(it), b = sb.box, pts = [];
    for (const x of [b[0][0], b[1][0]]) for (const y of [b[0][1], b[1][1]]) for (const z of [b[0][2], b[1][2]]) pts.push(P(x, y, z));
    const pad = 6, x0 = Math.min(...pts.map(p => p[0])) - pad, y0 = Math.min(...pts.map(p => p[1])) - pad, x1 = Math.max(...pts.map(p => p[0])) + pad, y1 = Math.max(...pts.map(p => p[1])) + pad;
    const k = ppu(), el = document.createElement('div'); _clipN = 8000;
    el.style.width = ((x1 - x0)*k).toFixed(1) + 'px'; el.style.height = ((y1 - y0)*k).toFixed(1) + 'px';
    el.innerHTML = `<svg viewBox="${f(x0)} ${f(y0)} ${f(x1 - x0)} ${f(y1 - y0)}"><g filter="url(#hand)">${inkScale(sb.svg)}</g></svg>`;
    FLT.appendChild(el);
    el.style.transform = `translate(${(x0 - VB[0])*k}px,${(y0 - VB[1])*k}px)`;
    return { el, x0, y0, w: x1 - x0, h: y1 - y0, k0: k, it };
  }
  let F = null, canMode = false, canF = null;
  function startDrag(it){
    G.mode = 'drag';
    if (it.kind === 'tool' || it.kind === 'bin'){ tool = it.id; if (it.id === 'can'){ if (canF){ canF.el.remove(); canF = null; } canMode = false; } }
    else held = it.id;
    if (it.kind === 'tool' && it.tool !== 'can'){ const spots = view().mess.filter(x => x.target === 'scrub:' + it.tool); scrub = { kind: it.tool, spots: spots.map(x => ({ it: x, p: 0 })) }; }
    render();
    F = makeFloat(it); F.grab = [G.x0 - (F.x0 - VB[0])*F.k0, G.y0 - (F.y0 - VB[1])*F.k0];
    play('h_lift');
    const tgs = targetsOf(it);
    F.rings = tgs.map(t => ovAdd('ring', t.p3, '<b></b>', `--r:${Math.round(Math.max(56, (scrub ? 22 : 34)*ppu()))}px`)); F.tgs = tgs;
    if (zoomed() && tgs.length && tgs.every(t => { const [x, y] = toPx(t.p3); return x < 20 || y < 60 || x > stack.clientWidth - 20 || y > stack.clientHeight - 60; })) goOut(600);
    dragMove();
  }
  function targetsOf(it){
    if (it.id === 'can'){ const v = view(); return Object.keys(v.plots).filter(id => v.plots[id].thirsty).map(id => ({ id, p3: A[id] })); }
    if (it.kind === 'bin') return [{ id: 'curb' + it.i, p3: A['curb' + it.i] }];
    if (it.kind === 'tool') return scrub ? scrub.spots.map(sp => ({ id: sp.it.id, p3: sp.it.pos, spot: sp })) : [];
    return [{ id: it.target, p3: A[it.target] }];
  }
  function floatAt(px, py){
    // things are held a little bigger, just above the fingers; a tool (cloth, broom, can, bin) sits in the hand itself
    const isTool = F.it.kind === 'bin' || F.it.kind === 'tool', sc = ppu()/F.k0*(isTool ? 1 : 1.3), cx = F.w*F.k0*sc/2, cy = F.h*F.k0*sc;
    const x = px - cx, y = isTool ? py - cy*.75 : py - cy - 4;
    F.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${sc.toFixed(3)})`;
    return [x + cx, y + cy*.5];
  }
  function dragMove(){
    if (!F) return;
    const c = floatAt(G.x, G.y), moved = Math.hypot(G.x - G.px, G.y - G.py); G.px = G.x; G.py = G.y;
    handAt(G.x, G.y, 'grab');
    if (scrub){   // scrubbing: each spot under the cloth or broom fades as the hand moves over it
      let changed = false;
      F.tgs.forEach((t, i) => { const sp = t.spot; if (sp.p >= 1) return; const [x, y] = toPx(t.p3), dd = Math.hypot(x - c[0], y - c[1]);
        if (dd < Math.max(40, 22*ppu()) && moved > .5){ sp.p = Math.min(1, sp.p + moved/170); changed = true;
          if (sp.p >= 1){ S.done[sp.it.id] = 1; ovDel(F.rings[i]); burst(t.p3, 5); award(CHORE(sp.it)); emit('done', { id: sp.it.id, kind: 'chore', room: sp.it.room, at: sp.it.pos, stars: 0 }); } } });
      if (changed){ if (Math.random() < .35) play(scrub.kind === 'broom' ? 'h_sweep' : 'h_scrub'); const dd = dynScene(); if (dd !== lastD){ lastD = dd; DYN.g.innerHTML = dd; } }
      return;
    }
    const R = Math.max(58, 30*ppu()); F.hot = null;
    F.tgs.forEach((t, i) => { const [x, y] = toPx(t.p3), dd = Math.min(Math.hypot(x - c[0], y - c[1]), Math.hypot(x - G.x, y - G.y)), hot = dd < R;
      F.rings[i].el.classList.toggle('hot', hot); if (hot && (!F.hot || dd < F.hot.d)) F.hot = { t, d: dd }; });
  }
  function floatHome(f2, then){
    const k = ppu(); f2.el.classList.add('back'); f2.el.style.transform = `translate(${((f2.x0 - VB[0])*k).toFixed(1)}px,${((f2.y0 - VB[1])*k).toFixed(1)}px) scale(${(k/f2.k0).toFixed(3)})`;
    play('h_back'); setTimeout(() => { f2.el.remove(); then && then(); }, 520);
  }
  function drop(){
    const f2 = F; F = null; handOff(); f2.rings.forEach(ovDel);
    const it = f2.it;
    if (scrub){ const sc = scrub; floatHome(f2, () => { tool = null; scrub = null; HL.save(S); render(); afterTidy(); if (sc.spots.every(sp => sp.p >= 1)) play('h_done'); }); return; }
    if (f2.hot){
      const t = f2.hot.t;
      if (it.id === 'can'){ f2.el.remove(); tool = null; render(); canMode = true; canFloat(); water(t.id); return; }
      const [x, y] = toPx(t.p3), sc = ppu()/f2.k0*.5;
      f2.el.classList.add('go'); f2.el.style.transform = `translate(${(x - f2.w*f2.k0*sc/2).toFixed(1)}px,${(y - f2.h*f2.k0*sc/2).toFixed(1)}px) scale(${sc.toFixed(3)})`; f2.el.style.opacity = '0';
      setTimeout(() => { f2.el.remove(); if (it.kind === 'bin'){ tool = null; S.bins[it.i] = true; HL.save(S); play('h_roll'); render(); burst(t.p3, 8); award('bins-out'); emit('done', { id: 'bin' + it.i, kind: 'chore', room: 'yard', at: A['curb' + it.i], stars: 0 }); afterTidy(); } else tidied(it); }, 300);
    } else {
      // not there: it floats gently back to where it was
      floatHome(f2, () => { held = null; if (it.kind === 'tool' || it.kind === 'bin') tool = null; render(); if (it.target) hint(it.target); });
    }
  }
  function tidied(it){
    held = null; S.done[it.id] = 1; HL.save(S);
    play(SND[it.target] || 'h_wood'); render(); burst(A[it.target], 8); award(CHORE(it)); emit('done', { id: it.id, kind: 'chore', room: it.room, at: A[it.target] || it.pos, stars: 0 });
    try { window.KahfBridge && KahfBridge.item && KahfBridge.item(it.kind); } catch (e) {}
    afterTidy();
  }
  function afterTidy(){
    const R = rooms(), d = HL.dayKey(NOW());
    for (const id of RIDS){ const r = R[id]; if (!r.total || r.pending) continue;
      if (HL.credit(d + '|tidy|' + id + '|' + r.total)) setTimeout(() => { play('h_done'); burst(HD.FOCUS[id], 14); starFly(HD.FOCUS[id]); emit('done', { id: 'room.' + id, kind: 'room', room: id, at: HD.FOCUS[id], stars: 1 });
        try { Kit.say && Kit.say.praise && Kit.say.praise('mashaallah'); } catch (e) {} try { window.KahfBridge && KahfBridge.complete(); } catch (e) {} }, 350); }
  }
  const GUIDE = () => window.HHGuide && HHGuide.mounted !== false && window.__guideOn;
  function starFly(p3){
    // the guide shows the star flights: the counter holds the old number until its star lands (HOUSE.bumpStars)
    if (GUIDE()){ if (starHold == null){ starHold = Math.max(0, HL.stars().n - 1); clearTimeout(holdT); holdT = setTimeout(() => window.HOUSE.bumpStars(), 4000); } hud(); trayTiles(); return; }
    const s = document.createElement('div'); s.className = 'hh-starfly'; s.innerHTML = ICON.star; document.body.appendChild(s);
    const [x, y] = toPx(p3), r = bStar.getBoundingClientRect(); s.style.left = x + 'px'; s.style.top = y + 'px';
    requestAnimationFrame(() => requestAnimationFrame(() => { s.style.transform = `translate(${r.left + r.width/2 - x}px,${r.top + r.height/2 - y}px) scale(.7)`; s.style.opacity = '.4'; }));
    setTimeout(() => { s.remove(); hud(); bStar.classList.remove('pulse'); void bStar.offsetWidth; bStar.classList.add('pulse'); play('h_spark'); trayTiles(); }, 950);
  }

  // the animals: the cat purrs when tapped; the cat's bowl and the bird feeder are the child's to fill
  function petTap(id){
    if (id === 'catbowl' || id === 'feeder'){ const k = id === 'catbowl' ? 'catFills' : 'feederFills'; (S[k] = S[k] || []).push(NOW().getTime()); HL.save(S);
      const at = id === 'catbowl' ? [58, 254, HD.ZF[0] + 4] : A.feeder; play(id === 'catbowl' ? 'h_clink' : 'h_sand'); burst(at, 8); award(id === 'catbowl' ? 'fill-cat-bowl' : 'feed-bird-feeder');
      STATE = null; CUR.req = null; render(); overlays(); emit('done', { id: 'pet.' + id, kind: 'chore', room: id === 'catbowl' ? 'kitchen' : 'yard', at, stars: 0 }); return; }
    if (window.PETS && PETS.tap) safe(() => PETS.tap(id), null); else play('h_soft');
  }
  const dayTime = () => { const h = NOW().getHours(); return h >= 7 && h < 19; };
  /* ---------- tap actions: the bed, the garden, the watering can, play ---------- */
  let sweeping = false;
  function makeBed(who){
    if (sweeping) return; sweeping = true;
    const yb = who === 'sister' ? 261 : 386, xb = who === 'sister' ? 100 : 116;
    const a = toPx([xb, yb, HD.ZF[2] + 40]), b = toPx([20, yb, HD.ZF[2] + 40]), t0 = performance.now(); play('h_cloth');
    (function step(){ const u = Math.min(1, (performance.now() - t0)/650), e = u < .5 ? 2*u*u : 1 - Math.pow(-2*u + 2, 2)/2;
      handAt(a[0] + (b[0] - a[0])*e, a[1] + (b[1] - a[1])*e - Math.sin(u*Math.PI)*14, 'open');
      if (u < 1) return requestAnimationFrame(step);
      handOff(); sweeping = false; if (who === 'sister'){ S.bedS = true; burst(A.bedS, 10); const p = famAt('sister'); if (p) heart(p); } else { S.bed = true; burst(A.bed, 12); }
      HL.save(S); render(); play('h_cloth'); award('make-bed'); emit('done', { id: who === 'sister' ? 'bedS' : 'bed', kind: 'chore', room: who === 'sister' ? 'sister' : 'myroom', at: who === 'sister' ? A.bedS : A.bed, stars: 0 }); afterTidy(); })();
  }
  function plotTap(id, v){
    const p = v.plots[id] || {};
    if (p.stage == null || p.stage < 0){ HL.gardenAct(id, 'plant', NOW()); CUR.plots = null; play('h_sand'); render(); burst(A[id], 6); award('garden-plant'); emit('done', { id: 'garden.' + id + '.plant', kind: 'garden', room: 'yard', at: A[id], stars: 0 }); return; }
    if (p.stage >= 3){ CUR.plots = null; const r = HL.gardenAct(id, 'harvest', NOW()); play('h_done'); render(); burst(A[id], 12); starFly(A[id]); HL.credit(HL.dayKey(NOW()) + '|harvest|' + id); award('garden-harvest'); emit('done', { id: 'garden.' + id + '.harvest', kind: 'garden', room: 'yard', at: A[id], stars: 1 });
      if (r && r.name) card(ICON.gift, r.name, r.meal ? 'Cook ' + r.meal + ' with Ummi' : ''); return; }
    if (p.weeds){ HL.gardenAct(id, 'weed', NOW()); CUR.plots = null; play('h_cloth'); render(); burst(A[id], 5); award('garden-weed'); emit('done', { id: 'garden.' + id + '.weed', kind: 'garden', room: 'yard', at: A[id], stars: 0 }); return; }
    if (p.thirsty){ if (canMode) water(id); else { play('h_tap'); hint('can'); } return; }
    play('h_tap'); burst(A[id], 4);
  }
  function canFloat(){
    if (canF){ canF.el.remove(); canF = null; }
    plantRings.forEach(ovDel); plantRings = [];
    if (!canMode) return;
    canF = makeFloat(toolItem('can')); const k = ppu(); canF.el.style.transform = `translate(${((canF.x0 - VB[0])*k).toFixed(1)}px,${((canF.y0 - VB[1])*k - 14).toFixed(1)}px)`; canF.el.classList.add('hover');
    const v = view(); for (const id in v.plots) if (v.plots[id].thirsty) plantRings.push(ovAdd('ring', A[id], '<b></b>', `--r:${Math.round(Math.max(52, 30*ppu()))}px`));
  }
  let plantRings = [];
  function water(id){
    if (pour || !canF) return;
    const p = A[id], k = ppu();
    canF.el.classList.remove('hover'); canF.el.classList.add('go');
    const [x, y] = toPx([p[0] + 4, p[1] + 16, 40]); canF.el.style.transform = `translate(${(x - canF.w*k*.5).toFixed(1)}px,${(y - canF.h*k*.8).toFixed(1)}px) rotate(-24deg)`;
    plantRings.forEach(ovDel); plantRings = [];
    setTimeout(() => { play('h_water'); pour = { t: 0, at: [p[0], p[1], 14] }; const t0 = performance.now();
      (function step(){ pour.t = (performance.now() - t0)/1000; const dd = dynScene(); if (dd !== lastD){ lastD = dd; DYN.g.innerHTML = dd; } if (pour.t < 1.3) return requestAnimationFrame(step);
        pour = null; HL.gardenAct(id, 'water', NOW()); CUR.plots = null; burst(A[id], 8); award('water-garden'); emit('done', { id: 'garden.' + id + '.water', kind: 'garden', room: 'yard', at: A[id], stars: 0 });
        const v = view(); canMode = Object.keys(v.plots).some(i => v.plots[i].thirsty); canFloat(); render(); afterTidy(); })(); }, 380);
  }
  function playTap(id, v){
    if (id === 'swing'){ if (swingT >= 0) { swingT = 0; return; } swingT = 0; play('h_wood'); render(); const t0 = performance.now();
      (function step(){ swingT = (performance.now() - t0)/1000; const dd = dynScene(); if (dd !== lastD){ lastD = dd; DYN.g.innerHTML = dd; } if (swingT < 4.5) return requestAnimationFrame(step); swingT = -1; render(); })(); award('push-swing'); return; }
    if (id === 'ball' && dayTime() && famAt('sister')){ playScene('catch', 'sister'); return; }
    if (id === 'ball'){ if (ballAnim) return; const R2 = Math.random(), to = [130 + R2*50, 452 + Math.random()*140, 14]; if (to[0] > 120 && to[1] < 512) to[1] = 520 + R2*60;
      ballAnim = { t: 0, from: [v.ballAt[0], v.ballAt[1], 14], to }; play('h_bounce'); render(); const t0 = performance.now();
      (function step(){ ballAnim.t = (performance.now() - t0)/1000; const dd = dynScene(); if (dd !== lastD){ lastD = dd; DYN.g.innerHTML = dd; } if (ballAnim.t < .9) return requestAnimationFrame(step);
        S.ballAt = [to[0], to[1]]; HL.save(S); ballAnim = null; render(); })(); award('catch'); return; }
    if (id === 'sandpit'){ S.castle = !S.castle; HL.save(S); play('h_sand'); render(); burst(A.sandpit, 6); if (S.castle) award('sandcastles'); return; }
    if (id === 'feeder'){ bird = !bird; play(bird ? 'h_spark' : 'h_soft'); render(); if (bird) award('feed-bird-feeder'); }
  }

  /* ---------- brushing teeth: a little tap-and-scrub card (teeth only: no mouth, no face) ---------- */
  function teeth(){
    const due = teethDue(NOW()) || (NOW().getHours() < 12 ? 'am' : 'pm');
    const veil = document.createElement('div'); veil.className = 'hh-teeth';
    const MISWAK = '<svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="1.6" stroke-linecap="round"><path d="M5 19 18 6" stroke-width="5" stroke="#231e16"/><path d="M5 19 18 6" stroke-width="3" stroke="#c9a06a"/><path d="M17 4.5l2.5 2.5M18.5 3.5l2 2M16 5.8l2.2 2.2" stroke="#e8d9b0"/></svg>';
    veil.innerHTML = `<div class="card" role="dialog" aria-label="Brush teeth"><div class="pick"><button data-t="brush" aria-pressed="true" aria-label="Toothbrush">${BRUSH}</button><button data-t="miswak" aria-pressed="false" aria-label="Miswak">${MISWAK}</button></div><div class="area"></div></div>`;
    const area = veil.querySelector('.area'); let toolK = 'brush';
    const dots = []; let svg = '<svg viewBox="0 0 320 200">';
    for (let i = 0; i < 4; i++){ const x = 30 + i*70; svg += `<path d="M${x} 50q0 -26 30 -26q30 0 30 26v50q0 34 -12 66q-4 8 -8 0l-6 -30q-4 -8 -8 0l-6 30q-4 8 -8 0q-12 -32 -12 -66z" fill="#fffdf6" stroke="#231e16" stroke-width="3" stroke-linejoin="round"/>`;
      for (let j = 0; j < 3; j++){ const dx = x + 14 + (j*13) % 30, dy = 46 + j*22 + (i % 2)*6; dots.push({ x: dx, y: dy, p: 0 }); svg += `<circle class="pl" cx="${dx}" cy="${dy}" r="9" fill="#e5cf7a" opacity=".85"/>`; } }
    area.innerHTML = svg + '</svg>';
    const pls = [...area.querySelectorAll('.pl')], hc = HH.hand();
    veil.querySelectorAll('.pick button').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); toolK = b.dataset.t; veil.querySelectorAll('.pick button').forEach(x => x.setAttribute('aria-pressed', x === b)); play('h_tap'); }));
    const brushEl = document.createElement('i'); brushEl.style.cssText = 'position:fixed;left:0;top:0;width:64px;height:64px;margin:-50px 0 0 -14px;pointer-events:none;z-index:13;opacity:0';
    document.body.appendChild(brushEl);
    let last = null, left = dots.length;
    const move = e => { const r = area.getBoundingClientRect(), k = 320/r.width, x = (e.clientX - r.left)*k, y = (e.clientY - r.top)*k;
      brushEl.innerHTML = toolK === 'brush' ? BRUSH : MISWAK; brushEl.style.opacity = 1; brushEl.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
      handAt(e.clientX - stack.getBoundingClientRect().left, e.clientY + 30, 'grab');
      const m = last ? Math.hypot(e.clientX - last[0], e.clientY - last[1]) : 0; last = [e.clientX, e.clientY];
      dots.forEach((dt, i) => { if (dt.p >= 1) return; if (Math.hypot(dt.x - x, dt.y - y) < 26){ dt.p = Math.min(1, dt.p + m/90); pls[i].setAttribute('opacity', (.85*(1 - dt.p)).toFixed(2));
        if (Math.random() < .2) play('h_scrub'); if (dt.p >= 1){ left--; if (!left) finish(); } } }); };
    function finish(){ S.teeth[due] = true; HL.save(S); play('h_done'); award('brush-teeth'); emit('done', { id: 'teeth.' + due, kind: 'chore', room: 'bath', at: A.brushes, stars: 0 }); setTimeout(close, 600); render(); overlays(); afterTidy(); }
    function close(){ veil.classList.remove('in'); brushEl.remove(); handOff(); setTimeout(() => veil.remove(), 220); }
    area.addEventListener('pointerdown', e => { e.preventDefault(); last = [e.clientX, e.clientY]; try { area.setPointerCapture(e.pointerId); } catch (er) {} move(e); });
    area.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') move(e); });
    area.addEventListener('pointerup', () => { last = null; brushEl.style.opacity = 0; handOff(); });
    veil.addEventListener('pointerdown', e => { if (e.target === veil) close(); });
    document.body.appendChild(veil); requestAnimationFrame(() => veil.classList.add('in'));
    play('h_tap');
  }

  /* ---------- play with the family (house/play-*.js) and the place scenes (house/scene-*.js) ---------- */
  const famAt = who => { const st = famState(), p = st && st[who]; if (p && p.at && p.visible !== false && !p.away) return [p.at[0], p.at[1], p.at[2] + (who === 'toddler' ? 40 : 64)];
    const q2 = (CUR.fam || []).find(x => x.name === who); return q2 ? [q2.at[0], q2.at[1], q2.at[2] + 64] : null; };
  const famRoom = who => { const st = famState(), p = st && st[who]; return p && p.room || null; };
  function host(){ const el = document.createElement('div'); el.style.cssText = 'position:fixed;inset:0;z-index:30'; document.body.appendChild(el); return el; }
  function playScene(name, who, after, doneId){
    const Pp = window.HHPlay && HHPlay[name]; if (!Pp){ play('h_soft'); return; }
    const el = host(); play('h_zoom');
    Promise.resolve(safe(() => Pp.start(el, { date: NOW() }), null)).then(r => { el.remove();
      if (r && r.done){ award(r.job || 'play-' + name); const p = famAt(who); if (p) heart(p); play('h_done'); emit('done', { id: doneId || 'play.' + name, kind: doneId ? 'request' : 'play', who, at: famAt(who) || HD.FOCUS.nursery, stars: 1 }); after && after(); } })
      .catch(() => el.remove());
  }
  function placeScene(name, opts, doneId){
    const Sc = window.HHScene && HHScene[name]; if (!Sc){ play('h_soft'); return; }
    const el = host(); play('h_zoom');
    Promise.resolve(safe(() => Sc.start(el, Object.assign({ date: NOW(), kind: DAY.kind, hand: HH.hand() }, opts || {})), null)).then(r => { el.remove();
      if (r && r.go){ if (r.done) award(r.job || name); location.href = r.go; return; }
      if (r && r.done){ award(r.job || name); play('h_done'); if (HL.credit(HL.dayKey(NOW()) + '|scene|' + name)) starFly(HD.FOCUS.kitchen); emit('done', { id: doneId || 'place.' + name, kind: 'place', at: (opts && opts.at) || HD.FOCUS.kitchen, stars: 1 }); if (r.after) safe(r.after, null); CUR = {}; render(); overlays(); } })
      .catch(() => el.remove());
  }
  // cooking with Ummi once something was harvested (HHDays sets garden.pendingMeal)
  const pendingMeal = () => { const g = HL.read('hh.garden', {}); return g && g.pendingMeal ? g.pendingMeal : null; };
  function cook(){
    const m = pendingMeal(); if (!m){ play('h_soft'); return; }
    placeScene('cook', { meal: m, at: famAt('ummi') || A.rack, after: () => { const g = HL.read('hh.garden', {}); delete g.pendingMeal; HL.write('hh.garden', g); S.share = m.name || m.seed || 'meal'; HL.save(S); } }, 'cook');
  }
  // hide and seek in the house: the toddler hides where the day says (something always peeks out); tap to find him
  let FAM_ANIM = null;
  const HIDE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V5.5C4 4.7 4.7 4 5.5 4h13c.8 0 1.5.7 1.5 1.5V20"/><path d="M4 8c3 1.5 5 6 4 12M20 8c-3 1.5-5 6-4 12" fill="#f3a6bb"/><circle cx="12" cy="17" r="2.6" fill="#c98e62"/></svg>';
  function startHide(doneId){
    const F = window.FAMILY; if (!F || !F.hideSpot) return;
    const hs = safe(() => F.hideSpot(NOW(), famCtx()), null); if (!hs) return;
    // a few spots moved to where this house's furniture really hides him (and something still peeks out)
    const Z = HD.ZF, ADJ = { bed: [70, 174, Z[1]], basket: [74, 374, Z[0]], shed: [4, 508, 6] }[hs.id];
    if (ADJ){ const d = hs.peek ? [hs.peek[0] - hs.at[0], hs.peek[1] - hs.at[1], hs.peek[2] - hs.at[2]] : [0, 0, 30]; hs.at = ADJ; hs.peek = [ADJ[0] + d[0], ADJ[1] + d[1], ADJ[2] + d[2]]; }
    HIDE = { hs, wrong: 0, found: false, doneId }; CUR.fam = null; goOut(); render(); play('fam_giggle');
    card(HIDE_ICON, 'Hide and seek', 'Where is he hiding?', 3600);
  }
  function hideGuess(cx, cy){
    if (!HIDE || HIDE.found) return false;
    const hs = HIDE.hs, near = [hs.peek || hs.at, [hs.at[0], hs.at[1], hs.at[2] + 28]].some(p => { const [x, y] = toPx(p); return Math.hypot(x - cx, y - cy) < Math.max(42, 26*ppu()); });
    if (near){ foundHim(); return true; }
    if (!zoomed()) return false;                       // zoomed out, a tap looks into a room; it is not a guess
    HIDE.wrong++; play('h_soft'); tapHand(cx, cy);
    if (HIDE.wrong >= 2){ setTimeout(() => { play('fam_giggle'); burst(hs.peek || hs.at, 7); }, 350); }
    return true;
  }
  function foundHim(){
    const F = window.FAMILY, hs = HIDE.hs; HIDE.found = true; CUR.fam = null; render();
    const sp = F.found ? F.found() : { dur: 1200, at: () => ({ pose: 'stand' }) }, th = F.thank ? F.thank('toddler') : null, t0 = performance.now();
    FAM_ANIM = { name: 'toddler', at: hs.at, facing: hs.facing || 0, cur: { pose: 'play' } }; play('fam_giggle');
    (function step(){ const ms = performance.now() - t0;
      if (ms < sp.dur) FAM_ANIM.cur = sp.at(ms);
      else if (th && ms < sp.dur + th.dur){ FAM_ANIM.cur = th.at(ms - sp.dur); if (!FAM_ANIM.hearted && ms - sp.dur > (th.heart ? th.heart.delay : 900)){ FAM_ANIM.hearted = true; heart([hs.at[0], hs.at[1], hs.at[2] + 50]); play('fam_hug'); } }
      else { const HIDE0 = HIDE; FAM_ANIM = null; HIDE = null; CUR.fam = null; render(); award('hide-and-seek'); play('h_done'); emit('done', { id: (HIDE0 && HIDE0.doneId) || 'play.hide', kind: (HIDE0 && HIDE0.doneId) ? 'request' : 'play', who: 'toddler', at: HIDE0 ? HIDE0.hs.at : HD.FOCUS.nursery, stars: 1 }); return; }
      const dd = dynScene(); if (dd !== lastD){ lastD = dd; DYN.g.innerHTML = dd; } requestAnimationFrame(step); })();
  }
  function famAnimSvg(){
    const F = window.FAMILY; if (!FAM_ANIM || !F) return '';
    const c = FAM_ANIM.cur || {}, a = FAM_ANIM.at, its = safe(() => F.draw(FAM_ANIM.name, c.pose || 'stand', [a[0], a[1], a[2] + (c.lift || 0)], FAM_ANIM.facing, c.frame || 0), []);
    const fl = flOf(a); return (F.pad ? F.pad(its) : '') + `<g${fl === 0 || fl === 1 ? ` mask="url(#hm${fl})"` : ''}>${byDepth(its)}</g>`;
  }

  /* ---------- stations: zoom in, then open the station page ---------- */
  function go(id){
    if (id === 'brushes'){ goRoom('bath'); teeth(); return; }
    const P3 = { washer: A.washer, basin: A.basin, mat: A.mat, clock: A.clock, adhan: A.clock, tahajjud: [0, 383, HD.ZF[2] + 110] }[id];
    let st, prm = { from: 'house' };
    if (id === 'washer') st = 'washer';
    else if (id === 'basin') st = 'wudu';
    else if (id === 'tahajjud'){ st = 'wudu'; prm.p = 'tahajjud'; prm.next = 'salah'; }
    else if ((id === 'mat' || id === 'clock' || id === 'adhan') && PS.now){ st = 'adhan'; prm.p = PS.cur.name; prm.next = 'wudu,salah'; }
    else if (id === 'mat') st = 'salah';
    else { play('h_tap'); hint('mat'); return; }
    const url = FL ? FL.url(st, prm) : '/KidsGames/games/helping-home/' + { washer: 'jobs/washing-machine.html', wudu: 'pray/wudu.html', salah: 'pray/salah.html', adhan: 'pray/adhan.html' }[st] + '?' + new URLSearchParams(prm);
    play('h_zoom'); zoomRoom = null; zoomTo(P3, 3, 700, () => { location.href = url; });
  }

  /* ---------- small cards: the day's surprise, welcome back ---------- */
  // one overlay at a time: while the first-visit hand picker is open, cards wait their turn
  let cardT = 0, pickerOpen = false; const cardQ = [];
  function card(icon, title, line, ms = 4200){
    if (pickerOpen){ cardQ.push([icon, title, line, ms]); return; }
    document.querySelectorAll('.hh-card').forEach(c => c.remove());
    const c = document.createElement('div'); c.className = 'hh-card'; c.setAttribute('role', 'status');
    c.innerHTML = `<i>${icon}</i><span><b></b><span></span></span>`; c.querySelector('b').textContent = title || ''; c.querySelector('span span').textContent = line || '';
    c.addEventListener('click', () => { c.classList.remove('in'); setTimeout(() => c.remove(), 300); });
    document.body.appendChild(c); requestAnimationFrame(() => c.classList.add('in'));
    clearTimeout(cardT); cardT = setTimeout(() => { c.classList.remove('in'); setTimeout(() => c.remove(), 300); }, ms);
  }

  /* ---------- My Room: stars earn decorations, dragged into My Room ---------- */
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
  function tray(on){ trayOpen = on; trayEl.classList.toggle('in', on); bot.style.visibility = on ? 'hidden' : ''; if (on){ trayTiles(); goRoom('myroom'); } }
  function trayTiles(){
    const n = HL.stars().n, box = trayEl.querySelector('.tiles'); box.innerHTML = '';
    for (const id of Object.keys(HD.DECOR)){ const c = HD.DECOR[id].cost, lock = n < c && !DEC.placed[id], placed = !!DEC.placed[id];
      const t = document.createElement('button'); t.className = 'hh-tile' + (lock ? ' lock' : '') + (placed ? ' placed' : ''); t.dataset.id = id;
      t.innerHTML = decoIcon(id) + `<span class="c">${placed ? '&#10003;' : c}</span>`; t.setAttribute('aria-label', id);
      t.addEventListener('pointerdown', e => tileDown(e, id, lock, placed)); box.appendChild(t); }
  }
  let TD = null;
  function tileDown(e, id, lock, placed){
    e.preventDefault();
    if (lock){ play('h_soft'); e.currentTarget.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], 260); return; }
    if (placed){ DEC.placed[id] = 0; HL.saveRoom(DEC); play('h_back'); render(); trayTiles(); return; }
    const el = document.createElement('div'); el.style.width = '72px'; el.style.height = '72px'; el.innerHTML = decoIcon(id); FLT.appendChild(el);
    const r = e.currentTarget.getBoundingClientRect();
    TD = { id, el, x0: r.left + r.width/2, y0: r.top + r.height/2, pid: e.pointerId };
    TD.ring = ovAdd('ring', A[id], '<b></b>', `--r:${Math.round(Math.max(60, 44*ppu()))}px`);
    play('h_lift'); moveTD(e.clientX, e.clientY);
    addEventListener('pointermove', tdMove); addEventListener('pointerup', tdUp); addEventListener('pointercancel', tdUp);
  }
  function moveTD(x, y){ TD.x = x; TD.y = y; TD.el.style.transform = `translate(${x - 36}px,${y - 60}px)`; handAt(x, y, 'grab');
    const [X, Y] = toVB(x, y - 24); TD.ok = HD.inRoomPoly('myroom', X, Y); TD.ring.el.classList.toggle('hot', TD.ok); }
  function tdMove(e){ if (TD && e.pointerId === TD.pid) moveTD(e.clientX, e.clientY); }
  function tdUp(e){
    if (!TD || e.pointerId !== TD.pid) return;
    removeEventListener('pointermove', tdMove); removeEventListener('pointerup', tdUp); removeEventListener('pointercancel', tdUp);
    const t = TD; TD = null; handOff(); ovDel(t.ring);
    if (t.ok){ t.el.remove(); DEC.placed[t.id] = 1; HL.saveRoom(DEC); play('h_wood'); render(); burst(A[t.id], 12); trayTiles(); }
    else { t.el.classList.add('back'); t.el.style.transform = `translate(${t.x0 - 36}px,${t.y0 - 36}px)`; play('h_back'); setTimeout(() => t.el.remove(), 500); }
  }

  /* ---------- time passes: the light, new chores, prayer windows (one check every 20 s) ---------- */
  function famSkin(){ try { window.FAMILY && FAMILY.setSkin && FAMILY.setSkin(HH.hand().skin); } catch (e) {} }
  function refresh(){
    const d = NOW();
    if (HL.dayKey(d) !== S.day){ S = HL.load(); DAY = HL.dayItems(d); SUR = DAY.kind.surprise; HIDE = null; }
    LIGHT = HL.light(d); PS = prayerState(); CUR = {}; STATE = null;
    render(); drawDial(); overlays(); skyAndWeather();
  }
  setInterval(refresh, 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  addEventListener('pageshow', e => { if (e.persisted){ S = HL.load(); DEC = HL.room(); HL.creditLog(); refresh(); hud(); } });
  addEventListener('resize', () => { clearTimeout(frame.t); frame.t = setTimeout(() => { const r = zoomRoom; frame(); render(); if (r) goRoom(r, 0); overlays(); skyKey = ''; skyAndWeather(); }, 120); });

  /* ---------- window.HOUSE: what the guide (house/guide.js) and the sticker book (house/book.js) build on ---------- */
  const LISTEN = {};
  function emit(ev, data){ (LISTEN[ev] || []).slice().forEach(fn => { try { fn(data); } catch (e) {} }); }
  const TI = n => `<svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${n}</svg>`;
  const TICON = {
    sock: TI('<path d="M9 3h6v9l4 3a3 3 0 0 1-2 5.5H11L7 17a2.5 2.5 0 0 1 1-4z" fill="#f2c230"/>'),
    shirt: TI('<path d="M8.5 4L4 7l2 4 2-1v10h8V10l2 1 2-4-4.5-3c-.5 1.5-2 2.5-3.5 2.5S9 5.5 8.5 4z" fill="#9fc7ef"/>'),
    toy: TI('<rect x="3.5" y="12" width="8" height="8" rx="1" fill="#5b8fd6"/><rect x="12.5" y="12" width="8" height="8" rx="1" fill="#e8574a"/><rect x="8" y="4" width="8" height="8" rx="1" fill="#f2c230"/>'),
    book: TI('<path d="M12 6.5C9.5 5 6.5 4.8 3.5 5.5V19c3-.7 6-.5 8.5 1 2.5-1.5 5.5-1.7 8.5-1V5.5C17.5 4.8 14.5 5 12 6.5z" fill="#fff6dc"/><path d="M12 6.5V20"/>'),
    dish: TI('<circle cx="12" cy="12" r="8" fill="#fbf6ea"/><circle cx="12" cy="12" r="4.5"/>'),
    shoe: TI('<path d="M3 15.5V9.5h4l2 2.5 5.5 1.5c3.5 1 6.5 1.6 6.5 3.5v1.5H3z" fill="#e8574a"/>'),
    bag: TI('<rect x="5" y="7" width="14" height="13" rx="3" fill="#e8574a"/><path d="M9 7V5.5a3 3 0 0 1 6 0V7"/>'),
    bin: TI('<path d="M6 7h12l-1.2 13H7.2z" fill="#5b8fd6"/><path d="M4 7h16M9 4h6"/>'),
    broom: TI('<path d="M15 3 9 13"/><path d="M9 13l-5 3 4 5 5-4z" fill="#e2b14a"/>'),
    cloth: TI('<rect x="4" y="7" width="16" height="11" rx="2" fill="#76a0e2"/><path d="M4 11h16M4 14h16" stroke="#fbf4e4"/>'),
    bed: TI('<path d="M3 18V8M3 14h18v4M21 14v-3a2 2 0 0 0-2-2H10v5" fill="#76a0e2"/><rect x="4" y="10" width="5" height="3" rx="1" fill="#fbf6ea"/>'),
    teeth: TI('<path d="M7 5c-3 0-4 3-3 6 1 4 1 9 3 9 1.5 0 1.5-5 3-5h4c1.5 0 1.5 5 3 5 2 0 2-5 3-9 1-3 0-6-3-6-2 0-3 1-5 1S9 5 7 5z" fill="#fffdf6"/>'),
    can: TI('<path d="M6 10h9v9H6z" fill="#5b8fd6"/><path d="M15 12l5-4M8 10V7.5h5V10"/>'),
    seed: TI('<ellipse cx="12" cy="14" rx="4" ry="5.5" fill="#c9894e"/><path d="M12 8.5c0-3 2-5 5-5"/>'),
    harvest: TI('<path d="M4 11h16l-2 9H6z" fill="#e2b277"/><circle cx="9" cy="9" r="3" fill="#e8574a"/><circle cx="15" cy="9" r="3" fill="#ef8a3c"/>'),
    prayer: TI('<rect x="5" y="3" width="14" height="18" rx="1.5" fill="#b5443b"/><path d="M8 9a4 4 0 0 1 8 0v8H8z" fill="#2f6b4f"/>'),
    star: TI('<path d="M12 2.8l2.7 5.9 6.4.7-4.8 4.4 1.3 6.4L12 17l-5.6 3.2 1.3-6.4L2.9 9.4l6.4-.7z" fill="#f4b829"/>'),
    pot: TI('<path d="M5 10h14v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" fill="#c9d0d6"/><path d="M3 10h18M9 6c0-1 1-2 0-3M13 6c0-1 1-2 0-3"/>'),
    drawing: TI('<rect x="4" y="4" width="16" height="16" rx="1" fill="#fffdf6"/><circle cx="10" cy="10" r="3" fill="#f2c230"/><path d="M6 18l4-4 3 3 5-5"/>'),
    washing: TI('<path d="M3 6h18"/><path d="M6 6v8h5V6M14 6l-1 10h7l-1-10" fill="#9fc7ef"/>'),
  };
  const KICON = { sock: 'sock', pyj: 'shirt', wet: 'washing', dry: 'washing', block: 'toy', ball: 'toy', car: 'toy', rings: 'toy', book: 'book', hw: 'book', sbook: 'bag', lunchbox: 'bag', wbottle: 'bag',
    plate: 'dish', bowl: 'dish', cup: 'dish', pot: 'pot', shoe: 'shoe', bag: 'bag', can: 'bin', paper: 'bin', bottle: 'bin', peel: 'bin', wrapper: 'bin', dust: 'broom', crumb: 'cloth', drawing: 'drawing' };
  const TITLE = it => it.target === 'table' ? 'Set the table' : it.kind === 'crumb' ? 'Wipe the table' : it.kind === 'dust' ? 'Sweep the floor' : it.target === 'rack' ? 'Dishes to the rack' :
    it.target === 'bag' ? 'Pack the school bag' : it.target === 'desk' ? 'Homework to the desk' : it.target === 'recycle' || it.target === 'general' ? 'Rubbish in the right bin' : it.kind === 'wet' ? 'Hang the washing' :
    it.kind === 'dry' ? 'Fold the dry washing' : it.target === 'toychest' ? 'Toys in the toy chest' : it.kind === 'pyj' ? 'Pyjamas away' : it.kind === 'sock' ? 'Socks in the basket' : it.kind === 'shoe' ? 'Shoes on the rack' :
    it.target === 'shelfB' || it.target === 'bookcase' ? 'Books on the shelf' : it.kind === 'drawing' ? 'A drawing for the fridge' : it.kind === 'bag' ? 'School bag on its peg' : 'Tidy up';
  const JOBTITLE = { 'set-table': 'Help set the table', 'pack-schoolbag': 'Help pack the bag', 'find-shoe': 'Find a shoe', 'fold-washing': 'Help fold the washing', 'water-plants': 'Water the plants',
    'carry-shopping': 'Carry the shopping', 'play-blocks': 'Play blocks', 'play-catch': 'Play catch', 'play-hide': 'Hide and seek', 'bedtime-story': 'A bedtime story' };
  const capN = n => n ? n[0].toUpperCase() + n.slice(1) : '';
  function tasks(){
    const d = NOW(), v = view(), out = []; let order = 0;
    const T = o => out.push(Object.assign({ order: order++, done: false }, o));
    if (PS.now) T({ id: 'prayer.' + PS.cur.name, kind: 'prayer', title: capN(PS.cur.name) + ' prayer', icon: TICON.prayer, room: 'prayer', at: A.mat, how: 'open' });
    if (PS.tahajjud && !HL.prayed('tahajjud')) T({ id: 'prayer.tahajjud', kind: 'prayer', title: 'Tahajjud (if you like)', icon: TICON.star, room: 'myroom', at: [0, 383, HD.ZF[2] + 110], how: 'open' });
    for (const r of CUR.req || []) T({ id: 'req.' + r.id, kind: 'request', tapDy: -55, title: JOBTITLE[r.job] || 'Help', icon: r.iconSvg || TICON.star, room: r.room || famRoom(r.who), at: r.bubbleAt, how: 'tap', who: r.who });
    if (window.PETS){ const ctx = famCtx();
      if (safe(() => PETS.bowl(d, ctx).empty, false) || (S.catFills || []).some(t2 => HL.dayKey(new Date(t2)) === HL.dayKey(d)))
        T({ id: 'pet.catbowl', kind: 'chore', title: "Fill the cat's bowl", icon: safe(() => PETS.icon('catbowl'), TICON.dish), room: 'kitchen', at: [58, 254, HD.ZF[0] + 4], how: 'tap', done: !safe(() => PETS.bowl(d, ctx).empty, false) });
      if (dayTime() && (safe(() => PETS.feeder(d, ctx).empty, false) || (S.feederFills || []).some(t2 => HL.dayKey(new Date(t2)) === HL.dayKey(d))))
        T({ id: 'pet.feeder', kind: 'chore', title: 'Fill the bird feeder', icon: safe(() => PETS.icon('feeder'), TICON.seed), room: 'yard', at: A.feeder, how: 'tap', done: !safe(() => PETS.feeder(d, ctx).empty, false) }); }
    const tw = teethDue(d); if (tw) T({ id: 'teeth.' + tw, kind: 'chore', title: 'Brush your teeth', icon: TICON.teeth, room: 'bath', at: A.brushes, how: 'tap' });
    if (DAY.ev.wake <= d) T({ id: 'bed', kind: 'chore', title: 'Make your bed', icon: TICON.bed, room: 'myroom', at: A.bed, how: 'tap', done: !!S.bed });
    if (!v.bedS || S.bedS) T({ id: 'bedS', kind: 'chore', title: "Make your sister's bed", icon: TICON.bed, room: 'sister', at: A.bedS, how: 'tap', done: !!S.bedS });
    for (const it of allItems(d)){ if (it.at > d || it.marker) continue; const dn = isDone(it); if (!dn && !live(it, d)) continue;
      const sc = it.target.startsWith('scrub:') ? it.target.slice(6) : null;
      T({ id: it.id, kind: 'chore', title: TITLE(it), icon: TICON[KICON[it.kind]] || TICON.toy, room: it.room, at: it.pos, how: sc ? 'scrub' : 'drag', from: sc ? A[sc] : it.pos, to: sc ? it.pos : A[it.target], done: dn }); }
    if (DAY.ev.bins && d >= DAY.ev.bins) for (let i = 0; i < 2; i++) T({ id: 'bin' + i, kind: 'chore', title: 'Bins to the curb', icon: TICON.bin, room: 'yard', at: A['bin' + i], how: 'drag', from: A['bin' + i], to: A['curb' + i], done: !!S.bins[i] });
    for (const p of HD.PLOTS){ const g = v.plots[p.id] || {};
      if (g.stage == null || g.stage < 0) T({ id: 'garden.' + p.id + '.plant', kind: 'garden', title: 'Plant a seed', icon: TICON.seed, room: 'yard', at: A[p.id], how: 'tap' });
      else if (g.stage >= 3) T({ id: 'garden.' + p.id + '.harvest', kind: 'garden', title: 'Pick the ' + (g.kind || 'vegetables'), icon: TICON.harvest, room: 'yard', at: A[p.id], how: 'tap' });
      else if (g.thirsty) T({ id: 'garden.' + p.id + '.water', kind: 'garden', title: 'Water the garden', icon: TICON.can, room: 'yard', at: A[p.id], how: 'drag', from: A.can, to: A[p.id] });
      else if (g.weeds) T({ id: 'garden.' + p.id + '.weed', kind: 'garden', title: 'Pull the weeds', icon: TICON.seed, room: 'yard', at: A[p.id], how: 'tap' }); }
    if (pendingMeal()) T({ id: 'cook', kind: 'place', title: 'Cook with Ummi', icon: TICON.pot, room: 'kitchen', at: famAt('ummi') || A.rack, how: 'tap', who: 'ummi' });
    if (famAt('toddler') && dayTime()) T({ id: 'play.blocks', kind: 'play', title: 'Play blocks with your brother', icon: TICON.toy, room: famRoom('toddler'), at: famAt('toddler'), how: 'tap', who: 'toddler' });
    if (famAt('sister') && dayTime()) T({ id: 'play.catch', kind: 'play', title: 'Play catch with your sister', icon: TICON.toy, room: 'yard', at: A.ball, how: 'tap', who: 'sister' });
    if (window.HStreet) for (const pl of safe(() => HStreet.places, [])){ const sc = { shop: 'shop', park: 'park', mosque: 'mosque' }[pl.id] || (pl.id === 'neighbour1' ? 'neighbour' : null);
      if (sc) T({ id: 'place.' + sc, kind: 'place', title: pl.label, icon: pl.icon || TICON.star, room: 'street', at: pl.at, how: 'open' }); }
    return out;
  }
  function focus(id, ms = 700, o){
    const t = tasks().find(x => x.id === id); if (!t) return Promise.resolve(false);
    const y0 = YAW;
    return new Promise(res => {
      // turn back to the front (the open side), then zoom so the task is in view
      if (Math.abs(y0 - YAW_H) > .5){ const t0 = performance.now(); (function step(){ const u = Math.min(1, (performance.now() - t0)/(ms*.5)); turnTo(y0 + (YAW_H - y0)*(u < .5 ? 2*u*u : 1 - Math.pow(-2*u + 2, 2)/2), 1); if (u < 1) requestAnimationFrame(step); else streetFade(); })(); }
      const bottom = (o && o.bottom) || 0;
      if (t.room && ROOMS[t.room] && t.at){ zoomRoom = t.room; const v2 = roomView(t.room, P(...t.at)); v2.c[1] += bottom/(ppu0()*v2.k)*.5; zoomTo(v2.c, v2.k, ms, () => render()); play('h_zoom'); streetFade(); setTimeout(render, 30); }
      else if (t.at){ zoomRoom = null; const q2 = P(...t.at); zoomTo([q2[0], q2[1] + bottom/(ppu0()*2.2)*.5], 2.2, ms); }
      setTimeout(() => res(true), ms + 60);
    });
  }
  window.HOUSE = {
    tasks, focus,
    toScreen: p3 => { const [x, y] = toPx(p3), r = stack.getBoundingClientRect(); return [r.left + x, r.top + y]; },
    on(ev, fn){ (LISTEN[ev] = LISTEN[ev] || []).push(fn); return () => { LISTEN[ev] = (LISTEN[ev] || []).filter(f2 => f2 !== fn); }; },
    stars: () => HL.stars().n,
    award(n, reason, o){ if (o && o.quiet && starHold == null){ starHold = HL.stars().n; clearTimeout(holdT); holdT = setTimeout(() => window.HOUSE.bumpStars(), 4000); }
      const s2 = HL.stars(); s2.n += Math.max(0, n | 0); if (reason) s2.keys.push(HL.dayKey(NOW()) + '|award|' + reason + '|' + Date.now()); HL.write('hh.stars', s2); hud(); trayTiles(); return s2.n; },
    bumpStars(){ clearTimeout(holdT); starHold = null; hud(); bStar.classList.remove('pulse'); void bStar.offsetWidth; bStar.classList.add('pulse'); },
    starEl: () => bStar,
    tapPoint(id){ const t = tasks().find(x => x.id === id); if (!t) return null; const p = window.HOUSE.toScreen(t.at); if (t.kind === 'request') p[1] -= 55; return p; },
    dailyPlan: () => DAYS() && DAYS().dailyPlan ? safe(() => DAYS().dailyPlan(NOW()), null) : null,
    zoomOut: () => goOut(), room: () => zoomRoom, version: 1,
  };
  function mountGuide(){ if (window.HHGuide && HHGuide.mount){ window.__guideOn = true; safe(() => HHGuide.mount(window.HOUSE), null); }
    if (BACK === 'salah' || BACK === 'adhan'){ const L = HL.read('hh.log', {}), day = (L[HL.dayKey(NOW())] || {}).salah || [];
      const fard = day.filter(e => !e.kind || e.kind === 'fard').sort((a, b) => (b.t || 0) - (a.t || 0))[0];
      if (fard && Date.now() - (fard.t || 0) < 3*3600000) setTimeout(() => emit('done', { id: 'prayer.' + (fard.p || fard.prayer), kind: 'prayer', room: 'prayer', at: A.mat, stars: 0 }), 1500); } }
  const BACK = q.get('back');

  /* ---------- start ---------- */
  SUR = DAY.kind.surprise;
  famSetup(); DAY = HL.dayItems(NOW());
  famSkin();
  frame(); liveStart(); render(); drawDial(); overlays(); hud(); skyAndWeather();
  if (window.PETS && PETS.sky) safe(() => PETS.sky({ el: FLOCK, toPx, now: NOW, ctx: famCtx }), null);
  const got = HL.creditLog();
  if (SUR && SUR.effect && SUR.effect.stars && HL.credit(HL.dayKey(NOW()) + '|surprise-stars')) { const s = HL.stars(); s.n += (SUR.effect.stars - 1); HL.write('hh.stars', s); }
  const back = q.get('back');
  if (back){
    const keep = new URLSearchParams(location.search); keep.delete('back');
    try { history.replaceState(null, '', location.pathname + (keep.toString() ? '?' + keep : '')); } catch (e) {}
    const p3 = { washer: A.washer, wudu: A.basin, salah: A.mat, adhan: A.clock }[back] || null;
    if (p3){ zoomTo(p3, 2.6, 0); setTimeout(() => { zoomTo(null, 1, 1100); burst(p3, 14); play('h_done'); if (got.length) setTimeout(() => starFly(p3), 500); }, 650); }
  } else if (got.length) setTimeout(() => starFly(HD.FOCUS.prayer), 600);
  // the warm welcome back and the day's surprise (house/days.js)
  setTimeout(() => {
    const H = DAYS(); if (!H) return;
    const sl = safe(() => H.sinceLast(NOW()), null), seen = HL.read('hh.surpriseSeen', '') === HL.dayKey(NOW());
    if (SUR && !seen){ card(ICON.gift, SUR.title, SUR.line, 5200); HL.write('hh.surpriseSeen', HL.dayKey(NOW())); }
    else if (sl && sl.line && !back) card(ICON.house, sl.line, sl.ready && sl.ready.length ? 'Something in the garden is ready!' : sl.sprouted && sl.sprouted.length ? 'A seed has sprouted!' : '', 3600);
    safe(() => H.touch(NOW()), null);
  }, back ? 2200 : 900);
  if (!HH.hasHand()){ pickerOpen = true; setTimeout(() => HH.pickHand(() => { handPose = ''; handIcon(); famSkin(); render();
    pickerOpen = false; const c = cardQ.shift(); if (c) setTimeout(() => card(...c), 400); cardQ.length = 0; mountGuide(); }), 500); }
  else setTimeout(mountGuide, 50);
  HH.precache && HH.precache([]);
  // the service worker: the house can be the first page opened, so it registers it if the hub has not
  if ('serviceWorker' in navigator) safe(() => navigator.serviceWorker.getRegistration('/KidsGames/').then(r => r || navigator.serviceWorker.register('/KidsGames/sw.js', { scope: '/KidsGames/' })).catch(() => {}), null);
  // offline: hand the service worker the whole game's file list (offline.json) once per version
  const leaf = document.createElement('span'); leaf.className = 'hh-leaf'; leaf.setAttribute('role', 'img'); leaf.setAttribute('aria-label', 'Ready offline');
  leaf.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z" fill="#93c25c" stroke="#231e16" stroke-width="1.8" stroke-linejoin="round"/><path d="M5 19c3-5 7-8 11-11" fill="none" stroke="#231e16" stroke-width="1.5" stroke-linecap="round"/></svg>';
  leaf.hidden = true; bHand.after(leaf);
  (function offline(){
    if (!('serviceWorker' in navigator) || !window.fetch) return;
    let saved = null; try { saved = localStorage.getItem('hh.offline'); } catch (e) {}
    if (saved) leaf.hidden = false;
    fetch('/KidsGames/games/helping-home/offline.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(d => {
      if (!d || !Array.isArray(d.files)) return; const key = d.version + ':' + (d.bytes || 0); if (saved === key) return;
      const c = navigator.serviceWorker.controller;
      (c ? Promise.resolve(c) : navigator.serviceWorker.ready.then(r => r.active)).then(w => { if (!w) return;
        w.postMessage({ type: 'CACHE_URLS', urls: d.files }); try { localStorage.setItem('hh.offline', key); } catch (e) {} leaf.hidden = false; });
    }).catch(() => {});
  })();
  // testing hooks
  const nodesOf = g => g.getElementsByTagName('*').length;
  window.__house = { ui, view, rooms, render, pick, goRoom, goOut, zoomTo, toPx, S: () => S, DAY: () => DAY, refresh, teeth, placeScene, playScene, startHide, cur: () => CUR, hide: () => HIDE,
    cache: () => ({ entries: FRAG.size, nodes: [...FRAG.values()].reduce((a, g) => a + nodesOf(g), 0) }) };
  if (q.get('zoom') && ROOMS[q.get('zoom')]) goRoom(q.get('zoom'), 0);
})();
