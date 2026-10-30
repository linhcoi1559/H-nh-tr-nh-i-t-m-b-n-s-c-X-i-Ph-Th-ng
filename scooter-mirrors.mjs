import * as THREE from 'three';

function outline(w,h,r){
 const s=new THREE.Shape(),x=-w/2,y=-h/2;
 s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
 s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
 s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
 s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
}
const shellGeometry=new THREE.ExtrudeGeometry(outline(.174,.112,.032),{depth:.018,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.004,bevelThickness:.004,curveSegments:6});
const glassGeometry=new THREE.ShapeGeometry(outline(.153,.091,.025),6);
const shellMaterial=new THREE.MeshStandardMaterial({color:0x20252a,roughness:.62,metalness:.15});
const glassMaterial=new THREE.MeshStandardMaterial({color:0x81969e,roughness:.22,metalness:.65,envMapIntensity:.38});

// Bike local +X points forward. Glass faces -X, toward the rider.
export function createScooterMirror(side,stemMaterial){
 const root=new THREE.Group();root.name=side<0?'mirror-left':'mirror-right';
 const path=new THREE.CatmullRomCurve3([
  new THREE.Vector3(0,1.115,side*.255),
  new THREE.Vector3(.06,1.24,side*.285),
  new THREE.Vector3(.18,1.335,side*.325),
  new THREE.Vector3(.23,1.365,side*.34)
 ]);
 root.add(new THREE.Mesh(new THREE.TubeGeometry(path,12,.008,6,false),stemMaterial));
 const head=new THREE.Group();head.position.set(.23,1.40,side*.34);head.rotation.set(0,-Math.PI/2+side*.1,side*.08);
 const shell=new THREE.Mesh(shellGeometry,shellMaterial);head.add(shell);
 const glass=new THREE.Mesh(glassGeometry,glassMaterial);glass.position.z=.023;head.add(glass);
 root.add(head);return root;
}
