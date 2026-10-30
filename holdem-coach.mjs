import {bestHoldem,texasOptions} from './holdem.mjs';

const faces={11:'J',12:'Q',13:'K',14:'A'};
const face=n=>faces[n]||String(n);
export function describeHand(result){
  const s=result.score;
  if(!result.cards.length)return 'Chưa đủ năm lá để xếp bộ';
  if(s[0]===8)return s[1]===14?'Sảnh đồng chất 10 đến A':`Sảnh đồng chất đến ${face(s[1])}`;
  if(s[0]===7)return `Tứ quý ${face(s[1])} · lá phụ ${face(s[2])}`;
  if(s[0]===6)return `Cù lũ ${face(s[1])} trên ${face(s[2])}`;
  if(s[0]===5)return `Thùng · ${s.slice(1).map(face).join(', ')}`;
  if(s[0]===4)return `Sảnh đến ${face(s[1])}`;
  if(s[0]===3)return `Sám ${face(s[1])} · lá phụ ${s.slice(2).map(face).join(', ')}`;
  if(s[0]===2)return `Hai đôi ${face(s[1])} và ${face(s[2])} · lá phụ ${face(s[3])}`;
  if(s[0]===1)return `Đôi ${face(s[1])} · lá phụ ${s.slice(2).map(face).join(', ')}`;
  return `Mậu thầu · ${s.slice(1).map(face).join(', ')}`;
}
export function normalizePresentation(input){return {pace:['calm','standard','step'].includes(input?.pace)?input.pace:'calm',coach:input?.coach!==false,paused:input?.paused===true};}
export function texasDelay(p,presentation){
  const settings=normalizePresentation(presentation);
  if(!p||p.actor===0||settings.paused||settings.pace==='step')return null;
  return settings.pace==='calm'?(p.actor<0?3400:2600):(p.actor<0?1900:1500);
}
export function raisePresets(p){
  const o=texasOptions(p);if(!o?.canRaise)return [];
  const pot=p.players.reduce((n,s)=>n+s.total,0),call=o.call;
  return [['Tối thiểu',o.min],['½ pot',p.currentBet+Math.max(p.minRaise,Math.round((pot+call)/2))],['1 pot',p.currentBet+Math.max(p.minRaise,pot+call)]]
    .map(([label,value])=>({label,value:Math.min(o.max,value)})).filter((x,i,a)=>a.findIndex(y=>y.value===x.value)===i);
}
// Public information only. Unknown opponent cards and burns remain in the unseen pool.
// Draw counts describe completing a straight/flush next card, not equity or guaranteed wins.
export function holdemGuide(hole,board,pot,call=0,contestablePot=pot+call){
  const result=bestHoldem([...hole,...board]);
  if(!board.length){
    const [a,b]=hole.map(c=>c%13+2),pair=a===b,suited=Math.floor(hole[0]/13)===Math.floor(hole[1]/13);
    return {title:pair?`Đôi ${face(a)} trên tay`:`${face(a)} – ${face(b)}${suited?' đồng chất':' khác chất'}`,detail:pair&&a>=10?'Đôi lớn là khởi đầu tốt, nhưng chưa bảo đảm thắng.':pair?'Đôi nhỏ dễ bị vượt sau flop; cân nhắc số chip cần theo.':a>=11&&b>=11?'Hai lá cao có thể tạo đôi lớn. Xem vị trí và mức tố trước khi theo.':'Bài khởi đầu cần cải thiện. Đừng theo cược lớn chỉ vì đã bỏ chip vào pot.',result,outs:[],nextChance:0,required:call?Math.round(call/Math.max(call,contestablePot)*100):0};
  }
  const known=new Set([...hole,...board]),outs=[];
  if(board.length<5&&result.score[0]<4)for(let card=0;card<52;card++)if(!known.has(card)){
    const candidate=bestHoldem([...hole,...board,card]);if([4,5,8].includes(candidate.score[0]))outs.push(card);
  }
  const onBoard=board.length===5&&describeHand(bestHoldem(board))===describeHand(result);
  return {title:describeHand(result),detail:onBoard?'Bộ mạnh nhất đang nằm trên bàn. Đối thủ cũng dùng được bộ này; hai lá riêng có thể tạo bộ tốt hơn.':result.score[0]===0?'Chưa có đôi. Có thể check miễn phí; đừng nhầm lá cao với một bộ mạnh.':result.score[0]===1?'Một đôi có thể thua hai đôi hoặc bộ cao hơn. Lá phụ quyết định khi hai bên cùng đôi.':'Bộ hiện tại đã rõ, nhưng vẫn cần so với bài chung và hành động của đối thủ.',result,outs,nextChance:Math.round(outs.length/(52-known.size)*100),required:call?Math.round(call/Math.max(call,contestablePot)*100):0};
}
