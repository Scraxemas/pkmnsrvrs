import {test,expect,Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {POKESPRITE_ASSETS} from '../src/data/pokespriteAssets';

const folder='test-results/v040-visual';
async function boot(page:Page){
  await page.setViewportSize({width:1280,height:720});await page.goto('/?seed=1337');await expect(page.locator('#app canvas')).toBeVisible();
  await page.evaluate(()=>{(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'bulbasaur',seed:1337});});
  await page.waitForFunction(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return s.player&&s.pickupRenderer;});
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.cancelChoices();s.state.enemies=[];s.state.projectiles=[];s.state.moveSlots=[];s.state.pickups=[];s.nextSpawn=Infinity;s.miniIndex=99;s.state.bossSpawned=true;});
  mkdirSync(folder,{recursive:true});
}
async function cards(page:Page,ids:string[],name:string){
  await page.evaluate(ids=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.cancelChoices();s.showChoices('CHOOSE YOUR POWER',ids.map(id=>({kind:id.startsWith('vitamin:')?'vitamin':'item',id:id.replace('vitamin:',''),label:id})));},ids);
  await page.waitForTimeout(450);await page.screenshot({path:`${folder}/${name}.png`});
  return page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('upgrade');return s.cards.map((c:any)=>({art:c.getByName('item-art')?.texture.key,text:c.list.filter((child:any)=>child.type==='Text').map((t:any)=>t.text).join('\n'),bottom:Math.max(...c.list.filter((child:any)=>child.type==='Text').map((t:any)=>t.getBounds().bottom))}));});
}

test('baseline, Magnet ranks, interpolation, pause and exact collection use actual candy textures',async({page})=>{
  await boot(page);
  for(const rank of [0,1,5]){
    const result=await page.evaluate(async rank=>{
      const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.cancelChoices();s.state.level=50;s.state.nextXp=762;s.state.xp=0;s.state.items=rank?[{id:'magnet',rank}]:[];s.state.pickups=[];
      const radius=64+rank*45,p={id:++s.state.eventId,x:s.state.player.x+radius-3,y:s.state.player.y,value:5,kind:'xp'};s.state.pickups=[p,{id:++s.state.eventId,x:s.state.player.x+radius+30,y:s.state.player.y,value:5,kind:'xp'},{id:++s.state.eventId,x:s.state.player.x+80,y:s.state.player.y+55,value:1,kind:'ball',tier:2}];
      const x=p.x;s.step();s.syncViews(.5);return{id:p.id,initial:x,current:p.x,render:s.pickupViews.get(p.id).x,texture:s.pickupViews.get(p.id).texture.key,total:s.state.totalExp};
    },rank);
    expect(result.texture).toBe('pokesprite:candy:xs:outline');expect(result.initial-result.current).toBeGreaterThan(0);expect(result.initial-result.current).toBeLessThan(3);expect(result.render).toBeGreaterThan(result.current);expect(result.render).toBeLessThan(result.initial);
    await page.screenshot({path:`${folder}/attraction-rank-${rank}.png`});
    await page.waitForFunction(id=>!(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').state.pickups.some((p:any)=>p.id===id),result.id);
    expect(await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{s:s.state.totalExp,n:s.pickupViews.size,ball:s.state.pickups.some((p:any)=>p.kind==='ball'),outside:s.state.pickups.some((p:any)=>p.kind==='xp'&&!p.attracted)};})).toMatchObject({s:result.total+5,ball:true,outside:true});
  }
  const frozen=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.pickups=[{id:++s.state.eventId,x:s.state.player.x+100,y:s.state.player.y,kind:'xp',value:12}];s.showChoices('PAUSED PICKUP CHECK',[{kind:'vitamin',id:'protein',label:'Protein'}]);return{time:s.state.time,x:s.state.pickups[0].x};});
  await page.waitForTimeout(350);expect(await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{time:s.state.time,x:s.state.pickups[0].x};})).toEqual(frozen);
  await page.keyboard.press('1');await page.waitForFunction(()=>!(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').overlay);await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').state.pickups.length===0);
});

