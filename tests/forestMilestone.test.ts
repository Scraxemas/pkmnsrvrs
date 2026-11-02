import {describe,expect,it} from 'vitest';
import {POKEMON} from '../src/content';
import {encounterPhaseAt} from '../src/encounters';
import {forestResearchHud,forestResearchProgress} from '../src/forestResearch';
import {TM_RESEARCH_REWARDS,TECHNICAL_MACHINES} from '../src/data/moveUnlocks';
import {freshSave,loadSave,recordSessionEvents} from '../src/save';
import {canLearnMove} from '../src/moveEligibility';
import {makeState,spawnSpecies,tick} from '../src/simulation';
import {DEFAULT_SETTINGS} from '../src/preferences';
import {playGameCue} from '../src/gameAudio';

function memoryStorage(){const data=new Map<string,string>();return{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}} as Storage;}

describe('v0.6 forest milestone',()=>{
 it('keeps full rounds at 30 minutes and scales encounter phases for fast test mode',()=>{
  expect(encounterPhaseAt(1799.99,1800).id).toBe('finale');
  expect(encounterPhaseAt(2.99,90).id).toBe('opening');
  for(const fraction of [0,.1,.24,.41,.61,.81])expect(encounterPhaseAt(90*fraction,90).id).toBe(encounterPhaseAt(1800*fraction,1800).id);
 });
 it('defines six unique reachable rewards from existing TM definitions',()=>{
  expect(TM_RESEARCH_REWARDS).toHaveLength(6);
  expect(new Set(TM_RESEARCH_REWARDS.map(reward=>reward.tm)).size).toBe(6);
  const registered=new Set(TECHNICAL_MACHINES.map(tm=>tm.id));
  for(const reward of TM_RESEARCH_REWARDS){expect(registered.has(reward.tm)).toBe(true);expect(reward.count).toBeGreaterThan(0);}
 });
 it('grants newly researched TMs once and immediately unlocks eligible move offers',()=>{
  const storage=memoryStorage();
  recordSessionEvents({pidgey:29,metapod:19,butterfree:11},0,storage);
  expect(loadSave(storage).discoveredTms).not.toContain('sv:033');
  recordSessionEvents({pidgey:1,metapod:1,butterfree:1},0,storage);
  const save=loadSave(storage);
  expect(save.discoveredTms).toEqual(expect.arrayContaining(['sv:033','sv:007','sv:119']));
  const bulbasaur=makeState(POKEMON.bulbasaur,66,undefined,{discoveredTms:save.discoveredTms});
  expect(canLearnMove(bulbasaur,'magicalLeaf')).toBe(true);
  recordSessionEvents({pidgey:20,butterfree:5},0,storage);
  expect(loadSave(storage).discoveredTms.filter(id=>id==='sv:033')).toHaveLength(1);
  expect(loadSave(storage).tmDiscoveries.filter(entry=>entry.id==='sv:033')).toHaveLength(1);
 });
 it('grants the Beedrill victory research TM without repeat farming',()=>{
  const storage=memoryStorage();
  recordSessionEvents({beedrill:1},0,storage);
  recordSessionEvents({beedrill:1},0,storage);
  expect(loadSave(storage).discoveredTms.filter(id=>id==='sv:111')).toHaveLength(1);
  expect(loadSave(storage).tmDiscoveries.find(t=>t.id==='sv:111')?.source).toBe('research');
 });
 it('shows saved plus current run progress without a premature discovery',()=>{
  const saved=freshSave(),session={caterpie:24,weedle:12};
  expect(forestResearchProgress(saved.research,session,saved.discoveredTms).find(r=>r.tm==='sv:056')).toMatchObject({current:24,target:25,complete:false});
  expect(forestResearchHud(saved.research,session,saved.discoveredTms)).toContain('Seed Study 24/25');
  saved.discoveredTms.push('sv:056');
  expect(forestResearchHud(saved.research,session,saved.discoveredTms)).not.toContain('Seed Study');
 });
 it('telegraphs Beedrill attacks before firing, and retains phase transitions',()=>{
  const state=makeState(POKEMON.charmander,6);
  spawnSpecies(state,'beedrill',1,false,true);
  const boss=state.enemies[0];boss.hp=boss.maxHp*.5;boss.aiCooldown=0;
  const first=tick(state,1/30,{x:0,y:0});
  expect(first).toContain('boss-phase:2');expect(state.projectiles).toHaveLength(0);
  const events:string[]=[];for(let i=0;i<50;i++)events.push(...tick(state,1/30,{x:0,y:0}));
  expect(events).toContain('boss-windup');expect(events).toContain('boss-attack');
  boss.hp=boss.maxHp*.25;
  expect(tick(state,1/30,{x:0,y:0})).toContain('boss-phase:3');
 });
 it.each([
  {phase:1,health:.5,next:2},
  {phase:2,health:.25,next:3},
 ])('cancels a phase-$phase windup before phase $next rather than firing an untelegraphed volley',({phase,health,next})=>{
  const state=makeState(POKEMON.charmander,77);
  spawnSpecies(state,'beedrill',1,false,true);
  const boss=state.enemies[0];
  boss.phase=phase;boss.hp=boss.maxHp*health;boss.attackWindup=1/60;boss.aiCooldown=0;
  const changed=tick(state,1/30,{x:0,y:0});
  expect(changed).toContain('boss-phase:'+next);
  expect(changed).not.toContain('boss-attack');
  expect(changed).not.toContain('boss-windup');
  expect(state.projectiles).toHaveLength(0);
  expect(state.hazards).toHaveLength(0);
  expect(boss.attackWindup).toBe(0);
  const warning:string[]=[];
  for(let i=0;i<15;i++)warning.push(...tick(state,1/30,{x:0,y:0}));
  expect(warning).toContain('boss-windup');
  expect(warning).not.toContain('boss-attack');
  const fired:string[]=[];
  for(let i=0;i<40;i++)fired.push(...tick(state,1/30,{x:0,y:0}));
  expect(fired).toContain('boss-attack');
 });
 it('commits a mixed session of research exactly once, including Beedrill',()=>{
  const storage=memoryStorage(),defeats={caterpie:24,pidgey:30,beedrill:1};
  // This is the single transaction now performed before the victory ends.
  const saved=recordSessionEvents(defeats,2,storage);
  expect(saved.research).toMatchObject({caterpie:24,pidgey:30,beedrill:1,pokeBalls:2});
  expect(saved.discoveredTms).toEqual(expect.arrayContaining(['sv:033','sv:111']));
  expect(saved.tmDiscoveries.filter(t=>t.id==='sv:111')).toHaveLength(1);
 });
 it('keeps synthesized sound optional and gives migrated saves safe defaults',()=>{
  expect(playGameCue('tm',{...DEFAULT_SETTINGS,soundEffects:false})).toBe(false);
  expect(playGameCue('xp',{...DEFAULT_SETTINGS,sfxVolume:0})).toBe(false);
  const storage=memoryStorage();
  storage.setItem('pokemon-survivors-save',JSON.stringify({version:2,settings:{screenShake:true}}));
  expect(loadSave(storage).settings).toMatchObject({soundEffects:true,sfxVolume:.6,screenShake:true});
 });
});
