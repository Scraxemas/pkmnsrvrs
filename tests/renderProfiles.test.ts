import {describe,expect,it} from 'vitest';
import {SPRITE_FRAMES} from '../src/content';
import {POKEMON_RENDER_PROFILES,renderProfile} from '../src/renderProfiles';

describe('species rendering profiles',()=>{
  it('covers every loaded PMD walk sheet with eight measured anchors',()=>{
    for(const species of Object.keys(SPRITE_FRAMES)){
      const profile=renderProfile(species);
      expect(profile.groundAnchors,`${species} anchors`).toHaveLength(8);
      expect(profile.groundAnchors.every(anchor=>anchor>=.45&&anchor<=.9),`${species} anchor bounds`).toBe(true);
      expect(profile.scale).toBeGreaterThan(1);
      expect(profile.shadowWidth).toBeGreaterThan(20);
    }
  });
  it.each(['bulbasaur','ivysaur','venusaur','charmander','charmeleon','charizard','squirtle','wartortle','blastoise','caterpie','pidgey','beedrill'])('%s has an explicit profile',species=>expect(POKEMON_RENDER_PROFILES[species]).toBeDefined());
  it('uses Bulbasaur direction-specific padding instead of one global offset',()=>expect(new Set(renderProfile('bulbasaur').groundAnchors).size).toBeGreaterThan(1));
});
