import test from 'node:test';import assert from 'node:assert/strict';
import {persistSnapshot,resetHeldInputs,canUseCamera} from '../runtime-guards.mjs';
import {parseSnapshot} from '../gameplay-state.mjs';
test('storage failure never throws through the game action and a later successful write recovers',()=>{
 const snapshot={coins:12345};let raw;
 assert.deepEqual(persistSnapshot(snapshot,()=>{throw new Error('blocked')},'save'),{ok:false,reason:'unavailable'});
 assert.deepEqual(persistSnapshot(snapshot,()=>({setItem(){const e=new Error();e.name='QuotaExceededError';throw e;}}),'save'),{ok:false,reason:'full'});
 assert.deepEqual(persistSnapshot(snapshot,()=>({setItem(key,value){assert.equal(key,'save');raw=value;}}),'save'),{ok:true});assert.equal(parseSnapshot(raw).coins,12345);
});
test('focus loss releases every held input and camera is disabled under each modal',()=>{
 const keys={w:true,s:false,a:true,d:false,shift:true,q:true};resetHeldInputs(keys);assert.ok(Object.values(keys).every(v=>v===false));
 assert.equal(canUseCamera({}),true);for(const key of ['dialogue','settings','journal','inventory'])assert.equal(canUseCamera({[key]:true}),false);
});
