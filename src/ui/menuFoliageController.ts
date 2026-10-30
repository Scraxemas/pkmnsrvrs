import {BackgroundRect,foliageWind} from './menuBackgroundMath';
import {FOLIAGE_REGIONS,foliageColor,maskCanvas,sceneMask,SceneRegion} from './menuSceneMasks';
interface Canopy {region:SceneRegion;mask:HTMLCanvasElement;buffer:HTMLCanvasElement;context:CanvasRenderingContext2D;pixels:number;}
/** Wind resamples leaf interiors only. The camera and woody silhouettes stay fixed. */
export class MenuFoliageController {
  private canopies:Canopy[]=[];
  constructor(private image:HTMLImageElement){
    for(const region of FOLIAGE_REGIONS){const buffer=document.createElement('canvas');buffer.width=region.width;buffer.height=region.height;const context=buffer.getContext('2d')!;context.drawImage(image,region.x,region.y,region.width,region.height,0,0,region.width,region.height);const alpha=sceneMask(context.getImageData(0,0,region.width,region.height).data,region,foliageColor);this.canopies.push({region,buffer,context,mask:maskCanvas(alpha,region.width,region.height),pixels:alpha.reduce((sum,a)=>sum+Number(a>0),0)});}
  }
  draw(g:CanvasRenderingContext2D,rect:BackgroundRect,time:number){
    const sx=rect.width/this.image.naturalWidth,sy=rect.height/this.image.naturalHeight;
    for(const canopy of this.canopies){const {region:r,context:c,buffer,mask}=canopy;c.clearRect(0,0,r.width,r.height);c.imageSmoothingEnabled=false;c.globalCompositeOperation='source-over';
      for(let y=0;y<r.height;y+=8){const wind=foliageWind(time,r.phase??0,y/r.height),height=Math.min(8,r.height-y);c.drawImage(this.image,r.x-Math.round(wind.x),r.y+y-Math.round(wind.y),r.width,height,0,y,r.width,height);}
      c.globalCompositeOperation='destination-in';c.drawImage(mask,0,0);c.globalCompositeOperation='source-over';
      g.drawImage(buffer,Math.round(rect.x+r.x*sx),Math.round(rect.y+r.y*sy),Math.ceil(r.width*sx),Math.ceil(r.height*sy));
    }
  }
  snapshot(time:number){return{regions:this.canopies.length,maskedPixels:this.canopies.reduce((sum,c)=>sum+c.pixels,0),wind:foliageWind(time,0,.5)};}
  destroy(){for(const c of this.canopies){c.mask.width=c.mask.height=0;c.buffer.width=c.buffer.height=0;}this.canopies=[];}
}
