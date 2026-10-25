-- Atomic inventory operations. Run after 202610240001_initial_schema.sql.
begin;
create function public.finish_food_item(p_item_id uuid, p_action text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare item public.food_items; event_id uuid;
begin
 if p_action not in ('eaten','discarded') or p_action is null then
  raise exception 'Invalid food action' using errcode = '22023';
 end if;
 select * into item from public.food_items where id = p_item_id for update;
 if not found then raise exception 'Item unavailable' using errcode = '42501'; end if;
 insert into public.food_events(fridge_id,item_name,action)
 values (item.fridge_id,item.name,p_action) returning id into event_id;
 delete from public.food_items where id = item.id;
 return event_id;
end;
$$;
revoke all on function public.finish_food_item(uuid,text) from public, anon;
grant execute on function public.finish_food_item(uuid,text) to authenticated;

create function public.save_food_review(p_fridge_id uuid, p_items jsonb, p_missing_ids uuid[] default '{}')
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
   date_text,first_seen_on,cooked_on,container_description,condition,confidence,notes,barcode)
  values (coalesce(item.id,gen_random_uuid()),p_fridge_id,item.name,coalesce(item.quantity,''),
   coalesce(item.kind,'other'),coalesce(item.category,'unknown'),item.shelf,item.expires_on,
   coalesce(item.date_source,'unknown'),coalesce(item.date_text,''),coalesce(item.first_seen_on,current_date),
   item.cooked_on,coalesce(item.container_description,''),coalesce(item.condition,''),
   coalesce(item.confidence,'low'),coalesce(item.notes,''),coalesce(item.barcode,''))
  on conflict (id) do update set name=excluded.name, quantity=excluded.quantity,kind=excluded.kind,
   category=excluded.category,shelf=excluded.shelf,expires_on=excluded.expires_on,date_source=excluded.date_source,
   date_text=excluded.date_text,cooked_on=excluded.cooked_on,container_description=excluded.container_description,
   condition=excluded.condition,confidence=excluded.confidence,notes=excluded.notes,barcode=excluded.barcode
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
