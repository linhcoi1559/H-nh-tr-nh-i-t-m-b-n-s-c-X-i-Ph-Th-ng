import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {compileStaticGroups,compileArchitectureChunks,detailVisibility,createShadowBudget,crossingRoadGeometry}from'../render-budget.mjs';
test('architecture chunking joins permanent frontages while retaining bounds, materials and protected parents',()=>{
 const world=new THREE.Group(),mat=new THREE.MeshStandardMaterial();
 for(let i=0;i<8;i++){const root=new THREE.Group();root.userData.permanentArchitecture=true;root.position.set(i*3,2,0);const mesh=new THREE.Mesh(new THREE.BoxGeometry(2,3,2),mat);if(i===3)mesh.geometry.deleteAttribute('uv');mesh.castShadow=true;root.add(mesh);world.add(root);}
 const room=new THREE.Group(),protectedMesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),mat);room.userData.permanentArchitecture=true;room.visible=false;room.add(protectedMesh);world.add(room);
 world.updateMatrixWorld(true);const before=new THREE.Box3().setFromObject(world);const result=compileArchitectureChunks(world);world.updateMatrixWorld(true);const after=new THREE.Box3().setFromObject(world);
 assert.equal(result.savedDrawObjects,7);assert.ok(before.min.distanceTo(after.min)<.001&&before.max.distanceTo(after.max)<.001);assert.equal(protectedMesh.parent,room);assert.equal(world.children.find(n=>n.name==='PermanentArchitectureChunk').castShadow,true);assert.equal(compileArchitectureChunks(world).savedDrawObjects,0);
});
test('high refresh shadow budget caps moving updates but refreshes immediately on teleport',()=>{
 const budget=createShadowBudget();budget.tick(0,0,0,false,true);let count=0;
 for(let i=1;i<=144;i++)if(budget.tick(1/144,i/20,0,false,true))count++;
 assert.ok(count>=9&&count<=11);assert.equal(budget.tick(0,40,0,false,true),true);
});
test('opt-in static compilation reduces objects while preserving world bounds, shadows and material identity',()=>{
 const world=new THREE.Group(),root=new THREE.Group();root.position.set(12,2,-8);root.rotation.y=.5;root.userData.staticBatch=true;world.add(root);
 const material=new THREE.MeshStandardMaterial(),meshes=[];
 for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material);m.position.set(i,0,i*.5);m.castShadow=true;root.add(m);meshes.push(m);}
 world.updateMatrixWorld(true);const before=new THREE.Box3().setFromObject(root,true);const result=compileStaticGroups(world),after=new THREE.Box3().setFromObject(root,true);
 assert.equal(result.savedDrawObjects,7);assert.equal(root.children.length,1);assert.equal(root.children[0].material,material);assert.equal(root.children[0].castShadow,true);assert.ok(before.min.distanceTo(after.min)<.0001);assert.ok(before.max.distanceTo(after.max)<.0001);assert.equal(compileStaticGroups(world).savedDrawObjects,0);
});
test('unmarked moving roots and instanced meshes remain untouched by static compilation',()=>{
 const world=new THREE.Group(),moving=new THREE.Group(),staticRoot=new THREE.Group();staticRoot.userData.staticBatch=true;world.add(moving,staticRoot);
 const material=new THREE.MeshBasicMaterial(),wheel=new THREE.Mesh(new THREE.SphereGeometry(.3),material),instances=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material,2);moving.add(wheel);staticRoot.add(instances);compileStaticGroups(world);assert.equal(wheel.parent,moving);assert.equal(instances.parent,staticRoot);assert.equal(wheel.matrixAutoUpdate,true);
});
test('detail visibility keeps a hysteresis band and shadow updates are bounded but react immediately to movement',()=>{
 assert.equal(detailVisibility(true,220),true);assert.equal(detailVisibility(false,220),false);assert.equal(detailVisibility(true,230),false);assert.equal(detailVisibility(false,180),true);
 const budget=createShadowBudget();assert.equal(budget.tick(0,0,0),true);let count=0;for(let i=0;i<120;i++)if(budget.tick(1/120,0,0))count++;assert.ok(count>=14&&count<=16);assert.equal(budget.tick(0,1,0),false);assert.equal(budget.tick(0,1,0,true),true);
});
test('cross road has no duplicate asphalt plane at the intersection and no holes beyond its edges',()=>{
 const road=new THREE.Mesh(crossingRoadGeometry(10.8,280,11.4),new THREE.MeshBasicMaterial());road.updateMatrixWorld(true);
 const hit=y=>new THREE.Raycaster(new THREE.Vector3(0,y,2),new THREE.Vector3(0,0,-1)).intersectObject(road).length;
 assert.equal(hit(0),0);assert.ok(hit(5.71));assert.ok(hit(-5.71));assert.ok(hit(130));assert.equal(hit(141),0);
 const trimmed=new THREE.Mesh(crossingRoadGeometry(10.8,280,11.4,-140,55),new THREE.MeshBasicMaterial());trimmed.rotation.x=-Math.PI/2;trimmed.updateMatrixWorld(true);
 const down=z=>new THREE.Raycaster(new THREE.Vector3(0,2,z),new THREE.Vector3(0,-1,0)).intersectObject(trimmed).length;
 assert.equal(down(-100),0,'legacy road must not overlap the extension');assert.ok(down(-50));assert.ok(down(130));
});
