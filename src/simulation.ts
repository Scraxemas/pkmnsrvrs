import { ENEMIES, ITEMS, MOVES, MoveDef, POKEMON, PokemonDef, PokemonType } from './content';
import { Facing, facingFromVector } from './direction';
import { buildFlowField, FlowField, flowDirection, hasLineOfSight } from './navigation';
import { collides, generateMap, StageMap } from './worldgen';
import {startingStats} from './playerStats';
import {aggregateItems,ItemModifiers,itemApplicable,itemOfferWeight} from './items';
import {freshItemRuntime,hurtPlayer,ItemFeedback,ItemRuntime,moveDamage,restoreHp,staggerEnemy,successfulMove} from './itemCombat';
import {CollectedPickup,dropConsumable,dropExperience,stepPickups} from './pickupSystem';
import {rankEffect,moveRankStats} from './moveEffects';
import {moveCapacity} from './moveProgression';
import {ProgressionNotice,transformStarterMove} from './moveEvolution';
import {RNG,seededRoll} from './random';
export {RNG} from './random';
export {rankEffect} from './moveEffects';
export interface Status { kind:'poison'|'burn'|'slow'|'seeded'; remaining:number; tick:number; sourcePower:number; }
export interface Entity { id:number; species:string; name:string; types:PokemonType[]; x:number; y:number; vx:number; vy:number; facing:Facing; hp:number; maxHp:number; speed:number; baseSpeed:number; elite:boolean; boss:boolean; behavior:string; xp:number; statuses:Status[]; aiCooldown:number; attackWindup:number; phase:number; blockedFor:number; avoidSign:1|-1;staggerUntil?:number;staggerImmuneUntil?:number; }
export interface EnemyProjectile { id:number;x:number;y:number;vx:number;vy:number;radius:number;damage:number;ttl:number;type:PokemonType;source:string; }
export interface Pickup { id:number; x:number; y:number; value:number; kind:'xp'|'ball'|'consumable'; tier?:1|2|3;consumableId?:string;attracted?:boolean;attractionSpeed?:number;attractedAt?:number; }
export interface AttackEvent { id:number; moveId:string; kind:MoveDef['kind']; type:PokemonType; x:number;y:number;tx:number;ty:number;radius:number;hits:number[];damage:number;critical?:boolean;impacts?:{x:number;y:number}[]; }
export interface PlayerStatus {kind:'poison'|'slow';remaining:number;tick:number;power:number;}
export interface GroundHazard {id:number;kind:'spikes'|'powder';x:number;y:number;radius:number;damage:number;slow:number;armedAt:number;expiresAt:number;}
export interface MoveSlot { id:string; rank:number;starter?:boolean;evolutionPower?:number;nextAttackAt?:number;cooldownDuration?:number; }
export interface HeldItem { id:string; rank:number; }
export type Vitamin='hpUp'|'protein'|'iron'|'calcium'|'zinc'|'carbos';
export type Mastery='overcharge'|'multicast'|'expansion'|'sustain'|'efficiency';
export interface SimState { time:number;level:number;xp:number;nextXp:number;hp:number;maxHp:number;player:{x:number;y:number;vx:number;vy:number;facing:Facing};pokemonId:string;pokemon:PokemonDef;world:StageMap;navigation:FlowField;navigationRebuilds:number;enemies:Entity[];projectiles:EnemyProjectile[];pickups:Pickup[];attacks:AttackEvent[];defeated:number;seed:number;bossSpawned:boolean;moveSlots:MoveSlot[];items:HeldItem[];vitamins:Record<Vitamin,number>;masteries:Partial<Record<Mastery,number>>;evolvedAt:string[];powerBonus:number;cooldownBonus:number;rangeBonus:number;eventId:number;collisionChecks:number;encounterPhase:string;maxRangedEnemies:number;maxEnemyProjectiles:number;itemRuntime:ItemRuntime;playerStatuses:PlayerStatus[];hazards:GroundHazard[];feedback:ItemFeedback[];collectedPickups:CollectedPickup[];totalExp:number;unlockedMoveSlots:number;moveUpgradeCredits:number;progressionNotices:ProgressionNotice[]; }
const vitaminBase=():Record<Vitamin,number>=>({hpUp:0,protein:0,iron:0,calcium:0,zinc:0,carbos:0});
export function xpForLevel(level:number){return level>=100?Number.POSITIVE_INFINITY:Math.floor(12+level*4+level*level*.22);}
export function makeState(p:PokemonDef,seed=1,world:StageMap=generateMap(seed,'forest')):SimState {const hp=startingStats(p).hp,player={...world.playerStart,vx:0,vy:0,facing:'south' as Facing};return {time:0,level:1,xp:0,nextXp:xpForLevel(1),hp,maxHp:hp,player,pokemonId:p.id,pokemon:p,world,navigation:buildFlowField(world,player.x,player.y,64),navigationRebuilds:1,enemies:[],projectiles:[],pickups:[],attacks:[],defeated:0,seed,bossSpawned:false,moveSlots:[{id:p.startingMove,rank:1,starter:true}],items:[],vitamins:vitaminBase(),masteries:{},evolvedAt:[],powerBonus:1,cooldownBonus:1,rangeBonus:1,eventId:0,collisionChecks:0,encounterPhase:'unconfigured',maxRangedEnemies:99,maxEnemyProjectiles:40,itemRuntime:freshItemRuntime(),playerStatuses:[],hazards:[],feedback:[],collectedPickups:[],totalExp:0,unlockedMoveSlots:moveCapacity(p,1),moveUpgradeCredits:0,progressionNotices:[]};}
export function setEncounterLimits(state:SimState,phase:string,maxRangedEnemies:number,maxEnemyProjectiles:number){state.encounterPhase=phase;state.maxRangedEnemies=maxRangedEnemies;state.maxEnemyProjectiles=maxEnemyProjectiles;}
export function spawnSpecies(state:SimState,species:string,count=1,elite=false,boss=false){const def=ENEMIES[species]??ENEMIES.caterpie,rng=new RNG(state.seed);for(let i=0;i<count;i++){let x=state.player.x,y=state.player.y;for(let tries=0;tries<20;tries++){const angle=rng.next()*Math.PI*2,distance=(boss?480:520)+rng.next()*260;x=Math.max(32,Math.min(state.world.width-32,state.player.x+Math.cos(angle)*distance));y=Math.max(32,Math.min(state.world.height-32,state.player.y+Math.sin(angle)*distance));if(!collides(state.world,x,y,18)&&Math.hypot(x-state.player.x,y-state.player.y)>420)break;}const hp=def.hp*(boss?1:elite?1.8:1)*(1+state.time/1600);state.enemies.push({id:++state.eventId,species:def.id,name:def.name,types:def.types,x,y,vx:0,vy:0,facing:'south',hp,maxHp:hp,speed:def.speed,baseSpeed:def.speed,elite,boss,behavior:def.behavior,xp:boss?100:elite?Math.round(def.xp*2):def.xp,statuses:[],aiCooldown:1+rng.next(),attackWindup:0,phase:1,blockedFor:0,avoidSign:rng.next()<.5?-1:1});}state.seed=rng.seed;}
export function spawn(state:SimState,count:number,elite=false,boss=false){spawnSpecies(state,boss?'beedrill':elite?'pidgeotto':'caterpie',count,elite,boss);}
export function reachablePickupPosition(state:Pick<SimState,'navigation'|'world'|'player'>,x:number,y:number){
 const field=state.navigation,valid=(px:number,py:number)=>!collides(state.world,px,py,10)&&field.distances[Math.floor(py/field.cellSize)*field.cols+Math.floor(px/field.cellSize)]>=0;
 if(valid(x,y))return{x,y};
 const cx=Math.floor(x/field.cellSize),cy=Math.floor(y/field.cellSize);
 for(let radius=1;radius<=10;radius++)for(let oy=-radius;oy<=radius;oy++)for(let ox=-radius;ox<=radius;ox++){
  if(Math.abs(ox)!==radius&&Math.abs(oy)!==radius)continue;const px=(cx+ox+.5)*field.cellSize,py=(cy+oy+.5)*field.cellSize;if(valid(px,py))return{x:px,y:py};
 }
 return{x:state.player.x,y:state.player.y};
}
function applyStatus(e:Entity,kind:Status['kind'],power:number,duration:number){const old=e.statuses.find(s=>s.kind===kind);if(old){old.remaining=Math.max(old.remaining,duration);old.sourcePower=Math.max(old.sourcePower,power);}else e.statuses.push({kind,remaining:duration,tick:0,sourcePower:power});}
function activate(state:SimState,slot:MoveSlot,move:MoveDef,mods:ItemModifiers):AttackEvent|undefined {
 const fx=moveRankStats(move,slot.rank),range=fx.rangeUnits*state.rangeBonus*(1+(state.masteries.expansion??0)*.12),candidates=state.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-state.player.x,e.y-state.player.y)<=range).sort((a,b)=>Math.hypot(a.x-state.player.x,a.y-state.player.y)-Math.hypot(b.x-state.player.x,b.y-state.player.y));if(!candidates.length)return;
 const limit=move.kind==='cloud'?fx.targetCount:8;let count=Math.max(1,Math.round((move.kind==='piercing'?fx.pierce:fx.count)+(state.masteries.multicast??0)*.5));if(move.kind==='spin'||move.kind==='cloud')count=candidates.length;
 const primary=candidates[0],dx=primary.x-state.player.x,dy=primary.y-state.player.y,length=Math.hypot(dx,dy)||1;
 const aiming=move.kind==='piercing'?candidates.filter(e=>((e.x-state.player.x)*dx+(e.y-state.player.y)*dy)/length>=0&&Math.abs((e.x-state.player.x)*dy-(e.y-state.player.y)*dx)/length<=mods.impact+14):candidates;
 const targets=aiming.slice(0,Math.min(count,limit));
 if(mods.impact>8&&['projectile','piercing','spread','fixed'].includes(move.kind)){
  const primary=targets[0],dx=primary.x-state.player.x,dy=primary.y-state.player.y,length=Math.hypot(dx,dy)||1;
  for(const candidate of candidates){if(targets.length>=8)break;if(targets.includes(candidate))continue;const along=((candidate.x-state.player.x)*dx+(candidate.y-state.player.y)*dy)/length,cross=Math.abs((candidate.x-state.player.x)*dy-(candidate.y-state.player.y)*dx)/length;
   if(targets.some(target=>Math.hypot(candidate.x-target.x,candidate.y-target.y)<=mods.impact+14)||(move.kind==='piercing'&&along>=0&&cross<=mods.impact+14))targets.push(candidate);
  }
 }
 let dealt=0,critical=false,applied=false;
 for(const target of targets){
  if(move.damageClass!=='Status'||move.kind==='drain'){const hit=moveDamage(state,move,target,slot.rank,mods),amount=hit.amount*(move.kind==='spin'?fx.count:1);target.hp-=amount;dealt+=amount;critical||=hit.critical;if(amount>0)staggerEnemy(state,target,mods);if(move.kind==='drain')restoreHp(state,move.power*(1+mods.drain),'bigRoot');}
  if(move.status&&seededRoll(state)<fx.statusChance){applied=true;applyStatus(target,move.status,moveDamage(state,{...move,damageClass:'Special'},target,slot.rank,mods,true).amount,fx.statusSeconds*(1+mods.duration));}
  if(move.kind==='charge'||move.kind==='piercing'||move.kind==='spin'){const dx=target.x-state.player.x,dy=target.y-state.player.y,d=Math.hypot(dx,dy)||1,push=move.kind==='spin'?18:10,nx=target.x+dx/d*push,ny=target.y+dy/d*push;if(!collides(state.world,nx,ny,14)){target.x=nx;target.y=ny;}}
 }
 successfulMove(state,mods,dealt>0,applied);const target=targets[0];return{id:++state.eventId,moveId:move.id,kind:move.kind,type:move.type,x:state.player.x,y:state.player.y,tx:target.x,ty:target.y,radius:range,hits:targets.map(e=>e.id),impacts:targets.map(e=>({x:e.x,y:e.y})),damage:dealt,critical};
}
function processStatuses(state:SimState,e:Entity,dt:number,mods:ItemModifiers){e.speed=e.baseSpeed;for(const status of e.statuses){status.remaining-=dt;status.tick+=dt;if(status.kind==='slow')e.speed*=.65;if(status.tick>=.5){status.tick-=.5;if(status.kind==='poison'||status.kind==='burn'||status.kind==='seeded'){e.hp-=status.sourcePower*.18*(1+mods.sustained);if(status.kind==='seeded')restoreHp(state,status.sourcePower*.08*(1+mods.drain),'leechSeed');}}}e.statuses=e.statuses.filter(status=>status.remaining>0);}
export function syncMoveCapacity(state:SimState){const capacity=moveCapacity(state.pokemon,state.level);for(let slot=state.unlockedMoveSlots+1;slot<=capacity;slot++)state.progressionNotices.push({kind:'slot',slot});state.unlockedMoveSlots=Math.max(state.unlockedMoveSlots,capacity);}
/** Called by level evolution today; item/branch triggers can pass their explicit target to the same transition. */
export function evolveTo(state:SimState,next:string,events:string[]=[]){if(!POKEMON[next]||state.evolvedAt.includes(next)||next===state.pokemonId)return;const previous=state.pokemonId,oldMax=state.maxHp;state.pokemon=POKEMON[next];state.pokemonId=next;state.evolvedAt.push(next);state.maxHp=state.pokemon.stats.hp*3+state.vitamins.hpUp*5;if(state.hp>0)state.hp=Math.min(state.maxHp,state.hp+(state.maxHp-oldMax));const notices=transformStarterMove(state.moveSlots,previous,next);state.progressionNotices.push(...notices);for(const notice of notices)if(notice.kind==='move')state.moveUpgradeCredits+=notice.refund;syncMoveCapacity(state);events.push(`evolution:${next}`);}
function evolve(state:SimState,events:string[]){const next=state.pokemon.evolvesTo,threshold=state.pokemon.evolutionLevel;if(next&&threshold&&state.level>=threshold)evolveTo(state,next,events);syncMoveCapacity(state);}
function fireEnemyProjectile(state:SimState,e:Entity,angle:number,speed=120){const cap=Math.max(state.maxEnemyProjectiles,e.boss?24:0);if(state.projectiles.length>=cap)return false;state.projectiles.push({id:++state.eventId,x:e.x,y:e.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,radius:e.boss?8:5,damage:e.boss?12:6,ttl:5,type:e.species==='pidgey'||e.species==='pidgeotto'?'Flying':e.species==='beedrill'?'Poison':'Bug',source:e.species});return true;}
function moveEnemy(state:SimState,e:Entity,dirX:number,dirY:number,distance:number,dt:number){
 const oldX=e.x,oldY=e.y,length=Math.hypot(dirX,dirY)||1,dx=dirX/length*distance,dy=dirY/length*distance;
 const attempts=e.blockedFor>.55
  ? [[-dirY*e.avoidSign,dirX*e.avoidSign],[dirX,dirY],[dirY*e.avoidSign,-dirX*e.avoidSign]]
  : [[dirX,dirY],[-dirY*e.avoidSign,dirX*e.avoidSign],[dirY*e.avoidSign,-dirX*e.avoidSign]];
 for(const [ax,ay] of attempts){
  const al=Math.hypot(ax,ay)||1,mx=ax/al*Math.hypot(dx,dy),my=ay/al*Math.hypot(dx,dy);
  state.collisionChecks++;
  if(!collides(state.world,e.x+mx,e.y+my,14)){e.x+=mx;e.y+=my;break;}
  // Axis attempts provide smooth wall sliding while preserving circle collision.
  state.collisionChecks++;
  if(!collides(state.world,e.x+mx,e.y,14))e.x+=mx;
  state.collisionChecks++;
  if(!collides(state.world,e.x,e.y+my,14))e.y+=my;
  if(e.x!==oldX||e.y!==oldY)break;
 }
 e.vx=(e.x-oldX)/dt;e.vy=(e.y-oldY)/dt;
 if(Math.hypot(e.vx,e.vy)<Math.max(2,e.speed*.08))e.blockedFor+=dt;else e.blockedFor=0;
 if(e.blockedFor>1.25){e.avoidSign=e.avoidSign===1?-1:1;e.blockedFor=.25;}
 if(Math.hypot(e.vx,e.vy)>.01)e.facing=facingFromVector(e.vx,e.vy,e.facing);
}

