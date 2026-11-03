import test from 'node:test';import assert from 'node:assert/strict';
import {environmentLighting} from '../environment-lighting.mjs';
test('environment light wraps midnight and transitions smoothly at all previous lighting cutoffs',()=>{
 assert.deepEqual(environmentLighting(0),environmentLighting(24));
 for(const h of [5,6.5,8,15.5,16.2,17.5,18.5,19]){const a=environmentLighting(h-.001),b=environmentLighting(h+.001);assert.ok(Math.abs(a.sun-b.sun)<.01);assert.ok(Math.abs(a.hemi-b.hemi)<.01);for(const channel of ['r','g','b'])assert.ok(Math.abs(a.sky[channel]-b.sky[channel])<.01);}
 assert.ok(environmentLighting(12).sun>environmentLighting(22).sun*4);
});
