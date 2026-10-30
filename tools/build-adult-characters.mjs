import fs from 'node:fs';
import * as THREE from 'three';

// Derive adult proportions from the existing CC0 Grab3D meshes. Geometry,
// bind poses and translation tracks are changed together, not just root scale.
const sources=['player-cozy','npc-guard','npc-official','npc-vendor','npc-resident','npc-veteran'];
function stretch(name=''){
 if(name==='head')return new THREE.Vector3(.60,.60,.60);
 if(/upperLeg|lowerLeg/.test(name))return new THREE.Vector3(.86,1.65,.86);
 if(/upperArm|lowerArm/.test(name))return new THREE.Vector3(.85,1.28,.85);
 if(/spine|chest/.test(name))return new THREE.Vector3(.90,1.2,.90);
 if(/hips|hand|foot/.test(name))return new THREE.Vector3(.88,1,.88);
 return new THREE.Vector3(1,1,1);
}
for(const source of sources){
 const raw=fs.readFileSync(`assets/models/${source}.glb`),length=raw.readUInt32LE(12),json=JSON.parse(raw.subarray(20,20+length)),bin=Buffer.from(raw.subarray(28+length));
 const nodes=json.nodes.map(n=>{const node=new THREE.Object3D();node.name=n.name||'';if(n.translation)node.position.fromArray(n.translation);if(n.rotation)node.quaternion.fromArray(n.rotation);if(n.scale)node.scale.fromArray(n.scale);return node;});
 const parents=new Map();json.nodes.forEach((n,i)=>n.children?.forEach(child=>{nodes[i].add(nodes[child]);parents.set(child,i);}));
 const root=new THREE.Group();json.scenes[json.scene||0].nodes.forEach(i=>root.add(nodes[i]));root.updateMatrixWorld(true);
 const oldMatrices=nodes.map(n=>n.matrixWorld.clone()),oldPositions=nodes.map(n=>n.position.clone());
 const bones=new Set(json.skins.flatMap(s=>s.joints));
 nodes.forEach((node,i)=>{
  if(!bones.has(i))return;
  const parent=parents.get(i);if(parent!==undefined)node.position.multiply(stretch(nodes[parent].name));
  if(node.name==='hips')node.position.y+=.232*.65;
  json.nodes[i].translation=node.position.toArray();
 });root.updateMatrixWorld(true);
 function accessor(index){const a=json.accessors[index],view=json.bufferViews[a.bufferView],width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type];const bytes={5121:1,5123:2,5125:4,5126:4}[a.componentType];return {a,width,offset:(view.byteOffset||0)+(a.byteOffset||0),stride:view.byteStride||width*bytes,bytes};}
 function values(index,i){const r=accessor(index);return Array.from({length:r.width},(_,j)=>{const o=r.offset+i*r.stride+j*r.bytes;return r.a.componentType===5126?bin.readFloatLE(o):r.bytes===1?bin.readUInt8(o):r.bytes===2?bin.readUInt16LE(o):bin.readUInt32LE(o);});}
 function write(index,i,data){const r=accessor(index);if(r.a.componentType!==5126)throw Error('Expected float accessor');data.forEach((v,j)=>bin.writeFloatLE(v,r.offset+i*r.stride+j*4));}
 const transformed=new Set();
 json.nodes.forEach(n=>{
  if(n.mesh===undefined||n.skin===undefined)return;const skin=json.skins[n.skin];
  const matrices=skin.joints.map(i=>nodes[i].matrixWorld.clone().multiply(new THREE.Matrix4().makeScale(...stretch(nodes[i].name).toArray())).multiply(oldMatrices[i].clone().invert()));
  const normals=matrices.map(m=>new THREE.Matrix3().getNormalMatrix(m));
  for(const primitive of json.meshes[n.mesh].primitives){const a=primitive.attributes;if(transformed.has(a.POSITION))continue;transformed.add(a.POSITION);
   const bounds=new THREE.Box3();
   for(let i=0;i<json.accessors[a.POSITION].count;i++){
    const position=new THREE.Vector3(...values(a.POSITION,i)),normal=new THREE.Vector3(...values(a.NORMAL,i)),joints=values(a.JOINTS_0,i),weights=values(a.WEIGHTS_0,i),p=new THREE.Vector3(),v=new THREE.Vector3();
    for(let j=0;j<4;j++)if(weights[j]){p.addScaledVector(position.clone().applyMatrix4(matrices[joints[j]]),weights[j]);v.addScaledVector(normal.clone().applyMatrix3(normals[joints[j]]),weights[j]);}
    write(a.POSITION,i,p.toArray());write(a.NORMAL,i,v.normalize().toArray());bounds.expandByPoint(p);
   }
   json.accessors[a.POSITION].min=bounds.min.toArray();json.accessors[a.POSITION].max=bounds.max.toArray();
  }
 });
 for(const skin of json.skins)skin.joints.forEach((node,i)=>write(skin.inverseBindMatrices,i,nodes[node].matrixWorld.clone().invert().toArray()));
 const changed=new Set();
 for(const animation of json.animations||[])for(const channel of animation.channels){
  if(channel.target.path!=='translation')continue;const index=animation.samplers[channel.sampler].output;if(changed.has(index))continue;changed.add(index);
  const i=channel.target.node,parent=parents.get(i),factor=parent===undefined?new THREE.Vector3(1,1,1):stretch(nodes[parent].name);
  for(let row=0;row<json.accessors[index].count;row++){const value=new THREE.Vector3(...values(index,row)).sub(oldPositions[i]).multiply(factor).add(nodes[i].position);write(index,row,value.toArray());}
 }
 json.asset.extras={...(json.asset.extras||{}),proportionRevision:'adult-v2',source:`${source}.glb`,license:'CC0-1.0'};
 let text=Buffer.from(JSON.stringify(json));text=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]);
 const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+text.length+bin.length,8);header.writeUInt32LE(text.length,12);header.writeUInt32LE(0x4e4f534a,16);
 const chunk=Buffer.alloc(8);chunk.writeUInt32LE(bin.length,0);chunk.writeUInt32LE(0x004e4942,4);
 fs.writeFileSync(`assets/models/${source}-adult.glb`,Buffer.concat([header,text,chunk,bin]));
 console.log(`${source}-adult.glb · skeleton and ${transformed.size} vertex buffers updated`);
}
