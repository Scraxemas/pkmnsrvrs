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
  const metrics=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{bar:s.hpLayout.player,originY:s.player.originY,spriteY:s.player.y,renderY:s.renderPlayer.y,shadowY:s.playerShadow.y};});
  expect(metrics.bar.width/1280).toBeGreaterThan(.93);expect(metrics.originY).toBe(1);expect(metrics.spriteY).toBeGreaterThan(metrics.renderY);expect(metrics.shadowY-metrics.renderY).toBeCloseTo(2,1);
  await page.screenshot({path:'test-results/screenshots/14-terrain-intersection-1280.png'});
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.hp=s.state.maxHp*.18;});await page.waitForTimeout(100);
  await page.screenshot({path:'test-results/screenshots/15-critical-hp-1280.png'});
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');const pond=s.state.world.landmarks.find((l:any)=>l.id==='pond');s.cameras.main.stopFollow();s.cameras.main.centerOn(pond.x,pond.y);});await page.waitForTimeout(150);
  await page.screenshot({path:'test-results/screenshots/16-pond-boundary-1280.png'});
  await page.setViewportSize({width:2560,height:1440});await page.waitForTimeout(250);
  const canvasBox=await canvas.boundingBox();expect(canvasBox?.width).toBeGreaterThan(2500);
  await page.screenshot({path:'test-results/screenshots/17-hud-2560x1440.png'});
});

test('interpolated movement states and streamed forest motifs',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await page.goto('/?fast=1');const canvas=page.locator('canvas');await expect(canvas).toBeVisible();
  await page.evaluate(()=>{(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'bulbasaur',fast:true});});await page.waitForTimeout(900);
  const opening=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{ranged:s.state.enemies.filter((e:any)=>e.behavior==='ranged').length,shots:s.state.projectiles.length,phase:s.state.encounterPhase};});expect(opening).toEqual({ranged:0,shots:0,phase:'opening'});
  const move=async(keys:string[],name:string)=>{for(const key of keys)await page.keyboard.down(key);await page.waitForTimeout(260);await page.screenshot({path:`test-results/screenshots/motion-${name}.png`});for(const key of keys)await page.keyboard.up(key);await page.waitForTimeout(100);};
  await move(['w'],'north');await move(['s'],'south');await move(['a'],'west');await move(['d'],'east');await move(['w','d'],'northeast');
  const samples=[] as {sim:number;render:number;camera:number;state:string}[];await page.keyboard.down('d');for(let i=0;i<12;i++){await page.waitForTimeout(25);samples.push(await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{sim:s.state.player.x,render:s.renderPlayer.x,camera:s.cameraTarget.x,state:s.playerAnimation.state};}));}await page.keyboard.up('d');
  expect(samples.every(sample=>sample.state==='walk'||sample.state==='attack')).toBe(true);expect(new Set(samples.map(sample=>sample.render.toFixed(2))).size).toBeGreaterThan(6);expect(samples.every(sample=>Math.abs(sample.camera-sample.render)<.01)).toBe(true);
  for(const motif of ['clearing','forest-wall','tall-grass','pond','rocky','corridor'] as const){await page.evaluate((wanted)=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');const chunk=Object.values(s.state.world.chunks).find((c:any)=>c.motif===wanted) as any;s.state.enemies=[];s.state.projectiles=[];s.state.player.x=(chunk.cx+.5)*s.state.world.chunkSize;s.state.player.y=(chunk.cy+.5)*s.state.world.chunkSize;s.previousPlayer={x:s.state.player.x,y:s.state.player.y};},motif);await page.waitForTimeout(220);await page.screenshot({path:`test-results/screenshots/motif-${motif}.png`});}
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.player.x+=1600;s.state.player.y+=900;s.previousPlayer={x:s.state.player.x,y:s.state.player.y};});await page.waitForTimeout(300);await page.screenshot({path:'test-results/screenshots/long-travel-streamed-world.png'});
  const streaming=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{loaded:s.chunkViews.size,total:Object.keys(s.state.world.chunks).length,chunk:s.activeChunk};});expect(streaming.loaded).toBeLessThan(streaming.total);expect(streaming.loaded).toBeGreaterThanOrEqual(20);
});

