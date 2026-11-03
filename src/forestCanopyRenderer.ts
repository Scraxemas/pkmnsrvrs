import type Phaser from 'phaser';
import {
 canopyLighting,sunOpeningsForRegion,type CanopyIntensity,type CanopyLandmark
} from './forestCanopy';

export const CANOPY_TEXTURE_RESOLUTION=128;
export const CANOPY_TEXTURE_GUTTER=1;
const SHADE_COLOR=[13,45,34] as const;

/** A single continuous dark-green canopy shadow layer, punched through by
 * rounded sunlit areas. No overhead art and no camera-space vignette.
 * All lighting is underneath Pokémon, enemies, projectiles and the HUD.
 */
export class ForestCanopyRenderer{
 readonly layer:Phaser.GameObjects.Layer;
 constructor(private scene:Phaser.Scene,private seed:number,readonly intensity:CanopyIntensity){
  this.layer=scene.add.layer().setName('canopy-shadows-layer').setDepth(.5);
 }

 renderPage(cx:number,cy:number,size:number,landmarks:readonly CanopyLandmark[]=[]):Phaser.GameObjects.GameObject[]{
  if(this.intensity==='off')return [];
  const left=cx*size,top=cy*size,res=CANOPY_TEXTURE_RESOLUTION,gutter=CANOPY_TEXTURE_GUTTER;
  const pitch=size/res;
  const key=`forest-canopy-field:${this.seed}:${this.intensity}:${cx}:${cy}:${size}`;
  if(!this.scene.textures.exists(key)){
   const width=res+gutter*2;
   const texture=this.scene.textures.createCanvas(key,width,width);
   if(!texture)return [];
   const ctx=texture.getContext(),pixels=ctx.createImageData(width,width);
   const openings=sunOpeningsForRegion(this.seed,left-pitch,top-pitch,size+pitch*2,size+pitch*2);
   const relevant=landmarks.filter(site=>{
    const r=Math.max(150,site.radius+70)+pitch;
    return site.x+r>left&&site.x-r<left+size&&site.y+r>top&&site.y-r<top+size;
   });
   // Gutters are sampled in world coordinates, NOT copied from the adjacent
   // page. Linear sampling through the cropped frame sees matching neighbors.
   for(let row=0;row<width;row++)for(let col=0;col<width;col++){
    const x=left+(col-gutter+.5)*pitch;
    const y=top+(row-gutter+.5)*pitch;
    const shade=canopyLighting(this.seed,x,y,this.intensity,relevant,openings).shade;
    const i=(row*width+col)*4;
    pixels.data[i]=SHADE_COLOR[0];
    pixels.data[i+1]=SHADE_COLOR[1];
    pixels.data[i+2]=SHADE_COLOR[2];
    pixels.data[i+3]=Math.round(shade*255);
   }
   ctx.putImageData(pixels,0,0);
   texture.refresh();
   texture.setFilter(0); // LINEAR for the lighting only; Pokémon stay NEAREST.
   texture.add('world-page',0,gutter,gutter,res,res);
  }
  const image=this.scene.add.image(left+size/2,top+size/2,key,'world-page')
   .setDisplaySize(size,size).setDepth(0)
   .setName('canopy-page-'+cx+','+cy).setData('canopyPage',cx+','+cy);
  this.layer.add(image);
  // No persistent GPU cache: this texture is owned by its streaming page.
  image.once('destroy',()=>{
   if(this.scene.textures.exists(key))this.scene.textures.remove(key);
  });
  return [image];
 }
}
