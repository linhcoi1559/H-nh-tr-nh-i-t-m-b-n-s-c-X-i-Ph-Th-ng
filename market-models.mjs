import * as THREE from 'three';

const leafGeometry = new THREE.SphereGeometry(1, 7, 4);
const petalGeometry = new THREE.SphereGeometry(1, 8, 5);
const stemGeometry = new THREE.CylinderGeometry(1, 1, 1, 7);
const transform = new THREE.Object3D();
function instance(geometry, material, poses) {
  const mesh = new THREE.InstancedMesh(geometry, material, poses.length);
  poses.forEach((p, i) => {
    transform.position.set(...p.position); transform.rotation.set(...(p.rotation || [0,0,0]));
    transform.scale.set(...p.scale); transform.updateMatrix(); mesh.setMatrixAt(i, transform.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
  mesh.receiveShadow = true;
  return mesh;
}
function segment(a, b, radius) {
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),axis=end.clone().sub(start);
  const rotation=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),axis.clone().normalize()));
  return {position:start.add(end).multiplyScalar(.5).toArray(),scale:[radius,axis.length(),radius],rotation:[rotation.x,rotation.y,rotation.z]};
}
const clay = new THREE.MeshStandardMaterial({color:0x96705b,roughness:.92});
const leaf = new THREE.MeshStandardMaterial({color:0x496c3e,roughness:.86});
const twig = new THREE.MeshStandardMaterial({color:0x675443,roughness:.93});
const blossom = new THREE.MeshStandardMaterial({color:0xd59aa9,roughness:.86});
const pollen = new THREE.MeshStandardMaterial({color:0xc5ab6b,roughness:.9});
const fruit = new THREE.MeshStandardMaterial({color:0xcba14b,roughness:.75});
const soilMaterial = new THREE.MeshStandardMaterial({color:0x494137,roughness:1});

export function createPottedMarketTree(kumquat=false) {
  const group=new THREE.Group();group.name=kumquat?'Quất lá và quả':'Đào cành và hoa';
  // A hollow, curved ceramic profile instead of a solid cylinder with a gold rim.
  const profile=[[.23,0],[.28,.04],[.34,.18],[.43,.52],[.45,.57],[.44,.62],[.40,.62],[.39,.55],[.31,.15]];
  const pot=new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),24),clay);
  pot.castShadow=true;group.add(pot);
  const soil=new THREE.Mesh(new THREE.CircleGeometry(.39,20).rotateX(-Math.PI/2),soilMaterial);soil.position.y=.55;group.add(soil);
  const branches=[segment([0,.54,0],[.08,1.44,.02],.055)],leaves=[],petals=[],centers=[];
  for(let i=0;i<9;i++){
    const angle=i*2.39996,r=.40+(i%3)*.12,h=1.35+(i%4)*.19;
    const end=[Math.cos(angle)*r,h,Math.sin(angle)*r];
    branches.push(segment([.04,.96+(i%3)*.13,0],end,.017));
    for(let j=0;j<6;j++){
      const t=.33+j*.125,x=end[0]*t,y=1.06+(h-1.06)*t,z=end[2]*t;
      if(kumquat){
        for(let k=0;k<3;k++)leaves.push({position:[x+Math.cos(angle+k*2.1)*.07,y+k*.035,z+Math.sin(angle+k*2.1)*.07],scale:[.045,.015,.12],rotation:[.35,angle+k*2.1,.3]});
        if(j%2===0)centers.push({position:[x,y-.055,z],scale:[.046,.052,.046]});
      }else{
        centers.push({position:[x,y,z],scale:[.014,.015,.014]});
        for(let k=0;k<5;k++){const a=k*Math.PI*2/5;petals.push({position:[x+Math.cos(a)*.029,y+.006,z+Math.sin(a)*.029],scale:[.022,.009,.034],rotation:[.25,a,-.15]});}
      }
    }
  }
  const wood=instance(stemGeometry,twig,branches);wood.castShadow=true;group.add(wood);
  if(leaves.length)group.add(instance(leafGeometry,leaf,leaves));
  if(petals.length)group.add(instance(petalGeometry,blossom,petals));
  group.add(instance(petalGeometry,kumquat?fruit:pollen,centers));
  return group;
}

export function createMarketBouquet(palette, vesselMaterial, tall=false, paperMaterial=null){
  const group=new THREE.Group(),h=tall?.48:.38;
  const profile=[[.12,0],[.14,.025],[.19,h-.03],[.20,h],[.18,h],[.13,.04]];
  group.add(new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),16),vesselMaterial));
  if(paperMaterial){const wrap=new THREE.Mesh(new THREE.ConeGeometry(.25,.32,12,1,true),paperMaterial);wrap.rotation.x=Math.PI;wrap.position.y=h+.02;group.add(wrap);}
  const stems=[],leaves=[],petals=[],centers=[];
  for(let i=0;i<7;i++){
    const a=i*2.39996,r=i===0?0:.14,x=Math.cos(a)*r,z=Math.sin(a)*r,y=h+.19+(i%3)*.055;
    stems.push(segment([x*.4,h*.4,z*.4],[x,y,z],.007));
    leaves.push({position:[x+.045,h+.07,z],scale:[.035,.012,.09],rotation:[.45,a,.3]});
    centers.push({position:[x,y,z],scale:[.025,.014,.025]});
    for(let k=0;k<7;k++){const p=k*Math.PI*2/7;petals.push({position:[x+Math.cos(p)*.04,y,z+Math.sin(p)*.04],scale:[.025,.012,.053],rotation:[.12,p,0]});}
  }
  group.add(instance(stemGeometry,leaf,stems),instance(leafGeometry,leaf,leaves),instance(petalGeometry,palette.mainMat,petals),instance(petalGeometry,palette.centerMat,centers));
  return group;
}

export function createMarketCanopy(width,depth,material){
  const geometry=new THREE.PlaneGeometry(width,depth,16,8);geometry.rotateX(-Math.PI/2);
  const p=geometry.attributes.position;
  for(let i=0;i<p.count;i++)p.setY(i,-.10*Math.cos(p.getX(i)/width*Math.PI)+.035*Math.sin(p.getX(i)*18)-p.getZ(i)*.12);
  geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;return mesh;
}
