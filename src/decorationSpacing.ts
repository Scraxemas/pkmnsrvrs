/** World-space visual footprints are deliberately larger than collision circles.
 * Tree canopies must not form apparent barriers even when trunks are traversable.
 * Radii account for the largest displayed tree (52px wide at 2x scale) and
 * the full 51px boulder sprite (1x). They are independent of physical collision.
 */
export const SOLID_VISUAL_GAP=64;
export function solidVisualRadius(id:string,radius=0):number{
 if(id==='tree')return 74;
 if(id==='landRock'||id==='rock')return radius>28?36:24;
 return 28;
}
export function minSolidVisualDistance(a:{id:string;radius:number},b:{id:string;radius:number}):number{
 return solidVisualRadius(a.id,a.radius)+solidVisualRadius(b.id,b.radius)+SOLID_VISUAL_GAP;
}
