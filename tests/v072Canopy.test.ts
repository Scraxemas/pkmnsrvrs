import {describe,it,expect} from 'vitest';
import {
 canopyCoverage,canopyLighting,canopyShadowField,canopySunlightField,
 regionalCanopyDensity,SHADE_STANDARD,SHADE_SUBTLE,SUN_OPENING_CELL,
 sunOpeningsForRegion,sunlightOpeningMask,sunlightOpeningDistance
} from '../src/forestCanopy';
import {CANOPY_TEXTURE_RESOLUTION,CANOPY_TEXTURE_GUTTER} from '../src/forestCanopyRenderer';
import {DEFAULT_SETTINGS} from '../src/preferences';

describe('v0.7.2 Eterna-inspired rounded sunlight canopy',()=>{
 it('is deterministic across seeds, negative world positions and generation order',()=>{
  for(let seed=0;seed<100;seed++){
   for(const [x,y] of [[0,0],[-512,512],[511.99,-512],[81000,-64000],[-91000,72000]]){
    const a=canopyLighting(seed,x,y,'standard');
    expect(a).toEqual(canopyLighting(seed,x,y,'standard'));
    expect(a).toEqual(canopyLighting(seed,x,y,'standard',[]));
    expect(a.shade).toBeGreaterThanOrEqual(.024);
    expect(a.shade).toBeLessThanOrEqual(SHADE_STANDARD);
    expect(a.sunlight).toBeGreaterThanOrEqual(0);
    expect(a.sunlight).toBeLessThanOrEqual(1);
   }
  }
  expect(canopyLighting(1337,-150,220,'standard')).not.toEqual(canopyLighting(24680,-150,220,'standard'));
 });
 it('matches openings across adjacent render pages at every signed boundary',()=>{
  for(const seed of [0,7,1337,24680,8675309]){
   for(const edge of [-1536,-512,0,512,1536]){
    const left=sunOpeningsForRegion(seed,edge-512,-2048,512,4096);
    const right=sunOpeningsForRegion(seed,edge,-2048,512,4096);
    for(let y=-1900;y<1900;y+=173){
     for(const x of [edge-2,edge,edge+2]){
      expect(sunlightOpeningMask(seed,x,y,left)).toBeCloseTo(sunlightOpeningMask(seed,x,y,right),10);
     }
    }
   }
  }
 });
 it('builds rounded multi-lobe openings, not square patches or a tile lattice',()=>{
  const openings=sunOpeningsForRegion(1337,-4200,-3000,8400,6000);
  expect(openings.length).toBeGreaterThan(15);
  for(const opening of openings){
   expect(opening.lobes.length).toBeGreaterThanOrEqual(3);
   expect(opening.lobes[0].rx).not.toBe(opening.lobes[0].ry);
   expect(sunlightOpeningDistance(opening.x,opening.y,[opening])).toBeLessThan(0);
   expect(sunlightOpeningMask(1337,opening.x,opening.y,[opening])).toBeGreaterThan(.99);
   expect(sunlightOpeningMask(1337,opening.x+500,opening.y+500,[opening])).toBe(0);
  }
  expect(SUN_OPENING_CELL).toBeGreaterThan(400);
 });
 it('covers a mostly shaded forest with sparse sunlit gaps across many seeds',()=>{
  let lit=0,total=0;
  for(const seed of [7,1337,24680,8675309,20261102]){
   const openings=sunOpeningsForRegion(seed,-4800,-3600,9600,7200);
   for(let y=-3520;y<=3520;y+=96)for(let x=-4700;x<=4700;x+=96){
    lit+=sunlightOpeningMask(seed,x,y,openings)>.5?1:0;total++;
   }
  }
  const fraction=lit/total;
  expect(fraction).toBeGreaterThan(.10);
  expect(fraction).toBeLessThan(.33);
  expect(canopyCoverage(1337,100,200)).toBeCloseTo(1-canopySunlightField(1337,100,200),10);
  expect(canopyShadowField(1337,100,200)).toBeCloseTo(1-canopySunlightField(1337,100,200),10);
  expect(regionalCanopyDensity(1337,100,200)).toBeGreaterThanOrEqual(0);
 });
 it('opens subtly at friendly landmarks, but suppresses daylight at the nest',()=>{
  const seed=1337,x=11000,y=-2500,none:[]=[];
  const dark=canopyLighting(seed,x,y,'standard',[],none);
  expect(dark.shade).toBe(SHADE_STANDARD);
  for(const id of ['pikachu-hollow','pewter-exit','campsite:10,-2','ancient-tree:-2,3']){
   const site=[{id,x,y,radius:120}];
   const lit=canopyLighting(seed,x,y,'standard',site,none);
   expect(lit.shade).toBeLessThan(dark.shade);
   expect(lit.sunlight).toBeGreaterThan(0);
   expect(canopyLighting(seed,x+2000,y,'standard',site,none))
    .toEqual(canopyLighting(seed,x+2000,y,'standard',[],none));
  }
  const base=[{id:'pikachu-hollow',x,y,radius:120}];
  const nest=[...base,{id:'beedrill-nest',x,y,radius:120}];
  expect(canopyLighting(seed,x,y,'standard',nest,none).shade)
   .toBeGreaterThan(canopyLighting(seed,x,y,'standard',base,none).shade);
 });
 it('has a genuine Off switch and independent Subtle/Standard strength, without a vignette',()=>{
  expect(DEFAULT_SETTINGS.canopyIntensity).toBe('standard');
  expect(canopyLighting(42,-800,1000,'off')).toEqual({shade:0,sunlight:0,density:0});
  const empty:[]=[];
  expect(canopyLighting(42,-800,1000,'standard',[],empty).shade).toBe(SHADE_STANDARD);
  expect(canopyLighting(42,-800,1000,'subtle',[],empty).shade).toBe(SHADE_SUBTLE);
  expect(CANOPY_TEXTURE_RESOLUTION).toBe(128);
  expect(CANOPY_TEXTURE_GUTTER).toBe(1);
 });
});
