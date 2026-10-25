-- Quantity-aware consumption, applied after 004. No historical amounts are invented.
begin;
create table public.food_consumption (
 id uuid primary key default gen_random_uuid(),
 fridge_id uuid not null references public.fridges(id) on delete cascade,
 item_name text not null check(length(trim(item_name)) between 1 and 120),
 amount numeric not null check(amount>0 and amount<100000000),
 unit text not null check(unit in ('cups','tubs','pcs','packs','portions','g','ml')),
 consumed_on date not null default current_date,
 created_at timestamptz not null default now()
);
create index consumption_fridge_day on public.food_consumption(fridge_id,consumed_on);
alter table public.food_consumption enable row level security;
revoke all on public.food_consumption from public,anon,authenticated;
grant select,insert on public.food_consumption to authenticated;
create policy consumption_owner on public.food_consumption for all to authenticated
 using (exists(select 1 from public.fridges f where f.id=fridge_id and f.owner_id=(select auth.uid())))
 with check (exists(select 1 from public.fridges f where f.id=fridge_id and f.owner_id=(select auth.uid())));
create function public.parse_food_quantity(p_text text) returns table(amount numeric,unit text)
language plpgsql immutable set search_path='' as $$
declare parts text[]; u text;
begin
 parts:=regexp_match(lower(trim(p_text)),'^([0-9]+(?:\.[0-9]+)?)\s*([a-z]+)$');
 if parts is null then return;end if;
 amount:=parts[1]::numeric;u:=parts[2];
 unit:=case when u in ('cup','cups','pot','pots') then 'cups' when u in ('tub','tubs') then 'tubs'
 when u in ('pcs','pc','piece','pieces','egg','eggs') then 'pcs' when u in ('pack','packs') then 'packs'
 when u in ('portion','portions') then 'portions' when u in ('g','kg') then 'g' when u in ('ml','l') then 'ml' end;
 if unit is null or amount<=0 or amount>=100000000 then return;end if;
 if u in ('kg','l') then amount:=amount*1000;end if;
 return next;
end $$;
revoke all on function public.parse_food_quantity(text) from public,anon;
grant execute on function public.parse_food_quantity(text) to authenticated;
create function public.consume_food_item(p_item_id uuid,p_amount numeric,p_expected_quantity text) returns void
language plpgsql security invoker set search_path='' as $$
declare item public.food_items; stock numeric; units text; remaining numeric;
begin
 select * into item from public.food_items where id=p_item_id for update;
 if not found then raise exception 'Item unavailable' using errcode='42501';end if;
 if item.quantity is distinct from p_expected_quantity then raise exception 'Stock changed. Refresh and try again.';end if;
 if item.expires_on<current_date then raise exception 'This item is expired. Use Discard instead.';end if;
 select amount,unit into stock,units from public.parse_food_quantity(item.quantity);
 if stock is null then raise exception 'Set a clear quantity first, such as 6 cups or 500 g.';end if;
 if p_amount is null or p_amount<=0 or p_amount>stock then raise exception 'Amount must be positive and no more than current stock.';end if;
 insert into public.food_consumption(fridge_id,item_name,amount,unit) values(item.fridge_id,item.name,p_amount,units);
 insert into public.food_events(fridge_id,item_name,action,photo_key) values(item.fridge_id,item.name,'eaten',item.photo_key);
 remaining:=stock-p_amount;
 if remaining=0 then delete from public.food_items where id=item.id;
 else update public.food_items set quantity=trim(trailing '.' from trim(trailing '0' from to_char(remaining,'FM999999999990.999999')))||' '||units where id=item.id;end if;
end $$;
revoke all on function public.consume_food_item(uuid,numeric,text) from public,anon;
grant execute on function public.consume_food_item(uuid,numeric,text) to authenticated;
-- Finishing an entire item also contributes its known quantity; discards never count as eating.
create or replace function public.finish_food_item(p_item_id uuid,p_action text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare item public.food_items; event_id uuid; stock numeric; units text;
begin
 if p_action not in ('eaten','discarded') or p_action is null then raise exception 'Invalid food action' using errcode='22023';end if;
 select * into item from public.food_items where id=p_item_id for update;
 if not found then raise exception 'Item unavailable' using errcode='42501';end if;
 if p_action='eaten' then
  if item.expires_on<current_date then raise exception 'This item is expired. Use Discard instead.';end if;
  select amount,unit into stock,units from public.parse_food_quantity(item.quantity);
  if stock is not null then insert into public.food_consumption(fridge_id,item_name,amount,unit) values(item.fridge_id,item.name,stock,units);end if;
 end if;
 insert into public.food_events(fridge_id,item_name,action,photo_key) values(item.fridge_id,item.name,p_action,item.photo_key) returning id into event_id;
 delete from public.food_items where id=item.id;return event_id;
end $$;
commit;
