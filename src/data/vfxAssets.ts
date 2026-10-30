/** Original generated combat frames; each sheet has isolated horizontal cells. */
export interface VfxAsset {path:string;frameWidth:number;frameHeight:number;frames:number;frameRate:number;}
const names=['slash','vine','leaf','seed','poison','drain','bloom','beam','root','impact','fire','water','aura','ground','petal','toxicWave','bubble','dragonEnergy','grassEnergy'] as const;
export const VFX_ASSETS:Readonly<Record<string,VfxAsset>>=Object.freeze(Object.fromEntries(names.map(name=>[name,{path:`assets/vfx/${name}.png`,frameWidth:name==='beam'?128:64,frameHeight:64,frames:4,frameRate:12}])));
