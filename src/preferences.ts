import type {CanopyIntensity} from './forestCanopy';
export interface PlayerSettings {canopyIntensity:CanopyIntensity;damageNumbers:boolean;reducedMotion:boolean;screenShake:boolean;soundEffects:boolean;sfxVolume:number;}
export const DEFAULT_SETTINGS:PlayerSettings={damageNumbers:true,reducedMotion:false,screenShake:false,soundEffects:true,sfxVolume:.6,canopyIntensity:'standard'};
export const motionReduced=(settings:PlayerSettings)=>settings.reducedMotion||(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
