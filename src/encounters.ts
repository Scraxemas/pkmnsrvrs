export interface EncounterPhase {
  id:'opening'|'introduction'|'midgame'|'escalation'|'pressure'|'finale';
  start:number;
  species:readonly {id:string;weight:number}[];
  spawnInterval:number;
  maxAlive:number;
  maxRanged:number;
  projectileCap:number;
  eliteEligible:boolean;
}

export const ENCOUNTER_PHASES:readonly EncounterPhase[]=[
  {id:'opening',start:0,species:[{id:'caterpie',weight:55},{id:'weedle',weight:45}],spawnInterval:1.35,maxAlive:70,maxRanged:0,projectileCap:0,eliteEligible:false},
  {id:'introduction',start:.10,species:[{id:'caterpie',weight:42},{id:'weedle',weight:38},{id:'pidgey',weight:8},{id:'metapod',weight:6},{id:'kakuna',weight:6}],spawnInterval:1.15,maxAlive:90,maxRanged:3,projectileCap:6,eliteEligible:false},
  {id:'midgame',start:7/30,species:[{id:'caterpie',weight:28},{id:'weedle',weight:28},{id:'pidgey',weight:18},{id:'metapod',weight:13},{id:'kakuna',weight:13}],spawnInterval:.95,maxAlive:120,maxRanged:8,projectileCap:14,eliteEligible:true},
  {id:'escalation',start:.40,species:[{id:'weedle',weight:25},{id:'pidgey',weight:22},{id:'metapod',weight:12},{id:'kakuna',weight:12},{id:'butterfree',weight:9},{id:'caterpie',weight:20}],spawnInterval:.78,maxAlive:155,maxRanged:13,projectileCap:22,eliteEligible:true},
  {id:'pressure',start:.60,species:[{id:'weedle',weight:25},{id:'pidgey',weight:25},{id:'butterfree',weight:14},{id:'metapod',weight:10},{id:'kakuna',weight:10},{id:'caterpie',weight:16}],spawnInterval:.62,maxAlive:190,maxRanged:18,projectileCap:30,eliteEligible:true},
  {id:'finale',start:.80,species:[{id:'weedle',weight:27},{id:'pidgey',weight:24},{id:'butterfree',weight:18},{id:'metapod',weight:8},{id:'kakuna',weight:8},{id:'caterpie',weight:15}],spawnInterval:.48,maxAlive:230,maxRanged:24,projectileCap:38,eliteEligible:true},
] as const;

export function encounterPhaseAt(elapsed:number,duration:number){
  const progress=Math.max(0,Math.min(1,duration>0?elapsed/duration:0));
  let phase=ENCOUNTER_PHASES[0];
  for(const candidate of ENCOUNTER_PHASES)if(progress>=candidate.start)phase=candidate;
  return phase;
}

export function weightedSpecies(phase:EncounterPhase,roll:number){
  const total=phase.species.reduce((sum,item)=>sum+item.weight,0);
  let cursor=Math.max(0,Math.min(.999999,roll))*total;
  for(const item of phase.species){cursor-=item.weight;if(cursor<0)return item.id;}
  return phase.species[phase.species.length-1].id;
}

