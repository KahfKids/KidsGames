/* Helping Home: the animals (window.PETS). The family cat, the neighbour's dog, and birds. All faceless: body shapes,
   ears and tails, never eyes or mouths. The same API style as FAMILY (house/family.js, which this file needs):
     PETS.state(date, ctx)       { cat: {at, pose, facing, frame, activity, room, fl}, dog: {...}, neighbour: {...}, birds: [...] }
     PETS.draw(kind, pose, at, facing, frame, opts) -> [{ box, at, svg }]   byDepth items ('cat' | 'dog' | 'bird')
     PETS.actors(now, ctx, rt)   live actors for FAMILY.live (the cat, the dog and its walker, the feeder birds, pigeons)
     PETS.bowl(date, ctx) / PETS.feeder(date, ctx)   { level 0..1, full, empty }
     PETS.requests(date, ctx)    'fill the cat's bowl', 'fill the bird feeder' when empty (jobs: fill-cat-bowl, fill-feeder)
     PETS.tap(id)                the cat purrs (a soft natural rumble) for a few seconds
     PETS.sky({ el, toPx, now }) flocks crossing the sky: HTML elements moved by compositor animations (no main thread)
   ctx: everything FAMILY's ctx takes, plus catFills / feederFills: arrays of times (ms) the child filled them today.
   Deterministic per day, like the family: state(t) is a pure function of t and those fills (the purr is the exception). */
