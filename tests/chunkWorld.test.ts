import {describe,expect,it} from 'vitest';
import {generateMap,motifForChunk,FOREST_CHUNK_CELLS,FOREST_CHUNK_SIZE} from '../src/worldgen';
import {TERRAIN,terrainAt} from '../src/terrain';

describe('streamed Viridian chunk world',()=>{
  it('generates deterministic chunk metadata and an expansive world',()=>{
    const a=generateMap(1337),b=generateMap(1337);expect(a.chunks).toEqual(b.chunks);expect(a.width).toBeGreaterThanOrEqual(8192);expect(a.chunkSize).toBe(FOREST_CHUNK_SIZE);
    expect(motifForChunk(1337,3,5)).toBe(motifForChunk(1337,3,5));
  });
  it('clusters tall grass instead of isolated noise',()=>{
    const map=generateMap(1337);for(const chunk of Object.values(map.chunks).filter(chunk=>chunk.motif==='tall-grass').slice(0,8)){
      let count=0;for(let y=0;y<FOREST_CHUNK_CELLS;y++)for(let x=0;x<FOREST_CHUNK_CELLS;x++)if(terrainAt(map.terrain,chunk.cx*FOREST_CHUNK_CELLS+x,chunk.cy*FOREST_CHUNK_CELLS+y)===TERRAIN.tallGrass)count++;
      expect(count).toBeGreaterThan(10);
    }
  });
  it('keeps obstacle density bounded and central spawn chunks clear',()=>{
    const map=generateMap(1337);for(const decorations of Object.values(map.decorationBuckets))expect(decorations.filter(d=>d.solid).length).toBeLessThanOrEqual(450);
    expect(map.decorations.every(d=>Math.hypot(d.x-map.playerStart.x,d.y-map.playerStart.y)>=260)).toBe(true);
  });
  it('has continuous path pixels across multiple chunk seams',()=>{
    const map=generateMap(1337);let stitched=0;
    const ox=map.terrain.originCol??0,oy=map.terrain.originRow??0;
    for(let boundary=1;boundary<3;boundary++)for(let y=oy;y<oy+map.terrain.rows;y++)if(terrainAt(map.terrain,ox+boundary*FOREST_CHUNK_CELLS-1,y)===TERRAIN.path&&terrainAt(map.terrain,ox+boundary*FOREST_CHUNK_CELLS,y)===TERRAIN.path)stitched++;
    expect(stitched).toBeGreaterThan(30);
  });
});
