import test from 'node:test';import assert from 'node:assert/strict';
import {CITY_TRAFFIC_LOOPS,connectedTrafficRoute,loopForStreet} from '../connected-traffic.mjs';
import {TRAFFIC_STREETS} from '../traffic-routes.mjs';import {nearestRoad} from '../district-routes.mjs';
import {constrainPedestrian,onCrosswalk,pedestrianWaypoint,pedestrianRoute,PEDESTRIAN_CROSSINGS} from '../pedestrian-space.mjs';
import {policeRoadPath,pursuitCaught} from '../police-pursuit.mjs';
test('connected loops continue across original street endpoints and remain on paved corridors',()=>{
 for(const [name,points]of Object.entries(CITY_TRAFFIC_LOOPS)){
  const id=Object.keys({west:'peach-west',east:'market-link',north:'phu-gia',south:'school-side-street',river:'riverside-loop',bus:'city-bus'}).includes(name)?{west:'peach-west',east:'market-link',north:'phu-gia',south:'school-side-street',river:'riverside-loop',bus:'city-bus'}[name]:'core-high-street';
  const route=connectedTrafficRoute(id);assert.ok(route.getLength()>250);for(let i=0;i<1000;i++){const p=route.getPointAt(i/1000),r=nearestRoad(p.x,p.z,TRAFFIC_STREETS);assert.ok(r.distance<r.width/2+.6,name+' '+JSON.stringify({x:p.x,z:p.z,r}));}
 }
 assert.equal(loopForStreet('south-neighborhood'),'south');
});
test('pedestrians keep to sidewalks and actual marked crossings while courtyards stay accessible',()=>{
 const p={x:10,z:2};assert.equal(constrainPedestrian(p),true);assert.ok(p.z>5.7);const c={x:42,z:1};assert.ok(onCrosswalk(c.x,c.z));assert.equal(constrainPedestrian(c),false);const middle={x:42,z:-90};constrainPedestrian(middle);assert.ok(Math.abs(middle.x-42)>5);assert.equal(middle.z,-90);
 const garden={x:-203,z:-37};assert.equal(constrainPedestrian(garden),false);
 const way=pedestrianWaypoint({x:10,z:7},{x:10,z:-7});assert.ok(PEDESTRIAN_CROSSINGS.some(c=>c.roadId==='core-high-street'&&Math.abs(c.x-way.x)<.01));assert.ok(way.z>6);
});

test('every painted crossing connects both pavements, including angled extension streets',()=>{
 for(const c of PEDESTRIAN_CROSSINGS){
  const p={x:c.x+c.nx*(c.length/2+.2),z:c.z+c.nz*(c.length/2+.2)};
  for(let distance=c.length/2+.15;distance>=-c.length/2-.15;distance-=.04){
   const prior={...p};p.x=c.x+c.nx*distance;p.z=c.z+c.nz*distance;
   const desired={...p};constrainPedestrian(p,prior);
   assert.ok(Math.hypot(p.x-desired.x,p.z-desired.z)<.001,JSON.stringify(c));
  }
 }
});
test('police road routing reaches connected districts and capture requires physical proximity',()=>{
 const path=policeRoadPath({x:100,z:0},{x:-213,z:-40});assert.ok(path.length>3);for(const p of path)assert.ok(nearestRoad(p.x,p.z,TRAFFIC_STREETS).distance<2.2);assert.equal(pursuitCaught(30,0,50),false);assert.equal(pursuitCaught(4,15,3),false);assert.equal(pursuitCaught(4,15,15),true);
});

test('a pedestrian can complete a marked crossing without oscillating or entering unmarked asphalt',()=>{
 const p={x:10,z:7},target={x:10,z:-7},route=pedestrianRoute(p,target);for(let i=0;i<6000&&route.length;i++){const goal=route[0],dx=goal.x-p.x,dz=goal.z-p.z,d=Math.hypot(dx,dz);if(d<.1){route.shift();continue;}const step=Math.min(.06,d);p.x+=dx/d*step;p.z+=dz/d*step;constrainPedestrian(p);assert.ok(Number.isFinite(p.x+p.z));}assert.ok(Math.hypot(p.x-target.x,p.z-target.z)<.2);
});
