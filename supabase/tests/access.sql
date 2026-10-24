-- Run against a disposable database AFTER the migration. All fixture writes roll back.
-- Requires a privileged SQL connection to switch roles; no real accounts are created.
begin;
insert into auth.users(id) values
 ('10000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
insert into public.profiles(id,display_name) values (auth.uid(),'Alice');
insert into public.fridges(id,name) values ('20000000-0000-0000-0000-000000000001','Alice fridge');
insert into public.food_items(id,fridge_id,name,kind,category,container_description,date_source)
values ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',
'Rice-stuffed peppers','cooked','cooked','Reused ice cream tub','cooked');
insert into public.scans(id,fridge_id,source)
values ('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','example');
insert into public.scan_items(scan_id,fridge_id,proposed_name)
values ('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Soup');
insert into public.food_events(fridge_id,item_name,action)
values ('20000000-0000-0000-0000-000000000001','Leftover soup','eaten');

-- Switch accounts. Bob cannot read or change Alice's rows.
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
do $$
declare t text; n integer;
begin
 foreach t in array array['profiles','fridges','food_items','scans','scan_items','food_events'] loop
  execute format('select count(*) from public.%I',t) into n;
  if n <> 0 then raise exception 'Cross-account read on %',t; end if;
  execute format('delete from public.%I',t);
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Cross-account delete on %',t; end if;
 end loop;
 update public.food_items set name='stolen';
 get diagnostics n = row_count;
 if n <> 0 then raise exception 'Cross-account update'; end if;
 begin
  insert into public.food_items(fridge_id,name) values ('20000000-0000-0000-0000-000000000001','Intruder');
  raise exception 'Cross-account insert unexpectedly allowed';
 exception when insufficient_privilege then null;
 end;
 begin
  insert into public.fridges(owner_id,name) values ('10000000-0000-0000-0000-000000000001','Forged owner');
  raise exception 'Owner forgery unexpectedly allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
insert into public.fridges(id,name) values ('20000000-0000-0000-0000-000000000002','Bob fridge');
-- A child scan cannot claim a different fridge to bypass its parent's access rules.
do $$ begin
 begin
  insert into public.scan_items(scan_id,fridge_id,proposed_name)
  values ('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','Forged scan');
  raise exception 'Cross-fridge scan link unexpectedly allowed';
 exception when foreign_key_violation then null;
 end;
end $$;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
do $$
declare n integer;
begin
 select count(*) into n from public.food_items;
 if n <> 1 then raise exception 'Owner lost item'; end if;
 update public.food_items set quantity='4 peppers' where id='30000000-0000-0000-0000-000000000001';
 if not found then raise exception 'Owner update failed'; end if;
 begin
  update public.fridges set owner_id='10000000-0000-0000-0000-000000000002';
  raise exception 'Ownership transfer unexpectedly allowed';
 exception when insufficient_privilege then null;
 end;
 begin
  update public.food_items set category='invalid';
  raise exception 'Invalid category unexpectedly allowed';
 exception when check_violation then null;
 end;
 delete from public.food_items where id='30000000-0000-0000-0000-000000000001';
 if not found then raise exception 'Owner delete failed'; end if;
 select count(*) into n from public.food_events;
 if n <> 1 then raise exception 'Deleting inventory erased history'; end if;
end $$;

reset role;
set local role anon;
do $$ declare t text; begin
 foreach t in array array['profiles','fridges','food_items','scans','scan_items','food_events'] loop
  begin
   execute format('select * from public.%I',t);
   raise exception 'Anonymous read unexpectedly allowed on %',t;
  exception when insufficient_privilege then null;
  end;
 end loop;
end $$;
reset role;
rollback;
select 'PASS: owner CRUD, cross-account isolation, anonymous denial, constraints, scan linkage and retained history' as result;
