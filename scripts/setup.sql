-- ============================================================================
-- Student Material System — Consolidated production schema
-- Run ONCE in Supabase: Dashboard -> SQL Editor -> paste -> Run.
-- Idempotent & safe to re-run. Phone numbers save/update freely — NO verification.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLES  (created first; helper functions that read them come after)
-- ----------------------------------------------------------------------------

-- profiles --------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null,
  email       text,
  phone       text,                                   -- saved/updated freely, no verification
  role        text not null default 'student',        -- 'student' | 'faculty'
  sold_count  integer not null default 0,
  is_banned   boolean not null default false,
  created_at  timestamptz not null default now()
);
-- Legacy/compat: ensure columns exist if the table pre-dates this script.
alter table public.profiles add column if not exists phone      text;
alter table public.profiles add column if not exists role       text not null default 'student';
alter table public.profiles add column if not exists sold_count integer not null default 0;
alter table public.profiles add column if not exists is_banned  boolean not null default false;
-- Remove any leftover verification column from older deployments.
alter table public.profiles drop column if exists phone_verified;

create unique index if not exists profiles_username_unique_ci
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

-- listings --------------------------------------------------------------------
create table if not exists public.listings (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade,
  owner_username text not null default '',
  title          text not null,
  category       text not null,
  price          integer not null default 0,
  image          text,
  owner          text not null default '',            -- free-form contact details
  status         text not null default 'available',   -- available | pending | sold
  requested_by   uuid references auth.users(id) on delete set null,
  pickup_place   text,
  phone          text,
  created_at     timestamptz not null default now()
);
alter table public.listings add column if not exists pickup_place text;
alter table public.listings add column if not exists phone        text;
alter table public.listings add column if not exists pickup_time text;
alter table public.listings enable row level security;

-- requests --------------------------------------------------------------------
create table if not exists public.requests (
  id                 uuid primary key default gen_random_uuid(),
  listing_id         uuid not null references public.listings(id) on delete cascade,
  requester_id       uuid not null references auth.users(id) on delete cascade,
  requester_username text not null default '',
  requester_phone    text,                            -- buyer's phone, snapshotted for the seller
  created_at         timestamptz not null default now()
);
alter table public.requests add column if not exists requester_phone text;

alter table public.requests enable row level security;

-- reviews ---------------------------------------------------------------------
create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  username   text not null default '',
  message    text not null,
  created_at timestamptz not null default now()
);
alter table public.reviews enable row level security;

-- complaints  (all reviews/complaints on other users; admin-only readable) -----
create table if not exists public.complaints (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  username   text not null default '',
  category   text not null default '',
  message    text not null,
  created_at timestamptz not null default now()
);
alter table public.complaints enable row level security;

-- faculty_complaints  (routed subset: "Complaint to Faculty") ------------------
create table if not exists public.faculty_complaints (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  username   text not null default '',
  message    text not null,
  created_at timestamptz not null default now()
);
alter table public.faculty_complaints enable row level security;

-- announcements  (primary announcements/broadcasts table used by the app) ------
create table if not exists public.announcements (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  username        text not null default '',
  title           text not null default '',
  message         text not null,
  image_url       text,
  link_url        text,
  link_text       text default 'View',
  target_audience text not null default 'all',        -- all | faculty_admin
  sender_role     text,
  created_at      timestamptz not null default now()
);
alter table public.announcements add column if not exists sender_role     text;
alter table public.announcements add column if not exists target_audience text not null default 'all';

alter table public.announcements enable row level security;

-- admin_announcements  (legacy fallback referenced by lib/api.ts) --------------
create table if not exists public.admin_announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default '',
  message    text not null,
  image_url  text,
  link_url   text,
  link_text  text default 'View',
  created_at timestamptz not null default now()
);
alter table public.admin_announcements enable row level security;

-- ----------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS  (defined AFTER the tables they read)
-- ----------------------------------------------------------------------------

-- Super-admin check (by email). Change the email here if the admin changes.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select p.email from public.profiles p where p.id = auth.uid()) = 'vijaybhaskar.ch9045@gmail.com',
    (auth.jwt() ->> 'email') = 'vijaybhaskar.ch9045@gmail.com'
  );
$$;

-- Staff = admin OR a user whose profile role is 'faculty'.
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin()
      or coalesce((select p.role = 'faculty' from public.profiles p where p.id = auth.uid()), false);
$$;

-- Atomic sold-counter increment.
create or replace function public.increment_sold(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set sold_count = sold_count + 1 where id = p_user_id;
end;
$$;

-- Fully delete the CURRENT user (only ever targets auth.uid()).
create or replace function public.delete_own_account()
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  delete from public.reviews            where user_id = uid;
  delete from public.complaints         where user_id = uid;
  delete from public.faculty_complaints where user_id = uid;
  delete from public.requests           where requester_id = uid;
  delete from public.announcements      where user_id = uid;
  delete from public.listings           where owner_id = uid;
  delete from public.profiles           where id = uid;
  delete from auth.users                where id = uid;
end;
$$;

grant execute on function public.increment_sold(uuid) to authenticated;
grant execute on function public.delete_own_account() to authenticated;
grant execute on function public.is_admin() to authenticated, anon;
grant execute on function public.is_staff() to authenticated, anon;

-- ----------------------------------------------------------------------------
-- 3. TRIGGER  — auto-create a profile row when a new auth user signs up.
--    The app later upserts the real chosen username over this placeholder.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, username)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), 'user_' || substr(new.id::text, 1, 8))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 4. RLS POLICIES
-- ----------------------------------------------------------------------------

