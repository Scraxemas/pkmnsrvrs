import {test,expect} from '@playwright/test';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
test('menu to deterministic Viridian Forest run with visual checkpoints',async({page})=>{
  await page.goto('/?fast=1&debug=1&seed=1337');
  const canvas=page.locator('canvas');await expect(canvas).toBeVisible();await page.waitForTimeout(500);
  await page.screenshot({path:'test-results/screenshots/01-main-menu.png'});
  await page.getByRole('button',{name:'New Run',exact:true}).click();await page.waitForTimeout(300);
  await page.screenshot({path:'test-results/screenshots/02-pokemon-selection.png'});
  await page.getByRole('button',{name:'Choose Bulbasaur'}).click();await page.waitForTimeout(300);
  await page.screenshot({path:'test-results/screenshots/03-stage-selection.png'});
  await page.getByRole('button',{name:'Enter Forest',exact:true}).click();await page.waitForTimeout(1000);
  await expect(canvas).toBeVisible();await page.screenshot({path:'test-results/screenshots/04-viridian-early.png'});
  await page.keyboard.down('d');await page.waitForTimeout(500);await page.keyboard.up('d');
  const state=await page.evaluate(()=>{const g=(window as any).__POKEMON_SURVIVORS__;const s=g.scene.getScene('game');return{level:s.state.level,enemies:s.state.enemies.length,hash:s.state.seed,player:s.state.player};});
  expect(state.enemies).toBeGreaterThan(0);expect(state.player.x).toBeGreaterThan(0);expect(state.player.facing).toBe('east');
  await page.screenshot({path:'test-results/screenshots/04b-east-facing.png'});
  await page.evaluate(()=>{const g=(window as any).__POKEMON_SURVIVORS__;const s=g.scene.getScene('game');s.showChoices('LEVEL UP',s.state.moveSlots.map((m:any)=>({kind:'move',id:m.id,label:`Upgrade ${m.id}`})).slice(0,1));});
  await page.waitForTimeout(200);await page.screenshot({path:'test-results/screenshots/05-level-up.png'});
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.cancelChoices();s.showReward(3);});
  await page.waitForTimeout(200);await page.screenshot({path:'test-results/screenshots/06-ultra-ball-reward.png'});
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.cancelChoices();s.showEvolution('ivysaur');});
  await page.waitForTimeout(250);await page.screenshot({path:'test-results/screenshots/07-evolution.png'});
  await page.waitForTimeout(1900);
  await page.evaluate(()=>{const g=(window as any).__POKEMON_SURVIVORS__;const s=g.scene.getScene('game');s.state.time=s.duration;s.state.bossSpawned=false;s.schedule();const b=s.state.enemies.find((e:any)=>e.boss);b.x=s.state.player.x+150;b.y=s.state.player.y;});
  await page.waitForTimeout(300);await page.screenshot({path:'test-results/screenshots/08-beedrill-boss.png'});
  await page.evaluate(()=>{const g=(window as any).__POKEMON_SURVIVORS__;g.scene.getScene('game').finish('victory');});
  await page.waitForTimeout(200);await page.screenshot({path:'test-results/screenshots/09-victory.png'});
});

test('Pokédex and Research screens render',async({page})=>{await page.goto('/?seed=1337');const canvas=page.locator('canvas');await expect(canvas).toBeVisible();await page.evaluate(()=>{(window as any).__POKEMON_SURVIVORS__.scene.start('dex');});await page.waitForTimeout(250);await page.screenshot({path:'test-results/screenshots/10-pokedex.png'});await page.evaluate(()=>{(window as any).__POKEMON_SURVIVORS__.scene.start('research');});await page.waitForTimeout(250);await page.screenshot({path:'test-results/screenshots/11-research.png'});});

