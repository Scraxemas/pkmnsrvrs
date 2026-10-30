import type {CampaignArt,CampaignNode} from '../campaign/data';
import {element} from './dom';
import {menuAsset} from './menuData';

const rect=(x:number,y:number,w:number,h:number,c:string)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
const poly=(points:string,c:string)=>`<polygon points="${points}" fill="${c}"/>`;
const tree=(x:number,y:number,color='#477851')=>rect(x+8,y+22,5,12,'#584b35')+poly(`${x+10},${y} ${x},${y+16} ${x+4},${y+16} ${x-3},${y+27} ${x+24},${y+27} ${x+17},${y+16} ${x+21},${y+16}`,color)+rect(x+6,y+9,6,3,'#83a277');
const gymRoofs:Partial<Record<CampaignArt,string>>={stoneGym:'#a49669',waterGym:'#5d99ac',electricGym:'#c2ab5d',grassGym:'#64865a',poisonGym:'#94738e',psychicGym:'#ae8095',fireGym:'#b16e52',groundGym:'#a18a5b'};
/** Original code-authored preview art. No future stage claims finished production artwork. */
export function campaignArtSvg(art:CampaignArt){
  const water=['ship','islands','harbor','waterGym','cave'].includes(art),sky=art==='moon'?'#283e48':art==='tower'?'#3f4754':'#92aaa0',ground=water?'#588b8a':'#6b8d65';
  let s=rect(0,0,240,96,sky)+rect(0,34,240,62,ground)+rect(0,33,240,3,'#afbaa0');
  if(water){for(let y=42;y<96;y+=12)for(let x=10+(y%24);x<240;x+=48)s+=rect(x,y,22,2,'#86b0a1');}else{s+=poly('0,74 86,67 148,74 240,66 240,96 0,96','#7c986a');for(let x=8;x<240;x+=29)s+=rect(x,85-(x%3)*4,3,2,'#b4bd85');}
  if(gymRoofs[art]){
    const roof=gymRoofs[art]!;s+=rect(62,42,119,42,'#b5b49a')+rect(58,39,127,8,'#5b6557')+poly('52,40 73,16 168,16 190,40',roof)+rect(76,19,89,4,'#d5c79a')+rect(108,61,28,23,'#384b43')+rect(82,53,14,13,'#c6d3aa')+rect(148,53,14,13,'#c6d3aa')+rect(72,80,101,4,'#8c9279')+rect(115,50,14,5,'#e0c777');
    s+=tree(22,48,'#527653')+tree(200,44,'#527653');if(art==='grassGym')s+=tree(63,48)+tree(167,46);
  }else if(['moon','tunnel','cave','burrow','victory','volcano'].includes(art)){
    const lava=art==='volcano',rock=art==='moon'?'#78878a':art==='cave'?'#687e87':lava?'#756456':'#8d8c73';
    s+=poly('0,80 0,55 43,16 64,42 91,8 124,48 168,18 199,43 224,28 240,50 240,85',rock)+poly('60,81 78,39 103,34 143,54 174,41 190,83','#9da58b')+rect(99,62,44,25,'#344b45')+rect(105,55,32,12,'#344b45')+rect(111,64,20,23,'#203b39')+rect(88,85,65,4,'#b2b49a');
    if(art==='moon')s+=rect(25,10,10,10,'#e0d7ae')+rect(30,7,10,10,sky);if(lava)s+=poly('80,38 91,8 103,38 96,32 91,26 87,35','#d3935a')+rect(93,56,6,23,'#c28a59');
  }else if(art==='ship'||art==='harbor'){
    s+=poly('44,65 198,65 178,84 64,84','#5d574b')+rect(64,54,116,13,'#d2c6a1')+rect(85,38,74,18,'#e1d2aa')+rect(103,25,11,14,'#8c6650')+rect(133,24,10,15,'#8c6650');for(let x=72;x<176;x+=16)s+=rect(x,59,7,4,'#547c7d');s+=rect(30,82,181,4,'#acb69a');
  }else if(art==='islands'){
    s+=poly('12,76 39,36 58,44 78,17 112,77','#a7b5a7')+poly('135,79 163,25 188,41 210,18 238,78','#b9c7ba')+poly('39,36 31,47 46,44 58,52 77,17 91,42 74,35 62,43','#e2e1c7')+rect(58,65,27,17,'#3c666c')+rect(172,63,30,18,'#416970');
  }else if(['tower','office','league','mansion','power','rocket','arcade','dojo','lab'].includes(art)){
    const tower=art==='tower'||art==='office',h=tower?66:art==='league'?56:42,y=84-h,wall=art==='rocket'?'#8c8b78':art==='mansion'?'#93937c':'#adb29a';
    s+=rect(74,y,94,h,wall)+rect(69,y-7,104,10,art==='dojo'?'#956e55':art==='arcade'?'#ab8f64':'#657b71')+rect(112,65,20,19,'#3e5950');
    for(let row=y+9;row<60;row+=17)for(let x=85;x<158;x+=24)s+=rect(x,row,10,8,art==='power'?'#c5b67a':'#658d86');
    if(art==='league')s+=rect(91,17,61,5,'#d1bd85')+poly('77,29 121,4 168,29','#809387');if(art==='mansion')s+=poly('65,42 120,8 177,42','#69786c')+rect(109,24,24,16,'#435d52');
    if(art==='rocket')s+=rect(114,37,15,17,'#a76c59');if(art==='power')s+=rect(40,31,18,52,'#8e9581')+rect(181,22,17,62,'#8e9581')+rect(45,24,8,12,'#b2b8a0');
    s+=tree(27,47,'#4f7254')+tree(195,47,'#4f7254');
  }else if(art==='bridge')s+=rect(0,48,240,35,'#668d89')+rect(36,55,166,9,'#b4a178')+rect(40,47,5,29,'#85795a')+rect(193,47,5,29,'#85795a');
  else{for(const [x,y] of [[9,38],[36,27],[63,44],[165,40],[194,25],[219,43]])s+=tree(x,y);s+=poly('81,96 99,45 132,45 155,96','#b7ad7b');if(art==='safari')s+=rect(104,24,31,24,'#a79d70')+poly('96,27 120,11 143,27','#817658');}
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 240 96');svg.setAttribute('shape-rendering','crispEdges');svg.setAttribute('aria-hidden','true');svg.innerHTML=s;svg.classList.add('campaign-illustration');return svg;
}
export function campaignArtwork(node:CampaignNode,{lazy=false}:{lazy?:boolean}={}){
  const art=element('div','campaign-art');
  if(node.artwork){const image=element('img');image.loading=lazy?'lazy':'eager';image.decoding='async';image.src=menuAsset(node.artwork);image.alt=`${node.name} location artwork`;image.draggable=false;art.append(image);}
  else{const svg=campaignArtSvg(node.art);svg.setAttribute('role','img');svg.setAttribute('aria-label',`${node.name} · unfinished preview illustration`);svg.removeAttribute('aria-hidden');art.append(svg);}
  return art;
}
