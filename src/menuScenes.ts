import Phaser from 'phaser';
import {assetFor,ENEMIES,MOVES,POKEMON} from './content';
import {loadSave,updateSettings} from './save';
import {motionReduced,PlayerSettings} from './preferences';
import {actionButton,element,icon} from './ui/dom';
import {locationCard} from './ui/locationCard';
import {FRONTEND_VERSION,LocationCardData,locationCards,menuAsset,MENU_ART,menuProfile,STARTERS} from './ui/menuData';
import {MenuInput} from './ui/menuInput';
import './menu.css';

export function stopFrontendScenes(scene:Phaser.Scene){for(const key of ['menu','pokemon','stage','dex','research','settings'])if(key!==scene.scene.key&&scene.scene.isActive(key))scene.scene.stop(key);}

abstract class FrontendScene extends Phaser.Scene {
  root!:HTMLElement;shell!:HTMLElement;content!:HTMLElement;footer!:HTMLElement;navigation?:MenuInput;
  mount(page:string,title?:string,subtitle?:string){
    stopFrontendScenes(this);
    this.cameras.main.setBackgroundColor('#0a1b17');
    this.root=element('main',`frontend frontend--${page}`);this.root.dataset.page=page;this.root.dataset.reducedMotion=String(motionReduced(loadSave().settings));
    const image=element('img','frontend-background');image.src=menuAsset(MENU_ART.background);image.alt='';image.draggable=false;image.dataset.testid='menu-background';
    this.root.append(image,element('div','frontend-shade'));this.shell=element('div','frontend-shell');this.root.append(this.shell);
    if(title){const header=element('header','page-header'),heading=element('div');heading.append(element('div','eyebrow','POKÉMON SURVIVORS / KANTO'),element('h1','',title));if(subtitle)heading.append(element('p','page-subtitle',subtitle));header.append(heading,element('span','build-label',FRONTEND_VERSION));this.shell.append(header);}
    this.content=element('section','page-content');this.shell.append(this.content);this.footer=element('footer','frontend-footer');this.shell.append(this.footer);
    document.body.append(this.root);this.game.canvas.setAttribute('aria-hidden','true');
    this.events.once('shutdown',()=>{this.navigation?.destroy();this.root.remove();this.game.canvas.removeAttribute('aria-hidden');this.game.canvas.tabIndex=0;this.game.canvas.focus({preventScroll:true});});
  }
  controls(back?:()=>void){
    if(back)this.footer.append(actionButton('Back',back,'ui-button ui-button--back','back'));
    const hints=element('span','input-hints');hints.append(element('span','keyboard-hint','↑ ↓ ← →  Move    Enter  Select    Esc  Back'),element('span','controller-hint','D-pad / Stick  Move    A  Select    B  Back'));this.footer.append(hints);
    this.navigation=new MenuInput(this.root,back);
  }
}

export class MenuScene extends FrontendScene {
  constructor(){super('menu');}
  create(){
    this.mount('menu');const save=loadSave(),profile=menuProfile(save),layout=element('div','menu-layout'),left=element('section','title-column');
    const masthead=element('div','menu-masthead');masthead.append(element('span','milestone-mark','I'),element('span','eyebrow','KANTO / FIRST MILESTONE'));left.append(masthead);
    const title=element('h1','game-title');title.append(element('span','game-title__pokemon','POKÉMON'),element('span','game-title__survivors','SURVIVORS'));left.append(title,element('p','menu-tagline','A new trail. A new challenge. A new run.'));
    const nav=element('nav','main-navigation');nav.setAttribute('aria-label','Main menu');
    const entries=[['New Run','Choose your Pokémon. Find your way.','play','pokemon'],['Pokédex','Your encounters, discoveries, and evolutions.','book','dex'],['Research','Track your progress through Kanto.','flask','research'],['Settings','Make the adventure your own.','settings','settings']] as const;
    entries.forEach(([name,description,symbol,scene],i)=>{const button=actionButton('',()=>this.scene.start(scene),`menu-option${i===0?' menu-option--primary':''}`);button.replaceChildren(icon(symbol));const text=element('span','menu-option__text');text.append(element('span','menu-option__name',name),element('span','menu-option__description',description));button.append(text,element('span','menu-option__arrow','›'));button.setAttribute('aria-label',name);nav.append(button);});left.append(nav);
    const featured=element('aside','featured-milestone');featured.append(element('div','eyebrow featured-label','YOUR ADVENTURE BEGINS HERE'));
    featured.append(locationCard(locationCards(save)[0],()=>this.scene.start('pokemon'),true));
    layout.append(left,featured);this.content.append(layout);
    const stats=element('div','profile-strip');
    for(const [label,value] of [['AVAILABLE STARTERS',`${profile.starters} / ${profile.totalStarters}`],['FOREST CLEARS',String(profile.clears)],['PERSONAL BEST',profile.best]]){const stat=element('div','profile-stat');stat.append(element('span','eyebrow',label),element('strong','',value));stats.append(stat);}
    const bottom=element('div','menu-bottom');bottom.append(element('span','','Viridian Forest · First Milestone'),element('span','',`${FRONTEND_VERSION} · Pokémon fan project`));this.footer.append(stats,bottom);this.controls();
  }
}

