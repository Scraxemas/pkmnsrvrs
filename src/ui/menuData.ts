import {POKEMON} from '../content';
import type {SaveData} from '../save';

export const FRONTEND_VERSION='v0.4.2';
export const PLAY_MODES={single:{available:true,maxPlayers:1},multiplayer:{available:false,targetMaxPlayers:4}} as const;
export const MENU_ART={background:'assets/menu/viridian-forest-main-menu.jpg',viridian:'assets/menu/viridian-forest-card.png',logo:'assets/menu/pokemon-survivors-logo.png'} as const;
export const menuAsset=(path:string)=>`${import.meta.env.BASE_URL}${path}`;
export const STARTERS=['bulbasaur','charmander','squirtle'] as const;
export function menuProfile(save:SaveData){
  const starters=STARTERS.filter(id=>save.unlockedPokemon.includes(id)).length,best=save.best.viridian;
  return{starters,totalStarters:STARTERS.length,clears:save.research.viridianWins??0,
    best:best?`LV ${best.level} · ${best.defeated} KO`:'Your first run awaits',
    lastStarter:save.lastRun?(POKEMON[save.lastRun.pokemon]?.name??''):'',
  };
}

export function researchStatistics(save:SaveData){
  const r=save.research,best=save.best.viridian;
  return{totals:[['Pokémon defeated',r.enemiesDefeated??0],['Viridian Forest clears',r.viridianWins??0],['Poké Balls collected',r.pokeBalls??0],['Evolutions',r.evolutions??0]] as const,best:best?{level:best.level,defeated:best.defeated,time:formatRunTime(best.time)}:undefined,lastRun:save.lastRun?{...save.lastRun,pokemon:POKEMON[save.lastRun.pokemon]?.name??save.lastRun.pokemon,timeLabel:formatRunTime(save.lastRun.time)}:undefined};
}
export const formatRunTime=(time:number)=>`${Math.floor(time/60)}:${String(Math.floor(time%60)).padStart(2,'0')}`;
