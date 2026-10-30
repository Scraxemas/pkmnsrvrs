import {describe,it,expect} from 'vitest';
import {seedForRun} from '../src/runSeed';
import {experienceProgress} from '../src/hudLayout';
import {applyUpgrade,isUpgradeAvailable,makeState,masteryOptions,reachablePickupPosition,spawnSpecies,upgradeOptions,tick} from '../src/simulation';
import {collides,generateMap} from '../src/worldgen';
import {setTerrain,TERRAIN} from '../src/terrain';
import {POKEMON} from '../src/content';
import {describeUpgrade} from '../src/upgrades';

describe('v0.3.6 progression and seed policy',()=>{
  it('uses reproducible explicit seeds and fresh normal-run seeds',()=>{
    expect(seedForRun('?seed=12345')).toBe(12345);expect(seedForRun('?seed=12345')).toBe(12345);
    expect(seedForRun('?seed=12',34)).toBe(34);
    expect(seedForRun('',undefined,()=>77)).not.toBe(seedForRun('',undefined,()=>77));
  });
  it('uses incremental XP and handles the level cap without Infinity labels',()=>{
    expect(experienceProgress(7,42,100)).toEqual({ratio:.42,label:'LEVEL 7 — EXP 42 / 100'});
    expect(experienceProgress(100,100,Infinity)).toEqual({ratio:1,label:'LEVEL 100 — MAX LEVEL'});
  });
  it('does not offer capped vitamins, moves, items, or masteries',()=>{
    const s=makeState(POKEMON.bulbasaur,1337);s.vitamins.iron=10;s.moveSlots[0].rank=5;s.masteries.overcharge=3;
    expect(upgradeOptions(s,100).some(u=>u.id==='iron'||u.id===s.moveSlots[0].id)).toBe(false);
    expect(masteryOptions(s).some(u=>u.id==='overcharge')).toBe(false);
    expect(isUpgradeAvailable(s,{kind:'vitamin',id:'iron',label:'Iron'})).toBe(false);
  });
  it('cards describe actual rank effects and HP vitamins apply immediately',()=>{
    const s=makeState(POKEMON.bulbasaur,1337);
    expect(describeUpgrade(s,{kind:'move',id:'vineWhip',label:''}).benefit).toContain('Range +20%');
    const hp=s.maxHp;applyUpgrade(s,{kind:'vitamin',id:'hpUp',label:''});expect(s.maxHp).toBe(hp+5);
  });
  it('rescues drops from ponds, cliffs, and solid props into reachable navigation cells',()=>{
    const s=makeState(POKEMON.bulbasaur,1337);
    for(const point of [...s.world.features.ponds,...s.world.features.cliffs,...s.world.decorations.filter(d=>d.solid).slice(0,30)]){
      const p=reachablePickupPosition(s,point.x,point.y),f=s.navigation;
      expect(collides(s.world,p.x,p.y,10)).toBe(false);
      expect(f.distances[Math.floor((p.y-f.originY)/f.cellSize)*f.cols+Math.floor((p.x-f.originX)/f.cellSize)]).toBeGreaterThanOrEqual(0);
    }
  });
  it('retains uncollected balls while the player travels and collects on return',()=>{
    const s=makeState(POKEMON.bulbasaur,1337),home={...s.player};
    s.pickups.push({id:9999,x:home.x,y:home.y,value:1,kind:'ball',tier:2});
    const destination=s.world.features.clearings[1];Object.assign(s.player,destination);
    for(let i=0;i<30;i++)tick(s,1/30,{x:0,y:0});
    expect(s.pickups.some(p=>p.id===9999)).toBe(true);
    Object.assign(s.player,home);expect(tick(s,1/30,{x:0,y:0})).toContain('ball-collected:2');
    expect(s.pickups).toEqual([]);
  });
  it.each([TERRAIN.water,TERRAIN.cliff])('does not knock living grounded enemies into terrain %i',terrain=>{
    const world=generateMap(42,'cave');setTerrain(world.terrain,12,11,terrain);
    const s=makeState(POKEMON.bulbasaur,1337,world),x=12*64-15,y=11*64+32;
    s.moveSlots=[{id:'tackle',rank:1}];
    Object.assign(s.player,{x:x-50,y});spawnSpecies(s,'caterpie');
    Object.assign(s.enemies[0],{x,y,hp:1000,speed:0,baseSpeed:0});s.time=.74;
    tick(s,1/30,{x:0,y:0});
    expect(s.attacks[0].hits).toContain(s.enemies[0].id);
    expect(collides(world,s.enemies[0].x,s.enemies[0].y,14)).toBe(false);
  });
  it('fires at the actual cooldown and cooldown upgrades increase activation rate',()=>{
    const activations=(rank:number)=>{
      const s=makeState(POKEMON.bulbasaur,1337);s.moveSlots=[{id:'tackle',rank}];spawnSpecies(s,'caterpie');
      const enemy=s.enemies[0];Object.assign(enemy,{hp:100000,speed:0,baseSpeed:0});let count=0;
      for(let i=0;i<123;i++){enemy.x=s.player.x+30;enemy.y=s.player.y;tick(s,1/30,{x:0,y:0});count+=s.attacks.length;}
      return count;
    };
    expect(activations(1)).toBe(5);expect(activations(3)).toBe(6);
  });
});
