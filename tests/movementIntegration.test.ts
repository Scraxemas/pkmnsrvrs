import {describe,expect,it} from 'vitest';
import {grantMoveBuff} from '../src/combatRuntime';
import {POKEMON} from '../src/content';
import {Facing} from '../src/direction';
import {makeState,spawnSpecies,tick} from '../src/simulation';
import {collides,generateMap,syncWorldChunks} from '../src/worldgen';

const dt=1/30;
function openState(){
  // The open legacy arena isolates input magnitude from forest obstacle layout.
  const state=makeState(POKEMON.bulbasaur,731,generateMap(731,'cave'));
  state.moveSlots=[];
  return state;
}

describe('shared analog movement integration',()=>{
  it.each([
    [0,-.5,'north'],[.5,0,'east'],[0,.5,'south'],[-.5,0,'west'],
    [.3,-.4,'northeast'],[.3,.4,'southeast'],[-.3,.4,'southwest'],[-.3,-.4,'northwest'],
  ] as [number,number,Facing][])('preserves partial input (%s, %s) and faces %s',(x,y,facing)=>{
    const state=openState(),start={...state.player};
    tick(state,dt,{x,y});
    expect(state.player.x-start.x).toBeCloseTo(x*POKEMON.bulbasaur.speed*dt);
    expect(state.player.y-start.y).toBeCloseTo(y*POKEMON.bulbasaur.speed*dt);
    expect(Math.hypot(state.player.vx,state.player.vy)).toBeCloseTo(POKEMON.bulbasaur.speed*.5);
    expect(state.player.facing).toBe(facing);
  });

  it.each([[1,0],[1,1],[-1,-1],[3,4]])('caps full input (%s, %s) at the same maximum speed',(x,y)=>{
    const state=openState(),start={...state.player};
    tick(state,dt,{x,y});
    expect(Math.hypot(state.player.x-start.x,state.player.y-start.y)).toBeCloseTo(POKEMON.bulbasaur.speed*dt);
    expect(Math.hypot(state.player.vx,state.player.vy)).toBeCloseTo(POKEMON.bulbasaur.speed);
  });

  it('changes direction without inertia and stops on the next simulation tick',()=>{
    const state=openState();
    tick(state,dt,{x:.5,y:0});
    const turn={...state.player};
    tick(state,dt,{x:0,y:-.25});
    expect(state.player.x).toBe(turn.x);
    expect(state.player.y).toBeCloseTo(turn.y-POKEMON.bulbasaur.speed*.25*dt);
    expect(state.player.facing).toBe('north');
    const stopped={...state.player};
    for(let i=0;i<5;i++)tick(state,dt,{x:0,y:0});
    expect(state.player).toEqual({...stopped,vx:0,vy:0});
  });

  it('produces the same analog displacement across simulation step sizes',()=>{
    const positions=[20,30,60,144].map(hz=>{
      const state=openState();
      for(let i=0;i<hz;i++)tick(state,1/hz,{x:.3,y:-.4});
      return state.player;
    });
    for(const player of positions){
      expect(player.x).toBeCloseTo(positions[0].x,8);
      expect(player.y).toBeCloseTo(positions[0].y,8);
      expect(player.facing).toBe('northeast');
    }
  });

  it('applies existing held-item, vitamin, slow and move-buff multipliers to partial speed',()=>{
    const state=openState();
    state.items=[{id:'floatStone',rank:5}];
    state.vitamins.carbos=2;
    state.playerStatuses=[{kind:'slow',remaining:5,tick:0,power:0}];
    grantMoveBuff(state,'trailblaze','trailblaze',.2,5);
    tick(state,dt,{x:.3,y:.4});
    expect(Math.hypot(state.player.vx,state.player.vy)).toBeCloseTo(POKEMON.bulbasaur.speed*.5*1.15*1.03*.8*1.2);
    expect(state.player.facing).toBe('southeast');
  });

  it.each(['tree','landRock'])('uses existing generated %s collision while moving with partial input',id=>{
    const state=makeState(POKEMON.bulbasaur,731);
    state.moveSlots=[];
    const obstacle=state.world.decorations.find(decoration=>{
      if(decoration.id!==id||!decoration.solid)return false;
      // Find a clear approach to an actual generated obstacle, independent of
      // other nearby props and terrain. The player has an existing 14-unit body.
      return [1,4,8].every(gap=>!collides(state.world,decoration.x-decoration.collisionRadius-14-gap,decoration.y,14));
    });
    expect(obstacle,`a generated ${id} with a clear approach`).toBeDefined();
    const prop=obstacle!,boundary=prop.collisionRadius+14;
    Object.assign(state.player,{x:prop.x-boundary-8,y:prop.y,vx:0,vy:0});
    syncWorldChunks(state.world,state.player.x,state.player.y);
    const startX=state.player.x;
    for(let i=0;i<40;i++){
      tick(state,dt,{x:.5,y:0});
      expect(collides(state.world,state.player.x,state.player.y,14)).toBe(false);
      expect(Math.hypot(state.player.x-prop.x,state.player.y-prop.y)).toBeGreaterThanOrEqual(boundary);
    }
    expect(state.player.x).toBeGreaterThan(startX);
    expect(prop.x-state.player.x).toBeLessThan(boundary+POKEMON.bulbasaur.speed*.5*dt);
    expect(state.player.vx).toBe(0);
    expect(state.player.vy).toBe(0);
  });

  it('continues automatic attacks on their cooldown while analog movement is active',()=>{
    const state=openState();
    state.moveSlots=[{id:'vineWhip',rank:1,starter:true,nextAttackAt:dt}];
    spawnSpecies(state,'caterpie',1,false,false,{x:state.player.x+50,y:state.player.y});
    const enemy=state.enemies[0];
    Object.assign(enemy,{hp:10000,maxHp:10000,speed:0,baseSpeed:0});
    const startX=state.player.x,attackTimes:number[]=[];
    for(let i=0;i<75;i++){
      tick(state,dt,{x:.1,y:0});
      if(state.attacks.some(attack=>attack.moveId==='vineWhip'&&attack.animationEligible))attackTimes.push(state.time);
    }
    expect(state.player.x-startX).toBeCloseTo(POKEMON.bulbasaur.speed*.1*2.5);
    expect(enemy.hp).toBeLessThan(10000);
    expect(attackTimes.length).toBeGreaterThanOrEqual(3);
    expect(attackTimes[1]-attackTimes[0]).toBeCloseTo(1.1,6);
    expect(attackTimes[2]-attackTimes[1]).toBeCloseTo(1.1,6);
  });
});
