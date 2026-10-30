import {BULBASAUR_FAMILY} from './bulbasaurMoves';

export interface MoveFusion {id:string;ingredients:readonly [string,string];result:string;requiredRank:number;family:readonly string[];species?:readonly string[];rarity:'rare';}
export const MOVE_FUSIONS:readonly MoveFusion[]=[
  {id:'petalBlizzard',ingredients:['razorLeaf','petalDance'],result:'petalBlizzard',requiredRank:5,family:BULBASAUR_FAMILY,species:['venusaur'],rarity:'rare'},
  {id:'solarBeam',ingredients:['energyBall','sunnyDay'],result:'solarBeam',requiredRank:5,family:BULBASAUR_FAMILY,rarity:'rare'},
  {id:'sludgeWave',ingredients:['toxic','sludgeBomb'],result:'sludgeWave',requiredRank:5,family:BULBASAUR_FAMILY,rarity:'rare'},
  {id:'ingrain',ingredients:['synthesis','grassyTerrain'],result:'ingrain',requiredRank:5,family:BULBASAUR_FAMILY,rarity:'rare'},
];
export const fusionForResult=(id:string)=>MOVE_FUSIONS.find(recipe=>recipe.result===id);
