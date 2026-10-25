/* Supabase is the source of truth. Only Auth keeps its session in browser storage. */
window.ChillAPI = (() => {
  const client = () => {
    if (!window.ChillCheckBackend) throw new Error('Add your Supabase URL and publishable key to .env, then restart scripts/start.py.');
    return window.ChillCheckBackend;
  };
  async function result(query) {
    const {data,error} = await query;
    if (error) {
      if (error.code === 'PGRST205' || error.code === '42703') throw new Error('Run the database migrations through 202610250004_scan_integration.sql in Supabase SQL Editor.');
      if (error.code === 'PGRST202') throw new Error('Run all database migrations through 202610250004_scan_integration.sql in Supabase SQL Editor to enable these actions.');
      throw new Error(error.message || 'The database request failed.');
    }
    return data;
  }
  const fromRow = r => ({
    photoKey:r.photo_key, id:r.id, name:r.name, qty:r.quantity, kind:r.kind, category:r.category, shelf:r.shelf || '',
    expires:r.expires_on, dateSource:r.date_source, dateText:r.date_text, firstSeen:r.first_seen_on,
    cookedOn:r.cooked_on,container:r.container_description,condition:r.condition,confidence:r.confidence,
    note:r.notes,barcode:r.barcode
  });
  const toRow = i => ({
    photo_key:ChillData.photo(i.name,i.photoKey).key, name:i.name.trim(), quantity:i.qty || '',kind:i.kind || 'other',category:Food.categoryOf(i),
    shelf:i.shelf || null,expires_on:i.expires || null,date_source:i.dateSource || 'unknown',
    date_text:i.dateText || '',first_seen_on:i.firstSeen || Dates.today(),cooked_on:i.cookedOn || null,
    container_description:i.container || '',condition:i.condition || '',confidence:i.confidence || 'high',
    notes:i.note || '',barcode:i.barcode || ''
  });
  return {
    client, fromRow, toRow,
    async consumption(fridgeId,since) {
      const {data,error}=await client().from('food_consumption').select('*').eq('fridge_id',fridgeId).gte('consumed_on',since).order('consumed_on');
      if(error)throw Error(error.code==='PGRST205'?'Run migration 202610250005_shopping_consumption.sql to enable consumption history.':error.message);
      return data;
    },
    async consume(item,amount) {
      const {error}=await client().rpc('consume_food_item',{p_item_id:item.id,p_amount:amount,p_expected_quantity:item.qty});
      if(error)throw Error(error.code==='PGRST202'?'Run migration 202610250005_shopping_consumption.sql to enable consumption logging.':error.message);
    },
    async sendPhone(fridgeId,payload) {
      const {photo,...safe}=payload;
      return result(client().from('phone_scans').insert({fridge_id:fridgeId,payload:safe}).select().single());
    },
    phoneInbox: (fridgeId,since)=>result(client().from('phone_scans').select('*').eq('fridge_id',fridgeId).eq('status','pending').gte('created_at',since).order('created_at')),
    completePhone: id=>result(client().from('phone_scans').update({status:'reviewed'}).eq('id',id)),
    async bootstrap(user) {
      const [photos,scans,recipes]=await Promise.all(['mock_photos','mock_scans','mock_recipes'].map(table=>result(client().from(table).select('*').order(table==='mock_recipes'?'name':'id'))));
      ChillData.loadCatalog({photos,scans,recipes},path=>client().storage.from('mock-photos').getPublicUrl(path).data.publicUrl);
      const name=String(user.user_metadata?.display_name || user.email?.split('@')[0] || 'My profile').slice(0,80);
      let profile = await result(client().from('profiles').select('*').eq('id',user.id).maybeSingle());
      if (!profile) profile = await result(client().from('profiles').upsert({id:user.id,display_name:name},{onConflict:'id',ignoreDuplicates:true}).select()).then(rows=>rows?.[0] || {display_name:name});
      const fridges = await result(client().from('fridges').select('*').order('created_at'));
      return {profile,fridges};
    },
    createFridge: name => result(client().from('fridges').insert({name:name.trim()}).select().single()),
    purchases: (fridgeId,since)=>result(client().from('scans').select('id,taken_at,scan_items(proposed_name,proposed_data,review_status)').eq('fridge_id',fridgeId).eq('source','receipt').eq('status','confirmed').gte('taken_at',since).order('taken_at',{ascending:false}).limit(100)),
    async inventory(fridgeId) {
      const [items,events]=await Promise.all([
        result(client().from('food_items').select('*').eq('fridge_id',fridgeId).order('expires_on',{ascending:true,nullsFirst:false})),
        result(client().from('food_events').select('*').eq('fridge_id',fridgeId).order('occurred_at',{ascending:false}).limit(100))
      ]);
      return {items:items.map(fromRow),events};
    },
    add: (fridgeId,item)=>result(client().from('food_items').insert({...toRow(item),fridge_id:fridgeId}).select().single()),
    update: (fridgeId,item)=>result(client().from('food_items').update(toRow(item)).eq('id',item.id).eq('fridge_id',fridgeId).select().single()),
    finish: (id,action)=>result(client().rpc('finish_food_item',{p_item_id:id,p_action:action})),
    review: (fridgeId,rows,missing,source="example")=>result(client().rpc('save_food_review',{
      p_source:source, p_fridge_id:fridgeId,
      p_items:rows.map(i=>({...toRow(i),...(!i.isNew?{id:i.id}:{})})),
      p_missing_ids:missing.filter(m=>!m.keep).map(m=>m.item.id)
    }))
  };
})();
