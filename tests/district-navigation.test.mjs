import test from 'node:test';import assert from 'node:assert/strict';
import {districtPath,nextDistrictWaypoint} from '../district-navigation.mjs';
import {nearestRoad} from '../district-routes.mjs';
test('guide enters the extension through the physical Phu Gia junction instead of cutting across blocks',()=>{
 const path=districtPath({x:-40,z:2},{x:20,z:-230});
 assert.deepEqual(path.slice(0,3),[{x:-40,z:0},{x:42,z:0},{x:42,z:-55}]);assert.ok(path.some(p=>p.x===42&&p.z===-125));assert.deepEqual(path.at(-1),{x:20,z:-230});
});
test('every new-district route follows centreline segments through junctions and returns through the same entrance',()=>{
 for(const [a,b]of [[{x:-145,z:-108.5},{x:170,z:-220}],[{x:20,z:-230},{x:42,z:-100}],[{x:205,z:-205},{x:-190,z:-178}]]){
  const path=districtPath(a,b);assert.ok(path.length>1);
  for(let i=1;i<path.length;i++)for(let j=0;j<=20;j++){const x=path[i-1].x+(path[i].x-path[i-1].x)*j/20,z=path[i-1].z+(path[i].z-path[i-1].z)*j/20;assert.ok(nearestRoad(x,z).distance<.1,`crossed block at ${x},${z}`);}
 }
 const back=districtPath({x:20,z:-230},{x:-44,z:0});assert.ok(back.some(p=>p.x===42&&p.z===-55));assert.deepEqual(back.at(-1),{x:-44,z:0});
});
test('legacy-core guidance stays unchanged and close waypoints are skipped',()=>{
 const target={x:-40,z:13};assert.deepEqual(districtPath({x:0,z:1},target),[target]);assert.deepEqual(nextDistrictWaypoint({x:42,z:-125},[{x:42,z:-125},{x:35,z:-180}]),{x:35,z:-180});
});
test('guidance continues north on the existing Phu Gia approach without sending the player back to the old junction',()=>{
 assert.deepEqual(districtPath({x:42,z:-40},{x:42,z:-125})[0],{x:42,z:-55});
 const back=districtPath({x:42,z:-125},{x:42,z:-40});
 assert.ok(!back.some(p=>p.z===0));assert.deepEqual(back.at(-1),{x:42,z:-40});
});
