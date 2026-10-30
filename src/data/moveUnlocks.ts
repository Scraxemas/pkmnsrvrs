export interface TechnicalMachine {id:string;generation:'sv'|'gen1';number:number;moveId:string;label:string;}
const sv=(number:number,moveId:string):TechnicalMachine=>({id:`sv:${String(number).padStart(3,'0')}`,generation:'sv',number,moveId,label:`SV TM${String(number).padStart(3,'0')}`});
export const TECHNICAL_MACHINES:readonly TechnicalMachine[]=[
  sv(33,'magicalLeaf'),sv(159,'leafStorm'),sv(56,'bulletSeed'),sv(13,'acidSpray'),sv(45,'venoshock'),sv(148,'sludgeBomb'),sv(175,'toxic'),
  {id:'gen1:021',generation:'gen1',number:21,moveId:'megaDrain',label:'Generation I TM21'},
  sv(111,'gigaDrain'),sv(66,'bodySlam'),sv(119,'energyBall'),sv(49,'sunnyDay'),sv(137,'grassyTerrain'),sv(81,'grassKnot'),
  sv(194,'grassyGlide'),sv(20,'trailblaze'),sv(146,'grassPledge'),sv(155,'frenzyPlant'),sv(83,'poisonJab'),sv(133,'earthPower'),
  sv(149,'earthquake'),sv(7,'protect'),sv(88,'swordsDance'),sv(130,'helpingHand'),
];
export interface MoveUnlock {tm?:string;species?:readonly string[];rarity?:'rare';}
export const MOVE_UNLOCKS:Readonly<Record<string,MoveUnlock>>=Object.fromEntries([
  ...TECHNICAL_MACHINES.map(tm=>[tm.moveId,{tm:tm.id}]),
  ['petalDance',{species:['venusaur']}],
  ['frenzyPlant',{tm:'sv:155',species:['venusaur'],rarity:'rare'}],
  ['poisonJab',{tm:'sv:083',species:['venusaur']}],
  ['earthPower',{tm:'sv:133',species:['venusaur']}],
  ['earthquake',{tm:'sv:149',species:['venusaur']}],
]);
export const ALL_TM_IDS=TECHNICAL_MACHINES.map(tm=>tm.id);
export const tmForMove=(id:string)=>TECHNICAL_MACHINES.find(tm=>tm.moveId===id);
export const tmLabel=(id:string)=>TECHNICAL_MACHINES.find(tm=>tm.id===id)?.label??id;
/** A deliberately small research demonstration, independent of run RNG. */
export const TM_RESEARCH_REWARDS=[
  {research:'caterpie',count:25,tm:'sv:056',label:'Seed Study'},
  {research:'weedle',count:25,tm:'sv:013',label:'Poison Study'},
] as const;
