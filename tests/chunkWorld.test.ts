import {describe,expect,it} from 'vitest';
import {generateMap,motifForChunk,FOREST_CHUNK_CELLS,FOREST_CHUNK_SIZE,collides} from '../src/worldgen';
import {TERRAIN,terrainAt} from '../src/terrain';
describe('streamed open Viridian chunks',()=>{
 it('generates stable metadata without a finite travel boundary',()=>{
  const a=generateMap(1337),b=generateMap(1337);
  expect(a.chunks).toEqual(b.chunks);expect(a.width).toBe(Infinity);
  expect(a.chunkSize).toBe(FOREST_CHUNK_SIZE);
  expect(motifForChunk(1337,3,5)).toBe(motifForChunk(1337,3,5));
 });
 it('does not generate forced connected roads or impassable geography',()=>{
  const map=generateMap(1337);
  const flat=map.terrain.cells.filter(v=>v!==TERRAIN.cliff&&v!==TERRAIN.water).length/map.terrain.cells.length;
  const earth=map.terrain.cells.filter(v=>v===TERRAIN.path).length/map.terrain.cells.length;
  expect(flat).toBe(1);expect(earth).toBeLessThan(.12);
  for(const decorations of Object.values(map.decorationBuckets))
   expect(decorations.filter(d=>d.solid).length).toBeLessThan(85);
  expect(collides(map,map.playerStart.x,map.playerStart.y,14)).toBe(false);
 });
 it('keeps shared chunk seams walkable without predetermined ports',()=>{
  const map=generateMap(1337),ox=map.terrain.originCol??0,oy=map.terrain.originRow??0;
  for(let boundary=1;boundary<3;boundary++)for(let y=oy;y<oy+map.terrain.rows;y++){
   const x=ox+boundary*FOREST_CHUNK_CELLS;
   expect(terrainAt(map.terrain,x-1,y)).not.toBe(TERRAIN.cliff);
   expect(terrainAt(map.terrain,x,y)).not.toBe(TERRAIN.cliff);
  }
 });
});
