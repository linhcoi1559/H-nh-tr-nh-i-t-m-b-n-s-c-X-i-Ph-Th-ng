import test from 'node:test';
import assert from 'node:assert/strict';
import {texasReview,gameLedger} from '../arcade-review.mjs';
import {startArcadeRound,finishWheel,normalizeArcade,shuffledDeck} from '../arcade-state.mjs';
import {encodeSnapshot,parseSnapshot} from '../gameplay-state.mjs';
const c=(r,s=0)=>r-2+s*13;
test('saved legacy result is explained from the actual hands, not its outdated message',()=>{
 const table={board:[c(2),c(9,2),c(6,3),c(14,3),c(9)],button:2,players:[
  {name:'Bạn',hole:[c(11),c(4,2)],total:100,stack:0,initial:100,folded:false},
  {name:'Minh',hole:[c(3),c(5)],total:0,stack:100,initial:100,folded:true},
  {name:'Lan',hole:[c(12),c(13)],total:0,stack:130,initial:130,folded:true},
  {name:'Anh Tuấn',hole:[c(10,1),c(10,2)],total:100,stack:60,initial:160,folded:false}
 ]};
 const result=texasReview({table,message:'Anh Tuấn nhận pot · Một đôi.',payout:0,bet:100});
 assert.match(result.description,/Anh Tuấn · Hai đôi 10 và 9/);assert.match(result.reason,/Bạn: Đôi 9/);
 assert.equal(result.net,-100);assert.equal(result.returned,0);assert.deepEqual(result.awards,[0,0,0,200]);
});
test('uncontested results never reveal folded hole cards and account for uncommitted chips',()=>{
 const table={board:[],button:0,players:[{name:'Bạn',hole:[0,1],total:10,stack:90,initial:100,folded:false},...['Minh','Lan','Tuấn'].map((name,i)=>({name,hole:[i+4,i+9],total:5,stack:95,initial:100,folded:true}))]};
 const result=texasReview({table});assert.equal(result.returned,115);assert.equal(result.net,15);assert.equal(result.uncontested,true);assert.match(result.description,/bỏ bài/);
});
test('ledger stores only settled rounds, caps at twelve, survives reload and never credits twice',()=>{
 let s=normalizeArcade({tokens:1000});
 for(let i=0;i<15;i++){s=startArcadeRound(s,'wheel',10,shuffledDeck(),()=>.1);s=finishWheel(s);}
 assert.equal(s.history.length,12);assert.equal(s.rounds,15);assert.deepEqual(finishWheel(s),s);
 const reloaded=parseSnapshot(encodeSnapshot({arcade:s})).arcade;assert.deepEqual(reloaded,s);
 assert.equal(gameLedger(s.history,'wheel').played,12);assert.equal(gameLedger(s.history,'blackjack').played,0);
 assert.equal(gameLedger([{game:'texas',bet:100,payout:135},{game:'wheel',bet:10,payout:0}],'texas').net,35);
});
