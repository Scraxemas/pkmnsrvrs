import {describe,expect,it} from 'vitest';
import {POKEMON} from '../src/content';
import {startingStats} from '../src/playerStats';
import {freshSave,loadSave,toggleFavorite,updateSettings} from '../src/save';
import {CHARACTER_RECORDS,CharacterSelection,filterRoster,regionRoster,ROSTER_REGIONS,rosterName,rosterRequirement,rosterState,STAT_CAPS} from '../src/ui/characterRoster';
import {makeState} from '../src/simulation';
import {generateMap} from '../src/worldgen';

const find=(id:string)=>CHARACTER_RECORDS.find(record=>record.id===id)!;
function storage():Storage{const data=new Map<string,string>();return{get length(){return data.size;},getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);},clear:()=>data.clear(),removeItem:key=>{data.delete(key);},key:index=>[...data.keys()][index]??null};}
describe('character roster and independent selections',()=>{
  it('has 151 stable catalogue slots without manufacturing combat definitions',()=>{
    const roster=regionRoster(ROSTER_REGIONS[0]);expect(roster).toHaveLength(151);expect(new Set(roster.map(r=>r.dex)).size).toBe(151);expect(roster[150]).toEqual({dex:151,types:[],startingPartner:false});expect(roster.filter(r=>r.combat)).toHaveLength(Object.keys(POKEMON).length);
    expect(ROSTER_REGIONS.map(r=>[r.first,r.last,r.available])).toEqual([[1,151,true],[152,251,false],[252,386,false]]);
    expect(regionRoster({id:'future',name:'Future',first:1,last:386,available:true})).toHaveLength(386);
  });
  it('keeps discovery, starter unlocks and available gameplay separate',()=>{
    const save=freshSave(),caterpie=find('caterpie'),ivysaur=find('ivysaur');
    expect(rosterState(caterpie,save)).toBe('undiscovered');expect(rosterName(ivysaur,save)).toBe('Undiscovered');
    save.pokedex.push('caterpie','ivysaur');save.unlockedPokemon.push('caterpie','ivysaur');
    expect(rosterState(caterpie,save)).toBe('unavailable');expect(rosterState(ivysaur,save)).toBe('unavailable');expect(rosterRequirement(ivysaur,save)).toContain('Evolve Bulbasaur at level 16');
    save.unlockedPokemon=save.unlockedPokemon.filter(id=>id!=='charmander');expect(rosterState(find('charmander'),save)).toBe('locked');
    expect(filterRoster(regionRoster(ROSTER_REGIONS[0]),save,'dex','unlocked').map(r=>r.id)).toEqual(['bulbasaur','squirtle']);
  });
  it('sorts actual visible identities without exposing undiscovered names',()=>{
    const save=freshSave(),roster=regionRoster(ROSTER_REGIONS[0]),byName=filterRoster(roster,save,'name','all');
    expect(byName.slice(0,3).map(r=>r.id)).toEqual(['bulbasaur','charmander','squirtle']);expect(byName[3].dex).toBe(2);
    expect(filterRoster(roster,save,'dex','discovered').map(r=>r.dex)).toEqual([1,4,7]);expect(roster.map(r=>r.dex)).toEqual(Array.from({length:151},(_,i)=>i+1));
  });
  it('does not confirm locked, unknown or evolution-only records or share ready state',()=>{
    const save=freshSave(),one=new CharacterSelection('one'),two=new CharacterSelection('two');
    one.preview(2);expect(one.confirm(find('ivysaur'),save)).toBeUndefined();expect(one.ready).toBe(false);
    one.preview(4);expect(one.confirm(find('bulbasaur'),save)).toBeUndefined();expect(one.confirm(find('charmander'),save)).toBe('charmander');expect(one.ready).toBe(true);expect(two.ready).toBe(false);
    two.preview(4);expect(two.confirm(find('charmander'),save)).toBe('charmander');one.preview(null);expect(one.confirmedDex).toBeNull();expect(two.confirmedDex).toBe(4);
  });
  it('shows simulation health and world movement speed using shared non-100 stat scales',()=>{
    const world=generateMap(1337,'forest');for(const id of ['bulbasaur','charmander','squirtle']){const p=POKEMON[id],stats=startingStats(p),state=makeState(p,1337,world);expect(stats.hp).toBe(state.maxHp);expect(stats.speed).toBe(p.speed);for(const key of Object.keys(stats) as (keyof typeof stats)[])expect(STAT_CAPS[key]).toBeGreaterThanOrEqual(stats[key]);}
    expect(startingStats(POKEMON.bulbasaur)).toEqual({hp:135,attack:49,specialAttack:65,speed:170});expect(STAT_CAPS.hp).toBe(240);expect(STAT_CAPS.speed).toBe(205);
  });
  it('persists favorite National Dex ids without disturbing migrated progress or settings',()=>{
    const local=storage(),old={...freshSave(),version:1,unlockedPokemon:['bulbasaur','squirtle'],research:{viridianWins:5,enemiesDefeated:123},settings:{damageNumbers:false}};
    local.setItem('pokemon-survivors-save',JSON.stringify(old));toggleFavorite(7,local);updateSettings({reducedMotion:true},local);
    expect(loadSave(local)).toMatchObject({favoritePokemon:[7],unlockedPokemon:['bulbasaur','squirtle'],research:{viridianWins:5,enemiesDefeated:123},settings:{damageNumbers:false,reducedMotion:true}});
    expect(filterRoster(regionRoster(ROSTER_REGIONS[0]),loadSave(local),'name','favorites').map(r=>r.dex)).toEqual([7]);toggleFavorite(7,local);expect(loadSave(local).favoritePokemon).toEqual([]);
  });
});
