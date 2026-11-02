import {describe,expect,it} from 'vitest';
import {minSolidVisualDistance,solidVisualRadius} from '../src/decorationSpacing';
import {generateMap,serializeWorldChanges,setWorldTerrain,syncWorldChunks} from '../src/worldgen';
import {TERRAIN} from '../src/terrain';
import {decorationVisual} from '../src/worldPresentation';
import {ENVIRONMENT_ASSETS,ENVIRONMENT_ATLASES} from '../src/environmentAssets';

const checkSolidSpacing=(map:ReturnType<typeof generateMap>,seed:number)=>{
 const solids=map.decorations.filter(d=>d.solid);
 for(let i=0;i<solids.length;i++)for(let j=i+1;j<solids.length;j++){
  const a=solids[i],b=solids[j],actual=Math.hypot(a.x-b.x,a.y-b.y);
  expect(actual+1e-8,`seed ${seed}, ${a.id} ${a.persistentId} / ${b.id} ${b.persistentId}`).toBeGreaterThanOrEqual(minSolidVisualDistance(a,b));
 }
};
describe('v0.7.1 standalone rocks and open forest regression',()=>{
 it('keeps the world flat, mostly green, and visually separated across 100 seeds',()=>{
  let lowestOpen=1,maxDirt=0,boulders=0;
  for(let seed=0;seed<100;seed++){
   const map=generateMap(seed);
   expect(map.terrain.cells.every(t=>t!==TERRAIN.cliff&&t!==TERRAIN.water),`seed ${seed}`).toBe(true);
   const earth=map.terrain.cells.filter(t=>t===TERRAIN.path).length/map.terrain.cells.length;
   const green=map.terrain.cells.filter(t=>t===TERRAIN.grass||t===TERRAIN.tallGrass).length/map.terrain.cells.length;
   maxDirt=Math.max(maxDirt,earth);lowestOpen=Math.min(lowestOpen,green);
   expect(earth,`seed ${seed} dirt area`).toBeLessThan(.06);
   checkSolidSpacing(map,seed);
   for(const d of map.decorations.filter(d=>d.id==='landRock')){
    const visual=decorationVisual(d.id,d.x,d.y,seed,d.radius);
    expect(visual.scale).toBe(1);
    expect(visual.name).toBe(d.radius>28?ENVIRONMENT_ASSETS.landBoulder:ENVIRONMENT_ASSETS.landRockSmall);
    expect(ENVIRONMENT_ATLASES.has(visual.name)).toBe(false);
    if(d.radius>28)boulders++;
   }
  }
  expect(boulders).toBeGreaterThan(0);
  console.info(`rock-polish: min green ${(lowestOpen*100).toFixed(1)}%, max dirt ${(maxDirt*100).toFixed(2)}%, ${boulders} complete boulders across 100 seeds`);
 },45000);
 it('applies the same spacing across positive and negative chunk seams',()=>{
  for(const seed of [1,13,1337,8675309,2026]){
   const map=generateMap(seed);
   for(const [x,y] of [[2047,2047],[-2049,-2049],[4097,-4098],[-50000,50000],[75000,-75000]]){
    syncWorldChunks(map,x,y);
    checkSolidSpacing(map,seed);
    expect(map.stream!.cache.size).toBeLessThanOrEqual(18);
   }
  }
 },30000);
 it('strips obsolete wall edits from saved forest data without losing benign edits or discoveries',()=>{
  const seed=1337,map=generateMap(seed,'forest',{changes:{
   version:2,seed,discoveries:['pikachu-hollow'],removedDecorations:{},
   terrainEdits:{'0,0':{'0':TERRAIN.cliff,'1':TERRAIN.water,'2':TERRAIN.tallGrass}}
  }});
  expect(map.terrain.cells.includes(TERRAIN.cliff)).toBe(false);
  expect(map.terrain.cells.includes(TERRAIN.water)).toBe(false);
  expect(setWorldTerrain(map,0,0,TERRAIN.cliff)).toBe(false);
  expect(setWorldTerrain(map,0,0,TERRAIN.water)).toBe(false);
  const restored=serializeWorldChanges(map)!;
  expect(restored.discoveries).toContain('pikachu-hollow');
  expect(restored.terrainEdits['0,0']).toEqual({'2':TERRAIN.tallGrass});
 });
 it('separates physical collisions from visual boulder widths',()=>{
  expect(solidVisualRadius('landRock',34)).toBeGreaterThan(solidVisualRadius('landRock',24));
  const a={id:'landRock',radius:34},b={id:'landRock',radius:34};
  expect(minSolidVisualDistance(a,b)).toBeGreaterThan(100);
  expect(minSolidVisualDistance({id:'tree',radius:30},a)).toBeGreaterThan(minSolidVisualDistance(a,b));
 });
});
