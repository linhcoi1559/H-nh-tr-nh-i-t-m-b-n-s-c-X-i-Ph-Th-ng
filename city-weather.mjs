import * as THREE from 'three';
import {weatherAt,nightAmount} from './city-atmosphere-state.mjs';
export function createCityWeather(api){
 const count=1800,positions=new Float32Array(count*3);
 for(let i=0;i<count;i++){positions[i*3]=(i*37.831)%48-24;positions[i*3+1]=(i*.137)%18;positions[i*3+2]=(i*17.391)%48-24;}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const uniforms={time:{value:0},wind:{value:.3},amount:{value:0}};
 const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,vertexShader:`uniform float time;uniform float wind;varying float fade;void main(){vec3 p=position;p.y=mod(p.y-time*13.,18.)+.1;p.x=mod(p.x+time*wind*2.+24.,48.)-24.;vec4 view=modelViewMatrix*vec4(p,1.);fade=smoothstep(1.,4.,-view.z)*(1.-smoothstep(22.,34.,-view.z));gl_PointSize=clamp(80./max(1.,-view.z),1.,5.);gl_Position=projectionMatrix*view;}`,fragmentShader:`uniform float amount;varying float fade;void main(){vec2 p=gl_PointCoord-.5;float drop=exp(-p.x*p.x*65.-p.y*p.y*6.);float alpha=drop*amount*fade*.28;if(alpha<.015)discard;gl_FragColor=vec4(.65,.72,.75,alpha);}`});
 const rain=new THREE.Points(geo,material);rain.frustumCulled=false;rain.name='LocalWeatherRain';api.scene.add(rain);
 const rippleCanvas=document.createElement('canvas');rippleCanvas.width=rippleCanvas.height=64;const rc=rippleCanvas.getContext('2d');rc.strokeStyle='rgba(180,202,207,.6)';rc.lineWidth=2;rc.beginPath();rc.arc(32,32,23,0,Math.PI*2);rc.stroke();const rippleTexture=new THREE.CanvasTexture(rippleCanvas),rippleMat=new THREE.MeshBasicMaterial({map:rippleTexture,transparent:true,opacity:0,depthWrite:false});
 const ripples=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),rippleMat,72),dummy=new THREE.Object3D();ripples.frustumCulled=false;api.scene.add(ripples);let rippleTimer=0;
 const windGeo=new THREE.BufferGeometry(),windPos=new Float32Array(100*3);windGeo.setAttribute('position',new THREE.BufferAttribute(windPos,3));const windMat=new THREE.PointsMaterial({color:0xc9b48c,size:.055,transparent:true,opacity:0,depthWrite:false});const dust=new THREE.Points(windGeo,windMat);dust.frustumCulled=false;api.scene.add(dust);
 const pill=document.createElement('span');pill.id='weather-pill';pill.className='stat-pill';pill.title='Thời tiết tự thay đổi. O → Thời tiết để tùy chỉnh.';document.querySelector('.player-card .player-stats')?.append(pill);
 if(!pill.parentElement)document.querySelector('#day-time-pill')?.after(pill);
 let wet=0,wind=.12,cloud=0,rainBlend=0,uiTimer=1,surfaceTimer=1;const tint=new THREE.Color(0x87979e),nightTint=new THREE.Color(0x26363f);
 return {update(dt,elapsed,context){
  if(context.horror){rain.visible=dust.visible=ripples.visible=false;pill.textContent='🌧 Mưa đêm';return {wind:.55,rain:1};}
  const target=weatherAt(context.day,context.hour,context.mode),blend=1-Math.exp(-dt*.45);rainBlend+=(target.rain-rainBlend)*blend;cloud+=(target.cloud-cloud)*blend;wind+=(target.wind-wind)*blend;wet+=(target.rain-wet)*(1-Math.exp(-dt*(target.rain>.1?.13:.025)));
  const budget=context.performance?600:count;geo.setDrawRange(0,budget);const underRoof=api.sheltered(context.x,context.z);rain.visible=rainBlend>.015&&!underRoof;uniforms.time.value=elapsed;uniforms.wind.value=wind;uniforms.amount.value=rainBlend;
  rain.position.set(context.x,0,context.z);dust.position.set(context.x,0,context.z);dust.visible=wind>.35&&!underRoof;windMat.opacity=Math.max(0,wind-.3)*.22;
  ripples.visible=rain.visible;rippleMat.opacity=rainBlend*.17;rippleTimer+=dt;
  if(ripples.visible&&rippleTimer>.07){rippleTimer=0;for(let i=0;i<72;i++){const phase=(elapsed*1.4+i*.137)%1,size=.05+phase*.45,x=context.x+((i*3.87)%24)-12,z=context.z+((i*7.13)%24)-12;dummy.position.set(x,api.ground?.(x,z)+.025||.105,z);dummy.scale.setScalar(size);dummy.updateMatrix();ripples.setMatrixAt(i,dummy.matrix);}ripples.instanceMatrix.needsUpdate=true;}
  if(dust.visible){for(let i=0;i<100;i++){windPos[i*3]=((i*1.71+elapsed*wind*7)%46)-23;windPos[i*3+1]=.3+(i*.41)%4+Math.sin(elapsed+i)*.15;windPos[i*3+2]=((i*2.79+elapsed*.4)%42)-21;}windGeo.attributes.position.needsUpdate=true;}
  const base=api.base();if(base){const night=nightAmount(context.hour);api.sun.intensity=base.sun*(1-cloud*.48);api.hemi.intensity=base.hemi*(1-cloud*.22);api.scene.fog.density=base.density+rainBlend*.0018;api.scene.fog.color.copy(base.fog).lerp(night>.5?nightTint:tint,cloud*.5);const sky=api.sky();if(sky?.material)sky.material.color.copy(base.sky).lerp(night>.5?nightTint:tint,Math.max(cloud*.58,rainBlend*.84));}
  surfaceTimer+=dt;if(surfaceTimer>.6){surfaceTimer=0;for(const material of api.surfaces()){if(!material.userData.cityDry)material.userData.cityDry={roughness:material.roughness,metalness:material.metalness};const dry=material.userData.cityDry;material.roughness=dry.roughness*(1-wet*.52);material.metalness=Math.min(.23,dry.metalness+wet*.08);}}
  uiTimer+=dt;if(uiTimer>1){uiTimer=0;pill.textContent=target.label+(nightAmount(context.hour)>.5?' · Đêm':'');}
  return {wind,rain:rainBlend,wet,mode:target.key};
 }};
}
