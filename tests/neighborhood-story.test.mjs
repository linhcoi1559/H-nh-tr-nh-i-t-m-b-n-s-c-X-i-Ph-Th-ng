import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeNeighborhoodStory,recordNeighborhoodHelp,neighborhoodChapter,chooseNeighborhoodEnding} from '../neighborhood-story.mjs';
import {normalizeDaylife,acceptDayJob,availableGoals,completeDayGoal,finishDayJob} from '../daylife-state.mjs';
import {encodeSnapshot,parseSnapshot} from '../gameplay-state.mjs';

test('neighborhood chapter advances through distinct completed jobs, persists across days, and finishes only once',()=>{
 let state=normalizeDaylife({},1);
 assert.equal(neighborhoodChapter(state.story).stage,'introduction');
 const finish=(id,day)=>{
   state=acceptDayJob(state,id,day);
   while(availableGoals(state,day).length)state=completeDayGoal(state,availableGoals(state,day)[0].id,day,100);
   state=finishDayJob(state,day,'income').state;
 };
 finish('cleanup',1);assert.equal(neighborhoodChapter(state.story).stage,'connections');
 state=normalizeDaylife(state,2);finish('cleanup',2);assert.equal(state.story.helped.length,1);
 finish('album',2);finish('courier',2);assert.equal(neighborhoodChapter(state.story).stage,'decision');
 const coinsBefore=state.points;
 state=chooseNeighborhoodEnding(state,'heritage');assert.equal(state.projects.heritage,1);assert.equal(state.points,coinsBefore);
 assert.equal(neighborhoodChapter(state.story).stage,'finished');
 assert.equal(chooseNeighborhoodEnding(state,'green'),state);
 state=normalizeDaylife(state,3);assert.equal(state.story.ending,'heritage');assert.equal(state.projects.heritage,1);
});

test('unfinished jobs and duplicate claims cannot advance chapter; invalid saves normalize and capped projects remain valid',()=>{
 let state=normalizeDaylife({},1);state=acceptDayJob(state,'delivery',1);
 assert.equal(finishDayJob(state,1,'income').reward,null);assert.equal(state.story.helped.length,0);
 assert.equal(chooseNeighborhoodEnding(state,'green'),state);
 assert.deepEqual(normalizeNeighborhoodStory({helped:['cleanup','cleanup','fake'],ending:'fake'}),{helped:['cleanup'],ending:null});
 assert.deepEqual(recordNeighborhoodHelp({helped:['album']},'album').helped,['album']);
 const full={...state,story:{helped:['cleanup','album','courier'],ending:null},projects:{green:3,heritage:0}};
 assert.equal(chooseNeighborhoodEnding(full,'green').projects.green,3);
});

test('chapter survives real game snapshot encoding and loading',()=>{
 const daylife=normalizeDaylife({day:1,story:{helped:['cleanup','album','courier'],ending:'green'}},1);
 const snapshot=parseSnapshot(encodeSnapshot({day:1,daylife}));
 assert.deepEqual(normalizeDaylife(snapshot.daylife,1).story,daylife.story);
});
