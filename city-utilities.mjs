import * as THREE from 'three';
import {utilityLayout,nightAmount} from './city-atmosphere-state.mjs';
export function buildCityUtilities(api){
 const root=new THREE.Group();root.name='ConnectedCityUtilities';api.world.add(root);
 const layout=utilityLayout(api.blocked),metal=new THREE.MeshStandardMaterial({color:0x626968,roughness:.82,metalness:.25}),ceramic=new THREE.MeshStandardMaterial({color:0xc4c8b6,roughness:.6}),bulb=new THREE.MeshStandardMaterial({color:0xffeac1,emissive:0xffcf7f,emissiveIntensity:.05});
 const dummy=new THREE.Object3D(),poleGeo=new THREE.CylinderGeometry(.075,.115,7.5,8),poleMesh=new THREE.InstancedMesh(poleGeo,metal,layout.poles.length),armMesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(.045,.045,1.9,6),metal,layout.poles.length),heads=new THREE.InstancedMesh(new THREE.SphereGeometry(.5,10,6),metal,layout.poles.length),bulbs=new THREE.InstancedMesh(new THREE.SphereGeometry(.5,8,5),bulb,layout.poles.length),crossbars=new THREE.InstancedMesh(new THREE.BoxGeometry(1.4,.1,.1),metal,layout.poles.length),insulators=new THREE.InstancedMesh(new THREE.CylinderGeometry(.065,.065,.22,6),ceramic,layout.poles.length*4);
 const positions=[],axis=new THREE.Vector3(0,1,0),a=new THREE.Vector3(),b=new THREE.Vector3(),v=new THREE.Vector3();
 const set=(mesh,index,x,y,z,sx=1,sy=1,sz=1,angle=0)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,angle,0);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);};
 for(let i=0;i<layout.poles.length;i++){
  const p=layout.poles[i],ground=api.ground(p.x,p.z),angle=Math.atan2(p.nz,-p.nx);p.y=ground;
  set(poleMesh,i,p.x,ground+3.75,p.z);set(crossbars,i,p.x,ground+6.65,p.z,1,1,1,angle);
  a.set(p.x,ground+7.3,p.z);b.set(p.x-p.nx*1.5,ground+7.05,p.z-p.nz*1.5);v.subVectors(b,a);dummy.position.copy(a).add(b).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(axis,v.clone().normalize());dummy.scale.set(1,v.length()/1.9,1);dummy.updateMatrix();armMesh.setMatrixAt(i,dummy.matrix);
  p.lx=b.x;p.lz=b.z;set(heads,i,b.x,b.y,b.z,.7,.22,.42,angle);set(bulbs,i,b.x,b.y-.1,b.z,.55,.1,.32,angle);
  for(let c=0;c<4;c++)set(insulators,i*4+c,p.x+Math.cos(angle)*(c-1.5)*.32,ground+6.83,p.z-Math.sin(angle)*(c-1.5)*.32);
  api.pole(p.x,p.z,.17);
 }
 for(const [ai,bi]of layout.links){const p=layout.poles[ai],q=layout.poles[bi];for(let c=0;c<6;c++)for(let k=0;k<12;k++)for(const t of [k/12,(k+1)/12]){const y=c<4?6.95:6.0,offset=(c-2.5)*.16,sag=c<4?.65:1.1;positions.push(p.x+(q.x-p.x)*t+offset,p.y+(q.y-p.y)*t+y-Math.sin(Math.PI*t)*sag,p.z+(q.z-p.z)*t+offset);}}
 // Low cable loops and service drops into nearby shop frontage.
 for(const p of layout.poles)for(let k=0;k<10;k++)for(const t of [k/10,(k+1)/10])positions.push(p.x+p.nx*2.2*t,p.y+5.9-1.5*t-Math.sin(Math.PI*t)*.25,p.z+p.nz*2.2*t);
 const wireGeometry=new THREE.BufferGeometry();wireGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));const wireMat=new THREE.LineBasicMaterial({color:0x242a2a});
 const wind={value:0},time={value:0};wireMat.onBeforeCompile=shader=>{shader.uniforms.cityWind=wind;shader.uniforms.cityTime=time;shader.vertexShader='uniform float cityWind;uniform float cityTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.x += sin(cityTime*1.2+position.x*.13+position.z*.11)*cityWind*.035;');};
 root.add(poleMesh,armMesh,heads,bulbs,crossbars,insulators,new THREE.LineSegments(wireGeometry,wireMat));
 const glowCanvas=document.createElement('canvas');glowCanvas.width=64;glowCanvas.height=64;const glowCtx=glowCanvas.getContext('2d'),gradient=glowCtx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,215,149,.65)');gradient.addColorStop(.35,'rgba(255,215,149,.28)');gradient.addColorStop(1,'rgba(255,215,149,0)');glowCtx.fillStyle=gradient;glowCtx.fillRect(0,0,64,64);
 const glowTexture=new THREE.CanvasTexture(glowCanvas),poolMaterial=new THREE.MeshBasicMaterial({map:glowTexture,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});const pools=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),poolMaterial,layout.poles.length);
 layout.poles.forEach((p,i)=>set(pools,i,p.lx-p.nx*1.2,.112,p.lz-p.nz*1.2,8,1,8));root.add(pools);
 // A fixed small light pool follows the nearest poles; all distant bulbs still glow.
 const lights=Array.from({length:4},()=>{const light=new THREE.PointLight(0xffd69b,0,18,2);light.castShadow=false;api.world.add(light);return light;});
 let timer=1;
 return {root,counts:{poles:layout.poles.length,cableSpans:layout.links.length,cables:layout.links.length*6,activeLightBudget:lights.length},update(dt,elapsed,context){
  time.value=elapsed;wind.value=context.wind;const night=context.night?1:nightAmount(context.hour);bulb.emissiveIntensity=.06+night*2.4;poolMaterial.opacity=night*.3;pools.visible=night>.01;
  timer+=dt;if(timer>.4){timer=0;const nearest=layout.poles.map(p=>({p,d:Math.hypot(p.x-context.x,p.z-context.z)})).sort((a,b)=>a.d-b.d);lights.forEach((light,i)=>{const row=nearest[i];if(!row||row.d>48||night<.01){light.intensity=0;return;}light.position.set(row.p.lx,row.p.y+6.95,row.p.lz);light.intensity=night*(context.performance?55:110);});}
 }};
}
