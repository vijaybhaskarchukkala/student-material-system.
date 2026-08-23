-- 1. Allow staff (Faculty + Admin) to update profiles (for Banning)
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (auth.uid() = id or public.is_staff())
             with check (auth.uid() = id or public.is_staff());

-- 2. Allow staff (Faculty + Admin) to delete listings
drop policy if exists "listings_delete_own_or_admin" on public.listings;
create policy "listings_delete_own_or_admin" on public.listings
  for delete using (auth.uid() = owner_id or public.is_staff());
