import * as THREE from 'three';
import {DISTRICT_ROADS,sampleRoad,inEastPublicArea,districtGroundHeight} from './district-routes.mjs';
import {footprintBounds,segmentHitsBounds} from './district-layout.mjs';
import {createStreetTree,createParkBench} from './neighborhood-models.mjs';
import {detailVisibility} from './render-budget.mjs';

export function buildDistrictStreetscape(api){
 const root=new THREE.Group();root.name='DistrictStreetLife';api.world.add(root);
 const wood=api.materials.wood||new THREE.MeshStandardMaterial({color:0x7b6d53,roughness:1});
 const green=new THREE.MeshStandardMaterial({color:0x4f6656,roughness:.85}),metal=new THREE.MeshStandardMaterial({color:0x59635c,roughness:.75,metalness:.3});
 const details=[];let trees=0,benches=0,bins=0;
 const free=b=>{
  for(const r of DISTRICT_ROADS)for(let i=1;i<r.points.length;i++)if(segmentHitsBounds({x:r.points[i-1][0],z:r.points[i-1][1]},{x:r.points[i][0],z:r.points[i][1]},b,r.width/2+.7))return false;
  return !(api.buildings||[]).some(a=>b.minX<a.maxX+.15&&b.maxX>a.minX-.15&&b.minZ<a.maxZ+.15&&b.maxZ>a.minZ-.15);
 };
 DISTRICT_ROADS.forEach((road,r)=>sampleRoad(road,road.id==='market-link'?18:36).forEach((p,i)=>{
  if(p.z>-96&&p.z<65&&p.x>-190&&p.x<185)return;const side=(i+r)%2?1:-1,nx=-p.dz*side,nz=p.dx*side,angle=Math.atan2(-p.dz,p.dx);
  const x=p.x+nx*(road.width/2+2),z=p.z+nz*(road.width/2+2);
  if(inEastPublicArea(x,z,8)||!free(footprintBounds(x,z,.7,.7)))return;
  const tree=createStreetTree(6.1+(i%3)*.4,2.3,wood);tree.position.set(x,districtGroundHeight(x,z),z);root.add(tree);api.box(x,z,.65,.65);trees++;
  if(i%3!==0)return;
  const group=new THREE.Group();group.userData.staticBatch=true;group.position.set(x,0,z);root.add(group);details.push({group,x,z});
  const bx=x+p.dx*5,bz=z+p.dz*5,bounds=footprintBounds(bx,bz,2.8,.9,angle);
  if(free(bounds)&&!inEastPublicArea(bx,bz,3)){
   const bench=createParkBench(2.7,wood);bench.position.set(bx-x,districtGroundHeight(bx,bz),bz-z);bench.rotation.y=angle+(side===1?Math.PI:0);group.add(bench);api.box(bx,bz,bounds.width,bounds.depth);benches++;
  }
  const tx=x-p.dx*3,tz=z-p.dz*3;
  if(free(footprintBounds(tx,tz,.55,.55))){
   const bin=new THREE.Mesh(new THREE.CylinderGeometry(.27,.23,.78,10),green);bin.position.set(tx-x,.45,tz-z);group.add(bin);
   const lid=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.08,10),metal);lid.position.set(tx-x,.88,tz-z);group.add(lid);api.box(tx,tz,.6,.6);bins++;
  }
 }));
 let lastX=Infinity,lastZ=Infinity;
 return {root,counts:{trees,benches,bins},update(x,z){if(Math.hypot(x-lastX,z-lastZ)<5)return;lastX=x;lastZ=z;for(const d of details)d.group.visible=detailVisibility(d.group.visible,Math.hypot(x-d.x,z-d.z),120,155);}};
}
