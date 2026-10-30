import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Opt-in only: moving wheels, skeletons, interaction rings and story visibility
// are never inferred from dimensions or material colors.
export function compileStaticGroups(world){
 const roots=[];world.traverse(node=>{if(node.userData.staticBatch&&!node.userData.staticCompiled){let p=node.parent;while(p&&p!==world){if(p.userData.staticBatch)return;p=p.parent;}roots.push(node);}});
 let before=0,after=0,groups=0;
 for(const root of roots){
  root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert(),buckets=new Map();
  root.traverse(node=>{
   if(!node.isMesh||node.isInstancedMesh||node.isSkinnedMesh||node.children.length||!node.visible||Array.isArray(node.material)||node.material.vertexColors)return;
   let p=node.parent;while(p&&p!==root){if(!p.visible)return;p=p.parent;}
   const key=[node.material.uuid,node.castShadow,node.receiveShadow,node.renderOrder,node.layers.mask].join('/');
   if(!buckets.has(key))buckets.set(key,{nodes:[],material:node.material});buckets.get(key).nodes.push(node);
  });
  for(const {nodes,material}of buckets.values()){
   if(nodes.length<2)continue;
   const parts=nodes.map(node=>{
    const part=node.geometry.index?node.geometry.toNonIndexed():node.geometry.clone();
    for(const name of Object.keys(part.attributes))if(!['position','normal','uv'].includes(name))part.deleteAttribute(name);
    if(!part.attributes.normal)part.computeVertexNormals();if(!part.attributes.uv)part.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(part.attributes.position.count*2),2));
    part.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,node.matrixWorld));part.clearGroups();return part;
   });
   const geometry=mergeGeometries(parts);parts.forEach(p=>p.dispose());if(!geometry)continue;
   geometry.computeBoundingBox();geometry.computeBoundingSphere();
   const first=nodes[0],mesh=new THREE.Mesh(geometry,material);mesh.name='static-batch';mesh.castShadow=first.castShadow;mesh.receiveShadow=first.receiveShadow;mesh.renderOrder=first.renderOrder;mesh.layers.mask=first.layers.mask;
   root.add(mesh);nodes.forEach(node=>node.removeFromParent());before+=nodes.length;after++;groups++;
  }
  root.userData.staticCompiled=true;
  root.updateMatrixWorld(true);root.traverse(node=>{if(!node.isSkinnedMesh&&!node.isBone)node.matrixAutoUpdate=false;});
 }
 return {before,after,groups,savedDrawObjects:before-after};
}

export function detailVisibility(wasVisible,distance,enter=185,exit=225){return wasVisible?distance<=exit:distance<enter;}

export function compileArchitectureChunks(world,chunkSize=48){
 world.updateMatrixWorld(true);const buckets=new Map(),inverse=world.matrixWorld.clone().invert();let before=0,after=0;
 // Only explicitly permanent, direct children qualify. Story rooms and moving
 // objects retain their original parent and visibility semantics.
 for(const root of [...world.children]){
  if(!root.userData.permanentArchitecture||root.userData.chunkCompiled||!root.visible)continue;
  root.traverse(node=>{
   if(!node.isMesh||node.isInstancedMesh||node.isSkinnedMesh||node.children.length||Array.isArray(node.material)||!node.visible)return;
   const center=new THREE.Vector3();node.getWorldPosition(center);
   const key=[Math.floor(center.x/chunkSize),Math.floor(center.z/chunkSize),node.material.uuid,node.castShadow,node.receiveShadow,node.renderOrder,node.layers.mask].join('/');
   if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(node);
  });root.userData.chunkCompiled=true;
 }
 for(const nodes of buckets.values()){
  if(nodes.length<2)continue;
  const parts=nodes.map(node=>{const g=node.geometry.index?node.geometry.toNonIndexed():node.geometry.clone();for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);if(!g.attributes.normal)g.computeVertexNormals();if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));g.clearGroups();g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,node.matrixWorld));return g;});
  const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());if(!geometry)continue;geometry.computeBoundingSphere();
  const first=nodes[0],batch=new THREE.Mesh(geometry,first.material);batch.name='PermanentArchitectureChunk';batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;batch.renderOrder=first.renderOrder;batch.layers.mask=first.layers.mask;batch.matrixAutoUpdate=false;world.add(batch);
  nodes.forEach(node=>node.removeFromParent());before+=nodes.length;after++;
 }
 return {before,after,savedDrawObjects:before-after};
}

export function createShadowBudget(){
 let elapsed=Infinity,lastX=Infinity,lastZ=Infinity;
 return {tick(delta,x,z,forced=false,limitMoving=false){elapsed+=delta;const distance=Math.hypot(x-lastX,z-lastZ),moved=distance>.25,period=limitMoving?1/10:1/15;
  if(forced||moved&&distance>8){elapsed=0;lastX=x;lastZ=z;return true;}
  if(elapsed>=period){elapsed%=period;lastX=x;lastZ=z;return true;}return false;}};
}

export function crossingRoadGeometry(width,length,crossingWidth,min=-length/2,max=length/2){
 const positions=[],uvs=[],indices=[];
 for(const [bottom,top]of [[min,-crossingWidth/2],[crossingWidth/2,max]]){
  const i=positions.length/3;positions.push(-width/2,bottom,0,width/2,bottom,0,width/2,top,0,-width/2,top,0);
  uvs.push(bottom/length+.5,0,bottom/length+.5,1,top/length+.5,1,top/length+.5,0);indices.push(i,i+1,i+2,i,i+2,i+3);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
