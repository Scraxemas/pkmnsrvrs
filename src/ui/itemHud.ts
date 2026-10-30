import Phaser from 'phaser';
import {PRIMARY_FONT_FAMILY} from './fonts';
import type {SimState} from '../simulation';
import {ITEMS} from '../items';
import {itemTexture} from '../itemAssets';

export class ItemHud {
  private slots:{container:Phaser.GameObjects.Container;frame:Phaser.GameObjects.Graphics;image:Phaser.GameObjects.Image;rank:Phaser.GameObjects.Text;key:string;flashUntil:number;}[]=[];
  private tooltip:Phaser.GameObjects.Text;
  constructor(scene:Phaser.Scene){
    this.tooltip=scene.add.text(18,595,'',{fontFamily:PRIMARY_FONT_FAMILY,fontSize:'13px',color:'#fff0bd',backgroundColor:'#102019ee',padding:{x:8,y:6},wordWrap:{width:600}}).setDepth(20020).setScrollFactor(0).setVisible(false);
    for(let index=0;index<4;index++){
      const frame=scene.add.graphics(),image=scene.add.image(24,24,itemTexture('magnet',true)).setVisible(false),rank=scene.add.text(24,43,'—',{fontFamily:PRIMARY_FONT_FAMILY,fontSize:'12px',fontStyle:'bold',color:'#d3e5de'}).setOrigin(.5);
      const container=scene.add.container(18+index*58,646,[frame,image,rank]).setDepth(20010).setScrollFactor(0).setName(`held-item-slot-${index+1}`).setSize(50,60);
      // Phaser adds displayOrigin during input tests; the frame is drawn from (0,0).
      container.setInteractive(new Phaser.Geom.Rectangle(container.displayOriginX,container.displayOriginY,50,60),Phaser.Geom.Rectangle.Contains);
      container.add(scene.add.text(4,2,String(index+1),{fontFamily:PRIMARY_FONT_FAMILY,fontSize:'10px',color:'#95af9e'}));
      container.on('pointerover',()=>{const id=container.getData('itemId') as string|undefined;if(id)this.tooltip.setText(`${ITEMS[id].name} · ${ITEMS[id].description}`).setVisible(true);});container.on('pointerout',()=>this.tooltip.setVisible(false));
      this.slots.push({container,frame,image,rank,key:'',flashUntil:0});
    }
  }
  update(state:SimState,reduced:boolean){
    this.slots.forEach((slot,index)=>{
      const held=state.items[index],key=held?`${held.id}:${held.rank}`:'',spent=held?.id==='focusSash'&&state.itemRuntime.sashUsed;
      if(slot.key!==key){slot.key=key;slot.flashUntil=state.time+.65;slot.container.setData('itemId',held?.id);slot.image.setVisible(!!held);if(held)slot.image.setTexture(itemTexture(held.id,true));}
      slot.image.setAlpha(spent?.4:1);slot.rank.setText(held?(spent?'USED':`R${held.rank}`):`${index+1} · —`);
      slot.frame.clear().fillStyle(0x102019,.9).fillRoundedRect(0,0,50,60,6).lineStyle(1,!reduced&&held&&state.time<slot.flashUntil?0xffdf8b:0x688f7b,held?.9:.45).strokeRoundedRect(0,0,50,60,6);
    });
  }
  destroy(){this.slots.forEach(slot=>slot.container.destroy(true));this.tooltip.destroy();}
}
