import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash}from'node:crypto';
import * as THREE from 'three';import {GLTFLoader}from'three/addons/loaders/GLTFLoader.js';
import {CITIZEN_ROSTER,citizenIdentity,citizenSignature,createCitizenFactory,addCitizenIdentityDetails,QUEST_IDENTITIES,AMBIENT_IDENTITIES,RIDER_IDENTITIES,ARCADE_IDENTITIES,EVENT_IDENTITIES,POLICE_IDENTITIES}from'../citizen-roster.mjs';
import {refitHumanProportions,canonicalBoneName}from'../neighborhood-models.mjs';
import {dressCitizenMaterials,compactCitizenMeshes}from'../citizen-details.mjs';
async function sources(){return Object.fromEntries(await Promise.all(['player','guard','official','vendor','resident','veteran'].map(async key=>{const path=key==='player'?'player-cozy':`npc-${key}`,b=fs.readFileSync(new URL(`../assets/models/${path}-adult.glb`,import.meta.url));return [key,await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')];})));}
test('every assigned street, event, traffic and shop NPC has a stable distinct identity with no hero geometry source',()=>{
 const ids=[...QUEST_IDENTITIES,...AMBIENT_IDENTITIES,...RIDER_IDENTITIES,...ARCADE_IDENTITIES,...EVENT_IDENTITIES,...POLICE_IDENTITIES];assert.equal(ids.length,38);assert.equal(new Set(ids).size,38);assert.equal(CITIZEN_ROSTER.length,38);
 assert.equal(new Set(CITIZEN_ROSTER.map(citizenSignature)).size,38);
 for(const p of CITIZEN_ROSTER)for(const key of ['body','face','hair','top','bottom','shoes','hat'])assert.notEqual(p[key],'player');
 assert.throws(()=>citizenIdentity('player'));assert.throws(()=>citizenIdentity('missing'));
});
test('all thirty assembled NPCs have distinct shapes, valid bind poses and working shared animations without touching sources',async()=>{
 const assets=await sources(),create=createCitizenFactory(assets),fingerprints=new Set();
 const sourceSkin=assets.guard.scene.getObjectByProperty('isSkinnedMesh',true),original=sourceSkin.geometry.attributes.position.array.slice();
 for(const p of CITIZEN_ROSTER){
  const {model,animations}=create(p.id),hash=createHash('sha256');model.traverse(n=>{if(n.isSkinnedMesh)hash.update(new Uint8Array(n.geometry.attributes.position.array.buffer));});fingerprints.add(hash.digest('hex'));
  refitHumanProportions(model,p.height);const bones={};model.traverse(n=>{if(n.isBone)bones[canonicalBoneName(n.name)]=n;});dressCitizenMaterials(model);compactCitizenMeshes(model);addCitizenIdentityDetails(model,bones,p);
  assert.equal(model.userData.citizenIdentity,p.id);assert.ok(bones.head&&bones['upperArm.L']);
  const mixer=new THREE.AnimationMixer(model);
  for(const name of ['idle','walk','run','wave']){
   const source=animations.find(c=>c.name.toLowerCase()===name);assert.ok(source,`${p.id}: ${name}`);const clip=source.clone();clip.tracks=clip.tracks.filter(t=>!/^head\.scale$/i.test(t.name));mixer.clipAction(clip).play();mixer.setTime(clip.duration*.38);model.updateMatrixWorld(true);
   model.traverse(n=>{if(n.isSkinnedMesh){n.skeleton.update();n.computeBoundingBox();assert.ok(n.skeleton.boneInverses.every(m=>m.elements.every(Number.isFinite)));}});
   const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());assert.ok(size.toArray().every(v=>Number.isFinite(v)&&v<3),`${p.id}/${name}: finite skin`);assert.ok(size.y>1.1);mixer.stopAllAction();
  }
 }
 assert.equal(fingerprints.size,CITIZEN_ROSTER.length,'identities change actual geometry, not just colors');assert.deepEqual(sourceSkin.geometry.attributes.position.array,original);
 const first=create('student-mai').model,second=create('student-mai').model;
 assert.notEqual(first.getObjectByName('head'),second.getObjectByName('head'));
 first.getObjectByName('head').rotation.y=.7;assert.notEqual(first.getObjectByName('head').rotation.y,second.getObjectByName('head').rotation.y);
});
