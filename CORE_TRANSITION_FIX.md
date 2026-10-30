# Core transition and minimap heading — 2026-10-29

Root cause: the original skyline ring at z=-68 still crossed Phu Gia at x=42 after the extension was built. Only the additional western banks had colliders. District-only route checks could not catch these original-core visual obstructions.

- `CORE_BACKDROP_SHELLS` now supplies both rendering and colliders. Skyline footprints intersecting district streets and their pavement are filtered out. Rotated side banks use their actual world AABB dimensions.
- The route simulation now includes the retained original skyline colliders too.
- Canvas minimap mapping is +X right, +Z down. An up-facing marker therefore needs angle PI-yaw, not -yaw. Riding uses the current bike heading; walking uses body heading.
- Added isolated browser fixture view at (42,-104), looking towards the former skyline barrier, and a drive-through check to z>-50.

Validation: 122 tests pass, including cardinal/diagonal minimap directions and the main road plus both pavement approaches through the old skyline. 400 seeded route simulations arrive with zero blocked starts or route findings. The browser screenshot shows the former wall removed and the south-facing minimap marker pointing down correctly. The rendered drive-through passed: travelled from (42,-104) across z=-68 and braked at (42.92,-40.57), beyond the old core boundary. Test-origin storage restored after testing; localhost user save untouched.

Screenshot: `artifacts/phu-gia-backdrop-open.png`.
