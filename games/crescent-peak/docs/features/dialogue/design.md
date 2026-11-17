# Dialogue

**Status:** designed · **Updated:** 2026-11-17 · [GDD](../../GDD.md)

Short, warm talk in speech bubbles over a character's head, like texting a friend (the reference writes its lines that way, and it keeps them light). Every line is short enough for a parent to read aloud in one breath, and every important line carries a picture, so a child who can't read still knows what to do (rule 18).

## Rules
1. **Starting.** Walking near someone shows the Action button with a talk picture. Tapping it starts the talk. Animals "talk" through actions and sounds only, never words.
2. **Bubbles** sit over the speaker in the world, at most 2 lines and **12 words**. Tap anywhere to go on. A new bubble can't be skipped for its first 0.3 s, so spam taps don't skip lines.
3. **Pictures.** A line that asks for something shows the thing's picture (an apricot, a lamb, a jar) inside the bubble. A line that points somewhere shows an arrow to the place's landmark.
4. **Choices:** at most 2, each with a picture. Choices only change what's said, never the story or a reward (there's nothing to get wrong).
5. **Sound:** nobody speaks aloud, as in the reference. A bubble pops open with one soft cloth pat (`talk`, two takes cut from the library's canvas-bag recording), detuned by a fixed amount per speaker through `Kit.snd` (deep for Grandpa, high for children, within ±400 cents). Text appears whole, not typed. Choices use the same pat. Salam, bismillah, mashaallah, alhamdulillah, insha'Allah and Ramadan Mubarak are written in the bubbles, never voiced ([audio](../audio/design.md)).
6. **Data:** each conversation is a node in a small JSON graph in `games/crescent-peak/data/talk.json`. A node has a speaker, an English line, a Bangla line, an optional picture, optional choices and conditions on quest flags. No library (the dialogue-systems skill's JSON graph runner).
7. **Languages:** all interface words are in `data/strings.json`; system fonts only. Each line is drawn once into a texture and freed when its bubble closes. Bubbles are HUD objects placed over the speaker's screen position, so text is sharp. `tools/check-data.js` fails a node with a missing language, over 12 words, or a missing picture. Language: English and Bangla, like the quizzes, keyed by language code. The family calls the child "little one" (EN) and "সোনা" (BN). The title is Crescent Peak (BN: চাঁদের চূড়া).
8. **Repeat talk:** a villager talked to again gives a hint toward the nearest unfinished help, as a picture of the place and a time icon, then a rotating small talk line.
9. **The camera** frames the speaker and the child during talk; the child can walk away to end it at once.

## Numbers

| Name | Value | Unit | What to watch in playtests |
|---|---|---|---|
| Words per bubble | ≤ 12 | words | parents reading aloud |
| Lines per conversation (helping) | ≤ 6 | lines | kids wandering off |
| Talk range | 2.5 | m | — |
| Unskippable time | 0.3 | s | — |

## Sample scripts
English drafts. The tone is what matters; final text is written when each quest is built.

**Arrival, the dock.**
- Ferry worker: "End of the line! Mind the gap, little sailor."
- Grandma: "Assalamu alaikum, little one! Look how tall you are."
- Grandma: "Come, Grandpa is waiting. His knee is grumpy today."

**The shawl, Grandma's house.**
- Grandma: "This was Grandpa's wind shawl. Now it's yours."
- Grandma: "And a ribbon. The wind likes ribbons." *(ribbon picture)*
- Grandma: "More kindness, more ribbons. That's how this island works."

**Grandpa's knee, the porch.**
- Grandpa: "Every year I go up the peak to look for the new moon."
- Grandpa: "Ramadan starts when it is seen. Our Prophet ﷺ taught us that." *(Bukhari 1909, line checked before use)*
- Grandpa: "On the 29th the imam climbs the old road. This year, you go for me."
- Choice: *(peak picture)* "I'll go!" / *(knee picture)* "Does your knee hurt?"
  - → "Only when I climb. So you climb!"
- Grandpa: "Then come back and tell me everything."

**The lost lamb, the meadow.**
- Shepherd girl: "One, two... seven? I had eight!"
- Shepherd girl: "Have you seen a small one? It likes high places." *(lamb picture)*
- *(after)* Shepherd girl: "You found her! Here, take this." *(ribbon)*

**Learning to swim, the pond.**
- Boy on the steps: "Everyone swims out there. I just... stay here."
- *(the child wades in beside him)* Boy: "You'll stay next to me? OK. Bismillah!"
- *(they swim to the lily pads together)* Boy: "I'm swimming! I'm really swimming!" *(lantern)*

**The bees, the orchard.**
- Beekeeper: "My bees are sulking. The flower bed is dry."
- Beekeeper: "Could you bring water from the well?" *(bucket picture)*
- *(after)* Beekeeper: "Listen to them hum! Allah taught the bee where to build." *(16:68 reference, line checked before use)*

**The summit.**
- Imam: "Wa alaikum assalam! You climbed the whole way? Mashallah."
- Imam: "The new moons tell us the time of the year." *(2:189, line checked before use)*
- Imam: "Now we wait. Look west, where the sun goes down."
- *(the crescent appears)* Sighter: "There! Just above the sea."
- Imam: "I see it too. Tonight is the first night of Ramadan. We fast tomorrow, insha'Allah." *(wording checked from a source before use)*
- Imam: "Go and tell your grandpa. The wind will take you."

**Home.**
- Grandpa: "I saw the lantern from here! Tell me everything."
- *(the child picks 3 pictures of the day; Grandpa answers each with one line)*
- Grandpa: "Ramadan Mubarak, little one. You were my eyes today."

## Edge cases
- Talking during a ribbon moment: the talk waits until it ends.
- Leaving mid-talk: the quest step isn't advanced unless its key line was seen.

## Open questions
- English and Bangla at launch, with every line keyed by language code so more can be added.
- Sound: nobody speaks; a cloth pat opens each bubble. The only voice in the game is the summit recitation ([audio](../audio/design.md)).

## History
- 2026-11-17: designed.
- 2026-11-17: design review: the imam goes up on the 29th, not before; the shy boy learns to swim instead of jumping; "tonight is the first night" wording; languages and recordings settled; picture hints.
- 2026-11-17: voices from Freesound and the kit's praise clips; the Bangla title.
- 2026-11-17: voices are authentic human recordings only, never machine-generated.
- 2026-11-17: settled like Short Hike: nobody speaks, a cloth pat per bubble, phrases written; strings, fonts and the data check.
