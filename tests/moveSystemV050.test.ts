import {describe,it,expect} from 'vitest';
import {MOVES,POKEMON,TYPES} from '../src/content';
import {BULBASAUR_MOVE_CATALOG,BULBASAUR_FAMILY} from '../src/data/bulbasaurMoves';
import {MOVE_CHAINS,ordinaryPredecessor} from '../src/data/moveChains';
import {MOVE_FUSIONS} from '../src/data/moveFusions';
import {ALL_TM_IDS,TECHNICAL_MACHINES,MOVE_UNLOCKS,TM_RESEARCH_REWARDS} from '../src/data/moveUnlocks';
import {canLearnMove,canEvolveMove,canFuseMove,moveAncestors,hasLineageConflict,moveUnlockRequirements} from '../src/moveEligibility';
import {makeState,applyUpgrade,evolveTo,isUpgradeAvailable,upgradeOptions,rewardRoll,canSpendMoveCredit,stateHash,tick,moveCooldown,Upgrade,SimState} from '../src/simulation';
import {moveCapacity} from '../src/moveProgression';
import {generateMap} from '../src/worldgen';
import {freshSave,loadSave,writeSave,discoverTm,recordSessionEvents,recordEvent} from '../src/save';

const expectedCatalog=[
 'vineWhip','powerWhip','magicalLeaf','leafStorm','bulletSeed','seedBomb','acidSpray','venoshock','sludgeBomb','poisonPowder','toxic',
 'leechSeed','megaDrain','gigaDrain','tackle','takeDown','bodySlam','razorLeaf','petalDance','petalBlizzard','energyBall','sunnyDay',
 'solarBeam','sludgeWave','synthesis','grassyTerrain','ingrain','grassKnot','grassyGlide','trailblaze','grassPledge','frenzyPlant',
 'poisonJab','earthPower','earthquake','growl','growth','sleepPowder','sweetScent','worrySeed','protect','swordsDance','helpingHand',
];
const world=generateMap(502,'forest');
const state=(species='bulbasaur',allTms=false)=>makeState(POKEMON[species],502,world,{discoveredTms:allTms?ALL_TM_IDS:[]});
const choice=(id:string,kind:Upgrade['kind']='move'):Upgrade=>({kind,id,label:id});
function rankFive(s:SimState,id:string){while((s.moveSlots.find(slot=>slot.id===id)?.rank??5)<5)expect(applyUpgrade(s,choice(id))).toBe(true);}
function learnThroughPath(s:SimState,id:string){
 const previous=ordinaryPredecessor(id,s.pokemonId);
 if(previous){learnThroughPath(s,previous.id);rankFive(s,previous.id);expect(applyUpgrade(s,choice(id,'moveEvolution'))).toBe(true);}
 else if(!s.moveSlots.some(slot=>slot.id===id))expect(applyUpgrade(s,choice(id))).toBe(true);
 rankFive(s,id);
}
function memoryStorage(){
 const entries=new Map<string,string>();
 return{get length(){return entries.size;},key:(index:number)=>[...entries.keys()][index]??null,getItem:(key:string)=>entries.get(key)??null,setItem:(key:string,value:string)=>{entries.set(key,value);},removeItem:(key:string)=>{entries.delete(key);},clear:()=>entries.clear()} as Storage;
}

