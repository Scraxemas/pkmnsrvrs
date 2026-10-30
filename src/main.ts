import Phaser from 'phaser';
import { assetFor, ENEMIES, ITEMS, MOVES, POKEMON, SPRITE_FRAMES } from './content';
import { FACINGS, Facing, facingRow } from './direction';
import { ENVIRONMENT_ASSETS, ENVIRONMENT_ATLASES, environmentKey, environmentUrl } from './environmentAssets';
import {cliffFrame,decorationVisual,visibleChunkRange} from './worldPresentation';
import {GrassBrushField} from './grassBrush';
import {grassBodyCrop,grassFootCoverage,measureVisibleRows,VisibleRows} from './grassOcclusion';
import {gameplayHudLayout, GameplayHudLayout, hpBarColor,experienceProgress} from './hudLayout';
import {seedForRun} from './runSeed';
import {RENDER_SETTINGS} from './renderSettings';
import {renderProfile} from './renderProfiles';
import { applyUpgrade, AttackEvent, isUpgradeAvailable, makeState, masteryOptions, rewardRoll, SimState, spawnSpecies, stateHash, tick, Upgrade, upgradeOptions, canSpendMoveCredit } from './simulation';
import {UpgradeScene} from './upgradeScene';
import {RunResultsScene} from './ui/runResultsScene';
import { discover, loadSave, recordEvolution, recordRun, recordSessionEvents } from './save';
import {adjacencyMask,TERRAIN,terrainAt} from './terrain';
import {PokemonAnimationController} from './animationState';
import {encounterPhaseAt,weightedSpecies} from './encounters';
import {frameGroundOffset} from './groundOffsets';
import {interpolatePosition,interpolationAlpha,Position} from './interpolation';
import {chunkKey,FOREST_CHUNK_CELLS} from './worldgen';
import {MenuScene,PokemonScene,StageScene,DexScene,ResearchScene,SettingsScene,stopFrontendScenes} from './menuScenes';
import {motionReduced,PlayerSettings} from './preferences';
import {preloadItemArt} from './itemAssets';
import {hasMoveArt,moveTexture,preloadMoveArt} from './moveAssets';
import {pixelArt} from './ui/pixelArt';
import {PickupRenderer} from './pickupRenderer';
import {ItemHud} from './ui/itemHud';
import {MoveHud} from './ui/moveHud';
import {progressionNoticeText} from './upgrades';
import './style.css';

const W=1280,H=720,FONT='Trebuchet MS, monospace';
interface GrassView {back:Phaser.GameObjects.Image;front:Phaser.GameObjects.Image;x:number;y:number;}
interface ChoiceRequest {id:number;title:string;kind:'level'|'mastery'|'fixed'|'credit';options?:Upgrade[];onDone?:()=>void;}
class GameScene extends Phaser.Scene {
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
 pokemonGrassMasks=new Map<Phaser.GameObjects.Sprite,{graphics:Phaser.GameObjects.Graphics;mask:Phaser.Display.Masks.GeometryMask}>();
 pendingChoices:ChoiceRequest[]=[];activeChoice?:{request:ChoiceRequest;options:Upgrade[]};choiceSerial=0;
 readonly fixedStep=1/30;readonly miniProgress=[.10,.233,.367,.50,.633,.767,.90];

