# Shared world model revision · 2026-10-28

The replacement is wired into shared constructors and a startup architecture pass, so it covers the core street, school/ward campuses, alley, market/park/orchard, entertainment shop and the district extension. It uses locally generated geometry and derivatives of the existing CC0 characters; no paid model service or remote asset is required.

## Active replacements

- 224 core building envelopes, including instanced backing rows and story occluders. Facades contain inset bays with return surfaces; building footprints, object transforms, texture-face slots and colliders are retained. Plain plaster uses tiled UVs; photograph/sign facade materials keep normalized full-facade UVs.
- 200 district building instances use the same envelope family with repeated inset bays, aluminum window frames, reflective panes, drainage pipes and rooftop tanks. Their roof batches use pitched geometry; chunk culling remains in place. Window/pipe/detail geometry is merged per material per 64m chunk while building/roof bodies remain instanced, keeping the existing batch-budget test passing. These are shared building families rather than 424 individually authored landmark replicas.
- 40 street trees now have branching trunks and three instanced leaf batches each instead of opaque crown polyhedra. Orchard peach trees, balcony shrubs and lotus flowers also use branch/leaf/petal forms. Market potted plants and bouquets use the preceding market revision.
- Shared stools, tea tables and park benches have open supports, curved seats and slats. The shop crowd uses adult character derivatives and open stools.
- All four parked cars use lofted coachwork and cabins with varying cross sections, plus pillars, handles and lenses. The shared scooter constructor changes body, seat and leg shield profiles, including parked bikes, ambient traffic, shop displays and the player's bike. Wheel/steering/handgrip pivots remain compatible with movement code.
- The six active GLB role assets are the `-adult.glb` derivatives. The build script lengthens limb proportions, reduces the oversized head, rebuilds bind matrices and adjusts translation tracks. Original animations and CC0 source GLBs remain available. Head/bone aliases account for GLTFLoader's removal of dots from node names. Seat height and rider shoulder origins are adjusted for the new proportions. Ambient traffic riders now use these GLBs too.
- Corgi and event/pet animal torsos use ellipsoid geometry instead of rounded cuboids.
- Falling leaves use a transparent leaf silhouette instead of square points; density is reduced from 220 to 100.

Road surfaces, structural walls, window glass, rails, signs, cabinets and actual rectangular parcels still use planar or rectangular components where appropriate. Collision primitives deliberately remain simple. This is a shared model-system replacement, not a claim that every triangle or decorative object was replaced with a bespoke scanned asset.

## Validation

- 84 Node tests pass. New checks cover finite geometry/skin transforms, compact footprints, six facade material slots, facade UVs, all six adult GLBs and their animation clips, tree batch budgets, furniture clearance and unchanged small detail/floor meshes during the building pass.
- Browser fixture: `tests/world-models-preview.html`. It waits for actual scene and character readiness, reports model-family coverage, supplies four fixed district views and supports walking/riding checks with isolated storage backup/restore. HUD hiding is an inspection feature of the fixture only.
- Browser verification passed for core street, market/park, Phú Xá and Ngõ 41 with no console errors or warnings. Walking and bike mount/drive/dismount checks passed. The existing three-table arcade browser fixture also passed entry, pause/resume, all-in confirmation, settlement and save/reload checks after the crowd-model change. Isolated test storage was restored.
- No new runtime light sources, reflection render passes or external model requests are introduced. This is not a measured frame-rate guarantee.

Regenerate character derivatives with `npm run build:characters`.
