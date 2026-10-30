import {describe,it,expect} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {MOVES} from '../src/content';
import {MOVE_ASSETS,MOVE_ICON_SIZE,moveArtUrl,moveTexture} from '../src/moveAssets';

// Decode the delivered bytes, including PNG integrity and scanline filters. Header-only
// checks would accept a truncated or corrupt PNG that the browser could never render.
function crc32(bytes:Buffer){
  let crc=0xffffffff;
  for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
function decodeRgba(png:Buffer){
  if(!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('Invalid PNG signature');
  let offset=8,width=0,height=0,ended=false;
  const data:Buffer[]=[];
  while(offset<png.length){
    if(offset+12>png.length)throw new Error('Truncated PNG chunk');
    const length=png.readUInt32BE(offset),end=offset+12+length;
    if(end>png.length)throw new Error('Truncated PNG data');
    const kind=png.toString('ascii',offset+4,offset+8),bytes=png.subarray(offset+8,end-4);
    if(crc32(png.subarray(offset+4,end-4))!==png.readUInt32BE(end-4))throw new Error(`Invalid ${kind} checksum`);
    if(kind==='IHDR'){
      width=bytes.readUInt32BE(0);height=bytes.readUInt32BE(4);
      if(length!==13||bytes[8]!==8||bytes[9]!==6||bytes[10]!==0||bytes[11]!==0||bytes[12]!==0)throw new Error('Expected non-interlaced 8-bit RGBA PNG');
    }else if(kind==='IDAT')data.push(bytes);
    else if(kind==='IEND'){ended=true;offset=end;break;}
    offset=end;
  }
  if(!ended||offset!==png.length||!width||!height||!data.length)throw new Error('Incomplete PNG');
  const raw=inflateSync(Buffer.concat(data)),stride=width*4;
  if(raw.length!==(stride+1)*height)throw new Error('Invalid decompressed image length');
  const pixels=Buffer.alloc(stride*height);
  for(let y=0;y<height;y++){
    const filter=raw[y*(stride+1)];if(filter>4)throw new Error('Invalid scanline filter');
    for(let x=0;x<stride;x++){
      const at=y*stride+x,left=x>=4?pixels[at-4]:0,above=y?pixels[at-stride]:0,corner=y&&x>=4?pixels[at-stride-4]:0;
      const p=left+above-corner,pa=Math.abs(p-left),pb=Math.abs(p-above),pc=Math.abs(p-corner);
      const predictor=filter===1?left:filter===2?above:filter===3?Math.floor((left+above)/2):filter===4?(pa<=pb&&pa<=pc?left:pb<=pc?above:corner):0;
      pixels[at]=(raw[y*(stride+1)+1+x]+predictor)&255;
    }
  }
  return{width,height,pixels};
}

describe('generated move artwork',()=>{
  it('maps every current move ID exactly once, preserving case for GitHub Pages',()=>{
    const ids=Object.keys(MOVES).sort();
    expect(Object.keys(MOVE_ASSETS).sort()).toEqual(ids);
    expect(readdirSync('public/assets/moves').sort()).toEqual(ids.map(id=>`${id}.png`).sort());
    for(const id of ids){
      expect(MOVE_ASSETS[id]).toEqual({id,path:`assets/moves/${id}.png`,width:32,height:32});
      expect(moveTexture(id)).toBe(`move:${id}`);
      expect(moveArtUrl(id)).toBe(`${import.meta.env.BASE_URL}assets/moves/${id}.png`);
    }
  });
  it.each(Object.keys(MOVES))('%s is a decodable, crisp, transparent 32×32 RGBA PNG',(id)=>{
    const image=decodeRgba(readFileSync(`public/${MOVE_ASSETS[id].path}`));
    expect([image.width,image.height]).toEqual([MOVE_ICON_SIZE,MOVE_ICON_SIZE]);
    const alpha=Array.from({length:1024},(_,index)=>image.pixels[index*4+3]);
    expect(new Set(alpha)).toEqual(new Set([0,255]));
    expect(alpha.filter(value=>value===255).length).toBeGreaterThan(30);
    for(let n=0;n<32;n++)for(const index of [n,31*32+n,n*32,n*32+31])expect(alpha[index],`opaque outer edge in ${id}`).toBe(0);
    const palette=new Set<string>();
    let hiddenRgb=0;
    for(let index=0;index<1024;index++){
      if(alpha[index])palette.add(image.pixels.subarray(index*4,index*4+3).toString('hex'));
      else hiddenRgb|=image.pixels[index*4]|image.pixels[index*4+1]|image.pixels[index*4+2];
    }
    expect(hiddenRgb,`uncleared transparent RGB in ${id}`).toBe(0);
    expect(palette.size).toBeLessThanOrEqual(32);
  });
  it('records every production move and all eighteen style candidates with verifiable output hashes',()=>{
    const manifest=JSON.parse(readFileSync('assets/moves/generation-manifest.json','utf8')) as {
      tool:string;transparentBackground:boolean;moves:{id:string;name:string;type:string}[];
      generations:{id:string;style:string;prompt:string;sourceFile:string;sourceSha256:string;outputSha256:string}[];
    };
    const ids=Object.keys(MOVES).sort(),representatives=['scratch','ember','bubble','razorLeaf','metalClaw','poisonPowder'];
    expect(manifest.tool).toBe('Codex built-in image_gen.imagegen');expect(manifest.transparentBackground).toBe(true);
    expect(manifest.moves.map(move=>move.id).sort()).toEqual(ids);
    for(const move of manifest.moves)expect(move).toEqual({id:move.id,name:MOVES[move.id].name,type:MOVES[move.id].type});
    expect(manifest.generations.filter(generation=>generation.style==='A').map(generation=>generation.id).sort()).toEqual(ids);
    const pairs=manifest.generations.map(generation=>`${generation.style}:${generation.id}`);
    expect(new Set(pairs).size).toBe(pairs.length);
    const comparisonPairs=manifest.generations.filter(generation=>representatives.includes(generation.id)).map(generation=>`${generation.style}:${generation.id}`).sort();
    expect(comparisonPairs).toEqual(['A','B','C'].flatMap(style=>representatives.map(id=>`${style}:${id}`)).sort());
    for(const generation of manifest.generations){
      expect(ids).toContain(generation.id);expect(['A','B','C']).toContain(generation.style);
      expect(generation.prompt.length).toBeGreaterThan(100);
      expect(generation.sourceFile).toMatch(/^[^\\/]+\.png$/);
      expect(generation.sourceSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(generation.outputSha256).toMatch(/^[0-9a-f]{64}$/);
      const comparison=readFileSync(`docs/qa/v043/styles/${generation.style}/${generation.id}.png`);
      expect(createHash('sha256').update(comparison).digest('hex')).toBe(generation.outputSha256);
      if(generation.style==='A'){
        const production=readFileSync(`public/${MOVE_ASSETS[generation.id].path}`);
        expect(createHash('sha256').update(production).digest('hex')).toBe(generation.outputSha256);
      }
    }
  });
  it('uses distinct art for every move and rejects corrupt or truncated pixel data',()=>{
    const files=Object.values(MOVE_ASSETS).map(asset=>readFileSync(`public/${asset.path}`));
    expect(new Set(files.map(png=>createHash('sha256').update(decodeRgba(png).pixels).digest('hex'))).size).toBe(files.length);
    const damaged=Buffer.from(files[0]);damaged[damaged.length-13]^=1;
    expect(()=>decodeRgba(damaged)).toThrow();
    expect(()=>decodeRgba(files[0].subarray(0,files[0].length-5))).toThrow();
  });
});
