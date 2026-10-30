import {describe,expect,it} from 'vitest';
import {decorationVisual,visibleChunkRange} from '../src/worldPresentation';
import {generateMap} from '../src/worldgen';
import {ENVIRONMENT_ASSETS} from '../src/environmentAssets';

describe('reviewed map presentation',()=>{
  it('covers the camera and tall crowns at every map chunk and zoom',()=>{
    for(const zoom of [.5,1,2])for(let cy=0;cy<16;cy++)for(let cx=0;cx<16;cx++){
      const x=(cx+.5)*512,y=(cy+.5)*512;
      const view={left:x-640/zoom,right:x+640/zoom,top:y-360/zoom,bottom:y+360/zoom};
      const range=visibleChunkRange(view,512,16,16);
      expect(range.minX*512).toBeLessThanOrEqual(Math.max(0,view.left-128));
      expect((range.maxX+1)*512).toBeGreaterThanOrEqual(Math.min(8192,view.right+128));
      expect(range.minY*512).toBeLessThanOrEqual(Math.max(0,view.top-128));
      expect((range.maxY+1)*512).toBeGreaterThanOrEqual(Math.min(8192,view.bottom+256));
    }
  });
  it('has reviewed complete art for every generated decoration',()=>{
    for(const seed of [1,1337,90210])for(const d of generateMap(seed).decorations){
      const visual=decorationVisual(d.id,d.x,d.y,seed);
      expect(Object.values(ENVIRONMENT_ASSETS)).toContain(visual.name);
      expect(Number.isInteger(visual.scale)).toBe(true);
    }
    expect(Object.values(ENVIRONMENT_ASSETS).every(name=>name.startsWith('frlg/')||name.startsWith('original/'))).toBe(true);
    expect(()=>decorationVisual('unreviewed',0,0,1)).toThrow('No reviewed map artwork');
  });
});