test('grounding, terrain transitions, pond boundary, and responsive HP HUD',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await page.goto('/?fast=1&seed=1337');const canvas=page.locator('canvas');await expect(canvas).toBeVisible();
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
  await page.setViewportSize({width:1280,height:720});await page.goto('/?fast=1&seed=1337');const canvas=page.locator('canvas');await expect(canvas).toBeVisible();
  await page.evaluate(()=>{(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'bulbasaur',fast:true});});await page.waitForTimeout(900);
  const opening=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{ranged:s.state.enemies.filter((e:any)=>e.behavior==='ranged').length,shots:s.state.projectiles.length,phase:s.state.encounterPhase};});expect(opening).toEqual({ranged:0,shots:0,phase:'opening'});
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.enemies=[];s.state.projectiles=[];s.state.pickups=[];s.nextSpawn=Infinity;s.miniIndex=99;});
  const move=async(keys:string[],name:string)=>{for(const key of keys)await page.keyboard.down(key);await page.waitForTimeout(260);await page.screenshot({path:`test-results/screenshots/motion-${name}.png`});for(const key of keys)await page.keyboard.up(key);await page.waitForTimeout(100);};
  await move(['w'],'north');await move(['s'],'south');await move(['a'],'west');await move(['d'],'east');await move(['w','d'],'northeast');
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');Object.assign(s.state.player,s.state.world.playerStart,{vx:0,vy:0});s.previousPlayer={...s.state.world.playerStart};});
  await page.keyboard.down('d');await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').playerAnimation.state==='walk');
  const samples=await page.evaluate(async()=>{const result=[];for(let i=0;i<12;i++){await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');result.push({sim:s.state.player.x,render:s.renderPlayer.x,camera:s.cameraTarget.x,state:s.playerAnimation.state});}return result;});await page.keyboard.up('d');
  expect(samples.every(sample=>sample.state==='walk'||sample.state==='attack')).toBe(true);expect(new Set(samples.map(sample=>sample.render.toFixed(2))).size).toBeGreaterThan(6);expect(samples.every(sample=>Math.abs(sample.camera-sample.render)<.01)).toBe(true);
  for(const motif of ['clearing','forest-wall','tall-grass','pond','rocky','corridor'] as const){await page.evaluate((wanted)=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');const chunk=Object.values(s.state.world.chunks).find((c:any)=>c.motif===wanted) as any;s.state.enemies=[];s.state.projectiles=[];s.state.player.x=(chunk.cx+.5)*s.state.world.chunkSize;s.state.player.y=(chunk.cy+.5)*s.state.world.chunkSize;s.previousPlayer={x:s.state.player.x,y:s.state.player.y};},motif);await page.waitForTimeout(220);await page.screenshot({path:`test-results/screenshots/motif-${motif}.png`});}
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.player.x+=1600;s.state.player.y+=900;s.previousPlayer={x:s.state.player.x,y:s.state.player.y};});await page.waitForTimeout(300);await page.screenshot({path:'test-results/screenshots/long-travel-streamed-world.png'});
  const streaming=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{loaded:s.chunkViews.size,total:Object.keys(s.state.world.chunks).length,chunk:s.activeChunk};});expect(streaming.loaded).toBeLessThan(streaming.total);expect(streaming.loaded).toBeGreaterThanOrEqual(9);
});

test('complete trees and clean foliage survive chunk transitions',async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await page.goto('/?seed=1337');
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

  const foliage=await page.evaluate(()=>{
    const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
    return ['tall_grass','grass_leaves','grass_flowers'].map(name=>{
      const source=s.textures.get(`viridian-frlg/${name}`).getSourceImage();
      const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
      const context=canvas.getContext('2d')!;context.drawImage(source,0,0);
      const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
      let treeCapPixels=0;
      // The two lime colours belong to the neighbouring tree cap, not grass.
      for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]&&((pixels[i]===184&&pixels[i+1]===248&&pixels[i+2]===136)||(pixels[i]===128&&pixels[i+1]===208&&pixels[i+2]===96)))treeCapPixels++;
      return{name,treeCapPixels};
    });
  });
  for(const tile of foliage)expect(tile.treeCapPixels,`${tile.name} includes a fragment of the neighbouring tree`).toBe(0);

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
    (window as any).__TREE_SEAM_CHECK__=[...s.chunkViews.entries()].filter(([key]:[string,unknown])=>{const x=Number(key.split(',')[0]);return x>=7&&x<=8;}).flatMap(([,objects]:[string,any[]])=>objects.filter(object=>object.getData?.('forestTree')));
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

