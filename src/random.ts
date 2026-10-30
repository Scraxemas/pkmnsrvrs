export class RNG {constructor(public seed:number){}next(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}int(max:number){return Math.floor(this.next()*max);}}
export function seededRoll(state:{seed:number}){const rng=new RNG(state.seed),value=rng.next();state.seed=rng.seed;return value;}