(function () {
  'use strict';
  const F = window.FAMILY; if (!F || !F._k) return;
  const K = F._k, { add, mul, sub, lerp3, len3, n3, tube, rings3, bandBody, hullOf, toneF, framer, pad, D2R, MIN, capPath, lightW } = K;
  const PETS = window.PETS = window.PETS || {};
  const H = () => window.HD || {};

  /* =================================== drawing =================================== */
  const CAT = { col: '#e39a4a', stripe: '#b8692c', paw: '#f6e4c8' }, DOG = { col: '#b07b4c', ear: '#6e4a2c', collar: '#3f9c92' };
  // a body of rings along the animal's spine (local u forward, w up), shaded in three bands, one ink outline
  function body(W, Dd, pts, m){
    const R = pts.map(([u, w, rs, rf]) => ({ c: W([u, 0, w]), a: n3(Dd([1, 0, 0])), s: n3(Dd([0, 1, 0])), rs, rf }));
    const RR = rings3(R, 12); return { svg: bandBody(RR, m) + ink(hullOf([].concat(...RR)), 1.4), pts: [].concat(...RR) };
  }
  const ear = (W, base, tip, w, col) => shape([W(add(base, [0, w, 0])), W(tip), W(add(base, [0, -w, 0]))], col, .9);
  function drawCat(pose, at, facing, frame, o){
    const fr = framer(at, facing), W = fr.W, Dd = fr.D, m = matOf(CAT.col), k = (frame || 0) % 4, parts = [], all = [];
    const put = (p, svg, b = 0) => parts.push({ z: depthOf(W(p)) + b, svg });
    let shadow = `<path d="${pd(on(PZ(at[2] + .3), ellUV(at[0], at[1], 12, 12, 14)))}" fill="${SHADOW}" opacity=".28"/>`;
    const leg = (u, v, top, foot) => tube([W([u, v, top]), W(foot)], 3.4, m, false);
    let headC, tail;
    if (pose === 'curl' || pose === 'nap'){
      // curled up asleep: a round loaf, the head tucked in at the front, the tail wrapped round
      const b = body(W, Dd, [[-8, 5, 6, 4.2], [0, 6.2, 8.5, 5.6], [7, 5.4, 6.4, 4.4]], m); put([0, 0, 6], b.svg); all.push(...b.pts);
      headC = [7, 4, 6.5];
      tail = [[-8, -3, 3], [-2, -9, 2.5], [6, -8, 2.5], [10, -3, 3]];
      const breath = k % 2 ? .3 : 0; headC = add(headC, [0, 0, breath]);
    } else if (pose === 'sit' || pose === 'groom' || pose === 'purr' || pose === 'sill'){
      const b = body(W, Dd, [[-4, 6, 6.4, 6], [0, 11, 5.8, 5.6], [3, 16, 4.6, 4.4]], m); put([0, 0, 10], b.svg); all.push(...b.pts);
      parts.push({ z: depthOf(W([4, 3, 4])), svg: leg(3, 2.8, 12, [5, 2.6, 1]) }, { z: depthOf(W([4, -3, 4])), svg: leg(3, -2.8, 12, [5, -2.6, 1]) });
      const lick = pose === 'groom' && (k === 1 || k === 3);
      headC = pose === 'groom' ? [6, lick ? 1 : 0, lick ? 15 : 18] : [4.5, 0, 22.5];
      if (pose === 'groom' && lick) parts.push({ z: depthOf(W([7, 3, 14])) + 2, svg: tube([W([3, 3, 13]), W([7, 2, 15])], 3, m, false) });
      const sw = pose === 'purr' ? [0, 2, 0, -2][k] : 0;
      tail = [[-6, 0, 2], [-4, -7 - sw, 1.6], [3, -9 - sw, 1.6], [7, -5, 1.8]];
    } else if (pose === 'eat'){
      const b = body(W, Dd, [[-9, 11, 5, 5], [0, 11.6, 5.8, 5.4], [7, 10, 5, 4.6]], m); put([0, 0, 11], b.svg); all.push(...b.pts);
      headC = [12, 0, 6.5 + (k % 2 ? .8 : 0)];
      for (const [u, v] of [[6, 2.8], [6, -2.8], [-7, 2.8], [-7, -2.8]]) parts.push({ z: depthOf(W([u, v, 4])), svg: leg(u, v, 9, [u + .5, v, 1]) });
      tail = [[-9, 0, 12], [-15, 0, 15], [-18, -2, 21], [-16, -3, 24]];
    } else if (pose === 'pounce'){
      // play with the yarn: crouched, the rear up, one paw batting
      const b = body(W, Dd, [[-8, 10, 5, 5], [0, 8, 5.8, 5.2], [7, 6.5, 5, 4.4]], m); put([0, 0, 8], b.svg); all.push(...b.pts);
      headC = [12, 0, 9];
      const bat = [0, 6, 3, 6][k];
      for (const [u, v, up] of [[6, 2.8, bat], [6, -2.8, 0], [-7, 2.8, 0], [-7, -2.8, 0]]) parts.push({ z: depthOf(W([u, v, 4])), svg: leg(u, v, 6, [u + 2 + up*.6, v, 1 + up]) });
      tail = [[-8, 0, 11], [-14, 0, 14], [-17, 2 + [0, 2, 0, -2][k], 18], [-15, 3, 21]];
      const yb = W([19 + [0, 2, 4, 2][k], [0, 1, 0, -1][k], 3]);
      parts.push({ z: depthOf(yb) + 1, svg: sphere(yb, 3, matOf('#e98fb0'), .9) + `<path d="${pd([yb, W([24, 4, .3]), W([30, 2, .3])], false)}" fill="none" stroke="#e98fb0" stroke-width="1"/>` });
    } else {
      // stand / walk: four legs, the tail up in a curve
      const b = body(W, Dd, [[-9, 12, 5, 5], [0, 12.6, 5.8, 5.4], [8, 13, 5, 4.8]], m); put([0, 0, 12], b.svg); all.push(...b.pts);
      headC = [13, 0, 17];
      const sw = pose === 'walk' ? [3, 0, -3, 0][k] : 0, lift = pose === 'walk' ? [1.5, 0, 0, 0][k] : 0, lift2 = pose === 'walk' ? [0, 0, 1.5, 0][k] : 0;
      for (const [u, v, d, l] of [[7, 2.8, sw, lift], [7, -2.8, -sw, lift2], [-7, 2.8, -sw, lift2], [-7, -2.8, sw, lift]])
        parts.push({ z: depthOf(W([u, v, 4])), svg: leg(u, v, 10, [u + d, v, 1 + l]) });
      tail = [[-9, 0, 14], [-14, 0, 18], [-15, -1, 25], [-12, -2, 29 + (pose === 'walk' ? [0, 1, 0, -1][k] : 0)]];
    }
    // the stripes on the back, the head (a plain sphere) and two ears; no face
    const hc = W(headC); all.push(hc);
    parts.push({ z: depthOf(hc) + 1, svg: sphere(hc, 5, m, 1.2) + ear(W, add(headC, [0, 2.6, 3.6]), add(headC, [-.5, 3.2, 8.6]), 1.7, CAT.col) + ear(W, add(headC, [0, -2.6, 3.6]), add(headC, [-.5, -3.2, 8.6]), 1.7, CAT.col) });
    if (tail){ const T = tail.map(p => W(p)); all.push(...T); parts.push({ z: depthOf(T[1]) - 1, svg: tubeC(T, 2.6, m) }); }
    parts.sort((a, b) => a.z - b.z);
    return finish(shadow + parts.map(p => p.svg).join(''), all, at);
  }
  function drawDog(pose, at, facing, frame, o){
    const fr = framer(at, facing), W = fr.W, Dd = fr.D, m = matOf(DOG.col), k = (frame || 0) % 4, parts = [], all = [];
    const shadow = `<path d="${pd(on(PZ(at[2] + .3), ellUV(at[0], at[1], 17, 17, 14)))}" fill="${SHADOW}" opacity=".28"/>`;
    const leg = (u, v, top, foot) => tube([W([u, v, top]), W(foot)], 4.6, m, false);
    let headC, tailUp = 1;
    if (pose === 'sit'){
      const b = body(W, Dd, [[-8, 9, 8, 7.5], [2, 15, 8.4, 8], [8, 21, 7, 6.6]], m); parts.push({ z: depthOf(W([0, 0, 14])), svg: b.svg }); all.push(...b.pts);
      for (const v of [4, -4]) parts.push({ z: depthOf(W([10, v, 6])), svg: leg(9, v, 18, [11, v, 1]) });
      headC = [12, 0, 31]; tailUp = 0;
    } else if (pose === 'lie'){
      const b = body(W, Dd, [[-12, 6, 8, 5.6], [0, 7, 9, 6.4], [10, 7, 7.6, 5.6]], m); parts.push({ z: depthOf(W([0, 0, 7])), svg: b.svg }); all.push(...b.pts);
      for (const v of [4, -4]) parts.push({ z: depthOf(W([16, v, 2])), svg: leg(12, v, 4, [20, v, 1.6]) });
      headC = [18, 0, 11 + (k % 2 ? .4 : 0)]; tailUp = 0;
    } else {
      const run = pose === 'run', sniff = pose === 'sniff';
      const b = body(W, Dd, [[-12, 19, 7.4, 7.6], [0, 20, 8.4, 8.2], [11, 21, 7.6, 7.8]], m); parts.push({ z: depthOf(W([0, 0, 20])), svg: b.svg }); all.push(...b.pts);
      const sw = pose === 'walk' ? [4, 0, -4, 0][k] : run ? [8, 2, -8, -2][k] : 0, l1 = pose === 'walk' || run ? [2, 0, 0, 0][k]*(run ? 2 : 1) : 0, l2 = pose === 'walk' || run ? [0, 0, 2, 0][k]*(run ? 2 : 1) : 0;
      for (const [u, v, d, l] of [[10, 4, sw, l1], [10, -4, -sw, l2], [-10, 4, -sw, l2], [-10, -4, sw, l1]])
        parts.push({ z: depthOf(W([u, v, 6])), svg: leg(u, v, 16, [u + d, v, 1 + l]) });
      headC = sniff ? [20, 0, 9 + (k % 2 ? 1.5 : 0)] : [19, 0, 28 + (run ? [0, 1, 0, -1][k] : 0)];
    }
    // collar, head (a sphere with a short snout shape, no face), floppy ears, the tail
    const hc = W(headC), snout = W(add(headC, [6, 0, -2])); all.push(hc, snout);
    let hs = tube([hc, snout], 6.4, m, false) + sphere(hc, 6.6, m, 1.3);
    hs = (vis(n3(Dd([1, 0, 0]))) ? hs : hs) + ear2(W, add(headC, [-1, 5.6, 2]), DOG.ear) + ear2(W, add(headC, [-1, -5.6, 2]), DOG.ear);
    parts.push({ z: depthOf(hc) + 1, svg: hs });
    const collarC = W(lerp3(headC, [9, 0, headC[2] - 8], .5));
    parts.push({ z: depthOf(collarC) + .5, svg: tube([W(add(lerp3(headC, [9, 0, headC[2] - 8], .5), [0, 3.5, 0])), W(add(lerp3(headC, [9, 0, headC[2] - 8], .5), [0, -3.5, 0]))], 2.2, matOf(DOG.collar), false) });
    const wag = [0, 3, 0, -3][k], T = (tailUp ? [[-12, 0, 22], [-18, wag*.5, 27], [-20, wag, 33]] : [[-10, 0, 6], [-17, 3 + wag*.3, 2], [-22, 5, 1.5]]).map(p => W(p)); all.push(...T);
    parts.push({ z: depthOf(T[1]) - 1, svg: tubeC(T, 3, m) });
    // the leash to the neighbour's hand (a world point), when walking
    if (o && o.leash){ const a = collarC, b = o.leash, mid = lerp3(a, b, .5), sag = add(mid, [0, 0, -8]);
      parts.push({ z: depthOf(mid) + 3, svg: `<path d="M${P(...a).map(fx).join(' ')}Q${P(...sag).map(fx).join(' ')} ${P(...b).map(fx).join(' ')}" fill="none" stroke="#e8574a" stroke-width="1.3"/>` }); all.push(b); }
    if (o && o.ball){ const bp = W([25, 0, headC[2] - 3]); parts.push({ z: depthOf(bp) + 2, svg: sphere(bp, 3.4, matOf('#f2c230'), .9) }); all.push(bp); }
    parts.sort((a, b) => a.z - b.z);
    return finish(shadow + parts.map(p => p.svg).join(''), all, at);
  }
  // a floppy ear: a drop shape hanging from the side of the head
  function ear2(W, base, col){ const p = [base, add(base, [-2, base[1] > 0 ? 2 : -2, -4]), add(base, [1, base[1] > 0 ? 1.4 : -1.4, -9]), add(base, [3, 0, -5])].map(W);
    return `<path d="M${P(...p[0]).map(fx).join(' ')}Q${P(...p[1]).map(fx).join(' ')} ${P(...p[2]).map(fx).join(' ')}Q${P(...p[3]).map(fx).join(' ')} ${P(...p[0]).map(fx).join(' ')}Z" fill="${col}" stroke="${INK}" stroke-width=".9" stroke-linejoin="round"/>`; }
  // a small bird (feeder, roof): a round body, a wedge tail, a wing (up when flapping); no face
  function drawBird(pose, at, facing, frame, o){
    // drawn chunky (1.7x a real sparrow) so it reads on a phone; a flat silhouette: body and head one shape, a wedge
    // tail, a little beak; wings only while flying (raised, outside the body). Nothing inside the shape: no eye marks.
    const fr = framer(at, facing), Z = 1.7, W = p => fr.W(mul(p, Z)), col = (o && o.col) || '#6d8fc7', k = (frame || 0) % 2;
    const peck = pose === 'peck' && k, hz = peck ? 3.6 : 5.4, hu = peck ? 3.4 : 2.6;
    const pts = []; for (let i = 0; i < 18; i++){ const a = i/18*2*Math.PI;
      for (const v of [-1.8, 0, 1.8]) pts.push(W([Math.cos(a)*3.3*(v ? .8 : 1), v, 3.4 + Math.sin(a)*2.3*(v ? .8 : 1)]));
      pts.push(W([hu + Math.cos(a)*1.9, 0, hz + Math.sin(a)*1.9]), W([hu, Math.cos(a)*1.6, hz + Math.sin(a)*1.6])); }
    const silo = sp(hull(pts.map(p => P(...p))));
    const tail = shape([W([-2.6, .9, 4]), W([-5.6, 0, 5.4]), W([-2.6, -.9, 3.4])], mix(col, '#000000', .2), .8);
    const beak = shape([W([hu + 1.5, .5, hz]), W([hu + 3.2, 0, hz - .3]), W([hu + 1.5, -.5, hz - .6])], '#f2c230', .5);
    const wing = pose === 'fly' || pose === 'flap' ? shape([W([.5, 0, 4.4]), W([-1.5, k ? 5.5 : 3, k ? 9.5 : 7.5]), W([-3.2, 0, 4.6])], mix(col, '#ffffff', .25), .8) + shape([W([.5, 0, 4.4]), W([-1.5, k ? -5.5 : -3, k ? 9.5 : 7.5]), W([-3.2, 0, 4.6])], mix(col, '#ffffff', .25), .8) : '';
    const legs = pose === 'fly' ? '' : `<path d="${pd([W([0, .8, 1.4]), W([0, .8, 0])], false) + pd([W([0, -.8, 1.4]), W([0, -.8, 0])], false)}" fill="none" stroke="${INK}" stroke-width=".8"/>`;
    const svg = legs + tail + `<path d="${silo}" fill="${col}" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>` + beak + wing;
    return finish(svg, [W([-6, -6, 0]), W([6, 6, 10])], at);
  }
  function bowlSvg(lv){
    let s2 = cyl(0, 0, 0, 3.4, 5.6, matOf('#5b8fd6'), toneI, 1, 14);
    if (lv > 0) s2 += `<path d="${pd(on(PZ(3.5 + lv*1.4), ellUV(0, 0, 4.4, 4.4, 12)))}" fill="#c98a52" stroke="${INK}" stroke-width=".6"/>`;
    return s2; }
  function cushion(){ return cyl(0, 0, 0, 4, 13, matOf('#9fc7ef'), toneI, 1.1, 18) + `<path d="${pd(on(PZ(4.1), ellUV(0, 0, 9, 9, 16)))}" fill="none" stroke="#7aa7d6" stroke-width="1"/>`; }
  // a ball for animal heads and the yarn: lit colour, a shadow crescent on the far side, ink round (2 nodes)
  function sphere(c, r, m, inkw = 1.2){ const q = P(...c), R = (r*Math.sqrt(1.5)).toFixed(2), sh = capPath(c, r*1.003, mul(lightW(), -1), -r*.15);
    return `<circle cx="${fx(q[0])}" cy="${fx(q[1])}" r="${R}" fill="${m.l}" stroke="${INK}" stroke-width="${(inkw*1.8).toFixed(2)}"/>` + (sh ? `<path d="${sh}" fill="${m.m}"/>` : ''); }
  const disc2w = (c, r, col) => { const q = P(...c); return `<circle cx="${fx(q[0])}" cy="${fx(q[1])}" r="${(r*Math.sqrt(1.5)).toFixed(2)}" fill="${col}" stroke="${INK}" stroke-width=".8"/>`; };
  const fx = v => v.toFixed(1);
  // a curved tail: a tube through points (ink, colour; two nodes)
  function tubeC(T, w, m){ const d = 'M' + T.map(p => P(...p).map(fx).join(' ')).join('L'), W2 = w*Math.sqrt(1.5);
    return `<path d="${d}" fill="none" stroke="${INK}" style="stroke-width:${(W2 + 2.2*(INK_K || 1)).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${m.m}" style="stroke-width:${W2.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`; }
  function finish(svg, pts, at){ const bb = [[0, 1, 2].map(i => Math.min(...pts.map(p => p[i]), at[i])), [0, 1, 2].map(i => Math.max(...pts.map(p => p[i]), at[i]))];
    return { svg: `<g class="pet">${svg}</g>`, box: bb }; }
  const CACHE = new Map();
  function draw(kind, pose, at, facing, frame, opts){
    at = at || [0, 0, 0];
    const k = [kind, pose, at.map(v => v.toFixed(1)).join(','), (facing || 0).toFixed(0), frame || 0, YAW.toFixed(2), PITCH.toFixed(2), (INK_K || 1).toFixed(3), opts ? JSON.stringify(opts) : ''].join('|');
    let r = CACHE.get(k);
    if (!r){ const d = kind === 'dog' ? drawDog(pose, at, facing, frame, opts) : kind === 'bird' ? drawBird(pose, at, facing, frame, opts) : drawCat(pose, at, facing, frame, opts);
      r = { box: d.box, at: [(d.box[0][0] + d.box[1][0])/2, (d.box[0][1] + d.box[1][1])/2, at[2] + 8], svg: d.svg, who: kind }; CACHE.set(k, r); if (CACHE.size > 300) CACHE.delete(CACHE.keys().next().value); }
    return [Object.assign({ fl: K.floorOf(at) }, r)];
  }

  /* =================================== the cat's day =================================== */
  const ZF = () => H().ZF || [12, 200, 388];
  // places the cat likes (defaults for this house; PETS.setSpots overrides): sun spots by time of day, the bowl, the
  // windowsill, the cat bed, the yarn on the rug
  let SPOTS = null;
  function spots(){
    if (SPOTS) return SPOTS; const Z = ZF();
    return {
      bowl: [30, 236, Z[0]], bowlFace: 180, bed: [126, 286, Z[0]], yarn: [104, 344, Z[0]],
      sill: [7, 345, Z[0] + 60], sillFace: 0, sillNursery: [7, 118, Z[2] + 52],
      sun: [[96, 340, Z[0]], [150, 500, 6], [80, 380, Z[2]], [118, 200, Z[0]]],     // morning living room, midday yard, afternoon my room, evening kitchen
    };
  }
  const hashS = K.hashS, rngOf = K.rngOf;
  function fillsOf(ctx, k, D0){ const a = (ctx && ctx[k]) || []; return a.map(t => +new Date(t)).filter(t => t >= D0).sort((x, y) => x - y); }
  const CAT_DAY = new Map();
  function catDay(date, ctx){
    ctx = ctx || {};
    const D0 = K.midnight(date), fills = fillsOf(ctx, 'catFills', D0), t = K.timesOf(date, ctx), key = K.dayKeyOf(date) + '|' + fills.join(',') + '|' + t.maghrib.getTime();
    if (CAT_DAY.has(key)) return CAT_DAY.get(key);
    // the family fills the bowl at breakfast; after that it is the child's job when it is empty
    const S = spots(), R = rngOf(hashS('hh.cat.' + K.dayKeyOf(date))), segs = [], SR = t.sunrise.getTime(), M = t.maghrib.getTime();
    const allFills = [K.hm(date, 7, 35)].concat(fills).sort((a, b) => a - b);
    const sleepTill = Math.max(t.fajr.getTime() + 20*MIN, K.hm(date, 6, 30)), bedAt = K.hm(date, 22, 30);
    let tNow = D0, pos = S.bed.slice(), level = 0, fi = 0, need = { hunger: 40, fun: 60, rest: 80 }, lastAct = '';
    segs.push({ t0: D0, t1: sleepTill, pose: 'curl', at: S.bed, face: 30, act: 'sleep' }); tNow = sleepTill;
    const walk = (to, speed = 55) => { if (len3(sub(to, pos)) < 3) return; const path = K.route(pos, to, ctx), L = K.pathLen(path), d = L/speed*1000 + 300;
      segs.push({ t0: tNow, t1: tNow + d, walk: true, path, len: L }); tNow += d; pos = to; };
    const day = { segs, level: [] };
    let g = 0;
    while (tNow < bedAt && g++ < 3000){
      while (fi < allFills.length && allFills[fi] <= tNow){ level = 1; day.level.push([allFills[fi], 1]); fi++; }
      const hr = (tNow - D0)/3600000, daylight = tNow > SR + 30*MIN && tNow < M - 15*MIN;
      const sun = S.sun[hr < 11 ? 0 : hr < 15 ? (daylight ? 1 : 2) : hr < (M - D0)/3600000 ? 2 : 3];
      const td = safeState(new Date(tNow), ctx);
      const opts = [
        ['nap', 8 + (100 - need.rest)*.8 + (hr > 11 && hr < 16 ? 16 : 0), sun, 'nap', [80, 200]],
        ['eat', level > 0 ? (100 - need.hunger)*1.2 : -99, S.bowl, 'eat', [25, 45]],
        ['groom', 22, null, 'groom', [30, 70]],
        ['yarn', (100 - need.fun)*.7, S.yarn, 'pounce', [30, 70]],
        ['sill', 24, hr < 13 ? S.sill : S.sillNursery, 'sill', [40, 120]],
        ['follow', td ? 30 + (100 - need.fun)*.3 : -99, td, 'sit', [25, 60]],
        ['wander', 14, sun, 'walkabout', [20, 40]],
      ];
      for (const o of opts){ o[1] += R()*22; if (o[0] === lastAct) o[1] -= 30; }
      opts.sort((a, b) => b[1] - a[1]);
      const [act, , to0, pose, dr] = opts[0], dur = (dr[0] + R()*(dr[1] - dr[0]))*1000;
      let to = to0 ? to0.slice() : pos.slice();
      if (act === 'follow') to = add(td, [14, -14, 0]);
      if (act === 'wander') to = add(sun, [(R() - .5)*40, (R() - .5)*40, 0]);
      if (act !== 'groom') walk(to);
      const t1 = Math.min(bedAt, tNow + dur);
      segs.push({ t0: tNow, t1, pose: pose === 'walkabout' ? 'sit' : pose, at: pos.slice(), face: act === 'sill' ? S.sillFace : act === 'eat' ? S.bowlFace : Math.floor(R()*8)*45, act });
      const mins = (t1 - tNow)/60000;
      need.rest = Math.min(100, need.rest - mins*.3 + (act === 'nap' ? mins*2.5 : 0)); need.fun = Math.min(100, need.fun - mins*.6 + (act === 'yarn' || act === 'follow' ? mins*6 : 0));
      need.hunger = Math.min(100, need.hunger - mins*.25 + (act === 'eat' ? 60 : 0));
      if (act === 'eat'){ level = Math.max(0, level - .5); day.level.push([t1, level]); }
      tNow = t1; lastAct = act;
    }
    walk(S.bed); segs.push({ t0: tNow, t1: D0 + 24*3600000, pose: 'curl', at: S.bed, face: 30, act: 'sleep' });
    CAT_DAY.set(key, day); if (CAT_DAY.size > 4) CAT_DAY.delete(CAT_DAY.keys().next().value);
    return day;
  }
  function safeState(d, ctx){ try { const s = F.state(d, ctx).toddler; return s && s.visible !== false && s.pose !== 'sleep' && s.pose !== 'held' && !s.moving ? s.at.slice() : null; } catch (e) { return null; } }
  function segOf(segs, now){ let lo = 0, hi = segs.length - 1, k = 0; while (lo <= hi){ const m = (lo + hi) >> 1; if (segs[m].t0 <= now){ k = m; lo = m + 1; } else hi = m - 1; } return segs[k]; }
  let purrUntil = 0;
  function catState(date, ctx){
    const day = catDay(date, ctx), now = date.getTime(), s = segOf(day.segs, now);
    let st;
    if (s.walk && now < s.t1){ const u = (now - s.t0)/(s.t1 - s.t0), a = K.along(s.path, s.len*u);
      st = { at: a.p, pose: 'walk', frame: Math.floor(s.len*u/9) % 4, facing: Math.atan2(a.dir[1], a.dir[0])/D2R, activity: 'walk', moving: true }; }
    else if (s.walk){ const e = s.path[s.path.length - 1]; st = { at: e.slice(), pose: 'sit', frame: 0, facing: 0, activity: 'idle' }; }
    else st = { at: s.at.slice(), pose: s.pose, frame: 0, facing: s.face || 0, activity: s.act };
    if (performance.now() < purrUntil && !st.moving){ st.pose = st.pose === 'curl' || st.pose === 'nap' ? st.pose : 'purr'; st.purr = true; }
    st.room = K.roomAt(st.at, ctx); st.fl = K.floorOf(st.at);
    return st;
  }
  function bowl(date, ctx){ const day = catDay(date, ctx), now = date.getTime(); let l = 0; for (const [t, v] of day.level) if (t <= now) l = v; return { level: l, full: l > .9, empty: l <= 0 }; }
  function feeder(date, ctx){
    const D0 = K.midnight(date), fills = fillsOf(ctx, 'feederFills', D0), now = date.getTime();
    let last = null; for (const f of fills) if (f <= now) last = f;
    const l = last == null ? .15 : Math.max(0, 1 - (now - last)/(6*3600000));         // a little left from yesterday
    return { level: l, full: l > .6, empty: l < .2 };
  }

  /* =================================== the neighbour's dog =================================== */
  // he lives at number 2, behind the corner shop; twice a day the neighbour walks him along the pavement to the park,
  // where they play fetch. He never comes into the house.
  let SG = null, SGL = undefined;
  function streetG(){ const L = H().LOT || null; if (SGL === L && SG) return SG; SGL = L; try { SG = window.HStreet && HStreet.layout ? HStreet.layout(L) : null; } catch (e) { SG = null; } return SG; }
  function dogPlan(date, ctx){
    const G = streetG(); if (!G) return null;
    const t = K.timesOf(date, ctx), M = t.maghrib.getTime(), n2 = G.n2, home = [n2.x1 + 22, n2.y1 - 70, 0];
    const lane = (G.lane[0] + G.lane[1])/2, pave = (G.PA[0] + G.PA[1])/2, park = G.park, cross = park.y0 + 40, fetch = [park.x0 + 120, park.y0 + 140, 0];
    const route = [home, [n2.x1 + 22, lane, 0], [pave, lane, 0], [pave, cross, 0], [park.x0 + 30, cross, 0], fetch];
    const L = K.pathLen(route), walkMs = L/34*1000;
    const am = Math.max(K.hm(date, 7, 40), t.sunrise.getTime()), pm = Math.max(K.hm(date, 16, 0), Math.min(K.hm(date, 19, 0), M - 75*MIN));
    return { G, home, route, L, walkMs, walks: [am, pm].map(t0 => ({ t0, there: t0 + walkMs, back: t0 + walkMs + 8*MIN, end: t0 + 2*walkMs + 8*MIN })), fetch };
  }
  function dogState(date, ctx){
    const pl = dogPlan(date, ctx); if (!pl) return null;
    const now = date.getTime(), w = pl.walks.find(x => now >= x.t0 && now < x.end), R = rngOf(hashS('hh.dog.' + Math.floor(now/60000)));
    if (!w){ // at home in the front garden: lying, sitting, a little sniffing about
      const slot = Math.floor(now/45000), r = rngOf(hashS('hh.dog.' + slot))(), pose = r < .45 ? 'lie' : r < .75 ? 'sit' : 'sniff';
      return { dog: { at: add(pl.home, [pose === 'sniff' ? Math.sin(slot)*10 : 0, pose === 'sniff' ? Math.cos(slot)*12 : 0, 0]), pose, facing: (slot*67) % 360, frame: 0, activity: 'home' }, neighbour: null };
    }
    const sp = 34, f = (u, rev) => { const a = K.along(rev ? pl.route.slice().reverse() : pl.route, pl.L*u); return a; };
    if (now < w.there || now >= w.back){
      const rev = now >= w.back, u = rev ? (now - w.back)/(w.end - w.back) : (now - w.t0)/(w.there - w.t0), a = f(Math.min(1, u), rev), fa = Math.atan2(a.dir[1], a.dir[0]);
      const d = pl.L*u, side = [-Math.sin(fa)*16, Math.cos(fa)*16, 0], hand = add(add(a.p, side), [0, 0, 50]);
      return { dog: { at: a.p, pose: 'walk', facing: fa/D2R, frame: Math.floor(d/10) % 4, activity: 'walk', leash: hand, moving: true },
        neighbour: { at: add(a.p, side), pose: 'walk', facing: fa/D2R, frame: Math.floor(d/14) % 6, moving: true } };
    }
    // fetch in the park: the neighbour throws, the dog runs out and back with the ball
    const ms = now - w.there, cyc = 9000, u = (ms % cyc)/cyc, out = [pl.fetch[0] + 70, pl.fetch[1] + 40, 0], st0 = add(pl.fetch, [10, 0, 0]);
    const p = u < .15 ? st0 : u < .5 ? lerp3(st0, out, (u - .15)/.35) : u < .6 ? out : u < .95 ? lerp3(out, st0, (u - .6)/.35) : st0;
    const fa = u < .5 ? Math.atan2(out[1] - st0[1], out[0] - st0[0]) : Math.atan2(st0[1] - out[1], st0[0] - out[0]);
    return { dog: { at: p, pose: u < .15 || (u >= .5 && u < .6) || u >= .95 ? (u < .15 ? 'sit' : 'sniff') : 'run', facing: fa/D2R, frame: Math.floor(ms/120) % 4, activity: 'fetch', ball: u >= .55 && u < .97 },
      neighbour: { at: add(pl.fetch, [-6, -14, 0]), pose: u < .12 ? 'throw' : u < .9 ? 'stand' : 'wave', facing: Math.atan2(out[1] - pl.fetch[1], out[0] - pl.fetch[0])/D2R, frame: u < .12 ? Math.floor(u/.12*4) : Math.floor(ms/170) % 4, moving: false } };
  }

  /* =================================== birds =================================== */
  const BIRDC = ['#6d8fc7', '#e8a24a', '#7cae6a', '#c97a7a'];
  function birdState(date, ctx, cat){
    const A = H().A || {}, fd = A.feeder, out = [], now = date.getTime(), t = K.timesOf(date, ctx), day = now > t.sunrise.getTime() + 10*MIN && now < t.maghrib.getTime() - 10*MIN;
    if (fd && day){
      const lv = feeder(date, ctx).level, n = lv > .6 ? 3 : lv > .2 ? 2 : 1, catNear = cat && cat.fl < 0 && Math.hypot(cat.at[0] - fd[0], cat.at[1] - fd[1]) < 80;
      for (let i = 0; i < n; i++){
        const per = 40000 + i*9000, ph = (now + i*13000) % per, stay = per*.7, perch = [fd[0] + [-8, 8, 0][i], fd[1] + [6, -6, -12][i], fd[2] - 6 + [0, 0, 9][i]];
        let at, pose = 'peck', fa = [135, 315, 135][i];          // side on to the camera: a bird reads best in profile
        if (catNear) continue;                                     // they scatter when the cat comes near
        if (ph < 1500){ const u = ph/1500; at = add(perch, [(1 - u)*-40, (1 - u)*30, (1 - u)*35]); pose = 'fly'; }
        else if (ph < stay) at = perch;
        else if (ph < stay + 1500){ const u = (ph - stay)/1500; at = add(perch, [u*40, u*-30, u*40]); pose = 'fly'; }
        else continue;
        out.push({ id: 'bird' + i, at, pose, facing: fa, col: BIRDC[i], frame: pose === 'fly' ? Math.floor(now/90) % 2 : Math.floor((now + i*700)/900) % 2 });
      }
    }
    // pigeons on the mosque roof (they bob; one flaps now and then)
    const G = streetG(); if (G && day){ const m = G.mosque;
      for (let i = 0; i < 4; i++){ const flap = (now + i*17000) % 47000 < 1300;                        // a short flap now and then
        out.push({ id: 'pigeon' + i, at: [m.x0 + 10, m.y0 + 40 + i*38, 126], pose: flap ? 'flap' : 'peck', facing: i % 2 ? 135 : 315, col: '#9aa3ad', frame: flap ? Math.floor(now/160) % 2 : Math.floor((now + i*1300)/2600) % 2 }); } }
    return out;
  }

  /* =================================== public =================================== */
  function state(date, ctx){
    ctx = ctx || {};
    const cat = catState(date, ctx), d = dogState(date, ctx);
    return { cat, dog: d && d.dog, neighbour: d && d.neighbour, birds: birdState(date, ctx, cat), bowl: bowl(date, ctx), feeder: feeder(date, ctx) };
  }
  const ANIM = { nap: 2400, curl: 2400, groom: 480, purr: 200, pounce: 300, eat: 520, sill: 4000, sit: 4000 };
  function actors(now, ctx, rt){
    const s = state(now, ctx), out = [];
    const q = v => Math.round(v/45)*45;            // 8 directions: few drawings per animal
    if (s.cat){ const c = s.cat, fr = c.moving ? c.frame : Math.floor(rt/(ANIM[c.pose] || 2000)) % 4;
      out.push({ id: 'cat', at: c.at, fl: c.fl, fast: !!c.moving, key: ['cat', c.pose, fr, q(c.facing)].join('|'), draw: () => { const it = draw('cat', c.pose, [0, 0, 0], q(c.facing), fr)[0]; return pad([it], 8) + it.svg; } }); }
    // the cat's bowl (with food when filled) and its bed: tiny props that change only when the level does
    { const S = spots(), lv = s.bowl.level, b = S.bowl;
      out.push({ id: 'catbowl', at: b, fl: K.floorOf(b), key: 'bowl|' + (lv > .6 ? 2 : lv > 0 ? 1 : 0), draw: () => bowlSvg(lv) });
      out.push({ id: 'catbed', at: S.bed, fl: K.floorOf(S.bed), bias: -6, key: 'catbed', draw: () => cushion() }); }
    if (s.dog){ const d = s.dog, fr = d.moving || d.pose === 'run' ? d.frame : Math.floor(rt/(d.pose === 'lie' ? 1500 : 500)) % 4;
      const op = {}; if (d.leash) op.leash = sub(d.leash, d.at).map(v => Math.round(v)); if (d.ball) op.ball = 1;
      out.push({ id: 'dog', at: d.at, fl: -1, fast: !!d.moving || d.pose === 'run', key: ['dog', d.pose, fr, q(d.facing), JSON.stringify(op)].join('|'), draw: () => { const it = draw('dog', d.pose, [0, 0, 0], q(d.facing), fr, op)[0]; return pad([it], 8) + it.svg; } }); }
    if (s.neighbour){ const n = s.neighbour, fr = n.frame || 0;
      out.push({ id: 'neighbour', at: n.at, fl: -1, fast: !!n.moving, key: ['nb', n.pose, fr, q(n.facing)].join('|'), draw: () => { const it = F.draw('neighbour', n.pose, [0, 0, 0], q(n.facing), fr)[0]; return pad([it]) + it.svg; } }); }
    for (const b of s.birds) out.push({ id: b.id, at: b.at, fl: -1, bias: 4, fast: b.pose === 'fly' || b.pose === 'flap', key: [b.pose, b.frame, b.facing, b.col].join('|'), draw: () => draw('bird', b.pose, [0, 0, 0], b.facing, b.frame, { col: b.col })[0].svg });
    return out;
  }
  // request icons (ink, 24 grid). Nothing in them may read as a face: silhouettes only, no dots or marks inside shapes.
  const ICONS = {
    catbowl: '<path d="M4.5 19.5c-1-4 .5-8 2.5-9.5L6 5.5l2.6 2.4h2.8L14 5.5l-1 4.5c2 1.5 3.5 5.5 2.5 9.5z" fill="#e39a4a"/><path d="M15 16.5h7l-1 3h-5z" fill="#5b8fd6"/>',
    feeder: '<path d="M3 17h12l-1.5 3h-9z" fill="#c9a06a"/><path d="M9 3v14"/><path d="M14 13.5c0-2.5 2-4 4-4 1.2 0 2 .6 2.5 1.5l1.5.3-1.4 1c0 2.2-2 3.7-4.5 3.7H16l-3 1.5z" fill="#6d8fc7"/>',
  };
  const icon = n => '<svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[n] || '') + '</svg>';
  function requests(date, ctx){
    const out = [], s = state(date, ctx), t = K.timesOf(date, ctx), now = date.getTime(), day = now > t.sunrise.getTime() + 30*MIN && now < t.maghrib.getTime() - 30*MIN;
    if (s.bowl.empty && s.cat && s.cat.activity !== 'sleep') out.push({ id: 'catbowl', who: 'cat', icon: 'catbowl', iconSvg: icon('catbowl'), job: 'fill-cat-bowl', bubbleAt: add(spots().bowl, [0, 0, 30]) });
    const fd = (H().A || {}).feeder;
    if (s.feeder.empty && day && fd) out.push({ id: 'feeder', who: 'birds', icon: 'feeder', iconSvg: icon('feeder'), job: 'fill-feeder', bubbleAt: add(fd, [0, 0, 26]) });
    return out;
  }
  // a purr: a soft low rumble that swells and fades (natural, no pitch melody)
  function sounds(){
    if (!window.Kit || !Kit.sfx || Kit.sfx.has('pet_purr')) return;
    Kit.sfx.define({
      pet_purr: (L, t) => { for (let i = 0; i < 9; i++) L.burst(t + i*.26, { dur: .24, freq: 180 + (i % 2)*30, q: .8, vol: .07 + .03*Math.sin(i/8*Math.PI), brown: true, attack: .08 }); },
      pet_chirp: (L, t) => { L.glide(t, { from: 3200, to: 4200, dur: .05, vol: .05 }); L.glide(t + .09, { from: 3400, to: 4400, dur: .05, vol: .04 }); },
      pet_flutter: (L, t) => { for (let i = 0; i < 6; i++) L.burst(t + i*.05, { dur: .04, freq: 900 + i*80, q: .7, vol: .05 }); },
    });
  }
  sounds(); addEventListener('load', sounds);
  function tap(id){ if (id === 'cat'){ purrUntil = performance.now() + 4500; try { window.Kit && Kit.sfx && Kit.sfx.play('pet_purr'); } catch (e) {} return true; }
    if (/^bird|^pigeon/.test(id)){ try { window.Kit && Kit.sfx && Kit.sfx.play('pet_chirp'); } catch (e) {} return true; } return false; }

  /* ---------- flocks over the house and the street: HTML elements on compositor animations ---------- */
  function sky(o){
    const el = o.el, now = o.now || (() => new Date()); let timer = 0, n = 0, on = true;
    const css = document.createElement('style');
    css.textContent = '.pet-flock{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none}.pet-flock i{position:absolute;left:0;top:0;width:16px;height:10px;margin:-5px 0 0 -8px;will-change:transform}' +
      '.pet-flock b{display:block;width:16px;height:10px;will-change:transform;background:no-repeat center/contain url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 10\'><path d=\'M1 2c3 1 5 3 7 6 2-3 4-5 7-6\' fill=\'none\' stroke=\'%23231e16\' stroke-width=\'1.8\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/></svg>")}';
    el.appendChild(css);
    function spawn(){
      const d = now(), t = K.timesOf(d, o.ctx ? o.ctx() : {}), day = d > t.sunrise && d < t.maghrib;
      if (!day || (window.Kit && Kit.reducedMotion)) return;
      const R = rngOf(hashS('hh.flock.' + Math.floor(d.getTime()/30000) + '.' + n++)), L = H().LOT || [[-30, -20], [200, 612]];
      const y0 = L[0][1] - 500, y1 = L[1][1] + 600, x = 80 + R()*300, z = 640 + R()*200, bend = (R() - .5)*240, rev = R() < .5;
      const pts = []; for (let i = 0; i <= 8; i++){ const u = i/8; pts.push([x + bend*Math.sin(u*Math.PI), rev ? y1 + (y0 - y1)*u : y0 + (y1 - y0)*u, z + 40*Math.sin(u*Math.PI*2)]); }
      const scr = pts.map(p => o.toPx(p)), dur = 11000 + R()*5000, g = document.createElement('div'); g.className = 'pet-flock'; el.appendChild(g);
      const nb = 4 + Math.floor(R()*3);
      for (let i = 0; i < nb; i++){
        const b = document.createElement('i'), w = document.createElement('b'), ox = (i % 3)*14 - 14 + R()*6, oy = Math.floor(i/3)*10 + R()*6;
        b.appendChild(w); g.appendChild(b);
        b.animate(scr.map(([sx, sy], j) => ({ transform: `translate(${(sx + ox + Math.sin(j + i)*4).toFixed(1)}px,${(sy + oy).toFixed(1)}px)` })), { duration: dur, delay: i*90, easing: 'linear', fill: 'both' });
        w.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(-.6)' }], { duration: 260 + R()*80, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
      }
      setTimeout(() => g.remove(), dur + 1200);
    }
    function loop(){ timer = 0; if (!on) return; if (!document.hidden) spawn(); timer = setTimeout(loop, 45000 + Math.random()*30000); }
    timer = setTimeout(loop, 2500);
    return { stop(){ on = false; clearTimeout(timer); el.querySelectorAll('.pet-flock').forEach(x => x.remove()); }, spawn };
  }

  Object.assign(PETS, { state, draw, actors, bowl, feeder, requests, tap, sky, icon, ICONS,
    setSpots(s){ SPOTS = Object.assign({}, spots(), s || {}); CAT_DAY.clear(); }, _catDay: catDay });
})();
