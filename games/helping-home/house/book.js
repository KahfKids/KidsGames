/* Helping Home: the sticker book (window.HHBook) and the shared hand-inked icons (HHBook.icon).
   A book the child opens from a big HUD button (a red book with a gold star sticker, bottom right).
   Pages, each a picture tab at the bottom:
     Me        the "days helping" branch (a leaf for every day the child helped; a missed day is just a bare twig,
               nothing is ever lost) and the gift stickers from the guide's gift boxes
     Chores    one sticker per chore (HHDays.CHORES + teeth), 3 levels from HHDays.list() (3 / 10 / 30 times)
     Prayers   the prayer garden: a flower for each prayer of the last 7 days (HHDays.prayerGarden(7)), nothing wilts
     Family    hearts from helping Abu, Ummi, the sister and the toddler (the guide counts them)
     Garden    the crops grown (HHDays.garden().harvested)
     Special   Jumu'ah, Ramadan, Eid... unlocked by helping on that day
   Locked stickers are soft dashed outlines so a child can see what to aim for. Everything is picture-first, a tap on
   a sticker says its name, and every control answers at once. CSS transforms and opacity only.
   Reads: localStorage hh.guide (written by house/guide.js), HHDays (house/days.js). Writes: hh.book (what was seen).
   API: HHBook.mount(HOUSE)  HHBook.open(page)  HHBook.close()  HHBook.icon(name[, opts])  HHBook.ICONS  HHBook.refresh() */
