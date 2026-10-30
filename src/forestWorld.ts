import {createTerrainGrid,TERRAIN,terrainAtWorld,TerrainCode} from './terrain';
import {distanceToTrails,featureContains,forestHash,ForestRng,planForest,type EllipseFeature,type ForestFeatures,type Point,type Trail} from './forestPlan';
import {FOREST_CHUNK_CELLS,FOREST_TILE_SIZE,chunkKey} from './worldConstants';
import type {Decoration,ForestMotif,Landmark,Rect,WorldChunk} from './worldgen';

export interface ForestChunkData extends WorldChunk {
  terrain:ReturnType<typeof createTerrainGrid>;
  decorations:Decoration[];
  trails:Trail[];
  template:string;
  rotation:number;
}

/** Authored arrangements, rotated and varied as a unit, rather than tile noise. */
export const FOREST_TEMPLATES=[
  {id:'woodland-groves',motif:'forest-wall',groves:[[.17,.18],[.28,.24],[.18,.76],[.76,.18],[.78,.76],[.69,.83]],grass:[[.25,.58]],rocks:[[.68,.31]],ponds:[],cliffs:[],logs:[[.25,.33]]},
  {id:'sunlit-meadow',motif:'flower-meadow',groves:[[.16,.18],[.81,.22],[.18,.79],[.79,.81]],grass:[[.74,.66]],rocks:[[.22,.62]],ponds:[],cliffs:[],logs:[[.77,.32]]},
  {id:'reedy-pond',motif:'pond',groves:[[.17,.19],[.75,.75],[.19,.77],[.79,.23]],grass:[[.7,.27],[.74,.75]],rocks:[[.19,.64]],ponds:[[.27,.28]],cliffs:[],logs:[[.22,.79]]},
  {id:'bug-nesting-thicket',motif:'tall-grass',groves:[[.17,.19],[.79,.23],[.21,.78],[.78,.79],[.3,.25]],grass:[[.24,.31],[.72,.67],[.24,.72]],rocks:[[.77,.33]],ponds:[],cliffs:[],logs:[[.22,.81],[.81,.65]]},
  {id:'mossy-outcrop',motif:'rocky',groves:[[.18,.2],[.78,.19],[.22,.76],[.77,.77]],grass:[[.75,.69]],rocks:[[.24,.28],[.77,.28],[.22,.7]],ponds:[],cliffs:[[.26,.27]],logs:[[.72,.8]]},
  {id:'narrow-woodland',motif:'corridor',groves:[[.32,.28],[.68,.27],[.29,.71],[.71,.7],[.2,.5],[.8,.5]],grass:[[.18,.22],[.8,.77]],rocks:[[.22,.73]],ponds:[],cliffs:[],logs:[[.75,.24]]},
  {id:'open-combat-glade',motif:'clearing',groves:[[.15,.18],[.82,.17],[.16,.82],[.83,.81]],grass:[[.18,.68]],rocks:[[.79,.3]],ponds:[],cliffs:[],logs:[[.25,.83]]},
  {id:'hidden-forest-camp',motif:'campsite',groves:[[.18,.19],[.79,.23],[.2,.79],[.79,.78]],grass:[[.76,.29]],rocks:[[.23,.74]],ponds:[],cliffs:[],logs:[[.23,.31]]},
] as const;

export function regionalMotif(seed:number,cx:number,cy:number):ForestMotif {
  const region=forestHash(seed,Math.floor(cx/3),Math.floor(cy/3),0x5187);
  const index=(forestHash(seed,cx,cy,0x1753)+(region%3))%FOREST_TEMPLATES.length;
  return FOREST_TEMPLATES[index].motif;
}