export function createGroundHazard(state:SimState,kind:GroundHazard['kind'],x:number,y:number){
 if(state.hazards.length>=24)return;state.hazards.push({id:++state.eventId,kind,x,y,radius:kind==='spikes'?36:42,damage:kind==='spikes'?8:4,slow:kind==='spikes'?.3:0,armedAt:state.time+.75,expiresAt:state.time+6});
}
function enemyAI(state:SimState,e:Entity,dt:number,events:string[],mods:ItemModifiers){
 processStatuses(state,e,dt,mods);if(e.hp<=0)return;if(state.time<(e.staggerUntil??0)){e.vx=e.vy=0;return;}
 const dx=state.player.x-e.x,dy=state.player.y-e.y,d=Math.hypot(dx,dy)||1;e.aiCooldown-=dt;const previousWindup=e.attackWindup;e.attackWindup=Math.max(0,e.attackWindup-dt);
 if(e.boss){const phase=e.hp/e.maxHp>.66?1:e.hp/e.maxHp>.33?2:3;if(phase!==e.phase){e.phase=phase;events.push(`boss-phase:${phase}`);}if(e.aiCooldown<=0){const shots=phase===1?3:phase===2?6:8,base=Math.atan2(dy,dx);for(let i=0;i<shots;i++)fireEnemyProjectile(state,e,base+(i-(shots-1)/2)*.18,130+phase*18);if(phase>=2){for(let i=0;i<(phase===3?3:2);i++){const angle=state.time*.7+i*Math.PI;createGroundHazard(state,'spikes',state.player.x+Math.cos(angle)*75,state.player.y+Math.sin(angle)*75);}}if(phase===3&&state.enemies.length<90)spawnSpecies(state,'weedle',2);e.aiCooldown=2.2-phase*.35;events.push('boss-attack');}}
 else if(e.behavior==='ranged'){
  if(previousWindup>0&&e.attackWindup===0){if(fireEnemyProjectile(state,e,Math.atan2(dy,dx),e.species==='pidgey'?125:105)){events.push(`enemy-shot:${e.id}`);if(e.species==='butterfree')createGroundHazard(state,'powder',state.player.x+45,state.player.y);}e.aiCooldown=e.species==='pidgey'?2.6:3.1;}
  else if(e.aiCooldown<=0&&e.attackWindup===0&&hasLineOfSight(state.world,e.x,e.y,state.player.x,state.player.y)){e.attackWindup=e.species==='pidgey'?.42:.58;events.push(`enemy-windup:${e.id}`);}
 }
 let movement=e.speed,dirX=dx/d,dirY=dy/d;
 if(e.behavior==='ranged'&&d<180){movement=-e.speed*.35;}
 else if(d>260||!hasLineOfSight(state.world,e.x,e.y,state.player.x,state.player.y)){const flow=flowDirection(state.navigation,e.x,e.y);if(flow.distance>=0){dirX=flow.x;dirY=flow.y;}}
 if(e.behavior==='defend'&&d>125)movement*=.3;if(e.behavior==='charge'&&e.aiCooldown>.8)movement*=1.8;
 if(movement<0){dirX=-dirX;dirY=-dirY;movement=-movement;}
 moveEnemy(state,e,dirX,dirY,movement*dt,dt);
 if(d<24)hurtPlayer(state,Math.max(1,8-state.vitamins.iron*.15)*dt,'contact',mods,e);
}

