# Quiz catalog plan

Audit date: 2026-11-10. Scope: the separate quiz catalog (`quizzes.html`) and its six quizzes.
Decision: **scrap the six quiz pages and build a new, wider catalog** of twenty-eight quizzes on one shared engine. Keep only the usable question content.
Quality bar: the same as `game-quality-plan.md`. A quiz should feel like one of the rebuilt games, not a web form.

Age target: **4 to 12**, in three bands.
Owner rules carried over: full-screen stage, no faces in any art, no music, every control visibly does something, plays offline, touch first, one phase at a time with a browser walkthrough before commit.

---

## 1. Why scrap, not repair

| # | Quiz | Verdict | Main problems |
|---|------|---------|---------------|
| 1 | Math Challenge | Scrap | Canva "Save Page As" copy. Still has the **hidden `allow="microphone"` iframe**, the Cloudflare injector, a 404 `saved_resource` script and ~1,700 lines of screen-recorder CSS. Text sums only, lives and game over. |
| 2 | Geography Quiz | Scrap | Tailwind and Google Fonts from CDNs (unstyled offline). A geography quiz with no map and no pictures. Countdown timer, 3 lives, "Game Over". 40 questions. |
| 3 | History Quiz | Scrap | Same template and faults as Geography. 40 questions. |
| 4 | Science Quiz | Scrap, mine the questions | Same template family. 120 questions of very mixed level. |
| 5 | Quran Quest | Scrap | Page title is "Document". Rewards answering fast. `alert()`, settings select box, ~40 unsourced questions. |
| 6 | Ramadan Quest | Scrap the page, **keep the content** | 120 questions in English and Bengali, no CDN. Still a text card with four buttons. |

All six share one template (gradient, white card, four text buttons), one question type, reading-only play, and timers or lives instead of teaching.
There is nothing in the code worth keeping. What is worth keeping: Ramadan Quest's bilingual bank, the better Science questions, and the 120 Bengali questions in `Quiz Questions.md`.

---

## 2. Phase Q0 — make the old pages safe until they are replaced

1. **Math Challenge:** delete the microphone iframe, the Cloudflare injector, the `saved_resource` script and iframe, the screen-recorder CSS and the stray file input.
2. **Geography, History, Science, Quran Quest:** remove the CDN links so nothing is requested from another site.
3. Check whether the Kahf Kids app links to any quiz URL directly. If it does, each old folder keeps a small redirect page when its replacement ships; if not, the folder is deleted.
4. Bump `GAMES_CACHE` in `sw.js`.

---

## 3. Three age bands

Picked once with a picture button, remembered, changeable from the pause sheet. Every quiz has content for all three.

| Band | Ages | How it plays |
|------|------|--------------|
| **Seedling** | 4–6 | No reading needed. Spoken question, picture answers, 2–3 choices, 4 questions per stop. |
| **Explorer** | 7–9 | Short text plus pictures, all question types, 3–4 choices, 6 questions per stop. |
| **Champion** | 10–12 | Reasoning and multi-step questions, text answers allowed, 8 questions per stop, boss stops and the timed round. |

---

## 4. What makes it engaging and challenging

**Engaging**
- **A journey, not a list.** Each quiz is a path of stops through its own world; the world visibly changes as stops are finished (lanterns light, a garden grows, a map fills in).
- **Seven question types** mixed inside a stop: tap the picture, tap the place (map or scene), match pairs, put in order, sort into two baskets, yes or no, text choice (never more than half a stop).
- **A wrong tap teaches.** The tapped answer wiggles, the right one lights up, a one-line "why" is shown and spoken, and the question comes back later.
- **Collecting.** Each stop gives 1–3 stars and each finished world gives a picture card for a sticker book on the catalog page.
- **Today's five.** One short mixed round a day on the catalog page, drawn from quizzes the child has opened. No penalty for a missed day.
- Recorded Arabic praise on correct answers and confetti at the end of a stop. Sounds are natural and non-musical, as in the games (no notes or rising scales).

**Challenging, without punishing**
- **No lives and no game over** on the path, at any age. Challenge comes from the questions, not from fear of losing.
- **Three stars are hard:** every question right on the first try.
- **Mastery:** a question is retired only after two first-try answers; missed ones return in later stops.
- **Boss stop** at the end of each world: 10 mixed questions from that world, with one level harder mixed in.
- **Lightning round** (Explorer and Champion only, optional): the clock counts up and the child beats their own best time. Nothing fails when time passes.
- **Level-up offer:** a child who three-stars a whole world is offered the next band.

---

