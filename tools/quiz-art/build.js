#!/usr/bin/env node
/* Renders the quiz art from its SVG source to WebP images, so the quiz pages load small pictures instead of
   drawing vectors (the app WebView on low-end Android phones handles images far better).

     node tools/quiz-art/build.js            render what changed
     node tools/quiz-art/build.js --all      render everything again

   Needs Google Chrome (to draw the SVG exactly) and ImageMagick's `magick` (to cut and save WebP).
   Source:  tools/quiz-art/pics.src.js, themes.src.js, scenes.src.js
   Output:  js/quiz/img/p/<key>.webp        answer pictures, 256 x 256
            js/quiz/img/stop/<theme>-<state>[-b].webp   map stops, 192 x 228
            js/quiz/img/decor/<theme>.webp  the picture at the foot of a map, 1520 x 400
            js/quiz/img/sky/*.webp          star and cloud tiles, sun, moon phases
            js/quiz/img/scene/<name>.webp   pictures for "tap the place" questions
            js/quiz/img/keys.json           every picture key (used by the bank checker) */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../..'), OUT = path.join(ROOT, 'js/quiz/img');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ALL = process.argv.includes('--all');

global.window = {};
require('./pics.src.js'); require('./themes.src.js');
if (fs.existsSync(path.join(__dirname, 'scenes.src.js'))) require('./scenes.src.js');
const K = window.KahfQuiz;

const items = [];   // { file, svg, w, h, q }
function add(file, svg, w, h, q) { items.push({ file, svg, w, h, q: q || 88 }); }

// answer pictures
const keys = [];
for (const k in K.pics) { add('p/' + k + '.webp', K.pics[k], 256, 256); keys.push(k); }
for (let n = 1; n <= 12; n++) { add('p/dots-' + n + '.webp', K.dots(n), 256, 256); keys.push('dots-' + n); }
for (const k of K.manyKeys || ['apple', 'star', 'fish', 'flower', 'ball', 'coin', 'dates', 'bee', 'leaf', 'egg', 'book', 'bird'])
  for (let n = 1; n <= 10; n++) { add('p/many-' + k + '-' + n + '.webp', K.many(k, n), 256, 256); keys.push('many-' + k + '-' + n); }
for (let h = 1; h <= 12; h++) for (let m = 0; m < 60; m += 5) { add('p/clock-' + h + '-' + m + '.webp', K.clockPic(h, m), 256, 256); keys.push('clock-' + h + '-' + m); }

// map art, one set per theme
for (const name in K.srcThemes) {
  const t = K.srcThemes[name];
  for (const st of ['lit', 'open', 'locked']) for (const boss of [false, true])
    add('stop/' + name + '-' + st + (boss ? '-b' : '') + '.webp', K.srcStop[t.stop](st, boss, t.c), 192, 228);
  add('decor/' + name + '.webp', t.decor(760, 200), 1520, 400, 90);
}
// backdrop pieces
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
(function () {
  let r = rnd(7), s = '';
  for (let i = 0; i < 46; i++) { const k = r(); s += '<circle cx="' + (r() * 512).toFixed(1) + '" cy="' + (r() * 512).toFixed(1) + '" r="' + (1.200 + k * 2.600).toFixed(1) + '" fill="#fff" opacity="' + (0.3 + k * 0.6).toFixed(2) + '"/>'; }
  add('sky/stars.webp', '<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">' + s + '</svg>', 512, 512, 90);
  r = rnd(11); s = '';
  for (let i = 0; i < 4; i++) s += '<g transform="translate(' + (120 + (i % 2) * 330 + r() * 60).toFixed(0) + ' ' + (110 + Math.floor(i / 2) * 320 + r() * 80).toFixed(0) + ') scale(' + (1.300 + r() * 1.100).toFixed(2) + ')" fill="#fff" opacity=".14"><ellipse rx="46" ry="16"/><ellipse cx="-18" cy="-12" rx="22" ry="16"/><ellipse cx="12" cy="-16" rx="26" ry="20"/></g>';
  add('sky/clouds.webp', '<svg viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg">' + s + '</svg>', 640, 640, 90);
  add('sky/sun.webp', '<svg viewBox="-80 -80 160 160" xmlns="http://www.w3.org/2000/svg"><circle r="74" fill="#ffe08a" opacity=".16"/><circle r="58" fill="#ffe08a" opacity=".14"/><circle r="42" fill="#ffd95a"/></svg>', 192, 192);
  for (let d = 0; d < 30; d++) add('sky/moon-' + d + '.webp', '<svg viewBox="-80 -80 160 160" xmlns="http://www.w3.org/2000/svg">' + K.srcMoon(0, 0, 40, d) + '</svg>', 192, 192);
})();
// scenes
for (const name in K.srcScenes || {}) { const sc = K.srcScenes[name]; add('scene/' + name + '.webp', sc.svg, sc.w * sc.scale, sc.h * sc.scale, 90); }

