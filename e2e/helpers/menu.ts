import {expect,Page} from '@playwright/test';
export async function readyMenu(page:Page){
  await expect(page.locator('.frontend--menu')).toBeVisible();await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>{const s=(window as any).__POKEMON_SURVIVORS__?.scene.getScene('menu');return s?.background?.snapshot().ready&&[...document.querySelectorAll<HTMLImageElement>('.frontend img')].every(image=>image.complete&&image.naturalWidth>0);});
  await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.frontend')].flatMap(root=>root.getAnimations({subtree:true})).map(animation=>animation.finished));});
}
export async function singlePlayer(page:Page){
  if(!await page.getByRole('button',{name:'Single Player',exact:true}).isVisible())await page.getByRole('button',{name:'Play',exact:true}).click();
  await page.getByRole('button',{name:'Single Player',exact:true}).click();
}
export async function choosePartner(page:Page,name='Bulbasaur'){
  await page.getByRole('option',{name:new RegExp(`· ${name} ·`)}).click();
  await page.getByRole('button',{name:`Select ${name}`,exact:true}).click();
}
