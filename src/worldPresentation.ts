import {ENVIRONMENT_ASSETS} from './environmentAssets';

export interface ViewBounds {left:number;top:number;right:number;bottom:number;}

// Include roots below the screen whose tall crowns are still visible, as well
// as horizontal overhang. No sprite is clipped to its owning chunk rectangle.
export function visibleChunkRange(view:ViewBounds,size:number,cols:number,rows:number){
  return{
    minX:Math.max(0,Math.floor((view.left-128)/size)),
    maxX:Math.min(cols-1,Math.floor((view.right+128)/size)),
    minY:Math.max(0,Math.floor((view.top-128)/size)),
    maxY:Math.min(rows-1,Math.floor((view.bottom+256)/size)),
  };
}

export function decorationVisual(id:string,x:number,y:number,seed:number){
  const variant=(Math.imul(Math.floor(x),73856093)^Math.imul(Math.floor(y),19349663)^seed)>>>0;
  switch(id){
    case'tree':return{name:variant%7===0?ENVIRONMENT_ASSETS.treeCluster:ENVIRONMENT_ASSETS.treeLight,scale:2,trunkPadding:6};
    case'rock':return{name:variant%2?ENVIRONMENT_ASSETS.rockSmall:ENVIRONMENT_ASSETS.rockMedium,scale:variant%2?1:2,trunkPadding:4};
    case'bush':return{name:ENVIRONMENT_ASSETS.bush,scale:2,trunkPadding:4};
    case'sapling':return{name:ENVIRONMENT_ASSETS.sapling,scale:2,trunkPadding:6};
    default:throw new Error(`No reviewed map artwork for decoration: ${id}`);
  }
}
