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

test('grounding, terrain transitions, pond boundary, and responsive HP HUD',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await page.goto('/?fast=1');const canvas=page.locator('canvas');await expect(canvas).toBeVisible();
  await page.evaluate(()=>{(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'bulbasaur',fast:true});});await page.waitForTimeout(700);
  await page.screenshot({path:'test-results/screenshots/12-grounding-idle-1280.png'});
  await page.keyboard.down('d');await page.waitForTimeout(220);await page.screenshot({path:'test-results/screenshots/13-grounding-walk-east-1280.png'});await page.keyboard.up('d');
  const metrics=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{bar:s.hpLayout.player,originY:s.player.originY,spriteY:s.player.y,groundY:s.state.player.y,shadowY:s.playerShadow.y};});
  expect(metrics.bar.width/1280).toBeGreaterThan(.93);expect(metrics.originY).toBeCloseTo(.65,2);expect(Math.abs(metrics.spriteY-metrics.groundY)).toBeLessThan(1);expect(metrics.shadowY-metrics.groundY).toBeCloseTo(2,1);
  await page.screenshot({path:'test-results/screenshots/14-terrain-intersection-1280.png'});
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.hp=s.state.maxHp*.18;});await page.waitForTimeout(100);
  await page.screenshot({path:'test-results/screenshots/15-critical-hp-1280.png'});
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.cameras.main.stopFollow();s.cameras.main.centerOn(1750,1080);});await page.waitForTimeout(150);
  await page.screenshot({path:'test-results/screenshots/16-pond-boundary-1280.png'});
  await page.setViewportSize({width:2560,height:1440});await page.waitForTimeout(250);
  const canvasBox=await canvas.boundingBox();expect(canvasBox?.width).toBeGreaterThan(2500);
  await page.screenshot({path:'test-results/screenshots/17-hud-2560x1440.png'});
});
