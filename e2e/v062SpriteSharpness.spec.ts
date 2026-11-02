import {test,expect} from '@playwright/test';

test('native Pokémon attack sheets stay pixel-sharp when swapping away from walking sprites',async({page})=>{
 await page.setViewportSize({width:1280,height:720});
 await page.goto('/?seed=1337');
 await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__);
 await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'charmander',seed:1337}));
 await page.waitForFunction(()=>{
  const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
  return s?.state?.time>.1&&s.player?.texture&&s.playerAnimation;
 });
 const samples=await page.evaluate(()=>{
  const g=(window as any).__POKEMON_SURVIVORS__;
  const s=g.scene.getScene('game'),controller=s.playerAnimation;
  const keys=g.textures.getTextureKeys().filter((key:string)=>
   key.startsWith('pokemon-action:')||key==='charmander-sprite'||key==='bulbasaur-sprite'||key==='squirtle-sprite'||key.startsWith('move:')||key.startsWith('vfx:')
  );
  const sheets=keys.map((key:string)=>({key,filter:g.textures.get(key).source[0]?.scaleMode}));
  const actual=[];
  for(const kind of ['physical','special']){
   controller.state='idle';controller.lockUntil=0;
   controller.attack(s.state.time,kind,'south',.4,true);
   s.applyPokemonAnimation(s.player,controller,s.state.pokemonId,'south',0,s.state.player);
   actual.push({kind,texture:s.player.texture.key,filter:s.player.texture.source[0].scaleMode,frame:s.player.frame.name});
  }
  controller.state='idle';controller.lockUntil=0;
  s.applyPokemonAnimation(s.player,controller,s.state.pokemonId,'south',0,s.state.player);
  actual.push({kind:'idle',texture:s.player.texture.key,filter:s.player.texture.source[0].scaleMode,frame:s.player.frame.name});
  return{sheets,actual};
 });
 // Phaser 3 FilterMode.NEAREST=1; zero is the blurry LINEAR filter.
 expect(samples.sheets.filter((x:any)=>x.key.startsWith('pokemon-action:')).length).toBeGreaterThanOrEqual(12);
 expect(samples.sheets.filter((x:any)=>x.filter!==1)).toEqual([]);
 expect(samples.actual).toEqual([
  expect.objectContaining({kind:'physical',texture:'pokemon-action:charmander:physical',filter:1}),
  expect.objectContaining({kind:'special',texture:'pokemon-action:charmander:special',filter:1}),
  expect.objectContaining({kind:'idle',texture:'charmander-sprite',filter:1})
 ]);
});