test('full forest survey covers every chunk with complete reviewed props',async({page})=>{
  test.setTimeout(120_000);
  await page.setViewportSize({width:1280,height:720});await page.goto('/?seed=1337');
  await expect(page.locator('canvas')).toBeVisible();
  await page.evaluate(()=>{(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'bulbasaur'});});
  await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').player);
  const survey=await page.evaluate(()=>{
    const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),map=s.state.world,errors:string[]=[],seen=new Set<string>();
    s.overlay=s.add.container(0,0);s.cameras.main.stopFollow();
    let visited=0;
    for(const chunk of Object.values(map.chunks) as any[]){
      const x=(chunk.cx+.5)*map.chunkSize,y=(chunk.cy+.5)*map.chunkSize;
      s.cameras.main.centerOn(x,y);s.syncWorldChunks(true);visited++;
      if(!s.chunkViews.has(chunk.key))errors.push(`missing ${chunk.key}`);
      for(const objects of s.chunkViews.values())for(const image of objects){
        if(!image.texture?.key.startsWith('viridian-frlg/')&&!image.texture?.key.startsWith('viridian-original/'))errors.push(`legacy texture ${image.texture?.key}`);
        if(image.getData?.('mapProp')||image.getData?.('forestTree')||image.getData?.('grass')){
          seen.add(image.getData('mapProp')??(image.getData('grass')?'grass':'ancient-tree'));
          const b=image.getBounds();
          if(b.left<0||b.top<0||b.right>map.width||b.bottom>map.height)errors.push(`outside world ${image.texture.key}`);
        }
      }
    }
    return{visited,errors:[...new Set(errors)],seen:[...seen]};
  });
  expect(survey.visited).toBe(256);expect(survey.errors).toEqual([]);
  for(const kind of ['tree','landRock','waterRock','tent','bush','sapling'])expect(survey.seen).toContain(kind);
  for(const destination of ['pond','rocky','landmark','forest-wall','corridor','tall-grass','northwest','northeast','southwest','southeast']){
    await page.evaluate(wanted=>{
      const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),map=s.state.world;
      const corners:Record<string,[number,number]>={northwest:[640,360],northeast:[map.width-640,360],southwest:[640,map.height-360],southeast:[map.width-640,map.height-360]};
      const chunk=Object.values(map.chunks).filter((c:any)=>c.motif===wanted).sort((a:any,b:any)=>Math.hypot(a.cx-8,a.cy-8)-Math.hypot(b.cx-8,b.cy-8))[0] as any;
      const [x,y]=corners[wanted]??[(chunk.cx+.5)*map.chunkSize,(chunk.cy+.5)*map.chunkSize];
      s.cameras.main.centerOn(x,y);s.syncWorldChunks(true);
    },destination);
    await page.waitForTimeout(60);await page.screenshot({path:`test-results/screenshots/map-pass-${destination}.png`});
  }
});

test('full tile catalog browses complete props and terrain separately',async({page})=>{
  await page.goto(pathToFileURL(resolve('assets/extracted/frlg/index.html')).href);
  await expect(page.locator('#summary')).toContainText('4,792 native cells');
  await page.locator('#kind').selectOption('prop');
  await expect(page.locator('.card')).toHaveCount(10);
  await page.waitForFunction(()=>[...document.querySelectorAll('img')].every(image=>image.complete&&image.naturalWidth>0));
  await page.screenshot({path:'test-results/screenshots/frlg-catalog-props.png',fullPage:true});
  await page.locator('#kind').selectOption('terrain');await page.locator('#search').fill('grass_patch_32');
  await expect(page.locator('.card')).toHaveCount(1);await expect(page.locator('.tag')).toContainText('32×32');
  await page.locator('#kind').selectOption('all');await page.locator('#search').fill('tile_r598_c07');
  await expect(page.locator('.card')).toHaveCount(1);
});

