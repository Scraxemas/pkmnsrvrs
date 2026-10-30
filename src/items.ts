import type {MoveDef,PokemonDef,PokemonType} from './content';
import {POKESPRITE_ASSETS} from './itemAssets';

export type ItemStat='typeDamage'|'attraction'|'regen'|'crit'|'cooldown'|'drain'|'experience'|'hitHeal'|'reflect'|'fatalShield'|'fatalChance'|'movement'|'physical'|'special'|'effective'|'impact'|'duration'|'sustained'|'rangedGuard'|'powderGuard'|'terrainGuard'|'damage'|'recoil'|'stagger';
export type ItemCategory='damage'|'utility'|'defense'|'recovery'|'build'|'rare';
export type ItemApplicability='all'|'physical'|'special'|'drain'|'projectile'|'duration'|'sustained';
export interface ItemDef {
  id:string;name:string;description:string;category:ItemCategory;rarity:'common'|'uncommon'|'rare';weight:number;maxRank:number;
  sprite:string;outlineSprite?:string;typeBoost?:PokemonType;applicability:ItemApplicability;
  effects:Partial<Record<ItemStat,number>>;
  rules?:{cooldown?:number;duration?:number;bossDuration?:number;bossCooldown?:number;enemyCooldown?:number;grace?:number;oncePerRun?:boolean};
}
export interface HeldItem {id:string;rank:number;}
export const EFFECT_RULES:Record<ItemStat,{base:number;cap:number;label:string;unit:'percent'|'number'}>={
  typeDamage:{base:0,cap:.5,label:'Matching move damage',unit:'percent'},attraction:{base:64,cap:400,label:'EXP attraction radius',unit:'number'},
  regen:{base:0,cap:3,label:'HP regenerated per second',unit:'number'},crit:{base:0,cap:.3,label:'Critical-hit chance',unit:'percent'},
  cooldown:{base:0,cap:.4,label:'Automatic cooldown reduction',unit:'percent'},drain:{base:0,cap:.75,label:'Draining recovery bonus',unit:'percent'},
  experience:{base:0,cap:.3,label:'EXP bonus',unit:'percent'},hitHeal:{base:0,cap:2,label:'HP restored on successful attacks',unit:'number'},
  reflect:{base:0,cap:10,label:'Damage returned on contact',unit:'number'},fatalShield:{base:0,cap:1,label:'Fatal-hit protection charges',unit:'number'},
  fatalChance:{base:0,cap:.2,label:'Fatal-hit survival chance',unit:'percent'},movement:{base:0,cap:.15,label:'Movement speed bonus',unit:'percent'},
  physical:{base:0,cap:.3,label:'Physical move damage bonus',unit:'percent'},special:{base:0,cap:.3,label:'Special move damage bonus',unit:'percent'},
  effective:{base:0,cap:.4,label:'Super-effective damage bonus',unit:'percent'},impact:{base:8,cap:38,label:'Projectile impact tolerance',unit:'number'},
  duration:{base:0,cap:.6,label:'Status-field duration bonus',unit:'percent'},sustained:{base:0,cap:.6,label:'Poison, burn and seed damage bonus',unit:'percent'},
  rangedGuard:{base:0,cap:.4,label:'Ranged damage reduction',unit:'percent'},powderGuard:{base:0,cap:.8,label:'Powder and poison damage reduction',unit:'percent'},
  terrainGuard:{base:0,cap:.8,label:'Spike damage and slow reduction',unit:'percent'},damage:{base:0,cap:.5,label:'Move damage bonus',unit:'percent'},
  recoil:{base:0,cap:.025,label:'Max HP spent per successful move',unit:'percent'},stagger:{base:0,cap:.15,label:'Stagger chance on direct hits',unit:'percent'},
};
function define(id:string,name:string,description:string,category:ItemCategory,effects:ItemDef['effects'],options:Partial<ItemDef>={}):ItemDef{
  const art=POKESPRITE_ASSETS[id];if(!art)throw new Error(`No verified item sprite for ${id}`);
  return{id,name,description,category,effects,sprite:art.normal,outlineSprite:art.outline,rarity:'common',weight:1,maxRank:5,applicability:'all',...options};
}
const typeItems:[string,string,PokemonType][]=[
 ['silkScarf','Silk Scarf','Normal'],['charcoal','Charcoal','Fire'],['mysticWater','Mystic Water','Water'],['zapPlate','Zap Plate','Electric'],
 ['miracleSeed','Miracle Seed','Grass'],['neverMeltIce','Never-Melt Ice','Ice'],['blackBelt','Black Belt','Fighting'],['poisonBarb','Poison Barb','Poison'],
 ['softSand','Soft Sand','Ground'],['sharpBeak','Sharp Beak','Flying'],['twistedSpoon','Twisted Spoon','Psychic'],['silverPowder','Silver Powder','Bug'],
 ['hardStone','Hard Stone','Rock'],['spellTag','Spell Tag','Ghost'],['dragonFang','Dragon Fang','Dragon'],['blackGlasses','Black Glasses','Dark'],
 ['metalCoat','Metal Coat','Steel'],['pixiePlate','Pixie Plate','Fairy'],
];
export const ITEMS:Record<string,ItemDef>=Object.fromEntries([
 ...typeItems.map(([id,name,type])=>define(id,name,`Increase damage from ${type}-type moves. Other move types are unaffected.`,'damage',{typeDamage:.1},{typeBoost:type,weight:1.2})),
 define('magnet','Magnet','Attract EXP Candies from farther away. Does not attract Poké Balls.','utility',{attraction:45},{weight:1.4}),
 define('leftovers','Leftovers','Gradually restore HP during the run.','recovery',{regen:.25},{weight:1.4}),
 define('scopeLens','Scope Lens','Direct move hits can critically strike for 1.5× damage.','damage',{crit:.03}),
 define('quickClaw','Quick Claw','Activate automatic moves more frequently.','utility',{cooldown:.04}),
 define('bigRoot','Big Root','Recover more HP from Leech Seed and other draining effects.','build',{drain:.15},{applicability:'drain',weight:1.2}),
 define('luckyEgg','Lucky Egg','Gain bonus EXP when collecting EXP Candies. Candy base values stay unchanged.','utility',{experience:.06}),
 define('shellBell','Shell Bell','Restore HP after a direct attack deals damage. Multi-hit attacks trigger once.','recovery',{hitHeal:.25},{rules:{cooldown:.6}}),
 define('rockyHelmet','Rocky Helmet','Return damage to a contact attacker, with a shared trigger cooldown.','defense',{reflect:2},{rules:{cooldown:.5}}),
 define('focusSash','Focus Sash','Survive one fatal hit at 1 HP per run, with a brief protective grace.','rare',{fatalShield:1},{maxRank:1,rarity:'rare',weight:.35,rules:{oncePerRun:true,grace:.8}}),
 define('focusBand','Focus Band','A seeded chance to survive a fatal hit at 1 HP. Cannot trigger repeatedly.','defense',{fatalChance:.04},{rarity:'uncommon',weight:.65,rules:{cooldown:12,grace:.25}}),
 define('floatStone','Float Stone','Move faster without changing attack cooldowns.','utility',{movement:.03}),
 define('muscleBand','Muscle Band','Increase Physical move damage.','build',{physical:.06},{applicability:'physical'}),
 define('wiseGlasses','Wise Glasses','Increase Special move damage.','build',{special:.06},{applicability:'special'}),
 define('expertBelt','Expert Belt','Increase damage only when the move is super effective.','build',{effective:.08},{rarity:'uncommon',weight:.75}),
 define('wideLens','Wide Lens','Widen projectile impacts and piercing hit corridors to catch nearby foes.','build',{impact:6},{applicability:'projectile'}),
 define('lightClay','Light Clay','Extend the duration of supported clouds, seeds, burns and slowing effects.','build',{duration:.12},{applicability:'duration'}),
 define('bindingBand','Binding Band','Increase damage over time from poison, burn and Leech Seed.','build',{sustained:.12},{applicability:'sustained'}),
 define('assaultVest','Assault Vest','Reduce damage from incoming ranged attacks.','defense',{rangedGuard:.08}),
 define('safetyGoggles','Safety Goggles','Reduce enemy powder clouds, powder projectiles and player poison damage.','defense',{powderGuard:.16}),
 define('heavyDutyBoots','Heavy-Duty Boots','Reduce damage and movement penalties from visible ground spikes.','defense',{terrainGuard:.16}),
 define('lifeOrb','Life Orb','Increase move damage at an HP cost on successful attacks. Recoil cannot defeat you.','rare',{damage:.1,recoil:.005},{rarity:'rare',weight:.55,rules:{cooldown:.25}}),
 define('kingsRock',"King's Rock",'Direct hits can briefly stagger enemies. Bosses have shorter stagger and longer immunity.','build',{stagger:.03},{rarity:'uncommon',weight:.8,rules:{duration:.18,enemyCooldown:1,bossDuration:.06,bossCooldown:2.5}}),
].map(item=>[item.id,item]));

