import test from 'node:test';
import assert from 'node:assert/strict';
import { CollisionGrid, cameraObstructionFraction } from '../collision-grid.mjs';

test('broad phase never drops overlapping obstacles across negative coordinates and cell seams', () => {
  const grid = new CollisionGrid(8);
  const obstacles = Array.from({ length: 800 }, (_, i) => {
    const x = (i * 37 % 401) - 200, z = (i * 23 % 131) - 65;
    return { minX: x - (i % 19 + 1), maxX: x + 2, minZ: z - 2, maxZ: z + i % 13 + 1 };
  });
  obstacles.forEach((b, i) => grid.insert(b, i));
  const result = [];
  let candidates = 0;
  for (let x = -190; x < 170; x += 3.7) for (let z = -55; z < 55; z += 6.1) {
    const r = 1.1;
    grid.query(x, z, r, result);
    candidates += result.length;
    const expected = obstacles.flatMap((b, i) => x+r >= b.minX && x-r <= b.maxX && z+r >= b.minZ && z-r <= b.maxZ ? [i] : []);
    for (const i of expected) assert.ok(result.includes(i), `missed obstacle ${i} at ${x},${z}`);
    assert.equal(new Set(result).size, result.length);
    assert.deepEqual(result, [...result].sort((a,b) => a-b));
  }
  assert.ok(candidates < obstacles.length * 98 * 19 * .1, 'queries should discard most distant obstacles');
});

test('new obstacles and reused output buffers do not retain stale candidates', () => {
  const grid = new CollisionGrid(); const out = [];
  grid.insert({ minX:-9, maxX:9, minZ:-9, maxZ:9 }, 0);
  assert.deepEqual(grid.query(0,0,.46,out), [0]);
  assert.deepEqual(grid.query(200,200,.46,out), []);
  grid.insert({ minX:199, maxX:201, minZ:199, maxZ:201 }, 1);
  assert.deepEqual(grid.query(200,200,.46,out), [1]);
});

test('camera retracts before very close walls instead of enforcing a minimum arm through them', () => {
  const walls = [{minX: .46, maxX: .96, minZ:-10, maxZ:10}];
  const fraction = cameraObstructionFraction(0,0,10,0,walls,[0]);
  assert.ok(Math.abs(fraction - .018) < 1e-9);
  assert.ok(10 * fraction < .46 - .25, 'near clipping plane stays in front of wall');
  assert.equal(cameraObstructionFraction(0,0,-10,0,walls,[0]), 1);
  assert.equal(cameraObstructionFraction(.5,0,10,0,walls,[0]), 0);
});

test('camera ray handles diagonal corners, parallel walls and end points outside a wall segment', () => {
  const walls = [{minX:2,maxX:3,minZ:2,maxZ:4}];
  assert.equal(cameraObstructionFraction(0,0,5,5,walls,[0],0), .4);
  assert.equal(cameraObstructionFraction(0,0,0,5,walls,[0],0), 1);
  assert.equal(cameraObstructionFraction(0,0,1,1,walls,[0],0), 1);
  assert.equal(cameraObstructionFraction(0,0,5,0,walls,[0],0), 1);
});