test('complete tree silhouettes survive chunk transitions',async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await page.evaluate(()=>{(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'bulbasaur'});});
  await page.waitForFunction(()=>{
    const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
    return s.player&&s.chunkViews.size>0;
  });

  const silhouettes=await page.evaluate(()=>{
    const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
    return ['tree','tree_cluster'].map(name=>{
      const source=s.textures.get(`viridian-frlg/${name}`).getSourceImage();
      const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
      const context=canvas.getContext('2d')!;context.drawImage(source,0,0);
      const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
      let borderOpaque=0,opaque=0;
      for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
        if(!pixels[(y*canvas.width+x)*4+3])continue;
        opaque++;
        if(x===0||y===0||x===canvas.width-1||y===canvas.height-1)borderOpaque++;
      }
      return{name,borderOpaque,opaque};
    });
  });
  for(const tree of silhouettes){
    expect(tree.borderOpaque,`${tree.name} must not end at an opaque cut edge`).toBe(0);
    expect(tree.opaque).toBeGreaterThan(500);
  }

  const position=async(destination:'forest-wall'|'landmark'|'seam-left'|'seam-right')=>{
    await page.evaluate(wanted=>{
      const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),map=s.state.world;
      const chunk=Object.values(map.chunks).filter((c:any)=>c.motif==='forest-wall').sort((a:any,b:any)=>Math.hypot(a.cx-8,a.cy-8)-Math.hypot(b.cx-8,b.cy-8))[0] as any;
      const landmark=map.landmarks.find((l:any)=>l.id==='ancient-tree');
      const x=wanted==='landmark'?landmark.x:wanted.startsWith('seam')?8*map.chunkSize+(wanted==='seam-left'?-4:4):(chunk.cx+.5)*map.chunkSize;
      const y=wanted==='landmark'?landmark.y-50:wanted.startsWith('seam')?7.5*map.chunkSize:(chunk.cy+.5)*map.chunkSize;
      s.overlay??=s.add.container(0,0);s.state.enemies=[];s.state.projectiles=[];s.syncViews(1);
      s.state.player.x=x;s.state.player.y=y;s.previousPlayer={x,y};
      s.applyPokemonAnimation(s.player,s.playerAnimation,s.state.pokemonId,'south',0,{x,y});
      s.playerShadow.setPosition(x,y+2);s.cameras.main.stopFollow();s.cameras.main.centerOn(x,y);s.syncWorldChunks(true);
    },destination);
    await page.waitForTimeout(100);
  };
  await position('forest-wall');
  await page.screenshot({path:'test-results/screenshots/trees-forest-wall.png'});
  await position('landmark');
  const layering=await page.evaluate(()=>{
    const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
    const images=[...s.chunkViews.values()].flat() as any[];
    const trees=images.filter(image=>image.getData?.('forestTree'));
    const ground=images.filter(image=>['viridian-frlg/tall_grass','viridian-frlg/grass_flowers'].includes(image.texture?.key));
    return{groundCount:ground.length,belowTrees:ground.every(image=>trees.every(tree=>image.depth<tree.depth))};
  });
  expect(layering.groundCount).toBeGreaterThan(0);expect(layering.belowTrees).toBe(true);
  await page.screenshot({path:'test-results/screenshots/trees-landmark.png'});
  await position('seam-left');
  await page.evaluate(()=>{
    const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
    (window as any).__TREE_SEAM_CHECK__=[...s.chunkViews.entries()].filter(([key]:[string,unknown])=>Number(key.split(',')[0])>=6).flatMap(([,objects]:[string,any[]])=>objects.filter(object=>object.getData?.('forestTree')));
  });
  await page.screenshot({path:'test-results/screenshots/trees-seam-before.png'});
  await position('seam-right');
  const retained=await page.evaluate(()=>{
    const trees=(window as any).__TREE_SEAM_CHECK__ as any[];
    return{count:trees.length,active:trees.every(tree=>tree.active)};
  });
  expect(retained.count).toBeGreaterThan(0);expect(retained.active).toBe(true);
  await page.screenshot({path:'test-results/screenshots/trees-seam-after.png'});
});
