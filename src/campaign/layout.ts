import {CampaignDefinition,KANTO_CAMPAIGN,visibleCampaignNodes} from './data';
export interface NodePosition {id:string;x:number;y:number;width:number;height:number;}
export interface CampaignLink {from:string;to:string;kind:'main'|'optional';points:[number,number][];d:string;}
export interface CampaignLayoutOptions {startX:number;step:number;spineY:number;height:number;offsets:readonly number[];branchDistance:number;branchSides:Record<string,-1|1>;}
export const KANTO_LAYOUT:CampaignLayoutOptions={startX:170,step:310,spineY:440,height:880,offsets:[-18,18,-8,-24,16,28,-12,8,-24,16,32,-12,-18,20,10,-22,10,-14,-30,12],branchDistance:222,branchSides:{diglettCave:-1,gameCorner:1,powerPlant:-1,fightingDojo:1,seafoam:-1,fossilLab:1,mtEmber:-1,ceruleanGarden:-1,nuggetBridge:1,vermilionHarbor:1}};
export function campaignLayout(campaign:CampaignDefinition=KANTO_CAMPAIGN,options:CampaignLayoutOptions=KANTO_LAYOUT){
  const positions=new Map<string,NodePosition>(),links:CampaignLink[]=[];
  campaign.mainOrder.forEach((id,index)=>positions.set(id,{id,x:options.startX+index*options.step,y:options.spineY+(options.offsets[index%options.offsets.length]??0),width:220,height:136}));
  for(const node of visibleCampaignNodes(campaign).filter(node=>node.route==='optional')){const parent=positions.get(node.parent!)!;positions.set(node.id,{id:node.id,x:parent.x,y:parent.y+(options.branchSides[node.id]??-1)*options.branchDistance,width:184,height:112});}
  for(let index=1;index<campaign.mainOrder.length;index++){
    const from=positions.get(campaign.mainOrder[index-1])!,to=positions.get(campaign.mainOrder[index])!,a:[number,number]=[from.x+from.width/2,from.y],b:[number,number]=[to.x-to.width/2,to.y],mid=(a[0]+b[0])/2,points:[number,number][]=[a,[mid,a[1]],[mid,b[1]],b];links.push({from:from.id,to:to.id,kind:'main',points,d:`M${a.join(',')} C${points[1].join(',')} ${points[2].join(',')} ${b.join(',')}`});
  }
  for(const node of visibleCampaignNodes(campaign).filter(node=>node.route==='optional')){const from=positions.get(node.parent!)!,to=positions.get(node.id)!,sign=Math.sign(to.y-from.y),a:[number,number]=[from.x,from.y+sign*from.height/2],b:[number,number]=[to.x,to.y-sign*to.height/2],mid=(a[1]+b[1])/2,points:[number,number][]=[a,[a[0],mid],[b[0],mid],b];links.push({from:from.id,to:to.id,kind:'optional',points,d:`M${a.join(',')} C${points[1].join(',')} ${points[2].join(',')} ${b.join(',')}`});}
  return{positions,links,width:options.startX+(campaign.mainOrder.length-1)*options.step+230,height:options.height};
}
export type CampaignDirection='left'|'right'|'up'|'down';
export function campaignNeighbour(id:string,direction:CampaignDirection,campaign=KANTO_CAMPAIGN,layout=campaignLayout(campaign)){
  const node=campaign.nodes.find(node=>node.id===id)!;if(!node)return campaign.mainOrder[0];const parent=node.route==='main'?id:node.parent!,index=campaign.mainOrder.indexOf(parent);
  if(direction==='left'||direction==='right')return campaign.mainOrder[Math.max(0,Math.min(campaign.mainOrder.length-1,index+(direction==='right'?1:-1)))];
  const current=layout.positions.get(id)!;if(node.route==='optional'){const home=layout.positions.get(parent)!;return(direction==='up'?home.y<current.y:home.y>current.y)?parent:id;}
  return visibleCampaignNodes(campaign).find(branch=>branch.parent===id&&(direction==='up'?layout.positions.get(branch.id)!.y<current.y:layout.positions.get(branch.id)!.y>current.y))?.id??id;
}
export function cubicPoint(points:[number,number][],t:number){const q=1-t;return{x:q*q*q*points[0][0]+3*q*q*t*points[1][0]+3*q*t*t*points[2][0]+t*t*t*points[3][0],y:q*q*q*points[0][1]+3*q*q*t*points[1][1]+3*q*t*t*points[2][1]+t*t*t*points[3][1]};}