## 5. The new catalog: twenty-eight quizzes on three shelves

Owner direction (2026-11-10): **widen the catalog**, with Islamic and Quranic quizzes as the larger part alongside the world quizzes.
Sixteen core titles (1–16) and twelve more (17–28), released in waves. The list can stop after any wave.
Once the engine exists, a new quiz is question data plus art, with no new code, so the catalog can keep growing.

**Shelf 1: The Quran**

| # | Quiz | World and journey | Signature types | Source content |
|---|------|-------------------|-----------------|----------------|
| 1 | **Quran Explorer** | Caravan path between oases: surah names, juz, Makkah and Madinah surahs, numbers of the Quran. | Match, order, tap the picture. | New, with a reference for every answer. |
| 2 | **Short Surahs** | Juz Amma as a path of 37 small gates, from An-Nas back to An-Naba. | Hear an ayah and pick the surah, put the ayat in order, match surah to its message, next-ayah for Champion. | New. Needs recitation audio (see open decisions). |
| 3 | **Stories of the Prophets** | A night sky; each finished story lights a star group. Told through objects (ark, whale, staff, well). **No figures drawn.** | Match object to story, order the events. | Prophets set in `Quiz Questions.md` + new. |
| 4 | **Creation in the Quran** | A valley that fills with the animals, plants, sky and water the Quran mentions. | Sort, tap the picture, match the creature to its surah. | New. |
| 5 | **Quran Words** | A lantern-lit library; each shelf is a set of common Quranic words. | Match word to picture, hear and tap, find the word in a short ayah. | New. Word list by frequency. |
| 6 | **Arabic Letters** | A garden where each letter is a plant that blooms. | Hear and tap, match letter forms, harakat, first sound of a word. | New. Needs recorded letter sounds. |

**Shelf 2: Living Islam**

| # | Quiz | World and journey | Signature types | Source content |
|---|------|-------------------|-----------------|----------------|
| 7 | **Ramadan Nights** | 30 lantern stops, one per night; the moon grows and wanes. | Sort (breaks the fast or not), order (the day from suhur to tarawih). | Ramadan Quest bank + Ramadan set in `Quiz Questions.md`. |
| 8 | **Salah and Wudu** | A day at the masjid, from Fajr to Isha. | Order the steps, tap the part, match prayer to time and rakat. | New; reuses what was verified for Helping Home. |
| 9 | **Pillars and Beliefs** | Five arches and six lights: the pillars of Islam, the articles of iman, the Names of Allah. | Match name to meaning, sort, yes or no. | New. |
| 10 | **Life of the Prophet ﷺ** | A road from Makkah to Madinah, told through places and objects. **No figures drawn.** | Put in order, tap the place, match. | New + prophets and history sets in `Quiz Questions.md`. |
| 11 | **Good Manners and Duas** | A neighbourhood street; each house is a situation. | "What would you do?" picture scenarios, match dua to moment. | Parents and dua sets in `Quiz Questions.md` + new. |
| 12 | **Hajj Journey** | A map of the Hajj places, walked in order. | Order the steps, tap the place. | New. |

**Shelf 3: The world**

| # | Quiz | World and journey | Signature types | Source content |
|---|------|-------------------|-----------------|----------------|
| 13 | **Number Garden** | A garden that grows. Problems are generated, not written. | Count, number line, make ten, share equally, then times tables, fractions and word problems for Champion. | New (replaces Math Challenge). |
| 14 | **World Explorer** | An illustrated world map; seven continents. | Tap the place, match landmark to country, animals and their homes. | New (replaces Geography). |
| 15 | **Nature and Science** | Four small worlds: body, living things, earth and weather, space. | Sort (living or not, sinks or floats), order (life cycles), tap the part. | Best of the Science bank + new. |
| 16 | **Time Travellers** | A road through the ages, including Muslim scholars and inventions. | Put in order, match invention to use. | New (replaces History). Explorer and Champion only at first. |

**More quizzes (second round)**

