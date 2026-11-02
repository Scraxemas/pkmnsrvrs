import Phaser from 'phaser';
import {PRIMARY_FONT_FAMILY} from './fonts';
interface ResultConfig {result:'victory'|'defeat';level:number;defeated:number;time:number;seed:number;unlocks?:string[];onReturn:()=>void;}
/** A field-report layout with clear outcome, numbers and one primary action. */
export class RunResultsScene extends Phaser.Scene {
 private config!:ResultConfig;private locked=false;returnButton!:Phaser.GameObjects.Text;
 constructor(){super('results');}
 init(config:ResultConfig){this.config=config;this.locked=false;}
 create(){
  this.cameras.main.setScroll(0,0);
  const c=this.config,victory=c.result==='victory',accent=victory?0xf2d27f:0xe9a18e;
  const panel=this.add.graphics().setName('expedition-results-panel');
  panel.fillStyle(0x04140f,.9).fillRect(0,0,1280,720);
  panel.fillStyle(0x0b271f,.98).fillRoundedRect(239,91,802,537,12);
  panel.lineStyle(2,0x749b7e,.8).strokeRoundedRect(239,91,802,537,12);
  panel.lineStyle(1,0xe5d79b,.35).strokeRoundedRect(246,98,788,523,9);
  panel.fillStyle(accent,1).fillRect(270,123,84,5);
  panel.lineStyle(1,0x8da991,.35).lineBetween(273,300,1007,300);
  this.add.text(275,146,'KANTO FIELD OPERATIONS  /  RUN REPORT',{
   fontFamily:PRIMARY_FONT_FAMILY,fontSize:'12px',color:'#afd6ba'
  }).setName('results-eyebrow');
  this.add.text(640,227,victory?'FOREST SURVIVED':'EXPEDITION ENDED',{
   fontFamily:PRIMARY_FONT_FAMILY,fontSize:victory?'35px':'33px',
   fontStyle:'bold',color:victory?'#ffe4a0':'#f6aa9c',
   stroke:'#05160e',strokeThickness:5
  }).setName('results-title').setOrigin(.5);
  this.add.text(640,269,victory?'BEEDRILL DEFEATED · VIRIDIAN CLEARED':'YOUR NEXT RUN STARTS HERE',{
   fontFamily:PRIMARY_FONT_FAMILY,fontSize:'13px',color:'#d4ddc8'
  }).setOrigin(.5);
  const metrics:[string,string,string][]=[
   ['SURVIVAL',`${String(Math.floor(c.time/60)).padStart(2,'0')}:${String(Math.floor(c.time%60)).padStart(2,'0')}`,'TIME'],
   ['LEVEL',String(c.level).padStart(2,'0'),'POWER'],
   ['KNOCKOUTS',String(c.defeated),'KO']
  ];
  metrics.forEach(([name,value,tag],i)=>{
   const x=274+i*247,y=326,w=231,h=121;
   panel.fillStyle(0x14382c,.91).fillRoundedRect(x,y,w,h,5);
   panel.lineStyle(1,0x8cb597,.62).strokeRoundedRect(x,y,w,h,5);
   this.add.text(x+15,y+14,name,{fontFamily:PRIMARY_FONT_FAMILY,fontSize:'10px',color:'#b3d8c0'})
    .setName('results-metric-label-'+tag);
   this.add.text(x+w/2,y+66,value,{
    fontFamily:PRIMARY_FONT_FAMILY,fontSize:'31px',fontStyle:'bold',color:'#fff0c8'
   }).setOrigin(.5).setName('results-metric-'+tag);
  });
  const unlocked=(c.unlocks??[]).filter(Boolean).slice(0,3);
  this.add.text(285,479,unlocked.length?'NEW DISCOVERIES':'WORLD SEED  /  '+c.seed,{
   fontFamily:PRIMARY_FONT_FAMILY,fontSize:'10px',color:'#b6d2b8'
  }).setName('results-unlock-heading');
  if(unlocked.length)this.add.text(285,504,unlocked.join('   ·   '),{
   fontFamily:PRIMARY_FONT_FAMILY,fontSize:'14px',color:'#ffe0a0',wordWrap:{width:710}
  }).setName('results-unlocks');
  else this.add.text(285,505,'Return stronger. Discover more. Keep exploring.',{
   fontFamily:PRIMARY_FONT_FAMILY,fontSize:'13px',color:'#d6e9d2'
  });
  this.returnButton=this.add.text(640,575,'RETURN TO MENU',{
   fontFamily:PRIMARY_FONT_FAMILY,fontSize:'18px',fontStyle:'bold',color:'#153126',
   backgroundColor:'#e7cb83',padding:{x:26,y:13},align:'center',fixedWidth:324
  }).setOrigin(.5).setName('results-return-button').setInteractive({useHandCursor:true});
  this.returnButton.on('pointerover',()=>this.returnButton.setBackgroundColor('#fff0b4'));
  this.returnButton.on('pointerout',()=>this.returnButton.setBackgroundColor('#e7cb83'));
  this.returnButton.on('pointerdown',()=>this.returnToMenu());
  const keyboard=(event:KeyboardEvent)=>{
   if(!event.repeat&&(event.key==='Enter'||event.key==='Escape'))this.returnToMenu();
  };
  this.input.keyboard?.on('keydown',keyboard);
  this.events.once('shutdown',()=>this.input.keyboard?.off('keydown',keyboard));
 }
 private returnToMenu(){if(this.locked)return;this.locked=true;this.scene.stop();this.config.onReturn();}
}