export function buildForest(seed:number){
  // The original authored-scale forest plan remains the campaign's recognisable
  // core. It is now rasterised only for resident chunks, with wilderness beyond.
  const width=8192,height=8192,features=planForest(seed,width,height);
  const start={x:features.clearings[0].x,y:features.clearings[0].y};
  const arena=features.clearings[1],bossArena={x:arena.x-300,y:arena.y-300,width:600,height:600};
  const pikachu=features.clearings[2],exit=features.clearings[features.clearings.length-1];
  const landmarks:Landmark[]=[
    {id:'entrance',...start,radius:350},
    {id:'pikachu-hollow',x:pikachu.x,y:pikachu.y,radius:pikachu.radius},
    {id:'beedrill-nest',x:arena.x,y:arena.y,radius:440},
    {id:'pewter-exit',x:exit.x,y:exit.y,radius:exit.radius},
    ...features.clearings.map(c=>({id:'clearing',x:c.x,y:c.y,radius:c.radius})),
    ...features.ponds.map(c=>({id:'pond',x:c.x,y:c.y,radius:Math.max(c.rx,c.ry)})),
    ...features.cliffs.map(c=>({id:'cliff',x:c.x,y:c.y,radius:Math.max(c.rx,c.ry)})),
    ...features.camps.map(c=>({id:'campsite',x:c.x,y:c.y+110,radius:c.radius})),
  ];
  const ancient=features.clearings.slice(3).find(c=>features.camps.every(camp=>Math.hypot(camp.x-c.x,camp.y-c.y)>c.radius+250))??features.clearings[3];
  landmarks.push({id:'ancient-tree',x:ancient.x+ancient.radius*.5,y:ancient.y-ancient.radius*.4,radius:95});
  const spawnZones:Rect[]=[];for(let i=0;i<8;i++){const a=i*Math.PI/4;spawnZones.push({x:start.x+Math.cos(a)*680-160,y:start.y+Math.sin(a)*680-140,width:320,height:280});}
  return{width,height,start,bossArena,landmarks,spawnZones,features};
}

/** Shared edge hashes give both neighbours exactly the same walkable port. */
export function forestChunkPorts(seed:number,cx:number,cy:number,cells=FOREST_CHUNK_CELLS){
  const size=cells*FOREST_TILE_SIZE,offset=(value:number)=>(Math.floor(cells*.25)+value%Math.max(1,Math.floor(cells*.5)))*FOREST_TILE_SIZE+FOREST_TILE_SIZE/2;
  return{
    north:{x:cx*size+offset(forestHash(seed,cx,cy,0x4e)),y:cy*size},
    south:{x:cx*size+offset(forestHash(seed,cx,cy+1,0x4e)),y:(cy+1)*size},
    west:{x:cx*size,y:cy*size+offset(forestHash(seed,cx,cy,0x45))},
    east:{x:(cx+1)*size,y:cy*size+offset(forestHash(seed,cx+1,cy,0x45))},
  };
}

