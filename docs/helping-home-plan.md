# Helping Home: plan

## Vision (read this first)

**A calm, hand-drawn 3D home where a Muslim child (4–10) practises a believer's day: hearing the adhan and answering it, making wudu, praying at the real prayer time, and helping keep the home clean. The home slowly becomes their own.**

Three pillars:
1. **Prayer on time.** Real prayer times for the child's location (the five prayers plus tahajjud). The house reacts when it's time: the adhan plays, then wudu, then salah, all guided step by step.
2. **Helping at home.** Real chores on real machines (laundry, dishes, tidying), with how they work shown inside.
3. **My room.** Every finished prayer guide and chore earns decorations the child places in their own room.

Non-negotiables:
- **Learn by doing real steps**, not quizzes. No timers, no failing, and worship is never scored.
- **No character models.** Objects, first-person hands, a body map with no face, and mat contact points only.
- **One hand-drawn 3D style** (Colorfigures look), not "AI slop".
- **Built for the Kahf app WebView first:** touch, fast on cheap Android phones, and a quick first load on iOS (no offline mode there). It also works on the web and the PWA, with no CDN.
- **Accuracy over speed:** real recitation audio with credits, and teacher sign-off on all religious content.

---

## Status and roadmap (2026-11-09): the current plan; older phase lists below are superseded

