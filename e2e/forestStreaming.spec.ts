import {test,expect,Page} from '@playwright/test';

async function start(page:Page){
 await page.goto('/?seed=1337');await expect(page.locator('#app canvas')).toBeVisible();
 await page.evaluate(()=>{(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'bulbasaur',seed:1337});});
 await page.waitForFunction(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return s.player?.active&&s.groundLayer?.active;});
}

test('continuous travel beyond both old edges keeps terrain, camera, layers and bounded residency',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await start(page);
 await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.moveSlots=[];s.state.enemies=[];s.nextSpawn=Infinity;s.miniIndex=99;s.state.hp=s.state.maxHp=100000;});
 const samples=[];
 for(const [x,y] of [[-24,-50000],[10216,50000],[50000,-50000],[-50000,50000]]){
  await page.evaluate(({x,y})=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');Object.assign(s.state.player,{x,y,vx:0,vy:0});s.previousPlayer={x,y};s.cameraTarget.setPosition(x,y);s.cameras.main.centerOn(x,y);}, {x,y});
  await page.waitForTimeout(250);
  samples.push(await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{active:Object.keys(s.state.world.chunks).length,cache:s.state.world.stream.cache.size,pages:s.chunkViews.size,terrain:s.groundLayer.length,world:s.worldLayer.length,cameraBounds:s.cameras.main.useBounds,playerLayer:s.player.displayList===s.worldLayer,groundDepth:s.groundLayer.depth,worldDepth:s.worldLayer.depth,effectsDepth:s.effectsLayer.depth,hudDepth:s.hud.depth,playerX:s.state.player.x,playerY:s.state.player.y,hud:s.objectiveHud.text};}));
  await page.screenshot({path:`test-results/screenshots/forest-stream-${x}-${y}.png`});
 }
 for(const sample of samples){expect(sample.active).toBe(9);expect(sample.cache).toBeLessThanOrEqual(18);expect(sample.pages).toBeGreaterThan(0);expect(sample.pages).toBeLessThanOrEqual(25);expect(sample.terrain).toBeLessThan(16000);expect(sample.cameraBounds).toBe(false);expect(sample.playerLayer).toBe(true);expect(sample.worldDepth).toBeGreaterThan(sample.groundDepth);expect(sample.effectsDepth).toBeGreaterThan(sample.worldDepth);expect(sample.hudDepth).toBeGreaterThan(sample.effectsDepth);expect(sample.hud).toContain('Beedrill Nest');}
 expect(errors).toEqual([]);
});

test('keyboard movement crosses a negative chunk seam and waves keep their survival phase',async({page})=>{
 await start(page);
 const edge=await page.evaluate(async()=>{
  const {forestChunkPorts}=await import('/src/forestWorld.ts');
  const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),p=forestChunkPorts(s.state.world.seed,-1,-5).east;
  Object.assign(s.state.player,{x:p.x-24,y:p.y,vx:0,vy:0});s.previousPlayer={x:p.x-24,y:p.y};s.state.enemies=[];s.state.moveSlots=[];s.state.hp=s.state.maxHp=100000;s.state.time=800;s.nextSpawn=800;s.miniIndex=99;s.cameraTarget.setPosition(p.x-24,p.y);s.cameras.main.centerOn(p.x-24,p.y);return p;
 });
 await page.keyboard.down('d');await page.waitForTimeout(400);await page.keyboard.up('d');
 const sample=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{x:s.state.player.x,time:s.state.time,phase:s.state.encounterPhase,enemies:s.state.enemies.length,center:s.state.world.stream.centerX};});
 expect(sample.x).toBeGreaterThan(edge.x+20);expect(sample.time).toBeGreaterThan(800);expect(sample.phase).toBe('escalation');expect(sample.enemies).toBeGreaterThan(0);expect(sample.center).toBe(0);
});

test('Pikachu discovery persists, and the timed Beedrill finale awards Weedle and the Brock route',async({page})=>{
 test.setTimeout(60_000);await start(page);
 await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),l=s.state.world.landmarks.find((l:any)=>l.id==='pikachu-hollow');s.state.enemies=[];s.state.moveSlots=[];s.nextSpawn=Infinity;s.miniIndex=99;Object.assign(s.state.player,{x:l.x+110,y:l.y});s.previousPlayer={x:l.x+110,y:l.y};});
 await page.waitForFunction(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return s.state.enemies.some((e:any)=>e.species==='pikachu');});
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-survivors-save')!).discoveredLocations)).toContain('viridian:pikachu-hollow');
 await page.screenshot({path:'test-results/screenshots/forest-pikachu-hollow.png'});
 await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.hp=s.state.maxHp=100000;s.state.powerBonus=1000;s.state.moveSlots=[{id:'vineWhip',rank:5,starter:true}];s.state.time=s.duration;s.state.bossSpawned=false;s.nextSpawn=Infinity;s.schedule();});
 const arena=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),b=s.state.enemies.find((e:any)=>e.boss);return{arena:s.state.world.bossArena,player:s.state.player,boss:{x:b.x,y:b.y},time:s.state.time};});
 expect(arena.player.x).toBeGreaterThan(arena.arena.x);expect(arena.player.x).toBeLessThan(arena.arena.x+600);expect(arena.boss.y).toBeGreaterThan(arena.arena.y);expect(arena.boss.y).toBeLessThan(arena.arena.y+600);expect(arena.time).toBeGreaterThanOrEqual(1800);expect(arena.time).toBeLessThan(1801);
 await page.screenshot({path:'test-results/screenshots/forest-beedrill-arena.png'});
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('pokemon-survivors-save')??'{}').lastRun?.result==='victory',{},{timeout:25000});
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-survivors-save')!));expect(saved.unlockedPokemon).toContain('weedle');expect(saved.unlockedStages).toContain('pewterGym');expect(saved.unlockedStages).toContain('mtMoon');expect(saved.research.beedrill).toBeGreaterThan(0);expect(saved.completedStages).toContain('viridian');
});
