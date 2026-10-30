import type Phaser from 'phaser';
import {VFX_ASSETS} from './data/vfxAssets';
import type {AttackEvent} from './simulation';

export type VfxMotion='travel'|'slash'|'cross'|'sweep'|'orbit'|'burst'|'beam'|'cloud'|'drain'|'aura'|'roots';
export interface MoveVfxProfile {asset:string;motion:VfxMotion;size:number;duration:number;count:number;tint?:number;impact?:string;spin?:number;anchor?:'target';}
const fx=(asset:string,motion:VfxMotion,size:number,duration=.5,count=1,extra:Partial<MoveVfxProfile>={}):MoveVfxProfile=>({asset,motion,size,duration,count,...extra});
/** Explicit compositions distinguish material, silhouettes, direction and pacing. */
export const MOVE_VFX_PROFILES:Readonly<Record<string,MoveVfxProfile>>={
 tackle:fx('impact','burst',72,.28),scratch:fx('slash','slash',66,.32,3),vineWhip:fx('vine','sweep',130,.44),
 poisonPowder:fx('poison','cloud',80,1.2,5),leechSeed:fx('seed','travel',36,.48,2,{impact:'drain'}),
 ember:fx('fire','travel',44,.4,2,{impact:'impact'}),dragonRage:fx('dragonEnergy','travel',78,.6,1,{impact:'aura',spin:2}),
 metalClaw:fx('slash','slash',88,.34,3,{tint:0xc7e5ff,impact:'impact'}),dragonClaw:fx('slash','cross',125,.48,2,{tint:0xd28aff,impact:'aura'}),
 razorLeaf:fx('leaf','travel',42,.46,3,{spin:7}),hydroPump:fx('water','beam',110,.65,5,{impact:'water'}),
 waterGun:fx('water','beam',38,.38,3),bubble:fx('bubble','travel',46,.85,3,{spin:.5}),rapidSpin:fx('impact','orbit',52,.55,4,{spin:9}),
 powerWhip:fx('vine','sweep',192,.56,2,{impact:'impact'}),magicalLeaf:fx('leaf','travel',48,.65,4,{impact:'aura',spin:4}),
 leafStorm:fx('leaf','orbit',65,.95,8,{spin:12}),bulletSeed:fx('seed','travel',25,.48,5),seedBomb:fx('seed','travel',67,.62,1,{impact:'bloom'}),
 acidSpray:fx('poison','travel',35,.48,4,{impact:'poison'}),venoshock:fx('toxicWave','burst',110,.46,2,{impact:'slash'}),
 sludgeBomb:fx('poison','travel',78,.65,1,{impact:'toxicWave'}),toxic:fx('toxicWave','cloud',75,1.4,5,{tint:0xbb71dd}),
 megaDrain:fx('drain','drain',48,.72,3),gigaDrain:fx('drain','drain',72,.95,6,{impact:'bloom'}),
 takeDown:fx('impact','travel',115,.36,3,{impact:'ground'}),bodySlam:fx('impact','burst',175,.6,4,{impact:'ground'}),
 petalDance:fx('petal','orbit',52,1.15,7,{spin:8}),petalBlizzard:fx('petal','orbit',88,1.3,12,{impact:'leaf',spin:12}),
 energyBall:fx('grassEnergy','travel',76,.62,1,{impact:'bloom',spin:3}),sunnyDay:fx('bloom','aura',136,1.2,1,{tint:0xffd27c}),
 solarBeam:fx('beam','beam',130,1.15,1,{impact:'bloom'}),sludgeWave:fx('toxicWave','burst',230,1.1,6,{impact:'poison'}),
 synthesis:fx('bloom','aura',86,.95,3),grassyTerrain:fx('leaf','roots',95,1.4,5,{impact:'bloom'}),ingrain:fx('root','roots',105,1.4,6,{impact:'bloom'}),
 grassKnot:fx('vine','roots',98,.7,3,{anchor:'target'}),grassyGlide:fx('leaf','travel',92,.3,2,{impact:'slash'}),trailblaze:fx('leaf','sweep',110,.45,3,{impact:'aura'}),
 grassPledge:fx('root','roots',100,.8,5,{impact:'aura',anchor:'target'}),frenzyPlant:fx('root','roots',175,1.2,8,{impact:'ground'}),
 poisonJab:fx('slash','travel',85,.32,1,{tint:0xb57ce0,impact:'poison'}),earthPower:fx('ground','roots',110,.85,4,{impact:'impact',anchor:'target'}),
 earthquake:fx('ground','burst',210,1,7),growl:fx('aura','burst',105,.6,3,{tint:0xf1d8b0}),growth:fx('leaf','aura',85,.9,4,{impact:'bloom'}),
 sleepPowder:fx('poison','cloud',80,1.2,4,{tint:0xa7c0f5}),sweetScent:fx('petal','cloud',80,1.15,4),
 worrySeed:fx('seed','travel',38,.6,3,{impact:'aura'}),protect:fx('aura','aura',115,.75,1,{tint:0xb5ebff}),
 swordsDance:fx('slash','orbit',88,.8,3,{tint:0xe4f4ff,spin:4}),helpingHand:fx('bloom','aura',95,.8,2,{tint:0xffdfaa}),
};

