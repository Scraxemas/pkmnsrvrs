import {SPRITE_FRAMES} from './content';

export interface PokemonRenderProfile {
  groundAnchorY:number;
  groundAnchors:readonly [number,number,number,number,number,number,number,number];
  scale:number;
  shadowWidth:number;
  shadowHeight:number;
  shadowOffsetY:number;
  elevation:number;
}

type Anchors=PokemonRenderProfile['groundAnchors'];
const profile=(groundAnchors:Anchors,scale:number,shadowWidth:number,shadowHeight=12,elevation=0):PokemonRenderProfile=>({groundAnchorY:groundAnchors[0],groundAnchors,scale,shadowWidth,shadowHeight,shadowOffsetY:2,elevation});

export const POKEMON_RENDER_PROFILES:Record<string,PokemonRenderProfile>={
  bulbasaur:profile([.675,.650,.650,.675,.675,.675,.650,.650],2.15,36),ivysaur:profile([.750,.750,.719,.719,.719,.719,.719,.750],2.25,42),venusaur:profile([.812,.781,.750,.781,.719,.781,.750,.781],2.55,54,15),
  charmander:profile([.688,.719,.719,.688,.750,.688,.719,.719],2.15,30),charmeleon:profile([.688,.719,.719,.688,.719,.688,.719,.719],2.3,36),charizard:profile([.625,.625,.625,.625,.667,.625,.625,.625],2.45,50,15),
  squirtle:profile([.656,.688,.688,.719,.688,.719,.688,.688],2.15,31),wartortle:profile([.675,.675,.675,.675,.650,.675,.675,.675],2.25,38),blastoise:profile([.625,.675,.700,.700,.775,.700,.700,.675],2.5,52,15),
  caterpie:profile([.688,.719,.656,.781,.812,.781,.656,.719],1.95,25,9),metapod:profile([.625,.625,.625,.625,.667,.625,.625,.625],2.05,26,9),butterfree:profile([.518,.518,.500,.500,.464,.500,.500,.518],2.1,34,11,-9),
  weedle:profile([.625,.625,.625,.600,.625,.600,.625,.625],1.95,24,9),kakuna:profile([.600,.600,.600,.600,.600,.600,.600,.600],2.05,25,9),beedrill:profile([.562,.583,.542,.521,.500,.521,.542,.583],2.25,38,12,-8),
  pidgey:profile([.719,.750,.719,.719,.688,.719,.719,.750],2.05,28,10),pidgeotto:profile([.650,.650,.650,.650,.650,.650,.650,.650],2.25,38,12),
  pikachu:profile([.625,.675,.650,.650,.650,.650,.650,.675],2.1,30,10),oddish:profile([.650,.675,.650,.625,.625,.625,.650,.675],2.0,27,10),bellsprout:profile([.625,.656,.688,.688,.656,.688,.688,.656],2.0,26,10),
};

export function renderProfile(species:string):PokemonRenderProfile {
  const frames=SPRITE_FRAMES[species];
  const fallback=frames?.height?Math.min(.95,(frames.height-4)/frames.height):.8;
  return POKEMON_RENDER_PROFILES[species]??profile([fallback,fallback,fallback,fallback,fallback,fallback,fallback,fallback],2.1,32);
}
