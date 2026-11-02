import type Phaser from 'phaser';
import {canopyLighting,vignetteAlpha,type CanopyIntensity,type CanopyLandmark} from './forestCanopy';

export const CANOPY_TEXTURE_RESOLUTION=96;
const CANOPY_SHADE=[18,54,42] as const;
const CANOPY_SUNLIGHT=[244,225,159] as const;

/** One soft pixel field per streamed page. Texture coordinates sample the
 * same absolute world positions irrespective of chunk order or sign.
 * Canopy shades ground only: actors, attacks, pickups and HUD remain bright.
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
   if(!texture)return;
   const ctx=texture.getContext(),gradient=ctx.createRadialGradient(256,144,70,256,144,300);
   const alpha=vignetteAlpha(1,intensity);
   gradient.addColorStop(0,'rgba(10,35,25,0)');
   gradient.addColorStop(.58,'rgba(10,35,25,0)');
   gradient.addColorStop(1,'rgba(10,35,25,'+alpha.toFixed(4)+')');
   ctx.fillStyle=gradient;ctx.fillRect(0,0,512,288);texture.refresh();
   texture.setFilter(0); // Linear is intentional for soft lighting, not Pokémon sprites.
  }
  this.vignette=scene.add.image(640,360,key).setDisplaySize(1280,720)
   .setScrollFactor(0).setDepth(3).setName('forest-canopy-vignette');
 }

 renderPage(cx:number,cy:number,size:number,landmarks:readonly CanopyLandmark[]=[]):Phaser.GameObjects.GameObject[]{
  if(this.intensity==='off')return [];
  const startX=cx*size,startY=cy*size,res=CANOPY_TEXTURE_RESOLUTION;
  const key=`forest-canopy-field:${this.seed}:${this.intensity}:${cx}:${cy}:${size}`;
  if(!this.scene.textures.exists(key)){
   const texture=this.scene.textures.createCanvas(key,res,res);
   if(!texture)return [];
   const ctx=texture.getContext(),data=ctx.createImageData(res,res);
   const relevant=landmarks.filter(l=>
    l.x+l.radius+200>startX&&l.x-l.radius-200<startX+size&&
    l.y+l.radius+200>startY&&l.y-l.radius-200<startY+size);
   for(let row=0;row<res;row++)for(let col=0;col<res;col++){
    const x=startX+(col+.5)*size/res,y=startY+(row+.5)*size/res;
    const {shade,sunlight}=canopyLighting(this.seed,x,y,this.intensity,relevant);
    // Compose cool translucent shade and warm sunlight in ONE smooth texture.
    const alpha=shade+sunlight*(1-shade),i=(row*res+col)*4;
    const darkWeight=shade/Math.max(alpha,1/255),lightWeight=1-darkWeight;
    data.data[i]=Math.round(CANOPY_SHADE[0]*darkWeight+CANOPY_SUNLIGHT[0]*lightWeight);
    data.data[i+1]=Math.round(CANOPY_SHADE[1]*darkWeight+CANOPY_SUNLIGHT[1]*lightWeight);
    data.data[i+2]=Math.round(CANOPY_SHADE[2]*darkWeight+CANOPY_SUNLIGHT[2]*lightWeight);
    data.data[i+3]=Math.round(alpha*255);
   }
   ctx.putImageData(data,0,0);texture.refresh();
   texture.setFilter(0); // Smooth interpolated canopy edges; pixel-art assets remain NEAREST.
  }
  const image=this.scene.add.image(startX+size/2,startY+size/2,key)
   .setDisplaySize(size,size).setDepth(0).setName('canopy-page-'+cx+','+cy)
   .setData('canopyPage',cx+','+cy);
  this.layer.add(image);
  // Same lifecycle as world page objects; no unbounded persistent GPU texture cache.
  image.once('destroy',()=>{
   if(this.scene.textures.exists(key))this.scene.textures.remove(key);
  });
  return [image];
 }
}
