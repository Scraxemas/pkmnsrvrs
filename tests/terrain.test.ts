import {describe,expect,it} from 'vitest';
import {adjacencyMask,classifyTransition,createTerrainGrid,DIRECTIONS,setTerrain,TERRAIN} from '../src/terrain';

describe('terrain adjacency and transition classification',()=>{
  it('preserves every eight-neighbor adjacency mask',()=>{
    for(let expected=0;expected<256;expected++){
      const grid=createTerrainGrid(192,192,64);setTerrain(grid,1,1,TERRAIN.path);
      for(const direction of DIRECTIONS)if(expected&direction.bit)setTerrain(grid,1+direction.dx,1+direction.dy,TERRAIN.path);
      expect(adjacencyMask(grid,1,1,TERRAIN.path),`mask ${expected}`).toBe(expected);
      expect(classifyTransition(expected)).not.toBe('complex');
    }
  });
  it.each([[1,'end-north'],[5,'corner-ne'],[17,'straight-vertical'],[68,'straight-horizontal'],[85,'intersection']] as const)('classifies cardinal mask %i as %s',(mask,name)=>expect(classifyTransition(mask)).toBe(name));
});
