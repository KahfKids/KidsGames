/* Kahf KidsGames quiz art source: scenes.src.js
   Pictures for "tap the right place" questions, with the places a child can tap. tools/quiz-art/build.js renders
   each picture to js/quiz/img/scene/<name>.webp and writes the tap places to js/quiz/scenes.js.
   x and y are in the picture's own units (w by h). No faces: the body figure has a plain head. */
(function () {
  'use strict';
  var KQ = window.KahfQuiz = window.KahfQuiz || {};
  function S(w, h, body) { return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">' + body + '</svg>'; }
  var L = 'stroke-linejoin="round" stroke-linecap="round"';

  KQ.srcScenes = {
    // a simple world map: seven continents and four oceans
    world: { w: 300, h: 170, scale: 4, svg: S(300, 170,
      '<rect width="300" height="170" fill="#58b4e8"/><g stroke="#2f86bd" stroke-width="1" fill="none" opacity=".5"><path d="M0 42h300M0 85h300M0 128h300M75 0v170M150 0v170M225 0v170"/></g>' +
      '<g stroke="#1f5a3a" stroke-width="1.6" ' + L + '>' +
      '<path d="M22 34q10-16 34-18 22-4 40 4l8 12-10 8-6 14-10 6-4 14-8 4-8-8-6-14-14-6-8-10z" fill="#f2a65a"/>' +
      '<path d="M96 14q10-6 20-2l-2 10-12 4z" fill="#f4f1fa"/>' +
      '<path d="M72 84q12-6 24 4l6 14-4 18-8 20-6 12-6-4-2-20-6-18-2-16z" fill="#7fcf63"/>' +
      '<path d="M130 30q6-8 16-8l8-6 12 6-2 12 6 8-10 4-12 0-8 4-8-4z" fill="#e8708a"/>' +
      '<path d="M128 58q10-6 24-4l16 2 10 12-2 14-8 14-6 18-8 6-8-10-2-18-12-12-6-12z" fill="#f6c453"/>' +
      '<path d="M172 22q14-10 36-10l30 2 22 8 8 14-12 10-10 2-6 12-10 10-8-8-10 4-6 12-8-10-8-2-8-12-12-4 2-12 6-6z" fill="#b57edc"/>' +
      '<path d="M230 104q10-8 24-6l12 8 2 12-12 8-16-2-10-8z" fill="#ff8f6b"/>' +
      '<path d="M30 156q60-10 120-8t120 6l6 16H24z" fill="#f4f1fa" stroke="#8fb8d6"/></g>'),
      spots: { na: { x: 60, y: 42, t: ['North America', 'উত্তর আমেরিকা'] }, sa: { x: 86, y: 108, t: ['South America', 'দক্ষিণ আমেরিকা'] }, eu: { x: 148, y: 34, t: ['Europe', 'ইউরোপ'] },
        af: { x: 152, y: 84, t: ['Africa', 'আফ্রিকা'] }, as: { x: 218, y: 42, t: ['Asia', 'এশিয়া'] }, au: { x: 248, y: 112, t: ['Australia', 'অস্ট্রেলিয়া'] }, an: { x: 150, y: 160, t: ['Antarctica', 'অ্যান্টার্কটিকা'] },
        pacific: { x: 20, y: 98, t: ['Pacific Ocean', 'প্রশান্ত মহাসাগর'] }, atlantic: { x: 112, y: 70, t: ['Atlantic Ocean', 'আটলান্টিক মহাসাগর'] }, indian: { x: 204, y: 108, t: ['Indian Ocean', 'ভারত মহাসাগর'] }, arctic: { x: 150, y: 8, t: ['Arctic Ocean', 'আর্কটিক মহাসাগর'] } } },

    // a child standing, with a plain head (no face)
    body: { w: 160, h: 220, scale: 4, svg: S(160, 220,
      '<rect width="160" height="220" fill="#dff1fb"/><ellipse cx="80" cy="208" rx="46" ry="7" fill="#bcdcee"/>' +
      '<g stroke="#8a5a3a" stroke-width="2.4" ' + L + '>' +
      '<path d="M66 196l-2-58h14l2 34 2-34h14l-2 58h-12l-2-22-2 22z" fill="#3f7fd1"/>' +
      '<path d="M54 208h20v-10H58z M86 198v10h20l-4-10z" fill="#e0605a"/>' +
      '<path d="M58 62h44l6 12 14 44-10 4-12-34v52H60V88l-12 34-10-4 14-44z" fill="#ffb347"/>' +
      '<path d="M38 118l10 4-2 14-10-2z M122 118l-10 4 2 14 10-2z" fill="#f2c9a0"/>' +
      '<path d="M72 50h16v14H72z" fill="#f2c9a0"/><circle cx="80" cy="32" r="22" fill="#f2c9a0"/><path d="M58 30a22 22 0 0 1 44 0c-10-8-34-8-44 0z" fill="#5a3a2a"/></g>'),
      spots: { head: { x: 80, y: 32, t: ['Head', 'মাথা'] }, shoulder: { x: 56, y: 70, t: ['Shoulder', 'কাঁধ'] }, elbow: { x: 114, y: 98, t: ['Elbow', 'কনুই'] }, hand: { x: 40, y: 128, t: ['Hand', 'হাত'] },
        chest: { x: 80, y: 84, t: ['Chest', 'বুক'] }, tummy: { x: 80, y: 122, t: ['Tummy', 'পেট'] }, knee: { x: 70, y: 166, t: ['Knee', 'হাঁটু'] }, foot: { x: 96, y: 204, t: ['Foot', 'পা'] } } },

    // a flowering plant with its roots showing
    plant: { w: 160, h: 220, scale: 4, svg: S(160, 220,
      '<rect width="160" height="150" fill="#cfeaff"/><rect y="150" width="160" height="70" fill="#8a5a2b"/><path d="M0 150q40-8 80 0t80 0v8H0z" fill="#6fbf63"/>' +
      '<g stroke="#5a3a1c" stroke-width="2.4" fill="none" ' + L + '><path d="M80 152v22M80 160l-22 24M80 160l22 24M80 174l-12 26M80 174l12 26M58 184l-12 10M102 184l12 10"/></g>' +
      '<path d="M80 152V58" stroke="#2f8f4e" stroke-width="6" stroke-linecap="round"/>' +
      '<g stroke="#1f7a44" stroke-width="2" ' + L + '><path d="M80 116c-26 2-40-10-44-28 24-2 40 10 44 28z" fill="#5fcf78"/><path d="M80 96c26 2 40-10 44-28-24-2-40 10-44 28z" fill="#5fcf78"/></g>' +
      '<g fill="#ff8fa3" stroke="#c2415f" stroke-width="2"><circle cx="80" cy="22" r="13"/><circle cx="101" cy="34" r="13"/><circle cx="101" cy="56" r="13"/><circle cx="80" cy="66" r="13"/><circle cx="59" cy="56" r="13"/><circle cx="59" cy="34" r="13"/></g><circle cx="80" cy="44" r="12" fill="#ffd95a" stroke="#c98a2b" stroke-width="2"/>'),
      spots: { flower: { x: 80, y: 44, t: ['Flower', 'ফুল'] }, leaf: { x: 112, y: 80, t: ['Leaf', 'পাতা'] }, stem: { x: 80, y: 132, t: ['Stem', 'কাণ্ড'] }, root: { x: 80, y: 186, t: ['Root', 'শিকড়'] } } },

    // a masjid from outside
    masjid: { w: 300, h: 190, scale: 4, svg: S(300, 190,
      '<rect width="300" height="190" fill="#bfe6ff"/><rect y="160" width="300" height="30" fill="#e9d3a4"/>' +
      '<g stroke="#3a2a5c" stroke-width="2.2" ' + L + '><path d="M60 160V96h150v64z" fill="#fff3d6"/><path d="M92 96a43 43 0 0 1 86 0z" fill="#3fae9a"/><path d="M135 53V40" fill="none"/><path d="M138 26a8 8 0 1 0 6 13 7 7 0 0 1-6-13z" fill="#f6c453"/>' +
      '<path d="M232 160V56h22v104z" fill="#fff3d6"/><path d="M226 56h34v-10h-34z" fill="#3fae9a"/><path d="M234 46V34h18v12z" fill="#fff3d6"/><path d="M232 34l11-18 11 18z" fill="#3fae9a"/>' +
      '<path d="M118 160v-30a17 17 0 0 1 34 0v30z" fill="#7a4a2a"/><path d="M76 116h16v22H76zM178 116h16v22h-16z" fill="#9ad0f0"/>' +
      '<path d="M14 160v-26h34v26z" fill="#d9c7a0"/><path d="M22 140h6M34 140h6" fill="none" stroke-width="3"/><path d="M25 146v6M37 146v6" stroke="#5db9ee" stroke-width="2.4" fill="none"/></g>'),
      spots: { dome: { x: 135, y: 76, t: ['Dome', 'গম্বুজ'] }, minaret: { x: 243, y: 90, t: ['Minaret', 'মিনার'] }, door: { x: 135, y: 140, t: ['Door', 'দরজা'] }, crescent: { x: 139, y: 30, t: ['Crescent', 'চাঁদ'] }, wudu: { x: 31, y: 146, t: ['Wudu place', 'অজুখানা'] } } },

    // the places of Hajj, as a simple map with the road between them
    hajj: { w: 300, h: 180, scale: 4, svg: S(300, 180,
      '<rect width="300" height="180" fill="#f1dfb4"/><path d="M0 150q80-20 160-6t140-10v46H0z" fill="#e3c88c"/>' +
      '<path d="M44 120C80 96 96 78 122 66s44 24 66 30 44-28 70-46" fill="none" stroke="#b9853c" stroke-width="4" stroke-dasharray="2 9" stroke-linecap="round"/>' +
      '<g stroke="#3a2a1c" stroke-width="2" ' + L + '>' +
      '<path d="M26 104l18-7 18 7v28l-18 6-18-6z" fill="#23202c"/><path d="M26 112l18 6 18-6v5l-18 6-18-6z" fill="#f6c453" stroke-width="1"/>' +
      '<g fill="#fffaf0"><path d="M100 70q4-18 12-20 8 2 12 20z"/><path d="M120 76q4-18 12-20 8 2 12 20z"/><path d="M110 56q4-16 11-18 7 2 11 18z"/></g>' +
      '<path d="M82 92h8v-22h-8z" fill="#b8b2c4"/><path d="M80 92h12" fill="none" stroke-width="3"/>' +
      '<path d="M170 108q16-10 36 0" fill="none" stroke="#8a6a3a" stroke-width="3"/><g fill="#b8b2c4"><ellipse cx="180" cy="104" rx="5" ry="3.500"/><ellipse cx="192" cy="100" rx="5" ry="3.500"/><ellipse cx="198" cy="108" rx="4" ry="3"/></g>' +
      '<path d="M232 62l26-34 26 34z" fill="#c9a36a"/><path d="M258 28l8 12-6 4-6-4z" fill="#e9d3a4" stroke-width="1"/></g>'),
      spots: { makkah: { x: 44, y: 118, t: ['The Kabah in Makkah', 'মক্কায় কাবা'] }, jamarat: { x: 86, y: 82, t: ['The Jamarat', 'জামারাত'] }, mina: { x: 122, y: 62, t: ['Mina', 'মিনা'] }, muzdalifah: { x: 188, y: 104, t: ['Muzdalifah', 'মুযদালিফা'] }, arafah: { x: 258, y: 48, t: ['Arafah', 'আরাফা'] } } }
  };
})();
