# Facade overlap fix — 2026-10-29

The screenshot showed broken/speckled window edges and a window overlapping a shop door. District frontages placed glass and the frame's back face on the same plane, then drew the centre ground-floor window over the door.

- Removed the ground-floor centre window; the door occupies that bay.
- Moved frames 6 cm towards the street relative to glass. Corrected outward orientation for the opposite street side too.
- Moved side-facade glass 5 cm farther away from building walls, with frames separated in the same manner.
- Added a riverbend review view to the existing isolated browser fixture.

Validation: 120 tests pass. The new raycast regression checks one glass layer through each centre door and a physical frame/glass depth gap on both sides of Phu Gia. Browser review at the riverside bend confirmed the duplicate window over the door is gone; walking/mounting/driving/dismounting was checked through the fixture. This addresses the identified surface-overlap artifact; it is not proof that all possible frame-time stutters or distant edge aliasing across the map are eliminated.

Screenshot: `artifacts/facade-flicker-fix.png`. Test storage restored after review; user localhost storage untouched.
