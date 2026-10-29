import {Facing} from './direction';

export type PokemonAnimationState='idle'|'walk'|'attack'|'hit'|'stun'|'evolution'|'defeat';

const PRIORITY:Record<PokemonAnimationState,number>={idle:0,walk:1,attack:2,hit:3,stun:4,evolution:5,defeat:6};
const DEFAULT_DURATION:Record<PokemonAnimationState,number>={idle:0,walk:0,attack:.18,hit:.12,stun:.35,evolution:1.8,defeat:99};

export interface AnimationDecision {
  state:PokemonAnimationState;
  facing:Facing;
  moving:boolean;
  changed:boolean;
}

export class PokemonAnimationController {
  state:PokemonAnimationState='idle';
  facing:Facing='south';
  lockUntil=0;
  revision=0;
  species:string;

  constructor(species:string){this.species=species;}

  setSpecies(species:string){
    if(species===this.species)return;
    this.species=species;this.state='idle';this.lockUntil=0;this.revision++;
  }

  trigger(state:PokemonAnimationState,now:number,duration=DEFAULT_DURATION[state]){
    const locked=now<this.lockUntil;
    if(locked&&PRIORITY[state]<PRIORITY[this.state])return false;
    if(state!==this.state||duration>0){this.state=state;this.lockUntil=duration>0?now+duration:0;this.revision++;}
    return true;
  }

  update(now:number,facing:Facing,speed:number,movementThreshold=4):AnimationDecision {
    const moving=speed>=movementThreshold;
    const wasState=this.state,wasFacing=this.facing;
    this.facing=facing;
    if(now>=this.lockUntil||PRIORITY[this.state]<=PRIORITY.walk){
      this.state=moving?'walk':'idle';
      this.lockUntil=0;
    }
    const changed=wasState!==this.state||wasFacing!==this.facing;
    if(changed)this.revision++;
    return{state:this.state,facing:this.facing,moving,changed};
  }
}

