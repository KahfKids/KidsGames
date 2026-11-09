/* Helping Home: the family (window.FAMILY). Abu, Ummi, an older sister (about 9) and a toddler brother.
   Faceless, hand-inked figures in the Colorfigures style: real 3D volumes (a banded torso, a skirt or tunic, a headscarf
   drape), limbs as shaded tubes, heads as plain spheres with caps for the kufi, the hair, the beard and the face opening.
   NO eyes, nose, mouth or expression on anyone, ever.

   The figure is posed in 3D (forward kinematics for the spine, 2-bone IK for arms and legs), so it is correct from every
   side and at any facing; the house turns ±26°, the test page all the way round.

   This file also runs the family's day (The Sims model: needs plus smart objects, on the real clock and prayer times),
   the requests they make, what their day leaves behind (mess, dishes), and the hide-and-seek spot.

   Coordinates are the house's (x = depth, back wall at 0; y = width; z = up), one unit a "dollhouse centimetre".
   Sizes match the furniture: Abu 114, Ummi 108, the sister 84, the toddler 58 (the door is 116, the counter 75).

   API (see the report / family-test.html):
     FAMILY.draw(name, pose, at, facing, frame, opts) -> [{ box, at, svg, who, fl }]   byDepth items (one per figure)
     FAMILY.svg(...)                                  -> the same figure as one SVG string
     FAMILY.state(date, ctx)                          -> { abu: {...}, ummi: {...}, sister: {...}, toddler: {...} }
     FAMILY.effects(date, sinceT, ctx)                -> [{ type, what, room, at, who, t }]
     FAMILY.requests(date, ctx, state)                -> at most 2 [{ id, who, icon, job, bubbleAt, until }]
     FAMILY.thank(who)                                -> a hug animation spec
     FAMILY.hideSpot(date, ctx) / FAMILY.found(...)   -> hide and seek
     FAMILY.setNav(graph), FAMILY.setObjects(over), FAMILY.setSkin(hex)
   Stroke widths: the ink parts use the engine's stroke-width="" (scaled by inkScale like the house), the limb tubes use
   style="stroke-width:..." because they are a body width, not a line weight. Pass the output through inkScale(). */
