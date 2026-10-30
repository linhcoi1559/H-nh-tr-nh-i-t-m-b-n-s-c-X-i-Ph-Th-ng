import test from 'node:test';
import assert from 'node:assert/strict';
import {describeHand,holdemGuide,raisePresets,texasDelay,normalizePresentation} from '../holdem-coach.mjs';
import {startTexas,bestHoldem,texasOptions,texasBotAction} from '../holdem.mjs';
import {shuffledDeck,startHoldem,holdemAction} from '../arcade-state.mjs';
import {encodeSnapshot,parseSnapshot} from '../gameplay-state.mjs';
const c=(r,s=0)=>r-2+s*13;
test('draw help counts nine flush outs or eight open-ended straight outs from public information only',()=>{
  const flush=holdemGuide([c(14,2),c(13,2)],[c(12,2),c(7,2),c(2)],30);
  assert.equal(flush.outs.length,9);assert.equal(flush.nextChance,19);
  const straight=holdemGuide([c(11,2),c(10,2)],[c(9),c(8,1),c(2,3)],30);
  assert.equal(straight.outs.length,8);assert.equal(straight.nextChance,17);
  assert.equal(holdemGuide([c(11),c(4,2)],[c(2),c(9,2),c(6,3),c(14,3),c(9)],100).outs.length,0);
});
test('coach explains board-only hands and distinguishes pairs, two pairs, full houses and kickers',()=>{
  const board=[c(2),c(9,2),c(6,3),c(14,3),c(9)];
  assert.match(describeHand(bestHoldem([c(11),c(4,2),...board])),/Đôi 9 · lá phụ A, J, 6/);
  assert.match(describeHand(bestHoldem([c(10,1),c(10,2),...board])),/Hai đôi 10 và 9 · lá phụ A/);
  const royal=[8,9,10,11,12];assert.match(holdemGuide([15,30],royal,100).detail,/nằm trên bàn/);
  assert.equal(holdemGuide([15,30],royal,100,20,80).required,25);
});
test('every preset is a legal full raise or all-in and cannot exceed the remaining stack',()=>{
  const p=startTexas(50,shuffledDeck());p.actor=0;const o=texasOptions(p);
  for(const preset of raisePresets(p)){assert.ok(preset.value<=o.max);assert.ok(preset.value>=o.min||preset.value===o.max);}
});
test('calm is default, pause and step disable automatic progress, hero never has a timer',()=>{
  const p=startTexas(100,shuffledDeck());assert.equal(texasDelay(p),2600);
  assert.equal(texasDelay({...p,actor:-1}),3400);assert.equal(texasDelay(p,{pace:'standard'}),1500);
  assert.equal(texasDelay(p,{pace:'step'}),null);assert.equal(texasDelay(p,{paused:true}),null);assert.equal(texasDelay({...p,actor:0}),null);
  assert.deepEqual(normalizePresentation({pace:'evil',coach:0,paused:1}),{pace:'calm',coach:true,paused:false});
});
test('pacing survives save reload without changing the deck, stacks or wallet',()=>{
  const s=startHoldem(undefined,100);s.presentation={pace:'step',paused:true,coach:false};
  const loaded=parseSnapshot(encodeSnapshot({arcade:s})).arcade;
  assert.deepEqual(loaded,s);assert.equal(texasDelay(loaded.pending,loaded.presentation),null);
});
test('opponent fold decisions remain stable across random seeds in the same visible situation',()=>{
  const p=startTexas(100,shuffledDeck());p.currentBet=90;p.players[0].committed=90;p.players[0].total=90;p.players[0].stack=10;
  const a=texasBotAction(p,()=>.01),b=texasBotAction(p,()=>.99);
  assert.equal(a.players[3].folded,b.players[3].folded);
});
test('settlement names the winning hand rather than attributing the human hand to the winner',()=>{
  let s=startHoldem(undefined,100),steps=0;
  while(s.pending&&steps++<150){const p=s.pending;s=holdemAction(s,p.actor===0?'call':'tick',undefined,()=>.99);}
  assert.ok(steps<150);assert.equal(s.rounds,1);assert.ok(!s.last.message.includes('nhận pot ·'));
});
