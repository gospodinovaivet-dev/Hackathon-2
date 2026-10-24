-- Read-only: run in the hosted project's SQL Editor BEFORE applying a migration.
select table_name from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name;

select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name in
 ('profiles','fridges','food_items','scans','scan_items','food_events')
order by table_name, ordinal_position;

select tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public' order by tablename, policyname;
