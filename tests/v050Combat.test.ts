import {describe,it,expect} from 'vitest';
import {MOVES,POKEMON} from '../src/content';
import {BULBASAUR_MOVE_CATALOG} from '../src/data/bulbasaurMoves';
import {makeState,spawnSpecies,tick,stateHash,playerMovementFactor} from '../src/simulation';
import {activateProfileMove,applyEnemyStatus,combatTargetLimit,MOVE_COMBAT_PROFILES,stepEnemyMoveStatuses,stepMoveRuntime} from '../src/moveCombat';
import {grantMoveBuff,moveOffenseFactor} from '../src/combatRuntime';
import {hurtPlayer,moveDamage} from '../src/itemCombat';
import {aggregateItems} from '../src/items';
import {generateMap} from '../src/worldgen';

const world=generateMap(505,'forest'),mods=aggregateItems([]),idle={x:0,y:0},dt=1/30;
const state=()=>makeState(POKEMON.venusaur,505,world);
function target(s=state(),dx=40,dy=0,boss=false){
 spawnSpecies(s,boss?'beedrill':'caterpie',1,false,boss);const enemy=s.enemies.at(-1)!;
 Object.assign(enemy,{x:s.player.x+dx,y:s.player.y+dy,hp:10000,maxHp:boss?3000:200,speed:0,baseSpeed:0,types:['Normal']});return enemy;
}
function cast(id:string,rank=5){const s=state();s.hp=20;s.moveSlots=[{id,rank,starter:true}];const enemy=target(s);s.seed=1;const event=activateProfileMove(s,s.moveSlots[0],MOVES[id],mods);return{s,enemy,event};}

describe('v0.5.0 composable combat catalog',()=>{
 it('provides explicit mechanics for the complete exact approved catalog',()=>{
  expect(Object.keys(MOVE_COMBAT_PROFILES).sort()).toEqual([...BULBASAUR_MOVE_CATALOG].sort());
  expect(new Set(Object.values(MOVE_COMBAT_PROFILES).map(profile=>profile.pattern)).size).toBeGreaterThanOrEqual(11);
 });
 it.each(BULBASAUR_MOVE_CATALOG)('%s produces its actual damage, status, buff, terrain or recovery effect',id=>{
  const {s,enemy,event}=cast(id);expect(event?.moveId).toBe(id);
  const profile=MOVE_COMBAT_PROFILES[id];
  if(profile.chargeSeconds){expect(event?.phase).toBe('charge');expect(enemy.hp).toBe(10000);s.time=1;stepMoveRuntime(s,dt,mods);expect(s.attacks.some(attack=>attack.phase==='fire'&&attack.moveId===id)).toBe(true);}
  if(MOVES[id].damageClass!=='Status')expect(enemy.hp).toBeLessThan(10000);
  else if(profile.effect)expect(enemy.statuses.some(status=>status.kind===profile.effect)).toBe(true);
  else if(profile.support)expect(s.combatRuntime.buffs.some(buff=>buff.kind===profile.support&&buff.remaining>0)).toBe(true);
  else if(profile.terrain)expect(s.combatRuntime.terrains.some(zone=>zone.moveId===id&&zone.remaining>0)).toBe(true);
  else expect(s.hp).toBeGreaterThan(20);
 });
 it('keeps signature animation tied to real activations, never readiness or terrain ticks',()=>{
  const s=makeState(POKEMON.bulbasaur,505,world);s.moveSlots[0].nextAttackAt=0;tick(s,dt,idle);expect(s.attacks).toEqual([]);
  target(s);s.moveSlots[0].nextAttackAt=s.time;tick(s,dt,idle);expect(s.attacks[0]).toMatchObject({moveId:'vineWhip',phase:'fire',signature:true,animationEligible:true});
  s.moveSlots=[{id:'petalDance',rank:5}];s.seed=1;activateProfileMove(s,s.moveSlots[0],MOVES.petalDance,mods);s.attacks=[];s.time+=1;stepMoveRuntime(s,1,mods);
  expect(s.attacks.filter(event=>event.phase==='pulse').length).toBeGreaterThan(0);
  expect(s.attacks.filter(event=>event.phase==='pulse').every(event=>event.animationEligible===false)).toBe(true);
  expect(cast('synthesis').event?.animationEligible).toBe(false);
 });
 it('retains Charmander and Squirtle direct combat activation and signature metadata',()=>{
  for(const species of ['charmander','charmeleon','charizard','squirtle','wartortle','blastoise']){
   const s=makeState(POKEMON[species],505,world),enemy=target(s,30);s.moveSlots[0].nextAttackAt=0;tick(s,dt,idle);
   expect(enemy.hp).toBeLessThan(10000);expect(s.attacks[0]).toMatchObject({moveId:POKEMON[species].startingMove,signature:true,animationEligible:true,phase:'fire'});
  }
 });
});

