// Casual Xiangqi: orthodox movement, check and stalemate loss.
// Repetition is a declared house-rule draw, not WXF chase adjudication.
export const PIECE_NAMES={K:'Tướng',A:'Sĩ',B:'Tượng',N:'Mã',R:'Xe',C:'Pháo',P:'Tốt'};
export const GLYPHS={K:'帥',A:'仕',B:'相',N:'傌',R:'俥',C:'炮',P:'兵',k:'將',a:'士',b:'象',n:'馬',r:'車',c:'砲',p:'卒'};
export const sideOf=p=>!p?null:p===p.toUpperCase()?'red':'black';
export const other=s=>s==='red'?'black':'red';
export function initialBoard(){const b=Array(90).fill('');for(const [row,line] of [[0,'rnbakabnr'],[9,'RNBAKABNR']])for(let x=0;x<9;x++)b[row*9+x]=line[x];for(const row of [2,7])for(const x of [1,7])b[row*9+x]=row===2?'c':'C';for(const row of [3,6])for(let x=0;x<9;x+=2)b[row*9+x]=row===3?'p':'P';return b;}
const inside=(x,y)=>x>=0&&x<9&&y>=0&&y<10;
const palace=(x,y,s)=>x>=3&&x<=5&&(s==='red'?y>=7&&y<=9:y>=0&&y<=2);
export function pseudoMoves(board,from){
 const p=board[from];if(!p)return [];const s=sideOf(p),type=p.toUpperCase(),x=from%9,y=Math.floor(from/9),out=[];
 const add=(nx,ny)=>{if(inside(nx,ny)&&sideOf(board[ny*9+nx])!==s)out.push(ny*9+nx);};
 if(type==='R'||type==='C')for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){let screen=false;for(let nx=x+dx,ny=y+dy;inside(nx,ny);nx+=dx,ny+=dy){const q=board[ny*9+nx];if(type==='R'){add(nx,ny);if(q)break;}else if(!screen){if(q)screen=true;else add(nx,ny);}else if(q){add(nx,ny);break;}}}
 if(type==='N')for(const [dx,dy]of [[1,2],[-1,2],[1,-2],[-1,-2],[2,1],[2,-1],[-2,1],[-2,-1]]){const lx=x+(Math.abs(dx)===2?Math.sign(dx):0),ly=y+(Math.abs(dy)===2?Math.sign(dy):0);if(!board[ly*9+lx])add(x+dx,y+dy);}
 if(type==='B')for(const [dx,dy]of [[2,2],[-2,2],[2,-2],[-2,-2]]){const ny=y+dy;if((s==='red'?ny>=5:ny<=4)&&!board[(y+dy/2)*9+x+dx/2])add(x+dx,ny);}
 if(type==='A')for(const [dx,dy]of [[1,1],[-1,1],[1,-1],[-1,-1]])if(palace(x+dx,y+dy,s))add(x+dx,y+dy);
 if(type==='K'){
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])if(palace(x+dx,y+dy,s))add(x+dx,y+dy);
  for(const dy of [-1,1])for(let ny=y+dy;inside(x,ny);ny+=dy){const q=board[ny*9+x];if(q){if(q.toUpperCase()==='K'&&sideOf(q)!==s)add(x,ny);break;}}
 }
 if(type==='P'){add(x,y+(s==='red'?-1:1));if(s==='red'?y<=4:y>=5){add(x-1,y);add(x+1,y);}}
 return out;
}
export function moved(board,from,to){const next=board.slice();next[to]=next[from];next[from]='';return next;}
export function inCheck(board,side){const king=board.indexOf(side==='red'?'K':'k');if(king<0)return true;for(let i=0;i<90;i++)if(sideOf(board[i])===other(side)&&pseudoMoves(board,i).includes(king))return true;return false;}
export function legalMoves(board,side,onlyFrom=null){const out=[];for(let i=0;i<90;i++){if(onlyFrom!==null&&onlyFrom!==i)continue;if(sideOf(board[i])!==side)continue;for(const to of pseudoMoves(board,i))if(!inCheck(moved(board,i,to),side))out.push({from:i,to});}return out;}
export const positionKey=(b,s)=>b.map(p=>p||'.').join('')+s;
export function newGame(opponent=0){const board=initialBoard();return {board,turn:'red',opponent,ply:0,quiet:0,history:[],positions:[positionKey(board,'red')],result:null,last:null,startedAt:Date.now()};}
export function playMove(game,from,to){
 if(game.result||!legalMoves(game.board,game.turn,from).some(m=>m.to===to))return null;
 const piece=game.board[from],taken=game.board[to],board=moved(game.board,from,to),turn=other(game.turn),key=positionKey(board,turn),positions=[...game.positions,key].slice(-121),quiet=taken?0:game.quiet+1;
 const history=[...game.history,{board:game.board.slice(),turn:game.turn,quiet:game.quiet,from,to,piece,taken}].slice(-240);
 let result=null;
 if(!legalMoves(board,turn).length)result={winner:game.turn,reason:inCheck(board,turn)?'Chiếu hết':'Hết nước hợp lệ'};
 else if(positions.filter(k=>k===key).length>=3)result={winner:'draw',reason:'Hòa theo lệ quán: lặp vị trí ba lần'};
 else if(quiet>=120)result={winner:'draw',reason:'Hòa theo lệ quán: 60 lượt không ăn quân'};
 return {...game,board,turn,history,positions,quiet,ply:game.ply+1,last:{from,to},result};
}
export function undoRound(game){
 if(!game.history.length||game.result)return game;
 const count=game.turn==='red'?Math.min(2,game.history.length):1,history=game.history.slice(0,-count),restore=game.history[game.history.length-count];
 return {...game,board:restore.board.slice(),turn:restore.turn,quiet:restore.quiet,history,positions:game.positions.slice(0,-count),ply:game.ply-count,last:history.length?{from:history.at(-1).from,to:history.at(-1).to}:null,result:null};
}
const VALUES={K:20000,R:980,C:480,N:440,A:210,B:210,P:110};
// Bảng điểm vị trí chiến thuật (Positional Square Tables) tính từ hàng tiến công 0..9 (0 = đáy nhà, 9 = đáy địch)
const PST_R=[
 -6,  6,  4, 12,  0, 12,  4,  6, -6,
  6, 10,  8, 16, 12, 16,  8, 10,  6,
  6,  8,  8, 14, 12, 14,  8,  8,  6,
  8, 12, 10, 18, 16, 18, 10, 12,  8,
 12, 18, 16, 24, 22, 24, 16, 18, 12,
 14, 22, 20, 28, 26, 28, 20, 22, 14,
 18, 26, 24, 32, 34, 32, 24, 26, 18,
 20, 28, 26, 36, 38, 36, 26, 28, 20,
 24, 32, 30, 42, 45, 42, 30, 32, 24,
 18, 26, 24, 34, 36, 34, 24, 26, 18
];
const PST_N=[
-18,-10,-12,-10,-12,-10,-12,-10,-18,
 -8,  4,  8,  6, -4,  6,  8,  4, -8,
 -4,  8, 16, 14, 12, 14, 16,  8, -4,
  2, 10, 18, 22, 20, 22, 18, 10,  2,
  6, 16, 24, 28, 26, 28, 24, 16,  6,
 10, 22, 30, 36, 34, 36, 30, 22, 10,
 12, 26, 34, 44, 42, 44, 34, 26, 12,
 10, 28, 38, 48, 46, 48, 38, 28, 10,
  4, 18, 28, 36, 24, 36, 28, 18,  4,
 -8,  6, 12, 18, 10, 18, 12,  6, -8
];
const PST_C=[
  0,  2,  6, 10, 14, 10,  6,  2,  0,
  2,  6,  8, 12, 18, 12,  8,  6,  2,
  4,  8, 12, 18, 28, 18, 12,  8,  4,
  4,  8, 10, 18, 26, 18, 10,  8,  4,
  6, 10, 14, 22, 30, 22, 14, 10,  6,
  8, 12, 16, 24, 32, 24, 16, 12,  8,
 10, 14, 18, 26, 34, 26, 18, 14, 10,
 12, 18, 22, 28, 36, 28, 22, 18, 12,
 10, 14, 18, 22, 26, 22, 18, 14, 10,
  6, 10, 12, 16, 18, 16, 12, 10,  6
];
const PST_P=[
  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  0,  0,  0,  0,  0,  0,  0,
  4,  0,  8,  0, 14,  0,  8,  0,  4,
 10,  0, 16,  0, 24,  0, 16,  0, 10,
 26, 34, 42, 50, 56, 50, 42, 34, 26,
 38, 48, 58, 70, 78, 70, 58, 48, 38,
 48, 60, 74, 88, 96, 88, 74, 60, 48,
 52, 66, 80, 96,105, 96, 80, 66, 52,
 22, 30, 38, 46, 52, 46, 38, 30, 22
];

