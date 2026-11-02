export interface BarRect {x:number;y:number;width:number;height:number;}
export interface HudPoint {x:number;y:number;}
export interface GameplayHudLayout {
 experience:BarRect;
 /** Legacy alias used by gameplay tests; the player's actual HP bar follows the sprite. */
 player:BarRect;
 boss:BarRect;
 timer:HudPoint;
 moves:HudPoint;
 items:HudPoint;
 objective:HudPoint;
 research:HudPoint;
 character:HudPoint;
 portrait:HudPoint;
 status:HudPoint;
 infoY:number;
 portraitY:number;
}

/** Logical 1280x720 composition, with safe edges at other sizes. */
export function gameplayHudLayout(width:number,height:number):GameplayHudLayout {
 const margin=Math.max(12,Math.round(width*.0125));
 const experience={x:margin,y:5,width:width-margin*2,height:10};
 const bossWidth=Math.min(620,Math.round(width*.48));
 const portrait={x:width-margin-28,y:69};
 const character={x:portrait.x-44,y:54};
 return {
  experience,player:experience,
  boss:{x:Math.round((width-bossWidth)/2),y:103,width:bossWidth,height:15},
  timer:{x:Math.round(width/2),y:39},
  moves:{x:margin,y:60},
  items:{x:margin+2,y:115},
  objective:{x:width-margin,y:120},
  research:{x:width-margin,y:153},
  character,portrait,
  status:{x:width-margin-330,y:183},
  infoY:character.y,portraitY:portrait.y,
 };
}

export function hpBarColor(ratio:number){return ratio<=.2?0xe34b4b:ratio<=.45?0xf0b64d:0x55c96a;}

export function experienceProgress(level:number,xp:number,nextXp:number){
 if(level>=100)return{ratio:1,label:'LEVEL 100 — MAX LEVEL'};
 return{ratio:Math.max(0,Math.min(1,xp/Math.max(1,nextXp))),label:`LEVEL ${level} — EXP ${Math.floor(xp)} / ${nextXp}`};
}

export function formatSurvivalTimer(time:number){
 const seconds=Math.max(0,Math.floor(time));
 return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
}
