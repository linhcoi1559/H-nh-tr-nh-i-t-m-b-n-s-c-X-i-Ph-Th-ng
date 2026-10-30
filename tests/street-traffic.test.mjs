import test from 'node:test';import assert from 'node:assert/strict';
import {forwardClearance,trafficStep,trafficBodiesOverlap}from'../street-traffic.mjs';
test('traffic only yields to obstacles ahead in its lane',()=>{
 assert.equal(forwardClearance(0,0,1,0,[{x:-2,z:0},{x:3,z:4}]),Infinity);
 assert.equal(forwardClearance(0,0,1,0,[{x:5,z:.2,radius:.5}]),3.5);
 assert.equal(forwardClearance(0,0,0,-1,[{x:.2,z:-5,radius:.5}]),3.5);
});
test('traffic stops fully before a pedestrian, waits and accelerates gently after release',()=>{
 for(const hz of [30,60,120]){
  let x=0,speed=7;
  for(let i=0;i<hz*8;i++){const step=trafficStep(speed,7,12-x,1/hz);x+=step.distance;speed=step.speed;}
  assert.ok(x<=11.3);assert.equal(speed,0);
  const released=trafficStep(speed,7,Infinity,1/hz);assert.ok(released.speed>0&&released.speed<.1);
 }
});
test('suddenly appearing obstacles cannot be crossed in a long frame',()=>{
 const step=trafficStep(12,12,.9,1);assert.ok(step.distance<=.200001);assert.ok(step.braking);
 assert.equal(trafficStep(5,7,0,.05).distance,0);
});

test('rotated vehicle bodies cannot cross at junctions; parallel lanes remain clear',()=>{
 const car={x:0,z:0,yaw:0,kind:'car'};
 assert.equal(trafficBodiesOverlap(car,{...car,x:1,yaw:Math.PI/2}),true);
 assert.equal(trafficBodiesOverlap(car,{...car,z:4.4}),false);
 assert.equal(trafficBodiesOverlap(car,{...car,x:4.1}),true);
 assert.equal(trafficBodiesOverlap(car,{...car,x:4.6}),false);
 assert.equal(trafficBodiesOverlap(car,{x:0,z:1.2,yaw:Math.PI/2,kind:'bike'}),true);
});

test('long buses in the opposite lane do not block forward travel, but their rear stops followers',()=>{
 const opposing={x:10,z:4.6,radius:3.6,lateralRadius:1.18};
 assert.equal(forwardClearance(0,0,1,0,[opposing],1.18,3.6),Infinity);
 assert.ok(Math.abs(forwardClearance(0,0,1,0,[{...opposing,z:0}],1.18,3.6)-2.8)<1e-8);
});
