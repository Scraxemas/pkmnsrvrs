import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

for(const seed of [1337,24680,8675309,7,20261102]){
 test('canopy pages stream cleanly on endless forest seed '+seed,async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await page.goto('/?seed='+seed);
  await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__);
  await page.evaluate((n:number)=>{
   const save=JSON.parse(localStorage.getItem('pokemon-survivors-save')||'{"version":2}');
   save.settings={...save.settings,canopyIntensity:'standard'};localStorage.setItem('pokemon-survivors-save',JSON.stringify(save));
   (window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'charmander',seed:n});
  },seed);
  await page.waitForFunction(()=>((window as any).__POKEMON_SURVIVORS__.scene.getScene('game')?.state?.time??0)>.2);
  mkdirSync('test-results/v072-canopy-gallery',{recursive:true});
  const inspect=()=>page.evaluate(()=>{
   const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
   return {pageCount:s.chunkViews.size,
    canopyCount:s.canopyRenderer.layer.list.length,
    shadeObjects:s.canopyRenderer.layer.list.filter((o:any)=>o.getData?.('canopyPage')).length,
    vignette:s.canopyRenderer.vignette?.visible??false,
    canopyTextures:s.textures.getTextureKeys().filter((key:string)=>key.startsWith('forest-canopy-field:')).length,
    textureSamples:(()=>{
     const image=s.canopyRenderer.layer.list[0],texture=image?.texture;
     if(!texture?.getContext)return null;
     const ctx=texture.getContext(),pixels=ctx.getImageData(0,0,texture.source[0].width,texture.source[0].height).data;
     let min=255,max=0;
     for(let p=3;p<pixels.length;p+=4){min=Math.min(min,pixels[p]);max=Math.max(max,pixels[p]);}
     return{min,max};
    })(),
    solidity:s.state.world.decorations.filter((d:any)=>d.solid).length,
    x:s.state.player.x,y:s.state.player.y};
  });
  const first=await inspect();
  expect(first.vignette).toBe(true);
  expect(first.shadeObjects).toBeGreaterThan(0);
  expect(first.canopyCount).toBeLessThanOrEqual(first.pageCount);
  expect(first.canopyTextures).toBe(first.canopyCount);
  expect(first.textureSamples).not.toBeNull();
  expect(first.textureSamples!.max-first.textureSamples!.min).toBeGreaterThan(2);
  await page.screenshot({path:`test-results/v072-canopy-gallery/seed-${seed}-standard.png`});
  for(const [x,y] of [[67000,-53000],[-72000,81000],[0,0]]){
   await page.evaluate(([px,py])=>{
    const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
    Object.assign(s.state.player,{x:px,y:py,vx:0,vy:0});
    s.state.enemies=[];s.nextSpawn=Infinity;s.miniIndex=99;
    s.cameraTarget.setPosition(px,py);s.cameras.main.centerOn(px,py);s.syncWorldChunks(true);
   },[x,y]);
   const next=await inspect();
   expect(next.pageCount).toBeGreaterThan(0);
   expect(next.canopyCount).toBeLessThanOrEqual(next.pageCount);
   expect(next.canopyTextures).toBe(next.canopyCount);
   expect(next.x).toBe(x);expect(next.y).toBe(y);
   await page.screenshot({path:`test-results/v072-canopy-gallery/seed-${seed}-${x===0?'return':x>0?'positive':'negative'}.png`});
  }
 });
}

test('canopy setting Off removes all shadow objects but keeps the same terrain and landmarks',async({page})=>{
 mkdirSync('test-results/v072-canopy-gallery',{recursive:true});
 await page.goto('/?seed=1337');
 await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__);
 const read=async(level:'off'|'standard')=>{
  return page.evaluate((lvl)=>{
   const game=(window as any).__POKEMON_SURVIVORS__,save=JSON.parse(localStorage.getItem('pokemon-survivors-save')||'{"version":2}');
   save.settings={...save.settings,canopyIntensity:lvl};localStorage.setItem('pokemon-survivors-save',JSON.stringify(save));
   game.scene.stop('game');game.scene.start('game',{pokemon:'charmander',seed:1337});
   return lvl;
  },level);
 };
 await read('off');
 await page.waitForFunction(()=>((window as any).__POKEMON_SURVIVORS__.scene.getScene('game')?.state?.time??0)>.2);
 const off=await page.evaluate(()=>{
  const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
  return{shadows:s.canopyRenderer.layer.list.length,vignette:!!s.canopyRenderer.vignette,
   canopyTextures:s.textures.getTextureKeys().filter((key:string)=>key.startsWith('forest-canopy-field:')).length,
   landmarks:s.state.world.landmarks.map((l:any)=>l.id)};
 });
 expect(off.shadows).toBe(0);expect(off.vignette).toBe(false);expect(off.canopyTextures).toBe(0);
 await page.screenshot({path:'test-results/v072-canopy-gallery/seed-1337-off.png'});
 await read('standard');
 await page.waitForFunction(()=>((window as any).__POKEMON_SURVIVORS__.scene.getScene('game')?.state?.time??0)>.2);
 const on=await page.evaluate(()=>{
  const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
  return{shadows:s.canopyRenderer.layer.list.length,vignette:!!s.canopyRenderer.vignette,
   canopyTextures:s.textures.getTextureKeys().filter((key:string)=>key.startsWith('forest-canopy-field:')).length,
   landmarks:s.state.world.landmarks.map((l:any)=>l.id)};
 });
 expect(on.shadows).toBeGreaterThan(0);expect(on.vignette).toBe(true);
 expect(on.canopyTextures).toBe(on.shadows);
 expect(on.landmarks).toEqual(off.landmarks);
});

test('canopy still keeps HUD and combat visible at a mobile viewport',async({page})=>{
 mkdirSync('test-results/v072-canopy-gallery',{recursive:true});
 await page.setViewportSize({width:390,height:844});
 await page.goto('/?seed=1337');
 await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__);
 await page.evaluate(()=>{
  const game=(window as any).__POKEMON_SURVIVORS__,save=JSON.parse(localStorage.getItem('pokemon-survivors-save')||'{"version":2}');
  save.settings={...save.settings,canopyIntensity:'standard'};
  localStorage.setItem('pokemon-survivors-save',JSON.stringify(save));
  game.scene.start('game',{pokemon:'charmander',seed:1337});
 });
 await page.waitForFunction(()=>((window as any).__POKEMON_SURVIVORS__.scene.getScene('game')?.state?.time??0)>.2);
 const result=await page.evaluate(()=>{
  const game=(window as any).__POKEMON_SURVIVORS__,s=game.scene.getScene('game');
  const rect=game.canvas.getBoundingClientRect();
  return{vignette:s.canopyRenderer.vignette?.visible,shadowCount:s.canopyRenderer.layer.list.length,
   timer:s.timerText.visible,player:s.player.visible,rect:{x:rect.x,y:rect.y,right:rect.right,bottom:rect.bottom}};
 });
 expect(result.vignette).toBe(true);expect(result.timer).toBe(true);expect(result.player).toBe(true);
 expect(result.shadowCount).toBeGreaterThan(0);
 expect(result.rect.x).toBeGreaterThanOrEqual(-1);expect(result.rect.right).toBeLessThanOrEqual(391);
 expect(result.rect.bottom).toBeLessThanOrEqual(845);
 await page.screenshot({path:'test-results/v072-canopy-gallery/mobile-standard.png'});
});
