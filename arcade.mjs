import * as THREE from 'three';
import {ARCADE_SHOP as SHOP,WHEEL_PRIZES,normalizeArcade,claimArcadeTokens,startArcadeRound,blackjackAction,finishWheel,shuffledDeck,handValue,startHoldem,holdemAction,blackjackGuests} from './arcade-state.mjs';
import {renderHoldem,portrait,renderLedger} from './arcade-table.mjs';
import {createArcadeCrowd} from './arcade-crowd.mjs';
import {texasDelay,normalizePresentation} from './holdem-coach.mjs';

export function createNeighborhoodArcade(api){
  const root=new THREE.Group();root.name='TiemGiaiTri41';api.world.add(root);
  const wall=api.materials.plaster(0xb6b49c),wood=api.materials.wood;
  const felt=new THREE.MeshStandardMaterial({color:0x1e5b4c,roughness:.95}),brass=new THREE.MeshStandardMaterial({color:0xbda16b,roughness:.5,metalness:.4});
  const box=(x,y,z,w,h,d,mat,solid=false)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.receiveShadow=true;root.add(mesh);if(solid)api.box(x,z,w,d);return mesh;
  };
  const x=SHOP.x,z=SHOP.z,front=SHOP.doorZ;
  box(x,.018,z,7.4,.03,10.5,api.materials.concrete());
  box(x,1.9,z+5.12,7.4,3.8,.26,wall,true);
  box(x-3.58,1.9,z,.24,3.8,10.5,wall,true);box(x+3.58,1.9,z,.24,3.8,10.5,wall,true);
  for(const side of [-1,1])box(x+side*2.43,1.8,front,2.3,3.6,.24,wall,true);
  box(x,3.3,front,2.56,.6,.24,wall);box(x,3.9,z,7.6,.24,10.7,wall);
  for(const side of [-1,1])box(x+side*1.29,1.5,front-.11,.09,3,.13,brass);
  box(x,3.18,front-.7,7.1,.18,1.35,wood);
  const sign=api.label('TIỆM GIẢI TRÍ 41 · ♠ ♥ 🎡','#e7c993');sign.position.set(x,3.52,front-.28);sign.scale.set(5.8,.82,1);root.add(sign);
  const rules=api.label('MỞ CỬA · XU CHƠI MIỄN PHÍ','#a9d8c2');rules.position.set(x-2.35,1.7,front-.18);rules.scale.set(1.9,.48,1);root.add(rules);
  // A solid upper floor closes the storefront without a floating roof or open back.
  box(x,7.3,z,7.4,6.6,10.5,wall);
  for(const y of [5.4,8.5])for(const offset of [-2.2,0,2.2])box(x+offset,y,front-.1,1.25,1.55,.12,new THREE.MeshStandardMaterial({color:0x30454a,roughness:.5}));
  const tables=[{game:'blackjack',x:x-1.8,z:z-1.9,label:'BLACKJACK · 21'}, {game:'texas',x:x+1.65,z:z+1.5,label:'TEXAS HOLD’EM'},{game:'wheel',x:x-1.7,z:z+3.2,label:'VÒNG QUAY 16 Ô'}];
  tables.forEach(t=>{
    const tabletop=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.05,.13,24),felt);tabletop.position.set(t.x,.84,t.z);root.add(tabletop);
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(.17,.32,.75,10),brass);leg.position.set(t.x,.4,t.z);root.add(leg);api.circle(t.x,t.z,1.07);
    const label=api.label(t.label,'#e4c78c');label.position.set(t.x,1.65,t.z);label.scale.set(1.75,.38,1);root.add(label);
    const decoration=new THREE.Mesh(t.game==='wheel'?new THREE.TorusGeometry(.5,.06,7,24):new THREE.BoxGeometry(.22,.015,.32),brass);
    decoration.position.set(t.x,.93,t.z);decoration.rotation.x=t.game==='wheel'?Math.PI/2:0;root.add(decoration);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(1.02,.045,7,28),brass);rim.position.set(t.x,.91,t.z);rim.rotation.x=Math.PI/2;root.add(rim);
    const seatX=t.x+(t.x<x?.85:-.85),seatZ=t.z-1.35;
    const seat=new THREE.Mesh(new THREE.CylinderGeometry(.31,.31,.13,12),wood);seat.position.set(seatX,.52,seatZ);root.add(seat);
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.08,.23,.48,8),brass);base.position.set(seatX,.24,seatZ);root.add(base);api.circle(seatX,seatZ,.32);
    if(t.game!=='wheel')for(let i=0;i<3;i++){
      const chip=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.04,10),i%2?brass:wood);chip.position.set(t.x+.5,.94+i*.04,t.z+.2);root.add(chip);
    }
  });
  api.player.arcade=normalizeArcade(api.player.arcade,api.player.day);
  // Refund an unfinished legacy draw-poker stake when moving to Texas.
  if(api.player.arcade.pending?.game==='poker'){api.player.arcade.tokens+=api.player.arcade.pending.bet;api.player.arcade.pending=null;api.save();}
  const crowd=createArcadeCrowd(root,tables,api.circle);
  let open=false,tab='lobby',bet=10,buyIn=100,spinning=false,spinTimer=null,gameTimer=null,busy=false,focusBefore=null,lastNight=false;
  const seenCards=new Set();
  const panel=document.createElement('div');panel.id='arcade-modal';panel.hidden=true;
  panel.innerHTML='<section role="dialog" aria-modal="true" aria-labelledby="arcade-title"><header><div><small>TIỆM GIẢI TRÍ 41</small><h2 id="arcade-title">Một ván giữa phố</h2></div><button id="arcade-close" aria-label="Rời bàn chơi">✕</button></header><div id="arcade-wallet"></div><main></main><footer>Xu giải trí được tặng trong game, không mua bán hoặc đổi ra tiền. Không dùng số dư tiền sinh hoạt của nhân vật.</footer></section>';
  const wallet=panel.querySelector('#arcade-wallet'),main=panel.querySelector('main');
  const guide=document.createElement('button');guide.id='arcade-guide';guide.textContent='♠ Tiệm giải trí';guide.title='Dẫn tới cửa tiệm đối diện Ngõ 41';guide.onclick=()=>api.guide({x:SHOP.x,z:SHOP.doorZ-1.2,title:'Tiệm Giải Trí 41 · phía Nam phố'});
  document.body.append(panel,guide);
  const state=()=>api.player.arcade;
  const save=s=>{api.player.arcade=s;api.save();};
  const ptext=(txt,parent=main,tag='p')=>{const el=document.createElement(tag);el.textContent=txt;parent.append(el);return el;};
  const button=(txt,fn,parent=main)=>{const b=document.createElement('button');b.type='button';b.textContent=txt;b.onclick=fn;parent.append(b);return b;};
  function close(){if(!open)return;clearTimeout(spinTimer);clearTimeout(gameTimer);gameTimer=spinTimer=null;busy=spinning=false;open=false;panel.hidden=true;api.pause(false);if(focusBefore?.isConnected)focusBefore.focus();}
  panel.querySelector('#arcade-close').onclick=close;
  function show(game){
    if(!open&&!api.canOpen())return;
    if(!open){focusBefore=document.activeElement;open=true;api.pause(true);document.exitPointerLock?.();panel.hidden=false;}
    tab=game;render();panel.querySelector('#arcade-close').focus();
  }
  function cards(list,hidden=false,parent=main,namespace='hand'){
    const row=document.createElement('div');row.className='arcade-hand';parent.append(row);
    list.forEach((c,i)=>{
      const r=c%13+2,suit=['♣','♦','♥','♠'][Math.floor(c/13)],label=`${r===14?'A':r===13?'K':r===12?'Q':r===11?'J':r}${suit}`;
      const back=hidden===true||hidden==='dealer'&&i===1,key=`${namespace}-${i}-${back?'back':c}`;
      const fresh=!seenCards.has(key);seenCards.add(key);
      const card=document.createElement('span');card.className='arcade-card'+([1,2].includes(Math.floor(c/13))?' red':'')+(back?' card-back':'')+(fresh?' card-enter':'');card.style.setProperty('--deal-delay',`${i*80}ms`);
      card.setAttribute('aria-label',back?'Lá úp':label);
      const corner=ptext(back?'♠':label,card,'small');corner.className='card-corner';ptext(back?'♠':suit,card,'b').className='card-suit';
      ptext(back?'41':label,card,'small').className='card-corner card-bottom';row.append(card);
    });return row;
  }
  function wager(game){
    const row=document.createElement('div');row.className='arcade-bets';main.append(row);ptext('Xu cược mỗi ván:',row,'span');
    for(const value of [10,20,50]){const b=button(`${value} xu`,()=>{bet=value;render();},row);b.setAttribute('aria-pressed',String(bet===value));}
    const deal=button('Chia bài Blackjack',()=>{
      seenCards.clear();const next=startArcadeRound(state(),game,bet,shuffledDeck(random),random);next.guests=blackjackGuests(shuffledDeck(random));save(next);render();
    });deal.disabled=state().tokens<bet;
  }
  function receipt(game){
    const last=state().last;if(!last||last.game!==game)return;
    const result=ptext(`${last.message} Đã cược ${last.bet} · Nhận ${last.payout} · ${last.payout-last.bet>=0?'+':''}${last.payout-last.bet} xu.`,main,'div');result.className='arcade-result';result.setAttribute('role','status');
    if(last.dealer?.length){ptext(`Nhà cái · ${handValue(last.dealer).total}`);cards(last.dealer);}
    if(last.player?.length){ptext(game==='blackjack'?`Bạn · ${handValue(last.player).total}`:'Bộ bài kết thúc');cards(last.player);}
  }
  function random(){const word=new Uint32Array(1);crypto.getRandomValues(word);return word[0]/4294967296;}
  function render(){
    main.replaceChildren();
    panel.querySelector('section').classList.add('wide-table');
    panel.querySelector('#arcade-title').textContent={blackjack:'Bàn Blackjack',texas:'Bàn Texas Hold’em',wheel:'Bàn vòng quay'}[tab];
    wallet.textContent=`🪙 ${state().tokens.toLocaleString('vi-VN')} xu giải trí · ${state().rounds} ván đã chơi · ${state().wins} ván lãi xu`;
    const pending=state().pending;
    if(pending&&pending.game!==tab){
      ptext('Bạn còn một ván chưa kết thúc ở bàn khác. Hãy rời ghế và quay lại bàn đó để chơi tiếp.');
      button('Rời bàn',close);return;
    }
    if(state().claimDay<api.player.day)button('Nhận 100 xu của ngày hôm nay',()=>{save(claimArcadeTokens(state(),api.player.day));render();});
    if(tab==='texas'){
      renderHoldem({main,p:pending?.game==='texas'?pending:null,cards,button,text:ptext,tokens:state().tokens,buyIn,last:state().last,history:state().history,
        presentation:state().presentation,onPresentation:value=>{clearTimeout(gameTimer);gameTimer=null;save({...state(),presentation:normalizePresentation(value)});render();},
        onStep:()=>{if(state().pending?.game!=='texas'||state().pending.actor===0)return;save(holdemAction(state(),'tick',undefined,random));render();},
        setBuyIn:value=>{buyIn=value;render();},onNext:()=>{seenCards.clear();save(startHoldem(state(),buyIn,shuffledDeck(random)));render();},
        onAction:(action,target)=>{const before=state().pending;const next=holdemAction(state(),action,target);if(JSON.stringify(next.pending)===JSON.stringify(before)){api.toast?.('Mức tố chưa hợp lệ. Chọn tối thiểu hoặc all-in.');return;}save(next);render();}});
      scheduleTexas();return;
    }
    if(tab==='blackjack'){
      ptext('Blackjack · gần 21 hơn nhà cái',main,'h3');ptext('A tính 1 hoặc 11. Blackjack hai lá trả 3:2; thắng thường 1:1; hòa hoàn cược. Gấp đôi chỉ ở hai lá đầu và rút đúng một lá. Không tách đôi hoặc bảo hiểm.');
      if(pending){
        const table=document.createElement('div');table.className='blackjack-table';main.append(table);
        const house=document.createElement('div');house.className='blackjack-house';table.append(house);portrait(house,'Nhà cái',4);ptext(`Nhà cái · ${handValue([pending.dealer[0]]).total} + lá úp`,house);cards(pending.dealer,'dealer',house,'bj-dealer');
        renderGuests(table,false);
        const hero=document.createElement('div');hero.className='blackjack-hero';table.append(hero);ptext(`Bạn · ${handValue(pending.player).total}${handValue(pending.player).soft?' (mềm)':''} · Cược ${pending.bet} xu`,hero);cards(pending.player,false,hero,'bj-hero');
        button('Rút thêm',()=>blackjackMove('hit'));button('Dừng bài',()=>blackjackMove('stand'));
        const dbl=button('Gấp đôi',()=>blackjackMove('double'));dbl.disabled=pending.player.length!==2||state().tokens<pending.bet;
      }else {receipt('blackjack');if(state().last?.game==='blackjack')renderGuests(main,true);wager('blackjack');}
    }else{
      ptext('Vòng quay · mỗi ô có xác suất 1/16',main,'h3');ptext('10 xu/lượt · 8 ô không thưởng, 4 ô ×10 xu, 2 ô ×20 xu, 1 ô ×50 xu, 1 ô ×100 xu. Thưởng là số xu nhận lại sau khi đã trừ phí lượt quay.');
      const stage=document.createElement('div');stage.className='arcade-wheel-stage';stage.innerHTML='<b class="arcade-wheel-pointer">▼</b><div class="arcade-wheel"></div>';main.append(stage);
      const wheel=stage.querySelector('.arcade-wheel');
      WHEEL_PRIZES.forEach((prize,i)=>{const label=document.createElement('span');label.style.transform=`rotate(${i*22.5}deg) translateY(-112px)`;label.textContent=prize;wheel.append(label);});
      const outcome=pending?.index??(state().last?.game==='wheel'?state().last.index:0);
      const audience=document.createElement('div');audience.className='wheel-audience';main.append(audience);
      for(let i=0;i<3;i++){
        const person=document.createElement('div');audience.append(person);portrait(person,['Minh','Lan','Tuấn'][i],i+1,!!pending);
        ptext(`${['Minh','Lan','Tuấn'][i]} · ${(state().wheelGuests||[120,100,180])[i]} xu`,person,'strong');
        ptext(pending?'Cùng quay · đã góp 10 xu':state().last?.game==='wheel'?(state().last.payout?['Trúng rồi!','Chúc mừng nhé!','Hay quá!'][i]:['Lượt sau nhé.','Chưa trúng rồi.','Đến lượt ai nhỉ?'][i]):'Sẵn sàng cùng quay',person,'small');
        if(!pending&&state().last?.game==='wheel'&&state().last.payout)person.className='audience-cheer';
      }
      wheel.style.transform=`rotate(${-outcome*22.5}deg)`;
      if(pending){
        const animate=button('Tiếp tục lượt quay đã lưu',()=>spin());animate.disabled=spinning;
        if(!spinning)spin();
        function spin(){
          if(spinning)return;spinning=true;animate.disabled=true;animate.textContent='Đang quay…';
          wheel.classList.add('is-spinning');wheel.style.transition='none';wheel.style.transform='rotate(0deg)';
          requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!open||!spinning)return;wheel.style.transition='transform 3s cubic-bezier(.15,.7,.2,1)';wheel.style.transform=`rotate(${1800-outcome*22.5}deg)`;}));
          spinTimer=setTimeout(()=>{if(!open)return;save(finishWheel(state()));spinning=false;spinTimer=null;render();},3200);
        }
      }else{
        receipt('wheel');const b=button('Quay · 10 xu',()=>{save(startArcadeRound(state(),'wheel',10,shuffledDeck(random),random));render();});b.disabled=state().tokens<10;
      }
    }
    if(!pending&&state().tokens<10)ptext('Chưa đủ xu cho lượt mới. Bạn có thể nhận thêm 100 xu khi sang ngày mới trong game.');
    if(pending)ptext('Có thể rời bàn và quay lại. Ván đang chơi được giữ trong save, không chia lại để đổi kết quả.');
    renderLedger(main,state().history,tab,ptext);
  }
  function renderGuests(parent,reveal){
    if(!state().guests?.length)return;
    const row=document.createElement('div');row.className='blackjack-guests';parent.append(row);
    state().guests.forEach((guest,i)=>{const seat=document.createElement('div');row.append(seat);portrait(seat,guest.name,i+1);ptext(guest.name,seat,'strong');cards(reveal?guest.hand:guest.hand.slice(0,2),false,seat,`bj-guest-${i}`);ptext(reveal?`${guest.total} · ${guest.total>21?'Quá 21':guest.payout>10?'Thắng 10 xu':guest.payout===10?'Hòa':'Thua 10 xu'}`:'Bàn bên · cược 10 xu',seat,'small');if(reveal&&guest.dealer.length)ptext(`Nhà cái bàn bên: ${handValue(guest.dealer).total}`,seat,'small');});
  }
  function blackjackMove(action){
    if(busy)return;busy=true;main.querySelectorAll('button').forEach(b=>b.disabled=true);
    const status=ptext(action==='stand'?'Nhà cái đang lật bài…':'Đang chia lá tiếp theo…');status.className='thinking-status';
    gameTimer=setTimeout(()=>{gameTimer=null;busy=false;const guests=state().guests;const next=blackjackAction(state(),action);next.guests=guests;save(next);render();},550);
  }
  function scheduleTexas(){
    if(gameTimer||!open||state().pending?.game!=='texas'||state().pending.actor===0)return;
    const delay=texasDelay(state().pending,state().presentation);if(delay===null)return;
    gameTimer=setTimeout(()=>{gameTimer=null;if(!open)return;save(holdemAction(state(),'tick',undefined,random));render();},delay);
  }
  function near(){
    const c=api.context();if(c.night||c.riding)return null;
    const inside=Math.abs(c.x-x)<3.46&&c.z>front&&c.z<z+5;
    if(inside){const closest=tables.slice().sort((a,b)=>Math.hypot(c.x-a.x,c.z-a.z)-Math.hypot(c.x-b.x,c.z-b.z))[0];if(Math.hypot(c.x-closest.x,c.z-closest.z)<=2.45)return {game:closest.game,label:`Ngồi bàn ${closest.label}`};}
    return null;
  }
  window.addEventListener('keydown',e=>{
    if(!open)return;
    if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}
    else if(/^(Key[WASDFJPVBIONETLRQ]|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|ShiftLeft|ShiftRight|Space)$/.test(e.code)){e.stopImmediatePropagation();if(e.code==='Space'&&e.target?.tagName!=='BUTTON')e.preventDefault();}
    else if(e.code==='Tab'){
      const focusable=[...panel.querySelectorAll('button:not(:disabled),summary,input:not(:disabled)')];const first=focusable[0],last=focusable.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  },true);
  return {prompt:()=>near()?.label||'',interact:()=>{const n=near();if(!n)return false;show(n.game);return true;},update:()=>{
    const c=api.context();if(!c.night&&Math.hypot(c.x-x,c.z-z)<28)crowd.update(performance.now()/1000);
    const night=api.context().night;guide.hidden=night;if(lastNight!==night){root.visible=!night;if(night)close();lastNight=night;}
  },close};
}
