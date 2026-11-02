import {describe,it,expect} from 'vitest';
import {canopyCoverage,canopySpotsForPage,vignetteAlpha} from '../src/forestCanopy';
import {DEFAULT_SETTINGS} from '../src/preferences';
describe('v0.7.2 deterministic canopy',()=>{
 it('reconstructs the same shadows in any generation order, including negative coordinates',()=>{
  for(let seed=0;seed<100;seed++){
   for(const [cx,cy] of [[0,0],[-1,0],[1,-2],[-101,91]]){
    const a=canopySpotsForPage(seed,cx*512,cy*512,512,'standard');
    expect(a).toEqual(canopySpotsForPage(seed,cx*512,cy*512,512,'standard'));
    expect(a.every(spot=>spot.x>=cx*512&&spot.x<(cx+1)*512&&spot.y>=cy*512&&spot.y<(cy+1)*512)).toBe(true);
   }
  }
 });
 it('assigns a shadow anchor to only one rendering page, even on seams',()=>{
  for(let cx=-5;cx<5;cx++)for(let cy=-3;cy<3;cy++){
   const left=canopySpotsForPage(137,cx*512,cy*512,512,'standard');
   const right=canopySpotsForPage(137,(cx+1)*512,cy*512,512,'standard');
   const ids=new Set(left.map(s=>s.x+','+s.y));
   expect(right.some(s=>ids.has(s.x+','+s.y))).toBe(false);
  }
 });
 it('keeps shade bounded, deterministic and visually variable',()=>{
  const points=Array.from({length:60},(_,i)=>canopyCoverage(1337,i*129-3100,i*-77+550));
  expect(points.every(x=>x>=0&&x<=1)).toBe(true);
  expect(new Set(points.map(x=>x.toFixed(3))).size).toBeGreaterThan(20);
  expect(points).toEqual(Array.from({length:60},(_,i)=>canopyCoverage(1337,i*129-3100,i*-77+550)));
  expect(points).not.toEqual(Array.from({length:60},(_,i)=>canopyCoverage(24680,i*129-3100,i*-77+550)));
 });
 it('allows independent visual settings without changing simulation terrain',()=>{
  expect(DEFAULT_SETTINGS.canopyIntensity).toBe('subtle');
  expect(canopySpotsForPage(1337,0,0,512,'off')).toEqual([]);
  const subtle=canopySpotsForPage(1337,0,0,512,'subtle');
  const standard=canopySpotsForPage(1337,0,0,512,'standard');
  expect(subtle.map(s=>[s.x,s.y])).toEqual(standard.map(s=>[s.x,s.y]));
  expect(standard.every((s,i)=>s.opacity>subtle[i].opacity)).toBe(true);
  expect(vignetteAlpha(0,'standard')).toBe(0);
  expect(vignetteAlpha(1,'standard')).toBeGreaterThan(vignetteAlpha(1,'subtle'));
  expect(vignetteAlpha(1,'off')).toBe(0);
 });
});
