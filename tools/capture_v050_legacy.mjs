// Record the v0.4.3 renderer faithfully. Temporary sibling sources are removed in finally.
import {chromium} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),base=process.argv[2]??'http://127.0.0.1:5198';
const workFolder=process.env.V050_QA_WORKDIR??join(root,'test-results');
const revision='50739567cb7196ff1e4eefa40bfc05562274f6d2';
const sourcePath=join(root,'src/.v050LegacyMain.ts'),htmlPath=join(root,'.v050-legacy.html');
if(existsSync(sourcePath)||existsSync(htmlPath))throw new Error('Temporary legacy capture paths already exist');
let browser;
try{
 writeFileSync(sourcePath,execFileSync('git',['show',`${revision}:src/main.ts`],{cwd:root}));
 writeFileSync(htmlPath,readFileSync(join(root,'index.html'),'utf8').replace('/src/main.ts','/src/.v050LegacyMain.ts'));
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:720}});
 await page.goto(`${base}/.v050-legacy.html?seed=5050`);await page.waitForFunction(()=>window.__POKEMON_SURVIVORS__);
 const audits=[];
 for(const [species,move] of [['charmander','scratch'],['bulbasaur','vineWhip'],['squirtle','tackle']]){
  await page.evaluate(species=>window.__POKEMON_SURVIVORS__.scene.start('game',{pokemon:species,seed:5050}),species);
  await page.waitForFunction(species=>{const s=window.__POKEMON_SURVIVORS__.scene.getScene('game');return s.state?.pokemonId===species&&s.state.time>0;},species);
  await page.evaluate(async({move})=>{
   const path='/src/simulation.ts',sim=await import(path),s=window.__POKEMON_SURVIVORS__.scene.getScene('game');s.nextSpawn=Infinity;s.miniIndex=99;s.state.bossSpawned=true;s.state.enemies=[];s.preferences.damageNumbers=false;s.state.player.facing='east';
   sim.spawnSpecies(s.state,'caterpie');Object.assign(s.state.enemies[0],{x:s.state.player.x+52,y:s.state.player.y,hp:100000,maxHp:100000,speed:0,baseSpeed:0});s.state.moveSlots=[{id:move,rank:1,starter:true,nextAttackAt:s.state.time+.06}];
  },{move});
  await page.waitForFunction(()=>window.__POKEMON_SURVIVORS__.scene.getScene('game').playerAnimation.state==='attack');
  await page.evaluate(()=>window.__POKEMON_SURVIVORS__.scene.getScene('game').scene.manager.pause('game'));
  mkdirSync(join(root,'docs/qa/v050'),{recursive:true});const dir=species==='charmander'?'legacy-scratch':`legacy-${species}`;mkdirSync(join(workFolder,'v050-animation-frames',dir),{recursive:true});
  await page.screenshot({path:join(root,`docs/qa/v050/${species==='charmander'?'scratch':species}-before.png`)});
  await page.evaluate(()=>window.__POKEMON_SURVIVORS__.scene.getScene('game').scene.manager.resume('game'));
  const frames=[];
  for(let index=0;index<12;index++){
   await page.screenshot({path:join(workFolder,'v050-animation-frames',dir,`${String(index).padStart(2,'0')}.png`),clip:{x:430,y:205,width:420,height:320}});
   frames.push(await page.evaluate(()=>{const s=window.__POKEMON_SURVIVORS__.scene.getScene('game');return{time:s.state.time,texture:s.player.texture.key,frame:Number(s.player.frame.name),state:s.playerAnimation.state};}));await page.waitForTimeout(30);
  }
  if(frames.some(frame=>frame.texture!==`${species}-sprite`))throw new Error('Legacy capture unexpectedly used a new native texture');
  audits.push({species,move,nativeAttackFrames:false,frames});
 }
 writeFileSync(join(root,'docs/qa/v050/legacy-animation-audit.json'),JSON.stringify({revision,method:'Unmodified v0.4.3 main.ts served as a temporary sibling module with its legacy Graphics renderer and reduced walk sprites. Current deterministic simulation supplies matching attack activations for comparison.',familyAudits:audits},null,2));
 process.stdout.write(`Captured ${audits.length} starter-family legacy renderer baselines.\n`);
}finally{
 if(browser)await browser.close();if(existsSync(sourcePath))unlinkSync(sourcePath);if(existsSync(htmlPath))unlinkSync(htmlPath);
}
