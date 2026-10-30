# Character assets

The active player and NPC models were created with the Grab3D Character Mixer
and exported as rigged GLB files on 2026-10-26.

- Creator: https://grab3d.com/tools/character-mixer/
- License: CC0 1.0 / public domain
- License page: https://grab3d.com/license/
- No account, payment, or attribution is required by the asset license.

Active files:

- `player-cozy.glb`: player; idle, walk, run, wave, and jump clips.
- `npc-guard.glb`: school guard; idle, walk, and wave clips.
- `npc-official.glb`: ward official; idle, walk, and wave clips.
- `npc-vendor.glb`: street vendor; idle, walk, and wave clips.
- `npc-resident.glb`: resident / neighbourhood leader; idle, walk, and wave clips.
- `npc-veteran.glb`: veteran; idle, walk, and wave clips.

Every model uses the same 19-bone Grab3D rig. Movement remains controlled by
the game while the embedded clips animate the skeleton in place.

The older Three.js example and Mixamo-derived files remain in this directory
for compatibility and rollback, but the main character loader no longer uses
them.

Build dependency: Three.js 0.160.0 (MIT).

## Adult proportion derivatives · 2026-10-28

The active character files now use the `-adult.glb` variants of the six Grab3D
models above. These are locally generated CC0 derivatives, not newly downloaded
assets. `tools/build-adult-characters.mjs` transforms the skinned vertex positions
and normals, recalculates bind matrices and adjusts translation tracks together.
Legs/arms are lengthened and the large stylized head is reduced. Original files
remain available as source assets. The runtime normalizes each role's height and
retains the original animation clips.

## Modular NPC identities · 2026-10-28

`citizen-roster.mjs` assembles 30 deterministic NPC appearances from the five
existing CC0 NPC derivatives: matching torso/leg skin, head, hair, garments,
shoes and optional headwear/glasses. Per-identity geometry, colors and fitted
accessories are local derivatives of the same sources. No paid assets or new
external downloads are used. Hero geometry is reserved for the player; compatible
animation clips may be shared. Original GLBs remain unchanged.

## Animal & Pet 3D GLB Models · 2026-10-29

- `cat-golden.glb`: Based on "Toon Cat FREE" (https://sketchfab.com/3d-models/toon-cat-free-b2bd1ee7858444bda366110a2d960386) by Omabuarts Studio (https://sketchfab.com/omabuarts), licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/).
- `pet-fox.glb`: "Fox" from Khronos Group glTF-Sample-Assets (https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox) by PixelMannen / tomkranis, licensed under CC-BY-4.0.
