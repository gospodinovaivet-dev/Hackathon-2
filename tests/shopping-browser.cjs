const {chromium}=require(process.env.PLAYWRIGHT_MODULE),path=require('path');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(c=>window.testCatalog=c,require('../supabase/mock-catalog.json'));
await page.addInitScript({path:path.join(__dirname,'mock-backend.js')});
await page.addInitScript(()=>{window.sentReminders=[];window.permissionRequests=0;
const registration={active:true,showNotification:async(title,options)=>window.sentReminders.push({title,...options})};
Object.defineProperty(window,'Notification',{value:{permission:'default',requestPermission:async()=>{window.permissionRequests++;Notification.permission='granted';return 'granted';}},configurable:true});
Object.defineProperty(navigator,'serviceWorker',{value:{register:async()=>registration,ready:Promise.resolve(registration),getRegistration:async()=>registration,addEventListener(){},removeEventListener(){}},configurable:true});});
await page.goto('http://127.0.0.1:8081/');
await page.getByLabel('Email',{exact:true}).fill('demo@example.invalid');await page.getByLabel('Password',{exact:true}).fill('test-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('button',{name:'Create fridge',exact:true}).click();
await page.getByRole('button',{name:'Shopping list',exact:true}).click();
await page.getByText('Buy 24 cups to cover 6 days',{exact:true}).waitFor();
const yogurt=await page.getByLabel('Food used',{exact:true}).locator('option').evaluateAll(opts=>opts.find(o=>o.textContent.includes('Greek yogurt')).value);
await page.getByLabel('Food used',{exact:true}).selectOption(yogurt);
await page.getByRole('button',{name:'Log consumption',exact:true}).click();
await page.getByText('Buy 25 cups to cover 6 days',{exact:true}).waitFor();
if(await page.evaluate(()=>window.testDB.food_consumption.length)!==0)throw Error('Demo wrote real consumption');
if(await page.evaluate(()=>window.permissionRequests)!==0)throw Error('Permission requested without opt-in');
await page.getByRole('button',{name:'Enable notifications',exact:true}).click();
await page.getByRole('button',{name:'Turn off notifications',exact:true}).waitFor();
await page.getByRole('button',{name:'Send a reminder now',exact:true}).click();
await page.getByText('Reminder sent.',{exact:true}).waitFor();
if(await page.evaluate(()=>window.sentReminders.length)!==1)throw Error('Reminder not displayed through worker');
await page.getByRole('button',{name:'Turn off notifications',exact:true}).click();
for(const width of [1440,1280,768,390,320]){await page.setViewportSize({width,height:900});await page.waitForTimeout(100);if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Overflow at '+width);}
await page.screenshot({path:'/tmp/chill-shopping-mobile.png',fullPage:true});
if(errors.length)throw Error(errors.join(';'));console.log('PASS shopping demo calculation, quantity log, database isolation, responsive widths');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
