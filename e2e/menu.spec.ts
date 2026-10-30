import {test,expect,Page} from '@playwright/test';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

import {readyMenu as ready,singlePlayer} from './helpers/menu';

test('supplied artwork and responsive main menu render at standard and ultrawide resolutions',async({page,request})=>{
  for(const [width,height] of [[1280,720],[1920,1080],[2560,1440],[3440,1440]]){
    await page.setViewportSize({width,height});await page.goto('/?seed=1337');await ready(page);
    const logo=page.getByRole('img',{name:'Pokémon Survivors',exact:true});await expect(logo).toBeVisible();await expect(logo).toHaveAttribute('src',/pokemon-survivors-logo.png/);
    const logoBounds=(await logo.boundingBox())!;expect(logoBounds.width/logoBounds.height).toBeCloseTo(202/100,2);
    const layout=await page.evaluate(()=>{
      const root=document.querySelector('.frontend')!,nav=[...root.querySelectorAll<HTMLElement>('.arcade-button:not([disabled])')];
      return{scroll:root.scrollWidth>innerWidth,vertical:root.scrollHeight>innerHeight+1,buttons:nav.map(button=>{const r=button.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom};}),font:document.fonts.check('16px Silkscreen'),background:(root.querySelector('.frontend-background') as HTMLImageElement).src};
    });
    expect(layout.scroll).toBe(false);expect(layout.vertical).toBe(false);expect(layout.font).toBe(true);expect(layout.background).toContain('viridian-forest-main-menu.jpg');
    for(const button of layout.buttons){expect(button.left).toBeGreaterThanOrEqual(0);expect(button.right).toBeLessThanOrEqual(width);expect(button.top).toBeGreaterThanOrEqual(0);expect(button.bottom).toBeLessThanOrEqual(height);}
    await page.screenshot({animations:'disabled',path:`test-results/screenshots/v038-main-${width}.png`});
  }
  const imports=JSON.parse(readFileSync('assets/menu-imports.json','utf-8'));
  for(const asset of imports){
    const response=await request.get(`/${asset.path}`);expect(response.ok()).toBe(true);
    expect(createHash('sha256').update(await response.body()).digest('hex')).toBe(asset.sha256);
  }
});

test('main navigation, cards, and all subpages support real mouse and keyboard interactions',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await page.goto('/?seed=1337');await ready(page);
  await page.getByRole('button',{name:'Play',exact:true}).hover();await page.screenshot({animations:'disabled',path:'test-results/screenshots/v038-hover-new-run.png'});
  await page.getByRole('button',{name:'Pokédex',exact:true}).hover();await expect(page.getByRole('button',{name:'Pokédex',exact:true})).toBeFocused();await page.screenshot({animations:'disabled',path:'test-results/screenshots/v038-hover-pokedex.png'});
  await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:'Pokédex',exact:true})).toBeVisible();await page.screenshot({animations:'disabled',path:'test-results/screenshots/v038-pokedex.png'});await page.keyboard.press('Escape');await ready(page);
  await page.getByRole('button',{name:'Research',exact:true}).click();await expect(page.getByRole('heading',{name:'Research board'})).toBeVisible();await page.screenshot({animations:'disabled',path:'test-results/screenshots/v038-research.png'});await page.getByRole('button',{name:'Back',exact:true}).click();await ready(page);
  await singlePlayer(page);await expect(page.getByRole('heading',{name:'Choose your partner'})).toBeVisible();await page.screenshot({animations:'disabled',path:'test-results/screenshots/v038-partners.png'});
  await page.getByRole('button',{name:'Choose Bulbasaur'}).click();await expect(page.getByRole('heading',{name:'Choose your destination'})).toBeVisible();
  const card=page.getByRole('button',{name:'Viridian Forest',exact:true});await expect(card.getByRole('img')).toHaveAttribute('src',/viridian-forest-card.png/);await page.screenshot({animations:'disabled',path:'test-results/screenshots/v038-stage-card.png'});
  await page.getByRole('button',{name:'Mt. Moon',exact:true}).click();await expect(page.locator('.stage-enter')).toBeDisabled();
  await card.click();await expect(card).toHaveAttribute('aria-pressed','true');await page.screenshot({animations:'disabled',path:'test-results/screenshots/v038-stage-selected.png'});
  await page.keyboard.press('Escape');await expect(page.getByRole('heading',{name:'Choose your partner'})).toBeVisible();await page.keyboard.press('Escape');await ready(page);
  await singlePlayer(page);await page.getByRole('button',{name:'Choose Squirtle'}).click();await page.getByRole('button',{name:'Enter Forest',exact:true}).click();
  await page.waitForFunction(()=>{const g=(window as any).__POKEMON_SURVIVORS__;return g.scene.isActive('game')&&g.scene.getScene('game').state.pokemonId==='squirtle';});await expect(page.locator('.frontend')).toHaveCount(0);
});

