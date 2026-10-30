import {TRAFFIC_STREETS} from './traffic-routes.mjs';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const project=(p,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));return {x:a.x+dx*t,z:a.z+dz*t,t};};
export function policeRoadPath(from,to){
 const segments=TRAFFIC_STREETS.flatMap(r=>r.points.slice(1).map((p,i)=>({a:{x:r.points[i][0],z:r.points[i][1]},b:{x:p[0],z:p[1]}}))),vertices=segments.flatMap(s=>[s.a,s.b]);
 const nearest=p=>segments.map((s,i)=>({i,p:project(p,s.a,s.b)})).sort((a,b)=>dist(a.p,p)-dist(b.p,p))[0],start=nearest(from),end=nearest(to),nodes=[],links=[],keys=new Map();
 const node=p=>{const key=p.x.toFixed(2)+':'+p.z.toFixed(2);if(!keys.has(key)){keys.set(key,nodes.length);nodes.push({x:p.x,z:p.z});links.push([]);}return keys.get(key);};
 segments.forEach((s,i)=>{const points=[{...s.a,t:0},{...s.b,t:1}];for(const v of vertices){const p=project(v,s.a,s.b);if(dist(v,p)<2.1)points.push(p);}if(i===start.i)points.push(start.p);if(i===end.i)points.push(end.p);points.sort((a,b)=>a.t-b.t);for(let j=1;j<points.length;j++){const a=node(points[j-1]),b=node(points[j]);if(a!==b){links[a].push(b);links[b].push(a);}}});
 const source=node(start.p),goal=node(end.p),cost=nodes.map(()=>Infinity),prev=nodes.map(()=>-1),visited=new Set();cost[source]=0;
 while(visited.size<nodes.length){let a=-1;for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&(a<0||cost[i]<cost[a]))a=i;if(a<0||!Number.isFinite(cost[a])||a===goal)break;visited.add(a);for(const b of links[a]){const next=cost[a]+dist(nodes[a],nodes[b]);if(next<cost[b]){cost[b]=next;prev[b]=a;}}}
 if(!Number.isFinite(cost[goal]))return [];
 const path=[];for(let a=goal;a>=0;a=prev[a]){path.unshift(nodes[a]);if(a===source)break;}return path;
}
export function pursuitCaught(distance,speed,seconds){return distance<8&&(Math.abs(speed)<2||seconds>12);}