(function () {
  'use strict';
  const D2R = Math.PI/180;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, k) => [a[0]*k, a[1]*k, a[2]*k];
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0])*t, a[1] + (b[1] - a[1])*t, a[2] + (b[2] - a[2])*t];
  const len3 = a => Math.hypot(a[0], a[1], a[2]);
  const n3 = a => { const l = len3(a) || 1; return [a[0]/l, a[1]/l, a[2]/l]; };
  const fx = v => v.toFixed(1);
  const basisOf = n => { const e1 = n3(cross(n, Math.abs(n[2]) < .9 ? [0, 0, 1] : [1, 0, 0])); return [e1, cross(n, e1)]; };

  /* ---------------- the people ----------------
     h: lengths (thigh, shin, ankle height, foot, torso = hip joint to neck base, neck, head radius, upper arm, forearm,
        shoulder half-width, hip half-width). w: tube widths. torso: rings [t along the spine, side radius, front radius,
        forward offset]. Clothes: legs / torso / sleeves colours; dress: long skirt to the ankles; tunic: to mid-thigh. */
  let SKIN = '#c98e62';
  try { const h = JSON.parse(localStorage.getItem('hh.hand') || 'null'); if (h && /^#[0-9a-f]{6}$/i.test(h.skin || '')) SKIN = h.skin; else if (typeof h === 'string' && /^#[0-9a-f]{6}$/i.test(h)) SKIN = h; } catch (e) {}
  const PEOPLE = {
    abu: { label: 'Abu',
      h: { thigh: 26, shin: 25, ankle: 3.5, foot: 10, torso: 35, neck: 4, head: 10.3, uarm: 18.5, farm: 17, shW: 11.5, hipW: 5.6 },
      w: { thigh: 10, shin: 8.4, uarm: 7.2, farm: 6.2, hand: 3.4, shoe: 5.4 },
      torso: [[-.14, 10.2, 7.4, 0], [.25, 10.6, 7.4, .3], [.62, 11.6, 7.8, .6], [.86, 12.6, 7.6, .2], [.985, 9.2, 5.6, 0]],
      col: { top: '#4f86c6', legs: '#4a4f63', shoe: '#3d3935', hair: '#33261c', kufi: '#fbf6ea' }, hat: 'kufi', beard: true, skinK: -.06 },
    ummi: { label: 'Ummi',
      h: { thigh: 24, shin: 23.5, ankle: 3.2, foot: 9, torso: 32, neck: 3.4, head: 10, uarm: 17, farm: 16, shW: 10.2, hipW: 5.4 },
      w: { thigh: 9.6, shin: 7.8, uarm: 6.6, farm: 5.6, hand: 3.1, shoe: 5 },
      torso: [[-.14, 10.6, 7.6, 0], [.3, 9.6, 6.8, .2], [.66, 10.6, 7.6, .7], [.88, 11.2, 7, .2], [.985, 8.4, 5.2, 0]],
      col: { top: '#3f9c92', legs: '#3f9c92', shoe: '#6b4a3a', scarf: '#8a63ad' }, dress: true, scarf: 'khimar', skinK: 0 },
    sister: { label: 'Sister',
      h: { thigh: 18, shin: 17, ankle: 2.6, foot: 7.2, torso: 24.5, neck: 2.8, head: 9.4, uarm: 13, farm: 12, shW: 7.8, hipW: 4.2 },
      w: { thigh: 7.4, shin: 6.2, uarm: 5.4, farm: 4.8, hand: 2.6, shoe: 4.4 },
      torso: [[-.14, 8, 5.8, 0], [.3, 7.4, 5.2, .2], [.7, 8.2, 5.6, .4], [.9, 8.6, 5.4, .1], [.985, 6.4, 4.2, 0]],
      col: { top: '#f2b630', legs: '#3f5d9a', shoe: '#e8574a', scarf: '#ee8fa8' }, tunic: true, scarf: 'hijab', skinK: .04 },
    toddler: { label: 'Toddler',
      h: { thigh: 10.5, shin: 9, ankle: 2.2, foot: 6, torso: 17, neck: 1.2, head: 9.4, uarm: 8.6, farm: 8, shW: 6.6, hipW: 3.6 },
      w: { thigh: 6.8, shin: 5.8, uarm: 4.9, farm: 4.5, hand: 2.4, shoe: 4.2 },
      torso: [[-.16, 7.6, 6.4, 0], [.25, 8.4, 7.4, .9], [.6, 8.2, 7, .7], [.86, 7.8, 6, .2], [.985, 5.6, 4.4, 0]],
      col: { top: '#e8574a', legs: '#5b8fd6', shoe: '#f2c230', hair: '#3a2a1e', bib: '#5b8fd6' }, hair: 'tuft', skinK: .08 },
  };
  // the neighbour from number 2 (an older man with a grey beard and a white kufi): he walks his dog along the street
  // (house/pets.js) and is the neighbour in the street scenes. Not one of the family (NAMES), but drawn the same way.
  PEOPLE.neighbour = { label: 'Neighbour',
    h: { thigh: 25, shin: 24, ankle: 3.5, foot: 10, torso: 34, neck: 3.6, head: 10.2, uarm: 18, farm: 16.5, shW: 11.2, hipW: 5.6 },
    w: { thigh: 10, shin: 8.4, uarm: 7.2, farm: 6.2, hand: 3.4, shoe: 5.4 },
    torso: [[-.14, 10.6, 8, 0], [.25, 11.2, 8.2, .6], [.62, 11.6, 8, .6], [.86, 12, 7.2, 0], [.985, 8.8, 5.4, -.4]],
    col: { top: '#8a6bb0', legs: '#5a5560', shoe: '#3d3935', hair: '#e2ddd3', kufi: '#fbf6ea' }, hat: 'kufi', beard: true, skinK: .06 };
  const NAMES = ['abu', 'ummi', 'sister', 'toddler'];
  for (const k of Object.keys(PEOPLE)){ const p = PEOPLE[k], h = p.h; p.legL = h.thigh + h.shin; p.hipZ = h.ankle + p.legL*.995;
    p.H = p.hipZ + h.torso + h.neck + 2*h.head; }
  const skinOf = p => p.skinK > 0 ? mix(SKIN, '#ffffff', p.skinK) : p.skinK < 0 ? mix(SKIN, '#000000', -p.skinK) : SKIN;

  /* ---------------- poses ----------------
     A pose returns, in the person's own frame (u = forward, v = left, w = up from the floor under them):
       hip (pelvis centre), lean (spine pitch, deg: 0 upright, 90 bent flat), tilt (head pitch on top of the lean), yaw (head turn),
       ankle: {L, R} targets, knee: {L, R} (optional, else IK with a forward bend), foot: {L, R} directions,
       wrist: {L, R} targets (functions of the joints J when they depend on the spine), elbow hints, props. */
  const POSES = {};
  const SIDE = { L: 1, R: -1 };
  // shoulder height and position for a given hip, lean (deg)
  const spine = (B, hip, lean) => { const l = lean*D2R, a = [Math.sin(l), 0, Math.cos(l)], neck = add(hip, mul(a, B.h.torso));
    const sh = add(neck, mul(a, -B.h.torso*.1)); return { a, neck, sh, f: [Math.cos(l), 0, -Math.sin(l)] }; };
  const armDown = (B, J, sd, out = 1.2, fwd = .6) => add(J.sh, [fwd, sd*(B.h.shW + out), -(B.h.uarm + B.h.farm)*.97]);
  const standLegs = (B, wide = 0) => ({ L: [.4, B.h.hipW + .6 + wide, B.h.ankle], R: [.4, -B.h.hipW - .6 - wide, B.h.ankle] });
  const tod = B => B === PEOPLE.toddler;

  POSES.stand = (B, fr) => {
    const t = tod(B), breathe = 0;
    return { hip: [0, 0, B.hipZ - breathe], lean: t ? -2 : 1.5, tilt: t ? -4 : 2, ankle: standLegs(B, t ? 1.6 : 0),
      wrist: { L: J => armDown(B, J, 1, t ? 4.5 : 1.4), R: J => armDown(B, J, -1, t ? 4.5 : 1.4) } };
  };
  // walk: 6 frames per stride. Feet swing, the pelvis dips at full stride, arms swing against the legs
  POSES.walk = (B, fr, o) => {
    const p = ((fr || 0) % 6)/6*2*Math.PI, t = tod(B), S = B.legL*(t ? .26 : .34), hw = B.h.hipW + (t ? 1.8 : .5);
    const uL = S*Math.sin(p), uR = -uL, lift = B.legL*(t ? .16 : .13);
    const zL = B.h.ankle + Math.max(0, Math.cos(p))*lift, zR = B.h.ankle + Math.max(0, -Math.cos(p))*lift;
    const hipZ = B.h.ankle + Math.sqrt(Math.max(1, B.legL*B.legL - (S*Math.sin(p))**2))*.985;
    const sw = (B.h.uarm + B.h.farm)*(t ? .22 : .3);
    const q = { hip: [0, 0, hipZ], lean: t ? 3 : 5, tilt: 0, ankle: { L: [uL, hw, zL], R: [uR, -hw, zR] },
      foot: { L: [1, 0, Math.cos(p) > 0 ? -.15 : 0], R: [1, 0, Math.cos(p) < 0 ? -.15 : 0] },
      wrist: { L: J => add(armDown(B, J, 1, t ? 4 : 1.5, 0), [-sw*Math.sin(p), 0, Math.abs(Math.sin(p))*2]),
               R: J => add(armDown(B, J, -1, t ? 4 : 1.5, 0), [sw*Math.sin(p), 0, Math.abs(Math.sin(p))*2]) } };
    if (o && o.prop) Object.assign(q, carryArms(B, o.prop));
    return q;
  };
  const sitLegs = (B, seat) => {
    const h = B.h, hz = seat + B.w.thigh*.45, kn = {}, an = {};
    for (const sd of ['L', 'R']){ const v = SIDE[sd]*(h.hipW + .8), k = [h.thigh*.98, v, hz];
      const dz = Math.min(h.shin, k[2] - h.ankle); kn[sd] = k; an[sd] = [k[0] + Math.sqrt(Math.max(0, h.shin*h.shin - dz*dz))*.9 + .5, v, k[2] - dz]; }
    return { hz, kn, an };
  };
  POSES.sit = (B, fr, o) => {
    const seat = (o && o.seat != null) ? o.seat : B.h.ankle + B.h.shin + 1, g = sitLegs(B, seat);
    return { hip: [0, 0, g.hz], lean: -3, tilt: 4, knee: g.kn, ankle: g.an,
      wrist: { L: J => add(lerp3(J.hipL, J.kneeL, .62), [0, 1.5, B.w.thigh*.55 + 1]), R: J => add(lerp3(J.hipR, J.kneeR, .62), [0, -1.5, B.w.thigh*.55 + 1]) } };
  };
  const crossLegs = B => { const h = B.h, z = B.w.thigh*.55 + .6;
    return { hz: z, kn: { L: [h.thigh*.62, h.thigh*.7, B.w.thigh*.42], R: [h.thigh*.62, -h.thigh*.7, B.w.thigh*.42] },
      an: { L: [h.thigh*.78, -h.hipW*.6, h.ankle*.8], R: [h.thigh*.62, h.hipW*.6, h.ankle*.8] }, foot: { L: [.3, -1, 0], R: [.3, 1, 0] } }; };
  POSES.sitfloor = (B) => {
    const g = crossLegs(B);
    return { hip: [0, 0, g.hz], lean: 4, tilt: 6, knee: g.kn, ankle: g.an, foot: g.foot,
      wrist: { L: J => add(J.kneeL, [-1.5, -1, B.w.thigh*.6]), R: J => add(J.kneeR, [-1.5, 1, B.w.thigh*.6]) } };
  };
  POSES.read = (B, fr) => {
    const g = crossLegs(B), h = B.h;
    return { hip: [0, 0, g.hz], lean: 10, tilt: 20, knee: g.kn, ankle: g.an, foot: g.foot,
      wrist: { L: J => add(J.sh, [h.uarm*.8, -h.shW + 4.5, -h.uarm*.55]), R: J => add(J.sh, [h.uarm*.8, h.shW - 4.5, -h.uarm*.55]) },
      elbow: { L: [0, 1, -1], R: [0, -1, -1] }, prop: { kind: 'book', page: (fr || 0) % 2 } };
  };
  POSES.homework = (B, fr, o) => {
    const seat = (o && o.seat != null) ? o.seat : B.h.ankle + B.h.shin + 1, g = sitLegs(B, seat), h = B.h;
    const desk = (o && o.desk != null) ? o.desk : g.hz + h.torso*.42, wob = [0, 1.2, -.6, .6][(fr || 0) % 4];
    return { hip: [0, 0, g.hz], lean: 16, tilt: 22, knee: g.kn, ankle: g.an,
      wrist: { L: [h.thigh*.75, h.shW*.55, desk + 1.2], R: [h.thigh*.9 + wob*.5, -h.shW*.25 + wob, desk + 1.2] },
      elbow: { L: [-.3, 1, -.4], R: [-.3, -1, -.4] }, prop: { kind: 'pencil' }, desk };
  };
  POSES.cook = (B, fr, o) => {
    const h = B.h, ctr = (o && o.counter != null) ? o.counter : B.hipZ + h.torso*.3, a = ((fr || 0) % 4)*Math.PI/2;
    return { hip: [0, 0, B.hipZ], lean: 7, tilt: 16, ankle: standLegs(B),
      wrist: { R: [h.uarm*.8 + 3 + 2.4*Math.cos(a), -2 + 2.4*Math.sin(a), ctr + 9], L: [h.uarm*.72 + 2, h.shW*.8, ctr + 5] },
      elbow: { L: [-.4, 1, -.5], R: [-.4, -1, -.5] }, prop: { kind: 'spoon' } };
  };
  POSES.play = (B, fr) => {
    const h = B.h, k = (fr || 0) % 4, up = [0, 4, 6, 3][k];
    if (tod(B)){            // sitting with legs out in a V, reaching for the toys
      const hz = B.w.thigh*.5 + .4;
      return { hip: [-2, 0, hz], lean: 22, tilt: 10, knee: { L: [h.thigh*.95 - 2, h.hipW + 3.5, hz + 1.2], R: [h.thigh*.95 - 2, -h.hipW - 3.5, hz + 1.2] },
        ankle: { L: [h.thigh + h.shin*.9 - 2, h.hipW + 6.5, h.ankle], R: [h.thigh + h.shin*.9 - 2, -h.hipW - 6.5, h.ankle] }, foot: { L: [.2, .3, 1], R: [.2, -.3, 1] },
        wrist: { L: [h.thigh + 3, 3.5, 3 + up], R: [h.thigh + 4.5, -4, 3 + (6 - up)] }, elbow: { L: [0, 1, -.3], R: [0, -1, -.3] }, prop: { kind: 'block', hand: k < 2 ? 'L' : 'R' } };
    }
    const g = kneelSit(B);
    return { hip: g.hip, lean: 26, tilt: 14, knee: g.kn, ankle: g.an, foot: g.foot,
      wrist: { L: [h.thigh + 7, 5, 3 + up], R: [h.thigh + 8.5, -5, 3 + (6 - up)] }, elbow: { L: [0, 1, .2], R: [0, -1, .2] }, prop: { kind: 'block', hand: k < 2 ? 'L' : 'R' } };
  };
  // sitting back on the heels (play, the floor, a hug at a child's height)
  const kneelSit = B => { const h = B.h, kz = B.w.shin*.5, hz = h.ankle*.7 + B.w.shin*.9 + 3.5, ku = Math.sqrt(Math.max(4, h.thigh*h.thigh - (hz - kz)**2));
    return { hip: [0, 0, hz], kn: { L: [ku, h.hipW, kz], R: [ku, -h.hipW, kz] }, an: { L: [ku - h.shin*.96, h.hipW*.8, h.ankle*.7], R: [ku - h.shin*.96, -h.hipW*.8, h.ankle*.7] },
      foot: { L: [-1, 0, -.05], R: [-1, 0, -.05] } }; };
  // upright on both knees
  const kneelTall = B => { const h = B.h, kz = B.w.shin*.5, hz = kz + h.thigh*.96;
    return { hip: [-1.5, 0, hz], kn: { L: [1.5, h.hipW, kz], R: [1.5, -h.hipW, kz] }, an: { L: [1.5 - h.shin*.97, h.hipW, h.ankle*.7], R: [1.5 - h.shin*.97, -h.hipW, h.ankle*.7] },
      foot: { L: [-1, 0, -.1], R: [-1, 0, -.1] } }; };
  const carryArms = (B, prop) => {
    const h = B.h;
    if (prop === 'bags') return { wrist: { L: J => armDown(B, J, 1, 3.5, 1), R: J => armDown(B, J, -1, 3.5, 1) }, prop: { kind: 'bags' } };
    const z = B.hipZ + h.torso*.28, u = B.torso[2][2] + 9;
    return { wrist: { L: [u, h.shW*.72, z], R: [u, -h.shW*.72, z] }, elbow: { L: [-.6, .6, -.6], R: [-.6, -.6, -.6] }, prop: { kind: prop || 'box' } };
  };
  POSES.carry = (B, fr, o) => Object.assign({ hip: [0, 0, B.hipZ], lean: -3, tilt: 6, ankle: standLegs(B, .8) }, carryArms(B, (o && o.prop) || 'box'));
  // waving: the right arm raised out to the side, the hand above head height and well clear of the head (so it never
  // reads as scratching), swinging side to side in three positions; the body leans a little away from the arm
  // (the arm on the side that faces the camera: opts.waveL is set by figure())
  POSES.wave = (B, fr, o) => {
    const h = B.h, k = [-1, 0, 1, 0][(fr || 0) % 4], arm = h.uarm + h.farm, sd = o && o.waveL ? 1 : -1;
    // the swing goes outward only (never toward the head), and the hand stays clear of the head even on the toddler
    const lat = Math.max(h.shW + arm*(.38 + (k + 1)*.08), h.head*1.6 + (k + 1)*2.6);
    const up = J => add(J.sh, [3, sd*lat, Math.min(arm*.86, Math.sqrt(Math.max(1, arm*arm*.9 - (lat - h.shW)**2)))]), down = J => armDown(B, J, -sd, tod(B) ? 4 : 1.8);
    return Object.assign(POSES.stand(B), { tilt: -4, yaw: sd*10, lean: 1, hip: [0, -sd*.8, B.hipZ],
      wrist: sd < 0 ? { L: down, R: up } : { L: up, R: down }, elbow: sd < 0 ? { R: [.1, -1, -.35] } : { L: [.1, 1, -.35] } });
  };
  // catch: the sister throws (frames 0..3: wind up, raise, release, follow through) and gets ready to catch (frame 4)
  POSES.throw = (B, fr) => {
    const h = B.h, k = (fr || 0) % 5, st = POSES.stand(B), sh = h.shW;
    const R = [[-6, -sh - 2, 6], [-3, -sh - 3, 15], [h.uarm*.9, -sh + 2, 10], [h.uarm + h.farm*.55, -3, -14], [h.uarm*.95, -4, 0]][k];
    const L = [[9, sh + 5, -2], [8, sh + 4, 0], [4, sh + 3, -12], [-2, sh + 2, -18], [h.uarm*.95, 4, 0]][k];
    return Object.assign(st, { lean: [-6, -4, 8, 14, 6][k], tilt: [-8, -10, 0, 6, 0][k], ankle: { L: [6, h.hipW + 1, h.ankle], R: [-5, -h.hipW - 1, h.ankle] },
      wrist: { L: J => add(J.sh, L), R: J => add(J.sh, R) }, elbow: { L: [0, 1, -.3], R: [0, -1, -.3] }, prop: k < 2 ? { kind: 'ball', hand: 'R' } : null });
  };
  POSES.hug = (B, fr) => {
    const h = B.h, k = Math.min(5, fr || 0), open = k < 2, sh = h.shW;
    let base;
    if (B === PEOPLE.abu || B === PEOPLE.ummi){ const g = kneelTall(B); base = { hip: g.hip, knee: g.kn, ankle: g.an, foot: g.foot, lean: 6 + k*1.5 }; }
    else base = { hip: [0, 0, B.hipZ], ankle: standLegs(B, tod(B) ? 1.6 : 0), lean: tod(B) ? 4 : 8 + k };
    const wr = open ? { L: [6, sh + 13 - k*3, 7 + k*3], R: [6, -sh - 13 + k*3, 7 + k*3] }
                    : { L: [h.uarm*.7 + 8 - k, -3 - (k - 2)*.6, -2], R: [h.uarm*.7 + 6 - k, 3 + (k - 2)*.6, -1] };
    return Object.assign(base, { tilt: open ? 0 : 14, yaw: open ? 0 : 22, wrist: { L: J => add(J.sh, wr.L), R: J => add(J.sh, wr.R) }, elbow: { L: [-.2, 1, -.4], R: [-.2, -1, -.4] } });
  };
  POSES.sleep = (B) => ({ hip: [0, 0, B.w.thigh*.5], lean: -90, tilt: 0, sleep: true,
    knee: { L: [B.h.thigh, B.h.hipW, B.w.thigh*.5], R: [B.h.thigh, -B.h.hipW, B.w.thigh*.5] }, ankle: { L: [B.legL, B.h.hipW, B.w.shin*.5], R: [B.legL, -B.h.hipW, B.w.shin*.5] },
    foot: { L: [0, 0, 1], R: [0, 0, 1] }, wrist: { L: J => add(J.sh, [B.h.uarm + B.h.farm - 2, 2, 2]), R: J => add(J.sh, [B.h.uarm + B.h.farm - 2, -2, 2]) } });

  /* ---- salah (the same order and shapes as the salah station's posture outline, pray/salah-pose.js) ---- */
  POSES.qiyam = (B) => { const h = B.h, rf = B.torso[2][2];
    return Object.assign(POSES.stand(B), { lean: 1, tilt: 14, ankle: standLegs(B, .2),
      wrist: { R: J => add(J.neck, [rf + 2.8, -.6, -h.torso*.36]), L: J => add(J.neck, [rf + 1.6, 1.2, -h.torso*.42]) }, elbow: { L: [-.3, 1, -.6], R: [-.3, -1, -.6] } }); };
  POSES.takbir = (B) => { const h = B.h;
    return Object.assign(POSES.stand(B), { tilt: 8, wrist: { L: J => add(J.neck, [h.head*.55, h.head + 2.4, h.neck + h.head*.8]), R: J => add(J.neck, [h.head*.55, -h.head - 2.4, h.neck + h.head*.8]) },
      elbow: { L: [.2, 1, -1.4], R: [.2, -1, -1.4] } }); };
  POSES.itidal = (B) => Object.assign(POSES.stand(B), { tilt: 6 });
  POSES.ruku = (B) => { const h = B.h;
    return { hip: [-2.5, 0, B.hipZ - .6], lean: 88, tilt: 4, ankle: standLegs(B, .2),
      wrist: { L: J => add(J.kneeL, [1.5, .6, 3]), R: J => add(J.kneeR, [1.5, -.6, 3]) }, elbow: { L: [0, 1, 0], R: [0, -1, 0] } }; };
  POSES.sujood = (B) => {
    const h = B.h, kz = B.w.shin*.5, hz = kz + h.thigh*.9, hip = [-h.thigh*.3, 0, hz], tilt = 26;
    // lean until the forehead is on the floor
    let best = 120, err = 1e9;
    for (let l = 80; l <= 165; l += 1){ const s = spine(B, hip, l), hd = [Math.sin((l + tilt)*D2R), 0, Math.cos((l + tilt)*D2R)];
      const hc = add(s.neck, mul(hd, h.neck + h.head)), e = Math.abs(hc[2] - h.head*.92); if (e < err){ err = e; best = l; } }
    return { hip, lean: best, tilt, knee: { L: [0, h.hipW, kz], R: [0, -h.hipW, kz] },
      ankle: { L: [-h.shin*.9, h.hipW*.9, h.foot*.62], R: [-h.shin*.9, -h.hipW*.9, h.foot*.62] }, foot: { L: [.35, 0, -1], R: [.35, 0, -1] },
      wrist: { L: J => [J.head[0] - h.head*.4, h.shW + 1.5, 1.6], R: J => [J.head[0] - h.head*.4, -h.shW - 1.5, 1.6] }, elbow: { L: [-.3, 1, 1], R: [-.3, -1, 1] } };
  };
  const julusLegs = B => { const h = B.h, kz = B.w.shin*.5, hz = h.ankle*.9 + B.w.shin + 2.6, ku = Math.sqrt(Math.max(4, h.thigh*h.thigh - (hz - kz)**2));
    return { hip: [0, 0, hz], kn: { L: [ku, h.hipW + .4, kz], R: [ku, -h.hipW - .4, kz] },
      an: { L: [ku - h.shin*.95, h.hipW*.4, h.ankle*.75], R: [ku - h.shin*.92, -h.hipW*.9, h.foot*.62] }, foot: { L: [-1, -.2, -.05], R: [.35, 0, -1] } }; };
  POSES.julus = (B, fr, o) => { const g = julusLegs(B), h = B.h;
    return { hip: g.hip, lean: 3, tilt: 14, yaw: (o && o.yaw) || 0, knee: g.kn, ankle: g.an, foot: g.foot,
      wrist: { L: J => add(lerp3(J.hipL, J.kneeL, .82), [0, .5, B.w.thigh*.55 + .6]), R: J => add(lerp3(J.hipR, J.kneeR, .82), [0, -.5, B.w.thigh*.55 + .6]) } }; };
  POSES.tashahhud = POSES.julus;
  POSES.salamR = (B, fr) => POSES.julus(B, fr, { yaw: -70 });
  POSES.salamL = (B, fr) => POSES.julus(B, fr, { yaw: 70 });
  POSES.pray = POSES.qiyam;

  /* ---- the house's everyday activities (each loops through its frames) ---- */
  const ctrOf = (B, o) => (o && o.counter != null) ? o.counter : B.hipZ + B.h.torso*.3;
  // chopping at the counter: the knife hand goes up and down, the other hand holds the food
  POSES.chop = (B, fr, o) => { const h = B.h, c = ctrOf(B, o), up = [7, 0, 4, 0][(fr || 0) % 4];
    return { hip: [0, 0, B.hipZ], lean: 9, tilt: 20, ankle: standLegs(B), wrist: { R: [h.uarm*.8 + 3, -3, c + 4 + up], L: [h.uarm*.75 + 1, h.shW*.55, c + 3] },
      elbow: { L: [-.4, 1, -.5], R: [-.4, -1, -.3] }, prop: { kind: 'knife' } }; };
  // wiping the table: one hand circles with a cloth, the other rests on the top
  POSES.wipe = (B, fr, o) => { const h = B.h, c = ctrOf(B, o), a = ((fr || 0) % 4)*Math.PI/2;
    return { hip: [-1, 0, B.hipZ], lean: 20, tilt: 16, ankle: standLegs(B, .6), wrist: { R: [h.uarm*.95 + 3 + 3.5*Math.cos(a), -3 + 5*Math.sin(a), c + 1.6], L: [h.uarm*.85, h.shW*.7, c + 1.4] },
      elbow: { L: [-.3, 1, -.3], R: [-.3, -1, -.3] }, prop: { kind: 'cloth' } }; };
  // folding the washing: lift, bring together, lay down
  POSES.fold = (B, fr, o) => { const h = B.h, c = ctrOf(B, o), k = (fr || 0) % 4, z0 = B.hipZ + h.torso*.55;
    const W = [[12, 10, z0], [14, 3, z0 - 2], [15, 5, c + 6], [13, 9, c + 4]][k];
    return { hip: [0, 0, B.hipZ], lean: [4, 6, 14, 12][k], tilt: 14, ankle: standLegs(B), wrist: { L: [W[0], W[1], W[2]], R: [W[0], -W[1], W[2]] },
      elbow: { L: [-.3, 1, -.4], R: [-.3, -1, -.4] }, prop: { kind: 'foldcloth', k } }; };
  // fixing something low with a screwdriver: kneeling, the hand turns
  POSES.fix = (B, fr) => { const g = kneelSit(B), h = B.h, k = (fr || 0) % 4;
    return { hip: g.hip, lean: 18, tilt: 12, knee: g.kn, ankle: g.an, foot: g.foot, wrist: { R: [h.thigh + 9, -2 + [0, 1.6, 0, -1.6][k], 22 + [0, .8, 0, .8][k]], L: [h.thigh + 7, 6, 20] },
      elbow: { L: [-.2, 1, -.2], R: [-.2, -1, -.2] }, prop: { kind: 'screwdriver', k } }; };
  // watering the plants: the can held out, tipping
  POSES.water = (B, fr) => { const h = B.h, k = (fr || 0) % 4;
    return { hip: [0, 0, B.hipZ], lean: 6, tilt: 22, ankle: standLegs(B, .8), wrist: { R: [h.uarm*.85 + 2, -5, B.hipZ + h.torso*.15], L: J => armDown(B, J, 1, 2) },
      elbow: { R: [-.2, -1, -.6] }, prop: { kind: 'can', tip: [0, .5, .8, .5][k] } }; };
  // tea on the cushions: the cup comes up toward the head (no face: it simply rises to the head), then down
  POSES.tea = (B, fr) => { const g = crossLegs(B), h = B.h, k = (fr || 0) % 4;
    return { hip: [0, 0, g.hz], lean: 4, tilt: [6, 0, 0, 6][k], knee: g.kn, ankle: g.an, foot: g.foot,
      wrist: { R: J => k === 1 || k === 2 ? add(J.neck, [h.head*.8, -2, h.neck + h.head*.2]) : add(J.sh, [h.uarm*.6, h.shW*.2 - h.shW, -h.uarm*.5]), L: J => add(J.kneeL, [-1.5, -1, B.w.thigh*.6]) },
      elbow: { R: [0, -1, -.8] }, prop: { kind: 'cup' } }; };
  // skipping rope in the yard: hop, the rope goes round
  POSES.skip = (B, fr) => { const h = B.h, k = (fr || 0) % 4, lift = [0, 4, 7, 3][k];
    return { hip: [0, 0, B.hipZ + lift], lean: 2, tilt: 0, ankle: { L: [.6, h.hipW + .4, h.ankle + lift], R: [.6, -h.hipW - .4, h.ankle + lift] },
      wrist: { L: J => add(J.sh, [3, h.shW + 6, -h.uarm*.8 - h.farm*.35 + [0, 2, 3, 1][k]]), R: J => add(J.sh, [3, -h.shW - 6, -h.uarm*.8 - h.farm*.35 + [0, 2, 3, 1][k]]) },
      elbow: { L: [-.2, 1, -.6], R: [-.2, -1, -.6] }, prop: { kind: 'rope', k, lift } }; };
  // crawling (the toddler): hands and knees, diagonal pairs move together
  POSES.crawl = (B, fr) => { const h = B.h, k = (fr || 0) % 4, a = [3, 0, -3, 0][k], kz = B.w.shin*.5, hz = kz + h.thigh*.92;
    return { hip: [-h.thigh*.1, 0, hz], lean: 84, tilt: -30, knee: { L: [a, h.hipW + .5, kz], R: [-a, -h.hipW - .5, kz] },
      ankle: { L: [a - h.shin*.95, h.hipW*.8, h.ankle*.6], R: [-a - h.shin*.95, -h.hipW*.8, h.ankle*.6] }, foot: { L: [-1, 0, 0], R: [-1, 0, 0] },
      wrist: { L: J => [J.sh[0] + 1 - a, h.shW, 2], R: J => [J.sh[0] + 1 + a, -h.shW, 2] }, elbow: { L: [-.6, .3, 0], R: [-.6, -.3, 0] } }; };
  // talking with hands (no face: the hands, the lean and the head carry it) and listening (nodding)
  POSES.talk = (B, fr) => { const h = B.h, k = (fr || 0) % 4, st = POSES.stand(B);
    const R = [[10, -8, -6], [14, -13, -1], [9, -6, -8], [12, -11, 2]][k];
    return Object.assign(st, { lean: [3, 5, 2, 4][k], tilt: [2, -2, 4, 0][k], yaw: [0, 8, -4, 4][k], wrist: { R: J => add(J.sh, R), L: k === 1 || k === 3 ? (J => add(J.sh, [10, 10, -4])) : st.wrist.L }, elbow: { R: [-.3, -1, -.5], L: [-.3, 1, -.5] } }); };
  POSES.nod = (B, fr) => { const k = (fr || 0) % 4; return Object.assign(POSES.stand(B), { lean: 3, tilt: [2, 14, 2, 12][k], yaw: [6, 6, 8, 4][k] }); };
  // eating at the table: the spoon hand goes between the plate and the head
  POSES.eat = (B, fr, o) => { const q = POSES.sit(B, fr, o), h = B.h, k = (fr || 0) % 4;
    q.lean = 8; q.tilt = 10; q.wrist = Object.assign({}, q.wrist, { R: J => k === 2 ? add(J.neck, [h.head*.9, -2, h.neck]) : add(J.sh, [h.uarm*.85, 1 - h.shW, -h.uarm*.65 + (k === 1 || k === 3 ? 4 : 0)]) });
    q.elbow = { R: [-.2, -1, -.5] }; q.prop = { kind: 'spoon2' }; return q; };
  // Ummi holding the toddler on her arm (the toddler is drawn as 'held' in front of her)
  POSES.holdkid = (B, fr) => { const h = B.h, sw = [0, .6, 0, -.6][(fr || 0) % 4], rf = B.torso[2][2];
    return { hip: [0, sw, B.hipZ], lean: -4, tilt: 10, yaw: 12, ankle: standLegs(B, .8), wrist: { L: [rf + 7, 5, B.hipZ + h.torso*.28], R: [rf + 6, -4, B.hipZ + h.torso*.62] },
      elbow: { L: [-.2, 1, -.8], R: [-.2, -1, -.6] } }; };
  POSES.held = (B, fr) => { const h = B.h, z = B.hipZ*.55, k = (fr || 0) % 4;
    return { hip: [0, 0, z], lean: 6, tilt: [0, -6, 0, 4][k], yaw: [0, 0, 20, 0][k], knee: { L: [h.thigh*.9, h.hipW + 3, z - 1], R: [h.thigh*.9, -h.hipW - 3, z - 1] },
      ankle: { L: [h.thigh*.9 + 1, h.hipW + 3.5, z - h.shin], R: [h.thigh*.9 + 1, -h.hipW - 3.5, z - h.shin] },
      wrist: { L: J => add(J.sh, [7, 1, 4]), R: J => add(J.sh, [7, -1, 5]) }, elbow: { L: [0, 1, -.5], R: [0, -1, -.5] } }; };

  const POSE_NAMES = ['stand', 'walk', 'sit', 'sitfloor', 'cook', 'chop', 'wipe', 'fold', 'fix', 'water', 'tea', 'skip', 'crawl', 'talk', 'nod', 'eat', 'holdkid', 'held',
    'read', 'homework', 'play', 'carry', 'qiyam', 'takbir', 'ruku', 'itidal', 'sujood', 'julus', 'salamR', 'salamL', 'hug', 'wave', 'throw', 'sleep'];
  const FRAMES = { walk: 6, cook: 4, play: 4, wave: 4, hug: 6, throw: 5, homework: 4, read: 2, chop: 4, wipe: 4, fold: 4, fix: 4, water: 4, tea: 4, skip: 4, crawl: 4, talk: 4, nod: 4, eat: 4, holdkid: 4, held: 4 };

  /* ---------------- solving the skeleton ---------------- */
  function ik(A, T, l1, l2, hint){
    let d = sub(T, A), dl = len3(d);
    const mx = (l1 + l2)*.999, mn = Math.abs(l1 - l2) + .01;
    if (dl > mx){ T = add(A, mul(d, mx/dl)); d = sub(T, A); dl = mx; }
    if (dl < mn){ dl = mn; }
    const dir = n3(d), a = (l1*l1 - l2*l2 + dl*dl)/(2*dl), hh = Math.sqrt(Math.max(0, l1*l1 - a*a));
    let pp = sub(hint, mul(dir, dot(hint, dir))); if (len3(pp) < 1e-4) pp = basisOf(dir)[0]; pp = n3(pp);
    const j = add(add(A, mul(dir, a)), mul(pp, hh));
    return [j, add(j, mul(n3(sub(T, j)), l2))];
  }
  function solve(B, pose, fr, o){
    const fn = POSES[pose] || POSES.stand, q = fn(B, fr, o || {}), h = B.h, mc = o && o.micro;
    // idle micro-life: breathing (the chest rises), a weight shift (the hips move over one foot), a head turn
    if (mc){ if (mc.s && !q.knee) q.hip = [q.hip[0], q.hip[1] + mc.s*1.2, q.hip[2] - Math.abs(mc.s)*.25]; if (mc.l) q.yaw = (q.yaw || 0) + mc.l; }
    const J = { q, hip: q.hip.slice(), lean: q.lean || 0 };
    const sp = spine(B, J.hip, J.lean);
    if (mc && mc.b){ sp.sh = add(sp.sh, [0, 0, mc.b*.55]); sp.neck = add(sp.neck, [0, 0, mc.b*.45]); }
    J.a = sp.a; J.f = sp.f; J.neck = sp.neck;
    J.shL = add(sp.sh, [0, h.shW, 0]); J.shR = add(sp.sh, [0, -h.shW, 0]); J.sh = sp.sh;
    J.hipL = add(J.hip, [0, h.hipW, 0]); J.hipR = add(J.hip, [0, -h.hipW, 0]);
    const hl = (J.lean + (q.tilt || 0))*D2R; J.hd = [Math.sin(hl), 0, Math.cos(hl)];
    J.head = add(J.neck, mul(J.hd, h.neck + h.head*.96));
    const yw = (q.yaw || 0)*D2R; J.hf = n3([Math.cos(hl)*Math.cos(yw), Math.sin(yw), -Math.sin(hl)*Math.cos(yw)]);   // the way the head faces
    for (const sd of ['L', 'R']){
      const s = SIDE[sd], hipJ = J['hip' + sd];
      let an = q.ankle ? q.ankle[sd] : [0, s*h.hipW, h.ankle];
      if (q.knee && q.knee[sd]){ const k = q.knee[sd]; J['knee' + sd] = k; J['ankle' + sd] = add(k, mul(n3(sub(an, k)), h.shin)); }
      else { const r = ik(hipJ, an, h.thigh, h.shin, [1, s*.12, 0]); J['knee' + sd] = r[0]; J['ankle' + sd] = r[1]; }
      J['foot' + sd] = n3((q.foot && q.foot[sd]) || [1, s*.12, 0]);
    }
    for (const sd of ['L', 'R']){
      const s = SIDE[sd], shJ = J['sh' + sd], w = q.wrist && q.wrist[sd];
      const tgt = typeof w === 'function' ? w(J) : (w || add(shJ, [0, s*1.2, -(h.uarm + h.farm)*.97]));
      const r = ik(shJ, tgt, h.uarm, h.farm, (q.elbow && q.elbow[sd]) || [-.35, s*.35, -.2]);
      J['elb' + sd] = r[0]; J['wr' + sd] = r[1];
    }
    J.prop = q.prop || null; J.desk = q.desk;
    return J;
  }

  /* ---------------- drawing primitives for bodies ---------------- */
  // light direction in world coordinates for toneI (so a sphere's caps match the boxes' bands exactly)
  // hard three-tone bands (the same thresholds as toneI, without its soft blend): a body of 14 columns becomes at most
  // three paths, and a figure stays a few dozen nodes
  const toneF = (n, m) => { const d = dot(rotV(n), LIN); return d >= .6 ? m.l : d >= .05 ? m.m : m.d; };
  const lightW = () => { const e = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; return n3(e.map(v => dot(rotV(v), LIN))); };
  let INKW = 1.2, TUBE_REF = -1e9;                 // tubes farther than TUBE_REF (the torso) skip the lit band                                     // limb outline, in model ink units (scaled by INK_K below)
  const sty = (w, col) => `fill="none" stroke="${col}" style="stroke-width:${w.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"`;
  // a tube along a polyline of 3D points, w thick: ink outline, the shadow side, the lit band (3 nodes)
  function tube(pts, w, m, bands = true){
    if (bands === 'auto') bands = depthOf(avg(pts)) >= TUBE_REF;
    const Q = pts.map(p => P(...p)), d = 'M' + Q.map(q => fx(q[0]) + ' ' + fx(q[1])).join('L');
    const W = w*CAM_K, K = INK_K || 1;
    let s = `<path d="${d}" ${sty(W + 2*INKW*K, INK)}/>`;
    // which side is lit: the side normal (perpendicular to the main segment, across the screen)
    let d3 = sub(pts[1], pts[0]); if (len3(d3) < .01 && pts[2]) d3 = sub(pts[2], pts[1]); d3 = n3(d3);
    const V = CAM_V, nV = n3(sub(V, mul(d3, dot(V, d3)))), n1 = n3(cross(d3, nV)), Lw = lightW(), sg = dot(n1, Lw) >= 0 ? 1 : -1;
    const cDark = toneF(n3(add(nV, mul(n1, -sg*1.1))), m), cLit = toneF(n3(add(nV, mul(n1, sg*.7))), m);
    s += `<path d="${d}" ${sty(W, cDark)}/>`;
    if (bands){
      // the lit band, offset across each segment toward the lit side
      const o2 = Dv(...n1), ol = Math.hypot(o2[0], o2[1]) || 1, ox = o2[0]/ol*sg, oy = o2[1]/ol*sg, off = W*.2;
      const segN = []; for (let i = 0; i < Q.length - 1; i++){ let nx = -(Q[i + 1][1] - Q[i][1]), ny = Q[i + 1][0] - Q[i][0]; const l = Math.hypot(nx, ny);
        if (l < .01){ nx = ox; ny = oy; } else { nx /= l; ny /= l; if (nx*ox + ny*oy < 0){ nx = -nx; ny = -ny; } } segN.push([nx, ny]); }
      const B2 = Q.map((q, i) => { const a = segN[Math.max(0, i - 1)], b = segN[Math.min(segN.length - 1, i)]; let nx = a[0] + b[0], ny = a[1] + b[1]; const l = Math.hypot(nx, ny) || 1;
        return [q[0] + nx/l*off, q[1] + ny/l*off]; });
      s += `<path d="M${B2.map(q => fx(q[0]) + ' ' + fx(q[1])).join('L')}" ${sty(W*.46, cLit)}/>`;
    }
    return s;
  }
  // a rounded shoe: a filled capsule polygon from heel to toe (1 node)
  function capsule(a, b, w, col, inkw = .9){
    const A = P(...a), Bq = P(...b), dx = Bq[0] - A[0], dy = Bq[1] - A[1], l = Math.hypot(dx, dy) || 1, ux = dx/l, uy = dy/l, r = w*CAM_K/2;
    const pts = []; for (let i = 0; i <= 6; i++){ const t = Math.PI/2 + i*Math.PI/6; pts.push([A[0] + r*(Math.cos(t)*ux - Math.sin(t)*uy), A[1] + r*(Math.cos(t)*uy + Math.sin(t)*ux)]); }
    for (let i = 0; i <= 6; i++){ const t = -Math.PI/2 + i*Math.PI/6; pts.push([Bq[0] + r*(Math.cos(t)*ux - Math.sin(t)*uy), Bq[1] + r*(Math.cos(t)*uy + Math.sin(t)*ux)]); }
    return `<path d="${sp(pts)}" fill="${col}" stroke="${INK}" stroke-width="${inkw}" stroke-linejoin="round"/>`;
  }
  const disc2 = (c, r, col, inkw) => { const q = P(...c); return `<circle cx="${fx(q[0])}" cy="${fx(q[1])}" r="${(r*CAM_K).toFixed(2)}" fill="${col}"${inkw ? ` stroke="${INK}" stroke-width="${inkw}"` : ''}/>`; };
  // the visible part of a spherical cap {p : (p - c)·n >= d} on a sphere (c, r), as a screen path; '' when hidden
  function capPath(c, r, n, d, N = 28){
    n = n3(n); const V = CAM_V, rc = Math.sqrt(Math.max(0, r*r - d*d)), cc = add(c, mul(n, d)), [e1, e2] = basisOf(n), [g1, g2] = basisOf(V);
    const cut = [], sil = [];
    for (let i = 0; i < N; i++){ const t = i/N*2*Math.PI, p = add(cc, add(mul(e1, rc*Math.cos(t)), mul(e2, rc*Math.sin(t)))); cut.push({ p, k: dot(sub(p, c), V) >= 0 }); }
    for (let i = 0; i < 36; i++){ const t = i/36*2*Math.PI, p = add(c, add(mul(g1, r*Math.cos(t)), mul(g2, r*Math.sin(t)))); sil.push({ p, k: dot(sub(p, c), n) >= d }); }
    const nv = cut.filter(e => e.k).length, ni = sil.filter(e => e.k).length;
    const pth = L => sp(L.map(p => P(...p)));
    if (nv === N) return dot(n, V) > 0 ? pth(cut.map(e => e.p)) : pth(sil.map(e => e.p)) + pth(cut.map(e => e.p).reverse());
    if (nv === 0) return ni === 36 ? pth(sil.map(e => e.p)) : '';
    const run = L => { const n = L.length; let s = 0; for (let i = 0; i < n; i++) if (L[i].k && !L[(i - 1 + n) % n].k){ s = i; break; }
      const o = []; for (let j = 0; j < n && L[(s + j) % n].k; j++) o.push(L[(s + j) % n].p); return o; };
    const A = run(cut); let Bs = run(sil);
    if (!Bs.length) return pth(A);
    const e = P(...A[A.length - 1]), d0 = P(...Bs[0]), d1 = P(...Bs[Bs.length - 1]);
    if (Math.hypot(e[0] - d0[0], e[1] - d0[1]) > Math.hypot(e[0] - d1[0], e[1] - d1[1])) Bs = Bs.reverse();
    return pth(A.concat(Bs));
  }
  // a shaded sphere: dark disc, the mid and lit caps toward the light, then the ink outline (4 nodes)
  function sphere(c, r, m, inkw = 1.3){
    const Lw = lightW(), q = P(...c), R = (r*CAM_K).toFixed(2);
    // the ink stroke is drawn wide: the caps cover its inner half, the outer half is the outline
    let s = `<circle cx="${fx(q[0])}" cy="${fx(q[1])}" r="${R}" fill="${m.d}" stroke="${INK}" stroke-width="${(inkw*1.8).toFixed(2)}"/>`;
    const a = capPath(c, r, Lw, r*.05), b = capPath(c, r, Lw, r*.55);
    if (a) s += `<path d="${a}" fill="${m.m}" fill-rule="evenodd"/>`;
    if (b) s += `<path d="${b}" fill="${m.l}" fill-rule="evenodd"/>`;
    return s;
  }
  const capShape = (c, r, n, d, col, inkw = .8) => { const p = capPath(c, r, n, d); return p ? `<path d="${p}" fill="${col}" fill-rule="evenodd"${inkw ? ` stroke="${INK}" stroke-width="${inkw}" stroke-linejoin="round"` : ''}/>` : ''; };
  // a body of rings (each {c, a: axis, s: side unit, rs, rf}), shaded in bands per column, merged per tone; returns svg
  function rings3(R, n = 14){
    return R.map(g => { const f = n3(cross(g.s, g.a)); return Array.from({ length: n }, (_, i) => { const t = i/n*2*Math.PI;
      return add(g.c, add(mul(g.s, g.rs*Math.cos(t)), mul(f, g.rf*Math.sin(t)))); }); });
  }
  function bandBody(rings, m, from = 0, to = rings.length - 1){
    const n = rings[0].length, cen = avg(rings.slice(from, to + 1).map(r => avg(r)));
    const col = [];
    for (let i = 0; i < n; i++){ let nn = [0, 0, 0];
      for (let k = from; k < to; k++){ const a0 = rings[k][i], a1 = rings[k][(i + 1) % n], b0 = rings[k + 1][i];
        let nr = n3(cross(sub(a1, a0), sub(b0, a0))); if (dot(nr, sub(avg([a0, a1, b0]), cen)) < 0) nr = mul(nr, -1); nn = add(nn, nr); }
      nn = n3(nn); col.push(vis(nn) ? toneF(nn, m) : null); }
    let st = col.indexOf(null); if (st < 0) st = 0;
    let s = '';
    for (let j = 0; j < n;){
      const i0 = (st + j) % n, c = col[i0]; if (!c){ j++; continue; }
      let L = 1; while (j + L < n && col[(st + j + L) % n] === c) L++;
      const pts = [];
      for (let t = 0; t <= L; t++) pts.push(rings[from][(i0 + t) % n]);
      for (let k = from + 1; k <= to; k++) pts.push(rings[k][(i0 + L) % n]);
      for (let t = L; t >= 0; t--) pts.push(rings[to][(i0 + t) % n]);
      for (let k = to - 1; k > from; k--) pts.push(rings[k][i0]);
      s += face(pd(pts), c); j += L;
    }
    return s;
  }
  const hullOf = pts => sp(hull(pts.map(p => P(...p))));

  /* ---------------- one figure ---------------- */
  // local (u fwd, v left, w up) -> world, for a figure standing at `at` facing `fa` degrees (0 = +x, 90 = +y)
  function framer(at, fa){ const c = Math.cos(fa*D2R), s = Math.sin(fa*D2R);
    return { W: p => [at[0] + p[0]*c - p[1]*s, at[1] + p[0]*s + p[1]*c, at[2] + p[2]], D: p => [p[0]*c - p[1]*s, p[0]*s + p[1]*c, p[2]] }; }

  function figure(name, pose, at, facing, frame, opts){
    const B = PEOPLE[name]; if (!B) return { svg: '', box: [at, at] };
    opts = opts || {};
    // waving: turn a little toward the camera, and wave with the arm on the camera's side, so it reads from any facing
    if (pose === 'wave'){ const ca = Math.atan2(CAM_V[1], CAM_V[0])/D2R; let d = ((ca - (facing || 0)) % 360 + 540) % 360 - 180; facing = ca - Math.max(-35, Math.min(35, d));          // a wave is for the child: turn to within 35 degrees of the viewer
      const rr = ((facing || 0) - 90)*D2R; if (Math.cos(rr)*CAM_V[0] + Math.sin(rr)*CAM_V[1] < -.05) opts = Object.assign({}, opts, { waveL: true }); }
    const J = solve(B, pose, frame || 0, opts), F = framer(at, facing || 0), Wp = F.W, Dd = F.D, h = B.h;
    const skin = matOf(skinOf(B)), top = matOf(B.col.top), legs = matOf(B.col.legs), V = CAM_V;
    const parts = [];                                   // {z: depth, svg}
    const put = (pt, svg, bias = 0) => { if (svg) parts.push({ z: depthOf(pt) + bias, svg }); };
    const all = [];                                     // world points, for the box
    const w = k => { const p = Wp(J[k]); all.push(p); return p; };
    const hip = w('hip'), neck = w('neck'), head = w('head');
    const A = n3(Dd(J.a)), Fw = n3(Dd(J.f)), Sv = n3(Dd([0, 1, 0])), HF = n3(Dd(J.hf)), HD = n3(Dd(J.hd));
    const P3 = {}; for (const k of ['hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'shL', 'shR', 'elbL', 'elbR', 'wrL', 'wrR']) P3[k] = w(k);
    const sleeping = !!J.q.sleep;
    TUBE_REF = depthOf(lerp3(hip, neck, .5)) - 2;

    // shadow on the floor
    let shadow = '';
    if (!sleeping && !opts.noShadow){ const cx = (P3.ankleL[0] + P3.ankleR[0] + hip[0]*2)/4, cy = (P3.ankleL[1] + P3.ankleR[1] + hip[1]*2)/4, r = h.shW + 3;
      shadow = `<path d="${pd(on(PZ(at[2] + .3), ellUV(cx, cy, r*1.05, r*1.05, 16)))}" fill="${SHADOW}" opacity=".3"/>`; }

    // legs and shoes
    for (const sd of ['L', 'R']){
      const hp = P3['hip' + sd], kn = P3['knee' + sd], an = P3['ankle' + sd], ft = n3(Dd(J['foot' + sd]));
      const heel = add(an, add(mul(ft, -2), [0, 0, -h.ankle*.45])), toe = add(an, add(mul(ft, h.foot - 2.5), [0, 0, -h.ankle*.45]));
      all.push(toe);
      let s = '';
      if (sleeping) continue;
      if (!B.dress) s += tube([hp, kn, an], B.w.thigh*.86, legs, 'auto');
      const shoe = capsule(heel, toe, B.w.shoe, B.col.shoe);
      // a shoe goes before its leg when it is farther than the ankle, otherwise after
      const shoeFirst = depthOf(toe) < depthOf(an);
      put(lerp3(hp, an, .5), shoeFirst ? shoe + s : s + shoe, sd === 'L' ? .01 : 0);
    }

    // torso (rings along the spine), plus the toddler's bib
    const T = B.torso.map(([t, rs, rf, off]) => ({ c: add(add(hip, mul(A, h.torso*t)), mul(Fw, off)), a: A, s: Sv, rs, rf }));
    const TR = rings3(T);
    T.forEach(r => all.push(r.c));
    let torso = bandBody(TR, top, 0, TR.length - 2);
    const capN = A; if (vis(capN)) torso += face(pd(TR[TR.length - 2]), toneF(capN, top));
    torso += ink(hullOf([].concat(...TR)), 1.5);
    if (B.col.bib && vis(Fw)){ const c0 = add(add(hip, mul(A, h.torso*.2)), mul(Fw, B.torso[1][2] + 1)), c1 = add(add(hip, mul(A, h.torso*.6)), mul(Fw, B.torso[2][2] + .6));
      const bib = [add(c0, mul(Sv, 5.6)), add(c1, mul(Sv, 4.2)), add(c1, mul(Sv, -4.2)), add(c0, mul(Sv, -5.6))];
      torso += shape(bib, toneI(Fw, matOf(B.col.bib)), .8) + disc2(add(c1, mul(Sv, 2.6)), .8, '#f2c230', .5) + disc2(add(c1, mul(Sv, -2.6)), .8, '#f2c230', .5); }
    // a neck for Abu and the toddler (scarves cover it for Ummi and the sister)
    let neckS = '';
    if (!B.scarf){ neckS = tube([add(neck, mul(A, -1.5)), add(neck, mul(HD, h.neck + 1.5))], Math.max(4, h.head*.62), skin, false); }
    put(lerp3(hip, neck, .5), torso);

    // a long dress (Ummi) or a tunic (the sister): rings from the waist down the legs
    if (B.dress || B.tunic){
      const mL = mid => lerp3(P3.kneeL, P3.kneeR, .5), waist = { c: add(add(hip, mul(A, h.torso*.18)), mul(Fw, .3)), a: A, s: Sv, rs: B.torso[1][1] + .6, rf: B.torso[1][2] + .6 };
      const spread = (a, b) => len3(sub(a, b))/2;
      const R = [waist];
      const thighD = n3(sub(lerp3(P3.kneeL, P3.kneeR, .5), lerp3(P3.hipL, P3.hipR, .5)));
      if (B.dress){
        const kc = lerp3(P3.kneeL, P3.kneeR, .5), ac = lerp3(P3.ankleL, P3.ankleR, .5), shinD = n3(sub(ac, kc));
        const kr = spread(P3.kneeL, P3.kneeR) + B.w.thigh*.62 + 2.5, ar = Math.max(spread(P3.ankleL, P3.ankleR) + 6.5, 12.5);
        const sa = n3(sub(Sv, mul(thighD, dot(Sv, thighD)))), sb = n3(sub(Sv, mul(shinD, dot(Sv, shinD))));
        const bent = dot(thighD, shinD) < .75, low = (P3.kneeL[2] + P3.kneeR[2])/2 - at[2] < h.thigh*.45;
        if (low){
          // kneeling or sitting on the floor: the dress spreads in a dome from the waist to the floor around knees and feet
          const fp = [P3.kneeL, P3.kneeR, P3.ankleL, P3.ankleR, hip], fc = avg(fp), rr = Math.max(...fp.map(p => Math.hypot(p[0] - fc[0], p[1] - fc[1]))) + 4.5;
          const mid = { c: lerp3(waist.c, [fc[0], fc[1], at[2] + 5], .55), a: [0, 0, 1], s: Sv, rs: (waist.rs + rr)/2 + 1.5, rf: (waist.rf + rr*.9)/2 + 1.5 };
          R.push(mid, { c: [fc[0], fc[1], at[2] + 1.2], a: [0, 0, 1], s: Sv, rs: rr, rf: rr*.9 });
        }
        else if (bent) R.push({ c: add(kc, mul(thighD, 1.5)), a: thighD, s: sa, rs: kr, rf: B.w.thigh*.62 + 2.5 });
        else R.push({ c: lerp3(waist.c, add(ac, [0, 0, 3]), .5), a: n3(sub(ac, waist.c)), s: Sv, rs: (waist.rs + ar)/2, rf: (waist.rf + ar*.8)/2 });
        if (!low){ const hemC = add(ac, mul(shinD, -1.2)), hemA = bent ? shinD : n3(sub(hemC, waist.c));
          R.push({ c: add(hemC, [0, 0, -h.ankle*.25]), a: hemA, s: sb, rs: ar, rf: ar*.82 }); }
      } else {
        const hc = lerp3(lerp3(P3.hipL, P3.hipR, .5), lerp3(P3.kneeL, P3.kneeR, .5), .42), sa = n3(sub(Sv, mul(thighD, dot(Sv, thighD))));
        R.push({ c: hc, a: thighD, s: sa, rs: spread(P3.kneeL, P3.kneeR)*.6 + h.hipW + B.w.thigh*.5 + 1.6, rf: B.torso[0][2] + 1.2 });
      }
      // the rings point down the legs: a's sign doesn't matter for rings3, only s and the normal (cross(s, a))
      const RR = rings3(R.map(g => ({ c: g.c, a: n3(g.a), s: g.s, rs: g.rs, rf: g.rf })));
      R.forEach(g => all.push(g.c));
      let sk = '';
      if (RR.length === 3 && dot(n3(sub(R[1].c, R[0].c)), n3(sub(R[2].c, R[1].c))) < .8){
        // bent at the knees: two banded pieces, the farther first
        const p1 = bandBody(RR, top, 0, 1) + ink(hullOf(RR[0].concat(RR[1])), 1.4), p2 = bandBody(RR, top, 1, 2) + ink(hullOf(RR[1].concat(RR[2])), 1.4);
        sk = depthOf(avg(RR[0].concat(RR[1]))) < depthOf(avg(RR[1].concat(RR[2]))) ? p1 + p2 : p2 + p1;
      } else sk = bandBody(RR, top) + ink(hullOf([].concat(...RR)), 1.5);
      // a waist band for the tunic, a hem line for the dress: read as cloth over the legs
      put(lerp3(hip, R[R.length - 1].c, .5), sk, B.dress ? -1 : .5);
    }

    // arms with sleeves, hands in skin
    for (const sd of ['L', 'R']){
      const sh = P3['sh' + sd], el = P3['elb' + sd], wr = P3['wr' + sd];
      const handC = add(wr, mul(n3(sub(wr, el)), B.w.hand*.55));
      let s = tube([sh, el, wr], B.w.uarm*.9, top, 'auto') + disc2(handC, B.w.hand, skin.l, 1);
      put(lerp3(el, wr, .3), s, 3.5);
    }

    // head: the sphere, then caps (hair, beard, kufi, face opening), and a drape for a scarf
    {
      const r = h.head; let s = '';
      if (B.scarf){
        const scarf = matOf(B.col.scarf), rr = r*1.1;
        // the drape: from around the head down over the shoulders
        const sh0 = add(neck, mul(A, -h.torso*(B.scarf === 'khimar' ? .36 : .16)));
        const D = [{ c: add(head, mul(HD, -r*.15)), a: HD, s: Sv, rs: rr*.98, rf: rr*.98 },
                   { c: add(sh0, mul(Fw, .6)), a: A, s: Sv, rs: B.scarf === 'khimar' ? h.shW + 3.6 : h.shW*.92 + 1.6, rf: B.torso[3][2] + (B.scarf === 'khimar' ? 3.6 : 2) }];
        const DR = rings3(D, 16);
        const drape = bandBody(DR, scarf) + ink(hullOf([].concat(...DR)), 1.4);
        put(lerp3(neck, sh0, .5), drape, .6);
        s += sphere(head, rr, scarf, 1.4);
        // the face opening, plain skin (no features)
        s += capShape(head, rr*1.004, add(HF, mul(HD, -.12)), rr*.6, skin.l, .8);
        all.push(add(head, mul(HD, rr)));
      } else {
        s += neckS + sphere(head, r, skin, 1.4);
        const hair = B.col.hair;
        if (B.beard){
          s += capShape(head, r*1.006, add(mul(HF, -.9), mul(HD, .32)), r*.12, hair, .7);                 // short hair at the back
          s += capShape(head, r*1.012, add(mul(HF, .5), mul(HD, -.87)), r*.56, hair, .7);                 // a short, neat beard at the chin
        }
        if (B.hat === 'kufi'){ s += capShape(head, r*1.05, add(HD, mul(HF, -.18)), r*.4, B.col.kufi, 1);
          const kc = add(head, mul(n3(add(HD, mul(HF, -.18))), r*1.05)); all.push(kc); }
        if (B.hair === 'tuft'){
          s += capShape(head, r*1.01, add(mul(HD, .75), mul(HF, -.75)), r*.02, hair, .7);
          const top = add(head, mul(n3(add(HD, mul(HF, -.3))), r*1.0)), tip = add(top, add(mul(HD, 3.6), mul(HF, 2.4)));
          s += `<path d="M${P(...top).map(fx).join(' ')}Q${P(...add(top, mul(HD, 4.2))).map(fx).join(' ')} ${P(...tip).map(fx).join(' ')}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`;
          all.push(tip);
        }
        all.push(add(head, mul(HD, r)));
      }
      put(head, s, 1);
    }

    // props
    if (J.prop){
      const pr = J.prop, wL = P3.wrL, wR = P3.wrR, mid = lerp3(wL, wR, .5);
      let s = '', at2 = mid;
      if (pr.kind === 'book'){
        const c = add(mid, mul(Fw, 2.4)), u = n3(sub(wL, wR)), up = n3(add(A, mul(Fw, -.9)));
        const fwd = n3(cross(up, u)), wB = Math.max(5, h.shW*.62), hB = wB*1.35;
        const pg = (sg, col) => { const e = add(c, mul(u, sg*wB)), e2 = add(e, mul(fwd, -1.5));
          return shape([add(c, mul(up, -hB/2)), add(e2, mul(up, -hB/2)), add(e2, mul(up, hB/2)), add(c, mul(up, hB/2))], col, .8); };
        const cover = shape([add(add(c, mul(u, wB + .8)), mul(up, -hB/2 - .8)), add(add(c, mul(u, -wB - .8)), mul(up, -hB/2 - .8)), add(add(c, mul(u, -wB - .8)), mul(up, hB/2 + .8)), add(add(c, mul(u, wB + .8)), mul(up, hB/2 + .8))].map(p => add(p, mul(fwd, 1.2))), '#5b8fd6', .9);
        s = dot(fwd, V) > 0 ? cover : pg(1, '#fffaf0') + pg(-1, pr.page ? '#f3ead6' : '#fffaf0');
        at2 = c;
      } else if (pr.kind === 'pencil'){ const a = add(wR, [0, 0, 1]), b = add(a, add(mul(Fw, -1), [0, 0, 6]));
        s = tube([a, b], 1.4, matOf('#f2c230'), false); at2 = a;
      } else if (pr.kind === 'spoon'){ const a = add(wR, [0, 0, 1.5]), b = add(wR, add(mul(Fw, 3), [0, 0, -8]));
        s = tube([a, b], 1.5, matOf('#c99555'), false) + disc2(b, 1.8, '#c99555', .7); at2 = wR;
      } else if (pr.kind === 'knife'){ const a = add(wR, [0, 0, -.5]), b = add(a, add(mul(Fw, 6), [0, 0, -3]));
        s = tube([wR, a], 2, matOf('#3d3935'), false) + tube([a, b], 1.6, METAL, false); at2 = wR;
      } else if (pr.kind === 'cloth'){ const c = add(wR, [0, 0, -1.2]), u = Fw, v = Sv;
        s = shape([add(add(c, mul(u, 3.5)), mul(v, 3)), add(add(c, mul(u, 3.5)), mul(v, -3)), add(add(c, mul(u, -3)), mul(v, -3.5)), add(add(c, mul(u, -3)), mul(v, 3))], '#9fd0e8', .8); at2 = c;
      } else if (pr.kind === 'foldcloth'){ const c = lerp3(wL, wR, .5), wd = len3(sub(wL, wR))/2 + 1, hgt = pr.k < 2 ? 12 : 4, col = ['#f3a6bb', '#9fc7ef', '#f3a6bb', '#9fc7ef'][pr.k];
        const u = n3(sub(wL, wR)), dn = pr.k < 2 ? [0, 0, -1] : n3(add(Fw, [0, 0, -.3]));
        s = shape([add(c, mul(u, wd)), add(c, mul(u, -wd)), add(add(c, mul(u, -wd)), mul(dn, hgt)), add(add(c, mul(u, wd)), mul(dn, hgt))], col, .9); at2 = c;
      } else if (pr.kind === 'screwdriver'){ const a = wR, b = add(a, add(mul(Fw, 6), [0, 0, -1]));
        s = tube([add(a, mul(Fw, -1.5)), add(a, mul(Fw, 1.5))], 2.4, matOf('#e8574a'), false) + tube([add(a, mul(Fw, 1.5)), b], .9, METAL, false); at2 = a;
      } else if (pr.kind === 'can'){ const c = add(wR, [0, 0, -5]), t = pr.tip || 0, sp2 = add(c, add(mul(Fw, 8 + t*2), [0, 0, 3 - t*6]));
        s = box(c[0] - 3.5, c[1] - 3.5, c[2] - 4, c[0] + 3.5, c[1] + 3.5, c[2] + 4, matOf('#5b8fd6'), toneI, .8) + tube([add(c, mul(Fw, 3)), sp2], 1.3, matOf('#4a7cc0'), false);
        if (t > .3){ let d = ''; for (let i = 0; i < 4; i++){ const p0 = add(sp2, add(mul(Fw, i*.8), [0, 0, -2 - i*3])); d += pd([p0, add(p0, [0, 0, -2])], false); }
          s += `<path d="${d}" fill="none" stroke="#5b9fe0" stroke-width="1.3" stroke-linecap="round"/>`; }
        at2 = c;
      } else if (pr.kind === 'cup'){ const c = add(wR, [0, 0, 1]);
        s = cyl(c[0], c[1], c[2] - 2.5, c[2] + 2.5, 2.4, matOf('#fbfaf3'), toneI, .8, 10); at2 = c;
      } else if (pr.kind === 'spoon2'){ const a = wR, b = add(wR, add(mul(Fw, 4), [0, 0, 1]));
        s = tube([a, b], 1, METAL, false); at2 = a;
      } else if (pr.kind === 'rope'){
        // the rope: a wide loop from hand to hand that turns round the body (over the head, in front, under the feet,
        // behind), sampled as a curve in the plane across the hands
        const k = pr.k, mid = lerp3(wL, wR, .5), ax = sub(wL, wR), half = len3(ax)/2, axn = n3(ax), up = [0, 0, 1];
        const th = [0, 90, 180, 270][k]*D2R, dir = add(mul(up, Math.cos(th)), mul(Fw, Math.sin(th)));
        const R = k === 2 ? mid[2] - at[2] - .5 : k === 0 ? head[2] + h.head + 5 - mid[2] : B.torso[2][2] + 9;
        const pts = []; for (let i = 0; i <= 10; i++){ const t = -1 + i/5; pts.push(add(add(mid, mul(axn, t*half*1.15)), mul(dir, R*(1 - t*t)))); }
        s = `<path d="M${pts.map(p => P(...p).map(fx).join(' ')).join('L')}" fill="none" stroke="#e8574a" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`;
        at2 = pts[5]; if (k === 3 || (k === 0 && dot(Fw, CAM_V) > .3) === false && k !== 1 && k !== 2) { put(pts[5], s, k === 3 ? -9 : -4); s = ''; }
      } else if (pr.kind === 'block'){ const wr = pr.hand === 'R' ? wR : wL, c = add(wr, [0, 0, 2.5]);
        s = box(c[0] - 2.8, c[1] - 2.8, c[2] - 2.8, c[0] + 2.8, c[1] + 2.8, c[2] + 2.8, matOf(pr.hand === 'R' ? '#5b8fd6' : '#e8574a'), toneI, .8); at2 = c;
      } else if (pr.kind === 'ball'){ const wr = pr.hand === 'L' ? wL : wR, c = add(wr, [0, 0, 4.4]);
        s = sphere(c, 4.2, matOf('#ef8a3c'), 1); at2 = c;
      } else if (pr.kind === 'box' || pr.kind === 'basket' || pr.kind === 'plates'){
        const c = add(mid, mul(Fw, 3.5)), u = n3(sub(wL, wR)), half = len3(sub(wL, wR))/2 - 1, dep = 7.5, ht = pr.kind === 'plates' ? 4 : 9;
        const fl = n3(cross([0, 0, 1], u)), corner = (a, b, z) => add(add(add(c, mul(u, a)), mul(fl, b)), [0, 0, z]);
        const pts = []; for (const a of [-half, half]) for (const b of [-dep, dep]) for (const z of [-ht*.55, ht*.45]) pts.push(corner(a, b, z));
        const col = matOf(pr.kind === 'basket' ? '#d9a560' : pr.kind === 'plates' ? '#fbfaf3' : '#d9a86c');
        const fcs = [[u, [[half, -dep, -ht*.55], [half, dep, -ht*.55], [half, dep, ht*.45], [half, -dep, ht*.45]]], [mul(u, -1), [[-half, -dep, -ht*.55], [-half, dep, -ht*.55], [-half, dep, ht*.45], [-half, -dep, ht*.45]]],
          [fl, [[-half, dep, -ht*.55], [half, dep, -ht*.55], [half, dep, ht*.45], [-half, dep, ht*.45]]], [mul(fl, -1), [[-half, -dep, -ht*.55], [half, -dep, -ht*.55], [half, -dep, ht*.45], [-half, -dep, ht*.45]]],
          [[0, 0, 1], [[-half, -dep, ht*.45], [half, -dep, ht*.45], [half, dep, ht*.45], [-half, dep, ht*.45]]]];
        for (const [nn, q] of fcs) if (vis(nn)) s += face(pd(q.map(([a, b, z]) => corner(a, b, z))), toneI(nn, col));
        if (pr.kind === 'basket') s += fill(pd([corner(-half + 1.5, -dep + 1.5, ht*.46), corner(half - 1.5, -dep + 1.5, ht*.46), corner(half - 1.5, dep - 1.5, ht*.46), corner(-half + 1.5, dep - 1.5, ht*.46)]), '#f2e6c8');
        if (pr.kind === 'box') s += ink(pd([corner(0, -dep, ht*.45), corner(0, dep, ht*.45)], false), .8);
        s += ink(hullOf(pts), 1.3); pts.forEach(p => all.push(p));
        // the hands go on top of the load
        s += disc2(add(wL, mul(n3(sub(wL, P3.elbL)), 1.6)), B.w.hand, skin.l, 1) + disc2(add(wR, mul(n3(sub(wR, P3.elbR)), 1.6)), B.w.hand, skin.l, 1);
        at2 = add(c, mul(Fw, 1));
        put(at2, s, 4); s = '';
      } else if (pr.kind === 'bags'){
        for (const [wr, col] of [[wL, '#f0d9a8'], [wR, '#cfe8de']]){ const t = add(wr, [0, 0, -2]);
          const c = add(t, [0, 0, -7]); const pts = [];
          for (const a of [-4.5, 4.5]) for (const b of [-2.5, 2.5]) for (const z of [-6, 6]) pts.push(add(add(c, mul(Fw, a)), add(mul(Sv, b), [0, 0, z])));
          const sB = box(c[0] - 3.6, c[1] - 3.6, c[2] - 6, c[0] + 3.6, c[1] + 3.6, c[2] + 6, matOf(col), toneI, .9) +
            ink(pd([add(c, [-1.5, -1.5, 6]), t, add(c, [1.5, 1.5, 6])], false), .9);
          put(c, sB, depthOf(c) > depthOf(hip) ? 3 : -3); pts.forEach(p => all.push(p)); }
      }
      if (s) put(at2, s, 4.2);
    }

    // sleeping: a blanket over the body, the head on its pillow
    if (sleeping){
      parts.length = 0;
      const BL = [-.05, .3, .7, 1.05].map(t => ({ c: add(lerp3(lerp3(P3.ankleL, P3.ankleR, .5), neck, t), [0, 0, 1.5]), a: n3(sub(neck, P3.ankleL)), s: Sv, rs: h.shW + 4 - t*1.5, rf: 5.5 }));
      const BR = rings3(BL), m = matOf(opts.blanket || '#f3d9a4');
      if (!opts.inBed) put(hip, bandBody(BR, m) + ink(hullOf([].concat(...BR)), 1.5), 0);
      const r = h.head, hs = B.scarf ? sphere(head, r*1.1, matOf(B.col.scarf), 1.4) + capShape(head, r*1.105, HF, r*.66, skin.l, .8)
        : sphere(head, r, skin, 1.4) + (B.col.hair ? capShape(head, r*1.01, mul(HF, -1), r*.1, B.col.hair, .7) : '') + (B.hat === 'kufi' ? capShape(head, r*1.05, HD, r*.42, B.col.kufi, 1) : '');
      put(head, hs, 2);
    }

    parts.sort((p, q) => p.z - q.z);
    const bb = [[0, 1, 2].map(i => Math.min(...all.map(p => p[i]))), [0, 1, 2].map(i => Math.max(...all.map(p => p[i])))];
    bb[0][2] = Math.min(bb[0][2], at[2]);
    const svg = `<g class="fam fam-${name}">` + shadow + parts.map(p => p.svg).join('') + '</g>';
    return { svg, box: bb, head };
  }

  /* ---------------- the public drawing API, with a small cache ---------------- */
  const CACHE = new Map(); let lastCost = { ms: 0, nodes: 0 };
  function key(name, pose, at, facing, frame, opts){
    return [name, pose, at.map(v => v.toFixed(1)).join(','), (+facing || 0).toFixed(1), frame || 0, YAW.toFixed(2), PITCH.toFixed(2), OX, OY, (INK_K || 1).toFixed(3), SKIN, opts ? JSON.stringify(opts) : ''].join('|');
  }
  function draw(name, pose, at, facing, frame, opts){
    at = at || [0, 0, 0];
    const k = key(name, pose, at, facing, frame, opts);
    let r = CACHE.get(k);
    if (!r){ const t0 = performance.now(); const fg = figure(name, pose, at, facing, frame, opts);
      r = { box: fg.box, at: [(fg.box[0][0] + fg.box[1][0])/2, (fg.box[0][1] + fg.box[1][1])/2, at[2] + 30], svg: fg.svg, who: name, head: fg.head };
      // a head on the pillow sorts after its bed; a toddler in his cot sorts before it (the bars and the near side cover him)
      if (pose === 'sleep' && opts && opts.inBed) r.at = add(fg.head, [0, 0, 50]);
      if (pose === 'sleep' && opts && opts.inCot) r.at = sub(r.at, [0, 0, 60]);
      lastCost = { ms: performance.now() - t0, nodes: (fg.svg.match(/<(path|circle|ellipse|rect|polygon|text)\b/g) || []).length };
      CACHE.set(k, r); if (CACHE.size > 700) CACHE.delete(CACHE.keys().next().value); }
    else CACHE.delete(k), CACHE.set(k, r);
    return [Object.assign({ fl: floorOf(at) }, r)];
  }

  // one invisible frame round a set of figures: give it to a layer that holds only figures (the DYN layer), so the
  // hand-drawn filter's region (sized from the geometry) does not cut the tubes' thick strokes at its edge. One node.
  function pad(items, mg = 12){
    const pts = []; for (const it of items) for (const x of [it.box[0][0], it.box[1][0]]) for (const y of [it.box[0][1], it.box[1][1]]) for (const z of [it.box[0][2], it.box[1][2]]) pts.push(P(x, y, z));
    if (!pts.length) return '';
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x0 = Math.min(...xs) - mg, y0 = Math.min(...ys) - mg;
    return `<rect x="${fx(x0)}" y="${fx(y0)}" width="${fx(Math.max(...xs) + mg - x0)}" height="${fx(Math.max(...ys) + mg - y0)}" fill="none"/>`;
  }

  window.FAMILY = Object.assign(window.FAMILY || {}, {
    pad,
    PEOPLE, NAMES, POSES, POSE_NAMES, FRAMES,
    draw, svg: (...a) => draw(...a)[0].svg,
    cost: () => lastCost,
    setSkin(hex){ if (/^#[0-9a-f]{6}$/i.test(hex || '')){ SKIN = hex; CACHE.clear(); } },
    clearCache(){ CACHE.clear(); },
    _solve: solve,
  });

  /* ======================================================================================================
     The family's day: needs plus smart objects (The Sims model), on the real clock and the real prayer times.
     Deterministic: the same date, prayer times and day kind always give the same day.
     - Fixed blocks first (sleep, Fajr, meals and cooking, work, school, homework, the nap, Maghrib together, bedtimes).
     - The gaps are filled by needs: each person's hunger, fun, rest, social (and the toddler's urge to make mess) drop
       with time; every object ADVERTISES what it gives ({fun:+40}); the person takes the best offer for their needs,
       with a little seeded chance and a cost for changing floor. What they did leaves things behind (FAMILY.effects).
     - Walking follows the nav graph: along the front of each floor, through the room openings, up and down the stairs.
     ====================================================================================================== */
  function floorOf(at){ const H = window.HD; if (!H) return 0; if (at[2] < H.ZF[0] - 1) return -1; let fl = 0; for (let i = 0; i < H.ZF.length; i++) if (at[2] >= H.ZF[i] - 2) fl = i; return fl; }
  const MIN = 60000;
  const hashS = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const rngOf = seed => { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; }; };
  const dayKeyOf = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  const midnight = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const hm = (d, h, m) => midnight(d) + (h*60 + (m || 0))*MIN;

  /* ---------- rooms (read at runtime from the house) ---------- */
  // what each part of the family's life needs, and which house rooms can stand in (an older or smaller house)
  const ALIAS = { parents: ['parents', 'bedroom'], sister: ['sister', 'bedroom'], nursery: ['nursery', 'bedroom'], myroom: ['myroom', 'bedroom'],
    kitchen: ['kitchen'], living: ['living', 'kitchen'], hall: ['hall', 'kitchen'], laundry: ['laundry'], bath: ['bath', 'bathroom', 'laundry'],
    prayer: ['prayer'], yard: ['yard', 'garden'] };
  const H = () => window.HD || {};
  const roomsT = ctx => (ctx && ctx.rooms) || H().ROOMS || {};
  function roomId(id, ctx){ const R = roomsT(ctx); if (R[id]) return id; for (const a of ALIAS[id] || []) if (R[a]) return a; return Object.keys(R)[0]; }
  function roomGeo(id, ctx){
    const R = roomsT(ctx), r = R[id] || {}, h = H(), HW = h.HW || 140;
    if (r.fl < 0){ const lot = h.LOT, gw = h.GW || 58;
      return { fl: -1, x0: r.x0 != null ? r.x0 : lot ? lot[0][0] + 10 : HW, x1: r.x1 != null ? r.x1 : lot ? lot[1][0] - 10 : HW + gw, y0: r.y0, y1: r.y1, z: r.z != null ? r.z : h.YARD_Z != null ? h.YARD_Z : lot ? 6 : 8 }; }
    return { fl: r.fl || 0, x0: r.x0 != null ? r.x0 : 0, x1: r.x1 != null ? r.x1 : HW, y0: r.y0, y1: r.y1, z: (h.ZF || [12, 200, 388])[r.fl || 0] };
  }
  const RA = new Map(); let RA_R = null;
  function roomAt(p, ctx){
    const R = roomsT(ctx); if (R !== RA_R){ RA.clear(); RA_R = R; }
    const k = Math.round(p[1]*2) + ',' + Math.round(p[2]); let r = RA.get(k);
    if (r !== undefined) return r;
    const fl = floorOf(p); r = null;
    for (const id in R){ const g = roomGeo(id, ctx); if (g.fl === fl && p[1] >= g.y0 - .5 && p[1] <= g.y1 + .5){ r = id; break; } }
    RA.set(k, r); if (RA.size > 4000) RA.clear(); return r;
  }

  /* ---------- smart objects ----------
     { id, room, at | anchor+off | spot:[x, fraction along the room], face (deg), pose, opts, who:[...], offers:{need:+per hour},
       makes: what it leaves behind, dur:[min,max] minutes, day: only in daylight, kind: 'free' | 'meal' | 'bed' | ... }
     Defaults read the house's anchors (HD.A, HD.SEATS); FAMILY.setObjects({ id: {...} }) overrides or adds. */
  const ALL = ['abu', 'ummi', 'sister', 'toddler'];
  let OVERRIDE = {}, OBJ_CACHE = null, OBJ_KEY = '';
  function baseObjects(){
    const h = H(), A = h.A || {}, Z = h.ZF || [12, 200, 388], seats = h.SEATS || [], plots = h.PLOTS || [];
    const an = (k, dx, dy, dz) => A[k] ? [A[k][0] + (dx || 0), A[k][1] + (dy || 0)] : null;
    const tbl = A.table || [87, 198];
    // free-time objects: each advertises what it gives ({need: +per 10 minutes}); dur in seconds of one go (20-90 s, then
    // the person re-decides); poses: one is picked per go. xy defaults fit the current house; setObjects overrides them.
    const S = [20, 90], AD = ['abu', 'ummi'];
    const O = [
      // the kitchen: Ummi stirs, chops and wipes; a snack; tea
      { id: 'cook', room: 'kitchen', xy: an('rack', 32, 14), spot: [62, .45], face: 180, pose: 'cook', opts: { counter: 75 }, who: ['ummi', 'abu'], offers: {}, makes: 'pots', dur: S, kind: 'cook' },
      { id: 'chop', room: 'kitchen', xy: [58, 178], spot: [62, .4], face: 180, pose: 'chop', opts: { counter: 75 }, who: ['ummi'], offers: { fun: 40 }, dur: S, kind: 'chore' },
      { id: 'wipe', room: 'kitchen', xy: [118, 198], spot: [118, .58], face: 180, pose: 'wipe', opts: { counter: 60 }, who: ['ummi', 'abu'], offers: { rest: 10 }, dur: [20, 50], kind: 'chore' },
      { id: 'snack', room: 'kitchen', xy: an('rack', 34, -18), spot: [64, .3], face: 180, pose: 'stand', who: ALL, offers: { hunger: 300 }, makes: 'cup', dur: [20, 40] },
      // the living room: cushions (tea, rest), the bookcase, blocks on the rug, a shelf that needs a screw
      { id: 'cushions', room: 'living', spot: [104, .32], face: 200, pose: 'sitfloor', poses: ['sitfloor', 'tea'], opts: { cup: 1 }, who: ['abu', 'ummi', 'sister'], offers: { rest: 80, social: 30 }, dur: S },
      { id: 'books', room: 'living', spot: [100, .66], face: 160, pose: 'read', who: ['abu', 'ummi', 'sister'], offers: { fun: 60, rest: 50 }, makes: 'books', dur: S },
      { id: 'blocks', room: 'living', spot: [112, .82], face: 210, pose: 'play', who: ['toddler'], offers: { fun: 160, mess: 200 }, makes: 'toys', dur: S },
      { id: 'fix-shelf', room: 'living', xy: [70, 292], spot: [70, .3], face: 180, pose: 'fix', who: ['abu'], offers: { fun: 70 }, dur: S, kind: 'chore' },
      // the hall and the laundry: fixing the door, folding, the washer
      { id: 'fix-door', room: 'hall', xy: [40, 74], spot: [40, .66], face: 180, pose: 'fix', who: ['abu'], offers: { fun: 60 }, dur: S, kind: 'chore' },
      { id: 'fold', room: 'laundry', xy: [110, 418], spot: [110, .65], face: 180, pose: 'fold', opts: { counter: 40 }, who: ['ummi', 'sister'], offers: { rest: 20 }, dur: S, kind: 'chore' },
      { id: 'washer', room: 'laundry', xy: an('washer', 34, 0), spot: [84, .45], face: 180, pose: 'carry', opts: { prop: 'basket' }, who: ['ummi'], offers: {}, makes: 'laundry', dur: [30, 50], kind: 'chore', once: true },
      { id: 'fix-washer', room: 'laundry', xy: [96, 392], spot: [96, .3], face: 180, pose: 'fix', who: ['abu'], offers: { fun: 50 }, dur: S, kind: 'chore' },
      // upstairs: the nursery toys and window, the sister's desk and floor, the parents' room (folding on the bed)
      { id: 'toys', room: 'nursery', xy: an('toychest', -26, -14), spot: [96, .7], face: 20, pose: 'play', who: ['toddler', 'sister'], offers: { fun: 160, mess: 220 }, makes: 'toys', dur: S },
      { id: 'window', room: 'nursery', spot: [44, .35], face: 180, pose: 'stand', look: true, who: ['toddler'], offers: { fun: 50 }, dur: [20, 35] },
      { id: 'draw', room: 'sister', xy: an('desk', 24, 0), spot: [44, .35], face: 180, pose: 'homework', opts: { seat: 28, desk: 44 }, who: ['sister'], offers: { fun: 140 }, makes: 'paper', dur: S },
      { id: 'readS', room: 'sister', xy: [104, 214], spot: [104, .4], face: 200, pose: 'read', who: ['sister'], offers: { fun: 90, rest: 50 }, makes: 'books', dur: S },
      { id: 'foldP', room: 'parents', xy: [104, 230], spot: [104, .55], face: 180, pose: 'fold', opts: { counter: 31 }, who: ['ummi'], offers: { rest: 20 }, dur: S, kind: 'chore' },
      { id: 'shoes', room: 'hall', xy: an('shoerack', 28, 0), spot: [40, .85], face: 180, pose: 'play', who: ['toddler'], offers: { fun: 80, mess: 160 }, makes: 'shoes', dur: [20, 40] },
      // the prayer corner: the Qur'an
      { id: 'quran', room: 'prayer', xy: an('mat', 14, -44), spot: [94, .25], face: 180, pose: 'read', who: ['abu', 'ummi', 'sister'], offers: { rest: 100 }, dur: S },
      // the yard, in daylight: swing, sandpit, ball, skipping rope, the plants to water
      { id: 'swing', room: 'yard', xy: an('swing', 0, 0), spot: [158, .7], face: 0, pose: 'sit', opts: { seat: 22 }, who: ['sister', 'toddler'], offers: { fun: 200 }, dur: S, day: true },
      { id: 'sandpit', room: 'yard', xy: an('sandpit', -6, 10), spot: [150, .25], face: 200, pose: 'play', who: ['toddler', 'sister'], offers: { fun: 170, mess: 160 }, makes: 'sand', dur: S, day: true },
      { id: 'ball', room: 'yard', xy: an('ball', -40, 0), spot: [126, .5], face: 0, pose: 'throw', who: ['sister', 'abu'], offers: { fun: 150, social: 60 }, makes: 'ball', dur: S, day: true },
      { id: 'skip', room: 'yard', xy: [118, 530], spot: [118, .5], face: 0, pose: 'skip', who: ['sister'], offers: { fun: 170 }, dur: S, day: true },
      { id: 'veg', room: 'yard', xy: plots[0] ? [plots[0].x + plots[0].w + 12, plots[0].y + plots[0].d/2] : null, spot: [100, .2], face: 180, pose: 'water', who: AD, offers: { rest: 60 }, makes: 'garden', dur: S, day: true, kind: 'chore' },
      // wudu at the bathroom basin, the front door
      { id: 'wudu', room: 'bath', xy: an('basin', 28, 0), spot: [44, .3], face: 180, pose: 'stand', who: ALL, offers: {}, dur: [4, 4], kind: 'wudu' },
      { id: 'door', room: 'hall', xy: [16, 61], spot: [16, .55], face: 180, pose: 'stand', who: ALL, offers: {}, kind: 'door' },
    ];
    // seats at the table (Abu, Ummi, the sister, the toddler), facing the table's middle
    ALL.forEach((who, i) => { const s = seats[i] || [tbl[0] + (i % 2 ? 13 : -13), tbl[1] + (i < 2 ? -24 : 24)];
      O.push({ id: 'seat-' + who, room: 'kitchen', xy: [s[0], s[1]], face: Math.atan2(tbl[1] - s[1], tbl[0] - s[0])/D2R, pose: 'sit', opts: { seat: who === 'toddler' ? 40 : 34 }, who: [who], offers: { hunger: 220, social: 120 }, makes: 'dishes', kind: 'meal' }); });
    // beds
    const bedS = A.bedS;
    // in bed: the head on the pillow (x about 20, the headboard at the back wall), the house's own duvet over the body
    // (opts.inBed: only the head is drawn, and it sorts after the bed); the cot has no duvet, so the toddler gets a blanket
    O.push({ id: 'bed-abu', room: 'parents', spot: [69, .37], z: 31, face: 0, pose: 'sleep', opts: { inBed: true }, who: ['abu'], offers: { rest: 200 }, kind: 'bed' },
           { id: 'bed-ummi', room: 'parents', spot: [65, .63], z: 31, face: 0, pose: 'sleep', opts: { inBed: true }, who: ['ummi'], offers: { rest: 200 }, kind: 'bed' },
           { id: 'bed-sister', room: 'sister', xy: bedS ? [56, bedS[1]] : null, spot: [56, .78], z: 31, face: 0, pose: 'sleep', opts: { inBed: true }, who: ['sister'], offers: { rest: 200 }, kind: 'bed' },
           { id: 'cot', room: 'nursery', spot: [37, .283], z: 27, face: 0, pose: 'sleep', opts: { inCot: true }, who: ['toddler'], offers: { rest: 260 }, kind: 'bed' });
    // the prayer rows (TEACHER REVIEW): the imam (Abu) in front; the child's place beside him on his right (a boy) or in
    // the row behind (a girl); Ummi and the sister in the row behind; the toddler beside them, copying.
    const mat = A.mat || [80, 0, 0], my = A.mat ? mat[1] : null;
    const prow = (id, dx, dy, who) => O.push({ id, room: 'prayer', xy: my != null ? [mat[0] + dx, my + dy] : null, spot: [80 + dx, .5], dyF: dy, face: 180, pose: 'qiyam', who, offers: { rest: 40, social: 60 }, kind: 'pray' });
    prow('pray-abu', -30, 0, ['abu']); prow('pray-ummi', 24, 30, ['ummi']); prow('pray-sister', 24, 2, ['sister']); prow('pray-toddler', 24, -24, ['toddler']);
    prow('pray-child-boy', -30, 28, []); prow('pray-child-girl', 24, 56, []);
    return O;
  }
  let OBJ_VER = 0, OBJ_ROOMS = null;
  function objects(ctx){
    const R = roomsT(ctx);
    if (OBJ_CACHE && OBJ_ROOMS === R) return OBJ_CACHE;
    const k = JSON.stringify(Object.keys(R)) + JSON.stringify(OVERRIDE) + (H().HDP || 0);
    OBJ_ROOMS = R;
    if (OBJ_CACHE && OBJ_KEY === k) return OBJ_CACHE;
    const out = {};
    for (const o of baseObjects()){ const ov = OVERRIDE[o.id]; out[o.id] = ov ? Object.assign({}, o, ov) : o; }
    for (const id in OVERRIDE) if (!out[id]) out[id] = Object.assign({ id, who: ALL, offers: {}, face: 0, pose: 'stand', dur: [10, 20] }, OVERRIDE[id]);
    for (const id in out){ const o = out[id]; o.room = roomId(o.room, ctx); o.at = place(o, ctx); }
    OBJ_CACHE = out; OBJ_KEY = k; return out;
  }
  function place(o, ctx){
    if (o.at && o.at.length === 3 && OVERRIDE[o.id] && OVERRIDE[o.id].at) return o.at;
    const g = roomGeo(o.room, ctx);
    let x, y;
    if (o.xy && o.xy[1] >= g.y0 - 1 && o.xy[1] <= g.y1 + 1){ x = o.xy[0]; y = o.xy[1]; }
    else { x = Math.max(g.x0 + 8, Math.min(g.x1 - 8, o.spot[0])); y = g.y0 + (g.y1 - g.y0)*o.spot[1] + (o.dyF || 0); }
    return [x, Math.max(g.y0 + 6, Math.min(g.y1 - 6, y)), g.z + (o.z || 0)];
  }

  /* ---------- the walking graph ----------
     Default for the house as drawn: a lane along the open front of each floor (x = 112), the front door, the back door
     to the yard, and straight flights against the right wall (bottom at the front, x = 134, top at the back, x = 26).
     FAMILY.setNav({ nodes: {id: [x,y,z]}, edges: [[a, b], ...], entry: { roomId: nodeId } }) replaces it. */
  let NAV = null, NAV_SET = null;
  function nav(ctx){
    if (NAV_SET) return NAV_SET;
    const k = JSON.stringify(roomsT(ctx));
    if (NAV && NAV.k === k) return NAV;
    const h = H(), Z = h.ZF || [12, 200, 388], R = roomsT(ctx), nodes = {}, edges = [], entry = {}, LX = 112;
    const floors = [...new Set(Object.keys(R).map(id => R[id].fl).filter(f => f >= 0))].sort();
    for (const fl of floors){
      const ids = Object.keys(R).filter(id => R[id].fl === fl).sort((a, b) => R[a].y0 - R[b].y0);
      const ys = new Set();
      for (const id of ids){ const g = roomGeo(id, ctx); ys.add(Math.max(48, (g.y0 + g.y1)/2)); if (g.y0 > 0) ys.add(Math.max(48, g.y0)); }
      ys.add(48);
      const sorted = [...ys].sort((a, b) => a - b);
      sorted.forEach((y, i) => { nodes['l' + fl + '_' + i] = [LX, y, Z[fl]]; if (i) edges.push(['l' + fl + '_' + (i - 1), 'l' + fl + '_' + i]); });
      for (const id of ids){ const g = roomGeo(id, ctx), yc = Math.max(48, (g.y0 + g.y1)/2); entry[id] = 'l' + fl + '_' + sorted.indexOf(yc); }
      // stairs up from this floor (if there is a floor above)
      if (floors.includes(fl + 1)){
        nodes['sb' + fl] = [134, 17, Z[fl]]; nodes['sa' + fl] = [128, 42, Z[fl]];
        nodes['st' + fl] = [26, 17, Z[fl + 1]]; nodes['sx' + fl] = [24, 44, Z[fl + 1]];
        edges.push(['l' + fl + '_0', 'sa' + fl], ['sa' + fl, 'sb' + fl], ['sb' + fl, 'st' + fl, 'stairs'], ['st' + fl, 'sx' + fl], ['sx' + fl, 'l' + (fl + 1) + '_0']);
      }
    }
    // the yard, through the back door at the end of the ground floor
    const yard = Object.keys(R).find(id => R[id].fl < 0);
    if (yard){ const g = roomGeo(yard, ctx), last = Object.keys(nodes).filter(n => n.startsWith('l0_')).sort((a, b) => nodes[a][1] - nodes[b][1]).pop();
      const HDP = h.HDP || g.y0; nodes.back = [116, HDP - 6, Z[0]]; nodes.yard = [Math.min(g.x1 - 10, 122), g.y0 + 24, g.z];
      if (last) edges.push([last, 'back'], ['back', 'yard']); entry[yard] = 'yard'; }
    NAV = { k, nodes, edges, entry };
    return NAV;
  }
  function route(from, to, ctx){
    const N = nav(ctx), ra = roomAt(from, ctx), rb = roomAt(to, ctx);
    if (!ra || !rb || ra === rb) return [from, to];
    const a = N.entry[ra], b = N.entry[rb];
    if (!a || !b) return [from, to];
    const adj = {}; for (const [p, q] of N.edges){ (adj[p] = adj[p] || []).push(q); (adj[q] = adj[q] || []).push(p); }
    const dist = { [a]: 0 }, prev = {}, todo = new Set([a]);
    while (todo.size){ let u = null; for (const n of todo) if (u === null || dist[n] < dist[u]) u = n; todo.delete(u); if (u === b) break;
      for (const v of adj[u] || []){ const d = dist[u] + len3(sub(N.nodes[u], N.nodes[v])); if (dist[v] == null || d < dist[v]){ dist[v] = d; prev[v] = u; todo.add(v); } } }
    if (dist[b] == null) return [from, to];
    const path = []; for (let n = b; n; n = prev[n]) path.unshift(N.nodes[n]);
    return [from].concat(path, [to]);
  }
  const pathLen = p => { let s = 0; for (let i = 1; i < p.length; i++) s += len3(sub(p[i], p[i - 1])); return s; };

  /* ---------- the day ----------
     Fixed anchors first (sleep, Fajr, meals and cooking, work, school, homework, the nap, Maghrib together, bedtimes),
     then social moments (two people meet and chat, Ummi picks up the toddler, the sister plays with him, tea), seeded
     into times when both are free. Between them, an autonomy loop (The Sims): every 20-90 s each person re-decides
     from their needs and the objects' offers, walks there and does an animated activity. The loop is lazy and
     deterministic (the same date always gives the same day, so a refresh never teleports anyone): it is simulated
     forward only as far as someone asks, and state(t) is a pure function of t. */
  const SPEED = { abu: 75, ummi: 70, sister: 68, toddler: 40 };           // units per second (1 unit = 1.6 cm)
  const LANE = { abu: 9, ummi: -5, sister: 3, toddler: -12 };              // each keeps a little to one side of the front lane
  const DECAY = { hunger: 11, fun: 14, rest: 6, social: 9, mess: 0 };     // per hour
  const TOD_DECAY = { hunger: 13, fun: 26, rest: 9, social: 8, mess: 22 };
  function timesOf(date, ctx){
    let t = ctx && ctx.times;
    if (!t){ try { t = window.HL && HL.times ? HL.times(date) : window.HHPrayer && HHPrayer.times(date); } catch (e) { t = null; } }
    const ok = t && ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].every(k => t[k] instanceof Date && !isNaN(t[k]));
    if (ok) return t;
    const at = (h, m) => new Date(hm(date, h, m));
    return { fajr: at(5, 30), sunrise: at(6, 50), dhuhr: at(12, 30), asr: at(15, 45), maghrib: at(18, 15), isha: at(19, 45) };
  }
  function kindOf(date, ctx){
    let k = ctx && ctx.dayKind;
    if (!k && ctx && ctx.kind && typeof ctx.kind === 'object' && 'schoolDay' in ctx.kind) k = { school: !!ctx.kind.schoolDay, friday: !!ctx.kind.friday };
    if (!k && window.HHDays && HHDays.kind){ try { const K = HHDays.kind(date); k = { school: !!K.schoolDay, friday: !!K.friday, ramadan: !!K.ramadan, holiday: !!(K.eidFitr || K.eidAdha) }; } catch (e) {} }
    if (typeof k === 'string') k = { school: k === 'school', friday: date.getDay() === 5 };
    if (!k){ const d = date.getDay(); k = { school: d >= 1 && d <= 5, friday: d === 5 }; }
    return { school: !!k.school, friday: !!k.friday };
  }
  // TEACHER REVIEW: the order of the postures in each rak'ah (the family's Maghrib together is drawn from this).
  // the salah, posture by posture (seconds), for a prayer of n rak'ahs, all following the imam together
  function salahSeq(n){
    const s = [['takbir', 4]];
    for (let r = 1; r <= n; r++){
      s.push(['qiyam', r === 1 ? 52 : 40], ['ruku', 12], ['itidal', 6], ['sujood', 10], ['julus', 6], ['sujood', 10]);
      if (r === 2 && n > 2) s.push(['julus', 32], ['takbir', 3]);
    }
    s.push(['julus', 55], ['salamR', 4], ['salamL', 4], ['julus', 90]);       // the last tashahhud, the salam, a little dhikr
    return s;
  }
  const seqLen = q => q.reduce((a, b) => a + b[1], 0)*1000;
  function salahAt(seq, ms){ let t = 0; for (const [p, d] of seq){ t += d*1000; if (ms < t) return p; } return 'julus'; }

  // shared spots (the door, the basin, the snack counter): each person stands a little apart
  const SHARE = { door: 1, wudu: 1, snack: 1, cushions: 1, books: 1, ball: 1, toys: 1, sandpit: 1, tea: 1 };
  const OFFS = { abu: [0, -13, 0], ummi: [4, 0, 0], sister: [0, 13, 0], toddler: [10, 24, 0] };
  const spotFor = (o, who) => SHARE[o.id] ? add(o.at, OFFS[who]) : o.at;
  const travel = (who, path, crawl) => pathLen(path)/((crawl ? 22 : SPEED[who])*(path.some((p, i) => i && Math.abs(p[2] - path[i - 1][2]) > 30) ? .75 : 1))*1000 + 400;
  const laneOf = (who, path) => path.map((p, i, a) => i && i < a.length - 1 && Math.abs(p[0] - 112) < 1 ? [p[0] + LANE[who], p[1], p[2]] : p);

  // social moments: who, what, where (TEACHER-free: no religious text here)
  const SOCIAL = [
    { kind: 'chat', a: 'ummi', b: 'abu', rooms: ['kitchen', 'living', 'yard'], pa: 'talk', pb: 'nod', dur: [40, 80], w: 3, adults: true },
    { kind: 'chat', a: 'sister', b: 'ummi', rooms: ['kitchen', 'living', 'sister'], pa: 'talk', pb: 'nod', dur: [35, 70], w: 3 },
    { kind: 'chat', a: 'abu', b: 'sister', rooms: ['living', 'yard', 'kitchen'], pa: 'talk', pb: 'nod', dur: [35, 70], w: 2 },
    { kind: 'pickup', a: 'ummi', b: 'toddler', rooms: ['living', 'nursery', 'kitchen'], pa: 'holdkid', pb: 'held', dur: [30, 60], w: 3 },
    { kind: 'play', a: 'sister', b: 'toddler', rooms: ['nursery', 'living', 'yard'], pa: 'play', pb: 'play', dur: [60, 90], w: 3 },
    { kind: 'tea', a: 'abu', b: 'ummi', rooms: ['living'], pa: 'tea', pb: 'tea', dur: [60, 90], w: 2, adults: true },
    { kind: 'play', a: 'ummi', b: 'toddler', rooms: ['nursery', 'living'], pa: 'play', pb: 'play', dur: [40, 80], w: 2 },
  ];

  const DAY_CACHE = new Map(), ROUTE_CACHE = new Map();
  // routes are cached per pair of rooms (the middle part through the nav graph); the two ends are the real spots
  function routeC(from, to, ctx){
    const ra = roomAt(from, ctx), rb = roomAt(to, ctx);
    if (!ra || !rb || ra === rb) return [from, to];
    const k = ra + '>' + rb + (NAV_SET ? 'n' : '');
    let mid = ROUTE_CACHE.get(k);
    if (!mid){ const r = route(from, to, ctx); mid = r.slice(1, -1); ROUTE_CACHE.set(k, mid); }
    return [from].concat(mid, [to]);
  }
  // a fast path for the many calls of one day (12 a second from the live layer): a cheap signature of the ctx
  const PLAN_MEMO = { k: '', day: null };
  const ctxSig = (date, ctx) => { const t = ctx.times, kd = ctx.kind; return dayKeyOf(date) + '|' + (ctx.dayKind || '') + '|' + (t && t.maghrib ? +t.maghrib : '') + '|' +
    (kd && typeof kd === 'object' ? (kd.schoolDay ? 1 : 0) + '' + (kd.friday ? 1 : 0) : '') + '|' + (ctx.childGirl ? 1 : 0) + '|' + OBJ_VER + '|' + (NAV_SET ? 1 : 0) + '|' + (ctx.rooms ? 'r' : ''); };
  function plan(date, ctx){
    ctx = ctx || {};
    const sig = ctxSig(date, ctx);
    if (PLAN_MEMO.k === sig && PLAN_MEMO.day) return PLAN_MEMO.day;
    const day = plan0(date, ctx); PLAN_MEMO.k = sig; PLAN_MEMO.day = day; return day;
  }
  function plan0(date, ctx){
    const t = timesOf(date, ctx), K = kindOf(date, ctx), O0 = objects(ctx), dk = dayKeyOf(date);
    const key = dk + '|' + ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].map(k => t[k].getTime()).join(',') + '|' + JSON.stringify(K) + '|' + OBJ_KEY + '|' + (NAV_SET ? 'n' : '') + (ctx.childGirl ? 'g' : '');
    if (DAY_CACHE.has(key)) return DAY_CACHE.get(key);
    const R = rngOf(hashS('hh.family.' + dk)), D0 = midnight(date), DEND = D0 + 24*60*MIN;
    const T = k => t[k].getTime(), M = T('maghrib'), I = T('isha'), F = T('fajr'), SR = T('sunrise'), DH = T('dhuhr'), AS = T('asr');
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const school = K.school, work = school;
    const breakfast = school ? hm(date, 7, 30) : hm(date, 8, 30), lunch = hm(date, 13, 0);
    let dinner = M > hm(date, 19, 30) ? hm(date, 18, 30) : clamp(M + 30*MIN, hm(date, 17, 15), hm(date, 19, 45));
    const mgS = M + 5*MIN, mgSeq = salahSeq(3), mgE = mgS + seqLen(mgSeq);
    if (dinner < mgE && dinner > M - 40*MIN) dinner = mgE + 10*MIN;
    const leave = hm(date, 8, 5), backAbu = clamp(M - 25*MIN, hm(date, 15, 30), hm(date, 17, 45)), backSis = hm(date, 15, 25);
    const tbTod = clamp(M + 25*MIN, hm(date, 19, 15), hm(date, 21, 45)), tbSis = clamp(M + 40*MIN, hm(date, 20, 0), hm(date, 22, 0));
    const tbAd = clamp(I + 35*MIN, hm(date, 22, 0), hm(date, 23, 30));
    const meals = [['breakfast', breakfast, 25], ['lunch', lunch, 30], ['dinner', dinner, 30]];
    const B = { abu: [], ummi: [], sister: [], toddler: [] };
    const blk = (who, t0, t1, obj, act, ex) => { if (t1 > t0) B[who].push(Object.assign({ t0, t1, obj, act, fixed: true }, ex || {})); };
    const wakeAd = F - 12*MIN, wakeSis = school ? hm(date, 6, 55) : hm(date, 7, 40), wakeTod = school ? hm(date, 6, 50) : hm(date, 7, 30);
    blk('abu', D0, wakeAd, 'bed-abu', 'sleep'); blk('ummi', D0, wakeAd + 3*MIN, 'bed-ummi', 'sleep');
    blk('sister', D0, wakeSis, 'bed-sister', 'sleep'); blk('toddler', D0, wakeTod, 'cot', 'sleep');
    blk('abu', tbAd + 10*MIN, DEND, 'bed-abu', 'sleep'); blk('ummi', tbAd, DEND, 'bed-ummi', 'sleep');
    blk('sister', tbSis, DEND, 'bed-sister', 'sleep'); blk('toddler', tbTod, DEND, 'cot', 'sleep');
    const pray = (who, t0, n, name) => { blk(who, t0 - 6*MIN, t0 - 2*MIN, 'wudu', 'wudu'); blk(who, t0, t0 + seqLen(salahSeq(n)), 'pray-' + who, 'pray', { prayer: name, n }); };
    for (const who of ['abu', 'ummi']){ pray(who, F + 6*MIN, 2, 'fajr'); if (F < hm(date, 6, 0)) blk(who, F + 14*MIN, hm(date, 6, 40) + (who === 'ummi' ? 0 : 5*MIN), who === 'abu' ? 'bed-abu' : 'bed-ummi', 'sleep'); }
    for (const [name, m0, len] of meals){
      blk('ummi', m0 - (name === 'dinner' ? 45 : name === 'lunch' ? 35 : 25)*MIN, m0 - 2*MIN, 'cook', 'cook', { meal: name });
      for (const who of ALL) blk(who, m0, m0 + len*MIN, 'seat-' + who, 'meal', { meal: name });
    }
    if (work) blk('abu', leave, backAbu, 'door', 'out', { away: 'work' });
    else if (K.friday) blk('abu', DH - 25*MIN, DH + 60*MIN, 'door', 'out', { away: 'mosque' });
    if (school){ blk('sister', leave + 4*MIN, backSis, 'door', 'out', { away: 'school' }); blk('sister', backSis + 30*MIN, backSis + 70*MIN, 'draw', 'homework'); }
    blk('toddler', hm(date, 13, 40), hm(date, 15, 0), 'cot', 'nap');
    pray('ummi', DH + 10*MIN, 4, 'dhuhr'); pray('ummi', AS + 6*MIN, 4, 'asr');
    if (!work && !K.friday) pray('abu', DH + 10*MIN, 4, 'dhuhr');
    if (!work || AS > backAbu) pray('abu', AS + 6*MIN, 4, 'asr');
    if (AS > backSis || !school) pray('sister', AS + 6*MIN, 4, 'asr');
    for (const who of ['abu', 'ummi']) pray(who, I + 6*MIN, 4, 'isha');
    if (tbSis > I + 6*MIN) pray('sister', I + 6*MIN, 4, 'isha');
    for (const who of ALL){ if (who !== 'toddler') blk(who, mgS - 7*MIN, mgS - 3*MIN, 'wudu', 'wudu');
      blk(who, mgS, mgE, 'pray-' + who, 'pray', { prayer: 'maghrib', n: 3, together: true, lag: who === 'toddler' ? 2500 : 0 }); }
    // resolve overlaps (higher priority wins: prayer > wudu > meal > out > the rest > sleep)
    const P = {};
    for (const who of ALL){
      const L = B[who], out = [];
      L.forEach((b, i) => { b.pri = (b.act === 'pray' ? 5 : b.act === 'wudu' ? 4 : b.act === 'meal' ? 3 : b.act === 'out' ? 2 : b.act === 'sleep' ? 0 : 1) + i*1e-4; });
      for (const b of L.slice().sort((a, b2) => b2.pri - a.pri)){ let segs = [[b.t0, b.t1]];
        for (const o of out){ const nx = []; for (const [a, c] of segs){ if (c <= o.t0 || a >= o.t1) nx.push([a, c]); else { if (a < o.t0) nx.push([a, o.t0]); if (c > o.t1) nx.push([o.t1, c]); } } segs = nx; }
        for (const [a, c] of segs) if (c - a > (b.act === 'pray' || b.act === 'wudu' ? 60000 : 6*MIN)) out.push(Object.assign({}, b, { t0: a, t1: c })); }
      out.sort((a, b) => a.t0 - b.t0);
      P[who] = out.filter(b => !(b.act !== 'out' && out.some(o => o.act === 'out' && b.t0 >= o.t0 && b.t1 <= o.t1 && o !== b)));
    }
    // social moments, seeded into times when both people are home, awake and free
    const O = Object.assign({}, O0), events = [];
    const free = (who, a, b) => !P[who].some(x => x.t0 < b && x.t1 > a);
    const daylight = tm => tm > SR + 30*MIN && tm < M - 15*MIN;
    let tm = hm(date, 7, 0) + Math.floor(R()*6)*MIN, ne = 0, lastK = '';
    while (tm < hm(date, 21, 30)){
      const pool = R() < .3 ? [] : SOCIAL.filter(e => e.kind + e.a + e.b !== lastK && free(e.a, tm - 90000, tm + e.dur[1]*1000 + 30000) && free(e.b, tm - 90000, tm + e.dur[1]*1000 + 30000));
      if (pool.length){
        let w = pool.reduce((s, e) => s + e.w, 0)*R(), e = pool[0]; for (const c of pool){ w -= c.w; if (w <= 0){ e = c; break; } }
        const rooms = e.rooms.filter(r => r !== 'yard' || daylight(tm)), room = roomId(rooms[Math.floor(R()*rooms.length)], ctx), g = roomGeo(room, ctx);
        const dur = (e.dur[0] + R()*(e.dur[1] - e.dur[0]))*1000, x = g.fl < 0 ? Math.min(g.x1 - 20, 130) : Math.min(g.x1 - 22, 104 + R()*14), yc = g.y0 + (g.y1 - g.y0)*(.35 + R()*.3);
        const id = 'meet' + ne++, sep = e.kind === 'pickup' ? 0 : e.kind === 'play' ? 21 : 13, fa = e.kind === 'pickup' ? 30 : 90;
        O[id + '-' + e.a] = { id: id + '-' + e.a, room, at: [x, yc - sep, g.z], face: fa, pose: e.pa, who: [e.a], offers: { social: 160, fun: 40 }, kind: 'social', opts: e.kind === 'tea' ? { cup: 1 } : null };
        O[id + '-' + e.b] = { id: id + '-' + e.b, room, at: [x, yc + sep, g.z], face: e.kind === 'pickup' ? fa : fa - 180, pose: e.pb, who: [e.b], offers: { social: 160, fun: 60 }, kind: 'social' };
        const ev = { id, kind: e.kind, a: e.a, b: e.b, t0: tm, t1: tm + dur, room };
        events.push(ev); lastK = e.kind + e.a + e.b;
        P[e.a].push({ t0: tm, t1: tm + dur, obj: id + '-' + e.a, act: 'social', social: e.kind, partner: e.b, fixed: true });
        P[e.b].push({ t0: tm, t1: tm + dur, obj: id + '-' + e.b, act: 'social', social: e.kind, partner: e.a, fixed: true, held: e.kind === 'pickup' });
        P[e.a].sort((a, b) => a.t0 - b.t0); P[e.b].sort((a, b) => a.t0 - b.t0);
      }
      tm += (6 + R()*9)*MIN;
    }
    const day = { key, date: new Date(D0 + 12*3600000), D0, DEND, times: t, kind: K, O, P, events, meals: { breakfast, lunch, dinner }, maghrib: { start: mgS, end: mgE }, leave, backAbu, backSis, tbTod, tbSis, tbAd, sims: {}, ctx, SR, M };
    for (const who of ALL) day.sims[who] = newSim(day, who);
    // segs as a lazy view (the whole day is simulated only when someone asks for all of it)
    day.segsUntil = (who, until) => { extend(day, who, until); return day.sims[who].segs; };
    Object.defineProperty(day, 'segs', { get(){ const o = {}; for (const w of ALL) o[w] = day.segsUntil(w, DEND); return o; } });
    DAY_CACHE.set(key, day); if (DAY_CACHE.size > 4) DAY_CACHE.delete(DAY_CACHE.keys().next().value);
    return day;
  }

  /* ---------- the autonomy loop for one person ---------- */
  function newSim(day, who){
    const f0 = day.P[who][0];
    return { who, i: 0, tNow: day.D0, pos: spotFor(day.O[f0 ? f0.obj : 'door'], who), need: { hunger: 70, fun: 70, rest: 90, social: 70, mess: 60 },
      last: null, used: {}, rnd: rngOf(hashS('hh.family.' + dayKeyOf(day.date) + '.' + who)), segs: [] };
  }
  function extend(day, who, until){ const s = day.sims[who]; let g = 0; while (s.tNow < until && s.tNow < day.DEND && g++ < 20000) step(day, s); }
  const live = (s, t0, t1, offers, who) => { const mins = (t1 - t0)/60000, dec = who === 'toddler' ? TOD_DECAY : DECAY;
    for (const k in s.need) s.need[k] = Math.max(0, Math.min(100, s.need[k] - dec[k]*mins/60 + ((offers && offers[k]) || 0)*mins/10)); };
  function walkTo(day, s, to, t0, ex){
    if (len3(sub(to, s.pos)) < 3) return t0;
    const crawl = s.who === 'toddler' && s.rnd() < .35 && Math.abs(to[2] - s.pos[2]) < 1;
    const path = laneOf(s.who, routeC(s.pos, to, day.ctx)), dur = travel(s.who, path, crawl);
    s.segs.push(Object.assign({ t0, t1: t0 + dur, kind: 'walk', path, len: pathLen(path), crawl }, ex || {}));
    live(s, t0, t0 + dur, null, s.who); s.pos = to; return t0 + dur;
  }
  // where someone is at time t (for the toddler following his sister)
  function posAt(day, who, t){ extend(day, who, t + 1000); const segs = day.sims[who].segs; let s = null;
    for (let i = segs.length - 1; i >= 0; i--) if (segs[i].t0 <= t && segs[i].kind !== 'event'){ s = segs[i]; break; }
    if (!s || s.kind === 'out' || s.kind === 'sleep') return null;
    if (s.kind === 'walk') return null;
    return s.at || (day.O[s.obj] && spotFor(day.O[s.obj], who)); }
  function step(day, s){
    const who = s.who, O = day.O, b = day.P[who][s.i], nextT = b ? b.t0 : day.DEND;
    let lead = 0, to = null;
    if (b){ const o = O[b.obj]; to = o ? spotFor(o, who) : s.pos; lead = travel(who, laneOf(who, routeC(s.pos, to, day.ctx))) + (b.act === 'out' ? 4*MIN : b.act === 'meal' ? 90000 : b.act === 'pray' ? 30000 : 0); }
    if (b && nextT - s.tNow <= lead + 20000){
      // the next fixed thing: walk there (now), wait if early, then do it
      const o = O[b.obj], arr = walkTo(day, s, to, s.tNow);
      if (o && b.t0 - arr > 4000 && b.t0 > day.D0 + 60000) s.segs.push({ t0: arr, t1: b.t0, kind: 'act', obj: b.obj, act: 'wait', pose: b.act === 'meal' ? 'sit' : b.act === 'sleep' || b.act === 'nap' ? 'stand' : b.act === 'social' && o.pose === 'play' ? 'play' : 'stand', at: to });
      const t0 = Math.max(arr, b.t0);
      if (b.act === 'out'){ s.segs.push({ t0, t1: b.t1, kind: 'out', obj: 'door', act: 'out', away: b.away, at: to });
        if (b.away === 'school') s.segs.push({ t0: b.t1, t1: b.t1, kind: 'event', makes: 'shoes', obj: 'door' }, { t0: b.t1, t1: b.t1, kind: 'event', makes: 'bag', obj: 'door' }); }
      else s.segs.push(Object.assign({ t0, t1: b.t1, kind: b.act === 'sleep' || b.act === 'nap' ? 'sleep' : 'act', obj: b.obj, act: b.act, pose: b.act === 'meal' ? 'eat' : o ? o.pose : 'stand', at: to,
        makes: b.act === 'meal' ? 'dishes' : b.act === 'cook' ? 'pots' : b.act === 'homework' ? 'books' : null },
        b.prayer ? { prayer: b.prayer, n: b.n, lag: b.lag || 0, seq: salahSeq(b.n) } : {}, b.meal ? { meal: b.meal } : {}, b.social ? { social: b.social, partner: b.partner, held: !!b.held } : {}));
      if (b.act === 'sleep' && b.t1 < day.DEND && b.t0 <= day.D0 + 60000) s.segs.push({ t0: b.t1, t1: b.t1, kind: 'event', makes: 'bed', obj: b.obj });
      live(s, t0, b.t1, o ? o.offers : null, who); s.tNow = Math.max(s.tNow + 1000, b.t1); s.i++;
      return;
    }
    if (!b && s.tNow >= day.DEND) return;
    // free time: re-decide from needs every 20-90 s
    const limit = nextT - lead - 20000;
    const daylight = day.SR + 30*MIN < s.tNow && s.tNow < day.M - 15*MIN;
    const here = roomAt(s.pos, day.ctx), fl = floorOf(s.pos);
    const scored = [];
    for (const id in O){ const o = O[id]; if (o.kind && o.kind !== 'free' && o.kind !== 'chore') continue; if (!o.who.includes(who)) continue;
      if (o.day && !daylight) continue; if (o.once && s.used[id]) continue;
      if (id === 'snack' && s.need.hunger > 55) continue;
      let sc = 0; for (const k in o.offers) sc += o.offers[k]*Math.pow(1 - s.need[k]/100, 2);
      if (o.kind === 'chore') sc += who === 'ummi' ? 18 : 6;
      if (id === s.last) sc -= 30;
      sc += o.room === here ? 14 : floorOf(o.at) === fl ? 4 : -10;
      sc += s.rnd()*16;
      scored.push([sc, o]); }
    // the toddler sometimes toddles after his sister or Ummi
    if (who === 'toddler'){ for (const tg of ['sister', 'ummi']){ const p = posAt(day, tg, s.tNow);
      if (p){ const sc = 26*Math.pow(1 - s.need.social/100, 1) + 10 + s.rnd()*16 + (roomAt(p, day.ctx) === here ? 8 : 0);
        scored.push([sc, { id: 'follow-' + tg, room: roomAt(p, day.ctx), at: add(p, [12, 16, 0]), face: -135, pose: 'stand', look: true, who: ['toddler'], offers: { social: 120, fun: 30 }, dur: [20, 45] }]); } } }
    scored.sort((a, b2) => b2[0] - a[0]);
    const o = scored.length ? scored[0][1] : null;
    if (!o || limit - s.tNow < 25000){ const t1 = Math.min(nextT, Math.max(s.tNow + 15000, limit));
      s.segs.push({ t0: s.tNow, t1, kind: 'act', obj: null, act: 'idle', pose: s.pos[2] === undefined ? 'stand' : 'stand', at: s.pos.slice() }); live(s, s.tNow, t1, null, who); s.tNow = t1; return; }
    const dur = ((o.dur ? o.dur[0] : 20) + s.rnd()*((o.dur ? o.dur[1] : 90) - (o.dur ? o.dur[0] : 20)))*1000;
    const spot = o.id.startsWith('follow') ? o.at : spotFor(o, who);
    const arr = walkTo(day, s, spot, s.tNow, { carry: o.pose === 'carry' ? o.opts && o.opts.prop : null });
    const end = Math.min(limit, arr + dur);
    if (end - arr < 8000){ s.tNow = Math.max(arr, s.tNow + 5000); return; }
    const pose = o.poses ? o.poses[Math.floor(s.rnd()*o.poses.length)] : o.pose;
    s.segs.push({ t0: arr, t1: end, kind: 'act', obj: o.id, act: o.kind === 'chore' ? o.id : 'free', pose, makes: o.makes, at: spot, face: o.face, opts: o.opts || null, look: !!o.look });
    live(s, arr, end, o.offers, who); s.tNow = end; s.last = o.id; if (o.once) s.used[o.id] = 1;
  }

  /* ---------- where everyone is right now ---------- */
  const ANIM = { cook: 700, chop: 260, wipe: 330, fold: 520, fix: 300, water: 600, tea: 1100, skip: 210, crawl: 230, talk: 380, nod: 520, holdkid: 900, held: 900,
    eat: 800, play: 650, homework: 520, read: 9000, throw: 420 };
  function along(path, d){
    for (let i = 1; i < path.length; i++){ const a = path[i - 1], b = path[i], l = len3(sub(b, a));
      if (d <= l || i === path.length - 1){ const u = l ? Math.min(1, d/l) : 1; return { p: lerp3(a, b, u), dir: sub(b, a) }; } d -= l; }
    return { p: path[path.length - 1], dir: [1, 0, 0] };
  }
  function segAt(day, who, now){
    const segs = day.segsUntil(who, now + 60000);
    let lo = 0, hi = segs.length - 1, k = -1;
    while (lo <= hi){ const m = (lo + hi) >> 1; if (segs[m].t0 <= now){ k = m; lo = m + 1; } else hi = m - 1; }
    while (k > 0 && segs[k].kind === 'event') k--;
    return k >= 0 ? segs[k] : segs[0];
  }
  function personAt(day, who, now, ctx){
    const s = segAt(day, who, now), O = day.O, B = PEOPLE[who];
    let st;
    if (s.kind === 'walk' && now >= s.t1){ const a = s.path[s.path.length - 1], b = s.path[s.path.length - 2] || a;
      st = { at: a.slice(), pose: 'stand', frame: 0, facing: Math.atan2(a[1] - b[1], a[0] - b[0])/D2R, activity: 'idle', opts: null, moving: null, visible: true }; }
    else if (s.kind === 'walk'){
      const u = Math.max(0, Math.min(1, (now - s.t0)/(s.t1 - s.t0))), d = s.len*u, a = along(s.path, d);
      const cyc = s.crawl ? B.legL*.9 : B.legL*1.36, fr = Math.floor(d/cyc*(s.crawl ? 4 : 6)) % (s.crawl ? 4 : 6);
      st = { at: a.p, pose: s.crawl ? 'crawl' : 'walk', frame: fr, facing: Math.atan2(a.dir[1], a.dir[0])/D2R, activity: 'walk', opts: s.carry ? { prop: s.carry } : null,
        moving: { from: s.path[0], to: s.path[s.path.length - 1], path: s.path, progress: u, toObj: s.to }, visible: true };
    } else {
      const o = O[s.obj] || null, act = s.act || 'free';
      let pose = s.pose || (o && o.pose) || 'stand', frame = 0;
      if (s.kind === 'sleep') pose = 'sleep';
      if (act === 'pray'){ const ms = now - s.t0 - (s.lag || 0); pose = ms < 0 ? 'qiyam' : salahAt(s.seq, ms); }
      else if (ANIM[pose]) frame = Math.floor(now/ANIM[pose]) % (FRAMES[pose] || 1);
      if (pose === 'throw') frame = Math.floor(now/ANIM.throw) % 5;
      const at = (s.at || (o ? spotFor(o, who) : [0, 0, 0])).slice();
      let facing = s.face != null ? s.face : o ? o.face || 0 : 0;
      if (act === 'wait' && o && o.face != null) facing = o.face;
      st = { at, pose, frame, facing, activity: act === 'free' ? (s.obj || 'idle') : act, opts: s.opts || (o && o.opts) || null, moving: null,
        visible: s.kind !== 'out', away: s.away || null, prayer: s.prayer || null, meal: s.meal || null, obj: s.obj, until: new Date(s.t1),
        social: s.social || null, partner: s.partner || null, look: !!s.look };
      if (s.kind === 'sleep') st.live = false;                          // asleep in bed: drawn with the bed in the still picture
    }
    st.room = s.kind === 'out' ? 'out' : roomAt(st.at, ctx);
    st.fl = floorOf(st.at);
    st.held = !!s.held;
    return st;
  }
  function state(date, ctx){
    ctx = ctx || {};
    const day = plan(date, ctx), O = day.O, now = date.getTime(), out = {};
    for (const who of ALL) out[who] = personAt(day, who, now, ctx);
    // held: the toddler sits on Ummi's arm, facing her, while she holds him
    const td = out.toddler, um = out.ummi;
    if (td.held && td.social === 'pickup' && um.social === 'pickup' && um.pose === 'holdkid'){
      const B = PEOPLE.ummi, f = um.facing*D2R, fw = [Math.cos(f), Math.sin(f), 0];
      td.at = add(um.at, add(mul(fw, B.torso[2][2] + 4.5), [0, 0, B.hipZ + B.h.torso*.28 - PEOPLE.toddler.hipZ*.55])); td.facing = um.facing + 180; td.pose = 'held'; td.ride = 'ummi';
    } else if (td.held && td.social === 'pickup'){ td.pose = 'stand'; }
    // the child's place at Maghrib (TEACHER REVIEW: beside the imam on his right for a boy, in the row behind for a girl)
    const mg = day.maghrib, cp = O[ctx.childGirl ? 'pray-child-girl' : 'pray-child-boy'];
    if (cp && now >= mg.start - 8*MIN && now < mg.end) out.childPlace = { at: cp.at, facing: cp.face, room: cp.room, waiting: true };
    out.t = now;
    return out;
  }

  /* ---------- what the family's day left behind ---------- */
  const EFFECT = { toys: ['mess', 'toys'], books: ['mess', 'books'], paper: ['mess', 'paper'], shoes: ['mess', 'shoes'], bag: ['mess', 'bag'], sand: ['mess', 'sand'], ball: ['mess', 'ball'],
    cup: ['dishes', 'cup'], dishes: ['dishes', 'plates'], pots: ['dishes', 'pots'], laundry: ['laundry', 'washing'], garden: ['garden', 'weeds'], bed: ['bed', 'unmade'] };
  function effects(date, sinceT, ctx){
    const pl = plan(date, ctx), O = pl.O, now = date.getTime(), since = sinceT instanceof Date ? sinceT.getTime() : (sinceT || midnight(date)), out = [];
    for (const who of ALL) for (const s of pl.segsUntil(who, now)){
      if (!s.makes || s.t1 <= since || s.t1 > now) continue;
      const e = EFFECT[s.makes]; if (!e) continue;
      const o = O[s.obj];
      let room = o ? o.room : null;
      if (s.makes === 'shoes' || s.makes === 'bag') room = roomId('hall', ctx);
      if (s.makes === 'bed') room = O[who === 'toddler' ? 'cot' : 'bed-' + who].room;
      if (s.makes === 'dishes' && s.meal && who !== 'ummi') continue;            // one 'dishes' per meal (Ummi's place)
      out.push({ type: e[0], what: e[1], room, at: o ? o.at : null, who, t: new Date(s.t1), meal: s.meal || undefined });
    }
    // the same thing in the same room within 90 minutes is one effect (a second go with the blocks is the same mess)
    out.sort((a, b) => a.t - b.t);
    const last = {};
    return out.filter(e => { const k = e.type + e.what + e.room + (e.type === 'bed' ? e.who : ''); if (last[k] && e.t - last[k] < 90*MIN) return false; last[k] = e.t; return true; });
  }

  /* ---------- requests: the family asks for help with a bubble ---------- */
  // request icons: ink style on a 24 grid, like HH.icon. Checked at small sizes: nothing in them may read as a face
  // (no pairs of small marks, no line under a pair), so seams run diagonally and pockets sit off-centre.
  const ICONS = {
    plate: '<ellipse cx="10" cy="14.5" rx="8" ry="4.6" fill="#fbfaf3"/><path d="M5.5 13.5c2-2.3 7-2.3 9 0" fill="#ef8a3c"/><path d="M17.5 8.5h4.5l-.6 9.5h-3.3z" fill="#5b8fd6"/>',
    shoe: '<path d="M3 15.5V9.5h4l2 2.5 5.5 1.5c3.5 1 6.5 1.6 6.5 3.5v1.5H3z" fill="#e8574a"/><path d="M3 17.5h18"/>',
    blocks: '<rect x="3.5" y="12" width="8" height="8" rx="1" fill="#5b8fd6"/><rect x="12.5" y="12" width="8" height="8" rx="1" fill="#e8574a"/><rect x="8" y="4" width="8" height="8" rx="1" fill="#f2c230"/>',
    hide: '<path d="M4 20V5.5C4 4.7 4.7 4 5.5 4h13c.8 0 1.5.7 1.5 1.5V20"/><path d="M4 8c3 1.5 5 6 4 12M20 8c-3 1.5-5 6-4 12" fill="#3f9c92"/><path d="M10.5 20.5h3" stroke="#f2c230" stroke-width="3"/>',
    ball: '<circle cx="12" cy="12" r="8" fill="#ef8a3c"/><path d="M6 7.5c4.5 1.5 7.5 6 7.5 12"/>',
    bag: '<path d="M5 9h14l-1.2 11H6.2z" fill="#cfe8de"/><path d="M9 9V7.5a3 3 0 0 1 6 0V9"/><path d="M15 12.5l1.5 4" stroke="#5cae6a"/>',
    book: '<path d="M12 6.5C9.5 5 6.5 4.8 3.5 5.5V19c3-.7 6-.5 8.5 1 2.5-1.5 5.5-1.7 8.5-1V5.5C17.5 4.8 14.5 5 12 6.5z" fill="#fff6dc"/><path d="M12 6.5V20"/>',
    shirt: '<path d="M8.5 4L4 7l2 4 2-1v10h8V10l2 1 2-4-4.5-3c-.5 1.5-2 2.5-3.5 2.5S9 5.5 8.5 4z" fill="#9fc7ef"/>',
    can: '<path d="M6 10h9v9H6z" fill="#5b8fd6"/><path d="M15 12l5-4M8 10V7.5h5V10"/><path d="M20 8l.8 1.4M19 6.5l1.6.2"/>',
    schoolbag: '<path d="M6 8.5c0-2 1.6-3 3-3h6c1.4 0 3 1 3 3V20H6z" fill="#e8574a"/><path d="M10 5.5V4h4v1.5M6 12.5h12"/>',
  };
  const icon = n => '<svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[n] || ICONS.blocks) + '</svg>';
  function requestPool(date, ctx){
    const pl = plan(date, ctx), K = pl.kind, R = rngOf(hashS('hh.family.req.' + dayKeyOf(date))), t = pl.times, M = t.maghrib.getTime();
    const W = (id, who, icon, job, a, b, pri) => ({ id, who, icon, job, from: a, until: b, pri: pri || 1 });
    const L = [];
    for (const m in pl.meals){ const m0 = pl.meals[m]; L.push(W('table-' + m, 'ummi', 'plate', 'set-table', m0 - 22*MIN, m0 - MIN, 3)); }
    if (K.school){ L.push(W('schoolbag', 'sister', 'schoolbag', 'pack-schoolbag', pl.leave - 45*MIN, pl.leave - 25*MIN, 2), W('shoe', 'sister', 'shoe', 'find-shoe', pl.leave - 22*MIN, pl.leave - 2*MIN, 3)); }
    else { if (R() < .6) L.push(W('shoe', 'sister', 'shoe', 'find-shoe', hm(date, 10, 30), hm(date, 10, 55), 2));
      L.push(W('water', 'abu', 'can', 'water-plants', hm(date, 9, 40), hm(date, 10, 25), 1));
      L.push(W('catch', 'sister', 'ball', 'play-catch', hm(date, 11, 0), hm(date, 11, 50), 1)); }
    L.push(W('blocks', 'toddler', 'blocks', 'play-blocks', hm(date, 10, 0) + Math.floor(R()*40)*MIN, 0, 1)); L[L.length - 1].until = L[L.length - 1].from + 30*MIN;
    { const a = hm(date, 15, 35) + Math.floor(R()*80)*MIN; L.push(W('hide', 'toddler', 'hide', 'play-hide', a, a + 25*MIN, 2)); }
    if (K.school){ const a = pl.backSis + 72*MIN, b = Math.min(a + 45*MIN, M - 15*MIN); if (b - a > 10*MIN) L.push(W('catch', 'sister', 'ball', 'play-catch', a, b, 1)); }
    if (K.school && R() < .65) L.push(W('shopping', 'abu', 'bag', 'carry-shopping', pl.backAbu + 2*MIN, pl.backAbu + 22*MIN, 3));
    else if (!K.school) L.push(W('shopping', 'ummi', 'bag', 'carry-shopping', hm(date, 12, 0), hm(date, 12, 20), 3));
    if (R() < .55) L.push(W('fold', 'ummi', 'shirt', 'fold-washing', hm(date, 14, 0), hm(date, 15, 0), 1));
    L.push(W('story', 'toddler', 'book', 'bedtime-story', pl.tbTod - 25*MIN, pl.tbTod - 2*MIN, 2));
    return L;
  }
  function requests(date, ctx, st){
    ctx = ctx || {}; st = st || state(date, ctx);
    const now = date.getTime(), done = ctx.done || {}, isDone = id => Array.isArray(done) ? done.includes(id) : !!done[id];
    const busy = s => !s || !s.visible || s.pose === 'sleep' || s.activity === 'pray' || s.activity === 'wudu' || s.activity === 'nap';
    const open = requestPool(date, ctx).filter(r => now >= r.from && now < r.until && !isDone(r.id) && !busy(st[r.who]));
    open.sort((a, b) => b.pri - a.pri || a.from - b.from);
    const out = [], used = {};
    for (const r of open){ if (used[r.who] || out.length >= 2) continue; used[r.who] = 1;
      const s = st[r.who], B = PEOPLE[r.who];
      const head = s.pose === 'walk' || s.pose === 'stand' ? B.H : s.pose === 'sit' ? B.H - B.legL*.45 : B.H*.7;
      out.push(Object.assign({}, r, { bubbleAt: [s.at[0], s.at[1], s.at[2] + head + 16], until: new Date(r.until), from: new Date(r.from), iconSvg: icon(r.icon) })); }
    return out;
  }
  // a thank-you: kneel (adults) or lean in, arms open then close round the child; a heart rises at 0.9 s
  function thank(who){
    const fr = FRAMES.hug, dur = 1900;
    return { who, pose: 'hug', frames: fr, dur, sound: 'fam_hug', heart: { delay: 900, rise: 26 },
      at: ms => ms >= dur ? { pose: 'stand', frame: 0, done: true } : { pose: 'hug', frame: Math.min(fr - 1, Math.floor(ms/dur*(fr + 1))) } };
  }

  /* ---------- hide and seek ---------- */
  // where the toddler can hide (behind or in something, with a hint that peeks out), mapped onto the house's rooms
  const HIDES = [
    { id: 'curtain', room: 'living', spot: [24, .8], face: 0, peek: [8, 0, 4], what: 'feet under the curtain' },
    { id: 'table', room: 'kitchen', anchorXY: 'table', off: [0, 0], face: 0, peek: [16, 0, 2], what: 'under the table' },
    // bed, basket and shed: placed where this house's furniture really hides him (the house builder's measured spots)
    { id: 'basket', room: 'laundry', xy: [74, 374], face: 180, peek: [0, 0, 36], what: 'behind the laundry basket' },
    { id: 'toychest', room: 'nursery', anchorXY: 'toychest', off: [-20, 6], face: 90, peek: [0, 0, 40], what: 'behind the toy chest' },
    { id: 'coats', room: 'hall', spot: [16, .95], face: 0, peek: [6, 0, 6], what: 'under the coats' },
    { id: 'bed', room: 'parents', xy: [70, 174], face: 90, peek: [0, 0, 30], what: 'beside the big bed' },
    { id: 'shed', room: 'yard', xy: [4, 508], face: 0, peek: [10, 0, 40], what: 'behind the shed', day: true },
  ];
  function hideSpot(date, ctx){
    const A = H().A || {}, list = HIDES.filter(s => !s.day || (date.getHours() > 7 && date.getHours() < 18));
    const s = list[Math.floor(rngOf(hashS('hh.family.hide.' + dayKeyOf(date)))()*list.length)];
    const room = roomId(s.room, ctx), g = roomGeo(room, ctx);
    let x, y; const a = s.anchorXY && A[s.anchorXY];
    if (s.xy && s.xy[1] >= g.y0 - 1 && s.xy[1] <= g.y1 + 1){ x = s.xy[0]; y = s.xy[1]; }
    else if (a && a[1] >= g.y0 && a[1] <= g.y1){ x = a[0] + s.off[0]; y = a[1] + s.off[1]; } else { x = s.spot ? s.spot[0] : 60; y = g.y0 + (g.y1 - g.y0)*(s.spot ? s.spot[1] : .5); }
    const at = [x, y, g.z];
    return { id: s.id, room, at, facing: s.face, pose: 'play', peek: add(at, s.peek), what: s.what, all: HIDES.map(h => h.id) };
  }
  // found: he pops up, a little hop and a giggle, waves, then runs in for a hug. at(ms) -> { pose, frame, lift }
  function found(){
    const dur = 2600;
    return { dur, sound: 'fam_giggle', at: ms => {
      if (ms < 250) return { pose: 'play', frame: 0, lift: 0 };
      if (ms < 750){ const u = (ms - 250)/500; return { pose: 'stand', frame: 0, lift: Math.sin(u*Math.PI)*9 }; }
      if (ms < 1700) return { pose: 'wave', frame: Math.floor((ms - 750)/160) % 4, lift: 0 };
      if (ms < dur) return { pose: 'hug', frame: Math.min(5, Math.floor((ms - 1700)/150)), lift: 0 };
      return { pose: 'stand', frame: 0, lift: 0, done: true }; } };
  }

  /* ---------- sounds (natural only: a giggle, a hop, blocks, a ball) ---------- */
  function sounds(){
    if (!window.Kit || !Kit.sfx || Kit.sfx.has('fam_giggle')) return;
    const voice = (L, t, f, dur, vol) => { const c = L.ctx; if (!c) return;
      const o = c.createOscillator(), g = c.createGain(), b1 = c.createBiquadFilter(), b2 = c.createBiquadFilter(), mx = c.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f*.78, t + dur);
      b1.type = 'bandpass'; b1.frequency.value = 900; b1.Q.value = 5; b2.type = 'bandpass'; b2.frequency.value = 2500; b2.Q.value = 7;
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(b1); o.connect(b2); b1.connect(mx); b2.connect(mx); mx.gain.value = 1; mx.connect(g); g.connect(L.out); o.start(t); o.stop(t + dur + .02); };
    Kit.sfx.define({
      // a toddler's giggle: short breathy voiced bursts, each a little lower
      fam_giggle: (L, t) => { for (let i = 0; i < 5; i++){ const tt = t + i*.12 + (i > 2 ? .03 : 0); voice(L, tt, 560 - i*22 + L.rnd(-12, 12), .085, .22 - i*.025);
        L.burst(tt, { dur: .07, freq: 3200, q: 1.2, vol: .05 }); } },
      fam_hop:    (L, t) => { L.thump(t, { from: 150, to: 80, vol: .2 }); },
      fam_hug:    (L, t) => { L.whoosh(t, { dur: .4, from: 300, to: 900, vol: .08, brown: true }); L.burst(t + .3, { dur: .25, freq: 600, q: .6, vol: .05 }); },
      fam_block:  (L, t, o) => L.knock(t, { size: .8 + ((o && o.n) || 0)*.05, vol: .7 }),
      fam_tumble: (L, t) => { for (let i = 0; i < 7; i++) L.knock(t + i*.07 + L.rnd(0, .05), { size: L.rnd(.7, 1.2), vol: .55 - i*.05 }); },
      fam_chest:  (L, t) => { L.knock(t, { size: 1.4, vol: .7 }); L.thump(t + .02, { from: 120, to: 60, vol: .2 }); },
      fam_throw:  (L, t) => L.whoosh(t, { dur: .35, from: 400, to: 1600, vol: .08 }),
      fam_catch:  (L, t) => { L.thump(t, { from: 200, to: 90, vol: .3 }); L.burst(t, { dur: .05, freq: 1400, q: 1, vol: .12 }); },
      fam_bounce: (L, t) => { L.thump(t, { from: 170, to: 90, vol: .22 }); L.thump(t + .32, { from: 160, to: 90, vol: .12 }); L.thump(t + .52, { from: 150, to: 90, vol: .06 }); },
      fam_rustle: (L, t) => L.whoosh(t, { dur: .3, from: 600, to: 1400, vol: .07, brown: true }),
    });
  }
  sounds(); addEventListener('load', sounds);

    /* ---------- a small stage for the play scenes (house/play-*.js) ----------
     FAMILY.stage(el, { bounds:[[x0,y0,z0],[x1,y1,z1]], yaw, pitch }) -> a full-size paper panel inside el with
     an SVG (static and moving layers, the hand-drawn filter), an HTML overlay, a big close button, and helpers:
       st.draw(layer, svg)  st.toPx(p3)  st.floor(clientX, clientY, z) -> [x, y, z]  st.cam(fn)  st.onClose  st.destroy()
     The engine's camera is shared with the house, so every drawing call runs inside st.cam(), which restores it. */
  function stage(el, o){
    o = o || {};
    const NS = 'http://www.w3.org/2000/svg', box = document.createElement('div');
    box.className = 'fam-stage';
    box.innerHTML = `<style>
      .fam-stage{position:absolute;inset:0;background:#f2efe7;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;z-index:30}
      .fam-stage>svg{position:absolute;inset:0;width:100%;height:100%;display:block}
      .fam-stage .fam-ov{position:absolute;inset:0;pointer-events:none}
      .fam-stage .fam-x{all:unset;position:absolute;top:calc(env(safe-area-inset-top) + 12px);right:12px;width:52px;height:52px;border-radius:50%;background:#fbf6ea;border:2.5px solid #231e16;
        box-shadow:0 3px 0 #231e16;display:grid;place-items:center;cursor:pointer;pointer-events:auto;z-index:3}
      .fam-stage .fam-x svg{width:26px;height:26px}
      .fam-stage .fam-x:active{transform:translateY(2px);box-shadow:0 1px 0 #231e16}
      .fam-stage .fam-dots{position:absolute;top:calc(env(safe-area-inset-top) + 24px);left:16px;display:flex;gap:8px;pointer-events:none}
      .fam-stage .fam-dots i{width:20px;height:20px;border-radius:50%;border:2.5px solid #231e16;background:#fbf6ea;box-sizing:border-box}
      .fam-stage .fam-dots i.on{background:#f4b829}
      .fam-stage .fam-heart{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;pointer-events:none;animation:famHeart 1.3s ease-out forwards}
      @keyframes famHeart{0%{transform:scale(.3);opacity:0}25%{transform:scale(1.15);opacity:1}100%{transform:translateY(-70px) scale(1);opacity:0}}
      .fam-stage .fam-ring{position:absolute;border-radius:50%;border:3px dashed rgba(255,255,255,.95);box-shadow:0 0 0 3px rgba(35,30,22,.5),0 0 18px 6px rgba(255,214,110,.5);pointer-events:none}
      .fam-stage [data-drag]{cursor:grab}
      .fam-stage .wig{animation:famWig .45s ease-in-out}
      @keyframes famWig{20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-3px)}80%{transform:translateX(2px)}}
      @media (prefers-reduced-motion:reduce){.fam-stage .fam-heart{animation-duration:.01s}.fam-stage .wig{animation:none}}
    </style><svg aria-hidden="true"><defs class="fam-defs"></defs><g class="fam-st" filter="url(#famhand)"></g><g class="fam-dy" filter="url(#famhand)"></g></svg><div class="fam-ov"></div>
    <button class="fam-x" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.appendChild(box);
    const svg = box.querySelector('svg'), L = { st: box.querySelector('.fam-st'), dy: box.querySelector('.fam-dy') }, ov = box.querySelector('.fam-ov');
    const yaw = o.yaw != null ? o.yaw : 45, pitch = o.pitch != null ? o.pitch : 30, B = o.bounds || [[0, 0, 0], [160, 160, 120]];
    let VB = [0, 0, 100, 100], ink = 1;
    function cam(fn){
      const sv = [YAW, PITCH, OX, OY, INK_K, CAM_LIM, RC.slice(), RCZ];
      CAM_LIM = null; RC = [0, 0]; RCZ = 0; OX = 0; OY = 0; setCam(yaw, pitch); INK_K = ink;
      try { return fn(); } finally { CAM_LIM = sv[5]; RC = sv[6]; RCZ = sv[7]; setCam(sv[0], sv[1]); OX = sv[2]; OY = sv[3]; INK_K = sv[4]; }
    }
    function fit(){
      const r = box.getBoundingClientRect(), W = r.width || innerWidth, Hh = r.height || innerHeight;
      cam(() => {
        const pts = []; for (const x of [B[0][0], B[1][0]]) for (const y of [B[0][1], B[1][1]]) for (const z of [B[0][2], B[1][2]]) pts.push(P(x, y, z));
        const xs = pts.map(t => t[0]), ys = pts.map(t => t[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), bw = Math.max(...xs) - x0, bh = Math.max(...ys) - y0;
        const top = (o.top || 84), bot = (o.bottom || 40), sc = Math.min((W - 24)/bw, (Hh - top - bot)/bh);
        VB = [x0 - (W/sc - bw)/2, y0 - top/sc - ((Hh - top - bot)/sc - bh)/2, W/sc, Hh/sc];
        ink = bw/433;
      });
      svg.setAttribute('viewBox', VB.map(v => v.toFixed(2)).join(' '));
      box.querySelector('.fam-defs').innerHTML = filterFor(ink).replace('id="hand"', 'id="famhand"');
    }
    fit();
    const ppu = () => (box.getBoundingClientRect().width || innerWidth)/VB[2];
    const st = {
      el: box, svg, ov, layers: L, cam,
      draw(layer, html){ L[layer].innerHTML = cam(() => { _clipN = 7000; return pad([{ box: B }], 4) + inkScale(typeof html === 'function' ? html() : html); }); },
      toPx(p3){ return cam(() => { const q = P(...p3), k = ppu(); return [(q[0] - VB[0])*k, (q[1] - VB[1])*k]; }); },
      // the point on the plane z under a screen point (P is linear in x and y)
      floor(cx, cy, z){ const r = box.getBoundingClientRect(), k = ppu(), X = VB[0] + (cx - r.left)/k, Y = VB[1] + (cy - r.top)/k;
        return cam(() => { const o0 = P(0, 0, z || 0), ax = P(1, 0, z || 0), ay = P(0, 1, z || 0); const a = ax[0] - o0[0], b = ay[0] - o0[0], c = ax[1] - o0[1], d = ay[1] - o0[1], det = a*d - b*c;
          const u = X - o0[0], v = Y - o0[1]; return [(u*d - b*v)/det, (a*v - c*u)/det, z || 0]; }); },
      heart(p3){ const [x, y] = st.toPx(p3), h = document.createElement('div'); h.className = 'fam-heart'; h.style.left = x + 'px'; h.style.top = y + 'px';
        h.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 20.5S3.5 15 3.5 9.2A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 8.5 2.6C20.5 15 12 20.5 12 20.5z" fill="#e8574a" stroke="#231e16" stroke-width="1.8" stroke-linejoin="round"/></svg>';
        ov.appendChild(h); setTimeout(() => h.remove(), 1400); },
      dots(n, on){ let d = box.querySelector('.fam-dots'); if (!d){ d = document.createElement('div'); d.className = 'fam-dots'; box.appendChild(d); }
        d.innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < on ? 'on' : ''}"></i>`).join(''); },
      sfx(n, o2){ try { window.Kit && Kit.sfx && Kit.sfx.play(n, o2); } catch (e) {} },
      praise(){ try { window.Kit && Kit.say && Kit.say.praise && Kit.say.praise('mashaallah'); } catch (e) {} },
      onClose: null,
      destroy(){ box.remove(); removeEventListener('resize', onRs); },
      refit: fit,
    };
    const onRs = () => { fit(); st.onResize && st.onResize(); };
    addEventListener('resize', onRs);
    box.querySelector('.fam-x').addEventListener('click', () => { st.sfx('tap'); st.onClose && st.onClose(); });
    return st;
  }

  /* ---------- the live layer: everyone moves, all the time, for very little ----------
     Each actor (a person, the cat, the dog, a bird at the feeder) is a pair of groups in one SVG that shares the house's
     viewBox: an outer group carries the floor mask, an inner one the hand-drawn filter and a translate. Every frame an
     actor can show (a pose, its animation frame, its breath, a head turn, a facing) is drawn ONCE at the origin and kept
     as a hidden child group; animating is showing another child and moving the translate. Nothing is re-drawn or
     re-parsed while a loop repeats, and actors off screen (zoomed into another room) are skipped. One timer, 12 fps.
       const L = FAMILY.live({ g, now, ctx, mask, view, skip, sources: [FAMILY, PETS] }); L.start();
       L.freeze(true|false)   while the house is turned: keep the drawings, L.sync() moves them; unfreeze redraws
       L.pick(x, y)           the actor under a point in viewBox units (the cat purrs when tapped), or null
       L.stats()              { actors, frames, builds, ms }  */
  function liveLayer(o){
    const NS = 'http://www.w3.org/2000/svg', fps = o.fps || 7, A = new Map(), srcs = o.sources || [window.FAMILY, window.PETS];
    let timer = 0, running = false, frozen = false, camK = '', builds = 0, busy = 0, ticks = 0, fast = true, lastFast = '';
    const ck = () => YAW.toFixed(2) + '|' + PITCH.toFixed(2) + '|' + (INK_K || 1).toFixed(3);
    function actor(id){
      let a = A.get(id); if (a) return a;
      const outer = document.createElementNS(NS, 'g'), inner = document.createElementNS(NS, 'g');
      inner.setAttribute('filter', 'url(#hand)'); outer.appendChild(inner); outer.dataset.actor = id; o.g.appendChild(outer);
      a = { id, outer, inner, frames: new Map(), cur: null, tr: '', m: null, depth: 0, hidden: false }; A.set(id, a); return a;
    }
    function list(){ const now = o.now ? o.now() : new Date(), rt = performance.now(), cx = o.ctx ? o.ctx() : {}, out = [];
      for (const s of srcs) if (s && s.actors) try { out.push(...s.actors(now, cx, rt)); } catch (e) {} return out; }
    function place(a, ac, o0){ const q = P(...ac.at), tr = `translate(${(q[0] - o0[0]).toFixed(1)} ${(q[1] - o0[1]).toFixed(1)})`;
      if (tr !== a.tr){ a.inner.setAttribute('transform', tr); a.tr = tr; } return q; }
    function update(moveOnly){
      const t0 = performance.now(), k = ck();
      if (!moveOnly && k !== camK){ camK = k; for (const a of A.values()){ a.frames.clear(); a.inner.textContent = ''; a.cur = null; } }
      const L = list(), seen = new Set(), vb = o.view ? o.view() : null, o0 = P(0, 0, 0); let anyFast = false;
      for (const ac of L){
        if (o.skip && o.skip(ac.id)) continue; seen.add(ac.id);
        const a = actor(ac.id), q = place(a, ac, o0); a.sx = q[0]; a.sy = q[1];
        const off = vb && (q[0] < vb[0] - 90 || q[0] > vb[0] + vb[2] + 90 || q[1] < vb[1] - 160 || q[1] > vb[1] + vb[3] + 90);
        if (off !== a.hidden){ a.outer.style.display = off ? 'none' : ''; a.hidden = off; }
        if (off) continue;
        if (ac.fast){ anyFast = true; lastFast = ac.id; }
        a.depth = depthOf(ac.at) + (ac.bias || 0);
        const m = (ac.fl === 0 || ac.fl === 1) && o.mask ? o.mask(ac.fl) || '' : '';
        if (m !== a.m){ if (m) a.outer.setAttribute('mask', m); else a.outer.removeAttribute('mask'); a.m = m; }
        if (moveOnly && a.cur) continue;
        let f = a.frames.get(ac.key);
        if (!f){ f = document.createElementNS(NS, 'g'); f.style.display = 'none'; _clipN = 8000 + builds % 1000;
          f.innerHTML = inkScale(ac.draw()); a.inner.appendChild(f); a.frames.set(ac.key, f); builds++;
          if (a.frames.size > 40){ for (const [k2, g2] of a.frames) if (g2 !== a.cur){ g2.remove(); a.frames.delete(k2); break; } } }
        if (a.cur !== f){ if (a.cur) a.cur.style.display = 'none'; f.style.display = ''; a.cur = f; }
      }
      for (const [id, a] of A) if (!seen.has(id)){ a.outer.remove(); A.delete(id); }
      // back-to-front order matters only where two actors overlap on screen: fix just those pairs, moving one group
      // (re-appending everyone would restyle every cached drawing)
      const vis2 = [...A.values()].filter(a => !a.hidden && a.sx != null);
      for (let i = 0; i < vis2.length; i++) for (let j = i + 1; j < vis2.length; j++){
        const a = vis2[i], b = vis2[j]; if (Math.abs(a.sx - b.sx) > 45 || Math.abs(a.sy - b.sy) > 110) continue;
        const aFirst = !!(a.outer.compareDocumentPosition(b.outer) & 4), near = a.depth > b.depth ? a : b, far = near === a ? b : a;
        if ((near === a) === aFirst) o.g.insertBefore(near.outer, far.outer.nextSibling);
      }
      fast = anyFast; busy += performance.now() - t0; ticks++;
    }
    // every change costs a whole rendered frame (paint, layerize, commit: ~3 ms on a slow phone), so frames are rationed:
    // 7 a second while someone walks or does something quick, 3.5 when everyone is in a slow loop (breathing, reading).
    // Like stop-motion: the drawings are hand-made, so the eye reads 7 steps a second as lively, not as jank.
    function tick(){ timer = 0; if (!running) return; if (!document.hidden && !frozen) update(false); timer = setTimeout(tick, fast ? 1000/fps : 2000/fps); }
    return {
      start(){ if (!running){ running = true; tick(); } return this; },
      stop(){ running = false; clearTimeout(timer); timer = 0; return this; },
      freeze(v){ frozen = !!v; if (!v) update(false); return this; },
      sync(){ update(true); return this; },
      now(){ update(false); return this; },
      clear(){ for (const a of A.values()) a.outer.remove(); A.clear(); camK = ''; return this; },
      pick(x, y){ let best = null, bd = 1e9;
        for (const a of A.values()){ if (a.hidden || !a.cur) continue; let b; try { b = a.cur.getBBox(); } catch (e) { continue; }
          const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(a.tr) || [0, 0, 0], X = x - +m[1], Y = y - +m[2];
          if (X >= b.x - 4 && X <= b.x + b.width + 4 && Y >= b.y - 4 && Y <= b.y + b.height + 4){ const d = Math.hypot(X - b.x - b.width/2, Y - b.y - b.height/2); if (d < bd){ bd = d; best = a.id; } } }
        return best; },
      stats(){ let fr = 0; for (const a of A.values()) fr += a.frames.size; return { actors: A.size, frames: fr, builds, ms: busy, ticks, fast: fast ? lastFast : '' }; },
    };
  }

  // the family as live actors: pose, its loop frame, breathing, a head turn now and then, a weight shift
  const OK = new WeakMap(), optKey = o => { if (!o) return ''; let k = OK.get(o); if (k == null){ k = JSON.stringify(o); OK.set(o, k); } return k; };
  const LOOKS = { stand: 1, sit: 1, sitfloor: 1, tea: 1, nod: 1, play: 1, held: 1, read: 0, eat: 0 };
  const SHIFTS = { stand: 1, nod: 1, holdkid: 0 };
  function actors(now, ctx, rt){
    const st = state(now, ctx), out = [];
    for (const who of ALL){ const p = st[who]; if (!p || p.visible === false || p.away || p.live === false) continue;
      const ph = (hashS(who) % 997)/97, pose = p.pose, nf = FRAMES[pose] || 1, prayer = p.activity === 'pray';
      let frame = p.frame || 0, mc = null;
      if (!p.moving && !prayer){
        if (ANIM[pose] && pose !== 'read') frame = Math.floor(rt/ANIM[pose] + ph) % nf;
        // a pose that already loops needs nothing more; a still one breathes, looks about, shifts its weight
        // (few values, so each person keeps at most ~18 still drawings per pose)
        if (!(ANIM[pose] && nf > 1 && pose !== 'read')){
          const b = Math.floor(rt/1400 + ph) % 2, l = (LOOKS[pose] || p.look) ? [0, 0, -22, 0, 22, 0][Math.floor(rt/3700 + ph*2) % 6] : 0, sh = SHIFTS[pose] ? [0, 1, 0, -1][Math.floor(rt/6300 + ph) % 4] : 0;
          mc = { b, l, s: sh };
        }
      }
      const fq = Math.round((p.facing || 0)/(p.moving ? 45 : 5))*(p.moving ? 45 : 5), ok = optKey(p.opts);         // walkers in 8 directions
      const key = pose + '|' + frame + '|' + fq + '|' + ok + (mc ? '|' + mc.b + mc.l + mc.s : '');
      const opts = mc || p.opts ? Object.assign({}, p.opts || {}, mc ? { micro: mc } : {}) : undefined;
      out.push({ id: who, at: p.at, fl: p.fl, bias: who === 'toddler' && p.pose === 'held' ? 6 : 0, key, fast: !!p.moving,
        draw: () => { const it = draw(who, pose, [0, 0, 0], fq, frame, opts)[0]; return pad([it]) + it.svg; } });
    }
    return out;
  }

  // drawing and day helpers shared with house/pets.js (the cat, the dog, the birds are drawn the same way)
  const KIT = { add, mul, sub, lerp3, len3, n3, tube, capsule, disc2, sphere, capShape, capPath, rings3, bandBody, hullOf, toneF, lightW, framer, pad,
    route: routeC, roomAt, roomGeo, roomId, floorOf, hashS, rngOf, dayKeyOf, midnight, hm, timesOf, kindOf, pathLen, along, D2R, MIN };

  Object.assign(window.FAMILY, {
    _k: KIT, live: liveLayer, actors, stage, state, effects, requests, thank, hideSpot, found, plan, route, objects, icon, ICONS, salahSeq, HIDES,
    setNav(g){ NAV_SET = g ? { nodes: g.nodes, edges: g.edges, entry: g.entry || {} } : null; DAY_CACHE.clear(); ROUTE_CACHE.clear(); PLAN_MEMO.k = ''; },
    setObjects(over){ OVERRIDE = Object.assign({}, OVERRIDE, over || {}); OBJ_CACHE = null; OBJ_VER++; DAY_CACHE.clear(); PLAN_MEMO.k = ''; },
    reset(){ OVERRIDE = {}; OBJ_CACHE = null; NAV = null; NAV_SET = null; DAY_CACHE.clear(); ROUTE_CACHE.clear(); PLAN_MEMO.k = ''; },
    floorOf, roomAt,
  });
})();
