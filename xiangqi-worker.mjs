import {chooseMove} from './xiangqi.mjs';
self.onmessage=({data})=>{try{self.postMessage({id:data.id,move:chooseMove(data.board,data.side,data.options)});}catch(error){self.postMessage({id:data.id,error:error.message});}};
