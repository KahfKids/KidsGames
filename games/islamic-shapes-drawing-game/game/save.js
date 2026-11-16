/* Colouring Book: save.js
   Saved progress, unchanged in key and shape since the first version:
   - 'kahf-colouring' (Kit.store): works { <pageId>: { ops, gid, dirty } }, stars { <n>: 1 } and current (Kit.progress),
     tool ('fill' | 'brush' | 'eraser'), colour (index), size (0..2), hinted, brushHinted.
   - 'kahf-colouring-gallery' (Kit.store): items [ { id, page, ops, t } ], at most 30, newest first.
   Writing is held back 250 ms while a child is painting and done at once when the page is hidden (a browser timer,
   not the engine's: the engine's clocks stop while the page is hidden, which is exactly when a save must happen). */
(function () {
  'use strict';
  var K = window.Kit, MD = window.CBModel;
  var store = K.store('kahf-colouring'), gstore = K.store('kahf-colouring-gallery');
  var S = window.CBSave = {
    store: store,
    progress: K.progress(store, MD.PAGES.length),
    works: store.get('works', {}),
    gallery: gstore.get('items', []),
    MAX: 30
  };
  var timer = null;
  S.persist = function (def, cur) {
    if (def && cur) S.works[def.id] = { ops: MD.compact(cur.ops), gid: cur.gid, dirty: cur.dirty };
    clearTimeout(timer);
    timer = setTimeout(S.flush, 250);
  };
  S.flush = function () { clearTimeout(timer); store.set('works', S.works); };
  S.storeGallery = function () {
    for (var tries = 0; tries < 6; tries++) {
      try { localStorage.setItem('kahf-colouring-gallery', JSON.stringify({ items: S.gallery })); return true; } catch (e) { if (S.gallery.length > 1) S.gallery.pop(); else return false; }
    }
    return false;
  };
  document.addEventListener('visibilitychange', function () { if (document.hidden) S.flush(); });
  addEventListener('pagehide', S.flush);
})();
