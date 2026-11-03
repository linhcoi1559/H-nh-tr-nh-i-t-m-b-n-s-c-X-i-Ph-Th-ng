import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {footprintBounds,segmentHitsBounds,canPlaceDistrictBuilding} from '../district-layout.mjs';
import {buildDistrictExtension} from '../district-world.mjs';
import {buildDistrictStreetscape} from '../district-streetscape.mjs';

test('rotated footprints contain all four corners and segment checks include end caps',()=>{
 for(const rotation of [0,.3,Math.PI/2,-2.4]){
  const b=footprintBounds(10,-12,9,7,rotation);
  for(const x of [-4.5,4.5])for(const z of [-3.5,3.5]){
   const px=10+x*Math.cos(rotation)+z*Math.sin(rotation),pz=-12-x*Math.sin(rotation)+z*Math.cos(rotation);
   assert.ok(px>=b.minX-1e-9&&px<=b.maxX+1e-9&&pz>=b.minZ-1e-9&&pz<=b.maxZ+1e-9);
  }
 }
 const b=footprintBounds(0,0,2,2);
 assert.ok(segmentHitsBounds({x:-4,z:0},{x:4,z:0},b));
 assert.ok(segmentHitsBounds({x:0,z:-4},{x:0,z:-2},b,1));
 assert.equal(segmentHitsBounds({x:3,z:-4},{x:3,z:4},b),false);
 assert.equal(canPlaceDistrictBuilding(footprintBounds(42,-80,10,12)),false);
 assert.equal(canPlaceDistrictBuilding(footprintBounds(368,-160,10,12)),false);
});

test('shop doors have one glass surface and frames sit ahead of glass on both street sides',()=>{
 const world=new THREE.Group(),pavement=new THREE.MeshStandardMaterial({side:THREE.DoubleSide}),wall=new THREE.MeshStandardMaterial();
 const e=buildDistrictExtension({world,materials:{concrete:()=>pavement,plaster:()=>wall,brick:()=>wall},asphalt:wall,label:()=>new THREE.Group(),box:()=>{}});
 world.updateMatrixWorld(true);
 const glass=[],frames=[];e.root.traverse(o=>{if(!o.isMesh)return;if(o.material===pavement)frames.push(o);else if(o.material.color?.getHex()===0x293b3e)glass.push(o);});
 assert.ok(glass.length>0);
 for(const direction of [-1,1]){
  const ray=new THREE.Raycaster(new THREE.Vector3(42,1.4,-104),new THREE.Vector3(direction,0,0),0,20);
  const panes=ray.intersectObjects(glass,false);
  assert.equal(panes.length,1,'centre ground bay must not contain a window overlapping the door');
  ray.set(new THREE.Vector3(42,1,-102.7),new THREE.Vector3(direction,0,0));
  const pane=ray.intersectObjects(glass,false)[0],frame=ray.intersectObjects(frames,false)[0];
  assert.ok(pane&&frame,'sample must cross the door glass and its frame');
  assert.ok(pane.distance-frame.distance>.04,'frame face must be physically separated from glass');
 }
});

test('every rendered district house has a matching collider and reserves the pavement corridor',()=>{
 const world=new THREE.Group(),mat=new THREE.MeshStandardMaterial(),boxes=[];
 const api={world,materials:{concrete:()=>mat,plaster:()=>mat,brick:()=>mat,wood:mat},asphalt:mat,label:()=>new THREE.Object3D(),box:(x,z,w,d)=>boxes.push(footprintBounds(x,z,w,d))};
 const e=buildDistrictExtension(api),matrix=new THREE.Matrix4();let houses=0;
 e.root.traverse(mesh=>{
  if(!mesh.isInstancedMesh||mesh.userData.modelFamily!=='building')return;
  for(let i=0;i<mesh.count;i++){
   mesh.getMatrixAt(i,matrix);const position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();matrix.decompose(position,rotation,scale);
   const angle=new THREE.Euler().setFromQuaternion(rotation).y,b=footprintBounds(position.x,position.z,scale.x,scale.z,angle);
   assert.ok(boxes.some(a=>b.minX>=a.minX-.0001&&b.maxX<=a.maxX+.0001&&b.minZ>=a.minZ-.0001&&b.maxZ<=a.maxZ+.0001),'each terrace tier must remain inside its enclosing ground-floor collider');
   houses++;
  }
 });
 assert.ok(houses>=e.buildingFootprints.length);assert.ok(houses>50);
 for(const b of e.buildingFootprints)assert.ok(canPlaceDistrictBuilding(b));
 const streetscape=buildDistrictStreetscape({...api,buildings:e.buildingFootprints});
 assert.ok(streetscape.counts.trees>=10);assert.ok(streetscape.counts.benches>0&&streetscape.counts.bins>0);
});
