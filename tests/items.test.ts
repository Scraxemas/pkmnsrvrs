import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ITEMS,aggregateItems,describeItemImprovement,itemApplicable,itemOfferWeight} from '../src/items';
import {MOVES,POKEMON,MoveDef,TYPES} from '../src/content';
import {makeState,spawnSpecies,tick,applyUpgrade,upgradeOptions,isUpgradeAvailable,createGroundHazard,processGroundEffects,playerMovementFactor,stateHash,xpForLevel} from '../src/simulation';
import {moveDamage,hurtPlayer,successfulMove,staggerEnemy} from '../src/itemCombat';
import {stepPickups,dropExperience} from '../src/pickupSystem';
import {candyTier,POKESPRITE_ASSETS} from '../src/itemAssets';
import {CONSUMABLES,useConsumable} from '../src/consumables';
import {generateMap} from '../src/worldgen';
import {RNG} from '../src/random';
import {describeUpgrade} from '../src/upgrades';
import {loadSave} from '../src/save';
const world=generateMap(404,'forest'),idle={x:0,y:0},dt=1/30;
const state=(id='bulbasaur',seed=404)=>makeState(POKEMON[id],seed,world);
const mods=(id:string,rank=5)=>aggregateItems([{id,rank}]);
const target=(s=state())=>{spawnSpecies(s,'caterpie');const e=s.enemies[0];Object.assign(e,{x:s.player.x+80,y:s.player.y,hp:10000,maxHp:10000,speed:0,baseSpeed:0,types:['Normal']});return e;};
const equip=(s:ReturnType<typeof state>,id:string,rank=5)=>{s.items=[{id,rank}];return s;};
const matchingRoll=()=>{for(let seed=0;seed<10000;seed++)if(new RNG(seed).next()<.03)return seed;throw new Error('seed not found');};
const cast=(id:string,item?:string,rank=5)=>{const s=state();if(item)equip(s,item,rank);s.moveSlots=[{id,rank:1}];const e=target(s);if(id==='tackle')e.x=s.player.x+45;s.hp=50;s.time=MOVES[id].cooldown-dt/2;tick(s,dt,idle);return{s,e};};

describe('verified PokéSprite content',()=>{
  it('has 40 distinct items and all 18 type boosters with valid limits and local artwork',()=>{
    expect(Object.keys(ITEMS)).toHaveLength(40);expect(new Set(Object.values(ITEMS).map(i=>i.typeBoost).filter(Boolean))).toEqual(new Set(TYPES));
    for(const item of Object.values(ITEMS)){expect(item.maxRank).toBe(item.id==='focusSash'?1:5);expect(item.sprite).toBe(POKESPRITE_ASSETS[item.id].normal);expect(Object.keys(item.effects).length).toBeGreaterThan(0);}
    for(const id of ['magnet','leftovers','scopeLens','quickClaw','bigRoot','charcoal','mysticWater','miracleSeed'])expect(ITEMS[id]).toBeTruthy();
  });
  it('preserves the bytes and dimensions of all 146 pinned upstream PNGs',()=>{
    const manifest=JSON.parse(readFileSync('assets/pokesprite/imports.json','utf8'));expect(manifest.revision).toBe('c5aaa610ff2acdf7fd8e2dccd181bca8be9fcb3e');expect(manifest.assets).toHaveLength(146);
    for(const asset of manifest.assets){const png=readFileSync(`public/assets/pokesprite/${asset.path}`);expect(createHash('sha256').update(png).digest('hex')).toBe(asset.sha256);expect(png.readUInt32BE(16)).toBe(asset.width);expect(png.readUInt32BE(20)).toBe(asset.height);}
  });
  it.each([[1,'xs'],[8,'xs'],[9,'s'],[24,'s'],[25,'m'],[59,'m'],[60,'l'],[149,'l'],[150,'xl'],[999,'xl']])('renders %i EXP with tier %s',(value,tier)=>expect(candyTier(Number(value))).toBe(tier));
});

