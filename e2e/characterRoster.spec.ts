import {expect,Page,test} from '@playwright/test';
import {writeFileSync,mkdirSync} from 'node:fs';
import {freshSave} from '../src/save';
import {readyMenu,singlePlayer} from './helpers/menu';

const tile=(page:Page,dex:number)=>page.locator(`.roster-tile[data-dex="${dex}"]`);
async function readyRoster(page:Page){
  await expect(page.getByRole('heading',{name:'Select Pokémon',exact:true})).toBeVisible();await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('pokemon').background?.snapshot().ready);
  await page.evaluate(async()=>{await Promise.all(document.getAnimations().map(animation=>animation.finished));});
}
async function openRoster(page:Page){await page.goto('/?seed=1337');await readyMenu(page);await singlePlayer(page);await readyRoster(page);}

test('portrait roster and accurate starter details fit 720p, full HD and 1440p',async({page})=>{
  test.setTimeout(75_000);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.url().includes('/portraits/')&&response.status()>=400)errors.push(response.url());});
  for(const [width,height] of [[1280,720],[1920,1080],[2560,1440]]){
    await page.setViewportSize({width,height});await openRoster(page);
    await expect(page.getByRole('listbox',{name:'Pokémon roster'}).getByRole('option')).toHaveCount(151);await expect(page.locator('.partner-card')).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Johto SOON'})).toBeDisabled();await expect(page.getByRole('button',{name:'Hoenn SOON'})).toBeDisabled();
    for(const [dex,name,id,hp,attack,special,speed,move,types] of [[1,'Bulbasaur','bulbasaur',135,49,65,170,'Tackle',['Grass','Poison']],[4,'Charmander','charmander',117,52,60,185,'Scratch',['Fire']],[7,'Squirtle','squirtle',132,48,50,155,'Tackle',['Water']]] as const){
      await tile(page,dex).click();await readyRoster(page);const detail=page.getByRole('region',{name:'Selected Pokémon'});
      await expect(detail.getByRole('heading',{name,exact:true})).toBeVisible();await expect(detail.locator('.roster-portrait--large img')).toHaveAttribute('src',new RegExp(`/portraits/${id}.png$`));await expect(tile(page,dex).locator('img')).toHaveAttribute('src',new RegExp(`/portraits/${id}.png$`));
      await expect.poll(()=>detail.locator('img').evaluate((image:HTMLImageElement)=>image.complete&&image.naturalWidth===40)).toBe(true);
      await expect(detail.locator('.type-chip')).toHaveText([...types]);await expect(detail.locator('.starting-move-name')).toHaveText(move);await expect(detail.locator('.starting-move-heading')).toContainText('Rank 1');
      for(const [key,value] of [['hp',hp],['attack',attack],['specialAttack',special],['speed',speed]] as const)await expect(detail.locator(`[data-stat="${key}"] dd`)).toHaveText(String(value));
      await expect(page.getByRole('button',{name:`Select ${name}`,exact:true})).toBeEnabled();expect(await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.isActive('stage'))).toBe(false);
      if(width===1280)await page.screenshot({animations:'disabled',path:`test-results/screenshots/v039-${id}.png`});
    }
    const geometry=await page.evaluate(()=>{
      const root=document.querySelector('.frontend')!,grid=document.querySelector('.roster-grid')!,detail=document.querySelector('.partner-detail')!,footer=document.querySelector('.frontend-footer')!;
      const box=(e:Element)=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom};};
      return{rootOverflow:root.scrollHeight>root.clientHeight+1,detailOverflow:detail.scrollHeight>detail.clientHeight+1,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,grid:box(grid),detail:box(detail),footer:box(footer),images:[...document.querySelectorAll<HTMLImageElement>('.roster-portrait img')].map(i=>i.src)};
    });
    expect(geometry.rootOverflow).toBe(false);expect(geometry.detailOverflow).toBe(false);expect(geometry.columns).toBeGreaterThanOrEqual(5);expect(geometry.columns).toBeLessThanOrEqual(6);expect(geometry.grid.right).toBeLessThan(geometry.detail.x);expect(geometry.footer.bottom).toBeLessThanOrEqual(height);expect(geometry.images.every(src=>src.includes('/portraits/'))).toBe(true);
    await page.screenshot({animations:'disabled',path:`test-results/screenshots/v039-roster-${width}.png`});
  }
  expect(errors).toEqual([]);
});

