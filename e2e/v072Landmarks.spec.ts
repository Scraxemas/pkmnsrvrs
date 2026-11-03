import {test,expect} from '@playwright/test';
test('landmarks use anchored world art, not floating labels, with single-use discovery notices',async({page})=>{
 await page.setViewportSize({width:1280,height:720});
 await page.goto('/?seed=1337');
 await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__);
 await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'charmander',seed:1337}));
 await page.waitForFunction(()=>((window as any).__POKEMON_SURVIVORS__.scene.getScene('game')?.state?.time??0)>.2);
 const first=await page.evaluate(()=>{
  const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
  const site=s.state.world.landmarks.find((l:any)=>l.id==='pikachu-hollow');
  s.nextSpawn=Infinity;s.miniIndex=99;s.state.enemies=[];
  Object.assign(s.state.player,{x:site.x,y:site.y,vx:0,vy:0});
  s.cameraTarget.setPosition(site.x,site.y);s.cameras.main.centerOn(site.x,site.y);
  s.syncWorldChunks(true);
  const arts=s.worldLayer.list.filter((o:any)=>o.getData?.('landmarkArt')===site.id);
  const labels=s.groundLayer.list.filter((o:any)=>o.type==='Text'&&/PIKACHU HOLLOW|BEEDRILL NEST|TO PEWTER CITY/.test(o.text));
  const before=s.state.world.stream.persistent.discoveries.includes(site.id);
  s.step();
  const notice=s.children.getByName('forest-event-notice');
  return {art:arts.length,labels:labels.length,before,after:s.state.world.stream.persistent.discoveries.includes(site.id),notice:notice?.text??''};
 });
 expect(first.art).toBeGreaterThanOrEqual(4);
 expect(first.labels).toBe(0);
 expect(first.before).toBe(false);
 expect(first.after).toBe(true);
 expect(first.notice).toContain('PIKACHU HOLLOW');
 await page.screenshot({path:'test-results/v072-pikachu-hollow.png'});
 const again=await page.evaluate(()=>{
  const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
  s.children.getByName('forest-event-notice')?.destroy();
  s.step();
  const site=s.state.world.landmarks.find((l:any)=>l.id==='pikachu-hollow');
  return{notice:!!s.children.getByName('forest-event-notice'),seen:s.state.world.stream.persistent.discoveries.filter((id:string)=>id===site.id).length};
 });
 expect(again).toEqual({notice:false,seen:1});
});
