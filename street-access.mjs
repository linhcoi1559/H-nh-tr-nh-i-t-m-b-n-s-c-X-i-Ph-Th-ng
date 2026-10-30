export const SERVICE_POINTS = Object.freeze({
 garage: {x:18.5,z:-6.05,title:'Xưởng Độ Xe 41',radius:4.5},
 business: {x:-26.5,z:-7,title:'Quán Xôi & Trà Đá',radius:4.5},
});
export function serviceAccess(tab,{x,z,riding=false,night=false}){
 const point=SERVICE_POINTS[tab==='business'?'business':'garage'];
 if(night)return {ok:false,point,reason:'Địa điểm này chỉ hoạt động vào ban ngày.'};
 if(riding)return {ok:false,point,reason:'Dừng xe và bấm F xuống xe trước khi dùng dịch vụ. C vẫn nhận đơn ship nhanh.'};
 if(Math.hypot(x-point.x,z-point.z)>point.radius)return {ok:false,point,reason:`Hãy tới ${point.title} để thực hiện hoạt động này.`};
 return {ok:true,point};
}
export function brakeBikeSpeed(speed,delta,deceleration=70){
 const next=Math.max(0,Math.abs(speed)-deceleration*Math.max(0,delta));
 return next===0?0:Math.sign(speed)*next;
}
export const MEMORIAL_ACCESS=Object.freeze({entrance:{x:-20,z:-8},turn:{x:-20,z:-24},destination:{x:-24,z:-28}});
export function blocksMemorialEntrance(houseX){return Math.abs(houseX-MEMORIAL_ACCESS.entrance.x)<2;}
export function memorialPath(start,target){
 if(Math.hypot(target.x+24,target.z+28)>7)return null;
 if(start.z>-10)return [MEMORIAL_ACCESS.entrance,MEMORIAL_ACCESS.turn,target];
 if(start.z>-22.8)return [MEMORIAL_ACCESS.turn,target];
 return [target];
}