test('complete grass brushes around walking feet and settles when idle',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await page.goto('/?seed=1337');
  await expect(page.locator('canvas')).toBeVisible();
  await page.evaluate(()=>{(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'bulbasaur'});});
  await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').player);
  await page.evaluate(()=>{
    const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),map=s.state.world,grid=map.terrain;
    const index=grid.cells.findIndex((value:number,i:number)=>value===3&&grid.cells[i-1]===3&&grid.cells[i+1]===3&&grid.cells[i+2]===3&&map.decorations.every((d:any)=>Math.hypot(d.x-((i%grid.cols)+.5)*grid.tileSize,d.y-(Math.floor(i/grid.cols)+.5)*grid.tileSize)>90));
    if(index<0)throw new Error('No open grass patch for walk-through check');
    const x=((index%grid.cols)+.5)*grid.tileSize,y=(Math.floor(index/grid.cols)+.5)*grid.tileSize;
    s.state.player.x=x;s.state.player.y=y;s.state.player.vx=0;s.state.player.vy=0;s.previousPlayer={x,y};s.renderPlayer={x,y};
    s.state.enemies=[];s.state.projectiles=[];s.state.moveSlots=[];s.nextSpawn=Infinity;
    s.cameras.main.stopFollow();s.cameras.main.centerOn(x,y);s.syncWorldChunks(true);
  });
  await page.waitForTimeout(200);
  await page.screenshot({path:'test-results/screenshots/grass-complete-idle.png'});
  await page.keyboard.down('d');
  const motion=[] as {bend:number;particles:number;brushes:number}[];
  for(let i=0;i<6;i++){
    await page.waitForTimeout(40);
    motion.push(await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{bend:Math.max(0,...[...s.grassViews.values()].map((v:any)=>Math.abs(v.back.rotation))),particles:s.grassParticles.size,brushes:s.grassBrushCount};}));
  }
  await page.screenshot({path:'test-results/screenshots/grass-brushing-walk.png'});
  await page.keyboard.up('d');
  expect(Math.max(...motion.map(m=>m.bend))).toBeGreaterThan(.03);
  expect(Math.max(...motion.map(m=>m.particles))).toBeGreaterThan(0);
  expect(Math.max(...motion.map(m=>m.particles))).toBeLessThanOrEqual(72);
  await page.waitForTimeout(950);
  const settled=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{active:s.grassBrush.impulses.size,particles:s.grassParticles.size,bend:Math.max(0,...[...s.grassViews.values()].map((v:any)=>Math.abs(v.back.rotation))),brushes:s.grassBrushCount};});
  expect(settled.active).toBe(0);expect(settled.particles).toBe(0);expect(settled.bend).toBe(0);
  await page.waitForTimeout(250);
  expect(await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').grassBrushCount)).toBe(settled.brushes);
  await page.screenshot({path:'test-results/screenshots/grass-settled.png'});
});

test('walking animation restarts after stopping in every direction',async({page})=>{
  await page.goto('/?seed=1337');await expect(page.locator('canvas')).toBeVisible();
  await page.evaluate(()=>{(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'bulbasaur'});});
  await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').player);
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.state.enemies=[];s.state.moveSlots=[];s.nextSpawn=Infinity;});
  for(const keys of [['d'],['w'],['a'],['s'],['d','s'],['a','s'],['a','w'],['d','w']]){
    for(const key of keys)await page.keyboard.down(key);
    await page.waitForTimeout(160);
    for(const key of keys)await page.keyboard.up(key);
    await page.waitForTimeout(100);
    const idle=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{playing:s.player.anims.isPlaying,key:s.player.anims.currentAnim.key,x:s.state.player.x,y:s.state.player.y};});
    expect(idle.playing).toBe(false);
    for(const key of keys)await page.keyboard.down(key);
    const frames=[] as string[];
    for(let i=0;i<4;i++){
      await page.waitForTimeout(85);
      const moving=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{playing:s.player.anims.isPlaying,key:s.player.anims.currentAnim.key,frame:String(s.player.frame.name),x:s.state.player.x,y:s.state.player.y};});
      expect(moving.playing,`${keys.join('+')} restarted playback`).toBe(true);
      const facing:Record<string,string>={d:'east',w:'north',a:'west',s:'south','d+s':'southeast','a+s':'southwest','a+w':'northwest','d+w':'northeast'};
      expect(moving.key).toBe(`bulbasaur-walk-${facing[keys.join('+')]}`);if(keys.length===1)expect(moving.key).toBe(idle.key);frames.push(moving.frame);
      if(i===3)expect(Math.hypot(moving.x-idle.x,moving.y-idle.y)).toBeGreaterThan(20);
    }
    expect(new Set(frames).size,`${keys.join('+')} advances through walk frames`).toBeGreaterThan(1);
    for(const key of keys)await page.keyboard.up(key);
    await page.waitForTimeout(80);
  }
});

