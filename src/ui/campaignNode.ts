import {CampaignNode,CAMPAIGN_KIND_LABELS} from '../campaign/data';
import type {NodePosition} from '../campaign/layout';
import type {resolveCampaignNode} from '../campaign/state';
import {campaignArtwork} from './campaignArt';
import {element,icon} from './dom';
export type CampaignNodeState=ReturnType<typeof resolveCampaignNode>;
export function badgeSymbol(node:CampaignNode,completed:boolean){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.classList.add('campaign-badge');svg.innerHTML=`<path d="M12 1 17 5 22 7 20 13 20 19 14 21 10 23 6 19 1 16 4 10 5 4Z" fill="${completed?'#e5c477':'#4d5540'}" stroke="#ceb67a" stroke-width="2"/><path d="M8 12 11 15 17 8" fill="none" stroke="${completed?'#284530':'#999c77'}" stroke-width="2"/>`;svg.setAttribute('data-badge',node.badge??'Gym');return svg;
}
export function campaignNodeButton(node:CampaignNode,state:CampaignNodeState,position:NodePosition,chapter:number,onSelect:(confirm:boolean)=>void){
  const button=element('button',`campaign-node campaign-node--${node.route}${node.kind==='gym'?' campaign-node--gym':''}`);button.type='button';button.dataset.nav='';button.dataset.stageId=node.id;button.dataset.route=node.route;button.dataset.unlocked=String(state.unlocked);button.dataset.completed=String(state.completed);button.dataset.launchable=String(state.launchable);button.dataset.state=state.state;button.dataset.parent=node.parent??'';button.setAttribute('aria-label',node.name);button.setAttribute('aria-pressed','false');
  button.style.left=`${position.x-position.width/2}px`;button.style.top=`${position.y-position.height/2}px`;button.style.width=`${position.width}px`;button.style.height=`${position.height}px`;
  const art=campaignArtwork(node,{lazy:true}),kind=element('span','campaign-node__kind',node.route==='optional'?'SIDE TRAIL':node.kind==='gym'?'GYM RUSH':`STOP ${String(chapter).padStart(2,'0')}`),mark=element('span','campaign-node__mark');mark.append(node.kind==='gym'?badgeSymbol(node,state.completed):icon(state.completed?'check':state.launchable?'play':'lock'));if(node.badge)mark.title=`${node.badge}${state.completed?' · Recorded':' · Not earned'}`;if(node.kind==='gym'&&!state.unlocked){const lock=element('span','campaign-node__gym-lock');lock.append(icon('lock'));mark.append(lock);}art.append(kind,mark);
  if(node.kind==='gym')art.append(element('span','campaign-node__leader',node.boss));
  const caption=element('span','campaign-node__caption');caption.append(element('strong','',node.name),element('span','campaign-node__status',state.completed?(state.implemented?'CLEARED':'CLEARED · PREVIEW'):state.launchable?'AVAILABLE':state.status==='In Development'?'IN DEVELOPMENT':'COMING SOON'));
  if(state.secrets){const secret=element('span','campaign-node__secret',`${state.found}/${state.secrets}`);secret.title=`${state.found}/${state.secrets} Secrets Found`;secret.prepend(icon('mountain'));art.append(secret);}
  button.append(art,caption);button.addEventListener('click',event=>onSelect(event.detail===0));return button;
}
