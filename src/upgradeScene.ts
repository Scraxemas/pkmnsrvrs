import Phaser from 'phaser';
import {PRIMARY_FONT_FAMILY} from './ui/fonts';
import {SimState,Upgrade} from './simulation';
import {describeUpgrade,UpgradeDetails,progressionNoticeText} from './upgrades';
import {loadSave} from './save';
import {motionReduced} from './preferences';
import {itemTexture,POKESPRITE_ASSETS} from './itemAssets';
import {hasMoveArt,moveTexture} from './moveAssets';
import {pixelArt,UPGRADE_ART_DISPLAY_SIZE} from './ui/pixelArt';

interface ChoiceConfig {title:string;options:Upgrade[];state:SimState;onSelect:(upgrade:Upgrade)=>void;}

function illustration(g:Phaser.GameObjects.Graphics,details:UpgradeDetails){
  const c=details.color,id=details.icon;
  g.fillStyle(0x102c32,1).fillRoundedRect(-76,-58,152,116,8);
  g.lineStyle(2,c,.25).strokeRoundedRect(-76,-58,152,116,8);
  if(id==='metalClaw'||id==='dragonClaw'){
    g.lineStyle(id==='dragonClaw'?10:7,c,1);for(let i=0;i<3;i++)g.lineBetween(-42+i*24,28,-24+i*24,-30);g.lineStyle(2,0xf3faff,1).lineBetween(-43,32,45,-30);if(id==='dragonClaw')g.lineStyle(4,0xd4c0ff,1).lineBetween(-42,-27,41,28);
  }else if(id==='razorLeaf'){
    for(let i=0;i<3;i++){const x=(i-1)*34,y=(i%2)*18-9;g.fillStyle(c,1).fillTriangle(x-14,y+14,x+5,y-20,x+15,y+4);g.lineStyle(2,0xd9fbb8,1).lineBetween(x-10,y+10,x+8,y-13);}
  }else if(id==='hydroPump'){
    g.lineStyle(22,c,1).lineBetween(-50,22,43,-21);g.lineStyle(7,0xdcfaff,1).lineBetween(-50,22,43,-21);g.lineStyle(3,0xffffff,1).strokeCircle(38,-19,19).strokeCircle(-18,8,16);
  }else if(['vineWhip','leechSeed','miracleSeed','bigRoot'].includes(id)){
    g.lineStyle(10,c,1);g.beginPath();g.moveTo(-48,32);g.lineTo(-20,18);g.lineTo(0,-24);g.lineTo(24,-32);g.lineTo(48,-12);g.strokePath();
    g.fillStyle(0xb8ee86,1).fillEllipse(-12,-4,26,12).fillEllipse(28,-26,24,12);
    if(id==='leechSeed'||id==='miracleSeed')g.fillStyle(0xd4b97c,1).fillEllipse(0,18,22,30);
  }else if(['ember','dragonRage','charcoal'].includes(id)){
    g.fillStyle(c,1).fillTriangle(-36,36,-8,-42,12,32).fillTriangle(-8,36,28,-32,42,36);g.fillStyle(0xffe399,1).fillTriangle(-12,34,4,-16,20,34);
  }else if(['waterGun','bubble','mysticWater'].includes(id)){
    g.fillStyle(c,1).fillCircle(-34,10,17).fillCircle(8,-12,25).fillCircle(43,18,13);g.lineStyle(3,0xdcfaff,1).strokeCircle(8,-12,20).strokeCircle(-34,10,12);
  }else if(id==='poisonPowder'){
    g.fillStyle(c,.9);for(let i=0;i<7;i++)g.fillCircle(Math.cos(i*1.7)*36,Math.sin(i*1.7)*25,15);g.fillStyle(0xeac6ff,1).fillRect(-17,-32,5,5).fillRect(32,-7,5,5).fillRect(0,24,5,5);
  }else if(['scratch','quickClaw'].includes(id)){
    g.lineStyle(8,c,1);for(let i=0;i<3;i++)g.lineBetween(-35+i*23,34,-13+i*23,-34);
  }else if(id==='rapidSpin'){
    g.lineStyle(9,c,1).strokeCircle(0,0,34);g.fillStyle(0xebf6ee,1).fillTriangle(29,-31,49,-7,21,-4);g.fillStyle(c,1).fillEllipse(0,0,35,25);
  }else if(id==='magnet'){
    g.lineStyle(16,0xdd6874,1).strokeRoundedRect(-25,-30,50,56,10);g.fillStyle(0x102c32,1).fillRect(-12,-40,24,35);g.fillStyle(0xd7eafa,1).fillRect(-33,-36,16,16).fillRect(17,-36,16,16);
  }else if(id==='scopeLens'){
    g.fillStyle(c,1).fillCircle(0,-5,30);g.fillStyle(0x8de4ff,1).fillCircle(0,-5,21);g.fillStyle(0xffffff,.8).fillRect(-10,-18,8,10);g.fillStyle(c,1).fillRect(-7,24,14,22);
  }else if(id==='heal'){
    g.fillStyle(c,1).fillRect(-10,-35,20,70).fillRect(-35,-10,70,20);
  }else if(id==='mastery'){
    g.fillStyle(c,1).fillTriangle(0,-44,38,25,-38,25).fillTriangle(0,44,38,-25,-38,-25);g.fillStyle(0xffedb3,1).fillCircle(0,0,16);
  }else if(id==='leftovers'){
    g.fillStyle(0x83c66a,1).fillCircle(0,0,34);g.fillStyle(0xe2e2a3,1).fillRect(-12,-24,24,48);g.fillStyle(0xb68c58,1).fillRect(-3,-37,7,15).fillRect(-3,24,7,16);
  }else if(id==='vitamin'){
    g.fillStyle(0xeef6f5,1).fillRoundedRect(-24,-32,48,72,6);g.fillStyle(c,1).fillRect(-21,-3,42,25);g.fillStyle(0x80a6bc,1).fillRect(-27,-42,54,14);g.fillStyle(0xffffff,1).fillRect(-4,2,8,15).fillRect(-8,6,16,7);
  }else{
    g.fillStyle(c,1).fillTriangle(-45,22,35,-34,45,20);g.lineStyle(5,0xfcf6d2,1).lineBetween(-48,35,8,-6).lineBetween(-35,42,20,0);
  }
}

