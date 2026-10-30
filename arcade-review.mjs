import {bestHoldem,compareHands,distributePots} from './holdem.mjs';
import {describeHand} from './holdem-coach.mjs';

export function texasReview(last){
  const p=last?.table;if(!p)return null;
  const contenders=p.players.map((s,i)=>!s.folded?i:-1).filter(i=>i>=0),uncontested=contenders.length===1;
  const distribution=uncontested?{awards:p.players.map((_,i)=>i===contenders[0]?p.players.reduce((n,s)=>n+s.total,0):0),pots:[]}:distributePots(p.players,p.board,p.button);
  const awards=distribution.awards,recipients=contenders.filter(i=>awards[i]>0);
  const description=uncontested?`${p.players[contenders[0]].name} thắng vì các người khác bỏ bài.`:recipients.map(i=>`${p.players[i].name} · ${describeHand(bestHoldem([...p.players[i].hole,...p.board]))}`).join(' / ');
  const hero=p.players[0];let reason=hero.folded?'Bạn đã bỏ bài; những lá riêng của người bỏ bài không được công khai.':uncontested?'Không cần so bài vì chỉ còn một người trong ván.':'';
  if(!reason){
    const rival=recipients.find(i=>i!==0),ours=bestHoldem([...hero.hole,...p.board]);
    if(rival!==undefined){const theirs=bestHoldem([...p.players[rival].hole,...p.board]);const equal=compareHands(ours.score,theirs.score)===0;reason=equal?'Hai bên có bộ năm lá ngang nhau. Pot được chia theo phần chip đủ điều kiện.':`${p.players[rival].name}: ${describeHand(theirs)}. Bạn: ${describeHand(ours)}. ${ours.score[0]===theirs.score[0]?'Cùng loại bộ; so hạng của bộ rồi lần lượt các lá phụ.':'Loại bộ mạnh hơn được ưu tiên trước lá cao.'}`;}
    else reason=`Bạn có ${describeHand(ours)}. Pot được phân phối theo mức chip mỗi người đã góp.`;
  }
  return {description,reason,awards,pots:distribution.pots,uncontested,pot:p.players.reduce((n,s)=>n+s.total,0),contributed:hero.total,uncommitted:hero.stack,returned:hero.stack+awards[0],net:hero.stack+awards[0]-hero.initial};
}
export function gameLedger(history,game){const rows=(history||[]).filter(r=>r.game===game);return {rows,played:rows.length,net:rows.reduce((n,r)=>n+r.payout-r.bet,0)};}
