import {CampaignDefinition,KANTO_CAMPAIGN,campaignNode,visibleCampaignNodes} from '../campaign/data';
import {CampaignDirection,CampaignLayoutOptions,KANTO_LAYOUT,campaignLayout,campaignNeighbour} from '../campaign/layout';
import {currentCampaignStage,resolveCampaignNode,stageCompleted} from '../campaign/state';
import type {SaveData} from '../save';
import {motionReduced} from '../preferences';
import {actionButton,element} from './dom';
import {campaignNodeButton} from './campaignNode';
import {renderCampaignDetail} from './campaignDetail';
import {campaignPaths,campaignScenery} from './campaignPaths';
import {CampaignViewport} from './campaignViewport';
import './campaign.css';

export class CampaignView {
  readonly viewport:HTMLElement;readonly world:HTMLElement;readonly detail:HTMLElement;readonly camera:CampaignViewport;
  readonly layout;readonly buttons=new Map<string,HTMLButtonElement>();selected:string;
  private abort=new AbortController();private journey:HTMLElement;private east:HTMLElement;private live:HTMLElement;
  constructor(private root:HTMLElement,content:HTMLElement,readonly save:SaveData,private onLaunch:(id:string)=>void,readonly campaign:CampaignDefinition=KANTO_CAMPAIGN,layoutOptions:CampaignLayoutOptions=KANTO_LAYOUT){
    this.layout=campaignLayout(campaign,layoutOptions);this.selected=currentCampaignStage(save,campaign);
    const workbench=element('div','campaign-workbench'),atlas=element('section','campaign-atlas');atlas.setAttribute('aria-label',`${campaign.name} adventure map`);
    const toolbar=element('div','campaign-toolbar'),title=element('div','campaign-map-title');title.append(element('span','campaign-map-kicker','ADVENTURE ATLAS'),element('h2','',`${campaign.name} · ${campaign.trailName??'Adventure trail'}`));
    const center=actionButton('Center on current stage',()=>this.select(currentCampaignStage(save,campaign),true),'campaign-center','forest');toolbar.append(title,center);
    const frame=element('div','campaign-map-frame');this.viewport=element('div','campaign-viewport');this.viewport.setAttribute('aria-label','Drag to explore Kanto. Scroll to travel right. Shift-scroll to move vertically.');this.viewport.setAttribute('role','region');
    this.world=element('div','campaign-world');this.world.style.width=`${this.layout.width}px`;this.world.style.height=`${this.layout.height}px`;this.world.append(campaignScenery(this.layout,campaign),campaignPaths(this.layout.links,save,this.layout.width,this.layout.height));
    for(const node of visibleCampaignNodes(campaign)){
      const position=this.layout.positions.get(node.id)!,state=resolveCampaignNode(node,save,campaign),button=campaignNodeButton(node,state,position,campaign.mainOrder.indexOf(node.id)+1,confirm=>{
        if(confirm&&this.selected===node.id&&state.launchable)this.launchSelected();else this.select(node.id,true);
      });
      button.addEventListener('focus',()=>{if(this.selected!==node.id)this.select(node.id,false);if(!this.camera.visible(position))this.camera.focus(this.focusPosition(node.id));},{signal:this.abort.signal});this.buttons.set(node.id,button);this.world.append(button);
    }
    const beginning=element('div','campaign-beginning','YOUR JOURNEY');beginning.style.left='18px';beginning.style.top='328px';this.world.append(beginning);
    this.viewport.append(this.world);const compass=element('div','campaign-compass','N\n✦');compass.setAttribute('aria-hidden','true');frame.append(this.viewport,compass);
    const mapFooter=element('div','campaign-map-footer'),legend=element('div','campaign-legend');for(const [style,label] of [['available','Playable'],['completed','Cleared'],['optional','Side trail'],['future','Future']] as const){const entry=element('span',`campaign-legend__${style}`,label);legend.append(entry);}this.east=element('span','campaign-east','MORE OF KANTO →');mapFooter.append(legend,this.east);
    atlas.append(toolbar,frame,mapFooter);this.detail=element('aside','campaign-detail');workbench.append(atlas,this.detail);content.append(workbench);
    this.journey=element('span','campaign-journey-count',`${campaign.mainOrder.filter(id=>stageCompleted(save,id)).length} / ${campaign.mainOrder.length} milestones cleared`);toolbar.append(this.journey);
    this.live=element('div','campaign-live');this.live.setAttribute('role','status');this.live.setAttribute('aria-live','polite');content.append(this.live);
    this.camera=new CampaignViewport(this.viewport,this.layout,()=>motionReduced(save.settings),()=>this.updateCameraHint(),()=>{if(this.root.isConnected)this.camera.focus(this.focusPosition(this.selected),false);});
    this.select(this.selected,false);this.camera.focus(this.focusPosition(this.selected),false);
  }
  selectedButton(){return this.buttons.get(this.selected);}
  select(id:string,focus=false){
    const node=campaignNode(id,this.campaign);if(!node||!this.buttons.has(id))return;
    this.selected=id;for(const [key,button] of this.buttons){const selected=key===id;button.classList.toggle('is-selected',selected);button.setAttribute('aria-pressed',String(selected));button.tabIndex=selected?0:-1;}
    const state=resolveCampaignNode(node,this.save,this.campaign);renderCampaignDetail(this.detail,node,state,this.save,this.campaign,()=>this.launchSelected());this.live.textContent=`${node.name}. ${state.status}. ${state.launchable?'Ready to enter.':'Preview only.'}`;
    if(focus)this.buttons.get(id)!.focus({preventScroll:true});this.camera?.focus(this.focusPosition(id),focus);this.updateCameraHint();
  }
  move(direction:CampaignDirection){const next=campaignNeighbour(this.selected,direction,this.campaign,this.layout);this.select(next,true);return true;}
  launchSelected(){const node=campaignNode(this.selected,this.campaign)!;if(resolveCampaignNode(node,this.save,this.campaign).launchable)this.onLaunch(node.id);}
  private focusPosition(id:string){
    const node=campaignNode(id,this.campaign)!,position=this.layout.positions.get(id)!,related=node.parent?this.layout.positions.get(node.parent):[...this.layout.positions.values()].find(p=>campaignNode(p.id,this.campaign)?.parent===id);
    if(!related)return position;const top=Math.min(position.y-position.height/2,related.y-related.height/2),bottom=Math.max(position.y+position.height/2,related.y+related.height/2);
    return bottom-top<=this.viewport.clientHeight-24?{...position,y:(top+bottom)/2,height:bottom-top}:position;
  }
  private updateCameraHint(){if(!this.east)return;const remaining=this.layout.width-this.viewport.clientWidth-this.viewport.scrollLeft,next=campaignNode(this.campaign.mainOrder[this.campaign.mainOrder.length-1],this.campaign)?.nextRegion;this.east.textContent=remaining<40?(next?`BEYOND ${this.campaign.name.toUpperCase()} · ${next.toUpperCase()} AWAITS`:`${this.campaign.name.toUpperCase()} · JOURNEY’S END`):`MORE OF ${this.campaign.name.toUpperCase()} →`;this.viewport.dataset.cameraX=String(Math.round(this.viewport.scrollLeft));this.viewport.dataset.cameraY=String(Math.round(this.viewport.scrollTop));}
  destroy(){this.abort.abort();this.camera.destroy();this.buttons.clear();}
}