describe('approved v0.5.0 family data',()=>{
 it('contains exactly the approved 43 unique family moves while retaining all existing global moves',()=>{
  expect([...BULBASAUR_MOVE_CATALOG].sort()).toEqual(expectedCatalog.sort());expect(new Set(BULBASAUR_MOVE_CATALOG).size).toBe(43);
  expect(Object.keys(MOVES)).toHaveLength(52);
  for(const species of BULBASAUR_FAMILY)expect(new Set(POKEMON[species].learnset)).toEqual(new Set(expectedCatalog));
  for(const id of ['scratch','ember','dragonRage','metalClaw','dragonClaw','hydroPump','waterGun','bubble','rapidSpin'])expect(MOVES[id]).toBeDefined();
 });
 it('defines valid categories, types, finite rank effects, and sensible cooldowns for every catalog entry',()=>{
  for(const id of BULBASAUR_MOVE_CATALOG){const move=MOVES[id];expect(move.id).toBe(id);expect(TYPES).toContain(move.type);expect(['Physical','Special','Status']).toContain(move.damageClass);expect(move.ranks).toHaveLength(5);expect(move.cooldown).toBeGreaterThan(0);expect(move.range).toBeGreaterThan(0);for(const effect of move.ranks)for(const value of Object.values(effect))expect(Number.isFinite(value)&&value>0).toBe(true);}
  for(const id of ['petalBlizzard','earthquake','poisonJab','seedBomb','powerWhip'])expect(MOVES[id].damageClass).toBe('Physical');
  for(const id of ['petalDance','solarBeam','earthPower','megaDrain','gigaDrain','sludgeWave'])expect(MOVES[id].damageClass).toBe('Special');
 });
 it('uses consistent acyclic chains and valid, reachable fusion inputs',()=>{
  for(const chain of MOVE_CHAINS){expect(chain.stages.length).toBeGreaterThan(1);expect(new Set(chain.stages).size).toBe(chain.stages.length);for(const id of chain.stages){expect(MOVES[id]).toBeDefined();for(const species of chain.family)expect(moveAncestors(id,species)).not.toContain(id);}}
  expect(MOVE_CHAINS.filter(chain=>chain.kind==='upgrade')).toHaveLength(6);
  for(const recipe of MOVE_FUSIONS){expect(recipe.ingredients[0]).not.toBe(recipe.ingredients[1]);expect(recipe.ingredients).not.toContain(recipe.result);for(const id of [...recipe.ingredients,recipe.result])expect(MOVES[id]).toBeDefined();const s=state('venusaur',true);for(const id of recipe.ingredients)learnThroughPath(s,id);expect(canFuseMove(s,recipe.result)).toBe(true);}
 });
 it('keeps legacy TM numbers generation-aware with one stable identity per machine',()=>{
  expect(new Set(ALL_TM_IDS).size).toBe(TECHNICAL_MACHINES.length);
  for(const tm of TECHNICAL_MACHINES){expect(tm.id).toBe(`${tm.generation}:${String(tm.number).padStart(3,'0')}`);expect(MOVES[tm.moveId]).toBeDefined();expect(MOVE_UNLOCKS[tm.moveId].tm).toBe(tm.id);}
  expect(MOVE_UNLOCKS.megaDrain.tm).toBe('gen1:021');expect(MOVE_UNLOCKS.megaDrain.tm).not.toBe('sv:021');
 });
});

