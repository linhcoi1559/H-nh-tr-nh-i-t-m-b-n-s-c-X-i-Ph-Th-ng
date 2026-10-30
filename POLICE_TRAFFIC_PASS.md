# Police and traffic pass — 2026-10-29

Implemented:
- Rotated body footprint checks before traffic advances; separated lane offsets; shared reservations for junctions across independent route loops. Spawn positions avoid junctions and occupied bodies.
- Two distinct officers with assembled NPC models, uniforms, patrol/idle/run animations and collision-aware movement. Two traffic cars have police stripes and emergency beacons (no added dynamic lights).
- Bag-snatch event runs along the street; officer pursues, arrests and recovers the bag. K reports the current crime; a successful reported arrest awards 5,000 game coins and 50 XP. Direct player intervention remains available after dismounting.
- Officers can witness sustained speeding or pavement riding. A seven-second warning allows stopping for 1.5 seconds without a charge. Ignoring it creates one ticket. Stop, dismount F, approach the officer and E resolves it with fictional game money. Cooldowns prevent repeated immediate penalties; payment never creates debt. This is an arcade rule set, not a legal fine schedule.
- Speed-limit signs, readable police status, keyboard help, cache revision on app entry/style.

Validation:
- node --check app.js / police-world.mjs passed.
- 137 unit/integration tests passed (zero failed), including police timing, warning compliance, single settlement and rotated traffic bodies.
- Browser: reported arrest increased isolated test balance from 50,000 to 55,000 and XP to 50. Warning compliance passed without deduction. Ignored warning produced a ticket; stopping, dismounting and E changed 50,000 to 45,000 exactly once.
- Browser traffic observation: 84 samples in 15 seconds found no intersecting NPC bodies; all 20 vehicles moved. This does not guarantee congestion-free operation over every possible play session.
- 400 navigation probes reached their targets with zero blocked starts or route findings.
- Final visual proof: artifacts/police-patrol-final.png.
- No 144 FPS claim. Existing Three.js texture-initialization warnings were observed; no fatal browser error was observed in these test runs.

Scope: two foot patrols (central street and riverside), two marked circulating vehicles. No full citywide law/police simulation or real-world fine amounts. User localhost save is separate from the 127.0.0.1 test origin.
