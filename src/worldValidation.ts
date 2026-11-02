import {collides,StageMap,validateMap} from './worldgen';
import {buildFlowField} from './navigation';
import {decorationTerrainCompatible,decorationVisual} from './worldPresentation';
import {TERRAIN} from './terrain';

export function terrainFingerprint(map:StageMap){let h=2166136261;for(const value of map.terrain.cells){h^=value;h=Math.imul(h,16777619);}return(h>>>0).toString(16);}

/** Open-world acceptance: traversal and collision budget, not trail connectivity. */
export function validateForest(map:StageMap){
 const errors=[...validateMap(map).errors],field=buildFlowField(map,map.playerStart.x,map.playerStart.y,64);
 const walkableFraction=field.walkable.reduce((sum,v)=>sum+v,0)/field.walkable.length;
 const connected=field.distances.reduce((sum,v)=>sum+Number(v>=0),0)/field.distances.length;
 if(walkableFraction<.94)errors.push('too-many-obstacles');
 if(connected<.94)errors.push('inaccessible-open-ground');
 if(map.terrain.cells.some(value=>value===TERRAIN.cliff))errors.push('cliff-wall-in-open-forest');
 if(map.terrain.cells.some(value=>value===TERRAIN.water))errors.push('blocked-water-in-open-forest');
 const solid=map.decorations.filter(d=>d.solid);
 if(solid.length>85)errors.push('too-many-solid-props');
 for(let i=0;i<solid.length;i++)for(let j=i+1;j<solid.length;j++)
  if(Math.hypot(solid[i].x-solid[j].x,solid[i].y-solid[j].y)<solid[i].collisionRadius+solid[j].collisionRadius+48)
   errors.push('solid-props-too-close');
 for(const d of map.decorations){
  if(!decorationTerrainCompatible(d.id,TERRAIN.grass))errors.push('invalid-decoration');
  const asset=decorationVisual(d.id,d.x,d.y,map.seed,d.radius).name;
  if(d.id==='landRock'&&!asset.includes('land_'))errors.push('aquatic-land-rock');
 }
 if(collides(map,map.playerStart.x,map.playerStart.y,24))errors.push('blocked-player-start');
 return{valid:errors.length===0,errors:[...new Set(errors)],terrain:terrainFingerprint(map),
  walkableFraction,counts:{ponds:map.features.ponds.length,cliffs:map.features.cliffs.length,
   camps:map.features.camps.length,clearings:map.features.clearings.length}};
}