| # | Quiz | Shelf | World and journey | Signature types |
|---|------|-------|-------------------|-----------------|
| 17 | **Names of Allah** | Quran | 99 lights in a night sky, lit in small groups. | Match name to meaning, hear and tap, which name fits this moment. |
| 18 | **Tajweed Basics** | Quran | A reciter's path of signs. Champion only at first. | Hear two readings and pick the right one, spot the rule, where the sound comes from. Needs audio. |
| 19 | **Hadith for Kids** | Living Islam | A tree of 40 short hadith, one leaf each. | Finish the hadith, match hadith to situation. |
| 20 | **Sunnah Every Day** | Living Islam | A day from waking to sleeping. | Order the steps (eating, sleeping, entering the home), right hand or left, match dua to moment. |
| 21 | **Companions and Great Women of Islam** | Living Islam | A gallery of objects and places, one per person. **No figures drawn.** | Match the person to what they are known for, order the events. |
| 22 | **Islamic Months and Eid** | Living Islam | A wheel of twelve months with the moon's phases. | Order the months, match the day to its month, moon phases. |
| 23 | **Masjids of the World** | Living Islam | A world map of famous masjids, starting with the three holy masjids. | Tap the place, match masjid to country, parts of a masjid. |
| 24 | **Think It Through** | World | A workshop of locks that open. | Odd one out, what comes next, riddles, simple logic grids for Champion. |
| 25 | **Words: Bangla and English** | World | A market street of picture stalls. | Letter sounds, picture to word, opposites, spelling, missing word for Champion. |
| 26 | **Animals of the World** | World | Habitats that fill up: forest, sea, desert, ice. | Match animal to home, food and young; sort by group. |
| 27 | **Healthy Me** | World | A day of good habits. | Sort healthy or not, order (washing hands, brushing teeth), parts of the body. |
| 28 | **Time and Money** | World | A clock tower and a small shop. | Read the clock, days and months, count coins, give change. |

Quizzes 17–23 follow the same authentic-source rules as the rest of the Islamic shelves.

### Content rules (what "appropriate" means here)
- **Authentic sources only, no separate sign-off step** (owner, 2026-11-10). Every Islamic question is written from the source, looked up at writing time, never from memory:
  - **Quran:** surah and ayah number; Arabic from one checked Uthmani text (Tanzil or quran.com), with full harakat.
  - **Hadith:** Sahih al-Bukhari or Sahih Muslim first; other collections only when graded sahih or hasan. Collection and number recorded. No weak or unsourced narrations.
  - **Stories of the prophets and seerah:** only what the Quran and sahih hadith state; no Israiliyyat or folk detail.
  - **Translations:** one named published English and one named published Bengali translation, quoted, not re-translated.
  - A question that cannot be given a reference is dropped. The old banks and `Quiz Questions.md` are treated as ideas, and each question is re-checked against a source before it is used.
  - A check script fails the build if any Islamic question has no `ref`. The reference is shown to the child's parent on the "why" card.
- Stick to what is agreed across schools of thought; skip rulings that differ.
- No prophets, angels or companions drawn. No faces on anyone or anything.
- Nothing frightening for Seedlings: no punishment, death or war questions. History and seerah avoid battle detail at every band.
- No symbols or festivals of other religions as answer options.
- Maps: continents and well-known countries; avoid disputed borders.
- No trick questions, no "all of the above", and wrong options must be clearly wrong to someone who knows the answer.
- English and Bengali in every quiz. Each question has an id, band, "why" line and source.
- Target size at launch: about 120 questions per quiz (40 per band), growing later without code changes.

---

## 6. One engine (`/KidsGames/js/quiz/`)

Same idea as `js/board/`: one engine on top of `js/kit/`; each quiz is a small page with its own art, palette and data.

| Part | What it does |
|------|--------------|
| `quiz.js` | Runs a stop, picks questions by band and mastery, awards stars, saves with `Kit.store`, and makes the bridge calls in section 8. |
| `types.js` | The seven question types, drawn on the full-screen stage. |
| `path.js` | The journey map with stops, stars and boss stops. Launch goes straight to the next unplayed stop. |
| `quiz.css` | Layout on `kit.css`: safe areas, big tap targets, Bengali and Arabic text sizing. |
| `<quiz>/data.js`, `<quiz>/art.js` | Question bank and SVG pictures in the Kahf world style. |

**Voice:** questions and "why" lines are spoken through `Kit.say`. Whether the app WebView has a usable voice on Android and iOS, in English and Bengali, must be checked on phones first. If it doesn't, Seedling needs recorded clips.

**New catalog page (`quizzes.html`):** hub style, three shelves (The Quran, Living Islam, The world), each tile showing its stars, the band picker, Today's five and the sticker book.

---

## 7. Built for the app WebView (phone and tablet)

