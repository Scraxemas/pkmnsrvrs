import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {readyMenu,singlePlayer} from './helpers/menu';

test('centered arcade layout and in-place mode picker work at every target resolution',async({page})=>{
  for(const [width,height] of [[1280,720],[1920,1080],[2560,1440],[3440,1440]]){
    await page.setViewportSize({width,height});await page.goto('/?seed=1337');await readyMenu(page);
    await expect(page.locator('.location-card,.profile-strip,.menu-masthead,.menu-tagline')).toHaveCount(0);
    const bounds=await page.evaluate(()=>{
      const box=(selector:string)=>{const b=document.querySelector(selector)!.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height};};
      (window as any).__BACKGROUND_REFERENCE__=(window as any).__POKEMON_SURVIVORS__.scene.getScene('menu').background;
      return{logo:box('.menu-logo'),play:box('.arcade-button--play'),dex:box('.arcade-button--pokedex'),research:box('.arcade-button--research'),settings:box('.arcade-button--settings')};
    });
    for(const item of [bounds.logo,bounds.play,bounds.settings])expect(item.x+item.width/2).toBeCloseTo(width/2,0);
    expect(bounds.play.y).toBeGreaterThan(bounds.logo.y+bounds.logo.height);expect(bounds.dex.y).toBeCloseTo(bounds.research.y,0);expect(bounds.dex.y).toBeGreaterThan(bounds.play.y+bounds.play.height);expect(bounds.dex.x+bounds.dex.width).toBeLessThan(bounds.research.x);expect(bounds.settings.y).toBeGreaterThan(bounds.dex.y+bounds.dex.height);
    await page.getByRole('button',{name:'Play',exact:true}).click();await expect(page.getByRole('button',{name:'Single Player',exact:true})).toBeFocused();
    const multiplayer=page.getByRole('button',{name:'Multiplayer — Coming soon'});await expect(multiplayer).toBeDisabled();await expect(multiplayer).toHaveAttribute('data-target-players','4');
    if(width===1280)await page.screenshot({animations:'disabled',path:'test-results/screenshots/v038-play-submenu.png'});
    const logo=await page.getByRole('img',{name:'Pokémon Survivors',exact:true}).boundingBox();expect(logo!.y).toBeCloseTo(bounds.logo.y,0);
    await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Play',exact:true})).toBeFocused();await expect(page.getByRole('button',{name:'Play',exact:true})).toHaveAttribute('aria-expanded','false');
    expect(await page.evaluate(()=>(window as any).__BACKGROUND_REFERENCE__===(window as any).__POKEMON_SURVIVORS__.scene.getScene('menu').background)).toBe(true);
    await page.getByRole('button',{name:'Play',exact:true}).click();await page.getByRole('button',{name:'Back',exact:true}).click();await expect(page.getByRole('button',{name:'Play',exact:true})).toBeFocused();
  }
});

test('Phaser-driven ambience pauses, resumes, and fully honors reduced motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/?seed=1337');await readyMenu(page);
  const snapshot=()=>page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('menu').background.snapshot());
  const first=await snapshot();await page.waitForTimeout(2200);const moving=await snapshot();expect(moving.time).toBeGreaterThan(first.time+1);expect(moving.frames).toBeGreaterThan(first.frames+10);expect(moving.smoothing).toBe(false);expect(moving.rect).not.toEqual(first.rect);expect(moving.leafCount).toBeLessThanOrEqual(moving.maxLeaves);expect(moving.active).toBe(1);
  await expect(page.locator('.menu-background-canvas')).toHaveCSS('pointer-events','none');
  await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.pause('menu'));const paused=await snapshot();await page.waitForTimeout(220);expect((await snapshot()).time).toBe(paused.time);
  await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.resume('menu'));await expect.poll(async()=>(await snapshot()).time).toBeGreaterThan(paused.time);
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('switch',{name:'Reduced motion'}).click();await page.keyboard.press('Escape');await readyMenu(page);
  const still=await snapshot();expect(still).toMatchObject({reduced:true,time:0,leafCount:0,motes:0});await page.waitForTimeout(250);expect((await snapshot()).frames).toBe(still.frames);await page.screenshot({animations:'disabled',path:'test-results/screenshots/v038-reduced-motion.png'});
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('switch',{name:'Reduced motion'}).click();await page.keyboard.press('Escape');await readyMenu(page);await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(async()=>(await snapshot()).reduced).toBe(true);
});

