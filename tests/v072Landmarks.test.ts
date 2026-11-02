import {describe,it,expect} from 'vitest';
import {landmarkDiscoveryLabel,landmarkKind} from '../src/landmarkPresentation';
import {generateMap,syncWorldChunks} from '../src/worldgen';
import {POKEMON} from '../src/content';
import {discoverNearbyForest,makeState} from '../src/simulation';
describe('v0.7.2 landmark presentation',()=>{
 it('has distinctive visual plans and short, temporary discovery labels',()=>{
  expect(landmarkKind('pikachu-hollow')).toBe('pikachu');
  expect(landmarkKind('beedrill-nest')).toBe('nest');
  expect(landmarkKind('pewter-exit')).toBe('pewter');
  expect(landmarkKind('ancient-tree:-9,12')).toBe('ancient');
  expect(landmarkKind('campsite:-4,7')).toBe('camp');
  expect(landmarkKind('tm-cache:1,2')).toBe('cache');
  expect(landmarkDiscoveryLabel('pikachu-hollow')).toBe('PIKACHU HOLLOW');
  expect(landmarkDiscoveryLabel('tm-cache:1,2')).toBeNull();
  expect(landmarkDiscoveryLabel('entrance')).toBeNull();
 });
 it('keeps landmark discoveries single-use even after chunk streaming',()=>{
  for(const seed of [5,1337,24680]){
   const map=generateMap(seed),state=makeState(POKEMON.charmander,seed,map);
   const target=map.landmarks.find(l=>l.id==='pikachu-hollow')!;
   syncWorldChunks(map,target.x,target.y);
   Object.assign(state.player,{x:target.x,y:target.y,vx:0,vy:0});
   const first=discoverNearbyForest(state);
   expect(first).toContain(target.id);
   expect(discoverNearbyForest(state)).not.toContain(target.id);
   syncWorldChunks(map,80000,-65000);
   syncWorldChunks(map,target.x,target.y);
   expect(discoverNearbyForest(state)).not.toContain(target.id);
   expect(state.world.stream!.persistent.discoveries).toContain(target.id);
  }
 });
});