export type ItemModifiers=Record<Exclude<ItemStat,'typeDamage'>,number>&{typeDamage:Partial<Record<PokemonType,number>>};
export function aggregateItems(held:readonly HeldItem[]):ItemModifiers{
  const result=Object.fromEntries(Object.entries(EFFECT_RULES).map(([key,rule])=>[key,rule.base])) as unknown as ItemModifiers;result.typeDamage={};const seen=new Set<string>();
  for(const slot of held.slice(0,4)){const item=ITEMS[slot.id];if(!item||seen.has(item.id))continue;seen.add(item.id);const rank=Math.max(0,Math.min(item.maxRank,Math.floor(slot.rank)));
    for(const [stat,perRank] of Object.entries(item.effects) as [ItemStat,number][]){if(stat==='typeDamage'&&item.typeBoost)result.typeDamage[item.typeBoost]=Math.min(EFFECT_RULES.typeDamage.cap,(result.typeDamage[item.typeBoost]??0)+perRank*rank);else if(stat!=='typeDamage')result[stat]=Math.min(EFFECT_RULES[stat].cap,result[stat]+perRank*rank);}
  }return result;
}
export function itemEffectValue(item:ItemDef,stat:ItemStat,rank:number){const rule=EFFECT_RULES[stat];return Math.min(rule.cap,rule.base+(item.effects[stat]??0)*Math.max(0,Math.min(item.maxRank,rank)));}
export function describeItemImprovement(item:ItemDef,rank:number){
  const format=(stat:ItemStat,value:number)=>EFFECT_RULES[stat].unit==='percent'?`${Number((value*100).toFixed(2))}%`:`${Number(value.toFixed(2))}`;
  const lines=(Object.keys(item.effects) as ItemStat[]).map(stat=>`${EFFECT_RULES[stat].label}: ${format(stat,itemEffectValue(item,stat,rank))} → ${format(stat,itemEffectValue(item,stat,rank+1))}.`);
  if(item.rules?.oncePerRun)lines.push(`Once per run; ${item.rules.grace}s protection.`);
  else if(item.rules?.cooldown)lines.push(`${item.rules.cooldown}s between triggers.`);
  if(item.rules?.duration)lines.push(`Stagger ${item.rules.duration}s; bosses ${item.rules.bossDuration}s.`);
  return lines.join(' ');
}
export function itemApplicable(item:ItemDef,pokemon:PokemonDef,slots:readonly {id:string}[],moves:Record<string,MoveDef>){
  const ids=new Set([...slots.map(slot=>slot.id),...(slots.length<4?pokemon.learnset:[])]),available=[...ids].map(id=>moves[id]).filter(Boolean);
  if(item.typeBoost)return available.some(move=>move.type===item.typeBoost);
  const checks:Record<ItemApplicability,(move:MoveDef)=>boolean>={all:()=>true,physical:move=>move.damageClass==='Physical',special:move=>move.damageClass==='Special',drain:move=>move.kind==='drain'||move.status==='seeded',projectile:move=>['projectile','piercing','spread','fixed'].includes(move.kind),duration:move=>!!move.status||move.kind==='cloud',sustained:move=>!!move.status&&['poison','burn','seeded'].includes(move.status)};
  return available.some(checks[item.applicability]);
}
export function itemOfferWeight(item:ItemDef,held:boolean,hpRatio:number,equipped:readonly MoveDef[]){
  let weight=item.weight*(held?1.8:1);if(item.category==='recovery'&&hpRatio<.5)weight*=2.5;
  if(item.typeBoost)weight*=equipped.some(move=>move.type===item.typeBoost)?1.6:.7;
  if(item.applicability==='drain')weight*=equipped.some(move=>move.kind==='drain'||move.status==='seeded')?2:.65;
  return weight;
}
