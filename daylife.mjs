import * as THREE from 'three';
import {dayOffers,normalizeDaylife,acceptDayJob,availableGoals,completeDayGoal,finishDayJob,jobReward,buildDayProject,matchesDayPhoto} from './daylife-state.mjs';
import {STORY_TITLE,neighborhoodChapter,chooseNeighborhoodEnding} from './neighborhood-story.mjs';
import {createPhotoMystery} from './photo-mystery.mjs';
import {createEastExploration} from './east-exploration.mjs';

export function createDaylife(api) {
  const root=new THREE.Group(); root.name='NeighborhoodDayLife'; api.world.add(root);
  const markerRoot=new THREE.Group(),projectRoot=new THREE.Group(); root.add(markerRoot,projectRoot);
  const registered=new Set(); let markerKey='',markers=[],mini=null,modalOpen=false,uiClock=0,lastTracker='',galleryKey='';
  const photoTextures=new Map();let mystery=null,east=null;
  const paper=document.createElement('canvas');paper.width=256;paper.height=144;
  const ink=paper.getContext('2d');ink.fillStyle='#dfd3b6';ink.fillRect(0,0,256,144);ink.fillStyle='#46594c';ink.textAlign='center';ink.font='bold 19px system-ui';ink.fillText('GÓC ẢNH CƯ DÂN',128,55);ink.font='14px system-ui';ink.fillText('Chụp một góc phố bằng phím P',128,88);ink.fillText('để góp ảnh cho nơi này',128,109);
  const emptyPhoto=new THREE.CanvasTexture(paper);emptyPhoto.colorSpace=THREE.SRGBColorSpace;
  const button=document.createElement('button'); button.id='daylife-button'; button.textContent='☀ Việc hôm nay (N)';
  const tracker=document.createElement('button'); tracker.id='daylife-tracker'; tracker.hidden=true;
  const overlay=document.createElement('div'); overlay.id='daylife-modal'; overlay.hidden=true;
  overlay.innerHTML='<section role="dialog" aria-modal="true" aria-labelledby="daylife-title"><header><small>MỘT NGÀY Ở PHÚ THƯỢNG</small><button id="daylife-close" aria-label="Đóng việc hôm nay">✕</button></header><h2 id="daylife-title"></h2><div id="daylife-content"></div></section>';
  document.body.append(button,tracker,overlay);
  const content=overlay.querySelector('#daylife-content'),title=overlay.querySelector('h2');
  const context=()=>api.context();
  const state=()=>api.player.daylife;
  const offer=()=>dayOffers(api.player.day).find(o=>o.id===state().active?.id);
  const commit=s=>{api.player.daylife=s;api.dirty();syncWorld();};
  const action=(label,fn,parent=content)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);parent.append(b);return b;};
  const text=(value,tag='p',parent=content)=>{const e=document.createElement(tag);e.textContent=value;parent.append(e);return e;};
  function open() {
    if (!modalOpen && !api.canOpen()) return false;
    if (!modalOpen) {modalOpen=true;api.pause(true);document.exitPointerLock?.();overlay.hidden=false;}
    content.replaceChildren();mini=null;return true;
  }
  function close() {if(!modalOpen)return;modalOpen=false;mini=null;overlay.hidden=true;api.pause(false);button.focus();}
  overlay.querySelector('#daylife-close').onclick=close;
  function board() {
    if(!open())return;
    title.textContent=`Ngày ${api.player.day} · Chuyện nhỏ của khu phố`;
    action('↗ Khám phá khu ven sông · tuyến vòng mới',()=>east.board());
    mystery.card();
    const chapter=neighborhoodChapter(state().story);
    const storyCard=document.createElement('article');storyCard.className='daylife-job neighborhood-story';content.append(storyCard);
    text(`${STORY_TITLE} · ${chapter.title}`,'h3',storyCard);
    text(chapter.text,'p',storyCard);text(chapter.objective,'small',storyCard);
    if(chapter.stage==='decision')for(const [key,label]of [['green','Góp vật liệu làm Góc xanh'],['heritage','Góp vật liệu dựng Góc ảnh']]){
      const choice=action(label,()=>{commit(chooseNeighborhoodEnding(state(),key));api.toast('Bà con đã dựng công trình trong Ngõ 41. Ghé xem thành quả của bạn.');board();},storyCard);
      choice.disabled=!!state().active;
    }
    if(chapter.stage==='decision'&&state().active)text('Khép lại công việc đang nhận trước khi chọn công trình.','small',storyCard);
    text(`Đã hoàn thành hôm nay: ${state().completed.length}/${dayOffers(api.player.day).length} · Tổng số việc: ${state().total} · Điểm đóng góp: ${state().points}`);
    if(state().active) {
      const o=offer();text(`Đang làm: ${o.title}`,'h3');
      availableGoals(state(),api.player.day).forEach(g=>text(`${g.action==='photo'?'Tìm cảnh: ':''}${g.title}`));
      if(!availableGoals(state(),api.player.day).length) action('Chọn cách nhận thưởng',resolve);
      action('Tiếp tục công việc',close);
      action('Trả lại việc · không nhận thưởng',()=>{commit({...state(),active:null});board();});
    } else {
      for(const o of dayOffers(api.player.day)) {
        const card=document.createElement('article');card.className='daylife-job';content.append(card);
        text(`${o.icon} ${o.title}`,'h3',card);text(o.story,'p',card);
        if(chapter.stage!=='finished'&&chapter.stage!=='decision')text(state().story.helped.includes(o.id)?'Đã giúp nhóm này · vẫn nhận thù lao bình thường':'Một nhóm chưa được giúp · tiến triển câu chuyện','small',card);
        text(`Thù lao gốc ${o.base.toLocaleString('vi-VN')}đ · +75–125 XP · 1–2 điểm đóng góp`,'small',card);
        const b=action(state().completed.includes(o.id)?'Đã làm hôm nay':'Nhận việc',()=>{commit(acceptDayJob(state(),o.id,api.player.day));close();api.toast(`Đã nhận: ${o.title}. Mở N để xem tiến độ; làm từng bước ngoài phố.`);},card);
        b.disabled=state().completed.includes(o.id)||mystery.active();
      }
      if(state().completed.length===dayOffers(api.player.day).length) text('Hôm nay đã đủ việc. Bạn có thể khám phá tự do hoặc bấm Kết ngày để mở tuyến và lời nhắn ngày mai.');
    }
    text('Xây một góc phố của mình','h3');
    for(const [key,label] of [['green','🌿 Góc xanh trong ngõ'],['heritage','📷 Góc ảnh cư dân']]) {
      const level=state().projects[key],cost=level+2;
      const b=action(`${label} · Cấp ${level}/3${level<3?` · Xây tiếp: ${cost} điểm`:' · Hoàn thiện'}`,()=>{commit(buildDayProject(state(),api.player.day,key));api.toast('Công trình đã thay đổi ngay trong Ngõ 41.');board();});
      b.disabled=level>=3||state().points<cost;
    }
    text('Các công trình và điểm tích lũy được giữ qua ngày mới.','small');
    if(state().gallery.length){
      text('Ảnh đã góp cho khu phố','h3');
      const gallery=document.createElement('div');gallery.className='daylife-gallery';content.append(gallery);
      state().gallery.forEach((src,i)=>{const img=document.createElement('img');img.src=src;img.alt=`Ảnh khu phố đã chụp ${i+1}`;gallery.append(img);});
    }
    overlay.querySelector('#daylife-close').focus();
  }
  button.onclick=board;tracker.onclick=board;
  function resolve() {
    if(!open())return;
    title.textContent='Xong việc rồi · chọn phần thưởng';
    const o=offer();if(!o){board();return;}
    text(o.kind==='delivery'?(state().active.remaining>0?'Hai phần xôi đã tới nơi còn nóng.':'Đơn giao đã xong nhưng xôi nguội: vẫn có thù lao, mất thưởng đúng hẹn.'):o.kind==='courier'?'Ba hộ đã ký nhận đủ. Sổ giao trở về, tiền công phụ thuộc vào độ nguyên vẹn của hàng.':o.kind==='cleanup'?'Lối đi đã sạch. Cô Hoa nhận phần rác bạn phân loại để chuyển đi.':'Bộ ảnh đã đủ cho buổi gặp mặt cư dân.');
    text(`Chất lượng ${Math.round(state().active.quality)}% · lựa chọn này sẽ được cộng vào điểm xây dựng khu phố.`);
    for(const [choice,label] of [['income','Giữ đủ thù lao'],['fund','Góp nửa thù lao vào quỹ khu phố']]) {
      const r=jobReward(state(),api.player.day,choice);
      action(`${label} · ${r.coins.toLocaleString('vi-VN')}đ + ${r.xp} XP + ${r.points} điểm`,()=>{
        const result=finishDayJob(state(),api.player.day,choice);if(!result.reward)return;
        commit(result.state);api.reward(result.reward,o.kind);close();api.toast(`✓ ${o.title}: +${r.coins.toLocaleString('vi-VN')}đ, +${r.xp} XP, +${r.points} điểm. Mở N để xây góc phố hoặc nhận việc khác.`);
      });
    }
  }
  function completed(id,quality) {commit(completeDayGoal(state(),id,api.player.day,quality));close();if(!availableGoals(state(),api.player.day).length)resolve();}
  function pack(goal) {
    if(!open())return;
    title.textContent='Gói xôi · chốt nhịp khi vạch vào vùng xanh';
    text('Ba nhịp: đong nếp → thêm đỗ → buộc gói. Bấm nút hoặc Space. Càng gần giữa vùng xanh, phần xôi càng gọn. Có thể đóng và thử lại.');
    const track=document.createElement('div');track.className='daylife-timing';track.innerHTML='<span class="daylife-zone"></span><i></i>';content.append(track);
    const label=text('Nhịp 1/3');
    mini={kind:'pack',round:0,score:0,start:performance.now(),needle:track.querySelector('i'),label,goal};
    action('Chốt nhịp (Space)',hitPack);
  }
  function hitPack() {
    if(mini?.kind!=='pack')return;
    const phase=((performance.now()-mini.start)/(1500-mini.round*180))%1;
    mini.score+=Math.max(15,100-Math.abs(phase-.5)*200);
    mini.round++;mini.start=performance.now();
    if(mini.round===3){const q=Math.round(mini.score/3);completed(mini.goal.id,q);api.toast(`Đã gói hai phần xôi · ${q}% chất lượng. 110 giây thưởng nóng bắt đầu; tự chọn thứ tự hai điểm giao.`);}
    else mini.label.textContent=`Nhịp ${mini.round+1}/3 · Chất lượng tạm ${Math.round(mini.score/mini.round)}%`;
  }
  function sort(goal) {
    if(!open())return;
    title.textContent='Phân loại để khép lại ca dọn ngõ';
    const items=[['Chai nhựa sạch','Tái chế'],['Lá cây','Hữu cơ'],['Khăn giấy đã dùng','Còn lại']];
    const order=api.player.day%3;for(let i=0;i<order;i++)items.push(items.shift());
    mini={kind:'sort',items,index:0,mistakes:0};
    const label=text(items[0][0],'h3'),feedback=text('Chọn đúng thùng. Chọn nhầm có thể sửa, nhưng giảm chất lượng.');
    for(const type of ['Tái chế','Hữu cơ','Còn lại']) action(type,()=>{
      if(mini?.kind!=='sort')return;
      if(type!==items[mini.index][1]){mini.mistakes++;feedback.textContent='Chưa đúng thùng. Thử lại, mỗi lần nhầm giảm 10 điểm chất lượng.';return;}
      mini.index++;
      if(mini.index===items.length)completed(goal.id,Math.max(30,100-mini.mistakes*10));
      else {label.textContent=items[mini.index][0];feedback.textContent='Đúng rồi. Món tiếp theo:';}
    });
  }
  function album(goal) {
    if(!open())return; title.textContent='Biên tập bộ ảnh cho ngày hội';
    text(api.player.day%2?'Lời nhắn: “Mở đầu bằng nơi trẻ em đến lớp; kết chuyện ở mái cổng làng.”':'Lời nhắn: “Theo chân người bán hoa, rồi dừng chân bên hồ.”');
    const o=offer();
    action(o.goals[0].title+' → '+o.goals[1].title,()=>completed(goal.id,state().active.quality));
    action(o.goals[1].title+' → '+o.goals[0].title,()=>{state().active.quality=Math.max(30,state().active.quality-15);api.dirty();text('Thứ tự chưa khớp lời nhắn. Đọc lại gợi ý; chất lượng bộ ảnh giảm 15 điểm.');});
  }
  function pickup(goal){
    if(!open())return;title.textContent='Sổ giao · một vòng ba khu phố';
    text('Ba bưu kiện đã dán nhãn. Bạn có thể giao theo thứ tự bất kỳ; chỉ dẫn ngoài phố sẽ tìm điểm gần nhất theo đường đi. Xuống xe trước khi giao.');
    for(const parcel of offer().goals.filter(g=>g.action==='receipt'))text(parcel.recipient+' — '+parcel.address);
    text('Không có đồng hồ đếm ngược. Giảm tốc trước cua để giữ chất lượng hàng; đến mỗi nhà, kiểm tra người nhận trên nhãn.');
    action('Nhận đủ ba kiện · bắt đầu tuyến',()=>{completed(goal.id);api.toast('Đã nhận bưu kiện. Tự chọn tuyến; mở N để xem các địa chỉ.');});
  }
  function receipt(goal){
    if(!open())return;title.textContent=goal.address;
    text('Nhãn bưu kiện: '+goal.recipient+' — '+goal.address);
    text('Đối chiếu người nhận trước khi bàn giao.');
    const parcels=offer().goals.filter(g=>g.action==='receipt');
    const offset=(api.player.day+parcels.indexOf(goal))%parcels.length;
    for(let i=0;i<parcels.length;i++){
      const recipient=parcels[(i+offset)%parcels.length].recipient;
      action('Giao cho '+recipient,()=>{
        if(recipient===goal.recipient){completed(goal.id);api.toast('✓ '+recipient+' đã ký nhận. Tiếp tục tuyến, rồi mang sổ về gánh xôi.');}
        else{state().active.quality=Math.max(40,state().active.quality-5);api.dirty();text('Sai người nhận. Hãy đọc nhãn; chất lượng dịch vụ giảm 5 điểm.');}
      });
    }
  }
  function nearest() {
    const c=context();if(c.night||c.riding)return null;
    return availableGoals(state(),api.player.day).map(g=>({...g,d:Math.hypot(c.x-g.x,c.z-g.z)})).sort((a,b)=>a.d-b.d)[0];
  }
  function prompt() {
    if(east.prompt())return east.prompt();
    if(mystery.prompt())return mystery.prompt();
    const g=nearest();return g&&g.d<3.1?(g.action==='photo'?'P · Hướng máy vào cảnh rồi chụp ảnh':g.title):'';
  }
  function interact() {
    if(east.interact())return true;
    if(mystery.interact())return true;
    const g=nearest();if(!g||g.d>=3.1)return false;
    if(g.action==='pickup')pickup(g);
    else if(g.action==='receipt')receipt(g);
    else if(g.action==='return')completed(g.id);
    else if(g.action==='pack')pack(g);
    else if(g.action==='sort')sort(g);
    else if(g.action==='album')album(g);
    else if(g.action==='photo')api.toast('Hướng nhìn vào cảnh trong lời nhắn rồi bấm P, trong phạm vi 6 m.');
    else {completed(g.id);api.toast(g.action==='litter'?'Đã gom một điểm rác. Còn lại được ghi trên thẻ công việc.':'Đã giao một phần xôi. Điểm còn lại do bạn tự chọn tuyến.');}
    return true;
  }
  function photo() {
    if(east.photo())return true;
    if(context().night||offer()?.kind!=='album')return false;
    const c=context();if(c.riding){api.toast('Xuống xe trước khi chụp ảnh công việc.');return true;}
    const targets=availableGoals(state(),api.player.day).filter(g=>g.action==='photo');
    const match=targets.find(g=>matchesDayPhoto(c,g));
    if(match){
      const snapshot=api.snapshot?.();
      if(snapshot)state().gallery=[...state().gallery,snapshot].slice(-2);
      completed(match.id);api.toast('📷 Đã ghi ảnh đúng hướng. Ảnh được giữ để treo ở Góc ảnh trong ngõ.');
    }
    else api.toast(targets.length?'Chưa đúng góc: tìm địa điểm trong lời nhắn, đứng trong 6 m và hướng máy vào cảnh.':'Đã đủ ảnh. Mang bộ ảnh về quán trà cô Hoa.');
    return true;
  }
  function clearMarkers() {
    markerRoot.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(o.material.userData.daylifeOwned)o.material.dispose();}});
    markerRoot.clear();markers=[];
  }
  function syncWorld() {
    mystery?.syncWorld();
    const key=`${api.player.day}/${state().active?.id||''}`;
    if(key!==markerKey){
      markerKey=key;clearMarkers();
      for(const g of offer()?.goals||[]) {
        const group=new THREE.Group();group.position.set(g.x,.16,g.z);
        const mat=new THREE.MeshBasicMaterial({color:g.action==='litter'?0xb0c38b:0xf1c36c});mat.userData.daylifeOwned=true;
        const pin=new THREE.Mesh(new THREE.OctahedronGeometry(.16),mat);pin.position.y=.8;group.add(pin);
        if(g.action==='litter'){
          const litter=new THREE.Mesh(g.id==='litter1'?new THREE.CylinderGeometry(.07,.07,.32,7):new THREE.BoxGeometry(.34,.025,.25),mat);
          litter.position.y=g.id==='litter1'?.18:.04;group.add(litter);
        }
        markerRoot.add(group);markers.push({g,group});
      }
    }
    const active=new Set(availableGoals(state(),api.player.day).map(g=>g.id));
    markers.forEach(({g,group})=>group.visible=active.has(g.id));
    projectRoot.children.forEach(o=>o.visible=o.userData.level<=state().projects[o.userData.project]);
    const images=state().gallery;
    const nextGalleryKey=images.join('|');
    if(nextGalleryKey!==galleryKey){
      galleryKey=nextGalleryKey;
      // Keep only the two small photos in the save and on the GPU.
      for(const [url,texture] of photoTextures)if(!images.includes(url)){texture.dispose();photoTextures.delete(url);}
      projectRoot.children.filter(o=>o.userData.project==='heritage').forEach(o=>{
        const url=images[(o.userData.level-1)%Math.max(1,images.length)];
        if(url&&!photoTextures.has(url)){const t=new THREE.TextureLoader().load(url);t.colorSpace=THREE.SRGBColorSpace;photoTextures.set(url,t);}
        o.userData.photo.material.map=url?photoTextures.get(url):emptyPhoto;o.userData.photo.material.needsUpdate=true;
      });
    }
    for(const o of projectRoot.children)if(o.visible&&o.userData.project==='green'&&!registered.has(o.uuid)) {registered.add(o.uuid);api.collider(o.position.x,o.position.z,.32);}
  }
  const potMat=new THREE.MeshStandardMaterial({color:0x88674e,roughness:.9}),leafMat=new THREE.MeshStandardMaterial({color:0x4d6740,roughness:1});
  // Physical address plaques identify the new route without floating through walls.
  const postMat=new THREE.MeshStandardMaterial({color:0x4c625c,roughness:.72,metalness:.15});
  for(const goal of dayOffers(1).find(o=>o.id==='courier').goals.filter(g=>g.action==='receipt')){
    const post=new THREE.Group();post.position.set(goal.x,.08,goal.z);post.name='CourierAddressPost';
    const tube=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,1.45,8),postMat);tube.position.y=.72;post.add(tube);
    const cap=new THREE.Mesh(new THREE.SphereGeometry(.11,10,6),postMat);cap.scale.y=.45;cap.position.y=1.49;post.add(cap);
    const canvas=document.createElement('canvas');canvas.width=384;canvas.height=160;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#e4dbc6';ctx.fillRect(0,0,384,160);ctx.strokeStyle='#4c625c';ctx.lineWidth=12;ctx.strokeRect(6,6,372,148);ctx.fillStyle='#273d36';ctx.textAlign='center';ctx.font='bold 30px system-ui';ctx.fillText(goal.recipient,192,65);ctx.font='22px system-ui';ctx.fillText(goal.address,192,109);
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
    const plaque=new THREE.Mesh(new THREE.PlaneGeometry(.94,.39),new THREE.MeshStandardMaterial({map:tex,roughness:1,side:THREE.DoubleSide}));plaque.position.set(0,1.16,.055);post.add(plaque);
    if(goal.id!=='parcel1')post.rotation.y=-Math.PI/2;
    root.add(post);api.collider(goal.x,goal.z,.16);
  }
  for(let level=1;level<=3;level++){
    const plant=new THREE.Group();plant.position.set(-65,-0.02,-15-level*4.1);plant.userData={project:'green',level};
    const pot=new THREE.Mesh(new THREE.CylinderGeometry(.3,.24,.46,10),potMat);pot.position.y=.23;plant.add(pot);
    const leaf=new THREE.Mesh(new THREE.IcosahedronGeometry(.36,1),leafMat);leaf.scale.y=1.5;leaf.position.y=.83;plant.add(leaf);projectRoot.add(plant);
    const plaque=new THREE.Group();plaque.position.set(-64.25,2.05,-14-level*4.1);plaque.userData={project:'heritage',level};
    const frame=new THREE.Mesh(new THREE.BoxGeometry(.08,1.02,1.64),potMat);plaque.add(frame);
    const photo=new THREE.Mesh(new THREE.PlaneGeometry(1.45,.82),new THREE.MeshBasicMaterial({map:emptyPhoto}));photo.rotation.y=-Math.PI/2;photo.position.x=-.05;plaque.add(photo);plaque.userData.photo=photo;
    const label=api.label(['ẢNH KHU PHỐ · CƯ DÂN GÓP SỨC','GÓC ẢNH · MỘT NGÀY PHÚ THƯỢNG','CẢM ƠN NHỮNG NGƯỜI GIỮ PHỐ'][level-1],'#c7b889');
    label.scale.set(1.4,.38,1);label.position.y=.65;plaque.add(label);projectRoot.add(plaque);
  }
  function update(dt) {
    const c=context();root.visible=!c.night;button.hidden=c.night;
    if(c.night){if(modalOpen)close();tracker.hidden=true;return;}
    if(state().day!==api.player.day){commit(normalizeDaylife(state(),api.player.day));}
    const a=state().active;
    if(a?.id==='delivery'&&a.done.includes('pack')&&!c.paused){
      a.remaining=Math.max(0,a.remaining-dt);
      if(c.cargoStress>0)a.quality=Math.max(0,a.quality-c.cargoStress*dt);
    }
    if(a?.id==='courier'&&a.done.includes('pickup')&&!c.paused&&c.cargoStress>0)a.quality=Math.max(40,a.quality-c.cargoStress*dt);
    if(mini?.kind==='pack')mini.needle.style.left=`${((performance.now()-mini.start)/(1500-mini.round*180)%1)*100}%`;
    uiClock+=dt;if(uiClock<.2)return;uiClock=0;
    const targets=availableGoals(state(),api.player.day),g=nearest();
    markers.forEach(({g:goal,group})=>{group.visible=targets.some(t=>t.id===goal.id)&&(goal.action!=='photo'||Math.hypot(c.x-goal.x,c.z-goal.z)<12);});
    tracker.hidden=!a&&!mystery.active();document.body.classList.toggle('daylife-active',!!a||mystery.active());
    const quest=document.getElementById('quest-text'),hint=document.getElementById('quest-sub-hint'),fill=document.getElementById('quest-fill');
    const heading=a?`Đang làm: ${offer().title}`:`Ngày hội khu phố · ${state().completed.length}/${dayOffers(api.player.day).length} việc hôm nay`;
    const chapter=neighborhoodChapter(state().story);
    const guidance=a?(g?g.title:'Mở N để chọn phần thưởng'):chapter.stage==='decision'?'Cô Hoa đang đợi ý kiến của bạn. Mở N để chọn Góc xanh hoặc Góc ảnh cho Ngõ 41.':chapter.stage!=='finished'?`Chuyện “${STORY_TITLE}”: đã giúp ${chapter.progress}/3 nhóm cư dân. Mở N đọc lời nhờ và chọn một việc khác nhau.`:state().completed.length===dayOffers(api.player.day).length?'Kết ngày để có tuyến mới; điểm và công trình được giữ lại.':'Nhấn N chọn giao xôi, chuyển bưu kiện Phú Xá, dọn ngõ hoặc làm bộ ảnh. Nhiệm vụ văn hóa cũ vẫn ở Kịch bản (J).';
    if(quest&&quest.textContent!==heading)quest.textContent=heading;
    if(hint&&hint.textContent!==guidance)hint.textContent=guidance;
    if(!a&&mystery.active()){
      const status=`🔎 Tấm ảnh trước cửa · ${mystery.state().clues.length}/3 manh mối\n${mystery.hint()}\nN: mở sổ · E: hỏi chuyện khi ở gần · Xuống xe để tương tác`;
      if(status!==lastTracker){tracker.textContent=status;lastTracker=status;}
      if(hint)hint.textContent=mystery.hint();
      if(quest)quest.textContent='Đang điều tra: Tấm ảnh trước cửa';
    }
    if(fill)fill.style.width=`${Math.round((a?a.done.length/(offer().goals.length||1):state().completed.length/dayOffers(api.player.day).length)*100)}%`;
    if(fill&&!a&&mystery.active()){const s=mystery.state();fill.style.width=`${Math.round((s.clues.length+Number(s.deduced)+Number(s.consent))/6*100)}%`;}
    if(a){const o=offer();const status=`${o.icon} ${o.title} · ${a.done.length}/${o.goals.length}\n${g?g.title+' · '+Math.round(g.d)+' m':'Xong việc · mở N chọn thưởng'}${a.id==='delivery'&&a.done.includes('pack')?'\n'+(a.remaining>0?Math.ceil(a.remaining)+' giây thưởng nóng':'Đã nguội · vẫn có thù lao')+' · Hàng '+Math.round(a.quality)+'%':''}${a.id==='courier'?'\nHàng nguyên vẹn '+Math.round(a.quality)+'% · Không giới hạn thời gian':''}\nN: xem việc · E: tương tác · P: chụp ảnh`;
      if(status!==lastTracker){tracker.textContent=status;lastTracker=status;}}
  }
  window.addEventListener('keydown',e=>{
    if(e.code==='KeyN'&&!e.repeat&&!context().night){e.preventDefault();e.stopImmediatePropagation();modalOpen?close():board();}
    else if(modalOpen&&e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}
    else if(modalOpen&&e.code==='Space'&&mini?.kind==='pack'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)hitPack();}
    else if(modalOpen&&/^(Key[WASDFJPVBIOETLRQ]|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|ShiftLeft|ShiftRight|Space)$/.test(e.code)){e.stopImmediatePropagation();if(e.code==='Space')e.preventDefault();}
  },true);
  api.player.daylife=normalizeDaylife(api.player.daylife,api.player.day);
  east=createEastExploration({state,commit,open,close,content,title,text,action,context,player:api.player,dirty:api.dirty,toast:api.toast,reward:api.reward,snapshot:api.snapshot,guide:api.guide});
  mystery=createPhotoMystery({state,commit,open,close,content,title,text,action,context,world:root,toast:api.toast,reward:api.reward});syncWorld();
  return {update,prompt,interact,photo,board,close,explore:()=>east.board(),dayChanged:()=>{commit(normalizeDaylife(state(),api.player.day));},guidance:()=>{const g=mystery.nearest()||nearest();return g&&g.action!=='photo'?{x:g.x,z:g.z,title:g.title}:null;}};
}
