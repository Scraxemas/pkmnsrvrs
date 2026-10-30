import {MOVES,POKEMON} from './content';
import {ALL_TM_IDS} from './data/moveUnlocks';
import {MOVE_FUSIONS} from './data/moveFusions';
import {applyUpgrade,evolveTo,SimState,spawnSpecies,tick,Upgrade} from './simulation';
import {discoverTm} from './save';
import {freshCombatRuntime} from './combatRuntime';
import {moveProgression} from './moveProgression';

interface DevelopmentScene {state:SimState;renderMoveHud:()=>void;showChoices:(title:string,options:Upgrade[])=>void;renderAttack?:(event:SimState['attacks'][number])=>void;showEvolution?:(species:string)=>void;cancelChoices?:()=>void;playerAnimation?:{setSpecies:(species:string)=>void};player?:{setTexture:(key:string,frame?:number)=>unknown};portrait?:{setTexture:(key:string)=>unknown};}

/** Imported only behind import.meta.env.DEV; no controls or cheat globals ship in production. */
export function installMoveDevelopmentTools(scene:DevelopmentScene){
 if(!import.meta.env.DEV)return;
 const unlockAllTms=(persist=false)=>{scene.state.discoveredTms=[...ALL_TM_IDS];if(persist)for(const id of ALL_TM_IDS)discoverTm(id,localStorage,'research');return [...scene.state.discoveredTms];};
 const equipMoves=(ids:readonly string[],rank=5)=>{
  const unique=[...new Set(ids)];if(unique.length>5||unique.some(id=>!MOVES[id]))throw new Error('Equip one to five registered move IDs');
  scene.state.moveSlots=unique.map((id,index)=>({id,rank:Math.max(1,Math.min(5,rank)),starter:index===0,nextAttackAt:scene.state.time}));
  scene.state.combatRuntime=freshCombatRuntime(scene.state.maxHp);scene.renderMoveHud();return scene.state.moveSlots;
 };
 const prepareFusion=(result:string)=>{
  const recipe=MOVE_FUSIONS.find(recipe=>recipe.result===result);if(!recipe)throw new Error(`Unknown fusion ${result}`);
  unlockAllTms();if(scene.state.pokemonId!=='venusaur'){evolveTo(scene.state,'venusaur');scene.showEvolution?.('venusaur');}
  scene.state.level=Math.max(32,scene.state.level);scene.state.fusionHistory=scene.state.fusionHistory.filter(id=>id!==result);
  equipMoves(recipe.ingredients,5);return{kind:'moveFusion' as const,id:result,label:`Fuse into ${MOVES[result].name}`};
 };
 const build=(species:string,moves:readonly string[],rank=5)=>{
  const pokemon=POKEMON[species];if(!pokemon)throw new Error(`Unknown playable species ${species}`);
  scene.cancelChoices?.();scene.state.pokemon=pokemon;scene.state.pokemonId=species;
  const stage=moveProgression(pokemon).stage;scene.state.level=stage===1?1:stage===2?16:36;
  scene.state.fusionHistory=[];scene.state.moveHistory=[...moves];scene.state.evolvedAt=[];
  scene.state.progressionNotices=[];scene.playerAnimation?.setSpecies(species);
  scene.player?.setTexture(`${species}-sprite`,0);scene.portrait?.setTexture(`${species}-portrait`);
  return equipMoves(moves,rank);
 };
 const api={unlockAllTms,equipMoves,
  build,allMoves:()=>Object.keys(MOVES),
  activate:(id?:string)=>{if(id)equipMoves([id]);else for(const slot of scene.state.moveSlots)slot.nextAttackAt=scene.state.time;tick(scene.state,1/30,{x:0,y:0});for(const event of scene.state.attacks)scene.renderAttack?.(event);return scene.state.attacks;},
  activateAllMoves:()=>{
   unlockAllTms();const events:SimState['attacks']=[];
   if(!scene.state.enemies.some(enemy=>enemy.hp>0)){spawnSpecies(scene.state,'caterpie');const enemy=scene.state.enemies.at(-1)!;Object.assign(enemy,{x:scene.state.player.x+30,y:scene.state.player.y,hp:100000,maxHp:100000,baseSpeed:0,speed:0});}
   const collect=()=>{events.push(...scene.state.attacks);for(const event of scene.state.attacks)scene.renderAttack?.(event);};
   for(const id of Object.keys(MOVES)){
    equipMoves([id]);tick(scene.state,1/30,{x:0,y:0});collect();
    for(let frame=0;frame<30&&scene.state.combatRuntime.charges.length;frame++){tick(scene.state,1/30,{x:0,y:0});collect();}
   }
   return events;
  },
  prepareFusion,
  showFusionCard:(result:string)=>scene.showChoices('MOVE FUSION',[prepareFusion(result)]),
  fuse:(result:string)=>{const choice=prepareFusion(result),accepted=applyUpgrade(scene.state,choice);scene.renderMoveHud();return accepted;},
  catalog:()=>Object.values(MOVES).map(move=>({id:move.id,name:move.name,type:move.type,category:move.damageClass})),
  starterForms:()=>Object.keys(POKEMON),
 };
 Object.assign(scene,{devMoves:api});
 (window as Window&{__POKEMON_MOVE_DEV__?:typeof api}).__POKEMON_MOVE_DEV__=api;
 return api;
}
