import * as THREE from 'three';
import {createPottedMarketTree} from './market-models.mjs';
import {createParkBench} from './neighborhood-models.mjs';
export function buildWestPeachGarden(api){
 const root=new THREE.Group();root.name='PhuThuongPeachGardenWest';api.world.add(root);
 const green=new THREE.MeshStandardMaterial({color:0x647349,roughness:1}),soil=new THREE.MeshStandardMaterial({color:0x65523d,roughness:1});
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(19,51).rotateX(-Math.PI/2),green);floor.position.set(-200.5,.095,-38.5);root.add(floor);
 for(const x of [-202,-194])for(const z of [-20,-31,-44,-57]){
  const mound=new THREE.Mesh(new THREE.CylinderGeometry(.72,.98,.2,12),soil);mound.position.set(x,.19,z);root.add(mound);
  const peach=createPottedMarketTree(false);peach.remove(peach.children[0],peach.children[1]);peach.scale.setScalar(1.6);peach.position.set(x,.29-.54*1.6,z);peach.userData.modelFamily='orchard-tree';root.add(peach);api.box(x,z,1.5,1.5);
 }
 const bench=createParkBench(3,api.materials.wood);bench.position.set(-196,.09,-37);bench.rotation.y=Math.PI/2;root.add(bench);api.box(-196,-37,1.1,3.2);
 if(api.label){const sign=api.label('VƯỜN ĐÀO PHÚ THƯỢNG','#e3bbbf');sign.position.set(-209,2.5,-37);sign.scale.set(5.5,.7,1);sign.rotation.y=-Math.PI/2;root.add(sign);}
 return {root};
}
