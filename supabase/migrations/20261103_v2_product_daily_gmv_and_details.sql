-- A product's sales per day from TikTok's daily top-100 lists (owner, 2 Nov 2026: the sales graph reads one product's own rows
-- instead of unpacking every saved list each time): the low and high end of TikTok's GMV range per Malaysia day, the highest of
-- each when the product is in several category lists. A day it wasn't in any top 100 has no row. Written as each daily list is
-- saved (modules/refresh/store.ts saveDailyGmv); kept 35 days, the graphs show 28.
create table if not exists public.product_daily_gmv (
  product_id text not null,
  day date not null,
  lo numeric not null,
  hi numeric not null,
  primary key (product_id, day)
);
create index if not exists product_daily_gmv_day_idx on public.product_daily_gmv (day);
alter table public.product_daily_gmv enable row level security;

-- The days already saved, read the same way the graph's function read them.
insert into public.product_daily_gmv (product_id, day, lo, hi)
select x->>'id', s.as_of,
  coalesce(max((regexp_match(x->>'gmv_range', '([0-9.]+)'))[1]::numeric), 0),
  coalesce(max(coalesce((regexp_match(x->>'gmv_range', '~[^0-9]*([0-9.]+)'))[1], (regexp_match(x->>'gmv_range', '([0-9.]+)'))[1])::numeric), 0)
from public.market_snapshots s, jsonb_array_elements(s.items) x
where s.dataset = 'products' and s.slot like '1D|%|LOCAL' and s.as_of >= current_date - 35 and coalesce(x->>'id', '') <> ''
group by 1, 2
on conflict (product_id, day) do update set lo = greatest(product_daily_gmv.lo, excluded.lo), hi = greatest(product_daily_gmv.hi, excluded.hi);

-- One daily list's products as the refresh read them ([{ id, lo, hi }]): the highest low and high per product and day are kept,
-- and days more than 35 before it are dropped.
create or replace function public.add_product_daily_gmv(p_day date, p_rows jsonb)
returns void
language sql
set search_path = public
as $$
  insert into product_daily_gmv (product_id, day, lo, hi)
  select r->>'id', p_day, max((r->>'lo')::numeric), max((r->>'hi')::numeric)
  from jsonb_array_elements(p_rows) r
  where coalesce(r->>'id', '') <> ''
  group by 1
  on conflict (product_id, day) do update set lo = greatest(product_daily_gmv.lo, excluded.lo), hi = greatest(product_daily_gmv.hi, excluded.hi);
  delete from product_daily_gmv where day < p_day - 35;
$$;
revoke all on function public.add_product_daily_gmv(date, jsonb) from public, anon, authenticated;

-- The sales line per idea and the graph on the product page (28 days each): same arguments and answer as before, now read by
-- product.
create or replace function public.product_daily_gmv(p_ids text[], p_from date)
returns table (product_id text, day date, lo numeric, hi numeric)
language sql stable
set search_path = public
as $$
  select g.product_id, g.day, g.lo, g.hi
  from product_daily_gmv g
  where g.product_id = any(p_ids) and g.day >= p_from
$$;
revoke all on function public.product_daily_gmv(text[], date) from public, anon, authenticated;

-- TikTok's facts for one product (owner, 2 Nov 2026: read when a creator opens it, as fast as possible, not nightly): buyer rating
-- and reviews, main and sub category, open plan rate (×100, 600 = 6%) and the listing as TikTok shows it (name, shop, photo,
-- price, sold). `at`: when a product page read it from TikTok; it's read again after a day. A rating can also come from Today's
-- Ideas and AI Picks (`rating_at`), so product cards can show it without asking TikTok.
create table if not exists public.product_details (
  product_id text primary key,
  rating numeric,
  reviews integer,
  main_category text,
  sub_category text,
  open_rate integer,
  listing jsonb,
  at timestamptz,
  rating_at timestamptz
);
alter table public.product_details enable row level security;