describe('general ancestry and apply-time offer validation',()=>{
 it('preserves the signature slot, rank and scheduler across Bulbasaur evolution and retains Power Whip on Venusaur',()=>{
  const s=state(),slot=s.moveSlots[0];expect(slot.id).toBe('vineWhip');Object.assign(slot,{rank:4,nextAttackAt:8.2,cooldownDuration:1.3});
  evolveTo(s,'ivysaur');expect(s.moveSlots[0]).toBe(slot);expect(slot).toMatchObject({id:'powerWhip',rank:4,nextAttackAt:8.2,cooldownDuration:1.3});
  evolveTo(s,'venusaur');expect(s.moveSlots[0]).toBe(slot);expect(slot.id).toBe('powerWhip');expect(canLearnMove(s,'vineWhip')).toBe(false);expect(canLearnMove(s,'tackle')).toBe(true);
 });
 it('blocks Scratch and Metal Claw ancestors in drafts, Poké Ball rewards and stale choices after evolution',()=>{
  const s=state('charmander'),stale=choice('scratch'),slot=s.moveSlots[0];slot.rank=4;evolveTo(s,'charmeleon');s.level=17;
  expect(slot).toMatchObject({id:'metalClaw',rank:4});expect(canLearnMove(s,'scratch')).toBe(false);expect(applyUpgrade(s,stale)).toBe(false);expect(canLearnMove(s,'ember')).toBe(true);
  evolveTo(s,'charizard');
  for(const id of ['scratch','metalClaw']){expect(isUpgradeAvailable(s,choice(id))).toBe(false);expect(applyUpgrade(s,choice(id))).toBe(false);}
  for(let seed=1;seed<60;seed++){s.seed=seed;for(const offer of [...upgradeOptions(s,100),...rewardRoll(s,3)])expect(['scratch','metalClaw']).not.toContain(offer.id);}
  expect(s.moveSlots.map(slot=>slot.id)).toEqual(['dragonClaw']);
  s.moveSlots=[];for(const id of ['scratch','metalClaw'])expect(canLearnMove(s,id)).toBe(false);
 });
 it('merges existing exact or further descendants into the original signature slot without losing investment',()=>{
  for(const duplicate of ['metalClaw','dragonClaw']){const s=state('charmander'),slot=s.moveSlots[0];slot.rank=4;slot.nextAttackAt=123;s.moveSlots.push({id:duplicate,rank:5},{id:'ember',rank:2});evolveTo(s,'charmeleon');expect(s.moveSlots[0]).toBe(slot);expect(slot).toMatchObject({id:duplicate,rank:5,nextAttackAt:123});expect(s.moveSlots.map(slot=>slot.id)).toEqual([duplicate,'ember']);expect(s.moveUpgradeCredits).toBe(4);}
 });
 it('does not suppress shared ordinary moves merely because another family has a signature branch',()=>{
  const bulb=state();expect(canLearnMove(bulb,'tackle')).toBe(true);expect(moveAncestors('powerWhip','bulbasaur')).toEqual(['vineWhip']);
  const water=state('squirtle');evolveTo(water,'wartortle');expect(canLearnMove(water,'tackle')).toBe(false);expect(canLearnMove(water,'bubble')).toBe(true);
 });
 it('keeps already-equipped independent move rank upgrades valid when the current learnset changes, without allowing new incompatible moves',()=>{
  const s=state('charmander');expect(canLearnMove(s,'bubble')).toBe(false);s.moveSlots.push({id:'bubble',rank:2});expect(applyUpgrade(s,choice('bubble'))).toBe(true);expect(s.moveSlots.find(slot=>slot.id==='bubble')?.rank).toBe(3);expect(canLearnMove(s,'waterGun')).toBe(false);
 });
 it('does not soft-lock capped builds when obsolete stages are the only unfilled learnset entries',()=>{
  const s=state('charizard');s.moveSlots=['dragonClaw','ember','dragonRage','tackle'].map(id=>({id,rank:5}));s.items=['magnet','leftovers','scopeLens','luckyEgg'].map(id=>({id,rank:5}));for(const id of Object.keys(s.vitamins) as (keyof typeof s.vitamins)[])s.vitamins[id]=10;
  expect(s.moveSlots.length).toBeLessThan(moveCapacity(s.pokemon,s.level));expect(canSpendMoveCredit(s)).toBe(false);expect(upgradeOptions(s,3,'move')).toEqual([]);expect(upgradeOptions(s)).toEqual([{kind:'heal',id:'heal',label:'Restore 30% HP'}]);
 });
});

describe('ordinary transformation chains and TM gates',()=>{
 it.each(MOVE_CHAINS.filter(chain=>chain.kind==='upgrade'))('$id requires rank five, preserves its slot and rank, and never offers later tiers as NEW MOVE',chain=>{
  const s=state('venusaur',true);learnThroughPath(s,chain.stages[0]);
  for(const id of chain.stages.slice(1)){const previous=ordinaryPredecessor(id,s.pokemonId)!,slot=s.moveSlots.find(slot=>slot.id===previous.id)!;slot.rank=4;expect(canEvolveMove(s,id)).toBe(false);slot.rank=5;slot.nextAttackAt=10;slot.cooldownDuration=2;
   expect(canLearnMove(s,id)).toBe(false);expect(upgradeOptions(s,100).some(offer=>offer.kind==='moveEvolution'&&offer.id===id)).toBe(true);const length=s.moveSlots.length;
   expect(applyUpgrade(s,choice(id,'moveEvolution'))).toBe(true);expect(s.moveSlots).toHaveLength(length);expect(s.moveSlots.find(slot=>slot.id===id)).toBe(slot);expect(slot).toMatchObject({id,rank:5,nextAttackAt:10,cooldownDuration:2});
   expect(canLearnMove(s,previous.id)).toBe(false);expect(applyUpgrade(s,choice(previous.id))).toBe(false);
  }
 });
 it('requires each preceding TM independently and rechecks a stale transformation card',()=>{
  const s=state();expect(canLearnMove(s,'acidSpray')).toBe(false);s.discoveredTms.push('sv:013');learnThroughPath(s,'acidSpray');expect(canEvolveMove(s,'venoshock')).toBe(false);
  s.discoveredTms.push('sv:045');expect(canEvolveMove(s,'venoshock')).toBe(true);const stale=choice('venoshock','moveEvolution');s.discoveredTms=[];expect(applyUpgrade(s,stale)).toBe(false);
  s.discoveredTms=['sv:013','sv:045'];expect(applyUpgrade(s,stale)).toBe(true);expect(canEvolveMove(s,'sludgeBomb')).toBe(false);s.discoveredTms.push('sv:148');expect(applyUpgrade(s,choice('sludgeBomb','moveEvolution'))).toBe(true);
  expect(new Set(moveUnlockRequirements('sludgeWave','bulbasaur'))).toEqual(new Set(['sv:013','sv:045','sv:148','sv:175']));
 });
 it('separates permanent TM discovery from current form restrictions and rare offers',()=>{
  const s=state('bulbasaur',true);for(const id of ['petalDance','frenzyPlant','poisonJab','earthPower','earthquake'])expect(canLearnMove(s,id)).toBe(false);
  evolveTo(s,'ivysaur');expect(canLearnMove(s,'frenzyPlant')).toBe(false);evolveTo(s,'venusaur');for(const id of ['petalDance','frenzyPlant','poisonJab','earthPower','earthquake'])expect(canLearnMove(s,id)).toBe(true);
  let ultimateOffers=0,ordinaryOffers=0;for(let seed=1;seed<=2000;seed++){s.seed=seed*10007;const offers=upgradeOptions(s,3);ultimateOffers+=offers.filter(offer=>offer.id==='frenzyPlant').length;ordinaryOffers+=offers.filter(offer=>offer.id==='razorLeaf').length;}
  expect(ultimateOffers).toBeGreaterThan(0);expect(ultimateOffers).toBeLessThan(ordinaryOffers);
 });
});

