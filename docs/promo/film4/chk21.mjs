import pw from '/home/liya/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core/index.js'; const { chromium } = pw
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-gpu','--allow-file-access-from-files']})
const p=await b.newPage({viewport:{width:1920,height:1080}})
await p.goto('file:///home/liya/work/promo/film4/film15.html?render&subs');await p.waitForFunction(()=>window.__ready===true)
const T=JSON.parse(await p.evaluate(()=>JSON.stringify(T)));let bad=0,prev=null
for(let i=0;i<Math.round(60*1.4);i++){const t=(Math.round((T.merge-.1)*60)+i)/60
  const r=await p.evaluate(x=>{window.seek(x);const y=document.getElementById('kYou');return [getComputedStyle(y).display,parseFloat(getComputedStyle(y).opacity)]},t)
  if(prev&&r[0]!=='none'&&prev[0]!=='none'&&r[1]>prev[1]+.05&&t>T.merge+.3){bad++;console.log('POP at',t.toFixed(3),prev,r)}
  prev=r}
console.log('pops',bad);await b.close()
