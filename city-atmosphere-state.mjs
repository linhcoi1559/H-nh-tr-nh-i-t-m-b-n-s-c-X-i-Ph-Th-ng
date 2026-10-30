import {TRAFFIC_STREETS} from './traffic-routes.mjs';
import {sampleRoad,nearestRoad} from './district-routes.mjs';
export const WEATHER_MODES=['auto','clear','cloud','rain','wind'];
export function weatherAt(day,hour,mode='auto'){
 const key=WEATHER_MODES.includes(mode)&&mode!=='auto'?mode:['clear','cloud','rain','wind'][(Math.floor(hour/2)+day)%4];
 return {key,label:{clear:'☀ Trời quang',cloud:'☁ Nhiều mây',rain:'🌧 Mưa',wind:'🌬 Gió mạnh'}[key],rain:key==='rain'?1:0,wind:key==='wind'?1:key==='rain'?.65:key==='cloud'?.3:.12,cloud:key==='clear'?0:key==='wind'?.55:1};
}
export function nightAmount(hour){const h=((hour%24)+24)%24;if(h<5.5||h>=19.2)return 1;if(h<7)return (7-h)/1.5;if(h>17.4)return (h-17.4)/1.8;return 0;}
export function advanceCityClock(day,time,seconds){const hours=time+Math.max(0,seconds)/300;return {day:day+Math.floor(hours/24),time:hours%24};}
export function utilityLayout(blocked=()=>false){
 const poles=[],links=[];
 for(const street of TRAFFIC_STREETS)for(const side of [-1,1]){
  let previous=null;
  for(const p of sampleRoad(street,28)){
   const nx=-p.dz*side,nz=p.dx*side,x=p.x+nx*(street.width/2+2.25),z=p.z+nz*(street.width/2+2.25);
   if(nearestRoad(x,z,TRAFFIC_STREETS).distance<street.width/2+.8||blocked(x,z)){previous=null;continue;}
   let index=poles.findIndex(a=>Math.hypot(a.x-x,a.z-z)<5);
   if(index<0){index=poles.length;poles.push({x,z,nx,nz,street:street.id});}
   if(previous!==null&&previous!==index&&Math.hypot(poles[previous].x-x,poles[previous].z-z)<43)links.push([previous,index]);previous=index;
  }
 }
 // Join cable runs around junctions instead of leaving unrelated floating spans.
 for(let i=0;i<poles.length;i++)for(let j=i+1;j<poles.length;j++)if(poles[i].street!==poles[j].street&&Math.hypot(poles[i].x-poles[j].x,poles[i].z-poles[j].z)<25)links.push([i,j]);
 return {poles,links:[...new Map(links.map(([a,b])=>[[a,b].sort((x,y)=>x-y).join(':'),[a,b]])).values()]};
}
