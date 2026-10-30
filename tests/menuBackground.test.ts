import {describe,it,expect} from 'vitest';
import {backgroundRect,MenuAnimationClock} from '../src/ui/menuBackgroundMath';
import {PLAY_MODES,researchStatistics} from '../src/ui/menuData';
import {freshSave} from '../src/save';

describe('decorative menu motion',()=>{
  it.each([[1280,720],[1920,1080],[2560,1440],[3440,1440]])('keeps artwork over every edge at %ix%i through complete cycles',(w,h)=>{
    for(let time=0;time<=64;time+=.125){const r=backgroundRect(w,h,1376,768,time);expect(r.x).toBeLessThanOrEqual(0);expect(r.y).toBeLessThanOrEqual(0);expect(r.x+r.width).toBeGreaterThanOrEqual(w);expect(r.y+r.height).toBeGreaterThanOrEqual(h);expect(Number.isInteger(r.x)&&Number.isInteger(r.y)).toBe(true);}
    expect(backgroundRect(w,h,1376,768,0)).toEqual(backgroundRect(w,h,1376,768,32));
  });
  it('advances equally at different frame rates and freezes without catching up after pause',()=>{
    for(const fps of [30,60,144]){const c=new MenuAnimationClock();for(let i=0;i<fps*10;i++)c.advance(1000/fps);expect(c.time).toBeCloseTo(10,7);c.paused=true;c.advance(50);expect(c.time).toBeCloseTo(10,7);c.paused=false;c.advance(20);expect(c.time).toBeCloseTo(10.02,7);c.reduced=true;c.advance(1000);expect(c.time).toBeCloseTo(10.02,7);}
  });
  it('uses static framing for reduced motion',()=>{
    expect(backgroundRect(1280,720,1376,768,0,true)).toEqual(backgroundRect(1280,720,1376,768,90,true));
  });
  it('leaves multiplayer explicitly unavailable with its future player target isolated',()=>{
    expect(PLAY_MODES.multiplayer).toEqual({available:false,targetMaxPlayers:4});
  });
  it('reports saved statistics without manufacturing run or collection records',()=>{
    const save=freshSave();expect(researchStatistics(save).best).toBeUndefined();save.research.pokeBalls=9;save.research.viridianWins=2;save.best.viridian={level:33,defeated:123,time:540};
    expect(researchStatistics(save)).toMatchObject({best:{level:33,defeated:123,time:'9:00'}});expect(researchStatistics(save).totals).toContainEqual(['Poké Balls collected',9]);expect(researchStatistics(save).totals).toContainEqual(['Viridian Forest clears',2]);
  });
});
