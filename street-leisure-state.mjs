const recipes={tea:[['Trà','Đá','Chanh'],['Trà','Đá','Đá']],flowers:[['Hoa cúc','Hoa hồng','Lá xanh'],['Hoa hồng','Hoa hồng','Lá xanh']]};
export const LEISURE_ITEMS={tea:['Trà','Đá','Chanh','Đường'],flowers:['Hoa cúc','Hoa hồng','Lá xanh','Hoa ly']};
export function createLeisureGame(kind,day=1){
 return {kind,recipe:recipes[kind]?.[(day%2+2)%2]||[],items:[],pressure:12,catches:0,lastCycle:-1,done:false,message:''};
}
export function playLeisureGame(state,action,phase=0){
 const s={...state,items:[...state.items]};if(s.done)return s;
 if(recipes[s.kind]){
  if(action==='undo')s.items.pop();
  else if(action==='serve'){
   s.done=s.items.length===s.recipe.length&&s.items.every((v,i)=>v===s.recipe[i]);
   s.message=s.done?'Đúng đơn, khách đã nhận.':'Chưa đúng công thức. Có thể bỏ món cuối hoặc làm lại.';
  }else if(LEISURE_ITEMS[s.kind].includes(action)&&s.items.length<5)s.items.push(action);
 }else if(s.kind==='pump'){
  if(action==='pump')s.pressure=Math.min(48,s.pressure+3);
  if(action==='release')s.pressure=Math.max(0,s.pressure-3);
  if(action==='serve'){s.done=s.pressure>=28&&s.pressure<=34;s.message=s.done?'Áp suất ổn, xe đã sẵn sàng.':'Đưa kim vào vùng xanh 28–34 rồi kiểm tra lại.';}
 }else if(s.kind==='fishing'&&action==='strike'){
  const cycle=Math.floor(phase),position=phase-cycle;
  if(cycle===s.lastCycle){s.message='Chờ lượt phao tiếp theo rồi nhấc cần.';return s;}
  if(position>=.35&&position<=.65){s.catches++;s.lastCycle=cycle;s.done=s.catches===3;s.message='Phao chìm đúng lúc · đã thả cá về nước. Chờ vòng phao tiếp theo.';}
  else s.message='Cá chưa cắn. Chờ phao vào vùng xanh rồi nhấc cần; không mất lượt.';
 }
 return s;
}
