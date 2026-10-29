export interface Position { x:number;y:number; }

export const interpolationAlpha=(accumulator:number,step:number)=>Math.max(0,Math.min(1,step>0?accumulator/step:1));

export function interpolatePosition(previous:Position|undefined,current:Position,alpha:number,snapDistance=256):Position {
  if(!previous)return{x:current.x,y:current.y};
  const dx=current.x-previous.x,dy=current.y-previous.y;
  if(dx*dx+dy*dy>snapDistance*snapDistance)return{x:current.x,y:current.y};
  const t=Math.max(0,Math.min(1,alpha));
  return{x:previous.x+dx*t,y:previous.y+dy*t};
}

