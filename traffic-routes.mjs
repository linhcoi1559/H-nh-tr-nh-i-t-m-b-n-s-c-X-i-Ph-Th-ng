import * as THREE from 'three';
import {DISTRICT_ROADS} from './district-routes.mjs';
export const TRAFFIC_STREETS=[
 {id:'core-high-street',width:11.4,points:[[-180,0],[42,0],[162,0]]},
 {id:'core-phu-gia',width:10.8,points:[[42,-55],[42,0],[42,55]]},
 {id:'school-side-street',width:8.6,points:[[-15,0],[-15,55]]},
 ...DISTRICT_ROADS
];
// Rounded centreline then two offset lanes. U-turns remain within the paved
// road-end envelope; unlike a spline through sparse corners this cannot bow
// through an entire block at a bend.
export function streetTrafficRoute(street){
 const points=street.points.map(([x,z])=>new THREE.Vector3(x,0,z)),center=new THREE.CurvePath();let current=points[0];
 for(let i=1;i<points.length-1;i++){
  const p=points[i],before=p.clone().sub(points[i-1]),after=points[i+1].clone().sub(p),trim=Math.min(5,before.length()*.2,after.length()*.2);
  const entry=p.clone().addScaledVector(before.normalize(),-trim),exit=p.clone().addScaledVector(after.normalize(),trim);
  center.add(new THREE.LineCurve3(current,entry));center.add(new THREE.QuadraticBezierCurve3(entry,p,exit));current=exit;
 }center.add(new THREE.LineCurve3(current,points.at(-1)));
 const steps=Math.max(20,Math.ceil(center.getLength()/3)),lane=Math.min(2.3,street.width*.28),forward=[],reverse=[];
 for(let i=0;i<=steps;i++){
  const t=i/steps,p=center.getPointAt(t),dir=center.getTangentAt(t).normalize(),normal=new THREE.Vector3(dir.z,0,-dir.x);
  forward.push(p.clone().addScaledVector(normal,lane));reverse.push(p.clone().addScaledVector(normal,-lane));
 }
 const end=points.at(-1).clone().addScaledVector(center.getTangentAt(1).normalize(),lane);
 const start=points[0].clone().addScaledVector(center.getTangentAt(0).normalize(),-lane);
 const route=new THREE.CatmullRomCurve3([...forward,end,...reverse.reverse(),start],true,'centripetal');route.arcLengthDivisions=Math.max(400,steps*8);route.updateArcLengths();return route;
}

// Shared endpoints and T-junctions need one reservation across all route loops.
export const TRAFFIC_JUNCTIONS=[];
for(const street of TRAFFIC_STREETS)for(const [x,z] of street.points){
 if(TRAFFIC_JUNCTIONS.some(p=>Math.hypot(p.x-x,p.z-z)<5))continue;
 const touches=TRAFFIC_STREETS.filter(other=>other!==street&&other.points.slice(1).some(([bx,bz],i)=>{const [ax,az]=other.points[i],dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));return Math.hypot(x-ax-t*dx,z-az-t*dz)<.2;}));
 if(touches.length)TRAFFIC_JUNCTIONS.push({x,z});
}
