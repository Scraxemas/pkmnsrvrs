type Pixel=[number,number,number,number,string];
const outline='#122934',cream='#f9e9b4',light='#fff4d0',gold='#e6bb61';
/** Original 24px pixel icons. Replace individual definitions with sprite assets later. */
export function pixelIcon(name:'play'|'pokedex'|'research'|'settings'|'single'|'multi'|'back'){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('shape-rendering','crispEdges');svg.classList.add('pixel-icon');let pixels:Pixel[]=[];
  if(name==='play')pixels=[[6,2,12,2,outline],[3,4,18,3,outline],[2,7,20,10,outline],[3,17,18,3,outline],[6,20,12,2,outline],[6,4,12,2,'#f07958'],[4,6,16,5,'#dc5449'],[4,13,16,5,cream],[6,18,12,2,cream],[3,10,18,4,outline],[9,8,6,8,outline],[8,9,8,6,outline],[10,10,4,4,light],[6,6,4,2,'#ffd4a1']];
  if(name==='pokedex')pixels=[[3,2,18,20,outline],[5,3,14,18,'#a73243'],[5,3,13,2,'#f18678'],[5,5,14,14,'#d85058'],[6,5,5,4,outline],[7,5,3,3,'#8ce0e3'],[13,5,2,2,gold],[16,5,2,2,'#8ebc72'],[7,10,10,7,outline],[8,11,8,5,'#b8e2c7'],[8,18,5,2,outline],[15,18,3,2,cream]];
  if(name==='research')pixels=[[2,3,14,18,outline],[4,4,11,15,'#ad8d58'],[5,4,9,3,cream],[6,9,7,1,'#604d3e'],[6,12,5,1,'#604d3e'],[12,10,8,2,outline],[10,12,12,6,outline],[12,18,8,2,outline],[12,12,8,5,'#69a8b1'],[14,12,3,2,'#cff1dc'],[18,19,3,4,outline],[19,20,2,3,gold]];
  if(name==='settings')pixels=[[9,1,6,22,outline],[1,9,22,6,outline],[4,4,16,16,outline],[9,3,6,18,'#9eb2bc'],[3,9,18,6,'#9eb2bc'],[6,6,12,12,'#9eb2bc'],[7,5,10,2,cream],[7,8,10,8,outline],[8,7,8,10,outline],[10,9,4,6,'#52747e'],[9,10,6,4,'#52747e']];
  const person=(x:number,y:number,color:string):Pixel[]=>[[x+2,y,6,2,outline],[x+1,y+2,8,6,outline],[x+2,y+2,6,4,color],[x+3,y+8,4,2,outline],[x,y+10,10,6,outline],[x+2,y+10,6,4,color]];
  if(name==='single')pixels=person(7,3,cream);
  if(name==='multi')pixels=[...person(0,1,'#9cbea4'),...person(13,1,'#9cbea4'),...person(7,6,cream)];
  if(name==='back')pixels=[[8,5,3,3,cream],[5,8,6,3,cream],[2,11,18,3,cream],[5,14,6,3,cream],[8,17,3,3,cream]];
  for(const [x,y,width,height,color] of pixels){const rect=document.createElementNS(svg.namespaceURI,'rect');for(const [key,value] of Object.entries({x,y,width,height,fill:color}))rect.setAttribute(key,String(value));svg.append(rect);}return svg;
}
