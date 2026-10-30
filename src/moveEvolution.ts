import {moveAncestors,moveDescendsFrom} from './moveEligibility';

export interface EvolvingMoveSlot {id:string;rank:number;starter?:boolean;evolutionPower?:number;}
export interface MoveEvolutionRule {fromSpecies:string;toSpecies:string;fromMove:string;toMove:string;damageBonus?:number;}
export const MOVE_EVOLUTIONS:readonly MoveEvolutionRule[]=[
  {fromSpecies:'charmander',toSpecies:'charmeleon',fromMove:'scratch',toMove:'metalClaw'},
  {fromSpecies:'charmeleon',toSpecies:'charizard',fromMove:'metalClaw',toMove:'dragonClaw'},
  {fromSpecies:'bulbasaur',toSpecies:'ivysaur',fromMove:'vineWhip',toMove:'powerWhip'},
  {fromSpecies:'squirtle',toSpecies:'wartortle',fromMove:'tackle',toMove:'waterGun'},
  {fromSpecies:'wartortle',toSpecies:'blastoise',fromMove:'waterGun',toMove:'hydroPump'},
];
export type ProgressionNotice={kind:'slot';slot:number}|{kind:'move';from:string;to:string;rank:number;refund:number;fusion?:readonly [string,string]};
/** Keeps the starter's object/slot (including cooldown state). Duplicate ranks become chosen move rewards. */
export function transformStarterMove(slots:EvolvingMoveSlot[],fromSpecies:string,toSpecies:string,rules=MOVE_EVOLUTIONS){
  const notices:ProgressionNotice[]=[];
  for(const rule of rules.filter(rule=>rule.fromSpecies===fromSpecies&&rule.toSpecies===toSpecies)){
    const marked=slots.some(slot=>slot.starter),index=slots.findIndex(slot=>slot.id===rule.fromMove&&(slot.starter||!marked));if(index<0)continue;
    const slot=slots[index];let refund=0,target=rule.toMove;
    const descendants=slots.filter(other=>other!==slot&&(other.id===target||moveDescendsFrom(other.id,target,toSpecies)));
    if(descendants.length)target=[target,...descendants.map(other=>other.id)].sort((a,b)=>moveAncestors(b,toSpecies).length-moveAncestors(a,toSpecies).length)[0];
    const duplicates=slots.filter(other=>other!==slot&&(other.id===target||moveDescendsFrom(target,other.id,toSpecies)));
    for(const other of duplicates){refund+=Math.min(slot.rank,other.rank);slot.rank=Math.min(5,Math.max(slot.rank,other.rank));slot.evolutionPower=Math.max(slot.evolutionPower??1,other.evolutionPower??1);slots.splice(slots.indexOf(other),1);}
    slot.id=target;slot.starter=true;if(rule.damageBonus)slot.evolutionPower=(slot.evolutionPower??1)*(1+rule.damageBonus);
    notices.push({kind:'move',from:rule.fromMove,to:target,rank:slot.rank,refund});
  }return notices;
}
