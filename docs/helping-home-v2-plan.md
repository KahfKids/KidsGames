# Helping Home v2: a little Muslim neighbourhood (plan)

Written 2026-11-10 after your review of v1.5.x. This replaces the phase lists in `helping-home-plan.md`. Nothing here is built. Same rule as before: one phase at a time, a walkthrough and your OK before each commit.

## Status (2026-11-11): the life game, built on Phaser 4, not committed

The owner rejected the Phaser mini-games and asked for the game below as a Sims-like life sim "in full", and then
added to it during the build. What follows in this document is still the design; this section says what exists.

- **Where:** `games/helping-home/index.html`, code in `life/` (`world.js` and `rules.js` are the simulation and run in
  Node; `game.js`, `panels.js`, `guides.js` are Phaser scenes), data in `tools/data/*.json` (format: its README),
  art tools in `tools/art/` (Blender scripts; `build.py` writes `life/art/` and `life/data.json`).
- **Built:** 17 places (nine rooms of the home, yard, street, plaza, park, masjid, shop, school, grandparents' house,
  animal park), 17 people with timetables and needs, prayer at the real times, wishes, friendship, the album,
  garden, chores, daily cards. Added at the owner's request: coins, buying, paid jobs, school lessons and skills
  (this overrides "no money" below), cars, a bus and a bicycle, a house cat, hens with eggs, an animal park with a
  cow (milk), goats, rabbits, a tortoise, a camel, an elephant, a giraffe and a working sheepdog, day and night on
  the engine's lights with normal maps, AVIF art.
