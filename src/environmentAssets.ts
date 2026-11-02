import type Phaser from 'phaser';
import {NEAREST_PIXEL_FILTER} from './pixelFiltering';

// Reviewed FRLG crops plus the original campsite/flower pixel artwork. Legacy
// atlas crops remain archived and never enter the playable stage.
export const ENVIRONMENT_ASSETS={
  grass:'frlg/grass_detail_a',grassFill:'frlg/grass',
  grassLeaves:'frlg/grass_leaves',grassRocks:'frlg/grass_detail_b',
  grassFlowers:'frlg/grass_flowers',forestFloor:'frlg/grass_detail_b',
  tallGrass:'frlg/tall_grass',grassFront:'frlg/tall_grass_front',pathAtlas:'frlg/path_atlas',waterAtlas:'frlg/water_atlas',cliffAtlas:'frlg/cliff_atlas',
  treeLight:'frlg/tree',treeCluster:'frlg/tree_cluster',ancientTree:'frlg/tree_cluster',
  bush:'frlg/bush',sapling:'frlg/sapling',
  landRockSmall:'frlg/land_rock_small',landBoulder:'frlg/land_boulder',waterRock:'frlg/rock_medium',shoreRock:'frlg/rock_small',
  tent:'original/tent',campLog:'original/camp_log',supplies:'original/supplies',reeds:'original/reeds',
  flowerWhite:'original/flowers_white',flowerYellow:'original/flowers_yellow',flowerPink:'original/flowers_pink',
} as const;

export const ENVIRONMENT_ATLASES=new Set<string>([ENVIRONMENT_ASSETS.pathAtlas,ENVIRONMENT_ASSETS.waterAtlas,ENVIRONMENT_ASSETS.cliffAtlas]);
export const environmentKey=(name:string)=>`viridian-${name}`;
export const environmentUrl=(name:string)=>`${import.meta.env.BASE_URL}assets/environment/viridian/${name}.${name.startsWith('original/')?'svg':'png'}`;

const warnedMissingEnvironment=new Set<string>();
/** Render recognizable terrain rather than Phaser's neon-green __MISSING art. */
export function safeEnvironmentTexture(scene:Phaser.Scene,name:string){
 const key=environmentKey(name);
 if(scene.textures.exists(key))return key;
 const fallback='generated:viridian-prop';
 if(!scene.textures.exists(fallback)){
  const g=scene.add.graphics().setVisible(false);
  g.fillStyle(0x669c72,1).fillCircle(16,17,12);
  g.fillStyle(0x91c18e,1).fillCircle(12,12,8);
  g.lineStyle(2,0x2b6848,1).strokeCircle(16,17,12);
  g.generateTexture(fallback,32,32);g.destroy();
  scene.textures.get(fallback).setFilter(NEAREST_PIXEL_FILTER);
 }
 if(!warnedMissingEnvironment.has(key)){warnedMissingEnvironment.add(key);console.warn('[forest-art] Failed to load '+key+'; showing original fallback.');}
 return fallback;
}
