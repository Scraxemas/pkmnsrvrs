/** Capacity depends on family stage, independently of level/item/branch evolution triggers. */
export interface MoveProgression {stage:1|2|3;stages:1|2|3;}
export interface ProgressionSpecies {id:string;moveProgression?:MoveProgression;}
export const MAX_MOVE_SLOTS=5;
const threeStage=(ids:string[])=>ids.map((id,index)=>[id,{stage:index+1,stages:3}]);
export const MOVE_PROGRESSIONS:Record<string,MoveProgression>=Object.fromEntries([
  ...threeStage(['bulbasaur','ivysaur','venusaur']),...threeStage(['charmander','charmeleon','charizard']),...threeStage(['squirtle','wartortle','blastoise']),
]);
export function moveProgression(species:ProgressionSpecies):MoveProgression{return species.moveProgression??MOVE_PROGRESSIONS[species.id]??{stage:1,stages:1};}
export function moveCapacity(species:ProgressionSpecies,level:number){
  const p=moveProgression(species);
  if(p.stages===3)return Math.min(MAX_MOVE_SLOTS,2+p.stage);
  if(p.stages===2)return p.stage===1?3:4+(level>=40?1:0);
  return 3+(level>=20?1:0)+(level>=40?1:0);
}
export function moveSlotStates(species:ProgressionSpecies,level:number){
  const p=moveProgression(species),capacity=moveCapacity(species,level);
  return Array.from({length:MAX_MOVE_SLOTS},(_,index)=>({number:index+1,unlocked:index<capacity,requirement:index<3?'':index===3?(p.stages===1?'Level 20':'First evolution'):p.stages===3?'Final evolution':p.stages===2&&p.stage===1?'Evolve + Level 40':'Level 40'}));
}
