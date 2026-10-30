import {EAST_PLACES,DISTRICT_ROADS} from './district-routes.mjs';
import {matchesDayPhoto} from './daylife-state.mjs';
import {normalizeEastExploration,recordEastPhoto,claimEastExploration} from './east-exploration-state.mjs';
export function createEastExploration(api){
 const state=()=>normalizeEastExploration(api.state().east);
 const nearest=()=>{const c=api.context();if(c.night||c.riding)return null;return EAST_PLACES.map(p=>({...p,d:Math.hypot(c.x-p.x,c.z-p.z)})).sort((a,b)=>a.d-b.d)[0];};
 function board(){
  if(!api.open())return;api.title.textContent='Một vòng phía Đông · bản đồ khám phá';
  api.text('Đi tiếp về phía chợ hoa–công viên theo Phố Chợ để tới chợ phiên và tuyến vòng ven sông. Bạn cũng có thể đi theo Phú Gia qua Phú Xá. Dừng ở chợ, ghé quán vườn hoặc ra sân ngắm sông. Không mất phí hay giới hạn thời gian.');
  const ns='http://www.w3.org/2000/svg',map=document.createElementNS(ns,'svg');map.setAttribute('viewBox','0 0 700 420');map.setAttribute('role','img');map.setAttribute('aria-label','Sơ đồ phố cũ, đường vườn đào phía tây, xóm nam và tuyến vòng ven sông');map.classList.add('east-route-map');
  const point=(x,z)=>[x+240,z+285];
  const add=(tag,attrs,label)=>{const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(label)e.textContent=label;map.append(e);return e;};
  add('rect',{x:0,y:0,width:700,height:420,rx:12,fill:'#11271f'});
  add('path',{d:'M 58 285 L 402 285',stroke:'#71867b','stroke-width':7,fill:'none'});
  add('path',{d:'M 282 340 L 282 230 M 225 285 L 225 340',stroke:'#71867b','stroke-width':5,fill:'none'});
  for(const r of DISTRICT_ROADS)add('path',{d:r.points.map(([x,z],i)=>(i?'L ':'M ')+point(x,z).join(' ')).join(' '),stroke:r.id==='riverside-loop'?'#d8bd79':'#71867b','stroke-width':r.id==='riverside-loop'?6:4,fill:'none','stroke-linejoin':'round'});
  for(const p of EAST_PLACES){const [x,y]=point(p.x,p.z);add('circle',{cx:x,cy:y,r:5,fill:state().visited.includes(p.id)?'#7fcca2':'#f3d88e'});add('text',{x:x-9,y:y-10,'text-anchor':'end',fill:'#f4ead0','font-size':13,stroke:'#11271f','stroke-width':4,'paint-order':'stroke'},p.name);}
  add('text',{x:300,y:308,fill:'#c7d4cb','font-size':13},'Phố Phú Thượng');
  add('text',{x:215,y:405,fill:'#c7d4cb','font-size':12},'Xóm Nam');
  add('text',{x:8,y:250,fill:'#e3bbbf','font-size':12},'Vườn đào Phú Thượng');
  const c=api.context(),[x,y]=point(c.x,c.z);if(x>0&&x<700&&y>0&&y<420)add('circle',{cx:x,cy:y,r:5,fill:'#7dccff',stroke:'#11271f','stroke-width':2});
  api.content.append(map);api.text('Đường vàng: tuyến vòng mới · Chấm xanh dương: vị trí của bạn.','small');
  api.text(`Bộ ảnh ven sông: ${state().visited.length}/3. Tới từng điểm, xuống xe, hướng máy vào cảnh và bấm P. Ảnh gần nhất giữ trong album của bảng N.`);
  for(const p of EAST_PLACES){const card=document.createElement('article');card.className='daylife-job';api.content.append(card);api.text(`${state().visited.includes(p.id)?'✓':'○'} ${p.name}`,'h3',card);api.text(p.description,'p',card);api.action('Dẫn đường: '+p.name,()=>{api.close();api.guide({...p,title:p.name});},card);}
  const result=claimEastExploration(state());
  const b=api.action(state().claimed?'Đã nhận phần thưởng bộ ảnh':'Nộp bộ ảnh · 18.000đ + 100 XP + 1 điểm',()=>{
   const result=claimEastExploration(state());if(!result.reward)return;api.commit({...api.state(),east:result.state,points:api.state().points+result.reward.points});api.reward(result.reward,'album');board();
  });b.disabled=!result.reward;
  api.action('Đóng bản đồ · tiếp tục khám phá',api.close);
 }
 function photo(){
  const c=api.context(),p=nearest();if(!p||p.d>6)return false;
  if(state().visited.includes(p.id)){api.toast('Bộ ảnh đã có '+p.name+'. Mở bản đồ ven sông để xem các điểm còn lại hoặc nộp bộ ảnh.');return true;}
  if(!matchesDayPhoto(c,p)){api.toast('Đúng địa điểm rồi. Hướng máy vào '+p.description);return true;}
  const snapshot=api.snapshot?.();
  api.commit({...api.state(),east:recordEastPhoto(state(),p.id),gallery:snapshot?[...api.state().gallery,snapshot].slice(-2):api.state().gallery});
  api.toast(`Đã ghi ảnh ${p.name} · ${state().visited.length}/3. Mở N → Khám phá khu ven sông để xem bộ ảnh.`);return true;
 }
 return {board,photo,prompt:()=>{const p=nearest();return p&&p.d<3.1?'Khám phá '+p.name+' · E xem địa điểm / P chụp ảnh':'';},interact:()=>{
  const p=nearest();if(!p||p.d>=3.1)return false;
  if(p.id==='tea-garden'){api.player.stamina=Math.min(100,api.player.stamina+25);api.dirty();api.toast('Nghỉ dưới mái quán · hồi 25 thể lực. Không mất tiền, không nhận XP lặp.');}
  board();return true;
 }};
}