test('grass makes only the bottom fifth of the visible body transparent',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await page.goto('/?seed=1337');
  await expect(page.locator('canvas')).toBeVisible();
  await page.evaluate(()=>{(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'charmander'});});
  await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').player);
  await page.evaluate(()=>{
    const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),map=s.state.world,grid=map.terrain;
    const index=grid.cells.findIndex((value:number,i:number)=>value===3&&grid.cells[i-1]===3&&grid.cells[i+1]===3&&map.decorations.every((d:any)=>Math.hypot(d.x-((i%grid.cols)+.5)*32,d.y-(Math.floor(i/grid.cols)+.5)*32)>90));
    const x=((index%grid.cols)+.5)*32,y=(Math.floor(index/grid.cols)+.5)*32;
    Object.assign(s.state.player,{x,y,vx:0,vy:0});s.previousPlayer={x,y};s.state.enemies=[];s.state.moveSlots=[];s.nextSpawn=Infinity;
    s.cameras.main.stopFollow();s.cameras.main.centerOn(x,y);s.syncWorldChunks(true);
  });
  await page.waitForTimeout(150);
  const pixels=await page.evaluate(async()=>{
    const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
    s.overlay=s.add.container(0,0);s.player.anims.stop();
    for(const view of s.grassViews.values())view.front.setVisible(false);
    const sprite=s.player,box=sprite.getBounds(),cam=s.cameras.main;
    const x=Math.floor(box.x-cam.scrollX),y=Math.floor(box.y-cam.scrollY),width=Math.ceil(box.width),height=Math.ceil(box.height);
    const cutoff=sprite.getData('grassMaskBottom')-cam.scrollY-y;
    const hidden=sprite.getData('grassHiddenFraction'),cropped=!!sprite.mask,alpha=sprite.alpha;
    const snapshot=()=>new Promise<Uint8ClampedArray>(resolve=>s.game.renderer.snapshotArea(x,y,width,height,(image:any)=>{
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d')!;
      context.drawImage(image,0,0);resolve(context.getImageData(0,0,width,height).data);
    }));
    const masked=await snapshot();sprite.clearMask();const full=await snapshot();let changedUpper=0,changedLower=0;
    for(let py=0;py<height;py++)for(let px=0;px<width;px++){
      const p=(py*width+px)*4;
      if(masked[p]!==full[p]||masked[p+1]!==full[p+1]||masked[p+2]!==full[p+2]){if(py<cutoff-2)changedUpper++;else changedLower++;}
    }
    s.applyGrassOcclusion(sprite,s.state.pokemonId,s.state.player);
    for(const view of s.grassViews.values())view.front.setVisible(true);s.overlay.destroy();s.overlay=undefined;
    return{cropped,hidden,alpha,changedUpper,changedLower};
  });
  expect(pixels.cropped).toBe(true);expect(pixels.hidden).toBeCloseTo(.2);expect(pixels.alpha).toBe(1);
  expect(pixels.changedUpper).toBe(0);expect(pixels.changedLower).toBeGreaterThan(0);
  await page.screenshot({path:'test-results/screenshots/grass-bottom-fifth-mask.png'});
  await page.evaluate(()=>{
    const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
    for(let offset=0;offset<256;offset+=32){
      const x=s.state.world.playerStart.x+offset,y=s.state.world.playerStart.y;
      s.applyGrassOcclusion(s.player,s.state.pokemonId,{x,y});
      if(!s.player.mask){Object.assign(s.state.player,{x,y,vx:0,vy:0});s.previousPlayer={x,y};s.cameras.main.centerOn(x,y);break;}
    }
  });
  await page.waitForTimeout(100);
  expect(await page.evaluate(()=>!!(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').player.mask)).toBe(false);
});
