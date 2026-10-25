begin;
insert into auth.users(id) values ('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
insert into public.fridges(id,name) values ('20000000-0000-0000-0000-000000000001','Test fridge');
select public.save_food_review('20000000-0000-0000-0000-000000000001','[{"name":"Soup","kind":"cooked","category":"cooked"},{"name":"Rice-stuffed peppers","container_description":"Ice cream tub","kind":"cooked","category":"cooked"}]'::jsonb);
do $$ declare n integer; item_id uuid; before_count integer; begin
 select count(*) into n from public.food_items;
 if n<>2 then raise exception 'Review insert failed'; end if;
 select id into item_id from public.food_items where name='Soup';
 perform public.finish_food_item(item_id,'eaten');
 if exists(select 1 from public.food_items where id=item_id) then raise exception 'Item not removed';end if;
 select count(*) into n from public.food_events where item_name='Soup' and action='eaten';
 if n<>1 then raise exception 'History not recorded';end if;
 begin
  perform public.finish_food_item(item_id,'eaten');
  raise exception 'Duplicate finish unexpectedly succeeded';
 exception when insufficient_privilege then null;
 end;
 select count(*) into before_count from public.scans;
 begin
  perform public.save_food_review('20000000-0000-0000-0000-000000000001','[{"name":"Should rollback"},{"name":""}]'::jsonb);
  raise exception 'Invalid scan unexpectedly accepted';
 exception when check_violation then null;
 end;
 if exists(select 1 from public.food_items where name='Should rollback') then raise exception 'Partial save survived';end if;
 select count(*) into n from public.scans;
 if n<>before_count then raise exception 'Failed scan history survived';end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$ begin
 begin
  perform public.save_food_review('20000000-0000-0000-0000-000000000001','[]'::jsonb);
  raise exception 'Cross-owner scan accepted';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin
  perform public.finish_food_item('30000000-0000-0000-0000-000000000001','eaten');
  raise exception 'Anonymous RPC allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;
select 'PASS: atomic review, history and removal, duplicate protection, rollback, owner isolation, anonymous RPC denial' as result;