describe('two-ingredient fusion transactions',()=>{
 it.each(MOVE_FUSIONS)('$result requires both rank-five inputs and all unlocks; consumes two, creates one and frees one slot exactly once',recipe=>{
  const s=state('venusaur',true);for(const id of recipe.ingredients)learnThroughPath(s,id);
  const unrelated=s.moveSlots[0],before=s.moveSlots.length;expect(canFuseMove(s,recipe.result)).toBe(true);expect(upgradeOptions(s,100).some(offer=>offer.kind==='moveFusion'&&offer.id===recipe.result)).toBe(true);
  const second=s.moveSlots.find(slot=>slot.id===recipe.ingredients[1])!;second.rank=4;expect(canFuseMove(s,recipe.result)).toBe(false);expect(applyUpgrade(s,choice(recipe.result,'moveFusion'))).toBe(false);second.rank=5;
  for(const ingredient of recipe.ingredients){const index=s.moveSlots.findIndex(slot=>slot.id===ingredient),slot=s.moveSlots.splice(index,1)[0];expect(canFuseMove(s,recipe.result)).toBe(false);s.moveSlots.splice(index,0,slot);}
  const required=moveUnlockRequirements(recipe.result,s.pokemonId);for(const tm of required){s.discoveredTms=s.discoveredTms.filter(id=>id!==tm);expect(canFuseMove(s,recipe.result)).toBe(false);s.discoveredTms.push(tm);}
  for(const input of recipe.ingredients)Object.assign(s.moveSlots.find(slot=>slot.id===input)!,{nextAttackAt:999,cooldownDuration:99});
  expect(applyUpgrade(s,choice(recipe.result,'moveFusion'))).toBe(true);expect(s.moveSlots).toHaveLength(before-1);expect(s.moveSlots[0]).toBe(unrelated);
  const output=s.moveSlots.find(slot=>slot.id===recipe.result)!;expect(output.rank).toBe(5);expect(output.nextAttackAt).toBeUndefined();expect(output.cooldownDuration).toBeUndefined();expect(s.fusionHistory).toEqual([recipe.result]);
  const hash=stateHash(s);expect(applyUpgrade(s,choice(recipe.result,'moveFusion'))).toBe(false);expect(stateHash(s)).toBe(hash);
  for(const id of [...recipe.ingredients,...moveAncestors(recipe.result,s.pokemonId)]){expect(canLearnMove(s,id)).toBe(false);expect(applyUpgrade(s,choice(id))).toBe(false);}
  expect(canLearnMove(s,recipe.result)).toBe(false);expect(s.moveSlots.every(slot=>!hasLineageConflict(s,slot.id))).toBe(true);
  tick(s,1/30,{x:0,y:0});expect(output.cooldownDuration).toBe(moveCooldown(s,output));expect(output.nextAttackAt! - s.time).toBeLessThanOrEqual(output.cooldownDuration!);
 });
 it('rejects wrong-form fusion and direct fusion-result acquisition',()=>{
  const s=state('ivysaur',true);s.moveSlots=[{id:'razorLeaf',rank:5},{id:'petalDance',rank:5}];expect(canFuseMove(s,'petalBlizzard')).toBe(false);
  for(const recipe of MOVE_FUSIONS){expect(applyUpgrade(s,choice(recipe.result))).toBe(false);const wrong=state('charmander',true);wrong.moveSlots=recipe.ingredients.map(id=>({id,rank:5}));expect(canFuseMove(wrong,recipe.result)).toBe(false);}
 });
 it('replays unlocks, ordinary transformations and fusion with identical seeds and state hashes',()=>{
  const a=state('venusaur',true),b=state('venusaur',true);for(const s of [a,b]){learnThroughPath(s,'toxic');learnThroughPath(s,'sludgeBomb');expect(applyUpgrade(s,choice('sludgeWave','moveFusion'))).toBe(true);for(let step=0;step<90;step++)tick(s,1/30,{x:step%2,y:0});upgradeOptions(s);}
  expect(stateHash(a)).toBe(stateHash(b));expect(a).toEqual(b);
 });
});

