import type {PlayerSettings} from './preferences';

export type GameCue='xp'|'level'|'evolution'|'tm'|'reward'|'fusion'|'major-attack'|'boss-warning'|'boss-windup'|'boss-attack'|'boss-phase'|'victory'|'defeat';
type Tone={frequency:number;duration:number;offset?:number;shape?:OscillatorType;gain?:number;endFrequency?:number};
const NOTES:Readonly<Record<GameCue,readonly Tone[]>>={
 xp:[{frequency:740,duration:.075,endFrequency:900,gain:.32}],
 level:[{frequency:520,duration:.11},{frequency:670,duration:.12,offset:.105},{frequency:880,duration:.20,offset:.21}],
 evolution:[{frequency:300,duration:.22,endFrequency:560},{frequency:560,duration:.25,offset:.19,endFrequency:940},{frequency:940,duration:.33,offset:.40}],
 tm:[{frequency:640,duration:.13},{frequency:960,duration:.13,offset:.11},{frequency:1280,duration:.24,offset:.22}],
 reward:[{frequency:480,duration:.10},{frequency:720,duration:.13,offset:.10},{frequency:980,duration:.22,offset:.22}],
 fusion:[{frequency:220,duration:.19,shape:'sawtooth',endFrequency:430},{frequency:660,duration:.26,offset:.12}],
 'major-attack':[{frequency:150,duration:.16,shape:'sawtooth',endFrequency:70,gain:.45}],
 'boss-warning':[{frequency:210,duration:.40,shape:'triangle',endFrequency:140},{frequency:180,duration:.35,offset:.4,shape:'triangle',endFrequency:120}],
 'boss-windup':[{frequency:190,duration:.32,shape:'sawtooth',endFrequency:370,gain:.26}],
 'boss-attack':[{frequency:170,duration:.18,shape:'sawtooth',endFrequency:75,gain:.36}],
 'boss-phase':[{frequency:350,duration:.2,endFrequency:245},{frequency:275,duration:.31,offset:.18,endFrequency:185}],
 victory:[{frequency:520,duration:.17},{frequency:660,duration:.17,offset:.16},{frequency:790,duration:.17,offset:.32},{frequency:1040,duration:.40,offset:.48}],
 defeat:[{frequency:360,duration:.21,endFrequency:290},{frequency:260,duration:.38,offset:.2,endFrequency:150}],
};
const MIN_INTERVAL:Partial<Record<GameCue,number>>={xp:90,'major-attack':230,'boss-windup':320,'boss-attack':300};
let context:AudioContext|undefined;
const lastPlayed=new Map<GameCue,number>();
/** Small original synthesized SFX. Never touches game RNG or the fixed simulation tick. */
export function playGameCue(cue:GameCue,settings:PlayerSettings){
 if(!settings.soundEffects||settings.sfxVolume<=0||typeof AudioContext==='undefined')return false;
 const now=typeof performance==='undefined'?Date.now():performance.now(),previous=lastPlayed.get(cue)??-Infinity;
 if(now-previous<(MIN_INTERVAL[cue]??60))return false;
 try{
  context??=new AudioContext();
  if(context.state==='suspended')void context.resume().catch(()=>{});
  const time=context.currentTime,volume=Math.max(0,Math.min(1,settings.sfxVolume));
  for(const tone of NOTES[cue]){
   const start=time+(tone.offset??0),end=start+tone.duration;
   const oscillator=context.createOscillator(),envelope=context.createGain();
   oscillator.type=tone.shape??'sine';oscillator.frequency.setValueAtTime(tone.frequency,start);
   if(tone.endFrequency)oscillator.frequency.exponentialRampToValueAtTime(tone.endFrequency,end);
   envelope.gain.setValueAtTime(.0001,start);
   envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,volume*.11*(tone.gain??1)),start+.012);
   envelope.gain.exponentialRampToValueAtTime(.0001,end);
   oscillator.connect(envelope).connect(context.destination);
   oscillator.start(start);oscillator.stop(end+.02);
   oscillator.onended=()=>{oscillator.disconnect();envelope.disconnect();};
  }
  lastPlayed.set(cue,now);return true;
 }catch{return false;}
}
