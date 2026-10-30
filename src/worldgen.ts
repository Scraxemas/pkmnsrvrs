import {createTerrainGrid,setTerrain,TERRAIN,TerrainGrid,terrainAtWorld} from './terrain';
import {buildForest,generateForestChunk,regionalMotif,type ForestChunkData} from './forestWorld';
import {emptyForestFeatures,ForestFeatures} from './forestPlan';
import {FOREST_TILE_SIZE,FOREST_CHUNK_CELLS,FOREST_CHUNK_SIZE,chunkKey} from './worldConstants';
export {FOREST_TILE_SIZE,FOREST_CHUNK_CELLS,FOREST_CHUNK_SIZE,chunkKey} from './worldConstants';

export type Biome='forest'|'cave'|'ship';
export type ForestMotif='clearing'|'forest-wall'|'corridor'|'tall-grass'|'pond'|'rocky'|'landmark'|'cliff'|'campsite'|'flower-meadow';
export interface Rect { x:number;y:number;width:number;height:number; }
export interface Decoration { id:string;x:number;y:number;depth:number;solid:boolean;radius:number;collisionRadius:number;persistentId?:string; }
export interface Landmark { id:string;x:number;y:number;radius:number; }
export interface WorldChunk { key:string;cx:number;cy:number;motif:ForestMotif;encounterWeight:number;safeSpawn:boolean;featureIds?:string[]; }
export interface ForestWorldChanges {version:1;seed:number;discoveries:string[];removedDecorations:Record<string,string[]>;terrainEdits:Record<string,Record<string,number>>;}
export interface ForestStream {
  centerX:number;centerY:number;revision:number;activeKeys:string[];cells:number;maxCachedChunks:number;
  cache:Map<string,ForestChunkData>;persistent:ForestWorldChanges;contentRevision:number;
}
export interface StageMap {
  seed:number;biome:Biome;width:number;height:number;playerStart:{x:number;y:number};bossArena:Rect;paths:Rect[];
  terrain:TerrainGrid;decorations:Decoration[];landmarks:Landmark[];spawnZones:Rect[];
  chunkSize:number;chunks:Record<string,WorldChunk>;decorationBuckets:Record<string,Decoration[]>;features:ForestFeatures;
  stream?:ForestStream;collisionBuckets?:Record<string,Decoration[]>;
}

class MapRng {constructor(public value:number){}next(){this.value=(this.value*1664525+1013904223)>>>0;return this.value/4294967296;}int(n:number){return Math.floor(this.next()*n);}}

export const motifForChunk=(seed:number,cx:number,cy:number)=>regionalMotif(seed,cx,cy);

function buildLegacyTerrain(rng:MapRng,width:number,height:number,paths:Rect[]){
  const grid=createTerrainGrid(width,height,64);
  for(let y=0;y<grid.rows;y++)for(let x=0;x<grid.cols;x++){const wx=x*grid.tileSize+grid.tileSize/2,wy=y*grid.tileSize+grid.tileSize/2;if(paths.some(path=>wx>=path.x&&wx<=path.x+path.width&&wy>=path.y&&wy<=path.y+path.height))setTerrain(grid,x,y,TERRAIN.path);}
  void rng;return grid;
}

