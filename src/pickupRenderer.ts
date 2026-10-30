import type Phaser from 'phaser';
import {PRIMARY_FONT_FAMILY} from './ui/fonts';
import type {SimState,Upgrade} from './simulation';
import {candyTier,itemTexture} from './itemAssets';
import {CONSUMABLES} from './consumables';
import {interpolatePosition,Position} from './interpolation';
import type {FeedbackKind} from './itemCombat';

interface Spark {x:number;y:number;born:number;kind:FeedbackKind|'collect';}
// Transparent 32px source frames have 20–24px silhouettes: 1.25× gives 25–30 world pixels.
export const pickupScale=(kind:SimState['pickups'][number]['kind'])=>kind==='consumable'?1.25:2;
/** Shared textures and one graphics batch; no tween, timer or particle emitter per candy. */
export class PickupRenderer {
  readonly views=new Map<number,Phaser.GameObjects.Image>();
  private sparks:Spark[]=[];
  private graphics:Phaser.GameObjects.Graphics;
  private notice:Phaser.GameObjects.Text;
  private noticeUntil=0;
  constructor(private scene:Phaser.Scene,private worldLayer?:Phaser.GameObjects.Layer,effectsLayer?:Phaser.GameObjects.Layer){
    this.graphics=scene.add.graphics().setDepth(16010);
    effectsLayer?.add(this.graphics);
    this.notice=scene.add.text(640,646,'',{fontFamily:PRIMARY_FONT_FAMILY,fontSize:'16px',fontStyle:'bold',color:'#d5f8ff',stroke:'#102c32',strokeThickness:4,align:'center'}).setOrigin(.5).setScrollFactor(0).setDepth(20005).setVisible(false);
  }
  onStep(state:SimState){
    let exp=0,base=0;const names:string[]=[];
    for(const pickup of state.collectedPickups){
      exp+=pickup.awardedExp;base+=pickup.kind==='xp'?pickup.baseValue:0;
      if(pickup.consumableId)names.push(CONSUMABLES[pickup.consumableId].name);
      this.sparks.push({x:pickup.x,y:pickup.y,born:state.time,kind:'collect'});
    }
    for(const feedback of state.feedback)this.sparks.push({...feedback,born:state.time});
    this.sparks=this.sparks.filter(spark=>state.time-spark.born<.55).slice(-60);
    if(exp||names.length){
      const number=(n:number)=>Number(n.toFixed(2));
      this.notice.setText([exp?`+${number(exp)} EXP${exp>base?`  ·  Lucky Egg +${number(exp-base)}`:''}`:'',...names].filter(Boolean).join('  ·  '));this.noticeUntil=state.time+1.1;
    }
  }
  onUpgrade(upgrade:Upgrade,state:SimState){
    if(upgrade.kind==='item'&&upgrade.id==='magnet')this.sparks.push({...state.player,born:state.time,kind:'magnet'});
  }
  draw(state:SimState,previous:Map<number,Position>,alpha:number,reduced:boolean){
    const alive=new Set<number>(),g=this.graphics;g.clear();let sparkleBudget=20;
    for(const pickup of state.pickups){
      alive.add(pickup.id);
      const art=pickup.kind==='xp'?`candy:${candyTier(pickup.value)}`:pickup.kind==='ball'?`ball:${pickup.tier??1}`:CONSUMABLES[pickup.consumableId!].art,key=itemTexture(art,true);
      let image=this.views.get(pickup.id);if(!image){image=this.scene.add.image(pickup.x,pickup.y,key).setName('world-pickup');this.worldLayer?.add(image);this.views.set(pickup.id,image);}else if(image.texture.key!==key)image.setTexture(key);image.setScale(pickupScale(pickup.kind));
      const p=interpolatePosition(previous.get(pickup.id),pickup,alpha),phase=state.time*3+pickup.id*1.71,bob=reduced?0:Math.sin(phase)*2;
      image.setPosition(p.x,p.y-7+bob).setDepth(p.y+6).setAlpha(reduced?1:.94+Math.sin(phase*.7)*.06).setData('assetId',art);
      if(!reduced&&pickup.kind==='xp'&&sparkleBudget>0&&Math.sin(phase*.43)>.975){this.star(p.x+11,p.y-18,2,0xdafaff,.65);sparkleBudget--;}
    }
    for(const [id,view] of this.views)if(!alive.has(id)){view.destroy();this.views.delete(id);}
    // These are the exact authoritative hazard footprints, including a visible warning.
    for(const hazard of state.hazards){
      const armed=state.time>=hazard.armedAt,color=hazard.kind==='spikes'?0xffbb6b:0xdba1ed;
      g.lineStyle(1,color,armed?.75:.5).strokeCircle(hazard.x,hazard.y,hazard.radius);
      for(let i=0;i<7;i++){const angle=i*2.4,x=hazard.x+Math.cos(angle)*hazard.radius*.65,y=hazard.y+Math.sin(angle)*hazard.radius*.65;
        if(hazard.kind==='spikes')g.fillStyle(color,armed?.85:.3).fillTriangle(x-4,y+3,x,y-7,x+4,y+3);
        else g.fillStyle(color,armed?.45:.2).fillRect(x-3,y-3,6,6);
      }
    }
    if(!reduced)for(const spark of this.sparks){
      const age=state.time-spark.born;if(age<0||age>.55)continue;const progress=age/.55,colors:Record<Spark['kind'],number>={collect:0xd4f8ff,heal:0x8ff5a1,reflect:0xffb28a,protect:0xffe7a0,stagger:0xffdc75,recoil:0xef7e9a,magnet:0xb4ebff},color=colors[spark.kind];
      if(spark.kind==='magnet'||spark.kind==='protect'){for(let i=0;i<6;i++){const a=i*Math.PI/3,r=18+progress*18;this.star(spark.x+Math.cos(a)*r,spark.y-12+Math.sin(a)*r,2,color,1-progress);}}
      else this.star(spark.x,spark.y-10-progress*18,2+progress*2,color,1-progress);
    }
    this.notice.setVisible(state.time<this.noticeUntil).setAlpha(reduced?1:Math.min(1,Math.max(0,(this.noticeUntil-state.time)*3)));
  }
  private star(x:number,y:number,size:number,color:number,opacity:number){this.graphics.fillStyle(color,opacity).fillRect(Math.round(x)-size,Math.round(y),size*2+1,1).fillRect(Math.round(x),Math.round(y)-size,1,size*2+1);}
  destroy(){for(const view of this.views.values())view.destroy();this.views.clear();this.graphics.destroy();this.notice.destroy();}
}
