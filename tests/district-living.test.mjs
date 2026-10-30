import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {buildDistrictExtension} from '../district-world.mjs';import {buildDistrictLiving} from '../district-living.mjs';
import {canPlaceDistrictBuilding,curbClearOfBend,segmentHitsBounds} from '../district-layout.mjs';
import {DISTRICT_ROADS,sampleRoad} from '../district-routes.mjs';
test('short curb blocks stop before bends instead of crossing the joined carriageway',()=>{
 const road=DISTRICT_ROADS.find(r=>r.id==='south-neighborhood');
 for(const [x,z]of road.points)assert.equal(curbClearOfBend(road,{x,z}),false);
 assert.equal(curbClearOfBend(road,{x:42,z:89}),false);
 assert.equal(curbClearOfBend(road,{x:42,z:74}),true);
});
test('infill closes the outward south view and household props remain batched and clear of traffic',()=>{
 const world=new THREE.Group(),m=new THREE.MeshStandardMaterial(),boxes=[];
 const api={world,materials:{concrete:()=>m,plaster:()=>m,brick:()=>m,wood:m},asphalt:m,label:()=>new THREE.Group(),box:(x,z,w,d)=>boxes.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2})};
 const e=buildDistrictExtension(api),living=buildDistrictLiving({...api,frontages:e.frontages,buildings:boxes});
 assert.ok(living.counts.houses>70);for(const key of ['shopCorners','bicycles','laundry','utilityBoxes','planters'])assert.ok(living.counts[key]>10,key);
 for(const b of living.buildings)assert.ok(canPlaceDistrictBuilding(b));
 for(const a of [0,.4,.8,1.2,Math.PI/2])assert.ok(boxes.some(b=>segmentHitsBounds({x:42,z:95},{x:42+Math.sin(a)*120,z:95+Math.cos(a)*120},b)),'outward view needs a background structure');
 for(const road of DISTRICT_ROADS)for(const p of sampleRoad(road,2))assert.equal(boxes.some(b=>p.x>b.minX-.7&&p.x<b.maxX+.7&&p.z>b.minZ-.7&&p.z<b.maxZ+.7),false,'new details block '+road.id);
 let lights=0;living.root.traverse(o=>{if(o.isLight)lights++;if(o.isInstancedMesh){assert.ok(o.boundingSphere.radius>0);for(let i=0;i<o.count;i++){const matrix=new THREE.Matrix4();o.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite));}}});assert.equal(lights,0);
 living.update(5000,5000);assert.ok(living.root.children.filter(o=>o.name.startsWith('HouseholdDetails')).every(o=>!o.visible));assert.ok(living.root.children.filter(o=>o.name.startsWith('NeighborhoodInfill')).every(o=>o.visible));
});
