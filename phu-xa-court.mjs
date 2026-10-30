import * as THREE from 'three';
import {buildingEnvelope,roofGeometry,archedWindowGeometry,createStreetTree,createParkBench,createTeaTable,createStool,shopCanopyGeometry} from './neighborhood-models.mjs';
import {worldUVs} from './visual-materials.mjs';
import {footprintBounds,canPlaceDistrictBuilding} from './district-layout.mjs';

export function buildPhuXaCourt(api){
 const root=new THREE.Group();root.name='PhuXaEndCourt';api.world.add(root);
 const details=new THREE.Group();details.userData.staticBatch=true;root.add(details);
 const stone=api.materials.concrete(),wood=api.materials.wood||stone;
 const plaster=api.materials.plaster?.(0xc3bcaa)||stone,brick=api.materials.brick?.()||stone;
 const tile=new THREE.MeshStandardMaterial({color:0x735247,roughness:1}),glass=new THREE.MeshStandardMaterial({color:0x30484b,roughness:.6,side:THREE.DoubleSide});
 const leaves=new THREE.MeshStandardMaterial({color:0x5a7146,roughness:1}),soil=new THREE.MeshStandardMaterial({color:0x665e42,roughness:1});
 const add=(g,m,x,y,z,parent=details)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.receiveShadow=true;parent.add(o);return o;};
 const boxes=[];const solid=(x,z,w,d)=>{api.box(x,z,w,d);boxes.push(footprintBounds(x,z,w,d));};
 const paving=stone.clone();paving.color.setHex(0xd2ccba);
 add(worldUVs(new THREE.PlaneGeometry(34,30).rotateX(-Math.PI/2),2),paving,-162,.098,-108);
 const joints=new THREE.MeshStandardMaterial({color:0x8b8e7e,roughness:1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
 for(let x=-179;x<=-145;x+=2)add(new THREE.PlaneGeometry(.07,30).rotateX(-Math.PI/2),joints,x,.108,-108);
 for(let z=-123;z<=-93;z+=2)add(new THREE.PlaneGeometry(34,.07).rotateX(-Math.PI/2),joints,-162,.108,z);
 // A continuous three-sided courtyard frontage, safely behind its walkable edge.
 let houses=0;
 const house=(x,z,w,d,h,angle,index)=>{
  const bounds=footprintBounds(x,z,w,d,angle);if(!canPlaceDistrictBuilding(bounds))return;
  const body=add(buildingEnvelope(w,h,d,false),index%3?plaster:brick,x,h/2,z);body.rotation.y=angle;
  const roof=add(roofGeometry(w+.4,d+.4,1.4),tile,x,h+.65,z);roof.rotation.y=angle;
  solid(x,z,bounds.width,bounds.depth);houses++;
  const nx=Math.sin(angle),nz=Math.cos(angle),tx=Math.cos(angle),tz=-Math.sin(angle);
  for(let floor=0;floor<Math.floor(h/3);floor++)for(const offset of [-w*.27,0,w*.27]){
   const px=x+nx*(d/2+.08)+tx*offset,pz=z+nz*(d/2+.08)+tz*offset;
   const pane=add(archedWindowGeometry(),glass,px,1.5+floor*3,pz);pane.rotation.y=angle;pane.scale.set(1.2,1.7,1);
   const frame=add(archedWindowGeometry(true),stone,px+nx*.06,1.5+floor*3,pz+nz*.06);frame.rotation.y=angle;frame.scale.set(1.34,1.84,1);
  }
  const canopy=add(shopCanopyGeometry(),tile,x+nx*(d/2+.7),2.8,z+nz*(d/2+.7));canopy.rotation.y=angle;canopy.scale.set(w*.65,1,1.5);
 };
 for(let i=0;i<7;i++)house(-187,-137+i*9,8,8,7+i%3*2,Math.PI/2,i);
 for(let i=0;i<5;i++)for(const side of [-1,1])house(-176+i*8,side<0?-132:-84,8,8,7.2+i%2*2,side<0?0:Math.PI,i);
 const tree=(x,z)=>{const t=createStreetTree(6.7,2.7,wood);t.position.set(x,.09,z);root.add(t);solid(x,z,.8,.8);};
 for(const [x,z]of [[-175,-119],[-175,-97],[-149,-119],[-149,-97]]){
  add(new THREE.CylinderGeometry(1.2,1.32,.35,20),stone,x,.25,z);solid(x,z,2.5,2.5);
  add(new THREE.CylinderGeometry(1.1,1.1,.08,20),soil,x,.46,z);tree(x,z);
 }
 for(const [x,z,angle]of [[-174,-114,Math.PI/2],[-174,-102,Math.PI/2],[-160,-120,0],[-160,-96,Math.PI]]){
  const b=createParkBench(2.8,wood);b.position.set(x,.09,z);b.rotation.y=angle;details.add(b);solid(x,z,angle===0||angle===Math.PI?3:1,angle===0||angle===Math.PI?1:3);
 }
 for(const x of [-166,-159]){
  const table=createTeaTable(1.25,.7,.8,wood);table.position.set(x,.1,-98.5);details.add(table);solid(x,-98.5,1.4,.9);
  for(const dz of [-1,1]){const stool=createStool(.45,.45,.45,wood);stool.position.set(x,.1,-98.5+dz);details.add(stool);solid(x,-98.5+dz,.5,.5);}
 }
 // Surrounding planted ground breaks up the infinite concrete beyond the street.
 for(const [x,z,w,d]of [[-211,-109,35,90],[-157,-153,85,22],[-157,-65,85,22]]){
  add(new THREE.PlaneGeometry(w,d).rotateX(-Math.PI/2),soil,x,.025,z);
  for(let i=0;i<12;i++){
   const px=x-w/2+2+(i%6)*(w-4)/5,pz=z-d/2+3+Math.floor(i/6)*(d-6);
   const shrub=add(new THREE.SphereGeometry(1,10,7),leaves,px,1,pz);shrub.scale.set(1.7,1.1,1.3);
  }
 }
 if(api.label){const sign=api.label('SÂN PHÚ XÁ · NGHỈ CHÂN','#d8d0b7');sign.position.set(-178,2.2,-108);sign.scale.set(4.8,.65,1);root.add(sign);}
 return {root,boxes,houses};
}