-- profiles --------------------------------------------------------------------
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (auth.uid() is not null);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- A user can update their OWN profile (username, phone — no verification), admin can update anyone.
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (auth.uid() = id or public.is_admin())
             with check (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_delete_own_or_admin" on public.profiles;
create policy "profiles_delete_own_or_admin" on public.profiles
  for delete using (auth.uid() = id or public.is_admin());

-- listings --------------------------------------------------------------------
drop policy if exists "listings_select" on public.listings;
create policy "listings_select" on public.listings
  for select using (auth.uid() is not null);

-- Any signed-in, non-banned user may post a listing. NO phone verification.
drop policy if exists "listings_insert_own" on public.listings;
create policy "listings_insert_own" on public.listings
  for insert with check (
    auth.uid() = owner_id
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_banned)
  );

drop policy if exists "listings_update" on public.listings;
create policy "listings_update" on public.listings
  for update using (auth.uid() is not null or public.is_admin());

drop policy if exists "listings_delete_own_or_admin" on public.listings;
create policy "listings_delete_own_or_admin" on public.listings
  for delete using (auth.uid() = owner_id or public.is_admin());

-- requests --------------------------------------------------------------------
drop policy if exists "requests_select" on public.requests;
create policy "requests_select" on public.requests
  for select using (
    auth.uid() = requester_id
    or public.is_admin()
    or exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid())
  );

-- Any signed-in user may request an item. NO phone verification.
drop policy if exists "requests_insert_own" on public.requests;
create policy "requests_insert_own" on public.requests
  for insert with check (auth.uid() = requester_id);

-- reviews ---------------------------------------------------------------------
drop policy if exists "reviews_select_admin" on public.reviews;
create policy "reviews_select_admin" on public.reviews
  for select using (public.is_admin());

drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own" on public.reviews
  for insert with check (
    auth.uid() = user_id
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_banned)
  );

drop policy if exists "reviews_delete_admin" on public.reviews;
create policy "reviews_delete_admin" on public.reviews
  for delete using (public.is_admin());

-- complaints ------------------------------------------------------------------
drop policy if exists "complaints_select_admin" on public.complaints;
create policy "complaints_select_admin" on public.complaints
  for select using (public.is_admin());

drop policy if exists "complaints_insert_own" on public.complaints;
create policy "complaints_insert_own" on public.complaints
  for insert with check (
    auth.uid() = user_id
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_banned)
  );

drop policy if exists "complaints_delete_admin" on public.complaints;
create policy "complaints_delete_admin" on public.complaints
  for delete using (public.is_admin());

-- faculty_complaints ----------------------------------------------------------
drop policy if exists "faculty_complaints_select_staff" on public.faculty_complaints;
create policy "faculty_complaints_select_staff" on public.faculty_complaints
  for select using (public.is_staff());

drop policy if exists "faculty_complaints_insert_own" on public.faculty_complaints;
create policy "faculty_complaints_insert_own" on public.faculty_complaints
  for insert with check (auth.uid() = user_id);

drop policy if exists "faculty_complaints_delete_admin" on public.faculty_complaints;
create policy "faculty_complaints_delete_admin" on public.faculty_complaints
  for delete using (public.is_admin());

-- announcements ---------------------------------------------------------------
drop policy if exists "announcements_select" on public.announcements;
create policy "announcements_select" on public.announcements
  for select using (auth.uid() is not null);

-- Only staff (admin/faculty) may post announcements. NO phone verification.
drop policy if exists "announcements_insert_staff" on public.announcements;
create policy "announcements_insert_staff" on public.announcements
  for insert with check (auth.uid() = user_id and public.is_staff());

drop policy if exists "announcements_update_own_or_admin" on public.announcements;
create policy "announcements_update_own_or_admin" on public.announcements
  for update using (auth.uid() = user_id or public.is_admin());

drop policy if exists "announcements_delete_own_or_admin" on public.announcements;
create policy "announcements_delete_own_or_admin" on public.announcements
  for delete using (auth.uid() = user_id or public.is_admin());

-- admin_announcements (legacy fallback) ---------------------------------------
drop policy if exists "admin_announcements_select" on public.admin_announcements;
create policy "admin_announcements_select" on public.admin_announcements
  for select using (auth.uid() is not null);

drop policy if exists "admin_announcements_insert_admin" on public.admin_announcements;
create policy "admin_announcements_insert_admin" on public.admin_announcements
  for insert with check (public.is_admin());

drop policy if exists "admin_announcements_delete_admin" on public.admin_announcements;
create policy "admin_announcements_delete_admin" on public.admin_announcements
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. STORAGE  — public "listings" bucket used for listing & announcement images
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('listings', 'listings', true)
on conflict (id) do update set public = true;

drop policy if exists "listings_bucket_read" on storage.objects;
create policy "listings_bucket_read" on storage.objects
  for select using (bucket_id = 'listings');

drop policy if exists "listings_bucket_insert" on storage.objects;
create policy "listings_bucket_insert" on storage.objects
  for insert with check (bucket_id = 'listings' and auth.uid() is not null);

drop policy if exists "listings_bucket_update" on storage.objects;
create policy "listings_bucket_update" on storage.objects
  for update using (bucket_id = 'listings' and auth.uid() is not null);

drop policy if exists "listings_bucket_delete" on storage.objects;
create policy "listings_bucket_delete" on storage.objects
  for delete using (bucket_id = 'listings' and auth.uid() is not null);

-- ----------------------------------------------------------------------------
-- 6. REALTIME  — the app subscribes to listings & requests changes
-- ----------------------------------------------------------------------------
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.listings'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.requests'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.announcements'; exception when others then null; end;
end $$;