 constructor(){super('game')}
 init(d:{pokemon:string;fast?:boolean;seed?:number}){
  this.preferences=loadSave().settings;this.fast=!!d.fast;this.debug=new URLSearchParams(location.search).has('debug');this.state=makeState(POKEMON[d.pokemon]??POKEMON.bulbasaur,seedForRun(location.search,d.seed));this.duration=this.fast?90:1800;this.ended=false;this.overlay=undefined;this.acc=0;this.nextSpawn=0;this.miniIndex=0;this.sessionDefeats={};this.sessionBalls=0;this.expDisplay=0;this.expLevel=1;this.expFlash=0;
  this.enemyViews.clear();this.enemyShadows.clear();this.enemyAnimations.clear();this.pickupViews.clear();this.projectileViews.clear();this.previousEnemies.clear();this.previousProjectiles.clear();this.chunkViews.clear();this.chunkRangeKey='';this.activeChunk={cx:Number.NaN,cy:Number.NaN};this.previousPlayer={x:this.state.player.x,y:this.state.player.y};
  this.grassViews.clear();this.grassBrush.clear();this.grassParticles.clear();this.grassBrushCount=0;
  this.previousPickups.clear();
  this.pendingChoices=[];this.activeChoice=undefined;this.choiceSerial=0;
 }
 preload(){preloadItemArt(this);preloadMoveArt(this);const ids=new Set([...Object.keys(POKEMON),...Object.keys(ENEMIES)]);for(const id of ids){const f=SPRITE_FRAMES[id];if(f)this.load.spritesheet(`${id}-sprite`,assetFor(id,'sprite'),{frameWidth:f.width,frameHeight:f.height});this.load.image(`${id}-portrait`,assetFor(id,'portrait'));}for(const name of new Set(Object.values(ENVIRONMENT_ASSETS))){if(ENVIRONMENT_ATLASES.has(name))this.load.spritesheet(environmentKey(name),environmentUrl(name),{frameWidth:16,frameHeight:16});else if(name.startsWith('original/'))this.load.svg(environmentKey(name),environmentUrl(name));else this.load.image(environmentKey(name),environmentUrl(name));}}
 create(){
  stopFrontendScenes(this);
  this.events.once('shutdown',()=>{this.scene.stop('upgrade');this.scene.stop('results');this.pickupRenderer.destroy();this.itemHud.destroy();this.moveHud.destroy();});
  this.cameras.main.centerOn(this.state.player.x,this.state.player.y);this.drawForest();
  for(const id of Object.keys(SPRITE_FRAMES)){const f=SPRITE_FRAMES[id];if(!this.textures.exists(`${id}-sprite`))continue;for(const facing of FACINGS){const row=facingRow(facing),key=`${id}-walk-${facing}`;if(!this.anims.exists(key))this.anims.create({key,frames:this.anims.generateFrameNumbers(`${id}-sprite`,{start:row*f.frames,end:row*f.frames+f.frames-1}),frameRate:Math.max(6,Math.min(10,f.frames*1.5)),repeat:-1});}}
  this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,ESC') as Record<string,Phaser.Input.Keyboard.Key>;
  const profile=renderProfile(this.state.pokemonId);this.playerAnimation=new PokemonAnimationController(this.state.pokemonId);
  this.playerShadow=this.add.ellipse(this.state.player.x,this.state.player.y+profile.shadowOffsetY,profile.shadowWidth,profile.shadowHeight,0x0a1710,.42).setDepth(this.state.player.y-2).setVisible(RENDER_SETTINGS.entityShadows);
  this.player=this.add.sprite(this.state.player.x,this.state.player.y,`${this.state.pokemonId}-sprite`,0).setOrigin(.5,1).setScale(profile.scale).setDepth(this.state.player.y+20);
  this.cameraTarget=this.add.zone(this.state.player.x,this.state.player.y,1,1);this.cameras.main.setBounds(0,0,this.state.world.width,this.state.world.height);this.cameras.main.roundPixels=true;this.cameras.main.startFollow(this.cameraTarget,true,1,1);
  this.hpLayout=gameplayHudLayout(W,H);this.expGraphics=this.add.graphics().setDepth(22000).setScrollFactor(0);this.expText=this.add.text(W/2,this.hpLayout.experience.y+this.hpLayout.experience.height/2,'',{fontFamily:FONT,fontSize:'17px',fontStyle:'bold',color:'#fff',stroke:'#10202a',strokeThickness:3}).setOrigin(.5).setDepth(22001).setScrollFactor(0);this.playerHpGraphics=this.add.graphics().setDepth(18000);this.bossGraphics=this.add.graphics().setDepth(21990).setScrollFactor(0);this.bossText=this.add.text(W/2,this.hpLayout.boss.y+this.hpLayout.boss.height/2,'',{fontFamily:FONT,fontSize:'13px',fontStyle:'bold',color:'#fff',stroke:'#2a1010',strokeThickness:2}).setOrigin(.5).setDepth(21991).setScrollFactor(0);this.portrait=this.add.image(1215,this.hpLayout.portraitY,`${this.state.pokemonId}-portrait`).setScale(1.35).setDepth(20000).setScrollFactor(0);this.hud=this.add.text(18,this.hpLayout.infoY,'',{fontFamily:FONT,fontSize:'14px',color:'#fff',backgroundColor:'#102019dd',padding:{x:10,y:8},lineSpacing:3}).setDepth(20000).setScrollFactor(0);
  if(this.debug){this.debugGraphics=this.add.graphics().setDepth(19990);this.debugText=this.add.text(W-440,H-215,'',{fontFamily:'monospace',fontSize:'13px',color:'#9fffb3',backgroundColor:'#07120ddd',padding:{x:8,y:6}}).setDepth(22010).setScrollFactor(0);}
  this.pickupRenderer=new PickupRenderer(this);this.pickupViews=this.pickupRenderer.views;this.itemHud=new ItemHud(this);this.moveHud=new MoveHud(this);this.itemHud.update(this.state,motionReduced(this.preferences));this.renderMoveHud();
  spawnSpecies(this.state,'caterpie',6);spawnSpecies(this.state,'weedle',4);this.renderHealthBars();
 }
 applyPokemonAnimation(sprite:Phaser.GameObjects.Sprite,controller:PokemonAnimationController,species:string,facing:Facing,speed:number,ground:Position,multiplier=1){
  const f=SPRITE_FRAMES[species],profile=renderProfile(species);if(!f)return 0;controller.setSpecies(species);const decision=controller.update(this.state.time,facing,speed),row=facingRow(facing),walkKey=`${species}-walk-${facing}`;
  if(decision.moving&&decision.state!=='stun'&&decision.state!=='evolution'&&decision.state!=='defeat'){
   if(sprite.anims.currentAnim?.key!==walkKey||!sprite.anims.isPlaying){const progress=sprite.anims.isPlaying?sprite.anims.getProgress():0;sprite.play(walkKey,true);if(progress>0)sprite.anims.setProgress(progress);}
  }else if(sprite.anims.isPlaying||Number(sprite.frame.name)!==row*f.frames){sprite.anims.stop();sprite.setFrame(row*f.frames);}
  sprite.setOrigin(.5,1).setScale(profile.scale*multiplier);const frame=Number(sprite.frame.name)||0,offset=frameGroundOffset(species,frame)*profile.scale*multiplier+profile.elevation;
  sprite.setPosition(ground.x,ground.y+offset).setDepth(ground.y+20);this.applyGrassOcclusion(sprite,species,ground);return offset;
 }
 applyGrassOcclusion(sprite:Phaser.GameObjects.Sprite,species:string,ground:Position){
  const coverage=renderProfile(species).elevation<-4?0:grassFootCoverage(ground.x,ground.y,this.state.world.terrain.tileSize,(cx,cy)=>this.grassViews.get(chunkKey(cx,cy)));
  if(coverage===0){if(sprite.mask)sprite.clearMask();sprite.setData('grassHiddenFraction',0);return;}
  const metadata=SPRITE_FRAMES[species];
  const visible=this.visibleRows(sprite,species),crop=grassBodyCrop(visible,coverage);
  let clipping=this.pokemonGrassMasks.get(sprite);
  if(!clipping){
   const graphics=this.make.graphics({x:0,y:0},false),mask=graphics.createGeometryMask();clipping={graphics,mask};this.pokemonGrassMasks.set(sprite,clipping);
   sprite.once('destroy',()=>{mask.destroy();graphics.destroy();this.pokemonGrassMasks.delete(sprite);});
  }
  const x=Math.floor(sprite.x)-sprite.displayOriginX*sprite.scaleX,y=Math.floor(sprite.y)-sprite.displayOriginY*sprite.scaleY,bottom=y+crop.bottom*sprite.scaleY;
  // Clip the already-rendered pixels, keeping the full sprite quad and its UV
  // sampling unchanged. Resizing a cropped quad resamples fractional scales.
  clipping.graphics.clear().fillStyle(0xffffff,1).fillRect(x-8,y-8,metadata.width*sprite.scaleX+16,bottom-y+8);
  sprite.setMask(clipping.mask).setData('grassHiddenFraction',crop.hiddenFraction).setData('grassMaskBottom',bottom);
 }
 visibleRows(sprite:Phaser.GameObjects.Sprite,species:string){
  let rows=this.pokemonVisibleRows.get(species);const f=SPRITE_FRAMES[species];
  if(!rows){const source=sprite.texture.getSourceImage() as HTMLImageElement,canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;const context=canvas.getContext('2d',{willReadFrequently:true})!;context.drawImage(source,0,0);rows=measureVisibleRows(context.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height,f.width,f.height);this.pokemonVisibleRows.set(species,rows);}
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
   for(const image of [view.back,view.front])image.setRotation(bend?.rotation??0).setScale(2*(bend?.scaleX??1),2*(bend?.scaleY??1));
  }
 }
 renderWorldChunk(cx:number,cy:number){
  const map=this.state.world,key=chunkKey(cx,cy);if(!map.chunks[key])return;const tile=map.terrain.tileSize,objects:Phaser.GameObjects.GameObject[]=[],baseX=cx*FOREST_CHUNK_CELLS,baseY=cy*FOREST_CHUNK_CELLS,details=[ENVIRONMENT_ASSETS.grass,ENVIRONMENT_ASSETS.grassRocks,ENVIRONMENT_ASSETS.forestFloor];
  for(let ly=0;ly<FOREST_CHUNK_CELLS;ly++)for(let lx=0;lx<FOREST_CHUNK_CELLS;lx++){
   const x=baseX+lx,y=baseY+ly;if(x<0||y<0||x>=map.terrain.cols||y>=map.terrain.rows)continue;const wx=x*tile+tile/2,wy=y*tile+tile/2,value=terrainAt(map.terrain,x,y),hash=Math.abs((x*17+y*31+map.seed*7)|0);
   objects.push(this.add.image(wx,wy,environmentKey(ENVIRONMENT_ASSETS.grassFill)).setDisplaySize(tile,tile).setDepth(0));
   if(value===TERRAIN.path||value===TERRAIN.water)objects.push(this.add.image(wx,wy,environmentKey(this.terrainTexture(x,y)),adjacencyMask(map.terrain,x,y,value)).setDisplaySize(tile,tile).setDepth(1));
   else if(value===TERRAIN.cliff){const mask=adjacencyMask(map.terrain,x,y,value);objects.push(this.add.image(wx,wy,environmentKey(ENVIRONMENT_ASSETS.cliffAtlas),cliffFrame(!!(mask&1),!!(mask&4),!!(mask&16),!!(mask&64))).setDisplaySize(tile,tile).setDepth(wy+tile/2));}
   // Transparent whole tufts can bend without rotating opaque ground squares.
   else if(value===TERRAIN.tallGrass)objects.push(...this.addGrass(wx+((y%2)*2-1)*2,wy+12,x,y));
   else if(hash%7===0)objects.push(this.add.image(wx,wy,environmentKey(details[hash%details.length])).setScale(2).setDepth(.5));
  }
  for(const d of map.decorationBuckets[key]??[]){
   const visual=decorationVisual(d.id,d.x,d.y,map.seed,d.radius),image=this.add.image(Math.round(d.x),Math.round(d.y),environmentKey(visual.name));
   image.setOrigin(.5,(image.height-visual.trunkPadding)/image.height).setDepth(d.y).setScale(visual.scale).setData('mapProp',d.id);if(d.id==='tree')image.setData('forestTree',true);objects.push(image);
  }
  for(const landmark of map.landmarks.filter(l=>Math.floor(l.x/map.chunkSize)===cx&&Math.floor(l.y/map.chunkSize)===cy)){
   if(landmark.id==='ancient-tree')objects.push(this.addForestTree(landmark.x,landmark.y,ENVIRONMENT_ASSETS.ancientTree,4));
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
 showChoices(title:string,options:Upgrade[],onDone?:()=>void){this.pendingChoices.push({id:++this.choiceSerial,title,kind:'fixed',options,onDone});this.showNextChoice();}
 queueLevelChoice(kind:'level'|'mastery',level:number){this.pendingChoices.push({id:++this.choiceSerial,title:kind==='mastery'?`LEVEL ${level} · MOVE MASTERY`:`LEVEL ${level} · CHOOSE YOUR POWER`,kind});this.showNextChoice();}
 showNextChoice(){
  if(this.activeChoice||this.ended)return;
  if(!this.pendingChoices.length&&this.state.moveUpgradeCredits>0&&canSpendMoveCredit(this.state))this.pendingChoices.push({id:++this.choiceSerial,title:'RECOVERED MOVE INVESTMENT',kind:'credit'});
  if(!this.pendingChoices.length){this.resumeAfterChoices();return;}
  const request=this.pendingChoices.shift()!;
  let options=(request.kind==='fixed'?request.options!:request.kind==='mastery'?masteryOptions(this.state):upgradeOptions(this.state,3,request.kind==='credit'?'move':'all')).filter(u=>isUpgradeAvailable(this.state,u));
  if(!options.length)options=upgradeOptions(this.state);
  this.activeChoice={request,options};this.acc=0;this.overlay??=this.add.container(0,0).setScrollFactor(0);
  this.renderMoveHud();this.renderHealthBars();this.setGameplayNoticesVisible(false);
  // Immediate manager pause freezes Clock, TweenManager, sprite animation and scene updates together.
  if(!this.scene.isPaused('game'))this.scene.manager.pause(this);
  this.scene.launch('upgrade',{title:request.title,options,state:this.state,onSelect:(u:Upgrade)=>this.completeChoice(request.id,u)});
 }
 completeChoice(id:number,u:Upgrade){
  const active=this.activeChoice;if(!active||active.request.id!==id||!active.options.includes(u)||!isUpgradeAvailable(this.state,u))return;
  applyUpgrade(this.state,u);if(active.request.kind==='credit')this.state.moveUpgradeCredits=Math.max(0,this.state.moveUpgradeCredits-1);
  this.pickupRenderer.onUpgrade(u,this.state);this.itemHud.update(this.state,motionReduced(this.preferences));this.renderMoveHud();this.activeChoice=undefined;this.acc=0;active.request.onDone?.();this.renderHealthBars();
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
 showEvolution(id:string){const p=POKEMON[id],profile=renderProfile(id);recordEvolution(id);this.player.setTexture(`${id}-sprite`,0);this.playerAnimation.setSpecies(id);this.playerAnimation.trigger('evolution',this.state.time,1.8);this.playerShadow.setSize(profile.shadowWidth,profile.shadowHeight);this.portrait.setTexture(`${id}-portrait`);const text=this.add.text(W/2,H/2,`Congratulations!\nYour Pokémon evolved into ${p.name}!`,{fontFamily:FONT,fontSize:'30px',color:'#ffe26b',backgroundColor:'#102019ee',padding:{x:30,y:24},align:'center'}).setOrigin(.5).setDepth(21000).setScrollFactor(0).setData('gameplayNotice',true).setVisible(!this.overlay);this.time.delayedCall(1800,()=>text.destroy());}
 showReward(tier:1|2|3){const options=rewardRoll(this.state,tier);this.showChoices(`${tier===3?'ULTRA':tier===2?'GREAT':'POKÉ'} BALL OPENED!`,options);}
 renderAttack(a:AttackEvent){const colors:Record<string,number>={Normal:0xe8e0d2,Grass:0x65d66f,Poison:0xb66ad4,Fire:0xff6b3d,Dragon:0x8466e8,Water:0x54bff2,Steel:0xb7d6e5};const color=colors[a.type]??0xffffff,g=this.add.graphics().setDepth(16000);g.lineStyle(a.kind==='sweep'?8:4,color,.9);g.fillStyle(color,.35);if(a.moveId==='metalClaw'||a.moveId==='dragonClaw'){for(const impact of a.impacts??[{x:a.tx,y:a.ty}]){g.lineStyle(a.moveId==='dragonClaw'?7:5,color,.95);for(let i=-1;i<=1;i++)g.lineBetween(impact.x-22+i*12,impact.y+18,impact.x-8+i*12,impact.y-22);g.lineStyle(2,0xf0faff,.9).lineBetween(impact.x-27,impact.y+22,impact.x+27,impact.y-20);if(a.moveId==='dragonClaw')g.lineStyle(4,0xb6a0ff,.9).lineBetween(impact.x-22,impact.y-18,impact.x+24,impact.y+18);}}else if(a.moveId==='razorLeaf'){g.lineStyle(2,color,.5).lineBetween(a.x,a.y,a.tx,a.ty);for(const impact of a.impacts??[{x:a.tx,y:a.ty}]){g.fillStyle(0x84df6b,.95).fillTriangle(impact.x-12,impact.y+12,impact.x+4,impact.y-17,impact.x+13,impact.y+2);g.lineStyle(2,0xe3ffb8,1).lineBetween(impact.x-8,impact.y+8,impact.x+6,impact.y-12);}}else if(a.moveId==='hydroPump'){g.lineStyle(15,color,.8).lineBetween(a.x,a.y,a.tx,a.ty);g.lineStyle(5,0xe1faff,.95).lineBetween(a.x,a.y,a.tx,a.ty);for(const impact of a.impacts??[{x:a.tx,y:a.ty}])g.lineStyle(3,0xdbf7ff,.9).strokeCircle(impact.x,impact.y,21).lineBetween(impact.x-26,impact.y-11,impact.x+25,impact.y+12);}else if(a.kind==='spin'){g.strokeCircle(a.x,a.y,Math.min(a.radius,120));}else if(a.kind==='cloud'){for(let i=0;i<8;i++)g.fillCircle(a.x+Math.cos(i)*55,a.y+Math.sin(i)*45,18);}else if(a.kind==='slash'){g.beginPath();g.arc(a.x,a.y,55,-.7,.7);g.strokePath();}else if(a.kind==='spread'){for(let i=-1;i<=1;i++)g.fillCircle(a.tx+i*18,a.ty+Math.abs(i)*12,11);}else {g.lineBetween(a.x,a.y,a.tx,a.ty);g.fillCircle(a.tx,a.ty,a.kind==='fixed'?26:12);}if(a.damage>0&&this.preferences.damageNumbers){const n=this.add.text(a.tx,a.ty-22,`${a.critical?'CRIT ':''}${a.damage}`,{fontFamily:FONT,fontSize:a.critical?'19px':'16px',fontStyle:'bold',color:a.critical?'#ffe08c':'#fff',stroke:'#17231c',strokeThickness:3}).setOrigin(.5).setDepth(17000);this.tweens.add({targets:n,y:n.y-(motionReduced(this.preferences)?0:24),alpha:0,duration:620,onComplete:()=>n.destroy()});}for(const id of a.hits){const v=this.enemyViews.get(id);if(v)this.tweens.add({targets:v,alpha:.45,duration:55,yoyo:true});}this.tweens.add({targets:g,alpha:0,duration:a.kind==='cloud'?700:260,onComplete:()=>g.destroy()});}
 syncViews(alpha:number){
  const alive=new Set<number>();for(const e of this.state.enemies){alive.add(e.id);let v=this.enemyViews.get(e.id),shadow=this.enemyShadows.get(e.id),controller=this.enemyAnimations.get(e.id);const multiplier=e.boss?1.38:e.elite?1.18:1,profile=renderProfile(e.species),position=interpolatePosition(this.previousEnemies.get(e.id),e,alpha);
   if(!v){shadow=this.add.ellipse(position.x,position.y+profile.shadowOffsetY,profile.shadowWidth*multiplier,profile.shadowHeight*multiplier,0x08130d,.38).setVisible(RENDER_SETTINGS.entityShadows);v=this.add.sprite(position.x,position.y,`${e.species}-sprite`,0).setOrigin(.5,1);controller=new PokemonAnimationController(e.species);this.enemyViews.set(e.id,v);this.enemyShadows.set(e.id,shadow);this.enemyAnimations.set(e.id,controller);discover(e.species);}
   shadow!.setPosition(position.x,position.y+profile.shadowOffsetY).setDepth(position.y-2);this.applyPokemonAnimation(v,controller!,e.species,e.facing,Math.hypot(e.vx,e.vy),position,multiplier);v.setTint((e.staggerUntil??0)>this.state.time?0xffd577:e.attackWindup>0?0xffe58a:e.statuses.some(s=>s.kind==='poison')?0xc86fea:e.statuses.some(s=>s.kind==='burn')?0xff7651:0xffffff);
  }
  for(const [id,v] of this.enemyViews)if(!alive.has(id)){v.destroy();this.enemyShadows.get(id)?.destroy();this.enemyViews.delete(id);this.enemyShadows.delete(id);this.enemyAnimations.delete(id);}
  this.pickupRenderer.draw(this.state,this.previousPickups,alpha,motionReduced(this.preferences));
  const shots=new Set<number>();for(const p of this.state.projectiles){shots.add(p.id);let v=this.projectileViews.get(p.id);const position=interpolatePosition(this.previousProjectiles.get(p.id),p,alpha);if(!v){v=p.source==='pidgey'?this.add.ellipse(position.x,position.y,18,9,0xdff8ff,.9).setStrokeStyle(2,0x79cbe8):p.source==='butterfree'?this.add.circle(position.x,position.y,9,0xc982d8,.8).setStrokeStyle(2,0xf2c6ff):this.add.triangle(position.x,position.y,0,10,18,5,0,0,0x9b62c7,.95).setStrokeStyle(2,0xf1d7ff);v.setDepth(15000);this.projectileViews.set(p.id,v);}v.setPosition(position.x,position.y);}for(const [id,v] of this.projectileViews)if(!shots.has(id)){v.destroy();this.projectileViews.delete(id);}
 }
 schedule(){
  const phase=encounterPhaseAt(this.state.time,this.duration);this.state.encounterPhase=phase.id;this.state.maxRangedEnemies=phase.maxRanged;this.state.maxEnemyProjectiles=phase.projectileCap;
  if(this.state.time>=this.nextSpawn&&this.state.enemies.length<phase.maxAlive){const roll=((this.state.seed>>>8)%100000)/100000;let species=weightedSpecies(phase,roll);const ranged=this.state.enemies.filter(e=>e.behavior==='ranged').length;if((species==='pidgey'||species==='butterfree')&&ranged>=phase.maxRanged)species=this.state.time%2<1?'caterpie':'weedle';spawnSpecies(this.state,species,this.fast?2:Math.min(1+Math.floor(this.state.time/360),5));this.nextSpawn=this.state.time+phase.spawnInterval*(this.fast?.55:1);}
  const progress=this.state.time/this.duration;if(this.miniIndex<this.miniProgress.length&&progress>=this.miniProgress[this.miniIndex]){spawnSpecies(this.state,this.miniIndex%2?'pidgeotto':'butterfree',1,true);this.miniIndex++;}
  if(!this.state.bossSpawned&&this.state.time>=this.duration){spawnSpecies(this.state,'beedrill',1,false,true);this.state.bossSpawned=true;}
 }
 finish(result:'victory'|'defeat'){if(this.ended)return;this.ended=true;this.cancelChoices(false);if(!this.scene.isPaused('game'))this.scene.manager.pause(this);this.playerAnimation.trigger('defeat',this.state.time);recordSessionEvents(this.sessionDefeats,this.sessionBalls);recordRun({result,pokemon:this.state.pokemonId,stage:'viridian',level:this.state.level,time:this.state.time,defeated:this.state.defeated});this.overlay=this.add.container(0,0).setScrollFactor(0);this.scene.launch('results',{result,level:this.state.level,defeated:this.state.defeated,time:this.state.time,seed:this.state.world.seed,onReturn:()=>this.scene.start('menu')});}
 step(){
  if(this.overlay||this.ended)return;
  this.previousPlayer={x:this.state.player.x,y:this.state.player.y};this.previousEnemies=new Map(this.state.enemies.map(e=>[e.id,{x:e.x,y:e.y}]));this.previousProjectiles=new Map(this.state.projectiles.map(p=>[p.id,{x:p.x,y:p.y}]));this.previousPickups.clear();for(const p of this.state.pickups)this.previousPickups.set(p.id,{x:p.x,y:p.y});const previousHp=this.state.hp;
  const previousLevel=this.state.level;this.schedule();const events=tick(this.state,this.fixedStep,this.moveInput());if(this.state.attacks.length)this.playerAnimation.trigger('attack',this.state.time,.18);if(this.state.hp<previousHp){this.playerAnimation.trigger('hit',this.state.time,.12);if(this.preferences.screenShake&&!motionReduced(this.preferences))this.cameras.main.shake(80,.002);}
  this.pickupRenderer.onStep(this.state);for(const a of this.state.attacks){this.renderAttack(a);for(const id of a.hits)this.enemyAnimations.get(id)?.trigger('hit',this.state.time,.1);}
  for(const event of events)if(event.startsWith('evolution:'))this.showEvolution(event.split(':')[1]);this.showProgressionNotices();let earnedLevel=previousLevel;for(const e of events){if(e==='level-up'||e==='mastery-up')this.queueLevelChoice(e==='mastery-up'?'mastery':'level',++earnedLevel);else if(e.startsWith('ball-collected:')){this.sessionBalls++;this.showReward(Number(e.split(':')[1]) as 1|2|3);}else if(e.startsWith('defeated:')){const id=e.split(':')[1];this.sessionDefeats[id]=(this.sessionDefeats[id]??0)+1;}else if(e==='boss-defeated')this.finish('victory');}if(this.state.hp<=0)this.finish('defeat');
 }
 drawDebug(){const g=this.debugGraphics;if(!g)return;g.clear();g.lineStyle(2,0xff5d73,.65);for(const d of this.state.world.decorations)if(Math.abs(d.x-this.state.player.x)<900&&Math.abs(d.y-this.state.player.y)<650)g.strokeCircle(d.x,d.y,d.collisionRadius+14);g.lineStyle(2,0x62e8ff,.8);for(const e of this.state.enemies.slice(0,100)){g.lineBetween(e.x,e.y,e.x+e.vx*.28,e.y+e.vy*.28);if(e.blockedFor>.4){g.lineStyle(2,0xffd45c,.9);g.strokeCircle(e.x,e.y,18);g.lineStyle(2,0x62e8ff,.8);}}g.lineStyle(3,0x8fff89,.9);g.lineBetween(this.state.player.x,this.state.player.y,this.state.player.x+this.state.player.vx*.3,this.state.player.y+this.state.player.vy*.3);}
 update(_t:number,delta:number){
  this.renderHealthBars(delta);
  this.itemHud.update(this.state,motionReduced(this.preferences));this.renderMoveHud();
  if(this.overlay||this.ended)return;this.acc+=Math.min(delta/1000,.1);while(this.acc>=this.fixedStep&&!this.overlay&&!this.ended){this.acc-=this.fixedStep;this.step();}if(this.overlay||this.ended)return;const alpha=interpolationAlpha(this.acc,this.fixedStep),profile=renderProfile(this.state.pokemonId);this.renderPlayer=interpolatePosition(this.previousPlayer,this.state.player,alpha);const playerOffset=this.applyPokemonAnimation(this.player,this.playerAnimation,this.state.pokemonId,this.state.player.facing,Math.hypot(this.state.player.vx,this.state.player.vy),this.renderPlayer);this.playerShadow.setPosition(this.renderPlayer.x,this.renderPlayer.y+profile.shadowOffsetY).setDepth(this.renderPlayer.y-2);this.cameraTarget.setPosition(this.renderPlayer.x,this.renderPlayer.y);this.syncViews(alpha);this.syncWorldChunks();this.drawDebug();this.renderHealthBars(0);
  this.updateGrass();
  this.renderMoveHud();
  if(this.debugText){const ranged=this.state.enemies.filter(e=>e.behavior==='ranged').length;this.debugText.setText(`DEBUG\nFPS ${Math.round(this.game.loop.actualFps)}  SIM 30 Hz  α ${alpha.toFixed(2)}\nAnim ${this.playerAnimation.state}  Key ${this.player.anims.currentAnim?.key??'idle'}  Frame ${String(this.player.frame.name)}\nFacing ${this.state.player.facing}  Ground offset ${playerOffset.toFixed(1)}\nSim ${this.state.player.x.toFixed(1)},${this.state.player.y.toFixed(1)}  Prev ${this.previousPlayer.x.toFixed(1)},${this.previousPlayer.y.toFixed(1)}\nRender ${this.renderPlayer.x.toFixed(1)},${this.renderPlayer.y.toFixed(1)}  Shadow ${this.playerShadow.x.toFixed(1)},${this.playerShadow.y.toFixed(1)}\nCamera ${this.cameraTarget.x.toFixed(1)},${this.cameraTarget.y.toFixed(1)}  Chunk ${this.activeChunk.cx},${this.activeChunk.cy}\nPhase ${this.state.encounterPhase}  Ranged ${ranged}/${this.state.maxRangedEnemies}  Shots ${this.state.projectiles.length}/${this.state.maxEnemyProjectiles}\nEnemies ${this.state.enemies.length}  Checks ${this.state.collisionChecks}  Nav ${this.state.navigationRebuilds}\nWorld ${this.state.world.seed}  RNG ${this.state.seed}  Hash ${stateHash(this.state)}`);}
 }
}
const game=new Phaser.Game({type:Phaser.AUTO,width:W,height:H,parent:'app',scene:[MenuScene,PokemonScene,StageScene,DexScene,ResearchScene,SettingsScene,GameScene,UpgradeScene,RunResultsScene],render:{pixelArt:true,antialias:false},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}});
(window as unknown as {__POKEMON_SURVIVORS__:Phaser.Game}).__POKEMON_SURVIVORS__=game;
