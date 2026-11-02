import {forestNoise} from './forestPlan';

export type CanopyIntensity='off'|'subtle'|'standard';
export interface CanopyLandmark {id:string;x:number;y:number;radius:number;}
export interface CanopyLight {shade:number;sunlight:number;density:number;}

const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};

/** Broad canopy density across roughly 1.2 km of world space; identical at page seams. */
export function regionalCanopyDensity(seed:number,x:number,y:number):number{
 return forestNoise(seed,x,y,1280,0x641a);
}

/** A continuous shadow mass, not a set of stamped leaf/circle positions.
 * Domain distortion and three noise scales form connected crowns with broken
 * edges. The function has no page origin and never consumes simulation RNG.
 */
export function canopyShadowField(seed:number,x:number,y:number):number{
 const warp=(forestNoise(seed,x,y,480,0x357a)-.5)*170;
 const broad=forestNoise(seed,x+warp,y-warp*.64,920,0x9cf2);
 const crown=forestNoise(seed,x-warp*.5,y+warp,330,0x79c2);
 const fragments=forestNoise(seed,x,y,78,0xa731);
 const mass=smooth(.33,.68,broad*.51+crown*.49);
 // Fine holes only break up established masses; open regions stay open.
 const holes=smooth(.22,.68,fragments);
 return clamp(mass*(.66+.34*holes));
}

/** Small warm shafts of light where the canopy opens. */
export function canopySunlightField(seed:number,x:number,y:number):number{
 const opening=forestNoise(seed,x,y,360,0xd02a);
 const fleck=forestNoise(seed,x+17,y-27,84,0xac73);
 return smooth(.55,.83,opening)*smooth(.54,.81,fleck);
}

function landmarkLighting(landmarks:readonly CanopyLandmark[],x:number,y:number){
 let opening=0,nest=0,ancient=0;
 for(const site of landmarks){
  const dx=x-site.x,dy=y-site.y,r=Math.max(170,site.radius+95);
  if(Math.abs(dx)>r||Math.abs(dy)>r)continue;
  const influence=1-smooth(.25,1,Math.hypot(dx,dy)/r);
  if(site.id==='beedrill-nest')nest=Math.max(nest,influence);
  else if(site.id==='pikachu-hollow'||site.id==='pewter-exit'||site.id.startsWith('campsite:'))
   opening=Math.max(opening,influence);
  else if(site.id.startsWith('ancient-tree:'))ancient=Math.max(ancient,influence);
 }
 return{opening,nest,ancient};
}

/** Returns transparent dark shade and light separately, for one color-composited
 * per-page texture. Scene entities, items, attacks and HUD are never darkened.
 */
export function canopyLighting(
 seed:number,x:number,y:number,intensity:CanopyIntensity,
 landmarks:readonly CanopyLandmark[]=[]
):CanopyLight{
 if(intensity==='off')return{shade:0,sunlight:0,density:0};
 const density=regionalCanopyDensity(seed,x,y);
 const shadow=canopyShadowField(seed,x,y);
 const flecks=canopySunlightField(seed,x,y);
 const nearby=landmarkLighting(landmarks,x,y);
 const strength=intensity==='standard'?1:.68;
 const base=clamp((shadow*.80+density*.20)*(.90+.10*density));
 const clearFactor=1-.60*nearby.opening-.32*nearby.ancient;
 const shade=Math.min(.22,strength*(.025+.175*base)*clearFactor*(1+.11*nearby.nest));
 const sunlight=Math.min(.046,strength*(.036*flecks*(1-base*.50)+.019*nearby.opening+.012*nearby.ancient));
 return{shade,sunlight,density};
}

/** Compatibility helper for existing visual diagnostics. */
export function canopyCoverage(seed:number,x:number,y:number){
 return clamp(canopyShadowField(seed,x,y)*.8+regionalCanopyDensity(seed,x,y)*.2);
}

/** An almost imperceptible edge grade; no flashlight effect. */
export function vignetteAlpha(distanceFraction:number,intensity:CanopyIntensity){
 if(intensity==='off')return 0;
 return (intensity==='standard'?.034:.016)*smooth(.52,1,distanceFraction);
}
