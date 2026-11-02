import {TM_RESEARCH_REWARDS,tmLabel} from './data/moveUnlocks';

export interface FieldResearchProgress {label:string;tm:string;current:number;target:number;complete:boolean;}
/** Total persistent + uncommitted defeats; rewards are monotonic across runs. */
export function forestResearchProgress(research:Readonly<Record<string,number>>,session:Readonly<Record<string,number>>,discoveredTms:readonly string[]):FieldResearchProgress[]{
 return TM_RESEARCH_REWARDS.map(reward=>{
  const current=Math.max(0,(research[reward.research]??0)+(session[reward.research]??0));
  return{label:reward.label,tm:reward.tm,current:Math.min(current,reward.count),target:reward.count,complete:discoveredTms.includes(reward.tm)};
 });
}
/** Keep the HUD readable, with only the nearest attainable unfinished discoveries shown. */
export function forestResearchHud(research:Readonly<Record<string,number>>,session:Readonly<Record<string,number>>,discoveredTms:readonly string[],limit=2){
 const remaining=forestResearchProgress(research,session,discoveredTms).filter(progress=>!progress.complete);
 if(!remaining.length)return 'FIELD RESEARCH COMPLETE';
 return remaining.sort((a,b)=>(b.current/b.target)-(a.current/a.target)).slice(0,limit)
  .map(progress=>`${progress.label} ${progress.current}/${progress.target} → ${tmLabel(progress.tm)}`).join('  ·  ');
}
