import * as THREE from 'three';
import {EAST_PUBLIC_AREAS} from './district-routes.mjs';
import {createParkBench,createTeaTable,createStool,createStreetTree,shopCanopyGeometry,buildingEnvelope,roofGeometry,archedWindowGeometry,foliageGeometry} from './neighborhood-models.mjs';
import {worldUVs} from './visual-materials.mjs';

export function buildEastWorld(api){
 const root=new THREE.Group();root.name='EastRiversideDistrict';root.userData.staticBatch=true;api.world.add(root);
 const stone=api.materials.concrete(),wood=api.materials.wood||new THREE.MeshStandardMaterial({color:0x87724e,roughness:1});
 const plaster=api.materials.plaster?.(0xd3c8ad)||stone,roofTile=new THREE.MeshStandardMaterial({color:0x85614c,roughness:1});
 const frameMaterial=new THREE.MeshStandardMaterial({color:0xded5bf,roughness:.96});
 const produce=[0x9e6b40,0x9d5545,0x799051].map(color=>new THREE.MeshStandardMaterial({color,roughness:.85}));
 const iron=new THREE.MeshStandardMaterial({color:0x4e625a,roughness:.8,metalness:.25}),cloth=new THREE.MeshStandardMaterial({color:0x7a7855,roughness:1,side:THREE.DoubleSide}),green=new THREE.MeshStandardMaterial({color:0x4e6c46,roughness:1});
 const mesh=(g,m,x,y,z)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.receiveShadow=true;root.add(o);return o;};
 const box=(x,y,z,w,h,d,m=stone,solid=true)=>{const o=mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z);if(solid)api.box(x,z,w,d);return o;};
 function sign(x,z,heading,detail,rotation=0){
  let signMaterial=stone;
  if(typeof document!=='undefined'){
   const canvas=document.createElement('canvas');canvas.width=768;canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#dcd3b9';c.fillRect(0,0,768,256);c.strokeStyle='#4b6258';c.lineWidth=10;c.strokeRect(10,10,748,236);c.fillStyle='#273e35';c.textAlign='center';c.font='bold 38px system-ui';c.fillText(heading,384,105);c.font='25px system-ui';c.fillText(detail,384,174);
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;signMaterial=new THREE.MeshStandardMaterial({map:texture,roughness:1,side:THREE.DoubleSide});
  }
  const p=mesh(new THREE.PlaneGeometry(3.3,1.1),signMaterial,x,2.25,z);p.rotation.y=rotation;
  for(const side of [-1,1]){const dx=Math.cos(rotation)*side*1.5,dz=-Math.sin(rotation)*side*1.5;mesh(new THREE.CylinderGeometry(.055,.06,2.9,8),iron,x+dx,1.45,z+dz);api.box(x+dx,z+dz,.15,.15);}
 }
 function tree(x,z){const tree=createStreetTree(6,2.4,wood);tree.position.set(x,.09,z);root.add(tree);api.box(x,z,.8,.8);}
 function bench(x,z,angle=0){const b=createParkBench(2.8,wood);b.position.set(x,.09,z);b.rotation.y=angle;root.add(b);api.box(x,z,angle?1.1:3,angle?3:1.1);}
 for(const a of EAST_PUBLIC_AREAS){const floor=mesh(worldUVs(new THREE.PlaneGeometry(a.maxX-a.minX,a.maxZ-a.minZ).rotateX(-Math.PI/2),2.4),stone,(a.minX+a.maxX)/2,.088,(a.minZ+a.maxZ)/2);floor.name='EastPublicPaving';}
 // River edge: broad water and layered low bank instead of a road ending in sky.
 const river=mesh(new THREE.PlaneGeometry(350,800).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:0x53797c,roughness:.68,metalness:.04}),555,.03,-169);river.name='EastRiverWater';
 mesh(new THREE.PlaneGeometry(5,800).rotateX(-Math.PI/2),green,384.5,.035,-169);
 mesh(new THREE.PlaneGeometry(30,800).rotateX(-Math.PI/2),green,745,.035,-169);
 // Open-view safety railing. One solid collider along the edge, not an invisible barrier in the walkway.
 api.box(382,-160,.3,48);
 for(let z=-184;z<=-136;z+=3)mesh(new THREE.CylinderGeometry(.045,.06,1.15,8),iron,381.7,.66,z);
 for(const y of [.55,1.15])box(381.7,y,-160,.07,.07,48,iron,false);
 for(const z of [-178,-166,-143])bench(376,z,Math.PI/2);
 for(const z of [-181,-139])tree(355,z);
 sign(363,-180,'SÂN NGẮM SÔNG','Xuống xe · Nhìn ra mặt nước · P chụp ảnh');
 // Garden tea pavilion, with room to walk around the furniture.
 box(267,.18,-234,12,.18,9,wood,false);
 for(const x of [261.8,272.2])for(const z of [-237.8,-230.2]){mesh(new THREE.CylinderGeometry(.1,.14,3.5,10),wood,x,1.84,z);api.box(x,z,.3,.3);}
 const canopy=mesh(shopCanopyGeometry(),cloth,267,3.7,-234);canopy.scale.set(12,2.5,9);
 for(const [x,z]of [[264,-234],[270,-234]]){const table=createTeaTable(1.2,.72,.8,wood);table.position.set(x,.09,z);root.add(table);api.box(x,z,1.3,.9);for(const dz of [-1,1]){const stool=createStool(.45,.45,.45,wood);stool.position.set(x,.09,z+dz);root.add(stool);api.box(x,z+dz,.45,.45);}}
 for(const x of [250,276])tree(x,-237);
 sign(255,-226,'QUÁN VƯỜN TRE','Dừng chân bên tuyến vòng · E nghỉ ngơi');
 // Market stalls surround a clear central lane; produce uses curved baskets.
 for(const [x,z]of [[288,-70],[303,-69],[315,-78]]){
  const awning=mesh(shopCanopyGeometry(),cloth,x,2.8,z);awning.scale.set(5.8,1.2,3.8);
  for(const dx of [-2.5,2.5]){mesh(new THREE.CylinderGeometry(.045,.06,2.8,8),iron,x+dx,1.4,z);api.box(x+dx,z,.15,.15);}
  box(x,.85,z,4.5,.14,1.6,wood,true);
  for(const dx of [-1.4,0,1.4]){
   mesh(new THREE.CylinderGeometry(.5,.36,.3,12),wood,x+dx,1.07,z);
   for(let i=0;i<5;i++)mesh(new THREE.SphereGeometry(.16,8,6),produce[Math.round(dx+1.4)%3],x+dx+Math.cos(i*2.4)*.24,1.29,z+Math.sin(i*2.4)*.24);
  }
 }
 for(const x of [286,318])tree(x,-94);
 sign(294,-95,'CHỢ PHIÊN ĐẦU ĐÔNG','Lối giữa các sạp luôn để trống · P lưu một góc chợ');
 // Rear market frontage closes the northern view without blocking the plaza.
 for(let i=0;i<5;i++){
  const x=283+i*8.4,height=6.8+i%2*1.8;
  mesh(buildingEnvelope(8.2,height,6),plaster,x,height/2,-60);api.box(x,-60,8.2,6);
  mesh(roofGeometry(8.6,6.5,1.2),roofTile,x,height+.6,-60);
  box(x,3.2,-63.08,8.2,.14,.2,frameMaterial,false);
  for(const dx of [-2.3,0,2.3])for(const y of [1.6,4.6]){
   const pane=mesh(archedWindowGeometry(),iron,x+dx,y,-63.06);pane.scale.set(1.25,1.8,1);pane.rotation.y=Math.PI;
   const frame=mesh(archedWindowGeometry(true),frameMaterial,x+dx,y,-63.09);frame.scale.set(1.4,1.95,1);frame.rotation.y=Math.PI;
  }
 }
 // Physical direction boards before both ends of the new route.
 sign(198,-188,'TUYẾN VÒNG VEN SÔNG','Quán vườn tre → Sân ngắm sông → Chợ phiên',-.8);
 sign(174,-155,'ĐƯỜNG VÒNG PHÍA ĐÔNG','Đi tiếp tới chợ phiên và bờ sông',-.8);
 // A new stop beside the eastward continuation of the original high street.
 for(const x of [222,236])tree(x,5);
 bench(232,5);bench(235,-5,Math.PI/2);
 sign(225,3,'SÂN NGHỈ PHỐ CHỢ','Đi tiếp → Chợ phiên → Tuyến vòng ven sông');
 for(const x of [219,238]){
  mesh(new THREE.CylinderGeometry(.65,.48,.6,12),wood,x,.39,6);
  const shrub=mesh(foliageGeometry(.82),green,x,1.02,6);shrub.scale.set(1.05,.92,1.05);api.box(x,6,1.3,1.3);
 }
 // Backdrop terminates the outer shore, without colliders on the playable road.
 for(let i=0;i<22;i++){const shrub=mesh(new THREE.SphereGeometry(1,10,6),green,737,1.4,-540+i*36);shrub.scale.set(12,2.8+i%3,23);}
 return {root};
}
