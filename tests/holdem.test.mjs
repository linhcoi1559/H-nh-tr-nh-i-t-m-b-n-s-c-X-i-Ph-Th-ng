import test from 'node:test';
import assert from 'node:assert/strict';
import {bestHoldem,compareHands,startTexas,texasAction,texasOptions,advanceTexas,distributePots,texasBotAction,normalizeTexas} from '../holdem.mjs';
import {startHoldem,holdemAction,shuffledDeck,normalizeArcade} from '../arcade-state.mjs';
import {encodeSnapshot,parseSnapshot} from '../gameplay-state.mjs';
const c=(r,s=0)=>r-2+s*13;
const deck=prefix=>[...prefix,...Array.from({length:52},(_,i)=>i).filter(c=>!prefix.includes(c))];
test('seven-card evaluator uses the best five, board ties, wheel straights and kickers',()=>{
  assert.equal(bestHoldem([8,9,10,11,12,3,17]).score[0],8);
  assert.equal(bestHoldem([c(14),c(2,1),c(3,2),c(4,3),c(5),c(9,1),c(10)]).score[1],5);
  const full=bestHoldem([c(9),c(9,1),c(9,2),c(8),c(8,1),c(8,2),c(14)]);assert.deepEqual(full.score,[6,9,8]);
  const board=[c(10),c(11),c(12),c(13),c(14)];assert.equal(compareHands(bestHoldem([...board,1,20]).score,bestHoldem([...board,2,30]).score),0);
  assert.equal(compareHands([1,14,13,10,9],[1,14,12,11,10]),1);
});
test('dealer, blinds and betting order; big blind retains its option; flop opens after dealer',()=>{
  let p=startTexas(100,shuffledDeck(),0);assert.equal(p.actor,3);assert.deepEqual(p.players.map(s=>s.total),[0,5,10,0]);
  for(const actor of [3,0,1,2]){assert.equal(p.actor,actor);p=texasAction(p,'call');}
  assert.equal(p.actor,-1);p=advanceTexas(p);assert.equal(p.actor,1);assert.equal(p.street,1);assert.equal(p.board.length,3);
  assert.deepEqual(p.players.map(s=>s.committed),[0,0,0,0]);
});
test('minimum raises, no acting out of turn, short all-in does not reopen a previous full raise',()=>{
  let p=startTexas(100,shuffledDeck(),0);
  assert.deepEqual(texasAction(p,'raise',15),p);p=texasAction(p,'raise',30);assert.equal(p.minRaise,20);
  p=texasAction(p,'call');p=texasAction(p,'call');
  // Big blind has 35 total: a 5-chip short raise over 30.
  p.players[2].stack=25;p.players[2].initial=35;
  p=texasAction(p,'raise',35);assert.equal(p.actor,3);assert.equal(texasOptions(p).canRaise,false);assert.equal(texasOptions(p).call,5);
  assert.deepEqual(texasAction(p,'raise',60),p);
  let s=startHoldem(undefined,100);if(s.pending.actor!==0)assert.deepEqual(holdemAction(s,'call'),s);
});
test('side pots, unmatched excess refunds, ties and odd chips conserve every chip',()=>{
  const board=[c(2),c(3,1),c(4,2),c(8,3),c(9)];
  const players=[{hole:[c(14),c(5)],total:30,folded:false},{hole:[c(13),c(13,1)],total:80,folded:false},{hole:[c(12),c(12,1)],total:100,folded:false},{hole:[c(6),c(7)],total:20,folded:true}];
  const result=distributePots(players,board,0);assert.deepEqual(result.awards,[110,100,20,0]);assert.equal(result.awards.reduce((a,b)=>a+b),230);
  const royal=[8,9,10,11,12];const tie=distributePots([{hole:[13,14],total:5,folded:false},{hole:[15,16],total:5,folded:false},{hole:[17,18],total:5,folded:true}],royal,0);assert.deepEqual(tie.awards,[7,8,0]);
});
test('AI decision depends on own hole cards and public board, not opponent holes or future deck',()=>{
  const p=startTexas(100,shuffledDeck(),0),other=structuredClone(p);
  other.players[0].hole=[50,51];other.players[1].hole=[20,21];other.deck.reverse();
  // The choice is reflected in the acting seat's note. Mutated hidden data is canonicalized later.
  assert.equal(texasBotAction(p,()=>.4).players[3].note,texasBotAction(other,()=>.4).players[3].note);
});
test('all-in runs out the board one street at a time and settles once through save/reload',()=>{
  let s=startHoldem(undefined,50,deck([c(14),c(13),c(12),c(11),c(14,1),c(13,1),c(12,1),c(11,1)])),steps=0,streets=new Set([0]);
  while(s.pending&&steps++<150){const p=s.pending;if(p.actor===0){const o=texasOptions(p);s=holdemAction(s,o.canRaise?'raise':'call',o.max,()=>.9);}else s=holdemAction(s,'tick',undefined,()=>.9);if(s.pending)streets.add(s.pending.street);s=parseSnapshot(encodeSnapshot({arcade:s})).arcade;}
  assert.ok(steps<150);assert.deepEqual([...streets],[0,1,2,3]);assert.equal(s.rounds,1);assert.ok(s.last.table.board.length===5);assert.deepEqual(holdemAction(s,'tick'),s);
  assert.equal(s.tokens,300-50+s.last.payout);
});
test('hundreds of complete hands preserve stack accounting, card uniqueness and one settlement',()=>{
  let seed=31597;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let game=0;game<240;game++){
    let s=startHoldem({tokens:1000,rounds:game},100,shuffledDeck(random)),steps=0;
    while(s.pending&&steps++<300){
      const p=s.pending;assert.equal(new Set([...p.players.flatMap(x=>x.hole),...p.board]).size,8+p.board.length);
      assert.equal(p.players.reduce((n,x)=>n+x.stack+x.total,0),490);
      if(p.actor===0){const o=texasOptions(p),r=random();s=holdemAction(s,r<.06?'fold':r<.3&&o.canRaise?'raise':'call',r<.1?o.max:Math.min(o.max,o.min),random);}else s=holdemAction(s,'tick',undefined,random);
      s=normalizeArcade(JSON.parse(JSON.stringify(s)));
    }
    assert.ok(steps<300,`hand ${game} stalled`);assert.equal(s.rounds,game+1);assert.equal(s.last.awards.reduce((a,b)=>a+b,0),s.last.table.players.reduce((n,x)=>n+x.total,0));
  }
});
test('invalid decks and broken stack accounting are rejected and cannot debit the wallet',()=>{
  assert.equal(startTexas(100,Array(52).fill(0)),null);assert.equal(startHoldem({tokens:40},50).tokens,40);
  const p=startTexas(100,deck([]));p.players[0].stack=-1;assert.equal(normalizeTexas(p),null);
});
