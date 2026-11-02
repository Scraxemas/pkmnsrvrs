import {describe,it,expect} from 'vitest';
import {
 canopyCoverage,regionalCanopyDensity,canopyShadowField,canopySunlightField,
 canopyLighting,vignetteAlpha
} from '../src/forestCanopy';
import {CANOPY_TEXTURE_RESOLUTION} from '../src/forestCanopyRenderer';
import {DEFAULT_SETTINGS} from '../src/preferences';

describe('v0.7.2 continuous world-space forest canopy',()=>{
 it('has stable values at the same world coordinate, independent of page order and sign',()=>{
  for(let seed=0;seed<100;seed++)
   for(const [x,y] of [[0,0],[-512,512],[511.99,-512],[81000,-64000],[-91000,72000]]){
    const a=canopyLighting(seed,x,y,'standard');
    expect(a).toEqual(canopyLighting(seed,x,y,'standard'));
    expect(a).toEqual(canopyLighting(seed,x,y,'standard',[]));
    expect(a.shade).toBeGreaterThanOrEqual(0);
    expect(a.shade).toBeLessThanOrEqual(.22);
    expect(a.sunlight).toBeGreaterThanOrEqual(0);
    expect(a.sunlight).toBeLessThanOrEqual(.046);
    expect(a.density).toBeGreaterThanOrEqual(0);
    expect(a.density).toBeLessThanOrEqual(1);
   }
 });
 it('produces continuous shade and sunlight across positive and negative page boundaries',()=>{
  for(const seed of [0,42,1337,24680,8675309]){
   for(const edge of [-1024,-512,0,512,1024]){
    for(const y of [-800,-39,99,888]){
     const left=canopyLighting(seed,edge-.02,y,'standard');
     const right=canopyLighting(seed,edge+.02,y,'standard');
     expect(Math.abs(left.shade-right.shade)).toBeLessThan(.002);
     expect(Math.abs(left.sunlight-right.sunlight)).toBeLessThan(.002);
    }
   }
  }
 });
 it('forms smoothly varying connected shade with fine leafy breakup and sunlight openings',()=>{
  const cells=Array.from({length:256},(_,i)=>{
   const x=(i%16)*110-620,y=Math.floor(i/16)*110-520;
   return {broad:regionalCanopyDensity(1337,x,y),shade:canopyShadowField(1337,x,y),sun:canopySunlightField(1337,x,y)};
  });
  for(const field of ['broad','shade','sun'] as const){
   expect(cells.every(c=>c[field]>=0&&c[field]<=1)).toBe(true);
  }
  expect(new Set(cells.map(c=>c.shade.toFixed(3))).size).toBeGreaterThan(40);
  expect(cells.some(c=>c.sun>.05)).toBe(true);
  expect(new Set(cells.map(c=>c.broad.toFixed(3))).size).toBeGreaterThan(40);
  expect(canopyCoverage(1337,160,240)).toBe(canopyCoverage(1337,160,240));
  expect(canopyShadowField(1337,160,240)).not.toBe(canopyShadowField(2222,160,240));
 });
 it('lights landmarks subtly without affecting collision, terrain or unrelated far-away areas',()=>{
  const x=11000,y=-2500,site=(id:string)=>[{id,x,y,radius:120}];
  const normal=canopyLighting(1337,x,y,'standard');
  for(const id of ['pikachu-hollow','pewter-exit','campsite:10,-2','ancient-tree:-2,3']){
   const modified=canopyLighting(1337,x,y,'standard',site(id));
   expect(modified.shade).toBeLessThan(normal.shade);
   expect(modified.sunlight).toBeGreaterThan(normal.sunlight);
   expect(canopyLighting(1337,x+2000,y,'standard',site(id)))
    .toEqual(canopyLighting(1337,x+2000,y,'standard'));
  }
  expect(canopyLighting(1337,x,y,'standard',site('beedrill-nest')).shade)
   .toBeGreaterThanOrEqual(normal.shade);
 });
 it('keeps independent Off, Subtle and Standard settings and a barely visible vignette',()=>{
  expect(DEFAULT_SETTINGS.canopyIntensity).toBe('subtle');
  expect(canopyLighting(42,-800,1000,'off')).toEqual({shade:0,sunlight:0,density:0});
  const subtle=canopyLighting(42,-800,1000,'subtle');
  const standard=canopyLighting(42,-800,1000,'standard');
  expect(standard.shade).toBeGreaterThan(subtle.shade);
  expect(standard.sunlight).toBeGreaterThanOrEqual(subtle.sunlight);
  expect(vignetteAlpha(0,'standard')).toBe(0);
  expect(vignetteAlpha(.5,'standard')).toBe(0);
  expect(vignetteAlpha(1,'off')).toBe(0);
  expect(vignetteAlpha(1,'standard')).toBeLessThan(.04);
  expect(vignetteAlpha(1,'subtle')).toBeLessThan(vignetteAlpha(1,'standard'));
  expect(CANOPY_TEXTURE_RESOLUTION).toBeLessThanOrEqual(128);
 });
});
