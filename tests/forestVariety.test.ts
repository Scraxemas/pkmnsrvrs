import {describe,it,expect} from 'vitest';
import {generateMap,collides} from '../src/worldgen';
import {terrainFingerprint,validateForest} from '../src/worldValidation';
import {TERRAIN} from '../src/terrain';

describe('v0.3.6 forest composition',()=>{
  it('validates geography, navigation, asset classes, and mandatory landmarks across 100 seeds',()=>{
    const fingerprints=new Set<string>();let leastOpen=1;
    for(let seed=0;seed<100;seed++){
      const map=generateMap(seed),report=validateForest(map);
      expect(report.errors,`seed ${seed}`).toEqual([]);expect(report.counts.camps,`seed ${seed}`).toBeGreaterThanOrEqual(1);
      expect(report.counts.ponds).toBeGreaterThanOrEqual(6);expect(report.counts.cliffs).toBeGreaterThanOrEqual(6);
      expect(report.walkableFraction).toBeGreaterThan(.55);fingerprints.add(report.terrain);leastOpen=Math.min(leastOpen,report.walkableFraction);
      const cliff=map.terrain.cells.indexOf(TERRAIN.cliff);
      if(cliff>=0){const x=((map.terrain.originCol??0)+cliff%map.terrain.cols)*32+16,y=((map.terrain.originRow??0)+Math.floor(cliff/map.terrain.cols))*32+16;expect(collides(map,x,y,14)).toBe(true);}
    }
    expect(fingerprints.size).toBe(100);console.log(`100-seed geography: ${fingerprints.size} unique terrains, minimum traversable ${(leastOpen*100).toFixed(1)}%`);
  },30000);
  it('reproduces entire feature plans and changes large-scale terrain between seeds',()=>{
    const a=generateMap(1337),b=generateMap(1337),c=generateMap(24680);
    expect(a.features).toEqual(b.features);expect(terrainFingerprint(a)).toBe(terrainFingerprint(b));
    expect(a.features.trails).not.toEqual(c.features.trails);
    const changed=a.terrain.cells.filter((v,i)=>v!==c.terrain.cells[i]).length/a.terrain.cells.length;
    expect(changed).toBeGreaterThan(.1);
  });
});
