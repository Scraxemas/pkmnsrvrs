import {describe,it,expect} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {MOVES} from '../src/content';
import {VFX_ASSETS} from '../src/data/vfxAssets';
import {NATIVE_ACTIONS} from '../src/data/nativeActions';
import {decodeRgba} from './helpers/png';

const sha=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
const retained:Record<string,string>=JSON.parse(readFileSync('assets/moves/v043-retained-hashes.json','utf8'));

describe('v0.5.0 original and imported artwork',()=>{
  it('preserves all fourteen approved v0.4.3 icons byte for byte',()=>{
    expect(Object.keys(retained)).toHaveLength(14);
    for(const [id,hash] of Object.entries(retained))expect(sha(readFileSync(`public/assets/moves/${id}.png`)),id).toBe(hash);
  });
  it('records each new icon and VFX source with exact prompts and matching output hashes',()=>{
    const manifest=JSON.parse(readFileSync('assets/moves/v050-generation-manifest.json','utf8')) as {tool:string;moves:{id:string}[];generations:{id:string;kind:string;prompt:string;sourceFile:string;sourceSha256:string;output:string;outputSha256:string}[]};
    expect(manifest.tool).toBe('Codex built-in image_gen.imagegen');
    expect(manifest.moves.map(move=>move.id).sort()).toEqual(Object.keys(MOVES).sort());
    expect(manifest.generations.filter(entry=>entry.kind==='icon').map(entry=>entry.id).sort()).toEqual(Object.keys(MOVES).filter(id=>!(id in retained)).sort());
    expect(manifest.generations.filter(entry=>entry.kind==='vfx').map(entry=>entry.id).sort()).toEqual(Object.keys(VFX_ASSETS).sort());
    const outputs=manifest.generations.map(entry=>entry.output);expect(new Set(outputs).size).toBe(outputs.length);
    for(const entry of manifest.generations){
      expect(entry.prompt.length,entry.id).toBeGreaterThan(200);
      expect(entry.sourceFile).toMatch(/^[^\\/]+\.png$/);expect(entry.sourceSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.output).toBe(`public/assets/${entry.kind==='icon'?'moves':'vfx'}/${entry.id}.png`);
      expect(sha(readFileSync(entry.output)),entry.id).toBe(entry.outputSha256);
    }
  });
  it.each(Object.entries(VFX_ASSETS))('%s is a separate crisp four-frame RGBA combat atlas',(id,asset)=>{
    expect(readdirSync('public/assets/vfx')).toContain(`${id}.png`);
    const {width,height,pixels}=decodeRgba(readFileSync(`public/${asset.path}`));
    expect([width,height]).toEqual([asset.frameWidth*asset.frames,asset.frameHeight]);expect(asset.frames).toBe(4);
    const frames=[];
    for(let frame=0;frame<asset.frames;frame++){
      const bytes=Buffer.alloc(asset.frameWidth*height*4);let opaque=0;const colors=new Set<string>();
      for(let y=0;y<height;y++)for(let x=0;x<asset.frameWidth;x++){
        const at=(y*width+frame*asset.frameWidth+x)*4,alpha=pixels[at+3];
        expect([0,255]).toContain(alpha);
        if(alpha){opaque++;colors.add(pixels.subarray(at,at+3).toString('hex'));}
        if(x<2||x>=asset.frameWidth-2||y<2||y>=height-2)expect(alpha,`${id} frame ${frame} edge`).toBe(0);
        pixels.copy(bytes,(y*asset.frameWidth+x)*4,at,at+4);
      }
      expect(opaque,`${id} frame ${frame}`).toBeGreaterThan(3);expect(colors.size).toBeLessThanOrEqual(24);frames.push(sha(bytes));
    }
    expect(new Set(frames).size,id).toBe(4);
  });
  it('imports genuine authored action frames and metadata for all nine starter forms',()=>{
    const species=['bulbasaur','ivysaur','venusaur','charmander','charmeleon','charizard','squirtle','wartortle','blastoise'];
    expect(Object.keys(NATIVE_ACTIONS).sort()).toEqual(species.sort());
    for(const id of species)for(const kind of ['physical','special','hurt'] as const){
      const action=NATIVE_ACTIONS[id][kind]!;expect(action,`${id}/${kind}`).toBeDefined();expect(action.native).toBe(true);
      const png=readFileSync(`public/${action.path}`),image=decodeRgba(png);expect(sha(png)).toBe(action.sha256);
      expect([image.width,image.height]).toEqual([action.frames*action.frameWidth,8*action.frameHeight]);expect(action.directions).toBe(8);
      expect(action.durations).toHaveLength(action.frames);expect(action.durations.every(duration=>duration>0)).toBe(true);
      expect(action.durationSeconds).toBeCloseTo(action.durations.reduce((sum,n)=>sum+n,0)/60,8);
      expect(action.hitFrame).toBeLessThan(action.frames);expect(action.anchorX).toBeGreaterThan(0);expect(action.anchorX).toBeLessThan(action.frameWidth);
      expect(action.anchorY).toBeGreaterThan(0);expect(action.anchorY).toBeLessThan(action.frameHeight);
      for(let row=0;row<8;row++){
        const frameHashes=[];
        for(let frame=0;frame<action.frames;frame++){
          const bytes=Buffer.alloc(action.frameWidth*action.frameHeight*4);
          for(let y=0;y<action.frameHeight;y++){const at=((row*action.frameHeight+y)*image.width+frame*action.frameWidth)*4;image.pixels.copy(bytes,y*action.frameWidth*4,at,at+action.frameWidth*4);}
          expect(bytes.some((value,index)=>index%4===3&&value>0),`${id}/${kind}/${row}/${frame}`).toBe(true);frameHashes.push(sha(bytes));
        }
        if(kind==='physical')expect(new Set(frameHashes).size,`${id}/${row}`).toBeGreaterThan(1);
      }
    }
  });
});
