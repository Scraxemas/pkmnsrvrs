class AmbientRandom {private value=0x6f726573;next(){let v=this.value;v^=v<<13;v^=v>>>17;v^=v<<5;this.value=v>>>0;return this.value/4294967296;}}
interface Leaf {age:number;life:number;x:number;y:number;vx:number;vy:number;phase:number;size:number;}
/** Decorative RNG lives here and never reads or advances a simulation seed. */
export class MenuAmbientParticles {
  readonly maxLeaves=10;readonly maxMotes=7;leaves:Leaf[]=[];private rng=new AmbientRandom();private nextLeaf=0;private leaf:HTMLCanvasElement;
  constructor(){
    this.leaf=document.createElement('canvas');this.leaf.width=9;this.leaf.height=6;const g=this.leaf.getContext('2d')!;
    const pixels=['    ggg  ','  gggggg ',' ggglggg ','ggllggg  ',' gggg    ','gg       '];
    pixels.forEach((row,y)=>[...row].forEach((p,x)=>{if(p===' ')return;g.fillStyle=p==='l'?'#c1c879':'#6f934e';g.fillRect(x,y,1,1);}));
    // Start with only three leaves; the rest arrive gradually.
    for(let i=0;i<3;i++)this.spawn(true);
  }
  private spawn(initial=false){const r=this.rng;this.leaves.push({age:0,life:17+r.next()*8,x:initial?r.next():1.03,y:r.next()*.75,vx:-(.018+r.next()*.009),vy:.012+r.next()*.008,phase:r.next()*Math.PI*2,size:r.next()<.7?1:2});}
  update(delta:number){for(const leaf of this.leaves)leaf.age+=delta;this.leaves=this.leaves.filter(leaf=>leaf.age<leaf.life);this.nextLeaf-=delta;if(this.nextLeaf<=0){if(this.leaves.length<this.maxLeaves)this.spawn();this.nextLeaf=2.8;}}
  draw(g:CanvasRenderingContext2D,width:number,height:number,time:number,lightX:number,lightY:number){
    const pixel=Math.max(1,Math.min(2,Math.round(height/650)));
    for(const leaf of this.leaves){
      const fade=Math.min(1,leaf.age/1.5,(leaf.life-leaf.age)/3),x=(leaf.x+leaf.vx*leaf.age)*width+Math.sin(leaf.age*.65+leaf.phase)*14,y=(leaf.y+leaf.vy*leaf.age)*height+Math.cos(leaf.age*.5+leaf.phase)*5;
      g.globalAlpha=fade*.48;const size=pixel*(leaf.size===2?1.5:1);g.drawImage(this.leaf,Math.round(x),Math.round(y),Math.round(9*size),Math.round(6*size));
    }
    g.fillStyle='#fff0b4';
    for(let i=0;i<this.maxMotes;i++){const phase=time*.17+i*2.399,x=lightX+Math.sin(phase*.8)*width*.085,y=lightY+Math.cos(phase)*height*.11;g.globalAlpha=.1+.14*(.5+.5*Math.sin(time*.6+i));g.fillRect(Math.round(x),Math.round(y),pixel,pixel);}
    g.globalAlpha=1;
  }
  destroy(){this.leaves=[];this.leaf.width=0;this.leaf.height=0;}
}
