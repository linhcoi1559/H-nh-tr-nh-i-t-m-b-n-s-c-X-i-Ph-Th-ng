import {texasOptions,bestHoldem} from './holdem.mjs';
import {describeHand,holdemGuide,raisePresets,normalizePresentation} from './holdem-coach.mjs';
import {texasReview,gameLedger} from './arcade-review.mjs';

export function renderLedger(main,history,game,text){
  const ledger=gameLedger(history,game);if(!ledger.played)return;
  const details=document.createElement('details');details.className='arcade-ledger';main.append(details);
  text(`Sổ bàn · ${ledger.played} ván gần đây · ${ledger.net>=0?'+':''}${ledger.net} xu`,details,'summary');
  const table=document.createElement('table');details.append(table);const head=document.createElement('thead');table.append(head);const hr=document.createElement('tr');head.append(hr);['Ván','Đưa vào','Mang về','Chênh lệch'].forEach(label=>text(label,hr,'th'));
  const body=document.createElement('tbody');table.append(body);ledger.rows.slice().reverse().forEach((r,n)=>{const row=document.createElement('tr');body.append(row);[ledger.played-n,r.bet,r.payout,`${r.payout-r.bet>=0?'+':''}${r.payout-r.bet}`].forEach(value=>text(String(value),row,'td'));});
}

