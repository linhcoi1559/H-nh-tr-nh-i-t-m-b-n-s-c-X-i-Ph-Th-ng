import test from 'node:test';import assert from 'node:assert/strict';
import {EAST_PLACES,EAST_PUBLIC_AREAS,DISTRICT_ROADS,routeLength,constrainDistrictPosition,inEastPublicArea,districtGroundHeight,sampleRoad} from '../district-routes.mjs';
import {districtPath} from '../district-navigation.mjs';
import {playtestWorld,rollOutRoute} from '../world-playtest.mjs';
import {normalizeEastExploration,recordEastPhoto,claimEastExploration} from '../east-exploration-state.mjs';
import {encodeSnapshot,parseSnapshot} from '../gameplay-state.mjs';
import * as THREE from 'three';import {buildEastWorld} from '../east-world.mjs';import {compileStaticGroups} from '../render-budget.mjs';

test('east loop connects both ends to Phu Xa and provides over 400 m of new road',()=>{
 const loop=DISTRICT_ROADS.find(r=>r.id==='riverside-loop');assert.ok(routeLength(loop)>400);
 for(const endpoint of [loop.points[0],loop.points.at(-1)])assert.ok(DISTRICT_ROADS.find(r=>r.id==='phu-xa').points.some(p=>p[0]===endpoint[0]&&p[1]===endpoint[1]));
 for(const place of EAST_PLACES){const p={x:place.x,z:place.z};constrainDistrictPosition(p);assert.deepEqual(p,{x:place.x,z:place.z});const saved=parseSnapshot(encodeSnapshot({playerPosition:p}));assert.equal(saved.playerPosition.x,p.x);assert.equal(saved.playerPosition.z,p.z);assert.ok(districtGroundHeight(p.x,p.z)>0);}
 for(const a of EAST_PUBLIC_AREAS)for(const x of [a.minX,a.maxX])for(const z of [a.minZ,a.maxZ])assert.ok(inEastPublicArea(x,z));
 const edge={x:302,z:-64.8};constrainDistrictPosition(edge);assert.deepEqual(edge,{x:302,z:-65},'leaving the market edge must not teleport back to the legacy core');
});
test('new roads and three public destinations stay reachable with actual generated furniture colliders',()=>{
 const boxes=playtestWorld(),start={x:205,z:-205};
 for(const target of EAST_PLACES){const result=rollOutRoute(start,target,boxes,{mode:'walk'});assert.equal(result.ok,true,JSON.stringify({target,result}));assert.ok(districtPath(start,target).length>1);}
 for(const p of sampleRoad(DISTRICT_ROADS.at(-1),2)){
  const result=rollOutRoute({x:p.x,z:p.z},{x:205,z:-205},boxes,{mode:'ride'});assert.equal(result.ok,true,JSON.stringify(result));
 }
 assert.equal(rollOutRoute({x:-105.2233264405505,z:-112.47766735594494},{x:340.2162257008452,z:-104.01017156818602},boxes,{mode:'ride'}).ok,true,'pavement at eastern bend must remain clear');
});
test('exploration photo stamps persist across days, reject duplicates and pay only once after all three',()=>{
 let state=normalizeEastExploration({visited:['fake'],claimed:true});assert.equal(state.claimed,false);
 for(const p of EAST_PLACES){assert.equal(claimEastExploration(state).reward,null);state=recordEastPhoto(state,p.id);assert.equal(recordEastPhoto(state,p.id).visited.length,state.visited.length);state=parseSnapshot(encodeSnapshot({day:3,daylife:{day:2,east:state}})).daylife.east;}
 const result=claimEastExploration(state);assert.deepEqual(result.reward,{coins:18000,xp:100,points:1});assert.equal(claimEastExploration(result.state).reward,null);
});
test('east scenery keeps water above the base ground and batches finite geometry without extra lights',()=>{
 const world=new THREE.Group(),material=new THREE.MeshStandardMaterial();const result=buildEastWorld({world,materials:{concrete:()=>material,wood:material},box:()=>{}});
 assert.ok(result.root.getObjectByName('EastRiverWater').position.y>-.05);
 let lights=0;result.root.traverse(n=>{if(n.isLight)lights++;if(n.isMesh)for(const v of n.geometry.attributes.position.array)assert.ok(Number.isFinite(v));});assert.equal(lights,0);
 const compiled=compileStaticGroups(world);assert.ok(compiled.savedDrawObjects>100);
});
