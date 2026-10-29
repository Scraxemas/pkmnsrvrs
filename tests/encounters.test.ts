import {describe,expect,it} from 'vitest';
import {encounterPhaseAt,ENCOUNTER_PHASES,weightedSpecies} from '../src/encounters';

describe('data-driven Viridian encounters',()=>{
  it('keeps the opening melee-only for normal and fast runs',()=>{
    for(const duration of [1800,90]){
      const phase=encounterPhaseAt(duration*.099,duration);
      expect(phase.id).toBe('opening');expect(phase.maxRanged).toBe(0);expect(phase.projectileCap).toBe(0);
      expect(new Set(phase.species.map(item=>item.id))).toEqual(new Set(['caterpie','weedle']));
    }
  });
  it('uses normalized phase timing in fast mode',()=>{
    for(const progress of [0,.1,.24,.41,.61,.81])expect(encounterPhaseAt(progress*90,90).id).toBe(encounterPhaseAt(progress*1800,1800).id);
  });
  it('introduces ranged budgets gradually',()=>{
    for(let index=1;index<ENCOUNTER_PHASES.length;index++){
      expect(ENCOUNTER_PHASES[index].maxRanged).toBeGreaterThanOrEqual(ENCOUNTER_PHASES[index-1].maxRanged);
      expect(ENCOUNTER_PHASES[index].projectileCap).toBeGreaterThanOrEqual(ENCOUNTER_PHASES[index-1].projectileCap);
    }
  });
  it('selects weighted species deterministically',()=>{
    const phase=ENCOUNTER_PHASES[2];expect(weightedSpecies(phase,.42)).toBe(weightedSpecies(phase,.42));
  });
});

