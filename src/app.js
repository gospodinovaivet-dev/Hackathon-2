/* React entry point. Uses createElement to run without npm, JSX or a bundler. */
(() => {
  const {useState,useEffect,useRef} = React;
  const h = React.createElement;
  const api = ChillAPI;
  const btn = (text, onClick, props={}) => h('button',{type:'button',className:'btn',onClick,...props},text);
  const field = (label,props) => h('label',{className:'field-group'},h('span',null,label),h('input',{className:'field',...props}));
  const select = (label,value,onChange,options) => h('label',{className:'field-group'},h('span',null,label),
    h('select',{className:'field',value,onChange:e=>onChange(e.target.value)},options.map(([v,t])=>h('option',{key:v,value:v},t))));
  function Picture({name,photoKey,large=false}) {
    const photo=ChillData.photo(name,photoKey);
    return h('figure',{className:'product-photo'+(large?' large':'')},
      h('img',{src:photo.src,alt:photo.placeholder?'Closed food container':`Illustrative photo of ${name}`,loading:'lazy',onError:e=>ChillData.fallbackImage(e,photo.key),width:480,height:480}),
      photo.placeholder&&h('figcaption',null,'Photo unavailable'));
  }
  function Status({item}) {return h('span',{className:'pill '+Food.status(item)},Food.daysText(item));}
  function Auth({onError}) {
    const [mode,setMode]=useState('signin'),[email,setEmail]=useState(''),[password,setPassword]=useState('');
    const [name,setName]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
    async function submit(e) {
      e.preventDefault();setBusy(true);setMessage('');onError('');
      try {
        const client=api.client();
        const response=mode==='signup'
          ? await client.auth.signUp({email,password,options:{data:{display_name:name.trim()},emailRedirectTo:location.origin+(location.pathname==='/'?'/index.local.html':location.pathname)}})
          : await client.auth.signInWithPassword({email,password});
        if(response.error) throw response.error;
        if(mode==='signup'&&!response.data.session) setMessage('Check your email to confirm your account, then sign in here.');
      } catch(e) {onError(e.message);} finally {setBusy(false);}
    }
    return h('section',{className:'auth-layout'},
      h('div',{className:'auth-intro'},h('span',{className:'eyebrow'},'A little less waste. A little more care.'),
        h('h1',null,'Good food,',' ',h('span',{className:'pink-text'},'remembered.')),
        h('p',{className:'lead'},'Your fridge, your leftovers, and a gentle nudge to eat the good stuff first.'),
        h('div',{className:'auth-photos'},['Rice-stuffed peppers','Tomatoes','Eggs'].map(name=>h(Picture,{key:name,name})))),
      h('form',{className:'card auth-card',onSubmit:submit},
        h('h2',null,mode==='signup'?'Make yourself at home':'Welcome back'),
        h('p',{className:'note'},'Sign in to keep your fridge saved across devices.'),
        mode==='signup'&&field('Your name',{value:name,onChange:e=>setName(e.target.value),required:true,maxLength:80,autoComplete:'name'}),
        field('Email',{type:'email',value:email,onChange:e=>setEmail(e.target.value),required:true,autoComplete:'email'}),
        field('Password',{type:'password',value:password,onChange:e=>setPassword(e.target.value),required:true,minLength:8,autoComplete:mode==='signup'?'new-password':'current-password'}),
        h('button',{className:'btn primary',disabled:busy||!window.ChillCheckBackend},busy?'Please wait…':mode==='signup'?'Create account':'Sign in'),
        message&&h('p',{role:'status',className:'notice'},message),
        !window.ChillCheckBackend&&h('p',{className:'error'},'Supabase is not configured. Fill in .env and run python3 scripts/start.py.'),
        btn(mode==='signup'?'Already have an account? Sign in':'New here? Create an account',()=>{setMode(mode==='signup'?'signin':'signup');setMessage('');onError('');},{className:'link',disabled:busy})));
  }
  function CreateFridge({onCreate,busy}) {
    const [name,setName]=useState('My fridge');
    return h('form',{className:'card narrow-card',onSubmit:e=>{e.preventDefault();onCreate(name);}},
      h('h1',null,'Meet your fridge'),h('p',{className:'lead'},'Give it a name. Your food will be saved securely to your account.'),
      field('Fridge name',{value:name,onChange:e=>setName(e.target.value),maxLength:80,required:true}),
      h('button',{className:'btn primary',disabled:busy||!name.trim()},busy?'Creating…':'Create fridge'));
  }
  function FoodForm({item,onSave,onClose,busy,error}) {
    const [labelBusy,setLabelBusy]=useState(false),[labelError,setLabelError]=useState('');
    const [form,setForm]=useState(item||{name:'',qty:'',kind:'other',category:'unknown',shelf:'',expires:'',dateSource:'unknown',container:'',note:''});
    const ref=useRef(null);
    const change=(key,value)=>setForm(old=>({...old,[key]:value}));
    useEffect(()=>{
      const previous=document.activeElement;ref.current?.querySelector('input')?.focus();
      return ()=>previous?.focus?.();
    },[]);
    function keys(e) {
      if(e.key==='Escape'&&!busy) onClose();
      if(e.key==='Tab') {
        const nodes=[...ref.current.querySelectorAll('input,select,button,textarea')].filter(n=>!n.disabled);
        const first=nodes[0],last=nodes[nodes.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    }
    return h('div',{className:'modal',role:'dialog','aria-modal':true,'aria-labelledby':'food-form-title',onKeyDown:keys},
      h('form',{ref,className:'card food-editor',onSubmit:async e=>{e.preventDefault();if(await onSave(form))onClose();}},
        h('h2',{id:'food-form-title'},item?'Edit food':'Add something good'),
        error&&h('p',{className:'error',role:'alert'},error),
        field('Food name',{value:form.name,onChange:e=>change('name',e.target.value),required:true,maxLength:120}),
        h('div',{className:'add-grid'},
          field('Quantity',{value:form.qty,onChange:e=>change('qty',e.target.value),placeholder:'e.g. 4 peppers'}),
          field('Expiry date (leave blank if unknown)',{type:'date',value:form.expires||'',onChange:e=>setForm(old=>({...old,expires:e.target.value,dateSource:e.target.value?'manual':'unknown',dateText:''}))}),
          select('Food kind',form.kind,v=>change('kind',v),[['fresh','Fresh'],['packaged','Packaged'],['cooked','Cooked / leftovers'],['other','Other']]),
          select('Category',form.category,v=>change('category',v),CATEGORIES.map(c=>[c.id,c.label])),
          select('Shelf',form.shelf,v=>change('shelf',v),[['','Not sure'],...SHELVES.map(s=>[s,s])]),
          form.kind==='cooked'&&field('Cooked on (if known)',{type:'date',value:form.cookedOn||'',onChange:e=>change('cookedOn',e.target.value)})),
        h('label',{className:'field-group'},h('span',null,labelBusy?'Reading package date…':'Scan package date / barcode'),h('input',{type:'file',accept:'image/*',capture:'environment',disabled:busy||labelBusy,onChange:async e=>{const file=e.target.files[0];if(!file)return;setLabelBusy(true);setLabelError('');try{const result=await Scanner.readLabel(file,form.name);setForm(old=>({...old,barcode:result.barcode||old.barcode,...(result.found?{expires:result.date,dateText:result.dateText,dateSource:'label'}:{})}));if(!result.found)setLabelError('No fully readable date found. Enter it manually; no date was guessed.');}catch(err){setLabelError(err.message);}finally{setLabelBusy(false);}}})),labelError&&h('p',{role:'status'},labelError),
        field('Container',{ value:form.container||'',onChange:e=>change('container',e.target.value),placeholder:'e.g. reused ice cream tub'}),
        field('Notes',{value:form.note||'',onChange:e=>change('note',e.target.value)}),
        h('div',{className:'btn-row'},h('button',{className:'btn primary',disabled:busy||labelBusy||!form.name.trim()},busy?'Saving…':'Save food'),btn('Cancel',onClose,{disabled:busy}))));
  }
  function ShelfZone({shelf,list,selected,onSelect,onItem,selectedItem}) {
    const [open,setOpen]=useState(false);
    const count=Food.counts(list),tone=count.expired?'expired':count.soon?'soon':count.unknown?'unknown':'safe';
    const id='shelf-tip-'+SHELVES.indexOf(shelf);
    return h('div',{className:'shelf-zone'+(shelf==='Door rack'?' door-rack':'')+(shelf==='Crisper drawer'?' crisper':''),onMouseEnter:()=>setOpen(true),onMouseLeave:()=>setOpen(false),onBlur:e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);},onKeyDown:e=>{if(e.key==='Escape'){setOpen(false);e.stopPropagation();}}},
      h('button',{type:'button',className:'zone '+tone,'aria-pressed':selected,'aria-describedby':open?id:undefined,onFocus:()=>setOpen(true),onClick:onSelect},h('span',{className:'zone-name'},shelf),h('span',{className:'zone-count'},plural(list.length,'item'))),
      onItem&&h('div',{className:'twin-products'},list.length?list.map(item=>{const photo=ChillData.photo(item.name,item.photoKey),state=Food.status(item),suggestion=ChillStorage.suggest(item),move=state!=='expired'&&suggestion.shelf&&!(suggestion.allowed||[suggestion.shelf]).includes(item.shelf);const label=state==='expired'?'Expired':ChillData.isUnrecognized(item)?'Identify':move?'Move':state==='soon'?Food.daysText(item):state==='unknown'?'Check date':'';
        return btn(h(React.Fragment,null,h('img',{src:photo.src,alt:'',onError:e=>ChillData.fallbackImage(e,photo.key)}),label&&h('span',{className:'twin-badge'},label),h('span',{className:'twin-name'},item.name)),()=>{setOpen(false);onItem(item);},{key:item.id,className:'twin-product '+state+(move?' needs-move':''),'aria-label':'Locate '+item.name,'aria-pressed':selectedItem===item.id,title:item.name+(label?' · '+label:'')});}):h('span',{className:'twin-empty'},'Room for something good')),
      btn('i',()=>setOpen(v=>!v),{className:'shelf-help','aria-label':'Storage tips for '+shelf,'aria-expanded':open,'aria-controls':id}),
      open&&h('div',{id,role:'tooltip',className:'shelf-tooltip'},h('div',{className:'shelf-tip-heading'},h(ChillWidgets.Robot,{mini:true}),h('strong',null,ChillStorage.headings[shelf])),h('p',null,ChillStorage.tips[shelf])));
  }
  function Placement({item,onEdit,busy}) {
    const suggestion=ChillStorage.suggest(item);
    const fits=suggestion.shelf&&(suggestion.allowed||[suggestion.shelf]).includes(item.shelf);
    return h('div',{className:'placement-tip'},h('strong',null,suggestion.shelf?(fits?'A good spot':'Suggested spot: '+suggestion.shelf):'Find its happy place'),h('p',null,suggestion.reason),
      suggestion.shelf&&!fits&&btn('Update shelf →',()=>onEdit({...item,shelf:suggestion.shelf}),{className:'link',disabled:busy,'aria-label':'Update shelf for '+item.name}),
      suggestion.shelf&&!fits&&h('small',null,'Move the food, then save its new shelf.'));
  }
  function Inventory({items,onEdit,onFinish,onResult,onExample,fridgeId,busy,initialFilter=''}) {
    const [filter,setFilter]=useState(initialFilter),[shelf,setShelf]=useState(''),[selectedItem,setSelectedItem]=useState(''),[scanOpen,setScanOpen]=useState(()=>items.length===0);
    useEffect(()=>{setFilter(initialFilter);setShelf('');setSelectedItem('');},[initialFilter]);
    const matches=(i,f)=>f==='balkan'?ChillData.isBalkan(i):f==='unrecognized'||f==='unknown'?ChillData.isUnrecognized(i):f.startsWith('status:')?Food.status(i)===f.slice(7):Food.categoryOf(i)===f;
    const shown=Food.byUrgency(items.filter(i=>(!filter||matches(i,filter))&&(!shelf||i.shelf===shelf)&&(!selectedItem||i.id===selectedItem)));
    const moves=items.filter(i=>{const rec=ChillStorage.suggest(i);return Food.status(i)!=='expired'&&rec.shelf&&!(rec.allowed||[rec.shelf]).includes(i.shelf);});
    const unplaced=items.filter(i=>!SHELVES.includes(i.shelf));
    return h('section',null,h('div',{className:'section-heading'},h('div',null,h('h1',null,'Eat Me First'),h('p',{className:'lead'},'A little attention goes a long way.'))),
      h('div',{className:'eat-layout'},
        h('aside',{className:'fridge-panel'},
          h('div',{className:'fridge-map card digital-fridge'},h('div',{className:'twin-heading'},h('div',null,h('span',{className:'eyebrow'},'Your fridge, mapped'),h('h2',null,'Peek inside')),btn(scanOpen?'Close scan':'Scan fridge',()=>setScanOpen(v=>!v),{className:'btn small',disabled:busy,'aria-expanded':scanOpen})),
            h('p',{className:'note'},'From reviewed scans and saved shelf locations.'),
            h('div',{className:'twin-legend'},h('span',null,'● Expired'),h('span',null,'● Eat soon'),h('span',null,'↗ Move'),h('span',null,'? Check')),
            h('div',{className:'fridge-interior'},SHELVES.map(s=>h(ShelfZone,{key:s,shelf:s,list:items.filter(i=>i.shelf===s),selected:shelf===s,selectedItem,onItem:item=>{setSelectedItem(item.id);setFilter('');setShelf('');},onSelect:()=>{setShelf(shelf===s?'':s);setFilter('');setSelectedItem('');}}))),
            !!unplaced.length&&h('div',{className:'twin-unplaced'},h('strong',null,'Location to confirm'),unplaced.map(i=>btn(i.name,()=>{setSelectedItem(i.id);setShelf('');setFilter('');},{key:i.id,className:'chip'}))),
            h('p',{className:'note'},'Tap a product to inspect it. Hover or tap ⓘ for shelf tips.')),
          h('section',{className:'card move-plan'},h('h3',null,'A better spot'),moves.length?moves.map(i=>{const rec=ChillStorage.suggest(i);return h('div',{className:'move-row',key:i.id},h('div',null,h('strong',null,i.name),h('p',null,(i.shelf||'No shelf yet')+' → '+rec.shelf)),btn('Review move',()=>onEdit({...i,shelf:rec.shelf}),{className:'btn small',disabled:busy,'aria-label':'Review move for '+i.name}));}):h('p',{className:'note'},'No shelf moves suggested. Check any unknown contents and dates.'))),
        h('div',{className:'eat-list'},h('div',{className:'type-filters inventory-filters'},[...CATEGORIES,{id:'balkan',label:'Balkan packaging',icon:'📦'}].map(c=>{
            const n=items.filter(i=>matches(i,c.id)).length;
            return h('button',{key:c.id,id:'type-'+c.id,type:'button',className:'type-btn'+(!n?' empty':''),'aria-pressed':filter===c.id||(c.id==='unknown'&&filter==='unrecognized'),onClick:()=>{setFilter(filter===c.id?'':c.id);setShelf('');setSelectedItem('');}},
              h('span',{className:'type-icon'},c.icon,h('span',{className:'type-n'},n)),h('span',{className:'type-label'},c.label));
          })),scanOpen&&h(ChillWidgets.ScanControls,{items,onResult,onExample,busy,fridgeId}),filter==='balkan'&&h('p',{className:'notice'},'Balkan packaging: familiar tubs, unexpected contents. Check what is inside, not the original label.'),filter==='unrecognized'&&h('p',{className:'notice'},'What’s in this box? Open it, identify the contents, then edit the item.'),(filter||shelf||selectedItem)&&btn('Clear filter',()=>{setFilter('');setShelf('');setSelectedItem('');},{className:'link'}),
          !shown.length&&h('div',{className:'empty'},items.length?'Nothing in this category yet.':'Your fridge is ready for its first ingredients.'),
          STATUS_ORDER.map(status=>{
            const group=shown.filter(i=>Food.status(i)===status);if(!group.length)return null;
            return h('section',{key:status,className:'group '+status},h('h2',{className:'group-head'},h('span',{className:'dot'}),STATUS[status].label,h('span',{className:'n'},group.length)),
              group.map(item=>h('article',{key:item.id,className:'erow '+status+(selectedItem===item.id?' twin-selected':'')},h('span',{className:'bar'}),
                h('div',{className:'product-info'},h(Picture,{name:item.name,photoKey:item.photoKey}),h('div',{className:'product-copy'},
                  h('h3',{className:'name'},item.name),h('p',{className:'meta'},[item.qty,item.shelf].filter(Boolean).join(' · ')),
                  item.container&&h('p',{className:'meta'},item.container),h('p',{className:'source'},Food.sourceText(item)),item.note&&h('p',{className:'warn-note'},item.note),h(Placement,{item,onEdit,busy}))),
                h('div',{className:'right'},h(Status,{item}),h('div',{className:'actions'},btn('Edit',()=>onEdit(item),{className:'btn small',disabled:busy}),
                  btn(status==='expired'?'Discard':'Eaten',()=>onFinish(item,status==='expired'?'discarded':'eaten'),{className:'btn small',disabled:busy}))))));
          }))));
  }
  function Review({draft,setDraft,onSave,onClose,busy}) {
    const [photoUrl,setPhotoUrl]=useState(''),[refining,setRefining]=useState(false),[refineError,setRefineError]=useState('');
    useEffect(()=>{if(!draft.photo)return;const url=URL.createObjectURL(draft.photo);setPhotoUrl(url);return()=>URL.revokeObjectURL(url);},[draft.photo]);
    async function refine(){setRefining(true);setRefineError('');try{const rows=draft.rows.map(r=>({...r}));await Scanner.refineBoxes(draft.photo,rows,()=>setDraft(old=>({...old,rows:[...rows]})));}catch(e){setRefineError(e.message);}finally{setRefining(false);}}

    function patch(id,values){setDraft(old=>({...old,rows:old.rows.map(i=>i.id===id?{...i,...values}:i)}));}
    return h('section',{className:'screen'},h('div',null,h('span',{className:'eyebrow'},draft.source==='example'?'Example scan · review before saving':'Photo scan · review before saving'),h('h1',null,'Let’s check the details'),
      h('p',{className:'lead'},draft.source==='example'?'Demo detections. Check names, dates, and what is really inside each container.':'AI detections need your review. Check names and dates; confirm the contents of reused or closed containers.')),
      draft.receipt&&h('p',{className:'notice'},`Receipt purchase date: ${draft.purchaseDate}. Unreadable purchase dates use today; review before saving.`),
      photoUrl&&h('div',null,h('div',{className:'scan-photo-review'},h('img',{src:photoUrl,alt:'Your scan for review'}),draft.rows.filter(i=>i.box).map((i,n)=>h('button',{type:'button',key:i.id,className:'scan-box',style:{left:i.box[0]/10+'%',top:i.box[1]/10+'%',width:(i.box[2]-i.box[0])/10+'%',height:(i.box[3]-i.box[1])/10+'%'},'aria-label':'Review '+i.name,onClick:()=>document.getElementById('review-'+i.id)?.scrollIntoView({behavior:'smooth',block:'center'})},h('span',null,n+1)))),draft.rows.some(i=>i.box)&&btn(refining?'Refining outlines…':'Refine item outlines',refine,{disabled:busy||refining}),refineError&&h('p',{role:'alert'},refineError)),
      h('div',{className:'review-list'},draft.rows.map(item=>h('article',{key:item.id,id:'review-'+item.id,className:'card review-food'},
        h('div',{className:'product-info'},h(Picture,{name:item.name,photoKey:item.photoKey}),h('div',null,h('h2',null,item.name),h(Status,{item}))),
        field('Food name',{value:item.name,onChange:e=>patch(item.id,{name:e.target.value}),required:true,maxLength:120}),
        h('div',{className:'add-grid'},field('Quantity',{value:item.qty||'',onChange:e=>patch(item.id,{qty:e.target.value})}),
          field('Expiry date',{type:'date',value:item.expires||'',onChange:e=>patch(item.id,{expires:e.target.value,dateSource:e.target.value?'manual':'unknown',dateText:''})})),
        item.container&&h('p',{className:'note'},'Container: '+item.container),
        item.note&&h('p',{className:'warn-note'},item.note),item.confidence==='low'&&h('span',{className:'pill unknown'},'Please confirm the contents'),
        btn('Exclude from scan',()=>setDraft(old=>({...old,rows:old.rows.filter(i=>i.id!==item.id)})),{className:'link',disabled:busy})))),
      draft.missing.length>0&&h('section',{className:'card'},h('h2',null,'Not seen in this scan'),h('p',{className:'note'},'Keep items that may be hidden. Uncheck only if you want to remove them.'),
        draft.missing.map(m=>h('label',{key:m.item.id,className:'check'},h('span',null,m.item.name),h('input',{type:'checkbox',checked:m.keep,onChange:e=>setDraft(old=>({...old,missing:old.missing.map(x=>x.item.id===m.item.id?{...x,keep:e.target.checked}:x)}))})))),
      h('div',{className:'save-bar'},h('div',{className:'btn-row'},btn(busy?'Saving…':'Confirm and save',onSave,{className:'btn primary',disabled:busy||refining||draft.rows.some(i=>!i.name.trim())}),btn('Cancel',onClose,{disabled:busy}))));
  }
  function Recipes({items,ingredient,onClear}) {
    const [quick,setQuick]=useState(false),[shop,setShop]=useState(false),[prefs,setPrefs]=useState([]),[wishes,setWishes]=useState('');
    const [generated,setGenerated]=useState(null),[working,setWorking]=useState(false),[error,setError]=useState('');
    useEffect(()=>{setGenerated(null);setError('');},[ingredient]);
    async function generate(){setWorking(true);setError('');try{
      const usable=items.filter(i=>Food.status(i)!=='expired');
      const result=await ChillAI.json(`Suggest 3 recipes. Return JSON {"recipes":[{"name":"","minutes":10,"servings":2,"kcal":400,"why":"","uses":["exact fridge item name"],"extra":["pantry item"],"buy":[],"steps":["step with amounts"]}]}. Prioritize expiring ingredients. Never use expired foods. ${shop?'Shopping is allowed; list missing items in buy.':'Use only available fridge foods and pantry staples; buy must be empty.'} ${ingredient?'Every recipe must include '+ingredient+'.':''} Preferences: ${prefs.join(', ')}. Request: ${wishes.slice(0,300)}. Available: ${JSON.stringify(usable.map(i=>({name:i.name,quantity:i.qty,days:i.expires?Dates.daysUntil(i.expires):null})))}. Expired, exclude: ${items.filter(i=>Food.status(i)==='expired').map(i=>i.name).join(', ')}. Pantry: oil,salt,pepper,garlic,onion,rice,pasta,oats,flour,spices.`);
      if(!Array.isArray(result?.recipes)||!result.recipes.length)throw Error('No recipes returned. Try a different request.');
      const strings=value=>Array.isArray(value)?value.filter(v=>typeof v==='string').slice(0,20):[];
      const recipes=result.recipes.slice(0,6).map(r=>({name:String(r.name||'Recipe'),minutes:Number(r.minutes)||0,servings:Number(r.servings)||1,kcal:Number(r.kcal)||0,why:String(r.why||''),uses:strings(r.uses),pantry:strings(r.extra),buy:strings(r.buy),steps:strings(r.steps),photo:ChillData.photo(r.uses?.[0]||'').key}));
      if(recipes.some(r=>r.uses.some(name=>items.some(i=>sameFood(i.name,name)&&Food.status(i)==='expired'))))throw Error('A suggestion included expired food and was rejected. Please try again.');
      setGenerated(recipes);
    }catch(e){setError(e.message);}finally{setWorking(false);}}
    const recipes=(generated||ChillData.recipes).filter(r=>(!quick||r.minutes<15)&&(!ingredient||r.uses.some(name=>sameFood(name,ingredient))));
    return h('section',{className:'screen'},h('span',{className:'eyebrow'},'Something lovely from what’s left'),h('h1',null,ingredient?`Cook with ${ingredient}`:'Recipes'),
      ingredient&&btn('Show all ingredients',onClear,{className:'btn small'}),
      h('section',{className:'card recipe-controls'},h('h2',null,'What are you craving?'),
        h('div',{className:'btn-row'},['Vegetarian','High protein','No oven','Sweet','Salty','Under 15 min'].map(p=>btn(p,()=>setPrefs(old=>old.includes(p)?old.filter(v=>v!==p):[...old,p]),{key:p,className:'chip','aria-pressed':prefs.includes(p)}))),
        field('Preferences or dish idea',{value:wishes,onChange:e=>setWishes(e.target.value),maxLength:300,placeholder:'No dairy, cooking for two…'}),
        h('label',{className:'row'},h('input',{type:'checkbox',checked:shop,onChange:e=>setShop(e.target.checked)}),'Happy to shop for extra ingredients'),
        btn(working?'Cooking up ideas…':'Generate AI recipes',generate,{className:'btn primary',disabled:working}),error&&h('p',{role:'alert'},error)),
      h('div',{className:'row'},btn('Under 15 minutes',()=>setQuick(!quick),{className:'chip','aria-pressed':quick})),
      h('p',{className:'note'},generated?'AI suggestions. Check ingredients, quantities and cooking instructions. Photos are ingredient illustrations.':'Starter recipe ideas. Generate tailored recipes when the AI backend is configured.'),
      !recipes.length&&h('p',{className:'empty'},'No matching starter recipe. Generate a recipe for this ingredient or clear the filters.'),
      h('div',{className:'recipes'},recipes.map(r=>h('article',{key:r.name,className:'recipe'},
        h('figure',{className:'recipe-photo'},h('img',{src:ChillData.asset(r.photo),onError:e=>ChillData.fallbackImage(e,r.photo),alt:r.name,width:640,height:640,loading:'lazy'}),h('figcaption',null,generated?'Ingredient illustration':'Serving suggestion')),
        h('div',{className:'rbody'},h('h2',null,r.name),h('p',{className:'note'},`${r.minutes} min · ${r.servings} servings · about ${r.kcal} kcal`),r.why&&h('p',null,r.why),
          h('div',{className:'uses'},r.uses.map(name=>{const item=items.find(i=>sameFood(i.name,name));const expired=item&&Food.status(item)==='expired';return h('span',{key:name,className:'ing'+(expired?' expired':item?'':' buy')},expired?`Replace expired: ${name}`:item?name:`Get: ${name}`);})),
          h('p',{className:'note'},'Pantry: '+r.pantry.join(', ')),r.buy?.length>0&&h('p',null,'Shopping list: '+r.buy.join(', ')),
          h('details',null,h('summary',null,'How to make it'),h('ol',null,r.steps.map((step,i)=>h('li',{key:i},step)))))))));
  }
  function Nutrition({items,events}) {
    const [advice,setAdvice]=useState(null),[working,setWorking]=useState(false),[error,setError]=useState('');
    async function ask(){setWorking(true);setError('');try{
      const result=await ChillAI.json(`Give general nutrition information for up to six of these foods: ${items.map(i=>i.name).join(', ')}. Return JSON {"summary":"","foods":[{"name":"","helps":"","nutrients":[""],"howOften":"","tooMuch":""}]}. Keep guidance general and brief; no diagnoses, health judgments or personalized intake recommendations. Door activity and logged eating counts do not establish serving size or a complete diet.`);
      if(!Array.isArray(result?.foods))throw Error('No food information returned.');
      setAdvice({summary:String(result.summary||''),foods:result.foods.slice(0,6).map(f=>({name:String(f.name||'Food'),helps:String(f.helps||''),nutrients:Array.isArray(f.nutrients)?f.nutrients.filter(n=>typeof n==='string').slice(0,5):[],howOften:String(f.howOften||''),tooMuch:String(f.tooMuch||'')}))});
    }catch(e){setError(e.message);}finally{setWorking(false);}}

    const recent=events.filter(e=>e.action==='eaten'&&new Date(e.occurred_at)>=new Date(Date.now()-30*86400000));
    const counts=new Map();
    recent.forEach(e=>counts.set(e.item_name,(counts.get(e.item_name)||0)+1));
    return h('section',{className:'screen'},h('h1',null,'Food & your body'),
      h('p',{className:'lead'},'A little more context for the foods in your fridge.'),
      h('section',{className:'card'},h('h2',null,'Your last 30 days'),
        counts.size?h('div',{className:'uses'},[...counts].sort((a,b)=>b[1]-a[1]).map(([name,n])=>h('span',{key:name,className:'ing'},`${name} · ${n} times`))):
        h('p',{className:'note'},'Mark food as eaten to see your recent history here.')),
      btn(working?'Thinking…':'Ask about my foods',ask,{disabled:working}),error&&h('p',{role:'alert'},error),advice&&h('p',null,advice.summary),h('p',{className:'note'},advice?'AI-generated general information; not personalized medical advice.':'Example food information. General information, not personalized medical advice.'),
      h('div',{className:'food-cards'},(advice?.foods||ChillNutrition.foods).map(f=>h('article',{key:f.name,className:'food-card'},
        h(Picture,{name:f.name,large:true}),h('h2',null,f.name),h('p',null,f.helps),
        h('div',{className:'uses'},f.nutrients.map(n=>h('span',{key:n,className:'ing'},n))),
        h('dl',{className:'facts'},h('dt',null,'How often'),h('dd',null,f.howOften),h('dt',null,'When it may be too much'),h('dd',null,f.tooMuch))))));
  }
  function History({events,fridgeId,demo,shopping}) {
    const [receipts,setReceipts]=useState([]),[error,setError]=useState('');
    const since=Dates.addDays(Dates.today(),-6);
    useEffect(()=>{let live=true;setReceipts([]);setError('');if(demo)return;
      api.purchases(fridgeId,since+'T00:00:00').then(rows=>{if(live)setReceipts(rows);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};
    },[fridgeId,demo,since]);
    const recent=events.filter(e=>(!demo||e.demo)&&e.occurred_at.slice(0,10)>=since).sort((a,b)=>b.occurred_at.localeCompare(a.occurred_at));
    const eaten=recent.filter(e=>e.action==='eaten');
    const consumed=shopping.logs.filter(l=>l.consumed_on>=since).sort((a,b)=>b.consumed_on.localeCompare(a.consumed_on));
    const bought=receipts.flatMap(r=>(r.scan_items||[]).filter(i=>i.review_status==='accepted').map(i=>({name:i.proposed_name,qty:i.proposed_data.quantity,date:r.taken_at})));
    const groups=[{title:'Recently eaten',count:eaten.length,unit:'logged uses',rows:eaten.slice(0,4).map(e=>({name:e.item_name,detail:new Date(e.occurred_at).toLocaleString()})),empty:'Mark an item eaten to start your food story.'},
      {title:'Recently consumed',count:consumed.length,unit:'quantity logs',rows:consumed.slice(0,4).map(l=>({name:l.item_name,detail:l.amount+' '+l.unit+' · '+l.consumed_on})),empty:'Log an amount from your shopping list.'},
      {title:'Recently bought',count:bought.length,unit:'receipt items',rows:bought.slice(0,4).map(i=>({name:i.name,detail:(i.qty||'')+' · logged '+new Date(i.date).toLocaleDateString()})),empty:'Confirm a receipt scan to record your purchases.'}];
    const totals=new Map();consumed.forEach(l=>{const key=l.item_name+'|'+l.unit;const row=totals.get(key)||{name:l.item_name,unit:l.unit,total:0,logs:0};row.total+=Number(l.amount);row.logs++;totals.set(key,row);});
    const favourite=[...totals.values()].sort((a,b)=>b.logs-a.logs)[0];
    return h('section',{className:'screen history-screen'},h('h1',null,'Your food story'),h('p',{className:'lead'},'The last 7 days, one bite at a time.'),
      demo&&h('p',{className:'note'},'Demo fridge: sample yogurt consumption and this session’s actions. Choose your saved fridge for your own history.'),
      h('div',{className:'history-stats'},groups.map(g=>h('section',{className:'card',key:g.title},h('h2',null,g.title),h('p',{className:'history-total'},g.count,h('small',null,' '+g.unit)),g.rows.length?h('ul',null,g.rows.map((r,i)=>h('li',{key:i},h('strong',null,r.name),h('span',null,r.detail)))):h('p',{className:'note'},g.empty)))),
      h('p',{className:'note'},'Eaten entries and quantity logs can describe the same meal. Showing up to 100 saved activity events and receipt scans. Receipt dates show when the scan was saved, not necessarily when you shopped.'),
      (error||shopping.error)&&h('p',{role:'alert'},error||shopping.error),
      h('div',{className:'card history-byte'},h(ChillWidgets.Robot,{mini:true}),h('div',null,h('h2',null,favourite?'Your repeat favourite: '+favourite.name:'Chef Byte’s kitchen diary'),h('p',null,favourite?favourite.total+' '+favourite.unit+' logged across '+favourite.logs+' uses. Your fridge has a main character.':'No judgement. I also need a snack before deciding on a snack.'))),
      h('h2',null,'Recent activity'),!recent.length?h('p',{className:'empty'},'No activity logged in this period yet.'):
      h('div',{className:'list'},recent.map(event=>h('article',{className:'card history-row',key:event.id},h(Picture,{name:event.item_name,photoKey:event.photo_key}),
        h('div',null,h('h2',null,event.item_name),h('p',{className:'note'},new Date(event.occurred_at).toLocaleString())),h('span',{className:'pill '+(event.action==='eaten'?'safe':'expired')},event.action==='eaten'?'Enjoyed':'Discarded')))));
  }
  function App() {
    const [session,setSession]=useState(null),[authLoading,setAuthLoading]=useState(true);
    const [profile,setProfile]=useState(null),[fridges,setFridges]=useState([]),[fridgeId,setFridgeId]=useState('');
    const [demo,setDemo]=useState(true),[ingredient,setIngredient]=useState(''),[inventoryFilter,setInventoryFilter]=useState('');
    const demos=useRef({}),demoRef=useRef(true);demoRef.current=demo;
    const phone=new URLSearchParams(location.search).get('phone')==='1';
    const [items,setItems]=useState([]),[events,setEvents]=useState([]),[screen,setScreen]=useState('home');
    const shopping=ChillShopping.usePlan(items,fridgeId,demo,session?.user.id);
    const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
    const [editor,setEditor]=useState(undefined),[draft,setDraft]=useState(null),[retry,setRetry]=useState(0);
    const sessionRef=useRef(null),fridgeRef=useRef(''),generation=useRef(0),scanCount=useRef(0);
    sessionRef.current=session;fridgeRef.current=fridgeId;
    useEffect(()=>{
      const client=window.ChillCheckBackend;
      if(!client){setAuthLoading(false);return;}
      let alive=true,authChanged=false;
      const {data:{subscription}}=client.auth.onAuthStateChange((_event,next)=>{authChanged=true;if(alive){setSession(next);setAuthLoading(false);}});
      client.auth.getSession().then(({data,error})=>{if(!alive)return;if(error)setError(error.message);if(!authChanged)setSession(data.session);setAuthLoading(false);});
      return ()=>{alive=false;subscription.unsubscribe();};
    },[]);
    useEffect(()=>{
      let alive=true;generation.current++;setItems([]);setEvents([]);setFridges([]);setFridgeId('');setProfile(null);setDraft(null);setEditor(undefined);setScreen('home');setNotice('');
      demos.current={};setDemo(true);
      if(!session){setLoading(false);return;}
      setLoading(true);setError('');
      api.bootstrap(session.user).then(data=>{if(alive){setProfile(data.profile);setFridges(data.fridges);setFridgeId(data.fridges.find(f=>f.id===new URLSearchParams(location.search).get('fridge'))?.id||data.fridges[0]?.id||'');}})
        .catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});
      return ()=>{alive=false;};
    },[session?.user.id,retry]);
    async function refresh(id=fridgeId) {
      const token=++generation.current;
      const data=await api.inventory(id);
      if(token===generation.current&&fridgeRef.current===id){if(demoRef.current){demos.current[id] ||= ChillData.demoItems();setItems(demos.current[id]);}else setItems(data.items);setEvents(data.events);}
    }
    useEffect(()=>{
      setDraft(null);setEditor(undefined);setItems([]);setEvents([]);
      if(!fridgeId)return;
      let alive=true;setLoading(true);
      refresh(fridgeId).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});
      return ()=>{alive=false;generation.current++;};
    },[fridgeId,demo]);
    async function action(fn,message) {
      if(busy)return false;
      const userId=sessionRef.current?.user.id;const selected=fridgeRef.current;
      setBusy(true);setError('');setNotice('');
      try {
        await fn();
        if(userId!==sessionRef.current?.user.id)return false;
        if(selected&&selected===fridgeRef.current) {
          try { await refresh(selected); }
          catch(e) { setError('Your change was saved, but the list could not refresh. Reload the page. '+e.message); }
        }
        setNotice(message);return true;
      }catch(e){if(userId===sessionRef.current?.user.id)setError(e.message);return false;}
      finally{setBusy(false);}
    }
    function scanned(result) {
      const next=Food.merge(items,result.items,{trackMissing:result.type==='fridge'});
      setDraft({...next,source:result.source||'example',transferId:result.transferId,receipt:result.type==='bill',purchaseDate:result.purchaseDate,photo:result.photo});setNotice('');
    }
    async function saveReview() {
      const current=draft;
      const ok=await action(async()=>{
        // Demo UUIDs are not database rows. Resolve real matches before saving to avoid duplicates.
        const saved=await api.inventory(fridgeId);
        const rows=current.rows.map(i=>{const match=saved.items.find(e=>sameFood(e.name,i.name));return {...i,id:match?.id||i.id,isNew:!match};});
        const missing=current.missing.filter(m=>!m.keep).map(m=>({keep:false,item:saved.items.find(e=>e.id===m.item.id||sameFood(e.name,m.item.name))})).filter(m=>m.item);
        await api.review(fridgeId,rows,missing,current.source);
        if(demoRef.current)demos.current[fridgeId]=[...current.rows.map(i=>({...i,demo:true})),...current.missing.filter(m=>m.keep).map(m=>m.item),...(current.untouched||[])];
      },'Scan saved to Supabase. The demo view resets on refresh.');
      if(ok){setDraft(null);setScreen('eat');if(current.transferId){try{await api.completePhone(current.transferId);}catch{setError('Scan saved. The phone inbox could not be marked reviewed.');}}}
    }
    async function saveItem(item) {
      if(demoRef.current&&item.demo){demos.current[fridgeId]=items.map(i=>i.id===item.id?item:i);setItems(demos.current[fridgeId]);setNotice('Demo item updated for this session.');return true;}
      return action(async()=>{const row=await(item.id?api.update(fridgeId,item):api.add(fridgeId,item));if(demoRef.current)demos.current[fridgeId]=[...items,api.fromRow(row)];},'Food saved.');
    }
    async function finishItem(item,kind) {
      if(demoRef.current){demos.current[fridgeId]=items.filter(i=>i.id!==item.id);setItems(demos.current[fridgeId]);setEvents(old=>[{id:Food.newId(),item_name:item.name,photo_key:item.photoKey,action:kind,occurred_at:new Date().toISOString(),demo:true},...old]);setNotice('Demo action recorded for this session.');return;}
      await action(()=>api.finish(item.id,kind),kind==='eaten'?'Marked as eaten.':'Marked as discarded.');shopping.reload();
    }
    function navigate(next){setInventoryFilter('');setScreen(next);setDraft(null);setNotice('');window.scrollTo(0,0);}
    async function create(name){
      await action(async()=>{const fridge=await api.createFridge(name);setFridges(old=>[...old,fridge]);setFridgeId(fridge.id);},'Fridge created.');
    }
    async function consume(item,amount,q){
      if(demoRef.current){
        const remaining=q.amount-amount;
        demos.current[fridgeId]=items.flatMap(i=>i.id===item.id?(remaining>0?[{...i,qty:remaining+' '+q.unit}]:[]):[i]);
        setItems(demos.current[fridgeId]);shopping.addDemoLog({item_name:item.name,amount,unit:q.unit,consumed_on:Dates.today()});return;
      }
      const ok=await action(()=>api.consume(item,amount),'Consumption logged.');if(!ok)throw Error('Could not log consumption. Check the error above.');shopping.reload();
    }
    useEffect(()=>{
      const open=()=>{setScreen('shopping');setDraft(null);};
      const message=e=>{if(e.data?.type==='chill-open-shopping')open();};
      window.addEventListener('chill-open-shopping',open);navigator.serviceWorker?.addEventListener('message',message);
      return()=>{window.removeEventListener('chill-open-shopping',open);navigator.serviceWorker?.removeEventListener('message',message);};
    },[]);
    useEffect(()=>{if(profile&&new URLSearchParams(location.search).get('shopping')==='1')setScreen('shopping');},[profile]);
    async function signOut(){
      await action(async()=>{const {error}=await api.client().auth.signOut();if(error)throw error;},'');
    }
    const addFood=()=>setEditor(null);
    const fridgePicker=h('select',{className:'field fridge-picker','aria-label':'Your fridge',value:demo?'demo':fridgeId,disabled:busy||loading||!!draft,onChange:e=>{const value=e.target.value;setDemo(value==='demo');if(value!=='demo')setFridgeId(value);navigate('home');}},
      h('option',{value:'demo'},'Demo fridge'),fridges.map(f=>h('option',{key:f.id,value:f.id},f.name)));

    const top=h('header',{className:'app-header'},h('div',{className:'header-shell'},
      btn(h('img',{src:window.CHILLCHECK_LOGO||'assets/brand/chillcheck-header.png',alt:'ChillCheck',className:'brand-logo'}),()=>navigate('home'),{className:'brand','aria-label':'ChillCheck home',disabled:busy||!!draft}),
      fridges.length>0&&h('div',{className:'workspace-toolbar'},
        h('nav',{'aria-label':'Main navigation'},[['eat','My fridge'],['recipes','Recipes'],['nutrition','Food & you'],['history','History'],['shopping','Shopping list']].map(([value,label])=>btn(label,()=>navigate(value),{key:value,className:'chip','aria-current':screen===value?'page':undefined,disabled:busy||!!draft})))),
      session&&h('div',{className:'header-actions'},h('span',{className:'account-name'},profile?.display_name||'My account'),btn('Sign out',signOut,{className:'btn small',disabled:busy}))));
    return h(React.Fragment,null,top,h('main',{className:'app'},
      error&&h('div',{className:'alert-item',role:'alert'},h('span',null,error),btn('Dismiss',()=>setError(''),{className:'btn small'})),
      notice&&h('p',{className:'notice',role:'status'},notice),
      authLoading?h('p',{role:'status'},'Checking your session…'):!session?h(Auth,{onError:setError}):
      h(React.Fragment,null,
        loading?h('p',{role:'status'},'Loading your fridge…'):!profile?
          h('div',{className:'empty'},h('p',null,'Could not load your account.'),btn('Retry',()=>setRetry(n=>n+1))):
        !fridges.length?h(CreateFridge,{onCreate:create,busy}):
        h(React.Fragment,null,
          (screen!=='home'||draft)&&h('div',{className:'page-tools'},btn('+ Add food',addFood,{className:'btn primary',disabled:busy||!!draft}),fridgePicker),
          draft?h(Review,{draft,setDraft,busy,onClose:()=>setDraft(null),onSave:saveReview}):
          screen==='home'?h(ChillWidgets.Dashboard,{fridgePicker,onAdd:addFood,shopping,name:profile.display_name,items,onNavigate:navigate,busy,fridgeId,phone,demo,onFilter:value=>{navigate('eat');setInventoryFilter(value);},onIngredient:name=>{setIngredient(name);navigate('recipes');},onResult:scanned,onScan:()=>scanned({items:ChillData.example(scanCount.current++),type:'fridge',source:'example'})}):
          screen==='eat'?h(Inventory,{items,busy,fridgeId,onResult:scanned,onExample:()=>scanned({items:ChillData.example(scanCount.current++),type:'fridge',source:'example'}),initialFilter:inventoryFilter,onEdit:setEditor,onFinish:finishItem}):
          screen==='shopping'?h(ChillShopping.Panel,{key:fridgeId+demo,model:shopping,items,demo,onConsume:consume,busy}):screen==='recipes'?h(Recipes,{items,ingredient,onClear:()=>setIngredient('')}):screen==='nutrition'?h(Nutrition,{items,events}):h(History,{events,fridgeId,demo,shopping}),
          editor!==undefined&&h(FoodForm,{key:editor?.id||'new',item:editor,onClose:()=>setEditor(undefined),busy,error,onSave:saveItem}))),
      session&&fridges.length>0&&editor===undefined&&!draft&&h(ChillWidgets.Mascot,{screen}),
      h('footer',{className:'app-footer'},'Made for the food you almost forgot.')));
  }
  class ErrorBoundary extends React.Component {
    constructor(props){super(props);this.state={failed:false};}
    static getDerivedStateFromError(){return {failed:true};}
    render(){return this.state.failed?h('main',{className:'app'},h('h1',null,'Something went wrong'),h('p',null,'Your saved data is still in Supabase. Reload the page to try again.'),btn('Reload',()=>location.reload())):this.props.children;}
  }
  ReactDOM.createRoot(document.getElementById('root')).render(h(ErrorBoundary,null,h(App)));
})();
