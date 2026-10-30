// Evaluate approved content/progression data for the QA catalog and report.
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {writeFileSync,mkdirSync} from 'node:fs';
const root=fileURLToPath(new URL('../',import.meta.url));
const server=await createServer({root,logLevel:'silent',server:{middlewareMode:true},appType:'custom'});
try{
  const [{MOVES},{BULBASAUR_MOVE_CATALOG},{MOVE_CHAINS},{MOVE_FUSIONS},{MOVE_UNLOCKS,TECHNICAL_MACHINES,TM_RESEARCH_REWARDS,tmLabel},{moveUnlockRequirements}]=await Promise.all(['/src/content.ts','/src/data/bulbasaurMoves.ts','/src/data/moveChains.ts','/src/data/moveFusions.ts','/src/data/moveUnlocks.ts','/src/moveEligibility.ts'].map(path=>server.ssrLoadModule(path)));
  const moves=BULBASAUR_MOVE_CATALOG.map(id=>{
    const move=MOVES[id],unlock=MOVE_UNLOCKS[id],fusion=MOVE_FUSIONS.find(recipe=>recipe.result===id),chain=MOVE_CHAINS.find(chain=>chain.family.includes('bulbasaur')&&chain.stages.includes(id));
    return {...move,tm:unlock?.tm?tmLabel(unlock.tm):null,species:unlock?.species??fusion?.species??null,rare:unlock?.rarity==='rare'||!!fusion,acquisition:fusion?`${fusion.ingredients.map(id=>MOVES[id].name).join(' + ')} fusion`:chain?.kind==='signature'?(id==='vineWhip'?'Bulbasaur starter':'Automatic Ivysaur evolution'):chain&&chain.stages.indexOf(id)>0?`${MOVES[chain.stages[chain.stages.indexOf(id)-1]].name} Rank 5 transformation`:unlock?.tm?'TM discovery':'Natural',requiredTms:moveUnlockRequirements(id,'venusaur').map(tmLabel)};
  });
  const data={familyCount:moves.length,globalCount:Object.keys(MOVES).length,moves,chains:MOVE_CHAINS,fusions:MOVE_FUSIONS,technicalMachines:TECHNICAL_MACHINES,tmResearchRewards:TM_RESEARCH_REWARDS};
  if(process.argv.includes('--write')){mkdirSync(new URL('../docs/qa/v050/',import.meta.url),{recursive:true});writeFileSync(new URL('../docs/qa/v050/move-catalog.json',import.meta.url),JSON.stringify(data,null,2)+'\n');}
  else process.stdout.write(JSON.stringify(data));
}finally{await server.close();}
