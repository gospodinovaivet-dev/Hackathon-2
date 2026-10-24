-- Read-only checks AFTER migration. Expected: six tables, RLS true, four policies each.
select c.relname as table_name, c.relrowsecurity as rls_enabled,
 (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname) as policy_count,
 has_table_privilege('anon', c.oid, 'SELECT') as anonymous_can_select,
 has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_has_select_grant
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in
 ('profiles','fridges','food_items','scans','scan_items','food_events')
order by c.relname;
