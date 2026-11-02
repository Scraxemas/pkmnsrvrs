import {describe,expect,it} from 'vitest';
import {POKEMON} from '../src/content';
import {forestChunkPorts} from '../src/forestWorld';
import {beginBossEncounter,discoverNearbyForest,makeState,spawnSpecies,tick} from '../src/simulation';
import {buildFlowField,flowDirection} from '../src/navigation';
import {collides,generateMap,markWorldDiscovery,prewarmWorldChunk,removeWorldDecoration,serializeWorldChanges,setWorldTerrain,syncWorldChunks} from '../src/worldgen';
import {TERRAIN,terrainAt,terrainAtWorld} from '../src/terrain';

describe('infinite forest acceptance',()=>{
 it('loads exactly nine configurable chunks, with no generation on ordinary frames',()=>{
  expect(generateMap(1337,'forest',{chunkCells:17}).chunkSize).toBe(16*32);
  for(const cells of [32,64]){
   const map=generateMap(1337,'forest',{chunkCells:cells}),revision=map.stream!.revision;
   expect(map.chunkSize).toBe(cells*32);expect(Object.keys(map.chunks)).toHaveLength(9);expect(map.terrain.cells).toHaveLength((cells*3)**2);
   for(let i=0;i<120;i++)expect(syncWorldChunks(map,map.playerStart.x,map.playerStart.y)).toBe(false);
   expect(map.stream!.revision).toBe(revision);
  }
 });

 it('streams equally walkable terrain across positive and negative chunk seams',()=>{
  const map=generateMap(777);
  for(const [cx,cy] of [[-15,-3],[-1,-1],[0,0],[3,5],[100,-100]]){
   const p=forestChunkPorts(map.seed,cx,cy),east=forestChunkPorts(map.seed,cx+1,cy),south=forestChunkPorts(map.seed,cx,cy+1);
   expect(p.east).toEqual(east.west);expect(p.south).toEqual(south.north);
   syncWorldChunks(map,(cx+.5)*map.chunkSize,(cy+.5)*map.chunkSize);
   for(const port of [p.north,p.south,p.east,p.west])for(const [ox,oy] of [[-16,0],[16,0],[0,-16],[0,16]]){
    expect(terrainAtWorld(map.terrain,port.x+ox,port.y+oy)).not.toBe(TERRAIN.cliff);
    expect(terrainAtWorld(map.terrain,port.x+ox,port.y+oy)).not.toBe(TERRAIN.water);
   }
  }
 });

 it('keeps terrain, decorations and modifications consistent after LRU eviction and serialisation',()=>{
  const map=generateMap(1337),home={...map.playerStart},before=[...map.terrain.cells],tree=map.decorations.find(d=>d.solid)!;
  const untouched=map.decorations.filter(d=>d!==tree).map(d=>({...d}));
  expect(removeWorldDecoration(map,tree.persistentId!)).toBe(true);expect(markWorldDiscovery(map,'pikachu-hollow')).toBe(true);
  const tx=Math.floor(home.x/32),ty=Math.floor(home.y/32);setWorldTerrain(map,tx,ty,TERRAIN.tallGrass);
  for(let i=0;i<35;i++)syncWorldChunks(map,-15000+i*2048,24000+i*2048);
  expect(map.stream!.cache.size).toBeLessThanOrEqual(18);expect(Object.keys(map.chunks)).toHaveLength(9);
  syncWorldChunks(map,home.x,home.y);
  expect(map.decorations).toEqual(untouched);expect(terrainAt(map.terrain,tx,ty)).toBe(TERRAIN.tallGrass);
  const expected=[...before];expected[(ty-map.terrain.originRow!)*map.terrain.cols+tx-map.terrain.originCol!]=TERRAIN.tallGrass;expect(map.terrain.cells).toEqual(expected);
  const restored=generateMap(1337,'forest',{changes:serializeWorldChanges(map)});
  expect(restored.terrain.cells).toEqual(map.terrain.cells);expect(restored.decorations).toEqual(map.decorations);expect(restored.stream!.persistent.discoveries).toContain('pikachu-hollow');
 });

 it('prewarms upcoming chunks with a fixed memory budget through repeated travel',()=>{
  const map=generateMap(17),size=map.chunkSize;let longest=0;
  for(let i=0;i<12;i++){
   const x=(i+.9)*size,y=map.playerStart.y;
   syncWorldChunks(map,x,y);for(let n=0;n<20;n++)prewarmWorldChunk(map,x,y);
   const start=performance.now();syncWorldChunks(map,x+size*.2,y);longest=Math.max(longest,performance.now()-start);
   expect(map.stream!.cache.size).toBeLessThanOrEqual(18);expect(map.terrain.cells).toHaveLength(192**2);
  }
  console.info(`prewarmed boundary: slowest ${longest.toFixed(1)}ms across 12 crossings`);
 });

 it('walks through chunk seams beyond both original world edges without resetting the run',()=>{
  const state=makeState(POKEMON.bulbasaur,1337);state.moveSlots=[];state.time=321;state.level=12;
  for(const cx of [-9,-1,4,16]){
   const port=forestChunkPorts(state.world.seed,cx,8).east;
   Object.assign(state.player,{x:port.x-24,y:port.y,vx:0,vy:0});syncWorldChunks(state.world,state.player.x,state.player.y);
   for(let n=0;n<12;n++)tick(state,1/30,{x:1,y:0},[]);
   expect(state.player.x).toBeGreaterThan(port.x+20);expect(collides(state.world,state.player.x,state.player.y,14)).toBe(false);
   const f=buildFlowField(state.world,state.player.x,state.player.y,64);expect(f.distances).toHaveLength(48**2);
   expect(flowDirection(f,state.player.x-128,state.player.y).distance).toBeGreaterThanOrEqual(0);
   spawnSpecies(state,'weedle',20);expect(state.enemies.every(e=>!collides(state.world,e.x,e.y,14))).toBe(true);state.enemies=[];
  }
  expect(state.level).toBe(12);expect(state.time).toBeCloseTo(322.6);expect(state.bossSpawned).toBe(false);
 });

 it('never falls back to spawning inside solid terrain after exhausted attempts',()=>{
  const map=generateMap(5,'cave');map.terrain.cells.fill(TERRAIN.water);
  const state=makeState(POKEMON.bulbasaur,5,map);spawnSpecies(state,'weedle',50);expect(state.enemies).toEqual([]);
 });

 it('keeps Pikachu available after unloading its hollow and does not duplicate the encounter',()=>{
  const state=makeState(POKEMON.bulbasaur,1337),hollow=state.world.landmarks.find(l=>l.id==='pikachu-hollow')!;
  Object.assign(state.player,{x:hollow.x+110,y:hollow.y});syncWorldChunks(state.world,state.player.x,state.player.y);discoverNearbyForest(state);
  const pika=state.enemies.find(e=>e.species==='pikachu')!;expect(pika).toBeDefined();expect(collides(state.world,pika.x,pika.y,14)).toBe(false);
  Object.assign(state.player,{x:-50000,y:-50000});tick(state,1/30,{x:0,y:0},[]);expect(state.enemies).toContain(pika);
  Object.assign(state.player,{x:hollow.x+110,y:hollow.y});tick(state,1/30,{x:0,y:0},[]);
  expect(state.enemies.filter(e=>e.species==='pikachu')).toHaveLength(1);
 });

 it('keeps optional iconic sites accessible and summons Beedrill near the player, anywhere',()=>{
  for(let seed=0;seed<20;seed++){
   const map=generateMap(seed);
   for(const id of ['entrance','pikachu-hollow','beedrill-nest','pewter-exit']){
    const landmark=map.landmarks.find(l=>l.id===id)!;expect(landmark).toBeDefined();
    syncWorldChunks(map,landmark.x,landmark.y);
    expect(collides(map,landmark.x,landmark.y,16)).toBe(false);
   }
   const state=makeState(POKEMON.bulbasaur,seed,map);
   Object.assign(state.player,{x:55000+seed*1000,y:-67000-seed*700});
   syncWorldChunks(state.world,state.player.x,state.player.y);
   const old={...state.player};
   state.time=1800;
   expect(beginBossEncounter(state)).toBe(true);
   expect(state.player.x).toBe(old.x);expect(state.player.y).toBe(old.y);
   const boss=state.enemies.find(e=>e.boss)!;
   expect(Math.hypot(boss.x-old.x,boss.y-old.y)).toBeGreaterThanOrEqual(300);
   expect(Math.hypot(boss.x-old.x,boss.y-old.y)).toBeLessThanOrEqual(570);
   expect(collides(state.world,boss.x,boss.y,85)).toBe(false);
   expect(beginBossEncounter(state)).toBe(false);
  }
 });

});
