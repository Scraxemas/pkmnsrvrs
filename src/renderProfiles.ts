import {SPRITE_FRAMES} from './content';

export interface PokemonRenderProfile {
  groundAnchorY:number;
  scale:number;
  shadowWidth:number;
  shadowHeight:number;
  shadowOffsetY:number;
  elevation:number;
}

const profile=(groundAnchorY:number,scale:number,shadowWidth:number,shadowHeight=12,elevation=0):PokemonRenderProfile=>({groundAnchorY,scale,shadowWidth,shadowHeight,shadowOffsetY:2,elevation});

export const POKEMON_RENDER_PROFILES:Record<string,PokemonRenderProfile>={
  bulbasaur:profile(.750,2.15,36),ivysaur:profile(.812,2.25,42),venusaur:profile(.844,2.55,54,15),
  charmander:profile(.781,2.15,30),charmeleon:profile(.750,2.3,36),charizard:profile(.688,2.45,50,15),
  squirtle:profile(.750,2.15,31),wartortle:profile(.725,2.25,38),blastoise:profile(.775,2.5,52,15),
  caterpie:profile(.875,1.95,25,9),metapod:profile(.708,2.05,26,9),butterfree:profile(.554,2.1,34,11,-9),
  weedle:profile(.650,1.95,24,9),kakuna:profile(.625,2.05,25,9),beedrill:profile(.625,2.25,38,12,-8),
  pidgey:profile(.812,2.05,28,10),pidgeotto:profile(.700,2.25,38,12),
  pikachu:profile(.700,2.1,30,10),oddish:profile(.675,2.0,27,10),bellsprout:profile(.719,2.0,26,10),
};

export function renderProfile(species:string):PokemonRenderProfile {
  const frames=SPRITE_FRAMES[species];
  return POKEMON_RENDER_PROFILES[species]??profile(frames?.height?Math.min(.95,(frames.height-4)/frames.height):.8,2.1,32);
}
