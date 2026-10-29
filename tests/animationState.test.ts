import {describe,expect,it} from 'vitest';
import {PokemonAnimationController} from '../src/animationState';

describe('Pokémon animation state controller',()=>{
  it('transitions idle → walk → idle without restarting stable states',()=>{
    const controller=new PokemonAnimationController('bulbasaur');
    expect(controller.update(0,'south',0).state).toBe('idle');
    const revision=controller.revision;
    expect(controller.update(.1,'south',120).state).toBe('walk');
    const walkingRevision=controller.revision;
    controller.update(.2,'south',120);
    expect(controller.revision).toBe(walkingRevision);
    expect(controller.update(.3,'south',0).state).toBe('idle');
    expect(controller.revision).toBeGreaterThan(revision);
  });
  it('preserves higher-priority actions before returning to movement',()=>{
    const controller=new PokemonAnimationController('bulbasaur');controller.update(0,'north',100);controller.trigger('attack',.1,.2);
    expect(controller.update(.2,'east',100).state).toBe('attack');
    expect(controller.update(.31,'east',100).state).toBe('walk');
    controller.trigger('evolution',.4,1);expect(controller.trigger('hit',.5,.1)).toBe(false);expect(controller.update(.6,'east',100).state).toBe('evolution');
  });
  it('rejects collision jitter and keeps the last facing',()=>{
    const controller=new PokemonAnimationController('caterpie');
    expect(controller.update(0,'northwest',3.9).state).toBe('idle');
    expect(controller.facing).toBe('northwest');
  });
});

