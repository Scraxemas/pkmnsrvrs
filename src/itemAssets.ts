import {POKESPRITE_ASSETS} from './data/pokespriteAssets';
import type Phaser from 'phaser';
export {POKESPRITE_ASSETS};
export function itemArt(id:string,outlined=false){const art=POKESPRITE_ASSETS[id];if(!art)throw new Error(`Missing registered PokéSprite art: ${id}`);return outlined&&art.outline?art.outline:art.normal;}
export const itemTexture=(id:string,outlined=false)=>`pokesprite:${id}${outlined&&POKESPRITE_ASSETS[id]?.outline?':outline':''}`;
export const itemArtUrl=(path:string)=>`${import.meta.env.BASE_URL}assets/pokesprite/${path}`;
export const candyTier=(value:number)=>value<9?'xs':value<25?'s':value<60?'m':value<150?'l':'xl';
export function preloadItemArt(scene:Phaser.Scene){for(const [id,art] of Object.entries(POKESPRITE_ASSETS)){if(!scene.textures.exists(itemTexture(id)))scene.load.image(itemTexture(id),itemArtUrl(art.normal));if(art.outline&&!scene.textures.exists(itemTexture(id,true)))scene.load.image(itemTexture(id,true),itemArtUrl(art.outline));}}
