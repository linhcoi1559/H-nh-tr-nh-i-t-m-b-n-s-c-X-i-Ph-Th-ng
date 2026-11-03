import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {canonicalBoneName} from './neighborhood-models.mjs';
import {smoothOrganicCharacterGeometry,installHumanOrganicShader} from './citizen-details.mjs';

// NPC parts come exclusively from the five CC0 NPC assets. The hero's head,
// hair and clothing are reserved for the player; only compatible clips are shared.
const G='guard',O='official',V='vendor',R='resident',E='veteran';
const profiles=[];
function person(id,label,body,face,hair,top,bottom,height,skin,shirt,trousers,hairColor,extra={}){
 const index=profiles.length;
 if(top===R)bottom=R;
 if(top===O&&bottom===V)bottom=O;
 profiles.push(Object.freeze({id,label,body,face,hair,top,bottom,shoes:[G,E].includes(bottom)?G:O,height,skin,shirt,trousers,hairColor,
  head:[.84+(index%4)*.035,.86+(index%3)*.035,.87+(index%5)*.018],width:.97+(index%3)*.03,
  eyes:.74+(index%4)*.035,...extra}));
}
person('guard-hung','Bác Hùng · bảo vệ',G,G,G,G,G,1.73,0xc99774,0x668ba3,0x293b4b,0x34312c,{hat:G});
person('official-thao','Cán bộ Thảo',O,O,O,O,O,1.66,0xe0b997,0xe0ddd1,0x39424b,0x332a25,{glasses:true});
person('tea-hoa','Cô Hoa · quán trà',V,V,V,R,V,1.59,0xc99777,0x71836d,0x38483e,0x362c27,{headwear:'conical',bag:'satchel'});
person('leader-lam','Bác Lâm · tổ trưởng',G,E,G,O,O,1.70,0xc39d7d,0xa28a65,0x514f43,0x8a8b80,{headwear:'beret',glasses:true});
person('veteran-dung','Bác Dũng · cựu chiến binh',G,E,E,G,E,1.72,0xbe9370,0x65765a,0x45523e,0x93958b,{hat:E});
person('xoi-hanh','Cô Hạnh · gánh xôi',V,G,V,V,V,1.57,0xd3a880,0xb49a60,0x4a4840,0x292a27,{headwear:'conical'});
person('worker-phuc','Chú Phúc · vệ sinh',G,E,G,G,G,1.68,0xb88964,0x7b8b60,0x354349,0x474640,{hat:G});
person('student-mai','Mai · học sinh',R,R,R,O,R,1.61,0xe2bc9d,0xebe6d7,0x2c4058,0x292826,{bag:'backpack',bagColor:0x375a79});
person('student-minh','Minh · học sinh',O,G,G,G,O,1.68,0xcda17f,0xe4dfd2,0x2d3b4d,0x35312b,{bag:'backpack',bagColor:0x824c40});
person('student-linh','Linh · học sinh',R,O,O,O,R,1.59,0xdcb695,0xe5e1d6,0x374655,0x4c3529,{bag:'backpack',bagColor:0x6d5675,glasses:true});
person('runner-khoa','Khoa · chạy bộ',O,E,G,G,O,1.78,0xbc8e69,0x4c7e89,0x2c363a,0x302b26);
person('market-lan','Chị Lan · đi chợ',R,R,R,R,O,1.65,0xd3aa86,0x9c696c,0x47423e,0x41332a,{bag:'satchel'});
person('market-ngoc','Cô Ngọc · đi chợ',V,G,O,O,V,1.60,0xc79774,0x6b7c83,0x4d5346,0x76746c,{bag:'satchel',glasses:true});
person('tea-tuan','Anh Tuấn · khách trà',G,G,G,O,G,1.76,0xd0a17c,0x8e7765,0x323d49,0x2d2925);
person('tea-quang','Chú Quang · khách trà',O,E,E,G,O,1.69,0xba8e6b,0x61756b,0x43494d,0x6b6b60,{glasses:true});
person('student-bao','Bảo · học sinh',O,O,G,O,O,1.70,0xd8b08c,0xe4dfd4,0x33425c,0x222925,{bag:'backpack',bagColor:0x527263});
person('tailor-lien','Cô Liên · tiệm may',R,R,O,R,R,1.62,0xdbb08e,0x896e87,0x424851,0x4d3328,{bag:'satchel',glasses:true});
person('books-son','Bác Sơn · hiệu sách',O,E,null,O,O,1.67,0xc09a7c,0x9b9e8e,0x4a4f43,0x9b9c94,{glasses:true,headwear:'beret'});
person('water-binh','Chú Bình · quán nước',V,G,G,G,V,1.64,0xad815f,0x7b7661,0x404b48,0x3c3931);
person('rider-dat','Đạt · người đi xe',G,G,G,G,G,1.74,0xc79471,0x4a7168,0x3d4546,0x252b28);
person('rider-thuy','Thủy · người đi xe',R,R,R,R,O,1.63,0xd3ab8c,0x986b62,0x424b55,0x392e28);
person('rider-nam','Nam · người đi xe',O,O,G,O,E,1.77,0xbc9271,0xa4976c,0x495043,0x493a2e,{glasses:true});
person('rider-hue','Huệ · người đi xe',V,G,V,O,V,1.60,0xd4a886,0x697b8d,0x374242,0x312e2a);
person('farmer-loc','Chú Lộc · chở đào',V,E,G,G,V,1.67,0xad7b57,0x7d8060,0x504936,0x79776c,{hat:G});
person('thief-hai','Người chạy trong sự kiện',O,G,G,G,O,1.75,0xc29674,0x41494d,0x292e37,0x262725);
person('elder-huong','Bà Hương · qua đường',V,R,O,R,V,1.55,0xc3a084,0x82718b,0x4b4c47,0xa3a29a,{glasses:true,bag:'satchel'});
person('arcade-minh','Chú Minh · khách tiệm',G,E,G,O,G,1.71,0xbc9272,0x87745d,0x394a50,0x8b8b80,{glasses:true});
person('arcade-lan','Lan · khách tiệm',R,O,R,R,R,1.64,0xd9af8d,0x7e667d,0x374b57,0x342d29);
person('arcade-tuan','Anh Tuấn · khách tiệm',O,G,G,G,O,1.78,0xc39877,0x4e716a,0x454b4c,0x302d29);
person('arcade-thao','Thảo · khách tiệm',V,R,O,O,O,1.66,0xd2a887,0xaa8d76,0x3b464e,0x593d2c,{glasses:true});
const extraRiders=['an','binh','chi','duc','giang','ha'];
extraRiders.forEach((name,i)=>person('rider-'+name,['An','Bình','Chi','Đức','Giang','Hà'][i]+' · người đi xe',i%2?R:O,[G,E,O,R,V,G][i],[G,O,R,V,E,O][i],i%2?R:G,i%2?O:E,1.61+i*.025,0xc99b78+i*0x010101,[0x6e7989,0x867253,0x72745a,0x925f63,0x5d7a7a,0x86718a][i],0x364451+i*0x020101,0x39302a,{glasses:i%3===0}));
person('police-hai','Anh Hải · công an tuần tra',G,O,G,G,G,1.78,0xc49673,0x4f6945,0x344735,0x242b24,{hat:G});
person('police-van','Chị Vân · cảnh sát giao thông',O,R,O,G,G,1.69,0xd0a385,0xc5b581,0xa99c71,0x2f3029,{hat:G});
person('chess-lam','Ông Lâm · bạn cờ',G,E,E,O,O,1.65,0xc19a7e,0x9c8b6b,0x484c48,0xb0aea4,{glasses:true});
person('chess-dung','Ông Dũng · bạn cờ',G,E,null,G,E,1.68,0xb88b6d,0x65755a,0x404b3e,0xa6a79c,{headwear:'beret'});
person('chess-son','Ông Sơn · bạn cờ',O,E,O,O,O,1.63,0xc8a58b,0x8b827c,0x414a53,0xbab6ad,{glasses:true});
export const POLICE_IDENTITIES=Object.freeze(['police-hai','police-van']);
export const TEA_CHESS_IDENTITIES=Object.freeze(['chess-lam','chess-dung','chess-son']);
export const CITIZEN_ROSTER=Object.freeze(profiles);
export const QUEST_IDENTITIES=Object.freeze(['guard-hung','official-thao','tea-hoa','leader-lam','veteran-dung']);
export const AMBIENT_IDENTITIES=Object.freeze(['xoi-hanh','worker-phuc','student-mai','student-minh','student-linh','runner-khoa','market-lan','market-ngoc','tea-tuan','tea-quang','student-bao','tailor-lien','books-son','water-binh']);
export const RIDER_IDENTITIES=Object.freeze(['rider-dat','rider-thuy','rider-nam','rider-hue',...extraRiders.map(name=>'rider-'+name)]);
export const ARCADE_IDENTITIES=Object.freeze(['arcade-minh','arcade-lan','arcade-tuan','arcade-thao']);
export const EVENT_IDENTITIES=Object.freeze(['farmer-loc','thief-hai','elder-huong']);
const byId=new Map(profiles.map(p=>[p.id,p]));
export function citizenIdentity(id){const p=byId.get(id);if(!p)throw Error('Unknown NPC identity: '+id);return p;}
export function citizenSignature(p){return JSON.stringify([p.body,p.face,p.hair,p.top,p.bottom,p.shirt,p.trousers,p.head,p.hat,p.headwear,p.glasses]);}

