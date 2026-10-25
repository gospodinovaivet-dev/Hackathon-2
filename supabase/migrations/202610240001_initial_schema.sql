-- Step 1: database contract for the React/Supabase app.
-- Apply once to a new project after inspecting existing public tables.
-- This transaction makes no changes if any table already exists.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.fridges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null default 'My fridge' check (char_length(trim(name)) between 1 and 80),
  last_scan_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.food_items (
  id uuid primary key default gen_random_uuid(),
  fridge_id uuid not null references public.fridges(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  quantity text not null default '',
  kind text not null default 'other' check (kind in ('fresh','packaged','cooked','other')),
  category text not null default 'unknown' check (category in ('fruit','veg','protein','dairy','drink','nuts','snack','cooked','unknown')),
  shelf text check (shelf in ('Top shelf','Middle shelf','Bottom shelf','Crisper drawer','Door rack')),
  expires_on date,
  date_source text not null default 'unknown' check (date_source in ('manual','label','receipt','cooked','look','unknown')),
  date_text text not null default '',
  first_seen_on date not null default current_date,
  cooked_on date,
  container_description text not null default '',
  condition text not null default '',
  confidence text not null default 'low' check (confidence in ('low','medium','high')),
  notes text not null default '',
  barcode text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, fridge_id)
);

-- A scan does not overwrite the confirmed inventory until reviewed.
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  fridge_id uuid not null references public.fridges(id) on delete cascade,
  source text not null check (source in ('example','camera','phone','receipt')),
  status text not null default 'pending' check (status in ('pending','processing','review','confirmed','failed')),
  image_path text,
  error_message text,
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (id, fridge_id)
);

create table public.scan_items (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null,
  fridge_id uuid not null,
  proposed_name text not null,
  proposed_data jsonb not null default '{}'::jsonb check (jsonb_typeof(proposed_data) = 'object'),
  review_status text not null default 'pending' check (review_status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  foreign key (scan_id, fridge_id) references public.scans(id, fridge_id) on delete cascade
);

-- Snapshot the name so eaten/discarded history survives inventory deletion.
create table public.food_events (
  id uuid primary key default gen_random_uuid(),
  fridge_id uuid not null references public.fridges(id) on delete cascade,
  item_name text not null check (char_length(trim(item_name)) between 1 and 120),
  action text not null check (action in ('eaten','discarded')),
  occurred_at timestamptz not null default now()
);

create index fridges_owner_idx on public.fridges(owner_id);
create index food_items_fridge_expiry_idx on public.food_items(fridge_id, expires_on);
create index scans_fridge_created_idx on public.scans(fridge_id, created_at desc);
create index scan_items_scan_idx on public.scan_items(scan_id, fridge_id);
create index scan_items_fridge_idx on public.scan_items(fridge_id);
create index food_events_fridge_date_idx on public.food_events(fridge_id, occurred_at desc);

create function public.set_food_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_food_updated_at() from public, anon, authenticated;
create trigger food_updated_at before update on public.food_items
for each row execute function public.set_food_updated_at();

-- Grants and policies are both necessary. Anonymous visitors get no table access.
revoke all on public.profiles, public.fridges, public.food_items, public.scans,
  public.scan_items, public.food_events from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.fridges,
  public.food_items, public.scans, public.scan_items, public.food_events to authenticated;

alter table public.profiles enable row level security;
alter table public.fridges enable row level security;
alter table public.food_items enable row level security;
alter table public.scans enable row level security;
alter table public.scan_items enable row level security;
alter table public.food_events enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_delete on public.profiles for delete to authenticated using (id = (select auth.uid()));

create policy fridges_select on public.fridges for select to authenticated using (owner_id = (select auth.uid()));
create policy fridges_insert on public.fridges for insert to authenticated with check (owner_id = (select auth.uid()));
create policy fridges_update on public.fridges for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy fridges_delete on public.fridges for delete to authenticated using (owner_id = (select auth.uid()));

create policy food_items_select on public.food_items for select to authenticated
  using (exists (select 1 from public.fridges f where f.id = food_items.fridge_id and f.owner_id = (select auth.uid())));

create policy food_items_insert on public.food_items for insert to authenticated
  with check (exists (select 1 from public.fridges f where f.id = food_items.fridge_id and f.owner_id = (select auth.uid())));

create policy food_items_update on public.food_items for update to authenticated
  using (exists (select 1 from public.fridges f where f.id = food_items.fridge_id and f.owner_id = (select auth.uid()))) with check (exists (select 1 from public.fridges f where f.id = food_items.fridge_id and f.owner_id = (select auth.uid())));

create policy food_items_delete on public.food_items for delete to authenticated
  using (exists (select 1 from public.fridges f where f.id = food_items.fridge_id and f.owner_id = (select auth.uid())));

create policy scans_select on public.scans for select to authenticated
  using (exists (select 1 from public.fridges f where f.id = scans.fridge_id and f.owner_id = (select auth.uid())));

create policy scans_insert on public.scans for insert to authenticated
  with check (exists (select 1 from public.fridges f where f.id = scans.fridge_id and f.owner_id = (select auth.uid())));

create policy scans_update on public.scans for update to authenticated
  using (exists (select 1 from public.fridges f where f.id = scans.fridge_id and f.owner_id = (select auth.uid()))) with check (exists (select 1 from public.fridges f where f.id = scans.fridge_id and f.owner_id = (select auth.uid())));

create policy scans_delete on public.scans for delete to authenticated
  using (exists (select 1 from public.fridges f where f.id = scans.fridge_id and f.owner_id = (select auth.uid())));

create policy scan_items_select on public.scan_items for select to authenticated
  using (exists (select 1 from public.fridges f where f.id = scan_items.fridge_id and f.owner_id = (select auth.uid())));

create policy scan_items_insert on public.scan_items for insert to authenticated
  with check (exists (select 1 from public.fridges f where f.id = scan_items.fridge_id and f.owner_id = (select auth.uid())));

create policy scan_items_update on public.scan_items for update to authenticated
  using (exists (select 1 from public.fridges f where f.id = scan_items.fridge_id and f.owner_id = (select auth.uid()))) with check (exists (select 1 from public.fridges f where f.id = scan_items.fridge_id and f.owner_id = (select auth.uid())));

create policy scan_items_delete on public.scan_items for delete to authenticated
  using (exists (select 1 from public.fridges f where f.id = scan_items.fridge_id and f.owner_id = (select auth.uid())));

create policy food_events_select on public.food_events for select to authenticated
  using (exists (select 1 from public.fridges f where f.id = food_events.fridge_id and f.owner_id = (select auth.uid())));

create policy food_events_insert on public.food_events for insert to authenticated
  with check (exists (select 1 from public.fridges f where f.id = food_events.fridge_id and f.owner_id = (select auth.uid())));

create policy food_events_update on public.food_events for update to authenticated
  using (exists (select 1 from public.fridges f where f.id = food_events.fridge_id and f.owner_id = (select auth.uid()))) with check (exists (select 1 from public.fridges f where f.id = food_events.fridge_id and f.owner_id = (select auth.uid())));

create policy food_events_delete on public.food_events for delete to authenticated
  using (exists (select 1 from public.fridges f where f.id = food_events.fridge_id and f.owner_id = (select auth.uid())));

commit;
