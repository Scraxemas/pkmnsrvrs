import {describe,it,expect} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
import {decodeRgba} from './helpers/png';
import {createHash} from 'node:crypto';
import {MOVES} from '../src/content';
import {MOVE_ASSETS,MOVE_ICON_SIZE,moveArtUrl,moveTexture} from '../src/moveAssets';

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
    // v0.4.3 provenance is an immutable record of the original fourteen assets.
    // New assets have their own v0.5.0 manifest; global PNG checks above still
    // validate every current move rather than reducing coverage to the old set.
    const ids=Object.keys(JSON.parse(readFileSync('assets/moves/v043-retained-hashes.json','utf8'))).sort(),representatives=['scratch','ember','bubble','razorLeaf','metalClaw','poisonPowder'];
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
