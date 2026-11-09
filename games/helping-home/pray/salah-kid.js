/* Helping Home: the child who shows each salah position on the mat (window.SALAHKID). Made with Colorfigures (MIT).
   A faceless child (NO eyes, nose, mouth or expression: the head is a plain shaded sphere; ears and hair only show which
   way it turns), built like every other 3D part: banded tubes for the limbs, a ringed torso, a kurta or a long tunic
   with a collar, placket, cuffs and hem, bare feet with toes, hands with a palm, fingers and thumb.
   Two looks: 'cap' (a kufi, short hair) and 'scarf' (a hijab with a short cape). The skin tone is the game's 'hh.hand'.

   The body is posed in 3D (the spine pitches at the hip, the head pitches and turns on the neck, 2-bone IK for the arms
   and legs), so each position is correct, and the move between two positions is a real movement: the targets blend in
   the body's own frame (hands move with the torso), and the parts are staged (going down: knees first, then the
   forehead and hands; coming up: head and back first).

   Positions (names used by pray/salah.js):
     rise    standing straight, arms by the sides (i'tidal, and standing ready)
     stand   qiyam: hands folded between the chest and the navel, right over left, eyes down
     takbir  hands up by the ears, palms toward the qibla, fingers up
     ruku    back flat, head in line and lowered, hands gripping the knees, arms straight
     qunut   standing, hands raised in front with the palms up (du'a)
     sujud   seven parts down: forehead (with the nose), both palms flat by the head with the fingers to the qibla,
             both knees, the toes of both feet bent toward the qibla; elbows lifted and away from the sides
     sit     jalsa: sitting on the left foot, the right foot upright with its toes bent to the qibla, hands on the thighs
     tash    the same sitting, the right index finger raised toward the qibla
     salamR / salamL   the sitting, the head turned to the right / left
   Local frame of the child: u forward (toward the qibla), v to the child's left, w up; the origin is the spot between
   the feet when standing. SALAHKID.place(x, y, z) sets where that spot is on the mat (world: the child faces -x).

   API: SALAHKID.svg(name, opts) | SALAHKID.frame(from, to, t, opts) -> SVG string (pass it through inkScale)
        SALAHKID.contacts(name) -> [{ kind: 'foot'|'toes'|'knee'|'hand'|'head', x, y, ang, side }]   (world, on the mat)
        SALAHKID.track(from, to) -> { kind: 'head'|'hands'|'turn'|'', paths: [[world points]] }   for motion arrows
        SALAHKID.extent() -> world points around every position (framing)
        SALAHKID.look 'cap' | 'scarf'   SALAHKID.names */
