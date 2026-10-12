begin;

-- Internal trigger functions are outside the exposed Data API schema.
create schema campusfind_private;
revoke all on schema campusfind_private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or length(btrim(display_name)) between 1 and 100),
  role text not null default 'USER' check (role in ('USER', 'ADMIN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  type text not null check (type in ('LOST', 'FOUND')),
  title text not null check (length(btrim(title)) between 1 and 200),
  category text not null check (length(btrim(category)) between 1 and 80),
  description text check (description is null or length(description) <= 5000),
  location text not null check (length(btrim(location)) between 1 and 200),
  event_date date not null,
  status text not null default 'OPEN' check (status in ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.item_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete restrict,
  storage_path text not null unique,
  -- Three distinct slots make the maximum safe even at stronger isolation levels.
  image_slot smallint not null check (image_slot between 1 and 3),
  created_at timestamptz not null default now(),
  unique (item_id, image_slot),
  check (storage_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$')
);

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete restrict,
  claimant_id uuid not null references public.profiles(id) on delete restrict,
  proof_text text not null check (length(btrim(proof_text)) between 1 and 5000),
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index items_reporter_idx on public.items (reporter_id, created_at desc);
create index items_discovery_idx on public.items (status, type, category, event_date desc, id);
create index items_location_idx on public.items (location, event_date desc);
create index items_search_idx on public.items using gin (
  to_tsvector('simple', title || ' ' || coalesce(description, '') || ' ' || location)
);
create index claims_claimant_idx on public.claims (claimant_id, created_at desc);
create index claims_item_idx on public.claims (item_id, created_at desc);
create unique index claims_one_approved_per_item on public.claims (item_id) where status = 'APPROVED';
create unique index claims_one_active_per_claimant on public.claims (item_id, claimant_id)
  where status in ('PENDING', 'APPROVED');

create function campusfind_private.touch_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

-- Auth executes this trigger without granting users INSERT on profiles.
-- Never trust raw_user_meta_data for role assignment or copy arbitrary metadata.
create function campusfind_private.create_user_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, role) values (new.id, 'USER');
  return new;
end;
$$;

create trigger campusfind_auth_profile after insert on auth.users
  for each row execute function campusfind_private.create_user_profile();

-- Supports a development database that already has Auth users.
insert into public.profiles (id, role)
select id, 'USER' from auth.users on conflict (id) do nothing;

create function campusfind_private.guard_item_identity()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.reporter_id is distinct from old.reporter_id
     or new.type is distinct from old.type or new.created_at is distinct from old.created_at then
    raise exception 'Item identity, type and creation timestamp are immutable' using errcode = '23514';
  end if;
  if new.status is distinct from old.status and not (
    (old.status = 'OPEN' and new.status in ('IN_PROGRESS', 'RESOLVED', 'CLOSED')) or
    (old.status = 'IN_PROGRESS' and new.status in ('RESOLVED', 'CLOSED')) or
    (old.status = 'RESOLVED' and new.status = 'CLOSED')
  ) then
    raise exception 'Invalid item status transition' using errcode = '23514';
  end if;
  return new;
end;
$$;

create function campusfind_private.assign_image_slot()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  reporter uuid;
  free_slot smallint;
begin
  -- Serialize allocation on the item; unique + CHECK constraints are the final guard.
  select reporter_id into reporter from public.items where id = new.item_id for update;
  if not found then
    raise exception 'Item does not exist or is not writable' using errcode = '23503';
  end if;
  if pg_catalog.split_part(new.storage_path, '/', 1) <> reporter::text
     or pg_catalog.split_part(new.storage_path, '/', 2) <> new.item_id::text then
    raise exception 'Image path must belong to the item and reporter' using errcode = '23514';
  end if;
  select s::smallint into free_slot from pg_catalog.generate_series(1, 3) as s
  where not exists (select 1 from public.item_images i where i.item_id = new.item_id and i.image_slot = s)
  order by s limit 1;
  if free_slot is null then
    raise exception 'An item may have at most three images' using errcode = '23514';
  end if;
  new.image_slot := free_slot;
  return new;
end;
$$;

create function campusfind_private.guard_claim()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  report public.items%rowtype;
begin
  -- This shares the same item lock as trusted status updates and other claims.
  select * into report from public.items where id = new.item_id for update;
  if not found then
    raise exception 'Claim item does not exist' using errcode = '23503';
  end if;
  if report.type <> 'FOUND' or report.reporter_id = new.claimant_id then
    raise exception 'Claims require another user''s FOUND report' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then
    if new.status <> 'PENDING' or report.status not in ('OPEN', 'IN_PROGRESS') then
      raise exception 'New claims require an active item and PENDING status' using errcode = '23514';
    end if;
  else
    if new.id is distinct from old.id or new.item_id is distinct from old.item_id
       or new.claimant_id is distinct from old.claimant_id or new.proof_text is distinct from old.proof_text
       or new.created_at is distinct from old.created_at then
      raise exception 'Claim identity, evidence and creation timestamp are immutable' using errcode = '23514';
    end if;
    if new.status is distinct from old.status and not
       (old.status = 'PENDING' and new.status in ('APPROVED', 'REJECTED', 'CANCELLED')) then
      raise exception 'Invalid claim status transition' using errcode = '23514';
    end if;
    if new.status = 'APPROVED' and old.status <> 'APPROVED'
       and report.status not in ('OPEN', 'IN_PROGRESS') then
      raise exception 'An inactive item cannot approve a claim' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function campusfind_private.touch_updated_at();
create trigger items_guard before update on public.items
  for each row execute function campusfind_private.guard_item_identity();
create trigger items_updated_at before update on public.items
  for each row execute function campusfind_private.touch_updated_at();
create trigger item_images_slot before insert on public.item_images
  for each row execute function campusfind_private.assign_image_slot();
create trigger claims_guard before insert or update on public.claims
  for each row execute function campusfind_private.guard_claim();
create trigger claims_updated_at before update on public.claims
  for each row execute function campusfind_private.touch_updated_at();

-- Supabase may grant broad table privileges by default; replace them explicitly.
revoke all on public.profiles, public.items, public.item_images, public.claims
  from public, anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
grant select on public.items to anon;
grant select on public.profiles, public.items, public.item_images, public.claims to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant insert (reporter_id, type, title, category, description, location, event_date)
  on public.items to authenticated;
grant update (title, category, description, location, event_date) on public.items to authenticated;
grant insert (item_id, storage_path) on public.item_images to authenticated;
grant delete on public.item_images to authenticated;
-- Trusted backend only: no direct client claim writes or item deletion.
grant select, insert, update on public.profiles, public.items, public.claims to service_role;
grant select, insert, delete on public.item_images to service_role;

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.item_images enable row level security;
alter table public.claims enable row level security;

create policy profiles_read_own on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_edit_name on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy items_public_read on public.items for select to anon, authenticated
  using (status in ('OPEN', 'IN_PROGRESS'));
create policy items_reporter_read on public.items for select to authenticated
  using (reporter_id = (select auth.uid()));
create policy items_reporter_create on public.items for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'OPEN');
create policy items_reporter_edit on public.items for update to authenticated
  using (reporter_id = (select auth.uid())) with check (reporter_id = (select auth.uid()));
create policy images_visible_read on public.item_images for select to authenticated
  using (exists (select 1 from public.items i where i.id = item_id));
create policy images_reporter_create on public.item_images for insert to authenticated
  with check (exists (select 1 from public.items i where i.id = item_id and i.reporter_id = (select auth.uid())));
create policy images_reporter_delete on public.item_images for delete to authenticated
  using (exists (select 1 from public.items i where i.id = item_id and i.reporter_id = (select auth.uid())));
create policy claims_participant_read on public.claims for select to authenticated
  using (claimant_id = (select auth.uid()) or exists (
    select 1 from public.items i where i.id = item_id and i.reporter_id = (select auth.uid())
  ));

-- Trigger invocation does not require the calling user to have EXECUTE permission.
revoke all on all functions in schema campusfind_private from public, anon, authenticated, service_role;

commit;
