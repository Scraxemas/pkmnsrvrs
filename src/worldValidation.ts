import {collides,StageMap,validateMap} from './worldgen';
import {buildFlowField} from './navigation';
import {decorationTerrainCompatible,decorationVisual} from './worldPresentation';
import {TERRAIN,terrainAtWorld} from './terrain';

export function terrainFingerprint(map:StageMap){let h=2166136261;for(const value of map.terrain.cells){h^=value;h=Math.imul(h,16777619);}return(h>>>0).toString(16);}

export function validateForest(map:StageMap){
  const errors=[...validateMap(map).errors],field=buildFlowField(map,map.playerStart.x,map.playerStart.y,64);
  const reachable=(x:number,y:number)=>{
    if(collides(map,x,y,14))return false;
    const cx=Math.floor(x/64),cy=Math.floor(y/64);
    for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const i=(cy+oy)*field.cols+cx+ox;if(field.distances[i]>=0)return true;}return false;
  };
  for(const landmark of map.landmarks.filter(l=>l.id==='clearing'||l.id==='campsite'))if(!reachable(landmark.x,landmark.y))errors.push(`unreachable-${landmark.id}`);
  for(const camp of map.features.camps){
    for(let i=0;i<12;i++){const angle=i*Math.PI/6;if(!reachable(camp.x+Math.cos(angle)*140,camp.y+Math.sin(angle)*140))errors.push(`crowded-campsite:${camp.id}:${i}`);}
  }
  for(const zone of map.spawnZones){let found=false;for(let y=zone.y+32;y<zone.y+zone.height;y+=64)for(let x=zone.x+32;x<zone.x+zone.width;x+=64)if(reachable(x,y))found=true;if(!found)errors.push('blocked-spawn-region');}
  for(const d of map.decorations){
    const terrain=terrainAtWorld(map.terrain,d.x,d.y);if(!decorationTerrainCompatible(d.id,terrain))errors.push('wrong-asset-terrain');
    const asset=decorationVisual(d.id,d.x,d.y,map.seed,d.radius).name;
    if(d.id==='landRock'&&!asset.includes('land_'))errors.push('aquatic-land-rock');
    if(d.id==='waterRock'&&terrain!==TERRAIN.water)errors.push('dry-water-rock');
  }
  // The trail raster must form one connected network, including chunk seams.
  const cells=map.terrain.cells,cols=map.terrain.cols,first=cells.indexOf(TERRAIN.path),seen=new Uint8Array(cells.length),queue:number[]=[];
  if(first>=0){seen[first]=1;queue.push(first);}for(let head=0;head<queue.length;head++){
    const i=queue[head],x=i%cols;for(const n of [x>0?i-1:-1,x<cols-1?i+1:-1,i-cols,i+cols])if(n>=0&&n<cells.length&&!seen[n]&&cells[n]===TERRAIN.path){seen[n]=1;queue.push(n);}
  }
  const paths=cells.filter(v=>v===TERRAIN.path).length;if(queue.length!==paths)errors.push('disconnected-paths');
  const open=field.walkable.reduce((sum,v)=>sum+v,0),connected=field.distances.reduce((sum,v)=>sum+Number(v>=0),0);
  if(connected/Math.max(1,open)<.98)errors.push('widespread-navigation-deadlocks');
  return{valid:errors.length===0,errors:[...new Set(errors)],terrain:terrainFingerprint(map),walkableFraction:field.walkable.reduce((sum,v)=>sum+v,0)/field.walkable.length,counts:{ponds:map.features.ponds.length,cliffs:map.features.cliffs.length,camps:map.features.camps.length,clearings:map.features.clearings.length}};
}
