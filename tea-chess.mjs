import * as THREE from 'three';
import {TEA_SHOP as SHOP,ELDERS,TEA_CHALLENGES,normalizeTeaChess,elderUnlocked,recordTeaChallenge,finishTeaGame} from './tea-chess-state.mjs';
import {newGame,sideOf,legalMoves,inCheck,playMove,undoRound,evaluateBoard,GLYPHS,PIECE_NAMES,moveLabel,traditionalNotation,detectTacticalPattern,moved} from './xiangqi.mjs';
import {createTeaChessCrowd} from './arcade-crowd.mjs';

// Hiệu ứng âm thanh tiếng quân cờ gỗ lim chạm mặt bàn và tiếng chuông đồng khi chiếu tướng (Web Audio API)
let audioCtx=null;
function playChessSound(kind='move'){
 try{
  const Ctx=window.AudioContext||window.webkitAudioContext;
  if(!Ctx)return;
  if(!audioCtx)audioCtx=new Ctx();
  if(audioCtx.state==='suspended')audioCtx.resume();
  const now=audioCtx.currentTime;
  const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
  osc.connect(gain);gain.connect(audioCtx.destination);
  if(kind==='check'){
   osc.type='triangle';
   osc.frequency.setValueAtTime(580,now);
   osc.frequency.exponentialRampToValueAtTime(880,now+0.09);
   osc.frequency.exponentialRampToValueAtTime(440,now+0.26);
   gain.gain.setValueAtTime(0.24,now);
   gain.gain.exponentialRampToValueAtTime(0.001,now+0.28);
   osc.start(now);osc.stop(now+0.29);
  }else if(kind==='capture'){
   osc.type='sawtooth';
   osc.frequency.setValueAtTime(195,now);
   osc.frequency.exponentialRampToValueAtTime(68,now+0.11);
   gain.gain.setValueAtTime(0.28,now);
   gain.gain.exponentialRampToValueAtTime(0.001,now+0.12);
   osc.start(now);osc.stop(now+0.13);
  }else{
   osc.type='sine';
   osc.frequency.setValueAtTime(160,now);
   osc.frequency.exponentialRampToValueAtTime(55,now+0.075);
   gain.gain.setValueAtTime(0.2,now);
   gain.gain.exponentialRampToValueAtTime(0.001,now+0.08);
   osc.start(now);osc.stop(now+0.085);
  }
 }catch{}
}

