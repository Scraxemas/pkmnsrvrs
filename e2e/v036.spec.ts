import {test,expect,Page} from '@playwright/test';

async function boot(page:Page,seed=1337){
  await page.goto(`/?seed=${seed}`);await expect(page.locator('#app canvas')).toBeVisible();
  await page.evaluate(()=>{(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'bulbasaur'});});
  await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').player);
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.enemies=[];s.state.moveSlots=[{id:'tackle',rank:1}];s.nextSpawn=Infinity;});
}
async function clickCard(page:Page,index:number){
  await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__.scene.isActive('upgrade'));
  await page.waitForTimeout(450);
  const bounds=await page.evaluate(i=>{
    const scene=(window as any).__POKEMON_SURVIVORS__.scene.getScene('upgrade'),card=scene.cards[i],hit=card.list.find((child:any)=>child.type==='Zone');const b=hit.getBounds();return{x:b.centerX,y:b.centerY};
  },index);
  const box=(await page.locator('#app canvas').boundingBox())!;
  await page.mouse.click(box.x+bounds.x/1280*box.width,box.y+bounds.y/720*box.height);
}

test('all three level-up cards accept real clicks and apply only the selected upgrade',async({page})=>{
  await boot(page);
  for(const index of [0,1,2]){
    await page.evaluate(()=>{
      const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
      s.state.vitamins.protein=0;s.state.vitamins.calcium=0;s.state.vitamins.carbos=0;
      s.showChoices('LEVEL UP',[{kind:'vitamin',id:'protein',label:'Protein'},{kind:'vitamin',id:'calcium',label:'Calcium'},{kind:'vitamin',id:'carbos',label:'Carbos'}]);
    });
    const frozen=await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').state.time);
    await page.waitForTimeout(160);
    expect(await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').state.time)).toBe(frozen);
    if(index===0){await page.waitForTimeout(350);await page.screenshot({path:'test-results/screenshots/v036-level-cards.png'});}
    await clickCard(page,index);
    await page.waitForFunction(()=>!(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').overlay);
    expect(await page.evaluate(()=>{const v=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').state.vitamins;return[v.protein,v.calcium,v.carbos];})).toEqual([0,1,2].map(i=>Number(i===index)));
    await page.waitForTimeout(80);
    expect(await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').state.time)).toBeGreaterThan(frozen);
  }
});

test('level-up queue, keyboard, mastery, and double-click protection work',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.xp=s.state.nextXp+100;});
  await page.waitForFunction(()=>!!(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').activeChoice);
  const choices=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return s.pendingChoices.length+1;});expect(choices).toBeGreaterThan(1);
  for(let i=0;i<choices;i++){
    await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__.scene.isActive('upgrade'));
    await page.keyboard.press(i%2?'Enter':'2');await page.waitForTimeout(230);
  }
  await page.waitForFunction(()=>!(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').overlay);
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.level=19;s.state.nextXp=1;s.state.xp=1;});
  await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').activeChoice?.request.kind==='mastery');
  await page.keyboard.press('1');await page.waitForTimeout(230);
  expect(await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').state.masteries.overcharge)).toBe(1);
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');const move=s.state.moveSlots[0];move.rank=1;s.showChoices('DOUBLE CLICK CHECK',[{kind:'move',id:move.id,label:move.id}]);});
  await page.waitForTimeout(450);
  const before=await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').state.moveSlots[0].rank);
  const box=(await page.locator('#app canvas').boundingBox())!;await page.mouse.dblclick(box.x+box.width/2,box.y+box.height*390/720,{delay:30});
  await page.waitForTimeout(230);
  expect(await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').state.moveSlots[0].rank)).toBe(before+1);
});

test('choice cards remain clickable at small and large resolutions',async({page})=>{
  await boot(page);
  for(const viewport of [{width:960,height:540},{width:2560,height:1440}]){
    await page.setViewportSize(viewport);
    await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.showChoices('RESPONSIVE CARDS',[{kind:'vitamin',id:'iron',label:'Iron'},{kind:'vitamin',id:'zinc',label:'Zinc'},{kind:'vitamin',id:'protein',label:'Protein'}]);});
    await clickCard(page,2);await page.waitForFunction(()=>!(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').overlay);
  }
  expect(await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').state.vitamins.protein)).toBe(2);
});

test('EXP is independent of damage and overhead HP auto-hides and follows evolution',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.pickups.push({id:99999,x:s.state.player.x,y:s.state.player.y,value:8,kind:'xp'});});
  await page.waitForFunction(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return s.state.xp===8&&Math.abs(s.expDisplay-.5)<.01;});
  const initial=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{exp:s.expText.text,ratio:s.expDisplay,hp:s.playerHpGraphics.visible,shadow:s.playerShadow.visible};});
  expect(initial.exp).toBe('LEVEL 1 — EXP 8 / 16');expect(initial.ratio).toBeCloseTo(.5,1);expect(initial.hp).toBe(false);expect(initial.shadow).toBe(false);
  await page.screenshot({path:'test-results/screenshots/v036-exp-full-health.png'});
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.hp--;});await page.waitForTimeout(70);
  expect(await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').playerHpGraphics.visible)).toBe(true);
  await page.screenshot({path:'test-results/screenshots/v036-overhead-damage.png'});
  for(const ratio of [.2,.7,1]){
    await page.evaluate(value=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.hp=s.state.maxHp*value;},ratio);await page.waitForTimeout(70);
    const state=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{visible:s.playerHpGraphics.visible,ratio:s.playerHpBounds.fillWidth/s.playerHpBounds.width,exp:s.expText.text};});
    expect(state.visible).toBe(ratio<1);expect(state.ratio).toBeCloseTo(ratio);expect(state.exp).toBe(initial.exp);
  }
  await page.screenshot({path:'test-results/screenshots/v036-overhead-healed.png'});
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.hp=s.state.maxHp*.4;s.state.level=15;s.state.nextXp=1;s.state.xp=1;});
  await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').state.pokemonId==='ivysaur');
  await page.keyboard.press('1');await page.waitForTimeout(240);
  const head=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),rows=s.visibleRows(s.player,s.state.pokemonId);return{bar:s.playerHpBounds,head:s.player.y-s.player.displayOriginY*s.player.scaleY+rows.top*s.player.scaleY,shadows:[...s.enemyShadows.values()].some((shadow:any)=>shadow.visible)};});
  expect(head.bar.y+head.bar.height).toBeLessThan(head.head);expect(head.shadows).toBe(false);
  await page.keyboard.down('d');await page.waitForTimeout(200);await page.keyboard.up('d');
  expect(await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return Math.abs(s.playerHpBounds.x+s.playerHpBounds.width/2-s.renderPlayer.x);})).toBeLessThan(.01);
  await page.waitForTimeout(1800);
  await page.screenshot({path:'test-results/screenshots/v036-overhead-hp.png'});
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.level=100;s.state.nextXp=Infinity;});await page.waitForTimeout(250);
  expect(await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').expText.text)).toBe('LEVEL 100 — MAX LEVEL');
});

