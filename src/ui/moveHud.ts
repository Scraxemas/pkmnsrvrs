import type Phaser from 'phaser';
import type {SimState} from '../simulation';
import {MOVES} from '../content';
import {moveCapacity,moveSlotStates,MAX_MOVE_SLOTS} from '../moveProgression';
import {TYPE_COLORS} from '../upgrades';
import {hasMoveArt,moveTexture} from '../moveAssets';

/** Always shows five potential moves, independently of the four held-item slots. */
export class MoveHud {
  private slots:{container:Phaser.GameObjects.Container;frame:Phaser.GameObjects.Graphics;image:Phaser.GameObjects.Image;name:Phaser.GameObjects.Text;detail:Phaser.GameObjects.Text;}[]=[];
  private signature='';
  constructor(private scene:Phaser.Scene){
    for(let index=0;index<MAX_MOVE_SLOTS;index++){
      const frame=scene.add.graphics(),name=scene.add.text(9,7,'',{fontFamily:'Trebuchet MS',fontSize:'12px',fontStyle:'bold',color:'#fff1d3'}),detail=scene.add.text(9,27,'',{fontFamily:'Trebuchet MS',fontSize:'10px',color:'#b7cec0'});
      const image=scene.add.image(23,23,'__WHITE').setName('move-art').setVisible(false);
      const container=scene.add.container(18+index*152,119,[frame,image,name,detail]).setName(`move-slot-${index+1}`).setDepth(20000).setScrollFactor(0);
      this.slots.push({container,frame,image,name,detail});
    }
  }
  update(state:SimState){
    const key=`${state.pokemonId}:${state.level}:${state.moveSlots.map(s=>`${s.id}:${s.rank}`).join(',')}:${state.moveUpgradeCredits}`;if(key===this.signature)return;this.signature=key;
    const capacity=moveCapacity(state.pokemon,state.level),states=moveSlotStates(state.pokemon,state.level);
    this.slots.forEach((view,index)=>{
      const slot=state.moveSlots[index],locked=!slot&&index>=capacity,color=slot?TYPE_COLORS[MOVES[slot.id].type]:locked?0x7c9182:0x7ed8ad;
      view.frame.clear().fillStyle(0x102019,locked?.55:.82).fillRoundedRect(0,0,145,47,5).lineStyle(1,color,locked?.4:.8).strokeRoundedRect(0,0,145,47,5);
      const art=!!slot&&hasMoveArt(this.scene,slot.id);
      view.container.setData('status',slot?'filled':locked?'locked':'empty').setData('requirement',states[index].requirement).setData('moveId',slot?.id).setData('artFallback',!!slot&&!art);
      view.image.setVisible(art);
      view.name.setX(art?46:9).setFontSize(art?11:12);view.detail.setX(art?46:9);
      if(slot){
        if(art){view.image.setTexture(moveTexture(slot.id)).setScale(1).setData('assetId',slot.id);view.image.texture.setFilter(0);}
        view.name.setText(MOVES[slot.id].name).setColor('#fff1d3');view.detail.setText(`${index+1} · ${MOVES[slot.id].type} · R${slot.rank}`);
      }
      else if(locked){view.name.setText('    LOCKED').setColor('#abb9ae');view.detail.setText(states[index].requirement);view.frame.lineStyle(1,0xa3b3a7,.8).strokeRoundedRect(9,13,9,7,1).strokeRoundedRect(11,8,5,7,2);}
      else{view.name.setText('EMPTY MOVE SLOT').setColor('#9ed9bf');view.detail.setText(`SLOT ${index+1} · Learn from rewards`);}
    });
  }
  destroy(){this.slots.forEach(slot=>slot.container.destroy(true));}
}
