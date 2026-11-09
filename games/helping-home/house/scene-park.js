/* Helping Home: the park with the sister and the toddler (HHScene.park). Three things, in any order:
   - the swing: tap it to push the toddler (three pushes)
   - the slide: tap it and the sister slides down
   - the ducks: tap the bread bag for a crumb, drop it in the pond, and a duck swims over to eat it (four crumbs)
   Ducks are shapes only: a body, a neck, a round head, a beak; no eyes. Ends with a wave, a hug and a heart.
   HHScene.park.start(el, { date }) -> Promise<{ done, job: 'walk-to-park' }> */
(function () {
  'use strict';
  const SK = window.HSK, mo = matOf;
  const POND = { x: 118, y: 150, rx: 40, ry: 34 }, SW = { x: 46, y0: 28, y1: 88, top: 86 }, SL = { x0: 40, x1: 112, y: 128 }, BAG = [36, 196, 22];
  function ground(){
    const g = mo('#a9d47b');
    let s = H3.bx(-8, -8, -10, 184, 230, 0, mo('#a8744b'), 1, 1.4) + fill(pd(on(PZ(.1), rectUV(-8, -8, 184, 230))), g.l);
    let tf = ''; for (let i = 0; i < 60; i++){ const x = (i*53) % 180, y = (i*37) % 226; if (Math.hypot((x - POND.x)/POND.rx, (y - POND.y)/POND.ry) < 1.2) continue; tf += pd([[x, y, 0], [x - 1, y - 1, 4]], false) + pd([[x, y, 0], [x + 1.5, y + 1, 5]], false); }
    s += `<path d="${tf}" fill="none" stroke="#5f9a46" stroke-width="1" stroke-linecap="round"/>`;
    s += fill(pd(on(PZ(.2), [[0, 100], [180, 104], [180, 116], [0, 112]])), '#e8dcc0');
    // the pond, with reeds
    s += shape(on(PZ(.3), ellUV(POND.x, POND.y, POND.rx + 4, POND.ry + 4, 28)), '#c9bfa6', 1.1) + fill(pd(on(PZ(.4), ellUV(POND.x, POND.y, POND.rx, POND.ry, 28))), '#94cbe2');
    s += fill(pd(on(PZ(.5), ellUV(POND.x - 10, POND.y - 8, 14, 4, 12))), '#c9e8f3');
    let rd = ''; for (const [a, h] of [[2.2, 18], [2.5, 22], [2.8, 16]]){ const x = POND.x + (POND.rx + 3)*Math.cos(a), y = POND.y + (POND.ry + 3)*Math.sin(a); rd += pd([[x, y, 0], [x + 1, y + 1, h]], false); }
    s += `<path d="${rd}" fill="none" stroke="#5f9a46" stroke-width="2.2" stroke-linecap="round"/>`;
    // a tree and the bench with the bread bag
    s += rod([10, 20, 0], [10, 20, 70], 5, mo('#9a6a44'), toneI, 1.2);
    for (const [dx, dy, z, r] of [[0, 0, 84, 22], [-12, 10, 76, 16], [12, -8, 78, 16]]) s += H3.ball([10 + dx, 20 + dy, z], r, '#5cae6a');
    s += H3.bx(22, 178, 16, 46, 214, 19, WOOD, .9) + H3.bx(22, 178, 19, 25, 214, 36, WOOD, .9) + H3.bx(24, 180, 0, 28, 184, 16, mo('#5c544a'), .6) + H3.bx(24, 208, 0, 28, 212, 16, mo('#5c544a'), .6) + H3.bx(40, 180, 0, 44, 184, 16, mo('#5c544a'), .6) + H3.bx(40, 208, 0, 44, 212, 16, mo('#5c544a'), .6);
    s += H3.bx(BAG[0] - 5, BAG[1] - 6, 19, BAG[0] + 5, BAG[1] + 6, 32, mo('#e8dcc4'), .9) + H3.ball([BAG[0], BAG[1] - 2, 33], 3, '#e2b14a');
    return s;
  }
  function swingFrame(){
    let s = '';
    for (const y of [SW.y0, SW.y1]) s += rod([SW.x - 18, y, 0], [SW.x, y, SW.top], 2.2, mo('#e8574a'), toneI, .9) + rod([SW.x + 18, y, 0], [SW.x, y, SW.top], 2.2, mo('#e8574a'), toneI, .9);
    return s + rod([SW.x, SW.y0, SW.top], [SW.x, SW.y1, SW.top], 2.4, mo('#e8574a'), toneI, 1);
  }
  function swingSeat(a){
    const ym = (SW.y0 + SW.y1)/2, sz = 24, dx = Math.sin(a)*(SW.top - sz), dz = (1 - Math.cos(a))*(SW.top - sz);
    return H3.line3([[SW.x, ym - 9, SW.top], [SW.x + dx, ym - 9, sz + dz]], INK, 1) + H3.line3([[SW.x, ym + 9, SW.top], [SW.x + dx, ym + 9, sz + dz]], INK, 1) +
      H3.bx(SW.x + dx - 5, ym - 10, sz + dz - 2, SW.x + dx + 5, ym + 10, sz + dz, mo('#f2c230'), .9) + SK.person('toddler', 'sit', [SW.x + dx - 2, ym, dz], 0, 0, { seat: sz - 2 });
  }
  function slide(){
    const { x0, x1, y } = SL, top = 54;
    let s = '';
    for (const yy of [y - 8, y + 8]) s += rod([x0, yy, 0], [x0, yy, top + 20], 1.6, mo('#5b8fd6'), toneI, .8);
    for (let z = 10; z <= top; z += 11) s += rod([x0, y - 8, z], [x0, y + 8, z], 1.2, mo('#5b8fd6'), toneI, .6);
    s += shape([[x0, y - 9, top], [x0, y + 9, top], [x1, y + 9, 4], [x1, y - 9, 4]], toneI([.6, 0, .8], mo('#f2c230')), 1.2);
    s += H3.bx(x0 - 8, y - 9, top - 2, x0, y + 9, top, mo('#f2c230'), .9);
    return s;
  }
  function duck(d){
    const [x, y] = d.p, a = d.a, c = Math.cos(a), s2 = Math.sin(a), at = (u, v, z) => [x + u*c - v*s2, y + u*s2 + v*c, z];
    const body = on(PZ(1.2), ellUV(0, 0, 7, 4.6, 14)).map(([u, v]) => at(u, v, 1.2));
    return shape(body, '#fbf6ea', .9) + rod(at(4, 0, 2), at(7, 0, 9), 1.6, mo('#fbf6ea'), toneI, .7) + H3.ball(at(7.5, 0, 10.5), 2.6, '#fbf6ea') + rod(at(9.6, 0, 10.4), at(12, 0, 10), .9, mo('#ef8a3c'), toneI, .5);
  }
  window.HHScene = window.HHScene || {};
  HHScene.park = {
    start(el, opts){
      opts = opts || {};
      return new Promise(resolve => {
        const st = SK.open(el, { bounds: [[10, 4, 0], [176, 214, 96]], pitch: 32, top: 90, bottom: 30 });
        let swingA = 0, pushes = 0, slid = false, slideT = -1, fed = 0, crumbs = [], busy = false;
        const ducks = [{ p: [POND.x - 14, POND.y + 10], a: .4 }, { p: [POND.x + 16, POND.y - 6], a: 2.6 }, { p: [POND.x + 4, POND.y + 20], a: 4 }];
        const doneN = () => (pushes >= 3 ? 1 : 0) + (slid ? 1 : 0) + (fed >= 4 ? 1 : 0);
        st.onClose = () => { st.destroy(); resolve({ done: false, job: 'walk-to-park' }); };
        function drawSt(){ st.draw('st', () => ground() + byDepth([{ box: [[SW.x - 20, SW.y0 - 2, 0], [SW.x + 20, SW.y1 + 2, SW.top + 2]], svg: swingFrame() }, { box: [[SL.x0 - 8, SL.y - 10, 0], [SL.x1, SL.y + 10, 74]], svg: slide() }])); }
        function drawDy(wave){
          st.draw('dy', () => {
            const parts = [{ box: [[SW.x - 20, SW.y0, 0], [SW.x + 20, SW.y1, 70]], svg: swingSeat(swingA) }];
            for (const d of ducks) parts.push({ box: [[d.p[0] - 8, d.p[1] - 8, 0], [d.p[0] + 8, d.p[1] + 8, 13]], svg: duck(d) });
            for (const c of crumbs) parts.push({ box: [[c.p[0] - 2, c.p[1] - 2, c.p[2]], [c.p[0] + 2, c.p[1] + 2, c.p[2] + 3]], svg: H3.ball([c.p[0], c.p[1], c.p[2] + 1.5], 1.8, '#e2b14a') });
            // the sister: at the top of the slide, sliding, or waving at the end
            let sp = [SL.x0 - 4, SL.y, 54], pose = 'stand', fr = 0;
            if (slideT >= 0){ const u = Math.min(1, slideT); sp = [SL.x0 + (SL.x1 - SL.x0)*u, SL.y, 54 - 50*u]; pose = 'sit'; }
            else if (slid){ sp = [SL.x1 + 12, SL.y + 20, 0]; }
            if (wave){ sp = [SL.x1 + 12, SL.y + 20, 0]; pose = wave.pose; fr = wave.frame; }
            parts.push({ box: [[sp[0] - 8, sp[1] - 8, sp[2]], [sp[0] + 8, sp[1] + 8, sp[2] + 80]], svg: SK.person('sister', pose, sp, slideT >= 0 ? 0 : 200, fr, pose === 'sit' ? { seat: 2 } : null) });
            return byDepth(parts);
          });
        }
        const all = () => { drawSt(); drawDy(); st.dots(3, doneN()); };
        all(); st.onResize = all;
        const check = () => { st.dots(3, doneN()); if (doneN() === 3 && !busy){ busy = true; setTimeout(() => SK.end(st, 'sister', [SL.x1 + 12, SL.y + 20, 0], 200, w => drawDy(w), resolve, 'walk-to-park'), 500); } };
        function push(){ st.sfx('h_wood'); const t0 = performance.now(); pushes++;
          (function step(){ const t = (performance.now() - t0)/1000; swingA = Math.sin(t*3.2)*Math.exp(-t*.5)*.7; drawDy(); if (t < 3.2) requestAnimationFrame(step); else { swingA = 0; drawDy(); } })();
          if (pushes === 3){ st.heart([SW.x, (SW.y0 + SW.y1)/2, 50]); check(); } }
        function slideDown(){ if (slideT >= 0 || slid) return; slideT = 0; st.sfx('h_lift'); const t0 = performance.now();
          (function step(){ slideT = (performance.now() - t0)/1100; drawDy(); if (slideT < 1) return requestAnimationFrame(step); slideT = -1; slid = true; st.sfx('h_bounce'); drawDy(); st.heart([SL.x1, SL.y + 10, 20]); check(); })(); }
        const dragger = SK.drag(st, { busy: () => busy, list: () => crumbs, redraw: () => drawDy(), plane: 0, lift: 8,
          onTap(e){ const b = st.svg.getBoundingClientRect(), hitP = (p3, r) => { const [x, y] = st.toPx(p3); return Math.hypot(e.clientX - b.left - x, e.clientY - b.top - y) < r; };
            if (hitP([SW.x, (SW.y0 + SW.y1)/2, 40], 70)) push();
            else if (hitP([(SL.x0 + SL.x1)/2, SL.y, 30], 64) || hitP([SL.x0, SL.y, 70], 44)) slideDown();
            else if (hitP([BAG[0], BAG[1], 28], 46) && fed < 4 && !crumbs.length){ crumbs.push({ p: [BAG[0] + 12, BAG[1] - 10, 20], hit: 40 }); st.sfx('h_cloth'); drawDy(); } },
          onDrop(c, e){ const p = st.floor(e.clientX, e.clientY - 40, 0);
            if (Math.hypot((p[0] - POND.x)/POND.rx, (p[1] - POND.y)/POND.ry) < 1.15){ c.p = [p[0], p[1], 1]; st.sfx('h_water');
              const d = ducks.reduce((a, b) => Math.hypot(b.p[0] - p[0], b.p[1] - p[1]) < Math.hypot(a.p[0] - p[0], a.p[1] - p[1]) ? b : a), from = d.p.slice();
              d.a = Math.atan2(p[1] - from[1], p[0] - from[0]);
              SK.anim(900, k => { d.p = [from[0] + (p[0] - 6*Math.cos(d.a) - from[0])*k, from[1] + (p[1] - 6*Math.sin(d.a) - from[1])*k]; drawDy(); }, () => {
                crumbs = crumbs.filter(x => x !== c); fed++; st.sfx('h_soft'); drawDy(); if (fed === 4){ st.heart([POND.x, POND.y, 10]); check(); } });
              return true; }
            return false; } });
      });
    },
  };
})();
