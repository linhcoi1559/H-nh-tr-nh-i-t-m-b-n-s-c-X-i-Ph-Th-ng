import {normalizeNeighborhoodStory,recordNeighborhoodHelp} from './neighborhood-story.mjs';
import {normalizePhotoMystery} from './photo-mystery-state.mjs';
import {normalizeEastExploration} from './east-exploration-state.mjs';
const clamp = (n,a,b) => Math.max(a,Math.min(b,Number(n)||0));
let cachedDay=0,cachedOffers=null;
export function dayOffers(day = 1) {
  if(cachedOffers&&cachedDay===day)return cachedOffers;
  const odd = day % 2 === 1;
  const drop = odd ? [[-2.2,8.2,'Cổng trường số 41'],[-52.5,-5.6,'Quán trà cô Hoa']] : [[32,-5.5,'Tổ trưởng ngã ba 68'],[134,-7,'Chợ hoa']];
  const photos = odd ? [[-2.2,8.2,9.5,20.3,'Hàng rào vàng, nơi học sinh đến lớp'],[-153,8,-153,-10.5,'Mái cổng làng phía vườn đào']] : [[134,-7,135,-10.3,'Những sạp hoa ở đầu Đông'],[128,16,145,24,'Mặt hồ trong công viên']];
  const offers = [
    { id:'delivery',title:odd?'Chuyến xôi đầu ngõ':'Đơn hàng chợ sớm',icon:'🍙',kind:'delivery',story:'Cô Hòa nhận hai đơn cùng lúc. Tự chọn thứ tự giao, giữ xôi nóng và đi xe cẩn thận khi ôm cua.',base:26000,
      goals:[{id:'pack',x:-10.5,z:6.2,title:'Gói hai phần xôi tại gánh trước cổng trường',action:'pack'},...drop.map(([x,z,title],i)=>({id:`drop${i}`,x,z,title:`Giao xôi: ${title}`,action:'drop'}))]},
    { id:'cleanup',title:odd?'Trả lại lối đi sạch':'Ca trực ngõ xanh',icon:'🌿',kind:'cleanup',story:'Lá và bao bì đang lấp lối đi. Gom đủ ba điểm, mang về quán trà và phân loại; cảnh sẽ sạch đi ngay sau mỗi lần nhặt.',base:22000,
      goals:[...[-48,-56,-61].map((x,i)=>({id:`litter${i}`,x,z:odd?-7.7:-8.2,title:['Gom giấy ở chân cột','Nhặt chai cạnh vỉa hè','Gom lá bên lề ngõ'][i],action:'litter'})),{id:'sort',x:-52.5,z:-5.6,title:'Phân loại tại quán trà cô Hoa',action:'sort'}]},
    { id:'album',title:odd?'Hai tấm ảnh cho ngày hội':'Sắc màu đầu Đông',icon:'📷',kind:'album',story:'Nhóm cư dân đang làm một góc ảnh. Tìm nơi trong lời nhắn, hướng máy vào cảnh rồi bấm P. Ảnh check-in cũ không thay cho ảnh của công việc hôm nay.',base:30000,
      goals:[...photos.map(([x,z,lookX,lookZ,title],i)=>({id:`photo${i}`,x,z,lookX,lookZ,title,action:'photo'})),{id:'album',x:-52.5,z:-5.6,title:'Biên tập ảnh cùng cô Hoa',action:'album'}]}
    ,{id:'courier',title:'Một vòng Phú Gia – Phú Xá',icon:'📦',kind:'courier',base:48000,
      story:'Bưu tá nhờ chuyển ba bưu kiện cho các hộ trên tuyến Phú Gia, Phú Xá và đường đê. Đọc nhãn, tự chọn đường và giao đúng người. Không ép thời gian; ôm cua nhẹ để giữ hàng nguyên vẹn, rồi quay về bàn giao sổ.',
      goals:[{id:'pickup',x:-10.5,z:6.2,title:'Nhận ba bưu kiện và đọc sổ giao tại gánh xôi',action:'pickup'},
        {id:'parcel0',x:48.5,z:-96,title:'Giao bưu kiện: Tiệm may cô Liên · Phú Gia',recipient:'Cô Liên',address:'Tiệm may · Phú Gia',action:'receipt'},
        {id:'parcel1',x:-75,z:-109.5,title:'Giao bưu kiện: Hiệu sách bác Sơn · Phú Xá',recipient:'Bác Sơn',address:'Hiệu sách · Phú Xá',action:'receipt'},
        {id:'parcel2',x:27,z:-222,title:'Giao bưu kiện: Quán nước chú Bình · đường đê',recipient:'Chú Bình',address:'Quán nước · đường đê',action:'receipt'},
        {id:'return',x:-10.5,z:6.2,title:'Mang sổ ký nhận về gánh xôi',action:'return'}]}
  ];
  cachedDay=day;cachedOffers=offers;return offers;
}

