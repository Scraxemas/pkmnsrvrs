import type {StageMap} from './worldgen';

export function forestObjectiveText(map:StageMap,player:{x:number;y:number},bossStarted=false){
  const target=map.landmarks.find(l=>l.id==='beedrill-nest');if(!target)return '';
  if(bossStarted)return 'BEEDRILL NEST · Defeat Beedrill to open the route to Pewter';
  const dx=target.x-player.x,dy=target.y-player.y,distance=Math.hypot(dx,dy);
  const directions=['E','SE','S','SW','W','NW','N','NE'];
  const bearing=directions[(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8];
  return `Beedrill Nest ${distance<300?'nearby':`${bearing} · ${Math.round(distance/32)} tiles`} · Timed finale at the nest`;
}