test('discovery, locked starters and evolution-only entries never bypass playable unlocks',async({page})=>{
  const save=freshSave();save.unlockedPokemon=['bulbasaur','squirtle','ivysaur','caterpie'];save.pokedex.push('ivysaur','caterpie');save.research.viridianWins=7;
  await page.addInitScript(save=>localStorage.setItem('pokemon-survivors-save',JSON.stringify(save)),save);await openRoster(page);
  await tile(page,4).click();await expect(tile(page,4)).toHaveAttribute('data-state','locked');await expect(page.locator('.partner-confirm')).toBeDisabled();await expect(page.locator('.partner-access')).toContainText('locked in your save');
  await tile(page,2).click();await expect(page.locator('.selected-pokemon-name')).toHaveText('Ivysaur');await expect(page.locator('.partner-access')).toContainText('Evolution form');await expect(page.locator('.partner-confirm')).toBeDisabled();
  await tile(page,10).click();await expect(page.locator('.selected-pokemon-name')).toHaveText('Caterpie');await expect(tile(page,10)).toHaveAttribute('data-state','unavailable');await expect(page.locator('.partner-confirm')).toBeDisabled();await expect(page.locator('.partner-stat-bars')).toHaveCount(0);
  await tile(page,3).click();await expect(tile(page,3)).toHaveAttribute('data-state','undiscovered');await expect(page.locator('.selected-pokemon-name')).toHaveText('Undiscovered');await expect(page.locator('.partner-detail img')).toHaveCount(0);await expect(tile(page,3).locator('img')).toHaveCount(0);await expect(tile(page,3)).not.toHaveAttribute('aria-label',/Venusaur/);await page.keyboard.press('Enter');await expect(page.locator('.frontend--pokemon')).toBeVisible();await expect(page.locator('.partner-confirm')).toBeDisabled();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-survivors-save')!));expect(saved).toEqual(save);await page.screenshot({animations:'disabled',path:'test-results/screenshots/v039-unknown.png'});
});

test('sorting, real filters and persistent favorites retain selection and saved progress',async({page})=>{
  const save=freshSave();save.research.viridianWins=6;save.best.viridian={level:35,defeated:140,time:900};await page.goto('/?seed=1337');await readyMenu(page);await page.evaluate(save=>localStorage.setItem('pokemon-survivors-save',JSON.stringify(save)),save);await singlePlayer(page);await readyRoster(page);
  await tile(page,7).click();await page.getByLabel('Sort',{exact:true}).selectOption('name');await expect(tile(page,7)).toHaveAttribute('aria-selected','true');await expect(page.locator('.roster-tile').first()).toHaveAttribute('data-dex','1');
  await page.getByLabel('Filter',{exact:true}).selectOption('unlocked');await expect(page.locator('.roster-tile')).toHaveCount(3);await expect(page.locator('.selected-pokemon-name')).toHaveText('Squirtle');
  await page.getByRole('button',{name:'Favorite Squirtle',exact:true}).click();await expect(page.getByRole('button',{name:'Favorite Squirtle',exact:true})).toHaveAttribute('aria-pressed','true');await page.getByLabel('Filter',{exact:true}).selectOption('favorites');await expect(page.locator('.roster-tile')).toHaveCount(1);await expect(tile(page,7)).toHaveAttribute('aria-selected','true');
  await page.reload();await readyMenu(page);await singlePlayer(page);await readyRoster(page);await page.getByLabel('Filter',{exact:true}).selectOption('favorites');await expect(tile(page,7)).toBeVisible();
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-survivors-save')!));expect(after).toEqual({...save,favoritePokemon:[7]});
  await page.getByRole('button',{name:'Favorite Squirtle',exact:true}).click();await expect(page.locator('.roster-empty')).toContainText('No favorites');await expect(page.locator('.partner-confirm')).toBeDisabled();await page.getByRole('button',{name:'Back',exact:true}).focus();await page.keyboard.press('ArrowUp');await expect(page.getByLabel('Filter',{exact:true})).toBeFocused();await page.getByLabel('Filter',{exact:true}).selectOption('discovered');await expect(page.locator('.roster-tile')).toHaveCount(3);
});

