export interface Point {x:number;y:number;}
export interface Clearing extends Point {id:string;radius:number;}
export interface Trail {id:string;points:Point[];width:number;}
export interface EllipseFeature extends Point {id:string;rx:number;ry:number;phase:number;}
export interface Camp extends Point {id:string;radius:number;}
export interface ForestFeatures {clearings:Clearing[];trails:Trail[];ponds:EllipseFeature[];cliffs:EllipseFeature[];camps:Camp[];orientation:number;}

export class ForestRng {constructor(public value:number){}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296;}int(n:number){return Math.floor(this.next()*n);}}
export function forestHash(seed:number,x:number,y:number,salt=0){let v=(seed^Math.imul(x+0x9e3779b9,374761393)^Math.imul(y+0x85ebca6b,668265263)^salt)>>>0;v=Math.imul(v^(v>>>13),1274126177);return(v^(v>>>16))>>>0;}
export function segmentDistance(x:number,y:number,a:Point,b:Point){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);}
export function distanceToTrails(plan:ForestFeatures,x:number,y:number){let d=Infinity;for(const trail of plan.trails)for(let i=1;i<trail.points.length;i++)d=Math.min(d,segmentDistance(x,y,trail.points[i-1],trail.points[i])-trail.width/2);return d;}
export function featureContains(feature:EllipseFeature,x:number,y:number,padding=0){
  const dx=(x-feature.x)/(feature.rx+padding),dy=(y-feature.y)/(feature.ry+padding),angle=Math.atan2(dy,dx);
  return dx*dx+dy*dy<=1+.11*Math.sin(angle*3+feature.phase)+.06*Math.cos(angle*5-feature.phase);
}

export function planForest(seed:number,width:number,height:number):ForestFeatures {
  const rng=new ForestRng(forestHash(seed,0,0,0x724a)),orientation=rng.next()*Math.PI*2;
  const start={id:'start',x:width/2+(rng.next()-.5)*256,y:height/2+(rng.next()-.5)*256,radius:350};
  const clearings:Clearing[]=[start],plan:ForestFeatures={clearings,trails:[],ponds:[],cliffs:[],camps:[],orientation};
  for(let gy=0;gy<3;gy++)for(let gx=0;gx<3;gx++){
    if(gx===1&&gy===1)continue;
    const ax=(gx-1)*width*.29,ay=(gy-1)*height*.29;
    const x=Math.max(700,Math.min(width-700,width/2+ax*Math.cos(orientation)-ay*Math.sin(orientation)+(rng.next()-.5)*600));
    const y=Math.max(700,Math.min(height-700,height/2+ax*Math.sin(orientation)+ay*Math.cos(orientation)+(rng.next()-.5)*600));
    clearings.push({id:`clearing-${clearings.length}`,x,y,radius:230+rng.int(180)});
  }
  clearings[1].radius=440;
  const connect=(a:Clearing,b:Clearing)=>{
    const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)||1,bend=(rng.next()-.5)*600,points:Point[]=[];
    for(let i=0;i<=5;i++){const t=i/5,wave=Math.sin(t*Math.PI)*bend+Math.sin(t*Math.PI*2)*(rng.next()-.5)*100;points.push({x:a.x+dx*t-dy/length*wave,y:a.y+dy*t+dx/length*wave});}
    points[0]={x:a.x,y:a.y};points[points.length-1]={x:b.x,y:b.y};
    plan.trails.push({id:`trail-${plan.trails.length}`,points,width:112+rng.int(70)});
  };
  for(let i=1;i<clearings.length;i++){
    const target=clearings.slice(0,i).sort((a,b)=>Math.hypot(a.x-clearings[i].x,a.y-clearings[i].y)-Math.hypot(b.x-clearings[i].x,b.y-clearings[i].y))[0];connect(clearings[i],target);
  }
  const extra=2+rng.int(4);for(let i=0;i<extra;i++){const a=clearings[rng.int(clearings.length)],b=clearings[rng.int(clearings.length)];if(a!==b)connect(a,b);}
  for(const clearing of clearings.slice(2)){
    if(plan.camps.length>=3+rng.int(2))break;
    const phase=rng.next()*Math.PI*2;
    for(let i=0;i<12;i++){
      const angle=phase+i*Math.PI/6,x=clearing.x+Math.cos(angle)*clearing.radius*.74,y=clearing.y+Math.sin(angle)*clearing.radius*.74;
      if(distanceToTrails(plan,x,y)<110)continue;
      if(plan.camps.some(c=>Math.hypot(c.x-x,c.y-y)<480))continue;
      plan.camps.push({id:`camp-${plan.camps.length}`,x,y,radius:170});break;
    }
  }
  const placeFeatures=(list:EllipseFeature[],count:number,cliff:boolean)=>{
    for(let attempt=0;attempt<800&&list.length<count;attempt++){
      const x=450+rng.next()*(width-900),y=450+rng.next()*(height-900),rx=(cliff?110:90)+rng.int(130),ry=(cliff?80:65)+rng.int(100),radius=Math.max(rx,ry);
      if(distanceToTrails(plan,x,y)<radius+90||clearings.some(c=>Math.hypot(c.x-x,c.y-y)<c.radius+radius+70)||plan.camps.some(c=>Math.hypot(c.x-x,c.y-y)<c.radius+radius+70))continue;
      if([...plan.ponds,...plan.cliffs].some(f=>Math.hypot(f.x-x,f.y-y)<Math.max(f.rx,f.ry)+radius+90))continue;
      list.push({id:`${cliff?'cliff':'pond'}-${list.length}`,x,y,rx,ry,phase:rng.next()*Math.PI*2});
    }
  };
  placeFeatures(plan.ponds,14+rng.int(7),false);placeFeatures(plan.cliffs,9+rng.int(6),true);
  return plan;
}

export function emptyForestFeatures():ForestFeatures{return{clearings:[],trails:[],ponds:[],cliffs:[],camps:[],orientation:0};}
