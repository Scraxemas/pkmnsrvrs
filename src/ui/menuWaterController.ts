import {BackgroundRect,waterRipple} from './menuBackgroundMath';
import {maskCanvas,POND_REGION,sceneMask,waterColor} from './menuSceneMasks';
/** Pond-local reflection flow and pixel ripples, clipped inside the fixed shoreline. */
export class MenuWaterController {
  private buffer=document.createElement('canvas');private mask:HTMLCanvasElement;private context:CanvasRenderingContext2D;private pixels:number;
  constructor(private image:HTMLImageElement){const r=POND_REGION;this.buffer.width=r.width;this.buffer.height=r.height;this.context=this.buffer.getContext('2d')!;this.context.drawImage(image,r.x,r.y,r.width,r.height,0,0,r.width,r.height);const alpha=sceneMask(this.context.getImageData(0,0,r.width,r.height).data,r,waterColor);this.mask=maskCanvas(alpha,r.width,r.height);this.pixels=alpha.reduce((sum,a)=>sum+Number(a>0),0);}
  draw(g:CanvasRenderingContext2D,rect:BackgroundRect,time:number){const r=POND_REGION,c=this.context;c.clearRect(0,0,r.width,r.height);c.imageSmoothingEnabled=false;c.globalCompositeOperation='source-over';c.globalAlpha=1;
    for(let y=0;y<r.height;y+=2){const dx=Math.round(Math.sin(time*1.15+y*.3));c.drawImage(this.image,r.x+dx,r.y+y,r.width,Math.min(2,r.height-y),0,y,r.width,Math.min(2,r.height-y));}
    c.fillStyle='#e5fff5';const centers=[[80,27],[165,37],[216,23]];
    centers.forEach(([x,y],i)=>{const ripple=waterRipple(time,i);c.globalAlpha=ripple.alpha;for(let a=0;a<12;a++){const angle=a*Math.PI/6,rx=ripple.radius,ry=rx*.21;c.fillRect(Math.round(x+Math.cos(angle)*rx)-2,Math.round(y+Math.sin(angle)*ry),a%3===0?5:3,1);}});
    c.globalAlpha=.13+.1*(.5+.5*Math.sin(time*1.2));c.fillRect(120+Math.round(Math.sin(time*.65)*4),20,9,1);c.fillRect(181+Math.round(Math.sin(time*.8)*3),42,6,1);c.globalAlpha=1;
    c.globalCompositeOperation='destination-in';c.drawImage(this.mask,0,0);c.globalCompositeOperation='source-over';const sx=rect.width/this.image.naturalWidth,sy=rect.height/this.image.naturalHeight;g.drawImage(this.buffer,Math.round(rect.x+r.x*sx),Math.round(rect.y+r.y*sy),Math.ceil(r.width*sx),Math.ceil(r.height*sy));
  }
  snapshot(time:number){return{maskedPixels:this.pixels,ripples:[0,1,2].map(index=>waterRipple(time,index))};}
  destroy(){this.mask.width=this.mask.height=0;this.buffer.width=this.buffer.height=0;}
}
