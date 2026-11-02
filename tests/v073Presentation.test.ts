import {describe,expect,it} from 'vitest';
import {freshSave} from '../src/save';
import {expeditionBriefing} from '../src/ui/expeditionBriefing';
describe('v0.7.3 expedition presentation summaries',()=>{
 it('welcomes new players without inventing results or unlocks',()=>{
  expect(expeditionBriefing(freshSave())).toEqual({
   status:'EXPEDITION AVAILABLE',best:'NO RUN YET',clears:'00',
   discoveries:'00',lastResult:'BEGIN YOUR FIRST RUN'
  });
 });
 it('reflects real best-run, victory and discovered-location progress',()=>{
  const save=freshSave();
  save.research.viridianWins=3;save.best.viridian={time:794,level:23,defeated:214};
  save.lastRun={result:'victory',stage:'viridian',time:1800,level:30,defeated:180,pokemon:'charmander'};
  save.discoveredLocations=['viridian:entrance','viridian:pikachu-hollow','viridian:tm-cache:2,3'];
  expect(expeditionBriefing(save)).toEqual({
   status:'FOREST CONQUERED',best:'13:14 · LV 23',clears:'03',
   discoveries:'02',lastResult:'VICTORY · 30:00'
  });
 });
 it('does not count unrelated stages or unknown locations',()=>{
  const save=freshSave();
  save.lastRun={result:'defeat',stage:'pewterGym',time:90,level:4,defeated:12,pokemon:'squirtle'};
  save.discoveredLocations=['pewter:foyer','viridian:entrance'];
  expect(expeditionBriefing(save).lastResult).toBe('BEGIN YOUR FIRST RUN');
  expect(expeditionBriefing(save).discoveries).toBe('00');
 });
});