(function () {
  'use strict';
  const D2R = Math.PI / 180;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const len3 = a => Math.hypot(a[0], a[1], a[2]);
  const n3 = a => { const l = len3(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const fx = v => v.toFixed(1);
  const basisOf = n => { const e1 = n3(cross(n, Math.abs(n[2]) < .9 ? [0, 0, 1] : [1, 0, 0])); return [e1, cross(n, e1)]; };
  // rotate v about the unit axis k by angle a (Rodrigues)
  const rot = (v, k, a) => { const c = Math.cos(a), s = Math.sin(a); return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c))); };

  /* ---------- the child: a 6 to 7 year old, about 112 cm ---------- */
  const B = { ankle: 4, shin: 25, thigh: 27, torso: 33, neck: 3.4, head: 9.6, uarm: 16.5, farm: 14.5, shW: 8.6, hipW: 4.8,
              wThigh: 9.8, wShin: 7.6, wUarm: 6.4, wFarm: 5.6 };
  // torso rings [t along the spine, side radius, front radius, forward offset]: a child's round tummy, narrow shoulders
  const TORSO = [[-.12, 8.4, 6.4, -.2], [.2, 8.2, 6.9, .5], [.52, 8.9, 7.0, .5], [.8, 9.6, 6.5, .1], [.95, 8.2, 5.4, 0], [.995, 5.4, 4, 0]];
  let SKIN = '#c98e62';
  try { const h = JSON.parse(localStorage.getItem('hh.hand') || 'null'); if (h && /^#[0-9a-f]{6}$/i.test(h.skin || '')) SKIN = h.skin; else if (typeof h === 'string' && /^#[0-9a-f]{6}$/i.test(h)) SKIN = h; } catch (e) {}
  const LOOKS = {
    cap:   { top: '#5b9bd5', legs: '#3f4a63', hat: '#fbf6ea', hair: '#33261c', hem: .7 },
    scarf: { top: '#c95b7c', legs: '#3f4a63', scarf: '#6552a8', hem: .8 },
  };

  /* ---------- the positions ---------- */
  const HIPZ = B.ankle + B.shin + B.thigh - .4;
  const standLegs = { L: { ankle: [.6, 5.3, B.ankle], hint: [1, .1, 0] }, R: { ankle: [.6, -5.3, B.ankle], hint: [1, -.1, 0] } };
  const flatFeet = { L: { f: n3([1, .1, 0]), n: [0, 0, -1] }, R: { f: n3([1, -.1, 0]), n: [0, 0, -1] } };
  const upright = { f: n3([.12, 0, -1]), n: n3([-1, 0, .1]), t: [1, 0, 0] };   // heel up, sole back, toes bent forward
  const armsDown = {
    L: { wrist: J => add(J.shL, [1.2, 1.7, -30.3]), elbow: [-1, .3, 0], hand: { d: n3([.12, 0, -1]), n: [0, -1, 0], shape: 'flat' } },
    R: { wrist: J => add(J.shR, [1.2, -1.7, -30.3]), elbow: [-1, -.3, 0], hand: { d: n3([.12, 0, -1]), n: [0, 1, 0], shape: 'flat' } } };
  // the sitting (iftirash): on the left foot laid flat (sole up, toes to the right), the right foot upright
  const SIT = { hip: [3, 0, 10.6], lean: 3, tilt: 16,
    legs: { L: { knee: [27.5, 6.4, 4.2], ankle: [.5, 3.2, 2.7] }, R: { knee: [27.5, -7.4, 4.2], ankle: [1.5, -8.4, 7.7] } },
    feet: { L: { f: n3([-.72, -.69, 0]), n: [0, 0, 1] }, R: upright } };
  // a hand resting on the thigh, fingers toward the knee
  const onThigh = (sd, shape) => ({
    wrist: J => add(lerp3(J['hip' + sd], J['knee' + sd], .57), [0, sd === 'L' ? .5 : -.5, 6.4]),
    elbow: [-.6, sd === 'L' ? .7 : -.7, -.2],
    hand: J => ({ d: n3(add(sub(J['knee' + sd], J['hip' + sd]), [0, 0, -3])), n: [0, 0, -1], shape: shape || 'flat', idx: n3([.72, 0, .7]) }) });
  const POSES = {
    rise: { hip: [-.4, 0, HIPZ], lean: 0, tilt: 12, legs: standLegs, feet: flatFeet, arms: armsDown },
    stand: { hip: [-.4, 0, HIPZ], lean: 1, tilt: 16, legs: standLegs, feet: flatFeet, arms: {
      L: { wrist: [8.6, 3.6, 66.6], elbow: [-.3, 1, -.8], hand: { d: n3([.1, -1, .05]), n: [-1, 0, 0], shape: 'flat' } },
      R: { wrist: [10.4, -4.4, 67.4], elbow: [-.3, -1, -.8], hand: { d: n3([.05, 1, .05]), n: [-1, 0, 0], shape: 'flat' } } } },
    takbir: { hip: [-.4, 0, HIPZ], lean: 0, tilt: 8, legs: standLegs, feet: flatFeet, arms: {
      L: { wrist: [1.6, 14.4, 95.6], elbow: [.5, 1, -1], hand: { d: [0, 0, 1], n: [1, 0, 0], shape: 'flat' } },
      R: { wrist: [1.6, -14.4, 95.6], elbow: [.5, -1, -1], hand: { d: [0, 0, 1], n: [1, 0, 0], shape: 'flat' } } } },
    ruku: { hip: [-6.5, 0, 53.6], lean: 91, tilt: 10, legs: standLegs, feet: flatFeet, arms: {
      L: { wrist: J => add(J.kneeL, [4.4, .3, 4.6]), elbow: [-.2, 1, .2], hand: { d: n3([.12, 0, -1]), n: [-1, 0, 0], shape: 'spread' } },
      R: { wrist: J => add(J.kneeR, [4.4, -.3, 4.6]), elbow: [-.2, -1, .2], hand: { d: n3([.12, 0, -1]), n: [-1, 0, 0], shape: 'spread' } } } },
    qunut: { hip: [-.4, 0, HIPZ], lean: 0, tilt: 14, legs: standLegs, feet: flatFeet, arms: {
      // palms up, side by side, opening a little outward like a book
      L: { wrist: [13.5, 4.6, 74], elbow: [-.4, .7, -1], hand: { d: n3([1, .1, .45]), n: n3([-.35, .55, .75]), shape: 'flat' } },
      R: { wrist: [13.5, -4.6, 74], elbow: [-.4, -.7, -1], hand: { d: n3([1, -.1, .45]), n: n3([-.35, -.55, .75]), shape: 'flat' } } } },
    sujud: { hip: [21, 0, 30.6], lean: 111, tilt: 24, sujud: true,
      legs: { L: { knee: [27, 5.6, 4.2], ankle: [2.6, 5, 7.7] }, R: { knee: [27, -5.6, 4.2], ankle: [2.6, -5, 7.7] } },
      feet: { L: upright, R: upright }, arms: {
        L: { wrist: J => [J.head[0] - 5.6, 14.6, 2.1], elbow: [-.25, 1, .95], hand: { d: n3([1, -.06, 0]), n: [0, 0, -1], shape: 'flat' } },
        R: { wrist: J => [J.head[0] - 5.6, -14.6, 2.1], elbow: [-.25, -1, .95], hand: { d: n3([1, .06, 0]), n: [0, 0, -1], shape: 'flat' } } } },
    sit: Object.assign({}, SIT, { arms: { L: onThigh('L'), R: onThigh('R') } }),
    tash: Object.assign({}, SIT, { arms: { L: onThigh('L'), R: onThigh('R', 'point') } }),
    salamR: Object.assign({}, SIT, { tilt: 8, yaw: -72, arms: { L: onThigh('L'), R: onThigh('R') } }),
    salamL: Object.assign({}, SIT, { tilt: 8, yaw: 72, arms: { L: onThigh('L'), R: onThigh('R') } }),
  };
  const NAMES = Object.keys(POSES);
  // sujood: lean until the forehead (halfway between the face and the crown) is the lowest point and touches the mat
  function sujudLean(q) {
    let best = q.lean, err = 1e9;
    for (let l = 85; l <= 140; l += .25) { const a = l * D2R, nz = q.hip[2] + B.torso * Math.cos(a), hz = nz + (B.neck + B.head * .92) * Math.cos(135 * D2R);
      const e = Math.abs(hz - (B.head + .25)); if (e < err) { err = e; best = l; } }
    q.lean = best; q.tilt = 135 - best;
    return q;
  }
  sujudLean(POSES.sujud);

  /* ---------- the madhab and boy/girl variants (TEACHER REVIEW) ----------
     Only where the positions differ and the difference is simple to show. 'girl' is the headscarf look.
     Qiyam, the hands folded right over left (the right palm on the back of the left hand and wrist):
       Hanafi: boys below the navel, girls on the chest.  Shafi'i: below the chest, above the navel.
     Takbir, palms toward the qibla, fingers together and up:
       Hanafi: boys with the thumbs by the earlobes, girls up to the shoulders.
       Shafi'i: the hands level with the shoulders, the fingertips up to the tops of the ears.
     Sujood: Hanafi girls keep compact (the belly near the thighs, the arms close to the sides); everyone else keeps the
       belly off the thighs and the elbows lifted and away from the sides.
     Going down to sujood: the knees, then the hands, then the forehead and nose (and the reverse coming up), as taught by
       the Hanafi and Shafi'i schools. The sitting is the same for all here (on the left foot, the right foot upright). */
  const STYLE = { madhab: 'shafi', girl: false };
  const BASE = { sujud: POSES.sujud };
  const fold = z => ({
    L: { wrist: [8.4, 3.6, z], elbow: [-.3, 1, -.8], hand: { d: n3([.1, -1, .05]), n: [-1, 0, 0], shape: 'flat' } },
    // the right hand: palm on the back of the left hand and wrist, three fingers along the left forearm, the thumb and
    // the little finger hooked round the left wrist (drawn in full in the close-up; a flat hand in the small figure)
    R: { wrist: [10.6, -3.6, z + 2], elbow: [-.3, -1, -.8], hand: { d: n3([.05, 1, .05]), n: [-1, 0, 0], shape: 'clasp' } } });
  const raise = (z, v, u) => ({
    L: { wrist: [u, v, z], elbow: [.5, 1, -1], hand: { d: [0, 0, 1], n: [1, 0, 0], shape: 'flat' } },
    R: { wrist: [u, -v, z], elbow: [.5, -1, -1], hand: { d: [0, 0, 1], n: [1, 0, 0], shape: 'flat' } } });
  function applyStyle() {
    const hb = STYLE.madhab === 'hanafi', g = STYLE.girl;
    POSES.stand.arms = fold(hb ? (g ? 75.5 : 60.5) : 69.5);
    POSES.takbir.arms = hb ? (g ? raise(81, 12.4, 3.2) : raise(95.6, 14.4, 1.6)) : raise(89.5, 13.6, 2.2);
    if (hb && g) { POSES.takbir.arms.L.elbow = [.4, .45, -1]; POSES.takbir.arms.R.elbow = [.4, -.45, -1]; }
    POSES.sujud = hb && g ? sujudLean(Object.assign({}, BASE.sujud, { hip: [8.5, 0, 23.4], arms: {
        L: { wrist: BASE.sujud.arms.L.wrist, elbow: [-.7, .35, -.25], hand: BASE.sujud.arms.L.hand },
        R: { wrist: BASE.sujud.arms.R.wrist, elbow: [-.7, -.35, -.25], hand: BASE.sujud.arms.R.hand } } })) : BASE.sujud;
    for (const k in solved) delete solved[k];
    // on the way down to sujood: knees down, hands flat where they will stay, the head still up
    const S = pose('sujud');
    POSES.preSujud = Object.assign({}, POSES.sujud, { lean: 86, tilt: -30, sujud: false, arms: {
      L: { wrist: S.wrL.slice(), elbow: [-.5, .7, .1], hand: POSES.sujud.arms.L.hand },
      R: { wrist: S.wrR.slice(), elbow: [-.5, -.7, .1], hand: POSES.sujud.arms.R.hand } } });
    delete solved.preSujud;
  }

  /* ---------- solving the skeleton ---------- */
  function ik(A, T, l1, l2, hint) {
    let d = sub(T, A), dl = len3(d);
    const mx = (l1 + l2) * .999, mn = Math.abs(l1 - l2) + .01;
    if (dl > mx) { T = add(A, mul(d, mx / dl)); d = sub(T, A); dl = mx; }
    if (dl < mn) dl = mn;
    const dir = n3(d), a = (l1 * l1 - l2 * l2 + dl * dl) / (2 * dl), hh = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    let pp = sub(hint, mul(dir, dot(hint, dir))); if (len3(pp) < 1e-4) pp = basisOf(dir)[0]; pp = n3(pp);
    const j = add(add(A, mul(dir, a)), mul(pp, hh));
    return [j, add(j, mul(n3(sub(T, j)), l2))];
  }
  // the spine frame for a lean: a (up the spine), f (the chest's front)
  const frameOf = lean => { const l = lean * D2R; return { a: [Math.sin(l), 0, Math.cos(l)], f: [Math.cos(l), 0, -Math.sin(l)] }; };
  // q: { hip, lean, tilt, yaw, legs: {L,R: {knee?, ankle, hint?}}, feet: {L,R: {f, n, t?}}, arms: {L,R: {wrist, elbow, hand}} }
  function solve(q) {
    const J = { q }, fr = frameOf(q.lean);
    J.a = fr.a; J.f = fr.f; J.hip = q.hip; J.lean = q.lean;
    J.neck = add(q.hip, mul(fr.a, B.torso));
    const shC = add(J.neck, mul(fr.a, -B.torso * .1));
    J.shL = add(shC, [0, B.shW, 0]); J.shR = add(shC, [0, -B.shW, 0]);
    J.hipL = add(q.hip, [0, B.hipW, 0]); J.hipR = add(q.hip, [0, -B.hipW, 0]);
    const hl = (q.lean + (q.tilt || 0)) * D2R, yw = (q.yaw || 0) * D2R;
    J.hd = [Math.sin(hl), 0, Math.cos(hl)];
    J.hf = n3(add(mul([Math.cos(hl), 0, -Math.sin(hl)], Math.cos(yw)), mul([0, 1, 0], Math.sin(yw))));
    J.hs = cross(J.hd, J.hf);                                            // the head's left
    J.head = add(J.neck, mul(J.hd, B.neck + B.head * .92));
    for (const sd of ['L', 'R']) {
      const s = sd === 'L' ? 1 : -1, hp = J['hip' + sd], g = q.legs[sd];
      let kn, an;
      if (g.knee) { kn = add(hp, mul(n3(sub(g.knee, hp)), B.thigh)); an = add(kn, mul(n3(sub(g.ankle, kn)), B.shin)); }
      else { const r = ik(hp, g.ankle, B.thigh, B.shin, g.hint || [1, s * .1, 0]); kn = r[0]; an = r[1]; }
      J['knee' + sd] = kn; J['ankle' + sd] = an;
      const ft = q.feet[sd]; J['foot' + sd] = { f: n3(ft.f), n: n3(ft.n), t: n3(ft.t || ft.f) };
    }
    for (const sd of ['L', 'R']) {
      const s = sd === 'L' ? 1 : -1, sh = J['sh' + sd], g = q.arms[sd];
      const w = typeof g.wrist === 'function' ? g.wrist(J) : g.wrist;
      const r = ik(sh, w, B.uarm, B.farm, g.elbow || [-.35, s * .35, -.2]);
      J['elb' + sd] = r[0]; J['wr' + sd] = r[1];
      const h = typeof g.hand === 'function' ? g.hand(J) : g.hand;
      J['hand' + sd] = { d: n3(h.d), n: n3(h.n), shape: h.shape || 'flat', idx: h.idx };
    }
    return J;
  }
  const solved = {};
  const pose = name => solved[name] || (solved[name] = solve(POSES[name] || POSES.rise));
  applyStyle();

  /* ---------- blending two positions ---------- */
  // world-free targets in the torso's frame (so the hands ride with the torso while it bends)
  const toTorso = (J, p) => { const d = sub(p, J.hip); return [dot(d, J.f), d[1], dot(d, J.a)]; };
  const fromTorso = (fr, hip, r) => add(hip, add(add(mul(fr.f, r[0]), [0, r[1], 0]), mul(fr.a, r[2])));
  const blendDir = (a, b, t) => { const d = lerp3(a, b, t); return len3(d) < 1e-3 ? (t < .5 ? a : b) : n3(d); };
  // a frame (d, n) blended and kept square
  const blendFrame = (A, B2, t) => { const d = blendDir(A.d, B2.d, t); let n = blendDir(A.n, B2.n, t); n = n3(sub(n, mul(d, dot(n, d)))); return { d, n }; };
  const sm = (t, a, b) => { const k = clamp((t - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  function stage(A, Bq, t) {
    const dz = Bq.head[2] - A.head[2];
    if (dz < -20) return { low: sm(t, 0, .62), bend: sm(t, .22, 1), arm: sm(t, .3, 1), head: sm(t, .2, 1) };        // going down
    if (dz > 20) return { bend: sm(t, 0, .7), low: sm(t, .18, 1), arm: sm(t, .05, .85), head: sm(t, 0, .7) };      // coming up
    const e = sm(t, 0, 1); return { low: e, bend: e, arm: e, head: e };
  }
  // into or out of sujood the move goes by the knees-and-hands position: knees, hands, then the forehead (and back)
  const VIA = 'preSujud';
  const viaSplit = (a, b) => a !== b && a !== VIA && b !== VIA && (a === 'sujud') !== (b === 'sujud') ? (b === 'sujud' ? .62 : .4) : 0;
  function blend(a, b, t) {
    const k = viaSplit(a, b);
    if (!k || t <= 0 || t >= 1) return blend2(a, b, t);
    return t < k ? blend2(a, VIA, t / k) : blend2(VIA, b, (t - k) / (1 - k));
  }
  function blend2(a, b, t) {
    const A = pose(a), Bq = pose(b);
    if (t <= 0) return A; if (t >= 1) return Bq;
    const k = stage(A, Bq, t), qa = A.q, qb = Bq.q;
    const hip = lerp3(qa.hip, qb.hip, k.low), lean = lerp(qa.lean, qb.lean, k.bend);
    const q = { hip, lean, tilt: lerp(qa.tilt || 0, qb.tilt || 0, k.bend), yaw: lerp(qa.yaw || 0, qb.yaw || 0, k.head), legs: {}, feet: {}, arms: {} };
    const fr = frameOf(lean);
    for (const sd of ['L', 'R']) {
      q.legs[sd] = { knee: lerp3(A['knee' + sd], Bq['knee' + sd], k.low), ankle: lerp3(A['ankle' + sd], Bq['ankle' + sd], k.low) };
      const fa = A['foot' + sd], fb = Bq['foot' + sd], ff = blendFrame({ d: fa.f, n: fa.n }, { d: fb.f, n: fb.n }, k.low);
      q.feet[sd] = { f: ff.d, n: ff.n, t: blendDir(fa.t, fb.t, k.low) };
      const wa = toTorso(A, A['wr' + sd]), wb = toTorso(Bq, Bq['wr' + sd]);
      const ea = sub(A['elb' + sd], lerp3(A['sh' + sd], A['wr' + sd], .5)), eb = sub(Bq['elb' + sd], lerp3(Bq['sh' + sd], Bq['wr' + sd], .5));
      const ha = A['hand' + sd], hb = Bq['hand' + sd], hf = blendFrame(ha, hb, k.arm);
      q.arms[sd] = { wrist: fromTorso(fr, hip, lerp3(wa, wb, k.arm)), elbow: blendDir(ea, eb, k.arm),
                     hand: { d: hf.d, n: hf.n, shape: k.arm < .5 ? ha.shape : hb.shape, idx: hb.idx || ha.idx } };
    }
    // the knees solve from the hip (the thigh keeps its length); a standing knee comes from IK on the way
    return solve(q);
  }

  /* ---------- drawing primitives for a body (from the family's figures, house/family.js) ---------- */
  const lightW = () => { const e = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; return n3(e.map(v => dot(rotV(v), LIN))); };
  const INKW = 1.15;
  const sty = (w, col) => `fill="none" stroke="${col}" style="stroke-width:${w.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"`;
  const spath = Q => 'M' + Q.map(q => fx(q[0]) + ' ' + fx(q[1])).join('L');
  // a tube along 3D points, w thick: ink outline, the shadow side, and the lit band toward the light (3 nodes)
  function tube(pts, w, m, bands = true, inkw = INKW) {
    const Q = pts.map(p => P_(p)), d = spath(Q), W = w * CAM_K, K = INK_K || 1;
    let s = `<path d="${d}" ${sty(W + 2 * inkw * K, INK)}/>`;
    let d3 = sub(pts[pts.length - 1], pts[0]); if (len3(d3) < .01) d3 = [0, 0, 1]; d3 = n3(d3);
    const V = CAM_V, nV = n3(sub(V, mul(d3, dot(V, d3)))), n1 = n3(cross(d3, nV)), Lw = lightW(), sg = dot(n1, Lw) >= 0 ? 1 : -1;
    const cDark = toneI(n3(add(nV, mul(n1, -sg * 1.1))), m), cLit = toneI(n3(add(nV, mul(n1, sg * .7))), m);
    s += `<path d="${d}" ${sty(W, cDark)}/>`;
    if (bands) {
      const o2 = Dv(...n1), ol = Math.hypot(o2[0], o2[1]) || 1, ox = o2[0] / ol * sg, oy = o2[1] / ol * sg, off = W * .2;
      const segN = []; for (let i = 0; i < Q.length - 1; i++) { let nx = -(Q[i + 1][1] - Q[i][1]), ny = Q[i + 1][0] - Q[i][0]; const l = Math.hypot(nx, ny);
        if (l < .01) { nx = ox; ny = oy; } else { nx /= l; ny /= l; if (nx * ox + ny * oy < 0) { nx = -nx; ny = -ny; } } segN.push([nx, ny]); }
      const B2 = Q.map((q, i) => { const a = segN[Math.max(0, i - 1)], b = segN[Math.min(segN.length - 1, i)]; let nx = a[0] + b[0], ny = a[1] + b[1]; const l = Math.hypot(nx, ny) || 1;
        return [q[0] + nx / l * off, q[1] + ny / l * off]; });
      s += `<path d="${spath(B2)}" ${sty(W * .46, cLit)}/>`;
    }
    return s;
  }
  const P_ = p => P(p[0], p[1], p[2]);
  const disc2 = (c, r, col, inkw) => { const q = P_(c); return `<circle cx="${fx(q[0])}" cy="${fx(q[1])}" r="${(r * CAM_K).toFixed(2)}" fill="${col}"${inkw ? ` stroke="${INK}" stroke-width="${inkw}"` : ''}/>`; };
  // the visible part of a spherical cap {p : (p - c)·n >= d} on the sphere (c, r), as a screen path ('' when hidden)
  function capPath(c, r, n, d, N = 26) {
    n = n3(n); const V = CAM_V, rc = Math.sqrt(Math.max(0, r * r - d * d)), cc = add(c, mul(n, d)), [e1, e2] = basisOf(n), [g1, g2] = basisOf(V);
    const cut = [], sil = [];
    for (let i = 0; i < N; i++) { const t = i / N * 2 * Math.PI, p = add(cc, add(mul(e1, rc * Math.cos(t)), mul(e2, rc * Math.sin(t)))); cut.push({ p, k: dot(sub(p, c), V) >= 0 }); }
    for (let i = 0; i < 36; i++) { const t = i / 36 * 2 * Math.PI, p = add(c, add(mul(g1, r * Math.cos(t)), mul(g2, r * Math.sin(t)))); sil.push({ p, k: dot(sub(p, c), n) >= d }); }
    const nv = cut.filter(e => e.k).length, ni = sil.filter(e => e.k).length;
    const pth = L => sp(L.map(p => P_(p)));
    if (nv === N) return dot(n, V) > 0 ? pth(cut.map(e => e.p)) : pth(sil.map(e => e.p)) + pth(cut.map(e => e.p).reverse());
    if (nv === 0) return ni === 36 ? pth(sil.map(e => e.p)) : '';
    const run = L => { const n2 = L.length; let s = 0; for (let i = 0; i < n2; i++) if (L[i].k && !L[(i - 1 + n2) % n2].k) { s = i; break; }
      const o = []; for (let j = 0; j < n2 && L[(s + j) % n2].k; j++) o.push(L[(s + j) % n2].p); return o; };
    const A = run(cut); let Bs = run(sil);
    if (!Bs.length) return pth(A);
    const e = P_(A[A.length - 1]), d0 = P_(Bs[0]), d1 = P_(Bs[Bs.length - 1]);
    if (Math.hypot(e[0] - d0[0], e[1] - d0[1]) > Math.hypot(e[0] - d1[0], e[1] - d1[1])) Bs = Bs.reverse();
    return pth(A.concat(Bs));
  }
  function sphere(c, r, m, inkw = 1.3) {
    const Lw = lightW(), q = P_(c), R = (r * CAM_K).toFixed(2);
    let s = `<circle cx="${fx(q[0])}" cy="${fx(q[1])}" r="${R}" fill="${m.d}"/>`;
    const a = capPath(c, r, Lw, r * .05), b = capPath(c, r, Lw, r * .55);
    if (a) s += `<path d="${a}" fill="${m.m}" fill-rule="evenodd"/>`;
    if (b) s += `<path d="${b}" fill="${m.l}" fill-rule="evenodd"/>`;
    return s + `<circle cx="${fx(q[0])}" cy="${fx(q[1])}" r="${R}" fill="none" stroke="${INK}" stroke-width="${inkw}"/>`;
  }
  const capShape = (c, r, n, d, col, inkw = .8) => { const p = capPath(c, r, n, d); return p ? `<path d="${p}" fill="${col}" fill-rule="evenodd"${inkw ? ` stroke="${INK}" stroke-width="${inkw}" stroke-linejoin="round"` : ''}/>` : ''; };
  // rings around an axis: each {c, a (axis), s (side unit), rs, rf}
  function rings(R, n = 14) {
    return R.map(g => { const s = n3(sub(g.s, mul(g.a, dot(g.s, g.a)))), f = n3(cross(s, g.a));
      return Array.from({ length: n }, (_, i) => { const t = i / n * 2 * Math.PI; return add(g.c, add(mul(s, g.rs * Math.cos(t)), mul(f, g.rf * Math.sin(t)))); }); });
  }
  // a body of rings, shaded in bands per column and merged per tone
  // out (optional) collects the strips' outline, to ink only what is drawn
  function bandBody(RR, m, from = 0, to = RR.length - 1, out) {
    const n = RR[0].length, cen = avg(RR.slice(from, to + 1).map(r => avg(r))), col = [];
    for (let i = 0; i < n; i++) { let nn = [0, 0, 0];
      for (let k = from; k < to; k++) { const a0 = RR[k][i], a1 = RR[k][(i + 1) % n], b0 = RR[k + 1][i];
        let nr = n3(cross(sub(a1, a0), sub(b0, a0))); if (dot(nr, sub(avg([a0, a1, b0]), cen)) < 0) nr = mul(nr, -1); nn = add(nn, nr); }
      nn = n3(nn); col.push(vis(nn) ? toneI(nn, m) : null); }
    let st = col.indexOf(null); if (st < 0) st = 0;
    let s = '';
    for (let j = 0; j < n;) {
      const i0 = (st + j) % n, c = col[i0]; if (!c) { j++; continue; }
      let L = 1; while (j + L < n && col[(st + j + L) % n] === c) L++;
      const pts = [];
      for (let t = 0; t <= L; t++) pts.push(RR[from][(i0 + t) % n]);
      for (let k = from + 1; k <= to; k++) pts.push(RR[k][(i0 + L) % n]);
      for (let t = L; t >= 0; t--) pts.push(RR[to][(i0 + t) % n]);
      for (let k = to - 1; k > from; k--) pts.push(RR[k][i0]);
      const d = pd(pts); s += face(d, c); if (out) out.d += d; j += L;
    }
    return s;
  }
  const hullOf = pts => sp(hull(pts.map(p => P_(p))));
  const ringsW = (R, n) => rings(R, n).map(rg => rg.map(Wp));
  // a closed ring outline, only the half facing the viewer (a hem, a cuff, a collar)
  function nearArc(ring, w, col) {
    const c = avg(ring), n = ring.length, V = CAM_V; let s = -1;
    const k = ring.map(p => dot(sub(p, c), V) >= -.05);
    for (let i = 0; i < n; i++) if (k[i] && !k[(i - 1 + n) % n]) { s = i; break; }
    const o = []; if (s < 0) { if (!k[0]) return ''; for (let i = 0; i <= n; i++) o.push(ring[i % n]); }
    else for (let j = 0; j < n && k[(s + j) % n]; j++) o.push(ring[(s + j) % n]);
    if (o.length < 2) return '';
    return `<path d="${spath(o.map(P_))}" fill="none" stroke="${col || INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  /* ---------- one figure ---------- */
  let X0 = 101, Y0 = 42, Z0 = 3.9;
  const Wp = p => [X0 - p[0], Y0 + p[1], Z0 + p[2]];      // the child's local frame -> the mat (faces -x)
  const Dd = n => [-n[0], n[1], n[2]];

  // a hand: palm and fingers in the plane (d, s) with the palm toward n, and the thumb on the inner side
  /* a hand for the close-ups: five fingers (two joints each), the knuckle line and the nails on the back, the thumb on
     its own, the palm lighter with its crease. Shapes: flat (fingers together), spread (over a kneecap), point (the
     index finger out, the others closed), clasp (three fingers along the other forearm, thumb and little finger hooked
     round the wrist). Parts sort by depth, so a curled finger goes behind the palm. */
  function handDetail(sd, J, skin) {
    const W0 = J['wr' + sd], H = J['hand' + sd], d = H.d, n = H.n, s = n3(cross(d, n)), th = sd === 'R' ? s : mul(s, -1), back = mul(n, -1);
    const V = CAM_V, parts = [], put2 = (p, svg, b) => parts.push({ z: dot(Wp(p), V) + (b || 0), svg });
    const L = (u, v, o) => add(add(add(W0, mul(d, u)), mul(th, v)), mul(n, o || 0));   // v toward the thumb
    const palmM = matOf(mix(skin.l, '#ffffff', .2)), seeBack = vis(Dd(back));
    const nailC = mix(skin.l, '#ffffff', .45);
    function finger(base, segs, w, nail) {
      const pts = [base]; let p = base, last = d;
      segs.forEach(g => { last = n3(g[0]); p = add(p, mul(last, g[1])); pts.push(p); });
      let o = tube(pts.map(Wp), w, skin, true, .7);
      if (nail) { const nn = n3(sub(back, mul(last, dot(back, last)))); if (vis(Dd(nn))) o += disc2(Wp(add(add(p, mul(last, -.75)), mul(nn, w * .32))), w * .3, nailC, .35); }
      put2(lerp3(base, p, .5), o, 0);
    }
    // the four fingers: [side offset toward the thumb, length, width]
    const F = [[2.05, 4.3, 1.5], [.7, 4.9, 1.55], [-.65, 4.5, 1.45], [-1.95, 3.5, 1.25]];
    const kind = H.shape, kn = u => L(5.3, u, 0);
    F.forEach((f, i) => {
      const b = kn(f[0]);
      let segs;
      // spread: the fingers fan out, the index toward the thumb (a rotation about n turns d toward -s)
      if (kind === 'spread') { const dir = rot(d, n, -[20, 7, -7, -20][i] * D2R * (th === s ? 1 : -1)); segs = [[dir, f[1] * .55], [add(dir, mul(n, .55)), f[1] * .45]]; }
      else if (kind === 'point') segs = i === 0 ? [[H.idx || d, f[1] * .55], [H.idx || d, f[1] * .45]] : [[add(mul(d, .5), mul(n, .85)), 1.6], [add(mul(d, -.7), mul(n, .35)), 1.2]];
      else if (kind === 'clasp') segs = i === 3 ? [[d, 2.2], [add(mul(n, 1), mul(d, .2)), 2.4]] : [[add(d, mul(th, (1 - i) * .04)), f[1] * .55], [d, f[1] * .45]];
      else segs = [[d, f[1] * .55], [d, f[1] * .45]];
      finger(b, segs, f[2], true);
    });
    // the thumb
    const tb = L(1.1, 2.3, -.2);
    const tsegs = kind === 'clasp' ? [[add(mul(d, .8), mul(th, .3)), 3.2], [add(mul(n, .9), mul(d, .3)), 2.6]]
      : kind === 'point' ? [[add(mul(d, .6), mul(th, .45)), 2.2], [add(mul(d, .4), mul(n, .8)), 1.6]]
      : [[add(mul(d, .5), mul(th, .75)), 2.6], [add(mul(d, .9), mul(th, .25)), 2.4]];
    finger(tb, tsegs, 1.75, true);
    // the palm (lighter, with its crease) or the back of the hand (with the knuckle line)
    const palmPts = [[0, -2.5], [5.4, -2.9], [5.8, 0], [5.4, 2.9], [0, 2.5], [-.6, 0]].map(q => Wp(L(q[0], q[1], 0)));
    let pv = shape(palmPts, seeBack ? toneI(Dd(back), skin) : toneI(Dd(n), palmM), .85);
    if (seeBack) { const k = [-2.6, -1.3, 0, 1.3, 2.6].map(v => P_(Wp(L(5.1, v, -.7)))); pv += `<path d="${spath(k)}" fill="none" stroke="${INK}" stroke-width=".5" stroke-linecap="round" opacity=".75"/>`;
      [-1.95, -.65, .7, 2.05].forEach(v => { pv += disc2(Wp(L(5.2, v, -.8)), .42, skin.m, .3); }); }
    else { const c = [[4.8, 1.8], [3.2, .8], [1.4, .6], [.4, 1]].map(q => P_(Wp(L(q[0], q[1], .1)))); pv += `<path d="${spath(c)}" fill="none" stroke="${INK}" stroke-width=".45" stroke-linecap="round" opacity=".6"/>`;
      const c2 = [[4.4, -2.6], [4.9, 0], [4.6, 2.2]].map(q => P_(Wp(L(q[0], q[1], .1)))); pv += `<path d="${spath(c2)}" fill="none" stroke="${INK}" stroke-width=".4" stroke-linecap="round" opacity=".45"/>`; }
    put2(L(2.8, 0, 0), pv, 0);
    parts.sort((a, b) => a.z - b.z);
    return parts.map(p => p.svg).join('');
  }
  function handSVG(sd, J, skin) {
    const W0 = J['wr' + sd], H = J['hand' + sd], d = H.d, n = H.n, s = n3(cross(d, n)), th = sd === 'R' ? s : mul(s, -1);
    const palmCol = mix(SKIN, '#ffffff', .2);
    const facesV = vis(Dd(n)), col = facesV ? toneI(Dd(n), matOf(palmCol)) : toneI(Dd(mul(n, -1)), skin);
    const at = (u, v, o) => Wp(add(add(add(W0, mul(d, u)), mul(s, v)), mul(n, o || 0)));
    let out = '';
    const thumb = () => tube([Wp(add(add(W0, mul(d, 1.6)), mul(th, 2.2))), Wp(add(add(add(W0, mul(d, 4.6)), mul(th, 4.1)), mul(n, .7)))], 2.3, skin, false, .8);
    const thumbFirst = !facesV;                                         // the thumb is on the palm side: behind when we see the back
    if (H.shape === 'spread') {
      // the palm on the kneecap, the four fingers spread over it, the thumb at the inner side
      const palm = [[0, -2.4], [5.2, -2.7], [5.6, 0], [5.2, 2.7], [0, 2.4], [-.6, 0]].map(p => at(p[0], p[1], 0));
      let fing = '';
      [[-2.15, -20, 4.1], [-.72, -7, 4.8], [.72, 7, 4.6], [2.15, 20, 3.7]].forEach(f => {
        const dir = n3(add(rot(d, n, f[1] * D2R), mul(n, .3))), b = add(add(W0, mul(d, 5.1)), mul(s, f[0]));
        fing += tube([Wp(b), Wp(add(b, mul(dir, f[2])))], 1.9, skin, false, .7); });
      return (thumbFirst ? thumb() : '') + shape(palm, col, .8) + fing + (thumbFirst ? '' : thumb());
    }
    if (H.shape === 'grip' || H.shape === 'point') {
      // palm, then curled fingers (toward the palm side) or a fist with the index finger out
      const palm = [[0, -2.4], [5.2, -2.7], [5.6, 0], [5.2, 2.7], [0, 2.4], [-.6, 0]].map(p => at(p[0], p[1], 0));
      let fing = '';
      if (H.shape === 'grip') {
        // the fingers wrap forward over the kneecap: one bent mitten with the lines between the fingers
        const c = n3(add(mul(d, .6), mul(n, .8))), k0 = add(W0, mul(d, 5.2));
        const fp = (v, L) => add(add(k0, mul(s, v)), mul(c, L));
        const fpts = [[-2.7, 0], [-2.9, 3.4], [-1.6, 4.6], [0, 4.9], [1.6, 4.6], [2.9, 3.4], [2.7, 0]].map(q => Wp(fp(q[0], q[1])));
        const fcol = vis(Dd(cross(s, c))) === vis(Dd(n)) ? col : toneI(Dd(mul(n, -1)), skin);
        let ld = ''; [-1.35, 0, 1.35].forEach(v => { const a = P_(Wp(fp(v, .7))), b = P_(Wp(fp(v, 4.3))); ld += 'M' + fx(a[0]) + ' ' + fx(a[1]) + 'L' + fx(b[0]) + ' ' + fx(b[1]); });
        fing += shape(fpts, toneI(Dd(n3(cross(c, s))), skin), .8) + `<path d="${ld}" fill="none" stroke="${INK}" stroke-width=".45" stroke-linecap="round" opacity=".7"/>`;
      } else {
        // three fingers curled into the palm, the index straight out toward the qibla
        const k = add(add(W0, mul(d, 5.0)), mul(th, -.5));
        fing += tube([Wp(add(k, mul(n, .3))), Wp(add(add(k, mul(n, 2.4)), mul(d, .6))), Wp(add(add(k, mul(n, 2.9)), mul(d, -1.6)))], 4.2, skin, false, .8);
        const ib = add(add(W0, mul(d, 4.8)), mul(th, 1.9)), ix = H.idx ? n3(H.idx) : d;
        fing += tube([Wp(ib), Wp(add(ib, mul(ix, 6.2)))], 1.8, skin, false, .8);
      }
      out += (thumbFirst ? thumb() : '') + shape(palm, col, .8) + fing + (thumbFirst ? '' : thumb());
      return out;
    }
    // flat: palm and fingers as one shape, with the lines between the fingers
    const outline = [[0, -2.3], [5.4, -2.75], [8.9, -2.55], [10.3, -1.6], [10.6, 0], [10.3, 1.6], [8.9, 2.55], [5.4, 2.75], [0, 2.3], [-.7, 0]].map(p => at(p[0], p[1], 0));
    let lines = '';
    [-1.3, 0, 1.3].forEach(v => { const a = P_(at(5.9, v, 0)), b = P_(at(9.9, v * 1.05, 0)); lines += 'M' + fx(a[0]) + ' ' + fx(a[1]) + 'L' + fx(b[0]) + ' ' + fx(b[1]); });
    out += (thumbFirst ? thumb() : '') + shape(outline, col, .85) + `<path d="${lines}" fill="none" stroke="${INK}" stroke-width=".45" stroke-linecap="round" opacity=".7"/>` + (thumbFirst ? '' : thumb());
    return out;
  }
  // a bare foot: heel to the ball of the foot, then the toes (which may bend), with the toe lines at the tip
  function footSVG(sd, J, skin) {
    const A = J['ankle' + sd], F = J['foot' + sd], f = F.f, n = F.n, t = F.t;
    const heel = add(add(A, mul(n, 3.6)), mul(f, -2.2)), ball = add(heel, mul(f, 10)), toe = add(ball, mul(t, 4.6));
    let nt = n; const ax = cross(f, t); if (len3(ax) > .05) nt = n3(rot(n, n3(ax), Math.acos(clamp(dot(f, t), -1, 1))));
    const hc = add(heel, mul(n, -2.8)), bc = add(ball, mul(n, -2.4)), tc = add(toe, mul(nt, -1.5)), bt = add(ball, mul(nt, -1.9));
    let s = tube([Wp(add(A, mul(f, -1.2))), Wp(hc)], 4.8, skin, false, .9) + tube([Wp(hc), Wp(bc)], 5.3, skin) + tube([Wp(bt), Wp(tc)], 4.3, skin, false, .9);
    // the sole (lighter, like the palms) with the toe pads, when it faces us: an upright foot reads as a foot
    if (vis(Dd(n))) {
      const sv0 = n3(cross(f, n)), sole = [[-.6, 0], [0, 2.1], [4.5, 2.5], [9.6, 2.9], [10.4, 0], [9.6, -2.9], [4.5, -2.4], [0, -2.1]].map(q => Wp(add(add(add(heel, mul(f, q[0])), mul(sv0, q[1])), mul(n, .15))));
      s += shape(sole, toneI(Dd(n), matOf(mix(SKIN, '#ffffff', .22))), .6);
      const svt = n3(cross(t, nt));
      [-2.1, -.75, .55, 1.75].forEach((v, i) => { s += disc2(Wp(add(add(add(toe, mul(t, -1.1 - (i === 0 ? 0 : .3 * i))), mul(svt, v)), mul(nt, .2))), [1.25, 1, .9, .8][i], mix(SKIN, '#ffffff', .22), .5); });
    }
    // the toes: little lines across the tip
    const sv = n3(cross(t, nt)); let d = '';
    [-1.6, -.5, .6, 1.6].forEach(v => { const a = P_(Wp(add(add(toe, mul(nt, -1.6)), mul(sv, v)))), b = P_(Wp(add(add(toe, mul(nt, -1.6 + .9)), add(mul(sv, v), mul(t, -1.6))))); d += 'M' + fx(a[0]) + ' ' + fx(a[1]) + 'L' + fx(b[0]) + ' ' + fx(b[1]); });
    s += `<path d="${d}" fill="none" stroke="${INK}" stroke-width=".45" stroke-linecap="round" opacity=".75"/>`;
    return s;
  }

  function draw(J, opts) {
    opts = opts || {};
    const look = LOOKS[opts.look] || LOOKS[SALAHKID.look] || LOOKS.cap;
    const skin = matOf(SKIN), top = matOf(look.top), legs = matOf(look.legs), V = CAM_V;
    const items = [], legsOnly = opts.only === 'legs';
    const put = (pt, svg, bias = 0) => { if (svg) items.push({ z: dot(Wp(pt), V) + bias, svg }); };
    const A = J.a, Fw = J.f, Sv = [0, 1, 0];

    // the shadow on the mat
    const sp3 = [J.hip, J.neck, J.head, J.kneeL, J.kneeR, J.ankleL, J.ankleR, J.wrL, J.wrR, J.elbL, J.elbR,
      add(J.ankleL, mul(J.footL.f, 10)), add(J.ankleR, mul(J.footR.f, 10)), add(J.hipL, [-4, 2, -4]), add(J.hipR, [-4, -2, -4])].map(Wp);
    // a short shadow (the room light is high), so it stays on the mat under the child
    let shadow = castShadow(sp3.map(p => [p[0], p[1], Z0 + (p[2] - Z0) * .35]), Z0 + .05).replace('/>', ' opacity=".18"/>');

    // legs: the thighs go first (the kurta covers them); shins, cuffs and feet sort by depth
    for (const sd of ['L', 'R']) {
      const hp = J['hip' + sd], kn = J['knee' + sd], an = J['ankle' + sd], cuff = lerp3(kn, an, .84);
      if (!legsOnly) put(lerp3(hp, kn, .5), tube([Wp(hp), Wp(kn)], B.wThigh, legs), -400);
      const shinS = tube([Wp(legsOnly ? lerp3(kn, an, .45) : kn), Wp(cuff)], B.wShin, legs) + tube([Wp(lerp3(kn, an, .8)), Wp(lerp3(kn, an, .86))], B.wShin + .6, legs, false, .8);
      const ankleS = tube([Wp(lerp3(kn, an, .86)), Wp(an)], 5.2, skin, false, .9);
      const foot = footSVG(sd, J, skin);
      // the foot before the shin when it is farther away than the ankle (an upright foot behind its shin)
      const toeP = add(an, mul(J['foot' + sd].f, 8)), footFirst = dot(Wp(toeP), V) < dot(Wp(an), V);
      // a shin on the floor (sitting, sujood) lies under the thigh and the cloth: it goes before them
      put(lerp3(kn, an, .5), footFirst ? foot + ankleS + shinS : ankleS + shinS + foot, (sd === 'L' ? .01 : 0) + (kn[2] < 12 ? -60 : 0));
    }

    // the kurta / tunic: from the waist over the hips to the hem around the thighs (follows the bend at the hip)
    const hipC = J.hip, kc = lerp3(J.kneeL, J.kneeR, .5), thD = n3(sub(kc, hipC)), spread = len3(sub(J.kneeL, J.kneeR)) / 2;
    const bis = n3(sub(A, thD));
    const KR = [
      { c: add(add(hipC, mul(A, B.torso * .16)), mul(Fw, .4)), a: A, s: Sv, rs: TORSO[1][1] + .5, rf: TORSO[1][2] + .5 },
      { c: add(add(hipC, mul(bis, -1.2)), mul(Fw, -.6)), a: bis, s: Sv, rs: B.hipW + B.wThigh * .5 + 1.5, rf: B.wThigh * .5 + 2.6 },
      { c: add(hipC, mul(thD, B.thigh * look.hem)), a: mul(thD, -1), s: Sv, rs: Math.max(B.hipW, spread) + B.wThigh * .5 + 2.6, rf: B.wThigh * .5 + 2.9 }];
    const KRR = ringsW(KR);
    // one garment: both outlines first (twice as thick), then both fills over them, so only the outer edge of the
    // whole kurta stays inked and there is no line where the chest meets the skirt
    const ko = { d: '' }, kurtaFill = bandBody(KRR, top, 0, KRR.length - 1, ko), kurtaInk = ink(ko.d, 2.6);
    const kurta = nearArc(KRR[2], .9) + nearArc(KRR[2].map(p => add(p, mul(Dd(thD), -1.6))), .55, top.d);

    // the torso (rings along the spine)
    const T = TORSO.map(([t, rs, rf, off]) => ({ c: add(add(hipC, mul(A, B.torso * t)), mul(Fw, off)), a: A, s: Sv, rs, rf }));
    const TR = ringsW(T);
    const to = { d: '' };
    let torso = bandBody(TR, top, 0, TR.length - 1, to);
    const torsoInk = ink(to.d, 2.8);
    if (vis(Dd(A))) torso += face(pd(TR[TR.length - 1]), toneI(Dd(A), top));
    // the collar, the placket with three buttons, a fold at the waist
    const collar = ringsW([{ c: add(J.neck, mul(A, -1.2)), a: A, s: Sv, rs: 3.6, rf: 3.4 }], 12)[0];
    torso += nearArc(collar, 1.6, top.d) + nearArc(collar, .6);
    if (vis(Dd(Fw))) {
      const fpt = t => { const i = TORSO.findIndex(r => r[0] >= t), r = TORSO[Math.max(0, i)]; return add(add(hipC, mul(A, B.torso * t)), mul(Fw, r[2] + r[3] + .15)); };
      const pl = [.93, .82, .7, .6].map(fpt);
      torso += line(pl.map(Wp), .7);
      [.88, .78, .68].forEach(t => { torso += disc2(Wp(fpt(t)), .55, top.d, .4); });
    }
    torso += nearArc(ringsW([{ c: add(add(hipC, mul(A, B.torso * .3)), mul(Fw, .5)), a: A, s: Sv, rs: TORSO[1][1] + .2, rf: TORSO[1][2] + .7 }], 14)[0], .5, top.d);
    // kurta and torso are one cloth: the kurta first, so the chest overlaps it at the waist
    // a close-up of the feet leaves out everything above the legs (opts.only === 'legs'), like a cutaway
    if (!legsOnly) put(add(hipC, mul(A, B.torso * .45)), torsoInk + kurtaInk + kurtaFill + torso + kurta);

    // arms: upper sleeve, forearm sleeve with a cuff, the wrist and the hand
    for (const sd of (legsOnly ? [] : ['L', 'R'])) {
      const sh = J['sh' + sd], el = J['elb' + sd], wr = J['wr' + sd], cf = lerp3(el, wr, .86);
      // in a close-up the left hand is a shade darker, so the two hands stay apart where they overlap
      const hs = opts.detail && sd === 'L' ? matOf(mix(SKIN, '#000000', .1)) : skin;
      put(lerp3(sh, el, .55), tube([Wp(add(sh, mul(A, 1.2))), Wp(sh), Wp(el)], B.wUarm, top), 1.2);
      const fore = tube([Wp(el), Wp(cf)], B.wFarm, top) + tube([Wp(lerp3(el, wr, .8)), Wp(lerp3(el, wr, .9))], B.wFarm + 1.1, top, false, .85) +
        tube([Wp(lerp3(el, wr, .9)), Wp(wr)], 3.8, hs, false, .8) + (opts.detail ? handDetail(sd, J, hs) : handSVG(sd, J, hs));
      // the forearm and hand sort at the wrist (hands in front of the tummy, beside the head, on the mat)
      put(lerp3(el, wr, .8), fore, 3);
    }

    // the head
    if (!legsOnly) {
      const r = B.head, head = J.head, HD = J.hd, HF = J.hf, HS = J.hs;
      let s = '';
      const neck = tube([Wp(add(J.neck, mul(A, -2))), Wp(add(J.neck, mul(HD, B.neck + 1.2)))], 5.4, skin, false, 1);
      if (look.scarf) {
        const sc = matOf(look.scarf), rr = r * 1.1;
        const D = [{ c: add(head, mul(HD, -r * .2)), a: HD, s: HS, rs: rr * .97, rf: rr * .97 },
                   { c: add(add(J.neck, mul(A, -B.torso * .2)), mul(Fw, .4)), a: A, s: Sv, rs: B.shW + 2.6, rf: TORSO[3][2] + 2.4 }];
        const DR = ringsW(D, 16);
        const so = { d: '' }, drape = bandBody(DR, sc, 0, 1, so);
        put(add(J.neck, mul(A, -3)), ink(so.d, 2.6) + drape + nearArc(DR[1], .9), 1.4);
        s += sphere(Wp(head), rr, sc, 1.4);
        // the face opening: plain skin, no features
        s += capShape(Wp(head), rr * 1.004, Dd(add(HF, mul(HD, -.14))), rr * .62, skin.l, .8);
      } else {
        s += neck + sphere(Wp(head), r, skin, 1.4);
        // short hair at the back and the sides, the ears, and the kufi
        s += capShape(Wp(head), r * 1.008, Dd(n3(add(mul(HF, -.9), mul(HD, .45)))), r * .02, look.hair, .7);
        for (const k of [1, -1]) { const e = add(add(head, mul(HS, k * r * .97)), add(mul(HF, -r * .06), mul(HD, -r * .12)));
          if (dot(Dd(mul(HS, k)), V) > -.15) s += disc2(Wp(e), 2.1, skin.m, .7); }
        s += capShape(Wp(head), r * 1.05, Dd(n3(add(HD, mul(HF, -.22)))), r * .4, look.hat, 1);
        s += nearArc(ringsW([{ c: add(head, mul(n3(add(HD, mul(HF, -.22))), r * .4)), a: n3(add(HD, mul(HF, -.22))), s: HS, rs: r * .92, rf: r * .92 }], 18)[0], .45, '#c9c2b2');
      }
      put(head, s, 2.5);
    }

    items.sort((a, b) => a.z - b.z);
    return shadow + items.map(i => i.svg).join('');
  }

  // body points (world) for the bounding box and the arrows
  const keyPts = J => [J.head, add(J.head, mul(J.hd, B.head * 1.1)), J.neck, J.hip, J.kneeL, J.kneeR, J.ankleL, J.ankleR, J.wrL, J.wrR, J.elbL, J.elbR,
    add(J.wrL, mul(J.handL.d, 10)), add(J.wrR, mul(J.handR.d, 10)), add(J.ankleL, mul(J.footL.f, 13)), add(J.ankleR, mul(J.footR.f, 13))].map(Wp);

  /* ---------- where the body touches the mat ---------- */
  function contacts(name) {
    const J = pose(name), out = [], ang = d => Math.atan2(Dd(d)[1], Dd(d)[0]);
    const foot = sd => { const F = J['foot' + sd], heel = add(add(J['ankle' + sd], mul(F.n, 3.6)), mul(F.f, -2.2)); return { heel, ball: add(heel, mul(F.f, 10)) }; };
    if (POSES[name] && POSES[name].sujud) {
      const h = J.head, lo = add(h, mul(n3(add(J.hf, J.hd)), B.head));
      out.push({ kind: 'head', p: [lo[0], lo[1]], a: ang(J.f) });
      for (const sd of ['L', 'R']) { const H = J['hand' + sd], pc = add(J['wr' + sd], mul(H.d, 5)); out.push({ kind: 'hand', p: [pc[0], pc[1]], a: ang(H.d), side: sd === 'L' ? 1 : -1 }); }
      for (const sd of ['L', 'R']) { const k = J['knee' + sd]; out.push({ kind: 'knee', p: [k[0] + 1.5, k[1]] }); }
      for (const sd of ['L', 'R']) { const b = foot(sd).ball, t = J['foot' + sd].t; out.push({ kind: 'toes', p: [b[0] + t[0] * 3, b[1] + t[1] * 3], a: ang(t) }); }
    } else if (J.hip[2] < 20) {
      for (const sd of ['L', 'R']) { const k = J['knee' + sd]; out.push({ kind: 'knee', p: [k[0] + 1.5, k[1]] }); }
      const L = foot('L'), c = lerp3(L.heel, L.ball, .5); out.push({ kind: 'foot', p: [c[0], c[1]], a: ang(J.footL.f), flip: true });
      const b = foot('R').ball, t = J.footR.t; out.push({ kind: 'toes', p: [b[0] + t[0] * 3, b[1] + t[1] * 3], a: ang(t) });
    } else {
      for (const sd of ['L', 'R']) { const F = foot(sd), c = lerp3(F.heel, F.ball, .55); out.push({ kind: 'foot', p: [c[0], c[1]], a: ang(J['foot' + sd].f), toes: true }); }
    }
    return out.map(o => { const w = Wp([o.p[0], o.p[1], 0]); return Object.assign(o, { x: w[0], y: w[1] }); });
  }

  /* ---------- the motion between two positions, for the arrows ---------- */
  function track(a, b) {
    if (!a || !b || a === b || !POSES[a] || !POSES[b]) return { kind: '', paths: [] };
    const A = pose(a), Bq = pose(b);
    const N = 14, samp = f => { const o = []; for (let i = 0; i <= N; i++) o.push(f(blend(a, b, i / N))); return o; };
    const dy = (Bq.q.yaw || 0) - (A.q.yaw || 0), dh0 = len3(sub(Bq.head, A.head));
    if (Math.abs(dy) > 30 && dh0 < 14) {
      // the head turns: an arc over the head (clear of the face), from where it looked to where it looks now
      const h = add(Bq.head, mul(Bq.hd, B.head * 1.75)), R = B.head * 1.15, o = [];
      for (let i = 0; i <= N; i++) { const yw = ((A.q.yaw || 0) + dy * i / N) * D2R, hl = (Bq.q.lean + (Bq.q.tilt || 0)) * D2R;
        const fwd = [Math.cos(hl) * Math.cos(yw), Math.sin(yw), -Math.sin(hl) * Math.cos(yw)]; o.push(Wp(add(h, mul(n3([fwd[0], fwd[1], 0]), R)))); }
      return { kind: 'turn', paths: [o] };
    }
    const dh = len3(sub(Bq.head, A.head)), dw = Math.max(len3(sub(Bq.wrL, A.wrL)), len3(sub(Bq.wrR, A.wrR)));
    if (dh > 14) {
      // the head's real path, pushed out from the body so the arrow runs beside it
      const p = samp(J => J.head), mid = A.hip, out = [];
      // beside the body and in front of the face (never across it)
      p.forEach((q, i) => { const away = n3(sub(q, lerp3(A.hip, Bq.hip, i / N))); out.push(Wp(add(add(q, mul(away, B.head * 1.1)), [B.head * 1.6, 0, 0]))); });
      return { kind: 'head', paths: [out] };
    }
    if (dw > 10) {
      // the right hand (the one nearer the viewer), beside it, away from the body
      const p = samp(J => add(J.wrR, mul(J.handR.d, 4)));
      return { kind: 'hands', paths: [p.map(q => Wp(add(q, [17, -8, 0])))] };
    }
    return { kind: '', paths: [] };
  }

  const SALAHKID = window.SALAHKID = {
    look: 'cap', names: NAMES, B, POSES,
    place: (x, y, z) => { X0 = x; Y0 = y; Z0 = z; },
    svg: (name, opts) => draw(pose(name), opts),
    frame: (a, b, t, opts) => draw(blend(a, b, t), opts),
    joints: (a, b, t) => blend(a, b, t == null ? 1 : t),
    contacts, track,
    // the madhab and the boy/girl variants: { madhab: 'hanafi'|'shafi', girl: true|false }
    setStyle: o => { STYLE.madhab = o.madhab === 'hanafi' ? 'hanafi' : 'shafi'; STYLE.girl = !!o.girl; applyStyle(); },
    get styleKey() { return STYLE.madhab + (STYLE.girl ? 'g' : 'b'); },
    // a point on the body in the world, for the close-ups and the labels
    at: (name, part) => { const J = pose(name), H = s => J['hand' + s];
      const p = { handR: add(J.wrR, mul(H('R').d, 4.5)), handL: add(J.wrL, mul(H('L').d, 4.5)), head: J.head, kneeR: J.kneeR, kneeL: J.kneeL,
        hands: lerp3(add(J.wrR, mul(H('R').d, 3)), add(J.wrL, mul(H('L').d, 3)), .5),
        footR: add(J.ankleR, mul(J.footR.f, 6)), footL: add(J.ankleL, mul(J.footL.f, 5)), feet: lerp3(add(J.ankleR, mul(J.footR.f, 6)), add(J.ankleL, mul(J.footL.f, 5)), .5),
        back: lerp3(J.hip, J.neck, .5), hip: J.hip,
        tagR: add(add(J.wrR, mul(H('R').d, 2.6)), mul(H('R').n, -1)), tagL: add(add(J.wrL, mul(H('L').d, 2.6)), mul(H('L').n, -1)), lowL: add(add(J.wrL, mul(H('L').d, 4.5)), [0, 0, -2.8]), neck: J.neck, shR: J.shR, shL: J.shL, toesR: add(J.ankleR, add(mul(J.footR.f, 8), mul(J.footR.t, 3))), toesL: add(J.ankleL, add(mul(J.footL.f, 8), mul(J.footL.t, 3))) }[part];
      return p ? Wp(p) : null; },
    via: (a, b) => viaSplit(a, b),
    extent: () => [].concat(...['rise', 'takbir', 'ruku', 'sujud', 'tash', 'qunut'].map(n => keyPts(pose(n)))),
    setSkin: hex => { if (/^#[0-9a-f]{6}$/i.test(hex)) SKIN = hex; },
  };
})();
