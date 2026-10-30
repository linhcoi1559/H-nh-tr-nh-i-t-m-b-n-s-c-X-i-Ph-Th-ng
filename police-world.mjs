import {policeRoadPath,pursuitCaught} from './police-pursuit.mjs';
import {constrainPedestrian,pedestrianWaypoint} from './pedestrian-space.mjs';
import * as THREE from 'three';
import {TRAFFIC_STREETS} from './traffic-routes.mjs';
import {nearestRoad} from './district-routes.mjs';
import {createEnforcement,stepEnforcement,settleTicket,STREET_SPEED_LIMIT} from './police-state.mjs';

export function createPoliceWorld(api){
 const root=new THREE.Group();root.name='NeighborhoodPolice';api.world.add(root);
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#f6f4e9';ctx.beginPath();ctx.arc(64,64,59,0,Math.PI*2);ctx.fill();ctx.lineWidth=12;ctx.strokeStyle='#b73232';ctx.stroke();ctx.fillStyle='#202b31';ctx.font='bold 54px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(STREET_SPEED_LIMIT),64,65);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const signMaterial=new THREE.MeshStandardMaterial({map:texture,roughness:.8,side:THREE.FrontSide,transparent:true});
 for(const [x,z,angle]of [[104,7.2,Math.PI/2],[354,-119,Math.PI/2]]){const sign=new THREE.Group();const pole=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,2.3,8),new THREE.MeshStandardMaterial({color:0x7d8586,roughness:.8}));pole.position.y=1.15;sign.add(pole);const face=new THREE.Mesh(new THREE.CircleGeometry(.45,24),signMaterial);face.position.y=2.15;sign.add(face);const reverse=face.clone();reverse.rotation.y=Math.PI;reverse.position.z=-.02;sign.add(reverse);sign.position.set(x,.08,z);sign.rotation.y=angle;root.add(sign);}
 const state=createEnforcement(),patrols=[[[108,6.4],[-88,6.4]],[[350,-115],[350,-145]]];
 const officers=patrols.map((points,i)=>{const group=new THREE.Group();group.position.set(points[0][0],.08,points[0][1]);root.add(group);return {group,index:i,points,waypoint:1,mixer:null,actions:null,mode:'idle',wait:20};});
 const panel=document.createElement('aside');panel.id='police-status';panel.className='hidden';panel.setAttribute('aria-live','polite');document.body.append(panel);
 let crime=null,arrest=null,report=false,notice='',noticeFor=0,chase=null,jail=null;
 const cell=new THREE.Group();cell.position.set(450,0,150);cell.visible=false;api.world.add(cell);const cellMat=new THREE.MeshStandardMaterial({color:0x8a918b,roughness:.9}),barsMat=new THREE.MeshStandardMaterial({color:0x414e53,roughness:.5,metalness:.4});
 for(const [x,y,z,w,h,d]of [[0,-.1,0,5,.2,5],[-2.5,1.6,0,.15,3.2,5],[2.5,1.6,0,.15,3.2,5],[0,1.6,-2.5,5,3.2,.15],[0,.5,-1.9,3,.16,.7]]){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),cellMat);mesh.position.set(x,y,z);cell.add(mesh);}
 for(let x=-2.4;x<=2.4;x+=.32){const bar=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,3.2,6),barsMat);bar.position.set(x,1.6,2.4);cell.add(bar);}
 const corridorMat=new THREE.MeshStandardMaterial({color:0x778578,roughness:.95});
 for(const [x,y,z,w,h,d]of [[0,-.1,3.5,9,.2,6],[0,1.6,5.6,9,3.2,.18],[0,3.2,1.5,9,.18,9],[-4.5,1.6,2, .18,3.2,8],[4.5,1.6,2,.18,3.2,8]]){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),corridorMat);m.position.set(x,y,z);cell.add(m);}
 const door=new THREE.Mesh(new THREE.BoxGeometry(1.2,2.4,.08),new THREE.MeshStandardMaterial({color:0x59665c,roughness:.8}));door.position.set(2.4,1.2,5.45);cell.add(door);
 const signCanvas=document.createElement('canvas');signCanvas.width=512;signCanvas.height=96;const signCtx=signCanvas.getContext('2d');signCtx.fillStyle='#25473e';signCtx.fillRect(0,0,512,96);signCtx.fillStyle='#efe9d7';signCtx.textAlign='center';signCtx.font='bold 30px system-ui';signCtx.fillText('KHU TẠM GIỮ · PHÚ THƯỢNG',256,39);signCtx.font='21px system-ui';signCtx.fillText('Giữ trật tự · Chờ cán bộ giải quyết',256,73);const signTexture=new THREE.CanvasTexture(signCanvas);signTexture.colorSpace=THREE.SRGBColorSpace;
 const noticeBoard=new THREE.Mesh(new THREE.PlaneGeometry(3.2,.6),new THREE.MeshBasicMaterial({map:signTexture}));noticeBoard.position.set(0,2.25,5.47);noticeBoard.rotation.y=Math.PI;cell.add(noticeBoard);
 const cellLight=new THREE.PointLight(0xe9e3cf,30,12);cellLight.position.set(0,2.7,0);cell.add(cellLight);cell.traverse(node=>{node.userData.envelopeReplaced=true;});
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 function say(text){notice=text;noticeFor=7;api.toast(text,5000);}
 function attachCharacters(build){for(const officer of officers){
  const human=build(officer.index?'female':'male',{identityId:officer.index?'police-van':'police-hai'});officer.group.add(human.model);
  const badge=new THREE.Mesh(new THREE.SphereGeometry(.042,8,6),new THREE.MeshStandardMaterial({color:0xf1cc5c,metalness:.55,roughness:.4}));badge.position.set(-.09,1.3,.16);officer.group.add(badge);
  const stripe=new THREE.Mesh(new THREE.BoxGeometry(.27,.035,.035),new THREE.MeshStandardMaterial({color:0xe9c965}));stripe.position.set(0,1.43,.12);officer.group.add(stripe);
  officer.mixer=new THREE.AnimationMixer(human.model);officer.actions={};for(const name of ['idle','walk','run','talk'])officer.actions[name]=officer.mixer.clipAction(human.clips[name]||human.clips.idle);
  officer.actions.idle.play();
 }}
 function move(officer,target,speed,dt){
  if(speed<3)target=pedestrianWaypoint(officer.group.position,target);
  const p=officer.group.position,d=distance(p,target),travel=Math.min(d,speed*dt);if(d>.15){p.x+=(target.x-p.x)/d*travel;p.z+=(target.z-p.z)/d*travel;api.collide?.(p,.32);if(speed<3)constrainPedestrian(p);p.y=api.ground(p.x,p.z);officer.group.rotation.y=Math.atan2(target.x-p.x,target.z-p.z);}
  const mode=speed>0&&d>.2?(speed>3?'run':'walk'):'idle';if(officer.mode!==mode&&officer.actions){officer.actions[officer.mode]?.fadeOut(.18);officer.actions[mode].reset().fadeIn(.18).play();}officer.mode=mode;
 }
 function reportCrime(){if(!crime){say('Bộ đàm: chưa ghi nhận vụ trộm cần hỗ trợ.');return;}report=true;say('Đã báo vị trí kẻ trộm. Tổ tuần tra đang tiếp cận; bạn có thể hỗ trợ nhưng không cần lao vào xe.');}
 function update(dt,elapsed,context,event){
  dt=Math.min(dt,.1);
  if(jail){jail.remaining=Math.max(0,jail.remaining-dt);panel.classList.remove('hidden');panel.textContent='🚔 Tạm giữ trong game · Còn '+Math.ceil(jail.remaining)+' giây. Tiền phạt đã xử lý: '+jail.paid.toLocaleString('vi-VN')+'đ.';if(jail.remaining<=0){jail=null;cell.visible=false;api.release();Object.assign(state,createEnforcement(),{cooldown:60});say('Đã hết thời gian tạm giữ. Bạn được trả tự do tại trụ sở; xe đỗ gần đó.');}return;}
  root.visible=!context.night;if(context.night||context.paused){panel.classList.add('hidden');return;}
  noticeFor=Math.max(0,noticeFor-dt);
  if(event?.template.id==='thief_chase'&&crime?.event!==event){crime={event,time:0};report=false;}
  if(crime&&crime.event!==event){crime=null;report=false;}
  if(!crime&&!arrest&&event?.template.id!=='thief_chase')api.hideCaptured?.();
  if(crime){
   crime.time+=dt;
   // The suspect runs along the street instead of oscillating through buildings.
   const x=24+Math.min(crime.time*2.1,65);event.x=x;event.z=2.2;api.placeSuspect?.(event);
   if(distance(officers[0].group.position,event)<1.8&&crime.time>3){arrest={x:event.x,z:event.z,time:10};api.arrest(report);crime=null;say(report?'Tổ tuần tra đã bắt giữ kẻ giật túi. Cảm ơn bạn báo tin: +5.000đ, +50 XP.':'Tổ tuần tra đã bắt giữ kẻ giật túi và thu hồi tài sản.');}
  }
  if(arrest){arrest.time-=dt;if(arrest.time<=0){arrest=null;api.hideCaptured?.();}}
  officers.forEach((o,i)=>{
   let target,speed=1.15;
   if(i===0&&crime){target=crime.event;speed=3.8;}
   else if(i===0&&arrest){target=arrest;speed=0;}
   else if(state.stage!=='patrol'&&state.officer===i){const road=nearestRoad(context.x,context.z,TRAFFIC_STREETS);target={x:road.x,z:road.z};speed=state.stage==='ticket'?3.6:2.6;}
   else if(o.wait>0){o.wait-=dt;target={x:o.group.position.x,z:o.group.position.z};speed=0;}
   else{const [x,z]=o.points[o.waypoint];target={x,z};if(distance(o.group.position,target)<.5){o.waypoint=1-o.waypoint;o.wait=8;}}
   move(o,target,speed,dt);o.mixer?.update(dt);
  });
  const road=nearestRoad(context.x,context.z,TRAFFIC_STREETS),seen=officers.map((o,i)=>({i,d:distance(o.group.position,context)})).filter(o=>o.d<55&&api.canSee(officers[o.i].group.position,context)).sort((a,b)=>a.d-b.d)[0];
  if(state.stage==='patrol'&&chase){api.endChase(chase.vehicle);chase=null;}
  if(chase){
   chase.time+=dt;chase.refresh-=dt;
   if(chase.refresh<=0){chase.path=policeRoadPath(chase.vehicle.mesh.position,context);chase.refresh=.7;}
   chase.vehicle.mesh.userData.policeBeacons?.forEach((m,i)=>m.emissiveIntensity=(Math.floor(elapsed*5)+i)%2?2:.05);
   const p=chase.vehicle.mesh.position;while(chase.path.length&&distance(p,chase.path[0])<2)chase.path.shift();const target=chase.path[0];
   if(target){const d=distance(p,target);let travel=Math.min(d,26*dt);if(api.canMoveCar&&!api.canMoveCar(chase.vehicle,{x:p.x+(target.x-p.x)/d*travel,z:p.z+(target.z-p.z)/d*travel,yaw:Math.atan2(-(target.z-p.z),target.x-p.x),kind:'car'})){travel=0;api.stepAside?.(chase.vehicle,dt);}p.x+=(target.x-p.x)/d*travel;p.z+=(target.z-p.z)/d*travel;p.y=api.ground(p.x,p.z)+.02;chase.vehicle.yaw=Math.atan2(-(target.z-p.z),target.x-p.x);chase.vehicle.mesh.rotation.y=chase.vehicle.yaw;chase.vehicle.currentSpeed=travel/dt;for(const wheel of chase.vehicle.mesh.userData.wheels)wheel.rotation.z-=travel/.36;}
   const d=distance(p,context);if(pursuitCaught(d,context.speed,chase.time)||(distance(officers[state.officer].group.position,context)<2.5&&Math.abs(context.speed)<2)){
    const paid=Math.min(api.balance(),state.violation.fine+5000);api.pay(paid);api.endChase(chase.vehicle);chase=null;jail={remaining:15,paid};cell.visible=true;api.detain();say('Đã bị bắt sau khi bỏ chạy. Xử lý tiền phạt và tạm giữ 15 giây trong game.');return;
   }
  }
  const outcome=stepEnforcement(state,{...context,roadDistance:road.distance,roadWidth:road.width,witness:!!seen&&!(crime||arrest),officer:seen?.i||0},dt);
  if(outcome==='warning')say('Cảnh sát yêu cầu dừng xe: '+state.violation.label+'. Giảm tốc và dừng lại trong 7 giây để được nhắc nhở.');
  if(outcome==='complied')say('Bạn đã chấp hành dừng xe. Tổ tuần tra nhắc nhở, không trừ tiền.');
  if(outcome==='ticket'){
   const vehicle=api.cars().sort((a,b)=>distance(a.mesh.position,context)-distance(b.mesh.position,context))[0];
   if(vehicle){vehicle.pursuing=true;vehicle.mesh.visible=true;chase={vehicle,time:0,refresh:0,path:[]};say('🚨 Xe cảnh sát đang truy đuổi! Dừng xe, xuống xe và làm việc với cán bộ. Bị bắt khi bỏ chạy sẽ bị phạt và tạm giữ trong game.');}
  }
  const visible=state.stage!=='patrol'||(crime&&distance(officers[0].group.position,context)<100)||noticeFor>0;
  panel.classList.toggle('hidden',!visible);
  if(visible){const text=state.stage==='warning'?'🚔 '+state.violation.label+' · Còn '+Math.ceil(state.remaining)+' giây để dừng xe.':state.stage==='ticket'?(chase?'🚨 Đang bị xe cảnh sát truy đuổi! ':'🚔 Biên bản: ')+state.violation.label+' · '+state.violation.fine.toLocaleString('vi-VN')+'đ trong game. Dừng, xuống xe F rồi tới cán bộ bấm E.':crime?'🚔 Cảnh sát đang truy đuổi kẻ giật túi · K: báo vị trí hỗ trợ':notice;panel.textContent=text;}
 }
 function interaction(context){return state.stage==='ticket'&&!context.riding&&distance(officers[state.officer].group.position,context)<4;}
 function interact(context){if(!interaction(context))return false;const result=settleTicket(state,api.balance());api.pay(result.paid);say(result.paid?'Đã xử lý vi phạm trong game: '+result.label+' · -'+result.paid.toLocaleString('vi-VN')+'đ.':'Bạn không đủ tiền; tổ tuần tra ghi nhận nhắc nhở, không tạo khoản nợ.');return true;}
 return {isDetained:()=>!!jail,update,attachCharacters,reportCrime,interact,interaction,state,officers,debug:()=>({stage:jail?'jail':chase?'pursuit':state.stage,detention:jail?.remaining||0,remaining:state.remaining,violation:state.violation?.id,crime:!!crime,arrest:arrest?.time||0,officers:officers.map(o=>({x:o.group.position.x,z:o.group.position.z,mode:o.mode}))})};
}
