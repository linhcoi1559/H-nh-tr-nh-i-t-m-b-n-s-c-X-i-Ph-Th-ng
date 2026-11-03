import {DISTRICT_ROADS,nearestRoad} from './district-routes.mjs';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function projection(point,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.z-a.z)*dz)/(dx*dx+dz*dz)));return {x:a.x+dx*t,z:a.z+dz*t,t};}
export function districtPath(start,target){
  const inside=p=>p.z<-55||p.z>55||p.x>162||p.x<-182;
  if(!inside(start)&&!inside(target))return [target];
  const other=inside(start)?start:target,roadId=nearestRoad(other.x,other.z).id,eastEntry=roadId==='market-link'||other.x>240;
  const westEntry=roadId==='peach-west',southEntry=roadId==='south-neighborhood';
  const entry=westEntry?{x:-182,z:0}:southEntry?{x:42,z:55}:eastEntry?{x:162,z:0}:{x:42,z:-55};
  const a=inside(start)?start:entry,b=inside(target)?target:entry;
  const roads=[...DISTRICT_ROADS,{points:[[42,-55],[42,0],[42,55]]},{points:[[-182,0],[-15,0],[42,0],[162,0]]},{points:[[-15,0],[-15,55]]}];
  const segments=roads.flatMap(road=>road.points.slice(1).map((p,i)=>({a:{x:road.points[i][0],z:road.points[i][1]},b:{x:p[0],z:p[1]}})));
  const nearest=point=>segments.map((s,i)=>({point:projection(point,s.a,s.b),i})).sort((a,b)=>distance(point,a.point)-distance(point,b.point))[0];
  const sa=nearest(a),sb=nearest(b),nodes=[],links=[],keys=new Map();
  const node=p=>{const key=`${p.x.toFixed(4)},${p.z.toFixed(4)}`;if(!keys.has(key)){keys.set(key,nodes.length);nodes.push({x:p.x,z:p.z});links.push([]);}return keys.get(key);};
  segments.forEach((s,i)=>{
    const points=[{...s.a,t:0},{...s.b,t:1}];if(sa.i===i)points.push(sa.point);if(sb.i===i)points.push(sb.point);points.sort((a,b)=>a.t-b.t);
    for(let j=1;j<points.length;j++){const x=node(points[j-1]),y=node(points[j]);if(x!==y){const cost=distance(nodes[x],nodes[y]);links[x].push({id:y,cost});links[y].push({id:x,cost});}}
  });
  const source=node(sa.point),goal=node(sb.point),cost=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),seen=new Set();cost[source]=0;
  while(seen.size<nodes.length){let current=-1;for(let i=0;i<nodes.length;i++)if(!seen.has(i)&&(current<0||cost[i]<cost[current]))current=i;if(current<0||!Number.isFinite(cost[current]))break;if(current===goal)break;seen.add(current);for(const edge of links[current])if(cost[current]+edge.cost<cost[edge.id]){cost[edge.id]=cost[current]+edge.cost;previous[edge.id]=current;}}
  if(!Number.isFinite(cost[goal]))return [];
  const path=[];for(let n=goal;n>=0;n=previous[n]){path.unshift(nodes[n]);if(n===source)break;}
  const onApproach=p=>p.z<0&&Math.abs(p.x-42)<=6;
  const prefix=inside(start)?[]:westEntry||eastEntry?[{x:start.x,z:0},entry]:onApproach(start)&&!southEntry?[entry]:[{x:start.x,z:0},{x:42,z:0},entry];
  const suffix=inside(target)?[target]:westEntry||eastEntry?[entry,{x:target.x,z:0},target]:onApproach(target)&&!southEntry?[target]:[{x:42,z:0},{x:target.x,z:0},target];
  const result=[...prefix,...path,...suffix];return result.filter((p,i)=>!i||distance(p,result[i-1])>.05);
}
export function nextDistrictWaypoint(start,path){return path.find(p=>distance(start,p)>3)||path.at(-1)||null;}
export function streetSidePath(start,target){
  if(!start||!target)return [target];
  const inside=p=>p.z<-55||p.z>55||p.x>162||p.x<-182;
  if(inside(start)||inside(target))return districtPath(start,target);
  const pts=[];
  const push=p=>{if(!pts.length||distance(pts.at(-1),p)>.25)pts.push({x:p.x,z:p.z});};
  push(start);
  const inAlley41=p=>Math.abs(p.x+67)<10&&p.z<-8.5;
  const inXoiLane=p=>p.x<-62&&p.z<-26;
  const inMemorial=p=>Math.abs(p.x+22)<10&&p.z<-8.5;
  const inPark=p=>p.x>112&&p.z>8.5;
  const inSchoolLane=p=>Math.abs(p.x+15)<8.5&&p.z>8.5;
  const inPhuGia=p=>Math.abs(p.x-42)<9&&Math.abs(p.z)>8.5;
  if(inXoiLane(start)){push({x:-67,z:-37.5});push({x:-67,z:-6.5});}
  else if(inAlley41(start)){push({x:-67,z:-6.5});}
  else if(inMemorial(start)){push({x:-20,z:-24});push({x:-20,z:-6.5});}
  else if(inPark(start)){push({x:126,z:6.8});}
  else if(inSchoolLane(start)){push({x:-15,z:6.8});}
  else if(inPhuGia(start)){push({x:42,z:start.z<0?-6.5:6.8});}
  const cur=pts.at(-1);
  let targetEntry={x:target.x,z:target.z<0?-6.5:6.8};
  const tail=[];
  if(inXoiLane(target)){targetEntry={x:-67,z:-6.5};tail.push({x:-67,z:-37.5},target);}
  else if(inAlley41(target)){targetEntry={x:-67,z:-6.5};tail.push(target);}
  else if(inMemorial(target)){targetEntry={x:-20,z:-6.5};tail.push({x:-20,z:-24},target);}
  else if(inPark(target)){targetEntry={x:126,z:6.8};tail.push(target);}
  else if(inSchoolLane(target)){targetEntry={x:-15,z:6.8};tail.push(target);}
  else if(inPhuGia(target)){targetEntry={x:42,z:target.z<0?-6.5:6.8};tail.push(target);}
  else{tail.push(target);}
  if(Math.abs(cur.x-targetEntry.x)>4.5||Math.abs(cur.z-targetEntry.z)>4.5){
    const roadZ=targetEntry.z<0?-2.2:2.2;
    push({x:cur.x,z:roadZ});
    push({x:targetEntry.x,z:roadZ});
  }
  push(targetEntry);
  for(const t of tail)push(t);
  return pts.slice(1);
}