export function normalizeDaylife(input = {}, day = 1) {
  input=input&&typeof input==='object'?input:{};
  const completed = input.day === day && Array.isArray(input.completed) ? [...new Set(input.completed.filter(id=>dayOffers(day).some(o=>o.id===id)))] : [];
  const offer = dayOffers(day).find(o=>o.id===input.active?.id);
  const active = input.day === day && offer && !completed.includes(offer.id) ? {
    id:offer.id, done:[...new Set((Array.isArray(input.active.done)?input.active.done:[]).filter(id=>offer.goals.some(g=>g.id===id)))],
    remaining:clamp(input.active.remaining ?? 110,0,110),quality:clamp(input.active.quality ?? 100,0,100)
  } : null;
  return { day,completed,active,story:normalizeNeighborhoodStory(input.story),mystery:normalizePhotoMystery(input.mystery),east:normalizeEastExploration(input.east),points:Math.floor(clamp(input.points,0,999)),total:Math.floor(clamp(input.total,0,10000)),
    gallery:(Array.isArray(input.gallery)?input.gallery:[]).filter(x=>typeof x==='string'&&x.startsWith('data:image/jpeg;base64,')&&x.length<80000).slice(-2),
    projects:{green:Math.floor(clamp(input.projects?.green,0,3)),heritage:Math.floor(clamp(input.projects?.heritage,0,3))} };
}

export function availableGoals(state, day) {
  const offer = dayOffers(day).find(o=>o.id===state.active?.id);
  if (!offer) return [];
  const missing = offer.goals.filter(g=>!state.active.done.includes(g.id));
  if (offer.kind==='delivery') return !state.active.done.includes('pack') ? missing.filter(g=>g.id==='pack') : missing;
  if (offer.kind==='courier') {
    if(!state.active.done.includes('pickup'))return missing.filter(g=>g.id==='pickup');
    return missing.some(g=>g.action==='receipt')?missing.filter(g=>g.action==='receipt'):missing;
  }
  if (offer.kind==='cleanup') return missing.some(g=>g.action==='litter') ? missing.filter(g=>g.action==='litter') : missing;
  return missing.some(g=>g.action==='photo') ? missing.filter(g=>g.action==='photo') : missing;
}

export function acceptDayJob(state,id,day) {
  const s=normalizeDaylife(state,day);
  if (s.active || s.mystery.started&&!s.mystery.ending&&!s.mystery.suspended || s.completed.includes(id) || !dayOffers(day).some(o=>o.id===id)) return s;
  s.active={id,done:[],remaining:110,quality:100}; return s;
}

export function completeDayGoal(state,id,day,quality) {
  const s=normalizeDaylife(state,day);
  if (!availableGoals(s,day).some(g=>g.id===id)) return s;
  s.active.done.push(id);
  if (quality!==undefined) s.active.quality=clamp(quality,0,100);
  return s;
}

export function jobReward(state,day,choice='income') {
  const o=dayOffers(day).find(o=>o.id===state.active?.id);
  if (!o) return {coins:0,xp:0,points:0};
  const bonus=o.kind==='delivery' && state.active.remaining>0 ? 12000 : 0;
  const pay=Math.round((o.base+bonus)*(.65+.35*state.active.quality/100)/1000)*1000;
  return {coins:choice==='fund'?Math.floor(pay/2):pay,xp:75+Math.round(state.active.quality/2),points:choice==='fund'?2:1};
}

export function finishDayJob(state,day,choice) {
  const s=normalizeDaylife(state,day);
  if (!s.active || availableGoals(s,day).length || !['income','fund'].includes(choice)) return {state:s,reward:null};
  const reward=jobReward(s,day,choice);
  s.story=recordNeighborhoodHelp(s.story,s.active.id);
  s.completed.push(s.active.id); s.active=null; s.total++; s.points+=reward.points;
  return {state:s,reward};
}

export function buildDayProject(state,day,key) {
  const s=normalizeDaylife(state,day);
  if (!['green','heritage'].includes(key)) return s;
  const cost=s.projects[key]+2;
  if (s.projects[key]>=3 || s.points<cost) return s;
  s.points-=cost; s.projects[key]++; return s;
}

export function matchesDayPhoto(player,goal) {
  if(player.riding||Math.hypot(player.x-goal.x,player.z-goal.z)>6)return false;
  const dx=goal.lookX-player.x,dz=goal.lookZ-player.z,length=Math.hypot(dx,dz);
  return length>0&&(dx*Math.sin(player.yaw)+dz*Math.cos(player.yaw))/length>.65;
}
