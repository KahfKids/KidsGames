/* Kahf KidsGames quiz engine: themes.js
   The look of a quiz's journey map. A quiz names its theme in catalog.js. The pictures themselves (stops, the
   scene at the foot of the path, star and cloud tiles, sun and moon) are WebP images in js/quiz/img/, drawn
   from tools/quiz-art/themes.src.js by tools/quiz-art/build.js. Keep the two files' theme names the same. */
(function () {
  'use strict';
  var KQ = window.KahfQuiz = window.KahfQuiz || {};
  // bg: top and bottom colours of the backdrop. sky: tile image. orb: 'sun', 'moon' (grows with progress) or none.
  var THEMES = {
    night:    { bg: ['#14103a', '#33206a'], sky: 'stars', orb: 'moon', accent: ['#f6c453', '#e9973a'] },
    desert:   { bg: ['#3d2152', '#b4603a'], sky: 'stars', accent: ['#ffcf6b', '#e9973a'], path: 'rgba(255,225,170,.6)' },
    stars:    { bg: ['#081238', '#1f3f86'], sky: 'stars', accent: ['#ffd978', '#f0a93a'] },
    garden:   { bg: ['#12492c', '#2f8a4c'], sky: 'clouds', orb: 'sun', accent: ['#ffd95a', '#f08a3a'], path: 'rgba(255,255,255,.5)' },
    masjid:   { bg: ['#0c3f4f', '#1c7a6c'], sky: 'stars', accent: ['#ffe08a', '#e9a53a'], path: 'rgba(255,255,255,.5)' },
    street:   { bg: ['#243f7c', '#4f79c9'], sky: 'clouds', orb: 'sun', accent: ['#ffd95a', '#f08a3a'], path: 'rgba(255,255,255,.55)' },
    sea:      { bg: ['#0a4470', '#1489b8'], sky: 'clouds', orb: 'sun', accent: ['#ffe08a', '#f08a3a'], path: 'rgba(255,255,255,.55)' },
    space:    { bg: ['#0c0a2c', '#2c1660'], sky: 'stars', accent: ['#8fd0ff', '#5f9fe0'], path: 'rgba(190,220,255,.5)' },
    road:     { bg: ['#3a2416', '#94592c'], sky: 'clouds', accent: ['#ffd27a', '#e9973a'], path: 'rgba(255,230,180,.55)' },
    library:  { bg: ['#2c1a10', '#6a3c22'], sky: 'stars', accent: ['#ffd27a', '#e9973a'], path: 'rgba(255,230,180,.55)' },
    workshop: { bg: ['#1c2836', '#3f5a70'], accent: ['#ffc24a', '#f08a3a'], path: 'rgba(255,255,255,.5)' },
    tree:     { bg: ['#173f30', '#3b8a5c'], sky: 'clouds', orb: 'sun', accent: ['#ffe08a', '#f0a93a'], path: 'rgba(255,255,255,.5)' }
  };
  KQ.theme = function (name) {
    if (!THEMES[name]) name = 'night';
    var t = THEMES[name];
    return { name: name, sky: t.sky, orb: t.orb, path: t.path, bg: t.bg,
      palette: { '--qz-bg-top': t.bg[0], '--qz-bg-bot': t.bg[1], '--qz-accent': t.accent[0], '--qz-accent-2': t.accent[1] } };
  };
  KQ.themes = THEMES;
})();
