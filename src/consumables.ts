import type {SimState} from './simulation';
import {restoreHp} from './itemCombat';
export interface ConsumableDef {id:string;name:string;art:string;effect:'heal'|'restore'|'cure'|'level';amount?:number;fraction?:number;weight:number;}
export const CONSUMABLES:Record<string,ConsumableDef>=Object.fromEntries([
 {id:'potion',name:'Potion',effect:'heal',amount:20,weight:8},
 {id:'superPotion',name:'Super Potion',effect:'heal',amount:50,weight:3},
 {id:'hyperPotion',name:'Hyper Potion',effect:'heal',amount:100,weight:1},
 {id:'fullRestore',name:'Full Restore',effect:'restore',fraction:1,weight:1},
 {id:'oranBerry',name:'Oran Berry',effect:'heal',amount:10,weight:6},
 {id:'sitrusBerry',name:'Sitrus Berry',effect:'heal',fraction:.25,weight:2},
 {id:'lumBerry',name:'Lum Berry',effect:'cure',weight:2},
 {id:'rareCandy',name:'Rare Candy',effect:'level',weight:.5},
].map(item=>[item.id,{...item,art:`consumable:${item.id}`}])) as Record<string,ConsumableDef>;
export function useConsumable(state:SimState,id:string){
  const item=CONSUMABLES[id];if(!item||state.hp<=0)return false;
  if(item.effect==='level'){if(state.level>=100)return false;state.xp+=state.nextXp;state.totalExp+=state.nextXp;return true;}
  if(item.effect==='cure'){if(!state.playerStatuses.length)return false;state.playerStatuses=[];return true;}
  if(state.hp>=state.maxHp&&!(item.effect==='restore'&&state.playerStatuses.length))return false;
  restoreHp(state,(item.amount??0)+state.maxHp*(item.fraction??0),id);if(item.effect==='restore')state.playerStatuses=[];return true;
}
