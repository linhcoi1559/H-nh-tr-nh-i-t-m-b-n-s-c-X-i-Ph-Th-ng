import test from 'node:test';
import assert from 'node:assert/strict';
import {minimapHeadingAngle} from '../minimap-heading.mjs';
test('minimap arrow follows the bike world direction in all quadrants',()=>{
 for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2,.38,-2.4,8.1]){
  const angle=minimapHeadingAngle(yaw);
  assert.ok(Math.abs(Math.sin(angle)-Math.sin(yaw))<1e-9);
  assert.ok(Math.abs(-Math.cos(angle)-Math.cos(yaw))<1e-9);
 }
});
