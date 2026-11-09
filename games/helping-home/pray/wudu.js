/* Helping Home: the Wudu station. Made with Colorfigures (MIT) for the tap and basin.
   A guide the child follows with their real body: each step shows first-person hands doing it, a faceless body map
   where the part being washed glows (washed parts stay softly tinted), a 1-2-3 count of drops and a voice line.
   Two modes: "Do it with me" (one step at a time; the child taps Done after doing it for real) and "Practice"
   (tap the body part that comes next; a wrong tap gets a gentle hint, never a fail). Nothing is scored or timed.

   The tap is real: water runs only while it is on, and the water meter fills while it runs. Turning it off after
   washing saves water and grows a new leaf on the plant by the basin ("use a little water, even at a river").

   How the drawing stays fast (no quality loss):
   - the tap and basin are drawn once, with the hand-drawn filter, into a static SVG layer;
   - the tap's lever and the plant's leaves are a small second layer, redrawn only while the lever turns or a leaf grows;
   - the water (stream, pool, ripples) is a third, unfiltered layer moved only by CSS;
   - the hands and the body-map glow are their own small SVGs, moved by CSS transforms and opacity (GPU layers).

   Coordinates of the basin figure: x = depth (0 = the wall, 60 = the counter's front edge, toward the child),
   y = width (+y = the child's left), z = up (0 = the counter top), 1 unit = 1 cm. The camera looks from the front
   (yaw 0) and from above, like a child standing at the basin.
   All religious text lives in wudu-text.js (TEACHER REVIEW).

   Test params: ?step=N (1-10)  ?mode=practice  ?tap=1  ?water=0..1  ?leaves=N  ?done=1 (finish sheet)  ?pdone=N */
