import * as THREE from 'three';
import {buildDistrictExtension}from'./district-world.mjs';
import {DISTRICT_ROADS,sampleRoad,constrainDistrictPosition}from'./district-routes.mjs';
import {districtPath}from'./district-navigation.mjs';
import {CollisionGrid}from'./collision-grid.mjs';
import {ALLEY_BOUNDARY_WALLS,CORE_BACKDROP_SHELLS,backdropFootprint}from'./world-closure.mjs';
import {dayOffers}from'./daylife-state.mjs';
import {buildEastWorld}from'./east-world.mjs';
import {buildDistrictStreetscape}from'./district-streetscape.mjs';
import {buildPhuXaCourt}from'./phu-xa-court.mjs';
import {buildWestPeachGarden}from'./west-peach-garden.mjs';
import {buildDistrictLiving}from'./district-living.mjs';

export function playtestWorld(){
 const world=new THREE.Group(),material=new THREE.MeshStandardMaterial(),boxes=[];
 const add=(x,z,w,d)=>boxes.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});
 const extension=buildDistrictExtension({world,materials:{concrete:()=>material,plaster:()=>material,brick:()=>material},asphalt:material,label:()=>new THREE.Object3D(),box:add});
 buildEastWorld({world,materials:{concrete:()=>material,wood:material},box:add});
 buildPhuXaCourt({world,materials:{concrete:()=>material,wood:material},box:add});
 buildWestPeachGarden({world,materials:{wood:material},box:add});
 buildDistrictStreetscape({world,materials:{wood:material},box:add,buildings:extension.buildingFootprints});
 ALLEY_BOUNDARY_WALLS.forEach(b=>add(...b));
 CORE_BACKDROP_SHELLS.forEach(s=>{const b=backdropFootprint(s);add(s[0],s[1],b.width,b.depth);});
 buildDistrictLiving({world,materials:{concrete:()=>material,plaster:()=>material,brick:()=>material,wood:material},box:add,buildings:boxes,frontages:extension.frontages});
 const geometries=new Set(),materials=new Set();world.traverse(n=>{if(n.geometry)geometries.add(n.geometry);if(n.material)materials.add(n.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());material.dispose();
 return boxes;
}
function touching(point,radius,box){const dx=Math.max(box.minX-point.x,0,point.x-box.maxX),dz=Math.max(box.minZ-point.z,0,point.z-box.maxZ);return dx*dx+dz*dz<radius*radius;}
export function rollOutRoute(start,target,boxes,{mode='walk',maxSteps=6000}={}){
 const grid=new CollisionGrid(),candidates=[];boxes.forEach((b,i)=>grid.insert(b,i));
 const radius=mode==='ride'?.65:.42,step=mode==='ride'?.8:.45,path=districtPath(start,target);let position={...start},steps=0,travelled=0;
 if(!path.length)return {ok:false,type:'no-route',position,steps,path};
 const hit=p=>{grid.query(p.x,p.z,radius,candidates);return candidates.find(i=>touching(p,radius,boxes[i]));};
 if(hit(position)!==undefined)return {ok:false,type:'blocked-start',position,steps,path};
 for(const waypoint of path){
  while(Math.hypot(waypoint.x-position.x,waypoint.z-position.z)>.001){
   if(++steps>maxSteps)return {ok:false,type:'step-budget',position,steps,path};
   const distance=Math.hypot(waypoint.x-position.x,waypoint.z-position.z),length=Math.min(step,distance),next={x:position.x+(waypoint.x-position.x)*length/distance,z:position.z+(waypoint.z-position.z)*length/distance};
   const constrained={...next};constrainDistrictPosition(constrained);
   if(Math.hypot(constrained.x-next.x,constrained.z-next.z)>.02)return {ok:false,type:'guide-outside-boundary',position:next,steps,path};
   const obstacle=hit(next);if(obstacle!==undefined)return {ok:false,type:'guide-crosses-collider',position:next,obstacle:boxes[obstacle],steps,path};
   position=next;travelled+=length;
  }
 }
 return {ok:true,position,steps,travelled,path};
}
export function auditRoadNetwork({seed=4105,journeys=400,boxes=playtestWorld()}={}){
 let randomState=seed>>>0;const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};
 const points=DISTRICT_ROADS.flatMap(road=>sampleRoad(road,18).flatMap(p=>[0,road.width/2+1,-road.width/2-1].map(offset=>({x:p.x-p.dz*offset,z:p.z+p.dx*offset}))));
 points.push(...[-150,-70,-10,42,145].map(x=>({x,z:0})),...dayOffers(1).find(o=>o.id==='courier').goals.filter(g=>g.action==='receipt').map(({x,z})=>({x,z})));
 const runs=[],findings=[],summary={journeys,arrived:0,blockedStarts:0,routeFindings:0,spatialSteps:0,metres:0};
 for(let i=0;i<journeys;i++){
  const start=points[Math.floor(random()*points.length)],target=points[Math.floor(random()*points.length)],mode=i%2?'ride':'walk';
  const result=rollOutRoute(start,target,boxes,{mode});summary.spatialSteps+=result.steps;
  const record={id:i,seed,start,target,mode,...result};runs.push(record);
  if(result.ok){summary.arrived++;summary.metres+=result.travelled;}
  else if(result.type==='blocked-start')summary.blockedStarts++;
  else{summary.routeFindings++;findings.push(record);}
 }
 summary.metres=Math.round(summary.metres);
 return {version:1,seed,scope:'Spatial GPS route probes using production district geometry/colliders and boundary constraints. Not rendered gameplay, vehicle physics, visual occlusion, combat or human enjoyment. A blocked guide segment does not prove the destination is unreachable.',summary,findings,runs};
}
