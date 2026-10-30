import {describe,expect,it} from 'vitest';
import {MOVES,POKEMON} from '../src/content';
import {FACINGS} from '../src/direction';
import {NATIVE_ACTIONS} from '../src/data/nativeActions';
import {VFX_ASSETS} from '../src/data/vfxAssets';
import {nativeActionFor,nativeAnimationKey,registerNativeAnimations} from '../src/nativeAnimation';
import {PokemonAnimationController} from '../src/animationState';
import {MOVE_VFX_PROFILES,MoveVfxRenderer} from '../src/moveVfx';
import type {AttackEvent} from '../src/simulation';
import {makeState} from '../src/simulation';
import {BULBASAUR_MOVE_CATALOG} from '../src/data/bulbasaurMoves';
import {ALL_TM_IDS} from '../src/data/moveUnlocks';
import {describeUpgrade} from '../src/upgrades';

const attack=(id='petalBlizzard'):AttackEvent=>({id:1,moveId:id,kind:MOVES[id].kind,type:MOVES[id].type,x:100,y:100,tx:160,ty:140,radius:200,hits:[],damage:10});
function sceneFixture(){
 const sprites:any[]=[];const sprite=()=>{const object:any={texture:{setFilter(){return object;}},values:{}};for(const key of ['setTexture','setVisible','setActive','setAlpha','setTint','setOrigin','setName','setData','setDisplaySize','setRotation','setPosition','setDepth','setFrame'])object[key]=(...args:any[])=>{object.values[key]=args;return object;};object.destroy=()=>{object.values.destroyed=true;};sprites.push(object);return object;};
 return{sprites,scene:{textures:{exists:()=>true},add:{sprite},cameras:{main:{worldView:{contains:(x:number,y:number)=>x>=0&&x<=1280&&y>=0&&y<=720,centerX:640,centerY:360,width:1280}}}} as any};
}

describe('v0.5.0 native character action playback',()=>{
 it('registers every source frame and eight directions with original per-frame timing',()=>{
  const configs:any[]=[],textureFilters:{key:string;filter:number}[]=[];registerNativeAnimations({textures:{exists:()=>true,get:(key:string)=>({setFilter:(filter:number)=>textureFilters.push({key,filter})})},anims:{exists:()=>false,create:(config:any)=>configs.push(config)}} as any);
  expect(configs).toHaveLength(9*3*8);
  expect(textureFilters).toHaveLength(27);expect(new Set(textureFilters.map(entry=>entry.key)).size).toBe(27);expect(textureFilters.every(entry=>entry.filter===0)).toBe(true);
  for(const [species,actions] of Object.entries(NATIVE_ACTIONS))for(const [kind,action] of Object.entries(actions))for(const facing of FACINGS){
   const config=configs.find(config=>config.key===nativeAnimationKey(species,kind as any,facing));expect(config.repeat).toBe(0);expect(config.frameRate).toBe(60);
   expect(config.frames.map((frame:any)=>frame.duration+1000/60)).toEqual(action!.durations.map(ticks=>ticks*1000/60));
   expect(config.frames.map((frame:any)=>frame.frame)).toEqual(action!.durations.map((_,index)=>FACINGS.indexOf(facing)*action!.frames+index));
  }
 });
 it('does not restart an active attack for simultaneous moves or continuous walking',()=>{
  const controller=new PokemonAnimationController('charmander'),duration=NATIVE_ACTIONS.charmander.physical!.durationSeconds;
  expect(controller.attack(0,'physical','east',duration)).toBe(true);const revision=controller.revision;
  expect(controller.attack(.01,'special','west',duration)).toBe(false);expect(controller.actionKind).toBe('physical');expect(controller.actionFacing).toBe('east');expect(controller.revision).toBe(revision);
  for(let time=.02;time<duration;time+=.02)expect(controller.update(time,'east',150).state).toBe('attack');
  expect(controller.update(duration+.01,'east',150).state).toBe('walk');expect(controller.attack(duration+.02,'special','north',duration)).toBe(true);
 });
 it('hit, evolution and defeat override attacks and species changes release native action state',()=>{
  const controller=new PokemonAnimationController('bulbasaur');controller.attack(0,'physical','south',1);controller.trigger('hit',.1,.2);expect(controller.state).toBe('hit');expect(controller.attack(.15,'physical','north',1)).toBe(false);
  controller.trigger('evolution',.2,1);expect(controller.attack(.3,'physical','east',1)).toBe(false);expect(nativeActionFor('bulbasaur','evolution')).toBeUndefined();controller.trigger('defeat',.4);expect(controller.trigger('evolution',.5)).toBe(false);
  controller.setSpecies('ivysaur');expect(controller.state).toBe('idle');expect(controller.lockUntil).toBe(0);expect(nativeActionFor('ivysaur','attack')?.native).toBe(true);
 });
 it('signature activation can take priority over a secondary action without restarting itself',()=>{
  const controller=new PokemonAnimationController('charmander');expect(controller.attack(0,'special','west',1)).toBe(true);
  expect(controller.attack(.1,'physical','east',.5,true)).toBe(true);expect(controller.actionKind).toBe('physical');expect(controller.actionFacing).toBe('east');const started=controller.startedAt;
  expect(controller.attack(.2,'physical','north',.5,true)).toBe(false);expect(controller.attack(.25,'special','south',1)).toBe(false);expect(controller.startedAt).toBe(started);
 });
});

