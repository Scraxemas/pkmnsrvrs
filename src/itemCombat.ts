import {damageAmount,MoveDef,typeMultiplier} from './content';
import {ITEMS,ItemModifiers} from './items';
import {rankEffect} from './moveEffects';
import {seededRoll} from './random';
import type {Entity,SimState} from './simulation';

export interface ItemRuntime {sashUsed:boolean;bandReadyAt:number;graceUntil:number;bellReadyAt:number;helmetReadyAt:number;orbReadyAt:number;healFeedbackAt:number;}
export const freshItemRuntime=():ItemRuntime=>({sashUsed:false,bandReadyAt:0,graceUntil:0,bellReadyAt:0,helmetReadyAt:0,orbReadyAt:0,healFeedbackAt:-1});
export type FeedbackKind='heal'|'reflect'|'protect'|'stagger'|'recoil'|'magnet';
export interface ItemFeedback {kind:FeedbackKind;x:number;y:number;value:number;source?:string;}
export type DamageSource='contact'|'ranged'|'powderProjectile'|'powder'|'poison'|'terrain';
export function restoreHp(state:SimState,amount:number,source:string){
  if(state.hp<=0||amount<=0)return 0;const before=state.hp;state.hp=Math.min(state.maxHp,state.hp+amount);const healed=state.hp-before;
  if(healed>0&&state.time>=state.itemRuntime.healFeedbackAt+.35){state.feedback.push({kind:'heal',...state.player,value:healed,source});state.itemRuntime.healFeedbackAt=state.time;}return healed;
}
/** Shared damage entry for contacts, projectiles, poison and visible ground hazards. */
export function hurtPlayer(state:SimState,amount:number,source:DamageSource,mods:ItemModifiers,attacker?:Entity){
  if(state.hp<=0||state.time<state.itemRuntime.graceUntil)return 0;
  let damage=amount;if(source==='ranged'||source==='powderProjectile')damage*=1-mods.rangedGuard;
  if(source==='powder'||source==='poison'||source==='powderProjectile')damage*=1-mods.powderGuard;
  if(source==='terrain')damage*=1-mods.terrainGuard;
  const before=state.hp;
  if(damage>=state.hp){
    let protection:string|undefined;
    if(mods.fatalShield>0&&!state.itemRuntime.sashUsed){state.itemRuntime.sashUsed=true;state.itemRuntime.graceUntil=state.time+ITEMS.focusSash.rules!.grace!;protection='focusSash';}
    else if(mods.fatalChance>0&&state.time>=state.itemRuntime.bandReadyAt&&seededRoll(state)<mods.fatalChance){state.itemRuntime.bandReadyAt=state.time+ITEMS.focusBand.rules!.cooldown!;state.itemRuntime.graceUntil=state.time+ITEMS.focusBand.rules!.grace!;protection='focusBand';}
    if(protection){state.hp=1;state.feedback.push({kind:'protect',...state.player,value:1,source:protection});}else state.hp=0;
  }else state.hp-=damage;
  if(source==='contact'&&attacker&&mods.reflect>0&&state.time>=state.itemRuntime.helmetReadyAt){attacker.hp-=mods.reflect;state.itemRuntime.helmetReadyAt=state.time+ITEMS.rockyHelmet.rules!.cooldown!;state.feedback.push({kind:'reflect',x:attacker.x,y:attacker.y,value:mods.reflect,source:'rockyHelmet'});}
  return Math.max(0,before-state.hp);
}
export function moveDamage(state:SimState,move:MoveDef,target:Entity,rank:number,mods:ItemModifiers,statusPower=false){
  const fixed=move.kind==='fixed',fx=rankEffect(move,rank),base=fixed?move.power*fx.power*fx.damage:damageAmount(move,state.pokemon,{hp:target.maxHp/3,attack:40,defense:45,specialAttack:40,specialDefense:45,speed:target.speed},target.types,1)*fx.damage*fx.power;
  const vitamin=fixed?1:1+(move.damageClass==='Physical'?state.vitamins.protein:state.vitamins.calcium)*.025;
  const classBonus=move.damageClass==='Physical'?mods.physical:move.damageClass==='Special'?mods.special:0;
  const effective=typeMultiplier(move.type,target.types)>1?1+mods.effective:1;
  const critical=!statusPower&&mods.crit>0&&seededRoll(state)<mods.crit;
  const raw=base*(state.moveSlots.find(slot=>slot.id===move.id)?.evolutionPower??1)*state.powerBonus*(1+(state.masteries.overcharge??0)*.12)*vitamin*(1+(mods.typeDamage[move.type]??0))*(1+classBonus)*(1+mods.damage)*effective*(critical?1.5:1);
  return{amount:statusPower?raw:Math.max(0,Math.round(raw)),critical};
}
export function staggerEnemy(state:SimState,target:Entity,mods:ItemModifiers){
  if(target.hp<=0||mods.stagger<=0||state.time<(target.staggerImmuneUntil??0)||seededRoll(state)>=mods.stagger)return;
  const rules=ITEMS.kingsRock.rules!;target.staggerUntil=state.time+(target.boss?rules.bossDuration!:target.elite?rules.duration!*2/3:rules.duration!);target.staggerImmuneUntil=state.time+(target.boss?rules.bossCooldown!:rules.enemyCooldown!);
  state.feedback.push({kind:'stagger',x:target.x,y:target.y,value:target.staggerUntil-state.time,source:'kingsRock'});
}
export function successfulMove(state:SimState,mods:ItemModifiers,dealtDamage:boolean,appliedStatus:boolean){
  if(dealtDamage&&mods.hitHeal>0&&state.time>=state.itemRuntime.bellReadyAt){restoreHp(state,mods.hitHeal,'shellBell');state.itemRuntime.bellReadyAt=state.time+ITEMS.shellBell.rules!.cooldown!;}
  if((dealtDamage||appliedStatus)&&mods.recoil>0&&state.time>=state.itemRuntime.orbReadyAt){const cost=Math.min(Math.max(0,state.hp-1),state.maxHp*mods.recoil);state.hp-=cost;state.itemRuntime.orbReadyAt=state.time+ITEMS.lifeOrb.rules!.cooldown!;if(cost>0)state.feedback.push({kind:'recoil',...state.player,value:cost,source:'lifeOrb'});}
}
