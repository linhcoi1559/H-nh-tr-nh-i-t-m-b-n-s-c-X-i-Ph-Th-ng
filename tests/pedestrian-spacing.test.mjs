import test from 'node:test';import assert from 'node:assert/strict';
import {separatePedestrians} from '../pedestrian-spacing.mjs';
const actor=(x=0,fixed=false)=>({fixed,group:{visible:true,position:{x,y:0,z:0}}});
test('overlapping pedestrians separate while quest anchors stay put and duplicate references are ignored',()=>{
 const a=actor(0,true),b=actor();separatePedestrians([a,b,a],()=>true);
 assert.equal(a.group.position.x,0);assert.ok(Math.hypot(b.group.position.x,b.group.position.z)>=.92);
});
test('separation never pushes a pedestrian into rejected space',()=>{const a=actor(0,true),b=actor();separatePedestrians([a,b],()=>false);assert.equal(b.group.position.x,0);});
