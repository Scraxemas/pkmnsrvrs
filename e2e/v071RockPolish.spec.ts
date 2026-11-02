import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

for(const seed of [7,1337,24680,8675309,20261102]){
 test(`standalone forest rocks and rare dirt, seed ${seed}`,async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await page.goto('/?seed='+seed);
  await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__);
  await page.evaluate(n=>(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'charmander',seed:n}),seed);
  await page.waitForFunction(()=>{
   const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
   return s?.state?.time>.2&&s?.chunkViews?.size>0;
  });
  const result=await page.evaluate(()=>{
   const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
   const rocks=s.state.world.decorations.filter((d:any)=>d.id==='landRock');
   if(!rocks.length)throw new Error('No standalone rocks in resident chunks');
   const rock=rocks[0];
   Object.assign(s.state.player,{x:rock.x-160,y:rock.y+70,vx:0,vy:0});
   s.state.enemies=[];s.nextSpawn=Infinity;s.miniIndex=99;
   s.cameraTarget.setPosition(rock.x,rock.y);s.cameras.main.centerOn(rock.x,rock.y);
   s.syncWorldChunks(true);
   const image=s.worldLayer.list.filter((obj:any)=>obj.getData?.('mapProp')==='landRock');
   const rockSprites=image.map((obj:any)=>({key:obj.texture.key,frame:obj.frame.name,
    width:obj.texture.source[0].width,height:obj.texture.source[0].height,scale:obj.scaleX}));
   const invalidCliffSprites=s.worldLayer.list.filter((obj:any)=>obj.texture?.key?.includes('cliff_atlas'));
   const terrain=s.state.world.terrain.cells;
   return{rockSprites,invalidCliffSprites:invalidCliffSprites.length,
    badTerrain:terrain.filter((t:number)=>t===2||t===4).length,
    dirtFraction:terrain.filter((t:number)=>t===1).length/terrain.length,
    chunkCount:Object.keys(s.state.world.chunks).length};
  });
  expect(result.chunkCount).toBe(9);
  expect(result.badTerrain).toBe(0);
  expect(result.invalidCliffSprites).toBe(0);
  expect(result.dirtFraction).toBeLessThan(.06);
  expect(result.rockSprites.length).toBeGreaterThan(0);
  for(const sprite of result.rockSprites){
   expect(['viridian-frlg/land_rock_small','viridian-frlg/land_boulder']).toContain(sprite.key);
   expect([[28,28],[51,52]]).toContainEqual([sprite.width,sprite.height]);
   expect(sprite.scale).toBe(1);
  }
  mkdirSync('test-results/v071-rock-gallery',{recursive:true});
  await page.screenshot({path:`test-results/v071-rock-gallery/seed-${seed}.png`});
 });
}

test('the forest renderer never reconstructs a cliff from an obsolete tile',async({page})=>{
 await page.goto('/?seed=1337');
 await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__);
 await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'charmander',seed:1337}));
 await page.waitForFunction(()=>((window as any).__POKEMON_SURVIVORS__.scene.getScene('game')?.state?.time??0)>.2);
 const result=await page.evaluate(()=>{
  const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),m=s.state.world;
  const gx=0,gy=0,ix=gx-(m.terrain.originCol??0),iy=gy-(m.terrain.originRow??0);
  m.terrain.cells[iy*m.terrain.cols+ix]=4; // legacy cliff value
  for(const obj of s.chunkViews.get('0,0')??[])obj.destroy();
  s.chunkViews.delete('0,0');s.renderWorldChunk(0,0);
  const fragments=s.worldLayer.list.filter((obj:any)=>obj.texture?.key==='viridian-frlg/cliff_atlas');
  return{fragments:fragments.length,stage:m.biome};
 });
 expect(result).toEqual({fragments:0,stage:'forest'});
});
