// Render original pixel SVGs with the same Chromium engine used by the game.
import {chromium} from '@playwright/test';
import {mkdir,readdir,readFile} from 'node:fs/promises';
import {resolve,basename} from 'node:path';
const destination=resolve(process.argv[2]);
await mkdir(destination,{recursive:true});
const source=resolve('public/assets/environment/viridian/original');
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({deviceScaleFactor:1});
  for(const filename of (await readdir(source)).filter(name=>name.endsWith('.svg'))){
    const data=await readFile(resolve(source,filename));
    await page.setContent(`<style>html,body{margin:0;background:transparent}img{display:block;image-rendering:pixelated}</style><img src="data:image/svg+xml;base64,${data.toString('base64')}">`);
    await page.locator('img').evaluate(image=>image.decode());
    await page.locator('img').screenshot({path:resolve(destination,`${basename(filename,'.svg')}.png`),omitBackground:true});
  }
}finally{await browser.close();}
