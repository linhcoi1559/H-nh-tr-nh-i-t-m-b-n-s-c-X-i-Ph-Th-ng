import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const compactGeometry=new WeakMap(),compactMaterials=new WeakMap(),smoothedGeometries=new WeakSet();

// Làm mượt hình học nhân vật (Welded Crease-Angle Smooth Normals + Laplacian Organic Curvature Inflation)
// giúp nhân vật người chơi và 41 NPC thoát hẳn vẻ gãy khúc, đa giác hình khối thô cứng!
export function smoothOrganicCharacterGeometry(geometry,inflateAmount=0.0024){
 if(!geometry||smoothedGeometries.has(geometry))return geometry;
 const pos=geometry.attributes?.position;
 if(!pos||pos.count<3)return geometry;
 const count=pos.count;
 if(!geometry.attributes.normal)geometry.computeVertexNormals();
 const norm=geometry.attributes.normal;

 // 1. Gom các đỉnh trùng vị trí trong không gian 3D (spatial welding) để tính trung bình pháp tuyến mượt
 const buckets=new Map();
 for(let i=0;i<count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
  const key=`${Math.round(x*2500)},${Math.round(y*2500)},${Math.round(z*2500)}`;
  let list=buckets.get(key);
  if(!list){list=[];buckets.set(key,list);}
  list.push(i);
 }

 // 2. Xây dựng đồ thị kề mặt phẳng (spatial adjacency) để làm tròn nội suy Laplacian nhẹ trên mặt cong
 const neighbors=Array.from({length:count},()=>[]);
 for(let i=0;i<count-2;i+=3){
  neighbors[i].push(i+1,i+2);
  neighbors[i+1].push(i,i+2);
  neighbors[i+2].push(i,i+1);
 }

 const smoothNx=new Float32Array(count),smoothNy=new Float32Array(count),smoothNz=new Float32Array(count);
 const avgX=new Float32Array(count),avgY=new Float32Array(count),avgZ=new Float32Array(count);

 for(const list of buckets.values()){
  for(const idx of list){
   const n0x=norm.getX(idx),n0y=norm.getY(idx),n0z=norm.getZ(idx);
   let sx=0,sy=0,sz=0,px=0,py=0,pz=0,pCount=0;
   for(const other of list){
    const nx=norm.getX(other),ny=norm.getY(other),nz=norm.getZ(other);
    // Hàn mượt mọi cạnh có góc lệch < 78 độ (dot > 0.2) để cơ thể, má, vai, ống tay áo tròn trịa tự nhiên
    if(n0x*nx+n0y*ny+n0z*nz>0.2){
     sx+=nx;sy+=ny;sz+=nz;
    }
    for(const nb of neighbors[other]){
     px+=pos.getX(nb);py+=pos.getY(nb);pz+=pos.getZ(nb);pCount++;
    }
   }
   const len=Math.hypot(sx,sy,sz)||1;
   smoothNx[idx]=sx/len;smoothNy[idx]=sy/len;smoothNz[idx]=sz/len;
   if(pCount>0){
    avgX[idx]=px/pCount;avgY[idx]=py/pCount;avgZ[idx]=pz/pCount;
   }else{
    avgX[idx]=pos.getX(idx);avgY[idx]=pos.getY(idx);avgZ[idx]=pos.getZ(idx);
   }
  }
 }

 // 3. Đẩy phồng nhẹ bề mặt theo pháp tuyến mượt + làm dịu cạnh gắt (Taubin/Laplacian Organic Sculpting)
 if(inflateAmount>0){
  let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
  for(let i=0;i<count;i++){
   const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
   if(x<minX)minX=x;if(x>maxX)maxX=x;
   if(y<minY)minY=y;if(y>maxY)maxY=y;
   if(z<minZ)minZ=z;if(z>maxZ)maxZ=z;
  }
  let nMinX=Infinity,nMinY=Infinity,nMinZ=Infinity,nMaxX=-Infinity,nMaxY=-Infinity,nMaxZ=-Infinity;
  for(let i=0;i<count;i++){
   const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
   const nx=smoothNx[i],ny=smoothNy[i],nz=smoothNz[i];
   const lx=x+(avgX[i]-x)*0.18+nx*inflateAmount;
   const ly=y+(avgY[i]-y)*0.12+ny*(inflateAmount*0.6);
   const lz=z+(avgZ[i]-z)*0.18+nz*inflateAmount;
   pos.setXYZ(i,lx,ly,lz);
   if(lx<nMinX)nMinX=lx;if(lx>nMaxX)nMaxX=lx;
   if(ly<nMinY)nMinY=ly;if(ly>nMaxY)nMaxY=ly;
   if(lz<nMinZ)nMinZ=lz;if(lz>nMaxZ)nMaxZ=lz;
   norm.setXYZ(i,nx,ny,nz);
  }
  const sx=(maxX-minX)/Math.max(1e-6,nMaxX-nMinX);
  const sy=(maxY-minY)/Math.max(1e-6,nMaxY-nMinY);
  const sz=(maxZ-minZ)/Math.max(1e-6,nMaxZ-nMinZ);
  const ox=minX-nMinX*sx,oy=minY-nMinY*sy,oz=minZ-nMinZ*sz;
  for(let i=0;i<count;i++)pos.setXYZ(i,pos.getX(i)*sx+ox,pos.getY(i)*sy+oy,pos.getZ(i)*sz+oz);
 }else{
  for(let i=0;i<count;i++)norm.setXYZ(i,smoothNx[i],smoothNy[i],smoothNz[i]);
 }
 pos.needsUpdate=true;
 norm.needsUpdate=true;
 geometry.computeBoundingBox();
 geometry.computeBoundingSphere();
 smoothedGeometries.add(geometry);
 return geometry;
}

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
    if(smoothedGeometries.has(n.geometry))smoothedGeometries.add(g);
    else{
     const isDetail=/^(eyes|fix_|face_metal)/.test(n.name||'');
     smoothOrganicCharacterGeometry(g,isDetail?0.0004:0.0022);
    }
    for(let i=0;i<count;i++)colors.set([color.r,color.g,color.b],i*3);
    g.setAttribute('color',new THREE.BufferAttribute(colors,3));if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(count*2),2));g.clearGroups();return g;
   });geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());if(!geometry)continue;compactGeometry.set(first.geometry,geometry);
  }
  let material=compactMaterials.get(first.material);
  if(!material){material=first.material.clone();material.color.setHex(0xffffff);material.vertexColors=true;installHumanOrganicShader(material,'cloth');compactMaterials.set(first.material,material);}
  const merged=new THREE.SkinnedMesh(geometry,material);merged.name='CitizenSurface';merged.position.copy(first.position);merged.quaternion.copy(first.quaternion);merged.scale.copy(first.scale);merged.bindMode=first.bindMode;merged.bind(first.skeleton,first.bindMatrix);merged.castShadow=first.castShadow;merged.receiveShadow=first.receiveShadow;
  first.parent.add(merged);nodes.forEach(n=>n.removeFromParent());saved+=nodes.length-1;
 }
 model.updateMatrixWorld(true);return saved;
}
const helmetShell=new THREE.SphereGeometry(.153,28,18,0,Math.PI*2,0,Math.PI*.61);
const helmetRim=new THREE.TorusGeometry(.144,.009,8,28);
const dark=new THREE.MeshStandardMaterial({color:0x232c31,roughness:.52,metalness:.18});
const paints=new Map();
const citizenMaterials=new WeakMap();
const weaveBytes=new Uint8Array(64*64*4);
for(let y=0;y<64;y++)for(let x=0;x<64;x++){
 const i=(y*64+x)*4;
 const twill=((x+y)%4<2)?12:-12;
 const fold=Math.round(Math.sin(x*0.39)*Math.cos(y*0.24)*10);
 const v=Math.max(0,Math.min(255,128+twill+fold));
 weaveBytes.set([v,v,v,255],i);
}
const weave=new THREE.DataTexture(weaveBytes,64,64);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(12,12);weave.needsUpdate=true;

