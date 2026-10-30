import type Phaser from 'phaser';
import {MOVES} from './content';

export const MOVE_ICON_SIZE=32;
/** File names deliberately preserve the move ID's case for case-sensitive hosts. */
export const MOVE_ASSETS:Readonly<Record<string,{id:string;path:string;width:number;height:number}>>=Object.freeze(Object.fromEntries(Object.keys(MOVES).map(id=>[id,{id,path:`assets/moves/${id}.png`,width:MOVE_ICON_SIZE,height:MOVE_ICON_SIZE}])));
export const moveTexture=(id:string)=>`move:${id}`;
export const moveArtUrl=(id:string)=>`${import.meta.env.BASE_URL}${MOVE_ASSETS[id]?.path??`assets/moves/${id}.png`}`;
const warned=new Set<string>();

/** A missing asset may use the legacy presentation, but must be visible in development. */
export function hasMoveArt(scene:Phaser.Scene,id:string){
  const available=!!MOVE_ASSETS[id]&&scene.textures.exists(moveTexture(id));
  if(!available&&import.meta.env.DEV&&!warned.has(id)){warned.add(id);console.warn(`[move-art] Missing PNG for ${id}: ${moveArtUrl(id)}; using presentation fallback.`);}
  return available;
}
export function preloadMoveArt(scene:Phaser.Scene){
  for(const id of Object.keys(MOVE_ASSETS))if(!scene.textures.exists(moveTexture(id)))scene.load.image(moveTexture(id),moveArtUrl(id));
}
