import {describe,it,expect} from 'vitest';
import {freshSave,loadSave,recordRun,updateSettings} from '../src/save';
import {menuProfile,MENU_ART} from '../src/ui/menuData';
import {KANTO_CAMPAIGN,campaignNode} from '../src/campaign/data';
import {resolveCampaignNode} from '../src/campaign/state';
import {spatialFocus} from '../src/ui/menuInput';

function storage():Storage{const values=new Map<string,string>();return{get length(){return values.size;},getItem:key=>values.get(key)??null,setItem:(key,value)=>{values.set(key,value);},clear:()=>values.clear(),removeItem:key=>{values.delete(key);},key:i=>[...values.keys()][i]??null};}
describe('menu data and saved presentation preferences',()=>{
  it('uses the supplied forest card and distinguishes playable, future, locked, and completed states',()=>{
    const save=freshSave(),first=campaignNode('viridian')!;expect(first.artwork).toBe(MENU_ART.viridian);expect(resolveCampaignNode(first,save)).toMatchObject({unlocked:true,completed:false,launchable:true});
    expect(resolveCampaignNode(campaignNode('mtMoon')!,save)).toMatchObject({unlocked:false,launchable:false});
    save.unlockedStages.push('mtMoon');save.research.viridianWins=2;expect(resolveCampaignNode(first,save).completed).toBe(true);expect(resolveCampaignNode(campaignNode('mtMoon')!,save)).toMatchObject({unlocked:true,launchable:false});

  });
  it('reads actual progress without treating evolved discoveries as selectable starters',()=>{
    const save=freshSave();save.unlockedPokemon.push('ivysaur');save.pokedex.push('beedrill');save.research.viridianWins=3;save.best.viridian={level:17,defeated:50,time:120};
    expect(menuProfile(save)).toMatchObject({starters:3,totalStarters:3,clears:3,best:'LV 17 · 50 KO'});
  });
  it('adds defaults to existing v2 saves and changes settings without losing progress',()=>{
    const local=storage(),save=freshSave();save.research.viridianWins=7;save.unlockedStages.push('mtMoon');
    local.setItem('pokemon-survivors-save',JSON.stringify({...save,settings:{damageNumbers:false}}));
    expect(loadSave(local).settings).toEqual({damageNumbers:false,reducedMotion:false,screenShake:false});
    updateSettings({reducedMotion:true},local);expect(loadSave(local)).toMatchObject({unlockedStages:['viridian','mtMoon','pewterGym'],research:{viridianWins:7},settings:{reducedMotion:true,damageNumbers:false}});
  });
  it('improves best-run ties by defeated count then time, and preserves stronger records',()=>{
    const local=storage(),run={result:'defeat' as const,pokemon:'bulbasaur',stage:'viridian',level:10,defeated:20,time:100};
    recordRun(run,local);recordRun({...run,defeated:21},local);recordRun({...run,defeated:21,time:110},local);recordRun({...run,level:9,defeated:500,time:500},local);
    expect(loadSave(local).best.viridian).toEqual({level:10,defeated:21,time:110});
  });
  it('keeps legacy unlocks and research when a settings change migrates a v1 save',()=>{
    const local=storage();local.setItem('pokemon-survivors-save',JSON.stringify({version:1,unlockedPokemon:['bulbasaur','squirtle'],unlockedStages:['viridian','mtMoon'],research:{enemiesDefeated:120,viridianWins:2},lastRun:{result:'victory',pokemon:'venusaur',level:35,time:1800,defeated:120}}));
    updateSettings({damageNumbers:false},local);const migrated=loadSave(local);
    expect(migrated).toMatchObject({version:2,unlockedPokemon:['bulbasaur','squirtle','weedle'],unlockedStages:['viridian','mtMoon','pewterGym'],research:{enemiesDefeated:120,viridianWins:2},lastRun:{stage:'viridian'},settings:{damageNumbers:false}});
  });
  it('navigates visual columns and rows without focusing diagonal cards first',()=>{
    const boxes=[{left:0,top:0,width:200,height:60},{left:0,top:80,width:200,height:60},{left:500,top:0,width:300,height:200}];
    expect(spatialFocus(boxes,0,'down')).toBe(1);expect(spatialFocus(boxes,0,'right')).toBe(2);expect(spatialFocus(boxes,1,'up')).toBe(0);
    const arcade=[{left:468,top:310,width:344,height:78},{left:380,top:410,width:250,height:68},{left:650,top:410,width:250,height:68},{left:522,top:500,width:236,height:54}];
    expect(spatialFocus(arcade,0,'down')).toBe(1);expect(spatialFocus(arcade,1,'right')).toBe(2);expect(spatialFocus(arcade,2,'down')).toBe(3);
  });
});
