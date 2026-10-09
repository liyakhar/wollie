import pw from '/home/liya/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core/index.js'; const { chromium } = pw
import { spawn } from 'node:child_process'
const FPS=60, DUR=30.5, N=Math.round(FPS*DUR)
const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','medium','-crf','16','-pix_fmt','yuv420p','-r',String(FPS),'/home/liya/work/promo/film4/silent8.mp4'],{stdio:['pipe','inherit','inherit']})
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-gpu','--allow-file-access-from-files']})
const p=await b.newPage({viewport:{width:1920,height:1080}})
await p.goto('file:///home/liya/work/promo/film4/film8.html?render')
await p.waitForFunction(()=>window.__ready===true)
for(let i=0;i<N;i++){
  await p.evaluate(t=>window.seek(t),i/FPS)
  const buf=await p.screenshot({type:'jpeg',quality:94})
  if(!ff.stdin.write(buf)) await new Promise(r=>ff.stdin.once('drain',r))
  if(i%120===0) console.log('frame',i,'/',N)
}
ff.stdin.end()
await new Promise(r=>ff.on('close',r))
await b.close()
console.log('RENDER-DONE')
