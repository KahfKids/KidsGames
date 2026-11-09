/* Washing machine: Helping Home, Phase A. Made with Colorfigures (MIT).
   How a front loader really works (where the water, soap and clothes are after each step):
     1 OPEN DOOR    the door swings on its left hinge; the drum mouth is behind a rubber gasket
     2 LOAD         clothes go from the basket through the door into the drum (it turns on a shaft inside the tub)
     3 SOAP         soap goes into the drawer at the top left; the water valve later flushes it down a hose into the tub
     4 PROGRAM      the dial picks a program (quick, cotton, gentle): how long it washes and how fast it spins
     5 START        the door lock clicks shut. Fill: the valve opens, water runs through the drawer (taking the soap) into
                    the tub. Wash: the motor turns the drum by a belt, one way then the other; the lifters raise the
                    clothes and drop them through the soapy water. Drain: the pump empties the tub out of the back hose.
                    Rinse: clean water in, tumble, drain. Spin: the drum turns fast and throws the water out of the
                    clothes through the drum holes; springs above and dampers below hold the shaking tub.
     6 UNLOCK       the lock opens a moment after the drum stops
     7 UNLOAD       clean clothes go back to the basket

   Parts (each held by another):
   CASE       cabinet (on four feet) . top . control panel . display . program dial . start button . soap drawer .
              porthole gasket . door (ring + glass, on a hinge) . door lock . kick plate + pump filter flap
   STRUCTURE  base pan . top crossbar . 2 suspension springs (crossbar -> tub) . 2 dampers (base pan -> tub) .
              counterweight (bolted to the tub front)
   MECHANISM  tub . drum (inside the tub, on the shaft) with 3 lifters . shaft . big pulley . belt . motor (under the
              tub) with its small pulley . heater (in the tub, under the drum)
   WATER      inlet hose (outside) . inlet valve . hose to the drawer housing . drawer housing . hose to the tub .
              drain hose tub -> pump . drain pump . hose pump -> back . drain hose (outside, hooked up the back)
   CONTROL    control board behind the panel . wire to the motor . pressure sensor with its tube to the tub bottom
   POWER      cord out of the back

   Coordinates: x = depth (front at x = W), y = width (+y = viewer-left), z = up, 1 unit = 1 cm.
   The laundry basket stands on the floor beside the machine's left side (the side seen from the front view). */
const W = 60, D = 60, H = 85, Y0 = 4, ZF = 2;                     // body, offset, feet height
const OUT = rrUV(Y0, ZF, Y0 + D, H, 3);                            // cabinet profile (y, z), swept along x
const PCY = Y0 + 30, PCZ = 38;                                     // porthole centre (y, z)
const RP = 15.5, RGK = 17.5, RO = 19, RG = 14;                     // opening, gasket, door ring, door glass radii
const XB = W - 26;                                                 // drum back wall (seen through the opening)
const DOORM = { l:'#fbf9f2', m:'#dedacd', d:'#ada796' }, PANEL = '#fff4d6', RUBBER = '#4a4643';
const STEEL = { l:'#c9cfd1', m:'#9aa3a6', d:'#666e72' }, KNOBM = { l:'#fff4d6', m:'#e6dcbd', d:'#bfb390' };
const BOTM = matOf('#4f7fd0'), CAPM = matOf('#f2c230'), WATER = '#7fc4e8', SOAPC = '#5aa0f0';
const WICKER = { l:'#e2b277', m:'#c99555', d:'#8e6236' };
const PROGS = [
  { name:'Quick',  col:'#5aa0f0', k:.7,  spin:14, heat:.3, icon:'quick' },   // a short wash
  { name:'Warm',   col:'#ef8a3c', k:1,   spin:16, heat:1,  icon:'warm' },    // warm water for everyday clothes
  { name:'Gentle', col:'#e98fb0', k:1.05, spin:8, heat:.5, icon:'gentle' },  // a soft, slow spin for delicate clothes
];
const CLOTHES = [
  { kind:'shirt',    col:'#e8574a' },
  { kind:'sock',     col:'#f2c230' },
  { kind:'trousers', col:'#4f7fd0' },
  { kind:'towel',    col:'#fbf9f2' },
  { kind:'shirt',    col:'#5cb87a' },
];

/* ---------- the front panel's local frame: u right, v down from the top-left corner of the front ---------- */
const FL = (u, v, dx = .3) => [W + dx, Y0 + D - u, H - v];
const loc = (pts, dx) => pts.map(([u, v]) => FL(u, v, dx));
const lrr = (u, v, w, h, r = 0, dx = .3) => loc(r > 0 ? rrUV(u, v, u + w, v + h, Math.min(r, w/2, h/2), 4) : rectUV(u, v, u + w, v + h), dx);
const lcirc = (cu, cv, r, dx = .3, n = 18) => loc(ellUV(cu, cv, r, r, n), dx);
const ringF = (x, r, n = 32) => on(PX(x), ellUV(PCY, PCZ, r, r, n));
const wBox = pts => [[0,1,2].map(i => Math.min(...pts.map(p => p[i]))), [0,1,2].map(i => Math.max(...pts.map(p => p[i])))];
const clamp01 = v => Math.max(0, Math.min(1, v));
let SHAKE = [0, 0];
const shk = svg => !window.HH_CSS_SHAKE && (SHAKE[0] || SHAKE[1]) ? `<g transform="translate(${f(SHAKE[0])} ${f(SHAKE[1])})">${svg}</g>` : svg;

