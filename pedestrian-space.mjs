import {TRAFFIC_STREETS} from './traffic-routes.mjs';
import {nearestRoad} from './district-routes.mjs';
// The same oriented rectangles drive paint, permission and NPC waypoints.
// Keep a short approach on each pavement so entering/leaving never snaps back.
export const PEDESTRIAN_CROSSINGS=[];
function crossing(road,x,z,tx,tz){
 if(PEDESTRIAN_CROSSINGS.some(c=>c.roadId===road.id&&Math.hypot(c.x-x,c.z-z)<6))return;
 PEDESTRIAN_CROSSINGS.push({roadId:road.id,x,z,tx,tz,nx:-tz,nz:tx,width:3.6,length:road.width+2.6});
}
for(const road of TRAFFIC_STREETS){
 for(let i=1;i<road.points.length;i++){
  const [ax,az]=road.points[i-1],[bx,bz]=road.points[i],distance=Math.hypot(bx-ax,bz-az),tx=(bx-ax)/distance,tz=(bz-az)/distance;
  const count=Math.max(1,Math.ceil(distance/55));
  for(let j=0;j<count;j++){const t=(j+.5)/count;crossing(road,ax+(bx-ax)*t,az+(bz-az)*t,tx,tz);}
 }
}
const high=TRAFFIC_STREETS[0];crossing(high,-15,0,1,0);crossing(high,42,0,1,0);
// Branch crossings join the ends of the main-road crossings at junctions.
crossing(TRAFFIC_STREETS[1],42,8,0,1);crossing(TRAFFIC_STREETS[1],42,-8,0,1);
crossing(TRAFFIC_STREETS[2],-15,8,0,1);
export function onCrosswalk(x,z){return PEDESTRIAN_CROSSINGS.some(c=>Math.abs((x-c.x)*c.tx+(z-c.z)*c.tz)<=c.width/2&&Math.abs((x-c.x)*c.nx+(z-c.z)*c.nz)<=c.length/2);}
export function constrainPedestrian(pos,previous=pos){
 if(onCrosswalk(pos.x,pos.z))return false;
 const r=nearestRoad(pos.x,pos.z,TRAFFIC_STREETS),edge=r.width/2+.55;if(r.distance>=edge)return false;
 const dx=pos.x-r.x,dz=pos.z-r.z,length=Math.hypot(dx,dz);
 if(length>.01){pos.x=r.x+dx/length*edge;pos.z=r.z+dz/length*edge;}
 else{const prior=nearestRoad(previous.x,previous.z,TRAFFIC_STREETS),px=previous.x-prior.x,pz=previous.z-prior.z,len=Math.hypot(px,pz),road=TRAFFIC_STREETS.find(s=>s.id===r.id);let nx=0,nz=1,best=Infinity;
  for(let i=1;i<road.points.length;i++){const [ax,az]=road.points[i-1],[bx,bz]=road.points[i],sx=bx-ax,sz=bz-az,d=sx*sx+sz*sz,t=Math.max(0,Math.min(1,((r.x-ax)*sx+(r.z-az)*sz)/d)),away=Math.hypot(r.x-ax-sx*t,r.z-az-sz*t);if(away<best){best=away;nx=sz/Math.sqrt(d);nz=-sx/Math.sqrt(d);}}
  pos.x=r.x+(len>.01?px/len:nx)*edge;pos.z=r.z+(len>.01?pz/len:nz)*edge;}
 return true;
}
export function pedestrianWaypoint(from,to){
 return pedestrianRoute(from,to).find(p=>Math.hypot(p.x-from.x,p.z-from.z)>.3)||to;
}

export function pedestrianRoute(from,to){
 const a=nearestRoad(from.x,from.z,TRAFFIC_STREETS),b=nearestRoad(to.x,to.z,TRAFFIC_STREETS),ax=from.x-a.x,az=from.z-a.z,bx=to.x-b.x,bz=to.z-b.z;
 if(a.id!==b.id||ax*bx+az*bz>=0)return [{...to}];
 const crossing=PEDESTRIAN_CROSSINGS.filter(c=>c.roadId===a.id).sort((p,q)=>Math.hypot(p.x-from.x,p.z-from.z)-Math.hypot(q.x-from.x,q.z-from.z))[0];
 if(!crossing)return [{...to}];
 const side=Math.sign(ax*crossing.nx+az*crossing.nz)||1,offset=crossing.length/2-.15;
 return [{x:crossing.x+crossing.nx*offset*side,z:crossing.z+crossing.nz*offset*side},{x:crossing.x-crossing.nx*offset*side,z:crossing.z-crossing.nz*offset*side},{...to}];
}
