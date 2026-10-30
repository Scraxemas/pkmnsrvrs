let lastRandomSeed:number|undefined;

/** Entropy is used once when a run starts; worldgen/combat stay fully seeded. */
export function seedForRun(search:string,explicit?:number,entropy=()=>crypto.getRandomValues(new Uint32Array(1))[0]){
  const parameter=new URLSearchParams(search).get('seed');
  const requested=explicit??(parameter!==null&&/^\d+$/.test(parameter)?Number(parameter):undefined);
  if(requested!==undefined&&Number.isFinite(requested))return requested>>>0;
  let seed=entropy()>>>0;if(seed===lastRandomSeed)seed=(seed+1)>>>0;lastRandomSeed=seed;return seed;
}