export class PokemonScene extends FrontendScene {
  constructor(){super('pokemon');}
  create(){
    this.mount('pokemon','Choose your partner','Every adventure begins with a Pokémon at your side.');
    const save=loadSave(),grid=element('div','partner-grid');
    for(const id of STARTERS){
      const pokemon=POKEMON[id],available=save.unlockedPokemon.includes(id),button=actionButton('',()=>{if(available)this.scene.start('stage',{pokemon:id});},'partner-card');button.replaceChildren();button.dataset.pokemon=id;button.setAttribute('aria-label',`Choose ${pokemon.name}`);button.disabled=!available;
      button.style.setProperty('--partner-color',`#${pokemon.color.toString(16).padStart(6,'0')}`);
      const portrait=element('img','partner-portrait');portrait.src=assetFor(id,'portrait');portrait.alt=pokemon.name;
      const types=element('div','type-list');for(const type of pokemon.types)types.append(element('span',`type-chip type-${type.toLowerCase()}`,type));
      const stats=element('div','partner-stats');for(const [label,value] of [['HP',pokemon.stats.hp],['ATK',pokemon.stats.attack],['SPD',pokemon.stats.speed]]){const stat=element('span');stat.append(element('small','',String(label)),element('strong','',String(value)));stats.append(stat);}
      button.append(element('span','eyebrow',`NO. ${String(pokemon.dex).padStart(3,'0')}`),portrait,element('h2','',pokemon.name),types,element('p','',pokemon.description),stats,element('span','partner-move',`Starts with ${MOVES[pokemon.startingMove].name}`),element('span','partner-select',available?'Choose partner  ›':'Locked'));grid.append(button);
    }
    this.content.append(grid);this.controls(()=>this.scene.start('menu'));
  }
}

export class StageScene extends FrontendScene {
  pokemon='bulbasaur';cards:LocationCardData[]=[];selected='viridian';
  constructor(){super('stage');}
  init(data:{pokemon?:string}){this.pokemon=data?.pokemon??'bulbasaur';this.selected='viridian';}
  create(){
    this.mount('stage','Choose your destination',`Kanto campaign · Travelling with ${POKEMON[this.pokemon]?.name??'Bulbasaur'}`);
    this.cards=locationCards(loadSave());const grid=element('div','location-grid');
    for(const data of this.cards)grid.append(locationCard(data,()=>this.select(data.id)));
    const summary=element('section','stage-summary');summary.setAttribute('aria-live','polite');summary.append(element('div','stage-summary__text'),actionButton('Enter Forest',()=>{const selected=this.cards.find(c=>c.id===this.selected)!;if(selected.unlocked&&selected.playable)this.scene.start('game',{pokemon:this.pokemon,fast:new URLSearchParams(location.search).has('fast')});},'ui-button ui-button--gold stage-enter','play'));
    this.content.append(grid,summary);this.select(this.selected);this.controls(()=>this.scene.start('pokemon'));
  }
  select(id:string){
    this.selected=id;for(const card of this.root.querySelectorAll<HTMLButtonElement>('[data-stage-id]')){const selected=card.dataset.stageId===id;card.classList.toggle('is-selected',selected);card.setAttribute('aria-pressed',String(selected));}
    const data=this.cards.find(c=>c.id===id)!,text=this.root.querySelector('.stage-summary__text')!,enter=this.root.querySelector<HTMLButtonElement>('.stage-enter')!;
    text.replaceChildren(element('div','eyebrow',data.playable?'SURVIVAL STAGE · 30 MINUTES':data.unlocked?'UNLOCKED · IN DEVELOPMENT':'LOCKED DESTINATION'),element('h2','',data.title),element('p','',data.playable?'Survive the woodland. Defeat Beedrill. Begin your Kanto journey.':data.description));
    enter.disabled=!data.playable||!data.unlocked;enter.querySelector('.button-label')!.textContent=data.playable?'Enter Forest':data.unlocked?'Coming Later':'Locked';
  }
}

