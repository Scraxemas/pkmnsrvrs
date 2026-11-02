import {forestHash,forestNoise} from './forestPlan';

export type CanopyIntensity='off'|'subtle'|'standard';
export interface CanopySpot {x:number;y:number;radiusX:number;radiusY:number;opacity:number;phase:number;sunlight:boolean;}
/** Pure world-space canopy model. Never consumes combat RNG or mutates terrain. */
export function canopyCoverage(seed:number,x:number,y:number){
 const broad=forestNoise(seed,x,y,840,0x641a);
 const middle=forestNoise(seed,x,y,265,0x79c2);
 const fine=forestNoise(seed,x,y,82,0xa731);
 return Math.max(0,Math.min(1,broad*.55+middle*.33+fine*.12));
}
export function canopySpotsForPage(seed:number,pageX:number,pageY:number,size:number,intensity:CanopyIntensity):CanopySpot[]{
 if(intensity==='off')return [];
 const cell=182,spots:CanopySpot[]=[];
 // Every anchor has exactly one rendering-page owner. Its shadow can spill
 // across page edges without clipping; pages have an existing viewport margin.
 for(let cy=Math.floor(pageY/cell);cy<=Math.floor((pageY+size)/cell);cy++)
 for(let cx=Math.floor(pageX/cell);cx<=Math.floor((pageX+size)/cell);cx++){
  const h=forestHash(seed,cx,cy,0x9a31);
  const x=cx*cell+20+((h>>>7)%140),y=cy*cell+20+((h>>>16)%140);
  if(x<pageX||x>=pageX+size||y<pageY||y>=pageY+size)continue;
  const density=canopyCoverage(seed,x,y),coin=forestHash(seed,cx,cy,0xbc82)/4294967295;
  if(coin>.29+density*.47)continue;
  const sunlight=(h%9===0),sizeCode=forestHash(seed,cx,cy,0xf271);
  spots.push({x,y,radiusX:39+sizeCode%44,radiusY:30+(sizeCode>>>8)%38,
   opacity:(intensity==='standard'?.13:.085)*(.55+density*.85),
   phase:(sizeCode%628)/100,
   sunlight});
 }
 return spots;
}
/** A bounded radial falloff centered on the camera. Never a flashlight cone. */
export function vignetteAlpha(distanceFraction:number,intensity:CanopyIntensity){
 if(intensity==='off')return 0;
 const f=Math.max(0,Math.min(1,(distanceFraction-.38)/.62));
 return (intensity==='standard'?.105:.065)*f*f*(3-2*f);
}
