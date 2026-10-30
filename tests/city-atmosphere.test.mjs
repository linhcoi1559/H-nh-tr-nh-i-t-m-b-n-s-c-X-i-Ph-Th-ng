import test from 'node:test';import assert from 'node:assert/strict';
import {weatherAt,nightAmount,advanceCityClock,utilityLayout} from '../city-atmosphere-state.mjs';
import {TRAFFIC_STREETS,streetTrafficRoute} from '../traffic-routes.mjs';
import {trafficBodiesOverlap,resolveTrafficCar} from '../street-traffic.mjs';
import {busStops} from '../city-bus.mjs';
import {normalizeSnapshot} from '../gameplay-state.mjs';
test('weather selection is deterministic; rain and wind differ and invalid modes fall back',()=>{
 assert.equal(weatherAt(1,9,'rain').rain,1);assert.equal(weatherAt(1,9,'wind').rain,0);assert.equal(weatherAt(1,9,'wind').wind,1);assert.deepEqual(weatherAt(2,9),weatherAt(2,9,'bad'));assert.equal(new Set([0,2,4,6].map(h=>weatherAt(1,h).key)).size,4);
});
test('night lighting covers midnight and dawn; saved times survive the full 24-hour cycle',()=>{
 assert.equal(nightAmount(0),1);assert.equal(nightAmount(12),0);assert.equal(nightAmount(23),1);assert.ok(nightAmount(18)>.2);assert.ok(nightAmount(6)<nightAmount(5));
 const next=advanceCityClock(2,23.99,6);assert.equal(next.day,3);assert.ok(next.time<.02);assert.equal(normalizeSnapshot({time:2}).time,2);
});
test('every driveable street receives linked poles, with no duplicate cable links',()=>{
 const {poles,links}=utilityLayout();assert.ok(poles.length>90);for(const r of TRAFFIC_STREETS)assert.ok(poles.some(p=>p.street===r.id),r.id);
 assert.equal(new Set(links.map(([a,b])=>[a,b].sort((a,b)=>a-b).join(':'))).size,links.length);
 for(const [a,b]of links){assert.ok(poles[a]&&poles[b]);assert.ok(Math.hypot(poles[a].x-poles[b].x,poles[a].z-poles[b].z)<43);}
 const empty=utilityLayout(()=>true);assert.equal(empty.poles.length,0);assert.equal(empty.links.length,0);
});
test('bus stops sit on the loop and long vehicles use their full collision footprint',()=>{
 const route=streetTrafficRoute({width:11.4,points:[[-145,0],[135,0]]}),stops=busStops(route,[{x:80,z:-2.3},{x:-100,z:2.3}]);for(const s of stops)assert.ok(s.distance<.8);
 const bus={x:0,z:0,yaw:0,kind:'bus'};assert.ok(trafficBodiesOverlap(bus,{x:4,z:0,yaw:0,kind:'car'}));assert.equal(trafficBodiesOverlap(bus,{x:0,z:4.6,yaw:0,kind:'car'}),false);
 const p={x:3,z:0};assert.equal(resolveTrafficCar(p,bus,.46),true);assert.ok(Math.abs(p.x)>=4.01||Math.abs(p.z)>=1.61);
});
