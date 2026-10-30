import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {DISTRICT_ROADS,sampleRoad,inEastPublicArea} from './district-routes.mjs';
import {footprintBounds,canPlaceDistrictBuilding,neighborhoodBoundarySegments} from './district-layout.mjs';
import {buildingEnvelope,roofGeometry,archedWindowGeometry,shopCanopyGeometry,createStreetTree,windowFrameGeometry} from './neighborhood-models.mjs';
import {detailVisibility} from './render-budget.mjs';

// Repeated static pieces share geometry/material and are instanced per 64 m
// cell. Silhouettes stay visible; only small household details have a range.
export function buildDistrictLiving(api){
 const root=new THREE.Group();root.name='DistrictEverydayLife';api.world.add(root);
 const stone=api.materials.concrete(),brick=api.materials.brick(),wood=api.materials.wood;
 const metal=new THREE.MeshStandardMaterial({color:0x59645e,roughness:.75,metalness:.25}),glass=new THREE.MeshStandardMaterial({color:0x31474a,roughness:.6,side:THREE.DoubleSide});
 const roofMat=new THREE.MeshStandardMaterial({color:0x77564b,roughness:1,side:THREE.DoubleSide});
 const cloth=[0x9b8272,0x5f7e79,0x78839a,0xb1a281].map(color=>new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide}));
 const green=new THREE.MeshStandardMaterial({color:0x5d774c,roughness:1}),red=new THREE.MeshStandardMaterial({color:0x9f5d42,roughness:1});
 const walls=[0xbcb6a5,0xb2b9af,0xc1b49e].map(color=>api.materials.plaster(color));
 const g={house:buildingEnvelope(1,1,1,false,{columns:2,rows:3}),roof:roofGeometry(1,1,1),gable:roofGeometry(1,1,1,'gable'),box:new THREE.BoxGeometry(1,1,1),round:new RoundedBoxGeometry(1,1,1,2,.08),pane:archedWindowGeometry(),frame:archedWindowGeometry(true),rectFrame:windowFrameGeometry(),canopy:shopCanopyGeometry(),sphere:new THREE.SphereGeometry(.5,8,6),cylinder:new THREE.CylinderGeometry(.5,.44,1,10),wheel:new THREE.TorusGeometry(.34,.035,5,16),tube:new THREE.CylinderGeometry(1,1,1,6),cloth:new THREE.PlaneGeometry(1,1)};
 const shirt=new THREE.Shape();shirt.moveTo(-.16,.5);shirt.lineTo(-.45,.34);shirt.lineTo(-.32,.08);shirt.lineTo(-.22,.15);shirt.lineTo(-.22,-.5);shirt.lineTo(.22,-.5);shirt.lineTo(.22,.15);shirt.lineTo(.32,.08);shirt.lineTo(.45,.34);shirt.lineTo(.16,.5);shirt.quadraticCurveTo(0,.28,-.16,.5);g.shirt=new THREE.ShapeGeometry(shirt,4);
 const cells=new Map(),batches=new Map(),dummy=new THREE.Object3D(),occupied=[...(api.buildings||[])],buildings=[];
 const counts={houses:0,shopCorners:0,bicycles:0,laundry:0,utilityBoxes:0,planters:0,gardenPlants:0,boundarySections:0,gardenPlots:0};
 function add(geometry,mat,x,y,z,w,h,d,angle=0,structural=false){
  const key=Math.floor(x/64)+','+Math.floor(z/64);
  if(!cells.has(key)){const shell=new THREE.Group(),detail=new THREE.Group();shell.name='NeighborhoodInfill-'+key;detail.name='HouseholdDetails-'+key;root.add(shell,detail);cells.set(key,{shell,detail,x:Math.floor(x/64)*64+32,z:Math.floor(z/64)*64+32});}
  const cell=cells.get(key),parent=structural?cell.shell:cell.detail,batchKey=parent.uuid+geometry.uuid+mat.uuid;
  if(!batches.has(batchKey))batches.set(batchKey,{parent,geometry,mat,items:[]});
  dummy.position.set(x,y,z);dummy.rotation.set(0,angle,0);dummy.scale.set(w,h,d);dummy.updateMatrix();batches.get(batchKey).items.push(dummy.matrix.clone());
 }
 const overlaps=b=>occupied.some(a=>b.minX<a.maxX+.3&&b.maxX>a.minX-.3&&b.minZ<a.maxZ+.3&&b.maxZ>a.minZ-.3);
 function house(x,z,angle,index){
  if(x>374||z<-250||(x>-182&&x<162&&z>-65&&z<58)||inEastPublicArea(x,z,12))return;
  const w=11.8,d=9,h=6.5+index%4*1.4,b=footprintBounds(x,z,w,d,angle);
  if(!canPlaceDistrictBuilding(b)||overlaps(b))return;
  occupied.push(b);buildings.push(b);api.box(x,z,b.width,b.depth);counts.houses++;
  add(g.house,index%4===0?brick:walls[index%3],x,h/2,z,w,h,d,angle,true);
  add(index%3===0?g.box:index%3===1?g.roof:g.gable,index%3===0?stone:roofMat,x,h+(index%3===0?.1:.55),z,w+.5,index%3===0?.2:1.2,d+.5,angle,true);
  const nx=Math.sin(angle),nz=Math.cos(angle),tx=Math.cos(angle),tz=-Math.sin(angle),front=d/2+.08;
  for(let floor=0;floor<Math.floor(h/3);floor++)for(const offset of [-3.4,0,3.4]){
   const px=x+nx*front+tx*offset,pz=z+nz*front+tz*offset;
   if(floor===0&&offset===0){
    add(g.cloth,index%2?glass:metal,px,1.25,pz,2.6,2.5,1,angle);
    if(index%2===0)for(let rib=0;rib<12;rib++)add(g.box,metal,px+nx*.025,.12+rib*.21,pz+nz*.025,2.6,.025,.025,angle);
    continue;
   }
   const rect=index%2===0;
   add(rect?g.cloth:g.pane,glass,px,1.5+floor*3,pz,1.35,1.7,1,angle);
   add(rect?g.rectFrame:g.frame,stone,px+nx*.06,1.5+floor*3,pz+nz*.06,1.52,1.87,rect?.1:1,angle);
  }
  add(g.canopy,cloth[index%4],x+nx*(front+.6),2.65,z+nz*(front+.6),5,1,1.5,angle);
 }
 // A second row prevents the empty base plane showing between frontage houses.
 let index=0;
 for(let x=-62;x<=96;x+=12.2)house(x,132,Math.PI,index++);
 for(const road of DISTRICT_ROADS)for(const p of sampleRoad(road,14))for(const side of [-1,1]){
  const nx=-p.dz*side,nz=p.dx*side,angle=Math.atan2(-nx,-nz);
  house(p.x+nx*(road.width/2+35),p.z+nz*(road.width/2+35),angle,index++);
 }
 // Close the outward view at bends as well as along straight streets.
 for(const road of DISTRICT_ROADS)for(const [x,z]of road.points)for(let i=0;i<12;i++){
  const a=i*Math.PI/6,px=x+Math.sin(a)*39,pz=z+Math.cos(a)*39;
  house(px,pz,a+Math.PI,index++);
 }
 // A continuous rear garden boundary joins the southern housing groups; small
 // spaces between separate houses must not reopen the infinite base plane.
 for(const [x,z,w,d]of [[16,145,184,.45],[-76,105,.45,80],[108,105,.45,80]]){
  const b=footprintBounds(x,z,w,d);if(!canPlaceDistrictBuilding(b))continue;
  api.box(x,z,w,d);buildings.push(b);
  add(g.box,brick,x,1.9,z,w,3.8,d,0,true);
  add(g.box,stone,x,3.85,z,w+.12,.16,d+.12,0,true);
 }
 // Private rear gardens between the pavement and the next residential row.
 // A planted surface replaces the exposed concrete; it never covers asphalt.
 add(new THREE.PlaneGeometry(184,36).rotateX(-Math.PI/2),green,16,.03,127,1,1,1,0,true);
 const soil=new THREE.MeshStandardMaterial({color:0x756b52,roughness:1});
 for(const b of neighborhoodBoundarySegments()){
  api.box(b.x,b.z,b.w,b.d);buildings.push(b);counts.boundarySections++;
  add(g.box,brick,b.x,2.6,b.z,b.w,5.2,b.d,0,true);
  add(g.box,stone,b.x,5.25,b.z,b.w+.08,.15,b.d+.08,0,true);
 }
 const groundPatch=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);
 for(const road of DISTRICT_ROADS)for(const p of sampleRoad(road,22))for(const side of [-1,1]){
  const nx=-p.dz*side,nz=p.dx*side,x=p.x+nx*(road.width/2+20),z=p.z+nz*(road.width/2+20),angle=Math.atan2(p.dx,p.dz);
  if((x>-182&&x<162&&z>-55&&z<55)||x>374||z<-250||inEastPublicArea(x,z,12))continue;
  const b=footprintBounds(x,z,9,10,angle);if(!canPlaceDistrictBuilding(b)||overlaps(b))continue;
  occupied.push(b);counts.gardenPlots++;
  add(groundPatch,green,x,.025,z,9,1,10,angle,true);
  for(const offset of [-3,0,3]){const sx=x+p.dx*offset,sz=z+p.dz*offset;add(g.sphere,green,sx,.6,sz,1.6,1.2,1.5);counts.gardenPlants++;}
 }
 for(const z of [109,119,140])for(let x=-70;x<=102;x+=3.5){
  const b=footprintBounds(x,z,1.4,1.4);if(!canPlaceDistrictBuilding(b)||overlaps(b))continue;
  add(g.sphere,green,x,.62,z,1.8,1.3,1.6);counts.gardenPlants++;
 }
 for(let x=-58;x<100;x+=20){
  const z=115,b=footprintBounds(x,z,3,3);if(!canPlaceDistrictBuilding(b)||overlaps(b))continue;
  const tree=createStreetTree(5.8,2.5,wood);tree.position.set(x,.03,z);root.add(tree);api.box(x,z,.7,.7);
  add(g.cylinder,soil,x,.1,z,2.8,.14,2.8);counts.gardenPlants++;
 }
 function solid(x,z,w,d,angle){const b=footprintBounds(x,z,w,d,angle);api.box(x,z,b.width,b.depth);}
 function tube(a,b,r,mat){const axis=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),center=new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5);
  const geometry=g.tube,key=Math.floor(center.x/64)+','+Math.floor(center.z/64);add(geometry,mat,center.x,center.y,center.z,r,axis.length(),r);const cell=cells.get(key),batch=batches.get(cell.detail.uuid+geometry.uuid+mat.uuid);dummy.position.copy(center);dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());dummy.scale.set(r,axis.length(),r);dummy.updateMatrix();batch.items[batch.items.length-1]=dummy.matrix.clone();dummy.rotation.set(0,0,0);
 }
 for(const f of api.frontages||[]){
  const nx=Math.sin(f.angle),nz=Math.cos(f.angle),tx=Math.cos(f.angle),tz=-Math.sin(f.angle),at=(u,v,y)=>[f.x+tx*u+nx*v,y,f.z+tz*u+nz*v];
  // Separate metal service cabinet and slatted air conditioner above the shop.
  add(g.round,metal,...at(3.4,.16,1.3),.42,.64,.22,f.angle);counts.utilityBoxes++;
  add(g.round,stone,...at(-3.1,.24,3.25),1,.65,.42,f.angle);
  for(let k=0;k<5;k++)add(g.box,metal,...at(-3.1,.47,3.02+k*.1),.82,.025,.025,f.angle);
  for(const u of [-3.3,3.3]){
   add(g.cylinder,red,...at(u,.6,.32),.54,.55,.54);add(g.sphere,green,...at(u,.6,.78),.72,.65,.72);solid(...[at(u,.6,0)[0],at(u,.6,0)[2]],.6,.6,0);counts.planters++;
  }
  if(f.index%3===0){
   // Small tea/produce corner leaves the doorway and street corridor open.
   add(g.round,wood,...at(-2.2,1.2,.72),1.6,.12,.85,f.angle);
   for(const u of [-2.8,-1.6])for(const v of [.9,1.5])add(g.cylinder,metal,...at(u,v,.39),.06,.65,.06);
   solid(at(-2.2,1.2,0)[0],at(-2.2,1.2,0)[2],1.8,1,f.angle);
   for(let k=0;k<3;k++){
    const u=-2.65+k*.45;
    if(f.shopKind===3){add(g.cylinder,stone,...at(u,1.2,.88),.12,.18,.12);add(g.cylinder,metal,...at(u,1.2,.97),.13,.02,.13);}
    else if(f.shopKind===2){add(g.cylinder,cloth[(k+f.index)%4],...at(u,1.2,.96),.24,.34,.24);for(const y of [.8,1.13])add(g.cylinder,wood,...at(u,1.2,y),.3,.025,.3);}
    else if(f.shopKind===1){add(g.round,stone,...at(u,1.2,.94),.22,.3,.18);add(g.cylinder,metal,...at(u,1.2,1.12),.12,.06,.12);}
    else{add(g.cylinder,wood,...at(u,1.2,.9),.4,.2,.4);for(let j=0;j<3;j++)add(g.sphere,k%2?green:red,...at(u+(j-1)*.09,1.2,.99),.14,.14,.14);}
   }
   for(const u of [-2.8,-1.6]){add(g.cylinder,cloth[f.index%4],...at(u,2.15,.38),.4,.14,.4);for(const v of [2.04,2.26])add(g.cylinder,metal,...at(u,v,.2),.045,.36,.045);solid(at(u,2.15,0)[0],at(u,2.15,0)[2],.45,.45,0);}
   counts.shopCorners++;
  }
  if(f.index%4===1){
   const a=at(-2.8,.65,4.7),b=at(2.8,.65,4.7);tube(a,b,.012,metal);
   for(let k=0;k<4;k++){add(k%2?g.cloth:g.shirt,cloth[(k+f.index)%4],...at(-2+k*1.2,.67,4.25),.75,.9,1,f.angle);add(g.box,wood,...at(-2+k*1.2,.69,4.75),.5,.035,.035,f.angle);}
   counts.laundry++;
  }
  if(f.index%4===2){
   const transform=(u,y)=>at(u,1.25,y),l=transform(1.4,.37),r=transform(2.65,.37),mid=transform(2.05,.42),top=transform(1.8,.95),front=transform(2.45,.95);
   // Narrow tyres, triangular frame, saddle and handlebars; no opaque bike box.
   add(g.wheel,metal,...l,1,1,1,f.angle);add(g.wheel,metal,...r,1,1,1,f.angle);
   for(const [a,b]of [[l,mid],[mid,r],[l,top],[top,mid],[top,front],[front,r]])tube(a,b,.018,metal);
   add(g.round,wood,...at(1.8,1.25,1.02),.35,.07,.17,f.angle);tube(front,at(2.48,1.25,1.12),.018,metal);tube(at(2.48,1.05,1.12),at(2.48,1.45,1.12),.02,metal);
   solid(at(2,1.25,0)[0],at(2,1.25,0)[2],2,.65,f.angle);counts.bicycles++;
  }
 }
 for(const {parent,geometry,mat,items}of batches.values()){
  const mesh=new THREE.InstancedMesh(geometry,mat,items.length);items.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.computeBoundingSphere();mesh.receiveShadow=true;mesh.matrixAutoUpdate=false;parent.add(mesh);
 }
 let lastX=Infinity,lastZ=Infinity;
 return {root,counts,buildings,update(x,z){if(Math.hypot(x-lastX,z-lastZ)<5)return;lastX=x;lastZ=z;for(const c of cells.values())c.detail.visible=detailVisibility(c.detail.visible,Math.hypot(x-c.x,z-c.z),140,175);}};
}
