import Phaser from 'phaser';
import { assetFor, ENEMIES, ITEMS, MOVES, POKEMON, SPRITE_FRAMES, STAGES } from './content';
import { FACINGS, Facing, facingRow } from './direction';
import { ENVIRONMENT_ASSETS, ENVIRONMENT_ATLASES, environmentKey, environmentUrl } from './environmentAssets';
import {decorationVisual,visibleChunkRange} from './worldPresentation';
import {GrassBrushField} from './grassBrush';
import {gameplayHudLayout, GameplayHudLayout, hpBarColor} from './hudLayout';
import {renderProfile} from './renderProfiles';
import { applyUpgrade, AttackEvent, makeState, masteryOptions, rewardRoll, SimState, spawnSpecies, stateHash, tick, Upgrade, upgradeOptions } from './simulation';
import { discover, loadSave, recordEvolution, recordRun, recordSessionEvents } from './save';
import {adjacencyMask,TERRAIN,terrainAt} from './terrain';
import {PokemonAnimationController} from './animationState';
import {encounterPhaseAt,weightedSpecies} from './encounters';
import {frameGroundOffset} from './groundOffsets';
import {interpolatePosition,interpolationAlpha,Position} from './interpolation';
import {chunkKey,FOREST_CHUNK_CELLS} from './worldgen';
import './style.css';

