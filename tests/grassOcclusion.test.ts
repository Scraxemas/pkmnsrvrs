import {describe,expect,it} from 'vitest';
import {GRASS_FOREGROUND_ALPHA,grassFootCoverage,measureVisibleRows,opaqueGrassBladeColumn} from '../src/grassOcclusion';

describe('layered grass foliage',()=>{
  it('measures each visible body rather than its padded frame',()=>{
    const pixels=new Uint8ClampedArray(8*10*4);
    for(let y=2;y<8;y++)pixels[(y*8+1)*4+3]=255;
    for(let y=4;y<9;y++)pixels[(y*8+6)*4+3]=255;
    expect(measureVisibleRows(pixels,8,10,4,10)).toEqual([{top:2,bottom:8},{top:4,bottom:9}]);
  });
  it('tracks local coverage without changing sprite geometry',()=>{
    const tuft={x:48,y:60},lookup=(cx:number,cy:number)=>cx===1&&cy===1?tuft:undefined;
    expect(grassFootCoverage(48,52,32,lookup)).toBe(1);
    expect(grassFootCoverage(200,52,32,lookup)).toBe(0);
    const edge=grassFootCoverage(68,52,32,lookup);
    expect(edge).toBeGreaterThan(0);expect(edge).toBeLessThan(1);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]])expect(grassFootCoverage(48+dx*2,52+dy*2,32,lookup)).toBe(1);
  });
  it('keeps most foreground foliage translucent with sparse native opaque blades',()=>{
    expect(GRASS_FOREGROUND_ALPHA).toBeGreaterThanOrEqual(.5);expect(GRASS_FOREGROUND_ALPHA).toBeLessThanOrEqual(.65);
    for(const width of [16,20,32]){
      const columns=Array.from({length:width},(_,x)=>x).filter(x=>opaqueGrassBladeColumn(x,width));
      expect(columns).toHaveLength(2);expect(columns[1]-columns[0]).toBeGreaterThan(3);
    }
  });
});
