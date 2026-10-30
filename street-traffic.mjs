// Distances and speeds use metres and seconds, independent of render rate.
export function forwardClearance(x,z,dx,dz,obstacles,laneRadius=1.05,nose=1) {
  let gap=Infinity;
  for(const obstacle of obstacles){
    const ox=obstacle.x-x,oz=obstacle.z-z;
    const ahead=ox*dx+oz*dz,side=Math.abs(ox*dz-oz*dx);
    const radius=obstacle.radius??.45;
    if(ahead>=0&&side<laneRadius+(obstacle.lateralRadius??radius))gap=Math.min(gap,Math.max(0,ahead-radius-nose));
  }
  return gap;
}
export function trafficStep(speed,cruise,gap,dt) {
  dt=Math.max(0,Math.min(dt,.1));
  const clear=Math.max(0,gap-.7);
  // Comfortable braking plus a speed-dependent following distance.
  const target=Math.min(cruise,Math.sqrt(2*4*clear),clear/1.15);
  const next=clear<.03?0:Math.max(0,speed+Math.max(-5*dt,Math.min(1.8*dt,target-speed)));
  // Clamp travel as well as speed: a newly appearing obstacle cannot be crossed.
  const distance=clear<.03?0:Math.min((speed+next)*.5*dt,clear);
  return {speed:distance<1e-5?0:next,distance,braking:target<speed-.2||clear<.1};
}
export function resolveTrafficCar(pos,vehicle,radius){
 const c=Math.cos(vehicle.yaw),s=Math.sin(vehicle.yaw),dx=pos.x-vehicle.x,dz=pos.z-vehicle.z;
 let x=dx*c-dz*s,z=dx*s+dz*c;const hx=(vehicle.kind==='bus'?3.55:2.08)+radius,hz=(vehicle.kind==='bus'?1.15:.98)+radius;
 if(Math.abs(x)>=hx||Math.abs(z)>=hz)return false;
 if(hx-Math.abs(x)<hz-Math.abs(z))x=(x<0?-1:1)*hx;else z=(z<0?-1:1)*hz;
 pos.x=vehicle.x+x*c+z*s;pos.z=vehicle.z-x*s+z*c;return true;
}

// Local X is the vehicle's long axis. SAT checks the actual rotated footprint,
// including cars crossing at an angle, rather than just a point ahead.
export function trafficBodiesOverlap(a,b,padding=.12){
 const size=v=>v.kind==='bus'?[3.6,1.18]:v.kind==='car'?[2.18,1.02]:[1.12,.43];
 const [al,aw]=size(a),[bl,bw]=size(b),ac=Math.cos(a.yaw),as=Math.sin(a.yaw),bc=Math.cos(b.yaw),bs=Math.sin(b.yaw);
 const dx=b.x-a.x,dz=b.z-a.z,reach=al+aw+bl+bw+padding;
 if(Math.abs(dx)>reach||Math.abs(dz)>reach)return false;
 const axes=[[ac,-as],[as,ac],[bc,-bs],[bs,bc]];
 return axes.every(([x,z])=>Math.abs(dx*x+dz*z)<al*Math.abs(ac*x-as*z)+aw*Math.abs(as*x+ac*z)+bl*Math.abs(bc*x-bs*z)+bw*Math.abs(bs*x+bc*z)+padding);
}
