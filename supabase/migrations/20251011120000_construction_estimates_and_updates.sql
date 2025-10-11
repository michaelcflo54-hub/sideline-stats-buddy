-- Create storage bucket for gallery
insert into storage.buckets (id, name, public) values ('gallery', 'gallery', true) on conflict (id) do nothing;

-- Estimates table
create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  email text not null,
  address text not null,
  description text not null,
  status text not null default 'new'
);

alter table public.estimates enable row level security;

-- RLS: anyone can insert; only owner role can select/update/delete
create policy "Anyone can create estimate" on public.estimates
  for insert to anon, authenticated
  with check (true);

create policy "Owner can manage estimates" on public.estimates
  for all to authenticated
  using (auth.jwt() ->> 'user_metadata' is not null and (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner')
  with check (auth.jwt() ->> 'user_metadata' is not null and (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner');

-- Customer updates table
create table if not exists public.customer_updates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_id uuid not null,
  title text not null,
  message text,
  image_path text,
  posted_by uuid,
  foreign key (posted_by) references auth.users(id) on delete set null
);

alter table public.customer_updates enable row level security;

-- RLS: customers can read their own updates; owner can manage all
create policy "Customers read own updates" on public.customer_updates
  for select to authenticated
  using (auth.uid() = customer_id);

create policy "Owner manages updates" on public.customer_updates
  for all to authenticated
  using (auth.jwt() ->> 'user_metadata' is not null and (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner')
  with check (auth.jwt() ->> 'user_metadata' is not null and (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner');

-- Helper: allow public read of gallery assets
-- This assumes the 'gallery' bucket should be public.
-- If using RLS for storage, configure policies in Storage UI or with SQL policies accordingly.
