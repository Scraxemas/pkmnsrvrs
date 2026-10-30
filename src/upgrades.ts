import {ITEMS,MOVES,PokemonType} from './content';
import {rankEffect,SimState,Upgrade} from './simulation';
import {describeItemImprovement} from './items';

export const TYPE_COLORS:Record<PokemonType,number>={Normal:0xc5bfa4,Grass:0x70cf70,Poison:0xc17bdd,Fire:0xff9759,Water:0x63cfff,Dragon:0xa795ff,Electric:0xffdc67,Ice:0x96e8ea,Fighting:0xd6825b,Ground:0xd8bb73,Flying:0xa5b5e7,Psychic:0xf488b6,Bug:0xb6c84e,Rock:0xc8b985,Ghost:0x9893ca,Dark:0xa59d98,Steel:0xacc3ca,Fairy:0xf0b1d6};
export interface UpgradeDetails {name:string;category:string;description:string;rank:string;benefit:string;color:number;icon:string;artKey?:string;type?:PokemonType;rarity?:'common'|'uncommon'|'rare';}
const pct=(value:number)=>`${Math.round(value*100)}%`;
const vitaminInfo:Record<string,[string,string]>={hpUp:['HP Up','Maximum HP +5. Also restores 5 HP.'],protein:['Protein','Physical move damage +2.5%.'],iron:['Iron','Contact damage taken reduced by 0.15 HP/s.'],calcium:['Calcium','Special move damage +2.5%.'],zinc:['Zinc','Projectile damage taken reduced by 2.5%.'],carbos:['Carbos','Movement speed +1.5%.']};
const masteryInfo:Record<string,[string,string]>={overcharge:['Overcharge','Move damage +12% of base.'],multicast:['Multicast','Adds 0.5 to target count, rounded on activation.'],expansion:['Expansion','Move range +12% of base.'],sustain:['Sustain','Restore an additional 0.2 HP per second.'],efficiency:['Efficiency','Move cooldowns reduced by 6% of base.']};

export function describeUpgrade(state:SimState,u:Upgrade):UpgradeDetails {
  if(u.kind==='move'){
    const move=MOVES[u.id],rank=state.moveSlots.find(s=>s.id===u.id)?.rank??0,next=rank+1,a=rankEffect(move,Math.max(1,rank)),b=rankEffect(move,next),changes:string[]=[];
    if(!rank)changes.push(`Learn ${move.name}; ${move.range} range, ${move.cooldown}s base cooldown.`);
    else{
      if(move.kind==='fixed')changes.push(`Fixed damage ${Math.round(move.power*(1+(rank-1)*.15))} → ${Math.round(move.power*(1+rank*.15))}.`);
      else if(b.damage!==a.damage)changes.push(`Damage +${pct(b.damage/a.damage-1)}.`);
      if(b.cooldown!==a.cooldown)changes.push(`Cooldown −${pct(1-b.cooldown/a.cooldown)}.`);
      if(b.range!==a.range)changes.push(`Range +${pct(b.range/a.range-1)}.`);
      if(b.count!==a.count&&move.kind!=='cloud')changes.push(`${move.kind==='spin'?'Strikes':'Targets'} ${a.count} → ${b.count}.`);
      if(b.pierce!==a.pierce&&move.kind==='piercing')changes.push(`Piercing targets ${a.pierce} → ${b.pierce}.`);
      if(b.duration!==a.duration&&move.kind==='cloud')changes.push(`Poison duration ${Math.round(3*a.duration)}s → ${Math.round(3*b.duration)}s.`);
      if(b.statusChance!==a.statusChance)changes.push(`Status chance ${pct(a.statusChance)} → ${pct(b.statusChance)}.`);
    }
    return{name:move.name.toUpperCase(),category:`${move.type} · ${move.damageClass}`,description:move.description,rank:rank?`RANK ${rank} → ${next}`:'NEW MOVE · RANK 1',benefit:changes.join(' '),color:TYPE_COLORS[move.type],icon:u.id,type:move.type};
  }
  if(u.kind==='item'){
    const item=ITEMS[u.id],rank=state.items.find(i=>i.id===u.id)?.rank??0;
    return{name:item.name.toUpperCase(),category:`${item.typeBoost??item.category.toUpperCase()} · HELD ITEM`,description:item.description,rank:rank?`RANK ${rank} → ${rank+1}`:item.maxRank===1?'NEW ITEM · SINGLE USE':'NEW ITEM · RANK 1',benefit:describeItemImprovement(item,rank),color:TYPE_COLORS[item.typeBoost??'Normal'],icon:u.id,artKey:u.id,type:item.typeBoost,rarity:item.rarity};
  }
  if(u.kind==='vitamin'){
    const [name,benefit]=vitaminInfo[u.id];return{name:name.toUpperCase(),category:'VITAMIN · PERMANENT THIS RUN',description:'A focused boost to your Pokémon’s stats.',rank:`${state.vitamins[u.id as keyof typeof state.vitamins]} → ${state.vitamins[u.id as keyof typeof state.vitamins]+1} / 10`,benefit,color:0xffd174,icon:'vitamin',artKey:`vitamin:${u.id}`};
  }
  if(u.kind==='mastery'){
    const [name,benefit]=masteryInfo[u.id],rank=state.masteries[u.id as keyof typeof state.masteries]??0;return{name:name.toUpperCase(),category:'MOVE MASTERY',description:'A permanent improvement to your whole moveset.',rank:`MASTERY ${rank} → ${rank+1}`,benefit,color:0xc6a2ff,icon:'mastery'};
  }
  return{name:'SECOND WIND',category:'RECOVERY',description:'Recover and return to the fight.',rank:'RESTORE HEALTH',benefit:'Restore 30% of maximum HP.',color:0x7bdd93,icon:'heal',artKey:'consumable:potion'};
}