describe('permanent generation-aware TM discovery and additive saves',()=>{
 it.each([1,2])('migrates a version %i save without wiping progress, items, settings or records',version=>{
  const storage=memoryStorage(),original={...freshSave(),version,unlockedPokemon:['bulbasaur','charmander','squirtle','ivysaur'],unlockedItems:['leftovers','charcoal'],unlockedStages:['viridian','mtMoon'],favoritePokemon:[1],research:{caterpie:123,customResearch:7},best:{viridian:{time:800,level:40,defeated:500}},settings:{...freshSave().settings,musicVolume:.3},lastRun:{result:'victory',pokemon:'bulbasaur',stage:'viridian',level:40,time:800,defeated:500},discoveredTms:undefined,tmDiscoveries:undefined};
  storage.setItem('pokemon-survivors-save',JSON.stringify(original));const migrated=loadSave(storage);for(const field of ['unlockedItems','favoritePokemon','best','lastRun'] as const)expect(migrated[field]).toEqual(original[field]);expect(migrated.unlockedPokemon).toEqual([...original.unlockedPokemon,'weedle']);expect(migrated.unlockedStages).toEqual([...original.unlockedStages,'pewterGym']);expect(migrated.research).toMatchObject(original.research);expect(migrated.settings).toMatchObject(original.settings);expect(migrated.discoveredTms).toEqual([]);expect(migrated.tmDiscoveries).toEqual([]);
  writeSave(migrated,storage);expect(loadSave(storage)).toEqual(migrated);
 });
 it('discovers once, preserves machine identity across runs, and rejects unknown machine IDs',()=>{
  const storage=memoryStorage();expect(discoverTm('gen1:021',storage,'trainer')).toBe(true);expect(discoverTm('gen1:021',storage,'quest')).toBe(false);expect(discoverTm('sv:021',storage)).toBe(false);expect(discoverTm('sv:111',storage,'stage')).toBe(true);
  const saved=loadSave(storage);expect(saved.discoveredTms).toEqual(['gen1:021','sv:111']);expect(saved.tmDiscoveries).toEqual([{id:'gen1:021',source:'trainer'},{id:'sv:111',source:'stage'}]);
  const nextRun=makeState(POKEMON.bulbasaur,502,world,{discoveredTms:saved.discoveredTms});learnThroughPath(nextRun,'leechSeed');expect(canEvolveMove(nextRun,'megaDrain')).toBe(true);expect(nextRun.discoveredTms).not.toBe(saved.discoveredTms);
 });
 it('demonstrates only two early research discoveries and keeps advanced machines out of forest rewards',()=>{
  const storage=memoryStorage();recordSessionEvents({caterpie:24,weedle:24},0,storage);expect(loadSave(storage).discoveredTms).toEqual([]);
  recordEvent('defeat','caterpie',storage);expect(loadSave(storage).discoveredTms).toEqual(['sv:056']);recordSessionEvents({weedle:1},1,storage);
  const save=loadSave(storage);expect(new Set(save.discoveredTms)).toEqual(new Set(TM_RESEARCH_REWARDS.map(reward=>reward.tm)));expect(save.discoveredTms).toHaveLength(2);expect(save.research.pokeBalls).toBe(1);
  recordSessionEvents({caterpie:500,weedle:500},0,storage);expect(loadSave(storage).tmDiscoveries).toHaveLength(2);
 });
});