test('keyboard browsing scrolls the complete catalogue without hundreds of animations',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await openRoster(page);await expect(tile(page,1)).toBeFocused();
  await page.keyboard.press('ArrowRight');await expect(tile(page,2)).toBeFocused();await expect(page.locator('.selected-pokemon-name')).toHaveText('Undiscovered');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await expect(page.locator('.selected-pokemon-name')).toHaveText('Charmander');
  await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Select Charmander',exact:true})).toBeFocused();await expect(page.locator('.frontend--stage')).toHaveCount(0);await page.keyboard.press('ArrowUp');await expect(tile(page,4)).toBeFocused();
  await tile(page,1).focus();for(let i=0;i<25;i++)await page.keyboard.press('ArrowDown');await expect(tile(page,151)).toBeFocused();
  const state=await page.evaluate(()=>{const grid=document.querySelector('.roster-grid')!,b=(window as any).__POKEMON_SURVIVORS__.scene.getScene('pokemon').background.snapshot();return{count:grid.querySelectorAll('.roster-tile').length,scroll:grid.scrollTop,animatedTiles:[...grid.getAnimations({subtree:true})].length,backgrounds:b.active,rect:b.rect};});
  expect(state.count).toBe(151);expect(state.scroll).toBeGreaterThan(1000);expect(state.animatedTiles).toBe(0);expect(state.backgrounds).toBe(1);await expect(page.locator('.selected-pokemon-name')).toHaveText('Undiscovered');
  mkdirSync('test-results/screenshots',{recursive:true});writeFileSync('test-results/screenshots/v039-roster-diagnostics.json',JSON.stringify(state,null,2));await page.screenshot({animations:'disabled',path:'test-results/screenshots/v039-scrolled.png'});
});

test('one confirmation preserves the selected partner through stage back and into each real run',async({page})=>{
  for(const [dex,name,id,hp] of [[1,'Bulbasaur','bulbasaur',135],[4,'Charmander','charmander',117],[7,'Squirtle','squirtle',132]] as const){
    await openRoster(page);await tile(page,dex).click();await page.getByRole('button',{name:`Select ${name}`,exact:true}).click();await expect(page.getByRole('heading',{name:'Choose your destination'})).toBeVisible();await expect(page.locator('.page-subtitle')).toContainText(name);
    await page.keyboard.press('Escape');await readyRoster(page);await expect(tile(page,dex)).toHaveAttribute('aria-selected','true');await page.getByRole('button',{name:`Select ${name}`,exact:true}).click();await page.getByRole('button',{name:'Enter Forest',exact:true}).click();
    await page.waitForFunction(id=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return s.state?.pokemonId===id&&s.player?.active;},id);
    const run=await page.evaluate(()=>{const g=(window as any).__POKEMON_SURVIVORS__,s=g.scene.getScene('game');return{pokemon:s.state.pokemonId,hp:s.state.maxHp,move:s.state.moveSlots[0],selectorActive:g.scene.isActive('pokemon'),backgrounds:document.querySelectorAll('.menu-background-canvas').length};});expect(run).toMatchObject({pokemon:id,hp,move:{id:id==='charmander'?'scratch':'tackle',rank:1},selectorActive:false,backgrounds:0});
  }
});

test('missing portraits use an explicit fallback and system reduced motion freezes the forest',async({page})=>{
  await page.goto('/?seed=1337');await readyMenu(page);const warnings:string[]=[];page.on('console',message=>{if(message.text().startsWith('[roster]'))warnings.push(message.text());});
  await page.route('**/portraits/bulbasaur.png',route=>route.fulfill({status:404,body:'missing portrait'}));await singlePlayer(page);await readyRoster(page);await expect(page.getByRole('img',{name:'Portrait unavailable for Bulbasaur'}).last()).toBeVisible();await expect(page.locator('.partner-detail')).toContainText('Portrait unavailable');expect(warnings).toHaveLength(1);
  await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('.frontend--pokemon')).toHaveAttribute('data-reduced-motion','true');const snapshot=()=>page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('pokemon').background.snapshot());const still=await snapshot();await page.waitForTimeout(150);expect((await snapshot()).time).toBe(still.time);expect(still).toMatchObject({rays:0,water:null,foliage:null});await tile(page,4).click();expect(await page.locator('.partner-detail__body').evaluate(e=>e.getAnimations().length)).toBe(0);
});
