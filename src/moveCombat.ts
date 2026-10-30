import {MOVES,MoveDef} from './content';
import type {AttackEvent,Entity,MoveSlot,SimState,Status} from './simulation';
import {ItemModifiers} from './items';
import {moveDamage,restoreHp,staggerEnemy,successfulMove} from './itemCombat';
import {moveRankStats} from './moveEffects';
import {seededRoll} from './random';
import {collides} from './worldgen';
import {BuffKind,buffStrength,grantMoveBuff,spendHealingBudget} from './combatRuntime';

export type CombatPattern='single'|'line'|'radial'|'multishot'|'homing'|'explosion'|'cyclone'|'columns'|'charge'|'drain'|'cloud'|'beam'|'support';
export type EnemyDebuffKind=Status['kind'];
export interface MoveCombatProfile {pattern:CombatPattern;effect?:EnemyDebuffKind;duration?:number;targets?:number;radius?:number;healRatio?:number;healFlat?:number;poisonBonus?:number;sizeBonus?:number;recoil?:number;chargeSeconds?:number;recoverySeconds?:number;support?:BuffKind;strength?:number;terrain?:'poison'|'grass'|'roots'|'petals';strikes?:number;advance?:number;}

/** Composable mechanics, independent of species/learnsets and of the visual registry. */
export const MOVE_COMBAT_PROFILES:Readonly<Record<string,MoveCombatProfile>>={
 vineWhip:{pattern:'line',radius:24},powerWhip:{pattern:'line',targets:3,radius:34},
 magicalLeaf:{pattern:'homing',targets:3},leafStorm:{pattern:'cyclone',targets:20,recoverySeconds:2},
 bulletSeed:{pattern:'multishot',targets:3,strikes:3},seedBomb:{pattern:'explosion',radius:56,targets:12},
 acidSpray:{pattern:'line',effect:'defenseBreak',duration:4,targets:3,radius:22},
 venoshock:{pattern:'explosion',radius:30,targets:5,poisonBonus:1.85},
 sludgeBomb:{pattern:'explosion',radius:70,targets:16,effect:'poison',duration:5,poisonBonus:1.25},
 poisonPowder:{pattern:'cloud',effect:'poison',terrain:'poison'},toxic:{pattern:'cloud',effect:'toxic',duration:7,targets:12},
 leechSeed:{pattern:'drain',effect:'seeded',healFlat:8},megaDrain:{pattern:'drain',healRatio:.2},gigaDrain:{pattern:'drain',healRatio:.25},
 tackle:{pattern:'charge'},takeDown:{pattern:'charge',targets:4,radius:30,recoil:.015,advance:44},
 bodySlam:{pattern:'radial',targets:16,effect:'slow',duration:2.5},
 razorLeaf:{pattern:'line',radius:14},petalDance:{pattern:'cyclone',targets:14,terrain:'petals',duration:2.5},
 petalBlizzard:{pattern:'cyclone',targets:24,terrain:'petals',duration:3.5},
 energyBall:{pattern:'explosion',targets:6,radius:38},sunnyDay:{pattern:'support',support:'sunlight',strength:.12,duration:5},
 solarBeam:{pattern:'beam',targets:24,radius:40,chargeSeconds:.7,support:'sunlight',strength:.15,duration:4},
 sludgeWave:{pattern:'radial',targets:24,effect:'toxic',duration:8,poisonBonus:1.3},
 synthesis:{pattern:'support',healFlat:14},grassyTerrain:{pattern:'support',terrain:'grass',duration:6},
 ingrain:{pattern:'support',support:'ingrain',strength:.13,terrain:'roots',duration:7},
 grassKnot:{pattern:'explosion',targets:5,radius:40,sizeBonus:1,effect:'rooted',duration:1.5},
 grassyGlide:{pattern:'charge',targets:3,radius:22,advance:28},
 trailblaze:{pattern:'charge',targets:3,radius:24,advance:36,support:'trailblaze',strength:.12,duration:3},
 grassPledge:{pattern:'columns',targets:5,radius:30},frenzyPlant:{pattern:'columns',targets:18,radius:80,chargeSeconds:.6,recoverySeconds:1.2},
 poisonJab:{pattern:'line',targets:3,radius:22,effect:'poison',duration:4},
 earthPower:{pattern:'columns',targets:3,radius:32,effect:'defenseBreak',duration:3},
 earthquake:{pattern:'radial',targets:24},growl:{pattern:'cloud',effect:'weaken',duration:3.5,targets:16},
 growth:{pattern:'support',support:'growth',strength:.13,duration:4},
 sleepPowder:{pattern:'cloud',effect:'sleep',duration:2.5,targets:12},
 sweetScent:{pattern:'cloud',effect:'exposed',duration:4,targets:16},
 worrySeed:{pattern:'homing',effect:'worried',duration:5,targets:4},
 protect:{pattern:'support',support:'protect',strength:.42,duration:.6},
 swordsDance:{pattern:'support',support:'swordsDance',strength:.2,duration:3.5},
 helpingHand:{pattern:'support',support:'helpingHand',strength:.1,duration:4},
};

