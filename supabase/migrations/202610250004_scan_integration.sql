-- Apply after 003. Private phone handoff and authenticated AI quota.
begin;
create table public.phone_scans (
 id uuid primary key default gen_random_uuid(),
 fridge_id uuid not null references public.fridges(id) on delete cascade,
 payload jsonb not null check (jsonb_typeof(payload)='object' and octet_length(payload::text)<200000),
 status text not null default 'pending' check(status in ('pending','reviewed')),
 created_at timestamptz not null default now()
);
create index phone_scans_fridge_time on public.phone_scans(fridge_id,created_at);
alter table public.phone_scans enable row level security;
revoke all on public.phone_scans from public,anon,authenticated;
grant select,insert,update,delete on public.phone_scans to authenticated;
create policy phone_owner on public.phone_scans for all to authenticated using
 (exists(select 1 from public.fridges f where f.id=fridge_id and f.owner_id=(select auth.uid())))
 with check (exists(select 1 from public.fridges f where f.id=fridge_id and f.owner_id=(select auth.uid())));
create table public.ai_request_limits (user_id uuid primary key references auth.users(id) on delete cascade, window_start timestamptz not null, requests integer not null);
alter table public.ai_request_limits enable row level security;
revoke all on public.ai_request_limits from public,anon,authenticated;
create function public.claim_ai_request() returns void language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 insert into public.ai_request_limits(user_id,window_start,requests) values(auth.uid(),now(),1)
 on conflict(user_id) do update set
 requests=case when ai_request_limits.window_start < now()-interval '1 hour' then 1 else ai_request_limits.requests+1 end,
 window_start=case when ai_request_limits.window_start < now()-interval '1 hour' then now() else ai_request_limits.window_start end
 returning requests into n;
 if n>30 then raise exception 'Hourly AI limit reached' using errcode='P0001'; end if;
end $$;
revoke all on function public.claim_ai_request() from public,anon;
grant execute on function public.claim_ai_request() to authenticated;
-- Extend review source while retaining the atomic inventory transaction.
drop function public.save_food_review(uuid,jsonb,uuid[]);
create or replace function public.save_food_review(p_fridge_id uuid, p_items jsonb, p_missing_ids uuid[] default '{}', p_source text default 'example')
returns uuid language plpgsql security invoker set search_path = '' as $$
declare scan_id uuid; entry jsonb; item public.food_items; saved_id uuid; missing_id uuid;
begin
 if p_source not in ('example','camera','phone','receipt') or p_source is null then raise exception 'Invalid scan source'; end if;
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
 insert into public.scans(fridge_id,source,status) values (p_fridge_id,p_source,'confirmed') returning id into scan_id;
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
revoke all on function public.save_food_review(uuid,jsonb,uuid[],text) from public, anon;
grant execute on function public.save_food_review(uuid,jsonb,uuid[],text) to authenticated;
commit;