function separateEnemies(state:SimState,dt:number){
 const size=48,cells=new Map<string,Entity[]>(),pushes=new Map<number,{x:number;y:number}>();
 for(const e of state.enemies){const key=`${Math.floor(e.x/size)},${Math.floor(e.y/size)}`;(cells.get(key)??(cells.set(key,[]),cells.get(key)!)).push(e);pushes.set(e.id,{x:0,y:0});}
 for(const a of state.enemies){const cx=Math.floor(a.x/size),cy=Math.floor(a.y/size);for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++)for(const b of cells.get(`${cx+ox},${cy+oy}`)??[]){
  if(b.id<=a.id)continue;let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);state.collisionChecks++;
  if(d>=28)continue;if(d<.001){dx=((a.id*17+b.id*13)%3)-1;dy=((a.id*7+b.id*19)%3)-1;d=Math.hypot(dx,dy)||1;}
  const force=(28-d)*.22,px=dx/d*force,py=dy/d*force,ap=pushes.get(a.id)!,bp=pushes.get(b.id)!;ap.x-=px;ap.y-=py;bp.x+=px;bp.y+=py;
 }}
 for(const e of state.enemies){const p=pushes.get(e.id)!,length=Math.hypot(p.x,p.y),scale=length>6?6/length:1,mx=p.x*scale,my=p.y*scale,oldX=e.x,oldY=e.y;state.collisionChecks++;
  if(!collides(state.world,e.x+mx,e.y+my,14)){e.x+=mx;e.y+=my;}else{if(!collides(state.world,e.x+mx,e.y,14))e.x+=mx;if(!collides(state.world,e.x,e.y+my,14))e.y+=my;}
  e.vx+=(e.x-oldX)/dt;e.vy+=(e.y-oldY)/dt;if(Math.hypot(e.vx,e.vy)>.01)e.facing=facingFromVector(e.vx,e.vy,e.facing);
 }
}
function updateProjectiles(state:SimState,dt:number,mods:ItemModifiers){for(const p of state.projectiles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.ttl-=dt;state.collisionChecks++;if(Math.hypot(p.x-state.player.x,p.y-state.player.y)<p.radius+14){const damage=hurtPlayer(state,p.damage*(1-state.vitamins.zinc*.025),p.source==='butterfree'?'powderProjectile':'ranged',mods);if(damage>0&&p.source==='butterfree'){const old=state.playerStatuses.find(status=>status.kind==='poison');if(old)old.remaining=3;else state.playerStatuses.push({kind:'poison',remaining:3,tick:0,power:2});}p.ttl=0;}if(collides(state.world,p.x,p.y,p.radius))p.ttl=0;}state.projectiles=state.projectiles.filter(p=>p.ttl>0);}
export function playerMovementFactor(state:SimState,mods=aggregateItems(state.items)){
 let slow=1;for(const hazard of state.hazards)if(hazard.kind==='spikes'&&state.time>=hazard.armedAt&&state.time<hazard.expiresAt&&Math.hypot(hazard.x-state.player.x,hazard.y-state.player.y)<hazard.radius)slow=Math.min(slow,1-hazard.slow*(1-mods.terrainGuard));
 if(state.playerStatuses.some(status=>status.kind==='slow'&&status.remaining>0))slow*=.8;return(1+mods.movement)*(1+state.vitamins.carbos*.015)*slow;
}
export function processGroundEffects(state:SimState,dt:number,mods=aggregateItems(state.items)){
 state.hazards=state.hazards.filter(hazard=>state.time<hazard.expiresAt);
 for(const hazard of state.hazards)if(state.time>=hazard.armedAt&&Math.hypot(hazard.x-state.player.x,hazard.y-state.player.y)<hazard.radius)hurtPlayer(state,hazard.damage*dt,hazard.kind==='spikes'?'terrain':'powder',mods);
 for(const status of state.playerStatuses){status.remaining-=dt;status.tick+=dt;while(status.tick>=.5){status.tick-=.5;if(status.kind==='poison')hurtPlayer(state,status.power*.5,'poison',mods);}}
 state.playerStatuses=state.playerStatuses.filter(status=>status.remaining>0);
}
export function stateHash(state:SimState){let h=2166136261;const text=JSON.stringify({seed:state.seed,time:state.time,level:state.level,xp:state.xp,totalExp:state.totalExp,hp:state.hp,maxHp:state.maxHp,player:state.player,enemies:state.enemies,projectiles:state.projectiles,pickups:state.pickups,items:state.items,moves:state.moveSlots,vitamins:state.vitamins,masteries:state.masteries,itemRuntime:state.itemRuntime,statuses:state.playerStatuses,hazards:state.hazards,moveUpgradeCredits:state.moveUpgradeCredits,unlockedMoveSlots:state.unlockedMoveSlots});for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(16).padStart(8,'0');}
export function moveCooldown(state:SimState,slot:MoveSlot,mods=aggregateItems(state.items)){return Math.max(.15,moveRankStats(MOVES[slot.id],slot.rank).cooldownSeconds*state.cooldownBonus*(1-mods.cooldown)*(1-(state.masteries.efficiency??0)*.06));}
export function tick(state:SimState,dt:number,input:{x:number;y:number},legacyMoves?:MoveDef[]):string[]{state.time+=dt;state.attacks=[];state.feedback=[];state.collectedPickups=[];state.progressionNotices=[];state.collisionChecks=0;const events:string[]=[],mods=aggregateItems(state.items);const oldPlayerX=state.player.x,oldPlayerY=state.player.y,len=Math.hypot(input.x,input.y)||1,speed=state.pokemon.speed*playerMovementFactor(state,mods),nx=state.player.x+input.x/len*speed*dt,ny=state.player.y+input.y/len*speed*dt;state.collisionChecks+=2;if(!collides(state.world,nx,state.player.y,14))state.player.x=nx;if(!collides(state.world,state.player.x,ny,14))state.player.y=ny;state.player.vx=(state.player.x-oldPlayerX)/dt;state.player.vy=(state.player.y-oldPlayerY)/dt;if(Math.hypot(state.player.vx,state.player.vy)>.01)state.player.facing=facingFromVector(state.player.vx,state.player.vy,state.player.facing);
 const targetCell=Math.floor(state.player.y/state.navigation.cellSize)*state.navigation.cols+Math.floor(state.player.x/state.navigation.cellSize);if(targetCell!==state.navigation.targetCell){state.navigation=buildFlowField(state.world,state.player.x,state.player.y,state.navigation.cellSize);state.navigationRebuilds++;}
 for(const e of state.enemies)enemyAI(state,e,dt,events,mods);separateEnemies(state,dt);updateProjectiles(state,dt,mods);processGroundEffects(state,dt,mods);stepPickups(state,dt,mods,events);
 const slots:MoveSlot[]=legacyMoves?legacyMoves.map(move=>({id:move.id,rank:1})):state.moveSlots;for(const slot of slots){const move=MOVES[slot.id];if(!move)continue;const cooldown=moveCooldown(state,slot,mods),previousTime=state.time-dt;if(slot.nextAttackAt===undefined)slot.nextAttackAt=(Math.floor(previousTime/cooldown)+1)*cooldown;else if(slot.cooldownDuration&&Math.abs(slot.cooldownDuration-cooldown)>1e-9)slot.nextAttackAt=previousTime+Math.max(0,slot.nextAttackAt-previousTime)/slot.cooldownDuration*cooldown;slot.cooldownDuration=cooldown;if(state.time+1e-9<slot.nextAttackAt)continue;slot.nextAttackAt+=Math.max(1,Math.floor((state.time-slot.nextAttackAt)/cooldown)+1)*cooldown;const attack=activate(state,slot,move,mods);if(attack)state.attacks.push(attack);}
 const dead=state.enemies.filter(enemy=>enemy.hp<=0);for(const enemy of dead){state.defeated++;const position=reachablePickupPosition(state,enemy.x,enemy.y);dropExperience(state,position.x,position.y,enemy.xp);if(enemy.boss||enemy.elite)state.pickups.push({id:++state.eventId,...position,value:1,kind:'ball',tier:enemy.boss?3:2});if(!enemy.boss)dropConsumable(state,position.x,position.y,enemy.elite);events.push(`defeated:${enemy.species}`);events.push(enemy.boss?'boss-defeated':enemy.elite?'elite-defeated':'enemy-defeated');}state.enemies=state.enemies.filter(enemy=>enemy.hp>0);
 const regen=mods.regen+(state.masteries.sustain??0)*.2;if(regen)restoreHp(state,regen*dt,'leftovers');while(state.level<100&&state.xp>=state.nextXp){state.xp-=state.nextXp;state.level++;state.nextXp=xpForLevel(state.level);state.maxHp+=Math.max(1,Math.round(state.pokemon.stats.hp*.025));if(state.hp>0)state.hp=Math.min(state.maxHp,state.hp+3);events.push(state.level%20===0?'mastery-up':'level-up');evolve(state,events);}return events;}
