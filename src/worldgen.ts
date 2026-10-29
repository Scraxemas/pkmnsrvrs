import {createTerrainGrid,setTerrain,TERRAIN,TerrainGrid,terrainAtWorld} from './terrain';

export type Biome='forest'|'cave'|'ship';
export type ForestMotif='clearing'|'forest-wall'|'corridor'|'tall-grass'|'pond'|'rocky'|'landmark';
export interface Rect { x:number;y:number;width:number;height:number; }
export interface Decoration { id:string;x:number;y:number;depth:number;solid:boolean;radius:number;collisionRadius:number; }
export interface Landmark { id:string;x:number;y:number;radius:number; }
export interface WorldChunk { key:string;cx:number;cy:number;motif:ForestMotif;encounterWeight:number;safeSpawn:boolean; }
export interface StageMap {
  seed:number;biome:Biome;width:number;height:number;playerStart:{x:number;y:number};bossArena:Rect;paths:Rect[];
  terrain:TerrainGrid;decorations:Decoration[];landmarks:Landmark[];spawnZones:Rect[];
  chunkSize:number;chunks:Record<string,WorldChunk>;decorationBuckets:Record<string,Decoration[]>;
}

export const FOREST_TILE_SIZE=32;
export const FOREST_CHUNK_CELLS=16;
export const FOREST_CHUNK_SIZE=FOREST_TILE_SIZE*FOREST_CHUNK_CELLS;

class MapRng {constructor(public value:number){}next(){this.value=(this.value*1664525+1013904223)>>>0;return this.value/4294967296;}int(n:number){return Math.floor(this.next()*n);}}
const intersects=(a:Rect,b:Rect)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
export const chunkKey=(cx:number,cy:number)=>`${cx},${cy}`;

function hash(seed:number,x:number,y:number,salt=0){
  let value=(seed^Math.imul(x+0x9e3779b9,374761393)^Math.imul(y+0x85ebca6b,668265263)^salt)>>>0;
  value=Math.imul(value^(value>>>13),1274126177);return(value^(value>>>16))>>>0;
}

export function motifForChunk(seed:number,cx:number,cy:number,centerCx=8,centerCy=8):ForestMotif {
  if(Math.abs(cx-centerCx)<=1&&Math.abs(cy-centerCy)<=1)return'clearing';
  const motifs:ForestMotif[]=['clearing','forest-wall','corridor','tall-grass','pond','rocky','landmark'];
  return motifs[hash(seed,cx,cy)%motifs.length];
}

function mainPathY(seed:number,x:number,height:number){
  const phase=(seed%997)/997*Math.PI*2;
  return height/2+Math.sin(x/1080+phase)*620+Math.sin(x/430+phase*.7)*150;
}

function verticalPathX(seed:number,y:number,width:number){
  const phase=(seed%613)/613*Math.PI*2;
  return width/2+Math.sin(y/940+phase)*520;
}

function isPath(seed:number,x:number,y:number,width:number,height:number){
  const main=Math.abs(y-mainPathY(seed,x,height))<76;
  const branch=Math.abs(x-verticalPathX(seed,y,width))<64&&Math.abs(y-height/2)<height*.34;
  return main||branch;
}

function addDecoration(decorations:Decoration[],id:string,x:number,y:number,radius:number,solid=true){
  const collisionRadius=id==='tree'?Math.max(13,Math.round(radius*.34)):id==='rock'?Math.max(12,Math.round(radius*.58)):Math.max(12,Math.round(radius*.5));
  decorations.push({id,x,y,depth:Math.round(y),solid,radius,collisionRadius});
}

