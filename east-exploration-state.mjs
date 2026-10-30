import {EAST_PLACES} from './district-routes.mjs';
export function normalizeEastExploration(input={}){
 const visited=[...new Set((Array.isArray(input?.visited)?input.visited:[]).filter(id=>EAST_PLACES.some(p=>p.id===id)))];
 return {visited,claimed:input?.claimed===true&&visited.length===EAST_PLACES.length};
}
export function recordEastPhoto(input,id){
 const s=normalizeEastExploration(input);if(!EAST_PLACES.some(p=>p.id===id)||s.visited.includes(id))return s;
 return {...s,visited:[...s.visited,id]};
}
export function claimEastExploration(input){
 const s=normalizeEastExploration(input);if(s.claimed||s.visited.length!==EAST_PLACES.length)return {state:s,reward:null};
 return {state:{...s,claimed:true},reward:{coins:18000,xp:100,points:1}};
}