test('settings persist, preserve progression, and control real gameplay presentation',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/?seed=1337');await ready(page);
  await page.evaluate(()=>{const key='pokemon-survivors-save',save=JSON.parse(localStorage.getItem(key)??'null')??{version:2,unlockedPokemon:['bulbasaur','charmander','squirtle'],unlockedStages:['viridian','mtMoon'],research:{viridianWins:4},best:{viridian:{level:33,defeated:123,time:540}},settings:{damageNumbers:true}};localStorage.setItem(key,JSON.stringify(save));(window as any).__POKEMON_SURVIVORS__.scene.start('menu');});await ready(page);
  await expect(page.locator('.profile-strip')).toHaveCount(0);await page.getByRole('button',{name:'Research',exact:true}).click();await page.getByRole('tab',{name:'Statistics',exact:true}).click();await expect(page.getByRole('tabpanel',{name:'Statistics'})).toContainText('Level 33 · 123 KO');await page.keyboard.press('Escape');await ready(page);
  await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByRole('heading',{name:'Settings',exact:true})).toBeVisible();
  await page.getByRole('switch',{name:'Reduced motion'}).click();await page.getByRole('switch',{name:'Damage numbers'}).click();await page.getByRole('switch',{name:'Screen shake'}).click();
  await page.screenshot({animations:'disabled',path:'test-results/screenshots/v038-settings.png'});
  await page.reload();await ready(page);await page.getByRole('button',{name:'Settings',exact:true}).click();
  await expect(page.getByRole('switch',{name:'Reduced motion'})).toBeChecked();await expect(page.getByRole('switch',{name:'Damage numbers'})).not.toBeChecked();await expect(page.getByRole('switch',{name:'Screen shake'})).toBeChecked();
  await page.getByRole('button',{name:'Back',exact:true}).click();await singlePlayer(page);await page.getByRole('button',{name:'Choose Bulbasaur'}).click();await expect(page.getByRole('button',{name:'Mt. Moon',exact:true})).toHaveAttribute('data-unlocked','true');await page.getByRole('button',{name:'Enter Forest',exact:true}).click();
  await page.waitForFunction(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return s.keys?.D&&s.player?.active;});
  const state=await page.evaluate(()=>{
    const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),p=s.state.player;s.renderAttack({id:999,moveId:'tackle',kind:'charge',type:'Normal',x:p.x,y:p.y,tx:p.x+20,ty:p.y,radius:70,hits:[],damage:1234});
    s.state.projectiles=[{id:9999,x:p.x,y:p.y,vx:0,vy:0,radius:5,damage:1,ttl:5,type:'Bug',source:'caterpie'}];s.step();
    return{numbers:s.children.list.some((child:any)=>child.text==='1234'),shake:s.cameras.main.shakeEffect.isRunning,settings:s.preferences,save:JSON.parse(localStorage.getItem('pokemon-survivors-save')!)};
  });
  expect(state.numbers).toBe(false);expect(state.shake).toBe(false);expect(state.settings).toEqual({damageNumbers:false,reducedMotion:true,screenShake:true});expect(state.save.research.viridianWins).toBe(4);expect(state.save.best.viridian.level).toBe(33);
  await page.evaluate(()=>{(window as any).__POKEMON_SURVIVORS__.scene.stop('game');(window as any).__POKEMON_SURVIVORS__.scene.start('settings');});await expect(page.getByRole('heading',{name:'Settings',exact:true})).toBeVisible();
  await page.getByRole('switch',{name:'Reduced motion'}).click();await page.getByRole('switch',{name:'Damage numbers'}).click();await page.keyboard.press('Escape');
  await singlePlayer(page);await page.getByRole('button',{name:'Choose Bulbasaur'}).click();await page.getByRole('button',{name:'Enter Forest',exact:true}).click();
  await page.waitForFunction(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return s.keys?.D&&s.player?.active;});
  const enabled=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),p=s.state.player;s.renderAttack({id:999,moveId:'tackle',kind:'charge',type:'Normal',x:p.x,y:p.y,tx:p.x+20,ty:p.y,radius:70,hits:[],damage:1234});s.state.projectiles=[{id:9999,x:p.x,y:p.y,vx:0,vy:0,radius:5,damage:1,ttl:5,type:'Bug',source:'caterpie'}];s.step();return{numbers:s.children.list.some((child:any)=>child.text==='1234'),shake:s.cameras.main.shakeEffect.isRunning};});expect(enabled).toEqual({numbers:true,shake:true});
});

