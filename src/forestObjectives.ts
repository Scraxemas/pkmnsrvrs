import type {StageMap} from './worldgen';

/** Short compass cue for the permanent HUD; the full quest text belongs in menus. */
export function forestObjectiveText(map:StageMap,player:{x:number;y:number},bossStarted=false){
 const target=map.landmarks.find(l=>l.id==='beedrill-nest');
 if(!target||bossStarted)return '';
 const dx=target.x-player.x,dy=target.y-player.y,distance=Math.hypot(dx,dy);
 const directions=['E','SE','S','SW','W','NW','N','NE'];
 const bearing=directions[(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8];
 return distance<300?'Nest · NEARBY':`Nest ${bearing} · ${Math.round(distance/32)} tiles`;
}
