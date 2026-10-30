# Junction mouths and east high street — 2026-10-29

## Delivered

- Main-street sidewalks, curb bodies, gutters and tactile strips now share split spans. Phu Gia has an 11.2 m clear mouth on both sides; the north alley and southern school side street also have openings. Ground elevation checks use the same mouth layout before returning pavement height.
- Curb and tactile texture density is scaled per segment instead of depending on the length of whichever segment initialized the shared material first.
- Added a 171.4 m fictional eastward continuation of the original high street: (162,0) → (205,0) → (245,-28) → (255,-65) → (245,-105), joining the existing riverside loop. This is based on the direction requested in the screenshot, not newly surveyed Google Maps data.
- Extended movement limits, ground height, location labels, minimap and GPS routing to support the east entrance at (162,0). The old northern entrance still works. Original skyline houses crossing the new road are filtered by the existing shared layout helper.
- Added frontage buildings/signs, street trees and a small rest court with benches and planting. Frontages on diagonal roads have additional setback so conservative building colliders leave the corridor open; background masses sit behind those frontages.
- On load the parked bike uses the saved camera heading instead of always starting at yaw zero. Its heading stays physical when mounting and riding.

## Validation

- 124 tests pass, including sidewalk-mouth layout and both walking/riding routes between the old high street and the loop through the new entrance.
- 400 seeded spatial route simulations: 400 arrivals, zero blocked starts or route findings; full production district and original skyline colliders included. These do not simulate rendering or full vehicle steering.
- Browser: visually checked Phu Gia mouth with the pavement/curb removed; drove from (145,0) across the old x=162 limit to (208.96,0) and braked. Visually reviewed the new road/frontages. Did not manually drive every bend of the new route.
- Test-origin storage restored and temporary tab closed. User localhost save left untouched.

Proof images: `artifacts/phu-gia-junction-mouth.png`, `artifacts/east-high-street-extension.png`.
