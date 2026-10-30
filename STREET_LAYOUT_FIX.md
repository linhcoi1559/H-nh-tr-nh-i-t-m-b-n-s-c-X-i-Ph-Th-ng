# Street layout and collision pass — 2026-10-29

## Changes

- Replaced the road canvas containing baked white/yellow paint with the existing local CC0 asphalt PBR set. Core road UVs use metres; centre marks are separate geometry. This removes repeated transverse markings from the user's screenshot.
- Every generated district frontage, outer background house and endpoint building now uses one placement/collider helper. It rejects footprints crossing any road plus its 3.2 m pavement allowance or an eastern public space. Accepted buildings register their rotated conservative AABB, including background houses that previously had no collider.
- Added geometric curbs away from junctions and public plazas; four shop-sign variants share one atlas.
- Added 12 street trees, 3 benches and 3 bins to the district. Prop placement checks roads and accepted building footprints. Small details use distance hysteresis and static batching; no lights or animation loops added.
- The world route audit now includes the new streetscape colliders.

## Validation

- `npm test`: 119 tests pass. New regression checks match every rendered district building instance to its collider and check road/public-space clearance, including rotated footprints.
- `node tools/playtest-world.mjs 4105 400`: 400 arrivals, zero blocked starts or route findings. These are spatial route simulations, not rendered gameplay or a physics benchmark.
- Browser fixture: `tests/high-refresh-preview.html`, separate 127.0.0.1 origin. District view and Phu Gia transition visually reviewed. Walking, mounting, driving and dismounting passed. Fixture storage was restored and temporary tab closed; localhost user save was not edited.
- District medium preset, 1200×600, DPR 1: three browser samples about 60 FPS, frame p95 16.8 ms, CPU submission p95 6.9–7.7 ms. Calls varied 144–263 during the movement sample. This does not establish 144 FPS or whole-map performance. Texture-loading warnings remain in captured logs; no claim that all rendering warnings are resolved.

Screenshots: `artifacts/street-layout-fix.png`, `artifacts/phu-gia-transition-fix.png`.

This pass corrects road paint, district placement/collision and street dressing. It does not replace every existing core asset or make the layout a surveyed reproduction of Google Maps.
