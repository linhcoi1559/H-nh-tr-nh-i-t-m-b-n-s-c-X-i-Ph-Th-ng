import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const metal=new THREE.MeshStandardMaterial({color:0x535c58,metalness:.45,roughness:.72});
const foliage=[0x405b38,0x567348,0x71865a].map((color,idx)=>{
 const mat=new THREE.MeshStandardMaterial({
  color,
  roughness:.76,
  metalness:.02,
  emissive:new THREE.Color(color).multiplyScalar(0.11+idx*0.02),
  emissiveIntensity:0.55,
  side:THREE.DoubleSide
 });
 mat.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vLeafWorldPos;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvec4 leafWp=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\nleafWp=instanceMatrix*leafWp;\n#endif\nvLeafWorldPos=(modelMatrix*leafWp).xyz;');
  shader.fragmentShader='varying vec3 vLeafWorldPos;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float canopyLift=smoothstep(1.8,7.2,vLeafWorldPos.y);
   float sunRim=0.5+0.5*sin(vLeafWorldPos.x*0.9+vLeafWorldPos.z*0.7);
   diffuseColor.rgb*=mix(vec3(0.84,0.89,0.80),vec3(1.14,1.16,0.96),canopyLift*0.72+sunRim*0.28);`);
 };
 mat.customProgramCacheKey=()=>`foliage-sss-v2-${idx}`;
 return mat;
});
const leaf=new THREE.BufferGeometry();
leaf.setAttribute('position',new THREE.Float32BufferAttribute([0,0,-1,-.48,0,-.35,-.4,.025,.45,0,.09,.9,.4,.025,.45,.48,0,-.35,0,.14,0],3));
leaf.setAttribute('normal',new THREE.Float32BufferAttribute([0,.95,-.31,-.28,.94,-.19,-.25,.95,.18,0,.96,.28,.25,.95,.18,.28,.94,-.19,0,1,0],3));
leaf.setIndex([6,0,1,6,1,2,6,2,3,6,3,4,6,4,5,6,5,0]);
const dummy=new THREE.Object3D();
function tube(a,b,r1,r2=r1){const axis=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const g=new THREE.CylinderGeometry(r2,r1,axis.length(),8);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),axis.clone().normalize()));g.translate((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);return g.toNonIndexed();}
function mesh(geometry,material){const m=new THREE.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=true;return m;}

export function createStreetTree(height,radius,bark){
 const root=new THREE.Group();root.name='street-tree-v2';root.userData.modelFamily='vegetation';
 const branchGeometries=[tube([0,0,0],[.16,height*.52,.05],.24,.09)];
 const clusters=[];
 for(let i=0;i<12;i++){
  const a=i*2.39996,r=radius*(.29+(i%3)*.18+Math.sin(i*1.73+height)*.12),y=height*(.58+(i%4)*.08+Math.sin(i*2.17+radius)*.045);
  const end=[Math.cos(a)*r,y,Math.sin(a)*r];
  branchGeometries.push(tube([.08,height*.35,0],end,.07,.018));clusters.push(end);
 }
 root.add(mesh(mergeGeometries(branchGeometries),bark));branchGeometries.forEach(g=>g.dispose());
 const crown=new THREE.LOD();crown.name='StreetTreeCrownLOD';
 const near=new THREE.Group(),middle=new THREE.Group(),far=new THREE.Group();
 middle.visible=far.visible=false;
 for(let tone=0;tone<3;tone++){
  const leaves=new THREE.InstancedMesh(leaf,foliage[tone],300);
  for(let i=0;i<300;i++){
   const cluster=clusters[(i+tone*4)%clusters.length],a=i*2.39996+tone,r=Math.sqrt((i%37)/37)*radius*.43;
   dummy.position.set(cluster[0]+Math.cos(a)*r,cluster[1]+Math.sin(i*1.7)*height*.08,cluster[2]+Math.sin(a)*r);
   dummy.rotation.set(.35+Math.sin(i)*.65,a,Math.cos(i*1.2)*.6);const size=.82+(i%7)*.06;dummy.scale.set(.33*size,.29,.36*size);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);
  }
  leaves.computeBoundingSphere();leaves.castShadow=true;near.add(leaves);
  // Sample the whole crown, never a contiguous slice of clusters. Larger
  // leaves retain coverage at distance; trunks and all trees stay present.
  for(const [group,stride,size]of [[middle,3,1.5],[far,8,2.15]]){
   const count=Math.ceil(300/stride),batch=new THREE.InstancedMesh(leaf,foliage[tone],count);
   const transform=new THREE.Matrix4(),enlarge=new THREE.Matrix4().makeScale(size,size,size);
   for(let i=0;i<count;i++){leaves.getMatrixAt(i*stride,transform);transform.multiply(enlarge);batch.setMatrixAt(i,transform);}
   batch.computeBoundingSphere();batch.castShadow=true;group.add(batch);
  }
 }
 crown.addLevel(near,0);crown.addLevel(middle,38,.16);crown.addLevel(far,90,.16);root.add(crown);
 const pit=new THREE.Mesh(new THREE.LatheGeometry([[.60,0],[.76,0],[.76,.10],[.70,.14],[.60,.14]].map(([r,y])=>new THREE.Vector2(r,y)),20),metal);root.add(pit);
 root.userData.modelFamily='vegetation';return root;
}

export function createStool(w,h,d,material){
 const pieces=[];
 // Seat has a curved lip; four splayed legs leave the space underneath open.
 const seat=new THREE.CylinderGeometry(1,1,.06,16);seat.scale(w/2,1,d/2);seat.translate(0,h-.03,0);pieces.push(seat.toNonIndexed());
 for(const x of [-1,1])for(const z of [-1,1])pieces.push(tube([x*w*.42,0,z*d*.42],[x*w*.32,h-.06,z*d*.32],.018,.023));
 const geometry=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());geometry.translate(0,-h/2,0);
 const m=mesh(geometry,material);m.userData.modelFamily='furniture';return m;
}
export function createTeaTable(w,h,d,material){
 const root=new THREE.Group();root.userData.modelFamily='furniture';
 const top=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.055,24),material);top.scale.set(w/2,1,d/2);top.position.y=h/2-.0275;root.add(top);
 const legs=[];for(const x of [-1,1])for(const z of [-1,1])legs.push(tube([x*w*.42,-h/2,z*d*.40],[x*w*.32,h/2-.04,z*d*.32],.025));
 root.add(mesh(mergeGeometries(legs),metal));legs.forEach(g=>g.dispose());return root;
}
export function createParkBench(w,wood){
 const root=new THREE.Group();root.userData.modelFamily='furniture';root.userData.staticBatch=true;
 for(let i=0;i<5;i++){
  const plank=mesh(new THREE.CapsuleGeometry(.045,w-.1,2,8).rotateZ(Math.PI/2),wood);plank.position.set(0,.55,-.25+i*.12);root.add(plank);
 }
 for(let i=0;i<4;i++){
  const slat=mesh(new THREE.CapsuleGeometry(.045,w-.1,2,8).rotateZ(Math.PI/2),wood);slat.position.set(0,.77+i*.12,-.32-i*.025);root.add(slat);
 }
 const legs=[];for(const x of [-w*.37,w*.37]){legs.push(tube([x,0,-.26],[x,.58,.22],.035),tube([x,0,.26],[x,1.17,-.43],.035));}
 root.add(mesh(mergeGeometries(legs),metal));legs.forEach(g=>g.dispose());return root;
}

// Profile lofts retain wheel, steering and interaction pivots in their old positions.
export function profileGeometry(points,depth,bevel=.025){
 const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
 const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:4,steps:2,curveSegments:14});g.translate(0,0,-depth/2);g.computeVertexNormals();return g;
}
export function carCoachwork(length,height,width,cabin=false){
 const sections=cabin
  ?[[-.5,.01,.84],[-.46,.18,.91],[-.40,.35,.96],[-.28,.48,1],[-.08,.515,1],[.12,.5,1],[.24,.38,.97],[.36,.20,.93],[.45,-.08,.88],[.5,-.38,.82]]
  :[[-.5,.04,.7],[-.48,.14,.86],[-.44,.24,.95],[-.33,.38,1],[-.12,.425,1],[.08,.42,1],[.24,.40,1],[.39,.31,.98],[.46,.20,.92],[.49,.11,.84],[.5,.02,.68]];
 const positions=[],indices=[];
 for(const [x,top,w]of sections){
  const ring=[
   [-.5,-.34],[-.505,-.12],[-.495,top-.11],[-.445,top-.035],[-.38,top],[-.22,top+.036],
   [.22,top+.036],[.38,top],[.445,top-.035],[.495,top-.11],[.505,-.12],[.5,-.34],[.35,-.46],[-.35,-.46]
  ];
  for(const [z,y]of ring)positions.push(x*length,y*height,z*width*w*(cabin&&y>0?.87:1));
 }
 const ring=14;for(let i=1;i<sections.length;i++)for(let j=0;j<ring;j++){const a=(i-1)*ring+j,b=(i-1)*ring+(j+1)%ring,c=i*ring+(j+1)%ring,d=i*ring+j;indices.push(a,b,d,b,c,d);}
 for(let j=1;j<ring-1;j++){indices.push(0,j+1,j);const end=(sections.length-1)*ring;indices.push(end,end+j,end+j+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function scooterPanel(kind){
 if(kind==='rear')return profileGeometry([[-.37,-.10],[-.32,.03],[-.26,.13],[-.08,.165],[.09,.17],[.24,.09],[.33,.02],[.28,-.09],[.22,-.15],[-.25,-.17]],.35,.042);
 if(kind==='shield')return profileGeometry([[-.11,-.33],[-.11,-.05],[-.09,.19],[-.03,.30],[.03,.35],[.09,.32],[.13,.24],[.14,-.17],[.08,-.28],[.03,-.34]],.32,.042);
 return profileGeometry([[-.34,-.04],[-.32,.02],[-.26,.052],[.02,.068],[.19,.07],[.30,.045],[.34,.022],[.33,-.035]],.30,.032);
}

// Hàn mượt các pháp tuyến có góc vát < 58 độ trên công trình kiến trúc để cột vát, gờ chỉ, vòm cửa có độ cong mềm chuẩn AAA
function weldSmoothArchitecturalNormals(geometry,cosThreshold=0.52){
 geometry.computeVertexNormals();
 const pos=geometry.attributes.position,norm=geometry.attributes.normal;
 if(!pos||!norm)return geometry;
 const count=pos.count,buckets=new Map();
 for(let i=0;i<count;i++){
  const key=`${Math.round(pos.getX(i)*400)},${Math.round(pos.getY(i)*400)},${Math.round(pos.getZ(i)*400)}`;
  let list=buckets.get(key);if(!list){list=[];buckets.set(key,list);}
  list.push(i);
 }
 const sx=new Float32Array(count),sy=new Float32Array(count),sz=new Float32Array(count);
 for(const list of buckets.values()){
  if(list.length<2){
   const idx=list[0];sx[idx]=norm.getX(idx);sy[idx]=norm.getY(idx);sz[idx]=norm.getZ(idx);continue;
  }
  for(const i of list){
   const nx0=norm.getX(i),ny0=norm.getY(i),nz0=norm.getZ(i);
   let ax=0,ay=0,az=0;
   for(const j of list){
    const nx=norm.getX(j),ny=norm.getY(j),nz=norm.getZ(j);
    if(nx0*nx+ny0*ny+nz0*nz>=cosThreshold){ax+=nx;ay+=ny;az+=nz;}
   }
   const len=Math.hypot(ax,ay,az)||1;
   sx[i]=ax/len;sy[i]=ay/len;sz[i]=az/len;
  }
 }
 for(let i=0;i<count;i++)norm.setXYZ(i,sx[i],sy[i],sz[i]);
 norm.needsUpdate=true;
 return geometry;
}

// Wall planes with multi-step beveled window bays, chamfered pilasters, molded cornices & sills.
// Material slots match BoxGeometry so existing photo/sign facades stay on the correct side.
export function buildingEnvelope(width,height,depth,photoFacade=true,grid={}){
 const vertices=[],uvs=[],groups=[];
 function quad(a,b,c,d,slot,u=1,v=1){const first=vertices.length/3;vertices.push(...a,...b,...d,...b,...c,...d);if(slot===4||slot===5){for(const point of [a,b,d,b,c,d])uvs.push(((slot===4?point[0]:-point[0])/width+.5)*(photoFacade?1:width/2.4),(point[1]/height+.5)*(photoFacade?1:height/2.4));}else uvs.push(0,0,u,0,0,v,u,0,u,v,0,v);groups.push([first,6,slot]);}
 const x=width/2,y=height/2,z=depth/2,corner=Math.min(width,depth)*.052,cMid=corner*.52,cDiag=corner*.34;
 // Model side-wall multi-tiered beveled recesses & horizontal cornice bands
 for(const side of [-1,1]){
  const columns=grid.columns||Math.max(1,Math.round(depth/3)),rows=grid.rows||Math.max(1,Math.round(height/3.2));
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
   const l=-z+corner+col*(depth-2*corner)/columns,r=-z+corner+(col+1)*(depth-2*corner)/columns;
   const b=-y+row*height/rows,t=-y+(row+1)*height/rows;
   const e1=Math.min(.09,depth/columns*.065,height/rows*.065),e2=Math.min(.19,depth/columns*.15,height/rows*.15);
   const ins1=Math.min(.065,width*.018),ins2=Math.min(.16,width*.042);
   const p=(u,v,recess=0)=>[side*(x-recess),v,u];
   const add=(a,b,c,d)=>side<0?quad(a,b,c,d,1,depth/columns/3,height/rows/3):quad(d,c,b,a,0,depth/columns/3,height/rows/3);
   // Outer pilaster & cornice frame
   add(p(l,b),p(r,b),p(r,b+e1),p(l,b+e1));add(p(l,t-e1),p(r,t-e1),p(r,t),p(l,t));
   add(p(l,b+e1),p(l+e1,b+e1,ins1),p(l+e1,t-e1,ins1),p(l,t-e1));
   add(p(r-e1,b+e1,ins1),p(r,b+e1),p(r,t-e1),p(r-e1,t-e1,ins1));
   add(p(l,b+e1),p(r,b+e1),p(r-e1,b+e1,ins1),p(l+e1,b+e1,ins1));
   add(p(l+e1,t-e1,ins1),p(r-e1,t-e1,ins1),p(r,t-e1),p(l,t-e1));
   // Second inner chamfered molding step + deep window bay
   add(p(l+e1,b+e1,ins1),p(l+e2,b+e2,ins2),p(l+e2,t-e2,ins2),p(l+e1,t-e1,ins1));
   add(p(r-e2,b+e2,ins2),p(r-e1,b+e1,ins1),p(r-e1,t-e1,ins1),p(r-e2,t-e2,ins2));
   add(p(l+e1,b+e1,ins1),p(r-e1,b+e1,ins1),p(r-e2,b+e2,ins2),p(l+e2,b+e2,ins2));
   add(p(l+e2,t-e2,ins2),p(r-e2,t-e2,ins2),p(r-e1,t-e1,ins1),p(l+e1,t-e1,ins1));
   add(p(l+e2,b+e2,ins2),p(r-e2,b+e2,ins2),p(r-e2,t-e2,ins2),p(l+e2,t-e2,ins2));
  }
 }
 // 2-segment rounded/chamfered corner pilasters instead of single sharp flat cut
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const p0b=[sx*x,-y,sz*(z-corner)],p0t=[sx*x,y,sz*(z-corner)];
  const p1b=[sx*(x-cDiag),-y,sz*(z-cDiag)],p1t=[sx*(x-cDiag),y,sz*(z-cDiag)];
  const p2b=[sx*(x-corner),-y,sz*z],p2t=[sx*(x-corner),y,sz*z];
  const slot=sx>0?0:1;
  if(sx*sz>0){quad(p0t,p1t,p1b,p0b,slot);quad(p1t,p2t,p2b,p1b,slot);}
  else{quad(p0b,p1b,p1t,p0t,slot);quad(p1b,p2b,p2t,p1t,slot);}
 }
 quad([-x,y,z],[x,y,z],[x,y,-z],[-x,y,-z],2,width/3,depth/3);
 quad([-x,-y,-z],[x,-y,-z],[x,-y,z],[-x,-y,z],3);
 // Recess alternate front/back facade bays with double-beveled colonial molding & arched top relief.
 for(const side of [-1,1]){
  const columns=grid.columns||Math.max(1,Math.round(width/2.8)),rows=grid.rows||Math.max(1,Math.round(height/3.2)),slot=side>0?4:5;
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
   const facadeWidth=width-2*corner;
   const l=-x+corner+col*facadeWidth/columns,r=l+facadeWidth/columns,b=-y+row*height/rows,t=b+height/rows;
   const ins1=Math.min(.085,depth*.022),ins2=Math.min(.21,depth*.052);
   const e1=Math.min(.095,width/columns*.062,height/rows*.062),e2=Math.min(.21,width/columns*.145,height/rows*.145);
   const face=z*side,midZ=(z-ins1)*side,inner=(z-ins2)*side;
   const add=(a,b,c,d)=>side>0?quad(a,b,c,d,slot):quad(d,c,b,a,slot);
   // Outer pilaster & cornice band
   add([l,b,face],[r,b,face],[r,b+e1,face],[l,b+e1,face]);
   add([l,t-e1,face],[r,t-e1,face],[r,t,face],[l,t,face]);
   add([l,b+e1,face],[l+e1,b+e1,midZ],[l+e1,t-e1,midZ],[l,t-e1,face]);
   add([r-e1,b+e1,midZ],[r,b+e1,face],[r,t-e1,face],[r-e1,t-e1,midZ]);
   add([l,b+e1,face],[r,b+e1,face],[r-e1,b+e1,midZ],[l+e1,b+e1,midZ]);
   add([l+e1,t-e1,midZ],[r-e1,t-e1,midZ],[r,t-e1,face],[l,t-e1,face]);
   // Inner beveled window frame & deep glass/shutter plane
   add([l+e1,b+e1,midZ],[l+e2,b+e2,inner],[l+e2,t-e2,inner],[l+e1,t-e1,midZ]);
   add([r-e2,b+e2,inner],[r-e1,b+e1,midZ],[r-e1,t-e1,midZ],[r-e2,t-e2,inner]);
   add([l+e1,b+e1,midZ],[r-e1,b+e1,midZ],[r-e2,b+e2,inner],[l+e2,b+e2,inner]);
   add([l+e2,t-e2,inner],[r-e2,t-e2,inner],[r-e1,t-e1,midZ],[l+e1,t-e1,midZ]);
   add([l+e2,b+e2,inner],[r-e2,b+e2,inner],[r-e2,t-e2,inner],[l+e2,t-e2,inner]);
  }
 }
 const positions=[],coordinates=[],materialGroups=[];
 // A facade may contain hundreds of quads, but only six material slots. Keep
 // each slot contiguous so both color and shadow passes issue six draws at most.
 for(let slot=0;slot<6;slot++){
  const start=positions.length/3;
  for(const [first,count,material]of groups)if(material===slot){positions.push(...vertices.slice(first*3,(first+count)*3));coordinates.push(...uvs.slice(first*2,(first+count)*2));}
  materialGroups.push([start,positions.length/3-start,slot]);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(coordinates,2));materialGroups.forEach(args=>g.addGroup(...args));weldSmoothArchitecturalNormals(g,0.52);g.computeBoundingBox();g.userData.modelFamily='architecture';return g;
}

export function replaceBuildingEnvelopes(root){
 let count=0,instances=0,roofs=0;
 root.traverse(node=>{
  if(!node.isMesh||node.isSkinnedMesh||node.userData.envelopeReplaced)return;
  if(node.geometry.type!=='BoxGeometry')return;
  node.geometry.computeBoundingBox();const size=node.geometry.boundingBox.getSize(new THREE.Vector3());
  const p={width:size.x,height:size.y,depth:size.z};
  if(node.isInstancedMesh){
   // Only homogeneous building batches qualify; windows/roads/rails remain intact.
   let eligible=true,roofEligible=true;const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();
   for(let i=0;i<node.count;i++){node.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);if(p.width*scale.x<3||p.height*scale.y<4||p.depth*scale.z<3)eligible=false;if(p.width*scale.x<3||p.height*scale.y>.6||p.depth*scale.z<3||position.y<3)roofEligible=false;}
   if(eligible&&node.count){node.geometry=buildingEnvelope(p.width,p.height,p.depth,Array.isArray(node.material));node.userData.envelopeReplaced=true;count++;instances+=node.count;}
   else if(roofEligible&&node.count){node.geometry=roofGeometry(p.width,p.depth,p.height);node.userData.envelopeReplaced=true;roofs+=node.count;}
  }else if(p.width>=3&&p.height>=3&&p.depth>=3){node.geometry=buildingEnvelope(p.width,p.height,p.depth,Array.isArray(node.material));node.userData.envelopeReplaced=true;count++;instances++;}
  else if(p.width>=3&&p.depth>=3&&p.height<.6&&node.position.y>3){node.geometry=roofGeometry(p.width,p.depth,Math.max(.6,p.height));node.userData.envelopeReplaced=true;roofs++;}
 });
 return {meshes:count,buildings:instances,roofs};
}

export function refitHumanProportions(model,targetHeight=1.68){
 model.updateMatrixWorld(true);
 model.updateMatrixWorld(true);model.traverse(node=>{if(node.isSkinnedMesh){node.skeleton.update();node.computeBoundingBox();}});
 const bounds=new THREE.Box3().setFromObject(model),height=bounds.max.y-bounds.min.y;
 if(!Number.isFinite(height)||height<=0)return;
 model.scale.multiplyScalar(targetHeight/height);model.position.y-=bounds.min.y*targetHeight/height;
 model.userData.modelFamily='human';model.userData.targetHeight=targetHeight;
}
export function ellipsoidGeometry(w,h,d){return new THREE.SphereGeometry(.5,14,10).scale(w,h,d);}
export function canonicalBoneName(name){return name.replace(/^mixamorig:?/i,'').replace(/(upperArm|lowerArm|upperLeg|lowerLeg|hand|foot|shoulder)([LR])$/,'$1.$2');}
export function foliageGeometry(radius=.38){
 const parts=[];
 for(let i=0;i<24;i++){
  const a=i*2.39996,y=(i%6)/6,r=radius*Math.sqrt(1-y*y),g=leaf.clone().toNonIndexed();
  dummy.position.set(Math.cos(a)*r*.55,y*radius,Math.sin(a)*r*.55);dummy.rotation.set(.2,a,.4);dummy.scale.set(radius*.3,radius*.4,radius*.55);dummy.updateMatrix();g.applyMatrix4(dummy.matrix);parts.push(g);
 }
 const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());return g;
}
export function flowerGeometry(radius=.18){
 const parts=[];
 for(let i=0;i<8;i++){const a=i*Math.PI/4,g=leaf.clone().toNonIndexed();dummy.position.set(Math.sin(a)*radius*.38,0,Math.cos(a)*radius*.38);dummy.rotation.set(.3,a,0);dummy.scale.set(radius*.32,radius*.7,radius*.62);dummy.updateMatrix();g.applyMatrix4(dummy.matrix);parts.push(g);}
 const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());return g;
}
export function windowFrameGeometry(){
 const parts=[];
 for(const x of [-.47,0,.47]){const g=new THREE.BoxGeometry(.055,1,.65).toNonIndexed();g.translate(x,0,0);parts.push(g);}
 for(const y of [-.47,.47]){const g=new THREE.BoxGeometry(1,.055,1).toNonIndexed();g.translate(0,y,0);parts.push(g);}
 const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());return geometry;
}

export function roofGeometry(width,depth,height,profile='hip'){
 const x=width/2,z=depth/2,y=-height/2,ridge=width*.24;
 const xm=x*.62,zm=z*.62,ym=y+height*.42,rm=profile==='gable'?xm:(x*.62+ridge*.38);
 const vertices=[
  -x,y,-z, x,y,-z, x,y,z, -x,y,z,
  -xm,ym,-zm, xm,ym,-zm, xm,ym,zm, -xm,ym,zm,
  -(profile==='gable'?x:ridge),height/2,0, (profile==='gable'?x:ridge),height/2,0
 ];
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 g.setIndex([
  // Lower curved skirt slopes
  0,4,5, 0,5,1, 1,5,6, 1,6,2, 2,6,7, 2,7,3, 3,7,4, 3,4,0,
  // Upper steeper ridge slopes
  4,8,9, 4,9,5, 5,9,6, 6,9,8, 6,8,7, 7,8,4,
  // Bottom cap
  3,0,1, 3,1,2
 ]);
 const uv=[];for(let i=0;i<vertices.length;i+=3)uv.push(vertices[i]/2,vertices[i+2]/2);g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 const flat=g.toNonIndexed();g.dispose();weldSmoothArchitecturalNormals(flat,0.45);flat.userData.modelFamily='roof';return flat;
}

// Unit-sized arch; the opening is real geometry, not an opaque rectangle.
export function archedWindowGeometry(frame=false){
 const shape=new THREE.Shape();
 const outline=(path,w,h,bottom=-.5)=>{path.moveTo(-w/2,bottom);path.lineTo(w/2,bottom);path.lineTo(w/2,h-w/2);path.absarc(0,h-w/2,w/2,0,Math.PI,false);path.lineTo(-w/2,bottom);};
 outline(shape,1,.5);
 if(frame){const hole=new THREE.Path();outline(hole,.84,.42,-.42);shape.holes.push(hole);return new THREE.ExtrudeGeometry(shape,{depth:.11,bevelEnabled:true,bevelSize:.014,bevelThickness:.014,bevelSegments:3,curveSegments:18});}
 return new THREE.ShapeGeometry(shape,18);
}
export function shopCanopyGeometry(){
 const vertices=[],uv=[],indices=[];
 for(let i=0;i<=12;i++){
  const t=i/12,z=t-.5,y=.16*Math.cos(t*Math.PI/2)-.18*t+Math.sin(t*Math.PI)*.018;
  vertices.push(-.5,y,z,.5,y,z);uv.push(0,t,1,t);
  if(i){const a=(i-1)*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
