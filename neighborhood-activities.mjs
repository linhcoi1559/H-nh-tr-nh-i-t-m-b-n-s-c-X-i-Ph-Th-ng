import * as THREE from 'three';
import {createTeaTable,createStool,foliageGeometry} from './neighborhood-models.mjs';

export {NEIGHBORHOOD_JOBS} from './neighborhood-jobs.mjs';
export function buildActivityCorners(world,collider){
 const root=new THREE.Group();root.name='NeighborhoodActivityCorners';world.add(root);
 const wood=new THREE.MeshStandardMaterial({color:0x87694b,roughness:.92}),green=new THREE.MeshStandardMaterial({color:0x506e3e,roughness:1}),metal=new THREE.MeshStandardMaterial({color:0x5d6768,roughness:.65});
 const mesh=(g,m,x,y,z,parent)=>{const n=new THREE.Mesh(g,m);n.position.set(x,y,z);n.receiveShadow=true;parent.add(n);return n;};
 const stock=[];
 for(const [x,z,kind]of [[307,-73,'market'],[-157,-117,'tools'],[29,-222,'tea']]){
  const group=new THREE.Group();group.position.set(x,.1,z);root.add(group);
  const table=createTeaTable(1.45,.8,.85,wood);table.position.y=.4;group.add(table);collider(x,z,.8);
  const stool=createStool(.42,.42,.42,wood);stool.position.set(.9,.21,.7);group.add(stool);collider(x+.9,z+.7,.26);
  if(kind==='market')for(const dx of [-.4,.35]){
   mesh(new THREE.CylinderGeometry(.28,.21,.2,12,1,true),wood,dx,.93,0,group);
   const bundle=mesh(foliageGeometry(.17),green,dx,1.08,0,group);stock.push(bundle);
  }
  else if(kind==='tools'){
   mesh(new THREE.CylinderGeometry(.04,.04,.45,8).rotateZ(Math.PI/2),wood,0,.86,0,group);
   mesh(new THREE.TorusGeometry(.09,.025,6,12,Math.PI*1.5).rotateX(-Math.PI/2),metal,.27,.87,0,group);
  }else for(const dx of [-.35,0,.35])mesh(new THREE.CylinderGeometry(.07,.05,.14,12),green,dx,.9,0,group);
 }
 // Activity objects share the existing quiet corners, away from the traffic lanes.
 const flowerRoot=new THREE.Group();flowerRoot.position.set(307,.1,-73);root.add(flowerRoot);
 const pink=new THREE.MeshStandardMaterial({color:0xb67783,roughness:.9});
 for(let i=0;i<7;i++){
  const x=-.5+i*.16,z=.22+Math.sin(i)*.12;
  mesh(new THREE.CylinderGeometry(.014,.014,.5,5),green,x,1.13,z,flowerRoot);
  for(let p=0;p<5;p++)mesh(new THREE.SphereGeometry(.055,6,4),pink,x+Math.cos(p*1.257)*.065,1.4,z+Math.sin(p*1.257)*.065,flowerRoot);
 }
 const bicycle=new THREE.Group();bicycle.name='BicyclePumpActivity';bicycle.position.set(-157.5,.1,-119);root.add(bicycle);
 const tire=new THREE.MeshStandardMaterial({color:0x252b2b,roughness:.95});
 for(const x of [-.6,.6]){
  mesh(new THREE.TorusGeometry(.32,.045,6,16),tire,x,.36,0,bicycle);
  mesh(new THREE.TorusGeometry(.26,.012,4,16),metal,x,.36,0,bicycle);
 }
 const rod=(ax,ay,bx,by)=>{
  const g=new THREE.CylinderGeometry(.025,.025,Math.hypot(bx-ax,by-ay),6),n=mesh(g,metal,(ax+bx)/2,(ay+by)/2,0,bicycle);n.rotation.z=-Math.atan2(bx-ax,by-ay);
 };
 for(const [ax,ay,bx,by]of [[-.6,.36,-.15,.83],[-.15,.83,0,.36],[0,.36,-.6,.36],[-.15,.83,.4,.83],[.4,.83,.6,.36],[.6,.36,0,.36],[0,.36,.4,.83]])rod(ax,ay,bx,by);
 mesh(new THREE.SphereGeometry(.5,8,4),tire,-.15,.88,0,bicycle).scale.set(.28,.06,.16);
 mesh(new THREE.CylinderGeometry(.05,.07,.65,8),metal,1,.34,0,bicycle);
 mesh(new THREE.CylinderGeometry(.025,.025,.35,6).rotateZ(Math.PI/2),wood,1,.7,0,bicycle);
 collider(-157.5,-119,.96);collider(-156.5,-119,.15);
 const tea=new THREE.Group();tea.name='GardenTeaActivity';tea.position.set(264,.1,-234);root.add(tea);
 for(const x of [-.35,0,.35])mesh(new THREE.CylinderGeometry(.065,.045,.12,10),green,x,.9,0,tea);
 mesh(new THREE.SphereGeometry(.15,10,6),wood,.25,1.01,.2,tea);
 const fishing=new THREE.Group();fishing.name='RiversideFishingActivity';fishing.position.set(373,.1,-156);root.add(fishing);
 const rodMesh=mesh(new THREE.CylinderGeometry(.018,.035,2.8,6),wood,0,1.35,0,fishing);rodMesh.rotation.z=-.35;
 mesh(new THREE.CylinderGeometry(.23,.18,.35,12,1,true),metal,.55,.2,0,fishing);collider(373,-156,.28);
 return {root,update(state){const done=state.completed.includes('market-helper');for(const item of stock)item.visible=!done;}};
}
