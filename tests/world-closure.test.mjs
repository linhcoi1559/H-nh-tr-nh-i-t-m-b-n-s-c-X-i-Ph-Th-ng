import test from 'node:test';
import assert from 'node:assert/strict';
import { ALLEY_BOUNDARY_WALLS, ALLEY_BACKING_BUILDINGS, SOUTH_STREET_INFILL, WEST_BACKDROP_BANKS } from '../world-closure.mjs';
import { cameraObstructionFraction } from '../collision-grid.mjs';
import {CORE_BACKDROP_SHELLS,backdropFootprint} from '../world-closure.mjs';
import {canPlaceDistrictBuilding} from '../district-layout.mjs';

const boxes = [...ALLEY_BOUNDARY_WALLS, ...ALLEY_BACKING_BUILDINGS].map(([x,z,w,d]) => ({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2}));
const indices = boxes.map((_,i) => i);

test('legacy skyline leaves the Phu Gia extension and its pavement open',()=>{
 const skyline=CORE_BACKDROP_SHELLS.map(backdropFootprint);
 assert.ok(skyline.length>80,'retain the surrounding skyline');
 assert.equal(canPlaceDistrictBuilding(backdropFootprint([38,-68,1])),false,'old skyline house crossed the extension');
 assert.ok(skyline.every(canPlaceDistrictBuilding));
 for(const x of [35,42,49])assert.equal(cameraObstructionFraction(x,-105,x,-50,skyline,skyline.map((_,i)=>i),.65),1,'road and both pavement approaches must stay open');
 const rotated=backdropFootprint([174,4,-2]);assert.equal(rotated.width,14);assert.ok(Math.abs(rotated.depth-8.15)<1e-9);
});

test('closure leaves the street-to-alley, side lane and shop entrance connected', () => {
  for (const [ax,az,bx,bz] of [[-67,-7.5,-67,-55], [-67,-37,-95.7,-37], [-90,-37,-90,-44]]) {
    assert.equal(cameraObstructionFraction(ax,az,bx,bz,boxes,indices,.46), 1, `blocked playable route ${[ax,az,bx,bz]}`);
  }
});

test('walls intercept views towards both ends and through the formerly open side gaps', () => {
  for (const [ax,az,bx,bz] of [[-81,-37,-120,-37], [-67,-52,-67,-90], [-67,-23,-90,-23], [-67,-23,-40,-23]]) {
    assert.ok(cameraObstructionFraction(ax,az,bx,bz,boxes,indices,0) < 1, `unsealed view ${[ax,az,bx,bz]}`);
  }
});

test('closure walls sit behind both facade planes rather than competing for the same depth', () => {
  const westFacade = -67 - 5.9 + 6.2 / 2;
  const eastFacade = -67 + 5.9 - 6.2 / 2;
  for (const [x,,w] of ALLEY_BOUNDARY_WALLS.slice(0,2)) assert.ok(x+w/2 < westFacade-.1);
  const [x,,w] = ALLEY_BOUNDARY_WALLS[2];
  assert.ok(x-w/2 > eastFacade+.1);
});

test('opposite street frontage closes the empty view while preserving road and school turn', () => {
  const frontage = SOUTH_STREET_INFILL.map(([x,z,w,d]) => ({ minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2 }));
  const ids = frontage.map((_,i) => i);
  for (const x of [-77,-67,-57,-47,-37,-27]) assert.ok(cameraObstructionFraction(x,-8.5,x,50,frontage,ids,0)<1);
  assert.equal(cameraObstructionFraction(-120,0,40,0,frontage,ids,.62),1);
  assert.equal(cameraObstructionFraction(-15,0,-15,55,frontage,ids,.62),1);
});

test('west backing buildings keep the village gate, orchard and street accessible', () => {
  for (const [x,z] of WEST_BACKDROP_BANKS) {
    const b = { minX:x-8.15/2,maxX:x+8.15/2,minZ:z-7,maxZ:z+7 };
    assert.equal(cameraObstructionFraction(-182,0,-118,0,[b],[0],.62),1);
    assert.equal(cameraObstructionFraction(-153,-12,-153,22,[b],[0],.62),1);
  }
});