test('all five candy tiers, balls and healing drops render as distinct pixel sprites',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),home=s.state.player;s.state.pickups=[5,12,30,70,160].map((value,i)=>({id:++s.state.eventId,x:home.x-160+i*80,y:home.y-110,kind:'xp',value}));for(let tier=1;tier<=3;tier++)s.state.pickups.push({id:++s.state.eventId,x:home.x-100+(tier-1)*100,y:home.y+100,kind:'ball',value:1,tier});for(const [i,consumableId] of ['potion','sitrusBerry','rareCandy'].entries())s.state.pickups.push({id:++s.state.eventId,x:home.x-100+i*100,y:home.y+165,kind:'consumable',value:1,consumableId});});
  await page.waitForTimeout(200);const textures=await page.evaluate(()=>[...(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').pickupViews.values()].map((v:any)=>({type:v.type,key:v.texture.key,scale:v.scaleX,kind:v.getData('assetId')})));
  expect(textures).toHaveLength(11);expect(textures.every(v=>v.type==='Image'&&v.scale===(v.kind.startsWith('consumable:')?1.25:2))).toBe(true);for(const tier of ['xs','s','m','l','xl'])expect(textures.some(v=>v.key===`pokesprite:candy:${tier}:outline`)).toBe(true);
  await page.screenshot({path:`folder/all-pickups.png`.replace('folder',folder)});
});

test('item cards use real artwork and honest values; the four HUD ranks update immediately',async({page})=>{
  await boot(page);await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.items=[{id:'magnet',rank:2},{id:'luckyEgg',rank:1}];});
  let result=await cards(page,['magnet','luckyEgg','leftovers'],'magnet-lucky-egg');expect(result.map(c=>c.art)).toEqual(['pokesprite:magnet:outline','pokesprite:luckyEgg:outline','pokesprite:leftovers:outline']);expect(result[0].text).toContain('154 → 199');expect(result[1].text).toContain('6% → 12%');expect(result.every(c=>c.bottom<630)).toBe(true);
  await page.keyboard.press('1');await page.waitForFunction(()=>!(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').overlay);
  expect(await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),c=s.children.getByName('held-item-slot-1');return{rank:c.list.find((v:any)=>v.type==='Text').text,key:c.list.find((v:any)=>v.type==='Image').texture.key};})).toEqual({rank:'R3',key:'pokesprite:magnet:outline'});
  result=await cards(page,['muscleBand','assaultVest','floatStone'],'offense-defense-utility');expect(result.every(c=>c.art?.includes('pokesprite:'))).toBe(true);
  result=await cards(page,['focusSash','lifeOrb','kingsRock'],'rare-item-cards');expect(result.every(c=>c.bottom<630)).toBe(true);
  result=await cards(page,['vitamin:hpUp','vitamin:protein','vitamin:carbos'],'vitamin-cards');expect(result.every(c=>c.art?.includes('vitamin:'))).toBe(true);
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.cancelChoices();s.state.items=[{id:'magnet',rank:3},{id:'luckyEgg',rank:2},{id:'leftovers',rank:4},{id:'focusSash',rank:1}];});await page.waitForTimeout(100);await page.screenshot({path:`${folder}/four-item-hud.png`});
});

test('type booster badges fit their cards at the source artwork aspect ratio',async({page})=>{
  await boot(page);await cards(page,['miracleSeed','silkScarf','poisonBarb'],'type-booster-cards');
  const badges=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('upgrade');return s.cards.map((c:any)=>{const image=c.getByName('type-badge'),b=image.getBounds();return{key:image.texture.key,width:image.displayWidth,height:image.displayHeight,left:b.left,right:b.right,top:b.top,bottom:b.bottom,cardLeft:c.x-165,cardRight:c.x+165};});});
  for(const badge of badges){expect(badge.width).toBe(28);expect(badge.height).toBe(28);expect(badge.left).toBeGreaterThan(badge.cardLeft);expect(badge.right).toBeLessThan(badge.cardRight);expect(badge.top).toBeGreaterThan(205);expect(badge.bottom).toBeLessThan(252);}
});

