import {createTerrainGrid,setTerrain,TERRAIN,TerrainGrid,terrainAtWorld} from './terrain';

export type Biome='forest'|'cave'|'ship';
export interface Rect { x:number;y:number;width:number;height:number; }
export interface Decoration { id:string;x:number;y:number;depth:number;solid:boolean;radius:number;collisionRadius:number; }
export interface Landmark { id:string;x:number;y:number;radius:number; }
export interface StageMap { seed:number;biome:Biome;width:number;height:number;playerStart:{x:number;y:number};bossArena:Rect;paths:Rect[];terrain:TerrainGrid;decorations:Decoration[];landmarks:Landmark[];spawnZones:Rect[]; }

class MapRng {constructor(public value:number){}next(){this.value=(this.value*1664525+1013904223)>>>0;return this.value/4294967296;}int(n:number){return Math.floor(this.next()*n);}}
const intersects=(a:Rect,b:Rect)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;

function carve(grid:TerrainGrid,x:number,y:number,radius=1,value=1 as const){for(let oy=-radius;oy<=radius;oy++)for(let ox=-radius;ox<=radius;ox++)if(ox*ox+oy*oy<=radius*radius+1)setTerrain(grid,x+ox,y+oy,value);}

function buildTerrain(rng:MapRng,width:number,height:number,biome:Biome,paths:Rect[],landmarks:Landmark[]){
  const grid=createTerrainGrid(width,height,64);
  if(biome!=='forest'){
    for(let y=0;y<grid.rows;y++)for(let x=0;x<grid.cols;x++){const wx=x*grid.tileSize+grid.tileSize/2,wy=y*grid.tileSize+grid.tileSize/2;if(paths.some(path=>wx>=path.x&&wx<=path.x+path.width&&wy>=path.y&&wy<=path.y+path.height))setTerrain(grid,x,y,TERRAIN.path);}
    return grid;
  }
  const middleX=Math.floor(grid.cols/2),middleY=Math.floor(grid.rows/2),mainY:number[]=[];
  let y=middleY;
  for(let x=0;x<grid.cols;x++){if(x%4===0&&x>2&&x<grid.cols-3)y=Math.max(4,Math.min(grid.rows-5,y+rng.int(3)-1));mainY[x]=y;carve(grid,x,y,1,TERRAIN.path);}
  let x=middleX;
  for(let row=0;row<grid.rows;row++){if(row%4===0&&row>2&&row<grid.rows-3)x=Math.max(5,Math.min(grid.cols-6,x+rng.int(3)-1));carve(grid,x,row,1,TERRAIN.path);}
  for(const [sx,sy] of [[4,3],[grid.cols-5,3],[4,grid.rows-4],[grid.cols-5,grid.rows-4]] as const){const targetY=mainY[sx];for(let row=Math.min(sy,targetY);row<=Math.max(sy,targetY);row++)carve(grid,sx,row,1,TERRAIN.path);}
  carve(grid,middleX,middleY,2,TERRAIN.path);
  const flower=landmarks.find(landmark=>landmark.id==='flower-clearing');if(flower)carve(grid,Math.floor(flower.x/grid.tileSize),Math.floor(flower.y/grid.tileSize),2,TERRAIN.path);
  const pond=landmarks.find(landmark=>landmark.id==='pond');if(pond){const px=Math.floor(pond.x/grid.tileSize),py=Math.floor(pond.y/grid.tileSize);for(let oy=-2;oy<=2;oy++)for(let ox=-2;ox<=2;ox++)if(ox*ox/4+oy*oy/2.25<=1&&terrainAtWorld(grid,(px+ox)*grid.tileSize,(py+oy)*grid.tileSize)!==TERRAIN.path)setTerrain(grid,px+ox,py+oy,TERRAIN.water);}
  return grid;
}

