# Mở rộng Phú Gia – Phú Xá – An Dương Vương

## Cập nhật 29/10/2026

Đã thêm tuyến vòng phía Đông dài 454,9 m với ba vùng công cộng và bộ ảnh khám phá. Phần mới là khu hư cấu để mở rộng gameplay, không lấy tên/đường thực tế làm bằng chứng địa lý. Chi tiết trong [EAST_WORLD_EXPANSION.md](./EAST_WORLD_EXPANSION.md).

Reference inspected 2026-10-27: [Google Maps](https://www.google.com/maps/@21.0872709,105.8092817,17z).

The visible map shows Phú Gia joining Phú Xá north of THPT Tây Hồ, continuing towards An Dương Vương. Phú Xá curves towards the eastern dyke road. Those connections inform this extension. Existing core streets, landmarks and quests are retained; they were previously fictionalized. The new layout compresses distances and rotates the local axes to meet that core. It is **not** a surveyed 1:1 reconstruction, GPS navigation or a claim about actual building facades/road widths. Facades are representative residential infill. No Google imagery or proprietary map tiles are embedded in the game.

- Three road polylines, over 1 km of in-game centreline in total. Entry follows existing Phú Gia at x=42 from z=-55; junction at (42,-125); dyke at (20,-230), with western and eastern continuations.
- Continuous asphalt/pavement strips, physical house/post colliders, instanced windows/roof caps, distant backing banks, route labels and minimap roads. The exterior playable boundary follows constructed street corridors rather than exposing the entire plane.
- Rendering uses 64m chunks with baked transforms. Building and roof silhouettes remain present; small details enter at 185m and leave at 225m, refreshed after 4m of movement. This hysteresis replaces the earlier whole-chunk cutoff at 205m. No extra live lights are added. The existing spatial grid handles collision boxes.
- Save coordinate limits expanded so reload in the new area does not reset players to the former -55m boundary. Night-story bounds and progression remain separate.
- `tests/district-routes.test.mjs`: network connections, centreline clearance for a .62m bike radius, save roundtrip, chunk culling and no extra lights. `tests/district-preview.html`: separate-origin browser fixture with physical walking across the old boundary.

To reach the extension: follow Phú Gia north from the existing junction 68. The “Khám phá Phú Xá” button sets a guidance target at the first new junction. Extension guidance now follows the road graph through junctions, with a dashed route on the minimap and the next waypoint used by street arrows. Paths are cached until the player moves 2m or changes destination. Core-only guidance retains the existing direct marker; this is not full obstacle navigation through every old alley.
