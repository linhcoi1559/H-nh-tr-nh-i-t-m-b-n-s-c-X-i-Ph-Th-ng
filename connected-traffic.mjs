import * as THREE from 'three';
import {DISTRICT_ROADS} from './district-routes.mjs';
const road=id=>DISTRICT_ROADS.find(r=>r.id===id).points;
export const CITY_TRAFFIC_LOOPS={
 west:[[42,0],[-182,0],...road('peach-west').slice(1),...road('phu-xa').slice(1,4),[42,-55]],
 east:[[42,0],...road('market-link'),[205,-140],[162,-172],[105,-144],[42,-125],[42,-55]],
 north:[[42,-125],[35,-180],[20,-230],[105,-229],[170,-220],[205,-205],[162,-172],[105,-144]],
 river:[...road('riverside-loop'),[205,-205]],
 south:[[42,0],[42,55],[42,95],[-15,95],[-15,55],[-15,0]],
 bus:[[42,0],[-182,0],...road('peach-west').slice(1),...road('phu-xa').slice(1,6),[205,-140],[245,-105],[255,-65],[245,-28],[205,0],[162,0]]
};
export function loopForStreet(id){return {'core-high-street':'west','core-phu-gia':'west','school-side-street':'south','phu-gia':'north','phu-xa':'west','an-duong-vuong':'north','riverside-loop':'river','market-link':'east','peach-west':'west','south-neighborhood':'south','city-bus':'bus'}[id]||'east';}
const cache=new Map();
export function connectedTrafficRoute(id,reverse=false){
 const key=loopForStreet(id)+':'+reverse;if(cache.has(key))return cache.get(key);
 let list=CITY_TRAFFIC_LOOPS[loopForStreet(id)].filter((p,i,a)=>!i||Math.hypot(p[0]-a[i-1][0],p[1]-a[i-1][1])>.1);
 if(Math.hypot(list[0][0]-list.at(-1)[0],list[0][1]-list.at(-1)[1])<.1)list=list.slice(0,-1);if(reverse)list=[...list].reverse();
 const points=list.map(([x,z])=>new THREE.Vector3(x,0,z)),center=new THREE.CurvePath(),entries=[],exits=[];
 points.forEach((p,i)=>{const before=p.clone().sub(points[(i+points.length-1)%points.length]),after=points[(i+1)%points.length].clone().sub(p),trim=Math.min(5,before.length()*.19,after.length()*.19);entries.push(p.clone().addScaledVector(before.normalize(),-trim));exits.push(p.clone().addScaledVector(after.normalize(),trim));});
 points.forEach((p,i)=>{center.add(new THREE.QuadraticBezierCurve3(entries[i],p,exits[i]));center.add(new THREE.LineCurve3(exits[i],entries[(i+1)%points.length]));});
 const count=Math.ceil(center.getLength()/1.7),lane=[];
 for(let i=0;i<count;i++){const p=center.getPointAt(i/count),t=center.getTangentAt(i/count).normalize();lane.push(p.add(new THREE.Vector3(t.z,0,-t.x).multiplyScalar(2.1)));}
 const route=new THREE.CatmullRomCurve3(lane,true,'centripetal');route.arcLengthDivisions=count*4;route.updateArcLengths();cache.set(key,route);return route;
}
