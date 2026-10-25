const {chromium}=require(process.env.PLAYWRIGHT_MODULE),path=require('path');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(c=>window.testCatalog=c,require('../supabase/mock-catalog.json'));
await page.addInitScript({path:path.join(__dirname,'mock-backend.js')});
await page.goto('http://127.0.0.1:8081/');
await page.getByLabel('Email',{exact:true}).fill('demo@example.invalid');await page.getByLabel('Password',{exact:true}).fill('test-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('button',{name:'Create fridge',exact:true}).click();
await page.getByRole('button',{name:'History',exact:true}).click();await page.getByRole('button',{name:'Home',exact:true}).click();if(await page.locator('header nav [aria-current=page]').innerText()!=='Home')throw Error('Home button does not go home');
await page.getByRole('button',{name:'ChillCheck home',exact:true}).click();
if(!await page.locator('.brand-logo').evaluate(i=>i.complete&&i.naturalWidth>0))throw Error('Logo missing');
await page.evaluate(()=>{const fridge_id=testDB.fridges[0].id,today=Dates.today();testDB.food_events.push({id:'eaten',fridge_id,item_name:'Soup',action:'eaten',occurred_at:new Date().toISOString()});testDB.food_consumption.push({id:'used',fridge_id,item_name:'Yogurt',amount:2,unit:'cups',consumed_on:today});testDB.scans.push({id:'receipt',fridge_id,source:'receipt',status:'confirmed',taken_at:new Date().toISOString(),scan_items:[{proposed_name:'Eggs',proposed_data:{quantity:'6 pcs'},review_status:'accepted'},{proposed_name:'Rejected milk',proposed_data:{},review_status:'rejected'}]});});
await page.getByLabel('Your fridge',{exact:true}).selectOption(await page.evaluate(()=>testDB.fridges[0].id));
await page.getByRole('button',{name:'History',exact:true}).click();
await page.getByRole('heading',{name:'Recently bought',exact:true}).waitFor();
await page.locator('.history-stats').getByText('Eggs',{exact:true}).waitFor();
await page.locator('.history-stats').getByText('Yogurt',{exact:true}).waitFor();
if(await page.getByText('Rejected milk',{exact:true}).count())throw Error('Rejected purchase counted');
await page.evaluate(()=>{const e=document.querySelector('.chef-assistant'),a=e.getAnimations()[0];if(!a)throw Error('Walking animation missing');a.pause();a.currentTime=0;const start=e.getBoundingClientRect().left;a.currentTime=16000;const end=e.getBoundingClientRect().left;if(Math.abs(start-end)<100)throw Error('Chef does not travel');a.currentTime=0;});
await page.getByRole('button',{name:'Tip',exact:true}).click();await page.getByText('A receipt records a purchase; consumption logs tell the rest of the story.',{exact:true}).waitFor();
if(await page.locator('.chef-assistant').evaluate(e=>getComputedStyle(e).position)!=='fixed')throw Error('Assistant not viewport anchored');
await page.getByRole('button',{name:'Minimize Chef Byte',exact:true}).first().click();await page.getByRole('button',{name:'Open Chef Byte',exact:true}).click();
await page.screenshot({path:'/tmp/chill-history.png'});
for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:850});await page.waitForTimeout(100);if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Overflow '+width);}
if(errors.length)throw Error(errors.join(';'));console.log('PASS receipt filtering, history data, logo navigation, contextual helper, collapse and responsive layout');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