export function generateForestChunk(seed:number,cx:number,cy:number,features:ForestFeatures,cells=FOREST_CHUNK_CELLS):ForestChunkData {
  const size=cells*FOREST_TILE_SIZE,x0=cx*size,y0=cy*size,rng=new ForestRng(forestHash(seed,cx,cy,0x517cc1b7));
  const motif=regionalMotif(seed,cx,cy),template=FOREST_TEMPLATES.find(t=>t.motif===motif)!,rotation=rng.int(4),mirror=rng.next()<.5?-1:1;
  const point=(u:number,v:number):Point=>{let x=(u-.5)*mirror,y=v-.5;for(let i=0;i<rotation;i++)[x,y]=[-y,x];return{x:x0+(x+.5)*size,y:y0+(y+.5)*size};};
  const centre={x:x0+size*(.46+rng.next()*.08),y:y0+size*(.46+rng.next()*.08)},ports=forestChunkPorts(seed,cx,cy,cells);
  const trails:Trail[]=Object.entries(ports).map(([side,port])=>{
    const dx=centre.x-port.x,dy=centre.y-port.y,length=Math.hypot(dx,dy)||1;
    const inset={x:port.x+(side==='west'?128:side==='east'?-128:0),y:port.y+(side==='north'?128:side==='south'?-128:0)},bend=(rng.next()-.5)*size*.12;
    return{id:`${cx},${cy}-${side}`,width:128,points:[port,inset,{x:(inset.x+centre.x)/2-dy/length*bend,y:(inset.y+centre.y)/2+dx/length*bend},centre]};
  });
  const inChunk=(p:Point,padding=0)=>p.x>=x0-padding&&p.y>=y0-padding&&p.x<x0+size+padding&&p.y<y0+size+padding;
  // Join handcrafted clearings and the original trail network to the chunk's
  // port network. No landmark depends on a random opening.
  for(const clearing of features.clearings.filter(p=>inChunk(p)))trails.push({id:`access-${clearing.id}`,width:144,points:[centre,clearing]});
  const authoredTrails=features.trails.filter(t=>t.points.some(p=>inChunk(p,size)));
  for(const trail of authoredTrails){
    trails.push(trail);
    // Clip each intersecting segment. Long segments can cross a chunk without
    // an authored control point in it, and still need a local connector.
    for(let i=1;i<trail.points.length;i++){
      const a=trail.points[i-1],b=trail.points[i],dx=b.x-a.x,dy=b.y-a.y;let lo=0,hi=1,valid=true;
      const shoulder=trail.width/2;
      for(const [p,q] of [[-dx,a.x-x0+shoulder],[dx,x0+size+shoulder-a.x],[-dy,a.y-y0+shoulder],[dy,y0+size+shoulder-a.y]]){
        if(p===0){if(q<0)valid=false;continue;}const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);
      }
      if(valid&&lo<=hi){const t=(lo+hi)/2,local={x:a.x+dx*t,y:a.y+dy*t};trails.push({id:`join-${trail.id}-${i}`,width:128,points:[centre,local]});}
    }
  }
  const localFeature=(positions:readonly (readonly number[])[],prefix:string,rx:number,ry:number):EllipseFeature[]=>positions.map(([u,v],i)=>({...point(u,v),id:`${prefix}-${cx},${cy}-${i}`,rx:rx*size/2048,ry:ry*size/2048,phase:rng.next()*Math.PI*2}));
  const ponds=[...features.ponds.filter(p=>inChunk(p,400)),...localFeature(template.ponds,'pond',235,170)];
  const cliffs=[...features.cliffs.filter(p=>inChunk(p,400)),...localFeature(template.cliffs,'cliff',165,130)];
  const patches=localFeature(template.grass,'grass',235+rng.int(100),170+rng.int(90));
  const clearings=features.clearings.filter(p=>inChunk(p,500)),camps=features.camps.filter(p=>inChunk(p,300));
  const pathDistance=(x:number,y:number)=>distanceToTrails({trails} as ForestFeatures,x,y);
  const protectedPoint=(x:number,y:number)=>clearings.some(c=>Math.hypot(c.x-x,c.y-y)<c.radius+35)||camps.some(c=>Math.hypot(c.x-x,c.y-y)<c.radius+35)||(motif==='clearing'||motif==='flower-meadow')&&Math.hypot(x-centre.x,y-centre.y)<380;
  const terrain=createTerrainGrid(size,size,FOREST_TILE_SIZE);terrain.originCol=cx*cells;terrain.originRow=cy*cells;
  for(let y=0;y<cells;y++)for(let x=0;x<cells;x++){
    const wx=x0+x*32+16,wy=y0+y*32+16;let value:TerrainCode=TERRAIN.grass;
    if(pathDistance(wx,wy)<=0)value=TERRAIN.path;
    else if(!protectedPoint(wx,wy)){
      if(ponds.some(p=>featureContains(p,wx,wy)))value=TERRAIN.water;
      else if(cliffs.some(p=>featureContains(p,wx,wy)))value=TERRAIN.cliff;
      else if(patches.some(p=>featureContains(p,wx,wy)))value=TERRAIN.tallGrass;
    }
    terrain.cells[y*cells+x]=value;
  }
  const decorations:Decoration[]=[],treeCells=new Map<string,Point[]>();
  const place=(id:string,x:number,y:number,radius:number,solid=true,allowWater=false,camp=false)=>{
    if(!inChunk({x,y})||Math.hypot(x-features.clearings[0].x,y-features.clearings[0].y)<300)return false;
    const ground=terrainAtWorld(terrain,x,y);if(allowWater?ground!==TERRAIN.water:ground!==TERRAIN.grass&&ground!==TERRAIN.tallGrass)return false;
    if(solid&&(!camp&&protectedPoint(x,y)||pathDistance(x,y)<radius+48))return false;
    if(id==='tree'){
      const tx=Math.floor(x/64),ty=Math.floor(y/64);for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++)if(treeCells.get(chunkKey(tx+ox,ty+oy))?.some(t=>Math.hypot(t.x-x,t.y-y)<52))return false;
      const key=chunkKey(tx,ty);if(!treeCells.has(key))treeCells.set(key,[]);treeCells.get(key)!.push({x,y});
    }
    const collisionRadius=solid?(id==='tree'?14:id==='tent'?31:id==='landRock'?Math.max(13,radius*.6):Math.max(10,radius*.5)):0;
    decorations.push({id,x,y,depth:Math.round(y),solid,radius,collisionRadius,persistentId:`${cx},${cy}:${decorations.length}`});return true;
  };
  for(const [u,v] of template.groves){
    const anchor=point(u+(rng.next()-.5)*.055,v+(rng.next()-.5)*.055),count=motif==='forest-wall'||motif==='corridor'?28:18;
    for(let i=0;i<count*3;i++){const a=rng.next()*Math.PI*2,r=Math.sqrt(rng.next())*(150+rng.next()*70);place('tree',anchor.x+Math.cos(a)*r,anchor.y+Math.sin(a)*r*.85,30);}
    place('bush',anchor.x+180,anchor.y+35,15);if(rng.next()<.6)place('sapling',anchor.x-170,anchor.y-45,20);
  }
  for(const [u,v] of template.rocks){const p=point(u,v);for(let i=0;i<6;i++)place('landRock',p.x+(rng.next()-.5)*180,p.y+(rng.next()-.5)*150,24+rng.int(12));}
  for(const [u,v] of template.logs){const p=point(u,v);place('campLog',p.x,p.y,28);place('bush',p.x+52,p.y+10,15,false);}
  if(motif==='flower-meadow'||motif==='clearing'||motif==='campsite')for(let i=0;i<30;i++){const a=rng.next()*Math.PI*2,r=190+rng.next()*170;place(['flowerWhite','flowerPink','flowerYellow'][rng.int(3)],centre.x+Math.cos(a)*r,centre.y+Math.sin(a)*r*.7,0,false);}
  for(const pond of ponds){for(let i=0;i<2;i++)place('waterRock',pond.x+(rng.next()-.5)*pond.rx,pond.y+(rng.next()-.5)*pond.ry,20,false,true);for(let i=0;i<8;i++){const a=i*Math.PI/4;place('reeds',pond.x+Math.cos(a)*(pond.rx+22),pond.y+Math.sin(a)*(pond.ry+22),0,false);}}
  for(const camp of camps){place('tent',camp.x,camp.y,42,true,false,true);place('campLog',camp.x-80,camp.y+65,24,true,false,true);place('campLog',camp.x+72,camp.y+65,24,true,false,true);place('supplies',camp.x+65,camp.y+5,16,true,false,true);}
  return{key:chunkKey(cx,cy),cx,cy,motif,encounterWeight:motif==='tall-grass'?1.35:motif==='clearing'?.8:1,safeSpawn:motif==='clearing'||motif==='corridor',featureIds:[...ponds,...cliffs,...camps].map(f=>f.id),terrain,decorations,trails,template:template.id,rotation};
}
