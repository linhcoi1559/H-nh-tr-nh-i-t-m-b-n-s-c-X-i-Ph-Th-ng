import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {buildPhuXaCourt} from '../phu-xa-court.mjs';
import {playtestWorld,rollOutRoute} from '../world-playtest.mjs';
import {constrainDistrictPosition} from '../district-routes.mjs';
test('Phu Xa terminus has a furnished walkable courtyard with physical background houses',()=>{
 const world=new THREE.Group(),m=new THREE.MeshStandardMaterial(),boxes=[];
 const court=buildPhuXaCourt({world,materials:{concrete:()=>m,wood:m},box:(...b)=>boxes.push(b)});
 assert.ok(court.houses>=14);assert.equal(boxes.length,court.houses+18);
 let lights=0;world.traverse(o=>{if(o.isLight)lights++;});assert.equal(lights,0);
 const p={x:-166,z:-108};constrainDistrictPosition(p);assert.deepEqual(p,{x:-166,z:-108});
 const obstacles=playtestWorld();for(const mode of ['walk','ride']){
  const result=rollOutRoute({x:-120,z:-111},p,obstacles,{mode});assert.ok(result.ok,JSON.stringify(result));
 }
});
