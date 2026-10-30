import {describe,expect,it} from 'vitest';
import {POKEMON} from '../src/content';
import {makeState,spawnSpecies,tick} from '../src/simulation';
import {buildFlowField,flowDirection} from '../src/navigation';
import {collides,generateMap} from '../src/worldgen';

describe('shared flow-field navigation',()=>{
  it.each([[0,0],[-4096,8192]])('uses blocked-cell recovery with origin (%i,%i)',(originX,originY)=>{
    const map=generateMap(7,'cave');
    map.decorations.push({id:'tree',x:160,y:160,depth:160,solid:true,radius:30,collisionRadius:14});
    const x=132,y=130,field=buildFlowField(map,400,160,64);
    // The circle fits at the edge of the cell, but the sampled cell centre is
    // inside the trunk. Navigation must expose its recovered route as reachable.
    expect(collides(map,x,y,14)).toBe(false);
    expect(field.distances[Math.floor(y/64)*field.cols+Math.floor(x/64)]).toBe(-1);
    field.originX+=originX;field.originY+=originY;
    const direction=flowDirection(field,x+originX,y+originY);
    expect(direction.distance).toBeGreaterThanOrEqual(0);
    expect(Math.hypot(direction.x,direction.y)).toBeCloseTo(1,4);
    field.distances.fill(-1);
    expect(flowDirection(field,x+originX,y+originY).distance).toBe(-1);
  });

  it('provides a route around generated obstacles',()=>{
    const state=makeState(POKEMON.bulbasaur,1337);
    const field=buildFlowField(state.world,state.player.x,state.player.y);
    const start=state.world.spawnZones[0];
    const direction=flowDirection(field,start.x+start.width/2,start.y+start.height/2);
    expect(direction.distance).toBeGreaterThan(0);
    expect(Math.hypot(direction.x,direction.y)).toBeCloseTo(1,4);
  });

  it('moves the crowd toward a stationary player while allowing a small stationary blocked minority',()=>{
    const state=makeState(POKEMON.bulbasaur,1337);
    spawnSpecies(state,'caterpie',40);
    const initial=new Map(state.enemies.map(e=>[e.id,Math.hypot(e.x-state.player.x,e.y-state.player.y)]));
    for(let i=0;i<60*30;i++)tick(state,1/30,{x:0,y:0},[]);
    const closer=state.enemies.filter(e=>Math.hypot(e.x-state.player.x,e.y-state.player.y)<(initial.get(e.id)??0)-80);
    const hardStuck=state.enemies.filter(e=>e.blockedFor>3);
    expect(closer.length).toBeGreaterThanOrEqual(Math.floor(state.enemies.length*.85));
    // Lightweight avoidance may wait in an obstacle pocket; it must stay still
    // rather than bouncing through a wall just to reset a stuck counter.
    expect(hardStuck.length).toBeLessThanOrEqual(Math.ceil(state.enemies.length*.05));
    expect(hardStuck.every(e=>Math.hypot(e.vx,e.vy)<2)).toBe(true);
    expect(state.enemies.every(e=>!collides(state.world,e.x,e.y,14))).toBe(true);
  });

  it.each([25,100,250,400])('keeps %i-enemy crowd simulation finite',(count)=>{
    const state=makeState(POKEMON.squirtle,90210);
    spawnSpecies(state,'weedle',count);
    for(let i=0;i<150;i++)tick(state,1/30,{x:0,y:0},[]);
    expect(state.enemies.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y))).toBe(true);
    expect(state.enemies.filter(e=>e.blockedFor>2).length).toBeLessThan(Math.max(2,count*.05));
  });
});
