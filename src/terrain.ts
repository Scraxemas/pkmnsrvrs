export const TERRAIN={grass:0,path:1,water:2,tallGrass:3,cliff:4} as const;
export type TerrainCode=typeof TERRAIN[keyof typeof TERRAIN];

export interface TerrainGrid { tileSize:number;cols:number;rows:number;cells:number[];originCol?:number;originRow?:number; }
export const DIRECTIONS=[
  {bit:1,dx:0,dy:-1,name:'north'},{bit:2,dx:1,dy:-1,name:'northeast'},
  {bit:4,dx:1,dy:0,name:'east'},{bit:8,dx:1,dy:1,name:'southeast'},
  {bit:16,dx:0,dy:1,name:'south'},{bit:32,dx:-1,dy:1,name:'southwest'},
  {bit:64,dx:-1,dy:0,name:'west'},{bit:128,dx:-1,dy:-1,name:'northwest'},
] as const;
export const createTerrainGrid=(width:number,height:number,tileSize=64):TerrainGrid=>({tileSize,cols:Math.ceil(width/tileSize),rows:Math.ceil(height/tileSize),cells:Array(Math.ceil(width/tileSize)*Math.ceil(height/tileSize)).fill(TERRAIN.grass)});
/** Tile coordinates remain global, even when the resident grid has moved. */
export function terrainAt(grid:TerrainGrid,x:number,y:number):TerrainCode {x-=grid.originCol??0;y-=grid.originRow??0;if(x<0||y<0||x>=grid.cols||y>=grid.rows)return TERRAIN.grass;return (grid.cells[y*grid.cols+x]??TERRAIN.grass) as TerrainCode;}
export function setTerrain(grid:TerrainGrid,x:number,y:number,value:TerrainCode){x-=grid.originCol??0;y-=grid.originRow??0;if(x>=0&&y>=0&&x<grid.cols&&y<grid.rows)grid.cells[y*grid.cols+x]=value;}
export function adjacencyMask(grid:TerrainGrid,x:number,y:number,value=terrainAt(grid,x,y)){let mask=0;for(const direction of DIRECTIONS)if(terrainAt(grid,x+direction.dx,y+direction.dy)===value)mask|=direction.bit;return mask;}
export type TerrainTransition='isolated'|'end-north'|'end-east'|'end-south'|'end-west'|'straight-horizontal'|'straight-vertical'|'corner-ne'|'corner-se'|'corner-sw'|'corner-nw'|'t-north'|'t-east'|'t-south'|'t-west'|'intersection'|'complex';
export function classifyTransition(mask:number):TerrainTransition {const n=!!(mask&1),e=!!(mask&4),s=!!(mask&16),w=!!(mask&64),cardinal=(n?1:0)|(e?2:0)|(s?4:0)|(w?8:0);return ({0:'isolated',1:'end-north',2:'end-east',4:'end-south',8:'end-west',3:'corner-ne',6:'corner-se',12:'corner-sw',9:'corner-nw',5:'straight-vertical',10:'straight-horizontal',7:'t-west',11:'t-south',13:'t-east',14:'t-north',15:'intersection'} as Partial<Record<number,TerrainTransition>>)[cardinal]??'complex';}
export function terrainAtWorld(grid:TerrainGrid,x:number,y:number){return terrainAt(grid,Math.floor(x/grid.tileSize),Math.floor(y/grid.tileSize));}
