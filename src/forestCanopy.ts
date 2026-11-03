import {forestHash,forestNoise} from './forestPlan';

export type CanopyIntensity='off'|'subtle'|'standard';
export interface CanopyLandmark {id:string;x:number;y:number;radius:number;}
export interface CanopyLight {shade:number;sunlight:number;density:number;}
interface SunLobe {x:number;y:number;rx:number;ry:number;cos:number;sin:number;reach:number;}
export interface SunOpening {x:number;y:number;extent:number;lobes:readonly SunLobe[];}

export const SUN_OPENING_CELL=560;
export const SUN_OPENING_REACH=340;
export const SUN_EDGE_SOFTNESS=16;
export const SHADE_STANDARD=.39;
export const SHADE_SUBTLE=.27;
const U32=4294967295;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smoothstep=(a:number,b:number,x:number)=>{
 const t=clamp((x-a)/(b-a));return t*t*(3-2*t);
};
const unit=(n:number)=>n/U32;

/** Slowly varying density changes the occurrence of sunlit areas, not the
 * rectangular shape of any region. Coordinates, including negatives, are global.
 */
export function regionalCanopyDensity(seed:number,x:number,y:number):number{
 return forestNoise(seed,x,y,1360,0x641a);
}
function makeLobe(x:number,y:number,rx:number,ry:number,angle:number):SunLobe{
 return{x,y,rx,ry,cos:Math.cos(angle),sin:Math.sin(angle),reach:Math.max(rx,ry)};
}
function openingForCell(seed:number,cx:number,cy:number):SunOpening|null{
 const h=forestHash(seed,cx,cy,0x5ca1),density=regionalCanopyDensity(seed,(cx+.5)*SUN_OPENING_CELL,(cy+.5)*SUN_OPENING_CELL);
 // Low-density regions can be almost entirely shaded. Other regions group
 // sunlight into rounded pools, not regularly spaced circles.
 if(unit(h)>.38+.55*density)return null;
 const jitterX=unit(forestHash(seed,cx,cy,0x316c))-.5;
 const jitterY=unit(forestHash(seed,cx,cy,0x9b37))-.5;
 const x=(cx+.5)*SUN_OPENING_CELL+jitterX*420;
 const y=(cy+.5)*SUN_OPENING_CELL+jitterY*420;
 const rx=138+unit(forestHash(seed,cx,cy,0x73da))*82;
 const ry=105+unit(forestHash(seed,cx,cy,0x14fc))*76;
 const angle=unit(forestHash(seed,cx,cy,0xaa31))*Math.PI*2;
 const lobes:SunLobe[]=[makeLobe(x,y,rx,ry,angle)];
 const count=2+(forestHash(seed,cx,cy,0x68b3)%2);
 for(let i=0;i<count;i++){
  const offsetAngle=angle+(i+.22)*Math.PI*2/count+
   (unit(forestHash(seed,cx,cy,0x8193+i))-.5)*.44;
  const offsetDistance=rx*(.36+unit(forestHash(seed,cx,cy,0x498b+i))*.22);
  const lx=x+Math.cos(offsetAngle)*offsetDistance,ly=y+Math.sin(offsetAngle)*offsetDistance*.85;
  const size=.48+unit(forestHash(seed,cx,cy,0x1984+i))*.20;
  lobes.push(makeLobe(lx,ly,rx*size,ry*(size+.05),angle+i*.27));
 }
 return{x,y,extent:SUN_OPENING_REACH,lobes};
}

/** Find exactly the same openings when pages stream in any order.
 * Expanded bounds also include edge samples in the texture gutter.
 * All rounded shapes are wholly inside their declared reach.
 */
export function sunOpeningsForRegion(seed:number,left:number,top:number,width:number,height:number):SunOpening[]{
 const pad=SUN_OPENING_REACH+SUN_OPENING_CELL*.5+210;
 const minX=Math.floor((left-pad)/SUN_OPENING_CELL),maxX=Math.floor((left+width+pad)/SUN_OPENING_CELL);
 const minY=Math.floor((top-pad)/SUN_OPENING_CELL),maxY=Math.floor((top+height+pad)/SUN_OPENING_CELL);
 const out:SunOpening[]=[];
 for(let cy=minY;cy<=maxY;cy++)for(let cx=minX;cx<=maxX;cx++){
  const opening=openingForCell(seed,cx,cy);
  if(!opening||opening.x+opening.extent<left||opening.x-opening.extent>left+width||
    opening.y+opening.extent<top||opening.y-opening.extent>top+height)continue;
  out.push(opening);
 }
 return out;
}

