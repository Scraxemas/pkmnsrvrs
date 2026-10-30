import {inflateSync} from 'node:zlib';
// Decode the delivered bytes, including PNG integrity and scanline filters. Header-only
// checks would accept a truncated or corrupt PNG that the browser could never render.
function crc32(bytes:Buffer){
  let crc=0xffffffff;
  for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
export function decodeRgba(png:Buffer){
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