const W=1280,H=720,FONT='Trebuchet MS, monospace';
interface GrassView {back:Phaser.GameObjects.Image;front:Phaser.GameObjects.Image;x:number;y:number;}
const button=(scene:Phaser.Scene,x:number,y:number,label:string,action:()=>void,w=260)=>{const t=scene.add.text(x,y,label,{fontFamily:FONT,fontSize:'22px',color:'#fff',backgroundColor:'#244c37',padding:{x:18,y:12},align:'center',fixedWidth:w}).setOrigin(.5).setInteractive({useHandCursor:true});t.on('pointerover',()=>t.setBackgroundColor('#3c7652'));t.on('pointerout',()=>t.setBackgroundColor('#244c37'));t.on('pointerdown',action);return t;};
class BaseScene extends Phaser.Scene { backdrop(){this.cameras.main.setBackgroundColor('#14251d');const g=this.add.graphics();g.fillGradientStyle(0x183c2b,0x183c2b,0x0c1c18,0x0c1c18,1);g.fillRect(0,0,W,H);for(let i=0;i<30;i++){const x=(i*193)%W,y=(i*97)%H;g.fillStyle(i%2?0x2b5a3c:0x244c37,.5);g.fillCircle(x,y,24+(i%4)*7);}} }
class MenuScene extends BaseScene {constructor(){super('menu')}create(){this.backdrop();this.add.text(W/2,105,'POKÉMON\nSURVIVORS',{fontFamily:FONT,fontSize:'64px',fontStyle:'bold',color:'#ffe26b',stroke:'#173126',strokeThickness:10,align:'center'}).setOrigin(.5);this.add.text(W/2,210,'Viridian Forest · v0.2 vertical slice',{fontFamily:FONT,fontSize:'18px',color:'#c8e6cf'}).setOrigin(.5);button(this,W/2,310,'NEW RUN',()=>this.scene.start('pokemon'));button(this,W/2,375,'POKÉDEX',()=>this.scene.start('dex'));button(this,W/2,440,'RESEARCH',()=>this.scene.start('research'));const s=loadSave();this.add.text(W/2,540,`Best: ${s.best.viridian?`Lv ${s.best.viridian.level} · ${s.best.viridian.defeated} defeated`:'No completed runs yet'}`,{fontFamily:FONT,fontSize:'17px',color:'#9fc8aa'}).setOrigin(.5);}}
class PokemonScene extends BaseScene {constructor(){super('pokemon')}preload(){for(const id of Object.keys(POKEMON)){const f=SPRITE_FRAMES[id];if(f)this.load.spritesheet(`${id}-sprite`,assetFor(id,'sprite'),{frameWidth:f.width,frameHeight:f.height});this.load.image(`${id}-portrait`,assetFor(id,'portrait'));}}create(){this.backdrop();this.add.text(W/2,52,'CHOOSE YOUR POKÉMON',{fontFamily:FONT,fontSize:'36px',fontStyle:'bold',color:'#ffe26b'}).setOrigin(.5);['bulbasaur','charmander','squirtle'].forEach((id,i)=>{const p=POKEMON[id],x=250+i*390;this.add.rectangle(x,350,330,500,0x162f24,.94).setStrokeStyle(3,p.color);this.add.image(x,165,`${id}-portrait`).setScale(2.4);this.add.text(x,235,p.name,{fontFamily:FONT,fontSize:'30px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);this.add.text(x,278,p.types.join(' / '),{fontFamily:FONT,fontSize:'18px',color:'#ffe26b'}).setOrigin(.5);this.add.text(x-135,315,`HP  ${p.stats.hp}\nATK ${p.stats.attack}   DEF ${p.stats.defense}\nSPA ${p.stats.specialAttack}   SPD ${p.stats.specialDefense}\nSPE ${p.stats.speed}\n\nStarts: ${MOVES[p.startingMove].name}\nEvolves: ${p.evolvesTo?POKEMON[p.evolvesTo].name:'—'}\n\n${p.description}`,{fontFamily:FONT,fontSize:'16px',color:'#cce3d2',wordWrap:{width:270},lineSpacing:4});button(this,x,550,'SELECT',()=>this.scene.start('stage',{pokemon:id}),210);});button(this,90,675,'BACK',()=>this.scene.start('menu'),130);}}
class StageScene extends BaseScene {pokemon='bulbasaur';constructor(){super('stage')}init(data:{pokemon:string}){this.pokemon=data.pokemon||'bulbasaur'}create(){this.backdrop();this.add.text(W/2,70,'KANTO CAMPAIGN',{fontFamily:FONT,fontSize:'38px',fontStyle:'bold',color:'#ffe26b'}).setOrigin(.5);const save=loadSave();const cards=[STAGES.viridian,STAGES.mtMoon,STAGES.ssAnne];cards.forEach((s,i)=>{const x=250+i*390,unlocked=s.id==='viridian'||save.unlockedStages.includes(s.id);this.add.rectangle(x,340,330,390,unlocked?0x173f2a:0x222b28,.96).setStrokeStyle(3,unlocked?0x69b76f:0x56605b);this.add.text(x,225,s.name,{fontFamily:FONT,fontSize:'27px',fontStyle:'bold',color:unlocked?'#fff':'#7d8782'}).setOrigin(.5);this.add.text(x,285,s.id==='viridian'?'Bug-filled woodland\nBoss: Beedrill\n30 minutes':s.id==='mtMoon'?'Unlocked after Viridian\nGameplay coming later':'Future Kanto stage',{fontFamily:FONT,fontSize:'18px',color:unlocked?'#cce3d2':'#7d8782',align:'center'}).setOrigin(.5);if(s.id==='viridian')button(this,x,445,'ENTER FOREST',()=>this.scene.start('game',{pokemon:this.pokemon,fast:new URLSearchParams(location.search).has('fast')}),230);else this.add.text(x,450,unlocked?'COMING SOON':'LOCKED',{fontFamily:FONT,fontSize:'20px',color:'#999'}).setOrigin(.5);});button(this,90,675,'BACK',()=>this.scene.start('pokemon'),130);}}
class DexScene extends BaseScene {constructor(){super('dex')}create(){this.backdrop();const save=loadSave();this.add.text(55,40,'POKÉDEX',{fontFamily:FONT,fontSize:'38px',fontStyle:'bold',color:'#ffe26b'});const ids=['bulbasaur','ivysaur','venusaur','charmander','charmeleon','charizard','squirtle','wartortle','blastoise',...Object.keys(ENEMIES)];ids.forEach((id,i)=>{const known=save.pokedex.includes(id)||['bulbasaur','charmander','squirtle'].includes(id),name=POKEMON[id]?.name??ENEMIES[id]?.name??id;this.add.text(80+(i%4)*290,120+Math.floor(i/4)*70,known?`${name}\n${(POKEMON[id]?.types??ENEMIES[id]?.types??[]).join(' / ')}`:'???',{fontFamily:FONT,fontSize:'17px',color:known?'#dceee1':'#65736a',backgroundColor:'#173126',padding:{x:12,y:8},fixedWidth:250});});button(this,90,675,'BACK',()=>this.scene.start('menu'),130);}}
class ResearchScene extends BaseScene {constructor(){super('research')}create(){this.backdrop();const r=loadSave().research;this.add.text(55,40,'RESEARCH BOARD',{fontFamily:FONT,fontSize:'38px',fontStyle:'bold',color:'#ffe26b'});const tasks=[['Defeat 100 Pokémon',r.enemiesDefeated,100],['Defeat 100 Caterpie',r.caterpie,100],['Defeat 100 Weedle',r.weedle,100],['Defeat Beedrill',r.beedrill,1],['Evolve a starter',r.evolutions,1],['Complete Viridian Forest',r.viridianWins,1]] as const;tasks.forEach((t,i)=>{const n=Math.min(t[1]??0,t[2]);this.add.text(120,135+i*78,`${t[0]}   ${n}/${t[2]}`,{fontFamily:FONT,fontSize:'20px',color:n>=t[2]?'#ffe26b':'#fff'});this.add.rectangle(680,150+i*78,500,16,0x253a31).setOrigin(0,.5);this.add.rectangle(680,150+i*78,500*n/t[2],16,0x5ab86e).setOrigin(0,.5);});button(this,90,675,'BACK',()=>this.scene.start('menu'),130);}}

class GameScene extends BaseScene {
 state!:SimState;keys!:Record<string,Phaser.Input.Keyboard.Key>;player!:Phaser.GameObjects.Sprite;playerShadow!:Phaser.GameObjects.Ellipse;cameraTarget!:Phaser.GameObjects.Zone;
 portrait!:Phaser.GameObjects.Image;hud!:Phaser.GameObjects.Text;hpGraphics!:Phaser.GameObjects.Graphics;hpText!:Phaser.GameObjects.Text;bossGraphics!:Phaser.GameObjects.Graphics;bossText!:Phaser.GameObjects.Text;hpLayout!:GameplayHudLayout;
 debugText?:Phaser.GameObjects.Text;debugGraphics?:Phaser.GameObjects.Graphics;enemyViews=new Map<number,Phaser.GameObjects.Sprite>();enemyShadows=new Map<number,Phaser.GameObjects.Ellipse>();pickupViews=new Map<number,Phaser.GameObjects.Arc>();projectileViews=new Map<number,Phaser.GameObjects.Shape>();
 playerAnimation!:PokemonAnimationController;enemyAnimations=new Map<number,PokemonAnimationController>();previousPlayer!:Position;previousEnemies=new Map<number,Position>();previousProjectiles=new Map<number,Position>();renderPlayer:Position={x:0,y:0};
 chunkViews=new Map<string,Phaser.GameObjects.GameObject[]>();chunkRangeKey='';activeChunk={cx:Number.NaN,cy:Number.NaN};sessionDefeats:Record<string,number>={};sessionBalls=0;acc=0;overlay?:Phaser.GameObjects.Container;fast=false;debug=false;duration=1800;nextSpawn=0;miniIndex=0;ended=false;
 grassViews=new Map<string,GrassView>();grassBrush=new GrassBrushField();grassParticles=new Set<Phaser.GameObjects.Rectangle>();grassBrushCount=0;
 readonly fixedStep=1/30;readonly miniProgress=[.10,.233,.367,.50,.633,.767,.90];

 constructor(){super('game')}
 init(d:{pokemon:string;fast?:boolean}){
  this.fast=!!d.fast;this.debug=new URLSearchParams(location.search).has('debug');this.state=makeState(POKEMON[d.pokemon]??POKEMON.bulbasaur,1337);this.duration=this.fast?90:1800;this.ended=false;this.overlay=undefined;this.acc=0;this.nextSpawn=0;this.miniIndex=0;this.sessionDefeats={};this.sessionBalls=0;
  this.enemyViews.clear();this.enemyShadows.clear();this.enemyAnimations.clear();this.pickupViews.clear();this.projectileViews.clear();this.previousEnemies.clear();this.previousProjectiles.clear();this.chunkViews.clear();this.chunkRangeKey='';this.activeChunk={cx:Number.NaN,cy:Number.NaN};this.previousPlayer={x:this.state.player.x,y:this.state.player.y};
  this.grassViews.clear();this.grassBrush.clear();this.grassParticles.clear();this.grassBrushCount=0;
 }
 preload(){const ids=new Set([...Object.keys(POKEMON),...Object.keys(ENEMIES)]);for(const id of ids){const f=SPRITE_FRAMES[id];if(f)this.load.spritesheet(`${id}-sprite`,assetFor(id,'sprite'),{frameWidth:f.width,frameHeight:f.height});this.load.image(`${id}-portrait`,assetFor(id,'portrait'));}for(const name of new Set(Object.values(ENVIRONMENT_ASSETS))){if(ENVIRONMENT_ATLASES.has(name))this.load.spritesheet(environmentKey(name),environmentUrl(name),{frameWidth:16,frameHeight:16});else this.load.image(environmentKey(name),environmentUrl(name));}}
 create(){
  this.cameras.main.centerOn(this.state.player.x,this.state.player.y);this.drawForest();
  for(const id of Object.keys(SPRITE_FRAMES)){const f=SPRITE_FRAMES[id];if(!this.textures.exists(`${id}-sprite`))continue;for(const facing of FACINGS){const row=facingRow(facing),key=`${id}-walk-${facing}`;if(!this.anims.exists(key))this.anims.create({key,frames:this.anims.generateFrameNumbers(`${id}-sprite`,{start:row*f.frames,end:row*f.frames+f.frames-1}),frameRate:Math.max(6,Math.min(10,f.frames*1.5)),repeat:-1});}}
  this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,ESC') as Record<string,Phaser.Input.Keyboard.Key>;
  const profile=renderProfile(this.state.pokemonId);this.playerAnimation=new PokemonAnimationController(this.state.pokemonId);
  this.playerShadow=this.add.ellipse(this.state.player.x,this.state.player.y+profile.shadowOffsetY,profile.shadowWidth,profile.shadowHeight,0x0a1710,.42).setDepth(this.state.player.y-2);
  this.player=this.add.sprite(this.state.player.x,this.state.player.y,`${this.state.pokemonId}-sprite`,0).setOrigin(.5,1).setScale(profile.scale).setDepth(this.state.player.y+20);
  this.cameraTarget=this.add.zone(this.state.player.x,this.state.player.y,1,1);this.cameras.main.setBounds(0,0,this.state.world.width,this.state.world.height);this.cameras.main.roundPixels=true;this.cameras.main.startFollow(this.cameraTarget,true,1,1);
  this.hpLayout=gameplayHudLayout(W,H);this.hpGraphics=this.add.graphics().setDepth(22000).setScrollFactor(0);this.hpText=this.add.text(W/2,this.hpLayout.player.y+this.hpLayout.player.height/2,'',{fontFamily:FONT,fontSize:'17px',fontStyle:'bold',color:'#fff',stroke:'#102018',strokeThickness:3}).setOrigin(.5).setDepth(22001).setScrollFactor(0);this.bossGraphics=this.add.graphics().setDepth(21990).setScrollFactor(0);this.bossText=this.add.text(W/2,this.hpLayout.boss.y+this.hpLayout.boss.height/2,'',{fontFamily:FONT,fontSize:'13px',fontStyle:'bold',color:'#fff',stroke:'#2a1010',strokeThickness:2}).setOrigin(.5).setDepth(21991).setScrollFactor(0);this.portrait=this.add.image(1215,this.hpLayout.portraitY,`${this.state.pokemonId}-portrait`).setScale(1.35).setDepth(20000).setScrollFactor(0);this.hud=this.add.text(18,this.hpLayout.infoY,'',{fontFamily:FONT,fontSize:'14px',color:'#fff',backgroundColor:'#102019dd',padding:{x:10,y:8},lineSpacing:3}).setDepth(20000).setScrollFactor(0);
  if(this.debug){this.debugGraphics=this.add.graphics().setDepth(19990);this.debugText=this.add.text(W-440,H-215,'',{fontFamily:'monospace',fontSize:'13px',color:'#9fffb3',backgroundColor:'#07120ddd',padding:{x:8,y:6}}).setDepth(22010).setScrollFactor(0);}
  spawnSpecies(this.state,'caterpie',6);spawnSpecies(this.state,'weedle',4);this.renderHealthBars();
 }
 applyPokemonAnimation(sprite:Phaser.GameObjects.Sprite,controller:PokemonAnimationController,species:string,facing:Facing,speed:number,ground:Position,multiplier=1){
  const f=SPRITE_FRAMES[species],profile=renderProfile(species);if(!f)return 0;controller.setSpecies(species);const decision=controller.update(this.state.time,facing,speed),row=facingRow(facing),walkKey=`${species}-walk-${facing}`;
  if(decision.moving&&decision.state!=='stun'&&decision.state!=='evolution'&&decision.state!=='defeat'){
   if(sprite.anims.currentAnim?.key!==walkKey){const progress=sprite.anims.isPlaying?sprite.anims.getProgress():0;sprite.play(walkKey,true);if(progress>0)sprite.anims.setProgress(progress);}
  }else if(sprite.anims.isPlaying||Number(sprite.frame.name)!==row*f.frames){sprite.anims.stop();sprite.setFrame(row*f.frames);}
  sprite.setOrigin(.5,1).setScale(profile.scale*multiplier);const frame=Number(sprite.frame.name)||0,offset=frameGroundOffset(species,frame)*profile.scale*multiplier+profile.elevation;
  sprite.setPosition(ground.x,ground.y+offset).setDepth(ground.y+20);return offset;
 }
 renderHealthBars(){const layout=this.hpLayout,ratio=Math.max(0,Math.min(1,this.state.hp/Math.max(1,this.state.maxHp))),player=layout.player,g=this.hpGraphics;g.clear();g.fillStyle(0x09130f,.96);g.fillRect(player.x-4,player.y-4,player.width+8,player.height+8);g.fillStyle(0x3b2023,1);g.fillRect(player.x,player.y,player.width,player.height);g.fillStyle(hpBarColor(ratio),1);g.fillRect(player.x,player.y,Math.round(player.width*ratio),player.height);g.lineStyle(3,0xe7dfb0,1);g.strokeRect(player.x-1,player.y-1,player.width+2,player.height+2);this.hpText.setText(`${this.state.pokemon.name.toUpperCase()} · LV ${this.state.level}     ${Math.max(0,Math.ceil(this.state.hp))} / ${Math.ceil(this.state.maxHp)} HP`);const boss=this.state.enemies.find(enemy=>enemy.boss),bg=this.bossGraphics,b=layout.boss;bg.clear();if(!boss){this.bossText.setVisible(false);return;}const bossRatio=Math.max(0,Math.min(1,boss.hp/Math.max(1,boss.maxHp)));bg.fillStyle(0x12090a,.94);bg.fillRect(b.x-3,b.y-3,b.width+6,b.height+6);bg.fillStyle(0x3b2023,1);bg.fillRect(b.x,b.y,b.width,b.height);bg.fillStyle(0xcc4b5d,1);bg.fillRect(b.x,b.y,Math.round(b.width*bossRatio),b.height);bg.lineStyle(2,0xf1d5a8,1);bg.strokeRect(b.x-1,b.y-1,b.width+2,b.height+2);this.bossText.setVisible(true).setText(`BEEDRILL · PHASE ${boss.phase}     ${Math.max(0,Math.ceil(boss.hp))} / ${Math.ceil(boss.maxHp)}`);}
 terrainTexture(x:number,y:number){
  return terrainAt(this.state.world.terrain,x,y)===TERRAIN.water?ENVIRONMENT_ASSETS.waterAtlas:ENVIRONMENT_ASSETS.pathAtlas;
 }
 drawForest(){this.cameras.main.setBackgroundColor('#70c8a0');this.syncWorldChunks(true);}
 addForestTree(x:number,y:number,name:string,scale=2){
  const image=this.add.image(x,y,environmentKey(name));
  // Both metatrees include two pixels of padding and four pixels of ground
  // below the trunk. Sort at the trunk so overlapping canopies stay intact.
  return image.setOrigin(.5,(image.height-6)/image.height).setScale(scale).setDepth(y).setData('forestTree',true);
 }
 addGrass(x:number,y:number,cellX:number,cellY:number){
  // Preserve the complete silhouette, including its sway, at world borders.
  x=Math.max(32,Math.min(this.state.world.width-32,x));y=Math.max(40,Math.min(this.state.world.height-12,y));
  const key=chunkKey(cellX,cellY),back=this.add.image(x,y,environmentKey(ENVIRONMENT_ASSETS.tallGrass)),front=this.add.image(x,y,environmentKey(ENVIRONMENT_ASSETS.grassFront));
  for(const image of [back,front])image.setOrigin(.5,(image.height-2)/image.height).setScale(2).setData('grass',true);
  back.setDepth(2);front.setDepth(y+24);
  this.grassViews.set(key,{back,front,x,y});
  back.once('destroy',()=>{this.grassViews.delete(key);this.grassBrush.forget(key);});
  return[back,front];
 }
 emitGrassBlades(x:number,y:number,vx:number,vy:number){
  if(this.grassParticles.size>=72)return;
  const phase=this.grassBrushCount++,direction=Math.abs(vx)>8?Math.sign(vx):Math.sign(vy)||1;
  for(let i=0;i<3&&this.grassParticles.size<72;i++){
   const blade=this.add.rectangle(x+(i-1)*4,y-4,2,5,[0x389030,0x98d878,0x58b848][i]).setRotation((i-1)*.6).setDepth(y+26);
   this.grassParticles.add(blade);blade.once('destroy',()=>this.grassParticles.delete(blade));
   this.tweens.add({targets:blade,x:x+direction*(8+i*4)+Math.sin(phase+i)*10,y:y-12-(i%2)*12,angle:direction*(45+i*32),alpha:0,duration:280+i*60,ease:'Quad.easeOut',onComplete:()=>blade.destroy()});
  }
 }
 updateGrass(){
  const time=this.time.now/1000,tile=this.state.world.terrain.tileSize;
  const brush=(x:number,y:number,vx:number,vy:number,leaves:boolean)=>{
   if(Math.hypot(vx,vy)<8)return;
   const cx=Math.floor(x/tile),cy=Math.floor(y/tile);
   for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
    const key=chunkKey(cx+ox,cy+oy),view=this.grassViews.get(key);
    if(view&&Math.abs(x-view.x)<24&&Math.abs(y-(view.y-8))<22&&this.grassBrush.touch(key,time,vx,vy)){
     if(leaves)this.emitGrassBlades(x,y,vx,vy);
    }
   }
  };
  brush(this.renderPlayer.x,this.renderPlayer.y,this.state.player.vx,this.state.player.vy,true);
  for(const enemy of this.state.enemies)if(renderProfile(enemy.species).elevation>=-4)brush(enemy.x,enemy.y,enemy.vx,enemy.vy,false);
  for(const key of this.grassBrush.impulses.keys()){
   const view=this.grassViews.get(key);if(!view){this.grassBrush.forget(key);continue;}
   const bend=this.grassBrush.sample(key,time);
   for(const image of [view.back,view.front])image.setRotation(bend?.rotation??0).setScale(2*(bend?.scaleX??1),2*(bend?.scaleY??1));
  }
 }
 renderWorldChunk(cx:number,cy:number){
  const map=this.state.world,key=chunkKey(cx,cy);if(!map.chunks[key])return;const tile=map.terrain.tileSize,objects:Phaser.GameObjects.GameObject[]=[],baseX=cx*FOREST_CHUNK_CELLS,baseY=cy*FOREST_CHUNK_CELLS,details=[ENVIRONMENT_ASSETS.grass,ENVIRONMENT_ASSETS.grassLeaves,ENVIRONMENT_ASSETS.grassRocks,ENVIRONMENT_ASSETS.grassFlowers,ENVIRONMENT_ASSETS.forestFloor];
  for(let ly=0;ly<FOREST_CHUNK_CELLS;ly++)for(let lx=0;lx<FOREST_CHUNK_CELLS;lx++){
   const x=baseX+lx,y=baseY+ly;if(x<0||y<0||x>=map.terrain.cols||y>=map.terrain.rows)continue;const wx=x*tile+tile/2,wy=y*tile+tile/2,value=terrainAt(map.terrain,x,y),hash=Math.abs((x*17+y*31+map.seed*7)|0);
   objects.push(this.add.image(wx,wy,environmentKey(ENVIRONMENT_ASSETS.grassFill)).setDisplaySize(tile,tile).setDepth(0));
   if(value===TERRAIN.path||value===TERRAIN.water)objects.push(this.add.image(wx,wy,environmentKey(this.terrainTexture(x,y)),adjacencyMask(map.terrain,x,y,value)).setDisplaySize(tile,tile).setDepth(1));
   // Transparent whole tufts can bend without rotating opaque ground squares.
   else if(value===TERRAIN.tallGrass)objects.push(...this.addGrass(wx+((y%2)*2-1)*2,wy+12,x,y));
   else if(hash%19===0){const name=details[hash%details.length],flower=name===ENVIRONMENT_ASSETS.grassFlowers;if(name===ENVIRONMENT_ASSETS.grassLeaves)objects.push(...this.addGrass(wx,wy+12,x,y));else objects.push(this.add.image(Math.max(24,Math.min(map.width-24,wx)),Math.max(24,Math.min(map.height-24,wy)),environmentKey(name)).setScale(2).setDepth(flower?2:.5));}
  }
  for(const d of map.decorationBuckets[key]??[]){
   const visual=decorationVisual(d.id,d.x,d.y,map.seed),image=this.add.image(Math.round(d.x),Math.round(d.y),environmentKey(visual.name));
   image.setOrigin(.5,(image.height-visual.trunkPadding)/image.height).setDepth(d.y).setScale(visual.scale).setData('mapProp',d.id);if(d.id==='tree')image.setData('forestTree',true);objects.push(image);
  }
  for(const landmark of map.landmarks.filter(l=>Math.floor(l.x/map.chunkSize)===cx&&Math.floor(l.y/map.chunkSize)===cy)){
   if(landmark.id==='ancient-tree')objects.push(this.addForestTree(landmark.x,landmark.y,ENVIRONMENT_ASSETS.ancientTree,4));
   else if(landmark.id==='flower-clearing')for(let i=0;i<7;i++)objects.push(this.add.image(Math.round(landmark.x+Math.cos(i*1.7)*landmark.radius*.6),Math.round(landmark.y+Math.sin(i*1.7)*landmark.radius*.48),environmentKey(ENVIRONMENT_ASSETS.grassFlowers)).setScale(2).setDepth(2));
  }
  this.chunkViews.set(key,objects);
 }
 syncWorldChunks(force=false){
  const map=this.state.world,size=map.chunkSize,cam=this.cameras.main,halfW=cam.width/(2*cam.zoom),halfH=cam.height/(2*cam.zoom),centerX=cam.scrollX+cam.width/2,centerY=cam.scrollY+cam.height/2;
  this.activeChunk={cx:Math.floor(this.state.player.x/size),cy:Math.floor(this.state.player.y/size)};
  const range=visibleChunkRange({left:centerX-halfW,right:centerX+halfW,top:centerY-halfH,bottom:centerY+halfH},size,Math.ceil(map.width/size),Math.ceil(map.height/size)),rangeKey=JSON.stringify(range);if(!force&&rangeKey===this.chunkRangeKey)return;this.chunkRangeKey=rangeKey;const wanted=new Set<string>();
  for(let cy=range.minY;cy<=range.maxY;cy++)for(let cx=range.minX;cx<=range.maxX;cx++){const key=chunkKey(cx,cy);if(map.chunks[key]){wanted.add(key);if(!this.chunkViews.has(key))this.renderWorldChunk(cx,cy);}}
  for(const [key,objects] of this.chunkViews)if(!wanted.has(key)){for(const object of objects)object.destroy();this.chunkViews.delete(key);}
 }
 moveInput(){return{x:(this.keys.D.isDown||this.keys.RIGHT.isDown?1:0)-(this.keys.A.isDown||this.keys.LEFT.isDown?1:0),y:(this.keys.S.isDown||this.keys.DOWN.isDown?1:0)-(this.keys.W.isDown||this.keys.UP.isDown?1:0)};}
 showChoices(title:string,options:Upgrade[],onDone?:()=>void){if(this.overlay)return;const parts:Phaser.GameObjects.GameObject[]=[];parts.push(this.add.rectangle(W/2,H/2,760,330,0x102019,.97).setStrokeStyle(3,0xffe26b));parts.push(this.add.text(W/2,235,title,{fontFamily:FONT,fontSize:'30px',fontStyle:'bold',color:'#ffe26b'}).setOrigin(.5));options.forEach((u,i)=>{const b=button(this,W/2,315+i*65,u.label,()=>{applyUpgrade(this.state,u);this.overlay?.destroy(true);this.overlay=undefined;onDone?.();},560);parts.push(b);});this.overlay=this.add.container(0,0,parts).setDepth(30000).setScrollFactor(0);}
 showEvolution(id:string){const p=POKEMON[id],profile=renderProfile(id);recordEvolution(id);this.player.setTexture(`${id}-sprite`,0);this.playerAnimation.setSpecies(id);this.playerAnimation.trigger('evolution',this.state.time,1.8);this.playerShadow.setSize(profile.shadowWidth,profile.shadowHeight);this.portrait.setTexture(`${id}-portrait`);const text=this.add.text(W/2,H/2,`Congratulations!\nYour Pokémon evolved into ${p.name}!`,{fontFamily:FONT,fontSize:'30px',color:'#ffe26b',backgroundColor:'#102019ee',padding:{x:30,y:24},align:'center'}).setOrigin(.5).setDepth(30000).setScrollFactor(0);this.time.delayedCall(1800,()=>text.destroy());}
 showReward(tier:1|2|3){const options=rewardRoll(this.state,tier);this.showChoices(`${tier===3?'ULTRA':tier===2?'GREAT':'POKÉ'} BALL OPENED!`,options);}
 renderAttack(a:AttackEvent){const colors:Record<string,number>={Normal:0xe8e0d2,Grass:0x65d66f,Poison:0xb66ad4,Fire:0xff6b3d,Dragon:0x8466e8,Water:0x54bff2};const color=colors[a.type]??0xffffff,g=this.add.graphics().setDepth(16000);g.lineStyle(a.kind==='sweep'?8:4,color,.9);g.fillStyle(color,.35);if(a.kind==='spin'){g.strokeCircle(a.x,a.y,Math.min(a.radius,120));}else if(a.kind==='cloud'){for(let i=0;i<8;i++)g.fillCircle(a.x+Math.cos(i)*55,a.y+Math.sin(i)*45,18);}else if(a.kind==='slash'){g.beginPath();g.arc(a.x,a.y,55,-.7,.7);g.strokePath();}else if(a.kind==='spread'){for(let i=-1;i<=1;i++)g.fillCircle(a.tx+i*18,a.ty+Math.abs(i)*12,11);}else {g.lineBetween(a.x,a.y,a.tx,a.ty);g.fillCircle(a.tx,a.ty,a.kind==='fixed'?26:12);}if(a.damage>0){const n=this.add.text(a.tx,a.ty-22,String(a.damage),{fontFamily:FONT,fontSize:'16px',fontStyle:'bold',color:'#fff',stroke:'#17231c',strokeThickness:3}).setOrigin(.5).setDepth(17000);this.tweens.add({targets:n,y:n.y-24,alpha:0,duration:620,onComplete:()=>n.destroy()});}for(const id of a.hits){const v=this.enemyViews.get(id);if(v)this.tweens.add({targets:v,alpha:.45,duration:55,yoyo:true});}this.tweens.add({targets:g,alpha:0,duration:a.kind==='cloud'?700:260,onComplete:()=>g.destroy()});}
 syncViews(alpha:number){
  const alive=new Set<number>();for(const e of this.state.enemies){alive.add(e.id);let v=this.enemyViews.get(e.id),shadow=this.enemyShadows.get(e.id),controller=this.enemyAnimations.get(e.id);const multiplier=e.boss?1.38:e.elite?1.18:1,profile=renderProfile(e.species),position=interpolatePosition(this.previousEnemies.get(e.id),e,alpha);
   if(!v){shadow=this.add.ellipse(position.x,position.y+profile.shadowOffsetY,profile.shadowWidth*multiplier,profile.shadowHeight*multiplier,0x08130d,.38);v=this.add.sprite(position.x,position.y,`${e.species}-sprite`,0).setOrigin(.5,1);controller=new PokemonAnimationController(e.species);this.enemyViews.set(e.id,v);this.enemyShadows.set(e.id,shadow);this.enemyAnimations.set(e.id,controller);discover(e.species);}
   shadow!.setPosition(position.x,position.y+profile.shadowOffsetY).setDepth(position.y-2);this.applyPokemonAnimation(v,controller!,e.species,e.facing,Math.hypot(e.vx,e.vy),position,multiplier);v.setTint(e.attackWindup>0?0xffe58a:e.statuses.some(s=>s.kind==='poison')?0xc86fea:e.statuses.some(s=>s.kind==='burn')?0xff7651:0xffffff);
  }
  for(const [id,v] of this.enemyViews)if(!alive.has(id)){v.destroy();this.enemyShadows.get(id)?.destroy();this.enemyViews.delete(id);this.enemyShadows.delete(id);this.enemyAnimations.delete(id);}
  const drops=new Set<number>();for(const p of this.state.pickups){drops.add(p.id);let v=this.pickupViews.get(p.id);if(!v){v=this.add.circle(p.x,p.y,p.kind==='ball'?12:6,p.kind==='ball'?(p.tier===3?0xffdf42:p.tier===2?0x4d80ff:0xe94242):0x55d8ff).setStrokeStyle(2,0xffffff).setDepth(p.y+5);this.pickupViews.set(p.id,v);}v.setPosition(p.x,p.y);}for(const [id,v] of this.pickupViews)if(!drops.has(id)){v.destroy();this.pickupViews.delete(id);}
  const shots=new Set<number>();for(const p of this.state.projectiles){shots.add(p.id);let v=this.projectileViews.get(p.id);const position=interpolatePosition(this.previousProjectiles.get(p.id),p,alpha);if(!v){v=p.source==='pidgey'?this.add.ellipse(position.x,position.y,18,9,0xdff8ff,.9).setStrokeStyle(2,0x79cbe8):p.source==='butterfree'?this.add.circle(position.x,position.y,9,0xc982d8,.8).setStrokeStyle(2,0xf2c6ff):this.add.triangle(position.x,position.y,0,10,18,5,0,0,0x9b62c7,.95).setStrokeStyle(2,0xf1d7ff);v.setDepth(15000);this.projectileViews.set(p.id,v);}v.setPosition(position.x,position.y);}for(const [id,v] of this.projectileViews)if(!shots.has(id)){v.destroy();this.projectileViews.delete(id);}
 }
 schedule(){
  const phase=encounterPhaseAt(this.state.time,this.duration);this.state.encounterPhase=phase.id;this.state.maxRangedEnemies=phase.maxRanged;this.state.maxEnemyProjectiles=phase.projectileCap;
  if(this.state.time>=this.nextSpawn&&this.state.enemies.length<phase.maxAlive){const roll=((this.state.seed>>>8)%100000)/100000;let species=weightedSpecies(phase,roll);const ranged=this.state.enemies.filter(e=>e.behavior==='ranged').length;if((species==='pidgey'||species==='butterfree')&&ranged>=phase.maxRanged)species=this.state.time%2<1?'caterpie':'weedle';spawnSpecies(this.state,species,this.fast?2:Math.min(1+Math.floor(this.state.time/360),5));this.nextSpawn=this.state.time+phase.spawnInterval*(this.fast?.55:1);}
  const progress=this.state.time/this.duration;if(this.miniIndex<this.miniProgress.length&&progress>=this.miniProgress[this.miniIndex]){spawnSpecies(this.state,this.miniIndex%2?'pidgeotto':'butterfree',1,true);this.miniIndex++;}
  if(!this.state.bossSpawned&&this.state.time>=this.duration){spawnSpecies(this.state,'beedrill',1,false,true);this.state.bossSpawned=true;}
 }
 finish(result:'victory'|'defeat'){if(this.ended)return;this.ended=true;this.playerAnimation.trigger('defeat',this.state.time);recordSessionEvents(this.sessionDefeats,this.sessionBalls);recordRun({result,pokemon:this.state.pokemonId,stage:'viridian',level:this.state.level,time:this.state.time,defeated:this.state.defeated});const title=result==='victory'?'VIRIDIAN FOREST CLEARED!':'RUN DEFEATED';const panel=this.add.rectangle(W/2,H/2,680,360,0x102019,.98),t=this.add.text(W/2,260,`${title}\n\nLevel ${this.state.level} · ${this.state.defeated} defeated\nTime ${Math.floor(this.state.time/60)}:${String(Math.floor(this.state.time%60)).padStart(2,'0')}`,{fontFamily:FONT,fontSize:'28px',color:result==='victory'?'#ffe26b':'#ff8f8f',align:'center'}).setOrigin(.5),b=button(this,W/2,485,'RETURN TO MENU',()=>this.scene.start('menu'));this.overlay=this.add.container(0,0,[panel,t,b]).setDepth(30000).setScrollFactor(0);}
 step(){
  this.previousPlayer={x:this.state.player.x,y:this.state.player.y};this.previousEnemies=new Map(this.state.enemies.map(e=>[e.id,{x:e.x,y:e.y}]));this.previousProjectiles=new Map(this.state.projectiles.map(p=>[p.id,{x:p.x,y:p.y}]));const previousHp=this.state.hp;
  this.schedule();const events=tick(this.state,this.fixedStep,this.moveInput());if(this.state.attacks.length)this.playerAnimation.trigger('attack',this.state.time,.18);if(this.state.hp<previousHp)this.playerAnimation.trigger('hit',this.state.time,.12);
  for(const a of this.state.attacks){this.renderAttack(a);for(const id of a.hits)this.enemyAnimations.get(id)?.trigger('hit',this.state.time,.1);}
  for(const e of events){if(e==='level-up'&&this.state.level%2===0)this.showChoices('LEVEL UP',upgradeOptions(this.state));else if(e==='mastery-up')this.showChoices('MOVE MASTERY',masteryOptions(this.state));else if(e.startsWith('ball-collected:')){this.sessionBalls++;this.showReward(Number(e.split(':')[1]) as 1|2|3);}else if(e.startsWith('evolution:'))this.showEvolution(e.split(':')[1]);else if(e.startsWith('defeated:')){const id=e.split(':')[1];this.sessionDefeats[id]=(this.sessionDefeats[id]??0)+1;}else if(e==='boss-defeated')this.finish('victory');}if(this.state.hp<=0)this.finish('defeat');
 }
 drawDebug(){const g=this.debugGraphics;if(!g)return;g.clear();g.lineStyle(2,0xff5d73,.65);for(const d of this.state.world.decorations)if(Math.abs(d.x-this.state.player.x)<900&&Math.abs(d.y-this.state.player.y)<650)g.strokeCircle(d.x,d.y,d.collisionRadius+14);g.lineStyle(2,0x62e8ff,.8);for(const e of this.state.enemies.slice(0,100)){g.lineBetween(e.x,e.y,e.x+e.vx*.28,e.y+e.vy*.28);if(e.blockedFor>.4){g.lineStyle(2,0xffd45c,.9);g.strokeCircle(e.x,e.y,18);g.lineStyle(2,0x62e8ff,.8);}}g.lineStyle(3,0x8fff89,.9);g.lineBetween(this.state.player.x,this.state.player.y,this.state.player.x+this.state.player.vx*.3,this.state.player.y+this.state.player.vy*.3);}
 update(_t:number,delta:number){
  if(this.overlay||this.ended)return;this.acc+=Math.min(delta/1000,.1);while(this.acc>=this.fixedStep){this.step();this.acc-=this.fixedStep;}const alpha=interpolationAlpha(this.acc,this.fixedStep),profile=renderProfile(this.state.pokemonId);this.renderPlayer=interpolatePosition(this.previousPlayer,this.state.player,alpha);const playerOffset=this.applyPokemonAnimation(this.player,this.playerAnimation,this.state.pokemonId,this.state.player.facing,Math.hypot(this.state.player.vx,this.state.player.vy),this.renderPlayer);this.playerShadow.setPosition(this.renderPlayer.x,this.renderPlayer.y+profile.shadowOffsetY).setDepth(this.renderPlayer.y-2);this.cameraTarget.setPosition(this.renderPlayer.x,this.renderPlayer.y);this.syncViews(alpha);this.syncWorldChunks();this.drawDebug();this.renderHealthBars();
  this.updateGrass();
  const moves=[0,1,2,3].map(i=>{const s=this.state.moveSlots[i];return s?`${MOVES[s.id].name} R${s.rank}`:'—'}).join('  |  '),items=[0,1,2,3].map(i=>{const s=this.state.items[i];return s?`${ITEMS[s.id].name} R${s.rank}`:'—'}).join('  |  ');this.hud.setText(`XP ${this.state.xp}/${this.state.nextXp}   TIME ${Math.floor(this.state.time/60)}:${String(Math.floor(this.state.time%60)).padStart(2,'0')}   KO ${this.state.defeated}${this.fast?'   [FAST TEST MODE]':''}\nMOVES ${moves}\nITEMS ${items}`);
  if(this.debugText){const ranged=this.state.enemies.filter(e=>e.behavior==='ranged').length;this.debugText.setText(`DEBUG\nFPS ${Math.round(this.game.loop.actualFps)}  SIM 30 Hz  α ${alpha.toFixed(2)}\nAnim ${this.playerAnimation.state}  Key ${this.player.anims.currentAnim?.key??'idle'}  Frame ${String(this.player.frame.name)}\nFacing ${this.state.player.facing}  Ground offset ${playerOffset.toFixed(1)}\nSim ${this.state.player.x.toFixed(1)},${this.state.player.y.toFixed(1)}  Prev ${this.previousPlayer.x.toFixed(1)},${this.previousPlayer.y.toFixed(1)}\nRender ${this.renderPlayer.x.toFixed(1)},${this.renderPlayer.y.toFixed(1)}  Shadow ${this.playerShadow.x.toFixed(1)},${this.playerShadow.y.toFixed(1)}\nCamera ${this.cameraTarget.x.toFixed(1)},${this.cameraTarget.y.toFixed(1)}  Chunk ${this.activeChunk.cx},${this.activeChunk.cy}\nPhase ${this.state.encounterPhase}  Ranged ${ranged}/${this.state.maxRangedEnemies}  Shots ${this.state.projectiles.length}/${this.state.maxEnemyProjectiles}\nEnemies ${this.state.enemies.length}  Checks ${this.state.collisionChecks}  Nav ${this.state.navigationRebuilds}\nSeed ${this.state.seed}  Hash ${stateHash(this.state)}`);}
 }
}
const game=new Phaser.Game({type:Phaser.AUTO,width:W,height:H,parent:'app',scene:[MenuScene,PokemonScene,StageScene,DexScene,ResearchScene,GameScene],render:{pixelArt:true,antialias:false},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}});
(window as unknown as {__POKEMON_SURVIVORS__:Phaser.Game}).__POKEMON_SURVIVORS__=game;
