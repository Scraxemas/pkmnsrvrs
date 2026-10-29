import {describe,expect,it} from 'vitest';
import {SPRITE_FRAMES} from '../src/content';
import {frameGroundOffset,measuredGroundOffsets} from '../src/groundOffsets';

describe('measured PMD frame grounding',()=>{
  it('covers all eight directions and every walk frame',()=>{
    for(const [species,metadata] of Object.entries(SPRITE_FRAMES)){
      const rows=measuredGroundOffsets(species);expect(rows,`${species} metadata`).toHaveLength(8);
      for(const row of rows!)expect(row).toHaveLength(metadata.frames);
      for(let frame=0;frame<metadata.frames*8;frame++)expect(frameGroundOffset(species,frame)).toBeGreaterThanOrEqual(0);
    }
  });
  it('contains frame-specific correction for Bulbasaur',()=>expect(new Set(measuredGroundOffsets('bulbasaur')!.flat()).size).toBeGreaterThan(3));
});

