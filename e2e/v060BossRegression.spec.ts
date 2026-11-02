import {test,expect} from '@playwright/test';

test('the first Beedrill victory records each pending defeat once and shows its TMs',async({page})=>{
 await page.goto('/?seed=1337');
 await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__);
 await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'charmander',seed:1337}));
 await page.waitForFunction(()=>{
  const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
  return s.state?.time>0&&s.pickupRenderer;
 });
 const result=await page.evaluate(async()=>{
  const game=(window as any).__POKEMON_SURVIVORS__;
  const scene=game.scene.getScene('game');
  const sim=await import('/src/simulation.ts');
  scene.nextSpawn=Infinity;
  scene.miniIndex=99;
  scene.state.enemies=[];
  scene.state.projectiles=[];
  scene.state.bossSpawned=true;
  scene.state.hp=scene.state.maxHp=100000;
  scene.sessionDefeats={caterpie:24,pidgey:30};
  sim.spawnSpecies(scene.state,'beedrill',1,false,true);
  const boss=scene.state.enemies.find((enemy:any)=>enemy.boss);
  if(!boss)throw new Error('Boss spawn failed');
  boss.hp=0;
  scene.step();
  const save=JSON.parse(localStorage.getItem('pokemon-survivors-save')??'{}');
  return {
   ended:scene.ended,
   animation:scene.playerAnimation.state,
   research:save.research,
   discoveredTms:save.discoveredTms,
   tmDiscoveries:save.tmDiscoveries,
   results:game.scene.getScene('results').config?.unlocks,
   sessionDefeats:scene.sessionDefeats,
  };
 });
 expect(result.ended).toBe(true);
 expect(result.animation).not.toBe('defeat');
 expect(result.research).toMatchObject({caterpie:24,pidgey:30,beedrill:1,viridianWins:1});
 expect(result.discoveredTms).toEqual(expect.arrayContaining(['sv:033','sv:111']));
 expect(result.tmDiscoveries.filter((tm:any)=>tm.id==='sv:111')).toHaveLength(1);
 expect(result.sessionDefeats).toEqual({});
 expect(result.results).toEqual(expect.arrayContaining([
  'Pokémon unlocked: Weedle',
  'TM discovered: SV TM033',
  'TM discovered: SV TM111',
 ]));
});

test('Beedrill cancels pre-phase attacks and requires a fresh warning',async({page})=>{
 await page.goto('/?seed=1337');
 await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__);
 const phases=await page.evaluate(async()=>{
  const {makeState,spawnSpecies,tick}=await import('/src/simulation.ts');
  const {POKEMON}=await import('/src/content.ts');
  const output=[];
  for(const [phase,ratio,next] of [[1,.5,2],[2,.25,3]]){
   const state=makeState(POKEMON.charmander,404);
   spawnSpecies(state,'beedrill',1,false,true);
   const boss=state.enemies[0];
   boss.phase=phase;boss.hp=boss.maxHp*ratio;boss.attackWindup=.015;boss.aiCooldown=0;
   const events=tick(state,1/30,{x:0,y:0});
   output.push({next,bossPhase:boss.phase,events,projectiles:state.projectiles.length,hazards:state.hazards.length});
  }
  return output;
 });
 for(const phase of phases){
  expect(phase.bossPhase).toBe(phase.next);
  expect(phase.events).toContain('boss-phase:'+phase.next);
  expect(phase.events).not.toContain('boss-attack');
  expect(phase.events).not.toContain('boss-windup');
  expect(phase.projectiles).toBe(0);
  expect(phase.hazards).toBe(0);
 }
});
