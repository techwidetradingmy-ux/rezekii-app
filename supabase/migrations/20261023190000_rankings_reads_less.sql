-- The Rankings build reads only what it uses (owner, 23 Oct 2026): it read all 48,000 creator profiles, 1,000 at a time (about
-- 100 s), and 60 days of creators lists (12 s) to keep about 1,700 of them, so it ran past the refresh timer's limit.

-- Every creator in a saved creators list (any period or type) between two days.
create or replace function public.rank_listed_json(p_from date, p_to date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(distinct e->>'user_name'), '[]'::jsonb)
    from public.market_snapshots s, jsonb_array_elements(s.items) e
   where s.dataset = 'creators' and s.as_of between p_from and p_to and jsonb_typeof(e->'user_name') = 'string';
$$;

-- Found by username or nickname without opening every profile (on live they were built with "concurrently" first).
create index if not exists market_creators_username on public.market_creators (username);
create index if not exists market_creators_nickname on public.market_creators ((detail->>'nickname'));

-- The profiles of these creators and of anyone with one of these nicknames (a video is matched to its creator by nickname),
-- as { username: profile }, without failed reads.
create or replace function public.rank_profiles_json(p_users text[], p_nicks text[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(c.username, c.detail), '{}'::jsonb)
    from public.market_creators c
   where (c.username = any(p_users) or c.detail->>'nickname' = any(p_nicks))
     and jsonb_typeof(c.detail) = 'object' and not c.detail ? 'error';
$$;

-- The Creator Marketplace list in parts: in one piece it took 4-15 s depending on the timer's other work, past the 8 s limit.
create or replace function public.rank_find_json(p_part int, p_parts int)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(r.m), '[]'::jsonb) from public.rank_find() r where abs(hashtext(r.m->>'username')) % p_parts = p_part;
$$;

revoke all on function public.rank_listed_json(date, date), public.rank_profiles_json(text[], text[]), public.rank_find_json(int, int) from public, anon, authenticated;
grant execute on function public.rank_listed_json(date, date), public.rank_profiles_json(text[], text[]), public.rank_find_json(int, int) to service_role;
