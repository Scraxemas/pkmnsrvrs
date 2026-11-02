import Phaser from 'phaser';
import {PRIMARY_FONT_FAMILY} from './fonts';
import type {SimState} from '../simulation';
import {ITEMS} from '../items';
import {safeItemTexture} from '../itemAssets';
import {gameplayHudLayout} from '../hudLayout';

const SLOT=40,GAP=8;
interface ItemView {
 container:Phaser.GameObjects.Container;
 frame:Phaser.GameObjects.Graphics;
 image:Phaser.GameObjects.Image;
 rank:Phaser.GameObjects.Text;
 key:string;
 flashUntil:number;
 spent:boolean;
 flashing:boolean;
}
/** Four small held-item slots live directly under the five combat moves. */
export class ItemHud {
 private slots:ItemView[]=[];
 private tooltip:Phaser.GameObjects.Text;
 private press?:Phaser.Time.TimerEvent;
 constructor(private scene:Phaser.Scene){
  const layout=gameplayHudLayout(scene.scale.width,scene.scale.height);
  this.tooltip=scene.add.text(layout.items.x,174,'',{
   fontFamily:PRIMARY_FONT_FAMILY,fontSize:'12px',color:'#fff0bd',
   backgroundColor:'#102019ee',padding:{x:10,y:8},wordWrap:{width:320},lineSpacing:3
  }).setName('item-tooltip').setDepth(23000).setScrollFactor(0).setVisible(false);
  for(let index=0;index<4;index++){
   const frame=scene.add.graphics();
   const image=scene.add.image(SLOT/2,SLOT/2,safeItemTexture(scene,'magnet',true)).setVisible(false);
   const rank=scene.add.text(SLOT-3,SLOT-3,'',{
    fontFamily:PRIMARY_FONT_FAMILY,fontSize:'10px',fontStyle:'bold',
    color:'#d3e5de',stroke:'#102019',strokeThickness:3
   }).setOrigin(1);
   const container=scene.add.container(layout.items.x+index*(SLOT+GAP),layout.items.y,[frame,image,rank])
    .setDepth(20010).setScrollFactor(0).setName('held-item-slot-'+(index+1)).setSize(SLOT,SLOT);
   const hit=scene.add.zone(0,0,SLOT,SLOT).setOrigin(0).setInteractive();
   container.add(hit);
   hit.on('pointerover',(pointer:Phaser.Input.Pointer)=>{if(!pointer.wasTouch)this.showDetail(index);});
   hit.on('pointerout',()=>this.hideDetail());
   hit.on('pointerdown',()=>{
    this.cancelPress();
    this.press=scene.time.delayedCall(420,()=>this.showDetail(index));
   });
   hit.on('pointerup',()=>this.cancelPress());
   this.slots.push({container,frame,image,rank,key:'__unpainted__',flashUntil:0,spent:false,flashing:false});
  }
 }
 private cancelPress(){this.press?.remove(false);this.press=undefined;}
 showDetail(index:number){
  const slot=this.slots[index];
  if(!slot)return;
  const id=slot.container.getData('itemId') as string|undefined;
  const description=id?ITEMS[id].name+'\n'+ITEMS[id].description:'Empty held-item slot · Acquire items from level-ups or Poké Balls';
  this.tooltip.setPosition(Math.min(slot.container.x,this.scene.scale.width-338),170).setText(description).setVisible(true);
 }
 hideDetail(){this.cancelPress();this.tooltip.setVisible(false);}
 update(state:SimState,reduced:boolean){
  this.slots.forEach((slot,index)=>{
   const held=state.items[index],key=held?held.id+':'+held.rank:'';
   const spent=!!held&&held.id==='focusSash'&&state.itemRuntime.sashUsed;
   const changed=slot.key!==key||slot.spent!==spent;
   if(changed){
    slot.key=key;slot.spent=spent;slot.flashUntil=state.time+.65;
    slot.container.setData('itemId',held?.id);
    slot.image.setVisible(!!held);
    if(held)slot.image.setTexture(safeItemTexture(this.scene,held.id,true)).setDisplaySize(30,30).setAlpha(spent?.4:1);
    slot.rank.setText(held?(spent?'×':'R'+held.rank):'');
   }
   const flashing=!!held&&!reduced&&state.time<slot.flashUntil;
   if(changed||flashing!==slot.flashing){
    slot.flashing=flashing;
    slot.frame.clear().fillStyle(0x102019,.86).fillRoundedRect(0,0,SLOT,SLOT,5)
     .lineStyle(1,flashing?0xffdf8b:0x688f7b,held?.9:.5).strokeRoundedRect(0,0,SLOT,SLOT,5);
   }
  });
 }
 destroy(){this.cancelPress();this.slots.forEach(slot=>slot.container.destroy(true));this.tooltip.destroy();}
}