/* ---------- clothes: a flat outline in a plane, centred, rotated ---------- */
const GARMENT = {
  shirt:    [[-2.2,4],[2.2,4],[5,2.2],[3.8,.3],[2.6,1],[2.6,-4],[-2.6,-4],[-2.6,1],[-3.8,.3],[-5,2.2]],
  sock:     [[-1.5,4.2],[1.5,4.2],[1.5,-.6],[4.6,-1.4],[4.6,-4],[-1.5,-4]],
  trousers: [[-3,4.2],[3,4.2],[3.5,-4.2],[.9,-4.2],[0,-.4],[-.9,-4.2],[-3.5,-4.2]],
  towel:    [[-4.6,3.2],[4.6,3.2],[4.6,-3.2],[-4.6,-3.2]],
};
const SPOTS = [[-1.2,1.4],[1.6,-1.6],[-.4,-2.6]];
function garment(plane, cu, cv, c, rot, sc, clean){
  const cr = Math.cos(rot), sr = Math.sin(rot), tf = ([u, v]) => [cu + sc*(u*cr - v*sr), cv + sc*(u*sr + v*cr)];
  let s = shape(on(plane, GARMENT[c.kind].map(tf)), c.col, .8);
  if (c.kind === 'towel') s += shape(on(plane, [[-4.6,1.2],[4.6,1.2],[4.6,.2],[-4.6,.2]].map(tf)), '#e98fb0', 0);
  if (c.kind === 'shirt') s += fill(pd(on(plane, ellUV(0, 3.2, 1.1, .7, 8).map(tf))), mix(c.col, '#000000', .25));
  if (clean < .99) for (const p of SPOTS) s += fill(pd(on(plane, ellUV(p[0], p[1], .9, .7, 8).map(tf))), '#7a5a3a', `opacity="${f(.8*(1 - clean))}"`);
  return s;
}

/* ---------- inside the drum, seen through the opening (real 3D: inner wall, back, lifters, clothes, water) ---------- */
function drumInside(st){
  const A = ringF(W, RP), B = ringF(XB, RP);
  let s = loft(A, B, n => toneI(n, STEEL), true);
  s += fill(pd(B), STEEL.d);
  // the drum's holes on its back wall turn with it
  let holes = '';
  for (let r of [5, 9.5, 13]) for (let i = 0; i < Math.round(r*1.1); i++){ const a = st.drumA + i*2*Math.PI/Math.round(r*1.1) + r;
    holes += pd(on(PX(XB + .1), ellUV(PCY + r*Math.cos(a), PCZ + r*Math.sin(a), .55, .55, 6))); }
  s += fill(holes, '#3e4446');
  const parts = [];
  for (let k = 0; k < 3; k++){ const a = st.drumA + k*2*Math.PI/3, r = RP - 1.6, y = PCY + r*Math.cos(a), z = PCZ + r*Math.sin(a);
    parts.push({ box: [[XB + 1, y - 1.4, z - 1.4], [W - 1, y + 1.4, z + 1.4]], svg: rod([XB + 1, y, z], [W - 1, y, z], 1.4, STEEL, toneI, .6) }); }
  st.items.forEach((it, i) => { if (it.where !== 'drum') return;
    const c = CLOTHES[i], x = W - 5 - i*3.6;
    let r, a, rot;
    // big enough to read through the glass on a phone: the clothes are the reason to watch
    if (st.spin > .5){ r = RP - 5.2; a = st.drumA + i*1.26; rot = a + Math.PI/2; }
    else { const w = Math.sin(st.drumA*.9 + i*1.7); r = 6 + 3.5*Math.abs(Math.sin(st.drumA*.6 + i*1.1)); a = -Math.PI/2 + 1.45*w; rot = st.drumA*.5 + i; }   // lifters carry them up the wall, then they drop
    const y = PCY + r*Math.cos(a), z = PCZ + r*Math.sin(a);
    parts.push({ at: [x, y, z], box: [[x - .1, y - 5, z - 5], [x + .1, y + 5, z + 5]], svg: garment(PX(x), y, z, c, rot, 1.12, st.clean) }); });
  s += byDepth(parts);
  if (st.water > .01){
    const lvl = PCZ - RP + st.water*RP*1.25, dz = Math.max(-RP + .01, Math.min(RP - .01, lvl - PCZ)), hw = Math.sqrt(RP*RP - dz*dz), al = Math.asin(dz/RP);
    const seg = []; for (let i = 0; i <= 24; i++){ const a = Math.PI - al + (Math.PI + 2*al)*i/24; seg.push([PCY + RP*Math.cos(a), PCZ + RP*Math.sin(a)]); }
    s += fill(pd(on(PZ(lvl), rectUV(XB, PCY - hw, W, PCY + hw))), mix(WATER, '#ffffff', .35), 'opacity=".5"');
    s += fill(pd(on(PX(W - .2), seg)), WATER, 'opacity=".38"');
    if (st.foam > .02){ let fo = '';
      for (let j = 0; j < 9; j++){ const y = PCY - hw*.9 + hw*1.8*j/8, rr = 1 + .9*((j*37) % 5)/5 + .5*Math.sin(st.drumA*2 + j);
        fo += pd(on(PX(W - .15), ellUV(y, lvl + .3 + .4*Math.sin(j*1.9 + st.drumA), rr*st.foam + .2, rr*st.foam + .2, 8))); }
      s += fill(fo, '#ffffff', `opacity="${f(.9*st.foam)}"`); }
  }
  return clipTo(ringF(W + .3, RP), s);
}

