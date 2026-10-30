import {normalizeTexas,startTexas,texasAction,advanceTexas,texasBotAction,bestHoldem} from './holdem.mjs';
import {normalizePresentation,describeHand} from './holdem-coach.mjs';
export const ARCADE_SHOP = {x:-40.6,z:18.2,width:7.4,depth:10.5,doorZ:12.95};
export const ARCADE_APPROACH_WALLS = [[-124.5,ARCADE_SHOP.x-ARCADE_SHOP.width/2],[ARCADE_SHOP.x+ARCADE_SHOP.width/2,-19.5]];
export const WHEEL_PRIZES = [0,10,0,20,0,10,0,50,0,10,0,20,0,10,0,100];
export const POKER_PAYTABLE = [
  ['Sảnh rồng',250],['Thùng phá sảnh',50],['Tứ quý',25],['Cù lũ',9],['Thùng',6],['Sảnh',4],['Sám cô',3],['Hai đôi',2],['Đôi J trở lên',1]
];
const integer=(n,a,b,f=0)=>Number.isFinite(Number(n))?Math.max(a,Math.min(b,Math.floor(Number(n)))):f;
export function shuffledDeck(random=Math.random){
  const deck=Array.from({length:52},(_,i)=>i);
  for(let i=51;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));[deck[i],deck[j]]=[deck[j],deck[i]];}
  return deck;
}
const rank=c=>c%13+2;
export function handValue(cards){
  let total=cards.reduce((s,c)=>s+(rank(c)===14?11:Math.min(10,rank(c))),0),aces=cards.filter(c=>rank(c)===14).length,soft=aces;
  while(total>21&&soft){total-=10;soft--;}
  return {total,soft:soft>0,natural:cards.length===2&&total===21};
}
export function pokerResult(cards){
  if(cards.length!==5||new Set(cards).size!==5)return {name:'Không có bộ',multiplier:0};
  const ranks=cards.map(rank).sort((a,b)=>a-b),counts=new Map();ranks.forEach(r=>counts.set(r,(counts.get(r)||0)+1));
  const groups=[...counts.values()].sort((a,b)=>b-a),flush=cards.every(c=>Math.floor(c/13)===Math.floor(cards[0]/13));
  const straight=counts.size===5&&(ranks[4]-ranks[0]===4||ranks.join(',')==='2,3,4,5,14');
  let index=-1;
  if(flush&&straight)index=ranks[0]===10?0:1;
  else if(groups[0]===4)index=2;
  else if(groups[0]===3&&groups[1]===2)index=3;
  else if(flush)index=4;
  else if(straight)index=5;
  else if(groups[0]===3)index=6;
  else if(groups[0]===2&&groups[1]===2)index=7;
  else if([...counts].some(([r,n])=>r>=11&&n===2))index=8;
  return index<0?{name:'Không có bộ',multiplier:0}:{name:POKER_PAYTABLE[index][0],multiplier:POKER_PAYTABLE[index][1]};
}
function validDeck(d){return Array.isArray(d)&&d.length===52&&new Set(d).size===52&&d.every(c=>Number.isInteger(c)&&c>=0&&c<52);}
function validCards(a){return Array.isArray(a)&&a.length>=2&&a.every(c=>Number.isInteger(c)&&c>=0&&c<52);}
export function normalizeArcade(input,day=1){
  const i=input&&typeof input==='object'?input:{};
  const s={tokens:integer(i.tokens,0,10000000,300),claimDay:integer(i.claimDay,0,100000,day),rounds:integer(i.rounds,0,1000000),wins:integer(i.wins,0,1000000),pending:null,last:null};
  const p=i.pending;
  s.presentation=normalizePresentation(i.presentation);
  s.history=Array.isArray(i.history)?i.history.slice(-12).filter(h=>h&&['texas','blackjack','wheel','poker'].includes(h.game)).map(h=>({game:h.game,bet:integer(h.bet,0,300),payout:integer(h.payout,0,25000),message:String(h.message||'').slice(0,180)})):[];
  if(Array.isArray(i.guests))s.guests=i.guests.slice(0,2).filter(g=>validCards(g.hand)&&g.hand.length<=10).map((g,n)=>({name:['Cô Hương','Bác Sơn'][n],hand:[...g.hand],total:handValue(g.hand).total,dealer:validCards(g.dealer)?g.dealer.slice(0,10):[],payout:integer(g.payout,0,25)}));
  if(Array.isArray(i.wheelGuests)&&i.wheelGuests.length===3)s.wheelGuests=i.wheelGuests.map(n=>integer(n,0,10000000,100));
  if(p?.game==='texas')s.pending=normalizeTexas(p);
  if(p&&p.game==='wheel'&&p.bet===10&&Number.isInteger(p.index)&&p.index>=0&&p.index<16)s.pending={game:'wheel',bet:10,index:p.index};
  if(p&&['blackjack','poker'].includes(p.game)&&[10,20,50,100].includes(p.bet)&&validDeck(p.deck)){
    if(p.game==='poker'&&[10,20,50].includes(p.bet)&&Array.isArray(p.hand)&&p.hand.length===5&&new Set(p.hand).size===5&&p.hand.every((c,n)=>c===p.deck[n]))s.pending={game:'poker',bet:p.bet,deck:[...p.deck],hand:[...p.hand],held:Array.from({length:5},(_,n)=>!!p.held?.[n])};
    if(p.game==='blackjack'&&validCards(p.player)&&validCards(p.dealer)&&p.dealer.length===2&&Number.isInteger(p.cursor)&&p.cursor===p.player.length+2&&p.cursor<=52){
      const expected=[...p.player,...p.dealer];
      if(new Set(expected).size===expected.length&&expected.every(c=>p.deck.slice(0,p.cursor).includes(c))&&p.player[0]===p.deck[0]&&p.player[1]===p.deck[2]&&p.dealer[0]===p.deck[1]&&p.dealer[1]===p.deck[3]&&p.player.slice(2).every((c,n)=>c===p.deck[n+4]))s.pending={game:'blackjack',bet:p.bet,deck:[...p.deck],player:[...p.player],dealer:[...p.dealer],cursor:p.cursor};
    }
  }
  if(i.last&&['blackjack','poker','wheel'].includes(i.last.game))s.last={game:i.last.game,bet:integer(i.last.bet,0,100),payout:integer(i.last.payout,0,25000),message:String(i.last.message||'').slice(0,180),player:Array.isArray(i.last.player)?i.last.player.filter(c=>Number.isInteger(c)&&c>=0&&c<52).slice(0,12):[],dealer:Array.isArray(i.last.dealer)?i.last.dealer.filter(c=>Number.isInteger(c)&&c>=0&&c<52).slice(0,12):[],index:integer(i.last.index,0,15)};
  if(i.last?.game==='texas'&&i.last.table){const table=normalizeTexas(i.last.table);if(table)s.last={game:'texas',bet:table.bet,payout:integer(i.last.payout,0,25000),message:String(i.last.message||'').slice(0,180),table,awards:Array.from({length:4},(_,n)=>integer(i.last.awards?.[n],0,25000))};}
  return s;
}
function settle(s,payout,message,details={}){
  s.tokens+=payout;s.rounds++;if(payout>s.pending.bet)s.wins++;
  s.last={game:s.pending.game,bet:s.pending.bet,payout,message,player:[],dealer:[],index:0,...details};
  s.history=[...s.history,{game:s.last.game,bet:s.last.bet,payout,message}].slice(-12);s.pending=null;return s;
}
export function claimArcadeTokens(state,day){const s=normalizeArcade(state,day);if(s.claimDay<day){s.tokens=Math.min(10000000,s.tokens+100);s.claimDay=day;}return s;}
export function startArcadeRound(state,game,bet,deck=shuffledDeck(),random=Math.random){
  const s=normalizeArcade(state);if(s.pending||!['blackjack','poker','wheel'].includes(game))return s;
  if(game==='wheel')bet=10;
  if(![10,20,50].includes(bet)||s.tokens<bet||!validDeck(deck))return s;
  s.tokens-=bet;
  if(game==='wheel'){s.wheelGuests=(s.wheelGuests||[120,100,180]).map(n=>Math.max(10,n)-10);s.pending={game,bet,index:Math.min(15,Math.max(0,Math.floor(random()*16)))};return s;}
  if(game==='poker'){s.pending={game,bet,deck:[...deck],hand:deck.slice(0,5),held:[false,false,false,false,false]};return s;}
  const player=[deck[0],deck[2]],dealer=[deck[1],deck[3]];s.pending={game,bet,deck:[...deck],player,dealer,cursor:4};
  const pv=handValue(player),dv=handValue(dealer);
  if(pv.natural||dv.natural)return settle(s,pv.natural?(dv.natural?bet:bet*2.5):0,pv.natural?(dv.natural?'Hai bên Blackjack · hòa.':'Blackjack tự nhiên · trả 3:2.'):'Nhà cái Blackjack.',{player,dealer});
  return s;
}
export function blackjackAction(state,action){
  const s=normalizeArcade(state),p=s.pending;if(p?.game!=='blackjack'||!['hit','stand','double'].includes(action))return s;
  if(action==='double'){
    if(p.player.length!==2||s.tokens<p.bet)return s;
    s.tokens-=p.bet;p.bet*=2;
  }
  if(action!=='stand')p.player.push(p.deck[p.cursor++]);
  const pv=handValue(p.player);
  if(pv.total>21)return settle(s,0,'Quá 21 · thua ván này.',{player:p.player,dealer:p.dealer});
  if(action==='hit'&&pv.total<21)return s;
  while(handValue(p.dealer).total<17)p.dealer.push(p.deck[p.cursor++]);
  const dv=handValue(p.dealer).total,payout=dv>21||pv.total>dv?p.bet*2:pv.total===dv?p.bet:0;
  return settle(s,payout,payout===p.bet?'Hòa · hoàn xu cược.':payout?'Bạn thắng nhà cái.':'Nhà cái thắng.',{player:p.player,dealer:p.dealer});
}
export function togglePokerHold(state,index){const s=normalizeArcade(state);if(s.pending?.game==='poker'&&Number.isInteger(index)&&index>=0&&index<5)s.pending.held[index]=!s.pending.held[index];return s;}
export function drawPoker(state){
  const s=normalizeArcade(state),p=s.pending;if(p?.game!=='poker')return s;
  let cursor=5;const hand=p.hand.map((c,i)=>p.held[i]?c:p.deck[cursor++]);
  const result=pokerResult(hand);return settle(s,p.bet*result.multiplier,`${result.name} · trả ${result.multiplier}× mức cược.`,{player:hand});
}
export function finishWheel(state){const s=normalizeArcade(state),p=s.pending;if(p?.game!=='wheel')return s;const prize=WHEEL_PRIZES[p.index];if(s.wheelGuests)s.wheelGuests=s.wheelGuests.map(n=>n+prize);return settle(s,prize,prize?`Ô ${p.index+1}: nhận ${prize} xu.`:`Ô ${p.index+1}: chưa có thưởng.`,{index:p.index});}

