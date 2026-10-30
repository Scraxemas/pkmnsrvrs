import {POKEMON,STAGES} from '../content';
import type {SaveData} from '../save';

export const FRONTEND_VERSION='v0.3.7';
export const MENU_ART={background:'assets/menu/viridian-forest-main-menu.jpg',viridian:'assets/menu/viridian-forest-card.png'} as const;
export const menuAsset=(path:string)=>`${import.meta.env.BASE_URL}${path}`;
export const STARTERS=['bulbasaur','charmander','squirtle'] as const;
export interface LocationCardData {
  id:string;title:string;subtitle:string;region:string;chapter:string;artwork?:string;
  unlocked:boolean;completed:boolean;featured:boolean;playable:boolean;
  bossName?:string;milestone?:string;description?:string;symbol:'forest'|'mountain'|'ship';
}
export function locationCards(save:SaveData):LocationCardData[]{
  return [
    {id:'viridian',title:'Viridian Forest',subtitle:'A trail into the unknown',region:'Kanto',chapter:'Chapter I',artwork:MENU_ART.viridian,unlocked:true,completed:(save.research.viridianWins??0)>0,featured:true,playable:true,bossName:'Beedrill',milestone:'First Milestone',description:STAGES.viridian.identity,symbol:'forest'},
    {id:'mtMoon',title:'Mt. Moon',subtitle:'Beyond the forest',region:'Kanto',chapter:'Chapter II',unlocked:save.unlockedStages.includes('mtMoon'),completed:false,featured:false,playable:false,description:'Campaign unlock preserved. This stage is still in development.',symbol:'mountain'},
    {id:'ssAnne',title:'S.S. Anne',subtitle:'A journey across Kanto',region:'Kanto',chapter:'Chapter III',unlocked:save.unlockedStages.includes('ssAnne'),completed:false,featured:false,playable:false,description:'A future Kanto destination. Gameplay and artwork are not available yet.',symbol:'ship'},
  ];
}
export function menuProfile(save:SaveData){
  const starters=STARTERS.filter(id=>save.unlockedPokemon.includes(id)).length,best=save.best.viridian;
  return{starters,totalStarters:STARTERS.length,clears:save.research.viridianWins??0,
    best:best?`LV ${best.level} · ${best.defeated} KO`:'Your first run awaits',
    lastStarter:save.lastRun?(POKEMON[save.lastRun.pokemon]?.name??''):'',
  };
}