(function () {
  'use strict';
  const INK = '#231e16';
  const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const safe = (fn, d) => { try { const r = fn(); return r == null ? d : r; } catch (e) { return d; } };

  /* ================= hand-inked icons, 24-unit grid, ink outline, flat fills ================= */
  const I = {
    // chores
    bed: '<rect x="3" y="12.5" width="18" height="5" rx="1" fill="#76a0e2"/><path d="M3 20V7.5M21 20v-7.5"/><rect x="4.5" y="9.5" width="5.5" height="3" rx="1.3" fill="#fbf6ea"/><path d="M10.5 12.5c3-1.6 6.5-1.6 10.5 0" fill="#9fc0ee"/>',
    pyjamas: '<path d="M8.5 4 4 7l2 4 2-1v10h8V10l2 1 2-4-4.5-3c-.6 1.4-2 2.2-3.5 2.2S9.1 5.4 8.5 4z" fill="#b9a6e6"/><path d="M8.6 13.2h6.8M8.6 16.6h6.8" stroke="#fbf6ea" stroke-width="1.6"/>',
    bag: '<rect x="5" y="7" width="14" height="13" rx="3" fill="#e8574a"/><path d="M9 7V5.5a3 3 0 0 1 6 0V7"/><rect x="8" y="12" width="8" height="4.2" rx="1" fill="#f2c230"/>',
    plate: '<circle cx="13" cy="12.5" r="7" fill="#fbf6ea"/><circle cx="13" cy="12.5" r="3.8" fill="#cfe3f5"/><path d="M3 4.5v4a1.4 1.4 0 0 0 2.8 0v-4M4.4 10v10"/>',
    curtain: '<rect x="7" y="5" width="10" height="11" fill="#bfe0f2"/><path d="M2.5 4h19"/><path d="M4 4c0 6 1.2 11 4 16H4zM20 4c0 6-1.2 11-4 16h4z" fill="#e98fb0"/>',
    table: '<rect x="3" y="9" width="18" height="3.4" rx="1" fill="#d9a066"/><path d="M5.5 12.4V20M18.5 12.4V20"/><path d="M9 9V6.5h6V9" fill="#cfe3f5"/>',
    cloth: '<path d="M4 8c3-2 6 2 9 0s5-1 7 0v9c-2-1-4-2-7 0s-6-2-9 0z" fill="#76a0e2"/><path d="M6.5 11.8c2.2-1 4.2 1 6.4 0s3-.6 4.6 0" stroke="#fbf6ea" stroke-width="1.5"/>',
    dishes: '<rect x="3" y="15" width="18" height="5" rx="1" fill="#c9d0d6"/><ellipse cx="7.8" cy="11" rx="2.3" ry="5" fill="#fbf6ea"/><ellipse cx="12.3" cy="10" rx="2.3" ry="6" fill="#cfe3f5"/><ellipse cx="16.8" cy="11" rx="2.3" ry="5" fill="#fbf6ea"/>',
    plant: '<path d="M7.5 14h9l-1.3 7h-6.4z" fill="#d9805a"/><path d="M12 14c0-4-1-7-4.5-9 0 4 2 7 4.5 9zM12 14c0-4 1-7 4.5-9 0 4-2 7-4.5 9z" fill="#5cae6a"/>',
    bird: '<path d="M3.5 14.5c1-4 5-6.5 9-5.3l3.2-3 .8 3.2 3.5 1.3-3.4.9c-.9 4-4 6.4-8 6.4-2.4 0-4.2-1.2-5.1-3.5z" fill="#5b8fd6"/><path d="M8.5 13.5c2 1.2 4.2 1 6-.8"/><path d="M8 19.5l-1 2M11 19.5l.5 2"/>',
    desk: '<rect x="3" y="10" width="18" height="3" rx="1" fill="#d9a066"/><path d="M5 13v7M19 13v7"/><rect x="13.5" y="13" width="5.5" height="4.5" fill="#e2b277"/><path d="M6.5 10V5.5c2-.6 3.5-.6 5 .5 1.5-1.1 3-1.1 5-.5V10" fill="#fff6dc"/><path d="M11.5 6v4"/>',
    blocks: '<rect x="3.5" y="12" width="8" height="8" rx="1" fill="#5b8fd6"/><rect x="12.5" y="12" width="8" height="8" rx="1" fill="#e8574a"/><rect x="8" y="4" width="8" height="8" rx="1" fill="#f2c230"/>',
    broom: '<path d="M17 3 10.5 13"/><path d="M10.5 13 4 16.5l4.2 4.8 5-5.7z" fill="#e2b14a"/><path d="M6.6 18l2.2 2.4M8.8 16.4l2 2.2"/>',
    shoes: '<path d="M2.5 16V10h4l2 2.5 5.5 1.5c3.5 1 6.5 1.6 6.5 3.5V19H2.5z" fill="#e8574a"/><path d="M2.5 16.4h18"/>',
    peg: '<path d="M2 5.5c6 3 14 3 20 0"/><path d="M6.5 10 9 7.3c.8 1 1.8 1.4 3 1.4s2.2-.4 3-1.4l2.5 2.7-1.6 1.5-.9-.8V19H9.5v-8.3l-.9.8z" fill="#9fc7ef"/>',
    shirt: '<rect x="4" y="14" width="16" height="5.5" rx="1.5" fill="#9fc7ef"/><rect x="5" y="9" width="14" height="5" rx="1.5" fill="#f2c230"/><rect x="6" y="4.5" width="12" height="4.5" rx="1.5" fill="#e98fb0"/>',
    bin: '<path d="M6 7h12l-1.2 13H7.2z" fill="#5b8fd6"/><path d="M4 7h16M10 4h4M10 10.5v6.5M14 10.5v6.5"/>',
    tidy: '<path d="M4 11h16v9H4z" fill="#d9a066"/><path d="M4 11l2.5-3.5h11L20 11"/><path d="M12 2v3M17.5 3.5 16 5.5M6.5 3.5 8 5.5"/>',
    washer: '<rect x="4" y="3" width="16" height="18" rx="2" fill="#fbf6ea"/><circle cx="12" cy="13.2" r="4.8" fill="#9fc7ef"/><path d="M4 7h16"/><path d="M15 5h2.5"/>',
    can: '<path d="M6 10h9v9.5H6z" fill="#5b8fd6"/><path d="M15 12.5l5-4.5M8 10V7.5h5V10M19 7l2 2"/>',
    mat: '<rect x="6" y="3" width="12" height="18" rx="1.5" fill="#b5443b"/><path d="M9 10.5a3 3 0 0 1 6 0V18H9z" fill="#2f6b4f"/><path d="M6 6h12" stroke="#f2c230" stroke-width="1.4"/>',
    jug: '<path d="M7 5h9l-1 3 1 1v11H7z" fill="#cfe3f5"/><path d="M16 10.5c3 0 3 5 0 5"/><path d="M8.5 12.5h6" stroke="#5b8fd6" stroke-width="2"/>',
    cushion: '<path d="M5 6c3 1 11 1 14 0 1 3 1 9 0 12-3-1-11-1-14 0-1-3-1-9 0-12z" fill="#f4b829"/><circle cx="12" cy="12" r="1.6" fill="#ef8a3c"/>',
    teeth: '<path d="M4 20 15 9" stroke-width="3.6"/><path d="M4 20 15 9" stroke="#5b8fd6" stroke-width="1.8"/><rect x="14" y="3" width="7" height="7" rx="1.5" transform="rotate(45 17.5 6.5)" fill="#fbf6ea"/>',
    seeds: '<path d="M6 3h12v18H6z" fill="#f2c230"/><path d="M6 7h12"/><ellipse cx="12" cy="14" rx="2.6" ry="3.6" fill="#c9894e"/>',
    weed: '<path d="M3 20h18"/><path d="M12 20c0-5-2-8-6-10 1 4 3 7 6 10zM12 20c0-5 2-8 6-10-1 4-3 7-6 10z" fill="#93c25c"/><path d="M12 20V8"/>',
    basket: '<path d="M4 11h16l-2 9H6z" fill="#e2b277"/><circle cx="9" cy="9" r="3" fill="#e8574a"/><circle cx="15" cy="9" r="3" fill="#ef8a3c"/><path d="M7 14.5h10"/>',
    pot: '<path d="M5 10h14v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" fill="#c9d0d6"/><path d="M3 10h18M9.5 7c0-1 1-2 0-3M13.5 7c0-1 1-2 0-3"/>',
    // garden crops
    tomato: '<circle cx="12" cy="13.5" r="7" fill="#e8574a"/><path d="M8.8 7.6 12 9.4l3.2-1.8-1.4 2.8h-3.6z" fill="#5cae6a"/><path d="M12 9.4V5"/>',
    carrot: '<path d="M15 9 5 19.5 6.5 21 17 11z" fill="#ef8a3c"/><path d="M15 9c-.5-3 1-5.5 4-6-.5 2.5 0 4 2 5-2.5 1-4 2-5 3" fill="#5cae6a"/><path d="M8.8 15.6l1.5 1.5M11.6 12.8l1.5 1.5"/>',
    mint: '<path d="M12 21V8"/><path d="M12 13c-4 0-7-2-7-6 4 0 7 2 7 6zM12 11c4 0 7-2 7-6-4 0-7 2-7 6zM12 17.5c-3 0-5-1.5-5-4 3 0 5 1.5 5 4z" fill="#5cae6a"/>',
    sunflower: '<path d="M12 14v7.5M12 18.5c2-2 4-2 5.5-1" /><g fill="#f2c230"><circle cx="12" cy="4.2" r="2.4"/><circle cx="16.1" cy="5.9" r="2.4"/><circle cx="17.8" cy="10" r="2.4"/><circle cx="16.1" cy="14.1" r="2.4"/><circle cx="7.9" cy="14.1" r="2.4"/><circle cx="6.2" cy="10" r="2.4"/><circle cx="7.9" cy="5.9" r="2.4"/></g><circle cx="12" cy="10" r="3.4" fill="#8a5a2b"/>',
    strawberry: '<path d="M12 21c-5-3-7-7-6.5-10.5C6 8 9 7.5 12 9c3-1.5 6-1 6.5 1.5.5 3.5-1.5 7.5-6.5 10.5z" fill="#e8574a"/><path d="M8 8.5 12 6l4 2.5-2 1.2h-4z" fill="#5cae6a"/><path d="M9 12.4l.3.6M13.6 11.8l.3.6M15.2 14.6l-.2.6M10.6 15.8l.2.6M12.6 18.2l.1.6" stroke-width="1.5"/>',
    pumpkin: '<ellipse cx="12" cy="14" rx="8.5" ry="6.5" fill="#ef8a3c"/><path d="M12 7.5c-2.5 2-2.5 11 0 13M12 7.5c2.5 2 2.5 11 0 13"/><path d="M12 7.5c0-2 1-3 2.5-3.5"/>',
    sprout: '<path d="M4 20h16"/><path d="M12 20v-7"/><path d="M12 13c-1-3-3.5-4.5-6.5-4.5.5 3 3 4.5 6.5 4.5zM12 14.5c1-3 3.5-4.5 6.5-4.5-.5 3-3 4.5-6.5 4.5z" fill="#93c25c"/>',
    // special days
    mosque: '<path d="M4 20.5V12h13v8.5z" fill="#fbf6ea"/><path d="M5.5 12c0-3.2 2.2-5.2 5-5.2s5 2 5 5.2z" fill="#3f9c92"/><path d="M10.5 6.8V4.3"/><path d="M19.5 20.5V7.5" stroke-width="2.6"/><path d="M18.3 8l1.2-2.8L20.7 8z" fill="#3f9c92"/><path d="M9 20.5v-3.2a1.5 1.5 0 0 1 3 0v3.2"/>',
    moon: '<path d="M15 3.5A8.5 8.5 0 1 0 20.5 17 7 7 0 0 1 15 3.5z" fill="#f2c230"/>',
    moonfull: '<circle cx="12" cy="12" r="8" fill="#fff3c4"/><circle cx="14.6" cy="9.4" r="2" fill="#efe0a0" stroke="none"/>',
    lantern: '<path d="M12 2v2.5"/><path d="M9 4.5h6l1 2H8z" fill="#c9894e"/><path d="M8 6.5h8c1 3 1 8 0 11H8c-1-3-1-8 0-11z" fill="#f2c230"/><path d="M10 6.5c-.5 3-.5 8 0 11M14 6.5c.5 3 .5 8 0 11"/><path d="M8.5 17.5h7l-1 2h-5z" fill="#c9894e"/>',
    dates: '<ellipse cx="9" cy="13" rx="3.4" ry="5.6" transform="rotate(-20 9 13)" fill="#8a4b2a"/><ellipse cx="15.5" cy="12" rx="3.4" ry="5.6" transform="rotate(15 15.5 12)" fill="#a35b33"/>',
    bunting: '<path d="M2 5c6 3 14 3 20 0"/><path d="M4 6l1.6 6.2L8 7z" fill="#e8574a"/><path d="M10.2 7.6l1.8 6.2 1.8-6.2z" fill="#f2c230"/><path d="M16 7l2.4 5.2L20 6z" fill="#3f9c92"/>',
    sun: '<circle cx="12" cy="12" r="4.5" fill="#f2c230"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
    nights: '<path d="M14 4A7.5 7.5 0 1 0 19.5 16 6.2 6.2 0 0 1 14 4z" fill="#f2c230"/><path d="M19 3.5l.7 1.6 1.7.2-1.3 1.1.4 1.7-1.5-.9-1.5.9.4-1.7-1.3-1.1 1.7-.2z" fill="#fff3c4"/>',
    // little things
    star: '<path d="M12 2.8l2.7 5.9 6.4.7-4.8 4.4 1.3 6.4L12 17l-5.6 3.2 1.3-6.4L2.9 9.4l6.4-.7z" fill="#f4b829"/>',
    heart: '<path d="M12 20.5s-7.5-4.6-9.6-9.2C.9 7.9 3 4 6.8 4c2.2 0 3.6 1.2 5.2 3 1.6-1.8 3-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3-2.1 4.6-9.6 9.2-9.6 9.2z" fill="#ef6a8a"/>',
    leaf: '<path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z" fill="#93c25c"/><path d="M5 19c3-5 7-8 11-11"/>',
    tick: '<path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="3"/>',
    gift: '<rect x="4" y="10" width="16" height="10" rx="1.5" fill="#fbf6ea"/><rect x="3" y="7" width="18" height="4" rx="1" fill="#e98fb0"/><path d="M12 7v13"/><path d="M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0"/>',
    book: '<path d="M5 3.5h11.5a2 2 0 0 1 2 2V20.5H7a2 2 0 0 1-2-2z" fill="#e8574a"/><path d="M5 18.5a2 2 0 0 1 2-2h11.5"/><path d="M11.8 6.6l1.1 2.3 2.5.3-1.9 1.7.5 2.5-2.2-1.3-2.2 1.3.5-2.5L8.2 9.2l2.5-.3z" fill="#f4b829"/>',
    house: '<path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.5V20h12V9.5" fill="#f4b829"/><path d="M10 20v-5h4v5" fill="#fbf6ea"/>',
    flower: '<path d="M12 13v8" /><path d="M12 18c-2-2.5-4.5-3-6-2 1.5 2 3.5 2.6 6 2z" fill="#5cae6a"/><g fill="#f3a6bb"><circle cx="12" cy="4.6" r="2.6"/><circle cx="16" cy="7.6" r="2.6"/><circle cx="14.5" cy="12" r="2.6"/><circle cx="9.5" cy="12" r="2.6"/><circle cx="8" cy="7.6" r="2.6"/></g><circle cx="12" cy="8.6" r="2.2" fill="#f2c230"/>',
    // gift stickers (no faces on anything)
    kite: '<path d="M12 2.5 18.5 9 12 18 5.5 9z" fill="#e8574a"/><path d="M12 2.5V18M5.5 9h13"/><path d="M12 18c-1 1.5 1 2 0 3.5" /><path d="M10.6 19.4l1.4.3M11.4 21l1.3-.4" stroke="#f2c230" stroke-width="2"/>',
    boat: '<path d="M3 14h18l-3 5H6z" fill="#cfe3f5"/><path d="M12 14V3l6 9h-6" fill="#fbf6ea"/><path d="M12 5l-5 7h5" fill="#f2c230"/>',
    rainbow: '<path d="M3 18a9 9 0 0 1 18 0" stroke="#e8574a" stroke-width="2.6"/><path d="M5.8 18a6.2 6.2 0 0 1 12.4 0" stroke="#f2c230" stroke-width="2.6"/><path d="M8.6 18a3.4 3.4 0 0 1 6.8 0" stroke="#5b8fd6" stroke-width="2.6"/><path d="M2 18.5h20"/>',
    butterfly: '<path d="M12 12C9 5 3 4 3.5 8.5c.4 3 3.5 3.5 8.5 3.5zM12 12c3-7 9-8 8.5-3.5-.4 3-3.5 3.5-8.5 3.5z" fill="#9b7fd1"/><path d="M12 12c-4 0-7 1.5-6.5 4.5S10 18 12 12zM12 12c4 0 7 1.5 6.5 4.5S14 18 12 12z" fill="#f3a6bb"/><path d="M12 8v9"/>',
    teacup: '<path d="M4 9h12v4a6 6 0 0 1-12 0z" fill="#fbf6ea"/><path d="M16 10.5c3 0 3 4.5 0 4.5"/><path d="M3 20h14"/><path d="M8 6c0-1 1-1.5 0-2.8M11.5 6c0-1 1-1.5 0-2.8"/><path d="M6.5 12h7" stroke="#e98fb0" stroke-width="1.6"/>',
    umbrella: '<path d="M2.5 12a9.5 8 0 0 1 19 0c-1.6-1-3.2-1-4.8 0-1.6-1-3.1-1-4.7 0-1.6-1-3.1-1-4.7 0-1.6-1-3.2-1-4.8 0z" fill="#5b8fd6"/><path d="M12 4v15a2 2 0 0 0 4 0"/>',
    acorn: '<path d="M6.5 11h11c0 5-2.5 9.5-5.5 9.5S6.5 16 6.5 11z" fill="#d9a066"/><path d="M5 11c0-3.5 3-5.5 7-5.5s7 2 7 5.5z" fill="#8a5a2b"/><path d="M12 5.5c0-1.5.5-2.5 2-3"/>',
    pear: '<path d="M12 6c-2 0-2.8 2.2-3 4.2-.3 2-3 3.5-3 6.3C6 19.5 8.7 21 12 21s6-1.5 6-4.5c0-2.8-2.7-4.3-3-6.3C14.8 8.2 14 6 12 6z" fill="#b8d35a"/><path d="M12 6V3"/><path d="M12 4.5c1.5-1.5 3.5-1.5 4.5-.5-1.5 1.5-3 1.5-4.5.5z" fill="#5cae6a"/>',
    shell: '<path d="M12 4C6.5 4 3 8.5 3 14l4 5h10l4-5c0-5.5-3.5-10-9-10z" fill="#f8c9b0"/><path d="M12 4v15M12 4 7.5 19M12 4l4.5 15M12 4 4 15.5M12 4l8 11.5"/>',
    feather: '<path d="M19 3C10 4 5.5 10 5 19c7-1 13-5 14-16z" fill="#9fc7ef"/><path d="M3.5 21 16 7M9 15.5h4.5M11 13h4"/>',
    cloud: '<path d="M6.5 18a4 4 0 0 1-.5-8 6 6 0 0 1 11.5 1.2A3.5 3.5 0 0 1 17.5 18z" fill="#fbf6ea"/>',
    flowerpot: '<path d="M7 14h10l-1.5 7h-7z" fill="#d9805a"/><path d="M12 14V9"/><g fill="#e98fb0"><circle cx="12" cy="5" r="2"/><circle cx="14.6" cy="7" r="2"/><circle cx="9.4" cy="7" r="2"/></g><circle cx="12" cy="7" r="1.4" fill="#f2c230"/>',
    // My Room decorations (same ids as HD.DECOR)
    rug: '<rect x="3" y="6" width="18" height="12" rx="2.5" fill="#e98f6b"/><path d="M12 8.5l3.5 3.5-3.5 3.5-3.5-3.5z" fill="#f2c230"/><path d="M3 9H1.5M3 15H1.5M21 9h1.5M21 15h1.5"/>',
    lamp: '<path d="M7 4h10l2.5 8h-15z" fill="#f3a6bb"/><path d="M12 12v7M8 20h8"/>',
    frame: '<rect x="4" y="4" width="16" height="16" rx="1.5" fill="#fbf4e4"/><path d="M12 6.5l1.6 3.9 3.9 1.6-3.9 1.6-1.6 3.9-1.6-3.9-3.9-1.6 3.9-1.6z" fill="#3f9c92"/>',
    garland: '<path d="M2.5 6c6 6 13 6 19 0"/><path d="M7 10.3l.9 2 2.1.2-1.6 1.4.5 2.1L7 14.9 5.1 16l.5-2.1L4 12.5l2.1-.2zM17 10.3l.9 2 2.1.2-1.6 1.4.5 2.1-1.9-1.1-1.9 1.1.5-2.1-1.6-1.4 2.1-.2z" fill="#f2c230"/><circle cx="12" cy="12.3" r="1.6" fill="#93d3b0"/>',
  };
  I.decoplant = I.plant; I.decocushion = I.cushion;
  // icon(name) -> an inked svg; {outline:true} draws it as a soft locked outline (no fills, light dashed ink)
  function icon(name, o){
    o = o || {}; let s = I[name] || I.star;
    if (o.outline) s = s.replace(/fill="#[0-9a-f]{3,6}"/gi, 'fill="none"').replace(/stroke="#[0-9a-f]{3,6}"/gi, 'stroke="' + INK + '"');
    const sw = o.sw || 1.8;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="${INK}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${o.outline ? ' stroke-dasharray="2.2 2.4" opacity=".42"' : ''}>${s}</svg>`;
  }

  /* ================= what the stickers are ================= */
  const CHORE_NAME = {
    'make-bed': 'Make the bed', 'pyjamas-away': 'Pyjamas away', 'pack-schoolbag': 'School bag', 'set-breakfast': 'Breakfast table', 'open-curtains': 'Curtains',
    'clear-table': 'Clear the table', 'wipe-table': 'Wipe the table', 'dishes-rack': 'Dishes', 'water-indoor-plant': 'Water the plant', 'feed-bird-feeder': 'Feed the birds',
    'homework-desk': 'Homework', 'toddler-toys': 'Toys away', 'sweep-floor': 'Sweep', 'shoe-rack': 'Shoes', 'dust-shelves': 'Dusting',
    'set-dinner': 'Dinner table', 'bins-out': 'Bins out', 'hang-washing': 'Hang washing', 'fold-washing': 'Fold washing', 'evening-tidy': 'Tidy up',
    'wash-laundry': 'Washing machine', 'bring-washing-in': 'Washing in', 'sort-recycling': 'Recycling', 'wipe-windows': 'Windows', 'water-garden': 'Water the garden',
    'put-away-shopping': 'Shopping away', 'tidy-my-room': 'My room', 'lay-prayer-mats': 'Prayer mats', 'refill-water-jug': 'Water jug', 'straighten-cushions': 'Cushions',
    'brush-teeth': 'Brush teeth', 'garden-plant': 'Plant seeds', 'garden-weed': 'Pull weeds', 'garden-harvest': 'Harvest',
  };
  const CHORE_ICON = { curtain: 'curtain', table: 'table', dishes: 'dishes', tidy: 'tidy', washer: 'washer' };
  function chores(){
    const H = window.HHDays, base = (H && H.CHORES) ? H.CHORES.map(c => ({ id: c.id, icon: CHORE_ICON[c.icon] || c.icon })) : Object.keys(CHORE_NAME).map(id => ({ id, icon: 'star' }));
    [['brush-teeth', 'teeth'], ['garden-plant', 'seeds'], ['garden-weed', 'weed'], ['garden-harvest', 'basket']].forEach(([id, ic]) => { if (!base.some(c => c.id === id)) base.push({ id, icon: ic }); });
    const got = {}; safe(() => H.list(), []).forEach(s => { got[s.id] = s; });
    return base.filter(c => I[c.icon] || c.icon === 'star').map(c => Object.assign({ name: CHORE_NAME[c.id] || c.id.replace(/-/g, ' '), level: 0, count: 0, next: 3 }, c, got[c.id] || {}));
  }
  // TEACHER REVIEW: the names of the special days shown in the book
  const SPECIAL = [
    { id: 'friday', icon: 'mosque', name: "Jumu'ah" },
    { id: 'ramadan', icon: 'lantern', name: 'Ramadan' },
    { id: 'lastTenNights', icon: 'nights', name: 'The last ten nights' },
    { id: 'eidFitr', icon: 'bunting', name: 'Eid al-Fitr' },
    { id: 'eidAdha', icon: 'gift', name: 'Eid al-Adha' },
    { id: 'arafah', icon: 'sun', name: 'Day of Arafah' },
    { id: 'whiteDay', icon: 'moonfull', name: 'The white days' },
    { id: 'sunnahFast', icon: 'dates', name: 'Monday and Thursday' },
    { id: 'ashura', icon: 'moon', name: 'Ashura' },
  ];
  // end TEACHER REVIEW
  const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const PNAME = { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' };
  const PCOL = { fajr: '#f3a6bb', dhuhr: '#f2c230', asr: '#ef8a3c', maghrib: '#e8574a', isha: '#9b7fd1' };
  const FAMILY_ORDER = [['abu', 'Abu'], ['ummi', 'Ummi'], ['sister', 'Sister'], ['toddler', 'Brother']];
  const SEEDS = ['tomato', 'carrot', 'mint', 'sunflower', 'strawberry', 'pumpkin'];
  const GIFTS = ['kite', 'boat', 'rainbow', 'butterfly', 'teacup', 'umbrella', 'acorn', 'pear', 'shell', 'feather', 'cloud', 'flowerpot'];
  const GIFT_NAME = { kite: 'Kite', boat: 'Paper boat', rainbow: 'Rainbow', butterfly: 'Butterfly', teacup: 'Tea cup', umbrella: 'Umbrella', acorn: 'Acorn', pear: 'Pear', shell: 'Shell',
    feather: 'Feather', cloud: 'Cloud', flowerpot: 'Flower pot', rug: 'Rug', lamp: 'Lamp', cushion: 'Cushion', plant: 'Plant', frame: 'Picture', garland: 'Garland' };
  const guideState = () => read('hh.guide', {}) || {};

  /* ================= pictures that are not icons ================= */
  // a flower for one prayer: fard = petals; fard + sunnah = petals and two leaves; none = a little patch of soil
  function prayerFlower(p, v){
    if (!v) return `<svg viewBox="0 0 24 24"><path d="M5 18.5c2-2.5 12-2.5 14 0" fill="#c9a27a" stroke="${INK}" stroke-width="1.4" stroke-linecap="round" opacity=".55"/></svg>`;
    const c = PCOL[p], both = String(v).indexOf('sunnah') >= 0;
    const pet = [[12, 5.2], [16.2, 8.2], [14.6, 13], [9.4, 13], [7.8, 8.2]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.9" fill="${c}"/>`).join('');
    return `<svg viewBox="0 0 24 24" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 13v9"/>` +
      (both ? '<path d="M12 18.5c-2-2.6-4.6-3.1-6.2-2 1.5 2.1 3.6 2.7 6.2 2zM12 17c2-2.6 4.6-3.1 6.2-2-1.5 2.1-3.6 2.7-6.2 2z" fill="#5cae6a"/>' : '') +
      pet + '<circle cx="12" cy="9.4" r="2.4" fill="#fff3c4"/></svg>';
  }
  // the "days helping" branch: the last 14 days, a leaf on each day the child helped, a bare twig on the others
  function branch(days, opts){
    opts = opts || {};
    const set = {}; (days || []).forEach(d => { set[d] = 1; });
    const now = opts.now || new Date(), N = 14, W = 340, Hh = 96;
    let s = `<svg viewBox="0 0 ${W} ${Hh}" class="hhb-branch" fill="none" stroke="${INK}" stroke-linecap="round" stroke-linejoin="round">`;
    s += `<path d="M6 62C70 70 140 52 210 56S310 44 336 40" stroke="#7a5233" stroke-width="7"/><path d="M6 62C70 70 140 52 210 56S310 44 336 40" stroke="${INK}" stroke-width="1.6" opacity=".7"/>`;
    for (let i = 0; i < N; i++){
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (N - 1 - i), 12), k = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
      const x = 18 + i*(312/(N - 1)), y = 62 - (x/336)*20 + Math.sin(i*1.3)*3, up = i % 2 === 0, today = i === N - 1;
      const tip = [x + (up ? 6 : 4), y + (up ? -24 : 22)];
      if (set[k]){
        const rot = up ? -35 + (i*7 % 20) : 150 + (i*11 % 20);
        s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot})"${today && opts.grow ? ' class="hhb-newleaf"' : ''}><path d="M0 0C6-9 18-11 28-6 20 4 8 6 0 0z" fill="${today ? '#7fc15a' : '#93c25c'}" stroke-width="1.8"/><path d="M2 -1C10-4 18-5 24-5" stroke-width="1.3"/></g>`;
      } else s += `<path d="M${x.toFixed(1)} ${y.toFixed(1)}l${up ? 3 : 2} ${up ? -8 : 7}" stroke="#7a5233" stroke-width="2.4"/>`;
      if (today) s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#f4b829" stroke-width="1.6"/>`;
      void tip;
    }
    return s + '</svg>';
  }

  /* ================= styles ================= */
  const CSS = `
  .hhb-btn{all:unset;position:fixed;right:12px;bottom:calc(env(safe-area-inset-bottom) + 14px);z-index:6;box-sizing:border-box;width:56px;height:56px;border-radius:18px;border:2.5px solid ${INK};
    background:#fbf6ea;box-shadow:0 3px 0 ${INK};display:grid;place-items:center;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .12s,opacity .2s}
  .hhb-btn svg{width:38px;height:38px;transform:rotate(-6deg)}
  .hhb-btn:active{transform:translateY(2px);box-shadow:0 1px 0 ${INK}}
  .hhb-btn.pop{animation:hhbPop .5s ease-out}
  @keyframes hhbPop{40%{transform:scale(1.2) rotate(-5deg)}}
  .hhb-btn .dot{position:absolute;right:-5px;top:-6px;width:18px;height:18px;border-radius:50%;background:#e8574a;border:2.2px solid ${INK};box-sizing:border-box;display:none}
  .hhb-btn.new .dot{display:block}
  body:has(.hh-tray.in) .hhb-btn,body:has(.fam-stage) .hhb-btn,body:has(.hh-teeth) .hhb-btn,body:has(.hh-hp) .hhb-btn,body:has(.hhg-veil) .hhb-btn,body:has(.hhg-coach) .hhb-btn{opacity:0;pointer-events:none}
  .hhb{position:fixed;inset:0;z-index:25;display:grid;place-items:center;background:rgba(35,30,22,.38);opacity:0;transition:opacity .22s;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
  .hhb.in{opacity:1}
  .hhb-book{position:relative;box-sizing:border-box;width:min(720px,calc(100vw - 16px));height:min(860px,calc(100dvh - 16px - env(safe-area-inset-top) - env(safe-area-inset-bottom)));margin-top:env(safe-area-inset-top);
    background:#f6efdc;border:2.5px solid ${INK};border-radius:22px 26px 26px 22px;box-shadow:0 6px 0 ${INK},inset 14px 0 0 -6px #e9dcc0;display:flex;flex-direction:column;overflow:hidden;
    transform:translateY(24px) scale(.94);transform-origin:90% 100%;transition:transform .32s cubic-bezier(.2,1.25,.4,1)}
  .hhb.in .hhb-book{transform:none}
  .hhb-book::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.5;background-image:radial-gradient(rgba(120,95,60,.08) 1px,transparent 1.2px);background-size:7px 7px}
  .hhb-x{all:unset;position:absolute;right:10px;top:10px;z-index:3;width:52px;height:52px;border-radius:50%;background:#fbf6ea;border:2.5px solid ${INK};box-shadow:0 3px 0 ${INK};display:grid;place-items:center;cursor:pointer}
  .hhb-x svg{width:24px;height:24px}.hhb-x:active{transform:translateY(2px);box-shadow:0 1px 0 ${INK}}
  .hhb-head{position:relative;display:flex;align-items:center;gap:10px;padding:14px 72px 6px 16px;min-height:52px}
  .hhb-head i{flex:none;width:48px;height:48px;border-radius:14px;border:2.2px solid ${INK};background:#fff9e8;display:grid;place-items:center;box-shadow:0 3px 0 ${INK};transform:rotate(-4deg)}
  .hhb-head i svg{width:34px;height:34px}
  .hhb-head b{font:800 22px/1.1 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;color:${INK}}
  .hhb-head small{display:block;font:700 13px/1.2 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;color:#6b6152;margin-top:2px}
  .hhb-pages{position:relative;flex:1;min-height:0}
  .hhb-page{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;padding:6px 14px 20px;box-sizing:border-box;touch-action:pan-y}
  .hhb-page[hidden]{display:none}
  .hhb-page.fromR{animation:hhbFromR .28s cubic-bezier(.3,.8,.3,1)}.hhb-page.fromL{animation:hhbFromL .28s cubic-bezier(.3,.8,.3,1)}
  @keyframes hhbFromR{from{opacity:0;transform:translateX(34px)}}@keyframes hhbFromL{from{opacity:0;transform:translateX(-34px)}}
  .hhb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:14px 10px;padding:4px 2px}
  .hhb-st{all:unset;position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;font:800 11.5px/1.15 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;color:${INK};text-align:center}
  .hhb-st .s{position:relative;box-sizing:border-box;width:70px;height:70px;border-radius:50%;background:#fff;border:2.5px solid ${INK};box-shadow:0 0 0 4px #fff inset,0 3px 0 rgba(35,30,22,.85);display:grid;place-items:center;transform:rotate(var(--r,0deg))}
  .hhb-st .s svg{width:44px;height:44px}
  .hhb-st.l2 .s{background:#eaf5df}.hhb-st.l3 .s{background:#fff1c4;box-shadow:0 0 0 4px #fff inset,0 3px 0 rgba(35,30,22,.85),0 0 0 4px #f4b829}
  .hhb-st.l3 .s::after{content:"";position:absolute;inset:6px;border-radius:50%;background:linear-gradient(120deg,transparent 38%,rgba(255,255,255,.85) 48%,transparent 58%);pointer-events:none}
  .hhb-st.lock .s{background:transparent;border:2.5px dashed rgba(35,30,22,.35);box-shadow:none}
  .hhb-st.lock span{color:#8b8170}
  .hhb-st .lv{display:flex;gap:1px;height:14px}
  .hhb-st .lv svg{width:14px;height:14px}
  .hhb-st:active .s{transform:rotate(var(--r,0deg)) scale(.94)}
  .hhb-st.wig .s{animation:hhbWig .5s}
  @keyframes hhbWig{25%{transform:rotate(calc(var(--r,0deg) - 8deg)) scale(1.08)}60%{transform:rotate(calc(var(--r,0deg) + 6deg)) scale(1.04)}}
  .hhb-tip{position:absolute;left:50%;bottom:calc(100% + 4px);transform:translateX(-50%);z-index:2;background:#fbf6ea;border:2.2px solid ${INK};border-radius:14px;box-shadow:0 3px 0 ${INK};padding:6px 8px;display:flex;gap:3px;align-items:center;white-space:nowrap;pointer-events:none;animation:hhbTip .2s ease-out}
  @keyframes hhbTip{from{opacity:0;transform:translateX(-50%) translateY(6px)}}
  .hhb-tip i{width:10px;height:10px;border-radius:50%;border:1.8px solid ${INK};background:#fff}.hhb-tip i.on{background:#f4b829}
  .hhb-tip svg{width:18px;height:18px;margin-left:2px}
  .hhb-tabs{position:relative;display:flex;justify-content:center;gap:clamp(4px,1.6vw,10px);padding:8px 8px calc(10px + env(safe-area-inset-bottom)*0);border-top:2.5px solid ${INK};background:#efe4c8}
  .hhb-tab{all:unset;box-sizing:border-box;width:clamp(48px,13.5vw,64px);height:clamp(48px,13.5vw,60px);border-radius:16px;border:2.5px solid ${INK};background:#fbf6ea;box-shadow:0 3px 0 ${INK};display:grid;place-items:center;cursor:pointer;transition:transform .15s}
  .hhb-tab svg{width:62%;height:62%}
  .hhb-tab[aria-selected=true]{background:#f4b829;transform:translateY(-6px);box-shadow:0 5px 0 ${INK}}
  .hhb-tab:active{transform:translateY(2px);box-shadow:0 1px 0 ${INK}}
  .hhb-card{background:#fffaf0;border:2.2px solid ${INK};border-radius:18px;box-shadow:0 3px 0 ${INK};padding:10px 12px;margin:6px 2px 14px}
  .hhb-card h3{all:unset;display:flex;align-items:center;gap:8px;font:800 15px/1.2 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;color:${INK};margin-bottom:6px}
  .hhb-card h3 svg{width:26px;height:26px}
  .hhb-card h3 em{font-style:normal;margin-left:auto;background:#93c25c;border:2px solid ${INK};border-radius:999px;padding:0 10px;font-size:16px;line-height:26px}
  .hhb-branch{display:block;width:100%;height:auto}
  .hhb-newleaf{animation:hhbLeaf 1s cubic-bezier(.2,1.5,.4,1) both;transform-box:fill-box;transform-origin:0 50%}
  @keyframes hhbLeaf{from{opacity:0;scale:.1}}
  .hhb-pg{display:grid;grid-template-columns:44px repeat(5,1fr) 30px;align-items:center;gap:2px 2px}
  .hhb-pg .h{display:grid;place-items:center;font:800 11px ui-rounded,system-ui,sans-serif;color:${INK}}
  .hhb-pg .h i{width:22px;height:22px;border-radius:50%;border:2px solid ${INK};display:block;margin-bottom:2px}
  .hhb-pg .d{font:800 12px ui-rounded,system-ui,sans-serif;color:#6b6152;text-align:left;padding-left:2px}
  .hhb-pg .d.today{color:${INK};background:#f4b829;border:2px solid ${INK};border-radius:999px;text-align:center;padding:0;line-height:22px}
  .hhb-pg .f{display:grid;place-items:center;height:46px;border-bottom:2px dotted rgba(122,82,51,.35)}
  .hhb-pg .f svg{width:40px;height:40px}
  .hhb-pg .f.new svg{animation:hhbLeaf .8s cubic-bezier(.2,1.5,.4,1) both}
  .hhb-pg .x svg{width:22px;height:22px}
  .hhb-fam{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
  .hhb-person{all:unset;cursor:pointer;background:#fffaf0;border:2.2px solid ${INK};border-radius:18px;box-shadow:0 3px 0 ${INK};padding:8px;display:flex;flex-direction:column;align-items:center;gap:6px}
  .hhb-person .fig{height:120px;width:100%;display:grid;place-items:end center}
  .hhb-person .fig svg{height:var(--h,100%);width:auto;max-width:100%;overflow:visible}
  @media (min-width:700px) and (min-height:600px){.hhb-person .fig{height:170px}.hhb-person .fig svg{height:calc(var(--h,100px)*1.4)}.hhb-st .s{width:84px;height:84px}.hhb-st .s svg{width:54px;height:54px}.hhb-grid{grid-template-columns:repeat(auto-fill,minmax(96px,1fr))}}
  .hhb-person b{font:800 15px ui-rounded,system-ui,sans-serif;color:${INK}}
  .hhb-person .hs{display:flex;flex-wrap:wrap;justify-content:center;gap:2px;min-height:22px}
  .hhb-person .hs svg{width:20px;height:20px}
  .hhb-person .hs em{font:800 14px ui-rounded,system-ui,sans-serif;font-style:normal;color:${INK};align-self:center;margin-left:4px}
  .hhb-person.wig{animation:hhbWig2 .5s}
  @keyframes hhbWig2{30%{transform:scale(1.05) rotate(-2deg)}70%{transform:scale(1.02) rotate(2deg)}}
  .hhb-none{font:700 14px/1.35 ui-rounded,system-ui,sans-serif;color:#6b6152;text-align:center;padding:4px 0 2px}
  .hhb-grow{display:flex;gap:10px;flex-wrap:wrap}
  .hhb-grow span{display:flex;align-items:center;gap:4px;background:#fff;border:2px solid ${INK};border-radius:999px;padding:3px 10px 3px 4px;font:800 13px ui-rounded,system-ui,sans-serif}
  .hhb-grow svg{width:28px;height:28px}
  @media (prefers-reduced-motion:reduce){.hhb-book{transition:none}.hhb-page{animation:none!important}.hhb-st.wig .s,.hhb-newleaf,.hhb-btn.pop{animation:none}}
  `;

  /* ================= the book ================= */
  let H = null, root = null, btn = null, cur = 'me', mounted = false, famCache = null;
  const PAGES = [
    { id: 'me', icon: 'leaf', title: 'My book' },
    { id: 'chores', icon: 'broom', title: 'Chores' },
    { id: 'prayers', icon: 'flower', title: 'Prayers' },
    { id: 'family', icon: 'heart', title: 'Family' },
    { id: 'garden', icon: 'carrot', title: 'Garden' },
    { id: 'special', icon: 'moon', title: 'Special days' },
  ];
  const say = () => {};   // no device voice: pictures and sounds only
  const sfx = n => { try { window.Kit && Kit.sfx && Kit.sfx.play(n); } catch (e) {} };
  function sounds(){
    if (!window.Kit || !Kit.sfx || !Kit.sfx.define) return;
    Kit.sfx.define({
      b_open: (L, t) => { L.whoosh(t, { dur: .28, from: 500, to: 1800, vol: .06 }); L.thump(t + .18, { from: 160, to: 90, vol: .14 }); },
      b_page: (L, t) => L.burst(t, { dur: .2, freq: 3200, sweepTo: 1600, q: .7, vol: .05, attack: .05 }),
      b_stick: (L, t) => { L.click(t, { freq: 2200, vol: .14 }); L.burst(t + .02, { dur: .08, freq: 1500, q: 1.2, vol: .06 }); },
    });
  }
  function signature(){
    const st = guideState(), l = chores().map(c => c.level).join(''), h = JSON.stringify(st.hearts || {}), g = (st.gifts || []).length, sp = Object.keys(st.special || {}).length;
    const hv = JSON.stringify(safe(() => window.HHDays.garden().harvested, {}));
    return [l, h, g, sp, hv].join('|');
  }
  function markNew(){ if (!btn) return; const seen = read('hh.book', {}) || {}; btn.classList.toggle('new', !!seen.sig && seen.sig !== signature()); }

  function mount(house){
    if (mounted) return; mounted = true; H = house || window.HOUSE || null;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    sounds();
    btn = document.createElement('button'); btn.className = 'hhb-btn'; btn.setAttribute('aria-label', 'My sticker book');
    btn.innerHTML = icon('book', { sw: 1.9 }) + '<span class="dot"></span>';
    btn.addEventListener('click', e => { e.stopPropagation(); open(); });
    document.body.appendChild(btn);
    const seen = read('hh.book', null); if (!seen) write('hh.book', { sig: signature() });
    markNew();
    if (H && H.on) H.on('done', () => setTimeout(markNew, 400));
  }

  function open(page){
    if (root) return;
    sfx('b_open'); say('My sticker book');
    if (btn){ btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); }
    root = document.createElement('div'); root.className = 'hhb'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Sticker book');
    root.innerHTML = `<div class="hhb-book"><button class="hhb-x" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      <div class="hhb-head"><i></i><span><b></b><small></small></span></div><div class="hhb-pages"></div><div class="hhb-tabs" role="tablist"></div></div>`;
    root.querySelector('.hhb-x').addEventListener('click', e => { e.stopPropagation(); close(); });
    root.addEventListener('click', e => { if (e.target === root) close(); });
    const tabs = root.querySelector('.hhb-tabs'), pages = root.querySelector('.hhb-pages');
    PAGES.forEach(p => {
      const t = document.createElement('button'); t.className = 'hhb-tab'; t.setAttribute('role', 'tab'); t.setAttribute('aria-label', p.title); t.dataset.id = p.id; t.innerHTML = icon(p.icon);
      t.addEventListener('click', e => { e.stopPropagation(); go(p.id, true); }); tabs.appendChild(t);
      const pg = document.createElement('div'); pg.className = 'hhb-page'; pg.hidden = true; pg.dataset.id = p.id; pages.appendChild(pg);
    });
    swipe(pages);
    document.body.appendChild(root);
    go(page || 'me', false);
    requestAnimationFrame(() => root.classList.add('in'));
    write('hh.book', { sig: signature() }); markNew();
  }
  function close(){
    if (!root) return; const r = root; root = null; r.classList.remove('in'); sfx('b_page');
    setTimeout(() => r.remove(), 240);
  }
  function go(id, voice){
    if (!root) return; const ix = PAGES.findIndex(p => p.id === id), was = PAGES.findIndex(p => p.id === cur); if (ix < 0) return;
    cur = id; const P = PAGES[ix];
    root.querySelectorAll('.hhb-tab').forEach(t => t.setAttribute('aria-selected', t.dataset.id === id));
    root.querySelectorAll('.hhb-page').forEach(pg => { pg.hidden = pg.dataset.id !== id; if (pg.hidden) pg.innerHTML = ''; });
    const pg = root.querySelector(`.hhb-page[data-id="${id}"]`); pg.classList.remove('fromR', 'fromL'); if (voice){ void pg.offsetWidth; pg.classList.add(ix >= was ? 'fromR' : 'fromL'); } pg.scrollTop = 0;
    root.querySelector('.hhb-head i').innerHTML = icon(P.icon); root.querySelector('.hhb-head b').textContent = P.title;
    const sub = root.querySelector('.hhb-head small');
    pg.innerHTML = ''; RENDER[id](pg, sub);
    if (voice){ sfx('b_page'); say(P.title); }
    void was;
  }
  function swipe(el){
    let x0 = null, y0 = 0, t0 = 0;
    el.addEventListener('pointerdown', e => { x0 = e.clientX; y0 = e.clientY; t0 = performance.now(); });
    el.addEventListener('pointerup', e => {
      if (x0 == null) return; const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)*1.5 && performance.now() - t0 < 700){
        const ix = PAGES.findIndex(p => p.id === cur), n = PAGES[ix + (dx < 0 ? 1 : -1)]; if (n) go(n.id, true); }
    });
    el.addEventListener('pointercancel', () => { x0 = null; });
  }
  // a sticker: tap says its name and shows how far to the next level (dots)
  function sticker(o){
    const b = document.createElement('button'); b.className = 'hhb-st' + (o.level ? ' l' + o.level : ' lock');
    b.style.setProperty('--r', (((o.seed || 0)*37 % 9) - 4) + 'deg');
    b.setAttribute('aria-label', o.name);
    const stars = o.levels === false ? '' : '<span class="lv">' + [1, 2, 3].map(i => i <= o.level ? icon('star', { sw: 2 }) : icon('star', { outline: true, sw: 2 })).join('') + '</span>';
    b.innerHTML = `<span class="s">${o.level ? (o.svg || icon(o.icon)) : (o.svgOff || icon(o.icon, { outline: true }))}</span>${stars}<span></span>`;
    b.lastChild.textContent = o.name;
    b.addEventListener('click', e => {
      e.stopPropagation(); sfx('b_stick'); say(o.say || o.name);
      b.classList.remove('wig'); void b.offsetWidth; b.classList.add('wig');
      document.querySelectorAll('.hhb-tip').forEach(t => t.remove());
      if (o.next){ const tip = document.createElement('span'); tip.className = 'hhb-tip'; const have = o.count || 0, from = o.from || 0, n = Math.min(10, o.next - from), k = Math.round((have - from)/(o.next - from)*n);
        tip.innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < k ? 'on' : ''}"></i>`).join('') + icon('star', { sw: 2 }); b.appendChild(tip); setTimeout(() => tip.remove(), 2200); }
    });
    return b;
  }
  function card(title, ic, badge){ const c = document.createElement('div'); c.className = 'hhb-card'; c.innerHTML = `<h3>${icon(ic)}<span></span>${badge != null ? '<em></em>' : ''}</h3>`; c.querySelector('h3 span').textContent = title; if (badge != null) c.querySelector('em').textContent = badge; return c; }
  function grid(){ const g = document.createElement('div'); g.className = 'hhb-grid'; return g; }
  const LV = [0, 3, 10, 30];

  const RENDER = {
    me(pg, sub){
      const st = guideState(), days = st.days || [];
      sub.textContent = days.length ? days.length + (days.length === 1 ? ' day helping' : ' days helping') : 'Help at home to grow a leaf';
      const c1 = card('Days helping', 'leaf', days.length); c1.insertAdjacentHTML('beforeend', branch(days, { now: now(), grow: true })); pg.appendChild(c1);
      const gifts = st.gifts || [], have = {}; gifts.forEach(g => { have[g.id] = 1; });
      const c2 = card('Presents', 'gift', gifts.length); const g = grid();
      GIFTS.concat(['rug', 'lamp', 'cushion', 'plant', 'frame', 'garland']).forEach((id, i) => g.appendChild(sticker({ id, icon: id, name: GIFT_NAME[id] || id, level: have[id] ? 1 : 0, levels: false, seed: i })));
      c2.appendChild(g); pg.appendChild(c2);
      if (!gifts.length) c2.insertAdjacentHTML('beforeend', '<div class="hhb-none">Every 5 stars brings a present.</div>');
    },
    chores(pg, sub){
      const L = chores(), got = L.filter(c => c.level).length; sub.textContent = got + ' of ' + L.length;
      const g = grid();
      L.sort((a, b) => (b.level - a.level) || (b.count - a.count)).forEach((c, i) => g.appendChild(sticker({ icon: c.icon, name: c.name, level: c.level, count: c.count, from: LV[c.level] || 0, next: c.level >= 3 ? 0 : LV[c.level + 1], seed: i })));
      pg.appendChild(g);
    },
    prayers(pg, sub){
      const rows = safe(() => window.HHDays.prayerGarden(7), null) || [], d0 = now();
      let n = 0; rows.forEach(r => PRAYERS.forEach(p => { if (r[p]) n++; }));
      sub.textContent = n ? n + (n === 1 ? ' flower this week' : ' flowers this week') : 'Each prayer plants a flower';
      const c = card('My prayer garden', 'flower'); const t = document.createElement('div'); t.className = 'hhb-pg';
      t.innerHTML = '<span></span>' + PRAYERS.map(p => `<span class="h"><i style="background:${PCOL[p]}"></i>${PNAME[p]}</span>`).join('') + '<span></span>';
      const today = d0.getFullYear() + '-' + (d0.getMonth() + 1) + '-' + d0.getDate();
      rows.forEach(r => {
        const [y, m, dd] = String(r.date).split('-').map(Number), dt = new Date(y, m - 1, dd), isT = r.date === today;
        t.insertAdjacentHTML('beforeend', `<span class="d${isT ? ' today' : ''}">${isT ? 'Today' : dt.toLocaleDateString('en', { weekday: 'short' })}</span>` +
          PRAYERS.map(p => `<span class="f${isT && r[p] ? ' new' : ''}">${prayerFlower(p, r[p])}</span>`).join('') +
          `<span class="x">${r.tahajjud || r.witr ? icon('nights') : ''}</span>`);
      });
      c.appendChild(t); pg.appendChild(c);
      c.insertAdjacentHTML('beforeend', '<div class="hhb-none">A flower grows for every prayer. Nothing ever wilts.</div>');
    },
    family(pg, sub){
      const st = guideState(), hs = st.hearts || {};
      const tot = FAMILY_ORDER.reduce((a, [k]) => a + (hs[k] || 0), 0); sub.textContent = tot ? tot + (tot === 1 ? ' heart' : ' hearts') : 'Help your family to earn hearts';
      const box = document.createElement('div'); box.className = 'hhb-fam';
      FAMILY_ORDER.forEach(([k, name]) => {
        const n = hs[k] || 0, p = document.createElement('button'); p.className = 'hhb-person'; p.setAttribute('aria-label', name);
        let hearts = ''; for (let i = 0; i < Math.min(n, 10); i++) hearts += icon('heart');
        if (!n) hearts = icon('heart', { outline: true }) + icon('heart', { outline: true }) + icon('heart', { outline: true });
        p.innerHTML = `<span class="fig">${figure(k)}</span><b></b><span class="hs">${hearts}${n > 10 ? '<em>' + n + '</em>' : ''}</span>`; p.querySelector('b').textContent = name;
        p.addEventListener('click', e => { e.stopPropagation(); sfx('b_stick'); say(name + (n ? ', ' + n + (n === 1 ? ' heart' : ' hearts') : '')); p.classList.remove('wig'); void p.offsetWidth; p.classList.add('wig'); });
        box.appendChild(p);
      });
      pg.appendChild(box);
    },
    garden(pg, sub){
      const G = safe(() => window.HHDays.garden(), { plots: {}, harvested: {} }), hv = G.harvested || {}, S = (window.HHDays && HHDays.SEEDS) || {};
      const n = SEEDS.filter(s => hv[s]).length; sub.textContent = n + ' of ' + SEEDS.length + ' grown';
      const c = card('Grown in my garden', 'basket'); const g = grid();
      SEEDS.forEach((s, i) => { const k = hv[s] || 0; g.appendChild(sticker({ icon: s, name: (S[s] && S[s].name) || s, level: k >= 10 ? 3 : k >= 3 ? 2 : k ? 1 : 0, count: k, from: k >= 10 ? 10 : k >= 3 ? 3 : 1, next: k >= 10 ? 0 : k >= 3 ? 10 : k ? 3 : 0, seed: i + 3 })); });
      c.appendChild(g); pg.appendChild(c);
      const growing = Object.keys(G.plots || {}).filter(p => G.plots[p] && G.plots[p].seed);
      const c2 = card('Growing now', 'sprout');
      if (growing.length){ const w = document.createElement('div'); w.className = 'hhb-grow';
        growing.forEach(p => { const sd = G.plots[p].seed, stg = safe(() => HHDays.stage(p, now()), 0); w.insertAdjacentHTML('beforeend', `<span>${icon(stg >= 3 ? sd : stg >= 1 ? 'sprout' : 'seeds')}${(S[sd] && S[sd].name) || sd}</span>`); });
        c2.appendChild(w); }
      else c2.insertAdjacentHTML('beforeend', '<div class="hhb-none">Plant a seed in the garden. It grows a little every day you water it.</div>');
      pg.appendChild(c2);
    },
    special(pg, sub){
      const sp = guideState().special || {}, n = SPECIAL.filter(s => sp[s.id]).length; sub.textContent = n ? n + ' special ' + (n === 1 ? 'day' : 'days') : 'Help on a special day to get its sticker';
      const g = grid(); SPECIAL.forEach((s, i) => { const k = (sp[s.id] || []).length || 0; g.appendChild(sticker({ icon: s.icon, name: s.name, level: k >= 10 ? 3 : k >= 3 ? 2 : k ? 1 : 0, count: k, from: k >= 10 ? 10 : k >= 3 ? 3 : 1, next: k >= 10 ? 0 : k >= 3 ? 10 : k ? 3 : 0, seed: i + 7 })); });
      pg.appendChild(g);
    },
  };
  const now = () => (window.HL && HL.now) ? HL.now() : new Date();

  // the family members, faceless and hand-inked (house/family.js), drawn once and kept
  function figure(k){
    famCache = famCache || {};
    if (famCache[k]) return famCache[k];
    let s = '';
    try {
      if (window.FAMILY && FAMILY.draw && typeof P === 'function'){
        const it = FAMILY.draw(k, 'stand', [0, 0, 0], 30, 0)[0], b = it.box, pts = [];
        for (const x of [b[0][0], b[1][0]]) for (const y of [b[0][1], b[1][1]]) for (const z of [b[0][2], b[1][2]]) pts.push(P(x, y, z));
        const xs = pts.map(t => t[0]), ys = pts.map(t => t[1]), pad = 4, vb = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + 2*pad, Math.max(...ys) - Math.min(...ys) + 2*pad];
        const inner = typeof inkScale === 'function' ? inkScale(it.svg) : it.svg, hgt = { abu: 120, ummi: 114, sister: 92, toddler: 66 }[k] || 100;
        s = `<svg viewBox="${vb.map(v => v.toFixed(1)).join(' ')}" style="--h:${hgt}px"><g filter="url(#hand)">${inner}</g></svg>`;
      }
    } catch (e) { s = ''; }
    if (!s) s = icon('heart');
    return (famCache[k] = s);
  }

  window.HHBook = { mount, open, close, icon, ICONS: I, branch, prayerFlower, GIFTS, GIFT_NAME, SPECIAL, refresh: markNew, get mounted(){ return mounted; } };
  // mount on its own when the house is there (the guide also mounts it)
  function auto(){ if (window.HOUSE && !mounted) mount(window.HOUSE); }
  if (document.readyState === 'complete') setTimeout(auto, 200); else addEventListener('load', () => setTimeout(auto, 200));
})();
