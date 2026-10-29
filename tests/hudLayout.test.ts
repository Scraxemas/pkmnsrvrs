import {describe,expect,it} from 'vitest';
import {gameplayHudLayout,hpBarColor} from '../src/hudLayout';

describe('responsive gameplay health bars',()=>{
  it.each([[1280,720],[1920,1080],[2560,1440],[3440,1440]])('keeps the player bar near full width at %ix%i',(width,height)=>{
    const layout=gameplayHudLayout(width,height);
    expect(layout.player.width/width).toBeCloseTo(.94,2);
    expect(layout.player.x/width).toBeCloseTo(.03,2);
    expect(layout.player.height).toBeGreaterThanOrEqual(28);
    expect(layout.boss.y).toBeGreaterThan(layout.player.y+layout.player.height);
  });
  it('uses readable healthy, warning, and critical colors',()=>{expect(hpBarColor(1)).not.toBe(hpBarColor(.4));expect(hpBarColor(.4)).not.toBe(hpBarColor(.1));});
});
