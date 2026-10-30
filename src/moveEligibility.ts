import {MOVES} from './content';
import {chainsForSpecies,ordinaryPredecessor} from './data/moveChains';
import {fusionForResult,MOVE_FUSIONS} from './data/moveFusions';
import {MOVE_UNLOCKS} from './data/moveUnlocks';
import {moveCapacity} from './moveProgression';
import type {SimState} from './simulation';

/** All ancestry is data-driven, including both branches entering fusion outputs. */
export function moveAncestors(id:string,species:string){
  const ancestors=new Set<string>();
  const visit=(child:string)=>{
    const parents:string[]=[];
    for(const chain of chainsForSpecies(species))if(!chain.independentAncestors){const index=chain.stages.indexOf(child);if(index>0)parents.push(chain.stages[index-1]);}
    const fusion=fusionForResult(child);if(fusion?.family.includes(species))parents.push(...fusion.ingredients);
    for(const parent of parents)if(!ancestors.has(parent)){ancestors.add(parent);visit(parent);}
  };
  visit(id);return [...ancestors];
}
export const moveDescendsFrom=(id:string,ancestor:string,species:string)=>moveAncestors(id,species).includes(ancestor);
export function hasLineageConflict(state:Pick<SimState,'pokemonId'|'moveSlots'>,id:string,ignoreIds:readonly string[]=[]){
  return state.moveSlots.some(slot=>!ignoreIds.includes(slot.id)&&slot.id!==id&&(moveDescendsFrom(slot.id,id,state.pokemonId)||moveDescendsFrom(id,slot.id,state.pokemonId)));
}
export function moveUnlockRequirements(id:string,species:string){
  return [...new Set([id,...moveAncestors(id,species)].map(move=>MOVE_UNLOCKS[move]?.tm).filter((tm):tm is string=>!!tm))];
}
export function hasMoveUnlock(state:Pick<SimState,'pokemonId'|'discoveredTms'>,id:string){
  const rule=MOVE_UNLOCKS[id];
  return(!rule?.species||rule.species.includes(state.pokemonId))&&moveUnlockRequirements(id,state.pokemonId).every(tm=>(state.discoveredTms??[]).includes(tm));
}
export function canLearnMove(state:SimState,id:string){
  if(!MOVES[id]||!hasMoveUnlock(state,id)||hasLineageConflict(state,id))return false;
  const equipped=state.moveSlots.find(slot=>slot.id===id);if(equipped)return equipped.rank<5;
  if(!state.pokemon.learnset.includes(id))return false;
  if(fusionForResult(id)||ordinaryPredecessor(id,state.pokemonId))return false;
  const signature=chainsForSpecies(state.pokemonId).find(chain=>chain.kind==='signature'&&chain.stages.includes(id));
  if(signature){const stage=signature.stages.indexOf(id),current=signature.stages.indexOf(state.pokemon.startingMove);if(stage<current||stage>0&&id!==state.pokemon.startingMove)return false;}
  return state.moveSlots.length<moveCapacity(state.pokemon,state.level);
}
export function canEvolveMove(state:SimState,id:string){
  const previous=ordinaryPredecessor(id,state.pokemonId),slot=previous&&state.moveSlots.find(slot=>slot.id===previous.id);
  return!!MOVES[id]&&state.pokemon.learnset.includes(id)&&!!previous&&!!slot&&slot.rank>=previous.chain.requiredRank&&!state.moveSlots.some(slot=>slot.id===id)&&hasMoveUnlock(state,id)&&!hasLineageConflict(state,id,[previous.id]);
}
export function canFuseMove(state:SimState,id:string){
  const recipe=fusionForResult(id);if(!MOVES[id]||!state.pokemon.learnset.includes(id)||!recipe||!recipe.family.includes(state.pokemonId)||recipe.species&&!recipe.species.includes(state.pokemonId)||state.moveSlots.some(slot=>slot.id===id))return false;
  if((state.fusionHistory??[]).includes(id))return false;
  return hasMoveUnlock(state,id)&&recipe.ingredients.every(ingredient=>state.moveSlots.some(slot=>slot.id===ingredient&&slot.rank>=recipe.requiredRank)&&hasMoveUnlock(state,ingredient))&&!hasLineageConflict(state,id,recipe.ingredients);
}
export function moveProgressionOptions(state:SimState){
  const evolutions=chainsForSpecies(state.pokemonId).filter(chain=>chain.kind==='upgrade').flatMap(chain=>chain.stages.slice(1)).filter(id=>canEvolveMove(state,id));
  const fusions=MOVE_FUSIONS.filter(recipe=>canFuseMove(state,recipe.result)).map(recipe=>recipe.result);
  return{evolutions,fusions};
}
