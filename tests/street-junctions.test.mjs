import test from 'node:test';import assert from 'node:assert/strict';
import {sidewalkSpans,inStreetMouth} from '../street-junctions.mjs';
import {DISTRICT_ROADS,constrainDistrictPosition,routeLength,districtGroundHeight} from '../district-routes.mjs';
import {districtPath} from '../district-navigation.mjs';
import {playtestWorld,rollOutRoute} from '../world-playtest.mjs';
test('sidewalk and curb spans leave full branch mouths open on the appropriate side',()=>{
 for(const side of [-1,1])for(const x of [36.5,42,47.5]){
  assert.equal(inStreetMouth(x,side*9),true);
  assert.equal(sidewalkSpans(side).some(s=>x>s.minX&&x<s.maxX),false);
 }
 assert.equal(inStreetMouth(-67,-9),true);assert.equal(inStreetMouth(-15,9),true);
 assert.equal(inStreetMouth(-67,9),false);assert.equal(inStreetMouth(-15,-9),false);
 for(const side of [-1,1])for(const span of sidewalkSpans(side))assert.ok(span.maxX>span.minX);
});
test('east high street opens the old boundary and joins the river loop without cutting buildings',()=>{
 const road=DISTRICT_ROADS.find(r=>r.id==='market-link');assert.ok(routeLength(road)>170);
 const boxes=playtestWorld();
 for(const mode of ['walk','ride'])for(const [a,b]of [[{x:145,z:0},{x:245,z:-105}],[{x:245,z:-105},{x:145,z:0}]]){
  const result=rollOutRoute(a,b,boxes,{mode});assert.equal(result.ok,true,JSON.stringify(result));
  assert.ok(districtPath(a,b).some(p=>p.x===162&&p.z===0));
 }
 for(const x of [165,180,200]){const p={x,z:0};constrainDistrictPosition(p);assert.deepEqual(p,{x,z:0});assert.ok(districtGroundHeight(x,0)>0);}
});
