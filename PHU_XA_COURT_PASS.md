# Phu Xa terminus infill — 2026-10-29

Replaced the exposed western Phu Xa end view with a three-sided residential court, using 17 candidate houses (placement rejects road/public-space intersections), roofs, arched glass and physically separated frames, curved awnings, four planted trees, four benches and two tea tables with stools. Additional soil/planting strips sit behind the court. The court public area is 34 × 30 m, with a paved grid and a clear central approach. Buildings, trees, planters and furniture have colliders. Shared detail geometry is eligible for the existing static compilation; trees retain their existing LOD. No new lights or animation loop.

Added the public rectangle and named location to district layout so the player can actually enter the courtyard. The spatial route audit includes its colliders.

Validation: 125 tests pass; 400 seeded route probes arrive with zero blocked starts or route findings. Additional regression verifies walking and riding to (-166,-108), court furniture colliders and no added lights. Browser visually reviewed the court from its street entrance in a separate 127.0.0.1 fixture; user localhost save was not changed and test-origin storage was restored. This addresses the western Phu Xa terminus shown, not every empty view across the entire map. No new NPC interactions were added in this pass.

Screenshot: `artifacts/phu-xa-court-fill.png`.
