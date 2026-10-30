import {KANTO_STAGE_ARTWORK} from './artwork';
export type CampaignKind='survival'|'gym'|'expedition'|'challenge'|'minigames'|'research'|'finale';
export type CampaignArt='forest'|'stoneGym'|'moon'|'waterGym'|'ship'|'electricGym'|'tunnel'|'rocket'|'grassGym'|'tower'|'safari'|'poisonGym'|'office'|'psychicGym'|'mansion'|'fireGym'|'groundGym'|'victory'|'league'|'cave'|'burrow'|'arcade'|'power'|'dojo'|'islands'|'lab'|'volcano'|'garden'|'bridge'|'harbor';
export type CampaignRequirement={kind:'clear';stage:string}|{kind:'discover';location:string};
export interface CampaignNode {
  id:string;name:string;route:'main'|'optional';kind:CampaignKind;region:string;boss:string;bossId:string;
  description:string;duration:number|[number,number]|null;art:CampaignArt;artwork?:string;badge?:string;
  implementation:'ready'|'development'|'planned';requires:CampaignRequirement[];parent?:string;visible?:boolean;reward?:string;nextRegion?:string;
}
export interface HiddenLocation {id:string;parent:string;name:string;}
export interface CampaignDefinition {id:string;name:string;trailName?:string;regionLabels?:readonly string[];mainOrder:readonly string[];nodes:readonly CampaignNode[];secrets:readonly HiddenLocation[];}

