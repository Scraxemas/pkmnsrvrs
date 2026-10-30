import {createTerrainGrid,setTerrain,TERRAIN,TerrainGrid,terrainAtWorld} from './terrain';
import {buildForest,regionalMotif} from './forestWorld';
import {emptyForestFeatures,ForestFeatures} from './forestPlan';
import {FOREST_TILE_SIZE,FOREST_CHUNK_CELLS,FOREST_CHUNK_SIZE,chunkKey} from './worldConstants';
export {FOREST_TILE_SIZE,FOREST_CHUNK_CELLS,FOREST_CHUNK_SIZE,chunkKey} from './worldConstants';

export type Biome='forest'|'cave'|'ship';
export type ForestMotif='clearing'|'forest-wall'|'corridor'|'tall-grass'|'pond'|'rocky'|'landmark'|'cliff'|'campsite'|'flower-meadow';
export interface Rect { x:number;y:number;width:number;height:number; }
export interface Decoration { id:string;x:number;y:number;depth:number;solid:boolean;radius:number;collisionRadius:number; }
export interface Landmark { id:string;x:number;y:number;radius:number; }
export interface WorldChunk { key:string;cx:number;cy:number;motif:ForestMotif;encounterWeight:number;safeSpawn:boolean;featureIds?:string[]; }
export interface StageMap {
  seed:number;biome:Biome;width:number;height:number;playerStart:{x:number;y:number};bossArena:Rect;paths:Rect[];
  terrain:TerrainGrid;decorations:Decoration[];landmarks:Landmark[];spawnZones:Rect[];
  chunkSize:number;chunks:Record<string,WorldChunk>;decorationBuckets:Record<string,Decoration[]>;features:ForestFeatures;
}

class MapRng {constructor(public value:number){}next(){this.value=(this.value*1664525+1013904223)>>>0;return this.value/4294967296;}int(n:number){return Math.floor(this.next()*n);}}

export const motifForChunk=(seed:number,cx:number,cy:number)=>regionalMotif(seed,cx,cy);

function buildLegacyTerrain(rng:MapRng,width:number,height:number,paths:Rect[]){
  const grid=createTerrainGrid(width,height,64);
  for(let y=0;y<grid.rows;y++)for(let x=0;x<grid.cols;x++){const wx=x*grid.tileSize+grid.tileSize/2,wy=y*grid.tileSize+grid.tileSize/2;if(paths.some(path=>wx>=path.x&&wx<=path.x+path.width&&wy>=path.y&&wy<=path.y+path.height))setTerrain(grid,x,y,TERRAIN.path);}
  void rng;return grid;
}

export function generateMap(seed:number,biome:Biome='forest'):StageMap {
  if(biome==='forest'){
    const forest=buildForest(seed),paths:Rect[]=[];
    return{seed,biome,width:forest.width,height:forest.height,playerStart:forest.start,bossArena:forest.bossArena,paths,terrain:forest.grid,decorations:forest.decorations,landmarks:forest.landmarks,spawnZones:forest.spawnZones,chunkSize:FOREST_CHUNK_SIZE,chunks:forest.chunks,decorationBuckets:forest.decorationBuckets,features:forest.features};
  }
  const rng=new MapRng(seed),width=2560,height=1440,start={x:width/2,y:height/2},bossArena={x:width-610,y:height/2-250,width:500,height:500};
  const paths:Rect[]=biome==='cave'?[{x:80,y:height/2-150,width:width-160,height:300},{x:width*.45,y:100,width:260,height:height-200}]:[{x:80,y:160,width:width-160,height:260},{x:80,y:520,width:width-160,height:260},{x:80,y:880,width:width-160,height:260}];
  const terrain=buildLegacyTerrain(rng,width,height,paths),decorations:Decoration[]=[],landmarks:Landmark[]=[],spawnZones=[{x:80,y:80,width:450,height:350},{x:width-530,y:80,width:450,height:350},{x:80,y:height-430,width:450,height:350},{x:width-530,y:height-430,width:450,height:350}];
  const chunks={"0,0":{key:'0,0',cx:0,cy:0,motif:'clearing' as ForestMotif,encounterWeight:1,safeSpawn:true}};
  return{seed,biome,width,height,playerStart:start,bossArena,paths,terrain,decorations,landmarks,spawnZones,chunkSize:Math.max(width,height),chunks,decorationBuckets:{'0,0':decorations},features:emptyForestFeatures()};
}

export interface MapValidation { valid:boolean;errors:string[]; }
export function validateMap(map:StageMap):MapValidation {
  const errors:string[]=[],inside=(x:number,y:number)=>x>=0&&x<=map.width&&y>=0&&y<=map.height;
  if(!inside(map.playerStart.x,map.playerStart.y))errors.push('player-start-outside');
  if(map.decorations.some(d=>d.solid&&Math.hypot(d.x-map.playerStart.x,d.y-map.playerStart.y)<d.collisionRadius+100))errors.push('unsafe-player-start');
  if(map.spawnZones.some(zone=>zone.width<200||zone.height<200))errors.push('invalid-spawn-zone');
  if(terrainAtWorld(map.terrain,map.playerStart.x,map.playerStart.y)===TERRAIN.water)errors.push('start-in-water');
  if(terrainAtWorld(map.terrain,map.playerStart.x,map.playerStart.y)===TERRAIN.cliff)errors.push('start-on-cliff');
  if(map.decorations.some(d=>d.id==='waterRock'?terrainAtWorld(map.terrain,d.x,d.y)!==TERRAIN.water:[TERRAIN.water,TERRAIN.cliff].includes(terrainAtWorld(map.terrain,d.x,d.y) as 2|4)))errors.push('incompatible-decoration-terrain');
  return{valid:errors.length===0,errors};
}

function nearbyDecorations(map:StageMap,x:number,y:number){
  if(!map.chunkSize)return map.decorations;
  const cx=Math.floor(x/map.chunkSize),cy=Math.floor(y/map.chunkSize),result:Decoration[]=[];
  for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++)result.push(...(map.decorationBuckets[chunkKey(cx+ox,cy+oy)]??[]));
  return result;
}

function terrainCollision(map:StageMap,x:number,y:number,radius:number){return [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]].some(([ox,oy])=>[TERRAIN.water,TERRAIN.cliff].includes(terrainAtWorld(map.terrain,x+ox,y+oy) as 2|4));}
export function collides(map:StageMap,x:number,y:number,radius=16){
  if(x<radius||y<radius||x>map.width-radius||y>map.height-radius||terrainCollision(map,x,y,radius))return true;
  if(map.landmarks.some(landmark=>landmark.id==='ancient-tree'&&Math.hypot(landmark.x-x,landmark.y-y)<28+radius))return true;
  return nearbyDecorations(map,x,y).some(decoration=>decoration.solid&&Math.hypot(decoration.x-x,decoration.y-y)<decoration.collisionRadius+radius);
}