/* ---------- the door: a ring with a glass, turning on its hinge (left of the porthole) ---------- */
function door(st){
  const th = st.door*100*Math.PI/180, hy = PCY + RO + 1, hx = W + 2;
  const c = [hx + (RO + 1)*Math.sin(th), hy - (RO + 1)*Math.cos(th), PCZ], n = [Math.cos(th), Math.sin(th), 0], e1 = [-Math.sin(th), Math.cos(th), 0];
  const ring = (r, off, N = 30) => Array.from({length: N}, (_, i) => { const a = i/N*2*Math.PI, cu = r*Math.cos(a), cv = r*Math.sin(a);
    return [c[0] + n[0]*off + e1[0]*cu, c[1] + n[1]*off + e1[1]*cu, c[2] + cv]; });
  const A = ring(RO, -2), B = ring(RO, 2), front = facing(n), nn = front ? n : n.map(v => -v), off = front ? 2 : -2;
  let s = loft(A, B, nr => tone(nr, DOORM));
  const outer = front ? B : A, inner = ring(RG, off*1.02);
  s += `<path d="${pd(outer)}${pd(inner.slice().reverse())}" fill="${tone(nn, DOORM)}" fill-rule="evenodd"/>`;
  s += ink(pd(outer), 1.4) + ink(pd(inner), 1.2) + ink(pd(ring(RG + 2, off*1.01)), .7);
  if (front){
    s += fill(pd(ring(RG, 1)), '#cfe9f0', 'opacity=".28"');
    s += ink(pd([ring(RG*.8, 1.1, 12)[7], ring(RG*.8, 1.1, 12)[9]], false), 1.6).replace(INK, '#ffffff').replace('stroke-width', 'opacity=".55" stroke-width');
    // the grip, on the side away from the hinge
    const g0 = ring(RO - 3, 2.4, 12)[5], g1 = ring(RO - 3, 2.4, 12)[7];
    s += rod(g0, g1, 1.1, DOORM, tone, .9);
  } else {
    s += fill(pd(ring(RG - 1.5, -4.5)), '#cfe9f0', 'opacity=".4"') + ink(pd(ring(RG - 1.5, -4.5)), .8);
  }
  s += hullInk([...A, ...B], 2.2);
  const pts = [...A, ...B];
  return { box: wBox(pts), svg: act('door', s) };
}

/* ---------- soap drawer (top left), with its tray outside the cabinet when pulled ---------- */
function drawer(st){
  const o = st.drawer*13, y0 = Y0 + D - 20, y1 = Y0 + D - 3, z0 = H - 12, z1 = H - 4, xf = W + o;
  let s = '';
  if (o > .3){
    const A = on(PZ(z0 + .5), rectUV(W, y0 + .6, xf, y1 - .6)), B = on(PZ(z1 - .8), rectUV(W, y0 + .6, xf, y1 - .6));
    let soap = '';
    if (st.soap > .01) soap = fill(pd(on(PZ(z0 + 1 + 4*st.soap), rectUV(W, y0 + 1.2, xf - .6, y1 - 1.2))), SOAPC, 'opacity=".85"');
    s += openShell(A, B, nr => toneI(nr, { l:'#f3efe4', m:'#dcd6c6', d:'#b3ac9a' }), soap) + hullInk([...A, ...B], 1);
  }
  s += box(xf, y0, z0, xf + 1.4, y1, z1, KNOBM, toneI, 1);
  if (facing([1,0,0])) s += shape(on(PX(xf + 1.45), rrUV(y0 + 5, z0 + 2.6, y1 - 5, z0 + 4, .7, 3)), '#5c544a', .6);
  return { box: [[W, y0, z0], [xf + 1.4, y1, z1]], svg: act('drawer', s) };
}

/* ---------- the soap bottle: stands on the top; pouring, it moves over the drawer and tips forward ---------- */
function bottle(st){
  const p = st.pour, rest = [16, Y0 + 46, H], over = [W + 9, Y0 + D - 11, H + 6];
  const k = ease(Math.min(1, p*2.2)), tip = p > .45 ? Math.min(1, (p - .45)*4) : 0, back = p > .85 ? (p - .85)/.15 : 0;
  const kk = back ? 1 - ease(back) : k, tt = back ? 1 - ease(back) : ease(tip);
  const base = rest.map((v, i) => v + (over[i] - v)*kk), phi = -1.35*tt;           // tips toward +x (the front)
  const ax = [-Math.sin(phi), 0, Math.cos(phi)], at = t => base.map((v, i) => v + ax[i]*t);
  let s = rod(at(0), at(5), 5, BOTM, toneI, 1) + rod(at(5), at(12), 5.05, matOf('#fbf9f2'), toneI, 1) + rod(at(12), at(16), 5, BOTM, toneI, 1)
    + rod(at(16), at(19), 4.2, BOTM, toneI, 1, 2) + rod(at(19), at(21.5), 2.2, CAPM, toneI, .9);
  if (tt > .6 && back === 0){ const sp = at(21.5), dr = [W + 7, Y0 + D - 11, H - 7];
    s += `<path d="${pd([sp, [(sp[0] + dr[0])/2 + 1, sp[1], (sp[2] + dr[2])/2], dr], false)}" fill="none" stroke="${SOAPC}" stroke-width="1.6" stroke-linecap="round" opacity=".9"/>`; }
  const pts = [at(0), at(21.5)].flatMap(q => [[q[0] - 5, q[1] - 5, q[2] - 5], [q[0] + 5, q[1] + 5, q[2] + 5]]);
  const b = wBox(pts); b[0][2] = Math.max(b[0][2], H);
  return { box: b, svg: act('bottle', s) };
}

/* ---------- laundry basket on the floor at the viewer's right ---------- */
const BAS = [12, Y0 + D + 6, 42, Y0 + D + 32], BH = 22, BASC = [27, Y0 + D + 19];
function basket(st){
  const A = on(PZ(.01), rrUV(BAS[0] + 2, BAS[1] + 2, BAS[2] - 2, BAS[3] - 2, 4, 5)), B = on(PZ(BH), rrUV(...BAS, 5, 5));
  const pile = []; let n = 0;
  st.items.forEach((it, i) => { if (it.where !== 'basket') return; const z = 6 + n*2.4, c = CLOTHES[i];
    pile.push(garment(PZ(z), BASC[0] + ((i*7) % 5) - 2, BASC[1] + ((i*5) % 7) - 3, c, i*1.1, 1.05, st.clean > .99 && it.washed ? 1 : st.cleanOf(i))); n++; });
  let weave = '';
  for (let z = 5; z < BH; z += 4.2){ const r = on(PZ(z), rrUV(BAS[0] + 2*(1 - z/BH), BAS[1] + 2*(1 - z/BH), BAS[2] - 2*(1 - z/BH), BAS[3] - 2*(1 - z/BH), 4.5, 5)); weave += pd(r); }
  const s = openShell(A, B, nr => toneI(nr, WICKER), pile.join(''))
    + `<path d="${weave}" fill="none" stroke="${WICKER.d}" stroke-width=".7" opacity=".7"/>`
    + ink(pd(B), 1.4) + hullInk([...A, ...B], 2);
  return { box: [[BAS[0], BAS[1], 0], [BAS[2], BAS[3], BH]], svg: act('basket', s) };
}