test('protection, critical hits, returned damage and visible hazard warnings have actual feedback',async({page})=>{
  await boot(page);const result=await page.evaluate(async()=>{
    const simulationPath='/src/simulation.ts',combatPath='/src/itemCombat.ts',itemsPath='/src/items.ts',contentPath='/src/content.ts';
    const sim=await import(simulationPath),combat=await import(combatPath),items=await import(itemsPath),content=await import(contentPath),s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
    s.state.items=[{id:'focusSash',rank:1},{id:'rockyHelmet',rank:5},{id:'scopeLens',rank:5},{id:'kingsRock',rank:5}];const modifiers=items.aggregateItems(s.state.items);
    sim.spawnSpecies(s.state,'caterpie');const enemy=s.state.enemies[0];Object.assign(enemy,{x:s.state.player.x+65,y:s.state.player.y,hp:100,maxHp:100});
    combat.hurtPlayer(s.state,1,'contact',modifiers,enemy);combat.hurtPlayer(s.state,999,'ranged',modifiers);const reflected=100-enemy.hp;
    for(let seed=0;seed<10000;seed++)if(new sim.RNG(seed).next()<.03){s.state.seed=seed;break;}
    const hit=combat.moveDamage(s.state,content.MOVES.tackle,enemy,1,modifiers);
    s.renderAttack({id:++s.state.eventId,moveId:'tackle',kind:'charge',type:'Normal',x:s.state.player.x,y:s.state.player.y,tx:enemy.x,ty:enemy.y,radius:70,hits:[enemy.id],damage:hit.amount,critical:hit.critical});
    sim.createGroundHazard(s.state,'spikes',s.state.player.x-100,s.state.player.y+60);sim.createGroundHazard(s.state,'powder',s.state.player.x+100,s.state.player.y+100);
    s.pickupRenderer.onStep(s.state);s.syncViews(1);s.itemHud.update(s.state,false);s.renderHealthBars();s.scene.pause();
    return{hp:s.state.hp,sash:s.state.itemRuntime.sashUsed,reflected,critical:hit.critical,hazards:s.state.hazards.length,text:s.effectsLayer.list.filter((v:any)=>v.type==='Text').map((v:any)=>v.text).join('|')};
  });
  expect(result).toMatchObject({hp:1,sash:true,reflected:10,critical:true,hazards:2,text:expect.stringContaining('CRIT ')});await page.screenshot({path:`${folder}/combat-feedback-hazards.png`});
});

test('world consumables heal and clear status without taking item slots, and Lucky Egg feedback includes bonus',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.hp=20;s.state.items=[{id:'luckyEgg',rank:2}];s.state.playerStatuses=[{kind:'poison',remaining:3,tick:0,power:2}];s.state.pickups=[{id:++s.state.eventId,...s.state.player,kind:'consumable',consumableId:'fullRestore',value:1},{id:++s.state.eventId,...s.state.player,kind:'xp',value:5}];});
  await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').state.totalExp>0);
  const result=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{hp:s.state.hp,max:s.state.maxHp,status:s.state.playerStatuses.length,slots:s.state.items.length,total:s.state.totalExp,text:s.children.list.filter((v:any)=>v.type==='Text').map((v:any)=>v.text).join('|')};});expect(result).toMatchObject({status:0,slots:1,text:expect.stringContaining('Lucky Egg +0.6')});expect(result.total).toBeCloseTo(5.6,8);expect(result.hp).toBe(result.max);
  await page.screenshot({path:`${folder}/pickup-feedback.png`});
});

test('hundreds of candy images reuse textures and remain smooth while moving the camera',async({page})=>{
  await boot(page);const metrics=await page.evaluate(async()=>{
    const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),textures=s.textures.getTextureKeys().length;s.state.level=100;s.state.nextXp=Infinity;s.state.items=[{id:'magnet',rank:5},{id:'luckyEgg',rank:5}];
    for(let i=0;i<600;i++){const a=i*2.4,r=300+i%250;s.state.pickups.push({id:++s.state.eventId,x:s.state.player.x+Math.cos(a)*r,y:s.state.player.y+Math.sin(a)*r,kind:'xp',value:5});}
    const deltas:number[]=[];let previous=performance.now();for(let i=0;i<100;i++){await new Promise<void>(r=>requestAnimationFrame(()=>r()));const now=performance.now();deltas.push(now-previous);previous=now;}
    deltas.sort((a,b)=>a-b);return{texturesBefore:textures,texturesAfter:s.textures.getTextureKeys().length,views:s.pickupViews.size,median:deltas[50],p95:deltas[95],fps:s.game.loop.actualFps};
  });
  expect(metrics.texturesAfter).toBe(metrics.texturesBefore);expect(metrics.views).toBe(600);expect(metrics.median).toBeLessThan(40);expect(metrics.p95).toBeLessThan(100);
  await page.screenshot({path:`${folder}/dense-600-candies.png`});await page.keyboard.down('d');await page.waitForTimeout(800);await page.keyboard.up('d');
  expect(await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return s.state.pickups.reduce((sum:number,p:any)=>sum+p.value,0)+s.state.totalExp/1.3;})).toBeCloseTo(3000,5);
  writeFileSync(`${folder}/dense-performance.json`,JSON.stringify(metrics,null,2));
});

