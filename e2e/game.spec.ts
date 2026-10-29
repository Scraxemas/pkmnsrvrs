import {test,expect} from '@playwright/test';
test('menu to deterministic Viridian Forest run with visual checkpoints',async({page})=>{
  await page.goto('/?fast=1&debug=1');
  const canvas=page.locator('canvas');await expect(canvas).toBeVisible();await page.waitForTimeout(500);
  await page.screenshot({path:'test-results/screenshots/01-main-menu.png'});
  await canvas.click({position:{x:640,y:310}});await page.waitForTimeout(300);
  await page.screenshot({path:'test-results/screenshots/02-pokemon-selection.png'});
  await canvas.click({position:{x:250,y:550}});await page.waitForTimeout(300);
  await page.screenshot({path:'test-results/screenshots/03-stage-selection.png'});
  await canvas.click({position:{x:250,y:445}});await page.waitForTimeout(1000);
  await expect(canvas).toBeVisible();await page.screenshot({path:'test-results/screenshots/04-viridian-early.png'});
  await page.keyboard.down('d');await page.waitForTimeout(500);await page.keyboard.up('d');
  const state=await page.evaluate(()=>{const g=(window as any).__POKEMON_SURVIVORS__;const s=g.scene.getScene('game');return{level:s.state.level,enemies:s.state.enemies.length,hash:s.state.seed,player:s.state.player};});
  expect(state.enemies).toBeGreaterThan(0);expect(state.player.x).toBeGreaterThan(0);expect(state.player.facing).toBe('east');
  await page.screenshot({path:'test-results/screenshots/04b-east-facing.png'});
  await page.evaluate(()=>{const g=(window as any).__POKEMON_SURVIVORS__;const s=g.scene.getScene('game');s.showChoices('LEVEL UP',s.state.moveSlots.map((m:any)=>({kind:'move',id:m.id,label:`Upgrade ${m.id}`})).slice(0,1));});
  await page.waitForTimeout(200);await page.screenshot({path:'test-results/screenshots/05-level-up.png'});
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.overlay?.destroy(true);s.overlay=undefined;s.showReward(3);});
  await page.waitForTimeout(200);await page.screenshot({path:'test-results/screenshots/06-ultra-ball-reward.png'});
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.overlay?.destroy(true);s.overlay=undefined;s.showEvolution('ivysaur');});
  await page.waitForTimeout(250);await page.screenshot({path:'test-results/screenshots/07-evolution.png'});
  await page.waitForTimeout(1900);
  await page.evaluate(()=>{const g=(window as any).__POKEMON_SURVIVORS__;const s=g.scene.getScene('game');s.state.time=s.duration;s.state.bossSpawned=false;s.schedule();const b=s.state.enemies.find((e:any)=>e.boss);b.x=s.state.player.x+150;b.y=s.state.player.y;});
  await page.waitForTimeout(300);await page.screenshot({path:'test-results/screenshots/08-beedrill-boss.png'});
  await page.evaluate(()=>{const g=(window as any).__POKEMON_SURVIVORS__;g.scene.getScene('game').finish('victory');});
  await page.waitForTimeout(200);await page.screenshot({path:'test-results/screenshots/09-victory.png'});
});

test('Pokédex and Research screens render',async({page})=>{await page.goto('/');const canvas=page.locator('canvas');await expect(canvas).toBeVisible();await page.evaluate(()=>{(window as any).__POKEMON_SURVIVORS__.scene.start('dex');});await page.waitForTimeout(250);await page.screenshot({path:'test-results/screenshots/10-pokedex.png'});await page.evaluate(()=>{(window as any).__POKEMON_SURVIVORS__.scene.start('research');});await page.waitForTimeout(250);await page.screenshot({path:'test-results/screenshots/11-research.png'});});
