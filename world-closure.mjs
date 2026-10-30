import {footprintBounds,canPlaceDistrictBuilding} from './district-layout.mjs';
// Shared layout for visible boundary meshes, physical colliders and route checks.
// [centre X, centre Z, width, depth], in metres.
export const ALLEY_BOUNDARY_WALLS = [
  [-70.21, -20.9, .5, 27.8], // 16 cm behind the west facade, never coplanar.
  [-70.21, -48.3, .5, 15.4],
  [-63.79, -31.5, .5, 49], // 16 cm behind the east facade.
  [-83.125, -33.85, 26.65, .5], // Stop at west flank; main alley stays open.
  [-79.65, -40.85, 11.8, .5], // Leave the shop doorway open.
  [-95.65, -40.85, 2.1, .5],
  [-96.45, -39.9, .55, 15.5],
  [-67, -56, 7, .55]
];

// Complete the missing street frontage opposite the alley, ending before
// the school side street at x=-15. No wall across the main road or its entrance.
export const SOUTH_STREET_INFILL = Array.from({ length: 8 }, (_, i) => [
  -77.6 + i * 7.4, 18.2, 7.4, 10.5, 10.5 + i % 3 * 2.1
]);

// Back the west end of the street without occupying the village gate or orchard.
export const WEST_BACKDROP_BANKS = [
  ...Array.from({ length: 8 }, (_, i) => [-178+i*8, -31, 1]),
  ...Array.from({ length: 6 }, (_, i) => [-178+i*8, 40, -1])
];

export function backdropFootprint([x,z,side]){
 return footprintBounds(x,z,8.15,14,Math.abs(side)===2?Math.PI/2:0);
}
// The old core skyline predates the north extension. Keep its buildings out
// of those streets, and use this same filtered list for rendering and collision.
export const CORE_BACKDROP_SHELLS=(()=>{
 const shells=[];
 for(let x=-202;x<=182;x+=8)shells.push([x,-68,1],[x,68,-1]);
 for(let z=-60;z<=60;z+=8)shells.push([-194,z,2],[174,z,-2]);
 shells.push(...WEST_BACKDROP_BANKS);
 return shells.filter(s=>canPlaceDistrictBuilding(backdropFootprint(s)));
})();

// [centre X, centre Z, width, depth, height]. Outside all playable routes.
export const ALLEY_BACKING_BUILDINGS = [
  [-102, -39.5, 11, 25, 11],
  [-67, -61, 20, 10, 12],
  [-83, -30, 20, 6, 9],
  [-80, -47, 9.5, 12, 8]
];
