/** One cached soft illumination mask, anchored to the illustration's sunlit clearing. */
export class MenuLightingController {
  private texture=document.createElement('canvas');
  constructor(){const c=this.texture;c.width=128;c.height=128;const g=c.getContext('2d')!,light=g.createRadialGradient(64,64,2,64,64,64);light.addColorStop(0,'rgba(255,243,183,.5)');light.addColorStop(.45,'rgba(239,240,167,.18)');light.addColorStop(1,'rgba(238,238,170,0)');g.fillStyle=light;g.fillRect(0,0,128,128);}
  draw(g:CanvasRenderingContext2D,x:number,y:number,width:number,height:number,time:number){g.save();g.globalCompositeOperation='screen';g.globalAlpha=.065+.025*Math.sin(time*Math.PI*2/26);g.drawImage(this.texture,Math.round(x-width/2),Math.round(y-height/2),Math.round(width),Math.round(height));g.restore();}
  destroy(){this.texture.width=0;this.texture.height=0;}
}
