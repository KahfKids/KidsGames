#!/usr/bin/env node
/* Runs the world with no drawing, fast, and fails if the people misbehave.
   node tools/life-test.js [days=3] [minutes of play per day=20]
   A scripted child wanders and uses things. Checked every step: nobody stands on furniture or walls while walking,
   no two people rest on one spot for more than a moment, nobody stays stuck. Reports what everyone did. */
const path = require('path'), fs = require('fs');
const L = require('../life/world.js'), R = require('../life/rules.js');
const data = JSON.parse(fs.readFileSync(process.env.LIFE_DATA || path.join(__dirname, '..', 'life', 'data.json'), 'utf8'));
const days = +process.argv[2] || 3, perDay = +process.argv[3] || 20, dt = 1 / 30, rate = 1440 / (perDay * 60);
const w = new L.World(data, { clock: 300, rate: rate, day: 20000, weekday: 1, prayTimes: { fajr: 315, dhuhr: 735, asr: 945, maghrib: 1105, isha: 1200 } });
const rules = new R.Rules(w, null, {});
const home = w.places.myroom ? 'myroom' : Object.keys(w.places)[0];
const you = w.add(new L.Person('you', { you: true, kid: true, family: true, speed: 1.5, place: home })); const s0 = w.freeSpot(home, you); you.x = s0.x; you.y = s0.y;
const stat = { steps: 0, onFurniture: 0, shared: 0, sharedMax: 0, stuck: {}, uses: {}, prayers: 0, prayed: {}, crossings: 0, wishes: 0, wishesDone: 0, jobs: 0, jobsDone: 0, stickers: 0, toys: 0, visited: {} };
w.on.start = (p, th) => { const k = p.id + ':' + th.kind; stat.uses[k] = (stat.uses[k] || 0) + 1; };
w.on.prayEnd = (pid, who) => { stat.prayers++; who.forEach(p => { stat.prayed[p.id] = (stat.prayed[p.id] || 0) + 1; }); };
w.on.cross = (p, a, b) => { stat.crossings++; (stat.visited[p.id] = stat.visited[p.id] || {})[b] = 1; };
w.on.wish = () => stat.wishes++; w.on.wishDone = () => stat.wishesDone++; w.on.job = () => stat.jobs++; w.on.jobDone = () => stat.jobsDone++;
w.on.sticker = () => stat.stickers++; w.on.thing = () => stat.toys++;
const still = new Map(), pair = new Map(); let tYou = 0;
const total = Math.round(days * perDay * 60 / dt);
for (let i = 0; i < total; i++) {
  // the scripted child: every few seconds do something
  tYou -= dt;
  if (tYou <= 0 && !you.praying && you.state !== 'use') {
    tYou = 2 + Math.random() * 6; const pl = w.places[you.place], r = Math.random(), ids = Object.keys(pl.things).filter(id => !pl.things[id].fixed);
    const others = w.here(you.place).filter(p => p !== you && !p.hidden);
    if (w.prayers[you.place] && w.prayers[you.place].stage !== 'done' && r < 0.5) w.joinPrayer(you);
    else if (r < 0.45 && ids.length) w.use(you, ids[Math.floor(Math.random() * ids.length)]);
    else if (r < 0.6 && others.length) w.meet(you, others[Math.floor(Math.random() * others.length)], you.carry ? 'give' : 'salam');
    else if (r < 0.8) { const d = Object.keys(pl.doors); const t = pl.doors[d[Math.floor(Math.random() * d.length)]]; if (t && w.places[t.to]) { w.stop(you); w.travel(you, t.to); } }
    else { const s = w.freeSpot(you.place, you); w.stop(you); w.go(you, s.x, s.y); }
  }
  w.step(dt); stat.steps++;
  const act = w.people.filter(p => !p.away && !p.hidden);
  for (const p of act) {
    const g = w.places[p.place].grid;
    if (p.path.length && !g.ok(p.x, p.y)) { stat.onFurniture++; if (stat.onFurniture < 4) console.log('on furniture:', p.id, p.place, p.x.toFixed(2), p.y.toFixed(2)); }
    const key = p.place + '|' + p.state + '|' + Math.round(p.x * 4) + ',' + Math.round(p.y * 4), e = still.get(p.id);
    if (e && e.k === key) { e.t += dt; if (!p.you && p.state === 'idle' && e.t > 90 && !e.said) { e.said = 1; stat.stuck[p.id] = (stat.stuck[p.id] || 0) + 1; const b = w.block(p); if (process.argv[4]) console.log('stuck:', p.id, 'in', p.place, 'at', p.x.toFixed(2), p.y.toFixed(2), 'clock', Math.floor(w.clock / 60) + ':' + Math.floor(w.clock % 60), 'block', b && JSON.stringify(b), 'wait', p.wait.toFixed(1), 'praying', p.praying, 'calling', !!w.calling); } } else still.set(p.id, { k: key, t: 0 });
  }
  for (let a = 0; a < act.length; a++) for (let b = a + 1; b < act.length; b++) {
    const p = act[a], q = act[b], k = p.id + '+' + q.id;
    if (p.place === q.place && !p.path.length && !q.path.length && Math.hypot(p.x - q.x, p.y - q.y) < 0.3) {
      stat.shared++; const t = (pair.get(k) || 0) + dt; pair.set(k, t); if (t > stat.sharedMax) { stat.sharedMax = t; stat.worst = k + ' in ' + p.place + ' (' + p.state + '/' + q.state + ')'; }
    } else pair.delete(k);
  }
}
const who = {}; for (const k in stat.uses) { const [p, t] = k.split(':'); (who[p] = who[p] || []).push(t + ' x' + stat.uses[k]); }
console.log('simulated %d days of %d minutes (%d steps), %d places, %d people', days, perDay, stat.steps, Object.keys(w.places).length, w.people.length);
for (const p in who) console.log('  %s: %s%s', p.padEnd(8), who[p].join(', '), stat.visited[p] ? '   [went to: ' + Object.keys(stat.visited[p]).join(' ') + ']' : '');
console.log('prayers held: %d; who prayed: %s', stat.prayers, JSON.stringify(stat.prayed));
console.log('door crossings %d, wishes %d (met %d), chores %d (done %d), stickers %d, toys left out %d', stat.crossings, stat.wishes, stat.wishesDone, stat.jobs, stat.jobsDone, stat.stickers, stat.toys);
console.log('friends:', JSON.stringify(rules.s.friends), ' garden:', JSON.stringify(rules.s.garden), ' owned:', rules.s.owned.length);
console.log('walking on furniture: %d steps; two on one spot: %d steps (longest %ss %s); stuck: %s', stat.onFurniture, stat.shared, stat.sharedMax.toFixed(1), stat.worst || '', JSON.stringify(stat.stuck));
const bad = stat.onFurniture > 0 || stat.sharedMax > 3 || Object.keys(stat.stuck).length > 0;
console.log(bad ? 'FAILED' : 'PASSED'); process.exit(bad ? 1 : 0);