/* ---------- a hose or wire as short pieces, so each piece sorts with the solids around it ---------- */
function hose(pts, r, m){ const out = [];
  for (let i = 0; i < pts.length - 1; i++){ const a = pts[i], b = pts[i + 1];
    out.push({ box: [[0,1,2].map(k => Math.min(a[k], b[k]) - r), [0,1,2].map(k => Math.max(a[k], b[k]) + r)], svg: rod(a, b, r, m, toneI, .7) }); }
  return out; }
const HOSEM = matOf('#d8d2c3');

/* ---------- outside the back: inlet hose, drain hose, power cord (they exist from every side) ---------- */
function backParts(){
  return [
    ...hose([[0, Y0 + 9, 78], [-5, Y0 + 9, 78], [-8, Y0 + 9, 70], [-9, Y0 + 9, 1.5], [-26, Y0 + 9, 1.5]], 1.4, matOf('#9cc7e6')),
    ...hose([[0, Y0 + 20, 20], [-5, Y0 + 20, 22], [-6, Y0 + 20, 56], [-9, Y0 + 20, 62], [-12, Y0 + 20, 56], [-12, Y0 + 20, 48]], 1.6, HOSEM),
    ...hose([[0, Y0 + 44, 74], [-4, Y0 + 44, 70], [-5, Y0 + 45, 1.2], [-20, Y0 + 50, 1.2]], 1, DARK),
  ];
}

/* ---------- the cabinet: front with panel, porthole and kick plate; back; sides from the extrude ---------- */
function body(st, m, mark){
  const FRONT = facing([1,0,0]), BACK = facing([-1,0,0]);
  let s = '';
  if (FRONT){ const fr = tone([1,0,0], m);
    s += fill(pd(on(PX(W), OUT)), fr);
    // control panel band
    s += shape(lrr(2, 2, 56, 14, 2.5), PANEL, 1);
    s += shape(lrr(3, 3.5, 17, 8.5, 1, .32), '#5c544a', .7);                                 // drawer opening
    // display: time left, or what it needs next
    s += shape(lrr(21, 4.6, 13, 7, 1.2, .34), '#1d2a26', .8);
    s += tx(W + .4, Y0 + D - 27.5, H - 9.3, displayText(st), 2.7, '#8af0ae', 800);
    // program dots around the dial (its colour shows the program)
    PROGS.forEach((p, i) => { const a = (-40 + 40*i)*Math.PI/180;
      s += shape(lcirc(40 + 6.6*Math.sin(a), 9 - 6.6*Math.cos(a), i === st.prog ? 1.3 : 1, .35, 10), p.col, .5); });
    // start button ring lights green while it runs
    s += shape(lcirc(52, 9, 3.6, .33), st.phase === 'run' ? '#43c25c' : '#e2ddd0', .6);
    // porthole: the drum behind the opening, then the gasket ring over its edge
    s += mark ? '<!--DYN-->' + drumInside(st) + '<!--/DYN-->' : drumInside(st);
    s += `<path d="${pd(ringF(W + .32, RGK))}${pd(ringF(W + .32, RP).reverse())}" fill="${RUBBER}" fill-rule="evenodd"/>` + ink(pd(ringF(W + .33, RGK)), 1.2) + ink(pd(ringF(W + .33, RP)), 1);
    // door lock light (right of the door)
    s += shape(lcirc(53, 30, 1.2, .34), st.lock ? '#e2483d' : '#c9c1b2', .5);
    // kick plate and the pump filter flap
    s += ink(pd(loc([[2, 76.5], [58, 76.5]], .33), false), 1.1);
    s += shape(lrr(45, 77.6, 11, 4, 1, .34), mix(fr, '#000000', .08), .7);
    s += ink(pd(on(PX(W), OUT)), 2.2);
  }
  if (BACK){ const tb = tone([-1,0,0], m);
    s += fill(pd(on(PX(0), OUT)), tb);
    s += shape(on(PX(-.2), rrUV(Y0 + 18, 30, Y0 + 42, 50, 2)), mix(tb, '#000000', .1), .9);      // service panel
    s += shape(on(PX(-.25), rrUV(Y0 + 24, 62, Y0 + 38, 70, 1)), '#f3f0e6', .7);                 // rating plate
    for (const [y, z] of [[Y0 + 9, 78], [Y0 + 20, 20], [Y0 + 44, 74]]) s += shape(on(PX(-.2), ellUV(y, z, 2.6, 2.6, 12)), '#5c544a', .6);
    s += ink(pd(on(PX(0), OUT)), 2.2);
  }
  s += extrude(OUT, 0, W, m);
  // the top's seam and the side vents on the far left side
  if (facing([0,0,1])) s += ink(pd(on(PZ(H), rectUV(1.5, Y0 + 1.5, W - 1.5, Y0 + D - 1.5))), .7);
  s += hullInk([...on(PX(0), OUT), ...on(PX(W), OUT)], 2.8);
  return s;
}
function displayText(st){
  if (st.phase === 'run'){ const left = Math.max(0, Math.ceil((st.T - st.t)/1000)); return `0:${String(left).padStart(2, '0')}`; }
  if (st.phase === 'done') return 'CLEAN';
  return PROGS[st.prog].name.toUpperCase();
}
const feet = () => [[4, Y0 + 4], [4, Y0 + D - 4], [W - 4, Y0 + 4], [W - 4, Y0 + D - 4]].map(([x, y]) => ({ box: [[x - 2.2, y - 2.2, 0], [x + 2.2, y + 2.2, ZF]], svg: cyl(x, y, 0, ZF, 2.2, DARK, toneI, .8, 14) }));

