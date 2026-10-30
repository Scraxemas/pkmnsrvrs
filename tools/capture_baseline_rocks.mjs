// Run against an isolated archive of commit 86f00d6 served by Vite. This never
// changes the current checkout or substitutes assets in the current game.
import {chromium} from '@playwright/test';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.goto(process.argv[2]??'http://127.0.0.1:5198/?seed=1337');
  await page.waitForFunction(()=>window.__POKEMON_SURVIVORS__);
  await page.evaluate(()=>window.__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'bulbasaur'}));
  await page.waitForFunction(()=>window.__POKEMON_SURVIVORS__.scene.getScene('game').player?.active);
  const baseline=await page.evaluate(()=>{
    const s=window.__POKEMON_SURVIVORS__.scene.getScene('game');
    if(s.expGraphics)throw Error('Expected the original HP HUD, found the v0.3.6 EXP HUD');
    const rock=s.state.world.decorations.find(d=>d.id==='rock');
    if(!rock)throw Error('Baseline rock category missing');
    s.overlay=s.add.container(0,0);s.state.enemies=[];s.state.projectiles=[];s.syncViews(1);
    s.player.setVisible(false);s.playerShadow.setVisible(false);s.cameras.main.stopFollow().centerOn(rock.x,rock.y);s.syncWorldChunks(true);
    return{seed:s.state.world.seed,rock};
  });
  await page.waitForTimeout(100);
  await page.screenshot({path:'test-results/screenshots/v036-baseline-rocks.png'});
  console.log(JSON.stringify({commit:'86f00d6',...baseline}));
}finally{await browser.close();}