const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
/** Profiles set a base target budget; count upgrades still add real targets. */
export function combatTargetLimit(move:MoveDef,rank:number,multicast=0){
 const profile=MOVE_COMBAT_PROFILES[move.id],fx=moveRankStats(move,rank),firstCount=move.ranks[0]?.count??1;
 let count=profile?.targets===undefined?(move.kind==='piercing'?fx.pierce:fx.count):profile.targets+Math.max(0,fx.count-firstCount);
 if(move.kind==='cloud')count=Math.max(count,fx.targetCount);
 if(profile?.pattern==='multishot')count=Math.max(profile.strikes??1,fx.count);
 return Math.min(24,Math.max(1,Math.round(count+multicast*.5)));
}
export function applyEnemyStatus(state:SimState,target:Entity,kind:EnemyDebuffKind,power:number,duration:number){
 if(target.hp<=0)return false;
 if(kind==='sleep'||kind==='rooted'){
  if(state.time<(target.controlImmuneUntil??0))return false;
  if(target.boss){duration=Math.min(.35,duration);target.controlImmuneUntil=state.time+2.5;}
  else if(target.elite){duration=Math.min(1,duration);target.controlImmuneUntil=state.time+1.8;}
 }
 if(kind==='poison'&&target.statuses.some(status=>status.kind==='toxic'))return false;
 if(kind==='toxic')target.statuses=target.statuses.filter(status=>status.kind!=='poison');
 const old=target.statuses.find(status=>status.kind===kind);
 if(old){old.remaining=Math.max(old.remaining,Math.min(15,duration));old.sourcePower=Math.max(old.sourcePower,power);}
 else if(target.statuses.length<10)target.statuses.push({kind,remaining:Math.min(15,duration),tick:0,sourcePower:power,elapsed:0});
 return true;
}

function eventFor(state:SimState,slot:MoveSlot,move:MoveDef,range:number,targets:Entity[],damage=0,phase:AttackEvent['phase']='fire'):AttackEvent{
 const target=targets[0]??state.player,signature=!!slot.starter||move.id===state.pokemon.startingMove;
 return{id:++state.eventId,moveId:move.id,kind:move.kind,type:move.type,x:state.player.x,y:state.player.y,tx:target.x,ty:target.y,radius:range,hits:targets.map(target=>target.id),impacts:targets.map(target=>({x:target.x,y:target.y})),damage,phase,signature,animationEligible:phase!=='pulse'&&move.damageClass!=='Status'};
}

