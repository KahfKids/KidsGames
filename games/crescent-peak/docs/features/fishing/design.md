# Fishing

**Status:** designed · **Updated:** 2026-11-17 · [GDD](../../GDD.md)

Fishing is the island's biggest side activity, as it is in the reference: a rod from a friendly fisher, a journal of every kind you've caught, fish that live only in some waters, and rare ones worth hunting. Ours adds time of day: some fish bite only at dawn, dusk or night ([day and night](../day-night/design.md)). **The catch feeds the village** (D-015): big fish go into the fisher's basket to be shared, and the harbour cats get their share; small ones are put back. Nothing is sold (pillar 3). Fish have no faces (rule 14). It's built for small hands: a long bite window, holding to reel, and first catches that can't slip away.

## Rules
1. **The rod** comes from the fisher with the net floats help ([quests](../quests/design.md)). The **fine rod** comes at 10 kinds: bites come faster and rare fish more often.
2. **Casting:** near water, the Action button becomes the rod. Hold to aim (a soft arc shows where it lands) and release to cast.
3. **Waiting:** the float bobs. Shadows of fish swim near. Small nibbles shake the float; no need to react.
4. **The bite:** the float dips under with a splash and a tug sound. Tap within the bite window to hook.
5. **Reeling:** hold to reel in; let go when the rod shakes hard and creaks, and the fish swims out a little. If the line is held too long through the shaking, the fish slips away. **Nothing is lost**, and its shadow stays near for another try. The cue is the rod's shake and sound, not a colour. **The first three catches can't slip away.**
6. **The catch:** the child holds the fish up for a moment, and a picture card shows its kind, size and where it lives. A new kind gets a "new!" stamp.
7. **Then:** a small fish is put back with a happy splash. A big one goes in the basket on the child's back and is given to the fisher's village basket at the harbour, or to someone who asked (Grandma's fish for the first suhoor, the harbour cat).
8. **The journal** (pause screen) has a page for each kind: a picture, a silhouette of the water and a time icon, and the biggest size caught. Unknown kinds show a dark shape and the same picture hints, so no reading is needed.
9. **Rewards:** a ribbon at 6 kinds, the fine rod at 10, a lantern at 14, the fisher's hat at all kinds.
10. **No bait** (simpler for young children). The fine rod and dawn raise the rare chance.
11. **Ice fishing** at the frozen tarn: tap the ice hole instead of casting.
12. Only plainly lawful fish are kept for food. No shrimp, eels or other kinds that some schools dispute.

## Fish
Chosen as real fish with clearly different silhouettes, not as a full survey of one sea.

| Water | Kinds | Time |
|---|---|---|
| Harbour | sea bream, grey mullet, sardine, mackerel (dawn) | any |
| The pond | carp, rudd, tench (dusk) | any |
| The river and the waterfall basin | brown trout (dawn), chub, barbel (night) | any |
| Reef shallows | wrasse, red mullet | day |
| The plateau lake | perch | any |
| Open sea (from the rowboat) | sea bass (dusk) | dusk |
| The frozen tarn | char | any |
| The far islet | flying fish | day |

**Rare forms (4):** a gold-striped bream (harbour), a golden tench (pond), a marbled trout (river), and the moonfish at the far islet at night.

That is 16 kinds plus 4 rare forms.

## Numbers

| Name | Value | Unit | What to watch in playtests |
|---|---|---|---|
| Kinds | 16 | — | — |
| Rare forms | 4 | — | — |
| Wait for a bite | 4–12 (fine rod 3–8) | s | boredom |
| Bite window | 1.5 | s | — |
| Big fish pulls | 2–4 | — | — |
| Rare chance | 5% (fine rod 10%, dawn +5%) | — | — |
| Catches that can't slip | 3 | — | — |

## Edge cases
- Casting onto land: the float bounces back with no wait.
- Night with no lantern: the float glows a little so it can be seen.
- Pausing mid-reel: the fish waits.

## History
- 2026-11-17: designed.
- 2026-11-17: design review: the catch feeds the village instead of sport release; 16 kinds plus 4 rare (no "all of one sea" claim, no disputed kinds); a 1.5 s bite, hold-to-reel, shake-and-creak cue, three safe first catches; picture hints; release tags.
