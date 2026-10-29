// Only reviewed FRLG exports belong in the runtime catalog. Legacy atlas crops
// remain archived on disk and are never loaded into the playable stage.
export const ENVIRONMENT_ASSETS={
  grass:'frlg/grass_detail_a',grassFill:'frlg/grass',
  grassLeaves:'frlg/grass_leaves',grassRocks:'frlg/grass_detail_b',
  grassFlowers:'frlg/grass_flowers',forestFloor:'frlg/grass_detail_b',
  tallGrass:'frlg/tall_grass',grassFront:'frlg/tall_grass_front',pathAtlas:'frlg/path_atlas',waterAtlas:'frlg/water_atlas',
  treeLight:'frlg/tree',treeCluster:'frlg/tree_cluster',ancientTree:'frlg/tree_cluster',
  rockSmall:'frlg/rock_small',rockMedium:'frlg/rock_medium',bush:'frlg/bush',sapling:'frlg/sapling',
} as const;

export const ENVIRONMENT_ATLASES=new Set<string>([ENVIRONMENT_ASSETS.pathAtlas,ENVIRONMENT_ASSETS.waterAtlas]);
export const environmentKey=(name:string)=>`viridian-${name}`;
export const environmentUrl=(name:string)=>`${import.meta.env.BASE_URL}assets/environment/viridian/${name}.png`;
