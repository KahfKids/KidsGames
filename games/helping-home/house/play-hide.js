/* Helping Home: hide and seek with the toddler (HHPlay.hide).
   He hides in a spot picked by the day (FAMILY.hideSpot), and something always peeks out: his feet under the curtain,
   his hair tuft over the basket. Tap where you think he is. A wrong spot just wiggles; after two, his spot giggles and
   wiggles by itself. Found: he pops up with a giggle, waves and runs in for a hug (FAMILY.found). Nothing can go wrong.
   This standalone scene is a living-room corner. In the house the integrator uses FAMILY.hideSpot(date) and
   FAMILY.found() with the house view instead; the play API is the same:
   HHPlay.hide.start(el, { date }) -> Promise<{ done: true|false, job: 'play-hide', spot }> */
(function () {
  'use strict';
  const PLAY = window.HHPlay = window.HHPlay || {};
  // the house's hiding ids, mapped onto this room's five places
  const MAP = { curtain: 'curtain', table: 'table', basket: 'basket', toychest: 'chest', coats: 'sofa', bed: 'sofa', shed: 'table' };
  const SPOTS = {
    curtain: { out: [40, 140, 0], face: 45, tap: [8, 140, 50] },
    sofa:    { out: [118, 26, 0], face: 45, tap: [64, 18, 24] },
    basket:  { out: [126, 112, 0], face: 45, tap: [126, 150, 22] },
    chest:   { out: [126, 82, 0], face: 45, tap: [104, 52, 18] },
    table:   { out: [104, 116, 0], face: 45, tap: [64, 104, 30] },
  };
  const WALL = { l: '#e3eed7', m: '#cfdcc2', d: '#a9b89c' };
  function shell(){
    let s = box(-8, -8, -8, 150, 180, 0, matOf('#d8a66c'), toneI, 1);
    s += fill(pd([[0, 0, 0], [0, 180, 0], [0, 180, 104], [0, 0, 104]]), toneI([1, 0, 0], WALL)) + fill(pd([[0, 0, 0], [150, 0, 0], [150, 0, 104], [0, 0, 104]]), toneI([0, 1, 0], WALL));
    s += ink(pd([[0, 0, 0], [0, 0, 104]], false) + pd([[0, 180, 0], [0, 0, 0], [150, 0, 0]], false), 1.2);
    let b = ''; for (let y = 17; y < 180; y += 17) b += pd([[0, y, 0], [150, y, 0]], false); s += `<path d="${b}" fill="none" stroke="#b5804a" stroke-width=".7"/>`;
    s += shape(on(PZ(.4), rrUV(30, 40, 112, 150, 10, 4)), '#c9694c', 1) + ink(pd(on(PZ(.5), rrUV(36, 46, 106, 144, 8, 4))), .8).replace(INK, '#f2c230');
    return s;
  }
  // each place: its drawing, and the peek when he hides there
  const PLACE = {
    curtain(peek){ let s = shape(on(PX(.4), rectUV(116, 52, 164, 96)), '#fbf6ea', 1.2) + fill(pd(on(PX(.5), rectUV(120, 56, 160, 92))), '#bfe0f2') + ink(pd(on(PX(.6), [[140, 56], [140, 92]]), false), 1.1);
      s += shape(on(PX(1.2), [[110, 100], [128, 100], [124, 60], [127, 2], [108, 2]]), '#3f9c92', 1.1) + shape(on(PX(1.2), [[150, 100], [172, 100], [174, 2], [152, 2], [156, 60]]), '#3f9c92', 1.1);
      s += box(1, 104, 100, 4, 176, 103, matOf('#a8693f'), toneI, .7);
      if (peek) s += shoes([6, 140, 0]);
      return s; },
    sofa(peek){ const m = matOf('#e9b64a'), c = matOf('#f3d07a');
      // back to front for this camera: the back, the far arm, the seat and its cushions, the near arm
      let s = box(30, 2, 16, 100, 12, 42, m, toneI, 1) + box(26, 2, 0, 32, 34, 30, m, toneI, 1) + box(30, 2, 0, 100, 34, 16, m, toneI, 1);
      s += box(34, 12, 16, 64, 32, 21, c, toneI, .9) + box(66, 12, 16, 96, 32, 21, c, toneI, .9) + box(98, 2, 0, 104, 34, 30, m, toneI, 1);
      if (peek) s += tuft([110, 20, 30]);
      return s; },
    basket(peek){ let s = cyl(126, 150, 0, 30, 15, { l: '#e2b277', m: '#c99555', d: '#8e6236' }, toneI, 1.4, 20);
      let w = ''; for (let z = 6; z < 30; z += 6) w += pd(on(PZ(z), ellUV(126, 150, 15.2, 15.2, 20)).filter(p => vis([p[0] - 126, p[1] - 150, 0])), false); s += `<path d="${w}" fill="none" stroke="#8e6236" stroke-width=".8"/>`;
      if (peek) s += tuft([126, 150, 31]);
      return s; },
    chest(peek){ let s = box(92, 36, 0, 120, 70, 24, matOf('#5b8fd6'), toneI, 1.1) + box(91, 35, 24, 121, 71, 29, matOf('#4a7cc0'), toneI, 1.1) + fill(pd(on(PX(121.2), ellUV(53, 20, 3, 3, 12))), '#f2c230');
      if (peek) s += tuft([104, 76, 22]);
      return s; },
    table(peek){ const cl = matOf('#fbf4e4'); let s = '';
      if (peek) s += shoes([88, 106, 0], 90);
      s += box(44, 84, 0, 84, 126, 36, cl, toneI, 1.1);
      let sc = ''; for (let y = 86; y < 126; y += 8) sc += pd(on(PX(84.2), arcUV(y + 4, 4, 4, 180, 360, 5)), false); s += `<path d="${sc}" fill="none" stroke="#e8574a" stroke-width="1.2"/>`;
      s += ball2([64, 98, 40], 4, '#ef8a3c') + ball2([58, 108, 40], 3.6, '#93c25c');
      return s; },
  };
  function shoes(at, face){ const fa = ((face || 0) + 0)*Math.PI/180, c = Math.cos(fa), s2 = Math.sin(fa); let s = '';
    for (const off of [-3.2, 3.2]){ const b = [at[0] - s2*off, at[1] + c*off, 1.6], t = [b[0] + c*7, b[1] + s2*7, 1.6];
      s += `<path d="${pd([b, t], false)}" fill="none" stroke="${INK}" stroke-width="6.4" stroke-linecap="round"/><path d="${pd([b, t], false)}" fill="none" stroke="#f2c230" stroke-width="4" stroke-linecap="round"/>`; }
    return s; }
  function tuft(at){ const q = P(...at), R = 6*Math.sqrt(1.5);
    return `<path d="M${(q[0] - R).toFixed(1)} ${q[1].toFixed(1)}A${R.toFixed(1)} ${R.toFixed(1)} 0 0 1 ${(q[0] + R).toFixed(1)} ${q[1].toFixed(1)}Z" fill="#3a2a1e" stroke="${INK}" stroke-width="1.2"/>` +
      `<path d="M${q[0].toFixed(1)} ${(q[1] - R).toFixed(1)}q2 -5 6 -4" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`; }
  function ball2(p, r, col){ const q = P(...p), R = r*Math.sqrt(1.5); return `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${R.toFixed(1)}" fill="${col}" stroke="${INK}" stroke-width="1"/>`; }

  PLAY.hide = {
    start(el, opts){
      opts = opts || {};
      return new Promise(resolve => {
        const date = opts.date || new Date(), hs = FAMILY.hideSpot(date), spot = opts.spot || MAP[hs.id] || 'curtain';
        const st = FAMILY.stage(el, { bounds: [[-8, -8, 0], [150, 180, 106]], pitch: 30, top: 90, bottom: 30 });
        let wrong = 0, found = false;
        const finish = done => { st.destroy(); try { if (done) window.KahfBridge && KahfBridge.complete(); } catch (e) {} resolve({ done, job: 'play-hide', spot }); };
        st.onClose = () => finish(false);
        function draw(){
          st.draw('st', () => {
            const order = ['curtain', 'sofa', 'chest', 'table', 'basket'];
            return shell() + order.map(id => `<g data-spot="${id}" style="transform-box:fill-box;transform-origin:50% 100%">${PLACE[id](!found && id === spot)}${hit(id)}</g>`).join('');
          });
        }
        function hit(id){ const q = P(...SPOTS[id].tap), ppu = st.svg.getBoundingClientRect().width/st.svg.viewBox.baseVal.width; return `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${(36/ppu).toFixed(1)}" fill="transparent"/>`; }
        draw(); st.onResize = draw;
        const wig = id => { const g = st.svg.querySelector(`[data-spot="${id}"]`); if (!g) return; g.classList.remove('wig'); void g.getBoundingClientRect(); g.classList.add('wig'); };
        st.svg.addEventListener('pointerdown', e => {
          if (found) return; const g = e.target.closest('[data-spot]'); if (!g) return; const id = g.dataset.spot;
          if (id !== spot){ wrong++; wig(id); st.sfx('fam_rustle');
            if (wrong >= 2) setTimeout(() => { wig(spot); st.sfx('fam_giggle'); }, 600); return; }
          found = true; draw(); reveal();
        });
        function reveal(){
          const S = SPOTS[spot], F = FAMILY.found(), t0 = performance.now(); st.sfx('fam_giggle'); st.sfx('fam_hop');
          (function step(now){ const ms = now - t0, f = F.at(ms);
            st.draw('dy', () => FAMILY.svg('toddler', f.pose, [S.out[0], S.out[1], (f.lift || 0)], S.face, f.frame));
            if (ms > 1750 && !step.h){ step.h = 1; st.sfx('fam_hug'); st.heart([S.out[0], S.out[1], 66]); st.praise(); }
            if (!f.done) requestAnimationFrame(step); else setTimeout(() => finish(true), 700); })(t0);
        }
        // a hint at the start: the peeking spot gives a tiny wiggle after a while if nobody has tapped
        setTimeout(() => { if (!found && !wrong) wig(spot); }, 6000);
      });
    },
  };
})();
