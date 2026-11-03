import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {NEIGHBORHOOD_JOBS,buildActivityCorners} from '../neighborhood-activities.mjs';
import {normalizeDaylife,acceptDayJob,availableGoals,completeDayGoal,finishDayJob} from '../daylife-state.mjs';
import {nearestRoad} from '../district-routes.mjs';
test('new local jobs enforce order, reject skipped steps and pay exactly once',()=>{
 for(const job of NEIGHBORHOOD_JOBS){let s=acceptDayJob(normalizeDaylife({},2),job.id,2);
  assert.deepEqual(completeDayGoal(s,job.goals.at(-1).id,2).active.done,[]);
  for(const g of job.goals){assert.equal(availableGoals(s,2)[0].id,g.id);s=completeDayGoal(s,g.id,2);}
  const end=finishDayJob(s,2,'income');assert.equal(end.reward.coins,job.base);assert.equal(finishDayJob(end.state,2,'income').reward,null);
 }
});
test('activity furniture stays outside road lanes, has finite geometry and changes stock after completion',()=>{
 const world=new THREE.Group(),solids=[];const corners=buildActivityCorners(world,(x,z,r)=>solids.push({x,z,r}));
 for(const p of solids){const road=nearestRoad(p.x,p.z);assert.ok(road.distance>road.width/2+p.r);}
 corners.root.traverse(o=>{if(o.isMesh){for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));}});
 corners.update({completed:['market-helper']});assert.ok(corners.root.children[0].children.some(n=>n.visible===false));
});