type StorySeed=[id:string,name:string,kind:CampaignKind,boss:string,bossId:string,art:CampaignArt,description:string,badge?:string];
const story:StorySeed[]=[
  ['viridian','Viridian Forest','survival','Beedrill','beedrill','forest','Survive the woodland and defeat Beedrill to complete the first milestone.'],
  ['pewterGym','Pewter Gym','gym','Brock','brock','stoneGym','A stone-walled Gym Rush at the foot of Mt. Moon.','Boulder Badge'],
  ['mtMoon','Mt. Moon','survival','Clefable','clefable','moon','Moonlit caverns, winding stone passages, and the secrets of ancient fossils.'],
  ['ceruleanGym','Cerulean Gym','gym','Misty','misty','waterGym','A water-filled Gym Rush beneath the blue roofs of Cerulean City.','Cascade Badge'],
  ['ssAnne','S.S. Anne','survival','Rival encounter','rival','ship','Board a grand ocean liner and brave its crowded decks before meeting your rival.'],
  ['vermilionGym','Vermilion Gym','gym','Lt. Surge','lt-surge','electricGym','An electric Gym Rush in the harbour city of Vermilion.','Thunder Badge'],
  ['rockTunnel','Rock Tunnel','expedition','Onix','onix','tunnel','A short story expedition through a dark mountain passage.'],
  ['rocketHideout','Rocket Hideout','survival','Arbok / Weezing','arbok-weezing','rocket','Follow Team Rocket below Celadon into a maze of guarded corridors.'],
  ['celadonGym','Celadon Gym','gym','Erika','erika','grassGym','A garden Gym Rush among flowering plants and towering greenery.','Rainbow Badge'],
  ['pokemonTower','Pokémon Tower','survival','Ghost Marowak','marowak','tower','Climb the quiet floors of Lavender Town’s haunted tower.'],
  ['safariZone','Safari Zone','survival','Kangaskhan','kangaskhan','safari','Explore wild grasslands, wooded trails, and distant watering holes.'],
  ['fuchsiaGym','Fuchsia Gym','gym','Koga','koga','poisonGym','A poison-themed Gym Rush full of carefully hidden paths.','Soul Badge'],
  ['silphCo','Silph Co.','survival','Nidoking','nidoking','office','Challenge Rocket’s occupation of Saffron’s towering research headquarters.'],
  ['saffronGym','Saffron Gym','gym','Sabrina','sabrina','psychicGym','A psychic Gym Rush through the strange chambers of Saffron.','Marsh Badge'],
  ['mansion','Pokémon Mansion','survival','Ditto','ditto','mansion','Search an abandoned island mansion and its forgotten experiments.'],
  ['cinnabarGym','Cinnabar Gym','gym','Blaine','blaine','fireGym','A fire-themed Gym Rush on the volcanic island of Cinnabar.','Volcano Badge'],
  ['viridianGym','Viridian Gym','gym','Giovanni','giovanni','groundGym','Return to Viridian for the last Gym Rush of your Kanto journey.','Earth Badge'],
  ['victoryRoad','Victory Road','survival','Machamp','machamp','victory','Cross rugged highland caves on the final approach to the Pokémon League.'],
  ['indigo','Indigo Plateau','finale','Elite Four / Champion','elite-four','league','Reach the Pokémon League and face Kanto’s greatest trainers.'],
  ['ceruleanCave','Cerulean Cave','survival','Mewtwo','mewtwo','cave','A hidden post-League cavern conceals an extraordinary psychic presence.'],
];
const main:CampaignNode[]=story.map(([id,name,kind,boss,bossId,art,description,badge],index)=>({
  id,name,route:'main',region:'Kanto',kind,boss,bossId,art,description,badge,duration:kind==='gym'?1200:id==='rockTunnel'?[600,720]:1800,
  implementation:id==='viridian'?'ready':id==='mtMoon'?'development':'planned',requires:index?[{kind:'clear',stage:story[index-1][0]}]:[],
  artwork:KANTO_STAGE_ARTWORK[id],...(id==='ceruleanCave'?{nextRegion:'Johto'}:{}),
}));
function optional(id:string,name:string,parent:string,kind:CampaignKind,boss:string,bossId:string,art:CampaignArt,description:string,extra:Partial<CampaignNode>={}):CampaignNode{
  return{id,name,parent,route:'optional',region:'Kanto',kind,boss,bossId,art,artwork:KANTO_STAGE_ARTWORK[id],description,duration:kind==='survival'?1800:kind==='expedition'?[600,720]:null,implementation:'planned',requires:[{kind:'clear',stage:parent}],...extra};
}
const branches:CampaignNode[]=[
  optional('diglettCave',"Diglett’s Cave",'vermilionGym','expedition','Diglett','diglett','burrow','An optional underground expedition linking the coast and the northern roads.'),
  optional('gameCorner','Celadon Game Corner','rocketHideout','minigames','Minigames','minigames','arcade','A future stop for games and small diversions in Celadon.'),
  optional('powerPlant','Power Plant','fuchsiaGym','survival','Zapdos','zapdos','power','An abandoned power station filled with electrical energy.'),
  optional('fightingDojo','Fighting Dojo','silphCo','challenge','Dojo trainers','dojo-trainers','dojo','A future trainer challenge in Saffron’s traditional fighting dojo.'),
  optional('seafoam','Seafoam Islands','saffronGym','survival','Articuno','articuno','islands','Icy island caverns and cold currents hide a legendary bird.'),
  optional('fossilLab','Cinnabar Fossil Lab','mansion','research','Research & fossil revival','fossil-research','lab','A future research stop for studying fossils and reviving ancient Pokémon.'),
  optional('mtEmber','Mt. Ember','cinnabarGym','survival','Moltres','moltres','volcano','Ascend an ash-covered volcanic trail toward a legendary encounter.'),
];
const starterTrails:CampaignNode[]=[
  optional('ceruleanGarden','Cerulean Garden','ceruleanGym','challenge','Bulbasaur rescue challenge','bulbasaur-rescue','garden','A future rescue challenge. This quest is not implemented.',{visible:false,reward:'Bulbasaur starter unlock · Future'}),
  optional('nuggetBridge','Nugget Bridge','ceruleanGym','challenge','Charmander trainer challenge','charmander-challenge','bridge','A future trainer challenge. This quest is not implemented.',{visible:false,reward:'Charmander starter unlock · Future'}),
  optional('vermilionHarbor','Vermilion Harbor','vermilionGym','challenge','Squirtle Squad challenge','squirtle-squad','harbor','A future Squirtle Squad challenge. This quest is not implemented.',{visible:false,reward:'Squirtle starter unlock · Future'}),
];
export const KANTO_CAMPAIGN:CampaignDefinition={id:'kanto',name:'Kanto',trailName:'The Indigo Trail',regionLabels:['THE FIRST BADGE','COASTAL ROADS','SHADOWS OF KANTO','ISLAND PASSAGES','THE LEAGUE AWAITS'],mainOrder:main.map(node=>node.id),nodes:[...main,...branches,...starterTrails],secrets:[
  {id:'mtMoonFossilChamber',parent:'mtMoon',name:'Mt. Moon Fossil Chamber'},
  {id:'mansionSecretLab',parent:'mansion',name:'Pokémon Mansion Secret Laboratory'},
]};
export const CAMPAIGN_KIND_LABELS:Record<CampaignKind,string>={survival:'Survival',gym:'Gym Rush',expedition:'Story Expedition',challenge:'Trainer Challenge',minigames:'Minigames',research:'Research',finale:'League Challenge'};
export const campaignNode=(id:string,campaign=KANTO_CAMPAIGN)=>campaign.nodes.find(node=>node.id===id);
export const visibleCampaignNodes=(campaign=KANTO_CAMPAIGN)=>campaign.nodes.filter(node=>node.visible!==false);
