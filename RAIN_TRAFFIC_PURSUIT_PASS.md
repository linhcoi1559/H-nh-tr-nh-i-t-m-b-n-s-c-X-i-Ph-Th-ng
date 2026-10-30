# Rain, connected traffic, pedestrian rules and pursuit — 2026-10-29

- Replaced long CPU-updated rain line segments with a soft GPU point shader, smaller perspective-scaled droplets, local ground rings, darker storm tint and gradual wetness. Rain still uses no external weather feed.
- Production traffic follows six connected loops through neighboring street segments, rather than independent out-and-back loops for each street. Bus route continues across the west/north/east network. These are authored routes in the fictional game map, not real transit schedules.
- Added pedestrian road exclusion outside designated crossings, intermediate crossing waypoints and extra crossing paint. Courtyards and interior areas remain accessible. Ordinary moving NPCs and player walking use the rule; emergency suspect movement is a separate scripted event.
- Ignoring a witnessed traffic warning dispatches a marked police car along a road graph. Police-car proximity or an officer physically approaching a stopped suspect triggers capture, one fine plus evasion surcharge, a 15-second in-game holding-cell scene, then release outside the station with the bike nearby. This is an arcade consequence, not a claim about real-world criminal procedure.
- Performance: halved the new street-light pool from eight to four, moved rain simulation to the GPU, instanced added crossing markings, and capped shadow refresh at 10/15 Hz while preserving immediate updates on large position changes. No claimed FPS target or measured percentage speedup.

Verification:
- 146 tests passed, including route sampling across connected streets, legal pedestrian road entry, police shortest paths, physical capture distance, shadow refresh budget and existing gameplay tests.
- Browser chase scenario passed: warning → pursuit → police car arrival → detention → release. Test wallet changed 50,000 to 40,000 once, state returned to patrol and player returned to the station area. No fatal browser errors were observed.
- First pursuit fixture attempt was interfered with by an unrelated random thief event. The repeat used a fixture flag suppressing unrelated events, not a production gameplay bypass.

Limitations: police chase traffic avoidance and pedestrian navigation are lightweight game systems, not a full traffic simulator. Longer congestion and every camera angle are not certified by unit tests. Test storage is isolated at 127.0.0.1 and restored afterward.

Follow-up during verification: fixed junction reservations left behind by a pursuing car, added stalled-owner yielding and shoulder avoidance, and prevented a centreline pedestrian projection from pushing along a vertical road. Added a walking-crossing completion regression test.

Final repeated browser chase passed after avoidance fixes: capture, single deduction, holding-room image and automatic release. The holding room was then enclosed with a corridor and ceiling to remove the exposed background seen in the first proof image.

Final night/rain browser observation: 99 traffic samples in 15 seconds showed no NPC-body overlaps; 21 of 22 vehicles moved, with one yielding. Browser error log was empty. Proof: artifacts/rain-soft-particles.png. Fixture save was restored after testing.