const SIDEWALK_PUZZLES=[
 {
  id:'m1_1',
  badge:'⚡ 1 Nước #1 · Mã Hậu Pháo',
  title:'Phá Cờ Thế 1 Nước #1 · Mã Hậu Pháo Tuyệt Sát',
  desc:'Chỉ cần đi ĐÚNG 1 NƯỚC CỜ ĐỎ DUY NHẤT để chiếu bí ngay lập tức và nhận thưởng XP nóng!',
  rewardXp:55,
  mustCheck:true,
  setup:[
   [4,0,'k'],[3,0,'a'],[5,0,'a'],[3,1,'p'],[5,1,'p'],
   [3,2,'N'],[4,5,'C'],[0,0,'R'],[4,9,'K'],[3,9,'A'],[5,9,'A']
  ],
  hintText:'Đi 1 nước Chiếu Bí Ngay: Đưa Xe Đỏ ở góc trái (cột 1 hàng 10) chém thẳng vào Sĩ Đen (cột 4 hàng 10) hoặc nhảy Mã tạo thế Mã Hậu Pháo khóa cứng Tướng Đen!'
 },
 {
  id:'m1_2',
  badge:'⚡ 1 Nước #2 · Song Xe Đoạt Cung',
  title:'Phá Cờ Thế 1 Nước #2 · Song Xe Đoạt Cung',
  desc:'Đi ĐÚNG 1 NƯỚC CỜ ĐỎ DUY NHẤT để kết liễu Tướng Đen ngay tức khắc!',
  rewardXp:60,
  mustCheck:true,
  setup:[
   [4,0,'k'],[3,1,'a'],[5,1,'a'],[2,0,'b'],[6,0,'b'],
   [0,1,'R'],[8,2,'R'],[4,9,'K'],[3,9,'A'],[5,9,'A']
  ],
  hintText:'Đi 1 nước Chiếu Bí Ngay: Phóng Xe Đỏ cánh phải (cột 9 hàng 8) xuống thẳng hàng đáy (cột 9 hàng 10) tạo thế Song Xe Liên Hoàn chiếu bí!'
 },
 {
  id:'m1_3',
  badge:'⚡ 1 Nước #3 · Pháo Đầu Trùng Pháo',
  title:'Phá Cờ Thế 1 Nước #3 · Pháo Đầu Trùng Pháo',
  desc:'Đi ĐÚNG 1 NƯỚC CỜ ĐỎ DUY NHẤT ghép thành tuyệt kỹ Trùng Pháo chiếu bí ngay!',
  rewardXp:60,
  mustCheck:true,
  setup:[
   [4,0,'k'],[3,0,'a'],[5,0,'a'],[4,1,'n'],[3,1,'p'],[5,1,'p'],
   [4,4,'C'],[1,6,'C'],[4,9,'K'],[3,9,'A'],[5,9,'A']
  ],
  hintText:'Đi 1 nước Chiếu Bí Ngay: Bình Pháo Đỏ (cột 2 hàng 4) vào trung lộ (cột 5 hàng 4) lập thế Trùng Pháo chiếu bí không thể cản!'
 },
 {
  id:'m1_4',
  badge:'⚡ 1 Nước #4 · Lưỡng Chiếu Tuyệt Sát',
  title:'Phá Cờ Thế 1 Nước #4 · Lưỡng Chiếu Tuyệt Sát',
  desc:'Đi ĐÚNG 1 NƯỚC CỜ ĐỎ DUY NHẤT tung đòn Lưỡng Chiếu (Xe + Mã cùng chiếu) hạ gục Tướng Đen!',
  rewardXp:65,
  mustCheck:true,
  setup:[
   [4,0,'k'],[3,0,'a'],[5,0,'a'],[3,1,'r'],[5,1,'r'],
   [4,2,'N'],[4,5,'R'],[4,9,'K'],[3,9,'A'],[5,9,'A']
  ],
  hintText:'Đi 1 nước Chiếu Bí Ngay: Nhảy Mã Đỏ trung lộ (cột 5 hàng 8) lên Ngọa Tào (cột 3 hàng 9 hoặc cột 7 hàng 9) vừa chiếu Mã vừa mở mặt Xe Đỏ Lưỡng Chiếu!'
 },
 {
  id:'p1',
  badge:'🔥 Thế 5 · Thiết Mã Hiến Xe',
  title:'Thế 5 · Thiết Mã Hiến Xe (Tuyệt Sát 2 Nước)',
  desc:'Phế Xe đỏ chém Sĩ ép Tướng đen lộ mặt, rồi tung Mã Ngọa Tào phối hợp Pháo đầu khóa chết Cửu Cung! (Bắt buộc chiếu liên hoàn)',
  rewardXp:65,
  mustCheck:true,
  setup:[
   [4,0,'k'],[3,0,'a'],[5,0,'a'],[2,0,'b'],[6,0,'b'],[0,3,'r'],[8,3,'c'],
   [3,1,'R'],[2,2,'N'],[4,4,'C'],[4,9,'K'],[3,9,'A'],[5,9,'A']
  ],
  hintText:'Bước 1: Đưa Xe đỏ (cột 4 hàng 9) ăn thẳng Sĩ đen ở trung tâm (cột 5 hàng 10) chiếu ép Tướng đen ăn lên. Bước 2: Nhảy Mã hoặc điều Pháo chiếu sát!'
 },
 {
  id:'p2',
  badge:'⚔️ Thế 2 · Song Pháo Quá Giang',
  title:'Thế 2 · Song Pháo Quá Giang (Liên Hoàn Sát)',
  desc:'Tướng đen được cặp Sĩ Tượng che chắn kín mít. Hãy dùng Xe và cặp Pháo đỏ tạo đòn Chiếu Trùng & Chiếu Rút liên hoàn không kịp thở!',
  rewardXp:75,
  mustCheck:true,
  setup:[
   [4,0,'k'],[3,0,'a'],[5,0,'a'],[4,2,'b'],[1,2,'r'],[7,2,'n'],
   [1,0,'R'],[1,3,'C'],[4,5,'C'],[3,2,'P'],[4,9,'K'],[3,9,'A']
  ],
  hintText:'Tận dụng Xe đỏ ở hàng đáy (hàng 10) chiếu thẳng hoặc cắm Pháo xuống đáy tạo thế Trùng Pháo ép Tướng đen hết đường chạy!'
 },
 {
  id:'p3',
  badge:'⚡ Thế 3 · Thất Tinh Tụ Hội',
  title:'Thế 3 · Thất Tinh Tụ Hội (Cờ Thế Giang Hồ Đỉnh Cao)',
  desc:'Đen đang dọa Xe Tốt sát cục ngay nước sau! Bạn phải liên tục tung đòn chiếu hiểm bằng Xe - Pháo - Tốt lụt để kết liễu trước khi Đen kịp phản đòn!',
  rewardXp:90,
  mustCheck:true,
  setup:[
   [4,0,'k'],[5,1,'a'],[5,0,'b'],[3,8,'r'],[4,8,'p'],[5,7,'p'],
   [2,0,'R'],[4,3,'C'],[5,2,'N'],[3,1,'P'],[4,9,'K'],[5,9,'A']
  ],
  hintText:'Nước nào của Đỏ cũng PHẢI CHIẾU TƯỚNG (nếu ngừng chiếu Đen sẽ ăn Tướng ngay)! Hãy phối hợp Xe cột 3, Tốt lụt cột 4 và Mã cột 6!'
 },
 {
  id:'p4',
  badge:'👑 Thế 4 · Thiên Lý Độc Hành',
  title:'Thế 4 · Thiên Lý Độc Hành (Đơn Đao Phá Cửu Cung)',
  desc:'Thế cờ tàn bậc thầy: Dùng Xe, Mã và Pháo đỏ xuyên thủng phòng tuyến Sĩ Tượng dày đặc của Đen bằng chuỗi đòn khóa cung tuyệt mỹ!',
  rewardXp:110,
  mustCheck:true,
  setup:[
   [3,0,'k'],[4,0,'a'],[4,1,'a'],[2,2,'b'],[6,0,'b'],[0,4,'r'],[7,3,'c'],
   [6,1,'R'],[4,2,'N'],[3,4,'C'],[2,1,'P'],[4,9,'K'],[3,9,'A'],[5,9,'A']
  ],
  hintText:'Dùng Mã đỏ (cột 5 hàng 8) hoặc Tốt lụt (cột 3 hàng 9) áp sát chiếu Tướng, mở đường cho Xe đỏ cột 7 chém thẳng vào cung!'
 },
 {
  id:'p5',
  badge:'🐉 Thế 5 · Khổng Minh Tá Tiễn',
  title:'Thế 5 · Khổng Minh Tá Tiễn (Mượn Tên Phá Địch)',
  desc:'Đen có Song Xe khóa sườn cực kỳ hung hãn! Hãy khéo léo mượn ngòi quân Đen để tung liên hoàn Pháo Lồng & Xe Đỏ đâm thọc Cửu cung!',
  rewardXp:125,
  mustCheck:true,
  setup:[
   [4,0,'k'],[3,0,'a'],[5,0,'a'],[4,2,'b'],[3,7,'r'],[5,7,'r'],
   [2,0,'R'],[4,4,'C'],[4,6,'C'],[5,2,'N'],[4,9,'K'],[3,9,'A'],[5,9,'A']
  ],
  hintText:'Nhảy Mã chiếu Ngọa Tào hoặc nổ Pháo đầu đánh thẳng vào Sĩ trung tâm để mở toang mặt Tướng!'
 },
 {
  id:'p6',
  badge:'🌋 Thế 6 · Bạch Mã Hiện Đề',
  title:'Thế 6 · Bạch Mã Hiện Đề (Tuyệt Thế Giang Hồ)',
  desc:'Đỉnh cao Cờ Thế Vỉa Hè: Phế Xe mồi nhử Tướng đen xuất cung rồi dùng Song Mã - Pháo Giác dựng lưới thiên la địa võng!',
  rewardXp:145,
  mustCheck:true,
  setup:[
   [4,0,'k'],[3,0,'a'],[5,1,'a'],[2,0,'b'],[1,8,'r'],[7,8,'c'],
   [3,1,'R'],[2,2,'N'],[6,2,'N'],[8,0,'C'],[4,9,'K'],[4,8,'A']
  ],
  hintText:'Thí Xe đỏ vào điểm hiểm trong cung ép Tướng hoặc Sĩ đen ăn lên, sau đó nhảy Song Mã liên hoàn chiếu bí!'
 }
];

const HANDICAP_MODES=[
 {id:'chap_1_xe',badge:'🔥 Chấp 1 Xe Đỏ',title:'Độ Khó Địa Ngục: Chấp Ông Sơn 1 Xe Đỏ',desc:'Bạn tự gỡ bỏ Xe Đỏ cánh trái (cột 9), cầm 15 quân đối đầu trực diện Kỳ Vương Ông Sơn (Tính sâu 5 tầng)! Thắng nhận thưởng lớn +120 XP!',opponent:2,removeSquares:[81],bonusXp:120},
 {id:'chap_song_ma',badge:'⚡ Chấp Đôi Mã',title:'Độ Khó Cao Thủ: Chấp Ông Dũng Đôi Mã',desc:'Bạn xuất trận mà không có cả 2 quân Mã Đỏ! Phải dùng Song Xe - Song Pháo công phá hệ thống phòng thủ của Ông Dũng (+95 XP).',opponent:1,removeSquares:[82,88],bonusXp:95},
 {id:'co_chop_sinh_tu',badge:'⏱️ Cờ Chớp Sinh Tử (15s)',title:'Đấu Trường Tốc Độ: 15 Giây Mỗi Nước vs Ông Sơn',desc:'Mỗi lượt bạn chỉ có đúng 15 giây suy nghĩ trước Kỳ Vương Ông Sơn! Quá giờ lập tức xử thua — thắng nhận +135 XP!',opponent:2,removeSquares:[],bonusXp:135,blitzSeconds:15}
];

