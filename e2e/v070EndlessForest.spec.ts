import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

for(const seed of [1337,24680,8675309]){
 test(`endless open Viridian: seed ${seed}, positive/negative travel and local boss`,async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await page.goto('/?seed='+seed);
  await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__);
  await page.evaluate((n)=>(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'charmander',seed:n}),seed);
  await page.waitForFunction(()=>{
   const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
   return s?.state?.time>.2&&s?.chunkViews?.size>0;
  });
  mkdirSync('test-results/endless-forest',{recursive:true});
  const inspect=()=>page.evaluate(()=>{
   const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
   const m=s.state.world,terrain=m.terrain.cells,solids=m.decorations.filter((d:any)=>d.solid);
   return{timeLimit:s.duration,unbounded:!Number.isFinite(m.width)&&!Number.isFinite(m.height),
    chunks:Object.keys(m.chunks).length,active:m.stream.activeKeys.length,cache:m.stream.cache.size,
    grass:terrain.filter((t:number)=>t===0).length/terrain.length,
    blocked:terrain.filter((t:number)=>t===2||t===4).length,
    roads:terrain.filter((t:number)=>t===1).length/terrain.length,
    solids:solids.length,objectCount:m.decorations.length,
    x:s.state.player.x,y:s.state.player.y,bossSpawned:s.state.bossSpawned};
  });
  const start=await inspect();
  expect(start).toMatchObject({timeLimit:1800,unbounded:true,chunks:9,active:9,blocked:0,bossSpawned:false});
  expect(start.grass).toBeGreaterThan(.75);expect(start.roads).toBeLessThan(.12);
  expect(start.solids).toBeLessThan(85);
  await page.screenshot({path:`test-results/endless-forest/seed-${seed}-origin.png`});
  for(const [x,y] of [[57000,-48000],[-68000,72000]]){
   await page.evaluate(([px,py])=>{
    const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
    Object.assign(s.state.player,{x:px,y:py,vx:0,vy:0});
    s.state.enemies=[];s.nextSpawn=Infinity;s.miniIndex=99;
    s.cameraTarget.setPosition(px,py);s.cameras.main.centerOn(px,py);s.syncWorldChunks(true);
   },[x,y]);
   const far=await inspect();
   expect(far).toMatchObject({chunks:9,active:9,blocked:0,x,y});
   expect(far.cache).toBeLessThanOrEqual(18);
   expect(far.grass).toBeGreaterThan(.75);
   expect(far.roads).toBeLessThan(.12);
   expect(far.solids).toBeLessThan(85);
   await page.screenshot({path:`test-results/endless-forest/seed-${seed}-${x>0?'positive':'negative'}.png`});
  }
  const finale=await page.evaluate(()=>{
   const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
   const old={...s.state.player};
   s.state.time=1800;s.schedule();
   const boss=s.state.enemies.find((e:any)=>e.boss);
   return{moved:Math.hypot(s.state.player.x-old.x,s.state.player.y-old.y),
    spawned:s.state.bossSpawned,distance:boss?Math.hypot(boss.x-old.x,boss.y-old.y):0};
  });
  expect(finale.moved).toBe(0);
  expect(finale.spawned).toBe(true);
  expect(finale.distance).toBeGreaterThan(300);
  expect(finale.distance).toBeLessThan(570);
 });
}
