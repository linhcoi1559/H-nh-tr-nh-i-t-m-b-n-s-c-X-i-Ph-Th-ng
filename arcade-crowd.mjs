import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {canonicalBoneName,createStool,refitHumanProportions} from './neighborhood-models.mjs';
import {createCitizenFactory,addCitizenIdentityDetails,ARCADE_IDENTITIES} from './citizen-roster.mjs';
import {dressCitizenMaterials,compactCitizenMeshes} from './citizen-details.mjs';

// Reuse the game's CC0 citizen models. Animate only when the player is near the shop.
export function createArcadeCrowd(root,tables,collider,options={}){
  const actors=[],axis=new THREE.Vector3(1,0,0),q=new THREE.Quaternion();
  const placements=options.placements||[
    {table:0,angle:-Math.PI/2,model:0},
    {table:1,angle:0,model:1},{table:1,angle:Math.PI/2,model:0},
    {table:2,angle:Math.PI,model:1}
  ];
  // Seats are outside table colliders and leave the central entrance aisle clear.
  const loader=new GLTFLoader();
  Promise.all(['guard','official','vendor','resident','veteran'].map(async key=>[key,await loader.loadAsync(`assets/models/npc-${key}-adult.glb`)])).then(entries=>{
    const createCitizen=createCitizenFactory(Object.fromEntries(entries));
    placements.forEach((p,index)=>{
      const table=tables[p.table],group=new THREE.Group(),citizen=createCitizen((options.identities||ARCADE_IDENTITIES)[index]),model=citizen.model;
      refitHumanProportions(model,citizen.profile.height);dressCitizenMaterials(model);compactCitizenMeshes(model);root.add(group);group.add(model);
      const distance=1.34;group.position.set(table.x+Math.sin(p.angle)*distance,0,table.z+Math.cos(p.angle)*distance);group.rotation.y=p.angle+Math.PI;
      const bones={};model.traverse(n=>{if(n.isBone)bones[canonicalBoneName(n.name)]={node:n,rest:n.quaternion.clone()};if(n.isMesh){n.castShadow=false;n.receiveShadow=false;}});
      addCitizenIdentityDetails(model,Object.fromEntries(Object.entries(bones).map(([name,b])=>[name,b.node])),citizen.profile);
      const pose=(name,angle)=>{const b=bones[name];if(b)b.node.quaternion.copy(b.rest).multiply(q.setFromAxisAngle(axis,angle));};
      pose('upperLeg.L',1.42);pose('upperLeg.R',1.42);pose('lowerLeg.L',-1.5);pose('lowerLeg.R',-1.5);
      pose('upperArm.L',.85);pose('upperArm.R',.85);pose('lowerArm.L',-.8);pose('lowerArm.R',-.8);
      model.updateMatrixWorld(true);
      const hip=bones.hips?.node;if(hip){const point=hip.getWorldPosition(new THREE.Vector3());model.position.y+=.57-point.y;}
      const stool=createStool(.54,.52,.54,new THREE.MeshStandardMaterial({color:0x573e2c,roughness:.9}));stool.position.set(group.position.x,.26,group.position.z);root.add(stool);collider(group.position.x,group.position.z,.31);
      actors.push({bones,pose,index});
    });
  }).catch(error=>console.warn('Không tải được khách trong tiệm:',error.message));
  return {update(time){actors.forEach(({pose,index})=>{const phase=time*.9+index*1.7;pose('spine',.04+Math.sin(phase)*.025);pose('head',Math.sin(phase*.7)*.045);pose('upperArm.R',.85+Math.max(0,Math.sin(phase*.6))*.18);});}};
}
export function createTeaChessCrowd(root,tables,collider){return createArcadeCrowd(root,tables,collider,{identities:['chess-lam','chess-dung','chess-son'],placements:[{table:0,angle:Math.PI/2},{table:0,angle:-Math.PI/2},{table:1,angle:Math.PI/2}]});}