- **One connected town (2026-11-11, owner's request):** every place sits on one map (`tools/data/world.json`); the
  camera is dragged, pinched and wheel-zoomed, a map button shows the whole town, a second button returns to the
  child; people walk from place to place with no fade. A building shows its outside until the child walks in, then
  its rooms are shown in the same spot and a wall in the way is cut. A ring road and a through road carry cars,
  scooters and the bus in four directions; the main road leaves the town on both sides. The town lies in an open
  grass field (no sky colour). Trees in front of a person turn see-through. Congregational prayer is the full fard
  prayer (2, 4, 4, 3, 4 rak'ahs; Jumu'ah 2). The masjid has no screen. Only what is in view is loaded: ground tiles,
  place sheets, building pieces, people's sheets. Measured in the headless browser at a phone's size: 88 to 125 MB
  of pictures out of doors and on a ground floor, 144 MB upstairs at home, 60 fps on a Mac.
- **Checks:** `python3 tools/check-data.py` (data), `node tools/life-test.js 3 20` (three simulated days: nobody
  stuck, nobody through furniture). Both pass.
- **Done 2026-11-11:** it is the main page, `offline.json` lists only what it loads (431 files, 10.1 MB after the one-map change), the old
  town, the old prayer pages and the rejected mini-games are removed, version files are at 1.8.0.
- **Not done:** not committed, nothing run in the app or on a phone, `settings.html` is not linked from the game, sound not listened to, Ramadan and Eid
  not built, adab moments with words left out (no reviewed text).
- **For a teacher:** every item marked TEACHER REVIEW in `life/world.js` and `life/guides.js`, the Friday talk
  before dhuhr, and the pictures of the prayer positions in the guides.

## Phone pass (v1.5.8, 2026-11-10)

Reported from real phones in the Kahf Kids app: the town did not open on iPhone, and play dipped on Android (inside too).
Causes found in the engine and fixed (not yet confirmed on a phone):
- Memory cap was fixed at 48 MB, but a 3x phone needs about 2.3x the pixels of the 2x test screen, so pictures were thrown away and remade all the time. The cap now grows with screen sharpness, people's poses are kept longest, and a place's pictures are freed the moment you leave it.
- Freed canvases were left for the garbage collector (iPhone keeps that memory); they are now emptied at once. A failed canvas could stop the picture queue for good; it now recovers, and a place opens after 8 s whatever happens.
- Every copy of a tree, lamp or bench had its own picture; they now share one per kind (town at 3x: about 136 MB down to about 76 MB).
- The hand filter ran 7 noise passes per picture; 5 of them (grain and blots) are now made once as a repeating tile and laid over. Same look.
- While playing, pictures are made in pieces of at most 400 px, one per frame, and the next ground tiles, nearby things and walk steps are made ahead.
- Small per-frame waste removed (name building, list making, page updates that changed nothing).
- `?perf=1` shows frames per second, the longest frame of the last second, the picture queue and memory, for checking on a phone.

## Status (2026-11-10): built, not committed, not on the hub

You asked for the whole thing in one go, so the phases below were built together as version 1.5.5.

**Where it is:** `games/helping-home/index.html` is now the new world. The old house is kept as `classic.html` (not linked).

| File | What it holds |
|---|---|
| `world/engine.js` | Canvas engine: every drawing baked once to a picture, fixed camera, back-to-front sorting, tap picking, path-finding |
| `world/places.js` | About 55 kinds of things, 14 things to carry, and the 9 places with their doors |
| `world/sim.js` | 17 people, their timetables, reserved places, free-time choices, chats, prayer, the 30-day test (`WS.selfTest(30)`) |
| `world/game.js` | Your character, taps, carrying, the picture ring, friendship, album, decorating, garden, prayer banner, calendar, saving |

**Built:** character maker and wardrobe; tap to walk; home on two floors (10 rooms), yard, street, masjid, shop and bakery, school, park, grandparents' house; 17 people (the new family arrives after three days of play); wishes shown as picture cards with an arrow to follow; salam, give, play, help and hug; friendship flowers; Akhlaq album; sadaqah jar and box; tidying loose things; garden from seed to harvest over days; feeding ducks; decorating with 12 things you win; daily gift at the door; the adhan with everyone walking to pray and the child joining the row; real-time day and a fast practice day; Ramadan lanterns and an Eid morning in the park; no device voice anywhere.

**Checked in a desktop browser at phone size:** all of the above by hand or by script; 30 simulated days with no two people on one spot, nobody stuck, no crowding on one thing; drawing a frame takes about 0.1 ms and frames are only drawn when something changes.

**Not done or not checked:**
- **Not measured in the Kahf app WebView or on a cheap Android phone.** This is still the real test of the lag fix.
- Each place takes a moment to draw the first time you walk in (a spinner shows). On a slow phone this may be a few seconds. Sprites are not yet saved between launches.
- The street's ground picture is capped at 8 megapixels, so on a 3x screen the street ground alone is drawn at about 77% sharpness. People, furniture and indoor rooms are full sharpness.
- Pets are not in the new world (ducks only). No Jumu'ah-specific scene, no suhoor or iftar scene, no school lesson activities, no rain.
- Who prays where is simplified (men and boys at the masjid, women and girls at home). **This, the adab moments and everything religious still need teacher review.**
- The hub entry is still off. Nothing is committed or pushed.

---

**In one line:** stop being "a house you tidy" and become "a small Muslim neighbourhood you live in": your own character, a bigger home, a street with a masjid, park, shop and school, about 16 people who each have their own day, and the five prayers as the rhythm that holds the day together.

---

### Second pass, same day (v1.5.6, after the owner's review; still not committed)

The owner's review: one street is not a town, the school is hard to find, roads cannot be crossed, people do not answer back, the interactions are unclear, trees are cut off, the Home button on the washing machine page does nothing; add pets, vehicles, the things left out, and more to do.

- **Town:** the street is now a town (`street` place, 710 x 720): two roads each way with zebra crossings, four blocks (plaza with fountain and stalls, playground, green with bus stop and ball field, way to the park), houses along the two back edges. Roads can be walked on; people never choose to stand on them (`noStand`).
- **Finding places:** a picture floats over each door (your character, grandma, mosque, pencil, bread, tree); the school is a two-floor building with a clock and flag; a map button sets an arrow to any place.
- **Vehicles:** three cars and a bus (`world/extra.js`) that stop for anyone in front.
- **Animals:** a house cat, a town cat, birds in the plaza and yard. Stroke, feed, fill the water bowl, fill the bird table.
- **Answering back:** every ring action gets a reply bubble; gifts and the ball visibly pass between people; a hug steps close; kindness sometimes comes back as a gift; friends walk over to say salam; "talk" and "come along" are new.
- **More to do:** four need rings (food, rest, fun, clean) with no penalty; bath; cook a meal from garden vegetables; fruit stall; school lesson on the board; reading; fountain.
- **Left-out items now in:** rain (people stay in, the garden is watered, a rainbow after), the Friday khutbah before dhuhr, Ramadan meals before fajr and at sunset. Test with `?cal=friday|ramadan|eid` and `?rain=1`.
- **Fixes:** trees no longer cut off; washing machine Home button works (`iso/kidpass.js`).
- **Engine:** the town ground is made in sharp tiles as it comes into view; things off screen are not kept.
- **Checked:** 20 simulated days: 1 brief overlap, 0 stuck, 0 standing on a road. Friday khutbah, rain, ring actions, cat, bowl, bath, Home button seen working in a desktop browser at phone size.
- **Not checked:** real phone or the Kahf app; Ramadan meals and Eid on screen; memory on a 3x phone screen (about 56 MB at 2x in the town).
- **For the teacher:** the khutbah picture (imam speaks, men sit, then two rak'ahs), Ramadan meal times, the Arabic letters on the school board.

### Third pass, same day (still v1.5.6, not committed)

- **Crossing:** people (and your character) wait at the kerb while a car is coming and prefer the zebra crossings; cars stop only for someone actually on the road.
- **Bus:** the bus now loops the ring with four stops (home, shops, playground, green). Tap a stop, wait, and you board; a button lets you get off at any stop. Other people do not ride it.
- **Bike:** a bike waits by your house. Tap it to ride (faster), tap the bike button to get off; it stays outside when you go indoors and is remembered.
- **Religious details I corrected myself (a teacher still has to confirm them):** on Friday the imam now stands on the minbar, sits for a moment between the two parts of the khutbah, then leads two rak'ahs while the men sit and listen; the school board shows all 28 Arabic letters in order; in Ramadan the family eats before fajr, prays maghrib, then eats, and young children still eat in the day. Not shown: breaking the fast with dates before the prayer, and tarawih.
- **Checked:** 15 normal days and 6 Friday/Ramadan days simulated: 0 and 1 brief overlaps, 0 stuck, 0 standing on a road. Bus boarding, getting off, bike riding and waiting for cars seen on screen.

### Fourth pass, same day (still v1.5.6, not committed): checks, memory, back on the hub

- **Seen working on screen now:** Ramadan meals (before fajr; adults skip the midday meal; everyone eats after the maghrib prayer), Eid morning in the park, the school lesson, cooking a meal, the map, the imam on the minbar, cars keeping their distance from the waiting bus (smallest gap 61 units over 20 minutes), wudu and salah Home buttons.
- **Fixed on the way:** tapping a taken seat did nothing (now takes the nearest free one, or shows an X); the lesson board was off screen (the view now turns to it, and the old chalk lines are gone); grandma no longer cooks at midday in Ramadan.
- **Speed (desktop, phone size, 2x):** a town frame 0.23 ms, the people 0.04 ms per step, places open in 0.05 to 0.13 s.
- **Memory:** pictures of a place are freed as soon as you leave it, things off screen are not kept, and the town ground uses smaller tiles. Town: about 48 MB at 2x (was 73). It grows with screen sharpness, so a 3x phone will use roughly twice that; only a real phone can say if that is fine.
- **Hub:** the card is back in `index.html` and its picture is in the `sw.js` list. The picture still shows the old house.
- **Self-test:** 20 normal days and 6 Friday/Ramadan days: 0 overlaps, 0 stuck, 0 on a road.

### Fifth pass, same day (still v1.5.6, not committed): the remaining open items

- **Bus passengers:** people now wait at the four stops, get on, and get off at another stop (at most four at a time, not during a prayer, and not the same person again for five minutes).
- **Bus bug found and fixed:** on a slow frame the bus could drive past a stop without stopping. It now always stops.
- **Cars in opposite lanes:** the one in the nearer lane is always drawn in front. Birds that hop onto the road fly home when a car comes; cars wait for a cat on the road. Birds no longer drift away from their spot.
- **Lesson board:** re-viewed; the letter is clear.
- **Hub picture:** `helping-home.jpg` is now a picture of the town (the old one is in git history).
- **Speed:** drawing is capped at 60 times a second, and people and cars off screen are not drawn.
- **Self-test:** 20 normal days and 6 Friday/Ramadan days: 0 overlaps, 0 stuck, 0 on a road. Town memory about 45 MB at phone size on a 2x screen; a 1000 x 1000 window at 2x used about 111 MB, so tablets will use more.
- **Cannot be closed from here:** a test on a real phone and in the Kahf app, and a teacher's sign-off.

## 1. What is wrong today (from reading the code)

I read the code; I have not measured it on a phone in this session. Section 6 makes measuring the first step.

### 1.1 Lag in the WebView
The engine draws everything as live SVG with a hand-drawn filter on top. That was fine for one washing machine. It does not scale to a house with people.

| Cause | Where | Why it hurts |
|---|---|---|
| The hand-drawn filter (3 noise passes plus a displacement map) runs on the house layer and on **every person** | `iso/core.js:281-285`, `house/family.js:1430` | Each time a person changes pose or moves, the browser re-runs the filter for that area. SVG filters like this are a known slow path on Android. |
| The house is about 2,000 SVG nodes per view angle, and 12 angles are kept in memory, plus 12 street drawings | `house/main.js:432-442` | About 25–30k detached nodes. Old WebViews get slow and can crash. |
| People are SVG groups with up to 40 cached drawings each, swapped 3.5–7 times a second | `house/family.js:1423-1472` | Every swap is a full paint and composite of a filtered layer. The code already rations frames to 7 a second to cope, which is why movement looks choppy as well as slow. |
| Several separate timers (`walkTick` every 90 ms, the live layer, a 2 s state poll, guide timers) | `house/main.js:375-381`, `guide.js:726` | Work is not lined up with the screen refresh, so frames are dropped. |
| About 500 KB of script parsed before first paint | `family.js` 127 KB, `main.js` 111 KB, `guide.js` 64 KB, `street.js` 62 KB, `draw.js` 61 KB | Slow first load, worst on iOS where nothing is cached. |

**Conclusion:** this cannot be tuned into shape. The drawing method has to change (section 6).

### 1.2 Family members overlap and do the same thing
- Each person is simulated **alone**. `step()` at `house/family.js:1088` picks the best object for that one person and never looks at what anyone else chose.
- There is no "in use" flag on objects. Only objects in the small `SHARE` list give each person their own standing spot (`family.js:946`); every other object puts everyone on the exact same point in the same pose.
- Needs decay at the same rate for the adults, so they tend to want the same thing at the same moment.
- Walking has fixed lanes only on the stairs (`family.js:948`). Elsewhere people walk through each other.

### 1.3 The browser voice
`Kit.say.text(...)` (the browser's text-to-speech) is called from `house/guide.js:27` (16 uses), `house/book.js:274` and `pray/wudu.js:919,927`. It will be removed everywhere. Tasks will be shown with pictures, the glowing object and a sound. The only voices left are the real recorded ones (adhan, recitation, the Arabic praise clips).

### 1.4 Boring, small, stuck in the house
- The child is only a hand. There is nobody to *be*.
- The street exists but is a backdrop with five tap-to-open scenes. You cannot walk anywhere.
- Five characters, all family, and you cannot really interact with them beyond a request bubble.
- The whole loop is "mess appears, tidy it". That is a chore list. There is no pretend play, no building, no relationships, no surprises you cause yourself.

---

## 2. Research: why children love The Sims and games like it

A caution first: most of what is published is commentary, parent guides and designer talks. The one peer-reviewed study I found (Animal Crossing, 2022) is about adults. So treat this as well-supported design practice, not proof.

| Game | What children get from it | Evidence |
|---|---|---|
| **The Sims** | A digital dollhouse: make a person, make a home, then watch and steer a life. Control, identity play, rehearsing grown-up life, testing "what happens if" safely. No right way to play. | Commentary (Stanford Daily and others) |
| **Toca Life World / Avatar World** | No goals, no score, no failing. Every object can be picked up and does something. Children invent the story. Simple drag and drop, no text, no tutorial. Designers test with real children and a real dollhouse. | Toca Boca's own designers; reviews |
| **Animal Crossing** | Real clock; a little new each day; neighbours with personalities who remember you; things that grow; seasons and festivals. Meets the three needs of self-determination theory: **autonomy** (my choices), **competence** (I can do it), **relatedness** (they know me). Players leave when those needs stop being met. | Frontiers in Psychology 2022 (adults) |
| **Bloxburg / Adopt Me / Brookhaven** | "The house is the reward": designing a home is the main game. Having a role (a job, a pet to care for). Dressing up. | Parent guides |
| **Sims AI (how it works)** | People are simple; **objects are smart**. Each object advertises what need it fills; a person scores the offers (need, distance) and picks **randomly among the best few**, so behaviour varies. | Game Maker's Toolkit, developer talks |

### The eight things that make this genre work for children
1. **Someone to be.** A character I made, that looks how I chose.
2. **A place that is mine.** Designing and decorating a home is the strongest long-term hook in the whole genre.
3. **A toy, not a task list.** Everything can be touched and reacts. Goals are optional.
4. **People who feel alive.** They do their own things, notice me, remember me, and differ from each other.
5. **Somewhere to go.** Several places with different things to do in each.
6. **Stories I cause.** Systems that combine (needs, objects, people, time) so funny, unplanned things happen.
7. **A world that moves on.** Real time, daily newness, growth over days, festivals.
8. **No failing.** Nothing dies, nothing is lost, no timers.

### How v1 scores
Someone to be: no. A place that is mine: one small room. Toy: partly. Alive people: they move but ignore you and each other. Somewhere to go: no. Stories I cause: no. World moves on: yes. No failing: yes. **Two out of eight.** That is why it is boring.

### What we leave out
Romance, death, ghosts, pranks and mean interactions, money pressure, loot boxes, trading, online play, chat. Also a **faith or iman meter of any kind**: worship is never scored (your rule, and the right one).

---

## 3. The game

### 3.1 You
- **Make your character** on first run: boy or girl, skin tone, hair or hijab or kufi, clothes. Faceless, in the same hand-inked style as the family. You can change clothes any time at your wardrobe (everyday, school, masjid, Eid).
- **Tap to walk.** Tap a place and your character walks there. Tap a thing and they walk to it and use it. Tap a person and a small ring of picture choices opens.
- The first-person hand stays for the close-up jobs (washing machine, wudu, cooking).

*This changes the earlier decision "the child is only a hand". It is the single biggest fix for "boring", so I recommend it. It needs your OK (section 8).*

### 3.2 The world: one neighbourhood, seven places
You walk between them along the street. Only the place you are in is loaded.

| Place | What is there | What you do |
|---|---|---|
| **Home** (bigger: 10 rooms, shown one floor at a time, the camera follows you) | Your room, sister's room, nursery, parents' room, bathroom, prayer room, living room, kitchen and dining, hall, laundry | Everything from v1, plus free play with every object |
| **Yard and garden** | Swing, sandpit, vegetable beds, clothesline, tree, cat | Grow food, play, feed birds |
| **The street** | Neighbours' doors, postbox, bins, bench, bicycle | Give salam, deliver a plate, ride the bike, find today's surprise |
| **Masjid** | Wudu area, prayer hall, shoe racks, Qur'an shelves, sadaqah box, courtyard | Pray in congregation at the real time, Jumu'ah, weekend Qur'an circle, help stack the mushafs, tidy shoes |
| **Park** | Swings, slide, ball field, pond with ducks, picnic spot | Play with friends, picnic with family, pick up litter |
| **Corner shop and bakery** | Shelves, till, bread oven (grown-up only) | Shop from Ummi's picture list, choose a gift, help the baker shelve bread |
| **School / maktab** | Classroom, playground | Short optional activities: letters, a story, playtime with friends |
| **Grandparents' house** (added in a later phase) | Garden, kitchen, old photo-free keepsakes | Visit on the weekend, help Dada in the garden, bake with Dadi |

### 3.3 The people: about 16, each with their own day
- **Family (5):** Abu, Ummi, big sister, toddler brother, you.
- **Grandparents (2):** visit on weekends, later you visit them.
- **Neighbours and town (about 9):** the imam; a teacher; the shopkeeper; the baker; an elderly neighbour who needs help carrying things; a neighbour family with two children your age (your friends); a new family that moves in during the first week (welcoming them is a small story).
- Plus the cat, the birds and the ducks (shapes, no faces).

Each person has a home, a job or school, favourite places, a favourite activity, and a different pace. The baker is up before Fajr. The elderly neighbour walks slowly to the masjid and sits on the bench after Asr. Your friends are in the park after school. Because each has their own timetable and tastes, they stop bunching up.

### 3.4 How the day runs
The **five prayers are the frame of the day**, exactly as in a Muslim home. The real clock and real prayer times stay.

- When the adhan sounds from the minaret, people in the street stop what they are doing and walk to the masjid, or pray at home. You can go with Abu, or pray at home, or carry on. Nobody scolds. If you join, you get the guided wudu and salah you already have, then the congregation scene.
- Between prayers the world has its own life: breakfast and school run after Fajr, shop and housework in the morning, friends and park after Asr, family meal after Maghrib, story and bed after Isha.
- **A "fast day" option** in parent settings lets a whole day pass in about 20 minutes for children who play once a day, so they still see morning, afternoon and night. Prayer guides inside a fast day are marked as practice.

### 3.5 What you actually do (the fun)
**Free play (always available, no goal):**
- Pick up, carry, put down, give, or use nearly anything. A ball can be thrown to anyone. A plate of dates can be offered to anyone. A blanket makes a den.
- Dress up. Rearrange your room.
- Follow someone and see what they do. Sit next to them. Do the same thing together.

**With people (picture ring, no text needed):**
- Salam (the reply is a recorded clip), give something, help with what they are doing, play together, ask them to come along, share food.
- Each person has a **friendship flower** that grows as you do kind things with them. It never shrinks. A grown flower opens something personal: Dadi's recipe, the baker lets you shape a loaf, your friend shows you their den, the imam lets you help call people to line up.

**Things to do when you want a goal (optional, shown as picture cards):**
- Home help: all the v1 chores, now as things family members are visibly doing that you can join.
- Errands: Ummi's shopping list, a plate for the neighbour, post a letter.
- Projects over days: grow vegetables then cook them, build a bird house with Abu, sew an Eid banner with your sister, save in the sadaqah jar then choose where it goes.

**Your home (the long-term hook):**
- **Decorate mode** for your room first, then every room and the yard: move furniture, choose colours, rugs, lamps, shelves, plants, calligraphy frames. Items come from doing things in the world, never from money or timers.

### 3.6 The Islamic heart (what makes this ours)
The aim is that good character feels like the normal, pleasant way to live, not a lesson.

| Theme | In the game |
|---|---|
| **Salah** | The whole neighbourhood moves with the adhan. Congregation at the masjid, Jumu'ah with ghusl and best clothes, family Maghrib at home. Guided wudu and salah as built. Never scored. |
| **Adab of the day** | Bismillah before eating and alhamdulillah after, the du'a for leaving the house, entering the masjid with the right foot, salam first. Each is a small tap with a recorded clip, shown by the family doing it too. |
| **Neighbours' rights** | Sharing food, helping carry, visiting when someone is unwell, welcoming the new family. |
| **Sadaqah** | A jar at home; a box at the masjid; giving your own toy or food. |
| **Parents and elders** | Helping without being asked gets a hug. Serving grandparents first. |
| **Cleanliness and no waste** | Tidy rooms, litter in the park, water meter at wudu, finishing your plate. |
| **Kindness to animals** | Water for the cat, seeds for birds, bread for ducks. |
| **The calendar** | Hijri dates. Ramadan (suhoor, iftar with dates, taraweeh, lanterns), Eid al-Fitr (new clothes, Eid prayer in the park, visiting every house), Dhul Hijjah and Eid al-Adha, white days, Monday and Thursday. |

**The Akhlaq album** replaces a score: a page per quality (kindness, generosity, helping, cleanliness, patience, gratitude) that fills with small drawings of the moments you actually did. It records character, never worship.

**All religious content, including the adab, the du'a and where a child stands in congregation, needs teacher sign-off before release.**

### 3.7 Why they come back (healthy only)
New from v1: friends to see, flowers growing with people, projects that take days, a home to keep designing, a weekly rhythm (market day, Jumu'ah, grandparents), the new family arriving, festivals.
Kept from v1: prayer garden, daily surprise, "what changed since you left", nothing ever wilts or is lost, no streaks, no notifications, no purchases.

---

## 4. How the people will think (fixing the overlap properly)

One shared simulation for everyone, stepped a few times a second, instead of each person planned alone.

1. **Use slots.** Every object lists its places: the sofa has 3 seats, the sink has 1, the ball field has 4. A person **reserves** a slot when they decide, and releases it when they leave. A full object is simply not on offer.
2. **Smart objects, Sims-style.** Each object advertises what it gives (food, rest, fun, company, tidy). A person scores the offers by need and distance, then picks **at random among the top three**. Add a penalty for "someone in this room is already doing this" and for "I just did this".
3. **Different people.** Each has their own need speeds, favourites and timetable (work, school, shop hours), so wants are spread out.
4. **Things done together are explicit.** Tea, a meal, a game of catch, a chat and congregation are group activities with a set place for each person, facing the right way.
5. **Personal space.** Two people never stand on the same spot; walkers step around each other; a narrow door or the stairs is one at a time.
6. **They notice you.** Heads turn when you come in, a wave from across the street, a friend runs over, the toddler follows you.
7. **A test that runs the day.** A script simulates 30 full days at high speed and fails if two people ever share a spot, if anyone is stuck, or if more than two people do the same solo activity in one room. This is checked before every walkthrough.

---

## 5. No browser voice

- Remove all `Kit.say.text` calls (`guide.js`, `book.js`, `wudu.js`).
- A task is shown by: its picture card, the object glowing, the person who needs it showing a picture bubble, and a short sound.
- Wudu and salah step lines become on-screen words plus the picture, with the real recorded Arabic where a clip exists.
- Later, if you want spoken English or Bangla, we record a real person (the `audio/RECORD-ME.md` list already exists). Never a synthetic voice.

---

## 6. The engine (fixing the lag without losing the look)

Your rule stands: speed must not cost quality. The plan keeps every hand-inked drawing and changes only how it reaches the screen.

| Now | v2 |
|---|---|
| Live SVG, filter recomputed on change | **One canvas.** Each drawing is produced by the same code as today, with the same filter, **once**, then kept as a picture at full screen sharpness. Showing it afterwards is a plain image copy. |
| People: SVG groups swapped by timer | **Sprite sheets** per person (pose × direction × frame), baked on first use in idle time and stored on the device so the next launch is instant. Movement can then run at 30–60 frames a second instead of 7. |
| House: 2,000 nodes × 12 angles | Each room baked as one picture. **One fixed camera angle** per place. |
| Many timers | One loop tied to the screen refresh; only changed areas are redrawn; fully paused when hidden or nothing moves. |
| Everything loaded up front | One place loaded at a time; scripts split per place; old place released when you leave. |

**The trade-off you should know about:** turning the house by dragging goes away. It is what forces 12 copies of everything, and tap-to-walk needs a steady camera anyway. Rooms can still be seen from a second fixed angle if a place needs it.

**Budgets (checked each phase on a cheap Android phone inside the Kahf app):** under 8 ms per frame with 8 people on screen; under 80 MB memory; first screen under 400 KB on iOS; no frame drops while walking.

**Honest note:** baked pictures on a canvas being much faster than filtered SVG is what I expect from how browsers work, and the public bug reports on SVG filters on Android point the same way, but I found no direct benchmark. So the first phase is a small test that measures it on your real target before anything else is built.

**Reused as it is:** adhan, wudu and salah guides; prayer times and settings; all audio; the figure drawing code for people and pets; street, park, shop and mosque drawings; the washing machine; save data.

---

## 7. Phases

| # | Phase | What you get to try | Gate |
|---|---|---|---|
| **0** | **Speed test and quick wins** | One room and four people on the new canvas method, running in the Kahf app on a cheap Android phone and an iPhone, with numbers next to today's version. Browser voice removed from the current game. | Go or no-go on the engine, from measured numbers. |
| **1** | **You and a bigger home** | Make your character. Tap to walk through a 10-room home. Family with the new shared brain: slots, no overlap, they notice you. The 30-day overlap test passes. | Walkthrough on phone. |
| **2** | **Home as a toy** | Pick up and use everything; picture ring with family; chores as things you join; decorate mode for your room; wardrobe. | Walkthrough, ideally with a child. |
| **3** | **The street and masjid** | Walk outside. Masjid with congregation at real times, Jumu'ah. Imam, elderly neighbour, neighbour family and two friends. Salam and friendship flowers. | Walkthrough plus teacher review of masjid content. |
| **4** | **Park, shop, school** | Three more places, baker, shopkeeper, teacher. Errands. Play with friends. Fast-day option. | Walkthrough. |
| **5** | **Days and weeks** | Projects over days, garden to meal, sadaqah jar, weekly rhythm, the new family story, Akhlaq album, decorate the whole house. | Walkthrough. |
| **6** | **The calendar** | Ramadan, both Eids, grandparents' house. | Teacher review. |
| **7** | **Release** | Full pass in the Kahf app on low-end Android and iOS, offline list, back on the hub. | Your OK, then push. |

Phases 0–2 already answer every complaint in your review (lag, overlap, voice, boring, small). Phases 3–4 answer "stuck in the house". Each phase is playable on its own, so we can stop and release after any of them.

---

## 8. Decisions I need from you

1. **A visible character for the child** (faceless, hand-inked) instead of only a hand. Recommended: yes.
2. **Fixed camera, no more turning the house.** Recommended: yes, it is the main speed win and tap-to-walk needs it.
3. **Start with Phase 0 now?** It is small and tells us whether the engine plan is right before anything big is built.
4. **Voice:** none for now, real recordings later if you supply a speaker. Recommended.
5. **Name:** keep "Helping Home", or rename now that it is a neighbourhood (for example "Our Street" or "Salam Street")?
6. Still open from before: free or premium; teacher for sign-off; the 18 missing audio clips.

---

## 9. Risks

| Risk | What we do |
|---|---|
| The canvas method is not fast enough in the real WebView | Phase 0 measures it first. Fallback: smaller baked pictures per object and fewer people on screen at once. |
| Scope: this is a much bigger game | Every phase is shippable. Places and people are data, so adding one does not touch the engine. |
| Memory from baked pictures on old phones | One place in memory at a time; sprite sheets capped and stored on the device, not all held open. |
| iOS has no offline, so first load matters | Per-place loading; home first; the rest in the background. |
| Open play feels aimless to some children | Optional picture cards always suggest two or three things to do. |
| Religious accuracy | Nothing ships without teacher sign-off; worship is never scored. |

---

## Sources
- [Why we love The Sims (Stanford Daily)](https://stanforddaily.com/2019/10/27/why-we-love-the-sims-living-boldly-vicariously/)
- [The Genius AI Behind The Sims (Game Maker's Toolkit, transcript)](https://gameindustrylibrary.com/documents/gmtk-the-genius-ai-behind-the-sims)
- [Smart objects study notes](https://blueagate.vercel.app/study-notes/game-development/artificial-intelligence/smart-objects)
- [Animal Crossing and self-determination theory (Frontiers in Psychology, 2022)](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.800683/pdf)
- [Why are so many people playing Animal Crossing? (BBC Science Focus)](https://www.sciencefocus.com/news/why-are-so-many-people-playing-animal-crossing)
- [3 reasons to choose open-ended apps (Toca Boca)](https://tocaboca.com/magazine/open-ended-play/)
- [The design process behind Toca Boca's apps (Motionographer)](https://motionographer.com/2016/04/27/the-design-process-behind-toca-bocas-infectious-apps/)
- [Toca talks: why freedom is best for kids and apps (Kidscreen)](https://kidscreen.com/?p=49360)
- [Toca Boca World review (Tampere University Play Lab)](https://blogs.tuni.fi/playlab/game-reviews/toca-boca-world-a-whole-new-level-of-dollhouse/)
- [Toca Life World review (Children and Media Australia)](https://childrenandmedia.org.au/app-reviews/apps/toca-life-world-build-stories-create-your-world)
- [Bloxburg: the house is the reward (Screenwise)](https://screenwiseapp.com/media/bloxburg-game)
- [Adopt Me and roleplay games on Roblox (Screenwise)](https://screenwiseapp.com/guides/adopt-me-and-roleplay-games-on-roblox)
- [feTurbulence mobile performance (GSAP forum)](https://greensock.com/forums/topic/33075-gsap-and-feturbulence-mobile-performance/)
- [High CPU and jank with SVG animation on Android (Mozilla bug)](https://bugzilla.mozilla.org/show_bug.cgi?id=1781108)