export function generateMap(seed:number,biome:Biome='forest',options:{chunkCells?:number;maxCachedChunks?:number;changes?:ForestWorldChanges}={}):StageMap {
  if(biome==='forest'){
    const forest=buildForest(seed),paths:Rect[]=[],requestedCells=options.chunkCells??FOREST_CHUNK_CELLS,cells=Number.isFinite(requestedCells)?Math.max(16,Math.min(128,Math.floor(requestedCells/16)*16)):FOREST_CHUNK_CELLS,size=cells*FOREST_TILE_SIZE;
    const changes=options.changes?.version===1&&options.changes.seed===seed?JSON.parse(JSON.stringify(options.changes)) as ForestWorldChanges:{version:1 as const,seed,discoveries:[],removedDecorations:{},terrainEdits:{}};
    const map:StageMap={seed,biome,width:forest.width,height:forest.height,playerStart:forest.start,bossArena:forest.bossArena,paths,terrain:createTerrainGrid(size*3,size*3,FOREST_TILE_SIZE),decorations:[],landmarks:forest.landmarks,spawnZones:forest.spawnZones,chunkSize:size,chunks:{},decorationBuckets:{},features:forest.features,stream:{centerX:Number.NaN,centerY:Number.NaN,revision:0,contentRevision:0,activeKeys:[],cells,maxCachedChunks:Math.max(9,Math.floor(options.maxCachedChunks??18)),cache:new Map(),persistent:changes}};
    syncWorldChunks(map,map.playerStart.x,map.playerStart.y);return map;
  }
  const rng=new MapRng(seed),width=2560,height=1440,start={x:width/2,y:height/2},bossArena={x:width-610,y:height/2-250,width:500,height:500};
  const paths:Rect[]=biome==='cave'?[{x:80,y:height/2-150,width:width-160,height:300},{x:width*.45,y:100,width:260,height:height-200}]:[{x:80,y:160,width:width-160,height:260},{x:80,y:520,width:width-160,height:260},{x:80,y:880,width:width-160,height:260}];
  const terrain=buildLegacyTerrain(rng,width,height,paths),decorations:Decoration[]=[],landmarks:Landmark[]=[],spawnZones=[{x:80,y:80,width:450,height:350},{x:width-530,y:80,width:450,height:350},{x:80,y:height-430,width:450,height:350},{x:width-530,y:height-430,width:450,height:350}];
  const chunks={"0,0":{key:'0,0',cx:0,cy:0,motif:'clearing' as ForestMotif,encounterWeight:1,safeSpawn:true}};
  return{seed,biome,width,height,playerStart:start,bossArena,paths,terrain,decorations,landmarks,spawnZones,chunkSize:Math.max(width,height),chunks,decorationBuckets:{'0,0':decorations},features:emptyForestFeatures()};
}

function cachedForestChunk(map:StageMap,cx:number,cy:number){
  const stream=map.stream!,key=chunkKey(cx,cy);let chunk=stream.cache.get(key);
  if(!chunk)chunk=generateForestChunk(map.seed,cx,cy,map.features,stream.cells);
  else stream.cache.delete(key);
  stream.cache.set(key,chunk);return chunk;
}

function rebuildResidentWorld(map:StageMap){
  const stream=map.stream!,cells=stream.cells,cols=cells*3,originCol=(stream.centerX-1)*cells,originRow=(stream.centerY-1)*cells;
  const grid=createTerrainGrid(cols*FOREST_TILE_SIZE,cols*FOREST_TILE_SIZE,FOREST_TILE_SIZE);grid.originCol=originCol;grid.originRow=originRow;
  map.chunks={};map.decorations=[];map.decorationBuckets={};map.collisionBuckets={};stream.activeKeys=[];
  for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
    const chunk=cachedForestChunk(map,stream.centerX+ox,stream.centerY+oy),key=chunk.key,removed=new Set(stream.persistent.removedDecorations[key]??[]),edits=stream.persistent.terrainEdits[key]??{};
    stream.activeKeys.push(key);map.chunks[key]={key,cx:chunk.cx,cy:chunk.cy,motif:chunk.motif,encounterWeight:chunk.encounterWeight,safeSpawn:chunk.safeSpawn,featureIds:chunk.featureIds};
    for(let y=0;y<cells;y++)for(let x=0;x<cells;x++){
      const i=y*cells+x,value=edits[i]??chunk.terrain.cells[i];grid.cells[((oy+1)*cells+y)*cols+(ox+1)*cells+x]=value;
    }
    const decorations=chunk.decorations.filter(d=>!removed.has(d.persistentId!));map.decorationBuckets[key]=decorations;map.decorations.push(...decorations);
    for(const d of decorations)if(d.solid){const cell=chunkKey(Math.floor(d.x/128),Math.floor(d.y/128));(map.collisionBuckets[cell]??=[]).push(d);}
  }
  map.terrain=grid;stream.revision++;
  // Retain only a small LRU of terrain. Persistent deltas are independent of it.
  const active=new Set(stream.activeKeys);for(const key of stream.cache.keys())if(stream.cache.size>stream.maxCachedChunks&&!active.has(key))stream.cache.delete(key);
}

/** No work on ordinary frames; generation only happens when residency changes. */
export function syncWorldChunks(map:StageMap,x:number,y:number){
  if(!map.stream)return false;const cx=Math.floor(x/map.chunkSize),cy=Math.floor(y/map.chunkSize);
  if(cx===map.stream.centerX&&cy===map.stream.centerY)return false;
  map.stream.centerX=cx;map.stream.centerY=cy;rebuildResidentWorld(map);return true;
}

