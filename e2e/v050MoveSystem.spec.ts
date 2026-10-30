import {test,expect,Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

const folder='docs/qa/v050',workFolder=process.env.V050_QA_WORKDIR??'test-results',frameFolder=join(workFolder,'v050-animation-frames');
const viewports=[{width:1280,height:720},{width:1920,height:1080}];
const fusions=['petalBlizzard','solarBeam','sludgeWave','ingrain'];
const signatures=[['charmander','scratch'],['charmeleon','metalClaw'],['charizard','dragonClaw'],['bulbasaur','vineWhip'],['ivysaur','powerWhip'],['venusaur','powerWhip']] as const;
const footageForms=[...signatures,['squirtle','tackle'],['wartortle','waterGun'],['blastoise','hydroPump']] as const;
const facings=['south','southeast','east','northeast','north','northwest','west','southwest'];

async function boot(page:Page,viewport=viewports[0],species='bulbasaur'){
 mkdirSync(folder,{recursive:true});await page.setViewportSize(viewport);await page.goto('/?seed=5050');
 await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__);
 await page.evaluate(species=>(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:species,seed:5050}),species);
 await page.waitForFunction(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return s.devMoves?.build&&s.moveVfx&&s.state.time>0;});
 await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.nextSpawn=Infinity;s.miniIndex=99;s.state.bossSpawned=true;s.state.enemies=[];s.preferences.damageNumbers=false;});
}
async function enemies(page:Page,count=6,distance=80,spread=false){
 await page.evaluate(async({count,distance,spread})=>{
  const path='/src/simulation.ts',sim=await import(path),s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.enemies=[];sim.spawnSpecies(s.state,'caterpie',count);
  s.state.enemies.forEach((enemy:any,index:number)=>{const angle=spread?index*Math.PI*(3-Math.sqrt(5)):index/count*Math.PI*2,radius=spread?Math.sqrt((index+.5)/count):1;Object.assign(enemy,{x:s.state.player.x+Math.cos(angle)*radius*(spread?360:distance),y:s.state.player.y+Math.sin(angle)*radius*(spread?250:distance),hp:100000,maxHp:100000,speed:0,baseSpeed:0});});
 },{count,distance,spread});
}
async function waitCards(page:Page){await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('upgrade').cards?.length>0);await page.waitForTimeout(350);}
async function arm(page:Page,species:string,move:string,facing='east'){
 const actionKind=await page.evaluate(async({species,move,facing})=>{
  const simPath='/src/simulation.ts',directionPath='/src/direction.ts',contentPath='/src/content.ts',sim=await import(simPath),directions=await import(directionPath),content=await import(contentPath),s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
  s.devMoves.build(species,[move],1);s.moveVfx.update(s.state.time+10);s.playerAnimation.state='idle';s.playerAnimation.lockUntil=0;s.state.player.facing=facing;s.state.enemies=[];
  sim.spawnSpecies(s.state,'caterpie');const vector=directions.facingVector(facing);Object.assign(s.state.enemies[0],{x:s.state.player.x+vector.x*52,y:s.state.player.y+vector.y*52,hp:100000,maxHp:100000,speed:0,baseSpeed:0});
  s.state.moveSlots[0].nextAttackAt=s.state.time+.06;
  return content.MOVES[move].damageClass==='Special'?'special':'physical';
 },{species,move,facing});
 await page.waitForFunction(({species,facing,actionKind})=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return s.player.texture.key===`pokemon-action:${species}:${actionKind}`&&s.player.anims.currentAnim?.key===`pokemon-action:${species}:${actionKind}:${facing}`;},{species,facing,actionKind});
}

test('Charmeleon never receives obsolete Scratch in cards, rewards, or a stale acceptance',async({page})=>{
 await boot(page,viewports[0],'charmander');
 const result=await page.evaluate(async()=>{
  const path='/src/simulation.ts',sim=await import(path),s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),slot=s.state.moveSlots[0];slot.rank=4;slot.nextAttackAt=123;
  sim.evolveTo(s.state,'charmeleon');s.showEvolution('charmeleon');s.state.level=17;s.renderMoveHud();
  const stale={kind:'move',id:'scratch',label:'Old Scratch card'},accepted=sim.applyUpgrade(s.state,stale),drafts=[];
  for(let seed=1;seed<=50;seed++){s.state.seed=seed;drafts.push(...sim.upgradeOptions(s.state,100),...sim.rewardRoll(s.state,3));}
  const cards=[{kind:'move',id:'metalClaw',label:'Metal Claw'},{kind:'move',id:'ember',label:'Ember'},{kind:'move',id:'tackle',label:'Tackle'}];s.showChoices('LEVEL 17 — MOVE LINEAGE',cards);
  return{accepted,moveId:slot.id,rank:slot.rank,nextAttackAt:slot.nextAttackAt,obsolete: drafts.filter((choice:any)=>choice.id==='scratch').length,hud:s.children.getByName('move-slot-1').getByName('move-art').texture.key};
 });
 expect(result).toEqual({accepted:false,moveId:'metalClaw',rank:4,nextAttackAt:123,obsolete:0,hud:'move:metalClaw'});
 await waitCards(page);await page.screenshot({path:`${folder}/scratch-regression.png`});
 const names=await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('upgrade').cards.map((card:any)=>card.getByName('card-name').text));
 expect(names).toEqual(['METAL CLAW','EMBER','TACKLE']);
});

