# Movement

**Status:** designed · **Updated:** 2026-11-17 · [GDD](../../GDD.md)

The child runs, jumps, climbs rock, flaps once more in the air, glides on their shawl and swims. Moving is the joy of the game, so it is quick to start and soft to stop, and falling never hurts (pillar 2). Like the reference, climbing and the extra flap use stamina from [ribbons](../ribbons/design.md); gliding and walking are free.

## Rules
1. **Walk and run.** A small push of the stick walks; a push beyond 70% runs. Running costs nothing.
2. **Jump.** Tapping Jump on the ground jumps. Coyote time and a jump buffer apply.
3. **Flap.** Tapping Jump in the air spends 1 ribbon segment for one more upward push. It can repeat while segments last.
4. **Glide.** Holding Jump in the air while falling opens the shawl: slow sink and fast forward speed, steered by the stick. Releasing closes it. It costs nothing.
5. **Updrafts** (marked by circling birds, leaves and dust) lift a gliding child.
6. **Climb.** Pushing into a climbable surface (rock and cliff; not houses, not the masjid) for 0.2 s starts climbing. Climbing drains segments over time; at 0 the child slides down gently and lets go. Pressing Jump while climbing hops up the climb-hop height and costs 1 segment.
7. **Stamina refills** after standing on ground, or swimming at the surface, for the refill delay.
8. **Ride and row:** the rowboat, the rapids tub and the snow tray use the stick to steer ([side activities](../side-activities/design.md)).
9. **Swim.** Water deeper than the wade depth switches to swimming. It is free and there is no drowning. With the goggles ([tools](../tools/design.md)) the child can dive under. Past the sea edge a gentle current turns the child back (see [water](../water/design.md)).
10. **Falling** from any height lands safely with a dust puff and a short crouch. There is no damage.
11. **Bouncy mushrooms or flowers** launch the child up to the bounce height.
12. **Controls (touch):** a floating stick on the left half (it rests at home bottom-left), Jump/Glide bottom-right, and Action (talk, pick up, use) above Jump, always at its home: dim at rest and bright with a picture of the action when something usable is near (rule 18a). The camera follows on its own; dragging on the right half turns it, optionally ([camera](../camera/design.md)). **Keys:** WASD or arrows, Space jump, E action, mouse drag to turn. The first minutes teach each control until it is used (rule 18a).

## Numbers
First guesses, tuned in M1. The child is 1.1 m tall.

| Name | Value | Unit | What to watch in playtests |
|---|---|---|---|
| Walk speed | 3.2 | m/s | feels sluggish? |
| Run speed | 6.0 | m/s | overshooting ledges |
| Acceleration to run | 0.25 | s | — |
| Stop time | 0.12 | s | slide on stop |
| Jump height | 1.3 | m | reaching village walls by accident |
| Flap height | 1.1 | m | — |
| Coyote time | 0.12 | s | — |
| Jump buffer | 0.12 | s | — |
| Glide sink | 1.6 | m/s | too floaty to aim landings |
| Glide forward | 7.5 | m/s | — |
| Updraft lift | 5.0 | m/s | — |
| Climb speed | 1.4 | m/s | — |
| Climb drain | 1 segment per 2.0 s | — | 7 segments ≈ 20 m of cliff |
| Refill delay on ground | 0.6 | s | — |
| Refill speed | all segments in 1.0 | s | — |
| Wade depth | 0.6 | m | — |
| Swim speed | 2.4 | m/s | — |
| Bounce height | 6 | m | — |
| Climb-hop height | 1.5 | m | — |
| Stick area | left 45% of the screen | — | swap sides in settings |
| Stick dead zone | 15 | % | — |
| Stick radius | 110 | design units | — |
| Tap vs hold on Jump | tap under 0.2 s; held 0.2 s in the air glides | — | — |
| Pointers at once | 3 (stick, Jump, drag; `activePointers: 3`) | — | — |
| Frame time clamp | 1/30 | s | — |
| Stick run threshold | 70 | % | small hands can't run |

**Other controls:** Android Back opens Pause. No gamepad. The simulation runs every drawn frame with the real frame time, clamped to 1/30 s; no fixed step and no frame cap (memory: smooth motion first).

## Edge cases
- A climb ends at the top lip: the child mantles over automatically when the lip is within 0.6 m.
- Gliding into a cliff with no stamina: the child slides down it, no stun.
- Gliding into water: the shawl closes and the child splashes in.
- Pausing mid-air: everything freezes; it resumes with the same velocity.
- Holding Jump through a landing: the glide doesn't reopen until Jump is released and pressed again.

## Open questions
- The flap stays a tap (no automatic flap, which would spend ribbons unseen). The easy route never needs a flap.
- No sprint stamina (pillar 2).
- Collision and ground: three-mesh-bvh (D-018).

## History
- 2026-11-17: designed.
- 2026-11-17: design review: the climb-hop height; the Action button always at home; the camera follows on its own; the flap stays a tap; collision through three-mesh-bvh if approved.
- 2026-11-17: control details (stick, tap and hold, pointers, Back, frame time).