function buildForest(seed:number){
  const width=8192,height=8192,grid=createTerrainGrid(width,height,FOREST_TILE_SIZE),decorations:Decoration[]=[],landmarks:Landmark[]=[],chunks:Record<string,WorldChunk>={};
  const cols=Math.ceil(width/FOREST_CHUNK_SIZE),rows=Math.ceil(height/FOREST_CHUNK_SIZE),centerCx=Math.floor(cols/2),centerCy=Math.floor(rows/2),start={x:width/2,y:height/2};

  for(let cy=0;cy<rows;cy++)for(let cx=0;cx<cols;cx++){
    const key=chunkKey(cx,cy),motif=motifForChunk(seed,cx,cy,centerCx,centerCy),rng=new MapRng(hash(seed,cx,cy,0x517cc1b7));
    chunks[key]={key,cx,cy,motif,encounterWeight:motif==='tall-grass'?1.35:motif==='clearing'?.8:1,safeSpawn:motif==='clearing'||motif==='corridor'};
    const baseX=cx*FOREST_CHUNK_CELLS,baseY=cy*FOREST_CHUNK_CELLS;
    const pondCenter={x:baseX+7+rng.int(3),y:baseY+7+rng.int(3)};
    const grassCenter={x:baseX+6+rng.int(5),y:baseY+6+rng.int(5)};

    for(let ly=0;ly<FOREST_CHUNK_CELLS;ly++)for(let lx=0;lx<FOREST_CHUNK_CELLS;lx++){
      const gx=baseX+lx,gy=baseY+ly,wx=gx*FOREST_TILE_SIZE+16,wy=gy*FOREST_TILE_SIZE+16;
      if(isPath(seed,wx,wy,width,height)){setTerrain(grid,gx,gy,TERRAIN.path);continue;}
      if(motif==='pond'&&((gx-pondCenter.x)**2/20+(gy-pondCenter.y)**2/10<=1)){setTerrain(grid,gx,gy,TERRAIN.water);continue;}
      if(motif==='tall-grass'&&((gx-grassCenter.x)**2/24+(gy-grassCenter.y)**2/14<=1))setTerrain(grid,gx,gy,TERRAIN.tallGrass);
    }

    const nearStart=Math.abs(cx-centerCx)<=1&&Math.abs(cy-centerCy)<=1;
    const place=(id:string,lx:number,ly:number,radius:number,solid=true)=>{
      const x=cx*FOREST_CHUNK_SIZE+lx*FOREST_TILE_SIZE+16,y=cy*FOREST_CHUNK_SIZE+ly*FOREST_TILE_SIZE+16;
      if(nearStart&&Math.hypot(x-start.x,y-start.y)<260)return;
      if(terrainAtWorld(grid,x,y)!==TERRAIN.grass)return;
      addDecoration(decorations,id,x,y,radius,solid);
    };
    const treeCluster=(anchorX:number,anchorY:number,count:number,spread:number)=>{for(let i=0;i<count;i++)place('tree',anchorX+(rng.next()-.5)*spread,anchorY+(rng.next()-.5)*spread,27+rng.int(8));};

    if(motif==='clearing'){
      treeCluster(2.5,2.5,3,3);treeCluster(13.5,13,3,3);
    }else if(motif==='forest-wall'){
      for(let i=1;i<15;i+=2){place('tree',1+rng.next()*1.3,i+rng.next(),30);place('tree',14-rng.next()*1.3,i+rng.next(),30);}
      treeCluster(8,3,5,5);
    }else if(motif==='corridor'){
      for(let i=1;i<15;i+=3){place('tree',i+rng.next(),2+rng.next(),29);place('tree',i+rng.next(),14-rng.next(),29);}
    }else if(motif==='tall-grass'){
      treeCluster(2.5,11.5,4,4);treeCluster(13,3,3,3);
    }else if(motif==='pond'){
      treeCluster(2.5,3,3,3);treeCluster(13,12.5,3,3);
      landmarks.push({id:'pond',x:pondCenter.x*FOREST_TILE_SIZE+16,y:pondCenter.y*FOREST_TILE_SIZE+16,radius:130});
    }else if(motif==='rocky'){
      treeCluster(13,3,3,3);for(let i=0;i<6;i++)place('rock',4+rng.next()*7,5+rng.next()*6,20+rng.int(7));
    }else{
      treeCluster(2.5,3,3,3);treeCluster(13,12.5,3,3);for(let i=0;i<3;i++)place(i===0?'log':'stump',6+i*2,8+(i%2),22);
      landmarks.push({id:'flower-clearing',x:cx*FOREST_CHUNK_SIZE+FOREST_CHUNK_SIZE/2,y:cy*FOREST_CHUNK_SIZE+FOREST_CHUNK_SIZE/2,radius:80});
    }
  }

  const ancient={id:'ancient-tree',x:start.x-900,y:start.y-700,radius:95};landmarks.push(ancient);
  const bossArena={x:start.x+950,y:start.y-300,width:600,height:600};
  const spawnZones:Rect[]=[];for(let i=0;i<8;i++){const angle=i*Math.PI/4,x=start.x+Math.cos(angle)*700,y=start.y+Math.sin(angle)*700;spawnZones.push({x:x-160,y:y-140,width:320,height:280});}
  const decorationBuckets:Record<string,Decoration[]>={};for(const decoration of decorations){const key=chunkKey(Math.floor(decoration.x/FOREST_CHUNK_SIZE),Math.floor(decoration.y/FOREST_CHUNK_SIZE));(decorationBuckets[key]??=[]).push(decoration);}
  return{width,height,start,bossArena,grid,decorations,landmarks,chunks,spawnZones,decorationBuckets};
}