test('reduced motion keeps essential attraction and removes decorative bobbing',async({page})=>{
  await boot(page);await page.emulateMedia({reducedMotion:'reduce'});
  const result=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),p={id:++s.state.eventId,x:s.state.player.x+100,y:s.state.player.y,value:30,kind:'xp'};s.state.pickups=[p];s.syncViews(1);const a={x:s.pickupViews.get(p.id).x,y:s.pickupViews.get(p.id).y};s.state.time+=.5;s.syncViews(1);const b={x:s.pickupViews.get(p.id).x,y:s.pickupViews.get(p.id).y};s.state.items=[{id:'magnet',rank:1}];s.step();return{a,b,moved:p.x<a.x};});expect(result.a).toEqual(result.b);expect(result.moved).toBe(true);
});

test('local normal and outlined assets, type badges and content-pipeline reference sprites load',async({page})=>{
  await page.goto('/');await page.setViewportSize({width:1280,height:1500});
  const groups=Object.entries(POKESPRITE_ASSETS).map(([id,art])=>`<figure><div><img src="/assets/pokesprite/${art.normal}">${art.outline?`<img src="/assets/pokesprite/${art.outline}">`:''}</div><figcaption>${id}</figcaption></figure>`).join('');
  await page.setContent(`<style>body{background:#10272e;color:#e7f5ed;font:13px sans-serif}main{display:grid;grid-template-columns:repeat(8,1fr);gap:6px}figure{margin:0;padding:8px;background:#1e3940;text-align:center}figure div{height:70px;display:flex;align-items:center;justify-content:center}img{image-rendering:pixelated;width:64px;height:auto}h1{color:#ffe4a1}</style><h1>PokéSprite v0.4.0 · Local Asset Audit</h1><p>Original / outlined · exact pixels · 40 held items, vitamins, consumables, candies, balls, types and pipeline references</p><main>${groups}</main>`);
  await page.waitForFunction(()=>[...document.images].every(image=>image.complete&&image.naturalWidth>0));expect(await page.locator('img').count()).toBe(146);await page.screenshot({path:`${folder}/asset-gallery.png`,fullPage:true});
});

test('records baseline, Rank 1 and Rank 5 attraction and real walking',async({browser})=>{
  const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:`${folder}/video`,size:{width:1280,height:720}}}),page=await context.newPage();
  await boot(page);await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.level=50;s.state.nextXp=762;s.state.xp=0;(s as any).qaLabel=s.add.text(640,95,'',{fontFamily:'Trebuchet MS',fontSize:'18px',color:'#ffe7a4',backgroundColor:'#102019ee',padding:{x:12,y:8}}).setOrigin(.5).setScrollFactor(0).setDepth(20030);});
  for(const rank of [0,1,5]){
    await page.evaluate(rank=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.items=rank?[{id:'magnet',rank},{id:'luckyEgg',rank:1}]:[];s.qaLabel.setText(rank?`Magnet Rank ${rank} · ${64+45*rank} attraction radius`:'Baseline · every Pokémon attracts EXP from 64 units');const home=s.state.player;for(let i=0;i<16;i++){const angle=i*Math.PI/8,radius=(rank?64+rank*45:64)-(i%3)*9-5;s.state.pickups.push({id:++s.state.eventId,x:home.x+Math.cos(angle)*radius,y:home.y+Math.sin(angle)*radius,kind:'xp',value:5});}s.state.pickups.push({id:++s.state.eventId,x:home.x+320,y:home.y+50,kind:'ball',tier:3,value:1});},rank);
    await page.waitForTimeout(1300);await page.keyboard.down('d');await page.waitForTimeout(550);await page.keyboard.up('d');await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(650);const video=page.video();await context.close();await video!.saveAs(`${folder}/candy-attraction.webm`);
});
