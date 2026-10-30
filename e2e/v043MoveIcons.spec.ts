import {test,expect,Page} from '@playwright/test';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const folder='docs/qa/v043';

async function boot(page:Page,viewport={width:1280,height:720}){
  mkdirSync(folder,{recursive:true});
  await page.setViewportSize(viewport);await page.goto('/?seed=1337');
  await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__);
  await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'charmander',seed:1337}));
  await page.waitForFunction(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return s.moveHud&&s.state.time>0;});
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.nextSpawn=Infinity;s.miniIndex=99;s.state.bossSpawned=true;s.state.enemies=[];});
}
async function presentCards(page:Page,ids=['scratch','ember','bubble']){
  await page.evaluate(ids=>{
    const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.cancelChoices();
    s.state.moveSlots=ids.map(id=>({id,rank:2}));s.renderMoveHud();
    s.showChoices('LEVEL UP',ids.map(id=>({kind:'move',id,label:id})));
  },ids);
  await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('upgrade').cards.length===3);
  await page.waitForTimeout(450);
}

for(const viewport of [{width:1280,height:720},{width:1920,height:1080}]){
  test(`every move loads and upgrade art remains sharp and aligned at ${viewport.width}×${viewport.height}`,async({page})=>{
    const failures:string[]=[];page.on('pageerror',error=>failures.push(error.message));
    page.on('response',response=>{if(response.url().includes('/assets/moves/')&&!response.ok())failures.push(`${response.status()} ${response.url()}`);});
    page.on('console',message=>{if(message.text().includes('[move-art]'))failures.push(message.text());});
    await boot(page,viewport);
    const audit=await page.evaluate(async()=>{
      const path='/src/content.ts',content=await import(path),s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),g=s.game;
      s.cancelChoices();g.scene.pause('game');
      const options=Object.keys(content.MOVES).map(id=>({kind:'move',id,label:id}));
      g.scene.start('upgrade',{title:'CARD CONTENT AUDIT',state:s.state,options,onSelect:()=>{}});
      await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
      const u=g.scene.getScene('upgrade'),cards=[];
      for(let page=0;page<Math.ceil(options.length/3);page++){
        u.page=page;u.focus=page*3;u.drawCards(false);
        for(const card of u.cards){
          const id=options[card.getData('index')].id,picture=card.getByName('move-art'),name=card.getByName('card-name').getBounds();
          cards.push({id,texture:picture?.texture.key,source:picture?[picture.width,picture.height]:[],size:picture?[picture.displayWidth,picture.displayHeight]:[],scale:picture?[picture.scaleX,picture.scaleY]:[],filter:picture?.texture.source[0].scaleMode,position:picture?[picture.x,picture.y]:[],bottom:picture?.getBounds().bottom,nameTop:name.top,fallback:!!card.getByName('move-art-fallback')});
        }
      }
      return{cards,count:options.length,pixelArt:g.config.pixelArt,antialias:g.config.antialias};
    });
    expect(audit.cards).toHaveLength(audit.count);expect(audit.pixelArt).toBe(true);expect(audit.antialias).toBe(false);
    for(const card of audit.cards){
      expect(card,card.id).toMatchObject({texture:`move:${card.id}`,source:[32,32],size:[64,64],scale:[2,2],filter:0,position:[0,-110],fallback:false});
      expect(card.bottom).toBeLessThan(card.nameTop);
    }
    await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.scene.stop('upgrade');s.scene.resume();});
    await presentCards(page);
    await page.screenshot({path:`${folder}/upgrade-after-${viewport.width}.png`});
    if(viewport.width===1280)await page.screenshot({path:`${folder}/upgrade-after.png`});
    await page.evaluate(()=>{
      const u=(window as any).__POKEMON_SURVIVORS__.scene.getScene('upgrade');
      u.config.options=[{kind:'move',id:'ember',label:'Ember'},{kind:'item',id:'charcoal',label:'Charcoal'},{kind:'item',id:'magnet',label:'Magnet'}];u.drawCards(false);
    });
    const mixed=await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('upgrade').cards.map((card:any)=>{
      const image=card.getByName('move-art')??card.getByName('item-art');return{id:image.getData('assetId'),key:image.texture.key,width:image.width,height:image.height,display:[image.displayWidth,image.displayHeight],scale:[image.scaleX,image.scaleY],filter:image.texture.source[0].scaleMode};
    }));
    expect(mixed.map((art:any)=>art.id)).toEqual(['ember','charcoal','magnet']);
    expect(mixed[1].key).toContain('pokesprite:charcoal');expect(mixed[2].key).toContain('pokesprite:magnet');
    for(const image of mixed){expect(Math.max(...image.display)).toBe(64);expect(image.scale[0]).toBe(image.scale[1]);expect(image.filter).toBe(0);}
    await page.screenshot({path:`${folder}/mixed-upgrade-cards-${viewport.width}.png`});
    writeFileSync(`${folder}/card-audit-${viewport.width}.json`,JSON.stringify({viewport,...audit,mixed},null,2));
    expect(failures).toEqual([]);
  });
  test(`five equipped PNGs fit the actual move HUD at ${viewport.width}×${viewport.height}`,async({page})=>{
    await boot(page,viewport);
    await page.evaluate(async()=>{
      const path='/src/simulation.ts',sim=await import(path),s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
      sim.evolveTo(s.state,'charmeleon');sim.evolveTo(s.state,'charizard');s.showEvolution('charizard');
      s.state.moveSlots=['dragonClaw','ember','dragonRage','metalClaw','tackle'].map((id,index)=>({id,rank:index+1}));s.renderMoveHud();
    });
    await page.waitForTimeout(1900);
    const hud=await page.evaluate(()=>{
      const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return [1,2,3,4,5].map(index=>{
        const card=s.children.getByName(`move-slot-${index}`),image=card.getByName('move-art'),name=card.list.find((child:any)=>child.type==='Text'),bounds=image.getBounds();
        return{id:card.getData('moveId'),status:card.getData('status'),fallback:card.getData('artFallback'),visible:image.visible,key:image.texture.key,scale:[image.scaleX,image.scaleY],size:[image.displayWidth,image.displayHeight],filter:image.texture.source[0].scaleMode,imageRight:bounds.right,nameLeft:name.getBounds().left,textFits:card.list.filter((child:any)=>child.type==='Text').every((text:any)=>text.getBounds().right<=card.x+145)};
      });
    });
    expect(hud.map((slot:any)=>slot.id)).toEqual(['dragonClaw','ember','dragonRage','metalClaw','tackle']);
    for(const slot of hud){expect(slot).toMatchObject({status:'filled',fallback:false,visible:true,key:`move:${slot.id}`,scale:[1,1],size:[32,32],filter:0,textFits:true});expect(slot.imageRight).toBeLessThan(slot.nameLeft);}
    await page.screenshot({path:`${folder}/move-hud-${viewport.width}.png`});
    if(viewport.width===1280)await page.screenshot({path:`${folder}/move-hud.png`});
  });
}

