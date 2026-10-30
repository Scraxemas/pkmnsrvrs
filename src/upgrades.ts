import {ITEMS,MOVES,PokemonType} from './content';
import {rankEffect,SimState,Upgrade} from './simulation';
import {describeItemImprovement} from './items';
import {moveRankStats} from './moveEffects';
import type {ProgressionNotice} from './moveEvolution';
import {ordinaryPredecessor} from './data/moveChains';
import {fusionForResult} from './data/moveFusions';
import {moveUnlockRequirements} from './moveEligibility';
import {MOVE_UNLOCKS,tmLabel} from './data/moveUnlocks';
import {combatTargetLimit,MOVE_COMBAT_PROFILES} from './moveCombat';
export function progressionNoticeText(notice:ProgressionNotice){return notice.kind==='slot'?`${notice.slot===4?'FOURTH':'FIFTH'} MOVE SLOT UNLOCKED!`:`MOVE ${notice.fusion?'FUSED':'EVOLVED'}! ${notice.fusion?notice.fusion.map(id=>MOVES[id].name).join(' + '):MOVES[notice.from].name} → ${MOVES[notice.to].name} · Rank ${notice.rank} Preserved${notice.fusion?' · 1 slot freed':''}${notice.refund?` · ${notice.refund} move choices refunded`:''}`;}

export const TYPE_COLORS:Record<PokemonType,number>={Normal:0xc5bfa4,Grass:0x70cf70,Poison:0xc17bdd,Fire:0xff9759,Water:0x63cfff,Dragon:0xa795ff,Electric:0xffdc67,Ice:0x96e8ea,Fighting:0xd6825b,Ground:0xd8bb73,Flying:0xa5b5e7,Psychic:0xf488b6,Bug:0xb6c84e,Rock:0xc8b985,Ghost:0x9893ca,Dark:0xa59d98,Steel:0xacc3ca,Fairy:0xf0b1d6};
export interface UpgradeDetails {name:string;action:string;category:string;description:string;rank:string;benefit:string;color:number;icon:string;artKey?:string;moveId?:string;type?:PokemonType;rarity?:'common'|'uncommon'|'rare';transition?:{from:string[];ranks:number[];to:string;kind:'evolution'|'fusion';requirements:string};}
const pct=(value:number)=>`${Math.round(value*100)}%`;
const vitaminInfo:Record<string,[string,string]>={hpUp:['HP Up','Maximum HP +5. Also restores 5 HP.'],protein:['Protein','Physical move damage +2.5%.'],iron:['Iron','Contact damage taken reduced by 0.15 HP/s.'],calcium:['Calcium','Special move damage +2.5%.'],zinc:['Zinc','Projectile damage taken reduced by 2.5%.'],carbos:['Carbos','Movement speed +1.5%.']};
const masteryInfo:Record<string,[string,string]>={overcharge:['Overcharge','Move damage +12% of base.'],multicast:['Multicast','Adds 0.5 to target count, rounded on activation.'],expansion:['Expansion','Move range +12% of base.'],sustain:['Sustain','Restore an additional 0.2 HP per second.'],efficiency:['Efficiency','Move cooldowns reduced by 6% of base.']};

