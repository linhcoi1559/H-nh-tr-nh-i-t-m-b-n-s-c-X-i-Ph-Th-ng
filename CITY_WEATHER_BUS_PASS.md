# City buses, utilities and weather — 2026-10-29

- Two rounded-body neighborhood buses on a fictional local PT 01 route between Ngõ 41 and the school area. Two shelters, route signs, animated wheels, sliding doors and eight-second stops. Buses use full 7.1 m footprints for vehicle/player collision. No boarding or ticketing system is implemented.
- 160 generated street-light/utility poles across the ten driveable street definitions, 166 linked spans carrying 996 sagging cables, and service drops. Placement rejects existing solid footprints and road mouths. Instanced pole parts and one line mesh avoid hundreds of separate wire draw calls.
- All bulbs glow at dusk/night; nearest eight non-shadow point lights follow the player, with inexpensive ground pools for coverage farther away. No new shadow maps per pole.
- Automatic or manual clear/cloud/rain/wind weather. Local rain streaks and wind particles, small cable movement, gradual wet/dry roads and overcast lighting. Indoor rain is suppressed using building footprints. Particle counts fall on low/performance presets. Existing story-night effects remain separate.
- Full 24-hour saved game clock, dawn/night light switching and manual time slider under O → Cấu hình. Automatic weather changes follow game hours, not live external weather data.

Validation:
- 142 tests pass, zero failed; app.js and new module syntax checks pass.
- Browser detected two buses, 160 poles and 996 cables; bus reached a stop with a positive dwell timer. Moving-traffic body observation: 85 samples in 15 seconds, no overlaps, all 22 vehicles moved in the first run. Final night run: 98 samples, no overlaps, 21/22 moved; one vehicle yielded during the observation.
- Manual rain selection via settings produced rain blend >0.99 and wetness >0.98. Night scene and automatic wind verified in the extension.
- Fixed a shader newline error found in the first browser run before delivery.
- A circular bus-obstacle radius initially blocked the opposite lane; lateral radius and longitudinal nose clearance now differ, covered by regression test.

Limitations: route is fictional, buses currently circulate on the central high street only; wind affects cables/particles rather than every building/tree. Neighborhood props remain stylized. No FPS target is claimed. Test origin 127.0.0.1 is separate from the user's localhost save.

Proof images: artifacts/city-bus-cables.png (street cables), artifacts/city-night-lights.png and artifacts/city-rain-night.png. Final browser scene reported no shader errors.