/* ---------- see-through: what is inside ---------- */
const TUBM = { l:'#d6dadb', m:'#b4bbbe', d:'#7f888b' }, PCB = matOf('#3f8f5a'), CONC = matOf('#bdb7aa');
let MECH_LABELS = '';
function mech(st, k){
  const parts = [], put = (b, svg) => parts.push({ box: b, svg });
  const bx = (x0, y0, z0, x1, y1, z1, m, w = .8) => put([[x0, y0, z0], [x1, y1, z1]], box(x0, y0, z0, x1, y1, z1, m, toneI, w));
  const run = st.phase === 'run', filling = run && st.stage === 'fill', draining = run && st.stage === 'drain';
  // base pan and top crossbar
  bx(3, Y0 + 3, ZF, W - 3, Y0 + D - 3, ZF + .8, matOf('#9aa0a2'), .6);
  bx(28, Y0 + 6, H - 2.5, 36, Y0 + D - 6, H - 1.2, matOf('#9aa0a2'), .6);
  // tub with the drum inside it (one part: the drum, its heater and the tub, drawn inside out)
  { const tubA = 10, tubB = W - 4, drA = 12, drB = W - 6;
    let s = rod([14, PCY, PCZ - 22.4], [W - 8, PCY, PCZ - 22.4], .9, matOf(st.heat > .05 ? '#ff7a3d' : '#9a8f86'), toneI, .5);
    s += cylX(drA, drB, PCY, PCZ, 21, STEEL, toneI, 1, 28);
    // holes on the drum's side that face the viewer, turning with it
    let ho = '';
    for (let i = 0; i < 18; i++) for (const x of [drA + 8, drA + 18, drA + 28, drA + 38]){
      const a = st.drumA + i*2*Math.PI/18 + x*.07, nrm = [0, Math.cos(a), Math.sin(a)];
      if (facing(nrm)) ho += pd(on(PX(x), [[PCY + 21.05*Math.cos(a), PCZ + 21.05*Math.sin(a)]]).map(p => p).concat([[x + .8, PCY + 21.05*Math.cos(a), PCZ + 21.05*Math.sin(a)]]), false); }
    s += `<path d="${ho}" fill="none" stroke="#4e5558" stroke-width="1.6" stroke-linecap="round"/>`;
    s += `<g opacity=".5">${cylX(tubA, tubB, PCY, PCZ, 24, TUBM, toneI, 1.4, 30)}</g>`;
    put([[tubA, PCY - 24, PCZ - 24], [tubB, PCY + 24, PCZ + 24]], s); }
  // shaft, big pulley (spokes turn), motor under the tub with its small pulley, and the belt
  put([[4, PCY - 1.5, PCZ - 1.5], [10, PCY + 1.5, PCZ + 1.5]], rod([10, PCY, PCZ], [4, PCY, PCZ], 1.5, METAL, toneI, .6));
  { let s = cylX(2.4, 4.6, PCY, PCZ, 14, matOf('#c3c8ca'), toneI, 1, 30), sp = '';
    if (facing([-1,0,0])) for (let i = 0; i < 3; i++){ const a = st.drumA + i*2*Math.PI/3; sp += pd([[2.3, PCY, PCZ], [2.3, PCY + 12*Math.cos(a), PCZ + 12*Math.sin(a)]], false); }
    put([[2.4, PCY - 14, PCZ - 14], [4.6, PCY + 14, PCZ + 14]], s + `<path d="${sp}" fill="none" stroke="${INK}" stroke-width="1.6"/>`); }
  put([[1.8, PCY - 15, 7], [2.3, PCY + 15, PCZ + 15]], `<path d="${pd([[2, PCY - 1.6, 9], [2, PCY - 14, PCZ]], false)}${pd([[2, PCY + 1.6, 9], [2, PCY + 14, PCZ]], false)}" fill="none" stroke="#2b2523" stroke-width="1.5"/>`);
  put([[2.4, PCY - 1.6, 7.4], [4.2, PCY + 1.6, 10.6]], cylX(2.4, 4.2, PCY, 9, 1.6, METAL, toneI, .6, 12));
  put([[4.2, PCY - 5, 4], [20, PCY + 5, 14]], cylX(4.2, 20, PCY, 9, 5, matOf('#5f676b'), toneI, 1, 20));
  // suspension springs from the crossbar to the tub, dampers from the base pan to the tub
  for (const dy of [-14, 14]){ const y = PCY + dy, zt = PCZ + Math.sqrt(24*24 - dy*dy), sp = [], n = 16;
    for (let i = 0; i <= n; i++) sp.push([32 + (i && i < n ? (i % 2 ? 1.4 : -1.4) : 0), y, zt + (H - 2.5 - zt)*i/n]);
    put([[30.5, y - .5, zt], [33.5, y + .5, H - 2.5]], `<path d="${pd(sp, false)}" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/><path d="${pd(sp, false)}" fill="none" stroke="#e3e7e8" stroke-width=".6" stroke-linejoin="round"/>`); }
  for (const dy of [-10, 10]){ const y = PCY + dy, zt = PCZ - Math.sqrt(24*24 - dy*dy);
    put([[28.4, y - 1.6, ZF + .8], [31.6, y + 1.6, 10]], rod([30, y, ZF + .8], [30, y, 10], 1.6, matOf('#6f777b'), toneI, .7));
    put([[29.1, y - .9, 10], [30.9, y + .9, zt]], rod([30, y, 10], [30, y, zt], .9, METAL, toneI, .6)); }
  // counterweight on the tub's front top
  bx(44, PCY - 14, 61, 55, PCY + 14, 68, CONC, .9);
  // water in: valve at the back, hose to the drawer housing, housing, hose down to the tub
  bx(1, Y0 + 6, 75.5, 6, Y0 + 12, 81, matOf('#9aa0a2'), .7);
  bx(2, Y0 + 7, 81, 5, Y0 + 11, 83, matOf('#5cb87a'), .5);
  const wet = matOf(filling ? WATER : '#d8d2c3');
  hose([[6, Y0 + 9, 79], [20, Y0 + 9, 81.5], [20, Y0 + 50, 81.5], [40, Y0 + 50, 80]], .9, wet).forEach(p => parts.push(p));
  bx(40, Y0 + 40, 72, W - .5, Y0 + 57, 83, matOf('#e6e1d4'), .8);
  hose([[46, Y0 + 46, 72], [46, Y0 + 44, 58]], 1.1, wet).forEach(p => parts.push(p));
  // water out: tub bottom -> pump (behind the filter flap) -> back of the cabinet
  const out = matOf(draining ? '#a9c9b8' : '#d8d2c3');
  hose([[40, PCY, 14.2], [40, PCY, 8], [49, Y0 + 13, 8]], 1.1, out).forEach(p => parts.push(p));
  bx(47, Y0 + 5, 3, 56, Y0 + 14, 11, matOf('#6f777b'), .8);
  hose([[47, Y0 + 12, 6], [6, Y0 + 18, 6], [2, Y0 + 20, 18], [0, Y0 + 20, 20]], 1.1, out).forEach(p => parts.push(p));
  // control board behind the panel, its wire down the right wall to the motor
  bx(53, Y0 + 5, 72, 54.5, Y0 + 22, 82, PCB, .7);
  hose([[53, Y0 + 4, 72], [53, Y0 + 4, 12], [20, Y0 + 4, 10], [20, PCY - 3, 9]], .45, matOf(run ? '#ef8a3c' : '#5c544a')).forEach(p => parts.push(p));
  // pressure sensor and its tube to the tub bottom
  put([[28, Y0 + 50, 78], [32, Y0 + 54, 82]], cyl(30, Y0 + 52, 78, 82, 2, matOf('#e6e1d4'), toneI, .7, 12));
  hose([[30, Y0 + 54, 78], [30, Y0 + 56, 20], [30, Y0 + 41, 16.5]], .35, matOf('#cfe9f0')).forEach(p => parts.push(p));
  // door lock beside the porthole
  bx(W - 3.5, Y0 + 8, 36, W - .5, Y0 + 12, 40, matOf(st.lock ? '#e2483d' : '#9aa0a2'), .6);
  MECH_LABELS = k <= .6 ? '' : xrCallouts([
    { at: [W - 10, PCY + 21, PCZ + 12], text: 'DRUM', on: run && st.stage !== 'fill' },
    { at: [16, PCY + 23, PCZ + 6], text: 'TUB', on: st.water > .05 },
    { at: [12, PCY, 9], text: 'MOTOR', on: run && st.stage !== 'fill' },
    { at: [2, PCY - 8, 22], text: 'BELT', on: run },
    { at: [3.5, PCY + 10, PCZ + 9], text: 'PULLEY', on: run },
    { at: [32, PCY - 14, 74], text: 'SPRINGS', on: st.spin > .5 },
    { at: [30, PCY + 10, 6], text: 'DAMPERS', on: st.spin > .5 },
    { at: [50, PCY, 68], text: 'COUNTERWEIGHT', on: st.spin > .5 },
    { at: [3.5, Y0 + 9, 81], text: 'WATER VALVE', on: filling },
    { at: [52, Y0 + 9, 7], text: 'DRAIN PUMP', on: draining },
    { at: [30, PCY, PCZ - 22.4], text: 'HEATER', on: st.heat > .05 },
    { at: [53.5, Y0 + 13, 82], text: 'CONTROL BOARD', on: run },
    { at: [W - 2, Y0 + 10, 40], text: 'DOOR LOCK', on: st.lock },
  ], [0, W, Y0, Y0 + D, 0, H]);
  return byDepth(parts);
}

