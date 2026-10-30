import {test,expect,Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {freshSave} from '../src/save';
import {readyMenu,singlePlayer} from './helpers/menu';

const folder=process.env.POKEMON_CHARCOAL_QA_DIR??'test-results/charcoal';
const tile=(page:Page,dex:number)=>page.locator(`.roster-tile[data-dex="${dex}"]`);
async function open(page:Page,scene='pokemon'){
  await page.goto('/?seed=1337');await readyMenu(page);
  if(scene==='pokemon')await singlePlayer(page);else await page.getByRole('button',{name:'Pokédex',exact:true}).click();
  await expect(page.locator('.frontend[data-roster-mode]')).toBeVisible();await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(scene=>(window as any).__POKEMON_SURVIVORS__.scene.getScene(scene).background?.snapshot().ready,scene);mkdirSync(folder,{recursive:true});
}
async function geometry(page:Page){return page.evaluate(()=>{
  const root=document.querySelector('.frontend')!,grid=document.querySelector('.roster-grid')!,panel=document.querySelector('.partner-detail')!,footer=document.querySelector('.frontend-footer')!;
  const box=(element:Element)=>{const b=element.getBoundingClientRect();return{left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
  const parts=[...panel.querySelectorAll<HTMLElement>('.partner-hero,.partner-starting-move,.partner-stat-section,.partner-access,.dex-species-notes,.dex-evolution-family,.dex-base-stats')].filter(e=>e.getBoundingClientRect().height>0);
  return{horizontal:root.scrollWidth>root.clientWidth,vertical:root.scrollHeight>root.clientHeight+1,panel:box(panel),footer:box(footer),grid:box(grid),contentBottom:Math.max(...parts.map(e=>e.getBoundingClientRect().bottom)),parts:parts.map(box),colors:{panel:getComputedStyle(panel).backgroundColor,text:getComputedStyle(panel).color,border:getComputedStyle(panel).borderTopColor,shade:getComputedStyle(document.querySelector('.frontend-shade')!).backgroundColor},columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length};
});}

test('compact selection and Pokedex fit desktop screens without stretched empty panels',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});const diagnostics=[];
  for(const [width,height] of [[1280,720],[1920,1080]])for(const [scene,mode] of [['pokemon','selection'],['dex','pokedex']]){
    await page.setViewportSize({width,height});await open(page,scene);const state=await geometry(page);diagnostics.push({width,height,mode,...state});
    expect(state.horizontal).toBe(false);expect(state.vertical).toBe(false);expect(state.panel.bottom).toBeLessThan(state.footer.top);expect(state.footer.bottom).toBeLessThanOrEqual(height);expect(state.panel.bottom-state.contentBottom).toBeLessThan(22);
    for(const part of state.parts){expect(part.left).toBeGreaterThan(state.panel.left);expect(part.right).toBeLessThan(state.panel.right);expect(part.bottom).toBeLessThan(state.panel.bottom);}
    if(scene==='pokemon'){await expect(page.locator('.roster-tile')).toHaveCount(9);expect(await page.locator('.roster-grid').evaluate(grid=>grid.scrollHeight-grid.clientHeight)).toBeLessThanOrEqual(1);await expect(page.locator('.starting-move-description')).toHaveText('A controlled forward impact with knockback.');await expect(page.locator('.partner-stat')).toHaveCount(4);}
    else{await expect(page.locator('.roster-tile')).toHaveCount(151);await expect(page.locator('.dex-base-stats>div')).toHaveCount(6);}
    await page.screenshot({path:`${folder}/after-${mode}-${width}.png`});
  }writeFileSync(`${folder}/desktop-diagnostics.json`,JSON.stringify(diagnostics,null,2));
});

test('narrow layouts scroll to the summary and action without horizontal clipping',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const [width,height] of [[320,740],[390,844],[768,1024]])for(const [scene,mode] of [['pokemon','selection'],['dex','pokedex']]){
    await page.setViewportSize({width,height});await open(page,scene);expect((await geometry(page)).horizontal,`${mode} ${width}`).toBe(false);
    await page.screenshot({path:`${folder}/after-${mode}-${width}.png`});await tile(page,4).click();await expect(page.locator('.selected-pokemon-name')).toHaveText('Charmander');
    await page.locator('.partner-detail').scrollIntoViewIfNeeded();let state=await geometry(page);for(const part of state.parts){expect(part.left).toBeGreaterThan(state.panel.left);expect(part.right).toBeLessThan(state.panel.right);}
    if(width===390)await page.screenshot({path:`${folder}/after-${mode}-${width}-detail.png`});
    const action=scene==='pokemon'?page.locator('.partner-confirm'):page.getByRole('button',{name:'Back',exact:true});await action.scrollIntoViewIfNeeded();const bounds=await action.boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(height);expect(bounds!.height).toBeGreaterThanOrEqual(44);
    if(scene==='pokemon'){await action.click();await expect(page.locator('.frontend--stage')).toBeVisible();await page.keyboard.press('Escape');await expect(tile(page,4)).toHaveAttribute('aria-selected','true');}
    else{await action.click();await expect(page.locator('.frontend--menu')).toBeVisible();}
  }
});

