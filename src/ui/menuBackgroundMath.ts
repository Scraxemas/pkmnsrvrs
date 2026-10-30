export interface BackgroundRect {x:number;y:number;width:number;height:number;scale:number;}
/** The camera/framing is stationary. Only masked environmental details animate. */
export function backgroundRect(width:number,height:number,sourceWidth:number,sourceHeight:number):BackgroundRect {
  const scale=Math.max(width/sourceWidth,height/sourceHeight),w=Math.ceil(sourceWidth*scale),h=Math.ceil(sourceHeight*scale);
  return{x:Math.round((width-w)/2),y:Math.round((height-h)/2),width:w,height:h,scale};
}
export function foliageWind(time:number,phase:number,row:number){return{x:Math.sin(time*.78+phase+row*2.4)*1.6+Math.sin(time*1.3+phase)*.4,y:Math.sin(time*.55+phase+row)*.6};}
export function waterRipple(time:number,index:number){const phase=(time/3.8+index/3)%1;return{radius:5+phase*22,alpha:Math.sin(phase*Math.PI)*.32};}
export class MenuAnimationClock {
  time=0;paused=false;reduced=false;
  advance(delta:number){if(!this.paused&&!this.reduced)this.time+=Math.max(0,Math.min(delta,100))/1000;return this.time;}
}
