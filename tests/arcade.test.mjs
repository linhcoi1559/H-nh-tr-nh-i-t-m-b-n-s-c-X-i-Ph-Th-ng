import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeArcade,claimArcadeTokens,shuffledDeck,handValue,pokerResult,startArcadeRound,blackjackAction,togglePokerHold,drawPoker,finishWheel,WHEEL_PRIZES,ARCADE_SHOP,ARCADE_APPROACH_WALLS} from '../arcade-state.mjs';
import {encodeSnapshot,parseSnapshot} from '../gameplay-state.mjs';
import {SOUTH_STREET_INFILL} from '../world-closure.mjs';
import {cameraObstructionFraction} from '../collision-grid.mjs';
const deckWith=(prefix)=>[...prefix,...Array.from({length:52},(_,i)=>i).filter(c=>!prefix.includes(c))];
const card=(rank,suit=0)=>(rank-2)+suit*13;

test('shuffle produces a full, unique deck; ace totals handle soft hands and naturals',()=>{
  const d=shuffledDeck(()=>.3);assert.equal(new Set(d).size,52);assert.equal(d.length,52);
  assert.deepEqual(handValue([12,25,8]),{total:12,soft:false,natural:false});
  assert.deepEqual(handValue([12,4]),{total:17,soft:true,natural:false});
  assert.equal(handValue([12,11]).natural,true);
});
test('poker distinguishes all paytable hands, wheel straight, low pairs and near misses',()=>{
  const hand=(r,s)=>r.map((v,i)=>card(v,s[i]));
  const cases=[[[10,11,12,13,14],[0,0,0,0,0],250],[[5,6,7,8,9],[1,1,1,1,1],50],[[9,9,9,9,3],[0,1,2,3,0],25],[[9,9,9,3,3],[0,1,2,0,1],9],[[2,5,7,10,13],[1,1,1,1,1],6],[[14,2,3,4,5],[0,1,2,3,0],4],[[8,8,8,3,4],[0,1,2,0,1],3],[[8,8,3,3,4],[0,1,0,1,2],2],[[11,11,3,4,5],[0,1,0,1,2],1],[[10,10,3,4,5],[0,1,0,1,2],0],[[14,2,3,4,6],[0,1,2,3,0],0]];
  for(const [r,s,p]of cases)assert.equal(pokerResult(hand(r,s)).multiplier,p,r.join(','));
});
test('blackjack settles naturals at 3:2, push at equal naturals, and never pays twice',()=>{
  const d=deckWith([12,7,11,8]);const s=startArcadeRound(undefined,'blackjack',20,d);
  assert.equal(s.tokens,330);assert.equal(s.pending,null);assert.equal(s.last.payout,50);
  assert.equal(blackjackAction(s,'stand').tokens,330);
  const push=startArcadeRound(undefined,'blackjack',10,deckWith([12,25,11,24]));assert.equal(push.tokens,300);
});
test('blackjack dealer stands on soft 17 and double draws only one card',()=>{
  let s=startArcadeRound(undefined,'blackjack',10,deckWith([8,12,7,4]));
  s=blackjackAction(s,'stand');assert.equal(s.tokens,310);assert.equal(s.last.dealer.length,2);
  s=startArcadeRound(undefined,'blackjack',50,deckWith([3,7,4,8,21,9]));
  s=blackjackAction(s,'double');assert.equal(s.pending,null);assert.equal(s.last.player.length,3);assert.equal(s.last.bet,100);
  const poor=startArcadeRound({tokens:10},'blackjack',10,deckWith([3,7,4,8]));assert.deepEqual(blackjackAction(poor,'double'),poor);
});
test('hit can bust; a pending hand blocks new bets and survives save/reload without a fresh deal',()=>{
  let s=startArcadeRound(undefined,'blackjack',10,deckWith([8,7,9,5,11]));
  assert.deepEqual(startArcadeRound(s,'poker',50),s);
  const saved=parseSnapshot(encodeSnapshot({coins:12345,arcade:s}));assert.equal(saved.coins,12345);assert.deepEqual(saved.arcade.pending,s.pending);
  s=blackjackAction(saved.arcade,'hit');assert.equal(s.last.payout,0);assert.equal(s.tokens,290);assert.equal(s.rounds,1);
});
test('draw poker keeps chosen cards, draws once from undealt deck and settles exactly once',()=>{
  let s=startArcadeRound(undefined,'poker',10,deckWith([9,22,1,3,5]));
  s=togglePokerHold(s,0);s=togglePokerHold(s,1);assert.equal(s.pending.held[0],true);
  const saved=parseSnapshot(encodeSnapshot({arcade:s}));s=drawPoker(saved.arcade);
  assert.equal(s.last.player[0],9);assert.equal(s.last.player[1],22);assert.equal(new Set(s.last.player).size,5);
  assert.deepEqual(drawPoker(s),s);assert.equal(s.rounds,1);
});
test('wheel reserves one fee, persists outcome through close/reload and credits the correct segment once',()=>{
  for(let i=0;i<16;i++){
    let s=startArcadeRound(undefined,'wheel',10,shuffledDeck(),()=> (i+.2)/16);
    assert.equal(s.tokens,290);assert.equal(s.pending.index,i);
    s=parseSnapshot(encodeSnapshot({arcade:s})).arcade;
    s=finishWheel(s);assert.equal(s.tokens,290+WHEEL_PRIZES[i]);assert.equal(s.last.index,i);assert.deepEqual(finishWheel(s),s);
  }
});
test('tokens never debit household money, daily gift cannot repeat, invalid decks and stakes rejected',()=>{
  assert.equal(normalizeArcade(undefined,4).tokens,300);
  const s=claimArcadeTokens(normalizeArcade(undefined,4),5);assert.equal(s.tokens,400);assert.deepEqual(claimArcadeTokens(s,5),s);
  assert.equal(startArcadeRound({tokens:0},'poker',10).pending,null);
  assert.equal(startArcadeRound(undefined,'poker',100).pending,null);
  assert.equal(startArcadeRound(undefined,'poker',10,Array(52).fill(0)).pending,null);
  assert.equal(normalizeArcade({pending:{game:'wheel',bet:10,index:99}}).pending,null);
  assert.ok(SOUTH_STREET_INFILL.some(([x])=>Math.abs(x-ARCADE_SHOP.x)<.01),'shop replaces a reserved frontage, not the road');
});

test('the existing street wall leaves the entire storefront entrance unobstructed',()=>{
  const walls=ARCADE_APPROACH_WALLS.map(([left,right])=>({minX:left,maxX:right,minZ:11.375,maxZ:12.225}));
  const x=ARCADE_SHOP.x;
  for(const offset of [-.65,0,.65])assert.equal(cameraObstructionFraction(x+offset,8,x+offset,15,walls,[0,1],.62),1);
});
