import type Phaser from 'phaser';
import {MenuAnimationClock,backgroundRect,BackgroundRect} from './menuBackgroundMath';
import {MenuAmbientParticles} from './menuAmbientParticles';
import {MenuLightingController} from './menuLightingController';
import {MenuFoliageController} from './menuFoliageController';
import {MenuWaterController} from './menuWaterController';

/** Phaser owns the clock/lifecycle; this viewport canvas keeps ultrawide artwork undistorted. */
export class MenuBackgroundController {
  static activeCount=0;
  readonly canvas=document.createElement('canvas');readonly clock=new MenuAnimationClock();
  private context:CanvasRenderingContext2D;private particles=new MenuAmbientParticles();private lighting=new MenuLightingController();
  private foliage?:MenuFoliageController;private water?:MenuWaterController;
  private abort=new AbortController();private observer:ResizeObserver;private ready=false;private destroyed=false;
  private width=1;private height=1;private frames=0;private lastRect?:BackgroundRect;private totalDrawMs=0;private dirty=true;private explicitlyPaused=false;
  constructor(private scene:Phaser.Scene,private root:HTMLElement,private image:HTMLImageElement,reduced:boolean){
    MenuBackgroundController.activeCount++;this.canvas.className='menu-background-canvas';this.canvas.setAttribute('aria-hidden','true');this.canvas.setAttribute('role','presentation');this.root.prepend(this.canvas);this.context=this.canvas.getContext('2d',{alpha:false})!;this.clock.reduced=reduced;
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(root);this.resize();
    document.addEventListener('visibilitychange',this.visibility,{signal:this.abort.signal});
    this.visibility();
    this.scene.events.on('pause',this.pause);this.scene.events.on('sleep',this.pause);this.scene.events.on('resume',this.resume);this.scene.events.on('wake',this.resume);
    image.decode().then(()=>{if(!this.destroyed){this.foliage=new MenuFoliageController(image);this.water=new MenuWaterController(image);this.ready=true;this.draw();root.classList.add('has-animated-background');}}).catch(()=>{/* Keep the original image as a usable fallback. */});
  }
  setReducedMotion(value:boolean){if(this.clock.reduced!==value){this.clock.reduced=value;this.dirty=true;this.draw();}}
  private resize(){const bounds=this.root.getBoundingClientRect();this.width=Math.max(1,Math.round(bounds.width));this.height=Math.max(1,Math.round(bounds.height));this.canvas.width=this.width;this.canvas.height=this.height;this.context.imageSmoothingEnabled=false;this.dirty=true;this.draw();}
  private visibility=()=>{this.clock.paused=this.explicitlyPaused||document.hidden;};
  pause=()=>{this.explicitlyPaused=true;this.visibility();};
  resume=()=>{this.explicitlyPaused=false;this.visibility();};
  update(delta:number){
    if(this.destroyed||!this.ready)return;const before=this.clock.time,time=this.clock.advance(delta);if(time!==before)this.particles.update(time-before);
    if(time!==before||this.dirty)this.draw();
  }
  private draw(){
    if(!this.ready||this.destroyed)return;const start=performance.now(),g=this.context,time=this.clock.time,r=backgroundRect(this.width,this.height,this.image.naturalWidth,this.image.naturalHeight);this.lastRect=r;
    g.imageSmoothingEnabled=false;g.globalAlpha=1;g.globalCompositeOperation='source-over';g.drawImage(this.image,r.x,r.y,r.width,r.height);
    if(!this.clock.reduced){const x=r.x+r.width*.77,y=r.y+r.height*.4;this.lighting.draw(g,r,time);this.foliage?.draw(g,r,time);this.water?.draw(g,r,time);this.particles.draw(g,this.width,this.height,time,x,y);}
    this.frames++;this.totalDrawMs+=performance.now()-start;this.dirty=false;
  }
  snapshot(){return{ready:this.ready,time:this.clock.time,reduced:this.clock.reduced,paused:this.clock.paused,frames:this.frames,leafCount:this.clock.reduced?0:this.particles.leaves.length,maxLeaves:this.particles.maxLeaves,motes:this.clock.reduced?0:this.particles.maxMotes,cameraMotion:false,foliage:this.clock.reduced?null:this.foliage?.snapshot(this.clock.time),water:this.clock.reduced?null:this.water?.snapshot(this.clock.time),rays:this.clock.reduced?0:this.lighting.rayCount,rect:this.lastRect,width:this.width,height:this.height,smoothing:this.context.imageSmoothingEnabled,averageDrawMs:this.totalDrawMs/Math.max(1,this.frames),active:MenuBackgroundController.activeCount};}
  destroy(){
    if(this.destroyed)return;this.destroyed=true;this.abort.abort();this.observer.disconnect();this.scene.events.off('pause',this.pause);this.scene.events.off('sleep',this.pause);this.scene.events.off('resume',this.resume);this.scene.events.off('wake',this.resume);this.particles.destroy();this.lighting.destroy();this.foliage?.destroy();this.water?.destroy();this.canvas.remove();this.canvas.width=0;this.canvas.height=0;this.root.classList.remove('has-animated-background');MenuBackgroundController.activeCount--;
  }
}
