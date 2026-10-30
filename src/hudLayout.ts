export interface BarRect {x:number;y:number;width:number;height:number;}
export interface GameplayHudLayout {experience:BarRect;player:BarRect;boss:BarRect;infoY:number;portraitY:number;}

export function gameplayHudLayout(width:number,height:number):GameplayHudLayout {
  const margin=Math.max(12,Math.round(width*.03));
  const player={x:margin,y:12,width:width-margin*2,height:32};
  const bossWidth=Math.round(width*.7);
  return{experience:player,player,boss:{x:Math.round((width-bossWidth)/2),y:51,width:bossWidth,height:18},infoY:78,portraitY:102};
}

export function hpBarColor(ratio:number){return ratio<=.2?0xe34b4b:ratio<=.45?0xf0b64d:0x55c96a;}

export function experienceProgress(level:number,xp:number,nextXp:number){
  if(level>=100)return{ratio:1,label:'LEVEL 100 — MAX LEVEL'};
  return{ratio:Math.max(0,Math.min(1,xp/Math.max(1,nextXp))),label:`LEVEL ${level} — EXP ${Math.floor(xp)} / ${nextXp}`};
}