function targetsFor(state:SimState,profile:MoveCombatProfile,move:MoveDef,rank:number,range:number,mods:ItemModifiers,aim?:{x:number;y:number}){
 const fx=moveRankStats(move,rank),origin=state.player;
 const candidates=state.enemies.filter(enemy=>enemy.hp>0&&distance(enemy,origin)<=range).sort((a,b)=>distance(a,origin)-distance(b,origin)||a.id-b.id);
 if(!candidates.length)return[];
 const primary=aim??candidates[0],dx=primary.x-origin.x,dy=primary.y-origin.y,length=Math.hypot(dx,dy)||1;
 const limit=combatTargetLimit(move,rank,state.masteries.multicast??0);
 if(profile.pattern==='line'||profile.pattern==='beam'||profile.pattern==='charge'){
  const width=(profile.radius??14)+mods.impact;
  return candidates.filter(enemy=>((enemy.x-origin.x)*dx+(enemy.y-origin.y)*dy)/length>=-10&&Math.abs((enemy.x-origin.x)*dy-(enemy.y-origin.y)*dx)/length<=width).slice(0,limit);
 }
 if(profile.pattern==='explosion')return candidates.filter(enemy=>distance(enemy,candidates[0])<=(profile.radius??40)*Math.sqrt(fx.area)+mods.impact).slice(0,limit);
 if(profile.pattern==='columns'){
  const centers=candidates.slice(0,Math.min(limit,6)),radius=(profile.radius??30)*Math.sqrt(fx.area);
  return candidates.filter(enemy=>centers.some(center=>distance(enemy,center)<=radius)).slice(0,Math.min(24,limit+(profile.radius!>=60?6:0)));
 }
 return candidates.slice(0,limit);
}

function createTerrain(state:SimState,slot:MoveSlot,move:MoveDef,profile:MoveCombatProfile,range:number,mods:ItemModifiers){
 const runtime=state.combatRuntime,old=runtime.terrains.find(zone=>zone.moveId===move.id),fx=moveRankStats(move,slot.rank);
 const duration=Math.min(12,profile.duration?profile.duration*fx.duration:fx.statusSeconds);
 const data={moveId:move.id,kind:profile.terrain!,x:state.player.x,y:state.player.y,radius:Math.min(330,range),remaining:duration,tick:0,strength:profile.terrain==='poison'?(8+slot.rank*2)*(1+(mods.typeDamage[move.type]??0))*(1+mods.damage):profile.terrain==='grass'?.45+slot.rank*.12:profile.terrain==='roots'?.65+slot.rank*.15:move.power*.12,rank:slot.rank,followPlayer:profile.terrain==='roots'||profile.terrain==='petals'};
 if(old)Object.assign(old,data);else if(runtime.terrains.length<6)runtime.terrains.push({id:++state.eventId,...data});
}

function advancePlayer(state:SimState,tx:number,ty:number,amount:number){
 const dx=tx-state.player.x,dy=ty-state.player.y,length=Math.hypot(dx,dy)||1;
 for(let moved=0;moved<amount;moved+=6){const step=Math.min(6,amount-moved),x=state.player.x+dx/length*step,y=state.player.y+dy/length*step;if(collides(state.world,x,y,14))break;state.player.x=x;state.player.y=y;}
}

