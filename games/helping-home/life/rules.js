/* Helping Home (life): rules.js
   What the child's care changes, and why they come back tomorrow. No drawing here; it listens to world.js.

   - Friendship: every person has a flower that grows with kind things done with them. It never shrinks.
   - The Akhlaq album: a page per quality (kind, give, help, clean, patient, thanks) that fills with small pictures of
     what the child really did. It records character. Worship is never recorded and never scored.
   - The garden: a bed is planted, then watered on different days, then harvested. It grows only with care and
     never wilts.
   - Chores: small jobs turn up around the home through the day (toys on the floor, dishes after a meal, washing,
     thirsty plants, the bed, shoes). The child may do them; if not, a grown-up does. Nothing piles up.
   - Wishes: now and then someone wishes for something (a plate of fruit, a greeting). Optional; they fade quietly.
   - Each day: three picture cards to try, and a parcel at the door.
   - Money: coins. A little pocket money each morning; more is earned by real work in the town (helping the baker,
     delivering a parcel, selling what the garden grew). Coins buy food, seeds, toys and things for the child's room
     at the shop, and can be given as sadaqah. Helping at home is never paid: it is love, and goes in the album.
   - Skills: reading, writing, counting, building, gardening, cooking, sport. Each grows by doing (a lesson at school
     grows the first three fastest) and a higher level opens something: a better gardener's beds grow a day sooner,
     a cook may use the kitchen alone, a sporty child walks faster.

   state is plain data (saved by game.js): see fresh(). */
