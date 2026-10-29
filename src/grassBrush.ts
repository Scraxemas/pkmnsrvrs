export interface GrassImpulse {started:number;lastContact:number;strength:number;direction:number;}
export interface GrassBend {rotation:number;scaleX:number;scaleY:number;}

/** Presentation-only impulses; walking through grass never changes simulation. */
export class GrassBrushField {
  readonly impulses=new Map<string,GrassImpulse>();
  readonly duration=.65;

  touch(key:string,time:number,vx:number,vy:number){
    const speed=Math.hypot(vx,vy);
    if(speed<8)return false;
    const old=this.impulses.get(key);
    if(old&&time-old.lastContact<.22)return false;
    const direction=Math.abs(vx)>8?Math.sign(vx):Math.sign(vy)||1;
    this.impulses.set(key,{started:time,lastContact:time,strength:.26*Math.min(1,speed/130),direction});
    return true;
  }

  sample(key:string,time:number):GrassBend|null {
    const impulse=this.impulses.get(key);
    if(!impulse)return null;
    const age=Math.max(0,time-impulse.started);
    if(age>=this.duration){this.impulses.delete(key);return null;}
    const rotation=impulse.direction*impulse.strength*Math.sin(age*22)*Math.exp(-age*6);
    return{rotation,scaleX:1+Math.abs(rotation)*.3,scaleY:1-Math.abs(rotation)*.45};
  }

  forget(key:string){this.impulses.delete(key);}
  clear(){this.impulses.clear();}
}
