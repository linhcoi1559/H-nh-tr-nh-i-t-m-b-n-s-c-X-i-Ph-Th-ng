import test from 'node:test';import assert from 'node:assert/strict';
import {TRAFFIC_STREETS,streetTrafficRoute} from '../traffic-routes.mjs';
import {DISTRICT_ROADS,nearestRoad,constrainDistrictPosition,routeLength} from '../district-routes.mjs';
import {playtestWorld,rollOutRoute} from '../world-playtest.mjs';
import {RIDER_IDENTITIES} from '../citizen-roster.mjs';
import {encodeSnapshot,parseSnapshot} from '../gameplay-state.mjs';
import {resolveTrafficCar} from '../street-traffic.mjs';
test('moving cars push the player outside the full rotated vehicle footprint',()=>{
 for(const yaw of [0,.4,Math.PI/2,Math.PI])for(const initial of [[0,0],[1.5,.2],[-1,.4]]){
  const p={x:initial[0],z:initial[1]},v={x:0,z:0,yaw};resolveTrafficCar(p,v,.46);
  const x=p.x*Math.cos(yaw)-p.z*Math.sin(yaw),z=p.x*Math.sin(yaw)+p.z*Math.cos(yaw);
  assert.ok(Math.abs(x)>=2.54-1e-8||Math.abs(z)>=1.44-1e-8);
 }
});
test('every driveable street has two-lane traffic paths clear of static district obstacles',()=>{
 const boxes=playtestWorld();assert.ok(RIDER_IDENTITIES.length>=TRAFFIC_STREETS.length);
 for(const road of DISTRICT_ROADS)assert.ok(TRAFFIC_STREETS.some(s=>s.id===road.id));
 for(const street of TRAFFIC_STREETS){
  const path=streetTrafficRoute(street);assert.ok(path.getLength()>routeLength(street)*1.8);
  for(let i=0;i<650;i++){
   const p=path.getPointAt(i/650),t=path.getTangentAt(i/650);
   assert.ok(nearestRoad(p.x,p.z,[street]).distance<street.width/2-.4,street.id+' lane escaped road');
   for(const d of [-1.3,0,1.3]){
    const x=p.x+t.x*d,z=p.z+t.z*d;
    assert.equal(boxes.some(b=>x>b.minX-.9&&x<b.maxX+.9&&z>b.minZ-.9&&z<b.maxZ+.9),false,street.id+' car envelope hits static obstacle');
   }
   assert.ok(Number.isFinite(p.x+p.z+t.x+t.z));
  }
 }
});
test('west and south extensions connect to the road graph and survive save reloads',()=>{
 const boxes=playtestWorld();
 for(const target of [{x:-214,z:0},{x:-220,z:-50},{x:42,z:95},{x:-15,z:95},{x:-209,z:-37}]){
  const p={...target};constrainDistrictPosition(p);assert.deepEqual(p,target);
  const saved=parseSnapshot(encodeSnapshot({playerPosition:p}));assert.equal(saved.playerPosition.x,p.x);assert.equal(saved.playerPosition.z,p.z);
  for(const mode of ['walk','ride'])assert.ok(rollOutRoute({x:42,z:0},target,boxes,{mode}).ok,JSON.stringify({target,mode}));
 }
});
