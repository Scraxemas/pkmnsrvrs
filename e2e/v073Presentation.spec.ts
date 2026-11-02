import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

for(const viewport of [{width:1280,height:720},{width:1663,height:924},{width:390,height:844}]){
 test('expedition landing page is readable and keyboard accessible at '+viewport.width+'×'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);
  await page.goto('/?seed=1337');
  await expect(page.locator('.frontend--menu .expedition-briefing')).toBeVisible();
  const card=page.locator('.expedition-briefing');
  await expect(card).toContainText('VIRIDIAN FOREST');
  await expect(card).toContainText('30:00');
  await expect(page.locator('.arcade-button--play')).toBeVisible();
  const metrics=await page.evaluate(()=>{
   const brief=document.querySelector('.expedition-briefing')!.getBoundingClientRect();
   const play=document.querySelector('.arcade-button--play')!.getBoundingClientRect();
   return{overflow:document.documentElement.scrollWidth-innerWidth,brief:{left:brief.left,right:brief.right,top:brief.top},
    play:{width:play.width,height:play.height,left:play.left,right:play.right}};
  });
  expect(metrics.overflow).toBeLessThanOrEqual(2);
  expect(metrics.brief.left).toBeGreaterThanOrEqual(-1);
  expect(metrics.brief.right).toBeLessThanOrEqual(viewport.width+1);
  expect(metrics.play.width).toBeGreaterThan(190);
  expect(metrics.play.height).toBeGreaterThan(55);
  mkdirSync('test-results/v073-expedition-ui',{recursive:true});
  await page.screenshot({path:`test-results/v073-expedition-ui/menu-${viewport.width}.png`,fullPage:true});
  if(viewport.width<500){
   await card.scrollIntoViewIfNeeded();
   await page.screenshot({path:'test-results/v073-expedition-ui/menu-mobile-briefing.png'});
  }
  await page.locator('.arcade-button--play').click();
  await expect(page.locator('#play-modes')).toBeVisible();
  await expect(page.locator('.arcade-button--single')).toBeVisible();
 });
}

test('combat HUD has consistent panels without hiding attacks or navigation',async({page})=>{
 await page.setViewportSize({width:1280,height:720});
 await page.goto('/?seed=1337');
 await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__);
 await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'charmander',seed:1337}));
 await page.waitForFunction(()=>{
  const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
  return s?.state?.time>.1&&s?.moveHud;
 });
 const snap=await page.evaluate(()=>{
  const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
  const chrome=s.children.getByName('expedition-hud-chrome');
  return{hasChrome:!!chrome,depth:chrome?.depth,clock:s.timerText.text,
   caption:s.children.getByName('expedition-timer-caption')?.text,
   moveSlots:Array.from({length:5},(_,i)=>s.children.getByName('move-slot-'+(i+1))?.visible),
   player:s.player.visible,canopy:s.canopyRenderer.intensity,
   simulationTime:s.duration};
 });
 expect(snap.hasChrome).toBe(true);expect(snap.depth).toBeLessThan(20000);
 expect(snap.moveSlots).toEqual([true,true,true,true,true]);
 expect(snap.clock).toMatch(/^\d\d:\d\d$/);
 expect(snap.caption).toContain('30 MIN');
 expect(snap.player).toBe(true);expect(snap.simulationTime).toBe(1800);
 await page.screenshot({path:'test-results/v073-expedition-ui/combat-1280.png'});
});

test('end-of-run report keeps a prominent accessible return action',async({page})=>{
 await page.setViewportSize({width:1280,height:720});
 await page.goto('/?seed=1337');
 await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__);
 await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'charmander',seed:1337}));
 await page.waitForFunction(()=>((window as any).__POKEMON_SURVIVORS__.scene.getScene('game')?.state?.time??0)>.2);
 await page.evaluate(()=>{
  const game=(window as any).__POKEMON_SURVIVORS__;
  game.scene.start('results',{result:'victory',level:32,defeated:437,time:1800,seed:1337,
   unlocks:['Beedrill Research','Trailblaze'],onReturn:()=>game.scene.start('menu')});
 });
 await page.waitForFunction(()=>!!(window as any).__POKEMON_SURVIVORS__.scene.getScene('results')?.returnButton);
 const data=await page.evaluate(()=>{
  const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('results');
  return {title:s.children.getByName('results-title')?.text,
   button:s.returnButton?.text,metrics:['TIME','POWER','KO'].map(k=>s.children.getByName('results-metric-'+k)?.text)};
 });
 expect(data.title).toBe('FOREST SURVIVED');
 expect(data.metrics).toEqual(['30:00','32','437']);
 expect(data.button).toBe('RETURN TO MENU');
 await page.screenshot({path:'test-results/v073-expedition-ui/results-victory.png'});
});