/** Approximate ellipse signed distance. Taking the minimum across overlapping
 * lobes gives one continuous silhouette with no internal transparent rings.
 * No squares, tile thresholds, or independent alpha accumulation.
 */
function lobeDistance(x:number,y:number,lobe:SunLobe):number{
 const dx=x-lobe.x,dy=y-lobe.y;
 if(Math.abs(dx)>lobe.reach+SUN_EDGE_SOFTNESS||Math.abs(dy)>lobe.reach+SUN_EDGE_SOFTNESS)
  return SUN_OPENING_REACH;
 const a=(dx*lobe.cos+dy*lobe.sin)/lobe.rx;
 const b=(-dx*lobe.sin+dy*lobe.cos)/lobe.ry;
 return (Math.sqrt(a*a+b*b)-1)*Math.min(lobe.rx,lobe.ry);
}

export function sunlightOpeningDistance(x:number,y:number,openings:readonly SunOpening[]):number{
 let nearest=SUN_OPENING_REACH;
 for(const opening of openings){
  if(Math.abs(x-opening.x)>opening.extent+SUN_EDGE_SOFTNESS||
     Math.abs(y-opening.y)>opening.extent+SUN_EDGE_SOFTNESS)continue;
  for(const lobe of opening.lobes){
   const dist=lobeDistance(x,y,lobe);
   if(dist<nearest)nearest=dist;
  }
 }
 return nearest;
}

export function sunlightOpeningMask(seed:number,x:number,y:number,openings?:readonly SunOpening[]):number{
 const candidates=openings??sunOpeningsForRegion(seed,x-1,y-1,2,2);
 const distance=sunlightOpeningDistance(x,y,candidates);
 return 1-smoothstep(-SUN_EDGE_SOFTNESS,SUN_EDGE_SOFTNESS,distance);
}
export function canopySunlightField(seed:number,x:number,y:number){return sunlightOpeningMask(seed,x,y);}
export function canopyShadowField(seed:number,x:number,y:number){return 1-sunlightOpeningMask(seed,x,y);}

function landmarkMask(site:CanopyLandmark,x:number,y:number):number{
 const dx=x-site.x,dy=y-site.y,r=Math.max(150,site.radius+70);
 if(Math.abs(dx)>r||Math.abs(dy)>r)return 0;
 // A soft, slightly asymmetric opening; no hard spotlight circle.
 const a=(dx+.10*dy)/r,b=(dy-.08*dx)/(r*.79);
 const d=(Math.sqrt(a*a+b*b)-1)*r;
 return 1-smoothstep(-22,22,d);
}
function adjustForLandmarks(opening:number,x:number,y:number,landmarks:readonly CanopyLandmark[]):number{
 let clear=0,nest=0;
 for(const site of landmarks){
  const local=landmarkMask(site,x,y);
  if(local===0)continue;
  if(site.id==='beedrill-nest')nest=Math.max(nest,local);
  else if(site.id==='pikachu-hollow'||site.id==='pewter-exit'||site.id.startsWith('campsite:'))
   clear=Math.max(clear,local*.78);
  else if(site.id.startsWith('ancient-tree:'))clear=Math.max(clear,local*.55);
 }
 return clamp(Math.max(opening,clear)*(1-nest*.7));
}

/** Ground-only tint: the forest is shaded by default; occasional ROUND
 * openings remove that shade and reveal the original bright grass.
 * Passing precomputed page candidates avoids per-pixel procedural allocation.
 */
export function canopyLighting(seed:number,x:number,y:number,intensity:CanopyIntensity,
 landmarks:readonly CanopyLandmark[]=[],openings?:readonly SunOpening[]):CanopyLight{
 if(intensity==='off')return{shade:0,sunlight:0,density:0};
 const natural=sunlightOpeningMask(seed,x,y,openings);
 const sunlight=adjustForLandmarks(natural,x,y,landmarks);
 const deep=intensity==='standard'?SHADE_STANDARD:SHADE_SUBTLE;
 const light=intensity==='standard'?.025:.02;
 const shade=deep*(1-sunlight)+light*sunlight;
 return{shade,sunlight,density:regionalCanopyDensity(seed,x,y)};
}
export function canopyCoverage(seed:number,x:number,y:number){return 1-sunlightOpeningMask(seed,x,y);}
