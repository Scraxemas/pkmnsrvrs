// Extract actual recorded browser video frames; no Pokémon poses or VFX are fabricated.
import {chromium} from '@playwright/test';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const base=process.argv[2]??'http://127.0.0.1:5198';
const workFolder=process.env.V050_QA_WORKDIR??'test-results';
const timeline=JSON.parse(readFileSync('docs/qa/v050/footage-timeline.json','utf8'));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();await page.goto(`${base}/docs/qa/v050/legacy-animation-audit.json`);
 await page.setContent(`<video id="recording" preload="auto" src="${base}/docs/qa/v050/signature-attacks.webm"></video>`);
 await page.waitForFunction(()=>document.querySelector('video').readyState>=2);
 for(const entry of timeline){
  const dir=join(workFolder,'v050-video-frames',entry.species);mkdirSync(dir,{recursive:true});
  for(let frame=0;frame<12;frame++){
   const data=await page.evaluate(async time=>{
    const video=document.querySelector('video');video.currentTime=Math.min(video.duration-.04,time);await new Promise(resolve=>video.addEventListener('seeked',resolve,{once:true}));
    const canvas=document.createElement('canvas');canvas.width=420;canvas.height=320;canvas.getContext('2d').drawImage(video,430,205,420,320,0,0,420,320);return canvas.toDataURL('image/png').split(',')[1];
   },entry.startSeconds+frame*.06);
   writeFileSync(`${dir}/${String(frame).padStart(2,'0')}.png`,Buffer.from(data,'base64'));
  }
 }
 process.stdout.write(`Extracted ${timeline.length*12} native-gameplay video frames.\n`);
}finally{await browser.close();}
