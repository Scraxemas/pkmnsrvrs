import {createTerrainGrid,setTerrain,TERRAIN,terrainAtWorld,TerrainCode} from './terrain';
import {distanceToTrails,featureContains,forestHash,ForestRng,planForest} from './forestPlan';
import {FOREST_CHUNK_CELLS,FOREST_CHUNK_SIZE,FOREST_TILE_SIZE,chunkKey} from './worldConstants';
import type {Decoration,ForestMotif,Landmark,Rect,WorldChunk} from './worldgen';

export function regionalMotif(seed:number,cx:number,cy:number):ForestMotif {
  const region=forestHash(seed,Math.floor(cx/3),Math.floor(cy/3))%5,local=forestHash(seed,cx,cy,0x1753)%10;
  const types:ForestMotif[][]=[['forest-wall','forest-wall','forest-wall','clearing','corridor'],['tall-grass','pond','tall-grass','flower-meadow','clearing'],['rocky','cliff','rocky','forest-wall','clearing'],['flower-meadow','clearing','flower-meadow','corridor','tall-grass'],['landmark','forest-wall','corridor','tall-grass','clearing']];
  return types[region][local%5];
}

export function buildForest(seed:number){
  const width=8192,height=8192,features=planForest(seed,width,height),start={x:features.clearings[0].x,y:features.clearings[0].y};
  const grid=createTerrainGrid(width,height,FOREST_TILE_SIZE),decorations:Decoration[]=[],landmarks:Landmark[]=[],chunks:Record<string,WorldChunk>={},treeCells=new Map<string,{x:number;y:number}[]>();
  const raster=(x:number,y:number,rx:number,ry:number,inside:(wx:number,wy:number)=>boolean,value:TerrainCode)=>{
    const x0=Math.max(0,Math.floor((x-rx)/32)),x1=Math.min(grid.cols-1,Math.ceil((x+rx)/32)),y0=Math.max(0,Math.floor((y-ry)/32)),y1=Math.min(grid.rows-1,Math.ceil((y+ry)/32));
    for(let gy=y0;gy<=y1;gy++)for(let gx=x0;gx<=x1;gx++)if(inside(gx*32+16,gy*32+16))setTerrain(grid,gx,gy,value);
  };
  for(const feature of features.ponds)raster(feature.x,feature.y,feature.rx*1.12,feature.ry*1.12,(x,y)=>featureContains(feature,x,y),TERRAIN.water);
  for(const feature of features.cliffs)raster(feature.x,feature.y,feature.rx*1.12,feature.ry*1.12,(x,y)=>featureContains(feature,x,y),TERRAIN.cliff);
  // Paint each connected trail as overlapping native-grid capsules.
  for(const trail of features.trails)for(let i=1;i<trail.points.length;i++){
    const a=trail.points[i-1],b=trail.points[i],length=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.ceil(length/24);
    for(let step=0;step<=steps;step++){
      const t=step/Math.max(1,steps),x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,r=trail.width/2;
      raster(x,y,r,r,(wx,wy)=>Math.hypot(wx-x,wy-y)<=r,TERRAIN.path);
    }
  }
  const protectedPoint=(x:number,y:number)=>features.clearings.some(c=>Math.hypot(c.x-x,c.y-y)<c.radius+30)||features.camps.some(c=>Math.hypot(c.x-x,c.y-y)<c.radius+35);
  const place=(id:string,x:number,y:number,radius:number,solid=true,allowWater=false)=>{
    if(x<60||x>width-60||y<132||y>height-24||Math.hypot(x-start.x,y-start.y)<300)return false;
    const terrain=terrainAtWorld(grid,x,y);
    if(allowWater?terrain!==TERRAIN.water:terrain!==TERRAIN.grass)return false;
    if(solid&&id!=='tent'&&id!=='campLog'&&id!=='supplies'&&protectedPoint(x,y))return false;
    if(id==='tree'){
      const cx=Math.floor(x/64),cy=Math.floor(y/64);
      for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++)if((treeCells.get(chunkKey(cx+ox,cy+oy))??[]).some(t=>Math.hypot(t.x-x,t.y-y)<46))return false;
      const key=chunkKey(cx,cy);if(!treeCells.has(key))treeCells.set(key,[]);treeCells.get(key)!.push({x,y});
    }
    const collisionRadius=solid?(id==='tree'?14:id==='tent'?31:id==='landRock'?Math.max(13,radius*.6):Math.max(10,radius*.5)):0;
    decorations.push({id,x,y,depth:Math.round(y),solid,radius,collisionRadius});return true;
  };
  const flowers=(x:number,y:number,radius:number,rng:ForestRng)=>{
    for(let i=0;i<7+rng.int(5);i++){const a=rng.next()*Math.PI*2,r=Math.sqrt(rng.next())*radius;place(['flowerWhite','flowerPink','flowerYellow'][rng.int(3)],x+Math.cos(a)*r,y+Math.sin(a)*r*.65,0,false);}
  };
  for(let cy=0;cy<16;cy++)for(let cx=0;cx<16;cx++){
    const key=chunkKey(cx,cy),rng=new ForestRng(forestHash(seed,cx,cy,0x517cc1b7)),x=cx*512+256,y=cy*512+256;
    let motif=regionalMotif(seed,cx,cy);
    if(features.clearings.some(c=>Math.hypot(c.x-x,c.y-y)<c.radius))motif='clearing';
    if(features.ponds.some(f=>Math.hypot(f.x-x,f.y-y)<260))motif='pond';
    if(features.cliffs.some(f=>Math.hypot(f.x-x,f.y-y)<260))motif='cliff';
    if(features.camps.some(c=>Math.hypot(c.x-x,c.y-y)<280))motif='campsite';
    chunks[key]={key,cx,cy,motif,encounterWeight:motif==='tall-grass'?1.35:motif==='clearing'?.8:1,safeSpawn:motif==='clearing'||motif==='corridor',featureIds:[...features.ponds,...features.cliffs,...features.camps].filter(f=>Math.abs(f.x-x)<512&&Math.abs(f.y-y)<512).map(f=>f.id)};
    if(motif==='tall-grass'||(motif==='pond'&&rng.next()<.6)){
      const gx=cx*512+130+rng.next()*240,gy=cy*512+130+rng.next()*240,rx=95+rng.int(100),ry=75+rng.int(85),phase=rng.next()*Math.PI*2;
      raster(gx,gy,rx*1.2,ry*1.2,(wx,wy)=>!protectedPoint(wx,wy)&&terrainAtWorld(grid,wx,wy)===TERRAIN.grass&&featureContains({id:'grass',x:gx,y:gy,rx,ry,phase},wx,wy),TERRAIN.tallGrass);
    }
    const groves=motif==='forest-wall'?3:motif==='clearing'||motif==='campsite'?1:2;
    for(let grove=0;grove<groves;grove++){
      const ax=cx*512+80+rng.next()*350,ay=cy*512+100+rng.next()*330,count=3+rng.int(6),spread=75+rng.int(80);
      let planted=0;for(let i=0;i<count*4;i++){
        const angle=rng.next()*Math.PI*2,r=Math.sqrt(rng.next())*spread,tx=ax+Math.cos(angle)*r,ty=ay+Math.sin(angle)*r*.8;
        if(place('tree',tx,ty,30)&&++planted>=count)break;
      }
      if(rng.next()<.5)place('bush',ax+70,ay+40,15);
      if(rng.next()<.3)place('sapling',ax-70,ay-20,20);
    }
    if(motif==='rocky'){
      const rx=cx*512+170+rng.next()*170,ry=cy*512+150+rng.next()*190;
      for(let i=0;i<5+rng.int(3);i++)place('landRock',rx+(rng.next()-.5)*180,ry+(rng.next()-.5)*150,24+rng.int(12));
    }
    if(motif==='flower-meadow'||motif==='landmark'){
      const fx=cx*512+140+rng.next()*230,fy=cy*512+140+rng.next()*230;
      flowers(fx,fy,75+rng.int(55),rng);landmarks.push({id:'flower-clearing',x:fx,y:fy,radius:90});
    }
  }
  for(const pond of features.ponds){
    landmarks.push({id:'pond',x:pond.x,y:pond.y,radius:Math.max(pond.rx,pond.ry)});
    const rng=new ForestRng(forestHash(seed,Math.floor(pond.x),Math.floor(pond.y)));
    for(let i=0;i<2;i++)place('waterRock',pond.x+(rng.next()-.5)*pond.rx,pond.y+(rng.next()-.5)*pond.ry,20,false,true);
    for(let i=0;i<6;i++){const a=rng.next()*Math.PI*2;place('reeds',pond.x+Math.cos(a)*(pond.rx+22),pond.y+Math.sin(a)*(pond.ry+22),0,false);}
  }
  for(const camp of features.camps){
    place('tent',camp.x,camp.y,42);place('campLog',camp.x-80,camp.y+65,24);place('campLog',camp.x+72,camp.y+65,24);place('supplies',camp.x+65,camp.y+5,16);
    flowers(camp.x-96,camp.y-60,45,new ForestRng(forestHash(seed,Math.floor(camp.x),Math.floor(camp.y))));
    landmarks.push({id:'campsite',x:camp.x,y:camp.y+110,radius:camp.radius});
  }
  for(const c of features.clearings)landmarks.push({id:'clearing',x:c.x,y:c.y,radius:c.radius});
  for(const c of features.cliffs)landmarks.push({id:'cliff',x:c.x,y:c.y,radius:Math.max(c.rx,c.ry)});
  const ancientClearing=features.clearings.slice(2).find(c=>features.camps.every(camp=>Math.hypot(camp.x-c.x,camp.y-c.y)>c.radius+250))??features.clearings[1];
  landmarks.push({id:'ancient-tree',x:ancientClearing.x+ancientClearing.radius*.5,y:ancientClearing.y-ancientClearing.radius*.4,radius:95});
  const arena=features.clearings[1],bossArena={x:arena.x-300,y:arena.y-300,width:600,height:600};
  const spawnZones:Rect[]=[];for(let i=0;i<8;i++){const a=i*Math.PI/4;spawnZones.push({x:start.x+Math.cos(a)*680-160,y:start.y+Math.sin(a)*680-140,width:320,height:280});}
  const decorationBuckets:Record<string,Decoration[]>={};for(const decoration of decorations){const key=chunkKey(Math.floor(decoration.x/512),Math.floor(decoration.y/512));(decorationBuckets[key]??=[]).push(decoration);}
  return{width,height,start,bossArena,grid,decorations,landmarks,chunks,spawnZones,decorationBuckets,features};
}
