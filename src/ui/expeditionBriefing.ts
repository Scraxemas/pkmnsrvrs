import type {SaveData} from '../save';
import {formatRunTime} from './menuData';

export interface ExpeditionBriefing {
 status:string;best:string;clears:string;discoveries:string;lastResult:string;
}
export function expeditionBriefing(save:SaveData):ExpeditionBriefing{
 const best=save.best.viridian;
 const wins=save.research.viridianWins??0;
 const found=(save.discoveredLocations??[]).filter(id=>id.startsWith('viridian:')&&id!=='viridian:entrance').length;
 const last=save.lastRun;
 return{
  status:wins>0?'FOREST CONQUERED':'EXPEDITION AVAILABLE',
  best:best?`${formatRunTime(best.time)} · LV ${best.level}`:'NO RUN YET',
  clears:String(wins).padStart(2,'0'),
  discoveries:String(found).padStart(2,'0'),
  lastResult:last&&last.stage==='viridian'?`${last.result==='victory'?'VICTORY':'DEFEAT'} · ${formatRunTime(last.time)}`:'BEGIN YOUR FIRST RUN'
 };
}
