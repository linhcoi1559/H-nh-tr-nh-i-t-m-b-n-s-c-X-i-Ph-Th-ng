import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const metal=new THREE.MeshStandardMaterial({color:0x535c58,metalness:.45,roughness:.72});
const foliage=[0x405b38,0x567348,0x71865a].map(color=>new THREE.MeshStandardMaterial({color,roughness:.96,side:THREE.DoubleSide}));
const leaf=new THREE.BufferGeometry();
leaf.setAttribute('position',new THREE.Float32BufferAttribute([0,0,-1,-.45,0,-.18,0,.12,0,.45,0,-.18,0,0,1],3));
leaf.setIndex([0,1,2,0,2,3,1,4,2,2,4,3]);leaf.computeVertexNormals();
const dummy=new THREE.Object3D();
function tube(a,b,r1,r2=r1){const axis=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const g=new THREE.CylinderGeometry(r2,r1,axis.length(),8);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),axis.clone().normalize()));g.translate((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);return g.toNonIndexed();}
function mesh(geometry,material){const m=new THREE.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=true;return m;}

export function createStreetTree(height,radius,bark){
 const root=new THREE.Group();root.name='street-tree-v2';root.userData.modelFamily='vegetation';
 const branchGeometries=[tube([0,0,0],[.16,height*.52,.05],.24,.09)];
 const clusters=[];
 for(let i=0;i<12;i++){
  const a=i*2.39996,r=radius*(.35+(i%3)*.18),y=height*(.59+(i%4)*.075);
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
   dummy.rotation.set(.35+Math.sin(i)*.5,a,Math.cos(i*1.2)*.45);dummy.scale.set(.29,.29,.43);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);
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
 const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,steps:1});g.translate(0,0,-depth/2);g.computeVertexNormals();return g;
}
export function carCoachwork(length,height,width,cabin=false){
 const sections=cabin?[[-.5,.01,.85],[-.43,.32,.94],[-.28,.48,1],[.12,.5,1],[.32,.23,.94],[.5,-.38,.82]]:[[-.5,.04,.7],[-.47,.20,.92],[-.33,.38,1],[-.12,.42,1],[.22,.4,1],[.39,.31,.98],[.48,.14,.88],[.5,.02,.68]];
 const positions=[],indices=[];
 for(const [x,top,w]of sections){
  const ring=[[-.5,-.34],[-.5,top-.1],[-.41,top],[-.23,top+.035],[.23,top+.035],[.41,top],[.5,top-.1],[.5,-.34],[.35,-.46],[-.35,-.46]];
  for(const [z,y]of ring)positions.push(x*length,y*height,z*width*w*(cabin&&y>0?.87:1));
 }
 const ring=10;for(let i=1;i<sections.length;i++)for(let j=0;j<ring;j++){const a=(i-1)*ring+j,b=(i-1)*ring+(j+1)%ring,c=i*ring+(j+1)%ring,d=i*ring+j;indices.push(a,b,d,b,c,d);}
 for(let j=1;j<ring-1;j++){indices.push(0,j+1,j);const end=(sections.length-1)*ring;indices.push(end,end+j,end+j+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function scooterPanel(kind){
 if(kind==='rear')return profileGeometry([[-.37,-.10],[-.28,.12],[.08,.17],[.33,.02],[.24,-.15],[-.25,-.17]],.35,.035);
 if(kind==='shield')return profileGeometry([[-.11,-.33],[-.10,.19],[.02,.35],[.12,.28],[.14,-.17],[.03,-.34]],.32,.035);
 return profileGeometry([[-.34,-.04],[-.31,.045],[.18,.07],[.34,.025],[.33,-.035]],.30,.025);
}

// Wall planes with inset window bays, not one rectangular cuboid. Material slots
// match BoxGeometry so existing photo/sign facades stay on the correct side.
export function buildingEnvelope(width,height,depth,photoFacade=true,grid={}){
 const vertices=[],uvs=[],groups=[];
 function quad(a,b,c,d,slot,u=1,v=1){const first=vertices.length/3;vertices.push(...a,...b,...d,...b,...c,...d);if(slot===4||slot===5){for(const point of [a,b,d,b,c,d])uvs.push(((slot===4?point[0]:-point[0])/width+.5)*(photoFacade?1:width/2.4),(point[1]/height+.5)*(photoFacade?1:height/2.4));}else uvs.push(0,0,u,0,0,v,u,0,u,v,0,v);groups.push([first,6,slot]);}
 const x=width/2,y=height/2,z=depth/2,corner=Math.min(width,depth)*.045;
 quad([-x,-y,-z+corner],[-x,-y,z-corner],[-x,y,z-corner],[-x,y,-z+corner],1,depth/3,height/3);
 quad([x,-y,z-corner],[x,-y,-z+corner],[x,y,-z+corner],[x,y,z-corner],0,depth/3,height/3);
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const a=[sx*x,-y,sz*(z-corner)],b=[sx*(x-corner),-y,sz*z],c=[sx*(x-corner),y,sz*z],d=[sx*x,y,sz*(z-corner)];
  if(sx*sz>0)quad(d,c,b,a,sx>0?0:1);else quad(a,b,c,d,sx>0?0:1);
 }
 quad([-x,y,z],[x,y,z],[x,y,-z],[-x,y,-z],2,width/3,depth/3);
 quad([-x,-y,-z],[x,-y,-z],[x,-y,z],[-x,-y,z],3);
 // Recess alternate facade bays. All detail stays inside the former footprint.
 for(const side of [-1,1]){
  const columns=grid.columns||Math.max(1,Math.round(width/2.8)),rows=grid.rows||Math.max(1,Math.round(height/3.2)),slot=side>0?4:5;
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
   const facadeWidth=width-2*corner;
   const l=-x+corner+col*facadeWidth/columns,r=l+facadeWidth/columns,b=-y+row*height/rows,t=b+height/rows;
   const inset=Math.min(.17,depth*.04),edge=Math.min(.15,width/columns*.08,height/rows*.08),face=z*side,inner=(z-inset)*side;
   const add=(a,b,c,d)=>side>0?quad(a,b,c,d,slot):quad(d,c,b,a,slot);
   add([l,b,face],[r,b,face],[r,b+edge,face],[l,b+edge,face]);
   add([l,t-edge,face],[r,t-edge,face],[r,t,face],[l,t,face]);
   add([l,b+edge,face],[l+edge,b+edge,inner],[l+edge,t-edge,inner],[l,t-edge,face]);
   add([r-edge,b+edge,inner],[r,b+edge,face],[r,t-edge,face],[r-edge,t-edge,inner]);
   add([l,b+edge,face],[r,b+edge,face],[r-edge,b+edge,inner],[l+edge,b+edge,inner]);
   add([l+edge,t-edge,inner],[r-edge,t-edge,inner],[r,t-edge,face],[l,t-edge,face]);
   add([l+edge,b+edge,inner],[r-edge,b+edge,inner],[r-edge,t-edge,inner],[l+edge,t-edge,inner]);
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
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(coordinates,2));materialGroups.forEach(args=>g.addGroup(...args));g.computeVertexNormals();g.computeBoundingBox();g.userData.modelFamily='architecture';return g;
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
 const vertices=profile==='gable'?[-x,y,-z,x,y,-z,x,y,z,-x,y,z,-x,height/2,0,x,height/2,0]:[-x,y,-z,x,y,-z,x,y,z,-x,y,z,-ridge,height/2,0,ridge,height/2,0];
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 g.setIndex([0,4,5,0,5,1,1,5,2,2,5,4,2,4,3,3,4,0,3,0,1,3,1,2]);
 const uv=[];for(let i=0;i<vertices.length;i+=3)uv.push(vertices[i]/2,vertices[i+2]/2);g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();flat.userData.modelFamily='roof';return flat;
}

// Unit-sized arch; the opening is real geometry, not an opaque rectangle.
export function archedWindowGeometry(frame=false){
 const shape=new THREE.Shape();
 const outline=(path,w,h,bottom=-.5)=>{path.moveTo(-w/2,bottom);path.lineTo(w/2,bottom);path.lineTo(w/2,h-w/2);path.absarc(0,h-w/2,w/2,0,Math.PI,false);path.lineTo(-w/2,bottom);};
 outline(shape,1,.5);
 if(frame){const hole=new THREE.Path();outline(hole,.84,.42,-.42);shape.holes.push(hole);return new THREE.ExtrudeGeometry(shape,{depth:.1,bevelEnabled:false,curveSegments:10});}
 return new THREE.ShapeGeometry(shape,10);
}
export function shopCanopyGeometry(){
 const vertices=[],uv=[],indices=[];
 for(let i=0;i<=8;i++){
  const t=i/8,z=t-.5,y=.15*Math.cos(t*Math.PI/2)-.18*t;
  vertices.push(-.5,y,z,.5,y,z);uv.push(0,t,1,t);
  if(i){const a=(i-1)*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