/** Optional idle-time prewarming: prepares one next-ring chunk, with a hard cap. */
export function prewarmWorldChunk(map:StageMap,x:number,y:number){
  const stream=map.stream;if(!stream||stream.maxCachedChunks<=9)return false;
  const cx=Math.floor(x/map.chunkSize),cy=Math.floor(y/map.chunkSize),candidates:{cx:number;cy:number;d:number}[]=[];
  for(let oy=-2;oy<=2;oy++)for(let ox=-2;ox<=2;ox++)if(Math.max(Math.abs(ox),Math.abs(oy))===2&&!stream.cache.has(chunkKey(cx+ox,cy+oy)))candidates.push({cx:cx+ox,cy:cy+oy,d:Math.hypot((cx+ox+.5)*map.chunkSize-x,(cy+oy+.5)*map.chunkSize-y)});
  candidates.sort((a,b)=>a.d-b.d);if(!candidates[0])return false;
  if(stream.cache.size>=stream.maxCachedChunks){
    const active=new Set(stream.activeKeys),farthest=[...stream.cache.values()].filter(c=>!active.has(c.key)).map(c=>({key:c.key,d:Math.hypot((c.cx+.5)*map.chunkSize-x,(c.cy+.5)*map.chunkSize-y)})).sort((a,b)=>b.d-a.d)[0];
    if(!farthest||farthest.d<=candidates[0].d)return false;stream.cache.delete(farthest.key);
  }
  cachedForestChunk(map,candidates[0].cx,candidates[0].cy);return true;
}

export function chunkAtWorld(map:StageMap,x:number,y:number){return map.chunks[chunkKey(Math.floor(x/map.chunkSize),Math.floor(y/map.chunkSize))];}
export function markWorldDiscovery(map:StageMap,id:string){const list=map.stream?.persistent.discoveries;if(!list||list.includes(id))return false;list.push(id);list.sort();return true;}
export function removeWorldDecoration(map:StageMap,id:string){
  if(!map.stream)return false;const key=id.split(':')[0],list=map.stream.persistent.removedDecorations[key]??=[];
  if(list.includes(id))return false;(map.stream.persistent.removedDecorations[key]??=[]).push(id);map.stream.contentRevision++;rebuildResidentWorld(map);return true;
}
export function setWorldTerrain(map:StageMap,tileX:number,tileY:number,value:number){
  if(!map.stream||!Number.isInteger(value)||value<0||value>4)return false;
  const cells=map.stream.cells,cx=Math.floor(tileX/cells),cy=Math.floor(tileY/cells),key=chunkKey(cx,cy),index=(tileY-cy*cells)*cells+tileX-cx*cells;
  (map.stream.persistent.terrainEdits[key]??={})[index]=value;map.stream.contentRevision++;rebuildResidentWorld(map);return true;
}
export function serializeWorldChanges(map:StageMap):ForestWorldChanges|undefined{return map.stream?JSON.parse(JSON.stringify(map.stream.persistent)):undefined;}

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
  if(map.collisionBuckets){const cx=Math.floor(x/128),cy=Math.floor(y/128),result:Decoration[]=[];for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++)result.push(...(map.collisionBuckets[chunkKey(cx+ox,cy+oy)]??[]));return result;}
  if(!map.chunkSize)return map.decorations;
  const cx=Math.floor(x/map.chunkSize),cy=Math.floor(y/map.chunkSize),result:Decoration[]=[];
  for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++)result.push(...(map.decorationBuckets[chunkKey(cx+ox,cy+oy)]??[]));
  return result;
}

function terrainCollision(map:StageMap,x:number,y:number,radius:number){return [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]].some(([ox,oy])=>[TERRAIN.water,TERRAIN.cliff].includes(terrainAtWorld(map.terrain,x+ox,y+oy) as 2|4));}
export function collides(map:StageMap,x:number,y:number,radius=16){
  if(!map.stream&&(x<radius||y<radius||x>map.width-radius||y>map.height-radius))return true;
  // Treat nonresident cells as solid. Collision reads never generate terrain.
  if(map.stream&&[[x-radius,y-radius],[x+radius,y+radius]].some(([px,py])=>!chunkAtWorld(map,px,py)))return true;
  if(terrainCollision(map,x,y,radius))return true;
  if(map.landmarks.some(landmark=>landmark.id==='ancient-tree'&&Math.hypot(landmark.x-x,landmark.y-y)<28+radius))return true;
  return nearbyDecorations(map,x,y).some(decoration=>decoration.solid&&Math.hypot(decoration.x-x,decoration.y-y)<decoration.collisionRadius+radius);
}
