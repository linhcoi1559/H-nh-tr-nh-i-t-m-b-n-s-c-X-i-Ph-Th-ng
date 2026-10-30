import {encodeSnapshot} from './gameplay-state.mjs';
export function persistSnapshot(snapshot,getStorage,key){
  try{getStorage().setItem(key,encodeSnapshot(snapshot));return {ok:true};}
  catch(error){return {ok:false,reason:error?.name==='QuotaExceededError'?'full':'unavailable'};}
}
export function resetHeldInputs(keys){for(const key of Object.keys(keys))keys[key]=false;}
export function canUseCamera({dialogue,settings,journal,inventory}){return !(dialogue||settings||journal||inventory);}
