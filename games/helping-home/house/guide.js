/* Helping Home: the guide (window.HHGuide). What to do next, a hand that shows how, and a felt reward for every job.
   Mounted by the house with HHGuide.mount(window.HOUSE) (see main.js); without HOUSE it does nothing.

   1. The Today strip: 3-6 big picture cards for this part of the day (one strip per prayer window: morning, Dhuhr,
      Asr...). The prayer comes first at its time, then the family's requests, today's plan (HHDays.dailyPlan) and the
      live jobs. The next card pulses (CSS). A tap focuses the camera on the job and a ghost of the child's own hand
      shows how (drag from-to, tap, or scrub), twice; after ~8 s with no progress it shows it once more, gently.
   2. A reward on every finish: sparkles, the card flips to a tick, Arabic praise, a star flies to the counter, the
      "cosy home" windows light up (cards done today), a gift box every 5 stars (a sticker or a My Room decoration),
      and a calm celebration when the strip is done (lanterns over the house, the family waves, a leaf on the branch).
   3. First visit: tap a card (everything else dimmed) -> the hand shows -> the child does it -> the first big reward.
   Overlays are DOM above the house, placed with HOUSE.toScreen; animations are transforms and opacity only (WAAPI and
   CSS), no frame loop, nothing redraws the house. Saved in localStorage 'hh.guide'.
   Sounds: natural only (pops, whooshes, paper, grains), no music. */
