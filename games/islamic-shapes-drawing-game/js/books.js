/* Colouring Book: books.js
   The four books and the page registry. Each page file calls CBBooks.page(bookId, id, name, build).
   build(R, G) draws the line art as closed regions in paint order (later regions sit on top):
     R.add(shape, { rule: 'evenodd' })  -> a colourable region
     R.detail(shape, { fill, w })       -> an extra line (or ink dot) that belongs to the last region */
(function () {
  'use strict';
  var B = window.CBBooks = {
    books: [
      { id: 'ramadan', name: 'Ramadan', sky: ['#171246', '#3b1d5e'], glow: '#f6c453', mote: '#ffd98a' },
      { id: 'nature', name: 'Nature', sky: ['#0d3438', '#1d5a46'], glow: '#9be38a', mote: '#d9ff9e' },
      { id: 'things', name: 'Things', sky: ['#14295a', '#36549e'], glow: '#7fd0ff', mote: '#bfe8ff' },
      { id: 'patterns', name: 'Patterns', sky: ['#28124c', '#5a1d58'], glow: '#f2a65a', mote: '#ffc48a' }
    ],
    pages: [],
    page: function (book, id, name, build) { B.pages.push({ book: book, id: id, name: name, build: build }); }
  };
  // Pages are listed book by book, in the order the books appear above.
  B.sort = function () {
    var order = B.books.map(function (b) { return b.id; });
    B.pages.sort(function (a, b) { return order.indexOf(a.book) - order.indexOf(b.book) || a._i - b._i; });
  };
  var n = 0, add = B.page;
  B.page = function (book, id, name, build) { add(book, id, name, build); B.pages[B.pages.length - 1]._i = n++; };
})();
