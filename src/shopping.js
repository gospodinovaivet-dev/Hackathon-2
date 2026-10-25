/* Quantity-aware shopping estimates; never infer consumption from door openings. */
window.ChillShopping = (()=>{
 const h=React.createElement,{useState,useEffect,useMemo,useRef}=React;
 const normalize=name=>String(name).trim().toLowerCase().replace(/\s+/g,' ');
 const units={cup:'cups',cups:'cups',pot:'cups',pots:'cups',tub:'tubs',tubs:'tubs',pcs:'pcs',pc:'pcs',piece:'pcs',pieces:'pcs',egg:'pcs',eggs:'pcs',pack:'packs',packs:'packs',portion:'portions',portions:'portions',g:'g',kg:'g',ml:'ml',l:'ml'};
 function quantity(text){const m=String(text||'').trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/);if(!m||!units[m[2]])return null;const amount=Number(m[1])*(m[2]==='kg'||m[2]==='l'?1000:1);return Number.isFinite(amount)&&amount>0?{amount,unit:units[m[2]]}:null;}
 function plan(items,logs,targetDays=6,today=Dates.today()){
  const groups=new Map();const start=Dates.addDays(today,-7);
  function group(name,unit){const key=normalize(name)+'|'+unit;if(!groups.has(key))groups.set(key,{key,name,unit,batches:[],logs:[]});return groups.get(key);}
  items.forEach(item=>{const q=quantity(item.qty);group(item.name,q?.unit||'unknown').batches.push({item,amount:q?.amount??null});});
  logs.filter(l=>l.consumed_on>=start&&l.consumed_on<today&&Number(l.amount)>0).forEach(l=>group(l.item_name,l.unit).logs.push(l));
  return [...groups.values()].map(g=>{
   const days=new Set(g.logs.map(l=>l.consumed_on)).size,total=g.logs.reduce((n,l)=>n+Number(l.amount),0),rate=days>=3?total/7:null;
   const dated=g.batches.map(b=>({...b,expiry:b.item.expires?Math.round((Dates.parse(b.item.expires)-Dates.parse(today))/86400000):null}));
   const expired=dated.filter(b=>b.expiry!==null&&b.expiry<0),soon=dated.filter(b=>b.expiry!==null&&b.expiry>=0&&b.expiry<=2);
   const stock=dated.filter(b=>b.expiry===null||b.expiry>=0).reduce((n,b)=>n+(b.amount||0),0);
   let usable=0;dated.filter(b=>b.expiry===null||b.expiry>=0).sort((a,b)=>(a.expiry??9999)-(b.expiry??9999)).forEach(b=>{usable+=rate&&b.expiry!==null?Math.min(b.amount||0,Math.max(0,rate*(b.expiry+1)-usable)):b.amount||0;});
   // Don't claim out-of-stock for a food whose inventory uses an incompatible unit.
   const incompatible=g.unit!=='unknown'&&items.some(i=>normalize(i.name)===normalize(g.name)&&quantity(i.qty)?.unit!==g.unit);
   const daysLeft=rate&&!incompatible?usable/rate:null;
   const needed=rate&&!incompatible?Math.max(0,Math.ceil((targetDays*rate-usable)*1000)/1000):null;
   const buy=needed===null?null:Math.ceil(needed);
   const priority=expired.length||daysLeft!==null&&daysLeft<=1?0:soon.length||daysLeft!==null&&daysLeft<=2?1:buy>0?2:3;
   return {...g,stock,usable,rate,days,daysLeft,buy,expired:expired.length,expiring:soon.length,expiry:soon.length?Math.min(...soon.map(b=>b.expiry)):null,priority,incompatible};
  }).filter(g=>g.buy>0||g.expired||g.expiring||g.batches.length).sort((a,b)=>a.priority-b.priority||(a.daysLeft??Infinity)-(b.daysLeft??Infinity)||a.name.localeCompare(b.name));
 }
 const fmt=n=>Number(n.toFixed(1)).toString();
 function summary(row){
  const parts=[];
  if(row.expired)parts.push('Expired stock excluded. Check and replace if needed.');
  if(row.expiring)parts.push(`Use soon: ${row.expiry===0?'today':`within ${row.expiry} day${row.expiry===1?'':'s'}`}.`);
  if(row.rate&&!row.incompatible)parts.push(`${fmt(row.stock)} ${row.unit} left · ${fmt(row.rate)} ${row.unit}/day · about ${fmt(row.daysLeft)} days of usable stock.`);
  else parts.push(row.unit==='unknown'?'Set a clear quantity, such as 6 cups or 500 g, to learn your pace.':row.incompatible?'Quantities use different units. Update them to compare like for like.':'Learning your pace—log amounts on at least 3 days.');
  return parts.join(' ');
 }
 function demoLogs(){return Array.from({length:7},(_,i)=>({id:'demo-yogurt-'+i,item_name:'Greek yogurt',amount:5,unit:'cups',consumed_on:Dates.addDays(Dates.today(),-i-1)}));}
 function usePlan(items,fridgeId,demo,userId){
  const sending=useRef(false);
  const [logs,setLogs]=useState([]),[error,setError]=useState(''),[revision,setRevision]=useState(0),[target,setTarget]=useState(6),[today,setToday]=useState(Dates.today());
  const [enabled,setEnabled]=useState(false),[notifyError,setNotifyError]=useState('');const scope=`${userId}:${fridgeId}`;
  useEffect(()=>{try{setEnabled(localStorage.getItem('chill-shopping-enabled:'+scope)==='true');}catch{setEnabled(false);}},[scope]);
  useEffect(()=>{const t=setInterval(()=>setToday(Dates.today()),60000);return()=>clearInterval(t);},[]);
  useEffect(()=>{let alive=true;setError('');setLogs([]);if(!fridgeId)return;if(demo){setLogs(demoLogs());return;}
   ChillAPI.consumption(fridgeId,Dates.addDays(today,-7)).then(data=>{if(alive)setLogs(data);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};
  },[fridgeId,demo,revision,today]);
  const rows=useMemo(()=>plan(items,logs,target,today),[items,logs,target,today]);const urgent=rows.filter(r=>r.priority<=1);
  async function send(force=false){if(!urgent.length||sending.current)return;sending.current=true;const key='chill-shopping-last:'+scope;
   try{const previous=Number(localStorage.getItem(key)||0);if(!force&&Date.now()-previous<6*3600000)return;
    const first=urgent[0],title=demo?'ChillCheck demo shopping reminder':'A little fridge heads-up';
    const body=`${first.name}: ${summary(first)}${first.buy>0?' Buy '+first.buy+' '+first.unit+' for '+target+' days.':''}${urgent.length>1?' + '+(urgent.length-1)+' more items to check.':''}`;
    if(!('Notification' in window)||Notification.permission!=='granted')throw Error('Enable browser notifications first.');
    const registration=await navigator.serviceWorker?.getRegistration('/');
    if(registration?.active)await registration.showNotification(title,{body,tag:'chill-shopping-'+fridgeId,data:{url:location.origin+'/?shopping=1'}});
    else {const notification=new Notification(title,{body,tag:'chill-shopping-'+fridgeId});notification.onclick=()=>{window.focus();window.dispatchEvent(new Event('chill-open-shopping'));notification.close();};}
    localStorage.setItem(key,String(Date.now()));setNotifyError('Reminder sent.');
   }catch(e){setNotifyError(e.message||'Notifications are unavailable in this browser. Your in-app list still works.');}finally{sending.current=false;}}
  useEffect(()=>{if(enabled&&!demo&&urgent.length&&('Notification' in window)&&Notification.permission==='granted')send();},[enabled,demo,rows,scope]);
  async function toggleNotifications(){if(enabled){setEnabled(false);try{localStorage.setItem('chill-shopping-enabled:'+scope,'false');}catch{}return;}
   if(!('Notification' in window)||!window.isSecureContext){setNotifyError('Browser notifications need HTTPS or localhost and a supported browser.');return;}
   try{const permission=await Notification.requestPermission();if(permission!=='granted'){setNotifyError('Notifications are blocked. You can allow them in browser site settings; in-app alerts remain available.');return;}
    if('serviceWorker' in navigator){const registration=await navigator.serviceWorker.register('/notification-worker.js');await navigator.serviceWorker.ready;}
    localStorage.setItem('chill-shopping-enabled:'+scope,'true');setEnabled(true);setNotifyError('Notifications enabled while ChillCheck is open.');
   }catch(e){setNotifyError('Could not enable notifications: '+e.message);}}
  return {rows,urgent,logs,error,target,setTarget,enabled,toggleNotifications,send,notifyError,reload:()=>setRevision(n=>n+1),addDemoLog:log=>setLogs(old=>[...old,log])};
 }
 function Panel({model,items,demo,onConsume,busy}){
  const [selected,setSelected]=useState(''),[amount,setAmount]=useState('1'),[message,setMessage]=useState('');
  const candidates=items.filter(i=>quantity(i.qty)&&Food.status(i)!=='expired');const item=candidates.find(i=>i.id===selected)||candidates[0],q=item&&quantity(item.qty);
  async function consume(e){e.preventDefault();setMessage('');try{if(!item||!q)throw Error('Add a food with a clear quantity, such as 6 cups.');const value=Number(amount);if(!Number.isFinite(value)||value<=0||value>q.amount)throw Error('Enter an amount greater than zero and no more than your stock.');await onConsume(item,value,q);setMessage('Logged. Your remaining stock has been updated.');}catch(e){setMessage(e.message);}}
  const shopping=model.rows.filter(r=>r.buy>0||r.expired||r.expiring);
  return h('section',{className:'screen shopping-screen'},h('div',null,h('span',{className:'eyebrow'},'Your pace. Your pantry.'),h('h1',null,'The next fridge haul'),h('p',{className:'lead'},'No judgement. I also need a snack before deciding on a snack.')),
   h('div',{className:'card shopping-settings'},h('label',{className:'field-group'},h('span',null,'Plan groceries for'),h('select',{className:'field','aria-label':'Plan groceries for',value:model.target,onChange:e=>model.setTarget(Number(e.target.value))},[3,6,7,14].map(n=>h('option',{key:n,value:n},n+' days')))),h('button',{className:'btn',onClick:model.toggleNotifications},model.enabled?'Turn off notifications':'Enable notifications'),h('button',{className:'btn',disabled:!model.enabled||!model.urgent.length,onClick:()=>model.send(true)},'Send a reminder now'),h('p',{className:'note'},'In-app alerts update with your inventory. Browser reminders work while the app is open; no closed-app push service is configured.'),model.notifyError&&h('p',{role:'status'},model.notifyError)),
   demo&&h('p',{className:'notice'},'Demo pattern: 5 yogurt cups per day over the last 7 days. Your real shopping list uses your own logged amounts.'),model.error&&h('p',{role:'alert'},model.error),
   h('div',{className:'shopping-list'},shopping.length?shopping.map(r=>h('article',{className:'card shopping-row',key:r.key},h('img',{src:ChillData.photo(r.name).src,onError:e=>ChillData.fallbackImage(e,ChillData.photo(r.name).key),alt:r.name,width:80,height:80}),h('div',null,h('span',{className:'pill '+(r.priority===0?'expired':r.priority===1?'soon':'safe')},r.priority===0?'Check today':r.priority===1?'Today / tomorrow':'Next shop'),h('h2',null,r.name),h('p',null,summary(r)),r.buy>0&&h('strong',null,`Buy ${r.buy} ${r.unit} to cover ${model.target} days`),r.rate&&h('p',{className:'note'},'Based on 7 complete days, including days without logged use. Expiring stock is limited to what you can use before its date.')))):h('p',{className:'empty'},'Nothing urgent. Log portions below to learn what you’ll need next.')),
   h('form',{className:'card consumption-form',onSubmit:consume},h('h2',null,'Had a little something?'),h('p',{className:'note'},'Log the amount you used. This reduces stock and helps estimate your shopping pace.'),h('label',{className:'field-group'},h('span',null,'Food used'),h('select',{className:'field','aria-label':'Food used',value:item?.id||'',onChange:e=>setSelected(e.target.value)},candidates.map(i=>h('option',{key:i.id,value:i.id},i.name+' · '+i.qty)))),h('label',{className:'field-group'},h('span',null,'Amount used'+(q?' ('+q.unit+')':'')),h('input',{className:'field',type:'number',min:0.001,max:q?.amount,step:'any',value:amount,onChange:e=>setAmount(e.target.value),required:true})),h('button',{className:'btn primary',disabled:busy||!item},busy?'Saving…':'Log consumption'),message&&h('p',{role:'status'},message)),
   h('p',{className:'note'},'Estimates depend on complete logs and matching units. Dates are planning cues, not a freshness guarantee. Check expiry dates when buying a multi-day supply.'));
 }
 function Teaser({model,onOpen}){return h('section',{className:'card shopping-teaser'},h('span',{className:'eyebrow'},'A little heads-up'),h('h2',null,'Before the last spoonful'),h('p',null,model.urgent.length?`${model.urgent.length} items need a look: running low, expiring soon or ready to replace.`:'Your next shop, shaped around what you actually use.'),h('button',{className:'btn primary',onClick:onOpen},'Open shopping list'));}
 return {quantity,plan,summary,demoLogs,usePlan,Panel,Teaser};
})();
