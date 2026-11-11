/* Helping Home (life): world.js
   The little world, with no drawing in it: the places and their floors, the things in them and what each gives,
   and the people (needs, timetables, what they choose to do, walking between places, greeting, prayer).
   rules.js adds what the child's kindness changes (friendship, the garden, chores, wishes, the album).
   game.js draws what these files decide. Both also run in Node for the self-test (tools/life-test.js).

   Data comes from life/data.json (built from tools/data/*.json; see tools/data/README.md for the format).
   Distances are metres; in each place (0, 0) is the far corner; +x runs down-left on screen, +y down-right.

   Like The Sims, the people are simple and the THINGS are smart: each thing says what need it fills and where to
   stand; a person scores the offers by how much they need them and picks among the best few, so people do
   different things and never share a seat. Needs never hurt anyone: there is nothing to lose.
   Worship is never a need and never scored. */
(function (root) {
  'use strict';
  const CELL = 0.25, NEEDS = ['food', 'rest', 'fun', 'clean'];
  const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const DIR = { 0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1] };
  // the parts of the town's roads that lie in an outdoor place, less the zebra crossings: [x0, y0, x1, y1] in its own tiles
  function roadBlocks(R, pl) {
    const out = [], h = R.half, ox = pl.at[0], oy = pl.at[1];
    for (const name in R.segs) {
      const s = R.segs[name], cuts = R.cross.filter(c => c.road === name).map(c => c.at).sort((a, b) => a[0] - b[0]); let a = s.from - h;
      for (const c of cuts.concat([[s.to + h, null]])) {
        if (c[0] > a) { let r = s.axis === 'x' ? [a, s.c - h, c[0], s.c + h] : [s.c - h, a, s.c + h, c[0]]; r = [Math.max(0, r[0] - ox), Math.max(0, r[1] - oy), Math.min(pl.w, r[2] - ox), Math.min(pl.d, r[3] - oy)]; if (r[2] > r[0] && r[3] > r[1]) out.push(r); }
        a = c[1];
      }
    }
    return out;
  }
  const TURN = { '+x': '+y', '+y': '-x', '-x': '-y', '-y': '+x' }, BACK = { '+x': '-x', '-x': '+x', '+y': '-y', '-y': '+y' };
  const quarter = rot => (((rot / 90) | 0) % 4 + 4) % 4;
  function rotPt(p, rot) { let x = p[0], y = p[1]; for (let i = quarter(rot); i > 0; i--) { const t = x; x = -y; y = t; } return [x, y]; }
  function rotFace(f, rot) { for (let i = quarter(rot); i > 0; i--) f = TURN[f]; return f; }
  // one rak'ah's worth of positions, shown calmly: [picture, seconds]
  // how each kind of animal moves (m/s); `sleep`: has a curled-up picture; `peck`: pecks at the ground between walks
  const ANIMAL = { cat: { speed: 1.1, sleep: 1 }, dog: { speed: 1.0, sleep: 1 }, hen: { speed: 0.7, peck: 1 }, rabbit: { speed: 0.9 }, tortoise: { speed: 0.18 },
    cow: { speed: 0.5 }, goat: { speed: 0.8 }, camel: { speed: 0.6 }, elephant: { speed: 0.55 }, giraffe: { speed: 0.6 } };
  /* The fard prayer in full, every rak'ah in its order (TEACHER REVIEW): the opening takbir; standing, ruku', standing
     again, two sujud with the sitting between them; the sitting for the tashahhud after the second rak'ah and after the
     last; then the salam to the right and to the left. Fajr 2, Dhuhr 4, Asr 4, Maghrib 3, Isha 4; Jumu'ah, after the
     khutbah at the masjid, 2. Seconds are how long each position is held. */
  const RAKAH = { fajr: 2, dhuhr: 4, asr: 4, maghrib: 3, isha: 4 };
  function prayerSteps(n) {
    const out = [['ptakbir', 2]];
    for (let r = 1; r <= n; r++) {
      out.push(['pstand', r <= 2 ? 9 : 6], ['pruku', 3.5], ['pstand', 2.5], ['psujud', 3.5], ['psit', 2.5], ['psujud', 3.5]);
      if (r === n) out.push(['psit', 14], ['psalamR', 1.8], ['psalamL', 1.8]); else if (r === 2) out.push(['psit', 8]);
    }
    return out;
  }

  /* ---------- a floor: which cells can be walked on, and the way from one spot to another ---------- */
  class Grid {
    constructor(w, d) { this.nx = Math.round(w / CELL); this.ny = Math.round(d / CELL); this.b = new Uint8Array(this.nx * this.ny); }
    cell(x, y) { return [Math.max(0, Math.min(this.nx - 1, Math.floor(x / CELL))), Math.max(0, Math.min(this.ny - 1, Math.floor(y / CELL)))]; }
    free(cx, cy) { return cx >= 0 && cy >= 0 && cx < this.nx && cy < this.ny && !this.b[cy * this.nx + cx]; }
    ok(x, y) { return x >= 0 && y >= 0 && this.free(Math.floor(x / CELL), Math.floor(y / CELL)); }
    rect(x0, y0, x1, y1) { for (let cy = Math.max(0, Math.floor(y0 / CELL)); cy < Math.min(this.ny, Math.ceil(y1 / CELL)); cy++) for (let cx = Math.max(0, Math.floor(x0 / CELL)); cx < Math.min(this.nx, Math.ceil(x1 / CELL)); cx++) this.b[cy * this.nx + cx] = 1; }
    circle(x, y, r) { for (let cy = Math.max(0, Math.floor((y - r) / CELL)); cy < Math.min(this.ny, Math.ceil((y + r) / CELL)); cy++) for (let cx = Math.max(0, Math.floor((x - r) / CELL)); cx < Math.min(this.nx, Math.ceil((x + r) / CELL)); cx++) if (Math.hypot((cx + 0.5) * CELL - x, (cy + 0.5) * CELL - y) < r) this.b[cy * this.nx + cx] = 1; }
    // mark the floor that can be walked to from the given spots (the doors): a pen behind its fence is free floor
    // for the animal inside it, but nobody else may be sent there
    flood(seeds) {
      const r = this.r = new Uint8Array(this.nx * this.ny), q = [];
      seeds.forEach(p => { const c = this.near(p[0], p[1]); if (c && !r[c[1] * this.nx + c[0]]) { r[c[1] * this.nx + c[0]] = 1; q.push(c); } });
      while (q.length) { const [cx, cy] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = cx + dx, y = cy + dy; if (this.free(x, y) && !r[y * this.nx + x]) { r[y * this.nx + x] = 1; q.push([x, y]); } } }
    }
    open(x, y) { return this.ok(x, y) && (!this.r || !!this.r[Math.floor(y / CELL) * this.nx + Math.floor(x / CELL)]); }
    // the free cell nearest to a spot
    near(x, y) {
      const [sx, sy] = this.cell(x, y); if (this.free(sx, sy)) return [sx, sy];
      let best = null, bd = 1e9;
      for (let cy = 0; cy < this.ny; cy++) for (let cx = 0; cx < this.nx; cx++) if (!this.b[cy * this.nx + cx]) { const d = Math.hypot(cx - sx, cy - sy); if (d < bd) { bd = d; best = [cx, cy]; } }
      return best;
    }
    // the spot itself when it is free floor, else the middle of the nearest free cell
    spot(x, y) { if (this.ok(x, y)) return { x: x, y: y }; const c = this.near(x, y); return c ? { x: (c[0] + 0.5) * CELL, y: (c[1] + 0.5) * CELL } : null; }
    // A*: eight directions, never cutting a corner. Returns points [{x, y}] ending exactly at `to`.
    path(from, to) {
      const n = this.nx, s = this.near(from.x, from.y), g = this.near(to.x, to.y); if (!s || !g) return [];
      const N = n * this.ny, cost = new Float32Array(N).fill(1e9), prev = new Int32Array(N).fill(-1), open = [];
      const si = s[1] * n + s[0], gi = g[1] * n + g[0]; cost[si] = 0; open.push([0, si]);
      const h = i => { const dx = Math.abs(i % n - g[0]), dy = Math.abs((i / n | 0) - g[1]); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
      while (open.length) {
        let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
        const cur = open.splice(bi, 1)[0][1]; if (cur === gi) break;
        const cx = cur % n, cy = cur / n | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue; const nx = cx + dx, ny = cy + dy; if (!this.free(nx, ny)) continue;
          if (dx && dy && (!this.free(cx + dx, cy) || !this.free(cx, cy + dy))) continue;
          const ni = ny * n + nx, c = cost[cur] + (dx && dy ? 1.414 : 1);
          if (c < cost[ni]) { cost[ni] = c; prev[ni] = cur; open.push([c + h(ni), ni]); }
        }
      }
      if (prev[gi] < 0 && gi !== si) return [];
      const pts = []; for (let i = gi; i >= 0 && i !== si; i = prev[i]) pts.push({ x: (i % n + 0.5) * CELL, y: ((i / n | 0) + 0.5) * CELL });
      pts.reverse();
      // drop the points in the middle of a straight run, then finish exactly on the spot asked for
      const out = []; for (let i = 0; i < pts.length; i++) { const a = out[out.length - 1] || from, b = pts[i], c = pts[i + 1]; if (c && Math.abs((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)) < 1e-6) continue; out.push(b); }
      const end = this.ok(to.x, to.y) ? { x: to.x, y: to.y } : { x: (g[0] + 0.5) * CELL, y: (g[1] + 0.5) * CELL };
      if (out.length) out[out.length - 1] = end; else if (dist(from, end) > 0.02) out.push(end);
      return out;
    }
  }

  /* ---------- a place: its floor, its things (with their places to stand) and its doors ---------- */
  class Place {
    constructor(id, sp, kinds) {
      this.id = id; this.w = sp.size[0]; this.d = sp.size[1]; this.outdoor = !!sp.outdoor; this.sp = sp; this.kinds = kinds;
      this.at = sp.at || [0, 0];                                              // where this place's (0, 0) is on the one map
      this.lot = sp.lot || null; this.floor = sp.floor || 0; this.roads = [];  // the building it is a room of; the road in it
      this.things = {}; (sp.things || []).forEach(t => this.add(t));
      this.doors = {};
      (sp.doors || []).forEach(dr => {
        // (open ground between two zones: the spot is right at the edge, so stepping over is not seen)
        const m = dr.pos + (dr.w || 1.15) / 2, i = dr.open ? CELL / 2 : 0.5, s = { L: [m, i, '-y'], R: [i, m, '-x'], FL: [this.w - i, m, '+x'], FR: [m, this.d - i, '+y'] }[dr.wall];
        this.doors[dr.id] = { id: dr.id, place: id, x: s[0], y: s[1], out: s[2], to: dr.to, door: dr.door, wall: dr.wall, icon: dr.icon || dr.to, open: !!dr.open, stairs: dr.style === 'stairs' };
      });
      const spots = l => (l || []).map(p => ({ x: p[0], y: p[1], by: null }));
      this.pray = spots(sp.pray); this.prayW = spots(sp.prayW);
      this.regrid();
    }
    add(t) {
      const k = this.kinds[t.kind]; if (!k) return null; const rot = t.rot || 0;
      const th = { id: t.id, kind: t.kind, k: k, at: [t.at[0], t.at[1]], rot: rot, place: this.id, fixed: !!(k.fixed || t.fixed), state: t.state != null ? t.state : (k.states ? k.states[0] : null), slots: [] };
      this.things[t.id] = th; this.slotsOf(th); return th;
    }
    slotsOf(th) {
      const old = th.slots;
      th.slots = (th.k.slots || []).map((s, i) => {
        const a = rotPt(s.at, th.rot), f = rotPt(s.from || s.at, th.rot);
        return { x: th.at[0] + a[0], y: th.at[1] + a[1], fx: th.at[0] + f[0], fy: th.at[1] + f[1], face: rotFace(s.face || '+y', th.rot), over: !!s.over, staff: !!s.staff, pose: s.pose || th.k.pose || 'idle', by: old[i] ? old[i].by : null };
      });
      if (th.k.eat) { const e = rotPt(th.k.eat, th.rot); th.eat = { x: th.at[0] + e[0], y: th.at[1] + e[1] }; }   // where an animal stands to eat from it
    }
    // the floor a thing covers: [x0, y0, x1, y1] (turned with the thing)
    foot(th) { const q = quarter(th.rot) % 2, w = th.k.size[q ? 1 : 0], d = th.k.size[q ? 0 : 1]; return [th.at[0] - w / 2, th.at[1] - d / 2, th.at[0] + w / 2, th.at[1] + d / 2]; }
    regrid() {
      const g = this.grid = new Grid(this.w, this.d);
      if (!this.outdoor) { g.rect(0, 0, this.w, CELL); g.rect(0, 0, CELL, this.d); }   // indoors: keep off the two back walls
      (this.sp.blocks || []).forEach(b => g.rect(b[0], b[1], b[2], b[3]));
      this.roads.forEach(b => g.rect(b[0], b[1], b[2], b[3]));                // the road, except where a crossing is
      for (const id in this.things) {
        const th = this.things[id], k = th.k, pad = k.pad != null ? k.pad : 0.1;
        if (k.solid === 'rect') { const f = this.foot(th); g.rect(f[0] - pad, f[1] - pad, f[2] + pad, f[3] + pad); }
        else if (k.solid === 'circle') g.circle(th.at[0], th.at[1], k.size[0] / 2 + pad);
      }
      const doors = Object.keys(this.doors).map(id => [this.doors[id].x, this.doors[id].y]); if (doors.length) g.flood(doors);
    }
  }

  class Person {
    constructor(id, o) {
      o = o || {};
      Object.assign(this, { id: id, sprite: o.sprite || id, place: o.place || null, x: o.x || 1, y: o.y || 1, face: '+y', state: 'idle', pose: 'idle', path: [],
        speed: o.speed || 1.15, kid: !!o.kid, toddler: !!o.toddler, male: !!o.male, you: !!o.you, family: !!o.family, away: false, hidden: false,
        needs: { food: rnd(0.45, 0.9), rest: rnd(0.45, 0.9), fun: rnd(0.45, 0.9), clean: rnd(0.5, 0.9) }, rate: o.rate || { food: 0.006, rest: 0.005, fun: 0.007, clean: 0.004 },
        wait: rnd(0.5, 3), thing: null, slot: null, t: 0, T: 0, then: null, last: null, carry: null, praying: null, spot: null, hi: 0,
        day: o.day || null, roam: o.roam || null, bed: o.bed || null, gate: o.gate || null, prayAt: o.pray || null, fromDay: o.fromDay || 0, follow: o.follow || null,
        bus: !!o.bus, car: !!o.car, riding: null, waitBus: null, due: false, coming: false });
      const parse = day => day && day.map(b => {                                    // [minute, 'type:arg'] -> a block
        const s = b[1], i = s.indexOf(':'), type = i < 0 ? s : s.slice(0, i), arg = i < 0 ? '' : s.slice(i + 1), blk = { m: b[0], type: type };
        if (type === 'work' || type === 'sleep') { const a = arg.split('/'); blk.place = a[0]; blk.thing = a[1]; }
        else if (type === 'at' || type === 'out') blk.places = arg.split(',');
        else if (type === 'with') blk.who = arg;
        return blk;
      });
      this.day = parse(this.day); this.fri = parse(o.fri); this.we = parse(o.we);     // Friday, and the weekend (Saturday, Sunday)
    }
  }

  class World {
    /* data: life/data.json. opts: { clock: minutes of the day now, rate: clock minutes per second (1/60 = real time) } */
    constructor(data, opts) {
      opts = opts || {};
      this.data = data; this.kinds = data.kinds; this.places = {}; this.people = []; this.by = {}; this.on = {}; this.time = 0;
      this.clock = opts.clock != null ? opts.clock : 600; this.rate = opts.rate != null ? opts.rate : 1 / 60; this.dayNo = opts.day || 0; this.weekday = opts.weekday != null ? opts.weekday : 1;
      this.calling = null; this.prayers = {}; this.prayTimes = opts.prayTimes || null; this.lamps = {};
      for (const id in data.places) this.places[id] = new Place(id, data.places[id], data.kinds);
      this.map = data.world || null;
      if (this.map) for (const id in this.places) { const pl = this.places[id]; if (pl.outdoor) { pl.roads = roadBlocks(this.map.roads, pl); if (pl.roads.length) pl.regrid(); } }
      // (hop[a][b]: the door of a that starts the shortest way to b, measured from the middle of a)
      this.hop = {};
      for (const a in this.places) { const h = this.hop[a] = {}, pl = this.places[a], mid = { x: pl.w / 2, y: pl.d / 2 }; for (const t in this.places) { if (t === a) continue; const d = this.doorTo(a, t, mid); if (d) h[t] = d.id; } }
      for (const id in (data.people || {})) { const o = data.people[id]; if (!o.you) this.add(new Person(id, o)); }
      // the animals: a cat that has the run of the house, hens in the yard, the animals of the animal park in their pens
      for (const id in (data.animals || {})) {
        const o = data.animals[id], A = ANIMAL[o.kind] || {}; if (!this.places[o.place]) continue;
        const a = new Person(id, { sprite: o.kind, place: o.place, x: o.at[0], y: o.at[1], speed: A.speed || 0.7, roam: o.roam, rate: { food: 0.004, rest: 0.003, fun: 0, clean: 0 } });
        Object.assign(a, { animal: o.kind, zone: o.zone || null, food: o.food || null, home: o.place, bedAt: o.bed || null, called: false });
        const at = this.places[o.place].grid.spot(a.x, a.y); if (at) { a.x = at.x; a.y = at.y; }
        this.add(a);
      }
      this.timers = [];
      this.initRoad();
      this.people.forEach(p => this.settle(p));
    }
    emit(name, a, b, c) { if (this.on[name]) this.on[name](a, b, c); if (this.rules && this.rules[name]) this.rules[name](a, b, c); }
    add(p) { this.people.push(p); this.by[p.id] = p; if (p.you) this.you = p; return p; }
    here(pid) { return this.people.filter(p => p.place === pid && !p.away); }
    grid(p) { return this.places[p.place].grid; }
    // a place to stand is open when nobody has taken it and nobody else is standing on it
    // (a staff place, behind a counter, is only for the person whose work it is)
    open(s, p, th) { if (s.staff) { const b = p && this.block(p); if (!(b && b.type === 'work' && th && b.thing === th.id && b.place === th.place)) return false; } return !s.by && this.people.every(o => o === p || o.animal || o.place !== p.place || o.path.length || dist(o, s) > 0.4); }
    release(p) { if (p.slot) { if (p.state === 'use') { p.x = p.slot.fx; p.y = p.slot.fy; } p.slot.by = null; p.slot = null; } if (p.thing && p.hidden) this.unhide(p); p.thing = null; }
    unhide(p) { p.hidden = false; const th = p.thing; if (th && th.k.states && th.k.act === 'bath') { th.state = th.k.states[0]; this.emit('state', th); } }
    stop(p) { this.release(p); p.path = []; p.then = null; p.state = 'idle'; p.pose = 'idle'; p.asleep = false; p.waitBus = null; p.wait = rnd(1, 3); }
    faceTo(p, q) { const dx = q.x - p.x, dy = q.y - p.y; p.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? '+x' : '-x') : (dy > 0 ? '+y' : '-y'); }
    // is the keeper of this place (the shopkeeper, the baker, the teacher) at work here now? (not only while standing at the till)
    staffed(pid) { return this.people.some(o => { if (o.place !== pid || o.away || o.praying) return false; const b = this.block(o); return b && b.type === 'work' && b.place === pid; }); }
    allowed(p, k) { return !k.who || (k.who === 'kids' ? p.kid && !p.toddler : k.who === 'adults' ? !p.kid : k.who === 'toddler' ? p.toddler : true); }

    /* ---------- the clock and the timetable ---------- */
    block(p) { const day = (this.weekday === 5 && p.fri) || ((this.weekday === 6 || this.weekday === 0) && p.we) || p.day; if (!day) return null; let b = day[day.length - 1]; for (const x of day) if (x.m <= this.clock) b = x; return b; }
    // put someone where their timetable says they are right now (used at the start, and when they come back)
    settle(p) {
      const b = this.block(p); if (!b) return;
      if (p.fromDay > (this.playDay || 0)) { p.away = true; p.place = null; return; }
      let pid = b.type === 'work' || b.type === 'sleep' ? b.place : b.places ? pick(b.places) : b.type === 'with' && this.by[b.who] ? this.by[b.who].place : p.roam ? pick(p.roam) : null;
      if (b.type === 'away' || !pid || !this.places[pid]) { p.away = true; p.place = null; return; }
      p.away = false; p.place = pid; const s = this.freeSpot(pid, p); p.x = s.x; p.y = s.y;
    }
    freeSpot(pid, p, near, r) {
      const pl = this.places[pid], g = pl.grid;
      for (let i = 0; i < 40; i++) {
        const x = near ? near.x + rnd(-r, r) : rnd(0.6, pl.w - 0.5), y = near ? near.y + rnd(-r, r) : rnd(0.6, pl.d - 0.5);
        if (x > 0.4 && y > 0.4 && x < pl.w - 0.3 && y < pl.d - 0.3 && (p && p.animal ? g.ok(x, y) : g.open(x, y)) && this.people.every(o => o === p || o.place !== pid || dist(o, { x: x, y: y }) > 0.7)) return { x: x, y: y };
      }
      if (!(p && p.animal)) { const d = Object.keys(pl.doors)[0]; if (near ? !g.open(near.x, near.y) : d) { const dr = pl.doors[d]; return g.spot(dr ? dr.x : pl.w / 2, dr ? dr.y : pl.d / 2) || { x: 1, y: 1 }; } }
      return g.spot(near ? near.x : pl.w / 2, near ? near.y : pl.d / 2) || { x: 1, y: 1 };
    }

    /* ---------- walking: inside a place, and from place to place through the doors ---------- */
    go(p, x, y, then) {
      const path = this.grid(p).path(p, { x: x, y: y });
      p.path = path; p.then = then || null; p.state = path.length ? 'walk' : 'idle'; p.pose = path.length ? 'walk' : 'idle';
      if (!path.length && then) { p.then = null; then(); }
      return path.length > 0;
    }
    // walk to a spot in another place (x, y may be left out: then stop a little way inside)
    /* The door of place `a` to take toward place `t`, for someone standing at `from` (and, if known, going to x, y
       there): the first door of the shortest walk, door to door, over the whole map (not just the fewest doors). */
    doorTo(a, t, from, x, y) {
      const P = this.places, best = new Map(), open = [];                           // best: door -> metres walked to reach it
      for (const id in P[a].doors) { const d = P[a].doors[id]; if (P[d.to] && P[d.to].doors[d.door]) { best.set(d, dist(from, d)); open.push([d, d]); } }
      let win = null, wc = Infinity; const first = new Map(open);
      while (open.length) {
        let i = 0; for (let j = 1; j < open.length; j++) if (best.get(open[j][0]) < best.get(open[i][0])) i = j;
        const d = open.splice(i, 1)[0][0], c = best.get(d); if (c >= wc) break;
        const o = P[d.to].doors[d.door];
        if (d.to === t) { const e = c + (x != null ? Math.hypot(o.x - x, o.y - y) : 0); if (e < wc) { wc = e; win = first.get(d); } continue; }
        for (const id in P[d.to].doors) {
          const n = P[d.to].doors[id]; if (n === o || !P[n.to] || !P[n.to].doors[n.door]) continue; const cn = c + dist(o, n) + 0.01;
          if (cn < (best.has(n) ? best.get(n) : Infinity)) { if (!best.has(n)) open.push([n, n]); best.set(n, cn); first.set(n, first.get(d)); }
        }
      }
      return win;
    }
    // where someone is on the one map
    xy(p) { const a = this.places[p.place].at; return { x: a[0] + p.x, y: a[1] + p.y }; }
    // the outdoor place under a spot on the map (null: none)
    zoneAt(wx, wy) { for (const id in this.places) { const pl = this.places[id]; if (pl.outdoor && wx >= pl.at[0] && wy >= pl.at[1] && wx < pl.at[0] + pl.w && wy < pl.at[1] + pl.d) return pl; } return null; }
    travel(p, pid, x, y, then) {
      if (p.away || !this.places[pid]) return false;
      if (p.place === pid) { if (x == null) { if (then) then(); return true; } this.go(p, x, y, then); return true; }
      const d = this.doorTo(p.place, pid, p, x, y); if (!d) return false;
      p.dest = pid;
      this.go(p, d.x, d.y, () => {
        if (p.riding === 'bike' && !this.places[d.to].outdoor) this.dismount(p);          // the bicycle stays outside
        if (!this.cross(p, d)) return this.stop(p);
        if (p.place === pid && x == null) { const s = this.freeSpot(pid, p, p, 1.6); this.go(p, s.x, s.y, then); }
        else this.travel(p, pid, x, y, then);
      });
      p.state = 'walk'; return true;
    }
    cross(p, d) {
      const from = p.place, o = this.places[d.to] && this.places[d.to].doors[d.door]; if (!o) return false;
      p.place = d.to; p.x = o.x; p.y = o.y; p.face = BACK[o.out]; p.dest = null;
      this.emit('cross', p, from, d.to);
      if (p.you && !d.open) this.here(d.to).forEach(q => { if (q !== p && q.state === 'idle' && !q.path.length && !q.praying && this.time - q.hi > 20) { q.hi = this.time; this.faceTo(q, p); q.state = 'greet'; q.pose = 'wave'; q.t = 0; q.T = 1.6; } });
      return true;
    }
    // leave the world for a while (work, home in a house you cannot enter), and come back
    // Someone with a car drives off in it; someone who takes the bus waits at the stop for it.
    leave(p) {
      if (!p.gate || !this.places[p.gate[0]]) { p.away = true; p.place = null; return; }
      this.travel(p, p.gate[0], p.gate[1], p.gate[2], () => {
        this.stop(p); const f = this.fam;
        if (p.bus && this.route.indexOf(p.place) >= 0) {                              // wait for the bus, a step apart from the others
          const pid = p.place, q = this.freeSpot(pid, p, p, 1.1), wait = () => { p.face = '+y'; p.state = 'wait'; p.waitBus = pid; p.wait = 75; };
          if (!this.go(p, q.x, q.y, wait)) wait(); return;
        }
        if (p.car && f && f.phase === 'parked' && f.zone === p.place) f.phase = 'pull';
        this.gone(p);
      });
    }
    gone(p) { p.state = 'idle'; p.waitBus = null; p.away = true; p.place = null; this.emit('gone', p); }
    arrive(p) {
      const f = this.fam;
      if (p.car && f && f.phase === 'gone') { const L = this.lanes; f.phase = 'in'; f.x = L.west; f.y = L.north; f.rot = 0; f.pts = [[L.west, L.north], [f.bay[0], L.north]]; f.i = 0; f.v = 2.4; f.who = p; p.coming = true; return; }
      if (p.car && f && f.phase !== 'parked') { p.coming = true; f.who = p; return; }
      if (p.bus && p.gate && this.route.indexOf(p.gate[0]) >= 0 && !p.due) { p.due = true; p.dueT = 90; return; }
      this.land(p);
    }
    land(p) { p.due = false; p.coming = false; if (p.gate && this.places[p.gate[0]]) { p.away = false; p.place = p.gate[0]; p.x = p.gate[1]; p.y = p.gate[2]; p.state = 'idle'; p.wait = 1; } else this.settle(p); if (!p.away) this.emit('back', p); }

    /* ---------- the roads: cars going round and through, the bus on its round, the family car, the child's bicycle ----------
       Everything on a road is on the one map (x, y in map tiles; rot 0 = toward +x, 90 = +y, 180 = -x, 270 = -y) and follows
       a lane: a list of corners. Traffic keeps right. The lanes come from data.world.roads (tools/data/world.json). */
    initRoad() {
      const R = this.map && this.map.roads; this.cars = []; this.tCar = 2; this.vid = 0; this.route = []; this.stops = []; this.fam = null; this.bus = null; this.lanes = null;
      if (!R) return;
      const l = R.lane, a = R.ring[0], b = R.ring[1], c = R.ring[2], d = R.ring[3], W = R.ends[0][0], E = R.ends[1][0], n = a[1] - l, s2 = a[1] + l;
      const outer = [[a[0] - l, n], [b[0] + l, n], [c[0] + l, c[1] + l], [d[0] - l, d[1] + l]];          // main +x, avenue +y, front -x, side -y
      const inner = [[b[0] - l, s2], [a[0] + l, s2], [d[0] + l, d[1] - l], [c[0] - l, c[1] - l]];        // the other way round
      this.lanes = { outer: outer, north: n, south: s2, west: W, east: E,
        ways: [[[W, n], [E, n]], [[E, s2], [W, s2]],
          [[W, n], outer[1], outer[2], outer[3], [outer[0][0], s2], [W, s2]],
          [[E, s2], inner[1], inner[2], inner[3], [inner[0][0], n], [E, n]]] };
      // the bus stops, in the order the bus meets them on the outer loop
      const along = st => { for (let i = 0; i < 4; i++) { const p = outer[i], q = outer[(i + 1) % 4], on = Math.abs((q[0] - p[0]) * (st.at[1] - p[1]) - (q[1] - p[1]) * (st.at[0] - p[0])) < 0.05; if (on) return i * 1000 + Math.abs(st.at[0] - p[0]) + Math.abs(st.at[1] - p[1]); } return -1; };
      this.stops = (R.stops || []).filter(st => this.places[st.zone] && along(st) >= 0).map(st => ({ zone: st.zone, x: st.at[0], y: st.at[1], wait: st.wait, k: along(st), seg: Math.floor(along(st) / 1000) })).sort((p, q) => p.k - q.k);
      this.route = this.stops.map(st => st.zone);
      if (this.stops.length) this.bus = { id: -2, kind: 'bus', pts: outer, loop: true, i: 0, x: outer[0][0] + 1, y: outer[0][1], rot: 0, v: 0, len: 3.4, phase: 'run', t: 0, next: 0, carry: null };
      const z = R.bay && this.zoneAt(R.bay[0], R.bay[1]);
      if (z) this.fam = { id: -1, kind: 'car', state: 'fam', x: R.bay[0], y: R.bay[1], bay: R.bay, zone: z.id, rot: 0, v: 0, phase: 'parked', len: 2.0, who: null, pts: null, i: 0 };
    }
    vehicles() { const out = this.cars.slice(); if (this.bus) out.push(this.bus); if (this.fam && this.fam.phase !== 'gone') out.push(this.fam); return out; }
    heading(v) { const n = v.pts.length, p = v.pts[v.i], q = v.pts[(v.i + 1) % n]; return Math.abs(q[0] - p[0]) > Math.abs(q[1] - p[1]) ? (q[0] > p[0] ? 0 : 180) : (q[1] > p[1] ? 90 : 270); }
    // along its lane by d metres, turning at the corners; false when it has driven off the map
    move(v, d) {
      const n = v.pts.length;
      while (d > 1e-6) {
        const q = v.pts[(v.i + 1) % n], dx = q[0] - v.x, dy = q[1] - v.y, L = Math.hypot(dx, dy);
        if (L > d) { v.x += dx / L * d; v.y += dy / L * d; return true; }
        v.x = q[0]; v.y = q[1]; d -= L; v.i++;
        if (v.i >= (v.loop ? n : n - 1)) { if (!v.loop) return false; v.i = 0; }
        v.rot = this.heading(v);
      }
      return true;
    }
    // someone on the road just ahead, or another vehicle: wait
    blocked(v) {
      const u = DIR[v.rot], fx = v.x + u[0] * v.len / 2, fy = v.y + u[1] * v.len / 2;
      for (const q of this.walkers) { const rx = q.x - fx, ry = q.y - fy, ahead = rx * u[0] + ry * u[1]; if (ahead > -0.4 && ahead < 2.4 && Math.abs(rx * u[1] - ry * u[0]) < 0.9) return true; }
      for (const o of this.vehicles()) {
        if (o === v) continue; const rx = o.x - v.x, ry = o.y - v.y, ahead = rx * u[0] + ry * u[1], side = Math.abs(rx * u[1] - ry * u[0]);
        if (ahead <= 0 || ahead > (o.len + v.len) / 2 + 0.9) continue;
        if (side < 0.7 || (o.rot !== v.rot && side < 1.3 && o.id < v.id && o.v > 0.1)) return true;      // in my lane, or crossing my way at a junction
      }
      return false;
    }
    drive(v, dt, vmax) { v.v = this.blocked(v) ? Math.max(0, v.v - 9 * dt) : Math.min(vmax, v.v + 3 * dt); return this.move(v, v.v * dt); }
    stopSpot(zone) { const st = this.stops.find(x => x.zone === zone), pl = this.places[zone]; return st && pl.grid.spot(st.wait[0] - pl.at[0], st.wait[1] - pl.at[1]); }
    stepRoad(dt) {
      const L = this.lanes; if (!L) return;
      this.walkers = []; for (const p of this.people) if (!p.away && !p.hidden && this.places[p.place].roads.length) this.walkers.push(this.xy(p));
      // cars and scooters come and go all the time, all over the town
      this.tCar -= dt;
      if (this.tCar <= 0) {
        this.tCar = rnd(3.5, 8); const pts = pick(L.ways), sc = Math.random() < 0.22;
        if (this.cars.length < 5 && !this.vehicles().some(o => Math.abs(o.x - pts[0][0]) + Math.abs(o.y - pts[0][1]) < 5)) {
          const c = { id: ++this.vid, kind: sc ? 'scooter' : 'car', state: sc ? null : pick(['a', 'b', 'c']), pts: pts, loop: false, i: 0, x: pts[0][0], y: pts[0][1], v: 2.4, vmax: rnd(2.2, 3.0), len: sc ? 1.5 : 2.0 };
          c.rot = this.heading(c); this.cars.push(c);
        }
      }
      this.cars = this.cars.filter(c => this.drive(c, dt, c.vmax));
      // the bus goes round its stops, whether or not anyone is watching
      const b = this.bus;
      if (b) {
        if (b.phase === 'stop') { b.t -= dt; if (b.t <= 0) { b.phase = 'run'; b.next = (b.next + 1) % this.stops.length; } }
        else {
          const st = this.stops[b.next], u = DIR[b.rot], ahead = (st.x - b.x) * u[0] + (st.y - b.y) * u[1];
          if (b.i === st.seg && ahead < 0.06) { b.phase = 'stop'; b.t = 4.5; b.v = 0; this.busStop(st.zone); }
          else this.drive(b, dt, b.i === st.seg ? Math.min(2.8, 0.5 + ahead * 1.5) : 2.8);
        }
      }
      // the family car: out of its bay and away, or home again and back into the bay
      const f = this.fam;
      if (f && f.phase !== 'parked' && f.phase !== 'gone') {
        if (f.phase === 'pull') { f.y = Math.min(L.north, f.y + 0.9 * dt); if (f.y >= L.north) { f.phase = 'go'; f.v = 0.5; f.pts = [[f.x, L.north], [L.east, L.north]]; f.i = 0; } }
        else if (f.phase === 'go') { if (!this.drive(f, dt, 2.8)) f.phase = 'gone'; }
        else if (f.phase === 'in') { const d = f.bay[0] - f.x; if (d < 0.05) { f.phase = 'tuck'; f.v = 0; } else this.drive(f, dt, Math.min(2.6, 0.5 + d * 1.5)); }
        else if (f.phase === 'tuck') { f.y = Math.max(f.bay[1], f.y - 0.9 * dt); if (f.y <= f.bay[1]) { f.phase = 'parked'; if (f.who) { this.land(f.who); f.who = null; } } }
      }
    }
    // the bus has stopped at a zone's stop: people get off, people get on
    busStop(zone) {
      const b = this.bus;
      this.people.forEach(p => {
        if (p.due && p.gate && p.gate[0] === zone) this.land(p);
        else if (p.waitBus === zone && !p.you) this.gone(p);
      });
      const you = this.you; if (!you) return;
      if (b.carry === you) {                                                        // the child rode to this stop
        const from = you.place, s = this.stopSpot(zone) || { x: 1, y: 1 };
        b.carry = null; you.place = zone; you.x = s.x; you.y = s.y; you.hidden = false; you.riding = null; you.state = 'idle';
        if (from !== zone) this.emit('cross', you, from, zone); this.emit('off', you, zone);
      }
      else if (you.waitBus === zone && you.place === zone) { you.waitBus = null; you.hidden = true; you.riding = 'bus'; you.state = 'wait'; b.carry = you; this.emit('board', you, zone); }
    }
    // the bicycle
    mount(p, th) { delete this.places[p.place].things[th.id]; th.gone = true; p.riding = 'bike'; p.speed0 = p.speed; p.speed *= 1.9; this.emit('take', p, th); this.emit('ride', p); }
    dismount(p) {
      if (p.riding !== 'bike') return; p.riding = null; p.speed = p.speed0 || p.speed;
      const pl = this.places[p.place], s = pl.grid.spot(p.x + 0.45, p.y + 0.1) || { x: p.x, y: p.y }, th = pl.add({ id: 'bike', kind: 'bike', at: [s.x, s.y] });
      if (th) this.emit('thing', th); this.emit('ride', p);
    }

    /* ---------- using things ---------- */
    // a free floor spot right beside a thing, on the side `p` is on
    beside(p, th) {
      const pl = this.places[th.place], f = pl.foot(th), cx = th.at[0], cy = th.at[1], r = Math.max(f[2] - f[0], f[3] - f[1]) / 2 + 0.45;
      const a = Math.atan2(p.y - cy, p.x - cx);
      return pl.grid.spot(Math.max(0.4, Math.min(pl.w - 0.3, cx + Math.cos(a) * r)), Math.max(0.4, Math.min(pl.d - 0.3, cy + Math.sin(a) * r))) || { x: p.x, y: p.y };
    }
    use(p, id) {
      const pl = this.places[p.place], th = pl && pl.things[id]; if (!th || th.gone) return false;
      const k = th.k;
      if (p.riding === 'bike') this.dismount(p);
      if (k.act === 'ride') { if (!p.you) return false; this.stop(p); const s = this.beside(p, th); this.go(p, s.x, s.y, () => { if (!th.gone) this.mount(p, th); }); return true; }
      if (k.act === 'bus') {
        if (!p.you || !this.route.length) return false; this.stop(p); const s = th.slots[0] || this.beside(p, th);
        this.go(p, s.fx != null ? s.fx : s.x, s.fy != null ? s.fy : s.y, () => { p.face = '+y'; p.state = 'wait'; p.waitBus = p.place; this.emit('waitBus', p, th); });
        return true;
      }
      // a child may use a grown-up's thing to do a chore that is waiting there, or to help a grown-up who is at it
      const job = p.you && this.rules && this.rules.jobAt(th), helping = p.you && this.here(p.place).some(o => o !== p && o.thing === th);
      if (!this.allowed(p, k) && !job && !helping && !(p.you && p.cook && k.skill === 'cook')) { this.emit('no', p, th); return false; }
      // buying: the shop must have someone serving, the child needs free hands and enough coins
      if (p.you && k.price && !job) {
        const staffed = !Object.keys(pl.things).some(i => pl.things[i].slots.some(s => s.staff)) || this.staffed(p.place);
        if (!staffed) { this.emit('closed', p, th); return false; }
        if (p.carry) { this.emit('hands', p, th); return false; }
        if (this.rules && this.rules.s.coins < k.price) { this.emit('poor', th); return false; }
      }
      // the shop's book of things for the home, at the till
      if (p.you && k.act === 'shop' && !job) {
        if (!this.staffed(p.place)) { this.emit('closed', p, th); return false; }
        const sl = th.slots.filter(x => !x.staff && this.open(x, p, th)).sort((a, b) => dist(p, a) - dist(p, b))[0]; if (!sl) { this.emit('full', p, th); return false; }
        this.stop(p); this.go(p, sl.fx, sl.fy, () => { p.face = sl.face; this.emit('shop', p, th); }); return true;
      }
      // an animal's bowl or trough (fill it), a nest box or a milk can (take what is in it)
      if ((k.act === 'feed' || k.act === 'collect') && k.states) {
        if (!p.you) return false;
        const full = th.state === k.states[1], sl = th.slots[0];
        if (k.act === 'feed') {
          if (full) { this.emit('fedok', p, th); return false; }
          if (k.takes && k.takes.indexOf(p.carry) < 0) { this.emit('need', p, th, k.takes[0]); return false; }
        } else if (!full) { this.emit('notyet', p, th); return false; }
        else if (p.carry) { this.emit('hands', p, th); return false; }
        this.stop(p);
        this.go(p, sl ? sl.fx : p.x, sl ? sl.fy : p.y, () => {
          if (sl) p.face = sl.face; else this.faceTo(p, { x: th.at[0], y: th.at[1] });
          this.act(p, 'reach', 1.2);
          if (k.act === 'feed') { if (k.takes) p.carry = null; this.fill(th, p); }
          else { th.state = k.states[0]; this.emit('state', th); p.carry = k.item || null; this.emit('collect', p, th, k.item); }
        });
        return true;
      }
      // put what you carry into it
      if (p.carry && k.takes && k.takes.indexOf(p.carry) >= 0) {
        this.stop(p); const s = this.beside(p, th);
        this.go(p, s.x, s.y, () => { this.faceTo(p, { x: th.at[0], y: th.at[1] }); const item = p.carry; p.carry = null; this.act(p, 'reach', 1); this.emit('put', p, th, item); });
        return true;
      }
      if (k.act === 'pickup') {
        if (p.carry) { this.emit('hands', p, th); return false; }
        this.stop(p); const s = this.beside(p, th);
        this.go(p, s.x, s.y, () => { if (th.gone || p.carry) return; this.faceTo(p, { x: th.at[0], y: th.at[1] }); th.gone = true; delete pl.things[th.id]; p.carry = k.item; this.act(p, 'reach', 0.5); this.emit('take', p, th); });
        return true;
      }
      if (k.act === 'kick') {
        this.stop(p); const s = this.beside(p, th);
        this.go(p, s.x, s.y, () => { this.faceTo(p, { x: th.at[0], y: th.at[1] }); p.needs.fun = Math.min(1, p.needs.fun + (k.gives ? k.gives.fun || 0 : 0)); this.act(p, 'reach', 0.5); this.emit('kick', p, th); });
        return true;
      }
      if (p.you && k.act === 'wardrobe') { this.stop(p); const s = th.slots[0]; this.go(p, s ? s.fx : p.x, s ? s.fy : p.y, () => { if (s) p.face = s.face; this.emit('wardrobe', p, th); }); return true; }
      if (p.you && k.act && k.act.indexOf('guide:') === 0) { this.stop(p); const s = th.slots[0]; this.go(p, s ? s.fx : p.x, s ? s.fy : p.y, () => { if (s) p.face = s.face; this.emit('guide', k.act.slice(6), th); }); return true; }
      // (the keeper goes behind the counter, not to a customer's place)
      const slot = th.slots.filter(s => this.open(s, p, th)).sort((a, b) => (b.staff - a.staff) || dist(p, a) - dist(p, b))[0];
      if (!slot) { this.emit('full', p, th); return false; }
      this.stop(p); slot.by = p.id; p.slot = slot; p.thing = th;
      const begin = () => {
        p.x = slot.x; p.y = slot.y; p.face = slot.face; p.state = 'use'; p.pose = slot.pose; p.t = 0; p.T = rnd(k.time ? k.time[0] : 2, k.time ? k.time[1] : 3) * (p.you ? 0.8 : 1); p.last = th.id;
        if (job) { p.pose = 'reach'; p.T = 2.2; }                                 // a chore is a quick job, not a nap
        else if (k.act === 'bed' || k.act === 'bath') { p.hidden = true; if (k.act === 'bath' && k.states) { th.state = k.states[1]; this.emit('state', th); } }
        this.emit('start', p, th);
      };
      this.emit('want', p, th);
      if (!this.go(p, slot.fx, slot.fy, begin) && p.state !== 'use') { if (Math.hypot(p.x - slot.fx, p.y - slot.fy) < 0.35) begin(); else { this.release(p); return false; } }
      return true;
    }
    // a short action on the spot (reach, wave...)
    act(p, pose, secs) { p.state = 'greet'; p.pose = pose; p.t = 0; p.T = secs; }
    finish(p) {
      const th = p.thing, slot = p.slot, k = th && th.k;
      if (k && k.act === 'toggle') { this.lamps[th.place + '/' + th.id] = !this.lamps[th.place + '/' + th.id]; this.emit('lamp', th, !this.lamps[th.place + '/' + th.id]); }
      if (k && k.source && p.you && !p.carry && !(this.rules && this.rules.jobAt(th)) && (!k.price || !this.rules || this.rules.pay(k.price))) { p.carry = k.source; this.emit(k.price ? 'bought' : 'got', p, th, k.source); }
      this.emit('end', p, th);
      this.release(p); p.state = 'idle'; p.pose = 'idle'; p.wait = rnd(1.5, 4); p.asleep = false;
    }
    // put down what you carry: a toy or a tool stays on the floor where you stand; food is eaten
    drop(p) {
      if (!p.carry) return null; const item = p.carry; p.carry = null;
      const kind = Object.keys(this.kinds).find(k => this.kinds[k].act === 'pickup' && this.kinds[k].item === item);
      if (kind) { const th = this.places[p.place].add({ id: 'd' + Math.floor(this.time * 10), kind: kind, at: [p.x, p.y] }); if (th) this.emit('thing', th); }
      else if (item === 'dates' || item === 'fruit' || item === 'bread') p.needs.food = Math.min(1, p.needs.food + 0.35);
      this.emit('drop', p, item); return item;
    }

    /* ---------- people together ---------- */
    spotBy(p, q) {
      const g = this.grid(q), pl = this.places[q.place];
      return [[0.75, 0], [0, 0.75], [-0.75, 0], [0, -0.75]].map(d => ({ x: q.x + d[0], y: q.y + d[1] }))
        .filter(s => s.x > 0.3 && s.y > 0.3 && s.x < pl.w - 0.2 && s.y < pl.d - 0.2 && g.ok(s.x, s.y)).sort((a, b) => dist(p, a) - dist(p, b))[0];
    }
    // walk up to someone, then do `what`: 'salam' | 'give' | 'hug' | 'play' (an animal is stroked instead)
    meet(p, q, what) {
      if (q.praying || q.hidden || q.away || p === q || p.place !== q.place) return false;
      if (q.animal) return this.pet(p, q);
      if (p.riding === 'bike') this.dismount(p);
      this.stop(p); const s = this.spotBy(p, q); if (!s) return false;
      this.go(p, s.x, s.y, () => {
        if (q.praying || q.hidden || q.place !== p.place) return this.stop(p);
        const seated = q.state === 'use' && (q.pose === 'sit' || q.pose === 'sitlow');
        if (!seated) { this.release(q); q.path = []; q.then = null; this.faceTo(q, p); this.act(q, 'salam', 2.6); }
        this.faceTo(p, q); this.act(p, what === 'hug' ? 'reach' : 'salam', 2.6);
        if (what === 'give' && p.carry) { const item = p.carry; p.carry = null; if (item === 'dates' || item === 'fruit' || item === 'bread' || item === 'veg') q.needs.food = Math.min(1, q.needs.food + 0.5); this.emit('gift', p, q, item); }
        else this.emit(what === 'give' ? 'salam' : what, p, q);
      });
      return true;
    }

    /* ---------- animals ---------- */
    after(secs, fn) { this.timers.push({ t: this.time + secs, fn: fn }); }
    // food has been put out: the animals it is for come to eat
    fill(th, p) {
      th.state = th.k.states[1]; this.emit('state', th);
      this.people.forEach(a => { if (a.animal && a.food === th.id && a.home === th.place) { a.called = true; a.wait = Math.min(a.wait, rnd(0.3, 2)); if (a.state === 'greet') { a.state = 'idle'; a.pose = 'idle'; } } });
      this.emit('feed', p, th);
    }
    // stroke an animal you can walk up to (one in a pen is only watched and fed)
    pet(p, q) {
      const s = this.spotBy(p, q); if (!s) { this.emit('far', p, q); return false; }
      if (dist(p, s) > 0.4 && !this.grid(p).path(p, s).length) { this.emit('far', p, q); return false; }
      if (p.riding === 'bike') this.dismount(p);
      this.stop(p); q.path = []; q.then = null; q.state = 'idle'; q.pose = 'idle'; q.wait = 6;
      this.go(p, s.x, s.y, () => {
        if (q.place !== p.place || dist(p, q) > 1.6) return this.stop(p);
        this.faceTo(q, p); this.act(q, 'sit', 3.2); this.faceTo(p, q); this.act(p, 'reach', 2.4);
        p.needs.fun = Math.min(1, p.needs.fun + 0.15); this.emit('pet', p, q);
      });
      return true;
    }
    wanderSpot(p) {
      const g = this.grid(p), z = p.zone;
      for (let i = 0; i < 14; i++) {
        const x = z ? rnd(z[0], z[2]) : p.x + rnd(-2.6, 2.6), y = z ? rnd(z[1], z[3]) : p.y + rnd(-2.6, 2.6), pl = this.places[p.place];
        if (x > 0.4 && y > 0.4 && x < pl.w - 0.3 && y < pl.d - 0.3 && g.ok(x, y) && this.people.every(o => o === p || o.place !== p.place || dist(o, { x: x, y: y }) > 0.6)) return { x: x, y: y };
      }
      return null;
    }
    animalDecide(p) {
      const A = ANIMAL[p.animal] || {}, night = this.clock < 330 || this.clock >= 1290, home = this.places[p.home], th = p.food && home && home.things[p.food];
      p.wait = rnd(2, 6);
      if (th && th.k.states && th.state === th.k.states[1] && (p.called || p.needs.food < 0.45)) {
        if (p.place !== p.home) return this.travel(p, p.home);
        const e = th.eat || { x: th.at[0], y: th.at[1] }, s = this.freeSpot(p.place, p, e, 0.8);            // beside the others at the trough, not on top of them
        // no room at the trough yet: wait a moment for a place beside the others
        if (this.people.some(o => o !== p && o.animal && o.place === p.place && dist(o, s) < 0.45)) { p.wait = rnd(1, 2); return; }
        this.go(p, s.x, s.y, () => {
          this.faceTo(p, { x: th.at[0], y: th.at[1] }); this.act(p, 'eat', rnd(4, 6)); p.needs.food = 1; p.called = false; this.emit('ate', p, th);
          if (!this.people.some(o => o.animal && o.called && o.food === th.id && o.home === th.place)) this.after(5, () => { th.state = th.k.states[0]; this.emit('state', th); });
        });
        return;
      }
      const crowd = this.people.find(o => o !== p && o.place === p.place && !o.away && !o.path.length && dist(o, p) < 0.55);
      if (crowd) { const s = this.wanderSpot(p); if (s && this.go(p, s.x, s.y)) return; }
      const rest = secs => {
        const bed = p.bedAt && home && home.things[p.bedAt], lie = () => this.act(p, A.sleep && (night || bed) ? 'sleep' : 'sit', secs);
        if (bed && (night || Math.random() < 0.5)) { if (p.place !== p.home) return this.travel(p, p.home); if (dist(p, { x: bed.at[0], y: bed.at[1] }) > 0.3) { this.go(p, bed.at[0], bed.at[1], lie); return; } }
        lie();
      };
      if (night || p.needs.rest < 0.3) { p.needs.rest = 1; return rest(night ? 30 : rnd(12, 20)); }
      const r = Math.random();
      if (p.roam && r < 0.07) { const o = pick(p.roam.filter(x => x !== p.place && this.places[x])); if (o && this.travel(p, o)) return; }
      if (r < 0.6) { const s = this.wanderSpot(p); if (s) this.go(p, s.x, s.y); return; }
      if (r < 0.85) return rest(rnd(5, 12));
      this.act(p, A.peck ? 'eat' : 'idle', rnd(2, 4));
    }

    /* ---------- prayer: the call, walking to a place in the row, the positions together ---------- */
    prayPlace(p) { if (p.away || p.toddler) return null; const pid = p.prayAt; return pid && this.places[pid] && (this.places[pid].pray.length) ? pid : null; }
    takeSpot(p, pid) {
      const pl = this.places[pid], women = !p.male && pl.prayW.length ? pl.prayW : null, list = women || pl.pray;
      const lead = !women && (p.id === 'imam' || !this.people.some(o => o.id === 'imam' && o.prayAt === pid));
      const s = list.find((x, i) => !x.by && (lead || i > 0 || list.length === 1)) || list.find(x => !x.by); if (s) s.by = p.id; return s;
    }
    callPrayer(name) {
      if (this.calling) return false;
      this.calling = { name: name || 'practice', t: 0 }; this.prayers = {};
      this.people.forEach(p => { if (!p.you) { const pid = this.prayPlace(p); if (pid) this.sendToPray(p, pid); } });
      this.emit('adhan', this.calling.name); return true;
    }
    sendToPray(p, pid) {
      const s = this.takeSpot(p, pid); if (!s) return false;
      const pr = this.prayers[pid] = this.prayers[pid] || { place: pid, stage: 'gather', t: 0, i: 0, who: [] };
      if (pr.stage === 'done') { s.by = null; return false; }
      this.stop(p); pr.who.push(p); p.praying = pid; p.spot = s; p.state = 'topray';
      const there = () => { if (p.praying !== pid) return; p.x = s.x; p.y = s.y; p.face = '-y'; p.state = 'pray'; p.pose = pr.stage === 'pray' ? pr.steps[pr.i][0] : pr.stage === 'khutbah' ? 'psit' : 'pstand'; };
      this.travel(p, pid, s.x, s.y, there); if (p.state !== 'pray') p.state = 'topray';
      return true;
    }
    // the child joins the prayer of the place they are in
    joinPrayer(p) { const pr = this.prayers[p.place]; if (!pr || pr.stage === 'done' || p.praying) return false; return this.sendToPray(p, p.place); }
    endPraying(p) { if (p.spot) { p.spot.by = null; p.spot = null; } p.praying = null; p.path = []; p.then = null; p.state = 'idle'; p.pose = 'idle'; p.wait = rnd(1, 4); }
    beginPrayer(pr, rakah) { pr.stage = 'pray'; pr.t = 0; pr.i = 0; pr.rakah = rakah; pr.steps = prayerSteps(rakah); this.emit('prayStart', pr.place); pr.who.forEach(p => { if (p.state === 'pray') { p.pose = pr.steps[0][0]; p.face = '-y'; } }); }
    stepPrayer(dt) {
      const c = this.calling; if (!c) return; c.t += dt; let live = 0;
      for (const pid in this.prayers) {
        const pr = this.prayers[pid]; if (pr.stage === 'done') continue; live++; pr.t += dt;
        if (pr.stage === 'gather') {
          const ready = pr.who.filter(p => !p.you).every(p => p.state === 'pray');
          // (game.js sets calling.hold so the prayer starts only after the adhan has been heard)
          if ((ready && pr.t > 4 && !c.hold) || pr.t > (c.hold ? 150 : 80)) {
            const imam = c.name === 'dhuhr' && this.weekday === 5 && pr.who.find(p => p.id === 'imam' && p.state === 'pray');
            if (imam) { pr.stage = 'khutbah'; pr.t = 0; pr.who.forEach(p => { if (p.state === 'pray') p.pose = 'psit'; }); imam.pose = 'idle'; imam.face = '+y'; this.emit('khutbah', pid); }   // Friday: the imam speaks first (TEACHER REVIEW)
            else this.beginPrayer(pr, RAKAH[c.name] || 2);
          }
        } else if (pr.stage === 'khutbah') {
          if (pr.t > 14) this.beginPrayer(pr, 2);
        } else if (pr.t >= pr.steps[pr.i][1]) {
          pr.t = 0; pr.i++;
          if (pr.i >= pr.steps.length) { pr.stage = 'done'; const who = pr.who.filter(p => p.state === 'pray'); pr.who.forEach(p => this.endPraying(p)); this.emit('prayEnd', pid, who); }
          else pr.who.forEach(p => { if (p.state === 'pray') p.pose = pr.steps[pr.i][0]; });
        }
      }
      if (!live && c.t > 5) { this.calling = null; this.emit('prayOver', c.name); }
    }

    /* ---------- one step of the world ---------- */
    step(dt) {
      this.time += dt;
      const was = this.clock; this.clock += dt * this.rate;
      if (this.clock >= 1440) { this.clock -= 1440; this.dayNo++; this.weekday = (this.weekday + 1) % 7; this.emit('day', this.dayNo); }
      if (this.prayTimes && !this.calling) for (const n in this.prayTimes) { const t = this.prayTimes[n]; if (was < t && this.clock >= t) { this.callPrayer(n); break; } }
      for (const p of this.people) {
        if (p.away) {
          if (p.you || p.coming || p.fromDay > (this.playDay || 0)) continue;
          if (p.due) { p.dueT -= dt; if (p.dueT <= 0) this.land(p); continue; }
          p.wait -= dt; if (p.wait <= 0) { p.wait = 5; const b = this.block(p); if (b && b.type !== 'away') this.arrive(p); }
          continue;
        }
        if (p.state === 'wait' && !p.path.length) {                               // waiting for the bus (and stepping aside if someone stands on the same spot)
          if (!p.you) {
            if (this.people.some(o => o !== p && !o.animal && o.place === p.place && !o.away && !o.path.length && dist(o, p) < 0.4)) { const s = this.freeSpot(p.place, p, p, 1.0); p.path = this.grid(p).path(p, s); }
            p.wait -= dt; if (p.wait <= 0) this.gone(p);
          }
          continue;
        }
        for (const n of NEEDS) p.needs[n] = Math.max(0.05, p.needs[n] - p.rate[n] * dt);
        if (p.path.length) {
          let left = p.speed * dt;
          while (left > 0 && p.path.length) {
            const q = p.path[0], d = dist(p, q);
            if (d > 1e-4) this.faceTo(p, q);
            if (d <= left) { p.x = q.x; p.y = q.y; p.path.shift(); left -= d; } else { p.x += (q.x - p.x) / d * left; p.y += (q.y - p.y) / d * left; left = 0; }
          }
          if (!p.path.length) { const f = p.then; p.then = null; if (p.state === 'walk') { p.state = 'idle'; p.pose = 'idle'; } if (f) f(); }
          continue;
        }
        if (p.state === 'use') {
          p.t += dt; const th = p.thing, g = th && th.k.gives;
          if (g) for (const n in g) p.needs[n] = Math.min(1, p.needs[n] + g[n] * dt / p.T);
          if (p.asleep) { if (p.t > 4 && this.block(p).type !== 'sleep') this.finish(p); }
          else if (p.t >= p.T) this.finish(p);
        } else if (p.state === 'greet') { p.t += dt; if (p.animal && p.pose !== 'eat' && this.people.some(o => !o.animal && o.place === p.place && !o.away && dist(o, p) < 0.4)) { p.t = p.T; p.wait = 0; }   // a resting animal gets out from under your feet
          if (p.t >= p.T) { p.state = 'idle'; p.pose = 'idle'; p.wait = rnd(1, 2.5); } }
        else if (p.state === 'idle' && !p.you && !p.praying) {
          // personal space (an animal steps aside for anyone; a person only for another person)
          const near = this.people.find(o => o !== p && (p.animal || !o.animal) && o.place === p.place && !o.away && !o.hidden && !o.path.length && dist(o, p) < 0.5);
          if (near) { const s = p.animal ? this.wanderSpot(p) : this.freeSpot(p.place, p, near, 1.1); if (s && (this.go(p, s.x, s.y) || !p.animal)) continue; }
          p.wait -= dt; if (p.wait <= 0) this.decide(p);
        }
      }
      if (this.timers.length) this.timers = this.timers.filter(x => { if (this.time < x.t) return true; x.fn(); return false; });
      this.stepPrayer(dt); this.stepRoad(dt);
      if (this.rules && this.rules.step) this.rules.step(dt);
    }

    /* ---------- what a person does next ---------- */
    decide(p) {
      if (p.animal) return this.animalDecide(p);
      const b = this.block(p); p.wait = rnd(1, 3);
      if (!b) return this.choose(p);
      if (b.type === 'away') return this.leave(p);
      if (b.type === 'sleep' || b.type === 'work') {
        if (p.place !== b.place) return this.travel(p, b.place);
        if (this.places[b.place].things[b.thing] && this.use(p, b.thing)) { if (b.type === 'sleep') p.asleep = true; return; }
        if (b.type === 'sleep') { p.wait = 4; return; }
        return this.choose(p);
      }
      if (b.type === 'meal') {
        const pid = p.mealAt || 'kitchen', pl = this.places[pid]; if (!pl) return this.choose(p);
        if (p.place !== pid) return this.travel(p, pid);
        const t = Object.keys(pl.things).find(id => pl.things[id].k.meal && pl.things[id].slots.some(s => this.open(s, p, pl.things[id])));
        if (t && p.needs.food < 0.93 && this.use(p, t)) return;
        return this.choose(p);
      }
      let list = b.places || p.roam;
      if (b.type === 'with') { const q = this.by[b.who]; if (q && !q.away && q.place) list = [q.place]; }
      if (list && list.length) {
        if (list.indexOf(p.place) < 0) return this.travel(p, pick(list));
        if (list.length > 1 && Math.random() < 0.12) { const o = pick(list.filter(x => x !== p.place)); if (this.places[o]) return this.travel(p, o); }
      }
      this.choose(p);
    }
    // free time: the best few offers of this place, one picked by chance (so days differ); or a word with someone
    choose(p) {
      const pl = this.places[p.place], offers = [], others = this.here(p.place);
      for (const id in pl.things) {
        const th = pl.things[id], k = th.k; if (!k.gives || !th.slots.length || k.act === 'kick' || k.act === 'bed' || k.act === 'bath' || !this.allowed(p, k)) continue;
        const slot = th.slots.find(s => this.open(s, p, th)); if (!slot) continue;
        let s = 0; for (const n in k.gives) s += k.gives[n] * (1 - p.needs[n]);
        s += Math.random() * 0.25 - dist(p, slot) * 0.03 - (p.last === id ? 0.35 : 0) + (!p.kid && this.rules && this.rules.jobAt(th) ? 0.5 : 0) - (others.some(o => o !== p && o.thing && o.thing.kind === th.kind && !k.meal) ? 0.2 : 0);
        offers.push({ s: s, id: id });
      }
      offers.push({ s: 0.12 + Math.random() * 0.2, id: null });                    // or just a little walk
      const q = others.find(o => o !== p && !o.you && !o.animal && o.state === 'idle' && !o.path.length && !o.toddler && this.time - o.hi > 60 && this.time - p.hi > 60);
      if (q) offers.push({ s: 0.3 + Math.random() * 0.25, who: q });
      offers.sort((a, b) => b.s - a.s);
      const o = offers[Math.floor(Math.random() * Math.min(3, offers.length))];
      if (o.who) { p.hi = o.who.hi = this.time; if (this.meet(p, o.who, 'salam')) return; }
      if (o.id && this.use(p, o.id)) return;
      const s = this.freeSpot(p.place, p); this.go(p, s.x, s.y); p.wait = rnd(2, 5);
    }
  }

  const api = { World: World, Person: Person, Place: Place, Grid: Grid, RAKAH: RAKAH, prayerSteps: prayerSteps, NEEDS: NEEDS, CELL: CELL, rotPt: rotPt, rotFace: rotFace };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LifeWorld = api;
})(typeof window !== 'undefined' ? window : globalThis);