describe('distinct targeting and damage identities',()=>{
 it('makes physical seeds a rapid multishot and Seed Bomb an area blast',()=>{
  const a=state(),b=state();const single=target(a),primary=target(b),near=target(b,65,15),far=target(b,135,90);
  a.moveSlots=[{id:'bulletSeed',rank:1}];b.moveSlots=[{id:'seedBomb',rank:1}];
  const base=moveDamage(a,MOVES.bulletSeed,single,1,mods).amount;
  const burst=activateProfileMove(a,a.moveSlots[0],MOVES.bulletSeed,mods)!;
  expect(burst.damage).toBe(base*3);expect(burst.hits).toEqual([single.id]);expect(burst.projectileCount).toBe(3);
  const bomb=activateProfileMove(b,b.moveSlots[0],MOVES.seedBomb,mods)!;
  expect(bomb.hits).toContain(primary.id);expect(bomb.hits).toContain(near.id);expect(bomb.hits).not.toContain(far.id);
 });
 it('turns count-only rank improvements into additional real targets',()=>{
  for(const id of ['magicalLeaf','acidSpray','venoshock','poisonJab','megaDrain']){
   const hitCounts=[1,3].map(rank=>{const s=state();for(let i=0;i<8;i++)target(s,40+i*2,i%2*4);s.moveSlots=[{id,rank}];return activateProfileMove(s,s.moveSlots[0],MOVES[id],mods)!.hits.length;});
   expect(hitCounts[1],id).toBeGreaterThan(hitCounts[0]);expect(combatTargetLimit(MOVES[id],3)).toBeGreaterThan(combatTargetLimit(MOVES[id],1));
  }
 });
 it('uses poison synergy and real reduced defenses rather than only bigger base power',()=>{
  const baseline=cast('venoshock'),s=state(),enemy=target(s);s.moveSlots=[{id:'venoshock',rank:5}];
  applyEnemyStatus(s,enemy,'poison',10,4);const boosted=activateProfileMove(s,s.moveSlots[0],MOVES.venoshock,mods)!;
  expect(boosted.damage).toBeGreaterThan(baseline.event!.damage*1.7);
  const before=moveDamage(s,MOVES.earthPower,enemy,1,mods).amount;
  applyEnemyStatus(s,enemy,'defenseBreak',0,3);expect(moveDamage(s,MOVES.earthPower,enemy,1,mods).amount).toBeGreaterThan(before);
 });
 it('scales Grass Knot against large enemies while limiting the bonus',()=>{
  const values=[100,3000,100000].map(hp=>{const s=state(),enemy=target(s);enemy.maxHp=hp;s.moveSlots=[{id:'grassKnot',rank:1}];return activateProfileMove(s,s.moveSlots[0],MOVES.grassKnot,mods)!.damage;});
  expect(values[1]).toBeGreaterThan(values[0]);expect(values[2]).toBe(values[1]);
 });
 it('distinguishes Earth Power columns from the broad Physical Earthquake',()=>{
  const power=state(),quake=state();for(const s of [power,quake])for(let i=0;i<12;i++)target(s,Math.cos(i)*100,Math.sin(i)*100);
  power.moveSlots=[{id:'earthPower',rank:1}];quake.moveSlots=[{id:'earthquake',rank:1}];
  const columns=activateProfileMove(power,power.moveSlots[0],MOVES.earthPower,mods)!,radial=activateProfileMove(quake,quake.moveSlots[0],MOVES.earthquake,mods)!;
  expect(MOVES.earthPower.damageClass).toBe('Special');expect(MOVES.earthquake.damageClass).toBe('Physical');expect(radial.hits.length).toBeGreaterThan(columns.hits.length);
 });
 it('charges Solar Beam before damage and emits one attack-animation start',()=>{
  const {s,enemy,event}=cast('solarBeam');expect(event).toMatchObject({phase:'charge',damage:0,hits:[],animationEligible:true});
  s.time=.2;stepMoveRuntime(s,.2,mods);expect(enemy.hp).toBe(10000);expect(s.combatRuntime.charges).toHaveLength(1);
  s.time=.8;stepMoveRuntime(s,.6,mods);expect(enemy.hp).toBeLessThan(10000);expect(s.attacks.at(-1)).toMatchObject({phase:'fire',animationEligible:false});expect(s.combatRuntime.charges).toEqual([]);
  expect(s.combatRuntime.buffs.some(buff=>buff.kind==='sunlight')).toBe(true);
 });
 it('applies Take Down recoil without self-defeat and Trailblaze speeds movement temporarily',()=>{
  const {s,enemy}=cast('takeDown');expect(enemy.hp).toBeLessThan(10000);expect(s.feedback.some(feedback=>feedback.kind==='recoil'&&feedback.source==='takeDown')).toBe(true);
  s.hp=1;activateProfileMove(s,s.moveSlots[0],MOVES.takeDown,mods);expect(s.hp).toBe(1);
  const trail=cast('trailblaze');expect(playerMovementFactor(trail.s)).toBeGreaterThan(1);trail.s.time+=5;stepMoveRuntime(trail.s,5,mods);expect(playerMovementFactor(trail.s)).toBe(1);
 });
 it('preserves the pre-charge origin for native facing and VFX when an advancing strike passes a close target',()=>{
  const s=state(),before={x:s.player.x,y:s.player.y};target(s,5);s.moveSlots=[{id:'takeDown',rank:5}];
  const event=activateProfileMove(s,s.moveSlots[0],MOVES.takeDown,mods)!;
  expect([event.x,event.y]).toEqual([before.x,before.y]);expect(event.tx).toBeGreaterThan(event.x);expect(s.player.x).toBeGreaterThan(before.x);
 });
});

