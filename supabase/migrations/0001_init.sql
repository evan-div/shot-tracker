-- Event Production app schema.
--
-- Access model: no login. The app talks to Supabase with the anon key, so the
-- policies below intentionally allow anonymous read/write. Anyone who has the
-- site URL (and therefore the anon key, which ships in the bundle) can edit
-- this data. Keep the deployed URL private, or add Supabase Auth later and
-- tighten these policies to `auth.role() = 'authenticated'`.

create table if not exists public.shot_assignments (
  affiliate_id    text        not null,
  shot_type_id    text        not null,
  photographer_id text        not null,
  completed_at    timestamptz not null default now(),
  primary key (affiliate_id, shot_type_id)
);

create table if not exists public.reel_ideas (
  id          uuid        primary key default gen_random_uuid(),
  author      text        not null default '',
  url         text        not null default '',
  description text        not null default '',
  rating      smallint    not null default 0 check (rating between 0 and 5),
  created_at  timestamptz not null default now()
);

create index if not exists reel_ideas_created_at_idx on public.reel_ideas (created_at);

alter table public.shot_assignments enable row level security;
alter table public.reel_ideas       enable row level security;

drop policy if exists "anon full access" on public.shot_assignments;
create policy "anon full access" on public.shot_assignments
  for all to anon using (true) with check (true);

drop policy if exists "anon full access" on public.reel_ideas;
create policy "anon full access" on public.reel_ideas
  for all to anon using (true) with check (true);

-- Broadcast changes to every connected device.
alter publication supabase_realtime add table public.shot_assignments;
alter publication supabase_realtime add table public.reel_ideas;