(function () {
  'use strict';
  const T = window.WUDU_TEXT, Q = new URLSearchParams(location.search), NS = 'http://www.w3.org/2000/svg';
  const STEPS = T.steps, LAST = STEPS.length - 1;
  const RM = !!(window.Kit && Kit.reducedMotion);
  const $ = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };

  /* ---------- the child's hand (skin tone and sleeve, chosen once in the house) ---------- */
  // the house saves plain hex strings: 'hh.hand' (skin) and 'hh.sleeve'
  const HAND = (function () { const hex = v => /^#[0-9a-f]{3,8}$/i.test(v || '') ? v : null; let s = null, v = null;
    try { s = localStorage.getItem('hh.hand'); v = localStorage.getItem('hh.sleeve'); } catch (e) {}
    try { const o = JSON.parse(s); if (o && o.skin) return { skin: hex(o.skin) || '#c98e62', sleeve: hex(o.sleeve) || '#7aa6c9' }; } catch (e) {}
    return { skin: hex(s) || '#c98e62', sleeve: hex(v) || '#7aa6c9' }; })();
  if (!/^#[0-9a-f]{6}$/i.test(HAND.skin)) HAND.skin = '#c98e62';
  if (!/^#[0-9a-f]{6}$/i.test(HAND.sleeve)) HAND.sleeve = '#7aa6c9';
  const SKIN = { l: mix(HAND.skin, '#ffffff', .2), m: HAND.skin, d: mix(HAND.skin, '#3a2416', .26) };
  const PALM = { l: mix(HAND.skin, '#fbe3d2', .62), m: mix(HAND.skin, '#f1cdb6', .45), d: mix(HAND.skin, '#8a5a40', .3) };
  const SLEEVE = matOf(HAND.sleeve), TROUSER = matOf(mix(HAND.sleeve, '#3d3a48', .45));
  const NAIL = mix(HAND.skin, '#ffffff', .52);

  /* =====================================================================================================
     1. THE TAP AND BASIN (Colorfigures, real 3D)
     Parts: tiled wall (one row of eight-point star tiles) . wooden counter with a hole . drop-in ceramic basin
     (rim, bowl, drain) . pillar tap (flange, column, curved spout with aerator, quarter-turn lever on a cap) .
     plant pot with leaves (back left) . folded towel (front right) . painted cabinet under the counter.
     Real process: the lever turns a quarter turn from pointing right (closed) to pointing at the child (open);
     water leaves the aerator straight down into the bowl and runs to the drain.
     ===================================================================================================== */
  const BX = 31, BRX = 15, BRY = 22, RIMW = 2.4, RIMH = .9;        // basin centre (x), rim radii, rim width and height
  const BOWL = [[RIMH, 1], [-2.5, .97], [-6, .89], [-9, .76], [-11.5, .6], [-13, .45]];   // bowl rings (z, scale)
  const CTX1 = 60, CTH = 4, CTY = 70;                                // counter front, thickness, half width
  const TPX = 8.5, TPR = 2.9, TPH = 15.5;                            // tap column (x, radius, height)
  const OUTL = [26, 0, 11.3];                                        // aerator, under the spout's tip
  const POT = [10, -33], CROP = { y: 45, top: 50, bot: -21 }, TWL = [30, 50, 29, 42];   // plant pot (x, y), view crop, towel x0 x1 y0 y1
  const TILE = { l: '#d3eae1', m: '#bcdccf', d: '#86b7a7' }, CHROME = { l: '#f7f8f8', m: '#cad1d4', d: '#87939a' };
  const TERRA = { l: '#e39570', m: '#c8714b', d: '#8f4a2e' }, LEAFM = { l: '#97cc72', m: '#6ea653', d: '#3f6e33' };
  const TOWELM = { l: '#f4b3a4', m: '#df8f80', d: '#a95f55' }, CABM = { l: '#f1e7d3', m: '#dccfb4', d: '#a99b80' };
  const WATER = '#7fc4e8';
  const bring = (z, s, n = 36) => on(PZ(z), ellUV(BX, 0, BRX*s, BRY*s, n));

  function wall(){
    const pl = PX(0), y0 = -CTY, y1 = CTY;
    let s = fill(pd(on(pl, rectUV(y0, 0, y1, 110))), tone([1, 0, 0], TILE));
    let g = '';
    for (let z = 10; z < 110; z += 10) g += pd(on(pl, [[y0, z], [y1, z]]), false);
    for (let y = -65; y <= 65; y += 10) g += pd(on(pl, [[y, 0], [y, 110]]), false);
    s += `<path d="${g}" fill="none" stroke="${TILE.d}" stroke-width=".9" opacity=".75"/>`;
    // one row of eight-point star tiles above the tap
    let st = '';
    for (let y = -60; y <= 60; y += 10){
      const pts = []; for (let i = 0; i < 16; i++){ const a = i*Math.PI/8 + Math.PI/8, r = i % 2 ? 2.6 : 4.1; pts.push([y + r*Math.cos(a), 25 + r*Math.sin(a)]); }
      st += pd(on(PX(.05), pts));
    }
    s += `<path d="${st}" fill="#f7eedb" stroke="${INK}" stroke-width=".7" stroke-linejoin="round"/>`;
    s += shape(on(PX(.06), ellUV(0, 25, 1, 1, 10)), '#e9b44c', .5);
    return s;
  }
  function bowl(){
    let s = '';
    for (let k = 0; k < BOWL.length - 1; k++) s += loft(bring(BOWL[k][0], BOWL[k][1]), bring(BOWL[k + 1][0], BOWL[k + 1][1]), n => toneI(n, CERAMIC), true);
    const bot = bring(-13, .45);
    s += fill(pd(bot), CERAMIC.m) + ink(pd(bot), .6);
    // drain: a steel ring, a dark hole and a cross
    s += shape(on(PZ(-12.95), ellUV(BX + 1.5, 0, 2.4, 2.4, 18)), '#d3d9db', .8) + fill(pd(on(PZ(-12.9), ellUV(BX + 1.5, 0, 1.55, 1.55, 16))), '#4f575b');
    s += `<path d="${pd([[BX + 1.5, -1.5, -12.85], [BX + 1.5, 1.5, -12.85]], false)}${pd([[BX, 0, -12.85], [BX + 3, 0, -12.85]], false)}" stroke="#c9cfd1" stroke-width=".9" fill="none"/>`;
    return s;
  }
  function counter(){
    const top = on(PZ(0), rectUV(0, -CTY, CTX1, CTY)), hole = on(PZ(0), ellUV(BX, 0, BRX + RIMW, BRY + RIMW, 44));
    let s = `<path d="${pd(top)}${pd(hole)}" fill="${tone([0, 0, 1], WOOD)}" fill-rule="evenodd"/>`;
    // wood grain
    let gr = '';
    for (const [x, ya, yb] of [[5, -66, -30], [12, 30, 66], [20, -66, -36], [47, -66, -40], [52, 26, 64], [56, -20, 20], [38, 35, 66], [3, 20, 50]])
      gr += pd([[x, ya, 0], [x + .6, (ya + yb)/2, 0], [x, yb, 0]], false);
    s += `<path d="${gr}" fill="none" stroke="${WOOD.d}" stroke-width=".7" opacity=".45"/>`;
    s += ink(pd([[0, -CTY, 0], [0, CTY, 0]], false), 1.4);
    s += shape(on(PX(CTX1), rectUV(-CTY, -CTH, CTY, 0)), tone([1, 0, 0], WOOD), 1.6);
    return s;
  }
  function cabinet(){
    const x = CTX1 - 2;
    let s = shape(on(PX(x), rectUV(-CTY, -40, CTY, -CTH)), tone([1, 0, 0], CABM), 1.4);
    s += shape(on(PX(x + .1), rectUV(-38, -36, -1, -6)), mix(tone([1, 0, 0], CABM), '#ffffff', .25), 1);
    s += shape(on(PX(x + .1), rectUV(1, -36, 38, -6)), mix(tone([1, 0, 0], CABM), '#ffffff', .25), 1);
    s += cylX(x, x + 1.6, -4.5, -10, 1.2, WOOD, toneI, .8, 12) + cylX(x, x + 1.6, 4.5, -10, 1.2, WOOD, toneI, .8, 12);
    return s;
  }
  function rim(){
    const o0 = on(PZ(0), ellUV(BX, 0, BRX + RIMW, BRY + RIMW, 44)), o1 = on(PZ(RIMH), ellUV(BX, 0, BRX + RIMW, BRY + RIMW, 44)), i1 = bring(RIMH, 1, 44);
    let s = loft(o0, o1, n => tone(n, CERAMIC));
    s += `<path d="${pd(o1)}${pd(i1)}" fill="${tone([0, 0, 1], CERAMIC)}" fill-rule="evenodd"/>`;
    s += ink(pd(i1), 1.2) + hullInk([...o0, ...o1], 2);
    // a soft glint on the near rim
    s += `<path d="${pd(on(PZ(RIMH + .02), arcUV(BX, 0, 1, 50, 120, 10).map(([u, v]) => [BX + (u - BX)*(BRX + 1.2), (v)*(BRY + 1.2)])), false)}" fill="none" stroke="#ffffff" stroke-width="1.2" opacity=".8" stroke-linecap="round"/>`;
    return s;
  }
  // a tube along a path (the spout): rings at each sample, lofted in order from the column out to the tip
  function tube(pts, r, m){
    const rings = pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], d = norm(sub(b, a)), u = [0, 1, 0], v = cross(d, u);
      return Array.from({ length: 16 }, (_, k) => { const t = k/16*2*Math.PI, c = Math.cos(t)*r, sn = Math.sin(t)*r; return [p[0] + u[0]*c + v[0]*sn, p[1] + u[1]*c + v[1]*sn, p[2] + u[2]*c + v[2]*sn]; }); });
    let s = ''; for (let i = 0; i < rings.length - 1; i++) s += loft(rings[i], rings[i + 1], n => toneI(n, m));
    return s + hullInk(rings.flat(), 1.2);
  }
  function spoutPath(){
    const ctl = [[TPX + .8, 0, TPH - 2.2], [17, 0, TPH - .6], [24.5, 0, TPH - 1.4], [OUTL[0], 0, OUTL[2] + 2.2], [OUTL[0], 0, OUTL[2]]];
    const out = [];
    for (let i = 0; i < ctl.length - 1; i++) for (let k = 0; k < 4; k++){ const t = k/4, a = ctl[i], b = ctl[i + 1];
      out.push([a[0] + (b[0] - a[0])*t, a[1], a[2] + (b[2] - a[2])*t]); }
    out.push(ctl[ctl.length - 1]);
    // smooth the corners (two passes of neighbour averaging, ends fixed)
    for (let pass = 0; pass < 2; pass++) for (let i = 1; i < out.length - 1; i++) out[i] = out[i].map((v, j) => (out[i - 1][j] + 2*v + out[i + 1][j])/4);
    return out;
  }
  function tapBody(){
    let s = cyl(TPX, 0, 0, 1.2, 4.4, CHROME, toneI, 1.3, 28);
    s += cyl(TPX, 0, 1.2, TPH, TPR, CHROME, toneI, 1.5, 24);
    s += tube(spoutPath(), 1.45, CHROME);
    // a highlight down the column
    s += `<path d="${pd([[TPX + TPR*.7, -TPR*.7, 2], [TPX + TPR*.7, -TPR*.7, TPH - 1]], false)}" stroke="#ffffff" stroke-width="1.1" opacity=".75" fill="none" stroke-linecap="round"/>`;
    return s;
  }
  function pot(){
    const A = on(PZ(0), ellUV(POT[0], POT[1], 4.3, 4.3, 24)), B = on(PZ(9), ellUV(POT[0], POT[1], 5.8, 5.8, 24));
    const soil = fill(pd(on(PZ(8.2), ellUV(POT[0], POT[1], 5.2, 5.2, 20))), '#5a4334');
    let s = openShell(A, B, n => toneI(n, TERRA), soil);
    const R0 = on(PZ(9), ellUV(POT[0], POT[1], 6.4, 6.4, 24)), R1 = on(PZ(10.6), ellUV(POT[0], POT[1], 6.4, 6.4, 24)), Ri = on(PZ(10.6), ellUV(POT[0], POT[1], 5.6, 5.6, 24));
    s += loft(R0, R1, n => toneI(n, TERRA)) + `<path d="${pd(R1)}${pd(Ri)}" fill="${TERRA.l}" fill-rule="evenodd"/>` + ink(pd(Ri), .8);
    s += hullInk([...A, ...R1], 1.8);
    return s;
  }
  function towel(){
    const [x0, x1, y0, y1] = TWL, prof = rrUV(y0, 0, y1, 4.6, 1.8, 5);
    let s = extrude(prof, x0, x1, TOWELM, toneI);
    s += fill(pd(on(PX(x1), prof)), toneI([1, 0, 0], TOWELM)) + ink(pd(on(PX(x1), prof)), 1);
    s += shape(on(PZ(4.62), rectUV(x1 - 8, y0 + 1.6, x1 - 5.5, y1 - 1.6)), '#fbf3e6', .6) + shape(on(PZ(4.62), rectUV(x1 - 4.5, y0 + 1.6, x1 - 3.4, y1 - 1.6)), '#fbf3e6', .5);
    s += hullInk([...on(PX(x0), prof), ...on(PX(x1), prof)], 1.8);
    return s;
  }
  function staticScene(){
    let s = wall() + bowl() + cabinet() + counter();
    // shadows on the counter (short, joined to their objects), then the rim over them
    s += clipTo(on(PZ(0), rectUV(0, -CTY, CTX1, CTY)),
      castShadow([...on(PZ(0), ellUV(TPX, 0, 4.4, 4.4, 12)), ...on(PZ(TPH), ellUV(TPX, 0, TPR, TPR, 12))]) +
      castShadow([...on(PZ(0), ellUV(POT[0], POT[1], 4.3, 4.3, 12)), ...on(PZ(8), ellUV(POT[0], POT[1], 6.2, 6.2, 12))]) +
      castShadow([...on(PZ(0), rectUV(TWL[0], TWL[2], TWL[1], TWL[3])), ...on(PZ(4.6), rectUV(TWL[0], TWL[2], TWL[1], TWL[3]))]));
    s += rim();
    s += byDepth([
      { box: [[TPX - 4.4, -4.4, 0], [OUTL[0] + 1.5, 4.4, TPH]], svg: tapBody() },
      { box: [[POT[0] - 6.4, POT[1] - 6.4, 0], [POT[0] + 6.4, POT[1] + 6.4, 10.6]], svg: pot() },
      { box: [[TWL[0], TWL[2], 0], [TWL[1], TWL[3], 4.6]], svg: towel() },
    ]);
    return s;
  }

  /* ---------- the moving layer: the lever (turns a quarter turn) and the plant's leaves (one more per saved tap) ---------- */
  function lever(a){
    const ang = (-90 - 90*ease(a))*Math.PI/180,       // closed: points right; open: a quarter turn, pointing back at the wall
    c = Math.cos(ang), sn = Math.sin(ang), z = TPH + 1.5;
    const cap = cyl(TPX, 0, TPH, TPH + 2.4, 2.4, CHROME, toneI, 1.2, 20);
    const p0 = [TPX + 1.9*c, 1.9*sn, z], p1 = [TPX + 9*c, 9*sn, z + 1.6];
    const arm = rod(p0, p1, 1.15, CHROME, toneI, 1, 1.05) + rod(p1, [TPX + 10.6*c, 10.6*sn, z + 1.9], 1.6, CHROME, toneI, 1, 1.6);
    const dot = fill(pd(on(PZ(TPH + 2.45), ellUV(TPX, 0, 1.05, 1.05, 12))), '#4f8fe0');
    return byDepth([
      { box: [[TPX - 2.4, -2.4, TPH], [TPX + 2.4, 2.4, TPH + 2.4]], svg: cap + dot },
      { box: [[Math.min(p0[0], TPX + 10.6*c) - 1.3, Math.min(p0[1], 10.6*sn) - 1.3, z - 1], [Math.max(p0[0], TPX + 10.6*c) + 1.3, Math.max(p0[1], 10.6*sn) + 1.3, z + 3]], svg: arm },
    ]);
  }
  function leaves(n, grow){
    const parts = [], base = [POT[0], POT[1], 8.6];
    for (let k = 0; k < n; k++){
      const g = k === n - 1 ? grow : 1, a = k*2.3999 + .6, e = (58 - (k % 3)*12)*Math.PI/180, len = (7.5 + (k % 4)*1.3)*g, wd = (2.4 + (k % 2)*.5)*g;
      const d = [Math.cos(a)*Math.cos(e), Math.sin(a)*Math.cos(e), Math.sin(e)], w = norm(cross(d, [0, 0, 1])), nrm = cross(w, d);
      const pt = (t, side) => { const r = wd*Math.sin(Math.PI*Math.pow(t, .8))*side; return [0, 1, 2].map(i => base[i] + d[i]*t*len + w[i]*r + (i === 2 ? -1.2*t*t*len*.12 : 0)); };
      const out = []; for (let i = 0; i <= 8; i++) out.push(pt(i/8, 1)); for (let i = 8; i >= 0; i--) out.push(pt(i/8, -1));
      const shadeN = facing(nrm) ? nrm : nrm.map(v => -v);
      const mid = [pt(0, 0), pt(.5, 0), pt(.92, 0)];
      const svg = shape(out, toneI(shadeN, LEAFM), .8) + ink(pd(mid, false), .55);
      const xs = out.map(p => p[0]), ys = out.map(p => p[1]), zs = out.map(p => p[2]);
      parts.push({ box: [[Math.min(...xs), Math.min(...ys), Math.min(...zs)], [Math.max(...xs), Math.max(...ys), Math.max(...zs)]], svg });
    }
    return byDepth(parts);
  }
  /* ---------- the water layer (no filter; CSS moves it): the stream, the pool by the drain, ripples ---------- */
  function water(){
    const o = P(OUTL[0], 0, OUTL[2] - .2), b = P(OUTL[0], 0, -12.6), w0 = 1.05*CAM_K, w1 = .85*CAM_K;
    const poly = `M${f(o[0] - w0)} ${f(o[1])}L${f(b[0] - w1)} ${f(b[1])}L${f(b[0] + w1)} ${f(b[1])}L${f(o[0] + w0)} ${f(o[1])}Z`;
    let s = `<g class="wd-stream"><path d="${poly}" fill="${WATER}" opacity=".9" stroke="${mix(WATER, INK, .45)}" stroke-width=".5"/>`;
    s += `<path class="wd-flow" d="M${f(o[0] - w0*.35)} ${f(o[1] + 1)}L${f(b[0] - w1*.35)} ${f(b[1] - .5)}" stroke="#ffffff" stroke-width=".55" stroke-dasharray="2.2 3.4" stroke-linecap="round" opacity=".9"/>`;
    s += `<path class="wd-flow wd-flow2" d="M${f(o[0] + w0*.4)} ${f(o[1] + 2)}L${f(b[0] + w1*.4)} ${f(b[1] - .5)}" stroke="#e8f6fc" stroke-width=".4" stroke-dasharray="1.4 4.2" stroke-linecap="round" opacity=".8"/></g>`;
    const stream = s; s = '';
    const pool = on(PZ(-12.85), ellUV(BX - .5, 0, BRX*.45 - .5, BRY*.45 - .6, 30));
    s += `<path class="wd-pool" d="${pd(pool)}" fill="${WATER}" opacity=".45"/>`;
    const rip = r => pd(on(PZ(-12.8), ellUV(OUTL[0] + .5, 0, r, r*1.15, 24)));
    s += `<path class="wd-rip" d="${rip(3.2)}" fill="none" stroke="#ffffff" stroke-width=".7"/><path class="wd-rip wd-rip2" d="${rip(3.2)}" fill="none" stroke="#ffffff" stroke-width=".6"/>`;
    s += `<path class="wd-splash" d="M${f(b[0] - 1.6)} ${f(b[1] - .6)}l-1.3 -1.2M${f(b[0] + 1.6)} ${f(b[1] - .6)}l1.3 -1.2M${f(b[0] - .6)} ${f(b[1] - 1.2)}l-.4 -1.5M${f(b[0] + .7)} ${f(b[1] - 1.1)}l.5 -1.5" stroke="#ffffff" stroke-width=".7" stroke-linecap="round" fill="none"/>`;
    return { stream, pool: s };
  }

  /* ---------- mounting the figure: three stacked SVGs with one shared viewBox ---------- */
  let VB = null;
  function svgEl(cls){ const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', cls); s.setAttribute('aria-hidden', 'true'); return s; }
  function mountBasin(host){
    CAM_LIM = null; setCam(8, 52); setLight(105);
    RC = [CTX1/2, 0]; RCZ = 0; OX = OY = 0;
    const pts = []; for (const y of [-CROP.y, CROP.y]){ pts.push(P(0, y, CROP.top)); pts.push(P(CTX1 - 2, y, CROP.bot)); }
    const x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]));
    OX = -x0; OY = -y0; VB = [0, 0, x1 - x0, y1 - y0];
    INK_K = VB[2]/INK_REF_VB;
    const vb = VB.map(v => v.toFixed(2)).join(' ');
    const fig = svgEl('wd-lay wd-static'); fig.id = 'fig'; fig.setAttribute('viewBox', vb); fig.setAttribute('role', 'img'); fig.setAttribute('aria-label', 'A tap and a basin');
    fig.innerHTML = `<defs>${filterFor(INK_K)}</defs><g id="art" filter="url(#hand)">${inkScale(staticScene())}</g>`;
    const dyn = svgEl('wd-lay wd-dyn'); dyn.setAttribute('viewBox', vb); dyn.innerHTML = '<g filter="url(#hand)"></g>';
    const wt = water();
    const fx = svgEl('wd-lay wd-fx'); fx.setAttribute('viewBox', vb); fx.innerHTML = inkScale(wt.pool);
    const fxs = svgEl('wd-lay wd-fx wd-fxs'); fxs.setAttribute('viewBox', vb); fxs.innerHTML = inkScale(wt.stream);   // over the hands
    host.appendChild(fig); host.appendChild(fx); host.appendChild(dyn);
    host.style.setProperty('--ar', (VB[2]/VB[3]).toFixed(4));
    bakeNoise(fig);
    // screen anchors (in % of the figure) for the hands, the stream and the lever
    const pc = p => { const q = P(...p); return [q[0]/VB[2]*100, q[1]/VB[3]*100]; };
    const o = pc(OUTL), b = pc([OUTL[0], 0, -12.6]), h = pc([TPX - 2, -2, TPH + 2.5]);
    host.style.setProperty('--sx', o[0].toFixed(2) + '%'); host.style.setProperty('--oy', o[1].toFixed(2) + '%'); host.style.setProperty('--by', b[1].toFixed(2) + '%');
    host.style.setProperty('--hx', h[0].toFixed(2) + '%'); host.style.setProperty('--hy', h[1].toFixed(2) + '%');
    return { fig, dyn: dyn.firstChild, fx, fxs };
  }

  /* =====================================================================================================
     2. FIRST-PERSON HANDS (and feet): flat, hand-inked, in the child's own skin tone, drawn as seen from the eyes:
     fingers point away (up the screen) and the wrists come in from the bottom edge. A right hand seen from above,
     palm down, has its thumb on the left; the left hand is its mirror. Light from the right: left sides in shade.
     ===================================================================================================== */
  let UID = 0;
  const capP = (ax, ay, bx, by, r) => { const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, nx = -dy/l*r, ny = dx/l*r, F = v => v.toFixed(2);
    return `M${F(ax + nx)} ${F(ay + ny)}L${F(bx + nx)} ${F(by + ny)}A${F(r)} ${F(r)} 0 0 0 ${F(bx - nx)} ${F(by - ny)}L${F(ax - nx)} ${F(ay - ny)}A${F(r)} ${F(r)} 0 0 0 ${F(ax + nx)} ${F(ay + ny)}Z`; };
  const ellP = (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2*rx} 0a${rx} ${ry} 0 1 0 ${-2*rx} 0Z`;
  // pose geometry for a RIGHT hand/foot in a 100-wide box; m() mirrors x for the left
  const POSES = {
    back: { h: 182, palm: 'M26 86Q25 76 35 74L73 74Q82 75 82 86L79 126Q76 150 64 154L41 154Q30 151 28 132Z',
      fingers: [[36, 84, 31.5, 32, 6.4], [49, 80, 48.5, 22, 6.7], [61.5, 81, 64, 28, 6.4], [73, 86, 78.5, 45, 5.7]], thumb: [31, 124, 11, 93, 7.6],
      wrist: [37, 140, 67, 186], cuff: [28, 160, 48, 26] },
    point: { h: 182, palm: 'M26 86Q25 76 35 74L73 74Q82 75 82 86L79 126Q76 150 64 154L41 154Q30 151 28 132Z',
      fingers: [[36, 84, 31.5, 30, 6.4], [49, 80, 50, 68, 6.8], [61.5, 81, 63, 71, 6.4], [73, 86, 75, 78, 5.8]], thumb: [31, 124, 8, 99, 7.4], nails: [0],
      wrist: [37, 140, 67, 186], cuff: [28, 160, 48, 26] },
    cup: { h: 182, palm: 'M22 92Q22 78 34 76L70 76Q80 78 80 92L78 128Q74 152 60 154L42 154Q28 150 25 130Z', palmUp: true,
      fingers: [[29, 88, 27, 58, 5.7], [40.5, 82, 39.5, 47, 6.2], [52.5, 80, 53, 42, 6.4], [64, 82, 66, 49, 6.1]], thumb: [73, 122, 88, 92, 7.2], nails: [],
      wrist: [36, 140, 66, 186], cuff: [27, 160, 48, 26] },
    arm: { h: 282, palm: 'M26 86Q25 76 35 74L73 74Q82 75 82 86L79 126Q76 150 64 154L41 154Q30 151 28 132Z',
      fingers: [[36, 84, 31.5, 32, 6.4], [49, 80, 48.5, 22, 6.7], [61.5, 81, 64, 28, 6.4], [73, 86, 78.5, 45, 5.7]], thumb: [31, 124, 11, 93, 7.6],
      fore: 'M37 138L67 138L77 246L27 246Z', cuff: [21, 238, 62, 30], roll: true },
    foot: { h: 206, foot: 'M30 74Q26 112 33 146Q38 168 54 169Q70 169 72 147Q75 116 80 88Q83 70 70 64L42 61Q31 63 30 74Z',
      toes: [[37.5, 66, 35.5, 36, 8.4], [50.5, 61, 51.5, 38, 5.5], [60.5, 63, 62.5, 44, 5.1], [69, 67, 72, 51, 4.7], [76, 74, 80, 62, 4.2]],
      wrist: [38, 150, 67, 206], cuff: [30, 172, 46, 34], trouser: true },
  };
  function limbSVG(pose, side, wet){
    const G = POSES[pose], mir = side === 'L', X = x => mir ? 100 - x : x, id = 'hc' + (++UID);
    const skin = G.palmUp ? PALM : SKIN, parts = [], shade = [], lines = [];
    const tr = (d) => mir ? d.replace(/([ML])(-?[\d.]+) /g, (m0, c, x) => c + (100 - +x).toFixed(2) + ' ').replace(/Q(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) /g, (m0, a, b, c) => 'Q' + (100 - +a).toFixed(2) + ' ' + b + ' ' + (100 - +c).toFixed(2) + ' ') : d;
    const capX = (c, k = 1) => capP(X(c[0]), c[1], X(c[2]), c[3], c[4]*k);
    const body = G.palm || G.foot;
    if (G.wrist){ const [a, b, c, d] = G.wrist; parts.push(`M${X(a)} ${b}L${X(c)} ${b}L${X(c)} ${d}L${X(a)} ${d}Z`); }
    if (G.fore) parts.push(tr(G.fore));
    parts.push(tr(body));
    const digits = (G.fingers || G.toes).concat(G.thumb ? [G.thumb] : []);
    digits.forEach(c => parts.push(capX(c)));
    // shade: each part again in the dark tone, then shifted right in the base tone (light from the right)
    digits.forEach(c => { const r = c[4]; shade.push(`<path d="${capX(c)}" fill="${skin.d}"/><path d="${capP(X(c[0]) + r*.55, c[1], X(c[2]) + r*.55, c[3], r)}" fill="${skin.m}"/>`); });
    shade.unshift(`<path d="${tr(body)}" fill="${skin.d}"/><path d="${tr(body)}" fill="${skin.m}" transform="translate(6.5 0)"/>`);
    if (G.fore) shade.unshift(`<path d="${tr(G.fore)}" fill="${skin.d}"/><path d="${tr(G.fore)}" fill="${skin.m}" transform="translate(7 0)"/>`);
    // knuckle and joint marks, nails
    const fin = G.fingers || G.toes;
    fin.forEach((c, i) => {
      const [ax, ay, bx, by, r] = [X(c[0]), c[1], X(c[2]), c[3], c[4]], dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy), ux = dx/l, uy = dy/l;
      const showNail = G.nails ? G.nails.indexOf(i) >= 0 : !G.palmUp;
      if (showNail){ const cx = bx - ux*r*.75, cy = by - uy*r*.75, ang = Math.atan2(uy, ux)*180/Math.PI + 90;
        lines.push(`<ellipse cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" rx="${(r*.62).toFixed(2)}" ry="${(r*.8).toFixed(2)}" transform="rotate(${ang.toFixed(1)} ${cx.toFixed(2)} ${cy.toFixed(2)})" fill="${NAIL}" stroke="${INK}" stroke-width=".9" opacity=".95"/>`); }
      if (l > 20){ for (const t of G.palmUp ? [.18, .5] : [.42]){ const px = ax + dx*t, py = ay + dy*t, nx = -uy*r*.55, ny = ux*r*.55;
        lines.push(`<path d="M${(px + nx).toFixed(2)} ${(py + ny).toFixed(2)}Q${(px + ux*1.6).toFixed(2)} ${(py + uy*1.6).toFixed(2)} ${(px - nx).toFixed(2)} ${(py - ny).toFixed(2)}" fill="none" stroke="${INK}" stroke-width=".9" opacity=".5" stroke-linecap="round"/>`); } }
      if (!G.palmUp && G.palm) lines.push(`<ellipse cx="${(ax + 1).toFixed(2)}" cy="${(ay + 1).toFixed(2)}" rx="${(r*.55).toFixed(2)}" ry="${(r*.35).toFixed(2)}" fill="${skin.l}" opacity=".9"/>`);
    });
    if (G.palmUp) lines.push(`<path d="M${X(33)} 112Q${X(50)} 102 ${X(68)} 108M${X(35)} 126Q${X(46)} 120 ${X(58)} 130" fill="none" stroke="${INK}" stroke-width="1" opacity=".45" stroke-linecap="round"/>`);
    const all = parts.map(d => `<path d="${d}"/>`).join('');
    let s = `<defs><clipPath id="${id}">${all}</clipPath></defs>`;
    s += `<g fill="${INK}" stroke="${INK}" stroke-width="4.2" stroke-linejoin="round">${all}</g>`;
    s += `<g fill="${skin.m}">${all}</g>`;
    s += `<g clip-path="url(#${id})">${shade.join('')}</g>` + lines.join('');
    // sleeve or trouser cuff over the wrist/ankle
    if (G.cuff){ const [x, y, w, h] = G.cuff, M = G.trouser ? TROUSER : SLEEVE, x0 = mir ? 100 - x - w : x;
      s += `<rect x="${x0}" y="${y}" width="${w}" height="${h + 40}" rx="7" fill="${M.m}" stroke="${INK}" stroke-width="2.2"/>`;
      s += `<rect x="${x0 + 2}" y="${y + 3}" width="${w*.28}" height="${h + 34}" rx="5" fill="${M.d}" opacity=".55"/>`;
      s += `<path d="M${x0 + 3} ${y + (G.roll ? 11 : 7)}Q${x0 + w/2} ${y + (G.roll ? 15 : 10)} ${x0 + w - 3} ${y + (G.roll ? 11 : 7)}" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".7"/>`;
      if (G.roll) s += `<path d="M${x0 + 3} ${y + 21}Q${x0 + w/2} ${y + 25} ${x0 + w - 3} ${y + 21}" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".6"/>`; }
    let html = `<svg class="hd-art" viewBox="0 0 100 ${G.h}" aria-hidden="true"><g filter="url(#hfx)">${s}</g></svg>`;
    if (wet){ const cx = X(52), cy = 104;   // water held in the cupped palm (fades in and out with the motion)
      html += `<svg class="hd-wet" viewBox="0 0 100 ${G.h}" aria-hidden="true"><ellipse cx="${cx}" cy="${cy}" rx="19" ry="14" fill="${WATER}" opacity=".78" stroke="${mix(WATER, INK, .4)}" stroke-width=".8"/>`
        + `<path d="M${cx - 10} ${cy - 5}Q${cx - 2} ${cy - 10} ${cx + 8} ${cy - 7}" fill="none" stroke="#fff" stroke-width="2" opacity=".7" stroke-linecap="round"/></svg>`; }
    return html;
  }

  // what the hands do for each step: pose, side, centre x (% of the figure), bottom (%), width (%), base rotation,
  // CSS animation, wet (water in the palm), z order
  const CHOREO = {
    intention: [{ p: 'back', s: 'L', x: 30, b: -42, w: 36, a: 'rest' }, { p: 'back', s: 'R', x: 70, b: -42, w: 36, a: 'rest' }],
    hands: [{ p: 'back', s: 'L', x: 41.5, b: -12, w: 36, a: 'rubL', z: 2 }, { p: 'back', s: 'R', x: 58.5, b: -12, w: 36, a: 'rubR', z: 3 }],
    mouth: [{ p: 'back', s: 'L', x: 18, b: -40, w: 34, a: 'rest' }, { p: 'cup', s: 'R', x: 52, b: -12, w: 36, a: 'cup', wet: true }],
    nose: [{ p: 'back', s: 'L', x: 18, b: -40, w: 34, a: 'noseL' }, { p: 'cup', s: 'R', x: 52, b: -12, w: 36, a: 'cup', wet: true }],
    face: [{ p: 'cup', s: 'L', x: 37, b: -12, w: 34, a: 'cup', wet: true }, { p: 'cup', s: 'R', x: 62, b: -12, w: 34, a: 'cup', wet: true }],
    armR: [{ p: 'arm', s: 'R', x: 80, b: -20, w: 28, r: -24, a: 'rest' }, { p: 'back', s: 'L', x: 44, b: 22, w: 25, r: 60, a: 'alongR', z: 3 }],
    armL: [{ p: 'arm', s: 'L', x: 20, b: -20, w: 28, r: 24, a: 'rest' }, { p: 'back', s: 'R', x: 56, b: 22, w: 25, r: -60, a: 'alongL', z: 3 }],
    head: [{ p: 'back', s: 'L', x: 40, b: -12, w: 34, a: 'head' }, { p: 'back', s: 'R', x: 60, b: -12, w: 34, a: 'head' }],
    ears: [{ p: 'point', s: 'L', x: 18, b: -28, w: 34, r: 10, a: 'earL' }, { p: 'point', s: 'R', x: 82, b: -28, w: 34, r: -10, a: 'earR' }],
    footR: [{ p: 'foot', s: 'R', x: 52, b: -22, w: 36, a: 'rest' }, { p: 'back', s: 'L', x: 14, b: 34, w: 24, r: 84, a: 'toes', z: 3 }],
    footL: [{ p: 'foot', s: 'L', x: 48, b: -22, w: 36, a: 'rest' }, { p: 'back', s: 'R', x: 86, b: 34, w: 24, r: -84, a: 'toes', z: 3 }],
    dua: [{ p: 'back', s: 'L', x: 30, b: -46, w: 36, a: 'rest' }, { p: 'back', s: 'R', x: 70, b: -46, w: 36, a: 'rest' }],
  };
  // where the stream lands on the hands (% from the top of the figure); none = it falls all the way to the drain
  const IMPACT = { hands: 53, mouth: 55, nose: 55, face: 55, armR: 52, armL: 52, head: 55, footR: 57, footL: 57 };
  function showHands(id){
    const host = UI.hands; host.innerHTML = '';
    const imp = IMPACT[id]; UI.fig.style.setProperty('--imp', imp ? imp + '%' : '100%'); UI.fig.classList.toggle('has-imp', !!imp);
    (CHOREO[id] || []).forEach(c => {
      const G = POSES[c.p], d = $('div', 'hd hd-a-' + c.a);
      d.style.cssText = `left:${c.x - c.w/2}%;bottom:${c.b}%;width:${c.w}%;aspect-ratio:100/${G.h};z-index:${c.z || 1}`;
      const r = $('div', 'hd-r', limbSVG(c.p, c.s, c.wet));
      if (c.r) r.style.transform = `rotate(${c.r}deg)`;
      d.appendChild(r); host.appendChild(d);
    });
  }

  /* =====================================================================================================
     3. THE BODY MAP: an ink outline of a child with no face (a plain head shape), seen as if it were you:
     your right arm is on the right. The part being washed glows; washed parts stay softly tinted.
     ===================================================================================================== */
  const mx = x => 120 - x;
  const BODY = (() => {
    const armU = s => s === 'L' ? capP(34.5, 72, 30.5, 96, 6.2) : capP(mx(34.5), 72, mx(30.5), 96, 6.2);
    const fore = s => s === 'L' ? capP(30.5, 96, 26.5, 127, 5.4) : capP(mx(30.5), 96, mx(26.5), 127, 5.4);
    const hand = s => s === 'L' ? ellP(25.5, 137, 5.8, 8.6) : ellP(mx(25.5), 137, 5.8, 8.6);
    const elbow = s => s === 'L' ? ellP(30.5, 96, 5.7, 5.7) : ellP(mx(30.5), 96, 5.7, 5.7);
    const wristP = s => s === 'L' ? capP(27, 124, 25.8, 132, 5.6) : capP(mx(27), 124, mx(25.8), 132, 5.6);
    const leg = s => s === 'L' ? capP(51, 134, 50, 194, 8.4) : capP(mx(51), 134, mx(50), 194, 8.4);
    const shin = s => s === 'L' ? capP(50, 186, 49, 206, 5.6) : capP(mx(50), 186, mx(49), 206, 5.6);
    const foot = s => { const cx = s === 'L' ? 45.5 : mx(45.5); return `<ellipse cx="${cx}" cy="211" rx="11" ry="5.8" transform="rotate(${s === 'L' ? -14 : 14} ${cx} 211)"/>`; };
    const sleeve = s => s === 'L' ? capP(38.5, 62.5, 33, 84, 7.4) : capP(mx(38.5), 62.5, mx(33), 84, 7.4);
    return {
      skin: [ellP(40.5, 31, 4.2, 6.2), ellP(79.5, 31, 4.2, 6.2), armU('L'), armU('R'), fore('L'), fore('R'), hand('L'), hand('R'), shin('L'), shin('R'),
        'M54.5 46L65.5 46L66 59L54 59Z', ellP(60, 29, 19.5, 21.5)].map(d => `<path d="${d}"/>`).join('') + foot('L') + foot('R'),
      tunic: 'M38 59.5Q47 55 60 55Q73 55 82 59.5Q88 62 90 70L93.5 81.5L85 85L85.5 137Q60 141.5 34.5 137L35 85L26.5 81.5L30 70Q32 62 38 59.5Z',
      sleeves: [], legs: [leg('L'), leg('R')],
      hair: 'M40.6 26C40.4 12 49 7.3 60 7.3C71 7.3 79.6 12 79.4 26C74 19.5 67.5 17 60 17.2C52.5 17 46 19.5 40.6 26Z',
      areas: {
        heart: '<path d="M52 86.5C47 83 44.5 80 44.5 77.3C44.5 75 46.3 73.4 48.3 73.4C49.8 73.4 51 74.3 52 75.6C53 74.3 54.2 73.4 55.7 73.4C57.7 73.4 59.5 75 59.5 77.3C59.5 80 57 83 52 86.5Z"/>',
        handL: `<path d="${hand('L')}"/><path d="${wristP('L')}"/>`, handR: `<path d="${hand('R')}"/><path d="${wristP('R')}"/>`,
        mouth: `<circle cx="60" cy="41" r="5.2"/>`, nose: `<circle cx="60" cy="31.5" r="4.4"/>`,
        face: `<path d="M41.6 28C42.5 22 50 18.5 60 18.5C70 18.5 77.5 22 78.4 28C79.2 39 72 49.5 60 50C48 49.5 40.8 39 41.6 28Z"/>`,
        armL: `<path d="${fore('L')}"/><path d="${elbow('L')}"/><path d="${hand('L')}"/>`, armR: `<path d="${fore('R')}"/><path d="${elbow('R')}"/><path d="${hand('R')}"/>`,
        head: `<path d="M40.4 27C40.2 12 49 6.6 60 6.6C71 6.6 79.8 12 79.6 27C74 20 67.5 17.6 60 17.8C52.5 17.6 46 20 40.4 27Z"/>`,
        ears: `<path d="${ellP(40.2, 31, 4.6, 6.6)}"/><path d="${ellP(79.8, 31, 4.6, 6.6)}"/>`,
        footL: foot('L') + `<path d="${shin('L')}"/>`, footR: foot('R') + `<path d="${shin('R')}"/>`,
      },
    };
  })();
  // tap zones for Practice (body-map units); the small ones are tested first
  const ZONES = [
    { a: 'nose', x: 60, y: 31.5, r: 4.6 }, { a: 'mouth', x: 60, y: 41, r: 5.5 }, { a: 'ears', x: 39.5, y: 31, r: 5.6 }, { a: 'ears', x: 80.5, y: 31, r: 5.6 },
    { a: 'heart', x: 52, y: 79, r: 8.5 }, { a: 'handL', x: 25.5, y: 137, r: 9 }, { a: 'handR', x: 94.5, y: 137, r: 9 },
    { a: 'head', x: 60, y: 13, r: 10.5 }, { a: 'armL', x: 28.5, y: 110, r: 12 }, { a: 'armR', x: 91.5, y: 110, r: 12 },
    { a: 'footL', x: 46, y: 208, r: 12.5 }, { a: 'footR', x: 74, y: 208, r: 12.5 }, { a: 'face', x: 60, y: 33, r: 16.5 },
  ];
  function mountBody(host){
    const VBB = '0 0 120 232', mk = (cls, inner) => { const s = svgEl('bm ' + cls); s.setAttribute('viewBox', VBB); s.innerHTML = inner; host.appendChild(s); return s; };
    const B = BODY;
    let base = `<g filter="url(#hfx)"><g fill="${INK}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round">${B.skin}<path d="${B.tunic}"/>${B.legs.map(d => `<path d="${d}"/>`).join('')}${B.sleeves.map(d => `<path d="${d}"/>`).join('')}</g>`;
    base += `<g fill="#fbf4e6">${B.skin}</g>`;
    base += B.legs.map(d => `<path d="${d}" fill="#e2d6bf" stroke="${INK}" stroke-width="1.3"/>`).join('');
    base += `<path d="${B.tunic}" fill="#efe5d0" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`;
    base += B.sleeves.map(d => `<path d="${d}" fill="#efe5d0" stroke="${INK}" stroke-width="1.3"/>`).join('');
    base += `<path d="M42 72Q47 75 52 72M68 72Q73 75 78 72" fill="none" stroke="${INK}" stroke-width=".8" opacity=".35"/>`;
    base += `<path d="M54.5 58Q60 62 65.5 58" fill="none" stroke="${INK}" stroke-width="1" opacity=".6"/>`;
    base += `<path d="${B.hair}" fill="#6b5444" stroke="${INK}" stroke-width="1.2"/></g>`;
    const tint = mk('bm-tint', ''), glow = mk('bm-glow', '');
    const ink = mk('bm-base', base);
    host.insertBefore(ink, tint);
    return { ink, tint, glow };
  }
  function areaShapes(list){
    const keys = list.indexOf('all') >= 0 ? ['handL', 'handR', 'armL', 'armR', 'face', 'head', 'ears', 'footL', 'footR', 'heart'] : list;
    return keys.map(k => BODY.areas[k] || '').join('');
  }
  function drawBody(){
    const s = STEPS[st.i], washed = Object.keys(st.washed).filter(k => st.washed[k]);
    // the mouth and the nose are not kept tinted on their own: two marks on a blank head would read as a face
    const cur = st.mode === 'practice' && s.id !== 'dua' ? (st.flash || []) : s.area;
    const glowing = cur.indexOf('all') >= 0 ? Object.keys(BODY.areas) : cur.concat(cur.indexOf('armR') >= 0 ? ['handR'] : [], cur.indexOf('armL') >= 0 ? ['handL'] : []);
    // washed parts stay blue, except the part glowing now (yellow over blue would turn green)
    UI.body.tint.innerHTML = `<g fill="#9fd3ee" stroke="#9fd3ee" stroke-width="1.2">${areaShapes(washed.filter(a => a !== 'mouth' && a !== 'nose' && glowing.indexOf(a) < 0))}</g>`;
    UI.body.glow.innerHTML = cur.length ? `<g fill="#f6c453" stroke="#f6c453" stroke-width="5" stroke-linejoin="round" stroke-opacity=".35">${areaShapes(cur)}</g>` : '';
    UI.bodyWrap.classList.toggle('all', cur.indexOf('all') >= 0);
  }

  /* =====================================================================================================
     4. ICONS (ink, 24-unit grid)
     ===================================================================================================== */
  const HEADI = '<circle cx="12" cy="9.5" r="6"/><path d="M4.5 22c.7-3.5 3.6-5.7 7.5-5.7s6.8 2.2 7.5 5.7"/>';
  const SPOT = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#f6c453" stroke="none"/><circle cx="${x}" cy="${y}" r="${r + 1.4}" stroke="#f6c453" stroke-width="1" opacity=".7"/>`;
  const STAR8 = (() => { let d = ''; for (let i = 0; i < 16; i++){ const a = i*Math.PI/8 - Math.PI/2, r = i % 2 ? 5.6 : 9; d += (i ? 'L' : 'M') + (12 + r*Math.cos(a)).toFixed(2) + ' ' + (12 + r*Math.sin(a)).toFixed(2); } return d + 'Z'; })();
  const IC = {
    heart: '<path d="M12 20s-7-4.3-8.6-8.7C2.2 8 4.1 4.8 7.3 4.8c2 0 3.4 1.1 4.7 2.8 1.3-1.7 2.7-2.8 4.7-2.8 3.2 0 5.1 3.2 3.9 6.5C19 15.7 12 20 12 20z" fill="#f6c453"/>',
    hands: '<path d="M8 21.5v-3.8L4.5 13a1.3 1.3 0 0 1 2.1-1.6L8.5 14V5a1.3 1.3 0 0 1 2.6 0v6V3.6a1.3 1.3 0 0 1 2.6 0V11V4.8a1.3 1.3 0 0 1 2.6 0V12V7.6a1.3 1.3 0 0 1 2.6 0v8.2c0 3.2-2.3 5.7-5.4 5.7z"/>',
    mouth: HEADI + SPOT(12, 12.3, 1.6), nose: HEADI + SPOT(12, 9.6, 1.4),
    face: HEADI.replace('<circle cx="12" cy="9.5" r="6"/>', '<circle cx="12" cy="9.5" r="6"/><ellipse cx="12" cy="10.6" rx="4.4" ry="4.4" fill="#f6c453" stroke="none"/>'),
    head: '<path d="M6.2 8.6C6.6 5.4 9 3.5 12 3.5s5.4 1.9 5.8 5.1C16.2 7.4 14.2 6.9 12 6.9S7.8 7.4 6.2 8.6z" fill="#f6c453" stroke="none"/>' + HEADI,
    ears: '<ellipse cx="5.9" cy="10" rx="1.2" ry="2" fill="#f6c453" stroke-width="1.6"/><ellipse cx="18.1" cy="10" rx="1.2" ry="2" fill="#f6c453" stroke-width="1.6"/>' + HEADI,
    armR: '<path d="M3.5 21.5 9.8 13.2M8.6 23.6l6.2-7.9"/><path d="M9.8 13.2 11 6.4a1.3 1.3 0 0 1 2.6.4l-.3 3.3 2.4-5.2a1.3 1.3 0 0 1 2.4 1l-1.7 4.8 3-3.4a1.3 1.3 0 0 1 2 1.6l-3.3 4.6 1.9-.9a1.3 1.3 0 0 1 1.2 2.3l-4.9 2.8"/>',
    armL: '<g transform="matrix(-1 0 0 1 24 0)"><path d="M3.5 21.5 9.8 13.2M8.6 23.6l6.2-7.9"/><path d="M9.8 13.2 11 6.4a1.3 1.3 0 0 1 2.6.4l-.3 3.3 2.4-5.2a1.3 1.3 0 0 1 2.4 1l-1.7 4.8 3-3.4a1.3 1.3 0 0 1 2 1.6l-3.3 4.6 1.9-.9a1.3 1.3 0 0 1 1.2 2.3l-4.9 2.8"/></g>',
    footR: '<path d="M10.5 21.5c-2.4 0-3.6-1.8-3.6-4.2 0-3 1.7-4.8 2-7.7.2-2.3 1.5-3.4 3.3-3.4 2 0 3.2 1.4 3.2 3.9 0 2.8-1.5 4.5-1.8 7.2-.3 2.4-1.2 4.2-3.1 4.2z"/><circle cx="10.4" cy="3.6" r="1.5"/><circle cx="13.5" cy="3.4" r="1.1"/><circle cx="15.8" cy="4.3" r="1"/><circle cx="17.4" cy="5.9" r=".9"/>',
    footL: '<g transform="matrix(-1 0 0 1 24 0)"><path d="M10.5 21.5c-2.4 0-3.6-1.8-3.6-4.2 0-3 1.7-4.8 2-7.7.2-2.3 1.5-3.4 3.3-3.4 2 0 3.2 1.4 3.2 3.9 0 2.8-1.5 4.5-1.8 7.2-.3 2.4-1.2 4.2-3.1 4.2z"/><circle cx="10.4" cy="3.6" r="1.5"/><circle cx="13.5" cy="3.4" r="1.1"/><circle cx="15.8" cy="4.3" r="1"/><circle cx="17.4" cy="5.9" r=".9"/></g>',
    dua: `<path d="${STAR8}" fill="#f6c453"/><circle cx="12" cy="12" r="2.6"/>`,
    check: '<path d="M4.5 12.8l5 5L19.5 6.5" stroke-width="3"/>',
    back: '<path d="M14.5 5.5 8 12l6.5 6.5" stroke-width="2.6"/>',
    home: '<path d="M3.5 11.5 12 4.5l8.5 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
    sound: '<path d="M4 9.5h4l5-4v13l-5-4H4z"/><path d="M16.5 9a4 4 0 0 1 0 6"/><path d="M19 6.5a7.5 7.5 0 0 1 0 11"/>',
    mute: '<path d="M4 9.5h4l5-4v13l-5-4H4z"/><path d="M17 9.5l4 5M21 9.5l-4 5"/>',
    tap: '<path d="M3.5 10.5h8a5 5 0 0 1 5 5v1"/><path d="M3.5 7.5v6"/><path d="M8 10.5V6.5M5 6.5h6"/><path d="M16.5 19c0 1.2-.7 2-1.4 2.6-.7-.6-1.4-1.4-1.4-2.6 0-.9.8-1.9 1.4-2.7.6.8 1.4 1.8 1.4 2.7z" fill="#7fc4e8"/>',
    withme: '<path d="M8 21.5v-3.8L4.5 13a1.3 1.3 0 0 1 2.1-1.6L8.5 14V5a1.3 1.3 0 0 1 2.6 0v6V3.6a1.3 1.3 0 0 1 2.6 0V11V4.8a1.3 1.3 0 0 1 2.6 0V12V7.6a1.3 1.3 0 0 1 2.6 0v8.2c0 3.2-2.3 5.7-5.4 5.7z"/>',
    practice: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="12" cy="12" r="1" fill="#231e16"/>',
    hint: '<path d="M9.2 18h5.6M10.2 21h3.6"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1 1.3 1 2.2h5.2c0-.9.3-1.6 1-2.2A6 6 0 0 0 12 3z" fill="#fff4c9"/>',
    leaf: '<path d="M4.5 19.5C4.5 10.5 10.5 4.5 19.5 4.5c0 9-6 15-15 15z" fill="#8cc46a"/><path d="M4.5 19.5l8.5-8.5"/>',
    drop: '<path d="M12 3s-6.2 6.8-6.2 11a6.2 6.2 0 0 0 12.4 0C18.2 9.8 12 3 12 3z" fill="#9fd3ee"/>',
    listen: '<path d="M4 9.5h4l5-4v13l-5-4H4z"/><path d="M16.5 9a4 4 0 0 1 0 6"/>',
    mat: '<rect x="6" y="2.5" width="12" height="19" rx="1"/><path d="M9 11V8.5a3 3 0 0 1 6 0V11z"/><path d="M8.5 15.5h7M8.5 18h7"/>',
  };
  const icon = (n, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;

  /* =====================================================================================================
     5. SOUNDS: natural only (clicks, water, drops, leaves), and a running-water loop while the tap is open
     ===================================================================================================== */
  function sounds(){
    if (!window.Kit || !Kit.sfx) return;
    Kit.sfx.define({
      tap:  (L2, t) => L2.click(t, { freq: 2600, vol: .16 }),
      star: (L2, t) => L2.grains(t, { n: 8, spread: .2, freq: 7000, vol: .1 }),
      turn: (L2, t) => { L2.click(t, { freq: 1700, vol: .22 }); L2.burst(t + .03, { dur: .14, freq: 900, sweepTo: 1500, q: 4, vol: .05 }); L2.click(t + .16, { freq: 2300, vol: .14 }); },
      drop: (L2, t) => L2.drop(t, { size: 1.1, vol: .2 }),
      leaf: (L2, t) => { L2.grains(t, { n: 10, spread: .35, freq: 4200, vol: .08 }); L2.whoosh(t, { dur: .3, from: 500, to: 1600, vol: .05 }); },
      done: (L2, t) => { L2.drop(t, { size: .8, vol: .14 }); L2.grains(t + .05, { n: 10, spread: .45, freq: 6500, vol: .07 }); },
      hint: (L2, t) => { L2.drop(t, { size: 1.7, vol: .14 }); },
      page: (L2, t) => L2.whoosh(t, { dur: .28, from: 400, to: 1300, vol: .05 }),
    });
  }
  const play = (n, o) => { try { window.Kit && Kit.sfx && Kit.sfx.play(n, o); } catch (e) {} };
  const Flow = { node: null, gain: null };
  function waterSound(on){
    const L2 = window.Kit && Kit.sfx && Kit.sfx.lib, c = L2 && L2.ctx;
    if (!c) return;
    const now = c.currentTime;
    if (on){
      if (Flow.node || Kit.sfx.muted) return;
      const len = c.sampleRate*2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      let last = 0; for (let i = 0; i < len; i++){ const w = Math.random()*2 - 1; last = (last + .08*w)/1.08; d[i] = last*2.2 + w*.18; }
      const s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
      s.buffer = buf; s.loop = true; bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = .6;
      g.gain.setValueAtTime(.0001, now); g.gain.exponentialRampToValueAtTime(.16, now + .35);
      s.connect(bp); bp.connect(g); g.connect(L2.out || c.destination); s.start();
      Flow.node = s; Flow.gain = g;
    } else if (Flow.node){
      const s = Flow.node, g = Flow.gain; Flow.node = Flow.gain = null;
      try { g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.exponentialRampToValueAtTime(.0001, now + .3); s.stop(now + .35); } catch (e) {}
    }
  }

  /* ---------- voice: a recorded clip if there is one, else the device's English voice for the instruction
     (never for Arabic); then the recited words (Bismillah, the du'a) when their clip exists ---------- */
  let sayT = 0, sayId = 0;
  function speak(s){
    const me = ++sayId; clearTimeout(sayT);
    try { window.HHVoice && HHVoice.stop(); } catch (e) {}
    try { Kit.say && Kit.say.stop(); } catch (e) {}
    if (!window.HHVoice) return;
    HHVoice.has(s.voice).then(has => {
      if (me !== sayId) return null;
      if (has) return HHVoice.play(s.voice, { fallbackMs: 0 });
      try { Kit.say && Kit.say.text(s.speak, 'en'); } catch (e) {}
      return new Promise(r => { sayT = setTimeout(r, Math.min(6500, 700 + s.speak.split(' ').length*360)); });
    }).then(() => {
      if (me !== sayId) return;
      UI.drops.classList.add('go');
      if (s.arabicVoice) HHVoice.play(s.arabicVoice, { fallbackMs: 0 });
    });
  }
  const sayLine = t => { try { Kit.say && Kit.say.text(t, 'en'); } catch (e) {} };

  /* =====================================================================================================
     6. THE PAGE
     ===================================================================================================== */
  const st = { mode: Q.get('mode') === 'practice' ? 'practice' : 'with', i: 0, washed: {}, counts: {}, tap: false, tapA: 0, water: 0, run: {}, leafAt: {}, leaves: 0, grow: 1,
    p: 0, flash: [], misses: 0, finished: false };
  window.__wudu = st;
  const UI = {};
  const CAP = 70;            // seconds of running water that fill the meter

  function build(){
    document.body.innerHTML = '';
    const defs = svgEl('wd-defs'); defs.innerHTML = filterFor(.62).replace('id="hand"', 'id="hfx"').replace('id="wob"', 'id="wobh"'); document.body.appendChild(defs);
    const root = $('div', 'wd'); UI.root = root;
    // top: home (from the house), the two modes, sound
    const top = $('div', 'wd-top');
    const left = $('div', 'wd-tl');
    if (HHFlow.fromHouse){ const hb = $('button', 'wd-round', icon('home')); hb.setAttribute('aria-label', 'Home'); hb.onclick = () => { play('tap'); waterSound(false); HHFlow.home(); }; left.appendChild(hb); }
    const seg = $('div', 'wd-seg');
    [['with', 'withme', 'With me'], ['practice', 'practice', 'Practice']].forEach(([m, ic, label]) => {
      const b = $('button', '', icon(ic) + '<span>' + label + '</span>'); b.dataset.m = m; b.setAttribute('aria-label', label);
      b.onclick = () => { play('tap'); if (st.mode !== m) setMode(m); }; seg.appendChild(b); });
    const snd = $('button', 'wd-round'); snd.setAttribute('aria-label', 'Sound');
    const sndIcon = () => { snd.innerHTML = icon(window.Kit && Kit.sfx && Kit.sfx.muted ? 'mute' : 'sound'); };
    snd.onclick = () => { if (window.Kit && Kit.sfx) Kit.sfx.toggle(); sndIcon(); if (Kit.sfx.muted){ waterSound(false); try { HHVoice.stop(); Kit.say.stop(); } catch (e) {} } else if (st.tap) waterSound(true); };
    sndIcon();
    top.appendChild(left); top.appendChild(seg); const tr = $('div', 'wd-tr'); tr.appendChild(snd); top.appendChild(tr);
    root.appendChild(top);
    // progress: ten steps
    const prog = $('div', 'wd-prog'); UI.prog = [];
    for (let n = 1; n <= 10; n++){ const s = STEPS.find(x => x.n === n), d = $('span', 'wd-dot', icon(s.icon)); d.title = s.short; prog.appendChild(d); UI.prog.push(d); }
    root.appendChild(prog);
    // main: the basin (with hands, water meter and tap) and the step card (body map, words, count, buttons)
    const main = $('div', 'wd-main');
    const stage = $('div', 'wd-stage'), fig = $('div', 'wd-fig');
    UI.basin = mountBasin(fig);
    UI.hands = $('div', 'wd-hands'); fig.appendChild(UI.hands);
    fig.appendChild(UI.basin.fxs);                 // the stream falls onto the hands, so it is drawn over them
    UI.splash = $('div', 'wd-splash2', '<svg viewBox="0 0 40 16" aria-hidden="true"><path d="M6 12Q20 4 34 12" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity=".9"/><path d="M9 9l-4-5M31 9l4-5M15 7l-1-6M25 7l1-6" stroke="#bfe6f7" stroke-width="2.2" stroke-linecap="round"/></svg>'); fig.appendChild(UI.splash);
    UI.tapBtn = $('button', 'wd-tapbtn'); UI.tapBtn.setAttribute('aria-label', 'Tap'); UI.tapBtn.onpointerdown = e => { e.preventDefault(); toggleTap(); }; fig.appendChild(UI.tapBtn);
    UI.bubble = $('div', 'wd-bubble'); fig.appendChild(UI.bubble);
    // water meter: fills while the tap runs; the leaves earned sit under it
    const meter = $('div', 'wd-meter', `<div class="wd-mdrop">${icon('drop')}</div><div class="wd-mtube"><i class="wd-mfill"></i><b></b></div><div class="wd-mleaf">${icon('leaf')}<span>0</span></div>`);
    UI.mfill = meter.querySelector('.wd-mfill'); UI.mleaf = meter.querySelector('.wd-mleaf span'); UI.mleafBox = meter.querySelector('.wd-mleaf');
    fig.appendChild(meter);
    stage.appendChild(fig); main.appendChild(stage);
    UI.stage = stage; UI.fig = fig;
    // card
    const card = $('div', 'wd-card');
    const bodyWrap = $('div', 'wd-body'); UI.bodyWrap = bodyWrap; UI.body = mountBody(bodyWrap);
    bodyWrap.addEventListener('pointerdown', onBodyTap);
    const info = $('div', 'wd-info');
    info.innerHTML = `<div class="wd-head"><button class="wd-sicon" aria-label="Say it again"></button><div><div class="wd-num"></div><h1 class="wd-title"></h1></div></div>
      <p class="wd-detail"></p><div class="wd-ar" hidden></div><div class="wd-drops"></div><p class="wd-note" hidden></p>`;
    UI.sicon = info.querySelector('.wd-sicon'); UI.num = info.querySelector('.wd-num'); UI.title = info.querySelector('.wd-title'); UI.detail = info.querySelector('.wd-detail');
    UI.ar = info.querySelector('.wd-ar'); UI.drops = info.querySelector('.wd-drops'); UI.note = info.querySelector('.wd-note');
    UI.sicon.onclick = () => { play('tap'); if (st.mode === 'practice') practicePrompt(true); else speak(STEPS[st.i]); };
    const acts = $('div', 'wd-acts');
    UI.back = $('button', 'wd-btn wd-back', icon('back')); UI.back.setAttribute('aria-label', 'Back'); UI.back.onclick = () => { play('tap'); goBack(); };
    UI.tapB = $('button', 'wd-btn wd-tapb', icon('tap')); UI.tapB.setAttribute('aria-label', 'Turn the tap'); UI.tapB.onclick = () => toggleTap();
    UI.hint = $('button', 'wd-btn wd-hintb', icon('hint')); UI.hint.setAttribute('aria-label', 'Show me'); UI.hint.onclick = () => { play('tap'); practiceHint(true); };
    UI.done = $('button', 'wd-btn wd-done', icon('check') + '<span>Done</span>'); UI.done.setAttribute('aria-label', 'Done'); UI.done.onclick = () => { play('tap'); done(); };
    acts.appendChild(UI.back); acts.appendChild(UI.tapB); acts.appendChild(UI.hint); acts.appendChild(UI.done);
    card.appendChild(bodyWrap); card.appendChild(info); card.appendChild(acts);
    main.appendChild(card); UI.card = card; UI.info = info;
    root.appendChild(main);
    document.body.appendChild(root);
    UI.seg = seg;
  }

  /* ---------- the tap ---------- */
  let leverAnim = 0;
  function drawDyn(){ _clipN = 0; UI.basin.dyn.innerHTML = inkScale(leaves(Math.min(14, 5 + st.leaves), st.grow) + lever(st.tapA)); }
  function animate(fn){ let t0 = performance.now(); const step = now => { const dt = Math.min(.05, (now - t0)/1000); t0 = now; if (fn(dt) !== false) requestAnimationFrame(step); }; requestAnimationFrame(step); }
  function toggleTap(force){
    if (st.finished && force == null) return;
    const on = force == null ? !st.tap : !!force;
    if (on === st.tap) return;
    st.tap = on; play('turn');
    UI.fig.classList.toggle('won', on); UI.fig.classList.toggle('woff', !on);
    UI.root.classList.toggle('tap-on', on);
    waterSound(on);
    const id = ++leverAnim;
    animate(dt => { if (id !== leverAnim) return false; st.tapA = Math.max(0, Math.min(1, st.tapA + (on ? 1 : -1)*dt/.35)); drawDyn(); return on ? st.tapA < 1 : st.tapA > 0; });
    if (on){ flowLoop(); hideBubble(); }
    else if ((st.run[st.i] || 0) > .8 && !st.leafAt[st.i]) earnLeaf();      // water ran in this step, then the child turned it off
    suggest();
  }
  function flowLoop(){
    let t0 = performance.now();
    const step = now => { if (!st.tap) return; const dt = Math.min(.1, (now - t0)/1000); t0 = now;
      st.water += dt; st.run[st.i] = (st.run[st.i] || 0) + dt;
      UI.mfill.style.transform = `scaleY(${Math.min(1, st.water/CAP).toFixed(4)})`;
      requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function earnLeaf(){
    st.leafAt[st.i] = true; st.leaves++; st.grow = 0; play('leaf');
    UI.mleaf.textContent = st.leaves; UI.mleafBox.classList.remove('pop'); void UI.mleafBox.offsetWidth; UI.mleafBox.classList.add('pop');
    bubble(icon('leaf') + '<span>' + (st.leaves === 1 ? T.water.lesson : T.water.leaf) + '</span>', 2600, 'leaf');
    animate(dt => { st.grow = Math.min(1, st.grow + dt/.6); drawDyn(); return st.grow < 1; });
  }
  let bubT = 0;
  function bubble(html, ms, cls){ UI.bubble.innerHTML = html; UI.bubble.className = 'wd-bubble in ' + (cls || ''); clearTimeout(bubT); if (ms) bubT = setTimeout(hideBubble, ms); }
  function hideBubble(){ UI.bubble.classList.remove('in'); }
  // which way the tap should go now (a glow, never a rule)
  function suggest(){
    const s = STEPS[st.i], want = st.mode === 'practice' || st.finished ? null : s.water ? (st.run[st.i] > 0 ? null : 'on') : (s.id === 'head' || s.id === 'ears' ? null : 'off');
    const glow = (want === 'on' && !st.tap) || (want === 'off' && st.tap) || (st.tap && st.nudgeOff);
    UI.tapBtn.classList.toggle('pulse', !!glow); UI.tapB.classList.toggle('pulse', !!glow);
    UI.tapB.classList.toggle('on', st.tap);
  }

  /* ---------- steps (Do it with me) ---------- */
  function setStep(i, quiet){
    st.i = Math.max(0, Math.min(LAST, i)); const s = STEPS[st.i];
    st.nudgeOff = false;
    UI.root.dataset.step = s.id;
    UI.root.classList.toggle('is-dua', s.id === 'dua');
    UI.root.classList.toggle('has-ar', !!s.arabic);
    UI.sicon.innerHTML = icon(s.icon);
    UI.num.textContent = s.n + ' / 10';
    UI.title.textContent = s.title; UI.detail.textContent = s.detail;
    // Arabic only for the spoken parts
    const ar = s.arabic && T[s.arabic];
    UI.ar.hidden = !ar;
    if (ar){
      const extra = s.arabic === 'shahada' && T.shahadaExtra && T.shahadaExtra.show ? T.shahadaExtra : null;
      UI.ar.innerHTML = [ar, extra].filter(Boolean).map(a => `<p class="ar" lang="ar" dir="rtl">${a.ar}</p><p class="tr">${a.tr}</p><p class="en">${a.en}</p>`).join('');
    }
    // the count: drops the child can tap, one per time
    UI.drops.innerHTML = ''; UI.drops.classList.remove('go');
    const n = s.count || 0, have = st.counts[st.i] || 0;
    for (let k = 0; k < n; k++){ const b = $('button', 'wd-drop' + (k < have ? ' full' : ''), icon('drop') + '<b>' + (k + 1) + '</b>'); b.setAttribute('aria-label', String(k + 1));
      b.onclick = () => { if (k < (st.counts[st.i] || 0)) return; st.counts[st.i] = k + 1; b.classList.add('full'); play('drop'); const nx = b.nextElementSibling; if (nx) nx.classList.add('next'); b.classList.remove('next');
        if (k + 1 === n) UI.done.classList.add('ready'); }; UI.drops.appendChild(b); }
    const firstEmpty = UI.drops.children[have]; if (firstEmpty) firstEmpty.classList.add('next');
    UI.done.classList.toggle('ready', !n || have >= n);
    UI.done.querySelector('span').textContent = s.id === 'dua' ? 'Finish' : 'Done';
    UI.back.disabled = st.i === 0;
    UI.note.hidden = true;
    progress();
    showHands(s.id);
    drawBody();
    suggest();
    if (!quiet) speak(s);
  }
  function progress(){
    const s = STEPS[st.i];
    const prac = st.mode === 'practice', curN = st.finished ? 11 : prac ? (PRACT[st.p] ? PRACT[st.p].n : 10) : s.n;
    UI.prog.forEach((d, k) => { const n = k + 1;
      d.classList.toggle('done', n < curN); d.classList.toggle('cur', n === curN);
      d.classList.toggle('hide', prac && n > curN);     // practising: the steps still to come stay hidden
    });
  }
  function done(){
    if (st.finished) return;
    const s = STEPS[st.i];
    if (st.mode === 'practice'){ if (s.id === 'dua') finish(); return; }
    s.area.forEach(a => { if (a !== 'all') st.washed[a] = true; });
    if (s.count) st.counts[st.i] = s.count;
    if (s.id === 'dua'){ finish(); return; }
    play('done');
    const leftOn = st.tap && s.water;
    setStep(st.i + 1);
    if (leftOn){ st.nudgeOff = true; bubble(icon('tap') + '<span>' + T.water.turnOff + '</span>', 3200); suggest(); }
  }
  function goBack(){
    if (st.i === 0 || st.finished) return;
    const prev = STEPS[st.i - 1];
    prev.area.forEach(a => { delete st.washed[a]; });
    setStep(st.i - 1);
  }

  /* ---------- Practice: tap the part that comes next ---------- */
  const PRACT = STEPS.slice(0, LAST);    // everything but the du'a (that ends the practice)
  function practicePrompt(say){
    const s = PRACT[st.p];
    UI.num.textContent = (s ? s.n : 10) + ' / 10';
    UI.sicon.innerHTML = icon('practice');
    UI.title.textContent = st.p === 0 ? T.practice.first : T.practice.ask;
    UI.detail.textContent = '';
    if (say) sayLine(UI.title.textContent);
  }
  function setPractice(){
    st.p = Math.max(0, Math.min(PRACT.length, st.p));
    UI.root.classList.remove('is-dua', 'has-ar');
    UI.root.dataset.step = 'practice';
    UI.ar.hidden = true; UI.drops.innerHTML = ''; UI.note.hidden = true;
    if (st.p >= PRACT.length){ st.i = LAST; setStep(LAST); return; }
    st.i = st.p; st.flash = [];
    practicePrompt(false);
    UI.hands.innerHTML = '';
    progress(); drawBody(); suggest();
  }
  function bodyPoint(e){
    const m = UI.body.ink.getScreenCTM(); if (!m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y, k: 1/m.a };         // k: body units per screen pixel
  }
  let flashT = 0;
  function flashArea(list, ms){ st.flash = list; drawBody(); clearTimeout(flashT); flashT = setTimeout(() => { st.flash = []; drawBody(); }, ms); }
  function onBodyTap(e){
    if (st.mode !== 'practice' || st.finished || st.p >= PRACT.length) return;
    const pt = bodyPoint(e); if (!pt) return;
    e.preventDefault();
    const s = PRACT[st.p], want = s.area, tol = 20*pt.k;
    const dist = z => Math.hypot(pt.x - z.x, pt.y - z.y);
    const ok = ZONES.some(z => want.indexOf(z.a) >= 0 && dist(z) < z.r + 3);
    let hit = ZONES.find(z => dist(z) < z.r);
    if (!hit){ let best = null; ZONES.forEach(z => { const d = dist(z) - z.r; if (d < tol && (!best || d < best.d)) best = { z, d }; }); hit = best && best.z; }
    const right = ok || (hit && want.indexOf(hit.a) >= 0);
    try { window.KahfBridge && KahfBridge.answer(); } catch (err) {}
    if (right){
      want.forEach(a => { st.washed[a] = true; });
      play('drop'); flashArea(want, 900);
      UI.sicon.innerHTML = icon(s.icon); UI.title.textContent = s.n + '. ' + s.short; UI.detail.textContent = s.detail;
      sayLine(s.short);
      st.p++; st.misses = 0;
      progress();
      clearTimeout(st.pT);
      st.pT = setTimeout(() => { if (st.mode !== 'practice') return; if (st.p >= PRACT.length){ st.i = LAST; setStep(LAST); } else practicePrompt(true); }, 1500);
      return;
    }
    if (!hit) return;                            // a tap on nothing: no hint, no sound
    st.misses++;
    play('hint');
    const already = st.washed[hit.a];
    const txt = already ? T.practice.again : T.practice.notYet.replace('{next}', s.short.toLowerCase());
    UI.title.textContent = txt; UI.detail.textContent = '';
    sayLine(txt);
    if (st.misses >= 2 || st.p === 0) practiceHint(false);
  }
  function practiceHint(say){
    if (st.mode !== 'practice' || st.p >= PRACT.length) return;
    const s = PRACT[st.p]; flashArea(s.area, 1800);
    UI.sicon.innerHTML = icon(s.icon);
    if (say){ const t = T.practice.show.replace('{next}', s.short.toLowerCase()); UI.title.textContent = t; sayLine(t); }
  }

  /* ---------- modes ---------- */
  function reset(){
    Object.assign(st, { i: 0, washed: {}, counts: {}, run: {}, leafAt: {}, p: 0, flash: [], misses: 0, finished: false, nudgeOff: false });
  }
  function setMode(m){
    st.mode = m; reset();
    if (st.tap) toggleTap(false);
    UI.root.classList.toggle('mode-practice', m === 'practice'); UI.root.classList.toggle('mode-with', m !== 'practice');
    [].forEach.call(UI.seg.children, b => b.setAttribute('aria-pressed', b.dataset.m === m));
    // the body map moves: small in the card while doing wudu, big on the stage while practising
    if (m === 'practice'){ UI.stage.appendChild(UI.bodyWrap); setPractice(); practicePrompt(true); }
    else { UI.card.insertBefore(UI.bodyWrap, UI.info); setStep(0); }
  }

  /* ---------- the end: a calm moment, then on to salah (from the house) or the finish sheet ---------- */
  function finish(){
    if (st.finished) return;
    st.finished = true;
    if (st.tap) toggleTap(false);
    Object.keys(BODY.areas).forEach(a => { if (a !== 'heart') st.washed[a] = true; });
    UI.root.classList.add('calm');
    drawBody(); progress(); suggest();
    try { window.KahfBridge && KahfBridge.complete(); } catch (e) {}
    const data = { mode: st.mode, leaves: st.leaves, water: Math.round(st.water) };
    setTimeout(() => { try { Kit.say && Kit.say.praise('mashaallah'); } catch (e) {} }, 500);
    setTimeout(() => {
      const box = $('div', 'wd-end', `<p class="wd-end-calm">${T.finish.calm}</p><p class="wd-end-p">${T.finish.purity}</p>` +
        (st.leaves ? `<p class="wd-end-leaf">${icon('leaf')}<b>${st.leaves}</b><span>${T.water.sunnah}</span></p>` : ''));
      if (HHFlow.fromHouse){
        Kit.ui.sheet({ title: T.finish.title, content: box, buttons: [{ label: T.finish.pray, icon: icon('mat'), primary: true, onClick: () => HHFlow.done('wudu', data) }] });
      } else {
        HHFlow.done('wudu', data);       // saves today's log; not from the house, so it stays here
        Kit.ui.sheet({ title: T.finish.title, content: box, buttons: [{ label: T.finish.again, primary: true, onClick: () => { UI.root.classList.remove('calm'); setMode(st.mode); } }] });
      }
    }, 1500);
  }

  /* ---------- start ---------- */
  sounds();
  build();
  drawDyn();
  if (Q.has('leaves')){ st.leaves = +Q.get('leaves') || 0; UI.mleaf.textContent = st.leaves; drawDyn(); }
  if (Q.has('water')){ st.water = (+Q.get('water') || 0)*CAP; UI.mfill.style.transform = `scaleY(${Math.min(1, st.water/CAP)})`; }
  setMode(st.mode);
  if (st.mode === 'with' && Q.has('step')){
    const n = +Q.get('step') || 1, side = Q.get('side') === 'L' ? 1 : 0;
    let idx = STEPS.findIndex(s => s.n === n); if (idx < 0) idx = 0;
    if (STEPS[idx + 1] && STEPS[idx + 1].n === n && side) idx++;
    for (let k = 0; k < idx; k++) STEPS[k].area.forEach(a => { if (a !== 'all') st.washed[a] = true; });
    setStep(idx, true);
  }
  if (st.mode === 'practice' && Q.has('pdone')){ st.p = +Q.get('pdone') || 0; for (let k = 0; k < Math.min(st.p, PRACT.length); k++) PRACT[k].area.forEach(a => { st.washed[a] = true; }); setPractice(); }
  if (Q.get('tap') === '1') toggleTap(true);
  if (Q.get('done') === '1') setTimeout(finish, 300);
  // hand the service worker every file this page used, so it works offline after one visit
  addEventListener('load', () => setTimeout(() => {
    const c = navigator.serviceWorker && navigator.serviceWorker.controller; if (!c) return;
    const urls = [location.pathname].concat(performance.getEntriesByType('resource').map(e => e.name)).map(u => { try { const x = new URL(u, location.href); return x.origin === location.origin && x.pathname.indexOf('/KidsGames/') === 0 ? x.pathname : null; } catch (e) { return null; } })
      .filter((u, i, a) => u && a.indexOf(u) === i);
    c.postMessage({ type: 'CACHE_URLS', urls });
  }, 400));
  document.addEventListener('visibilitychange', () => { if (document.hidden) waterSound(false); else if (st.tap) waterSound(true); });
})();
