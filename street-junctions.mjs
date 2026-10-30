export const sidewalkGaps=side=>[
 {minX:36.4,maxX:47.6},
 ...(side<0?[{minX:-69.4,maxX:-64.6}]:[{minX:-19.5,maxX:-10.5}])
];
export function sidewalkSpans(side,min=-200,max=180){
 const spans=[];let start=min;
 for(const gap of sidewalkGaps(side).sort((a,b)=>a.minX-b.minX)){
  if(gap.minX>start)spans.push({minX:start,maxX:Math.min(gap.minX,max)});
  start=Math.max(start,gap.maxX);
 }if(start<max)spans.push({minX:start,maxX:max});return spans;
}
export const inStreetMouth=(x,z)=>sidewalkGaps(Math.sign(z)).some(g=>x>g.minX&&x<g.maxX);
