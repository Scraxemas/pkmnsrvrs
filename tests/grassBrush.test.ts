import {describe,expect,it} from 'vitest';
import {GrassBrushField} from '../src/grassBrush';

describe('grass brushing',()=>{
  it('bends along travel, then settles completely',()=>{
    const grass=new GrassBrushField();
    expect(grass.touch('1,1',0,140,0)).toBe(true);
    expect(grass.sample('1,1',.06)!.rotation).toBeGreaterThan(.1);
    expect(grass.sample('1,1',.06)!.scaleY).toBeLessThan(1);
    expect(grass.sample('1,1',.7)).toBeNull();
    expect(grass.impulses.size).toBe(0);
    grass.touch('1,1',1,-140,0);expect(grass.sample('1,1',1.06)!.rotation).toBeLessThan(-.1);
  });
  it('does not repeatedly emit while stationary or within a contact cooldown',()=>{
    const grass=new GrassBrushField();
    expect(grass.touch('1,1',0,0,0)).toBe(false);
    expect(grass.touch('1,1',0,0,140)).toBe(true);
    expect(grass.touch('1,1',.1,0,140)).toBe(false);
    expect(grass.touch('1,1',.3,0,140)).toBe(true);
    grass.forget('1,1');expect(grass.impulses.size).toBe(0);
  });
});