test('two early TM research discoveries persist across fresh runs while form and advanced-TM gates remain independent',async({page})=>{
 await boot(page);
 const before=await page.evaluate(async()=>{const path='/src/moveEligibility.ts',eligibility=await import(path),s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{starter:s.state.moveSlots[0].id,bullet:eligibility.canLearnMove(s.state,'bulletSeed'),acid:eligibility.canLearnMove(s.state,'acidSpray')};});
 expect(before).toEqual({starter:'vineWhip',bullet:false,acid:false});
 await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.sessionDefeats={caterpie:25,weedle:25};s.syncTmResearch();});
 await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').children.getByName('tm-discovery-notice'));
 await page.screenshot({path:`${folder}/tm-discovery.png`});
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-survivors-save')!));expect(saved.discoveredTms.sort()).toEqual(['sv:013','sv:056']);
 await boot(page);
 const after=await page.evaluate(async()=>{const path='/src/moveEligibility.ts',eligibility=await import(path),s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{tms:s.state.discoveredTms.sort(),bullet:eligibility.canLearnMove(s.state,'bulletSeed'),acid:eligibility.canLearnMove(s.state,'acidSpray'),frenzy:eligibility.canLearnMove(s.state,'frenzyPlant'),earthquake:eligibility.canLearnMove(s.state,'earthquake')};});
 expect(after).toEqual({tms:['sv:013','sv:056'],bullet:true,acid:true,frenzy:false,earthquake:false});
});

test('accepting an obsolete on-screen Scratch choice regenerates the draft without consuming move credit',async({page})=>{
 await boot(page,viewports[0],'charmander');
 await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.moveSlots[0].rank=4;s.state.moveUpgradeCredits=1;s.showChoices('STALE CARD CHECK',[{kind:'move',id:'scratch',label:'Scratch'}]);});await waitCards(page);
 await page.evaluate(async()=>{const path='/src/simulation.ts',sim=await import(path),s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');sim.evolveTo(s.state,'charmeleon');s.renderMoveHud();});
 const choiceId=await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').activeChoice.request.id);
 await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('upgrade').choose(0));
 await page.waitForFunction(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return s.activeChoice?.options.every((choice:any)=>choice.id!=='scratch');});
 const state=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{moves:s.state.moveSlots.map((slot:any)=>({id:slot.id,rank:slot.rank})),credits:s.state.moveUpgradeCredits,request:s.activeChoice.request.id,paused:s.scene.isPaused('game')};});
 expect(state).toEqual({moves:[{id:'metalClaw',rank:4}],credits:1,request:choiceId,paused:true});
});

test('an exhausted queued move-credit draft stays banked and continues the next ordinary choice',async({page})=>{
 await boot(page,viewports[0],'charmeleon');
 await page.evaluate(()=>{
  const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.cancelChoices();s.devMoves.build('charmeleon',['metalClaw','ember','dragonRage','tackle'],5);s.state.moveUpgradeCredits=1;s.state.hp=10;
  s.pendingChoices=[{id:++s.choiceSerial,title:'BANKED MOVE CREDIT',kind:'credit'},{id:++s.choiceSerial,title:'ORDINARY RECOVERY',kind:'fixed',options:[{kind:'heal',id:'heal',label:'Recovery'}]}];s.showNextChoice();
 });await waitCards(page);
 const queued=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{kind:s.activeChoice.request.kind,choices:s.activeChoice.options.map((choice:any)=>choice.kind),credits:s.state.moveUpgradeCredits};});
 expect(queued).toEqual({kind:'fixed',choices:['heal'],credits:1});
 await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('upgrade').choose(0));
 await page.waitForFunction(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return !s.overlay&&!s.activeChoice;});
 const after=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{credits:s.state.moveUpgradeCredits,paused:s.scene.isPaused('game'),moves:s.state.moveSlots.map((slot:any)=>slot.id),hp:s.state.hp};});
 expect(after).toMatchObject({credits:1,paused:false,moves:['metalClaw','ember','dragonRage','tackle']});expect(after.hp).toBeGreaterThan(10);
});