describe('v0.5.0 pooled sprite VFX',()=>{
 it('profiles every current move and gives related moves meaningful shape/motion differences',()=>{
  expect(Object.keys(MOVE_VFX_PROFILES).sort()).toEqual(Object.keys(MOVES).sort());
  for(const profile of Object.values(MOVE_VFX_PROFILES)){expect(VFX_ASSETS[profile.asset]).toBeDefined();if(profile.impact)expect(VFX_ASSETS[profile.impact]).toBeDefined();expect(profile.count).toBeLessThanOrEqual(12);expect(profile.duration).toBeGreaterThan(0);}
  for(const [a,b] of [['ember','dragonRage'],['dragonRage','energyBall'],['waterGun','hydroPump'],['vineWhip','razorLeaf'],['earthPower','earthquake'],['scratch','metalClaw'],['metalClaw','dragonClaw']]){
   const {tint:at,...first}=MOVE_VFX_PROFILES[a],{tint:bt,...second}=MOVE_VFX_PROFILES[b];expect(first).not.toEqual(second);
  }
 });
 it('bounds dense effect allocations, reuses sprites, and cleans every object',()=>{
  const {scene,sprites}=sceneFixture(),renderer=new MoveVfxRenderer(scene);
  for(let i=0;i<400;i++)renderer.emit(attack(),0);
  expect(renderer.diagnostics.created).toBe(192);expect(renderer.diagnostics.active).toBe(192);expect(sprites).toHaveLength(192);
  renderer.update(3);expect(renderer.diagnostics.active).toBe(0);expect(renderer.diagnostics.pooled).toBe(192);
  renderer.emit(attack(),4);expect(renderer.diagnostics.created).toBe(192);expect(sprites).toHaveLength(192);
  renderer.destroy();expect(renderer.diagnostics.active).toBe(0);expect(renderer.diagnostics.created).toBe(0);expect(sprites.every((sprite:any)=>sprite.values.destroyed)).toBe(true);
 });
 it('culls offscreen attacks and reduced motion limits particles/lifetime',()=>{
  const {scene,sprites}=sceneFixture(),renderer=new MoveVfxRenderer(scene);
  renderer.emit({...attack(),x:10000,y:10000,tx:11000,ty:11000},0);expect(renderer.diagnostics.culled).toBe(1);expect(renderer.diagnostics.created).toBe(0);
  renderer.emit(attack(),0,true);expect(renderer.diagnostics.active).toBe(3);renderer.update(.1);const positions=sprites.map((sprite:any)=>sprite.values.setPosition);renderer.update(.2);expect(sprites.map((sprite:any)=>sprite.values.setPosition)).toEqual(positions);expect(sprites.every((sprite:any)=>sprite.values.setRotation[0]===0)).toBe(true);renderer.update(.36);expect(renderer.diagnostics.active).toBe(0);
 });
 it('shows only the charging aura until the authoritative release event',()=>{
  const {scene,sprites}=sceneFixture(),renderer=new MoveVfxRenderer(scene);renderer.emit({...attack('solarBeam'),phase:'charge'},0);
  expect(sprites).toHaveLength(3);expect(sprites.every((sprite:any)=>sprite.values.setTexture[0]==='vfx:bloom')).toBe(true);
  renderer.update(1);renderer.emit({...attack('solarBeam'),phase:'fire'},1);expect(sprites.some((sprite:any)=>sprite.values.setTexture[0]==='vfx:beam')).toBe(true);
 });
});

describe('v0.5.0 card explanations',()=>{
 it('describes an actual improvement at every approved family rank and marks the rare ultimate',()=>{
  const state=makeState(POKEMON.venusaur,5050,undefined,{discoveredTms:ALL_TM_IDS});
  for(const id of BULBASAUR_MOVE_CATALOG)for(let rank=1;rank<5;rank++){
   state.moveSlots=[{id,rank}];const detail=describeUpgrade(state,{kind:'move',id,label:id});
   expect(detail.benefit.length,`${id} rank${rank} has no benefit explanation`).toBeGreaterThan(5);
  }
  state.moveSlots=[{id:'synthesis',rank:1}];expect(describeUpgrade(state,{kind:'move',id:'synthesis',label:''}).benefit).toContain('Recovery');
  state.moveSlots=[{id:'protect',rank:1}];expect(describeUpgrade(state,{kind:'move',id:'protect',label:''}).benefit).toContain('Effect duration');
  state.moveSlots=[];expect(describeUpgrade(state,{kind:'move',id:'frenzyPlant',label:''}).rarity).toBe('rare');
 });
});