describe('bounded statuses, recovery and support',()=>{
 it('escalates one Toxic status without stacking a second ordinary poison',()=>{
  const s=state(),enemy=target(s);applyEnemyStatus(s,enemy,'poison',10,4);applyEnemyStatus(s,enemy,'toxic',10,7);applyEnemyStatus(s,enemy,'toxic',10,7);applyEnemyStatus(s,enemy,'poison',30,7);
  expect(enemy.statuses).toHaveLength(1);expect(enemy.statuses[0].kind).toBe('toxic');
  const hp=enemy.hp;stepEnemyMoveStatuses(s,enemy,.5,mods);const first=hp-enemy.hp;
  for(let n=0;n<7;n++)stepEnemyMoveStatuses(s,enemy,.5,mods);const laterHp=enemy.hp;stepEnemyMoveStatuses(s,enemy,.5,mods);
  expect(laterHp-enemy.hp).toBeGreaterThan(first);expect(enemy.statuses[0].elapsed).toBe(4.5);
 });
 it('gives bosses short control and an immunity window; normal sleep actually stops attacks',()=>{
  const s=state(),boss=target(s,20,0,true),ordinary=target(s,60);expect(applyEnemyStatus(s,boss,'sleep',0,5)).toBe(true);expect(boss.statuses[0].remaining).toBe(.35);
  expect(applyEnemyStatus(s,boss,'sleep',0,5)).toBe(false);expect(applyEnemyStatus(s,ordinary,'sleep',0,2)).toBe(true);
  const x=ordinary.x,y=ordinary.y;s.moveSlots=[];tick(s,dt,idle);expect([ordinary.x,ordinary.y]).toEqual([x,y]);expect([ordinary.vx,ordinary.vy]).toEqual([0,0]);
  s.time=3;expect(applyEnemyStatus(s,boss,'sleep',0,5)).toBe(true);
 });
 it('Growl and Worry Seed reduce incoming attacks and Sweet Scent increases received damage',()=>{
  const s=state(),enemy=target(s);s.hp=100;hurtPlayer(s,20,'contact',mods,enemy);expect(s.hp).toBe(80);
  applyEnemyStatus(s,enemy,'weaken',0,3);s.hp=100;hurtPlayer(s,20,'contact',mods,enemy);expect(s.hp).toBe(85);
  applyEnemyStatus(s,enemy,'worried',0,3);s.hp=100;hurtPlayer(s,20,'contact',mods,enemy);expect(s.hp).toBeGreaterThan(85);
  const before=moveDamage(s,MOVES.energyBall,enemy,1,mods).amount;applyEnemyStatus(s,enemy,'exposed',0,3);expect(moveDamage(s,MOVES.energyBall,enemy,1,mods).amount).toBeGreaterThan(before);
 });
 it('refreshes offensive buffs without unbounded stacking and expires them',()=>{
  const s=state();for(let n=0;n<100;n++)grantMoveBuff(s,'growth','growth',.2,4);expect(s.combatRuntime.buffs).toHaveLength(1);
  grantMoveBuff(s,'swordsDance','swordsDance',.65,4);grantMoveBuff(s,'helpingHand','helpingHand',.65,4);grantMoveBuff(s,'sunlight','sunnyDay',.65,4);
  expect(moveOffenseFactor(s,'Physical','Grass')).toBeLessThanOrEqual(2.1);
  stepMoveRuntime(s,5,mods);expect(s.combatRuntime.buffs).toEqual([]);expect(moveOffenseFactor(s,'Physical','Grass')).toBe(1);
 });
 it('Protect reduces damage during a brief window but never gives invulnerability',()=>{
  const {s}=cast('protect');s.hp=100;hurtPlayer(s,20,'ranged',mods);expect(s.hp).toBeGreaterThan(80);expect(s.hp).toBeLessThan(100);
  stepMoveRuntime(s,2,mods);s.hp=100;hurtPlayer(s,20,'ranged',mods);expect(s.hp).toBe(80);
 });
 it('keeps combined move healing under the burst and sustained budget and never revives',()=>{
  const s=state();s.moveSlots=[{id:'synthesis',rank:5}];let healed=0;
  for(let i=0;i<101;i++){s.time=i*.1;s.hp=1;activateProfileMove(s,s.moveSlots[0],MOVES.synthesis,mods);healed+=s.hp-1;}
  expect(healed).toBeLessThanOrEqual(s.maxHp*(.2+.06*10)+.001);
  s.hp=0;activateProfileMove(s,s.moveSlots[0],MOVES.synthesis,mods);expect(s.hp).toBe(0);
 });
 it('does not spend the recovery budget when automatic healing has no missing HP',()=>{
  const s=state();s.moveSlots=[{id:'synthesis',rank:5}];const before=s.combatRuntime.healingTokens;
  activateProfileMove(s,s.moveSlots[0],MOVES.synthesis,mods);expect(s.combatRuntime.healingTokens).toBe(before);
  s.hp=s.maxHp-2;activateProfileMove(s,s.moveSlots[0],MOVES.synthesis,mods);expect(s.hp).toBe(s.maxHp);expect(s.combatRuntime.healingTokens).toBeCloseTo(before-2);
 });
 it('draining tiers use Special damage and return bounded HP to the user',()=>{
  for(const id of ['megaDrain','gigaDrain']){const {s,enemy,event}=cast(id);expect(MOVES[id].damageClass).toBe('Special');expect(enemy.hp).toBeLessThan(10000);expect(s.hp).toBeGreaterThan(20);expect(s.hp-20).toBeLessThanOrEqual(s.maxHp*.2);expect(event!.damage).toBeGreaterThan(0);}
 });
 it('Ingrain follows the moving player and terrain refresh remains bounded',()=>{
  const {s}=cast('ingrain');for(let n=0;n<100;n++)activateProfileMove(s,s.moveSlots[0],MOVES.ingrain,mods);
  expect(s.combatRuntime.terrains).toHaveLength(1);expect(s.combatRuntime.buffs).toHaveLength(1);expect(playerMovementFactor(s)).toBe(1);
  const x=s.player.x;s.player.x+=30;stepMoveRuntime(s,1,mods);expect(s.combatRuntime.terrains[0].x).toBe(x+30);
  tick(s,dt,{x:1,y:0});expect(s.player.x).toBeGreaterThan(x+30);expect(s.combatRuntime.terrains[0].followPlayer).toBe(true);
 });
 it.each(['ingrain','grassyTerrain'])('%s periodically reforms its visual zone without a new attack animation',(id)=>{
  const {s}=cast(id),zone=s.combatRuntime.terrains[0],origin={x:zone.x,y:zone.y};
  s.player.x+=40;s.player.y+=20;s.attacks=[];s.time+=1;stepMoveRuntime(s,1,mods);
  const expected=id==='ingrain'?s.player:origin;
  expect(s.attacks).toHaveLength(1);expect(s.attacks[0]).toMatchObject({moveId:id,phase:'pulse',damage:0,hits:[],animationEligible:false,x:expected.x,y:expected.y,tx:expected.x,ty:expected.y});
  s.attacks=[];s.time+=1;stepMoveRuntime(s,1,mods);expect(s.attacks).toHaveLength(1);expect(s.attacks[0].animationEligible).toBe(false);
  s.attacks=[];s.time+=20;stepMoveRuntime(s,20,mods);expect(s.combatRuntime.terrains).toEqual([]);expect(s.attacks).toEqual([]);
 });
});

