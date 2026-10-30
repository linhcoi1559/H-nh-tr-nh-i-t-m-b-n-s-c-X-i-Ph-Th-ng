import test from 'node:test';import assert from 'node:assert/strict';
import {createEnforcement,drivingViolation,stepEnforcement,settleTicket} from '../police-state.mjs';
const fast={riding:true,speed:16,roadDistance:0,roadWidth:11,witness:true,officer:0};
function tick(s,c,seconds){for(let i=0;i<Math.ceil(seconds*60);i++)stepEnforcement(s,c,1/60);}
test('officers need sustained visible riding violations and never fine foot traffic or unseen drivers',()=>{
 assert.equal(drivingViolation({...fast,riding:false}),null);assert.equal(drivingViolation({...fast,speed:10}),null);
 assert.equal(drivingViolation({...fast,speed:4,roadDistance:8}).id,'pavement');
 const s=createEnforcement();tick(s,{...fast,witness:false},15);assert.equal(s.stage,'patrol');tick(s,fast,1);assert.equal(s.stage,'patrol');tick(s,fast,1.1);assert.equal(s.stage,'warning');
});
test('stopping after the warning cancels the penalty; refusing creates only one ticket',()=>{
 const s=createEnforcement();tick(s,fast,2.2);tick(s,{...fast,speed:0},1.6);assert.equal(s.stage,'patrol');assert.ok(s.cooldown>0);
 const t=createEnforcement();tick(t,fast,10);assert.equal(t.stage,'ticket');tick(t,fast,120);assert.equal(t.stage,'ticket');
 assert.deepEqual(settleTicket(t,2000),{paid:2000,label:'Vượt tốc độ khu dân cư (40 km/h)'});assert.equal(settleTicket(t,2000),null);assert.equal(t.cooldown,60);
});
test('warning timing is stable across frame rates',()=>{for(const hz of [20,60,144]){const s=createEnforcement();for(let i=0;i<hz*10;i++)stepEnforcement(s,fast,1/hz);assert.equal(s.stage,'ticket');}});
