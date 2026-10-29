export const ENVIRONMENT_ASSETS={
  grass:'grass',grassFill:'grass_fill',dirt:'dirt',dirtFill:'dirt_fill',pathNorth:'path_north',pathSouth:'path_south',pathWest:'path_west',pathEast:'path_east',pathCornerNw:'path_corner_nw',pathCornerNe:'path_corner_ne',pathCornerSw:'path_corner_sw',pathCornerSe:'path_corner_se',
  grassLeaves:'grass_leaves',grassRocks:'grass_rocks',grassFlowers:'grass_flowers',grassMushrooms:'grass_mushrooms',forestFloor:'forest_floor',
  treeLight:'tree_light',treeDark:'tree_dark',treeAutumn:'tree_autumn',treeCluster:'tree_cluster',treeClusterAlt:'tree_cluster_alt',ancientTree:'ancient_tree',ancientTreeRight:'ancient_tree_right',
  log:'log',logFlowers:'log_flowers',hollowLog:'hollow_log',stump:'stump',stumpLarge:'stump_large',rootArch:'root_arch',
  flowersWhite:'flowers_white',flowersPink:'flowers_pink',flowersBlue:'flowers_blue',flowersYellow:'flowers_yellow',flowersMixed:'flowers_mixed',
  water:'water',shoreNorth:'shore_north',shoreSouth:'shore_south',shoreWest:'shore_west',shoreEast:'shore_east',
  pondNw:'pond_nw',pondNe:'pond_ne',lilypads:'lilypads',lilyFlower:'lily_flower',reeds:'reeds',fern:'fern',fernTall:'fern_tall',
} as const;

export const environmentKey=(name:string)=>`viridian-${name}`;
export const environmentUrl=(name:string)=>`/assets/environment/viridian/${name}.png`;