describe('determinism and dense combat budgets',()=>{
 it('hashes all new authoritative runtime and unlock state',()=>{
  const a=state(),b=state();expect(stateHash(a)).toBe(stateHash(b));b.discoveredTms.push('sv:033');expect(stateHash(a)).not.toBe(stateHash(b));b.discoveredTms=[];b.fusionHistory.push('solarBeam');expect(stateHash(a)).not.toBe(stateHash(b));b.fusionHistory=[];grantMoveBuff(b,'growth','growth',.2,4);expect(stateHash(a)).not.toBe(stateHash(b));
 });
 it('replays a 400-enemy five-move battle with bounded timed effects',()=>{
  const run=()=>{const s=state();s.hp=s.maxHp=100000;s.combatRuntime.healingTokens=s.maxHp*.2;s.moveSlots=['solarBeam','sludgeWave','petalBlizzard','gigaDrain','ingrain'].map(id=>({id,rank:5}));
   spawnSpecies(s,'caterpie',400);for(let i=0;i<s.enemies.length;i++){const enemy=s.enemies[i];enemy.x=s.player.x+Math.cos(i)*((i%12)*22+40);enemy.y=s.player.y+Math.sin(i)*((i%12)*22+40);enemy.hp=enemy.maxHp=10000;}
   for(let frame=0;frame<150;frame++){tick(s,dt,idle);expect(s.combatRuntime.terrains.length).toBeLessThanOrEqual(6);expect(s.combatRuntime.buffs.length).toBeLessThanOrEqual(12);expect(s.combatRuntime.charges.length).toBeLessThanOrEqual(5);expect(s.attacks.length).toBeLessThanOrEqual(16);}
   return s;};
  const start=performance.now(),a=run(),b=run(),elapsed=performance.now()-start;console.log(`v050 dense dual replay: ${elapsed.toFixed(1)}ms; enemies=${a.enemies.length}; terrains=${a.combatRuntime.terrains.length}; buffs=${a.combatRuntime.buffs.length}`);
  expect(stateHash(a)).toBe(stateHash(b));expect(a).toEqual(b);expect(Number.isFinite(a.hp)).toBe(true);expect(elapsed).toBeLessThan(15000);
 });
});
