import {assetFor,ENEMIES,POKEMON,PokemonDef,PokemonType} from '../content';
import {startingStats} from '../playerStats';
import type {SaveData} from '../save';
import {STARTERS} from './menuData';
import {EVOLUTION_PARENTS} from '../data/evolutionParents';

export interface RosterRegion {id:string;name:string;first:number;last:number;available:boolean;}
export const ROSTER_REGIONS:RosterRegion[]=[
  {id:'kanto',name:'Kanto',first:1,last:151,available:true},
  {id:'johto',name:'Johto',first:152,last:251,available:false},
  {id:'hoenn',name:'Hoenn',first:252,last:386,available:false},
];
export interface RosterRecord {dex:number;id?:string;name?:string;types:PokemonType[];portrait?:string;combat?:PokemonDef;startingPartner:boolean;restriction?:string;}
export type RosterState='unlocked'|'locked'|'undiscovered'|'unavailable';
export type RosterSort='dex'|'name';
export type RosterFilter='all'|'unlocked'|'locked'|'discovered'|'favorites';
export type RosterMode='character'|'pokedex';
const enemyDex:Record<string,number>={caterpie:10,metapod:11,butterfree:12,weedle:13,kakuna:14,beedrill:15,pidgey:16,pidgeotto:17};

/** Catalogue records, not playable character definitions. Art never grants access. */
export const CHARACTER_RECORDS:RosterRecord[]=[
  ...Object.values(POKEMON).map(p=>{const startingPartner=(STARTERS as readonly string[]).includes(p.id),from=Object.values(POKEMON).find(parent=>parent.evolvesTo===p.id);return{dex:p.dex,id:p.id,name:p.name,types:p.types,portrait:assetFor(p.id,'portrait'),combat:p,startingPartner,restriction:startingPartner?undefined:from?`Evolution form. Evolve ${from.name} at level ${from.evolutionLevel} during a run. This form is not a starting partner.`:'A playable partner unlock is not available yet.'};}),
  ...Object.values(ENEMIES).map(p=>({dex:enemyDex[p.id],id:p.id,name:p.name,types:p.types,portrait:assetFor(p.id,'portrait'),startingPartner:false,restriction:'Encountered in the wild. A playable partner unlock is not available yet.'})),
  ...([{dex:25,id:'pikachu',name:'Pikachu',types:['Electric']},{dex:43,id:'oddish',name:'Oddish',types:['Grass','Poison']},{dex:69,id:'bellsprout',name:'Bellsprout',types:['Grass','Poison']}] as const).map(p=>({...p,types:[...p.types] as PokemonType[],portrait:assetFor(p.id,'portrait'),startingPartner:false,restriction:'A playable partner unlock is not available yet.'})),
];