// Shader Subsurface Scattering (SSS) cho da người + Micro-sheen nếp vải quần áo chuẩn AAA
export function installHumanOrganicShader(material,kind='skin'){
 if(!material||material.userData?.organicShaderInstalled)return;
 material.userData={...material.userData,organicShaderInstalled:true,organicKind:kind};
 material.customProgramCacheKey=()=>`human-organic-${kind}-${material.vertexColors?1:0}`;
 material.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader.replace(
   '#include <tonemapping_fragment>',
   `
   vec3 viewDirOrganic = normalize(vViewPosition);
   vec3 normOrganic = normalize(normal);
   float ndvOrganic = clamp(dot(normOrganic, viewDirOrganic), 0.0, 1.0);
   float rimOrganic = pow(1.0 - ndvOrganic, 3.0);
   float hemiWrap = clamp(normOrganic.y * 0.5 + 0.5, 0.0, 1.0);
   ${kind==='skin'
    ? `
    // Tán xạ dưới bề mặt da (Subsurface Warm Blood Scattering) + bóng ẩm tự nhiên
    vec3 sssTint = vec3(0.14, 0.048, 0.028) * pow(1.0 - ndvOrganic, 2.1) * (0.45 + 0.55 * hemiWrap);
    gl_FragColor.rgb += sssTint + vec3(0.055, 0.048, 0.042) * rimOrganic;
    `
    : kind==='hair'
    ? `
    // Ánh kim sợi tóc Anisotropic Kajiya-Kay giả lập
    float hairBand = pow(clamp(1.0 - abs(normOrganic.y - 0.25), 0.0, 1.0), 6.0);
    gl_FragColor.rgb += vec3(0.09, 0.075, 0.06) * hairBand + vec3(0.04) * rimOrganic;
    `
    : `
    // Độ mượt nhung sợi vải (Fabric Micro-Sheen) + chiều sâu nếp gấp Ambient Occlusion
    gl_FragColor.rgb *= (0.91 + 0.14 * hemiWrap);
    gl_FragColor.rgb += gl_FragColor.rgb * 0.18 * rimOrganic + vec3(0.028, 0.03, 0.035) * rimOrganic;
    `}
   #include <tonemapping_fragment>
   `
  );
 };
}

