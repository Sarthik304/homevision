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

-- account deletion: the anon/authenticated client role has no privileges on auth.users (nor
-- should it — that would let anyone delete anyone), so a signed-in user can't remove their own
-- account with a plain delete the way they can a design row. This function runs as `security
-- definer` (elevated privileges) specifically to allow that, but is hard-scoped to auth.uid() —
-- the caller's own id, taken from their JWT, with no parameter to target anyone else — so the
-- elevated privileges can never be used to delete a different account. Deleting the auth.users
-- row cascades to public.designs via its "on delete cascade" foreign key above, so this also
-- wipes everything that user saved.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
