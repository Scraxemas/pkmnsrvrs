export interface BackgroundRect {x:number;y:number;width:number;height:number;scale:number;}
/** Absolute-time motion: no random walk, accumulated easing drift, or loop seam. */
export function backgroundRect(width:number,height:number,sourceWidth:number,sourceHeight:number,time:number,reduced=false,parallax=1):BackgroundRect {
  const scale=Math.max(width/sourceWidth,height/sourceHeight)*(reduced?1:1.025),w=Math.ceil(sourceWidth*scale),h=Math.ceil(sourceHeight*scale);
  const phase=time*Math.PI*2/32,panX=reduced?0:Math.sin(phase)*4*scale*parallax,panY=reduced?0:Math.sin(phase+.7)*2*scale*parallax;
  return{x:Math.round((width-w)/2+panX),y:Math.round((height-h)/2+panY),width:w,height:h,scale};
}
export class MenuAnimationClock {
  time=0;paused=false;reduced=false;
  advance(delta:number){if(!this.paused&&!this.reduced)this.time+=Math.max(0,Math.min(delta,100))/1000;return this.time;}
}
