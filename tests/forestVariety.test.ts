import {describe,it,expect} from 'vitest';
import {generateMap,collides} from '../src/worldgen';
import {terrainFingerprint,validateForest} from '../src/worldValidation';
import {TERRAIN} from '../src/terrain';
describe('v0.7.0 endless open forest composition',()=>{
 it('maintains almost entirely traversable wilderness across 100 seeds',()=>{
  const fingerprints=new Set<string>();let leastOpen=1;
  for(let seed=0;seed<100;seed++){
   const map=generateMap(seed),report=validateForest(map);
   expect(report.errors,`seed ${seed}`).toEqual([]);
   expect(report.counts.camps).toBeGreaterThanOrEqual(1);
   expect(report.counts.ponds).toBe(0);expect(report.counts.cliffs).toBe(0);
   expect(report.walkableFraction).toBeGreaterThan(.94);
   fingerprints.add(report.terrain);leastOpen=Math.min(leastOpen,report.walkableFraction);
   expect(map.terrain.cells.every(v=>v!==TERRAIN.water&&v!==TERRAIN.cliff)).toBe(true);
   expect(collides(map,map.playerStart.x,map.playerStart.y,14)).toBe(false);
  }
  expect(fingerprints.size).toBe(100);
  console.info(`100-seed endless wilderness: minimum open ${(leastOpen*100).toFixed(1)}%`);
 },30000);
 it('reproduces a seed and changes appearance with a different seed',()=>{
  const a=generateMap(1337),b=generateMap(1337),c=generateMap(24680);
  expect(a.features).toEqual(b.features);
  expect(terrainFingerprint(a)).toBe(terrainFingerprint(b));
  expect(a.features.camps).not.toEqual(c.features.camps);
  expect(a.decorations).not.toEqual(c.decorations);
  const changed=a.terrain.cells.filter((v,i)=>v!==c.terrain.cells[i]).length/a.terrain.cells.length;
  expect(changed).toBeGreaterThan(.005);
 });
});
