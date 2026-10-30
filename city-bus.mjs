import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
export const BUS_HALF_LENGTH=3.55,BUS_HALF_WIDTH=1.15;
export function createCityBus(routeName='PT 01 · PHÚ THƯỢNG'){
 const bus=new THREE.Group();bus.name='PhuThuongCityBus';bus.userData.modelFamily='bus';
 const shell=new THREE.Group();shell.userData.staticBatch=true;bus.add(shell);
 const blue=new THREE.MeshStandardMaterial({color:0x346a81,roughness:.55,metalness:.15}),cream=new THREE.MeshStandardMaterial({color:0xe8e3cf,roughness:.68}),glass=new THREE.MeshStandardMaterial({color:0x263e49,roughness:.28,metalness:.25}),dark=new THREE.MeshStandardMaterial({color:0x202b2e,roughness:.8}),trim=new THREE.MeshStandardMaterial({color:0xa4a7a0,roughness:.6,metalness:.5});
 const add=(geo,mat,x,y,z,parent=shell)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};
 add(new RoundedBoxGeometry(7.05,2.5,2.24,3,.16),cream,0,1.65,0);add(new RoundedBoxGeometry(6.98,.75,2.27,2,.07),blue,0,.95,0);
 const windscreen=add(new THREE.PlaneGeometry(1.95,1.2),glass,3.535,2.0,0);windscreen.rotation.y=Math.PI/2;
 const rear=add(new THREE.PlaneGeometry(1.8,.9),glass,-3.535,2.15,0);rear.rotation.y=-Math.PI/2;
 for(const side of [-1,1])for(let i=0;i<6;i++){const x=-2.7+i*.93;if(side===-1&&i>=4)continue;const win=add(new RoundedBoxGeometry(.83,1.05,.035,2,.035),glass,x,2.1,side*1.128);}
 add(new RoundedBoxGeometry(6.5,.13,1.9,2,.06),blue,0,2.95,0);
 for(const x of [-1.8,1.4])add(new RoundedBoxGeometry(1.2,.16,1.1,2,.06),trim,x,3.06,0);
 for(const side of [-1,1]){add(new THREE.BoxGeometry(.22,.12,.65),trim,2.6,.52,side*1.02);const mirror=add(new RoundedBoxGeometry(.18,.36,.15,2,.04),dark,3.2,2.35,side*1.32);add(new THREE.CylinderGeometry(.025,.025,.45,6).rotateZ(Math.PI/2),trim,3.1,2.5,side*1.15);}
 const wheels=[];for(const x of [-2.25,2.18])for(const z of [-1.06,1.06]){const pivot=new THREE.Group();pivot.position.set(x,.46,z);bus.add(pivot);add(new THREE.CylinderGeometry(.46,.46,.22,16).rotateX(Math.PI/2),dark,0,0,0,pivot);add(new THREE.CylinderGeometry(.27,.27,.235,12).rotateX(Math.PI/2),trim,0,0,0,pivot);wheels.push(pivot);}
 const doors=new THREE.Group();doors.position.set(2.05,1.5,-1.15);bus.add(doors);
 for(const x of [-.3,.3])add(new RoundedBoxGeometry(.55,1.95,.045,2,.03),glass,x,0,0,doors);
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=80;const ctx=canvas.getContext('2d');ctx.fillStyle='#132a2c';ctx.fillRect(0,0,512,80);ctx.fillStyle='#ffe1a1';ctx.font='bold 31px system-ui';ctx.textAlign='center';ctx.fillText(routeName,256,49);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
 const signMat=new THREE.MeshBasicMaterial({map});const sign=add(new THREE.PlaneGeometry(1.95,.31),signMat,3.553,2.69,0);sign.rotation.y=Math.PI/2;
 for(const side of [-1,1]){const sign=add(new THREE.PlaneGeometry(3.6,.56),signMat,0,1.32,side*1.15);sign.rotation.y=side<0?Math.PI:0;}
 for(const x of [-3.52,3.52])for(const z of [-.72,.72])add(new THREE.SphereGeometry(.095,8,6),new THREE.MeshStandardMaterial({color:x>0?0xfff0c2:0x9b3c35,emissive:x>0?0xffe9a5:0x7b2620,emissiveIntensity:.3}),x,.96,z);
 bus.userData.wheels=wheels;bus.userData.doors=doors;return bus;
}
export function busStops(route,locations){return locations.map(location=>{let best={distance:Infinity,progress:0};for(let i=0;i<800;i++){const p=route.getPointAt(i/800),d=Math.hypot(p.x-location.x,p.z-location.z);if(d<best.distance)best={distance:d,progress:i/800};}return {...location,...best};});}
export function createBusStop(world,x,z,label,angle=0){
 const root=new THREE.Group();root.position.set(x,.08,z);root.rotation.y=angle;world.add(root);root.userData.staticBatch=true;
 const metal=new THREE.MeshStandardMaterial({color:0x4d686b,roughness:.7}),roof=new THREE.MeshStandardMaterial({color:0x597d81,roughness:.65});
 for(const x of [-1.5,1.5]){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,2.6,8),metal);pole.position.set(x,1.3,0);root.add(pole);}
 const canopy=new THREE.Mesh(new RoundedBoxGeometry(3.6,.12,1.65,2,.06),roof);canopy.position.set(0,2.6,0);root.add(canopy);
 const bench=new THREE.Mesh(new RoundedBoxGeometry(2.5,.12,.5,2,.04),metal);bench.position.set(0,.55,0);root.add(bench);
 const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#173e49';ctx.fillRect(0,0,512,96);ctx.fillStyle='#fff0c1';ctx.textAlign='center';ctx.font='bold 26px system-ui';ctx.fillText('🚍 '+label,256,36);ctx.font='19px system-ui';ctx.fillText('Xe buýt khu phố · Dừng đón trả khách',256,72);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
 const board=new THREE.Mesh(new THREE.PlaneGeometry(3.2,.6),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));board.position.set(0,2.2,-.05);root.add(board);return root;
}
