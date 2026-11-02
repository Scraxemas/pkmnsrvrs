import type Phaser from 'phaser';
import {NEAREST_PIXEL_FILTER} from './pixelFiltering';
import {FACINGS,Facing,facingRow} from './direction';
import {NATIVE_ACTIONS,NativeAction} from './data/nativeActions';
import type {PokemonAnimationState} from './animationState';

export type NativeActionKind='physical'|'special'|'hurt';
export const nativeTexture=(species:string,kind:NativeActionKind)=>`pokemon-action:${species}:${kind}`;
export const nativeAnimationKey=(species:string,kind:NativeActionKind,facing:Facing)=>`${nativeTexture(species,kind)}:${facing}`;
export function nativeActionFor(species:string,state:PokemonAnimationState,kind:NativeActionKind='physical'):NativeAction|undefined {
 return state==='attack'?NATIVE_ACTIONS[species]?.[kind]:state==='hit'?NATIVE_ACTIONS[species]?.hurt:undefined;
}
export function preloadNativeActions(scene:Phaser.Scene){for(const [species,actions] of Object.entries(NATIVE_ACTIONS))for(const [kind,action] of Object.entries(actions))if(action&&!scene.textures.exists(nativeTexture(species,kind as NativeActionKind)))scene.load.spritesheet(nativeTexture(species,kind as NativeActionKind),`${import.meta.env.BASE_URL}${action.path}`,{frameWidth:action.frameWidth,frameHeight:action.frameHeight});}
export function registerNativeAnimations(scene:Phaser.Scene){
 for(const [species,actions] of Object.entries(NATIVE_ACTIONS))for(const [kind,action] of Object.entries(actions)){
  if(!action||!scene.textures.exists(nativeTexture(species,kind as NativeActionKind)))continue;
  // Attack and hurt sheets must use NEAREST: setFilter(0) means LINEAR and blurs scaled pixel art.
  // Set it once per shared texture, rather than touching GPU state every frame.
  scene.textures.get(nativeTexture(species,kind as NativeActionKind)).setFilter(NEAREST_PIXEL_FILTER);
  for(const facing of FACINGS){const key=nativeAnimationKey(species,kind as NativeActionKind,facing);if(scene.anims.exists(key))continue;
   // Phaser adds per-frame duration to the default frame time; upstream ticks are60Hz.
   scene.anims.create({key,frames:action.durations.map((ticks,index)=>({key:nativeTexture(species,kind as NativeActionKind),frame:facingRow(facing)*action.frames+index,duration:(ticks-1)*1000/60})),frameRate:60,repeat:0});
  }
 }
}
