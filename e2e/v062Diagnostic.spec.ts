import {test,expect} from '@playwright/test';

test('game assets load with no missing-texture placeholders and HUD fits viewport',async({page})=>{
 const failed:string[]=[];
 page.on('response',r=>{if(r.status()>=400&&/assets\//.test(r.url()))failed.push(r.status()+' '+r.url());});
 page.on('requestfailed',r=>{if(/assets\//.test(r.url()))failed.push('network '+r.url()+' '+r.failure()?.errorText);});
 await page.setViewportSize({width:1663,height:924});
 await page.goto('/?seed=1337');
 await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__);
 await page.evaluate(()=> (window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'charmander',seed:1337}));
 await page.waitForFunction(()=>{
   const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
   return s?.state?.time>0.5&&s?.moveHud&&s?.itemHud;
 });
 const result=await page.evaluate(()=>{
  const g=(window as any).__POKEMON_SURVIVORS__,s=g.scene.getScene('game'),canvas=g.canvas;
  const rect=canvas.getBoundingClientRect(),objects:any[]=[];
  const walk=(item:any,group:string)=>{
   if(item.texture&&item.texture.key==='__MISSING'){
    objects.push({group,name:item.name,x:item.x,y:item.y,depth:item.depth,key:item.texture.key,assetId:item.getData?.('assetId'),mapProp:item.getData?.('mapProp')});
   }
   if(item.list)for(const child of item.list)walk(child,group+'/'+item.name);
  };
  for(const key of ['groundLayer','worldLayer','effectsLayer'])for(const obj of s[key]?.list??[])walk(obj,key);
  for(const obj of s.children.list)walk(obj,'scene');
  const elements=['timerText','hud','portrait','objectiveHud','researchHud'].map(key=>{
   const obj=s[key],b=obj.getBounds();
   return{key,visible:obj.visible,x:b.x,y:b.y,right:b.right,bottom:b.bottom};
  });
  const move=s.moveHud.slots.map((slot:any,i:number)=>({i,texture:slot.image.texture.key,visible:slot.image.visible,status:slot.container.getData('status')}));
  return {rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},view:{width:innerWidth,height:innerHeight},game:{width:g.config.width,height:g.config.height,zoom:s.cameras.main.zoom,scrollX:s.cameras.main.scrollX,scrollY:s.cameras.main.scrollY},elements,move,missing:objects};
 });
 console.log('ASSET_AND_HUD_DIAGNOSTIC '+JSON.stringify({failed,result}));
 await page.screenshot({path:'test-results/v062-diagnostic.png'});
 expect(failed).toEqual([]);
 expect(result.missing).toEqual([]);
 expect(result.rect.x).toBeGreaterThanOrEqual(-1);
 expect(result.rect.y).toBeGreaterThanOrEqual(-1);
 expect(result.rect.x+result.rect.width).toBeLessThanOrEqual(result.view.width+1);
 expect(result.rect.y+result.rect.height).toBeLessThanOrEqual(result.view.height+1);
});
