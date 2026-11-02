import {POKESPRITE_ASSETS} from './data/pokespriteAssets';
import type Phaser from 'phaser';
export {POKESPRITE_ASSETS};
export function itemArt(id:string,outlined=false){const art=POKESPRITE_ASSETS[id];if(!art)throw new Error(`Missing registered PokéSprite art: ${id}`);return outlined&&art.outline?art.outline:art.normal;}
export const itemTexture=(id:string,outlined=false)=>`pokesprite:${id}${outlined&&POKESPRITE_ASSETS[id]?.outline?':outline':''}`;
export const itemArtUrl=(path:string)=>`${import.meta.env.BASE_URL}assets/pokesprite/${path}`;
export const candyTier=(value:number)=>value<9?'xs':value<25?'s':value<60?'m':value<150?'l':'xl';
export function preloadItemArt(scene:Phaser.Scene){for(const [id,art] of Object.entries(POKESPRITE_ASSETS)){if(!scene.textures.exists(itemTexture(id)))scene.load.image(itemTexture(id),itemArtUrl(art.normal));if(art.outline&&!scene.textures.exists(itemTexture(id,true)))scene.load.image(itemTexture(id,true),itemArtUrl(art.outline));}}

const fallbackWarned=new Set<string>();
/** Stable pixel-art stand-ins when an asset request failed or an optional sprite is absent. */
export function safeItemTexture(scene:Phaser.Scene,id:string,outlined=false){
 const key=itemTexture(id,outlined);
 if(scene.textures.exists(key))return key;
 const category=id.startsWith('candy:')?'candy':id.startsWith('ball:')?'ball':'item';
 const fallback='generated:pokesprite-'+category;
 if(!scene.textures.exists(fallback)){
  const g=scene.add.graphics().setVisible(false);
  g.fillStyle(0x102a25,1).fillRect(0,0,32,32);
  if(category==='candy'){
   g.fillStyle(0xb3f6f7,1).fillTriangle(16,2,28,16,4,16).fillTriangle(4,16,28,16,16,30);
   g.fillStyle(0x54bbd5,1).fillTriangle(16,7,23,16,16,25);
  }else if(category==='ball'){
   g.fillStyle(0xf1ede0,1).fillCircle(16,16,12).fillStyle(0xe85752,1).fillRect(4,4,24,12);
   g.lineStyle(3,0x1f3030,1).strokeCircle(16,16,12).lineBetween(5,16,27,16);
   g.fillStyle(0xf9f6e7,1).fillCircle(16,16,4).lineStyle(2,0x1f3030,1).strokeCircle(16,16,4);
  }else{
   g.fillStyle(0xffd879,1).fillCircle(16,16,11);
   g.lineStyle(2,0x7c5832,1).strokeCircle(16,16,11);
   g.fillStyle(0xffffff,1).fillCircle(12,11,3);
  }
  g.generateTexture(fallback,32,32);g.destroy();
  scene.textures.get(fallback).setFilter(0);
 }
 if(!fallbackWarned.has(key)){fallbackWarned.add(key);console.warn('[item-art] Failed to load '+key+'; showing pixel-art fallback.');}
 return fallback;
}