(function (root) {
  'use strict';
  const FLOWER = [3, 8, 15, 25, 40], LEVEL = [2, 6, 12, 20, 30], SKILLS = ['read', 'write', 'count', 'build', 'garden', 'cook', 'sport'];
  const SKILL_ICON = { read: 'book', write: 'pencil', count: 'abacus', build: 'blocks', garden: 'sprout', cook: 'pot', sport: 'ball' };
  const CARDS = [{ k: 'water', icon: 'sprout', need: 1 }, { k: 'salam', icon: 'salam', need: 3 }, { k: 'help', icon: 'shirt', need: 1 }, { k: 'tidy', icon: 'toy', need: 2 },
    { k: 'share', icon: 'dates', need: 1 }, { k: 'animals', icon: 'seeds', need: 1 }, { k: 'visit', icon: 'house', need: 2 }];
  const FOOD = ['dates', 'fruit', 'bread', 'veg'];
  const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
  function fresh() { return { v: 1, days: 0, stamp: -1, friends: {}, album: {}, owned: [], garden: {}, done: {}, daily: null, seen: {}, coins: 10, skills: {}, pets: { fed: {}, gave: {}, ready: {} } }; }
  function level(xp) { let l = 0; while (l < LEVEL.length && xp >= LEVEL[l]) l++; return l; }
  function stage(n) { let s = 0; while (s < FLOWER.length && n >= FLOWER[s]) s++; return s; }

  class Rules {
    constructor(world, state, opts) {
      this.w = world; this.s = Object.assign(fresh(), state || {}); this.o = opts || {}; world.rules = this;
      this.s.pets = Object.assign({ fed: {}, gave: {}, ready: {} }, this.s.pets || {});
      this.jobs = []; this.wishes = []; this.tWish = rnd(25, 45); this.tToy = rnd(40, 70); this.cool = {}; this.nToy = 0; this.meal = -1;
      this.rewards = (world.data.rewards || []).slice();
      // a garden bed that was already growing when the family moved in keeps growing from there
      for (const pid in world.places) for (const id in world.places[pid].things) { const th = world.places[pid].things[id], key = pid + '/' + id; if (th.k.act === 'grow' && !this.s.garden[key]) this.s.garden[key] = { s: th.state || 'empty', n: th.state === 'sprout' ? 1 : 0, w: -1 }; }
      this.newDay(world.dayNo, true);
    }
    start() { this.perks(); }                                                      // call once the child is in the world
    save() { if (this.o.save) this.o.save(this.s); }
    tell(n, a, b, c) { if (this.w.on[n]) this.w.on[n](a, b, c); }
    once(key) { if (this.s.done[key] === this.w.dayNo) return false; this.s.done[key] = this.w.dayNo; return true; }   // true the first time today

    /* ---------- friendship, the album, new things ---------- */
    friend(id, n) {
      const f = this.s.friends, was = stage(f[id] || 0); f[id] = (f[id] || 0) + n; const now = stage(f[id]);
      this.tell('friend', id, f[id]);
      if (now > was) { this.tell('flower', id, now); this.unlock(); }
      this.save();
    }
    flower(id) { return stage(this.s.friends[id] || 0); }
    sticker(q, icon) {
      const a = this.s.album[q] = this.s.album[q] || [];
      if (a.length >= 24 || a.some(x => x.i === icon && x.d === this.w.dayNo)) return;
      a.push({ i: icon, d: this.w.dayNo }); this.tell('sticker', q, icon); this.save();
    }
    unlock() { const id = this.rewards.find(r => this.s.owned.indexOf(r) < 0); if (!id) return null; this.s.owned.push(id); this.tell('unlock', id); this.save(); return id; }
    card(k) {
      const d = this.s.daily; if (!d) return; const c = d.cards.find(x => x.k === k && x.n < x.need); if (!c) return;
      c.n++; this.tell('card', c);
      if (d.cards.every(x => x.n >= x.need) && !d.all) { d.all = true; this.tell('cardsDone'); this.unlock(); }
      this.save();
    }

    /* ---------- coins ---------- */
    earn(n, icon) { this.s.coins += n; this.tell('coins', this.s.coins, n, icon); this.save(); }
    pay(n) { if (this.s.coins < n) return false; this.s.coins -= n; this.tell('coins', this.s.coins, -n); this.save(); return true; }
    // buy something for the room from the shop's book (game.js opens it at the till)
    buy(id) { const d = (this.w.data.decor || {})[id]; if (!d || d.price == null || this.s.owned.indexOf(id) >= 0 || !this.pay(d.price)) return false; this.s.owned.push(id); this.tell('unlock', id); this.save(); return true; }
    forSale() { const d = this.w.data.decor || {}; return Object.keys(d).filter(id => d[id].price != null && this.s.owned.indexOf(id) < 0); }

    /* ---------- skills ---------- */
    skill(name) { return level(this.s.skills[name] || 0); }
    learn(name, n) {
      const sk = this.s.skills, was = level(sk[name] || 0); sk[name] = (sk[name] || 0) + n; const now = level(sk[name]);
      this.tell('skill', name, now, now > was); if (now > was) this.perks();
      this.save();
    }
    perks() { const you = this.w.you; if (you) { you.speed = (you.riding === 'bike' ? 1.9 : 1) * 1.5 * (1 + 0.05 * this.skill('sport')); you.speed0 = 1.5 * (1 + 0.05 * this.skill('sport')); you.cook = this.skill('cook') >= 1; } }
    // is the teacher at the desk? is the shop staffed?
    staffed(pid) { return this.w.staffed(pid); }

    /* ---------- a new day ---------- */
    newDay(day, first) {
      const s = this.s, w = this.w; let fresh = false;
      if (s.stamp !== day) {
        fresh = true;
        s.stamp = day; s.days++; w.playDay = s.days;
        const pool = CARDS.slice(), cards = []; while (cards.length < 3) cards.push(Object.assign({ n: 0 }, pool.splice(Math.floor(Math.random() * pool.length), 1)[0]));
        s.daily = { d: day, cards: cards, gift: false, all: false };
        for (const k in s.done) if (s.done[k] < day - 1) delete s.done[k];
      }
      w.playDay = s.days;
      // the garden: a bed that has been watered on two days is fully grown the next morning
      for (const key in s.garden) { const g = s.garden[key]; if (g.s === 'sprout' && g.n >= 2 && g.w < day) { g.s = 'grown'; this.tell('grown', key); } }
      this.syncGarden();
      // today's chores
      this.jobs = []; this.lessons = 0;
      if (fresh && s.days > 1) this.earn(5, 'coin');                                 // pocket money each morning
      const home = (pid, kind) => { const pl = w.places[pid]; return pl ? Object.keys(pl.things).filter(id => pl.things[id].kind === kind).map(id => pl.things[id]) : []; };
      const plants = []; for (const pid in w.places) if (!w.places[pid].outdoor) home(pid, 'plant').forEach(t => plants.push(t));
      plants.sort(() => Math.random() - 0.5).slice(0, 2).forEach(t => this.job(t, 'can', 'help'));
      home('myroom', 'bed').forEach(t => this.job(t, 'bed', 'clean'));
      home('hall', 'shoerack').forEach(t => this.job(t, 'shoes', 'clean'));
      home('bathroom', 'washer').forEach(t => this.job(t, 'shirt', 'help', 'washer'));
      // animals at home: the bowl and the feeder want filling each day; hens that were fed lay eggs for the next morning,
      // and a cow that was fed gives milk (a `collect` thing names its animal in `from`)
      const P = s.pets;
      for (const pid in w.places) for (const id in w.places[pid].things) {
        const th = w.places[pid].things[id], k = th.k, key = pid + '/' + id;
        if (k.act === 'feed' && k.states && !w.places[pid].outdoor || (k.act === 'feed' && pid === 'yard')) this.job(th, k.icon || 'seeds', 'kind', 'feed');
        if (k.act !== 'collect' || !k.states) continue;
        const a = w.people.find(x => x.animal === k.from && x.home === pid && x.food), f = a && P.fed[pid + '/' + a.food];
        if (f != null && f < day && P.gave[key] !== f) { P.gave[key] = f; P.ready[key] = true; }
        const st = k.states[P.ready[key] ? 1 : 0]; if (th.state !== st) { th.state = st; this.tell('state', th); }
      }
      // paid work in the town: help the baker, deliver a parcel for the shopkeeper
      home('shop', 'bakery').forEach(t => { const j = this.job(t, 'bread', 'help', 'bake'); if (j) j.coins = 4; });
      home('shop', 'till').forEach(t => { const j = this.job(t, 'parcel', 'help', 'deliver'); if (j) j.deliver = true; });
      if (!first) this.tell('day', day);
      this.save();
    }
    syncGarden() {
      for (const key in this.s.garden) { const [pid, id] = key.split('/'), pl = this.w.places[pid], th = pl && pl.things[id]; if (th && th.state !== this.s.garden[key].s) { th.state = this.s.garden[key].s; this.tell('state', th); } }
    }

    /* ---------- chores ---------- */
    job(th, icon, q, key) {
      const k = (key || icon) + ':' + th.place + '/' + th.id;
      if (this.s.done[k] === this.w.dayNo || this.jobs.some(j => j.k === k)) return null;
      const j = { k: k, key: key || icon, place: th.place, thing: th.id, icon: icon, q: q, t: this.w.time }; this.jobs.push(j); this.tell('job', j); return j;
    }
    // (paid work needs the grown-up whose work it is to be there; a delivery needs free hands)
    jobAt(th) { const j = this.jobs.find(x => x.place === th.place && x.thing === th.id) || null; return j && (j.coins || j.deliver) && (!this.staffed(th.place) || (j.deliver && this.w.you && this.w.you.carry)) ? null : j; }
    jobDone(j, p) {
      this.jobs.splice(this.jobs.indexOf(j), 1); this.s.done[j.k] = this.w.dayNo; this.tell('jobDone', j, p);
      if (j.key === 'washer') { const y = this.w.places.yard, id = y && Object.keys(y.things).find(i => y.things[i].kind === 'clothesline'); if (id) this.job(y.things[id], 'shirt', 'help', 'line'); }
      if (p && p.you && j.coins) this.earn(j.coins, j.icon);
      if (p && p.you && j.deliver) {                                               // carry the parcel to someone in the town
        const who = this.w.people.filter(q => !q.you && !q.animal && !q.family && !q.away && !q.toddler && !(q.slot && q.slot.staff));
        if (who.length) { p.carry = 'parcel'; this.tell('got', p, null, 'parcel'); const x = { type: 'bring', item: 'parcel', icon: 'parcel', who: pick(who).id, coins: 5, keep: true, t: this.w.time }; x.id = x.who + ':parcel'; this.wishes.push(x); this.tell('wish', x); }
      }
      if (p && p.you) { this.sticker(j.q, j.icon); this.card('help'); if (j.icon === 'can') this.card('water'); ['mum', 'dad'].forEach(id => { const q = this.w.by[id]; if (q && q.place === p.place && !q.away) this.friend(id, 1); }); }
      this.save();
    }

    /* ---------- what the world tells us ---------- */
    salam(p, q) {
      if (!p.you) return;
      const now = this.w.time; if (this.cool[q.id] && now - this.cool[q.id] < 90) return; this.cool[q.id] = now;
      this.friend(q.id, 1); this.sticker('kind', 'salam'); this.card('salam'); this.wishMet(q, 'salam');
    }
    hug(p, q) { if (p.you) { this.friend(q.id, 1); this.sticker('kind', 'heart'); } }
    play(p, q) { if (p.you) this.friend(q.id, 1); }
    gift(p, q, item) {
      if (!p.you) return;
      this.friend(q.id, 2); this.sticker('give', item); if (FOOD.indexOf(item) >= 0) this.card('share'); this.wishMet(q, 'bring', item);
    }
    put(p, th, item) {
      if (!p.you) return;
      if (item === 'toy') { this.nToy = Math.max(0, this.nToy - 1); this.sticker('clean', 'toy'); this.card('tidy'); }
      else if (item === 'litter') { this.sticker('clean', 'bin'); this.card('tidy'); }
      else if (item === 'seeds' || item === 'bread') { this.sticker('kind', 'seeds'); this.card('animals'); this.tell('fed', th); }
      else if (item === 'veg' && th.kind === 'stall') { this.earn(5, 'veg'); this.learn('garden', 1); }       // sell what the garden grew
      else if (item === 'veg') { this.sticker('help', 'pot'); this.friend('mum', 1); this.learn('cook', 1); }
      else if ((item === 'eggs' || item === 'milk') && th.kind === 'stall') this.earn(3, item === 'eggs' ? 'egg' : 'milk');   // or sell the eggs and the milk
      else if (item === 'eggs' || item === 'milk') { this.sticker('help', item === 'eggs' ? 'egg' : 'milk'); this.friend('mum', 1); this.learn('cook', 1); }
    }
    /* ---------- animals: kindness to them is part of good character ---------- */
    met(kind) { const a = this.s.album.animals = this.s.album.animals || []; if (!a.some(x => x.i === kind)) { a.push({ i: kind, d: this.w.dayNo }); this.tell('sticker', 'animals', kind); this.save(); } }   // one of each in the album
    feed(p, th) {
      if (!p || !p.you) return;
      this.s.pets.fed[th.place + '/' + th.id] = this.w.dayNo;
      const j = this.jobs.find(x => x.place === th.place && x.thing === th.id); if (j) this.jobDone(j, p);
      this.w.people.forEach(a => { if (a.animal && a.food === th.id && a.home === th.place) { this.met(a.animal); if (!a.zone) this.friend(a.id, 1); } });
      this.sticker('kind', 'paw'); this.card('animals'); this.learn('garden', 1); this.save();
    }
    pet(p, q) {
      if (!p.you) return;
      const now = this.w.time; if (this.cool[q.id] && now - this.cool[q.id] < 60) return; this.cool[q.id] = now;
      this.met(q.animal); this.friend(q.id, 1); this.sticker('kind', 'paw'); this.card('animals');
    }
    collect(p, th, item) { if (!p.you) return; delete this.s.pets.ready[th.place + '/' + th.id]; this.sticker('help', th.k.icon || 'egg'); this.save(); }
    cross(p, from, to) { if (p.you && this.once('visit:' + to) && this.w.places[to].outdoor !== this.w.places[from].outdoor) this.card('visit'); }
    end(p, th) {
      if (!th) return; const k = th.k, j = this.jobAt(th);
      if (j && (p.you || (!p.kid && !j.coins && !j.deliver))) { this.jobDone(j, p); if (p.you) return; }
      if (k.meal && this.w.clock - this.meal > 120) { this.meal = this.w.clock; const pl = this.w.places[th.place], id = Object.keys(pl.things).find(i => pl.things[i].kind === 'sink'); if (id) this.job(pl.things[id], 'drop', 'clean', 'dishes'); }
      if (!p.you) return;
      if (k.skill) this.learn(k.skill, 1);
      if (k.lesson && this.staffed(th.place)) {                                    // a lesson with the teacher
        this.lessons++; this.learn(['read', 'count', 'write'][(this.s.days + this.lessons) % 3], 2); this.sticker('learn', 'school'); this.wishMet(this.w.by.teacher || { id: 'teacher' }, 'go');
        const pl = this.w.places.myroom, id = pl && Object.keys(pl.things).find(i => pl.things[i].kind === 'desk'); if (id) this.job(pl.things[id], 'pencil', 'learn', 'homework');
      }
      if (k.act === 'grow') this.tend(th, p);
      else if (k.act === 'sadaqah') { if (this.pay(1)) { this.sticker('give', 'coin'); this.tell('gave', th); } else this.tell('poor', th); }
      else if (k.act === 'water') { if (this.once('bowl:' + th.id)) { this.sticker('kind', 'drop'); this.card('animals'); this.tell('fed', th); } }
      // doing something beside someone is a little time together
      const mate = this.w.here(p.place).find(q => q !== p && q.thing === th);
      if (mate && this.once('with:' + mate.id + th.kind)) { this.friend(mate.id, 1); if (k.who === 'adults') { this.sticker('help', k.icon || 'heart'); this.card('help'); } }
    }
    // the garden bed: plant it, water it (once a day counts), pick what has grown
    tend(th, p) {
      const key = th.place + '/' + th.id, g = this.s.garden[key] = this.s.garden[key] || { s: 'empty', n: 0, w: -1 }, day = this.w.dayNo;
      if (g.s === 'empty') { g.s = 'sprout'; g.n = 0; g.w = -1; this.tell('grow', th, 'plant'); }
      else if (g.s === 'sprout') { if (g.w !== day) { g.w = day; g.n += this.skill('garden') >= 2 ? 2 : 1; this.sticker('help', 'sprout'); this.card('water'); this.learn('garden', 1); } this.tell('grow', th, 'water'); }
      else if (g.s === 'grown' && !p.carry) { g.s = 'empty'; g.n = 0; p.carry = 'veg'; this.sticker('patient', 'sprout'); this.tell('grow', th, 'pick'); if (!this.s.seen.harvest) { this.s.seen.harvest = 1; this.unlock(); } }
      this.syncGarden(); this.save();
    }
    // the parcel at the door, once a day
    openGift() { const d = this.s.daily; if (!d || d.gift) return null; d.gift = true; const id = this.unlock(); this.save(); return id || 'star'; }

    /* ---------- wishes ---------- */
    wishMet(q, type, item) {
      const i = this.wishes.findIndex(x => x.who === q.id && x.type === type && (!x.item || x.item === item)); if (i < 0) return;
      const x = this.wishes.splice(i, 1)[0]; this.friend(q.id, 2); this.sticker('help', x.icon); if (x.coins) this.earn(x.coins, x.icon); this.tell('wishDone', x);
    }
    makeWish() {
      const w = this.w, you = w.you; if (!you || this.wishes.length >= 2) return;
      // school is open and there has been no lesson yet today: the teacher hopes you will come
      const t = w.by.teacher, tb = t && w.block(t);
      if (tb && tb.type === 'work' && !this.lessons && w.places[tb.place] && !this.wishes.some(x => x.type === 'go')) { const x = { type: 'go', place: tb.place, icon: 'school', who: 'teacher', t: w.time, id: 'teacher:go' }; this.wishes.push(x); this.tell('wish', x); return; }
      const near = w.people.filter(p => !p.you && !p.animal && !p.away && !p.hidden && !p.praying && !p.toddler && (p.place === you.place || p.family) && !this.wishes.some(x => x.who === p.id));
      if (!near.length) return; const q = pick(near), items = [];
      for (const pid in w.places) for (const id in w.places[pid].things) { const src = w.places[pid].things[id].k.source; if (src && items.indexOf(src) < 0) items.push(src); }
      const x = !q.family && Math.random() < 0.5 || !items.length ? { type: 'salam', icon: 'salam' } : { type: 'bring', item: pick(items) };
      if (x.item) x.icon = x.item; x.who = q.id; x.t = w.time; x.id = x.who + ':' + x.type;
      this.wishes.push(x); this.tell('wish', x);
    }

    step(dt) {
      const w = this.w;
      if (w.dayNo !== this.s.stamp) this.newDay(w.dayNo);
      this.tWish -= dt; if (this.tWish <= 0) { this.tWish = rnd(50, 90); if (!w.calling) this.makeWish(); }
      for (let i = this.wishes.length - 1; i >= 0; i--) if (w.time - this.wishes[i].t > 240 && !this.wishes[i].keep) this.tell('wishGone', this.wishes.splice(i, 1)[0]);
      // a toy left on the floor now and then (the toddler's doing), for whoever tidies it
      this.tToy -= dt;
      if (this.tToy <= 0) {
        this.tToy = rnd(80, 140);
        const rooms = Object.keys(w.places).filter(pid => Object.keys(w.places[pid].things).some(id => w.places[pid].things[id].kind === 'toybox'));
        if (rooms.length && this.nToy < 3 && w.kinds.toy) {
          const pid = pick(rooms), s = w.freeSpot(pid, null), th = w.places[pid].add({ id: 'toy' + Math.floor(w.time * 10), kind: 'toy', at: [s.x, s.y] });
          if (th) { this.nToy++; this.tell('thing', th); }
        }
      }
    }
  }

  const api = { Rules: Rules, fresh: fresh, stage: stage, level: level, FLOWER: FLOWER, LEVEL: LEVEL, SKILLS: SKILLS, SKILL_ICON: SKILL_ICON };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LifeRules = api;
})(typeof window !== 'undefined' ? window : globalThis);