export function evaluateBoard(board,side){
 let score=0,redR=0,blackR=0,redA=0,blackA=0,redB=0,blackB=0,redKing=85,blackKing=4;
 for(let i=0;i<90;i++){
  const p=board[i];if(!p)continue;
  if(p==='K')redKing=i;else if(p==='k')blackKing=i;
  else if(p==='R')redR++;else if(p==='r')blackR++;
  else if(p==='A')redA++;else if(p==='a')blackA++;
  else if(p==='B')redB++;else if(p==='b')blackB++;
 }
 const redKx=redKing%9,redKy=Math.floor(redKing/9),blackKx=blackKing%9,blackKy=Math.floor(blackKing/9);
 for(let i=0;i<90;i++){
  const p=board[i];if(!p)continue;
  const s=sideOf(p),type=p.toUpperCase(),x=i%9,y=Math.floor(i/9),advY=s==='red'?9-y:y,pstIdx=advY*9+x;
  let v=VALUES[type];
  if(type==='R'){
   v+=PST_R[pstIdx];
   // Thưởng Xe chiếm lộ thông thoáng và khống chế hàng kẹp Tướng đối phương
   const enemyKy=s==='red'?blackKy:redKy,enemyKx=s==='red'?blackKx:redKx;
   if(Math.abs(x-enemyKx)<=1)v+=22;
   if(Math.abs(y-enemyKy)<=1)v+=18;
  }else if(type==='N'){
   v+=PST_N[pstIdx];
   const enemyKy=s==='red'?blackKy:redKy,enemyKx=s==='red'?blackKx:redKx;
   const distK=Math.abs(x-enemyKx)+Math.abs(y-enemyKy);
   if(distK<=3)v+=32;else if(distK<=4)v+=16;
  }else if(type==='C'){
   v+=PST_C[pstIdx];
   const enemyKy=s==='red'?blackKy:redKy,enemyKx=s==='red'?blackKx:redKx;
   // Pháo đầu (trục giữa chiếu thẳng mặt Tướng) hoặc Pháo giác biên
   if(x===enemyKx){
    let screens=0,step=y<enemyKy?9:-9;
    for(let sq=i+step;sq!==(s==='red'?blackKing:redKing)&&sq>=0&&sq<90;sq+=step)if(board[sq])screens++;
    if(screens===1)v+=48;else if(screens===0)v+=26;
   }
   if(y===enemyKy){
    let screens=0,step=x<enemyKx?1:-1;
    for(let sq=i+step;sq!==(s==='red'?blackKing:redKing)&&sq>=0&&sq<90;sq+=step)if(board[sq])screens++;
    if(screens===1)v+=38;
   }
  }else if(type==='P'){
   v+=PST_P[pstIdx];
  }else if(type==='A'){
   if(x===4&&(y===1||y===8))v+=24;
  }else if(type==='B'){
   if(x===4&&(y===2||y===7))v+=22;
  }
  score+=s===side?v:-v;
 }
 // Thưởng cặp Song Xe và bộ Sĩ Tượng bền vững bảo vệ cung Tướng
 const myBonus=(redR>=2?45:0)+(redA===2?30:0)+(redB===2?24:0);
 const opBonus=(blackR>=2?45:0)+(blackA===2?30:0)+(blackB===2?24:0);
 score+=side==='red'?myBonus-opBonus:opBonus-myBonus;
 return score;
}

