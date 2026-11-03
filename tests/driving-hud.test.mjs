import test from 'node:test';import assert from 'node:assert/strict';
import {gameClockLabel} from '../driving-hud.mjs';
import {neighborhoodBoundarySegments,canPlaceDistrictBuilding,segmentHitsBounds} from '../district-layout.mjs';
import {DISTRICT_ROADS} from '../district-routes.mjs';
test('game clock formats saved hours without replacing them with a generic daytime label',()=>{
 assert.equal(gameClockLabel(9.5),'09:30');assert.equal(gameClockLabel(19+41/60),'19:41');assert.equal(gameClockLabel(7.25),'07:15');assert.equal(gameClockLabel(24),'00:00');
});
test('whole-neighborhood boundary stays outside every road and public area and closes western outward views',()=>{
 const walls=neighborhoodBoundarySegments();assert.ok(walls.length>100);
 for(const b of walls)assert.ok(canPlaceDistrictBuilding(b));
 // The western loop now continues beyond the former 200 m view probe.
 for(const a of [Math.PI,Math.PI*1.25,Math.PI*1.5])assert.ok(walls.some(b=>segmentHitsBounds({x:-214,z:0},{x:-214+Math.sin(a)*400,z:Math.cos(a)*400},b)));
 for(const r of DISTRICT_ROADS)for(let i=1;i<r.points.length;i++)for(const wall of walls)assert.equal(segmentHitsBounds({x:r.points[i-1][0],z:r.points[i-1][1]},{x:r.points[i][0],z:r.points[i][1]},wall,r.width/2+3),false);
});
