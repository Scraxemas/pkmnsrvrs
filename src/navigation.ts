import { collides, StageMap } from './worldgen';

export interface FlowField {
  cellSize:number;
  cols:number;
  rows:number;
  targetCell:number;
  distances:Int32Array;
  walkable:Uint8Array;
}

const NEIGHBORS=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]] as const;
const index=(x:number,y:number,cols:number)=>y*cols+x;

export function buildFlowField(map:StageMap,targetX:number,targetY:number,cellSize=32):FlowField {
  const cols=Math.ceil(map.width/cellSize),rows=Math.ceil(map.height/cellSize);
  const walkable=new Uint8Array(cols*rows),distances=new Int32Array(cols*rows);
  distances.fill(-1);
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
    const px=Math.min(map.width-17,x*cellSize+cellSize/2);
    const py=Math.min(map.height-17,y*cellSize+cellSize/2);
    walkable[index(x,y,cols)]=collides(map,px,py,16)?0:1;
  }
  let tx=Math.max(0,Math.min(cols-1,Math.floor(targetX/cellSize)));
  let ty=Math.max(0,Math.min(rows-1,Math.floor(targetY/cellSize)));
  if(!walkable[index(tx,ty,cols)]){
    outer: for(let radius=1;radius<6;radius++)for(let oy=-radius;oy<=radius;oy++)for(let ox=-radius;ox<=radius;ox++){
      const x=tx+ox,y=ty+oy;
      if(x>=0&&x<cols&&y>=0&&y<rows&&walkable[index(x,y,cols)]){tx=x;ty=y;break outer;}
    }
  }
  const targetCell=index(tx,ty,cols),queueX=new Int16Array(cols*rows),queueY=new Int16Array(cols*rows);
  let head=0,tail=0;
  if(walkable[targetCell]){queueX[tail]=tx;queueY[tail++]=ty;distances[targetCell]=0;}
  while(head<tail){
    const x=queueX[head],y=queueY[head++],base=distances[index(x,y,cols)];
    for(const [ox,oy] of NEIGHBORS){
      const nx=x+ox,ny=y+oy;
      if(nx<0||ny<0||nx>=cols||ny>=rows)continue;
      const ni=index(nx,ny,cols);
      if(!walkable[ni]||distances[ni]>=0)continue;
      // Prevent diagonal paths from clipping through touching obstacle corners.
      if(ox&&oy&&(!walkable[index(x+ox,y,cols)]||!walkable[index(x,y+oy,cols)]))continue;
      distances[ni]=base+1;queueX[tail]=nx;queueY[tail++]=ny;
    }
  }
  return{cellSize,cols,rows,targetCell,distances,walkable};
}

export function flowDirection(field:FlowField,x:number,y:number){
  const cx=Math.max(0,Math.min(field.cols-1,Math.floor(x/field.cellSize)));
  const cy=Math.max(0,Math.min(field.rows-1,Math.floor(y/field.cellSize)));
  const here=field.distances[index(cx,cy,field.cols)];
  let best=here,bx=cx,by=cy;
  // A valid world point can sit in a grid cell whose centre overlaps a large
  // tree. Recover to the nearest reachable cell rather than abandoning routing.
  if(here<0){
    let bestRadius=Number.POSITIVE_INFINITY;
    for(let radius=1;radius<=8;radius++)for(let oy=-radius;oy<=radius;oy++)for(let ox=-radius;ox<=radius;ox++){
      const nx=cx+ox,ny=cy+oy;
      if(nx<0||ny<0||nx>=field.cols||ny>=field.rows)continue;
      const d=field.distances[index(nx,ny,field.cols)],r=ox*ox+oy*oy;
      if(d>=0&&r<bestRadius){bestRadius=r;best=d;bx=nx;by=ny;}
    }
  }
  for(const [ox,oy] of NEIGHBORS){
    const nx=cx+ox,ny=cy+oy;
    if(nx<0||ny<0||nx>=field.cols||ny>=field.rows)continue;
    const d=field.distances[index(nx,ny,field.cols)];
    if(d>=0&&(best<0||d<best)){best=d;bx=nx;by=ny;}
  }
  const tx=bx*field.cellSize+field.cellSize/2,ty=by*field.cellSize+field.cellSize/2;
  const dx=tx-x,dy=ty-y,length=Math.hypot(dx,dy)||1;
  return{x:dx/length,y:dy/length,distance:here};
}

export function hasLineOfSight(map:StageMap,fromX:number,fromY:number,toX:number,toY:number,radius=14){
  const dx=toX-fromX,dy=toY-fromY,distance=Math.hypot(dx,dy);
  const steps=Math.ceil(distance/24);
  for(let i=1;i<steps;i++)if(collides(map,fromX+dx*i/steps,fromY+dy*i/steps,radius))return false;
  return true;
}
