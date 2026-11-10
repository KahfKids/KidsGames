#!/usr/bin/env node
/* Writes games/<id>/index.html for every quiz in js/quiz/catalog.js that has a data.js.
   All quiz pages are the same small page; only the name, description and colour differ.
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
  if (/\.surahs\b/.test(src) || q.daily) extra += '\n  <script src="/KidsGames/js/quiz/surahs.js"></script>';
  if (/B\.place\(|type: 'place'/.test(src) || q.daily) extra += '\n  <script src="/KidsGames/js/quiz/scenes.js"></script>';
  fs.writeFileSync(path.join(dir, 'index.html'), `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
  <title>${esc(q.title.en)}</title>
  <meta name="description" content="${esc(q.desc.en)}" />
  <meta name="theme-color" content="${bg[0]}" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <link rel="manifest" href="/KidsGames/manifest.json" />
  <link rel="apple-touch-icon" href="/KidsGames/icons/icon-192x192.png" />
  <link rel="stylesheet" href="/KidsGames/js/kit/kit.css" />
  <link rel="stylesheet" href="/KidsGames/js/quiz/quiz.css" />
  <style>:root { --qz-bg-top: ${bg[0]}; --qz-bg-bot: ${bg[1]}; }</style>
  <script src="/KidsGames/js/kahf-bridge.js" defer></script>
</head>
<body>
  <div id="qz-load" class="qz-load"><div class="qz-spin"></div></div>
  <script src="/KidsGames/js/kit/core.js"></script>
  <script src="/KidsGames/js/kit/fx.js"></script>
  <script src="/KidsGames/js/kit/audio.js"></script>
  <script src="/KidsGames/js/kit/ui.js"></script>
  <script src="/KidsGames/js/quiz/quiz.js"></script>
  <script src="/KidsGames/js/quiz/sounds.js"></script>
  <script src="/KidsGames/js/quiz/themes.js"></script>
  <script src="/KidsGames/js/quiz/catalog.js"></script>${extra}
  <script src="data.js"></script>
  <script>
    (function () {
      var box = document.getElementById("qz-load");
      if (window.KahfQuiz && KahfQuiz.defs && KahfQuiz.defs["${q.id}"] && window.Kit) { box.remove(); KahfQuiz.run("${q.id}"); }
      else {   // a file did not arrive (the iPhone app is online only): say so and offer to try again
        var bn = /^bn/i.test(navigator.language || "");
        box.innerHTML = "<p>" + (bn ? "লোড হয়নি। ইন্টারনেট সংযোগ দেখো।" : "Could not load. Please check the internet.") + "</p><button class=\\"kit-btn primary\\">" + (bn ? "আবার চেষ্টা করো" : "Try again") + "</button>";
        box.querySelector("button").onclick = function () { location.reload(); };
      }
      if ("serviceWorker" in navigator && location.pathname.indexOf("/KidsGames/") === 0 && !/[?&](debug|nosw)\\b/.test(location.search)) {
        addEventListener("load", function () { navigator.serviceWorker.register("/KidsGames/sw.js").catch(function () {}); });
      }
    })();
  </script>
</body>
</html>
`);
  n++;
});
console.log(n + ' quiz pages written');
