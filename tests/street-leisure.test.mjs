import test from 'node:test';
import assert from 'node:assert/strict';
import {createLeisureGame,playLeisureGame} from '../street-leisure-state.mjs';
import {NEIGHBORHOOD_JOBS} from '../neighborhood-jobs.mjs';
import {acceptDayJob,availableGoals,completeDayGoal,finishDayJob} from '../daylife-state.mjs';
import {encodeSnapshot,parseSnapshot} from '../gameplay-state.mjs';

test('recipes require the exact requested ingredients; wrong items can be undone',()=>{
 for(const kind of ['tea','flowers']){
  let s=createLeisureGame(kind,2);s=playLeisureGame(s,'serve');assert.equal(s.done,false);
  s=playLeisureGame(s,'bad');assert.equal(s.items.length,0);
  for(const item of [...s.recipe,kind==='tea'?'Đường':'Hoa ly'])s=playLeisureGame(s,item);
  assert.equal(playLeisureGame(s,'serve').done,false);
  s=playLeisureGame(s,'undo');assert.equal(playLeisureGame(s,'serve').done,true);
 }
});
test('bike pressure must be in range; fishing needs three well timed strikes and mistakes do not award completion',()=>{
 let s=createLeisureGame('pump',1);assert.equal(playLeisureGame(s,'serve').done,false);
 for(let i=0;i<8;i++)s=playLeisureGame(s,'pump');assert.equal(s.pressure,36);
 assert.equal(playLeisureGame(s,'serve').done,false);
 s=playLeisureGame(s,'release');s=playLeisureGame(s,'release');assert.equal(playLeisureGame(s,'serve').done,true);
 let f=createLeisureGame('fishing',1);f=playLeisureGame(f,'strike',.05);assert.equal(f.catches,0);
 f=playLeisureGame(f,'strike',.5);f=playLeisureGame(f,'strike',.5);assert.equal(f.catches,1);
 for(let i=1;i<3;i++)f=playLeisureGame(f,'strike',i+.5);
 assert.equal(f.done,true);assert.equal(playLeisureGame(f,'strike',.5).catches,3);
});
test('five leisure routes save progress, enforce order and pay once; new day resets availability',()=>{
 for(const id of ['tea-service','flower-arranging','bicycle-help','river-fishing','lost-property']){
  const job=NEIGHBORHOOD_JOBS.find(j=>j.id===id);assert.ok(job,id);
  let s=acceptDayJob({},id,2);assert.equal(finishDayJob(s,2,'income').reward,null);
  for(const g of job.goals){assert.equal(availableGoals(s,2)[0].id,g.id);s=completeDayGoal(s,g.id,2);s=parseSnapshot(encodeSnapshot({day:2,daylife:s})).daylife;}
  const end=finishDayJob(s,2,'income');assert.equal(end.reward.coins,job.base);assert.equal(finishDayJob(end.state,2,'income').reward,null);
  assert.equal(acceptDayJob(end.state,id,3).active.id,id);
 }
});
