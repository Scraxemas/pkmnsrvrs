import type Phaser from 'phaser';
import {ENVIRONMENT_ASSETS,safeEnvironmentTexture} from './environmentAssets';
import type {Landmark} from './worldgen';

export type LandmarkKind='pikachu'|'nest'|'pewter'|'ancient'|'camp'|'cache'|'entrance';
export function landmarkKind(id:string):LandmarkKind|null{
 if(id==='pikachu-hollow')return 'pikachu';
 if(id==='beedrill-nest')return 'nest';
 if(id==='pewter-exit')return 'pewter';
 if(id.startsWith('ancient-tree:'))return 'ancient';
 if(id.startsWith('campsite:'))return 'camp';
 if(id.startsWith('tm-cache:'))return 'cache';
 if(id==='entrance')return 'entrance';
 return null;
}
export function landmarkDiscoveryLabel(id:string):string|null{
 switch(landmarkKind(id)){
  case 'pikachu':return 'PIKACHU HOLLOW';
  case 'nest':return 'BEEDRILL NEST';
  case 'pewter':return 'PEWTER OUTSKIRTS';
  case 'ancient':return 'ANCIENT TREE';
  case 'camp':return 'BUG CATCHER CAMPSITE';
  case 'entrance':return null; // Starting the run should not cover the combat screen.
  default:return null; // TM cache already has its own reward notice.
 }
}

/** A purely visual set piece. Discoveries, saved IDs and rewards belong to simulation.
 * Artwork is deliberately NON-colliding: keeps the endless forest open.
 * All returned objects are owned and destroyed by the rendering page.
 */
export function renderLandmarkArt(scene:Phaser.Scene,landmark:Landmark,layer:Phaser.GameObjects.Layer):Phaser.GameObjects.GameObject[]{
 const kind=landmarkKind(landmark.id);
 if(!kind||kind==='entrance'||kind==='camp'||kind==='cache')return [];
 const {x,y}=landmark,objects:Phaser.GameObjects.GameObject[]=[];
 const image=(name:string,dx:number,dy:number,scale:number,depth:number)=>{
  const o=scene.add.image(Math.round(x+dx),Math.round(y+dy),safeEnvironmentTexture(scene,name))
   .setOrigin(.5,1).setScale(scale).setDepth(depth).setData('landmarkArt',landmark.id);
  layer.add(o);objects.push(o);return o;
 };
 const graphic=(depth:number)=>{
  const g=scene.add.graphics().setDepth(depth).setData('landmarkArt',landmark.id);
  layer.add(g);objects.push(g);return g;
 };
 if(kind==='pikachu'){
  image(ENVIRONMENT_ASSETS.treeCluster,0,0,2.5,y);
  // The hollow and rim sit on the trunk; this is not a text label or a collider.
  const hole=graphic(y+1);
  hole.fillStyle(0x593f30,.98).fillEllipse(x,y-27,37,31);
  hole.fillStyle(0x1d211a,1).fillEllipse(x,y-27,25,23);
  hole.lineStyle(3,0x98714b,1).strokeEllipse(x,y-27,37,31);
  hole.fillStyle(0xf6df7b,.7).fillCircle(x+5,y-23,2);
  for(const [dx,dy] of [[-68,10],[66,16],[-52,-11],[54,-7]]){
   image(ENVIRONMENT_ASSETS.flowerYellow,dx,dy,1.8,y+dy);
  }
  image(ENVIRONMENT_ASSETS.bush,-91,19,1.5,y+20);
 }else if(kind==='nest'){
  image(ENVIRONMENT_ASSETS.treeLight,0,0,2.3,y);
  const web=graphic(y+1);
  web.lineStyle(1,0xd7d5ba,.75);
  for(let i=-2;i<=2;i++)web.lineBetween(x+i*7,y-60,x+i*13,y-18);
  for(const dy of [-51,-40,-29])web.strokeEllipse(x,y+dy,53,10);
  web.fillStyle(0xdac49c,1).fillEllipse(x-20,y-23,12,25).fillEllipse(x+23,y-20,14,28);
  web.lineStyle(2,0x716445,1).strokeEllipse(x-20,y-23,12,25).strokeEllipse(x+23,y-20,14,28);
  image(ENVIRONMENT_ASSETS.bush,-72,16,1.5,y+16);
 }else if(kind==='pewter'){
  const sign=graphic(y+1);
  sign.fillStyle(0x62442d).fillRect(x-4,y-45,8,48);
  sign.fillStyle(0xb88952).fillRoundedRect(x-33,y-56,66,27,3);
  sign.lineStyle(3,0x503626).strokeRoundedRect(x-33,y-56,66,27,3);
  sign.lineStyle(3,0xf7d89e).lineBetween(x-22,y-43,x+19,y-43);
  sign.lineBetween(x+19,y-43,x+12,y-50).lineBetween(x+19,y-43,x+12,y-36);
  image(ENVIRONMENT_ASSETS.flowerWhite,-48,12,1.7,y+12);
  image(ENVIRONMENT_ASSETS.landRockSmall,43,9,1,y+9);
 }else if(kind==='ancient'){
  image(ENVIRONMENT_ASSETS.ancientTree,0,0,3,y);
  image(ENVIRONMENT_ASSETS.flowerWhite,-66,12,1.7,y+12);
  image(ENVIRONMENT_ASSETS.flowerYellow,72,14,1.7,y+14);
 }
 return objects;
}
