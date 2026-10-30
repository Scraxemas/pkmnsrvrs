export interface VisibleRows {top:number;bottom:number;}
export interface GrassPoint {x:number;y:number;}

/** Alpha belongs to foliage, never to the Pokémon or its sprite geometry. */
export const GRASS_FOREGROUND_ALPHA=.58;

/** A few native-pixel blade strips remain opaque over the translucent tuft. */
export function opaqueGrassBladeColumn(x:number,width:number){
  return x===Math.floor(width*.25)||x===Math.floor(width*.7);
}

/** Measure opaque body rows, excluding the transparent PMD frame padding. */
export function measureVisibleRows(pixels:Uint8ClampedArray,sheetWidth:number,sheetHeight:number,frameWidth:number,frameHeight:number):VisibleRows[]{
  const columns=Math.floor(sheetWidth/frameWidth),rows=Math.floor(sheetHeight/frameHeight),result:VisibleRows[]=[];
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
    let top=frameHeight,bottom=0;
    for(let y=0;y<frameHeight;y++)for(let x=0;x<frameWidth;x++)if(pixels[((row*frameHeight+y)*sheetWidth+col*frameWidth+x)*4+3]){
      top=Math.min(top,y);bottom=Math.max(bottom,y+1);
    }
    result.push(bottom?{top,bottom}:{top:0,bottom:frameHeight});
  }
  return result;
}

/** Local tuft footprints provide a short transition at the edge of a patch. */
export function grassFootCoverage(x:number,y:number,tileSize:number,lookup:(cx:number,cy:number)=>GrassPoint|undefined){
  const cx=Math.floor(x/tileSize),cy=Math.floor(y/tileSize);let coverage=0;
  for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
    const tuft=lookup(cx+ox,cy+oy);if(!tuft)continue;
    const across=Math.max(0,Math.min(1,(22-Math.abs(x-tuft.x))/6));
    const along=Math.max(0,Math.min(1,(20-Math.abs(y-(tuft.y-8)))/6));
    coverage=Math.max(coverage,across*along);
  }
  return coverage;
}
