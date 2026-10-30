import {describe,expect,it} from 'vitest';
import {POKEMON} from '../src/content';
import {freshSave,loadSave,recordEvent,recordRun,recordSessionEvents} from '../src/save';
import {CHARACTER_RECORDS,CharacterSelection,rosterRequirement,rosterState} from '../src/ui/characterRoster';
import {makeState,tick,xpForLevel} from '../src/simulation';
import {moveCapacity} from '../src/moveProgression';
import {campaignNode} from '../src/campaign/data';
import {resolveCampaignNode} from '../src/campaign/state';

function memoryStorage(){const values=new Map<string,string>();return{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}} as Storage;}
const weedle=()=>CHARACTER_RECORDS.find(p=>p.id==='weedle')!;

describe('Viridian boss progression',()=>{
 it('keeps Weedle locked until Beedrill is defeated, with a single catalogue record per species',()=>{
  const save=freshSave();expect(save.unlockedPokemon).toEqual(['bulbasaur','charmander','squirtle']);
  expect(rosterState(weedle(),save)).toBe('undiscovered');save.pokedex.push('weedle');
  expect(rosterState(weedle(),save)).toBe('locked');expect(rosterRequirement(weedle(),save)).toContain('Defeat Beedrill');
  expect(new Set(CHARACTER_RECORDS.map(p=>p.id)).size).toBe(CHARACTER_RECORDS.length);
 });
 it.each(['event','session','victory'])('persists the %s boss reward, starts Weedle, and keeps Brock a preview',source=>{
  const storage=memoryStorage();
  if(source==='event')recordEvent('defeat','beedrill',storage);
  else if(source==='session')recordSessionEvents({beedrill:1},0,storage);
  else recordRun({result:'victory',pokemon:'bulbasaur',stage:'viridian',time:1800,level:30,defeated:400},storage);
  const save=loadSave(storage),selection=new CharacterSelection('test');
  expect(save.unlockedPokemon.filter(id=>id==='weedle')).toHaveLength(1);expect(save.unlockedStages).toContain('pewterGym');expect(save.achievements).toContain('first-boss');
  expect(resolveCampaignNode(campaignNode('pewterGym')!,save)).toMatchObject({unlocked:true,launchable:false,status:'Coming Soon'});
  selection.preview(13);const selected=selection.confirm(weedle(),save);expect(selected).toBe('weedle');
  const state=makeState(POKEMON[selected!],77);expect(state.pokemonId).toBe('weedle');expect(state.moveSlots[0].id).toBe('tackle');
 });
 it.each([1,2])('repairs a version %i victory save additively without unlocking evolved forms',version=>{
  const storage=memoryStorage(),old={...freshSave(),version,research:{beedrill:1,custom:72},favoritePokemon:[7],unlockedStages:['viridian','mtMoon']};
  storage.setItem('pokemon-survivors-save',JSON.stringify(old));const save=loadSave(storage);
  expect(save.research.custom).toBe(72);expect(save.favoritePokemon).toEqual([7]);expect(save.unlockedStages).toEqual(['viridian','mtMoon','pewterGym']);
  expect(save.unlockedPokemon).toContain('weedle');expect(save.unlockedPokemon).not.toContain('kakuna');expect(save.unlockedPokemon).not.toContain('beedrill');
 });
 it('evolves Weedle at levels 7 and 10, retaining its moves and opening 3/4/5 slots',()=>{
  const state=makeState(POKEMON.weedle,91);state.level=6;state.nextXp=xpForLevel(6);state.xp=state.nextXp;
  state.moveSlots[0].rank=4;tick(state,1/30,{x:0,y:0},[]);expect(state.pokemonId).toBe('kakuna');expect(state.unlockedMoveSlots).toBe(4);
  state.level=9;state.nextXp=xpForLevel(9);state.xp=state.nextXp;tick(state,1/30,{x:0,y:0},[]);
  expect(state.pokemonId).toBe('beedrill');expect(state.unlockedMoveSlots).toBe(5);expect(state.moveSlots[0]).toMatchObject({id:'tackle',rank:4});
  expect(['weedle','kakuna','beedrill'].map(id=>moveCapacity(POKEMON[id],1))).toEqual([3,4,5]);
 });
});
