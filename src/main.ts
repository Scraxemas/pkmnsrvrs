import Phaser from 'phaser';
import {PRIMARY_FONT_FAMILY} from './ui/fonts';
import { assetFor, ENEMIES, ITEMS, MOVES, POKEMON, SPRITE_FRAMES } from './content';
import { FACINGS, Facing, facingRow, facingFromVector } from './direction';
import { ENVIRONMENT_ASSETS, ENVIRONMENT_ATLASES, environmentKey, environmentUrl } from './environmentAssets';
import {cliffFrame,decorationVisual,visibleChunkRange} from './worldPresentation';
import {GrassBrushField} from './grassBrush';
import {GRASS_FOREGROUND_ALPHA,grassFootCoverage,measureVisibleRows,opaqueGrassBladeColumn,VisibleRows} from './grassOcclusion';
import {gameplayHudLayout, GameplayHudLayout, hpBarColor,experienceProgress} from './hudLayout';
import {seedForRun} from './runSeed';
import {RENDER_SETTINGS} from './renderSettings';
import {renderProfile} from './renderProfiles';
import { applyUpgrade, AttackEvent, beginBossEncounter, isUpgradeAvailable, makeState, masteryOptions, rewardRoll, SimState, spawnSpecies, stateHash, tick, Upgrade, upgradeOptions, canSpendMoveCredit } from './simulation';
import {UpgradeScene} from './upgradeScene';
import {RunResultsScene} from './ui/runResultsScene';
import { discover, loadSave, recordEvolution, recordForestDiscoveries, recordRun, recordSessionEvents } from './save';
import {adjacencyMask,TERRAIN,terrainAt} from './terrain';
import {PokemonAnimationController} from './animationState';
import {encounterPhaseAt,weightedSpecies} from './encounters';
import {frameGroundOffset} from './groundOffsets';
import {interpolatePosition,interpolationAlpha,Position} from './interpolation';
import {chunkKey,prewarmWorldChunk,syncWorldChunks as syncWorldData} from './worldgen';
import {forestObjectiveText} from './forestObjectives';
import {MenuScene,PokemonScene,StageScene,DexScene,ResearchScene,SettingsScene,stopFrontendScenes} from './menuScenes';
import {motionReduced,PlayerSettings} from './preferences';
import {preloadItemArt} from './itemAssets';
import {hasMoveArt,moveTexture,preloadMoveArt} from './moveAssets';
import {pixelArt} from './ui/pixelArt';
import {PickupRenderer} from './pickupRenderer';
import {ItemHud} from './ui/itemHud';
import {MoveHud} from './ui/moveHud';
import {progressionNoticeText} from './upgrades';
import {MoveVfxRenderer,preloadMoveVfx} from './moveVfx';
import {nativeActionFor,nativeAnimationKey,nativeTexture,preloadNativeActions,registerNativeAnimations} from './nativeAnimation';
import {TM_RESEARCH_REWARDS,tmLabel} from './data/moveUnlocks';
import {PointerMovementController} from './pointerMovement';
import {combineMovement,readGamepadMovement,type MovementVector} from './movementVector';
import './style.css';

const W=1280,H=720,FONT=PRIMARY_FONT_FAMILY;
interface GrassView {back:Phaser.GameObjects.Image;front:Phaser.GameObjects.Image;blades:Phaser.GameObjects.Image;x:number;y:number;}
interface ChoiceRequest {id:number;title:string;kind:'level'|'mastery'|'fixed'|'credit';options?:Upgrade[];onDone?:()=>void;}
class GameScene extends Phaser.Scene {
 groundLayer!:Phaser.GameObjects.Layer;worldLayer!:Phaser.GameObjects.Layer;effectsLayer!:Phaser.GameObjects.Layer;
 preferences!:PlayerSettings;
 state!:SimState;keys!:Record<string,Phaser.Input.Keyboard.Key>;player!:Phaser.GameObjects.Sprite;playerShadow!:Phaser.GameObjects.Ellipse;cameraTarget!:Phaser.GameObjects.Zone;
 portrait!:Phaser.GameObjects.Image;hud!:Phaser.GameObjects.Text;expGraphics!:Phaser.GameObjects.Graphics;expText!:Phaser.GameObjects.Text;playerHpGraphics!:Phaser.GameObjects.Graphics;bossGraphics!:Phaser.GameObjects.Graphics;bossText!:Phaser.GameObjects.Text;hpLayout!:GameplayHudLayout;
 expDisplay=0;expLevel=1;expFlash=0;playerHpBounds={x:0,y:0,width:0,height:0,fillWidth:0};
 debugText?:Phaser.GameObjects.Text;debugGraphics?:Phaser.GameObjects.Graphics;enemyViews=new Map<number,Phaser.GameObjects.Sprite>();enemyShadows=new Map<number,Phaser.GameObjects.Ellipse>();pickupViews=new Map<number,Phaser.GameObjects.Image>();projectileViews=new Map<number,Phaser.GameObjects.Shape>();
 pickupRenderer!:PickupRenderer;itemHud!:ItemHud;moveHud!:MoveHud;previousPickups=new Map<number,Position>();
 playerAnimation!:PokemonAnimationController;enemyAnimations=new Map<number,PokemonAnimationController>();previousPlayer!:Position;previousEnemies=new Map<number,Position>();previousProjectiles=new Map<number,Position>();renderPlayer:Position={x:0,y:0};
 chunkViews=new Map<string,Phaser.GameObjects.GameObject[]>();chunkRangeKey='';activeChunk={cx:Number.NaN,cy:Number.NaN};sessionDefeats:Record<string,number>={};sessionBalls=0;acc=0;overlay?:Phaser.GameObjects.Container;fast=false;debug=false;duration=1800;nextSpawn=0;miniIndex=0;ended=false;
 grassViews=new Map<string,GrassView>();grassBrush=new GrassBrushField();grassParticles=new Set<Phaser.GameObjects.Rectangle>();grassBrushCount=0;
 pokemonVisibleRows=new Map<string,VisibleRows[]>();
 moveVfx!:MoveVfxRenderer;statusHud!:Phaser.GameObjects.Text;researchBase:Record<string,number>={};lastHitReaction=Number.NEGATIVE_INFINITY;
 objectiveHud!:Phaser.GameObjects.Text;
 pendingChoices:ChoiceRequest[]=[];activeChoice?:{request:ChoiceRequest;options:Upgrade[]};choiceSerial=0;
 chunkContentRevision=0;
 forestDiscoveryCount=0;
 pointerMovement!:PointerMovementController;
 private movement:MovementVector={x:0,y:0};private padMovement:MovementVector={x:0,y:0};
 private controlPointer!:Phaser.Input.Pointer;
 readonly fixedStep=1/30;readonly miniProgress=[.10,.233,.367,.50,.633,.767,.90];

