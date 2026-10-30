# Crossing access repair — 2026-10-30

Crossing paint, walking permissions and NPC waypoints now share oriented crossing rectangles. Added intermediate marked crossings on all street segments, with approaches extending onto both pavements. Angled roads use their actual tangent; oversized unpainted junction permission squares were removed. Main/branch crossings connect at the original junctions. New paint is one InstancedMesh and follows ground height. Normal foot movement retains the sidewalk rule outside marked crossings.

Verification: five focused connected-city tests pass, including every painted crossing traversed in both pavement approaches and NPC route completion. Browser keyboard playtest passed from (-113.4,-9) to (-113.4,8.52), across the entire road. Proof: artifacts/crosswalk-access.png. JavaScript syntax checks passed.

Full suite: 145/147 passed; two unrelated Unreal bridge tests failed to create their sandbox-provided temporary directories (ENOENT). Changing TEMP and precreating os.tmpdir did not resolve the sandbox path mapping. No Unreal production code was changed.