export class DexScene extends FrontendScene {
  constructor(){super('dex');}
  create(){
    const save=loadSave(),ids=[...new Set([...Object.keys(POKEMON),...Object.keys(ENEMIES)])],known=new Set([...save.pokedex,...STARTERS]);
    this.mount('dex','Pokédex',`${ids.filter(id=>known.has(id)).length} / ${ids.length} discovered · Meet Pokémon and evolve your partners to fill these pages.`);
    const grid=element('div','dex-grid');
    for(const id of ids){const pokemon=POKEMON[id]??ENEMIES[id],card=element('article',`dex-entry${known.has(id)?'':' dex-entry--unknown'}`);
      if(known.has(id)){const image=element('img');image.src=assetFor(id,'portrait');image.alt='';const info=element('div');info.append(element('h2','',pokemon.name),element('p','',pokemon.types.join(' / ')));card.append(image,info);}
      else card.append(element('span','unknown-portrait','?'),element('div','','Undiscovered Pokémon'));grid.append(card);
    }
    this.content.append(grid);this.controls(()=>this.scene.start('menu'));
  }
}

export class ResearchScene extends FrontendScene {
  constructor(){super('research');}
  create(){
    this.mount('research','Research board','Small discoveries. Lasting progress.');const r=loadSave().research;
    const tasks=[['Defeat 100 Pokémon',r.enemiesDefeated,100],['Defeat 100 Caterpie',r.caterpie,100],['Defeat 100 Weedle',r.weedle,100],['Defeat Beedrill',r.beedrill,1],['Evolve a starter',r.evolutions,1],['Complete Viridian Forest',r.viridianWins,1]] as const;
    const grid=element('div','research-grid');tasks.forEach(([label,value,max],i)=>{const count=Math.min(value??0,max),card=element('article',`research-entry${count>=max?' is-complete':''}`),header=element('div','research-entry__heading');header.append(element('span','eyebrow',`FIELD NOTES ${String(i+1).padStart(2,'0')}`),icon(count>=max?'check':'flask'));const progress=element('progress');progress.max=max;progress.value=count;progress.setAttribute('aria-label',label);card.append(header,element('h2','',label),progress,element('span','research-count',`${count} / ${max}${count>=max?' · Complete':''}`));grid.append(card);});
    this.content.append(grid);this.controls(()=>this.scene.start('menu'));
  }
}

export class SettingsScene extends FrontendScene {
  constructor(){super('settings');}
  create(){
    this.mount('settings','Settings','Presentation preferences are saved automatically.');const settings=loadSave().settings,list=element('div','settings-list');
    const options:[keyof PlayerSettings,string,string][]=[['reducedMotion','Reduced motion','Reduce menu and card animation. Disable camera shake. Also respects your system preference.'],['damageNumbers','Damage numbers','Show the damage dealt by automatic attacks.'],['screenShake','Screen shake','A subtle camera response when your Pokémon takes damage. Disabled by reduced motion.']];
    for(const [key,title,description] of options){
      const row=actionButton('',()=>{settings[key]=!settings[key];updateSettings({[key]:settings[key]});row.setAttribute('aria-checked',String(settings[key]));row.querySelector('.switch-state')!.textContent=settings[key]?'ON':'OFF';this.root.dataset.reducedMotion=String(motionReduced(settings));},'setting-row');row.replaceChildren();row.setAttribute('role','switch');row.setAttribute('aria-label',title);row.setAttribute('aria-checked',String(settings[key]));
      const text=element('span','setting-copy');text.append(element('strong','',title),element('span','',description));const toggle=element('span','setting-switch');toggle.append(element('span','switch-state',settings[key]?'ON':'OFF'),element('span','switch-track'));row.append(text,toggle);list.append(row);
    }
    const fullscreen=actionButton('',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{status.textContent='Fullscreen is unavailable in this browser. The game still scales to your window.';}},'setting-row');fullscreen.replaceChildren();fullscreen.setAttribute('aria-label','Toggle fullscreen');
    const fsCopy=element('span','setting-copy');fsCopy.append(element('strong','','Fullscreen'),element('span','','Use the whole display where your browser supports it.'));const fsState=element('span','fullscreen-state',document.fullscreenElement?'EXIT FULLSCREEN':'ENTER FULLSCREEN');fullscreen.append(fsCopy,fsState,icon('expand'));fullscreen.disabled=!document.fullscreenEnabled;if(fullscreen.disabled)fsState.textContent='BROWSER UNAVAILABLE';list.append(fullscreen);
    const changed=()=>{fsState.textContent=document.fullscreenElement?'EXIT FULLSCREEN':'ENTER FULLSCREEN';};document.addEventListener('fullscreenchange',changed);this.events.once('shutdown',()=>document.removeEventListener('fullscreenchange',changed));
    const audio=element('div','setting-row setting-row--unavailable'),audioText=element('span','setting-copy');audioText.append(element('strong','','Audio'),element('span','','Music and sound effects are not available in this build.'));audio.append(audioText,element('span','eyebrow','COMING LATER'));list.append(audio);
    const status=element('p','settings-status');status.setAttribute('role','status');this.content.append(list,status);this.controls(()=>this.scene.start('menu'));
  }
}
