-- Her AI Picks per tab (Overall, Video, LIVE), kept per account: a reload shows them at once; they run again only on
-- "Analyse again" or after 6 hours. `ms` is how long the analysis took, so the page paces its steps to it.
create table if not exists public.ai_picks_cache (
  user_id uuid not null references public.app_users(id) on delete cascade,
  channel text not null,
  data jsonb not null,
  at timestamptz not null default now(),
  ms integer,
  primary key (user_id, channel)
);
alter table public.ai_picks_cache enable row level security;

-- Today's Ideas saved per creator and view: prepared ahead and shown at once until TikTok's next daily list.
create table if not exists public.ideas_cache (
  user_id uuid not null references public.app_users(id) on delete cascade,
  key text not null,
  day text,
  data jsonb not null,
  at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.ideas_cache enable row level security;

-- A product's sales per day from TikTok's daily top-100 lists (7-day line per idea, 28 days on the product page): the low and
-- high end of TikTok's GMV range per Malaysia day; a day it wasn't in any top 100 has no row.
create or replace function public.product_daily_gmv(p_ids text[], p_from date)
returns table (product_id text, day date, lo numeric, hi numeric)
language sql stable
set search_path = public
as $$
  select x->>'id' as product_id, s.as_of as day,
    max((regexp_match(x->>'gmv_range', '([0-9.]+)'))[1]::numeric) as lo,
    max(coalesce((regexp_match(x->>'gmv_range', '~[^0-9]*([0-9.]+)'))[1], (regexp_match(x->>'gmv_range', '([0-9.]+)'))[1])::numeric) as hi
  from market_snapshots s, jsonb_array_elements(s.items) x
  where s.dataset = 'products' and s.slot like '1D|%|LOCAL' and s.as_of >= p_from and x->>'id' = any(p_ids)
  group by 1, 2
$$;
revoke all on function public.product_daily_gmv(text[], date) from public, anon, authenticated;
