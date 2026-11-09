/* Helping Home: the house's day. Time (real, or ?t=HH:MM / ?day=YYYY-MM-DD for testing), prayer times (HHPrayer when
   it is there, fixed times when not), the light, and the day's chores as systems combined by a day seed:
     meals      set the table (breakfast, lunch, dinner), then clear it and wipe it (a drag-scrub with the cloth)
     floors     dust in the corners in the afternoon (sweep it with the broom)
     rubbish    after meals: recycling or general bin; on bin days, wheel the bins to the curb in the evening
     school     on school days pack the bag (book, lunchbox, water bottle); in the afternoon the bag comes home and the
                homework goes to the sister's desk
     washing    on washing days hang the wet washing on the line, and fold it into the basket when it is dry
     teeth      brush in the bathroom morning and night (a tap-and-scrub)
     tidying    pyjamas, socks, books, the toddler's toys, shoes, the bed
     garden     4 plots: plant, water each day, harvest (HHDays.garden when present)
   Everything is saved on the device only. Nothing fails: an undone chore is simply done by the family later. */
(function () {
  'use strict';
  const q = new URLSearchParams(location.search);

  /* ---------- the clock ---------- */
  let fakeAt = null; const t0 = Date.now();
  { const d = new Date(); let set = false;
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(q.get('day') || '')){ const [y, m, dd] = q.get('day').split('-').map(Number); d.setFullYear(y, m - 1, dd); set = true; }
    if (/^\d{1,2}(:\d{2})?$/.test(q.get('t') || '')){ const [h, m] = q.get('t').split(':').map(Number); d.setHours(h, m || 0, 0, 0); set = true; }
    if (set) fakeAt = d.getTime(); }
  const now = () => new Date(fakeAt ? fakeAt + (Date.now() - t0) : Date.now());
  const dayKey = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();       // the same key as HHFlow.today()
  const dayNum = d => Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime()/864e5);
  const atHM = (d, h, m) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x; };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
  const D = () => window.HHDays || null;
  const safe = (fn, def) => { try { const r = fn(); return r == null ? def : r; } catch (e) { return def; } };

  /* ---------- prayer times ---------- */
  function fallback(d){
    return { fajr: atHM(d, 5, 30), sunrise: atHM(d, 6, 50), dhuhr: atHM(d, 12, 30), asr: atHM(d, 15, 45), maghrib: atHM(d, 18, 15), isha: atHM(d, 19, 45),
      midnight: atHM(d, 23, 50), tahajjud: atHM(addDays(d, 1), 2, 0), nextFajr: atHM(addDays(d, 1), 5, 30), fallback: true };
  }
  const ok = t => t && ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].every(k => t[k] instanceof Date && !isNaN(t[k]));
  const cacheT = {};
  function times(d){
    const k = dayKey(d); if (cacheT[k]) return cacheT[k];
    let t = safe(() => window.HHPrayer && HHPrayer.times(d), null);
    if (!ok(t)) t = fallback(d);
    else { const fb = fallback(d); for (const k2 of ['midnight', 'tahajjud', 'nextFajr']) if (!(t[k2] instanceof Date)) t[k2] = fb[k2]; }
    return (cacheT[k] = t);
  }
  const FIVE = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const endOf = (n, t) => ({ fajr: t.sunrise, dhuhr: t.asr, asr: t.maghrib, maghrib: t.isha, isha: t.midnight })[n];
  function current(d){
    const t = times(d), y = times(addDays(d, -1));
    if (d >= y.isha && d < y.midnight) return { name: 'isha', start: y.isha, end: y.midnight, day: dayKey(addDays(d, -1)) };
    for (const n of FIVE) if (d >= t[n] && d < endOf(n, t)) return { name: n, start: t[n], end: endOf(n, t), day: dayKey(d) };
    return null;
  }
  function tahajjudNow(d){ const t = times(d), y = times(addDays(d, -1)); return (d >= y.tahajjud && d < t.fajr) || (d >= t.tahajjud && d < t.nextFajr); }
  const readJ = (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } };
  const writeJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  // prayed today? the salah page logs {p:<name>} through HHFlow.done('salah', {p})
  function prayed(name, dk){ const L = readJ('hh.log', {}), day = L[dk || dayKey(now())] || {}; return (day.salah || []).some(e => (e.p || e.prayer) === name && (!e.kind || e.kind === 'fard')); }   // the fard counts; sunnah units are logged too
  const todayLog = () => (window.HHFlow && HHFlow.log()) || {};

  /* ---------- the light ---------- */
  const PH = {
    night:  { tint: '#3e4a7e', a: .52, sky: '#2c3766', lamps: 1 }, dawn: { tint: '#eaa79c', a: .24, sky: '#f4bfae', lamps: .6 },
    day:    { tint: '#ffffff', a: 0, sky: '#bfe0f2', lamps: 0 },  golden: { tint: '#f1b05a', a: .22, sky: '#f7d08c', lamps: 0 },
    dusk:   { tint: '#86699f', a: .38, sky: '#c58ba5', lamps: .9 },
  };
  const blend = (A, B, k) => { k = Math.max(0, Math.min(1, k)); return { tint: mix(A.tint, B.tint, k), a: A.a + (B.a - A.a)*k, sky: mix(A.sky, B.sky, k), lamps: A.lamps + (B.lamps - A.lamps)*k }; };
  function light(d){
    const t = times(d), ms = d.getTime(), M = 60000, span = (a, b) => (ms - a)/Math.max(1, b - a), sr = t.sunrise.getTime(), mg = t.maghrib.getTime();
    let L;
    if (ms < t.fajr.getTime()) L = PH.night; else if (ms < sr) L = blend(PH.night, PH.dawn, span(t.fajr.getTime(), sr));
    else if (ms < sr + 50*M) L = blend(PH.dawn, PH.day, span(sr, sr + 50*M)); else if (ms < t.asr.getTime()) L = PH.day;
    else if (ms < mg - 45*M) L = blend(PH.day, PH.golden, span(t.asr.getTime(), mg - 45*M)); else if (ms < mg) L = blend(PH.golden, PH.dusk, span(mg - 45*M, mg));
    else if (ms < t.isha.getTime()) L = blend(PH.dusk, PH.night, span(mg, t.isha.getTime())); else L = PH.night;
    L = Object.assign({}, L); L.night = L.lamps > .5; L.key = L.sky + (L.night ? 'n' : 'd'); return L;
  }

  /* ---------- the day seed ---------- */
  function hash(s){ let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
  function rng(seed){ let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; }; }
  // what kind of day: HHDays (school days from settings, weather, the day's surprise) when present; else weekdays are school days
  function dayKind(d){
    const R = rng(hash('kind.' + dayKey(d))), wd = d.getDay();
    const k = { school: wd >= 1 && wd <= 5, washing: R() < .55, bins: wd === 2 || wd === 5, rain: false, friday: wd === 5, weather: 'sun', surprise: null };
    const H = D(); if (!H) return k;
    const x = safe(() => H.kind(d), null); if (x){ k.school = !!x.schoolDay; k.friday = !!x.friday; k.info = x; }
    k.weather = safe(() => H.weather(d), 'sun'); k.rain = k.weather === 'rain' || k.weather === 'snow';
    k.surprise = safe(() => H.surprise(d), null);
    if (k.surprise && k.surprise.effect && k.surprise.effect.laundryInside) k.rain = true;
    return k;
  }

  /* ---------- the day's chores ---------- */
  const Z = HD.ZF;
  const SPOTS = {
    myroom: [[60, 330], [84, 352], [112, 330], [124, 362], [128, 392], [100, 346], [130, 410]],
    nursery: [[70, 60], [64, 112], [88, 132], [60, 146], [120, 80], [96, 96], [130, 62], [84, 150]],
    living: [[134, 292], [134, 362], [44, 300], [48, 348], [116, 352]],
    hall: [[100, 70], [122, 94], [126, 58], [92, 98], [72, 102]],
    kitchenFloor: [[60, 252], [126, 142], [132, 204], [126, 250], [58, 148]],
    worktop: [[14, 119], [34, 119], [44, 140], [44, 156]],
  };
  const TOYS = ['block', 'ball', 'car', 'rings'], TOYC = ['#e8574a', '#5b8fd6', '#f2c230', '#5cae6a', '#e98fb0', '#ef8a3c'];
  const BOOKC = ['#e8574a', '#5b8fd6', '#5cae6a', '#9a6bb8', '#ef8a3c'], SOCKC = ['#f2c230', '#e98fb0', '#76a0e2', '#5cae6a', '#fbf9f2'];
  const TARGET = { sock: 'basket', pyj: 'wardrobe', block: 'toychest', ball: 'toychest', car: 'toychest', rings: 'toychest', book: 'shelfB', shoe: 'shoerack', bag: 'peg', hw: 'desk',
    can: 'recycle', paper: 'recycle', bottle: 'recycle', peel: 'general', wrapper: 'general', sbook: 'bag', lunchbox: 'bag', wbottle: 'bag', wet: 'line', dry: 'cleanBasket',
    crumb: 'scrub:cloth', dust: 'scrub:broom', drawing: 'fridge', pot: 'rack' };
  const MEALS = [{ id: 'breakfast', set: [7, 0], meal: [7, 45], clear: [8, 15] }, { id: 'lunch', set: [12, 30], meal: [13, 0], clear: [13, 30] }, { id: 'dinner', set: [18, 30], meal: [19, 0], clear: [19, 30] }];
  // the family module runs the family's day: its meal times, and its leftovers (FAMILY.effects) replace our stand-ins
  const FAM = () => window.FAMILY && FAMILY.plan && FAMILY.effects ? FAMILY : null;
  function familyMeals(d){ const F = FAM(); if (!F) return null; const pl = safe(() => F.plan(d, {}), null); return pl && pl.meals || null; }
  function dayItems(d){
    const R = rng(hash('hh2.' + dayKey(d))), pick = a => a[Math.floor(R()*a.length)], kind = dayKind(d), t = times(d), at = (h, m) => atHM(d, h, m);
    const fam = !!FAM(), fm = familyMeals(d);
    const free = {}; for (const k in SPOTS) free[k] = SPOTS[k].slice();
    const take = area => { const a = free[area]; return a && a.length ? a.splice(Math.floor(R()*a.length), 1)[0] : null; };
    const out = [], ev = {};
    const add = (o) => { o.rot = o.rot == null ? R()*Math.PI*2 : o.rot; o.target = o.target || TARGET[o.kind]; out.push(o); return o; };
    const onFloor = (area, fl, room, extra) => { const sp = take(area); if (!sp) return null; return add(Object.assign({ fl, room, pos: [sp[0], sp[1], Z[fl] + (area === 'myroom' && sp[1] > 318 && sp[1] < 362 && sp[0] > 50 ? .9 : 0)] }, extra)); };
    const wake = new Date(Math.min(t.fajr.getTime() + 20*60000, at(7, 0).getTime())); ev.wake = wake;
    // morning: pyjamas and socks in My Room, the toddler's first toys
    onFloor('myroom', 2, 'myroom', { id: 'wake.pyj', kind: 'pyj', at: wake, col: pick(['#9fc7ef', '#f3b6c6', '#b9e0c9']) });
    for (let i = 0, n = 1 + Math.floor(R()*2); i < n; i++) onFloor('myroom', 2, 'myroom', { id: 'wake.sock' + i, kind: 'sock', at: wake, col: pick(SOCKC) });
    if (!fam) for (let i = 0, n = 2 + Math.floor(R()*2); i < n; i++) onFloor('nursery', 2, 'nursery', { id: 'am.toy' + i, kind: pick(TOYS), at: at(9, 30), col: pick(TOYC) });
    // meals: set the table, then clear and wipe it; rubbish after lunch and dinner
    MEALS.forEach((M, mi) => {
      // whatever the child does not clear, the family clears before the next meal is set: no pile-up, no failing
      const fmA = (id) => fm && fm[id] ? new Date(fm[id]) : null, mealAt = id => fmA(id) || at(...MEALS.find(x => x.id === id).meal);
      const mA = mealAt(M.id), sA = new Date(mA.getTime() - 30*60000), cA = new Date(mA.getTime() + 35*60000), nxt = MEALS[mi + 1] ? new Date(mealAt(MEALS[mi + 1].id).getTime() - 30*60000) : null;
      for (let i = 0; i < 4; i++){ const w = SPOTS.worktop[i]; add({ id: M.id + '.set' + i, kind: i < 2 ? 'plate' : 'cup', fl: 0, room: 'kitchen', pos: [w[0], w[1], Z[0] + 75], rot: 1, at: sA, until: mA, target: 'table', seat: i, col: '#5b8fd6', onTop: true }); }
      if (!fam) for (let i = 0; i < 4; i++){ const s2 = HD.SEATS[i]; add({ id: M.id + '.clear' + i, kind: i < 2 ? 'plate' : i === 2 ? 'cup' : 'bowl', fl: 0, room: 'kitchen', pos: [s2[0], s2[1], Z[0] + 60], rot: 1, at: cA, until: nxt, target: 'rack', dirty: true, col: '#5b8fd6', onTop: true }); }
      for (let i = 0; i < 3; i++) add({ id: M.id + '.crumb' + i, kind: 'crumb', fl: 0, room: 'kitchen', pos: [70 + R()*36, 168 + R()*60, Z[0] + 60.2], rot: 0, at: cA, until: nxt, onTop: true });
      if (mi > 0) for (let i = 0, n = 1 + Math.floor(R()*2); i < n; i++) onFloor('kitchenFloor', 0, 'kitchen', { id: M.id + '.rub' + i, kind: pick(['can', 'paper', 'bottle', 'peel', 'wrapper']), at: cA, until: nxt });
      ev[M.id] = { set: sA, meal: mA, clear: cA };
    });
    // school: pack the bag in the morning; the bag, homework and shoes come home in the afternoon
    if (kind.school){
      ev.pack = { from: at(6, 30), to: at(8, 15) };
      add({ id: 'pack.sbook', kind: 'sbook', fl: 2, room: 'myroom', pos: [76, 362, Z[2]], at: ev.pack.from, until: ev.pack.to, col: '#5b8fd6' });
      add({ id: 'pack.lunchbox', kind: 'lunchbox', fl: 0, room: 'kitchen', pos: [44, 186, Z[0] + 75], rot: 0, at: ev.pack.from, until: ev.pack.to, onTop: true });
      add({ id: 'pack.wbottle', kind: 'wbottle', fl: 0, room: 'kitchen', pos: [42, 128, Z[0] + 75], at: ev.pack.from, until: ev.pack.to, onTop: true });
      const home = at(15, 30); ev.home = home;
      if (!fam) onFloor('hall', 0, 'hall', { id: 'school.bag', kind: 'bag', at: home, col: '#e8574a' });
      onFloor('living', 0, 'living', { id: 'school.hw', kind: 'hw', at: home, col: pick(['#9a6bb8', '#3f9c92']) });
    }
    if (!fam){ onFloor('hall', 0, 'hall', { id: 'out.shoe0', kind: 'shoe', at: at(kind.school ? 15 : 11, 30), col: '#e8574a' });
      onFloor('hall', 0, 'hall', { id: 'out.shoe1', kind: 'shoe', at: at(kind.school ? 15 : 11, 30), col: '#e8574a' }); }
    // afternoon: dust in the corners, books on the floor, the toddler's second round of toys
    for (const [i, p, room] of [[0, [124, 104], 'hall'], [1, [134, 254], 'kitchen'], [2, [134, 270], 'living']]) if (R() < .8) add({ id: 'dust' + i, kind: 'dust', fl: 0, room, pos: [p[0], p[1], Z[0]], rot: 0, at: at(16, 0) });
    for (let i = 0, n = 1 + Math.floor(R()*2); i < n; i++) onFloor('myroom', 2, 'myroom', { id: 'pm.book' + i, kind: 'book', at: at(16, 30), col: pick(BOOKC) });
    if (!fam) for (let i = 0, n = 2 + Math.floor(R()*2); i < n; i++) onFloor(i < 2 ? 'nursery' : 'living', i < 2 ? 2 : 0, i < 2 ? 'nursery' : 'living', { id: 'pm.toy' + i, kind: pick(TOYS), at: at(17, 0), col: pick(TOYC) });
    // washing day: hang it on the line, then fold it in when dry
    if (kind.washing && !kind.rain && !fam){ const G = [['shirt', '#76a0e2'], ['towel', '#f3a6bb'], ['pants', '#5cae6a']];
      G.forEach(([g, col], i) => add({ id: 'wash.wet' + i, kind: 'wet', g, col, fl: 0, room: 'laundry', pos: [66 + i*7, 418 + (i % 2)*6, Z[0] + 22], at: at(10, 30), until: at(16, 0), onTop: true, slot: i })); }
    ev.dry = at(16, 0);
    ev.teethAm = { from: wake, to: at(10, 0) }; ev.teethPm = { from: at(19, 45), to: at(23, 59) };
    ev.bins = kind.bins ? at(19, 0) : null;
    ev.laundry = at(9, 30);
    return { items: out, ev, kind };
  }

  /* ---------- what the family's day left behind (FAMILY.effects) as things for the child to put away ---------- */
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  function fxItems(d){
    const F = FAM(); if (!F) return [];
    // only the latest of each kind of leftover per room counts, and the family tidies what is older than 3 hours
    const all = (safe(() => F.effects(d, null, {}), []) || []).slice().sort((a2, b2) => new Date(b2.t) - new Date(a2.t)), seen = {}, list = [];
    for (const e of all){ const k = e.what + '|' + e.room + (e.what === 'unmade' ? e.who : ''); if (seen[k]) continue; seen[k] = 1; list.push(e); }
    const out = [];
    for (const e of list){
      const r = HD.ROOMS[e.room]; if (!r || !e.t) continue;
      if (d - new Date(e.t) > (e.what === 'unmade' ? 14 : 3)*3600000) continue;
      const t = e.t instanceof Date ? e.t : new Date(e.t), id0 = 'fx.' + e.what + '.' + e.room + '.' + t.getTime(), R = rng(hash(id0));
      const fl = r.fl, z = fl < 0 ? 6 : Z[fl];
      const near = (spread = 30) => { const x = e.at ? e.at[0] + (R() - .5)*spread : 70 + R()*60, y = e.at ? e.at[1] + (R() - .5)*spread : (r.y0 + r.y1)/2;
        return [clampN(x, fl < 0 ? 120 : 58, fl < 0 ? 190 : 136), clampN(y, r.y0 + 10, r.y1 - 10), z]; };
      const add = o => out.push(Object.assign({ fl, room: e.room, at: t, until: new Date(t.getTime() + 3*3600000), rot: R()*Math.PI*2, fx: true }, o));
      switch (e.what){
        case 'toys': for (let i = 0; i < 2; i++) add({ id: id0 + '.' + i, kind: TOYS[Math.floor(R()*4)], col: TOYC[Math.floor(R()*TOYC.length)], pos: near(36), target: 'toychest' }); break;
        case 'books': add({ id: id0, kind: 'book', col: BOOKC[Math.floor(R()*BOOKC.length)], pos: near(), target: e.room === 'sister' ? 'desk' : e.room === 'living' ? 'bookcase' : 'shelfB' }); break;
        case 'paper': add({ id: id0, kind: 'drawing', col: ['#e98fb0', '#5b8fd6', '#f2c230'][Math.floor(R()*3)], pos: near(), target: 'fridge' }); break;
        case 'shoes': for (let i = 0; i < 2; i++) add({ id: id0 + '.' + i, kind: 'shoe', col: e.who === 'toddler' ? '#5b8fd6' : '#e8574a', room: 'hall', fl: 0, pos: (() => { const sp = SPOTS.hall[(i + Math.floor(R()*5)) % 5]; return [sp[0], sp[1], Z[0]]; })(), target: 'shoerack' }); break;
        case 'bag': add({ id: id0, kind: 'bag', col: '#e8574a', room: 'hall', fl: 0, pos: [96, 70, Z[0]], target: 'peg' }); break;
        case 'sand': add({ id: id0, kind: 'dust', room: 'laundry', fl: 0, pos: [114, 424, Z[0]], rot: 0, target: 'scrub:broom' }); break;
        case 'plates': for (let i = 0; i < 4; i++){ const s2 = HD.SEATS[i]; add({ id: id0 + '.' + i, kind: i < 2 ? 'plate' : i === 2 ? 'cup' : 'bowl', room: 'kitchen', fl: 0, pos: [s2[0], s2[1], Z[0] + 60], rot: 1, target: 'rack', dirty: true, col: '#5b8fd6', onTop: true }); }
          for (let i = 0; i < 3; i++) add({ id: id0 + '.crumb' + i, kind: 'crumb', room: 'kitchen', fl: 0, pos: [70 + R()*36, 168 + R()*60, Z[0] + 60.2], rot: 0, target: 'scrub:cloth', onTop: true }); break;
        case 'cup': add({ id: id0, kind: 'cup', col: '#ef8a3c', room: 'kitchen', fl: 0, pos: [42, 192, Z[0] + 75], target: 'rack', dirty: true, onTop: true }); break;
        case 'pots': add({ id: id0, kind: 'pot', col: '#8f9a9e', room: 'kitchen', fl: 0, pos: [36, 146, Z[0] + 75], rot: 0, target: 'rack', onTop: true }); break;
        case 'washing': [['shirt', '#76a0e2'], ['towel', '#f3a6bb'], ['pants', '#5cae6a']].forEach(([g, col], i) => add({ id: id0 + '.' + i, kind: 'wet', g, col, room: 'laundry', fl: 0,
          pos: [66 + i*7, 418 + (i % 2)*6, Z[0] + 22], target: 'line', onTop: true, slot: i, until: new Date(t.getTime() + 5*3600000) })); break;
        case 'unmade': if (e.who === 'sister') add({ id: id0, kind: 'bedS', pos: [60, 261, Z[2] + 28], room: 'sister', fl: 2, target: 'bedS', marker: true }); break;
      }
    }
    return out;
  }

  /* ---------- the garden: 4 plots that grow over days (HHDays owns it when present; nothing ever dies) ---------- */
  const PLOT_SEEDS = ['carrot', 'tomato', 'strawberry', 'mint'], CROPS = ['carrot', 'tomato', 'lettuce', 'onion'];
  function garden(d){
    const H = D(), out = {};
    if (H && H.stage){ const G = safe(() => H.garden(), { plots: {} }), k = dayKey(d);
      HD.PLOTS.forEach(p => { const pl = (G.plots || {})[p.id], st = safe(() => H.stage(p.id, d), -1);
        out[p.id] = { stage: st, kind: pl ? pl.seed : PLOT_SEEDS[HD.PLOTS.indexOf(p)], thirsty: !!pl && st < 3 && (pl.wet || []).indexOf(k) < 0, weeds: !!pl && safe(() => H.weeds(p.id, d), false) }; });
      return out; }
    const G = readJ('hh.garden0', {}), n = dayNum(d);
    HD.PLOTS.forEach((p, i) => { const g = G[p.id]; if (!g){ out[p.id] = { stage: -1, kind: CROPS[i] }; return; }
      // planted today is a seed; each earlier day it was watered it grows a stage; ready after 3
      const stage = Math.min(3, Object.keys(g.w || {}).map(Number).filter(x => x < n && x >= g.p).length);
      out[p.id] = { stage, kind: g.k, thirsty: stage < 3 && !(g.w || {})[n] }; });
    return out;
  }
  function gardenAct(id, act, d){
    const H = D(), i = HD.PLOTS.findIndex(p => p.id === id);
    if (H && H.stage){
      if (act === 'plant'){ const sp = safe(() => H.surprise(d).effect.giveSeed, null); return safe(() => H.plant(id, sp && H.SEEDS[sp] ? sp : PLOT_SEEDS[i], d), false); }
      if (act === 'water') return safe(() => H.water(id, d), false);
      if (act === 'weed') return safe(() => H.weed(id, d), false);
      if (act === 'harvest'){ const r = safe(() => H.harvest(id, d), null);
        if (r){ const G = readJ('hh.garden', {}); G.pendingMeal = r; writeJ('hh.garden', G); } return r; }
      return null;
    }
    const G = readJ('hh.garden0', {}), n = dayNum(d);
    if (act === 'plant') G[id] = { k: CROPS[(i + n) % 4], p: n, w: {} };
    if (act === 'water' && G[id]){ G[id].w = G[id].w || {}; G[id].w[n] = 1; }
    if (act === 'harvest') delete G[id];
    writeJ('hh.garden0', G); return true;
  }

  /* ---------- saved state ---------- */
  function load(){
    const k = dayKey(now());
    let s = readJ('hh.house', null);
    if (!s || s.day !== k || s.v !== 2) s = { v: 2, day: k, done: {}, bed: false, teeth: {}, bins: [false, false], packed: [], castle: false };
    return s;
  }
  const save = s => writeJ('hh.house', s);
  function stars(){ return readJ('hh.stars', { n: 0, keys: [] }); }
  function credit(key){ const s = stars(); if (s.keys.indexOf(key) >= 0) return false; s.keys.push(key); if (s.keys.length > 400) s.keys = s.keys.slice(-300); s.n++; writeJ('hh.stars', s); return true; }
  function creditLog(){ const L = readJ('hh.log', {}), got = [];
    Object.keys(L).forEach(day => Object.keys(L[day]).forEach(st => (L[day][st] || []).forEach(e => { if (credit(day + '|' + st + '|' + e.t)) got.push(st); }))); return got; }
  const room = () => readJ('hh.room', { placed: {} });
  const saveRoom = r => writeJ('hh.room', r);

  window.HL = { fxItems, now, dayKey, dayNum, times, current, tahajjudNow, prayed, todayLog, light, dayKind, dayItems, garden, gardenAct, load, save, stars, credit, creditLog, room, saveRoom,
    TARGET, FIVE, MEALS, read: readJ, write: writeJ, rng, hash };
})();
