// One entry per scene group: quest actors also appear in the walker list.
export function separatePedestrians(actors,clear,spacing=.92){
 const unique=[...new Map(actors.filter(a=>a.group?.visible!==false).map(a=>[a.group,a])).values()];
 for(let pass=0;pass<3;pass++)for(let i=0;i<unique.length;i++)for(let j=i+1;j<unique.length;j++){
  const a=unique[i],b=unique[j],p=a.group.position,q=b.group.position;
  const dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,dz);if(d>=spacing||Math.abs((p.y||0)-(q.y||0))>1)continue;
  const nx=d>.001?dx/d:1,nz=d>.001?dz/d:0,push=spacing-d+.015;
  const movers=a.fixed?[b]:b.fixed?[a]:[a,b];
  for(const actor of movers){const origin=actor.group.position,sign=actor===a?-1:1;
   for(const [vx,vz]of [[nx*sign,nz*sign],[-nz*sign,nx*sign],[nz*sign,-nx*sign]]){
    const candidate={x:origin.x+vx*push/movers.length,y:origin.y,z:origin.z+vz*push/movers.length};
    if(clear(candidate)){origin.x=candidate.x;origin.z=candidate.z;break;}
   }
  }
 }
}
