-- Apply after migrations 001 and 002. Images are uploaded separately via Storage API.
begin;
create table public.mock_photos (id text primary key, object_path text not null unique);
create table public.mock_scans (id integer primary key, items jsonb not null check (jsonb_typeof(items)='array'));
create table public.mock_recipes (name text primary key, data jsonb not null check (jsonb_typeof(data)='object'));
alter table public.mock_photos enable row level security;
revoke all on public.mock_photos from public, anon, authenticated;
grant select on public.mock_photos to authenticated;
create policy catalog_read on public.mock_photos for select to authenticated using (true);
alter table public.mock_scans enable row level security;
revoke all on public.mock_scans from public, anon, authenticated;
grant select on public.mock_scans to authenticated;
create policy catalog_read on public.mock_scans for select to authenticated using (true);
alter table public.mock_recipes enable row level security;
revoke all on public.mock_recipes from public, anon, authenticated;
grant select on public.mock_recipes to authenticated;
create policy catalog_read on public.mock_recipes for select to authenticated using (true);
insert into public.mock_photos values ('breakfast-bowl','breakfast-bowl.jpg');
insert into public.mock_photos values ('cheddar','cheddar.jpg');
insert into public.mock_photos values ('chicken','chicken.jpg');
insert into public.mock_photos values ('container','container.jpg');
insert into public.mock_photos values ('cookies','cookies.jpg');
insert into public.mock_photos values ('creamy-pasta','creamy-pasta.jpg');
insert into public.mock_photos values ('eggs','eggs.jpg');
insert into public.mock_photos values ('milk','milk.jpg');
insert into public.mock_photos values ('omelette','omelette.jpg');
insert into public.mock_photos values ('pasta','pasta.jpg');
insert into public.mock_photos values ('soup','soup.jpg');
insert into public.mock_photos values ('spinach','spinach.jpg');
insert into public.mock_photos values ('stuffed-peppers','stuffed-peppers.jpg');
insert into public.mock_photos values ('tomatoes','tomatoes.jpg');
insert into public.mock_photos values ('yogurt','yogurt.jpg');
insert into public.mock_scans values (0,'[{"name": "Leftover vegetable soup", "kind": "cooked", "qty": "1 box \u00b7 2 portions", "shelf": "Top shelf", "daysLeft": 2, "seenDaysAgo": 1, "container": "clear glass soup box with cream lid", "condition": "carrot and potato pieces visible in broth", "confidence": "high", "note": "Homemade leftovers. Check when the soup was cooked and adjust the date.", "photoKey": "soup"}, {"name": "Rice-stuffed peppers", "kind": "cooked", "qty": "6 peppers", "shelf": "Middle shelf", "daysLeft": 1, "seenDaysAgo": 2, "container": "vanilla ice cream tub with pink lid", "condition": "cooked peppers and rice visible inside the open tub", "confidence": "low", "note": "Reused ice cream tub: these are rice-stuffed peppers, not ice cream. Confirm the contents and when they were cooked; the tub''s printed date does not apply.", "photoKey": "stuffed-peppers"}, {"name": "Chicken breast", "kind": "packaged", "qty": "500 g", "shelf": "Bottom shelf", "printedDate": "", "daysLeft": -1, "seenDaysAgo": 3, "condition": "grey patches on the meat", "confidence": "high", "photoKey": "chicken"}, {"name": "Leftover pasta", "kind": "cooked", "qty": "1 box", "shelf": "Top shelf", "daysLeft": 2, "seenDaysAgo": 2, "condition": "home-cooked, in a glass box", "confidence": "high", "photoKey": "pasta"}, {"name": "Baby spinach", "kind": "fresh", "qty": "200 g", "shelf": "Crisper drawer", "daysLeft": 1, "seenDaysAgo": 4, "condition": "a few leaves turning dark", "confidence": "high", "photoKey": "spinach"}, {"name": "Milk 3.6%", "kind": "packaged", "qty": "1 L", "shelf": "Door rack", "printedDate": "", "dateText": "2?.1?.2?", "daysLeft": 2, "seenDaysAgo": 3, "condition": "sealed carton, date partly hidden", "confidence": "medium", "photoKey": "milk"}, {"name": "Greek yogurt", "kind": "packaged", "qty": "2 cups", "shelf": "Middle shelf", "printedIn": 4, "daysLeft": 4, "seenDaysAgo": 6, "condition": "sealed, looks fine", "confidence": "high", "photoKey": "yogurt"}, {"name": "Tomatoes", "kind": "fresh", "qty": "6 pcs", "shelf": "Crisper drawer", "daysLeft": 5, "seenDaysAgo": 1, "condition": "firm and bright red", "confidence": "high", "photoKey": "tomatoes"}, {"name": "Eggs", "kind": "fresh", "qty": "10 pcs", "shelf": "Middle shelf", "daysLeft": 12, "seenDaysAgo": 5, "condition": "carton closed", "confidence": "medium", "photoKey": "eggs"}, {"name": "Cheddar", "kind": "packaged", "qty": "250 g", "shelf": "Middle shelf", "printedIn": 18, "daysLeft": 18, "seenDaysAgo": 8, "condition": "sealed block", "confidence": "high", "photoKey": "cheddar"}]'::jsonb);
insert into public.mock_scans values (1,'[{"name": "Leftover vegetable soup", "kind": "cooked", "qty": "1 box \u00b7 2 portions", "shelf": "Top shelf", "daysLeft": 2, "seenDaysAgo": 1, "container": "clear glass soup box with cream lid", "condition": "carrot and potato pieces visible in broth", "confidence": "high", "note": "Homemade leftovers. Check when the soup was cooked and adjust the date.", "photoKey": "soup"}, {"name": "Rice-stuffed peppers", "kind": "cooked", "qty": "6 peppers", "shelf": "Middle shelf", "daysLeft": 1, "seenDaysAgo": 2, "container": "vanilla ice cream tub with pink lid", "condition": "cooked peppers and rice visible inside the open tub", "confidence": "low", "note": "Reused ice cream tub: these are rice-stuffed peppers, not ice cream. Confirm the contents and when they were cooked; the tub''s printed date does not apply.", "photoKey": "stuffed-peppers"}, {"name": "Chicken breast", "kind": "packaged", "qty": "500 g", "shelf": "Bottom shelf", "daysLeft": -1, "condition": "grey patches on the meat", "confidence": "high", "photoKey": "chicken"}, {"name": "Baby spinach", "kind": "fresh", "qty": "150 g", "shelf": "Crisper drawer", "daysLeft": 1, "condition": "more leaves turning dark", "confidence": "high", "photoKey": "spinach"}, {"name": "Milk 3.6%", "kind": "packaged", "qty": "0.5 L", "shelf": "Door rack", "daysLeft": 2, "condition": "opened carton", "confidence": "medium", "photoKey": "milk"}, {"name": "Greek yogurt", "kind": "packaged", "qty": "1 cup", "shelf": "Middle shelf", "daysLeft": 4, "condition": "sealed, looks fine", "confidence": "high", "photoKey": "yogurt"}, {"name": "Cookies", "kind": "other", "qty": "1 tub", "shelf": "Top shelf", "daysLeft": 20, "container": "vanilla ice cream tub", "condition": "cookies visible through the lid gap", "confidence": "low", "note": "An ice cream tub outside the freezer, holding cookies", "photoKey": "cookies"}, {"name": "Unknown container", "kind": "cooked", "qty": "1 box", "shelf": "Middle shelf", "daysLeft": 3, "container": "blue opaque box, white lid", "condition": "can''t see inside", "confidence": "low", "note": "Contents unknown. Type what''s inside, and the app will remember this box.", "photoKey": "container"}, {"name": "Tomatoes", "kind": "fresh", "qty": "5 pcs", "shelf": "Crisper drawer", "daysLeft": 5, "condition": "firm and bright red", "confidence": "high", "photoKey": "tomatoes"}, {"name": "Eggs", "kind": "fresh", "qty": "8 pcs", "shelf": "Middle shelf", "daysLeft": 12, "condition": "carton closed", "confidence": "medium", "photoKey": "eggs"}, {"name": "Cheddar", "kind": "packaged", "qty": "200 g", "shelf": "Middle shelf", "daysLeft": 18, "condition": "opened, edges dry", "confidence": "high", "photoKey": "cheddar"}]'::jsonb);
insert into public.mock_recipes values ('Spinach and tomato omelette','{"name": "Spinach and tomato omelette", "photo": "omelette", "minutes": 10, "servings": 1, "kcal": 340, "uses": ["Eggs", "Baby spinach", "Tomatoes", "Cheddar"], "pantry": ["Olive oil", "Salt", "Pepper"], "steps": ["Beat 3 eggs with a pinch of salt and pepper.", "Wilt a handful of spinach in a pan with a little oil.", "Add the eggs, sliced tomato and 20 g grated cheddar.", "Cook until the eggs are set, fold and serve."]}'::jsonb);
insert into public.mock_recipes values ('Leftover pasta with creamy spinach','{"name": "Leftover pasta with creamy spinach", "photo": "creamy-pasta", "minutes": 12, "servings": 2, "kcal": 520, "uses": ["Leftover pasta", "Baby spinach", "Milk 3.6%", "Cheddar"], "pantry": ["Garlic", "Butter"], "steps": ["Melt a knob of butter with a chopped garlic clove.", "Add 100 ml milk and 40 g grated cheddar; stir.", "Add the spinach and leftover pasta.", "Heat thoroughly and season."]}'::jsonb);
insert into public.mock_recipes values ('Honey yogurt breakfast bowl','{"name": "Honey yogurt breakfast bowl", "photo": "breakfast-bowl", "minutes": 5, "servings": 1, "kcal": 280, "uses": ["Greek yogurt"], "pantry": ["Honey", "Oats", "Fresh berries"], "steps": ["Spoon yogurt into a bowl.", "Top with oats and berries.", "Drizzle with honey."]}'::jsonb);
alter table public.food_items add column photo_key text references public.mock_photos(id);
alter table public.food_events add column photo_key text references public.mock_photos(id);
update public.food_items set photo_key='soup' where name='Leftover vegetable soup';
update public.food_items set photo_key='stuffed-peppers' where name='Rice-stuffed peppers';
update public.food_items set photo_key='chicken' where name='Chicken breast';
update public.food_items set photo_key='pasta' where name='Leftover pasta';
update public.food_items set photo_key='spinach' where name='Baby spinach';
update public.food_items set photo_key='milk' where name='Milk 3.6%';
update public.food_items set photo_key='yogurt' where name='Greek yogurt';
update public.food_items set photo_key='tomatoes' where name='Tomatoes';
update public.food_items set photo_key='eggs' where name='Eggs';
update public.food_items set photo_key='cheddar' where name='Cheddar';
update public.food_items set photo_key='cookies' where name='Cookies';
update public.food_items set photo_key='container' where name='Unknown container';
create or replace function public.finish_food_item(p_item_id uuid, p_action text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare item public.food_items; event_id uuid;
begin
 if p_action not in ('eaten','discarded') or p_action is null then
  raise exception 'Invalid food action' using errcode = '22023';
 end if;
 select * into item from public.food_items where id = p_item_id for update;
 if not found then raise exception 'Item unavailable' using errcode = '42501'; end if;
 insert into public.food_events(fridge_id,item_name,action,photo_key)
 values (item.fridge_id,item.name,p_action,item.photo_key) returning id into event_id;
 delete from public.food_items where id = item.id;
 return event_id;
end;
$$;
revoke all on function public.finish_food_item(uuid,text) from public, anon;
grant execute on function public.finish_food_item(uuid,text) to authenticated;

create or replace function public.save_food_review(p_fridge_id uuid, p_items jsonb, p_missing_ids uuid[] default '{}')
returns uuid language plpgsql security invoker set search_path = '' as $$
declare scan_id uuid; entry jsonb; item public.food_items; saved_id uuid; missing_id uuid;
begin
 -- Lock the fridge to serialize reviews for this fridge. RLS checks the caller.
 perform 1 from public.fridges where id=p_fridge_id for update;
 if not found then raise exception 'Fridge unavailable' using errcode='42501'; end if;
 if p_items is null or jsonb_typeof(p_items) <> 'array' then
  raise exception 'Review must be an array' using errcode='22023';
 end if;
 if jsonb_array_length(p_items) > 100 then raise exception 'Review too large'; end if;
 foreach missing_id in array coalesce(p_missing_ids, '{}'::uuid[]) loop
  if not exists (select 1 from public.food_items where id=missing_id and fridge_id=p_fridge_id) then
   raise exception 'Missing item unavailable' using errcode='42501';
  end if;
 end loop;
 insert into public.scans(fridge_id,source,status) values (p_fridge_id,'example','confirmed') returning id into scan_id;
 for entry in select value from jsonb_array_elements(p_items) loop
  item := jsonb_populate_record(null::public.food_items, entry);
  if item.id is not null and not exists (select 1 from public.food_items where id=item.id and fridge_id=p_fridge_id) then
   raise exception 'Reviewed item unavailable' using errcode='42501';
  end if;
  insert into public.food_items(id,fridge_id,name,quantity,kind,category,shelf,expires_on,date_source,
   date_text,first_seen_on,cooked_on,container_description,condition,confidence,notes,barcode,photo_key)
  values (coalesce(item.id,gen_random_uuid()),p_fridge_id,item.name,coalesce(item.quantity,''),
   coalesce(item.kind,'other'),coalesce(item.category,'unknown'),item.shelf,item.expires_on,
   coalesce(item.date_source,'unknown'),coalesce(item.date_text,''),coalesce(item.first_seen_on,current_date),
   item.cooked_on,coalesce(item.container_description,''),coalesce(item.condition,''),
   coalesce(item.confidence,'low'),coalesce(item.notes,''),coalesce(item.barcode,''),item.photo_key)
  on conflict (id) do update set name=excluded.name, quantity=excluded.quantity,kind=excluded.kind,
   category=excluded.category,shelf=excluded.shelf,expires_on=excluded.expires_on,date_source=excluded.date_source,
   date_text=excluded.date_text,cooked_on=excluded.cooked_on,container_description=excluded.container_description,
   condition=excluded.condition,confidence=excluded.confidence,notes=excluded.notes,barcode=excluded.barcode,photo_key=excluded.photo_key
  returning id into saved_id;
  insert into public.scan_items(scan_id,fridge_id,proposed_name,proposed_data,review_status)
  values (scan_id,p_fridge_id,item.name,entry,'accepted');
 end loop;
 delete from public.food_items where fridge_id=p_fridge_id and id=any(coalesce(p_missing_ids,'{}'::uuid[]));
 update public.fridges set last_scan_at=now() where id=p_fridge_id;
 return scan_id;
end;
$$;
revoke all on function public.save_food_review(uuid,jsonb,uuid[]) from public, anon;
grant execute on function public.save_food_review(uuid,jsonb,uuid[]) to authenticated;
commit;
