import type {Pickup,SimState} from './simulation';
import type {ItemModifiers} from './items';
import {CONSUMABLES,useConsumable} from './consumables';
import {seededRoll} from './random';
export interface CollectedPickup {id:number;x:number;y:number;kind:Pickup['kind'];baseValue:number;awardedExp:number;consumableId?:string;tier?:1|2|3;}
export const XP_COLLECTION_RADIUS=18;
/** Only stationary EXP drops merge; balls, consumables and in-flight candies retain identity. */
export function dropExperience(state:SimState,x:number,y:number,value:number){
  const nearby=state.pickups.find(p=>p.kind==='xp'&&!p.attracted&&Math.hypot(p.x-x,p.y-y)<18);
  if(nearby){nearby.value+=value;return nearby;}
  const pickup:Pickup={id:++state.eventId,x,y,value,kind:'xp'};state.pickups.push(pickup);return pickup;
}
export function dropConsumable(state:SimState,x:number,y:number,elite=false){
  if(seededRoll(state)>=(elite?.12:.04))return;
  const pool=Object.values(CONSUMABLES),total=pool.reduce((sum,item)=>sum+item.weight,0);let roll=seededRoll(state)*total;
  const item=pool.find(item=>(roll-=item.weight)<0)??pool[0];state.pickups.push({id:++state.eventId,x,y,value:1,kind:'consumable',consumableId:item.id});
}
export function stepPickups(state:SimState,dt:number,mods:ItemModifiers,events:string[]){
  let write=0;
  for(const pickup of state.pickups){
    if(pickup.value<=0)continue;
    let distance=Math.hypot(pickup.x-state.player.x,pickup.y-state.player.y);
    if(pickup.kind==='xp'&&!pickup.attracted&&distance<=mods.attraction){pickup.attracted=true;pickup.attractionSpeed=30;pickup.attractedAt=state.time;}
    if(pickup.kind==='xp'&&pickup.attracted&&distance>XP_COLLECTION_RADIUS){
      const targetSpeed=140+220*(1-Math.min(distance,289)/289);pickup.attractionSpeed=Math.min(targetSpeed,(pickup.attractionSpeed??30)+700*dt);
      const step=Math.min(distance-XP_COLLECTION_RADIUS+.001,pickup.attractionSpeed*dt),inverse=1/Math.max(distance,.001);pickup.x+=(state.player.x-pickup.x)*inverse*step;pickup.y+=(state.player.y-pickup.y)*inverse*step;distance=Math.hypot(pickup.x-state.player.x,pickup.y-state.player.y);
    }
    const collectionRadius=pickup.kind==='xp'?XP_COLLECTION_RADIUS:pickup.kind==='ball'?32:20;
    let collected=distance<=collectionRadius+.01&&state.hp>0;
    if(collected&&pickup.kind==='consumable')collected=useConsumable(state,pickup.consumableId??'');
    if(!collected){state.pickups[write++]=pickup;continue;}
    const awardedExp=pickup.kind==='xp'?pickup.value*(1+mods.experience):0;
    if(awardedExp){state.xp+=awardedExp;state.totalExp+=awardedExp;}
    state.collectedPickups.push({id:pickup.id,x:pickup.x,y:pickup.y,kind:pickup.kind,baseValue:pickup.value,awardedExp,consumableId:pickup.consumableId,tier:pickup.tier});
    events.push(pickup.kind==='xp'?'xp-collected':pickup.kind==='ball'?`ball-collected:${pickup.tier??1}`:`consumable-collected:${pickup.consumableId}`);
  }state.pickups.length=write;
}