for(const viewport of viewports){
 for(const result of fusions){
  test(`${result} fusion card consumes two rank-five ingredients, frees a slot, and displays its own effects at ${viewport.width}`,async({page})=>{
   const failures:string[]=[];page.on('pageerror',error=>failures.push(error.message));await boot(page,viewport);
   const before=await page.evaluate(result=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.devMoves.build('venusaur',['powerWhip'],1);const choice=s.devMoves.prepareFusion(result);s.cancelChoices();s.showChoices('MOVE FUSION',[choice,{kind:'item',id:'miracleSeed',label:'Miracle Seed'},{kind:'heal',id:'heal',label:'Recovery'}]);return s.state.moveSlots.map((slot:any)=>({id:slot.id,rank:slot.rank}));},result);
   expect(before).toHaveLength(2);await waitCards(page);
   const layout=await page.evaluate(()=>{const u=(window as any).__POKEMON_SURVIVORS__.scene.getScene('upgrade'),card=u.cards[0],art=card.getByName('move-art'),ingredients=card.list.filter((child:any)=>child.name==='ingredient-art');return{transition:card.getData('transition'),ingredients:ingredients.map((image:any)=>image.getData('assetId')),key:art?.texture.key,action:card.getByName('card-action').text,rank:card.getByName('card-rank').text,benefit:card.getByName('card-benefit').text,inside:card.list.filter((child:any)=>child.type==='Text').every((text:any)=>{const bounds=text.getBounds();return bounds.left>=card.x-140&&bounds.right<=card.x+140&&bounds.bottom<=card.y+197;}),artAboveTitle:art?.getBounds().bottom<card.getByName('card-name').getBounds().top};});
   expect(layout).toMatchObject({transition:'fusion',ingredients:before.map((slot:any)=>slot.id),key:`move:${result}`,action:'MOVE FUSION',rank:'RANK 5 PRESERVED',inside:true,artAboveTitle:true});expect(layout.benefit).toContain('Consumes 2 moves · Creates 1 · Frees 1 slot');
   await page.screenshot({path:`${folder}/fusion-${result}-card-${viewport.width}.png`});
   await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('upgrade').choose(0));
   await page.waitForFunction(result=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return !s.overlay&&s.state.moveSlots.some((slot:any)=>slot.id===result);},result);
   const after=await page.evaluate(async({result,ingredients})=>{const path='/src/simulation.ts',sim=await import(path),s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{slots:s.state.moveSlots.map((slot:any)=>({id:slot.id,rank:slot.rank})),history:s.state.fusionHistory,hud:s.children.getByName('move-slot-1').getByName('move-art').texture.key,empty:s.children.getByName('move-slot-2').getData('status'),repeat:sim.applyUpgrade(s.state,{kind:'moveFusion',id:result,label:'stale'}),inputOffers:sim.upgradeOptions(s.state,100).filter((offer:any)=>ingredients.includes(offer.id)).length};},{result,ingredients:before.map((slot:any)=>slot.id)});
   expect(after).toEqual({slots:[{id:result,rank:5}],history:[result],hud:`move:${result}`,empty:'empty',repeat:false,inputOffers:0});
   await enemies(page,8,result==='solarBeam'?250:110);
   await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.hp=s.state.maxHp*.55;s.state.moveSlots[0].nextAttackAt=s.state.time+.04;});
   await page.waitForFunction(result=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').worldLayer.list.some((child:any)=>child.name==='move-vfx'&&child.active&&child.getData('moveId')===result),result);
   if(result==='solarBeam'){await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').scene.manager.pause('game'));await page.screenshot({path:`${folder}/fusion-${result}-charge-${viewport.width}.png`});await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').scene.manager.resume('game'));}
   const effectKey={petalBlizzard:'vfx:petal',solarBeam:'vfx:beam',sludgeWave:'vfx:toxicWave',ingrain:'vfx:root'}[result];
   await page.waitForFunction(({result,effectKey})=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').worldLayer.list.some((child:any)=>child.name==='move-vfx'&&child.active&&child.getData('moveId')===result&&child.texture.key===effectKey&&Number(child.frame.name)===2),{result,effectKey});
   await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').scene.manager.pause('game'));await page.screenshot({path:`${folder}/fusion-${result}-effect-${viewport.width}.png`});
   const final=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{vfx:s.moveVfx.diagnostics,rank:s.state.moveSlots[0].rank};});expect(final.vfx.created).toBeLessThanOrEqual(192);expect(final.rank).toBe(5);expect(failures).toEqual([]);
  });
 }
 test(`evolution cards, healing, poison, ground effects and dense multi-move combat fit ${viewport.width}×${viewport.height}`,async({page})=>{
  await boot(page,viewport);
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.devMoves.unlockAllTms();s.devMoves.build('venusaur',['powerWhip','venoshock','synthesis','earthPower','poisonPowder']);s.state.hp=s.state.maxHp*.6;s.showChoices('MOVE EVOLUTION',[{kind:'moveEvolution',id:'sludgeBomb',label:'Sludge Bomb'},{kind:'item',id:'miracleSeed',label:'Miracle Seed'},{kind:'heal',id:'heal',label:'Recovery'}]);});
  await waitCards(page);const transition=await page.evaluate(()=>{const card=(window as any).__POKEMON_SURVIVORS__.scene.getScene('upgrade').cards[0];return{type:card.getData('transition'),name:card.getByName('card-action').text,result:card.getByName('move-art')?.texture.key,from:card.getByName('ingredient-art')?.texture.key};});
  expect(transition).toEqual({type:'evolution',name:'MOVE EVOLUTION',result:'move:sludgeBomb',from:'move:venoshock'});await page.screenshot({path:`${folder}/move-item-cards-${viewport.width}.png`});
  await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').cancelChoices());
  await enemies(page,300,120,true);
  const health=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.moveSlots.forEach((slot:any)=>slot.nextAttackAt=s.state.time+.05);return s.state.hp;});
  await page.waitForFunction(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return s.moveVfx.diagnostics.emitted>=5;});await page.waitForTimeout(180);
  const combat=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{hp:s.state.hp,enemies:s.state.enemies.length,poisoned:s.state.enemies.filter((enemy:any)=>enemy.statuses.some((status:any)=>status.kind==='poison')).length,vfx:s.moveVfx.diagnostics,effects:[...new Set(s.worldLayer.list.filter((child:any)=>child.name==='move-vfx'&&child.active).map((child:any)=>child.getData('moveId')))]};});
  expect(combat.hp).toBeGreaterThan(health);expect(combat.enemies).toBe(300);expect(combat.poisoned).toBeGreaterThan(0);expect(combat.vfx.created).toBeLessThanOrEqual(192);expect(combat.effects).toEqual(expect.arrayContaining(['powerWhip','synthesis','earthPower','poisonPowder']));
  await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').scene.manager.pause('game'));await page.screenshot({path:`${folder}/combat-multiple-effects-${viewport.width}.png`});writeFileSync(`${folder}/combat-audit-${viewport.width}.json`,JSON.stringify({viewport,...combat},null,2));
 });
}

