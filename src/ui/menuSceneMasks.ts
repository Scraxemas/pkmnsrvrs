export type Point=readonly [number,number];
export interface SceneRegion {x:number;y:number;width:number;height:number;polygon:readonly Point[];phase?:number;}
// Native coordinates of the supplied 1376 x 768 illustration. These masks keep
// paths, rocks, trunks and pond banks out of the animated texture regions.
export const FOLIAGE_REGIONS:SceneRegion[]=[
  {x:128,y:0,width:390,height:290,phase:0,polygon:[[140,0],[513,0],[518,120],[428,176],[350,266],[195,256],[128,130]]},
  {x:370,y:0,width:490,height:340,phase:.8,polygon:[[370,0],[850,0],[855,158],[783,274],[705,330],[564,272],[492,204],[369,176]]},
  {x:860,y:0,width:440,height:210,phase:1.7,polygon:[[890,0],[1297,0],[1290,125],[1230,192],[1120,140],[1000,115],[870,170]]},
  {x:159,y:300,width:390,height:194,phase:2.5,polygon:[[180,309],[340,304],[445,354],[542,432],[479,492],[320,490],[178,428]]},
];
export const POND_REGION:SceneRegion={x:936,y:442,width:292,height:65,polygon:[[941,467],[969,462],[1028,448],[1110,445],[1163,453],[1217,468],[1211,482],[1160,496],[1086,501],[1010,491],[976,477]]};
export const foliageColor=(r:number,g:number,b:number)=>g>32&&g>r*1.035&&g>b*1.12;
export const waterColor=(r:number,g:number,b:number)=>g>55&&b>r*.92&&g>r*1.025&&b>g*.73;
function inside(x:number,y:number,polygon:readonly Point[]){let value=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])value=!value;}return value;}
/** Erosion protects color boundaries; a feather avoids rectangular patch edges. */
export function sceneMask(data:Uint8ClampedArray,region:SceneRegion,color:(r:number,g:number,b:number)=>boolean){
  const w=region.width,h=region.height,d=new Uint8Array(w*h),alpha=new Uint8ClampedArray(w*h);
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x,p=i*4;d[i]=color(data[p],data[p+1],data[p+2])&&inside(region.x+x,region.y+y,region.polygon)?12:0;}
  for(let y=1;y<h;y++)for(let x=1;x<w;x++){const i=y*w+x;if(d[i])d[i]=Math.min(d[i],d[i-1]+1,d[i-w]+1);}
  for(let y=h-2;y>=0;y--)for(let x=w-2;x>=0;x--){const i=y*w+x;if(d[i])d[i]=Math.min(d[i],d[i+1]+1,d[i+w]+1);}
  for(let i=0;i<d.length;i++)alpha[i]=Math.max(0,Math.min(255,(d[i]-2)*85));return alpha;
}
export function maskCanvas(alpha:Uint8ClampedArray,width:number,height:number){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const g=canvas.getContext('2d')!,pixels=g.createImageData(width,height);for(let i=0;i<alpha.length;i++){const p=i*4;pixels.data[p]=255;pixels.data[p+1]=255;pixels.data[p+2]=255;pixels.data[p+3]=alpha[i];}g.putImageData(pixels,0,0);return canvas;}
