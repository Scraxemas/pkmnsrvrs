import type Phaser from 'phaser';
import {PRIMARY_FONT_FAMILY} from './fonts';
import type {SimState} from '../simulation';
import {MOVES} from '../content';
import {moveCapacity,moveSlotStates,MAX_MOVE_SLOTS} from '../moveProgression';
import {TYPE_COLORS} from '../upgrades';
import {hasMoveArt,moveTexture} from '../moveAssets';
import {moveRankStats} from '../moveEffects';

/** Always shows five potential moves, independently of the four held-item slots. */
export class MoveHud {
  private slots:{container:Phaser.GameObjects.Container;frame:Phaser.GameObjects.Graphics;image:Phaser.GameObjects.Image;name:Phaser.GameObjects.Text;detail:Phaser.GameObjects.Text;}[]=[];
  private signature='';
  private tooltip:Phaser.GameObjects.Text;
  constructor(private scene:Phaser.Scene){
    this.tooltip=scene.add.text(18,172,'',{fontFamily:PRIMARY_FONT_FAMILY,fontSize:'12px',color:'#e4f3e8',backgroundColor:'#10191ff5',padding:{x:10,y:8},wordWrap:{width:290},lineSpacing:3}).setName('move-tooltip').setDepth(23000).setScrollFactor(0).setVisible(false);
    for(let index=0;index<MAX_MOVE_SLOTS;index++){
      const frame=scene.add.graphics(),name=scene.add.text(9,7,'',{fontFamily:PRIMARY_FONT_FAMILY,fontSize:'12px',fontStyle:'bold',color:'#fff1d3'}),detail=scene.add.text(9,27,'',{fontFamily:PRIMARY_FONT_FAMILY,fontSize:'10px',color:'#b7cec0'});
      const image=scene.add.image(23,23,'__WHITE').setName('move-art').setVisible(false);
      const container=scene.add.container(18+index*152,119,[frame,image,name,detail]).setName(`move-slot-${index+1}`).setDepth(20000).setScrollFactor(0);
      const hit=scene.add.zone(0,0,145,47).setOrigin(0).setScrollFactor(0).setInteractive();container.add(hit);
      hit.on('pointerover',()=>{const text=container.getData('tooltip');if(text)this.tooltip.setPosition(container.x,171).setText(text).setVisible(true);});hit.on('pointerout',()=>this.tooltip.setVisible(false));
      this.slots.push({container,frame,image,name,detail});
    }
  }
  update(state:SimState){
    const key=`${state.pokemonId}:${state.level}:${state.moveSlots.map(s=>`${s.id}:${s.rank}`).join(',')}:${state.moveUpgradeCredits}:${state.items.map(s=>`${s.id}:${s.rank}`).join(',')}`;if(key===this.signature)return;this.signature=key;this.tooltip.setVisible(false);
    const capacity=moveCapacity(state.pokemon,state.level),states=moveSlotStates(state.pokemon,state.level);
    this.slots.forEach((view,index)=>{
      const slot=state.moveSlots[index],locked=!slot&&index>=capacity,color=slot?TYPE_COLORS[MOVES[slot.id].type]:locked?0x7c9182:0x7ed8ad;
      view.frame.clear().fillStyle(0x102019,locked?.55:.82).fillRoundedRect(0,0,145,47,5).lineStyle(1,color,locked?.4:.8).strokeRoundedRect(0,0,145,47,5);
      const art=!!slot&&hasMoveArt(this.scene,slot.id);
      view.container.setData('status',slot?'filled':locked?'locked':'empty').setData('requirement',states[index].requirement).setData('moveId',slot?.id).setData('artFallback',!!slot&&!art);
      view.image.setVisible(art);
      view.name.setX(art?46:9).setFontSize(art?11:12);view.detail.setX(art?46:9);
      if(slot){
        const move=MOVES[slot.id],stats=moveRankStats(move,slot.rank);view.container.setData('tooltip',`${move.name} · Rank ${slot.rank}\n${move.type} / ${move.damageClass}\n${move.description}\nBase cooldown ${Number(stats.cooldownSeconds.toFixed(2))}s${state.fusionHistory.includes(slot.id)?' · Fusion result':''}`);
        if(art){view.image.setTexture(moveTexture(slot.id)).setScale(1).setData('assetId',slot.id);view.image.texture.setFilter(0);}
        view.name.setText(MOVES[slot.id].name).setColor('#fff1d3');view.detail.setText(`${index+1} · ${MOVES[slot.id].type} · R${slot.rank}`);
      }
      else if(locked){view.container.setData('tooltip',states[index].requirement);view.name.setText('    LOCKED').setColor('#abb9ae');view.detail.setText(states[index].requirement);view.frame.lineStyle(1,0xa3b3a7,.8).strokeRoundedRect(9,13,9,7,1).strokeRoundedRect(11,8,5,7,2);}
      else{view.container.setData('tooltip','An open move slot. Learn a new move from level-up or Poké Ball rewards.');view.name.setText('EMPTY MOVE SLOT').setColor('#9ed9bf');view.detail.setText(`SLOT ${index+1} · Learn from rewards`);}
    });
  }
  destroy(){this.slots.forEach(slot=>slot.container.destroy(true));this.tooltip.destroy();}
}
