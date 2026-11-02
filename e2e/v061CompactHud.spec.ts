import {test,expect,Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';

async function boot(page:Page,viewport:{width:number;height:number}){
 await page.setViewportSize(viewport);
 await page.goto('/?seed=1337');
 await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__);
 await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'charmander',seed:1337}));
 await page.waitForFunction(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return s.moveHud&&s.timerText&&s.state.time>0;});
 await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.nextSpawn=Infinity;s.miniIndex=99;s.state.enemies=[];});
}
for(const viewport of [{width:1280,height:720},{width:1920,height:1080},{width:390,height:844}]){
 test('compact game HUD stays within logical bounds at '+viewport.width+'x'+viewport.height,async({page})=>{
  await boot(page,viewport);
  const snapshot=await page.evaluate(()=>{
   const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),l=s.hpLayout;
   const moves=[1,2,3,4,5].map(i=>s.children.getByName('move-slot-'+i));
   const items=[1,2,3,4].map(i=>s.children.getByName('held-item-slot-'+i));
   return{
    xp:l.experience,clock:s.timerText.text,center:s.timerText.x,width:s.scale.width,
    portrait:s.portrait.displayWidth,summary:s.hud.text,objective:s.objectiveHud.text,
    moves:moves.map((v:any)=>({x:v.x,y:v.y,status:v.getData('status')})),
    items:items.map((v:any)=>({x:v.x,y:v.y})),
    research:s.researchHud.text,
   };
  });
  expect(snapshot.xp.height).toBe(10);
  expect(snapshot.clock).toMatch(/^\d\d:\d\d$/);
  expect(snapshot.center).toBe(snapshot.width/2);
  expect(snapshot.portrait).toBe(48);
  expect(snapshot.summary).toContain('LV ');
  expect(snapshot.summary).not.toContain('EXP');
  expect(snapshot.moves).toHaveLength(5);
  expect(snapshot.items).toHaveLength(4);
  expect(snapshot.moves[0].status).toBe('filled');
  expect(snapshot.moves[4].status).toBe('locked');
  expect(snapshot.items[0].y).toBeGreaterThan(snapshot.moves[0].y+46);
  expect(snapshot.moves.every((m:any)=>m.x>=0&&m.x+46<=snapshot.width)).toBe(true);
  expect(snapshot.items.every((m:any)=>m.x>=0&&m.x+40<=snapshot.width)).toBe(true);
  mkdirSync('test-results/compact-hud',{recursive:true});
  await page.screenshot({path:'test-results/compact-hud/desktop-'+viewport.width+'.png'});
  if(viewport.width<=700){
   const mobile=page.locator('.mobile-combat-hud');
   await expect(mobile.locator('summary')).toBeVisible();
   await expect(mobile.locator('summary')).toHaveCSS('min-height','44px');
   await mobile.locator('summary').click();
   await expect(mobile.locator('.mobile-combat-hud__panel')).toContainText('MOVE 1');
   await expect(mobile.locator('.mobile-combat-hud__panel')).toContainText('ITEM 4');
   await page.screenshot({path:'test-results/compact-hud/mobile-build-details.png'});
  }
 });
}
test('numeric keyboard inspection opens details and Escape dismisses them',async({page})=>{
 await boot(page,{width:1280,height:720});
 await page.evaluate(()=>document.querySelector('canvas')?.focus());
 await page.keyboard.press('1');
 expect(await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').moveHud['tooltip'].visible)).toBe(true);
 await page.keyboard.press('Escape');
 expect(await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').moveHud['tooltip'].visible)).toBe(false);
 await page.keyboard.press('6');
 expect(await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').itemHud['tooltip'].visible)).toBe(true);
});
test('Beedrill uses centered boss bar instead of permanent forest objective',async({page})=>{
 await boot(page,{width:1280,height:720});
 const result=await page.evaluate(async()=>{
  const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
  const {beginBossEncounter}=await import('/src/simulation.ts');
  beginBossEncounter(s.state);s.renderHealthBars();s.renderMoveHud();
  return{boss:s.bossText.text,visible:s.bossText.visible,objectiveVisible:s.objectiveHud.visible,bar:s.hpLayout.boss};
 });
 expect(result.visible).toBe(true);
 expect(result.boss).toContain('BEEDRILL');
 expect(result.objectiveVisible).toBe(false);
 expect(result.bar.x+result.bar.width/2).toBe(640);
});
