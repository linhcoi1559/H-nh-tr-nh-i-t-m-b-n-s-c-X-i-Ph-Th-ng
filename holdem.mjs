// Four-seat, play-token No Limit Hold'em. No UI or opponent hole-card access in AI.
const names=['Bạn','Chú Minh','Lan','Anh Tuấn'];
const ranks=['Mậu thầu','Một đôi','Hai đôi','Sám cô','Sảnh','Thùng','Cù lũ','Tứ quý','Thùng phá sảnh'];
const int=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
function five(cards){
  const rs=cards.map(c=>c%13+2).sort((a,b)=>b-a),map=new Map();rs.forEach(r=>map.set(r,(map.get(r)||0)+1));
  const groups=[...map].sort((a,b)=>b[1]-a[1]||b[0]-a[0]),flush=cards.every(c=>Math.floor(c/13)===Math.floor(cards[0]/13));
  const unique=[...new Set(rs)];if(unique[0]===14)unique.push(1);
  let straight=0;for(let i=0;i<=unique.length-5;i++)if(unique[i]-unique[i+4]===4){straight=unique[i];break;}
  if(flush&&straight)return [8,straight];
  if(groups[0][1]===4)return [7,groups[0][0],groups[1][0]];
  if(groups[0][1]===3&&groups[1][1]===2)return [6,groups[0][0],groups[1][0]];
  if(flush)return [5,...rs];if(straight)return [4,straight];
  if(groups[0][1]===3)return [3,...groups.map(g=>g[0])];
  if(groups[0][1]===2&&groups[1][1]===2)return [2,...groups.map(g=>g[0])];
  if(groups[0][1]===2)return [1,...groups.map(g=>g[0])];
  return [0,...rs];
}
export function compareHands(a,b){for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]||0)-(b[i]||0);if(d)return Math.sign(d);}return 0;}
export function bestHoldem(cards){
  let best=null,chosen=[];for(let a=0;a<cards.length-4;a++)for(let b=a+1;b<cards.length-3;b++)for(let c=b+1;c<cards.length-2;c++)for(let d=c+1;d<cards.length-1;d++)for(let e=d+1;e<cards.length;e++){
    const hand=[cards[a],cards[b],cards[c],cards[d],cards[e]],score=five(hand);if(!best||compareHands(score,best)>0){best=score;chosen=hand;}
  }
  return {score:best||[0],name:ranks[best?.[0]||0],cards:chosen};
}
const boardFor=(deck,street)=>street===0?[]:street===1?deck.slice(9,12):street===2?[...deck.slice(9,12),deck[13]]:[...deck.slice(9,12),deck[13],deck[15]];
export function normalizeTexas(p){
  if(!p||p.game!=='texas'||!Array.isArray(p.deck)||p.deck.length!==52||new Set(p.deck).size!==52||!p.deck.every(c=>int(c,0,51)))return null;
  if(!int(p.bet,20,300)||!int(p.button,0,3)||!int(p.street,0,3)||!int(p.actor,-1,3)||!int(p.currentBet,0,10000)||!int(p.minRaise,10,10000)||!Array.isArray(p.players)||p.players.length!==4)return null;
  const players=[];
  for(let i=0;i<4;i++){
    const s=p.players[i];if(!s||!int(s.stack,0,10000)||!int(s.total,0,10000)||!int(s.committed,0,s.total)||!int(s.initial,20,1000)||s.stack+s.total!==s.initial||!(s.actedAt===null||int(s.actedAt,0,10000)))return null;
    players.push({name:names[i],hole:[p.deck[i],p.deck[i+4]],stack:s.stack,initial:s.initial,total:s.total,committed:s.committed,folded:!!s.folded,actedAt:s.actedAt,note:String(s.note||'').slice(0,70)});
  }
  if(players[0].initial!==p.bet||players.some(s=>s.committed>p.currentBet))return null;
  return {game:'texas',version:1,bet:p.bet,deck:[...p.deck],players,button:p.button,street:p.street,actor:p.actor,currentBet:p.currentBet,minRaise:p.minRaise,board:boardFor(p.deck,p.street),log:Array.isArray(p.log)?p.log.map(x=>String(x).slice(0,100)).slice(-40):[],awards:null};
}
const active=p=>p.players.map((s,i)=>!s.folded?i:-1).filter(i=>i>=0);
const canAct=s=>!s.folded&&s.stack>0;
const needs=s=>canAct(s)&&(s.actedAt===null||s.committed<s._bet);
function next(p,after,predicate){for(let n=1;n<=4;n++){const i=(after+n)%4;if(predicate(p.players[i],i))return i;}return -1;}
function log(p,message){p.log.push(message);p.log=p.log.slice(-40);}
function pay(s,n){const chips=Math.min(s.stack,n);s.stack-=chips;s.committed+=chips;s.total+=chips;return chips;}
export function startTexas(buyIn,deck,button=0){
  if(!int(buyIn,20,300)||!Array.isArray(deck)||new Set(deck).size!==52||deck.length!==52||!deck.every(c=>int(c,0,51)))return null;
  const players=names.map((name,i)=>({name,hole:[deck[i],deck[i+4]],initial:i?buyIn+(i-1)*30:buyIn,stack:i?buyIn+(i-1)*30:buyIn,total:0,committed:0,folded:false,actedAt:null,note:'Chờ chia bài'}));
  const p={game:'texas',version:1,bet:buyIn,deck:[...deck],players,button:button%4,street:0,actor:(button+3)%4,currentBet:10,minRaise:10,board:[],log:[],awards:null};
  for(const [offset,n]of [[1,5],[2,10]]){const s=players[(p.button+offset)%4];pay(s,n);s.note=`${n===5?'SB':'BB'} · ${n} xu`;}
  log(p,'Chia hai lá riêng · blind 5 / 10');return p;
}
export function texasOptions(p){
  if(!p||p.actor<0)return null;const s=p.players[p.actor],call=Math.min(s.stack,Math.max(0,p.currentBet-s.committed));
  const max=s.committed+s.stack,canRaise=(s.actedAt===null||p.currentBet-s.actedAt>=p.minRaise)&&max>p.currentBet&&p.players.some((o,i)=>i!==p.actor&&canAct(o));
  return {call,min:p.currentBet+p.minRaise,max,canRaise};
}
export function distributePots(players,board,button){
  const awards=players.map(()=>0),pots=[],levels=[...new Set(players.map(s=>s.total).filter(Boolean))].sort((a,b)=>a-b);
  let previous=0;for(const level of levels){
    const contributors=players.map((s,i)=>s.total>=level?i:-1).filter(i=>i>=0),amount=(level-previous)*contributors.length;previous=level;
    let eligible=contributors.filter(i=>!players[i].folded);
    // A lone unmatched contribution is returned, including a player who folded.
    if(contributors.length===1){awards[contributors[0]]+=amount;pots.push({amount,winners:contributors,refund:true});continue;}
    if(!eligible.length)eligible=active({players});
    let winners=[],best=null;for(const i of eligible){const score=bestHoldem([...players[i].hole,...board]).score;if(!best||compareHands(score,best)>0){best=score;winners=[i];}else if(compareHands(score,best)===0)winners.push(i);}
    const share=Math.floor(amount/winners.length);winners.forEach(i=>awards[i]+=share);
    let remainder=amount%winners.length;for(let n=1;n<=4&&remainder;n++){const i=(button+n)%4;if(winners.includes(i)){awards[i]++;remainder--;}}
    pots.push({amount,winners,refund:false});
  }
  return {awards,pots};
}
function finish(p){
  const contenders=active(p);
  if(contenders.length===1){p.awards={awards:p.players.map((_,i)=>i===contenders[0]?p.players.reduce((s,x)=>s+x.total,0):0),pots:[]};}
  else p.awards=distributePots(p.players,p.board,p.button);
  p.actor=-1;log(p,contenders.length===1?`${p.players[contenders[0]].name} thắng vì các người khác bỏ bài.`:'Showdown · so bộ 5 lá mạnh nhất');return p;
}
export function texasAction(input,action,target){
  const p=normalizeTexas(input);if(!p||p.actor<0)return input;
  const s=p.players[p.actor],o=texasOptions(p),old=p.currentBet;let text;
  if(action==='fold'){s.folded=true;text='Bỏ bài';}
  else if(action==='call'){const paid=pay(s,o.call);text=paid?`Theo ${paid}`:'Check';}
  else if(action==='raise'){
    if(!o.canRaise||!int(target,old+1,o.max)||(target<o.min&&target!==o.max))return input;
    pay(s,target-s.committed);if(target-old>=p.minRaise)p.minRaise=target-old;p.currentBet=target;text=`Tố lên ${target}`;
  }else return input;
  s.actedAt=p.currentBet;s.note=text+(s.stack===0&&!s.folded?' · ALL-IN':'');log(p,`${s.name}: ${s.note}`);
  if(active(p).length===1)return finish(p);
  p.actor=next(p,p.actor,a=>needs({...a,_bet:p.currentBet}));return p;
}
export function advanceTexas(input){
  const p=normalizeTexas(input);if(!p||p.actor!==-1)return input;
  if(active(p).length===1||p.street===3)return finish(p);
  p.street++;p.board=boardFor(p.deck,p.street);p.currentBet=0;p.minRaise=10;
  p.players.forEach(s=>{s.committed=0;s.actedAt=null;if(!s.folded)s.note=s.stack?'Chờ lượt':'ALL-IN';});
  log(p,['','Lật FLOP · ba lá chung','Lật TURN · lá chung thứ tư','Lật RIVER · lá chung cuối'][p.street]);
  p.actor=p.players.filter(canAct).length<=1?-1:next(p,p.button,canAct);return p;
}
export function texasBotAction(p,random=Math.random){
  if(!p||p.actor<=0)return p;const seat=p.actor,s=p.players[seat],o=texasOptions(p),r=random();
  const [a,b]=s.hole.map(c=>c%13+2),suited=Math.floor(s.hole[0]/13)===Math.floor(s.hole[1]/13);
  let strength=(Math.max(a,b)/14*.35)+(a===b?.4:0)+(suited?.08:0)+(Math.abs(a-b)===1?.08:0);
  if(p.board.length){
    const score=bestHoldem([...s.hole,...p.board]).score;
    strength=[.12+Math.max(a,b)/100,.18+Math.max(a,b)*.007,.62,.74,.83,.9,.96,.99,1][score[0]];
    if(score[0]===1&&(a===score[1]||b===score[1]))strength=.43+score[1]*.012;
    const known=[...s.hole,...p.board];
    if(p.board.length<5&&[0,1,2,3].some(suit=>known.filter(c=>Math.floor(c/13)===suit).length===4))strength+=.12;
  }
  const pot=p.players.reduce((sum,x)=>sum+x.total,0),odds=o.call/(pot+o.call||1),aggression=[0,.04,.08,.14][seat];
  // Folding follows price and visible strength. Randomness affects only occasional aggression.
  if(o.call>0&&strength+aggression<odds+.12)return texasAction(p,'fold');
  const bluff=p.street>=2&&active(p).length<=2&&o.call===0&&r<.025;
  if(o.canRaise&&(strength>.64&&r<.1+aggression||bluff)){const target=Math.min(o.max,Math.max(o.min,p.currentBet+Math.max(10,Math.floor(pot*.45))));return texasAction(p,'raise',target);}
  return texasAction(p,'call');
}
