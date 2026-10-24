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
      h('img',{src:photo.src,alt:photo.placeholder?'Closed food container':`Illustrative photo of ${name}`,loading:'lazy',width:480,height:480}),
      h('figcaption',null,photo.placeholder?'Photo unavailable':'Serving illustration'));
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
        field('Container',{value:form.container||'',onChange:e=>change('container',e.target.value),placeholder:'e.g. reused ice cream tub'}),
        field('Notes',{value:form.note||'',onChange:e=>change('note',e.target.value)}),
        h('div',{className:'btn-row'},h('button',{className:'btn primary',disabled:busy||!form.name.trim()},busy?'Saving…':'Save food'),btn('Cancel',onClose,{disabled:busy}))));
  }
  function Inventory({items,onEdit,onFinish,busy}) {
    const [filter,setFilter]=useState(''),[shelf,setShelf]=useState('');
    const shown=Food.byUrgency(items.filter(i=>(!filter||Food.categoryOf(i)===filter)&&(!shelf||i.shelf===shelf)));
    return h('section',null,h('div',{className:'section-heading'},h('div',null,h('h1',null,'Eat Me First'),h('p',{className:'lead'},'A little attention goes a long way.'))),
      h('div',{className:'eat-layout'},
        h('aside',{className:'fridge-panel'},
          h('div',{className:'type-filters'},CATEGORIES.map(c=>{
            const n=items.filter(i=>Food.categoryOf(i)===c.id).length;
            return h('button',{key:c.id,id:'type-'+c.id,type:'button',className:'type-btn'+(!n?' empty':''),'aria-pressed':filter===c.id,onClick:()=>{setFilter(filter===c.id?'':c.id);setShelf('');}},
              h('span',{className:'type-icon'},c.icon,h('span',{className:'type-n'},n)),h('span',{className:'type-label'},c.label));
          })),
          h('div',{className:'fridge-map card'},h('h2',null,'Where is it?'),SHELVES.map(s=>{
            const list=items.filter(i=>i.shelf===s),count=Food.counts(list),tone=count.expired?'expired':count.soon?'soon':count.unknown?'unknown':'safe';
            return h('button',{key:s,type:'button',className:'zone '+tone,'aria-pressed':shelf===s,onClick:()=>{setShelf(shelf===s?'':s);setFilter('');}},
              h('span',{className:'zone-name'},s),h('span',{className:'zone-count'},plural(list.length,'item')));
          }))),
        h('div',{className:'eat-list'},(filter||shelf)&&btn('Clear filter',()=>{setFilter('');setShelf('');},{className:'link'}),
          !shown.length&&h('div',{className:'empty'},items.length?'Nothing in this category yet.':'Your fridge is ready for its first ingredients.'),
          STATUS_ORDER.map(status=>{
            const group=shown.filter(i=>Food.status(i)===status);if(!group.length)return null;
            return h('section',{key:status,className:'group '+status},h('h2',{className:'group-head'},h('span',{className:'dot'}),STATUS[status].label,h('span',{className:'n'},group.length)),
              group.map(item=>h('article',{key:item.id,className:'erow '+status},h('span',{className:'bar'}),
                h('div',{className:'product-info'},h(Picture,{name:item.name,photoKey:item.photoKey}),h('div',{className:'product-copy'},
                  h('h3',{className:'name'},item.name),h('p',{className:'meta'},[item.qty,item.shelf].filter(Boolean).join(' · ')),
                  item.container&&h('p',{className:'meta'},item.container),h('p',{className:'source'},Food.sourceText(item)),item.note&&h('p',{className:'warn-note'},item.note))),
                h('div',{className:'right'},h(Status,{item}),h('div',{className:'actions'},btn('Edit',()=>onEdit(item),{className:'btn small',disabled:busy}),
                  btn(status==='expired'?'Discard':'Eaten',()=>onFinish(item,status==='expired'?'discarded':'eaten'),{className:'btn small',disabled:busy}))))));
          }))));
  }
  function Review({draft,setDraft,onSave,onClose,busy}) {
    function patch(id,values){setDraft(old=>({...old,rows:old.rows.map(i=>i.id===id?{...i,...values}:i)}));}
    return h('section',{className:'screen'},h('div',null,h('span',{className:'eyebrow'},'Example scan · review before saving'),h('h1',null,'Let’s check the details'),
      h('p',{className:'lead'},'These are demo detections, not a live camera scan. Check names, dates, and what is really inside each container.')),
      h('div',{className:'review-list'},draft.rows.map(item=>h('article',{key:item.id,className:'card review-food'},
        h('div',{className:'product-info'},h(Picture,{name:item.name,photoKey:item.photoKey}),h('div',null,h('h2',null,item.name),h(Status,{item}))),
        field('Food name',{value:item.name,onChange:e=>patch(item.id,{name:e.target.value}),required:true,maxLength:120}),
        h('div',{className:'add-grid'},field('Quantity',{value:item.qty||'',onChange:e=>patch(item.id,{qty:e.target.value})}),
          field('Expiry date',{type:'date',value:item.expires||'',onChange:e=>patch(item.id,{expires:e.target.value,dateSource:e.target.value?'manual':'unknown',dateText:''})})),
        item.container&&h('p',{className:'note'},'Container: '+item.container),
        item.note&&h('p',{className:'warn-note'},item.note),item.confidence==='low'&&h('span',{className:'pill unknown'},'Please confirm the contents'),
        btn('Exclude from scan',()=>setDraft(old=>({...old,rows:old.rows.filter(i=>i.id!==item.id)})),{className:'link',disabled:busy})))),
      draft.missing.length>0&&h('section',{className:'card'},h('h2',null,'Not seen in this scan'),h('p',{className:'note'},'Keep items that may be hidden. Uncheck only if you want to remove them.'),
        draft.missing.map(m=>h('label',{key:m.item.id,className:'check'},h('span',null,m.item.name),h('input',{type:'checkbox',checked:m.keep,onChange:e=>setDraft(old=>({...old,missing:old.missing.map(x=>x.item.id===m.item.id?{...x,keep:e.target.checked}:x)}))})))),
      h('div',{className:'save-bar'},h('div',{className:'btn-row'},btn(busy?'Saving…':'Confirm and save',onSave,{className:'btn primary',disabled:busy||draft.rows.some(i=>!i.name.trim())}),btn('Cancel',onClose,{disabled:busy}))));
  }
  function Recipes({items}) {
    const [quick,setQuick]=useState(false);
    return h('section',{className:'screen'},h('div',null,h('span',{className:'eyebrow'},'Something lovely from what’s left'),h('h1',null,'Recipes'),h('p',{className:'lead'},'A small collection of ideas. Check the ingredients against your fridge.')),
      h('div',{className:'row'},btn('Under 15 minutes',()=>setQuick(!quick),{className:'chip','aria-pressed':quick})),
      h('p',{className:'note'},'Example recipes. Live AI suggestions will be added through a server-side function.'),
      h('div',{className:'recipes'},ChillData.recipes.filter(r=>!quick||r.minutes<15).map(r=>h('article',{key:r.name,className:'recipe'},
        h('figure',{className:'recipe-photo'},h('img',{src:ChillData.asset(r.photo),alt:r.name,width:640,height:640,loading:'lazy'}),h('figcaption',null,'Serving suggestion')),
        h('div',{className:'rbody'},h('h2',null,r.name),h('p',{className:'note'},`${r.minutes} min · ${r.servings} serving${r.servings===1?'':'s'} · about ${r.kcal} kcal`),
          h('div',{className:'uses'},r.uses.map(name=>{
            const item=items.find(i=>sameFood(i.name,name));const expired=item&&Food.status(item)==='expired';
            return h('span',{key:name,className:'ing'+(expired?' expired':item?'':' buy')},expired?`Replace expired: ${name}`:item?name:`Get: ${name}`);
          })),h('p',{className:'note'},'Also: '+r.pantry.join(', ')),
          h('details',null,h('summary',null,'How to make it'),h('ol',null,r.steps.map((step,i)=>h('li',{key:i},step)))))))));
  }
  function Nutrition({items,events}) {
    const recent=events.filter(e=>e.action==='eaten'&&new Date(e.occurred_at)>=new Date(Date.now()-30*86400000));
    const counts=new Map();
    recent.forEach(e=>counts.set(e.item_name,(counts.get(e.item_name)||0)+1));
    return h('section',{className:'screen'},h('h1',null,'Food & your body'),
      h('p',{className:'lead'},'A little more context for the foods in your fridge.'),
      h('section',{className:'card'},h('h2',null,'Your last 30 days'),
        counts.size?h('div',{className:'uses'},[...counts].sort((a,b)=>b[1]-a[1]).map(([name,n])=>h('span',{key:name,className:'ing'},`${name} · ${n} times`))):
        h('p',{className:'note'},'Mark food as eaten to see your recent history here.')),
      h('p',{className:'note'},'Example food information from the prototype. General information, not personalized medical advice.'),
      h('div',{className:'food-cards'},ChillNutrition.foods.map(f=>h('article',{key:f.name,className:'food-card'},
        h(Picture,{name:f.name,large:true}),h('h2',null,f.name),h('p',null,f.helps),
        h('div',{className:'uses'},f.nutrients.map(n=>h('span',{key:n,className:'ing'},n))),
        h('dl',{className:'facts'},h('dt',null,'How often'),h('dd',null,f.howOften),h('dt',null,'When it may be too much'),h('dd',null,f.tooMuch))))));
  }
  function History({events}) {
    return h('section',{className:'screen'},h('h1',null,'Your food story'),h('p',{className:'lead'},'A little record of what you used and what you let go.'),
      !events.length?h('div',{className:'empty'},'Mark food as eaten or discarded to start your history.'):
      h('div',{className:'list'},events.map(event=>h('article',{className:'card history-row',key:event.id},h(Picture,{name:event.item_name,photoKey:event.photo_key}),
        h('div',null,h('h2',null,event.item_name),h('p',{className:'note'},new Date(event.occurred_at).toLocaleString())),
        h('span',{className:'pill '+(event.action==='eaten'?'safe':'expired')},event.action==='eaten'?'Enjoyed':'Discarded')))));
  }
  function Dashboard({name,items,onNavigate,onScan,busy}) {
    const counts=Food.counts(items);
    return h('section',{className:'screen'},h('div',null,h('span',{className:'eyebrow'},'Your kitchen, a little more in sync'),h('h1',null,`Hi ${name.split(' ')[0]}`)),
      h('div',{className:'home-grid'},h('div',{className:'col'},
        h('button',{type:'button',className:'eat-btn',onClick:()=>onNavigate('eat')},h('span',{className:'eat-title'},'Eat Me First'),
          h('span',{className:'eat-sub'},counts.expired?`${plural(counts.expired,'item')} expired. Check the list.`:counts.soon?`${plural(counts.soon,'item')} could use a little attention.`:'Let’s make the most of your fridge.'),
          h('span',{className:'counts'},STATUS_ORDER.map(status=>h('span',{key:status,className:'count '+status},h('span',{className:'dot'}),STATUS[status].label,h('span',{className:'n'},counts[status]))))),
        h('section',{className:'card'},h('h2',null,'In your fridge'),!items.length?h('p',{className:'note'},'Add your first item or try an example scan.'):
          h('div',{className:'fridge-preview'},Food.byUrgency(items).map(item=>h('div',{key:item.id,className:'fridge-preview-item'},h(Picture,{name:item.name,photoKey:item.photoKey}),h('span',null,item.name)))))),
        h('div',{className:'col'},h('section',{className:'card'},h('span',{className:'eyebrow'},'A familiar little surprise'),h('h2',null,'Ice cream tub. Stuffed peppers.'),
          h(Picture,{name:'Rice-stuffed peppers',large:true}),h('p',null,'Good leftovers deserve a second look. Review what’s inside, not just what the package says.'),
          btn('Try example scan',onScan,{className:'btn primary',disabled:busy})),
          h('section',{className:'card'},h('h2',null,'Fridge sensors'),h('p',{className:'note'},'Hardware is not connected. Temperature and door readings are not available.')))));
  }
  function App() {
    const [session,setSession]=useState(null),[authLoading,setAuthLoading]=useState(true);
    const [profile,setProfile]=useState(null),[fridges,setFridges]=useState([]),[fridgeId,setFridgeId]=useState('');
    const [items,setItems]=useState([]),[events,setEvents]=useState([]),[screen,setScreen]=useState('home');
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
      if(!session){setLoading(false);return;}
      setLoading(true);setError('');
      api.bootstrap(session.user).then(data=>{if(alive){setProfile(data.profile);setFridges(data.fridges);setFridgeId(data.fridges[0]?.id||'');}})
        .catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});
      return ()=>{alive=false;};
    },[session?.user.id,retry]);
    async function refresh(id=fridgeId) {
      const token=++generation.current;
      const data=await api.inventory(id);
      if(token===generation.current&&fridgeRef.current===id){setItems(data.items);setEvents(data.events);}
    }
    useEffect(()=>{
      setDraft(null);setEditor(undefined);setItems([]);setEvents([]);
      if(!fridgeId)return;
      let alive=true;setLoading(true);
      refresh(fridgeId).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});
      return ()=>{alive=false;generation.current++;};
    },[fridgeId]);
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
    function navigate(next){setScreen(next);setDraft(null);setNotice('');window.scrollTo(0,0);}
    async function create(name){
      await action(async()=>{const fridge=await api.createFridge(name);setFridges(old=>[...old,fridge]);setFridgeId(fridge.id);},'Fridge created.');
    }
    async function signOut(){
      await action(async()=>{const {error}=await api.client().auth.signOut();if(error)throw error;},'');
    }
    const top=h('header',{className:'app-header'},h('div',{className:'react-header'},
      btn('✳ ChillCheck',()=>navigate('home'),{className:'brand',disabled:busy||!!draft}),
      session&&h('div',{className:'header-actions'},h('span',{className:'account-name'},profile?.display_name||'My account'),btn('Sign out',signOut,{className:'btn small',disabled:busy}))));
    return h(React.Fragment,null,top,h('main',{className:'app'},
      error&&h('div',{className:'alert-item',role:'alert'},h('span',null,error),btn('Dismiss',()=>setError(''),{className:'btn small'})),
      notice&&h('p',{className:'notice',role:'status'},notice),
      authLoading?h('p',{role:'status'},'Checking your session…'):!session?h(Auth,{onError:setError}):
      h(React.Fragment,null,
        fridges.length>0&&h('div',{className:'workspace-toolbar'},select('Your fridge',fridgeId,v=>{if(!busy){setFridgeId(v);navigate('home');}},fridges.map(f=>[f.id,f.name])),
          h('nav',{'aria-label':'Main navigation'},[['home','Home'],['eat','My fridge'],['recipes','Recipes'],['nutrition','Food & you'],['history','History']].map(([value,label])=>btn(label,()=>navigate(value),{key:value,className:'chip','aria-current':screen===value?'page':undefined,disabled:busy||!!draft}))),
          btn('+ Add food',()=>setEditor(null),{className:'btn primary',disabled:busy||loading||!!draft})),
        loading?h('p',{role:'status'},'Loading your fridge…'):!profile?
          h('div',{className:'empty'},h('p',null,'Could not load your account.'),btn('Retry',()=>setRetry(n=>n+1))):
        !fridges.length?h(CreateFridge,{onCreate:create,busy}):
        h(React.Fragment,null,
          draft?h(Review,{draft,setDraft,busy,onClose:()=>setDraft(null),onSave:async()=>{if(await action(()=>api.review(fridgeId,draft.rows,draft.missing),'Scan saved.')){setDraft(null);setScreen('eat');}}}):
          screen==='home'?h(Dashboard,{name:profile.display_name,items,onNavigate:navigate,busy,onScan:()=>{if(!ChillData.scans.length){setError('The database has no example scans. Run migration 003.');return;}setDraft(Food.merge(items,ChillData.scans[scanCount.current++%ChillData.scans.length]));setNotice('');}}):
          screen==='eat'?h(Inventory,{items,busy,onEdit:setEditor,onFinish:(item,kind)=>action(()=>api.finish(item.id,kind),kind==='eaten'?'Marked as eaten.':'Marked as discarded.')}):
          screen==='recipes'?h(Recipes,{items}):screen==='nutrition'?h(Nutrition,{items,events}):h(History,{events}),
          editor!==undefined&&h(FoodForm,{key:editor?.id||'new',item:editor,onClose:()=>setEditor(undefined),busy,error,onSave:item=>action(()=>item.id?api.update(fridgeId,item):api.add(fridgeId,item),'Food saved.')}))),
      h('footer',{className:'app-footer'},'Made for the food you almost forgot.')));
  }
  class ErrorBoundary extends React.Component {
    constructor(props){super(props);this.state={failed:false};}
    static getDerivedStateFromError(){return {failed:true};}
    render(){return this.state.failed?h('main',{className:'app'},h('h1',null,'Something went wrong'),h('p',null,'Your saved data is still in Supabase. Reload the page to try again.'),btn('Reload',()=>location.reload())):this.props.children;}
  }
  ReactDOM.createRoot(document.getElementById('root')).render(h(ErrorBoundary,null,h(App)));
})();