export function createCitizenFactory(sources){
 const templates=new Map(),catalog=new Map();
 for(const [key,gltf]of Object.entries(sources)){
  if(key==='player')continue;const meshes=new Map();gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(n=>{if(n.isSkinnedMesh)meshes.set(n.material.name,n);});catalog.set(key,meshes);
 }
 function build(p){
  const model=clone(sources[p.body].scene),old=[];model.traverse(n=>{if(n.isSkinnedMesh)old.push(n);});
  const target=old[0],parent=target.parent,skeleton=target.skeleton,headIndex=skeleton.bones.findIndex(b=>canonicalBoneName(b.name)==='head');
  model.updateMatrixWorld(true);const head=skeleton.bones[headIndex].getWorldPosition(new THREE.Vector3());old.forEach(n=>n.removeFromParent());
  function add(sourceKey,name,section){
   const src=catalog.get(sourceKey)?.get(name);if(!src)return;
   if(src.skeleton.bones.some((b,i)=>canonicalBoneName(b.name)!==canonicalBoneName(skeleton.bones[i]?.name||'')))throw Error('Incompatible NPC rig');
   let geometry;
   if(section){
    const indices=[],index=src.geometry.index,si=src.geometry.attributes.skinIndex,sw=src.geometry.attributes.skinWeight;
    const count=index?.count??si.count;
    for(let i=0;i<count;i+=3){const tri=[0,1,2].map(j=>index?index.getX(i+j):i+j);let weight=0,lower=0;
     for(const vertex of tri)for(let k=0;k<4;k++){const joint=si.getComponent(vertex,k),w=sw.getComponent(vertex,k);if(joint===headIndex)weight+=w;if(/Leg|foot/.test(skeleton.bones[joint].name))lower+=w;}
     const region=weight>=1.5?'head':lower>=1.5?'lower':'upper';
     if(region===section)indices.push(...tri);
    }
    if(!indices.length)return;const selected=src.geometry.clone();selected.setIndex(indices);geometry=selected.toNonIndexed();selected.dispose();
   }else geometry=src.geometry.index?src.geometry.toNonIndexed():src.geometry.clone();
   geometry.clearGroups();
   const positions=geometry.attributes.position,normals=geometry.attributes.normal,si=geometry.attributes.skinIndex,sw=geometry.attributes.skinWeight;
   const eye=name==='eyes'||name==='fix_white',mouth=name==='fix_mouth',centres=[new THREE.Box3(),new THREE.Box3()],v=new THREE.Vector3();
   if(eye||mouth)for(let i=0;i<positions.count;i++){v.fromBufferAttribute(positions,i);centres[v.x<0?0:1].expandByPoint(v);}
   const mid=centres.map(b=>b.isEmpty()?new THREE.Vector3():b.getCenter(new THREE.Vector3()));
   for(let i=0;i<positions.count;i++){
    v.fromBufferAttribute(positions,i);let hw=0;for(let k=0;k<4;k++)if(si.getComponent(i,k)===headIndex)hw+=sw.getComponent(i,k);
    if(eye){const centre=mid[v.x<0?0:1];v.sub(centre).multiplyScalar(p.eyes).add(centre);}
    if(mouth)v.x*=.82;
    const scaled=v.clone().sub(head).multiply(new THREE.Vector3(...p.head)).add(head);v.lerp(scaled,hw);v.x*=1+(p.width-1)*(1-hw);positions.setXYZ(i,v.x,v.y,v.z);
    if(normals){v.fromBufferAttribute(normals,i);const n=v.clone().divide(new THREE.Vector3(...p.head)).normalize();v.lerp(n,hw);v.x/=1+(p.width-1)*(1-hw);v.normalize();normals.setXYZ(i,v.x,v.y,v.z);}
   }
   smoothOrganicCharacterGeometry(geometry,(eye||mouth||name==='face_metal')?0.0004:0.0022);
   geometry.computeBoundingBox();geometry.computeBoundingSphere();
   const material=src.material.clone();
   const tint=name==='skin'?p.skin:name==='hair'||name==='hair_accent'?p.hairColor:name.startsWith('top_')?p.shirt:name.startsWith('bottom_')||name==='body_secondary'?p.trousers:name.startsWith('shoes_')?0x454741:name.startsWith('hat_')?(p.id==='guard-hung'?0x40556c:p.id==='veteran-dung'?0x59634b:0x68765c):name==='eyes'?0x332d27:name==='fix_white'?0xe6dfd1:name==='face_metal'?0x675f4e:null;
   if(tint!==null){material.color.setHex(tint);if(name.endsWith('secondary'))material.color.lerp(new THREE.Color(0xd6cdbb),.18);if(name.endsWith('accent'))material.color.multiplyScalar(name.startsWith('top_')?.97:.85);}
   if(name==='fix_blush')material.color.setHex(p.skin).lerp(new THREE.Color(0xa16c5a),.12);
   const mesh=new THREE.SkinnedMesh(geometry,material);mesh.name=name;mesh.bind(skeleton,target.bindMatrix);mesh.castShadow=true;parent.add(mesh);
  }
  // Use the matching torso/legs under each garment. A slim sweater must not be
  // placed over the exposed belly of a wider body template.
  add(p.top,'skin','upper');add(p.bottom,'skin','lower');add(p.face,'skin','head');add(p.top,'body_secondary');
  for(const name of catalog.get(p.face).keys())if(name==='eyes'||name.startsWith('fix_'))add(p.face,name);
  if(p.hair)for(const name of catalog.get(p.hair).keys())if(name==='hair'||name==='hair_accent')add(p.hair,name);
  for(const [source,prefix]of [[p.top,'top_'],[p.bottom,'bottom_'],[p.shoes,'shoes_']])for(const name of catalog.get(source).keys())if(name.startsWith(prefix)){
   add(source,name);
  }

  if(p.hat)for(const name of catalog.get(p.hat).keys())if(name.startsWith('hat_'))add(p.hat,name);
  if(p.glasses)add(O,'face_metal');
  model.updateMatrixWorld(true);model.userData.citizenIdentity=p.id;model.userData.citizenLabel=p.label;model.userData.citizenSignature=citizenSignature(p);
  return model;
 }
 return function create(id){const profile=citizenIdentity(id);if(!templates.has(id))templates.set(id,build(profile));return {model:clone(templates.get(id)),profile,animations:[...sources[profile.body].animations,...(sources.player?.animations||[]).filter(c=>['run','jump'].includes(c.name.toLowerCase()))]};};
}

