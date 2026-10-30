import * as THREE from 'three';
import {MYSTERY_TITLE,MYSTERY_CLUES,MYSTERY_ENDINGS,normalizePhotoMystery,startPhotoMystery,mysteryTargets,collectMysteryClue,deduceMystery,recordMysteryConsent,finishPhotoMystery,mysteryHint} from './photo-mystery-state.mjs';

// Uses the existing daylife dialog and pause/save path. No extra RAF, NPC,
// light source or fullscreen overlay is created for this quest.
export function createPhotoMystery(api) {
  const {text,action,content,title}=api;
  const state=()=>normalizePhotoMystery(api.state().mystery);
  const commit=mystery=>api.commit({...api.state(),mystery});
  const active=()=>state().started&&!state().ending&&!state().suspended;
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=384;
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const display=new THREE.Group();display.name='PhotoMysteryExhibit';display.position.set(-64.25,1.8,-30.4);
  const frame=new THREE.Mesh(new THREE.BoxGeometry(.08,1.08,1.88),new THREE.MeshStandardMaterial({color:0x64513b,roughness:.92}));
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1),new THREE.MeshStandardMaterial({map:texture,roughness:1}));panel.rotation.y=-Math.PI/2;panel.position.x=-.045;display.add(frame,panel);api.world.add(display);
  let lastEnding;
  function syncWorld(){
    const ending=state().ending;display.visible=!!ending;
    if(ending===lastEnding)return;lastEnding=ending;
    if(!ending)return;
    const c=canvas.getContext('2d');c.fillStyle='#ded1ad';c.fillRect(0,0,768,384);c.strokeStyle='#736342';c.lineWidth=8;c.strokeRect(16,16,736,352);
    c.textAlign='center';c.fillStyle='#304036';c.font='bold 37px system-ui';c.fillText('TẤM ẢNH TRƯỚC CỬA',384,82);
    c.font='30px system-ui';c.fillText(MYSTERY_ENDINGS[ending].title,384,146);
    const lines=ending==='named'?['Bà Mai · người thợ may ở cửa số 41 cũ','Lời kể được gia đình đồng ý chia sẻ.','Một nghề cũ, một người được nhớ tên.']:ending==='anonymous'?['Một người thợ may của khu phố','Giữ lại câu chuyện, không công bố tên riêng.','Ảnh gốc trở về với gia đình.']:['Ảnh gốc đã trở về với gia đình.','Khung này dành cho một câu chuyện khác.','Không phải kỷ niệm nào cũng cần trưng bày.'];
    c.font='26px system-ui';lines.forEach((line,i)=>c.fillText(line,384,224+i*44));texture.needsUpdate=true;
  }
  function nearest(){
    const c=api.context();if(c.night||c.riding||api.state().active)return null;
    return mysteryTargets(state()).map(g=>({...g,d:Math.hypot(c.x-g.x,c.z-g.z)})).sort((a,b)=>a.d-b.d)[0]||null;
  }
  function notebook(){
    if(!api.open())return;title.textContent=MYSTERY_TITLE+' · Sổ manh mối';
    const s=state();text('Không có đồng hồ đếm ngược. Đóng sổ để tiếp tục đi lại; các lời kể đã thu thập luôn được giữ.');
    if(s.clues.includes('back')){
      const evidence=document.createElement('article');evidence.className='mystery-evidence';content.append(evidence);
      text('Ảnh cũ: một người phụ nữ đứng cạnh cửa gỗ có dấu bông sen. Trên người là áo cúc lệch, tay cầm kéo.','p',evidence);
      text('Mặt sau: “Mai — trước cửa số 41”. Không có tên phố hoặc năm.','small',evidence);
      const details=document.createElement('details');evidence.append(details);const summary=document.createElement('summary');summary.textContent='Quan sát kỹ những chi tiết dễ bỏ qua';details.append(summary);
      text('Chiếc kéo không giống vật dụng của học sinh. Dãy cúc lệch có thể thuộc một tạp dề. Số 41 có thể đã thay đổi theo thời gian; chưa thể dùng nó để đoán thẳng địa điểm.','p',details);
    }
    for(const id of s.clues){const card=document.createElement('article');card.className='mystery-clue';content.append(card);text(MYSTERY_CLUES[id].title,'h3',card);text(MYSTERY_CLUES[id].text,'p',card);}
    if(!s.clues.length)text('Sổ còn trống. Tới hiệu sách bác Sơn để xem ảnh và nhận lời nhắn.');
    if(s.clues.length===3&&!s.deduced){
      text('Người và địa chỉ nào phù hợp với cả ba manh mối?','h3');
      const feedback=text('Chọn một giả thuyết. Nếu chưa khớp, bạn được đọc lại và sửa mà không mất tiền.');feedback.setAttribute('role','status');
      for(const [answer,label]of [['school','Một học sinh trước cổng trường số 41'],['mai','Bà Mai, người thợ may · cửa số 41 cũ bên đường đê'],['hoa','Cô Hoa, người bán trà · quán hiện tại']])action(label,()=>{
        const result=deduceMystery(state(),answer);feedback.textContent=result.feedback;
        if(result.ok){commit(result.state);api.close();api.toast(result.feedback);}
      });
    }else text(mysteryHint(s));
    action('Gấp sổ · tiếp tục ngoài phố',api.close);
  }
  function card(){
    const s=state(),card=document.createElement('article');card.className='daylife-job mystery-story';content.append(card);
    text('🔎 '+MYSTERY_TITLE,'h3',card);text(mysteryHint(s),'p',card);
    if(!s.started){
      text('Một câu chuyện độc lập: quan sát, hỏi hai cư dân theo thứ tự tùy chọn, đối chiếu manh mối rồi quyết định cùng gia đình. Không cần tiền vào cửa.','small',card);
      const b=action('Nhận lời tìm người trong ảnh',()=>{if(api.state().active)return;commit(startPhotoMystery(state()));api.close();api.toast('Tới hiệu sách bác Sơn trên Phú Xá. Mở N để xem lại lời nhờ.');},card);b.disabled=!!api.state().active;
      if(api.state().active)text('Hoàn thành hoặc trả công việc đang nhận để bắt đầu chuyến điều tra.','small',card);
    }else{
      text(`${s.clues.length}/3 manh mối · ${s.ending?'Đã khép lại':s.consent?'Đã có ý kiến gia đình':s.deduced?'Đã đối chiếu':'Đang tìm hiểu'}`,'small',card);
      action('Mở sổ manh mối',notebook,card);
      if(!s.ending){
        const b=action(s.suspended?'Tiếp tục điều tra':'Tạm gác điều tra · giữ manh mối',()=>{
          if(s.suspended&&api.state().active)return;
          commit({...state(),suspended:!s.suspended});api.close();
          api.toast(s.suspended?'Đã tiếp tục điều tra.':'Đã giữ sổ; bạn có thể nhận việc ngày hoặc khám phá tự do.');
        },card);b.disabled=s.suspended&&!!api.state().active;
      }
    }
  }
  function interact(){
    const g=nearest();if(!g||g.d>=3.1)return false;
    if(!api.open())return false;
    if(g.id==='archive'){
      title.textContent='Hiệu sách bác Sơn · một tấm ảnh lẫn trong sách';
      text('Bác Sơn: “Tôi mua lại một thùng sách cũ, thấy ảnh này kẹp giữa trang. Tôi tưởng chụp ở trường số 41, nhưng không chắc. Nếu tìm được gia đình, hỏi họ có muốn góp một bản sao cho góc ngõ không.”');
      text('Bạn lật ảnh: một người cầm kéo, áo cúc lệch, cạnh cửa có dấu bông sen. Mặt sau ghi “Mai — trước cửa số 41”.');
      action('Ghi nhận tấm ảnh và hai địa chỉ để hỏi',()=>{commit(collectMysteryClue(state(),'back'));api.close();api.toast('Sổ có ảnh và lời ghi. Hỏi cô Liên ở Phú Gia hoặc chú Bình bên đường đê theo thứ tự bạn chọn.');});
    }else if(g.id==='tailor'||g.id==='water'){
      title.textContent=g.id==='tailor'?'Tiệm may cô Liên · đường cúc lệch':'Quán nước chú Bình · số nhà cũ';
      text(MYSTERY_CLUES[g.id].text);
      text(g.id==='tailor'?'Cô Liên mở hộp kim chỉ, chỉ cho bạn hàng cúc lệch trên tạp dề đang dùng. “Nhìn đúng chiếc áo thôi chưa đủ, nên hỏi người nhớ dãy nhà cũ.”':'Chú Bình chỉ dọc đường đê: “Đừng bám mỗi con số trên ảnh. Người và nghề mới là thứ giúp tìm đúng nhà.”');
      action('Ghi lời kể vào sổ',()=>{commit(collectMysteryClue(state(),g.id));api.close();api.toast(state().clues.length===3?'Đủ ba manh mối. Mở N → sổ manh mối để đối chiếu.':'Đã lưu lời kể. Bạn có thể hỏi người còn lại trước khi kết luận.');});
    }else if(g.id==='consent'){
      title.textContent='Cô Liên · hỏi trước khi chia sẻ';
      text('Cô Liên: “Đúng là mẹ tôi. Tôi muốn giữ ảnh gốc và chữ phía sau cho gia đình. Nếu treo một bản sao kể về nghề, có thể ghi tên mẹ; cũng có thể bỏ tên. Nếu thấy không phù hợp, cứ mang ảnh về cho tôi, đừng treo cũng được.”');
      action('Ghi lại mong muốn của gia đình',()=>{commit(recordMysteryConsent(state()));api.close();api.toast('Đã có ý kiến cô Liên. Trở về quán trà cô Hoa để bàn cách khép lại câu chuyện.');});
    }else{
      title.textContent='Quán trà cô Hoa · chọn cách giữ câu chuyện';
      text('Ảnh gốc sẽ về với cô Liên trong cả ba lựa chọn. Mọi phương án đều có cùng phần thưởng: 150 XP và 2 điểm đóng góp. Không có đáp án kiếm được nhiều tiền hơn.');
      for(const [id,label]of [['named','Treo bản sao và ghi tên bà Mai'],['anonymous','Chỉ kể về nghề, không công bố tên'],['family','Trả ảnh về gia đình, không treo ảnh']])action(label,()=>{
        const result=finishPhotoMystery(state(),id);if(!result.reward)return;
        api.commit({...api.state(),mystery:result.state,points:api.state().points+result.reward.points});
        api.reward(result.reward,'album');api.close();api.toast('Đã khép lại: '+MYSTERY_ENDINGS[id].title+'. Ghé cuối Ngõ 41 để đọc lời nhắn.');
      });
    }
    content.querySelector('button')?.focus();
    return true;
  }
  return {active,state,card,notebook,nearest,interact,syncWorld,prompt:()=>{const g=nearest();return g&&g.d<3.1?g.title:'';},hint:()=>mysteryHint(state())};
}
