-- HomeVision: saved designs
-- Run this in your Supabase project's SQL editor (Project -> SQL Editor -> New query).
-- Safe to re-run in full even if you ran an earlier version of this file — every
-- statement is idempotent (create-if-not-exists, or drop-then-create for policies/triggers).

create table if not exists public.designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Untitled design',
  rooms jsonb not null,
  -- shareable-link support: a public design can be read by anyone (including
  -- signed-out visitors) via its id, but never written to by anyone but its owner
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.designs add column if not exists is_public boolean not null default false;

create index if not exists designs_user_id_idx on public.designs (user_id);

alter table public.designs enable row level security;

-- each user can always see/change their own designs
drop policy if exists "Users can view their own designs" on public.designs;
create policy "Users can view their own designs"
  on public.designs for select
  using (auth.uid() = user_id);

-- anyone (including signed-out visitors) can read a design its owner marked public —
-- this is what makes a shareable link work without requiring the viewer to sign in
drop policy if exists "Anyone can view public designs" on public.designs;
create policy "Anyone can view public designs"
  on public.designs for select
  using (is_public = true);

drop policy if exists "Users can insert their own designs" on public.designs;
create policy "Users can insert their own designs"
  on public.designs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own designs" on public.designs;
create policy "Users can update their own designs"
  on public.designs for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own designs" on public.designs;
create policy "Users can delete their own designs"
  on public.designs for delete
  using (auth.uid() = user_id);

-- keep updated_at current on every edit, so "My designs" can sort by it
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists designs_set_updated_at on public.designs;
create trigger designs_set_updated_at
  before update on public.designs
  for each row
  execute function public.set_updated_at();
