/** Movement intent survives collision. Only accepted swept steps change position. */
export interface NpcMotion {
  x:number;y:number;vx:number;vy:number;blockedFor:number;avoidSign:1|-1;
  desiredVx?:number;desiredVy?:number;
  avoidX?:number;avoidY?:number;avoidUntil?:number;avoidRetryAt?:number;
}

export const NPC_STUCK_SECONDS=.75;
const AVOID_SECONDS=1.15;
const MAX_STEP=6;

export function resolveNpcMovement(body:NpcMotion,dirX:number,dirY:number,speed:number,dt:number,now:number,solid:(x:number,y:number)=>boolean){
  const length=Math.hypot(dirX,dirY),ux=length?dirX/length:0,uy=length?dirY/length:0;
  body.desiredVx=ux*speed;body.desiredVy=uy*speed;
  let checks=0;
  const blocked=(x:number,y:number)=>{checks++;return solid(x,y);};
  // A detour is selected once, after sustained blocking, then committed to for
  // a minimum interval. Never alternate tangent directions on collision frames.
  if(body.blockedFor+1e-9>=NPC_STUCK_SECONDS&&now>=(body.avoidRetryAt??0)&&speed>0){
    const candidates=[[-uy*body.avoidSign,ux*body.avoidSign],[uy*body.avoidSign,-ux*body.avoidSign]];
    for(const [x,y] of candidates){
      let clear=true;
      for(let distance=MAX_STEP;distance<=36;distance+=MAX_STEP)if(blocked(body.x+x*distance,body.y+y*distance)){clear=false;break;}
      if(clear){body.avoidX=x;body.avoidY=y;body.avoidUntil=now+AVOID_SECONDS;body.blockedFor=0;break;}
    }
    body.avoidRetryAt=now+AVOID_SECONDS;
  }
  const detour=now<(body.avoidUntil??0),headingX=detour?body.avoidX??ux:ux,headingY=detour?body.avoidY??uy:uy;
  const oldX=body.x,oldY=body.y,distance=Math.max(0,speed*dt),steps=Math.max(1,Math.ceil(distance/MAX_STEP));
  const mx=headingX*distance/steps,my=headingY*distance/steps;
  for(let step=0;step<steps;step++){
    if(!blocked(body.x+mx,body.y+my)){body.x+=mx;body.y+=my;continue;}
    // Slide only along components of the committed intent; collision never
    // introduces a backwards impulse or a corrective position snap.
    if(Math.abs(mx)>1e-9&&!blocked(body.x+mx,body.y))body.x+=mx;
    if(Math.abs(my)>1e-9&&!blocked(body.x,body.y+my))body.y+=my;
  }
  body.vx=dt>0?(body.x-oldX)/dt:0;body.vy=dt>0?(body.y-oldY)/dt:0;
  if(speed>0&&Math.hypot(body.vx,body.vy)<Math.max(2,speed*.08))body.blockedFor+=dt;
  else body.blockedFor=0;
  return{checks,headingX,headingY};
}
