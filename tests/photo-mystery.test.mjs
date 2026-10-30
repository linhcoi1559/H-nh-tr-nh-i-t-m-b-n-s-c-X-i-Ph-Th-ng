import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePhotoMystery,startPhotoMystery,mysteryTargets,collectMysteryClue,deduceMystery,recordMysteryConsent,finishPhotoMystery,mysteryHint,MYSTERY_ENDINGS} from '../photo-mystery-state.mjs';
import {normalizeDaylife,acceptDayJob} from '../daylife-state.mjs';
import {encodeSnapshot,parseSnapshot} from '../gameplay-state.mjs';

test('photo investigation supports either witness order, evidence gating, correctable deduction, consent and three equal endings',()=>{
 for(const order of [['tailor','water'],['water','tailor']])for(const ending of Object.keys(MYSTERY_ENDINGS)){
  let s=startPhotoMystery({});assert.deepEqual(mysteryTargets(s).map(t=>t.id),['archive']);
  assert.equal(collectMysteryClue(s,'tailor').clues.length,0);
  s=collectMysteryClue(s,'back');assert.deepEqual(mysteryTargets(s).map(t=>t.id),['tailor','water']);
  assert.equal(deduceMystery(s,'mai').ok,false);
  for(const clue of order)s=collectMysteryClue(s,clue);
  assert.equal(s.clues.length,3);assert.equal(mysteryTargets(s).length,0);
  const wrong=deduceMystery(s,'school');assert.equal(wrong.ok,false);assert.deepEqual(wrong.state,s);assert.match(wrong.feedback,/tạp dề/);
  s=deduceMystery(s,'mai').state;assert.deepEqual(mysteryTargets(s).map(t=>t.id),['consent']);
  assert.equal(finishPhotoMystery(s,ending).reward,null);
  s=recordMysteryConsent(s);assert.deepEqual(mysteryTargets(s).map(t=>t.id),['finish']);
  const result=finishPhotoMystery(s,ending);assert.deepEqual(result.reward,{coins:0,xp:150,points:2});
  assert.equal(result.state.ending,ending);assert.equal(mysteryTargets(result.state).length,0);
  assert.equal(finishPhotoMystery(result.state,'family').reward,null);assert.equal(startPhotoMystery(result.state).ending,ending);
 }
});

test('investigation survives every step through real snapshots and day changes, independent of daily chores',()=>{
 let s=startPhotoMystery({});
 const reload=()=>{const daylife=normalizeDaylife({day:1,mystery:s},2);s=parseSnapshot(encodeSnapshot({day:2,daylife})).daylife.mystery;};
 reload();assert.equal(s.started,true);
 for(const clue of ['back','water','tailor']){s=collectMysteryClue(s,clue);reload();assert.ok(s.clues.includes(clue));}
 s=deduceMystery(s,'mai').state;reload();assert.equal(s.deduced,true);
 s=recordMysteryConsent(s);reload();assert.equal(s.consent,true);
 s=finishPhotoMystery(s,'anonymous').state;reload();assert.equal(s.ending,'anonymous');
 assert.equal(acceptDayJob({day:2,mystery:startPhotoMystery({})},'delivery',2).active,null);
  const suspended={...startPhotoMystery({}),suspended:true};assert.equal(mysteryTargets(suspended).length,0);
  assert.equal(acceptDayJob({day:2,mystery:suspended},'delivery',2).active.id,'delivery');
 assert.equal(acceptDayJob({day:2,mystery:s},'delivery',2).active.id,'delivery');
});

test('malformed saves cannot skip evidence/consent or inject clue keys; duplicate clues are ignored',()=>{
 assert.deepEqual(normalizePhotoMystery({started:false,clues:['back'],deduced:true,consent:true,ending:'named'}),normalizePhotoMystery());
 const s=normalizePhotoMystery({started:true,clues:['back','back','constructor','bad'],deduced:true,consent:true,ending:'named'});
 assert.deepEqual(s.clues,['back']);assert.equal(s.deduced,false);assert.equal(s.ending,null);
 assert.equal(collectMysteryClue(s,'back').clues.length,1);assert.equal(collectMysteryClue(s,'constructor').clues.length,1);
 assert.match(mysteryHint(startPhotoMystery({})),/bác Sơn/);
});