test('repeated frontend navigation releases backgrounds, inputs, and run overlays',async({page})=>{
  await page.goto('/?seed=1337');await readyMenu(page);
  for(let i=0;i<8;i++){
    await page.getByRole('button',{name:'Research',exact:true}).click();await page.getByRole('tab',{name:'Statistics',exact:true}).click();await expect(page.getByRole('tabpanel',{name:'Statistics'})).toContainText('No recorded run yet.');await expect(page.locator('.menu-background-canvas')).toHaveCount(0);
    const inactive=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('menu');return{backgrounds:s.background.snapshot().active,inputs:s.navigation.constructor.activeCount};});expect(inactive).toEqual({backgrounds:0,inputs:1});
    await page.keyboard.press('Escape');await readyMenu(page);
    const active=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('menu');return{backgrounds:s.background.snapshot().active,inputs:s.navigation.constructor.activeCount,canvas:document.querySelectorAll('.menu-background-canvas').length};});expect(active).toEqual({backgrounds:1,inputs:1,canvas:1});
  }
  await singlePlayer(page);await page.getByRole('button',{name:'Choose Bulbasaur'}).click();await page.getByRole('button',{name:'Enter Forest',exact:true}).click();
  await page.waitForFunction(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return s.player?.active&&s.keys?.D;});await expect(page.locator('.menu-background-canvas')).toHaveCount(0);
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.finish('defeat');});
  await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('results').returnButton?.active);
  const returnButton=await page.evaluate(()=>{const b=(window as any).__POKEMON_SURVIVORS__.scene.getScene('results').returnButton.getBounds();return{x:b.centerX,y:b.centerY};});
  const canvas=(await page.locator('#app canvas').boundingBox())!;await page.mouse.click(canvas.x+returnButton.x/1280*canvas.width,canvas.y+returnButton.y/720*canvas.height);await readyMenu(page);
  expect(await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('menu').background.snapshot().active)).toBe(1);
});

test('menu motion recording captures a full ambient cycle with real frame diagnostics',async({browser})=>{
  test.setTimeout(70_000);
  const context=await browser.newContext({viewport:{width:1280,height:720},baseURL:'http://127.0.0.1:5197',recordVideo:{dir:'test-results/menu-motion',size:{width:1280,height:720}},reducedMotion:'no-preference'}),page=await context.newPage(),video=page.video()!;
  try{
    await page.goto('/?seed=1337');await readyMenu(page);const frames=[];
    for(let i=0;i<34;i++){
      const frame=await page.evaluate(()=>{const g=(window as any).__POKEMON_SURVIVORS__,s=g.scene.getScene('menu');return{...s.background.snapshot(),fps:g.loop.actualFps};});frames.push(frame);
      expect(frame.rect.x).toBeLessThanOrEqual(0);expect(frame.rect.y).toBeLessThanOrEqual(0);expect(frame.rect.x+frame.rect.width).toBeGreaterThanOrEqual(frame.width);expect(frame.rect.y+frame.rect.height).toBeGreaterThanOrEqual(frame.height);expect(frame.leafCount).toBeLessThanOrEqual(10);await page.waitForTimeout(1000);
    }
    expect(frames[33].time-frames[0].time).toBeGreaterThan(28);expect(new Set(frames.map(frame=>`${frame.rect.x},${frame.rect.y}`)).size).toBeGreaterThan(6);writeFileSync('test-results/menu-motion/diagnostics.json',JSON.stringify(frames,null,2));
  }finally{await context.close();await video.saveAs('test-results/screenshots/v038-menu-ambience.webm');}
});