test('controller D-pad, confirm, and back navigate without held-button scene bouncing',async({page})=>{
  await page.addInitScript(()=>{const pad={axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))};(window as any).__MENU_TEST_PAD__=pad;Object.defineProperty(navigator,'getGamepads',{value:()=>[pad]});});
  await page.goto('/?seed=1337');await ready(page);
  const press=async(index:number)=>{await page.evaluate(i=>{(window as any).__MENU_TEST_PAD__.buttons[i].pressed=true;},index);await page.waitForTimeout(120);await page.evaluate(i=>{(window as any).__MENU_TEST_PAD__.buttons[i].pressed=false;},index);await page.waitForTimeout(80);};
  await expect(page.getByRole('button',{name:'Play',exact:true})).toBeFocused();await press(13);await expect(page.getByRole('button',{name:'Pokédex',exact:true})).toBeFocused();await press(0);await expect(page.getByRole('heading',{name:'Pokédex',exact:true})).toBeVisible();await press(1);await ready(page);
  await press(0);await expect(page.getByRole('button',{name:'Single Player',exact:true})).toBeFocused();await press(0);await expect(page.getByRole('heading',{name:'Choose your partner'})).toBeVisible();await press(15);await expect(page.getByRole('button',{name:'Choose Charmander'})).toBeFocused();await press(0);await expect(page.getByRole('heading',{name:'Choose your destination'})).toBeVisible();await press(1);await expect(page.getByRole('heading',{name:'Choose your partner'})).toBeVisible();
});

test('fullscreen reports actual browser state',async({page})=>{
  await page.goto('/?seed=1337');await ready(page);await page.getByRole('button',{name:'Settings',exact:true}).click();const button=page.getByRole('button',{name:'Toggle fullscreen'});
  if(await button.isEnabled()){await button.click();await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement||!!document.querySelector('[role=status]')?.textContent)).toBe(true);if(await page.evaluate(()=>!!document.fullscreenElement)){await button.click();await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(false);}}
  else await expect(button).toContainText('BROWSER UNAVAILABLE');
});

test('subpage layouts fit 720p, full HD, and 1440p without clipped controls',async({page})=>{
  for(const [width,height] of [[1280,720],[1920,1080],[2560,1440]]){
    await page.setViewportSize({width,height});await page.goto('/?seed=1337');await ready(page);
    for(const key of ['pokemon','stage','dex','research','settings']){
      await page.evaluate(scene=>{(window as any).__POKEMON_SURVIVORS__.scene.start(scene,{pokemon:'bulbasaur'});},key);
      await expect(page.locator(`.frontend--${key}`)).toBeVisible();
      await page.evaluate(async()=>{await Promise.all(document.getAnimations().map(animation=>animation.finished));});
      const layout=await page.evaluate(()=>{const root=document.querySelector('.frontend')!;return{horizontal:root.scrollWidth>innerWidth,vertical:root.scrollHeight>innerHeight+1,items:[...root.querySelectorAll<HTMLElement>('.page-header h1,.frontend-footer button,.stage-enter,.location-card')].map(element=>{const r=element.getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right};})};});
      expect(layout.horizontal,`${key} ${width} horizontal`).toBe(false);expect(layout.vertical,`${key} ${width} vertical`).toBe(false);
      for(const item of layout.items){expect(item.top,`${key} top`).toBeGreaterThanOrEqual(0);expect(item.bottom,`${key} bottom`).toBeLessThanOrEqual(height);expect(item.left).toBeGreaterThanOrEqual(0);expect(item.right).toBeLessThanOrEqual(width);}
    }
  }
});
