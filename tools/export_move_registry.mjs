// Evaluate the actual TypeScript registry, independent of source formatting.
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const server=await createServer({root,logLevel:'silent',server:{middlewareMode:true},appType:'custom'});
try{
  const {MOVES}=await server.ssrLoadModule('/src/content.ts');
  const entries=Object.entries(MOVES);
  if(!entries.length||entries.some(([key,move])=>key!==move.id))throw new Error('Move registry keys and IDs must match');
  process.stdout.write(JSON.stringify(entries.map(([,move])=>({id:move.id,name:move.name,type:move.type}))));
}finally{await server.close();}
