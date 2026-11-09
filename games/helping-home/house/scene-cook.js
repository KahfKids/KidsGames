/* Helping Home: cooking with Ummi after a harvest (HHScene.cook). Ummi minds the hob; the child does the safe jobs.
   1. Wash: drag each vegetable under the tap.            2. Chop: tap-tap with the child's safe knife (rounded tip).
   3. Stir: slide the pieces into the pot, then stir round with the long spoon.
   4. Set the table: four plates. Then the family sits down together, and one plate is covered to share with a neighbour.
   HHScene.cook.start(el, { date, meal: { seed, name, meal } }) -> Promise<{ done, job: 'cook-with-ummi' }> */
(function () {
  'use strict';
  const SK = window.HSK, mo = matOf;
  const SINK = [20, 40], BOARD = [26, 96], POT = [24, 152], TABLE = { x0: 96, x1: 150, y0: 60, y1: 170, z: 34 };
  const MATS = [[106, 82], [140, 82], [106, 148], [140, 148]];
  function kitchen(){
    let s = SK.room({ W: 160, D: 200, H: 110, wall: '#fff0bf', floor: '#efc3a0' });
    s += H3.bx(0, 6, 0, 46, 196, 66, mo('#fbf4e4'), 1, 1.6) + H3.bx(-1, 4, 66, 48, 198, 70, mo('#efcb98'), 1, 1.8);
    s += shape(on(PZ(70.1), rrUV(6, SINK[1] - 18, 36, SINK[1] + 18, 4, 3)), '#9aa3a6', 1) + fill(pd(on(PZ(70.2), rrUV(9, SINK[1] - 15, 33, SINK[1] + 15, 3, 3))), '#6d7679');
    s += rod([4, SINK[1], 70], [4, SINK[1], 92], 1.6, METAL, toneI, .8) + rod([4, SINK[1], 92], [16, SINK[1], 92], 1.4, METAL, toneI, .8);
    s += H3.bx(12, BOARD[1] - 22, 70, 40, BOARD[1] + 22, 73, mo('#e2b277'), .9);
    s += H3.bx(4, POT[1] - 22, 70, 42, POT[1] + 22, 71.5, mo('#3d3935'), .8) + shape(on(PZ(71.6), ellUV(POT[0], POT[1], 12, 12, 16)), '#5c544a', .7);
    s += H3.bx(TABLE.x0, TABLE.y0, TABLE.z, TABLE.x1, TABLE.y1, TABLE.z + 4, WOOD, 1, 1.6);
    for (const [x, y] of [[TABLE.x0 + 3, TABLE.y0 + 3], [TABLE.x1 - 3, TABLE.y0 + 3], [TABLE.x0 + 3, TABLE.y1 - 3], [TABLE.x1 - 3, TABLE.y1 - 3]]) s += H3.bx(x - 2, y - 2, 0, x + 2, y + 2, TABLE.z, mo('#b5784a'), .6);
    for (const [x, y] of MATS) s += shape(on(PZ(TABLE.z + 4.2), rrUV(x - 11, y - 11, x + 11, y + 11, 3, 3)), '#f3a6bb', .6);
    return s;
  }
  function veg(k, p, dirty, slices){
    const kk = ['carrot', 'apple'].includes(k) ? k : k === 'tomato' || k === 'strawberry' ? 'apple' : 'carrot';
    if (slices){ let s = ''; for (let i = 0; i < slices; i++) s += H3.disc(p[2] + .6, p[0] - 6 + (i % 4)*4, p[1] - 4 + Math.floor(i/4)*6, 2.6, kk === 'carrot' ? '#ef8a3c' : '#e8574a', .6); return s; }
    let s = SK.item(kk, p, { s: 1.4 });
    if (dirty) for (let i = 0; i < 3; i++) s += H3.disc(p[2] + 3 + i, p[0] - 3 + i*3, p[1] + (i % 2)*2, 1.4, '#7a5a3a', 0);
    return s;
  }
  window.HHScene = window.HHScene || {};
  HHScene.cook = {
    start(el, opts){
      opts = opts || {};
      return new Promise(resolve => {
        const meal = opts.meal || { seed: 'carrot' }, kind = meal.seed || 'carrot';
        const st = SK.open(el, { bounds: [[0, 0, 0], [152, 196, 100]], pitch: 30, top: 92, bottom: 30 });
        let phase = 'wash', busy = false, chops = 0, stir = 0, lastA = null, potIn = 0, ummi = { pose: 'cook', frame: 0 };
        const vegs = [0, 1, 2].map(i => ({ p: [56, 70 + i*14, 70], dirty: true, hit: 34 }));
        const plates = [0, 1, 2, 3].map(i => ({ p: [36, 182, 70 + 2 + i*1.6], hit: 38, k: 'plate' }));
        const UM = [64, 150, 0];
        st.onClose = () => { st.destroy(); resolve({ done: false, job: 'cook-with-ummi' }); };
        const stepN = { wash: 0, chop: 1, stir: 2, table: 3, eat: 4 };
        function draw(w){
          st.draw('st', () => kitchen());
          st.draw('dy', () => {
            const parts = [];
            vegs.forEach((v, i) => { if (v.inPot) return; const p = v.board ? [BOARD[0] + 4, BOARD[1] - 13 + i*13, 73] : v.p; parts.push({ box: [[p[0] - 8, p[1] - 8, p[2]], [p[0] + 8, p[1] + 8, p[2] + 10]], svg: veg(kind, p, v.dirty, v.board ? Math.min(4, v.sl || 0) || 0 : 0) || veg(kind, p, v.dirty) }); });
            // the pot (lathe) with what is in it
            parts.push({ box: [[POT[0] - 12, POT[1] - 12, 71.5], [POT[0] + 12, POT[1] + 12, 88]], svg: H3.lathe(POT[0], POT[1], [[71.5, 10], [86, 11.5]], mo('#c9d0d6'), { inner: potIn ? (kind === 'carrot' ? '#ef8a3c' : '#e8574a') : '#5c544a', n: 18 }) +
              (phase === 'stir' && potIn >= 3 ? rod([POT[0] + 2 + 5*Math.cos(stir), POT[1] + 5*Math.sin(stir), 84], [POT[0] + 18, POT[1] + 6, 104], 1.1, mo('#c99555'), toneI, .7) : '') });
            if (phase === 'chop') parts.push({ box: [[BOARD[0] - 4, BOARD[1] + 10, 73], [BOARD[0] + 14, BOARD[1] + 22, 78]], svg: rod([BOARD[0], BOARD[1] + 18, 74], [BOARD[0] + 10, BOARD[1] + 18, 74], 1.4, mo('#5cae6a'), toneI, .7) + rod([BOARD[0] + 10, BOARD[1] + 18, 74], [BOARD[0] + 22, BOARD[1] + 16, 74], .9, METAL, toneI, .6) });
            plates.forEach(pl => parts.push({ box: [[pl.p[0] - 9, pl.p[1] - 9, pl.p[2]], [pl.p[0] + 9, pl.p[1] + 9, pl.p[2] + 2]], svg: SK.item(pl.on && phase === 'eat' && pl.share ? 'covered' : 'plate', pl.p, { s: 1.15 }) }));
            if (phase === 'eat'){ const T = TABLE.z; parts.push({ box: [[TABLE.x0 - 14, 50, 0], [TABLE.x0 - 2, 70, 90]], svg: SK.person('abu', 'sit', [TABLE.x0 - 6, 82, 0], 0, 0, { seat: T }) },
              { box: [[TABLE.x0 - 14, 140, 0], [TABLE.x0 - 2, 160, 90]], svg: SK.person('sister', 'sit', [TABLE.x0 - 6, 148, 0], 0, 0, { seat: T - 4 }) },
              { box: [[TABLE.x1 + 2, 140, 0], [TABLE.x1 + 14, 160, 70]], svg: SK.person('toddler', 'sit', [TABLE.x1 + 8, 148, 0], 180, 0, { seat: T + 4 }) }); }
            parts.push({ box: [[UM[0] - 10, UM[1] - 10, 0], [UM[0] + 10, UM[1] + 10, 110]], svg: SK.person('ummi', w ? w.pose : ummi.pose, phase === 'eat' ? [TABLE.x1 + 8, 82, 0] : UM, phase === 'eat' ? 180 : 180, w ? w.frame : ummi.frame, phase === 'eat' ? { seat: TABLE.z } : null) });
            return byDepth(parts);
          });
          SK.rings(st);
          if (!busy){ if (phase === 'wash') SK.ring(st, [SINK[0], SINK[1], 72], 40); if (phase === 'chop') SK.ring(st, [BOARD[0], BOARD[1], 74], 44);
            if (phase === 'stir') SK.ring(st, [POT[0], POT[1], 84], 40); if (phase === 'table'){ const k = plates.filter(p => p.on).length; if (k < 4) SK.ring(st, [MATS[k][0], MATS[k][1], TABLE.z + 4], 32); } }
          st.dots(4, Math.min(4, stepN[phase]));
        }
        draw(); st.onResize = () => draw();
        const water = p => { st.sfx('h_water'); for (let i = 0; i < 5; i++){ const [x, y] = st.toPx([p[0], p[1], 88 - i*4]), d = document.createElement('div');
          d.style.cssText = `position:absolute;left:${x - 2}px;top:${y}px;width:4px;height:10px;border-radius:2px;background:#5b9fe0;transition:transform .6s ease-in,opacity .6s;pointer-events:none`; st.ov.appendChild(d);
          setTimeout(() => { d.style.transform = 'translateY(24px)'; d.style.opacity = 0; }, 30 + i*70); setTimeout(() => d.remove(), 800); } };
        SK.drag(st, { busy: () => busy || phase === 'chop', redraw: () => draw(), plane: 70, lift: 6,
          list: () => phase === 'wash' ? vegs.filter(v => v.dirty) : phase === 'stir' ? vegs.filter(v => v.board && !v.inPot).map(v => (v.p = v.p[2] === 73 ? v.p : [BOARD[0] + 4, BOARD[1] - 13 + vegs.indexOf(v)*13, 73], v)) : phase === 'table' ? plates.filter(p => !p.on) : [],
          onTap(e){
            const b = st.svg.getBoundingClientRect(), hit = (p3, r) => { const [x, y] = st.toPx(p3); return Math.hypot(e.clientX - b.left - x, e.clientY - b.top - y) < r; };
            if (phase === 'chop' && hit([BOARD[0], BOARD[1], 74], 70)){ const v = vegs.find(v2 => v2.board && (v2.sl || 0) < 4); if (!v) return; v.sl = (v.sl || 0) + 1; chops++; st.sfx('h_wood'); draw();
              if (vegs.every(v2 => v2.sl >= 4)){ phase = 'stir'; draw(); } }
            if (phase === 'stir' && potIn >= 3 && hit([POT[0], POT[1], 84], 70)) stirAt(e);
          },
          onDrop(t, e, near){
            if (phase === 'wash' && near(e, [SINK[0], SINK[1], 72], 80)){ t.dirty = false; t.board = true; water(SINK.concat([72])); st.heart([SINK[0], SINK[1], 80]); draw();
              if (vegs.every(v => !v.dirty)){ phase = 'chop'; vegs.forEach(v => v.sl = 0); draw(); } return true; }
            if (phase === 'stir' && near(e, [POT[0], POT[1], 84], 80)){ t.inPot = true; potIn++; st.sfx('h_cloth'); draw(); return true; }
            if (phase === 'table'){ const k = plates.filter(p => p.on).length; if (near(e, [MATS[k][0], MATS[k][1], TABLE.z + 4], 70)){ t.on = true; t.p = [MATS[k][0], MATS[k][1], TABLE.z + 4.4]; st.sfx('h_clink'); draw();
              if (plates.every(p => p.on)) eat(); return true; } }
            return false;
          } });
        // stirring: drag round inside the pot; two turns and it is cooked
        const sv = st.svg; let stirring = false;
        function stirAt(e){ stirring = true; lastA = null; sv.setPointerCapture && (() => { try { sv.setPointerCapture(e.pointerId); } catch (er) {} })(); }
        sv.addEventListener('pointerdown', e => { if (phase === 'stir' && potIn >= 3){ const b = sv.getBoundingClientRect(), [x, y] = st.toPx([POT[0], POT[1], 84]); if (Math.hypot(e.clientX - b.left - x, e.clientY - b.top - y) < 70){ stirring = true; lastA = null; } } });
        sv.addEventListener('pointermove', e => { if (!stirring || phase !== 'stir') return; const b = sv.getBoundingClientRect(), [x, y] = st.toPx([POT[0], POT[1], 84]), a = Math.atan2(e.clientY - b.top - y, e.clientX - b.left - x);
          if (lastA != null){ let da = a - lastA; if (da > Math.PI) da -= 2*Math.PI; if (da < -Math.PI) da += 2*Math.PI; stir += Math.abs(da); if (Math.random() < .2) st.sfx('h_scrub'); draw(); }
          lastA = a; if (stir > 4*Math.PI){ stirring = false; steam(); phase = 'table'; ummi = { pose: 'stand', frame: 0 }; draw(); } });
        sv.addEventListener('pointerup', () => { stirring = false; });
        function steam(){ st.sfx('h_done'); for (let i = 0; i < 4; i++){ const [x, y] = st.toPx([POT[0], POT[1] + (i - 1.5)*4, 92]), d = document.createElement('div');
          d.style.cssText = `position:absolute;left:${x - 8}px;top:${y - 8}px;width:16px;height:16px;border-radius:50%;background:rgba(255,255,255,.8);transition:transform 1.4s ease-out,opacity 1.4s;pointer-events:none`;
          st.ov.appendChild(d); setTimeout(() => { d.style.transform = `translate(${(i - 1.5)*8}px,-60px) scale(1.8)`; d.style.opacity = 0; }, 40 + i*120); setTimeout(() => d.remove(), 1700); } }
        // everyone sits down; one plate is covered for the neighbour
        function eat(){ busy = true; phase = 'eat'; ummi = { pose: 'sit', frame: 0 }; plates[3].share = true; draw(); st.dots(4, 4);
          setTimeout(() => { const g = document.createElement('div'), [x, y] = st.toPx([MATS[3][0], MATS[3][1], TABLE.z + 6]);
            g.style.cssText = `position:absolute;left:${x - 40}px;top:${y - 40}px;width:80px;height:80px;border-radius:50%;background:radial-gradient(circle,rgba(255,226,140,.7),transparent 70%);pointer-events:none;animation:hhGlow 1.6s ease-in-out infinite alternate`;
            st.ov.appendChild(g); st.heart([MATS[3][0], MATS[3][1], 50]); st.sfx('h_spark'); }, 900);
          setTimeout(() => SK.end(st, null, [TABLE.x1, 120, 0], 0, () => {}, resolve, 'cook-with-ummi'), 2400); }
      });
    },
  };
})();
