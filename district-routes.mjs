// Google Maps reference centred at 21.0872709,105.8092817, inspected 2026-10-27.
// Compressed continuation of the existing fictionalized core, NOT survey coordinates.
export const DISTRICT_ROADS=[
  {id:'phu-gia',name:'PHỐ PHÚ GIA',width:10.8,points:[[42,-55],[42,-125],[35,-180],[20,-230]]},
  {id:'phu-xa',name:'PHỐ PHÚ XÁ',width:8,points:[[-150,-108],[-80,-115],[0,-120],[42,-125],[105,-144],[162,-172],[205,-205]]},
  {id:'an-duong-vuong',name:'AN DƯƠNG VƯƠNG',width:13,points:[[-220,-50],[-250,-85],[-250,-140],[-190,-178],[-145,-205],[-65,-225],[20,-230],[105,-229],[170,-220],[205,-205],[226,-170],[270,-155],[300,-130],[350,-102]]},
  // Fictional exploration loop, not a claim about a real Google Maps road.
  {id:'riverside-loop',name:'TUYẾN VÒNG VEN SÔNG',width:9,points:[[205,-205],[262,-222],[322,-208],[350,-160],[350,-102],[300,-82],[245,-105],[205,-140],[162,-172]]},
  {id:'market-link',name:'PHỐ CHỢ – ĐƯỜNG RA VEN SÔNG',width:10.8,points:[[162,0],[205,0],[245,-28],[255,-65],[245,-105]]},
  {id:'peach-west',name:'ĐƯỜNG VƯỜN ĐÀO PHÚ THƯỢNG',width:9,points:[[-182,0],[-214,0],[-220,-50],[-205,-108],[-150,-108]]},
  {id:'south-neighborhood',name:'PHỐ XÓM NAM PHÚ THƯỢNG',width:9,points:[[42,55],[42,95],[-15,95],[-15,55]]}
];
export const EAST_PLACES=Object.freeze([
 {id:'tea-garden',name:'Quán nghỉ chân vườn tre',x:267,z:-228,lookX:267,lookZ:-234,description:'Mái quán dưới giàn tre, bàn nước và vườn nhỏ bên tuyến vòng.'},
 {id:'river-square',name:'Sân ngắm sông',x:368,z:-160,lookX:402,lookZ:-160,description:'Sân lát rộng, ghế nghỉ và lan can nhìn ra mặt nước.'},
 {id:'weekend-market',name:'Chợ phiên đầu Đông',x:302,z:-75,lookX:303,lookZ:-70,description:'Những mái sạp cong, chậu cây và quầy nông sản cạnh phố.'},
]);
export const EAST_PUBLIC_AREAS=Object.freeze([
 {minX:248,maxX:277,minZ:-241,maxZ:-212},
 {minX:348,maxX:382,minZ:-184,maxZ:-136},
 {minX:283,maxX:320,minZ:-100,maxZ:-65},
 {minX:218,maxX:239,minZ:-10,maxZ:8},
 {minX:-179,maxX:-145,minZ:-123,maxZ:-93},
 {minX:-213,maxX:-190,minZ:-65,maxZ:-12},
]);
export const inEastPublicArea=(x,z,pad=0)=>EAST_PUBLIC_AREAS.some(a=>x>=a.minX-pad&&x<=a.maxX+pad&&z>=a.minZ-pad&&z<=a.maxZ+pad);
export const DISTRICT_PLACES=[
  {id:'phu-xa',name:'Nút giao Phú Gia – Phú Xá',x:42,z:-125},
  {id:'de',name:'Đường đê An Dương Vương',x:20,z:-230},
  {id:'dong',name:'Khúc rẽ phía Phú Xá',x:205,z:-205},
  {id:'market-link',name:'Sân nghỉ phố chợ',x:233,z:-2},...EAST_PLACES
  ,{id:'phu-xa-court',name:'Sân cuối phố Phú Xá',x:-166,z:-108},
  {id:'peach-garden-west',name:'Vườn đào Phú Thượng · khu mở rộng',x:-203,z:-37},
  {id:'south-block',name:'Xóm Nam Phú Thượng',x:12,z:95}
];
export function nearestRoad(x,z,roads=DISTRICT_ROADS){
  let best={distance:Infinity,x,z,width:0};
  for(const road of roads)for(let i=1;i<road.points.length;i++){
    const [ax,az]=road.points[i-1],[bx,bz]=road.points[i],dx=bx-ax,dz=bz-az;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz))),nx=ax+t*dx,nz=az+t*dz,distance=Math.hypot(x-nx,z-nz);
    if(distance<best.distance)best={distance,x:nx,z:nz,width:road.width,id:road.id};
  }return best;
}
export function constrainDistrictPosition(pos){
  // Retain the legacy playable core. The extension follows built streets and pavements.
  if(pos.z>=-55&&pos.z<=55&&pos.x>=-182&&pos.x<=162)return;
  if(inEastPublicArea(pos.x,pos.z))return;
  const n=nearestRoad(pos.x,pos.z),radius=n.width/2+3.2;
  if(pos.z>-75&&pos.z<-55&&pos.x>=-182&&pos.x<=162&&n.distance>radius){pos.z=-55;return;}
  if(n.distance>radius){
    const ratio=radius/n.distance;let best={x:n.x+(pos.x-n.x)*ratio,z:n.z+(pos.z-n.z)*ratio},distance=n.distance-radius;
    for(const a of EAST_PUBLIC_AREAS){const x=Math.max(a.minX,Math.min(a.maxX,pos.x)),z=Math.max(a.minZ,Math.min(a.maxZ,pos.z)),d=Math.hypot(pos.x-x,pos.z-z);if(d<distance){best={x,z};distance=d;}}
    pos.x=best.x;pos.z=best.z;
  }
}
export const districtRoadHeight=()=>.08;
export function districtLocationName(x,z){
 if(z>=-55&&z<=55&&x>=-182&&x<=162)return null;
 const place=DISTRICT_PLACES.find(p=>Math.hypot(p.x-x,p.z-z)<25);
 return place?.name||DISTRICT_ROADS.find(r=>r.id===nearestRoad(x,z).id)?.name||'Khu phố mở rộng';
}
export function districtGroundHeight(x,z){
 let roadHeight=-Infinity,pavementHeight=0;
 DISTRICT_ROADS.forEach((road,index)=>{const n=nearestRoad(x,z,[road]);if(n.distance<=road.width/2)roadHeight=Math.max(roadHeight,districtRoadHeight(index));else if(n.distance<=road.width/2+3.5)pavementHeight=.06;});
 return Number.isFinite(roadHeight)?roadHeight:(inEastPublicArea(x,z) ? .09 : pavementHeight);
}
export function routeLength(road){return road.points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-road.points[i][0],p[1]-road.points[i][1]),0);}
export function sampleRoad(road,spacing=14){
  const out=[];let walked=0,next=spacing/2;
  for(let i=1;i<road.points.length;i++){
    const [ax,az]=road.points[i-1],[bx,bz]=road.points[i],length=Math.hypot(bx-ax,bz-az),dx=(bx-ax)/length,dz=(bz-az)/length;
    while(next<walked+length){const t=next-walked;out.push({x:ax+dx*t,z:az+dz*t,dx,dz});next+=spacing;}walked+=length;
  }return out;
}
