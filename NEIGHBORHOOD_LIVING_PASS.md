# Neighborhood infill and household details — 2026-10-29

The south bend screenshot exposed the base plane between sparse frontage blocks. Short straight curb segments also projected into the bend's joined asphalt polygon.

## Changes

- Added `district-living.mjs`: a second residential row along district corridors, bend infill, southern rear gardens and a continuous garden boundary behind the housing. Placement checks all currently registered production box colliders, all district roads and public areas. Accepted houses and solid props register colliders.
- Browser production counts: 92 added houses, 30 shop corners, 22 bicycles, 22 laundry lines, 88 utility cabinets, 176 planters and 108 garden planting pieces. Figures refer to this generated layout; the isolated unit fixture has fewer old-core obstacles and can accept more houses.
- House variations include flat/hip/gable roofs, arched/rectangular windows and roller-shutter/door frontages. Glass/frame depths stay separated.
- Existing frontage metadata drives household dressing: air conditioners with grille slats, service cabinets, planters, washing lines with shirts/towels and bicycles with narrow tyres and tube frames. Shop contents follow the existing shop type: produce for groceries, cups for tea shops, spools for tailors, containers for pharmacies. These props are scenic; this pass does not add shop interactions or new quest NPCs.
- Short curb blocks are excluded within 8 m of a road vertex, avoiding stray plank-like blocks across the inside of turns. Roads remain open.
- Repeated pieces use instanced batches in 64 m cells and shared geometry/materials. Small detail groups use 140/175 m visibility hysteresis; main silhouettes remain visible. No new lights or animation loop. No foreground FPS measurement or improvement claim.

## Validation

- 130 tests pass, including traffic envelopes against the newly added colliders, curb bend exclusion, background coverage along representative south-facing rays, finite instance transforms and detail visibility behavior.
- 400 seeded player route simulations: 400 arrivals, zero blocked starts or route findings.
- Browser visually reviewed the south bend and tailor frontage. Production counts read from the playtest DOM; no browser errors captured during the first review. The resulting screenshot shows housing and gardens in the formerly empty outward view. Not an exhaustive audit of every view across the map.
- Testing used 127.0.0.1. Fixture backup restored and temporary tab closed; user localhost save untouched.

Proof: `artifacts/south-neighborhood-living.png`, `artifacts/neighborhood-household-details.png`.