describe('real fixed-step attraction and collection',()=>{
  it.each([0,1,2,3,4,5])('uses the exact total attraction radius at Magnet rank %i',(rank)=>{
    const s=state();if(rank)equip(s,'magnet',rank);const radius=64+45*rank;
    s.pickups=[{id:1,x:s.player.x+radius-.1,y:s.player.y,value:5,kind:'xp'},{id:2,x:s.player.x+radius+.1,y:s.player.y,value:7,kind:'xp'},{id:3,x:s.player.x+60,y:s.player.y,value:1,kind:'ball',tier:3}];
    const x=s.pickups[0].x;stepPickups(s,dt,aggregateItems(s.items),[]);expect(s.pickups[0].attracted).toBe(true);expect(s.pickups[0].x).toBeLessThan(x);expect(x-s.pickups[0].x).toBeLessThan(3);expect(s.totalExp).toBe(0);expect(s.pickups[1].attracted).toBeUndefined();expect(s.pickups[2].x).toBe(s.player.x+60);expect(s.pickups[2].attracted).toBeUndefined();
  });
  it('latches outside the original field, follows a moving player across chunks, and floats over obstacles',()=>{
    const s=state(),p={id:1,x:s.player.x+60,y:s.player.y,value:9,kind:'xp' as const};s.pickups=[p];stepPickups(s,dt,aggregateItems([]),[]);s.player.x+=600;s.player.y+=40;
    for(let i=0;i<180;i++){s.player.x+=.2;stepPickups(s,dt,aggregateItems([]),[]);}expect(s.pickups).toHaveLength(0);expect(s.xp).toBe(9);expect(s.totalExp).toBe(9);expect(s.collectedPickups).toHaveLength(1);
  });
  it('awards Lucky Egg bonus once without mutating candy base value',()=>{
    const s=equip(state(),'luckyEgg',2),p={id:1,...s.player,value:10,kind:'xp' as const};s.pickups=[p];for(let i=0;i<20;i++)stepPickups(s,dt,aggregateItems(s.items),[]);expect(s.totalExp).toBeCloseTo(11.2);expect(p.value).toBe(10);expect(s.collectedPickups[0].awardedExp).toBeCloseTo(11.2);
  });
  it('merges only stationary candies, retains every EXP point, and promotes visual tiers',()=>{
    const s=state(),x=s.player.x+500,y=s.player.y;const p=dropExperience(s,x,y,8);dropExperience(s,x+2,y,17);expect(s.pickups).toHaveLength(1);expect(candyTier(p.value)).toBe('m');p.attracted=true;dropExperience(s,x+1,y,12);s.pickups.push({id:++s.eventId,x,y,kind:'ball',value:1,tier:2});dropExperience(s,x+3,y,60);expect(s.pickups.filter(p=>p.kind==='xp').reduce((n,p)=>n+p.value,0)).toBe(97);expect(s.pickups.find(p=>p.kind==='ball')?.value).toBe(1);
  });
  it('keeps ball tier collection events and rewards separate from Magnet',()=>{const s=equip(state(),'magnet');s.pickups=[1,2,3].map(tier=>({id:tier,...s.player,kind:'ball',value:1,tier:tier as 1|2|3}));const events:string[]=[];stepPickups(s,dt,aggregateItems(s.items),events);expect(events).toEqual(['ball-collected:1','ball-collected:2','ball-collected:3']);expect(s.totalExp).toBe(0);});
});

