import {CampaignDefinition} from '../campaign/data';
import {CampaignLink,NodePosition} from '../campaign/layout';
import {stageCompleted} from '../campaign/state';
import type {SaveData} from '../save';
import {environmentUrl,ENVIRONMENT_ASSETS} from '../environmentAssets';
const NS='http://www.w3.org/2000/svg';
const svgElement=(tag:string,attributes:Record<string,string>)=>{const e=document.createElementNS(NS,tag);for(const [key,value] of Object.entries(attributes))e.setAttribute(key,value);return e;};
export function campaignPaths(links:CampaignLink[],save:SaveData,width:number,height:number){
  const svg=svgElement('svg',{viewBox:`0 0 ${width} ${height}`,width:String(width),height:String(height),'aria-hidden':'true',class:'campaign-paths'});
  for(const link of links){const complete=stageCompleted(save,link.from),g=svgElement('g',{'data-from':link.from,'data-to':link.to,'data-route':link.kind,'data-completed':String(complete),class:`campaign-link campaign-link--${link.kind}${complete?' is-complete':''}`});g.append(svgElement('path',{d:link.d,class:'campaign-link__edge'}),svgElement('path',{d:link.d,class:'campaign-link__trail'}));svg.append(g);}return svg;
}
/** A composed, deterministic atlas backdrop using complete existing FRLG tree/rock props. */
export function campaignScenery(layout:{width:number;height:number;positions:Map<string,NodePosition>},campaign:CampaignDefinition){
  const {width,height,positions}=layout,svg=svgElement('svg',{viewBox:`0 0 ${width} ${height}`,width:String(width),height:String(height),'aria-hidden':'true',class:'campaign-scenery'});
  svg.append(svgElement('path',{d:`M0 90 H${width} V250 L${width-280} 220 400 250 0 200Z`,fill:'#244b39'}));
  for(let section=0;section<Math.ceil(width/1280);section++){
    const start=section*1280;
    svg.append(svgElement('path',{d:`M${start} 660 l180 -44 110 38 170 -24 250 85 300 -18 200 70 v113 H${start}Z`,fill:section%2?'#385640':'#34593f'}));
    for(let group=0;group<7;group++)for(let tree=0;tree<4;tree++){
      const x=start+32+group*174+(tree%2)*24,y=[94,590,292,748,94,590,748][group]+Math.floor(tree/2)*20;
      if([...positions.values()].some(p=>Math.abs(p.x-x-24)<p.width/2+26&&Math.abs(p.y-y-28)<p.height/2+34))continue;
      svg.append(svgElement('image',{href:environmentUrl(ENVIRONMENT_ASSETS.treeLight),x:String(x),y:String(y),width:'48',height:'64',preserveAspectRatio:'xMidYMax meet',opacity:'.82'}));
    }
  }
  for(const x of [1110,2850,4680]){
    svg.append(svgElement('path',{d:`M${x} 0 h120 l-40 150 50 60 -40 90 -75 50 30 180 -60 90 30 210 h-100 l-10 -240 55 -100 -18 -170 70 -90 40 -80 -45 -80Z`,fill:'#527e79',stroke:'#7a987c','stroke-width':'8'}));
    for(let y=80;y<height;y+=88)svg.append(svgElement('path',{d:`M${x-20} ${y} h32 m20 5 h18`,stroke:'#8daf96','stroke-width':'2',opacity:'.55'}));
  }
  const labels=campaign.regionLabels??[campaign.name.toUpperCase()];for(const [index,label] of labels.entries()){
    const text=svgElement('text',{x:String(160+index*(width/labels.length)),y:'300',class:'campaign-region-label'});text.textContent=label;svg.append(text);
  }
  for(const node of campaign.nodes.filter(node=>['moon','tunnel','victory'].includes(node.art))){const p=positions.get(node.id);if(p)svg.append(svgElement('path',{d:`M${p.x-78} 120 l35 -52 20 25 24 -46 47 73Z`,fill:'#627860',stroke:'#8b9675','stroke-width':'3'}));}
  return svg;
}
