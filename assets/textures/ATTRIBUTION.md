# Scanned surface textures

All nine JPG maps are downloaded from Poly Haven at 1K resolution, with MD5 verified against its public API.

License: **CC0 1.0**. Free for commercial and noncommercial use and redistribution. Official terms: https://polyhaven.com/license

- Painted Plaster Wall: https://polyhaven.com/a/painted_plaster_wall
- Concrete Floor 02: https://polyhaven.com/a/concrete_floor_02
- Red Brick: https://polyhaven.com/a/red_brick

Each material includes color (sRGB), OpenGL normal and roughness (linear) maps. Exact download URLs, sizes and checksums are recorded in `sources.json`. The game loads these files locally; it does not require Poly Haven to remain reachable during play.

Reproducible download script: `tools/fetch-visual-materials.ps1` (requires network access).
