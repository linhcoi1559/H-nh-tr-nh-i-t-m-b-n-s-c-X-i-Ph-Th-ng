import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {DISTRICT_ROADS,nearestRoad,constrainDistrictPosition,routeLength,sampleRoad,districtGroundHeight,districtRoadHeight,inEastPublicArea} from '../district-routes.mjs';
import {buildDistrictExtension} from '../district-world.mjs';
import {parseSnapshot,encodeSnapshot} from '../gameplay-state.mjs';
test('physical extension ground matches layered asphalt and pavement, including junctions',()=>{
 assert.equal(districtGroundHeight(42,-80),districtRoadHeight(0));assert.equal(districtGroundHeight(-80,-115),districtRoadHeight(1));assert.equal(districtGroundHeight(170,-220),districtRoadHeight(2));assert.equal(districtGroundHeight(42,-125),districtRoadHeight(1));assert.equal(districtGroundHeight(48,-80),.06);assert.equal(districtGroundHeight(500,-500),0);
});
test('extension provides connected Phu Gia, Phu Xa and dyke roads without a gap at the old boundary',()=>{
  const [gia,xa,dyke]=DISTRICT_ROADS;assert.deepEqual(gia.points[0],[42,-55]);
  assert.ok(xa.points.some(([x,z])=>x===42&&z===-125));assert.ok(dyke.points.some(([x,z])=>x===20&&z===-230));
  assert.ok(DISTRICT_ROADS.reduce((s,r)=>s+routeLength(r),0)>1000);
  for(let z=-50;z>=-90;z-=.2){const p={x:42,z};constrainDistrictPosition(p);assert.ok(Math.abs(p.z-z)<.001);}
});
test('both foot and bike centreline routes remain inside the playable extension and survive saves',()=>{
  for(const road of DISTRICT_ROADS)for(const point of sampleRoad(road,2)){
    const p={x:point.x,z:point.z};constrainDistrictPosition(p);assert.ok(Math.hypot(p.x-point.x,p.z-point.z)<.01);
    const save=parseSnapshot(encodeSnapshot({playerPosition:p}));assert.ok(Math.abs(save.playerPosition.z-p.z)<.01);assert.ok(Math.abs(save.playerPosition.x-p.x)<.01);
  }
  const far={x:900,z:-900};constrainDistrictPosition(far);const n=nearestRoad(far.x,far.z);assert.ok(n.distance<=n.width/2+3.21||inEastPublicArea(far.x,far.z));
  const offRoad={x:-140,z:-55.1};constrainDistrictPosition(offRoad);assert.equal(offRoad.z,-55);assert.equal(offRoad.x,-140);
});
test('instanced frontages leave road centrelines clear and distant chunks are culled without new shadow lights',()=>{
  const world=new THREE.Group(),mat=new THREE.MeshStandardMaterial(),boxes=[];
  const extension=buildDistrictExtension({world,materials:{concrete:()=>mat,plaster:()=>mat,brick:()=>mat},asphalt:mat,label:()=>new THREE.Object3D(),box:(x,z,w,d)=>boxes.push({x,z,w,d})});
  for(const road of DISTRICT_ROADS)for(const p of sampleRoad(road,1))for(const box of boxes){
    const dx=Math.max(0,Math.abs(p.x-box.x)-box.w/2),dz=Math.max(0,Math.abs(p.z-box.z)-box.d/2);assert.ok(Math.hypot(dx,dz)>.62,`bike blocked on ${road.name} at ${p.x},${p.z}`);
  }
  assert.ok(extension.drawBatches<200);let lights=0;world.traverse(o=>{if(o.isLight)lights++;});assert.equal(lights,0);
  extension.update(0,0);const groups=extension.root.children.filter(o=>o.name.startsWith('district-'));assert.ok(groups.some(o=>!o.visible));
  extension.update(20,-230);assert.ok(groups.some(o=>o.visible));
  extension.update(900,900);
  const structures=groups.filter(o=>!o.name.startsWith('district-details-'));
  assert.ok(structures.length>0&&structures.every(o=>o.visible),'building silhouettes must not disappear with detail culling');
  assert.ok(groups.filter(o=>o.name.startsWith('district-details-')).every(o=>!o.visible));
});
