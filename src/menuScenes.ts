import Phaser from 'phaser';
import {POKEMON} from './content';
import {loadSave,updateSettings} from './save';
import {motionReduced,PlayerSettings} from './preferences';
import {actionButton,element,icon} from './ui/dom';
import {CampaignView} from './ui/campaignView';
import {FRONTEND_VERSION,menuAsset,MENU_ART,researchStatistics,PLAY_MODES} from './ui/menuData';
import {MenuInput} from './ui/menuInput';
import {arcadeButton} from './ui/arcadeButton';
import {MenuBackgroundController} from './ui/menuBackgroundController';
import {CharacterSelection,RosterFilter,RosterSort} from './ui/characterRoster';
import {CharacterRosterView} from './ui/characterRosterView';
import './menu.css';
import './ui/titleMenu.css';
import './ui/characterRoster.css';

export function stopFrontendScenes(scene:Phaser.Scene){for(const key of ['menu','pokemon','stage','dex','research','settings'])if(key!==scene.scene.key&&scene.scene.isActive(key))scene.scene.stop(key);}

abstract class FrontendScene extends Phaser.Scene {
  root!:HTMLElement;shell!:HTMLElement;content!:HTMLElement;footer!:HTMLElement;navigation?:MenuInput;
  background?:MenuBackgroundController;
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
  animateBackground(){
    const image=this.root.querySelector<HTMLImageElement>('.frontend-background')!;
    this.background=new MenuBackgroundController(this,this.root,image,motionReduced(loadSave().settings));
    const query=matchMedia('(prefers-reduced-motion: reduce)'),changed=()=>{const value=motionReduced(loadSave().settings);this.root.dataset.reducedMotion=String(value);this.background?.setReducedMotion(value);};query.addEventListener('change',changed);
    this.events.once('shutdown',()=>{query.removeEventListener('change',changed);this.background?.destroy();});
  }
  update(_time:number,delta:number){this.background?.update(delta);}
}

export class MenuScene extends FrontendScene {
  modeOpen=false;
  private links!:HTMLElement;private modes!:HTMLElement;private play!:HTMLButtonElement;private single!:HTMLButtonElement;
  constructor(){super('menu');}
  init(data?:{mode?:boolean}){this.modeOpen=!!data?.mode;}
  create(){
    this.mount('menu');const initialMode=this.modeOpen;
    const stage=element('div','title-stage'),stack=element('section','title-stack'),title=element('h1','game-title'),logo=element('img','menu-logo');
    logo.src=menuAsset(MENU_ART.logo);logo.alt='Pokémon Survivors';logo.width=202;logo.height=100;logo.draggable=false;title.append(logo);
    const nav=element('nav','title-navigation');nav.setAttribute('aria-label','Main menu');
    this.play=arcadeButton('Play',()=>this.setMode(!this.modeOpen),'play');this.play.setAttribute('aria-controls','play-modes');nav.append(this.play);
    const area=element('div','title-mode-area');this.links=element('div','title-links');
    const secondary=element('div','title-secondary');secondary.append(arcadeButton('Pokédex',()=>this.scene.start('dex'),'pokedex'),arcadeButton('Research',()=>this.scene.start('research'),'research'));
    this.links.append(secondary,arcadeButton('Settings',()=>this.scene.start('settings'),'settings'));
    this.modes=element('section','mode-panel');this.modes.id='play-modes';this.modes.setAttribute('aria-label','Choose play mode');
    this.single=arcadeButton('Single Player',()=>this.scene.start('pokemon'),'single');
    const multi=arcadeButton('Multiplayer',()=>{},'multi');multi.disabled=!PLAY_MODES.multiplayer.available;multi.dataset.targetPlayers=String(PLAY_MODES.multiplayer.targetMaxPlayers);multi.setAttribute('aria-label','Multiplayer — Coming soon');multi.querySelector('.arcade-button__label')!.append(element('span','coming-soon','COMING SOON'));
    this.modes.append(this.single,multi,arcadeButton('Back',()=>this.setMode(false),'back'));area.append(this.links,this.modes);nav.append(area);stack.append(title,nav);stage.append(stack);this.content.append(stage);this.footer.append(element('span','title-build',FRONTEND_VERSION));
    this.animateBackground();
    this.navigation=new MenuInput(this.root,()=>{if(this.modeOpen)this.setMode(false);});this.setMode(initialMode);
  }
  setMode(open:boolean){
    this.modeOpen=open;this.links.hidden=open;this.modes.hidden=!open;this.play.setAttribute('aria-expanded',String(open));
    queueMicrotask(()=>{if(this.root.isConnected)(open?this.single:this.play).focus({preventScroll:true});});
  }
}

export class PokemonScene extends FrontendScene {
  selection=new CharacterSelection('local');roster?:CharacterRosterView;sort:RosterSort='dex';filter:RosterFilter='all';
  constructor(){super('pokemon');}
  init(data?:{pokemon?:string}){if(data?.pokemon&&POKEMON[data.pokemon])this.selection.preview(POKEMON[data.pokemon].dex);}
  create(){
    this.mount('pokemon','Select Pokémon');this.selection.preview(this.selection.dex);
    const back=()=>this.scene.start('menu',{mode:true});
    this.roster=new CharacterRosterView(this.root,this.content,this.footer,loadSave(),this.selection,this.sort,this.filter,back,id=>this.scene.start('stage',{pokemon:id}),(sort,filter)=>{this.sort=sort;this.filter=filter;});
    this.navigation=new MenuInput(this.root,back,{focusOnHover:false,initialFocus:()=>{const tile=this.roster?.selectedTile();tile?.scrollIntoView({block:'nearest',inline:'nearest'});return tile;},move:direction=>this.roster?.move(direction)??false});
    this.animateBackground();this.events.once('shutdown',()=>this.roster?.destroy());
  }
}

