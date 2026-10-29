import {describe,it,expect} from 'vitest';
import {generateMap,validateMap} from '../src/worldgen';
describe('deterministic world generation',()=>{for(const biome of ['forest','cave','ship'] as const){it(`${biome} validates across 100 seeds`,()=>{for(let seed=0;seed<100;seed++)expect(validateMap(generateMap(seed,biome)),`${biome} seed ${seed}`).toEqual({valid:true,errors:[]});});it(`${biome} reproduces exactly`,()=>expect(generateMap(8675309,biome)).toEqual(generateMap(8675309,biome)));}});
