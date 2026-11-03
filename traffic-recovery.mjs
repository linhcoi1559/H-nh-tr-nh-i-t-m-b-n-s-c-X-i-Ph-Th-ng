import {trafficBodiesOverlap} from './street-traffic.mjs';

// Recovery uses real movement along the existing lane, never a position reset.
export function gridlockPair(vehicles){
 for(let i=0;i<vehicles.length;i++)for(let j=i+1;j<vehicles.length;j++){
  const a=vehicles[i],b=vehicles[j];if(a.pursuing||b.pursuing||a.dwell>0||b.dwell>0)continue;
  if((a.blockedFor||0)<6||(b.blockedFor||0)<6)continue;
  if(Math.hypot(a.mesh.position.x-b.mesh.position.x,a.mesh.position.z-b.mesh.position.z)>11)continue;
  const priority=a.kind==='bus'&&b.kind!=='bus'?a:b.kind==='bus'&&a.kind!=='bus'?b:a.id<b.id?a:b;
  return {priority,yielding:priority===a?b:a};
 }return null;
}
export function safeRecoveryStep(current,candidate,others,pedestrians){
 if(pedestrians.some(p=>trafficBodiesOverlap(candidate,{...p,yaw:0,kind:'bike'},.4)))return false;
 return others.every(other=>{
  if(!trafficBodiesOverlap(candidate,other,.2))return true;
  // Bodies may already overlap at a bad spawn or junction. Only separating
  // movement is permitted in that case, never deeper penetration.
  return trafficBodiesOverlap(current,other,.2)&&
   Math.hypot(candidate.x-other.x,candidate.z-other.z)>Math.hypot(current.x-other.x,current.z-other.z)+1e-5;
 });
}
