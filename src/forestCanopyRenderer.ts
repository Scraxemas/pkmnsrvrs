import type Phaser from 'phaser';
import {canopySpotsForPage,vignetteAlpha,type CanopyIntensity} from './forestCanopy';

/** Static world-page shadows: one Graphics object/page, no actor occlusion.
 * The owning scene's chunkViews destroys the graphics when a page streams out.
 */
export class ForestCanopyRenderer{
 readonly layer:Phaser.GameObjects.Layer;
 readonly vignette?:Phaser.GameObjects.Image;
 constructor(private scene:Phaser.Scene,private seed:number,readonly intensity:CanopyIntensity){
  this.layer=scene.add.layer().setName('canopy-shadows-layer').setDepth(.5);
  if(intensity==='off')return;
  const key='forest-vignette-'+intensity;
  if(!scene.textures.exists(key)){
   const texture=scene.textures.createCanvas(key,512,288);
   if(!texture)return; // Fallback to ground-only canopy if CanvasTexture is unavailable.
   const ctx=texture.getContext();
   const gradient=ctx.createRadialGradient(256,144,40,256,144,300);
   const alpha=vignetteAlpha(1,intensity);
   gradient.addColorStop(0,'rgba(10,35,25,0)');
   gradient.addColorStop(.42,'rgba(10,35,25,0)');
   gradient.addColorStop(1,'rgba(10,35,25,'+alpha.toFixed(4)+')');
   ctx.fillStyle=gradient;ctx.fillRect(0,0,512,288);texture.refresh();
  }
  this.vignette=scene.add.image(640,360,key).setDisplaySize(1280,720)
   .setScrollFactor(0).setDepth(3).setName('forest-canopy-vignette');
 }
 renderPage(cx:number,cy:number,size:number):Phaser.GameObjects.GameObject[]{
  if(this.intensity==='off')return [];
  const spots=canopySpotsForPage(this.seed,cx*size,cy*size,size,this.intensity);
  if(!spots.length)return [];
  const g=this.scene.add.graphics().setDepth(0).setName('canopy-page-'+cx+','+cy)
   .setData('canopyPage',cx+','+cy);
  this.layer.add(g);
  for(const spot of spots){
   const {x,y,radiusX:rx,radiusY:ry,opacity:o,phase}=spot;
   // Overlapping soft leaf lobes instead of dark square page overlays.
   // These shapes are bound to GLOBAL positions, not page-local random seeds.
   // A near-invisible soft halo connects disjoint leaf silhouettes.
   g.fillStyle(0x143a2b,o*.08).fillEllipse(x,y,rx*2.3,ry*2.1);
   const leaves=9;
   for(let i=0;i<leaves;i++){
    const theta=phase+i*Math.PI*2/leaves;
    const px=x+Math.cos(theta)*rx*.55,py=y+Math.sin(theta)*ry*.48;
    const stretch=.45+(i%3)*.11,shape: {x:number;y:number}[]=[];
    for(let vertex=0;vertex<9;vertex++){
     const angle=vertex*Math.PI*2/9;
     const irregular=1+.20*Math.sin(vertex*2.4+i*1.7+phase);
     shape.push({x:px+Math.cos(angle)*rx*stretch*irregular,y:py+Math.sin(angle)*ry*(.25+(i%2)*.07)*irregular});
    }
    g.fillStyle(i%3===0?0x214b36:0x153d2e,o*(i%3===0?.48:.68)).fillPoints(shape,true);
   }
   if(spot.sunlight){
    g.fillStyle(0xf5e5ac,.025).fillEllipse(x+rx*.35,y-ry*.35,rx*1.1,ry*.9);
   }
  }
  return [g];
 }
}
