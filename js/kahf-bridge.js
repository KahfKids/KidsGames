/**
 * Kahf activity bridge, protocol v1.
 *
 * Reports what a child does on a page to the Kahf Kids app. The app decides
 * what earns credit; this script only reports. Any page can include it; it
 * does nothing in a normal browser tab.
 *
 *   <script src="https://kahfkids.github.io/KidsGames/js/kahf-bridge.js" defer></script>
 *
 * Reported on its own (no page code needed):
 *   media_done  an audio or video played to the end (or 90%)
 *   open        the page loaded (sent once)
 *   active      30 seconds of real use: the page is visible and the child
 *               tapped, typed or scrolled in the last 15 s, or media is playing
 *
 * Optional one-liners for more precise credit:
 *   KahfBridge.answer()     the child answered a question (call on taps, not timeouts)
 *   KahfBridge.complete()   the child finished a round, level, story or lesson
 *   KahfBridge.item(id)     the child opened one item (a dua, a name, a card)
 *
 * Message: JSON string { type: 'kahfActivity', v: 1, event, page?, id?, seconds? }.
 * `page` is the folder of a game or quiz (games/<page>/), so the app knows
 * which one is open even inside a web iframe; other pages leave it out.
 * No personal data. The Kahf Kids app keeps an identical copy of this file
 * (expo-app/constants/kahf-bridge-script.ts) and injects it on native.
 */
(function () {
  if (window.KahfBridge) return;

  var ACTIVE_WINDOW_MS = 15000;
  var ACTIVE_REPORT_SECONDS = 30;
  var lastInteraction = 0;
  var activeSeconds = 0;
  var playing = 0;
  var page = (function () {
    try {
      var match = /\/games\/([^\/]+)\//.exec(window.location.pathname);
      return match ? decodeURIComponent(match[1]).slice(0, 64) : null;
    } catch (e) {
      return null;
    }
  })();

  function post(event, extra) {
    var message = { type: 'kahfActivity', v: 1, event: event };
    if (page) message.page = page;
    if (extra) {
      for (var key in extra) message[key] = extra[key];
    }
    var data = JSON.stringify(message);
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(data);
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(data, '*');
      }
    } catch (e) {
      // The bridge must never break a page.
    }
  }

  // Media played to the end, including new Audio() objects that are never in the DOM.
  function watchMedia(media) {
    if (!media || media.__kahfWatched) return;
    media.__kahfWatched = true;
    var done = false;
    var isPlaying = false;
    function finish() {
      if (done) return;
      done = true;
      post('media_done');
    }
    function stop() {
      if (isPlaying) playing = Math.max(0, playing - 1);
      isPlaying = false;
    }
    media.addEventListener('playing', function () {
      if (media.currentTime < 1) done = false;
      if (!isPlaying) playing += 1;
      isPlaying = true;
    });
    media.addEventListener('pause', stop);
    media.addEventListener('ended', function () {
      stop();
      finish();
    });
    media.addEventListener('timeupdate', function () {
      var d = media.duration;
      if (d && isFinite(d) && media.currentTime / d >= 0.9) finish();
    });
  }

  try {
    var proto = window.HTMLMediaElement && window.HTMLMediaElement.prototype;
    if (proto && proto.play && !proto.play.__kahf) {
      var play = proto.play;
      proto.play = function () {
        watchMedia(this);
        return play.apply(this, arguments);
      };
      proto.play.__kahf = true;
    }
    document.addEventListener('play', function (e) { watchMedia(e.target); }, true);
  } catch (e) {
    // Media reporting is best effort.
  }

  // Active time: visible and recently used.
  function touch() { lastInteraction = Date.now(); }
  ['pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll'].forEach(function (name) {
    window.addEventListener(name, touch, { capture: true, passive: true });
  });
  setInterval(function () {
    if (document.visibilityState === 'hidden') return;
    if (Date.now() - lastInteraction > ACTIVE_WINDOW_MS && playing === 0) return;
    activeSeconds += 1;
    if (activeSeconds >= ACTIVE_REPORT_SECONDS) {
      activeSeconds = 0;
      post('active', { seconds: ACTIVE_REPORT_SECONDS });
    }
  }, 1000);

  post('open');

  window.KahfBridge = {
    v: 1,
    answer: function () { touch(); post('answer'); },
    complete: function () { post('complete'); },
    item: function (id) {
      touch();
      post('item', id == null ? undefined : { id: String(id).slice(0, 64) });
    },
  };
})();