test('evolution immediately switches HUD and notification PNGs while preserving the invested slot',async({page})=>{
  await boot(page);await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.scene.manager.pause(s);Object.assign(s.state.moveSlots[0],{rank:4,nextAttackAt:123,cooldownDuration:.65});s.state.items=[{id:'magnet',rank:3}];});
  for(const [species,from,to] of [['charmeleon','scratch','metalClaw'],['charizard','metalClaw','dragonClaw']]){
    const result=await page.evaluate(async({species,from,to})=>{
      const path='/src/simulation.ts',sim=await import(path),s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),slot=s.state.moveSlots[0];
      s.state.progressionNotices=[];sim.evolveTo(s.state,species);s.renderMoveHud();s.showProgressionNotices();
      const hud=s.children.getByName('move-slot-1'),image=hud.getByName('move-art'),notice=s.children.list.filter((child:any)=>child.name==='move-progression-notice').at(-1),old=notice.getByName('move-evolution-from'),next=notice.getByName('move-evolution-to');
      return{sameSlot:s.state.moveSlots[0]===slot,rank:slot.rank,nextAttackAt:slot.nextAttackAt,cooldownDuration:slot.cooldownDuration,items:s.state.items,hud:{moveId:hud.getData('moveId'),key:image.texture.key,visible:image.visible},notice:{from:old?.texture.key,to:next?.texture.key,fromId:old?.getData('assetId'),toId:next?.getData('assetId')}};
    },{species,from,to});
    expect(result).toEqual({sameSlot:true,rank:4,nextAttackAt:123,cooldownDuration:.65,items:[{id:'magnet',rank:3}],hud:{moveId:to,key:`move:${to}`,visible:true},notice:{from:`move:${from}`,to:`move:${to}`,fromId:from,toId:to}});
  }
});