export function startHoldem(state,buyIn=100,deck=shuffledDeck()){
  const s=normalizeArcade(state);if(s.pending||s.tokens<buyIn)return s;
  const p=startTexas(buyIn,deck,s.rounds%4);if(!p)return s;
  s.tokens-=buyIn;s.pending=p;return s;
}
export function holdemAction(state,action,target,random=Math.random){
  const s=normalizeArcade(state);if(s.pending?.game!=='texas')return s;
  const p=s.pending;
  const next=action==='tick'?(p.actor===-1?advanceTexas(p):p.actor>0?texasBotAction(p,random):p):p.actor===0?texasAction(p,action,target):p;
  s.pending=next;
  if(next.awards){
    const payout=next.players[0].stack+next.awards.awards[0],alive=next.players.filter(x=>!x.folded);
    const winners=next.players.filter((x,n)=>!x.folded&&next.awards.awards[n]>x.total).map(x=>`${x.name}: ${describeHand(bestHoldem([...x.hole,...next.board]))}`).join(' · ');
    const message=alive.length===1?`${alive[0].name} thắng khi các người khác bỏ bài.`:winners||'Đã so bài và chia pot; xem bộ năm lá của từng người.';
    return settle(s,payout,message,{table:next,awards:next.awards.awards});
  }
  return s;
}

// Neighbouring blackjack players use their own shoe; they never consume the player's cards.
export function blackjackGuests(deck=shuffledDeck()){
  let cursor=0;const hands=[];for(const name of ['Cô Hương','Bác Sơn']){
    const hand=[deck[cursor++],deck[cursor++]],dealer=[deck[cursor++],deck[cursor++]];
    while(handValue(hand).total<17)hand.push(deck[cursor++]);while(handValue(dealer).total<17)dealer.push(deck[cursor++]);
    const total=handValue(hand).total,dt=handValue(dealer).total;
    const payout=total>21?0:dt>21||total>dt?20:total===dt?10:0;
    hands.push({name,hand,total,dealer,payout});
  }return hands;
}