function buildPuzzleGame(pIdx){
 const p=SIDEWALK_PUZZLES[pIdx%SIDEWALK_PUZZLES.length],board=Array(90).fill('');
 for(const [x,y,piece] of p.setup)board[y*9+x]=piece;
 return {...newGame(2),board,turn:'red',opponent:2,ply:8,puzzleId:p.id,puzzleTitle:p.title,puzzleHint:p.hintText,puzzleRewardXp:p.rewardXp,mustCheck:Boolean(p.mustCheck)};
}

function buildHandicapGame(hIdx){
 const h=HANDICAP_MODES[hIdx%HANDICAP_MODES.length],g=newGame(h.opponent);
 for(const sq of h.removeSquares)g.board[sq]='';
 return {...g,handicapId:h.id,handicapTitle:h.title,handicapBonusXp:h.bonusXp,blitzSeconds:h.blitzSeconds||0};
}

export function createTeaChessStall(api){
 const root=new THREE.Group();root.name='SapCoTuongTraDa41';api.world.add(root);
 const wood=api.materials.wood,wall=api.materials.plaster(0xc4baa1),green=new THREE.MeshStandardMaterial({color:0x2f5d46,roughness:.78}),metal=new THREE.MeshStandardMaterial({color:0x464f4a,roughness:.45,metalness:.48}),umbrellaRed=new THREE.MeshStandardMaterial({color:0x9e2f28,roughness:.68,side:THREE.DoubleSide}),umbrellaCream=new THREE.MeshStandardMaterial({color:0xe8dcc2,roughness:.72,side:THREE.DoubleSide});
 const {x,z,doorZ:front}=SHOP;
 const sidewalkZ=9.15;
 function box(px,y,pz,w,h,d,mat,solid=false){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d,2,2,2),mat);
  m.position.set(px,y,pz);m.receiveShadow=true;m.castShadow=true;root.add(m);
  if(solid)api.box(px,pz,w,d);return m;
 }
 function cylinder(px,y,pz,r,h,mat,rBottom=r){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r,rBottom,h,24),mat);
  m.position.set(px,y,pz);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;
 }
 // Hậu cảnh nhà phố Pháp cổ phía sau với phào chỉ nổi 3D, mái ngói và ban công vòm
 box(x,.04,z,7.4,.08,10.5,api.materials.concrete());box(x,1.85,z+5.1,7.4,3.7,.24,wall,true);
 for(const side of [-1,1]){
  box(x+side*3.6,1.85,z,.24,3.7,10.5,wall,true);
  box(x+side*2.45,1.7,front,2.2,3.4,.24,wall,true);
  cylinder(x+side*3.58,5.2,front-.14,.14,9.8,wall);
 }
 box(x,1.7,front,2.6,3.4,.2,wood,true);
 box(x,3.75,z,7.72,.24,10.8,wall);box(x,7.1,z,7.4,6.5,10.5,wall);
 box(x,10.42,z,7.85,.28,10.9,wall);
 for(const y of [5.3,8.3])for(const dx of [-2.2,0,2.2]){
  box(x+dx,y,front-.14,1.34,1.58,.14,wall);
  box(x+dx,y,front-.2,1.18,1.44,.1,green);
  const arch=new THREE.Mesh(new THREE.CylinderGeometry(.62,.62,.16,18,1,false,0,Math.PI),wall);
  arch.rotation.x=Math.PI/2;arch.position.set(x+dx,y+.78,front-.14);root.add(arch);
 }
 // Mái hiên lượn sóng + Ô dù 2 tầng thoáng gió Hà Nội + Đèn lồng phố cổ ngoài vỉa hè
 const awning=box(x,3.35,front-1.45,7.5,.11,3.1,green);awning.rotation.x=.14;
 const valanceGeo=new THREE.CylinderGeometry(.12,.12,7.5,16,1,false,0,Math.PI);valanceGeo.rotateZ(Math.PI/2);
 const valance=new THREE.Mesh(valanceGeo,umbrellaRed);valance.position.set(x,3.14,front-2.98);root.add(valance);
 const parasolProfile=[new THREE.Vector2(0,.64),new THREE.Vector2(.38,.52),new THREE.Vector2(1.08,.28),new THREE.Vector2(1.78,.04),new THREE.Vector2(1.84,-.08)];
 const parasolGeo=new THREE.LatheGeometry(parasolProfile,20);
 for(const side of [-1,1]){
  const uX=x+side*1.85,uZ=sidewalkZ;
  cylinder(uX,1.45,uZ,.042,2.88,metal,.055);
  cylinder(uX,.08,uZ,.28,.14,metal,.34);
  const canopy=new THREE.Mesh(parasolGeo,side<0?umbrellaRed:umbrellaCream);
  canopy.position.set(uX,2.42,uZ);canopy.castShadow=true;root.add(canopy);
  const vent=new THREE.Mesh(new THREE.ConeGeometry(.52,.22,16),side<0?umbrellaCream:umbrellaRed);
  vent.position.set(uX,2.98,uZ);vent.castShadow=true;root.add(vent);
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.085,16,12),new THREE.MeshStandardMaterial({color:0xfffbeb,emissive:0xfbbf24,emissiveIntensity:2.5}));
  bulb.position.set(uX,2.52,uZ);root.add(bulb);
 }
 const sign=api.label('♟ SẠP CỜ TƯỚNG · TRÀ ĐÁ VỈA HÈ 41','#facc15');sign.position.set(x,3.35,sidewalkZ-.95);sign.scale.set(6.2,.76,1);root.add(sign);
 const welcome=api.label('Ngồi vỉa hè phá cờ thế liên hoàn · Cờ chấp & Kỳ vương 5 tầng (Phím E)','#fef08a');welcome.position.set(x,2.68,sidewalkZ-.95);welcome.scale.set(5.4,.46,1);root.add(welcome);
 // Mặt bàn cờ 3D khắc gỗ Hương cao cấp ngoài vỉa hè
 const boardCanvas=document.createElement('canvas');boardCanvas.width=540;boardCanvas.height=600;const ctx=boardCanvas.getContext('2d');
 const bgGrad=ctx.createLinearGradient(0,0,540,600);bgGrad.addColorStop(0,'#d4a359');bgGrad.addColorStop(.5,'#e3b978');bgGrad.addColorStop(1,'#c69247');
 ctx.fillStyle=bgGrad;ctx.fillRect(0,0,540,600);
 ctx.strokeStyle='#4a2c11';ctx.lineWidth=6;ctx.strokeRect(18,18,504,564);
 ctx.strokeStyle='#5c3818';ctx.lineWidth=2.4;
 for(let y=0;y<10;y++){ctx.beginPath();ctx.moveTo(30,30+y*60);ctx.lineTo(510,30+y*60);ctx.stroke();}
 for(let col=0;col<9;col++)for(const [a,b]of col===0||col===8?[[0,9]]:[[0,4],[5,9]]){ctx.beginPath();ctx.moveTo(30+col*60,30+a*60);ctx.lineTo(30+col*60,30+b*60);ctx.stroke();}
 for(const [r1,r2] of [[0,2],[7,9]]){ctx.beginPath();ctx.moveTo(30+3*60,30+r1*60);ctx.lineTo(30+5*60,30+r2*60);ctx.moveTo(30+5*60,30+r1*60);ctx.lineTo(30+3*60,30+r2*60);ctx.stroke();}
 ctx.fillStyle='#4a2c11';ctx.font='bold 24px Georgia, serif';ctx.fillText('楚 河 · SỞ HÀ',78,308);ctx.fillText('HÁN GIỚI · 漢 界',295,308);
 const texture=new THREE.CanvasTexture(boardCanvas);texture.colorSpace=THREE.SRGBColorSpace;
 const boardMat=new THREE.MeshStandardMaterial({map:texture,roughness:.48,metalness:.08}),redMat=new THREE.MeshStandardMaterial({color:0xb91c1c,roughness:.28,metalness:.18}),blackMat=new THREE.MeshStandardMaterial({color:0x1e293b,roughness:.28,metalness:.22}),goldRimMat=new THREE.MeshStandardMaterial({color:0xfbbf24,roughness:.22,metalness:.78}),teaMat=new THREE.MeshStandardMaterial({color:0xd5e1d5,roughness:.22,metalness:.12}),tea=new THREE.MeshStandardMaterial({color:0x854d0e,roughness:.18});
 const pieceGeo=new THREE.LatheGeometry([new THREE.Vector2(0,0),new THREE.Vector2(.045,0),new THREE.Vector2(.048,.012),new THREE.Vector2(.046,.032),new THREE.Vector2(.038,.04),new THREE.Vector2(0,.04)],20);
 const tables=[{x:x-1.85,z:sidewalkZ},{x:x+1.85,z:sidewalkZ}];
 for(const t of tables){
  box(t.x,.79,t.z,1.62,.1,1.52,wood);
  const rim=new THREE.Mesh(new THREE.CylinderGeometry(1.12,1.08,.08,24),wood);rim.scale.set(1,1,.94);rim.position.set(t.x,.78,t.z);root.add(rim);
  for(const dx of [-.58,.58])for(const dz of [-.52,.52])cylinder(t.x+dx,.4,t.z+dz,.048,.75,metal,.034);
  api.circle(t.x,t.z,.88);
  box(t.x,.855,t.z,1.12,.038,1.22,new THREE.MeshStandardMaterial({color:0x5c3415,roughness:.42}));
  const board=new THREE.Mesh(new THREE.PlaneGeometry(1.04,1.14).rotateX(-Math.PI/2),boardMat);board.position.set(t.x,.876,t.z);root.add(board);
  for(let i=0;i<16;i++){
   const px=t.x-.42+(i%4)*.28,pz=t.z+(i<4?-.44:i<8?-.18:i<12?.18:.44);
   const pMesh=new THREE.Mesh(pieceGeo,i<8?redMat:blackMat);pMesh.position.set(px,.876,pz);pMesh.castShadow=true;root.add(pMesh);
   cylinder(px,.917,pz,.036,.004,goldRimMat);
  }
  for(const side of [-1,1]){cylinder(t.x+side*.66,.93,t.z,.078,.15,teaMat,.064);cylinder(t.x+side*.66,1.01,t.z,.068,.006,tea);}
 }
 // Quầy phích nước & ấm trà đá sứ Bát Tràng tiện tròn mềm mại
 box(x,.82,sidewalkZ+1.4,1.35,.1,0.95,wood);
 cylinder(x-.28,1.1,sidewalkZ+1.4,.16,.44,green,.18);
 const teapotBody=new THREE.Mesh(new THREE.SphereGeometry(.16,20,16),umbrellaRed);teapotBody.scale.set(1,.82,1);teapotBody.position.set(x+.28,1.0,sidewalkZ+1.4);root.add(teapotBody);
 const spout=new THREE.Mesh(new THREE.TorusGeometry(.14,.028,10,18,Math.PI),metal);spout.position.set(x-.28,1.38,sidewalkZ+1.4);root.add(spout);
 const crowd=createTeaChessCrowd(root,tables,api.circle);
 api.player.teaChess=normalizeTeaChess(api.player.teaChess);
 let open=false,selected=null,targets=[],hint=null,thinking=false,message='',timer=null,worker=null,serial=0,timeout=null,focusBefore=null,lastNight=false,lastAiStats=null,tacticalBanner=null,blitzTimer=null,blitzLeft=0;
 const panel=document.createElement('div');panel.id='tea-chess-modal';panel.hidden=true;
 panel.innerHTML=`<section role="dialog" aria-modal="true" aria-labelledby="tea-chess-title"><header><div><small>KỲ ĐÀI VỈA HÈ PHÚ THƯỢNG · SỐ 41</small><h2 id="tea-chess-title">♟ Kỳ Đài Vỉa Hè · Cờ Thế Liên Hoàn & Cờ Chấp Cao Thủ</h2></div><button class="tea-close" aria-label="Rời sạp cờ">✕</button></header><main></main></section>`;
 const main=panel.querySelector('main');
 const guide=document.createElement('button');guide.id='arcade-guide';guide.textContent='♟ Cờ vỉa hè';guide.title='Dẫn tới sạp cờ tướng vỉa hè đối diện Ngõ 41';guide.onclick=()=>api.guide({x,z:sidewalkZ-.85,title:'Sạp cờ tướng · Trà đá vỉa hè 41'});
 document.body.append(panel,guide);
 const state=()=>api.player.teaChess;
 const save=()=>api.save();
 const el=(tag,text,parent,cls)=>{const n=document.createElement(tag);if(text!==null)n.textContent=text;if(cls)n.className=cls;parent?.append(n);return n;};
 const button=(text,action,parent,disabled=false)=>{const b=el('button',text,parent);b.type='button';b.onclick=action;b.disabled=disabled;return b;};
 function stopBlitz(){clearInterval(blitzTimer);blitzTimer=null;}
 function syncBlitz(){
  stopBlitz();
  const g=state().active;
  if(!open||!g||g.result||!g.blitzSeconds||g.turn!=='red')return;
  if(blitzLeft<=0)blitzLeft=g.blitzSeconds;
  blitzTimer=setInterval(()=>{
   const cur=state().active;
   if(!open||!cur||cur.result||cur.turn!=='red'){stopBlitz();return;}
   blitzLeft=Math.max(0,blitzLeft-1);
   const badge=main.querySelector('.tea-blitz-clock');
   if(badge){badge.textContent=`⏱️ ${blitzLeft}s`;badge.classList.toggle('danger',blitzLeft<=5);}
   if(blitzLeft<=0){
    stopBlitz();stopJob();
    cur.result={winner:'black',reason:'Hết 15 giây suy nghĩ (Cờ Chớp Sinh Tử)'};
    const settled=finishTeaGame(state(),api.player.day);api.player.teaChess=settled.state;
    playChessSound('check');
    message='⏰ Hết giờ! Trong Cờ Chớp Sinh Tử, quá 15 giây không đi quân là bị xử thua ngay!';
    save();render();
   }
  },1000);
 }
 function stopJob(){serial++;clearTimeout(timer);clearTimeout(timeout);timer=timeout=null;thinking=false;worker?.terminate();worker=null;}
 function close(){if(!open)return;stopJob();stopBlitz();open=false;panel.hidden=true;api.pause(false);save();if(focusBefore?.isConnected)focusBefore.focus({preventScroll:true});}
 panel.querySelector('.tea-close').onclick=close;
 function show(){if(!api.canOpen())return;open=true;focusBefore=document.activeElement;document.exitPointerLock?.();api.pause(true);panel.hidden=false;message=state().active?(state().active.puzzleTitle?`🔥 Đang phá giải ${state().active.puzzleTitle}: Hãy chiếu liên hoàn buộc Tướng đen quy hàng!`:state().active.handicapTitle?`⚔️ ${state().active.handicapTitle}: Hãy cẩn trọng từng nước cờ!`:ELDERS[state().active.opponent].opening):'Chọn "🔥 Cờ Thế Giang Hồ Liên Hoàn", thử sức "⚔️ Cờ Chấp Cao Thủ", hoặc đấu trí cùng 3 vị Kỳ Vương vỉa hè!';render();panel.querySelector('.tea-close').focus();schedule();syncBlitz();}
 function requestMove(side,options,done){
  stopJob();thinking=true;const id=++serial;render();
  try{worker=new Worker(new URL('./xiangqi-worker.mjs',import.meta.url),{type:'module'});
   const fail=()=>{if(id!==serial||!open)return;stopJob();message='Chưa tính được nước cờ. Bấm Tiếp tục tính nước để thử lại; ván vẫn được giữ.';render();};
   worker.onerror=fail;worker.onmessage=({data})=>{if(data.id!==id||!open)return;clearTimeout(timeout);thinking=false;worker.terminate();worker=null;if(data.error){message='Không tính được nước cờ, hãy thử lại.';render();return;}done(data.move);};
   timeout=setTimeout(fail,10000);worker.postMessage({id,board:state().active.board,side,options});
  }catch{stopJob();message='Trình duyệt chưa mở được máy tính cờ. Ván đã lưu; hãy tải lại trang và chơi tiếp.';render();}
 }
 function schedule(){if(!open||thinking||timer||!state().active||state().active.result||state().active.turn!=='black')return;
  stopBlitz();
  const g=state().active,elder=ELDERS[g.opponent]||ELDERS[2];
  const depth=g.puzzleId?5:(elder.depth||4);
  const maxNodes=g.puzzleId?45000:(elder.maxNodes||28000);
  const budgetMs=g.puzzleId?900:(elder.budgetMs||650);
  const useBook=!g.puzzleId&&!g.handicapId&&g.ply<=4;
  thinking=true;render();
  timer=setTimeout(()=>{timer=null;requestMove('black',{depth,maxNodes,budgetMs,useBook},move=>{
   if(!move){message='Đối phương không còn nước hợp lệ.';render();return;}
   lastAiStats={depth:move.depth||depth,nodes:move.nodes||0,score:move.score||0,pv:move.pv||[],book:Boolean(move.book)};
   movePiece(move.from,move.to,true);
  });},420);
 }
 function startPuzzle(pIdx=0){
  stopJob();stopBlitz();const p=SIDEWALK_PUZZLES[pIdx%SIDEWALK_PUZZLES.length];
  state().active=buildPuzzleGame(pIdx);selected=null;targets=[];hint=null;lastAiStats=null;tacticalBanner=null;blitzLeft=0;
  message=`🔥 ${p.title}: ${p.desc}`;save();render();
 }
 function startHandicap(hIdx=0){
  stopJob();stopBlitz();const h=HANDICAP_MODES[hIdx%HANDICAP_MODES.length];
  state().active=buildHandicapGame(hIdx);selected=null;targets=[];hint=null;lastAiStats=null;tacticalBanner=null;blitzLeft=h.blitzSeconds||0;
  message=`⚔️ ${h.title}: ${h.desc}`;save();render();syncBlitz();
 }
 function movePiece(from,to,bot=false){
  const old=state().active,description=moveLabel(old.board,from,to),wasCapture=Boolean(old.board[to]),pattern=detectTacticalPattern(old.board,from,to),next=playMove(old,from,to);if(!next)return;
  if(old.puzzleId){next.puzzleId=old.puzzleId;next.puzzleTitle=old.puzzleTitle;next.puzzleHint=old.puzzleHint;next.puzzleRewardXp=old.puzzleRewardXp;next.mustCheck=old.mustCheck;}
  if(old.handicapId){next.handicapId=old.handicapId;next.handicapTitle=old.handicapTitle;next.handicapBonusXp=old.handicapBonusXp;next.blitzSeconds=old.blitzSeconds;}
  // Trong chế độ Cờ Thế Giang Hồ bắt buộc chiếu liên hoàn (mustCheck): nếu Đỏ đi nước không chiếu Tướng và chưa chiếu bí, Đen phản sát ngay!
  if(old.puzzleId&&old.mustCheck&&!bot&&!next.result&&!inCheck(next.board,'black')){
   playChessSound('check');
   message=`⚠️ Sai quy tắc Cờ Thế Giang Hồ! Nước "${description}" không chiếu Tướng khiến Đen kịp phản công sát cục! Hãy thử lại nước chiếu hiểm hơn.`;
   save();render();return;
  }
  state().active=next;selected=null;targets=[];hint=null;tacticalBanner=pattern;
  if(next.blitzSeconds&&next.turn==='red')blitzLeft=next.blitzSeconds;
  const nowChecked=inCheck(next.board,next.turn);
  playChessSound(nowChecked||next.result?'check':wasCapture?'capture':'move');
  const aiNote=bot&&lastAiStats?(lastAiStats.book?' (Khai cuộc Cẩm Nang Kỳ Phổ)':` (Tính sâu ${lastAiStats.depth} tầng · ${lastAiStats.nodes.toLocaleString('vi-VN')} thế biến)`):'';
  message=bot?`🧠 ${ELDERS[next.opponent].name}: ${description}${aiNote}. Đến lượt cháu!`:`Bạn: ${description}${inCheck(next.board,'black')?' · ⚡ CHIẾU TƯỚNG!':''}`;
  if(next.result){
   stopBlitz();
   const settlement=finishTeaGame(state(),api.player.day);api.player.teaChess=settlement.state;
   const specialBonus=(old.puzzleId&&next.result.winner==='red'?(old.puzzleRewardXp||65):0)+(old.handicapId&&next.result.winner==='red'?(old.handicapBonusXp||95):0);
   const totalXp=(settlement.xp||0)+(settlement.challengeXp||0)+specialBonus;
   if(totalXp)api.reward?.(totalXp);
   message=old.puzzleId&&next.result.winner==='red'
    ?`🏆 Kỳ nghệ tuyệt đỉnh! Bạn đã phá giải hoàn hảo "${old.puzzleTitle}" (+${totalXp} XP)!`
    :old.handicapId&&next.result.winner==='red'
     ?`👑 Đại thắng Cờ Chấp! Bạn đã vượt qua "${old.handicapTitle}" (+${totalXp} XP)!`
     :`${next.result.winner==='red'?'🏆 Bạn thắng ván cờ':next.result.winner==='draw'?'🤝 Hai bên hòa cờ':'😤 '+ELDERS[next.opponent].name+' thắng ván cờ'} · ${next.result.reason}${totalXp?' · +'+totalXp+' XP':''}.`;
  }
  save();render();schedule();syncBlitz();
 }
 function start(i){stopJob();stopBlitz();state().active=newGame(i);message=ELDERS[i].opening;selected=null;targets=[];hint=null;lastAiStats=null;tacticalBanner=null;blitzLeft=0;save();render();}
 function retire(){const game=state().active;if(game&&!game.result){stopJob();game.result={winner:'black',reason:'Bạn xin thua'};const settled=finishTeaGame(state(),api.player.day);api.player.teaChess=settled.state;if(settled.xp||settled.challengeXp)api.reward?.(settled.xp+settled.challengeXp);save();message='Ông mỉm cười: Ván sau mình chơi tiếp. Cứ xem lại nước đi rồi hãy đứng dậy.';render();}}
 function sip(){if(state().teaDay===api.player.day)return;state().teaDay=api.player.day;api.player.stamina=Math.min(100,api.player.stamina+12);const challenge=recordTeaChallenge(state(),api.player.day,'tea');api.player.teaChess=challenge.state;if(challenge.challengeXp)api.reward?.(challenge.challengeXp);message=`Chén trà đá mát lạnh · hồi 12 thể lực. Ông Lâm: Uống chậm thôi, nghĩ nước cờ rồi hẵng đi.${challenge.challengeXp?' · thử thách ngày +'+challenge.challengeXp+' XP':''}`;save();render();}
 function chat(i){const s=state();message=ELDERS[i].name+': “'+ELDERS[i].story+'”';if(s.talkDays[i]!==api.player.day){s.talkDays[i]=api.player.day; s.friendship[i]=Math.min(100,s.friendship[i]+3);const challenge=recordTeaChallenge(s,api.player.day,'talk');api.player.teaChess=challenge.state;api.reward?.(5+(challenge.challengeXp||0));if(challenge.challengeXp)message+=` · thử thách ngày +${challenge.challengeXp} XP`;save();}render();}
 function render(){
  const oldFocus=document.activeElement?.dataset?.square;main.replaceChildren();const s=state(),game=s.active;
  const challenge=TEA_CHALLENGES[(Math.max(1,api.player.day)-1)%TEA_CHALLENGES.length];const activeChallenge=s.challengeDay===api.player.day?s.challengeProgress:0;
  const topStrip=el('div',null,main,'tea-top-strip');
  const stats=el('div',`🏆 Thành tích: ${s.games} ván · ${s.wins} thắng · ${s.draws} hòa`,topStrip,'tea-progress');
  stats.title='Chơi để thân quen và mở bạn cờ mới. Không có tiền cược.';
  const daily=el('div',`📌 Thử thách hôm nay: ${challenge.label} (${Math.min(activeChallenge,challenge.goal)}/${challenge.goal})${s.challengeClaimed?' ✓':''}`,topStrip,'tea-challenge');

  const modesWrap=el('div',null,main,'tea-modes-wrap');
  const puzzleBar=el('div',null,modesWrap,'tea-puzzle-bar');
  el('strong','🔥 Cờ Thế Giang Hồ (Chiếu Liên Hoàn Phá Thế):',puzzleBar);
  SIDEWALK_PUZZLES.forEach((p,idx)=>{
   const b=button(p.badge,()=>startPuzzle(idx),puzzleBar);
   b.title=p.title+' — '+p.desc;
   if(game?.puzzleId===p.id)b.classList.add('active-puzzle');
  });

  const handicapBar=el('div',null,modesWrap,'tea-puzzle-bar tea-handicap-bar');
  el('strong','⚔️ Cờ Chấp Cao Thủ (Độ Khó Siêu Cấp):',handicapBar);
  HANDICAP_MODES.forEach((h,idx)=>{
   const b=button(h.badge,()=>startHandicap(idx),handicapBar);
   b.title=h.title+' — '+h.desc;
   if(game?.handicapId===h.id)b.classList.add('active-puzzle');
  });

  const row=el('div',null,main,'tea-elders'+(game&&!game.result?' playing':''));
  ELDERS.forEach((e,i)=>{const card=el('article',null,row,'tea-elder'+(game?.opponent===i&&!game?.puzzleId&&!game?.handicapId?' current':''));const face=el('div',i===0?'👴🏻':i===1?'👴🏽':'👴🏼',card,'elder-portrait');face.style.setProperty('--elder-coat',e.color);el('strong',`${e.name} (AI Tầng ${e.depth})`,card);el('small',e.title,card);el('span',`Thân quen ${s.friendship[i]}/100`,card);
   if(!game||game.result||game.puzzleId||game.handicapId)button(elderUnlocked(s,i)?`⚔️ Thách đấu (${e.depth} tầng)`:i===1?'Chơi xong 1 ván để mở':'Thắng 1 hoặc chơi 3 ván',()=>start(i),card,!elderUnlocked(s,i));
   button('Nghe chuyện phố',()=>chat(i),card,!elderUnlocked(s,i));
  });
  const status=el('div',message,main,'tea-dialogue');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const layout=el('div',null,main,'tea-layout');const play=el('div',null,layout,'tea-play');
  const turnHeader=el('div',null,play,'tea-turn-header');
  const turnLabel=game?(game.result?'🏁 Ván cờ đã phân thắng bại':game.puzzleId?`🔥 ${game.puzzleTitle} · Mỗi nước Đỏ đều phải CHIẾU TƯỚNG!`:game.handicapId?`⚔️ ${game.handicapTitle}`:thinking?`🧠 ${ELDERS[game.opponent].name} đang tính sâu ${ELDERS[game.opponent].depth} tầng biến hóa…`:game.turn==='red'?'🔴 Lượt của bạn (Quân Đỏ)':'⚫ Lượt Quân Đen'):'Chọn Chế Độ Cờ Thế, Cờ Chấp hoặc thách đấu Kỳ Vương';
  el('p',turnLabel,turnHeader,'tea-turn');
  if(game?.blitzSeconds&&!game.result){
   const clk=el('span',`⏱️ ${blitzLeft||game.blitzSeconds}s`,turnHeader,'tea-blitz-clock'+((blitzLeft||game.blitzSeconds)<=5?' danger':''));
   clk.title='Đồng hồ Cờ Chớp Sinh Tử: Quá 15 giây mỗi lượt sẽ bị xử thua!';
  }
  if(tacticalBanner&&game&&!game.result){
   const banner=el('div',tacticalBanner.tag,play,'tea-tactical-banner');
   banner.style.setProperty('--tac-color',tacticalBanner.color||'#fbbf24');
  }
  if(game){
   // Thanh đo lợi thế thế trận (Tactical Evaluation Bar)
   const evalScore=evaluateBoard(game.board,'red');
   const redPct=Math.max(8,Math.min(92,Math.round(50+Math.tanh(evalScore/650)*44)));
   const evalBar=el('div',null,play,'tea-eval-bar');
   evalBar.title=`Đánh giá thế trận: ${evalScore>=0?'Đỏ ưu +'+evalScore:'Đen ưu '+Math.abs(evalScore)}`;
   evalBar.innerHTML=`<div class="tea-eval-red" style="width:${redPct}%"></div><span class="tea-eval-label">${evalScore>60?`🔴 Đỏ ưu thế (+${evalScore})`:evalScore<-60?`⚫ Đen ưu thế (+${Math.abs(evalScore)})`:'⚖️ Thế trận cân bằng'}</span>`;

   const board=el('div',null,play,'xiangqi-board');board.setAttribute('role','group');board.setAttribute('aria-label','Bàn cờ tướng 9 cột 10 hàng. Bạn cầm quân đỏ.');
   let lines='';for(let y=0;y<10;y++)lines+=`<path d="M50 ${50+y*100}H850"/>`;for(let x=0;x<9;x++)lines+=x===0||x===8?`<path d="M${50+x*100} 50V950"/>`:`<path d="M${50+x*100} 50V450M${50+x*100} 550V950"/>`;
   // Các dấu thập hoa thị chuẩn bàn cờ tướng truyền thống tại vị trí Pháo và Tốt
   const crosses=[[1,2],[7,2],[0,3],[2,3],[4,3],[6,3],[8,3],[0,6],[2,6],[4,6],[6,6],[8,6],[1,7],[7,7]].map(([cx,cy])=>{
    const px=50+cx*100,py=50+cy*100,d=16,g=7;
    let c='';
    if(cx>0)c+=`<path d="M${px-d} ${py-g}H${px-g}V${py-d}M${px-d} ${py+g}H${px-g}V${py+d}"/>`;
    if(cx<8)c+=`<path d="M${px+d} ${py-g}H${px+g}V${py-d}M${px+d} ${py+g}H${px+g}V${py+d}"/>`;
    return c;
   }).join('');
   // Đánh số lộ chuẩn Cờ Tướng (Đen 1 → 9 ở đỉnh bàn, Đỏ 九 → 一 ở đáy bàn)
   const topCoords=[1,2,3,4,5,6,7,8,9].map((n,cx)=>`<text x="${50+cx*100}" y="22" class="xq-coord">${n}</text>`).join('');
   const botCoords=['九','八','七','六','五','四','三','二','一'].map((n,cx)=>`<text x="${50+cx*100}" y="990" class="xq-coord">${n}</text>`).join('');
   let moveArrow='';
   if(game.last){
    const fx=50+(game.last.from%9)*100,fy=50+Math.floor(game.last.from/9)*100;
    const tx=50+(game.last.to%9)*100,ty=50+Math.floor(game.last.to/9)*100;
    moveArrow+=`<line x1="${fx}" y1="${fy}" x2="${tx}" y2="${ty}" stroke="#fbbf24" stroke-width="7" stroke-linecap="round" stroke-dasharray="14 9" opacity="0.86"/><circle cx="${tx}" cy="${ty}" r="11" fill="#fbbf24" opacity="0.88"/>`;
   }
   if(hint){
    const hfx=50+(hint.from%9)*100,hfy=50+Math.floor(hint.from/9)*100;
    const htx=50+(hint.to%9)*100,hty=50+Math.floor(hint.to/9)*100;
    moveArrow+=`<line x1="${hfx}" y1="${hfy}" x2="${htx}" y2="${hty}" stroke="#38bdf8" stroke-width="8" stroke-linecap="round" stroke-dasharray="10 8" opacity="0.92"/><circle cx="${htx}" cy="${hty}" r="14" fill="none" stroke="#38bdf8" stroke-width="5"/>`;
   }
   board.innerHTML=`<svg viewBox="0 0 900 1000" aria-hidden="true"><defs><linearGradient id="riverGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#432812" stop-opacity="0.18"/><stop offset="50%" stop-color="#784820" stop-opacity="0.32"/><stop offset="100%" stop-color="#432812" stop-opacity="0.18"/></linearGradient></defs><rect x="26" y="26" width="848" height="948" rx="14" fill="none" stroke="#4a2c10" stroke-width="8"/><rect x="50" y="450" width="800" height="100" fill="url(#riverGrad)"/><g fill="none" stroke="#4b2e14" stroke-width="3">${lines}<path d="M350 50L550 250M550 50L350 250M350 750L550 950M550 750L350 950" stroke-dasharray="10 6"/>${crosses}</g>${moveArrow}${topCoords}${botCoords}<text x="245" y="512" text-anchor="middle">楚 河 · SỞ HÀ</text><text x="655" y="512" text-anchor="middle">HÁN GIỚI · 漢 界</text></svg>`;
   const redInChk=inCheck(game.board,'red'),blkInChk=inCheck(game.board,'black');
   game.board.forEach((p,i)=>{const target=targets.includes(i),isCheckedKing=(p==='K'&&redInChk)||(p==='k'&&blkInChk),b=button('',()=>{
    if(thinking||game.result||game.turn!=='red')return;
    if(target&&selected!==null){movePiece(selected,i);return;}
    if(sideOf(p)==='red'){selected=i;targets=legalMoves(game.board,'red',i).map(m=>m.to);message=`${PIECE_NAMES[p]} (${GLYPHS[p]}): chọn một điểm sáng để xuất chiêu.`;}else{selected=null;targets=[];message='Chọn một quân Đỏ của bạn trước.';}render();
   },board,thinking||!!game.result||game.turn!=='red');
   if(p){
    b.innerHTML=`<span class="xq-han">${GLYPHS[p]}</span><small class="xq-vn">${PIECE_NAMES[p.toUpperCase()]}</small>`;
   }
   b.dataset.square=i;b.style.left=((i%9+.5)/9*100)+'%';b.style.top=((Math.floor(i/9)+.5)/10*100)+'%';b.className='xiangqi-point '+(p?'piece '+sideOf(p):'empty')+(selected===i?' selected':'')+(target?' legal':'')+([game.last?.from,game.last?.to].includes(i)?' last-move':'')+([hint?.from,hint?.to].includes(i)?' hint':'')+(isCheckedKing?' in-check-king':'');
   b.setAttribute('aria-label',`${p?(sideOf(p)==='red'?'Đỏ ':'Đen ')+PIECE_NAMES[p.toUpperCase()]:'Ô trống'} · cột ${i%9+1} hàng ${10-Math.floor(i/9)}${target?' · có thể đi tới':''}`);if(p)b.title=`${PIECE_NAMES[p.toUpperCase()]} (${GLYPHS[p]})`;
   });
   if(!game.result&&(redInChk||blkInChk))el('p',redInChk?'🚨 BÁO ĐỘNG: Tướng Đỏ đang bị CHIẾU! Hãy hóa giải ngay!':'⚡ CHIẾU TƯỚNG! Quân Đen đang bị dồn vào chân tường!',play,'tea-check');
   const controls=el('div',null,play,'tea-controls');
   button(game.puzzleId?'💡 Gợi ý tuyệt sát':'🧠 Phân tích nước đi cao thủ',()=>{
    requestMove('red',{depth:5,maxNodes:38000,budgetMs:800},m=>{
     hint=m;
     let pvText='';
     if(m?.pv?.length){
      let tmpB=game.board.slice();
      const steps=m.pv.slice(0,3).map(step=>{const txt=traditionalNotation(tmpB,step.from,step.to);tmpB=moved(tmpB,step.from,step.to);return txt;});
      pvText=` · Biến chính dự kiến: ${steps.join(' → ')}`;
     }
     const hintNote=game.puzzleHint?` (${game.puzzleHint})`:'';
     message=m?`💡 Kỳ sư phân tích sâu ${m.depth||5} tầng: Nên đi ${moveLabel(game.board,m.from,m.to)}${pvText}${hintNote}`:'Không còn nước hợp lệ.';
     render();
    });
   },controls,thinking||!!game.result||game.turn!=='red');
   button('↩️ Đi lại nước vừa rồi',()=>{stopJob();state().active=undoRound(game);selected=null;targets=[];hint=null;tacticalBanner=null;if(state().active?.blitzSeconds)blitzLeft=state().active.blitzSeconds;message='Đã lùi lại 1 nhịp cờ để bạn tính toán phương án sâu sắc hơn.';save();render();schedule();syncBlitz();},controls,thinking||!game.history.length||!!game.result);
   if(!game.result)button('🏳️ Đổi ván / Xin thua',retire,controls,thinking);
   if(!game.result&&game.turn==='black'&&!thinking)button('⚡ Giục đối thủ đi tiếp',schedule,controls);
  }else{
   const invitation=el('div',null,play,'tea-invitation');el('span','♟',invitation);el('h3','Kỳ Đài Vỉa Hè Số 41 Phú Thượng',invitation);el('p','Thử sức phá 6 thế cờ giang hồ hiểm hóc (Thiết Mã Hiến Xe, Song Pháo Quá Giang, Thất Tinh Tụ Hội, Thiên Lý Độc Hành, Khổng Minh Tá Tiễn, Bạch Mã Hiện Đề), đấu Cờ Chấp, Cờ Chớp 15s, hoặc so tài cùng Kỳ Vương Ông Sơn!',invitation);
   const quickBtn=button('🔥 Thử Sức Ngay: Thế 1 · Thiết Mã Hiến Xe',()=>startPuzzle(0),invitation);quickBtn.style.marginTop='12px';
  }
  const aside=el('aside',null,layout,'tea-aside');
  // Hiển thị thông số đọc vị suy nghĩ của AI (Principal Variation)
  if(game&&lastAiStats&&!game.result){
   const aiBox=el('div',null,aside,'tea-ai-mind');
   let pvLine='';
   if(lastAiStats.pv?.length>1){
    let bCopy=game.board.slice();
    const nextSteps=lastAiStats.pv.slice(1,4).map(st=>{
     const lbl=traditionalNotation(bCopy,st.from,st.to);
     bCopy=moved(bCopy,st.from,st.to);
     return lbl;
    }).filter(Boolean);
    if(nextSteps.length)pvLine=`<div><small>Dự tính tiếp theo:</small> <strong>${nextSteps.join(' → ')}</strong></div>`;
   }
   aiBox.innerHTML=`<div class="ai-mind-head">🧠 <strong>Tư duy Kỳ Vương (${lastAiStats.book?'Sách Khai Cuộc':'Tầng '+lastAiStats.depth})</strong></div><div class="ai-mind-meta">Đã duyệt: <b>${lastAiStats.nodes.toLocaleString('vi-VN')}</b> thế biến · Điểm: <b>${lastAiStats.score>=0?'+'+lastAiStats.score:lastAiStats.score}</b></div>${pvLine}`;
  }
  // Hiển thị các quân đã ăn được của hai bên
  if(game){
   const startCounts={R:2,N:2,C:2,B:2,A:2,P:5,r:2,n:2,c:2,b:2,a:2,p:5};
   for(const sq of game.board)if(sq&&startCounts[sq]!==undefined)startCounts[sq]=Math.max(0,startCounts[sq]-1);
   const capByRed=[],capByBlack=[];
   for(const k of ['r','n','c','b','a','p'])for(let c=0;c<startCounts[k];c++)capByRed.push(GLYPHS[k]);
   for(const k of ['R','N','C','B','A','P'])for(let c=0;c<startCounts[k];c++)capByBlack.push(GLYPHS[k]);
   el('h3','Chiến lợi phẩm trên bàn',aside);
   const tray=el('div',null,aside,'tea-captured-tray');
   tray.innerHTML=`<div><small>Quân Đen bị bạn bắt:</small><div class="cap-row cap-black">${capByRed.length?capByRed.map(g=>`<span>${g}</span>`).join(''):'<em>Chưa bắt quân nào</em>'}</div></div><div><small>Quân Đỏ bị mất:</small><div class="cap-row cap-red">${capByBlack.length?capByBlack.map(g=>`<span>${g}</span>`).join(''):'<em>Chưa mất quân nào</em>'}</div></div>`;
  }
  el('h3','Ấm trà đá vỉa hè',aside);
  button(s.teaDay===api.player.day?'✓ Đã thưởng trà đá hôm nay':'🍵 Uống trà đá · Hồi 12% thể lực',sip,aside,s.teaDay===api.player.day);
  el('h3','Bí quyết Kỳ Vương',aside);el('p',ELDERS[game?.opponent??2].tip,aside);
  const rules=el('details',null,aside);el('summary','Luật Cờ Thế & Cờ Chấp',rules);el('p','Trong Cờ Thế Giang Hồ, mỗi nước Đỏ đi đều phải CHIẾU TƯỚNG liên hoàn không cho Đen kịp thở. Trong Cờ Chấp, bạn tự nhường trước 1 Xe hoặc Đôi Mã để thử thách trí lực đỉnh cao.',rules);
  if(game?.history.length){el('h3','Biên bản kỳ phổ',aside);const log=el('ol',null,aside,'tea-log');for(const h of game.history.slice(-8))el('li',(sideOf(h.piece)==='red'?'🔴 Bạn: ':'⚫ '+ELDERS[game.opponent].name+': ')+moveLabel(h.board,h.from,h.to)+(h.taken?' · ăn '+PIECE_NAMES[h.taken.toUpperCase()]:''),log);}
  if(oldFocus!==undefined)main.querySelector(`[data-square="${oldFocus}"]:not(:disabled)`)?.focus({preventScroll:true});
 }
 function near(){const c=api.context();return !c.night&&Math.abs(c.x-x)<4.6&&c.z>5.6&&c.z<front+.8;}
 window.addEventListener('keydown',e=>{if(!open)return;
  if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return;}
  if(e.code==='Tab'){const list=[...panel.querySelectorAll('button:not(:disabled),summary')],first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}return;}
  if(/^(Key[A-Z]|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Space|ShiftLeft|ShiftRight)$/.test(e.code)){e.stopImmediatePropagation();if(e.code==='Space'&&e.target.tagName!=='BUTTON')e.preventDefault();}
 },true);
 return {prompt:()=>near()?'♟ Ngồi sạp cờ tướng vỉa hè · Giải cờ thế & uống trà đá (E)':'',interact:()=>{if(!near())return false;show();return true;},openDirect:()=>show(),close,update:()=>{const c=api.context();if(!c.night&&Math.hypot(c.x-x,c.z-sidewalkZ)<26)crowd.update(performance.now()/1000);guide.hidden=c.night;if(lastNight!==c.night){root.visible=!c.night;if(c.night)close();lastNight=c.night;}}};
}