export class StageScene extends FrontendScene {
  pokemon='bulbasaur';campaign?:CampaignView;
  constructor(){super('stage');}
  init(data?:{pokemon?:string}){this.pokemon=data?.pokemon&&POKEMON[data.pokemon]?data.pokemon:'bulbasaur';}
  create(){
    this.mount('stage','Choose your destination',`Kanto campaign · Travelling with ${POKEMON[this.pokemon].name} · Viridian Forest demo`);
    const back=()=>this.scene.start('pokemon',{pokemon:this.pokemon});
    this.campaign=new CampaignView(this.root,this.content,loadSave(),id=>{if(id==='viridian')this.scene.start('game',{pokemon:this.pokemon,fast:new URLSearchParams(location.search).has('fast')});});
    this.footer.append(actionButton('Back',back,'ui-button ui-button--back','back'));
    const hints=element('span','input-hints');hints.append(element('span','keyboard-hint','← → Story   ↑ ↓ Side trails   Enter Select / Enter   Esc Back   ·   Drag / Wheel to explore'),element('span','controller-hint','D-pad / Stick Travel   A Inspect / Enter   B Back'));this.footer.append(hints);
    this.navigation=new MenuInput(this.root,back,{focusOnHover:false,initialFocus:()=>this.campaign?.selectedButton(),move:direction=>this.campaign?.move(direction)??false});this.events.once('shutdown',()=>this.campaign?.destroy());
  }
  select(id:string){this.campaign?.select(id,true);}
  get selected(){return this.campaign?.selected??'viridian';}
}

export class DexScene extends FrontendScene {
  selection=new CharacterSelection('pokedex');roster?:CharacterRosterView;sort:RosterSort='dex';filter:RosterFilter='all';
  constructor(){super('dex');}
  create(){
    this.mount('dex','Pokédex');const back=()=>this.scene.start('menu');
    this.roster=new CharacterRosterView(this.root,this.content,this.footer,loadSave(),this.selection,this.sort,this.filter,back,()=>{},(sort,filter)=>{this.sort=sort;this.filter=filter;},'pokedex');
    this.navigation=new MenuInput(this.root,back,{focusOnHover:false,initialFocus:()=>this.roster?.selectedTile(),move:direction=>this.roster?.move(direction)??false});this.animateBackground();this.events.once('shutdown',()=>this.roster?.destroy());
  }
}

export class ResearchScene extends FrontendScene {
  constructor(){super('research');}
  create(){
    this.mount('research','Research board','Small discoveries. Lasting progress.');const save=loadSave(),r=save.research;
    const tabs=element('div','research-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Research views');
    const challenges=element('section','research-panel'),statistics=element('section','research-panel');challenges.id='research-challenges';statistics.id='research-statistics';
    for(const [panel,name] of [[challenges,'Challenges'],[statistics,'Statistics']] as const){panel.setAttribute('role','tabpanel');panel.setAttribute('aria-label',name);}
    const select=(name:string)=>{challenges.hidden=name!=='Challenges';statistics.hidden=name!=='Statistics';for(const tab of tabs.querySelectorAll('button'))tab.setAttribute('aria-selected',String(tab.textContent===name));};
    for(const name of ['Challenges','Statistics']){const tab=actionButton(name,()=>select(name));tab.setAttribute('role','tab');tab.setAttribute('aria-controls',name==='Challenges'?challenges.id:statistics.id);tabs.append(tab);}
    const tasks=[['Defeat 100 Pokémon',r.enemiesDefeated,100],['Defeat 100 Caterpie',r.caterpie,100],['Defeat 100 Weedle',r.weedle,100],['Defeat Beedrill',r.beedrill,1],['Evolve a starter',r.evolutions,1],['Complete Viridian Forest',r.viridianWins,1]] as const;
    const grid=element('div','research-grid');tasks.forEach(([label,value,max],i)=>{const count=Math.min(value??0,max),card=element('article',`research-entry${count>=max?' is-complete':''}`),header=element('div','research-entry__heading');header.append(element('span','eyebrow',`FIELD NOTES ${String(i+1).padStart(2,'0')}`),icon(count>=max?'check':'flask'));const progress=element('progress');progress.max=max;progress.value=count;progress.setAttribute('aria-label',label);card.append(header,element('h2','',label),progress,element('span','research-count',`${count} / ${max}${count>=max?' · Complete':''}`));grid.append(card);});challenges.append(grid);
    const stats=researchStatistics(save),totals=element('div','statistics-grid');
    for(const [name,value] of stats.totals){const stat=element('article','statistic');stat.append(element('span','eyebrow',name),element('strong','',String(value)));totals.append(stat);}statistics.append(totals);
    const best=element('article','saved-run');best.append(element('div','eyebrow','VIRIDIAN FOREST'),element('h2','','Personal best'),element('p','',stats.best?`Level ${stats.best.level} · ${stats.best.defeated} KO · ${stats.best.time} survived`:'No recorded run yet.'));statistics.append(best);
    if(stats.lastRun){const last=element('article','saved-run'),run=stats.lastRun;last.append(element('h2','','Last run'),element('p','',`${run.pokemon} · ${run.result==='victory'?'Victory':'Defeat'} · Level ${run.level} · ${run.defeated} KO · ${run.timeLabel}`));statistics.append(last);}
    this.content.append(tabs,challenges,statistics);select('Challenges');this.controls(()=>this.scene.start('menu'));
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