// Khai cuộc Cờ Tướng kinh điển (Opening Book): Trung Pháo, Bình Phong Mã, Thuận Pháo, Tiên Nhân Chỉ Lộ, Quá Cung Pháo
const OPENING_BOOK=[
 // Khai cuộc Đỏ nước 1 (khi bàn cờ nguyên vẹn)
 {ply:0,side:'red',moves:[[70,67],[64,67],[82,65],[88,71],[60,51],[56,47]]},
 // Đen đáp trả Pháo đầu C2-5 (70->67) bằng Bình Phong Mã (n8-7 / n2-3) hoặc Thuận Pháo (c8-5)
 {ply:1,side:'black',lastTo:67,moves:[[7,24],[1,20],[16,13],[10,13]]},
 // Đen đáp trả Pháo đầu C8-5 (64->67)
 {ply:1,side:'black',lastTo:67,moves:[[1,20],[7,24],[10,13],[16,13]]},
 // Đen đáp trả Tiên Nhân Chỉ Lộ (P3-4 / P7-4) bằng Đối Binh Cục hoặc Pháo Đầu
 {ply:1,side:'black',lastTo:51,moves:[[33,42],[16,13],[7,24]]},
 {ply:1,side:'black',lastTo:47,moves:[[29,38],[10,13],[1,20]]},
 // Nước 2 của Đỏ phát triển Mã chính (N2-3 / N8-7) hoặc xuất Xe (R1-2 / R9-8)
 {ply:2,side:'red',moves:[[88,71],[82,65],[89,88],[81,82]]},
 // Nước 2 của Đen hoàn thiện Bình Phong Mã hoặc xuất trực Xe
 {ply:3,side:'black',moves:[[1,20],[7,24],[8,7],[0,1],[31,40]]}
];