// ---------- only what changed ----------
const manPath = path.join(OUT, 'manifest.json');
const old = !ALL && fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : {};
const man = {};
const todo = items.filter(it => {
  const h = crypto.createHash('sha1').update(it.svg + '|' + it.w + 'x' + it.h + '|' + it.q).digest('hex').slice(0, 12);
  man[it.file] = h;
  return old[it.file] !== h || !fs.existsSync(path.join(OUT, it.file));
});
for (const f in old) if (!man[f]) { try { fs.unlinkSync(path.join(OUT, f)); } catch (e) {} }
console.log(items.length + ' images, ' + todo.length + ' to render');

// ---------- render sheets with Chrome, cut with ImageMagick ----------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'quizart-'));
const groups = {};
todo.forEach(it => { (groups[it.w + 'x' + it.h] = groups[it.w + 'x' + it.h] || []).push(it); });
let sheetN = 0;
for (const g in groups) {
  const list = groups[g], w = list[0].w, h = list[0].h;
  const cols = Math.max(1, Math.floor(2560 / w)), rows = Math.max(1, Math.floor(2304 / h)), per = cols * rows;
  for (let i = 0; i < list.length; i += per) {
    const part = list.slice(i, i + per), sw = cols * w, sh = Math.ceil(part.length / cols) * h;
    const html = '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}div{position:absolute;width:' + w + 'px;height:' + h + 'px;overflow:hidden}svg{display:block;width:' + w + 'px;height:' + h + 'px}</style>' +
      part.map((it, k) => '<div style="left:' + (k % cols) * w + 'px;top:' + Math.floor(k / cols) * h + 'px">' + it.svg.replace('<svg ', '<svg preserveAspectRatio="' + (it.file.indexOf('decor/') === 0 ? 'none' : 'xMidYMid meet') + '" ').replace(/preserveAspectRatio="none" preserveAspectRatio="none"/, 'preserveAspectRatio="none"') + '</div>').join('');
    const hp = path.join(tmp, 's' + (++sheetN) + '.html'), pp = path.join(tmp, 's' + sheetN + '.png');
    fs.writeFileSync(hp, html);
    execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--default-background-color=00000000',
      '--window-size=' + sw + ',' + sh, '--screenshot=' + pp, 'file://' + hp], { stdio: 'ignore' });
    part.forEach((it, k) => {
      const out = path.join(OUT, it.file); fs.mkdirSync(path.dirname(out), { recursive: true });
      execFileSync('magick', [pp, '-crop', w + 'x' + h + '+' + (k % cols) * w + '+' + Math.floor(k / cols) * h, '+repage',
        '-quality', String(it.q), '-define', 'webp:method=6', '-define', 'webp:alpha-quality=100', out]);
    });
    process.stdout.write('.');
  }
}
fs.writeFileSync(manPath, JSON.stringify(man));
fs.writeFileSync(path.join(OUT, 'keys.json'), JSON.stringify(keys));
if (K.srcScenes) {   // the tap places for each scene, for the pages
  const sc = {};
  for (const name in K.srcScenes) { const s = K.srcScenes[name]; sc[name] = { w: s.w, h: s.h, spots: {} }; for (const id in s.spots) sc[name].spots[id] = { x: s.spots[id].x, y: s.spots[id].y, t: { en: s.spots[id].t[0], bn: s.spots[id].t[1] } }; }
  fs.writeFileSync(path.join(ROOT, 'js/quiz/scenes.js'), '/* Kahf KidsGames quiz engine: scenes.js\n   Made by tools/quiz-art/build.js from tools/quiz-art/scenes.src.js. Do not edit by hand.\n   The tap places for each "tap the right place" picture (js/quiz/img/scene/<name>.webp). */\n(function () {\n  var KQ = window.KahfQuiz = window.KahfQuiz || {};\n  KQ.scenes = ' + JSON.stringify(sc) + ';\n})();\n');
}
fs.rmSync(tmp, { recursive: true, force: true });
let bytes = 0; items.forEach(it => { bytes += fs.statSync(path.join(OUT, it.file)).size; });
console.log('\ndone: ' + items.length + ' images, ' + (bytes / 1024).toFixed(0) + ' KB in js/quiz/img');
