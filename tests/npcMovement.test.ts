import {describe,expect,it} from 'vitest';
import {NPC_STUCK_SECONDS,NpcMotion,resolveNpcMovement} from '../src/npcMovement';

const body=():NpcMotion=>({x:0,y:0,vx:0,vy:0,blockedFor:0,avoidSign:1});
const wall=(x:number,_y:number)=>x>0;

describe('stable NPC obstacle movement',()=>{
  it.each([20,30,60,144])('keeps intent and position stable for .75s against a wall at %i Hz',hz=>{
    const e=body(),dt=1/hz;
    for(let i=0;i<Math.floor(NPC_STUCK_SECONDS*hz);i++){
      resolveNpcMovement(e,1,0,60,dt,(i+1)*dt,wall);
      expect(e.x).toBe(0);expect(e.y).toBe(0);
      expect(e.vx).toBe(0);expect(e.vy).toBe(0);
      expect(e.desiredVx).toBe(60);expect(e.desiredVy).toBe(0);
    }
    expect(e.blockedFor).toBeCloseTo(Math.floor(NPC_STUCK_SECONDS*hz)/hz);
  });

  it('commits to one detour and never flips its avoidance sign each tick',()=>{
    const e=body(),dt=1/60,ys:number[]=[];
    for(let i=0;i<180;i++){
      resolveNpcMovement(e,1,0,60,dt,(i+1)*dt,wall);ys.push(e.y);
      expect(e.x).toBe(0);expect(e.avoidSign).toBe(1);
    }
    expect(e.y).toBeGreaterThan(60);
    expect(ys.every((y,i)=>i===0||y>=ys[i-1])).toBe(true);
    expect(e.desiredVx).toBe(60);
  });

  it('slides along an oblique wall without backwards correction or tunnelling',()=>{
    const e=body();
    resolveNpcMovement(e,1,1,600,.5,.5,(x,y)=>x>10&&y<400);
    expect(e.x).toBeLessThanOrEqual(10);expect(e.y).toBeGreaterThan(200);
    expect(e.vx).toBeGreaterThanOrEqual(0);expect(e.vy).toBeGreaterThan(0);
    const fast=body();
    resolveNpcMovement(fast,1,0,1200,.5,.5,x=>x>=40&&x<=64);
    expect(fast.x).toBeLessThan(40);
  });

  it('waits without snapping when neither detour can pass a confined obstacle',()=>{
    const e=body(),dt=1/30;let checks=0;
    for(let i=0;i<150;i++)checks+=resolveNpcMovement(e,1,0,60,dt,(i+1)*dt,(x,y)=>x>0||Math.abs(y)>3).checks;
    expect(e.x).toBe(0);expect(e.y).toBe(0);expect(e.vx).toBe(0);expect(e.blockedFor).toBeCloseTo(5);
    // Alternative routes are probed on a cooldown, not every simulation tick.
    expect(checks).toBeLessThan(330);
  });

  it('produces similar paths over different simulation frame rates',()=>{
    const positions=[20,30,60,144].map(hz=>{
      const e=body();for(let i=0;i<hz*3;i++)resolveNpcMovement(e,1,0,60,1/hz,(i+1)/hz,wall);
      return e;
    });
    expect(Math.max(...positions.map(e=>e.y))-Math.min(...positions.map(e=>e.y))).toBeLessThan(7);
    expect(positions.every(e=>e.x===0&&e.vx===0)).toBe(true);
  });
});
