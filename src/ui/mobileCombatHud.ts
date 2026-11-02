import {MOVES} from '../content';
import {ITEMS} from '../items';
import {moveCapacity} from '../moveProgression';
import type {SimState} from '../simulation';
import './mobileCombatHud.css';

/**
 * The Phaser stage is a 1280x720 FIT canvas. On narrow phones its 46px icons
 * become too small to inspect, so a native-size HTML disclosure supplements
 * (rather than replaces) the unobtrusive in-world HUD.
 */
export class MobileCombatHud {
 private readonly root:HTMLDetailsElement;
 private readonly summary:HTMLElement;
 private readonly panel:HTMLElement;
 private signature='';
 constructor(){
  this.root=document.createElement('details');
  this.root.className='mobile-combat-hud';
  this.root.setAttribute('aria-label','Inspect combat build');
  this.summary=document.createElement('summary');
  this.summary.textContent='BUILD';
  this.panel=document.createElement('div');
  this.panel.className='mobile-combat-hud__panel';
  this.root.append(this.summary,this.panel);
  document.body.append(this.root);
 }
 update(state:SimState){
  const capacity=moveCapacity(state.pokemon,state.level);
  const signature=state.pokemonId+':'+capacity+':'+state.moveSlots.map(slot=>slot.id+':'+slot.rank).join(',')+':'+state.items.map(item=>item.id+':'+item.rank).join(',');
  if(signature===this.signature)return;
  this.signature=signature;
  this.summary.textContent='BUILD · '+state.moveSlots.length+' MOVES / '+state.items.length+' ITEMS';
  const heading=document.createElement('h2');
  heading.textContent='Current Pokémon · '+state.pokemon.name;
  this.panel.replaceChildren(heading);
  const addRow=(title:string,detail:string,description:string)=>{
   const row=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('span');
   row.className='mobile-combat-hud__row';strong.textContent=title;small.textContent=detail+'\n'+description;
   row.append(strong,small);this.panel.append(row);
  };
  for(let i=0;i<5;i++){
   const slot=state.moveSlots[i],move=slot&&MOVES[slot.id];
   if(move&&slot)addRow('MOVE '+(i+1)+' · '+move.name,move.type+' · R'+slot.rank,move.description);
   else addRow('MOVE '+(i+1)+(i>=capacity?' · LOCKED':' · EMPTY'),'',i>=capacity?'Evolve your Pokémon to unlock this slot.':'Choose a move at level-up.');
  }
  for(let i=0;i<4;i++){
   const held=state.items[i],item=held&&ITEMS[held.id];
   addRow('ITEM '+(i+1)+' · '+(item?.name??'EMPTY'),held?'Rank '+held.rank:'',item?.description??'Find a held item during the run.');
  }
 }
 destroy(){this.root.remove();}
}
