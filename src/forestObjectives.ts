import type {StageMap} from './worldgen';
/** Only nearby optional discoveries are hinted at; no forced route or boss destination. */
export function forestObjectiveText(map:StageMap,player:{x:number;y:number},bossStarted=false){
 if(bossStarted)return '';
 const nearby=map.landmarks.filter(l=>l.id!=='entrance'&&l.id!=='clearing').map(l=>({...l,d:Math.hypot(l.x-player.x,l.y-player.y)})).sort((a,b)=>a.d-b.d)[0];
 if(!nearby||nearby.d>380)return '';
 return nearby.d<nearby.radius+60?'DISCOVERY NEARBY':`POINT OF INTEREST · ${Math.round(nearby.d/32)} tiles`;
}