test('real level evolutions display the matching species, transformed HUD and notification icons',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.moveSlots[0].rank=4;});
  for(const [level,species,move] of [[15,'charmeleon','metalClaw'],[35,'charizard','dragonClaw']] as const){
    await page.evaluate(level=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.level=level;s.state.nextXp=s.state.xp=1;},level);
    await page.waitForFunction(species=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').state.pokemonId===species,species);
    await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__.scene.isActive('upgrade'));
    await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').cancelChoices());
    await page.waitForTimeout(1900);
    const visible=await page.evaluate(()=>{
      const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),hud=s.children.getByName('move-slot-1'),notice=s.children.getByName('move-progression-notice');
      return{species:s.state.pokemonId,portrait:s.portrait.texture.key,move:s.state.moveSlots[0].id,rank:s.state.moveSlots[0].rank,hud:hud.getByName('move-art').texture.key,noticeVisible:notice?.visible,noticeTo:notice?.getByName('move-evolution-to')?.texture.key};
    });
    expect(visible).toEqual({species,portrait:`${species}-portrait`,move,rank:4,hud:`move:${move}`,noticeVisible:true,noticeTo:`move:${move}`});
    await page.screenshot({path:`${folder}/evolution-${species}.png`});
    if(species==='charizard')await page.screenshot({path:`${folder}/evolution-icons.png`});
  }
});

test('a missing texture has a controlled legacy card fallback and one development warning',async({page})=>{
  const warnings:string[]=[];page.on('console',message=>{if(message.text().includes('[move-art]'))warnings.push(message.text());});
  await boot(page);
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.textures.renameTexture('move:scratch','qa-missing:scratch');});
  await presentCards(page);
  const fallback=await page.evaluate(()=>{const game=(window as any).__POKEMON_SURVIVORS__,s=game.scene.getScene('game'),u=game.scene.getScene('upgrade');return{card:!!u.cards[0].getByName('move-art-fallback'),image:!!u.cards[0].getByName('move-art'),hud:s.children.getByName('move-slot-1').getData('artFallback')};});
  expect(fallback).toEqual({card:true,image:false,hud:true});expect(warnings).toHaveLength(1);expect(warnings[0]).toContain('scratch');
});

test('the comparison gallery opens locally and through Vite without broken images or review links',async({page})=>{
  const moves=JSON.parse(readFileSync('assets/moves/generation-manifest.json','utf8')).moves.length;
  const results=[];
  for(const url of [pathToFileURL(resolve(folder,'index.html')).href,'/docs/qa/v043/index.html']){
    await page.goto(url);await expect(page.locator('article')).toHaveCount(moves);await expect(page.locator('article img')).toHaveCount(moves*2);
    await page.waitForFunction(()=>Array.from(document.images).every(image=>image.complete));
    const images=await page.locator('article img').evaluateAll(images=>images.map(image=>({source:(image as HTMLImageElement).currentSrc,width:(image as HTMLImageElement).naturalWidth,height:(image as HTMLImageElement).naturalHeight,rendering:getComputedStyle(image).imageRendering})));
    for(const image of images)expect(image).toMatchObject({width:32,height:32,rendering:'pixelated'});
    const links=await page.locator('nav a').evaluateAll(links=>links.map(link=>(link as HTMLAnchorElement).href));
    for(const href of links){if(href.startsWith('file:'))expect(existsSync(fileURLToPath(href)),href).toBe(true);else expect((await page.request.get(href)).ok(),href).toBe(true);}
    results.push({url:page.url(),images:images.length,links:links.length,brokenImages:0});
  }
  writeFileSync(`${folder}/gallery-audit.json`,JSON.stringify(results,null,2));
});