describe('all 40 item effects reach combat or progression',()=>{
  it.each(Object.values(ITEMS).filter(i=>i.typeBoost))('$name boosts only matching damage',(item)=>{
    const s=state(),e=target(s),move:MoveDef={...MOVES.waterGun,type:item.typeBoost!,power:100},base=moveDamage(s,move,e,1,aggregateItems([])).amount;
    expect(moveDamage(s,move,e,1,mods(item.id)).amount).toBeCloseTo(Math.round(base*1.5),0);
    const other={...move,type:TYPES.find(t=>t!==move.type)!};expect(moveDamage(s,other,e,1,mods(item.id)).amount).toBe(moveDamage(s,other,e,1,aggregateItems([])).amount);
  });
  it('Magnet adds no damage or EXP bonus; Zap Plate boosts Electric',()=>{const s=state(),e=target(s),move={...MOVES.ember,type:'Electric' as const};expect(moveDamage(s,move,e,1,mods('magnet')).amount).toBe(moveDamage(s,move,e,1,aggregateItems([])).amount);expect(mods('magnet').experience).toBe(0);expect(moveDamage(s,move,e,1,mods('zapPlate')).amount).toBeGreaterThan(moveDamage(s,move,e,1,aggregateItems([])).amount);});
  it('Leftovers regenerates during authoritative steps and never revives',()=>{const s=equip(state(),'leftovers');s.hp=50;tick(s,1,idle);expect(s.hp).toBeCloseTo(51.25);s.hp=0;tick(s,1,idle);expect(s.hp).toBe(0);});
  it('Scope Lens produces a seeded 1.5x critical hit',()=>{const s=state(),e=target(s);s.seed=matchingRoll();const base=moveDamage(s,MOVES.tackle,e,1,aggregateItems([]));s.seed=matchingRoll();const critical=moveDamage(s,MOVES.tackle,e,1,mods('scopeLens'));expect(critical.critical).toBe(true);expect(critical.amount).toBe(Math.round(base.amount*1.5));});
  it('Quick Claw increases actual automatic activation frequency',()=>{
    const count=(item?:string)=>{const s=state();if(item)equip(s,item);s.moveSlots=[{id:'vineWhip',rank:1}];target(s);let n=0;for(let i=0;i<180;i++){tick(s,dt,idle);n+=s.attacks.length;}return n;};expect(count('quickClaw')).toBeGreaterThan(count());
  });
  it('Big Root improves both direct drain and sustained seed healing',()=>{
    expect(cast('leechSeed','bigRoot').s.hp-50).toBeCloseTo((cast('leechSeed').s.hp-50)*1.75);
    const heal=(item?:string)=>{const s=state();if(item)equip(s,item);s.hp=50;s.moveSlots=[];const e=target(s);e.statuses=[{kind:'seeded',remaining:4,tick:0,sourcePower:20}];tick(s,.5,idle);return s.hp-50;};expect(heal('bigRoot')).toBeCloseTo(heal()*1.75);
  });
  it('Shell Bell triggers once for a multi-target attack and respects its shared cooldown',()=>{const s=state();s.hp=50;successfulMove(s,mods('shellBell'),true,false);successfulMove(s,mods('shellBell'),true,false);expect(s.hp).toBe(51.25);s.time=.61;successfulMove(s,mods('shellBell'),true,false);expect(s.hp).toBe(52.5);});
  it('Rocky Helmet returns contact damage with a cooldown and ignores projectiles',()=>{const s=state(),e=target(s);hurtPlayer(s,1,'contact',mods('rockyHelmet'),e);hurtPlayer(s,1,'contact',mods('rockyHelmet'),e);expect(e.hp).toBe(9990);s.time=.51;hurtPlayer(s,1,'ranged',mods('rockyHelmet'),e);expect(e.hp).toBe(9990);hurtPlayer(s,1,'contact',mods('rockyHelmet'),e);expect(e.hp).toBe(9980);});
  it('Focus Sash is once per run, offers brief grace, and cannot rank up',()=>{const s=equip(state(),'focusSash',1);hurtPlayer(s,999,'ranged',aggregateItems(s.items));expect(s.hp).toBe(1);expect(s.itemRuntime.sashUsed).toBe(true);hurtPlayer(s,999,'contact',aggregateItems(s.items));expect(s.hp).toBe(1);expect(isUpgradeAvailable(s,{kind:'item',id:'focusSash',label:''})).toBe(false);s.time=.81;hurtPlayer(s,999,'ranged',aggregateItems(s.items));expect(s.hp).toBe(0);});
  it('Focus Band has seeded success and failure, grace, and a 12 second trigger cooldown',()=>{const a=state(),b=state();a.seed=matchingRoll();hurtPlayer(a,999,'contact',mods('focusBand'));expect(a.hp).toBe(1);expect(a.itemRuntime.bandReadyAt).toBe(12);a.time=.3;a.seed=matchingRoll();hurtPlayer(a,999,'contact',mods('focusBand'));expect(a.hp).toBe(0);b.seed=1;hurtPlayer(b,999,'contact',mods('focusBand'));expect(b.hp).toBe(0);});
  it('Float Stone increases real movement and stacks with slotless Carbos',()=>{const a=state(),b=equip(state(),'floatStone');a.vitamins.carbos=b.vitamins.carbos=2;tick(a,dt,{x:1,y:0});tick(b,dt,{x:1,y:0});expect(b.player.x-world.playerStart.x).toBeCloseTo((a.player.x-world.playerStart.x)*1.15);});
  it.each([['muscleBand','Physical','Special'],['wiseGlasses','Special','Physical']] as const)('%s modifies only its damage class',(id,matching,other)=>{const s=state(),e=target(s),m={...MOVES.waterGun,damageClass:matching};expect(moveDamage(s,m,e,1,mods(id)).amount).toBeGreaterThan(moveDamage(s,m,e,1,aggregateItems([])).amount);m.damageClass=other;expect(moveDamage(s,m,e,1,mods(id)).amount).toBe(moveDamage(s,m,e,1,aggregateItems([])).amount);});
  it('Expert Belt improves only super-effective hits',()=>{const s=state(),e=target(s);e.types=['Grass'];expect(moveDamage(s,MOVES.ember,e,1,mods('expertBelt')).amount).toBeGreaterThan(moveDamage(s,MOVES.ember,e,1,aggregateItems([])).amount);e.types=['Water'];expect(moveDamage(s,MOVES.ember,e,1,mods('expertBelt')).amount).toBe(moveDamage(s,MOVES.ember,e,1,aggregateItems([])).amount);});
  it('Wide Lens widens an actual projectile impact to catch an off-axis enemy',()=>{
    const hits=(item?:string)=>{const s=state('charmander');if(item)equip(s,item);s.moveSlots=[{id:'ember',rank:1}];const e=target(s);spawnSpecies(s,'caterpie');Object.assign(s.enemies[1],{x:e.x+10,y:e.y+38,hp:10000,maxHp:10000,speed:0,baseSpeed:0});s.time=.74;tick(s,dt,idle);return s.attacks[0].hits.length;};expect(hits()).toBe(1);expect(hits('wideLens')).toBe(2);
  });
  it('Light Clay extends supported status fields and Binding Band increases actual DOT',()=>{
    const a=cast('poisonPowder'),b=cast('poisonPowder','lightClay');expect(b.e.statuses[0].remaining).toBeCloseTo(a.e.statuses[0].remaining*1.6);
    const dot=(item?:string)=>{const s=state();if(item)equip(s,item);s.moveSlots=[];const e=target(s);e.statuses=[{kind:'burn',remaining:4,tick:0,sourcePower:20}];tick(s,.5,idle);return 10000-e.hp;};expect(dot('bindingBand')).toBeCloseTo(dot()*1.6);
  });
  it('Assault Vest guards ranged hits, Safety Goggles guards powder and poison, Boots guards spikes and their slow',()=>{
    const s=state();s.hp=100;hurtPlayer(s,10,'ranged',mods('assaultVest'));expect(s.hp).toBe(94);hurtPlayer(s,10,'contact',mods('assaultVest'));expect(s.hp).toBe(84);
    for(const kind of ['powder','powderProjectile','poison'] as const){s.hp=100;hurtPlayer(s,10,kind,mods('safetyGoggles'));expect(s.hp).toBeCloseTo(98);}
    s.time=1;createGroundHazard(s,'spikes',s.player.x,s.player.y);s.time=2;s.hp=100;processGroundEffects(s,1,mods('heavyDutyBoots'));expect(s.hp).toBeCloseTo(98.4);expect(playerMovementFactor(s,mods('heavyDutyBoots'))).toBeCloseTo(.94);expect(playerMovementFactor(s,aggregateItems([]))).toBeCloseTo(.7);
  });
  it('Life Orb increases real move damage, charges per successful move, respects cooldown, and cannot kill',()=>{const a=cast('tackle'),b=cast('tackle','lifeOrb');expect(10000-b.e.hp).toBeGreaterThan(10000-a.e.hp);expect(b.s.hp).toBeCloseTo(50-b.s.maxHp*.025);const before=b.s.hp;successfulMove(b.s,mods('lifeOrb'),true,false);expect(b.s.hp).toBe(before);b.s.time+=.3;b.s.hp=1;successfulMove(b.s,mods('lifeOrb'),true,false);expect(b.s.hp).toBe(1);});
  it("King's Rock staggers with per-enemy immunity and strictly limited boss duration",()=>{const s=state(),e=target(s);s.seed=matchingRoll();staggerEnemy(s,e,mods('kingsRock'));expect(e.staggerUntil).toBe(.18);s.time=.2;s.seed=matchingRoll();staggerEnemy(s,e,mods('kingsRock'));expect(e.staggerUntil).toBe(.18);e.boss=true;s.time=1.1;s.seed=matchingRoll();staggerEnemy(s,e,mods('kingsRock'));expect(e.staggerUntil).toBeCloseTo(1.16);expect(e.staggerImmuneUntil).toBeCloseTo(3.6);});
  it('a staggered enemy actually stops its movement and attack windup, then resumes',()=>{const s=state(),e=target(s);s.moveSlots=[];e.speed=e.baseSpeed=50;s.seed=matchingRoll();staggerEnemy(s,e,mods('kingsRock'));const x=e.x;tick(s,dt,idle);expect(e.x).toBe(x);for(let i=0;i<10;i++)tick(s,dt,idle);expect(e.x).toBeLessThan(x);});
});

