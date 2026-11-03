import * as THREE from 'three';
import {nearestRoad,inEastPublicArea} from './district-routes.mjs';
import {TRAFFIC_STREETS} from './traffic-routes.mjs';
const installed=new WeakSet();

// Project all three PBR maps in metres after instance/world transforms. A
// 15-metre building must not stretch a unit cube's single tile across a facade.
export function installWorldSurface(material){
 const scale=material.userData.worldSurface?.meters;if(!scale||installed.has(material))return false;
 installed.add(material);
 material.onBeforeCompile=shader=>{
  shader.uniforms.worldTileMeters={value:scale};
  shader.vertexShader='uniform float worldTileMeters;\nvarying vec3 surfaceWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
   vec4 surfacePosition=vec4(transformed,1.0);
   #ifdef USE_INSTANCING
    surfacePosition=instanceMatrix*surfacePosition;
   #endif
   surfaceWorld=(modelMatrix*surfacePosition).xyz;
   vec3 surfaceNormal=abs(inverseTransformDirection(transformedNormal,viewMatrix));
   vec2 surfaceUV=(surfaceNormal.y>surfaceNormal.x&&surfaceNormal.y>surfaceNormal.z)?surfaceWorld.xz:surfaceNormal.x>surfaceNormal.z?surfaceWorld.zy:surfaceWorld.xy;
   surfaceUV/=worldTileMeters;
   #ifdef USE_MAP
    vMapUv=surfaceUV;
   #endif
   #ifdef USE_NORMALMAP
    vNormalMapUv=surfaceUV;
   #endif
   #ifdef USE_ROUGHNESSMAP
    vRoughnessMapUv=surfaceUV;
   #endif`);
  shader.fragmentShader='varying vec3 surfaceWorld;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float mottling=sin(surfaceWorld.x*.43+sin(surfaceWorld.z*.21))*sin(surfaceWorld.y*.31+surfaceWorld.z*.27);
   float baseDirt=1.0-.16*exp(-max(surfaceWorld.y,0.0)*1.65);
   float floorBand=smoothstep(0.92,0.99,abs(sin(surfaceWorld.y*0.95)));
   float pilasterGroove=smoothstep(0.94,0.995,abs(sin(surfaceWorld.x*1.8))*abs(cos(surfaceWorld.z*1.8)));
   float microRelief=1.0-0.065*floorBand-0.045*pilasterGroove+0.028*sin(surfaceWorld.x*6.2+surfaceWorld.z*6.2)*cos(surfaceWorld.y*8.4);
   diffuseColor.rgb*=baseDirt*(.96+.04*mottling)*microRelief;
   vec3 lumenBounce=mix(vec3(1.04,0.98,0.90),vec3(0.95,0.99,1.05),clamp(surfaceWorld.y*0.085,0.0,1.0));
   diffuseColor.rgb*=lumenBounce;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   if(surfaceWorld.y<0.22){
    float puddleNoise=sin(surfaceWorld.x*0.31+cos(surfaceWorld.z*0.29))*cos(surfaceWorld.z*0.37-sin(surfaceWorld.x*0.23));
    float puddleMask=smoothstep(0.42,0.88,puddleNoise);
    roughnessFactor=mix(roughnessFactor,max(0.14,roughnessFactor*0.38),puddleMask*0.58);
   }`);
 };
 material.customProgramCacheKey=()=>`world-metre-pbr-v3/${scale}`;material.needsUpdate=true;return true;
}
export function applyEnvironmentSurfaces(root){let count=0;const seen=new Set();root.traverse(node=>{if(!node.isMesh)return;for(const material of Array.isArray(node.material)?node.material:[node.material]){if(seen.has(material))continue;seen.add(material);if(!material.userData.worldSurface&&material.map?.userData.worldTileMeters)material.userData.worldSurface={meters:material.map.userData.worldTileMeters};if(installWorldSurface(material))count++;}});return count;}

export function terrainHeight(x,z){
 const r=nearestRoad(x,z,TRAFFIC_STREETS);
 // Keep every paved corridor, building row and public courtyard completely flat.
 if(r.distance<r.width/2+36||inEastPublicArea(x,z,24)||x>=-205&&x<=190&&z>=-85&&z<=150)return 0;
 const blend=THREE.MathUtils.smoothstep(r.distance-r.width/2,36,80);
 return blend*(.65+Math.sin(x*.019)*Math.cos(z*.023)*.6+Math.sin(z*.043+x*.013)*.25);
}
export function createDistrictTerrain(material){
 const g=new THREE.PlaneGeometry(1000,1000,160,160).rotateX(-Math.PI/2),p=g.attributes.position;
 for(let i=0;i<p.count;i++)p.setY(i,terrainHeight(p.getX(i),p.getZ(i)));
 p.needsUpdate=true;g.computeVertexNormals();const mesh=new THREE.Mesh(g,material);mesh.name='ContinuousDistrictTerrain';mesh.position.y=-.05;mesh.receiveShadow=true;return mesh;
}