/** Called only by a real ready activation, never by the visual renderer. */
export function activateProfileMove(state:SimState,slot:MoveSlot,move:MoveDef,mods:ItemModifiers,releasing=false,aim?:{x:number;y:number}):AttackEvent|undefined{
 const profile=MOVE_COMBAT_PROFILES[move.id];if(!profile)return;
 const origin={x:state.player.x,y:state.player.y};
 const fx=moveRankStats(move,slot.rank),range=fx.rangeUnits*state.rangeBonus*(1+(state.masteries.expansion??0)*.12);
 const targets=targetsFor(state,profile,move,slot.rank,range,mods,aim);
 if(profile.pattern!=='support'&&!targets.length){if(releasing&&aim){const event=eventFor(state,slot,move,range,[]);event.tx=aim.x;event.ty=aim.y;event.animationEligible=false;return event;}return;}
 if(profile.chargeSeconds&&!releasing){
  if(state.combatRuntime.charges.some(charge=>charge.moveId===move.id))return;
  if(state.combatRuntime.charges.length>=5)return;
  const target=targets[0];state.combatRuntime.charges.push({moveId:move.id,rank:slot.rank,fireAt:state.time+profile.chargeSeconds*(1-buffStrength(state,'sunlight')),tx:target.x,ty:target.y,signature:!!slot.starter});
  const event=eventFor(state,slot,move,range,targets,0,'charge');event.hits=[];event.animationEligible=true;return event;
 }
 if(profile.support)grantMoveBuff(state,profile.support,move.id,(profile.strength??.1)+slot.rank*.015,(profile.duration??3)*fx.duration);
 if(profile.terrain)createTerrain(state,slot,move,profile,range,mods);
 if(profile.pattern==='support'){
  if(profile.healFlat){const daylight=1+buffStrength(state,'sunlight');restoreHp(state,spendHealingBudget(state,(profile.healFlat+slot.rank*1.8)*daylight),move.id);}
  return eventFor(state,slot,move,range,[]);
 }
 let dealt=0,critical=false,applied=false;
 const poisoned=(target:Entity)=>target.statuses.some(status=>status.kind==='poison'||status.kind==='toxic');
 for(const target of targets){
  if(move.damageClass!=='Status'||profile.pattern==='drain'){
   const damageMove=move.damageClass==='Status'?{...move,damageClass:'Special' as const}:move;
   const hit=moveDamage(state,damageMove,target,slot.rank,mods),strikes=profile.pattern==='multishot'?Math.max(profile.strikes??1,fx.count)/Math.max(1,targets.length):1;
   const synergy=profile.poisonBonus&&poisoned(target)?profile.poisonBonus:1;
   const size=profile.sizeBonus?1+Math.min(profile.sizeBonus,target.boss?1:target.elite?.6:target.maxHp/2000):1;
   const amount=Math.max(0,Math.round(hit.amount*Math.max(1,strikes)*synergy*size));target.hp-=amount;dealt+=amount;critical||=hit.critical;if(amount>0)staggerEnemy(state,target,mods);
  }
  const effect=profile.effect??move.status;
  if(effect){
   const guaranteed=['toxic','weaken','sleep','exposed','worried','defenseBreak','rooted'].includes(effect);
   if(guaranteed||seededRoll(state)<fx.statusChance){
    const power=move.damageClass==='Status'&&move.power===0?(8+slot.rank*2)*(1+(mods.typeDamage[move.type]??0))*(1+mods.damage):moveDamage(state,{...move,damageClass:'Special'},target,slot.rank,mods,true).amount;
    const seconds=(profile.duration?profile.duration*fx.duration:fx.statusSeconds)*(1+mods.duration);
    applied=applyEnemyStatus(state,target,effect,power,seconds)||applied;
   }
  }
  if(profile.pattern==='radial'||profile.pattern==='charge'||profile.pattern==='beam'){
   const dx=target.x-state.player.x,dy=target.y-state.player.y,length=Math.hypot(dx,dy)||1,push=target.boss?3:profile.pattern==='charge'?22:12,x=target.x+dx/length*push,y=target.y+dy/length*push;if(!collides(state.world,x,y,14)){target.x=x;target.y=y;}
  }
 }
 if(profile.healRatio||profile.healFlat){const amount=(profile.healFlat??dealt*(profile.healRatio??0))*(1+mods.drain);restoreHp(state,spendHealingBudget(state,amount),move.id);}
 if(profile.advance&&targets[0])advancePlayer(state,targets[0].x,targets[0].y,profile.advance);
 if(profile.recoil&&dealt>0){const recoil=Math.min(Math.max(0,state.hp-1),state.maxHp*profile.recoil);state.hp-=recoil;if(recoil)state.feedback.push({kind:'recoil',...state.player,value:recoil,source:move.id});}
 if(profile.recoverySeconds)grantMoveBuff(state,'leafRecovery',move.id,.25,profile.recoverySeconds);
 successfulMove(state,mods,dealt>0,applied);
 const event=eventFor(state,slot,move,range,targets,dealt);event.critical=critical;
 if(profile.advance){event.x=origin.x;event.y=origin.y;}
 if(profile.pattern==='multishot')event.projectileCount=Math.max(targets.length,profile.strikes??1,fx.count);
 else if(profile.pattern==='homing')event.projectileCount=targets.length;
 if(releasing)event.animationEligible=false;return event;
}