export function dressCitizenMaterials(model){
  model.traverse(mesh=>{
    if(!mesh.isMesh)return;
    if(mesh.geometry){
      const isDetail=/^(eyes|fix_|face_metal)/.test(mesh.name||'');
      smoothOrganicCharacterGeometry(mesh.geometry,isDetail?0.0004:0.0022);
    }
    const dress=source=>{
      if(citizenMaterials.has(source))return citizenMaterials.get(source);
      const mat=source.clone(),name=source.name.toLowerCase();
      if(/^(top_|bottom_|body_)/.test(name)){
        mat.roughness=.78;mat.metalness=.02;mat.bumpMap=weave;mat.bumpScale=.0028;mat.envMapIntensity=.68;
        installHumanOrganicShader(mat,'cloth');
      }
      else if(name==='skin'||name==='fix_blush'){
        mat.roughness=.56;mat.metalness=.01;mat.envMapIntensity=.75;
        installHumanOrganicShader(mat,'skin');
      }
      else if(name==='hair'||name==='hair_accent'){
        mat.roughness=.64;mat.metalness=.04;mat.bumpMap=weave;mat.bumpScale=.0018;
        installHumanOrganicShader(mat,'hair');
      }
      else if(name==='eyes'||name==='fix_white'){
        mat.roughness=.12;mat.metalness=.08;mat.envMapIntensity=1.35;
      }
      else if(name.includes('metal')){mat.metalness=.72;mat.roughness=.24;mat.envMapIntensity=1.1;}
      else if(name.startsWith('shoes')){mat.roughness=.46;mat.metalness=.08;installHumanOrganicShader(mat,'cloth');}
      else installHumanOrganicShader(mat,'cloth');
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
