// Bounded local integration check. Credentials are synthetic, held only in memory.
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, scryptSync, createHmac, createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
const root=process.cwd(), port=Number(process.env.PREVIEW_TEST_PORT||3012), base=`http://127.0.0.1:${port}`;
const password=randomBytes(24).toString('base64url'),secret=randomBytes(32).toString('base64url'),salt=randomBytes(16);
const passwordHash=`scrypt-v1:65536:8:1:${salt.toString('base64url')}:${scryptSync(password,salt,64,{N:65536,r:8,p:1,maxmem:128*1024*1024}).toString('base64url')}`;
const dir=await fs.mkdtemp(path.join(root,'.next/cache/preview-http-'));
for(const file of ['src','public','scripts','package.json','package-lock.json','next.config.ts','tsconfig.json','next-env.d.ts','eslint.config.mjs'])await fs.cp(path.join(root,file),path.join(dir,file),{recursive:true});
await fs.symlink(path.join(root,'node_modules'),path.join(dir,'node_modules'),'junction');
const child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port',String(port)],{cwd:dir,env:{...process.env,NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1',PREVIEW_ACCESS_MODE:'protected',PREVIEW_PASSWORD_HASH:passwordHash,PREVIEW_SESSION_SECRET:secret,PREVIEW_ORIGIN:base,SESSION_SECRET:randomBytes(32).toString('base64url')},stdio:['ignore','pipe','pipe']});
let logs='',exited=false;child.on('exit',()=>{exited=true});child.stdout.on('data',d=>{logs+=d});child.stderr.on('data',d=>{logs+=d});
const report={checks:[],captures:[],browser:null,credentials:'ephemeral synthetic fixtures only; not saved',server:'isolated loopback development server; terminated in finally'};
const assert=(v,label)=>{if(!v)throw Error(label)};
const deadline=setTimeout(()=>{console.error('Preview integration deadline reached');stop();process.exit(124)},240000);
function stop(){if(exited)return;try{if(process.platform==='win32')execFileSync('taskkill.exe',['/pid',String(child.pid),'/t','/f'],{stdio:'ignore'});else child.kill('SIGTERM')}catch{} }
const req=(p,options={})=>fetch(base+p,{...options,redirect:'manual',signal:AbortSignal.timeout(30000)});
const record=(label,r)=>{report.checks.push({label,status:r.status});return r};
const post=(data,origin=base)=>req('/api/preview/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:typeof data==='string'?data:JSON.stringify(data)});
const pageDenied=async(r,label)=>{assert(r.status===401||r.status===307,label+' denies');if(r.status===307)assert(new URL(r.headers.get('location'),base).pathname==='/construccion',label+' fixed public redirect');const body=await r.text();assert(!body.includes('triskel-promocional')&&!body.includes('rock-imperium-title'),label+' no private HTML or RSC')};
let browserCleanup=async()=>{};
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server startup deadline')),30000);const onData=()=>{if(logs.includes('Ready in')){clearTimeout(timer);child.stdout.off('data',onData);resolve()}};child.stdout.on('data',onData);child.once('error',reject);child.once('exit',c=>{clearTimeout(timer);reject(Error('Server exited before ready '+c))});onData()});
 for(const p of ['/','/login']){const r=record('anonymous '+p,await req(p));assert(r.status===307&&new URL(r.headers.get('location'),base).pathname==='/construccion','Private page redirect '+p);assert(!(await r.text()).includes('triskel-promocional'),'No private HTML '+p)}
 const screen=record('public construction',await req('/construccion'));const html=await screen.text();assert(screen.status===200&&html.includes('Estamos preparando nuestra nueva web')&&html.includes('triskel-simbolo.png')&&!html.includes('triskel-promocional'),'Construction payload');
 for(const p of ['/api/auth/session','/api/admin/session','/api/health'])for(const method of ['GET','POST']){const r=record('anonymous '+method+' '+p,await req(p,{method}));assert(r.status===401,'Protected API '+method+' '+p);assert(!(await r.text()).includes('authenticated'),'No business response before preview');assert(r.headers.get('cache-control').includes('no-store'),'Private API cache')}
 const photo='/images/banda/triskel-promocional-frontal.jpeg';
 for(const p of [photo,'/brand/triskel-logotipo-sombra.png','/api/preview/assets/images/banda/triskel-promocional-frontal.jpeg']){const r=record('anonymous asset '+p,await req(p));assert(r.status===401,'Private asset denial');assert((await r.arrayBuffer()).byteLength===0,'No asset bytes')}
 const symbol=record('public symbol',await req('/brand/triskel-simbolo.png'));assert(symbol.status===200&&symbol.headers.get('content-type').includes('image/png'),'Public symbol');
 const optimized=record('public optimized symbol',await req('/_next/image?url=%2Fbrand%2Ftriskel-simbolo.png&w=384&q=75'));assert(optimized.status===200&&optimized.headers.get('content-type').startsWith('image/'),'Public symbol optimization');
 const optimizedPrivate=record('private optimizer denied',await req('/_next/image?url='+encodeURIComponent(photo)+'&w=640&q=75'));assert(optimizedPrivate.status===404,'No private optimizer bypass');
 const rsc=record('anonymous RSC',await req('/',{headers:{RSC:'1'}}));await pageDenied(rsc,'No private RSC');
 const spoof={'x-middleware-subrequest':'middleware:middleware:middleware:middleware:middleware','x-forwarded-for':'203.0.113.99','x-real-ip':'203.0.113.98'};
 for(const p of ['/api/admin/session',photo]){const r=record('spoofed middleware/header '+p,await req(p,{headers:spoof}));assert(r.status===401,'Independent Node guard '+p)}
 for(const p of ['/aviso-legal','/privacidad','/cookies'])assert(record('unpublished legal '+p,await req(p)).status===404,'Legal remains404');
 assert(record('wrong password',await post({password:randomBytes(24).toString('base64url')})).status===401,'Wrong password');
 assert(record('cross origin',await post({password},'https://untrusted.invalid')).status===403,'Origin validation');
 assert(record('malformed JSON',await post('{')).status===400,'Malformed input');
 const login=record('correct password',await post({password}));assert(login.status===204,'Correct password');
 const cookie=login.headers.get('set-cookie')?.split(';')[0];assert(cookie&&cookie.startsWith('triskelweb_preview='),'Dedicated cookie');assert(!login.headers.get('set-cookie').includes('triskelweb_session'),'No customer cookie mutation');
 const token=cookie.slice(cookie.indexOf('=')+1);assert(!Buffer.from(token.split('.')[0],'base64url').toString().includes(passwordHash),'Cookie does not expose stored hash');
 const authorized=record('authorized Home',await req('/',{headers:{Cookie:cookie}}));const authorizedHTML=await authorized.text();assert(authorized.status===200&&authorizedHTML.includes('triskel-promocional')&&authorizedHTML.includes('Rock Imperium'),'Private Home after login');assert(authorized.headers.get('cache-control').includes('no-store'),'Private Home cache');
 const image=record('authorized original asset',await req(photo,{headers:{Cookie:cookie}}));assert(image.status===200,'Authorized image');assert(createHash('sha256').update(Buffer.from(await image.arrayBuffer())).digest('hex')===createHash('sha256').update(await fs.readFile(path.join(root,'public',photo))).digest('hex'),'Original image bytes preserved');
 assert(record('authorized Firebase status',await req('/api/auth/session',{headers:{Cookie:cookie}})).status===200,'Firebase status still accessible after preview');
 assert(record('preview does not grant admin',await req('/api/admin/session',{headers:{Cookie:cookie}})).status===401,'Commercial authorization remains necessary');
 await pageDenied(record('tampered cookie',await req('/',{headers:{Cookie:cookie+'x',RSC:'1'}})),'Tampered cookie');
 const claims=JSON.parse(Buffer.from(token.split('.')[0],'base64url').toString());claims.iat=Math.floor(Date.now()/1000)-7201;claims.exp=claims.iat+7200;const payload=Buffer.from(JSON.stringify(claims)).toString('base64url');const expired=payload+'.'+createHmac('sha256',Buffer.from(secret,'base64url')).update(payload).digest('base64url');
 await pageDenied(record('expired cookie',await req('/',{headers:{Cookie:'triskelweb_preview='+expired,RSC:'1'}})),'Expired cookie');
 const logout=record('logout',await req('/api/preview/session',{method:'DELETE',headers:{Origin:base,Cookie:cookie}}));assert(logout.status===204&&logout.headers.get('set-cookie').includes('Max-Age=0'),'Logout clears cookie');assert(record('after clearing cookie',await req('/')).status===307,'Logout visitor denied');
 // Optional rendering uses an already-running owner-authorized CDP endpoint, never starts a browser.
 if(process.env.PREVIEW_BROWSER_CDP){
  const connect=async endpoint=>{const ws=new WebSocket(endpoint);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true})});let id=0;const pending=new Map();ws.addEventListener('message',e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error('CDP '+m.error.message)):p.resolve(m.result)}});return{loaded:()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.removeEventListener('message',listen);reject(Error('Browser navigation deadline'))},30000);const listen=e=>{if(JSON.parse(e.data).method==='Page.loadEventFired'){clearTimeout(timer);ws.removeEventListener('message',listen);resolve()}};ws.addEventListener('message',listen)}),send:(method,params={})=>new Promise((resolve,reject)=>{const key=++id,timer=setTimeout(()=>reject(Error('CDP deadline '+method)),20000);pending.set(key,{resolve,reject,timer});ws.send(JSON.stringify({id:key,method,params}))}),close:()=>ws.close()}};
  const version=await(await fetch(process.env.PREVIEW_BROWSER_CDP+'/json/version')).json(),browser=await connect(version.webSocketDebuggerUrl),ctx=await browser.send('Target.createBrowserContext'),target=await browser.send('Target.createTarget',{url:'about:blank',browserContextId:ctx.browserContextId});
  const tabs=await(await fetch(process.env.PREVIEW_BROWSER_CDP+'/json/list')).json(),tab=tabs.find(t=>t.id===target.targetId),page=await connect(tab.webSocketDebuggerUrl);
  browserCleanup=async()=>{page.close();await browser.send('Target.disposeBrowserContext',{browserContextId:ctx.browserContextId});browser.close()};
  const evaluate=async expression=>{const r=await page.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error('Browser evaluation failed');return r.result.value};
  const navigate=async()=>{const loaded=page.loaded();await page.send('Page.navigate',{url:base+'/construccion'});await loaded;await evaluate('document.fonts.ready.then(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))))')};
  await page.send('Page.enable');report.browser={widths:[],keyboard:'Not retried; markup, focus styling, browser form submission and mouse/DOM activation only.'};
  for(const width of [1440,768,390,320]){await page.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await navigate();const measured=await evaluate(`(()=>{const q=s=>document.querySelector(s),i=q('main img'),r=e=>e.getBoundingClientRect().toJSON();return{width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,title:q('h1').textContent,subtitle:q('main p').textContent,image:{src:i.getAttribute('src'),natural:i.naturalWidth,rect:r(i)},input:r(q('input')),button:r(q('button')),label:q('label').htmlFor===q('input').id,passwordType:q('input').type,storage:[localStorage.length,sessionStorage.length],color:getComputedStyle(q('h1')).color,background:getComputedStyle(q('main')).backgroundColor}})()`);assert(measured.scroll<=measured.client&&measured.image.natural>0&&measured.label&&measured.passwordType==='password'&&measured.input.height>=44&&measured.button.height>=44,'Responsive construction '+width);report.browser.widths.push(measured);const file=path.join(root,'.next/cache/triskel-visual/p12-construccion-'+width+'.png');const shot=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.writeFile(file,Buffer.from(shot.data,'base64'));report.captures.push(path.relative(root,file));}
  // Actual form submission over same-origin HTTP in this development-only context.
  const entered=page.loaded();await evaluate(`(()=>{document.querySelector('input').value=${JSON.stringify(password)};document.querySelector('form').requestSubmit()})()`);await entered;
  assert(await evaluate("location.pathname==='/'&&Boolean(document.querySelector('#inicio'))"),'Browser login enters Home');report.browser.login='same-origin form accepted, Home delivered';
  const privateImages=await evaluate(`Promise.all([...document.querySelectorAll('#inicio img')].map(i=>i.decode().then(()=>true).catch(()=>false)))`);assert(privateImages.every(Boolean),'Private hero images render after authentication');
  const left=page.loaded();await evaluate(`(()=>{document.querySelector('button[class*="exitButton"]').click()})()`);await left;
  assert(await evaluate("location.pathname==='/construccion'&&!document.querySelector('#inicio')"),'Browser logout hides private content');report.browser.logout='control clears session and returns to construction';
 }
 const js=[];async function collect(p){for(const item of await fs.readdir(p,{withFileTypes:true})){const f=path.join(p,item.name);if(item.isDirectory())await collect(f);else if(item.name.endsWith('.js'))js.push(f)}}await collect(path.join(dir,'.next/static'));
 for(const f of js){const code=await fs.readFile(f,'utf8');assert(![password,passwordHash,secret].some(v=>code.includes(v)),'No configured credential fixture in client bundle')}
 assert(![password,passwordHash,secret].some(v=>logs.includes(v)),'No configured credential fixture in server logs');
 report.serverLogsChecked=true;report.bundleFilesChecked=js.length;report.status='passed';console.log(JSON.stringify(report,null,2));
}catch(e){report.status='failed';report.error=e.message;console.error(JSON.stringify(report,null,2));process.exitCode=1}
finally{try{await browserCleanup()}finally{stop();clearTimeout(deadline);await fs.writeFile(path.join(root,'.next/cache/triskel-visual/p12-http-report.json'),JSON.stringify(report,null,2))}}