export function describeUpgrade(state:SimState,u:Upgrade):UpgradeDetails {
  if(u.kind==='moveEvolution'||u.kind==='moveFusion'){
    const move=MOVES[u.id],fusion=u.kind==='moveFusion'?fusionForResult(u.id):undefined,from=fusion?[...fusion.ingredients]:[ordinaryPredecessor(u.id,state.pokemonId)!.id],ranks=from.map(id=>state.moveSlots.find(slot=>slot.id===id)?.rank??0),rank=Math.min(5,Math.max(...ranks)),tms=moveUnlockRequirements(u.id,state.pokemonId),requirements=[...tms.map(tmLabel),...(fusion?.species?['Venusaur']:[])].join(' · ');
    return{name:move.name.toUpperCase(),action:fusion?'MOVE FUSION':'MOVE EVOLUTION',category:`${move.type} · ${move.damageClass}`,description:from.map(id=>MOVES[id].name).join(fusion?' + ':' → ')+(fusion?'':` → ${move.name}`),rank:`RANK ${rank} PRESERVED`,benefit:`${fusion?'Consumes 2 moves · Creates 1 · Frees 1 slot.':'Transforms in the same slot.'}\n${move.description}${requirements?`\nUnlocked: ${requirements}.`:''}`,color:TYPE_COLORS[move.type],icon:u.id,moveId:u.id,type:move.type,rarity:fusion?'rare':undefined,transition:{from,ranks,to:u.id,kind:fusion?'fusion':'evolution',requirements}};
  }
  if(u.kind==='move'){
    const move=MOVES[u.id],rank=state.moveSlots.find(s=>s.id===u.id)?.rank??0,next=rank+1,a=moveRankStats(move,Math.max(1,rank)),b=moveRankStats(move,next),changes:string[]=[];
    if(!rank)changes.push(`Learn ${move.name}; ${Number(b.rangeUnits.toFixed(1))} range, ${Number(b.cooldownSeconds.toFixed(2))}s base cooldown. ${move.kind==='fixed'?`${b.fixedDamage} base damage.`:move.damageClass!=='Status'?`${Number(b.basePower.toFixed(1))} base power.`:''}`);
    else{
      if(move.kind==='fixed'&&b.fixedDamage!==a.fixedDamage)changes.push(`Fixed damage ${a.fixedDamage} → ${b.fixedDamage}.`);
      else if(b.damage*b.power!==a.damage*a.power)changes.push(`Damage +${pct(b.damage*b.power/(a.damage*a.power)-1)}.`);
      if(b.cooldown!==a.cooldown)changes.push(`Cooldown −${pct(1-b.cooldown/a.cooldown)}.`);
      if(b.range!==a.range)changes.push(`Range +${pct(b.range/a.range-1)}.`);
      if(b.count!==a.count){const legacySpin=move.kind==='spin'&&!MOVE_COMBAT_PROFILES[move.id];changes.push(`${move.kind==='cloud'?'Cloud targets':legacySpin?'Strikes':'Targets'} ${legacySpin?a.count:combatTargetLimit(move,rank)} → ${legacySpin?b.count:combatTargetLimit(move,next)}.`);}
      if(b.pierce!==a.pierce&&move.kind==='piercing')changes.push(`Piercing targets ${a.pierce} → ${b.pierce}.`);
      if(b.duration!==a.duration&&move.status){const duration=MOVE_COMBAT_PROFILES[move.id]?.duration;changes.push(`${move.status==='poison'?'Poison':'Status'} duration ${Number((duration?duration*a.duration:a.statusSeconds).toFixed(2))}s → ${Number((duration?duration*b.duration:b.statusSeconds).toFixed(2))}s.`);}
      if(b.duration!==a.duration&&!move.status){const profile=MOVE_COMBAT_PROFILES[move.id];if(profile?.duration)changes.push(`Effect duration ${Number((profile.duration*a.duration).toFixed(2))}s → ${Number((profile.duration*b.duration).toFixed(2))}s.`);}
      if(b.area!==a.area)changes.push(`Area +${pct(b.area/a.area-1)}.`);
      if(b.statusChance!==a.statusChance)changes.push(`Status chance ${pct(a.statusChance)} → ${pct(b.statusChance)}.`);
      const profile=MOVE_COMBAT_PROFILES[move.id];
      if(profile?.support&&profile.strength)changes.push(`Buff strength ${pct(Math.min(.65,profile.strength+rank*.015))} → ${pct(Math.min(.65,profile.strength+next*.015))}.`);
      if(move.damageClass==='Status'&&profile?.healFlat)changes.push(`Recovery ${Number((profile.healFlat+rank*1.8).toFixed(1))} → ${Number((profile.healFlat+next*1.8).toFixed(1))} HP before recovery cap.`);
    }
    return{name:move.name.toUpperCase(),action:rank?'MOVE UPGRADE':'NEW MOVE',category:`${move.type} · ${move.damageClass}`,description:move.description,rank:rank?`RANK ${rank} → ${next}`:'NEW MOVE · RANK 1',benefit:changes.join(' '),color:TYPE_COLORS[move.type],icon:u.id,moveId:u.id,type:move.type,rarity:MOVE_UNLOCKS[u.id]?.rarity};
  }
  if(u.kind==='item'){
    const item=ITEMS[u.id],rank=state.items.find(i=>i.id===u.id)?.rank??0;
    return{name:item.name.toUpperCase(),action:rank?'ITEM UPGRADE':'NEW ITEM',category:`${item.typeBoost??item.category.toUpperCase()} · HELD ITEM`,description:item.description,rank:rank?`RANK ${rank} → ${rank+1}`:item.maxRank===1?'NEW ITEM · SINGLE USE':'NEW ITEM · RANK 1',benefit:describeItemImprovement(item,rank),color:TYPE_COLORS[item.typeBoost??'Normal'],icon:u.id,artKey:u.id,type:item.typeBoost,rarity:item.rarity};
  }
  if(u.kind==='vitamin'){
    const [name,benefit]=vitaminInfo[u.id];return{name:name.toUpperCase(),action:'VITAMIN',category:'VITAMIN · PERMANENT THIS RUN',description:'A focused boost to your Pokémon’s stats.',rank:`${state.vitamins[u.id as keyof typeof state.vitamins]} → ${state.vitamins[u.id as keyof typeof state.vitamins]+1} / 10`,benefit,color:0xffd174,icon:'vitamin',artKey:`vitamin:${u.id}`};
  }
  if(u.kind==='mastery'){
    const [name,benefit]=masteryInfo[u.id],rank=state.masteries[u.id as keyof typeof state.masteries]??0;return{name:name.toUpperCase(),action:'MASTERY',category:'MOVE MASTERY',description:'A permanent improvement to your whole moveset.',rank:`MASTERY ${rank} → ${rank+1}`,benefit,color:0xc6a2ff,icon:'mastery'};
  }
  return{name:'SECOND WIND',action:'RECOVERY',category:'RECOVERY',description:'Recover and return to the fight.',rank:'RESTORE HEALTH',benefit:'Restore 30% of maximum HP.',color:0x7bdd93,icon:'heal',artKey:'consumable:potion'};
}
