import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createStreetTree,createStool,createTeaTable,createParkBench,carCoachwork,scooterPanel,buildingEnvelope,replaceBuildingEnvelopes,refitHumanProportions,roofGeometry,foliageGeometry,flowerGeometry,archedWindowGeometry,shopCanopyGeometry} from '../neighborhood-models.mjs';
const material=new THREE.MeshStandardMaterial();
test('arched frames have an open centre and curved canopy changes height across its depth',()=>{
 const frame=new THREE.Mesh(archedWindowGeometry(true),material);frame.updateMatrixWorld(true);
 assert.equal(new THREE.Raycaster(new THREE.Vector3(0,0,2),new THREE.Vector3(0,0,-1)).intersectObject(frame).length,0);
 assert.ok(new THREE.Raycaster(new THREE.Vector3(.47,0,2),new THREE.Vector3(0,0,-1)).intersectObject(frame).length);
 const g=shopCanopyGeometry();finite(new THREE.Mesh(g,material));const y=new Set([...g.attributes.position.array].filter((v,i)=>i%3===1).map(v=>v.toFixed(3)));assert.ok(y.size>6);
 const hip=roofGeometry(8,7,1.3),gable=roofGeometry(8,7,1.3,'gable');assert.notDeepEqual([...hip.attributes.position.array],[...gable.attributes.position.array]);
});
test('balcony foliage and pond flowers use compact finite leaf and petal geometry',()=>{
 for(const geometry of [foliageGeometry(.38),flowerGeometry(.18)]){geometry.computeBoundingSphere();assert.ok(geometry.boundingSphere.radius<1);for(const v of geometry.attributes.position.array)assert.ok(Number.isFinite(v));assert.ok(geometry.attributes.position.count<500);}
});
function finite(object){object.updateMatrixWorld(true);object.traverse(node=>{if(!node.isMesh)return;for(const v of node.geometry.attributes.position.array)assert.ok(Number.isFinite(v));if(node.isInstancedMesh)for(const v of node.instanceMatrix.array)assert.ok(Number.isFinite(v));});const box=new THREE.Box3().setFromObject(object);assert.ok(!box.isEmpty());return box;}
test('street trees retain their trunk and crown while leaf detail falls with distance without boundary flicker',()=>{
 const tree=createStreetTree(9,4,material);finite(tree);const lod=tree.children.find(n=>n.isLOD);assert.ok(lod);assert.equal(lod.levels.length,3);
 const camera=new THREE.PerspectiveCamera(),counts=[];
 for(const distance of [0,60,120]){camera.position.set(0,0,distance);camera.updateMatrixWorld();lod.update(camera);const visible=lod.levels.filter(l=>l.object.visible);assert.equal(visible.length,1);counts.push(visible[0].object.children.reduce((n,m)=>n+m.count,0));assert.ok(tree.children[0].visible);}
 assert.deepEqual(counts,[900,300,114]);
 camera.position.z=88;camera.updateMatrixWorld();lod.update(camera);assert.equal(lod.getCurrentLevel(),2);
 camera.position.z=74;camera.updateMatrixWorld();lod.update(camera);assert.equal(lod.getCurrentLevel(),1);
 assert.equal(tree.children.filter(n=>n.isMesh).length,2);
 tree.traverse(n=>{if(n.isMesh)assert.ok(!['IcosahedronGeometry','DodecahedronGeometry'].includes(n.geometry.type));});
});
test('furniture has finite geometry and open space under its seats and table',()=>{
 const stool=createStool(.4,.4,.4,material),table=createTeaTable(1,.6,.7,material);finite(stool);finite(table);finite(createParkBench(2.8,material));
 for(const object of [stool,table]){const ray=new THREE.Raycaster(new THREE.Vector3(0,-.1,2),new THREE.Vector3(0,0,-1));assert.equal(ray.intersectObject(object,true).length,0);}
});
test('car and scooter profiles stay compact and retain finite surface normals',()=>{
 for(const g of [carCoachwork(4.2,.7,1.8),carCoachwork(2.2,.6,1.5,true),...['rear','shield','seat'].map(scooterPanel),roofGeometry(8,10,1)]){const bounds=finite(new THREE.Mesh(g,material));for(const v of g.attributes.normal.array)assert.ok(Number.isFinite(v));assert.ok(bounds.max.z-bounds.min.z<11);}
});
test('building envelopes remain inside collider footprints, preserve six face slots and normalized facade UVs',()=>{
 const g=buildingEnvelope(8,12,10),m=new THREE.Mesh(g,Array(6).fill(material)),box=finite(m);assert.deepEqual(box.min.toArray(),[-4,-6,-5]);assert.deepEqual(box.max.toArray(),[4,6,5]);assert.deepEqual([...new Set(g.groups.map(g=>g.materialIndex))].sort(),[0,1,2,3,4,5]);assert.equal(g.groups.length,6,'facades must not create one draw per recessed quad');
 for(const z of [-20,20])assert.ok(new THREE.Raycaster(new THREE.Vector3(0,0,z),new THREE.Vector3(0,0,-Math.sign(z))).intersectObject(m).length);
 for(const group of g.groups.filter(g=>g.materialIndex>=4))for(let i=group.start;i<group.start+group.count;i++){const uv=g.attributes.uv;assert.ok(uv.getX(i)>=0&&uv.getX(i)<=1);assert.ok(uv.getY(i)>=0&&uv.getY(i)<=1);}
});
test('world retrofit replaces building batches without moving objects or altering detail and floor meshes',()=>{
 const root=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(8,10,12),material),floor=new THREE.Mesh(new THREE.BoxGeometry(8,.1,12),material),windows=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,.1),material,2),blocks=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material,2);
 for(let i=0;i<2;i++)blocks.setMatrixAt(i,new THREE.Matrix4().compose(new THREE.Vector3(i*20,5,0),new THREE.Quaternion(),new THREE.Vector3(8,10,12)));
 root.add(body,floor,windows,blocks);const result=replaceBuildingEnvelopes(root);assert.equal(result.buildings,3);assert.equal(body.geometry.userData.modelFamily,'architecture');assert.equal(floor.geometry.type,'BoxGeometry');assert.equal(windows.geometry.type,'BoxGeometry');assert.equal(replaceBuildingEnvelopes(root).buildings,0);
});
test('human refit normalizes a model to an adult height without changing its root X/Z',()=>{
 const group=new THREE.Group();group.add(new THREE.Mesh(new THREE.CapsuleGeometry(.1,.6,2,8),material));refitHumanProportions(group,1.68);const b=finite(group);assert.ok(Math.abs(b.max.y-b.min.y-1.68)<.001);assert.ok(Math.abs(b.min.y)<.001);assert.equal(group.position.x,0);assert.equal(group.position.z,0);
});