export const vfxTexture=(asset:string)=>`vfx:${asset}`;
export function preloadMoveVfx(scene:Phaser.Scene){for(const [id,asset] of Object.entries(VFX_ASSETS))if(!scene.textures.exists(vfxTexture(id)))scene.load.spritesheet(vfxTexture(id),`${import.meta.env.BASE_URL}${asset.path}`,{frameWidth:asset.frameWidth,frameHeight:asset.frameHeight});}
interface Effect {sprite:Phaser.GameObjects.Sprite;start:number;duration:number;x:number;y:number;tx:number;ty:number;size:number;index:number;count:number;angle:number;profile:MoveVfxProfile;asset:string;delay:number;reduced:boolean;}

/** Bounded, shared-texture VFX. Its clock and triggers never feed back into simulation. */
export class MoveVfxRenderer {
 readonly capacity=192;private active:Effect[]=[];private free:Phaser.GameObjects.Sprite[]=[];private created=0;emitted=0;culled=0;
 constructor(private scene:Phaser.Scene,private worldLayer?:Phaser.GameObjects.Layer){}
 emit(event:AttackEvent,time:number,reduced=false){
  const base=MOVE_VFX_PROFILES[event.moveId];if(!base)return;
  const profile=event.phase==='charge'?fx('bloom','aura',Math.min(100,base.size),.65,3):base;
  const view=this.scene.cameras.main.worldView,padding=250;
  if(!view.contains(event.x,event.y)&&!view.contains(event.tx,event.ty)&&Math.hypot(event.x-view.centerX,event.y-view.centerY)>view.width+padding){this.culled++;return;}
  const requested=profile.motion==='travel'&&event.projectileCount!==undefined?event.projectileCount:profile.count;
  const count=Math.max(1,Math.min(reduced?3:12,reduced?Math.ceil(requested/2):requested));
  for(let i=0;i<count;i++)this.add(event,profile,profile.asset,time,i,count,reduced,reduced?0:profile.motion==='slash'?i*.04:profile.motion==='travel'&&count>1?i*.035:0);
  if(profile.impact&&!reduced)this.add(event,{...profile,motion:'burst',size:profile.size*.7,duration:.4,count:1},profile.impact,time,0,1,false,.18);
  this.emitted++;
 }
 private add(event:AttackEvent,profile:MoveVfxProfile,asset:string,time:number,index:number,count:number,reduced:boolean,delay=0){
  if(this.active.length>=this.capacity||!this.scene.textures.exists(vfxTexture(asset)))return;
  let sprite=this.free.pop();if(!sprite&&this.created<this.capacity){this.created++;sprite=this.scene.add.sprite(0,0,vfxTexture(asset));this.worldLayer?.add(sprite);}if(!sprite)return;
  sprite.setTexture(vfxTexture(asset),0).setVisible(true).setActive(true).setAlpha(1).setTint(profile.tint??0xffffff).setOrigin(.5).setName('move-vfx').setData('moveId',event.moveId);sprite.texture.setFilter(0);
  const target=event.impacts?.[index%(event.impacts?.length||1)];
  this.active.push({sprite,start:time,duration:reduced?Math.min(.35,profile.duration):profile.duration,x:event.x,y:event.y-16,tx:target?.x??event.tx,ty:(target?.y??event.ty)-14,size:profile.size,index,count,angle:Math.atan2(event.ty-event.y,event.tx-event.x),profile,asset,delay,reduced});
 }
 update(time:number){
  for(let i=this.active.length-1;i>=0;i--){const e=this.active[i],age=time-e.start-e.delay;
   if(age<0){e.sprite.setVisible(false);continue;}if(age>=e.duration){e.sprite.setVisible(false).setActive(false);this.free.push(e.sprite);this.active.splice(i,1);continue;}
   const t=age/e.duration,p=e.profile,phase=e.index/e.count*Math.PI*2,spread=(e.index-(e.count-1)/2),distance=Math.hypot(e.tx-e.x,e.ty-e.y);let x=e.tx,y=e.ty,size=e.size,rotation=e.angle;
   if(e.reduced){const local=['aura','roots','cloud','orbit'].includes(p.motion);x=(local?e.x:e.tx)+spread*10;y=(local?e.y:e.ty)+Math.abs(spread)*3;const beam=p.motion==='beam';if(beam){x=(e.x+e.tx)/2;y=(e.y+e.ty)/2;}e.sprite.setPosition(x,y).setDisplaySize(beam?Math.max(40,distance):size,beam?size*.65:size).setRotation(beam?e.angle:0).setFrame(Math.min(VFX_ASSETS[e.asset].frames-1,Math.floor(t*VFX_ASSETS[e.asset].frames))).setDepth(y+35).setAlpha(Math.min(1,(1-t)*3)).setVisible(true);continue;}
   if(p.motion==='travel'){const travel=Math.min(1,t*1.4),curve=Math.sin(travel*Math.PI)*spread*13;x=e.x+(e.tx-e.x)*travel-Math.sin(e.angle)*curve;y=e.y+(e.ty-e.y)*travel+Math.cos(e.angle)*curve;rotation+=(p.spin??0)*t;}
   else if(p.motion==='beam'){x=(e.x+e.tx)/2;y=(e.y+e.ty)/2;const a=VFX_ASSETS[e.asset];e.sprite.setDisplaySize(Math.max(40,distance),size*(.6+Math.sin(t*Math.PI)*.4)).setRotation(e.angle);e.sprite.setPosition(x,y).setDepth(y+35).setFrame(Math.min(a.frames-1,Math.floor(t*a.frames))).setAlpha(Math.min(1,(1-t)*4));continue;}
   else if(p.motion==='sweep'){x=e.x+Math.cos(e.angle)*(distance*.5);y=e.y+Math.sin(e.angle)*(distance*.5);rotation=e.angle+(t-.5)*.8;size*=.55+Math.sin(t*Math.PI)*.45;}
   else if(p.motion==='orbit'){const radius=(p.size*.7+35)*(Math.sin(t*Math.PI)*.3+.7),a=phase+(p.spin??6)*t;x=e.x+Math.cos(a)*radius;y=e.y+Math.sin(a)*radius*.65;rotation=a;size*=.55;}
   else if(p.motion==='burst'){const radius=e.count>1?t*e.size*.42:0;x=e.tx+Math.cos(phase)*radius;y=e.ty+Math.sin(phase)*radius;size*=.55+t*.65;rotation=phase;}
   else if(p.motion==='cloud'){x=e.x+Math.cos(phase)*(35+t*45);y=e.y+Math.sin(phase)*(25+t*30)-t*15;rotation=phase*.2;size*=.65+t*.35;}
   else if(p.motion==='drain'){const travel=1-t;x=e.x+(e.tx-e.x)*travel;y=e.y+(e.ty-e.y)*travel+Math.sin(t*Math.PI*2+phase)*12;rotation=Math.atan2(e.y-e.ty,e.x-e.tx);size*=.45;}
   else if(p.motion==='roots'){x=(p.anchor==='target'?e.tx:e.x)+Math.cos(phase)*(e.size*.5+e.index*8);y=(p.anchor==='target'?e.ty:e.y)+Math.sin(phase)*(e.size*.3+e.index*5);rotation=0;size*=.7+Math.sin(t*Math.PI)*.3;}
   else if(p.motion==='aura'){x=e.x+Math.cos(phase)*e.index*12;y=e.y-10-Math.sin(t*Math.PI)*12;rotation=0;size*=.8+Math.sin(t*Math.PI)*.2;}
   else{rotation=p.motion==='cross'?(e.index%2?-.7:.7):e.angle+.35;x=e.tx+spread*9;y=e.ty+spread*5;size*=.8+Math.sin(t*Math.PI)*.2;}
   e.sprite.setPosition(x,y).setDisplaySize(size,size).setRotation(rotation).setFrame(Math.min(VFX_ASSETS[e.asset].frames-1,Math.floor(t*VFX_ASSETS[e.asset].frames))).setDepth(y+35).setAlpha(Math.min(1,(1-t)*4)).setVisible(true);
  }
 }
 get diagnostics(){return{active:this.active.length,pooled:this.free.length,created:this.created,capacity:this.capacity,emitted:this.emitted,culled:this.culled};}
 destroy(){for(const e of this.active)e.sprite.destroy();for(const sprite of this.free)sprite.destroy();this.active=[];this.free=[];this.created=0;}
}
