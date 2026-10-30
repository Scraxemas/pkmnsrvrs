import type {PokemonDef} from './content';

/** Level-one values before run upgrades. Movement uses world pixels per second. */
export function startingStats(pokemon:PokemonDef){
  return{hp:pokemon.stats.hp*3,attack:pokemon.stats.attack,specialAttack:pokemon.stats.specialAttack,speed:pokemon.speed};
}
