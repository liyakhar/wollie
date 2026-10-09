import pw from '/home/liya/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core/index.js'; const { chromium } = pw
const times=process.argv.slice(2).map(Number)
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-gpu','--allow-file-access-from-files']})
const p=await b.newPage({viewport:{width:1920,height:1080}})
p.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,400)))
p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,300))})
await p.goto('file:///home/liya/work/promo/film4/film5.html?render')
await p.waitForFunction(()=>window.__ready===true,null,{timeout:15000})
for(const t of times){await p.evaluate(t=>window.seek(t),t);await p.screenshot({path:`/home/liya/work/promo/film4/u_${String(t).replace('.','_')}.png`})}
await b.close()