test('wild, elite, and boss shadows stay hidden and a ball survives chunk unloading',async({page})=>{
  await page.goto('/?seed=1337');await expect(page.locator('#app canvas')).toBeVisible();
  await page.evaluate(()=>{(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'bulbasaur'});});
  await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').player?.active);
  const result=await page.evaluate(async()=>{
    const {spawnSpecies}=await import('/src/simulation.ts');
    const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.time=s.duration;s.schedule();s.syncViews(1);
    spawnSpecies(s.state,'caterpie',1);spawnSpecies(s.state,'pidgeotto',1,true);s.syncViews(1);
    const tiers=[s.state.enemies.some((e:any)=>!e.elite&&!e.boss),s.state.enemies.some((e:any)=>e.elite),s.state.enemies.some((e:any)=>e.boss)];
    const shadows=[s.playerShadow,...s.enemyShadows.values()].every((shadow:any)=>!shadow.visible);
    s.state.enemies=[];s.nextSpawn=Infinity;s.miniIndex=99;s.state.bossSpawned=true;s.state.time=0;
    const home={x:s.state.player.x,y:s.state.player.y},key=`${Math.floor(home.x/512)},${Math.floor(home.y/512)}`;
    s.state.pickups.push({id:9999,x:home.x+60,y:home.y,value:1,kind:'ball',tier:2});
    const away=s.state.world.playerStart;Object.assign(s.state.player,{x:away.x,y:away.y});s.previousPlayer={x:away.x,y:away.y};s.cameras.main.stopFollow().centerOn(away.x,away.y);s.syncWorldChunks(true);s.syncViews(1);
    const unloaded=!s.chunkViews.has(key),retained=s.state.pickups.some((p:any)=>p.id===9999);
    Object.assign(s.state.player,home);s.previousPlayer=home;s.cameras.main.centerOn(home.x,home.y);s.syncWorldChunks(true);
    return{tiers,shadows,unloaded,retained};
  });
  expect(result).toEqual({tiers:[true,true,true],shadows:true,unloaded:true,retained:true});
  await page.keyboard.down('d');await page.waitForTimeout(450);await page.keyboard.up('d');
  await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').activeChoice?.request.title==='GREAT BALL OPENED!');
  await clickCard(page,0);await page.waitForFunction(()=>!(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').overlay);
  expect(await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').state.pickups.some((p:any)=>p.id===9999))).toBe(false);
});

test('move cards show their actual rank effects and apply the illustrated move',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.moveSlots=[{id:'tackle',rank:1},{id:'vineWhip',rank:1},{id:'leechSeed',rank:1}];s.showChoices('LEVEL UP',s.state.moveSlots.map((m:any)=>({kind:'move',id:m.id,label:m.id})));});
  await page.waitForTimeout(450);await page.screenshot({path:'test-results/screenshots/v036-move-cards.png'});
  await clickCard(page,1);await page.waitForFunction(()=>!(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').overlay);
  expect(await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').state.moveSlots.map((m:any)=>m.rank))).toEqual([1,2,1]);
});