/* ---------- scene ---------- */
function scene(st, m){
  const k = ease(st.xr || 0);
  let s = '';
  s += castShadow([...on(PX(0), OUT), ...on(PX(W), OUT)]);
  s += castShadow([...on(PZ(0), rrUV(...BAS, 5, 5)), ...on(PZ(BH), rrUV(...BAS, 5, 5))]);
  let bd = body(st, m, k === 0);
  if (k > 0) bd = xrGhost(bd, '', k, OUT, 0, W, m) + `<g opacity="${f(k)}">${mech(st, k)}</g>`;
  const fade = svg => k > 0 ? `<g opacity="${f(1 - .8*k)}">${svg}</g>` : svg;
  const items = [
    { box: [[0, Y0, ZF], [W, Y0 + D, H]], svg: shk(bd) },
    ...feet(),
    ...backParts(),
  ];
  const dr = door(st); dr.svg = shk(fade(dr.svg)); items.push(dr);
  const dw = drawer(st); dw.svg = shk(dw.svg); items.push(dw);
  // program dial and start button, on the panel
  { const a = (-40 + 40*st.progA)*Math.PI/180, [x, y, z] = FL(40, 9, 0), pc = PROGS[st.prog].col;
    let dial = cylX(W, W + 2.6, y, z, 4.4, KNOBM, toneI, 1.1, 24);
    // the pointer turns to the program, and its tip wears the program's colour
    if (facing([1,0,0])){ const tip = [W + 2.66, y - 3*Math.sin(a), z + 3*Math.cos(a)];
      dial += ink(pd([[W + 2.65, y, z], tip], false), 1.9) + shape(on(PX(W + 2.7), ellUV(tip[1], tip[2], 1.15, 1.15, 10)), pc, .7); }
    items.push({ box: [[W, y - 4.4, z - 4.4], [W + 2.6, y + 4.4, z + 4.4]], svg: shk(act('dial', dial)) }); }
  { const [x, y, z] = FL(52, 9, 0), pr = st.press > 0 ? .8 : 0;
    items.push({ box: [[W, y - 2.6, z - 2.6], [W + 1.8, y + 2.6, z + 2.6]], svg: shk(act('start', cylX(W, W + 1.8 - pr, y, z, 2.6, st.phase === 'run' ? matOf('#43c25c') : KNOBM, toneI, 1, 16))) }); }
  items.push(basket(st));
  // clothes in flight between the basket and the drum
  st.items.forEach((it, i) => { if (it.where !== 'fly') return;
    // a curve round the cabinet's front-left corner (a straight line would pass through the cabinet)
    const t = ease(clamp01(it.t)), a = [BASC[0], BASC[1], 14], b = [W + 2, PCY, PCZ], [p0, p2] = it.dir > 0 ? [a, b] : [b, a];
    const p1 = [W + 16, BASC[1] + 2, 44], q = [(1 - t)*(1 - t), 2*(1 - t)*t, t*t];
    const p = [0, 1, 2].map(j => q[0]*p0[j] + q[1]*p1[j] + q[2]*p2[j] + (j === 2 ? 8*Math.sin(Math.PI*t) : 0));
    items.push({ at: p, box: [[p[0] - .2, p[1] - 4, p[2] - 4], [p[0] + .2, p[1] + 4, p[2] + 4]], svg: garment(PX(p[0]), p[1], p[2], CLOTHES[i], t*4 + i, 1.35, st.cleanOf(i)) }); });
  s += byDepth(items);
  s += shk(bottle(st).svg);                                        // always on top of the cabinet: drawn last
  if (k > .6) s += MECH_LABELS;
  return s;
}

