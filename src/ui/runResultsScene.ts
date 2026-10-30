import Phaser from 'phaser';
interface ResultConfig {result:'victory'|'defeat';level:number;defeated:number;time:number;seed:number;onReturn:()=>void;}
/** Screen-space input stays independent of the scrolling gameplay camera. */
export class RunResultsScene extends Phaser.Scene {
  private config!:ResultConfig;private locked=false;returnButton!:Phaser.GameObjects.Text;
  constructor(){super('results');}
  init(config:ResultConfig){this.config=config;this.locked=false;}
  create(){
    this.cameras.main.setScroll(0,0);const c=this.config,title=c.result==='victory'?'VIRIDIAN FOREST CLEARED!':'RUN DEFEATED';
    this.add.rectangle(640,360,680,360,0x102019,.98);
    this.add.text(640,260,`${title}\n\nLevel ${c.level} · ${c.defeated} defeated\nTime ${Math.floor(c.time/60)}:${String(Math.floor(c.time%60)).padStart(2,'0')}\nSeed ${c.seed}`,{fontFamily:'Trebuchet MS, monospace',fontSize:'28px',color:c.result==='victory'?'#ffe26b':'#ff8f8f',align:'center'}).setOrigin(.5);
    this.returnButton=this.add.text(640,485,'RETURN TO MENU',{fontFamily:'Trebuchet MS, monospace',fontSize:'22px',color:'#fff',backgroundColor:'#244c37',padding:{x:18,y:12},align:'center',fixedWidth:260}).setOrigin(.5).setInteractive({useHandCursor:true});
    this.returnButton.on('pointerover',()=>this.returnButton.setBackgroundColor('#3c7652'));this.returnButton.on('pointerout',()=>this.returnButton.setBackgroundColor('#244c37'));this.returnButton.on('pointerdown',()=>this.returnToMenu());
    this.input.keyboard!.on('keydown',(event:KeyboardEvent)=>{if(!event.repeat&&(event.key==='Enter'||event.key==='Escape'))this.returnToMenu();});
  }
  private returnToMenu(){if(this.locked)return;this.locked=true;this.scene.stop();this.config.onReturn();}
}