export function portrait(parent,name,index=0,active=false){
  const avatar=document.createElement('div');avatar.className=`arcade-person person-${index%5}${active?' thinking':''}`;
  avatar.setAttribute('aria-hidden','true');avatar.innerHTML='<i class="person-body"></i><i class="person-head"><b></b><em></em></i>';parent.append(avatar);
  return avatar;
}
export function renderHoldem({main,p,cards,button,text,onAction,onNext,buyIn,setBuyIn,tokens,last,presentation,onPresentation,onStep,history:ledgerHistory}){
  const settings=normalizePresentation(presentation);
  const review=!p&&last?.game==='texas'?texasReview(last):null;
  let entryPanel=null;
  const heading=text('TEXAS HOLD’EM',main,'h3');heading.className='table-heading';
  text('Bạn + 3 người chơi máy · No Limit · Blind 5 / 10',main).className='table-subtitle';
  const toolbar=document.createElement('div');toolbar.className='holdem-toolbar';main.append(toolbar);
  const paceLabel=text('Nhịp chơi ',toolbar,'label'),pace=document.createElement('select');pace.setAttribute('aria-label','Nhịp chơi');pace.id='holdem-pace';paceLabel.append(pace);
  for(const [value,label]of [['calm','Thư thả'],['standard','Vừa phải'],['step','Từng bước']]){const option=document.createElement('option');option.value=value;option.textContent=label;pace.append(option);}pace.value=settings.pace;
  pace.onchange=()=>onPresentation({...settings,pace:pace.value});
  button(settings.paused?'▶ Tiếp tục':'Ⅱ Tạm dừng',()=>onPresentation({...settings,paused:!settings.paused}),toolbar).disabled=!p;
  const coach=button(settings.coach?'Ẩn trợ giúp':'Hiện trợ giúp',()=>onPresentation({...settings,coach:!settings.coach}),toolbar);coach.setAttribute('aria-pressed',String(settings.coach));
  if(!p){
    if(last?.game==='texas'){
      const result=document.createElement('div');result.className=`texas-settlement ${review.net>0?'positive':review.net<0?'negative':'neutral'}`;main.append(result);result.setAttribute('role','status');
      text(review.net>0?`Bạn lãi ${review.net} xu`:review.net<0?`Bạn giảm ${-review.net} xu`:'Bạn hòa vốn',result,'strong');
      text(review.description,result);text(review.reason,result,'small');
      const money=document.createElement('div');money.className='settlement-money';result.append(money);
      for(const [label,value]of [['Mang vào',last.bet],['Đã cược',review.contributed],['Nhận từ pot',review.awards[0]],['Trả về ví',review.returned]]){const cell=document.createElement('div');money.append(cell);text(label,cell,'small');text(`${value} xu`,cell,'b');}
      p=last.table;
    }
    const entry=document.createElement('div');entry.className='holdem-entry';if(p)entryPanel=entry;else main.append(entry);
    text('Chip mang vào bàn:',entry,'span');
    for(const amount of [50,100,200,300]){const b=button(`${amount} xu`,()=>setBuyIn(amount),entry);b.setAttribute('aria-pressed',String(buyIn===amount));b.disabled=tokens<amount;}
    button('Chia bài Texas Hold’em',onNext,entry).disabled=tokens<buyIn;
    if(!p)text('Mỗi người nhận 2 lá riêng. Kết hợp với 5 lá chung để tạo bộ 5 lá mạnh nhất. Chip còn lại và phần pot thắng được trả về ví khi ván kết thúc.');
  }
  const ended=!p||last?.table===p;
  const timeline=document.createElement('div');timeline.className='holdem-timeline';timeline.setAttribute('aria-label','Các vòng cược');main.append(timeline);
  ['1 · Trước flop','2 · Flop','3 · Turn','4 · River'].forEach((label,i)=>{const item=text(label,timeline,'span');if(p?.street===i)item.setAttribute('aria-current','step');else if(p&&p.street>i)item.className='completed-street';});
  if(p){const live=text(p.log.at(-1)||'Chờ chia bài',main,'div');live.className='holdem-live';live.setAttribute('role','status');}
  const table=document.createElement('div');table.className='holdem-table';table.setAttribute('aria-label','Bàn Texas Hold’em bốn người');main.append(table);
  if(!p){
    for(let i=0;i<4;i++){const s=document.createElement('div');s.className=`holdem-seat seat-${i}`;table.append(s);portrait(s,['Bạn','Chú Minh','Lan','Anh Tuấn'][i],i);text(['Bạn','Chú Minh · thận trọng','Lan · linh hoạt','Anh Tuấn · thích tố'][i],s,'strong');text('Sẵn sàng',s,'small');}
    text('TIỆM 41',table,'div').className='holdem-watermark';renderLedger(main,ledgerHistory,'texas',text);return;
  }
  const allFolded=p.players.filter(s=>!s.folded).length===1;
  p.players.forEach((s,i)=>{
    const seat=document.createElement('div');seat.className=`holdem-seat seat-${i}${s.folded?' folded':''}${!ended&&p.actor===i?' active-seat':''}${ended&&last.awards?.[i]>s.total?' winner-seat':''}`;table.append(seat);
    if(i>0)seat.title=['','Chú Minh · chọn lọc, ít tố','Lan · cân bằng giữa theo và tố','Anh Tuấn · chủ động tố hơn'][i];
    portrait(seat,s.name,i,!ended&&p.actor===i&&i!==0);
    const name=text(s.name,seat,'strong');if(p.button===i)text('D',name,'span').className='dealer-button';
    text(`${s.stack+(ended?(review?.awards[i]||0):0)} xu`,seat,'small');
    cards(s.hole,i!==0&&(!ended||s.folded||allFolded),seat,`texas-${i}`);
    text(s.folded?'Đã bỏ bài':!ended&&p.actor===i?(i===0?'Đến lượt bạn':`${s.name} đang nghĩ…`):s.note,seat,'small').className='seat-action';
    if(s.committed>0&&!ended){const chips=text(`◉ ${s.committed}`,seat,'span');chips.className='seat-chips';chips.style.setProperty('--seat',i);}
    if(ended&&review?.awards[i]>0)text(`+${review.awards[i]} xu từ pot`,seat,'span').className='win-chips';
    if(ended&&!s.folded&&!allFolded)seat.title=describeHand(bestHoldem([...s.hole,...p.board]));
  });
  const center=document.createElement('div');center.className='holdem-center';table.append(center);
  text(['PRE-FLOP','FLOP','TURN','RIVER'][p.street],center,'small').className='street-badge';
  text(`POT · ${p.players.reduce((n,s)=>n+s.total,0)} xu`,center,'strong').className='pot-value';
  const board=cards(p.board,false,center,'texas-board');board.classList.add('community-cards');
  for(let n=p.board.length;n<5;n++)text('♠',board,'span').className='card-slot';
  if(ended&&review){
    const strongest=review.awards.map((award,i)=>({award,i})).filter(({i})=>!p.players[i].folded).sort((a,b)=>b.award-a.award)[0];
    if(strongest&&!allFolded){const best=new Set(bestHoldem([...p.players[strongest.i].hole,...p.board]).cards);[...board.children].forEach((el,i)=>{if(best.has(p.board[i]))el.classList.add('winning-card');});}
  }
  if(!ended){
    const controls=document.createElement('div');controls.className='holdem-controls';main.append(controls);
    if(p.actor===0&&!settings.paused){
      const o=texasOptions(p);text(o.call?`Cần theo ${o.call} xu · Mức cược hiện tại ${p.currentBet}`:'Bạn có thể check hoặc mở cược.',controls);
      function commit(action,target){
        const cost=action==='call'?o.call:target-p.players[0].committed;
        if(cost===p.players[0].stack&&cost>0){
          const existing=controls.querySelector('.allin-confirm');if(existing)return;
          const confirm=document.createElement('div');confirm.className='allin-confirm';controls.append(confirm);confirm.setAttribute('role','group');confirm.setAttribute('aria-label','Xác nhận cược hết chip');
          text(`Bạn sẽ đưa toàn bộ ${cost} xu còn lại vào ván.`,confirm,'strong');
          button('Xác nhận all-in',()=>onAction(action,target),confirm);button('Hủy',()=>confirm.remove(),confirm);confirm.querySelector('button').focus();return;
        }
        onAction(action,target);
      }
      button('Bỏ bài',()=>onAction('fold'),controls).className='fold-action';button(o.call?`Theo ${o.call} xu`:'Check',()=>commit('call'),controls).className='call-action';
      if(o.canRaise){
        const wrap=document.createElement('label');wrap.className='raise-choice';wrap.textContent='Tố lên ';controls.append(wrap);
        const input=document.createElement('input');input.type='number';input.min=Math.min(o.min,o.max);input.max=o.max;input.step=1;input.value=Math.min(o.min,o.max);input.setAttribute('aria-label','Tổng chip tố trong vòng');wrap.append(input);
        const slider=document.createElement('input');slider.type='range';slider.className='raise-slider';slider.min=input.min;slider.max=input.max;slider.step=1;slider.value=input.value;slider.setAttribute('aria-label','Kéo để chọn mức tố');controls.append(slider);
        const preview=text('',controls,'output');preview.className='raise-preview';
        const updatePreview=()=>{const value=Number(input.value);slider.value=input.value;preview.textContent=`Tố lên ${value} · Bỏ thêm ${Math.max(0,value-p.players[0].committed)} xu · Còn ${Math.max(0,p.players[0].stack-value+p.players[0].committed)} xu trên bàn`;};updatePreview();
        slider.oninput=()=>{input.value=slider.value;updatePreview();};
        button('Tố',()=>commit('raise',Number(input.value)),controls);
        button(`All-in · ${p.players[0].stack} xu`,()=>commit('raise',o.max),controls).className='allin-action';
        input.oninput=()=>{input.setCustomValidity(Number(input.value)>=o.min||Number(input.value)===o.max?'':'Chọn mức tối thiểu hoặc all-in.');updatePreview();};
        const presets=document.createElement('div');presets.className='raise-presets';controls.append(presets);
        raisePresets(p).forEach(({label,value})=>button(`${label} · ${value}`,()=>{input.value=value;updatePreview();input.focus();},presets));
      }
      text('Không giới hạn thời gian quyết định. Mức “tố lên” là tổng chip của bạn trong vòng này.',controls,'small').className='decision-note';
    }else text(settings.paused?'Đã tạm dừng · bài và chip giữ nguyên.':p.actor<0?'Vòng cược đã xong · chuẩn bị lật bài.':`${p.players[p.actor].name} đang cân nhắc…`,controls).className='thinking-status';
    if(p.actor!==0&&(settings.pace==='step'||settings.paused))button(p.actor<0?(p.street===3?'So bài và chia pot':'Lật vòng tiếp theo'):`Xem lượt ${p.players[p.actor].name}`,onStep,controls).className='step-action';
    if(settings.coach&&!p.players[0].folded){
      const hero=p.players[0],o=p.actor===0?texasOptions(p):null,pot=p.players.reduce((n,s)=>n+s.total,0),call=o?.call||0;
      const contestable=p.players.reduce((n,s)=>n+Math.min(s.total,hero.total+call),0)+call;
      const guide=holdemGuide(hero.hole,p.board,pot,call,contestable),aside=document.createElement('aside');aside.className='holdem-coach';aside.setAttribute('aria-label','Đọc bài và cân nhắc cược');main.append(aside);
      text('ĐỌC TÌNH HUỐNG',aside,'small');text(guide.title,aside,'strong');text(guide.detail,aside);
      if(call)text(`Theo ${call} để tranh phần pot khoảng ${contestable} xu: mốc hòa vốn khoảng ${guide.required}% cơ hội thắng, nếu không có cược thêm. Đây là mốc cần đạt, không phải xác suất thắng được dự đoán.`,aside);
      if(guide.outs.length)text(`${guide.outs.length} lá chưa thấy có thể hoàn thiện sảnh/thùng ở lá kế tiếp (khoảng ${guide.nextChance}%). Hoàn thiện bộ vẫn có thể thua; đây không phải tỷ lệ thắng.`,aside);
      if(guide.result.cards.length){
        const highlight=new Set(guide.result.cards);[...board.children].forEach((el,i)=>{if(highlight.has(p.board[i]))el.classList.add('best-card');});
        [...table.querySelector('.seat-0 .arcade-hand').children].forEach((el,i)=>{if(highlight.has(hero.hole[i]))el.classList.add('best-card');});
        text('Viền vàng đánh dấu năm lá đang tạo bộ mạnh nhất của bạn.',aside,'small');
      }
    }
  }else if(!allFolded){
    const review=document.createElement('details');review.className='showdown-review';review.open=true;main.append(review);text('Vì sao ván này thắng hoặc thua?',review,'summary');
    p.players.forEach((seat,i)=>{if(seat.folded)return;const row=document.createElement('div');row.className='showdown-row';review.append(row);const result=bestHoldem([...seat.hole,...p.board]);text(`${seat.name} · ${describeHand(result)}`,row,'strong');cards(result.cards,false,row,`review-${i}`);text(`Đã góp ${seat.total} · Nhận từ pot ${last.awards?.[i]||0} xu`,row,'small');});
    const distribution=texasReview(last);if(distribution?.pots.length>1){const pots=document.createElement('div');pots.className='pot-breakdown';review.append(pots);distribution.pots.forEach((pot,n)=>text(`${pot.refund?'Hoàn chip dư':n?'Pot phụ '+n:'Pot chính'}: ${pot.amount} xu → ${pot.winners.map(i=>p.players[i].name).join(', ')}`,pots));}
  }
  if(entryPanel)main.append(entryPanel);
  const history=document.createElement('details');history.className='holdem-history';main.append(history);text('Diễn biến bàn chơi',history,'summary');
  const log=document.createElement('ol');log.className='table-log';log.setAttribute('aria-label','Diễn biến bàn chơi');history.append(log);p.log.forEach(line=>text(line,log,'li'));
  renderLedger(main,ledgerHistory,'texas',text);
}