/* ---------- behaviour: one state object, one clock ---------- */
let ui;
const sinceT = () => performance.now();
function timeline(st){
  const kk = PROGS[st.prog].k, T = [2000, 4200, 1200, 1200, 1800, 1100, 3200, 1100].map(v => v*kk);
  return T;
}
const STAGES = ['fill', 'wash', 'drain', 'rfill', 'rinse', 'rdrain', 'spin', 'stop'];
function stepRun(st, dt){
  const T = timeline(st); st.t += dt*1000;
  let acc = 0, i = 0; for (; i < T.length; i++){ if (st.t < acc + T[i]) break; acc += T[i]; }
  if (i >= T.length){ st.phase = 'done'; st.stage = ''; st.water = 0; st.foam = 0; st.spin = 0; st.drumV = 0; st.heat = 0; SHAKE = [0, 0];
    setTimeout(() => { st.lock = false; ui.render(); hook('done'); }, 600); return false; }
  const u = (st.t - acc)/T[i], stg = STAGES[i]; st.stage = stg === 'rfill' ? 'fill' : stg === 'rdrain' ? 'drain' : stg;
  if (st.stg !== stg){ st.stg = stg; hook('stage', { name: stg, ms: T[i] - (st.t - acc) }); }
  const tumble = Math.sign(Math.sin(st.t/1300*Math.PI)) * 2.2;
  if (stg === 'fill'){ st.water = .58*u; st.soap = Math.max(0, 1 - u*1.4); st.foam = Math.min(.7, u); st.drumV = 1.2; st.heat = u*PROGS[st.prog].heat; }
  else if (stg === 'wash'){ st.water = .58; st.foam = Math.min(1, .7 + u); st.drumV = tumble; st.clean = Math.max(st.clean, .6*u); st.heat = (1 - u)*PROGS[st.prog].heat; }
  else if (stg === 'drain'){ st.water = .58*(1 - u); st.foam = .5*(1 - u) + .3; st.drumV = .8; st.heat = 0; }
  else if (stg === 'rfill'){ st.water = .45*u; st.foam = .3*(1 - u); st.drumV = 1; }
  else if (stg === 'rinse'){ st.water = .45; st.foam = 0; st.drumV = tumble; st.clean = Math.max(st.clean, .6 + .4*u); }
  else if (stg === 'rdrain'){ st.water = .45*(1 - u); st.drumV = .8; }
  else if (stg === 'spin'){ st.water = 0; st.spin = 1; st.drumV = PROGS[st.prog].spin*Math.min(1, u*2.5);
    const a = .35*Math.min(1, u*3)*INK_K; SHAKE = [a*Math.sin(st.t*.09), a*Math.cos(st.t*.13)]; }
  else { st.spin = u < .5 ? 1 : 0; st.drumV = PROGS[st.prog].spin*(1 - u)*(1 - u); SHAKE = [0, 0]; }
  st.drumA += st.drumV*dt;
  return true;
}
// one frame driver for everything that moves (door, drawer, pour, flights, the cycle)
let ticking = false;
function tick(){
  if (ticking) return; ticking = true;
  ui.animate(dt => { const st = ui.st; let busy = false;
    const ease1 = (key, tgt, sp) => { if (st[key] !== tgt){ st[key] += Math.sign(tgt - st[key])*Math.min(Math.abs(tgt - st[key]), dt*sp); busy = true; } };
    ease1('door', st.doorT, 1.8); ease1('drawer', st.drawerT, 2.6); ease1('progA', st.prog, 3.2);
    if (st.pour > 0){ st.pour = Math.min(1, st.pour + dt/2.4); if (st.pour > .55 && st.soap < 1) st.soap = Math.min(1, st.soap + dt*1.6); busy = true;
      if (st.pour >= 1){ st.pour = 0; st.drawerT = 0; hook('soap'); } }
    st.items.forEach((it, i) => { if (it.where !== 'fly') return; busy = true;
      if (it.delay > 0){ it.delay -= dt; return; }
      it.t += dt/.75; if (it.t >= 1){ it.where = it.dir > 0 ? 'drum' : 'basket'; if (it.dir < 0) it.washed = true; hook(it.dir > 0 ? 'in' : 'out', i); } });
    if (st.press > 0){ st.press = Math.max(0, st.press - dt*5); busy = true; }
    if (st.phase === 'run'){ busy = stepRun(st, dt) || busy; }
    if (!busy) ticking = false;
    return busy; });
}
// hooks for the kid layer (sounds, next-step glow, the app bridge); the figure works without it
const hook = (ev, a) => { if (window.HH && HH.on) HH.on(ev, a, ui.st); };
const say = t => ui.flash(t, 1800);

