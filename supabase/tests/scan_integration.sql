begin;
insert into auth.users(id) values ('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
insert into public.fridges(id,name) values('20000000-0000-0000-0000-000000000001','Phone test');
insert into public.phone_scans(fridge_id,payload) values('20000000-0000-0000-0000-000000000001','{"items":[]}');
select public.save_food_review('20000000-0000-0000-0000-000000000001','[{"name":"Tomatoes"}]','{}','phone');
do $$ begin
 if not exists(select 1 from public.scans where source='phone') then raise exception 'Scan source lost';end if;
 for i in 1..30 loop perform public.claim_ai_request();end loop;
 begin
  perform public.claim_ai_request();raise exception 'Quota allowed request 31' using errcode='22023';
 exception when raise_exception then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$ begin
 if exists(select 1 from public.phone_scans) then raise exception 'Cross-user phone leak';end if;
 begin
  insert into public.phone_scans(fridge_id,payload) values('20000000-0000-0000-0000-000000000001','{}');
  raise exception 'Cross-user insert allowed';
 exception when insufficient_privilege then null;end;
 perform public.claim_ai_request();
end $$;
reset role;set local role anon;
do $$ begin
 begin perform public.claim_ai_request();raise exception 'Anonymous quota access';exception when insufficient_privilege then null;end;
 begin perform 1 from public.phone_scans;raise exception 'Anonymous phone access';exception when insufficient_privilege then null;end;
end $$;
rollback;
select 'PASS: phone owner isolation, scan source persistence, AI quota and anonymous denial' as result;
