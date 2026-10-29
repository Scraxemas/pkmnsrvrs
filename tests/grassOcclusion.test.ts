import {describe,expect,it} from 'vitest';
import {grassBodyCrop,grassFootCoverage,measureVisibleRows} from '../src/grassOcclusion';

describe('grass body occlusion',()=>{
  it('measures each visible body rather than its padded frame',()=>{
    const pixels=new Uint8ClampedArray(8*10*4);
    for(let y=2;y<8;y++)pixels[(y*8+1)*4+3]=255;
    for(let y=4;y<9;y++)pixels[(y*8+6)*4+3]=255;
    expect(measureVisibleRows(pixels,8,10,4,10)).toEqual([{top:2,bottom:8},{top:4,bottom:9}]);
    expect(grassBodyCrop({top:2,bottom:8},1)).toEqual({bottom:6.8,hiddenFraction:.2});
  });
  it('hides the bottom fifth inside grass and restores the whole body outside',()=>{
    const tuft={x:48,y:60},lookup=(cx:number,cy:number)=>cx===1&&cy===1?tuft:undefined;
    expect(grassFootCoverage(48,52,32,lookup)).toBe(1);
    expect(grassFootCoverage(200,52,32,lookup)).toBe(0);
    const edge=grassFootCoverage(68,52,32,lookup);
    expect(edge).toBeGreaterThan(0);expect(edge).toBeLessThan(1);
    expect(grassBodyCrop({top:8,bottom:30},0)).toEqual({bottom:30,hiddenFraction:0});
    expect(grassBodyCrop({top:8,bottom:30},1).hiddenFraction).toBe(.2);
  });
});
