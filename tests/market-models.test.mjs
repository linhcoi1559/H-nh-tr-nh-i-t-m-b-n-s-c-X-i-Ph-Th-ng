import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPottedMarketTree,createMarketBouquet,createMarketCanopy} from '../market-models.mjs';
const material=new THREE.MeshStandardMaterial();
function inspect(object,maxMeshes){
 let count=0;object.updateMatrixWorld(true);
 object.traverse(child=>{if(!child.isMesh)return;count++;assert.notEqual(child.geometry.type,'BoxGeometry');
  for(const value of child.geometry.attributes.position.array)assert.ok(Number.isFinite(value));
  if(child.isInstancedMesh){assert.ok(child.count>0);for(const value of child.instanceMatrix.array)assert.ok(Number.isFinite(value));}
 });
 assert.ok(count<=maxMeshes,`too many draw calls: ${count}`);
 const bounds=new THREE.Box3().setFromObject(object);assert.ok(!bounds.isEmpty());return bounds;
}
test('potted trees have hollow curved pots and small instanced foliage within a compact street footprint',()=>{
 for(const fruit of [false,true]){const bounds=inspect(createPottedMarketTree(fruit),6);assert.ok(bounds.max.y<2.4);assert.ok(bounds.max.x-bounds.min.x<1.8);assert.ok(bounds.min.y>=-.01);}
});
test('bouquets have finite stems and petals without per-petal draw calls',()=>{
 for(const tall of [false,true])for(const paper of [null,material]){const bounds=inspect(createMarketBouquet({mainMat:material,centerMat:material},material,tall,paper),6);assert.ok(bounds.max.y<1);}
});
test('cloth canopy has curved surface and usable normals rather than a solid roof block',()=>{
 const canopy=createMarketCanopy(6,3,material);inspect(canopy,1);const bounds=new THREE.Box3().setFromObject(canopy);assert.ok(bounds.max.y-bounds.min.y>.3);assert.ok(canopy.geometry.attributes.normal.count>100);
});