/** Bounded, authoritative timed effects. Pulses are explicitly ineligible for character attack animation. */
export function stepMoveRuntime(state:SimState,dt:number,mods:ItemModifiers){
 const runtime=state.combatRuntime;
 for(const buff of runtime.buffs)buff.remaining-=dt;runtime.buffs=runtime.buffs.filter(buff=>buff.remaining>0);
 for(const zone of runtime.terrains){
  zone.remaining-=dt;zone.tick+=dt;if(zone.followPlayer){zone.x=state.player.x;zone.y=state.player.y;}
  if(zone.tick<1||zone.remaining<=0)continue;zone.tick-=1;
  const move=MOVES[zone.moveId];if(!move)continue;
  if(zone.kind==='grass'||zone.kind==='roots'){
   if(distance(zone,state.player)<=zone.radius)restoreHp(state,spendHealingBudget(state,zone.strength*(1+mods.drain)),zone.moveId);
   const pulse=eventFor(state,{id:move.id,rank:zone.rank},move,zone.radius,[],0,'pulse');
   Object.assign(pulse,{x:zone.x,y:zone.y,tx:zone.x,ty:zone.y});state.attacks.push(pulse);
   continue;
  }
  const targets=state.enemies.filter(enemy=>enemy.hp>0&&distance(enemy,zone)<=zone.radius).slice(0,24);let damage=0;
  for(const target of targets){if(zone.kind==='poison')applyEnemyStatus(state,target,'poison',zone.strength,Math.min(4,zone.remaining+1)*(1+mods.duration));else{const amount=moveDamage(state,move,target,zone.rank,mods).amount*.22;target.hp-=amount;damage+=amount;}}
  if(targets.length){const event=eventFor(state,{id:move.id,rank:zone.rank},move,zone.radius,targets,damage,'pulse');event.x=zone.x;event.y=zone.y;state.attacks.push(event);}
 }
 runtime.terrains=runtime.terrains.filter(zone=>zone.remaining>0);
 const ready=runtime.charges.filter(charge=>charge.fireAt<=state.time);runtime.charges=runtime.charges.filter(charge=>charge.fireAt>state.time);
 for(const charge of ready){const slot=state.moveSlots.find(slot=>slot.id===charge.moveId);if(!slot)continue;const event=activateProfileMove(state,slot,MOVES[charge.moveId],mods,true,{x:charge.tx,y:charge.ty});if(event)state.attacks.push(event);}
}

export function stepEnemyMoveStatuses(state:SimState,enemy:Entity,dt:number,mods:ItemModifiers){
 enemy.speed=enemy.baseSpeed;
 for(const status of enemy.statuses){
  const active=Math.min(dt,Math.max(0,status.remaining));status.remaining-=dt;status.tick+=active;status.elapsed=(status.elapsed??0)+active;
  if(status.kind==='slow')enemy.speed*=.65;
  if(status.kind==='worried')enemy.speed*=.85;
  if(status.kind==='rooted')enemy.speed*=enemy.boss?.7:.15;
  if(status.kind==='sleep')enemy.speed=0;
  while(status.tick>=.5){status.tick-=.5;
   if(['poison','toxic','burn','seeded'].includes(status.kind)){
    const ramp=status.kind==='toxic'?1+Math.min(3,(status.elapsed??0)*.3):1;
    enemy.hp-=status.sourcePower*.18*ramp*(1+mods.sustained);
    if(status.kind==='seeded')restoreHp(state,spendHealingBudget(state,status.sourcePower*.08*(1+mods.drain)),'leechSeed');
   }
  }
 }
 enemy.statuses=enemy.statuses.filter(status=>status.remaining>0);
}
