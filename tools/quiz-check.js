#!/usr/bin/env node
/* Checks every quiz bank: ids, bands, both languages, pictures that exist, scenes and (for the Quran and
   Living Islam shelves) a source reference on every question. Exits with an error if anything is wrong.
     node tools/quiz-check.js [quiz-id] */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
global.window = global; global.document = { currentScript: null }; global.Kit = {};
global.location = { search: '' };
['quiz.js', 'themes.js', 'catalog.js'].forEach(f => require(path.join(ROOT, 'js/quiz', f)));
if (fs.existsSync(path.join(ROOT, 'js/quiz/scenes.js'))) require(path.join(ROOT, 'js/quiz/scenes.js'));
const K = global.KahfQuiz, keys = require(path.join(ROOT, 'js/quiz/img/keys.json'));
let bad = 0, total = 0;
K.catalog.forEach(q => {
  if (process.argv[2] && process.argv[2] !== q.id) return;
  const f = path.join(ROOT, 'games', q.id, 'data.js');
  if (!fs.existsSync(f) || q.daily) return;
  require(f);
  const def = K.defs[q.id], bank = def.bank || [];
  const problems = K.check(bank, q.shelf !== 3, keys);
  (q.cards || []).forEach(c => { if (keys.indexOf(c.p) < 0) problems.push('card ' + c.id + ': no picture ' + c.p); });
  const per = [1, 2, 3].map(b => bank.filter(x => x.band === b || (x.band.indexOf && x.band.indexOf(b) >= 0)).length);
  const types = {}; bank.forEach(x => { types[x.type] = (types[x.type] || 0) + 1; });
  if (def.gen) [1, 2, 3].forEach(b => { if ((q.bands || [1, 2, 3]).indexOf(b) < 0) return; for (let i = 0; i < 40; i++) { const g = def.gen(b, 10, { stop: 1 + i % q.stops, boss: i % 5 === 4 }); g.forEach((x, k) => { x.id = 'g' + i + '-' + k; x.band = b; }); K.check(g, false, keys).forEach(p => problems.push('gen b' + b + ' ' + p)); } });
  total += bank.length;
  console.log((problems.length ? 'FAIL ' : 'ok   ') + q.id.padEnd(24) + String(bank.length).padStart(4) + ' questions  bands ' + per.join('/') + '  ' + Object.keys(types).map(t => t + ':' + types[t]).join(' ') + (def.gen ? '  +generated' : ''));
  problems.slice(0, 12).forEach(p => console.log('     ' + p));
  bad += problems.length;
});
console.log(total + ' written questions' + (bad ? ', ' + bad + ' problems' : ', no problems'));
process.exit(bad ? 1 : 0);