const inDrum = st => st.items.filter(i => i.where === 'drum').length;
const inBasket = st => st.items.filter(i => i.where === 'basket').length;
function openDoor(st){
  if (st.lock) return say('Locked while it washes'), hook('nope');
  st.doorT = st.doorT > .5 ? 0 : 1; hook(st.doorT ? 'doorOpen' : 'doorClose'); tick(); }
function load(st){
  if (st.phase === 'run') return say('It is washing'), hook('nope');
  if (st.phase === 'done') return unload(st);
  if (!inBasket(st)) return say('All in!'), hook('nope');
  if (st.doorT < 1){ st.doorT = 1; hook('doorOpen'); }
  let d = st.door < .9 ? .55 : 0;
  st.items.forEach(it => { if (it.where === 'basket'){ it.where = 'fly'; it.dir = 1; it.t = 0; it.delay = d; d += .22; } });
  tick(); }
function addSoap(st){
  if (st.phase === 'run') return say('It is washing'), hook('nope');
  if (st.soap > .9) return say('Soap is in'), hook('nope');
  if (st.pour > 0) return;
  st.drawerT = 1; st.pour = .001; hook('pour'); tick(); }
function setProg(st, i){
  if (st.phase === 'run') return say('Wait for it to finish'), hook('nope');
  if (st.prog === i) return;
  st.prog = i; say(PROGS[i].name + ' wash'); hook('prog', i); tick(); }
function start(st){
  st.press = 1;
  if (st.phase === 'run') return say('It is washing'), hook('nope'), tick();
  if (st.phase === 'done') return say('Take the clothes out'), hook('nope'), tick();
  if (!inDrum(st)) return say('Put the clothes in first'), hook('nope'), tick();
  if (st.soap < .5) return say('Add soap first'), hook('nope'), tick();
  st.doorT = 0; st.lock = true; st.phase = 'run'; st.t = 0; st.clean = 0; st.T = timeline(st).reduce((a, b) => a + b, 0); hook('start'); tick(); }
function unload(st){
  if (st.phase === 'run' || st.lock) return say('Wait for the lock to open'), hook('nope');
  if (!inDrum(st)) return;
  if (st.doorT < 1){ st.doorT = 1; hook('doorOpen'); }
  let d = st.door < .9 ? .55 : 0;
  st.items.forEach(it => { if (it.where === 'drum'){ it.where = 'fly'; it.dir = -1; it.t = 0; it.delay = d; d += .22; } });
  tick(); }
function reset(st){
  Object.assign(st, freshState()); ui.render(); }
function freshState(){
  return { stg: '', progA: 1, door: 0, doorT: 0, drawer: 0, drawerT: 0, soap: 0, pour: 0, prog: 1, phase: 'idle', stage: '', t: 0, T: 0,
    water: 0, foam: 0, clean: 0, heat: 0, spin: 0, drumA: 0, drumV: 0, lock: false, press: 0,
    items: CLOTHES.map(() => ({ where: 'basket', t: 0, dir: 1, delay: 0, washed: false })),
    cleanOf(i){ return this.items[i].washed || this.items[i].where === 'drum' || this.phase === 'done' ? this.clean : 0; } };
}

const st0 = freshState();
ui = mountFigure({
  fig: 'A', turn: 'full', title: 'Washing machine', palette: 'mint', credit: false,
  size: [W + 14, BAS[3] + 2, H + 12], center: [W/2 + 4, (BAS[3] + 2)/2],
  state: st0,
  scene,
  buttons: [
    { label: 'Open the door', onClick: st => openDoor(st) },
    { label: 'Load the clothes', onClick: st => load(st) },
    { label: 'Add soap', onClick: st => addSoap(st) },
    { label: 'Program', choices: st => PROGS.map((p, i) => ({ label: p.name, current: st.prog === i, disabled: st.phase === 'run', why: 'Wait for it to finish', onClick: st => setProg(st, i) })) },
    { label: 'Start', onClick: st => start(st) },
    { label: 'Take them out', onClick: st => unload(st) },
  ],
  acts: { door: st => openDoor(st), basket: st => load(st), drawer: st => addSoap(st), bottle: st => addSoap(st),
          dial: st => say(PROGS[st.prog].name + ' wash')   /* stays on Warm for now (plan, decision 5) */, start: st => start(st) },
  params: (st, q) => {
    for (const k of ['door', 'drawer', 'soap', 'water', 'foam', 'clean', 'drumA', 'pour']) if (q.has(k)){ st[k] = +q.get(k); if (k === 'door') st.doorT = st.door; if (k === 'drawer') st.drawerT = st.drawer; }
    if (q.has('prog')) st.prog = st.progA = +q.get('prog');
    if (q.get('loaded') === '1') st.items.forEach(it => it.where = 'drum');
    if (q.get('spin') === '1'){ st.spin = 1; }
    if (q.get('lock') === '1') st.lock = true;
  },
});
window.WASHER = { ui, scene, porthole: [W, PCY, PCZ], openDoor, load, addSoap, setProg, start, unload, reset, PROGS, inDrum, inBasket, CLOTHES,
  acts: { door: st => openDoor(st), basket: st => load(st), drawer: st => addSoap(st), bottle: st => addSoap(st),
          dial: st => say(PROGS[st.prog].name + ' wash')   /* stays on Warm for now (plan, decision 5) */, start: st => start(st) } };
xrMount(() => ui, () => '');
