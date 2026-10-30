export function gameClockLabel(hours){
 const minutes=((Math.floor((Number(hours)||0)*60)%1440)+1440)%1440;
 return String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
}
