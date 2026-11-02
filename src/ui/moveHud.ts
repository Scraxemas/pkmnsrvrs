import Phaser from 'phaser';
import {PRIMARY_FONT_FAMILY} from './fonts';
import type {SimState} from '../simulation';
import {MOVES} from '../content';
import {moveCapacity,moveSlotStates,MAX_MOVE_SLOTS} from '../moveProgression';
import {TYPE_COLORS} from '../upgrades';
import {hasMoveArt,moveTexture} from '../moveAssets';
import {moveRankStats} from '../moveEffects';
import {gameplayHudLayout} from '../hudLayout';

const SLOT=46, GAP=7;
interface MoveView {
 container:Phaser.GameObjects.Container;
 frame:Phaser.GameObjects.Graphics;
 image:Phaser.GameObjects.Image;
 label:Phaser.GameObjects.Text;
 rank:Phaser.GameObjects.Text;
 hit:Phaser.GameObjects.Zone;
}

/** Compact five-slot loadout. No text cards are permanently laid over the forest. */
export class MoveHud {
 private slots:MoveView[]=[];
 private signature='';
 private tooltip:Phaser.GameObjects.Text;
 private heldTip?:number;
 private press?:Phaser.Time.TimerEvent;
 constructor(private scene:Phaser.Scene){
  const layout=gameplayHudLayout(scene.scale.width,scene.scale.height);
  this.tooltip=scene.add.text(layout.moves.x,170,'',{
   fontFamily:PRIMARY_FONT_FAMILY,fontSize:'12px',color:'#e4f3e8',
   backgroundColor:'#10191ff5',padding:{x:10,y:8},
   wordWrap:{width:310},lineSpacing:3
  }).setName('move-tooltip').setDepth(23000).setScrollFactor(0).setVisible(false);
  for(let index=0;index<MAX_MOVE_SLOTS;index++){
   const x=layout.moves.x+index*(SLOT+GAP),y=layout.moves.y;
   const frame=scene.add.graphics();
   const image=scene.add.image(SLOT/2,SLOT/2,'__WHITE').setName('move-art').setVisible(false);
   const label=scene.add.text(SLOT/2,SLOT/2,'+',{
    fontFamily:PRIMARY_FONT_FAMILY,fontSize:'23px',color:'#a0d2b6'
   }).setOrigin(.5);
   const rank=scene.add.text(SLOT-4,SLOT-4,'',{
    fontFamily:PRIMARY_FONT_FAMILY,fontSize:'10px',fontStyle:'bold',
    color:'#fff1d3',stroke:'#10191f',strokeThickness:3
   }).setOrigin(1);
   const container=scene.add.container(x,y,[frame,image,label,rank]).setName('move-slot-'+(index+1)).setDepth(20000).setScrollFactor(0);
   const hit=scene.add.zone(0,0,SLOT,SLOT).setOrigin(0).setInteractive();
   container.add(hit);
   hit.on('pointerover',(pointer:Phaser.Input.Pointer)=>{if(!pointer.wasTouch)this.showDetail(index);});
   hit.on('pointerout',()=>this.cancelPress());
   hit.on('pointerdown',()=>{
    this.cancelPress(false);
    this.press=scene.time.delayedCall(420,()=>this.showDetail(index));
   });
   hit.on('pointerup',()=>this.cancelPress(false));
   this.slots.push({container,frame,image,label,rank,hit});
  }
 }
 private cancelPress(hide=true){
  this.press?.remove(false);this.press=undefined;
  if(hide){this.heldTip=undefined;this.tooltip.setVisible(false);}
 }
 showDetail(index:number){
  const slot=this.slots[index],tip=slot?.container.getData('tooltip') as string|undefined;
  if(!tip)return;
  this.heldTip=index;
  const x=Math.min(slot.container.x,this.scene.scale.width-338);
  this.tooltip.setPosition(Math.max(8,x),170).setText(tip).setVisible(true);
 }
 hideDetail(){this.cancelPress();}
 update(state:SimState){
  const capacity=moveCapacity(state.pokemon,state.level);
  const key=state.pokemonId+':'+capacity+':'+state.moveSlots.map(slot=>slot.id+':'+slot.rank).join(',')+':'+state.fusionHistory.join(',');
  if(key===this.signature)return;
  this.signature=key;this.hideDetail();
  const states=moveSlotStates(state.pokemon,state.level);
  this.slots.forEach((view,index)=>{
   const slot=state.moveSlots[index],move=slot&&MOVES[slot.id];
   const locked=!slot&&index>=capacity;
   const isFusion=!!slot&&state.fusionHistory.includes(slot.id);
   const color=move?TYPE_COLORS[move.type]:locked?0x788f86:0x80caaa;
   view.frame.clear().fillStyle(0x102019,locked?.52:.86).fillRoundedRect(0,0,SLOT,SLOT,5)
    .lineStyle(isFusion?3:1,color,locked?.45:1).strokeRoundedRect(0,0,SLOT,SLOT,5);
   const art=!!slot&&hasMoveArt(this.scene,slot.id);
   view.container.setData('status',slot?'filled':locked?'locked':'empty')
    .setData('requirement',states[index].requirement).setData('moveId',slot?.id)
    .setData('artFallback',!!slot&&!art);
   view.image.setVisible(art);
   if(slot&&move){
    if(art)view.image.setTexture(moveTexture(slot.id)).setDisplaySize(32,32).setData('assetId',slot.id).texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    view.label.setText(art?'':move.name.slice(0,2).toUpperCase()).setFontSize(art?20:13).setVisible(!art);
    view.rank.setText('R'+slot.rank).setVisible(true);
    const stats=moveRankStats(move,slot.rank);
    view.container.setData('tooltip',move.name+' · Rank '+slot.rank+'\n'+move.type+' / '+move.damageClass+'\n'+move.description+'\nCooldown '+stats.cooldownSeconds.toFixed(2)+'s'+(isFusion?' · Fusion result':''));
   }else{
    view.image.setVisible(false);
    view.label.setText(locked?'':'+').setVisible(!locked).setFontSize(23);
    view.rank.setText('').setVisible(false);
    if(locked){
     view.frame.lineStyle(2,0xa3b3a7,.8).strokeRoundedRect(17,20,12,10,2).strokeRoundedRect(20,15,6,7,3);
     view.container.setData('tooltip','Slot '+(index+1)+' locked · '+states[index].requirement);
    }else view.container.setData('tooltip','Slot '+(index+1)+' available · Learn a move from level-up or Poké Ball rewards');
   }
  });
 }
 destroy(){this.cancelPress();this.slots.forEach(slot=>slot.container.destroy(true));this.tooltip.destroy();}
}
