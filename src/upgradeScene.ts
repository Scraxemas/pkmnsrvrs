import Phaser from 'phaser';
import {SimState,Upgrade} from './simulation';
import {describeUpgrade,UpgradeDetails} from './upgrades';
import {loadSave} from './save';
import {motionReduced} from './preferences';

interface ChoiceConfig {title:string;options:Upgrade[];state:SimState;onSelect:(upgrade:Upgrade)=>void;}

function illustration(g:Phaser.GameObjects.Graphics,details:UpgradeDetails){
  const c=details.color,id=details.icon;
  g.fillStyle(0x102c32,1).fillRoundedRect(-76,-58,152,116,8);
  g.lineStyle(2,c,.25).strokeRoundedRect(-76,-58,152,116,8);
  if(['vineWhip','leechSeed','miracleSeed','bigRoot'].includes(id)){
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

export class UpgradeScene extends Phaser.Scene {
  config!:ChoiceConfig;focus=0;page=0;locked=false;cards:Phaser.GameObjects.Container[]=[];pager?:Phaser.GameObjects.Text;
  constructor(){super('upgrade');}
  init(config:ChoiceConfig){this.config=config;this.focus=0;this.page=0;this.locked=false;this.cards=[];}
  create(){
    this.cameras.main.setScroll(0,0);this.add.rectangle(640,360,1280,720,0x061719,.91);
    this.add.text(640,62,this.config.title,{fontFamily:'Trebuchet MS',fontSize:'31px',fontStyle:'bold',color:'#ffe4a0'}).setOrigin(.5);
    this.add.text(640,104,'CHOOSE ONE UPGRADE',{fontFamily:'Trebuchet MS',fontSize:'14px',color:'#b4c9c9',letterSpacing:3}).setOrigin(.5);
    this.add.text(640,674,'1 / 2 / 3  ·  SELECT      ← / →  ·  FOCUS      ENTER  ·  CONFIRM',{fontFamily:'Trebuchet MS',fontSize:'14px',color:'#b4c9c9'}).setOrigin(.5);
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
    const options=this.config.options.slice(this.page*3,this.page*3+3),width=330,height=480,gap=26;
    options.forEach((option,i)=>{
      const index=this.page*3+i,x=640+(i-(options.length-1)/2)*(width+gap),y=390,d=describeUpgrade(this.config.state,option),card=this.add.container(x,entrance?y+24:y);
      const frame=this.add.graphics().setName('frame');card.add(frame);
      const icon=this.add.graphics().setPosition(0,-114);illustration(icon,d);card.add(icon);
      const text=(ty:number,value:string,size:number,color:string,bold=false)=>this.add.text(0,ty,value,{fontFamily:'Trebuchet MS',fontSize:`${size}px`,color,fontStyle:bold?'bold':'normal',align:'center',wordWrap:{width:width-42}}).setOrigin(.5,0);
      card.add([text(-height/2+18,`[ ${i+1} ]`,14,'#a7c8c7'),text(-42,d.name,25,'#fff1c6',true),text(0,d.category,13,'#b8dad6'),text(38,d.description,17,'#dbe9e3'),text(112,d.rank,16,'#ffe3a1',true),text(150,d.benefit,17,'#b9f1cd')]);
      const hit=this.add.zone(-width/2,-height/2,width,height).setOrigin(0).setInteractive({useHandCursor:true});
      hit.on('pointerover',()=>{if(!this.locked){this.focus=index;this.refreshFocus();}});hit.on('pointerdown',()=>this.choose(index));card.add(hit);
      card.setData('accent',d.color).setData('index',index);this.cards.push(card);
      if(entrance){card.setAlpha(0);this.tweens.add({targets:card,y,alpha:1,duration:250,delay:i*70,ease:'Cubic.easeOut'});}
    });
    if(this.config.options.length>3){const label=this.add.text(640,646,`MORE REWARDS  ·  PAGE ${this.page+1} / ${Math.ceil(this.config.options.length/3)}`,{fontFamily:'Trebuchet MS',fontSize:'14px',color:'#ffe3a1',backgroundColor:'#23404b',padding:{x:14,y:7}}).setOrigin(.5).setInteractive({useHandCursor:true});this.pager=label;label.once('pointerdown',()=>{if(!this.locked){this.page=(this.page+1)%Math.ceil(this.config.options.length/3);this.focus=this.page*3;this.drawCards(false);}});}
    this.refreshFocus();
  }
  refreshFocus(){
    for(const card of this.cards){const g=card.getByName('frame') as Phaser.GameObjects.Graphics,focused=card.getData('index')===this.focus,c=card.getData('accent');g.clear();g.fillStyle(0x050c15,1).fillRect(-169,-244,338,488);g.fillStyle(0x142d38,1).fillRect(-165,-240,330,480);g.lineStyle(focused?4:2,focused?0xffedb1:c,1).strokeRect(-163,-238,326,476);g.fillStyle(c,1).fillRect(-158,-232,316,5);g.fillStyle(c,.12).fillRect(-157,96,314,134);}
  }
  choose(index:number){
    if(this.locked||!this.config.options[index])return;this.locked=true;this.focus=index;this.refreshFocus();
    for(const card of this.cards)this.tweens.add({targets:card,alpha:card.getData('index')===index?1:.2,duration:120});
    this.time.delayedCall(160,()=>{this.scene.stop();this.config.onSelect(this.config.options[index]);});
  }
}
