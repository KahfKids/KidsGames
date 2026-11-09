/* Helping Home: the house's day. Time (real, or ?t=HH:MM for testing), prayer times (HHPrayer when it is there,
   fixed times when not), the light, the mess that appears on its own (seeded per day), tidy levels, stars and the
   child's decorations. Everything is saved on the device only. */
(function () {
  'use strict';
  const q = new URLSearchParams(location.search);

  /* ---------- the clock ---------- */
  let fakeAt = null; const t0 = Date.now();
  if (/^\d{1,2}(:\d{2})?$/.test(q.get('t') || '')){ const [h, m] = q.get('t').split(':').map(Number); const d = new Date(); d.setHours(h, m || 0, 0, 0); fakeAt = d.getTime(); }
  const now = () => new Date(fakeAt ? fakeAt + (Date.now() - t0) : Date.now());
  const dayKey = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();       // the same key as HHFlow.today()
  const atHM = (d, h, m) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x; };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);

  /* ---------- prayer times: HHPrayer (adhan-js on the device) or fixed fallbacks ---------- */
  function fallback(d){
    return { fajr: atHM(d, 5, 30), sunrise: atHM(d, 6, 50), dhuhr: atHM(d, 12, 30), asr: atHM(d, 15, 45), maghrib: atHM(d, 18, 15), isha: atHM(d, 19, 45),
      midnight: atHM(d, 23, 50), tahajjud: atHM(addDays(d, 1), 2, 0), nextFajr: atHM(addDays(d, 1), 5, 30), fallback: true };
  }
  const ok = t => t && ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].every(k => t[k] instanceof Date && !isNaN(t[k]));
  const cacheT = {};
  function times(d){
    const k = dayKey(d); if (cacheT[k]) return cacheT[k];
    let t = null;
    try { if (window.HHPrayer && HHPrayer.times) t = HHPrayer.times(d); } catch (e) { t = null; }
    if (!ok(t)) t = fallback(d);
    else { const fb = fallback(d); for (const k2 of ['midnight', 'tahajjud', 'nextFajr']) if (!(t[k2] instanceof Date)) t[k2] = fb[k2]; }
    return (cacheT[k] = t);
  }
  const FIVE = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const RAKAH = (window.HHPrayer && HHPrayer.RAKAH) || { fajr: 2, dhuhr: 4, asr: 4, maghrib: 3, isha: 4 };
  const endOf = (n, t) => ({ fajr: t.sunrise, dhuhr: t.asr, asr: t.maghrib, maghrib: t.isha, isha: t.midnight })[n];
  function current(d){
    const t = times(d), y = times(addDays(d, -1));
    if (d >= y.isha && d < y.midnight) return { name: 'isha', start: y.isha, end: y.midnight, day: dayKey(addDays(d, -1)) };
    for (const n of FIVE) if (d >= t[n] && d < endOf(n, t)) return { name: n, start: t[n], end: endOf(n, t), day: dayKey(d) };
    return null;
  }
  function tahajjudNow(d){
    const t = times(d), y = times(addDays(d, -1));
    return (y.tahajjud && d >= y.tahajjud && d < t.fajr) || (t.tahajjud && d >= t.tahajjud && d < t.nextFajr);
  }
  // was this prayer prayed (guided) today? The salah page logs {p:<name>} through HHFlow.done('salah', {p}).
  function prayed(name, dayK){
    const L = (window.HHFlow && HHFlow.read('hh.log', {})) || {}, day = L[dayK || dayKey(now())] || {};
    return (day.salah || []).some(e => (e.p || e.prayer) === name);
  }
  const todayLog = () => (window.HHFlow && HHFlow.log()) || {};

  /* ---------- the light through the day ---------- */
  const PH = {
    night:  { tint: '#3e4a7e', a: .52, sky: '#2c3766', lamps: 1,  bg: '#d9dae6' },
    dawn:   { tint: '#eaa79c', a: .24, sky: '#f4bfae', lamps: .6, bg: '#f2e4df' },
    day:    { tint: '#ffffff', a: 0,   sky: '#bfe0f2', lamps: 0,  bg: '#f2efe7' },
    golden: { tint: '#f1b05a', a: .22, sky: '#f7d08c', lamps: 0,  bg: '#f4e8d2' },
    dusk:   { tint: '#86699f', a: .38, sky: '#c58ba5', lamps: .9, bg: '#e7dde6' },
  };
  function blend(A, B, k){ k = Math.max(0, Math.min(1, k)); return { tint: mix(A.tint, B.tint, k), a: A.a + (B.a - A.a)*k, sky: mix(A.sky, B.sky, k), lamps: A.lamps + (B.lamps - A.lamps)*k, bg: mix(A.bg, B.bg, k) }; }
  function light(d){
    const t = times(d), ms = d.getTime(), M = 60000, span = (a, b) => (ms - a)/Math.max(1, b - a);
    const sr = t.sunrise.getTime(), mg = t.maghrib.getTime();
    let L;
    if (ms < t.fajr.getTime()) L = PH.night;
    else if (ms < sr) L = blend(PH.night, PH.dawn, span(t.fajr.getTime(), sr));
    else if (ms < sr + 50*M) L = blend(PH.dawn, PH.day, span(sr, sr + 50*M));
    else if (ms < t.asr.getTime()) L = PH.day;
    else if (ms < mg - 45*M) L = blend(PH.day, PH.golden, span(t.asr.getTime(), mg - 45*M));
    else if (ms < mg) L = blend(PH.golden, PH.dusk, span(mg - 45*M, mg));
    else if (ms < t.isha.getTime()) L = blend(PH.dusk, PH.night, span(mg, t.isha.getTime()));
    else L = PH.night;
    L.night = L.lamps > .5; L.key = L.sky + (L.night ? 'n' : 'd');
    return L;
  }

  /* ---------- seeded mess ---------- */
  function hash(s){ let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
  function rng(seed){ let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; }; }
  const Z = HD.ZF;
  const SPOTS = {
    bed: [[70, 92], [98, 120], [128, 98], [84, 150], [128, 150], [137, 196], [138, 236], [112, 76], [60, 128], [52, 104], [140, 128]],
    table: [[80, 70], [113, 100], [78, 113], [97, 128], [116, 126]],
    counter: [[24, 57]],
    hall: [[48, 214], [70, 262], [98, 236], [124, 280], [62, 292], [122, 214]],
  };
  const TOYC = ['#e8574a', '#5b8fd6', '#f2c230', '#5cae6a', '#e98fb0', '#ef8a3c'];
  const BOOKC = ['#e8574a', '#5b8fd6', '#5cae6a', '#9a6bb8', '#ef8a3c'];
  const SOCKC = ['#f2c230', '#e98fb0', '#76a0e2', '#5cae6a', '#fbf9f2'];
  const TARGET = { sock: 'basket', pyj: 'wardrobe', block: 'toybox', ball: 'toybox', car: 'toybox', rings: 'toybox', book: 'shelfB', plate: 'rack', bowl: 'rack', cup: 'rack', shoe: 'shoerack', bag: 'peg' };
  const ROOM_OF_TARGET = { basket: 'laundry', wardrobe: 'bedroom', toybox: 'bedroom', shelfB: 'bedroom', rack: 'kitchen', shoerack: 'kitchen', peg: 'kitchen' };
  // what happens through a day, with the time it happens (relative to the day's prayer times where it makes sense)
  function events(d){
    const t = times(d), at = (h, m) => atHM(d, h, m);
    const wake = new Date(Math.min(t.fajr.getTime() + 20*60000, at(7, 0).getTime()));
    return [
      { id: 'wake', at: wake }, { id: 'breakfast', at: at(8, 0) }, { id: 'laundry', at: at(9, 30) }, { id: 'thirsty', at: at(10, 0) },
      { id: 'lunch', at: at(13, 0) }, { id: 'school', at: at(15, 30) }, { id: 'dinner', at: at(19, 0) }, { id: 'evening', at: at(20, 0) },
    ];
  }
  // every item for the whole day (some not appeared yet): deterministic for the day
  function dayItems(d){
    const R = rng(hash('hh.' + dayKey(d))), pick = a => a[Math.floor(R()*a.length)];
    const free = { bed: SPOTS.bed.slice(), table: SPOTS.table.concat(SPOTS.counter.map(p => p.concat([1]))), hall: SPOTS.hall.slice() };
    const take = k => { const a = free[k]; if (!a.length) return null; return a.splice(Math.floor(R()*a.length), 1)[0]; };
    const out = [], ev = {}; events(d).forEach(e => { ev[e.id] = e.at; });
    const add = (eid, kind, area, extra) => { const sp = take(area); if (!sp) return;
      let pos, fl;
      if (area === 'bed'){ fl = 2; pos = [sp[0], sp[1], Z[2] + (sp[0] > 58 && sp[0] < 140 && sp[1] > 76 && sp[1] < 166 ? .9 : 0)]; }   // on the rug (if laid) or the floor
      else if (area === 'table'){ fl = 0; pos = [sp[0], sp[1], sp[2] ? Z[0] + 75 : Z[0] + 60]; }
      else { fl = 0; pos = [sp[0], sp[1], Z[0]]; }
      const n = out.filter(o => o.ev === eid && o.kind === kind).length;
      out.push(Object.assign({ id: eid + '.' + kind + n, ev: eid, at: ev[eid], kind, fl, pos, rot: R()*Math.PI*2, target: TARGET[kind], room: fl === 2 ? 'bedroom' : 'kitchen' }, extra)); };
    // wake: the bed (a tap), pyjamas, a sock or two
    add('wake', 'pyj', 'bed', { col: pick(['#9fc7ef', '#f3b6c6', '#b9e0c9']) });
    const socks = 1 + Math.floor(R()*2); for (let i = 0; i < socks; i++) add('wake', 'sock', 'bed', { col: pick(SOCKC) });
    add('breakfast', 'plate', 'table', { col: '#5b8fd6' }); add('breakfast', 'cup', 'table', { col: pick(['#e8574a', '#f2c230', '#5cae6a']) });
    add('lunch', 'bowl', 'table', { col: pick(['#ef8a3c', '#e8574a']) }); if (R() < .6) add('lunch', 'plate', 'table', { col: '#5cae6a' });
    add('school', 'shoe', 'hall', { col: '#e8574a' }); add('school', 'shoe', 'hall', { col: '#e8574a' });
    add('school', 'bag', 'hall', { col: '#e8574a' });
    const toys = ['block', 'ball', 'car', 'rings'];
    const nT = 2 + Math.floor(R()*2); for (let i = 0; i < nT; i++) add('school', pick(toys), 'bed', { col: pick(TOYC) });
    const nB = 1 + Math.floor(R()*2); for (let i = 0; i < nB; i++) add('school', 'book', 'bed', { col: pick(BOOKC) });
    add('dinner', 'plate', 'table', { col: '#5b8fd6' }); add('dinner', pick(['bowl', 'cup']), 'table', { col: pick(['#ef8a3c', '#5cae6a']) });
    add('evening', pick(toys), 'bed', { col: pick(TOYC) });
    // the cup that was on the counter is not mess (it was moved to the table spots only)
    const thirsty = HD.PLANTS.map(p => p.id).filter(() => R() < .75); if (!thirsty.length) thirsty.push(HD.PLANTS[1].id);
    return { items: out, ev, thirsty };
  }

  /* ---------- saved state ---------- */
  const read = (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  function load(){
    const d = now(), k = dayKey(d);
    let s = read('hh.house', null);
    if (!s || s.day !== k) s = { day: k, done: {}, bed: false, watered: {}, socksIn: 0 };   // a fresh day brings fresh mess
    return s;
  }
  const save = s => write('hh.house', s);

  /* ---------- stars: one for every finished station (from the day log) and every room tidied ---------- */
  function stars(){ return read('hh.stars', { n: 0, keys: [] }); }
  function credit(key){ const s = stars(); if (s.keys.indexOf(key) >= 0) return false; s.keys.push(key); if (s.keys.length > 400) s.keys = s.keys.slice(-300); s.n++; write('hh.stars', s); return true; }
  function creditLog(){
    const L = read('hh.log', {}); let got = [];
    Object.keys(L).forEach(day => Object.keys(L[day]).forEach(st => (L[day][st] || []).forEach(e => { if (credit(day + '|' + st + '|' + e.t)) got.push(st); })));
    return got;
  }
  const room = () => read('hh.room', { placed: {} });
  const saveRoom = r => write('hh.room', r);

  window.HL = { now, dayKey, times, current, tahajjudNow, prayed, todayLog, light, events, dayItems, load, save, stars, credit, creditLog, room, saveRoom,
    TARGET, ROOM_OF_TARGET, RAKAH, FIVE, read, write, rng, hash };
})();