test('six signature forms play genuine native action frames with move VFX in all eight directions',async({page})=>{
 test.setTimeout(180_000);await boot(page);const audits:any[]=[];
 await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.player.on('animationupdate',(animation:any,frame:any)=>{const log=(window as any).__V050_NATIVE_FRAMES__;if(log)log.push({key:animation.key,frame:Number(frame.textureFrame)});});});
 for(const [species,move] of signatures){
  for(const facing of facings){
   await page.evaluate(()=>(window as any).__V050_NATIVE_FRAMES__=[]);
   await arm(page,species,move,facing);
   const before=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.moveSlots[0].nextAttackAt=Infinity;return{frame:Number(s.player.frame.name),key:s.player.texture.key,animation:s.player.anims.currentAnim.key,starts:s.player.getData('nativeActionStarts'),filter:s.player.texture.source[0].scaleMode};});
   const samples=[before.frame];const count=facing==='east'?12:4;
   for(let frame=0;frame<count;frame++){
    mkdirSync(`${frameFolder}/${species}/${facing}`,{recursive:true});
    await page.screenshot({path:`${frameFolder}/${species}/${facing}/${String(frame).padStart(2,'0')}.png`,clip:{x:430,y:205,width:420,height:320}});
    await page.waitForTimeout(45);
    samples.push(await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return s.player.getData('nativeAction')?Number(s.player.frame.name):-1;}));
   }
   const metadata=await page.evaluate(async species=>{const path='/src/data/nativeActions.ts',data=await import(path);return data.NATIVE_ACTIONS[species].physical;},species);
   const observed=await page.evaluate(({species,facing})=>(window as any).__V050_NATIVE_FRAMES__.filter((entry:any)=>entry.key===`pokemon-action:${species}:physical:${facing}`).map((entry:any)=>entry.frame),{species,facing});
   const frames=[before.frame,...observed];expect(new Set(frames).size,`${species}/${facing}: ${frames.join(',')}`).toBeGreaterThan(1);expect(metadata.native).toBe(true);expect(metadata.directions).toBe(8);expect(before.key).toBe(`pokemon-action:${species}:physical`);expect(before.animation).toBe(`pokemon-action:${species}:physical:${facing}`);expect(before.filter).toBe(0);
   for(const frame of frames)expect(Math.floor(frame/metadata.frames)).toBe(facings.indexOf(facing));
   audits.push({species,move,facing,...before,samples,observedNativeFrames:frames,native:true,framesPerDirection:metadata.frames,durationSeconds:metadata.durationSeconds});
  }
 }
 writeFileSync(`${folder}/animation-audit.json`,JSON.stringify(audits,null,2));
});

