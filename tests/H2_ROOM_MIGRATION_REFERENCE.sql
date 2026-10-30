-- Kitchen H2 Cleaning Rooms — one-time migration.
-- REQUIRED ORDER: H2_1_PRECHECK.sql -> this migration -> H2_3_POSTCHECK.sql -> GitHub Deploy.
-- NOT executed by assistant: user must run after reviewing PRECHECK output.
-- No cleaning_tasks, recurrence or completion RPC in H2.
begin;

do $$
begin
  if to_regclass('private.kitchen_owner') is null
     or to_regprocedure('public.is_kitchen_owner()') is null then
    raise exception 'H2 requires the existing owner registry and owner authority.';
  end if;
  if to_regclass('public.cleaning_rooms') is not null then
    raise exception 'H2 table cleaning_rooms already exists. Audit before changing it.';
  end if;
end
$$;

create table public.cleaning_rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null,
  sort_order integer not null default 100,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cleaning_rooms_owner_fk foreign key (owner_id) references auth.users(id) on delete restrict,
  constraint cleaning_rooms_id_owner_unique unique (id, owner_id),
  constraint cleaning_rooms_name_valid check (
    char_length(name) between 1 and 80
    and name = btrim(name)
    and name !~ '[[:cntrl:]]'
    and name !~ '[[:space:]]{2,}'
  ),
  constraint cleaning_rooms_sort_valid check (sort_order between 0 and 1000000)
);

-- Active rooms have unique case-insensitive names. Archived entries keep history
-- and can be restored only when their previous name is still available.
create unique index cleaning_rooms_active_owner_name_uq
  on public.cleaning_rooms (owner_id, lower(name))
  where is_archived = false;

create index cleaning_rooms_owner_sort_idx
  on public.cleaning_rooms (owner_id, is_archived, sort_order, name);

create or replace function public.h2_touch_cleaning_room()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.owner_id is distinct from old.owner_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Cleaning room identity and creation time are immutable.';
  end if;
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.h2_touch_cleaning_room() from public;
revoke all on function public.h2_touch_cleaning_room() from anon;
grant execute on function public.h2_touch_cleaning_room() to authenticated;

create trigger cleaning_rooms_touch_updated_at
before update on public.cleaning_rooms
for each row execute function public.h2_touch_cleaning_room();

alter table public.cleaning_rooms enable row level security;

revoke all on table public.cleaning_rooms from public;
revoke all on table public.cleaning_rooms from anon;
revoke all on table public.cleaning_rooms from authenticated;
grant select, insert, update on table public.cleaning_rooms to authenticated;
-- Intentionally NO DELETE grant. Archive instead; retain room identity for future H3 tasks.

create policy cleaning_rooms_select_owner on public.cleaning_rooms
  for select to authenticated
  using (owner_id = auth.uid() and public.is_kitchen_owner());

create policy cleaning_rooms_insert_owner on public.cleaning_rooms
  for insert to authenticated
  with check (owner_id = auth.uid() and public.is_kitchen_owner());

create policy cleaning_rooms_update_owner on public.cleaning_rooms
  for update to authenticated
  using (owner_id = auth.uid() and public.is_kitchen_owner())
  with check (owner_id = auth.uid() and public.is_kitchen_owner());

comment on table public.cleaning_rooms is 'H2 Cleaning domain rooms; separate from Inventory storage_locations. Owner-only RLS and archive instead of DELETE.';
commit;
