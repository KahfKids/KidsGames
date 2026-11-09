/* Solar System: levels.js
   15 levels in 3 worlds. Each level is a short list of rounds:
     { t: 'find', id }        find this planet (picture + name shown, spoken when the device has a voice)
     { t: 'big',  ids: [..] } which is bigger? (the choices glow; tap one)
     { t: 'near', ids: [..] } which is closest to the Sun?
   frame: how much of the system the camera shows (units). speed: orbit speed while answering. */
(function () {
  'use strict';
  function f(id) { return { t: 'find', id: id }; }
  function big() { return { t: 'big', ids: [].slice.call(arguments) }; }
  function near() { return { t: 'near', ids: [].slice.call(arguments) }; }

  var WORLDS = [
    { name: 'Near the Sun', color: '#ffb35c', frame: 4.5, speed: 0.3 },
    { name: 'Giant Planets', color: '#8fd0ff', frame: 10.9, speed: 0.4 },
    { name: 'The Whole Family', color: '#c9a8ff', frame: 10.9, speed: 0.5 }
  ];
  var L = [
    // World 1: the inner planets, big and close, extra hearts
    { w: 0, hearts: 5, rounds: [f('earth'), f('sun'), f('mars')] },
    { w: 0, hearts: 5, rounds: [f('venus'), f('mercury'), f('earth'), f('mars')] },
    { w: 0, hearts: 4, rounds: [f('moon'), big('earth', 'mars'), f('venus'), f('mercury')] },
    { w: 0, hearts: 4, rounds: [near('venus', 'mars'), f('earth'), big('mercury', 'venus'), near('mercury', 'earth'), f('moon')] },
    { w: 0, hearts: 4, rounds: [f('mars'), near('earth', 'mars', 'venus'), big('earth', 'mercury'), f('venus'), f('mercury'), near('mercury', 'mars')] },
    // World 2: the giant planets
    { w: 1, hearts: 4, rounds: [f('saturn'), f('jupiter'), f('neptune')] },
    { w: 1, hearts: 4, rounds: [f('uranus'), f('jupiter'), f('saturn'), f('neptune')] },
    { w: 1, hearts: 3, rounds: [big('jupiter', 'neptune'), f('saturn'), near('jupiter', 'uranus'), f('uranus')] },
    { w: 1, hearts: 3, rounds: [f('neptune'), big('saturn', 'uranus'), near('saturn', 'neptune'), f('jupiter'), big('jupiter', 'saturn')] },
    { w: 1, hearts: 3, rounds: [f('uranus'), near('neptune', 'uranus', 'saturn'), f('saturn'), big('neptune', 'jupiter', 'saturn'), f('neptune'), f('jupiter')] },
    // World 3: everyone together
    { w: 2, hearts: 3, rounds: [f('earth'), f('jupiter'), f('mercury'), f('saturn')] },
    { w: 2, hearts: 3, rounds: [f('mars'), f('neptune'), f('venus'), big('earth', 'jupiter'), near('earth', 'saturn')] },
    { w: 2, hearts: 3, rounds: [big('mars', 'uranus', 'venus'), f('moon'), near('mars', 'jupiter', 'mercury'), f('uranus'), f('sun')] },
    { w: 2, hearts: 3, rounds: [f('venus'), near('uranus', 'earth', 'neptune'), f('mars'), big('mercury', 'saturn', 'earth'), f('jupiter'), f('neptune')] },
    { w: 2, hearts: 3, speed: 0.65, rounds: [f('saturn'), big('venus', 'neptune', 'mars'), f('mercury'), near('jupiter', 'venus', 'neptune'), f('earth'), f('uranus'), f('moon')] }
  ];
  window.SolarLevels = {
    worlds: WORLDS, list: L,
    worldOf: function (n) { return L[n - 1].w; },
    speed: function (n) { return L[n - 1].speed || WORLDS[L[n - 1].w].speed; }
  };
})();
