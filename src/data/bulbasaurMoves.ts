import type {MoveDef,RankEffect} from '../content';

export const BULBASAUR_FAMILY=['bulbasaur','ivysaur','venusaur'] as const;
/** Approved family catalog, including every chain tier and each fusion result once. */
export const BULBASAUR_MOVE_CATALOG=[
  'vineWhip','powerWhip','magicalLeaf','leafStorm','bulletSeed','seedBomb',
  'acidSpray','venoshock','sludgeBomb','poisonPowder','toxic','leechSeed','megaDrain','gigaDrain',
  'tackle','takeDown','bodySlam','razorLeaf','petalDance','petalBlizzard','energyBall','sunnyDay','solarBeam',
  'sludgeWave','synthesis','grassyTerrain','ingrain','grassKnot','grassyGlide','trailblaze','grassPledge',
  'frenzyPlant','poisonJab','earthPower','earthquake','growl','growth','sleepPowder','sweetScent',
  'worrySeed','protect','swordsDance','helpingHand',
] as const;
const direct:RankEffect[]=[{},{damage:1.15},{count:2},{cooldown:.88},{damage:1.2,range:1.15}];
const area:RankEffect[]=[{},{damage:1.15},{area:1.2},{cooldown:.9},{damage:1.2,count:3}];
const support:RankEffect[]=[{duration:1},{duration:1.15},{cooldown:.9},{range:1.15},{duration:1.3}];
const define=(id:string,name:string,type:MoveDef['type'],damageClass:MoveDef['damageClass'],kind:MoveDef['kind'],power:number,cooldown:number,range:number,description:string,ranks=damageClass==='Status'?support:direct,status?:MoveDef['status']):MoveDef=>({id,name,type,damageClass,kind,power,cooldown,range,description,ranks:ranks.map(rank=>({...rank})),...(status?{status}:{})});
/** Existing v0.4.3 definitions retain their values; only missing moves live here. */
export const BULBASAUR_ADDITIONAL_MOVES:Record<string,MoveDef>={
  powerWhip:define('powerWhip','Power Whip','Grass','Physical','sweep',38,1.25,195,'A heavy sweeping vine snaps across a broad line of foes.',area),
  magicalLeaf:define('magicalLeaf','Magical Leaf','Grass','Special','projectile',26,.95,300,'Glowing leaves home into nearby targets.'),
  leafStorm:define('leafStorm','Leaf Storm','Grass','Special','spin',48,4.5,260,'A powerful leaf cyclone followed by a brief offensive recovery.',area),
  bulletSeed:define('bulletSeed','Bullet Seed','Grass','Physical','spread',9,.7,290,'A rapid burst of small physical seeds.',[{count:3},{count:4},{damage:1.15},{cooldown:.85},{count:6,range:1.15}]),
  seedBomb:define('seedBomb','Seed Bomb','Grass','Physical','projectile',38,1.8,320,'A heavy seed explodes into a physical blast.',area),
  acidSpray:define('acidSpray','Acid Spray','Poison','Special','spread',17,1.2,220,'Corrosive droplets briefly weaken enemy defenses.'),
  venoshock:define('venoshock','Venoshock','Poison','Special','projectile',34,1.3,250,'A toxic burst deals amplified damage to poisoned targets.'),
  sludgeBomb:define('sludgeBomb','Sludge Bomb','Poison','Special','projectile',46,2.2,280,'Explosive sludge splashes poison across clustered enemies.',area,'poison'),
  toxic:define('toxic','Toxic','Poison','Status','cloud',0,4,150,'Severe poison escalates over a limited duration.',support,'poison'),
  megaDrain:define('megaDrain','Mega Drain','Grass','Special','drain',24,1.7,240,'Damaging energy tendrils return a bounded portion of HP.'),
  gigaDrain:define('gigaDrain','Giga Drain','Grass','Special','drain',38,2.2,285,'Several draining tendrils absorb HP from multiple enemies.',[{count:3},{damage:1.15},{count:4},{cooldown:.9},{count:5,damage:1.2}]),
  takeDown:define('takeDown','Take Down','Normal','Physical','charge',32,1.2,110,'A forceful short charge with modest nonlethal recoil.'),
  bodySlam:define('bodySlam','Body Slam','Normal','Physical','spin',42,2.5,145,'A broad radial body impact knocks nearby foes away.',area),
  petalDance:define('petalDance','Petal Dance','Grass','Special','spin',25,2.8,190,'Swirling petals repeatedly strike a nearby circle.',area),
  petalBlizzard:define('petalBlizzard','Petal Blizzard','Grass','Physical','spin',65,3.1,250,'Fusion: a massive circular storm of cutting petals.',area),
  energyBall:define('energyBall','Energy Ball','Grass','Special','projectile',34,1.5,330,'A concentrated Grass-energy sphere bursts on impact.'),
  sunnyDay:define('sunnyDay','Sunny Day','Fire','Status','cloud',0,10,150,'Timed sunlight strengthens compatible Grass attacks.'),
  solarBeam:define('solarBeam','Solar Beam','Grass','Special','piercing',82,5.5,620,'Fusion: sunlight charges a devastating piercing beam.',[{pierce:8},{damage:1.15},{pierce:10},{cooldown:.9},{damage:1.2,pierce:12}]),
  sludgeWave:define('sludgeWave','Sludge Wave','Poison','Special','cloud',68,4,260,'Fusion: an expanding toxic shockwave inflicts escalating poison.',area,'poison'),
  synthesis:define('synthesis','Synthesis','Grass','Status','drain',0,8,120,'Periodic recovery restores a limited amount of maximum HP.'),
  grassyTerrain:define('grassyTerrain','Grassy Terrain','Grass','Status','cloud',0,12,125,'A temporary healing field supports the Pokémon within it.'),
  ingrain:define('ingrain','Ingrain','Grass','Status','cloud',0,8,115,'Fusion: reforming roots follow the player, healing and softening damage.'),
  grassKnot:define('grassKnot','Grass Knot','Grass','Special','sweep',28,1.8,230,'Entangling plants deal more damage to large foes and briefly slow them.'),
  grassyGlide:define('grassyGlide','Grassy Glide','Grass','Physical','charge',27,.8,105,'A quick advancing grass strike brushes through close enemies.'),
  trailblaze:define('trailblaze','Trailblaze','Grass','Physical','charge',20,1.35,115,'A moving physical strike grants a short, capped speed benefit.'),
  grassPledge:define('grassPledge','Grass Pledge','Grass','Special','sweep',35,2.3,280,'Several plant-energy columns erupt at enemy positions.',area),
  frenzyPlant:define('frenzyPlant','Frenzy Plant','Grass','Special','sweep',95,9,350,'Rare ultimate: immense root eruptions followed by a long recovery.',area),
  poisonJab:define('poisonJab','Poison Jab','Poison','Physical','slash',36,1.1,100,'A sharp physical toxic strike can poison its target.',direct,'poison'),
  earthPower:define('earthPower','Earth Power','Ground','Special','sweep',46,2.8,280,'Focused columns of earth energy erupt beneath selected foes.',area),
  earthquake:define('earthquake','Earthquake','Ground','Physical','spin',53,3.8,230,'A broad physical ground shock strikes a surrounding ring.',area),
  growl:define('growl','Growl','Normal','Status','cloud',0,6,150,'Nearby enemies briefly deal less damage.'),
  growth:define('growth','Growth','Normal','Status','cloud',0,9,120,'Temporarily raises Physical and Special offense without stacking.'),
  sleepPowder:define('sleepPowder','Sleep Powder','Grass','Status','cloud',0,6.5,135,'Sleep spores stop ordinary foes briefly; bosses resist control.'),
  sweetScent:define('sweetScent','Sweet Scent','Normal','Status','cloud',0,7,180,'A sweet haze briefly weakens nearby enemy resistance.'),
  worrySeed:define('worrySeed','Worry Seed','Grass','Status','projectile',0,5,260,'Disruptive seeds briefly weaken an enemy and its movement.'),
  protect:define('protect','Protect','Normal','Status','cloud',0,8,100,'A brief defensive barrier absorbs a capped amount of damage.'),
  swordsDance:define('swordsDance','Swords Dance','Normal','Status','cloud',0,10,100,'A timed stance increases Physical damage without infinite stacking.'),
  helpingHand:define('helpingHand','Helping Hand','Normal','Status','cloud',0,10,150,'A capped ally-ready offensive boost also benefits the solo user.'),
};
