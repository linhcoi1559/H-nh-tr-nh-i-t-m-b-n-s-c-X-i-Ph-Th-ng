import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {installWorldSurface,terrainHeight,createDistrictTerrain} from '../environment-surfaces.mjs';
import {TRAFFIC_STREETS} from '../traffic-routes.mjs';
import {sampleRoad,EAST_PUBLIC_AREAS} from '../district-routes.mjs';
test('terrain stays level on roads, pavements and public spaces; outer land has finite relief',()=>{
 for(const road of TRAFFIC_STREETS)for(const p of sampleRoad(road,7))for(const side of [-1,0,1])assert.equal(terrainHeight(p.x-p.dz*side*(road.width/2+5),p.z+p.dx*side*(road.width/2+5)),0);
 for(const a of EAST_PUBLIC_AREAS)assert.equal(terrainHeight((a.minX+a.maxX)/2,(a.minZ+a.maxZ)/2),0);
 const terrain=createDistrictTerrain(new THREE.MeshStandardMaterial());const p=terrain.geometry.attributes.position;let raised=0;
 for(let i=0;i<p.count;i++){assert.ok(Number.isFinite(p.getY(i)));if(p.getY(i)>.1)raised++;}assert.ok(raised>500);
});
test('world surface shader projects colour, roughness and normal consistently; clones can be installed separately',()=>{
 const m=new THREE.MeshStandardMaterial();m.userData.worldSurface={meters:2.4};assert.ok(installWorldSurface(m));assert.equal(installWorldSurface(m),false);
 const shader={uniforms:{},vertexShader:'#include <worldpos_vertex>',fragmentShader:'#include <color_fragment>'};m.onBeforeCompile(shader);
 for(const name of ['vMapUv','vNormalMapUv','vRoughnessMapUv'])assert.ok(shader.vertexShader.includes(name+'=surfaceUV'));
 assert.ok(shader.vertexShader.includes('instanceMatrix*surfacePosition'));assert.equal(shader.uniforms.worldTileMeters.value,2.4);assert.ok(installWorldSurface(m.clone()));
});
