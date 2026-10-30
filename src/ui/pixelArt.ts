import type Phaser from 'phaser';

export const UPGRADE_ART_DISPLAY_SIZE=64;

/** Uniform fitting and nearest-neighbor sampling shared by move and held-item art. */
export function pixelArt(scene:Phaser.Scene,x:number,y:number,texture:string,size:number,name:string){
  const image=scene.add.image(x,y,texture).setName(name);
  image.texture.setFilter(0); // Phaser.Textures.FilterMode.NEAREST
  return image.setScale(size/Math.max(image.width,image.height));
}