test('79-entry future roster fixture scrolls with keyboard and keeps long names inside neutral tiles',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const [width,height] of [[1280,720],[1920,1080],[390,844]]){
    await page.setViewportSize({width,height});await open(page);const saved=await page.evaluate(()=>localStorage.getItem('pokemon-survivors-save'));
    await page.evaluate(()=>{const view=(window as any).__POKEMON_SURVIVORS__.scene.getScene('pokemon').roster,original=view.records.find((r:any)=>r.dex===1);view.records=Array.from({length:79},(_,i)=>i===0?original:{...original,dex:i+1,name:['Kangaskhan','Farfetch’d','Nidoran♀','Mr. Mime','Long Pokémon display name'][i%5],startingPartner:false,combat:undefined,restriction:'Future layout fixture only; no playable partner unlock.'});view.renderRoster();view.selectedTile().focus({preventScroll:true});});
    await expect(page.locator('.roster-tile')).toHaveCount(79);const clippedNames=await page.locator('.roster-tile__name').evaluateAll(names=>names.filter(name=>name.scrollHeight>name.clientHeight+1||name.scrollWidth>name.clientWidth+1).map(name=>name.textContent));expect(clippedNames).toEqual([]);const columns=(await geometry(page)).columns;
    for(let i=0;i<Math.floor(78/columns);i++)await page.keyboard.press('ArrowDown');for(let i=0;i<78%columns;i++)await page.keyboard.press('ArrowRight');await expect(tile(page,79)).toBeFocused();await expect(tile(page,79)).toHaveAttribute('aria-selected','true');expect(await page.locator('.roster-grid').evaluate(grid=>grid.scrollTop)).toBeGreaterThan(0);
    const fit=await tile(page,79).evaluate(button=>{const b=button.getBoundingClientRect(),n=button.querySelector('.roster-tile__name')!.getBoundingClientRect(),grid=button.parentElement!.getBoundingClientRect();return{nameFits:n.left>=b.left&&n.right<=b.right&&n.top>=b.top&&n.bottom<=b.bottom,visible:b.top>=grid.top&&b.bottom<=grid.bottom,overflow:button.scrollWidth>button.clientWidth};});expect(fit).toEqual({nameFits:true,visible:true,overflow:false});expect((await geometry(page)).horizontal).toBe(false);expect(await page.evaluate(()=>localStorage.getItem('pokemon-survivors-save'))).toBe(saved);
    await page.screenshot({path:`${folder}/future-79-${width}.png`});
  }
});

test('locked, unavailable and undiscovered states retain their details and save rules',async({page})=>{
  const save=freshSave();save.unlockedPokemon=['bulbasaur','squirtle'];save.pokedex.push('pikachu','ivysaur');await page.addInitScript(save=>localStorage.setItem('pokemon-survivors-save',JSON.stringify(save)),save);await page.emulateMedia({reducedMotion:'reduce'});await open(page);
  await tile(page,4).click();await expect(tile(page,4)).toHaveAttribute('data-state','locked');await expect(page.locator('.partner-confirm')).toBeDisabled();await expect(page.locator('.partner-detail')).toContainText('locked in your save');await expect(page.locator('.partner-stat')).toHaveCount(4);await page.screenshot({path:`${folder}/locked-1280.png`});
  await tile(page,25).click();await expect(page.locator('.selected-pokemon-name')).toHaveText('Pikachu');await expect(page.locator('.partner-access')).toContainText('not available yet');await expect(page.locator('.partner-confirm')).toBeDisabled();
  await tile(page,43).click();await expect(tile(page,43)).toHaveAttribute('data-state','undiscovered');await expect(tile(page,43).locator('img')).toHaveCount(0);await expect(page.locator('.selected-pokemon-name')).toHaveText('Undiscovered');await expect(page.locator('.partner-detail .type-chip')).toHaveCount(0);await expect(page.locator('.roster-favorite')).toBeDisabled();await page.screenshot({path:`${folder}/undiscovered-1280.png`});
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-survivors-save')!))).toEqual(save);
});

test('keyboard and controller focus stay visible through selection, controls, confirm and back',async({page})=>{
  await page.addInitScript(()=>{const pad={axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))};(window as any).__CHARCOAL_PAD__=pad;Object.defineProperty(navigator,'getGamepads',{value:()=>[pad]});});await page.emulateMedia({reducedMotion:'reduce'});await open(page);
  const press=async(i:number)=>{await page.evaluate(i=>(window as any).__CHARCOAL_PAD__.buttons[i].pressed=true,i);await page.waitForTimeout(80);await page.evaluate(i=>(window as any).__CHARCOAL_PAD__.buttons[i].pressed=false,i);await page.waitForTimeout(60);};
  await expect(tile(page,1)).toBeFocused();await page.keyboard.press('ArrowUp');await expect(page.getByLabel('Sort',{exact:true})).toBeFocused();await expect(page.getByLabel('Sort',{exact:true})).toHaveCSS('outline-color','rgb(217, 185, 110)');await press(13);await expect(tile(page,1)).toBeFocused();await press(15);await expect(tile(page,4)).toBeFocused();await expect(tile(page,4)).toHaveCSS('border-top-color','rgb(217, 185, 110)');await press(0);await expect(page.locator('.partner-confirm')).toBeFocused();await press(0);await expect(page.locator('.frontend--stage')).toBeVisible();await press(1);await expect(tile(page,4)).toBeFocused();await press(1);await expect(page.locator('.frontend--menu')).toBeVisible();
});