function buildLegacyTerrain(rng:MapRng,width:number,height:number,paths:Rect[]){
  const grid=createTerrainGrid(width,height,64);
  for(let y=0;y<grid.rows;y++)for(let x=0;x<grid.cols;x++){const wx=x*grid.tileSize+grid.tileSize/2,wy=y*grid.tileSize+grid.tileSize/2;if(paths.some(path=>wx>=path.x&&wx<=path.x+path.width&&wy>=path.y&&wy<=path.y+path.height))setTerrain(grid,x,y,TERRAIN.path);}
  void rng;return grid;
}

export function generateMap(seed:number,biome:Biome='forest'):StageMap {
  if(biome==='forest'){
    const forest=buildForest(seed),paths:Rect[]=[];
    return{seed,biome,width:forest.width,height:forest.height,playerStart:forest.start,bossArena:forest.bossArena,paths,terrain:forest.grid,decorations:forest.decorations,landmarks:forest.landmarks,spawnZones:forest.spawnZones,chunkSize:FOREST_CHUNK_SIZE,chunks:forest.chunks,decorationBuckets:forest.decorationBuckets};
  }
  const rng=new MapRng(seed),width=2560,height=1440,start={x:width/2,y:height/2},bossArena={x:width-610,y:height/2-250,width:500,height:500};
  const paths:Rect[]=biome==='cave'?[{x:80,y:height/2-150,width:width-160,height:300},{x:width*.45,y:100,width:260,height:height-200}]:[{x:80,y:160,width:width-160,height:260},{x:80,y:520,width:width-160,height:260},{x:80,y:880,width:width-160,height:260}];
  const terrain=buildLegacyTerrain(rng,width,height,paths),decorations:Decoration[]=[],landmarks:Landmark[]=[],spawnZones=[{x:80,y:80,width:450,height:350},{x:width-530,y:80,width:450,height:350},{x:80,y:height-430,width:450,height:350},{x:width-530,y:height-430,width:450,height:350}];
  const chunks={"0,0":{key:'0,0',cx:0,cy:0,motif:'clearing' as ForestMotif,encounterWeight:1,safeSpawn:true}};
  return{seed,biome,width,height,playerStart:start,bossArena,paths,terrain,decorations,landmarks,spawnZones,chunkSize:Math.max(width,height),chunks,decorationBuckets:{'0,0':decorations}};
}

export interface MapValidation { valid:boolean;errors:string[]; }
export function validateMap(map:StageMap):MapValidation {
  const errors:string[]=[],inside=(x:number,y:number)=>x>=0&&x<=map.width&&y>=0&&y<=map.height;
  if(!inside(map.playerStart.x,map.playerStart.y))errors.push('player-start-outside');
  if(map.decorations.some(d=>Math.hypot(d.x-map.playerStart.x,d.y-map.playerStart.y)<d.collisionRadius+100))errors.push('unsafe-player-start');
  if(map.spawnZones.some(zone=>zone.width<200||zone.height<200))errors.push('invalid-spawn-zone');
  if(terrainAtWorld(map.terrain,map.playerStart.x,map.playerStart.y)===TERRAIN.water)errors.push('start-in-water');
  return{valid:errors.length===0,errors};
}

function nearbyDecorations(map:StageMap,x:number,y:number){
  if(!map.chunkSize)return map.decorations;
  const cx=Math.floor(x/map.chunkSize),cy=Math.floor(y/map.chunkSize),result:Decoration[]=[];
  for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++)result.push(...(map.decorationBuckets[chunkKey(cx+ox,cy+oy)]??[]));
  return result;
}

function waterCollision(map:StageMap,x:number,y:number,radius:number){return [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]].some(([ox,oy])=>terrainAtWorld(map.terrain,x+ox,y+oy)===TERRAIN.water);}
export function collides(map:StageMap,x:number,y:number,radius=16){
  if(x<radius||y<radius||x>map.width-radius||y>map.height-radius||waterCollision(map,x,y,radius))return true;
  if(map.landmarks.some(landmark=>landmark.id==='ancient-tree'&&Math.hypot(landmark.x-x,landmark.y-y)<28+radius))return true;
  return nearbyDecorations(map,x,y).some(decoration=>decoration.solid&&Math.hypot(decoration.x-x,decoration.y-y)<decoration.collisionRadius+radius);
}
