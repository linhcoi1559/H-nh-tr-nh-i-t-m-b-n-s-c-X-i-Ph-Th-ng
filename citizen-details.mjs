import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const compactGeometry=new WeakMap(),compactMaterials=new WeakMap();
export function compactCitizenMeshes(model){
 model.updateMatrixWorld(true);const buckets=new Map();
 model.traverse(mesh=>{
  if(!mesh.isSkinnedMesh||Array.isArray(mesh.material)||mesh.material.map||mesh.morphTargetInfluences?.length)return;
  const m=mesh.material,key=[m.roughness,m.metalness,m.bumpMap?.uuid||'',m.side,m.transparent,m.opacity].join('/');
  if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(mesh);
 });
 let saved=0;
 for(const nodes of buckets.values()){
  if(nodes.length<2)continue;const first=nodes[0];
  if(nodes.some(n=>n.parent!==first.parent||!n.matrix.equals(first.matrix)||!n.bindMatrix.equals(first.bindMatrix)||n.skeleton.bones.some((bone,i)=>bone!==first.skeleton.bones[i])))continue;
  let geometry=compactGeometry.get(first.geometry);
  if(!geometry){
   const parts=nodes.map(n=>{
    const g=n.geometry.index?n.geometry.toNonIndexed():n.geometry.clone(),count=g.attributes.position.count,colors=new Float32Array(count*3),color=n.material.color;
    for(let i=0;i<count;i++)colors.set([color.r,color.g,color.b],i*3);
    g.setAttribute('color',new THREE.BufferAttribute(colors,3));if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(count*2),2));g.clearGroups();return g;
   });geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());if(!geometry)continue;compactGeometry.set(first.geometry,geometry);
  }
  let material=compactMaterials.get(first.material);
  if(!material){material=first.material.clone();material.color.setHex(0xffffff);material.vertexColors=true;compactMaterials.set(first.material,material);}
  const merged=new THREE.SkinnedMesh(geometry,material);merged.name='CitizenSurface';merged.position.copy(first.position);merged.quaternion.copy(first.quaternion);merged.scale.copy(first.scale);merged.bindMode=first.bindMode;merged.bind(first.skeleton,first.bindMatrix);merged.castShadow=first.castShadow;merged.receiveShadow=first.receiveShadow;
  first.parent.add(merged);nodes.forEach(n=>n.removeFromParent());saved+=nodes.length-1;
 }
 model.updateMatrixWorld(true);return saved;
}
const helmetShell=new THREE.SphereGeometry(.153,20,12,0,Math.PI*2,0,Math.PI*.61);
const helmetRim=new THREE.TorusGeometry(.144,.009,5,24);
const dark=new THREE.MeshStandardMaterial({color:0x232c31,roughness:.66});
const paints=new Map();
const citizenMaterials=new WeakMap();
const weaveBytes=new Uint8Array(32*32*4);
for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=(y*32+x)*4,v=122+((x%4<2)=== (y%4<2)?14:-14);weaveBytes.set([v,v,v,255],i);}
const weave=new THREE.DataTexture(weaveBytes,32,32);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(10,10);weave.needsUpdate=true;
export function dressCitizenMaterials(model){
  model.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const dress=source=>{
      if(citizenMaterials.has(source))return citizenMaterials.get(source);
      const mat=source.clone(),name=source.name.toLowerCase();
      if(/^(top_|bottom_|body_)/.test(name)){mat.roughness=.94;mat.metalness=0;mat.bumpMap=weave;mat.bumpScale=.0012;}
      else if(name==='skin'){mat.roughness=.78;mat.metalness=0;}
      else if(name==='hair'){mat.roughness=.85;mat.metalness=0;}
      else if(name.includes('metal')){mat.metalness=.55;mat.roughness=.35;}
      else if(name.startsWith('shoes'))mat.roughness=.67;
      citizenMaterials.set(source,mat);return mat;
    };
    mesh.material=Array.isArray(mesh.material)?mesh.material.map(dress):dress(mesh.material);
  });
}
const bagMaterial=new THREE.MeshStandardMaterial({color:0x705340,roughness:.87});
const bagGeometry=new THREE.SphereGeometry(1,14,10);
export function addCitizenSatchel(model,bones){
  const chest=bones.chest||bones.spine;if(!chest)return null;
  model.updateMatrixWorld(true);const scale=chest.getWorldScale(new THREE.Vector3());
  const group=new THREE.Group();group.name='LeatherShoulderSatchel';group.scale.set(1/Math.abs(scale.x),1/Math.abs(scale.y),1/Math.abs(scale.z));
  const bag=new THREE.Mesh(bagGeometry,bagMaterial);bag.scale.set(.145,.125,.055);bag.position.set(.19,-.24,.14);bag.castShadow=true;group.add(bag);
  const strapCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.17,.13,.12),new THREE.Vector3(0,-.03,.18),new THREE.Vector3(.19,-.23,.18)]);
  const strap=new THREE.Mesh(new THREE.TubeGeometry(strapCurve,12,.009,5,false),bagMaterial);group.add(strap);
  chest.add(group);return group;
}
export function addCitizenHelmet(model,bones,color=0x405d68){
  const head=bones.head;if(!head)return null;
  model.updateMatrixWorld(true);
  const helmet=new THREE.Group();helmet.name='FittedMotorcycleHelmet';
  const scale=head.getWorldScale(new THREE.Vector3());
  const bounds=new THREE.Box3(),vertex=new THREE.Vector3();
  model.traverse(mesh=>{
    if(!mesh.isSkinnedMesh)return;mesh.skeleton.update();
    const {position,skinIndex,skinWeight}=mesh.geometry.attributes;
    for(let i=0;i<position.count;i++){
      let weight=0;for(let j=0;j<4;j++)if(mesh.skeleton.bones[skinIndex.getComponent(i,j)]===head)weight+=skinWeight.getComponent(i,j);
      if(weight<.5)continue;vertex.fromBufferAttribute(position,i);mesh.applyBoneTransform(i,vertex);bounds.expandByPoint(vertex.applyMatrix4(mesh.matrixWorld));
    }
  });
  const radius=bounds.isEmpty()?.153:Math.max(bounds.max.x-bounds.min.x,bounds.max.z-bounds.min.z)*.535;
  const position=head.getWorldPosition(new THREE.Vector3());
  position.y=bounds.isEmpty()?position.y+.075:bounds.max.y-radius*.8;
  head.worldToLocal(position);helmet.position.copy(position);
  const fit=radius/.153;
  helmet.scale.set(fit/Math.abs(scale.x),fit/Math.abs(scale.y),fit/Math.abs(scale.z));
  if(!paints.has(color))paints.set(color,new THREE.MeshStandardMaterial({color,roughness:.4,metalness:.15}));
  const shell=new THREE.Mesh(helmetShell,paints.get(color));shell.castShadow=true;helmet.add(shell);
  const rim=new THREE.Mesh(helmetRim,dark);rim.rotation.x=Math.PI/2;rim.position.y=-.052;helmet.add(rim);
  // Side straps stay open over the face and follow the animated head.
  for(const side of [-1,1]){
    const strap=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.13,5),dark);
    strap.position.set(side*.12,-.09,.015);strap.rotation.z=side*.22;helmet.add(strap);
  }
  head.add(helmet);return helmet;
}
