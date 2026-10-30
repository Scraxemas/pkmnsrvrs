import {MOVES} from '../content';
import {startingStats} from '../playerStats';
import {loadSave,SaveData,toggleFavorite} from '../save';
import {TYPE_COLORS} from '../upgrades';
import {actionButton,element,icon} from './dom';
import {CharacterSelection,filterRoster,regionRoster,ROSTER_REGIONS,RosterFilter,RosterRecord,RosterSort,rosterName,rosterRequirement,rosterState,STAT_CAPS} from './characterRoster';
import type {Direction} from './menuInput';

const number=(dex:number)=>String(dex).padStart(3,'0');
const missingPortraits=new Set<string>();
function portrait(record:RosterRecord,name:string,large=false){
  const frame=element('span',`roster-portrait${large?' roster-portrait--large':''}`);
  if(!record.portrait){frame.classList.add('roster-portrait--mystery');frame.textContent='?';frame.setAttribute('aria-hidden','true');return frame;}
  const image=element('img');image.src=record.portrait;image.alt=`${name} portrait`;image.width=40;image.height=40;image.decoding='async';image.loading=large?'eager':'lazy';image.draggable=false;
  image.addEventListener('error',()=>{frame.classList.add('roster-portrait--missing');frame.replaceChildren(element('span','','?'));frame.setAttribute('role','img');frame.setAttribute('aria-label',`Portrait unavailable for ${name}`);if(large)frame.append(element('small','','Portrait unavailable'));if(!missingPortraits.has(record.portrait!)){missingPortraits.add(record.portrait!);console.warn(`[roster] Missing portrait for ${name}: ${record.portrait}`);}},{once:true});
  frame.append(image);return frame;
}
function types(record:RosterRecord){
  const badges=element('div','type-list');
  for(const type of record.types){const badge=element('span',`type-chip type-${type.toLowerCase()}`,type);badge.style.setProperty('--type-color',`#${(TYPE_COLORS[type]??0xc5bfa4).toString(16).padStart(6,'0')}`);badges.append(badge);}return badges;
}
export class CharacterRosterView {
  readonly grid=element('div','roster-grid');readonly detail=element('section','partner-detail');
  readonly confirmButton:HTMLButtonElement;readonly backButton:HTMLButtonElement;
  readonly sortControl:HTMLSelectElement;readonly filterControl:HTMLSelectElement;
  private abort=new AbortController();private records=regionRoster(ROSTER_REGIONS[0]);private visible:RosterRecord[]=[];
  private rosterHeading=element('h2','','Kanto roster');
  private count=element('span','roster-count');private announcer=element('span','sr-only');private favoriteButton?:HTMLButtonElement;
  constructor(private root:HTMLElement,content:HTMLElement,footer:HTMLElement,private save:SaveData,readonly selection:CharacterSelection,public sort:RosterSort,public filter:RosterFilter,onBack:()=>void,private onConfirm:(id:string)=>void,private remember:(sort:RosterSort,filter:RosterFilter)=>void){
    root.dataset.playerId=selection.playerId;root.style.setProperty('--selection-color',selection.indicator);
    const toolbar=element('div','roster-toolbar'),regions=element('div','roster-regions');regions.setAttribute('role','group');regions.setAttribute('aria-label','Pokémon regions');
    for(const region of ROSTER_REGIONS){const button=actionButton(region.name,()=>this.selectRegion(region.id),'roster-region');button.dataset.region=region.id;button.disabled=!region.available;button.setAttribute('aria-pressed',String(region.id==='kanto'));if(!region.available){button.append(element('small','','SOON'));button.title=`${region.name} partners are not available yet.`;}regions.append(button);}
    const controls=element('div','roster-tools');
    const select=(label:string,options:readonly [string,string][])=>{const wrap=element('label','roster-tool'),input=element('select');wrap.append(element('span','',label),input);input.setAttribute('aria-label',label);input.dataset.nav='';for(const [value,text] of options){const option=element('option','',text);option.value=value;input.append(option);}controls.append(wrap);return input;};
    this.sortControl=select('Sort',[['dex','Pokédex No.'],['name','Name A–Z']]);this.filterControl=select('Filter',[['all','All Pokémon'],['unlocked','Unlocked'],['discovered','Discovered'],['favorites','Favorites']]);
    this.sortControl.value=sort;this.filterControl.value=filter;
    const change=()=>{this.sort=this.sortControl.value as RosterSort;this.filter=this.filterControl.value as RosterFilter;this.remember(this.sort,this.filter);this.renderRoster();};
    this.sortControl.addEventListener('change',change,{signal:this.abort.signal});this.filterControl.addEventListener('change',change,{signal:this.abort.signal});toolbar.append(regions,controls);
    const layout=element('div','selection-layout'),roster=element('section','roster-panel'),heading=element('div','roster-panel__heading');
    heading.append(this.rosterHeading,this.count);this.grid.setAttribute('role','listbox');this.grid.setAttribute('aria-label','Pokémon roster');this.grid.setAttribute('aria-describedby','roster-help');
    const legend=element('div','roster-legend');for(const [state,label] of [['unlocked','Unlocked'],['locked','Locked'],['undiscovered','Undiscovered']])legend.append(element('span',`legend-${state}`,label));
    roster.append(heading,this.grid,legend);this.detail.setAttribute('aria-label','Selected Pokémon');this.detail.setAttribute('role','region');layout.append(roster,this.detail);content.append(toolbar,layout);
    this.backButton=actionButton('Back',onBack,'ui-button ui-button--back','back');
    this.confirmButton=actionButton('Select Pokémon',()=>{this.save=loadSave();const id=this.selection.confirm(this.selectedRecord(),this.save);if(id)this.onConfirm(id);else this.renderDetails();},'ui-button ui-button--gold partner-confirm','play');
    const help=element('span','roster-help','Arrows / WASD browse · Enter readies · Esc back');help.id='roster-help';footer.append(this.backButton,help,this.confirmButton);this.announcer.setAttribute('role','status');this.announcer.setAttribute('aria-live','polite');root.append(this.announcer);
    this.grid.addEventListener('focusin',event=>{const tile=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-dex]');if(tile)this.preview(Number(tile.dataset.dex));},{signal:this.abort.signal});
    this.grid.addEventListener('click',event=>{const tile=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-dex]');if(!tile)return;this.preview(Number(tile.dataset.dex));if(event.detail===0&&!this.confirmButton.disabled)this.confirmButton.focus({preventScroll:true});},{signal:this.abort.signal});
    this.renderRoster();
  }
  selectedRecord(){return this.visible.find(record=>record.dex===this.selection.dex);}
  selectedTile(){return this.grid.querySelector<HTMLButtonElement>(`[data-dex="${this.selection.dex}"]`)??undefined;}
  selectRegion(id:string){const region=ROSTER_REGIONS.find(region=>region.id===id);if(!region?.available)return;this.records=regionRoster(region);this.rosterHeading.textContent=`${region.name} roster`;for(const button of this.root.querySelectorAll('[data-region]'))button.setAttribute('aria-pressed',String((button as HTMLElement).dataset.region===id));this.renderRoster();}
  private renderRoster(){
    this.visible=filterRoster(this.records,this.save,this.sort,this.filter);
    if(!this.selectedRecord())this.selection.preview(this.visible[0]?.dex??null);
    const tiles=this.visible.map(record=>{
      const state=rosterState(record,this.save),known=state!=='undiscovered',name=rosterName(record,this.save),tile=element('button',`roster-tile roster-tile--${state}`);tile.type='button';tile.dataset.nav='';tile.dataset.dex=String(record.dex);tile.dataset.state=state;tile.setAttribute('role','option');tile.setAttribute('aria-label',`No. ${number(record.dex)} · ${known?name:'Undiscovered Pokémon'} · ${state}`);tile.title=known?`${name} · ${state}`:'Undiscovered Pokémon';
      tile.append(element('span','roster-number',number(record.dex)),portrait(known?record:{...record,portrait:undefined},name),element('span','roster-tile__name',known?name:'???'));
      const marker=element('span',`roster-marker roster-marker--${state}`);marker.setAttribute('aria-hidden','true');if(state==='unlocked')marker.textContent='◆';else if(known)marker.append(icon('lock'));tile.append(marker);if((this.save.favoritePokemon??[]).includes(record.dex))tile.append(element('span','roster-star','★'));return tile;
    });
    this.grid.replaceChildren(...tiles);this.grid.scrollTop=0;
    if(!tiles.length)this.grid.append(element('p','roster-empty',this.filter==='favorites'?'No favorites yet. Browse All Pokémon and star a discovered partner.':'No Pokémon match this filter.'));
    const ready=this.records.filter(record=>rosterState(record,this.save)==='unlocked').length;this.count.textContent=`${ready} ready · ${this.visible.length} / ${this.records.length}`;this.updateSelection();this.renderDetails();
  }
  private updateSelection(){for(const tile of this.grid.querySelectorAll<HTMLButtonElement>('[data-dex]')){const selected=Number(tile.dataset.dex)===this.selection.dex;tile.setAttribute('aria-selected',String(selected));tile.tabIndex=selected?0:-1;}}
  preview(dex:number){if(this.selection.dex===dex)return;this.selection.preview(dex);this.updateSelection();this.renderDetails();}
  private renderDetails(){
    const record=this.selectedRecord();this.detail.replaceChildren();this.favoriteButton=undefined;
    if(!record){this.detail.append(element('div','detail-empty','Choose a Pokémon from the roster.'));this.confirmButton.disabled=true;this.confirmButton.querySelector('.button-label')!.textContent='Select Pokémon';return;}
    const state=rosterState(record,this.save),known=state!=='undiscovered',name=rosterName(record,this.save),body=element('div','partner-detail__body');this.detail.dataset.dex=String(record.dex);this.detail.dataset.state=state;
    const header=element('div','partner-detail__header');header.append(element('span','eyebrow',`NATIONAL No. ${number(record.dex)}`));
    this.favoriteButton=actionButton('★',()=>{this.save=toggleFavorite(record.dex);this.renderRoster();if(this.favoriteButton&&!this.favoriteButton.disabled)this.favoriteButton.focus({preventScroll:true});else this.filterControl.focus();},'roster-favorite');this.favoriteButton.setAttribute('aria-label',`Favorite ${known?name:'Pokémon'}`);this.favoriteButton.setAttribute('aria-pressed',String((this.save.favoritePokemon??[]).includes(record.dex)));this.favoriteButton.disabled=!known;header.append(this.favoriteButton);this.detail.append(header);
    const hero=element('div','partner-hero'),identity=element('div','partner-identity');identity.append(element('span',`partner-state partner-state--${state}`,state==='unlocked'?'UNLOCKED':state==='unavailable'?'NOT PLAYABLE':state==='locked'?'LOCKED':record.id?'UNDISCOVERED':'FUTURE SLOT'),element('h2','selected-pokemon-name',name));if(known)identity.append(types(record));hero.append(portrait(known?record:{...record,portrait:undefined},name,true),identity);body.append(hero);
    if(known&&record.combat){
      const p=record.combat,stats=startingStats(p),list=element('dl','partner-stat-bars');
      for(const [key,label] of [['hp','HP'],['attack','ATK'],['specialAttack','SP. ATK'],['speed','SPD']] as const){const row=element('div','partner-stat'),bar=element('meter');bar.min=0;bar.max=STAT_CAPS[key];bar.value=stats[key];bar.setAttribute('aria-label',`${label} starting stat`);bar.title=`${label}: ${stats[key]} (roster scale 0–${STAT_CAPS[key]})${key==='speed'?' px/s':''}`;row.dataset.stat=key;const value=element('dd','',String(stats[key]));row.append(element('dt','',label),bar,value);list.append(row);}
      const move=MOVES[p.startingMove],moveBox=element('section','partner-starting-move'),moveHeader=element('div','starting-move-heading');moveHeader.append(element('h3','','Starting move'),element('span','',`Rank 1 · ${move.type}`));moveBox.append(moveHeader,element('strong','starting-move-name',move.name),element('p','starting-move-description',move.description));
      identity.append(list,element('p','stat-scale-note','Level 1 · SPD in px/s'));body.append(element('p','partner-description',p.description),moveBox);
    }else body.append(element('div','partner-unknown-info',known?'Starting stats and moves are not available for this partner.':record.id?'Explore Kanto to reveal this Pokémon. Its identity, portrait, stats and moves remain hidden.':'This National Dex slot is reserved for future partners. Its identity and battle data are not available yet.'));
    const access=element('p',`partner-access partner-access--${state}`,rosterRequirement(record,this.save));body.append(access);this.detail.append(body);this.confirmButton.disabled=state!=='unlocked';this.confirmButton.querySelector('.button-label')!.textContent=state==='unlocked'?`Select ${name}`:state==='undiscovered'?'Undiscovered Pokémon':state==='locked'?`${name} locked`:`${name} unavailable`;this.announcer.textContent=`${name}. ${state==='unlocked'?'Ready to select.':state==='undiscovered'?'Undiscovered.':'Not available to select.'}`;
  }
  move(direction:Direction){
    const focused=document.activeElement as HTMLElement;
    if(focused===this.sortControl||focused===this.filterControl){
      if(direction==='left'||direction==='right'){const select=focused as HTMLSelectElement;select.selectedIndex=(select.selectedIndex+(direction==='right'?1:select.options.length-1))%select.options.length;select.dispatchEvent(new Event('change'));return true;}
      if(direction==='down'){(this.selectedTile()??this.backButton).focus({preventScroll:true});return true;}return false;
    }
    const tile=focused?.closest<HTMLButtonElement>('.roster-tile');
    if(tile){const index=this.visible.findIndex(record=>record.dex===Number(tile.dataset.dex)),columns=getComputedStyle(this.grid).gridTemplateColumns.split(' ').length;
      if(direction==='up'&&index<columns){this.sortControl.focus();return true;}
      if(direction==='down'&&index+columns>=this.visible.length){(this.confirmButton.disabled?this.backButton:this.confirmButton).focus();return true;}
      if(direction==='right'&&index%columns===columns-1&&this.favoriteButton&&!this.favoriteButton.disabled){this.favoriteButton.focus();return true;}
      const next=Math.max(0,Math.min(this.visible.length-1,index+(direction==='up'?-columns:direction==='down'?columns:direction==='left'?-1:1))),target=this.grid.querySelector<HTMLButtonElement>(`[data-dex="${this.visible[next].dex}"]`);target?.focus({preventScroll:true});target?.scrollIntoView({block:'nearest',inline:'nearest'});return true;
    }
    if(((focused===this.confirmButton||focused===this.backButton)&&direction==='up')||(focused===this.favoriteButton&&direction==='left')){const target=this.selectedTile()??this.filterControl;target.focus({preventScroll:true});target.scrollIntoView({block:'nearest',inline:'nearest'});return true;}
    return false;
  }
  destroy(){this.abort.abort();}
}
