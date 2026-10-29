export const ENVIRONMENT_ASSETS={
  grass:'frlg/grass_detail_a',grassFill:'frlg/grass',dirt:'frlg/path_center',dirtFill:'frlg/path_center',pathNorth:'frlg/path_n',pathSouth:'frlg/path_s',pathWest:'frlg/path_w',pathEast:'frlg/path_e',pathCornerNw:'frlg/path_nw',pathCornerNe:'frlg/path_ne',pathCornerSw:'frlg/path_sw',pathCornerSe:'frlg/path_se',
  grassLeaves:'frlg/grass_leaves',grassRocks:'frlg/grass_detail_b',grassFlowers:'frlg/grass_flowers',grassMushrooms:'grass_mushrooms',forestFloor:'frlg/grass_detail_b',
  treeLight:'frlg/tree',treeDark:'frlg/tree',treeAutumn:'frlg/tree',treeCluster:'frlg/tree_cluster',treeClusterAlt:'frlg/tree_cluster',ancientTree:'frlg/tree_cluster',ancientTreeRight:'frlg/tree_cluster',
  log:'log',logFlowers:'log_flowers',hollowLog:'hollow_log',stump:'stump',stumpLarge:'stump_large',rootArch:'root_arch',
  flowersWhite:'flowers_white',flowersPink:'flowers_pink',flowersBlue:'flowers_blue',flowersYellow:'flowers_yellow',flowersMixed:'flowers_mixed',
  water:'frlg/water',shoreNorth:'frlg/water_n',shoreSouth:'frlg/water_s',shoreWest:'frlg/water_w',shoreEast:'frlg/water_e',
  pondNw:'frlg/water_nw',pondNe:'frlg/water_ne',pondSw:'frlg/water_sw',pondSe:'frlg/water_se',lilypads:'lilypads',lilyFlower:'lily_flower',reeds:'reeds',fern:'fern',fernTall:'fern_tall',
} as const;

export const environmentKey=(name:string)=>`viridian-${name}`;
export const environmentUrl=(name:string)=>`${import.meta.env.BASE_URL}assets/environment/viridian/${name}.png`;
