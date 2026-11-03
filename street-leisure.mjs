import {createLeisureGame,playLeisureGame,LEISURE_ITEMS} from './street-leisure-state.mjs';

// Local game lifetime belongs to the daylife modal; closing discards only this step.
export function openLeisureGame({goal,day,content,text,action,completed}){
 let state=createLeisureGame(goal.game,day),disposed=false,timer=0;
 const scene=document.createElement('div');scene.className='leisure-scene '+goal.game;content.append(scene);
 const badge=text({tea:'🍵',flowers:'💐',pump:'🚲',fishing:'🎣'}[goal.game],'div',scene);badge.className='leisure-icon';
 const display=text('','h3',scene),status=text('','p',scene),feedback=text('Không giới hạn thời gian. Có thể đóng để thử lại.');
 const controls=document.createElement('div');controls.className='leisure-controls';content.append(controls);
 let track,needle;
 if(['pump','fishing'].includes(goal.game)){
  track=document.createElement('div');track.className='daylife-timing';track.setAttribute('role','meter');
  track.setAttribute('aria-label',goal.game==='pump'?'Áp suất lốp':'Vị trí phao');
  track.innerHTML='<span class="daylife-zone"></span><i></i>';scene.append(track);needle=track.querySelector('i');
  if(goal.game==='pump'){track.querySelector('span').style.left=`${28/48*100}%`;track.querySelector('span').style.width=`${6/48*100}%`;}
 }
 const started=performance.now(),phase=()=>((performance.now()-started)%6000)/6000;
 function render(){
  if(LEISURE_ITEMS[goal.game]){
   display.textContent=goal.game==='tea'?'Đơn pha trà':'Mẫu bó hoa';
   status.textContent='Công thức: '+state.recipe.join(' → ');
   badge.textContent=state.items.length?state.items.map(x=>({'Trà':'🍵','Đá':'🧊','Chanh':'🍋','Đường':'🥄','Hoa cúc':'🌼','Hoa hồng':'🌹','Lá xanh':'🌿','Hoa ly':'🌸'}[x])).join(' '):(goal.game==='tea'?'🥛':'🏺');
  }else if(goal.game==='pump'){
   display.textContent=`${state.pressure} PSI`;status.textContent='Vùng xanh 28–34 PSI · mỗi nhịp ±3 PSI';needle.style.left=`${state.pressure/48*100}%`;track.setAttribute('aria-valuenow',state.pressure);track.setAttribute('aria-valuemax','48');
  }else {display.textContent=`Đã câu và thả: ${state.catches}/3`;status.textContent='Phao đi một vòng trong 6 giây · nhấc cần ở vùng xanh';}
 }
 function play(key){if(disposed||state.done)return;state=playLeisureGame(state,key,(performance.now()-started)/6000);feedback.textContent=state.message||(goal.game==='pump'?'Điều chỉnh đến vùng xanh rồi kiểm tra.':'Đã chọn: '+state.items.join(' → '));render();if(state.done){disposed=true;clearInterval(timer);completed(goal.id);}}
 if(LEISURE_ITEMS[goal.game]){
  for(const item of LEISURE_ITEMS[goal.game])action(item,()=>play(item),controls);
  action('Bỏ món cuối',()=>play('undo'),controls);action('Giao đúng đơn',()=>play('serve'),controls);
 }else if(goal.game==='pump'){
  action('Bơm +3 PSI',()=>play('pump'),controls);action('Xả −3 PSI',()=>play('release'),controls);action('Kiểm tra lốp',()=>play('serve'),controls);
 }else{
  action('Nhấc cần',()=>play('strike'),controls);
  timer=setInterval(()=>{if(!scene.isConnected){clearInterval(timer);disposed=true;return;}needle.style.left=`${phase()*100}%`;track.setAttribute('aria-valuenow',Math.round(phase()*100));},50);
 }
 render();
 return ()=>{disposed=true;clearInterval(timer);};
}