export type Upgrade={kind:'move'|'item'|'vitamin'|'mastery'|'heal';id:string;label:string};
export function upgradeOptions(state:SimState,count=3,mode:'all'|'move'='all'):Upgrade[]{
 const pool:{upgrade:Upgrade;weight:number;improvement:boolean}[]=[],equipped=state.moveSlots.map(slot=>MOVES[slot.id]).filter(Boolean);
 const add=(upgrade:Upgrade,weight:number,improvement=false)=>{if(isUpgradeAvailable(state,upgrade)&&!pool.some(entry=>entry.upgrade.kind===upgrade.kind&&entry.upgrade.id===upgrade.id))pool.push({upgrade,weight,improvement});};
 for(const slot of state.moveSlots)add({kind:'move',id:slot.id,label:`${MOVES[slot.id].name} Rank ${slot.rank+1}`},2.4,true);
 if(state.moveSlots.length<moveCapacity(state.pokemon,state.level))for(const id of state.pokemon.learnset)add({kind:'move',id,label:`Learn ${MOVES[id].name}`},2);
 if(mode==='all'){
  for(const item of Object.values(ITEMS)){const held=state.items.find(slot=>slot.id===item.id);add({kind:'item',id:item.id,label:held?`${item.name} Rank ${held.rank+1}`:`Equip ${item.name}`},itemOfferWeight(item,!!held,state.hp/state.maxHp,equipped),!!held);}
  for(const id of Object.keys(state.vitamins) as Vitamin[])add({kind:'vitamin',id,label:id.replace(/([A-Z])/g,' $1')},.65);
  if(!pool.length)add({kind:'heal',id:'heal',label:'Restore 30% HP'},1);
 }
 const out:Upgrade[]=[];while(pool.length&&out.length<count){const improvements=pool.filter(entry=>entry.improvement),eligible=!out.length&&improvements.length?improvements:pool;let roll=seededRoll(state)*eligible.reduce((sum,entry)=>sum+entry.weight,0),selected=eligible.find(entry=>(roll-=entry.weight)<0)??eligible[eligible.length-1];out.push(selected.upgrade);pool.splice(pool.indexOf(selected),1);}return out;
}
export function canSpendMoveCredit(state:SimState){return state.moveSlots.some(slot=>slot.rank<5)||(state.moveSlots.length<moveCapacity(state.pokemon,state.level)&&state.pokemon.learnset.some(id=>!state.moveSlots.some(slot=>slot.id===id)));}
export function isUpgradeAvailable(state:SimState,u:Upgrade){if(u.kind==='move'){const slot=state.moveSlots.find(s=>s.id===u.id);return!!MOVES[u.id]&&(slot?slot.rank<5:state.moveSlots.length<moveCapacity(state.pokemon,state.level)&&state.pokemon.learnset.includes(u.id));}if(u.kind==='item'){const held=state.items.find(i=>i.id===u.id),item=ITEMS[u.id];return!!item&&(held?held.rank<item.maxRank:state.items.length<4)&&itemApplicable(item,state.pokemon,state.moveSlots,MOVES,state.level);}if(u.kind==='vitamin')return u.id in state.vitamins&&state.vitamins[u.id as Vitamin]<10;if(u.kind==='mastery')return['overcharge','multicast','expansion','sustain','efficiency'].includes(u.id)&&(state.masteries[u.id as Mastery]??0)<3;return u.kind==='heal';}
export function applyUpgrade(state:SimState,u:Upgrade){if(!isUpgradeAvailable(state,u))return;if(u.kind==='move'){const slot=state.moveSlots.find(s=>s.id===u.id);if(slot)slot.rank++;else state.moveSlots.push({id:u.id,rank:1});}else if(u.kind==='item'){const held=state.items.find(i=>i.id===u.id);if(held)held.rank++;else state.items.push({id:u.id,rank:1});}else if(u.kind==='vitamin'){state.vitamins[u.id as Vitamin]++;if(u.id==='hpUp'){state.maxHp+=5;state.hp=Math.min(state.maxHp,state.hp+5);}}else if(u.kind==='mastery')state.masteries[u.id as Mastery]=(state.masteries[u.id as Mastery]??0)+1;else state.hp=Math.min(state.maxHp,state.hp+state.maxHp*.3);}
export function masteryOptions(state:SimState):Upgrade[]{return (['overcharge','multicast','expansion','sustain','efficiency'] as Mastery[]).filter(id=>(state.masteries[id]??0)<3).slice(0,3).map(id=>({kind:'mastery',id,label:`${id[0].toUpperCase()+id.slice(1)} Mastery`}));}
export function rewardRoll(state:SimState,tier:1|2|3){const rng=new RNG(state.seed),n=tier===3?(rng.next()<.15?5:3):tier===2?(rng.next()<.25?3:1):1;state.seed=rng.seed;return upgradeOptions(state,n);}
