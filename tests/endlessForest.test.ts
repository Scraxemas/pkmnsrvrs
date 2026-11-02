import {describe,it,expect} from 'vitest';
import {POKEMON} from '../src/content';
import {forestHash,planForest} from '../src/forestPlan';
import {generateForestChunk} from '../src/forestWorld';
import {discoverNearbyForest,makeState} from '../src/simulation';
import {generateMap,syncWorldChunks,serializeWorldChanges} from '../src/worldgen';
import {TERRAIN} from '../src/terrain';

describe('v0.7 endless forest invariants',()=>{
 it('generates identical distant chunks independently of visit order and sign',()=>{
  const features=planForest(1999);
  const coordinates=[[-137,65],[0,0],[1,-1],[28,-37],[137,65],[-600,-600]] as const;
  for(const [cx,cy] of coordinates){
   const a=generateForestChunk(1999,cx,cy,features),b=generateForestChunk(1999,cx,cy,features);
   expect(a.terrain.cells).toEqual(b.terrain.cells);
   expect(a.decorations).toEqual(b.decorations);
   expect(a.landmarks).toEqual(b.landmarks);
   expect(a.trails).toEqual([]);
   expect(a.terrain.cells.every(v=>v===TERRAIN.grass||v===TERRAIN.path||v===TERRAIN.tallGrass)).toBe(true);
  }
 });
 it('keeps the streamed window bounded after large signed travel',()=>{
  const map=generateMap(233);
  for(const [x,y] of [[-710000,490000],[700000,-610000],[-710000,490000],[0,0]]){
   syncWorldChunks(map,x,y);
   expect(Object.keys(map.chunks)).toHaveLength(9);
   expect(map.stream!.cache.size).toBeLessThanOrEqual(18);
   expect(map.terrain.cells.every(t=>t!==TERRAIN.cliff&&t!==TERRAIN.water)).toBe(true);
  }
 });
 it('preserves old discovery progress but discards incompatible v1 maze terrain edits',()=>{
  const map=generateMap(42,'forest',{changes:{
   version:1,seed:42,discoveries:['pikachu-hollow'],
   removedDecorations:{'0,0':['0,0:0']},terrainEdits:{'0,0':{'0':TERRAIN.water}}
  }});
  const changes=serializeWorldChanges(map)!;
  expect(changes.version).toBe(2);
  expect(changes.discoveries).toContain('pikachu-hollow');
  expect(changes.removedDecorations).toEqual({});
  expect(changes.terrainEdits).toEqual({});
 });
 it('grants rare discoveries only once and gives TM caches meaningful repeat-proof pickups',()=>{
  const seed=1337,world=generateMap(seed),state=makeState(POKEMON.charmander,seed,world);
  let target:{x:number;y:number;id:string}|undefined;
  outer:for(let cx=-17;cx<=17;cx++)for(let cy=-17;cy<=17;cy++){
   if(Math.hypot(cx,cy)<3||forestHash(seed,cx,cy,0x544d)%92!==0)continue;
   syncWorldChunks(world,(cx+.5)*world.chunkSize,(cy+.5)*world.chunkSize);
   target=world.landmarks.find(l=>l.id===`tm-cache:${cx},${cy}`);
   if(target)break outer;
  }
  expect(target).toBeDefined();
  Object.assign(state.player,{x:target!.x,y:target!.y,vx:0,vy:0});
  const first=discoverNearbyForest(state);
  expect(first).toContain(target!.id);
  expect(state.pickups.some(p=>p.kind==='ball'&&p.tier===2)).toBe(true);
  expect(discoverNearbyForest(state)).not.toContain(target!.id);
  expect(world.stream!.persistent.discoveries).toContain(target!.id);
 });
});
