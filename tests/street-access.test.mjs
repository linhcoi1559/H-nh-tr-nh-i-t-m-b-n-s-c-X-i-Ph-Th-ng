import test from 'node:test';import assert from 'node:assert/strict';
import {serviceAccess,brakeBikeSpeed,blocksMemorialEntrance,memorialPath}from'../street-access.mjs';
test('services require the right physical site on foot, even if the bike has stopped',()=>{
 assert.equal(serviceAccess('garage',{x:18.5,z:-6,riding:true}).ok,false);
 assert.equal(serviceAccess('garage',{x:4,z:2}).ok,false);
 assert.equal(serviceAccess('garage',{x:18.5,z:-6}).ok,true);
 assert.equal(serviceAccess('business',{x:18.5,z:-6}).ok,false);
 assert.equal(serviceAccess('business',{x:-26.5,z:-7}).ok,true);
 assert.equal(serviceAccess('garage',{x:18.5,z:-6,night:true}).ok,false);
});
test('Space brake stops both directions without reversing and is time-step independent',()=>{
 for(const rate of [30,60,144]){
  let forward=20,reverse=-5;for(let i=0;i<rate;i++){forward=brakeBikeSpeed(forward,1/rate);reverse=brakeBikeSpeed(reverse,1/rate);}
  assert.equal(forward,0);assert.equal(Math.abs(reverse),0);
  assert.equal(brakeBikeSpeed(forward,1),0);
 }
});
test('strong brake stops a fast upgraded bike within one second, with no reversal or throttle creep',()=>{
 for(const rate of [10,30,60,144]){let speed=60,distance=0;for(let i=0;i<rate;i++){speed=brakeBikeSpeed(speed,1/rate);distance+=speed/rate;}assert.equal(speed,0);assert.ok(distance<27);}
 assert.equal(brakeBikeSpeed(0,.1),0);assert.equal(brakeBikeSpeed(-5,.1),0);
});
test('memorial route uses the opened frontage and turns behind the remaining houses',()=>{
 const houses=[];for(let x=-20;x>=-115;x-=7.8)if(!blocksMemorialEntrance(x))houses.push({minX:x-3.825,maxX:x+3.825,minZ:-22.1,maxZ:-9.9});
 const route=memorialPath({x:-20,z:-5},{x:-24,z:-28});let p={x:-20,z:-5};
 for(const target of route){const distance=Math.hypot(target.x-p.x,target.z-p.z),steps=Math.ceil(distance/.1);for(let i=1;i<=steps;i++){const x=p.x+(target.x-p.x)*i/steps,z=p.z+(target.z-p.z)*i/steps;assert.ok(houses.every(b=>x+.46<b.minX||x-.46>b.maxX||z+.46<b.minZ||z-.46>b.maxZ));}p=target;}
 assert.equal(blocksMemorialEntrance(-20),true);assert.equal(blocksMemorialEntrance(-27.8),false);
 assert.equal(memorialPath({x:0,z:0},{x:42,z:-125}),null);
});
