import test from 'node:test';import assert from 'node:assert/strict';
import {gridlockPair,safeRecoveryStep} from '../traffic-recovery.mjs';
const vehicle=(id,x,kind='car')=>({id,kind,blockedFor:7,mesh:{position:{x,z:0}}});
test('gridlock selects stable priority after a sustained stop and excludes buses dwelling at stops',()=>{
 const a=vehicle(0,0),b=vehicle(1,5,'bus');assert.equal(gridlockPair([a,b]).yielding,a);
 b.dwell=4;assert.equal(gridlockPair([a,b]),null);b.dwell=0;a.blockedFor=2;assert.equal(gridlockPair([a,b]),null);
});
test('recovery cannot hit a pedestrian or another car; existing overlap may only separate',()=>{
 const a={x:0,z:0,yaw:0,kind:'car'},b={x:3,z:0,yaw:0,kind:'car'};
 assert.equal(safeRecoveryStep(a,{...a,x:-.1},[b],[]),true);
 assert.equal(safeRecoveryStep(a,{...a,x:.1},[b],[]),false);
 assert.equal(safeRecoveryStep(a,{...a,x:-.1},[],[{x:-2,z:0}]),false);
 assert.equal(safeRecoveryStep(a,{...a,x:-.1},[{...b,x:-4}],[]),false);
});
test('a car reverses out of a blocked pair over real substeps without going through another body',()=>{
 let car={x:0,z:0,yaw:0,kind:'car'};const bus={x:4.8,z:0,yaw:0,kind:'bus'};
 for(let i=0;i<240;i++){const next={...car,x:car.x-1.3/60};assert.ok(safeRecoveryStep(car,next,[bus],[]));car=next;}
 assert.ok(car.x< -5);assert.equal(safeRecoveryStep(car,{...car,x:car.x-.1},[bus],[{x:car.x-2,z:0}]),false);
});
