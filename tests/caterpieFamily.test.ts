import {describe,it,expect} from 'vitest';
import {MOVES,POKEMON} from '../src/content';
import {CATERPIE_FAMILY,CATERPIE_MOVE_CATALOG} from '../src/data/caterpieMoves';
import {fusionForResult} from '../src/data/moveFusions';
import {ordinaryPredecessor} from '../src/data/moveChains';
import {moveCapacity} from '../src/moveProgression';
import {canEvolveMove,canFuseMove,canLearnMove} from '../src/moveEligibility';
import {makeState,evolveTo,applyUpgrade,spawnSpecies} from '../src/simulation';
import {activateProfileMove,stepEnemyMoveStatuses} from '../src/moveCombat';
import {aggregateItems} from '../src/items';
import {moveGuardFactor,moveOffenseFactor,buffStrength} from '../src/combatRuntime';
import {freshSave,recordSessionEvents,loadSave} from '../src/save';
import {generateMap} from '../src/worldgen';

const world=generateMap(123,'forest');
const fresh=()=>makeState(POKEMON.caterpie,123,world);
const choice=(kind:'moveEvolution'|'moveFusion',id:string)=>({kind,id,label:id});
const target=(s:ReturnType<typeof fresh>)=>{spawnSpecies(s,'caterpie');const e=s.enemies.at(-1)!;Object.assign(e,{x:s.player.x+50,y:s.player.y,hp:20000,maxHp:20000,baseSpeed:0,speed:0});return e;};

describe('Caterpie / Metapod / Butterfree content',()=>{
 it('has defined moves and three-stage capacity, with correct evolution levels',()=>{
  expect(CATERPIE_FAMILY).toEqual(['caterpie','metapod','butterfree']);
  for(const id of CATERPIE_MOVE_CATALOG)expect(MOVES[id].ranks).toHaveLength(5);
  expect(POKEMON.caterpie).toMatchObject({startingMove:'stringShot',evolvesTo:'metapod',evolutionLevel:7});
  expect(POKEMON.metapod).toMatchObject({evolvesTo:'butterfree',evolutionLevel:10});
  expect([POKEMON.caterpie,POKEMON.metapod,POKEMON.butterfree].map(p=>moveCapacity(p,1))).toEqual([3,4,5]);
 });
 it('preserves String Shot across evolutions and grants distinct Harden/Gust slots exactly once',()=>{
  const s=fresh(),starter=s.moveSlots[0];starter.rank=4;starter.nextAttackAt=9;
  evolveTo(s,'metapod');
  expect(s.moveSlots.map(slot=>slot.id)).toEqual(['stringShot','harden']);
  expect(starter).toBe(s.moveSlots[0]);expect(starter.rank).toBe(4);expect(starter.nextAttackAt).toBe(9);
  expect(s.progressionNotices).toContainEqual({kind:'reward',move:'harden'});
  evolveTo(s,'butterfree');
  expect(s.moveSlots.map(slot=>slot.id)).toEqual(['stringShot','harden','gust']);
  expect(s.progressionNotices).toContainEqual({kind:'reward',move:'gust'});
  evolveTo(s,'butterfree');expect(s.moveSlots.filter(slot=>slot.id==='gust')).toHaveLength(1);
  expect(s.moveSlots).toHaveLength(3);
 });
 it('blocks new evolution rewards from being learned before their stages',()=>{
  const s=fresh();expect(canLearnMove(s,'harden')).toBe(false);expect(canLearnMove(s,'gust')).toBe(false);
  evolveTo(s,'metapod');expect(canLearnMove(s,'gust')).toBe(false);
 });
});