The quizzes run inside the Kahf Kids app's WebView first. What the app does today (`expo-app/components/pwa-webview/`, `features/quizzes/`):
- It opens `quizzes.html` in one WebView with `theme`, `brightness` and `hideHeader` in the URL.
- **Any link tapped on the catalog page is caught by the app and opened as a new screen** with its own WebView. So each quiz is its own page, and everything else on the catalog page (band picker, Today's five, sticker book) must work **in the page without changing the URL**.
- Quiz pages never link out or back; the app's own header and back button do that. No fullscreen button.
- Progress is shared between the catalog and the quiz screens through `localStorage` on the same origin. To check on both phones in Q1.
- Android uses the service worker for offline. iOS is online-only, so a slow first load must show a loading state and a retry, never a blank screen.

**Budgets**

| What | Budget |
|------|--------|
| Engine (`js/quiz/` + kit), shared by every quiz | under 120 KB, cached once |
| One quiz, first screen (page, palette, first world's art, first stops' questions) | under 250 KB |
| Playable after a tap on the catalog | under 2 s on a repeat visit, under 4 s on a first visit over 4G |
| Animation | 60 fps on a low-end Android phone; same speed at 60 and 120 Hz |
| Memory | no more than one world's art held at a time |

**How**
- **Text in the DOM, effects on canvas.** Bengali and Arabic need the browser's text shaping, so questions and answers are real text; the path map, particles and confetti use the kit canvas.
- Animate only `transform` and `opacity`. No `backdrop-filter`, no large blurred shadows, no CSS filters on moving things (they stutter in Android WebView).
- **No idle loop.** The frame loop runs only while something is moving, so a child reading a question costs no battery.
- Art is SVG drawn once into bitmaps at the screen's real pixel ratio and reused (the Helping Home approach: full sharpness, no per-frame vector work). Each world's art loads when that world opens.
- Questions are split into small files per world and band, loaded when needed.
- Fonts are local `woff2`, subset to the Bengali and Arabic characters used, with the Quran font matching the app's.
- Audio: sounds and praise through WebAudio (as the kit does now). Recitation and letter sounds are short mono AAC/MP3 clips, loaded per stop, with the next question's clip fetched ahead.
- Saves are small and written at the end of a question, not on every tap.
- Pauses and silences on `visibilitychange`.

**Layouts** (all inside safe areas, tap targets 48px or more, drag always has a tap alternative)
- Phone portrait: question on top, answers in the thumb zone.
- Phone landscape and tablet landscape: question and picture on the left, answers on the right.
- Tablet portrait: larger pictures and a 2×2 answer grid; never a stretched phone layout.
- Follows the app's `brightness` (light or dark) on the catalog page.

---

## 8. What the app hears (activity bridge, protocol v1)

The app counts learning from five events sent by `js/kahf-bridge.js`. For the quiz track the rule today (`packages/data/src/engagement/activity-credit.ts`) is: **5 answers, or 1 completed round, or 3 minutes of real use** earns the day's credit. Only pages on `kahfkids.github.io` are trusted.

| Event | Sent when | Engine rule |
|-------|-----------|-------------|
| `answer` | `KahfBridge.answer()` | Once per question when the child commits an answer: a tapped choice, a finished match, a finished order, a finished sort. Never for the reveal, a replay, a hint or a timeout. |
| `complete` | `KahfBridge.complete()` | Once at the end of a stop, a boss stop, a lightning round and Today's five. Not for opening or quitting. |
| `item` | `KahfBridge.item(id)` | When the child opens a learning card (a sticker-book card, a name of Allah, a hadith leaf). Id is stable and short: `<quiz>:<card>` (64 characters at most). |
| `media_done` | automatic | Fires when an `<audio>` or `<video>` plays to the end. So **only real listening** (a full ayah, a dua) is played through `<audio>`; sounds, praise and spoken questions stay on WebAudio so they send nothing. |
| `active` | automatic | 30 s of real use. Needs a touch in the last 15 s, so nothing to do. |

- A Seedling stop has only 4 questions, so its credit comes from `complete`; every stop must end with it.
- All calls go through `Kit.bridge`, which never throws, and there is one place in the engine that makes them.
- **No change to `kahf-bridge.js` or to `v`.** The app drops any message whose `v` is not 1, so a bump would stop credit in every installed app version.
- **If the app wants richer achievements** (stars earned, a world finished, a quiz mastered), that needs a new event. It can be added later without breaking old apps, because they ignore events they don't know, but it is an app-side change and a decision for the app team. The engine keeps stars, worlds and mastery in one place so such an event is one line when wanted.

---

## 9. Definition of done (each quiz)

Checked at 360×640, 375×812, landscape phone, 768×1024, 1024×768 and desktop.
- Everything in the game plan's definition of done (offline, no outside requests, full screen, pauses in the background, sound with mute, 48px targets, no `alert()`, no emoji as art, no faces).
- A child who cannot read can finish a Seedling stop.
- A 12-year-old does not three-star a Champion boss stop without thinking.
- At least four question types in the first three stops.
- Stars, mastery and band saved and restored; all three bridge calls made.
- English and Bengali complete, no clipped text.
- Every Islamic question carries a checked reference; the check script passes.
- Meets the WebView budgets in section 7 on a low-end Android phone and an iPad.
- Bridge calls match section 8, checked with a message log in the browser.

---

## 10. Order of work

1. **Q0:** make the old pages safe (section 2).
2. **Q1:** the engine plus **Ramadan Nights** as the reference quiz, all three bands. Review before going wider.
3. **Q2, Islamic wave:** Quran Explorer, Stories of the Prophets, Salah and Wudu, Good Manners and Duas.
4. **Q3, world wave:** Number Garden, World Explorer, Nature and Science, Time Travellers.
5. **Q4, audio wave:** Short Surahs and Quran Words. Arabic Letters waits for a checked source of letter sounds.
6. **Q5:** Creation in the Quran, Pillars and Beliefs, Life of the Prophet ﷺ, Hajj Journey.
7. **Q6, second round:** quizzes 17–28, Islamic ones first.
8. **Catalog page:** built after Q2 with the first five quizzes and updated with every wave. It has Today's five and the sticker book. Quizzes go back on the main hub at the same time; bump the version.
9. Each old quiz is removed the moment its replacement ships. Each new quiz is tested in the Kahf app on an iPhone and an Android phone.

## 11. Decisions taken

Owner direction (2026-11-10): there is no one else to review or record, so Claude owns this plan, its content and its decisions. These are settled unless the owner says otherwise.

| Question | Decision |
|----------|----------|
| Who checks the Islamic content | No human sign-off. Every question is written from its source and then **checked a second time, separately, against the fetched source text** before it ships. Questions are kept to what the cited text plainly says. The reference is visible on the "why" card so anyone can check it. |
| Translations | Questions are written in simple children's words with a reference. Direct quotes are short and come from Saheeh International (English) and Muhiuddin Khan (Bengali), both as published on Tanzil; their terms of use are confirmed when the text is fetched, and if either cannot be used the quiz paraphrases with the reference instead. |
| Voice for the youngest band | No recorded question clips (nobody to record them). Seedling questions are built to be understood from pictures alone, with a moving-hand example on the first question of each type. The device's own voice is used when the WebView has one, as an extra. |
| Recitation audio | Verse-by-verse recitation of Juz Amma by one reciter in a clear teaching style (Al-Husary, Muallim), from EveryAyah; terms confirmed at download. Loaded per surah, never bundled whole. |
| Letter sounds | No checked source yet. **Arabic Letters and Tajweed Basics wait** until one is found; they are not built on synthetic or unverified audio. |
| Achievements in the app | The five existing bridge events are enough for now. No change to the bridge or the app. |
| How far to go | Build wave by wave through Q5 (sixteen quizzes), then the second round. Each wave is usable on its own. |

## 12. Limits to know about

- Claude cannot hold a phone. Browser checks at phone and tablet sizes are done every phase; the real test in the Kahf app on an iPhone and an Android phone still needs a person.
- Source-checked is not the same as scholar-reviewed. Sticking to plainly stated facts with visible references keeps the risk low, and any question can be pulled by deleting one entry.
- Push is deploy. Work is committed on main after a browser walkthrough and pushed only when the owner says so.

## 13. Status

**2026-11-10: Q0 and Q1 built, not yet committed or deployed.**
- **Q0:** Math Challenge leftovers removed (microphone iframe, Cloudflare injector, saved scripts, screen-recorder CSS). Tailwind compiled into Geography, History and Science; Google Fonts links removed from all five. No quiz page requests another site.
- **Engine:** `js/quiz/quiz.js` and `js/quiz/quiz.css`. Journey map, five question types (choice, yes or no, sort, put in order, match), three bands, English and Bengali, stars, mastery, bridge calls. `?q=<id>` opens a stop with one question first, for checking.
- **Ramadan Nights:** `games/ramadan-nights/`. 68 questions (20 Seedling, 26 Explorer, 22 Champion), each with a reference that was opened and read. `games/ramadan-quest/` is now a redirect.
- **Not built yet:** "tap the place" questions, the lightning round, Today's five, the sticker book, `KahfBridge.item()` calls, recitation audio.
- **Known gaps:** the bank is 68 questions, short of the 120 target, and bands 2 and 3 are mostly text choice; more sort, order and match questions are needed. Not tested on a real phone or inside the Kahf app. The catalog tile still uses the old Ramadan Quest thumbnail.
