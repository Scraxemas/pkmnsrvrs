import type {BackgroundRect} from './menuBackgroundMath';
/** Soft shafts through the existing canopy opening, rather than camera movement. */
export class MenuLightingController {
  private texture=document.createElement('canvas');readonly rayCount=3;
  constructor(){const c=this.texture;c.width=64;c.height=256;const g=c.getContext('2d')!,pixels=g.createImageData(64,256);for(let y=0;y<256;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4,across=Math.sin(Math.PI*x/63)**2,along=Math.sin(Math.PI*y/255)**.7;pixels.data[i]=255;pixels.data[i+1]=245;pixels.data[i+2]=206;pixels.data[i+3]=Math.round(180*across*along);}g.putImageData(pixels,0,0);}
  draw(g:CanvasRenderingContext2D,rect:BackgroundRect,time:number){
    g.save();g.translate(rect.x,rect.y);g.scale(rect.width/1376,rect.height/768);g.globalCompositeOperation='screen';
    const rays=[[1098,122,-130,385,32],[1130,133,-65,367,24],[1164,150,2,344,19]];
    rays.forEach(([x,y,dx,dy,width],i)=>{g.save();g.translate(x,y);g.rotate(Math.atan2(-dx,dy)+Math.sin(time*.24+i)*.002);g.globalAlpha=.28+.065*Math.sin(time*.33+i*1.7);g.drawImage(this.texture,-width/2,0,width,Math.hypot(dx,dy));g.restore();});g.restore();
  }
  destroy(){this.texture.width=0;this.texture.height=0;}
}
