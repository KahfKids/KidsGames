/* Helping Home: building blocks with the toddler (HHPlay.blocks). A mini-scene on the nursery rug.
   1. Drag the blocks onto the tower spot: each one snaps on top (a wooden knock).
   2. At five, the toddler reaches over and knocks it down, with a giggle (natural sounds only, no music).
   3. Tidy up: drag every block into the toy chest. The toddler waves, a hug, a heart. Nothing can go wrong.
   HHPlay.blocks.start(el, { date }) -> Promise<{ done: true|false, job: 'play-blocks' }>
   Uses FAMILY.stage (house/family.js) for the drawing, the camera and the close button. */
(function () {
  'use strict';
  const PLAY = window.HHPlay = window.HHPlay || {};
  const COLS = ['#e8574a', '#5b8fd6', '#f2c230', '#5cae6a', '#ef8a3c', '#9a6bb8'];
  const S = 18, TW = [66, 84], CH = { x0: 14, x1: 50, y0: 104, y1: 142, h: 26 }, TOD = [98, 20], TODF = 112;

  // a block turned by `a` about the vertical axis (and tipped by `tip` while it tumbles): faces, a dot on top, ink
  function block(c, a, col, tip){
    const m = matOf(col), h = S/2, ca = Math.cos(a), sa = Math.sin(a), ct = Math.cos(tip || 0), st = Math.sin(tip || 0);
    const R = ([u, v, w]) => { const w2 = w*ct - u*st, u2 = u*ct + w*st; return [c[0] + u2*ca - v*sa, c[1] + u2*sa + v*ca, c[2] + h + w2]; };
    const Rn = ([u, v, w]) => { const w2 = w*ct - u*st, u2 = u*ct + w*st; return [u2*ca - v*sa, u2*sa + v*ca, w2]; };
    const F = [[[1, 0, 0], [[h, -h, -h], [h, h, -h], [h, h, h], [h, -h, h]]], [[-1, 0, 0], [[-h, -h, -h], [-h, h, -h], [-h, h, h], [-h, -h, h]]],
      [[0, 1, 0], [[-h, h, -h], [h, h, -h], [h, h, h], [-h, h, h]]], [[0, -1, 0], [[-h, -h, -h], [h, -h, -h], [h, -h, h], [-h, -h, h]]],
      [[0, 0, 1], [[-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h]]], [[0, 0, -1], [[-h, -h, -h], [h, -h, -h], [h, h, -h], [-h, h, -h]]]];
    let s = '', all = [];
    for (const [n, q] of F){ const nn = Rn(n); if (!vis(nn)) continue; const pts = q.map(R); all = all.concat(pts);
      s += shape(pts, toneI(nn, m), .9);
      if (n[2] === 1 || n[0] === 1){ const cc = [n[0]*h*1.01, n[1]*h*1.01, n[2]*h*1.01];
        const ring = Array.from({ length: 10 }, (_, i) => { const t = i/10*2*Math.PI, r = h*.42; return n[2] ? [cc[0] + r*Math.cos(t), cc[1] + r*Math.sin(t), cc[2]] : [cc[0], cc[1] + r*Math.cos(t), cc[2] + r*Math.sin(t)]; });
        s += fill(pd(ring.map(R)), '#fff4d6'); } }
    return s + hullInk(F.reduce((a, f) => a.concat(f[1].map(R)), []), 1.6);
  }
  function room(o){
    const W = { l: '#fff3c6', m: '#f4e2a8', d: '#dcc68a' }, fl = matOf('#e9c08a');
    let s = box(-8, -8, -8, 120, 150, 0, fl, toneI, 1);
    s += fill(pd([[0, 0, 0], [0, 150, 0], [0, 150, 96], [0, 0, 96]]), toneI([1, 0, 0], W)) + fill(pd([[0, 0, 0], [120, 0, 0], [120, 0, 96], [0, 0, 96]]), toneI([0, 1, 0], W));
    s += ink(pd([[0, 0, 0], [0, 0, 96]], false) + pd([[0, 150, 0], [0, 0, 0], [120, 0, 0]], false), 1.2);
    let b = ''; for (let y = 17; y < 150; y += 17) b += pd([[0, y, 0], [120, y, 0]], false); s += `<path d="${b}" fill="none" stroke="#c99a62" stroke-width=".7"/>`;
    // a round rug, a window with the sky, a little shelf
    s += shape(on(PZ(.4), ellUV(76, 82, 40, 48, 28)), '#f3a6bb', 1.1) + ink(pd(on(PZ(.5), ellUV(76, 82, 33, 40, 28))), .8).replace(INK, '#fbf6ea');
    s += shape(on(PX(.4), rectUV(40, 44, 92, 84)), '#fbf6ea', 1.2) + fill(pd(on(PX(.5), rectUV(44, 48, 88, 80))), '#bfe0f2') + ink(pd(on(PX(.6), [[66, 48], [66, 80]]), false) + pd(on(PX(.6), [[44, 64], [88, 64]]), false), 1.1);
    s += castShadow([[CH.x0, CH.y0, 0], [CH.x1, CH.y0, 0], [CH.x0, CH.y1, 0], [CH.x1, CH.y1, 0], [CH.x0, CH.y0, CH.h], [CH.x1, CH.y1, CH.h]], 0).replace('fill="', 'opacity=".35" fill="');
    return s + chest(o.open, o.inChest);
  }
  function chest(open, n){
    const m = matOf('#5b8fd6'), lid = matOf('#4a7cc0'), { x0, x1, y0, y1, h } = CH;
    let s = box(x0, y0, 0, x1, y1, h, m, toneI, 1.1);
    if (open){
      s += fill(pd([[x0 + 3, y0 + 3, h], [x1 - 3, y0 + 3, h], [x1 - 3, y1 - 3, h], [x0 + 3, y1 - 3, h]]), '#2e4a78');
      for (let i = 0; i < n; i++){ const cx = x0 + 9 + (i % 2)*16, cy = y0 + 9 + Math.floor(i/2)*10; s += fill(pd([[cx - 6, cy - 4, h - 1], [cx + 6, cy - 4, h - 1], [cx + 6, cy + 4, h - 1], [cx - 6, cy + 4, h - 1]]), COLS[i % COLS.length]); }
      // the lid stands open against the wall
      s += shape([[x0, y0, h], [x0, y1, h], [x0 - 6, y1, h + 30], [x0 - 6, y0, h + 30]], toneI([1, 0, .2], lid), 1.1);
    } else s += box(x0 - 1, y0 - 1, h, x1 + 1, y1 + 1, h + 5, lid, toneI, 1.1) + fill(pd(on(PX(x1 + 1.2), ellUV((y0 + y1)/2, h - 4, 3.2, 3.2, 12))), '#f2c230');
    const tz = open ? h : h + 5; return s + hullInk([[x0, y0, 0], [x1, y0, 0], [x0, y1, 0], [x1, y1, 0], [x0, y0, tz], [x1, y1, tz], [x1, y0, tz], [x0, y1, tz]], 1.8);
  }

  PLAY.blocks = {
    start(el, opts){
      opts = opts || {};
      return new Promise(resolve => {
        const st = FAMILY.stage(el, { bounds: [[-8, -8, 0], [120, 150, 100]], pitch: 32, top: 90, bottom: 30 });
        const seed = (opts.date || new Date()).getDate();
        const B = COLS.map((col, i) => ({ i, col, p: [94 + ((i*37 + seed*11) % 20), 66 + i*14 + ((i*13 + seed) % 6), 0], a: ((i*53 + seed*7) % 90)*Math.PI/180, at: 'floor' }));
        let phase = 'build', tower = [], inChest = 0, todPose = 'play', todFr = 0, drag = null, busy = false;
        const finish = done => { st.destroy(); try { if (done) window.KahfBridge && KahfBridge.complete(); } catch (e) {} resolve({ done, job: 'play-blocks' }); };
        st.onClose = () => finish(false);
        function drawStatic(){
          st.draw('st', () => room({ open: phase === 'tidy' || phase === 'end', inChest }) + FAMILY.svg('toddler', todPose, [TOD[0], TOD[1], 0], TODF, todFr));
        }
        function drawBlocks(){
          st.draw('dy', () => {
            const ppu = st.svg.getBoundingClientRect().width/st.svg.viewBox.baseVal.width, hit = 30/ppu;
            const items = B.filter(b => b.at !== 'chest').map(b => ({ box: [[b.p[0] - S/2, b.p[1] - S/2, b.p[2]], [b.p[0] + S/2, b.p[1] + S/2, b.p[2] + S]],
              svg: `<g data-i="${b.i}" data-drag="1">` + block(b.p, b.a, b.col, b.tip) + (() => { const q = P(b.p[0], b.p[1], b.p[2] + S/2); return `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${hit.toFixed(1)}" fill="transparent"/>`; })() + '</g>' }));
            // the tower spot: a soft ring on the rug while building
            const ring = phase === 'build' && !tower.length ? `<path d="${pd(on(PZ(.6), ellUV(TW[0], TW[1], S*.75, S*.75, 18)))}" fill="#fbf6ea" opacity=".5"/>` : '';
            return ring + byDepth(items);
          });
        }
        function ringAt(){ // a pulsing ring on the target: the tower top, or the open chest
          st.ov.querySelectorAll('.fam-ring').forEach(r => r.remove());
          const p = phase === 'build' ? [TW[0], TW[1], tower.length*S + S/2] : phase === 'tidy' ? [(CH.x0 + CH.x1)/2, (CH.y0 + CH.y1)/2, CH.h] : null;
          if (!p) return; const [x, y] = st.toPx(p), r = document.createElement('div'); r.className = 'fam-ring';
          Object.assign(r.style, { left: (x - 34) + 'px', top: (y - 34) + 'px', width: '68px', height: '68px' }); st.ov.appendChild(r);
        }
        const all = () => { drawStatic(); drawBlocks(); ringAt(); st.dots(phase === 'build' ? 5 : 6, phase === 'build' ? tower.length : inChest); };
        all();
        st.onResize = all;

        // dragging: the block follows the finger a little above it; drop it on the tower or in the chest
        st.svg.addEventListener('pointerdown', e => {
          if (busy) return; const g = e.target.closest('[data-i]'); if (!g) return;
          const b = B[+g.dataset.i]; if (b.at === 'tower' && b !== tower[tower.length - 1]) return;
          drag = { b, id: e.pointerId }; try { st.svg.setPointerCapture(e.pointerId); } catch (er) {} st.sfx('fam_rustle'); move(e);
        });
        function move(e){ if (!drag || e.pointerId !== drag.id) return; const p = st.floor(e.clientX, e.clientY - 34, 0);
          drag.b.p = [Math.max(6, Math.min(116, p[0])), Math.max(6, Math.min(146, p[1])), 14]; drawBlocks(); }
        st.svg.addEventListener('pointermove', move);
        st.svg.addEventListener('pointerup', e => {
          if (!drag || e.pointerId !== drag.id) return; const b = drag.b; drag = null;
          if (b.at === 'tower') tower.pop();
          const near = (p3, r) => { const [x, y] = st.toPx(p3), bx = st.svg.getBoundingClientRect(); return Math.hypot(e.clientX - bx.left - x, e.clientY - 34 - bx.top - y) < r; };
          if (phase === 'build' && near([TW[0], TW[1], tower.length*S + S/2], 74)){
            b.p = [TW[0] + (tower.length % 2 ? 1.2 : -1), TW[1] + (tower.length % 2 ? -1 : .8), tower.length*S]; b.a = (tower.length % 3)*.12; b.at = 'tower'; tower.push(b);
            st.sfx('fam_block', { n: tower.length }); all();
            if (tower.length === 5) knock();
          } else if (phase === 'tidy' && near([(CH.x0 + CH.x1)/2, (CH.y0 + CH.y1)/2, CH.h], 84)){
            b.at = 'chest'; inChest++; st.sfx('fam_chest'); all();
            if (inChest === B.length) end();
          } else { b.p = [b.p[0], b.p[1], 0]; b.at = 'floor'; st.sfx('fam_hop'); drawBlocks(); }
        });
        // the toddler reaches over, the tower tumbles, he giggles
        function knock(){
          busy = true; phase = 'knock'; ringAt();
          setTimeout(() => { todPose = 'play'; todFr = 2; drawStatic(); }, 500);
          setTimeout(() => {
            st.sfx('fam_tumble'); setTimeout(() => st.sfx('fam_giggle'), 380);
            const fly = tower.map((b, k) => { const a = -.4 + k*.5 + Math.random()*.3, r = 34 + k*7 + Math.random()*8;
              return { b, from: b.p.slice(), to: [Math.max(70, Math.min(114, TW[0] + 18 + r*Math.cos(a))), Math.max(10, Math.min(144, TW[1] + r*Math.sin(a)*1.2)), 0], h: 16 + k*7, spin: (Math.random() - .5)*6, dur: 650 + k*90 }; });
            const t0 = performance.now();
            (function step(now){ let live = false;
              for (const f of fly){ const u = Math.min(1, (now - t0)/f.dur); if (u < 1) live = true; const e2 = u;
                f.b.p = [f.from[0] + (f.to[0] - f.from[0])*e2, f.from[1] + (f.to[1] - f.from[1])*e2, Math.max(0, f.from[2]*(1 - e2) + f.h*Math.sin(Math.PI*e2))];
                f.b.a += f.spin*.016; f.b.tip = u < 1 ? Math.sin(u*Math.PI*2)*.7 : 0; f.b.at = 'floor'; }
              drawBlocks(); if (live) requestAnimationFrame(step);
              else { tower = []; todPose = 'wave'; let k = 0; const w = setInterval(() => { todFr = ++k % 4; drawStatic(); if (k > 7){ clearInterval(w); todPose = 'play'; todFr = 0; phase = 'tidy'; busy = false; all(); } }, 170); } })(t0);
          }, 900);
        }
        function end(){
          phase = 'end'; busy = true; all(); st.praise();
          setTimeout(() => { phase = 'shut'; drawStatic(); st.sfx('fam_chest'); }, 450);
          let k = 0; const hug = setInterval(() => { todPose = k < 6 ? 'wave' : 'hug'; todFr = k < 6 ? k % 4 : Math.min(5, k - 6); drawStatic(); k++;
            if (k === 9){ st.sfx('fam_hug'); st.heart([TOD[0], TOD[1], 70]); }
            if (k > 13){ clearInterval(hug); setTimeout(() => finish(true), 600); } }, 160);
        }
      });
    },
  };
})();
