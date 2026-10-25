// Browser-only test double. Never loaded by the application.
(() => {
 const user={id:'10000000-0000-0000-0000-000000000001',email:'tester@example.invalid',user_metadata:{display_name:'Ivet'}};
 let session=null, listener=()=>{};
 let n=100;
 const db={profiles:[],fridges:[],food_items:[],food_events:[],food_consumption:[],phone_scans:[],mock_photos:window.testCatalog.photos,mock_scans:window.testCatalog.scans.map((items,id)=>({id,items})),mock_recipes:window.testCatalog.recipes.map(data=>({name:data.name,data}))};
 window.testDB=db;
 window.testFail=false;
 const uuid=()=>`00000000-0000-0000-0000-${String(++n).padStart(12,'0')}`;
 function query(table){
  let action='select',payload,filters=[],one=false,ignore=false;
  const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},gte(){return q;},order(){return q;},limit(){return q;},
   single(){one=true;return q;},maybeSingle(){one=true;return q;},insert(v){action='insert';payload=v;return q;},
   upsert(v,options){action='upsert';payload=v;ignore=options?.ignoreDuplicates;return q;},update(v){action='update';payload=v;return q;},
   then(resolve,reject){return Promise.resolve().then(()=>{
    if(window.testFail&&action!=='select')return {data:null,error:{message:'Simulated write failure'}};
    let rows=db[table].filter(r=>filters.every(([k,v])=>r[k]===v));
    if(action==='insert'||action==='upsert'){
     rows=(Array.isArray(payload)?payload:[payload]).map(v=>{
      const existing=db[table].find(r=>r.id===v.id&&v.id);
      if(existing&&action==='upsert'){if(!ignore)Object.assign(existing,v);return existing;}
      const row={id:uuid(),created_at:new Date().toISOString(),...v};db[table].push(row);return row;
     });
    }
    if(action==='update')rows.forEach(r=>Object.assign(r,payload));
    return {data:one?(rows[0]||null):structuredClone(rows),error:null};
   }).then(resolve,reject);}
  };return q;
 }
 const client={from:query,functions:{async invoke(name,{body}){window.testAIRequests=(window.testAIRequests||[]).concat(body);if(window.testAIError)return {error:{context:{json:async()=>({error:'Live AI setup is incomplete.'})}}};if(body.prompt.includes('Suggest 3 recipes'))return {data:{recipes:[{name:'Spinach test omelette',uses:['Baby spinach','Eggs'],extra:['Oil'],buy:[],steps:['Cook thoroughly.'],minutes:10,servings:1,kcal:300}]}};if(body.prompt.includes('close-up photo'))return {data:{found:true,date:'2026-11-01',dateText:'01.11.26',barcode:'1234567890123'}};return {data:{type:'food',items:[{name:'Tomatoes',kind:'fresh',qty:'3 pcs',category:'veg',shelf:'Crisper drawer',daysLeft:4,confidence:'high',box:[50,50,250,250]}]}};}},storage:{from:()=>({getPublicUrl:path=>({data:{publicUrl:'/assets/products/'+path}})})},auth:{
  onAuthStateChange(fn){listener=fn;return {data:{subscription:{unsubscribe(){}}}};},
  async getSession(){return {data:{session},error:null};},
  async signInWithPassword(){session={user};listener('SIGNED_IN',session);return {data:{session},error:null};},
  async signUp(){return {data:{session:null},error:null};},
  async signOut(){session=null;listener('SIGNED_OUT',null);return {error:null};}
 },async rpc(name,args){
  if(window.testFail)return {error:{message:'Simulated write failure'}};
  if(name==='save_food_review'){
   for(const item of args.p_items){const old=db.food_items.find(i=>i.id===item.id);if(old)Object.assign(old,item);else db.food_items.push({id:uuid(),fridge_id:args.p_fridge_id,...item});}
   db.food_items=db.food_items.filter(i=>!args.p_missing_ids.includes(i.id));
  }else if(name==='finish_food_item'){
   const item=db.food_items.find(i=>i.id===args.p_item_id);
   if(!item)return {error:{message:'Item unavailable'}};
   db.food_events.push({id:uuid(),fridge_id:item.fridge_id,item_name:item.name,action:args.p_action,occurred_at:new Date().toISOString()});
   db.food_items=db.food_items.filter(i=>i.id!==item.id);
  }
  return {data:uuid(),error:null};
 }};
 Object.defineProperty(window,'ChillCheckBackend',{get:()=>client,set:()=>{},configurable:true});
})();
