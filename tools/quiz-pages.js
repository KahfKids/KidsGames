#!/usr/bin/env node
/* Writes games/<id>/index.html for every quiz in js/quiz/catalog.js that has a data.js.
   All quiz pages are the same small page on the Phaser quiz engine (js/quiz/game.js); only the name, description and
   colours differ. The service worker is registered by the engine (game.js), as every Phaser game does.
     node tools/quiz-pages.js */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
global.window = {};
require(path.join(ROOT, 'js/quiz/themes.js')); require(path.join(ROOT, 'js/quiz/catalog.js'));
const K = window.KahfQuiz;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
let n = 0;
K.catalog.forEach(q => {
  const dir = path.join(ROOT, 'games', q.id);
  if (!fs.existsSync(path.join(dir, 'data.js'))) return;
  const bg = K.theme(q.theme).bg;
  const src = fs.readFileSync(path.join(dir, 'data.js'), 'utf8');
  let extra = '';
  if (/\.surahs\b/.test(src) || q.daily) extra += '\n<script src="/KidsGames/js/quiz/surahs.js" defer></script>';
  if (/B\.place\(|type: 'place'/.test(src) || q.daily) extra += '\n<script src="/KidsGames/js/quiz/scenes.js" defer></script>';
  const acc = K.theme(q.theme).palette['--qz-accent'];
  fs.writeFileSync(path.join(dir, 'index.html'), `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>${esc(q.title.en)}</title>
<meta name="description" content="${esc(q.desc.en)}">
<meta name="theme-color" content="${bg[0]}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="/KidsGames/manifest.json">
<link rel="icon" href="/KidsGames/icons/icon-192x192.png">
<link rel="apple-touch-icon" href="/KidsGames/icons/icon-192x192.png">
<style>html,body{margin:0;height:100%;background:${bg[0]};overflow:hidden;overscroll-behavior:none;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;touch-action:none}
#kit-load{position:fixed;inset:0;z-index:10;display:flex;flex-direction:column;gap:18px;align-items:center;justify-content:center;background:linear-gradient(${bg[0]},${bg[1]});--p:0;color:#fffaf0;font:800 18px system-ui,sans-serif;text-align:center;padding:24px}
#kit-load svg{width:min(34vw,34vh,170px);height:auto}
#kit-load .bar{stroke-dasharray:100;stroke-dashoffset:calc(100 * (1 - var(--p)))}
#kit-load .st{animation:qz-turn 2.4s ease-in-out infinite;transform-origin:50px 50px}
@keyframes qz-turn{50%{transform:rotate(18deg) scale(1.06)}}
#kit-load button{min-height:52px;padding:0 24px;border-radius:26px;border:0;font:900 19px system-ui,sans-serif;background:${acc};color:#2a1606}</style>
</head>
<body>
<!-- ${esc(q.title.en)}: a quiz on the shared Phaser 4 quiz engine (js/quiz/game.js), started only by Kit.play.
     Made by tools/quiz-pages.js from js/quiz/catalog.js. Do not edit by hand. -->
<!-- The loading picture, drawn by the page at once: a star in a ring that fills (js/kit/load.js moves --p). No words. -->
<div id="kit-load"><svg viewBox="0 0 100 100" aria-hidden="true">
<circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="5"/>
<circle class="bar" cx="50" cy="50" r="44" fill="none" stroke="${acc}" stroke-width="5" stroke-linecap="round" pathLength="100" transform="rotate(-90 50 50)"/>
<path class="st" d="M50 26l6.5 13.4 14.7 2.1-10.6 10.4 2.5 14.6L50 59.6l-13.1 6.9 2.5-14.6-10.6-10.4 14.7-2.1z" fill="${acc}"/>
</svg></div>
<script src="/KidsGames/js/kit/load.js"></script>
<script src="/KidsGames/js/kahf-bridge.js" defer></script>
<script src="/KidsGames/js/vendor/phaser-4.2.1.min.js" defer></script>
<script src="/KidsGames/js/kit/core.js" defer></script>
<script src="/KidsGames/js/kit/sound.js" defer></script>
<script src="/KidsGames/js/kit/play.js" defer></script>
<script src="/KidsGames/js/quiz/quiz.js" defer></script>
<script src="/KidsGames/js/quiz/themes.js" defer></script>
<script src="/KidsGames/js/quiz/catalog.js" defer></script>${extra}
<script src="data.js" defer></script>
<script src="/KidsGames/js/quiz/game.js" defer></script>
<script>
  addEventListener("DOMContentLoaded", function () {
    if (window.Phaser && window.KahfQuiz && KahfQuiz.play && KahfQuiz.defs && KahfQuiz.defs["${q.id}"] && window.Kit && Kit.play) { KahfQuiz.run("${q.id}"); return; }
    // a file did not arrive (the iPhone app is online only): say so and offer to try again
    var box = document.getElementById("kit-load"), bn = /^bn/i.test(navigator.language || "");
    box.innerHTML = "<p>" + (bn ? "লোড হয়নি। ইন্টারনেট সংযোগ দেখো।" : "Could not load. Please check the internet.") + "</p><button>" + (bn ? "আবার চেষ্টা করো" : "Try again") + "</button>";
    box.querySelector("button").onclick = function () { location.reload(); };
  });
</script>
</body>
</html>
`);
  n++;
});

// ---------- the catalog page keeps its design; only its tiles are written here ----------
const ready = id => fs.existsSync(path.join(ROOT, 'games', id, 'data.js'));
const tile = (href, img, name) => `        <a href="./games/${href}/index.html" class="game-link">
          <div class="game-card">
            <img src="./${img}" alt="${esc(name)}" class="game-thumbnail" loading="lazy" />
            <div class="game-title">${esc(name)}</div>
          </div>
        </a>
`;
let tiles = '';
K.catalog.forEach(q => { if (ready(q.id)) tiles += tile(q.id, 'quiz-thumbs/' + q.id + '.webp', q.title.en); });
const cp = path.join(ROOT, 'quizzes.html'), page = fs.readFileSync(cp, 'utf8');
const A = '<!-- quiz tiles: written by tools/quiz-pages.js from js/quiz/catalog.js -->\n', Z = '        <!-- /quiz tiles -->';
fs.writeFileSync(cp, page.slice(0, page.indexOf(A) + A.length) + tiles + page.slice(page.indexOf(Z)));
console.log(n + ' quiz pages written; catalog page tiles updated');
