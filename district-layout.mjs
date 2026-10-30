import {DISTRICT_ROADS,EAST_PUBLIC_AREAS,nearestRoad} from './district-routes.mjs';
export const curbClearOfBend=(road,p)=>!road.points.some(([x,z])=>Math.hypot(p.x-x,p.z-z)<8);
export function footprintBounds(x,z,width,depth,rotation=0){
 const c=Math.abs(Math.cos(rotation)),s=Math.abs(Math.sin(rotation));
 const w=width*c+depth*s,d=width*s+depth*c;
 return {minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,width:w,depth:d};
}
export function segmentHitsBounds(a,b,bounds,pad=0){
 let enter=0,exit=1;
 for(const [key,min,max]of [['x','minX','maxX'],['z','minZ','maxZ']]){
  const origin=a[key],direction=b[key]-origin,lo=bounds[min]-pad,hi=bounds[max]+pad;
  if(Math.abs(direction)<1e-9){if(origin<lo||origin>hi)return false;}
  else{const t0=(lo-origin)/direction,t1=(hi-origin)/direction;enter=Math.max(enter,Math.min(t0,t1));exit=Math.min(exit,Math.max(t0,t1));if(enter>exit)return false;}
 }return true;
}
export function canPlaceDistrictBuilding(bounds){
 for(const a of EAST_PUBLIC_AREAS)if(bounds.minX<a.maxX+1&&bounds.maxX>a.minX-1&&bounds.minZ<a.maxZ+1&&bounds.maxZ>a.minZ-1)return false;
 for(const road of DISTRICT_ROADS)for(let i=1;i<road.points.length;i++){
  const a={x:road.points[i-1][0],z:road.points[i-1][1]},b={x:road.points[i][0],z:road.points[i][1]};
  if(segmentHitsBounds(a,b,bounds,road.width/2+3.2))return false;
 }return true;
}
// Outer residential edge around the *whole* connected street layout. It is
// deliberately outside the walkable corridor, never a wall across a road.
export function neighborhoodBoundarySegments(){
 const step=10,cells=new Set(),key=(x,z)=>x+','+z;
 const inside=(x,z)=>{
  if(x>=-202&&x<=182&&z>=-75&&z<=75)return true;
  const n=nearestRoad(x,z);if(n.distance<n.width/2+32)return true;
  return EAST_PUBLIC_AREAS.some(a=>x>=a.minX-25&&x<=a.maxX+25&&z>=a.minZ-25&&z<=a.maxZ+25);
 };
 for(let x=-280;x<430;x+=step)for(let z=-290;z<180;z+=step)if(inside(x+5,z+5))cells.add(key(x,z));
 const segments=[];
 for(const cell of cells){const [x,z]=cell.split(',').map(Number);
  for(const [dx,dz]of [[-1,0],[1,0],[0,-1],[0,1]]){
   if(cells.has(key(x+dx*step,z+dz*step)))continue;
   const cx=x+5+dx*5,cz=z+5+dz*5;
   if(cx>=378||cz<=-250)continue; // retain the real open water views
   const w=dx?.45:step,d=dz?.45:step,b=footprintBounds(cx,cz,w,d);
   if(canPlaceDistrictBuilding(b))segments.push({x:cx,z:cz,w,d,...b});
  }
 }return segments;
}
