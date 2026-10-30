export interface PlayerSettings {damageNumbers:boolean;reducedMotion:boolean;screenShake:boolean;}
export const DEFAULT_SETTINGS:PlayerSettings={damageNumbers:true,reducedMotion:false,screenShake:false};
export const motionReduced=(settings:PlayerSettings)=>settings.reducedMotion||(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
