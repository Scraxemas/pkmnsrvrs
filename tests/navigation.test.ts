import {describe,expect,it} from 'vitest';
import {POKEMON} from '../src/content';
import {makeState,spawnSpecies,tick} from '../src/simulation';
import {buildFlowField,flowDirection} from '../src/navigation';

describe('shared flow-field navigation',()=>{
  it('provides a route around generated obstacles',()=>{
    const state=makeState(POKEMON.bulbasaur,1337);
    const field=buildFlowField(state.world,state.player.x,state.player.y);
    const start=state.world.spawnZones[0];
    const direction=flowDirection(field,start.x+start.width/2,start.y+start.height/2);
    expect(direction.distance).toBeGreaterThan(0);
    expect(Math.hypot(direction.x,direction.y)).toBeCloseTo(1,4);
  });

  it('moves enemies toward a stationary player for 60 seconds without obstacle lockup',()=>{
    const state=makeState(POKEMON.bulbasaur,1337);
    spawnSpecies(state,'caterpie',40);
    const initial=new Map(state.enemies.map(e=>[e.id,Math.hypot(e.x-state.player.x,e.y-state.player.y)]));
    for(let i=0;i<60*30;i++)tick(state,1/30,{x:0,y:0},[]);
    const closer=state.enemies.filter(e=>Math.hypot(e.x-state.player.x,e.y-state.player.y)<(initial.get(e.id)??0)-80);
    const hardStuck=state.enemies.filter(e=>e.blockedFor>3);
    expect(closer.length).toBeGreaterThanOrEqual(Math.floor(state.enemies.length*.85));
    expect(hardStuck).toHaveLength(0);
  });

  it.each([25,100,250,400])('keeps %i-enemy crowd simulation finite',(count)=>{
    const state=makeState(POKEMON.squirtle,90210);
    spawnSpecies(state,'weedle',count);
    for(let i=0;i<150;i++)tick(state,1/30,{x:0,y:0},[]);
    expect(state.enemies.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y))).toBe(true);
    expect(state.enemies.filter(e=>e.blockedFor>2).length).toBeLessThan(Math.max(2,count*.05));
  });
});
