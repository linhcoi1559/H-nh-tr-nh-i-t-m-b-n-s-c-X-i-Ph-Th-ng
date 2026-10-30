# West/south expansion and street traffic — 2026-10-29

## World and naming

- Added a 197.3 m western road linking the old west end to Phu Xa, and a 137 m southern loop linking the two existing southbound streets. These are fictional extensions in the directions requested by the screenshots, not surveyed street coordinates.
- Updated constraints, surface heights, save Z bounds, minimap and full route-map viewport. GPS supports the west and south entrances as well as the existing north/east entrances. Original background buildings are filtered through the shared road-clearance helper.
- Added an accessible western peach garden with eight peach trees and a bench. Existing orchard signs, photo locations, wish-tree UI, courier destinations and relevant event text now use Phu Thuong. References to Nhat Tan bridge and other surrounding districts remain valid geographical context.
- Shortened the school fence to x=36.1 so it stops before Phu Gia's 36.4 m mouth edge; added a terminal pillar and horizontal rails. Collider follows the shortened base.

## Traffic

- Ten road routes: original high street, Phu Gia approach, school side street and all seven district roads. Each has one scooter and one car (20 moving vehicles total). Alleys, plazas and garden paths remain pedestrian areas.
- Rounded centrelines, two offset lanes and continuous end turns replace the four scooters confined to the old street. Vehicles slow before curves, follow traffic, yield by stable junction priority and brake for pedestrians/player. This is a lightweight route-following traffic system, not a full autonomous driving simulator.
- Cars have rotating wheels and oriented full-body collision against the player. They do not add permanent spawn-point colliders. Bikes retain steering, leaning, wheel rotation and signals. Vehicles use current ground height.
- Six additional NPC identities give ten different riders. Character-source tests still verify unique geometry and separate hero assets.
- Distance culling (170/200 m hysteresis) limits rendered traffic. Fixed bike/car pieces are batched separately from moving wheels, steering, signals and riders. No new real-time lights.
- Moved three existing direction signs away from the driving envelope.

## Validation and limits

- 128 automated tests pass, including 650 samples of every traffic route with a three-point car capsule clearance check against production district/skyline/furniture colliders. Original core colliders are not all included in this spatial harness.
- 400 seeded player-route simulations arrive with zero blocked starts or findings.
- Browser: all 20 vehicles moved more than 1 m in an eight-second observation; ten road IDs and ten of each vehicle type confirmed. No browser errors captured during initial loading. This is not a long-duration junction congestion test.
- Browser drive checks passed westward to (-215.73,0) and southward to (42.92,93.6). Garden and fence corner visually reviewed. Did not manually drive every bend or record a reliable foreground FPS benchmark: the background session reported approximately one-second RAF intervals and the benchmark timed out. No FPS improvement is claimed.
- User localhost save untouched. Testing used a separate 127.0.0.1 origin and the current fixture backup was restored before its tab was closed.

Screenshots: `artifacts/phu-thuong-peach-west.png`, `artifacts/school-fence-traffic-fix.png`.
