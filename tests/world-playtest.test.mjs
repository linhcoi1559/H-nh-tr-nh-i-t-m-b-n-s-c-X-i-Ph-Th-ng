import test from'node:test';import assert from'node:assert/strict';import {rollOutRoute,auditRoadNetwork}from'../world-playtest.mjs';
test('route probes reach the extension through its actual junction and detect an inserted blocking wall',()=>{
 const start={x:42,z:-40},target={x:42,z:-100};assert.equal(rollOutRoute(start,target,[]).ok,true);
 const run=rollOutRoute(start,target,[{minX:30,maxX:54,minZ:-81,maxZ:-80}]);assert.equal(run.ok,false);assert.equal(run.type,'guide-crosses-collider');assert.ok(run.position.z>-82&&run.position.z<-79);
});
test('seeded probes reproduce failures and distinguish blocked spawning from blocked navigation',()=>{
 const wall={minX:-1000,maxX:1000,minZ:-1000,maxZ:1000};const a=auditRoadNetwork({seed:123,journeys:12,boxes:[wall]}),b=auditRoadNetwork({seed:123,journeys:12,boxes:[wall]});assert.deepEqual(a,b);assert.equal(a.summary.blockedStarts,12);assert.equal(a.summary.routeFindings,0);
 assert.equal(rollOutRoute({x:42,z:-70},{x:42,z:-120},[],{maxSteps:2}).type,'step-budget');
});