// Đọc chuẩn biên bản Cờ Tướng truyền thống Việt Nam (Tấn / Thoái / Bình)
export function traditionalNotation(board,from,to){
 const p=board[from];if(!p)return moveLabel(board,from,to);
 const s=sideOf(p),type=p.toUpperCase(),name=PIECE_NAMES[type]||'Quân';
 const fx=from%9,fy=Math.floor(from/9),tx=to%9,ty=Math.floor(to/9);
 const colFrom=s==='red'?9-fx:fx+1,colTo=s==='red'?9-tx:tx+1;
 if(fy===ty)return `${name} ${colFrom} bình ${colTo}`;
 const forward=s==='red'?ty<fy:ty>fy;
 const action=forward?'tấn':'thoái';
 // Quân đi chéo (Mã, Tượng, Sĩ) dùng lộ đích; quân đi thẳng (Xe, Pháo, Tốt, Tướng) dùng số bước tiến/lùi
 const target=(type==='N'||type==='B'||type==='A')?colTo:Math.abs(ty-fy);
 return `${name} ${colFrom} ${action} ${target}`;
}

export function detectTacticalPattern(board,from,to){
 const next=moved(board,from,to),mover=board[from],taken=board[to];
 if(!mover)return null;
 const s=sideOf(mover),enemy=other(s),chk=inCheck(next,enemy);
 const enemyKing=next.indexOf(enemy==='red'?'K':'k');
 // Kiểm tra Lưỡng Chiếu (2 quân cùng chiếu Tướng một lúc)
 if(chk&&enemyKing>=0){
  let attackers=0;
  for(let i=0;i<90;i++)if(sideOf(next[i])===s&&pseudoMoves(next,i).includes(enemyKing))attackers++;
  if(attackers>=2)return {tag:'⚡ LƯỠNG CHIẾU TUYỆT SÁT!',color:'#ef4444'};
 }
 // Kiểm tra Mã Ngọa Tào (Mã nhảy tới hàng áp cung đối phương chiếu Tướng)
 if(chk&&mover.toUpperCase()==='N'){
  const ty=Math.floor(to/9),tx=to%9;
  if((s==='red'?ty<=2:ty>=7)&&(tx===3||tx===5))return {tag:'🐎 MÃ NGỌA TÀO CHIẾU TƯỚNG!',color:'#f59e0b'};
 }
 // Kiểm tra Pháo Đầu / Trùng Pháo
 if(mover.toUpperCase()==='C'&&to%9===4){
  let cannonsOnCenter=0;
  for(let y=0;y<10;y++)if(next[y*9+4]===(s==='red'?'C':'c'))cannonsOnCenter++;
  if(cannonsOnCenter>=2)return {tag:'🔥 TRÙNG PHÁO CÔNG CUNG!',color:'#f97316'};
  if(chk)return {tag:'💥 PHÁO ĐẦU TRẤN TRUNG LỘ!',color:'#fbbf24'};
 }
 if(chk)return {tag:'⚡ CHIẾU TƯỚNG!',color:'#fbbf24'};
 if(taken&&(VALUES[taken.toUpperCase()]||0)>=440)return {tag:`⚔️ CHÉM ${PIECE_NAMES[taken.toUpperCase()].toUpperCase()}!`,color:'#38bdf8'};
 return null;
}

