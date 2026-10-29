export const FACINGS = [
  'south',
  'southeast',
  'east',
  'northeast',
  'north',
  'northwest',
  'west',
  'southwest',
] as const;

export type Facing = typeof FACINGS[number];

/** PMD Sprite Repository sheets store the eight directions in FACINGS order. */
export const facingRow = (facing:Facing)=>FACINGS.indexOf(facing);

export function facingFromVector(x:number,y:number,last:Facing='south'):Facing {
  if(Math.hypot(x,y)<.001)return last;
  // Screen coordinates use positive Y as south. Quantize to eight 45° sectors.
  const octant=Math.round(Math.atan2(x,y)/(Math.PI/4));
  const index=(octant+8)%8;
  return FACINGS[index];
}

export function facingVector(facing:Facing){
  const vectors:Record<Facing,{x:number;y:number}>={
    south:{x:0,y:1},southeast:{x:Math.SQRT1_2,y:Math.SQRT1_2},east:{x:1,y:0},
    northeast:{x:Math.SQRT1_2,y:-Math.SQRT1_2},north:{x:0,y:-1},
    northwest:{x:-Math.SQRT1_2,y:-Math.SQRT1_2},west:{x:-1,y:0},
    southwest:{x:-Math.SQRT1_2,y:Math.SQRT1_2},
  };
  return vectors[facing];
}