const packShape=new THREE.CapsuleGeometry(.105,.17,8,16),strapGeo=new THREE.CylinderGeometry(.008,.008,.3,10),accessoryMaterials=new Map();
function accessoryMaterial(color,kind='cloth'){if(!accessoryMaterials.has(color)){const m=new THREE.MeshStandardMaterial({color,roughness:kind==='skin'?.56:.76});installHumanOrganicShader(m,kind);accessoryMaterials.set(color,m);}return accessoryMaterials.get(color);}
export function addCitizenIdentityDetails(model,bones,p){
 const head=bones.head,chest=bones.chest||bones.spine;
 model.updateMatrixWorld(true);
 function attach(bone,group){const scale=bone.getWorldScale(new THREE.Vector3());group.scale.set(1/Math.abs(scale.x),1/Math.abs(scale.y),1/Math.abs(scale.z));bone.add(group);}
 if(bones.neck&&head){
  const length=head.getWorldPosition(new THREE.Vector3()).distanceTo(bones.neck.getWorldPosition(new THREE.Vector3()));
  const collar=new THREE.Group();collar.name='FittedNeck';const neck=new THREE.Mesh(new THREE.CylinderGeometry(.046,.055,length+.04,16),accessoryMaterial(p.skin,'skin'));neck.position.y=length/2;collar.add(neck);attach(bones.neck,collar);
 }
 if(p.bag==='backpack'&&chest){
  const bag=new THREE.Group();bag.name='SchoolBackpack';const body=new THREE.Mesh(packShape,accessoryMaterial(p.bagColor));body.position.set(0,-.07,-.19);body.scale.set(1.15,1,.55);body.castShadow=true;bag.add(body);
  for(const side of [-1,1]){const strap=new THREE.Mesh(strapGeo,accessoryMaterial(0x353e43));strap.position.set(side*.115,-.03,-.075);strap.rotation.x=-.35;bag.add(strap);}attach(chest,bag);
 }
 if(p.headwear&&head){
  let top=-Infinity;const point=new THREE.Vector3();
  model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;mesh.skeleton.update();const {position,skinIndex,skinWeight}=mesh.geometry.attributes;
   for(let i=0;i<position.count;i++){let weight=0;for(let k=0;k<4;k++)if(mesh.skeleton.bones[skinIndex.getComponent(i,k)]===head)weight+=skinWeight.getComponent(i,k);if(weight<.5)continue;point.fromBufferAttribute(position,i);mesh.applyBoneTransform(i,point);top=Math.max(top,point.applyMatrix4(mesh.matrixWorld).y);}
  });const rise=Number.isFinite(top)?top-head.getWorldPosition(point).y:.3;
  const hat=new THREE.Group();hat.name=p.headwear==='conical'?'WovenConicalHat':'SoftBeret';
  const geo=p.headwear==='conical'?new THREE.ConeGeometry(.29,.19,36,3,true):new THREE.SphereGeometry(.19,24,14,0,Math.PI*2,0,Math.PI*.65);
  const mesh=new THREE.Mesh(geo,accessoryMaterial(p.headwear==='conical'?0xbca97a:0x68685c));mesh.castShadow=true;
  mesh.position.y=rise+(p.headwear==='conical'?.025:-.025);if(p.headwear==='beret'){mesh.scale.set(1,.35,1.05);mesh.rotation.z=.15;}hat.add(mesh);attach(head,hat);
 }
}