export function generateMap(seed:number,biome:Biome='forest'):StageMap {
  const rng=new MapRng(seed),width=2560,height=1440,start={x:width/2,y:height/2},bossArena={x:width-610,y:height/2-250,width:500,height:500};
  const paths:Rect[]=biome==='forest'?[{x:0,y:height/2-96,width,height:192},{x:width/2-96,y:0,width:192,height}]:biome==='cave'?[{x:80,y:height/2-150,width:width-160,height:300},{x:width*.45,y:100,width:260,height:height-200}]:[{x:80,y:160,width:width-160,height:260},{x:80,y:520,width:width-160,height:260},{x:80,y:880,width:width-160,height:260}];
  const landmarks:Landmark[]=biome==='forest'?[{id:'ancient-tree',x:420,y:330,radius:85},{id:'pond',x:1750,y:1080,radius:100},{id:'flower-clearing',x:750,y:1120,radius:90}]:biome==='cave'?[{id:'moonlight-shaft',x:580,y:350,radius:90},{id:'fossil-site',x:1380,y:1080,radius:100},{id:'underground-pool',x:2050,y:360,radius:110}]:[{id:'main-deck',x:500,y:280,radius:120},{id:'dining-room',x:1450,y:650,radius:100},{id:'cargo-hold',x:2100,y:1020,radius:120}];
  const terrain=buildTerrain(rng,width,height,biome,paths,landmarks),decorations:Decoration[]=[],count=biome==='forest'?150:110;
  for(let i=0;i<count;i++){
    const x=50+rng.next()*(width-100),y=50+rng.next()*(height-100),radius=biome==='forest'?30+rng.int(25):20+rng.int(35),point={x:x-radius,y:y-radius,width:radius*2,height:radius*2},safe={x:start.x-170,y:start.y-170,width:340,height:340};
    if(intersects(point,safe)||intersects(point,bossArena)||terrainAtWorld(terrain,x,y)!==TERRAIN.grass)continue;
    const id=biome==='forest'?(i%7===0?'log':'tree'):(i%6===0?'crystal':'rock'),collisionRadius=id==='tree'?Math.max(12,Math.round(radius*.3)):Math.max(14,Math.round(radius*.58));
    decorations.push({id,x,y,depth:Math.round(y),solid:true,radius,collisionRadius});
  }
  return{seed,biome,width,height,playerStart:start,bossArena,paths,terrain,decorations,landmarks,spawnZones:[{x:80,y:80,width:450,height:350},{x:width-530,y:80,width:450,height:350},{x:80,y:height-430,width:450,height:350},{x:width-530,y:height-430,width:450,height:350}]};
}

export interface MapValidation { valid:boolean;errors:string[]; }
export function validateMap(map:StageMap):MapValidation {const errors:string[]=[],inside=(x:number,y:number)=>x>=0&&x<=map.width&&y>=0&&y<=map.height;if(!inside(map.playerStart.x,map.playerStart.y))errors.push('player-start-outside');if(map.decorations.some(d=>Math.hypot(d.x-map.playerStart.x,d.y-map.playerStart.y)<d.collisionRadius+100))errors.push('unsafe-player-start');if(map.decorations.some(d=>d.x+d.collisionRadius>map.bossArena.x&&d.x-d.collisionRadius<map.bossArena.x+map.bossArena.width&&d.y+d.collisionRadius>map.bossArena.y&&d.y-d.collisionRadius<map.bossArena.y+map.bossArena.height))errors.push('blocked-boss-arena');if(map.spawnZones.some(zone=>zone.width<200||zone.height<200))errors.push('invalid-spawn-zone');if(terrainAtWorld(map.terrain,map.playerStart.x,map.playerStart.y)!==TERRAIN.path)errors.push('start-not-connected');return{valid:errors.length===0,errors};}
function waterCollision(map:StageMap,x:number,y:number,radius:number){return [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]].some(([ox,oy])=>terrainAtWorld(map.terrain,x+ox,y+oy)===TERRAIN.water);}
export function collides(map:StageMap,x:number,y:number,radius=16){if(x<radius||y<radius||x>map.width-radius||y>map.height-radius||waterCollision(map,x,y,radius))return true;if(map.landmarks.some(landmark=>landmark.id==='ancient-tree'&&Math.hypot(landmark.x-x,landmark.y-y)<26+radius))return true;return map.decorations.some(decoration=>decoration.solid&&Math.hypot(decoration.x-x,decoration.y-y)<decoration.collisionRadius+radius);}