(function () {
  'use strict';
  const INK = '#231e16', KEY = 'hh.guide';
  const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const safe = (fn, d) => { try { const r = fn(); return r == null ? d : r; } catch (e) { return d; } };
  const NOW = () => (window.HL && HL.now) ? HL.now() : new Date();
  const dk = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  const RM = () => !!(window.Kit && Kit.reducedMotion);
  const icon = (n, o) => window.HHBook && HHBook.icon ? HHBook.icon(n, o) :
    '<svg viewBox="0 0 24 24"><path d="M12 2.8l2.7 5.9 6.4.7-4.8 4.4 1.3 6.4L12 17l-5.6 3.2 1.3-6.4L2.9 9.4l6.4-.7z" fill="#f4b829" stroke="#231e16" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  const sfx = n => { try { window.Kit && Kit.sfx && Kit.sfx.play(n); } catch (e) {} };
  const say = () => {};   // no device voice: pictures and sounds only
  let praiseN = 0;
  const praise = () => { try { window.Kit && Kit.say && Kit.say.praise(['mashaallah', 'ahsant', 'barakallah'][praiseN++ % 3]); } catch (e) {} };
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  /* ---------- short labels (one or two words) and the voice line for each card ---------- */
  const SHORT = { 'Make your bed': 'Bed', "Make your sister's bed": "Sister's bed", 'Pyjamas away': 'Pyjamas', 'Socks in the basket': 'Socks', 'Wipe the table': 'Wipe',
    'Toys in the toy chest': 'Toys', 'Hang the washing': 'Washing', 'Books on the shelf': 'Books', 'Sweep the floor': 'Sweep', 'Dishes to the rack': 'Dishes',
    'Plant a seed': 'Plant', 'Set the table': 'Table', 'Pack the school bag': 'School bag', 'Homework to the desk': 'Homework', 'Rubbish in the right bin': 'Rubbish',
    'Fold the dry washing': 'Fold', 'Shoes on the rack': 'Shoes', 'A drawing for the fridge': 'Drawing', 'School bag on its peg': 'Bag', 'Brush your teeth': 'Teeth',
    'Bins to the curb': 'Bins', 'Water the garden': 'Water', 'Pull the weeds': 'Weeds', 'Cook with Ummi': 'Cook', 'Play blocks with your brother': 'Blocks',
    'Play catch with your sister': 'Catch', 'Tidy up': 'Tidy', 'Help set the table': 'Table', 'Help pack the bag': 'Bag', 'Find a shoe': 'Shoe', 'Help fold the washing': 'Fold',
    'Water the plants': 'Water', 'Carry the shopping': 'Shopping', 'Play blocks': 'Blocks', 'Play catch': 'Catch', 'Hide and seek': 'Hide', 'A bedtime story': 'Story' };
  const short = t => SHORT[t.title] || (/^Pick the/.test(t.title) ? 'Pick' : /prayer$/.test(t.title) ? t.title.replace(/ prayer$/, '') : /^Tahajjud/.test(t.title) ? 'Tahajjud' :
    shortWord(t.title));
  // no hand-picked label: the first word that names a thing ("Fill the cat's bowl" -> "Cat")
  const STOP = /^(help|with|the|a|an|your|my|to|put|take|fill|make|give|play|do|get|in|on|for|and|of|at|into|away|up|out|feed|water|bring|carry|find|set|clear|pack|hang|fold|wipe|sweep|tidy)$/i;
  function shortWord(title){ const w = String(title).split(/\s+/).map(x => x.replace(/'s$|[^\w']/g, '')).filter(Boolean), k = w.find(x => !STOP.test(x)) || w[w.length - 1] || title;
    return k.charAt(0).toUpperCase() + k.slice(1); }
  const WHO = { abu: 'Abu', ummi: 'Ummi', sister: 'Your sister', toddler: 'Your little brother' };
  const voiceOf = c => c.kind === 'request' && WHO[c.who] ? WHO[c.who] + ' needs help. ' + c.title : c.kind === 'prayer' ? 'It is time for ' + c.label + '.' : c.title;

  /* ---------- today's plan (HHDays.dailyPlan ids) -> live tasks ---------- */
  const tt = s => t => t && t.title === s, idm = re => t => t && re.test(t.id);
  const PLAN = {
    'make-bed': t => t && t.id === 'bed', 'pyjamas-away': tt('Pyjamas away'), 'set-breakfast': tt('Set the table'), 'set-dinner': tt('Set the table'),
    'clear-table': tt('Dishes to the rack'), 'dishes-rack': tt('Dishes to the rack'), 'wipe-table': tt('Wipe the table'), 'sweep-floor': tt('Sweep the floor'),
    'toddler-toys': tt('Toys in the toy chest'), 'shoe-rack': tt('Shoes on the rack'), 'homework-desk': tt('Homework to the desk'), 'pack-schoolbag': tt('Pack the school bag'),
    'bins-out': idm(/^bin\d$/), 'hang-washing': tt('Hang the washing'), 'fold-washing': tt('Fold the dry washing'), 'sort-recycling': tt('Rubbish in the right bin'),
    'water-garden': idm(/^garden\..*\.water$/), 'garden-water': idm(/^garden\..*\.water$/), 'garden-plant': idm(/\.plant$/), 'garden-weed': idm(/\.weed$/), 'garden-harvest': idm(/\.harvest$/),
    'tidy-my-room': t => t && t.kind === 'chore' && t.room === 'myroom', 'evening-tidy': t => t && t.kind === 'chore', 'cook-with-ummi': t => t && t.id === 'cook',
    'blocks': idm(/blocks/), 'catch': idm(/catch/), 'hide-and-seek': idm(/hide/), 'shop-trip': idm(/^place\.shop$/), 'put-away-shopping': idm(/^place\.shop$/),
    'walk-to-park': idm(/^place\.park$/), 'feed-ducks': idm(/^place\.park$/), 'push-swing': idm(/^place\.park$/), 'mosque-visit': idm(/^place\.mosque$/), 'jumuah': idm(/^place\.mosque$/),
    'plate-for-neighbour': idm(/^place\.neighbour$/), 'help-bags': idm(/^place\.neighbour$/), 'card-for-neighbour': idm(/^place\.neighbour$/), 'share-with-neighbour': idm(/^place\.neighbour$/),
    'return-borrowed-bowl': idm(/^place\.neighbour$/), 'read-to-neighbour': idm(/^place\.neighbour$/), 'brush-teeth': idm(/^teeth\./),
  };

  /* ---------- state ---------- */
  let H = null, ST = null, mounted = false, LAST = new Map(), ACT = null, DEMO = null, ONB = null, root = null, strip = null, chip = null, open = false, ghost = null, fx = null, garland = null;
  function load(){ const s = read(KEY, {}) || {}; s.days = s.days || []; s.gifts = s.gifts || []; s.hearts = s.hearts || {}; s.special = s.special || {}; return s; }
  const save = () => write(KEY, ST);
  function winKey(d){ const c = safe(() => HL.current(d), null); return dk(d) + '|' + (c ? c.name : d.getHours() < 5 ? 'night' : 'morning'); }
  const W = () => ST.win;

  /* ---------- building the strip ---------- */
  function groupKey(t){ return t.kind === 'chore' ? 'c|' + t.title + '|' + t.room : t.kind === 'garden' ? 'g|' + t.title : t.id; }
  function groups(T, skip){
    const m = new Map();
    for (const t of T){ if (t.done) continue; const k = groupKey(t); if (skip && skip.has(k)) continue;
      let g = m.get(k); if (!g){ g = { k, kind: t.kind, title: t.title, icon: t.icon, who: t.who || null, ids: [], order: t.order, first: t }; m.set(k, g); }
      g.ids.push(t.id); }
    return [...m.values()];
  }
  function pick(T, max, skip){
    const gs = groups(T, skip), plan = safe(() => H.dailyPlan(), null), planned = new Set();
    for (const a of (plan && plan.activities) || []){ const f = PLAN[a.id]; if (!f) continue;
      const g = gs.find(x => !planned.has(x.k) && x.ids.some(id => f(T.find(t => t.id === id)))); if (g) planned.add(g.k); }
    const reqWho = new Set(gs.filter(g => g.kind === 'request').map(g => g.who));
    const rank = g => g.kind === 'prayer' ? 0 : g.kind === 'request' ? 1 : planned.has(g.k) ? 2 : g.kind === 'chore' ? 3 : g.kind === 'garden' ? 4 : g.kind === 'play' ? 5 : 6;
    const L = gs.filter(g => (g.kind !== 'place' || planned.has(g.k)) && !(g.kind === 'play' && reqWho.has(g.who))).sort((a, b) => rank(a) - rank(b) || a.order - b.order);
    const cap = { request: 2, garden: 1, play: 1, place: 1, chore: 4 }, n = {}, out = [];
    for (const g of L){ if (out.length >= max) break; const c = cap[g.kind] || 9; if ((n[g.kind] || 0) >= c) continue; n[g.kind] = (n[g.kind] || 0) + 1; out.push(g); }
    return out.map(g => ({ k: g.k, kind: g.kind, title: g.title, label: short(g.first), icon: g.icon, who: g.who, ids: g.ids, got: {}, done: false, quiet: false, at: g.first.to || g.first.at }));
  }
  function tasks(){ const T = safe(() => H.tasks(), []); LAST = new Map(T.map(t => [t.id, t])); return T; }
  function ensureWin(){
    const d = NOW(), key = winKey(d);
    if (ST.win && ST.win.key === key) return false;
    const T = tasks(), prev = ST.win;
    ST.win = { key, cards: pick(T, innerWidth < 430 && innerWidth < innerHeight ? 5 : 6), finished: false, celebrated: false, round: 0 };
    // a prayer prayed in the last window is still waiting to be celebrated (the child came back from the prayer pages)
    if (prev && prev.key.split('|')[0] === key.split('|')[0]) prev.cards.forEach(c => { if (c.kind === 'prayer' && !c.done && prayedNow(c)) ST.win.cards.unshift(Object.assign(c, { k: c.k + '|late' })); });
    save(); return true;
  }
  function topUp(){
    const w = W(); if (w.finished) return false;
    if (w.cards.length >= 3) return false;
    const have = new Set(w.cards.map(c => c.k)), add = pick(tasks(), 3 - w.cards.length, have);
    if (!add.length) return false; w.cards.push(...add); save(); return true;
  }
  function more(){
    const w = W(), have = new Set(w.cards.map(c => c.k)), add = pick(tasks(), 3, have);
    if (!add.length) return false; w.cards = w.cards.filter(c => c.done).slice(-2).concat(add); w.finished = false; w.round++; save(); return true;
  }
  const prayedNow = c => { const n = String(c.ids[0] || '').replace(/^prayer\./, ''); return !!safe(() => HL.prayed(n), false); };

  /* ---------- status: which cards are done (done flag, vanished, or a 'done' event) ---------- */
  function status(){
    const w = W(); if (!w) return;
    const T = tasks(), by = LAST; let changed = false;
    for (const c of w.cards){ if (c.done) continue;
      const persistent = c.kind === 'place' || c.kind === 'play';
      let n = 0; for (const id of c.ids){ const t = by.get(id); if (c.got[id] || (!persistent && (!t || t.done))) n++; }
      if (n !== c.n){ c.n = n; changed = true; }
      const u = c.ids.map(id => by.get(id)).find(t => t && !t.done && !c.got[t.id]); if (u) c.at = u.to || u.at;
      if (n >= c.ids.length) complete(c);
    }
    void T;
    if (changed) save();
    if (topUp()) changed = true;
    paint();
  }
  function cardFor(ev){
    const w = W(); if (!w || !ev || !ev.id) return null;
    const id = ev.id, alt = id;                                       // HOUSE now uses the same ids in tasks() and 'done'
    return w.cards.find(c => !c.done && (c.ids.indexOf(id) >= 0 || c.ids.indexOf(alt) >= 0)) ||
      w.cards.find(c => !c.done && c.kind === 'request' && ev.who && c.who === ev.who && (ev.kind === 'play' || ev.kind === 'request')) || null;
  }

  /* ---------- finishing a card ---------- */
  function complete(c){
    if (c.done) return; c.done = true;
    const byChild = Object.keys(c.got).length > 0 || (c.kind === 'prayer' && prayedNow(c));
    c.quiet = !byChild; save(); paint();
    if (byChild){ reward(c); if (!open) chipCheer(); }
    if (W().cards.every(x => x.done)){ W().finished = true; save();
      if (!W().celebrated){ W().celebrated = true; save(); setTimeout(() => moment(celebrate), byChild ? 1900 : 300); }
      setTimeout(paint, 900); }
  }
  function reward(c){
    const p = c.at ? H.toScreen(c.at) : center();
    sparkle(p, 14); sfx('g_pop');
    setTimeout(praise, 350);
    const d = dk(NOW());
    if (!ST.cosy || ST.cosy.day !== d) ST.cosy = { day: d, n: 0 };
    ST.cosy.n++;
    if (ST.days.indexOf(d) < 0){ ST.days.push(d); if (ST.days.length > 400) ST.days = ST.days.slice(-400); }
    const K = safe(() => HHDays.kind(NOW()), null);
    if (K) ['friday', 'ramadan', 'lastTenNights', 'eidFitr', 'eidAdha', 'arafah', 'whiteDay', 'sunnahFast', 'ashura'].forEach(f => { if (K[f]){ const a = ST.special[f] = ST.special[f] || []; if (a.indexOf(d) < 0) a.push(d); } });
    save(); cosyPaint(true);
    // a star for every finished card (worship is never scored: the prayer pages give their own, nothing extra here)
    if (c.kind !== 'prayer') safe(() => H.award(1, 'guide:' + c.k, { quiet: true }), 0);
    setTimeout(() => syncStars(p), 260);
    try { window.HHBook && HHBook.refresh(); } catch (e) {}
  }
  const center = () => [innerWidth/2, innerHeight*.45];

  /* ---------- stars: whatever the house credited since we last looked flies to the counter ---------- */
  let flying = 0;
  function counterEl(){ return safe(() => H.starEl && H.starEl(), null) || document.querySelector('.hh-hud .hh-btn[aria-label="My room"]'); }
  function syncStars(from){
    const n = safe(() => H.stars(), 0), had = ST.lastStars == null ? n : ST.lastStars, d = Math.max(0, n - had);
    ST.lastStars = n; save();
    if (!d){ safe(() => H.bumpStars && H.bumpStars(), 0); afterStars(); return; }
    const k = Math.min(d, 3);
    for (let i = 0; i < k; i++) setTimeout(() => flyStar(from || center(), i === k - 1 ? afterStars : null), i*200);
  }
  function flyStar(p, then){
    const c = counterEl(), r = c ? c.getBoundingClientRect() : { left: innerWidth - 120, top: 14, width: 74, height: 52 };
    const tx = r.left + 26, ty = r.top + r.height/2, s = el('div', 'hhg-star', icon('star', { sw: 1.6 }));
    fx.appendChild(s); flying++; sfx('g_whoosh');
    const mx = p[0] + (tx - p[0])*.35 + (p[0] < tx ? -30 : 30), my = Math.max(ty + 70, Math.min(p[1] - 80, (p[1] + ty)/2));   // a gentle arc that stays on screen
    const a = s.animate([
      { transform: `translate(${p[0]}px,${p[1]}px) scale(.2) rotate(0deg)`, opacity: 0 },
      { transform: `translate(${p[0]}px,${p[1] - 30}px) scale(1.5) rotate(40deg)`, opacity: 1, offset: .22 },
      { transform: `translate(${mx}px,${my}px) scale(1.2) rotate(140deg)`, opacity: 1, offset: .6 },
      { transform: `translate(${tx}px,${ty}px) scale(.7) rotate(260deg)`, opacity: 1 },
    ], { duration: RM() ? 10 : 950, easing: 'cubic-bezier(.45,.05,.4,1)', fill: 'forwards' });
    a.onfinish = () => { s.remove(); flying--; sfx('g_land'); sparkle([tx, ty], 7, 26); if (!flying) safe(() => H.bumpStars && H.bumpStars(), 0);
      if (c){ c.classList.remove('pulse'); void c.offsetWidth; c.classList.add('pulse'); }
      then && then(); };
  }
  function afterStars(){
    const n = safe(() => H.stars(), 0);
    if (ST.giftAt == null) ST.giftAt = Math.floor(n/5)*5;
    if (n >= ST.giftAt + 5){ ST.giftAt = Math.floor(n/5)*5; save(); moment(gift, true); }
    save();
  }

  /* ---------- moments: gifts and celebrations, one at a time ---------- */
  const Q = []; let busy = false;
  function moment(fn, first){ if (first) Q.unshift(fn); else Q.push(fn); run(); }      // a present goes before a celebration
  function run(){ if (busy || !Q.length) return; if (flying){ setTimeout(run, 300); return; } busy = true; const fn = Q.shift(); fn(() => { busy = false; setTimeout(run, 300); }); }

  /* ---------- sparkles ---------- */
  function sparkle(p, n, rad){
    if (!fx) return; n = n || 10; rad = rad || 46;
    for (let i = 0; i < n; i++){
      const a = i/n*Math.PI*2 + Math.random()*.5, r = rad*(.6 + Math.random()*.7), s = el('i', 'hhg-spk' + (i % 3 ? '' : ' big'));
      fx.appendChild(s);
      const an = s.animate([{ transform: `translate(${p[0]}px,${p[1]}px) scale(.2)`, opacity: 1 },
        { transform: `translate(${p[0] + Math.cos(a)*r}px,${p[1] + Math.sin(a)*r - 12}px) scale(${(.8 + Math.random()*.6).toFixed(2)}) rotate(90deg)`, opacity: 0 }],
        { duration: RM() ? 10 : 700 + Math.random()*350, delay: Math.random()*90, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
      an.onfinish = () => s.remove();
    }
  }

  /* ---------- the ghost hand ---------- */
  function handHtml(){
    const h = safe(() => HH.hand(), { skin: '#c98e62', sleeve: '#4f7fd0' }), f = p => safe(() => HH.handSvg(h.skin, h.sleeve, p), '');
    return `<span class="op">${f('open')}</span><span class="gr">${f('grab')}</span><span class="pt">${f('point')}</span><span class="it"></span>`;
  }
  // is a point in clear view (not under the HUD or the strip)?
  const onScreen = p => { if (!p) return false; const side = open && tabletCol(), r = (open ? strip : chip).getBoundingClientRect();
    return p[0] > (side ? r.right + 12 : 20) && p[0] < innerWidth - 20 && p[1] > 76 && p[1] < (side ? innerHeight - 70 : r.top - 12); };
  // how much of the bottom the guide covers right now (for HOUSE.focus): only the chip when collapsed
  const insetBottom = () => { if (open && !tabletCol()) return innerHeight - strip.getBoundingClientRect().top + 8; const r = chip && chip.getBoundingClientRect(); return r && r.height ? innerHeight - r.top + 8 : 84; };
  const tabletCol = () => matchMedia('(orientation:landscape) and (min-width:700px) and (min-height:600px)').matches;
  function member(c){ tasks(); return c.ids.map(id => LAST.get(id)).find(t => t && !t.done && !c.got[t.id]) || null; }
  function stopDemo(){
    if (!DEMO) return; DEMO.anims.forEach(a => { try { a.cancel(); } catch (e) {} });
    ghost.classList.remove('on'); DEMO.extra.forEach(e => e.remove()); DEMO = null;
  }
  function idle(){
    if (!ACT) return; clearTimeout(ACT.timer);
    ACT.timer = setTimeout(() => { if (!ACT || DEMO) return; if (ACT.replays >= 3){ ACT = null; paint(); return; } ACT.replays++; show(ACT.c, 1, false, true); }, 8000);
  }
  // show(card): find its next job, bring it into view if needed, then the hand shows how
  function show(c, loops, focus, gentle){
    const t = member(c); if (!t){ status(); return; }
    const p = H.toScreen(t.from || t.at), q = H.toScreen(t.to || t.at);
    if (gentle && (!onScreen(p) || !onScreen(q))){ const b = open ? strip.querySelector(`.hhg-card[data-k="${CSS.escape(c.k)}"]`) : chip; if (b) bump(b); idle(); return; }
    if (focus || !onScreen(p) || !onScreen(q)){ stopDemo(); safe(() => H.focus(t.id, 700, { bottom: insetBottom() }), Promise.resolve()).then(() => { if (ACT && ACT.c === c) setTimeout(() => demo(t, loops), 80); }); }
    else demo(t, loops);
  }
  function demo(t, loops){
    stopDemo(); collapse();
    const how = t.how || 'tap', a = H.toScreen(how === 'drag' || how === 'scrub' ? (t.from || t.at) : t.at), b = H.toScreen(t.to || t.at);
    if (t.tapDy){ a[1] += t.tapDy; b[1] += t.tapDy; }             // the request bubble is drawn above its anchor (HOUSE gives tapDy)
    ghost.innerHTML = handHtml();
    const it = ghost.querySelector('.it'); it.innerHTML = t.icon || '';
    const extra = [], anims = [], E = 'cubic-bezier(.45,0,.35,1)';
    const tr = (p, dy, s) => `translate(${p[0].toFixed(1)}px,${(p[1] + (dy || 0)).toFixed(1)}px) scale(${s || 1})`;
    const vis = (on) => { const k = []; let prev = null; on.forEach(([o, v]) => { if (prev !== null && prev !== v) k.push({ offset: Math.max(0, o - .012), opacity: prev }); k.push({ offset: o, opacity: v }); prev = v; }); return k; };
    let kf, dur, pose;
    // a target ring where the job ends, and a dotted path for a drag
    const ring = el('i', 'hhg-ring'); ring.style.transform = `translate(${b[0]}px,${b[1]}px)`; fx.appendChild(ring); extra.push(ring);
    if (how === 'drag' || how === 'scrub'){
      const mx = (a[0] + b[0])/2, my = Math.min(a[1], b[1]) - Math.max(40, Math.abs(a[0] - b[0])*.25);
      const path = el('div', 'hhg-path', `<svg width="${innerWidth}" height="${innerHeight}"><path d="M${a[0]} ${a[1]}Q${mx} ${my} ${b[0]} ${b[1]}" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-dasharray="1 13" opacity=".95"/><path d="M${a[0]} ${a[1]}Q${mx} ${my} ${b[0]} ${b[1]}" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 13" opacity=".7"/></svg>`);
      fx.appendChild(path); extra.push(path);
      const m1 = [(a[0]*.75 + mx*.25), (a[1]*.5 + my*.5)], m2 = [(b[0]*.75 + mx*.25), (b[1]*.5 + my*.5)];
      if (how === 'drag'){
        dur = 2900;
        kf = [{ offset: 0, transform: tr([a[0] + 30, a[1] + 70]), opacity: 0 }, { offset: .12, transform: tr(a), opacity: 1 }, { offset: .2, transform: tr(a, 2, .88), opacity: 1 },
          { offset: .27, transform: tr(a, -8), opacity: 1 }, { offset: .42, transform: tr(m1), opacity: 1 }, { offset: .58, transform: tr(m2), opacity: 1 }, { offset: .72, transform: tr(b, -8), opacity: 1 },
          { offset: .79, transform: tr(b, 2, .9), opacity: 1 }, { offset: .86, transform: tr(b), opacity: 1 }, { offset: 1, transform: tr([b[0] + 26, b[1] + 50]), opacity: 0 }];
        pose = { op: [[0, 1], [.2, 0], [.8, 1]], gr: [[0, 0], [.2, 1], [.8, 0]], it: [[0, 0], [.21, 1], [.79, 0]], pt: [[0, 0]] };
      } else {
        dur = 3700; const L = 24;
        kf = [{ offset: 0, transform: tr([a[0] + 30, a[1] + 70]), opacity: 0 }, { offset: .1, transform: tr(a), opacity: 1 }, { offset: .16, transform: tr(a, 2, .88), opacity: 1 },
          { offset: .22, transform: tr(a, -8), opacity: 1 }, { offset: .32, transform: tr(m1), opacity: 1 }, { offset: .42, transform: tr(b), opacity: 1 },
          { offset: .5, transform: tr([b[0] - L, b[1]]), opacity: 1 }, { offset: .58, transform: tr([b[0] + L, b[1] + 3]), opacity: 1 }, { offset: .66, transform: tr([b[0] - L, b[1]]), opacity: 1 },
          { offset: .74, transform: tr([b[0] + L, b[1] + 3]), opacity: 1 }, { offset: .82, transform: tr(b), opacity: 1 }, { offset: .9, transform: tr(b), opacity: 1 }, { offset: 1, transform: tr([b[0] + 26, b[1] + 50]), opacity: 0 }];
        pose = { op: [[0, 1], [.16, 0], [.86, 1]], gr: [[0, 0], [.16, 1], [.86, 0]], it: [[0, 0], [.17, 1], [.85, 0]], pt: [[0, 0]] };
      }
    } else {
      dur = 1900;
      kf = [{ offset: 0, transform: tr([a[0] + 40, a[1] + 80]), opacity: 0 }, { offset: .28, transform: tr(a), opacity: 1 }, { offset: .4, transform: tr(a, 3, .84), opacity: 1 },
        { offset: .5, transform: tr(a), opacity: 1 }, { offset: .78, transform: tr(a), opacity: 1 }, { offset: 1, transform: tr([a[0] + 30, a[1] + 60]), opacity: 0 }];
      pose = { op: [[0, 0]], gr: [[0, 0]], it: [[0, 0]], pt: [[0, 1]] };
      const rip = el('i', 'hhg-rip'); fx.appendChild(rip); extra.push(rip);
      anims.push(rip.animate([{ transform: `translate(${a[0]}px,${a[1]}px) scale(.3)`, opacity: 0, offset: 0 }, { transform: `translate(${a[0]}px,${a[1]}px) scale(.3)`, opacity: .95, offset: .4 },
        { transform: `translate(${a[0]}px,${a[1]}px) scale(1.5)`, opacity: 0, offset: .75 }, { transform: `translate(${a[0]}px,${a[1]}px) scale(1.5)`, opacity: 0, offset: 1 }], { duration: dur, iterations: loops }));
    }
    kf.forEach(k => { k.easing = E; });
    if (RM()){ dur *= 1.4; }
    const main = ghost.animate(kf, { duration: dur, iterations: loops, fill: 'both' });
    anims.unshift(main);
    ['op', 'gr', 'it', 'pt'].forEach(cl => { const e = ghost.querySelector('.' + cl); anims.push(e.animate(vis(pose[cl]).concat(pose[cl].length && pose[cl][pose[cl].length - 1][0] < 1 ? [{ offset: 1, opacity: pose[cl][pose[cl].length - 1][1] }] : []), { duration: dur, iterations: loops, fill: 'both' })); });
    ghost.classList.add('on');
    DEMO = { anims, extra, t };
    main.onfinish = () => { if (DEMO && DEMO.anims[0] === main){ stopDemo(); idle(); } };
  }

  /* ---------- the strip ---------- */
  const TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  function cosySvg(n, full){
    const win = [[7.5, 15.5], [13.5, 15.5], [19.5, 15.5], [7.5, 23], [13.5, 23], [19.5, 23]];
    let s = `<svg viewBox="0 0 28 34" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">`;
    s += `<path d="M20 7.5V3.5h3.5v7" fill="#c26a4a"/>`;
    if (full) s += `<path d="M21.5 2.5c-1-1.2.5-2 0-3" stroke-width="1.4" opacity=".6"/>`;
    s += `<path d="M2 13.5 14 3.5l12 10" fill="#e8574a"/><path d="M4.5 12v19.5h19V12" fill="${n >= 6 ? '#fff1c4' : '#fbf6ea'}"/>`;
    win.forEach(([x, y], i) => { const on = i < n; s += `<rect x="${x - 2.4}" y="${y - 2.6}" width="4.8" height="5.2" rx=".8" fill="${on ? '#ffd27a' : '#cdd6e0'}" stroke-width="1.4"/>`; });
    if (full) s += `<path d="M14 9.8c-.9-1.4-3-.8-2.6.8.3 1.1 2.6 2.4 2.6 2.4s2.3-1.3 2.6-2.4c.4-1.6-1.7-2.2-2.6-.8z" fill="#ef6a8a" stroke-width="1.1"/>`;
    return s + '</svg>';
  }
  function cosyPaint(pop){
    if (!strip) return; const b = strip.querySelector('.hhg-cosy'); if (!b) return;
    const d = dk(NOW()), n = ST.cosy && ST.cosy.day === d ? ST.cosy.n : 0;
    if (b._n !== n){ b._n = n; b.innerHTML = cosySvg(Math.min(6, n), n >= 6); b.classList.toggle('lit', n > 0); }
    if (pop){ b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
  }
  function closingLine(){ return safe(() => HHDays.closing(NOW()), '') || safe(() => H.dailyPlan().closing, '') || 'The house is cosy.'; }
  function paint(){
    if (!strip) return;
    const w = W(), box = strip.querySelector('.hhg-cards');
    cosyPaint(false); chipPaint();
    if (w.finished){
      const avail = pick(tasks(), 1, new Set(w.cards.map(c => c.k))).length > 0, line = closingLine();
      const key = 'fin|' + line + avail;
      if (box._k !== key){ box._k = key; box.innerHTML = '';
        const d = el('button', 'hhg-fin', `<i>${icon(/Fajr|Isha|Maghrib/.test(line) ? 'moon' : 'sun')}</i><span><b>All done!</b><small></small></span>`);
        d.querySelector('small').textContent = line.replace(/^The house is cosy\. /, ''); d.setAttribute('aria-label', 'All done');
        d.addEventListener('click', e => { e.stopPropagation(); sfx('h_tap'); bump(d); say('All done! ' + line); });
        box.appendChild(d);
        if (avail){ const m = el('button', 'hhg-card hhg-more', `<span class="in"><span class="f">${PLUS}<b>More</b></span></span>`); m.setAttribute('aria-label', 'More jobs');
          m.addEventListener('click', e => { e.stopPropagation(); sfx('h_tap'); bump(m); if (more()){ box._k = ''; paint(); say('More jobs!'); } }); box.appendChild(m); } }
      return;
    }
    const key = w.cards.map(c => c.k).join('#');
    if (box._k !== key){ box._k = key; box.innerHTML = ''; box.style.setProperty('--n', w.cards.length);
      w.cards.forEach(c => { const b = el('button', 'hhg-card', `<span class="in"><span class="f"><i>${c.icon || icon('star')}</i><b></b><em></em></span><span class="bk">${TICK}</span></span>`);
        b.querySelector('b').textContent = c.label; b.setAttribute('aria-label', c.title); b.dataset.k = c.k;
        b.addEventListener('click', e => { e.stopPropagation(); tapCard(c.k, b); }); box.appendChild(b); }); }
    const next = w.cards.find(c => !c.done);
    [...box.children].forEach(b => { const c = w.cards.find(x => x.k === b.dataset.k); if (!c) return;
      b.classList.toggle('done', !!c.done); b.classList.toggle('quiet', !!c.quiet); b.classList.toggle('next', c === next && !(ACT && ACT.c.k !== c.k)); b.classList.toggle('sel', !!(ACT && ACT.c.k === c.k && !c.done));
      b.classList.toggle('pray', c.kind === 'prayer');
      const em = b.querySelector('em'); const pips = c.ids.length > 1 && c.ids.length <= 8 ? c.ids.map((_, i) => `<u class="${i < (c.n || 0) ? 'on' : ''}"></u>`).join('') : '';
      if (em._p !== pips){ em._p = pips; em.innerHTML = pips; } });
  }
  function bump(b){ b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  /* ---------- the chip (collapsed) and the strip (expanded) ---------- */
  function expand(){ if (open || !strip) return; open = true; strip.classList.add('open'); chip.classList.add('open'); chip.setAttribute('aria-expanded', 'true'); chipPaint(); }
  function collapse(){ if (!open || !strip || (ONB && ONB.step === 1)) return; open = false; strip.classList.remove('open'); chip.classList.remove('open'); chip.setAttribute('aria-expanded', 'false'); chipPaint(); }
  function ringSvg(done, total){
    const R = 27, L = 2*Math.PI*R, f = total ? Math.min(1, done/total) : 0;
    return `<svg viewBox="0 0 64 64" class="rg"><circle cx="32" cy="32" r="${R}" fill="#fff9e8" stroke="#e6dcc3" stroke-width="6"/>` +
      (f ? `<circle cx="32" cy="32" r="${R}" fill="none" stroke="#5cae6a" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(L*f).toFixed(1)} ${L.toFixed(1)}" transform="rotate(-90 32 32)"/>` : '') +
      `<circle cx="32" cy="32" r="${R + 3.2}" fill="none" stroke="${INK}" stroke-width="2.2"/><circle cx="32" cy="32" r="${R - 3.2}" fill="none" stroke="${INK}" stroke-width="1.4" opacity=".5"/></svg>`;
  }
  let chipTick = 0;
  function chipPaint(){
    if (!chip || !W()) return;
    const w = W(), done = w.cards.filter(c => c.done).length, total = w.cards.length;
    const cur = ACT && !ACT.c.done ? ACT.c : w.cards.find(c => !c.done), fin = w.finished || !cur;
    const line = fin ? closingLine() : '';
    const ic = chipTick ? TICK : fin ? icon(/Fajr|Isha|Maghrib/.test(line) ? 'moon' : 'sun') : (cur.icon || icon('star'));
    const lab = chipTick ? 'Done!' : fin ? 'All done!' : cur.label;
    const key = [done, total, ic.length, lab, fin].join('|');
    chip.classList.toggle('next', !fin && !open);
    chip.classList.toggle('fin', fin); chip.classList.toggle('pray', !fin && cur.kind === 'prayer');
    if (chip._k === key) return; chip._k = key;
    chip.querySelector('.ring').innerHTML = ringSvg(done, total) + `<i>${ic}</i>`;
    chip.querySelector('b').textContent = lab;
    chip.setAttribute('aria-label', fin ? 'All done' : 'Next: ' + (cur.title || lab));
  }
  function chipCheer(){ if (!chip) return; chipTick = 1; chip._k = ''; chipPaint(); bump(chip); clearTimeout(chipCheer.t); chipCheer.t = setTimeout(() => { chipTick = 0; chip._k = ''; chipPaint(); }, 1100); }
  function tapCard(k, b){
    const c = W().cards.find(x => x.k === k); if (!c) return;
    sfx('h_tap'); bump(b);
    if (c.done){ say(c.quiet ? c.label + '. The family did it.' : 'Done! ' + c.label); return; }
    say(voiceOf(c));
    if (ONB && ONB.step === 1) onbTapped(c);
    if (ACT) clearTimeout(ACT.timer);
    ACT = { c, replays: 0, timer: 0 }; paint();
    setTimeout(collapse, 160);
    show(c, 2, true);
  }

  /* ---------- the gift box ---------- */
  const DECOR = ['rug', 'lamp', 'cushion', 'plant', 'frame', 'garland'];
  function nextGift(){
    const have = new Set(ST.gifts.map(g => g.id)), n = ST.gifts.length, stars = safe(() => H.stars(), 0);
    const cost = safe(() => HD.DECOR, null), deco = DECOR.filter(id => !have.has(id) && (!cost || !cost[id] || cost[id].cost <= stars));
    const pool = (window.HHBook && HHBook.GIFTS) || ['kite', 'boat', 'rainbow'], st = pool.filter(id => !have.has(id));
    if (deco.length && (n % 2 === 0 || !st.length)) return { id: deco[0], type: 'decor' };
    if (st.length) return { id: st[(n*5 + 3) % st.length], type: 'sticker' };
    return { id: pool[n % pool.length], type: 'sticker' };
  }
  function gift(done){
    const g = nextGift(), name = (window.HHBook && HHBook.GIFT_NAME && HHBook.GIFT_NAME[g.id]) || g.id;
    ST.gifts.push({ id: g.id, type: g.type, day: dk(NOW()) }); save();
    try { window.HHBook && HHBook.refresh(); } catch (e) {}
    const v = el('div', 'hhg-veil hhg-gift');
    v.innerHTML = `<div class="hhg-gbox"><div class="rays"></div><div class="prize">${icon(g.id, { sw: 1.6 })}</div>
      <div class="box"><svg class="base" viewBox="0 0 120 90"><rect x="10" y="22" width="100" height="64" rx="6" fill="#fbf6ea" stroke="${INK}" stroke-width="4"/><path d="M60 22v64" stroke="#e98fb0" stroke-width="14"/><path d="M60 22v64M53 22v64M67 22v64" stroke="${INK}" stroke-width="2.5" opacity=".0"/><rect x="10" y="22" width="100" height="64" rx="6" fill="none" stroke="${INK}" stroke-width="4"/><path d="M53 22v64M67 22v64" stroke="${INK}" stroke-width="2.6"/></svg>
      <svg class="lid" viewBox="0 0 130 60"><path d="M65 30c-10-26-38-24-30-6 4 8 20 8 30 6zM65 30c10-26 38-24 30-6-4 8-20 8-30 6z" fill="#e98fb0" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><rect x="4" y="28" width="122" height="26" rx="5" fill="#e98fb0" stroke="${INK}" stroke-width="4"/><path d="M57 28v26M73 28v26" stroke="${INK}" stroke-width="2.6"/><rect x="57" y="28" width="16" height="26" fill="#f6c2d4" stroke="${INK}" stroke-width="2.6"/></svg></div>
      <div class="hand">${safe(() => HH.handSvg(HH.hand().skin, HH.hand().sleeve, 'point'), '')}</div></div>
      <div class="hhg-gbar"><button class="hhg-ok" aria-label="Done">${TICK}</button></div>`;
    document.body.appendChild(v);
    requestAnimationFrame(() => v.classList.add('in'));
    sfx('g_paper'); say('A present for you! Tap it.');
    const box = v.querySelector('.hhg-gbox'); let opened = false;
    const openIt = () => {
      if (opened) return; opened = true; clearTimeout(auto); box.classList.add('open'); sfx('g_lid');
      setTimeout(() => { sfx('g_pop'); const r = box.querySelector('.prize').getBoundingClientRect(); sparkle([r.left + r.width/2, r.top + r.height/2], 16, 90);
        say(g.type === 'decor' ? 'A new ' + name.toLowerCase() + ' for your room!' : 'A ' + name.toLowerCase() + ' sticker for your book!'); }, 380);
      if (g.type === 'decor'){ const rb = el('button', 'hhg-room', `${icon(g.id, { sw: 1.6 })}${icon('house')}`); rb.setAttribute('aria-label', 'Put it in my room');
        rb.addEventListener('click', e => { e.stopPropagation(); sfx('h_tap'); close(); setTimeout(() => { const c = counterEl(); c && c.click(); }, 260); });
        v.querySelector('.hhg-gbar').prepend(rb); }
      else { const bb = el('button', 'hhg-room', icon('book', { sw: 1.8 })); bb.setAttribute('aria-label', 'Open my book');
        bb.addEventListener('click', e => { e.stopPropagation(); sfx('h_tap'); close(); setTimeout(() => { try { HHBook.open('me'); } catch (x) {} }, 260); });
        v.querySelector('.hhg-gbar').prepend(bb); }
      v.classList.add('opened');
    };
    box.addEventListener('click', e => { e.stopPropagation(); openIt(); });
    const auto = setTimeout(openIt, 4500);
    let gone = false;
    function close(){ if (gone) return; gone = true; clearTimeout(auto); v.classList.remove('in'); setTimeout(() => { v.remove(); done(); }, 260); }
    v.querySelector('.hhg-ok').addEventListener('click', e => { e.stopPropagation(); sfx('h_tap'); if (!opened){ openIt(); return; } close(); });
  }

  /* ---------- the celebration: lanterns over the house, the family waves, a leaf on the branch ---------- */
  function lanterns(drop){
    if (garland) garland.remove();
    const w = innerWidth, n = Math.max(5, Math.round(w/88)), top = 62, sag = Math.min(46, w*.06), cols = ['#f2c230', '#e8574a', '#3f9c92', '#f3a6bb'];
    const y = x => top + sag*4*(x/w)*(1 - x/w);
    garland = el('div', 'hhg-garland' + (drop ? ' drop' : ''));
    let s = `<svg class="str" width="${w}" height="${top + sag + 10}"><path d="M-4 ${top - 6}Q${w/2} ${top + sag*2 - 6} ${w + 4} ${top - 6}" fill="none" stroke="${INK}" stroke-width="2.4"/></svg>`;
    for (let i = 0; i < n; i++){ const x = (i + .5)*w/n, c = cols[i % cols.length];
      s += `<i style="left:${x.toFixed(0)}px;top:${(y(x) - 8).toFixed(0)}px;--d:${(i*.09).toFixed(2)}s"><b class="glow"></b>${icon('lantern', { sw: 1.7 }).replace('#f2c230', c)}</i>`; }
    garland.innerHTML = s; document.body.appendChild(garland);
  }
  function familyRow(){
    if (!window.FAMILY || !FAMILY.draw || typeof P !== 'function') return '';
    let s = '';
    try {
      for (const [k, h, dur] of [['abu', 112, .76], ['ummi', 106, .84], ['sister', 86, .7], ['toddler', 62, .6]]){
        const fr = (FAMILY.FRAMES && FAMILY.FRAMES.wave) || 1, items = [];
        for (let f = 0; f < fr; f++) items.push(FAMILY.draw(k, 'wave', [0, 0, 0], 20, f)[0]);
        items.push(FAMILY.draw(k, 'stand', [0, 0, 0], 20, 0)[0]);      // at rest after the waving
        const pts = []; items.forEach(it => { const b = it.box; for (const x of [b[0][0], b[1][0]]) for (const y of [b[0][1], b[1][1]]) for (const z of [b[0][2], b[1][2]]) pts.push(P(x, y, z)); });
        const xs = pts.map(t => t[0]), ys = pts.map(t => t[1]), pad = 3, vb = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + 2*pad, Math.max(...ys) - Math.min(...ys) + 2*pad];
        const ink = typeof inkScale === 'function' ? inkScale : x => x;
        s += `<span class="who" style="height:${h}px;aspect-ratio:${(vb[2]/vb[3]).toFixed(3)}">` + items.map((it, f) => `<svg viewBox="${vb.map(v => v.toFixed(1)).join(' ')}" class="${f < fr ? 'fr' : 'rest'}" style="animation-duration:${f < fr ? dur : dur*7}s;animation-delay:${f < fr ? (f*dur/fr).toFixed(3) : 0}s"><g filter="url(#hand)">${ink(it.svg)}</g></svg>`).join('') + '</span>';
      }
    } catch (e) { return ''; }
    return s;
  }
  function celebrate(done){
    lanterns(true); sfx('g_cheer');
    const line = closingLine(), v = el('div', 'hhg-veil hhg-cele');
    const days = ST.days.length;
    v.innerHTML = `<div class="hhg-cbox"><div class="fam">${familyRow()}</div><b>All done!</b><p></p>
      <div class="br">${window.HHBook && HHBook.branch ? HHBook.branch(ST.days, { now: NOW(), grow: true }) : ''}<span class="n">${icon('leaf')}<em>${days}</em></span></div>
      <button class="hhg-ok" aria-label="Done">${TICK}</button></div>`;
    v.querySelector('p').textContent = line;
    document.body.appendChild(v); requestAnimationFrame(() => v.classList.add('in'));
    setTimeout(() => { try { Kit.say && Kit.say.praise('alhamdulillah'); } catch (e) {} }, 500);
    setTimeout(() => say('All done! ' + line), 2200);
    setTimeout(() => { const r = v.querySelector('.hhg-cbox').getBoundingClientRect(); sparkle([r.left + r.width/2, r.top + 40], 18, 140); }, 300);
    try { window.KahfBridge && KahfBridge.complete(); } catch (e) {}
    let gone = false;
    const close = () => { if (gone) return; gone = true; v.classList.remove('in'); garland && garland.classList.remove('drop'); setTimeout(() => { v.remove(); done(); }, 260); };
    v.querySelector('.hhg-ok').addEventListener('click', e => { e.stopPropagation(); sfx('h_tap'); close(); });
    v.addEventListener('click', e => { if (e.target === v) close(); });
  }

  /* ---------- first visit: tap a card -> the hand shows -> do it -> the first big reward ---------- */
  function onboard(){
    const w = W(), easy = x => !x.done && x.kind === 'chore' && x.ids.length <= 3;
    const c = w.cards.find(easy) || w.cards.find(x => !x.done && x.kind !== 'prayer' && x.kind !== 'place' && x.kind !== 'request') || w.cards.find(x => !x.done);
    if (!c){ ST.onboarded = true; save(); return; }
    const pr = w.cards.filter(x => x.kind === 'prayer' && !x.done); w.cards = pr.concat([c], w.cards.filter(x => x !== c && pr.indexOf(x) < 0)); save(); paint();
    ONB = { step: 1, c, veil: el('div', 'hhg-coach') };
    expand();
    const b = strip.querySelector(`.hhg-card[data-k="${CSS.escape(c.k)}"]`); strip.classList.add('lift'); chip.classList.add('lift'); document.body.appendChild(ONB.veil); requestAnimationFrame(() => ONB.veil.classList.add('in'));
    let taps = 0;
    ONB.veil.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); taps++; if (b) bump(b); say('Tap a picture to help!'); if (taps >= 4) onbEnd(); });
    // the hand taps the card, over and over, until the child does
    // measured once the strip has slid open
    if (b) setTimeout(() => { if (!ONB || ONB.step !== 1) return; const r = b.getBoundingClientRect(), p = [r.left + r.width/2, r.top + r.height*.45];
      ghost.innerHTML = handHtml(); ghost.classList.add('on', 'coach');
      const kf = [{ transform: `translate(${p[0] + 30}px,${p[1] + 60}px)`, opacity: 0 }, { transform: `translate(${p[0]}px,${p[1]}px)`, opacity: 1, offset: .35 },
        { transform: `translate(${p[0]}px,${p[1] + 3}px) scale(.85)`, opacity: 1, offset: .5 }, { transform: `translate(${p[0]}px,${p[1]}px)`, opacity: 1, offset: .62 }, { transform: `translate(${p[0] + 24}px,${p[1] + 46}px)`, opacity: 0 }];
      const a1 = ghost.animate(kf, { duration: 1700, iterations: Infinity }), a2 = ghost.querySelector('.pt').animate([{ opacity: 1 }, { opacity: 1 }], { duration: 1700, iterations: Infinity });
      ghost.querySelectorAll('.op,.gr,.it').forEach(e => { e.style.opacity = 0; });
      ONB.anims = [a1, a2]; }, 380);
    setTimeout(() => say('Tap a picture to help!'), 700);
  }
  function onbClearCoach(){ if (!ONB) return; (ONB.anims || []).forEach(a => a.cancel()); ONB.anims = null; ghost.classList.remove('on', 'coach'); ghost.querySelectorAll('span').forEach(e => { e.style.opacity = ''; });
    if (ONB.veil){ const v = ONB.veil; ONB.veil = null; v.classList.remove('in'); setTimeout(() => v.remove(), 250); } strip.classList.remove('lift'); chip.classList.remove('lift'); }
  function onbTapped(){ onbClearCoach(); ONB.step = 2; setTimeout(() => say('Watch my hand. Now you do it!'), 1500); }
  function onbEnd(){ onbClearCoach(); ONB = null; ST.onboarded = true; save(); }
  function onbFirstWin(p){
    onbEnd();
    // the first big reward: a star now, and the first present straight away
    setTimeout(() => { const n = safe(() => H.stars(), 0); ST.giftAt = Math.floor(n/5)*5; save(); moment(gift, true); }, 1500);
    void p;
  }

  /* ---------- events from the house ---------- */
  let stT = 0;
  const soon = (ms) => { clearTimeout(stT); stT = setTimeout(status, ms || 350); };
  function onDone(ev){
    if (!ev) return;
    if (ev.who && (ev.kind === 'request' || ev.kind === 'play')){ ST.hearts[ev.who] = (ST.hearts[ev.who] || 0) + 1; save(); }
    const t = LAST.get(ev.id), p = t ? H.toScreen(t.to || t.at) : null, c = cardFor(ev);
    if (c){ const id = c.ids.indexOf(ev.id) >= 0 ? ev.id : c.ids.indexOf(ev.id.replace(/^place\./, '')) >= 0 ? ev.id.replace(/^place\./, '') : c.ids.find(x => !c.got[x]) || ev.id;
      c.got[id] = 1; c.n = (c.n || 0) + 1; save();
      if (p) { sparkle(p, 6, 30); } sfx('g_pop');
      const fin = c.ids.every(x => c.got[x] || !LAST.get(x) || LAST.get(x).done || x === id);
      if (fin) complete(c); else { const b = open ? strip.querySelector(`.hhg-card[data-k="${CSS.escape(c.k)}"]`) : chip; if (b) bump(b); }
      if (ACT && ACT.c === c){ stopDemo(); ACT.replays = 0; clearTimeout(ACT.timer);
        if (c.done){ ACT = null; } else ACT.timer = setTimeout(() => { if (ACT && ACT.c === c && !DEMO) show(c, 1, false, true); }, 1800); }
      paint();
    }
    if (ev.stars) setTimeout(() => syncStars(p || center()), c ? 700 : 80);
    if (ONB && ONB.step >= 1 && !c){ /* something else done first: that counts too */ }
    if (ONB){ if (!c || !c.done){ safe(() => H.award(1, 'guide:first'), 0); setTimeout(() => syncStars(p || center()), 300); } onbFirstWin(p); }
    try { window.HHBook && HHBook.refresh(); } catch (e) {}
    soon(500);
  }
  function onUser(e){
    // the child is doing something in the house: the strip folds away, the hand steps aside, and comes back after 8 s with no progress
    if (e.target.closest && e.target.closest('.hhg-strip,.hhg-chip,.hhg-veil,.hhb,.hhb-btn,.hh-hud,.hh-tray,.kit-sheet,.hhg-coach')) return;
    collapse();
    if (!ACT) return;
    if (DEMO) stopDemo();
    idle();
  }

  /* ---------- styles ---------- */
  const CSSTEXT = `
  .hhg-strip{position:fixed;left:0;right:0;margin:0 auto;width:fit-content;bottom:calc(env(safe-area-inset-bottom) + 84px);z-index:6;display:flex;align-items:stretch;gap:6px;padding:6px;box-sizing:border-box;
    max-width:calc(100vw - 16px);background:#fbf6ea;border:2.5px solid ${INK};border-radius:24px;box-shadow:0 4px 0 ${INK};transition:transform .28s cubic-bezier(.2,1.2,.4,1),opacity .18s,visibility 0s .28s;
    -webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;touch-action:none;
    opacity:0;visibility:hidden;pointer-events:none;transform:translateY(40px) scale(.96);transform-origin:20% 100%}
  .hhg-strip.open{opacity:1;visibility:visible;pointer-events:auto;transform:none;transition:transform .32s cubic-bezier(.2,1.25,.4,1),opacity .15s,visibility 0s}
  .hhg-strip.lift,.hhg-chip.lift{z-index:8}
  .hhg-chip{all:unset;position:fixed;left:96px;bottom:calc(env(safe-area-inset-bottom) + 8px);z-index:6;box-sizing:border-box;height:64px;max-width:calc(100vw - 180px);padding:4px 10px 4px 4px;
    display:flex;align-items:center;gap:6px;border-radius:32px;background:#fbf6ea;border:2.5px solid ${INK};box-shadow:0 3px 0 ${INK};cursor:pointer;-webkit-tap-highlight-color:transparent;transition:opacity .2s,transform .2s}
  .hhg-chip .ring{position:relative;flex:none;width:52px;height:52px}
  .hhg-chip .ring .rg{position:absolute;inset:0;width:100%;height:100%}
  .hhg-chip .ring i{position:absolute;inset:11px;display:grid;place-items:center}.hhg-chip .ring i svg{width:100%;height:100%;overflow:visible}
  .hhg-chip b{font:800 15px/1.05 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;color:${INK};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
  .hhg-chip .chev{flex:none;width:22px;height:22px;transition:transform .25s}.hhg-chip .chev svg{width:100%;height:100%}
  .hhg-chip.open .chev{transform:rotate(180deg)}
  .hhg-chip.next{background:#f4b829}.hhg-chip.pray.next{background:#9fdcc4}.hhg-chip.fin{background:#dcefcd}
  .hhg-chip.next::before{content:"";position:absolute;inset:-3px;border-radius:34px;border:3px solid #f4b829;animation:hhgRing 1.8s ease-out infinite;pointer-events:none}
  .hhg-chip:active{transform:translateY(2px);box-shadow:0 1px 0 ${INK}}
  .hhg-chip.bump{animation:hhgPop .45s cubic-bezier(.2,1.5,.4,1)}
  body:has(.hh-tray.in) .hhg-chip,body:has(.fam-stage) .hhg-chip,body:has(.hh-teeth) .hhg-chip,body:has(.hh-hp) .hhg-chip,body:has(.kit-veil) .hhg-chip,body:has(.hhb) .hhg-chip,body:has(.hhg-veil) .hhg-chip{opacity:0;pointer-events:none}
  body:has(.hh-tray.in) .hhg-strip,body:has(.fam-stage) .hhg-strip,body:has(.hh-teeth) .hhg-strip,body:has(.hh-hp) .hhg-strip,body:has(.kit-veil) .hhg-strip,body:has(.hhb) .hhg-strip,body:has(.hhg-veil) .hhg-strip{opacity:0;visibility:hidden;pointer-events:none;transform:translateY(30px)}
  .hhg-cards{display:flex;gap:6px;align-items:stretch;min-width:0}
  .hhg-cosy{all:unset;flex:none;box-sizing:border-box;width:46px;border-radius:16px;display:grid;place-items:center;cursor:pointer;background:#efe6cf;border:2px dashed rgba(35,30,22,.35)}
  .hhg-cosy svg{width:36px;height:44px}
  .hhg-cosy.lit{background:#fff3cf;border-style:solid;border-color:${INK}}
  .hhg-cosy.pop{animation:hhgPop .6s cubic-bezier(.2,1.5,.4,1)}
  .hhg-card{all:unset;position:relative;box-sizing:border-box;flex:none;width:clamp(44px,calc((100vw - 92px - (var(--n,5) - 1)*6px)/var(--n,5)),68px);height:76px;perspective:500px;cursor:pointer}
  .hhg-card .in{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .55s cubic-bezier(.3,1.4,.4,1)}
  .hhg-card .f,.hhg-card .bk{position:absolute;inset:0;box-sizing:border-box;border-radius:16px;border:2.4px solid ${INK};backface-visibility:hidden;-webkit-backface-visibility:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;box-shadow:0 3px 0 ${INK}}
  .hhg-card .f{background:#fff9e8}
  .hhg-card .f i{display:grid;place-items:center;width:38px;height:38px;flex:none}
  .hhg-card .f i svg{width:100%;height:100%;overflow:visible}
  .hhg-card .f b{font:800 clamp(9.5px,2.6vw,10.5px)/1 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;color:${INK};max-width:100%;padding:0 2px;box-sizing:border-box;overflow:hidden;text-align:center;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:normal;hyphens:none}
  .hhg-card .f em{position:absolute;top:3px;left:0;right:0;display:flex;justify-content:center;gap:2px}
  .hhg-card .f em u{display:block;width:6px;height:6px;border-radius:50%;border:1.4px solid ${INK};background:#fff;box-sizing:border-box}
  .hhg-card .f em u.on{background:#5cae6a}
  .hhg-card .bk{background:#dcefcd;transform:rotateY(180deg)}
  .hhg-card .bk svg{width:34px;height:34px}
  .hhg-card.quiet .bk{background:#ece6d8}
  .hhg-card.done .in{transform:rotateY(180deg)}
  .hhg-card.next .f{background:#f4b829}
  .hhg-card.pray .f{background:#d9efe6}
  .hhg-card.pray.next .f{background:#9fdcc4}
  .hhg-card.next::before{content:"";position:absolute;inset:-2px;border-radius:18px;border:3px solid #f4b829;animation:hhgRing 1.5s ease-out infinite;pointer-events:none}
  .hhg-card.sel .f{background:#fff;box-shadow:0 3px 0 ${INK},0 0 0 3px #fff,0 0 0 6px #f4b829}
  .hhg-card:active .in{transform:translateY(2px)}
  .hhg-card.done:active .in{transform:rotateY(180deg) translateY(2px)}
  .hhg-card.bump,.hhg-fin.bump{animation:hhgPop .45s cubic-bezier(.2,1.5,.4,1)}
  @keyframes hhgRing{0%{transform:scale(1);opacity:.95}100%{transform:scale(1.22);opacity:0}}
  @keyframes hhgPop{35%{transform:scale(1.16)}}
  .hhg-more .f{background:#fff;border-style:dashed}
  .hhg-fin{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;padding:0 14px 0 8px;height:76px;border-radius:16px;background:#dcefcd;border:2.4px solid ${INK};box-shadow:0 3px 0 ${INK};cursor:pointer;min-width:0}
  .hhg-fin i{flex:none;width:42px;height:42px;display:grid;place-items:center}.hhg-fin i svg{width:100%;height:100%}
  .hhg-fin b{display:block;font:800 17px/1.1 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;color:${INK}}
  .hhg-fin small{display:block;font:700 13px/1.2 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;color:#3c4a33}
  @media (orientation:landscape) and (min-width:700px) and (min-height:600px){
    .hhg-strip{left:12px;right:auto;margin:0;top:50%;bottom:auto;transform:translateY(-50%) translateX(-40px);transform-origin:0 50%;flex-direction:column;max-height:calc(100dvh - 190px);max-width:none;padding:5px;gap:5px;border-radius:20px}
    .hhg-strip.open{transform:translateY(-50%)}
    .hhg-cards{flex-direction:column;gap:5px}
    .hhg-cosy{width:auto;height:44px}.hhg-cosy svg{height:38px}
    .hhg-card{flex:none;width:56px;height:56px}
    .hhg-card .f b{display:none}.hhg-card .f i{width:36px;height:36px}
    .hhg-card.sel{height:74px}.hhg-card.sel .f b{display:-webkit-box}
    .hhg-fin{flex-direction:column;height:auto;width:56px;padding:8px 2px;text-align:center}.hhg-fin b{font-size:12px}.hhg-fin small{font-size:10px}
    body:has(.hh-tray.in) .hhg-strip,body:has(.fam-stage) .hhg-strip,body:has(.hh-teeth) .hhg-strip,body:has(.hh-hp) .hhg-strip,body:has(.kit-veil) .hhg-strip,body:has(.hhb) .hhg-strip,body:has(.hhg-veil) .hhg-strip{transform:translateY(-50%) translateX(-40px)}
  }
  @media (orientation:landscape) and (max-height:599px){.hhg-strip{bottom:calc(env(safe-area-inset-bottom) + 80px)}.hhg-card,.hhg-fin{height:64px}.hhg-card .f i{width:32px;height:32px}.hhg-cosy svg{height:38px}}
  .hhg-fx{position:fixed;inset:0;z-index:9;pointer-events:none;overflow:hidden}
  .hhg-fx>*{position:absolute;left:0;top:0;will-change:transform}
  .hhg-spk{width:16px;height:16px;margin:-8px 0 0 -8px;background:radial-gradient(circle,#fff 0 20%,#ffe27a 36%,transparent 64%);clip-path:polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%)}
  .hhg-spk.big{width:24px;height:24px;margin:-12px 0 0 -12px}
  .hhg-star{width:46px;height:46px;margin:-23px 0 0 -23px;filter:drop-shadow(0 0 6px rgba(255,226,122,.9))}
  .hhg-star svg{width:100%;height:100%}
  .hhg-ring{width:64px;height:64px;margin:-32px 0 0 -32px}
  .hhg-ring::before{content:"";position:absolute;inset:0;border-radius:50%;border:3px dashed #fff;box-shadow:0 0 0 3px rgba(35,30,22,.55),0 0 20px 6px rgba(255,214,110,.6);animation:hhgTg 1.1s ease-in-out infinite alternate}
  @keyframes hhgTg{from{transform:scale(.9)}to{transform:scale(1.1)}}
  .hhg-rip{width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;border:4px solid #fff;box-shadow:0 0 0 2.5px rgba(35,30,22,.5)}
  .hhg-path{inset:0;width:100%;height:100%}
  .hhg-ghost{position:fixed;left:0;top:0;z-index:9;pointer-events:none;opacity:0;will-change:transform,opacity}
  .hhg-ghost:not(.on){display:none}
  .hhg-ghost.coach{z-index:10}
  .hhg-ghost>span{position:absolute;display:block;width:66px;height:79px;filter:drop-shadow(0 0 5px rgba(255,255,255,.95)) drop-shadow(0 3px 2px rgba(35,30,22,.25))}
  .hhg-ghost>span svg{width:100%;height:100%;display:block}
  .hhg-ghost .op{left:-29px;top:-5px}.hhg-ghost .gr{left:-30px;top:-21px}.hhg-ghost .pt{left:-20.5px;top:-5px}
  .hhg-ghost .it{left:-19px;top:-34px;width:38px;height:38px;filter:drop-shadow(0 2px 0 rgba(35,30,22,.35))}
  .hhg-coach{position:fixed;inset:0;z-index:7;background:rgba(35,30,22,.42);opacity:0;transition:opacity .25s;touch-action:none}
  .hhg-coach.in{opacity:1}
  .hhg-veil{position:fixed;inset:0;z-index:15;display:grid;place-items:center;background:rgba(35,30,22,.34);opacity:0;transition:opacity .25s;touch-action:none;-webkit-tap-highlight-color:transparent}
  .hhg-veil.in{opacity:1}
  .hhg-ok{all:unset;box-sizing:border-box;width:72px;height:72px;border-radius:50%;border:2.5px solid ${INK};background:#f4b829;box-shadow:0 4px 0 ${INK};display:grid;place-items:center;cursor:pointer}
  .hhg-ok svg{width:38px;height:38px}.hhg-ok:active,.hhg-room:active{transform:translateY(2px);box-shadow:0 1px 0 ${INK}}
  .hhg-room{all:unset;box-sizing:border-box;height:72px;padding:0 14px;border-radius:36px;border:2.5px solid ${INK};background:#fbf6ea;box-shadow:0 4px 0 ${INK};display:flex;align-items:center;gap:4px;cursor:pointer;animation:hhgIn .4s .3s both}
  .hhg-room svg{width:40px;height:40px}
  .hhg-gbox{position:relative;width:240px;height:260px;display:grid;place-items:center;cursor:pointer;transform:scale(.6);opacity:0;transition:transform .45s cubic-bezier(.2,1.5,.4,1),opacity .2s}
  .hhg-veil.in .hhg-gbox{transform:none;opacity:1}
  .hhg-gbox .box{position:absolute;left:50%;bottom:20px;width:170px;height:150px;margin-left:-85px;animation:hhgWig 1.4s .6s ease-in-out infinite}
  .hhg-gbox .base{position:absolute;left:12px;bottom:0;width:146px;height:110px}
  .hhg-gbox .lid{position:absolute;left:0;top:6px;width:170px;height:78px;transform-origin:20% 90%;transition:transform .5s cubic-bezier(.3,1.3,.5,1),opacity .4s}
  .hhg-gbox .prize{position:absolute;left:50%;top:60px;width:120px;height:120px;margin-left:-60px;transform:translateY(60px) scale(.2);opacity:0;transition:transform .6s .18s cubic-bezier(.2,1.6,.4,1),opacity .2s .18s;z-index:2}
  .hhg-gbox .prize{border-radius:50%;background:#fff;border:3px solid ${INK};box-shadow:0 0 0 6px #fff inset,0 5px 0 rgba(35,30,22,.6);display:grid;place-items:center;box-sizing:border-box}
  .hhg-gbox .prize svg{width:72%;height:72%;transform:rotate(-6deg)}
  .hhg-gbox .rays{position:absolute;left:50%;top:40px;width:300px;height:300px;margin-left:-150px;border-radius:50%;opacity:0;transition:opacity .5s .15s;
    background:repeating-conic-gradient(rgba(255,233,160,.85) 0 10deg,rgba(255,233,160,0) 10deg 24deg);-webkit-mask:radial-gradient(circle,#000 30%,transparent 68%);mask:radial-gradient(circle,#000 30%,transparent 68%)}
  .hhg-gbox .hand{position:absolute;right:-6px;bottom:-34px;width:66px;height:79px;animation:hhgTap 1.4s .8s ease-in-out infinite;transform-origin:30% 0}
  .hhg-gbox .hand svg{width:100%;height:100%;filter:drop-shadow(0 0 5px #fff)}
  .hhg-gbox.open .box{animation:none}
  .hhg-gbox.open .lid{transform:translate(-30px,-120px) rotate(-38deg);opacity:0}
  .hhg-gbox.open .prize{transform:translateY(-40px) scale(1);opacity:1}
  .hhg-gbox.open .rays{opacity:1;animation:hhgSpin 9s linear 3}
  .hhg-gbox.open .hand{display:none}
  .hhg-gbar{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom) + 40px);display:flex;justify-content:center;gap:16px;opacity:0;transition:opacity .3s .2s}
  .hhg-veil.in .hhg-gbar{opacity:1}
  .hhg-gift:not(.opened) .hhg-ok{opacity:.5}
  @media (min-width:700px) and (min-height:600px){.hhg-veil.in .hhg-gbox{transform:scale(1.3)}}
  @keyframes hhgWig{0%,70%,100%{transform:none}76%{transform:rotate(-6deg) translateY(-4px)}84%{transform:rotate(5deg) translateY(-6px)}92%{transform:rotate(-3deg)}}
  @keyframes hhgTap{0%,100%{transform:translate(0,0)}40%{transform:translate(-8px,-14px)}55%{transform:translate(-8px,-10px) scale(.92)}}
  @keyframes hhgSpin{to{transform:rotate(360deg)}}
  @keyframes hhgIn{from{opacity:0;transform:scale(.6)}}
  .hhg-cbox{position:relative;box-sizing:border-box;width:min(420px,calc(100vw - 24px));background:#fbf6ea;border:2.5px solid ${INK};border-radius:28px;box-shadow:0 6px 0 ${INK};padding:14px 14px 16px;
    display:flex;flex-direction:column;align-items:center;gap:6px;transform:translateY(30px) scale(.9);transition:transform .45s cubic-bezier(.2,1.4,.4,1)}
  .hhg-veil.in .hhg-cbox{transform:none}
  .hhg-cbox .fam{display:flex;align-items:flex-end;justify-content:center;gap:4px;min-height:40px;margin-top:-4px}
  .hhg-cbox .who{position:relative;display:block}
  .hhg-cbox .who svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;opacity:0}
  .hhg-cbox .who svg.fr{animation-name:hhgFr;animation-timing-function:steps(1);animation-iteration-count:7}
  .hhg-cbox .who svg.rest{opacity:1;animation-name:hhgRest;animation-timing-function:steps(1);animation-iteration-count:1}
  @keyframes hhgFr{0%{opacity:1}25%,100%{opacity:0}}
  @keyframes hhgRest{0%,100%{opacity:0}}
  .hhg-cbox>b{font:800 28px/1.1 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;color:${INK}}
  .hhg-cbox>p{margin:0;font:700 16px/1.3 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;color:#3d362b;text-align:center}
  .hhg-cbox .br{position:relative;width:100%}
  .hhg-cbox .br .n{position:absolute;right:2px;top:-2px;display:flex;align-items:center;gap:2px;background:#fff;border:2px solid ${INK};border-radius:999px;padding:1px 9px 1px 3px;font:800 16px ui-rounded,system-ui,sans-serif}
  .hhg-cbox .br .n svg{width:24px;height:24px}.hhg-cbox .br .n em{font-style:normal}
  .hhg-garland{position:fixed;left:0;right:0;top:env(safe-area-inset-top);height:0;z-index:4;pointer-events:none}
  .hhg-garland .str{position:absolute;left:0;top:0;overflow:visible}
  .hhg-garland i{position:absolute;width:34px;height:44px;margin-left:-17px;transform-origin:50% 0}
  .hhg-garland i svg{position:relative;width:100%;height:100%;overflow:visible}
  .hhg-garland .glow{position:absolute;left:50%;top:55%;width:70px;height:70px;margin:-35px 0 0 -35px;border-radius:50%;background:radial-gradient(circle,rgba(255,214,120,.75),rgba(255,190,90,0) 68%)}
  .hhg-garland.drop i{animation:hhgDrop .9s var(--d) cubic-bezier(.3,1.5,.5,1) both,hhgSway 2.6s calc(var(--d) + .9s) ease-in-out 3 alternate}
  .hhg-garland.drop .glow{animation:hhgGl 1.3s calc(var(--d) + .5s) ease-in-out 6 alternate}
  @keyframes hhgDrop{from{transform:translateY(-90px);opacity:0}}
  @keyframes hhgSway{from{transform:rotate(-5deg)}to{transform:rotate(5deg)}}
  @keyframes hhgGl{from{opacity:.4}to{opacity:1}}
  @media (prefers-reduced-motion:reduce){.hhg-chip.next::before,.hhg-card.next::before,.hhg-ring::before,.hhg-gbox .box,.hhg-gbox .hand,.hhg-garland.drop i,.hhg-garland.drop .glow,.hhg-cbox .who svg{animation:none!important}}
  `;

  /* ---------- sounds: natural only ---------- */
  function sounds(){
    if (!window.Kit || !Kit.sfx || !Kit.sfx.define) return;
    Kit.sfx.define({
      g_pop:   (L, t) => { L.thump(t, { from: 420, to: 170, vol: .16 }); L.click(t + .005, { freq: 1900, vol: .12 }); },
      g_whoosh:(L, t) => L.whoosh(t, { dur: .55, from: 500, to: 2600, vol: .05 }),
      g_land:  (L, t) => { L.grains(t, { n: 6, spread: .16, freq: 6800, vol: .08 }); L.thump(t, { from: 320, to: 160, vol: .09 }); },
      g_paper: (L, t) => { L.burst(t, { dur: .32, freq: 2800, sweepTo: 1100, q: .6, vol: .07, attack: .04 }); L.burst(t + .26, { dur: .22, freq: 3400, q: .7, vol: .05 }); },
      g_lid:   (L, t) => { L.thump(t, { from: 260, to: 120, vol: .16 }); L.whoosh(t + .04, { dur: .32, from: 500, to: 1900, vol: .07 }); },
      g_cheer: (L, t) => { for (let i = 0; i < 5; i++) L.grains(t + i*.28, { n: 8, spread: .3, freq: 5600 + i*350, vol: .07 }); L.whoosh(t, { dur: .8, from: 300, to: 1200, vol: .04, brown: true }); },
    });
  }

  /* ---------- mount ---------- */
  function mount(house){
    if (mounted || !house || typeof house.tasks !== 'function') return false;
    H = house; mounted = true; G.mounted = true; ST = load();
    const st = el('style'); st.textContent = CSSTEXT; document.head.appendChild(st);
    sounds();
    fx = el('div', 'hhg-fx'); document.body.appendChild(fx);
    ghost = el('div', 'hhg-ghost'); document.body.appendChild(ghost);
    strip = el('div', 'hhg-strip'); strip.setAttribute('role', 'toolbar'); strip.setAttribute('aria-label', 'Today');
    const cosy = el('button', 'hhg-cosy'); cosy.setAttribute('aria-label', 'My cosy home');
    cosy.addEventListener('click', e => { e.stopPropagation(); sfx('h_tap'); cosyPaint(true); const n = ST.cosy && ST.cosy.day === dk(NOW()) ? ST.cosy.n : 0;
      say(n >= 6 ? 'Your home is so cosy!' : n ? 'Your home is getting cosy. Every job lights a window.' : 'Every job you do lights a window.'); });
    strip.appendChild(cosy); strip.appendChild(el('div', 'hhg-cards'));
    document.body.appendChild(strip);
    chip = el('button', 'hhg-chip', '<span class="ring"></span><b></b><span class="chev"><svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 14.5 12 8.5l6 6"/></svg></span>');
    chip.setAttribute('aria-expanded', 'false');
    chip.addEventListener('click', e => { e.stopPropagation(); sfx('h_tap'); bump(chip);
      if (open){ collapse(); return; } expand(); const w = W(), cur = ACT && !ACT.c.done ? ACT.c : w.cards.find(c => !c.done); if (cur) say(voiceOf(cur)); else say('All done! ' + closingLine()); });
    document.body.appendChild(chip);
    // swipe down on the strip folds it away
    { let y0 = null, x0 = 0; strip.addEventListener('pointerdown', e => { y0 = e.clientY; x0 = e.clientX; }); strip.addEventListener('pointercancel', () => { y0 = null; });
      strip.addEventListener('pointermove', e => { if (y0 == null) return; const dy = e.clientY - y0, dx = e.clientX - x0;
        if ((!tabletCol() && dy > 28 && dy > Math.abs(dx)) || (tabletCol() && dx < -28 && -dx > Math.abs(dy))){ y0 = null; sfx('h_tap'); collapse(); } });
      strip.addEventListener('pointerup', () => { y0 = null; }); }
    if (window.HHBook && HHBook.mount) safe(() => HHBook.mount(H), null);
    ensureWin(); status(); paint();
    if (tabletCol() && ST.onboarded) expand();             // on a tablet the narrow column starts open; it folds away the same way
    if (ST.lastStars == null){ ST.lastStars = safe(() => H.stars(), 0); ST.giftAt = Math.floor(ST.lastStars/5)*5; save(); }
    else setTimeout(() => syncStars(prayerSpot()), 900);       // stars earned away (prayer, washing machine) fly in now
    if (W().celebrated && W().finished) lanterns(false);
    H.on('done', onDone);
    H.on('change', () => soon(400));
    H.on('camera', () => { if (DEMO){ stopDemo(); idle(); } if (!ONB) collapse(); });
    document.addEventListener('pointerdown', onUser, true);
    setInterval(() => { if (document.hidden) return; if (ensureWin()){ if (garland){ garland.remove(); garland = null; } ACT = null; stopDemo(); strip.querySelector('.hhg-cards')._k = ''; } status(); }, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden){ ensureWin(); status(); syncStars(center()); } });
    addEventListener('pageshow', e => { if (e.persisted){ ST = load(); ensureWin(); status(); syncStars(prayerSpot()); } });
    addEventListener('resize', () => { if (garland) lanterns(false); });
    if (!ST.onboarded) setTimeout(() => { if (!ST.onboarded && W().cards.some(c => !c.done)) onboard(); else { ST.onboarded = true; save(); } }, 700);
    return true;
  }
  function prayerSpot(){ const c = W() && W().cards.find(x => x.kind === 'prayer'); return c && c.at ? H.toScreen(c.at) : center(); }

  const G = window.HHGuide = { mount, mounted: false,
    // for testing: the strip's cards, a fake finish, and the moments
    _state: () => ST, _cards: () => W() && W().cards, _gift: () => moment(gift), _done: ev => onDone(ev), _status: () => status(), _expand: () => expand(), _collapse: () => collapse(), _open: () => open, _celebrate: () => moment(celebrate), _show: k => { const c = W().cards.find(x => x.k === k) || W().cards.find(x => !x.done); if (c){ ACT = { c, replays: 0 }; show(c, 2, true); } } };
})();
