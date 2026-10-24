-- Disposable local database after migrations 001–003.
begin;
insert into auth.users(id) values ('10000000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$
declare fridge uuid; food uuid;
begin
 if (select count(*) from public.mock_photos) <> 15 then raise exception 'Photo catalog missing'; end if;
 if (select count(*) from public.mock_scans) <> 2 then raise exception 'Scan catalog missing'; end if;
 if (select count(*) from public.mock_recipes) <> 3 then raise exception 'Recipe catalog missing'; end if;
 begin
  update public.mock_photos set object_path='bad.jpg' where id='soup';
  raise exception 'Catalog was writable';
 exception when insufficient_privilege then null; end;
 insert into public.fridges(name) values ('Photo test') returning id into fridge;
 perform public.save_food_review(fridge,'[{"name":"Renamed soup","photo_key":"soup"}]');
 select id into food from public.food_items where fridge_id=fridge and photo_key='soup';
 if food is null then raise exception 'Photo reference lost'; end if;
 perform public.finish_food_item(food,'eaten');
 if not exists(select 1 from public.food_events where fridge_id=fridge and photo_key='soup') then raise exception 'History photo lost'; end if;
 begin
  perform public.save_food_review(fridge,'[{"name":"Invalid","photo_key":"missing-photo"}]');
  raise exception 'Invalid photo accepted';
 exception when foreign_key_violation then null; end;
 if exists(select 1 from public.food_items where fridge_id=fridge) then raise exception 'Invalid photo left partial data'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
 begin
  perform 1 from public.mock_scans;
  raise exception 'Anonymous catalog access allowed';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'PASS: catalog read-only, photo persistence/history, invalid photo rollback, anonymous denial' as result;
