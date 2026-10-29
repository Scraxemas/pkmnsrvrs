import {describe,expect,it} from 'vitest';
import {interpolatePosition,interpolationAlpha} from '../src/interpolation';

describe('fixed-step presentation interpolation',()=>{
  it('interpolates without changing authoritative points',()=>{
    const previous={x:10,y:20},current={x:20,y:40};
    expect(interpolatePosition(previous,current,.5)).toEqual({x:15,y:30});
    expect(previous).toEqual({x:10,y:20});expect(current).toEqual({x:20,y:40});
  });
  it('clamps frame accumulator alpha and snaps teleports',()=>{
    expect(interpolationAlpha(-1,1/30)).toBe(0);expect(interpolationAlpha(1,1/30)).toBe(1);
    expect(interpolatePosition({x:0,y:0},{x:1000,y:1000},.25)).toEqual({x:1000,y:1000});
  });
});