describe('honest offers, caps, consumables and replay',()=>{
  it('uses shared formulas on cards, including baseline Magnet, Lucky Egg and trigger rules',()=>{const s=state();s.items=[{id:'magnet',rank:2},{id:'luckyEgg',rank:1}];expect(describeUpgrade(s,{kind:'item',id:'magnet',label:''}).benefit).toContain('154 → 199');expect(describeUpgrade(s,{kind:'item',id:'luckyEgg',label:''}).benefit).toContain('6% → 12%');for(const item of Object.values(ITEMS))expect(describeItemImprovement(item,0)).not.toContain('NaN');});
  it('filters unusable types, supports future learnset matches, and respects four full slots',()=>{const s=state();for(const id of ['silkScarf','miracleSeed','poisonBarb','bigRoot','lightClay'])expect(itemApplicable(ITEMS[id],s.pokemon,s.moveSlots,MOVES)).toBe(true);for(const id of ['charcoal','zapPlate','wiseGlasses','wideLens'])expect(itemApplicable(ITEMS[id],s.pokemon,s.moveSlots,MOVES)).toBe(false);s.items=['magnet','leftovers','scopeLens','luckyEgg'].map(id=>({id,rank:2}));const options=upgradeOptions(s,100);expect(options.filter(u=>u.kind==='item').every(u=>s.items.some(i=>i.id===u.id))).toBe(true);for(const u of options)expect(isUpgradeAvailable(s,u)).toBe(true);});
  it('weights relevant draining and recovery builds while staying seeded and duplicate-free',()=>{
    expect(itemOfferWeight(ITEMS.bigRoot,false,1,[MOVES.leechSeed])).toBeGreaterThan(itemOfferWeight(ITEMS.bigRoot,false,1,[MOVES.tackle]));
    let low=0,full=0;const fullHp=state(),lowHp=state();lowHp.hp=20;for(let i=0;i<300;i++){fullHp.seed=lowHp.seed=i*12345;const x=upgradeOptions(fullHp),y=upgradeOptions(lowHp);full+=x.filter(u=>u.kind==='item'&&ITEMS[u.id].category==='recovery').length;low+=y.filter(u=>u.kind==='item'&&ITEMS[u.id].category==='recovery').length;expect(new Set(x.map(u=>`${u.kind}:${u.id}`)).size).toBe(x.length);}expect(low).toBeGreaterThan(full*1.4);
    const a=state(),b=state();expect(upgradeOptions(a,20)).toEqual(upgradeOptions(b,20));
  });
  it('caps ranks and slots, rejects duplicate item stacking, and keeps vitamins slotless',()=>{const s=state();for(const id of ['magnet','leftovers','scopeLens','luckyEgg','quickClaw'])for(let i=0;i<9;i++)applyUpgrade(s,{kind:'item',id,label:''});expect(s.items).toHaveLength(4);expect(s.items.every(i=>i.rank===5)).toBe(true);for(const id of Object.keys(s.vitamins))for(let i=0;i<12;i++)applyUpgrade(s,{kind:'vitamin',id,label:''});expect(Object.values(s.vitamins)).toEqual([10,10,10,10,10,10]);expect(s.items).toHaveLength(4);expect(aggregateItems([{id:'magnet',rank:99},{id:'magnet',rank:99}]).attraction).toBe(289);});
  it.each(Object.values(CONSUMABLES))('$name has a real slotless world effect',(item)=>{const s=state();s.hp=1;s.playerStatuses=[{kind:'poison',remaining:3,tick:0,power:2}];s.pickups=[{id:1,...s.player,kind:'consumable',value:1,consumableId:item.id}];tick(s,dt,idle);expect(s.pickups).toHaveLength(0);expect(s.items).toHaveLength(0);if(item.effect==='level')expect(s.level).toBe(2);else if(item.effect==='cure')expect(s.playerStatuses).toHaveLength(0);else expect(s.hp).toBeGreaterThan(1);if(item.effect==='restore')expect(s.playerStatuses).toHaveLength(0);});
  it('leaves unnecessary healing and cures on the ground; Rare Candy respects Level 100',()=>{const s=state();for(const id of ['potion','lumBerry'])expect(useConsumable(s,id)).toBe(false);s.level=99;s.nextXp=xpForLevel(99);expect(useConsumable(s,'rareCandy')).toBe(true);tick(s,dt,idle);expect(s.level).toBe(100);expect(useConsumable(s,'rareCandy')).toBe(false);});
  it('retains legacy Magnet unlocks and existing save progress without resetting',()=>{const old={version:2,unlockedItems:['magnet','leftovers'],unlockedPokemon:['bulbasaur','charmander'],pokedex:['bulbasaur','ivysaur'],research:{enemiesDefeated:765},favoritePokemon:[1],settings:{reducedMotion:true}};const storage={getItem:()=>JSON.stringify(old)} as unknown as Storage,save=loadSave(storage);expect(save.unlockedItems).toContain('magnet');expect(save.research.enemiesDefeated).toBe(765);expect(save.pokedex).toContain('ivysaur');expect(save.favoritePokemon).toEqual([1]);expect(save.settings.reducedMotion).toBe(true);expect(ITEMS[save.unlockedItems[0]].effects).toEqual({attraction:45});});
  it('handles 400 enemies alongside 600 homing candies without losing EXP',()=>{const s=equip(state(),'magnet');s.items.push({id:'luckyEgg',rank:5});s.moveSlots=[];s.hp=s.maxHp=100000;spawnSpecies(s,'caterpie',160);spawnSpecies(s,'weedle',160);spawnSpecies(s,'pidgey',80);for(let i=0;i<600;i++){const a=i*2.4,r=30+i%240;s.pickups.push({id:++s.eventId,x:s.player.x+Math.cos(a)*r,y:s.player.y+Math.sin(a)*r,value:5,kind:'xp'});}const start=performance.now();for(let i=0;i<90;i++)tick(s,dt,idle);const elapsed=performance.now()-start;expect(s.totalExp).toBeCloseTo(3900);expect(s.pickups).toHaveLength(0);expect(s.enemies).toHaveLength(400);expect(elapsed).toBeLessThan(5000);console.log(`400 enemies + 600 candies / 3 simulated seconds: ${elapsed.toFixed(1)}ms`);});
  it('hashes new authoritative state and reproduces a dense candy/item replay without lost or duplicate EXP',()=>{const a=equip(state(),'magnet'),b=equip(state(),'magnet');a.items.push({id:'luckyEgg',rank:5});b.items.push({id:'luckyEgg',rank:5});for(const s of [a,b]){s.moveSlots=[];for(let i=0;i<600;i++){const angle=i*2.4,radius=30+i%240;s.pickups.push({id:++s.eventId,x:s.player.x+Math.cos(angle)*radius,y:s.player.y+Math.sin(angle)*radius,kind:'xp',value:5});}}
    const start=performance.now();for(let i=0;i<90;i++){tick(a,dt,idle);tick(b,dt,idle);}expect(a.totalExp).toBeCloseTo(3900);expect(a.pickups).toHaveLength(0);expect(stateHash(a)).toBe(stateHash(b));expect(performance.now()-start).toBeLessThan(2500);b.itemRuntime.sashUsed=true;expect(stateHash(a)).not.toBe(stateHash(b));console.log(`600-candy dual replay: ${(performance.now()-start).toFixed(1)}ms; EXP ${a.totalExp}`);
  });
});
