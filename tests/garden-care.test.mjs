import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeDaylife,acceptDayJob,availableGoals,completeDayGoal,finishDayJob} from '../daylife-state.mjs';
import {encodeSnapshot,parseSnapshot} from '../gameplay-state.mjs';
test('garden work requires both locations, survives saving and pays only once',()=>{
 let s=acceptDayJob(normalizeDaylife({},3),'garden-care',3);
 assert.equal(availableGoals(s,3).length,2);assert.equal(finishDayJob(s,3,'income').reward,null);
 s=completeDayGoal(s,'dry-bed',3);s=parseSnapshot(encodeSnapshot({day:3,daylife:s})).daylife;
 assert.deepEqual(availableGoals(s,3).map(g=>g.id),['wet-bed']);
 s=completeDayGoal(s,'wet-bed',3);const result=finishDayJob(s,3,'income');assert.equal(result.reward.coins,18000);
 assert.equal(finishDayJob(result.state,3,'income').reward,null);
});
