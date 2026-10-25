begin;
insert into auth.users(id) values ('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
insert into public.fridges(id,name) values ('20000000-0000-0000-0000-000000000001','Shopping test');
select public.save_food_review('20000000-0000-0000-0000-000000000001','[{"name":"Yogurt","quantity":"16 cups","kind":"fresh","category":"dairy"}]'::jsonb);
do $$ declare item_id uuid; q text; n integer; begin
 select id into item_id from public.food_items where name='Yogurt';
 perform public.consume_food_item(item_id,6,'16 cups');
 select quantity into q from public.food_items where id=item_id;
 if q<>'10 cups' then raise exception 'Wrong remaining quantity: %',q;end if;
 begin
  perform public.consume_food_item(item_id,6,'16 cups');
  raise exception 'Stale write accepted' using errcode='XX000';
 exception when raise_exception then null;end;
 select count(*) into n from public.food_consumption;
 if n<>1 then raise exception 'Duplicate consumption';end if;
 perform public.consume_food_item(item_id,9.5,'10 cups');
 select quantity into q from public.food_items where id=item_id;
 if q<>'0.5 cups' then raise exception 'Fraction lost: %',q;end if;
 perform public.finish_food_item(item_id,'discarded');
 select count(*) into n from public.food_consumption;
 if n<>2 then raise exception 'Discard counted as eating';end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$ begin if exists(select 1 from public.food_consumption) then raise exception 'Cross-owner history visible';end if;end $$;
rollback;
select 'PASS partial consumption, stale write protection, fractional stock, discard exclusion, owner isolation';
