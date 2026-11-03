import type {MoveDef,RankEffect} from '../content';
export const CATERPIE_FAMILY=['caterpie','metapod','butterfree'] as const;
export const CATERPIE_MOVE_CATALOG=['stringShot','infestation','harden','gust','sleepPowder','psychic','bugBuzz','quiverDance','dreamEater','pollenPuff'] as const;
const attack:RankEffect[]=[{},{damage:1.15},{count:2},{cooldown:.9},{damage:1.25,range:1.15}];
const area:RankEffect[]=[{},{damage:1.15},{area:1.25,count:2},{cooldown:.88},{damage:1.25,area:1.45,count:3}];
const support:RankEffect[]=[{duration:1},{duration:1.2},{cooldown:.9},{duration:1.4},{cooldown:.85,duration:1.6}];
const def=(id:string,name:string,type:MoveDef['type'],damageClass:MoveDef['damageClass'],kind:MoveDef['kind'],power:number,cooldown:number,range:number,description:string,ranks:RankEffect[]=attack):MoveDef=>({id,name,type,damageClass,kind,power,cooldown,range,description,ranks:ranks.map(rank=>({...rank}))});
export const CATERPIE_MOVES:Record<string,MoveDef>={
 stringShot:def('stringShot','String Shot','Bug','Status','projectile',0,2.2,250,'Binding threads hinder enemies; evolves ordinarily into Infestation.',[{count:2},{count:3},{range:1.15},{cooldown:.84,count:4},{count:5,duration:1.3}]),
 infestation:def('infestation','Infestation','Bug','Special','cloud',24,3.3,225,'A damaging, lingering bug swarm.',area),
 harden:def('harden','Harden','Normal','Status','cloud',0,8,110,'Metapod evolution reward: a nonstacking defensive shell.',support),
 gust:def('gust','Gust','Flying','Special','piercing',24,1.3,315,'Butterfree evolution reward: piercing currents of wind.',[{pierce:3},{range:1.15,pierce:4},{damage:1.2},{cooldown:.88,pierce:5},{damage:1.25,pierce:7}]),
 psychic:def('psychic','Psychic','Psychic','Special','projectile',37,1.8,320,'Seeking psychic blasts disrupt defenses.'),
 bugBuzz:def('bugBuzz','Bug Buzz','Bug','Special','cloud',43,2.7,245,'A wide, resonant Bug-type shockwave.',area),
 quiverDance:def('quiverDance','Quiver Dance','Bug','Status','cloud',0,9,110,'Timed special-offense and resistance boost without stacking.',support),
 dreamEater:def('dreamEater','Dream Eater','Psychic','Special','drain',64,2.8,320,'Sleep Powder + Psychic fusion: briefly lulls foes to sleep, then drains their health.',[{count:2},{damage:1.15},{count:3},{cooldown:.88},{damage:1.3,count:4}]),
 pollenPuff:def('pollenPuff','Pollen Puff','Bug','Special','projectile',57,3.4,310,'Bug Buzz + Quiver Dance fusion: explosive pollen with bounded healing.',area)
};