export function chooseMove(board,side,{depth=2,maxNodes=8000,budgetMs=250,useBook=false}={}){
 const started=performance.now();let nodes=0,aborted=false;
 if(useBook){
  const pieceCount=board.filter(Boolean).length;
  if(pieceCount>=31){
   for(const entry of OPENING_BOOK){
    if(entry.side!==side)continue;
    const valid=entry.moves.filter(([f,t])=>sideOf(board[f])===side&&!board[t]&&legalMoves(board,side,f).some(m=>m.to===t));
    if(valid.length){
     const [from,to]=valid[Math.floor(Math.random()*valid.length)];
     return {from,to,score:evaluateBoard(moved(board,from,to),side),nodes:1,depth,pv:[{from,to}],book:true};
    }
   }
  }
 }
 const tt=new Map(),killers=Array.from({length:16},()=>[]),historyTable=new Int32Array(8100);
 const moveScore=(b,m,ply,ttMove)=>{
  if(ttMove&&m.from===ttMove.from&&m.to===ttMove.to)return 100000;
  const victim=b[m.to],attacker=b[m.from];
  if(victim)return 20000+(VALUES[victim.toUpperCase()]||100)*12-(VALUES[attacker?.toUpperCase()]||100);
  const k=killers[ply];if(k&&k.some(km=>km.from===m.from&&km.to===m.to))return 9000;
  const hist=historyTable[m.from*90+m.to]||0;
  const tx=m.to%9,ty=Math.floor(m.to/9),adv=sideOf(attacker)==='red'?9-ty:ty;
  return Math.min(8000,hist)+adv*6+(4-Math.abs(tx-4))*5;
 };
 const ordered=(b,s,ply=0,ttMove=null)=>legalMoves(b,s).sort((a,c)=>moveScore(b,c,ply,ttMove)-moveScore(b,a,ply,ttMove));

 function quiesce(b,s,alpha,beta,qDepth){
  const standPat=evaluateBoard(b,s);
  if(standPat>=beta)return beta;
  if(standPat>alpha)alpha=standPat;
  if(qDepth<=0||nodes>=maxNodes||performance.now()-started>budgetMs)return alpha;
  const captures=legalMoves(b,s).filter(m=>b[m.to]);
  captures.sort((a,c)=>(VALUES[b[c.to]?.toUpperCase()]||0)-(VALUES[b[a.to]?.toUpperCase()]||0));
  for(const m of captures){
   if(++nodes>maxNodes||performance.now()-started>budgetMs){aborted=true;return alpha;}
   const score=-quiesce(moved(b,m.from,m.to),other(s),-beta,-alpha,qDepth-1);
   if(aborted)return alpha;
   if(score>=beta)return beta;
   if(score>alpha)alpha=score;
  }
  return alpha;
 }

 function search(b,s,d,alpha,beta,ply,nullAllowed=true){
  if(++nodes>maxNodes||performance.now()-started>budgetMs){aborted=true;return evaluateBoard(b,s);}
  const key=positionKey(b,s);
  const cached=tt.get(key);
  if(cached&&cached.depth>=d){
   if(cached.flag===0)return cached.score;
   if(cached.flag===1&&cached.score>=beta)return cached.score;
   if(cached.flag===2&&cached.score<=alpha)return cached.score;
  }
  const checked=inCheck(b,s);
  // Null-Move Pruning: nếu không bị chiếu và còn độ sâu >= 3, thử nhường lượt xem thế trận vẫn vượt beta không
  if(!checked&&nullAllowed&&d>=3&&ply>0){
   const nullScore=-search(b,other(s),d-3,-beta,-beta+1,ply+1,false);
   if(aborted)return evaluateBoard(b,s);
   if(nullScore>=beta)return beta;
  }
  const ext=(checked&&ply<depth+2)?1:0;
  const effDepth=d+ext;
  const moves=ordered(b,s,ply,cached?.move);
  if(!moves.length)return -100000-effDepth*100;
  if(effDepth<=0)return quiesce(b,s,alpha,beta,3);
  let best=-Infinity,bestMove=moves[0],origAlpha=alpha;
  for(let idx=0;idx<moves.length;idx++){
   const m=moves[idx];
   let score;
   // Principal Variation Search (PVS) + Late Move Reduction (LMR)
   if(idx===0){
    score=-search(moved(b,m.from,m.to),other(s),effDepth-1,-beta,-alpha,ply+1,true);
   }else{
    const reduce=(!checked&&idx>=4&&effDepth>=3&&!b[m.to])?1:0;
    score=-search(moved(b,m.from,m.to),other(s),effDepth-1-reduce,-alpha-1,-alpha,ply+1,true);
    if(!aborted&&score>alpha&&(reduce>0||score<beta)){
     score=-search(moved(b,m.from,m.to),other(s),effDepth-1,-beta,-alpha,ply+1,true);
    }
   }
   if(aborted)break;
   if(score>best){best=score;bestMove=m;}
   if(score>alpha)alpha=score;
   if(alpha>=beta){
    if(!b[m.to]){
     if(killers[ply])killers[ply]=[m,killers[ply][0]].filter(Boolean);
     historyTable[m.from*90+m.to]+=effDepth*effDepth*10;
    }
    break;
   }
  }
  if(!aborted&&tt.size<35000){
   const flag=best<=origAlpha?2:best>=beta?1:0;
   tt.set(key,{depth:effDepth,score:best,flag,move:bestMove});
  }
  return best;
 }

 const root=ordered(board,side,0,null);if(!root.length)return null;let best=root[0],bestScore=-Infinity,reached=0;
 for(let d=1;d<=depth;d++){
  let candidate=root[0],score=-Infinity,alpha=-Infinity,beta=Infinity;
  for(const m of root){
   const value=-search(moved(board,m.from,m.to),other(side),d-1,-beta,-alpha,1,true);
   if(aborted)break;
   if(value>score){score=value;candidate=m;}
   if(value>alpha)alpha=value;
  }
  if(aborted)break;
  best=candidate;bestScore=score;reached=d;
  root.sort((a,b)=>a===best?-1:b===best?1:0);
 }
 // Trích xuất chuỗi dự đoán biến chính (Principal Variation - PV line) từ Transposition Table
 const pv=[{from:best.from,to:best.to}];
 let curB=moved(board,best.from,best.to),curS=other(side);
 for(let step=1;step<Math.max(2,reached);step++){
  const entry=tt.get(positionKey(curB,curS));
  if(!entry?.move||!legalMoves(curB,curS,entry.move.from).some(m=>m.to===entry.move.to))break;
  pv.push({from:entry.move.from,to:entry.move.to});
  curB=moved(curB,entry.move.from,entry.move.to);
  curS=other(curS);
 }
 return {...best,score:Number.isFinite(bestScore)?bestScore:0,nodes,depth:reached,pv};
}
export function moveLabel(board,from,to){return `${traditionalNotation(board,from,to)} (${from%9+1},${10-Math.floor(from/9)}→${to%9+1},${10-Math.floor(to/9)})`;}
