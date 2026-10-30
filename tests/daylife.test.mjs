import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDaylife,acceptDayJob,availableGoals,completeDayGoal,finishDayJob,buildDayProject,dayOffers,matchesDayPhoto} from '../daylife-state.mjs';
import {encodeSnapshot,parseSnapshot} from '../gameplay-state.mjs';

test('district courier unlocks receipts after pickup, accepts any order, requires return and preserves progress across reload',()=>{
 let s=acceptDayJob({},'courier',2);
 assert.deepEqual(availableGoals(s,2).map(g=>g.id),['pickup']);
 s=completeDayGoal(s,'parcel0',2);assert.deepEqual(s.active.done,[]);
 s=completeDayGoal(s,'pickup',2);s=completeDayGoal(s,'parcel2',2);
 s=parseSnapshot(encodeSnapshot({day:2,daylife:s})).daylife;
 assert.equal(s.active.id,'courier');assert.ok(s.active.done.includes('parcel2'));
 assert.deepEqual(availableGoals(s,2).map(g=>g.id),['parcel0','parcel1']);
 s=completeDayGoal(s,'return',2);assert.ok(!s.active.done.includes('return'));
 s=completeDayGoal(s,'parcel1',2);s=completeDayGoal(s,'parcel0',2);
 assert.deepEqual(availableGoals(s,2).map(g=>g.id),['return']);
 s.active.remaining=0;s=completeDayGoal(s,'return',2);
 const result=finishDayJob(s,2,'income');assert.equal(result.reward.coins,48000);
 assert.ok(result.state.completed.includes('courier'));assert.equal(finishDayJob(result.state,2,'income').reward,null);
});

test('delivery requires packing, allows either stop first, and pays only once',()=>{
  let s=acceptDayJob({},'delivery',1);
  assert.deepEqual(availableGoals(s,1).map(g=>g.id),['pack']);
  assert.equal(finishDayJob(s,1,'income').reward,null);
  s=completeDayGoal(s,'drop0',1);assert.deepEqual(s.active.done,[]);
  s=completeDayGoal(s,'pack',1,80);s=completeDayGoal(s,'drop1',1);s=completeDayGoal(s,'drop0',1);
  const r=finishDayJob(s,1,'fund');assert.equal(r.reward.points,2);assert.equal(r.state.total,1);
  assert.equal(finishDayJob(r.state,1,'fund').reward,null);
  assert.equal(acceptDayJob(r.state,'delivery',1).active,null);
});

test('late delivery keeps base pay and loses only the hot-food bonus',()=>{
  let s=acceptDayJob({},'delivery',1);
  for(const g of ['pack','drop0','drop1'])s=completeDayGoal(s,g,1,100);
  const warm=finishDayJob(s,1,'income').reward;
  s.active.remaining=0;
  const late=finishDayJob(s,1,'income').reward;
  assert.equal(late.coins,26000);assert.equal(warm.coins-late.coins,12000);
});

test('cleanup and photo editing unlock only after collecting every prerequisite',()=>{
  for(const [job,last] of [['cleanup','sort'],['album','album']]){
    let s=acceptDayJob({},job,2);
    s=completeDayGoal(s,last,2);assert.deepEqual(s.active.done,[]);
    const goals=availableGoals(s,2);for(const g of goals)s=completeDayGoal(s,g.id,2);
    assert.deepEqual(availableGoals(s,2).map(g=>g.id),[last]);
    s=completeDayGoal(s,last,2);assert.ok(finishDayJob(s,2,'income').reward);
  }
});

test('day rollover rotates routes, clears daily work, preserves built projects and earned points',()=>{
  const input={day:1,completed:['cleanup'],points:4,total:9,projects:{green:2,heritage:1},active:{id:'delivery',done:['pack'],quality:70,remaining:45}};
  const s=normalizeDaylife(input,2);
  assert.equal(s.active,null);assert.deepEqual(s.completed,[]);assert.equal(s.points,4);assert.equal(s.total,9);
  assert.deepEqual(s.projects,{green:2,heritage:1});
  assert.notEqual(dayOffers(1)[0].goals[1].x,dayOffers(2)[0].goals[1].x);
});

test('projects require real points, have increasing costs and cap at three levels',()=>{
  let s=normalizeDaylife({points:1},1);
  assert.equal(buildDayProject(s,1,'green').projects.green,0);
  s=normalizeDaylife({points:20},1);
  for(let i=0;i<5;i++)s=buildDayProject(s,1,'green');
  assert.equal(s.projects.green,3);assert.equal(s.points,11);
  assert.deepEqual(buildDayProject(s,1,'bad'),s);
});

test('save/reload retains exact active progress, timer, quality and builds; malformed old saves migrate',()=>{
  const input={day:3,daylife:{day:3,completed:['album','album','bad'],points:3,total:7,gallery:['invalid','data:image/jpeg;base64,/9j/2Q=='],projects:{green:1},active:{id:'delivery',done:['pack','bad'],remaining:42.5,quality:67}}};
  const saved=parseSnapshot(encodeSnapshot(input));
  assert.equal(saved.daylife.active.remaining,42.5);assert.equal(saved.daylife.active.quality,67);
  assert.deepEqual(saved.daylife.active.done,['pack']);assert.deepEqual(saved.daylife.completed,['album']);
  assert.equal(saved.daylife.projects.green,1);
  assert.deepEqual(saved.daylife.gallery,['data:image/jpeg;base64,/9j/2Q==']);
  assert.equal(normalizeDaylife(null,1).active,null);
  assert.equal(parseSnapshot(encodeSnapshot({daylife:null})).daylife.points,0);
});

test('work photos require a nearby player facing the scene on foot',()=>{
  const goal=dayOffers(1)[2].goals[0];
  const p={x:goal.x,z:goal.z,yaw:Math.atan2(goal.lookX-goal.x,goal.lookZ-goal.z),riding:false};
  assert.equal(matchesDayPhoto(p,goal),true);
  assert.equal(matchesDayPhoto({...p,yaw:p.yaw+Math.PI},goal),false);
  assert.equal(matchesDayPhoto({...p,x:p.x+20},goal),false);
  assert.equal(matchesDayPhoto({...p,riding:true},goal),false);
});