/** Empty National Dex slots have no species identity, stats, moves or artwork. */
export function regionRoster(region:RosterRegion,records:readonly RosterRecord[]=CHARACTER_RECORDS):RosterRecord[]{
  const known=new Map(records.map(record=>[record.dex,record]));
  return Array.from({length:region.last-region.first+1},(_,index)=>known.get(region.first+index)??{dex:region.first+index,types:[],startingPartner:false});
}
const parentByDex=new Map<number,number>(EVOLUTION_PARENTS);
const regionAvailable=(dex:number,regions:readonly RosterRegion[])=>regions.some(region=>region.available&&dex>=region.first&&dex<=region.last);
/** The earliest regional form is eligible; unavailable future babies never displace it. */
export function isBaseStartingForm(dex:number,regions:readonly RosterRegion[]=ROSTER_REGIONS){
  if(!regionAvailable(dex,regions))return false;
  const visited=new Set<number>();let parent=parentByDex.get(dex);
  while(parent&&!visited.has(parent)){if(regionAvailable(parent,regions))return false;visited.add(parent);parent=parentByDex.get(parent);}
  return true;
}
export function baseCharacterRoster(regions:readonly RosterRegion[]=ROSTER_REGIONS,records:readonly RosterRecord[]=CHARACTER_RECORDS){return records.filter(record=>record.id&&isBaseStartingForm(record.dex,regions));}
export function buildRoster(mode:RosterMode,regionId='all',regions:readonly RosterRegion[]=ROSTER_REGIONS,records:readonly RosterRecord[]=CHARACTER_RECORDS){
  const available=regions.filter(region=>region.available),candidates=mode==='character'?baseCharacterRoster(regions,records):available.flatMap(region=>regionRoster(region,records));
  return candidates.filter(record=>regionId==='all'||available.some(region=>region.id===regionId&&record.dex>=region.first&&record.dex<=region.last));
}
export function evolutionFamily(dex:number,regions:readonly RosterRegion[]=ROSTER_REGIONS){
  let root=dex;const visited=new Set<number>();while(parentByDex.has(root)&&!visited.has(root)){visited.add(root);root=parentByDex.get(root)!;}
  const queue=[root],family:number[]=[];visited.clear();
  for(let index=0;index<queue.length;index++){const current=queue[index];if(visited.has(current))continue;visited.add(current);if(regionAvailable(current,regions))family.push(current);for(const [child,parent] of EVOLUTION_PARENTS)if(parent===current)queue.push(child);}
  return family;
}
export function rosterState(record:RosterRecord,save:SaveData):RosterState{
  const discovered=record.id&&(save.pokedex.includes(record.id)||save.unlockedPokemon.includes(record.id)||(STARTERS as readonly string[]).includes(record.id));
  if(!discovered)return 'undiscovered';
  if(!record.startingPartner||!record.combat)return 'unavailable';
  return save.unlockedPokemon.includes(record.id!)?'unlocked':'locked';
}
export function rosterName(record:RosterRecord,save:SaveData){return rosterState(record,save)==='undiscovered'?'Undiscovered':record.name??'Undiscovered';}
export function rosterRequirement(record:RosterRecord,save:SaveData){
  const state=rosterState(record,save);
  if(state==='unlocked')return 'Ready for your next run.';
  if(!record.id)return 'Reserved National Dex slot. A playable Pokémon is not available here yet.';
  if(state==='undiscovered')return 'Explore and meet Pokémon to reveal their identities. Discovery does not unlock a playable partner.';
  if(state==='locked')return 'This starter is locked in your save. No additional unlock challenge is currently available.';
  return record.restriction??'A playable partner unlock is not available yet.';
}
export function filterRoster(records:readonly RosterRecord[],save:SaveData,sort:RosterSort,filter:RosterFilter,mode:RosterMode='character'){
  return records.filter(record=>{const state=rosterState(record,save);return filter==='all'||(filter==='unlocked'?state==='unlocked':filter==='favorites'?(save.favoritePokemon??[]).includes(record.dex):filter==='locked'?state==='locked'||state==='unavailable':state!=='undiscovered');})
    .sort((a,b)=>sort==='name'?Number(rosterState(a,save)==='undiscovered')-Number(rosterState(b,save)==='undiscovered')||rosterName(a,save).localeCompare(rosterName(b,save))||a.dex-b.dex:(mode==='character'?Number(rosterState(b,save)==='unlocked')-Number(rosterState(a,save)==='unlocked'):0)||a.dex-b.dex);
}
export const STAT_CAPS=Object.fromEntries(['hp','attack','specialAttack','speed'].map(stat=>[stat,Math.max(...Object.values(POKEMON).map(p=>startingStats(p)[stat as keyof ReturnType<typeof startingStats>]))])) as ReturnType<typeof startingStats>;

/** Per-player UI state. No player-count limit, uniqueness rule, or network state. */
export class CharacterSelection {
  dex:number|null=1;confirmedDex:number|null=null;ready=false;
  constructor(readonly playerId:string,readonly indicator='#f0d68b'){}
  preview(dex:number|null){this.dex=dex;this.confirmedDex=null;this.ready=false;}
  confirm(record:RosterRecord|undefined,save:SaveData){
    if(!record||record.dex!==this.dex||!isBaseStartingForm(record.dex)||rosterState(record,save)!=='unlocked')return;
    this.confirmedDex=record.dex;this.ready=true;return record.id;
  }
}