test.describe('recorded native attack playback',()=>{
 test('records all nine starter forms using their genuine action sprites and matching effects',async({browser},testInfo)=>{
  test.setTimeout(90_000);const context=await browser.newContext({baseURL:String(testInfo.project.use.baseURL),viewport:{width:1280,height:720},recordVideo:{dir:join(workFolder,'v050-video'),size:{width:1280,height:720}}}),page=await context.newPage(),video=page.video(),recordStart=Date.now(),timeline=[];
  try{await boot(page);for(const [species,move] of footageForms){await arm(page,species,move,'east');timeline.push({species,move,startSeconds:(Date.now()-recordStart)/1000});await page.waitForTimeout(1300);}}
  finally{await context.close();}
  expect(video).not.toBeNull();await video!.saveAs(`${folder}/signature-attacks.webm`);writeFileSync(`${folder}/footage-timeline.json`,JSON.stringify(timeline,null,2));
 });
});

test('attack priority permits movement, returns to walking and bounds pooled VFX with reduced motion',async({page})=>{
 await boot(page);await arm(page,'charmander','scratch');
 const start=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.moveSlots[0].nextAttackAt=Infinity;s.state.enemies[0].x=s.state.player.x+300;return{x:s.state.player.x,starts:s.player.getData('nativeActionStarts')};});
 await page.keyboard.down('d');await page.waitForTimeout(90);
 const during=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{x:s.state.player.x,state:s.playerAnimation.state,starts:s.player.getData('nativeActionStarts'),restart:s.playerAnimation.attack(s.state.time,'special','north',.5)};});
 await page.keyboard.up('d');expect(during.x).toBeGreaterThan(start.x);expect(during.starts).toBe(start.starts);expect(during.restart).toBe(false);
 await page.waitForTimeout(600);expect(await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').player.getData('nativeAction'))).toBeNull();
 const pool=await page.evaluate(async()=>{
  const path='/src/simulation.ts',sim=await import(path),s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),event={id:999,moveId:'petalBlizzard',kind:'spin',type:'Grass',x:s.state.player.x,y:s.state.player.y,tx:s.state.player.x+50,ty:s.state.player.y,radius:200,hits:[],damage:0};
  s.moveVfx.update(s.state.time+10);const hash=sim.stateHash(s.state);for(let index=0;index<500;index++)s.moveVfx.emit(event,s.state.time,false);const dense=s.moveVfx.diagnostics;
  s.moveVfx.update(s.state.time+10);const cleaned=s.moveVfx.diagnostics;s.moveVfx.emit(event,s.state.time,false);const normal=s.moveVfx.diagnostics.active;s.moveVfx.update(s.state.time+10);
  s.preferences.reducedMotion=true;s.renderAttack(event);const reduced=s.moveVfx.diagnostics.active;s.moveVfx.update(s.state.time+10);const culledBefore=s.moveVfx.diagnostics.culled;s.moveVfx.emit({...event,x:-10000,y:-10000,tx:-10000,ty:-10000},s.state.time,false);
  return{dense,cleaned,normal,reduced,culled:s.moveVfx.diagnostics.culled-culledBefore,unchanged:sim.stateHash(s.state)===hash,objects:s.worldLayer.list.filter((child:any)=>child.name==='move-vfx').length};
 });
 expect(pool.dense.created).toBeLessThanOrEqual(192);expect(pool.dense.active).toBeLessThanOrEqual(192);expect(pool.cleaned.active).toBe(0);expect(pool.cleaned.pooled).toBe(pool.cleaned.created);expect(pool.reduced).toBeLessThan(pool.normal);expect(pool.reduced).toBeLessThanOrEqual(3);expect(pool.culled).toBe(1);expect(pool.unchanged).toBe(true);expect(pool.objects).toBe(pool.dense.created);
 writeFileSync(`${folder}/vfx-pool-audit.json`,JSON.stringify(pool,null,2));
});
