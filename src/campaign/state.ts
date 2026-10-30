import type {SaveData} from '../save';
import {CampaignDefinition,CampaignNode,CampaignRequirement,KANTO_CAMPAIGN,campaignNode} from './data';

export function stageCompleted(save:SaveData,id:string){return(save.completedStages??[]).includes(id)||(save.lastRun?.result==='victory'&&save.lastRun.stage===id)||(id==='viridian'&&(save.research.viridianWins??0)>0);}
export function requirementMet(save:SaveData,requirement:CampaignRequirement){return requirement.kind==='clear'?stageCompleted(save,requirement.stage):(save.discoveredLocations??[]).includes(requirement.location);}
export function requirementText(requirement:CampaignRequirement,campaign=KANTO_CAMPAIGN){return requirement.kind==='clear'?`Clear ${campaignNode(requirement.stage,campaign)?.name??requirement.stage}`:`Discover ${campaign.secrets.find(location=>location.id===requirement.location)?.name??requirement.location}`;}
export function resolveCampaignNode(node:CampaignNode,save:SaveData,campaign:CampaignDefinition=KANTO_CAMPAIGN){
  const completed=stageCompleted(save,node.id),requirementsMet=node.requires.every(rule=>requirementMet(save,rule)),savedUnlock=save.unlockedStages.includes(node.id),unlocked=completed||requirementsMet||savedUnlock;
  const implemented=node.implementation==='ready',launchable=implemented&&unlocked,secrets=campaign.secrets.filter(secret=>secret.parent===node.id),found=secrets.filter(secret=>(save.discoveredLocations??[]).includes(secret.id)).length;
  return{completed,unlocked,requirementsMet,savedUnlock,implemented,launchable,secrets:secrets.length,found,
    status:implemented?(completed?'Completed':'Available'):node.implementation==='development'?'In Development':'Coming Soon',
    requirement:node.requires.map(rule=>requirementText(rule,campaign)).join(' · ')||'Your Kanto journey begins here.',
    state:completed?'completed':launchable?'available':unlocked?'future-ready':'locked',
  };
}
export function currentCampaignStage(save:SaveData,campaign=KANTO_CAMPAIGN){return campaign.mainOrder.find(id=>{const node=campaignNode(id,campaign)!;return resolveCampaignNode(node,save,campaign).launchable&&!stageCompleted(save,id);})??campaign.mainOrder.find(id=>resolveCampaignNode(campaignNode(id,campaign)!,save,campaign).launchable)??campaign.mainOrder[0];}
