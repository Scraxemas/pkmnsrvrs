import type {DamageClass,PokemonType} from './content';
import type {SimState} from './simulation';

export type BuffKind='growth'|'swordsDance'|'helpingHand'|'sunlight'|'protect'|'trailblaze'|'leafRecovery'|'ingrain';
export interface TimedBuff {kind:BuffKind;remaining:number;strength:number;source:string;}
export interface MoveTerrain {id:number;moveId:string;kind:'poison'|'grass'|'roots'|'petals';x:number;y:number;radius:number;remaining:number;tick:number;strength:number;rank:number;followPlayer:boolean;}
export interface ChargedMove {moveId:string;rank:number;fireAt:number;tx:number;ty:number;signature:boolean;}
export interface CombatRuntime {buffs:TimedBuff[];terrains:MoveTerrain[];charges:ChargedMove[];healingTokens:number;healingAt:number;}
export const freshCombatRuntime=(maxHp:number):CombatRuntime=>({buffs:[],terrains:[],charges:[],healingTokens:maxHp*.2,healingAt:0});
export function buffStrength(state:SimState,kind:BuffKind){return state.combatRuntime?.buffs.find(buff=>buff.kind===kind&&buff.remaining>0)?.strength??0;}

/** One entry per buff kind: refresh duration/max strength, never multiply stacks. */
export function grantMoveBuff(state:SimState,kind:BuffKind,source:string,strength:number,duration:number){
 const buffs=state.combatRuntime.buffs,old=buffs.find(buff=>buff.kind===kind);
 const amount=Math.max(0,Math.min(.65,strength)),remaining=Math.max(0,Math.min(12,duration));
 if(old){old.strength=Math.max(old.strength,amount);old.remaining=Math.max(old.remaining,remaining);old.source=source;}
 else if(buffs.length<12)buffs.push({kind,source,strength:amount,remaining});
}

export function moveOffenseFactor(state:SimState,damageClass:DamageClass,type:PokemonType){
 let factor=1+buffStrength(state,'growth')+buffStrength(state,'helpingHand');
 if(damageClass==='Physical')factor+=buffStrength(state,'swordsDance');
 if(type==='Grass'||type==='Fire')factor+=buffStrength(state,'sunlight');
 if(type==='Grass'&&state.combatRuntime?.terrains.some(zone=>zone.kind==='grass'&&zone.remaining>0&&Math.hypot(state.player.x-zone.x,state.player.y-zone.y)<=zone.radius))factor+=.08;
 if(damageClass==='Special')factor*=1-buffStrength(state,'leafRecovery');
 return Math.max(.65,Math.min(2.1,factor));
}
export const moveGuardFactor=(state:SimState)=>Math.max(.25,1-buffStrength(state,'protect')-buffStrength(state,'ingrain'));

/** A shared burst bucket permits useful recovery while sustained move healing stays <=6% maxHP/s. */
export function spendHealingBudget(state:SimState,amount:number){
 if(state.hp<=0)return 0;
 amount=Math.max(0,Math.min(amount,state.maxHp-state.hp));
 const runtime=state.combatRuntime;if(!runtime)return amount;
 const elapsed=Math.max(0,state.time-runtime.healingAt);
 runtime.healingTokens=Math.min(state.maxHp*.2,runtime.healingTokens+elapsed*state.maxHp*.06);
 runtime.healingAt=state.time;
 const allowed=Math.max(0,Math.min(amount,runtime.healingTokens));runtime.healingTokens-=allowed;return allowed;
}
