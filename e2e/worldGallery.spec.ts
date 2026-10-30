import {test,expect,Page} from '@playwright/test';

async function start(page:Page,seed?:number){
  const previous=await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game')?.state?.world?.seed);
  await page.evaluate(value=>{(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'bulbasaur',seed:value});},seed);
  await page.waitForFunction(old=>{const g=(window as any).__POKEMON_SURVIVORS__,s=g.scene.getScene('game');return g.scene.isActive('game')&&s.player?.active&&s.state.world.seed!==old;},previous);
  await page.waitForTimeout(100);
}
async function freezeCamera(page:Page,point:{x:number;y:number},zoom=1){
  await page.evaluate(({x,y,zoom})=>{
    const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.cancelChoices();s.overlay=s.add.container(0,0);s.state.enemies=[];s.state.projectiles=[];s.state.pickups=[];s.syncViews(1);
    for(const object of [s.player,s.playerShadow,s.playerHpGraphics,s.hud,s.expGraphics,s.expText,s.portrait,s.bossGraphics,s.bossText])object.setVisible(false);
    s.cameras.main.stopFollow();s.cameras.main.setZoom(zoom).centerOn(x,y);s.syncWorldChunks(true);
  },{...point,zoom});await page.waitForTimeout(90);
}

test('new normal runs use fresh world seeds and different terrain',async({page})=>{
  await page.goto('/');await expect(page.locator('canvas')).toBeVisible();const samples=[] as {seed:number;hash:number}[];
  for(let i=0;i<3;i++){
    await start(page);
    samples.push(await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');let h=2166136261;for(const v of s.state.world.terrain.cells){h^=v;h=Math.imul(h,16777619);}return{seed:s.state.world.seed,hash:h>>>0};}));
    await page.screenshot({path:`test-results/screenshots/v036-normal-run-${i+1}.png`});
  }
  expect(new Set(samples.map(s=>s.seed)).size).toBe(3);expect(new Set(samples.map(s=>s.hash)).size).toBe(3);
});

test('ten-seed environment gallery and required feature demonstrations',async({page})=>{
  test.setTimeout(120_000);await page.setViewportSize({width:1280,height:720});await page.goto('/?seed=1');await expect(page.locator('canvas')).toBeVisible();
  for(const seed of [1,7,42,1337,2026,12345,24680,90210,500123,876543]){
    await start(page,seed);
    const point=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{x:s.state.world.playerStart.x+450,y:s.state.world.playerStart.y+350};});
    await freezeCamera(page,point,.65);await page.screenshot({path:`test-results/screenshots/v036-seed-${seed}.png`});
  }
  await start(page,1337);
  const destinations=await page.evaluate(()=>{
    const map=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').state.world;
    const find=(id:string)=>map.decorations.find((d:any)=>d.id===id);
    return{campsite:map.features.camps[0],pond:map.features.ponds[0],cliff:map.features.cliffs[0],landRock:find('landRock'),waterRock:find('waterRock'),flowers:find('flowerPink'),grove:find('tree')};
  });
  for(const [name,point] of Object.entries(destinations)){
    expect(point,`${name} exists`).toBeTruthy();await freezeCamera(page,point as {x:number;y:number});await page.screenshot({path:`test-results/screenshots/v036-feature-${name}.png`});
  }
  const rockPixels=await page.evaluate(()=>{
    const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),source=s.textures.get('viridian-frlg/land_boulder').getSourceImage(),canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;const c=canvas.getContext('2d')!;c.drawImage(source,0,0);const p=c.getImageData(0,0,canvas.width,canvas.height).data;let blue=0;for(let i=0;i<p.length;i+=4)if(p[i+3]&&p[i+2]>p[i]+20)blue++;return blue;
  });expect(rockPixels).toBe(0);
});

test('cliff terrain blocks actual player movement',async({page})=>{
  await page.goto('/?seed=1337');await expect(page.locator('canvas')).toBeVisible();await start(page,1337);
  const edge=await page.evaluate(()=>{
    const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),grid=s.state.world.terrain;
    const i=grid.cells.findIndex((v:number,index:number)=>v===4&&index%grid.cols>1&&grid.cells[index-1]===0&&s.state.world.decorations.every((d:any)=>!d.solid||Math.hypot(d.x-((index%grid.cols)-.5)*32,d.y-(Math.floor(index/grid.cols)+.5)*32)>80));
    if(i<0)throw new Error('No clear cliff approach');const x=((i%grid.cols)-.5)*32,y=(Math.floor(i/grid.cols)+.5)*32;
    Object.assign(s.state.player,{x,y,vx:0,vy:0});s.previousPlayer={x,y};s.state.enemies=[];s.nextSpawn=Infinity;s.cameras.main.stopFollow();s.cameras.main.centerOn(x,y);s.syncWorldChunks(true);return{x,y};
  });
  await page.keyboard.down('d');await page.waitForTimeout(350);await page.keyboard.up('d');
  const player=await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').state.player);
  expect(player.x-edge.x).toBeLessThan(5);expect(player.x).toBeGreaterThanOrEqual(edge.x);
});

test('accelerated fixed-step run reaches a real Beedrill victory and persists it',async({page})=>{
  test.setTimeout(120_000);await page.goto('/?fast=1&seed=1337');await expect(page.locator('canvas')).toBeVisible();
  await page.evaluate(()=>{(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'bulbasaur',fast:true});});
  await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').player?.active);
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.maxHp=100000;s.state.hp=100000;s.state.powerBonus=20;s.state.moveSlots=['tackle','vineWhip','ember','waterGun'].map(id=>({id,rank:5}));});
  let ended=false;
  for(let i=0;i<500&&!ended;i++){
    const status=await page.evaluate(()=>{
      const g=(window as any).__POKEMON_SURVIVORS__,s=g.scene.getScene('game');
      for(let step=0;step<30&&!s.overlay&&!s.ended;step++)s.step();
      return{ended:s.ended,choice:g.scene.isActive('upgrade'),time:s.state.time};
    });
    ended=status.ended;
    if(status.choice){await page.keyboard.press('1');await page.waitForTimeout(190);}else await page.waitForTimeout(15);
  }
  expect(ended).toBe(true);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-survivors-save')!));expect(saved.lastRun.result).toBe('victory');expect(saved.unlockedStages).toContain('mtMoon');
  await page.screenshot({path:'test-results/screenshots/v036-complete-run-victory.png'});
});
