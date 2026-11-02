import {createTerrainGrid,TERRAIN,type TerrainCode} from './terrain';
import {forestHash,forestNoise,ForestRng,planForest,type ForestFeatures,type Trail} from './forestPlan';
import {FOREST_CHUNK_CELLS,FOREST_TILE_SIZE,chunkKey} from './worldConstants';
import type {Decoration,ForestMotif,Landmark,Rect,WorldChunk} from './worldgen';
import {minSolidVisualDistance} from './decorationSpacing';

export interface ForestChunkData extends WorldChunk {
 terrain:ReturnType<typeof createTerrainGrid>;
 decorations:Decoration[];
 landmarks:Landmark[];
 trails:Trail[];template:string;rotation:number;
}
export const FOREST_TEMPLATES=[
 {id:'standard-woodland',motif:'woodland'},
 {id:'flowering-fields',motif:'flower-meadow'},
 {id:'mossy-ground',motif:'mossy'},
 {id:'bug-habitat',motif:'bug-habitat'},
 {id:'old-woodland',motif:'old-woodland'},
 {id:'open-meadow',motif:'open-meadow'}
] as const;

/** Regional themes are selected using smooth, global coordinate noise. No room or maze graph. */
export function regionalMotif(seed:number,cx:number,cy:number):ForestMotif {
 const n=forestNoise(seed,(cx+.5)*FOREST_CHUNK_CELLS*FOREST_TILE_SIZE,(cy+.5)*FOREST_CHUNK_CELLS*FOREST_TILE_SIZE,7600,0x5178);
 return FOREST_TEMPLATES[Math.min(FOREST_TEMPLATES.length-1,Math.floor(n*FOREST_TEMPLATES.length))].motif;
}
export function buildForest(seed:number){
 const features=planForest(seed),rng=new ForestRng(forestHash(seed,0,0,0x4276));
 const site=(r:number,a:number)=>({x:Math.round(Math.cos(a)*r),y:Math.round(Math.sin(a)*r)});
 const pikachu=site(2050+rng.int(1800),.65+rng.next()*.8);
 const nest=site(2350+rng.int(2200),2.3+rng.next()*.6);
 const exit=site(3700+rng.int(2200),4.3+rng.next()*.6);
 features.clearings.push({id:'pikachu-hollow',...pikachu,radius:200},{id:'beedrill-nest',...nest,radius:200},{id:'pewter-exit',...exit,radius:200});
 const landmarks:Landmark[]=[
  {id:'entrance',x:0,y:0,radius:160},
  {id:'pikachu-hollow',...pikachu,radius:120},
  {id:'beedrill-nest',...nest,radius:110},
  {id:'pewter-exit',...exit,radius:115},
  ...features.camps.map(c=>({id:'campsite:'+c.id,x:c.x,y:c.y,radius:c.radius}))
 ];
 const spawnZones:Rect[]=[];for(let i=0;i<8;i++){const a=i*Math.PI/4;spawnZones.push({x:Math.cos(a)*650-160,y:Math.sin(a)*650-140,width:320,height:280});}
 return{width:Number.POSITIVE_INFINITY,height:Number.POSITIVE_INFINITY,start:{x:0,y:0},
  bossArena:{x:-300,y:-300,width:600,height:600},landmarks,spawnZones,features};
}
/** Kept for legacy callers; the new world does not require trail ports for traversal. */
export function forestChunkPorts(seed:number,cx:number,cy:number,cells=FOREST_CHUNK_CELLS){
 const size=cells*FOREST_TILE_SIZE,offset=(n:number)=>size*(.3+(n%400)/1000);
 return{north:{x:cx*size+offset(forestHash(seed,cx,cy,0x4e)),y:cy*size},
 south:{x:cx*size+offset(forestHash(seed,cx,cy+1,0x4e)),y:(cy+1)*size},
 west:{x:cx*size,y:cy*size+offset(forestHash(seed,cx,cy,0x45))},
 east:{x:(cx+1)*size,y:cy*size+offset(forestHash(seed,cx+1,cy,0x45))}};
}
const NEIGHBOUR_SPACING=224;
export function generateForestChunk(seed:number,cx:number,cy:number,features:ForestFeatures,cells=FOREST_CHUNK_CELLS):ForestChunkData{
 const size=cells*FOREST_TILE_SIZE,x0=cx*size,y0=cy*size,rng=new ForestRng(forestHash(seed,cx,cy,0x517cc1b7));
 const motif=regionalMotif(seed,cx,cy),landmarks:Landmark[]=[];
 const inChunk=(x:number,y:number)=>x>=x0&&x<x0+size&&y>=y0&&y<y0+size;
 const staticSites=[...features.camps.map(c=>({id:'campsite',x:c.x,y:c.y,radius:c.radius})),...features.clearings];
 const protectedSite=(x:number,y:number)=>staticSites.some(s=>Math.hypot(s.x-x,s.y-y)<s.radius+70);
 // A rare landmark can be discovered in any direction, including negative chunks.
 // Exact stable IDs allow discoveries to persist after unloading.
 const rare=forestHash(seed,cx,cy,0x91b3)%36;
 if(rare===0||rare===1){
  const lx=x0+size*(.3+rng.next()*.4),ly=y0+size*(.3+rng.next()*.4);
  if(Math.hypot(lx,ly)>900&&!protectedSite(lx,ly))
   landmarks.push({id:(rare===0?'campsite:':'ancient-tree:')+chunkKey(cx,cy),x:lx,y:ly,radius:115});
 }
 if(forestHash(seed,cx,cy,0x544d)%92===0){
  const x=x0+size*.40,y=y0+size*.58;
  if(Math.hypot(x,y)>1000&&!protectedSite(x,y)&&landmarks.every(l=>Math.hypot(l.x-x,l.y-y)>320))
   landmarks.push({id:'tm-cache:'+chunkKey(cx,cy),x,y,radius:60});
 }
 const blockedSites=[...staticSites,...landmarks];
 const siteFree=(x:number,y:number,padding=0)=>blockedSites.every(p=>Math.hypot(p.x-x,p.y-y)>p.radius+padding);
 const terrain=createTerrainGrid(size,size,FOREST_TILE_SIZE);terrain.originCol=cx*cells;terrain.originRow=cy*cells;
 const moss=motif==='mossy',bugs=motif==='bug-habitat',flowers=motif==='flower-meadow';
 // Low-amplitude, globally sampled patches. All tiles are flat and walkable:
 // "path" is used only for tiny bare-earth spots, never connected roads.
 for(let y=0;y<cells;y++)for(let x=0;x<cells;x++){
  const wx=x0+x*FOREST_TILE_SIZE+16,wy=y0+y*FOREST_TILE_SIZE+16;
  const detail=forestNoise(seed,wx,wy,96,0x70a1),ground=forestNoise(seed,wx,wy,225,0x14f5);
  let value:TerrainCode=TERRAIN.grass;
  if(siteFree(wx,wy,40)){
   if(ground>.91&&detail>.70)value=TERRAIN.path;
   else if((bugs||flowers)&&ground<.24&&detail>.43)value=TERRAIN.tallGrass;
   else if(!bugs&&ground<.16&&detail>.65)value=TERRAIN.tallGrass;
  }
  if(moss&&value===TERRAIN.path&&detail<.8)value=TERRAIN.grass;
  terrain.cells[y*cells+x]=value;
 }
 // Globally aligned candidate cells avoid discontinuities and solid clusters at
 // resident chunk boundaries; placement does not depend on exploration order.
 const decorations:Decoration[]=[];
 const add=(id:string,x:number,y:number,radius:number,solid=false,siteDecoration=false)=>{
  if(!inChunk(x,y)||Math.hypot(x,y)<390||(!siteDecoration&&!siteFree(x,y,solid?150:42)))return;
  const col=Math.floor(x/FOREST_TILE_SIZE)-cx*cells,row=Math.floor(y/FOREST_TILE_SIZE)-cy*cells;
  if(terrain.cells[row*cells+col]===TERRAIN.path)return;
  decorations.push({id,x,y,radius,solid,collisionRadius:solid?(id==='tree'?14:id==='landRock'?(radius>28?22:14):16):0,
   depth:Math.round(y),persistentId:`${cx},${cy}:${decorations.length}`});
 };
 const density=motif==='open-meadow'?.58:motif==='old-woodland'?1.2:motif==='bug-habitat'?1.1:1;
 // A solid prop's position and priority are determined by its GLOBAL grid cell.
 // Reject competing props with higher priority, including candidates owned by
 // neighboring chunks. Checking only resident decorations caused visual walls
 // to appear at seams; a local per-chunk rejection would be order-dependent.
 const candidate=(gx:number,gy:number)=>{
  const h=forestHash(seed,gx,gy,0x2d1e),choice=forestHash(seed,gx,gy,0x177e)%10;
  const x=gx*NEIGHBOUR_SPACING+65+((h>>>8)%95),y=gy*NEIGHBOUR_SPACING+65+((h>>>16)%95);
  const id=choice<=3?'tree':choice<=5?'landRock':choice===6?'campLog':choice===7?'sapling':'bush';
  const radius=id==='tree'?30:id==='landRock'?(forestHash(seed,gx,gy,0x40a2)%6===0?34:24):id==='campLog'?25:18;
  return{gx,gy,h,x,y,id,radius,solid:choice<=5,roll:h/4294967295};
 };
 const visualSpaceClear=(d:ReturnType<typeof candidate>)=>{
  for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
   if(!ox&&!oy)continue;
   const other=candidate(d.gx+ox,d.gy+oy);
   // .156 is the maximum possible density-adjusted rate in any motif.
   if(!other.solid||other.roll>.156)continue;
   if(Math.hypot(other.x-d.x,other.y-d.y)>=minSolidVisualDistance(d,other))continue;
   // Stable hash priority resolves conflicts identically on both sides of
   // a chunk boundary, even when generation order is reversed.
   if(other.h<d.h||(other.h===d.h&&(other.gy<d.gy||(other.gy===d.gy&&other.gx<d.gx))))return false;
  }
  return true;
 };
 for(let gy=Math.floor(y0/NEIGHBOUR_SPACING);gy<=Math.floor((y0+size)/NEIGHBOUR_SPACING);gy++)
 for(let gx=Math.floor(x0/NEIGHBOUR_SPACING);gx<=Math.floor((x0+size)/NEIGHBOUR_SPACING);gx++){
  const d=candidate(gx,gy);
  if(d.roll>.13*density)continue;
  if(d.solid&&!visualSpaceClear(d))continue;
  add(d.id,d.x,d.y,d.radius,d.solid);
 }
 // Low-cost small non-colliding details; no noise-based obstacles or thick walls.
 const detailCell=112;
 for(let gy=Math.floor(y0/detailCell);gy<=Math.floor((y0+size)/detailCell);gy++)
 for(let gx=Math.floor(x0/detailCell);gx<=Math.floor((x0+size)/detailCell);gx++){
  const h=forestHash(seed,gx,gy,0x76c0),limit=motif==='flower-meadow'?.30:motif==='open-meadow'?.23:.18;
  if(h/4294967295>limit)continue;
  const x=gx*detailCell+18+((h>>>10)%72),y=gy*detailCell+17+((h>>>18)%74);
  const choice=forestHash(seed,gx,gy,0x115a)%8;
  add(choice<5?['flowerWhite','flowerPink','flowerYellow'][choice%3]:choice===5?'reeds':'bush',x,y,0,false);
 }
 // Optional rare visual sites. They never gate the stage or block a passage.
 for(const l of [...landmarks,...features.camps])if(l.id.startsWith('campsite:')||l.id.startsWith('camp-')){
  add('tent',l.x,l.y+10,42,false,true);add('campLog',l.x-75,l.y+60,24,false,true);add('supplies',l.x+60,l.y+38,16,false,true);
 }
 for(const l of landmarks)if(l.id.startsWith('tm-cache:'))add('supplies',l.x,l.y,14,false,true);
 return{key:chunkKey(cx,cy),cx,cy,motif,encounterWeight:motif==='bug-habitat'?1.15:1,
  safeSpawn:true,featureIds:landmarks.map(l=>l.id),terrain,decorations,landmarks,trails:[],
  template:FOREST_TEMPLATES.find(t=>t.motif===motif)!.id,rotation:0};
}
