# Story

**Status:** designed · **Updated:** 2026-11-17 · [GDD](../../GDD.md)

It's the last days of Sha'ban. The child arrives by ferry to start Ramadan with their grandparents. Every year Grandpa climbs Crescent Peak with the imam to look for the new moon at sunset; this year his knee hurts. He sends the child in his place: "go and see it for me." The child chooses when they are ready, and on that day, the 29th, the sun really sets. The story is small and warm, like the reference's: a reason to climb, many small kindnesses on the way, and one big view at the top. Ours is about family, kindness to people and to every living thing, and the start of Ramadan, and it carries no worry heavier than a sore knee (pillar 4, D-004).

## Beats

| # | Beat | Where | What happens | Time |
|---|---|---|---|---|
| 1 | Arrival | the ferry, the harbour | The ferry docks in the morning. A ferry worker waves the child off. Grandma meets them on the dock | morning, day 1 |
| 2 | The shawl | Grandma's house | Grandma gives the child Grandpa's old wind shawl and ties the first ribbon: "the wind likes ribbons" | morning |
| 3 | Grandpa's knee | the porch | Grandpa, leg up on a cushion, explains that on the 29th the imam climbs the old road to watch for the hilal at sunset, and every year Grandpa goes with him. The imam is at the masjid until then. "This year, you go for me. Get strong on the island first" | morning |
| 4 | The island | everywhere | The child explores, helps, fishes, races, earns ribbons. Villagers talk about Ramadan coming: the first suhoor, the dates, the lanterns | days and nights, as many as the child likes |
| 5 | The first night | the village | At the first sunset Grandma gives the hand lantern. The night island is new: stars, fireflies, night fish. The child sleeps in the guest bed, or plays on | night 1 |
| 6 | Choosing the day | the porch | With 7 ribbons, or after the child has once stood on the summit, Grandpa asks: "Are you ready? Tomorrow is the 29th." Saying yes and sleeping makes the next day the 29th. Saying "not yet" keeps exploring (the calendar waits, see [day and night](../day-night/design.md)) | any evening |
| 7 | The 29th | the village, then the road | At dawn the imam sets off up the old road with his donkey, leaving a lit lamp on top of each rockfall as he climbs. The press worker asks the child to carry the lantern oil up ([quests](../quests/design.md)). **The sun is now really moving toward sunset**: a soft race against the light | the 29th |
| 8 | The road | the cliffs | The donkey waits above the first rockfall. Goats, hawks, wind gusts. The sky turns golden while the child climbs | afternoon to golden |
| 9 | The summit | the summit | The imam and two adult sighters sit at the watch hut facing west, looking with their own eyes. The sun goes down; everyone is quiet and looks | sunset |
| 10 | The crescent | the summit | A thin crescent appears low in the west. One sighter points; the imam sees it too. The imam says tonight is the first night of Ramadan and we fast tomorrow (wording checked from a source before use). They say the new-moon dua together only once its text and grading are checked; otherwise the imam says "Alhamdulillah" | dusk |
| 11 | The lanterns | the summit, then the island | The imam lights the summit lantern. Below, lanterns are lit one by one: the masjid, the houses, the harbour, then the lanterns of kindness the child earned on the village string ([ribbons](../ribbons/design.md)). "Ramadan Mubarak" | dusk |
| 12 | Home | the glide to the village | An evening updraft rises. "Go and tell your grandpa." The child glides all the way down over the lit village to Grandpa's porch, the helped storks flying beside them, and the harbour cat and the dog waiting below | dusk to night |
| 13 | Telling Grandpa | the porch | The child picks 3 pictures of things they did (people and animals they helped), and Grandpa answers each. He saw the summit lantern from the porch | night |
| 14 | Ramadan nights | everywhere | The game goes on: dawn suhoor with the family, the day, iftar plates for neighbours at sunset, the lantern-lit nights. The crescent grows each evening ([day and night](../day-night/design.md)). Everything left to find is still there | after the ending |

**Tension without failure.** On the 29th the sun really sets, and the child can see it sinking while climbing. The sun slows near the horizon but never stops. If the child arrives late, the crescent is still low over the sea when they reach the top (a young crescent really does stay up a short while after sunset), and the imam and the sighters have waited. The child feels the race with the light, but can't miss the moment.

## Islamic content (from the source, never memory)
Lines are quoted from Saheeh International (Tanzil) when written, as `docs/quiz-quality-plan.md` asks; until then, only the references below are used.

| Moment | Reference | Use | Checked |
|---|---|---|---|
| Grandpa explains why we look | Sahih al-Bukhari 1909: fasting starts when the new moon is seen, and if it is hidden, Sha'ban is completed as thirty days | Grandpa and the imam, in simple words | the stored reference in `js/quiz/catalog.js` (the moon card); fetch the full text again before writing the line (sunnah.com answered 403 on 2026-11-17) |
| The imam on the summit, about months | Quran 2:189: the new moons are markers of time for people and for Hajj | the imam's line before the sunset | quran.com, 2026-11-17 |
| The view from the summit | Quran 88:17–20: the camels, the sky raised, the mountains set firm, the earth spread out | shown over the view after the crescent | quran.com, 2026-11-17 |
| The beehives | Quran 16:68–69: Allah inspired the bee to make homes in the mountains, trees and what people build | the beekeeper's thank-you | quran.com, 2026-11-17 |
| The waterfall | Quran 21:30: every living thing made from water | a sign behind the waterfall | quran.com, 2026-11-17 |
| Kindness to animals | the hadith of the man who gave water to a thirsty dog (Sahih al-Bukhari; number to confirm) | Grandpa, after the thirsty dog help ([quests](../quests/design.md)) | **not checked**: not used until its text and reference are confirmed |
| The new-moon dua | Jami' at-Tirmidhi 3451 | said together on the summit | **not checked**: not used until its text and grading are confirmed |

**Rules.**
- The child doesn't decide Ramadan; the imam and adult sighters do (D-007). The child shares the moment.
- Nothing about worship is scored or rewarded with a ribbon.
- The masjid is shown with respect: it is not climbable, and nobody runs or jumps inside.

## Characters in the story
See [characters](../characters/design.md). The child has no fixed name, and the family calls them "little one." English and Bangla family words are set in [dialogue](../dialogue/design.md).

## Edge cases
- Reaching the summit on the 29th before sunset (the hard route): the imam says the sun isn't down yet; a "wait for sunset" choice on the bench skips ahead.
- Reaching the summit on another day: the watch hut is empty; Grandpa's carved bench gives the view and a quiet moment, and the 29th can now be chosen.
- Quitting during the finale: on loading, the game resumes at the summit just before sunset.

## Open questions
- The setting's region stays generic and unnamed (terraced Mediterranean-style hills), so no real place is misrepresented.
- The ending can be watched again from the pause screen: yes.

## History
- 2026-11-17: designed.
- 2026-11-17: the story spans several days with a full day and night; the child picks the 29th; the sunset race; Ramadan days after the ending.
- 2026-11-17: design review: the 29th offered at 7 ribbons or after a summit visit; the imam at the masjid until the 29th; naked-eye sighting; "tonight is the first night" wording; the dua's fallback; lanterns of kindness and helped animals in the finale; the sun slows but never stops; Ramadan nights.
