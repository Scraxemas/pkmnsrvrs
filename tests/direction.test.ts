import {describe,expect,it} from 'vitest';
import {FACINGS,facingFromVector,facingRow} from '../src/direction';

describe('PMD eight-direction mapping',()=>{
  it.each([
    [0,1,'south'],[1,1,'southeast'],[1,0,'east'],[1,-1,'northeast'],
    [0,-1,'north'],[-1,-1,'northwest'],[-1,0,'west'],[-1,1,'southwest'],
  ] as const)('maps vector (%i,%i) to %s',(x,y,facing)=>expect(facingFromVector(x,y)).toBe(facing));
  it('maps each facing to the PMD sheet row',()=>expect(FACINGS.map(facingRow)).toEqual([0,1,2,3,4,5,6,7]));
  it('retains the last facing while idle',()=>expect(facingFromVector(0,0,'northwest')).toBe('northwest'));
});