### Built so far (uncommitted, waiting for your walkthrough)
| Part | State |
|---|---|
| **House** (`index.html`, `house/`) | A three-floor cutaway: bedroom; laundry with the wudu corner; prayer corner; kitchen with the hall; a garden strip. The light follows the real clock and prayer times. Mess appears by time of day and is tidied by dragging or tapping. Each room has a tidy level and stars, and My Room has 6 decorations. The first visit asks for the child's hand colour. Saved on the device. Turning, dragging and zooming run at 60 fps on a slow-phone profile. |
| **Washing machine** (`jobs/`) | The full wash, see-inside with labels, Wash choice removed, a Home button. |
| **Adhan** (`pray/adhan.html`) | A minaret that plays the adhan phrase by phrase, with Arabic, transliteration and meaning, and the child's reply to each phrase. Then the salawat and the du'a. |
| **Wudu** (`pray/wudu.html`) | All 10 steps, a tap with a water meter, first-person hands, a faceless body map, "Do it with me" and Practice. |
| **Salah** (`pray/salah.html`) | Rolling out the mat, the qibla compass, then each position with mat contact points, a faceless posture outline, the words and audio. **Fard only:** Fajr 2, Dhuhr 4, Asr 4, Maghrib 3, Isha 4, and tahajjud as 2. |
| **Prayer times** (`iso/prayer.js`, `settings.html`) | adhan-js on the device, the five prayers plus tahajjud, 466 offline cities, method and Asr settings. Within ±2 min of published times (London ±6). |
| **Audio** (`audio/`) | 31 of 49 clips are real, licensed recordings (1.1 MB): the whole adhan, al-Fatihah, al-Ikhlas and al-Kawthar. 18 are missing (Fajr phrase, ruku', sujood, tashahhud and others), so those show text for now. |
| **Flow and offline** | House → adhan → wudu → salah → back to the house with a celebration. The house precaches all 66 files (1.6 MB) for offline. A hub entry, thumbnail and version 1.5.0. |

### Gaps (from your review)
Stairs; the family; meals, sweeping, wiping, bins; school; a yard to play in; reasons to come back daily; **salah only teaches the fard**.

### Phases from here (one at a time, your walkthrough and OK before each commit)
1. **Review what's built.** Walk through on a phone; fix what you find; commit (no push).
2. **Complete salah.** A daily prayer chart showing what to pray at each time, split into **fard** (obligatory), **sunnah mu'akkadah** (the Prophet ﷺ's regular sunnah) and **witr**:

   | Time | Before | Fard | After |
   |---|---|---|---|
   | Fajr | 2 sunnah | 2 | – |
   | Dhuhr | 4 sunnah (Hanafi) / 2 (Shafi'i, Hanbali) | 4 | 2 sunnah |
   | Asr | (4 non-emphasised, optional) | 4 | – |
   | Maghrib | – | 3 | 2 sunnah |
   | Isha | – | 4 | 2 sunnah, then **witr**: wajib and 3 rak'ah for Hanafi; sunnah and 1 or 3 for others |
   | Jumu'ah | (at the mosque: 2 fard after the khutbah; at home, a child prays Dhuhr) | | |
   | Tahajjud | prayed in pairs (2 + 2 …), then witr if not prayed after Isha | | |

   The chart follows the madhab chosen in settings (it is already saved for Asr). The guide runs each prayer in turn: sunnah, then fard, then sunnah, and witr with its qunut du'a. The 2-rak'ah sunnah prayers reuse the fard guide. Each prayer prayed is ticked on the chart (fard in gold, sunnah in green), never scored. Also: the remaining 18 audio clips. **Teacher sign-off on all of this.**
3. **Complete the house.** A bigger family home with a room for everyone, still one cutaway on one screen. Each room has its own jobs and a tidy level:
   | Floor | Rooms |
   |---|---|
   | Top | **My Room** (the child's own, decorated with rewards) · **Sister's room** (desk, books, her drawings) · **Toddler's nursery** (cot, toy chest, the most mess) |
   | Middle | **Abu and Ummi's room** (bed, wardrobe, Abu's prayer mat) · **Bathroom** (brushing teeth with a miswak, Friday ghusl, towels; the wudu sink is here) · **Prayer corner** (mats, Qur'an shelf) |
   | Ground | **Living room** (cushions, guests, family story time) · **Kitchen and dining** · **Hall** (shoes, coats) · **Laundry** by the back door to the yard |
   Plus the stairs between floors; one small yard (swing, ball, sandpit, a vegetable bed, the clothesline, a tree with a bird feeder); chores by time of day: setting and clearing the table for 3 meals, wiping the table, sweeping, the bins, packing the schoolbag on school days, homework to the desk, folding the washing.
4. **The family and the street.** Faceless hand-inked Abu, Ummi, older sister and toddler brother, run by needs and smart objects (see "Living world design"): work, cooking, homework, play. The neighbourhood street around the house: mosque, park, shop, school, neighbours. Play with siblings. They ask for help with a bubble; helping earns a hug and a heart. At Maghrib they all pray together, with the child's place waiting.
5. **Reasons to come back** (section "Engagement and retention"): a prayer garden (a flower for each prayer, nothing wilts), seeds that grow over days and become a family meal, one daily surprise, "what changed since you left", a sticker book, and the Hijri calendar (Jumu'ah Friday with the al-Kahf card, Ramadan, Eid, white days).
6. **Release.** Test in the Kahf app on a cheap Android phone and on iOS; check memory (the turn cache) on a low-end phone; register the service worker from the house page too; your OK, then push.

### Living world design (added after review: "only the house on white is boring", "more daily activity")

**How other games keep children coming back, and what we take**
| Game | What makes it work | What we take |
|---|---|---|
| **The Sims** | **Needs plus smart objects.** Each person has needs (hunger, fun, hygiene, energy) that slowly drop. Every object *advertises* what it satisfies (a fridge offers "hunger +", a ball offers "fun +"), and people pick the best offer. Stories emerge with no script, and their side effects (dirty plates, scattered toys) create the next job. | The family runs on simple needs and smart objects. Their life *makes* the mess and the requests, so every day is different without hand-writing days. |
| **Animal Crossing** | The real clock; a small daily refresh (new items, a visitor, a few tasks); neighbours who ask favours; things that grow over days; seasons and holidays; collections. A short session that ends naturally. | Real time and prayer times, a daily refresh seeded by date, neighbours' favours, the garden, the Hijri calendar, the sticker book. |
| **Toca Life** | A pretend-play sandbox with no goals: every object can be picked up and does something. | Everything in the house and yard can be picked up and played with, even when no chore needs it. |
| **Stardew Valley** | Farming loop: plant → water daily → harvest → cook or gift. Friendships grow through small gifts and help. | Garden → harvest → cook a meal with Ummi → share a plate with a neighbour. |

**Procedural content (what "procedural" means here):**
- **Systems, not scripts.** Needs × smart objects × the clock × a day seed decide what the family is doing and what needs help. The toddler gets bored, plays with blocks, and the blocks end up on the floor. Ummi cooks, so there are dishes. The rain-day seed means the washing comes inside.
- **The day seed** (from the date) picks the surprise, the neighbour visit, where the toddler hides, which seeds the shop has, and the weather.
- **Designed pools, randomly combined:** ~25 surprises, ~15 neighbour favours, ~30 chores, ~10 play games. They combine into many different days, and every item in the pools is hand-made, so nothing feels random or cheap.

**The neighbourhood around the house** (fixes the empty white):
- The house stands on **one small street**, a hand-inked diorama: neighbours' houses, **the mosque with its minaret** (the adhan comes from there), the school, a park with a playground, the corner shop, trees, a hill, and the sky with the sun or moon moving on the real clock. Weather comes from the day seed (sun, clouds, rain, and snow in winter).
- It is **a backdrop with a few tappable places, not an open world**. Each place opens a small scene:
  - **Mosque:** Jumu'ah with Abu, praying Maghrib or Isha there, and Ramadan taraweeh lanterns.
  - **Park:** play with siblings: swing, slide, catch, and feeding ducks (drawn as shapes, with no faces).
  - **Shop:** buy the shopping list with Ummi, then put it away in the fridge (sorting).
  - **School:** the bag leaves in the morning and comes back with homework.
  - **A neighbour's door:** take them a plate from the family meal, or help an elderly neighbour with their bags. The Islamic thread here is good neighbourliness.
- **Performance:** the street is drawn once into the static layer, so it costs nothing per frame. Only the sky, weather and people moving are redrawn.

**Daily activities for the child** (each 1–3 minutes; a session is 3–6 of them):
- **Worship:** answer the adhan, wudu, salah (fard and sunnah), the morning and evening du'a, and the bedtime du'a.
- **Chores:** the bed, laundry, setting and clearing the table, dishes, sweeping, wiping, bins, the schoolbag, putting away the shopping.
- **Garden:** plant, water, pull weeds, harvest, cook it with Ummi, share it with a neighbour.
- **Play with siblings:**
  - hide and seek: find the toddler, who hides in a different seeded spot each day
  - building blocks with the toddler, then tidy them away
  - catch in the yard
  - sandcastles
  - pushing the swing
  - reading a story to the toddler at bedtime
  - drawing together (the pictures go on the fridge)
- **Neighbourhood:** the shop trip, a plate for the neighbour, Jumu'ah at the mosque.
- **Care:** feed the birds, fill the cat's water bowl (a neighbour's cat, drawn as a shape with no face).

### Decisions I need from you
- **Sunnah and witr follow the madhab chosen in settings?** (Recommended. The default comes from the country, for example Hanafi for Pakistan, India and Bangladesh.)
- **Audio:** may I ask EveryAyah (or another reciter's site) for permission, or will you supply recordings for the 18 missing clips?
- **The UK default method:** Moonsighting Committee (current), or MWL?
- Free or premium?

---

## Decisions after Phase A (2026-11-09), these override older sections below

1. **House first.** A single machine on blank paper is not a game. The game is **one living house**, a hand-drawn cutaway like a dollhouse on one screen: bedroom, kitchen, laundry corner, wudu corner, prayer corner and a small garden. Machines and guides are stations *inside* it, opened with a zoom (the washing machine is the laundry-corner station).
2. **It feels alive the way a life-sim home does, not by copying any game.** The day follows the real clock, with lighting and the real prayer times. Mess appears on its own: an unmade bed and pyjamas after waking, dishes after meals, toys in the afternoon, the laundry basket filling, thirsty plants. The adhan plays at prayer time and leads to the wudu corner and then the prayer mat.
3. **The child's hand does the work, mostly by dragging.** Socks into the basket, toys into the box, books onto the shelf, dishes to the rack. Tap the bed to make it. Each room has a tidy level that warms its light and adds sparkle. A messy room is dim, never scary. Each day starts with fresh mess, plus an evening tidy-up.
4. **No characters, ever.** The child is the character, and only their hand appears (their own skin tone and sleeve, chosen once). The family shows through signs of life: shoes by the door, a coat on the hook, a cup on the table, a schoolbag, and small picture cards such as "the basket is full".
5. **The Wash choice (Quick / Warm / Gentle) comes off the step bar for now** and the machine stays on Warm. It returns in the laundry room when clothes give a reason to choose (wool jumper → Gentle, muddy socks → Warm).
6. **Next build: the house slice.** The house shell with bedroom, laundry and kitchen. Day clock lighting. Mess appearing, and drag-to-tidy with snapping into containers. Tidy levels. The washing machine moved inside. Then the wudu corner and prayer mat driven by real prayer times.
   Engine work it needs: several objects in one scene (fork `iso/core.js` to mount into a container), drag-and-drop with snap targets, and the layered static/moving drawing reused per room.

## Engagement and retention (decided 2026-11-09, overrides "no characters" above)

The goal: a child wants to come back every day, for good reasons, with no manipulation.

**The family is in the house:** faceless, hand-inked figures in the same style as the salah posture outline (no eyes, no mouth). They are Abu, Ummi, an older sister and a toddler brother. They follow a daily schedule: Ummi cooks, Abu leaves for work and comes home at dusk, the sister does homework, the toddler makes mess. They ask for help with a small bubble icon ("set the table", "find my shoe"). Helping earns a thank-you hug and a heart. At Maghrib the family prays together on mats, and the child's place is waiting.

**The house is complete and small:** three floors with **stairs**, plus **one small yard** (swing, ball, sandpit, vegetable bed, clothesline, a tree with a bird feeder). No open world.

**Chores by time of day:**
- Morning: make the bed, put away pyjamas, pack the schoolbag (school days), set the table for breakfast.
- Midday: clear and wipe the table, dishes to the rack.
- Afternoon: the bag comes home with homework for the desk, the toddler's toys, sweep the floor, water the garden.
- Evening: set the table for dinner, take out the bins, hang or fold the washing, the evening tidy-up, the bedtime du'a.

**Why they come back (healthy hooks):**
1. **Prayer times bring them back five times a day.** Each prayer prayed plants a flower in the **prayer garden** (5 a day, a week visible). A missed prayer simply has no flower. Nothing ever wilts, and there is no streak to lose.
2. **Things grow over days:** seeds planted today sprout tomorrow, are ready in 3–4 days, then get cooked into a family meal. The tree's bird nest hatches over a week (birds drawn as shapes, no faces).
3. **What changed since you left:** opening the game shows the new things (mess, a sprout, a family request, the day's surprise).
4. **One daily surprise**, seeded per date: a neighbour brings food, a letter arrives, a rainy day (laundry goes inside), a new sticker, a bird at the feeder.
5. **Progress you can see:** stars buy decorations for My Room and the yard (a swing seat, lanterns, a rug, a fish bowl). A sticker book has one sticker per chore type in three levels. Tidy rooms glow.
6. **The real Islamic calendar** (Hijri, through Intl):
   - **Jumu'ah Friday:** ghusl, best clothes, perfume, and a Surah al-Kahf card, which ties into the Kahf app.
   - **Ramadan:** suhoor, dates at iftar, lanterns.
   - **Eid:** decorations and gifts.
   - **The white days** and **Monday/Thursday:** small cards.
7. **Warm welcome back:** a missed day brings no loss and no guilt, just "we saved your seat".

**Never:** punishments, things dying, streak-loss fear, timers, ads or purchases, push notifications from the game, or a never-ending feed. A session has a natural end ("the house is cosy, see you at Asr").

---

A new game built with the Colorfigures skill. Children help around a house by working real machines and tidying rooms. Each finished job earns decorations for their own room.

Status: plan only. Nothing is built yet. Same rules as the quality plan: one phase at a time, a browser walkthrough and your OK before each commit.

---

## 1. What Colorfigures is and what we take from it

Colorfigures (MIT licence, by April Zhu) is an **AI skill**, not a game. It's installed at `~/.claude/skills/colorfigures`. You describe an object and it writes one self-contained HTML page:

- a hand-inked, flat-coloured **isometric 3D object** you can drag to turn all the way round
- **working buttons** that follow the real process: doors open, drums spin, items drop
- **See-through** mode, which shows the real parts working inside, with **Labels**
- a small engine (`core.js`, about 56 KB) that redraws the SVG scene, with pointer events, pinch zoom and a phone layout built in

**We take:** the art style (paper grain, ink outlines, three-tone flat shading, blue cast shadow), the engine for drawing machines, and the "press the real step" interaction.
**We don't take:** their example figures (gumball, kettle, and so on), their paid "Colorfigures UI" pack, their page chrome, or the text-only pill buttons.
**Licence:** keep their `LICENSE` text next to our copy of `core.js`, and put "Made with Colorfigures" in plain text on the game's About card. Don't use an outbound link in the app.

### What I checked in the engine
| Topic | Finding | What we do |
|---|---|---|
| Offline / CDN | All inline, no network calls. The only link is the credit footer. | Fine. Remove the footer link. |
| Touch | Pointer events. One-finger drag turns the object, two fingers pinch-zoom. `touch-action: pan-y` on the figure. | Keep the turn. Turn off zoom on phones (kids pinch by accident). Make tap targets at least 56 px. |
| Hand-drawn filter | `feTurbulence` + `feDisplacementMap` over the whole figure. The noise is baked once (`bakeNoise`). The build already switches the filter **off** on touch screens. | Our rule is to keep the look. Bake the inked figure to an image whenever it's still, show that image, and only draw live SVG while something moves. Moving frames then look the same as their output does today. |
| Redraw cost | `art.innerHTML = scene(...)` rebuilds the **whole** SVG string (about 500 nodes) on every animation frame. | Split each figure into a static layer (drawn once per view angle) and a moving layer (drum, door, water). Only the moving layer is rebuilt per frame. Budget: under 6 ms per frame on a low-end Android phone. |
| Page takeover | `mountFigure` replaces `document.body`. One figure per page. | Phase A–B: one page per job (fine). Phase C: fork the engine into `js/iso/` so it mounts into a container and the house can hold several objects. |
| Faces | Objects only, no characters. | Fits our no-faces rule. Hands only appear as the child's own finger. |

### Is it 3D?
Yes. Every object is a real 3D model (in centimetres, with a back, an underside and working insides), and children can turn it all the way round. It's **drawn** as hand-inked, flat-shaded SVG instead of rendered with WebGL. That gives a picture-book look instead of the plastic look of three.js, a much smaller and faster page, and sharp lines at any screen density.

### Art direction (decided)
- **No character models, ever.** No avatars, no cartoon kids, no mascots. That is where "AI slop" comes from, and it also keeps us inside the no-faces rule.
- Objects are the stars: machines, rooms, the prayer mat, the tap, plants. All are drawn in one style, with one palette per room.
- When a body is needed (wudu, salah), we use one of three things, all in the same ink style:
  1. **First-person hands and feet**, the child's own view. Hands and sleeves are built like any other 3D part. The child picks the skin tone once.
  2. **A body map:** a plain silhouette with no features, where the area being washed or touching the ground glows in the accent colour.
  3. **The prayer mat itself:** contact points light up on the mat for each position (two feet; feet and knees; the seven points of sujood).
- Calm, warm palettes like the Colorfigures paper. There are no rainbow gradients, no glossy buttons and no emoji anywhere.

---

## 2. What children this age enjoy (ages 4–10)

The design leans on a few well-established ideas about young children:

1. **Pretend play with grown-up things.** Children love doing "real" jobs they see adults do (the Montessori "practical life" idea). A washing machine that really fills, spins and drains feels like being trusted.
2. **Cause and effect.** Press a thing and something visible happens straight away. This is the main pleasure for ages 4–6.
3. **Mess to clean.** A dirty pile becoming a neat stack is satisfying. Show the before and after clearly and make the "clean" moment sparkle.
4. **Ownership and choice (autonomy).** A room that is *theirs*, decorated how they want, is the strongest long-term reason to come back. Rewards should be things to place, not points.
5. **Competence.** Short jobs (1–3 minutes) they can always finish. No timers, no game over, no losing. A wrong step gets a gentle nudge ("The soap goes in first!"), never a fail.
6. **Curiosity about the inside.** "What's inside?" is a big question at 5–9. See-through mode is a reward and a discovery: "Look, a motor turns the drum!"
7. **Sorting and matching.** Colours into piles, socks into pairs, toys into bins. These are easy to start, show progress, and build early maths and logic.
8. **Routines.** Ordered steps (laundry, wudu, bedtime) make children feel safe and teach sequencing.
9. **Specific praise.** "You sorted all the whites!" works better than "Good job". We already have Arabic praise clips.

### Islamic thread
- Cleanliness is part of faith ("Purity is half of faith", Sahih Muslim). Every job ends with a short line about this.
- The Prophet ﷺ helped his family at home (A'ishah, Sahih al-Bukhari). "Helping at home is Sunnah."
- Not wasting water, even at a river. The wudu tap has a water meter: turn it off in time and get a bonus star.
- The decorations include calligraphy frames, a prayer mat, a qibla compass, lanterns and plants. There are no figurative pictures.

### Safety
Children only do jobs a child can really do at home. The kettle, oven, stove, iron and anything sharp appear only as "grown-up only" objects (a small lock icon) that can be explored in See-through but not used.

---

## 3. The game

**Home screen:** a small isometric house cut open like a dollhouse, drawn in the Colorfigures style. Rooms are greyed out until they're unlocked. Tap a room to zoom in. Inside, each object that needs help glows gently.

**One job =** one Colorfigure station with 3–6 steps. The next thing to tap pulses, so pre-readers never need to read. Each step has a voice prompt and an icon on the button. Tapping the object itself also works (for example, tap the door to open it).

**Reward loop:** finish a job → 1–3 stars → a sticker book of decorations → drag decorations into **My Room**, which is saved. A few decorations only unlock with a perfect run (the water saved, all socks paired), so there's a reason to replay.

### Rooms and jobs (first set)
| Room | Jobs (Colorfigure) | What it teaches |
|---|---|---|
| **Laundry** (first) | **Washing machine:** sort the basket into whites and colours → load → add soap → pick a program → start → watch it spin (See-through: drum, motor, pump) → unload. **Clothesline:** hang to dry in the sun. **Sock pairs.** | Sorting, sequence, how a machine works |
| **Kitchen** | **Sink and drying rack:** scrub, rinse, stack. **Fridge:** put the shopping away (fruit, vegetables, dairy shelves). **Bins:** recycle / compost / rubbish. | Categories, caring for the earth |
| **Bedroom** | **Make the bed** (pillow, sheet, blanket). **Toy box** with sorted bins. **Wardrobe:** hang shirts, fold jumpers. **Night lamp** + bedtime du'a. | Routine, tidiness |
| **Wudu corner** | Full wudu, step by step (see section 3b). **Tap** with a water meter. Towel hook. | Every wudu step in order, not wasting water |
| **Prayer corner** | Hear the **adhan and respond**, roll out the mat, find the **qibla**, then **pray** with guidance (see section 3b). Tidy the bookshelf (Qur'an on top). | Adhan responses, salah positions and words, respect for the prayer space |
| **Garden** | **Watering can** → plants grow over sessions. **Bird feeder** (birds drawn as shapes, no faces). | Patience, caring for creatures |

Grown-up only (explore only): kettle, toaster, oven.

---

## 3b. Prayer time: adhan, wudu and salah

This is the heart of the game, and it's built with more care than the chores. It's a **guide the child follows with their real body**, not a quiz. Each step shows, says and waits, and the child taps "Done" when they've done it for real. There's no scoring on worship. The star comes from finishing, never from speed.

### 1. The adhan
- A wall clock or speaker figure in the house plays the adhan **phrase by phrase**. Each phrase is shown in Arabic, transliteration and meaning.
- After each phrase the child **gives the response**. Two big buttons with audio let them hear the right reply, then tap it:
  - repeat the phrase, except at *hayya 'ala-s-salah* and *hayya 'ala-l-falah*, where the reply is *la hawla wa la quwwata illa billah* (Sahih Muslim)
  - after the adhan: salawat on the Prophet ﷺ, then the du'a *Allahumma rabba hadhihi-d-da'wati-t-tammah…* (Sahih al-Bukhari)
- A wrong reply isn't marked wrong. The right one is played again and the child repeats it.

### 2. Wudu
This uses the tap and basin as a Colorfigure, seen first-person, with the body map beside it.
1. Intention (in the heart, shown as a soft glow), then *Bismillah*
2. Hands to the wrists ×3 (rubbing between the fingers is shown)
3. Mouth ×3 · 4. Nose ×3 (in and out)
5. Face, forehead to chin and ear to ear ×3
6. Right arm to the elbow ×3, then left ×3
7. Wipe the head once (front to back and back again) · 8. Ears
9. Right foot to the ankle ×3, then left ×3 (between the toes)
10. The shahadah du'a after wudu

- Each step shows the hands doing it, the washed area glowing on the body map, a count of 1–2–3 drops, and a voice line.
- The tap's water meter fills only while the tap runs. The child turns it off between steps to save water ("even at a river"), which earns a bonus leaf.
- **Practice mode** (tap the right part next, with a gentle hint if wrong) is separate from **Do it with me mode** (paced along with the child's real wudu).

### 3. Salah
- Roll the mat out (a Colorfigure) and turn the **qibla compass** until it clicks.
- Pick a prayer. It starts with Fajr (2 rak'ah) and opens up to all five with the right rak'ah counts.
- Each position is shown three ways: the **mat contact points**, a small **posture outline** (an ink silhouette with no face), and the **words** in Arabic, transliteration and meaning, with audio.
  - takbir → qiyam (al-Fatihah + a short surah) → ruku' → standing → sujood ×2 with sitting between → second rak'ah → tashahhud → salam right and left
- A rak'ah counter on the mat shows beads filling.
- "Do it with me" is the default: the audio paces the child, and they can pause at any time. Big "I'm done" buttons let a slower child move on.

### Content accuracy
- We use the common Sunnah order that all four madhhabs share. Differences that don't change the order (for example, hand placement) aren't shown as rules.
- **All Arabic text, transliteration, meanings and audio need sign-off from a qualified teacher before release.** Nothing in this section ships on my word alone.
- **Audio comes from existing recordings online:** the adhan, the responses, al-Fatihah, short surahs and the words of salah. Never AI-generated. For each file I check the source's terms and take it only if reuse in an app is allowed. Every file is listed in `games/helping-home/audio/CREDITS.md` (reciter, source, URL, terms). Clips are cut per phrase or per ayah, then compressed to small mono files and **bundled with the game** (not streamed from their servers), so Android and the PWA work offline.
- **Adhan (decided):** the words are the same for all five prayers, except that Fajr adds *as-salatu khayrun min an-nawm* (×2) after the second *hayya 'ala-l-falah*. So we need **one adhan recording** (freely available online, credited), cut into phrases, plus **one extra Fajr phrase clip** inserted for Fajr. That keeps it small and the same everywhere. The response clips follow the same phrase list.
- Candidates for Quran audio: per-ayah Quran recitation sites (one file per ayah suits step-by-step), and published adhan recordings from Makkah and Madinah. Sources with no stated terms are skipped, and for those I'll ask you to get permission.

### Prayer times (exact, on the device)
- Calculated with **adhan-js** (MIT, bundled locally), so there are no network requests and it works offline. Times are to the minute for the five prayers, plus sunrise (end of Fajr).
- **Tahajjud:** the **last third of the night**, from Maghrib to the next Fajr divided into three (`SunnahTimes.lastThirdOfTheNight`). The middle of the night is shown as the end of Isha's preferred time.
- **Location:** the Kahf app passes coordinates if it has them. Otherwise a parent picks the city once from a bundled offline city list. There's no browser location prompt for children.
- **Parent settings:** calculation method (Muslim World League, Umm al-Qura, ISNA, Egyptian, Karachi, and so on) and Asr method (standard or Hanafi). Sensible defaults come from the country.
- **In the game:**
  - A **sky dial** figure (the sun and moon moving over the house) shows today's times. The house lighting follows the real time of day.
  - When a prayer time arrives during play, the speaker plays the adhan and Prayer Time starts with the right prayer and rak'ah count already chosen (Fajr 2, Dhuhr 4, Asr 4, Maghrib 3, Isha 4).
  - Tahajjud is shown as a quiet night-time card with a star, and is optional.
  - A **"Learn the times" mode** teaches what each prayer is tied to: dawn light, the sun past its highest point, shadows growing longer, sunset, full dark, the last third of the night.

---

## 4. Building it

### Tools
- Make each machine with the skill: `/colorfigures a front-loading washing machine with ...`, following its "truth first" research and its multi-angle headless-Chrome checks.
- Our own **"kid pass"** on every figure (a small script plus a shared CSS/JS layer):
  1. Buttons get icons, voice prompts and a pulsing next step. No zoom chip on phones. Labels only in "Explore" mode.
  2. Load `kit/audio.js` sounds and praise clips, and `kahf-bridge.js`. Call `KahfBridge.answer()` on sorting taps and `KahfBridge.complete()` at the end of a job.
  3. Static/moving layer split and the still-frame bake (see section 1).
  4. Pause when hidden, respect safe areas, and remove the credit link.
- Files: `games/helping-home/` with `index.html` (house), `jobs/<job>.html`, `iso/core.js` (pinned copy of their engine plus `LICENSE`), and `iso/kidpass.js`.

### Platform rules (web, app WebView, PWA)
- **The app WebView comes first.** Touch only: no hover, no keyboard hints, no right-click. No fullscreen API in the app. Respect safe areas. Pause audio and animation when the app goes to the background.
- **No CDN, no fonts from the network.** Arabic uses a local font file, a subset to only the glyphs we show.
- **The iOS app has no offline mode** (WebView), so first load must be fast online. Android, web and the PWA cache through `sw.js` (bump `GAMES_CACHE`).
- **Audio:** short mono Opus/AAC clips, loaded per step (not all at once), started from a tap so iOS allows playback. The adhan is split into phrases so it can start before the whole file arrives.
- **One shared engine file** (`iso/core.js` + `kidpass.js`), cached once, instead of being inlined into every job page as their build script does. Each job page then only carries its own figure.

### Offline (PWA, web and Android app): the whole game works with no network
Today `sw.js` caches a game's files only when they are requested. In Helping Home, a child who has never opened the salah page or heard the Fajr clip would hit a gap offline. So:
- **Full precache on first open.** `games/helping-home/offline.json` lists every file the game needs: pages, `iso/core.js`, `kidpass.js`, adhan-js, the city list, the Arabic font, every audio clip and every image. On first launch the game sends it to the service worker (`CACHE_URLS`, which already exists) and shows a small "Ready offline" leaf when everything is stored. The list is generated by a script, so nothing is missed.
- **Size budget for the whole game: under 6 MB**, of which audio is about 4 MB (one adhan cut into phrases, the Fajr phrase, the responses, al-Fatihah plus about 10 short surahs, and salah words, all mono at around 32 kbps). Pages and engine stay under 400 KB.
- **Audio plays through Web Audio** (`fetch` → `decodeAudioData`, as `kit/audio.js` already does), never `<audio src>`. Safari's `<audio>` sends range requests that a cached file can't answer, so it would be silent offline.
- **Prayer times need no network:** adhan-js and the city list are local, and the last location and settings are saved on the device.
- **Saved progress** (stars, My Room, settings) lives in `localStorage` through the kit and is never sent anywhere.
- **Updates:** bump `GAMES_CACHE` and regenerate `offline.json` with every release. The game re-precaches when the version changes.
- **Check each phase** in Chrome DevTools with Offline ticked, after a fresh install: go through every page, every prayer and every audio clip. Also test the installed PWA on iPhone in airplane mode.
- **The iOS app WebView is the exception:** it has no offline mode (decided earlier). There the goal is a fast first load: the home page plus the current room's files first, with the rest fetched in the background.

### Performance rules (no quality loss)
- Nothing is redrawn while nothing moves. The still inked figure is shown as a baked image at full device pixel ratio.
- During motion, only the moving layer is rebuilt (water, hands, drum, door). The static layer is drawn once per view angle.
- The hand-drawn filter is never live on the whole figure on a phone. It's baked per view, so the look stays and the cost goes.
- Hands, the body map and mat glows are small separate SVG groups, animated with CSS transforms and opacity (handled by the GPU). They don't go through the scene rebuild.
- Turning the figure: the rebuild is capped at one per frame, and the bake happens 150 ms after the finger lifts.
- Memory: at most one job page's figure in memory, with images released when leaving a room (old Android WebViews crash on large SVG image caches).

### Performance checks (each phase)
- A cheap Android device or Chrome with 4× CPU throttle at phone size: keep frames at 60 fps while spinning and turning. Check the node count stays under about 700 per figure.
- iPhone WebView: confirm the filter bake keeps the look, and that images aren't blurry at 3× DPR.
- Load size per job page under 150 KB before audio.

---

## 5. Phases

| Phase | Deliverable | Gate |
|---|---|---|
| **A. Prototype** | Washing machine made with the skill, with the kid pass and the performance work. One page with steps and sounds. It proves the style, the speed and the pipeline on a machine with no content risk. | You play it on a phone in the app. Go/no-go on the style and speed. |
| **B. Wudu** | Tap and basin figure, first-person hands, body map, all 10 steps, water meter, both modes. Placeholder voice until real audio arrives. | Walkthrough plus your teacher's review of the steps. |
| **C. Prayer times + Adhan + Salah** | adhan-js times (five prayers plus tahajjud), sky dial, location and settings, adhan responses, mat and qibla, Fajr guided, then all five prayers. Audio sourced and listed in CREDITS. | Times checked against a trusted local timetable for 3 cities. Teacher review of text and audio. |
| **D. Laundry room** | Basket sorting, washing machine, clothesline, sock pairs. Stars and saving. | Walkthrough plus a child test if possible. |
| **E. House + My Room** | Engine forked to mount in a container. Dollhouse home screen, sticker book, drag-to-place decorating, saved locally. | Walkthrough. |
| **F. More rooms** | Kitchen → Bedroom → Garden, one per phase. | Walkthrough for each. |
| **G. Catalog** | Hub thumbnail, `index.html` entry, `GAMES_CACHE` bump. | Your OK, then push. |

### Phase A status (2026-11-09): built, waiting for your review
- `games/helping-home/jobs/washing-machine.html`: a washing machine with door, clothes, soap, three programs and start, then fill, wash, drain, rinse and spin, with the door lock and unloading. See-inside shows and labels 13 real parts. It can be turned all the way round.
- `iso/core.js` (pinned Colorfigures engine with its MIT licence), `iso/kidpass.js` (the kid layer), `jobs/washer.js` (the figure).
- Measured with headless Chrome at 390×844, 3× density, CPU slowed 6×: washing and spinning at 60 fps with no dropped frames, turning at about 54 fps. Offline: after one visit, a reload with no network gives the full page.
- Not done yet: a test on a real cheap Android phone and in the iOS app, a hub entry, and recorded voice.

### Open questions
- Name: "Helping Home"? Free or premium?
- Should we add a grown-up mode (turn on real chores at home and tick them off in the app)?