describe('Caterpie ordinary upgrades and fusions',()=>{
 it('upgrades rank-five String Shot to Infestation in-place, not via a fusion recipe',()=>{
  const s=fresh(),slot=s.moveSlots[0];slot.rank=5;slot.nextAttackAt=10;
  expect(ordinaryPredecessor('infestation','caterpie')?.id).toBe('stringShot');
  expect(fusionForResult('infestation')).toBeUndefined();
  expect(canEvolveMove(s,'infestation')).toBe(true);
  expect(applyUpgrade(s,choice('moveEvolution','infestation'))).toBe(true);
  expect(s.moveSlots).toHaveLength(1);expect(s.moveSlots[0]).toBe(slot);
  expect(slot).toMatchObject({id:'infestation',rank:5,nextAttackAt:10,starter:true});
 });
 it.each([
  ['dreamEater','sleepPowder','psychic'],
  ['pollenPuff','bugBuzz','quiverDance'],
 ] as const)('%s requires both rank-five ingredients and only fuses on Butterfree',(result,a,b)=>{
  const s=fresh();s.moveSlots=[{id:a,rank:5},{id:b,rank:4}];
  expect(canFuseMove(s,result)).toBe(false);
  evolveTo(s,'metapod');s.moveSlots=[{id:a,rank:5},{id:b,rank:5}];
  expect(canFuseMove(s,result)).toBe(false);
  evolveTo(s,'butterfree');s.moveSlots=[{id:'stringShot',rank:2,starter:true},{id:a,rank:5},{id:b,rank:5}];
  expect(canFuseMove(s,result)).toBe(true);
  expect(applyUpgrade(s,choice('moveFusion',result))).toBe(true);
  expect(s.moveSlots.map(slot=>slot.id)).toEqual(['stringShot',result]);
  expect(s.moveSlots[1].rank).toBe(5);
  expect(s.fusionHistory).toContain(result);
  expect(canFuseMove(s,result)).toBe(false);
 });
});

describe('Caterpie battle mechanics',()=>{
 it('Infestation persists as bug damage over time',()=>{
  const s=fresh(),e=target(s);s.moveSlots=[{id:'infestation',rank:5}];
  const attack=activateProfileMove(s,s.moveSlots[0],MOVES.infestation,aggregateItems([]));
  expect(attack?.moveId).toBe('infestation');expect(e.statuses.some(status=>status.kind==='infested')).toBe(true);
  const hp=e.hp;stepEnemyMoveStatuses(s,e,1,aggregateItems([]));expect(e.hp).toBeLessThan(hp);
 });
 it('Dream Eater carries its fused sleep setup, drains victims and respects control immunity',()=>{
  const s=fresh(),e=target(s);e.hp=15000;s.hp=s.maxHp/2;
  const slot={id:'dreamEater',rank:5};s.moveSlots=[slot];
  const hp=e.hp,heal=s.hp;
  const attack=activateProfileMove(s,slot,MOVES.dreamEater,aggregateItems([]));
  expect(attack?.hits).toContain(e.id);expect(e.statuses.some(status=>status.kind==='sleep')).toBe(true);
  expect(e.hp).toBeLessThan(hp);expect(s.hp).toBeGreaterThan(heal);
  // After boss control resistance activates, fresh casts cannot bypass that immunity.
  e.statuses=[];e.controlImmuneUntil=s.time+3;const after=e.hp;
  activateProfileMove(s,slot,MOVES.dreamEater,aggregateItems([]));
  expect(e.hp).toBe(after);
 });
 it('Harden protects and Quiver Dance buffs special damage, each without stacking',()=>{
  const s=fresh();const mods=aggregateItems([]);s.moveSlots=[{id:'harden',rank:5},{id:'quiverDance',rank:5}];
  activateProfileMove(s,s.moveSlots[0],MOVES.harden,mods);
  expect(moveGuardFactor(s)).toBeLessThan(1);
  activateProfileMove(s,s.moveSlots[1],MOVES.quiverDance,mods);
  const strength=buffStrength(s,'quiverDance');
  expect(strength).toBeGreaterThan(0);expect(moveOffenseFactor(s,'Special','Bug')).toBeGreaterThan(1);
  activateProfileMove(s,s.moveSlots[1],MOVES.quiverDance,mods);
  expect(buffStrength(s,'quiverDance')).toBe(strength);
 });
});

describe('Caterpie research unlock',()=>{
 it('unlocks Caterpie after 50 defeats and repairs older saves without duplicating unlocks',()=>{
  const data=new Map<string,string>();
  const storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}} as Storage;
  expect(freshSave().unlockedPokemon).not.toContain('caterpie');
  recordSessionEvents({caterpie:49},0,storage);expect(loadSave(storage).unlockedPokemon).not.toContain('caterpie');
  recordSessionEvents({caterpie:1},0,storage);expect(loadSave(storage).unlockedPokemon).toContain('caterpie');
  const old=loadSave(storage);old.unlockedPokemon=old.unlockedPokemon.filter(id=>id!=='caterpie');
  data.set('pokemon-survivors-save',JSON.stringify(old));
  const repaired=loadSave(storage);expect(repaired.unlockedPokemon.filter(id=>id==='caterpie')).toHaveLength(1);
 });
});
