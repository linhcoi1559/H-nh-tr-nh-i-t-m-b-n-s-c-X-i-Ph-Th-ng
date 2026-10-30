# Quality pass · 2026-10-27

Implemented and verified in this pass:

- Normal-mode HUD uses a separate readable quest column. At narrow widths, quests occupy a full row and action buttons scroll within their own strip. Inventory summary is hidden on narrow screens; the inventory button remains available.
- Pointer dragging and wheel zoom stop while dialogue, settings, journal or inventory is open. Arcade and daily-job windows capture arrow keys as well as movement keys. Window blur clears held inputs, mouse dragging, walking momentum and bike speed.
- Snapshot writes catch blocked storage and quota errors. The HUD shows an unsaved warning rather than a success indicator. The current action continues in memory, with a single explanatory toast; a subsequent successful write clears the error. This cannot guarantee persistence while the browser denies storage.
- Shop interaction requires being within 2.45m of a specific table. Entering the shop alone does not open a game selector.
- New-district guidance follows the road graph and draws a dashed minimap route. Paths are cached until the destination changes or the player moves 2m. Approaching the extension along Phú Gia continues north without a detour back to the old junction. Core-only guidance still uses the existing direct target.

Validation:

- `npm test`: 73 passing tests, including route centreline sampling, Phú Gia approach/return routes, storage failure/recovery and modal camera/input guards.
- Syntax checks: `app.js`, `arcade.mjs`, `daylife.mjs`.
- `tests/runtime-preview.html`: browser PASS at 1200px and 390px iframe widths; wheel does not alter camera behind the modal, held arrows do not leak into walking, blur stops movement, simulated quota failure does not interrupt dealing, recovery saves the pending hand.
- `tests/arcade-preview.html`: browser PASS for physical entry and all three tables, pause/resume, all-in confirmation/cancel, save/reload, no duplicate buy-in, settlement and unchanged living-money balance.
- Test fixtures run on 127.0.0.1 with backups restored afterwards, separate from the user's localhost save.

This pass improves robustness and navigation. It does not establish a measured FPS gain, replace the game's art assets or claim complete obstacle pathfinding in the old neighborhood.

## Startup repair · 2026-10-28

Reproduced a blank 3D canvas and minimap with the HUD still visible. The browser reported `ReferenceError: loadScannedPbrTexture is not defined` in `buildExtendedExplorationDistrict`, stopping world initialization before `animate()` could start. The three grass texture calls now use the existing `loadPbrTex` helper, preserving repeat settings and color/data color spaces.

Verified the world and minimap render again, the localhost save loads, a separate-origin fresh game produces no console errors, all 73 Node tests pass and the browser runtime fixture passes its wide/narrow UI, camera, held-input and save-failure/recovery checks. Test-origin storage was restored after verification.

## Market graphics correction · 2026-10-28

- Added the missing final `OutputPass` for ACES tone mapping and sRGB conversion. The color grade no longer clamps linear HDR to 0–1 before output; saturation is reduced to .94. Daytime startup leaves the flashlight off; story-night code still enables it.
- Replaced ornamental peach crown solids with visible branches and small five-petal flowers. Kumquat trees have individual instanced leaves and fruit. Curved hollow clay pots replace blue cylinders with gold rims.
- Flower buckets now use stems, leaves and oval petals, with at most six mesh draws per bouquet rather than a separate mesh for every head and center. The model tests check finite transforms, compact footprints and mesh budgets.
- Replaced solid stair-riser blocks under flower displays with open metal supports and thin wood shelves. Awning roofs use a curved cloth surface. Street-tree pits use an open rounded lip and soil surface rather than solid square blocks.
- Muted the yellow tactile strip and reduced bump depth; removed duplicate street-event toasts that obscured the same card twice.
- `npm test`: 76 passing. `tests/market-preview.html` provides a fixed street-level market viewpoint with isolated save backup/restore for visual review. Browser review showed the scene and minimap rendering with no console errors. Existing buildings and vehicles still contain block-based geometry; this pass does not replace all world models.

## Shared model-system replacement · 2026-10-28

The subsequent user-requested map-wide pass is recorded in `WORLD_MODEL_REVISION.md`: new building envelope/roof families, district facade details, street/orchard vegetation, open furniture, curved vehicle profiles and six adult-proportion GLB derivatives. The final suite has 84 passing tests. Four-region browser review and the three-table arcade fixture passed; separate-origin fixture storage was restored. The model revision keeps collision primitives and appropriate rectangular structural components.

## FPS and continuity pass · 2026-10-28

See `PERFORMANCE_PASS.md` for the controlled comparison and raw sample path. The core viewpoint improved from 48.1 to 60.0 average FPS at the same Medium/1200×600/DPR 1 settings; average sample p95 changed from 25.7ms to 16.9ms. The optimized district viewpoint also measured approximately 60 FPS. These are local observations, not a device-independent promise. The suite now contains 89 passing tests. Static geometry/material grouping, shadow pacing, conservative actor culling, persistent building silhouettes, non-overlapping roads and matching physical ground heights are covered. Added potted greenery and drain slots are baked into district detail batches.

## Citizen and traffic follow-up · 2026-10-28

See `CITIZENS_TRAFFIC_PASS.md`: fitted helmets, shared fabric materials, shoulder bags, distinct traffic riders, registration plates, brake lamps/turn indicators, real traffic stopping, pedestrian yielding and a fourth daily job covering the extended district. Three resident recipients and physical address plaques make its stops identifiable. 93 tests pass; browser receipt/save/reload/reward and walking/riding checks pass without console errors. Final isolated samples range 56.94–60 FPS at medium/1200×600/DPR 1, with p95 16.8–24.5ms; frame-time variation remains. Test storage restored and temporary tabs closed.

## Architecture and high-refresh follow-up · 2026-10-28

`ARCHITECTURE_REFRESH_PASS.md` records chamfered building corners, real arched frames, side windows, curved shop canopies and varied roof profiles. Permanent architecture batches reduce 391 meshes to 98; compact shared skin surfaces retain colors, skeletons and animations. 96 tests pass. Added an optional speed preset and CPU submission timing; final 1200×600/DPR 1 observations remain approximately 59–60 FPS. The empty-page browser cadence is about 59.9 Hz; 144 FPS has not been verified and CPU p95 in tested scenes remains above its 6.94ms budget.

## NPC identity follow-up · 2026-10-28

`NPC_ROSTER_PASS.md` records removal of the male-NPC-to-player fallback and 30 deterministic modular appearances drawn exclusively from NPC geometry. Corrected garment/body matching, role assignment, head proportions, hair, colors, shoes and accessories; preserved the player model and existing gameplay IDs. 98 tests pass, including all 30 rigs and animation sets. In-game identity checks show no duplicate street/event identities; walking/riding and courier save/reload/reward checks pass without console errors. Background-throttled frame samples were excluded; no new FPS improvement is claimed.
