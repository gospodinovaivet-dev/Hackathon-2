/* Dashboard components. Sensor data is explicitly a simulation, reset on refresh. */
window.ChillWidgets = (() => {
 const h=React.createElement,{useState,useEffect,useRef}=React;
 const button=(label,onClick,props={})=>h('button',{type:'button',className:'btn',onClick,...props},label);
 function Photo({item}){const p=ChillData.photo(item.name,item.photoKey);return h('img',{src:p.src,alt:item.name,onError:e=>ChillData.fallbackImage(e,p.key),width:120,height:120});}
 const sensorMemory={open:false,logs:null};
 const jokes=['Your soup called. It would like a second date.','The ice cream tub has a plot twist: stuffed peppers.','Open. Close. Open. Close. Are we rehearsing a fridge musical?','No judgement. I also need a snack before deciding on a snack.'];
 function Robot({mini=false}){
  const stroke='#526A3D';
  return h('svg',{className:'chef-art'+(mini?' mini':''),viewBox:mini?'7 6 106 91':'0 0 120 160',width:mini?46:84,height:mini?48:112,'aria-hidden':true,focusable:false},
   !mini&&h('ellipse',{cx:60,cy:151,rx:30,ry:5,fill:'#526a3d20'}),
   !mini&&h('g',{className:'byte-leg left'},h('path',{d:'M43 125v13',stroke,strokeWidth:10,strokeLinecap:'round'}),h('rect',{x:30,y:136,width:23,height:12,rx:6,fill:stroke})),
   !mini&&h('g',{className:'byte-leg right'},h('path',{d:'M76 125v13',stroke,strokeWidth:10,strokeLinecap:'round'}),h('rect',{x:67,y:136,width:23,height:12,rx:6,fill:stroke})),
   h('g',{className:mini?'':'byte-torso'},
    !mini&&h('g',{className:'byte-arm left'},h('path',{d:'M35 94L19 99 22 111',fill:'none',stroke,strokeWidth:10,strokeLinecap:'round'}),h('circle',{cx:19,cy:99,r:5,fill:'#FFF1E8',stroke,strokeWidth:2}),h('path',{d:'M17 112v6q5 5 10 0v-6',fill:'none',stroke:'#809B62',strokeWidth:5,strokeLinecap:'round'})),
    !mini&&h('g',{className:'byte-arm right'},h('path',{d:'M85 94L101 99 98 111',fill:'none',stroke,strokeWidth:10,strokeLinecap:'round'}),h('circle',{cx:101,cy:99,r:5,fill:'#FFF1E8',stroke,strokeWidth:2}),h('path',{d:'M93 112v6q5 5 10 0v-6',fill:'none',stroke:'#809B62',strokeWidth:5,strokeLinecap:'round'})),
    !mini&&h('rect',{x:32,y:81,width:56,height:54,rx:13,fill:'#B9CE95',stroke,strokeWidth:2.5}),
    !mini&&h('path',{d:'M44 85v13l-6 29q22 10 44 0l-6-29V85',fill:'#fffaf3',stroke,strokeWidth:2,strokeLinejoin:'round'}),
    !mini&&h('path',{d:'M48 111h24v8q-12 11-24 0Z',fill:'#EFA7BC',stroke:'#cf8399',strokeWidth:1.5}),!mini&&h('circle',{cx:60,cy:103,r:3,fill:'#809B62'}),
    h('path',{d:'M23 57L14 48V35M97 57l9-9V35',fill:'none',stroke,strokeWidth:3,strokeLinecap:'round'}),
    h('circle',{cx:14,cy:33,r:4,fill:'#EFA7BC',stroke,strokeWidth:1.5}),h('circle',{cx:106,cy:33,r:4,fill:'#EFA7BC',stroke,strokeWidth:1.5}),
    h('rect',{x:15,y:58,width:12,height:20,rx:5,fill:'#EFA7BC',stroke,strokeWidth:2}),h('rect',{x:93,y:58,width:12,height:20,rx:5,fill:'#EFA7BC',stroke,strokeWidth:2}),
    h('rect',{x:23,y:43,width:74,height:49,rx:14,fill:'#B9CE95',stroke,strokeWidth:2.5}),
    h('rect',{x:29,y:52,width:62,height:32,rx:10,fill:'#344638'}),
    h('path',{d:'M35 57h17',stroke:'#ffffff30',strokeWidth:2,strokeLinecap:'round'}),
    h('rect',{x:40,y:61,width:7,height:10,rx:3,fill:'#D6F6A9'}),h('rect',{x:73,y:61,width:7,height:10,rx:3,fill:'#D6F6A9'}),
    h('rect',{x:34,y:73,width:9,height:3,rx:1.5,fill:'#EFA7BC'}),h('rect',{x:77,y:73,width:9,height:3,rx:1.5,fill:'#EFA7BC'}),
    h('path',{d:'M54 74q6 6 12 0',fill:'none',stroke:'#D6F6A9',strokeWidth:2,strokeLinecap:'round'}),
    h('path',{d:'M34 47V34C15 31 19 10 36 12C42 0 58 4 62 10C77 0 88 10 87 16C107 18 103 36 87 37V47Z',fill:'#ffffff',stroke:'#a7b897',strokeWidth:2,strokeLinejoin:'round'}),
    h('path',{d:'M35 40h51v8H35Z',fill:'#fffdf8',stroke:'#a7b897',strokeWidth:1.5}),
    h('path',{d:'M49 27v11m22-12v12',fill:'none',stroke:'#e4ead9',strokeWidth:2,strokeLinecap:'round'})));
 }
 function Mascot({screen='home'}){
  const [index,setIndex]=useState(0),[paused,setPaused]=useState(false),[collapsed,setCollapsed]=useState(()=>matchMedia('(max-width:600px)').matches),[tip,setTip]=useState(false),[still,setStill]=useState(false);
  useEffect(()=>{if(paused||collapsed||tip)return;const timer=setInterval(()=>setIndex(i=>(i+1)%jokes.length),11000);return()=>clearInterval(timer);},[paused,collapsed,tip]);
  useEffect(()=>setTip(false),[screen]);
  const tips={home:'Start with Eat Me First. Your next meal might already be waiting.',eat:'A familiar tub can hold a surprise. Identify the contents before choosing its shelf.',recipes:'Pick an ingredient photo to find a recipe that puts it first.',shopping:'Log what you use. I can help spot when the last spoonful is getting close.',history:'A receipt records a purchase; consumption logs tell the rest of the story.',nutrition:'Try a little variety. Your fridge has more than one main character.'};
  return h('aside',{className:'chef-assistant'+(collapsed?' collapsed':'')+(still?' still':''),'aria-label':'Chef Byte'},
   !collapsed&&h('div',{className:'chef-bubble'},h('div',{className:'chef-bubble-heading'},h('strong',null,'Chef Byte'),button('×',()=>setCollapsed(true),{className:'chef-dismiss','aria-label':'Minimize Chef Byte'})),
    button(tip?(tips[screen]||tips.home):jokes[index],()=>{setTip(false);setIndex(i=>(i+1)%jokes.length);},{className:'chef-cloud',title:'Another joke'}),
    h('div',{className:'chef-options'},button('Tip',()=>setTip(true),{className:'link'}),button('Joke',()=>{setTip(false);setIndex(i=>(i+1)%jokes.length);},{className:'link'}),button(still?'Let me walk':'Pause walking',()=>setStill(!still),{className:'link','aria-pressed':still}),button(paused?'Resume jokes':'Pause jokes',()=>setPaused(!paused),{className:'link','aria-pressed':paused}))),
   button(h(Robot),()=>setCollapsed(!collapsed),{className:'chef-toggle','aria-label':collapsed?'Open Chef Byte':'Minimize Chef Byte','aria-expanded':!collapsed}));
 }
 function Sensors({fridgeId}){
  const [open,setOpen]=useState(sensorMemory.open),[show,setShow]=useState(false);
  const [logs,setLogs]=useState(()=>sensorMemory.logs||[{at:Date.now()-18*60000,event:'Closed',note:''},{at:Date.now()-19*60000,event:'Opened',note:''}]);
  useEffect(()=>{Object.assign(sensorMemory,{open,logs});},[open,logs]);
  const [now,setNow]=useState(Date.now());useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),15000);return()=>clearInterval(t);},[]);
  const lastOpen=logs.find(l=>l.event==='Opened'),count=logs.filter(l=>l.event==='Opened').length;
  const storageKey='chillcheck-cleaning:'+fridgeId;
  const [cleanings,setCleanings]=useState(()=>{try{const entries=JSON.parse(localStorage.getItem(storageKey)||'[]');return Array.isArray(entries)?entries.filter(d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)).sort().reverse():[];}catch{return [];}});
  const [editCleaning,setEditCleaning]=useState(false),[date,setDate]=useState(Dates.today()),[error,setError]=useState('');
  const lastCleaned=cleanings[0],due=!lastCleaned||-Dates.daysUntil(lastCleaned)>=30;
  function saveCleaning(e){e.preventDefault();if(!date||date>Dates.today()||!Dates.valid(date)){setError('Choose a valid cleaning date within the last year, no later than today.');return;}
   const next=[...new Set([date,...cleanings])].sort().reverse().slice(0,50);try{localStorage.setItem(storageKey,JSON.stringify(next));setCleanings(next);setEditCleaning(false);setError('');}catch{setError('This browser could not save the date. Allow local storage and try again.');}}
  function toggle(){const next=!open;setOpen(next);setNow(Date.now());setLogs(old=>[{at:Date.now(),event:next?'Opened':'Closed',note:''},...old].slice(0,100));}
  const tile=(label,value,note)=>h('div',{className:'reading safe',key:label},h('span',{className:'reading-label'},h('span',{className:'dot'}),label),h('strong',{className:'reading-value'},value),note&&h('span',{className:'reading-text'},note));
  return h('section',{className:'card sensor-card'},h('span',{className:'eyebrow'},'The cool report'),h('h2',null,'Cool, calm & closed-ish'),
   h('div',{className:'readings'},tile('Temperature',open?'5.1°C':'4.0°C',''),tile('Door',open?'Open':'Closed',''),tile('Humidity',open?'68%':'62%','Relative humidity'),tile('Ice buildup','Low','Frost coverage · 8%'),tile('Energy use','0.8 kWh','Today · 42 W now'),
    button(h(React.Fragment,null,h('span',{className:'reading-label'},h('span',{className:'dot'}),'Cleaning'),h('strong',{className:'reading-value cleaning-value'},due?'Cleaning due':'Fresh & clean'),h('span',{className:'reading-text'},lastCleaned?'Last cleaned '+new Date(lastCleaned+'T12:00:00').toLocaleDateString():'No cleaning date logged'),h('span',{className:'cleaning-link'},'Log a cleaning date →')),()=>{setEditCleaning(!editCleaning);setError('');},{className:'reading cleaning-tile '+(due?'soon':'safe'),'aria-label':'Log a cleaning date','aria-expanded':editCleaning})),
   editCleaning&&h('form',{className:'cleaning-form',onSubmit:saveCleaning},h('label',{className:'field-group'},h('span',null,'Date cleaned'),h('input',{className:'field',type:'date',value:date,max:Dates.today(),required:true,onChange:e=>setDate(e.target.value)})),h('div',{className:'btn-row'},h('button',{className:'btn small primary',type:'submit'},'Save cleaning date'),button('Cancel',()=>setEditCleaning(false),{className:'btn small'})),error&&h('p',{role:'alert'},error),cleanings.length>0&&h('details',null,h('summary',null,'Cleaning history'),h('ul',null,cleanings.map(d=>h('li',{key:d},d))))),
   h('p',{className:'note'},`Last opened ${Math.max(0,Math.floor((now-lastOpen.at)/60000))} min ago · ${count} openings this session`),
   h('div',{className:'btn-row'},button(open?'Log closing':'Log opening',toggle,{className:'btn small'}),button(show?'Hide door log':'View door log',()=>setShow(!show),{className:'btn small','aria-expanded':show})),
   show&&h('ol',{className:'door-log'},logs.map((l,i)=>h('li',{key:i},h('time',null,new Date(l.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})),h('span',null,l.event),h('small',null,l.note)))));
 }
 function QR({fridgeId,onClose,onReceive}){
  const local=['127.0.0.1','localhost','::1','[::1]'].includes(location.hostname);
  const [base,setBase]=useState(local?'':location.origin+location.pathname),[error,setError]=useState('');const ref=useRef(null),seen=useRef(new Set());
  const [since]=useState(()=>new Date().toISOString());
  // On this computer the page is at localhost, which a phone cannot open: use this computer's Wi-Fi address instead
  useEffect(()=>{if(!local)return;let alive=true;fetch('/phone-url.json').then(r=>r.ok?r.json():null).then(d=>{if(alive&&d?.url)setBase(d.url);}).catch(()=>{});return()=>{alive=false;};},[]);
  let url='';try{const u=new URL(base);if(!['http:','https:'].includes(u.protocol)||['localhost','127.0.0.1','[::1]'].includes(u.hostname))throw Error();u.searchParams.set('phone','1');u.searchParams.set('fridge',fridgeId);url=u.href;}catch{}
  useEffect(()=>{if(ref.current){ref.current.replaceChildren();if(url)new QRCode(ref.current,{text:url,width:200,height:200,correctLevel:QRCode.CorrectLevel.M});}},[url]);
  useEffect(()=>{let alive=true,running=false;async function poll(){if(running)return;running=true;try{const rows=await ChillAPI.phoneInbox(fridgeId,since);if(alive){const next=rows.find(r=>!seen.current.has(r.id));if(next){seen.current.add(next.id);onReceive(next);}}}catch(e){if(alive)setError(e.message);}finally{running=false;}}const t=setInterval(poll,4000);return()=>{alive=false;clearInterval(t);};},[fridgeId,since]);
  return h('section',{className:'card qr-panel'},h('h3',null,'Your phone is the fridge camera'),h('p',null,'Scan the QR, sign in to the same account, take a photo and send it here for review.'),
   h('div',{ref,className:'qr-code','aria-label':'Scan to open the phone camera page'}),url&&h('a',{href:url,target:'_blank',rel:'noreferrer'},'Open phone page'),
   error&&h('p',{role:'alert'},error),button('Close phone pairing',onClose));
 }
 function ScanControls({items,onResult,onExample,busy,phone,fridgeId}){
  const [working,setWorking]=useState(false),[error,setError]=useState(''),[qr,setQr]=useState(false),[status,setStatus]=useState(''),[camera,setCamera]=useState(false);
  const input=useRef(null),video=useRef(null),stream=useRef(null),mode=useRef('food');
  const stop=()=>{stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;setCamera(false);};
  useEffect(()=>()=>stream.current?.getTracks().forEach(t=>t.stop()),[]);
  async function scan(file){if(!file)return;setWorking(true);setError('');setStatus('Looking closely at food, containers and dates…');
   try{if(!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type))throw Error('Choose a JPG, PNG or WebP photo. Convert HEIC if your browser cannot open it.');if(file.size>15*1024*1024)throw Error('Choose a photo smaller than 15 MB.');
    const result=await Scanner.readPhoto(file,items);
    if(result.unclear)throw Error('This photo is too blurry or dark. Please take a clearer photo.');
    if(!result.items.length)throw Error('No food found. Try a closer photo with the door open.');
    // Keep receipt omissions from removing unrelated inventory.
    const payload={...result,source:result.type==='bill'?'receipt':phone?'phone':'camera'};
    if(phone){await ChillAPI.sendPhone(fridgeId,payload);setStatus('Sent! Review and confirm the items on your computer.');}
    else {onResult(payload);setStatus('');}
   }catch(e){setError(e.message||'Could not read the photo. Try again.');setStatus('');}finally{setWorking(false);}}
  async function startCamera(){setError('');try{if(!navigator.mediaDevices?.getUserMedia)throw Error('Live preview needs HTTPS or localhost. Use Take / upload photo instead.');const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});stream.current=media;setCamera(true);setTimeout(()=>{if(video.current){video.current.srcObject=media;video.current.play().catch(()=>{});}},0);}catch(e){setError(e.message);}}
  function capture(){const v=video.current;if(!v?.videoWidth)return;const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);c.toBlob(blob=>{stop();scan(blob);},'image/jpeg',.9);}
  function pick(type){mode.current=type;input.current?.click();}
  return h('section',{className:'card scan-card'},h('span',{className:'eyebrow'},'A fridge haul, without the guesswork'),h('h2',null,'What’s in My Fridge?'),h('p',null,'Open the door. Meet the ingredients. Find your next good meal.'),
   h('input',{ref:input,type:'file',accept:'image/*',capture:phone?'environment':undefined,hidden:true,onChange:e=>{scan(e.target.files[0]);e.target.value='';}}),
   h('div',{className:'scan-actions'},button(working?'Reading photo…':'Take / upload photo',()=>pick('food'),{className:'btn primary',disabled:busy||working}),button('Scan a receipt',()=>pick('receipt'),{disabled:busy||working}),button('Open camera',startCamera,{disabled:busy||working}),!phone&&button('Scan with my phone · QR',()=>setQr(!qr),{disabled:busy||working}),!phone&&button('Try example scan',onExample,{disabled:busy||working})),
   camera&&h('div',{className:'camera-preview'},h('video',{ref:video,playsInline:true,muted:true,autoPlay:true}),button('Capture photo',capture,{disabled:working}),button('Close camera',stop)),
   status&&h('p',{role:'status'},status),error&&h('p',{role:'alert',className:'error'},error),
   h('p',{className:'note'},'Photos and receipts use AI when configured. Always review dates and hidden contents. Read a package date from any item’s Edit screen.'),
   qr&&h(QR,{fridgeId,onClose:()=>setQr(false),onReceive:row=>{setQr(false);onResult({...row.payload,source:'phone',transferId:row.id});}}));
 }
 function Dashboard({fridgePicker,onAdd,shopping,name,items,onNavigate,onFilter,onIngredient,onScan,onResult,busy,fridgeId,phone,demo}){
  const counts=Food.counts(items);const soon=Food.byUrgency(items.filter(i=>Food.status(i)==='soon')).slice(0,4);
  return h('section',{className:'screen home-screen'},h('div',{className:'hello'},h('div',null,h('h1',null,`Hi ${name.split(' ')[0]}`)),
   h('div',{className:'fridge-view-switch'},button('+ Add food',onAdd,{className:'btn primary',disabled:busy}),fridgePicker)),
   h('div',{className:'home-shortcuts'},h(ChillShopping.Teaser,{model:shopping,onOpen:()=>onNavigate('shopping')}),[['recipes','Recipes','♨'],['nutrition','Food & your body','♡']].map(([screen,title,icon])=>button(h(React.Fragment,null,h('span',{className:'nav-icon','aria-hidden':true},icon),h('span',{className:'nav-title'},title),h('span',{className:'nav-arrow','aria-hidden':true},'→')),()=>onNavigate(screen),{key:screen,className:'nav-card'+(screen==='nutrition'?' sky':''),'aria-label':'Open '+title}))),
   h('div',{className:'home-grid dashboard-grid'},h('div',{className:'col'},
    !phone&&h('section',{className:'eat-btn eat-widget'},button('Eat Me First',()=>onNavigate('eat'),{className:'eat-title eat-heading'}),h('p',{className:'eat-sub'},'Less waste. More taste. Peek inside.'),
     h('div',{className:'expiry-previews'},soon.map(item=>h('button',{key:item.id,type:'button',className:'expiry-product',onClick:()=>onIngredient(item.name),'aria-label':`Recipes with ${item.name}`},h(Photo,{item}),h('span',{className:'days-badge'},`${Math.max(0,Dates.daysUntil(item.expires))}d`),h('span',{className:'expiry-name'},item.name)))),
     !soon.length&&h('p',null,'Nothing needs eating soon. Take a look at your full fridge.'),
     button('→',()=>onNavigate('eat'),{className:'eat-corner-arrow','aria-label':'See all food',title:'See all food'}),
     h('div',{className:'counts'},STATUS_ORDER.map(status=>button(h(React.Fragment,null,h('span',{className:'dot'}),status==='unknown'?'Unrecognized':STATUS[status].label,' ',status==='unknown'?items.filter(ChillData.isUnrecognized).length:counts[status]),()=>onFilter(status==='unknown'?'unrecognized':'status:'+status),{key:status,className:'count '+status})),button(h(React.Fragment,null,h('span',{className:'dot'}),'Balkan packaging ',items.filter(ChillData.isBalkan).length),()=>onFilter('balkan'),{className:'count balkan'}))),
    h(ScanControls,{items,onResult,onExample:onScan,busy,phone,fridgeId})),
    h('div',{className:'col'},h(Sensors,{key:fridgeId,fridgeId}))));
 }
 return {Dashboard,ScanControls,Mascot,Robot};
})();
