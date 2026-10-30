# Frame pacing and street continuity · 2026-10-28

## Controlled browser measurement

Same core viewpoint `(4, 2)`, yaw 0, Medium, 1200×600 CSS pixels, DPR 1. Three approximately three-second frame windows were sampled after character loading. No resolution or preset reduction was used.

| Measurement | Before | Final |
|---|---:|---:|
| Average FPS across the three samples | 48.1 | 60.0 |
| Average sample p95 frame time | 25.7ms | 16.9ms |
| Recorded render-call samples, including postprocessing/shadows | 8798–8806 | 707–1597 |

The final samples include both frames that refresh the shadow map and frames that reuse it. These are local browser observations, not a guarantee for every computer, resolution, camera angle or moving scene. Raw samples: `artifacts/performance-2026-10-28.json`. Fixture: `tests/performance-preview.html`.

## Changes

- Reordered building-envelope triangles into six contiguous material groups. Previously every inset quad was a separate material group, multiplying both color and shadow draw calls. UVs, face materials and geometry remain the same.
- Opt-in static compilation merges facade details, flower stands, tea-stall furniture, parked cars and benches by material/shadow state. The inspected world combines 2115 static mesh objects into 587 batches, preserving transforms and source materials. Moving wheels, skeletons, unmarked objects, instanced geometry and interaction rings are excluded. The static transform branches are frozen after baking.
- Skinned-character bounds are expanded conservatively and frustum culling enabled. Their animations are retained; no model or texture resolution is reduced.
- Shadow maps refresh at up to 30Hz while stationary, with an immediate refresh after more than .25m of movement. Moving actors and their animations still update at the normal game rate.
- District building/roof silhouettes remain present. Only small street details use distance hysteresis (enter 185m, leave 225m), avoiding an entire block disappearing at a single distance threshold. NPC range also has an enter/leave band.
- The legacy vertical road stops at the extension and has a cut-out at the main intersection, removing overlapping asphalt planes. District road layers and paint use explicit height and depth bias. Physical ground height matches the district's visible road/pavement height.
- Added batched potted greenery and pavement drain slots to the new district, without adding light sources or blocking road colliders.
- The FPS readout now counts all renderer passes rather than just the final fullscreen pass.

## Verification

89 Node tests pass, including batch transform/material preservation, protected moving objects, grouping limits, crossroad raycasts, ground heights, culling hysteresis and persistent building silhouettes. Browser walking, mounting/driving/dismounting checks pass at the core viewpoint. Test fixtures use separate-origin storage with backup/restore.

The optimized Phú Xá viewpoint measured approximately 60 FPS across three additional windows (p95 16.8ms). Walking and bike mount/drive/dismount checks passed there as well, with no browser errors or warnings. Test storage was restored after both viewpoints. The final fractional shadow scheduler retains remainder time to keep its stationary cadence close to 30Hz rather than drifting towards 20Hz.
