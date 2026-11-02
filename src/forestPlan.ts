export interface Point {x:number;y:number;}
export interface Clearing extends Point {id:string;radius:number;}
export interface Trail {id:string;points:Point[];width:number;}
export interface EllipseFeature extends Point {id:string;rx:number;ry:number;phase:number;}
export interface Camp extends Point {id:string;radius:number;}
/** Legacy-compatible feature shape. Open forest has no required routes. */
export interface ForestFeatures {clearings:Clearing[];trails:Trail[];ponds:EllipseFeature[];cliffs:EllipseFeature[];camps:Camp[];orientation:number;}

export class ForestRng {constructor(public value:number){}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296;}int(n:number){return Math.floor(this.next()*n);}}
export function forestHash(seed:number,x:number,y:number,salt=0){let v=(seed^Math.imul(x+0x9e3779b9,374761393)^Math.imul(y+0x85ebca6b,668265263)^salt)>>>0;v=Math.imul(v^(v>>>13),1274126177);return(v^(v>>>16))>>>0;}
export function segmentDistance(x:number,y:number,a:Point,b:Point){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);}
export function distanceToTrails(plan:ForestFeatures,x:number,y:number){let d=Infinity;for(const trail of plan.trails)for(let i=1;i<trail.points.length;i++)d=Math.min(d,segmentDistance(x,y,trail.points[i-1],trail.points[i])-trail.width/2);return d;}
export function featureContains(feature:EllipseFeature,x:number,y:number,padding=0){const dx=(feature.x-x)/(feature.rx+padding),dy=(feature.y-y)/(feature.ry+padding),angle=Math.atan2(dy,dx);return dx*dx+dy*dy<=1+.11*Math.sin(angle*3+feature.phase)+.06*Math.cos(angle*5-feature.phase);}

/** Smooth global noise: samples at equal world coordinates agree across any chunk edge. */
export function forestNoise(seed:number,x:number,y:number,scale=256,salt=0){
 const u=x/scale,v=y/scale,i=Math.floor(u),j=Math.floor(v),fx=u-i,fy=v-j;
 const smooth=(n:number)=>n*n*(3-2*n),tx=smooth(fx),ty=smooth(fy);
 const value=(a:number,b:number)=>forestHash(seed,a,b,salt)/4294967295;
 const top=value(i,j)*(1-tx)+value(i+1,j)*tx;
 const bottom=value(i,j+1)*(1-tx)+value(i+1,j+1)*tx;
 return top*(1-ty)+bottom*ty;
}
/** Special sites are seeded once, not mandatory travel or combat objectives. */
export function planForest(seed:number,_width=0,_height=0):ForestFeatures{
 const rng=new ForestRng(forestHash(seed,0,0,0x724a));
 const features:ForestFeatures={clearings:[{id:'start',x:0,y:0,radius:390}],trails:[],ponds:[],cliffs:[],camps:[],orientation:rng.next()*Math.PI*2};
 for(let i=0;i<3;i++){
  const angle=(i+.3+rng.next()*.3)*Math.PI*2/3,distance=2100+rng.next()*2300;
  features.camps.push({id:'camp-'+i,x:Math.round(Math.cos(angle)*distance),y:Math.round(Math.sin(angle)*distance),radius:115});
 }
 return features;
}
export function emptyForestFeatures():ForestFeatures{return{clearings:[],trails:[],ponds:[],cliffs:[],camps:[],orientation:0};}
