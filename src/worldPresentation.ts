import {ENVIRONMENT_ASSETS} from './environmentAssets';
import {TERRAIN,TerrainCode} from './terrain';

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

export function decorationVisual(id:string,x:number,y:number,seed:number,radius=30){
  const variant=(Math.imul(Math.floor(x),73856093)^Math.imul(Math.floor(y),19349663)^seed)>>>0;
  switch(id){
    case'tree':return{name:variant%7===0?ENVIRONMENT_ASSETS.treeCluster:ENVIRONMENT_ASSETS.treeLight,scale:2,trunkPadding:6};
    case'rock':case'landRock':return{name:radius>28?ENVIRONMENT_ASSETS.landBoulder:ENVIRONMENT_ASSETS.landRockSmall,scale:1,trunkPadding:4};
    case'waterRock':return{name:variant%2?ENVIRONMENT_ASSETS.waterRock:ENVIRONMENT_ASSETS.shoreRock,scale:2,trunkPadding:4};
    case'tent':return{name:ENVIRONMENT_ASSETS.tent,scale:2,trunkPadding:4};
    case'campLog':return{name:ENVIRONMENT_ASSETS.campLog,scale:2,trunkPadding:3};
    case'supplies':return{name:ENVIRONMENT_ASSETS.supplies,scale:2,trunkPadding:3};
    case'reeds':return{name:ENVIRONMENT_ASSETS.reeds,scale:2,trunkPadding:3};
    case'flowerWhite':return{name:ENVIRONMENT_ASSETS.flowerWhite,scale:2,trunkPadding:3};
    case'flowerPink':return{name:ENVIRONMENT_ASSETS.flowerPink,scale:2,trunkPadding:3};
    case'flowerYellow':return{name:ENVIRONMENT_ASSETS.flowerYellow,scale:2,trunkPadding:3};
    case'bush':return{name:ENVIRONMENT_ASSETS.bush,scale:2,trunkPadding:4};
    case'sapling':return{name:ENVIRONMENT_ASSETS.sapling,scale:2,trunkPadding:6};
    default:throw new Error(`No reviewed map artwork for decoration: ${id}`);
  }
}

export function decorationTerrainCompatible(id:string,terrain:TerrainCode){
  if(id==='waterRock')return terrain===TERRAIN.water;
  return terrain!==TERRAIN.water&&terrain!==TERRAIN.cliff;
}

export function cliffFrame(n:boolean,e:boolean,s:boolean,w:boolean){
  if(!n&&!w)return 0;if(!n&&!e)return 2;if(!s&&!w)return 6;if(!s&&!e)return 8;
  if(!n)return 1;if(!s)return 7;if(!w)return 3;if(!e)return 5;return 4;
}
