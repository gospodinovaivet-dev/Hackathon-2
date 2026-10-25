const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const path=require('path');
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(c=>window.testCatalog=c,require('../supabase/mock-catalog.json'));await page.addInitScript({path:path.join(__dirname,'mock-backend.js')});await page.goto('http://127.0.0.1:8081/');
await page.getByLabel('Email',{exact:true}).fill('test@example.invalid');await page.getByLabel('Password',{exact:true}).fill('test-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('button',{name:'Create fridge',exact:true}).click();
for(const [width,height] of [[1920,1080],[1512,982],[1440,900],[1280,800],[1024,768],[768,1024],[430,932],[390,844],[375,812],[320,740]]){
 await page.setViewportSize({width,height});
 await page.getByRole('button',{name:/^Unrecognized /}).click();
 await page.getByRole('heading',{name:'Unknown container',exact:true}).waitFor();
 if(await page.locator('.eat-list article').count()!==1)throw Error('Unknown filter included recognized items');
 await page.getByRole('button',{name:'Home',exact:true}).click();
 await page.getByRole('button',{name:/^Balkan packaging /}).click();
 await page.getByRole('heading',{name:'Rice-stuffed peppers',exact:true}).waitFor();
 if(await page.locator('.eat-list article').count()!==1)throw Error('Balkan filter included unrelated items');
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Inventory overflow at '+width);
 await page.getByRole('button',{name:'Home',exact:true}).click();
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Home overflow at '+width);
 const clipped=await page.locator('.count,.reading,.expiry-product').evaluateAll(nodes=>nodes.some(n=>n.scrollWidth>n.clientWidth+2));if(clipped)throw Error('Clipped control at '+width);
 if([1512,390].includes(width))await page.screenshot({path:'/tmp/chill-responsive-'+width+'.png',fullPage:true});
}
if(errors.length)throw Error(errors.join('\n'));await browser.close();console.log('PASS: unknown/Balkan filters and no horizontal clipping across 10 viewport sizes (320–1920px).');
})().catch(e=>{console.error(e);process.exit(1)});