 constructor(){super('game')}
 init(d:{pokemon:string;fast?:boolean;seed?:number}){
  const saved=loadSave();this.preferences=saved.settings;this.researchBase={...saved.research};this.fast=!!d.fast;this.debug=import.meta.env.DEV&&new URLSearchParams(location.search).has('debug');this.state=makeState(POKEMON[d.pokemon]??POKEMON.bulbasaur,seedForRun(location.search,d.seed),undefined,{discoveredTms:saved.discoveredTms});this.duration=this.fast?90:1800;this.ended=false;this.overlay=undefined;this.acc=0;this.nextSpawn=0;this.miniIndex=0;this.sessionDefeats={};this.sessionBalls=0;this.expDisplay=0;this.expLevel=1;this.expFlash=0;
  this.enemyViews.clear();this.enemyShadows.clear();this.enemyAnimations.clear();this.pickupViews.clear();this.projectileViews.clear();this.previousEnemies.clear();this.previousProjectiles.clear();this.chunkViews.clear();this.chunkRangeKey='';this.activeChunk={cx:Number.NaN,cy:Number.NaN};this.previousPlayer={x:this.state.player.x,y:this.state.player.y};
  this.grassViews.clear();this.grassBrush.clear();this.grassParticles.clear();this.grassBrushCount=0;
  this.previousPickups.clear();
  this.chunkContentRevision=0;
  this.forestDiscoveryCount=0;
  this.pendingChoices=[];this.activeChoice=undefined;this.choiceSerial=0;this.lastHitReaction=Number.NEGATIVE_INFINITY;
 }
 preload(){preloadItemArt(this);preloadMoveArt(this);preloadMoveVfx(this);preloadNativeActions(this);const ids=new Set([...Object.keys(POKEMON),...Object.keys(ENEMIES)]);for(const id of ids){const f=SPRITE_FRAMES[id];if(f)this.load.spritesheet(`${id}-sprite`,assetFor(id,'sprite'),{frameWidth:f.width,frameHeight:f.height});this.load.image(`${id}-portrait`,assetFor(id,'portrait'));}for(const name of new Set(Object.values(ENVIRONMENT_ASSETS))){if(ENVIRONMENT_ATLASES.has(name))this.load.spritesheet(environmentKey(name),environmentUrl(name),{frameWidth:16,frameHeight:16});else if(name.startsWith('original/'))this.load.svg(environmentKey(name),environmentUrl(name));else this.load.image(environmentKey(name),environmentUrl(name));}}
 create(){
  stopFrontendScenes(this);
  // World-coordinate depths sort only inside these layers. Their bounded
  // scene depths keep terrain below actors and the HUD above any world y.
  this.groundLayer=this.add.layer().setName('terrain-layer').setDepth(0);
  this.worldLayer=this.add.layer().setName('world-layer').setDepth(1);
  this.effectsLayer=this.add.layer().setName('world-effects-layer').setDepth(2);
  this.events.once('shutdown',()=>{this.scene.stop('upgrade');this.scene.stop('results');this.pickupRenderer.destroy();this.itemHud.destroy();this.moveHud.destroy();this.moveVfx.destroy();});
  this.cameras.main.centerOn(this.state.player.x,this.state.player.y);this.drawForest();
  // Prepare one likely next chunk between crossings, never the whole world.
  this.time.addEvent({delay:175,loop:true,callback:()=>prewarmWorldChunk(this.state.world,this.state.player.x,this.state.player.y)});
  for(const id of Object.keys(SPRITE_FRAMES)){const f=SPRITE_FRAMES[id];if(!this.textures.exists(`${id}-sprite`))continue;for(const facing of FACINGS){const row=facingRow(facing),key=`${id}-walk-${facing}`;if(!this.anims.exists(key))this.anims.create({key,frames:this.anims.generateFrameNumbers(`${id}-sprite`,{start:row*f.frames,end:row*f.frames+f.frames-1}),frameRate:Math.max(6,Math.min(10,f.frames*1.5)),repeat:-1});}}
  registerNativeAnimations(this);this.moveVfx=new MoveVfxRenderer(this,this.worldLayer);
  this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,ESC') as Record<string,Phaser.Input.Keyboard.Key>;
  const profile=renderProfile(this.state.pokemonId);this.playerAnimation=new PokemonAnimationController(this.state.pokemonId);
  this.playerShadow=this.add.ellipse(this.state.player.x,this.state.player.y+profile.shadowOffsetY,profile.shadowWidth,profile.shadowHeight,0x0a1710,.42).setDepth(this.state.player.y-2).setVisible(RENDER_SETTINGS.entityShadows);
  this.player=this.add.sprite(this.state.player.x,this.state.player.y,`${this.state.pokemonId}-sprite`,0).setOrigin(.5,1).setScale(profile.scale).setDepth(this.state.player.y+20);
  this.worldLayer.add([this.playerShadow,this.player]);
  this.cameraTarget=this.add.zone(this.state.player.x,this.state.player.y,1,1);if(!this.state.world.stream)this.cameras.main.setBounds(0,0,this.state.world.width,this.state.world.height);else this.cameras.main.removeBounds();this.cameras.main.roundPixels=true;this.cameras.main.startFollow(this.cameraTarget,true,1,1);
  this.hpLayout=gameplayHudLayout(W,H);this.expGraphics=this.add.graphics().setDepth(22000).setScrollFactor(0);this.expText=this.add.text(W/2,this.hpLayout.experience.y+this.hpLayout.experience.height/2,'',{fontFamily:FONT,fontSize:'17px',fontStyle:'bold',color:'#fff',stroke:'#10202a',strokeThickness:3}).setOrigin(.5).setDepth(22001).setScrollFactor(0);this.playerHpGraphics=this.add.graphics().setDepth(18000);this.bossGraphics=this.add.graphics().setDepth(21990).setScrollFactor(0);this.bossText=this.add.text(W/2,this.hpLayout.boss.y+this.hpLayout.boss.height/2,'',{fontFamily:FONT,fontSize:'13px',fontStyle:'bold',color:'#fff',stroke:'#2a1010',strokeThickness:2}).setOrigin(.5).setDepth(21991).setScrollFactor(0);this.portrait=this.add.image(1215,this.hpLayout.portraitY,`${this.state.pokemonId}-portrait`).setScale(1.35).setDepth(20000).setScrollFactor(0);this.hud=this.add.text(18,this.hpLayout.infoY,'',{fontFamily:FONT,fontSize:'14px',color:'#fff',backgroundColor:'#102019dd',padding:{x:10,y:8},lineSpacing:3}).setDepth(20000).setScrollFactor(0);
  this.effectsLayer.add(this.playerHpGraphics);
  this.objectiveHud=this.add.text(18,174,'',{fontFamily:FONT,fontSize:'12px',color:'#dce8c8',backgroundColor:'#102019c9',padding:{x:8,y:5}}).setName('forest-objective').setDepth(20000).setScrollFactor(0);
  if(this.debug){this.debugGraphics=this.add.graphics().setDepth(19990);this.effectsLayer.add(this.debugGraphics);this.debugText=this.add.text(W-440,H-215,'',{fontFamily:FONT,fontSize:'13px',color:'#9fffb3',backgroundColor:'#07120ddd',padding:{x:8,y:6}}).setDepth(22010).setScrollFactor(0);}
  this.pickupRenderer=new PickupRenderer(this,this.worldLayer,this.effectsLayer);this.pickupViews=this.pickupRenderer.views;this.itemHud=new ItemHud(this);this.moveHud=new MoveHud(this);this.itemHud.update(this.state,motionReduced(this.preferences));this.renderMoveHud();
  this.statusHud=this.add.text(790,125,'',{fontFamily:FONT,fontSize:'11px',color:'#cce8d5',backgroundColor:'#102019b8',padding:{x:7,y:5},wordWrap:{width:350}}).setName('combat-status-hud').setDepth(20000).setScrollFactor(0);
  if(import.meta.env.DEV)void import('./devMoveTools').then(({installMoveDevelopmentTools})=>installMoveDevelopmentTools(this));
  spawnSpecies(this.state,'caterpie',6);spawnSpecies(this.state,'weedle',4);this.renderHealthBars();
  // This unregistered pointer is used only for hit testing at native event coordinates.
  this.controlPointer=new Phaser.Input.Pointer(this.input.manager,-1);
  this.pointerMovement=new PointerMovementController(this.game.canvas,{
   isEnabled:()=>this.movementEnabled(),overControl:(x,y)=>this.overGameplayControl(x,y),onInterrupt:this.clearMovement,
  });
  this.events.on(Phaser.Scenes.Events.PAUSE,this.clearMovement);
  this.events.on(Phaser.Scenes.Events.SLEEP,this.clearMovement);
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,this.destroyMovement);
  this.events.once(Phaser.Scenes.Events.DESTROY,this.destroyMovement);
 }
 applyPokemonAnimation(sprite:Phaser.GameObjects.Sprite,controller:PokemonAnimationController,species:string,facing:Facing,speed:number,ground:Position,multiplier=1){
  const f=SPRITE_FRAMES[species],profile=renderProfile(species);if(!f)return 0;controller.setSpecies(species);const decision=controller.update(this.state.time,facing,speed),row=facingRow(facing),walkKey=`${species}-walk-${facing}`,actionKind=decision.state==='hit'?'hurt':controller.actionKind,action=nativeActionFor(species,decision.state,actionKind);
  if(action&&sprite===this.player){
   const actionFacing=decision.state==='attack'?controller.actionFacing:facing,key=nativeAnimationKey(species,actionKind,actionFacing);
   if(sprite.texture.key!==nativeTexture(species,actionKind)||sprite.anims.currentAnim?.key!==key||(decision.state==='attack'&&sprite.getData('nativeActionStartedAt')!==controller.startedAt)){sprite.play(key);sprite.setData('nativeActionStarts',(sprite.getData('nativeActionStarts')??0)+1).setData('nativeActionStartedAt',controller.startedAt);}
   sprite.setOrigin(action.anchorX/action.frameWidth,action.anchorY/action.frameHeight).setScale(profile.scale*multiplier).setPosition(ground.x,ground.y+profile.elevation).setDepth(ground.y+20).setData('nativeAction',action.action).setData('nativeActionKind',actionKind);
   this.applyGrassOcclusion(sprite,species,ground);return profile.elevation;
  }
  if(sprite.texture.key!==`${species}-sprite`){sprite.anims.stop();sprite.setTexture(`${species}-sprite`,row*f.frames);}
  sprite.setData('nativeAction',null).setData('nativeActionKind',null);
  if(decision.moving&&decision.state!=='stun'&&decision.state!=='evolution'&&decision.state!=='defeat'){
   if(sprite.anims.currentAnim?.key!==walkKey||!sprite.anims.isPlaying){const progress=sprite.anims.isPlaying?sprite.anims.getProgress():0;sprite.play(walkKey,true);if(progress>0)sprite.anims.setProgress(progress);}
  }else if(sprite.anims.isPlaying||Number(sprite.frame.name)!==row*f.frames){sprite.anims.stop();sprite.setFrame(row*f.frames);}
  sprite.setOrigin(.5,1).setScale(profile.scale*multiplier);const frame=Number(sprite.frame.name)||0,offset=frameGroundOffset(species,frame)*profile.scale*multiplier+profile.elevation;
  sprite.setPosition(ground.x,ground.y+offset).setDepth(ground.y+20);this.applyGrassOcclusion(sprite,species,ground);return offset;
 }
 applyGrassOcclusion(sprite:Phaser.GameObjects.Sprite,species:string,ground:Position){
  const coverage=renderProfile(species).elevation<-4?0:grassFootCoverage(ground.x,ground.y,this.state.world.terrain.tileSize,(cx,cy)=>this.grassViews.get(chunkKey(cx,cy)));
  // The complete body is always drawn. Depth-sorted foliage supplies the
  // overlap, including during native attacks and all eight walk directions.
  sprite.setData('grassCoverage',coverage);
 }
 visibleRows(sprite:Phaser.GameObjects.Sprite,species:string){
  const cacheKey=sprite.texture.key;let rows=this.pokemonVisibleRows.get(cacheKey);const f={width:sprite.frame.width,height:sprite.frame.height};
  if(!rows){const source=sprite.texture.getSourceImage() as HTMLImageElement,canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;const context=canvas.getContext('2d',{willReadFrequently:true})!;context.drawImage(source,0,0);rows=measureVisibleRows(context.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height,f.width,f.height);this.pokemonVisibleRows.set(cacheKey,rows);}
  return rows[Number(sprite.frame.name)]??{top:0,bottom:f.height};
 }
 renderHealthBars(delta=16.67){
  const layout=this.hpLayout,summary=experienceProgress(this.state.level,this.state.xp,this.state.nextXp),bar=layout.experience,g=this.expGraphics;
  if(this.expLevel!==this.state.level){this.expLevel=this.state.level;this.expDisplay=0;this.expFlash=1;}
  this.expDisplay+=(summary.ratio-this.expDisplay)*(1-Math.exp(-delta/80));this.expFlash=Math.max(0,this.expFlash-delta/450);
  g.clear().fillStyle(0x08121c,.96).fillRect(bar.x-4,bar.y-4,bar.width+8,bar.height+8).fillStyle(0x1d2d51,1).fillRect(bar.x,bar.y,bar.width,bar.height).fillStyle(this.expFlash>.3?0xbfeeff:0x62c8ff,1).fillRect(bar.x,bar.y,Math.round(bar.width*this.expDisplay),bar.height).lineStyle(3,0xe7dfb0,1).strokeRect(bar.x-1,bar.y-1,bar.width+2,bar.height+2);
  this.expText.setText(summary.label);
  const hpRatio=Math.max(0,Math.min(1,this.state.hp/Math.max(1,this.state.maxHp))),zoom=this.cameras.main.zoom,rows=this.visibleRows(this.player,this.state.pokemonId),head=this.player.y-this.player.displayOriginY*this.player.scaleY+rows.top*this.player.scaleY;
  const width=Math.max(35,Math.min(55,renderProfile(this.state.pokemonId).shadowWidth+5))/zoom,height=5/zoom,x=this.renderPlayer.x-width/2,y=head-10/zoom;
  this.playerHpBounds={x,y,width,height,fillWidth:width*hpRatio};this.playerHpGraphics.clear().setVisible(hpRatio<1);
  if(hpRatio<1)this.playerHpGraphics.fillStyle(0x071411,1).fillRect(x-2/zoom,y-2/zoom,width+4/zoom,height+4/zoom).fillStyle(0x402c31,1).fillRect(x,y,width,height).fillStyle(hpBarColor(hpRatio),1).fillRect(x,y,width*hpRatio,height);
  const boss=this.state.enemies.find(enemy=>enemy.boss),bg=this.bossGraphics,b=layout.boss;bg.clear();if(!boss){this.bossText.setVisible(false);return;}const bossRatio=Math.max(0,Math.min(1,boss.hp/Math.max(1,boss.maxHp)));bg.fillStyle(0x12090a,.94).fillRect(b.x-3,b.y-3,b.width+6,b.height+6).fillStyle(0x3b2023,1).fillRect(b.x,b.y,b.width,b.height).fillStyle(0xcc4b5d,1).fillRect(b.x,b.y,Math.round(b.width*bossRatio),b.height).lineStyle(2,0xf1d5a8,1).strokeRect(b.x-1,b.y-1,b.width+2,b.height+2);this.bossText.setVisible(true).setText(`BEEDRILL · PHASE ${boss.phase}     ${Math.max(0,Math.ceil(boss.hp))} / ${Math.ceil(boss.maxHp)}`);
 }
 terrainTexture(x:number,y:number){
  return terrainAt(this.state.world.terrain,x,y)===TERRAIN.water?ENVIRONMENT_ASSETS.waterAtlas:ENVIRONMENT_ASSETS.pathAtlas;
 }
 drawForest(){this.cameras.main.setBackgroundColor('#70c8a0');this.syncWorldChunks(true);}
 groundObject<T extends Phaser.GameObjects.GameObject>(object:T):T{this.groundLayer.add(object);return object;}
 addForestTree(x:number,y:number,name:string,scale=2){
  const image=this.add.image(x,y,environmentKey(name));
  this.worldLayer.add(image);
  // Both metatrees include two pixels of padding and four pixels of ground
  // below the trunk. Sort at the trunk so overlapping canopies stay intact.
  return image.setOrigin(.5,(image.height-6)/image.height).setScale(scale).setDepth(y).setData('forestTree',true);
 }
 addGrass(x:number,y:number,cellX:number,cellY:number){
  // Preserve the complete silhouette, including its sway, at world borders.
  if(!this.state.world.stream){x=Math.max(32,Math.min(this.state.world.width-32,x));y=Math.max(40,Math.min(this.state.world.height-12,y));}
  const bladeKey=environmentKey('frlg/tall_grass_opaque_blades');
  if(!this.textures.exists(bladeKey)){
   const source=this.textures.get(environmentKey(ENVIRONMENT_ASSETS.grassFront)).getSourceImage() as HTMLImageElement;
   const texture=this.textures.createCanvas(bladeKey,source.width,source.height)!;
   // Reuse thin strips from the original leaf artwork. This changes foliage
   // only; Pokémon textures, alpha, frame rectangles and masks stay untouched.
   for(let column=0;column<source.width;column++)if(opaqueGrassBladeColumn(column,source.width))texture.context.drawImage(source,column,0,1,source.height,column,0,1,source.height);
   texture.refresh().setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  const key=chunkKey(cellX,cellY),back=this.add.image(x,y,environmentKey(ENVIRONMENT_ASSETS.tallGrass)),front=this.add.image(x,y,environmentKey(ENVIRONMENT_ASSETS.grassFront)),blades=this.add.image(x,y,bladeKey);
  for(const image of [back,front,blades])image.setOrigin(.5,(image.height-2)/image.height).setScale(2).setData('grass',true);
  back.setDepth(2);front.setDepth(y+24).setAlpha(GRASS_FOREGROUND_ALPHA);blades.setDepth(y+24.01);
  this.groundLayer.add(back);this.worldLayer.add([front,blades]);
  this.grassViews.set(key,{back,front,blades,x,y});
  back.once('destroy',()=>{this.grassViews.delete(key);this.grassBrush.forget(key);});
  return[back,front,blades];
 }
 emitGrassBlades(x:number,y:number,vx:number,vy:number){
  if(this.grassParticles.size>=72)return;
  const phase=this.grassBrushCount++,direction=Math.abs(vx)>8?Math.sign(vx):Math.sign(vy)||1;
  for(let i=0;i<3&&this.grassParticles.size<72;i++){
   const blade=this.add.rectangle(x+(i-1)*4,y-4,2,5,[0x389030,0x98d878,0x58b848][i]).setRotation((i-1)*.6).setDepth(y+26);
   this.worldLayer.add(blade);
   this.grassParticles.add(blade);blade.once('destroy',()=>this.grassParticles.delete(blade));
   this.tweens.add({targets:blade,x:x+direction*(8+i*4)+Math.sin(phase+i)*10,y:y-12-(i%2)*12,angle:direction*(45+i*32),alpha:0,duration:280+i*60,ease:'Quad.easeOut',onComplete:()=>blade.destroy()});
  }
 }
 updateGrass(){
  const time=this.state.time,tile=this.state.world.terrain.tileSize;
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
   for(const image of [view.back,view.front,view.blades])image.setRotation(bend?.rotation??0).setScale(2*(bend?.scaleX??1),2*(bend?.scaleY??1));
  }
 }
 renderWorldChunk(cx:number,cy:number){
  // Small render pages are independent of the larger generation chunks.
  const cells=16,map=this.state.world,key=chunkKey(cx,cy),tile=map.terrain.tileSize,pageSize=cells*tile,objects:Phaser.GameObjects.GameObject[]=[],baseX=cx*cells,baseY=cy*cells,details=[ENVIRONMENT_ASSETS.grass,ENVIRONMENT_ASSETS.grassRocks,ENVIRONMENT_ASSETS.forestFloor];
  const ownerKey=chunkKey(Math.floor(cx*pageSize/map.chunkSize),Math.floor(cy*pageSize/map.chunkSize));if(!map.chunks[ownerKey])return;
  for(let ly=0;ly<cells;ly++)for(let lx=0;lx<cells;lx++){
   const x=baseX+lx,y=baseY+ly;if(!map.stream&&(x<0||y<0||x>=map.terrain.cols||y>=map.terrain.rows))continue;const wx=x*tile+tile/2,wy=y*tile+tile/2,value=terrainAt(map.terrain,x,y),hash=Math.abs((x*17+y*31+map.seed*7)|0);
   objects.push(this.groundObject(this.add.image(wx,wy,environmentKey(ENVIRONMENT_ASSETS.grassFill)).setDisplaySize(tile,tile).setDepth(0)));
   if(value===TERRAIN.path||value===TERRAIN.water)objects.push(this.groundObject(this.add.image(wx,wy,environmentKey(this.terrainTexture(x,y)),adjacencyMask(map.terrain,x,y,value)).setDisplaySize(tile,tile).setDepth(1)));
   else if(value===TERRAIN.cliff){const mask=adjacencyMask(map.terrain,x,y,value),image=this.add.image(wx,wy,environmentKey(ENVIRONMENT_ASSETS.cliffAtlas),cliffFrame(!!(mask&1),!!(mask&4),!!(mask&16),!!(mask&64))).setDisplaySize(tile,tile).setDepth(wy+tile/2);this.worldLayer.add(image);objects.push(image);}
   // Transparent whole tufts can bend without rotating opaque ground squares.
   else if(value===TERRAIN.tallGrass)objects.push(...this.addGrass(wx+((y%2)*2-1)*2,wy+12,x,y));
   else if(hash%7===0)objects.push(this.groundObject(this.add.image(wx,wy,environmentKey(details[hash%details.length])).setScale(2).setDepth(.5)));
  }
  for(const d of (map.decorationBuckets[ownerKey]??[]).filter(d=>Math.floor(d.x/pageSize)===cx&&Math.floor(d.y/pageSize)===cy)){
   const visual=decorationVisual(d.id,d.x,d.y,map.seed,d.radius),image=this.add.image(Math.round(d.x),Math.round(d.y),environmentKey(visual.name));
   this.worldLayer.add(image);
   image.setOrigin(.5,(image.height-visual.trunkPadding)/image.height).setDepth(d.y).setScale(visual.scale).setData('mapProp',d.id);if(d.id==='tree')image.setData('forestTree',true);objects.push(image);
  }
  for(const landmark of map.landmarks.filter(l=>Math.floor(l.x/pageSize)===cx&&Math.floor(l.y/pageSize)===cy)){
   if(landmark.id==='ancient-tree')objects.push(this.addForestTree(landmark.x,landmark.y,ENVIRONMENT_ASSETS.ancientTree,4));
   const label=({'entrance':'VIRIDIAN FOREST','pikachu-hollow':'PIKACHU HOLLOW','beedrill-nest':'BEEDRILL NEST','pewter-exit':'TO PEWTER CITY'} as Record<string,string>)[landmark.id];
   if(label)objects.push(this.groundObject(this.add.text(landmark.x,landmark.y-90,label,{fontFamily:FONT,fontSize:'13px',color:'#f2f1c9',backgroundColor:'#193d2bdd',padding:{x:8,y:5}}).setOrigin(.5).setDepth(2)));
  }
  this.chunkViews.set(key,objects);
 }
 syncWorldChunks(force=false){
  const map=this.state.world,size=16*map.terrain.tileSize,cam=this.cameras.main,halfW=cam.width/(2*cam.zoom),halfH=cam.height/(2*cam.zoom),centerX=cam.scrollX+cam.width/2,centerY=cam.scrollY+cam.height/2;
  syncWorldData(map,this.state.player.x,this.state.player.y);
  if(map.stream&&this.chunkContentRevision!==map.stream.contentRevision){for(const objects of this.chunkViews.values())for(const object of objects)object.destroy();this.chunkViews.clear();this.chunkContentRevision=map.stream.contentRevision;}
  this.activeChunk={cx:Math.floor(this.state.player.x/map.chunkSize),cy:Math.floor(this.state.player.y/map.chunkSize)};
  const range=map.stream?{minX:Math.floor((centerX-halfW-128)/size),maxX:Math.floor((centerX+halfW+128)/size),minY:Math.floor((centerY-halfH-128)/size),maxY:Math.floor((centerY+halfH+256)/size)}:visibleChunkRange({left:centerX-halfW,right:centerX+halfW,top:centerY-halfH,bottom:centerY+halfH},size,Math.ceil(map.width/size),Math.ceil(map.height/size)),rangeKey=JSON.stringify([range,map.stream?.revision]);if(!force&&rangeKey===this.chunkRangeKey)return;this.chunkRangeKey=rangeKey;const wanted=new Set<string>();
  for(let cy=range.minY;cy<=range.maxY;cy++)for(let cx=range.minX;cx<=range.maxX;cx++){const key=chunkKey(cx,cy),owner=chunkKey(Math.floor(cx*size/map.chunkSize),Math.floor(cy*size/map.chunkSize));if(map.chunks[owner]){wanted.add(key);if(!this.chunkViews.has(key))this.renderWorldChunk(cx,cy);}}
  for(const [key,objects] of this.chunkViews)if(!wanted.has(key)){for(const object of objects)object.destroy();this.chunkViews.delete(key);}
 }
 movementEnabled(){return this.scene.isActive()&&!this.overlay&&!this.ended&&this.input.enabled&&!document.hidden&&document.hasFocus();}
 private readonly clearMovement=()=>{
  this.pointerMovement?.reset();this.input.keyboard?.resetKeys();
  this.movement.x=0;this.movement.y=0;this.padMovement.x=0;this.padMovement.y=0;
  this.state.player.vx=0;this.state.player.vy=0;this.acc=0;
  this.previousPlayer={x:this.state.player.x,y:this.state.player.y};
 };
 private readonly destroyMovement=()=>{
  this.clearMovement();this.pointerMovement.destroy();this.controlPointer.destroy();
  this.events.off(Phaser.Scenes.Events.PAUSE,this.clearMovement);this.events.off(Phaser.Scenes.Events.SLEEP,this.clearMovement);
  this.events.off(Phaser.Scenes.Events.SHUTDOWN,this.destroyMovement);this.events.off(Phaser.Scenes.Events.DESTROY,this.destroyMovement);
 };
 private overGameplayControl(clientX:number,clientY:number){
  const rect=this.game.canvas.getBoundingClientRect();
  this.controlPointer.position.set((clientX-rect.left)*W/rect.width,(clientY-rect.top)*H/rect.height);
  // Phaser includes nested interactive objects and applies their camera transforms.
  return this.input.hitTestPointer(this.controlPointer).length>0;
 }
 moveInput(){
  if(!this.movementEnabled()){this.movement.x=0;this.movement.y=0;return this.movement;}
  this.padMovement.x=0;this.padMovement.y=0;
  try{if(typeof navigator.getGamepads==='function')readGamepadMovement(navigator.getGamepads(),this.padMovement);}catch{/* A browser policy may restrict gamepad access. */}
  return combineMovement(this.movement,
   (this.keys.D.isDown||this.keys.RIGHT.isDown?1:0)-(this.keys.A.isDown||this.keys.LEFT.isDown?1:0),
   (this.keys.S.isDown||this.keys.DOWN.isDown?1:0)-(this.keys.W.isDown||this.keys.UP.isDown?1:0),
   this.pointerMovement.joystick.vector,this.padMovement);
 }
 showChoices(title:string,options:Upgrade[],onDone?:()=>void){this.pendingChoices.push({id:++this.choiceSerial,title,kind:'fixed',options,onDone});this.showNextChoice();}
 queueLevelChoice(kind:'level'|'mastery',level:number){this.pendingChoices.push({id:++this.choiceSerial,title:kind==='mastery'?`LEVEL ${level} · MOVE MASTERY`:`LEVEL ${level} · CHOOSE YOUR POWER`,kind});this.showNextChoice();}
 showNextChoice(allowRecoveredCredit=true){
  if(this.activeChoice||this.ended)return;
  if(allowRecoveredCredit&&!this.pendingChoices.length&&this.state.moveUpgradeCredits>0&&canSpendMoveCredit(this.state))this.pendingChoices.push({id:++this.choiceSerial,title:'RECOVERED MOVE INVESTMENT',kind:'credit'});
  if(!this.pendingChoices.length){this.resumeAfterChoices();return;}
  const request=this.pendingChoices.shift()!;
  // A recovered move credit remains banked if its queued pool became exhausted.
  // Skip the request and continue ordinary queued rewards without spending it.
  if(request.kind==='credit'&&!canSpendMoveCredit(this.state)){this.showNextChoice(false);return;}
  let options=(request.kind==='fixed'?request.options!:request.kind==='mastery'?masteryOptions(this.state):upgradeOptions(this.state,3,request.kind==='credit'?'move':'all')).filter(u=>isUpgradeAvailable(this.state,u));
  if(request.kind==='credit'&&!options.length){this.showNextChoice(false);return;}
  if(!options.length)options=upgradeOptions(this.state);
  this.activeChoice={request,options};this.acc=0;this.overlay??=this.add.container(0,0).setScrollFactor(0);
  this.renderMoveHud();this.renderHealthBars();this.setGameplayNoticesVisible(false);
  // Immediate manager pause freezes Clock, TweenManager, sprite animation and scene updates together.
  if(!this.scene.isPaused('game'))this.scene.manager.pause(this);
  this.scene.launch('upgrade',{title:request.title,options,state:this.state,onSelect:(u:Upgrade)=>this.completeChoice(request.id,u)});
 }
 completeChoice(id:number,u:Upgrade){
  const active=this.activeChoice;if(!active||active.request.id!==id||!active.options.includes(u))return;
  if(!isUpgradeAvailable(this.state,u)||!applyUpgrade(this.state,u)){this.activeChoice=undefined;this.pendingChoices.unshift(active.request);this.showNextChoice();return;}
  if(active.request.kind==='credit')this.state.moveUpgradeCredits=Math.max(0,this.state.moveUpgradeCredits-1);
  this.pickupRenderer.onUpgrade(u,this.state);this.itemHud.update(this.state,motionReduced(this.preferences));this.renderMoveHud();if(u.kind==='moveEvolution'||u.kind==='moveFusion')this.showProgressionNotices();this.activeChoice=undefined;this.acc=0;active.request.onDone?.();this.renderHealthBars();
  this.showNextChoice();
 }
 resumeAfterChoices(){
  if(this.activeChoice||this.pendingChoices.length||this.ended)return;
  this.overlay?.destroy(true);this.overlay=undefined;this.acc=0;this.setGameplayNoticesVisible(true);
  if(this.scene.isPaused('game')){this.input.keyboard?.resetKeys();this.scene.manager.resume(this);}
 }
 cancelChoices(resume=true){this.scene.manager.stop('upgrade');this.pendingChoices=[];this.activeChoice=undefined;this.overlay?.destroy(true);this.overlay=undefined;this.acc=0;if(resume&&!this.ended){this.setGameplayNoticesVisible(true);if(this.scene.isPaused('game')){this.input.keyboard?.resetKeys();this.scene.manager.resume(this);}}}
 setGameplayNoticesVisible(visible:boolean){for(const object of this.children.list)if(object.getData('gameplayNotice'))(object as Phaser.GameObjects.Text).setVisible(visible);}
 renderMoveHud(){
  this.moveHud.update(this.state);
  this.hud.setText(`XP ${this.state.level>=100?'MAX':`${Number(this.state.xp.toFixed(1))}/${this.state.nextXp}`}   TIME ${Math.floor(this.state.time/60)}:${String(Math.floor(this.state.time%60)).padStart(2,'0')}   KO ${this.state.defeated}${this.fast?'   [FAST TEST MODE]':''}${this.state.moveUpgradeCredits?`   MOVE CREDITS ${this.state.moveUpgradeCredits}`:''}`);
  this.objectiveHud.setText(forestObjectiveText(this.state.world,this.state.player,this.state.bossSpawned));
 }
 showProgressionNotices(){
  if(!this.state.progressionNotices.length)return;this.renderMoveHud();
  const text=this.add.text(0,0,this.state.progressionNotices.map(progressionNoticeText).join('\n'),{fontFamily:FONT,fontSize:'16px',fontStyle:'bold',color:'#ffe9a0',backgroundColor:'#102019ed',padding:{x:12,y:8},align:'center',wordWrap:{width:950}}).setOrigin(.5,0);
  const notice=this.add.container(W/2,176,[text]).setName('move-progression-notice').setDepth(21000).setScrollFactor(0).setData('gameplayNotice',true).setVisible(!this.overlay);
  let row=0;for(const change of this.state.progressionNotices){
   if(change.kind!=='move'||!hasMoveArt(this,change.from)||!hasMoveArt(this,change.to))continue;
   const y=text.height+20+row++*40;
   notice.add([pixelArt(this,-32,y,moveTexture(change.from),32,'move-evolution-from').setData('assetId',change.from),this.add.text(0,y,'→',{fontFamily:FONT,fontSize:'21px',color:'#ffe9a0',stroke:'#102019',strokeThickness:3}).setOrigin(.5),pixelArt(this,32,y,moveTexture(change.to),32,'move-evolution-to').setData('assetId',change.to)]);
  }
  this.time.delayedCall(2800,()=>notice.destroy(true));
 }
 showEvolution(id:string){const p=POKEMON[id],profile=renderProfile(id);recordEvolution(id);this.player.anims.stop();this.player.setTexture(`${id}-sprite`,0);this.playerAnimation.setSpecies(id);this.playerAnimation.trigger('evolution',this.state.time,1.8);this.playerShadow.setSize(profile.shadowWidth,profile.shadowHeight);this.portrait.setTexture(`${id}-portrait`);const text=this.add.text(W/2,H/2,`Congratulations!\nYour Pokémon evolved into ${p.name}!`,{fontFamily:FONT,fontSize:'30px',color:'#ffe26b',backgroundColor:'#102019ee',padding:{x:30,y:24},align:'center'}).setOrigin(.5).setDepth(21000).setScrollFactor(0).setData('gameplayNotice',true).setVisible(!this.overlay);this.time.delayedCall(1800,()=>text.destroy());}
 showReward(tier:1|2|3){const options=rewardRoll(this.state,tier);this.showChoices(`${tier===3?'ULTRA':tier===2?'GREAT':'POKÉ'} BALL OPENED!`,options);}
 renderAttack(a:AttackEvent){
  this.moveVfx.emit(a,this.state.time,motionReduced(this.preferences));
  if(a.damage>0&&this.preferences.damageNumbers){
   const n=this.add.text(a.tx,a.ty-22,`${a.critical?'CRIT ':''}${Math.round(a.damage)}`,{fontFamily:FONT,fontSize:a.critical?'19px':'16px',fontStyle:'bold',color:a.critical?'#ffe08c':'#fff',stroke:'#17231c',strokeThickness:3}).setOrigin(.5).setDepth(17000);
   this.effectsLayer.add(n);
   this.tweens.add({targets:n,y:n.y-(motionReduced(this.preferences)?0:24),alpha:0,duration:620,onComplete:()=>n.destroy()});
  }
  for(const id of a.hits)this.enemyViews.get(id)?.setData('hitFlashUntil',this.state.time+.1);
 }
 syncTmResearch(){
  if(!TM_RESEARCH_REWARDS.some(reward=>!this.state.discoveredTms.includes(reward.tm)&&(this.researchBase[reward.research]??0)+(this.sessionDefeats[reward.research]??0)>=reward.count))return;
  const old=new Set(this.state.discoveredTms),saved=recordSessionEvents(this.sessionDefeats,this.sessionBalls);this.sessionDefeats={};this.sessionBalls=0;this.researchBase={...saved.research};this.state.discoveredTms=[...saved.discoveredTms];
  const unlocked=saved.discoveredTms.filter(id=>!old.has(id));if(!unlocked.length)return;
  const notice=this.add.text(W/2,183,`TM DISCOVERED! ${unlocked.map(tmLabel).join(' · ')}\nPermanently unlocked for compatible moves`,{fontFamily:FONT,fontSize:'15px',color:'#b9f1cd',backgroundColor:'#102019ed',padding:{x:14,y:10},align:'center'}).setName('tm-discovery-notice').setOrigin(.5,0).setDepth(21000).setScrollFactor(0).setData('gameplayNotice',true).setVisible(!this.overlay);
  this.time.delayedCall(3500,()=>notice.destroy());
 }
 renderCombatStatus(){
  const labels=this.state.combatRuntime.buffs.map(buff=>`${buff.kind.replace(/([A-Z])/g,' $1').toUpperCase()} ${Math.ceil(buff.remaining)}s`);
  if(this.state.combatRuntime.terrains.some(terrain=>terrain.kind==='grass'))labels.push('GRASSY TERRAIN');
  this.statusHud.setText(labels.slice(0,4).join(' · ')).setVisible(labels.length>0);
 }
 syncViews(alpha:number){
  const alive=new Set<number>();for(const e of this.state.enemies){alive.add(e.id);let v=this.enemyViews.get(e.id),shadow=this.enemyShadows.get(e.id),controller=this.enemyAnimations.get(e.id);const multiplier=e.boss?1.38:e.elite?1.18:1,profile=renderProfile(e.species),position=interpolatePosition(this.previousEnemies.get(e.id),e,alpha);
   if(!v){shadow=this.add.ellipse(position.x,position.y+profile.shadowOffsetY,profile.shadowWidth*multiplier,profile.shadowHeight*multiplier,0x08130d,.38).setVisible(RENDER_SETTINGS.entityShadows);v=this.add.sprite(position.x,position.y,`${e.species}-sprite`,0).setOrigin(.5,1);this.worldLayer.add([shadow,v]);controller=new PokemonAnimationController(e.species);this.enemyViews.set(e.id,v);this.enemyShadows.set(e.id,shadow);this.enemyAnimations.set(e.id,controller);discover(e.species);}
   v.setAlpha((v.getData('hitFlashUntil')??0)>this.state.time?.5:1);shadow!.setPosition(position.x,position.y+profile.shadowOffsetY).setDepth(position.y-2);this.applyPokemonAnimation(v,controller!,e.species,e.facing,Math.hypot(e.vx,e.vy),position,multiplier);v.setTint((e.staggerUntil??0)>this.state.time?0xffd577:e.attackWindup>0?0xffe58a:e.statuses.some(s=>s.kind==='toxic')?0xa653c7:e.statuses.some(s=>s.kind==='poison')?0xc86fea:e.statuses.some(s=>s.kind==='burn')?0xff7651:e.statuses.some(s=>s.kind==='sleep')?0xa6bfe7:e.statuses.some(s=>s.kind==='defenseBreak'||s.kind==='exposed')?0xe7cb81:e.statuses.some(s=>s.kind==='weaken'||s.kind==='worried')?0xafd4a1:0xffffff);
  }
  for(const [id,v] of this.enemyViews)if(!alive.has(id)){v.destroy();this.enemyShadows.get(id)?.destroy();this.enemyViews.delete(id);this.enemyShadows.delete(id);this.enemyAnimations.delete(id);}
  this.pickupRenderer.draw(this.state,this.previousPickups,alpha,motionReduced(this.preferences));
  const shots=new Set<number>();for(const p of this.state.projectiles){shots.add(p.id);let v=this.projectileViews.get(p.id);const position=interpolatePosition(this.previousProjectiles.get(p.id),p,alpha);if(!v){v=p.source==='pidgey'?this.add.ellipse(position.x,position.y,18,9,0xdff8ff,.9).setStrokeStyle(2,0x79cbe8):p.source==='butterfree'?this.add.circle(position.x,position.y,9,0xc982d8,.8).setStrokeStyle(2,0xf2c6ff):this.add.triangle(position.x,position.y,0,10,18,5,0,0,0x9b62c7,.95).setStrokeStyle(2,0xf1d7ff);v.setDepth(15000);this.effectsLayer.add(v);this.projectileViews.set(p.id,v);}v.setPosition(position.x,position.y);}for(const [id,v] of this.projectileViews)if(!shots.has(id)){v.destroy();this.projectileViews.delete(id);}
 }
 schedule(){
  const phase=encounterPhaseAt(this.state.time,this.duration);this.state.encounterPhase=phase.id;this.state.maxRangedEnemies=phase.maxRanged;this.state.maxEnemyProjectiles=phase.projectileCap;
  if(this.state.time>=this.nextSpawn&&this.state.enemies.length<phase.maxAlive){const roll=((this.state.seed>>>8)%100000)/100000;let species=weightedSpecies(phase,roll);const ranged=this.state.enemies.filter(e=>e.behavior==='ranged').length;if((species==='pidgey'||species==='butterfree')&&ranged>=phase.maxRanged)species=this.state.time%2<1?'caterpie':'weedle';spawnSpecies(this.state,species,this.fast?2:Math.min(1+Math.floor(this.state.time/360),5));this.nextSpawn=this.state.time+phase.spawnInterval*(this.fast?.55:1);}
  const progress=this.state.time/this.duration;if(this.miniIndex<this.miniProgress.length&&progress>=this.miniProgress[this.miniIndex]){spawnSpecies(this.state,this.miniIndex%2?'pidgeotto':'butterfree',1,true);this.miniIndex++;}
  if(!this.state.bossSpawned&&this.state.time>=this.duration&&beginBossEncounter(this.state)){
   this.previousPlayer={x:this.state.player.x,y:this.state.player.y};this.previousEnemies.clear();this.cameraTarget.setPosition(this.state.player.x,this.state.player.y);this.cameras.main.centerOn(this.state.player.x,this.state.player.y);this.syncWorldChunks(true);this.cameras.main.fadeIn(400,0,0,0);
  }
 }
 finish(result:'victory'|'defeat'){if(this.ended)return;this.ended=true;this.cancelChoices(false);if(!this.scene.isPaused('game'))this.scene.manager.pause(this);this.playerAnimation.trigger('defeat',this.state.time);recordSessionEvents(this.sessionDefeats,this.sessionBalls);recordRun({result,pokemon:this.state.pokemonId,stage:'viridian',level:this.state.level,time:this.state.time,defeated:this.state.defeated});this.overlay=this.add.container(0,0).setScrollFactor(0);this.scene.launch('results',{result,level:this.state.level,defeated:this.state.defeated,time:this.state.time,seed:this.state.world.seed,onReturn:()=>this.scene.start('menu')});}
 step(){
  if(this.overlay||this.ended)return;
  this.previousPlayer={x:this.state.player.x,y:this.state.player.y};this.previousEnemies=new Map(this.state.enemies.map(e=>[e.id,{x:e.x,y:e.y}]));this.previousProjectiles=new Map(this.state.projectiles.map(p=>[p.id,{x:p.x,y:p.y}]));this.previousPickups.clear();for(const p of this.state.pickups)this.previousPickups.set(p.id,{x:p.x,y:p.y});const previousHp=this.state.hp;
  const previousLevel=this.state.level;this.schedule();const events=tick(this.state,this.fixedStep,this.moveInput());const fired=this.state.attacks.filter(attack=>attack.animationEligible),primary=fired.find(attack=>attack.signature)??fired[0];if(primary){const kind=MOVES[primary.moveId].damageClass==='Special'?'special':'physical',action=nativeActionFor(this.state.pokemonId,'attack',kind);this.playerAnimation.attack(this.state.time,kind,facingFromVector(primary.tx-primary.x,primary.ty-primary.y,this.state.player.facing),action?.durationSeconds??.24,!!primary.signature);}if(this.state.hp<previousHp){if(this.state.time-this.lastHitReaction>=.45&&this.playerAnimation.trigger('hit',this.state.time,nativeActionFor(this.state.pokemonId,'hit')?.durationSeconds??.12))this.lastHitReaction=this.state.time;if(this.preferences.screenShake&&!motionReduced(this.preferences))this.cameras.main.shake(80,.002);}
  const discoveries=this.state.world.stream?.persistent.discoveries??[];if(discoveries.length!==this.forestDiscoveryCount){this.forestDiscoveryCount=discoveries.length;recordForestDiscoveries(discoveries);}
  this.pickupRenderer.onStep(this.state);for(const a of this.state.attacks){this.renderAttack(a);for(const id of a.hits)this.enemyAnimations.get(id)?.trigger('hit',this.state.time,.1);}
  for(const event of events)if(event.startsWith('evolution:'))this.showEvolution(event.split(':')[1]);this.showProgressionNotices();let earnedLevel=previousLevel;for(const e of events){if(e==='level-up'||e==='mastery-up')this.queueLevelChoice(e==='mastery-up'?'mastery':'level',++earnedLevel);else if(e.startsWith('ball-collected:')){this.sessionBalls++;this.showReward(Number(e.split(':')[1]) as 1|2|3);}else if(e.startsWith('defeated:')){const id=e.split(':')[1];this.sessionDefeats[id]=(this.sessionDefeats[id]??0)+1;}else if(e==='boss-defeated')this.finish('victory');}this.syncTmResearch();if(this.state.hp<=0)this.finish('defeat');
 }
 drawDebug(){const g=this.debugGraphics;if(!g)return;g.clear();g.lineStyle(2,0xff5d73,.65);for(const d of this.state.world.decorations)if(Math.abs(d.x-this.state.player.x)<900&&Math.abs(d.y-this.state.player.y)<650)g.strokeCircle(d.x,d.y,d.collisionRadius+14);g.lineStyle(2,0x62e8ff,.8);for(const e of this.state.enemies.slice(0,100)){g.lineBetween(e.x,e.y,e.x+e.vx*.28,e.y+e.vy*.28);if(e.blockedFor>.4){g.lineStyle(2,0xffd45c,.9);g.strokeCircle(e.x,e.y,18);g.lineStyle(2,0x62e8ff,.8);}}g.lineStyle(3,0x8fff89,.9);g.lineBetween(this.state.player.x,this.state.player.y,this.state.player.x+this.state.player.vx*.3,this.state.player.y+this.state.player.vy*.3);}
 update(_t:number,delta:number){
  this.renderHealthBars(delta);this.moveVfx.update(this.state.time+this.acc);this.renderCombatStatus();
  this.itemHud.update(this.state,motionReduced(this.preferences));this.renderMoveHud();
  if(this.overlay||this.ended)return;this.acc+=Math.min(delta/1000,.1);while(this.acc>=this.fixedStep&&!this.overlay&&!this.ended){this.acc-=this.fixedStep;this.step();}if(this.overlay||this.ended)return;const alpha=interpolationAlpha(this.acc,this.fixedStep),profile=renderProfile(this.state.pokemonId);this.renderPlayer=interpolatePosition(this.previousPlayer,this.state.player,alpha);const playerOffset=this.applyPokemonAnimation(this.player,this.playerAnimation,this.state.pokemonId,this.state.player.facing,Math.hypot(this.state.player.vx,this.state.player.vy),this.renderPlayer);this.playerShadow.setPosition(this.renderPlayer.x,this.renderPlayer.y+profile.shadowOffsetY).setDepth(this.renderPlayer.y-2);this.cameraTarget.setPosition(this.renderPlayer.x,this.renderPlayer.y);this.syncViews(alpha);this.syncWorldChunks();this.drawDebug();this.renderHealthBars(0);
  this.updateGrass();
  this.renderMoveHud();
  if(this.debugText){const ranged=this.state.enemies.filter(e=>e.behavior==='ranged').length;this.debugText.setText(`DEBUG\nFPS ${Math.round(this.game.loop.actualFps)}  SIM 30 Hz  α ${alpha.toFixed(2)}\nAnim ${this.playerAnimation.state}  Key ${this.player.anims.currentAnim?.key??'idle'}  Frame ${String(this.player.frame.name)}\nFacing ${this.state.player.facing}  Ground offset ${playerOffset.toFixed(1)}\nSim ${this.state.player.x.toFixed(1)},${this.state.player.y.toFixed(1)}  Prev ${this.previousPlayer.x.toFixed(1)},${this.previousPlayer.y.toFixed(1)}\nRender ${this.renderPlayer.x.toFixed(1)},${this.renderPlayer.y.toFixed(1)}  Shadow ${this.playerShadow.x.toFixed(1)},${this.playerShadow.y.toFixed(1)}\nCamera ${this.cameraTarget.x.toFixed(1)},${this.cameraTarget.y.toFixed(1)}  Chunk ${this.activeChunk.cx},${this.activeChunk.cy}\nPhase ${this.state.encounterPhase}  Ranged ${ranged}/${this.state.maxRangedEnemies}  Shots ${this.state.projectiles.length}/${this.state.maxEnemyProjectiles}\nEnemies ${this.state.enemies.length}  Checks ${this.state.collisionChecks}  Nav ${this.state.navigationRebuilds}\nWorld ${this.state.world.seed}  RNG ${this.state.seed}  Hash ${stateHash(this.state)}`);}
 }
}
// Canvas text keeps its initial font, so load the primary face before creating scenes.
document.fonts.load(`16px ${PRIMARY_FONT_FAMILY}`)
 .catch(error=>console.warn('Could not load the primary font; using monospace.',error))
 .then(()=>{
  const game=new Phaser.Game({type:Phaser.AUTO,width:W,height:H,parent:'app',scene:[MenuScene,PokemonScene,StageScene,DexScene,ResearchScene,SettingsScene,GameScene,UpgradeScene,RunResultsScene],input:{activePointers:3},render:{pixelArt:true,antialias:false},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}});
  (window as unknown as {__POKEMON_SURVIVORS__:Phaser.Game}).__POKEMON_SURVIVORS__=game;
 });
