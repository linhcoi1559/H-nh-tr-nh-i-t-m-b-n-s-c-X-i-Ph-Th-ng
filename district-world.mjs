import * as THREE from 'three';
import {DISTRICT_ROADS,DISTRICT_PLACES,nearestRoad,sampleRoad,districtRoadHeight,inEastPublicArea} from './district-routes.mjs';
import {buildingEnvelope,roofGeometry,windowFrameGeometry,foliageGeometry,archedWindowGeometry,shopCanopyGeometry} from './neighborhood-models.mjs';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {detailVisibility} from './render-budget.mjs';
import {footprintBounds,canPlaceDistrictBuilding,curbClearOfBend} from './district-layout.mjs';

export function buildDistrictExtension(api){
  const root=new THREE.Group();root.name='PhuGiaPhuXaExtension';api.world.add(root);
  const pavement=api.materials.concrete(),wall=api.materials.plaster(0xc3baa2),brick=api.materials.brick();
  const trim=new THREE.MeshStandardMaterial({color:0x646e67,roughness:.76,metalness:.14}),glass=new THREE.MeshStandardMaterial({color:0x293b3e,roughness:.12,metalness:.55,envMapIntensity:1.35,side:THREE.DoubleSide}),roof=api.materials.roof?.()||new THREE.MeshStandardMaterial({color:0x774d3a,roughness:.82,side:THREE.DoubleSide});
  glass.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vGlassWorld;\nvarying vec2 vGlassUv;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvec4 gWp=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\ngWp=instanceMatrix*gWp;\n#endif\nvGlassWorld=(modelMatrix*gWp).xyz;\nvGlassUv=position.xy;');
    shader.fragmentShader='varying vec3 vGlassWorld;\nvarying vec2 vGlassUv;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float roomSeed=fract(sin(floor(vGlassWorld.x*0.35)*19.7+floor(vGlassWorld.z*0.35)*43.1+floor(vGlassWorld.y*0.33)*11.3)*43758.5453);
      float blinds=step(0.18,sin(vGlassUv.y*28.0+roomSeed*6.0));
      float curtain=smoothstep(0.18,0.48,abs(vGlassUv.x));
      float depthShade=0.55+0.45*smoothstep(-0.45,0.45,vGlassUv.y);
      vec3 warmRoom=mix(vec3(0.14,0.22,0.26),vec3(0.92,0.68,0.36),step(0.42,roomSeed)*0.65);
      vec3 interior=warmRoom*depthShade*mix(0.75,1.0,blinds)*mix(1.0,0.68,curtain);
      float mullion=smoothstep(0.032,0.015,abs(vGlassUv.x))+smoothstep(0.032,0.015,abs(vGlassUv.y-0.05));
      diffuseColor.rgb=mix(interior,vec3(0.82,0.80,0.74),clamp(mullion,0.0,1.0)*0.65);`);
  };
  glass.customProgramCacheKey=()=>'district-parallax-window-v2';
  const paint=new THREE.MeshStandardMaterial({color:0xe8e3d4,roughness:.88,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-5});
  const foliage=new THREE.MeshStandardMaterial({color:0x536f45,roughness:.78,emissive:0x132010,emissiveIntensity:.35,side:THREE.DoubleSide});
  const shopSigns=new THREE.MeshStandardMaterial({roughness:1,side:THREE.DoubleSide});
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=64;const c=canvas.getContext('2d');
    ['TẠP HÓA','HIỆU THUỐC','TIỆM MAY','QUÁN NƯỚC'].forEach((name,i)=>{c.fillStyle=['#d4c6a5','#b7c9bb','#d1bdb2','#b5c5cc'][i];c.fillRect(i*256,0,256,64);c.strokeStyle='#47574b';c.lineWidth=3;c.strokeRect(i*256+3,3,250,58);c.fillStyle='#293b31';c.textAlign='center';c.font='bold 23px system-ui';c.fillText(name,i*256+128,28);c.font='13px system-ui';c.fillText('PHỐ PHÚ THƯỢNG',i*256+128,49);});
    shopSigns.map=new THREE.CanvasTexture(canvas);shopSigns.map.colorSpace=THREE.SRGBColorSpace;
  }
  const asphalt=(api.materials.asphalt?.()||api.asphalt).clone();
  if(asphalt.map){asphalt.map=asphalt.map.clone();asphalt.map.repeat.set(1,1);}
  asphalt.color.setHex(0xb3b6b2);asphalt.roughness=.92;
  const chunkSize=96;
  const chunks=new Map(),boxGeo=new THREE.BoxGeometry(1,1,1),matrix=new THREE.Matrix4(),dummy=new THREE.Object3D();
  const batches=new Map();
  // Background only: vegetated dyke bank and water beyond the northern road.
  // Kept outside playable corridors; no reflective render pass or extra lights.
  const bankMat=new THREE.MeshStandardMaterial({color:0x647a43,roughness:1});
  const waterMat=new THREE.MeshStandardMaterial({color:0x4b777a,roughness:.62,metalness:.04});
  const bank=new THREE.Mesh(new THREE.PlaneGeometry(560,34).rotateX(-Math.PI/2),bankMat);bank.position.set(10,.02,-265);root.add(bank);
  const river=new THREE.Mesh(new THREE.PlaneGeometry(650,100).rotateX(-Math.PI/2),waterMat);river.position.set(10,-.025,-330);root.add(river);
  let frontageAnchor=null;
  const buildingFootprints=[],frontages=[];
  function building(mat,x,y,z,w,h,d,rotation=0,terraced=false){
    const bounds=footprintBounds(x,z,w,d,rotation);
    if(!canPlaceDistrictBuilding(bounds))return false;
    if(terraced){
      const lower=Math.min(3.15,h*.48);
      instance(mat,x,lower/2,z,w,lower,d,rotation,'building');
      instance(mat,x,lower+(h-lower)/2,z,w-1.4,h-lower,d-1.2,rotation,'building');
      instance(pavement,x,lower+.07,z,w+.12,.14,d+.12,rotation);
    }else instance(mat,x,y,z,w,h,d,rotation,'building');
    api.box(x,z,bounds.width,bounds.depth);buildingFootprints.push(bounds);return true;
  }
  function instance(mat,x,y,z,w,h,d,rotation=0,role='detail'){
    const anchor=frontageAnchor&&role!=='building'?frontageAnchor:{x,z};
    const key=`${Math.floor(anchor.x/chunkSize)},${Math.floor(anchor.z/chunkSize)}`;
    if(!chunks.has(key)){const group=new THREE.Group(),details=new THREE.Group();group.name=`district-${key}`;details.name=`district-details-${key}`;root.add(group,details);chunks.set(key,{group,details,x:Math.floor(anchor.x/chunkSize)*chunkSize+chunkSize/2,z:Math.floor(anchor.z/chunkSize)*chunkSize+chunkSize/2});}
    const batchKey=key+':'+mat.uuid+':'+role;if(!batches.has(batchKey))batches.set(batchKey,{mat,role,group:chunks.get(key).group,items:[]});
    batches.get(batchKey).items.push([x,y,z,w,h,d,rotation]);
  }
  function facadeOpening(x,y,z,w,h,frameW,frameH,angle,arched=true,depth=.15){
    // Frame and glass must not share a plane, including the back-facing row.
    instance(glass,x,y,z,w,h,.08,angle,arched?'arch-pane':'window');
    instance(pavement,x+Math.sin(angle)*.06,y,z+Math.cos(angle)*.06,frameW,frameH,depth,angle,arched?'arch-frame':'frame');
  }
  function strip(points,width,y,mat){
    const positions=[],indices=[];
    points.forEach(([x,z],i)=>{
      const before=points[Math.max(0,i-1)],after=points[Math.min(points.length-1,i+1)],dx=after[0]-before[0],dz=after[1]-before[1],length=Math.hypot(dx,dz);
      const nx=-dz/length*width/2,nz=dx/length*width/2;positions.push(x+nx,y,z+nz,x-nx,y,z-nz);
      if(i)indices.push(i*2-2,i*2,i*2-1,i*2-1,i*2,i*2+1);
    });
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const uvs=[];for(let i=0;i<positions.length;i+=3)uvs.push(positions[i]/3,positions[i+2]/3);geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    const mesh=new THREE.Mesh(geometry,mat);mesh.receiveShadow=true;root.add(mesh);
  }
  DISTRICT_ROADS.forEach((road,r)=>{
    const roadY=districtRoadHeight(r),roadMaterial=asphalt.clone();roadMaterial.polygonOffset=true;roadMaterial.polygonOffsetFactor=-1;roadMaterial.polygonOffsetUnits=-2-r;
    strip(road.points,road.width+7,.06,pavement);strip(road.points,road.width,roadY,roadMaterial);
    const samples=sampleRoad(road);
    samples.forEach((p,i)=>{
      const angle=Math.atan2(p.dx,p.dz),others=DISTRICT_ROADS.filter(x=>x!==road);
      if(nearestRoad(p.x,p.z,others).distance<17)return;
      // Low-cost centre marks, no coplanar duplicates at junctions.
      instance(paint,p.x,roadY+.012,p.z,.16,.015,3,angle);
      for(const side of [-1,1]){
        const nx=-p.dz*side,nz=p.dx*side,distance=road.width/2+(road.id==='market-link'?13.5:road.id==='riverside-loop'?11:9),facadeAngle=Math.atan2(-p.dz,p.dx);
        const x=p.x+nx*distance,z=p.z+nz*distance;
        if((z>-96&&z<65&&x>-190&&x<185)||nearestRoad(x,z,others).distance<15||inEastPublicArea(x,z,12))continue;
        frontageAnchor={x,z};
        const height=7.5+(i+r)%4*2.2,width=9,depth=7;
        const terraced=(i+r)%3!==0;
        if(!building((i+r)%3?wall:brick,x,height/2,z,width,height,depth,facadeAngle,terraced)){frontageAnchor=null;continue;}
        instance(roof,x,height+.65,z,terraced?8.1:9.5,1.3,terraced?6.3:7.5,facadeAngle,i%2?'roof':'gable');
        const frontX=x-nx*3.57,frontZ=z-nz*3.57;
        const facingAngle=facadeAngle+(side===1?Math.PI:0);
        frontages.push({x:frontX,z:frontZ,angle:facingAngle,height,index:frontages.length,shopKind:(i+r)%4});
        const arched=(i+r)%3!==0;
        for(let floor=0;floor<Math.floor(height/3);floor++)for(const offset of [-2.5,0,2.5]){
          // The centre bay on the ground floor is the door, not a second window.
          if(floor===0&&offset===0)continue;
          const retreat=terraced&&floor>0?.6:0;
          facadeOpening(frontX+p.dx*offset+nx*retreat,1.7+floor*3,frontZ+p.dz*offset+nz*retreat,1.35,1.5,1.5,1.65,facingAngle,arched);
          instance(trim,frontX+p.dx*offset+nx*retreat,1+floor*3,frontZ+p.dz*offset+nz*retreat,1.65,.09,.26,facadeAngle);
        }
        // Recessed shop shutters, awnings and balcony rails share the same batches.
        instance(shopSigns,frontX-nx*.08,2.85,frontZ-nz*.08,3.6,.85,.08,facadeAngle+(side===1?Math.PI:0),'shop-sign-'+((i+r)%4));
        facadeOpening(frontX,.99,frontZ,2.7,1.95,2.9,2.1,facingAngle,true,.18);
        instance(roof,frontX-nx*.55,2.45,frontZ-nz*.55,4.5,1,1.4,facadeAngle,'canopy');
        instance(pavement,frontX-nx*.45,3.2,frontZ-nz*.45,5,.16,1.1,facadeAngle);
        instance(trim,frontX-nx*.9,3.8,frontZ-nz*.9,5,.08,.08,facadeAngle);
        for(const offset of [-2,-1,0,1,2])instance(trim,frontX-nx*.9+p.dx*offset,3.5,frontZ-nz*.9+p.dz*offset,.055,.65,.055);
        instance(trim,frontX+p.dx*3.8,height/2,frontZ+p.dz*3.8,.09,height,.09,facadeAngle,'pipe');
        if(i%2===0)instance(trim,x,height+1.15,z,1.2,1.6,1.2,facadeAngle,'tank');
        for(const edge of [-1,1])for(let floor=1;floor<Math.floor(height/3);floor++){
          const sx=x+p.dx*edge*(terraced?3.86:4.56),sz=z+p.dz*edge*(terraced?3.86:4.56),sideAngle=facadeAngle+edge*Math.PI/2;
          for(const slot of [-1.6,1.6]){
            facadeOpening(sx+nx*slot,1.7+floor*3,sz+nz*slot,1.2,1.45,1.36,1.61,sideAngle,true,.1);
          }
        }
        if(i%2===0){
          const px=frontX-nx*.6+p.dx*3.3,pz=frontZ-nz*.6+p.dz*3.3;
          instance(roof,px,.34,pz,.62,.55,.62,facadeAngle,'pot');
          instance(foliage,px,.64,pz,1,1,1,facadeAngle,'foliage');
          // Drain slots sit in the pavement rather than competing with road paint.
          const gx=p.x+nx*(road.width/2+.6),gz=p.z+nz*(road.width/2+.6);
          for(let slot=0;slot<5;slot++)instance(trim,gx+p.dx*(slot-2)*.12,.08,gz+p.dz*(slot-2)*.12,.06,.025,.48,facadeAngle);
        }
        if(i%3===0){
          const tx=p.x+nx*(road.width/2+2),tz=p.z+nz*(road.width/2+2);
          instance(trim,tx,2.2,tz,.18,4.4,.18);api.box(tx,tz,.3,.3);
          instance(roof,tx,4.4,tz,.65,.2,.65);
        }
        frontageAnchor=null;
      }
    });
  });
  // Curbs are geometry along each street, never baked across repeated asphalt UVs.
  for(const road of DISTRICT_ROADS)for(const p of sampleRoad(road,3)){
    // Keep short curb blocks away from a bend's joined asphalt polygon. Their
    // untrimmed ends previously projected across the inside of 90-degree turns.
    if(!curbClearOfBend(road,p))continue;
    const others=DISTRICT_ROADS.filter(r=>r!==road);if(nearestRoad(p.x,p.z,others).distance<15)continue;
    for(const side of [-1,1]){
      const nx=-p.dz*side,nz=p.dx*side,x=p.x+nx*(road.width/2+.18),z=p.z+nz*(road.width/2+.18);
      if(inEastPublicArea(x,z,1))continue;
      instance(pavement,x,.12,z,.22,.12,2.85,Math.atan2(p.dx,p.dz));
    }
  }
  // Dense outer banks close views behind the playable corridors with physical walls.
  for(const road of DISTRICT_ROADS)for(const p of sampleRoad(road,18))for(const side of [-1,1]){
    const nx=-p.dz*side,nz=p.dx*side,offset=road.id==='market-link'?32:17,x=p.x+nx*(road.width/2+offset),z=p.z+nz*(road.width/2+offset);
    if((z>-96&&z<65&&x>-190&&x<185)||nearestRoad(x,z).distance<road.width/2+10||inEastPublicArea(x,z,15))continue;
    building(wall,x,5,z,17,10,12,Math.atan2(p.dx,p.dz));
  }
  for(const road of DISTRICT_ROADS)for(const end of [0,road.points.length-1]){
    const [x,z]=road.points[end];if(z>=-55||nearestRoad(x,z,DISTRICT_ROADS.filter(r=>r!==road)).distance<18)continue;
    const neighbour=road.points[end===0?1:end-1],length=Math.hypot(x-neighbour[0],z-neighbour[1]),dx=(x-neighbour[0])/length,dz=(z-neighbour[1])/length;
    const bx=x+dx*21,bz=z+dz*21;building(wall,bx,6,bz,32,12,10,Math.atan2(-dz,dx));
  }
  const envelope=buildingEnvelope(1,1,1,false,{columns:3,rows:4}),hip=roofGeometry(1,1,1),gable=roofGeometry(1,1,1,'gable'),archPane=archedWindowGeometry(),archFrame=archedWindowGeometry(true),canopy=shopCanopyGeometry(),frameGeo=windowFrameGeometry(),pane=new THREE.PlaneGeometry(1,1),cylinder=new THREE.CylinderGeometry(.5,.5,1,12),leaves=foliageGeometry(.5),pot=new THREE.LatheGeometry([[.32,-.5],[.38,-.4],[.5,.42],[.48,.5],[.42,.5],[.40,.35]].map(([x,y])=>new THREE.Vector2(x,y)),12);
  const uv=envelope.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*9,uv.getY(i)*12);
  const signGeometries=Array.from({length:4},(_,i)=>{const g=new THREE.PlaneGeometry(1,1);const uv=g.attributes.uv;for(let n=0;n<uv.count;n++)uv.setX(n,(uv.getX(n)+i)/4);return g;});
  const staticDetails=new Map();let drawCount=0;
  for(const {mat,role,group,items}of batches.values()){
    const geometry=role.startsWith('shop-sign-')?signGeometries[Number(role.at(-1))]:role==='building'?envelope:role==='roof'?hip:role==='gable'?gable:role==='arch-pane'?archPane:role==='arch-frame'?archFrame:role==='canopy'?canopy:role==='frame'?frameGeo:role==='window'?pane:role==='pot'?pot:role==='foliage'?leaves:['pipe','tank'].includes(role)?cylinder:boxGeo;
    if(role!=='building'){
      const chunk=[...chunks.values()].find(chunk=>chunk.group===group),structural=['roof','gable'].includes(role),detailGroup=structural?group:chunk.details;
      const key=detailGroup.uuid+mat.uuid;if(!staticDetails.has(key))staticDetails.set(key,{mat,group:detailGroup,family:structural?'roof':null,parts:[]});
      const batch=staticDetails.get(key);
      for(const [x,y,z,w,h,d,rotation]of items){dummy.position.set(x,y,z);dummy.rotation.set(0,rotation,0);dummy.scale.set(w,h,d);dummy.updateMatrix();const part=geometry.index?geometry.toNonIndexed():geometry.clone();part.applyMatrix4(dummy.matrix);batch.parts.push(part);}
      continue;
    }
    const mesh=new THREE.InstancedMesh(geometry,mat,items.length);mesh.userData.modelFamily=role==='gable'?'roof':role;items.forEach(([x,y,z,w,h,d,rotation],i)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,rotation,0);dummy.scale.set(w,h,d);dummy.updateMatrix();matrix.copy(dummy.matrix);mesh.setMatrixAt(i,matrix);});mesh.computeBoundingSphere();mesh.receiveShadow=true;mesh.matrixAutoUpdate=false;group.add(mesh);
    drawCount++;
  }
  for(const {mat,group,parts,family}of staticDetails.values()){const geometry=mergeGeometries(parts);parts.forEach(part=>part.dispose());const mesh=new THREE.Mesh(geometry,mat);if(family)mesh.userData.modelFamily=family;mesh.receiveShadow=true;mesh.matrixAutoUpdate=false;group.add(mesh);drawCount++;}
  DISTRICT_PLACES.forEach(place=>{const n=nearestRoad(place.x,place.z),label=api.label(place.name,'#d7c390');label.position.set(place.x+n.width/2+2,3.2,place.z);label.scale.set(5.3,.7,1);root.add(label);});
  let lastX=Infinity,lastZ=Infinity;
  return {root,buildingFootprints,frontages,chunkCount:chunks.size,drawBatches:drawCount,update(x,z){if(Math.hypot(x-lastX,z-lastZ)<4)return;lastX=x;lastZ=z;for(const chunk of chunks.values())chunk.details.visible=detailVisibility(chunk.details.visible,Math.hypot(x-chunk.x,z-chunk.z));}};
}
