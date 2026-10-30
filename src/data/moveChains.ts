import {BULBASAUR_FAMILY} from './bulbasaurMoves';

export interface MoveChain {id:string;kind:'signature'|'upgrade';family:readonly string[];stages:readonly string[];requiredRank:number;independentAncestors:boolean;}
/** Directed lineage data; shared moves can participate in family-specific branches. */
export const MOVE_CHAINS:readonly MoveChain[]=[
  {id:'grass-signature',kind:'signature',family:BULBASAUR_FAMILY,stages:['vineWhip','powerWhip'],requiredRank:0,independentAncestors:false},
  {id:'fire-signature',kind:'signature',family:['charmander','charmeleon','charizard'],stages:['scratch','metalClaw','dragonClaw'],requiredRank:0,independentAncestors:false},
  {id:'water-signature',kind:'signature',family:['squirtle','wartortle','blastoise'],stages:['tackle','waterGun','hydroPump'],requiredRank:0,independentAncestors:false},
  {id:'special-grass',kind:'upgrade',family:BULBASAUR_FAMILY,stages:['magicalLeaf','leafStorm'],requiredRank:5,independentAncestors:false},
  {id:'seed-artillery',kind:'upgrade',family:BULBASAUR_FAMILY,stages:['bulletSeed','seedBomb'],requiredRank:5,independentAncestors:false},
  {id:'poison-offense',kind:'upgrade',family:BULBASAUR_FAMILY,stages:['acidSpray','venoshock','sludgeBomb'],requiredRank:5,independentAncestors:false},
  {id:'poison-status',kind:'upgrade',family:BULBASAUR_FAMILY,stages:['poisonPowder','toxic'],requiredRank:5,independentAncestors:false},
  {id:'lifesteal',kind:'upgrade',family:BULBASAUR_FAMILY,stages:['leechSeed','megaDrain','gigaDrain'],requiredRank:5,independentAncestors:false},
  {id:'physical-impact',kind:'upgrade',family:BULBASAUR_FAMILY,stages:['tackle','takeDown','bodySlam'],requiredRank:5,independentAncestors:false},
];
export function chainsForSpecies(species:string){return MOVE_CHAINS.filter(chain=>chain.family.includes(species));}
export function ordinaryPredecessor(id:string,species:string){
  for(const chain of chainsForSpecies(species).filter(chain=>chain.kind==='upgrade')){const at=chain.stages.indexOf(id);if(at>0)return{chain,id:chain.stages[at-1]};}
}