export const UPGRADE_LAYOUT={width:280,height:394,centerY:402,gap:26,veil:.55};
export class UpgradeScene extends Phaser.Scene {
  config!:ChoiceConfig;focus=0;page=0;locked=false;cards:Phaser.GameObjects.Container[]=[];pager?:Phaser.GameObjects.Text;
  constructor(){super('upgrade');}
  init(config:ChoiceConfig){this.config=config;this.focus=0;this.page=0;this.locked=false;this.cards=[];}
  create(){
    this.cameras.main.setScroll(0,0);this.add.rectangle(640,360,1280,720,0x10251c,UPGRADE_LAYOUT.veil).setName('upgrade-veil');
    this.add.text(640,69,this.config.title,{fontFamily:PRIMARY_FONT_FAMILY,fontSize:'29px',fontStyle:'bold',color:'#ffe4a0',stroke:'#14291c',strokeThickness:4}).setOrigin(.5);
    const notices=this.config.state.progressionNotices.slice(-3).map(progressionNoticeText).join('  ·  ');
    this.add.text(640,106,'CHOOSE ONE UPGRADE',{fontFamily:PRIMARY_FONT_FAMILY,fontSize:'13px',fontStyle:'bold',color:'#fff0be',stroke:'#10251c',strokeThickness:4}).setOrigin(.5,0);
    this.add.text(640,172,notices,{fontFamily:PRIMARY_FONT_FAMILY,fontSize:'13px',fontStyle:'bold',color:'#fff0be',stroke:'#10251c',strokeThickness:4,align:'center',wordWrap:{width:1080},lineSpacing:1}).setOrigin(.5,0).setName('progression-notice');
    this.add.text(640,674,'1 / 2 / 3  ·  SELECT      ← / →  ·  FOCUS      ENTER  ·  CONFIRM',{fontFamily:PRIMARY_FONT_FAMILY,fontSize:'14px',color:'#eef6ed',stroke:'#10251c',strokeThickness:3}).setOrigin(.5);
    this.input.keyboard!.on('keydown',(event:KeyboardEvent)=>{
      if(this.locked||event.repeat)return;
      if(['1','2','3'].includes(event.key))this.choose(this.page*3+Number(event.key)-1);
      else if(event.key==='ArrowRight'||event.key==='ArrowLeft'){this.focus=(this.focus+(event.key==='ArrowRight'?1:-1)+this.config.options.length)%this.config.options.length;const page=Math.floor(this.focus/3);if(page!==this.page){this.page=page;this.drawCards(false);}else this.refreshFocus();}
      else if(event.key==='Enter')this.choose(this.focus);
    });
    this.drawCards(true);
  }
  drawCards(entrance:boolean){
    entrance=entrance&&!motionReduced(loadSave().settings);
    for(const card of this.cards)card.destroy(true);this.cards=[];this.pager?.destroy();this.pager=undefined;
    const options=this.config.options.slice(this.page*3,this.page*3+3),{width,height,centerY:y,gap}=UPGRADE_LAYOUT;
    options.forEach((option,i)=>{
      const index=this.page*3+i,x=640+(i-(options.length-1)/2)*(width+gap),d=describeUpgrade(this.config.state,option),card=this.add.container(x,entrance?y+14:y);
      card.setData('width',width).setData('height',height);
      const frame=this.add.graphics().setName('frame');card.add(frame);
      const moveReady=!!d.moveId&&hasMoveArt(this,d.moveId);
      if(d.transition&&moveReady){
        const backing=this.add.graphics().setPosition(0,-110);backing.fillStyle(0x102c32,1).fillRoundedRect(-121,-40,242,80,6).lineStyle(1,d.color,.5).strokeRoundedRect(-121,-40,242,80,6);card.add(backing);
        const xs=d.transition.from.length===2?[-89,-35]:[-68];
        d.transition.from.forEach((id,index)=>{if(hasMoveArt(this,id))card.add(pixelArt(this,xs[index],-112,moveTexture(id),32,'ingredient-art').setData('assetId',id));card.add(this.add.text(xs[index],-88,`R${d.transition!.ranks[index]}`,{fontFamily:PRIMARY_FONT_FAMILY,fontSize:'10px',color:'#cce0d6'}).setOrigin(.5));});
        if(d.transition.from.length===2)card.add(this.add.text(-62,-113,'+',{fontFamily:PRIMARY_FONT_FAMILY,fontSize:'16px',color:'#fff1c6'}).setOrigin(.5));
        card.add(this.add.text(13,-112,'→',{fontFamily:PRIMARY_FONT_FAMILY,fontSize:'21px',color:'#ffe3a1'}).setOrigin(.5));
        card.add(pixelArt(this,76,-110,moveTexture(d.transition.to),64,'move-art').setData('assetId',d.transition.to));
        card.setData('transition',d.transition.kind).setData('ingredients',d.transition.from);
      }else if(d.artKey||moveReady){
        const backing=this.add.graphics().setPosition(0,-110);backing.fillStyle(0x102c32,1).fillRoundedRect(-60,-40,120,80,6).lineStyle(1,d.color,.3).strokeRoundedRect(-60,-40,120,80,6);card.add(backing);
        const picture=pixelArt(this,0,-110,d.artKey?itemTexture(d.artKey,true):moveTexture(d.moveId!),UPGRADE_ART_DISPLAY_SIZE,d.artKey?'item-art':'move-art');picture.setData('assetId',d.artKey??d.moveId);card.add(picture);
      }else{const picture=this.add.graphics().setPosition(0,-110).setScale(.72).setName(d.moveId?'move-art-fallback':'upgrade-illustration');illustration(picture,d);card.add(picture);}
      if(d.type){const id=`type:${d.type.toLowerCase()}`,source=POKESPRITE_ASSETS[id];card.add(this.add.image(112,-171,itemTexture(id)).setScale(28/Math.max(source.width,source.height)).setName('type-badge'));}
      if(d.rarity==='rare'){const sparkle=this.add.graphics();sparkle.fillStyle(0xffe19b,.8).fillRect(-119,-175,2,9).fillRect(-122,-172,9,2);card.add(sparkle);}
      const text=(ty:number,value:string,size:number,color:string,bold=false,name='',maxHeight=40,minSize=12)=>{
        const t=this.add.text(0,ty,value,{fontFamily:PRIMARY_FONT_FAMILY,fontSize:`${size}px`,color,fontStyle:bold?'bold':'normal',align:'center',wordWrap:{width:width-34}}).setOrigin(.5,0).setName(name);
        while(t.height>maxHeight&&size>minSize)t.setFontSize(--size);return t;
      };
      card.add([text(-181,`[ ${i+1} ]`,12,'#a7c8c7'),text(-160,d.action,11,'#ffe2a1',true,'card-action'),text(-65,d.name,21,'#fff1c6',true,'card-name',28,17),text(-36,d.category,11,'#b8dad6',false,'card-category'),text(-9,d.description,14,'#dbe9e3',false,'card-description',54,12),text(53,d.rank,13,'#ffe3a1',true,'card-rank'),text(80,d.benefit,d.transition?12:14,'#b9f1cd',false,'card-benefit',99,d.transition?10:12)]);
      const hit=this.add.zone(-width/2,-height/2,width,height).setOrigin(0).setInteractive({useHandCursor:true});
      hit.on('pointerover',()=>{if(!this.locked){this.focus=index;this.refreshFocus(true);}});hit.on('pointerdown',()=>this.choose(index));card.add(hit);
      card.setData('accent',d.color).setData('index',index);this.cards.push(card);
      if(entrance){card.setAlpha(0);this.tweens.add({targets:card,y,alpha:1,duration:210,delay:i*50,ease:'Cubic.easeOut'});}
    });
    if(this.config.options.length>3){const label=this.add.text(640,637,`MORE REWARDS  ·  PAGE ${this.page+1} / ${Math.ceil(this.config.options.length/3)}`,{fontFamily:PRIMARY_FONT_FAMILY,fontSize:'14px',color:'#ffe3a1',backgroundColor:'#23404b',padding:{x:14,y:7}}).setOrigin(.5).setInteractive({useHandCursor:true});this.pager=label;label.once('pointerdown',()=>{if(!this.locked){this.page=(this.page+1)%Math.ceil(this.config.options.length/3);this.focus=this.page*3;this.drawCards(false);}});}
    this.refreshFocus();
  }
  refreshFocus(lift=false){
    const {width:w,height:h,centerY:y}=UPGRADE_LAYOUT;
    for(const card of this.cards){const g=card.getByName('frame') as Phaser.GameObjects.Graphics,focused=card.getData('index')===this.focus,c=card.getData('accent');g.clear().fillStyle(0x050c15,1).fillRect(-w/2-4,-h/2-4,w+8,h+8).fillStyle(0x142d38,1).fillRect(-w/2,-h/2,w,h).lineStyle(focused?3:1,focused?0xffedb1:c,1).strokeRect(-w/2+2,-h/2+2,w-4,h-4).fillStyle(c,1).fillRect(-w/2+7,-h/2+7,w-14,4).fillStyle(c,.12).fillRect(-w/2+8,44,w-16,h/2-52);if(lift&&card.alpha===1&&!motionReduced(loadSave().settings))this.tweens.add({targets:card,y:focused?y-3:y,duration:100,ease:'Sine.easeOut'});}
  }
  choose(index:number){
    if(this.locked||!this.config.options[index])return;this.locked=true;this.focus=index;this.refreshFocus();
    const reduced=motionReduced(loadSave().settings);if(!reduced)for(const card of this.cards)this.tweens.add({targets:card,alpha:card.getData('index')===index?1:.3,duration:100});
    this.time.delayedCall(reduced?1:140,()=>{const choice=this.config.options[index],callback=this.config.onSelect;this.scene.manager.stop(this);callback(choice);});
  }
}
