import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as THREE from 'three';import {GLTFLoader}from'three/addons/loaders/GLTFLoader.js';
import {refitHumanProportions,canonicalBoneName}from'../neighborhood-models.mjs';
import {addCitizenHelmet,addCitizenSatchel,dressCitizenMaterials,compactCitizenMeshes}from'../citizen-details.mjs';
test('all six adult GLBs load, bind finite skins and play their existing animations',async()=>{
 for(const name of ['player-cozy','npc-guard','npc-official','npc-vendor','npc-resident','npc-veteran']){
  const bytes=fs.readFileSync(new URL(`../assets/models/${name}-adult.glb`,import.meta.url));
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');refitHumanProportions(gltf.scene,1.64);
  const bones=new Map();gltf.scene.traverse(node=>{if(node.isBone)bones.set(canonicalBoneName(node.name),node);});
  dressCitizenMaterials(gltf.scene);
  const oldBounds=new THREE.Box3().setFromObject(gltf.scene),saved=compactCitizenMeshes(gltf.scene),newBounds=new THREE.Box3().setFromObject(gltf.scene);
  assert.ok(saved>=7,`${name}: shared skin surfaces should reduce submissions`);
  assert.ok(oldBounds.min.distanceTo(newBounds.min)<.001&&oldBounds.max.distanceTo(newBounds.max)<.001,`${name}: skin merge preserves rest bounds`);
  addCitizenSatchel(gltf.scene,Object.fromEntries(bones));
  for(const key of ['hips','head','upperArm.L','lowerArm.R','upperLeg.L','lowerLeg.R'])assert.ok(bones.has(key),`${name}: ${key}`);
  const helmet=addCitizenHelmet(gltf.scene,Object.fromEntries(bones));gltf.scene.updateMatrixWorld(true);
  assert.equal(helmet.parent,bones.get('head'));
  const helmetSize=new THREE.Box3().setFromObject(helmet).getSize(new THREE.Vector3());
  assert.ok(helmetSize.x>.25&&helmetSize.x<.65,`${name}: helmet fitted in world metres`);
  const mixer=new THREE.AnimationMixer(gltf.scene);
  for(const clip of gltf.animations){assert.ok(clip.validate());const action=mixer.clipAction(clip);action.play();mixer.setTime(clip.duration*.43);gltf.scene.updateMatrixWorld(true);
   gltf.scene.traverse(node=>{if(!node.isSkinnedMesh)return;node.skeleton.update();node.computeBoundingBox();for(const inverse of node.skeleton.boneInverses)assert.ok(inverse.elements.every(Number.isFinite));});
   const size=new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3());assert.ok(size.toArray().every(v=>Number.isFinite(v)&&v<3),`${name}/${clip.name}: distorted skin`);mixer.stopAllAction();
  }
 }
});
