// Arcade neighborhood rules, using only fictional in-game money.
export const STREET_SPEED_LIMIT=40;
export function drivingViolation({riding,speed,roadDistance,roadWidth}){
 if(!riding)return null;
 if(Math.abs(speed)>2.5&&roadDistance>roadWidth/2+.7)return {id:'pavement',label:'Chạy xe trên vỉa hè',fine:8000};
 if(Math.abs(speed)*3.6>STREET_SPEED_LIMIT+6)return {id:'speed',label:'Vượt tốc độ khu dân cư (40 km/h)',fine:5000};
 return null;
}
export function createEnforcement(){return {stage:'patrol',exposure:0,remaining:0,stopped:0,cooldown:0,violation:null,officer:0};}
export function stepEnforcement(state,context,dt){
 dt=Math.max(0,Math.min(dt,.1));state.cooldown=Math.max(0,state.cooldown-dt);
 if(state.stage==='ticket')return null;
 const violation=drivingViolation(context);
 if(state.stage==='warning'){
  state.stopped=Math.abs(context.speed)<1?state.stopped+dt:0;
  if(state.stopped>=1.5){state.stage='patrol';state.cooldown=20;state.exposure=0;return 'complied';}
  state.remaining-=dt;
  if(state.remaining<=0){state.stage='ticket';return 'ticket';}
  return null;
 }
 if(state.cooldown>0||!context.witness||!violation){state.exposure=Math.max(0,state.exposure-dt*2);return null;}
 state.exposure+=dt;
 if(state.exposure>=2){state.stage='warning';state.violation=violation;state.remaining=7;state.stopped=0;state.officer=context.officer;return 'warning';}
 return null;
}
export function settleTicket(state,balance){
 if(state.stage!=='ticket')return null;
 const paid=Math.min(Math.max(0,balance),state.violation.fine),label=state.violation.label;
 Object.assign(state,createEnforcement(),{cooldown:60});return {paid,label};
}
